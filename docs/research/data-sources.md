# Data-Source Accessibility — verified findings

What data Macropulse can actually get, for free or cheap, verified against current
(2026-07) primary sources. Produced by a deep-research pass (110 agents, 27 sources
fetched, 25 claims adversarially verified → 23 confirmed / 2 refuted). Every
load-bearing recommendation rests on **primary/official** sources.

**Bottom line:** the entire macro layer — including the two currently-missing series
(credit spread, core PCE) — is **free via FRED**. The only genuinely cost-gated need
is **forward analyst estimates**. FINRA margin is scrape-only; ISM PMIs are
license-restricted (use proxies); Conference Board confidence has no free source
(keep UMich `UMCSENT`).

---

## Per-item recommendations

### Macro via FRED — free, existing key covers everything
One endpoint (`https://api.stlouisfed.org/fred/series/observations`), free 32-char
key, one call returns full history (`limit` default = max = 100000). Covers every
series the strategy needs, **including the two we're missing:**
- **`BAMLH0A0HYM2`** — ICE BofA US High-Yield OAS (the credit-spread override) — FREE
- **`PCEPILFE`** — core PCE (Fed's preferred inflation) — FREE

Plus all current series (DFF, DFEDTARU, WALCL, UNRATE, ICSA, PAYEMS, CPIAUCSL,
CPILFESL, PPIACO/PPIFIS, T10Y2Y, VIXCLS). *Rate limit commonly cited ~120 req/min
(not independently verified). Sources: primary (fred.stlouisfed.org docs).*

### FINRA margin debt — no API exists, scrape-only
FINRA states verbatim: *"data feeds are not available."* Ingest the monthly XLSX
(`finra.org/.../margin-statistics.xlsx`), ~2–3 week lag, history to 1997. No paid
API improves this. *Source: primary (finra.org, developer.finra.org).*

### ISM PMIs (Mfg/Services/Chicago) — license-restricted, no verified free source
Keep the FRED proxies (CFNAI/INDPRO/RSXFS) — the practical free path. **DBnomics**
(free, no key, `api.db.nomics.world/v22/`) is a candidate for S&P Global PMI, but the
exact substitute series codes were **not** verified. *Confidence: medium.*

### Consumer confidence — keep `UMCSENT`
No free source for the real Conference Board index. The OECD proxy
`CSCICP03USM665S` is **discontinued/stale since Jan 2024** — do not use. UMich
`UMCSENT` is live through mid-2026; the fix is the threshold scale, not the source.
*Source: primary, live-tested.*

### Forward estimates — the one paid need
For the classifier's forward P/E, NTM EPS growth, and the earnings-beat signal.
- **Finnhub** estimates = Premium (~$75/mo — over budget).
- **FMP Starter ~$22/mo** = cheapest viable: `/stable/analyst-estimates` (forward
  consensus) + `/stable/earnings-calendar` (estimated vs actual). Within budget.
- **UNRESOLVED:** whether FMP's *free* 250/day tier returns `/stable/analyst-estimates`
  (a claim that FMP gates fundamentals was refuted 1-2). **Test the free key first.**
*Sources: primary (FMP + Finnhub docs).*

### Prices — free & reliable, with a hedge
Keep Yahoo/yfinance via OpenBB, but it's rate-limit fragile (429s since ~late 2024).
OpenBB's multi-provider routing (tiingo/polygon) is the hedge; **Stooq** bulk files
(free, no key, CAPTCHA-gated) are a backfill. *Sources: primary + forum caveats.*

### Provider reliability
OpenBB actively maintained (`openbb-fmp` v1.6.1, May 2026), low deprecation risk —
**but** FMP changed its free tier and OpenBB refactored the FMP extension in 2025-26,
so FMP free-tier behavior is a moving target. FRED is rock-solid; Yahoo is the
fragile link.

---

## Decision matrix

| Data need | Recommended source | Cost | New key? | Confidence |
|---|---|---|---|:---:|
| All macro + credit spread + core PCE | FRED | Free | No (have it) | High |
| Margin debt | FINRA monthly XLSX scrape | Free | No | High |
| ISM PMIs | FRED proxies; maybe DBnomics S&P Global | Free | No | Med |
| Consumer confidence | `UMCSENT` (fix thresholds) | Free | No | High |
| Forward estimates + beats | FMP (test free → else Starter) | $0 or ~$22/mo | Maybe | Med |
| Prices | Yahoo/OpenBB + Stooq backup | Free | No | High |

## Integration notes (Node + FRED + OpenBB/Python + Yahoo)
- **No new keys needed** for the credit spread or core PCE — they're FRED series;
  add to `MACRO_SERIES` + a `macro_data` column (see the
  [improvement plan](../planning/improvement-plan.md) add-a-series checklist).
- **Only justified spend:** FMP Starter ~$22/mo for estimates — and only after the
  free-tier test fails.
- **Keep** Yahoo/OpenBB for prices; add Stooq as a free backfill hedge.

## Confirmed gaps (proxy-vs-pay decisions)
1. **Forward estimates** — likely ~$22/mo (FMP), pending free-tier test.
2. **FINRA margin** — scrape-only at any price.
3. **ISM PMIs** — no verified free real source; proxy or license.
4. **Conference Board CCI** — no free source; proxy with `UMCSENT`.

## Open questions
- Does FMP's free tier return `/stable/analyst-estimates`?
- Exact DBnomics series codes for S&P Global PMI vs regional-Fed proxies?
- Is Conference Board `CONCCONF` carried/current on FRED anywhere?
- Do Alpha Vantage / Tiingo / EOD / Polygon free tiers offer forward estimates?

*Time-sensitivity: verified ~2026-07-18/19; re-verify endpoints/tiers before build.*
