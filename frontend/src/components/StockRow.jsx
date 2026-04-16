import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import ConfidenceBadge from './ConfidenceBadge';
import ScoreBreakdown from './ScoreBreakdown';
import Sparkline from './Sparkline';
import { cx, classText } from '../utils/classes';
import {
  formatCurrency, formatDateTime, formatMultiple, formatPercent
} from '../utils/formatting';

const CLASS_COLOR = {
  A: 'rgb(var(--class-a))',
  B: 'rgb(var(--class-b))',
  C: 'rgb(var(--class-c))',
  D: 'rgb(var(--class-d))'
};

const hasWarn = (status) => ['warning', 'failed', 'never'].includes(status || 'never');

function rowWarning(detail, macro) {
  const d = hasWarn(detail?.status) || detail?.isPartial;
  const m = hasWarn(macro?.status);
  if (d && m) return 'Stock detail and macro data both need refresh';
  if (d) return detail?.warning || detail?.classificationWarning || 'Stock detail data missing or stale';
  if (m) return 'Macro data missing or stale';
  return null;
}

function StockRow({ stock, columns, onDelete, onEditNotes, macroRefresh, scrollRef }) {
  const [expanded, setExpanded] = useState(false);
  const {
    ticker, companyName, sector, fundamentals, classification, notes, lastUpdated, refresh,
    priceHistory
  } = stock;

  const cls = classification?.class;
  const conf = classification?.confidence ?? null;
  const warning = rowWarning(refresh?.detail, macroRefresh);
  const visibleCols = columns.filter((c) => !c.hidden);
  const colSpan = visibleCols.length;

  // Confidence dimming preserved (low conf = visually deprioritised).
  const opacity = classification == null
    ? 1
    : conf < 0.20 ? 0.45 : conf < 0.40 ? 0.75 : 1;

  const cellClass = 'px-2 py-1.5 align-middle';
  const cellRight = cx(cellClass, 'text-right');

  const renderCell = (id) => {
    switch (id) {
      case 'ticker':
        return (
          <td key={id} className={cx(cellClass, 'border-l-[3px]')} style={{ borderLeftColor: cls ? CLASS_COLOR[cls] : 'transparent' }}>
            <span className="font-mono font-bold text-text tracking-tight">{ticker}</span>
            {warning && (
              <span className="ml-1.5 text-warn font-mono text-[11px]" title={warning}>▲</span>
            )}
          </td>
        );
      case 'company':
        return <td key={id} className={cx(cellClass, 'truncate max-w-[260px] font-sans text-text')}>{companyName || '—'}</td>;
      case 'sector':
        return <td key={id} className={cx(cellClass, 'text-muted text-[12px] uppercase tracking-wider truncate max-w-[140px]')}>{sector || '—'}</td>;
      case 'class':
        return (
          <td key={id} className={cx(cellClass, 'text-center')}>
            {cls ? (
              <span
                className={cx('inline-flex items-center justify-center w-6 h-5 font-mono font-bold text-[12px]', classText[cls] || 'text-text')}
                style={{ backgroundColor: 'rgb(var(--bg))', border: `1px solid ${CLASS_COLOR[cls]}`, boxShadow: `inset 0 0 0 1px ${CLASS_COLOR[cls]}33` }}
              >{cls}</span>
            ) : <span className="text-muted">—</span>}
          </td>
        );
      case 'confidence':
        return (
          <td key={id} className={cellRight}>
            {classification ? <ConfidenceBadge confidence={conf} /> : <span className="text-muted text-[11px] smallcaps-tight">PENDING</span>}
          </td>
        );
      case 'price':
        return (
          <td key={id} className={cellRight}>
            <span className="font-mono tabular text-text">
              {fundamentals?.latestPrice != null ? formatCurrency(fundamentals.latestPrice) : '—'}
            </span>
          </td>
        );
      case 'spark':
        return (
          <td key={id} className={cellClass}>
            <Sparkline points={priceHistory} />
          </td>
        );
      case 'actions':
        return (
          <td key={id} className={cx(cellClass, 'text-right')}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete ${ticker}?`)) onDelete(ticker);
              }}
              className="text-muted hover:text-down border border-transparent hover:border-down/40 px-1.5 py-0.5 smallcaps-tight font-mono"
            >DEL</button>
          </td>
        );
      default:
        return <td key={id} className={cellClass} />;
    }
  };

  return (
    <>
      <tr
        ref={scrollRef}
        onClick={() => setExpanded((e) => !e)}
        className={cx(
          'group cursor-pointer border-b border-line/40 hover:bg-surf/40',
          'transition-colors',
          expanded && 'bg-surf/40'
        )}
        style={{ opacity, height: 'var(--row)' }}
      >
        {visibleCols.map((c) => renderCell(c.id))}
      </tr>

      {expanded && (
        <tr className="bg-surfAlt/60 border-b-2 border-double border-line">
          <td colSpan={colSpan} className="p-0">
            <div className="border-l-2 border-accent/60 px-4 py-4 space-y-4 font-mono text-[12px]">
              {warning && (
                <div className="border border-warn/40 bg-warn/10 text-warn px-2 py-1.5 text-[12px]">
                  ▲ {warning}
                </div>
              )}

              {/* Fundamentals */}
              <div>
                <div className="smallcaps-tight text-muted mb-2">FUNDAMENTALS</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Metric label="REV GROWTH"  value={formatPercent(fundamentals?.revenueGrowth)} />
                  <Metric label="EPS GROWTH"  value={formatPercent(fundamentals?.epsGrowth)} />
                  <Metric label="P/E (FWD)"   value={formatMultiple(fundamentals?.peForward)} />
                  <Metric label="DEBT/EBITDA" value={formatMultiple(fundamentals?.debtEbitda)} />
                </div>
              </div>

              {/* Score breakdown */}
              {classification ? (
                <ScoreBreakdown scores={classification.scores} finalClass={cls} />
              ) : (
                <div className="border border-muted/30 bg-surf/40 text-muted px-2 py-1.5">
                  Classification unavailable until a sufficient detail refresh succeeds.
                </div>
              )}

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="smallcaps-tight text-muted">NOTES</div>
                  <button
                    onClick={() => onEditNotes(ticker, notes)}
                    className="text-accent border border-accent/40 hover:bg-accent/10 px-2 py-0.5 smallcaps-tight"
                  >
                    {notes ? 'EDIT' : 'ADD'}
                  </button>
                </div>
                {notes ? (
                  <div className="prose prose-invert max-w-none bg-bg/50 border border-line p-3 font-sans text-[13px] leading-relaxed">
                    <ReactMarkdown>{notes}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-muted text-[12px] italic">No notes yet</div>
                )}
              </div>

              {/* Metadata */}
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 pt-2 border-t border-line/40 text-[11px]">
                <Meta k="UPDATED"        v={formatDateTime(lastUpdated)} />
                <Meta k="QUOTE REFRESH"  v={formatDateTime(refresh?.quote?.lastRefreshedAt)} />
                <Meta k="DETAIL REFRESH" v={formatDateTime(refresh?.detail?.lastRefreshedAt)} />
                {fundamentals?.priceTimestamp && <Meta k="PRICE AS OF" v={formatDateTime(fundamentals.priceTimestamp)} />}
                {macroRefresh?.lastRefreshedAt && <Meta k="MACRO REFRESH" v={formatDateTime(macroRefresh.lastRefreshedAt)} />}
                {refresh?.detail?.missingFields?.length > 0 && (
                  <Meta k="MISSING" v={refresh.detail.missingFields.join(', ')} tone="warn" span={2} />
                )}
                {refresh?.detail?.classificationWarning && (
                  <Meta k="WARNING" v={refresh.detail.classificationWarning} tone="warn" span={2} />
                )}
              </dl>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Metric({ label, value }) {
  return (
    <div className="bg-bg/60 border border-line p-2">
      <div className="smallcaps-tight text-muted">{label}</div>
      <div className="tabular text-text text-[14px] font-bold mt-0.5">{value}</div>
    </div>
  );
}

function Meta({ k, v, tone = 'default', span = 1 }) {
  return (
    <div className={cx('flex gap-2', span === 2 && 'md:col-span-2')}>
      <dt className="smallcaps-tight text-muted min-w-[110px]">{k}</dt>
      <dd className={cx('font-mono', tone === 'warn' ? 'text-warn' : 'text-text')}>{v}</dd>
    </div>
  );
}

export default StockRow;
