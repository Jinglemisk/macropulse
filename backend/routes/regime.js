const express = require('express');
const router = express.Router();
const { calculateRegime } = require('../services/regimeCalculator');

// GET /api/regime - Get current macro regime
router.get('/', (req, res) => {
  try {
    const regime = calculateRegime();
    res.json(regime);
  } catch (error) {
    console.error('Error calculating regime:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
