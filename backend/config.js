require('dotenv').config();

module.exports = {
  // Class targets and halfwidths
  classTargets: {
    A: {
      revenueGrowth: { center: 5, halfwidth: 5 },
      epsGrowth: { center: 5, halfwidth: 5 },
      peForward: { center: 10, halfwidth: 6 },
      debtEbitda: { center: 1.0, halfwidth: 1.0 }
    },
    B: {
      revenueGrowth: { center: 10, halfwidth: 5 },
      epsGrowth: { center: 10, halfwidth: 7 },
      peForward: { center: 20, halfwidth: 6 },
      debtEbitda: { center: 3.0, halfwidth: 1.5 }
    },
    C: {
      revenueGrowth: { center: 20, halfwidth: 10 },
      epsGrowth: { center: 10, halfwidth: 10 },
      peForward: { center: 25, halfwidth: 10 },
      debtEbitda: { center: 5.0, halfwidth: 2.0 }
    },
    D: {
      revenueGrowthThreshold: 50,  // Gate trigger
      // Fallback scoring (if gates don't trigger)
      revenueGrowth: { center: 60, halfwidth: 30 },
      epsGrowth: { center: 80, halfwidth: 40 },
      peForward: { center: 150, halfwidth: 100 },
      debtEbitda: { center: 8.0, halfwidth: 4.0 }  // High leverage signals hypergrowth
    }
  },

  // Confidence thresholds for UI
  confidenceTiers: {
    high: 0.40,
    medium: 0.20
  },

  // API keys
  apiKeys: {
    fmp: process.env.FMP_API_KEY || '',
    fred: process.env.FRED_API_KEY || ''
  },

  // Server port
  port: process.env.PORT || 3001,

  // Cache TTL (24 hours in milliseconds)
  cacheTTL: (process.env.CACHE_TTL_HOURS || 24) * 60 * 60 * 1000,

  // ✅ FPS/GPS Enhancement: Configuration
  fps: {
    weights: {
      unemployment: 1.5,
      jobless_claims: 1.0,
      nonfarm_payrolls: 1.5,
      cpi_yoy: 1.5,
      core_cpi_yoy: 2.0,
      ppi: 1.0,
      ism_manufacturing: 1.0,
      ism_services: 1.0,
      chicago_pmi: 0.5,
      consumer_confidence: 0.5
    },
    tiltMagnitude: 0.25  // k parameter (25% max shift)
  },

  gps: {
    weights: {
      unemployment: 1.5,
      jobless_claims: 1.0,
      nonfarm_payrolls: 2.0,
      // Note: CPI, Core CPI, PPI not used in GPS
      ism_manufacturing: 1.5,
      ism_services: 1.5,
      chicago_pmi: 0.5,
      consumer_confidence: 1.0
    },
    tieBreakThreshold: 0.2,  // |FPS| threshold for GPS to activate
    strongThreshold: 0.3     // GPS threshold for tie-break
  },

  // Indicator thresholds for FPS/GPS classification
  thresholds: {
    unemployment: { low: 4.0, high: 5.5 },
    jobless_claims: { low: 250000, high: 350000 },
    nonfarm_payrolls: { low: 50000, high: 250000 },
    cpi_yoy: { low: 2.0, high: 3.0 },
    core_cpi_yoy: { low: 2.0, high: 3.0 },
    ppi: { low: 0, high: 0.2 },
    ism_manufacturing: { low: 50, high: 55 },
    ism_services: { low: 50, high: 55 },
    chicago_pmi: { low: 50, high: 55 },
    consumer_confidence: { low: 100, high: 120 }
  },

  // Base allocations by regime
  baseAllocations: {
    'Most Liquid': { A: 10, B: 20, C: 30, D: 40 },
    'In Between (prefer C)': { A: 15, B: 25, C: 40, D: 20 },
    'In Between (prefer B)': { A: 15, B: 40, C: 30, D: 15 },
    'Least Liquid': { A: 60, B: 30, C: 10, D: 0 }
  }
};
