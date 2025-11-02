import React from 'react';

function FilterControls({ filters, setFilters, stocks }) {
  // Get unique sectors
  const sectors = [...new Set(stocks.map(s => s.sector).filter(Boolean))].sort();

  return (
    <div className="filter-controls">
      <div className="filter-group">
        <label>Class</label>
        <select
          value={filters.class}
          onChange={(e) => setFilters({ ...filters, class: e.target.value })}
        >
          <option value="all">All Classes</option>
          <option value="A">Class A</option>
          <option value="B">Class B</option>
          <option value="C">Class C</option>
          <option value="D">Class D</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Confidence</label>
        <select
          value={filters.confidence}
          onChange={(e) => setFilters({ ...filters, confidence: e.target.value })}
        >
          <option value="all">All</option>
          <option value="high">High (&gt;40%)</option>
          <option value="medium">Medium (20-40%)</option>
          <option value="low">Low (&lt;20%)</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Sector</label>
        <select
          value={filters.sector}
          onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
        >
          <option value="all">All Sectors</option>
          {sectors.map(sector => (
            <option key={sector} value={sector}>{sector}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>Sort By</label>
        <select
          value={filters.sortBy}
          onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
        >
          <option value="ticker">Ticker</option>
          <option value="class">Class</option>
          <option value="confidence">Confidence</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Order</label>
        <select
          value={filters.sortOrder}
          onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value })}
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>
    </div>
  );
}

export default FilterControls;
