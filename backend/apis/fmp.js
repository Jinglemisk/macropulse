const openbb = require('./openbb');
const yahooFinance = require('./yahooFinance');
const yahoo = require('./yahoo');
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

function isPresent(value) {
  return value !== null && value !== undefined;
}

function isDecimalFormat(value) {
  return value !== null && value !== undefined && Math.abs(value) < 1.5;
}

function convertToPercentage(value) {
  if (!isPresent(value)) return null;
  return isDecimalFormat(value) ? value * 100 : value;
}

function normalizeOpenbbFundamentals(openbbData, ticker) {
  const debtEbitda = openbbData.debt_to_ebitda !== null && openbbData.debt_to_ebitda < 0
    ? 0
    : openbbData.debt_to_ebitda;

  return {
    ticker,
    companyName: openbbData.company_name || ticker,
    sector: openbbData.sector || null,
    revenueGrowth: convertToPercentage(openbbData.revenue_growth),
    epsGrowth: convertToPercentage(openbbData.eps_growth),
    peForward: openbbData.pe_forward,
    debtEbitda,
    eps: openbbData.eps,
    ebitda: openbbData.ebitda,
    epsPositive: openbbData.eps !== null && openbbData.eps > 0,
    ebitdaPositive: openbbData.ebitda !== null && openbbData.ebitda > 0,
    peAvailable: openbbData.pe_forward !== null && openbbData.pe_forward > 0
  };
}

function mergeFundamentals(details, quote, ticker) {
  return {
    ticker,
    companyName: details.companyName || ticker,
    sector: details.sector || null,
    revenueGrowth: details.revenueGrowth ?? null,
    epsGrowth: details.epsGrowth ?? null,
    peForward: details.peForward ?? null,
    debtEbitda: details.debtEbitda ?? null,
    eps: details.eps ?? null,
    ebitda: details.ebitda ?? null,
    epsPositive: details.epsPositive ?? null,
    ebitdaPositive: details.ebitdaPositive ?? null,
    peAvailable: details.peAvailable ?? null,
    latestPrice: quote?.latestPrice ?? details.latestPrice ?? null,
    priceTimestamp: quote?.priceTimestamp ?? details.priceTimestamp ?? new Date().toISOString(),
    detailSource: details.source || null,
    quoteSource: quote?.source || null
  };
}

async function fillSectorIfMissing(ticker, details, providerSeed = 'fmp', errors = {}) {
  if (details.sector) {
    return details;
  }

  const profileProviders = getConfiguredProviders(
    'PRIMARY_PROFILE_PROVIDER',
    'FALLBACK_PROFILE_PROVIDERS',
    providerSeed
  );

  for (const provider of profileProviders) {
    try {
      const profileData = await openbb.getProfile(ticker, provider);
      providerHealth.recordSuccess(provider);
      if (profileData && profileData.sector) {
        return {
          ...details,
          sector: profileData.sector
        };
      }
    } catch (error) {
      providerHealth.recordFailure(provider, error.message);
      errors[`profile_${provider}`] = error.message;
      console.warn(`⚠️ ${provider} failed for profile: ${error.message}`);
    }
  }

  return details;
}

async function getStockDetails(ticker, options = {}) {
  const cacheKey = `stock_details_${ticker}`;
  const cached = options.forceRefresh ? null : getCached(cacheKey);
  if (cached) {
    return cached;
  }

  console.log(`🔄 Fetching stock details for ${ticker}...`);

  let details = null;
  let winningProvider = null;
  const errors = {};

  const fundamentalsProviders = getConfiguredProviders(
    'PRIMARY_FUNDAMENTALS_PROVIDER',
    'FALLBACK_PROVIDERS'
  );

  for (const provider of fundamentalsProviders) {
    try {
      const fundamentalsData = await openbb.getFundamentals(ticker, provider);
      providerHealth.recordSuccess(provider);
      details = normalizeOpenbbFundamentals(fundamentalsData, ticker);
      winningProvider = provider;
      console.log(`✅ Details fetched from ${provider}`);
      break;
    } catch (error) {
      providerHealth.recordFailure(provider, error.message);
      errors[`fundamentals_${provider}`] = error.message;
      console.warn(`⚠️ ${provider} failed for fundamentals: ${error.message}`);
    }
  }

  if (!details) {
    try {
      const yahooDetails = await yahooFinance.getFundamentals(ticker);
      providerHealth.recordSuccess('yahoo');
      details = {
        ...yahooDetails,
        source: 'yahoo'
      };
      winningProvider = 'yahoo';
      console.log('✅ Details fetched from direct Yahoo fallback');
    } catch (error) {
      providerHealth.recordFailure('yahoo', error.message);
      errors.fundamentals_yahoo = error.message;
      console.warn(`⚠️ direct Yahoo failed for fundamentals: ${error.message}`);
    }
  }

  if (!details) {
    throw new Error(
      `Failed to fetch stock details for ${ticker} from all providers. Errors: ${JSON.stringify(errors)}`
    );
  }

  const withSector = await fillSectorIfMissing(ticker, details, winningProvider || 'fmp', errors);
  const result = {
    ...withSector,
    source: withSector.source || winningProvider || 'unknown'
  };

  setCache(cacheKey, result, config.cacheTTL);
  return result;
}

async function getStockQuote(ticker, options = {}) {
  const cacheKey = `stock_quote_${ticker}`;
  const cached = options.forceRefresh ? null : getCached(cacheKey);
  if (cached) {
    return cached;
  }

  console.log(`🔄 Fetching quote for ${ticker}...`);

  const errors = {};
  const quoteProviders = getConfiguredProviders(
    'PRIMARY_QUOTE_PROVIDER',
    'FALLBACK_QUOTE_PROVIDERS',
    process.env.PRIMARY_FUNDAMENTALS_PROVIDER || 'fmp'
  );

  for (const provider of quoteProviders) {
    try {
      const quoteData = await openbb.getQuote(ticker, provider);
      providerHealth.recordSuccess(provider);

      if (!isPresent(quoteData?.price)) {
        throw new Error('Provider returned no price');
      }

      const result = {
        ticker,
        latestPrice: quoteData.price,
        priceTimestamp: quoteData.timestamp || new Date().toISOString(),
        source: provider
      };

      setCache(cacheKey, result, config.cacheTTL);
      return result;
    } catch (error) {
      providerHealth.recordFailure(provider, error.message);
      errors[`quote_${provider}`] = error.message;
      console.warn(`⚠️ ${provider} failed for quote: ${error.message}`);
    }
  }

  try {
    const yahooQuote = await yahoo.getQuote(ticker);
    if (!yahooQuote || !isPresent(yahooQuote.latestPrice)) {
      throw new Error('Yahoo returned no price');
    }

    providerHealth.recordSuccess('yahoo');
    const result = {
      ...yahooQuote,
      source: 'yahoo'
    };
    setCache(cacheKey, result, config.cacheTTL);
    return result;
  } catch (error) {
    providerHealth.recordFailure('yahoo', error.message);
    errors.quote_yahoo = error.message;
  }

  throw new Error(
    `Failed to fetch quote for ${ticker} from all providers. Errors: ${JSON.stringify(errors)}`
  );
}

async function getFundamentals(ticker, options = {}) {
  const details = await getStockDetails(ticker, options);

  let quote = null;
  try {
    quote = await getStockQuote(ticker, options);
  } catch (error) {
    console.warn(`⚠️ Quote unavailable for ${ticker}: ${error.message}`);
  }

  return mergeFundamentals(details, quote, ticker);
}

module.exports = {
  getFundamentals,
  getStockDetails,
  getStockQuote
};
