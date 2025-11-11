/**
 * ✅ FPS/GPS Enhancement: Moving Average Calculations
 *
 * Calculates 3-month moving averages for all FPS/GPS indicators
 * with configurable window sizes per indicator
 */

const db = require('../database');

/**
 * Moving average window configuration (in months)
 * Based on FPS_GPS_Implementation.md spec
 */
const MA_WINDOWS = {
  unrate: 6,              // 6 months - low volatility
  jobless_claims: 3,      // ~12 weeks (3 months) - high volatility
  nonfarm_payrolls: 9,    // 9 months (3 quarters)
  cpi_yoy: 9,             // 9 months - calculated from cpiaucsl
  core_cpi_yoy: 9,        // 9 months - calculated from core_cpi
  ppi: 12,                // 12 months - high volatility
  cfnai: 6,               // 6 months - composite index (replaces ISM Mfg)
  indpro: 9,              // 9 months - industrial production (replaces Chicago PMI)
  retail_sales: 9,        // 9 months - retail sales (replaces ISM Services)
  consumer_confidence: 12 // 12 months - high volatility
};

/**
 * Calculate YoY percentage change for CPI indicators
 * @param {Array} data - Array of {date, value} sorted by date DESC
 * @returns {Array} - Array with YoY percentages
 */
function calculateYoY(data, field) {
  const result = [];

  for (let i = 0; i < data.length; i++) {
    const current = data[i];
    // Find value from 12 months ago (approximately)
    const yearAgo = data.find(d => {
      const diffMonths = (new Date(current.date) - new Date(d.date)) / (1000 * 60 * 60 * 24 * 30);
      return diffMonths >= 11 && diffMonths <= 13;
    });

    if (yearAgo && current[field] && yearAgo[field]) {
      const yoy = ((current[field] - yearAgo[field]) / yearAgo[field]) * 100;
      result.push({
        date: current.date,
        value: yoy
      });
    }
  }

  return result;
}

/**
 * Calculate moving average for a series
 * @param {Array} data - Array of {date, value} sorted by date DESC
 * @param {number} windowMonths - Window size in months
 * @returns {Map} - Map of date -> MA value
 */
function calculateMA(data, windowMonths) {
  const result = new Map();

  for (let i = 0; i < data.length; i++) {
    const currentDate = new Date(data[i].date);
    const windowStartDate = new Date(currentDate);
    windowStartDate.setMonth(windowStartDate.getMonth() - windowMonths);

    // Get all points within the window
    const windowData = data.filter(d => {
      const date = new Date(d.date);
      return date >= windowStartDate && date <= currentDate && d.value !== null;
    });

    if (windowData.length > 0) {
      const sum = windowData.reduce((acc, d) => acc + d.value, 0);
      const ma = sum / windowData.length;
      result.set(data[i].date, ma);
    }
  }

  return result;
}

/**
 * Update all moving average columns in macro_data table
 * Should be called after updateMacroData() completes
 */
async function updateMovingAverages() {
  console.log('📊 Calculating moving averages for FPS/GPS indicators...');

  try {
    // Fetch all raw data (sorted DESC for YoY calculation)
    const allData = db.prepare(`
      SELECT date, unrate, jobless_claims, nonfarm_payrolls,
             cpiaucsl, core_cpi, ppi,
             cfnai, indpro, retail_sales, consumer_confidence
      FROM macro_data
      ORDER BY date DESC
    `).all();

    if (allData.length === 0) {
      console.log('⚠️ No macro data found. Run updateMacroData() first.');
      return;
    }

    console.log(`  Processing ${allData.length} data points...`);

    // Calculate YoY for CPI indicators
    const cpiYoY = calculateYoY(allData, 'cpiaucsl');
    const coreCpiYoY = calculateYoY(allData, 'core_cpi');

    // Calculate MAs for each indicator
    const maUnrate = calculateMA(
      allData.map(d => ({ date: d.date, value: d.unrate })),
      MA_WINDOWS.unrate
    );

    const maJobless = calculateMA(
      allData.map(d => ({ date: d.date, value: d.jobless_claims })),
      MA_WINDOWS.jobless_claims
    );

    const maPayrolls = calculateMA(
      allData.map(d => ({ date: d.date, value: d.nonfarm_payrolls })),
      MA_WINDOWS.nonfarm_payrolls
    );

    const maCpiYoY = calculateMA(cpiYoY, MA_WINDOWS.cpi_yoy);
    const maCoreCpiYoY = calculateMA(coreCpiYoY, MA_WINDOWS.core_cpi_yoy);

    const maPpi = calculateMA(
      allData.map(d => ({ date: d.date, value: d.ppi })),
      MA_WINDOWS.ppi
    );

    const maCfnai = calculateMA(
      allData.map(d => ({ date: d.date, value: d.cfnai })),
      MA_WINDOWS.cfnai
    );

    const maIndpro = calculateMA(
      allData.map(d => ({ date: d.date, value: d.indpro })),
      MA_WINDOWS.indpro
    );

    const maRetail = calculateMA(
      allData.map(d => ({ date: d.date, value: d.retail_sales })),
      MA_WINDOWS.retail_sales
    );

    const maConsCon = calculateMA(
      allData.map(d => ({ date: d.date, value: d.consumer_confidence })),
      MA_WINDOWS.consumer_confidence
    );

    // Update database with MAs
    const updateStmt = db.prepare(`
      UPDATE macro_data
      SET unrate_ma3 = ?,
          jobless_claims_ma3 = ?,
          nonfarm_payrolls_ma3 = ?,
          cpi_yoy_ma3 = ?,
          core_cpi_yoy_ma3 = ?,
          ppi_ma3 = ?,
          cfnai_ma3 = ?,
          indpro_ma3 = ?,
          retail_sales_ma3 = ?,
          consumer_confidence_ma3 = ?
      WHERE date = ?
    `);

    let updatedCount = 0;
    for (const row of allData) {
      updateStmt.run(
        maUnrate.get(row.date) || null,
        maJobless.get(row.date) || null,
        maPayrolls.get(row.date) || null,
        maCpiYoY.get(row.date) || null,
        maCoreCpiYoY.get(row.date) || null,
        maPpi.get(row.date) || null,
        maCfnai.get(row.date) || null,
        maIndpro.get(row.date) || null,
        maRetail.get(row.date) || null,
        maConsCon.get(row.date) || null,
        row.date
      );
      updatedCount++;
    }

    console.log(`✅ Updated moving averages for ${updatedCount} data points`);
    console.log(`  Window sizes: UNRATE=${MA_WINDOWS.unrate}mo, ICSA=${MA_WINDOWS.jobless_claims}mo, PAYEMS=${MA_WINDOWS.nonfarm_payrolls}mo`);
    console.log(`                CPI/CoreCPI=${MA_WINDOWS.cpi_yoy}mo, PPI=${MA_WINDOWS.ppi}mo`);
    console.log(`                CFNAI=${MA_WINDOWS.cfnai}mo, INDPRO=${MA_WINDOWS.indpro}mo, Retail=${MA_WINDOWS.retail_sales}mo`);
    console.log(`                ConsCon=${MA_WINDOWS.consumer_confidence}mo`);

  } catch (error) {
    console.error('❌ Moving average calculation failed:', error.message);
    throw error;
  }
}

module.exports = { updateMovingAverages, MA_WINDOWS };
