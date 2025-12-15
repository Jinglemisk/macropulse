# Macro Pulse

This is a simple dashboard that classifies stocks by a basket of macroeconomic parameters and proposes a portfolio allocation stategy based on the incumbent US macroeconmic regime. 

The system operates on two core principles: (1) stocks can be classified into four distinct categories based on growth rates, valuation metrics, and debt levels, and (2) optimal allocation shifts with changes in monetary policy conditions.

## Features

The dashboard provides:

- **Automated Stock Classification** - Categorizes equities into four classes (A/B/C/D) using triangular closeness functions applied to revenue growth, EPS growth, forward P/E, and debt/EBITDA ratios
- **Enhanced Regime Analysis** - Calculates macro regime using Fed balance sheet, interest rates, and 13 economic indicators including unemployment, CPI, retail sales, and consumer confidence
- **Fed Pressure Score (FPS)** - Weighted composite score measuring Federal Reserve policy pressure across 10 macroeconomic indicators, providing 3-6 month forward policy signals
- **Growth Pulse Score (GPS)** - Economic growth assessment independent of inflation metrics, used for allocation tie-breaking in ambiguous regimes
- **Dynamic Allocation Engine** - Automatically adjusts recommended portfolio allocation based on regime classification and FPS/GPS overlay signals
- **Confidence Scoring** - Quantifies classification certainty for both individual stocks and overall regime assessment
- **Local SQLite Storage** - All data persisted locally with historical tracking for classifications and regime shifts
- **Multi-Provider Data Integration** - Unified data access via OpenBB Platform with automatic failover across yfinance, Financial Modeling Prep, and Intrinio

## Classification System

Stocks are categorized into four classes based on fundamental metrics. This model is easily configurable, with or without AI support.

**Class A (Blue) - Value/Defensive**
- Target characteristics: ~5% revenue growth, ~10x forward P/E, minimal debt
- Typical holdings: Utilities, mature consumer staples, established dividend payers
- Performance profile: Relative outperformance in high-rate, low-liquidity environments

**Class B (Green) - Quality Growth**
- Target characteristics: ~10% revenue growth, ~20x forward P/E, moderate leverage
- Typical holdings: Large-cap technology, diversified industrials, healthcare
- Performance profile: Balanced risk/reward across multiple regimes

**Class C (Orange) - Growth**
- Target characteristics: ~20% revenue growth, ~25x forward P/E, elevated valuation
- Typical holdings: High-growth technology, emerging consumer brands
- Performance profile: Rate-sensitive with strong performance in accommodative policy environments

**Class D (Purple) - Hypergrowth/Speculative**
- Gate triggers: >50% revenue growth OR pre-profit (no positive EPS/EBITDA)
- Typical holdings: Early-stage companies, unprofitable growth stories
- Performance profile: Maximum sensitivity to liquidity conditions, extreme volatility

Confidence scores quantify classification certainty. Low confidence indicates the stock exhibits characteristics spanning multiple categories.

## Regime Framework

### Base Regime Calculation

The system determines the macroeconomic regime using a 2×2 matrix based on Federal Reserve policy:

1. **Most Liquid** (Low rates + Balance sheet expansion) → Base allocation: 40% D, 30% C, 20% B, 10% A
2. **In Between - Prefer C** (Low rates + Balance sheet contraction) → Base allocation: 40% C, 25% B, 20% D, 15% A
3. **In Between - Prefer B** (High rates + Balance sheet expansion) → Base allocation: 40% B, 30% C, 15% D, 15% A
4. **Least Liquid** (High rates + Balance sheet contraction) → Base allocation: 60% A, 30% B, 10% C, 0% D

### Enhanced Scoring System

The application extends the base regime with two overlay scores:

**Fed Pressure Score (FPS)** - Range: -1.0 (maximum dovish) to +1.0 (maximum hawkish)
- Aggregates 10 macroeconomic indicators: unemployment, jobless claims, payrolls, CPI, core CPI, PPI, Chicago Fed Activity Index, industrial production, retail sales, consumer confidence
- Predicts Federal Reserve policy direction 3-6 months forward
- Positive FPS → Contractionary pressure → Shifts allocation defensively (toward A/B)
- Negative FPS → Expansionary pressure → Shifts allocation toward growth (toward C/D)

**Growth Pulse Score (GPS)** - Range: -1.0 (recession) to +1.0 (strong growth)
- Derived from 7 growth indicators (excludes inflation metrics)
- Activates as tie-breaker when FPS is neutral (|FPS| < 0.2) in In-Between regimes
- GPS > +0.3 → Favor Class C (growthier)
- GPS < -0.3 → Favor Class B (more defensive)

The allocation engine applies FPS tilt (k=0.25) to the base allocation, then applies GPS tie-breaking logic to produce final recommended allocations.

## Architecture

**Backend:**
- Node.js + Express (RESTful API server)
- SQLite with better-sqlite3 (local persistence, ~5ms query latency)
- OpenBB Platform v4.5.0 (unified financial data gateway)
- Python 3.10+ (OpenBB adapter bridge)
- Claude Code subagent for OpenBB integration assistance

**Frontend:**
- React 18 with hooks (component-based UI)
- Vite (build tool and dev server)
- Tailwind CSS (utility-first styling)
- Axios (HTTP client with request/response interceptors)

**Data Providers** (via OpenBB Platform):
- **Primary:** yfinance (unlimited, free)
- **Fallback:** Financial Modeling Prep API (250 requests/day on free tier)
- **FRED API:** Federal Reserve Economic Data (unlimited)
- **Optional:** Intrinio (backup provider)

**OpenBB Integration Features:**
- Automatic provider failover with health tracking
- Unified data schema across providers
- Node.js ↔ Python bridge for OpenBB Platform access
- Built-in Claude Code subagent (`openbb-integration-expert`) for deepening OpenBB integration and troubleshooting

The system spawns Python child processes to interface with OpenBB Platform, enabling seamless data access while maintaining the Node.js backend architecture.

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+ (for OpenBB)
- Free API keys (for OpenBB endpoints):
  - [Financial Modeling Prep](https://financialmodelingprep.com/) (250 calls/day free)
  - [FRED API](https://fred.stlouisfed.org/docs/api/api_key.html) (unlimited, free)

### Installation

**1. Install Python and OpenBB Platform**

```bash
# Check your Python version
python3 --version

# Install OpenBB
pip3 install openbb

# Verify it worked
python3 -c "from openbb import obb; print('✅ OpenBB installed')"
```

**2. Clone and Install Dependencies**

```bash
# Clone the repo
git clone <your-repo-url>
cd macrocompass

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

**3. Set Up Environment Variables**

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your API keys
nano .env
```

Your `.env` should look like:
```bash
# OpenBB API Keys
OPENBB_FMP_API_KEY=your_fmp_api_key_here
OPENBB_FRED_API_KEY=your_fred_api_key_here

# Legacy keys (kept for backwards compatibility)
FMP_API_KEY=your_fmp_api_key_here
FRED_API_KEY=your_fred_api_key_here

# Python path (default: python3)
PYTHON_PATH=python3

# Server config
PORT=8345
DATABASE_PATH=./data/stocks.db
CACHE_TTL_HOURS=24
OPENBB_TIMEOUT_MS=30000
PRIMARY_FUNDAMENTALS_PROVIDER=fmp
FALLBACK_PROVIDERS=yfinance,intrinio
```

**4. Initialize Database**

```bash
npm run init-db
```

**5. Fetch Initial Macro Data**

```bash
npm run fetch-macro
```

This pulls 365 days of FRED data: Fed balance sheet, interest rates, yield curve, unemployment, CPI.

### Running the App

**Option 1: Run Everything**
```bash
npm run dev:all
```

**Option 2: Run Separately**
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.

## Usage Workflow

1. **Add Stocks** - Enter ticker symbols to add equities to the portfolio
2. **Review Classifications** - Examine assigned class (A/B/C/D) and confidence scores
3. **Analyze Regime** - Check current macroeconomic regime, FPS/GPS scores, and recommended allocation
4. **Document Thesis** - Click stock rows to add markdown-formatted notes and investment rationale
5. **Refresh Data** - Manually update stock fundamentals and macro indicators (respecting API rate limits)

**Recommended refresh schedule:**
- Macro data: Weekly (13 FRED series)
- Stock fundamentals: Post-earnings or monthly
- Intraday prices: Daily (cached for 24 hours)

## Customization

**Classification Parameters** - Modify `backend/config.js`:

```javascript
classTargets: {
  A: {
    revenueGrowth: { center: 5, halfwidth: 5 },
    epsGrowth: { center: 5, halfwidth: 5 },
    peForward: { center: 10, halfwidth: 6 },
    debtEbitda: { center: 1.0, halfwidth: 1.0 }
  }
  // Adjust center values and halfwidths for each class
}
```

**Theme Configuration** - Modify `frontend/src/config/theme.js`:

```javascript
colors: {
  classes: {
    A: '#3b82f6',  // Blue - Value/Defensive
    B: '#10b981',  // Green - Quality Growth
    C: '#f59e0b',  // Orange - Growth
    D: '#a855f7'   // Purple - Hypergrowth
  }
}
```

**FPS/GPS Weights** - Adjust indicator weights in `backend/config.js`:

```javascript
fps: {
  weights: {
    core_cpi_yoy: 2.0,      // Highest weight (inflation critical)
    unemployment: 1.5,
    nonfarm_payrolls: 1.5,
    // ... other indicators
  }
}
```

## Project Structure

```
macrocompass/
├── backend/
│   ├── server.js              # Express server
│   ├── database.js            # SQLite setup
│   ├── config.js              # Classification targets
│   ├── adapters/
│   │   └── openbb_adapter.py  # Python bridge to OpenBB
│   ├── apis/                  # Data fetching layer
│   │   ├── openbb.js          # OpenBB integration
│   │   ├── fmp.js             # FMP via OpenBB
│   │   ├── fred.js            # FRED via OpenBB
│   │   └── cache.js           # Response caching
│   ├── routes/                # API endpoints
│   ├── services/              # Business logic
│   └── utils/                 # Helper functions
├── frontend/
│   └── src/
│       ├── App.jsx            # Main component
│       ├── components/        # React components
│       └── config/            # Theme config
├── data/
│   └── stocks.db              # Your local database
├── docs/                      # Documentation
│   ├── Implementation.md      # Technical details
│   ├── OPENBB_MIGRATION_GUIDE.md
│   ├── how-to-invest.md       # Investment methodology
│   └── ...
└── scripts/
    ├── initDb.js              # DB setup
    └── fetchMacroData.js      # FRED data fetcher
```

## Troubleshooting

**Database Lock Errors**
```bash
rm data/stocks.db
npm run init-db
npm run fetch-macro
```

**API Rate Limits**
- Responses cached automatically for 24 hours
- OpenBB attempts yfinance (unlimited) before FMP fallback (250/day limit)
- Avoid excessive manual refresh operations

**Classification Issues**
- Adjust triangular closeness parameters in `backend/config.js`
- Review confidence scores - low confidence indicates ambiguous positioning
- Verify fundamental data completeness via API logs

**Missing Regime Data**
```bash
npm run fetch-macro
```

**OpenBB Integration Issues**
- Utilize built-in Claude Code subagent: `openbb-integration-expert` agent
- Verify Python environment: `python3 -c "from openbb import obb; print('OK')"`
- Check provider health tracking in backend logs

## Documentation

- **[FPS/GPS Enhancement Specification](./docs/FPS_GPS_IMPLEMENTATION.md)** - Detailed documentation of the Fed Pressure Score and Growth Pulse Score system
- **[Investment Methodology](./docs/how-to-invest.md)** - Theoretical framework underlying the classification system and regime analysis

## Additional Information

**Limitations:**
- No authentication system (intended for local/single-user deployment)
- Limited to daily data refresh cycle (not suitable for intraday trading)
- Free API tier restrictions apply (FMP: 250 requests/day)
- Historical backtesting not implemented
- No real-time alerting or monitoring

**Contributing:**
Issues and pull requests are welcome. For major changes, please open an issue first to discuss proposed modifications.

## License

MIT - Do whatever you want with it. See [LICENSE](./LICENSE) for details.

## Built With

- [OpenBB Platform](https://openbb.co/) - Financial data aggregation and provider management
- [Express.js](https://expressjs.com/) - RESTful API server framework
- [React](https://react.dev/) - Component-based user interface
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - High-performance SQLite driver
- [Claude Code](https://claude.com/claude-code) - Development assistance and integrated OpenBB agent
