const express = require('express');
const router = express.Router();
const db = require('../database');
const { getFundamentals } = require('../apis/fmp');
const { classifyStock } = require('../services/classifier');
const { sanitizeTicker, isValidTicker } = require('../utils/validators');

// GET /api/stocks - List all stocks with classifications
router.get('/', (req, res) => {
  try {
    const { class: classFilter, minConfidence, sector } = req.query;

    // Get all stocks with fundamentals
    let query = `
      SELECT
        s.*,
        f.*,
        ch.a_score, ch.b_score, ch.c_score, ch.d_score,
        ch.final_class, ch.confidence
      FROM stocks s
      LEFT JOIN fundamentals f ON s.ticker = f.ticker
      LEFT JOIN (
        SELECT ticker, a_score, b_score, c_score, d_score, final_class, confidence
        FROM classification_history
        WHERE (ticker, date) IN (
          SELECT ticker, MAX(date)
          FROM classification_history
          GROUP BY ticker
        )
      ) ch ON s.ticker = ch.ticker
    `;

    const stocks = db.prepare(query).all();

    // Format response
    let result = stocks.map(row => ({
      ticker: row.ticker,
      companyName: row.company_name,
      sector: row.sector,
      fundamentals: {
        revenueGrowth: row.revenue_growth,
        epsGrowth: row.eps_growth,
        peForward: row.pe_forward,
        debtEbitda: row.debt_ebitda,
        latestPrice: row.latest_price,
        priceTimestamp: row.price_timestamp
      },
      classification: row.final_class ? {
        class: row.final_class,
        confidence: row.confidence,
        scores: {
          A: row.a_score,
          B: row.b_score,
          C: row.c_score,
          D: row.d_score
        }
      } : null,
      notes: row.notes,
      lastUpdated: row.last_updated
    }));

    // Apply filters
    if (classFilter) {
      result = result.filter(s => s.classification?.class === classFilter);
    }
    if (minConfidence) {
      const minConf = parseFloat(minConfidence);
      result = result.filter(s => s.classification?.confidence >= minConf);
    }
    if (sector) {
      result = result.filter(s => s.sector === sector);
    }

    res.json({ stocks: result, count: result.length });
  } catch (error) {
    console.error('Error fetching stocks:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/stocks - Add new stock
router.post('/', async (req, res) => {
  try {
    const { ticker } = req.body;
    const sanitized = sanitizeTicker(ticker);

    if (!isValidTicker(sanitized)) {
      return res.status(400).json({ error: 'Invalid ticker format' });
    }

    // Check if already exists
    const existing = db.prepare('SELECT ticker FROM stocks WHERE ticker = ?').get(sanitized);
    if (existing) {
      return res.status(400).json({ error: 'Stock already in portfolio' });
    }

    // Fetch fundamentals
    const fundamentals = await getFundamentals(sanitized);

    // Insert stock
    db.prepare(`
      INSERT INTO stocks (ticker, company_name, sector, added_date, last_updated)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      sanitized,
      fundamentals.companyName,
      fundamentals.sector,
      new Date().toISOString(),
      new Date().toISOString()
    );

    // Insert fundamentals
    db.prepare(`
      INSERT INTO fundamentals (
        ticker, revenue_growth, eps_growth, pe_forward, debt_ebitda,
        eps_positive, ebitda_positive, pe_available,
        latest_price, price_timestamp, fetch_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sanitized,
      fundamentals.revenueGrowth,
      fundamentals.epsGrowth,
      fundamentals.peForward,
      fundamentals.debtEbitda,
      fundamentals.epsPositive ? 1 : 0,
      fundamentals.ebitdaPositive ? 1 : 0,
      fundamentals.peAvailable ? 1 : 0,
      fundamentals.latestPrice,
      fundamentals.priceTimestamp,
      new Date().toISOString()
    );

    // Classify
    const classification = classifyStock(fundamentals);

    // Store classification history
    db.prepare(`
      INSERT INTO classification_history (ticker, date, a_score, b_score, c_score, d_score, final_class, confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sanitized,
      new Date().toISOString().split('T')[0],
      classification.scores.A,
      classification.scores.B,
      classification.scores.C,
      classification.scores.D,
      classification.finalClass,
      classification.confidence
    );

    res.status(201).json({
      ticker: sanitized,
      companyName: fundamentals.companyName,
      sector: fundamentals.sector,
      fundamentals,
      classification,
      notes: '',
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding stock:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/stocks/:ticker - Remove stock
router.delete('/:ticker', (req, res) => {
  try {
    const { ticker } = req.params;
    const sanitized = sanitizeTicker(ticker);

    const result = db.prepare('DELETE FROM stocks WHERE ticker = ?').run(sanitized);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    res.json({ message: 'Stock deleted', ticker: sanitized });
  } catch (error) {
    console.error('Error deleting stock:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/stocks/:ticker/notes - Update notes
router.put('/:ticker/notes', (req, res) => {
  try {
    const { ticker } = req.params;
    const { notes } = req.body;
    const sanitized = sanitizeTicker(ticker);

    const result = db.prepare('UPDATE stocks SET notes = ? WHERE ticker = ?').run(notes || '', sanitized);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    res.json({ message: 'Notes updated', ticker: sanitized });
  } catch (error) {
    console.error('Error updating notes:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/stocks/refresh - Refresh stock data
router.post('/refresh', async (req, res) => {
  try {
    const { tickers } = req.body;

    // Get tickers to refresh
    let tickersToRefresh;
    if (tickers && Array.isArray(tickers)) {
      tickersToRefresh = tickers.map(sanitizeTicker);
    } else {
      // Refresh all
      tickersToRefresh = db.prepare('SELECT ticker FROM stocks').all().map(row => row.ticker);
    }

    const results = [];

    for (const ticker of tickersToRefresh) {
      try {
        const fundamentals = await getFundamentals(ticker);
        const classification = classifyStock(fundamentals);

        // Update fundamentals
        db.prepare(`
          UPDATE fundamentals
          SET revenue_growth = ?, eps_growth = ?, pe_forward = ?, debt_ebitda = ?,
              eps_positive = ?, ebitda_positive = ?, pe_available = ?,
              latest_price = ?, price_timestamp = ?, fetch_date = ?
          WHERE ticker = ?
        `).run(
          fundamentals.revenueGrowth,
          fundamentals.epsGrowth,
          fundamentals.peForward,
          fundamentals.debtEbitda,
          fundamentals.epsPositive ? 1 : 0,
          fundamentals.ebitdaPositive ? 1 : 0,
          fundamentals.peAvailable ? 1 : 0,
          fundamentals.latestPrice,
          fundamentals.priceTimestamp,
          new Date().toISOString(),
          ticker
        );

        // Update classification history
        const today = new Date().toISOString().split('T')[0];
        db.prepare(`
          INSERT OR REPLACE INTO classification_history
          (ticker, date, a_score, b_score, c_score, d_score, final_class, confidence)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          ticker, today,
          classification.scores.A,
          classification.scores.B,
          classification.scores.C,
          classification.scores.D,
          classification.finalClass,
          classification.confidence
        );

        // Update last_updated
        db.prepare('UPDATE stocks SET last_updated = ? WHERE ticker = ?').run(new Date().toISOString(), ticker);

        results.push({ ticker, status: 'success' });
      } catch (error) {
        results.push({ ticker, status: 'failed', error: error.message });
      }
    }

    res.json({ results });
  } catch (error) {
    console.error('Error refreshing stocks:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
