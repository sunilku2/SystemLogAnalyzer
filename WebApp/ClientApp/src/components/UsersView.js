import React, { useMemo, useState } from 'react';
import './UsersView.css';
import DataTable from './DataTable';

export default function UsersView({ sessions, analysisResult }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null); // For inline expansion
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'detail'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('issues');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedCategory, setSelectedCategory] = useState('all'); // For filtering issues by category
  const [filterHealth, setFilterHealth] = useState('all'); // Filter by health: all, critical, poor, fair, healthy
  const [filterMinIssues, setFilterMinIssues] = useState(0); // Filter by minimum issues

  // Format date
  const formatDate = (dateValue) => {
    if (!dateValue) return 'No data';
    // If it's already a Date object, use it directly; otherwise create a new Date
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (isNaN(date.getTime())) return 'No data';
    return date.toLocaleString();
  };

  // Aggregate user data
  const userMetrics = useMemo(() => {
    if (!sessions?.sessions) return [];
    
    const map = new Map();
    sessions.sessions.forEach(s => {
      const k = s.userId;
      const v = map.get(k) || { 
        userId: k, 
        systems: new Set(), 
        sessions: 0, 
        lastSeen: null,
        firstSeen: null 
      };
      v.systems.add(s.systemName);
      v.sessions += 1;
      const t = new Date(s.sessionTimestamp);
      if (!v.lastSeen || t > v.lastSeen) v.lastSeen = t;
      if (!v.firstSeen || t < v.firstSeen) v.firstSeen = t;
      map.set(k, v);
    });

    // Get issues by user with details
    const issuesByUser = new Map();
    const severityByUser = new Map();
    const issueDetailsbyUser = new Map();

    (analysisResult?.issues || []).forEach(i => {
      (i.affectedUsers || []).forEach(u => {
        const count = issuesByUser.get(u) || 0;
        issuesByUser.set(u, count + 1);

        // Track severity
        const severities = severityByUser.get(u) || { Critical: 0, Error: 0, Warning: 0, Information: 0 };
        severities[i.severity] = (severities[i.severity] || 0) + 1;
        severityByUser.set(u, severities);

        // Store issue details
        const details = issueDetailsbyUser.get(u) || [];
        details.push({
          title: i.description,
          category: i.category,
          severity: i.severity,
          rootCause: i.rootCause,
          solution: i.solution,
          occurrences: i.occurrences
        });
        issueDetailsbyUser.set(u, details);
      });
    });

    return [...map.values()].map(v => ({
      userId: v.userId,
      deviceCount: v.systems.size,
      sessionCount: v.sessions,
      issueCount: issuesByUser.get(v.userId) || 0,
      severities: severityByUser.get(v.userId) || { Critical: 0, Error: 0, Warning: 0, Information: 0 },
      issues: issueDetailsbyUser.get(v.userId) || [],
      lastSeen: v.lastSeen,
      firstSeen: v.firstSeen,
      devices: Array.from(v.systems)
    }));
  }, [sessions, analysisResult]);

  // Health score calculation
  const getHealthScore = (severities) => {
    const critical = severities.Critical || 0;
    const error = severities.Error || 0;
    const warning = severities.Warning || 0;
    
    if (critical > 0) return { score: 'Critical', color: '#dc2626', icon: '🛑' };
    if (error > 0) return { score: 'Poor', color: '#ea580c', icon: '🔴' };
    if (warning > 0) return { score: 'Fair', color: '#f59e0b', icon: '⚠️' };
    return { score: 'Healthy', color: '#10b981', icon: '✅' };
  };

  // Get severity icon
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'Critical': return '🛑';
      case 'Error': return '🔴';
      case 'Warning': return '⚠️';
      case 'Information': return 'ℹ️';
      default: return '•';
    }
  };

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

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let filtered = userMetrics.filter(user => {
      // Search filter
      const matchesSearch = user.userId.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Health filter
      const health = getHealthScore(user.severities);
      let matchesHealth = filterHealth === 'all';
      if (filterHealth !== 'all') {
        const healthText = health.score.toLowerCase();
        matchesHealth = healthText.includes(filterHealth.toLowerCase());
      }
      
      // Issues threshold filter
      const matchesIssues = user.issueCount >= filterMinIssues;
      
      return matchesSearch && matchesHealth && matchesIssues;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'issues':
          comparison = a.issueCount - b.issueCount;
          break;
        case 'name':
          comparison = a.userId.localeCompare(b.userId);
          break;
        case 'devices':
          comparison = a.deviceCount - b.deviceCount;
          break;
        case 'sessions':
          comparison = a.sessionCount - b.sessionCount;
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [userMetrics, searchQuery, sortBy, sortOrder, filterHealth, filterMinIssues]);

  if (viewMode === 'detail' && selectedUser) {
    const user = selectedUser;
    const health = getHealthScore(user.severities);

    return (
      <div className="user-detail-view">
        <button className="back-btn" onClick={() => { setViewMode('table'); setSelectedUser(null); setSelectedCategory('all'); }}>
          ← Back to List
        </button>

        {/* Header */}
        <div className="user-detail-header">
          <div className="user-identity">
            <div className="user-avatar">👤</div>
            <div className="user-info">
              <h1>{user.userId}</h1>
              <p className="user-role">Enterprise User</p>
            </div>
          </div>

          <div className="health-indicator">
            <span className="health-badge" style={{ borderColor: health.color }}>
              <span className="health-icon">{health.icon}</span>
              <span className="health-text">{health.score}</span>
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{user.deviceCount}</div>
            <div className="stat-label">Devices Used</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{user.sessionCount}</div>
            <div className="stat-label">Active Sessions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{user.issueCount}</div>
            <div className="stat-label">Issues Found</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {user.severities.Critical + user.severities.Error}
            </div>
            <div className="stat-label">Critical/Errors</div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="activity-section">
          <h3>Activity Timeline</h3>
          <div className="timeline-info">
            <div className="timeline-item">
              <span className="timeline-label">First Seen:</span>
              <span className="timeline-value">{formatDate(user.firstSeen)}</span>
            </div>
            <div className="timeline-item">
              <span className="timeline-label">Last Seen:</span>
              <span className="timeline-value">{formatDate(user.lastSeen)}</span>
            </div>
          </div>
        </div>

        {/* Devices */}
        <div className="devices-section">
          <h3>Devices</h3>
          <div className="devices-list">
            {user.devices.map((device, idx) => (
              <div key={idx} className="device-badge">
                💻 {device}
              </div>
            ))}
          </div>
        </div>

        {/* Issues & Resolutions */}
        <div className="issues-section">
          <h3>Issues & Resolutions</h3>
          
          {user.issues.length === 0 ? (
            <div className="no-issues">✅ No issues found</div>
          ) : (
            <>
              {/* Category Tabs */}
              <div className="category-tabs">
                <button
                  className={`category-tab ${selectedCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('all')}
                >
                  📋 All ({user.issues.length})
                </button>
                {[...new Set(user.issues.map(i => i.category))].map((category) => {
                  const categoryCount = user.issues.filter(i => i.category === category).length;
                  return (
                    <button
                      key={category}
                      className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category} ({categoryCount})
                    </button>
                  );
                })}
              </div>

              {/* Issues List */}
              <div className="issues-list">
                {user.issues
                  .filter(issue => selectedCategory === 'all' || issue.category === selectedCategory)
                  .map((issue, idx) => (
                    <div key={idx} className="issue-card">
                      <div className="issue-header">
                        <span className="issue-severity" style={{ color: getSeverityColor(issue.severity) }}>
                          {getSeverityIcon(issue.severity)} {issue.severity}
                        </span>
                        <span className="issue-category">{issue.category}</span>
                      </div>

                      <div className="issue-title">{issue.title}</div>

                      <div className="issue-details">
                        <div className="detail-row">
                          <span className="detail-label">🔍 Root Cause:</span>
                          <span className="detail-value">{issue.rootCause}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">✅ Resolution:</span>
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
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="users-view">
      {/* Header */}
      <div className="view-header">
        <div className="header-content">
          <h2>👤 Employee Management</h2>
          <p className="header-subtitle">Monitor employee devices, issues, and system health</p>
        </div>
      </div>

      {/* Controls */}
      <div className="controls-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search employees by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="filter-controls">
          <select value={filterHealth} onChange={(e) => setFilterHealth(e.target.value)} className="filter-select">
            <option value="all">Filter by: All</option>
            <option value="critical">Critical</option>
            <option value="poor">Poor</option>
            <option value="fair">Fair</option>
            <option value="healthy">Healthy</option>
          </select>
          <select value={filterMinIssues} onChange={(e) => setFilterMinIssues(Number(e.target.value))} className="filter-select">
            <option value="0">Min Issues: All</option>
            <option value="1">Min Issues: 1+</option>
            <option value="5">Min Issues: 5+</option>
            <option value="10">Min Issues: 10+</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
            <option value="issues">Sort by: Issues</option>
            <option value="name">Sort by: Name</option>
            <option value="devices">Sort by: Devices</option>
            <option value="sessions">Sort by: Sessions</option>
          </select>
          <button 
            className="sort-order-btn"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="summary-stats">
        <div className="summary-stat">
          <span className="stat-number">{filteredUsers.length}</span>
          <span className="stat-text">Total Employees</span>
        </div>
        <div className="summary-stat">
          <span className="stat-number">{filteredUsers.reduce((sum, u) => sum + u.deviceCount, 0)}</span>
          <span className="stat-text">Total Devices</span>
        </div>
        <div className="summary-stat">
          <span className="stat-number">{filteredUsers.reduce((sum, u) => sum + u.issueCount, 0)}</span>
          <span className="stat-text">Total Issues</span>
        </div>
        <div className="summary-stat">
          <span className="stat-number">{filteredUsers.reduce((sum, u) => sum + u.severities.Critical, 0)}</span>
          <span className="stat-text">Critical Issues</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        {filteredUsers.length === 0 ? (
          <div className="empty-state">
            <p>No employees found matching your filters</p>
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th width="30"></th>
                <th>Employee</th>
                <th>Health</th>
                <th>Devices</th>
                <th>Sessions</th>
                <th>Issues</th>
                <th>Severity</th>
                <th>Last Activity</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const health = getHealthScore(user.severities);
                const isExpanded = expandedUser === user.userId;
                return (
                  <React.Fragment key={user.userId}>
                    <tr className="user-row">
                      <td className="expand-btn-cell">
                        <button 
                          className={`expand-btn ${isExpanded ? 'expanded' : ''}`}
                          onClick={() => setExpandedUser(isExpanded ? null : user.userId)}
                          title={isExpanded ? 'Collapse' : 'Expand details'}
                        >
                          ▶
                        </button>
                      </td>
                      <td className="employee-cell">
                        <span className="employee-icon">👤</span>
                        <span className="employee-name">{user.userId}</span>
                      </td>
                      <td>
                        <span 
                          className="health-badge-small" 
                          style={{ 
                            backgroundColor: health.score === 'Critical' ? '#fee2e2' : 
                                           health.score === 'Poor' ? '#fed7aa' : 
                                           health.score === 'Fair' ? '#fef3c7' : '#d1fae5',
                            color: health.score === 'Critical' ? '#991b1b' : 
                                  health.score === 'Poor' ? '#9a3412' : 
                                  health.score === 'Fair' ? '#92400e' : '#065f46',
                            border: 'none'
                          }}
                        >
                          {health.icon} {health.score}
                        </span>
                      </td>
                      <td>
                        <span className="metric-badge" style={{ backgroundColor: '#eff6ff', color: '#1e40af' }}>
                          {user.deviceCount}
                        </span>
                      </td>
                      <td>
                        <span className="metric-badge" style={{ backgroundColor: '#f0fdf4', color: '#10b981' }}>
                          {user.sessionCount}
                        </span>
                      </td>
                      <td>
                        <span className="metric-badge" style={{ backgroundColor: '#faf5ff', color: '#8b5cf6' }}>
                          {user.issueCount}
                        </span>
                      </td>
                      <td>
                        <div className="severity-indicators">
                          {user.severities.Critical > 0 && (
                            <span className="severity-badge" style={{ backgroundColor: '#dc2626' }}>
                              🛑 {user.severities.Critical}
                            </span>
                          )}
                          {user.severities.Error > 0 && (
                            <span className="severity-badge" style={{ backgroundColor: '#ea580c' }}>
                              🔴 {user.severities.Error}
                            </span>
                          )}
                          {user.severities.Warning > 0 && (
                            <span className="severity-badge" style={{ backgroundColor: '#f59e0b' }}>
                              ⚠️ {user.severities.Warning}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="last-activity">
                        {formatDate(user.lastSeen)}
                      </td>
                      <td>
                        <button
                          className="view-details-btn"
                          onClick={() => {
                            setSelectedUser(user);
                            setViewMode('detail');
                          }}
                        >
                          Full Details
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="expanded-row">
                        <td colSpan="9">
                          <div className="expanded-content">
                            <div className="expanded-section">
                              <div className="section-title">Devices Used</div>
                              <div className="devices-list">
                                {user.devices.map((device, idx) => (
                                  <span key={idx} className="device-badge">💻 {device}</span>
                                ))}
                              </div>
                            </div>
                            <div className="expanded-section">
                              <div className="section-title">Issues Summary</div>
                              <div className="issues-summary">
                                <div className="summary-item">
                                  <span className="summary-label">Total Issues:</span>
                                  <span className="summary-value">{user.issueCount}</span>
                                </div>
                                <div className="summary-item">
                                  <span className="summary-label">Critical:</span>
                                  <span className="summary-value" style={{ color: '#dc2626' }}>{user.severities.Critical}</span>
                                </div>
                                <div className="summary-item">
                                  <span className="summary-label">Error:</span>
                                  <span className="summary-value" style={{ color: '#ea580c' }}>{user.severities.Error}</span>
                                </div>
                                <div className="summary-item">
                                  <span className="summary-label">Warning:</span>
                                  <span className="summary-value" style={{ color: '#f59e0b' }}>{user.severities.Warning}</span>
                                </div>
                              </div>
                            </div>
                            <div className="expanded-section">
                              <div className="section-title">Top Issues</div>
                              <div className="top-issues">
                                {user.issues.slice(0, 3).map((issue, idx) => (
                                  <div key={idx} className="issue-item">
                                    <div className="issue-header">
                                      <span style={{ color: getSeverityColor(issue.severity), fontWeight: 600 }}>
                                        {getSeverityIcon(issue.severity)} {issue.category}
                                      </span>
                                      <span className="issue-count">×{issue.occurrences}</span>
                                    </div>
                                    <div className="issue-description">{issue.title}</div>
                                  </div>
                                ))}
                                {user.issues.length > 3 && (
                                  <div className="more-issues">+{user.issues.length - 3} more issues</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
