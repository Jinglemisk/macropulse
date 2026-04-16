const openbb = require('./openbb');
const db = require('../database');
const { updateMovingAverages } = require('../utils/movingAverages');

const MACRO_SERIES = [
  { id: 'WALCL', field: 'walcl', cadenceDays: 21 },
  { id: 'DFF', field: 'dff', cadenceDays: 7 },
  { id: 'T10Y2Y', field: 't10y2y', cadenceDays: 7 },
  { id: 'UNRATE', field: 'unrate', cadenceDays: 62 },
  { id: 'CPIAUCSL', field: 'cpiaucsl', cadenceDays: 62 },
  { id: 'ICSA', field: 'jobless_claims', cadenceDays: 21 },
  { id: 'PAYEMS', field: 'nonfarm_payrolls', cadenceDays: 62 },
  { id: 'CPILFESL', field: 'core_cpi', cadenceDays: 62 },
  { id: 'PPIACO', field: 'ppi', cadenceDays: 62 },
  { id: 'CFNAI', field: 'cfnai', cadenceDays: 62 },
  { id: 'INDPRO', field: 'indpro', cadenceDays: 62 },
  { id: 'RSXFS', field: 'retail_sales', cadenceDays: 62 },
  { id: 'UMCSENT', field: 'consumer_confidence', cadenceDays: 62 }
];

function addToMap(dateMap, data, field) {
  data.forEach(observation => {
    if (!dateMap.has(observation.date)) {
      dateMap.set(observation.date, {});
    }

    dateMap.get(observation.date)[field] = parseFloat(observation.value);
  });
}

function daysBetween(laterDate, earlierDate) {
  const later = new Date(laterDate);
  const earlier = new Date(earlierDate);
  return Math.floor((later - earlier) / (1000 * 60 * 60 * 24));
}

function getSeriesSnapshot(seriesConfig, asOfDate) {
  const row = db.prepare(`
    SELECT date
    FROM macro_data
    WHERE ${seriesConfig.field} IS NOT NULL
    ORDER BY date DESC
    LIMIT 1
  `).get();

  const latestObservationDate = row?.date || null;
  const stale = latestObservationDate
    ? daysBetween(asOfDate, latestObservationDate) > seriesConfig.cadenceDays
    : false;

  return {
    latestObservationDate,
    stale
  };
}

function buildSeriesStatus(seriesFetchResults, asOfDate) {
  const seriesStatus = {};
  const succeededSeries = [];
  const failedSeries = [];
  const missingSeries = [];
  const staleSeries = [];

  for (const config of MACRO_SERIES) {
    const fetchResult = seriesFetchResults[config.id];
    const snapshot = getSeriesSnapshot(config, asOfDate);
    const hadSuccessfulFetch = fetchResult.status === 'success';

    if (hadSuccessfulFetch) {
      succeededSeries.push(config.id);
    } else {
      failedSeries.push(config.id);
    }

    if (!snapshot.latestObservationDate) {
      missingSeries.push(config.id);
    }

    if (snapshot.stale) {
      staleSeries.push(config.id);
    }

    seriesStatus[config.id] = {
      field: config.field,
      cadenceDays: config.cadenceDays,
      fetchStatus: fetchResult.status,
      pointsFetched: fetchResult.pointsFetched,
      error: fetchResult.error,
      latestObservationDate: snapshot.latestObservationDate,
      stale: snapshot.stale
    };
  }

  let status = 'success';
  if (succeededSeries.length === 0) {
    status = 'failed';
  } else if (failedSeries.length > 0 || missingSeries.length > 0 || staleSeries.length > 0) {
    status = 'warning';
  }

  let message = 'Macro refresh completed successfully.';
  if (status === 'failed') {
    message = 'Macro refresh failed for all tracked series.';
  } else if (status === 'warning') {
    const parts = [];
    if (failedSeries.length > 0) {
      parts.push(`${failedSeries.length} fetch failure${failedSeries.length === 1 ? '' : 's'}`);
    }
    if (missingSeries.length > 0) {
      parts.push(`${missingSeries.length} missing series`);
    }
    if (staleSeries.length > 0) {
      parts.push(`${staleSeries.length} stale series`);
    }
    message = `Macro refresh completed with warnings: ${parts.join(', ')}.`;
  }

  return {
    status,
    message,
    succeededSeries,
    failedSeries,
    missingSeries,
    staleSeries,
    staleSeriesCount: staleSeries.length,
    seriesStatus
  };
}

async function updateMacroData(days = 365) {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  console.log(`📊 Fetching ${MACRO_SERIES.length} macro series from ${startDate} to ${endDate} via OpenBB...`);

  const fetchResults = await Promise.allSettled(
    MACRO_SERIES.map(series => openbb.getFredSeries(series.id, startDate, endDate))
  );

  const dateMap = new Map();
  const seriesFetchResults = {};

  fetchResults.forEach((result, index) => {
    const series = MACRO_SERIES[index];

    if (result.status === 'fulfilled') {
      const data = Array.isArray(result.value) ? result.value : [];
      addToMap(dateMap, data, series.field);
      seriesFetchResults[series.id] = {
        status: data.length > 0 ? 'success' : 'failed',
        pointsFetched: data.length,
        error: data.length > 0 ? null : 'No observations returned'
      };
      return;
    }

    seriesFetchResults[series.id] = {
      status: 'failed',
      pointsFetched: 0,
      error: result.reason?.message || String(result.reason)
    };
    console.warn(`⚠️ ${series.id} fetch failed: ${seriesFetchResults[series.id].error}`);
  });

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO macro_data (
      date, walcl, dff, t10y2y, unrate, cpiaucsl,
      jobless_claims, nonfarm_payrolls, core_cpi, ppi,
      cfnai, indpro, retail_sales, consumer_confidence,
      fetched_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  let updatedDays = 0;

  for (const [date, values] of dateMap) {
    if (Object.keys(values).length === 0) {
      continue;
    }

    insertStmt.run(
      date,
      values.walcl ?? null,
      values.dff ?? null,
      values.t10y2y ?? null,
      values.unrate ?? null,
      values.cpiaucsl ?? null,
      values.jobless_claims ?? null,
      values.nonfarm_payrolls ?? null,
      values.core_cpi ?? null,
      values.ppi ?? null,
      values.cfnai ?? null,
      values.indpro ?? null,
      values.retail_sales ?? null,
      values.consumer_confidence ?? null,
      now
    );
    updatedDays++;
  }

  if (updatedDays > 0) {
    await updateMovingAverages();
  }

  const summary = buildSeriesStatus(seriesFetchResults, endDate);

  return {
    ...summary,
    updatedDays,
    dateRange: {
      startDate,
      endDate
    }
  };
}

module.exports = {
  MACRO_SERIES,
  updateMacroData
};
