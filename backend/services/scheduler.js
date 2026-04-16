const cron = require('node-cron');
const { refreshAll } = require('./refreshService');

function startScheduler() {
  cron.schedule('0 8 * * *', async () => {
    console.log(`\n[${new Date().toISOString()}] Running daily data refresh...`);

    try {
      const result = await refreshAll(undefined, { macroDays: 90 });

      console.log(`Quotes: ${result.domains.quotes.succeeded}/${result.domains.quotes.requested} succeeded`);
      console.log(`Details: ${result.domains.details.succeeded}/${result.domains.details.requested} succeeded`);
      console.log(`Macro: ${result.domains.macro.status}`);
      console.log('Daily refresh complete\n');
    } catch (error) {
      console.error('Daily refresh failed:', error);
    }
  });

  console.log('✓ Scheduler initialized (daily updates at 8 AM)');
}

module.exports = { startScheduler };
