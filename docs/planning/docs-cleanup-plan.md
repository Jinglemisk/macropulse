# Macropulse — Documentation Cleanup Plan

**Goal:** turn the docs into a coherent, accurate repo structure that reflects the
*shipped* code. Replace the video-derived framework doc with the polished showcase
(with all external-source framing removed), relocate the still-useful classifier
spec, salvage what's current from the oversized FPS/GPS guide and drop the rest, and
fix the repo's doc hygiene.

> Decisions locked with the owner:
> - **Classifier appendix** → **relocate to its own doc** (fix drift).
> - **FPS_GPS_IMPLEMENTATION.md** → **check section-by-section, extract what's
>   currently necessary, delete the rest** (including the file once salvaged).
> - **Structure** → **split framework docs + bundle the showcase HTML**.

## Guiding principles
1. **No external-source framing.** Macropulse's docs are its *own* strategy
   documentation — strip every reference to the source video, "the speaker," "the
   course," timestamps, and "not financial advice re: the video." (The shipped docs
   are already clean; the *incoming* showcase/playbook content is **not** and must
   be scrubbed on the way in.)
2. **Code is the source of truth.** Where a doc and the code disagree, the doc is
   wrong — fix or delete it. Cross-check against the shipped files before deleting.
3. **Concept vs implementation split.** `docs/framework/*` explains *what/why*
   (the strategy). `docs/classification.md` + `docs/regime-engine.md` explain *how
   the code does it*.

---

## Current state (inventory)

| File | Verdict |
|------|---------|
| `README.md` | Keep, **fix**: dead `layout.md` link (file doesn't exist), "13 indicators" (engine uses **10**), doc index/links |
| `docs/how-to-invest.md` | **Split & retire**: framework part → new `docs/framework/*`; classifier appendix → `docs/classification.md`; then delete the file |
| `docs/FPS_GPS_IMPLEMENTATION.md` | **Salvage & delete**: extract current-accurate parts → `docs/regime-engine.md`; delete the rest (build guide, dead-config reference) |
| `IMPROVEMENT-PLAN.md` | Keep (unchanged) |
| `DOCS-CLEANUP-PLAN.md` | This file |

No YouTube/video references exist in the shipped docs today (only in `IMPROVEMENT-PLAN.md`, which is internal).

---

## Target structure

```text
README.md                     # updated: accurate links + doc index
docs/
├── framework/                # the strategy (concept) — from the showcase, scrubbed
│   ├── README.md             # overview + index
│   ├── regime.md             # 2×2 liquidity matrix · archetypes · allocation
│   ├── valuation.md          # P/E · EV/EBITDA · Debt/EBITDA · WACC
│   ├── indicators.md         # macro indicators + FRED series mapping
│   ├── signals.md            # 5-signal entry checklist + systemic overrides
│   └── mindset.md            # short philosophy note
├── classification.md         # (relocated) Tri fuzzy-scoring classifier spec, drift-fixed
├── regime-engine.md          # (salvaged from FPS_GPS) how FPS/GPS/allocation actually run
└── showcase.html             # bundled Liquidity Playbook (self-contained, source-scrubbed)
IMPROVEMENT-PLAN.md
DOCS-CLEANUP-PLAN.md
```

---

## Workstream 1 — Framework docs from the showcase (split) + bundle HTML

Replace `how-to-invest.md`'s framework half with the showcase content, split into
`docs/framework/*` and **scrubbed of all source framing**.

- Port the showcase's five areas → `regime.md`, `valuation.md`, `indicators.md`,
  `signals.md`, `mindset.md`, plus a `framework/README.md` index.
- **Scrub on the way in** (the incoming content currently contains these): the
  YouTube URL, "the video / the speaker / the course / the compilation," per-section
  timestamps (`⏱ …`), and the source-attribution hero/footer in the HTML.
- Rewrite in Macropulse's own voice ("Macropulse classifies…", "the dashboard
  surfaces…") and cross-link to `classification.md` / `regime-engine.md` where the
  concept has a code counterpart.
- Drop `docs/showcase.html` into the repo as the self-contained visual overview,
  with its source attribution removed/genericized.
- Keep the `A/B/C/D` archetype numbers and thresholds consistent with `config.js`.

## Workstream 2 — Relocate the classifier spec → `docs/classification.md`

Move the "Automated Classification System" appendix out of `how-to-invest.md` into
its own implementation reference, and **fix drift from the shipped code**:

- `Tri(x, center, halfwidth)` spec, per-class scores, `argmax` + confidence — keep
  (matches `classifier.js`).
- **Fix the D-gate:** the doc says trigger on `NOT eps_positive OR NOT
  ebitda_positive OR NOT pe_available`; the **code** (`classifier.js:55-59`) uses
  `eps<0 OR ebitda<0 OR (!peAvailable && epsGrowth===null)`. Document the code's
  actual behavior (see IMPROVEMENT-PLAN DD-11).
- Keep the dashboard-behavior notes (confidence tiers, filters) only where they
  match the current UI; drop stale "build this" scaffolding.

## Workstream 3 — Salvage & delete `FPS_GPS_IMPLEMENTATION.md`

Review section-by-section against the shipped code; extract the current-accurate
parts into `docs/regime-engine.md`, then **delete the file**. Proposed disposition
(confirm against code during execution — verify-before-delete):

| § | Content | Disposition |
|---|---------|-------------|
| Exec Summary / Overview | intro | **Extract** (trim) → `regime-engine.md` intro |
| §1 Core Concepts (FPS/GPS/classification/allocation) | conceptual | **Extract**, correct to shipped behavior |
| §2.1 Indicator table | indicators/thresholds | **Extract + CORRECT**: ISM→FRED proxies (CFNAI/INDPRO/RSXFS), flag the unit bugs (IMPROVEMENT-PLAN Order 1) |
| §2.2 Data frequency & smoothing | MA windows | **Extract + CORRECT**: actual windows are 3–12 mo (`movingAverages.js`) |
| §3 Score calculation | FPS/GPS math | **Extract**, verify weights vs `scoreCalculator.js` |
| §4 Allocation engine | base/tilt/tie-break | **Extract**, verify vs `allocationEngine.js` |
| §5.1 `macro_data` schema | DB | **Extract**, regenerate from `database.js` (add new columns) |
| §5.2 `regime_history` table | DB | **Keep** — table exists (`database.js:248`) |
| §6 Backend implementation | build guide | **Delete**; leave a 3-line "where the code lives" pointer |
| §7 Frontend implementation | build guide | **Delete** |
| §8 Configuration Reference | documents the **dead** `config.js` blocks | **Delete** — actively misleading; replace with a one-liner: live values are in `indicatorClassifier.js` / `scoreCalculator.js` / `movingAverages.js` (IMPROVEMENT-PLAN wiring note) |
| §9 API docs (enhanced regime endpoint) | endpoint | **Extract + VERIFY** vs `routes/regime.js` (`GET /`, `POST /refresh` exist) |
| §10 Implementation Checklist (Phase 1–7) | done build todo | **Delete** |

`regime-engine.md` should also cross-link `IMPROVEMENT-PLAN.md` for the known bugs
rather than silently documenting buggy behavior as intended.

## Workstream 4 — README + repo hygiene

- Remove the `layout.md` line from the "Project layout" tree (file was deleted).
- Fix **"13 indicators" → "10 indicators"** (FPS/GPS inputs) in the two spots
  (`README.md:12`, `README.md:129`); optionally note "15 FRED series fetched."
- Update doc links to the new `docs/` tree; add a short **Docs index** section
  (framework vs implementation vs plans).
- Point the FPS/GPS breakdown link at `docs/regime-engine.md` (not the deleted file).

---

## Sequencing
1. **W1 + W2** first (additive): create `docs/framework/*`, `docs/classification.md`,
   `docs/showcase.html` — scrubbed. Nothing deleted yet.
2. **W3**: build `docs/regime-engine.md` by extracting; verify each section against
   code; then delete `docs/FPS_GPS_IMPLEMENTATION.md` and `docs/how-to-invest.md`.
3. **W4**: update `README.md` links/counts last, once the new files exist.

## Safeguards
- **Verify before delete.** Nothing gets deleted until its salvage lives in a new
  file and has been checked against the shipped code (same cross-check discipline as
  the improvement plan — an agent pass per workstream is recommended before the
  deletions in step 2).
- **Scrub check.** Before finishing, `grep -riE "youtube|the video|the speaker|the
  course|⏱" docs/` must return nothing.
- **Link check.** No doc should link to `layout.md`, `how-to-invest.md`, or
  `FPS_GPS_IMPLEMENTATION.md` after cleanup.
```
