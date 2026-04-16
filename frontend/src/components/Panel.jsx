import React, { useState } from 'react';
import { cx } from '../utils/classes';

// Bloomberg-terminal section shell.
//   ┌── TITLE ──────────────────────── (?) ── meta ──┐
//   │ children                                       │
//   └────────────────────────────────────────────────┘
//
// The header uses ASCII corner glyphs drawn with flexbox + border lines,
// tooltip is a hover-triggered popover. Bottom rule is a hard double line.
//
// Props:
//   id        — anchor id (for in-page jumps)
//   title     — uppercase string (will be rendered in mono small caps)
//   subtitle  — optional muted line under title
//   tooltip   — string, shown on (?) hover
//   actions   — React node, rendered right-aligned in the header
//   tone      — 'default' | 'warn' | 'danger' | 'accent' (border tint)
//   compact   — drops vertical padding
//   className — extra classes for the wrapper
function Panel({
  id, title, subtitle, tooltip, actions, tone = 'default',
  compact = false, className, children
}) {
  const [hover, setHover] = useState(false);

  const toneBorder = {
    default: 'border-line',
    warn:    'border-warn/60',
    danger:  'border-down/60',
    accent:  'border-accent/60'
  }[tone] || 'border-line';

  return (
    <section
      id={id}
      className={cx(
        'relative bg-surf/40',
        'border-x border-b-2 border-double',
        toneBorder,
        className
      )}
    >
      {/* Header strip with corner brackets */}
      <header className={cx(
        'flex items-center gap-3 select-none',
        'border-t border-b',
        toneBorder,
        'px-3 py-1.5'
      )}>
        <span className="font-mono text-muted">┌─</span>
        <h2 className="smallcaps text-text whitespace-nowrap">{title}</h2>
        {tooltip && (
          <span
            className="relative inline-flex items-center"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
          >
            <button
              type="button"
              tabIndex={0}
              aria-label="Section info"
              className="text-muted hover:text-accent text-[10px] leading-none border border-line/60 w-3.5 h-3.5 flex items-center justify-center"
            >?</button>
            {hover && (
              <span className="absolute left-5 top-0 z-50 w-72 bg-bg border border-accent/60 text-text text-[12px] font-sans p-2 shadow-[0_0_0_1px_rgb(var(--bg))]">
                {tooltip}
              </span>
            )}
          </span>
        )}
        {subtitle && (
          <span className="text-muted text-[11px] font-mono truncate">— {subtitle}</span>
        )}
        <span className="flex-1 border-t border-line/60 mx-2" aria-hidden />
        {actions && <div className="flex items-center gap-2">{actions}</div>}
        <span className="font-mono text-muted">─┐</span>
      </header>

      <div className={compact ? 'p-3' : 'p-4 md:p-5'}>
        {children}
      </div>
    </section>
  );
}

export default Panel;
