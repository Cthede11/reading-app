const express = require('express');
const { scrapeNovelBin } = require('../scrapers/novelbin');
const { scrapeLightNovelWorld } = require('../scrapers/lightnovelworld');
const { scrapeNovelFull } = require('../scrapers/novelfull');
const { extractChaptersWithPagination } = require('../scrapers/chapterExtractor');
const { fetchWithFallback } = require('../utils/httpClient');
const { searchCache, detailsCache } = require('../utils/cache');
const { cleanText, sleep } = require('../utils/helpers');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    caches: {
      search: searchCache.size(),
      details: detailsCache.size()
    }
  });
});

// Cache clearing endpoint
router.post('/cache/clear', (req, res) => {
  const { type } = req.body;
  
  if (type === 'search') {
    searchCache.clear();
    res.json({ message: 'Search cache cleared' });
  } else if (type === 'details') {
    detailsCache.clear();
    res.json({ message: 'Details cache cleared' });
  } else if (type === 'all') {
    searchCache.clear();
    detailsCache.clear();
    res.json({ message: 'All caches cleared' });
  } else {
    res.status(400).json({ error: 'Invalid cache type. Use: search, details, or all' });
  }
});

// Search endpoint
router.get('/search', async (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }
  
  const cacheKey = `search:${query}`;
  if (searchCache.has(cacheKey)) {
    console.log(`[API] Returning cached search results for: ${query}`);
    return res.json(searchCache.get(cacheKey));
  }
  
  try {
    console.log(`[API] Searching for: ${query}`);
    
    // Run all scrapers in parallel
    const [novelbinResults, lightnovelworldResults, novelfullResults] = await Promise.allSettled([
      scrapeNovelBin(query),
      scrapeLightNovelWorld(query),
      scrapeNovelFull(query)
    ]);
    
    // Combine results from all sources
    const allResults = [];
    
    if (novelbinResults.status === 'fulfilled') {
      allResults.push(...novelbinResults.value);
    } else {
      console.warn('[API] NovelBin search failed:', novelbinResults.reason?.message);
    }
    
    if (lightnovelworldResults.status === 'fulfilled') {
      allResults.push(...lightnovelworldResults.value);
    } else {
      console.warn('[API] LightNovelWorld search failed:', lightnovelworldResults.reason?.message);
    }
    
    if (novelfullResults.status === 'fulfilled') {
      allResults.push(...novelfullResults.value);
    } else {
      console.warn('[API] NovelFull search failed:', novelfullResults.reason?.message);
    }
    
    // Skip enhancement for now to avoid timeouts - return results as-is
    console.log(`[API] Returning ${allResults.length} search results without enhancement to avoid timeouts`);
    const finalResults = allResults;
    
    const results = {
      query,
      totalResults: finalResults.length,
      results: finalResults
    };
    
    searchCache.set(cacheKey, results, 600000); // 10 minutes
    res.json(results);
  } catch (error) {
    console.error('[API] Search error:', error.message);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// Book details endpoint
router.get('/book/:source', async (req, res) => {
  const { source } = req.params;
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }
  
  const cacheKey = `book:${source}:${url}`;
  if (detailsCache.has(cacheKey)) {
    console.log(`[API] Returning cached book details for: ${url}`);
    return res.json(detailsCache.get(cacheKey));
  }
  
  try {
    console.log(`[API] Fetching book details for: ${url}`);
    
    // Add delay for NovelBin to prevent rate limiting
    if (source === 'novelbin') {
      console.log('[API] Adding delay for NovelBin to prevent rate limiting...');
      await sleep(2000); // 2 second delay
    }
    
    const { data } = await fetchWithFallback(url);
    const cheerio = require('cheerio');
    const $ = cheerio.load(data);
    
    // Extract basic book info
    const titleSelectors = [
      'h1',
      '.novel-title',
      '.book-title',
      '.title',
      'h1.title'
    ];
    
    let title = 'Unknown Title';
    for (const selector of titleSelectors) {
      const titleEl = $(selector).first();
      if (titleEl.length > 0) {
        title = cleanText(titleEl.text());
        if (title) break;
      }
    }
    
    // Extract author - NovelBin specific pattern
    let author = 'Unknown Author';
    
    // Look for h3 with "Author:" and get the next sibling
    $('h3').each((i, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      if (text.includes('Author')) {
        const nextSibling = $el.next();
        if (nextSibling.length > 0) {
          const authorText = cleanText(nextSibling.text());
          if (authorText && authorText !== 'Unknown Author') {
            author = authorText;
            return false; // Break out of the loop
          }
        }
      }
    });
    
    // Fallback to standard selectors if NovelBin pattern didn't work
    if (author === 'Unknown Author') {
      const authorSelectors = [
        '.author',
        '.book-author',
        '.novel-author',
        '.writer',
        '.author-name'
      ];
      
      for (const selector of authorSelectors) {
        const authorEl = $(selector).first();
        if (authorEl.length > 0) {
          author = cleanText(authorEl.text().replace(/^(Author|By|Written by):?\s*/i, ''));
          if (author) break;
        }
      }
    }
    
    const descriptionSelectors = [
      '.description',
      '.synopsis',
      '.summary',
      '.book-description',
      '.novel-description'
    ];
    
    let description = 'No description available';
    for (const selector of descriptionSelectors) {
      const descEl = $(selector).first();
      if (descEl.length > 0) {
        description = cleanText(descEl.text());
        if (description) break;
      }
    }
    
    const coverSelectors = [
      '.book-cover img',
      '.novel-cover img',
      '.cover img',
      'img[alt*="cover"]',
      'img[src*="cover"]'
    ];
    
    let cover = '';
    for (const selector of coverSelectors) {
      const coverEl = $(selector).first();
      if (coverEl.length > 0) {
        cover = coverEl.attr('src') || coverEl.attr('data-src');
        if (cover) break;
      }
    }
    
    // Extract chapters with pagination
    console.log(`[API] Extracting chapters for ${source}...`);
    const chapters = await extractChaptersWithPagination($, source, url, 20);
    
    const bookDetails = {
      title,
      author,
      description,
      cover: cover ? (cover.startsWith('http') ? cover : `https://novelbin.com${cover}`) : '',
      chapters,
      totalChapters: chapters.length,
      source
    };
    
    detailsCache.set(cacheKey, bookDetails, 1800000); // 30 minutes
    console.log(`[API] Book details extracted: ${title} with ${chapters.length} chapters`);
    res.json(bookDetails);
    
  } catch (error) {
    console.error('[API] Book details error:', error.message);
    res.status(500).json({ error: 'Failed to fetch book details', details: error.message });
  }
});

// Chapter content endpoint
router.get('/chapter/:source', async (req, res) => {
  const { source } = req.params;
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }
  
  try {
    console.log(`[API] Fetching chapter content for: ${url}`);
    
    // Add delay for NovelBin to prevent rate limiting
    if (source === 'novelbin') {
      console.log('[API] Adding delay for NovelBin chapter to prevent rate limiting...');
      await sleep(2000); // 2 second delay
    }
    
    const { data } = await fetchWithFallback(url);
    const cheerio = require('cheerio');
    const $ = cheerio.load(data);
    
    // Extract chapter content
    const contentSelectors = [
      '#chapter-content',
      '.chapter-content',
      '.content',
      '.chapter-text',
      '.novel-content',
      '.reading-content'
    ];
    
    let content = '';
    for (const selector of contentSelectors) {
      const contentEl = $(selector);
      if (contentEl.length > 0) {
        content = contentEl.html();
        if (content) break;
      }
    }
    
    // Extract chapter title
    const titleSelectors = [
      'h1',
      '.chapter-title',
      '.title',
      'h2'
    ];
    
    let title = 'Unknown Chapter';
    for (const selector of titleSelectors) {
      const titleEl = $(selector).first();
      if (titleEl.length > 0) {
        title = cleanText(titleEl.text());
        if (title) break;
      }
    }
    
    res.json({
      title,
      content,
      url,
      source
    });
    
  } catch (error) {
    console.error('[API] Chapter content error:', error.message);
    res.status(500).json({ error: 'Failed to fetch chapter content', details: error.message });
  }
});

module.exports = router;
