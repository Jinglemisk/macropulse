import React, { useState } from 'react';
import { cx } from '../utils/classes';

// Bloomberg-terminal section shell.
//   ┌▮ TITLE ─────────────────────────── ? ── meta ──┐
//   │ children                                       │
//   └────────────────────────────────────────────────┘
//
// The header has a solid colored "chapter mark" on the left, a darker tab
// background, and a beefed-up uppercase title so each panel announces its
// own start instead of bleeding into the next one. Tone tints the marker
// and the top rule (default/warn/danger/accent).
//
// Props:
//   id        — anchor id (for in-page jumps)
//   title     — uppercase string (renders in mono, bold, large caps)
//   subtitle  — optional muted line beside the title
//   tooltip   — string, shown on (?) hover
//   actions   — React node, rendered right-aligned in the header
//   tone      — 'default' | 'warn' | 'danger' | 'accent' (chapter mark + rule tint)
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

  // Chapter-mark colors — solid blocks on the header's left edge so the
  // eye snaps to where each section starts.
  const toneBlock = {
    default: 'bg-accent',
    warn:    'bg-warn',
    danger:  'bg-down',
    accent:  'bg-accent'
  }[tone] || 'bg-accent';

  const toneTitle = {
    default: 'text-text',
    warn:    'text-warn',
    danger:  'text-down',
    accent:  'text-accent'
  }[tone] || 'text-text';

  return (
    <section
      id={id}
      className={cx(
        'relative bg-surf/40',
        // Thicker top edge gives every section an unmistakable "lid".
        'border-x border-t-2 border-b-2 border-double',
        toneBorder,
        className
      )}
    >
      {/* Header strip — darker than panel body, doubles as a tab marker. */}
      <header className={cx(
        'relative flex items-center gap-3 select-none',
        'border-b',
        toneBorder,
        'bg-bg/60 px-3 py-2'
      )}>
        {/* Solid chapter mark + corner glyph */}
        <span className={cx('inline-block w-1 h-5 shrink-0', toneBlock)} aria-hidden />
        <span className="font-mono text-muted/70 text-[11px]">┌─</span>

        <h2 className={cx(
          'font-mono section-title whitespace-nowrap',
          toneTitle,
          'glow-text'
        )}>
          {title}
        </h2>

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
          <span className="smallcaps-tight text-muted truncate">— {subtitle}</span>
        )}

        <span className="flex-1 border-t border-line/40 mx-2" aria-hidden />
        {actions && <div className="flex items-center gap-2">{actions}</div>}
        <span className="font-mono text-muted/70 text-[11px]">─┐</span>
      </header>

      <div
        style={{
          padding: compact
            ? 'var(--pad)'
            : 'calc(var(--pad) + 4px)'
        }}
      >
        {children}
      </div>
    </section>
  );
}

export default Panel;
