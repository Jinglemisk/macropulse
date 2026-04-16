import React, { useMemo, useState } from 'react';
import StockRow from './StockRow';
import FilterControls from './FilterControls';
import SectionTitle from './SectionTitle';

function StockTable({
  stocks,
  onDelete,
  onEditNotes,
  macroRefresh
}) {
  const [filters, setFilters] = useState({
    search: '',
    class: 'all',
    confidence: 'all',
    sector: 'all',
    sortBy: 'ticker',
    sortOrder: 'asc'
  });

  const filteredStocks = useMemo(() => {
    let result = [...stocks];

    if (filters.search.trim()) {
      const query = filters.search.trim().toLowerCase();
      result = result.filter(stock =>
        stock.ticker.toLowerCase().includes(query) ||
        stock.companyName?.toLowerCase().includes(query) ||
        stock.sector?.toLowerCase().includes(query)
      );
    }

    if (filters.class !== 'all') {
      result = result.filter(stock => stock.classification?.class === filters.class);
    }

    if (filters.confidence === 'high') {
      result = result.filter(stock => stock.classification?.confidence > 0.40);
    } else if (filters.confidence === 'medium') {
      result = result.filter(stock => stock.classification?.confidence >= 0.20 && stock.classification?.confidence <= 0.40);
    } else if (filters.confidence === 'low') {
      result = result.filter(stock => stock.classification?.confidence < 0.20);
    }

    if (filters.sector !== 'all') {
      result = result.filter(stock => stock.sector === filters.sector);
    }

    result.sort((a, b) => {
      let aVal;
      let bVal;

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
      }

      return aVal < bVal ? 1 : -1;
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
            ({filteredStocks.length}{filteredStocks.length !== stocks.length ? ` of ${stocks.length}` : ''} stocks)
          </span>
        </div>
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
              macroRefresh={macroRefresh}
            />
          ))
        )}
      </div>
    </>
  );
}

export default StockTable;
