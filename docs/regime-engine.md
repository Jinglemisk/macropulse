# Regime engine (FPS / GPS / allocation)

How Macropulse turns macro data into a regime and an A/B/C/D allocation. This
documents the **shipped code**; for the strategy behind it see
[`framework/regime.md`](framework/regime.md), and for known correctness issues see
[`../IMPROVEMENT-PLAN.md`](../IMPROVEMENT-PLAN.md).

> **Where the values live.** The numbers that actually run are hard-coded in
> `indicatorClassifier.js` (thresholds + score maps), `scoreCalculator.js` (weights),
> `allocationEngine.js` (base allocations + tilt), and `movingAverages.js` (MA
> windows). The parallel blocks in `config.js` are **not imported** — treat them as
> dead until wired up.

## 1. Base regime
`backend/services/regimeCalculator.js` / `enhancedRegimeCalculator.js`:

- **rateIsLow** = `DFF` percentile over the trailing 1-year min/max range `< 0.5`.
- **balanceSheetIncreasing** = `WALCL` 12-week (84-day) slope `> 0`.

| rateIsLow | BS increasing | Regime | Recommended |
|:---------:|:-------------:|--------|-------------|
| ✓ | ✓ | Most Liquid | Class D, 0–100%+ |
| ✓ | ✗ | In Between (prefer C) | Class C, 0–50% |
| ✗ | ✓ | In Between (prefer B) | Class B, 0–50% |
| ✗ | ✗ | Least Liquid | Class A, 0–20% |

## 2. Indicator classification
`backend/services/indicatorClassifier.js` reads the `*_ma3` smoothed columns and bins
each of the 10 indicators into **Low / Normal / High** by threshold, then maps to a
`−1 / 0 / +1` score:

- **FPS** (Fed pressure) uses all 10. `+1` = hawkish/contractionary pressure.
  (e.g. high CPI → +1; high unemployment → −1.)
- **GPS** (growth pulse) uses the 7 non-inflation indicators only.

Thresholds and the full FRED-series list are in
[`framework/indicators.md`](framework/indicators.md).

## 3. FPS / GPS scores
`backend/services/scoreCalculator.js` — a **weighted average** of the per-indicator
scores (null indicators are skipped and excluded from the denominator):

| Indicator | FPS weight | GPS weight |
|-----------|:----------:|:----------:|
| Unemployment | 1.5 | 1.5 |
| Jobless claims | 1.0 | 1.0 |
| Non-farm payrolls | 1.5 | 2.0 |
| CPI YoY | 1.5 | — |
| Core CPI YoY | 2.0 | — |
| PPI | 1.0 | — |
| CFNAI | 1.0 | 1.5 |
| INDPRO | 0.5 | 0.5 |
| Retail sales | 1.0 | 1.5 |
| Consumer sentiment | 0.5 | 1.0 |
| **Total** | **11.5** | **9.0** |

Interpretation bands: FPS `>0.5` strong contractionary … `<−0.5` strong expansionary;
GPS `>0.5` very strong growth … `<−0.5` recessionary.

## 4. Allocation
`backend/services/allocationEngine.js`. Start from the regime's **base allocation**:

| Regime | A | B | C | D |
|--------|--:|--:|--:|--:|
| Most Liquid | 10 | 20 | 30 | 40 |
| In Between (prefer C) | 15 | 25 | 40 | 20 |
| In Between (prefer B) | 15 | 40 | 30 | 15 |
| Least Liquid | 60 | 30 | 10 | 0 |

Then apply two adjustments:

- **FPS tilt** (`k = 0.25`, max ±25% shift). FPS `> 0` (hawkish) tilts defensively
  `D→C→B→A`; FPS `< 0` (dovish) tilts toward growth `A→B→C→D`. Result is renormalized
  to 100%.
- **GPS tie-break** — only when `|FPS| < 0.2` and the regime is "In Between": GPS `>
  0.3` shifts ~7.5% B→C; GPS `< −0.3` shifts C→B.

## 5. Smoothing
`backend/utils/movingAverages.js` writes `*_ma3` columns. `calculateYoY` is applied to
CPI and core-CPI before averaging; other series are averaged directly. MA windows
(months): unemployment 6, jobless 3, payrolls 9, CPI/core-CPI YoY 9, PPI 12, CFNAI 6,
INDPRO 9, retail 9, sentiment 12.

> ⚠️ Only CPI/core-CPI get a rate-of-change transform; PPI, INDPRO, retail, payrolls,
> and sentiment are averaged on the wrong basis for their thresholds. See
> IMPROVEMENT-PLAN Order 1 (BUG-1…7).

## 6. Persistence & API
- Data lands in the `macro_data` table (raw series + `*_ma3` columns); regime results
  can be recorded to `regime_history` (regime, FPS/GPS, confidences, A/B/C/D
  allocation, breakdown JSON).
- **API** (`backend/routes/regime.js`, mounted at `/api/regime` in `server.js`):
  - `GET /api/regime` → base regime + enhanced regime (scores, allocation, breakdown).
  - `POST /api/regime/refresh` → refresh macro data and recompute.
