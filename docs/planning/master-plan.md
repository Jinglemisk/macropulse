# Macropulse — Master Plan & Task Tracker

The single, self-contained tracker for all outstanding work. Consolidates the
regime-engine bug fixes, the buy/sell-signals feature completion, the data-source
decisions, the data-gravity mitigations, and the design calls.

**Feeder docs:** [`data-gravity.md`](../research/data-gravity.md) (how much each gap
distorts decisions) · [`data-sources.md`](../research/data-sources.md) (what data we
can get) · [`buy-sell-signals.md`](../status/buy-sell-signals.md) (buy/sell feature
status) · [`improvement-plan.md`](improvement-plan.md) (original Order 1/2/3 detail).

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` decided-not-to ·
tags: **`free`** (code/FRED only) · **`paid`** (needs $) · **`decision`** (needs a
call before coding).

**Guiding sequence:** WS-0 safety now → WS-1 free correctness (recovers ~70% of FPS)
→ WS-2 free data adds → WS-3/WS-4 feature + data decisions → WS-5 design → WS-6 paid
accuracy → WS-7 hygiene.

> **Known-clean, do NOT touch:** the base regime (rate × balance sheet → 4 quadrants)
> and the base A/B/C/D allocation are correct and have **0% missing-data exposure**
> (DATA-GRAVITY ①). Only the *tilt* on top is distorted.

---

## WS-0 · Interim safety mitigations (do first — cheap, prevents bad calls)
- [ ] **`free`** Disable the FPS tilt (`tiltMagnitude → 0` in `allocationEngine.js`) so allocation = clean base until WS-1 lands. *Why: bugs push ~4–5% defensive with no real signal (DATA-GRAVITY ②).*
- [ ] **`free`** Suppress the classifier D-gate `!peAvailable` branch when forward data is simply unavailable, so missing data ≠ auto-"speculative D" (DATA-GRAVITY ④).
- [ ] **`free`** Label the buy/sell verdict "entry-only — no crash protection" in the UI until the credit-spread override exists (WS-2).

## WS-1 · Regime-engine correctness — FREE, recovers ~70% of FPS
*All fixes go in `indicatorClassifier.js` / `scoreCalculator.js` / `movingAverages.js` — NOT `config.js` (its FPS/GPS blocks are dead/unimported).*
- [ ] **`free`** BUG-1/2/3: add `calculateMoM()` and route **PPI / INDPRO / RSXFS** through it (raw index → MoM %); they currently pin "High" always.
- [ ] **`free`** BUG-5: compute **PAYEMS** month-over-month *change* (not level) **and** fix units (×1000, or restate threshold to `{50,250}`) — else it flips to always "Low".
- [ ] **`free`** BUG-4: rescale **consumer-confidence** thresholds to the `UMCSENT` scale (~`{65,85}`); keep UMCSENT (do NOT switch to the stale OECD proxy).
- [ ] **`free`** BUG-6/7: widen the macro fetch window to **≥760 days** in *every* entry point — `fred.js` (365), `scheduler.js` (`macroDays:90`), `refreshService.js`, the refresh route, the CLI — so CPI/core-CPI YoY populate (currently NULL → 30% of FPS missing).
- [ ] **`free`** Cleanups: delete or wire the dead `config.js` FPS/GPS/threshold blocks; fix "Total GPS weight 9.5"→9.0 comment; tighten `calculateYoY` (~11-mo window bug); note MA recompute only runs when `updatedDays>0`.
- [ ] **`free`** Regression-check the FPS/GPS breakdown on a known DB row after fixes.

## WS-2 · Free data adds (FRED, existing key) — restores the risk-veto layer
- [ ] **`free`** Add **`BAMLH0A0HYM2`** (HY credit spread) — series + `macro_data` column + threshold + a sell/override rule. *The vision's #1 override; free (DATA-SOURCES).*
- [ ] **`free`** Add **`PCEPILFE`** (core PCE) — series + column + YoY transform.
- [ ] **`free`** Wire the **inflation override gate** (CPI is already fetched but never consumed as a gate).

## WS-3 · Buy/sell-signals feature completion (stays on `feat/buy-sell-signals`)
- [ ] **`free`** Fix the **red test** — de-time-bomb the fixture (hardcoded 2026-04/05 dates vs `daysAgo(30)`).
- [ ] **`decision`** Signal ③: replace the `WALCL` margin proxy — FINRA scrape (WS-4) **or** relabel honestly.
- [ ] **`paid`** Signal ⑤: use earnings *beats vs consensus* instead of growth levels (needs estimates, WS-6).
- [ ] **`free`** Signal ④: loosen "all themes required" → detect a *clear* leader; make theme baskets less hardcoded.
- [ ] **`free`** Add systemic overrides: A credit spread (WS-2), B inflation gate (WS-2), C accounting-fraud (manual override).
- [ ] **`free`** Integrate the A/B/C/D classifier / Archetype-D exit (sells should target D-class holdings, not fixed baskets).
- [ ] **`free`** UI honesty: an *unavailable* SELL guardrail must downgrade a BUY; render a failed `signals` fetch distinctly from genuine "no data".
- [ ] **`free`** Robustness: stale-data guards on ETF/VIX/earnings; dedupe `SIGNAL_ASSETS` (defined twice); remove the dead `'dovish'` override value.
- [ ] **`free`** Expand tests: WATCH/UNAVAILABLE verdicts, confidence math, company-health rule, manual-override branches.

## WS-4 · Data-availability decisions (proxy-vs-build/pay)
- [ ] **`decision`** FINRA margin: scheduled monthly **XLSX scrape** vs keep-and-relabel the WALCL proxy. *(No API exists at any price — DATA-SOURCES.)*
- [ ] **`decision`** ISM PMIs: keep FRED proxies (CFNAI/INDPRO/RSXFS) vs explore **DBnomics** S&P Global PMI (series codes unverified).
- [ ] **`decision/paid`** Forward estimates: **test the free FMP `/stable/analyst-estimates` with our existing key** → if paywalled, decide FMP Starter (~$22/mo).
- [ ] **`free`** Prices resilience: add **Stooq** backfill and/or confirm OpenBB multi-provider fallback (Yahoo is rate-limit fragile).

## WS-5 · Design decisions (KEEP/CHANGE — from Improvement Plan Order 2)
- [ ] **`decision`** DD-1: rate "low" — add a direction/trend term, or keep level-percentile only?
- [ ] **`decision`** DD-2: CPI band 2–3% "Normal" vs strict >2% "High" — keep + document?
- [ ] **`decision`** DD-3: FPS/GPS weights are a house model — recalibrate after WS-1 fixes.
- [ ] **`decision`** DD-5: diversified allocation vs single archetype — keep + document.
- [ ] **`decision`** DD-6: net vs total debt/EBITDA — decide + document.
- [ ] **`decision`** DD-8: MA windows (3–12 mo) — revisit (9-mo MA on YoY is laggy).
- [ ] **`free`** DD-10: reconcile the regime *recommendation string* ("Class D only") with the allocation engine (which always spreads A/B/C/D).
- [ ] **`free`** DD-11: align the D-gate code with its documented spec (or update the doc).

## WS-6 · Classifier accuracy (cost-gated)
- [ ] **`paid`** Wire forward estimates into `peForward` + NTM `epsGrowth` (depends on WS-4 forward-estimates decision).
- [ ] **`free`** Retire the blanket-D risk once forward data is reliable (pairs with WS-0 mitigation).

## WS-7 · Hygiene & docs follow-ups
- [ ] **`free`** Dead ISM placeholder columns (`ism_manufacturing`/`ism_services`/`chicago_pmi`) in `database.js` — reuse or drop.
- [ ] **`decision`** Branch reconciliation: `feat/buy-sell-signals` still has the *old* docs; `main` has the restructured `docs/`. Plan the merge so old docs don't reappear.
- [ ] **`decision`** Move the planning docs (this file, DATA-GRAVITY, DATA-SOURCES) to `main` when ready (currently uncommitted on `feat/buy-sell-signals`).

---

## Priority snapshot
1. **WS-0 + WS-1 + WS-2** — all free, highest ROI: makes the FPS tilt trustworthy and restores the credit/inflation overrides at $0.
2. **WS-3 + WS-4** — finish the signals feature and settle the data proxies (mostly free; one ~$22/mo call).
3. **WS-5** — lock the design decisions.
4. **WS-6** — the one paid accuracy upgrade (forward estimates).
5. **WS-7** — cleanup.
