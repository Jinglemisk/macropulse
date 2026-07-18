# Macro indicators

The Fed reacts to data; Macropulse watches the same data to anticipate its next move.
Ten indicators feed the Fed-Pressure and Growth-Pulse scores, grouped into the three
things the Fed monitors. (The scoring math is in [`../regime-engine.md`](../regime-engine.md).)

Two definitions used throughout:
- **Expansionary** = the Fed cuts / runs QE (adds liquidity).
- **Contractionary** = the Fed hikes / runs QT (removes liquidity).

## The ten indicators

| Category | Indicator | FRED series | Thresholds (low / high) | Fed reaction |
|----------|-----------|-------------|-------------------------|--------------|
| **Jobs** | Unemployment rate | `UNRATE` | 4% / 5.5% | high → expansionary |
| | Initial jobless claims | `ICSA` | 250k / 350k | rising → expansionary |
| | Non-farm payrolls | `PAYEMS` | 50k / 250k (monthly Δ) | high → contractionary |
| **Inflation** | CPI (YoY) | `CPIAUCSL` | 2% / 3% | high → contractionary |
| | Core CPI (YoY) | `CPILFESL` | 2% / 3% | high → contractionary |
| | PPI (MoM) | `PPIACO` | 0% / 0.2% | high → contractionary |
| **Activity** | Nat'l activity index | `CFNAI` | −0.7 / 0.35 | high → contractionary |
| | Industrial production | `INDPRO` | (MoM %) | high → contractionary |
| | Retail sales | `RSXFS` | (MoM %) | high → contractionary |
| | Consumer sentiment | `UMCSENT` | (see note) | high → contractionary |

**Activity-indicator note.** `CFNAI`, `INDPRO`, and `RSXFS` are FRED series that stand
in for the classic ISM Manufacturing / Chicago / ISM Services PMIs (which are
proprietary and not on FRED). Consumer sentiment uses Michigan's `UMCSENT`.

> ⚠️ Several of these indicators are currently mis-scaled in the running code
> (raw levels compared to rate-of-change thresholds; a sentiment scale mismatch).
> See [`../../IMPROVEMENT-PLAN.md`](../../IMPROVEMENT-PLAN.md) Order 1 before trusting
> the activity/inflation readings.

## Regime levers and context series

Beyond the ten scored indicators, Macropulse also pulls:

- `DFF` (policy rate) and `WALCL` (balance sheet) — the two regime axes ([regime.md](regime.md)).
- `VIXCLS` (fear), `DFEDTARU` (target-rate ceiling), `T10Y2Y` (yield-curve slope) —
  used by the entry [signals](signals.md) and a recession-risk warning.

## Reading them together
No single reading decides the Fed's move — they are weighted and combined into the
FPS/GPS scores. A shock (a crisis, a policy surprise) can void every prior reading.
