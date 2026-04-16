import React, { useState } from 'react';
import { useTheme } from './ThemeProvider';
import { cx } from '../utils/classes';

function ThemeSwitch() {
  const { themes, activeThemeId, setTheme, cycleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ids = Object.keys(themes);
  const current = themes[activeThemeId];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={cycleTheme}
        onContextMenu={(e) => { e.preventDefault(); setOpen((o) => !o); }}
        title="Click to cycle themes · Right-click to choose"
        className="px-2 h-7 inline-flex items-center gap-1.5 border border-line hover:border-accent/60 bg-surf/60 text-text text-[11px] smallcaps-tight"
      >
        <span className="w-2 h-2 inline-block bg-accent" aria-hidden />
        {current?.label || activeThemeId}
        <span
          className="text-muted ml-1 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        >▾</span>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-bg border border-line shadow-[0_0_0_1px_rgb(var(--bg))]"
          onMouseLeave={() => setOpen(false)}
        >
          {ids.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => { setTheme(id); setOpen(false); }}
              className={cx(
                'w-full text-left px-2 py-1.5 text-[12px] font-mono flex items-center gap-2 hover:bg-surf',
                id === activeThemeId ? 'text-accent' : 'text-text'
              )}
            >
              <span className={cx('w-2 h-2', id === activeThemeId ? 'bg-accent' : 'bg-muted/40')} aria-hidden />
              {themes[id].label}
              {id === activeThemeId && <span className="ml-auto text-muted text-[10px]">●</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ThemeSwitch;
