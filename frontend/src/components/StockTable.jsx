import React, { useState, useMemo } from 'react';
import StockRow from './StockRow';
import FilterControls from './FilterControls';
import SectionTitle from './SectionTitle';

function StockTable({ stocks, onRefresh, onDelete, onEditNotes, refreshing }) {
  const [filters, setFilters] = useState({
    class: 'all',
    confidence: 'all',
    sector: 'all',
    sortBy: 'ticker',
    sortOrder: 'asc'
  });

  // Apply filters and sorting
  const filteredStocks = useMemo(() => {
    let result = [...stocks];

    // Filter by class
    if (filters.class !== 'all') {
      result = result.filter(s => s.classification?.class === filters.class);
    }

    // Filter by confidence
    if (filters.confidence === 'high') {
      result = result.filter(s => s.classification?.confidence > 0.40);
    } else if (filters.confidence === 'medium') {
      result = result.filter(s => s.classification?.confidence >= 0.20 && s.classification?.confidence <= 0.40);
    } else if (filters.confidence === 'low') {
      result = result.filter(s => s.classification?.confidence < 0.20);
    }

    // Filter by sector
    if (filters.sector !== 'all') {
      result = result.filter(s => s.sector === filters.sector);
    }

    // Sort
    result.sort((a, b) => {
      let aVal, bVal;

      if (filters.sortBy === 'ticker') {
        aVal = a.ticker;
        bVal = b.ticker;
      } else if (filters.sortBy === 'class') {
        aVal = a.classification?.class || 'Z';
        bVal = b.classification?.class || 'Z';
      } else if (filters.sortBy === 'confidence') {
        aVal = a.classification?.confidence || 0;
        bVal = b.classification?.confidence || 0;
      }

      if (filters.sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
  }, [stocks, filters]);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <SectionTitle
            title="Portfolio"
            description="Your classified stocks (A/B/C/D) with confidence scores based on revenue growth, P/E, and debt metrics. Click any row to add investment notes."
            tag="h2"
            className="portfolio-title-wrapper"
          />
          <span style={{ fontSize: '14px', color: '#a0a0a0' }}>
            ({filteredStocks.length} stocks)
          </span>
        </div>
        <button className="primary" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing...' : 'Refresh All'}
        </button>
      </div>

      <FilterControls
        filters={filters}
        setFilters={setFilters}
        stocks={stocks}
      />

      <div className="stock-table-container">
        <div className="stock-table-header">
          <span>Ticker</span>
          <span>Company</span>
          <span>Sector</span>
          <span>Class</span>
          <span>Confidence</span>
          <span>Price</span>
          <span>Actions</span>
        </div>

        {filteredStocks.length === 0 ? (
          <div className="empty-state">
            {stocks.length === 0
              ? 'No stocks in portfolio. Add one above to get started!'
              : 'No stocks match your filters'}
          </div>
        ) : (
          filteredStocks.map(stock => (
            <StockRow
              key={stock.ticker}
              stock={stock}
              onDelete={onDelete}
              onEditNotes={onEditNotes}
            />
          ))
        )}
      </div>
    </>
  );
}

export default StockTable;
