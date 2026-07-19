# Macropulse — Improvement Plan

**Goal:** bring Macropulse's macro engine into full, correct alignment with the
source framework (the 2-hour stock-investing course), fixing implementation bugs
first, then deciding where the code *should* deliberately differ from the
transcript, then sourcing the data those decisions require.

Three orders, in execution sequence:

1. **Order 1 — Fix bugs** (correctness; no design debate)
2. **Order 2 — Design decisions** that may differ from the video transcript
3. **Order 3 — Data sourcing & API keys** to get the series we still lack

> **Status:** drafted from a codebase read, then **cross-checked by three
> independent coding agents against the live code** (see Verification log). Every
> claim below is ✅ confirmed unless marked. Agent-found additions are marked ➕.

> ⚠️ **CRITICAL WIRING NOTE (applies to all of Order 1 & 2).** The FPS/GPS blocks
> in `backend/config.js` (`fps.weights`, `gps.weights`, `thresholds`,
> `tiltMagnitude`, `tieBreakThreshold`, `strongThreshold`) are **DEAD CONFIG —
> nothing imports them.** The values that actually run are hard-coded in:
> - `backend/services/indicatorClassifier.js` → `THRESHOLDS`, `FPS_MAP`, `GPS_MAP`
> - `backend/services/scoreCalculator.js` → `WEIGHTS`
> - `backend/services/allocationEngine.js` → default tilt `0.25`, `BASE_ALLOCATIONS`
> - `backend/utils/movingAverages.js` → `MA_WINDOWS`
> **All fixes must edit these files, not `config.js`.** (Optionally: delete the dead
> config or wire the modules to read it — pick one so they can't drift.)

---

## Order 1 — Fix bugs

All bugs are in the **FPS/GPS overlay**; the base regime and stock classifier are
dimensionally sound. Root cause: `movingAverages.js` applies a YoY transform **only**
to CPI/core-CPI; every other series is averaged as its raw value, then compared to a
threshold that assumes a different unit. Verified against `data/stocks.db` (row
2026-05-27) and re-confirmed by agent.

| ID | Indicator | Stored value | → Classified | Root cause | Status |
|----|-----------|-------------:|--------------|------------|:------:|
| BUG-1 | PPI (`PPIACO`) | 265.9 | always **High** | raw index vs `0/0.2` MoM-% threshold; no MoM transform | ✅ |
| BUG-2 | Industrial Prod. (`INDPRO`) | 101.7 | always **High** | raw index vs `0/0.2` MoM-% threshold | ✅ |
| BUG-3 | Retail Sales (`RSXFS`) | 639,773 | always **High** | raw $-level vs `0/0.4` MoM-% threshold | ✅ |
| BUG-4 | Consumer Conf. (`UMCSENT`) | 55.4 | always **Low** | Michigan scale (~50–75) vs CB `100/120` thresholds | ✅ |
| BUG-5 | Non-farm payrolls (`PAYEMS`) | 158,527 | stuck **Normal** | employment **level** vs `50k/250k` monthly-**change** threshold | ✅ |
| BUG-6 | CPI / core-CPI YoY | **NULL** | — | fetch window too short for YoY(12mo)+MA(9mo) to populate | ✅ |
| BUG-7 ➕ | Prod. fetch window | 90 days | — | scheduler uses `macroDays:90`, so YoY MAs are NULL for **every** live row | ✅ |

### Fixes (all in the live files per the wiring note)

- **BUG-1/2/3 — add a MoM transform.** Add `calculateMoM(data, field)` to
  `backend/utils/movingAverages.js` (mirror `calculateYoY`, `movingAverages.js:32-53`)
  and route `ppi`, `indpro`, `retail_sales` through it before `calculateMA`
  (`movingAverages.js:132-150`). Thresholds in `indicatorClassifier.js:18-22` stay
  (they were written for MoM %). ✅ agent: *correct & sufficient.*
- **BUG-5 — diff PAYEMS AND fix units.** Compute month-over-month **change** of
  `PAYEMS` before MA. ⚠️ `PAYEMS` is in **thousands of persons**; a raw diff (~150)
  vs threshold `{50000,250000}` (persons) would flip it to always **"Low"**. So
  either multiply Δ×1000, **or** restate the threshold to `{50,250}` in
  `indicatorClassifier.js:15`. Pick one and document. ✅ agent flagged the unit trap.
- **BUG-4 — rescale confidence thresholds.** Keep `UMCSENT` but set a
  Michigan-appropriate band (agent suggests ≈ `{65,85}`) in
  `indicatorClassifier.js:23`. (Alt: switch series — see DS-5.) Overlaps Order 2/3;
  the *bug* is that `100/120` can never be met.
- **BUG-6 / BUG-7 — widen the fetch window everywhere.** Raise to **≥ 760 days
  (~25 mo)** so YoY + 9-mo MA populate at the current date. Must change **all** of:
  `backend/apis/fred.js:203` (`updateMacroData(days=365)`), the scheduler
  `backend/services/scheduler.js:8` (`macroDays:90` — the real production value),
  and the 365 defaults in `refreshService.js` / the refresh route / the CLI. Fixing
  only one leaves YoY NULL. ✅ agent ADD-1.

### Minor cleanups (agent-found ➕)
- **CLN-1:** `scoreCalculator.js:13` comment says "Total GPS weight: 9.5"; actual
  sum is **9.0** (1.5+1.0+2.0+1.5+0.5+1.5+1.0). Fix comment.
- **CLN-2:** `calculateYoY` (`movingAverages.js:38`) uses `.find()` on a DESC list
  over an 11–13-month window, so it grabs the ~11-month-ago point → it's really an
  ~11-month change, and a true 13-cal-month partner can fall just outside. Tighten
  the window / divisor if precise YoY matters.
- **CLN-3:** MA recompute only runs when `updatedDays > 0` (`fred.js:279-281`) —
  keep in mind when backfilling.

### Verified impact
At the 2026-05-27 row, FPS ≈ **+0.375** ("Moderate Hawkish") — but **+2.5 of the +3.0
numerator** comes from the three pinned-"High" bug indicators, while CPI+core-CPI
(combined weight 3.5, which should dominate) contribute **nothing (NULL)**. Agent
note: +0.375 holds when `jobless_claims` classifies "Low" (realistic at ICSA≈220k);
otherwise +0.25. Either way the tilt is spuriously hawkish.

---

## Order 2 — Design decisions (may differ from the video)

KEEP / CHANGE decisions, not bugs. All characterizations agent-confirmed except
where noted.

| ID | Topic | Video | Macropulse (verified) | Rec |
|----|-------|-------|------------------------|-----|
| DD-1 | Rate "low" | "low **or falling**" | `DFF` percentile <0.5 over 1yr, **level only, no direction** (`regimeCalculator.js:66-68`) | Consider adding a trend term |
| DD-2 | CPI band | target 2%, >2% high | `{2.0,3.0}` band → 2–3% = Normal (`indicatorClassifier.js:16-17`) | KEEP, document |
| DD-3 | FPS/GPS | qualitative | quantitative weighted overlay; **weights are house values** in `scoreCalculator.js:15-39` | KEEP as house model; recalibrate |
| DD-4 | Activity indicators | ISM Mfg/Svc/Chicago | CFNAI/RSXFS/INDPRO FRED proxies (`scoreCalculator.js:23-26`) | Decide: proxies vs real ISM (→ DS-3) |
| DD-5 | Allocation | single archetype | diversified split (`allocationEngine.js:13-18`) | KEEP, document |
| DD-6 | Leverage | **total** debt/EBITDA | **net** debt/EBITDA per doc; input is provider-supplied, not computed (`classifier.js:10`) | Decide, document |
| DD-7 | Signal ③ | FINRA **margin debt** | **WALCL** flat/down (`buySellSignalCalculator.js:387-423`) | Relabel or source margin (→ DS-4) |
| DD-8 ✏️ | Smoothing | YoY / raw | MAs of **3–12 months** (not 6–12 — jobless is 3mo) (`movingAverages.js:14-25`) | Revisit; 9-mo MA on YoY is laggy |
| DD-9 | Sell rules | credit/inflation/fraud | earnings-miss / Fed-hike / semi-valuation (`buySellSignalCalculator.js:563-567`) | Add video overrides alongside (→ DS-1) |
| DD-10 ➕ | Regime output | — | recommendation **string** says "Class D only / Class A" (matches video) but the **allocation engine always spreads A/B/C/D** → display and engine disagree | Reconcile (bug-ish) |
| DD-11 ➕ | D-gate | — | code (`classifier.js:55-59`) is **stricter than its own doc** (`how-to-invest.md:126`): requires eps<0/ebitda<0 and ANDs the missing-P/E case with missing eps-growth | Align code↔doc |

Confirmed matches (no action): base regime→archetype→sizing text (Most Liquid→D
0-100%+, In-Between-C→C 0-50%, In-Between-B→B 0-50%, Least Liquid→A 0-20%) and the
Core-4 targets A(5/5/10/1) B(10/10/20/3) C(20/10/25/5) D(gate rev≥50). Note `DFF`
(daily effective fed funds) is the policy-rate proxy.

**Deliverable:** a KEEP/CHANGE memo appended here (one ruling per row) before any
Order-2 code change.

---

## Order 3 — Data sourcing & API keys

| ID | Data | Series / source | New key? | Effort | Status |
|----|------|-----------------|----------|--------|:------:|
| DS-1 | **Credit spread** (video's #1 override) | `BAMLH0A0HYM2` (FRED) | **No** — existing `FRED_API_KEY` | Low | ✅ absent, free |
| DS-2 | **Core PCE** (Fed's preferred) | `PCEPILFE` (FRED) | **No** | Low | ✅ absent, free (core *CPI* is fetched; core *PCE* is not) |
| DS-3 | Real ISM PMIs | proprietary (ISM/MNI); no provider exposes it | **Yes/paid** | Med/High | ✅ not fetched; **dead placeholder cols** `ism_manufacturing`/`ism_services`/`chicago_pmi` already exist (`database.js:179-192`) — reuse or drop |
| DS-4 | FINRA **margin debt** | FINRA monthly CSV/HTML; no clean API | No key, must scrape | Med | ✅ absent |
| DS-5 | Conference Board CCI | `CONCCONF` **not free on FRED**; not on any wired provider | **Yes/paid** | Med | ✅ — else fix `UMCSENT` thresholds (BUG-4) |
| DS-6 | Existing keys | see below | — | — | ✅ all 4 set in `.env` |

**Keys present & populated in `.env`:** `FRED_API_KEY`, `FMP_API_KEY`,
`OPENBB_FMP_API_KEY`, `OPENBB_FRED_API_KEY` (mirrors fall back to the base keys).
Provider chains default to `fmp` + `yfinance,intrinio` (Intrinio unused — no key).
`fmp.js` is an equity **orchestration** layer (OpenBB→Yahoo); all macro is a direct
FRED HTTP client. No provider exposes PMI / Conference-Board / margin data.

**Quick wins — do first (no new keys):** DS-1 and DS-2 restore two video-critical
signals for free.

### Add-a-FRED-series checklist (agent-verified touchpoints)
1. `backend/apis/fred.js:11-27` — add `{ id, field, cadenceDays }` to `MACRO_SERIES`.
2. `backend/database.js:199-207` — `ALTER TABLE macro_data ADD COLUMN <field> REAL` (follow existing pattern).
3. `backend/apis/fred.js:238-247` — add `<field>` to INSERT columns **and** one `?`.
4. `backend/apis/fred.js:257-275` — add `values.<field> ?? null` binding (order-matched).
5. *If it feeds a raw signal rule* (credit spread): read via `latestMacro('<field>')` and add a rule in `buySellSignalCalculator.js` (pattern: `evaluateVix` :361 / `evaluateDeleveraging` :387).
6. *If it needs an MA*: wire `MA_WINDOWS`, SELECT, a `calculateMA` call, the UPDATE, and bindings in `movingAverages.js` + a `<field>_ma3` column in `database.js:220-234`.
7. *If it's an FPS/GPS input*: `THRESHOLDS` + score maps + `indicators[]` in `indicatorClassifier.js`, and `WEIGHTS` in `scoreCalculator.js` (NOT `config.js` — dead).

**Current 15 series:** `WALCL, DFF, T10Y2Y, UNRATE, CPIAUCSL, ICSA, PAYEMS,
CPILFESL, PPIACO, CFNAI, INDPRO, RSXFS, UMCSENT, VIXCLS, DFEDTARU`.

---

## Execution sequencing
1. **Order 1** — land all bug fixes in the live files + widen the window in *all*
   entry points (incl. `scheduler.js`); regression-check the FPS/GPS breakdown on a
   known row.
2. **Order 2** — resolve the KEEP/CHANGE memo (esp. DD-10 reconciliation), then code.
3. **Order 3** — DS-1/DS-2 first (free), then cost/benefit DS-3/4/5.

---

## Verification log

Three independent coding agents re-read the live code (2026-07-19):

- **Order 1 (bugs):** all six BUGs CONFIRMED with file:line evidence. Added
  BUG-7 (scheduler `macroDays:90`), the dead-`config.js` warning, the PAYEMS units
  trap, and CLN-1/2/3. FPS math confirmed (±jobless-claims caveat).
- **Order 2 (design):** DD-1..7 & DD-9 CONFIRMED; DD-8 corrected (3–12 mo, not
  6–12); added DD-10 (recommendation-string vs allocation-engine mismatch) and
  DD-11 (D-gate code stricter than doc).
- **Order 3 (data/keys):** DS-1..6 CONFIRMED; found the dead ISM placeholder
  columns, confirmed all 4 keys populated, confirmed no provider exposes
  PMI/CCI/margin, and produced the add-a-series checklist above.
