/**
 * Provider Health Tracking System
 *
 * Tracks success/failure rates for OpenBB data providers
 * and dynamically adjusts provider priority based on reliability.
 */

// In-memory health stats (could be persisted to DB in future)
const providerStats = {
  fmp: { successes: 0, failures: 0, lastSuccess: null, lastFailure: null },
  yfinance: { successes: 0, failures: 0, lastSuccess: null, lastFailure: null },
  intrinio: { successes: 0, failures: 0, lastSuccess: null, lastFailure: null },
  fred: { successes: 0, failures: 0, lastSuccess: null, lastFailure: null }
};

/**
 * Record a successful provider call
 * @param {string} provider - Provider name
 */
function recordSuccess(provider) {
  if (providerStats[provider]) {
    providerStats[provider].successes++;
    providerStats[provider].lastSuccess = new Date().toISOString();
  }
}

/**
 * Record a failed provider call
 * @param {string} provider - Provider name
 * @param {string} error - Error message
 */
function recordFailure(provider, error) {
  if (providerStats[provider]) {
    providerStats[provider].failures++;
    providerStats[provider].lastFailure = new Date().toISOString();
    providerStats[provider].lastError = error;
  }
}

/**
 * Get health score for a provider (0.0 to 1.0)
 * @param {string} provider - Provider name
 * @returns {number} Health score
 */
function getHealthScore(provider) {
  const stats = providerStats[provider];
  if (!stats) return 0.5; // Unknown provider, neutral score

  const total = stats.successes + stats.failures;
  if (total === 0) return 0.9; // Untest provider, optimistic score

  // Calculate success rate
  const successRate = stats.successes / total;

  // Penalize recent failures (last 5 minutes)
  const recentFailure = stats.lastFailure &&
    (Date.now() - new Date(stats.lastFailure).getTime() < 5 * 60 * 1000);

  return recentFailure ? successRate * 0.5 : successRate;
}

/**
 * Get providers sorted by health score (best first)
 * @param {string[]} providers - List of providers to sort
 * @returns {string[]} Sorted provider list
 */
function sortProvidersByHealth(providers) {
  return [...providers].sort((a, b) => {
    return getHealthScore(b) - getHealthScore(a);
  });
}

/**
 * Get current provider statistics
 * @returns {Object} Provider stats
 */
function getStats() {
  const stats = {};
  for (const [provider, data] of Object.entries(providerStats)) {
    const total = data.successes + data.failures;
    stats[provider] = {
      ...data,
      successRate: total > 0 ? (data.successes / total).toFixed(2) : 'N/A',
      healthScore: getHealthScore(provider).toFixed(2)
    };
  }
  return stats;
}

/**
 * Reset all provider statistics
 */
function resetStats() {
  for (const provider of Object.keys(providerStats)) {
    providerStats[provider] = {
      successes: 0,
      failures: 0,
      lastSuccess: null,
      lastFailure: null
    };
  }
}

module.exports = {
  recordSuccess,
  recordFailure,
  getHealthScore,
  sortProvidersByHealth,
  getStats,
  resetStats
};
