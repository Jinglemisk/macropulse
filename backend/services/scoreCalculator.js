/**
 * ✅ FPS/GPS Enhancement: Score Calculator
 *
 * Calculates Fed Pressure Score (FPS) and Growth Pulse Score (GPS)
 * from classified indicators using weighted averaging
 */

/**
 * Weight configuration for FPS and GPS
 * Based on FPS_GPS_Implementation.md spec
 *
 * Total FPS weight: 11.5
 * Total GPS weight: 9.5
 */
const WEIGHTS = {
  fps: {
    unemployment: 1.5,
    jobless_claims: 1.0,
    nonfarm_payrolls: 1.5,
    cpi_yoy: 1.5,
    core_cpi_yoy: 2.0,
    ppi: 1.0,
    // ✅ Alternative FRED indicators (replacing ISM PMI)
    cfnai: 1.0,           // Chicago Fed Activity Index (replaces ISM Mfg)
    indpro: 0.5,          // Industrial Production (replaces Chicago PMI)
    retail_sales: 1.0,    // Retail Sales (replaces ISM Services)
    consumer_confidence: 0.5
  },
  gps: {
    unemployment: 1.5,
    jobless_claims: 1.0,
    nonfarm_payrolls: 2.0,
    // CPI, Core CPI, PPI not used in GPS
    cfnai: 1.5,           // Higher weight in GPS (composite economic indicator)
    indpro: 0.5,
    retail_sales: 1.5,    // Higher weight in GPS (growth proxy)
    consumer_confidence: 1.0
  }
};

/**
 * Calculate Fed Pressure Score (FPS)
 * @param {object} classifiedIndicators - Output from indicatorClassifier.classifyAllIndicators()
 * @returns {object} - { fps, confidence, breakdown, total_weight }
 */
function calculateFPS(classifiedIndicators) {
  let weightedSum = 0;
  let totalWeight = 0;
  const breakdown = [];

  for (const [name, data] of Object.entries(classifiedIndicators)) {
    // Skip if not in FPS weights
    if (!WEIGHTS.fps[name]) continue;

    const weight = WEIGHTS.fps[name];
    const score = data.fps_score;  // -1, 0, or +1

    if (score !== null) {
      const contribution = score * weight;
      weightedSum += contribution;
      totalWeight += weight;

      breakdown.push({
        indicator: name,
        value: data.value,
        classification: data.classification,
        score: score,
        weight: weight,
        contribution: contribution
      });
    }
  }

  const fps = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return {
    fps: fps,
    confidence: Math.abs(fps) * 100,  // |FPS| as confidence percentage
    breakdown: breakdown,
    total_weight: totalWeight
  };
}

/**
 * Calculate Growth Pulse Score (GPS)
 * @param {object} classifiedIndicators - Output from indicatorClassifier.classifyAllIndicators()
 * @returns {object} - { gps, interpretation, breakdown, total_weight }
 */
function calculateGPS(classifiedIndicators) {
  let weightedSum = 0;
  let totalWeight = 0;
  const breakdown = [];

  for (const [name, data] of Object.entries(classifiedIndicators)) {
    // Skip if not in GPS weights (inflation indicators)
    if (!WEIGHTS.gps[name]) continue;

    const weight = WEIGHTS.gps[name];
    const score = data.gps_score;

    if (score !== null) {
      const contribution = score * weight;
      weightedSum += contribution;
      totalWeight += weight;

      breakdown.push({
        indicator: name,
        value: data.value,
        classification: data.classification,
        score: score,
        weight: weight,
        contribution: contribution
      });
    }
  }

  const gps = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return {
    gps: gps,
    interpretation: interpretGPS(gps),
    breakdown: breakdown,
    total_weight: totalWeight
  };
}

/**
 * Interpret GPS value into human-readable description
 * @param {number} gps - GPS score (-1.0 to +1.0)
 * @returns {string} - Interpretation
 */
function interpretGPS(gps) {
  if (gps > 0.5) return 'Very Strong Growth';
  if (gps > 0.2) return 'Moderate Growth';
  if (gps > -0.2) return 'Neutral';
  if (gps > -0.5) return 'Weak Growth';
  return 'Recessionary';
}

/**
 * Interpret FPS value into human-readable description
 * @param {number} fps - FPS score (-1.0 to +1.0)
 * @returns {string} - Interpretation
 */
function interpretFPS(fps) {
  if (fps > 0.5) return 'Strong Contractionary Pressure';
  if (fps > 0.2) return 'Moderate Hawkish Pressure';
  if (fps > -0.2) return 'Neutral Fed Policy';
  if (fps > -0.5) return 'Moderate Dovish Pressure';
  return 'Strong Expansionary Pressure';
}

module.exports = {
  calculateFPS,
  calculateGPS,
  interpretFPS,
  interpretGPS,
  WEIGHTS
};
