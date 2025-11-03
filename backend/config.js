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
  cacheTTL: (process.env.CACHE_TTL_HOURS || 24) * 60 * 60 * 1000
};
