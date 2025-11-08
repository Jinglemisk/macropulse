# Investment Portfolio Dashboard

> **⚠️ Personal Hobby Project Disclaimer**
>
> This is a personal hobby project I built to help me think about my own investment decisions. It's not production-ready, has no authentication, minimal error handling, and absolutely should not be used as professional investment advice. I'm sharing it publicly in case someone finds the approach interesting or wants to build something similar. Use at your own risk!

A Bloomberg Terminal-inspired dashboard I built for tracking stocks across different macro regimes. The whole thing runs locally on my machine - no cloud, no subscriptions, just me, my data, and SQLite.

The core idea is simple: classify stocks into four groups (A/B/C/D) based on their fundamentals, then adjust strategy based on what the Fed is doing. Think of it as a framework for thinking about portfolio allocation rather than a get-rich-quick scheme.

## What It Does

I got tired of juggling spreadsheets and wanted something more visual. This dashboard:

- **Auto-classifies stocks** into 4 buckets based on growth rates, P/E ratios, and debt levels
- **Tracks macro regime** using Fed balance sheet and interest rates to figure out which asset class might do better
- **Shows confidence scores** because sometimes a stock doesn't fit neatly into one category
- **Lets me take notes** in markdown (because future-me always forgets why I bought something)
- **Stores everything locally** in SQLite - I like knowing where my data lives
- **Pulls fresh data** from multiple sources via OpenBB Platform (with automatic fallbacks when APIs fail)

### The Classification System

This is my attempt to bucket stocks by their fundamental characteristics:

**Class A (Blue)** - The Boring Stalwarts
- Slow growth (~5%), low P/E (~10), minimal debt
- Think utilities, mature consumer staples
- These tend to hold up when liquidity dries up

**Class B (Green)** - The Steady Growers
- Moderate growth (~10%), reasonable P/E (~20)
- Your typical S&P 500 blue chips
- Balance between growth and stability

**Class C (Orange)** - The Growth Stories
- Higher growth (~20%), elevated P/E (~25)
- Tech companies, fast-growing consumer brands
- More sensitive to interest rate moves

**Class D (Purple)** - The Hypergrowth Bets
- Very high growth (>50%) or pre-profit
- Speculative, high risk/reward
- First to get crushed when rates rise

The confidence score tells me how clear-cut the classification is. Low confidence means the stock is somewhere between categories.

### Macro Regimes

The dashboard calculates where we are in the liquidity cycle:

1. **Most Liquid** (Low rates + Balance sheet growing) → Time to overweight Class D
2. **In Between - Prefer C** (Low rates + Balance sheet shrinking) → Shift toward C/B
3. **In Between - Prefer B** (High rates + Balance sheet growing) → Favor B/C
4. **Least Liquid** (High rates + Balance sheet shrinking) → Hide in Class A

This is a simplified framework based on how different asset types historically performed in different liquidity environments. Your mileage may vary.

## Tech Stack

Built this over a few weekends with tools I'm comfortable with:

**Backend:**
- Node.js + Express (because JavaScript everywhere)
- SQLite with better-sqlite3 (fast, local, simple)
- OpenBB Platform for data (unified API that auto-falls back between providers)
- Python 3.10+ (required for OpenBB)

**Frontend:**
- React 18 + Vite (fast refresh is a game-changer)
- Tailwind CSS (I'm not a designer, utility classes save me)
- Axios for API calls

**Data Sources** (via OpenBB):
- Yahoo Finance (free, unlimited - primary source)
- Financial Modeling Prep (free tier: 250/day - fallback)
- FRED (Fed data - free, unlimited)
- Intrinio (optional - backup)

The OpenBB integration is the secret sauce here - automatic provider redundancy means if one API is down, it seamlessly tries the next one.

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+ (for OpenBB)
- Free API keys:
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
cd portfolio-app

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
PORT=3001
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

## How I Use It

1. **Add a stock** - Type in a ticker (e.g., "NVDA"), hit Add Stock
2. **Review classification** - See where it falls (A/B/C/D) and check the confidence score
3. **Check the regime** - Look at current macro regime to see which classes are favored
4. **Take notes** - Click on a stock row, add notes about why I'm interested
5. **Refresh periodically** - Update all stocks when I want fresh data (be mindful of API limits)

I typically refresh macro data weekly and stock fundamentals when earnings come out.

## Customization

Want to tweak the classification logic? Edit `backend/config.js`:

```javascript
classTargets: {
  A: {
    revenueGrowth: { center: 5, halfwidth: 5 },  // Adjust these
    epsGrowth: { center: 5, halfwidth: 5 },
    // ... more parameters
  }
}
```

Colors not your style? Change `frontend/src/config/theme.js`:

```javascript
colors: {
  classes: {
    A: '#3b82f6',  // Make it your own
    B: '#10b981',
    C: '#f59e0b',
    D: '#a855f7'
  }
}
```

## Project Structure

```
portfolio-app/
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

**Database locked errors?**
```bash
rm data/stocks.db
npm run init-db
npm run fetch-macro
```

**Hit API rate limits?**
- The app caches responses for 24 hours automatically
- OpenBB tries yfinance first (unlimited), then falls back to FMP
- Don't spam the refresh button

**Classifications seem wrong?**
- The triangular closeness function might need tuning for your style
- Adjust targets in `backend/config.js`
- Some stocks genuinely don't fit cleanly (check confidence score)

**No regime data showing up?**
```bash
npm run fetch-macro
```

## Documentation

- [Technical Implementation](./docs/Implementation.md) - Database schema, API details, architecture
- [OpenBB Migration Guide](./docs/OPENBB_MIGRATION_GUIDE.md) - How I migrated to OpenBB Platform
- [Investment Methodology](./docs/how-to-invest.md) - The thinking behind the classification system
- [Future Roadmap](./docs/FUTURE_ROADMAP.MD) - Ideas I haven't gotten to yet

## Disclaimer (Again)

I built this for myself to organize my thoughts about investing. It's NOT:
- Professional financial advice
- A trading system
- Production-ready software
- Guaranteed to be accurate
- A substitute for doing your own research

Markets are unpredictable. This tool is just a framework for thinking. Do your own due diligence.

## Contributing

This is a personal project, but if you find a bug or have ideas, feel free to open an issue. Pull requests welcome if you want to add features, but no promises on response time.

## License

MIT - Do whatever you want with it. See [LICENSE](./LICENSE) for details.

## Built With

- [OpenBB Platform](https://openbb.co/) - Financial data aggregation
- [Express](https://expressjs.com/) - Backend framework
- [React](https://react.dev/) - Frontend framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - Database
- [Claude Code](https://claude.com/claude-code) - Development assistance

---

If you build something cool with this or have questions, feel free to reach out. Happy investing (responsibly)!
