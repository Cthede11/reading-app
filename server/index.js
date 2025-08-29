const puppeteer = require('puppeteer');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Shared HTTP client with realistic browser-like headers
const http = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
});

// Config flags
const ENABLE_JINA_PROXY = (process.env.ENABLE_JINA_PROXY || 'true').toLowerCase() === 'true';
const MAX_RETRIES = Math.max(0, parseInt(process.env.MAX_RETRIES || '2', 10));
const REQUEST_DELAY_MS_MIN = Math.max(0, parseInt(process.env.REQUEST_DELAY_MS_MIN || '50', 10));
const REQUEST_DELAY_MS_MAX = Math.max(REQUEST_DELAY_MS_MIN, parseInt(process.env.REQUEST_DELAY_MS_MAX || '200', 10));

// Simple in-memory caches (TTL in ms)
const searchCache = new Map(); // key: `source|query` -> { expiresAt, data }
const detailsCache = new Map(); // key: `source|url` -> { expiresAt, data }
const chapterCache = new Map(); // key: `source|url` -> { expiresAt, data }
const SEARCH_TTL_MS = Math.max(60_000, parseInt(process.env.SEARCH_TTL_MS || '600000', 10)); // 10 min
const DETAILS_TTL_MS = Math.max(60_000, parseInt(process.env.DETAILS_TTL_MS || '1800000', 10)); // 30 min
const CHAPTER_TTL_MS = Math.max(60_000, parseInt(process.env.CHAPTER_TTL_MS || '7200000', 10)); // 120 min

function getRandomUserAgent() {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0'
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getJitterDelay() {
  if (REQUEST_DELAY_MS_MAX <= REQUEST_DELAY_MS_MIN) return REQUEST_DELAY_MS_MIN;
  const delta = REQUEST_DELAY_MS_MAX - REQUEST_DELAY_MS_MIN;
  return REQUEST_DELAY_MS_MIN + Math.floor(Math.random() * (delta + 1));
}

function toAbsoluteUrl(link, base) {
  if (!link) return link;
  try {
    const u = new URL(link);
    return u.href;
  } catch (_) {
    try {
      return new URL(link, base).href;
    } catch (_) {
      return link;
    }
  }
}

async function performGet(url, opts = {}) {
  const retryStatuses = new Set([429, 500, 502, 503, 504]);
  let attempt = 0;
  let lastErr;
  while (attempt <= MAX_RETRIES) {
    try {
      const ua = getRandomUserAgent();
      const headers = Object.assign({}, opts.headers || {}, { 'User-Agent': ua });
      const res = await http.get(url, { headers });
      return res;
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      const retriable = retryStatuses.has(status) || !status;
      if (!retriable || attempt === MAX_RETRIES) {
        throw err;
      }
      const backoff = Math.min(2000 * Math.pow(2, attempt), 8000);
      await sleep(backoff + getJitterDelay());
      attempt += 1;
    }
  }
  throw lastErr;
}

function toJinaUrl(originalUrl) {
  try {
    const u = new URL(originalUrl);
    return `https://r.jina.ai/http://${u.host}${u.pathname}${u.search}`;
  } catch (_) {
    return originalUrl;
  }
}

async function fetchWithFallback(url, headers) {
  try {
    const res = await performGet(url, { headers });
    return { data: res.data, viaJina: false };
  } catch (err) {
    const status = err?.response?.status;
    if (ENABLE_JINA_PROXY && (status === 403 || status === 503)) {
      const jinaUrl = toJinaUrl(url);
      const res = await performGet(jinaUrl, { headers: {} });
      return { data: res.data, viaJina: true };
    }
    throw err;
  }
}

function extractMarkdownLinks(markdown, hostFilter, pathIncludes = []) {
  if (typeof markdown !== 'string') return [];
  const results = [];
  const seen = new Set();
  const linkRegex = /\[([^\]]{2,200})\]\((https?:\/\/[^)]+)\)/g;
  let m;
  while ((m = linkRegex.exec(markdown)) !== null) {
    const text = (m[1] || '').trim();
    const href = m[2];
    try {
      const u = new URL(href);
      if (hostFilter && !u.hostname.includes(hostFilter)) continue;
      if (pathIncludes.length && !pathIncludes.some(seg => u.pathname.includes(seg))) continue;
      const key = u.href.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      // skip obvious nav/noise
      if (/^(genre|novel list|show menu)$/i.test(text)) continue;
      results.push({ text, href: u.href });
    } catch (_) {
      // ignore invalid URLs
    }
  }
  return results;
}

function extractNovelPagesFromMarkdown(markdown, host) {
  const links = extractMarkdownLinks(markdown, host, []);
  const badPaths = ['hot-novel', 'completed-novel', 'most-popular', 'latest-release-novel', 'genre', 'novel-list', 'most-popular-novel'];
  const novelLinks = links.filter(({ href }) => {
    try {
      const u = new URL(href);
      const path = u.pathname.toLowerCase();
      if (badPaths.some(bp => path.includes(bp))) return false;
      return /\.html$/.test(path);
    } catch (_) { return false; }
  });
  return novelLinks;
}

// Web scraping functions
async function scrapeWebnovel(query) {
  console.log(`[scrapeWebnovel] Searching for: ${query}`);
  try {
  // ...existing code...
    const $ = cheerio.load(data);
    const books = [];
    $('.search-result .book-item').each((_, el) => {
      const title = $(el).find('.book-title').text().trim();
      const link = 'https://www.webnovel.com' + $(el).find('a').attr('href');
      const author = $(el).find('.author').text().trim();
      const cover = $(el).find('img').attr('src');
      if (title && link) books.push({ title, link, author, cover, source: 'webnovel' });
    });
    if (books.length === 0) {
      console.error('[scrapeWebnovel] Selector failure: .search-result .book-item, HTML:', data?.slice(0, 1000));
    }
    return books;
  } catch (err) {
    console.error(`[scrapeWebnovel] HTTP error:`, err?.message || err);
    return [];
  }

}

async function getBookDetails(url, source) {
async function scrapeRoyalRoad(query) {
  console.log(`[scrapeRoyalRoad] Searching for: ${query}`);
  const searchUrl = `https://www.royalroad.com/fictions/search?title=${encodeURIComponent(query)}`;
  try {
    const { data } = await fetchWithFallback(searchUrl);
    const $ = cheerio.load(data);
    const books = [];
    $('.fiction-list .fiction-title').each((_, el) => {
      const a = $(el).find('a');
      const title = a.text().trim();
      const link = 'https://www.royalroad.com' + a.attr('href');
      if (title && link) books.push({ title, link, author: '', cover: '', source: 'royalroad' });
    });
    if (books.length === 0) {
      console.error('[scrapeRoyalRoad] Selector failure: .fiction-list .fiction-title, HTML:', data?.slice(0, 1000));
    }
    return books;
  } catch (err) {
    console.error(`[scrapeRoyalRoad] HTTP error:`, err?.message || err);
    return [];
  }
}

async function scrapeNovelUpdates(query) {
  console.log(`[scrapeNovelUpdates] Searching for: ${query}`);
  const searchUrl = `https://www.novelupdates.com/series-finder/?sf=1&search=${encodeURIComponent(query)}`;
  try {
    const { data } = await fetchWithFallback(searchUrl);
    const $ = cheerio.load(data);
    const books = [];
    $('.search_main_box .search_title').each((_, el) => {
      const a = $(el).find('a');
      const title = a.text().trim();
      const link = a.attr('href');
      if (title && link) books.push({ title, link, author: '', cover: '', source: 'novelupdates' });
    });
    if (books.length === 0) {
      console.error('[scrapeNovelUpdates] Selector failure: .search_main_box .search_title, HTML:', data?.slice(0, 1000));
    }
    return books;
  } catch (err) {
    console.error(`[scrapeNovelUpdates] HTTP error:`, err?.message || err);
    return [];
  }
}

async function scrapeWuxiaWorld(query) {
  console.log(`[scrapeWuxiaWorld] Searching for: ${query}`);
  const searchUrl = `https://www.wuxiaworld.com/search?searchType=novel&searchScope=novel&search=${encodeURIComponent(query)}`;
  try {
    const { data } = await fetchWithFallback(searchUrl);
    const $ = cheerio.load(data);
    const books = [];
    $('.novel-list .novel-item').each((_, el) => {
      const a = $(el).find('a');
      const title = a.text().trim();
      const link = 'https://www.wuxiaworld.com' + a.attr('href');
      if (title && link) books.push({ title, link, author: '', cover: '', source: 'wuxiaworld' });
    });
    if (books.length === 0) {
      console.error('[scrapeWuxiaWorld] Selector failure: .novel-list .novel-item, HTML:', data?.slice(0, 1000));
    }
    return books;
  } catch (err) {
    console.error(`[scrapeWuxiaWorld] HTTP error:`, err?.message || err);
    return [];
  }
}

async function scrapeScribbleHub(query) {
  console.log(`[scrapeScribbleHub] Searching for: ${query}`);
  const searchUrl = `https://www.scribblehub.com/?s=${encodeURIComponent(query)}&post_type=series`;
  try {
    const { data } = await fetchWithFallback(searchUrl);
    const $ = cheerio.load(data);
    const books = [];
    $('.search_main_box .search_title').each((_, el) => {
      const a = $(el).find('a');
      const title = a.text().trim();
      const link = a.attr('href');
      if (title && link) books.push({ title, link, author: '', cover: '', source: 'scribblehub' });
    });
    if (books.length === 0) {
      console.error('[scrapeScribbleHub] Selector failure: .search_main_box .search_title, HTML:', data?.slice(0, 1000));
    }
    return books;
  } catch (err) {
    console.error(`[scrapeScribbleHub] HTTP error:`, err?.message || err);
    return [];
  }


async function getBookDetails(url, source) {
    // If static scraping fails, try Puppeteer for dynamic scraping
    async function puppeteerChapters(url, selectors) {
      let browser, chapters = [];
      try {
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setUserAgent(getRandomUserAgent());
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
        for (const sel of selectors) {
          const links = await page.$$eval(sel, els => els.map(e => ({ title: e.textContent.trim(), link: e.href })));
          chapters.push(...links.filter(l => l.title && l.link));
        }
      } catch (err) {
        console.warn('Puppeteer chapter scrape failed:', err.message);
      } finally {
        if (browser) await browser.close();
      }
      return chapters;
    }
  try {
    const cacheKey = `${source}|${url}`;
    const cached = detailsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    await sleep(getJitterDelay());
    const { data, viaJina } = await fetchWithFallback(url);
    
    const $ = cheerio.load(data);
    let chapters = [];
    
    if (source === 'novelbin') {
      $('.chapter-item a, .list-chapter a').each((i, element) => {
        const title = $(element).text().trim();
        const link = toAbsoluteUrl($(element).attr('href'), 'https://novelbin.com');
        if (title && link) {
          chapters.push({ title, link });
        }
      });
      if (chapters.length === 0) {
        chapters = await puppeteerChapters(url, ['.chapter-item a', '.list-chapter a']);
      }
    } else if (source === 'lightnovelpub') {
      $('.chapter-list a, .table-of-contents a, .chapter-item a').each((i, element) => {
        const title = $(element).text().trim();
        const link = toAbsoluteUrl($(element).attr('href'), LIGHTNOVELPUB_BASE_URL);
        if (title && link) {
          chapters.push({ title, link });
        }
      });
      if (chapters.length === 0) {
        chapters = await puppeteerChapters(url, ['.chapter-list a', '.table-of-contents a', '.chapter-item a']);
      }
    } else if (source === 'novelfull') {
      $('ul.list-chapter a, #list-chapter a, .list-chapter a, .chapter-list a').each((i, element) => {
        const title = $(element).text().trim();
        const link = toAbsoluteUrl($(element).attr('href'), 'https://novelfull.com');
        if (title && link && /chapter/i.test(title)) {
          chapters.push({ title, link });
        }
      });
      if (chapters.length === 0) {
        chapters = await puppeteerChapters(url, ['ul.list-chapter a', '#list-chapter a', '.list-chapter a', '.chapter-list a']);
      }
      if ((chapters.length === 0 && ENABLE_JINA_PROXY) || viaJina) {
        const mdLinks = extractNovelPagesFromMarkdown(data, 'novelfull.com').filter(l => l.href.includes('/chapter-'));
        mdLinks.forEach(({ text, href }) => {
          chapters.push({ title: text, link: href });
        });
      }
    } else if (source === 'readnovelfull') {
      $('ul.list-chapter a, #list-chapter a, .list-chapter a, .chapter-list a').each((i, element) => {
        const title = $(element).text().trim();
        const link = toAbsoluteUrl($(element).attr('href'), 'https://readnovelfull.com');
        if (title && link && /chapter/i.test(title)) {
          chapters.push({ title, link });
        }
      });
      if (chapters.length === 0) {
        chapters = await puppeteerChapters(url, ['ul.list-chapter a', '#list-chapter a', '.list-chapter a', '.chapter-list a']);
      }
      if ((chapters.length === 0 && ENABLE_JINA_PROXY) || viaJina) {
        const mdLinks = extractNovelPagesFromMarkdown(data, 'readnovelfull.com').filter(l => l.href.includes('/chapter-'));
        mdLinks.forEach(({ text, href }) => {
          chapters.push({ title: text, link: href });
        });
      }
    } else if (source === 'royalroad') {
      // RoyalRoad: chapters are listed under .fiction-index .chapter-row a
      $('.fiction-index .chapter-row a').each((i, el) => {
        const title = $(el).text().trim();
        const link = toAbsoluteUrl($(el).attr('href'), url);
        if (title && link) chapters.push({ title, link });
      });
      if (chapters.length === 0) {
        chapters = await puppeteerChapters(url, ['.fiction-index .chapter-row a']);
      }
    }
    
    const result = { chapters };
    detailsCache.set(cacheKey, { expiresAt: Date.now() + DETAILS_TTL_MS, data: result });
    return result;
  } catch (error) {
    const status = error?.response?.status;
    console.warn('Error getting book details', status ? `(status ${status})` : `(${error.message})`);
    return { chapters: [] };
  }
}

async function getChapterContent(url, source) {
  try {
    const cacheKey = `${source}|${url}`;
    const cached = chapterCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    await sleep(getJitterDelay());
    const { data } = await fetchWithFallback(url);
    
    const $ = cheerio.load(data);
    let content = '';
    
    if (source === 'novelbin') {
      const container = $('#chr-content');
      if (container.length) {
        content = container.find('p').map((_, p) => $(p).text().trim()).get().filter(Boolean).join('\n\n');
        if (!content) content = container.text().trim();
      }
    } else if (source === 'lightnovelpub') {
      const container = $('.chapter-content, #chapter-container, .chapter__content').first();
      if (container.length) {
        content = container.find('p').map((_, p) => $(p).text().trim()).get().filter(Boolean).join('\n\n');
        if (!content) content = container.text().trim();
      }
    } else if (source === 'novelfull' || source === 'readnovelfull') {
      const container = $('#chapter-content, .chapter-content, .chapter-c');
      if (container.length) {
        content = container.find('p').map((_, p) => $(p).text().trim()).get().filter(Boolean).join('\n\n');
        if (!content) content = container.text().trim();
      }
    } else if (source === 'novelhall') {
      const container = $('.chapter-content, #chaptercontent');
      if (container.length) {
        content = container.find('p, div').map((_, p) => $(p).text().trim()).get().filter(Boolean).join('\n\n');
        if (!content) content = container.text().trim();
      }
    } else if (source === 'boxnovel') {
      const container = $('.reading-content, .text-left');
      if (container.length) {
        content = container.find('p').map((_, p) => $(p).text().trim()).get().filter(Boolean).join('\n\n');
        if (!content) content = container.text().trim();
      }
    }
    
    // Reader Mode fallback if selectors failed or content is too short
    if (!content || content.length < 500) {
      try {
        const dom = new JSDOM(data, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        if (article && article.textContent) {
          content = article.textContent.trim();
        }
      } catch (e) {
        // ignore reader errors; we'll return whatever we have
      }
    }
    
    const result = { content: content || 'No content found.' };
    chapterCache.set(cacheKey, { expiresAt: Date.now() + CHAPTER_TTL_MS, data: result });
    return result;
  } catch (error) {
    const status = error?.response?.status;
    console.warn('Error getting chapter content', status ? `(status ${status})` : `(${error.message})`);
    return { content: 'Error loading chapter content.' };
  }
}

// API Routes
app.get('/api/search', async (req, res) => {
  console.log(`[SEARCH] Query: ${req.query.query}`);
  try {
    const { query, nocache } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    const bypassCache = String(nocache || '').toLowerCase() === '1';
    // Always query all enabled sources in parallel
    const sources = [
      { name: 'webnovel', enabled: true, fn: scrapeWebnovel },
      { name: 'royalroad', enabled: true, fn: scrapeRoyalRoad },
      { name: 'novelupdates', enabled: true, fn: scrapeNovelUpdates },
      { name: 'wuxiaworld', enabled: true, fn: scrapeWuxiaWorld },
      { name: 'scribblehub', enabled: true, fn: scrapeScribbleHub }
    ];
    const resultsBySource = [];
    const errorsBySource = {};
    await Promise.all(sources.filter(s => s.enabled).map(async (src) => {
      try {
        console.log(`[SCRAPE] Trying source: ${src.name}`);
        const res = await src.fn(query);
        console.log(`[SCRAPE] Source: ${src.name}, Results: ${res.length}`);
        resultsBySource.push(res.map(r => ({ ...r, source: src.name })));
      } catch (err) {
        errorsBySource[src.name] = err?.message || 'Unknown error';
        console.warn(`[ERROR] Search failed for ${src.name}:`, err?.message || err);
      }
    }));
    // Deduplicate and sort
    const allResults = resultsBySource.flat().filter(Boolean);
    const seen = new Set();
    const deduped = allResults.filter(item => {
      const key = `${item.source}|${(item.link || '').toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // Sort by source priority and title
    const sourceOrder = ['webnovel','royalroad','novelupdates','wuxiaworld','scribblehub'];
    deduped.sort((a, b) => {
      const sa = sourceOrder.indexOf(a.source);
      const sb = sourceOrder.indexOf(b.source);
      if (sa !== sb) return sa - sb;
      return a.title.localeCompare(b.title);
    });
    let message = '';
    if (Object.keys(errorsBySource).length > 0) {
      message += 'Some sources failed: ' + Object.entries(errorsBySource).map(([src, err]) => `${src}: ${err}`).join('; ') + '. ';
    }
    if (deduped.length === 0) {
      message += `No books found for "${query}". Try a different search term.`;
      return res.json({ results: [], message });
    }
    message += `Found ${deduped.length} books for "${query}".`;
    res.json({ results: deduped, message });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Cache management
app.post('/api/cache/clear', (req, res) => {
  try {
    searchCache.clear();
    detailsCache.clear();
    chapterCache.clear();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

app.get('/api/book/:source', async (req, res) => {
  try {
    const { source } = req.params;
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    const bookDetails = await getBookDetails(url, source);
    res.json(bookDetails);
  } catch (error) {
    console.error('Book details error:', error);
    res.status(500).json({ error: 'Failed to get book details' });
  }
});

app.get('/api/chapter/:source', async (req, res) => {
  try {
    const { source } = req.params;
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    const chapterContent = await getChapterContent(url, source);
    res.json(chapterContent);
  } catch (error) {
    console.error('Chapter content error:', error);
    res.status(500).json({ error: 'Failed to get chapter content' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



