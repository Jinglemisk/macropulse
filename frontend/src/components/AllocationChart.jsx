import React, { useState } from 'react';
import { cx, classBg, classText, classBorderSoft, classBgSoft } from '../utils/classes';

const CLASS_NAMES = {
  A: 'Defensive',
  B: 'Steady',
  C: 'Growth',
  D: 'Hyper'
};

function AllocationChart({ allocation, allocationSteps }) {
  const [showSteps, setShowSteps] = useState(false);
  const total = (allocation?.A || 0) + (allocation?.B || 0) + (allocation?.C || 0) + (allocation?.D || 0);

  return (
    <div className="font-mono">
      <div className="text-muted smallcaps-tight mb-2">RECOMMENDED ALLOCATION</div>

      {/* Stacked bar */}
      <div className="flex h-8 border border-line bg-surf">
        {['A', 'B', 'C', 'D'].map((cls) => {
          const v = allocation?.[cls] || 0;
          if (v === 0) return null;
          return (
            <div
              key={cls}
              className={cx(classBg[cls], 'relative flex items-center justify-center text-bg overflow-hidden')}
              style={{ width: `${v}%` }}
              title={`Class ${cls} · ${v.toFixed(1)}%`}
            >
              {v >= 10 && (
                <span className="text-[11px] tabular font-bold tracking-tight">
                  {cls} {v.toFixed(0)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Tick scale */}
      <div className="flex justify-between text-[10px] text-muted mt-1">
        <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
      </div>

      {/* Breakdown grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
        {['A', 'B', 'C', 'D'].map((cls) => (
          <div
            key={cls}
            className={cx(
              'border p-2 flex items-center justify-between',
              classBorderSoft[cls],
              classBgSoft[cls]
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cx('w-5 h-5 inline-flex items-center justify-center text-bg font-bold text-[12px]', classBg[cls])}>{cls}</span>
              <span className="text-text text-[12px]">{CLASS_NAMES[cls]}</span>
            </div>
            <span className={cx('tabular text-[14px] font-bold', classText[cls])}>
              {(allocation?.[cls] || 0).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {Math.abs(total - 100) > 0.1 && (
        <div className="mt-2 text-[11px] text-warn">
          [!] Total: {total.toFixed(1)}% (expected 100%)
        </div>
      )}

      {allocationSteps && allocationSteps.length > 1 && (
        <div className="mt-3 border-t border-line/60 pt-2">
          <button
            type="button"
            onClick={() => setShowSteps((s) => !s)}
            className="smallcaps-tight text-muted hover:text-accent inline-flex items-center gap-1"
          >
            <span className={cx('inline-block transition-transform', showSteps && 'rotate-90')}>▸</span>
            {showSteps ? 'HIDE' : 'VIEW'} CALCULATION STEPS
          </button>
          {showSteps && (
            <div className="mt-2 space-y-1 text-[11px]">
              {allocationSteps.map((step, i) => (
                <div key={i} className="border-l-2 border-line pl-2">
                  <span className="text-text">{step.step}</span>
                  {step.regime && <span className="text-muted"> · {step.regime}</span>}
                  {step.fps !== undefined && <span className="text-muted"> · FPS {step.fps.toFixed(2)}</span>}
                  {step.gps !== undefined && <span className="text-muted"> · GPS {step.gps.toFixed(2)}</span>}
                  <div className="text-muted tabular">
                    A {step.allocation.A.toFixed(1)} · B {step.allocation.B.toFixed(1)} · C {step.allocation.C.toFixed(1)} · D {step.allocation.D.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AllocationChart;
