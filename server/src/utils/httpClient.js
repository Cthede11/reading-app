const axios = require('axios');
const { getRandomUserAgent, sleep } = require('./helpers');

// Enhanced fetch with Jina fallback
async function fetchWithFallback(url, retries = 3, enableJinaProxy = true) {
  const headers = {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };

  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[HTTP] Attempt ${i + 1}/${retries} for ${url}`);
      
      const response = await axios.get(url, { 
        headers, 
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });
      
      if (response.status === 200) {
        console.log(`[HTTP] Success: ${response.status} (${response.data.length} bytes)`);
        return { data: response.data, viaJina: false, status: response.status };
      }
      
      if ((response.status === 403 || response.status === 429) && enableJinaProxy) {
        console.log(`[HTTP] Got ${response.status}, trying Jina proxy...`);
        
        try {
          const jinaUrl = `https://r.jina.ai/${url}`;
          const jinaResponse = await axios.get(jinaUrl, {
            headers: { 
              ...headers, 
              'X-Return-Format': 'html',
              'X-No-Cache': 'true'
            },
            timeout: 20000
          });
          
          if (jinaResponse.status === 200) {
            console.log(`[HTTP] Jina proxy success: ${jinaResponse.status} (${jinaResponse.data.length} bytes)`);
            return { data: jinaResponse.data, viaJina: true, status: jinaResponse.status };
          }
        } catch (jinaError) {
          console.warn(`[HTTP] Jina proxy failed:`, jinaError.message);
        }
      }
      
      console.warn(`[HTTP] Attempt ${i + 1} failed with status: ${response.status}`);
      
    } catch (error) {
      console.warn(`[HTTP] Attempt ${i + 1} failed:`, error.message);
      
      if (i === retries - 1) {
        throw new Error(`Failed to fetch ${url} after ${retries} attempts: ${error.message}`);
      }
    }
    
    // Wait before retry
    if (i < retries - 1) {
      const delay = 1000 * (i + 1); // Exponential backoff
      console.log(`[HTTP] Waiting ${delay}ms before retry...`);
      await sleep(delay);
    }
  }
  
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

// Simple fetch without fallback
async function simpleFetch(url, headers = {}) {
  const defaultHeaders = {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  };
  
  try {
    const response = await axios.get(url, {
      headers: { ...defaultHeaders, ...headers },
      timeout: 10000,
      maxRedirects: 3
    });
    
    return { data: response.data, status: response.status };
  } catch (error) {
    throw new Error(`Failed to fetch ${url}: ${error.message}`);
  }
}

module.exports = {
  fetchWithFallback,
  simpleFetch
};
