const openbb = require('./openbb');
const config = require('../config');
const { getCached, setCache } = require('./cache');
const providerHealth = require('../utils/providerHealth');

/**
 * ⚠️ MIGRATED TO OPENBB PLATFORM
 *
 * This module now uses OpenBB Platform for unified API access with provider redundancy.
 * - Primary: FMP (via OpenBB)
 * - Fallback: yfinance, intrinio
 * - Cache layer: PRESERVED (24-hour TTL)
 * - Health tracking: Automatically prioritizes reliable providers
 *
 * OpenBB Platform normalizes percentage fields to decimals (0.08 = 8%)
 */

/**
 * Fetch company fundamentals via OpenBB with provider fallback
 * @param {string} ticker
 * @returns {Object} - Parsed fundamentals with flags
 */
async function getFundamentals(ticker) {
  // ✅ PRESERVED: Check cache first
  const cacheKey = `fundamentals_${ticker}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`✅ Cache hit for ${ticker}`);
    return cached;
  }

  console.log(`🔄 Fetching ${ticker} via OpenBB...`);

  // ✅ NEW: Dynamic provider ordering based on health scores
  const baseProviders = ['yfinance', 'fmp', 'intrinio'];
  const providers = providerHealth.sortProvidersByHealth(baseProviders);

  console.log(`📊 Provider priority: ${providers.join(' → ')}`);

  for (const provider of providers) {
    try {
      const data = await openbb.getFundamentals(ticker, provider);

      // Normalize data to match existing schema
      const result = normalizeFundamentals(data, ticker);

      // ✅ NEW: Record successful fetch
      providerHealth.recordSuccess(provider);

      // ✅ PRESERVED: Cache for 24 hours
      setCache(cacheKey, result, config.cacheTTL);

      console.log(`✅ ${ticker} fetched successfully from ${provider}`);
      return result;

    } catch (error) {
      // ✅ NEW: Record failure with error details
      providerHealth.recordFailure(provider, error.message);

      console.warn(`⚠️ ${provider} failed for ${ticker}: ${error.message}`);
      // Try next provider
    }
  }

  throw new Error(`Failed to fetch ${ticker} from all providers (${providers.join(', ')})`);
}

/**
 * ⚠️ IMPORTANT: OpenBB Platform Data Normalization
 *
 * OpenBB Platform v4.5.0+ normalizes ALL providers to return
 * growth metrics as decimals (0.08 = 8% growth), regardless of source.
 *
 * The format detection code below is defensive programming for edge cases.
 */
function normalizeFundamentals(openbbData, ticker) {
  /**
   * Detect if growth rates are decimals or percentages
   * Heuristic: If value is between -1.5 and 1.5, it's likely a decimal (e.g., 0.08 = 8%)
   * If > 1.5, it's already a percentage (e.g., 8.0 = 8%)
   */
  const isDecimalFormat = (value) => {
    return value !== null && value !== undefined && Math.abs(value) < 1.5;
  };

  // Convert decimals to percentages for compatibility with existing classification system
  const convertToPercentage = (value) => {
    if (value === null || value === undefined) return null;
    return isDecimalFormat(value) ? value * 100 : value;
  };

  // Handle negative debt (net cash position)
  const debtEbitda = openbbData.debt_to_ebitda !== null && openbbData.debt_to_ebitda < 0
    ? 0
    : openbbData.debt_to_ebitda;

  // Transform OpenBB data format to match existing schema
  return {
    ticker,
    companyName: openbbData.company_name || ticker,
    sector: openbbData.sector,
    // ✅ Smart conversion: only multiply by 100 if format is decimal
    revenueGrowth: convertToPercentage(openbbData.revenue_growth),
    epsGrowth: convertToPercentage(openbbData.eps_growth),
    peForward: openbbData.pe_forward,
    debtEbitda: debtEbitda,
    // Flags for classification
    epsPositive: openbbData.eps !== null && openbbData.eps > 0,
    ebitdaPositive: openbbData.ebitda !== null && openbbData.ebitda > 0,
    peAvailable: openbbData.pe_forward !== null && openbbData.pe_forward > 0,
    latestPrice: openbbData.price,
    priceTimestamp: openbbData.timestamp || new Date().toISOString()
  };
}

module.exports = { getFundamentals };
