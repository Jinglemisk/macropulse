const cron = require('node-cron');
const db = require('../database');
const { getFundamentals } = require('../apis/fmp');
const { classifyStock } = require('./classifier');
const { updateMacroData } = require('../apis/fred');
const { clearExpiredCache } = require('../apis/cache');

/**
 * Schedule daily updates
 */
function startScheduler() {
  // Run every day at 8 AM
  cron.schedule('0 8 * * *', async () => {
    console.log(`\n[${new Date().toISOString()}] Running daily data refresh...`);

    try {
      // Update macro data (last 90 days)
      await updateMacroData(90);

      // Get all stocks
      const stocks = db.prepare('SELECT ticker FROM stocks').all();

      // Refresh each stock
      for (const { ticker } of stocks) {
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

          // Add classification history
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

          console.log(`  ✓ Refreshed ${ticker}`);
        } catch (error) {
          console.error(`  ✗ Failed to refresh ${ticker}:`, error.message);
        }
      }

      // Clear expired cache
      clearExpiredCache();

      console.log('Daily refresh complete\n');
    } catch (error) {
      console.error('Daily refresh failed:', error);
    }
  });

  console.log('✓ Scheduler initialized (daily updates at 8 AM)');
}

module.exports = { startScheduler };
