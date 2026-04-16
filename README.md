<div align="center">
  <img src="./macropulse.jpeg" alt="Macropulse logo" width="320" />
  <h1>Macropulse</h1>
</div>

Macropulse is a local stock classification dashboard built around a macro regime overlay. It classifies equities into four buckets using growth, valuation, and leverage metrics, then combines that with a US macro regime model to suggest portfolio tilts.

The project is designed for local, single-user use. It stores data in SQLite, fetches market and macro data through OpenBB-backed providers, and runs as a Node/React app with a small Python bridge.

## What It Does

- Classifies stocks into four classes: A, B, C, and D
- Computes confidence scores for each classification
- Calculates a macro regime from Fed balance sheet, rates, and broader economic indicators
- Applies FPS/GPS overlay logic to suggest regime-aware allocations
- Stores stocks, fundamentals, notes, and historical classifications locally
- Uses provider fallback for fundamentals, quotes, and profiles

## Stack

**Backend**
- Node.js + Express
- SQLite via `better-sqlite3`
- Python bridge for OpenBB access

**Frontend**
- React 18
- Vite
- Tailwind CSS
- Axios

**Data Sources**
- Financial Modeling Prep via OpenBB
- Yahoo Finance via OpenBB fallback
- Intrinio via OpenBB fallback
- FRED for macro series

## Requirements

- Node.js 18+
- Python 3.11+ recommended
- An FMP API key
- A FRED API key

Python is expected to run from a project-local virtual environment. Do not rely on a random global `python3` install if you want reproducible setup.

## Quick Start

```bash
git clone <your-repo-url>
cd macropulse

npm install
cd frontend
npm install
cd ..

python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

cp .env.example .env
```

Edit `.env` and set your API keys. Then initialize the database, fetch macro history, and start both servers:

```bash
npm run init-db
npm run fetch-macro
npm run dev:all
```

Open `http://localhost:5173`.

## Environment Variables

The default `.env.example` is set up for a local virtual environment:

```bash
FMP_API_KEY=your_fmp_api_key_here
FRED_API_KEY=your_fred_api_key_here

OPENBB_FMP_API_KEY=your_fmp_api_key_here
OPENBB_FRED_API_KEY=your_fred_api_key_here

PORT=8345
DATABASE_PATH=./data/stocks.db
CACHE_TTL_HOURS=24

PYTHON_PATH=./venv/bin/python
OPENBB_TIMEOUT_MS=30000

PRIMARY_FUNDAMENTALS_PROVIDER=fmp
FALLBACK_PROVIDERS=yfinance,intrinio
PRIMARY_QUOTE_PROVIDER=fmp
FALLBACK_QUOTE_PROVIDERS=yfinance,intrinio
PRIMARY_PROFILE_PROVIDER=fmp
FALLBACK_PROFILE_PROVIDERS=yfinance,intrinio
```

Notes:

- `FMP_API_KEY` and `OPENBB_FMP_API_KEY` should usually be the same value.
- `FRED_API_KEY` and `OPENBB_FRED_API_KEY` should usually be the same value.
- The backend shells out to `PYTHON_PATH`, so it must point to the Python environment where `openbb` is installed.
- Provider order is configurable and can differ for fundamentals, quotes, and profiles.
- If all OpenBB fundamentals providers fail, the backend falls back to a direct Yahoo Finance fetch before giving up.

## Running the App

Run both servers together:

```bash
npm run dev:all
```

Or separately:

```bash
# Terminal 1
npm run dev

# Terminal 2
cd frontend
npm run dev
```

The frontend proxies `/api` requests to the backend on port `8345`.

## Usage

1. Add ticker symbols from the UI.
2. Review the returned fundamentals and stock class.
3. Inspect the current macro regime and allocation guidance.
4. Add notes to individual positions.
5. Use `Refresh All` to refresh stock-level data.

Macro data is not refreshed by the UI. To update macro history, run:

```bash
npm run fetch-macro
```

Recommended cadence:

- Stock refresh: after earnings or when you want to refresh fundamentals and prices
- Macro refresh: weekly or after major macro releases

## Classification Model

Stocks are grouped into four classes:

- **Class A**: lower growth, lower valuation, lower leverage
- **Class B**: quality growth with moderate valuation and leverage
- **Class C**: faster growth with richer valuation
- **Class D**: hypergrowth or pre-profit / speculative profiles

Confidence scores indicate how clearly a stock fits a single bucket.

## Regime Model

The macro engine starts from a base liquidity regime:

1. `Most Liquid`
2. `In Between (prefer C)`
3. `In Between (prefer B)`
4. `Least Liquid`

It then applies:

- **FPS**: Fed Pressure Score
- **GPS**: Growth Pulse Score

These adjust the base allocation to be more defensive or more growth-oriented depending on macro conditions.

## Project Structure

```text
macropulse/
├── backend/
│   ├── adapters/openbb_adapter.py
│   ├── apis/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── config.js
│   ├── database.js
│   └── server.js
├── frontend/
│   ├── src/
│   ├── index.html
│   └── package.json
├── docs/
│   ├── FPS_GPS_IMPLEMENTATION.md
│   └── how-to-invest.md
├── scripts/
│   ├── fetchMacroData.js
│   └── initDb.js
├── .env.example
├── requirements.txt
└── README.md
```

## Troubleshooting

**`No module named openbb` or Python bridge failures**

- Activate the project venv.
- Install dependencies with `pip install -r requirements.txt`.
- Make sure `PYTHON_PATH` points to that interpreter.

**Refresh is slow or a provider is failing**

- The app tries providers in configured order with fallback.
- Keep `fmp` as the primary provider unless you have a reason to change it.
- If OpenBB's `yfinance` adapter is broken or a provider blocks a ticker, the backend will make one last direct Yahoo Finance attempt for fundamentals.
- Review backend logs for provider-specific errors.

**No regime data available**

```bash
npm run fetch-macro
```

**Need a clean local database**

```bash
rm -f data/stocks.db data/stocks.db-shm data/stocks.db-wal
npm run init-db
npm run fetch-macro
```

## Further Reading

- [FPS/GPS Enhancement Specification](./docs/FPS_GPS_IMPLEMENTATION.md)
- [Investment Methodology](./docs/how-to-invest.md)

## Limitations

- No authentication or multi-user support
- Intended for local use, not hosted production deployment
- Depends on third-party market/macro data providers
- Free-tier API limits still apply
- Not designed for intraday or execution-sensitive workflows

## Contributing

Issues and pull requests are welcome. If you plan to change the classification or macro logic materially, open an issue first so the assumptions stay explicit.

## License

MIT. See [LICENSE](./LICENSE).
