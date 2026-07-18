# Regime — the Fed liquidity matrix

The core of Macropulse. Two Fed levers define four liquidity regimes, and each regime
has a stock profile built to win in it.

## The two levers

- **Policy rate** — the price of money (`DFF`, daily effective fed funds).
  Low = cheap money = more liquidity; high = less liquidity.
- **Balance sheet** — the quantity of money (`WALCL`, total Fed assets).
  Rising (QE) = more liquidity; shrinking (QT) = drainage.

Macropulse reads them as:
- **Rate is "low"** when today's `DFF` sits in the **lower half of its trailing
  1-year range** (percentile < 0.5).
- **Balance sheet is "increasing"** when the **12-week slope of `WALCL` is positive**.

## The 2×2 matrix

```
                 BALANCE SHEET RISING (QE)
                          ▲
          Q2 High rate+QE │ Q1 Low rate+QE
          "In between" B  │ ★ Most liquid  D
   HIGH ──────────────────┼────────────────── LOW  (rate)
          Q4 High rate+QT │ Q3 Low rate+QT
          ✕ Least liquid A│ "In between"   C
                          ▼
                 BALANCE SHEET SHRINKING (QT)
```

| Regime | Rate | Balance sheet | Archetype | Position sizing |
|--------|------|---------------|:---------:|-----------------|
| **Most Liquid** | low | rising | **D** | 0–100%+ |
| **In Between (prefer C)** | low | shrinking | **C** | 0–50% |
| **In Between (prefer B)** | high | rising | **B** | 0–50% |
| **Least Liquid** | high | shrinking | **A** | 0–20% |

## The four archetypes ("Core 4")

Every stock is reduced to four metrics: revenue growth, earnings growth, forward P/E,
and Debt/EBITDA. Those define four archetypes (see [valuation.md](valuation.md) for
the metrics and [`../classification.md`](../classification.md) for the classifier).

| Archetype | Profile | Rev | EPS | Fwd P/E | Debt/EBITDA | Wins in |
|:---------:|---------|----:|----:|--------:|------------:|:-------:|
| **A** | Stable, cheap, low debt | 5% | 5% | 10× | 1× | Least Liquid |
| **B** | Moderate growth + some leverage | 10% | 10% | 20× | 3× | In Between (B) |
| **C** | High growth + high leverage | 20% | 10% | 25× | 5× | In Between (C) |
| **D** | Hyper-growth, unprofitable | ≥50% | — | — | — | Most Liquid |

> **The Archetype-D rule:** in the Most Liquid regime you can be aggressive with D,
> but exit at the *first* sign of tightening (rates rising, QE ending).

## From regime to allocation

Rather than a single archetype, Macropulse recommends a **diversified A/B/C/D split**
tilted toward the regime's winner, then nudges it with the Fed-pressure and
growth-pulse scores. Base splits per regime and the tilt math live in
[`../regime-engine.md`](../regime-engine.md).
