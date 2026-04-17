import React, { useMemo, useRef, useState, useEffect } from 'react';
import StockRow from './StockRow';
import FilterControls from './FilterControls';
import ColumnHeader from './ColumnHeader';
import AddStockForm from './AddStockForm';
import Panel from './Panel';
import { useColumnLayout } from '../hooks/useColumnLayout';
import { cx } from '../utils/classes';

const DEFAULT_COLUMNS = [
  { id: 'ticker',     label: 'TICKER',     width: '88px',  sortable: true,  align: 'left'   },
  { id: 'company',    label: 'COMPANY',    width: 'auto',  sortable: false, align: 'left'   },
  { id: 'sector',     label: 'SECTOR',     width: '140px', sortable: true,  align: 'left'   },
  { id: 'class',      label: 'CL',         width: '50px',  sortable: true,  align: 'center' },
  { id: 'confidence', label: 'CONF',       width: '90px',  sortable: true,  align: 'right'  },
  { id: 'price',      label: 'PRICE',      width: '100px', sortable: true,  align: 'right'  },
  { id: 'spark',      label: 'TREND 30d',  width: '110px', sortable: false, align: 'left'   },
  { id: 'actions',    label: '',           width: '60px',  sortable: false, align: 'right'  }
];

// Outer Panel-aware sortable, filterable, draggable holdings table.
function StockTable({
  stocks,
  onDelete,
  onEditNotes,
  macroRefresh,
  onAdd,
  adding,
  registerSearchInput,
  registerRowScroll
}) {
  const [filters, setFilters] = useState({
    search: '', class: 'all', confidence: 'all', sector: 'all',
    sortBy: 'ticker', sortOrder: 'asc'
  });

  const { columns, sortBy, sortOrder, setSort, reorder } = useColumnLayout('holdings', DEFAULT_COLUMNS);

  // Sync the explicit filter sort dropdown with column-header sort.
  useEffect(() => {
    setFilters((f) => (f.sortBy === sortBy && f.sortOrder === sortOrder ? f : { ...f, sortBy, sortOrder }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortOrder]);

  const filteredStocks = useMemo(() => {
    let result = [...stocks];

    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter((s) =>
        s.ticker.toLowerCase().includes(q) ||
        s.companyName?.toLowerCase().includes(q) ||
        s.sector?.toLowerCase().includes(q)
      );
    }

    if (filters.class !== 'all') {
      result = result.filter((s) => s.classification?.class === filters.class);
    }

    if (filters.confidence === 'high')   result = result.filter((s) => s.classification?.confidence > 0.40);
    if (filters.confidence === 'medium') result = result.filter((s) => s.classification?.confidence >= 0.20 && s.classification?.confidence <= 0.40);
    if (filters.confidence === 'low')    result = result.filter((s) => s.classification?.confidence < 0.20);

    if (filters.sector !== 'all') {
      result = result.filter((s) => s.sector === filters.sector);
    }

    const cmpFor = (id) => {
      switch (id) {
        case 'ticker':     return (a, b) => (a.ticker > b.ticker ? 1 : -1);
        case 'class':      return (a, b) => ((a.classification?.class || 'Z') > (b.classification?.class || 'Z') ? 1 : -1);
        case 'confidence': return (a, b) => ((a.classification?.confidence || 0) - (b.classification?.confidence || 0));
        case 'price':      return (a, b) => ((a.fundamentals?.latestPrice || 0) - (b.fundamentals?.latestPrice || 0));
        case 'sector':     return (a, b) => ((a.sector || 'ZZ') > (b.sector || 'ZZ') ? 1 : -1);
        default:           return () => 0;
      }
    };

    const cmp = cmpFor(filters.sortBy);
    result.sort((a, b) => filters.sortOrder === 'asc' ? cmp(a, b) : -cmp(a, b));

    return result;
  }, [stocks, filters]);

  // Hide sparkline column entirely if no stock has any price history yet.
  const anyHistory = stocks.some((s) => Array.isArray(s.priceHistory) && s.priceHistory.filter((n) => Number.isFinite(n)).length >= 2);
  const visibleColumns = columns.map((c) => (c.id === 'spark' && !anyHistory ? { ...c, hidden: true } : c));
  const visibleColCount = visibleColumns.filter((c) => !c.hidden).length;

  // Imperative scroll target registration so DataHealthStrip and the command
  // palette can jump to a row by ticker.
  const rowRefs = useRef(new Map());
  useEffect(() => {
    if (!registerRowScroll) return;
    registerRowScroll((ticker) => {
      const el = rowRefs.current.get(ticker);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.outline = '1px solid rgb(var(--accent))';
        setTimeout(() => { if (el) el.style.outline = ''; }, 1400);
      }
    });
  }, [registerRowScroll]);

  const searchRef = useRef(null);
  useEffect(() => {
    if (registerSearchInput) registerSearchInput(searchRef);
  }, [registerSearchInput]);

  const visibleCount = filteredStocks.length;
  const totalCount = stocks.length;

  return (
    <Panel
      id="holdings"
      title="HOLDINGS"
      tooltip="Your tracked stocks classified A/B/C/D with confidence scores. Click a row to expand fundamentals, scores, and notes. Drag column headers to reorder; click them to sort."
      subtitle={`${visibleCount}${visibleCount !== totalCount ? `/${totalCount}` : ''} STOCKS`}
      actions={
        <AddStockForm onAdd={onAdd} loading={adding} compact />
      }
    >
      <FilterControls
        filters={filters}
        setFilters={setFilters}
        stocks={stocks}
        searchInputRef={searchRef}
      />

      <div className="mt-3 border border-line bg-bg/60 max-h-[68vh] overflow-auto">
        <table className="w-full border-collapse text-[12px] font-mono">
          <thead>
            <tr>
              {visibleColumns.filter((c) => !c.hidden).map((c) => (
                <ColumnHeader
                  key={c.id}
                  id={c.id}
                  label={c.label}
                  width={c.width}
                  sortable={c.sortable}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  align={c.align}
                  onSort={setSort}
                  onReorder={reorder}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredStocks.length === 0 ? (
              <tr>
                <td colSpan={visibleColCount} className="text-center py-10 text-muted italic">
                  {totalCount === 0
                    ? '> No tickers tracked. Press ⌘K or use [+ TKR] above to add one.'
                    : '> No stocks match the current filters.'}
                </td>
              </tr>
            ) : (
              filteredStocks.map((stock) => (
                <StockRow
                  key={stock.ticker}
                  stock={stock}
                  columns={visibleColumns}
                  onDelete={onDelete}
                  onEditNotes={onEditNotes}
                  macroRefresh={macroRefresh}
                  scrollRef={(el) => {
                    if (el) rowRefs.current.set(stock.ticker, el);
                    else rowRefs.current.delete(stock.ticker);
                  }}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={cx('mt-2 flex items-center justify-between text-[10px] text-muted font-mono')}>
        <span>{visibleCount === totalCount ? `${totalCount} TICKERS` : `SHOWING ${visibleCount} OF ${totalCount}`}</span>
        <span className="opacity-60">DRAG HEADERS · CLICK TO SORT</span>
      </div>
    </Panel>
  );
}

export default StockTable;
