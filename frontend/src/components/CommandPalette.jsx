import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cx } from '../utils/classes';

// Slash commands.
const COMMANDS = [
  { id: 'refresh',    name: '/refresh',         hint: 'Refresh quotes · details · macro' },
  { id: 'theme',      name: '/theme <id>',      hint: 'Switch palette: phosphor · amber · slate · paper' },
  { id: 'density',    name: '/density <x>',     hint: 'compact · normal · comfortable' },
  { id: 'goto',       name: '/goto <section>',  hint: 'home · advice · macro · holdings' },
  { id: 'delete',     name: '/delete <ticker>', hint: 'Remove a ticker after confirm' }
];

function fuzzyMatch(input, candidate) {
  if (!input) return true;
  const i = input.toLowerCase();
  const c = candidate.toLowerCase();
  let pos = 0;
  for (const ch of i) {
    const idx = c.indexOf(ch, pos);
    if (idx === -1) return false;
    pos = idx + 1;
  }
  return true;
}

function CommandPalette({ open, onClose, tickers = [], handlers = {} }) {
  const [q, setQ] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) { setQ(''); setActiveIdx(0); setTimeout(() => inputRef.current?.focus(), 10); }
  }, [open]);

  // Build suggestion list based on current input.
  const suggestions = useMemo(() => {
    const text = q.trim();

    // Slash command resolver — explicit branch.
    if (text.startsWith('/')) {
      const [head, ...rest] = text.slice(1).split(/\s+/);
      const arg = rest.join(' ').trim();

      if (head === 'theme') {
        const ids = ['phosphor', 'amber', 'slate', 'paper'];
        return ids
          .filter((id) => fuzzyMatch(arg, id))
          .map((id) => ({ kind: 'exec', label: `/theme ${id}`, hint: 'Switch palette', run: () => handlers.setTheme?.(id) }));
      }
      if (head === 'density') {
        const ids = ['compact', 'normal', 'comfortable'];
        return ids
          .filter((id) => fuzzyMatch(arg, id))
          .map((id) => ({ kind: 'exec', label: `/density ${id}`, hint: 'Set density', run: () => handlers.setDensity?.(id) }));
      }
      if (head === 'goto') {
        const ids = ['home', 'advice', 'macro', 'holdings'];
        return ids
          .filter((id) => fuzzyMatch(arg, id))
          .map((id) => ({ kind: 'exec', label: `/goto ${id}`, hint: 'Jump to section', run: () => handlers.goto?.(id) }));
      }
      if (head === 'delete') {
        return tickers
          .filter((tk) => fuzzyMatch(arg, tk))
          .map((tk) => ({ kind: 'exec', label: `/delete ${tk}`, hint: 'Remove ticker', run: () => {
            if (window.confirm(`Delete ${tk}?`)) handlers.deleteStock?.(tk);
          }}));
      }
      if (head === 'refresh') {
        return [{ kind: 'exec', label: '/refresh', hint: 'Refresh dashboard', run: () => handlers.refresh?.() }];
      }
      return COMMANDS
        .filter((c) => fuzzyMatch(text.slice(1), c.name.slice(1)))
        .map((c) => ({ kind: 'cmd', label: c.name, hint: c.hint, run: () => setQ(c.name.split(' ')[0] + ' ') }));
    }

    // Bare text — first try ticker add (uppercase, 1-6 chars), then jump-to existing.
    const upper = text.toUpperCase();
    const looksLikeTicker = /^[A-Z]{1,6}$/.test(upper);
    const matches = tickers.filter((tk) => fuzzyMatch(upper, tk));
    const out = [];

    if (looksLikeTicker && !tickers.includes(upper)) {
      out.push({
        kind: 'exec',
        label: `+ ADD ${upper}`,
        hint: 'Add ticker to portfolio',
        run: () => handlers.addStock?.(upper)
      });
    }
    matches.forEach((tk) => out.push({
      kind: 'exec',
      label: `▸ ${tk}`,
      hint: 'Scroll to row',
      run: () => handlers.jumpTo?.(tk)
    }));
    // Slash command suggestions if user typed nothing.
    if (text === '') {
      COMMANDS.forEach((c) => out.push({
        kind: 'cmd', label: c.name, hint: c.hint,
        run: () => setQ(c.name.split(' ')[0] + ' ')
      }));
    }
    return out;
  }, [q, tickers, handlers]);

  // Keyboard nav.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(suggestions.length - 1, i + 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
      if (e.key === 'Enter') {
        e.preventDefault();
        const s = suggestions[activeIdx];
        if (!s) return;
        s.run?.();
        if (s.kind !== 'cmd') onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, suggestions, activeIdx, onClose]);

  useEffect(() => { setActiveIdx(0); }, [q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-bg/85 backdrop-blur-sm flex items-start justify-center pt-[12vh]" onClick={onClose}>
      <div
        className={cx(
          'w-[min(640px,92vw)] bg-bg border border-accent/60',
          'shadow-[0_0_0_1px_rgb(var(--bg))]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 h-8 border-b border-line bg-surf/40">
          <span className="font-mono text-accent">⌘K</span>
          <span className="smallcaps-tight text-muted">COMMAND</span>
          <span className="flex-1 border-t border-line/60 mx-2" />
          <span className="font-mono text-muted text-[10px]">↑↓ select · ↵ run · ESC close</span>
        </div>

        <div className="px-3 py-2 border-b border-line">
          <div className="flex items-center gap-2 font-mono text-[14px]">
            <span className="text-accent">›</span>
            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ticker · /command · ⏎"
              className="flex-1 bg-transparent text-text placeholder:text-muted/60 focus:outline-none uppercase"
              autoComplete="off"
              spellCheck="false"
            />
            <span className="text-accent blink" aria-hidden />
          </div>
        </div>

        <ul className="max-h-[44vh] overflow-auto">
          {suggestions.length === 0 && (
            <li className="px-3 py-3 text-muted text-[12px] font-mono">no matches</li>
          )}
          {suggestions.map((s, i) => (
            <li
              key={`${s.label}-${i}`}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => { s.run?.(); if (s.kind !== 'cmd') onClose(); }}
              className={cx(
                'px-3 py-1.5 flex items-center gap-3 font-mono text-[12px] cursor-pointer',
                i === activeIdx ? 'bg-accent/10 text-accent' : 'text-text hover:bg-surf/40'
              )}
            >
              <span className={cx('w-2 h-2', i === activeIdx ? 'bg-accent' : 'bg-muted/30')} aria-hidden />
              <span className="flex-1 truncate">{s.label}</span>
              <span className="text-muted text-[10px]">{s.hint}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default CommandPalette;
