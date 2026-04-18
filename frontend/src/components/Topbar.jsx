import React from 'react';
import { cx } from '../utils/classes';
import ThemeSwitch from './ThemeSwitch';
import LayoutSwitch from './LayoutSwitch';
import DataHealthStrip from './DataHealthStrip';

const NAV = [
  { id: 'home',     label: 'HOME',     hint: 'g h' },
  { id: 'advice',   label: 'ADVICE',   hint: 'g a' },
  { id: 'macro',    label: 'MACRO',    hint: 'g m' },
  { id: 'holdings', label: 'HOLDINGS', hint: 'g s' }
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
      {/*
        Two flex clusters with justify-between; the command centerpiece is
        absolutely-positioned so it never pushes the side clusters around and
        can't be clipped by a squeezed grid column. On narrow viewports the
        two clusters stay at natural width and the centerpiece simply slides
        under them gracefully (hidden on <lg).
      */}
      <div className="relative flex items-center justify-between gap-3 px-3 h-10">
        {/* LEFT: brand + nav */}
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          <a
            href="#home"
            onClick={(e) => { e.preventDefault(); goto('home')(); }}
            className="flex items-center gap-1.5 text-text hover:text-accent shrink-0"
          >
            <span className="text-accent text-[14px]">▮▮</span>
            <span className="font-mono font-bold tracking-[0.2em] text-[13px]">MACROPULSE</span>
            <span className="text-muted">//</span>
          </a>

          <span className="text-muted hidden md:inline">│</span>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                onClick={(e) => { e.preventDefault(); goto(n.id)(); }}
                title={`Jump to ${n.label} (${n.hint})`}
                className={cx(
                  'h-7 px-2.5 inline-flex items-center border border-line/70 bg-surf/50',
                  'smallcaps-tight font-bold text-text whitespace-nowrap',
                  'hover:bg-accent/15 hover:text-accent hover:border-accent/60',
                  'transition-colors'
                )}
              >
                {n.label}
              </a>
            ))}
          </nav>
        </div>

        {/* CENTER: command trigger — absolutely positioned so it stays on
            the horizontal center of the viewport without reshaping its flex
            siblings. Hidden on smaller viewports where the side clusters
            would otherwise collide with it. */}
        <button
          type="button"
          onClick={onOpenPalette}
          title="Command palette (⌘K)"
          className={cx(
            'hidden xl:inline-flex',
            'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            'h-8 px-4 items-center gap-2.5 z-10',
            'border border-accent/60 bg-accent/10 text-accent',
            'hover:bg-accent/20 hover:border-accent',
            'font-mono tracking-[0.22em] text-[11px] font-bold uppercase whitespace-nowrap',
            'shadow-[0_0_0_1px_rgb(var(--bg))]'
          )}
        >
          <span className="w-1.5 h-1.5 bg-accent animate-pulse-dot" aria-hidden />
          <span>Command</span>
          <span className="text-muted/80">·</span>
          <span className="font-mono text-[11px]">⌘K</span>
        </button>

        {/* RIGHT: data health · theme · layout · refresh · help */}
        <div className="flex items-center justify-end gap-1.5 shrink-0">
          <div className="hidden lg:block">
            <DataHealthStrip
              stocks={stocks}
              macroRefresh={regime?.refresh}
              refreshReport={refreshReport}
              onJumpToTicker={onJumpToTicker}
            />
          </div>

          <ThemeSwitch />
          <LayoutSwitch />

          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh dashboard (R)"
            className={cx(
              'h-7 px-2 border border-line hover:border-accent/60 bg-surf/60',
              'smallcaps-tight text-text inline-flex items-center gap-1.5 whitespace-nowrap',
              refreshing && 'opacity-60 cursor-not-allowed'
            )}
          >
            <span className={cx('w-2 h-2 inline-block', refreshing ? 'bg-warn animate-pulse-dot' : 'bg-accent')} />
            {refreshing ? 'REFRESHING' : 'REFRESH'}
          </button>

          {/* Command palette — visible everywhere as a compact icon; the
              full centerpiece above is hidden on narrow widths. */}
          <button
            type="button"
            onClick={onOpenPalette}
            title="Command palette (⌘K)"
            className="xl:hidden h-7 px-2 border border-accent/60 bg-accent/10 text-accent smallcaps-tight inline-flex items-center gap-1 hover:bg-accent/20"
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
      </div>
    </header>
  );
}

export default Topbar;
