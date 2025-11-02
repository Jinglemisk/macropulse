const db = require('../database');

/**
 * Get cached API response
 * @param {string} key
 * @returns {Object|null}
 */
function getCached(key) {
  const now = new Date().toISOString();

  const result = db.prepare(`
    SELECT response_data FROM api_cache
    WHERE cache_key = ? AND expires_at > ?
  `).get(key, now);

  if (result) {
    return JSON.parse(result.response_data);
  }
  return null;
}

/**
 * Store API response in cache
 * @param {string} key
 * @param {Object} data
 * @param {number} ttlMs - Time to live in milliseconds
 */
function setCache(key, data, ttlMs) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs).toISOString();

  db.prepare(`
    INSERT OR REPLACE INTO api_cache (cache_key, response_data, cached_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(key, JSON.stringify(data), now.toISOString(), expiresAt);
}

/**
 * Clear expired cache entries
 */
function clearExpiredCache() {
  const now = new Date().toISOString();
  const result = db.prepare(`
    DELETE FROM api_cache WHERE expires_at < ?
  `).run(now);

  console.log(`Cleared ${result.changes} expired cache entries`);
}

module.exports = { getCached, setCache, clearExpiredCache };
