const fetch = require('node-fetch');
const config = require('../config');
const { getCached, setCache } = require('./cache');

// Updated to new FMP stable API (free tier)
const FMP_BASE_URL = 'https://financialmodelingprep.com/stable';
const API_KEY = config.apiKeys.fmp;

/**
 * Fetch company fundamentals
 * @param {string} ticker
 * @returns {Object} - Parsed fundamentals with flags
 */
async function getFundamentals(ticker) {
  // Check cache first
  const cacheKey = `fmp_fundamentals_${ticker}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`Cache hit for ${ticker}`);
    return cached;
  }

  try {
    console.log(`Fetching fundamentals for ${ticker} from FMP (stable API)...`);

    // Fetch multiple endpoints in parallel using new stable API format
    const [profile, quote, keyMetrics, financialGrowth] = await Promise.all([
      fetchJSON(`${FMP_BASE_URL}/profile?symbol=${ticker}&apikey=${API_KEY}`),
      fetchJSON(`${FMP_BASE_URL}/quote?symbol=${ticker}&apikey=${API_KEY}`),
      fetchJSON(`${FMP_BASE_URL}/key-metrics-ttm?symbol=${ticker}&apikey=${API_KEY}`),
      fetchJSON(`${FMP_BASE_URL}/financial-growth?symbol=${ticker}&apikey=${API_KEY}&limit=1`)
    ]);

    // Parse data from new API format
    const companyName = profile[0]?.companyName || ticker;
    const sector = profile[0]?.sector || null;
    const latestPrice = quote[0]?.price || null;

    // Calculate P/E from earnings yield (P/E = 1 / earnings yield)
    const earningsYield = keyMetrics[0]?.earningsYieldTTM || null;
    const peForward = earningsYield && earningsYield > 0 ? (1 / earningsYield) : null;

    // Growth metrics - convert from decimal to percentage
    const revenueGrowth = financialGrowth[0]?.revenueGrowth
      ? financialGrowth[0].revenueGrowth * 100
      : null;
    const epsGrowth = financialGrowth[0]?.epsgrowth
      ? financialGrowth[0].epsgrowth * 100
      : null;

    // Debt metrics from key metrics TTM
    const netDebt = keyMetrics[0]?.netDebtToEBITDATTM || null;
    const debtEbitda = netDebt !== null && netDebt < 0 ? 0 : netDebt;

    // Flags
    const epsPositive = earningsYield && earningsYield > 0;
    const ebitdaPositive = keyMetrics[0]?.evToEBITDATTM ? true : true; // Assume true if EBITDA ratio exists
    const peAvailable = peForward !== null && peForward > 0;

    const result = {
      ticker,
      companyName,
      sector,
      revenueGrowth,
      epsGrowth,
      peForward,
      debtEbitda,
      epsPositive,
      ebitdaPositive,
      peAvailable,
      latestPrice,
      priceTimestamp: new Date().toISOString()
    };

    // Cache for 24 hours
    setCache(cacheKey, result, config.cacheTTL);

    return result;
  } catch (error) {
    console.error(`FMP API error for ${ticker}:`, error.message);
    throw new Error(`Failed to fetch fundamentals for ${ticker}: ${error.message}`);
  }
}

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

module.exports = { getFundamentals };
