import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import ConfidenceBadge from './ConfidenceBadge';
import ScoreBreakdown from './ScoreBreakdown';
import { theme } from '../config/theme';
import { formatPercent, formatCurrency, formatMultiple, formatDateTime } from '../utils/formatting';

function StockRow({ stock, onDelete, onEditNotes }) {
  const [expanded, setExpanded] = useState(false);

  const { ticker, companyName, sector, fundamentals, classification, notes, lastUpdated } = stock;

  if (!classification) {
    return (
      <div className="stock-row" style={{ opacity: 0.5 }}>
        <span className="ticker">{ticker}</span>
        <span>{companyName}</span>
        <span>{sector || 'N/A'}</span>
        <span>—</span>
        <span>Loading...</span>
        <span>—</span>
        <div className="actions">
          <button className="danger" onClick={() => onDelete(ticker)}>Delete</button>
        </div>
      </div>
    );
  }

  const { class: cls, confidence, scores } = classification;
  const classColors = theme.colors.classes;
  const classColor = classColors[cls];

  // Opacity by confidence
  let opacity = 1.0;
  if (confidence < 0.20) opacity = 0.4;
  else if (confidence < 0.40) opacity = 0.7;

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
        <span className="ticker">{ticker}</span>
        <span className="company-name">{companyName}</span>
        <span className="sector">{sector || 'N/A'}</span>
        <span
          className="class-badge"
          style={{ backgroundColor: classColor }}
        >
          {cls}
        </span>
        <ConfidenceBadge confidence={confidence} />
        <span className="price">
          {fundamentals.latestPrice ? formatCurrency(fundamentals.latestPrice) : '—'}
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

          <ScoreBreakdown scores={scores} finalClass={cls} />

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
