import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTheme } from './ThemeProvider';

const Ctx = createContext(null);

const isEditable = (el) =>
  !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

export function KeyboardShortcutsProvider({
  onOpenPalette,
  onOpenShortcuts,
  onRefresh,
  onFocusSearch,
  jumps = {}, // { h: 'home', m: 'macro', a: 'advice', r: 'home' }
  children
}) {
  const { cycleTheme, cycleDensity } = useTheme();
  const [chord, setChord] = useState(null); // { key: 'g', expires: ts }
  const chordTimeout = useRef(null);

  const clearChord = useCallback(() => {
    setChord(null);
    if (chordTimeout.current) {
      clearTimeout(chordTimeout.current);
      chordTimeout.current = null;
    }
  }, []);

  useEffect(() => {
    function onKey(e) {
      const target = e.target;
      const editable = isEditable(target);

      // Cmd/Ctrl-K — palette (works even in inputs).
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        clearChord();
        onOpenPalette?.();
        return;
      }

      // Esc — emit a custom event so modals/palette can close themselves.
      if (e.key === 'Escape') {
        clearChord();
        // pass-through; handled by individual modal listeners
        return;
      }

      // Inputs swallow everything else.
      if (editable) return;

      // Help (?)
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        clearChord();
        onOpenShortcuts?.();
        return;
      }

      // Focus search (/)
      if (e.key === '/') {
        e.preventDefault();
        clearChord();
        onFocusSearch?.();
        return;
      }

      // Single-key actions
      if (!chord && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === 'r') { e.preventDefault(); onRefresh?.(); return; }
        if (e.key === 't') { e.preventDefault(); cycleTheme();    return; }
        if (e.key === 'd') { e.preventDefault(); cycleDensity();  return; }
      }

      // Chord init: 'g'
      if (!chord && e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setChord({ key: 'g' });
        if (chordTimeout.current) clearTimeout(chordTimeout.current);
        chordTimeout.current = setTimeout(clearChord, 1200);
        return;
      }

      // Chord resolution: 'g [hmar]'
      if (chord?.key === 'g') {
        const id = jumps[e.key];
        if (id) {
          e.preventDefault();
          const el = document.getElementById(id);
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        clearChord();
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chord, clearChord, cycleDensity, cycleTheme, jumps, onFocusSearch, onOpenPalette, onOpenShortcuts, onRefresh]);

  return (
    <Ctx.Provider value={{ chord }}>
      {children}
      {chord?.key && (
        <div className="fixed bottom-3 left-3 z-50 font-mono text-[11px] bg-bg border border-accent/60 px-2 py-1 text-accent smallcaps-tight pointer-events-none">
          CHORD · {chord.key.toUpperCase()} _
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useShortcutChord() {
  const ctx = useContext(Ctx);
  return ctx?.chord || null;
}
