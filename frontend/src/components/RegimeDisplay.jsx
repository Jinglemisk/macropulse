import React from 'react';
import { theme } from '../config/theme';
import { formatDate } from '../utils/formatting';

function RegimeDisplay({ regime, loading, error }) {
  if (loading) {
    return <div className="regime-banner loading">Loading regime data...</div>;
  }

  if (error) {
    return <div className="regime-banner error">Error loading regime: {error}</div>;
  }

  if (!regime) return null;

  const { regime: name, description, recommendation, metrics } = regime;

  const regimeColors = {
    'Most Liquid': theme.colors.regimes.mostLiquid,
    'Least Liquid': theme.colors.regimes.leastLiquid,
    'In Between (prefer B)': theme.colors.regimes.inBetweenB,
    'In Between (prefer C)': theme.colors.regimes.inBetweenC
  };

  return (
    <div
      className="regime-banner"
      style={{ borderLeftColor: regimeColors[name] }}
    >
      <div className="regime-main">
        <h2 className="regime-name">{name}</h2>
        <p className="regime-description">{description}</p>
      </div>

      <div className="regime-metrics">
        <div className="metric">
          <span className="metric-label">Fed Funds Rate</span>
          <span className="metric-value">{metrics.fedFundsRate.toFixed(2)}%</span>
        </div>
        <div className="metric">
          <span className="metric-label">Balance Sheet (12w)</span>
          <span className="metric-value">
            {metrics.balanceSheetIncreasing ? '↑' : '↓'}
            {Math.abs(metrics.balanceSheetChange12w).toFixed(1)}B
          </span>
        </div>
      </div>

      <div className="regime-recommendation">
        <strong>Strategy:</strong> {recommendation}
      </div>

      <div className="regime-timestamp">
        As of {formatDate(metrics.asOf)}
      </div>
    </div>
  );
}

export default RegimeDisplay;
