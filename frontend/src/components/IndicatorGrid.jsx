/**
 * ✅ FPS/GPS Enhancement: Indicator Grid Component
 *
 * Displays all 13 macro indicators with current values,
 * classifications, and contributions to FPS/GPS scores
 */

import React from 'react';
import '../styles/IndicatorGrid.css';
import SectionTitle from './SectionTitle';

function IndicatorGrid({ fpsBreakdown, gpsBreakdown }) {
  // Format indicator name for display
  const formatIndicatorName = (name) => {
    const names = {
      unemployment: 'Unemployment Rate',
      jobless_claims: 'Jobless Claims',
      nonfarm_payrolls: 'Nonfarm Payrolls',
      cpi_yoy: 'CPI (YoY)',
      core_cpi_yoy: 'Core CPI (YoY)',
      ppi: 'PPI (MoM)',
      ism_manufacturing: 'ISM Manufacturing',
      ism_services: 'ISM Services',
      chicago_pmi: 'Chicago PMI',
      consumer_confidence: 'Consumer Confidence'
    };
    return names[name] || name;
  };

  // Format value based on indicator type
  const formatValue = (indicator, value) => {
    if (value === null || value === undefined) return 'N/A';

    // Percentages
    if (indicator.includes('yoy') || indicator.includes('ppi') || indicator === 'unemployment') {
      return `${value.toFixed(1)}%`;
    }

    // Large numbers (jobless claims, nonfarm payrolls)
    if (indicator === 'jobless_claims' || indicator === 'nonfarm_payrolls') {
      return (value / 1000).toFixed(0) + 'k';
    }

    // Indexes (ISM, confidence)
    return value.toFixed(1);
  };

  // Get classification badge color
  const getClassificationColor = (classification) => {
    switch (classification) {
      case 'High':
        return '#ef4444';
      case 'Low':
        return '#10b981';
      case 'Normal':
        return '#64748b';
      default:
        return '#6b7280';
    }
  };

  // Combine FPS and GPS breakdowns
  const allIndicators = new Map();

  fpsBreakdown.forEach(item => {
    allIndicators.set(item.indicator, {
      ...item,
      fps_weight: item.weight,
      fps_score: item.score,
      fps_contribution: item.contribution
    });
  });

  gpsBreakdown.forEach(item => {
    const existing = allIndicators.get(item.indicator) || {};
    allIndicators.set(item.indicator, {
      ...existing,
      ...item,
      gps_weight: item.weight,
      gps_score: item.score,
      gps_contribution: item.contribution
    });
  });

  const indicators = Array.from(allIndicators.values());

  return (
    <div id="macro" className="indicator-grid" style={{ scrollMarginTop: '20px' }}>
      <SectionTitle
        title="Macro Indicators"
        description="Live economic data including unemployment, CPI, payrolls, and consumer confidence. Each indicator is classified as High/Normal/Low to compute FPS and GPS scores."
        tag="h3"
        className="grid-title-wrapper"
      />

      <div className="grid-container">
        <table className="indicator-table">
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Value</th>
              <th>Classification</th>
              <th>FPS</th>
              <th>GPS</th>
            </tr>
          </thead>
          <tbody>
            {indicators.map((item, index) => (
              <tr key={index} className="indicator-row">
                <td className="indicator-name">
                  {formatIndicatorName(item.indicator)}
                </td>
                <td className="indicator-value">
                  {formatValue(item.indicator, item.value)}
                </td>
                <td className="indicator-classification">
                  <span
                    className="classification-badge"
                    style={{ backgroundColor: getClassificationColor(item.classification) }}
                  >
                    {item.classification || 'Unknown'}
                  </span>
                </td>
                <td className="indicator-score">
                  {item.fps_score !== null && item.fps_score !== undefined ? (
                    <div className="score-cell">
                      <span className={`score-value ${item.fps_score > 0 ? 'positive' : item.fps_score < 0 ? 'negative' : 'neutral'}`}>
                        {item.fps_score > 0 ? '+' : ''}{item.fps_score}
                      </span>
                      <span className="score-weight">
                        (×{item.fps_weight})
                      </span>
                    </div>
                  ) : (
                    <span className="score-na">—</span>
                  )}
                </td>
                <td className="indicator-score">
                  {item.gps_score !== null && item.gps_score !== undefined ? (
                    <div className="score-cell">
                      <span className={`score-value ${item.gps_score > 0 ? 'positive' : item.gps_score < 0 ? 'negative' : 'neutral'}`}>
                        {item.gps_score > 0 ? '+' : ''}{item.gps_score}
                      </span>
                      <span className="score-weight">
                        (×{item.gps_weight})
                      </span>
                    </div>
                  ) : (
                    <span className="score-na">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid-legend">
          <div className="legend-item">
            <span className="legend-badge" style={{ backgroundColor: '#10b981' }}>Low</span>
            <span className="legend-text">Below threshold</span>
          </div>
          <div className="legend-item">
            <span className="legend-badge" style={{ backgroundColor: '#64748b' }}>Normal</span>
            <span className="legend-text">Within range</span>
          </div>
          <div className="legend-item">
            <span className="legend-badge" style={{ backgroundColor: '#ef4444' }}>High</span>
            <span className="legend-text">Above threshold</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IndicatorGrid;
