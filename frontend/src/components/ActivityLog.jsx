import React from 'react';
import { cx } from '../utils/classes';
import { formatDateTime } from '../utils/formatting';

// Session activity feed — surfaces refresh runs, macro freshness, and
// per-domain status. Lives in the Panel layout's right rail.
//
// Today this is sourced entirely from the dashboard hook (refreshReport +
// regime.refresh + summary.lastRefresh). When a real activity API lands it
// can drop in here without touching the layout.
function ActivityLog({ refreshReport, regime, summary }) {
  const events = [];

  if (refreshReport) {
    events.push({
      ts: refreshReport.updatedAt,
      tone: refreshReport.tone,
      label: 'REFRESH',
      message: refreshReport.message
    });
    refreshReport.domains?.forEach((d) => {
      events.push({
        ts: refreshReport.updatedAt,
        tone: d.status === 'success' ? 'success' : d.status === 'warning' ? 'warning' : 'error',
        label: d.label?.toUpperCase() || d.key?.toUpperCase(),
        message: d.key === 'macro'
          ? `${d.succeeded ?? 0} ok · ${d.failed ?? 0} fail`
          : `${d.succeeded ?? 0}/${d.requested ?? 0} ok`
      });
    });
  }

  if (regime?.refresh?.message && !refreshReport) {
    events.push({
      ts: regime?.refresh?.timestamp,
      tone: regime.refresh.status === 'success' ? 'success' : 'warning',
      label: 'MACRO',
      message: regime.refresh.message
    });
  }

  if (summary?.lastRefresh && events.length === 0) {
    events.push({
      ts: summary.lastRefresh,
      tone: 'info',
      label: 'PORTFOLIO',
      message: 'Last detail refresh'
    });
  }

  if (events.length === 0) {
    return (
      <div className="font-mono text-[11px] text-muted/80 py-2">
        No session activity yet — hit REFRESH to start a run.
      </div>
    );
  }

  const tones = {
    success: 'text-up   border-up/40',
    warning: 'text-warn border-warn/40',
    error:   'text-down border-down/40',
    info:    'text-accent border-accent/40'
  };

  return (
    <ul className="font-mono text-[11px] divide-y divide-line/40">
      {events.map((e, i) => (
        <li key={i} className="flex items-start gap-2 py-1.5">
          <span className={cx('smallcaps-tight text-[9px] px-1 border whitespace-nowrap', tones[e.tone] || tones.info)}>
            {e.label}
          </span>
          <span className="flex-1 text-text leading-snug">{e.message}</span>
          {e.ts && (
            <span className="text-muted text-[10px] tabular whitespace-nowrap">
              {formatDateTime(e.ts)?.split(',')?.pop()?.trim() || ''}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default ActivityLog;
