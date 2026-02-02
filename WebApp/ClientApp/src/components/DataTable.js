import React, { useMemo, useState } from 'react';
import './DataTable.css';

function sortRows(rows, sortKey, direction) {
  if (!sortKey) return rows;
  const m = [...rows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av === bv) return 0;
    if (av == null) return -1;
    if (bv == null) return 1;
    if (typeof av === 'number' && typeof bv === 'number') return av - bv;
    return String(av).localeCompare(String(bv));
  });
  return direction === 'desc' ? m.reverse() : m;
}

export default function DataTable({ columns, rows, initialSort, onRowClick }) {
  const [sortKey, setSortKey] = useState(initialSort?.key || '');
  const [direction, setDirection] = useState(initialSort?.direction || 'asc');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter(r => columns.some(c => String(r[c.key] ?? '').toLowerCase().includes(q)));
  }, [rows, query, columns]);

  const sorted = useMemo(() => sortRows(filtered, sortKey, direction), [filtered, sortKey, direction]);

  const onSort = (key) => {
    if (sortKey === key) {
      setDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setDirection('asc');
    }
  };

  return (
    <div className="dt">
      <div className="dt-toolbar">
        <input className="dt-search" placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="dt-wrapper">
        <table className="dt-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} onClick={() => onSort(col.key)}>
                  <span>{col.label}</span>
                  {sortKey === col.key && (
                    <span className={`dt-sort ${direction}`}>{direction === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, idx) => (
              <tr
                key={idx}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'dt-row-clickable' : ''}
              >
                {columns.map(col => (
                  <td key={col.key}>{col.render ? col.render(row[col.key], row) : row[col.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
