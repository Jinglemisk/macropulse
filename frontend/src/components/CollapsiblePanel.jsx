import React, { useState } from 'react';
import { cx } from '../utils/classes';

// Panel variant whose body folds away. Same corner-bracket header as Panel
// so it visually nests with the rest of the terminal grammar, but the
// header doubles as a toggle button. Used by Floor to demote MACRO ENGINE
// to a one-click expandable section.
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

  return (
    <section
      id={id}
      className={cx('relative bg-surf/40 border-x border-b-2 border-double', toneBorder)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cx(
          'w-full flex items-center gap-3 px-3 py-1.5 border-y text-left',
          toneBorder,
          'hover:bg-surf/70 transition-colors'
        )}
      >
        <span className="font-mono text-muted">┌─</span>
        <span className="smallcaps text-text whitespace-nowrap">{title}</span>
        {subtitle && (
          <span className="text-muted text-[11px] font-mono truncate">— {subtitle}</span>
        )}
        <span className="flex-1 border-t border-line/60 mx-2" aria-hidden />
        <span className={cx(
          'text-muted text-[10px] transition-transform',
          open && 'rotate-90'
        )} aria-hidden>▸</span>
        <span className="smallcaps-tight text-muted text-[10px] whitespace-nowrap">
          {open ? 'HIDE' : 'EXPAND'}
        </span>
        <span className="font-mono text-muted">─┐</span>
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
