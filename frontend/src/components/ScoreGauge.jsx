import React from 'react';
import { cx } from '../utils/classes';

// FPS/GPS gauge — terminal flat, marker triangle, ASCII rule labels.
function colorFor(label, value) {
  const isFps = label?.includes('FPS') || label?.toLowerCase().includes('pressure');
  if (isFps) {
    if (value >  0.5) return 'text-down';
    if (value >  0.2) return 'text-warn';
    if (value > -0.2) return 'text-muted';
    if (value > -0.5) return 'text-up';
    return 'text-up';
  } else {
    if (value >  0.5) return 'text-up';
    if (value >  0.2) return 'text-up';
    if (value > -0.2) return 'text-muted';
    if (value > -0.5) return 'text-warn';
    return 'text-down';
  }
}

function defaultInterp(label, value) {
  const isFps = label?.includes('FPS');
  if (isFps) {
    if (value >  0.5) return 'STRONG HAWKISH';
    if (value >  0.2) return 'MOD HAWKISH';
    if (value > -0.2) return 'NEUTRAL';
    if (value > -0.5) return 'MOD DOVISH';
    return 'STRONG DOVISH';
  }
  if (value >  0.5) return 'VERY STRONG';
  if (value >  0.2) return 'MOD GROWTH';
  if (value > -0.2) return 'NEUTRAL';
  if (value > -0.5) return 'WEAK';
  return 'RECESSIONARY';
}

function ScoreGauge({ label, value, min = -1, max = 1, interpretation }) {
  const pct = ((value - min) / (max - min)) * 100;
  const colorClass = colorFor(label, value);
  const bgClass = colorClass.replace('text-', 'bg-');
  const interp = interpretation || defaultInterp(label, value);

  return (
    <div className="font-mono">
      <div className="flex items-baseline justify-between mb-2">
        <span className="smallcaps-tight text-muted">{label}</span>
        <span className={cx('tabular text-[20px] leading-none font-bold', colorClass)}>
          {value > 0 ? '+' : ''}{value.toFixed(2)}
        </span>
      </div>

      <div className="relative h-2 bg-surf border border-line">
        {/* Zero center line */}
        <span className="absolute inset-y-0 left-1/2 w-px bg-line" />
        {/* Filled zone (origin = center, extends toward marker) */}
        <span
          className={cx('absolute inset-y-0', bgClass, 'opacity-30')}
          style={{
            left:  value < 0 ? `${pct}%` : '50%',
            right: value > 0 ? `${100 - pct}%` : '50%'
          }}
        />
        {/* Marker triangle */}
        <span
          className={cx('absolute -top-[5px]', colorClass)}
          style={{ left: `calc(${pct}% - 5px)` }}
          aria-hidden
        >
          <span className="block text-[12px] leading-none">▼</span>
        </span>
      </div>

      <div className="flex justify-between text-[10px] text-muted mt-1 font-mono">
        <span>{min}</span>
        <span>0</span>
        <span>+{max}</span>
      </div>

      <div className={cx('mt-1 text-[11px] smallcaps-tight', colorClass)}>{interp}</div>
    </div>
  );
}

export default ScoreGauge;
