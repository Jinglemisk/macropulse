const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/stocks.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create tables if they don't exist
function initializeTables() {
  // Stocks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS stocks (
      ticker TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      sector TEXT,
      added_date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      last_updated TEXT
    )
  `);

  // Fundamentals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS fundamentals (
      ticker TEXT PRIMARY KEY,
      revenue_growth REAL,
      eps_growth REAL,
      pe_forward REAL,
      debt_ebitda REAL,
      eps_positive INTEGER,
      ebitda_positive INTEGER,
      pe_available INTEGER,
      latest_price REAL,
      price_timestamp TEXT,
      fetch_date TEXT NOT NULL,
      FOREIGN KEY (ticker) REFERENCES stocks(ticker) ON DELETE CASCADE
    )
  `);

  // Classification history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS classification_history (
      ticker TEXT NOT NULL,
      date TEXT NOT NULL,
      a_score REAL NOT NULL,
      b_score REAL NOT NULL,
      c_score REAL NOT NULL,
      d_score REAL NOT NULL,
      final_class TEXT NOT NULL,
      confidence REAL NOT NULL,
      PRIMARY KEY (ticker, date),
      FOREIGN KEY (ticker) REFERENCES stocks(ticker) ON DELETE CASCADE
    )
  `);

  // Macro data table
  db.exec(`
    CREATE TABLE IF NOT EXISTS macro_data (
      date TEXT PRIMARY KEY,
      walcl REAL,
      dff REAL,
      fetched_at TEXT
    )
  `);

  // ✅ NEW (Phase 6): Add expanded macro indicators if they don't exist
  // Using ALTER TABLE for backwards compatibility
  const columns = db.prepare("PRAGMA table_info(macro_data)").all();
  const columnNames = columns.map(c => c.name);

  if (!columnNames.includes('t10y2y')) {
    console.log('📊 Adding T10Y2Y (yield curve) column to macro_data...');
    db.exec('ALTER TABLE macro_data ADD COLUMN t10y2y REAL');
  }

  if (!columnNames.includes('unrate')) {
    console.log('📊 Adding UNRATE (unemployment) column to macro_data...');
    db.exec('ALTER TABLE macro_data ADD COLUMN unrate REAL');
  }

  if (!columnNames.includes('cpiaucsl')) {
    console.log('📊 Adding CPIAUCSL (inflation) column to macro_data...');
    db.exec('ALTER TABLE macro_data ADD COLUMN cpiaucsl REAL');
  }

  // API cache table
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_cache (
      cache_key TEXT PRIMARY KEY,
      response_data TEXT NOT NULL,
      cached_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_classification_history_ticker
    ON classification_history(ticker)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_classification_history_date
    ON classification_history(date)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_api_cache_expires
    ON api_cache(expires_at)
  `);

  console.log('Database tables initialized');
}

// Initialize tables on module load
initializeTables();

// Export db instance and prepare method
module.exports = db;
