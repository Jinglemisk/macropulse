const openbb = require('./openbb');
const config = require('../config');
const db = require('../database');

/**
 * ⚠️ MIGRATED TO OPENBB PLATFORM
 *
 * This module now uses OpenBB Platform for FRED data access.
 * - Unified API access via OpenBB
 * - Better error handling and retry logic
 * - Database storage: PRESERVED (same schema)
 */

/**
 * Fetch and store expanded FRED macro data via OpenBB
 * @param {number} days - Number of days to fetch (default 365)
 *
 * ✅ Phase 6: Expanded to include:
 * - WALCL: Fed Balance Sheet (existing)
 * - DFF: Fed Funds Rate (existing)
 * - T10Y2Y: 10-Year minus 2-Year Treasury Yield Spread (new)
 * - UNRATE: Unemployment Rate (new)
 * - CPIAUCSL: Consumer Price Index (new)
 */
async function updateMacroData(days = 365) {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    console.log(`📊 Fetching expanded FRED macro data from ${startDate} to ${endDate} via OpenBB...`);

    // ✅ Phase 6: Fetch all 5 series via OpenBB Platform
    const [walclData, dffData, yieldCurveData, unrateData, cpiData] = await Promise.all([
      openbb.getFredSeries('WALCL', startDate, endDate),
      openbb.getFredSeries('DFF', startDate, endDate),
      openbb.getFredSeries('T10Y2Y', startDate, endDate),
      openbb.getFredSeries('UNRATE', startDate, endDate),
      openbb.getFredSeries('CPIAUCSL', startDate, endDate)
    ]);

    console.log('📈 Data points fetched:');
    console.log(`  WALCL: ${walclData.length}, DFF: ${dffData.length}, T10Y2Y: ${yieldCurveData.length}, UNRATE: ${unrateData.length}, CPI: ${cpiData.length}`);

    // Merge all series by date
    const dateMap = new Map();

    walclData.forEach(obs => {
      if (!dateMap.has(obs.date)) dateMap.set(obs.date, {});
      dateMap.get(obs.date).walcl = parseFloat(obs.value);
    });

    dffData.forEach(obs => {
      if (!dateMap.has(obs.date)) dateMap.set(obs.date, {});
      dateMap.get(obs.date).dff = parseFloat(obs.value);
    });

    yieldCurveData.forEach(obs => {
      if (!dateMap.has(obs.date)) dateMap.set(obs.date, {});
      dateMap.get(obs.date).t10y2y = parseFloat(obs.value);
    });

    unrateData.forEach(obs => {
      if (!dateMap.has(obs.date)) dateMap.set(obs.date, {});
      dateMap.get(obs.date).unrate = parseFloat(obs.value);
    });

    cpiData.forEach(obs => {
      if (!dateMap.has(obs.date)) dateMap.set(obs.date, {});
      dateMap.get(obs.date).cpiaucsl = parseFloat(obs.value);
    });

    // ✅ UPDATED: Insert all 5 series
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO macro_data (date, walcl, dff, t10y2y, unrate, cpiaucsl, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    let count = 0;

    for (const [date, values] of dateMap) {
      // Insert if we have core metrics (WALCL and DFF)
      if (values.walcl || values.dff) {
        insertStmt.run(
          date,
          values.walcl || null,
          values.dff || null,
          values.t10y2y || null,
          values.unrate || null,
          values.cpiaucsl || null,
          now
        );
        count++;
      }
    }

    console.log(`✅ Updated ${count} days of expanded macro data`);
    return count;
  } catch (error) {
    console.error('❌ FRED data fetch failed:', error.message);
    throw error;
  }
}

module.exports = { updateMacroData };
