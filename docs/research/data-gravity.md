# Data Gravity — how missing/degraded inputs distort each decision

How much each missing, proxied, or buggy data input actually moves Macropulse's
outputs — so we can weight, adjust, or suppress accordingly. Traced through
`scoreCalculator.js` (weights), `allocationEngine.js` (tilt), `classifier.js`, and
`buySellSignalCalculator.js`. Verified against the live DB row 2026-05-27.

**Headline:** missing data barely touches the most important decision (the regime)
and severely distorts a secondary one (the FPS tilt). Most of the distortion is
**free-fixable code**, not a data-cost problem.

---

## ① Regime + base allocation — 0% exposure (clean)
Which of the 4 quadrants we're in — and thus the base A/B/C/D split (e.g. Most
Liquid = `A10/B20/C30/D40`) and the headline archetype — is driven **only** by `DFF`
(rate percentile) and `WALCL` (balance-sheet slope). Both are clean, correct, free
FRED series. No missing/proxied data touches this. The foundation is sound.

## ② FPS allocation tilt — ~70% of weight compromised
FPS = weighted average of 10 indicators (total weight 11.5).

| Indicator | Weight | % of FPS | Health |
|---|--:|--:|---|
| Core CPI YoY | 2.0 | 17.4% | ❌ NULL (fetch-window bug) |
| Unemployment | 1.5 | 13.0% | ✅ works |
| Nonfarm payrolls | 1.5 | 13.0% | ⚠️ inert (level not Δ → always "Normal" → 0) |
| CPI YoY | 1.5 | 13.0% | ❌ NULL |
| PPI | 1.0 | 8.7% | ❌ always "High" (unit bug) |
| Jobless claims | 1.0 | 8.7% | ✅ works |
| CFNAI | 1.0 | 8.7% | ✅ works |
| Retail sales | 1.0 | 8.7% | ❌ always "High" (unit bug) |
| Industrial prod. | 0.5 | 4.3% | ❌ always "High" (unit bug) |
| Consumer conf. | 0.5 | 4.3% | ❌ always "Low" (scale bug) |

**Rolled up:** 30% functioning · 26% constant bug-bias · 30% missing (inflation) ·
13% inert.

**Worked example (row 2026-05-27):** numerator = jobless(+1.0) + ppi(+1.0) +
indpro(+0.5) + retail(+1.0) + conf(−0.5) = **+3.0**; denominator = 8.0 (CPI +
core-CPI excluded because NULL); **FPS = +0.375 ("Moderate Hawkish")**. But **+2.0 of
that +3.0 (67%) is pure bug artifact**; only +1.0 (jobless) is real. De-bugged FPS ≈
**+0.20**, and the 30% inflation weight contributes nothing.

**Money impact:** tilt = `FPS × 0.25 × 100` points, applied defensively D→C→B→A.
- Reported +0.375 → **~9.4 points** shifted growth→defensive.
- De-bugged +0.20 → ~5 points.
- **Bugs alone push ~4–5% of the portfolio defensive; restored inflation could swing
  it ±10+ points.**

## ③ GPS tie-break — ~0% practical gravity now (56% structural)
Only fires for a B-vs-C tie when `|FPS| < 0.2` in an In-Between regime, max ±7.5 pts.
**The FPS bug keeps `|FPS|` ~0.375 > 0.2, so it almost never runs.** Low priority.

## ④ A/B/C/D classifier — up to 50% forward-dependent + blanket-D risk
Four equal-weighted metrics (25% each). `peForward` (25%) and NTM `epsGrowth` (25%)
**both need forward analyst estimates** — the one paywalled input. Without them, half
the signal is gone or falls back to trailing.
**Highest-gravity failure:** the D-gate fires `D = 1.0` on `!peAvailable &&
epsGrowth === null` — so a stock with **no forward estimates is auto-classified D**,
even a stable Class-A name. Broadly missing forward data ⇒ everything dumped into D.

## ⑤ Buy/sell verdict — 40% entry degraded, 100% overrides missing
AND-gate, so each signal has near-total veto gravity.
- **2 of 5 entry signals compromised:** ③ margin uses `WALCL` (wrong series);
  ⑤ "earnings" uses growth levels not beats (needs estimates).
- **3 of 3 systemic overrides absent:** credit spread not fetched, inflation gate
  not wired, fraud not modeled. Asymmetric gravity — they matter in the ~15–20% tail
  (crashes), which is when losses are largest. The model can flash **BUY during a
  credit crunch**.

---

## Master gravity table

| Decision output | Exposure | Distortion | Fix cost |
|---|---|---|---|
| Regime + base allocation | ~0% | none | — (clean) |
| FPS allocation tilt | ~70% of weight | ~4–5 pts now; ±10+ once inflation restored | **Free** |
| GPS tie-break | 56% struct / ~0% active | ≤7.5 pts, rarely fires | **Free** |
| A/B/C/D classifier | 50% + blanket-D gate | up to total misclassification | **~$22/mo or free FMP test** |
| Buy/sell verdict | 40% entry + 100% overrides | can BUY into a crash | **Mostly free** |

## Interim adjustments (until fixed)
- **Trust the regime/base allocation; distrust the FPS tilt.** Optionally set
  `tiltMagnitude → 0` so allocation = clean base until the indicator bugs are fixed.
- **Suppress the D-gate `!peAvailable` branch** when forward data is simply
  unavailable, so missing-data ≠ speculative.
- **Label the buy/sell verdict "entry-only, no crash protection"** until the
  credit-spread override is wired.

## The takeaway
~70% of the compromised "gravity" (all of FPS, the credit + inflation overrides, the
confidence scale) is **free** to fix (FRED + code). The only genuinely cost-gated
gravity is **forward estimates**, concentrated in the classifier (50%) and entry
signal ⑤ — the one place ~$22/mo (or a free-tier test) buys real accuracy. See
[data-sources.md](data-sources.md).
