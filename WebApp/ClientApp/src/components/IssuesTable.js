import React, { useState } from 'react';
import './Components.css';

// Issues Table Component
export function IssuesTable({ issues }) {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('userCount');

  const filteredIssues = filter === 'all' 
    ? issues 
    : issues.filter(i => i.severity.toLowerCase() === filter);

  const sortedIssues = [...filteredIssues].sort((a, b) => {
    if (sortBy === 'userCount') return b.userCount - a.userCount;
    if (sortBy === 'occurrences') return b.occurrences - a.occurrences;
    return 0;
  });

  return (
    <div className="issues-table-container">
      <div className="page-header">
        <h2>⚠️ Issues List</h2>
        <p>Detailed view of all identified issues</p>
      </div>

      <div className="card">
        <div className="table-controls">
          <div className="filter-group">
            <label>Filter by Severity:</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="form-select">
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="form-select">
              <option value="userCount">User Count</option>
              <option value="occurrences">Occurrences</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="issues-table">
            <thead>
              <tr>
                <th>Issue ID</th>
                <th>Category</th>
                <th>Severity</th>
                <th>Description</th>
                <th>Users</th>
                <th>Occurrences</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedIssues.map(issue => (
                <tr key={issue.issueId}>
                  <td><code>{issue.issueId}</code></td>
                  <td>{issue.category}</td>
                  <td>
                    <span className={`badge badge-${issue.severity.toLowerCase()}`}>
                      {issue.severity}
                    </span>
                  </td>
                  <td className="description-cell">{issue.description}</td>
                  <td><strong>{issue.userCount}</strong></td>
                  <td>{issue.occurrences}</td>
                  <td>
                    <button className="btn-icon" title="View Details">👁️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedIssues.length === 0 && (
          <div className="empty-state-small">
            <p>No issues found matching the selected filter</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Analytics Component
export function Analytics({ analysisResult }) {
  if (!analysisResult) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📈</div>
        <h2>No Analytics Available</h2>
        <p>Run an analysis to see detailed analytics</p>
      </div>
    );
  }

  const { issues, analysis, statistics } = analysisResult;

  const userImpact = {};
  issues.forEach(issue => {
    issue.affectedUsers.forEach(user => {
      userImpact[user] = (userImpact[user] || 0) + issue.occurrences;
    });
  });

  const topUsers = Object.entries(userImpact)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="analytics-container">
      <div className="page-header">
        <h2>📈 Analytics Dashboard</h2>
        <p>Detailed insights and trends from log analysis</p>
      </div>

      <div className="grid grid-cols-3">
        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <div className="stat-value">
              {issues.length > 0 ? Math.round(analysis.total_logs_processed / issues.length) : 0}
            </div>
            <div className="stat-label">Avg Events per Issue</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-value">
              {analysis.total_users_analyzed > 0 
                ? (issues.length / analysis.total_users_analyzed).toFixed(1) 
                : 0}
            </div>
            <div className="stat-label">Issues per User</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{Object.keys(statistics.by_category).length}</div>
            <div className="stat-label">Unique Categories</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Category Distribution</h3>
          </div>
          <div className="chart-container">
            {Object.entries(statistics.by_category).map(([category, count]) => {
              const percentage = (count / issues.length) * 100;
              return (
                <div key={category} className="bar-chart-item">
                  <div className="bar-label">{category}</div>
                  <div className="bar-wrapper">
                    <div className="bar-fill" style={{ width: `${percentage}%` }}></div>
                  </div>
                  <div className="bar-value">{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Top Affected Users</h3>
          </div>
          <div className="user-list">
            {topUsers.map(([user, count], index) => (
              <div key={user} className="user-item">
                <div className="user-rank">#{index + 1}</div>
                <div className="user-info">
                  <div className="user-name">{user}</div>
                  <div className="user-count">{count} events</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Severity Trend</h3>
        </div>
        <div className="severity-chart">
          {['critical', 'error', 'warning', 'information'].map(severity => {
            const count = statistics.by_severity[severity] || 0;
            const total = Object.values(statistics.by_severity).reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? (count / total) * 100 : 0;

            return count > 0 && (
              <div key={severity} className="severity-bar">
                <div className="severity-info">
                  <span className={`badge badge-${severity}`}>{severity.toUpperCase()}</span>
                  <span className="severity-percentage">{percentage.toFixed(1)}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className={`progress-fill progress-${severity}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="severity-count">{count} issues</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const ExportedComponents = { IssuesTable, Analytics };
export default ExportedComponents;
