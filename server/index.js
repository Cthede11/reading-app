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

// Config flags
const ENABLE_JINA_PROXY = (process.env.ENABLE_JINA_PROXY || 'true').toLowerCase() === 'true';
const MAX_RETRIES = Math.max(0, parseInt(process.env.MAX_RETRIES || '2', 10));
const REQUEST_DELAY_MS_MIN = Math.max(0, parseInt(process.env.REQUEST_DELAY_MS_MIN || '50', 10));
const REQUEST_DELAY_MS_MAX = Math.max(REQUEST_DELAY_MS_MIN, parseInt(process.env.REQUEST_DELAY_MS_MAX || '200', 10));

// Simple in-memory caches (TTL in ms)
const searchCache = new Map();
const detailsCache = new Map();
const chapterCache = new Map();

const SEARCH_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DETAILS_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CHAPTER_TTL_MS = 60 * 60 * 1000; // 60 minutes

// Utility functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getJitterDelay() {
  return REQUEST_DELAY_MS_MIN + Math.random() * (REQUEST_DELAY_MS_MAX - REQUEST_DELAY_MS_MIN);
}

function getRandomUserAgent() {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

function toAbsoluteUrl(href, baseUrl) {
  if (!href) return '';
  try {
    if (href.startsWith('http')) return href;
    const base = new URL(baseUrl);
    return new URL(href, base).href;
  } catch (e) {
    return '';
  }
}

// Shared HTTP client with enhanced headers
const http = axios.create({
  timeout: 20000,
  headers: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
  }
});

// Fetch with fallback to Jina proxy
async function fetchWithFallback(url, retries = 0) {
  try {
    console.log(`[FETCH] Attempting: ${url} (retry: ${retries})`);
    const response = await http.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent()
      }
    });
    return { data: response.data, viaJina: false };
  } catch (error) {
    console.warn(`[FETCH] Direct fetch failed for ${url}: ${error.message}`);
    
    if (ENABLE_JINA_PROXY && retries < MAX_RETRIES) {
      try {
        console.log(`[FETCH] Trying Jina proxy for: ${url}`);
        const jinaUrl = `https://r.jina.ai/${url}`;
        const response = await http.get(jinaUrl, {
          headers: {
            'User-Agent': getRandomUserAgent()
          }
        });
        return { data: response.data, viaJina: true };
      } catch (jinaError) {
        console.warn(`[FETCH] Jina proxy failed for ${url}: ${jinaError.message}`);
      }
    }
    
    if (retries < MAX_RETRIES) {
      await sleep(2000 * (retries + 1));
      return fetchWithFallback(url, retries + 1);
    }
    
    throw error;
  }
}

// Enhanced WebNovel scraper that works with Jina proxy markdown
async function scrapeWebnovel(query) {
  console.log(`[scrapeWebnovel] Searching for: ${query}`);
  const searchUrl = `https://www.webnovel.com/search?keywords=${encodeURIComponent(query)}`;
  try {
    const { data, viaJina } = await fetchWithFallback(searchUrl);
    const books = [];
    
    if (viaJina) {
      // Parse Jina markdown format
      const lines = data.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Look for book links in markdown format
        const linkMatch = line.match(/\[([^\]]+)\]\((https:\/\/www\.webnovel\.com\/book\/[^)]+)\)/);
        if (linkMatch) {
          const title = linkMatch[1].replace(/\*\*/g, '').trim();
          const link = linkMatch[2];
          
          if (title && link && !title.match(/^(URBAN|ACTION|ADVENTURE|SYSTEM|WEAKTOSTRONG|VIDEOGAME)$/)) {
            books.push({
              title,
              link,
              author: '',
              cover: '',
              source: 'webnovel'
            });
          }
        }
      }
    } else {
      // Parse HTML content
      const $ = cheerio.load(data);
      $('.search_result_list li, .book-item, .novel-item').each((_, el) => {
        const $el = $(el);
        const titleEl = $el.find('.book-title a, .title a, h3 a, .name a').first();
        const title = titleEl.text().trim() || titleEl.attr('title') || '';
        const link = titleEl.attr('href');
        const author = $el.find('.author, .writer, .book-author').text().trim().replace('by', '').trim();
        const cover = $el.find('img').attr('src') || $el.find('img').attr('data-src') || '';
        
        if (title && link) {
          const fullLink = link.startsWith('http') ? link : `https://www.webnovel.com${link}`;
          books.push({ title, link: fullLink, author, cover, source: 'webnovel' });
        }
      });
    }
    
    console.log(`[scrapeWebnovel] Found ${books.length} books`);
    return books;
  } catch (err) {
    console.error(`[scrapeWebnovel] HTTP error:`, err?.message || err);
    return [];
  }
}

// Royal Road scraper
async function scrapeRoyalRoad(query) {
  console.log(`[scrapeRoyalRoad] Searching for: ${query}`);
  const searchUrl = `https://www.royalroad.com/fictions/search?title=${encodeURIComponent(query)}`;
  try {
    const { data } = await fetchWithFallback(searchUrl);
    const $ = cheerio.load(data);
    const books = [];
    
    $('.fiction-list .fiction-title').each((_, el) => {
      const $el = $(el);
      const a = $el.find('a');
      const title = a.text().trim();
      const link = 'https://www.royalroad.com' + a.attr('href');
      
      if (title && link) {
        books.push({ title, link, author: '', cover: '', source: 'royalroad' });
      }
    });
    
    console.log(`[scrapeRoyalRoad] Found ${books.length} books`);
    return books;
  } catch (err) {
    console.error(`[scrapeRoyalRoad] HTTP error:`, err?.message || err);
    return [];
  }
}

// NovelBin scraper
// NovelUpdates scraper
async function scrapeNovelUpdates(query) {
  console.log(`[scrapeNovelUpdates] Searching for: ${query}`);
  const searchUrl = `https://www.novelupdates.com/?s=${encodeURIComponent(query)}&post_type=seriesplans`;
  try {
    const { data } = await fetchWithFallback(searchUrl);
    const $ = cheerio.load(data);
    const books = [];
    $('.search_main_box .search_title').each((_, el) => {
      const $el = $(el);
      const a = $el.find('a').first();
      const title = a.text().trim();
      const link = a.attr('href');
      if (title && link) {
        books.push({ title, link, author: '', cover: '', source: 'novelupdates' });
      }
    });
    console.log(`[scrapeNovelUpdates] Found ${books.length} books`);
    return books;
  } catch (err) {
    console.error(`[scrapeNovelUpdates] HTTP error:`, err?.message || err);
    return [];
  }
}

// WuxiaWorld scraper
async function scrapeWuxiaWorld(query) {
  console.log(`[scrapeWuxiaWorld] Searching for: ${query}`);
  const searchUrl = `https://www.wuxiaworld.com/search?query=${encodeURIComponent(query)}`;
  try {
    const { data } = await fetchWithFallback(searchUrl);
    const $ = cheerio.load(data);
    const books = [];
    $('.novel-item').each((_, el) => {
      const $el = $(el);
      const a = $el.find('.novel-title a').first();
      const title = a.text().trim();
      const link = a.attr('href');
      const author = $el.find('.novel-author').text().trim();
      const cover = $el.find('img').attr('src') || '';
      if (title && link) {
        books.push({ title, link: `https://www.wuxiaworld.com${link}`, author, cover, source: 'wuxiaworld' });
      }
    });
    console.log(`[scrapeWuxiaWorld] Found ${books.length} books`);
    return books;
  } catch (err) {
    console.error(`[scrapeWuxiaWorld] HTTP error:`, err?.message || err);
    return [];
  }
}

// ScribbleHub scraper
async function scrapeScribbleHub(query) {
  console.log(`[scrapeScribbleHub] Searching for: ${query}`);
  const searchUrl = `https://www.scribblehub.com/?s=${encodeURIComponent(query)}&post_type=fictionposts`;
  try {
    const { data } = await fetchWithFallback(searchUrl);
    const $ = cheerio.load(data);
    const books = [];
    $('.search_main_box .search_title').each((_, el) => {
      const $el = $(el);
      const a = $el.find('a').first();
      const title = a.text().trim();
      const link = a.attr('href');
      if (title && link) {
        books.push({ title, link, author: '', cover: '', source: 'scribblehub' });
      }
    });
    console.log(`[scrapeScribbleHub] Found ${books.length} books`);
    return books;
  } catch (err) {
    console.error(`[scrapeScribbleHub] HTTP error:`, err?.message || err);
    return [];
  }
}

// LightNovelPub scraper
async function scrapeLightNovelPub(query) {
  console.log(`[scrapeLightNovelPub] Searching for: ${query}`);
  const searchUrl = `https://www.lightnovelpub.com/search?keyword=${encodeURIComponent(query)}`;
  try {
    const { data } = await fetchWithFallback(searchUrl);
    const $ = cheerio.load(data);
    const books = [];
    $('.novel-item').each((_, el) => {
      const $el = $(el);
      const a = $el.find('.novel-title a').first();
      const title = a.text().trim();
      const link = a.attr('href');
      const author = $el.find('.novel-author').text().trim();
      const cover = $el.find('img').attr('src') || '';
      if (title && link) {
        books.push({ title, link: `https://www.lightnovelpub.com${link}`, author, cover, source: 'lightnovelpub' });
      }
    });
    console.log(`[scrapeLightNovelPub] Found ${books.length} books`);
    return books;
  } catch (err) {
    console.error(`[scrapeLightNovelPub] HTTP error:`, err?.message || err);
    return [];
  }
}

// NovelFull scraper
async function scrapeNovelFull(query) {
  console.log(`[scrapeNovelFull] Searching for: ${query}`);
  const searchUrl = `https://novelfull.com/search?keyword=${encodeURIComponent(query)}`;
  try {
    const { data } = await fetchWithFallback(searchUrl);
    const $ = cheerio.load(data);
    const books = [];
    $('.novel-item').each((_, el) => {
      const $el = $(el);
      const a = $el.find('.novel-title a').first();
      const title = a.text().trim();
      const link = a.attr('href');
      const author = $el.find('.novel-author').text().trim();
      const cover = $el.find('img').attr('src') || '';
      if (title && link) {
        books.push({ title, link: `https://novelfull.com${link}`, author, cover, source: 'novelfull' });
      }
    });
    console.log(`[scrapeNovelFull] Found ${books.length} books`);
    return books;
  } catch (err) {
    console.error(`[scrapeNovelFull] HTTP error:`, err?.message || err);
    return [];
  }
}
async function scrapeNovelBin(query) {
  console.log(`[scrapeNovelBin] Searching for: ${query}`);
  const searchUrl = `https://novelbin.com/search?keyword=${encodeURIComponent(query)}`;
  try {
    const { data } = await fetchWithFallback(searchUrl);
    const $ = cheerio.load(data);
    const books = [];
    
    $('.book-item, .novel-item, .list-novel .row').each((_, el) => {
      const $el = $(el);
      const titleEl = $el.find('h3 a, .novel-title a, .book-name a').first();
      const title = titleEl.text().trim();
      const link = titleEl.attr('href');
      const author = $el.find('.author, .book-author').text().trim().replace('Author:', '').trim();
      const cover = $el.find('img').attr('src') || $el.find('img').attr('data-src') || '';
      
      if (title && link) {
        const fullLink = link.startsWith('http') ? link : `https://novelbin.com${link}`;
        books.push({ 
          title, 
          link: fullLink, 
          author, 
          cover: cover.startsWith('http') ? cover : (cover ? `https://novelbin.com${cover}` : ''), 
          source: 'novelbin' 
        });
      }
    });
    
    console.log(`[scrapeNovelBin] Found ${books.length} books`);
    return books;
  } catch (err) {
    console.error(`[scrapeNovelBin] HTTP error:`, err?.message || err);
    return [];
  }
}

// Alternative search function that tries different approaches
async function searchAllSources(query) {
  const sources = [
    { name: 'webnovel', fn: scrapeWebnovel },
    { name: 'novelbin', fn: scrapeNovelBin },
    { name: 'royalroad', fn: scrapeRoyalRoad },
    { name: 'novelupdates', fn: scrapeNovelUpdates },
    { name: 'wuxiaworld', fn: scrapeWuxiaWorld },
    { name: 'scribblehub', fn: scrapeScribbleHub },
    { name: 'lightnovelpub', fn: scrapeLightNovelPub },
    { name: 'novelfull', fn: scrapeNovelFull }
  ];

  const allResults = [];
  const errors = {};

  // Run searches sequentially to avoid overwhelming
  for (const source of sources) {
    try {
      console.log(`[SEARCH] Starting ${source.name}...`);
      const results = await source.fn(query);
      console.log(`[SEARCH] ${source.name}: ${results.length} results`);
      allResults.push(...results);
    } catch (error) {
      console.error(`[SEARCH] ${source.name} failed:`, error.message);
      errors[source.name] = error.message;
    }
    await sleep(500);
  }

  // Deduplicate by title+link
  const deduped = [];
  const seen = new Set();
  for (const book of allResults) {
    const key = `${book.title}|${book.link}`;
    if (!seen.has(key)) {
      deduped.push(book);
      seen.add(key);
    }
  }

  // Sort by source order, then title
  const sourceOrder = ['webnovel', 'novelbin', 'royalroad', 'novelupdates', 'wuxiaworld', 'scribblehub', 'lightnovelpub', 'novelfull'];
  deduped.sort((a, b) => {
    const sa = sourceOrder.indexOf(a.source);
    const sb = sourceOrder.indexOf(b.source);
    if (sa !== sb) return sa - sb;
    return a.title.localeCompare(b.title);
  });

  // Build message
  let message = '';
  const successfulSources = new Set(deduped.map(book => book.source)).size;
  const totalSources = sourceOrder.length;
  const failedSources = Object.keys(errors);

  if (failedSources.length > 0) {
    message += `${failedSources.length}/${totalSources} sources had issues. `;
  }

  if (deduped.length === 0) {
    message += `No books found for "${query}". Try different keywords.`;
  } else {
    message += `Found ${deduped.length} books from ${successfulSources} sources for "${query}".`;
  }

  return { results: deduped, message };
}

// Book details function
async function getBookDetails(url, source) {
  try {
    const cacheKey = `${source}|${url}`;
    const cached = detailsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    await sleep(getJitterDelay());
    const { data } = await fetchWithFallback(url);
    
    const $ = cheerio.load(data);
    let chapters = [];
    let bookTitle = '';
    let bookAuthor = '';
    let bookDescription = '';
    let bookCover = '';
    
    // Extract book metadata based on source
    if (source === 'novelbin') {
      bookTitle = $('.book-info h1, .novel-title, .book-name').first().text().trim();
      bookAuthor = $('.author, .book-author').first().text().trim().replace('Author:', '').trim();
      bookDescription = $('.summary .content, .book-desc, .description').first().text().trim();
      bookCover = $('.book-img img, .novel-cover img').attr('src') || '';
      $('.chapter-list .row, .list-chapter li').each((i, element) => {
        const $el = $(element);
        const titleEl = $el.find('a').first();
        const title = titleEl.text().trim() || titleEl.attr('title') || '';
        const link = titleEl.attr('href');
        if (title && link) {
          const fullLink = link.startsWith('http') ? link : `https://novelbin.com${link}`;
          chapters.push({ title, link: fullLink });
        }
      });
    } else if (source === 'royalroad') {
      bookTitle = $('.fic-title h1, .fiction-title').first().text().trim();
      bookAuthor = $('.author .au-name, .fiction-author').first().text().trim();
      bookDescription = $('.description .hidden-content, .fiction-info .description').first().text().trim();
      bookCover = $('.fic-image img, .fiction-image img').attr('src') || '';
      $('#chapters .chapter-row a, .chapter-list a').each((i, element) => {
        const title = $(element).text().trim();
        const link = $(element).attr('href');
        if (title && link) {
          const fullLink = link.startsWith('http') ? link : `https://www.royalroad.com${link}`;
          chapters.push({ title, link: fullLink });
        }
      });
    } else if (source === 'novelupdates') {
      bookTitle = $('.seriestitle').first().text().trim();
      bookAuthor = $('.author').first().text().trim();
      bookDescription = $('.seriesdescription').first().text().trim();
      bookCover = $('.seriesimg img').attr('src') || '';
      $('.chapterlist a').each((i, el) => {
        const title = $(el).text().trim();
        const link = $(el).attr('href');
        if (title && link) chapters.push({ title, link });
      });
    } else if (source === 'wuxiaworld') {
      bookTitle = $('.novel-title').first().text().trim();
      bookAuthor = $('.novel-author').first().text().trim();
      bookDescription = $('.novel-synopsis').first().text().trim();
      bookCover = $('.novel-cover img').attr('src') || '';
      $('.chapter-list a').each((i, el) => {
        const title = $(el).text().trim();
        const link = $(el).attr('href');
        if (title && link) chapters.push({ title, link });
      });
    } else if (source === 'scribblehub') {
      bookTitle = $('.fic_title').first().text().trim();
      bookAuthor = $('.fic_author').first().text().trim();
      bookDescription = $('.fic_desc').first().text().trim();
      bookCover = $('.fic_image img').attr('src') || '';
      $('.chapterlist a').each((i, el) => {
        const title = $(el).text().trim();
        const link = $(el).attr('href');
        if (title && link) chapters.push({ title, link });
      });
    } else if (source === 'lightnovelpub') {
      bookTitle = $('.novel-title').first().text().trim();
      bookAuthor = $('.novel-author').first().text().trim();
      bookDescription = $('.summary').first().text().trim();
      bookCover = $('.novel-cover img').attr('src') || '';
      $('.chapter-list a').each((i, el) => {
        const title = $(el).text().trim();
        const link = $(el).attr('href');
        if (title && link) chapters.push({ title, link });
      });
    } else if (source === 'novelfull') {
      bookTitle = $('.novel-title').first().text().trim();
      bookAuthor = $('.novel-author').first().text().trim();
      bookDescription = $('.novel-summary').first().text().trim();
      bookCover = $('.novel-cover img').attr('src') || '';
      $('.chapter-list a').each((i, el) => {
        const title = $(el).text().trim();
        const link = $(el).attr('href');
        if (title && link) chapters.push({ title, link });
      });
    } else {
      // Generic extraction
      bookTitle = $('h1, .title, .book-title').first().text().trim();
      bookAuthor = $('.author, .book-author').first().text().trim();
      bookDescription = $('.description, .summary, .synopsis').first().text().trim();
      bookCover = $('.cover img, .book-cover img').attr('src') || '';
      $('a').each((i, element) => {
        const title = $(element).text().trim();
        const href = $(element).attr('href');
        if (title && href && /chapter|ch\s*\d+/i.test(title)) {
          const link = toAbsoluteUrl(href, url);
          if (link) {
            chapters.push({ title, link });
          }
        }
      });
    }
    
    const result = { 
      title: bookTitle || 'Unknown Title',
      author: bookAuthor || 'Unknown Author',
      description: bookDescription || '',
      cover: bookCover || '',
      chapters: chapters.slice(0, 1000)
    };
    
    detailsCache.set(cacheKey, { expiresAt: Date.now() + DETAILS_TTL_MS, data: result });
    return result;
  } catch (error) {
    const status = error?.response?.status;
    console.warn('Error getting book details', status ? `(status ${status})` : `(${error.message})`);
    return { 
      title: 'Unknown Title', 
      author: 'Unknown Author', 
      description: '', 
      cover: '', 
      chapters: [] 
    };
  }
}

// Chapter content function
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
    
    // Extract content based on source
    if (source === 'novelbin') {
      const container = $('#chr-content');
      if (container.length) {
        content = container.find('p').map((_, p) => $(p).text().trim()).get().filter(Boolean).join('\n\n');
        if (!content) content = container.text().trim();
      }
    } else if (source === 'royalroad') {
      const container = $('.chapter-content, .chapter-inner');
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
  const { query, nocache } = req.query;
  console.log(`[SEARCH] Query: ${query}`);
  try {
    if (!query) {
      console.warn('[SEARCH] Missing query parameter');
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    const bypassCache = String(nocache || '').toLowerCase() === '1';
    const cacheKey = `search|${query}`;
    if (!bypassCache) {
      const cached = searchCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        console.log('[SEARCH] Returning cached results');
        return res.json(cached.data);
      }
    }
  const { results: allResults, errors = {} } = await searchAllSources(query);
    const seen = new Set();
    const deduped = allResults.filter(item => {
      const key = `${item.source}|${(item.link || '').toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const sourceOrder = ['webnovel', 'novelbin', 'royalroad', 'novelupdates', 'wuxiaworld', 'scribblehub', 'lightnovelpub', 'novelfull'];
    deduped.sort((a, b) => {
      const sa = sourceOrder.indexOf(a.source);
      const sb = sourceOrder.indexOf(b.source);
      if (sa !== sb) return sa - sb;
      return a.title.localeCompare(b.title);
    });
    let message = '';
    const successfulSources = new Set(deduped.map(book => book.source)).size;
    const totalSources = sourceOrder.length;
    const failedSources = Object.keys(errors);
    if (failedSources.length > 0) {
      message += `${failedSources.length}/${totalSources} sources had issues. `;
    }
    if (deduped.length === 0) {
      message += `No books found for "${query}". Try different keywords.`;
    } else {
      message += `Found ${deduped.length} books from ${successfulSources} sources for "${query}".`;
    }
    const response = { results: deduped, message };
    searchCache.set(cacheKey, { expiresAt: Date.now() + SEARCH_TTL_MS, data: response });
    res.json(response);
  } catch (error) {
    console.error('[SEARCH] Error:', error);
    res.status(500).json({ error: 'Search failed', details: error.message });
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
  const { source } = req.params;
  const { url } = req.query;
  console.log(`[BOOK DETAILS] Request: source=${source}, url=${url}`);
  try {
    if (!url) {
      console.warn('[BOOK DETAILS] Missing url parameter');
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    const bookDetails = await getBookDetails(url, source);
    if (!bookDetails || !bookDetails.title) {
      console.warn('[BOOK DETAILS] No details found');
    }
    res.json(bookDetails);
  } catch (error) {
    console.error('[BOOK DETAILS] Error:', error);
    res.status(500).json({ error: 'Failed to get book details', details: error.message });
  }
});

app.get('/api/chapter/:source', async (req, res) => {
  const { source } = req.params;
  const { url } = req.query;
  try {
    if (!url) {
      console.warn('[CHAPTER] Missing url parameter');
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    const chapterContent = await getChapterContent(url, source);
    if (!chapterContent || !chapterContent.content) {
      console.warn('[CHAPTER] No content found');
    }
    res.json(chapterContent);
  } catch (error) {
    console.error('[CHAPTER] Error:', error);
    res.status(500).json({ error: 'Failed to get chapter content', details: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});