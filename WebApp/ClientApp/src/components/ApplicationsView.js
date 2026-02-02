import React, { useMemo } from 'react';
import DataTable from './DataTable';

export default function ApplicationsView({ analysisResult }) {
  const rows = useMemo(() => {
    // Infer apps from category or description keywords (placeholder)
    const map = new Map();
    (analysisResult?.issues || []).forEach(i => {
      const app = i.category || 'General';
      const v = map.get(app) || { app, issues: 0, occurrences: 0 };
      v.issues += 1;
      v.occurrences += i.occurrences || 0;
      map.set(app, v);
    });
    return [...map.values()];
  }, [analysisResult]);

  const columns = [
    { key: 'app', label: 'Software/Category' },
    { key: 'issues', label: 'Issues' },
    { key: 'occurrences', label: 'Occurrences' },
  ];

  return (
    <div>
      <h2>Software Inventory</h2>
      <DataTable columns={columns} rows={rows} initialSort={{ key: 'occurrences', direction: 'desc' }} />
    </div>
  );
}
