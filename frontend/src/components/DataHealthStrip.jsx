import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cx } from '../utils/classes';
import { formatDateTime } from '../utils/formatting';

// Map domain status → glyph + color class.
const STATUS = {
  success: { glyph: '●', color: 'text-up',    label: 'OK'      },
  warning: { glyph: '◐', color: 'text-warn',  label: 'PARTIAL' },
  failed:  { glyph: '✕', color: 'text-down',  label: 'FAILED'  },
  never:   { glyph: '○', color: 'text-muted', label: 'NEVER'   }
};

function pickStatus(s) {
  return STATUS[s] || STATUS.never;
}

function relTime(iso) {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return '—';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

// Aggregate per-stock refresh statuses into Q/D summaries.
function summariseStocks(stocks = []) {
  const tally = (key) => {
    const out = { success: 0, warning: 0, failed: 0, never: 0, latest: null, partial: [] };
    for (const s of stocks) {
      const r = s.refresh?.[key];
      const status = r?.status || 'never';
      out[status in out ? status : 'never']++;
      if (r?.lastRefreshedAt && (!out.latest || r.lastRefreshedAt > out.latest)) {
        out.latest = r.lastRefreshedAt;
      }
      if (key === 'detail' && r?.isPartial) out.partial.push(s.ticker);
    }
    return out;
  };
  return { quote: tally('quote'), detail: tally('detail') };
}

function worstOf(stats) {
  if (stats.failed > 0) return 'failed';
  if (stats.warning > 0 || stats.partial?.length) return 'warning';
  if (stats.success === 0) return 'never';
  return 'success';
}

function DataHealthStrip({ stocks = [], macroRefresh, refreshReport, onJumpToTicker }) {
  const [open, setOpen] = useState(false);
  // Flip-side decision: panel aligns with the trigger's left edge by default,
  // but flips to right-alignment when its width would spill past the viewport.
  const [flipRight, setFlipRight] = useState(false);
  const triggerRef = useRef(null);
  const rootRef = useRef(null);
  const PANEL_WIDTH = 420;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const room = window.innerWidth - rect.left;
    setFlipRight(room < PANEL_WIDTH + 12);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    const onKey  = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const stats = useMemo(() => summariseStocks(stocks), [stocks]);
  const macroStatus = macroRefresh?.status || 'never';

  const overallStatus = (() => {
    const worstStock = worstOf({ ...stats.quote, partial: stats.detail.partial });
    if (overall(macroStatus) === 'failed' || worstStock === 'failed') return 'failed';
    if (overall(macroStatus) === 'warning' || worstStock === 'warning') return 'warning';
    return 'success';
  })();

  function overall(s) {
    if (s === 'failed') return 'failed';
    if (s === 'warning' || s === 'never') return 'warning';
    return 'success';
  }

  const Q = pickStatus(worstOf(stats.quote));
  const D = pickStatus(worstOf({ ...stats.detail, partial: stats.detail.partial }));
  const M = pickStatus(macroStatus === 'never' ? 'never' : macroStatus);
  const partialCount = stats.detail.partial.length;

  const latest = [stats.quote.latest, stats.detail.latest, macroRefresh?.lastRefreshedAt]
    .filter(Boolean)
    .sort()
    .pop();

  return (
    <div ref={rootRef} className="relative font-mono text-[11px]">
      {/* Compact line. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cx(
          'inline-flex items-center gap-2 px-2 h-7 border border-line bg-surf/60',
          'hover:border-accent/60 transition-colors',
          open && 'border-accent/60 bg-accent/5'
        )}
        aria-expanded={open}
        title="Data freshness · click to expand"
      >
        <span className="smallcaps-tight text-muted mr-1">DATA</span>
        <Pill label="Q" status={Q} />
        <Pill label="D" status={D} />
        <Pill label="M" status={M} />
        {partialCount > 0 && (
          <span className="text-warn smallcaps-tight">{partialCount} PRTL</span>
        )}
        <span className="text-muted">·</span>
        <span className="text-muted">{relTime(latest)}</span>
        <span className={cx('ml-1 text-muted', open && 'rotate-90 inline-block')}>▸</span>
      </button>

      {open && (
        <div
          className={cx(
            'absolute top-full mt-1 z-40 w-[420px] bg-bg border border-accent/60 p-3',
            'shadow-[0_0_0_1px_rgb(var(--bg))]',
            flipRight ? 'right-0' : 'left-0'
          )}
        >
          <div className="smallcaps-tight text-muted mb-2 flex items-center gap-2">
            <span>Data Health</span>
            <span className="flex-1 border-t border-line" />
            <span className={cx(
              'px-1.5 py-0.5 border',
              overallStatus === 'success' && 'text-up border-up/40',
              overallStatus === 'warning' && 'text-warn border-warn/40',
              overallStatus === 'failed'  && 'text-down border-down/40'
            )}>{overallStatus.toUpperCase()}</span>
          </div>

          <DomainRow
            label="Quotes"
            stats={stats.quote}
            ago={relTime(stats.quote.latest)}
          />
          <DomainRow
            label="Details"
            stats={stats.detail}
            ago={relTime(stats.detail.latest)}
          />
          <div className="grid grid-cols-[80px_1fr] gap-x-3 py-1 border-t border-line/40">
            <span className="text-muted">Macro</span>
            <span>
              <span className={pickStatus(macroStatus).color}>
                {pickStatus(macroStatus).glyph} {pickStatus(macroStatus).label}
              </span>
              <span className="text-muted ml-2">{relTime(macroRefresh?.lastRefreshedAt)}</span>
              {macroRefresh?.message && (
                <div className="text-muted text-[10px] mt-0.5">{macroRefresh.message}</div>
              )}
            </span>
          </div>

          {partialCount > 0 && (
            <div className="mt-2 pt-2 border-t border-line/40">
              <div className="smallcaps-tight text-warn mb-1">Partial detail · {partialCount}</div>
              <div className="flex flex-wrap gap-1">
                {stats.detail.partial.map((tk) => (
                  <button
                    key={tk}
                    type="button"
                    onClick={() => { onJumpToTicker?.(tk); setOpen(false); }}
                    className="px-1.5 py-0.5 border border-warn/40 text-warn hover:bg-warn/10 text-[10px]"
                  >{tk}</button>
                ))}
              </div>
            </div>
          )}

          {refreshReport && (
            <div className="mt-2 pt-2 border-t border-line/40 text-muted text-[10px]">
              Last refresh: {formatDateTime(refreshReport.updatedAt)} · {refreshReport.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Pill({ label, status }) {
  return (
    <span className={cx('inline-flex items-center gap-1', status.color)}>
      <span aria-hidden>{status.glyph}</span>
      <span className="text-muted smallcaps-tight">{label}</span>
    </span>
  );
}

function DomainRow({ label, stats, ago }) {
  const worst = pickStatus(stats.failed > 0 ? 'failed' : stats.warning > 0 ? 'warning' : stats.success > 0 ? 'success' : 'never');
  return (
    <div className="grid grid-cols-[80px_1fr] gap-x-3 py-1 border-t border-line/40">
      <span className="text-muted">{label}</span>
      <span>
        <span className={worst.color}>{worst.glyph} {worst.label}</span>
        <span className="text-muted ml-2">{ago}</span>
        <div className="text-muted text-[10px] mt-0.5 flex gap-3">
          <span>ok {stats.success}</span>
          {stats.warning > 0 && <span className="text-warn">warn {stats.warning}</span>}
          {stats.failed  > 0 && <span className="text-down">fail {stats.failed}</span>}
          {stats.never   > 0 && <span>never {stats.never}</span>}
        </div>
      </span>
    </div>
  );
}

export default DataHealthStrip;
