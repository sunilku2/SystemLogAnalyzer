import React, { useMemo, useState } from 'react';
import './ApplicationsView.css';

export default function ApplicationsView({ analysisResult }) {
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedMatrixCell, setSelectedMatrixCell] = useState(null); // { category, severity }
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('issues');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterHealth, setFilterHealth] = useState('all'); // 'all', 'critical', 'problematic'

  // Format date
  const formatDate = (dateValue) => {
    if (!dateValue) return 'No data';
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (isNaN(date.getTime())) return 'No data';
    return date.toLocaleString();
  };

  // Aggregate application data from issues
  const appMetrics = useMemo(() => {
    const map = new Map();
    (analysisResult?.issues || []).forEach(i => {
      const app = i.category || 'General';
      const v = map.get(app) || { 
        app, 
        issues: 0, 
        occurrences: 0,
        severity: { Critical: 0, Error: 0, Warning: 0, Information: 0 },
        affectedUsers: new Set(),
        affectedSystems: new Set(),
        issueDetails: []
      };
      v.issues += 1;
      v.occurrences += i.occurrences || 0;
      v.severity[i.severity] = (v.severity[i.severity] || 0) + 1;
      (i.affectedUsers || []).forEach(u => v.affectedUsers.add(u));
      (i.affectedSystems || []).forEach(s => v.affectedSystems.add(s));
      v.issueDetails.push({
        title: i.description,
        severity: i.severity,
        occurrences: i.occurrences,
        rootCause: i.rootCause,
        solution: i.solution
      });
      map.set(app, v);
    });

    return [...map.values()].map(v => ({
      app: v.app,
      issues: v.issues,
      occurrences: v.occurrences,
      severity: v.severity,
      affectedUsers: v.affectedUsers.size,
      affectedSystems: v.affectedSystems.size,
      health: v.severity.Critical > 0 ? 'Critical' : 
              v.severity.Error > 0 ? 'Poor' : 
              v.severity.Warning > 0 ? 'Fair' : 'Healthy',
      issueDetails: v.issueDetails
    }));
  }, [analysisResult]);

  // Filter and sort applications
  const filteredApps = useMemo(() => {
    let filtered = appMetrics.filter(app => {
      const matchesSearch = app.app.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesHealth = filterHealth === 'all' ? true :
                          filterHealth === 'critical' ? app.health === 'Critical' :
                          filterHealth === 'problematic' ? (app.health === 'Critical' || app.health === 'Poor') : true;
      return matchesSearch && matchesHealth;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'issues':
          comparison = a.issues - b.issues;
          break;
        case 'name':
          comparison = a.app.localeCompare(b.app);
          break;
        case 'occurrences':
          comparison = a.occurrences - b.occurrences;
          break;
        case 'users':
          comparison = a.affectedUsers - b.affectedUsers;
          break;
        case 'systems':
          comparison = a.affectedSystems - b.affectedSystems;
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [appMetrics, searchQuery, sortBy, sortOrder, filterHealth]);

  // Health statistics - 2D matrix: Category vs Severity
  const healthMatrix = useMemo(() => {
    const matrix = {};
    appMetrics.forEach(app => {
      if (!matrix[app.app]) {
        matrix[app.app] = { Critical: 0, Error: 0, Warning: 0, Information: 0 };
      }
      matrix[app.app].Critical += app.severity.Critical || 0;
      matrix[app.app].Error += app.severity.Error || 0;
      matrix[app.app].Warning += app.severity.Warning || 0;
      matrix[app.app].Information += app.severity.Information || 0;
    });
    return matrix;
  }, [appMetrics]);

  // Overall severity totals
  const severityTotals = useMemo(() => {
    return Object.values(healthMatrix).reduce((acc, category) => {
      acc.Critical += category.Critical || 0;
      acc.Error += category.Error || 0;
      acc.Warning += category.Warning || 0;
      acc.Information += category.Information || 0;
      return acc;
    }, { Critical: 0, Error: 0, Warning: 0, Information: 0 });
  }, [healthMatrix]);

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return '#dc2626';
      case 'Error': return '#ea580c';
      case 'Warning': return '#f59e0b';
      case 'Information': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  // Summary statistics
  const summaryStats = useMemo(() => {
    return {
      totalApps: appMetrics.length,
      totalIssues: appMetrics.reduce((sum, a) => sum + a.issues, 0),
      totalOccurrences: appMetrics.reduce((sum, a) => sum + a.occurrences, 0),
      affectedUsers: new Set(
        appMetrics.flatMap(app => 
          (analysisResult?.issues || [])
            .filter(i => i.category === app.app)
            .flatMap(i => i.affectedUsers || [])
        )
      ).size,
      criticalCount: appMetrics.filter(a => a.health === 'Critical').length
    };
  }, [appMetrics, analysisResult]);

  // Get filtered issues for matrix cell
  const getMatrixCellDetails = (category, severity) => {
    return (analysisResult?.issues || []).filter(issue => 
      issue.category === category && issue.severity === severity
    ).sort((a, b) => (b.occurrences || 0) - (a.occurrences || 0));
  };

  // Render matrix cell detail modal
  if (selectedMatrixCell) {
    const filteredIssues = getMatrixCellDetails(selectedMatrixCell.category, selectedMatrixCell.severity);
    
    return (
      <div className="matrix-detail-view">
        <button className="back-btn" onClick={() => setSelectedMatrixCell(null)}>
          ← Back to Matrix
        </button>

        <div className="matrix-detail-header">
          <div className="detail-title">
            <h2>{selectedMatrixCell.category}</h2>
            <span className="severity-badge" style={{ backgroundColor: getSeverityColor(selectedMatrixCell.severity) }}>
              {selectedMatrixCell.severity}
            </span>
          </div>
          <p className="detail-subtitle">
            {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''} found
          </p>
        </div>

        <div className="matrix-detail-content">
          {filteredIssues.length === 0 ? (
            <div className="empty-state">
              <p>No issues found for this combination</p>
            </div>
          ) : (
            <div className="issues-list">
              {filteredIssues.map((issue, idx) => (
                <div key={idx} className="matrix-issue-card">
                  <div className="issue-header">
                    <div className="issue-title">{issue.description}</div>
                    <span className="issue-count">×{issue.occurrences}</span>
                  </div>
                  <div className="issue-meta">
                    <span className="meta-item">👥 {issue.userCount} user{issue.userCount !== 1 ? 's' : ''}</span>
                    <span className="meta-item">🖥️ {(issue.affectedSystems || []).length} system{(issue.affectedSystems || []).length !== 1 ? 's' : ''}</span>
                  </div>
                  {issue.rootCause && (
                    <div className="issue-detail">
                      <strong>Root Cause:</strong> {issue.rootCause}
                    </div>
                  )}
                  {issue.solution && (
                    <div className="issue-detail">
                      <strong>Solution:</strong> {issue.solution}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Get health color
  const getHealthColor = (health) => {
    switch (health) {
      case 'Critical': return '#dc2626';
      case 'Poor': return '#ea580c';
      case 'Fair': return '#f59e0b';
      case 'Healthy': return '#10b981';
      default: return '#6b7280';
    }
  };

  // Get health icon
  const getHealthIcon = (health) => {
    switch (health) {
      case 'Critical': return '🛑';
      case 'Poor': return '🔴';
      case 'Fair': return '⚠️';
      case 'Healthy': return '✅';
      default: return '•';
    }
  };

  if (selectedApp) {
    return (
      <div className="app-detail-view">
        <button className="back-btn" onClick={() => setSelectedApp(null)}>
          ← Back to Inventory
        </button>

        {/* Header */}
        <div className="app-detail-header">
          <div className="app-identity">
            <div className="app-icon">📦</div>
            <div className="app-info">
              <h1>{selectedApp.app}</h1>
              <p className="app-type">Software Component</p>
            </div>
          </div>
          <div className="health-indicator">
            <span className="health-badge" style={{ borderColor: getHealthColor(selectedApp.health) }}>
              <span className="health-icon">{getHealthIcon(selectedApp.health)}</span>
              <span className="health-text">{selectedApp.health}</span>
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{selectedApp.issues}</div>
            <div className="stat-label">Total Issues</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{selectedApp.occurrences}</div>
            <div className="stat-label">Total Occurrences</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{selectedApp.affectedUsers}</div>
            <div className="stat-label">Affected Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{selectedApp.affectedSystems}</div>
            <div className="stat-label">Affected Systems</div>
          </div>
        </div>

        {/* Severity Breakdown */}
        <div className="severity-breakdown">
          <h3>Severity Breakdown</h3>
          <div className="severity-bars">
            {Object.entries(selectedApp.severity).map(([severity, count]) => (
              <div key={severity} className="severity-bar-item">
                <div className="severity-bar-label">{severity}</div>
                <div className="severity-bar-container">
                  <div 
                    className="severity-bar-fill" 
                    style={{ 
                      width: `${(count / Math.max(...Object.values(selectedApp.severity), 1)) * 100}%`,
                      backgroundColor: getHealthColor(severity === 'Critical' ? 'Critical' : 
                                                      severity === 'Error' ? 'Poor' : 
                                                      severity === 'Warning' ? 'Fair' : 'Healthy')
                    }}
                  ></div>
                </div>
                <div className="severity-bar-count">{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Issues List */}
        <div className="issues-section">
          <h3>Issues & Resolutions</h3>
          <div className="issues-list">
            {selectedApp.issueDetails.map((issue, idx) => (
              <div key={idx} className="issue-card">
                <div className="issue-header">
                  <span className="issue-severity" style={{ color: getHealthColor(issue.severity) }}>
                    {getHealthIcon(issue.severity)} {issue.severity}
                  </span>
                  <span className="issue-title">{issue.title}</span>
                </div>
                <div className="issue-details">
                  <div className="detail-row">
                    <span className="detail-label">🔍 Root Cause:</span>
                    <span className="detail-value">{issue.rootCause}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">✅ Solution:</span>
                    <span className="detail-value">{issue.solution}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">📊 Occurrences:</span>
                    <span className="detail-value">{issue.occurrences}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="applications-view">
      {/* Header */}
      <div className="view-header">
        <div className="header-content">
          <h2>📦 Software Inventory</h2>
          <p className="header-subtitle">Monitor application health, issues, and vulnerabilities</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon">📦</div>
          <div className="card-info">
            <div className="card-value">{summaryStats.totalApps}</div>
            <div className="card-label">Total Applications</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="card-icon">⚠️</div>
          <div className="card-info">
            <div className="card-value">{summaryStats.totalIssues}</div>
            <div className="card-label">Total Issues</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="card-icon">📊</div>
          <div className="card-info">
            <div className="card-value">{summaryStats.totalOccurrences}</div>
            <div className="card-label">Total Occurrences</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="card-icon">👥</div>
          <div className="card-info">
            <div className="card-value">{summaryStats.affectedUsers}</div>
            <div className="card-label">Affected Users</div>
          </div>
        </div>
        <div className="summary-card critical">
          <div className="card-icon">🛑</div>
          <div className="card-info">
            <div className="card-value">{summaryStats.criticalCount}</div>
            <div className="card-label">Critical Apps</div>
          </div>
        </div>
      </div>

      {/* Health Distribution - 2D Matrix */}
      <div className="health-distribution">
        <h3>Health Distribution - Category vs Issue Type</h3>
        <div className="health-matrix">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="severity-critical">🛑 Critical</th>
                <th className="severity-error">🔴 Error</th>
                <th className="severity-warning">⚠️ Warning</th>
                <th className="severity-info">ℹ️ Information</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(healthMatrix).map(([category, severities]) => {
                const rowTotal = severities.Critical + severities.Error + severities.Warning + severities.Information;
                return (
                  <tr key={category}>
                    <td className="category-name">{category}</td>
                    <td 
                      className="severity-cell critical clickable" 
                      onClick={() => severities.Critical > 0 && setSelectedMatrixCell({ category, severity: 'Critical' })}
                      style={{ cursor: severities.Critical > 0 ? 'pointer' : 'default' }}
                    >
                      {severities.Critical || '-'}
                    </td>
                    <td 
                      className="severity-cell error clickable" 
                      onClick={() => severities.Error > 0 && setSelectedMatrixCell({ category, severity: 'Error' })}
                      style={{ cursor: severities.Error > 0 ? 'pointer' : 'default' }}
                    >
                      {severities.Error || '-'}
                    </td>
                    <td 
                      className="severity-cell warning clickable" 
                      onClick={() => severities.Warning > 0 && setSelectedMatrixCell({ category, severity: 'Warning' })}
                      style={{ cursor: severities.Warning > 0 ? 'pointer' : 'default' }}
                    >
                      {severities.Warning || '-'}
                    </td>
                    <td 
                      className="severity-cell info clickable" 
                      onClick={() => severities.Information > 0 && setSelectedMatrixCell({ category, severity: 'Information' })}
                      style={{ cursor: severities.Information > 0 ? 'pointer' : 'default' }}
                    >
                      {severities.Information || '-'}
                    </td>
                    <td className="total-cell">{rowTotal}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td>Total</td>
                <td className="severity-cell critical">{severityTotals.Critical}</td>
                <td className="severity-cell error">{severityTotals.Error}</td>
                <td className="severity-cell warning">{severityTotals.Warning}</td>
                <td className="severity-cell info">{severityTotals.Information}</td>
                <td className="total-cell">
                  {severityTotals.Critical + severityTotals.Error + severityTotals.Warning + severityTotals.Information}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Controls */}
      <div className="controls-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search applications..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="filter-controls">
          <select value={filterHealth} onChange={(e) => setFilterHealth(e.target.value)} className="filter-select">
            <option value="all">Filter: All</option>
            <option value="critical">Critical Only</option>
            <option value="problematic">Problematic</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
            <option value="issues">Sort by: Issues</option>
            <option value="name">Sort by: Name</option>
            <option value="occurrences">Sort by: Occurrences</option>
            <option value="users">Sort by: Users</option>
            <option value="systems">Sort by: Systems</option>
          </select>
          <button 
            className="sort-order-btn"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="view-toggle">
        <button 
          className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
          onClick={() => setViewMode('grid')}
        >
          ⊞ Grid View
        </button>
        <button 
          className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
          onClick={() => setViewMode('table')}
        >
          ☰ Table View
        </button>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="apps-grid">
          {filteredApps.length === 0 ? (
            <div className="empty-state">
              <p>No applications found</p>
            </div>
          ) : (
            filteredApps.map((app) => (
              <div key={app.app} className="app-card">
                <div className="app-card-header">
                  <div className="app-card-icon">📦</div>
                  <span className="health-badge-small" style={{ backgroundColor: getHealthColor(app.health), color: 'white' }}>
                    {getHealthIcon(app.health)}
                  </span>
                </div>
                <h3 className="app-card-name">{app.app}</h3>
                <div className="app-card-stats">
                  <div className="stat">
                    <span className="stat-icon">⚠️</span>
                    <span className="stat-value">{app.issues}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-icon">📊</span>
                    <span className="stat-value">{app.occurrences}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-icon">👥</span>
                    <span className="stat-value">{app.affectedUsers}</span>
                  </div>
                </div>
                <button 
                  className="view-details-btn"
                  onClick={() => setSelectedApp(app)}
                >
                  View Details
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Table View - Matrix Format */}
      {viewMode === 'table' && (
        <div className="apps-table-container">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="severity-critical">🛑 Critical</th>
                <th className="severity-error">🔴 Error</th>
                <th className="severity-warning">⚠️ Warning</th>
                <th className="severity-info">ℹ️ Information</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(healthMatrix).map(([category, severities]) => {
                const rowTotal = severities.Critical + severities.Error + severities.Warning + severities.Information;
                return (
                  <tr key={category}>
                    <td className="category-name">{category}</td>
                    <td 
                      className="severity-cell critical clickable" 
                      onClick={() => severities.Critical > 0 && setSelectedMatrixCell({ category, severity: 'Critical' })}
                      style={{ cursor: severities.Critical > 0 ? 'pointer' : 'default' }}
                    >
                      {severities.Critical || '-'}
                    </td>
                    <td 
                      className="severity-cell error clickable" 
                      onClick={() => severities.Error > 0 && setSelectedMatrixCell({ category, severity: 'Error' })}
                      style={{ cursor: severities.Error > 0 ? 'pointer' : 'default' }}
                    >
                      {severities.Error || '-'}
                    </td>
                    <td 
                      className="severity-cell warning clickable" 
                      onClick={() => severities.Warning > 0 && setSelectedMatrixCell({ category, severity: 'Warning' })}
                      style={{ cursor: severities.Warning > 0 ? 'pointer' : 'default' }}
                    >
                      {severities.Warning || '-'}
                    </td>
                    <td 
                      className="severity-cell info clickable" 
                      onClick={() => severities.Information > 0 && setSelectedMatrixCell({ category, severity: 'Information' })}
                      style={{ cursor: severities.Information > 0 ? 'pointer' : 'default' }}
                    >
                      {severities.Information || '-'}
                    </td>
                    <td className="total-cell">{rowTotal}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td>Total</td>
                <td className="severity-cell critical">{severityTotals.Critical}</td>
                <td className="severity-cell error">{severityTotals.Error}</td>
                <td className="severity-cell warning">{severityTotals.Warning}</td>
                <td className="severity-cell info">{severityTotals.Information}</td>
                <td className="total-cell">
                  {severityTotals.Critical + severityTotals.Error + severityTotals.Warning + severityTotals.Information}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
