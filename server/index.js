const express = require('express');
const cors = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Working server is running'
  });
});

// Simple search route
app.get('/api/search', async (req, res) => {
  const { query } = req.query;
  
  try {
    // Try to load the NovelBin scraper
    const { scrapeNovelBin } = require('./src/scrapers/novelbin');
    const results = await scrapeNovelBin(query || 'test');
    
    res.json({
      query: query || 'test',
      totalResults: results.length,
      results: results
    });
  } catch (error) {
    console.error('Search error:', error.message);
    res.json({
      query: query || 'test',
      totalResults: 0,
      results: [],
      error: error.message
    });
  }
});

// Simple book details route
app.get('/api/book/:source', async (req, res) => {
  const { source } = req.params;
  const { url } = req.query;
  
  try {
    // Try to load the chapter extractor
    const { extractChaptersWithPagination } = require('./src/scrapers/chapterExtractor');
    const { fetchWithFallback } = require('./src/utils/httpClient');
    const cheerio = require('cheerio');
    
    const { data } = await fetchWithFallback(url);
    const $ = cheerio.load(data);
    
    const title = $('h1').first().text().trim() || 'Unknown Title';
    const author = $('.author').first().text().trim() || 'Unknown Author';
    const chapters = await extractChaptersWithPagination($, source, url, 10);
    
    res.json({
      title,
      author,
      chapters,
      totalChapters: chapters.length,
      source
    });
  } catch (error) {
    console.error('Book details error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Working server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET /api/health');
  console.log('  GET /api/search?query=<search_term>');
  console.log('  GET /api/book/:source?url=<book_url>');
});
