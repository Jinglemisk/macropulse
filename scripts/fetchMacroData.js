#!/usr/bin/env node

/**
 * Fetch macro data from FRED
 * This should be run once to populate historical data
 */

require('dotenv').config();
const { updateMacroData } = require('../backend/apis/fred');

console.log('Fetching macro data from FRED...\n');

const days = process.argv[2] ? parseInt(process.argv[2]) : 365;

updateMacroData(days)
  .then(count => {
    console.log(`\n✓ Successfully fetched ${count} days of macro data`);
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
