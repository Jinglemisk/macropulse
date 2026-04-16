import { useCallback, useEffect, useState } from 'react';

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const set = useCallback((next) => {
    setValue((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        /* quota or disabled storage — ignore */
      }
      return resolved;
    });
  }, [key]);

  // Sync across tabs.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== key) return;
      try { setValue(e.newValue !== null ? JSON.parse(e.newValue) : initialValue); }
      catch { /* noop */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, initialValue]);

  return [value, set];
}
