import React from 'react';
import { cx, classBgSoft, classBorderSoft, classText } from '../utils/classes';
import { formatDateTime } from '../utils/formatting';

// Vertical portfolio summary, sized for Cockpit's narrow right rail.
// Replaces the horizontal PortfolioSummaryStrip when the layout has no
// width to spare.

function Stat({ label, value, tone, large = true }) {
  return (
    <div>
      <div className="smallcaps-tight text-muted text-[10px]">{label}</div>
      <div className={cx(
        'font-mono tabular leading-none mt-1',
        large ? 'text-[24px] font-bold' : 'text-[12px]',
        tone === 'warn' ? 'text-warn' : 'text-text'
      )}>
        {value}
      </div>
    </div>
  );
}

function PortfolioRail({ summary }) {
  if (!summary) return null;
  const dist = summary.byClass || {};

  return (
    <div className="font-mono space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="TRACKED"  value={String(summary.totalStocks ?? 0)} />
        <Stat label="AVG CONF" value={`${Math.round((summary.avgConfidence || 0) * 100)}%`} />
      </div>

      <Stat
        label="LOW CONF"
        value={String(summary.lowConfidenceCount ?? 0)}
        tone={(summary.lowConfidenceCount || 0) > 0 ? 'warn' : 'default'}
      />

      <div className="border-t border-line/40 pt-2">
        <div className="smallcaps-tight text-muted text-[10px] mb-1.5">CLASS DIST.</div>
        <div className="grid grid-cols-2 gap-1.5">
          {['A', 'B', 'C', 'D'].map((k) => (
            <span
              key={k}
              className={cx(
                'inline-flex items-center gap-2 px-2 py-1 border text-[11px]',
                classBgSoft[k] || 'bg-surf',
                classBorderSoft[k] || 'border-line',
                classText[k] || 'text-text'
              )}
            >
              <span className="smallcaps-tight">{k}</span>
              <span className="tabular text-text ml-auto">{dist[k] ?? 0}</span>
            </span>
          ))}
        </div>
      </div>

      {summary.lastRefresh && (
        <div className="border-t border-line/40 pt-2">
          <Stat label="LAST REFRESH" value={formatDateTime(summary.lastRefresh)} large={false} />
        </div>
      )}
    </div>
  );
}

export default PortfolioRail;
