# Refresh Architecture Plan

Branch target: `revamp`

Status: planning only. Do not implement from this document yet.

## Goal

Split refresh into separate domains so we stop treating all data as one opaque operation:

1. Stock quote refresh
2. Stock detail refresh
3. Macro refresh

Then expose one master refresh control in the UI that can trigger those domains together while still reporting partial success, per-domain failures, and missing-data warnings clearly.

## Why This Change Is Needed

Current behavior couples too many things together:

- `POST /api/stocks/refresh` refreshes stock fundamentals, price, and classification as one unit.
- The frontend treats refresh as mostly a single operation with one report block.
- Macro refresh is outside the normal UI flow and currently lives in `updateMacroData()` plus the scheduler.
- A stock can look "refreshed" even when quote data succeeded but detail data failed or was incomplete.

The `NVO` case exposed this directly:

- Quote/basic Yahoo data can succeed.
- Detailed fundamentals can fail or be partial.
- The app can still continue, which is useful, but it needs to label that state explicitly.

## Current State In Code

### Stock refresh

- Backend route: `backend/routes/stocks.js`
- Current refresh entrypoint: `POST /api/stocks/refresh`
- Current dependency chain: `getFundamentals()` in `backend/apis/fmp.js`
- Current storage target: `fundamentals` table plus `classification_history`

### Macro refresh

- Backend macro updater: `backend/apis/fred.js`
- Manual script: `scripts/fetchMacroData.js`
- Scheduler path: `backend/services/scheduler.js`
- Current UI consumption: `GET /api/regime` only

### Main limitation

- There is no first-class refresh status model for:
  - quote success
  - detail success
  - macro success
  - partial success
  - stale or missing data warnings

## Proposed Refresh Domains

### 1. Stock quote refresh

Definition:

- Refresh only fast market price data for each stock.
- Primary stored fields:
  - `latest_price`
  - `price_timestamp`
  - quote refresh timestamp/status metadata

Behavior:

- This is the cheapest and most reliable stock refresh path.
- It should not depend on fundamentals, classification, or macro refresh.
- It should not recompute class by itself.

Rationale:

- User expectation is that price is basic and usually available.
- A quote-only success should still count as meaningful success.

### 2. Stock detail refresh

Definition:

- Refresh classification-driving fundamentals and any detailed stock metadata needed to explain the stock.
- Primary fields:
  - `revenue_growth`
  - `eps_growth`
  - `pe_forward`
  - `debt_ebitda`
  - `eps_positive`
  - `ebitda_positive`
  - `pe_available`
  - optional provenance / partial-data metadata

Behavior:

- Recompute classification only after stock detail refresh, not quote refresh.
- If detail refresh is partial or fails, preserve the prior valid classification and mark the stock as warning/stale instead of silently reclassifying from incomplete data.

Rationale:

- Quote data and detail data have different reliability characteristics.
- The `NVO` case showed quote data can work while detailed fundamentals fail.

### 3. Macro refresh

Definition:

- Refresh global macro inputs and derived regime inputs.
- Includes:
  - Fed funds (`DFF`)
  - balance sheet (`WALCL`)
  - unemployment (`UNRATE`)
  - CPI (`CPIAUCSL`)
  - core CPI (`CPILFESL`)
  - PPI (`PPIACO`)
  - jobless claims (`ICSA`)
  - nonfarm payrolls (`PAYEMS`)
  - CFNAI
  - INDPRO
  - retail sales (`RSXFS`)
  - consumer confidence (`UMCSENT`)
  - moving averages used by FPS/GPS

Behavior:

- Macro refresh is global, not ticker-specific.
- Macro refresh should update regime freshness/warning state independently of stock refresh state.

Rationale:

- Macro reliability and stock reliability should not be conflated.
- Regime can be stale even if all stock prices are fresh.

## UX Plan

### Master refresh button

Add one master refresh button at the top right of the dashboard.

Expected behavior:

- Clicking it triggers:
  - stock quote refresh for all tickers
  - stock detail refresh for all tickers
  - macro refresh
- These should be orchestrated together, but tracked separately.

Important:

- This is one control, not one undifferentiated request result.
- The UI should show aggregated results by domain.

### Success message under the button

If anything succeeds at all, show a success-style result area under the button.

Examples:

- `Refresh completed: quotes updated for 22/22, details updated for 17/22, macro updated.`
- `Refresh completed with warnings: quotes updated, details partially failed, macro failed.`

Rule:

- Do not show all-or-nothing failure if at least one domain succeeded.
- Use warning tone for mixed outcomes.
- Use error tone only when nothing succeeded.

### Per-stock warning next to ticker

In the stock list component, display a warning indicator next to the ticker when either of these is true:

- stock detail refresh failed or is missing required data
- global macro refresh is stale or failed

Hover tooltip should explain which state applies:

- `Stock detail data missing or stale`
- `Macro data missing or stale`
- `Stock detail and macro data both need refresh`

Important distinction:

- Quote freshness alone should not clear a detail warning.
- Macro freshness is global, but it can still be surfaced in each row so the user sees that stock views are being interpreted with stale macro context.

## Data Model Plan

Add explicit refresh-status fields instead of inferring state only from null metrics.

### Stock-level metadata

Recommended additions to `stocks`:

- `last_quote_refresh_at`
- `last_detail_refresh_at`
- `last_quote_refresh_status`
- `last_detail_refresh_status`
- `last_quote_refresh_error`
- `last_detail_refresh_error`
- `detail_data_warning`
- `quote_data_warning`

Recommended additions to `fundamentals` or a new stock refresh status table:

- `data_source_quote`
- `data_source_detail`
- `detail_is_partial`
- `detail_missing_fields` as JSON/text

Preferred approach:

- Create a new `stock_refresh_status` table instead of overloading `stocks`.
- Keep `stocks` for business data, use status table for operational metadata.

### Macro-level metadata

Add a new `macro_refresh_status` table or equivalent persisted record with:

- `last_macro_refresh_at`
- `last_macro_refresh_status`
- `last_macro_refresh_error`
- `missing_series` as JSON/text
- `stale_series_count`
- `last_successful_macro_date`

### Why persist status

- Warnings must survive page reload.
- The app needs to distinguish:
  - never fetched
  - fetch failed
  - partial fetch
  - stale data
  - fresh success

## Backend API Plan

### New stock refresh endpoints

Replace the single mixed stock refresh path with domain-specific endpoints:

- `POST /api/stocks/refresh/quotes`
- `POST /api/stocks/refresh/details`
- `POST /api/stocks/refresh/all`

Request behavior:

- Accept optional `tickers` array for quote/detail endpoints.
- `all` endpoint refreshes quotes + details for all stocks.

Response shape:

```json
{
  "success": true,
  "domains": {
    "quotes": {
      "requested": 22,
      "succeeded": 22,
      "failed": 0,
      "results": []
    },
    "details": {
      "requested": 22,
      "succeeded": 17,
      "failed": 5,
      "results": [
        {
          "ticker": "NVO",
          "status": "warning",
          "message": "Quote succeeded but detail fetch failed",
          "missingFields": ["revenueGrowth", "epsGrowth", "peForward", "debtEbitda"]
        }
      ]
    }
  }
}
```

### New macro refresh endpoint

Add:

- `POST /api/regime/refresh`

Behavior:

- Trigger macro fetch/update
- return series-level results
- include missing/stale series in response

Response shape:

```json
{
  "success": true,
  "macro": {
    "status": "warning",
    "succeededSeries": ["DFF", "WALCL", "UNRATE"],
    "failedSeries": ["CPILFESL"],
    "missingSeries": ["PPIACO"],
    "message": "Macro refresh completed with partial data"
  }
}
```

### Master refresh endpoint

Optional but recommended:

- `POST /api/refresh`

Behavior:

- Orchestrates:
  - stock quotes
  - stock details
  - macro
- Returns one combined response used by the master refresh button.

This is cleaner than having the frontend coordinate three calls if we want consistent logging and scheduler reuse.

## Backend Service Plan

### Split stock data fetchers

Refactor the current stock refresh pipeline so we have separate service functions:

- `refreshStockQuote(ticker)`
- `refreshStockDetails(ticker)`
- `refreshStockAll(ticker)` as orchestration only

Implementation note:

- Quote refresh should call a quote-specific provider chain.
- Detail refresh should call a fundamentals-specific provider chain.
- Current `getFundamentals()` in `backend/apis/fmp.js` mixes quote and details and should be split or wrapped.

### Minimum detail completeness rule

Before recomputing classification, require a minimum usable detail set.

Suggested rule:

- classify only when at least 2 of the 4 core detail metrics exist
- mark `detail_is_partial = true` when fewer than 4 exist
- if classification is skipped, preserve last known valid classification and attach warning metadata

Core detail metrics:

- `revenueGrowth`
- `epsGrowth`
- `peForward`
- `debtEbitda`

### Macro refresh breakdown

Refactor `updateMacroData()` to produce per-series status instead of only a row count.

Needed output:

- series succeeded
- series failed
- series missing
- last observation date by series
- stale-series evaluation

### Scheduler alignment

Update `backend/services/scheduler.js` to use the same refresh service layer as manual refresh.

Goal:

- one implementation path
- no duplicated refresh logic
- identical status recording regardless of scheduler vs UI

## Frontend Plan

### Dashboard header

Move refresh control to a single master button at the top right of the main dashboard header.

Under it, render a compact status area that summarizes:

- quotes
- details
- macro

### Stock list warnings

In `StockRow` / `StockTable`, add a warning icon next to ticker text.

Tooltip content should support these cases:

- `Price data is fresh, but detail data is missing or stale`
- `Macro data is missing or stale`
- `Detail data and macro data are both incomplete`
- `Detail data fetched partially from fallback providers`

### Regime / macro warnings

In the regime area, show a macro freshness warning when:

- last macro refresh failed
- any critical series are missing
- critical series are stale relative to acceptable cadence

Examples:

- daily-ish: `DFF`
- weekly: `WALCL`, `ICSA`
- monthly: `UNRATE`, `CPIAUCSL`, `CPILFESL`, `PPIACO`, `PAYEMS`, `CFNAI`, `INDPRO`, `RSXFS`, `UMCSENT`

The UI should not treat normal series cadence as failure. It should compare each series against a cadence-aware staleness threshold.

## Warning Semantics

### Stock warning

Show stock warning when any of these are true:

- detail refresh failed
- detail refresh partial
- stock has never had a successful detail refresh

### Macro warning

Show macro warning when any of these are true:

- macro refresh failed
- one or more critical series are missing
- data is stale beyond cadence-aware thresholds

### Combined row warning

A row-level warning can include:

- stock detail issue only
- macro issue only
- both

This satisfies the requirement that hover text explain whether stock and/or macro data has not been fetched successfully.

## Rollout Order

1. Add persistence for refresh status metadata.
2. Split backend service logic into quote/detail/macro domains.
3. Add new refresh endpoints plus combined orchestrator.
4. Update scheduler to use shared services.
5. Update frontend master refresh UX and response handling.
6. Add per-stock warning indicator and tooltip behavior.
7. Add macro warning surfaces in regime/dashboard components.
8. Add tests for partial success and warning-state behavior.

## Non-Goals For This Phase

- No redesign of scoring methodology
- No rewrite of provider adapters beyond what is needed to separate quote vs detail refresh
- No removal of fallback providers
- No automatic background retry policy yet

## Acceptance Criteria

- One master refresh button exists at top right.
- Quote, detail, and macro refresh are tracked separately.
- Any successful domain produces a non-error refresh result message.
- A stock can show warning state even if quote refresh succeeded.
- Macro warning state is visible independently of stock warning state.
- Hover text explains whether the issue is stock detail, macro, or both.
- Scheduler and manual refresh use the same service layer.
- The app no longer treats partial quote-only stock data as a fully healthy detail refresh.

## Open Questions Before Implementation

- Should quote-only refresh ever update `last_updated`, or should that be reserved for detail refresh?
- Should stale macro warnings appear globally only, or both globally and in each stock row as requested?
- Should a partial detail refresh preserve the prior classification, or show `Unclassified / Warning`?
- Do we want separate manual controls later for:
  - quotes only
  - details only
  - macro only

My recommendation:

- reserve `last_updated` for detail refresh
- store a separate `last_quote_refresh_at`
- show macro warnings both globally and in each stock row
- preserve prior valid classification when new detail refresh is partial/failed
