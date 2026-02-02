import React, { useMemo } from 'react';
import DataTable from './DataTable';

export default function AppStabilityView({ analysisResult }) {
  const rows = useMemo(() => {
    const byApp = new Map();
    (analysisResult?.issues || []).forEach(i => {
      if ((i.category || '').toLowerCase().includes('application')) {
        // Try to infer app name from description or pattern (best-effort)
        const key = i.pattern || i.description || 'Application';
        const v = byApp.get(key) || { app: key, issues: 0, occurrences: 0 };
        v.issues += 1;
        v.occurrences += i.occurrences || 0;
        byApp.set(key, v);
      }
    });
    return [...byApp.values()];
  }, [analysisResult]);

  const columns = [
    { key: 'app', label: 'App/Source' },
    { key: 'issues', label: 'Issues' },
    { key: 'occurrences', label: 'Occurrences' },
  ];

  return (
    <div>
      <h2>Application Stability</h2>
      <div className="trends-grid" style={{ marginTop: 12 }}>
        <div className="trend-card">
          <div className="trend-title">Crashes Over Time</div>
          <div className="trend-chart-placeholder">Line Chart</div>
        </div>
        <div className="trend-card">
          <div className="trend-title">Top Unstable Apps</div>
          <div style={{ padding: 12 }}>
            <DataTable columns={columns} rows={rows} initialSort={{ key: 'occurrences', direction: 'desc' }} />
          </div>
        </div>
        <div className="trend-card">
          <div className="trend-title">App Hangs</div>
          <div className="trend-chart-placeholder">Bar Chart</div>
        </div>
      </div>
    </div>
  );
}
