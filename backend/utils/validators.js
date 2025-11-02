/**
 * Validate ticker symbol format
 * @param {string} ticker
 * @returns {boolean}
 */
function isValidTicker(ticker) {
  if (!ticker || typeof ticker !== 'string') return false;
  // Basic validation: 1-5 uppercase letters
  return /^[A-Z]{1,5}$/.test(ticker.toUpperCase());
}

/**
 * Sanitize ticker (convert to uppercase, trim)
 * @param {string} ticker
 * @returns {string}
 */
function sanitizeTicker(ticker) {
  if (!ticker) return '';
  return ticker.trim().toUpperCase();
}

module.exports = {
  isValidTicker,
  sanitizeTicker
};
