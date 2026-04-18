# MacroPulse — Layout Alternatives

Three distinct layout philosophies for the dashboard. Theme/typography are kept; only spatial composition changes.

---

## OPTION A — COCKPIT (3-column command bridge)

*Left rail: macro context · Center: verdict + action · Right rail: portfolio status*

```
┌─ MACROPULSE ──────────── HOME ADVICE MACRO HOLDINGS ─────────── ⌘K ──── REFRESH ─┐
├──────────────────────┬─────────────────────────────────────────┬─────────────────┤
│ MACRO ENGINE         │ ▶ MOST LIQUID                           │ PORTFOLIO       │
│ ────────────         │   Low Rates + Balance Sheet Increasing  │ ───────         │
│ FPS +0.38 ████░░░    │                                         │ TRACKED      5  │
│ Moderate Hawkish     │   STRATEGY → 0–100%+ Class D            │ AVG CONF   86%  │
│                      │   CONF 44%       Apr 15 2026            │ LOW CONF     0  │
│ GPS +0.22 ████░░░    │                                         │                 │
│ Moderate Growth      │ ─ ALLOCATION ────────────────────────── │ CLASS DIST.     │
│                      │ A 15% ███░░░░░░░░░░░░ Defensive  14.8% │  A 0  B 0       │
│ ─ INDICATORS ──      │ B 22% █████░░░░░░░░░░ Steady     22.3% │  C 0  D 5       │
│ FED FUNDS    3.64%   │ C 32% ███████░░░░░░░░ Growth     32.3% │                 │
│ BALANCE 12W ↑121B    │ D 31% ███████░░░░░░░░ Hyper      30.6% │ ─ ACTIVITY ──   │
│ 10Y YIELD    4.18%   │                                         │ 12:33 refresh ok│
│ REAL RATE    1.08%   │ ─ HOLDINGS · 5 ──────────────────────── │ 11:02 AAPL note │
│ HY SPREAD    320bp   │ TICK  CLS  PRICE   CHG    %WT  CONF    │ 09:45 META add  │
│ ISM         51.2     │ AAPL  D   182.41  +0.6%  21%  87%      │                 │
│ UNEMP        4.1%    │ NVDA  D   948.12  +1.2%  28%  91%      │ ─ REFRESH ──    │
│ M2 YoY       4.8%    │ TSLA  D   241.80  −0.3%  14%  72%      │ Apr 17 12:33    │
│ CONS CONF   104.2    │ META  D   512.65  +0.4%  18%  88%      │ all domains ok  │
│ NFP        +175k     │ MSFT  D   441.20  +0.2%  19%  84%      │                 │
│ CPI YoY      3.1%    │                                         │                 │
└──────────────────────┴─────────────────────────────────────────┴─────────────────┘
```

**Strengths:** Everything visible at once. Indicator list breathes vertically (Bloomberg-native). Center column reads top-to-bottom as a narrative: *what is the regime → what should I do → what do I own.*
**Weakness:** Holdings table is column-constrained — fewer columns fit per row.

---

## OPTION B — PANEL / QUADRANTS (newspaper, equal-weight panels)

*Compressed verdict ribbon at top, four equal data panels below.*

```
┌─ MACROPULSE ── HOME ADVICE MACRO HOLDINGS ───── ⌘K ──── REFRESH ────────────────┐
├──────────────────────────────────────────┬──────────────────────────────────────┤
│ ▶ MOST LIQUID    Low Rates+Bal Incr      │ FPS +0.38  GPS +0.22  CONF 44%       │
│   STRATEGY → 0–100%+ Class D             │ FED 3.64%  BAL ↑121B  TRK 5  AVG 86% │
├──────────────────────────────────────────┼──────────────────────────────────────┤
│ ─ ALLOCATION ─────────────────           │ ─ MACRO INDICATORS ────────────      │
│ A ████        15%   Defensive   14.8%    │ FPS                  GPS             │
│ B ██████      22%   Steady      22.3%    │ Fed Funds  3.64 →    ISM     51.2 ↑  │
│ C ████████    32%   Growth      32.3%    │ 10Y Yield  4.18 ↑    Unemp   4.1  ↓  │
│ D ████████    31%   Hyper       30.6%    │ Real Rate  1.08 →    Retail  0.4  ↑  │
│                                          │ Bal 12W   +121B ↑    M2      4.8  ↑  │
│ ▸ view calculation steps                 │ HY Spread  320bp↓    Cons C  104  →  │
│                                          │ Curve     −44bp →    NFP    +175k ↑  │
├──────────────────────────────────────────┼──────────────────────────────────────┤
│ ─ HOLDINGS · 5 ────────────────          │ ─ PORTFOLIO ───────────────────      │
│ TICK CLS PRICE   CHG    %WT  CONF        │  TRACKED  AVG CONF  LOW CONF         │
│ AAPL  D 182.41  +0.6%  21%  87%          │     5        86%       0             │
│ NVDA  D 948.12  +1.2%  28%  91%          │  CLASSES   A·B·C·D = 0·0·0·5         │
│ TSLA  D 241.80  −0.3%  14%  72%          │                                      │
│ META  D 512.65  +0.4%  18%  88%          │ ─ ACTIVITY LOG ────────────          │
│ MSFT  D 441.20  +0.2%  19%  84%          │  12:33  data refresh — all ok        │
│                                          │  11:02  AAPL note updated            │
│                                          │  09:45  META added to portfolio      │
└──────────────────────────────────────────┴──────────────────────────────────────┘
```

**Strengths:** Equal visual weight — feels like a true terminal grid. Verdict ribbon collapses today's wasted hero space into one strip. Clear "macro vs portfolio" split (left = decisions, right = data).
**Weakness:** Treats every panel as equally important — but holdings/macro probably deserve more real estate than the activity log.

---

## OPTION C — FLOOR / HOLDINGS-FIRST (ticker tape — investor lives in the table)

*One-line verdict ribbon, narrow indicator rail, holdings dominate, macro engine collapses.*

```
┌─ MACROPULSE ─ HOME · ADVICE · MACRO · HOLDINGS ────── ⌘K ───── PHOSPHOR ── REFRESH ─┐
│ ▶MOST LIQUID  ◆FPS +0.38 m-hawk  ◆GPS +0.22 m-grw  ◆CONF 44%  ◆FED 3.64%  ◆TRK 5/86│
├──────────────┬──────────────────────────────────────────────────────────────────────┤
│ INDICATORS   │ ─ HOLDINGS ────────────────────  search:____  +ADD  filter:ALL ▾    │
│ ──────────   │ ▼TICK  CLS  PRICE    1D     5D    %WT  CONF  TGT   ACTION  NOTES   │
│ FED   3.64%  │  AAPL   D  182.41  +0.6%  +1.4%  21%  87%   170   hold    earnings │
│ 10Y   4.18%  │  NVDA   D  948.12  +1.2%  +3.9%  28%  91%   1100  hold    AI thesis│
│ REAL  1.08%  │  TSLA   D  241.80  −0.3%  −2.1%  14%  72%   220   trim    margin   │
│ BAL  +121B   │  META   D  512.65  +0.4%  +0.8%  18%  88%   540   hold    ad re-acc│
│ HY    320bp  │  MSFT   D  441.20  +0.2%  +1.1%  19%  84%   460   hold    azure    │
│ CURVE −44bp  ├──────────────────────────────────────────────────────────────────────┤
│ ISM   51.2   │ ─ ALLOCATION ──── A 15%▍  B 22%██▍  C 32%███▎  D 31%███▏           │
│ UNEMP  4.1%  │   actual          14.8    22.3      32.3        30.6                │
│ RETAIL 0.4%  │   drift           −0.2    +0.3      +0.3        −0.4                │
│ M2     4.8%  ├──────────────────────────────────────────────────────────────────────┤
│ CONS  104.2  │ ─ MACRO ENGINE ▾   (collapsed — expand for FPS/GPS contributions)   │
│ NFP  +175k   │ ─ ACTIVITY ─  12:33 refresh ok · 11:02 AAPL note · 09:45 META add  │
│ CPI    3.1%  │                                                                      │
└──────────────┴──────────────────────────────────────────────────────────────────────┘
```

**Strengths:** Maximum holdings real estate — extra columns (1D/5D/Target/Action) finally fit. Verdict + headline scores compressed to a single ◆-delimited ribbon. Macro engine is one click away, not in your face. Best for someone who *trades* the dashboard.
**Weakness:** Demotes the macro narrative — A/B foreground the *why*, C foregrounds the *what.*

---

## Comparison

|                  | A · Cockpit          | B · Panel            | C · Floor                 |
|------------------|----------------------|----------------------|---------------------------|
| **Hero**         | The verdict          | Equal weight grid    | The holdings table        |
| **Density**      | High                 | Highest balanced     | Highest in table          |
| **Best for**     | "Read the regime"    | "Glance everything"  | "Manage positions"        |
| **Risk**         | Center column squeeze| Activity over-weight | Buries macro logic        |
