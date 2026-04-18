import React from 'react';
import { cx } from '../utils/classes';
import { formatDate } from '../utils/formatting';

// Compressed verdict — same regime info as RegimeHero, but as a single
// horizontal ribbon. Used by Panel and Floor layouts to reclaim the
// vertical real estate the original hero burned through.

const REGIME_TONE = {
  'Most Liquid':           { color: 'text-up',     border: 'border-up',     glyph: '◤' },
  'Least Liquid':          { color: 'text-down',   border: 'border-down',   glyph: '◢' },
  'In Between (prefer B)': { color: 'text-accent', border: 'border-accent', glyph: '◇' },
  'In Between (prefer C)': { color: 'text-warn',   border: 'border-warn',   glyph: '◆' }
};

function VerdictRibbon({ regime }) {
  if (!regime) return null;

  if (regime.available === false) {
    return (
      <section
        id="home"
        className="bg-surf/30 border-x border-b-2 border-double border-warn/60 px-4 py-2"
      >
        <div className="flex items-center gap-3">
          <span className="font-mono smallcaps text-warn whitespace-nowrap">▲ MACRO REGIME UNAVAILABLE</span>
          <span className="font-sans text-text/90 text-[13px] truncate">
            {regime.error || 'Macro data is unavailable right now.'}
          </span>
        </div>
      </section>
    );
  }

  const { regime: name, description, recommendation, metrics, scores, confidence } = regime;
  const tone = REGIME_TONE[name] || REGIME_TONE['In Between (prefer B)'];
  const fps = scores?.fps;
  const gps = scores?.gps;
  const balanceUp = metrics?.balanceSheetIncreasing;
  const balanceMag = metrics?.balanceSheetChange12w;

  return (
    <section
      id="home"
      className={cx(
        'relative bg-surf/30',
        'border-x border-b-2 border-double',
        tone.border + '/50'
      )}
    >
      {/* Corner-bracket header — keeps the panel grammar consistent with
          the rest of the layout, but in a tight 28px strip. */}
      <div className={cx(
        'flex items-center gap-2 px-3 h-7 border-y',
        tone.border + '/40'
      )}>
        <span className="font-mono text-muted">┌─</span>
        <span className={cx('smallcaps-tight', tone.color)}>MACRO REGIME · CURRENT VERDICT</span>
        <span className="flex-1 border-t border-line/40 mx-2" />
        {confidence?.overall != null && (
          <span className="font-mono text-muted text-[11px]">CONF {confidence.overall}%</span>
        )}
        <span className="font-mono text-muted">─┐</span>
      </div>

      <div className="px-4 py-3 grid grid-cols-1 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-x-6 gap-y-3 items-center">
        {/* LEFT — verdict + strategy chip on one row */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className={cx('text-[26px] leading-none', tone.color)}>{tone.glyph}</span>
            <h1 className={cx(
              'font-display font-bold tracking-tight leading-none',
              'text-[32px] md:text-[40px]',
              tone.color,
              'glow-text'
            )}>
              {name}
            </h1>
            {description && (
              <span className="font-sans text-text/80 text-[13px] truncate max-w-[36ch]">
                — {description}
              </span>
            )}
          </div>
          {recommendation && (
            <div className="mt-2 inline-flex items-center gap-2 pl-2 pr-3 py-1 border-l-2 border-accent/60 bg-accent/5">
              <span className="smallcaps-tight text-accent">▸ STRATEGY</span>
              <span className="font-sans text-text text-[13px]">{recommendation}</span>
            </div>
          )}
        </div>

        {/* RIGHT — metric pill strip, 3 cols × 2 rows */}
        <div className="grid grid-cols-3 gap-x-3 gap-y-2 font-mono text-[12px] lg:border-l lg:border-line/50 lg:pl-5">
          <RibbonStat label="FPS" value={fps} kind="score" interp={scores?.fps_interpretation} />
          <RibbonStat label="GPS" value={gps} kind="score" interp={scores?.gps_interpretation} />
          <RibbonStat
            label="FED FUNDS"
            value={metrics?.fedFundsRate != null ? `${metrics.fedFundsRate.toFixed(2)}%` : '—'}
          />
          <RibbonStat
            label="BAL 12W"
            value={
              balanceMag != null
                ? <span className={balanceUp ? 'text-warn' : 'text-up'}>
                    {balanceUp ? '↑' : '↓'} {Math.abs(balanceMag).toFixed(1)}B
                  </span>
                : '—'
            }
          />
          <RibbonStat
            label="CONF"
            value={confidence?.overall != null ? `${confidence.overall}%` : '—'}
          />
          <RibbonStat label="AS OF" value={formatDate(metrics?.asOf)} small />
        </div>
      </div>
    </section>
  );
}

function RibbonStat({ label, value, kind, interp, small }) {
  const isScore = kind === 'score' && typeof value === 'number';
  const sign = isScore && value > 0 ? '+' : '';
  const color = !isScore ? 'text-text'
              : value > 0.2 ? 'text-warn'
              : value < -0.2 ? 'text-up'
              : 'text-muted';
  return (
    <div className="min-w-0" title={interp || undefined}>
      <div className="smallcaps-tight text-muted text-[10px]">{label}</div>
      <div className={cx(
        'tabular leading-tight truncate',
        small ? 'text-[12px] text-text' : 'text-[15px] font-bold',
        isScore && color
      )}>
        {isScore ? `${sign}${value.toFixed(2)}` : value}
      </div>
    </div>
  );
}

export default VerdictRibbon;
