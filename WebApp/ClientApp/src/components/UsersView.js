import React, { useMemo } from 'react';
import DataTable from './DataTable';

export default function UsersView({ sessions, analysisResult }) {
  const rows = useMemo(() => {
    if (!sessions?.sessions) return [];
    const map = new Map();
    sessions.sessions.forEach(s => {
      const k = s.userId;
      const v = map.get(k) || { userId: k, systems: new Set(), sessions: 0, lastSeen: null };
      v.systems.add(s.systemName);
      v.sessions += 1;
      const t = new Date(s.sessionTimestamp);
      if (!v.lastSeen || t > v.lastSeen) v.lastSeen = t;
      map.set(k, v);
    });

    const issuesByUser = new Map();
    (analysisResult?.issues || []).forEach(i => {
      (i.affectedUsers || []).forEach(u => {
        const c = issuesByUser.get(u) || 0;
        issuesByUser.set(u, c + 1);
      });
    });

    return [...map.values()].map(v => ({
      userId: v.userId,
      systems: v.systems.size,
      sessions: v.sessions,
      issues: issuesByUser.get(v.userId) || 0,
      lastSeen: v.lastSeen ? v.lastSeen.toLocaleString() : '—'
    }));
  }, [sessions, analysisResult]);

  const columns = [
    { key: 'userId', label: 'Employee' },
    { key: 'systems', label: 'Devices' },
    { key: 'sessions', label: 'Sessions' },
    { key: 'issues', label: 'Issues' },
    { key: 'lastSeen', label: 'Last Seen' },
  ];

  return (
    <div>
      <h2>Employees & Their Devices</h2>
      <DataTable columns={columns} rows={rows} initialSort={{ key: 'issues', direction: 'desc' }} />
    </div>
  );
}
