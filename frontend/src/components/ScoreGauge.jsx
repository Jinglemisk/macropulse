/**
 * ✅ FPS/GPS Enhancement: Score Gauge Component
 *
 * Visual gauge for displaying FPS/GPS scores (-1 to +1 range)
 * with color-coded interpretation
 */

import React from 'react';
import '../styles/ScoreGauge.css';

function ScoreGauge({ label, value, min = -1, max = 1, interpretation }) {
  // Calculate percentage for bar width (0-100)
  const percentage = ((value - min) / (max - min)) * 100;

  // Determine color based on value and score type
  const getColor = () => {
    if (label.includes('FPS') || label.includes('Fed Pressure')) {
      // FPS: Red = hawkish (+1), Green = dovish (-1)
      if (value > 0.5) return '#ef4444';  // Red - Strong hawkish
      if (value > 0.2) return '#f97316';  // Orange - Moderate hawkish
      if (value > -0.2) return '#64748b'; // Gray - Neutral
      if (value > -0.5) return '#10b981'; // Green - Moderate dovish
      return '#059669';                   // Dark green - Strong dovish
    } else {
      // GPS: Green = strong growth (+1), Red = recession (-1)
      if (value > 0.5) return '#10b981';  // Green - Very strong
      if (value > 0.2) return '#3b82f6';  // Blue - Moderate growth
      if (value > -0.2) return '#64748b'; // Gray - Neutral
      if (value > -0.5) return '#f97316'; // Orange - Weak
      return '#ef4444';                   // Red - Recessionary
    }
  };

  const color = getColor();

  // Get interpretation label
  const getLabel = () => {
    if (interpretation) return interpretation;

    if (label.includes('FPS')) {
      if (value > 0.5) return 'Strong Hawkish';
      if (value > 0.2) return 'Moderate Hawkish';
      if (value > -0.2) return 'Neutral';
      if (value > -0.5) return 'Moderate Dovish';
      return 'Strong Dovish';
    } else {
      if (value > 0.5) return 'Very Strong';
      if (value > 0.2) return 'Moderate Growth';
      if (value > -0.2) return 'Neutral';
      if (value > -0.5) return 'Weak Growth';
      return 'Recessionary';
    }
  };

  return (
    <div className="score-gauge">
      <div className="gauge-header">
        <span className="gauge-label">{label}</span>
        <span className="gauge-value" style={{ color }}>
          {value.toFixed(2)}
        </span>
      </div>

      <div className="gauge-bar-container">
        <div className="gauge-bar-bg">
          {/* Zero line marker */}
          <div className="gauge-zero-line" style={{ left: '50%' }} />

          {/* Filled portion */}
          <div
            className="gauge-bar-fill"
            style={{
              width: `${percentage}%`,
              backgroundColor: color,
              opacity: 0.8
            }}
          />

          {/* Current position marker */}
          <div
            className="gauge-marker"
            style={{
              left: `${percentage}%`,
              backgroundColor: color
            }}
          />
        </div>
      </div>

      <div className="gauge-scale">
        <span className="scale-label">{min}</span>
        <span className="scale-label">0</span>
        <span className="scale-label">{max}</span>
      </div>

      <div className="gauge-interpretation" style={{ color }}>
        {getLabel()}
      </div>
    </div>
  );
}

export default ScoreGauge;
