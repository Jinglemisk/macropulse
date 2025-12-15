import React, { useState } from 'react';
import '../styles/SideMenu.css';

function SideMenu() {
  const [hoveredItem, setHoveredItem] = useState(null);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const menuItems = [
    {
      id: 'home',
      label: 'Home',
      description: 'Dashboard overview showing current macro regime, Fed policy stance, and key metrics at a glance.',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    },
    {
      id: 'advice',
      label: 'Advice',
      description: 'Recommended portfolio allocation across Classes A-D based on Fed Pressure Score (FPS) and Growth Pulse Score (GPS).',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      )
    },
    {
      id: 'macro',
      label: 'Macro',
      description: 'Live macroeconomic indicators including unemployment, CPI, payrolls, and consumer confidence that drive allocation signals.',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="20" x2="12" y2="10" />
          <line x1="18" y1="20" x2="18" y2="4" />
          <line x1="6" y1="20" x2="6" y2="16" />
        </svg>
      )
    },
    {
      id: 'stocks',
      label: 'Stocks',
      description: 'Your portfolio of classified stocks (A/B/C/D) with confidence scores, fundamentals, and investment notes.',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      )
    }
  ];

  return (
    <nav className="side-menu">
      {menuItems.map((item) => (
        <div
          key={item.id}
          className="side-menu-item-wrapper"
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <button
            className="side-menu-item"
            onClick={() => scrollToSection(item.id)}
          >
            <span className="side-menu-icon">{item.icon}</span>
            <span className="side-menu-label">{item.label}</span>
          </button>

          {hoveredItem === item.id && (
            <div className="side-menu-tooltip">
              <div className="tooltip-title">{item.label}</div>
              <div className="tooltip-description">{item.description}</div>
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

export default SideMenu;
