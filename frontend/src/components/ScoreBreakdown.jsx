import React from 'react';
import { theme } from '../config/theme';

function ScoreBreakdown({ scores, finalClass }) {
  const classColors = theme.colors.classes;

  return (
    <div className="score-breakdown">
      <h4>Classification Scores</h4>
      {['A', 'B', 'C', 'D'].map(cls => (
        <div key={cls} className="score-row">
          <span className="class-label" style={{ color: classColors[cls] }}>
            {cls}
          </span>
          <div className="score-bar-container">
            <div
              className="score-bar"
              style={{
                width: `${scores[cls] * 100}%`,
                backgroundColor: classColors[cls]
              }}
            />
          </div>
          <span className="score-value">{scores[cls].toFixed(2)}</span>
          {cls === finalClass && <span className="selected-indicator">← Selected</span>}
        </div>
      ))}
    </div>
  );
}

export default ScoreBreakdown;
