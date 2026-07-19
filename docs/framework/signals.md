# Entry signals & overrides

A simplified checklist for *timing* entries, plus the systemic conditions that can
break it. Macropulse evaluates these in `backend/services/buySellSignalCalculator.js`
and shows a BUY / WATCH / SELL verdict.

## The five entry signals (buy when all are met)

| # | Signal | Concept | Macropulse check |
|---|--------|---------|------------------|
| 1 | **VIX > 30** | Fear is priced in — a capitulation buy zone | `VIXCLS > 30` |
| 2 | **Fed not hiking** | No rate headwind to valuations | no 30-day rise in `DFEDTARU` **and** FPS ≤ 0.2 |
| 3 | **Deleveraging** | The market has room to re-leverage up | `WALCL` flat/down over 4 weekly readings |
| 4 | **Clear leading sector** | A theme is pulling in institutional capital | semis / AI / data-center ETFs above their 50-day average with positive 20-day return |
| 5 | **Leaders' earnings healthy** | The theme is beating expectations | leading-theme companies with rev ≥ 5% and EPS growth ≥ 0 |

When all five are met and no sell rule is active, the verdict is **BUY**.

> ⚠️ **Signal 3 caveat.** The concept is *investor margin debt* falling (e.g. FINRA
> margin statistics). Macropulse currently proxies this with the **Fed balance sheet
> (`WALCL`)**, which is a different quantity. See [`../planning/improvement-plan.md`](../planning/improvement-plan.md)
> (DD-7 / DS-4).

## Sell rules (any one active → SELL)

- **Major miss** — a watched mega-cap/semi posts an earnings miss or growth ≤ 0.
- **Fed pivots to hikes** — a 30-day increase in the target-rate ceiling.
- **Semiconductor valuation extreme** — basket median forward P/E ≥ 50× (or P75 ≥ 60×).

## Systemic overrides — when the checklist fails

The checklist assumes the Fed is *able and willing* to support the market. These
conditions can overwhelm it even when all five entry signals are green:

- **Credit crunch** — the high-yield credit spread blows out; refinancing freezes.
  *(The credit-spread series `BAMLH0A0HYM2` is not yet wired in — see IMPROVEMENT-PLAN
  DS-1.)*
- **Inflation too high** — the Fed can't ease; roughly, CPI needs to be under ~2.5%.
- **Accounting-fraud contagion** — trust in financial statements breaks; no liquidity
  injection helps.
