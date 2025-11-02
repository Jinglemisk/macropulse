const fetch = require('node-fetch');

/**
 * Fallback API if FMP fails
 * Uses Yahoo Finance API
 */
async function getQuote(ticker) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error(`Yahoo HTTP ${response.status}`);

    const data = await response.json();
    const quote = data.chart.result[0].meta;

    return {
      ticker,
      latestPrice: quote.regularMarketPrice,
      priceTimestamp: new Date(quote.regularMarketTime * 1000).toISOString()
    };
  } catch (error) {
    console.error(`Yahoo Finance error for ${ticker}:`, error.message);
    return null;
  }
}

module.exports = { getQuote };
