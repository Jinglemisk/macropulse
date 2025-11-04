# Investment Dashboard - Complete Implementation Guide

> **One-Stop-Shop Reference for Building a Locally-Hosted Finance Dashboard**
>
> A hobby project for tracking stock classifications across macro regimes using a fuzzy scoring system.

--

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Database Schema](#database-schema)
4. [Backend Design](#backend-design)
5. [Classification System](#classification-system)
6. [Regime Calculation](#regime-calculation)
7. [Frontend Components](#frontend-components)
8. [UI/UX Specifications](#uiux-specifications)
9. [API Integration Strategy](#api-integration-strategy)
10. [Configuration & Customization](#configuration--customization)
11. [Development Roadmap](#development-roadmap)
12. [Testing & Validation](#testing--validation)
13. [File Structure](#file-structure)
14. [Setup Instructions](#setup-instructions)

---

## Project Overview

### Purpose
Build a Bloomberg Terminal-inspired dashboard to:
- Classify stocks into Classes A/B/C/D based on fundamental metrics
- Determine current macro regime (Fed balance sheet + interest rates)
- Filter and display stocks appropriate for the current regime
- Track portfolio with persistent storage
- Provide confidence scores for all classifications

### Core Philosophy
- **Clean Code**: Isolated, reusable components
- **Configurability**: Easy to adjust formulas, colors, and thresholds
- **API Conservation**: Cache aggressively, batch updates, respect rate limits
- **Graceful Degradation**: Handle missing data and API failures elegantly

### MVP vs v2 Features

**MVP (Minimum Viable Product):**
- ✅ Add/remove stocks by ticker
- ✅ Fetch fundamentals and calculate A/B/C/D scores
- ✅ Display current macro regime
- ✅ Show all stocks with class, confidence, color-coding
- ✅ Filter by regime preference and confidence level
- ✅ Per-stock notes (markdown support)
- ✅ Persist everything locally (SQLite)
- ✅ Store historical classification data
- ✅ Display latest daily price with timestamp
- ✅ Show sector information

**v2 (Future Enhancements):**
- ❌ Historical regime tracking charts
- ❌ Classification history graphs (over time)
- ❌ TradingView price charts
- ❌ Export to CSV
- ❌ Calculated portfolio allocation percentages
- ❌ API usage dashboard
- ❌ Sector-specific classification models

---

## Architecture & Tech Stack

### Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  - Stock table with filters                                 │
│  - Regime display                                            │
│  - Add stock form                                            │
│  - Notes panel                                               │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP (REST API)
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Node.js + Express)                │
│  - API endpoints (/api/stocks, /api/regime)                 │
│  - Classification engine                                     │
│  - Data fetching & caching layer                            │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  OpenBB Platform Integration                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Node.js Bridge (openbb.js)                           │  │
│  │  - Spawns Python child processes                      │  │
│  │  - Handles JSON communication                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                            ↕                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Python Adapter (openbb_adapter.py)                   │  │
│  │  - OpenBB Platform v4.5.0                             │  │
│  │  - Provider fallback logic                            │  │
│  │  - Data normalization                                 │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│               Data Providers (via OpenBB)                    │
│  - yfinance (primary, free & unlimited)                     │
│  - Financial Modeling Prep (fallback)                       │
│  - Intrinio (fallback)                                       │
│  - FRED (5 macro series: WALCL, DFF, T10Y2Y, UNRATE, CPI)  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                 Local Storage (SQLite)                       │
│  - stocks table                                              │
│  - classification_history table                              │
│  - macro_data table (expanded to 5 series)                  │
│  - api_cache table                                           │
└─────────────────────────────────────────────────────────────┘
```

> **⚠️ IMPORTANT**: This project uses OpenBB Platform for unified API access.
> See [OPENBB_MIGRATION_GUIDE.md](./OPENBB_MIGRATION_GUIDE.md) for architecture details.

### Tech Stack

**Frontend:**
- React 18+ (with hooks)
- Recharts (simple line charts for v2)
- react-markdown (notes rendering)
- Tailwind CSS (utility-first styling)
- Axios (HTTP client)

**Backend:**
- Node.js 18+
- Express.js (REST API)
- better-sqlite3 (SQLite driver)
- **Python 3.10+** (for OpenBB Platform)
- **OpenBB Platform v4.5.0** (unified API gateway)
- Child process bridge (Node.js ↔ Python)

**Development:**
- Vite (fast dev server + build tool)
- ESLint + Prettier (code quality)
- Concurrently (run frontend + backend together)

---

## Database Schema

### File Location
`/data/stocks.db`

### Tables

#### 1. `stocks`
Primary table for portfolio stocks.

```sql
CREATE TABLE stocks (
    ticker TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    sector TEXT,
    added_date TEXT NOT NULL,  -- ISO 8601 format
    notes TEXT DEFAULT '',     -- Markdown-formatted notes
    last_updated TEXT          -- Last data fetch timestamp
);
```

#### 2. `fundamentals`
Latest fundamental metrics per stock.

```sql
CREATE TABLE fundamentals (
    ticker TEXT PRIMARY KEY,
    revenue_growth REAL,       -- % (NTM or blended)
    eps_growth REAL,           -- % (NTM)
    pe_forward REAL,           -- Forward P/E
    debt_ebitda REAL,          -- Net Debt / EBITDA
    eps_positive INTEGER,      -- Boolean: 1 or 0
    ebitda_positive INTEGER,   -- Boolean: 1 or 0
    pe_available INTEGER,      -- Boolean: 1 or 0
    latest_price REAL,         -- Latest closing price
    price_timestamp TEXT,      -- When price was fetched
    fetch_date TEXT NOT NULL,  -- When fundamentals were fetched
    FOREIGN KEY (ticker) REFERENCES stocks(ticker) ON DELETE CASCADE
);
```

#### 3. `classification_history`
Historical classification scores (one row per day per stock).

```sql
CREATE TABLE classification_history (
    ticker TEXT NOT NULL,
    date TEXT NOT NULL,        -- ISO 8601 date (YYYY-MM-DD)
    a_score REAL NOT NULL,
    b_score REAL NOT NULL,
    c_score REAL NOT NULL,
    d_score REAL NOT NULL,
    final_class TEXT NOT NULL, -- 'A', 'B', 'C', or 'D'
    confidence REAL NOT NULL,  -- 0.0 to 1.0
    PRIMARY KEY (ticker, date),
    FOREIGN KEY (ticker) REFERENCES stocks(ticker) ON DELETE CASCADE
);
```

#### 4. `macro_data`
Economic data from FRED (via OpenBB Platform).

```sql
CREATE TABLE macro_data (
    date TEXT PRIMARY KEY,     -- ISO 8601 date
    walcl REAL,                -- Fed Total Assets (Billions)
    dff REAL,                  -- Daily Federal Funds Rate (%)
    t10y2y REAL,               -- ✨ NEW: 10Y-2Y Treasury Yield Spread (%)
    unrate REAL,               -- ✨ NEW: Unemployment Rate (%)
    cpiaucsl REAL,             -- ✨ NEW: Consumer Price Index
    fetched_at TEXT            -- When this data was fetched
);
```

**Note**: The database schema was expanded during OpenBB migration to track 5 FRED series (was 2).
These columns are added automatically via `ALTER TABLE` if they don't exist.

#### 5. `api_cache`
Generic cache for API responses (24-hour TTL).

```sql
CREATE TABLE api_cache (
    cache_key TEXT PRIMARY KEY,  -- e.g., 'fmp_quote_AAPL'
    response_data TEXT NOT NULL, -- JSON string
    cached_at TEXT NOT NULL,     -- ISO 8601 timestamp
    expires_at TEXT NOT NULL     -- ISO 8601 timestamp
);
```

### Indexes

```sql
-- Speed up history queries
CREATE INDEX idx_classification_history_ticker ON classification_history(ticker);
CREATE INDEX idx_classification_history_date ON classification_history(date);

-- Speed up cache lookups
CREATE INDEX idx_api_cache_expires ON api_cache(expires_at);
```

---

## Backend Design

### Project Structure
```
backend/
├── server.js              # Express app entry point
├── database.js            # SQLite setup & query helpers
├── config.js              # Configuration (API keys, thresholds)
├── adapters/              # ✨ NEW: OpenBB Integration
│   └── openbb_adapter.py  # Python CLI for OpenBB Platform
├── apis/
│   ├── openbb.js          # ✨ NEW: Node.js → Python bridge
│   ├── fmp.js             # Fundamentals API (via OpenBB)
│   ├── fred.js            # FRED macro data (via OpenBB)
│   └── cache.js           # API caching layer (24-hour TTL)
├── routes/
│   ├── stocks.js          # Stock CRUD operations
│   ├── regime.js          # Macro regime endpoint
│   └── portfolio.js       # Portfolio summary
├── services/
│   ├── classifier.js      # Classification logic
│   ├── regimeCalculator.js# Regime calculation
│   └── scheduler.js       # Cron jobs for daily updates
└── utils/
    ├── formulas.js        # Triangular closeness function
    ├── validators.js      # Input validation
    └── providerHealth.js  # ✨ NEW: Provider health tracking
```

**Key Changes from OpenBB Migration:**
- **adapters/openbb_adapter.py**: Python script that interfaces with OpenBB Platform
- **apis/openbb.js**: Node.js bridge that spawns Python child processes
- **Provider redundancy**: fmp.js now tries multiple providers (yfinance → fmp → intrinio)
- **Health tracking**: providerHealth.js monitors provider success/failure rates

### API Endpoints

#### Stock Management

**GET /api/stocks**
- Returns all stocks in portfolio with latest classifications
- Query params: `?class=A&minConfidence=0.4&sector=Technology`
- Response:
```json
{
  "stocks": [
    {
      "ticker": "AAPL",
      "companyName": "Apple Inc.",
      "sector": "Technology",
      "fundamentals": {
        "revenueGrowth": 8.2,
        "epsGrowth": 9.1,
        "peForward": 22.3,
        "debtEbitda": 2.8,
        "latestPrice": 182.45,
        "priceTimestamp": "2024-10-30T20:00:00Z"
      },
      "classification": {
        "class": "B",
        "confidence": 0.76,
        "scores": {
          "A": 0.42,
          "B": 0.76,
          "C": 0.28,
          "D": 0.00
        }
      },
      "notes": "Watching Q2 earnings...",
      "lastUpdated": "2024-10-30T08:00:00Z"
    }
  ],
  "count": 1
}
```

**POST /api/stocks**
- Add new stock to portfolio
- Body: `{ "ticker": "AAPL" }`
- Response: Fetches fundamentals, calculates scores, returns stock object

**DELETE /api/stocks/:ticker**
- Remove stock from portfolio

**PUT /api/stocks/:ticker/notes**
- Update notes for a stock
- Body: `{ "notes": "## AAPL Notes\n- Thesis: Services growth" }`

**POST /api/stocks/refresh**
- Manually refresh all stock data (or specific tickers)
- Body: `{ "tickers": ["AAPL", "NVDA"] }` (optional)

#### Regime

**GET /api/regime**
- Returns current macro regime
- Response:
```json
{
  "regime": "Most Liquid",
  "description": "Low Rates + Balance Sheet Increasing",
  "recommendation": "Allocate 0-100%+ to Class D stocks",
  "metrics": {
    "fedFundsRate": 4.50,
    "rateIsLow": true,
    "balanceSheetSlope": 12500000000,
    "balanceSheetIncreasing": true,
    "ratePercentile": 0.35,
    "balanceSheetChange12w": 12.5
  },
  "asOf": "2024-10-30T08:00:00Z"
}
```

**GET /api/regime/history**
- Returns macro data history (for charting in v2)
- Query params: `?days=90`

#### Portfolio Summary

**GET /api/portfolio/summary**
- Portfolio-level statistics
- Response:
```json
{
  "totalStocks": 15,
  "byClass": {
    "A": 3,
    "B": 6,
    "C": 4,
    "D": 2
  },
  "avgConfidence": 0.58,
  "lowConfidenceCount": 2,
  "lastRefresh": "2024-10-30T08:00:00Z"
}
```

---

## Classification System

### Core Formula: Triangular Closeness Function

**Purpose:** Measure how close a metric is to an ideal target value, with linear falloff.

**Implementation** (`/backend/utils/formulas.js`):

```javascript
/**
 * Triangular closeness function
 * @param {number} x - Actual value
 * @param {number} center - Ideal target value
 * @param {number} halfwidth - Distance from center where score reaches 0
 * @returns {number} Score from 0.0 to 1.0
 */
function tri(x, center, halfwidth) {
  if (x === null || x === undefined || isNaN(x)) {
    return null;  // Signal missing data
  }
  return Math.max(0, 1 - Math.abs(x - center) / halfwidth);
}

module.exports = { tri };
```

**Example:**
```javascript
tri(8, 10, 5)   // = 0.6  (8 is 2 units away from 10, halfwidth is 5)
tri(10, 10, 5)  // = 1.0  (exact match)
tri(0, 10, 5)   // = 0.0  (10 units away, beyond halfwidth)
tri(16, 10, 5)  // = 0.0  (6 units away, capped at 0)
```

---

### Class Definitions & Scoring

**Configuration File** (`/backend/config.js`):

```javascript
module.exports = {
  // Class targets and halfwidths
  classTargets: {
    A: {
      revenueGrowth: { center: 5, halfwidth: 5 },
      epsGrowth: { center: 5, halfwidth: 5 },
      peForward: { center: 10, halfwidth: 6 },
      debtEbitda: { center: 1.0, halfwidth: 1.0 }
    },
    B: {
      revenueGrowth: { center: 10, halfwidth: 5 },
      epsGrowth: { center: 10, halfwidth: 7 },
      peForward: { center: 20, halfwidth: 6 },
      debtEbitda: { center: 3.0, halfwidth: 1.5 }
    },
    C: {
      revenueGrowth: { center: 20, halfwidth: 10 },
      epsGrowth: { center: 10, halfwidth: 10 },
      peForward: { center: 25, halfwidth: 10 },
      debtEbitda: { center: 5.0, halfwidth: 2.0 }
    },
    D: {
      revenueGrowthThreshold: 50,  // Gate trigger
      // Fallback scoring (if gates don't trigger)
      revenueGrowth: { center: 60, halfwidth: 30 },
      epsGrowth: { center: 80, halfwidth: 40 },
      peForward: { center: 150, halfwidth: 100 }
    }
  },

  // Confidence thresholds for UI
  confidenceTiers: {
    high: 0.40,
    medium: 0.20
  },

  // API keys
  apiKeys: {
    fmp: process.env.FMP_API_KEY || '',
    fred: process.env.FRED_API_KEY || ''
  },

  // Cache TTL (24 hours in milliseconds)
  cacheTTL: 24 * 60 * 60 * 1000
};
```

---

### Class D: Hypergrowth Stock Scoring

Class D represents hypergrowth companies and uses a unique two-tier scoring system:

#### Tier 1: Gate Triggers (Score = 1.0)
Any of these conditions automatically assigns a Class D score of 1.0:
- **Revenue Growth ≥ 50%** - Extreme hypergrowth
- **EPS not positive** - Pre-profit company
- **EBITDA not positive** - Pre-profit company
- **P/E not available** - No earnings to price

#### Tier 2: Multi-Metric Fallback (if gates don't trigger)
For profitable companies with moderate growth but hypergrowth characteristics, Class D uses a multi-metric approach averaging three scores:

1. **Revenue Growth**: center 60%, halfwidth 30% (range: 30-90%)
2. **EPS Growth**: center 80%, halfwidth 40% (range: 40-120%)
3. **P/E Forward**: center 150x, halfwidth 100x (range: 50-250x)

This captures "profitable hypergrowth" companies like PLTR that have:
- Moderate revenue growth (< 50%)
- Exceptional earnings growth (> 80%)
- Extreme valuations (> 100x P/E)

**Example: Palantir (PLTR)**
- Revenue Growth: 28.8% → tri(28.8, 60, 30) = 0%
- EPS Growth: 114.9% → tri(114.9, 80, 40) = 12.75%
- P/E: 621.2x → tri(621.2, 150, 100) = 0%
- **Class D Score: 4.25%** (average of three metrics)

---

### Classification Logic

**File:** `/backend/services/classifier.js`

```javascript
const { tri } = require('../utils/formulas');
const config = require('../config');

/**
 * Calculate class scores for a stock
 * @param {Object} fundamentals - { revenueGrowth, epsGrowth, peForward, debtEbitda, flags }
 * @returns {Object} - { A, B, C, D, finalClass, confidence }
 */
function classifyStock(fundamentals) {
  const { revenueGrowth, epsGrowth, peForward, debtEbitda } = fundamentals;
  const { epsPositive, ebitdaPositive, peAvailable } = fundamentals;

  // Extract targets from config
  const targets = config.classTargets;

  // --- Class A Score ---
  const aScores = [
    tri(revenueGrowth, targets.A.revenueGrowth.center, targets.A.revenueGrowth.halfwidth),
    tri(epsGrowth, targets.A.epsGrowth.center, targets.A.epsGrowth.halfwidth),
    tri(peForward, targets.A.peForward.center, targets.A.peForward.halfwidth),
    tri(debtEbitda, targets.A.debtEbitda.center, targets.A.debtEbitda.halfwidth)
  ].filter(score => score !== null);  // Exclude missing data

  const A = aScores.length > 0 ? average(aScores) : 0;

  // --- Class B Score ---
  const bScores = [
    tri(revenueGrowth, targets.B.revenueGrowth.center, targets.B.revenueGrowth.halfwidth),
    tri(epsGrowth, targets.B.epsGrowth.center, targets.B.epsGrowth.halfwidth),
    tri(peForward, targets.B.peForward.center, targets.B.peForward.halfwidth),
    tri(debtEbitda, targets.B.debtEbitda.center, targets.B.debtEbitda.halfwidth)
  ].filter(score => score !== null);

  const B = bScores.length > 0 ? average(bScores) : 0;

  // --- Class C Score ---
  const cScores = [
    tri(revenueGrowth, targets.C.revenueGrowth.center, targets.C.revenueGrowth.halfwidth),
    tri(epsGrowth, targets.C.epsGrowth.center, targets.C.epsGrowth.halfwidth),
    tri(peForward, targets.C.peForward.center, targets.C.peForward.halfwidth),
    tri(debtEbitda, targets.C.debtEbitda.center, targets.C.debtEbitda.halfwidth)
  ].filter(score => score !== null);

  const C = cScores.length > 0 ? average(cScores) : 0;

  // --- Class D Score (with gate logic) ---
  let D = 0;

  // D gate triggers
  const dGateTrigger =
    (revenueGrowth !== null && revenueGrowth >= targets.D.revenueGrowthThreshold) ||
    !epsPositive ||
    !ebitdaPositive ||
    !peAvailable;

  if (dGateTrigger) {
    D = 1.0;
  } else {
    // Fallback scoring using multi-metric approach (like A/B/C)
    const dScores = [
      tri(revenueGrowth, targets.D.revenueGrowth.center, targets.D.revenueGrowth.halfwidth),
      tri(epsGrowth, targets.D.epsGrowth.center, targets.D.epsGrowth.halfwidth),
      tri(peForward, targets.D.peForward.center, targets.D.peForward.halfwidth)
    ].filter(score => score !== null);

    D = dScores.length > 0 ? average(dScores) : 0;
  }

  // --- Final Classification ---
  const scores = { A, B, C, D };
  const sortedClasses = ['D', 'C', 'B', 'A'];  // Tie-break priority

  // Find max score
  let maxScore = Math.max(A, B, C, D);
  let finalClass = sortedClasses.find(cls => scores[cls] === maxScore);

  // Calculate confidence (gap between 1st and 2nd place)
  const sortedScores = [A, B, C, D].sort((a, b) => b - a);
  const confidence = sortedScores[0] - sortedScores[1];

  return {
    scores: { A, B, C, D },
    finalClass,
    confidence: Math.max(0, Math.min(1, confidence))  // Clamp to [0, 1]
  };
}

function average(arr) {
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

module.exports = { classifyStock };
```

---

### Handling Special Cases

**Negative Debt (Net Cash Position):**
```javascript
// In the API data parser
if (debtEbitda < 0) {
  debtEbitda = 0;  // Treat as zero debt
}
```

**Missing P/E (Pre-Profit Companies):**
```javascript
const peAvailable = (peForward !== null && peForward > 0);
// This will trigger D gate if false
```

**Extreme Outliers:**
```javascript
// No special handling needed - tri() naturally returns 0 for far outliers
// D gate catches hypergrowth cases
```

---

## Regime Calculation

### FRED Data Series

**Series Codes:**
- `WALCL`: Federal Reserve Total Assets (Weekly, Billions USD)
- `DFF`: Daily Federal Funds Effective Rate (Daily, Percent)

### Regime Logic

**File:** `/backend/services/regimeCalculator.js`

```javascript
const db = require('../database');

/**
 * Calculate current macro regime
 * @returns {Object} - { regime, rateIsLow, balanceSheetIncreasing, metrics }
 */
function calculateRegime() {
  // 1. Get latest data
  const latestMacro = db.prepare(`
    SELECT * FROM macro_data
    ORDER BY date DESC
    LIMIT 1
  `).get();

  if (!latestMacro) {
    throw new Error('No macro data available');
  }

  const dffToday = latestMacro.dff;
  const walclToday = latestMacro.walcl;

  // 2. Get 12-week-ago balance sheet value
  const date12WeeksAgo = subtractDays(latestMacro.date, 84);  // 12 weeks = 84 days

  const walcl12WeeksAgo = db.prepare(`
    SELECT walcl FROM macro_data
    WHERE date <= ?
    ORDER BY date DESC
    LIMIT 1
  `).get(date12WeeksAgo)?.walcl;

  if (!walcl12WeeksAgo) {
    throw new Error('Insufficient balance sheet history (need 12 weeks)');
  }

  // Balance sheet slope
  const balanceSheetSlope = walclToday - walcl12WeeksAgo;
  const balanceSheetIncreasing = balanceSheetSlope > 0;

  // 3. Get 1-year rate range
  const date1YearAgo = subtractDays(latestMacro.date, 365);

  const rateStats = db.prepare(`
    SELECT MIN(dff) as min_rate, MAX(dff) as max_rate
    FROM macro_data
    WHERE date >= ?
  `).get(date1YearAgo);

  const { min_rate, max_rate } = rateStats;

  // Rate positioning
  const ratePercentile = (dffToday - min_rate) / (max_rate - min_rate);
  const rateIsLow = ratePercentile < 0.5;

  // 4. Determine regime
  let regime, description, recommendation;

  if (rateIsLow && balanceSheetIncreasing) {
    regime = 'Most Liquid';
    description = 'Low Rates + Balance Sheet Increasing';
    recommendation = 'Allocate 0-100%+ to Class D stocks';
  } else if (rateIsLow && !balanceSheetIncreasing) {
    regime = 'In Between (prefer C)';
    description = 'Low Rates + Balance Sheet Decreasing';
    recommendation = 'Allocate 0-50% to Class C (or B) stocks';
  } else if (!rateIsLow && balanceSheetIncreasing) {
    regime = 'In Between (prefer B)';
    description = 'High Rates + Balance Sheet Increasing';
    recommendation = 'Allocate 0-50% to Class B (or C) stocks';
  } else {
    regime = 'Least Liquid';
    description = 'High Rates + Balance Sheet Decreasing';
    recommendation = 'Allocate 0-20% to Class A stocks';
  }

  return {
    regime,
    description,
    recommendation,
    metrics: {
      fedFundsRate: dffToday,
      rateIsLow,
      ratePercentile: Math.round(ratePercentile * 100) / 100,
      balanceSheetSlope,
      balanceSheetIncreasing,
      balanceSheetChange12w: Math.round(balanceSheetSlope / 1000) / 1000,  // Billions
      asOf: latestMacro.date
    }
  };
}

function subtractDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

module.exports = { calculateRegime };
```

---

## Frontend Components

### Project Structure
```
frontend/
├── src/
│   ├── App.jsx                 # Main app component
│   ├── main.jsx                # React entry point
│   ├── components/
│   │   ├── RegimeDisplay.jsx   # Top banner showing regime
│   │   ├── StockTable.jsx      # Main stock list
│   │   ├── StockRow.jsx        # Individual stock row
│   │   ├── AddStockForm.jsx    # Add ticker form
│   │   ├── NotesPanel.jsx      # Modal for editing notes
│   │   ├── FilterControls.jsx  # Class/confidence filters
│   │   ├── ScoreBreakdown.jsx  # A/B/C/D score visualization
│   │   └── ConfidenceBadge.jsx # Confidence tier indicator
│   ├── utils/
│   │   ├── api.js              # Axios wrapper for backend
│   │   └── formatting.js       # Number/date formatters
│   ├── config/
│   │   └── theme.js            # Colors, fonts (customizable)
│   └── styles/
│       └── index.css           # Tailwind + custom CSS
└── public/
    └── index.html
```

---

### Component: RegimeDisplay

**Purpose:** Display current macro regime at top of dashboard.

**File:** `/frontend/src/components/RegimeDisplay.jsx`

```jsx
import React from 'react';
import { theme } from '../config/theme';

function RegimeDisplay({ regime, loading, error }) {
  if (loading) return <div className="regime-banner loading">Loading regime...</div>;
  if (error) return <div className="regime-banner error">Error loading regime</div>;

  const { regime: name, description, recommendation, metrics } = regime;

  // Color coding by regime
  const regimeColors = {
    'Most Liquid': theme.colors.regimes.mostLiquid,
    'Least Liquid': theme.colors.regimes.leastLiquid,
    'In Between (prefer B)': theme.colors.regimes.inBetweenB,
    'In Between (prefer C)': theme.colors.regimes.inBetweenC
  };

  return (
    <div
      className="regime-banner"
      style={{ borderLeftColor: regimeColors[name] }}
    >
      <div className="regime-main">
        <h2 className="regime-name">{name}</h2>
        <p className="regime-description">{description}</p>
      </div>

      <div className="regime-metrics">
        <div className="metric">
          <span className="metric-label">Fed Funds Rate</span>
          <span className="metric-value">{metrics.fedFundsRate.toFixed(2)}%</span>
        </div>
        <div className="metric">
          <span className="metric-label">Balance Sheet (12w)</span>
          <span className="metric-value">
            {metrics.balanceSheetIncreasing ? '↑' : '↓'}
            {Math.abs(metrics.balanceSheetChange12w).toFixed(1)}B
          </span>
        </div>
      </div>

      <div className="regime-recommendation">
        <strong>Strategy:</strong> {recommendation}
      </div>

      <div className="regime-timestamp">
        As of {new Date(metrics.asOf).toLocaleDateString()}
      </div>
    </div>
  );
}

export default RegimeDisplay;
```

---

### Component: StockTable

**Purpose:** Main table displaying all portfolio stocks with filtering.

**File:** `/frontend/src/components/StockTable.jsx`

```jsx
import React, { useState, useMemo } from 'react';
import StockRow from './StockRow';
import FilterControls from './FilterControls';

function StockTable({ stocks, onRefresh, onDelete, onUpdateNotes }) {
  const [filters, setFilters] = useState({
    class: 'all',           // 'all', 'A', 'B', 'C', 'D'
    confidence: 'all',      // 'all', 'high', 'medium', 'low'
    sector: 'all',
    sortBy: 'ticker',       // 'ticker', 'class', 'confidence'
    sortOrder: 'asc'
  });

  // Apply filters and sorting
  const filteredStocks = useMemo(() => {
    let result = [...stocks];

    // Filter by class
    if (filters.class !== 'all') {
      result = result.filter(s => s.classification.class === filters.class);
    }

    // Filter by confidence
    if (filters.confidence === 'high') {
      result = result.filter(s => s.classification.confidence > 0.40);
    } else if (filters.confidence === 'medium') {
      result = result.filter(s => s.classification.confidence >= 0.20 && s.classification.confidence <= 0.40);
    } else if (filters.confidence === 'low') {
      result = result.filter(s => s.classification.confidence < 0.20);
    }

    // Filter by sector
    if (filters.sector !== 'all') {
      result = result.filter(s => s.sector === filters.sector);
    }

    // Sort
    result.sort((a, b) => {
      let aVal, bVal;

      if (filters.sortBy === 'ticker') {
        aVal = a.ticker;
        bVal = b.ticker;
      } else if (filters.sortBy === 'class') {
        aVal = a.classification.class;
        bVal = b.classification.class;
      } else if (filters.sortBy === 'confidence') {
        aVal = a.classification.confidence;
        bVal = b.classification.confidence;
      }

      if (filters.sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
  }, [stocks, filters]);

  return (
    <div className="stock-table-container">
      <FilterControls
        filters={filters}
        setFilters={setFilters}
        stocks={stocks}
      />

      <div className="stock-table-header">
        <span>Ticker</span>
        <span>Company</span>
        <span>Sector</span>
        <span>Class</span>
        <span>Confidence</span>
        <span>Price</span>
        <span>Actions</span>
      </div>

      {filteredStocks.length === 0 ? (
        <div className="empty-state">No stocks match your filters</div>
      ) : (
        filteredStocks.map(stock => (
          <StockRow
            key={stock.ticker}
            stock={stock}
            onDelete={onDelete}
            onUpdateNotes={onUpdateNotes}
          />
        ))
      )}
    </div>
  );
}

export default StockTable;
```

---

### Component: StockRow

**Purpose:** Single expandable row showing stock data.

**File:** `/frontend/src/components/StockRow.jsx`

```jsx
import React, { useState } from 'react';
import ConfidenceBadge from './ConfidenceBadge';
import ScoreBreakdown from './ScoreBreakdown';
import { theme } from '../config/theme';

function StockRow({ stock, onDelete, onUpdateNotes }) {
  const [expanded, setExpanded] = useState(false);

  const { ticker, companyName, sector, fundamentals, classification, notes, lastUpdated } = stock;
  const { class: cls, confidence, scores } = classification;

  // Color by class
  const classColors = theme.colors.classes;
  const classColor = classColors[cls];

  // Opacity by confidence
  let opacity = 1.0;
  if (confidence < 0.20) opacity = 0.4;
  else if (confidence < 0.40) opacity = 0.7;

  return (
    <>
      <div
        className="stock-row"
        style={{
          borderLeftColor: classColor,
          borderLeftWidth: '4px',
          borderLeftStyle: 'solid',
          opacity
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="ticker">{ticker}</span>
        <span className="company-name">{companyName}</span>
        <span className="sector">{sector || 'N/A'}</span>
        <span className="class-badge" style={{ backgroundColor: classColor }}>
          {cls}
        </span>
        <ConfidenceBadge confidence={confidence} />
        <span className="price">
          ${fundamentals.latestPrice?.toFixed(2) || '--'}
        </span>
        <div className="actions">
          <button onClick={(e) => { e.stopPropagation(); onDelete(ticker); }}>
            Delete
          </button>
        </div>
      </div>

      {expanded && (
        <div className="stock-details">
          <div className="fundamentals-grid">
            <div className="metric">
              <label>Revenue Growth</label>
              <span>{fundamentals.revenueGrowth?.toFixed(1)}%</span>
            </div>
            <div className="metric">
              <label>EPS Growth</label>
              <span>{fundamentals.epsGrowth?.toFixed(1)}%</span>
            </div>
            <div className="metric">
              <label>P/E (NTM)</label>
              <span>{fundamentals.peForward?.toFixed(1)}x</span>
            </div>
            <div className="metric">
              <label>Debt/EBITDA</label>
              <span>{fundamentals.debtEbitda?.toFixed(1)}x</span>
            </div>
          </div>

          <ScoreBreakdown scores={scores} finalClass={cls} />

          <div className="notes-section">
            <h4>Notes</h4>
            <button onClick={() => onUpdateNotes(ticker, notes)}>Edit Notes</button>
            {notes ? (
              <div className="notes-rendered" dangerouslySetInnerHTML={{ __html: markdownToHTML(notes) }} />
            ) : (
              <p className="no-notes">No notes yet</p>
            )}
          </div>

          <div className="metadata">
            <small>Last updated: {new Date(lastUpdated).toLocaleString()}</small>
          </div>
        </div>
      )}
    </>
  );
}

// Simple markdown to HTML (use react-markdown in real implementation)
function markdownToHTML(md) {
  return md
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
}

export default StockRow;
```

---

### Component: ScoreBreakdown

**Purpose:** Visual bar chart of A/B/C/D scores.

**File:** `/frontend/src/components/ScoreBreakdown.jsx`

```jsx
import React from 'react';
import { theme } from '../config/theme';

function ScoreBreakdown({ scores, finalClass }) {
  const classColors = theme.colors.classes;

  return (
    <div className="score-breakdown">
      <h4>Classification Scores</h4>
      {['A', 'B', 'C', 'D'].map(cls => (
        <div key={cls} className="score-row">
          <span className="class-label">{cls}</span>
          <div className="score-bar-container">
            <div
              className="score-bar"
              style={{
                width: `${scores[cls] * 100}%`,
                backgroundColor: classColors[cls]
              }}
            />
          </div>
          <span className="score-value">{scores[cls].toFixed(2)}</span>
          {cls === finalClass && <span className="selected-indicator">← Selected</span>}
        </div>
      ))}
    </div>
  );
}

export default ScoreBreakdown;
```

---

### Component: ConfidenceBadge

**Purpose:** Display confidence with color coding and warning icon.

**File:** `/frontend/src/components/ConfidenceBadge.jsx`

```jsx
import React from 'react';

function ConfidenceBadge({ confidence }) {
  let tier, color, showWarning;

  if (confidence > 0.40) {
    tier = 'High';
    color = '#4ade80';  // Green
    showWarning = false;
  } else if (confidence >= 0.20) {
    tier = 'Medium';
    color = '#fbbf24';  // Yellow
    showWarning = false;
  } else {
    tier = 'Low';
    color = '#f87171';  // Red
    showWarning = true;
  }

  return (
    <span className="confidence-badge" style={{ color }}>
      {showWarning && '⚠️ '}
      {(confidence * 100).toFixed(0)}%
      <span className="confidence-tier"> ({tier})</span>
    </span>
  );
}

export default ConfidenceBadge;
```

---

## UI/UX Specifications

### Theme Configuration

**File:** `/frontend/src/config/theme.js`

```javascript
export const theme = {
  colors: {
    // Base colors
    background: '#1a1a1a',       // Dark charcoal
    surface: '#2a2a2a',          // Slightly lighter panels
    border: '#3a3a3a',           // Subtle borders
    text: {
      primary: '#e0e0e0',        // Light gray for main text
      secondary: '#a0a0a0',      // Dimmer for labels
      accent: '#00d9ff'          // Cyan for highlights
    },

    // Class colors (easily customizable)
    classes: {
      A: '#3b82f6',              // Blue (stable, mature)
      B: '#10b981',              // Green (steady growth)
      C: '#f59e0b',              // Orange (higher risk/reward)
      D: '#a855f7'               // Purple (hypergrowth)
    },

    // Regime colors
    regimes: {
      mostLiquid: '#10b981',     // Green
      leastLiquid: '#ef4444',    // Red
      inBetweenB: '#3b82f6',     // Blue
      inBetweenC: '#f59e0b'      // Orange
    },

    // Status colors
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171'
  },

  fonts: {
    body: "'Inter', -apple-system, sans-serif",
    mono: "'JetBrains Mono', 'Courier New', monospace"
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px'
  },

  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px'
  }
};
```

### Typography & Layout

**Bloomberg Terminal Aesthetic:**

```css
/* /frontend/src/styles/index.css */

body {
  font-family: 'Inter', -apple-system, sans-serif;
  background-color: #1a1a1a;
  color: #e0e0e0;
  margin: 0;
  padding: 0;
}

/* Monospace for numbers */
.metric-value,
.price,
.score-value,
.confidence-badge {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-variant-numeric: tabular-nums;
}

/* Sharp borders, minimal rounding */
.stock-row,
.regime-banner,
.filter-controls {
  border-radius: 4px;
  border: 1px solid #3a3a3a;
}

/* Dense information layout */
.stock-table-header,
.stock-row {
  display: grid;
  grid-template-columns: 80px 1fr 120px 60px 100px 100px 120px;
  gap: 16px;
  padding: 12px 16px;
  align-items: center;
}

/* Hover states */
.stock-row:hover {
  background-color: #2a2a2a;
  cursor: pointer;
}

/* Class badges */
.class-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 14px;
  text-align: center;
}

/* Regime banner */
.regime-banner {
  background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
  border-left: 4px solid;
  padding: 20px;
  margin-bottom: 24px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 24px;
}

/* Score bars */
.score-bar-container {
  width: 100%;
  height: 20px;
  background-color: #2a2a2a;
  border-radius: 2px;
  overflow: hidden;
}

.score-bar {
  height: 100%;
  transition: width 0.3s ease;
}
```

---

## API Integration Strategy

> **⚠️ MIGRATED TO OPENBB PLATFORM**
> This project now uses OpenBB Platform for unified API access with provider redundancy.
> See [OPENBB_MIGRATION_GUIDE.md](./OPENBB_MIGRATION_GUIDE.md) for complete architecture details.

### Overview

The application uses a **Python child-process bridge** to access OpenBB Platform:
1. **Node.js** (`fmp.js`, `fred.js`) calls `openbb.js`
2. **openbb.js** spawns Python child process with `openbb_adapter.py`
3. **Python adapter** uses OpenBB Platform to fetch data
4. **JSON response** returned to Node.js via stdout
5. **Provider fallback** automatic (yfinance → fmp → intrinio)

### Fundamentals API (via OpenBB)

**File:** `/backend/apis/fmp.js`

```javascript
const openbb = require('./openbb');
const config = require('../config');
const { getCached, setCache } = require('./cache');
const providerHealth = require('../utils/providerHealth');

/**
 * Fetch company fundamentals via OpenBB with provider fallback
 * @param {string} ticker
 * @returns {Object} - Parsed fundamentals with flags
 */
async function getFundamentals(ticker) {
  // ✅ PRESERVED: Check cache first
  const cacheKey = `fundamentals_${ticker}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`✅ Cache hit for ${ticker}`);
    return cached;
  }

  console.log(`🔄 Fetching ${ticker} via OpenBB...`);

  // ✅ Provider fallback with health tracking
  const baseProviders = ['yfinance', 'fmp', 'intrinio'];
  const providers = providerHealth.sortProvidersByHealth(baseProviders);

  console.log(`📊 Provider priority: ${providers.join(' → ')}`);

  for (const provider of providers) {
    try {
      const data = await openbb.getFundamentals(ticker, provider);

      // Normalize data to match existing schema
      const result = normalizeFundamentals(data, ticker);

      // ✅ Record successful fetch
      providerHealth.recordSuccess(provider);

      // ✅ PRESERVED: Cache for 24 hours
      setCache(cacheKey, result, config.cacheTTL);

      console.log(`✅ ${ticker} fetched successfully from ${provider}`);
      return result;

    } catch (error) {
      // ✅ Record failure with error details
      providerHealth.recordFailure(provider, error.message);
      console.warn(`⚠️ ${provider} failed for ${ticker}: ${error.message}`);
      // Try next provider
    }
  }

  throw new Error(`Failed to fetch ${ticker} from all providers (${providers.join(', ')})`);
}

/**
 * Normalize OpenBB data to match existing classification system
 * OpenBB Platform returns growth rates as decimals (0.08 = 8%)
 */
function normalizeFundamentals(openbbData, ticker) {
  // Smart conversion: detect if format is decimal or percentage
  const isDecimalFormat = (value) => {
    return value !== null && value !== undefined && Math.abs(value) < 1.5;
  };

  const convertToPercentage = (value) => {
    if (value === null || value === undefined) return null;
    return isDecimalFormat(value) ? value * 100 : value;
  };

  return {
    ticker,
    companyName: openbbData.company_name || ticker,
    sector: openbbData.sector,
    revenueGrowth: convertToPercentage(openbbData.revenue_growth),
    epsGrowth: convertToPercentage(openbbData.eps_growth),
    peForward: openbbData.pe_forward,
    debtEbitda: openbbData.debt_to_ebitda < 0 ? 0 : openbbData.debt_to_ebitda,
    epsPositive: openbbData.eps !== null && openbbData.eps > 0,
    ebitdaPositive: openbbData.ebitda !== null && openbbData.ebitda > 0,
    peAvailable: openbbData.pe_forward !== null && openbbData.pe_forward > 0,
    latestPrice: openbbData.price,
    priceTimestamp: openbbData.timestamp || new Date().toISOString()
  };
}

module.exports = { getFundamentals };
```

---

### FRED Macro Data (via OpenBB)

**File:** `/backend/apis/fred.js`

```javascript
const openbb = require('./openbb');
const config = require('../config');
const db = require('../database');

/**
 * Fetch and store expanded FRED macro data via OpenBB
 * @param {number} days - Number of days to fetch (default 365)
 *
 * ✅ Expanded to include 5 series (was 2):
 * - WALCL: Fed Balance Sheet
 * - DFF: Fed Funds Rate
 * - T10Y2Y: 10-Year minus 2-Year Treasury Yield Spread
 * - UNRATE: Unemployment Rate
 * - CPIAUCSL: Consumer Price Index
 */
async function updateMacroData(days = 365) {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    console.log(`📊 Fetching expanded FRED macro data from ${startDate} to ${endDate} via OpenBB...`);

    // ✅ Fetch all 5 series via OpenBB Platform (parallel)
    const [walclData, dffData, yieldCurveData, unrateData, cpiData] = await Promise.all([
      openbb.getFredSeries('WALCL', startDate, endDate),
      openbb.getFredSeries('DFF', startDate, endDate),
      openbb.getFredSeries('T10Y2Y', startDate, endDate),
      openbb.getFredSeries('UNRATE', startDate, endDate),
      openbb.getFredSeries('CPIAUCSL', startDate, endDate)
    ]);

    // Merge all series by date
    const dateMap = new Map();

    walclData.forEach(obs => {
      if (!dateMap.has(obs.date)) dateMap.set(obs.date, {});
      dateMap.get(obs.date).walcl = parseFloat(obs.value);
    });

    dffData.forEach(obs => {
      if (!dateMap.has(obs.date)) dateMap.set(obs.date, {});
      dateMap.get(obs.date).dff = parseFloat(obs.value);
    });

    yieldCurveData.forEach(obs => {
      if (!dateMap.has(obs.date)) dateMap.set(obs.date, {});
      dateMap.get(obs.date).t10y2y = parseFloat(obs.value);
    });

    unrateData.forEach(obs => {
      if (!dateMap.has(obs.date)) dateMap.set(obs.date, {});
      dateMap.get(obs.date).unrate = parseFloat(obs.value);
    });

    cpiData.forEach(obs => {
      if (!dateMap.has(obs.date)) dateMap.set(obs.date, {});
      dateMap.get(obs.date).cpiaucsl = parseFloat(obs.value);
    });

    // ✅ Insert all 5 series
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO macro_data (date, walcl, dff, t10y2y, unrate, cpiaucsl, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    let count = 0;

    for (const [date, values] of dateMap) {
      if (values.walcl || values.dff) {
        insertStmt.run(
          date,
          values.walcl || null,
          values.dff || null,
          values.t10y2y || null,
          values.unrate || null,
          values.cpiaucsl || null,
          now
        );
        count++;
      }
    }

    console.log(`✅ Updated ${count} days of expanded macro data`);
    return count;
  } catch (error) {
    console.error('❌ FRED data fetch failed:', error.message);
    throw error;
  }
}

module.exports = { updateMacroData };
```

---

### OpenBB Node.js Bridge

**File:** `/backend/apis/openbb.js`

```javascript
const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execFileAsync = promisify(execFile);

const PYTHON_SCRIPT = path.join(__dirname, '../adapters/openbb_adapter.py');
const PYTHON_CMD = process.env.PYTHON_PATH || 'python3';
const TIMEOUT_MS = parseInt(process.env.OPENBB_TIMEOUT_MS) || 30000;

/**
 * Execute Python adapter script
 * @param {string[]} args - Command-line arguments
 * @returns {Promise<any>} Parsed JSON result
 */
async function executePythonScript(args) {
  try {
    const { stdout, stderr } = await execFileAsync(
      PYTHON_CMD,
      [PYTHON_SCRIPT, ...args],
      {
        timeout: TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024,
        env: process.env  // Pass OPENBB_* API keys
      }
    );

    if (stderr) {
      console.warn('Python stderr:', stderr);
      try {
        const errorData = JSON.parse(stderr);
        throw new Error(errorData.error || 'Python script error');
      } catch {
        throw new Error(stderr);
      }
    }

    return JSON.parse(stdout);

  } catch (error) {
    if (error.killed && error.signal === 'SIGTERM') {
      throw new Error(`OpenBB request timed out after ${TIMEOUT_MS}ms`);
    }

    if (error.stderr) {
      try {
        const errorData = JSON.parse(error.stderr);
        throw new Error(`OpenBB error: ${errorData.error}`);
      } catch {
        throw new Error(`Python error: ${error.stderr}`);
      }
    }

    throw error;
  }
}

/**
 * Fetch stock fundamentals via OpenBB
 * @param {string} ticker - Stock symbol
 * @param {string} provider - Data provider (fmp, yfinance, intrinio)
 * @returns {Promise<Object>} Fundamental metrics
 */
async function getFundamentals(ticker, provider = 'fmp') {
  return await executePythonScript(['fundamentals', ticker.toUpperCase(), provider]);
}

/**
 * Fetch FRED economic data series
 * @param {string} seriesId - FRED series ID (e.g., 'WALCL')
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Time series data
 */
async function getFredSeries(seriesId, startDate = null, endDate = null) {
  const args = ['fred_series', seriesId];
  if (startDate) args.push(startDate);
  if (endDate) args.push(endDate);
  return await executePythonScript(args);
}

module.exports = {
  getFundamentals,
  getFredSeries
};
```

---

### API Cache Layer (Unchanged)

**File:** `/backend/apis/cache.js`

```javascript
const db = require('../database');

// ✅ Cache layer preserved - no changes needed for OpenBB migration

function getCached(key) {
  const now = new Date().toISOString();
  const result = db.prepare(`
    SELECT response_data FROM api_cache
    WHERE cache_key = ? AND expires_at > ?
  `).get(key, now);

  return result ? JSON.parse(result.response_data) : null;
}

function setCache(key, data, ttlMs) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs).toISOString();

  db.prepare(`
    INSERT OR REPLACE INTO api_cache (cache_key, response_data, cached_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(key, JSON.stringify(data), now.toISOString(), expiresAt);
}

module.exports = { getCached, setCache };
```

---

## Configuration & Customization

### Environment Variables

**File:** `/.env`

```bash
# API Keys
FMP_API_KEY=your_fmp_api_key_here
FRED_API_KEY=your_fred_api_key_here

# Server
PORT=3001

# Database
DATABASE_PATH=./data/stocks.db

# Cache TTL (hours)
CACHE_TTL_HOURS=24
```

### Customizing Classification Formulas

**To adjust class targets:**

Edit `/backend/config.js`:

```javascript
classTargets: {
  A: {
    revenueGrowth: { center: 5, halfwidth: 5 },  // Change center or halfwidth
    // ...
  }
}
```

**To add metric weighting:**

Modify `/backend/services/classifier.js`:

```javascript
// Instead of simple average
const A = average(aScores);

// Use weighted average
const A = (
  0.25 * aScores[0] +  // Revenue growth
  0.25 * aScores[1] +  // EPS growth
  0.20 * aScores[2] +  // P/E
  0.30 * aScores[3]    // Debt/EBITDA (emphasize safety)
);
```

### Customizing UI Theme

**To change accent colors:**

Edit `/frontend/src/config/theme.js`:

```javascript
colors: {
  text: {
    accent: '#00ff88'  // Change from cyan to green
  },
  classes: {
    A: '#60a5fa',      // Lighter blue
    D: '#ec4899'       // Pink instead of purple
  }
}
```

**To adjust confidence tiers:**

Edit `/backend/config.js`:

```javascript
confidenceTiers: {
  high: 0.50,   // Stricter threshold
  medium: 0.25
}
```

---

## Development Roadmap

### Phase 1: Core Backend (Week 1)

- [ ] Set up Node.js + Express server
- [ ] Initialize SQLite database with schema
- [ ] Implement classification logic (`classifier.js`)
- [ ] Implement regime calculator (`regimeCalculator.js`)
- [ ] Build FMP API client with caching
- [ ] Build FRED API client
- [ ] Create stock management endpoints
- [ ] Test classification with 5-10 sample stocks

### Phase 2: Basic Frontend (Week 2)

- [ ] Set up React + Vite project
- [ ] Create `RegimeDisplay` component
- [ ] Create `StockTable` and `StockRow` components
- [ ] Create `AddStockForm` component
- [ ] Implement basic filtering (by class)
- [ ] Style with Bloomberg aesthetic
- [ ] Connect to backend API

### Phase 3: Enhanced UI (Week 3)

- [ ] Add confidence-based color coding
- [ ] Build `ScoreBreakdown` visualization
- [ ] Add notes editing modal
- [ ] Implement sorting (ticker, class, confidence)
- [ ] Add sector display and filtering
- [ ] Add "Refresh All" button
- [ ] Loading states and error handling

### Phase 4: Polish & Validation (Week 4)

- [ ] Manual testing with 20-30 real stocks
- [ ] Validate regime calculations with historical data
- [ ] Add daily cron job for auto-refresh
- [ ] Implement cache expiration cleanup
- [ ] Add "Last updated" timestamps everywhere
- [ ] Write README with setup instructions
- [ ] Test API fallback (Yahoo Finance)

### Phase 5: v2 Features (Future)

- [ ] Historical classification charts (Recharts line graphs)
- [ ] Regime history tracking
- [ ] Portfolio allocation calculator (% in each class)
- [ ] Export portfolio to CSV
- [ ] Import tickers from CSV
- [ ] Sector-specific classification models
- [ ] API usage dashboard

---

## Testing & Validation

### Unit Tests

**Classification Logic:**

```javascript
// /backend/tests/classifier.test.js

const { classifyStock } = require('../services/classifier');

test('Mature stock should classify as A', () => {
  const fundamentals = {
    revenueGrowth: 5,
    epsGrowth: 5,
    peForward: 10,
    debtEbitda: 1.0,
    epsPositive: true,
    ebitdaPositive: true,
    peAvailable: true
  };

  const result = classifyStock(fundamentals);

  expect(result.finalClass).toBe('A');
  expect(result.confidence).toBeGreaterThan(0.4);
});

test('Hypergrowth pre-profit should classify as D', () => {
  const fundamentals = {
    revenueGrowth: 80,
    epsGrowth: null,
    peForward: null,
    debtEbitda: 10,
    epsPositive: false,
    ebitdaPositive: false,
    peAvailable: false
  };

  const result = classifyStock(fundamentals);

  expect(result.finalClass).toBe('D');
  expect(result.scores.D).toBe(1.0);
});
```

### Integration Tests

**API Endpoints:**

```javascript
// Test /api/stocks POST
test('Adding a stock fetches data and classifies', async () => {
  const response = await request(app)
    .post('/api/stocks')
    .send({ ticker: 'AAPL' });

  expect(response.status).toBe(201);
  expect(response.body.ticker).toBe('AAPL');
  expect(response.body.classification.class).toMatch(/[ABCD]/);
});
```

### Manual Validation Checklist

**Before going live:**

1. **Classification Spot Checks:**
   - [ ] Apple (AAPL) → Should be B or C
   - [ ] Microsoft (MSFT) → Should be B
   - [ ] Tesla (TSLA) → Should be C or D
   - [ ] Coca-Cola (KO) → Should be A
   - [ ] Palantir (PLTR) → Should score in Class D (profitable hypergrowth)
   - [ ] Snowflake (SNOW) → Should be D (pre-profit gate trigger)

2. **Regime Calculation:**
   - [ ] Verify FRED data is up to date
   - [ ] Check 12-week balance sheet slope makes sense
   - [ ] Verify rate percentile calculation

3. **Edge Cases:**
   - [ ] Add a stock with missing P/E (pre-profit)
   - [ ] Add a stock with negative debt (net cash)
   - [ ] Add a stock with extreme revenue growth (>100%)
   - [ ] Test with invalid ticker → should error gracefully

4. **UI/UX:**
   - [ ] Low-confidence stocks show warning icon
   - [ ] Filters work correctly
   - [ ] Notes save and render markdown
   - [ ] Regime banner updates when macro data changes

---

## File Structure

### Complete Directory Layout

```
portfolio-app/
├── README.md
├── how-to-invest.md
├── Implementation.md (this file)
├── .env
├── .gitignore
├── package.json
├── package-lock.json
├── data/
│   └── stocks.db (created on first run)
├── backend/
│   ├── server.js
│   ├── database.js
│   ├── config.js
│   ├── adapters/                    # ✨ NEW: OpenBB Integration
│   │   └── openbb_adapter.py        # Python CLI for OpenBB Platform
│   ├── routes/
│   │   ├── stocks.js
│   │   ├── regime.js
│   │   └── portfolio.js
│   ├── services/
│   │   ├── classifier.js
│   │   ├── regimeCalculator.js
│   │   └── scheduler.js
│   ├── apis/
│   │   ├── openbb.js                # ✨ NEW: Node.js → Python bridge
│   │   ├── fmp.js                   # Fundamentals (via OpenBB)
│   │   ├── fred.js                  # Macro data (via OpenBB)
│   │   └── cache.js                 # API response caching
│   ├── utils/
│   │   ├── providerHealth.js        # ✨ NEW: Provider health tracking
│   │   ├── formulas.js
│   │   └── validators.js
│   └── tests/
│       ├── classifier.test.js
│       └── regime.test.js
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── RegimeDisplay.jsx
│   │   │   ├── StockTable.jsx
│   │   │   ├── StockRow.jsx
│   │   │   ├── AddStockForm.jsx
│   │   │   ├── NotesPanel.jsx
│   │   │   ├── FilterControls.jsx
│   │   │   ├── ScoreBreakdown.jsx
│   │   │   └── ConfidenceBadge.jsx
│   │   ├── utils/
│   │   │   ├── api.js
│   │   │   └── formatting.js
│   │   ├── config/
│   │   │   └── theme.js
│   │   └── styles/
│   │       └── index.css
│   └── public/
│       └── (static assets)
└── scripts/
    ├── initDb.js (database initialization)
    └── seedData.js (sample data for testing)
```

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm or yarn
- FMP API key (free tier: 250 calls/day)
- FRED API key (free, unlimited)

### Step 1: Clone and Install

```bash
# Navigate to project directory
cd portfolio-app

# Install backend dependencies
npm install express better-sqlite3 node-fetch node-cron dotenv cors

# Install frontend dependencies
cd frontend
npm install react react-dom axios react-markdown tailwindcss
npm install -D vite @vitejs/plugin-react
```

### Step 2: Configure Environment

Create `.env` file in root:

```bash
FMP_API_KEY=your_key_here
FRED_API_KEY=your_key_here
PORT=3001
DATABASE_PATH=./data/stocks.db
CACHE_TTL_HOURS=24
```

### Step 3: Initialize Database

```bash
# Run initialization script
node scripts/initDb.js
```

This creates `/data/stocks.db` with all tables.

### Step 4: Fetch Initial Macro Data

```bash
# Run FRED data fetch (one-time for historical data)
node scripts/fetchMacroData.js
```

This populates 365 days of WALCL and DFF data.

### Step 5: Start Development Servers

**Terminal 1 (Backend):**
```bash
npm run dev
# Starts Express server on localhost:3001
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
# Starts Vite dev server on localhost:5173
```

### Step 6: Add Your First Stock

1. Open browser: `http://localhost:5173`
2. Enter ticker (e.g., "AAPL")
3. Click "Add Stock"
4. Watch it fetch data, classify, and display

---

## Key Implementation Notes

### API Rate Limit Management

**Daily Limits:**
- FMP Free Tier: 250 calls/day
- FRED: Unlimited

**Strategy:**
- Cache all responses for 24 hours
- Batch updates: Manual "Refresh All" instead of auto-refresh
- Show "Last Updated" timestamp prominently
- Only fetch when user explicitly requests or adds new stock

**Error Handling:**
```javascript
// In FMP client
if (response.status === 429) {
  // Rate limited
  console.warn('FMP rate limit hit, using cached data');
  const cachedData = getCached(cacheKey);
  if (cachedData) return cachedData;
  throw new Error('Rate limited and no cache available');
}
```

### Data Freshness Indicators

**Always show:**
- "Classification as of Oct 30, 2024 8:00 AM"
- "Price: $182.45 (Oct 30, 2024 4:00 PM ET)"
- "Regime last updated: Oct 30, 2024"

**User knows:**
- Data is daily, not real-time
- When to manually refresh

### Historical Data Storage Philosophy

**Store everything from day 1:**
- Even if not displayed in MVP
- SQLite storage is cheap (kilobytes)
- Makes v2 features trivial to implement
- You'll regret not having the data later

**Tables to populate daily:**
- `classification_history` (one row per stock per day)
- `macro_data` (FRED updates)

**Cron job:**
```javascript
// /backend/services/scheduler.js
const cron = require('node-cron');

// Run every day at 8 AM
cron.schedule('0 8 * * *', async () => {
  console.log('Running daily data refresh...');
  await updateMacroData(90);  // Update last 90 days
  await refreshAllStocks();
  console.log('Daily refresh complete');
});
```

---

## Troubleshooting

### Common Issues

**1. Stock won't classify (all scores near 0):**
- Check if fundamental data is missing
- Verify API response structure
- Widen halfwidths in config

**2. Regime showing wrong quadrant:**
- Verify FRED data is up to date
- Check 12-week lookback has enough data points
- Print intermediate calculations (rate percentile, balance sheet slope)

**3. API calls failing:**
- Check API keys in `.env`
- Verify rate limits not exceeded
- Check internet connection
- Try fallback Yahoo Finance API

**4. Database locked errors:**
- Close other SQLite connections
- Use WAL mode: `PRAGMA journal_mode=WAL;`

**5. Low confidence on all stocks:**
- Halfwidths may be too narrow
- Check if using correct metrics (NTM vs TTM)
- Some sectors naturally have wider ranges

---

## Next Steps After MVP

### Immediate Improvements
1. Add loading skeletons for better UX
2. Implement keyboard shortcuts (e.g., 'a' to add stock)
3. Add dark/light theme toggle
4. Export portfolio to CSV

### v2 Feature Prioritization
1. **Classification history charts** (high value, moderate effort)
2. **Portfolio allocation calculator** (high value, low effort)
3. **Sector-specific models** (medium value, high effort)
4. **TradingView charts** (low value, high effort)

### Advanced Features (v3+)
- Multi-user support with authentication
- Cloud sync (Firebase or similar)
- Alerts/notifications when regime changes
- Backtesting: "What if I followed this strategy in 2020?"
- Integration with brokerage APIs for actual holdings

---

## Appendix: Quick Reference

### Formulas Summary

**Triangular Closeness:**
```
Tri(x, center, halfwidth) = max(0, 1 - |x - center| / halfwidth)
```

**Class Scores:**
- A, B, C: Average of 4 metric scores (revenue growth, EPS growth, P/E, debt/EBITDA)
- D: 1.0 if gate triggered, else average of 3 metric scores (revenue growth, EPS growth, P/E)

**Confidence:**
```
Confidence = max(scores) - second_max(scores)
```

**Regime:**
```
rate_low = (DFF - DFF_min_1y) / (DFF_max_1y - DFF_min_1y) < 0.5
bs_up = (WALCL_today - WALCL_12_weeks_ago) > 0

If rate_low AND bs_up → Most Liquid
If rate_low AND NOT bs_up → In Between (prefer C)
If NOT rate_low AND bs_up → In Between (prefer B)
Else → Least Liquid
```

### Color Codes

| Element | Color (Hex) | Usage |
|---------|-------------|-------|
| Class A | `#3b82f6` | Blue - mature, stable |
| Class B | `#10b981` | Green - steady growth |
| Class C | `#f59e0b` | Orange - higher risk |
| Class D | `#a855f7` | Purple - hypergrowth |
| Background | `#1a1a1a` | Dark charcoal |
| Accent | `#00d9ff` | Cyan highlights |

### API Endpoints Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/stocks` | GET | List all stocks |
| `/api/stocks` | POST | Add stock |
| `/api/stocks/:ticker` | DELETE | Remove stock |
| `/api/stocks/:ticker/notes` | PUT | Update notes |
| `/api/stocks/refresh` | POST | Refresh data |
| `/api/regime` | GET | Current regime |
| `/api/portfolio/summary` | GET | Portfolio stats |

---

## Final Checklist

Before considering MVP complete:

- [ ] Can add/delete stocks
- [ ] Classifications display with correct colors
- [ ] Confidence tiers work (high/medium/low)
- [ ] Regime calculation accurate
- [ ] Notes save and render markdown
- [ ] Filters work (class, confidence, sector)
- [ ] API caching prevents excessive calls
- [ ] Historical data being stored
- [ ] "Last updated" timestamps visible
- [ ] Error states handled gracefully
- [ ] Code is clean and commented
- [ ] Configuration easy to modify
- [ ] Bloomberg aesthetic achieved

---

## Implementation Status

**Status:** ✅ COMPLETED - MVP Fully Implemented

**Date Completed:** November 1, 2025

### Recent Updates

#### November 2, 2025 - Enhanced Class D Scoring
**Problem Identified:** Class D scoring only used revenue growth in the fallback path, causing profitable hypergrowth companies with extreme valuations (like PLTR with 621x P/E and 115% EPS growth) to score 0% in Class D despite clearly exhibiting hypergrowth characteristics.

**Solution Implemented:** Updated Class D fallback scoring to use a multi-metric approach similar to Classes A/B/C:
- Added **EPS Growth** scoring (center: 80%, halfwidth: 40%)
- Added **P/E Forward** scoring (center: 150x, halfwidth: 100x)
- Widened **Revenue Growth** halfwidth from 20% to 30%

**Impact:** Class D now properly scores "profitable hypergrowth" companies - those with extreme valuations and high earnings growth, even if revenue growth is below the 50% gate threshold.

**Files Modified:**
- `backend/config.js` - Added Class D targets for epsGrowth and peForward
- `backend/services/classifier.js` - Implemented multi-metric scoring for Class D fallback

### What Was Built

This project has been fully implemented according to the specifications above. All MVP features are complete and functional.

#### Backend Implementation (✅ Complete)

**Core Files:**
- `backend/database.js` - SQLite setup with automatic table initialization
- `backend/config.js` - Configuration with classification targets and API keys
- `backend/server.js` - Express server with CORS and request logging

**Classification System:**
- `backend/utils/formulas.js` - Triangular closeness function
- `backend/services/classifier.js` - A/B/C/D scoring logic with gate triggers
- `backend/utils/validators.js` - Ticker validation and sanitization

**API Integrations:**
- `backend/apis/cache.js` - 24-hour TTL caching layer
- `backend/apis/fmp.js` - Financial Modeling Prep client (stable API) with parallel endpoint fetching
- `backend/apis/fred.js` - FRED API client for WALCL and DFF data
- `backend/apis/yahoo.js` - Yahoo Finance fallback for price data

**Routes:**
- `backend/routes/stocks.js` - GET, POST, DELETE, PUT for stocks and notes, POST refresh
- `backend/routes/regime.js` - GET current macro regime
- `backend/routes/portfolio.js` - GET portfolio summary statistics

**Services:**
- `backend/services/regimeCalculator.js` - Macro regime calculation logic
- `backend/services/scheduler.js` - Daily cron job for data refresh (8 AM)

**Scripts:**
- `scripts/initDb.js` - Database initialization script
- `scripts/fetchMacroData.js` - FRED data fetcher with configurable days

#### Frontend Implementation (✅ Complete)

**Core Files:**
- `frontend/src/main.jsx` - React entry point
- `frontend/src/App.jsx` - Main app component with state management

**Components:**
- `frontend/src/components/RegimeDisplay.jsx` - Top banner with macro regime
- `frontend/src/components/AddStockForm.jsx` - Ticker input with validation
- `frontend/src/components/StockTable.jsx` - Main table with filtering and sorting
- `frontend/src/components/StockRow.jsx` - Expandable row with fundamentals
- `frontend/src/components/FilterControls.jsx` - Class/confidence/sector filters
- `frontend/src/components/ConfidenceBadge.jsx` - Color-coded confidence indicator
- `frontend/src/components/ScoreBreakdown.jsx` - A/B/C/D score visualization bars
- `frontend/src/components/NotesPanel.jsx` - Markdown notes editor modal

**Utilities:**
- `frontend/src/utils/api.js` - Axios wrapper with all API endpoints
- `frontend/src/utils/formatting.js` - Number and date formatters

**Configuration:**
- `frontend/src/config/theme.js` - Bloomberg-style color scheme and fonts
- `frontend/src/styles/index.css` - Complete CSS with terminal aesthetic

**Build Configuration:**
- `frontend/vite.config.js` - Vite config with API proxy
- `frontend/tailwind.config.js` - Tailwind with custom colors
- `frontend/postcss.config.js` - PostCSS with Tailwind and Autoprefixer

### MVP Checklist (All Complete)

**Core Features:**
- ✅ Add/remove stocks by ticker
- ✅ Fetch fundamentals and calculate A/B/C/D scores
- ✅ Display current macro regime
- ✅ Show all stocks with class, confidence, color-coding
- ✅ Filter by regime preference and confidence level
- ✅ Per-stock notes (markdown support)
- ✅ Persist everything locally (SQLite)
- ✅ Store historical classification data
- ✅ Display latest daily price with timestamp
- ✅ Show sector information

**Technical Requirements:**
- ✅ Database schema with 5 tables and indexes
- ✅ Triangular closeness function implemented
- ✅ Classification engine with all 4 classes
- ✅ Regime calculator with 12-week and 1-year lookbacks
- ✅ API caching with 24-hour TTL
- ✅ REST API with 7 endpoints
- ✅ React frontend with 8 components
- ✅ Bloomberg Terminal aesthetic
- ✅ Responsive design with Tailwind CSS

### Actual File Structure

```
portfolio-app/
├── .env.example              # Environment variables template
├── .gitignore               # Git ignore rules
├── package.json             # Backend dependencies and scripts
├── README.md                # Complete setup and usage guide
├── Implementation.md        # This file (technical documentation)
├── how-to-invest.md         # Investment methodology
├── companies.md             # Company reference
├── backend/
│   ├── server.js            # Express app entry point
│   ├── database.js          # SQLite setup with schema
│   ├── config.js            # Configuration and targets
│   ├── routes/
│   │   ├── stocks.js        # Stock CRUD operations
│   │   ├── regime.js        # Macro regime endpoint
│   │   └── portfolio.js     # Portfolio summary
│   ├── services/
│   │   ├── classifier.js    # Classification logic
│   │   ├── regimeCalculator.js # Regime calculation
│   │   └── scheduler.js     # Cron jobs for daily updates
│   ├── apis/
│   │   ├── fmp.js          # Financial Modeling Prep client
│   │   ├── yahoo.js        # Yahoo Finance fallback
│   │   ├── fred.js         # FRED API client
│   │   └── cache.js        # API caching layer
│   └── utils/
│       ├── formulas.js      # Triangular closeness function
│       └── validators.js    # Input validation
├── frontend/
│   ├── package.json         # Frontend dependencies
│   ├── vite.config.js       # Vite configuration
│   ├── tailwind.config.js   # Tailwind CSS config
│   ├── postcss.config.js    # PostCSS config
│   ├── index.html           # HTML entry point
│   └── src/
│       ├── main.jsx         # React entry point
│       ├── App.jsx          # Main app component
│       ├── components/
│       │   ├── RegimeDisplay.jsx
│       │   ├── StockTable.jsx
│       │   ├── StockRow.jsx
│       │   ├── AddStockForm.jsx
│       │   ├── NotesPanel.jsx
│       │   ├── FilterControls.jsx
│       │   ├── ScoreBreakdown.jsx
│       │   └── ConfidenceBadge.jsx
│       ├── utils/
│       │   ├── api.js       # Axios wrapper
│       │   └── formatting.js # Number/date formatters
│       ├── config/
│       │   └── theme.js     # Colors, fonts
│       └── styles/
│           └── index.css    # Global styles
├── data/
│   └── (stocks.db created on first run)
└── scripts/
    ├── initDb.js            # Database initialization
    └── fetchMacroData.js    # Fetch FRED data
```

### Dependencies Installed

**Backend (package.json):**
- express: ^4.18.2
- better-sqlite3: ^9.2.2
- cors: ^2.8.5
- dotenv: ^16.3.1
- node-cron: ^3.0.3
- node-fetch: ^2.7.0
- concurrently: ^8.2.2 (dev)

**Frontend (frontend/package.json):**
- react: ^18.2.0
- react-dom: ^18.2.0
- axios: ^1.6.2
- react-markdown: ^9.0.1
- @vitejs/plugin-react: ^4.2.1 (dev)
- tailwindcss: ^3.4.0 (dev)
- vite: ^5.0.8 (dev)

### Setup Instructions (Quick Start)

```bash
# 1. Install dependencies
npm install
cd frontend && npm install && cd ..

# 2. Configure environment
cp .env.example .env
# Edit .env and add your API keys

# 3. Initialize database
npm run init-db

# 4. Fetch macro data
npm run fetch-macro

# 5. Start application
npm run dev:all
```

Open http://localhost:5173 in your browser.

### API Endpoints Summary

All endpoints available at `http://localhost:3001/api`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stocks` | List all stocks with filters |
| POST | `/stocks` | Add new stock |
| DELETE | `/stocks/:ticker` | Remove stock |
| PUT | `/stocks/:ticker/notes` | Update notes |
| POST | `/stocks/refresh` | Refresh stock data |
| GET | `/regime` | Get current regime |
| GET | `/portfolio/summary` | Portfolio statistics |

### Testing Recommendations

Test with these stocks to verify all classes:
- **KO** (Coca-Cola) → Expected: Class A (mature, low growth, stable metrics)
- **MSFT** (Microsoft) → Expected: Class B (steady growth, balanced fundamentals)
- **AAPL** (Apple) → Expected: Class B or C (moderate growth, ~6% revenue growth)
- **NVDA** (NVIDIA) → Expected: Class D (hypergrowth, revenue growth triggers D gate)
- **PLTR** (Palantir) → Expected: Class D or C (profitable hypergrowth, 115% EPS growth, 621x P/E)
- **SNOW** (Snowflake) → Expected: Class D (pre-profit triggers D gate)

### Known Limitations (By Design)

1. No authentication (hobby project, local only)
2. No input sanitization beyond basic validation
3. No automated tests (manual testing only)
4. FMP free tier limited to 250 calls/day
5. **FMP free tier excludes certain "premium-only" stocks** (e.g., SMCI)
   - Some tickers require paid subscription for detailed fundamentals
   - App will show clear error: "This stock requires a premium FMP subscription..."
   - See `KNOWN_PREMIUM_TICKERS.md` for list of affected stocks
6. No real-time data (daily refresh recommended)
7. No backup or sync features

### Future Enhancements (v2)

Potential features not yet implemented:
- Historical regime tracking charts
- Classification history graphs over time
- TradingView price chart integration
- CSV export functionality
- Calculated portfolio allocation percentages
- API usage dashboard
- Sector-specific classification models
- Multi-user support with authentication
- Cloud sync (Firebase, etc.)

### Customization Guide

**Change Classification Targets:**
Edit `backend/config.js` → `classTargets` object

**Change Colors:**
Edit `frontend/src/config/theme.js` → `colors` object

**Change Cache Duration:**
Edit `.env` → `CACHE_TTL_HOURS`

**Change Server Port:**
Edit `.env` → `PORT`

### Troubleshooting

**Database Errors:**
```bash
rm data/stocks.db
npm run init-db
npm run fetch-macro
```

**API Rate Limits:**
- Cache responses last 24 hours automatically
- Use "Refresh All" sparingly
- Consider upgrading FMP plan for more calls

**"HTTP 402: Payment Required" Error:**
- This means the stock requires a premium FMP subscription
- The free tier doesn't include all stocks (e.g., SMCI)
- **Solution**: Try a different stock or upgrade your FMP plan
- Most major stocks (AAPL, MSFT, NVDA, TSLA, AMZN, META, GOOGL) work fine
- See `KNOWN_PREMIUM_TICKERS.md` for list of affected stocks

**Classification Issues:**
- Adjust `center` and `halfwidth` in `backend/config.js`
- Check if fundamental data is missing
- Verify API responses in terminal logs

### Performance Notes

- API cache reduces calls by ~90% in normal usage
- SQLite handles 100+ stocks easily
- Frontend renders 50+ stocks without lag
- Typical page load: <2 seconds
- Stock addition: 3-5 seconds (API calls)

---

## OpenBB Platform Migration

**Status:** ✅ COMPLETED - Migration Successful

**Date Completed:** November 4, 2025

### Migration Summary

The portfolio app has been successfully migrated from direct FMP/FRED API calls to **OpenBB Platform v4.5.0**, providing unified API access with provider redundancy and enhanced reliability.

### What Changed

#### 1. New Dependencies
- **OpenBB Platform v4.5.0** - Python package installed globally
- **Python 3.11+** - Required for OpenBB execution
- **SSL Certificates** - Configured for HTTPS requests

#### 2. New Files Created
```
backend/
├── adapters/
│   └── openbb_adapter.py      # Python CLI adapter for OpenBB
├── apis/
│   └── openbb.js              # Node.js bridge to Python adapter
└── utils/
    └── providerHealth.js      # Provider health tracking system
```

#### 3. Refactored Files
- `backend/apis/fmp.js` - Now uses OpenBB with provider fallback (yfinance → fmp → intrinio)
- `backend/apis/fred.js` - Now fetches 5 FRED series via OpenBB (was 2)
- `backend/database.js` - Added columns for expanded macro data
- `.env` - Added OPENBB_* environment variables

#### 4. Database Schema Updates
```sql
-- New columns added to macro_data table
ALTER TABLE macro_data ADD COLUMN t10y2y REAL;      -- Yield curve spread
ALTER TABLE macro_data ADD COLUMN unrate REAL;      -- Unemployment rate
ALTER TABLE macro_data ADD COLUMN cpiaucsl REAL;    -- Consumer price index
```

### Key Features Added

#### Provider Redundancy
- **Automatic failover** - If FMP fails, falls back to yfinance, then intrinio
- **Health tracking** - Monitors provider success/failure rates
- **Dynamic prioritization** - Prioritizes healthy providers
- **Graceful degradation** - App continues working even if one provider is down

#### Expanded Macro Data
Now tracking 5 FRED economic indicators (was 2):
1. **WALCL** - Fed Balance Sheet (existing)
2. **DFF** - Fed Funds Rate (existing)
3. **T10Y2Y** - 10Y-2Y Treasury Yield Spread ✨ NEW
4. **UNRATE** - Unemployment Rate ✨ NEW
5. **CPIAUCSL** - Consumer Price Index ✨ NEW

#### SSL Certificate Handling
- Automatic SSL certificate configuration for macOS Python
- Uses certifi package for HTTPS requests
- No manual certificate installation required

### What Stayed the Same

✅ **100% Backward Compatible** - All existing functionality preserved:
- Cache layer (24-hour TTL) - Exactly the same
- Database schema - Extended, not replaced
- Classification system - Unchanged
- Regime calculator - Still works (ready for Phase 6 enhancement)
- Frontend - No changes needed
- API endpoints - Same interface
- Configuration - Same config.js structure

### Performance Improvements

- **Parallel FRED fetching** - All 5 series fetched simultaneously
- **Provider health tracking** - Automatically uses fastest/most reliable provider
- **Better error handling** - More informative error messages
- **Reduced API calls** - Provider fallback prevents unnecessary retries

### Testing Results

```
✅ AAPL Fundamentals: Revenue 7.9%, EPS 91.2%, P/E 32.56
✅ Provider Fallback: yfinance succeeded (fmp, intrinio available as backup)
✅ Cache Layer: Working correctly (instant 2nd fetch)
✅ FRED Data: 87 days of macro data stored (5 series)
✅ Database Migration: All new columns added automatically
✅ SSL Certificates: Configured and working
```

### Migration Verification

To verify the migration is working:

```bash
# Test OpenBB connection
cd portfolio-app
node -e "
require('dotenv').config();
const openbb = require('./backend/apis/openbb');
openbb.testConnection().then(success => {
  console.log(success ? '✅ OpenBB working!' : '❌ OpenBB connection failed');
});
"

# Test AAPL fundamentals with provider fallback
node -e "
require('dotenv').config();
const fmp = require('./backend/apis/fmp');
fmp.getFundamentals('AAPL').then(data => {
  console.log('✅ AAPL:', data.companyName, '|', data.revenueGrowth + '% revenue growth');
});
"

# Test expanded FRED data
node -e "
require('dotenv').config();
const fred = require('./backend/apis/fred');
fred.updateMacroData(30).then(count => {
  console.log(\`✅ Fetched \${count} days of macro data (5 series)\`);
});
"
```

### Environment Variables

Ensure these are set in your `.env` file:

```bash
# OpenBB API Keys (automatically detected by OpenBB Platform)
OPENBB_FMP_API_KEY=your_fmp_api_key_here
OPENBB_FRED_API_KEY=your_fred_api_key_here

# Python Configuration
PYTHON_PATH=python3

# OpenBB Timeout
OPENBB_TIMEOUT_MS=30000

# Provider Priority
PRIMARY_FUNDAMENTALS_PROVIDER=fmp
FALLBACK_PROVIDERS=yfinance,intrinio
```

### Troubleshooting

**Python not found:**
```bash
which python3
# If not found, install Python 3.10+ from python.org
```

**SSL certificate errors:**
```bash
# Already configured in openbb_adapter.py, but if issues persist:
pip3 install --upgrade certifi
```

**OpenBB import errors:**
```bash
pip3 install openbb
# Verify: python3 -c "from openbb import obb; print('OK')"
```

**Provider health stats:**
```bash
node -e "
require('dotenv').config();
const health = require('./backend/utils/providerHealth');
console.log(health.getStats());
"
```

### Future Enhancements (Post-Migration)

Now that OpenBB is integrated, easy additions include:
- **Crypto data** - via obb.crypto.*
- **Options data** - via obb.derivatives.*
- **International stocks** - 100+ global exchanges
- **Alternative data** - News, social sentiment, insider trades
- **More macro indicators** - 841,000+ FRED series available

---

**End of Implementation Guide**

This document serves as your complete blueprint. The project is now fully implemented and migrated to OpenBB Platform. Follow the setup instructions in the "Implementation Status" section above to get started! 🚀
