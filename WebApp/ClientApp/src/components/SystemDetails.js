import React, { useState, useMemo } from 'react';
import './SystemDetails.css';

function SystemDetails({ analysisResult, sessions }) {
  const [selectedSystem, setSelectedSystem] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [healthFilter, setHealthFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // grid, table, or detail
  const [sortBy, setSortBy] = useState('name'); // name, health, issues, users, activity
  const [sortOrder, setSortOrder] = useState('asc'); // asc or desc
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(24); // 24 for grid (4x6), divisible by table rows

  // Format date as DD-MMM-YYYY
  const formatDate = (dateValue) => {
    if (!dateValue) return 'No data';
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Invalid date';
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Format datetime as DD-MMM-YYYY HH:MM:SS
  const formatDateTime = (dateValue) => {
    if (!dateValue) return 'Unknown time';
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Invalid date';
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  };

  // Get unique devices from sessions
  const systems = useMemo(() => {
    if (!sessions?.statistics?.systems) return [];
    return sessions.statistics.systems.sort();
  }, [sessions]);

  // Get device metrics with issues
  const deviceMetrics = useMemo(() => {
    return systems.map(systemName => {
      const systemSessions = sessions.sessions?.filter(s => s.systemName === systemName) || [];
      const systemIssues = analysisResult?.issues?.filter(issue => 
        issue.affectedSystems?.includes(systemName)
      ) || [];
      
      const severityCounts = systemIssues.reduce((acc, issue) => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
        return acc;
      }, {});

      const highestSeverity = systemIssues.length > 0 
        ? ['Critical', 'Error', 'Warning', 'Information'].find(s => severityCounts[s])
        : null;

      const latestSession = systemSessions.length > 0 
        ? systemSessions.sort((a, b) => new Date(b.sessionTimestamp) - new Date(a.sessionTimestamp))[0]
        : null;

      return {
        systemName,
        userCount: new Set(systemSessions.map(s => s.userId)).size,
        sessionCount: systemSessions.length,
        issueCount: systemIssues.length,
        highestSeverity,
        severityCounts,
        totalOccurrences: systemIssues.reduce((sum, issue) => sum + issue.occurrences, 0),
        lastActivity: latestSession?.sessionTimestamp || null,
        health: systemIssues.length === 0 ? 'Healthy' : 
                systemIssues.some(i => i.severity === 'Critical') ? 'Critical' :
                systemIssues.some(i => i.severity === 'Error') ? 'Error' :
                'Warning'
      };
    });
  }, [systems, sessions, analysisResult]);

  // Filtered and sorted devices
  const filteredDevices = useMemo(() => {
    let filtered = deviceMetrics.filter(device => {
      const matchesSearch = device.systemName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesHealth = healthFilter === 'all' || device.health === healthFilter;
      return matchesSearch && matchesHealth;
    });

    // Sort devices
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.systemName.localeCompare(b.systemName);
          break;
        case 'health':
          const healthOrder = { 'Critical': 4, 'Error': 3, 'Warning': 2, 'Healthy': 1 };
          comparison = (healthOrder[a.health] || 0) - (healthOrder[b.health] || 0);
          break;
        case 'issues':
          comparison = a.issueCount - b.issueCount;
          break;
        case 'users':
          comparison = a.userCount - b.userCount;
          break;
        case 'activity':
          const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
          const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
          comparison = aTime - bTime;
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [deviceMetrics, searchQuery, healthFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);
  const paginatedDevices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDevices.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDevices, currentPage, itemsPerPage]);

  // Health status summary
  const healthSummary = useMemo(() => {
    return deviceMetrics.reduce((acc, device) => {
      acc[device.health] = (acc[device.health] || 0) + 1;
      return acc;
    }, { Healthy: 0, Warning: 0, Error: 0, Critical: 0 });
  }, [deviceMetrics]);

  // Reset to page 1 when filters change
  const handleFilterChange = (filterFn) => {
    filterFn();
    setCurrentPage(1);
  };

  // Get system-specific data for detail view
  const systemData = useMemo(() => {
    if (!selectedSystem || !sessions || !analysisResult) return null;

    const systemSessions = sessions.sessions?.filter(s => s.systemName === selectedSystem) || [];
    const systemIssues = analysisResult.issues?.filter(issue => 
      issue.affectedSystems?.includes(selectedSystem)
    ) || [];

    const systemUsers = [...new Set(systemSessions.map(s => s.userId))];
    const severityCounts = systemIssues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {});

    const categoryBreakdown = systemIssues.reduce((acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    }, {});

    const totalOccurrences = systemIssues.reduce((sum, issue) => sum + issue.occurrences, 0);

    const timeline = [];
    systemSessions.forEach(s => {
      timeline.push({
        ts: new Date(s.sessionTimestamp),
        type: 'session',
        label: `Session by ${s.userId}`
      });
    });
    (analysisResult.issues || []).forEach(issue => {
      if (!issue.samples) return;
      issue.samples.forEach(sample => {
        if (sample.system === selectedSystem && sample.timestamp) {
          const t = new Date(sample.timestamp);
          timeline.push({ ts: t, type: 'issue', severity: issue.severity, label: issue.description });
        }
      });
    });
    timeline.sort((a, b) => b.ts - a.ts);

    return {
      systemName: selectedSystem,
      sessions: systemSessions,
      sessionCount: systemSessions.length,
      users: systemUsers,
      userCount: systemUsers.length,
      issues: systemIssues,
      issueCount: systemIssues.length,
      severityCounts,
      categoryBreakdown,
      totalOccurrences,
      timeline,
      latestSession: systemSessions.length > 0 
        ? systemSessions.sort((a, b) => new Date(b.sessionTimestamp) - new Date(a.sessionTimestamp))[0]
        : null
    };
  }, [selectedSystem, sessions, analysisResult]);

  if (!sessions || !analysisResult) {
    return (
      <div className="system-details">
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h2>No Data Available</h2>
          <p>Run an analysis to view system details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="system-details">
      {/* Modern Header with Controls */}
      <div className="fleet-overview-header">
        <div>
          <h2>All Devices</h2>
          <p>Monitor and manage your fleet of {deviceMetrics.length} devices</p>
        </div>
        <div className="fleet-controls-group">
          {/* Search Box */}
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search devices..."
              value={searchQuery}
              onChange={(e) => handleFilterChange(() => setSearchQuery(e.target.value))}
              className="search-input"
            />
          </div>

          {/* Health Filter */}
          <select
            value={healthFilter}
            onChange={(e) => handleFilterChange(() => setHealthFilter(e.target.value))}
            className="health-filter-select"
          >
            <option value="all">All Devices ({deviceMetrics.length})</option>
            <option value="Healthy">✅ Healthy ({healthSummary.Healthy})</option>
            <option value="Warning">⚠️ Warning ({healthSummary.Warning})</option>
            <option value="Error">🔴 Error ({healthSummary.Error})</option>
            <option value="Critical">🛑 Critical ({healthSummary.Critical})</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="health-filter-select"
            title="Sort by"
          >
            <option value="name">Sort: Name</option>
            <option value="health">Sort: Health</option>
            <option value="issues">Sort: Issues</option>
            <option value="users">Sort: Users</option>
            <option value="activity">Sort: Activity</option>
          </select>

          {/* Sort Order */}
          <button
            className="sort-order-btn"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>

          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              ⊞ Grid
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              ☰ Table
            </button>
          </div>
        </div>
      </div>

      {/* Health Summary Cards */}
      <div className="health-summary-cards">
        <div className="health-summary-card healthy" onClick={() => handleFilterChange(() => setHealthFilter('Healthy'))}>
          <div className="summary-icon">✅</div>
          <div className="summary-content">
            <div className="summary-value">{healthSummary.Healthy}</div>
            <div className="summary-label">Healthy</div>
          </div>
        </div>
        <div className="health-summary-card warning" onClick={() => handleFilterChange(() => setHealthFilter('Warning'))}>
          <div className="summary-icon">⚠️</div>
          <div className="summary-content">
            <div className="summary-value">{healthSummary.Warning}</div>
            <div className="summary-label">Warning</div>
          </div>
        </div>
        <div className="health-summary-card error" onClick={() => handleFilterChange(() => setHealthFilter('Error'))}>
          <div className="summary-icon">🔴</div>
          <div className="summary-content">
            <div className="summary-value">{healthSummary.Error}</div>
            <div className="summary-label">Error</div>
          </div>
        </div>
        <div className="health-summary-card critical" onClick={() => handleFilterChange(() => setHealthFilter('Critical'))}>
          <div className="summary-icon">🛑</div>
          <div className="summary-content">
            <div className="summary-value">{healthSummary.Critical}</div>
            <div className="summary-label">Critical</div>
          </div>
        </div>
      </div>

      {/* Results Info */}
      <div className="fleet-results-info">
        <span>Showing {paginatedDevices.length} of {filteredDevices.length} devices</span>
        {filteredDevices.length !== deviceMetrics.length && (
          <button 
            className="clear-filters-btn"
            onClick={() => {
              setSearchQuery('');
              setHealthFilter('all');
              setCurrentPage(1);
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <>
          <div className="devices-grid">
            {paginatedDevices.length === 0 ? (
              <div className="empty-state-full">
                <span className="empty-icon">🖥️</span>
                <h3>No devices found</h3>
                <p>Try adjusting your search or filters</p>
              </div>
            ) : (
              paginatedDevices.map(device => (
                <div
                  key={device?.systemName || 'unknown'}
                  className="device-card"
                  onClick={() => {
                    if (device?.systemName) {
                      setSelectedSystem(device.systemName);
                      setViewMode('detail');
                    }
                  }}
                >
                  {/* Health Badge */}
                  <div className={`health-badge health-${(device?.health || 'unknown').toLowerCase()}`}>
                    {device?.health === 'Healthy' && '✅'}
                    {device?.health === 'Warning' && '⚠️'}
                    {device?.health === 'Error' && '🔴'}
                    {device?.health === 'Critical' && '🛑'}
                  </div>

                  {/* Device Name */}
                  <div className="device-name">
                    <span className="device-icon">💻</span>
                    <h4>{device?.systemName || 'Unknown'}</h4>
                  </div>

                  {/* Metrics Grid */}
                  <div className="metrics-mini-grid">
                    <div className="metric-item">
                      <span className="metric-value" style={{ color: '#1e40af' }}>
                        {device?.userCount ?? 0}
                      </span>
                      <span className="metric-label">Users</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-value" style={{ color: '#8b5cf6' }}>
                        {device?.issueCount ?? 0}
                      </span>
                      <span className="metric-label">Issues</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-value" style={{ color: '#10b981' }}>
                        {device?.sessionCount ?? 0}
                      </span>
                      <span className="metric-label">Sessions</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-value" style={{ color: '#f59e0b' }}>
                        {device?.totalOccurrences ?? 0}
                      </span>
                      <span className="metric-label">Events</span>
                    </div>
                  </div>

                  {/* Last Activity */}
                  <div className="device-last-activity">
                    {device?.lastActivity ? (
                      <small>Last active: {formatDate(device?.lastActivity)}</small>
                    ) : (
                      <small>No activity recorded</small>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                ⟨⟨ First
              </button>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ⟨ Previous
              </button>
              <div className="pagination-info">
                Page {currentPage} of {totalPages}
              </div>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next ⟩
              </button>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last ⟩⟩
              </button>
            </div>
          )}
        </>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <>
          <div className="devices-table-container">
            {paginatedDevices.length === 0 ? (
              <div className="empty-state-full">
                <span className="empty-icon">🖥️</span>
                <h3>No devices found</h3>
                <p>Try adjusting your search or filters</p>
              </div>
            ) : (
              <table className="devices-table">
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Health</th>
                    <th>Users</th>
                    <th>Issues</th>
                    <th>Sessions</th>
                    <th>Events</th>
                    <th>Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDevices.map((device) => (
                    <tr
                      key={device?.systemName || 'unknown'}
                      className="table-row-clickable"
                      onClick={() => {
                        if (device?.systemName) {
                          setSelectedSystem(device.systemName);
                          setViewMode('detail');
                        }
                      }}
                    >
                      <td className="device-name-cell">
                        <span className="device-icon">💻</span>
                        {device?.systemName || 'Unknown'}
                      </td>
                      <td>
                        <span className={`health-badge-small health-${(device?.health || 'unknown').toLowerCase()}`}>
                          {device?.health === 'Healthy' && '✅ Healthy'}
                          {device?.health === 'Warning' && '⚠️ Warning'}
                          {device?.health === 'Error' && '🔴 Error'}
                          {device?.health === 'Critical' && '🛑 Critical'}
                        </span>
                      </td>
                      <td>
                        <span className="metric-badge" style={{ backgroundColor: '#eff6ff', color: '#1e40af' }}>
                          {device?.userCount ?? 0}
                        </span>
                      </td>
                      <td>
                        <span className="metric-badge" style={{ backgroundColor: '#faf5ff', color: '#8b5cf6' }}>
                          {device?.issueCount ?? 0}
                        </span>
                      </td>
                      <td>
                        <span className="metric-badge" style={{ backgroundColor: '#f0fdf4', color: '#10b981' }}>
                          {device?.sessionCount ?? 0}
                        </span>
                      </td>
                      <td>
                        <span className="metric-badge" style={{ backgroundColor: '#fffbeb', color: '#f59e0b' }}>
                          {device?.totalOccurrences ?? 0}
                        </span>
                      </td>
                      <td>
                        {formatDate(device?.lastActivity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                ⟨⟨ First
              </button>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ⟨ Previous
              </button>
              <div className="pagination-info">
                Page {currentPage} of {totalPages}
              </div>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next ⟩
              </button>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last ⟩⟩
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail View */}
      {viewMode === 'detail' && selectedSystem && systemData && (
        <div className="system-content fade-in">
          {/* Back Button */}
          <button
            className="back-btn"
            onClick={() => setViewMode('grid')}
          >
            ← Back to Devices
          </button>

          {/* System Overview */}
          <div className="system-overview-card">
            <div className="overview-header">
              <div className="system-name-badge">
                <span className="system-icon">🖥️</span>
                <h3>{systemData.systemName}</h3>
              </div>
              {systemData.latestSession && (
                <div className="last-seen">
                  <span className="last-seen-label">Last Activity</span>
                  <span className="last-seen-time">
                    {formatDateTime(systemData.latestSession.sessionTimestamp)}
                  </span>
                </div>
              )}
            </div>

            <div className="overview-stats-grid">
              <div className="overview-stat">
                <div className="overview-stat-icon">👥</div>
                <div className="overview-stat-content">
                  <div className="overview-stat-value">{systemData.userCount}</div>
                  <div className="overview-stat-label">Active Users</div>
                </div>
              </div>
              <div className="overview-stat">
                <div className="overview-stat-icon">📅</div>
                <div className="overview-stat-content">
                  <div className="overview-stat-value">{systemData.sessionCount}</div>
                  <div className="overview-stat-label">Total Sessions</div>
                </div>
              </div>
              <div className="overview-stat">
                <div className="overview-stat-icon">⚠️</div>
                <div className="overview-stat-content">
                  <div className="overview-stat-value">{systemData.issueCount}</div>
                  <div className="overview-stat-label">Issues Found</div>
                </div>
              </div>
              <div className="overview-stat">
                <div className="overview-stat-icon">📊</div>
                <div className="overview-stat-content">
                  <div className="overview-stat-value">{systemData.totalOccurrences}</div>
                  <div className="overview-stat-label">Total Occurrences</div>
                </div>
              </div>
            </div>
          </div>

          <div className="system-grid">
            {/* Severity Breakdown */}
            {systemData.issueCount > 0 && (
              <div className="detail-card">
                <div className="detail-card-header">
                  <h4>Severity Breakdown</h4>
                </div>
                <div className="severity-bars">
                  {Object.entries(systemData.severityCounts).map(([severity, count]) => (
                    <div key={severity} className="severity-bar-item">
                      <div className="severity-bar-header">
                        <span className={`badge badge-${severity.toLowerCase()}`}>{severity}</span>
                        <span className="severity-bar-count">{count}</span>
                      </div>
                      <div className="severity-bar-track">
                        <div 
                          className={`severity-bar-fill severity-${severity.toLowerCase()}`}
                          style={{ width: `${(count / systemData.issueCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category Breakdown */}
            {systemData.issueCount > 0 && (
              <div className="detail-card">
                <div className="detail-card-header">
                  <h4>Issues by Category</h4>
                </div>
                <div className="category-breakdown">
                  {Object.entries(systemData.categoryBreakdown).map(([category, count]) => (
                    <div key={category} className="category-breakdown-item">
                      <span className="category-breakdown-name">{category}</span>
                      <span className="category-breakdown-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Users */}
            <div className="detail-card">
              <div className="detail-card-header">
                <h4>Active Users ({systemData.userCount})</h4>
              </div>
              <div className="users-list">
                {systemData.users.map(user => (
                  <div key={user} className="user-chip">
                    <span className="user-chip-icon">👤</span>
                    <span className="user-chip-name">{user}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Sessions */}
            <div className="detail-card">
              <div className="detail-card-header">
                <h4>Recent Sessions</h4>
              </div>
              <div className="sessions-list">
                {systemData.sessions
                  .sort((a, b) => new Date(b.sessionTimestamp) - new Date(a.sessionTimestamp))
                  .slice(0, 10)
                  .map((session, idx) => (
                    <div key={idx} className="session-item">
                      <div className="session-user">
                        <span className="session-icon">👤</span>
                        <span>{session.userId}</span>
                      </div>
                      <div className="session-time">
                        {formatDateTime(session.sessionTimestamp)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* System Issues */}
          {systemData.issueCount > 0 && (
            <div className="detail-card full-width">
              <div className="detail-card-header">
                <h4>System Issues ({systemData.issueCount})</h4>
              </div>
              <div className="system-issues-list">
                {systemData.issues.map((issue, idx) => (
                  <div key={issue.issueId} className="system-issue-card">
                    <div className="system-issue-header">
                      <div className="system-issue-badge-group">
                        <span className={`badge badge-${issue.severity.toLowerCase()}`}>
                          {issue.severity}
                        </span>
                        <span className="issue-category-badge">{issue.category}</span>
                      </div>
                      <span className="issue-occurrence-badge">
                        {issue.occurrences} occurrences
                      </span>
                    </div>
                    <h5 className="system-issue-title">{issue.description}</h5>
                    {issue.rootCause && (
                      <div className="system-issue-section">
                        <span className="system-issue-label">Root Cause:</span>
                        <p>{issue.rootCause}</p>
                      </div>
                    )}
                    {issue.solution && (
                      <div className="system-issue-section solution">
                        <span className="system-issue-label">Solution:</span>
                        <p>{issue.solution}</p>
                      </div>
                    )}
                    {issue.affectedUsers && issue.affectedUsers.length > 0 && (
                      <div className="system-issue-users">
                        <span className="system-issue-label">Affected Users:</span>
                        <div className="affected-users-chips">
                          {issue.affectedUsers.map(user => (
                            <span key={user} className="user-chip-mini">{user}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {systemData.timeline && systemData.timeline.length > 0 && (
            <div className="detail-card full-width">
              <div className="detail-card-header">
                <h4>Recent Timeline</h4>
              </div>
              <div className="sessions-list">
                {systemData.timeline.slice(0, 20).map((e, idx) => (
                  <div key={idx} className="session-item">
                    <div className="session-user">
                      <span className="session-icon">{e.type === 'issue' ? '⚠️' : '🕘'}</span>
                      <span>
                        {e.type === 'issue' ? (
                          <>
                            <span className={`badge badge-${String(e.severity || '').toLowerCase()}`} style={{ marginRight: 8 }}>
                              {e.severity}
                            </span>
                            {e.label}
                          </>
                        ) : (
                          e.label
                        )}
                      </span>
                    </div>
                    <div className="session-time">
                      {e.ts ? formatDateTime(e.ts) : 'Unknown time'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {systemData.issueCount === 0 && (
            <div className="detail-card full-width">
              <div className="empty-state-small">
                <span className="empty-icon-small">✅</span>
                <h4>No Issues Found</h4>
                <p>This system is running smoothly with no detected issues</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SystemDetails;
