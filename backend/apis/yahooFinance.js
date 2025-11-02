const fetch = require('node-fetch');
const { getCached, setCache } = require('./cache');
const config = require('../config');

/**
 * Yahoo Finance API - Free alternative to FMP
 * Fetches basic stock data without API key requirements
 */

/**
 * Fetch comprehensive stock data from Yahoo Finance
 * @param {string} ticker
 * @returns {Object} - Parsed fundamentals
 */
async function getFundamentals(ticker) {
  // Check cache first
  const cacheKey = `yahoo_fundamentals_${ticker}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`Cache hit for ${ticker}`);
    return cached;
  }

  try {
    console.log(`Fetching data for ${ticker} from Yahoo Finance...`);

    // Fetch quote and stats data
    const [quoteData, statsData] = await Promise.all([
      fetchQuoteData(ticker),
      fetchStatsData(ticker)
    ]);

    // Parse the data
    const result = {
      ticker,
      companyName: quoteData.longName || quoteData.shortName || ticker,
      sector: quoteData.sector || 'Unknown',
      latestPrice: quoteData.regularMarketPrice || quoteData.currentPrice || null,
      priceTimestamp: new Date().toISOString(),

      // Fundamental metrics
      revenueGrowth: statsData.revenueGrowth || null,
      epsGrowth: statsData.earningsGrowth || null,
      peForward: quoteData.forwardPE || statsData.forwardPE || null,
      debtEbitda: statsData.debtToEquity ? statsData.debtToEquity / 100 : null,

      // Flags
      epsPositive: (quoteData.epsForward || 0) > 0,
      ebitdaPositive: true,
      peAvailable: (quoteData.forwardPE || statsData.forwardPE) !== null
    };

    // Cache for 24 hours
    setCache(cacheKey, result, config.cacheTTL);

    return result;
  } catch (error) {
    console.error(`Yahoo Finance error for ${ticker}:`, error.message);
    throw new Error(`Failed to fetch data for ${ticker}: ${error.message}`);
  }
}

/**
 * Fetch quote data from Yahoo Finance
 */
async function fetchQuoteData(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const result = data.chart.result[0];
    const meta = result.meta;

    return {
      regularMarketPrice: meta.regularMarketPrice,
      currentPrice: meta.regularMarketPrice,
      longName: meta.longName,
      shortName: meta.shortName,
      symbol: meta.symbol
    };
  } catch (error) {
    console.error(`Error fetching quote for ${ticker}:`, error.message);
    return {};
  }
}

/**
 * Fetch statistics/fundamentals from Yahoo Finance
 */
async function fetchStatsData(ticker) {
  // Yahoo Finance doesn't have a free API for detailed fundamentals
  // For a hobby project, we'll use the quoteSummary endpoint
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=defaultKeyStatistics,financialData,summaryProfile`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const quoteSummary = data.quoteSummary.result[0];

    const financialData = quoteSummary.financialData || {};
    const keyStats = quoteSummary.defaultKeyStatistics || {};
    const profile = quoteSummary.summaryProfile || {};

    // Extract metrics with fallbacks
    const revenueGrowth = financialData.revenueGrowth?.raw
      ? financialData.revenueGrowth.raw * 100
      : null;

    const earningsGrowth = financialData.earningsGrowth?.raw
      ? financialData.earningsGrowth.raw * 100
      : null;

    const forwardPE = keyStats.forwardPE?.raw || financialData.currentPrice?.raw / (keyStats.forwardEps?.raw || 1);

    const debtToEquity = keyStats.debtToEquity?.raw || null;

    return {
      revenueGrowth,
      earningsGrowth,
      forwardPE,
      debtToEquity,
      sector: profile.sector || 'Unknown'
    };
  } catch (error) {
    console.error(`Error fetching stats for ${ticker}:`, error.message);
    // Return null values if stats aren't available
    return {
      revenueGrowth: null,
      earningsGrowth: null,
      forwardPE: null,
      debtToEquity: null
    };
  }
}

module.exports = { getFundamentals };
