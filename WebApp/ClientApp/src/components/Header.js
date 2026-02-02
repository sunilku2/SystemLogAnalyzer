import React from 'react';
import './Header.css';

function Header({ config }) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">�</span>
            <h1 className="logo-text">Device Fleet Monitor</h1>
          </div>
          <span className="tagline">Employee Device Management & Monitoring</span>
        </div>
        
        <div className="header-right">
          {config && (
            <div className="config-info">
              <div className="config-item">
                <span className="config-label">AI Engine:</span>
                <span className="config-value">
                  {config.llm_enabled ? (
                    <>
                      <span className="status-dot status-active"></span>
                      {config.llm_provider} ({config.llm_model})
                    </>
                  ) : (
                    <>
                      <span className="status-dot status-inactive"></span>
                      Pattern-Based
                    </>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
