const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/portfolio/summary - Portfolio statistics
router.get('/summary', (req, res) => {
  try {
    // Get total stocks
    const totalStocks = db.prepare('SELECT COUNT(*) as count FROM stocks').get().count;

    // Get stocks by class
    const byClassQuery = `
      SELECT final_class, COUNT(*) as count
      FROM (
        SELECT ticker, final_class
        FROM classification_history
        WHERE (ticker, date) IN (
          SELECT ticker, MAX(date)
          FROM classification_history
          GROUP BY ticker
        )
      )
      GROUP BY final_class
    `;

    const byClassRows = db.prepare(byClassQuery).all();
    const byClass = { A: 0, B: 0, C: 0, D: 0 };
    byClassRows.forEach(row => {
      if (row.final_class) {
        byClass[row.final_class] = row.count;
      }
    });

    // Get average confidence
    const avgConfQuery = `
      SELECT AVG(confidence) as avg_conf
      FROM (
        SELECT ticker, confidence
        FROM classification_history
        WHERE (ticker, date) IN (
          SELECT ticker, MAX(date)
          FROM classification_history
          GROUP BY ticker
        )
      )
    `;
    const avgConf = db.prepare(avgConfQuery).get().avg_conf || 0;

    // Get low confidence count
    const lowConfQuery = `
      SELECT COUNT(*) as count
      FROM (
        SELECT ticker, confidence
        FROM classification_history
        WHERE (ticker, date) IN (
          SELECT ticker, MAX(date)
          FROM classification_history
          GROUP BY ticker
        )
      )
      WHERE confidence < 0.20
    `;
    const lowConfCount = db.prepare(lowConfQuery).get().count;

    // Get last refresh time
    const lastRefresh = db.prepare('SELECT MAX(last_updated) as last FROM stocks').get().last;

    res.json({
      totalStocks,
      byClass,
      avgConfidence: Math.round(avgConf * 100) / 100,
      lowConfidenceCount: lowConfCount,
      lastRefresh
    });
  } catch (error) {
    console.error('Error getting portfolio summary:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
