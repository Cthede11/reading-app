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

// Web scraping functions
async function scrapeNovelBin(query) {
  try {
    const searchUrl = `https://novelbin.com/search?keyword=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const books = [];
    
    $('.search-item').each((i, element) => {
      const title = $(element).find('.search-item-title a').text().trim();
      const link = $(element).find('.search-item-title a').attr('href');
      const author = $(element).find('.search-item-author').text().trim();
      const cover = $(element).find('img').attr('src');
      
      if (title && link) {
        books.push({ title, link, author, cover, source: 'novelbin' });
      }
    });
    
    return books;
  } catch (error) {
    console.error('Error scraping NovelBin:', error);
    return [];
  }
}

async function scrapeLightNovelPub(query) {
  try {
    const searchUrl = `https://lightnovelpub.me/search?keyword=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const books = [];
    
    $('.novel-item').each((i, element) => {
      const title = $(element).find('.novel-title').text().trim();
      const link = $(element).find('.novel-title a').attr('href');
      const author = $(element).find('.novel-author').text().trim();
      const cover = $(element).find('img').attr('src');
      
      if (title && link) {
        books.push({ title, link, author, cover, source: 'lightnovelpub' });
      }
    });
    
    return books;
  } catch (error) {
    console.error('Error scraping LightNovelPub:', error);
    return [];
  }
}

async function getBookDetails(url, source) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    let chapters = [];
    
    if (source === 'novelbin') {
      $('.chapter-item a').each((i, element) => {
        const title = $(element).text().trim();
        const link = $(element).attr('href');
        if (title && link) {
          chapters.push({ title, link });
        }
      });
    } else if (source === 'lightnovelpub') {
      $('.chapter-list a').each((i, element) => {
        const title = $(element).text().trim();
        const link = $(element).attr('href');
        if (title && link) {
          chapters.push({ title, link });
        }
      });
    }
    
    return { chapters };
  } catch (error) {
    console.error('Error getting book details:', error);
    return { chapters: [] };
  }
}

async function getChapterContent(url, source) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    let content = '';
    
    if (source === 'novelbin') {
      content = $('#chr-content').text().trim();
    } else if (source === 'lightnovelpub') {
      content = $('.chapter-content').text().trim();
    }
    
    return { content };
  } catch (error) {
    console.error('Error getting chapter content:', error);
    return { content: 'Error loading chapter content.' };
  }
}

// API Routes
app.get('/api/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    const [novelBinResults, lightNovelPubResults] = await Promise.all([
      scrapeNovelBin(query),
      scrapeLightNovelPub(query)
    ]);
    
    const allResults = [...novelBinResults, ...lightNovelPubResults];
    res.json({ results: allResults });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
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
