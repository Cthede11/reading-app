const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');

// User agents for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

// Request delay configuration
const DELAYS = {
  min: 1000,  // 1 second
  max: 3000,  // 3 seconds
  exponential: true
};

// Circuit breaker configuration
const CIRCUIT_BREAKER = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  monitoringPeriod: 300000 // 5 minutes
};

class RobustHttpClient {
  constructor() {
    this.circuitBreakers = new Map();
    this.requestCounts = new Map();
    this.lastRequestTimes = new Map();
  }

  // Get random user agent
  getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  // Get random delay
  getRandomDelay() {
    const { min, max } = DELAYS;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Check if circuit breaker is open
  isCircuitOpen(domain) {
    const breaker = this.circuitBreakers.get(domain);
    if (!breaker) return false;

    const now = Date.now();
    if (now - breaker.lastFailureTime > CIRCUIT_BREAKER.resetTimeout) {
      // Reset circuit breaker
      this.circuitBreakers.delete(domain);
      return false;
    }

    return breaker.failureCount >= CIRCUIT_BREAKER.failureThreshold;
  }

  // Record circuit breaker failure
  recordFailure(domain) {
    const breaker = this.circuitBreakers.get(domain) || {
      failureCount: 0,
      lastFailureTime: 0
    };

    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();
    this.circuitBreakers.set(domain, breaker);
  }

  // Record circuit breaker success
  recordSuccess(domain) {
    this.circuitBreakers.delete(domain);
  }

  // Rate limiting check
  shouldDelay(domain) {
    const now = Date.now();
    const lastRequest = this.lastRequestTimes.get(domain) || 0;
    const delay = this.getRandomDelay();
    
    if (now - lastRequest < delay) {
      return delay - (now - lastRequest);
    }
    
    return 0;
  }

  // Create axios instance with robust configuration
  createAxiosInstance(url, options = {}) {
    const domain = new URL(url).hostname;
    
    // Check circuit breaker
    if (this.isCircuitOpen(domain)) {
      throw new Error(`Circuit breaker open for ${domain}. Too many failures.`);
    }

    // Rate limiting
    const delay = this.shouldDelay(domain);
    if (delay > 0) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            resolve(this.createAxiosInstance(url, options));
          } catch (error) {
            reject(error);
          }
        }, delay);
      });
    }

    // Update last request time
    this.lastRequestTimes.set(domain, Date.now());

    const config = {
      timeout: 30000, // 30 seconds
      maxRedirects: 5,
      headers: {
        'User-Agent': this.getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      ...options
    };

    // Add proxy if available
    if (process.env.PROXY_URL) {
      const proxyAgent = process.env.PROXY_URL.startsWith('https') 
        ? new HttpsProxyAgent(process.env.PROXY_URL)
        : new HttpProxyAgent(process.env.PROXY_URL);
      config.httpsAgent = proxyAgent;
      config.httpAgent = proxyAgent;
    }

    return axios.create(config);
  }

  // Robust fetch with retry logic
  async fetchWithRetry(url, options = {}, maxRetries = 3) {
    const domain = new URL(url).hostname;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[RobustHttpClient] Attempt ${attempt}/${maxRetries} for ${url}`);
        
        const axiosInstance = await this.createAxiosInstance(url, options);
        const response = await axiosInstance.get(url);
        
        // Record success
        this.recordSuccess(domain);
        
        console.log(`[RobustHttpClient] Success on attempt ${attempt} for ${url}`);
        return response;
        
      } catch (error) {
        lastError = error;
        console.warn(`[RobustHttpClient] Attempt ${attempt} failed for ${url}:`, error.message);
        
        // Record failure
        this.recordFailure(domain);
        
        // Don't retry on certain errors
        if (error.response?.status === 404 || error.response?.status === 403) {
          throw error;
        }
        
        // Exponential backoff
        if (attempt < maxRetries) {
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`[RobustHttpClient] Waiting ${backoffDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }
    
    throw lastError;
  }

  // Fetch with fallback URLs
  async fetchWithFallbacks(primaryUrl, fallbackUrls = [], options = {}) {
    const allUrls = [primaryUrl, ...fallbackUrls];
    
    for (const url of allUrls) {
      try {
        console.log(`[RobustHttpClient] Trying ${url}`);
        const response = await this.fetchWithRetry(url, options);
        return response;
      } catch (error) {
        console.warn(`[RobustHttpClient] Failed to fetch ${url}:`, error.message);
        if (url === allUrls[allUrls.length - 1]) {
          throw error; // Last URL failed
        }
      }
    }
  }

  // Get circuit breaker status
  getCircuitBreakerStatus() {
    const status = {};
    for (const [domain, breaker] of this.circuitBreakers.entries()) {
      status[domain] = {
        failureCount: breaker.failureCount,
        lastFailureTime: breaker.lastFailureTime,
        isOpen: breaker.failureCount >= CIRCUIT_BREAKER.failureThreshold
      };
    }
    return status;
  }

  // Reset circuit breaker for a domain
  resetCircuitBreaker(domain) {
    this.circuitBreakers.delete(domain);
    console.log(`[RobustHttpClient] Circuit breaker reset for ${domain}`);
  }

  // Reset all circuit breakers
  resetAllCircuitBreakers() {
    this.circuitBreakers.clear();
    console.log('[RobustHttpClient] All circuit breakers reset');
  }
}

// Create singleton instance
const robustHttpClient = new RobustHttpClient();

module.exports = {
  RobustHttpClient,
  robustHttpClient
};
