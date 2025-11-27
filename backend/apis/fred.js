const openbb = require('./openbb');
const config = require('../config');
const db = require('../database');
const { updateMovingAverages } = require('../utils/movingAverages');

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
 * ✅ FPS/GPS Enhancement: Expanded to 15 FRED series:
 * - WALCL: Fed Balance Sheet
 * - DFF: Fed Funds Rate
 * - T10Y2Y: 10-Year minus 2-Year Treasury Yield Spread
 * - UNRATE: Unemployment Rate
 * - CPIAUCSL: Consumer Price Index (All Items)
 * - ICSA: Initial Jobless Claims (Weekly)
 * - PAYEMS: Nonfarm Payrolls (Total Employees)
 * - CPILFESL: Core CPI (Less Food & Energy)
 * - PPIACO: Producer Price Index (All Commodities)
 * - CFNAI: Chicago Fed National Activity Index (replaces ISM Mfg PMI)
 * - INDPRO: Industrial Production Index (replaces Chicago PMI)
 * - RSXFS: Retail and Food Services Sales (CORRECTED - RETAILSMNS doesn't exist in FRED via OpenBB)
 * - UMCSENT: University of Michigan Consumer Sentiment
 * - Note: ISM PMI (NAPMPI/NAPMSI) proprietary - not available via FRED after 2016
 */
async function updateMacroData(days = 365) {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    console.log(`📊 Fetching 15 FRED series for FPS/GPS from ${startDate} to ${endDate} via OpenBB...`);

    // ✅ FPS/GPS: Fetch all 12 available series in parallel
    // Note: NAPMPI & NAPMSI (ISM PMI) removed from FRED in 2016
    const [
      walclData, dffData, yieldCurveData, unrateData, cpiData,
      joblessData, payrollsData, coreCpiData, ppiData,
      cfnaiData, indproData, retailData, consConfData
    ] = await Promise.all([
      openbb.getFredSeries('WALCL', startDate, endDate),
      openbb.getFredSeries('DFF', startDate, endDate),
      openbb.getFredSeries('T10Y2Y', startDate, endDate),
      openbb.getFredSeries('UNRATE', startDate, endDate),
      openbb.getFredSeries('CPIAUCSL', startDate, endDate),
      openbb.getFredSeries('ICSA', startDate, endDate),
      openbb.getFredSeries('PAYEMS', startDate, endDate),
      openbb.getFredSeries('CPILFESL', startDate, endDate),
      openbb.getFredSeries('PPIACO', startDate, endDate),
      openbb.getFredSeries('CFNAI', startDate, endDate),       // Chicago Fed Activity Index
      openbb.getFredSeries('INDPRO', startDate, endDate),      // Industrial Production
      openbb.getFredSeries('RSXFS', startDate, endDate),       // Retail and Food Services Sales (CORRECTED from RETAILSMNS)
      openbb.getFredSeries('UMCSENT', startDate, endDate)
    ]);

    console.log('📈 Data points fetched (FPS/GPS indicators):');
    console.log(`  Core: WALCL=${walclData.length}, DFF=${dffData.length}, T10Y2Y=${yieldCurveData.length}`);
    console.log(`  Labor: UNRATE=${unrateData.length}, ICSA=${joblessData.length}, PAYEMS=${payrollsData.length}`);
    console.log(`  Inflation: CPI=${cpiData.length}, CoreCPI=${coreCpiData.length}, PPI=${ppiData.length}`);
    console.log(`  Activity: CFNAI=${cfnaiData.length}, INDPRO=${indproData.length}, Retail=${retailData.length}, ConsSent=${consConfData.length}`);

    // Merge all series by date
    const dateMap = new Map();

    // Helper function to add data to map
    const addToMap = (data, field) => {
      data.forEach(obs => {
        if (!dateMap.has(obs.date)) dateMap.set(obs.date, {});
        dateMap.get(obs.date)[field] = parseFloat(obs.value);
      });
    };

    // ✅ FPS/GPS: Merge all 12 series
    addToMap(walclData, 'walcl');
    addToMap(dffData, 'dff');
    addToMap(yieldCurveData, 't10y2y');
    addToMap(unrateData, 'unrate');
    addToMap(cpiData, 'cpiaucsl');
    addToMap(joblessData, 'jobless_claims');
    addToMap(payrollsData, 'nonfarm_payrolls');
    addToMap(coreCpiData, 'core_cpi');
    addToMap(ppiData, 'ppi');
    addToMap(cfnaiData, 'cfnai');
    addToMap(indproData, 'indpro');
    addToMap(retailData, 'retail_sales');
    addToMap(consConfData, 'consumer_confidence');

    // ✅ FPS/GPS: Insert all 12 series + 3 alternatives
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
    let count = 0;

    for (const [date, values] of dateMap) {
      // Insert if we have any core metrics
      if (values.walcl || values.dff || values.unrate || values.cpiaucsl) {
        insertStmt.run(
          date,
          values.walcl || null,
          values.dff || null,
          values.t10y2y || null,
          values.unrate || null,
          values.cpiaucsl || null,
          values.jobless_claims || null,
          values.nonfarm_payrolls || null,
          values.core_cpi || null,
          values.ppi || null,
          values.cfnai || null,
          values.indpro || null,
          values.retail_sales || null,
          values.consumer_confidence || null,
          now
        );
        count++;
      }
    }

    console.log(`✅ Updated ${count} days of FPS/GPS macro data (12 series + 3 alternatives)`);

    // ✅ FPS/GPS: Calculate moving averages after data insertion
    await updateMovingAverages();

    return count;
  } catch (error) {
    console.error('❌ FRED data fetch failed:', error.message);
    throw error;
  }
}

module.exports = { updateMacroData };
