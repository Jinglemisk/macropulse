import React from 'react';
import { cx } from '../utils/classes';

const NAMES = {
  unemployment: 'Unemployment',
  jobless_claims: 'Jobless Claims',
  nonfarm_payrolls: 'Nonfarm Payrolls',
  cpi_yoy: 'CPI (YoY)',
  core_cpi_yoy: 'Core CPI (YoY)',
  ppi: 'PPI (MoM)',
  ism_manufacturing: 'ISM Manufacturing',
  ism_services: 'ISM Services',
  chicago_pmi: 'Chicago PMI',
  consumer_confidence: 'Consumer Confidence'
};

function fmt(indicator, value) {
  if (value == null) return '—';
  if (indicator?.includes('yoy') || indicator === 'unemployment' || indicator === 'ppi') {
    return `${value.toFixed(1)}%`;
  }
  if (indicator === 'jobless_claims' || indicator === 'nonfarm_payrolls') {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toFixed(1);
}

function classBadge(cls) {
  switch (cls) {
    case 'High': return 'text-down border-down/40 bg-down/10';
    case 'Low':  return 'text-up   border-up/40   bg-up/10';
    case 'Normal': return 'text-muted border-line bg-surf';
    default: return 'text-muted border-line bg-surf';
  }
}

function scoreColor(s) {
  if (s == null) return 'text-muted';
  if (s > 0) return 'text-warn';
  if (s < 0) return 'text-up';
  return 'text-muted';
}

function IndicatorGrid({ fpsBreakdown = [], gpsBreakdown = [] }) {
  const map = new Map();
  fpsBreakdown.forEach((it) => map.set(it.indicator, { ...it, fps_score: it.score, fps_weight: it.weight }));
  gpsBreakdown.forEach((it) => map.set(it.indicator, { ...(map.get(it.indicator) || {}), ...it, gps_score: it.score, gps_weight: it.weight }));
  const rows = Array.from(map.values());

  return (
    <div className="font-mono">
      <div className="overflow-x-auto -mx-4 md:mx-0">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-muted smallcaps-tight border-y border-line">
              <th className="text-left  font-normal py-1.5 px-2">INDICATOR</th>
              <th className="text-right font-normal py-1.5 px-2">VALUE</th>
              <th className="text-left  font-normal py-1.5 px-2">CLASS</th>
              <th className="text-right font-normal py-1.5 px-2">FPS</th>
              <th className="text-right font-normal py-1.5 px-2">GPS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-line/40 hover:bg-surf/40">
                <td className="py-1 px-2 text-text">{NAMES[row.indicator] || row.indicator}</td>
                <td className="py-1 px-2 text-right tabular text-text">{fmt(row.indicator, row.value)}</td>
                <td className="py-1 px-2">
                  {row.classification && (
                    <span className={cx('px-1.5 py-0.5 border smallcaps-tight inline-block', classBadge(row.classification))}>
                      {row.classification.toUpperCase()}
                    </span>
                  )}
                </td>
                <td className="py-1 px-2 text-right tabular">
                  {row.fps_score != null ? (
                    <span className={scoreColor(row.fps_score)}>
                      {row.fps_score > 0 ? '+' : ''}{row.fps_score}
                      <span className="text-muted text-[10px] ml-1">×{row.fps_weight}</span>
                    </span>
                  ) : <span className="text-muted">—</span>}
                </td>
                <td className="py-1 px-2 text-right tabular">
                  {row.gps_score != null ? (
                    <span className={scoreColor(row.gps_score)}>
                      {row.gps_score > 0 ? '+' : ''}{row.gps_score}
                      <span className="text-muted text-[10px] ml-1">×{row.gps_weight}</span>
                    </span>
                  ) : <span className="text-muted">—</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="py-3 text-center text-muted">No indicator data</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-muted mt-3 pt-2 border-t border-line/40">
        <span><span className="text-up">●</span> Low — below threshold</span>
        <span><span className="text-muted">●</span> Normal — within range</span>
        <span><span className="text-down">●</span> High — above threshold</span>
      </div>
    </div>
  );
}

export default IndicatorGrid;
