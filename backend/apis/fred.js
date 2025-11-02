const fetch = require('node-fetch');
const config = require('../config');
const db = require('../database');

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';
const API_KEY = config.apiKeys.fred;

/**
 * Fetch and store FRED data for WALCL and DFF
 * @param {number} days - Number of days to fetch (default 365)
 */
async function updateMacroData(days = 365) {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    console.log(`Fetching FRED macro data from ${startDate} to ${endDate}...`);

    // Fetch WALCL (Fed Balance Sheet)
    const walclData = await fetchSeries('WALCL', startDate, endDate);

    // Fetch DFF (Fed Funds Rate)
    const dffData = await fetchSeries('DFF', startDate, endDate);

    // Merge by date and insert into DB
    const dateMap = new Map();

    walclData.forEach(obs => {
      if (obs.value !== '.') {  // FRED uses '.' for missing data
        if (!dateMap.has(obs.date)) dateMap.set(obs.date, {});
        dateMap.get(obs.date).walcl = parseFloat(obs.value);
      }
    });

    dffData.forEach(obs => {
      if (obs.value !== '.') {
        if (!dateMap.has(obs.date)) dateMap.set(obs.date, {});
        dateMap.get(obs.date).dff = parseFloat(obs.value);
      }
    });

    // Insert/update in database
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO macro_data (date, walcl, dff, fetched_at)
      VALUES (?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    let count = 0;

    for (const [date, values] of dateMap) {
      if (values.walcl && values.dff) {  // Only insert if both metrics exist
        insertStmt.run(date, values.walcl, values.dff, now);
        count++;
      }
    }

    console.log(`Updated ${count} days of macro data`);
    return count;
  } catch (error) {
    console.error('FRED API error:', error.message);
    throw error;
  }
}

async function fetchSeries(seriesId, startDate, endDate) {
  const url = `${FRED_BASE_URL}?series_id=${seriesId}&api_key=${API_KEY}&file_type=json&observation_start=${startDate}&observation_end=${endDate}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`FRED HTTP ${response.status}`);
  }

  const json = await response.json();
  return json.observations || [];
}

module.exports = { updateMacroData };
