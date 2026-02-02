import React, { useMemo } from 'react';
import DataTable from './DataTable';

export default function DevicesView({ sessions, analysisResult }) {
  const rows = useMemo(() => {
    if (!sessions?.sessions) return [];
    // Aggregate per system
    const map = new Map();
    sessions.sessions.forEach(s => {
      const k = s.systemName;
      const v = map.get(k) || { systemName: k, users: new Set(), sessions: 0, lastSeen: null };
      v.users.add(s.userId);
      v.sessions += 1;
      const t = new Date(s.sessionTimestamp);
      if (!v.lastSeen || t > v.lastSeen) v.lastSeen = t;
      map.set(k, v);
    });

    const issuesBySystem = new Map();
    (analysisResult?.issues || []).forEach(i => {
      (i.affectedSystems || []).forEach(sys => {
        const c = issuesBySystem.get(sys) || 0;
        issuesBySystem.set(sys, c + 1);
      });
    });

    return [...map.values()].map(v => ({
      systemName: v.systemName,
      users: v.users.size,
      sessions: v.sessions,
      issues: issuesBySystem.get(v.systemName) || 0,
      lastSeen: v.lastSeen ? v.lastSeen.toLocaleString() : '—'
    }));
  }, [sessions, analysisResult]);

  const columns = [
    { key: 'systemName', label: 'Device' },
    { key: 'users', label: 'Employees' },
    { key: 'sessions', label: 'Sessions' },
    { key: 'issues', label: 'Issues' },
    { key: 'lastSeen', label: 'Last Seen' },
  ];

  return (
    <div>
      <h2>Device Fleet</h2>
      <DataTable columns={columns} rows={rows} initialSort={{ key: 'issues', direction: 'desc' }} />
    </div>
  );
}
