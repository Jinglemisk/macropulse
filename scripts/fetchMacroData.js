#!/usr/bin/env node

/**
 * Fetch macro data from FRED
 * This should be run once to populate historical data
 */

require('dotenv').config();
const { refreshMacro } = require('../backend/services/refreshService');

console.log('Fetching macro data from FRED...\n');

const days = process.argv[2] ? Number.parseInt(process.argv[2], 10) : 365;

if (!Number.isInteger(days) || days <= 0) {
  console.error('Usage: npm run fetch-macro -- [positive number of days]');
  process.exit(1);
}

refreshMacro(days)
  .then(result => {
    console.log(`\n${result.status === 'failed' ? '✗' : '✓'} Processed ${result.updatedDays} days of macro data`);
    console.log(`${result.status === 'failed' ? '✗' : '✓'} Macro status: ${result.status}`);

    if (result.message) {
      console.log(`${result.status === 'failed' ? '✗' : '✓'} ${result.message}`);
    }

    if (result.failedSeries?.length) {
      console.log(`Failed series: ${result.failedSeries.join(', ')}`);
    }

    if (result.staleSeries?.length) {
      console.log(`Stale series: ${result.staleSeries.join(', ')}`);
    }

    if (result.status === 'failed' || result.updatedDays === 0) {
      console.error('\nMacro data was not refreshed. The database may still contain older data, but this fetch did not update it.\n');
      process.exit(1);
    }

    console.log('✓ Database is ready');
    console.log('\nYou can now start the server with: npm run dev\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Error fetching macro data:', error.message);
    console.error('\nMake sure:');
    console.error('1. You have a valid FRED_API_KEY in your .env file');
    console.error('2. You have internet connection');
    console.error('3. The database has been initialized (npm run init-db)\n');
    process.exit(1);
  });
