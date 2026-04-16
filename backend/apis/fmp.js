const openbb = require('./openbb');
const config = require('../config');
const { getCached, setCache } = require('./cache');
const providerHealth = require('../utils/providerHealth');

function parseProviders(primaryProvider, fallbackProviders) {
  const normalized = [primaryProvider, ...fallbackProviders]
    .flat()
    .filter(Boolean)
    .map(provider => provider.trim().toLowerCase())
    .filter(Boolean);

  return normalized.filter((provider, index) => normalized.indexOf(provider) === index);
}

function getConfiguredProviders(primaryEnvKey, fallbackEnvKey, defaultPrimary = 'fmp') {
  const primary = process.env[primaryEnvKey] || defaultPrimary;
  const fallbacks = (process.env[fallbackEnvKey] || 'yfinance,intrinio')
    .split(',')
    .map(provider => provider.trim())
    .filter(Boolean);

  return providerHealth.sortProvidersByHealth(parseProviders(primary, fallbacks));
}

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
 * Fetch company fundamentals + price via OpenBB with provider fallback
 *
 * ⚠️ IMPORTANT: Calls TWO separate OpenBB endpoints:
 * 1. obb.equity.fundamental.metrics() - For fundamentals (P/E, revenue growth, etc.)
 * 2. obb.equity.price.quote() - For current stock price
 *
 * This is the correct OpenBB Platform pattern as fundamentals do NOT include price.
 *
 * @param {string} ticker
 * @returns {Object} - Parsed fundamentals with price and flags
 */
async function getFundamentals(ticker) {
  // ✅ PRESERVED: Check cache first
  const cacheKey = `fundamentals_${ticker}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`✅ Cache hit for ${ticker}`);
    return cached;
  }

  console.log(`🔄 Fetching ${ticker} via OpenBB (fundamentals + price)...`);

  let fundamentalsData = null;
  let quoteData = null;
  const errors = {};

  // STEP 1: Fetch fundamentals with provider fallback
  const fundamentalsProviders = getConfiguredProviders(
    'PRIMARY_FUNDAMENTALS_PROVIDER',
    'FALLBACK_PROVIDERS'
  );
  for (const provider of fundamentalsProviders) {
    try {
      fundamentalsData = await openbb.getFundamentals(ticker, provider);
      providerHealth.recordSuccess(provider);
      console.log(`✅ Fundamentals fetched from ${provider}`);
      break; // Success, exit loop
    } catch (error) {
      providerHealth.recordFailure(provider, error.message);
      errors[`fundamentals_${provider}`] = error.message;
      console.warn(`⚠️ ${provider} failed for fundamentals: ${error.message}`);
    }
  }

  // Check if we got fundamentals (required for classification)
  if (!fundamentalsData) {
    throw new Error(`Failed to fetch fundamentals for ${ticker} from all providers (${fundamentalsProviders.join(', ')}). Errors: ${JSON.stringify(errors)}`);
  }

  // STEP 2: Fetch price with provider fallback (ALWAYS attempt, even if fundamentals succeeded)
  const priceProviders = getConfiguredProviders(
    'PRIMARY_QUOTE_PROVIDER',
    'FALLBACK_QUOTE_PROVIDERS',
    fundamentalsProviders[0] || 'fmp'
  );
  for (const provider of priceProviders) {
    try {
      quoteData = await openbb.getQuote(ticker, provider);
      providerHealth.recordSuccess(provider);
      console.log(`✅ Price fetched from ${provider}: $${quoteData.price}`);
      break; // Success, exit loop
    } catch (error) {
      providerHealth.recordFailure(provider, error.message);
      errors[`quote_${provider}`] = error.message;
      console.warn(`⚠️ ${provider} failed for quote: ${error.message}`);
    }
  }

  // Warn if price is missing (but allow the operation to continue)
  if (!quoteData || !quoteData.price) {
    console.warn(`⚠️ Price unavailable for ${ticker} - stock will have null price`);
  }

  // STEP 3: Fetch sector from profile if missing from fundamentals
  if (!fundamentalsData.sector) {
    console.log(`🔄 Fetching sector for ${ticker} from profile...`);
    const profileProviders = getConfiguredProviders(
      'PRIMARY_PROFILE_PROVIDER',
      'FALLBACK_PROFILE_PROVIDERS',
      priceProviders[0] || fundamentalsProviders[0] || 'fmp'
    );

    for (const provider of profileProviders) {
      try {
        const profileData = await openbb.getProfile(ticker, provider);
        providerHealth.recordSuccess(provider);

        if (profileData && profileData.sector) {
          fundamentalsData.sector = profileData.sector;
          console.log(`✅ Sector fetched from ${provider}: ${profileData.sector}`);
          break;
        }
      } catch (error) {
        providerHealth.recordFailure(provider, error.message);
        errors[`profile_${provider}`] = error.message;
        console.warn(`⚠️ ${provider} failed for profile: ${error.message}`);
      }
    }
  }

  // Merge fundamentals and quote data
  const result = normalizeFundamentals(fundamentalsData, quoteData, ticker);

  // ✅ PRESERVED: Cache for 24 hours
  setCache(cacheKey, result, config.cacheTTL);

  console.log(`✅ ${ticker} complete (fundamentals ${fundamentalsData ? '✓' : '✗'}, price ${quoteData?.price ? '✓' : '✗'})`);
  return result;
}

/**
 * ⚠️ IMPORTANT: OpenBB Platform Data Normalization
 *
 * OpenBB Platform v4.5.0+ normalizes ALL providers to return
 * growth metrics as decimals (0.08 = 8% growth), regardless of source.
 *
 * The format detection code below is defensive programming for edge cases.
 *
 * @param {Object} openbbData - Fundamentals from obb.equity.fundamental.metrics()
 * @param {Object} quoteData - Price data from obb.equity.price.quote()
 * @param {string} ticker - Stock symbol
 * @returns {Object} - Normalized data matching existing schema
 */
function normalizeFundamentals(openbbData, quoteData, ticker) {
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
    // ✅ NEW: Pass raw eps and ebitda values for classification
    eps: openbbData.eps,
    ebitda: openbbData.ebitda,
    // Flags for classification
    epsPositive: openbbData.eps !== null && openbbData.eps > 0,
    ebitdaPositive: openbbData.ebitda !== null && openbbData.ebitda > 0,
    peAvailable: openbbData.pe_forward !== null && openbbData.pe_forward > 0,
    // ✅ CRITICAL FIX: Price comes from separate quote endpoint, not fundamentals
    latestPrice: quoteData?.price || null,
    priceTimestamp: quoteData?.timestamp || new Date().toISOString()
  };
}

module.exports = { getFundamentals };
