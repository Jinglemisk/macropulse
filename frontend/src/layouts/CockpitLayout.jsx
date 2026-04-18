import React from 'react';
import Panel from '../components/Panel';
import VerdictRibbon from '../components/VerdictRibbon';
import AllocationChart from '../components/AllocationChart';
import MacroRail from '../components/MacroRail';
import PortfolioRail from '../components/PortfolioRail';
import StockTable from '../components/StockTable';
import ActivityLog from '../components/ActivityLog';

// COCKPIT — three-column command bridge. Sticky rails on either side keep
// macro context and portfolio status visible while the center column scrolls.
//
//   ┌─ MACRO ENGINE ─┬─ verdict ───────────────────────┬─ PORTFOLIO ─┐
//   │ FPS ────       │ STRATEGY                        │ TRACKED  5  │
//   │ GPS ────       │ ─ ALLOCATION ────────────────── │ AVG    86%  │
//   │ INDICATORS ──  │  bar + breakdown                │ CLASS DIST. │
//   │  Unemp   4.4%  │ ─ HOLDINGS ──────────────────── │ ─ ACTIVITY  │
//   │  Jobless 213k  │  table                          │  log        │
//   └────────────────┴─────────────────────────────────┴─────────────┘
function CockpitLayout({
  data,
  registerSearchInput,
  registerRowScroll,
  onEditNotes
}) {
  const isEnhanced = !!(data.regime?.scores && data.regime?.allocation && data.regime?.breakdown);

  // Sticky rails sit just below the 40px topbar and scroll independently
  // when their content overflows the viewport.
  const railClass = 'xl:sticky xl:top-12 xl:max-h-[calc(100vh-3.5rem)] xl:overflow-auto space-y-3';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(240px,280px)_minmax(0,1fr)_minmax(240px,320px)] gap-3 items-start">
      {/* LEFT — macro engine rail */}
      <aside className={railClass}>
        {isEnhanced ? (
          <Panel
            id="macro"
            title="MACRO ENGINE"
            tooltip="FPS / GPS scores driving the regime classification, with the underlying 13 indicators and current readings."
            compact
          >
            <MacroRail
              scores={data.regime.scores}
              breakdown={data.regime.breakdown}
            />
          </Panel>
        ) : (
          <Panel id="macro" title="MACRO ENGINE" tone="warn" compact>
            <div className="font-mono text-[11px] text-muted">
              Macro data unavailable. Run REFRESH to pull the latest series.
            </div>
          </Panel>
        )}
      </aside>

      {/* CENTER — verdict + allocation + holdings */}
      <main className="space-y-3 min-w-0">
        <VerdictRibbon regime={data.regime} />

        {isEnhanced && (
          <Panel
            id="advice"
            title="RECOMMENDED ALLOCATION"
            tooltip="Allocation across Classes A–D derived from the current FPS/GPS regime."
            compact
          >
            <AllocationChart
              allocation={data.regime.allocation}
              allocationSteps={data.regime.allocation_steps}
            />
          </Panel>
        )}

        <StockTable
          stocks={data.stocks}
          onDelete={data.deleteStock}
          onEditNotes={onEditNotes}
          macroRefresh={data.regime?.refresh || null}
          onAdd={data.addStock}
          adding={data.adding}
          registerSearchInput={registerSearchInput}
          registerRowScroll={registerRowScroll}
        />
      </main>

      {/* RIGHT — portfolio + activity */}
      <aside className={railClass}>
        <Panel title="PORTFOLIO" subtitle="OVERVIEW" compact>
          <PortfolioRail summary={data.summary} />
        </Panel>
        <Panel title="ACTIVITY" subtitle="SESSION" compact>
          <ActivityLog
            refreshReport={data.refreshReport}
            regime={data.regime}
            summary={data.summary}
          />
        </Panel>
      </aside>
    </div>
  );
}

export default CockpitLayout;
