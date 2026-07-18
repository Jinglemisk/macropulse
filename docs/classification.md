# Stock classification (A/B/C/D)

How Macropulse assigns each stock to an archetype. Implemented in
`backend/services/classifier.js` with targets in `backend/config.js` (`classTargets`)
and the `tri()` helper in `backend/utils/formulas.js`. For the strategy behind the
archetypes, see [`framework/regime.md`](framework/regime.md).

## Inputs (per stock)
`revenueGrowth`, `epsGrowth`, `peForward` (NTM), `debtEbitda`, plus raw `eps` /
`ebitda` and flags `epsPositive`, `ebitdaPositive`, `peAvailable`. These are supplied
by the equity providers (FMP → OpenBB → Yahoo); the classifier does not compute them.

## Triangular closeness
```
tri(x, center, halfwidth) = max(0, 1 − |x − center| / halfwidth)
```
Returns `1.0` at the center, falls linearly to `0` at ±halfwidth, and is `null` when
the input is missing (nulls are dropped, not counted as `0`).

## Per-class scores
Each class score is the **average of the non-null** `tri()` values across the four
metrics, using these targets (`config.js:5-31`):

| Metric | A (ctr/hw) | B | C | D fallback |
|--------|-----------|---|---|-----------|
| Revenue growth | 5 / 5 | 10 / 5 | 20 / 10 | 60 / 30 |
| EPS growth | 5 / 5 | 10 / 7 | 10 / 10 | 80 / 40 |
| Forward P/E | 10 / 6 | 20 / 6 | 25 / 10 | 150 / 100 |
| Debt/EBITDA | 1 / 1 | 3 / 1.5 | 5 / 2 | 8 / 4 |

## The D gate
Class D is special. `D = 1.0` immediately if **any** of these hold
(`classifier.js:55-59`):

- `revenueGrowth ≥ 50` (hypergrowth), **or**
- `eps < 0` (actually loss-making), **or**
- `ebitda < 0`, **or**
- `!peAvailable && epsGrowth === null` (no earnings signal at all).

Otherwise D falls back to the averaged `tri()` score using the D column above.

> **Note (doc-vs-code):** an earlier spec described the gate as
> `NOT eps_positive OR NOT ebitda_positive OR NOT pe_available`. The shipped code is
> stricter — it keys on *actually negative* `eps`/`ebitda` and AND-combines the
> missing-P/E case with a missing EPS-growth signal. The behavior above is canonical.

## Final class & confidence
```
class      = argmax(A, B, C, D)      # tie-break priority D > C > B > A
confidence = topScore − secondScore  # clamped to [0, 1]
```
Confidence tiers for the UI (`config.js:35-38`): **high ≥ 0.40**, **medium ≥ 0.20**,
below that is a borderline case worth manual review.

## Edge cases
- **Pre-profit / no P/E** → D gate fires → correctly classified D.
- **Net cash (negative debt)** → treat as `de ≈ 0`, scores well for A.
- **Sector outliers** (REITs, utilities, financials) have structurally different
  metrics; classify with care or exclude.
