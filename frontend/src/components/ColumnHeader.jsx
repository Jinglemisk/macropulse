import React from 'react';
import { cx } from '../utils/classes';

// Sortable + draggable column header.
// HTML5 drag-and-drop, scoped to the parent table's onReorder callback.
function ColumnHeader({
  id, label, width, sortable = true, sortBy, sortOrder, onSort, onReorder,
  align = 'left'
}) {
  const sorted = sortBy === id;
  const arrow = sorted ? (sortOrder === 'asc' ? '▲' : '▼') : '·';

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = (e) => {
    e.preventDefault();
    const from = e.dataTransfer.getData('text/plain');
    if (from && from !== id) onReorder?.(from, id);
  };

  return (
    <th
      style={{ width }}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cx(
        'px-2 py-1.5 select-none cursor-grab active:cursor-grabbing',
        'border-b border-line bg-bg/95 backdrop-blur-sm',
        'sticky top-0 z-10',
        'smallcaps-tight text-muted hover:text-accent',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center'
      )}
      title={`${label} · drag to reorder${sortable ? ' · click to sort' : ''}`}
    >
      <span
        className="inline-flex items-center gap-1"
        onClick={() => sortable && onSort?.(id)}
      >
        <span>{label}</span>
        {sortable && (
          <span className={cx('text-[10px]', sorted ? 'text-accent' : 'text-muted/40')}>{arrow}</span>
        )}
      </span>
    </th>
  );
}

export default ColumnHeader;
