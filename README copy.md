# Investment Dashboard

A Bloomberg Terminal-inspired dashboard for tracking stock classifications across macro regimes. Locally hosted hobby project for personal investment research.

## Features

- **Stock Classification System**: Automatically classifies stocks into Classes A/B/C/D based on fundamental metrics
- **Macro Regime Tracking**: Determines current macro regime based on Fed balance sheet and interest rates
- **Confidence Scoring**: Each classification includes a confidence score to indicate reliability
- **Portfolio Management**: Add/remove stocks, track fundamentals, and take markdown notes
- **Persistent Storage**: All data stored locally in SQLite database
- **Historical Tracking**: Classification history stored for future analysis
- **Real-time Data**: Fetches latest fundamentals from Financial Modeling Prep and macro data from FRED

## Tech Stack

**Backend:**
- Node.js + Express
- SQLite (better-sqlite3)
- **OpenBB Platform** (unified API gateway with provider redundancy)
- **Python 3.10+** (required for OpenBB Platform)

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- Axios

**Data Providers** (via OpenBB):
- Financial Modeling Prep (FMP)
- Yahoo Finance (yfinance)
- FRED (Federal Reserve Economic Data)
- Intrinio (optional)

## Prerequisites

- **Node.js 18+**
- **Python 3.10+** (required for OpenBB Platform)
- npm or yarn
- API Keys:
  - [Financial Modeling Prep](https://financialmodelingprep.com/) (free tier: 250 calls/day)
  - [FRED API](https://fred.stlouisfed.org/docs/api/api_key.html) (free, unlimited)

## Installation

### 1. Install Python & OpenBB Platform

**Install Python 3.10+:**
```bash
# Check Python version
python3 --version

# If not installed, download from: https://www.python.org/downloads/
```

**Install OpenBB Platform:**
```bash
pip3 install openbb

# Verify installation
python3 -c "from openbb import obb; print('✅ OpenBB Platform installed successfully')"
```

### 2. Clone and Install Dependencies

```bash
# Navigate to project directory
cd portfolio-app

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Configure Environment

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
```

Edit `.env`:
```bash
# OpenBB API Keys (automatically detected by OpenBB Platform)
OPENBB_FMP_API_KEY=your_fmp_api_key_here
OPENBB_FRED_API_KEY=your_fred_api_key_here

# Legacy keys (kept for backwards compatibility)
FMP_API_KEY=your_fmp_api_key_here
FRED_API_KEY=your_fred_api_key_here

# Python Configuration
PYTHON_PATH=python3

# Server Configuration
PORT=3001
DATABASE_PATH=./data/stocks.db
CACHE_TTL_HOURS=24

# OpenBB Configuration
OPENBB_TIMEOUT_MS=30000
PRIMARY_FUNDAMENTALS_PROVIDER=fmp
FALLBACK_PROVIDERS=yfinance,intrinio
```

### 4. Initialize Database

```bash
npm run init-db
```

This creates the SQLite database with all required tables.

### 5. Fetch Initial Macro Data

```bash
npm run fetch-macro
```

This fetches 365 days of historical FRED data via OpenBB:
- **WALCL** - Fed Balance Sheet
- **DFF** - Fed Funds Rate
- **T10Y2Y** - 10Y-2Y Treasury Yield Spread
- **UNRATE** - Unemployment Rate
- **CPIAUCSL** - Consumer Price Index

## Running the Application

### Option 1: Run Both Servers Simultaneously

```bash
npm run dev:all
```

This starts both backend (port 3001) and frontend (port 5173) in one terminal.

### Option 2: Run Separately

**Terminal 1 (Backend):**
```bash
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

### Access the Dashboard

Open your browser to: **http://localhost:5173**

## Usage

### Adding Stocks

1. Enter a ticker symbol in the input field (e.g., "AAPL")
2. Click "Add Stock"
3. The app will:
   - Fetch fundamentals via OpenBB (tries yfinance → fmp → intrinio)
   - Calculate classification scores
   - Store data in database
   - Display results immediately

### Understanding Classifications

**Class A** (Blue): Mature, stable companies
- Low growth (~5%)
- Low P/E (~10)
- Low debt

**Class B** (Green): Steady growers
- Moderate growth (~10%)
- Moderate P/E (~20)
- Manageable debt

**Class C** (Orange): Growth companies
- Higher growth (~20%)
- Higher P/E (~25)
- More debt tolerance

**Class D** (Purple): Hypergrowth
- Very high growth (>50%)
- Pre-profit or extreme valuations
- High risk/reward

### Confidence Scores

- **High (>40%)**: Clear classification, large gap between 1st and 2nd place scores
- **Medium (20-40%)**: Moderate confidence
- **Low (<20%)**: Ambiguous, stock could fit multiple classes

### Macro Regimes

The dashboard calculates the current regime based on:
- Fed Funds Rate positioning (low vs high in 1-year range)
- Balance sheet trend (increasing vs decreasing over 12 weeks)

**Four Regimes:**
1. **Most Liquid**: Low rates + Balance sheet increasing → Favor Class D
2. **In Between (prefer C)**: Low rates + Balance sheet decreasing → Favor Class C/B
3. **In Between (prefer B)**: High rates + Balance sheet increasing → Favor Class B/C
4. **Least Liquid**: High rates + Balance sheet decreasing → Favor Class A

### Taking Notes

1. Click on any stock row to expand details
2. Click "Add Notes" or "Edit Notes"
3. Write notes in markdown format
4. Click "Save"

Example markdown:
```markdown
## Investment Thesis
- Strong moat in cloud services
- AWS growth accelerating
- **Price target:** $200

## Risks
- Competition from MSFT
- Regulatory concerns
```

### Filtering Stocks

Use the filter controls to:
- Filter by class (A/B/C/D)
- Filter by confidence level
- Filter by sector
- Sort by ticker, class, or confidence

### Refreshing Data

Click "Refresh All" to update all stocks with latest data. Note: This uses API calls, so be mindful of rate limits (250/day for FMP free tier).

## Project Structure

```
portfolio-app/
├── backend/
│   ├── server.js              # Express app
│   ├── database.js            # SQLite setup
│   ├── config.js              # Configuration
│   ├── adapters/              # ✨ NEW: OpenBB Integration
│   │   └── openbb_adapter.py  # Python CLI for OpenBB Platform
│   ├── apis/                  # API abstraction layer
│   │   ├── openbb.js          # ✨ NEW: Node.js → Python bridge
│   │   ├── fmp.js             # Fundamentals (via OpenBB)
│   │   ├── fred.js            # Macro data (via OpenBB)
│   │   └── cache.js           # API response caching
│   ├── routes/                # API endpoints
│   ├── services/              # Business logic
│   └── utils/                 # Helper functions
│       └── providerHealth.js  # ✨ NEW: Provider health tracking
├── frontend/
│   └── src/
│       ├── App.jsx            # Main app component
│       ├── components/        # React components
│       ├── utils/             # API client, formatters
│       ├── config/            # Theme configuration
│       └── styles/            # CSS
├── data/
│   └── stocks.db              # SQLite database
└── scripts/
    ├── initDb.js              # Database initialization
    └── fetchMacroData.js      # FRED data fetcher
```

**Key Architecture:**
- **OpenBB Platform**: Python package providing unified API access
- **Child Process Bridge**: Node.js spawns Python scripts to access OpenBB
- **Provider Redundancy**: Automatic fallback (yfinance → fmp → intrinio)
- **Health Tracking**: Monitors provider success rates, prioritizes reliable sources

## Customization

### Adjusting Classification Targets

Edit `backend/config.js`:

```javascript
classTargets: {
  A: {
    revenueGrowth: { center: 5, halfwidth: 5 },  // Change these values
    epsGrowth: { center: 5, halfwidth: 5 },
    // ...
  }
}
```

### Changing Colors

Edit `frontend/src/config/theme.js`:

```javascript
colors: {
  classes: {
    A: '#3b82f6',  // Change to your preferred colors
    B: '#10b981',
    C: '#f59e0b',
    D: '#a855f7'
  }
}
```

### Adjusting Cache Duration

Edit `.env`:
```bash
CACHE_TTL_HOURS=48  # Cache API responses for 48 hours
```

## Troubleshooting

### Database Errors

If you see "database locked" errors:
```bash
# Delete and recreate database
rm data/stocks.db
npm run init-db
npm run fetch-macro
```

### API Rate Limits

**With OpenBB Provider Redundancy:**
- Primary provider failure triggers automatic fallback
- yfinance is free and unlimited (used first by default)
- FMP free tier: 250 calls/day (fallback provider)
- Multiple providers reduce the impact of rate limits

**To conserve API calls:**
- Caching is automatic (24-hour TTL)
- Don't refresh all stocks frequently
- Provider health tracking prioritizes working providers

### Classification Seems Wrong

The triangular closeness function may need tuning for your investment style. Adjust the `center` and `halfwidth` values in `backend/config.js` to better match your criteria.

### No Regime Data

Make sure you've run:
```bash
npm run fetch-macro
```

This needs to be run once initially and occasionally to update macro data.

## API Usage Notes

**Rate Limits:**
- FMP Free: 250 calls/day
- FRED: Unlimited

**Data Caching:**
- All API responses cached for 24 hours
- Cache automatically clears expired entries
- Manual refresh bypasses cache

**Data Freshness:**
- Stock fundamentals: Updates when you refresh
- Macro data: Update manually with `npm run fetch-macro`
- Prices: Latest available from API

## Database Schema

### Tables

1. **stocks**: Portfolio stocks with company info
2. **fundamentals**: Latest fundamental metrics
3. **classification_history**: Daily classification scores
4. **macro_data**: FRED data (5 series)
   - WALCL - Fed Balance Sheet
   - DFF - Fed Funds Rate
   - T10Y2Y - 10Y-2Y Treasury Yield Spread ✨ NEW
   - UNRATE - Unemployment Rate ✨ NEW
   - CPIAUCSL - Consumer Price Index ✨ NEW
5. **api_cache**: API response cache

See `Implementation.md` for detailed schema documentation.

## Development

### Running Tests

(No automated tests in hobby version - manual testing only)

### Building Frontend for Production

```bash
cd frontend
npm run build
```

Outputs to `frontend/dist/`

### Adding New Features

See `Implementation.md` for detailed technical documentation and future feature ideas.

## Notes

- This is a **hobby project** for personal use
- Not production-ready (no authentication, minimal error handling)
- Data is stored locally only
- No backup or sync features
- Use at your own risk for investment decisions

## License

MIT

## Resources

- [Implementation Guide](./Implementation.md) - Detailed technical documentation
- [Investment Strategy](./how-to-invest.md) - Background on classification methodology
- [Financial Modeling Prep API](https://financialmodelingprep.com/developer/docs/)
- [FRED API Documentation](https://fred.stlouisfed.org/docs/api/fred/)

## Support

This is a personal project with no official support. For issues:
1. Check `Implementation.md` for technical details
2. Review API documentation if data fetching fails
3. Check browser console for frontend errors
4. Check terminal for backend errors

---

Built with Claude Code 🚀
