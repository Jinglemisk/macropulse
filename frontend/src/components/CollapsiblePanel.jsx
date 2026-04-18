import React, { useState } from 'react';
import { cx } from '../utils/classes';

// Panel variant whose body folds away. Same chapter-mark + bold-title
// header grammar as Panel so collapsed sections still read as proper
// chapter breaks. Used by Floor to demote MACRO ENGINE to a one-click
// expandable section.
function CollapsiblePanel({
  id,
  title,
  subtitle,
  defaultOpen = false,
  tone = 'default',
  children
}) {
  const [open, setOpen] = useState(defaultOpen);

  const toneBorder = {
    default: 'border-line',
    warn:    'border-warn/60',
    danger:  'border-down/60',
    accent:  'border-accent/60'
  }[tone] || 'border-line';

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
      className={cx('relative bg-surf/40 border-x border-t-2 border-b-2 border-double', toneBorder)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cx(
          'w-full flex items-center gap-3 px-3 py-2 border-b text-left',
          toneBorder,
          'bg-bg/60 hover:bg-bg/80 transition-colors'
        )}
      >
        <span className={cx('inline-block w-1 h-5 shrink-0', toneBlock)} aria-hidden />
        <span className="font-mono text-muted/70 text-[11px]">┌─</span>

        <span className={cx(
          'font-mono section-title whitespace-nowrap',
          toneTitle,
          'glow-text'
        )}>
          {title}
        </span>

        {subtitle && (
          <span className="smallcaps-tight text-muted truncate">— {subtitle}</span>
        )}

        <span className="flex-1 border-t border-line/40 mx-2" aria-hidden />
        <span className={cx(
          'text-muted text-[10px] transition-transform',
          open && 'rotate-90'
        )} aria-hidden>▸</span>
        <span className="smallcaps-tight text-muted text-[10px] whitespace-nowrap">
          {open ? 'HIDE' : 'EXPAND'}
        </span>
        <span className="font-mono text-muted/70 text-[11px]">─┐</span>
      </button>

      {open && (
        <div style={{ padding: 'var(--pad)' }}>
          {children}
        </div>
      )}
    </section>
  );
}

export default CollapsiblePanel;
