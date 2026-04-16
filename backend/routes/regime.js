const express = require('express');
const router = express.Router();
const { calculateRegime } = require('../services/regimeCalculator');
const { calculateEnhancedRegime } = require('../services/enhancedRegimeCalculator');
const { getMacroRefreshStatus, refreshMacro } = require('../services/refreshService');

// GET /api/regime - Get current macro regime with refresh metadata
router.get('/', (req, res) => {
  const refresh = getMacroRefreshStatus();

  try {
    const useBasic = req.query.basic === 'true';
    const regime = useBasic ? calculateRegime() : calculateEnhancedRegime();

    res.json({
      ...regime,
      available: true,
      refresh
    });
  } catch (error) {
    console.error('Error calculating regime:', error.message);
    res.json({
      available: false,
      error: error.message,
      refresh,
      interpretation: []
    });
  }
});

// POST /api/regime/refresh - Refresh macro data
router.post('/refresh', async (req, res) => {
  try {
    const days = Number.isFinite(Number(req.body?.days)) ? Number(req.body.days) : 365;
    const macro = await refreshMacro(days);

    res.json({
      success: macro.status !== 'failed',
      status: macro.status,
      message: macro.message,
      macro
    });
  } catch (error) {
    console.error('Error refreshing macro data:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
