const express = require('express');
const { scrapeNovelBin } = require('../scrapers/novelbin');
const { scrapeLightNovelWorld } = require('../scrapers/lightnovelworld');
const { scrapeNovelFull } = require('../scrapers/novelfull');
const { extractChaptersWithPagination } = require('../scrapers/chapterExtractor');
const { multiStrategyScraper } = require('../scrapers/multiStrategyScraper');
const { robustHttpClient } = require('../utils/robustHttpClient');
const { fetchWithFallback } = require('../utils/httpClient');
const { searchCache, detailsCache, chapterCache } = require('../utils/cache');
const { cleanText, sleep } = require('../utils/helpers');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    caches: {
      search: searchCache.size(),
      details: detailsCache.size(),
      chapters: chapterCache.size()
    },
    circuitBreakers: robustHttpClient.getCircuitBreakerStatus()
  });
});

// Circuit breaker management endpoint
router.get('/circuit-breakers', (req, res) => {
  res.json({
    status: robustHttpClient.getCircuitBreakerStatus(),
    timestamp: new Date().toISOString()
  });
});

// Reset circuit breaker endpoint
router.post('/circuit-breakers/reset', (req, res) => {
  const { domain } = req.body;
  
  if (domain) {
    robustHttpClient.resetCircuitBreaker(domain);
    res.json({ message: `Circuit breaker reset for ${domain}` });
  } else {
    robustHttpClient.resetAllCircuitBreakers();
    res.json({ message: 'All circuit breakers reset' });
  }
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
  } else if (type === 'chapters') {
    chapterCache.clear();
    res.json({ message: 'Chapter cache cleared' });
  } else if (type === 'all') {
    searchCache.clear();
    detailsCache.clear();
    chapterCache.clear();
    res.json({ message: 'All caches cleared' });
  } else {
    res.status(400).json({ error: 'Invalid cache type. Use: search, details, chapters, or all' });
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

// Book details endpoint with robust scraping
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
    console.log(`[API] Fetching book details for: ${url} with robust scraper`);
    
    // Try multiple scraping strategies
    let bookDetails = null;
    const strategies = ['multiStrategy', 'legacy'];
    
    for (const strategy of strategies) {
      try {
        if (strategy === 'multiStrategy') {
          // Use the new robust multi-strategy scraper
          bookDetails = await multiStrategyScraper.scrapeBookDetails(url, source);
        } else if (strategy === 'legacy') {
          // Fallback to legacy scraper
          console.log(`[API] Trying legacy scraper for ${source}...`);
          
          if (source === 'novelbin') {
            bookDetails = await scrapeNovelBin(url);
          } else if (source === 'lightnovelworld') {
            bookDetails = await scrapeLightNovelWorld(url);
          } else if (source === 'novelfull') {
            bookDetails = await scrapeNovelFull(url);
          } else {
            // Generic scraping
            const { data } = await robustHttpClient.fetchWithRetry(url);
            const cheerio = require('cheerio');
            const $ = cheerio.load(data);
            
            bookDetails = {
              title: multiStrategyScraper.extractTitle($, 'generic'),
              author: multiStrategyScraper.extractAuthor($, 'generic'),
              description: multiStrategyScraper.extractDescription($, 'generic'),
              cover: multiStrategyScraper.extractCover($, 'generic', url),
              chapters: multiStrategyScraper.extractChapters($, 'generic', url),
              totalChapters: 0,
              source
            };
            
            bookDetails.totalChapters = bookDetails.chapters.length;
          }
        }
        
        // Validate the scraped data
        if (bookDetails && bookDetails.title && bookDetails.title !== 'Unknown Title') {
          console.log(`[API] Successfully scraped with ${strategy} strategy: ${bookDetails.title}`);
          break;
        }
        
      } catch (error) {
        console.warn(`[API] Strategy ${strategy} failed for ${url}:`, error.message);
        continue;
      }
    }
    
    if (!bookDetails) {
      throw new Error('All scraping strategies failed');
    }
    
    // Cache the results
    detailsCache.set(cacheKey, bookDetails, 1800000); // 30 minutes
    console.log(`[API] Book details extracted: ${bookDetails.title} with ${bookDetails.totalChapters} chapters`);
    res.json(bookDetails);
    
  } catch (error) {
    console.error('[API] Book details error:', error.message);
    
    // Return more specific error information
    let errorMessage = 'Failed to fetch book details';
    let errorDetails = error.message;
    
    if (error.message.includes('Circuit breaker open')) {
      errorMessage = 'Website is temporarily unavailable due to too many requests';
      errorDetails = 'Please try again in a few minutes';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timed out - website may be slow';
      errorDetails = 'Please try again later';
    } else if (error.message.includes('ERR_NETWORK') || error.message.includes('ECONNREFUSED')) {
      errorMessage = 'Network connection failed';
      errorDetails = 'Please check your internet connection';
    }
    
    res.status(500).json({ 
      error: errorMessage, 
      details: errorDetails,
      retryable: !error.message.includes('Circuit breaker open')
    });
  }
});

// Chapter content endpoint with robust scraping
router.get('/chapter/:source', async (req, res) => {
  const { source } = req.params;
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }
  
  const cacheKey = `chapter:${source}:${url}`;
  if (chapterCache.has(cacheKey)) {
    console.log(`[API] Returning cached chapter content for: ${url}`);
    return res.json(chapterCache.get(cacheKey));
  }
  
  try {
    console.log(`[API] Fetching chapter content for: ${url} with robust scraper`);
    
    // Try multiple strategies for chapter content
    let chapterData = null;
    const strategies = ['robust', 'legacy'];
    
    for (const strategy of strategies) {
      try {
        if (strategy === 'robust') {
          // Use robust HTTP client with retry logic
          const response = await robustHttpClient.fetchWithRetry(url);
          const cheerio = require('cheerio');
          const $ = cheerio.load(response.data);
          
          // Extract chapter content with multiple selectors
          const contentSelectors = [
            '#chapter-content',
            '.chapter-content',
            '.content',
            '.chapter-text',
            '.novel-content',
            '.reading-content',
            '.chapter-body',
            '.entry-content',
            '.post-content',
            'article .content',
            'main .content'
          ];
          
          let content = '';
          for (const selector of contentSelectors) {
            const contentEl = $(selector);
            if (contentEl.length > 0) {
              content = contentEl.html();
              if (content && content.trim().length > 100) {
                break;
              }
            }
          }
          
          // Extract chapter title with multiple selectors
          const titleSelectors = [
            'h1',
            '.chapter-title',
            '.title',
            'h2',
            '.entry-title',
            '.post-title',
            'article h1',
            'main h1'
          ];
          
          let title = 'Unknown Chapter';
          for (const selector of titleSelectors) {
            const titleEl = $(selector).first();
            if (titleEl.length > 0) {
              const titleText = cleanText(titleEl.text());
              if (titleText && titleText.length > 0) {
                title = titleText;
                break;
              }
            }
          }
          
          // Calculate word count
          const wordCount = content ? content.replace(/<[^>]*>/g, '').split(/\s+/).length : 0;
          
          chapterData = {
            title,
            content,
            url,
            source,
            wordCount,
            cachedAt: new Date().toISOString(),
            strategy: 'robust'
          };
          
        } else if (strategy === 'legacy') {
          // Fallback to legacy method
          console.log(`[API] Trying legacy chapter scraper for ${source}...`);
          
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
          
          // Calculate word count
          const wordCount = content ? content.replace(/<[^>]*>/g, '').split(/\s+/).length : 0;
          
          chapterData = {
            title,
            content,
            url,
            source,
            wordCount,
            cachedAt: new Date().toISOString(),
            strategy: 'legacy'
          };
        }
        
        // Validate the scraped data
        if (chapterData && chapterData.content && chapterData.content.trim().length > 50) {
          console.log(`[API] Successfully scraped chapter with ${strategy} strategy: ${chapterData.title}`);
          break;
        }
        
      } catch (error) {
        console.warn(`[API] Chapter strategy ${strategy} failed for ${url}:`, error.message);
        continue;
      }
    }
    
    if (!chapterData) {
      throw new Error('All chapter scraping strategies failed');
    }
    
    // Cache for 1 hour
    chapterCache.set(cacheKey, chapterData, 3600000);
    
    res.json(chapterData);
    
  } catch (error) {
    console.error('[API] Chapter content error:', error.message);
    
    // Return more specific error information
    let errorMessage = 'Failed to fetch chapter content';
    let errorDetails = error.message;
    
    if (error.message.includes('Circuit breaker open')) {
      errorMessage = 'Website is temporarily unavailable due to too many requests';
      errorDetails = 'Please try again in a few minutes';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timed out - website may be slow';
      errorDetails = 'Please try again later';
    } else if (error.message.includes('ERR_NETWORK') || error.message.includes('ECONNREFUSED')) {
      errorMessage = 'Network connection failed';
      errorDetails = 'Please check your internet connection';
    }
    
    res.status(500).json({ 
      error: errorMessage, 
      details: errorDetails,
      retryable: !error.message.includes('Circuit breaker open')
    });
  }
});

module.exports = router;
