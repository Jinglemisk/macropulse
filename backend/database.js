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

  // ✅ FPS/GPS Enhancement: Add 8 new macro indicator columns
  if (!columnNames.includes('jobless_claims')) {
    console.log('📊 Adding jobless_claims (ICSA) column to macro_data...');
    db.exec('ALTER TABLE macro_data ADD COLUMN jobless_claims REAL');
  }

  if (!columnNames.includes('nonfarm_payrolls')) {
    console.log('📊 Adding nonfarm_payrolls (PAYEMS) column to macro_data...');
    db.exec('ALTER TABLE macro_data ADD COLUMN nonfarm_payrolls REAL');
  }

  if (!columnNames.includes('core_cpi')) {
    console.log('📊 Adding core_cpi (CPILFESL) column to macro_data...');
    db.exec('ALTER TABLE macro_data ADD COLUMN core_cpi REAL');
  }

  if (!columnNames.includes('ppi')) {
    console.log('📊 Adding ppi (PPIACO) column to macro_data...');
    db.exec('ALTER TABLE macro_data ADD COLUMN ppi REAL');
  }

  if (!columnNames.includes('ism_manufacturing')) {
    console.log('📊 Adding ism_manufacturing (NAPMPI) column to macro_data...');
    db.exec('ALTER TABLE macro_data ADD COLUMN ism_manufacturing REAL');
  }

  if (!columnNames.includes('ism_services')) {
    console.log('📊 Adding ism_services (NAPMSI) column to macro_data...');
    db.exec('ALTER TABLE macro_data ADD COLUMN ism_services REAL');
  }

  if (!columnNames.includes('chicago_pmi')) {
    console.log('📊 Adding chicago_pmi column to macro_data...');
    db.exec('ALTER TABLE macro_data ADD COLUMN chicago_pmi REAL');
  }

  if (!columnNames.includes('consumer_confidence')) {
    console.log('📊 Adding consumer_confidence (UMCSENT) column to macro_data...');
    db.exec('ALTER TABLE macro_data ADD COLUMN consumer_confidence REAL');
  }

  // ✅ FPS/GPS Enhancement: Add moving average columns for all 10 indicators
  if (!columnNames.includes('unrate_ma3')) {
    console.log('📊 Adding moving average columns for FPS/GPS calculations...');
    db.exec(`
      ALTER TABLE macro_data ADD COLUMN unrate_ma3 REAL;
      ALTER TABLE macro_data ADD COLUMN jobless_claims_ma3 REAL;
      ALTER TABLE macro_data ADD COLUMN nonfarm_payrolls_ma3 REAL;
      ALTER TABLE macro_data ADD COLUMN cpi_yoy_ma3 REAL;
      ALTER TABLE macro_data ADD COLUMN core_cpi_yoy_ma3 REAL;
      ALTER TABLE macro_data ADD COLUMN ppi_ma3 REAL;
      ALTER TABLE macro_data ADD COLUMN ism_manufacturing_ma3 REAL;
      ALTER TABLE macro_data ADD COLUMN ism_services_ma3 REAL;
      ALTER TABLE macro_data ADD COLUMN chicago_pmi_ma3 REAL;
      ALTER TABLE macro_data ADD COLUMN consumer_confidence_ma3 REAL;
    `);
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

  // ✅ FPS/GPS Enhancement: Regime history table for tracking scores over time
  db.exec(`
    CREATE TABLE IF NOT EXISTS regime_history (
      date TEXT PRIMARY KEY,
      regime TEXT NOT NULL,
      regime_confidence REAL NOT NULL,

      -- Scores
      fps REAL NOT NULL,
      gps REAL NOT NULL,
      fps_confidence REAL,
      overall_confidence REAL NOT NULL,

      -- Allocation
      allocation_a REAL NOT NULL,
      allocation_b REAL NOT NULL,
      allocation_c REAL NOT NULL,
      allocation_d REAL NOT NULL,

      -- Metadata (JSON)
      fps_breakdown TEXT,
      gps_breakdown TEXT,
      warnings TEXT,

      recorded_at TEXT NOT NULL
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

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_regime_history_date
    ON regime_history(date DESC)
  `);

  console.log('✅ Database tables initialized (FPS/GPS enhanced schema)');
}

// Initialize tables on module load
initializeTables();

// Export db instance and prepare method
module.exports = db;
