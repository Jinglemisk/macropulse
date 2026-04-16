import React, { useId } from 'react';
import { cx } from '../utils/classes';

const baseField = cx(
  'h-7 px-2 bg-bg border border-line text-text font-mono text-[12px]',
  'focus:border-accent focus:outline-none placeholder:text-muted/60'
);

function FilterControls({ filters, setFilters, stocks, searchInputRef }) {
  const sectors = [...new Set(stocks.map((s) => s.sector).filter(Boolean))].sort();
  const baseId = useId();

  const update = (patch) => setFilters({ ...filters, ...patch });
  const reset = () => setFilters({
    search: '', class: 'all', confidence: 'all', sector: 'all',
    sortBy: 'ticker', sortOrder: 'asc'
  });

  const isDefault =
    !filters.search && filters.class === 'all' && filters.confidence === 'all' &&
    filters.sector === 'all' && filters.sortBy === 'ticker' && filters.sortOrder === 'asc';

  return (
    <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
      <Field id={`${baseId}-search`} label="SEARCH" wide>
        <input
          ref={searchInputRef}
          id={`${baseId}-search`}
          type="search"
          placeholder="ticker · company · sector  ( / )"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className={cx(baseField, 'min-w-[260px]')}
        />
      </Field>

      <Field id={`${baseId}-class`} label="CLASS">
        <select
          id={`${baseId}-class`}
          value={filters.class}
          onChange={(e) => update({ class: e.target.value })}
          className={baseField}
        >
          <option value="all">·  ALL</option>
          <option value="A">A · Defensive</option>
          <option value="B">B · Steady</option>
          <option value="C">C · Growth</option>
          <option value="D">D · Hyper</option>
        </select>
      </Field>

      <Field id={`${baseId}-conf`} label="CONFIDENCE">
        <select
          id={`${baseId}-conf`}
          value={filters.confidence}
          onChange={(e) => update({ confidence: e.target.value })}
          className={baseField}
        >
          <option value="all">·  ALL</option>
          <option value="high">HIGH  &gt;40%</option>
          <option value="medium">MED 20–40%</option>
          <option value="low">LOW  &lt;20%</option>
        </select>
      </Field>

      <Field id={`${baseId}-sector`} label="SECTOR">
        <select
          id={`${baseId}-sector`}
          value={filters.sector}
          onChange={(e) => update({ sector: e.target.value })}
          className={baseField}
        >
          <option value="all">·  ALL</option>
          {sectors.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </Field>

      <Field id={`${baseId}-sortBy`} label="SORT">
        <select
          id={`${baseId}-sortBy`}
          value={filters.sortBy}
          onChange={(e) => update({ sortBy: e.target.value })}
          className={baseField}
        >
          <option value="ticker">TICKER</option>
          <option value="class">CLASS</option>
          <option value="confidence">CONF</option>
          <option value="price">PRICE</option>
          <option value="sector">SECTOR</option>
        </select>
      </Field>

      <button
        type="button"
        onClick={() =>
          update({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })
        }
        className={cx(baseField, 'inline-flex items-center justify-center px-2 hover:border-accent/60')}
        title={`Order: ${filters.sortOrder.toUpperCase()}`}
      >
        {filters.sortOrder === 'asc' ? '▲ ASC' : '▼ DESC'}
      </button>

      <div className="flex-1" />

      {!isDefault && (
        <button
          type="button"
          onClick={reset}
          className="h-7 px-2 text-muted hover:text-down border border-transparent hover:border-down/40 smallcaps-tight"
        >
          [ RESET ]
        </button>
      )}
    </div>
  );
}

function Field({ id, label, wide, children }) {
  return (
    <label htmlFor={id} className={cx('flex flex-col gap-1', wide && 'flex-1 min-w-[260px]')}>
      <span className="smallcaps-tight text-muted">{label}</span>
      {children}
    </label>
  );
}

export default FilterControls;
