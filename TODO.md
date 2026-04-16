# TODO

## Product

- [ ] Add a portfolio summary strip at the top of the dashboard using `/api/portfolio/summary`.
- [ ] Add `Refresh Macro` and `Refresh All Data` actions in the UI.
- [ ] Add per-stock refresh actions in the portfolio table.
- [ ] Show refresh progress and per-ticker success/failure results instead of a single global loading state.
- [ ] Add a stock search field in the portfolio view.
- [ ] Add bulk add/import for tickers.
- [ ] Add export for portfolio data and notes.

## Analysis UX

- [ ] Add a plain-English explanation for why each stock was classified into its current class.
- [ ] Show metric deltas since the last refresh for each stock.
- [ ] Add a low-confidence explanation to help users understand ambiguous classifications.
- [ ] Add simple price history sparklines or short lookback charts.

## History

- [ ] Add stock classification history views using `classification_history`.
- [ ] Add regime history views using `regime_history`.
- [ ] Show FPS/GPS trends over time.
- [ ] Show class migration history for each stock.

## Data And Automation

- [ ] Wire `startScheduler()` into server startup so background refresh actually runs.
- [ ] Expose last successful stock refresh and macro refresh timestamps in the UI.
- [ ] Surface provider health and fallback behavior in an admin/debug panel.
- [ ] Add a manual cache clear action for troubleshooting.

## API And Backend

- [ ] Add dedicated endpoints for stock history and regime history.
- [ ] Add a macro refresh endpoint so the frontend can trigger macro updates without CLI commands.
- [ ] Add per-ticker refresh endpoints or route support for row-level refresh.
- [ ] Return structured refresh results that the frontend can render directly.

## Frontend

- [ ] Use the existing portfolio summary endpoint in the UI.
- [ ] Replace `alert()`-based error handling with inline toasts or status banners.
- [ ] Improve empty states and error recovery flows.
- [ ] Add better mobile handling for the stock table and expanded stock details.

## Quality

- [ ] Add automated tests for classification logic.
- [ ] Add automated tests for regime calculation logic.
- [ ] Add API route tests for core stock, regime, and portfolio endpoints.
- [ ] Add a basic CI workflow for install, lint, and test coverage.

## Publish Readiness

- [ ] Replace the placeholder Vite-origin assets completely.
- [ ] Add screenshots or a short demo section to `README.md`.
- [ ] Add a changelog or release notes process.
- [ ] Decide whether the repo is intended to remain local-only or support hosted deployment later.
