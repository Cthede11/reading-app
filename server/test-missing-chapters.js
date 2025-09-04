const { fetchWithFallback } = require('./src/utils/httpClient');

async function testMissingChapters() {
  try {
    const baseUrl = 'https://novelbin.com/b/timeless-assassin';
    
    // Test some missing chapter numbers
    const testChapters = [31, 50, 100, 200, 300, 400, 500, 612];
    
    console.log('Testing if missing chapters exist...');
    
    for (const chapterNum of testChapters) {
      try {
        // Try different URL patterns for the missing chapters
        const urls = [
          `${baseUrl}/chapter-${chapterNum}`,
          `${baseUrl}/chapter-${chapterNum}-`,
          `${baseUrl}/chapter-${chapterNum}-chapter-${chapterNum}`,
          `${baseUrl}/chapter-${chapterNum}-untitled`
        ];
        
        for (const url of urls) {
          try {
            console.log(`\nTesting: ${url}`);
            const { data } = await fetchWithFallback(url);
            
            // Check if the page contains chapter content
            if (data.includes('chapter') && data.includes('content')) {
              console.log(`  ✅ Chapter ${chapterNum} exists at: ${url}`);
              
              // Extract title if possible
              const titleMatch = data.match(/<title[^>]*>([^<]+)<\/title>/i);
              if (titleMatch) {
                console.log(`  Title: ${titleMatch[1]}`);
              }
              break; // Found the chapter, no need to try other URLs
            } else {
              console.log(`  ❌ Chapter ${chapterNum} not found at: ${url}`);
            }
          } catch (error) {
            console.log(`  ❌ Error accessing ${url}: ${error.message}`);
          }
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`  ❌ Error testing chapter ${chapterNum}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testMissingChapters();
