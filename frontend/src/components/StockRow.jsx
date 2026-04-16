import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import ConfidenceBadge from './ConfidenceBadge';
import ScoreBreakdown from './ScoreBreakdown';
import { theme } from '../config/theme';
import { formatCurrency, formatDateTime, formatMultiple, formatPercent } from '../utils/formatting';

function hasRefreshWarning(status) {
  return ['warning', 'failed', 'never'].includes(status || 'never');
}

function getRowWarning(detailRefresh, macroRefresh) {
  const detailWarning = hasRefreshWarning(detailRefresh?.status) || detailRefresh?.isPartial;
  const macroWarning = hasRefreshWarning(macroRefresh?.status);

  if (detailWarning && macroWarning) {
    return 'Stock detail and macro data both need refresh';
  }

  if (detailWarning) {
    return detailRefresh?.warning || detailRefresh?.classificationWarning || 'Stock detail data missing or stale';
  }

  if (macroWarning) {
    return 'Macro data missing or stale';
  }

  return null;
}

function StockRow({ stock, onDelete, onEditNotes, macroRefresh }) {
  const [expanded, setExpanded] = useState(false);

  const { ticker, companyName, sector, fundamentals, classification, notes, lastUpdated, refresh } = stock;
  const rowWarning = getRowWarning(refresh?.detail, macroRefresh);

  const cls = classification?.class;
  const confidence = classification?.confidence || 0;
  const scores = classification?.scores;
  const classColors = theme.colors.classes;
  const classColor = cls ? classColors[cls] : '#6b7280';

  let opacity = 1.0;
  if (classification) {
    if (confidence < 0.20) opacity = 0.4;
    else if (confidence < 0.40) opacity = 0.7;
  }

  return (
    <>
      <div
        className="stock-row"
        style={{
          borderLeftColor: classColor,
          borderLeftWidth: '4px',
          borderLeftStyle: 'solid',
          opacity
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="ticker">
          {ticker}
          {rowWarning && (
            <span className="refresh-warning-indicator" title={rowWarning}>
              !
            </span>
          )}
        </span>
        <span className="company-name">{companyName}</span>
        <span className="sector">{sector || 'N/A'}</span>
        <span
          className="class-badge"
          style={{ backgroundColor: classColor }}
        >
          {cls || '—'}
        </span>
        {classification ? <ConfidenceBadge confidence={confidence} /> : <span>Pending</span>}
        <span className="price">
          {fundamentals.latestPrice !== null && fundamentals.latestPrice !== undefined
            ? formatCurrency(fundamentals.latestPrice)
            : '—'}
        </span>
        <div className="actions">
          <button
            className="danger"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete ${ticker}?`)) {
                onDelete(ticker);
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {expanded && (
        <div className="stock-details">
          {rowWarning && (
            <div className="row-warning-banner">
              {rowWarning}
            </div>
          )}

          <div className="fundamentals-grid">
            <div className="metric">
              <label>Revenue Growth</label>
              <span>{formatPercent(fundamentals.revenueGrowth)}</span>
            </div>
            <div className="metric">
              <label>EPS Growth</label>
              <span>{formatPercent(fundamentals.epsGrowth)}</span>
            </div>
            <div className="metric">
              <label>P/E (Forward)</label>
              <span>{formatMultiple(fundamentals.peForward)}</span>
            </div>
            <div className="metric">
              <label>Debt/EBITDA</label>
              <span>{formatMultiple(fundamentals.debtEbitda)}</span>
            </div>
          </div>

          {classification ? (
            <ScoreBreakdown scores={scores} finalClass={cls} />
          ) : (
            <div className="row-warning-banner subtle">
              Classification unavailable until a sufficient detail refresh succeeds.
            </div>
          )}

          <div className="notes-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4>Notes</h4>
              <button onClick={() => onEditNotes(ticker, notes)}>
                {notes ? 'Edit Notes' : 'Add Notes'}
              </button>
            </div>
            {notes ? (
              <div className="notes-rendered">
                <ReactMarkdown>{notes}</ReactMarkdown>
              </div>
            ) : (
              <p className="no-notes">No notes yet</p>
            )}
          </div>

          <div className="metadata" style={{ marginTop: '16px', fontSize: '12px', color: '#a0a0a0' }}>
            <div>Last updated: {formatDateTime(lastUpdated)}</div>
            <div>Quote refresh: {formatDateTime(refresh?.quote?.lastRefreshedAt)}</div>
            <div>Detail refresh: {formatDateTime(refresh?.detail?.lastRefreshedAt)}</div>
            {refresh?.detail?.missingFields?.length > 0 && (
              <div>Missing detail fields: {refresh.detail.missingFields.join(', ')}</div>
            )}
            {refresh?.detail?.classificationWarning && (
              <div>{refresh.detail.classificationWarning}</div>
            )}
            {macroRefresh?.lastRefreshedAt && (
              <div>Macro refresh: {formatDateTime(macroRefresh.lastRefreshedAt)}</div>
            )}
            {fundamentals.priceTimestamp && (
              <div>Price as of: {formatDateTime(fundamentals.priceTimestamp)}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default StockRow;
