import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

// Persist column order, hidden set, and sort state per table id.
export function useColumnLayout(tableId, defaultColumns) {
  const key = `macropulse:cols:${tableId}`;
  const defaults = {
    order:   defaultColumns.map((c) => c.id),
    hidden:  [],
    sortBy:  defaultColumns[0]?.id || null,
    sortOrder: 'asc'
  };

  const [layout, setLayout] = useLocalStorage(key, defaults);

  // Heal layout when default columns change (added/removed in code).
  const ids = defaultColumns.map((c) => c.id);
  const order = (layout.order || []).filter((id) => ids.includes(id));
  for (const id of ids) if (!order.includes(id)) order.push(id);
  const hidden = (layout.hidden || []).filter((id) => ids.includes(id));

  const columns = order
    .map((id) => defaultColumns.find((c) => c.id === id))
    .filter(Boolean)
    .map((c) => ({ ...c, hidden: hidden.includes(c.id) }));

  const setSort = useCallback((id) => {
    setLayout((l) => {
      if (l.sortBy === id) {
        return { ...l, sortOrder: l.sortOrder === 'asc' ? 'desc' : 'asc' };
      }
      return { ...l, sortBy: id, sortOrder: 'asc' };
    });
  }, [setLayout]);

  const reorder = useCallback((fromId, toId) => {
    setLayout((l) => {
      const o = (l.order && l.order.length ? l.order : ids).slice();
      const fromIdx = o.indexOf(fromId);
      const toIdx   = o.indexOf(toId);
      if (fromIdx < 0 || toIdx < 0) return l;
      o.splice(fromIdx, 1);
      o.splice(toIdx, 0, fromId);
      return { ...l, order: o };
    });
  }, [setLayout, ids]);

  const toggleHidden = useCallback((id) => {
    setLayout((l) => {
      const set = new Set(l.hidden || []);
      if (set.has(id)) set.delete(id); else set.add(id);
      return { ...l, hidden: Array.from(set) };
    });
  }, [setLayout]);

  const reset = useCallback(() => setLayout(defaults), [setLayout, defaults]);

  return {
    columns,
    sortBy: layout.sortBy || defaults.sortBy,
    sortOrder: layout.sortOrder || 'asc',
    setSort,
    reorder,
    toggleHidden,
    reset
  };
}
