import React, { useCallback, useRef, useState } from 'react';
import Topbar from './components/Topbar';
import RegimeHero from './components/RegimeHero';
import Panel from './components/Panel';
import PortfolioSummaryStrip from './components/PortfolioSummaryStrip';
import StockTable from './components/StockTable';
import NotesPanel from './components/NotesPanel';
import CommandPalette from './components/CommandPalette';
import ShortcutHelp from './components/ShortcutHelp';
import { KeyboardShortcutsProvider } from './components/KeyboardShortcutsProvider';
import ScoreGauge from './components/ScoreGauge';
import AllocationChart from './components/AllocationChart';
import IndicatorGrid from './components/IndicatorGrid';
import InterpretationPanel from './components/InterpretationPanel';
import { useTheme } from './components/ThemeProvider';
import { useDashboardData } from './hooks/useDashboardData';
import { cx } from './utils/classes';
import { formatDateTime } from './utils/formatting';

function StatusBanner({ status, error, onDismiss }) {
  if (!status && !error) return null;
  const tone = error ? 'error' : status?.tone || 'info';
  const message = error || status?.message;
  const map = {
    info:    'border-accent/40 text-accent bg-accent/5',
    success: 'border-up/40     text-up     bg-up/5',
    warning: 'border-warn/40   text-warn   bg-warn/5',
    error:   'border-down/60   text-down   bg-down/10'
  };
  return (
    <div className={cx('font-mono text-[12px] border px-3 py-1.5 flex items-center gap-2', map[tone])}>
      <span className="smallcaps-tight opacity-80">{tone.toUpperCase()}</span>
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="opacity-60 hover:opacity-100">×</button>
    </div>
  );
}

function App() {
  const data = useDashboardData();
  const { setTheme, setDensity } = useTheme();

  const [editingNotes, setEditingNotes] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Imperative refs registered by children for global commands.
  const searchRef = useRef(null);
  const jumpToTickerRef = useRef(null);

  const registerSearchInput = useCallback((ref) => { searchRef.current = ref; }, []);
  const registerRowScroll = useCallback((fn) => { jumpToTickerRef.current = fn; }, []);

  const focusSearch = useCallback(() => {
    const input = searchRef.current?.current;
    if (input) {
      input.focus();
      input.select?.();
    }
  }, []);

  const jumpTo = useCallback((id) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const jumpToTicker = useCallback((tk) => {
    jumpTo('holdings');
    setTimeout(() => jumpToTickerRef.current?.(tk), 200);
  }, [jumpTo]);

  if (data.loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="font-mono text-muted smallcaps-tight">
          <span className="text-accent blink">█</span> LOADING DASHBOARD…
        </div>
      </div>
    );
  }

  const isEnhanced = data.regime?.scores && data.regime?.allocation && data.regime?.breakdown;

  return (
    <KeyboardShortcutsProvider
      onOpenPalette={() => setPaletteOpen(true)}
      onOpenShortcuts={() => setHelpOpen((o) => !o)}
      onRefresh={data.refreshAll}
      onFocusSearch={focusSearch}
      jumps={{ h: 'home', a: 'advice', m: 'macro', s: 'holdings', r: 'home' }}
    >
      <div className="min-h-screen bg-bg text-text">
        <Topbar
          stocks={data.stocks}
          regime={data.regime}
          refreshReport={data.refreshReport}
          onRefresh={data.refreshAll}
          refreshing={data.refreshingAll}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenShortcuts={() => setHelpOpen(true)}
          onJumpToTicker={jumpToTicker}
        />

        <main className="max-w-[1700px] mx-auto px-3 md:px-5 pb-24 pt-4 space-y-5">
          {/* Status banners */}
          {(data.error || data.status) && (
            <div className="space-y-2">
              {data.error  && <StatusBanner error={data.error}    onDismiss={data.dismissError}  />}
              {data.status && <StatusBanner status={data.status}  onDismiss={data.dismissStatus} />}
            </div>
          )}

          {/* Refresh report */}
          {data.refreshReport && (
            <Panel
              title="LAST REFRESH"
              subtitle={formatDateTime(data.refreshReport.updatedAt)}
              tone={data.refreshReport.tone === 'success' ? 'default' : data.refreshReport.tone === 'warning' ? 'warn' : 'danger'}
              compact
            >
              <div className="font-mono text-[12px]">
                <div className="text-text mb-2">{data.refreshReport.message}</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {data.refreshReport.domains.map((d) => (
                    <div key={d.key} className="border border-line bg-bg/50 p-2">
                      <div className="flex items-center justify-between">
                        <span className="smallcaps-tight text-muted">{d.label}</span>
                        <span className={cx(
                          'smallcaps-tight px-1 border',
                          d.status === 'success' && 'text-up   border-up/40',
                          d.status === 'warning' && 'text-warn border-warn/40',
                          d.status === 'failed'  && 'text-down border-down/40'
                        )}>{d.status}</span>
                      </div>
                      <div className="mt-1 text-text">
                        {d.key === 'macro'
                          ? `${d.succeeded ?? 0} ok · ${d.failed ?? 0} fail`
                          : `${d.succeeded ?? 0}/${d.requested ?? 0} ok`}
                      </div>
                      {d.message && <div className="mt-1 text-muted text-[11px]">{d.message}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          )}

          {/* THE VERDICT */}
          <RegimeHero regime={data.regime} />

          {/* Portfolio summary */}
          <Panel
            title="PORTFOLIO"
            tooltip="Headline stats across your tracked stocks: total tracked, average classification confidence, low-confidence count, and latest detail refresh timestamp."
            subtitle="OVERVIEW"
          >
            <PortfolioSummaryStrip summary={data.summary} />
          </Panel>

          {/* Macro detail panels — only if enhanced regime data is available */}
          {isEnhanced && (
            <>
              <Panel
                id="advice"
                title="RECOMMENDED ALLOCATION"
                tooltip="Allocation across Classes A–D derived from the current Fed Pressure Score (FPS) and Growth Pulse Score (GPS). Updates as macro data shifts."
              >
                <AllocationChart
                  allocation={data.regime.allocation}
                  allocationSteps={data.regime.allocation_steps}
                />
              </Panel>

              <Panel
                id="macro"
                title="MACRO ENGINE"
                tooltip="FPS / GPS scores driving the regime classification, plus the underlying 13 indicators with per-indicator contributions to each score."
              >
                {/* Top: scores side-by-side with interpretation bullets — no wasted row. */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1.1fr] gap-x-5 gap-y-3 items-start">
                  <ScoreGauge
                    label="Fed Pressure Score (FPS)"
                    value={data.regime.scores.fps}
                    interpretation={data.regime.scores.fps_interpretation}
                  />
                  <ScoreGauge
                    label="Growth Pulse Score (GPS)"
                    value={data.regime.scores.gps}
                    interpretation={data.regime.scores.gps_interpretation}
                  />
                  <div className="lg:pl-4 lg:border-l border-line/40">
                    <InterpretationPanel messages={data.regime.interpretation} />
                  </div>
                </div>

                {/* Split indicator grid sits below, two halves side by side. */}
                <div className="mt-3 pt-3 border-t border-line/40">
                  <IndicatorGrid
                    fpsBreakdown={data.regime.breakdown.fps}
                    gpsBreakdown={data.regime.breakdown.gps}
                  />
                </div>
              </Panel>
            </>
          )}

          {/* HOLDINGS */}
          <StockTable
            stocks={data.stocks}
            onDelete={data.deleteStock}
            onEditNotes={(ticker, notes) => setEditingNotes({ ticker, notes })}
            macroRefresh={data.regime?.refresh || null}
            onAdd={data.addStock}
            adding={data.adding}
            registerSearchInput={registerSearchInput}
            registerRowScroll={registerRowScroll}
          />

          <footer className="font-mono text-[10px] text-muted/60 pt-6 pb-2 flex items-center gap-2 smallcaps-tight">
            <span>MACROPULSE</span>
            <span className="flex-1 border-t border-line/40" />
            <span>EOL</span>
          </footer>
        </main>

        {/* Modals */}
        {editingNotes && (
          <NotesPanel
            ticker={editingNotes.ticker}
            notes={editingNotes.notes}
            onSave={data.saveNotes}
            onClose={() => setEditingNotes(null)}
          />
        )}

        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          tickers={data.stocks.map((s) => s.ticker)}
          handlers={{
            addStock: data.addStock,
            deleteStock: data.deleteStock,
            refresh: data.refreshAll,
            setTheme,
            setDensity,
            goto: jumpTo,
            jumpTo: jumpToTicker
          }}
        />

        <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      </div>
    </KeyboardShortcutsProvider>
  );
}

export default App;
