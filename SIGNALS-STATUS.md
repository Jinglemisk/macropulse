# Buy/Sell Signals — status note

**Decision (2026-07-19):** the buy/sell-signals feature stays here on
`feat/buy-sell-signals` as a **work-in-progress foundation**. We are **not** fixing
it now — this note just records where it stands so we can pick it up later.

## What it is
A market-timing verdict engine (BUY / WATCH / SELL): the 5-signal entry checklist +
sell rules, surfaced as a dashboard panel. ~1,500 lines across
`backend/services/buySellSignalCalculator.js`, `backend/routes/signals.js`, the
`signal_*` tables in `database.js`, ETF/earnings fetchers, and
`frontend/.../BuySellSignalsPanel.jsx` (wired into all three layouts). Uncommitted.

## Alignment with the vision (≈40% faithful)
Analyzed 2026-07-19. Summary:

- ✅ **Sound mechanics** — all-5-AND buy gate, sell-veto-first, fail-safe on missing
  data; VIX>30 and Fed-not-hiking are faithful; UI degrades honestly.
- 🟡 **Signals diverge** — ④ leading sector is hardcoded themes (all-required);
  ⑤ uses growth *levels*, not earnings *beats*.
- ❌ **Signal ③ wrong series** — uses `WALCL` (Fed balance sheet) as a stand-in for
  investor margin debt; semantically backwards and contradicts signal ②.
- ❌ **Systemic-override half absent** — no credit-spread (`BAMLH0A0HYM2` not even
  fetched), no inflation gate (CPI fetched but unused), no fraud proxy.
- ❌ **Not integrated** — never reads the A/B/C/D classifier; no Archetype-D exit.
- ❌ **Test is red** — `tests/buySellSignalCalculator.test.js` fails on a time-bomb
  fixture (hardcoded dates vs `daysAgo(30)`).

## Important caveat — this may be a *data-availability* problem, not just a code one
Several shortcomings likely stem from **not having free/accessible APIs** for the
data the vision assumes (we are not a Bloomberg terminal): FINRA margin debt, ISM
PMIs, Conference-Board consumer confidence, forward earnings estimates, etc. The
`WALCL`-as-margin proxy and the growth-vs-beats substitution read like
workarounds for missing feeds. **Resolve the data-source access review first** —
some "fixes" may be blocked or reshaped by what data we can actually get.

## When we resume
Tracked in the improvement plan (on `main`, `IMPROVEMENT-PLAN.md`): **DD-7** (margin
proxy), **DD-9** (sell rules vs overrides), **DS-1** (credit spread — free on FRED),
**DS-4** (FINRA margin). First steps when we return: de-time-bomb the test, add the
credit-spread override (free), correct signal ③/⑤, then decide the rest based on the
data-access findings.
