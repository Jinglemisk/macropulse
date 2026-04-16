import React from 'react';
import { cx } from '../utils/classes';

function InterpretationPanel({ messages = [] }) {
  if (!messages || messages.length === 0) return null;

  const warnings = messages.filter((m) => m.includes('⚠️') || m.includes('[!]'));
  const regular  = messages.filter((m) => !warnings.includes(m));

  return (
    <div className="font-sans text-[13px] space-y-3">
      {regular.length > 0 && (
        <ul className="space-y-1.5">
          {regular.map((m, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-accent font-mono mt-0.5">&gt;</span>
              <span className="text-text leading-relaxed">{m}</span>
            </li>
          ))}
        </ul>
      )}

      {warnings.length > 0 && (
        <div className={cx('border border-warn/40 bg-warn/5 p-3')}>
          <div className="smallcaps-tight text-warn mb-1.5 font-mono">[!] WARNINGS</div>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-warn text-[13px]">
                <span className="font-mono mt-0.5">▲</span>
                <span className="leading-relaxed">{w.replace(/⚠️/g, '').replace(/\[!\]/g, '').trim()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default InterpretationPanel;
