<div align="center">
  <img src="./macropulse.jpeg" alt="Macropulse" width="320" />
  <h1>Macropulse</h1>
  <p><em>A Bloomberg-terminal-flavored portfolio dashboard with a US macro regime overlay. Local, single-user, keyboard-first.</em></p>
</div>

---

## What it does

- Classifies equities into four buckets (A · B · C · D) from growth, valuation and leverage metrics.
- Runs a US macro regime model (FPS / GPS over 10 indicators) and turns it into a recommended A/B/C/D allocation.
- Stores positions, fundamentals, notes, and historical classifications in a local SQLite file.
- Presents everything through a switchable, keyboard-driven terminal UI with three layout modes and four palettes.

Not a broker, not a backtester, not multi-user.

## Stack

| Layer        | Tech                                                  |
| ------------ | ----------------------------------------------------- |
| Backend      | Node 18 + Express, `better-sqlite3`                   |
| Data bridge  | Direct FRED HTTP for macro · Python 3.11 + OpenBB for equity provider calls |
| Frontend     | React 18 + Vite + Tailwind, runtime-themed via CSS vars |
| Persistence  | SQLite (`data/stocks.db`) + `localStorage` for prefs   |

## Quick start

```bash
git clone <repo>
cd portfolio-app

npm run setup              # root deps · frontend deps · Python venv · DB

# Edit .env and set FMP_API_KEY + FRED_API_KEY

npm run fetch-macro
npm run doctor             # verifies keys, deps, DB, macro data, ports
npm run dev:all            # backend :8345 · frontend :4949
```

Open `http://localhost:4949`.

## Environment

All settings live in `.env`. The non-obvious ones:

| Var              | Purpose                                             |
| ---------------- | --------------------------------------------------- |
| `FMP_API_KEY`    | Primary fundamentals / quotes / profiles provider   |
| `FRED_API_KEY`   | Macro time series                                   |
| `PYTHON_PATH`    | Must point at the venv's `python` for OpenBB equity calls |
| `PORT`           | Backend port (default `8345`)                       |
| `DATABASE_PATH`  | SQLite file location                                |
| `PRIMARY_*` / `FALLBACK_*` | Per-domain provider chains (see `.env.example`) |

`OPENBB_FMP_API_KEY` and `OPENBB_FRED_API_KEY` are optional mirrors. If omitted, the backend derives them from `FMP_API_KEY` and `FRED_API_KEY` before spawning Python provider calls.

## UI

The dashboard is split into three switchable **layouts** and four interchangeable **themes**.

### Layouts

Pick from the topbar pill, hit `d` to cycle, or run `/layout <id>` in the command palette. Choice persists in `localStorage` (`macropulse:prefs`).

| Glyph | Mode    | Spatial idea                                                                                            | Best for                |
| ----- | ------- | ------------------------------------------------------------------------------------------------------- | ----------------------- |
| `▤`  | Cockpit | 3-col command bridge — sticky macro rail · verdict + allocation + holdings · sticky portfolio rail      | Reading the regime      |
| `▦`  | Panel   | Verdict ribbon + 12-col quadrant grid (allocation · macro engine, holdings · portfolio + activity)      | Glancing everything     |
| `▥`  | Floor   | One-line ticker ribbon + narrow indicator rail + holdings-dominant column with collapsible macro engine | Managing positions      |

Layouts share components (`VerdictRibbon`, `TickerRibbon`, `MacroRail`, `PortfolioRail`, `AllocationStrip`, `ActivityLog`, `CollapsiblePanel`); only their composition differs.

### Themes

Configured in `frontend/public/settings.json` (loaded at runtime — no rebuild needed). Each palette is 15 RGB triplets.

| ID         | Look                  |
| ---------- | --------------------- |
| `phosphor` | Green CRT (default)   |
| `amber`    | Bloomberg amber       |
| `slate`    | Dark cyan             |
| `paper`    | Bright light          |

Switch via the topbar pill, `t` to cycle, or `/theme <id>`.

### Keyboard

| Keys                | Action                              |
| ------------------- | ----------------------------------- |
| `⌘K` / `Ctrl K`     | Command palette                     |
| `r`                 | Refresh dashboard                   |
| `t` / `d`           | Cycle theme · cycle layout          |
| `/`                 | Focus holdings search               |
| `?`                 | Toggle this list                    |
| `g h` / `a` / `m` / `s` | Jump to home · advice · macro · holdings |

### Command palette (`⌘K`)

Plain text → ticker actions (`AAPL` adds, fuzzy-matches existing rows). Slash → commands.

```
/refresh            run quotes + details + macro
/theme amber        switch palette
/layout floor       switch dashboard layout
/goto holdings      scroll to section
/delete AAPL        remove ticker (confirm)
```

## Models

### Classification (A–D)

- **A** — lower growth, lower valuation, lower leverage
- **B** — quality growth, moderate valuation and leverage
- **C** — faster growth, richer valuation
- **D** — hypergrowth / pre-profit / speculative

A confidence score reports how cleanly a name lands in its bucket.

### Macro regime

Base liquidity regime (`Most Liquid` → `In Between (prefer C)` → `In Between (prefer B)` → `Least Liquid`) is shifted by two scores:

- **FPS** — Fed Pressure Score
- **GPS** — Growth Pulse Score

Both run on 10 indicators with per-indicator weights. The output is an A/B/C/D allocation tilt; full breakdown lives in [docs/regime-engine.md](./docs/regime-engine.md).

## Documentation

Full docs are indexed in [`docs/README.md`](./docs/README.md):

- **Strategy** — [`docs/framework/`](./docs/framework/README.md): [regime](./docs/framework/regime.md) · [valuation](./docs/framework/valuation.md) · [indicators](./docs/framework/indicators.md) · [signals](./docs/framework/signals.md) · [mindset](./docs/framework/mindset.md)
- **Implementation** — [classification.md](./docs/classification.md) (A/B/C/D classifier) · [regime-engine.md](./docs/regime-engine.md) (FPS/GPS + allocation)
- **Visual overview** — [`docs/showcase.html`](./docs/showcase.html)
- **Planning and status** — [master plan](./docs/planning/master-plan.md) · [improvement plan](./docs/planning/improvement-plan.md) · [buy/sell-signals status](./docs/status/buy-sell-signals.md)
- **Research** — [data gravity](./docs/research/data-gravity.md) · [data sources](./docs/research/data-sources.md)

## Refresh model

Stock data and macro data refresh independently.

```bash
# UI button (or `r`) — quotes, details, macro in one run
# CLI equivalents:
npm run fetch-macro      # macro only (FRED series)
npm run doctor           # setup check: deps, env, DB, macro rows, ports
```

Cadence: stock refresh after earnings or on demand; macro refresh weekly or after major releases.

## Project layout

```text
portfolio-app/
├── backend/
│   ├── adapters/openbb_adapter.py    # Python bridge to OpenBB
│   ├── apis/                         # provider clients
│   ├── routes/                       # express routes
│   ├── services/                     # classification + regime engines
│   ├── config.js · database.js · server.js
├── frontend/
│   ├── public/settings.json          # runtime themes + default layout
│   └── src/
│       ├── App.jsx                   # routes by layout id
│       ├── layouts/                  # CockpitLayout · PanelLayout · FloorLayout
│       ├── components/               # shared dense pieces (rails, ribbons, panels)
│       ├── hooks/useDashboardData.js # single hook fronting the API
│       ├── config/defaultSettings.js # inlined fallback for settings.json
│       └── utils/cssVars.js          # palette → CSS var application
├── docs/
│   ├── README.md                     # documentation index
│   ├── framework/                    # strategy: regime · valuation · indicators · signals · mindset
│   ├── planning/                     # roadmaps and implementation plans
│   ├── research/                     # data-source and model-impact analysis
│   ├── status/                       # feature status notes
│   ├── classification.md             # A/B/C/D stock classifier spec
│   ├── regime-engine.md              # FPS/GPS scoring + allocation
│   └── showcase.html                 # visual overview
├── scripts/{setup,doctor,initDb,fetchMacroData}.js
├── requirements.txt · .env.example
```

## Troubleshooting

| Symptom                            | Fix                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `npm run dev:all` stops in preflight | Run `npm run doctor`; follow the first `[fail]` message.                                  |
| Missing frontend/root dependency   | Run `npm run setup` or `npm install && npm --prefix frontend install`.                     |
| `No module named openbb`           | Activate `venv`, reinstall `requirements.txt`, point `PYTHON_PATH` at `./venv/bin/python`. |
| Refresh stalls / provider errors   | Check `PRIMARY_*` and `FALLBACK_*` chains; final fundamentals fallback hits Yahoo direct.  |
| `MACRO REGIME UNAVAILABLE` banner  | Run `npm run fetch-macro`.                                                                 |
| Want a clean DB                    | Delete `data/stocks.db*`, then run `npm run init-db && npm run fetch-macro`.              |
| Theme / layout changes don't stick | Clear `localStorage` key `macropulse:prefs`.                                               |

## Limits

- Single-user, no auth — runs on `localhost`.
- Subject to free-tier provider limits (FMP, FRED).
- Daily-cadence data; not for intraday or execution.

## License

MIT — see [LICENSE](./LICENSE).
