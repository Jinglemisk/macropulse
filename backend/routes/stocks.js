const express = require('express');
const router = express.Router();
const db = require('../database');
const { sanitizeTicker, isValidTicker } = require('../utils/validators');
const {
  parseJsonArray,
  refreshDetails,
  refreshQuotes,
  refreshStockDetails,
  refreshStockQuote,
  refreshStocksAll
} = require('../services/refreshService');

function sanitizeTickers(tickers) {
  if (!Array.isArray(tickers)) {
    return undefined;
  }

  return tickers.map(sanitizeTicker).filter(Boolean);
}

function buildStockPayload(row) {
  return {
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
    refresh: {
      quote: {
        status: row.last_quote_refresh_status || 'never',
        lastRefreshedAt: row.last_quote_refresh_at,
        lastSuccessfulAt: row.last_successful_quote_refresh_at,
        error: row.last_quote_refresh_error,
        warning: row.quote_data_warning,
        source: row.data_source_quote
      },
      detail: {
        status: row.last_detail_refresh_status || 'never',
        lastRefreshedAt: row.last_detail_refresh_at,
        lastSuccessfulAt: row.last_successful_detail_refresh_at,
        error: row.last_detail_refresh_error,
        warning: row.detail_data_warning,
        source: row.data_source_detail,
        isPartial: Boolean(row.detail_is_partial),
        missingFields: parseJsonArray(row.detail_missing_fields),
        classificationStatus: row.classification_status || 'never',
        classificationWarning: row.classification_warning,
        classificationEligible: Boolean(row.classification_eligible)
      }
    },
    notes: row.notes,
    lastUpdated: row.last_updated
  };
}

function getStocksBaseQuery() {
  return `
    SELECT
      s.*,
      f.*,
      rs.last_quote_refresh_at,
      rs.last_detail_refresh_at,
      rs.last_quote_refresh_status,
      rs.last_detail_refresh_status,
      rs.last_quote_refresh_error,
      rs.last_detail_refresh_error,
      rs.last_successful_quote_refresh_at,
      rs.last_successful_detail_refresh_at,
      rs.data_source_quote,
      rs.data_source_detail,
      rs.quote_data_warning,
      rs.detail_data_warning,
      rs.detail_is_partial,
      rs.detail_missing_fields,
      rs.classification_status,
      rs.classification_warning,
      rs.classification_eligible,
      ch.a_score,
      ch.b_score,
      ch.c_score,
      ch.d_score,
      ch.final_class,
      ch.confidence
    FROM stocks s
    LEFT JOIN fundamentals f ON s.ticker = f.ticker
    LEFT JOIN stock_refresh_status rs ON s.ticker = rs.ticker
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
}

function getStockByTicker(ticker) {
  const query = `${getStocksBaseQuery()} WHERE s.ticker = ?`;
  return db.prepare(query).get(ticker);
}

// GET /api/stocks - List all stocks with refresh metadata
router.get('/', (req, res) => {
  try {
    const { class: classFilter, minConfidence, sector } = req.query;
    const stocks = db.prepare(getStocksBaseQuery()).all();

    let result = stocks.map(buildStockPayload);

    if (classFilter) {
      result = result.filter(stock => stock.classification?.class === classFilter);
    }

    if (minConfidence) {
      const minConf = parseFloat(minConfidence);
      result = result.filter(stock => stock.classification?.confidence >= minConf);
    }

    if (sector) {
      result = result.filter(stock => stock.sector === sector);
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

    const existing = db.prepare('SELECT ticker FROM stocks WHERE ticker = ?').get(sanitized);
    if (existing) {
      return res.status(400).json({ error: 'Stock already in portfolio' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO stocks (ticker, company_name, sector, added_date, last_updated)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      sanitized,
      sanitized,
      null,
      now,
      null
    );

    const quoteResult = await refreshStockQuote(sanitized);
    const detailResult = await refreshStockDetails(sanitized);

    if (quoteResult.status === 'failed' && detailResult.status === 'failed') {
      db.prepare('DELETE FROM stocks WHERE ticker = ?').run(sanitized);
      return res.status(502).json({
        error: `Unable to add ${sanitized}: quote and detail refresh both failed.`,
        results: {
          quote: quoteResult,
          detail: detailResult
        }
      });
    }

    const row = getStockByTicker(sanitized);
    res.status(201).json(buildStockPayload(row));
  } catch (error) {
    console.error('Error adding stock:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/stocks/refresh/quotes - Refresh quote data
router.post('/refresh/quotes', async (req, res) => {
  try {
    const tickers = sanitizeTickers(req.body?.tickers);
    const quotes = await refreshQuotes(tickers);
    res.json({
      success: quotes.status !== 'failed',
      status: quotes.status,
      message: quotes.message,
      domains: {
        quotes
      }
    });
  } catch (error) {
    console.error('Error refreshing quotes:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/stocks/refresh/details - Refresh detail data
router.post('/refresh/details', async (req, res) => {
  try {
    const tickers = sanitizeTickers(req.body?.tickers);
    const details = await refreshDetails(tickers);
    res.json({
      success: details.status !== 'failed',
      status: details.status,
      message: details.message,
      domains: {
        details
      }
    });
  } catch (error) {
    console.error('Error refreshing details:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/stocks/refresh/all - Refresh quote and detail data
router.post('/refresh/all', async (req, res) => {
  try {
    const tickers = sanitizeTickers(req.body?.tickers);
    const result = await refreshStocksAll(tickers);
    res.json(result);
  } catch (error) {
    console.error('Error refreshing stock data:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/stocks/refresh - Backwards-compatible alias for /refresh/all
router.post('/refresh', async (req, res) => {
  try {
    const tickers = sanitizeTickers(req.body?.tickers);
    const result = await refreshStocksAll(tickers);
    res.json(result);
  } catch (error) {
    console.error('Error refreshing stock data:', error);
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

module.exports = router;
