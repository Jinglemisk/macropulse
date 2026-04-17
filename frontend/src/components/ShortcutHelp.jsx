import React, { useEffect } from 'react';
import { cx } from '../utils/classes';

const GROUPS = [
  {
    title: 'NAVIGATION',
    keys: [
      ['g h', 'Jump to home / regime'],
      ['g a', 'Jump to advice (allocation)'],
      ['g m', 'Jump to macro panel'],
      ['g s', 'Jump to holdings (stocks)']
    ]
  },
  {
    title: 'ACTIONS',
    keys: [
      ['⌘ K  /  Ctrl K', 'Open command palette'],
      ['r',   'Refresh dashboard'],
      ['/',   'Focus holdings search'],
      ['?',   'Toggle this help']
    ]
  },
  {
    title: 'PRESENTATION',
    keys: [
      ['t',   'Cycle theme preset'],
      ['d',   'Cycle density (compact / normal / comfortable)']
    ]
  },
  {
    title: 'COMMAND PALETTE',
    keys: [
      ['AAPL',     'Add ticker'],
      ['/refresh', 'Refresh all data'],
      ['/theme amber', 'Switch theme by id'],
      ['/density compact', 'Set density'],
      ['/goto holdings',   'Jump to section'],
      ['/delete AAPL',     'Remove a ticker']
    ]
  }
];

function ShortcutHelp({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape' || e.key === '?') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-bg/85 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <div
        className={cx(
          'w-[min(720px,92vw)] max-h-[80vh] overflow-auto',
          'bg-bg border border-accent/60'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 h-8 border-b border-line bg-surf/40">
          <span className="font-mono text-muted">┌─</span>
          <span className="smallcaps-tight text-accent">KEYBOARD SHORTCUTS</span>
          <span className="flex-1 border-t border-line/60 mx-2" />
          <button onClick={onClose} className="text-muted hover:text-text font-mono leading-none px-1">×</button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 font-mono text-[12px]">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="smallcaps-tight text-muted mb-2">{g.title}</div>
              <ul className="space-y-1.5">
                {g.keys.map(([k, label]) => (
                  <li key={k} className="flex items-baseline gap-3">
                    <kbd className="px-1.5 py-0.5 border border-line bg-surf/60 text-text whitespace-nowrap">{k}</kbd>
                    <span className="text-text">{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="px-3 py-2 border-t border-line bg-surf/40 text-muted text-[10px] font-mono">
          Press <kbd className="px-1 border border-line">?</kbd> or <kbd className="px-1 border border-line">ESC</kbd> to close.
        </div>
      </div>
    </div>
  );
}

export default ShortcutHelp;
