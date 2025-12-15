import React, { useState } from 'react';
import '../styles/SectionTitle.css';

function SectionTitle({ title, description, tag = 'h2', className = '' }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const Tag = tag;

  return (
    <div
      className={`section-title-wrapper ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Tag className="section-title">
        {title}
        <span className="info-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </span>
      </Tag>

      {showTooltip && description && (
        <div className="section-tooltip">
          {description}
        </div>
      )}
    </div>
  );
}

export default SectionTitle;
