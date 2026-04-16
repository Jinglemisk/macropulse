const express = require('express');
const router = express.Router();
const { sanitizeTicker } = require('../utils/validators');
const { refreshAll } = require('../services/refreshService');

router.post('/', async (req, res) => {
  try {
    const tickers = Array.isArray(req.body?.tickers)
      ? req.body.tickers.map(sanitizeTicker).filter(Boolean)
      : undefined;

    const result = await refreshAll(tickers);
    res.json(result);
  } catch (error) {
    console.error('Error running master refresh:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
