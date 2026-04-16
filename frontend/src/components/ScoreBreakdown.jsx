import React from 'react';
import { cx, classBg, classText } from '../utils/classes';

function ScoreBreakdown({ scores, finalClass }) {
  if (!scores) return null;
  return (
    <div className="font-mono text-[12px]">
      <div className="smallcaps-tight text-muted mb-2">CLASSIFICATION SCORES</div>
      <div className="space-y-1">
        {['A', 'B', 'C', 'D'].map((cls) => {
          const v = scores[cls] ?? 0;
          const pct = Math.max(0, Math.min(100, v * 100));
          const selected = cls === finalClass;
          return (
            <div key={cls} className="grid grid-cols-[24px_1fr_60px_70px] items-center gap-2">
              <span className={cx('text-[14px] font-bold', classText[cls] || 'text-text')}>{cls}</span>
              <div className="h-3 bg-surf border border-line/70 relative">
                <div
                  className={cx('absolute inset-y-0 left-0', classBg[cls] || 'bg-text', 'opacity-80')}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="tabular text-text text-right">{v.toFixed(2)}</span>
              {selected ? (
                <span className="text-accent smallcaps-tight">◀ SELECTED</span>
              ) : <span />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ScoreBreakdown;
