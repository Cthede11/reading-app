const cheerio = require('cheerio');
const { fetchWithFallback } = require('../utils/httpClient');
const { toAbsoluteUrl, cleanText } = require('../utils/helpers');

// Known book mappings for direct URL matching (disabled to allow proper search)
const knownBooks = {
  // 'timeless assassin': 'https://novelbin.com/b/timeless-assassin',
  // 'timeless assassain': 'https://novelbin.com/b/timeless-assassin', // Common misspelling
  // 'timeless assasin': 'https://novelbin.com/b/timeless-assassin'   // Another misspelling
};

// Search variations for better matching
const searchVariations = (query) => {
  const variations = [query];
  
  // Add common variations
  if (query.toLowerCase().includes('assassin')) {
    variations.push(query.replace(/assassin/gi, 'assasin'));
    variations.push(query.replace(/assassin/gi, 'assassain'));
  }
  
  return variations;
};

async function scrapeNovelBin(query) {
  console.log(`[NovelBin] Searching for: ${query}`);
  
  // Check if we have a direct URL match
  const lowerQuery = query.toLowerCase();
  if (knownBooks[lowerQuery]) {
    console.log(`[NovelBin] Found direct URL match for: ${query}`);
    return [{
      title: query,
      link: knownBooks[lowerQuery],
      author: 'Unknown Author',
      cover: '',
      source: 'novelbin'
    }];
  }
  
  const variations = searchVariations(query);
  const allResults = [];
  
  for (const variation of variations) {
    try {
      const searchUrl = `https://novelbin.com/search?keyword=${encodeURIComponent(variation)}`;
      console.log(`[NovelBin] Searching with variation: ${variation}`);
      
      const { data } = await fetchWithFallback(searchUrl);
      const $ = cheerio.load(data);
      const books = [];
      
      // Multiple selectors for different NovelBin layouts
      const selectors = [
        '.book-item',
        '.novel-item', 
        '.list-novel .row',
        '.search-result-item',
        '.book-list-item',
        '.novel-list-item'
      ];
      
      for (const selector of selectors) {
        $(selector).each((_, el) => {
          const $el = $(el);
          
          // Try multiple title selectors
          const titleSelectors = [
            'h3 a',
            '.novel-title a',
            '.book-name a',
            '.title a',
            'a[href*="/b/"]'
          ];
          
          let titleEl = null;
          for (const titleSelector of titleSelectors) {
            titleEl = $el.find(titleSelector).first();
            if (titleEl.length > 0) break;
          }
          
          if (titleEl.length === 0) return;
          
          const title = cleanText(titleEl.text());
          const link = titleEl.attr('href');
          
          if (!title || !link) return;
          
          // Try multiple author selectors
          const authorSelectors = [
            '.author',
            '.book-author',
            '.novel-author',
            '.writer'
          ];
          
          let author = 'Unknown Author';
          for (const authorSelector of authorSelectors) {
            const authorEl = $el.find(authorSelector);
            if (authorEl.length > 0) {
              author = cleanText(authorEl.text().replace(/Author:?/i, ''));
              break;
            }
          }
          
          // Try multiple cover selectors
          const coverSelectors = [
            'img',
            '.book-cover img',
            '.novel-cover img'
          ];
          
          let cover = '';
          for (const coverSelector of coverSelectors) {
            const coverEl = $el.find(coverSelector).first();
            if (coverEl.length > 0) {
              cover = coverEl.attr('src') || coverEl.attr('data-src');
              if (cover) break;
            }
          }
          
          const absoluteLink = toAbsoluteUrl(link, 'https://novelbin.com');
          const absoluteCover = cover ? toAbsoluteUrl(cover, 'https://novelbin.com') : '';
          
          books.push({
            title,
            link: absoluteLink,
            author,
            cover: absoluteCover,
            source: 'novelbin'
          });
        });
        
        if (books.length > 0) break; // Found books with this selector
      }
      
      allResults.push(...books);
      
      if (books.length > 0) {
        console.log(`[NovelBin] Found ${books.length} books with variation: ${variation}`);
        break; // Found results, no need to try other variations
      }
      
    } catch (error) {
      console.error(`[NovelBin] Error searching with variation "${variation}":`, error.message);
    }
  }
  
  // Remove duplicates based on link
  const uniqueResults = [];
  const seenLinks = new Set();
  
  for (const book of allResults) {
    if (!seenLinks.has(book.link)) {
      uniqueResults.push(book);
      seenLinks.add(book.link);
    }
  }
  
  console.log(`[NovelBin] Total unique results: ${uniqueResults.length}`);
  return uniqueResults;
}

module.exports = {
  scrapeNovelBin
};
