import React from 'react';
import { cx, classBgSoft, classBorderSoft, classText } from '../utils/classes';
import { formatDateTime } from '../utils/formatting';

function PortfolioSummaryStrip({ summary }) {
  if (!summary) return null;

  const cards = [
    { label: 'TRACKED',     value: String(summary.totalStocks ?? 0) },
    { label: 'AVG CONF',    value: `${Math.round((summary.avgConfidence || 0) * 100)}%` },
    { label: 'LOW CONF',    value: String(summary.lowConfidenceCount ?? 0),
      tone: (summary.lowConfidenceCount || 0) > 0 ? 'warn' : 'default' },
    { label: 'LAST REFRESH', value: formatDateTime(summary.lastRefresh), small: true }
  ];

  const dist = summary.byClass || {};

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {cards.map((c) => (
        <div
          key={c.label}
          className={cx(
            'bg-surf/40 border border-line p-3 flex flex-col justify-between gap-1 min-h-[78px]',
            c.tone === 'warn' && 'border-warn/40'
          )}
        >
          <span className="smallcaps-tight text-muted">{c.label}</span>
          <span className={cx(
            'font-mono tabular leading-none',
            c.small ? 'text-[14px] text-text' : 'text-[24px] font-bold text-text',
            c.tone === 'warn' && 'text-warn'
          )}>
            {c.value}
          </span>
        </div>
      ))}

      <div className="col-span-2 md:col-span-4 bg-surf/40 border border-line p-3">
        <div className="flex items-center gap-3 mb-2">
          <span className="smallcaps-tight text-muted">CLASS DISTRIBUTION</span>
          <span className="flex-1 border-t border-line/60" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(dist).map(([k, count]) => (
            <span
              key={k}
              className={cx(
                'inline-flex items-center gap-2 px-2 py-1 border font-mono text-[12px]',
                classBgSoft[k] || 'bg-surf',
                classBorderSoft[k] || 'border-line',
                classText[k] || 'text-text'
              )}
            >
              <span className="smallcaps-tight">{k}</span>
              <span className="tabular text-text">{count}</span>
            </span>
          ))}
          {Object.keys(dist).length === 0 && (
            <span className="text-muted text-[12px] font-mono">—</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default PortfolioSummaryStrip;
