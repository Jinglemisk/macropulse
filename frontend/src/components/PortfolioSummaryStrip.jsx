import React from 'react';
import { formatDateTime } from '../utils/formatting';

function PortfolioSummaryStrip({ summary }) {
  if (!summary) {
    return null;
  }

  const cards = [
    {
      label: 'Tracked Stocks',
      value: summary.totalStocks ?? 0
    },
    {
      label: 'Average Confidence',
      value: `${Math.round((summary.avgConfidence || 0) * 100)}%`
    },
    {
      label: 'Low Confidence',
      value: summary.lowConfidenceCount ?? 0
    },
    {
      label: 'Last Stock Refresh',
      value: formatDateTime(summary.lastRefresh)
    }
  ];

  return (
    <section className="portfolio-summary-strip">
      {cards.map(card => (
        <div key={card.label} className="summary-card">
          <span className="summary-card-label">{card.label}</span>
          <strong className="summary-card-value">{card.value}</strong>
        </div>
      ))}

      <div className="summary-card summary-distribution">
        <span className="summary-card-label">Class Distribution</span>
        <div className="summary-distribution-row">
          {Object.entries(summary.byClass || {}).map(([stockClass, count]) => (
            <div key={stockClass} className={`summary-chip class-${stockClass.toLowerCase()}`}>
              <span>{stockClass}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PortfolioSummaryStrip;
