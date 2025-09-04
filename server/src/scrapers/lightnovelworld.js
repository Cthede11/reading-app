const cheerio = require('cheerio');
const { fetchWithFallback } = require('../utils/httpClient');
const { toAbsoluteUrl, cleanText } = require('../utils/helpers');

async function scrapeLightNovelWorld(query) {
  console.log(`[LightNovelWorld] Searching for: ${query}`);
  
  try {
    const searchUrl = `https://www.lightnovelworld.com/search?keyword=${encodeURIComponent(query)}`;
    const { data } = await fetchWithFallback(searchUrl);
    const $ = cheerio.load(data);
    const books = [];
    
    // LightNovelWorld selectors
    const selectors = [
      '.novel-item',
      '.book-item',
      '.search-result-item'
    ];
    
    for (const selector of selectors) {
      $(selector).each((_, el) => {
        const $el = $(el);
        
        const titleSelectors = [
          'h3 a',
          '.novel-title a',
          '.book-name a',
          'a[href*="/novel/"]'
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
        
        // Author selectors
        const authorSelectors = [
          '.author',
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
        
        // Cover selectors
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
        
        const absoluteLink = toAbsoluteUrl(link, 'https://www.lightnovelworld.com');
        const absoluteCover = cover ? toAbsoluteUrl(cover, 'https://www.lightnovelworld.com') : '';
        
        books.push({
          title,
          link: absoluteLink,
          author,
          cover: absoluteCover,
          source: 'lightnovelworld'
        });
      });
      
      if (books.length > 0) break;
    }
    
    console.log(`[LightNovelWorld] Found ${books.length} books`);
    return books;
    
  } catch (error) {
    console.error(`[LightNovelWorld] Error:`, error.message);
    return [];
  }
}

module.exports = {
  scrapeLightNovelWorld
};
