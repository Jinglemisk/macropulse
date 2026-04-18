import React, { useCallback, useRef, useState } from 'react';
import Topbar from './components/Topbar';
import Panel from './components/Panel';
import NotesPanel from './components/NotesPanel';
import CommandPalette from './components/CommandPalette';
import ShortcutHelp from './components/ShortcutHelp';
import { KeyboardShortcutsProvider } from './components/KeyboardShortcutsProvider';
import { useTheme } from './components/ThemeProvider';
import { useDashboardData } from './hooks/useDashboardData';
import { cx } from './utils/classes';
import { formatDateTime } from './utils/formatting';

import CockpitLayout from './layouts/CockpitLayout';
import PanelLayout   from './layouts/PanelLayout';
import FloorLayout   from './layouts/FloorLayout';

const LAYOUT_REGISTRY = {
  cockpit: CockpitLayout,
  panel:   PanelLayout,
  floor:   FloorLayout
};

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
  const { setTheme, setLayout, layout } = useTheme();

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

  // Resolve the layout component from the active layout id. Falls back to
  // PanelLayout when an unknown id sneaks in via prefs/settings.json.
  const ActiveLayout = LAYOUT_REGISTRY[layout] || PanelLayout;

  const onEditNotes = (ticker, notes) => setEditingNotes({ ticker, notes });

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

        <main className="max-w-[1700px] mx-auto px-3 md:px-5 pb-24 pt-4 space-y-3">
          {/* Status banners — always above the layout shell */}
          {(data.error || data.status) && (
            <div className="space-y-2">
              {data.error  && <StatusBanner error={data.error}    onDismiss={data.dismissError}  />}
              {data.status && <StatusBanner status={data.status}  onDismiss={data.dismissStatus} />}
            </div>
          )}

          {/* Refresh report — kept at App level so it survives layout switches */}
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

          {/* Layout shell — the only thing that changes when LayoutSwitch fires */}
          <ActiveLayout
            data={data}
            registerSearchInput={registerSearchInput}
            registerRowScroll={registerRowScroll}
            onEditNotes={onEditNotes}
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
            setLayout,
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
