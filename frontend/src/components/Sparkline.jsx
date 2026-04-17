import React, { useMemo } from 'react';
import { cx } from '../utils/classes';

// Tiny SVG polyline. Renders a dim "—" when there's no data.
function Sparkline({ points, width = 64, height = 16, strokeWidth = 1.25 }) {
  const data = Array.isArray(points) ? points.filter((n) => Number.isFinite(n)) : [];

  const { path, colorClass, deltaPct } = useMemo(() => {
    if (data.length < 2) return { path: '', colorClass: 'text-muted', deltaPct: null };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = (width - 2) / (data.length - 1);
    const yFor = (v) => height - 1 - ((v - min) / range) * (height - 2);
    const d = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${(1 + i * stepX).toFixed(2)},${yFor(v).toFixed(2)}`).join(' ');
    const first = data[0];
    const last  = data[data.length - 1];
    const delta = ((last - first) / first) * 100;
    return {
      path: d,
      colorClass: last >= first ? 'text-up' : 'text-down',
      deltaPct: delta
    };
  }, [data, width, height]);

  if (data.length < 2) {
    return <span className="font-mono text-muted text-[11px] tabular">—</span>;
  }

  return (
    <span className={cx('inline-flex items-center gap-1.5 font-mono', colorClass)} title={`${deltaPct?.toFixed(2)}%`}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <path d={path} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="square" strokeLinejoin="miter" />
      </svg>
      {deltaPct != null && (
        <span className="tabular text-[10px] opacity-90">
          {deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(1)}%
        </span>
      )}
    </span>
  );
}

export default Sparkline;
