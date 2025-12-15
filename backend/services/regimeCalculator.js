const db = require('../database');

/**
 * Calculate current macro regime
 * @returns {Object} - { regime, description, recommendation, metrics }
 */
function calculateRegime() {
  // 1. Get latest DFF (Fed Funds Rate) - updated daily
  const latestDff = db.prepare(`
    SELECT date, dff FROM macro_data
    WHERE dff IS NOT NULL
    ORDER BY date DESC
    LIMIT 1
  `).get();

  // 2. Get latest WALCL (Balance Sheet) - published weekly by FRED
  const latestWalcl = db.prepare(`
    SELECT date, walcl FROM macro_data
    WHERE walcl IS NOT NULL
    ORDER BY date DESC
    LIMIT 1
  `).get();

  if (!latestDff || !latestWalcl) {
    throw new Error('No macro data available. Run fetch-macro script first.');
  }

  const dffToday = latestDff.dff;
  const walclToday = latestWalcl.walcl;
  const latestMacro = { date: latestDff.date, walclDate: latestWalcl.date };

  // 3. Get 12-week-ago balance sheet value
  const date12WeeksAgo = subtractDays(latestMacro.walclDate, 84);  // 12 weeks = 84 days

  const walcl12WeeksAgo = db.prepare(`
    SELECT walcl FROM macro_data
    WHERE date <= ? AND walcl IS NOT NULL
    ORDER BY date DESC
    LIMIT 1
  `).get(date12WeeksAgo)?.walcl;

  if (!walcl12WeeksAgo) {
    throw new Error('Insufficient balance sheet history (need 12 weeks). Run fetch-macro script.');
  }

  // Balance sheet slope
  const balanceSheetSlope = walclToday - walcl12WeeksAgo;
  const balanceSheetIncreasing = balanceSheetSlope > 0;

  // 3. Get 1-year rate range
  const date1YearAgo = subtractDays(latestMacro.date, 365);

  const rateStats = db.prepare(`
    SELECT MIN(dff) as min_rate, MAX(dff) as max_rate
    FROM macro_data
    WHERE date >= ?
  `).get(date1YearAgo);

  const { min_rate, max_rate } = rateStats;

  if (min_rate === null || max_rate === null) {
    throw new Error('Insufficient rate history (need 1 year). Run fetch-macro script.');
  }

  // Rate positioning
  const rateRange = max_rate - min_rate;
  const ratePercentile = rateRange > 0 ? (dffToday - min_rate) / rateRange : 0.5;
  const rateIsLow = ratePercentile < 0.5;

  // 4. Determine regime
  let regime, description, recommendation;

  if (rateIsLow && balanceSheetIncreasing) {
    regime = 'Most Liquid';
    description = 'Low Rates + Balance Sheet Increasing';
    recommendation = 'Allocate 0-100%+ to Class D stocks';
  } else if (rateIsLow && !balanceSheetIncreasing) {
    regime = 'In Between (prefer C)';
    description = 'Low Rates + Balance Sheet Decreasing';
    recommendation = 'Allocate 0-50% to Class C (or B) stocks';
  } else if (!rateIsLow && balanceSheetIncreasing) {
    regime = 'In Between (prefer B)';
    description = 'High Rates + Balance Sheet Increasing';
    recommendation = 'Allocate 0-50% to Class B (or C) stocks';
  } else {
    regime = 'Least Liquid';
    description = 'High Rates + Balance Sheet Decreasing';
    recommendation = 'Allocate 0-20% to Class A stocks';
  }

  return {
    regime,
    description,
    recommendation,
    metrics: {
      fedFundsRate: dffToday,
      rateIsLow,
      ratePercentile: Math.round(ratePercentile * 100) / 100,
      balanceSheetSlope,
      balanceSheetIncreasing,
      balanceSheetChange12w: Math.round(balanceSheetSlope / 1000),  // Billions (WALCL is in millions)
      asOf: latestMacro.date
    }
  };
}

/**
 * Subtract days from ISO date string
 */
function subtractDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

module.exports = { calculateRegime };
