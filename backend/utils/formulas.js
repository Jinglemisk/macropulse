/**
 * Triangular closeness function
 * Measures how close a value is to a target, with linear falloff
 *
 * @param {number} x - Actual value
 * @param {number} center - Ideal target value
 * @param {number} halfwidth - Distance from center where score reaches 0
 * @returns {number|null} Score from 0.0 to 1.0, or null if data is missing
 */
function tri(x, center, halfwidth) {
  if (x === null || x === undefined || isNaN(x)) {
    return null;
  }
  return Math.max(0, 1 - Math.abs(x - center) / halfwidth);
}

module.exports = { tri };
