import React from 'react';
import { cx } from '../utils/classes';

// Vertical macro indicator rail. Used by Cockpit (with FPS/GPS gauges) and
// Floor (list-only, since the ribbon already carries the headline scores).
//
// Visual grammar matches the rest of the terminal: small caps labels, mono
// tabular values, classification dots on the left edge, divider lines between
// rows. Names are abbreviated to fit a ~220px column without truncating.

const NAMES = {
  unemployment:        'Unemployment',
  jobless_claims:      'Jobless Claims',
  nonfarm_payrolls:    'Nonfarm Payrolls',
  cpi_yoy:             'CPI YoY',
  core_cpi_yoy:        'Core CPI YoY',
  ppi:                 'PPI MoM',
  ism_manufacturing:   'ISM Mfg',
  ism_services:        'ISM Svc',
  chicago_pmi:         'Chicago PMI',
  consumer_confidence: 'Cons Conf',
  retail_sales:        'Retail Sales',
  cfnai:               'CFNAI',
  indpro:              'IndPro'
};

function fmt(indicator, value) {
  if (value == null) return '—';
  if (indicator?.includes('yoy') || indicator === 'unemployment' || indicator === 'ppi') return `${value.toFixed(1)}%`;
  if (indicator === 'jobless_claims' || indicator === 'nonfarm_payrolls') return `${(value / 1000).toFixed(0)}k`;
  if (indicator === 'retail_sales') return `${(value / 1000).toFixed(0)}k`;
  return value.toFixed(1);
}

function dotColor(cls) {
  if (cls === 'High') return 'bg-down';
  if (cls === 'Low')  return 'bg-up';
  return 'bg-muted/40';
}

function ScoreBar({ label, value, interp }) {
  if (value == null) return null;
  const sign = value > 0 ? '+' : '';
  const color = value > 0.2 ? 'text-warn' : value < -0.2 ? 'text-up' : 'text-muted';
  // value range -1..+1 → 0..100 marker position.
  const pct = Math.max(0, Math.min(100, ((value + 1) / 2) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="smallcaps-tight text-muted">{label}</span>
        <span className={cx('font-mono tabular text-[14px]', color)}>{sign}{value.toFixed(2)}</span>
      </div>
      <div className="relative h-1 mt-1 bg-surf border border-line">
        <span className="absolute top-0 bottom-0 left-1/2 w-px bg-line" aria-hidden />
        <span
          className={cx('absolute top-[-3px] w-1 h-[10px]', color.replace('text-', 'bg-'))}
          style={{ left: `calc(${pct}% - 2px)` }}
          aria-hidden
        />
      </div>
      {interp && <div className="text-[10px] text-muted mt-0.5 truncate" title={interp}>{interp}</div>}
    </div>
  );
}

function MacroRail({ scores, breakdown, showScores = true }) {
  // Merge fps/gps breakdowns into a single per-indicator row so each one
  // appears once in the rail.
  const map = new Map();
  (breakdown?.fps || []).forEach((it) => map.set(it.indicator, { ...it }));
  (breakdown?.gps || []).forEach((it) => map.set(it.indicator, { ...(map.get(it.indicator) || {}), ...it }));
  const rows = Array.from(map.values());

  return (
    <div className="font-mono">
      {showScores && scores && (
        <div className="space-y-3 mb-3">
          <ScoreBar label="FPS · Fed Pressure"  value={scores.fps} interp={scores.fps_interpretation} />
          <ScoreBar label="GPS · Growth Pulse" value={scores.gps} interp={scores.gps_interpretation} />
        </div>
      )}

      <div className={cx(showScores && 'border-t border-line/40 pt-2')}>
        <div className="flex items-center gap-2 mb-1">
          <span className="smallcaps-tight text-muted text-[10px]">INDICATORS</span>
          <span className="flex-1 border-t border-line/40" />
          <span className="text-muted/60 text-[10px] tabular">{rows.length}</span>
        </div>
        <ul className="divide-y divide-line/40 text-[11px]">
          {rows.map((row) => (
            <li key={row.indicator} className="flex items-center gap-2 py-1" title={row.classification ? `${NAMES[row.indicator] || row.indicator} · ${row.classification}` : NAMES[row.indicator] || row.indicator}>
              <span className={cx('w-1.5 h-1.5 inline-block flex-none', dotColor(row.classification))} aria-hidden />
              <span className="text-text truncate flex-1">
                {NAMES[row.indicator] || row.indicator}
              </span>
              <span className="text-text tabular whitespace-nowrap">
                {fmt(row.indicator, row.value)}
              </span>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="py-2 text-muted text-[11px]">No indicators available.</li>
          )}
        </ul>

        <div className="flex items-center gap-3 mt-2 pt-1.5 border-t border-line/40 text-[9px] text-muted">
          <span><span className="text-up">●</span> Low</span>
          <span><span className="text-muted">●</span> Norm</span>
          <span><span className="text-down">●</span> High</span>
        </div>
      </div>
    </div>
  );
}

export default MacroRail;
