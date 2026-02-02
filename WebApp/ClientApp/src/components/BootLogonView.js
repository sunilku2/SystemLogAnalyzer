import React from 'react';

export default function BootLogonView() {
  return (
    <div>
      <h2>Performance Metrics</h2>
      <div className="trends-grid" style={{ marginTop: 12 }}>
        <div className="trend-card">
          <div className="trend-title">Boot Time Analysis</div>
          <div className="trend-chart-placeholder">Phases: BIOS → OS → Services</div>
        </div>
        <div className="trend-card">
          <div className="trend-title">Logon Performance</div>
          <div className="trend-chart-placeholder">GPOs, Scripts, Profile</div>
        </div>
        <div className="trend-card">
          <div className="trend-title">Slow Contributors</div>
          <div className="trend-chart-placeholder">Top GPOs / Scripts</div>
        </div>
      </div>
      <div className="empty-state" style={{ marginTop: 12 }}>
        <div className="empty-icon">⚡</div>
        <h3>No performance telemetry yet</h3>
        <p>Ingest performance metrics to populate these charts</p>
      </div>
    </div>
  );
}
