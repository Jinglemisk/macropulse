/**
 * ✅ FPS/GPS Enhancement: Allocation Chart Component
 *
 * Horizontal stacked bar chart showing allocation percentages
 * across Classes A, B, C, and D
 */

import React from 'react';
import '../styles/AllocationChart.css';
import SectionTitle from './SectionTitle';

function AllocationChart({ allocation, allocationSteps }) {
  // Class colors (same as theme)
  const classColors = {
    A: '#3b82f6',  // Blue
    B: '#10b981',  // Green
    C: '#f59e0b',  // Orange
    D: '#a855f7'   // Purple
  };

  // Calculate total for validation
  const total = allocation.A + allocation.B + allocation.C + allocation.D;

  return (
    <div id="advice" className="allocation-chart" style={{ scrollMarginTop: '20px' }}>
      <SectionTitle
        title="Recommended Allocation"
        description="Portfolio allocation across Classes A-D based on Fed Pressure Score (FPS) and Growth Pulse Score (GPS). Shifts dynamically with macro regime changes."
        tag="h3"
        className="chart-title-wrapper"
      />

      {/* Horizontal Stacked Bar */}
      <div className="allocation-bar-container">
        <div className="allocation-bar">
          {allocation.A > 0 && (
            <div
              className="allocation-segment"
              style={{
                width: `${allocation.A}%`,
                backgroundColor: classColors.A
              }}
              data-class="A"
              data-percent={allocation.A.toFixed(1)}
            >
              {allocation.A >= 10 && (
                <span className="segment-label">
                  A: {allocation.A.toFixed(1)}%
                </span>
              )}
            </div>
          )}

          {allocation.B > 0 && (
            <div
              className="allocation-segment"
              style={{
                width: `${allocation.B}%`,
                backgroundColor: classColors.B
              }}
              data-class="B"
              data-percent={allocation.B.toFixed(1)}
            >
              {allocation.B >= 10 && (
                <span className="segment-label">
                  B: {allocation.B.toFixed(1)}%
                </span>
              )}
            </div>
          )}

          {allocation.C > 0 && (
            <div
              className="allocation-segment"
              style={{
                width: `${allocation.C}%`,
                backgroundColor: classColors.C
              }}
              data-class="C"
              data-percent={allocation.C.toFixed(1)}
            >
              {allocation.C >= 10 && (
                <span className="segment-label">
                  C: {allocation.C.toFixed(1)}%
                </span>
              )}
            </div>
          )}

          {allocation.D > 0 && (
            <div
              className="allocation-segment"
              style={{
                width: `${allocation.D}%`,
                backgroundColor: classColors.D
              }}
              data-class="D"
              data-percent={allocation.D.toFixed(1)}
            >
              {allocation.D >= 10 && (
                <span className="segment-label">
                  D: {allocation.D.toFixed(1)}%
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Allocation Breakdown Grid */}
      <div className="allocation-grid">
        <div className="allocation-item">
          <div className="item-header">
            <span className="class-badge" style={{ backgroundColor: classColors.A }}>A</span>
            <span className="class-name">Stable/Defensive</span>
          </div>
          <span className="item-value">{allocation.A.toFixed(1)}%</span>
        </div>

        <div className="allocation-item">
          <div className="item-header">
            <span className="class-badge" style={{ backgroundColor: classColors.B }}>B</span>
            <span className="class-name">Steady Growth</span>
          </div>
          <span className="item-value">{allocation.B.toFixed(1)}%</span>
        </div>

        <div className="allocation-item">
          <div className="item-header">
            <span className="class-badge" style={{ backgroundColor: classColors.C }}>C</span>
            <span className="class-name">High Growth/Risk</span>
          </div>
          <span className="item-value">{allocation.C.toFixed(1)}%</span>
        </div>

        <div className="allocation-item">
          <div className="item-header">
            <span className="class-badge" style={{ backgroundColor: classColors.D }}>D</span>
            <span className="class-name">Hypergrowth</span>
          </div>
          <span className="item-value">{allocation.D.toFixed(1)}%</span>
        </div>
      </div>

      {/* Allocation Steps (if available) */}
      {allocationSteps && allocationSteps.length > 1 && (
        <details className="allocation-steps">
          <summary className="steps-summary">View Calculation Steps</summary>
          <div className="steps-content">
            {allocationSteps.map((step, index) => (
              <div key={index} className="step-item">
                <strong>{step.step}:</strong>
                {step.regime && ` ${step.regime}`}
                {step.fps !== undefined && ` (FPS: ${step.fps.toFixed(2)})`}
                {step.gps !== undefined && ` (GPS: ${step.gps.toFixed(2)})`}
                <div className="step-allocation">
                  A:{step.allocation.A.toFixed(1)}% |
                  B:{step.allocation.B.toFixed(1)}% |
                  C:{step.allocation.C.toFixed(1)}% |
                  D:{step.allocation.D.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Validation Warning */}
      {Math.abs(total - 100) > 0.1 && (
        <div className="allocation-warning">
          ⚠️ Total: {total.toFixed(1)}% (expected 100%)
        </div>
      )}
    </div>
  );
}

export default AllocationChart;
