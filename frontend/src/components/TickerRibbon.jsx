import React from 'react';
import { cx } from '../utils/classes';

// Ultra-compressed verdict — single horizontal row of pill stats with the
// regime name as the leading title. Used by the Floor layout to give the
// entire screen below it back to the holdings table.

const REGIME_TONE = {
  'Most Liquid':           { color: 'text-up',     border: 'border-up',     glyph: '◤' },
  'Least Liquid':          { color: 'text-down',   border: 'border-down',   glyph: '◢' },
  'In Between (prefer B)': { color: 'text-accent', border: 'border-accent', glyph: '◇' },
  'In Between (prefer C)': { color: 'text-warn',   border: 'border-warn',   glyph: '◆' }
};

function scoreColor(v) {
  if (v == null) return 'text-text';
  if (v >  0.2) return 'text-warn';
  if (v < -0.2) return 'text-up';
  return 'text-muted';
}

function Chip({ label, value, valueColor, title }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap" title={title}>
      <span className="text-accent/70 text-[10px]" aria-hidden>◆</span>
      <span className="smallcaps-tight text-muted text-[10px]">{label}</span>
      <span className={cx('font-mono tabular text-[12px] font-bold', valueColor || 'text-text')}>
        {value}
      </span>
    </span>
  );
}

function TickerRibbon({ regime, summary }) {
  if (!regime) return null;

  if (regime.available === false) {
    return (
      <section
        id="home"
        className="bg-surf/40 border-x border-b-2 border-double border-warn/60 px-3 py-1.5 flex items-center gap-3"
      >
        <span className="font-mono smallcaps text-warn text-[12px] whitespace-nowrap">▲ MACRO UNAVAILABLE</span>
        <span className="font-sans text-text/80 text-[12px] truncate">
          {regime.error || 'Macro data is unavailable right now.'}
        </span>
      </section>
    );
  }

  const { regime: name, scores, metrics, confidence } = regime;
  const tone = REGIME_TONE[name] || REGIME_TONE['In Between (prefer B)'];
  const fps = scores?.fps;
  const gps = scores?.gps;
  const balanceUp = metrics?.balanceSheetIncreasing;
  const balanceMag = metrics?.balanceSheetChange12w;

  return (
    <section
      id="home"
      className={cx(
        'relative bg-surf/40',
        'border-x border-b-2 border-double',
        tone.border + '/50'
      )}
    >
      <div className="px-3 h-11 flex items-center gap-x-5 overflow-x-auto whitespace-nowrap">
        {/* Regime title */}
        <span className="inline-flex items-baseline gap-2 whitespace-nowrap shrink-0">
          <span className={cx('text-[18px] leading-none', tone.color)}>{tone.glyph}</span>
          <span className={cx(
            'font-display font-bold tracking-tight text-[20px] leading-none whitespace-nowrap',
            tone.color,
            'glow-text'
          )}>
            {name}
          </span>
        </span>

        <span className="text-line shrink-0">│</span>

        {/* Pill stats */}
        {fps != null && (
          <Chip
            label="FPS"
            value={`${fps > 0 ? '+' : ''}${fps.toFixed(2)}`}
            valueColor={scoreColor(fps)}
            title={scores?.fps_interpretation}
          />
        )}
        {gps != null && (
          <Chip
            label="GPS"
            value={`${gps > 0 ? '+' : ''}${gps.toFixed(2)}`}
            valueColor={scoreColor(gps)}
            title={scores?.gps_interpretation}
          />
        )}
        {confidence?.overall != null && (
          <Chip label="CONF" value={`${confidence.overall}%`} />
        )}
        {metrics?.fedFundsRate != null && (
          <Chip label="FED" value={`${metrics.fedFundsRate.toFixed(2)}%`} />
        )}
        {balanceMag != null && (
          <Chip
            label="BAL 12W"
            value={`${balanceUp ? '↑' : '↓'} ${Math.abs(balanceMag).toFixed(1)}B`}
            valueColor={balanceUp ? 'text-warn' : 'text-up'}
          />
        )}
        {summary && (
          <Chip
            label="TRK"
            value={`${summary.totalStocks ?? 0} · ${Math.round((summary.avgConfidence || 0) * 100)}%`}
          />
        )}

        <span className="flex-1" aria-hidden />
      </div>
    </section>
  );
}

export default TickerRibbon;
