import React from 'react';

function ConfidenceBadge({ confidence }) {
  if (confidence === null || confidence === undefined) {
    return <span className="confidence-badge">N/A</span>;
  }

  let tier, color, showWarning;

  if (confidence > 0.40) {
    tier = 'High';
    color = '#4ade80';
    showWarning = false;
  } else if (confidence >= 0.20) {
    tier = 'Medium';
    color = '#fbbf24';
    showWarning = false;
  } else {
    tier = 'Low';
    color = '#f87171';
    showWarning = true;
  }

  return (
    <span className="confidence-badge" style={{ color }}>
      {showWarning && '⚠️ '}
      {(confidence * 100).toFixed(0)}%
      <span className="confidence-tier"> ({tier})</span>
    </span>
  );
}

export default ConfidenceBadge;
