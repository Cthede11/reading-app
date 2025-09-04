const { extractChaptersWithPagination } = require('./src/scrapers/chapterExtractor');
const { fetchWithFallback } = require('./src/utils/httpClient');
const cheerio = require('cheerio');

async function testUpdatedChapterExtraction() {
  try {
    console.log('Testing updated chapter extraction for Timeless Assassin...');
    const url = 'https://novelbin.com/b/timeless-assassin';
    const { data } = await fetchWithFallback(url);
    const $ = cheerio.load(data);
    
    console.log('Page loaded, extracting chapters...');
    const chapters = await extractChaptersWithPagination($, 'novelbin', url, 50);
    console.log('Total chapters found:', chapters.length);
    
    if (chapters.length > 0) {
      console.log('First few chapters:');
      chapters.slice(0, 5).forEach((ch, i) => {
        console.log(`${i+1}. ${ch.title}`);
      });
      
      console.log('Last few chapters:');
      chapters.slice(-5).forEach((ch, i) => {
        console.log(`${chapters.length-4+i}. ${ch.title}`);
      });
      
      // Check for chapter numbers
      const chapterNumbers = [];
      chapters.forEach(ch => {
        const match = ch.title.match(/Chapter (\d+)/i);
        if (match) {
          chapterNumbers.push(parseInt(match[1]));
        }
      });
      
      chapterNumbers.sort((a, b) => a - b);
      console.log(`\nChapter range: ${chapterNumbers[0]} to ${chapterNumbers[chapterNumbers.length - 1]}`);
      console.log(`Total unique chapters: ${chapterNumbers.length}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testUpdatedChapterExtraction();
