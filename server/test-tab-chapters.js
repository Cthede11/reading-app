const { fetchWithFallback } = require('./src/utils/httpClient');
const cheerio = require('cheerio');

async function testTabChapters() {
  try {
    const url = 'https://novelbin.com/b/timeless-assassin#tab-chapters-title';
    console.log(`Testing URL: ${url}`);
    
    const { data } = await fetchWithFallback(url);
    const $ = cheerio.load(data);
    
    console.log('Page loaded, looking for chapter tab content...');
    
    // Look for the tab content
    const tabSelectors = [
      '#tab-chapters-title',
      '#tab-chapters',
      '.tab-chapters',
      '.chapter-tab',
      '.tab-content',
      '.tab-pane'
    ];
    
    for (const selector of tabSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`\nFound tab element: ${selector} (${elements.length} elements)`);
        
        // Look for chapter links within this tab
        const chapterLinks = elements.find('a[href*="chapter"]');
        console.log(`  Chapter links in tab: ${chapterLinks.length}`);
        
        if (chapterLinks.length > 0) {
          // Analyze chapter numbers
          const chapterNumbers = [];
          chapterLinks.each((i, el) => {
            const $el = $(el);
            const title = $el.text().trim();
            const href = $el.attr('href');
            const match = title.match(/Chapter (\d+)/i);
            if (match) {
              chapterNumbers.push(parseInt(match[1]));
            }
          });
          
          chapterNumbers.sort((a, b) => a - b);
          console.log(`  Chapter range: ${chapterNumbers[0]} to ${chapterNumbers[chapterNumbers.length - 1]}`);
          console.log(`  Total chapters: ${chapterNumbers.length}`);
          
          // Show first few chapters
          console.log('  First few chapters:');
          chapterLinks.slice(0, 5).each((i, el) => {
            const $el = $(el);
            const title = $el.text().trim();
            const href = $el.attr('href');
            console.log(`    ${i+1}. "${title}" -> ${href}`);
          });
          
          // Show last few chapters
          if (chapterLinks.length > 5) {
            console.log('  Last few chapters:');
            chapterLinks.slice(-5).each((i, el) => {
              const $el = $(el);
              const title = $el.text().trim();
              const href = $el.attr('href');
              console.log(`    ${chapterLinks.length-4+i}. "${title}" -> ${href}`);
            });
          }
        }
      }
    }
    
    // Also check for any elements that might contain the full chapter list
    console.log('\nLooking for elements with many chapter links...');
    $('*').each((i, el) => {
      const $el = $(el);
      const chapterLinks = $el.find('a[href*="chapter"]');
      if (chapterLinks.length > 50) {
        const tagName = el.tagName;
        const className = $el.attr('class') || '';
        const id = $el.attr('id') || '';
        console.log(`  ${tagName}${id ? '#' + id : ''}${className ? '.' + className.split(' ').join('.') : ''}: ${chapterLinks.length} chapter links`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testTabChapters();
