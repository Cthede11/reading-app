const cheerio = require('cheerio');
const { robustHttpClient } = require('../utils/robustHttpClient');
const { cleanText, toAbsoluteUrl } = require('../utils/helpers');

class MultiStrategyScraper {
  constructor() {
    this.strategies = new Map();
    this.initializeStrategies();
  }

  initializeStrategies() {
    // NovelBin strategies
    this.strategies.set('novelbin', {
      title: [
        'h1.novel-title',
        'h1',
        '.book-title',
        '.title',
        'h1.title',
        '[data-title]'
      ],
      author: [
        'h3:contains("Author") + *',
        '.author',
        '.book-author',
        '.novel-author',
        '.writer',
        '.author-name',
        'h3:contains("Author")',
        'span:contains("Author") + *'
      ],
      description: [
        '.description',
        '.synopsis',
        '.summary',
        '.book-description',
        '.novel-description',
        '.content',
        '.book-content'
      ],
      cover: [
        '.book-cover img',
        '.novel-cover img',
        '.cover img',
        'img[alt*="cover"]',
        'img[src*="cover"]',
        '.book-img img',
        '.novel-img img'
      ],
      chapters: [
        '.list-chapter a',
        '#list-chapter a',
        '.chapter-list a',
        'a[href*="chapter"]',
        'a[href*="/ch-"]',
        'a[href*="/c/"]',
        '.chapter-item a',
        '.chapter-link',
        'a[href*="/chapter-"]',
        '.chapter-row a',
        '.chapter-list-item a',
        '.chapter a'
      ]
    });

    // Generic fallback strategies
    this.strategies.set('generic', {
      title: [
        'h1',
        'title',
        '.title',
        '[data-title]',
        'h1.title',
        '.book-title',
        '.novel-title'
      ],
      author: [
        '.author',
        '.book-author',
        '.novel-author',
        '.writer',
        '.author-name',
        'h3:contains("Author")',
        'span:contains("Author")',
        'p:contains("Author")'
      ],
      description: [
        '.description',
        '.synopsis',
        '.summary',
        '.book-description',
        '.novel-description',
        '.content',
        '.book-content',
        'p:contains("description")',
        'div:contains("description")'
      ],
      cover: [
        'img[alt*="cover"]',
        'img[src*="cover"]',
        '.cover img',
        '.book-cover img',
        '.novel-cover img',
        '.book-img img',
        '.novel-img img'
      ],
      chapters: [
        'a[href*="chapter"]',
        'a[href*="/ch-"]',
        'a[href*="/c/"]',
        'a[href*="/chapter-"]',
        '.chapter a',
        '.chapter-list a',
        '.list-chapter a'
      ]
    });
  }

  // Extract content using multiple selectors
  extractWithSelectors($, selectors, options = {}) {
    const { 
      textOnly = false, 
      attribute = null, 
      validate = null,
      transform = null 
    } = options;

    for (const selector of selectors) {
      try {
        const elements = $(selector);
        
        for (let i = 0; i < elements.length; i++) {
          const element = $(elements[i]);
          let content;

          if (attribute) {
            content = element.attr(attribute);
          } else if (textOnly) {
            content = element.text();
          } else {
            content = element.html();
          }

          if (content && content.trim()) {
            // Apply validation if provided
            if (validate && !validate(content)) {
              continue;
            }

            // Apply transform if provided
            if (transform) {
              content = transform(content);
            }

            return cleanText(content);
          }
        }
      } catch (error) {
        console.warn(`[MultiStrategyScraper] Error with selector ${selector}:`, error.message);
        continue;
      }
    }

    return null;
  }

  // Extract title with multiple strategies
  extractTitle($, source = 'generic') {
    const strategies = this.strategies.get(source) || this.strategies.get('generic');
    
    const title = this.extractWithSelectors($, strategies.title, {
      textOnly: true,
      validate: (text) => text.length > 0 && text.length < 200
    });

    return title || 'Unknown Title';
  }

  // Extract author with multiple strategies
  extractAuthor($, source = 'generic') {
    const strategies = this.strategies.get(source) || this.strategies.get('generic');
    
    let author = this.extractWithSelectors($, strategies.author, {
      textOnly: true,
      validate: (text) => text.length > 0 && text.length < 100
    });

    // Clean up author text
    if (author) {
      author = author.replace(/^(Author|By|Written by):?\s*/i, '').trim();
    }

    return author || 'Unknown Author';
  }

  // Extract description with multiple strategies
  extractDescription($, source = 'generic') {
    const strategies = this.strategies.get(source) || this.strategies.get('generic');
    
    const description = this.extractWithSelectors($, strategies.description, {
      textOnly: true,
      validate: (text) => text.length > 10 && text.length < 2000
    });

    return description || 'No description available';
  }

  // Extract cover image with multiple strategies
  extractCover($, source = 'generic', baseUrl = '') {
    const strategies = this.strategies.get(source) || this.strategies.get('generic');
    
    const cover = this.extractWithSelectors($, strategies.cover, {
      attribute: 'src',
      validate: (src) => src && (src.includes('http') || src.startsWith('/'))
    });

    if (cover) {
      return cover.startsWith('http') ? cover : toAbsoluteUrl(cover, baseUrl);
    }

    return '';
  }

  // Extract chapters with multiple strategies
  extractChapters($, source = 'generic', baseUrl = '') {
    const strategies = this.strategies.get(source) || this.strategies.get('generic');
    const chapters = [];
    const seenLinks = new Set();
    const seenTitles = new Set();

    for (const selector of strategies.chapters) {
      try {
        $(selector).each((_, element) => {
          const $el = $(element);
          const title = cleanText($el.text());
          const link = $el.attr('href');

          if (link && title && 
              !seenLinks.has(link) && 
              !seenTitles.has(title.toLowerCase()) &&
              this.isValidChapter(title, link)) {
            
            const absoluteLink = toAbsoluteUrl(link, baseUrl);
            chapters.push({ title, link: absoluteLink });
            seenLinks.add(link);
            seenTitles.add(title.toLowerCase());
          }
        });

        // If we found chapters with this selector, break
        if (chapters.length > 0) {
          break;
        }
      } catch (error) {
        console.warn(`[MultiStrategyScraper] Error extracting chapters with selector ${selector}:`, error.message);
        continue;
      }
    }

    return this.deduplicateAndSortChapters(chapters);
  }

  // Validate if a link is actually a chapter
  isValidChapter(title, link) {
    if (!title || !link) return false;
    
    const lowerTitle = title.toLowerCase().trim();
    const lowerLink = link.toLowerCase();
    
    // Filter out navigation elements
    const invalidTitles = [
      'read now', 'chapter list', 'all chapters', 'view all', 'show all',
      'load more', 'next', 'previous', 'back', 'home', 'menu', 'search',
      'login', 'register', 'contact', 'about', 'privacy', 'terms'
    ];
    
    for (const invalid of invalidTitles) {
      if (lowerTitle === invalid || lowerTitle.includes(invalid)) {
        return false;
      }
    }
    
    // Check for chapter patterns
    const chapterPatterns = [
      /chapter/i,
      /ch-/i,
      /\/c\//i,
      /\/chapter-/i
    ];
    
    const hasChapterPattern = chapterPatterns.some(pattern => 
      pattern.test(lowerTitle) || pattern.test(lowerLink)
    );
    
    // Must have chapter pattern or be a numbered item
    if (!hasChapterPattern && !/^\d+/.test(title.trim())) {
      return false;
    }
    
    // Additional validation
    if (!lowerLink.includes('chapter') && !lowerLink.includes('/ch-') && !lowerLink.includes('/c/')) {
      return false;
    }
    
    // Filter out hash links
    if (lowerLink.startsWith('#')) {
      return false;
    }
    
    return true;
  }

  // Deduplicate and sort chapters
  deduplicateAndSortChapters(chapters) {
    // Remove duplicates based on link
    const uniqueChapters = chapters.filter((chapter, index, self) => 
      index === self.findIndex(c => c.link === chapter.link)
    );

    // Sort chapters
    return uniqueChapters.sort((a, b) => {
      // Extract chapter numbers
      const aNum = this.extractChapterNumber(a.title);
      const bNum = this.extractChapterNumber(b.title);
      
      if (aNum !== null && bNum !== null) {
        return aNum - bNum;
      }
      
      // Fallback to string comparison
      return a.title.localeCompare(b.title);
    });
  }

  // Extract chapter number from title
  extractChapterNumber(title) {
    const match = title.match(/chapter\s*(\d+)/i);
    return match ? parseInt(match[1]) : null;
  }

  // Main scraping method
  async scrapeBookDetails(url, source = 'generic') {
    try {
      console.log(`[MultiStrategyScraper] Scraping ${url} with source ${source}`);
      
      // Try multiple URL variations
      const urlVariations = this.generateUrlVariations(url);
      
      let response;
      let $;
      
      for (const variation of urlVariations) {
        try {
          response = await robustHttpClient.fetchWithRetry(variation);
          $ = cheerio.load(response.data);
          
          // Check if we got valid content
          if (this.isValidContent($)) {
            console.log(`[MultiStrategyScraper] Successfully loaded ${variation}`);
            break;
          }
        } catch (error) {
          console.warn(`[MultiStrategyScraper] Failed to load ${variation}:`, error.message);
          continue;
        }
      }
      
      if (!$) {
        throw new Error('Failed to load any URL variation');
      }

      // Extract book details
      const bookDetails = {
        title: this.extractTitle($, source),
        author: this.extractAuthor($, source),
        description: this.extractDescription($, source),
        cover: this.extractCover($, source, url),
        chapters: this.extractChapters($, source, url),
        totalChapters: 0,
        source,
        scrapedAt: new Date().toISOString()
      };

      bookDetails.totalChapters = bookDetails.chapters.length;

      console.log(`[MultiStrategyScraper] Successfully scraped: ${bookDetails.title} with ${bookDetails.totalChapters} chapters`);
      
      return bookDetails;
      
    } catch (error) {
      console.error(`[MultiStrategyScraper] Error scraping ${url}:`, error.message);
      throw error;
    }
  }

  // Generate URL variations to try
  generateUrlVariations(url) {
    const variations = [url];
    
    try {
      const urlObj = new URL(url);
      
      // Try different path variations
      if (urlObj.pathname.includes('/b/')) {
        // NovelBin specific variations
        const basePath = urlObj.pathname.replace('/b/', '/');
        variations.push(
          `${urlObj.origin}${basePath}`,
          `${urlObj.origin}${basePath}/chapters`,
          `${urlObj.origin}${basePath}/all-chapters`
        );
      }
      
      // Try with different query parameters
      variations.push(
        `${url}?tab=chapters`,
        `${url}?view=chapters`,
        `${url}?show=all`
      );
      
    } catch (error) {
      console.warn('[MultiStrategyScraper] Error generating URL variations:', error.message);
    }
    
    return variations;
  }

  // Check if content is valid
  isValidContent($) {
    // Check for basic HTML structure
    const hasTitle = $('h1, .title, .book-title, .novel-title').length > 0;
    const hasContent = $('body').text().trim().length > 100;
    
    return hasTitle && hasContent;
  }

  // Get available strategies
  getAvailableStrategies() {
    return Array.from(this.strategies.keys());
  }

  // Add custom strategy
  addStrategy(name, selectors) {
    this.strategies.set(name, selectors);
    console.log(`[MultiStrategyScraper] Added strategy: ${name}`);
  }
}

// Create singleton instance
const multiStrategyScraper = new MultiStrategyScraper();

module.exports = {
  MultiStrategyScraper,
  multiStrategyScraper
};
