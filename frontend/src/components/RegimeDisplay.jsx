import React from 'react';
import { theme } from '../config/theme';
import { formatDate, formatDateTime } from '../utils/formatting';
import ScoreGauge from './ScoreGauge';
import IndicatorGrid from './IndicatorGrid';
import AllocationChart from './AllocationChart';
import InterpretationPanel from './InterpretationPanel';

function hasMacroWarning(refresh) {
  return ['warning', 'failed', 'never'].includes(refresh?.status || 'never');
}

function MacroRefreshNotice({ refresh }) {
  if (!refresh) {
    return null;
  }

  const statusClass = hasMacroWarning(refresh) ? 'warning' : 'success';

  return (
    <div className={`macro-refresh-notice ${statusClass}`}>
      <strong>Macro freshness:</strong> {refresh.message || refresh.status}
      {refresh.lastRefreshedAt && (
        <span> Last attempt: {formatDateTime(refresh.lastRefreshedAt)}.</span>
      )}
    </div>
  );
}

function RegimeDisplay({ regime, loading, error }) {
  if (loading) {
    return <div className="regime-banner loading">Loading regime data...</div>;
  }

  if (error) {
    return <div className="regime-banner error">Error loading regime: {error}</div>;
  }

  if (!regime) return null;

  if (regime.available === false) {
    return (
      <div className="regime-display-container">
        <div className="regime-banner error">
          <div className="regime-main">
            <h2 className="regime-name">Macro Regime Unavailable</h2>
            <p className="regime-description">{regime.error || 'Macro data is unavailable right now.'}</p>
          </div>
          <MacroRefreshNotice refresh={regime.refresh} />
        </div>
      </div>
    );
  }

  const isEnhanced = regime.scores && regime.allocation && regime.breakdown;
  const { regime: name, description, recommendation, metrics } = regime;

  const regimeColors = {
    'Most Liquid': theme.colors.regimes.mostLiquid,
    'Least Liquid': theme.colors.regimes.leastLiquid,
    'In Between (prefer B)': theme.colors.regimes.inBetweenB,
    'In Between (prefer C)': theme.colors.regimes.inBetweenC
  };

  return (
    <div className="regime-display-container">
      <div
        className="regime-banner"
        style={{ borderLeftColor: regimeColors[name] }}
      >
        <div className="regime-main">
          <h2 className="regime-name">{name}</h2>
          <p className="regime-description">{description}</p>
          {isEnhanced && regime.confidence && (
            <div className="regime-confidence">
              Confidence: {regime.confidence.overall}%
            </div>
          )}
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

      <MacroRefreshNotice refresh={regime.refresh} />

      {isEnhanced && (
        <>
          <div className="score-gauges-container">
            <ScoreGauge
              label="Fed Pressure Score (FPS)"
              value={regime.scores.fps}
              interpretation={regime.scores.fps_interpretation}
            />
            <ScoreGauge
              label="Growth Pulse Score (GPS)"
              value={regime.scores.gps}
              interpretation={regime.scores.gps_interpretation}
            />
          </div>

          <AllocationChart
            allocation={regime.allocation}
            allocationSteps={regime.allocation_steps}
          />

          <InterpretationPanel messages={regime.interpretation} />

          <IndicatorGrid
            fpsBreakdown={regime.breakdown.fps}
            gpsBreakdown={regime.breakdown.gps}
          />
        </>
      )}
    </div>
  );
}

export default RegimeDisplay;
