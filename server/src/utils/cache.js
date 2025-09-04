// Simple in-memory cache with TTL support

class Cache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
  }

  set(key, value, ttlMs = 600000) { // Default 10 minutes
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, value);
    this.ttl.set(key, expiresAt);
  }

  get(key) {
    const expiresAt = this.ttl.get(key);
    if (!expiresAt || Date.now() > expiresAt) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
  }

  clear() {
    this.cache.clear();
    this.ttl.clear();
  }

  size() {
    return this.cache.size;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, expiresAt] of this.ttl.entries()) {
      if (expiresAt <= now) {
        this.cache.delete(key);
        this.ttl.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create cache instances
const searchCache = new Cache();
const detailsCache = new Cache();
const chapterCache = new Cache();

// Cleanup interval
setInterval(() => {
  searchCache.cleanup();
  detailsCache.cleanup();
  chapterCache.cleanup();
}, 5 * 60 * 1000); // Clean up every 5 minutes

module.exports = {
  Cache,
  searchCache,
  detailsCache,
  chapterCache
};
