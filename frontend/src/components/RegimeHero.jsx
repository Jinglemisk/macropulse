import React from 'react';
import { cx } from '../utils/classes';
import { formatDate } from '../utils/formatting';

const REGIME_TONE = {
  'Most Liquid':           { color: 'text-up',     border: 'border-up',     glyph: '◤' },
  'Least Liquid':          { color: 'text-down',   border: 'border-down',   glyph: '◢' },
  'In Between (prefer B)': { color: 'text-accent', border: 'border-accent', glyph: '◇' },
  'In Between (prefer C)': { color: 'text-warn',   border: 'border-warn',   glyph: '◆' }
};

function RegimeHero({ regime }) {
  if (!regime) return null;

  if (regime.available === false) {
    return (
      <section
        id="home"
        className={cx(
          'relative bg-surf/30 border-x border-b-2 border-double border-warn/60',
          'px-4 md:px-6 py-5'
        )}
      >
        <div className="font-mono smallcaps text-warn mb-2">▲ MACRO REGIME UNAVAILABLE</div>
        <p className="font-sans text-text text-[15px] max-w-3xl">
          {regime.error || 'Macro data is unavailable right now.'}
        </p>
        {regime.refresh?.message && (
          <p className="font-mono text-muted text-[11px] mt-3">{regime.refresh.message}</p>
        )}
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
      {/* Top label strip — anchors the verdict in the brand grid */}
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

      <div className="px-4 md:px-7 py-6 md:py-7 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">
        {/* Verdict block */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-3 mb-2">
            <span className={cx('text-[32px] leading-none', tone.color)}>{tone.glyph}</span>
            <h1 className={cx(
              'font-display font-bold tracking-tight leading-none',
              'text-[40px] md:text-[56px]',
              tone.color,
              'glow-text'
            )}>
              {name}
            </h1>
          </div>
          <p className="font-sans text-text text-[15px] md:text-[16px] max-w-3xl leading-relaxed mt-2">
            {description}
          </p>
          {recommendation && (
            <div className="mt-4 pl-3 border-l-2 border-accent/60 bg-accent/5 py-2 pr-3 max-w-3xl">
              <span className="smallcaps-tight text-accent mr-2">▸ STRATEGY</span>
              <span className="font-sans text-text text-[14px]">{recommendation}</span>
            </div>
          )}
        </div>

        {/* Score column */}
        <div className="font-mono space-y-2 lg:border-l lg:border-line/60 lg:pl-6">
          {fps != null && (
            <ScoreLine label="FPS · Fed Pressure" value={fps} interp={scores?.fps_interpretation} />
          )}
          {gps != null && (
            <ScoreLine label="GPS · Growth Pulse" value={gps} interp={scores?.gps_interpretation} />
          )}

          <div className="border-t border-line/40 pt-3 mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
            <Stat label="Fed Funds"    value={metrics?.fedFundsRate != null ? `${metrics.fedFundsRate.toFixed(2)}%` : '—'} />
            <Stat
              label="Balance 12w"
              value={
                balanceMag != null
                  ? <span className={balanceUp ? 'text-warn' : 'text-up'}>
                      {balanceUp ? '↑' : '↓'} {Math.abs(balanceMag).toFixed(1)}B
                    </span>
                  : '—'
              }
            />
            <Stat label="As of" value={formatDate(metrics?.asOf)} span={2} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ScoreLine({ label, value, interp }) {
  const sign = value > 0 ? '+' : '';
  const color = value > 0.2 ? 'text-warn' : value < -0.2 ? 'text-up' : 'text-muted';
  // value range -1..+1 → 0..100 bar position
  const pct = Math.max(0, Math.min(100, ((value + 1) / 2) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="smallcaps-tight text-muted">{label}</span>
        <span className={`font-mono tabular text-[15px] ${color}`}>{sign}{value.toFixed(2)}</span>
      </div>
      <div className="relative h-1 mt-1 bg-surf border border-line">
        <span className="absolute top-0 bottom-0 left-1/2 w-px bg-line" aria-hidden />
        <span
          className={`absolute top-[-3px] w-1 h-[10px] ${color.replace('text-', 'bg-')}`}
          style={{ left: `calc(${pct}% - 2px)` }}
          aria-hidden
        />
      </div>
      {interp && <div className="text-[10px] text-muted mt-0.5">{interp}</div>}
    </div>
  );
}

function Stat({ label, value, span = 1 }) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <div className="smallcaps-tight text-muted">{label}</div>
      <div className="text-text tabular">{value}</div>
    </div>
  );
}

export default RegimeHero;
