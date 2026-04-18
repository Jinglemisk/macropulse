import React from 'react';
import { cx, classBg, classBgSoft, classBorderSoft, classText } from '../utils/classes';

// Compact one-row allocation: stacked bar + four small pills underneath.
// Floor's allocation pane lives below the holdings table and shouldn't
// steal vertical space — this is the trimmed-down sibling of AllocationChart.

const CLASS_NAMES = { A: 'Defensive', B: 'Steady', C: 'Growth', D: 'Hyper' };

function AllocationStrip({ allocation }) {
  if (!allocation) return null;
  return (
    <div className="font-mono">
      <div className="flex h-6 border border-line bg-surf">
        {['A', 'B', 'C', 'D'].map((cls) => {
          const v = allocation[cls] || 0;
          if (v === 0) return null;
          return (
            <div
              key={cls}
              className={cx(classBg[cls], 'relative flex items-center justify-center text-bg overflow-hidden')}
              style={{ width: `${v}%` }}
              title={`Class ${cls} · ${v.toFixed(1)}%`}
            >
              {v >= 8 && (
                <span className="text-[10px] tabular font-bold tracking-tight">
                  {cls} {v.toFixed(0)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-1.5">
        {['A', 'B', 'C', 'D'].map((cls) => (
          <div
            key={cls}
            className={cx(
              'flex items-center gap-2 px-2 py-1 border text-[11px]',
              classBgSoft[cls],
              classBorderSoft[cls]
            )}
          >
            <span className={cx(
              'w-3.5 h-3.5 inline-flex items-center justify-center text-bg font-bold text-[10px] shrink-0',
              classBg[cls]
            )}>{cls}</span>
            <span className="text-text truncate">{CLASS_NAMES[cls]}</span>
            <span className={cx('ml-auto tabular font-bold', classText[cls])}>
              {(allocation[cls] || 0).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AllocationStrip;
