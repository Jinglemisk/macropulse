import React, { useEffect, useRef, useState } from 'react';
import { cx } from '../utils/classes';

function NotesPanel({ ticker, notes, onSave, onClose }) {
  const [text, setText] = useState(notes || '');
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setText(notes || ''); }, [notes]);

  // Esc to close, Cmd+Enter to save.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => { ref.current?.focus(); }, []);

  async function save() {
    if (saving) return;
    setSaving(true);
    try { await onSave(ticker, text); onClose(); }
    catch (err) { console.error(err); alert('Failed to save notes'); }
    finally { setSaving(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-bg/85 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className={cx(
          'w-[min(640px,92vw)] max-h-[80vh] overflow-hidden flex flex-col',
          'bg-bg border border-accent/60 shadow-[0_0_0_1px_rgb(var(--bg))]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 h-8 border-b border-line bg-surf/40">
          <span className="font-mono text-muted">┌─</span>
          <span className="smallcaps-tight text-accent">NOTES // {ticker}</span>
          <span className="flex-1 border-t border-line/60 mx-2" />
          <span className="font-mono text-muted text-[10px]">⌘ ⏎ save · ESC close</span>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-text font-mono leading-none px-1"
            aria-label="Close"
          >×</button>
        </div>

        <div className="p-3 flex-1 overflow-auto">
          <textarea
            ref={ref}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`# Investment thesis\n- Why hold ${ticker}?\n- Catalysts to watch\n- Exit triggers`}
            className={cx(
              'w-full min-h-[260px] font-mono text-[12px] leading-relaxed',
              'bg-surf/40 border border-line text-text p-3 resize-y',
              'focus:border-accent focus:outline-none'
            )}
          />
        </div>

        <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-line bg-surf/40">
          <button
            type="button"
            onClick={onClose}
            className="h-7 px-3 border border-line text-muted hover:text-text smallcaps-tight"
          >CANCEL</button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="h-7 px-3 border border-accent/60 bg-accent/10 text-accent smallcaps-tight hover:bg-accent/20 disabled:opacity-50"
          >{saving ? 'SAVING…' : 'SAVE'}</button>
        </div>
      </div>
    </div>
  );
}

export default NotesPanel;
