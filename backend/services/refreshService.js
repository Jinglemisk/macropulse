const db = require('../database');
const { MACRO_SERIES, updateMacroData } = require('../apis/fred');
const { getStockQuote, getStockDetails } = require('../apis/fmp');
const { clearExpiredCache } = require('../apis/cache');
const { classifyStock } = require('./classifier');

const DETAIL_FIELDS = ['revenueGrowth', 'epsGrowth', 'peForward', 'debtEbitda'];
const DETAIL_GROWTH_FIELDS = ['revenueGrowth', 'epsGrowth'];
const DETAIL_QUALITY_FIELDS = ['peForward', 'debtEbitda'];

function toIsoNow() {
  return new Date().toISOString();
}

function serializeJson(value) {
  return JSON.stringify(value ?? []);
}

function parseJsonArray(value) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value) {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function upsertByKey(table, keyColumn, keyValue, fields) {
  const payload = {
    ...fields,
    updated_at: toIsoNow()
  };
  const columns = [keyColumn, ...Object.keys(payload)];
  const placeholders = columns.map(() => '?').join(', ');
  const updates = Object.keys(payload)
    .map(column => `${column} = excluded.${column}`)
    .join(', ');

  db.prepare(`
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT(${keyColumn}) DO UPDATE SET ${updates}
  `).run(keyValue, ...Object.values(payload));
}

function ensureStockRefreshStatus(ticker) {
  db.prepare(`
    INSERT OR IGNORE INTO stock_refresh_status (
      ticker,
      last_quote_refresh_status,
      last_detail_refresh_status,
      classification_status,
      classification_eligible,
      detail_is_partial,
      updated_at
    )
    VALUES (?, 'never', 'never', 'never', 0, 0, ?)
  `).run(ticker, toIsoNow());
}

function updateStockIdentity(ticker, details) {
  const stock = db.prepare(`
    SELECT company_name, sector
    FROM stocks
    WHERE ticker = ?
  `).get(ticker);

  if (!stock) {
    return;
  }

  const companyName = details.companyName || stock.company_name || ticker;
  const sector = details.sector || stock.sector || null;

  db.prepare(`
    UPDATE stocks
    SET company_name = ?, sector = ?
    WHERE ticker = ?
  `).run(companyName, sector, ticker);
}

function touchStock(ticker) {
  db.prepare('UPDATE stocks SET last_updated = ? WHERE ticker = ?').run(toIsoNow(), ticker);
}

function upsertQuoteData(ticker, quote) {
  db.prepare(`
    INSERT INTO fundamentals (
      ticker, latest_price, price_timestamp, fetch_date
    )
    VALUES (?, ?, ?, ?)
    ON CONFLICT(ticker) DO UPDATE SET
      latest_price = excluded.latest_price,
      price_timestamp = excluded.price_timestamp,
      fetch_date = excluded.fetch_date
  `).run(
    ticker,
    quote.latestPrice,
    quote.priceTimestamp,
    toIsoNow()
  );
}

function upsertDetailData(ticker, details) {
  db.prepare(`
    INSERT INTO fundamentals (
      ticker, revenue_growth, eps_growth, pe_forward, debt_ebitda,
      eps_positive, ebitda_positive, pe_available, fetch_date
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(ticker) DO UPDATE SET
      revenue_growth = excluded.revenue_growth,
      eps_growth = excluded.eps_growth,
      pe_forward = excluded.pe_forward,
      debt_ebitda = excluded.debt_ebitda,
      eps_positive = excluded.eps_positive,
      ebitda_positive = excluded.ebitda_positive,
      pe_available = excluded.pe_available,
      fetch_date = excluded.fetch_date
  `).run(
    ticker,
    details.revenueGrowth ?? null,
    details.epsGrowth ?? null,
    details.peForward ?? null,
    details.debtEbitda ?? null,
    details.epsPositive === null || details.epsPositive === undefined ? null : details.epsPositive ? 1 : 0,
    details.ebitdaPositive === null || details.ebitdaPositive === undefined ? null : details.ebitdaPositive ? 1 : 0,
    details.peAvailable === null || details.peAvailable === undefined ? null : details.peAvailable ? 1 : 0,
    toIsoNow()
  );
}

function getLatestClassification(ticker) {
  return db.prepare(`
    SELECT ticker, date, final_class, confidence
    FROM classification_history
    WHERE ticker = ?
    ORDER BY date DESC
    LIMIT 1
  `).get(ticker);
}

function storeClassification(ticker, classification) {
  const today = new Date().toISOString().split('T')[0];
  db.prepare(`
    INSERT OR REPLACE INTO classification_history (
      ticker, date, a_score, b_score, c_score, d_score, final_class, confidence
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ticker,
    today,
    classification.scores.A,
    classification.scores.B,
    classification.scores.C,
    classification.scores.D,
    classification.finalClass,
    classification.confidence
  );
}

function evaluateDetailQuality(details) {
  const presentFields = DETAIL_FIELDS.filter(field => details[field] !== null && details[field] !== undefined);
  const missingFields = DETAIL_FIELDS.filter(field => !presentFields.includes(field));
  const hasGrowthSignal = DETAIL_GROWTH_FIELDS.some(field => presentFields.includes(field));
  const hasQualitySignal = DETAIL_QUALITY_FIELDS.some(field => presentFields.includes(field));
  const negativeEarningsSignal = [details.eps, details.ebitda].some(
    value => value !== null && value !== undefined && value < 0
  );

  const classificationEligible =
    presentFields.length >= 3 ||
    (presentFields.length >= 2 && hasGrowthSignal && hasQualitySignal) ||
    (presentFields.length >= 2 && negativeEarningsSignal);

  let warning = null;
  if (missingFields.length === 0) {
    warning = null;
  } else if (classificationEligible) {
    warning = 'Detail data fetched partially from fallback providers';
  } else if (presentFields.length > 0) {
    warning = 'Detail data missing required classification fields';
  } else {
    warning = 'Detail data missing or stale';
  }

  return {
    presentFields,
    missingFields,
    isPartial: missingFields.length > 0,
    classificationEligible,
    warning
  };
}

function summarizeStockDomain(domainLabel, results) {
  const requested = results.length;
  const succeeded = results.filter(result => result.status === 'success').length;
  const warnings = results.filter(result => result.status === 'warning').length;
  const failed = results.filter(result => result.status === 'failed').length;

  let status = 'success';
  if (requested === 0) {
    status = 'success';
  } else if (succeeded === 0 && warnings === 0) {
    status = 'failed';
  } else if (warnings > 0 || failed > 0) {
    status = 'warning';
  }

  let message = `${domainLabel} refreshed successfully.`;
  if (requested === 0) {
    message = `No stocks to refresh for ${domainLabel.toLowerCase()}.`;
  } else if (status === 'failed') {
    message = `${domainLabel} refresh failed for all requested stocks.`;
  } else if (status === 'warning') {
    message = `${domainLabel} refresh completed with warnings.`;
  }

  return {
    requested,
    succeeded,
    warnings,
    failed,
    status,
    message,
    results
  };
}

function buildOverallRefreshSummary(domains) {
  const domainList = Object.values(domains);
  const successfulDomains = domainList.filter(domain => domain.status === 'success').length;
  const warningDomains = domainList.filter(domain => domain.status === 'warning').length;
  const failedDomains = domainList.filter(domain => domain.status === 'failed').length;

  let overallStatus = 'success';
  if (successfulDomains === 0 && warningDomains === 0) {
    overallStatus = 'failed';
  } else if (warningDomains > 0 || failedDomains > 0) {
    overallStatus = 'warning';
  }

  let message = 'Refresh completed successfully.';
  if (overallStatus === 'failed') {
    message = 'Refresh failed for every domain.';
  } else if (overallStatus === 'warning') {
    message = 'Refresh completed with warnings.';
  }

  return {
    success: overallStatus !== 'failed',
    status: overallStatus,
    message,
    domains
  };
}

function getTickersToRefresh(requestedTickers) {
  if (Array.isArray(requestedTickers) && requestedTickers.length > 0) {
    return requestedTickers;
  }

  return db.prepare('SELECT ticker FROM stocks ORDER BY ticker').all().map(row => row.ticker);
}

async function refreshStockQuote(ticker) {
  ensureStockRefreshStatus(ticker);
  const attemptedAt = toIsoNow();

  try {
    const quote = await getStockQuote(ticker, { forceRefresh: true });
    upsertQuoteData(ticker, quote);
    touchStock(ticker);

    upsertByKey('stock_refresh_status', 'ticker', ticker, {
      last_quote_refresh_at: attemptedAt,
      last_quote_refresh_status: 'success',
      last_quote_refresh_error: null,
      last_successful_quote_refresh_at: attemptedAt,
      data_source_quote: quote.source || null,
      quote_data_warning: null
    });

    return {
      ticker,
      status: 'success',
      source: quote.source || null,
      message: `Quote updated from ${quote.source || 'provider'}.`
    };
  } catch (error) {
    upsertByKey('stock_refresh_status', 'ticker', ticker, {
      last_quote_refresh_at: attemptedAt,
      last_quote_refresh_status: 'failed',
      last_quote_refresh_error: error.message,
      quote_data_warning: 'Price data missing or stale'
    });

    return {
      ticker,
      status: 'failed',
      message: error.message,
      error: error.message
    };
  }
}

async function refreshStockDetails(ticker) {
  ensureStockRefreshStatus(ticker);
  const attemptedAt = toIsoNow();

  try {
    const details = await getStockDetails(ticker, { forceRefresh: true });
    const quality = evaluateDetailQuality(details);
    const previousClassification = getLatestClassification(ticker);

    updateStockIdentity(ticker, details);
    upsertDetailData(ticker, details);
    touchStock(ticker);

    let status = quality.isPartial ? 'warning' : 'success';
    let message = quality.isPartial
      ? 'Detail data updated with warnings.'
      : 'Detail data updated successfully.';
    let classificationWarning = null;

    if (quality.classificationEligible) {
      const classification = classifyStock(details);
      storeClassification(ticker, classification);

      if (quality.isPartial) {
        classificationWarning = 'Classification updated from partial but sufficient detail data';
      }
    } else {
      status = 'warning';
      classificationWarning = previousClassification
        ? 'Preserved last valid classification because fresh detail data was insufficient'
        : 'Classification unavailable until more detail data is fetched';
      message = 'Detail data saved, but classification was preserved.';
    }

    upsertByKey('stock_refresh_status', 'ticker', ticker, {
      last_detail_refresh_at: attemptedAt,
      last_detail_refresh_status: status,
      last_detail_refresh_error: null,
      last_successful_detail_refresh_at: attemptedAt,
      data_source_detail: details.source || null,
      detail_data_warning: quality.warning,
      detail_is_partial: quality.isPartial ? 1 : 0,
      detail_missing_fields: serializeJson(quality.missingFields),
      classification_status: quality.classificationEligible ? 'success' : 'warning',
      classification_warning: classificationWarning,
      classification_eligible: quality.classificationEligible ? 1 : 0
    });

    return {
      ticker,
      status,
      source: details.source || null,
      message,
      missingFields: quality.missingFields,
      detailIsPartial: quality.isPartial,
      classificationEligible: quality.classificationEligible,
      classificationWarning
    };
  } catch (error) {
    const previousClassification = getLatestClassification(ticker);
    const classificationWarning = previousClassification
      ? 'Preserved last valid classification because detail refresh failed'
      : 'Classification unavailable because detail refresh failed';

    upsertByKey('stock_refresh_status', 'ticker', ticker, {
      last_detail_refresh_at: attemptedAt,
      last_detail_refresh_status: 'failed',
      last_detail_refresh_error: error.message,
      detail_data_warning: 'Detail data missing or stale',
      detail_is_partial: 0,
      detail_missing_fields: serializeJson(DETAIL_FIELDS),
      classification_status: 'warning',
      classification_warning: classificationWarning,
      classification_eligible: 0
    });

    return {
      ticker,
      status: 'failed',
      message: error.message,
      error: error.message,
      missingFields: DETAIL_FIELDS,
      classificationWarning
    };
  }
}

async function refreshQuotes(requestedTickers) {
  const tickers = getTickersToRefresh(requestedTickers);
  const results = [];

  for (const ticker of tickers) {
    results.push(await refreshStockQuote(ticker));
  }

  return summarizeStockDomain('Quotes', results);
}

async function refreshDetails(requestedTickers) {
  const tickers = getTickersToRefresh(requestedTickers);
  const results = [];

  for (const ticker of tickers) {
    results.push(await refreshStockDetails(ticker));
  }

  return summarizeStockDomain('Details', results);
}

async function refreshStocksAll(requestedTickers) {
  const quotes = await refreshQuotes(requestedTickers);
  const details = await refreshDetails(requestedTickers);

  return buildOverallRefreshSummary({
    quotes,
    details
  });
}

async function refreshMacro(days = 365) {
  const attemptedAt = toIsoNow();
  const existing = db.prepare(`
    SELECT last_successful_macro_refresh_at
    FROM macro_refresh_status
    WHERE id = 1
  `).get();

  try {
    const macroResult = await updateMacroData(days);

    upsertByKey('macro_refresh_status', 'id', 1, {
      last_macro_refresh_at: attemptedAt,
      last_macro_refresh_status: macroResult.status,
      last_macro_refresh_error: macroResult.status === 'failed' ? macroResult.message : null,
      last_successful_macro_refresh_at: macroResult.status === 'failed'
        ? existing?.last_successful_macro_refresh_at || null
        : attemptedAt,
      missing_series: serializeJson(macroResult.missingSeries),
      failed_series: serializeJson(macroResult.failedSeries),
      stale_series: serializeJson(macroResult.staleSeries),
      stale_series_count: macroResult.staleSeriesCount,
      series_status: JSON.stringify(macroResult.seriesStatus),
      warning_message: macroResult.message
    });

    return {
      requested: MACRO_SERIES.length,
      succeeded: macroResult.succeededSeries.length,
      warnings: macroResult.missingSeries.length + macroResult.staleSeries.length,
      failed: macroResult.failedSeries.length,
      status: macroResult.status,
      message: macroResult.message,
      updatedDays: macroResult.updatedDays,
      succeededSeries: macroResult.succeededSeries,
      failedSeries: macroResult.failedSeries,
      missingSeries: macroResult.missingSeries,
      staleSeries: macroResult.staleSeries,
      staleSeriesCount: macroResult.staleSeriesCount,
      seriesStatus: macroResult.seriesStatus
    };
  } catch (error) {
    upsertByKey('macro_refresh_status', 'id', 1, {
      last_macro_refresh_at: attemptedAt,
      last_macro_refresh_status: 'failed',
      last_macro_refresh_error: error.message,
      last_successful_macro_refresh_at: existing?.last_successful_macro_refresh_at || null,
      missing_series: serializeJson([]),
      failed_series: serializeJson(MACRO_SERIES.map(series => series.id)),
      stale_series: serializeJson([]),
      stale_series_count: 0,
      series_status: JSON.stringify({}),
      warning_message: 'Macro refresh failed before any series status could be recorded.'
    });

    return {
      requested: MACRO_SERIES.length,
      succeeded: 0,
      warnings: 0,
      failed: MACRO_SERIES.length,
      status: 'failed',
      message: error.message,
      updatedDays: 0,
      succeededSeries: [],
      failedSeries: MACRO_SERIES.map(series => series.id),
      missingSeries: [],
      staleSeries: [],
      staleSeriesCount: 0,
      seriesStatus: {}
    };
  }
}

async function refreshAll(requestedTickers, options = {}) {
  const quotes = await refreshQuotes(requestedTickers);
  const details = await refreshDetails(requestedTickers);
  const macro = await refreshMacro(options.macroDays || 365);

  clearExpiredCache();

  return buildOverallRefreshSummary({
    quotes,
    details,
    macro
  });
}

function getMacroRefreshStatus() {
  const row = db.prepare(`
    SELECT *
    FROM macro_refresh_status
    WHERE id = 1
  `).get();

  if (!row) {
    return {
      status: 'never',
      missingSeries: [],
      failedSeries: [],
      staleSeries: [],
      staleSeriesCount: 0,
      seriesStatus: {},
      message: 'Macro data has not been refreshed yet.'
    };
  }

  return {
    lastRefreshedAt: row.last_macro_refresh_at,
    lastSuccessfulAt: row.last_successful_macro_refresh_at,
    status: row.last_macro_refresh_status || 'never',
    error: row.last_macro_refresh_error,
    message: row.warning_message,
    missingSeries: parseJsonArray(row.missing_series),
    failedSeries: parseJsonArray(row.failed_series),
    staleSeries: parseJsonArray(row.stale_series),
    staleSeriesCount: row.stale_series_count || 0,
    seriesStatus: parseJsonObject(row.series_status)
  };
}

module.exports = {
  getMacroRefreshStatus,
  getTickersToRefresh,
  parseJsonArray,
  refreshAll,
  refreshDetails,
  refreshMacro,
  refreshQuotes,
  refreshStockDetails,
  refreshStockQuote,
  refreshStocksAll
};
