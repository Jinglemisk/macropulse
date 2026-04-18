import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from './ThemeProvider';
import { cx } from '../utils/classes';

// Glyphs picked to evoke each layout's spatial idea:
//   ▤ — three columns (Cockpit's left rail / center / right rail)
//   ▦ — quadrant grid (Panel's 2×2 panels)
//   ▥ — wide horizontal bands (Floor's holdings-dominant rows)
const OPTIONS = [
  { id: 'cockpit', label: 'COCKPIT', glyph: '▤' },
  { id: 'panel',   label: 'PANEL',   glyph: '▦' },
  { id: 'floor',   label: 'FLOOR',   glyph: '▥' }
];

function LayoutSwitch() {
  const { layout, setLayout } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = OPTIONS.find((o) => o.id === layout) || OPTIONS[1];

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey  = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={`Layout · ${current.label} (press d to cycle)`}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cx(
          'inline-flex items-center gap-1.5 h-7 w-[108px] px-2 justify-between',
          'border border-line hover:border-accent/60 bg-surf/60 text-text text-[11px] smallcaps-tight'
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="text-accent">{current.glyph}</span>
          {current.label}
        </span>
        <span className={cx('text-muted text-[9px] transition-transform', open && 'rotate-180')}>▾</span>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1 z-50 w-[140px] bg-bg border border-line shadow-[0_0_0_1px_rgb(var(--bg))]"
        >
          {OPTIONS.map((opt) => {
            const active = layout === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => { setLayout(opt.id); setOpen(false); }}
                className={cx(
                  'w-full text-left px-2 py-1.5 text-[11px] font-mono flex items-center gap-2 hover:bg-surf',
                  active ? 'text-accent' : 'text-text'
                )}
              >
                <span className={cx('w-2 h-2 inline-block', active ? 'bg-accent' : 'bg-muted/40')} aria-hidden />
                <span className={cx('text-[13px]', active ? 'text-accent' : 'text-muted')}>{opt.glyph}</span>
                <span className="smallcaps-tight">{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LayoutSwitch;
