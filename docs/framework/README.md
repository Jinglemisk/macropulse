# The Macropulse Framework

Macropulse is built on one thesis: **market direction is dominated by liquidity, and
liquidity is set by the Federal Reserve.** Everything the dashboard does follows from
reading that liquidity stance and matching your positioning to it.

The framework has four moving parts:

| Doc | What it covers |
|-----|----------------|
| [regime.md](regime.md) | The two Fed levers, the 2×2 liquidity matrix, the four stock archetypes, and how allocation follows the regime. |
| [valuation.md](valuation.md) | How a company is priced — P/E, EV/EBITDA, Debt/EBITDA — and why interest rates move every multiple. |
| [indicators.md](indicators.md) | The macro readings Macropulse tracks to anticipate the Fed's next move. |
| [signals.md](signals.md) | The entry checklist and the systemic conditions that override it. |
| [mindset.md](mindset.md) | The temperament the strategy assumes. |

## The loop in one sentence

> Read the Fed's stance from two levers (**policy rate** + **balance sheet**), place
> the market in one of four regimes, hold the stock archetype built for that regime,
> confirm entries with a signal checklist, and keep emotion out of it.

## How this maps to the code

These documents describe the *strategy*. For how the engine actually implements it:

- **Stock classification** (the A/B/C/D fuzzy classifier) → [`../classification.md`](../classification.md)
- **Regime + FPS/GPS scoring + allocation** → [`../regime-engine.md`](../regime-engine.md)
- **Known correctness issues** in the current build → [`../../IMPROVEMENT-PLAN.md`](../../IMPROVEMENT-PLAN.md)

> This is educational documentation of Macropulse's model, not financial advice. The
> thresholds and rules are heuristics.
