const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Simple cache
const searchCache = new Map();
const detailsCache = new Map();

// Utility functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomUserAgent() {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

// Enhanced fetch with Jina fallback
async function fetchWithFallback(url, retries = 3) {
  const headers = {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  };

  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, { 
        headers, 
        timeout: 15000,
        maxRedirects: 5
      });
      
      if (response.status === 200) {
        return { data: response.data, viaJina: false };
      }
      
      if (response.status === 403 || response.status === 429) {
        console.log(`[fetchWithFallback] Got ${response.status}, trying Jina proxy...`);
        const jinaUrl = `https://r.jina.ai/${url}`;
        const jinaResponse = await axios.get(jinaUrl, {
          headers: { ...headers, 'X-Return-Format': 'html' },
          timeout: 20000
        });
        
        if (jinaResponse.status === 200) {
          return { data: jinaResponse.data, viaJina: true };
        }
      }
    } catch (error) {
      console.warn(`[fetchWithFallback] Attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) throw error;
    }
  }
  
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

// Simple NovelBin scraper
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
      const author = $el.find('.author, .book-author').text().replace(/Author:?/i, '').trim();
      const cover = $el.find('img').first().attr('src');
      
      if (title && link) {
        books.push({
          title,
          link: link.startsWith('http') ? link : `https://novelbin.com${link}`,
          author: author || 'Unknown Author',
          cover: cover ? (cover.startsWith('http') ? cover : `https://novelbin.com${cover}`) : '',
          source: 'novelbin'
        });
      }
    });
    
    return books;
  } catch (error) {
    console.error(`[scrapeNovelBin] Error:`, error.message);
    return [];
  }
}

// Enhanced chapter extraction with better deduplication
async function extractChapters($, source, baseUrl) {
  const chapters = [];
  const seenLinks = new Set();
  const seenTitles = new Set();
  
  // Multiple selectors for NovelBin
  const selectors = [
    '.chapter-list a',
    '.list-chapter a',
    '#list-chapter a',
    'a[href*="chapter"]',
    'a[href*="/ch-"]',
    'a[href*="/c/"]'
  ];
  
  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const $el = $(el);
      const title = $el.text().trim();
      const link = $el.attr('href');
      
      if (link && title && !seenLinks.has(link) && !seenTitles.has(title.toLowerCase())) {
        const absoluteLink = link.startsWith('http') ? link : `https://novelbin.com${link}`;
        chapters.push({ title, link: absoluteLink });
        seenLinks.add(link);
        seenTitles.add(title.toLowerCase());
      }
    });
    
    if (chapters.length > 0) break;
  }
  
  // Sort chapters by chapter number
  chapters.sort((a, b) => {
    const aNum = extractChapterNumber(a.title);
    const bNum = extractChapterNumber(b.title);
    return aNum - bNum;
  });
  
  return chapters;
}

// Extract chapter number for sorting
function extractChapterNumber(title) {
  const match = title.match(/(?:chapter|ch\.?)\s*(\d+)/i);
  return match ? parseInt(match[1]) : 999999;
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/search', async (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }
  
  const cacheKey = `search:${query}`;
  if (searchCache.has(cacheKey)) {
    return res.json(searchCache.get(cacheKey));
  }
  
  try {
    const novelbinResults = await scrapeNovelBin(query);
    
    const results = {
      query,
      totalResults: novelbinResults.length,
      results: novelbinResults
    };
    
    searchCache.set(cacheKey, results);
    res.json(results);
  } catch (error) {
    console.error('[SEARCH] Error:', error.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/api/book/:source', async (req, res) => {
  const { source } = req.params;
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }
  
  const cacheKey = `book:${source}:${url}`;
  if (detailsCache.has(cacheKey)) {
    return res.json(detailsCache.get(cacheKey));
  }
  
  try {
    const { data } = await fetchWithFallback(url);
    const $ = cheerio.load(data);
    
    // Extract basic book info
    const title = $('h1, .novel-title, .book-title').first().text().trim() || 'Unknown Title';
    const author = $('.author, .book-author, .novel-author').first().text().trim().replace(/^(Author|By|Written by):?\s*/i, '') || 'Unknown Author';
    const description = $('.description, .synopsis, .summary').first().text().trim() || 'No description available';
    const cover = $('.book-cover img, .novel-cover img').first().attr('src') || '';
    
    // Extract chapters
    const chapters = await extractChapters($, source, url);
    
    const bookDetails = {
      title,
      author,
      description,
      cover: cover ? (cover.startsWith('http') ? cover : `https://novelbin.com${cover}`) : '',
      chapters,
      source
    };
    
    detailsCache.set(cacheKey, bookDetails);
    res.json(bookDetails);
  } catch (error) {
    console.error('[BOOK_DETAILS] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch book details' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET /api/search?query=<search_term>');
  console.log('  GET /api/book/:source?url=<book_url>');
  console.log('  GET /api/health');
});
