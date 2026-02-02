import React from 'react';
import DataTable from './DataTable';

export default function LocationsView({ analysisResult, sessions }) {
  const columns = [
    { key: 'location', label: 'Location' },
    { key: 'devices', label: 'Devices' },
    { key: 'users', label: 'Employees' },
    { key: 'issues', label: 'Issues' },
  ];

  // Placeholder: no geo metadata in current dataset
  const rows = [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Device Locations</h2>
        <div className="btn-group">
          <button className="btn btn-secondary">Download CSV</button>
        </div>
      </div>

      <div style={{ height: 280, background: 'linear-gradient(135deg, #0e2a47 0%, #123a63 100%)', borderRadius: 12, margin: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bcd', fontWeight: 600 }}>
        Map placeholder — add geo enrichment to enable device location tracking
      </div>

      <DataTable columns={columns} rows={rows} />
    </div>
  );
}
