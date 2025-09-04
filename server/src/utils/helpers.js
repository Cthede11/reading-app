// Utility functions for the reading app server

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getJitterDelay(minDelay = 50, maxDelay = 200) {
  return minDelay + Math.random() * (maxDelay - minDelay);
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
  if (href.startsWith('http')) return href;
  if (href.startsWith('//')) return `https:${href}`;
  if (href.startsWith('/')) {
    const url = new URL(baseUrl);
    return `${url.protocol}//${url.host}${href}`;
  }
  return `${baseUrl.replace(/\/$/, '')}/${href}`;
}

function extractChapterNumber(title) {
  if (!title) return 999999;
  
  // Try various chapter number patterns
  const patterns = [
    /(?:chapter|ch\.?)\s*(\d+)/i,
    /(\d+)/,
    /(\d+)\s*$/,
    /^(\d+)/,
    /(\d+)\s*[-:]/,
    /[-:]\s*(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  
  return 999999;
}

function deduplicateAndSortChapters(chapters) {
  const seenLinks = new Set();
  const seenTitles = new Set();
  const uniqueChapters = [];
  
  for (const chapter of chapters) {
    const link = chapter.link;
    const title = chapter.title?.toLowerCase()?.trim();
    
    if (link && title && !seenLinks.has(link) && !seenTitles.has(title)) {
      uniqueChapters.push(chapter);
      seenLinks.add(link);
      seenTitles.add(title);
    }
  }
  
  // Sort by chapter number
  uniqueChapters.sort((a, b) => {
    const aNum = extractChapterNumber(a.title);
    const bNum = extractChapterNumber(b.title);
    return aNum - bNum;
  });
  
  return uniqueChapters;
}

function cleanText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = {
  sleep,
  getJitterDelay,
  getRandomUserAgent,
  toAbsoluteUrl,
  extractChapterNumber,
  deduplicateAndSortChapters,
  cleanText,
  isValidUrl
};
