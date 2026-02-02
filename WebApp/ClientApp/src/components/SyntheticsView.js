import React from 'react';
import DataTable from './DataTable';

export default function SyntheticsView() {
  const columns = [
    { key: 'test', label: 'Test' },
    { key: 'target', label: 'Target' },
    { key: 'status', label: 'Status' },
    { key: 'lastRun', label: 'Last Run' },
    { key: 'median', label: 'Median (ms)' },
  ];

  const rows = [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Synthetics</h2>
        <div className="btn-group">
          <button className="btn btn-primary">New Test</button>
          <button className="btn btn-secondary">Download CSV</button>
        </div>
      </div>
      <div className="empty-state" style={{ marginTop: 12 }}>
        <div className="empty-icon">🧪</div>
        <h2>No Synthetics Configured</h2>
        <p>Create HTTP/DNS/Port tests to monitor availability and latency</p>
      </div>
      <DataTable columns={columns} rows={rows} />
    </div>
  );
}
