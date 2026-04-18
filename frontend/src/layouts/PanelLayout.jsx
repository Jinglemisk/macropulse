import React from 'react';
import Panel from '../components/Panel';
import VerdictRibbon from '../components/VerdictRibbon';
import AllocationChart from '../components/AllocationChart';
import IndicatorGrid from '../components/IndicatorGrid';
import StockTable from '../components/StockTable';
import PortfolioSummaryStrip from '../components/PortfolioSummaryStrip';
import ActivityLog from '../components/ActivityLog';

// PANEL — quadrant grid. Verdict ribbon on top, then a 12-col grid:
//
//   ┌─ verdict ribbon ──────────────────────────┐
//   ├─ allocation (5) ─┬─ macro engine (7) ─────┤
//   ├─ holdings   (8) ─┬─ portfolio + activity (4)
//   └────────────────────────────────────────────┘
//
// Goal: get the holdings table above the fold on a 1080+ display while
// keeping macro context visible. Trades a tall hero for horizontal density.
function PanelLayout({
  data,
  registerSearchInput,
  registerRowScroll,
  onEditNotes
}) {
  const isEnhanced = !!(data.regime?.scores && data.regime?.allocation && data.regime?.breakdown);

  return (
    <div className="space-y-3">
      <VerdictRibbon regime={data.regime} />

      {isEnhanced && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
          <div id="advice" className="xl:col-span-5 min-w-0">
            <Panel
              title="ALLOCATION"
              tooltip="Allocation across Classes A–D derived from FPS/GPS scores. Updates as macro data shifts."
              compact
            >
              <AllocationChart
                allocation={data.regime.allocation}
                allocationSteps={data.regime.allocation_steps}
              />
            </Panel>
          </div>
          <div id="macro" className="xl:col-span-7 min-w-0">
            <Panel
              title="MACRO ENGINE"
              tooltip="13 underlying indicators with per-indicator FPS/GPS contributions."
              compact
            >
              <IndicatorGrid
                fpsBreakdown={data.regime.breakdown.fps}
                gpsBreakdown={data.regime.breakdown.gps}
              />
            </Panel>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        <div className="xl:col-span-8 min-w-0">
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
        </div>
        <div className="xl:col-span-4 min-w-0 space-y-3">
          <Panel title="PORTFOLIO" subtitle="OVERVIEW" compact>
            <PortfolioSummaryStrip summary={data.summary} />
          </Panel>
          <Panel title="ACTIVITY" subtitle="SESSION LOG" compact>
            <ActivityLog
              refreshReport={data.refreshReport}
              regime={data.regime}
              summary={data.summary}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}

export default PanelLayout;
