import React from 'react';
import { cx } from '../utils/classes';

function tierFor(c) {
  if (c == null) return null;
  if (c > 0.40) return { tier: 'HI', color: 'text-up',   warn: false };
  if (c >= 0.20) return { tier: 'MD', color: 'text-warn', warn: false };
  return { tier: 'LO', color: 'text-down', warn: true };
}

function ConfidenceBadge({ confidence }) {
  if (confidence == null) {
    return <span className="font-mono tabular text-muted">—</span>;
  }
  const t = tierFor(confidence);
  return (
    <span className={cx('font-mono tabular inline-flex items-baseline gap-1', t.color)}>
      {t.warn && <span className="text-[10px]">▲</span>}
      <span className="text-[13px]">{(confidence * 100).toFixed(0)}<span className="text-muted">%</span></span>
      <span className="smallcaps-tight text-[9px] opacity-70">{t.tier}</span>
    </span>
  );
}

export default ConfidenceBadge;
