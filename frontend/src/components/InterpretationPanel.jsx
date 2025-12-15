/**
 * ✅ FPS/GPS Enhancement: Interpretation Panel Component
 *
 * Displays regime interpretation messages and warnings
 * in an easy-to-read format
 */

import React from 'react';
import '../styles/InterpretationPanel.css';
import SectionTitle from './SectionTitle';

function InterpretationPanel({ messages }) {
  if (!messages || messages.length === 0) {
    return null;
  }

  // Separate warnings from regular messages
  const warnings = messages.filter(msg => msg.includes('⚠️'));
  const regularMessages = messages.filter(msg => !msg.includes('⚠️'));

  return (
    <div className="interpretation-panel">
      <SectionTitle
        title="Regime Interpretation"
        description="Summary of current macro conditions and how FPS/GPS scores are influencing the recommended allocation strategy."
        tag="h3"
        className="panel-title-wrapper"
      />

      {/* Regular Messages */}
      <div className="messages-list">
        {regularMessages.map((message, index) => (
          <div key={index} className="message-item">
            <span className="message-bullet">▸</span>
            <span className="message-text">{message}</span>
          </div>
        ))}
      </div>

      {/* Warnings (if any) */}
      {warnings.length > 0 && (
        <div className="warnings-section">
          <h4 className="warnings-title">Warnings</h4>
          <div className="warnings-list">
            {warnings.map((warning, index) => (
              <div key={index} className="warning-item">
                <span className="warning-icon">⚠️</span>
                <span className="warning-text">
                  {warning.replace('⚠️', '').trim()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default InterpretationPanel;
