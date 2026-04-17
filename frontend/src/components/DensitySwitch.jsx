import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from './ThemeProvider';
import { cx } from '../utils/classes';

// Single-button density dropdown. Keeps the Bloomberg-terminal vibe with a
// glyph + short label, but collapses the old three-button row into one pill.
const OPTIONS = [
  { id: 'compact',     label: 'CMPCT', glyph: '▔', desc: 'Tight rows'     },
  { id: 'normal',      label: 'NORM',  glyph: '─', desc: 'Default spacing' },
  { id: 'comfortable', label: 'CMFT',  glyph: '▁', desc: 'Roomy rows'     }
];

function DensitySwitch() {
  const { density, setDensity } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = OPTIONS.find((o) => o.id === density) || OPTIONS[1];

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
        title={`Density · ${current.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cx(
          'inline-flex items-center gap-1.5 h-7 w-[88px] px-2 justify-between',
          'border border-line hover:border-accent/60 bg-surf/60 text-text text-[11px] smallcaps-tight'
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="text-muted">{current.glyph}</span>
          {current.label}
        </span>
        <span className={cx('text-muted text-[9px] transition-transform', open && 'rotate-180')}>▾</span>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1 z-50 w-[160px] bg-bg border border-line shadow-[0_0_0_1px_rgb(var(--bg))]"
        >
          {OPTIONS.map((opt) => {
            const active = density === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => { setDensity(opt.id); setOpen(false); }}
                className={cx(
                  'w-full text-left px-2 py-1.5 text-[11px] font-mono flex items-center gap-2 hover:bg-surf',
                  active ? 'text-accent' : 'text-text'
                )}
              >
                <span className={cx('w-2 h-2 inline-block', active ? 'bg-accent' : 'bg-muted/40')} aria-hidden />
                <span className="smallcaps-tight">{opt.label}</span>
                <span className="ml-auto text-muted text-[10px]">{opt.glyph}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DensitySwitch;
