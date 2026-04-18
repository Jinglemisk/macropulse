import React from 'react';
import Panel from '../components/Panel';
import TickerRibbon from '../components/TickerRibbon';
import AllocationStrip from '../components/AllocationStrip';
import MacroRail from '../components/MacroRail';
import IndicatorGrid from '../components/IndicatorGrid';
import CollapsiblePanel from '../components/CollapsiblePanel';
import StockTable from '../components/StockTable';
import ActivityLog from '../components/ActivityLog';

// FLOOR — holdings-dominant ticker tape. The verdict + headline scores
// compress to a single ribbon at the top, a narrow indicator rail provides
// macro context on the left, and the right column is the holdings table
// followed by a compact allocation strip, a collapsible deep-dive of the
// macro engine, and the activity feed.
//
//   ┌─ ▶ MOST LIQUID  ◆FPS ◆GPS ◆CONF ◆FED ◆BAL ◆TRK ───────────────────┐
//   ├─ INDICATORS ─┬─ HOLDINGS ────────────────────────────────────────┤
//   │  Unemp 4.4%  │  table dominates this column                      │
//   │  ISM   51.2  ├─ ALLOCATION ──────────────────────────────────────┤
//   │  …           ├─ MACRO ENGINE ▾   (collapsed, click to expand)    │
//   │              ├─ ACTIVITY ────────────────────────────────────────┤
//   └──────────────┴────────────────────────────────────────────────────┘
function FloorLayout({
  data,
  registerSearchInput,
  registerRowScroll,
  onEditNotes
}) {
  const isEnhanced = !!(data.regime?.scores && data.regime?.allocation && data.regime?.breakdown);

  const railClass = 'xl:sticky xl:top-12 xl:max-h-[calc(100vh-3.5rem)] xl:overflow-auto space-y-3';

  return (
    <div className="space-y-3">
      <TickerRibbon regime={data.regime} summary={data.summary} />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(200px,240px)_minmax(0,1fr)] gap-3 items-start">
        {/* LEFT — narrow indicator rail (no FPS/GPS gauges; the ribbon
            already carries those) */}
        <aside className={railClass}>
          {isEnhanced ? (
            <Panel
              id="macro"
              title="INDICATORS"
              tooltip="13 underlying macro inputs feeding the regime engine. Dot color reflects classification (low / normal / high)."
              compact
            >
              <MacroRail breakdown={data.regime.breakdown} showScores={false} />
            </Panel>
          ) : (
            <Panel id="macro" title="INDICATORS" tone="warn" compact>
              <div className="font-mono text-[11px] text-muted">
                Macro data unavailable.
              </div>
            </Panel>
          )}
        </aside>

        {/* RIGHT — holdings, allocation strip, collapsible engine, activity */}
        <main className="space-y-3 min-w-0">
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

          {isEnhanced && (
            <Panel
              id="advice"
              title="ALLOCATION"
              tooltip="Recommended allocation across Classes A–D. Click MACRO ENGINE below to see contributions."
              compact
            >
              <AllocationStrip allocation={data.regime.allocation} />
            </Panel>
          )}

          {isEnhanced && (
            <CollapsiblePanel
              title="MACRO ENGINE"
              subtitle="FPS / GPS BREAKDOWN"
              defaultOpen={false}
            >
              <IndicatorGrid
                fpsBreakdown={data.regime.breakdown.fps}
                gpsBreakdown={data.regime.breakdown.gps}
              />
            </CollapsiblePanel>
          )}

          <Panel title="ACTIVITY" subtitle="SESSION" compact>
            <ActivityLog
              refreshReport={data.refreshReport}
              regime={data.regime}
              summary={data.summary}
            />
          </Panel>
        </main>
      </div>
    </div>
  );
}

export default FloorLayout;
