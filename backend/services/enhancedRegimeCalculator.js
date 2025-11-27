/**
 * ✅ FPS/GPS Enhancement: Enhanced Regime Calculator
 *
 * Integrates base regime calculation with FPS/GPS overlay
 * to provide dynamic allocation recommendations
 */

const db = require('../database');
const { classifyAllIndicators } = require('./indicatorClassifier');
const { calculateFPS, calculateGPS, interpretFPS, interpretGPS } = require('./scoreCalculator');
const { calculateAllocation } = require('./allocationEngine');

/**
 * Get latest macro data with moving averages
 * @returns {object} - Latest macro data row with all indicators and MAs
 */
function getLatestMacroDataWithMA() {
  const latest = db.prepare(`
    SELECT * FROM macro_data
    WHERE walcl IS NOT NULL
    ORDER BY date DESC
    LIMIT 1
  `).get();

  if (!latest) {
    throw new Error('No macro data available. Run updateMacroData() first.');
  }

  return latest;
}

/**
 * Calculate base regime (unchanged logic from regimeCalculator.js)
 * @param {object} latestMacro - Latest macro data row
 * @returns {object} - { regime, description, recommendation, metrics, confidence }
 */
function classifyBaseRegime(latestMacro) {
  const dffToday = latestMacro.dff;
  const walclToday = latestMacro.walcl;

  // Get 12-week-ago balance sheet value
  const date12WeeksAgo = subtractDays(latestMacro.date, 84);

  const walcl12WeeksAgo = db.prepare(`
    SELECT walcl FROM macro_data
    WHERE date <= ? AND walcl IS NOT NULL
    ORDER BY date DESC
    LIMIT 1
  `).get(date12WeeksAgo)?.walcl;

  if (!walcl12WeeksAgo) {
    throw new Error('Insufficient balance sheet history (need 12 weeks).');
  }

  // Balance sheet slope
  const balanceSheetSlope = walclToday - walcl12WeeksAgo;
  const balanceSheetIncreasing = balanceSheetSlope > 0;

  // Get 1-year rate range
  const date1YearAgo = subtractDays(latestMacro.date, 365);

  const rateStats = db.prepare(`
    SELECT MIN(dff) as min_rate, MAX(dff) as max_rate
    FROM macro_data
    WHERE date >= ?
  `).get(date1YearAgo);

  const { min_rate, max_rate } = rateStats;

  if (min_rate === null || max_rate === null) {
    throw new Error('Insufficient rate history (need 1 year).');
  }

  // Rate positioning
  const rateRange = max_rate - min_rate;
  const ratePercentile = rateRange > 0 ? (dffToday - min_rate) / rateRange : 0.5;
  const rateIsLow = ratePercentile < 0.5;

  // Determine regime
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

  // Calculate regime confidence (how clear the signals are)
  const rateConfidence = Math.abs(ratePercentile - 0.5) * 2;  // 0-1 scale
  const bsConfidence = Math.min(Math.abs(balanceSheetSlope) / 1000000000, 1);  // Normalize
  const regimeConfidence = ((rateConfidence + bsConfidence) / 2) * 100;

  return {
    regime,
    description,
    recommendation,
    confidence: Math.round(regimeConfidence),
    metrics: {
      fedFundsRate: dffToday,
      rateIsLow,
      ratePercentile: Math.round(ratePercentile * 100) / 100,
      balanceSheetSlope,
      balanceSheetIncreasing,
      balanceSheetChange12w: Math.round(balanceSheetSlope / 1000000000 * 10) / 10,  // Billions
      asOf: latestMacro.date
    }
  };
}

/**
 * Generate human-readable interpretation messages
 * @param {object} baseRegime - Base regime result
 * @param {object} fpsResult - FPS calculation result
 * @param {object} gpsResult - GPS calculation result
 * @returns {Array} - Array of interpretation strings
 */
function generateInterpretation(baseRegime, fpsResult, gpsResult) {
  const messages = [];

  // Base regime
  messages.push(`Current Regime: ${baseRegime.regime}`);
  messages.push(`${baseRegime.description}`);

  // FPS interpretation
  const fpsInterp = interpretFPS(fpsResult.fps);
  messages.push(`Fed Policy Bias: ${fpsInterp} (FPS: ${fpsResult.fps.toFixed(2)})`);

  // GPS interpretation
  const gpsInterp = interpretGPS(gpsResult.gps);
  messages.push(`Economic Growth: ${gpsInterp} (GPS: ${gpsResult.gps.toFixed(2)})`);

  // Warnings
  const warnings = [];

  // Yield curve inversion warning
  const latestMacro = getLatestMacroDataWithMA();
  if (latestMacro.t10y2y !== null && latestMacro.t10y2y < 0) {
    warnings.push(`⚠️ Yield curve inverted (${latestMacro.t10y2y.toFixed(2)}%) - recession risk`);
  }

  // FPS/GPS divergence warning
  if (Math.abs(fpsResult.fps - gpsResult.gps) > 0.5) {
    warnings.push('⚠️ FPS/GPS divergence detected - mixed signals');
  }

  // Stagflation warning
  if (gpsResult.gps < -0.3 && fpsResult.fps > 0.3) {
    warnings.push('⚠️ Stagflation risk: Weak growth + Hawkish Fed');
  }

  return [...messages, ...warnings];
}

/**
 * Calculate overall confidence
 * @param {object} baseRegime - Base regime with confidence
 * @param {object} fpsResult - FPS result
 * @param {object} gpsResult - GPS result
 * @returns {number} - Overall confidence (0-100)
 */
function calculateOverallConfidence(baseRegime, fpsResult, gpsResult) {
  const regimeConf = baseRegime.confidence;
  const fpsConf = fpsResult.confidence;

  // Weight: 50% regime confidence, 50% FPS confidence
  const overall = (regimeConf * 0.5) + (fpsConf * 0.5);

  return Math.round(overall);
}

/**
 * Calculate enhanced regime with FPS/GPS overlay
 * @returns {object} - Complete enhanced regime data
 */
function calculateEnhancedRegime() {
  try {
    // 1. Get latest macro data with MAs
    const latestMacro = getLatestMacroDataWithMA();

    // 2. Classify base regime
    const baseRegime = classifyBaseRegime(latestMacro);

    // 3. Classify all indicators
    const classifiedIndicators = classifyAllIndicators(latestMacro);

    // 4. Calculate FPS and GPS
    const fpsResult = calculateFPS(classifiedIndicators);
    const gpsResult = calculateGPS(classifiedIndicators);

    // 5. Calculate allocation with tilts
    const allocationResult = calculateAllocation(
      baseRegime.regime,
      fpsResult.fps,
      gpsResult.gps
    );

    // 6. Generate interpretation
    const interpretation = generateInterpretation(baseRegime, fpsResult, gpsResult);

    // 7. Calculate overall confidence
    const overallConfidence = calculateOverallConfidence(baseRegime, fpsResult, gpsResult);

    // 8. Return complete result
    return {
      regime: baseRegime.regime,
      description: baseRegime.description,
      recommendation: baseRegime.recommendation,
      metrics: baseRegime.metrics,

      scores: {
        fps: fpsResult.fps,
        gps: gpsResult.gps,
        fps_confidence: fpsResult.confidence,
        fps_interpretation: interpretFPS(fpsResult.fps),
        gps_interpretation: gpsResult.interpretation
      },

      allocation: allocationResult.allocation,
      allocation_steps: allocationResult.steps,

      confidence: {
        overall: overallConfidence,
        regime: baseRegime.confidence,
        fps: fpsResult.confidence
      },

      interpretation: interpretation,

      breakdown: {
        fps: fpsResult.breakdown,
        gps: gpsResult.breakdown
      },

      asOf: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Enhanced regime calculation failed:', error.message);
    throw error;
  }
}

/**
 * Subtract days from ISO date string
 * @param {string} dateStr - ISO date string
 * @param {number} days - Days to subtract
 * @returns {string} - New ISO date string
 */
function subtractDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

module.exports = {
  calculateEnhancedRegime,
  getLatestMacroDataWithMA,
  classifyBaseRegime
};
