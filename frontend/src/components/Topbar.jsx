import React from 'react';
import { cx } from '../utils/classes';
import Clock from './Clock';
import ThemeSwitch from './ThemeSwitch';
import DensitySwitch from './DensitySwitch';
import DataHealthStrip from './DataHealthStrip';

const NAV = [
  { id: 'home',     label: 'HOME',     hint: 'g h' },
  { id: 'advice',   label: 'ADVICE',   hint: 'g a' },
  { id: 'macro',    label: 'MACRO',    hint: 'g m' },
  { id: 'holdings', label: 'HOLDINGS', hint: 'g h' }
];

function Topbar({
  stocks, regime, refreshReport,
  onRefresh, refreshing,
  onOpenPalette, onOpenShortcuts,
  onJumpToTicker
}) {
  const goto = (id) => () => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header className={cx(
      'sticky top-0 z-40 bg-bg/95 backdrop-blur-sm',
      'border-b-2 border-double border-line',
      'font-mono text-[12px]'
    )}>
      <div className="flex items-center gap-3 px-3 h-10">
        {/* Brand */}
        <a
          href="#home"
          onClick={(e) => { e.preventDefault(); goto('home')(); }}
          className="flex items-center gap-1.5 text-text hover:text-accent"
        >
          <span className="text-accent text-[14px]">▮▮</span>
          <span className="font-mono font-bold tracking-[0.2em] text-[13px]">MACROPULSE</span>
          <span className="text-muted">//</span>
        </a>

        <span className="text-muted">│</span>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              onClick={(e) => { e.preventDefault(); goto(n.id)(); }}
              className="px-2 py-1 text-muted hover:text-accent smallcaps-tight"
              title={`Jump to ${n.label} (${n.hint})`}
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Health strip (middle/right) */}
        <div className="hidden lg:block relative">
          <DataHealthStrip
            stocks={stocks}
            macroRefresh={regime?.refresh}
            refreshReport={refreshReport}
            onJumpToTicker={onJumpToTicker}
          />
        </div>

        {/* Clock */}
        <div className="hidden md:block">
          <Clock />
        </div>

        {/* Theme + density */}
        <ThemeSwitch />
        <DensitySwitch />

        {/* Actions */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          title="Refresh dashboard (R)"
          className={cx(
            'h-7 px-2 border border-line hover:border-accent/60 bg-surf/60',
            'smallcaps-tight text-text inline-flex items-center gap-1.5',
            refreshing && 'opacity-60 cursor-not-allowed'
          )}
        >
          <span className={cx('w-2 h-2 inline-block', refreshing ? 'bg-warn animate-pulse-dot' : 'bg-accent')} />
          {refreshing ? 'REFRESHING' : 'REFRESH'}
        </button>

        <button
          type="button"
          onClick={onOpenPalette}
          title="Command palette (⌘K)"
          className="h-7 px-2 border border-accent/60 bg-accent/10 text-accent smallcaps-tight inline-flex items-center gap-1.5 hover:bg-accent/20"
        >
          ⌘K
        </button>

        <button
          type="button"
          onClick={onOpenShortcuts}
          title="Keyboard shortcuts (?)"
          className="h-7 w-7 border border-line text-muted hover:text-accent hover:border-accent/60 inline-flex items-center justify-center"
        >
          ?
        </button>
      </div>
    </header>
  );
}

export default Topbar;
