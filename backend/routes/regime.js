const express = require('express');
const router = express.Router();
const { calculateRegime } = require('../services/regimeCalculator');
const { calculateEnhancedRegime } = require('../services/enhancedRegimeCalculator');

// GET /api/regime - Get current macro regime with FPS/GPS enhancement
router.get('/', (req, res) => {
  try {
    // ✅ FPS/GPS Enhancement: Use enhanced calculator by default
    // Query param ?basic=true for legacy mode
    const useBasic = req.query.basic === 'true';

    if (useBasic) {
      const regime = calculateRegime();
      res.json(regime);
    } else {
      const enhancedRegime = calculateEnhancedRegime();
      res.json(enhancedRegime);
    }
  } catch (error) {
    console.error('Error calculating regime:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
