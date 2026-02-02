import React from 'react';
import DataTable from './DataTable';

export default function NetworkExperience({ analysisResult }) {
  const columns = [
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value' },
  ];
  const metrics = [
    { metric: 'Avg Latency (ms)', value: '—' },
    { metric: 'Packet Loss (%)', value: '—' },
    { metric: 'DNS Resolution (ms)', value: '—' },
  ];

  const topIssues = (analysisResult?.issues || []).filter(i => (i.category || '').toLowerCase().includes('network'));

  const issueCols = [
    { key: 'severity', label: 'Severity' },
    { key: 'description', label: 'Description' },
    { key: 'occurrences', label: 'Occurrences' },
  ];

  return (
    <div>
      <h2>Network Health</h2>
      <div className="trends-grid" style={{ marginTop: 12 }}>
        <div className="trend-card">
          <div className="trend-title">Key Metrics</div>
          <div style={{ padding: 12 }}>
            <DataTable columns={columns} rows={metrics} />
          </div>
        </div>
        <div className="trend-card">
          <div className="trend-title">Top Network Issues</div>
          <div style={{ padding: 12 }}>
            <DataTable columns={issueCols} rows={topIssues} initialSort={{ key: 'occurrences', direction: 'desc' }} />
          </div>
        </div>
        <div className="trend-card">
          <div className="trend-title">Throughput Trend</div>
          <div className="trend-chart-placeholder">Area Chart</div>
        </div>
      </div>
    </div>
  );
}
