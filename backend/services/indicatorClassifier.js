/**
 * ✅ FPS/GPS Enhancement: Indicator Classifier
 *
 * Classifies macro indicators into High/Normal/Low bands
 * and maps them to FPS and GPS scores (-1, 0, +1)
 */

/**
 * Threshold definitions for each indicator
 * Based on FPS_GPS_Implementation.md spec + FRED alternatives
 */
const THRESHOLDS = {
  unemployment: { low: 4.0, high: 5.5 },
  jobless_claims: { low: 250000, high: 350000 },
  nonfarm_payrolls: { low: 50000, high: 250000 },
  cpi_yoy: { low: 2.0, high: 3.0 },
  core_cpi_yoy: { low: 2.0, high: 3.0 },
  ppi: { low: 0, high: 0.2 },
  // ✅ Alternative FRED indicators (replacing ISM PMI)
  cfnai: { low: -0.7, high: 0.35 },          // Chicago Fed Activity Index
  indpro: { low: 0, high: 0.2 },             // Industrial Production (MoM % change)
  retail_sales: { low: 0, high: 0.4 },       // Retail Sales (MoM % change)
  consumer_confidence: { low: 100, high: 120 }
};

/**
 * Classify an indicator value into High/Normal/Low
 * @param {string} name - Indicator name (e.g., 'unemployment')
 * @param {number|null} value - Indicator value
 * @returns {object} - { classification: 'High'|'Normal'|'Low'|'Unknown', threshold_low, threshold_high }
 */
function classifyIndicator(name, value) {
  if (value === null || value === undefined || isNaN(value)) {
    return { classification: 'Unknown', score: null };
  }

  const t = THRESHOLDS[name];
  if (!t) {
    throw new Error(`Unknown indicator: ${name}`);
  }

  if (value < t.low) {
    return {
      classification: 'Low',
      threshold_low: t.low,
      threshold_high: t.high
    };
  }

  if (value > t.high) {
    return {
      classification: 'High',
      threshold_low: t.low,
      threshold_high: t.high
    };
  }

  return {
    classification: 'Normal',
    threshold_low: t.low,
    threshold_high: t.high
  };
}

/**
 * FPS Score Mapping (Classification → Score)
 * Based on each indicator's economic impact on Fed policy
 *
 * Logic:
 * - Unemployment: High → dovish (-1), Low → hawkish (+1)
 * - Jobless Claims: High → dovish (-1), Low → hawkish (+1)
 * - Nonfarm Payrolls: High → hawkish (+1), Low → dovish (-1)
 * - CPI/Core CPI/PPI: High → hawkish (+1), Low → dovish (-1)
 * - CFNAI/INDPRO/Retail Sales: High → hawkish (+1), Low → dovish (-1)
 * - Consumer Confidence: High → hawkish (+1), Low → dovish (-1)
 */
const FPS_MAP = {
  unemployment: { High: -1, Normal: 0, Low: +1 },
  jobless_claims: { High: -1, Normal: 0, Low: +1 },
  nonfarm_payrolls: { High: +1, Normal: 0, Low: -1 },
  cpi_yoy: { High: +1, Normal: 0, Low: -1 },
  core_cpi_yoy: { High: +1, Normal: 0, Low: -1 },
  ppi: { High: +1, Normal: 0, Low: -1 },
  cfnai: { High: +1, Normal: 0, Low: -1 },
  indpro: { High: +1, Normal: 0, Low: -1 },
  retail_sales: { High: +1, Normal: 0, Low: -1 },
  consumer_confidence: { High: +1, Normal: 0, Low: -1 }
};

/**
 * GPS Score Mapping (Classification → Score)
 * Same as FPS but excludes inflation indicators
 *
 * Logic:
 * - Labor indicators: same as FPS
 * - Activity indicators (CFNAI, INDPRO, Retail, confidence): same as FPS
 * - Inflation indicators: NOT USED in GPS
 */
const GPS_MAP = {
  unemployment: { High: -1, Normal: 0, Low: +1 },
  jobless_claims: { High: -1, Normal: 0, Low: +1 },
  nonfarm_payrolls: { High: +1, Normal: 0, Low: -1 },
  // CPI, Core CPI, PPI are not used in GPS
  cfnai: { High: +1, Normal: 0, Low: -1 },
  indpro: { High: +1, Normal: 0, Low: -1 },
  retail_sales: { High: +1, Normal: 0, Low: -1 },
  consumer_confidence: { High: +1, Normal: 0, Low: -1 }
};

/**
 * Map indicator classification to FPS score
 * @param {string} indicator - Indicator name
 * @param {string} classification - 'High', 'Normal', 'Low', or 'Unknown'
 * @returns {number|null} - Score (-1, 0, +1) or null if Unknown
 */
function mapToFPS(indicator, classification) {
  if (classification === 'Unknown') return null;
  if (!FPS_MAP[indicator]) return null;
  return FPS_MAP[indicator][classification] || 0;
}

/**
 * Map indicator classification to GPS score
 * @param {string} indicator - Indicator name
 * @param {string} classification - 'High', 'Normal', 'Low', or 'Unknown'
 * @returns {number|null} - Score (-1, 0, +1) or null if Unknown or N/A
 */
function mapToGPS(indicator, classification) {
  if (classification === 'Unknown') return null;
  if (!GPS_MAP[indicator]) return null;  // Inflation indicators return null
  return GPS_MAP[indicator][classification] || 0;
}

/**
 * Classify all indicators from macro data row
 * @param {object} data - Row from macro_data table with MA columns
 * @returns {object} - Map of indicator → { value, classification, fps_score, gps_score }
 */
function classifyAllIndicators(data) {
  const result = {};

  // Labor indicators (use MA values)
  const indicators = [
    { name: 'unemployment', maField: 'unrate_ma3' },
    { name: 'jobless_claims', maField: 'jobless_claims_ma3' },
    { name: 'nonfarm_payrolls', maField: 'nonfarm_payrolls_ma3' },
    { name: 'cpi_yoy', maField: 'cpi_yoy_ma3' },
    { name: 'core_cpi_yoy', maField: 'core_cpi_yoy_ma3' },
    { name: 'ppi', maField: 'ppi_ma3' },
    { name: 'cfnai', maField: 'cfnai_ma3' },
    { name: 'indpro', maField: 'indpro_ma3' },
    { name: 'retail_sales', maField: 'retail_sales_ma3' },
    { name: 'consumer_confidence', maField: 'consumer_confidence_ma3' }
  ];

  for (const ind of indicators) {
    const value = data[ind.maField];
    const classified = classifyIndicator(ind.name, value);

    result[ind.name] = {
      value: value,
      classification: classified.classification,
      threshold_low: classified.threshold_low,
      threshold_high: classified.threshold_high,
      fps_score: mapToFPS(ind.name, classified.classification),
      gps_score: mapToGPS(ind.name, classified.classification)
    };
  }

  return result;
}

module.exports = {
  classifyIndicator,
  mapToFPS,
  mapToGPS,
  classifyAllIndicators,
  THRESHOLDS,
  FPS_MAP,
  GPS_MAP
};
