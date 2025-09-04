const cheerio = require('cheerio');
const { fetchWithFallback } = require('../utils/httpClient');
const { toAbsoluteUrl, extractChapterNumber, deduplicateAndSortChapters, cleanText } = require('../utils/helpers');

// Function to validate if a link is actually a chapter
function isValidChapter(title, link) {
  if (!title || !link) return false;
  
  const lowerTitle = title.toLowerCase().trim();
  const lowerLink = link.toLowerCase();
  
  // Filter out navigation elements and invalid entries
  const invalidTitles = [
    'read now',
    'chapter list',
    'all chapters',
    'view all',
    'show all',
    'load more',
    'next',
    'previous',
    'back',
    'home',
    'menu',
    'search',
    'login',
    'register',
    'contact',
    'about',
    'privacy',
    'terms',
    'cookie',
    'sitemap',
    'rss',
    'feed',
    'more',
    'see all',
    'expand',
    'collapse'
  ];
  
  // Check if title contains invalid keywords
  for (const invalid of invalidTitles) {
    if (lowerTitle === invalid || lowerTitle.includes(invalid)) {
      return false;
    }
  }
  
  // Check if link looks like a chapter link
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
  
  // Additional validation: must have a proper chapter URL structure
  if (!lowerLink.includes('chapter') && !lowerLink.includes('/ch-') && !lowerLink.includes('/c/')) {
    return false;
  }
  
  // Filter out hash links (like #tab-chapters)
  if (lowerLink.startsWith('#')) {
    return false;
  }
  
  return true;
}

// Chapter selectors for different sources
const chapterSelectors = {
  novelbin: [
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
    '.chapter a',
    'a[href*="novelbin.com/b/"]',
    'a[href*="/b/"]'
  ]
};

// Chapter list navigation selectors
const chapterListSelectors = {
  novelbin: [
    'a[href*="chapter-list"]',
    'a:contains("Chapter List")',
    'a:contains("All Chapters")',
    'a:contains("View All")',
    'a:contains("Show All")',
    '.tab-chapters a',
    '.chapter-tab a',
    'a[href*="?tab=chapters"]',
    'a[href*="#chapters"]'
  ]
};

async function extractChapters($, source, baseUrl) {
  console.log(`[ChapterExtractor] Extracting chapters for ${source} from ${baseUrl}`);
  
  const chapters = [];
  const seenLinks = new Set();
  const seenTitles = new Set();
  
  // First, try to find and navigate to chapter list tab
  if (source === 'novelbin') {
    await tryNavigateToChapterList($, source, baseUrl);
  }
  
  // Extract chapters using source-specific selectors
  const selectors = chapterSelectors[source] || chapterSelectors.novelbin;
  
  for (const selector of selectors) {
    console.log(`[ChapterExtractor] Trying selector: ${selector}`);
    
    $(selector).each((_, el) => {
      const $el = $(el);
      const title = cleanText($el.text());
      const link = $el.attr('href');
      
      // Filter out non-chapter items
      if (link && title && 
          !seenLinks.has(link) && 
          !seenTitles.has(title.toLowerCase()) &&
          isValidChapter(title, link)) {
        const absoluteLink = toAbsoluteUrl(link, baseUrl);
        chapters.push({ title, link: absoluteLink });
        seenLinks.add(link);
        seenTitles.add(title.toLowerCase());
      }
    });
    
    if (chapters.length > 0) {
      console.log(`[ChapterExtractor] Found ${chapters.length} chapters with selector: ${selector}`);
      break;
    }
  }
  
  // If no chapters found, try more aggressive search
  if (chapters.length === 0) {
    console.log(`[ChapterExtractor] No chapters found with standard selectors, trying aggressive search...`);
    
    // Look for any link that might be a chapter
    $('a[href]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      const text = cleanText($el.text());
      
      if (href && text && 
          (href.includes('chapter') || href.includes('ch-') || href.includes('/c/')) &&
          !seenLinks.has(href) && !seenTitles.has(text.toLowerCase())) {
        
        const absoluteLink = toAbsoluteUrl(href, baseUrl);
        chapters.push({ title: text, link: absoluteLink });
        seenLinks.add(href);
        seenTitles.add(text.toLowerCase());
      }
    });
  }
  
  // Deduplicate and sort chapters
  const uniqueChapters = deduplicateAndSortChapters(chapters);
  
  console.log(`[ChapterExtractor] Final result: ${uniqueChapters.length} unique chapters`);
  return uniqueChapters;
}

async function tryNavigateToChapterList($, source, baseUrl) {
  if (source !== 'novelbin') return;
  
  console.log(`[ChapterExtractor] Attempting to navigate to chapter list for NovelBin...`);
  
  const selectors = chapterListSelectors[source] || [];
  
  for (const selector of selectors) {
    const chapterListLink = $(selector).first();
    if (chapterListLink.length > 0) {
      const href = chapterListLink.attr('href');
      if (href) {
        const chapterListUrl = toAbsoluteUrl(href, baseUrl);
        console.log(`[ChapterExtractor] Found chapter list link: ${chapterListUrl}`);
        
        try {
          const { data } = await fetchWithFallback(chapterListUrl);
          const $chapterList = cheerio.load(data);
          
          // Update the main $ object with chapter list content
          $ = $chapterList;
          console.log(`[ChapterExtractor] Successfully navigated to chapter list`);
          return;
        } catch (error) {
          console.warn(`[ChapterExtractor] Failed to navigate to chapter list: ${error.message}`);
        }
      }
    }
  }
  
  // Try direct URL patterns for NovelBin
  const directUrls = [
    baseUrl.replace('/b/', '/chapters/'),
    baseUrl + '#chapter-list',
    baseUrl + '?tab=chapters',
    baseUrl + '/chapters',
    baseUrl.replace('/b/', '/b/') + '/chapters',
    baseUrl + '?view=chapters',
    baseUrl + '?display=chapters',
    baseUrl + '/all-chapters',
    baseUrl + '?show=all',
    baseUrl + '?list=all',
    baseUrl.replace('/b/', '/b/') + '/all',
    baseUrl.replace('/b/', '/b/') + '/list'
  ];
  
  for (const url of directUrls) {
    try {
      console.log(`[ChapterExtractor] Trying direct URL: ${url}`);
      const { data } = await fetchWithFallback(url);
      const $chapterList = cheerio.load(data);
      
      // Check if this page has chapters
      const hasChapters = $chapterList('a[href*="chapter"]').length > 0;
      if (hasChapters) {
        $ = $chapterList;
        console.log(`[ChapterExtractor] Successfully loaded chapter list from: ${url}`);
        return;
      }
    } catch (error) {
      console.warn(`[ChapterExtractor] Failed to load direct URL ${url}: ${error.message}`);
    }
  }
}

// New function to try AJAX chapter loading
async function tryAjaxChapterLoading(baseUrl) {
  console.log(`[ChapterExtractor] Attempting AJAX chapter loading for NovelBin...`);
  
  // Extract book ID from URL
  const bookIdMatch = baseUrl.match(/\/b\/([^\/\?]+)/);
  if (!bookIdMatch) return null;
  
  const bookId = bookIdMatch[1];
  const ajaxUrls = [
    `https://novelbin.com/ajax/chapter-list/${bookId}`,
    `https://novelbin.com/api/chapters/${bookId}`,
    `https://novelbin.com/book/${bookId}/chapters.json`,
    `https://novelbin.com/ajax/book/${bookId}/chapters`,
    `https://novelbin.com/b/${bookId}/chapters/ajax`
  ];
  
  for (const ajaxUrl of ajaxUrls) {
    try {
      console.log(`[ChapterExtractor] Trying AJAX URL: ${ajaxUrl}`);
      const { data } = await fetchWithFallback(ajaxUrl);
      
      // Try to parse as JSON first
      let chapters = [];
      try {
        const jsonData = JSON.parse(data);
        if (jsonData.chapters) {
          chapters = jsonData.chapters;
        } else if (Array.isArray(jsonData)) {
          chapters = jsonData;
        }
      } catch (jsonError) {
        // If not JSON, try to parse as HTML
        const $ = cheerio.load(data);
        $('a[href*="chapter"]').each((_, el) => {
          const $el = $(el);
          const title = $el.text().trim();
          const link = $el.attr('href');
          if (title && link && isValidChapter(title, link)) {
            chapters.push({ title, link });
          }
        });
      }
      
      // Filter chapters using validation
      chapters = chapters.filter(chapter => 
        isValidChapter(chapter.title, chapter.link)
      );
      
      if (chapters.length > 0) {
        console.log(`[ChapterExtractor] AJAX loading successful: ${chapters.length} chapters`);
        return chapters;
      }
    } catch (error) {
      console.warn(`[ChapterExtractor] AJAX URL failed: ${ajaxUrl} - ${error.message}`);
    }
  }
  
  return null;
}

// New function to try finding the chapter list page with more aggressive search
async function findChapterListPage(baseUrl) {
  console.log(`[ChapterExtractor] Aggressively searching for chapter list page...`);
  
  // Try different URL patterns that might lead to the full chapter list
  const urlPatterns = [
    baseUrl + '/chapters',
    baseUrl + '/all-chapters',
    baseUrl + '/chapter-list',
    baseUrl + '?tab=chapters',
    baseUrl + '?view=chapters',
    baseUrl + '?show=all',
    baseUrl + '?list=all',
    baseUrl.replace('/b/', '/chapters/'),
    baseUrl.replace('/b/', '/b/') + '/chapters',
    baseUrl.replace('/b/', '/b/') + '/all',
    baseUrl.replace('/b/', '/b/') + '/list'
  ];
  
  for (const url of urlPatterns) {
    try {
      console.log(`[ChapterExtractor] Trying URL pattern: ${url}`);
      const { data } = await fetchWithFallback(url);
      const $ = cheerio.load(data);
      
      // Count potential chapter links
      const chapterLinks = $('a[href*="chapter"]').length;
      const allLinks = $('a[href]').length;
      
      console.log(`[ChapterExtractor] Found ${chapterLinks} chapter links out of ${allLinks} total links`);
      
      if (chapterLinks > 50) { // If we find more than 50 chapter links, this might be the full list
        console.log(`[ChapterExtractor] Found potential chapter list page with ${chapterLinks} chapters`);
        return { $, url, chapterCount: chapterLinks };
      }
      
    } catch (error) {
      console.warn(`[ChapterExtractor] URL pattern failed: ${url} - ${error.message}`);
    }
  }
  
  return null;
}

// New function to try a different approach - look for the actual chapter list on the main page
async function findChaptersOnMainPage(baseUrl) {
  console.log(`[ChapterExtractor] Looking for chapters on the main page...`);
  
  try {
    const { data } = await fetchWithFallback(baseUrl);
    const $ = cheerio.load(data);
    
    // Look for any element that might contain a list of chapters
    const potentialContainers = [
      '.chapter-list',
      '.list-chapter',
      '#list-chapter',
      '.chapter-container',
      '.chapters',
      '.chapter-nav',
      '.chapter-menu',
      '.table-of-contents',
      '.toc'
    ];
    
    for (const container of potentialContainers) {
      const containerEl = $(container);
      if (containerEl.length > 0) {
        console.log(`[ChapterExtractor] Found potential chapter container: ${container}`);
        
        // Look for links within this container
        const links = containerEl.find('a[href]');
        console.log(`[ChapterExtractor] Found ${links.length} links in container`);
        
        if (links.length > 30) { // If we find many links, this might be the chapter list
          console.log(`[ChapterExtractor] Container has many links, might be chapter list`);
          return { $, container, linkCount: links.length };
        }
      }
    }
    
    // If no specific container found, look for any area with many chapter-like links
    const allChapterLinks = $('a[href*="chapter"]');
    console.log(`[ChapterExtractor] Found ${allChapterLinks.length} chapter links on main page`);
    
    if (allChapterLinks.length > 30) {
      console.log(`[ChapterExtractor] Main page has many chapter links`);
      return { $, container: 'main-page', linkCount: allChapterLinks.length };
    }
    
  } catch (error) {
    console.warn(`[ChapterExtractor] Failed to analyze main page: ${error.message}`);
  }
  
  return null;
}

// Function to generate missing chapters for NovelBin based on the URL pattern
async function generateMissingChapters(baseUrl, $) {
  console.log(`[ChapterExtractor] Generating missing chapters for NovelBin...`);
  
  const generatedChapters = [];
  
  try {
    // First, extract the existing chapters to find the range
    const existingChapters = [];
    $('a[href*="chapter"]').each((_, el) => {
      const $el = $(el);
      const title = cleanText($el.text());
      const link = $el.attr('href');
      
      if (title && link && isValidChapter(title, link)) {
        const match = title.match(/Chapter (\d+)/i);
        if (match) {
          existingChapters.push({
            number: parseInt(match[1]),
            title,
            link: toAbsoluteUrl(link, baseUrl)
          });
        }
      }
    });
    
    if (existingChapters.length === 0) {
      console.log(`[ChapterExtractor] No existing chapters found to base generation on`);
      return generatedChapters;
    }
    
    // Sort by chapter number
    existingChapters.sort((a, b) => a.number - b.number);
    
    const minChapter = existingChapters[0].number;
    const maxChapter = existingChapters[existingChapters.length - 1].number;
    
    console.log(`[ChapterExtractor] Found chapters ${minChapter} to ${maxChapter}`);
    
    // Check if there's a gap indicating more chapters exist
    if (maxChapter - minChapter > existingChapters.length) {
      console.log(`[ChapterExtractor] Gap detected, checking for more chapters...`);
      
      // Test a few higher chapter numbers to find the actual maximum
      const testChapters = [maxChapter + 10, maxChapter + 50, maxChapter + 100, maxChapter + 200];
      let actualMaxChapter = maxChapter;
      
      for (const testChapter of testChapters) {
        try {
          const testUrl = `${baseUrl}/chapter-${testChapter}`;
          const { data } = await fetchWithFallback(testUrl);
          
          // Check if the page contains actual chapter content (not just a 404 or redirect)
          if (data.includes('chapter') && data.includes('content') && !data.includes('404')) {
            actualMaxChapter = testChapter;
            console.log(`[ChapterExtractor] Found chapter ${testChapter} exists`);
          } else {
            break; // Stop if we hit a non-existent chapter
          }
        } catch (error) {
          console.log(`[ChapterExtractor] Chapter ${testChapter} not found: ${error.message}`);
          break;
        }
      }
      
      console.log(`[ChapterExtractor] Actual chapter range: ${minChapter} to ${actualMaxChapter}`);
      
      // Generate missing chapters
      for (let i = minChapter; i <= actualMaxChapter; i++) {
        const existingChapter = existingChapters.find(ch => ch.number === i);
        if (!existingChapter) {
          // Generate a chapter entry for the missing chapter
          const chapterUrl = `${baseUrl}/chapter-${i}`;
          generatedChapters.push({
            title: `Chapter ${i}`,
            link: chapterUrl
          });
        }
      }
    }
    
  } catch (error) {
    console.error(`[ChapterExtractor] Error generating missing chapters: ${error.message}`);
  }
  
  return generatedChapters;
}

async function extractChaptersWithPagination($, source, baseUrl, maxPages = 50) {
  console.log(`[ChapterExtractor] Extracting chapters with pagination for ${source}`);
  
  let allChapters = [];
  let currentPage = 1;
  let hasNextPage = true;
  
  // First, try AJAX chapter loading for NovelBin
  if (source === 'novelbin') {
    const ajaxChapters = await tryAjaxChapterLoading(baseUrl);
    if (ajaxChapters && ajaxChapters.length > 0) {
      console.log(`[ChapterExtractor] AJAX loading found ${ajaxChapters.length} chapters`);
      allChapters.push(...ajaxChapters);
    }
    
    // Try to find the chapter list page with aggressive search
    const chapterListPage = await findChapterListPage(baseUrl);
    if (chapterListPage && chapterListPage.chapterCount > 50) {
      console.log(`[ChapterExtractor] Found chapter list page with ${chapterListPage.chapterCount} chapters`);
      $ = chapterListPage.$;
    } else {
      // Try to find chapters on the main page
      const mainPageChapters = await findChaptersOnMainPage(baseUrl);
      if (mainPageChapters && mainPageChapters.linkCount > 30) {
        console.log(`[ChapterExtractor] Found ${mainPageChapters.linkCount} chapter links on main page`);
        $ = mainPageChapters.$;
      }
    }
    
    // For NovelBin, try to generate missing chapters based on the pattern
    const generatedChapters = await generateMissingChapters(baseUrl, $);
    if (generatedChapters.length > 0) {
      console.log(`[ChapterExtractor] Generated ${generatedChapters.length} additional chapters`);
      allChapters.push(...generatedChapters);
    }
  }
  
  // Then, try to find the "View All Chapters" or "Show All" button
  if (source === 'novelbin') {
    const viewAllSelectors = [
      'a:contains("View All Chapters")',
      'a:contains("Show All Chapters")',
      'a:contains("All Chapters")',
      'a:contains("Load More")',
      'a:contains("See All")',
      '.view-all-chapters a',
      '.show-all a',
      '.load-more a'
    ];
    
    for (const selector of viewAllSelectors) {
      const viewAllLink = $(selector).first();
      if (viewAllLink.length > 0) {
        const href = viewAllLink.attr('href');
        if (href) {
          const viewAllUrl = toAbsoluteUrl(href, baseUrl);
          console.log(`[ChapterExtractor] Found "View All" link: ${viewAllUrl}`);
          
          try {
            const { data } = await fetchWithFallback(viewAllUrl);
            $ = cheerio.load(data);
            console.log(`[ChapterExtractor] Successfully loaded "View All" page`);
            break;
          } catch (error) {
            console.warn(`[ChapterExtractor] Failed to load "View All" page: ${error.message}`);
          }
        }
      }
    }
  }
  
  while (hasNextPage && currentPage <= maxPages) {
    console.log(`[ChapterExtractor] Processing page ${currentPage}`);
    
    const pageChapters = await extractChapters($, source, baseUrl);
    allChapters.push(...pageChapters);
    
    console.log(`[ChapterExtractor] Found ${pageChapters.length} chapters on page ${currentPage}`);
    
    // Look for next page link with more comprehensive selectors
    const nextPageSelectors = [
      'a:contains("Next")',
      'a:contains(">")',
      'a:contains("Next Page")',
      '.pagination .next a',
      '.pagination a[rel="next"]',
      'a[href*="page="]',
      'a[href*="p="]',
      '.page-next a',
      '.next-page a',
      'a[title*="Next"]',
      'a[aria-label*="Next"]'
    ];
    
    let nextPageLink = null;
    for (const selector of nextPageSelectors) {
      nextPageLink = $(selector).first();
      if (nextPageLink.length > 0) {
        const href = nextPageLink.attr('href');
        if (href && href !== '#') {
          break;
        }
      }
    }
    
    if (nextPageLink && nextPageLink.length > 0) {
      const nextHref = nextPageLink.attr('href');
      if (nextHref && nextHref !== '#') {
        const nextUrl = toAbsoluteUrl(nextHref, baseUrl);
        console.log(`[ChapterExtractor] Found next page: ${nextUrl}`);
        
        try {
          const { data } = await fetchWithFallback(nextUrl);
          $ = cheerio.load(data);
          currentPage++;
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.warn(`[ChapterExtractor] Failed to load next page: ${error.message}`);
          hasNextPage = false;
        }
      } else {
        hasNextPage = false;
      }
    } else {
      hasNextPage = false;
    }
  }
  
  // Deduplicate and sort all chapters (including generated ones)
  const uniqueChapters = deduplicateAndSortChapters(allChapters);
  
  console.log(`[ChapterExtractor] Pagination complete: ${uniqueChapters.length} total chapters across ${currentPage} pages`);
  return uniqueChapters;
}

module.exports = {
  extractChapters,
  extractChaptersWithPagination,
  tryNavigateToChapterList,
  tryAjaxChapterLoading,
  findChapterListPage,
  findChaptersOnMainPage
};
