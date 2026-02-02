import React, { useMemo, useState, useEffect } from 'react';
import './Alerts.css';
import DataTable from './DataTable';

export default function Alerts({ issues, sessions }) {
  const [tab, setTab] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('occurrences'); // occurrences, severity, category
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [drawerImpactSearch, setDrawerImpactSearch] = useState('');
  const [selectedSolutionIndex, setSelectedSolutionIndex] = useState(0);
  const itemsPerPage = 20;

  // Get unique devices from sessions
  const devices = useMemo(() => {
    const deviceSet = new Set();
    (sessions?.sessions || []).forEach(s => deviceSet.add(s.systemName));
    return Array.from(deviceSet).sort();
  }, [sessions]);

  // Get severity counts
  const severityCounts = useMemo(() => {
    return (issues || []).reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, { Critical: 0, Error: 0, Warning: 0, Information: 0 });
  }, [issues]);

  const issuesWithImpacts = useMemo(() => {
    return (issues || []).map(issue => {
      const userImpact = Array.isArray(issue.affectedUsers) ? issue.affectedUsers.length : issue.userCount || 0;
      const deviceImpact = Array.isArray(issue.affectedSystems) ? issue.affectedSystems.length : (issue.affectedSystems ? issue.affectedSystems.length : 0);

      // derive earliest/latest timestamps for filtering
      const timestamps = (issue.samples || []).map(s => new Date(s.timestamp)).filter(d => !isNaN(d));
      const firstSeenDate = timestamps.length ? new Date(Math.min(...timestamps)) : null;
      const lastSeenDate = timestamps.length ? new Date(Math.max(...timestamps)) : null;

      return {
        ...issue,
        userImpact,
        deviceImpact,
        firstSeen: firstSeenDate ? firstSeenDate.toLocaleString() : 'Unknown',
        lastSeen: lastSeenDate ? lastSeenDate.toLocaleString() : 'Unknown',
      };
    });
  }, [issues]);

  // Filter and sort issues
  const filtered = useMemo(() => {
    let result = issuesWithImpacts;

    // Filter by severity tab
    if (tab !== 'all') {
      result = result.filter(i => i.severity?.toLowerCase() === tab);
    }

    // Filter by device
    if (deviceFilter !== 'all') {
      result = result.filter(i => (i.affectedSystems || []).includes(deviceFilter));
    }

    // Filter by date range (inclusive)
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo) : null;
      result = result.filter(i => {
        if (!i.firstSeen && !i.lastSeen) return false;
        const start = i.firstSeen || i.lastSeen;
        const end = i.lastSeen || i.firstSeen;
        if (from && end < from) return false;
        if (to && start > to) return false;
        return true;
      });
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(i => 
        i.description?.toLowerCase().includes(query) ||
        i.category?.toLowerCase().includes(query) ||
        i.severity?.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'severity':
          const severityOrder = { Critical: 4, Error: 3, Warning: 2, Information: 1 };
          comparison = (severityOrder[a.severity] || 0) - (severityOrder[b.severity] || 0);
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        case 'occurrences':
        default:
          comparison = (a.occurrences || 0) - (b.occurrences || 0);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [issuesWithImpacts, tab, deviceFilter, searchQuery, sortBy, sortOrder, dateFrom, dateTo]);

  // Paginate
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedIssues = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIdx, startIdx + itemsPerPage);
  }, [filtered, currentPage]);

  const tabs = [
    { id: 'all', label: 'All', count: (issues || []).length },
    { id: 'critical', label: 'Critical', count: severityCounts.Critical },
    { id: 'error', label: 'Error', count: severityCounts.Error },
    { id: 'warning', label: 'Warning', count: severityCounts.Warning },
    { id: 'information', label: 'Info', count: severityCounts.Information },
  ];

  const columns = [
    { key: 'severity', label: 'Severity', render: (v) => <span className={`badge badge-${String(v).toLowerCase()}`}>{v}</span> },
    { key: 'category', label: 'Category' },
    { key: 'description', label: 'Description' },
    { key: 'userImpact', label: 'Users Impacted' },
    { key: 'deviceImpact', label: 'Devices Impacted' },
    { key: 'occurrences', label: 'Occurrences' },
  ];

  // Generate solutions based on category and pattern
  const generateSolutions = (category, description) => {
    const categoryMap = {
      'Security': [
        'Update security policies and access controls to restrict unauthorized access',
        'Enable MFA (Multi-Factor Authentication) for all user accounts',
        'Review and rotate compromised credentials',
        'Run full security scan and malware detection'
      ],
      'Performance': [
        'Optimize database queries and add appropriate indexes',
        'Increase memory allocation to the affected services',
        'Implement caching layer to reduce load',
        'Scale horizontally by adding more instances'
      ],
      'Network': [
        'Check network connectivity and firewall rules',
        'Increase bandwidth allocation if needed',
        'Configure load balancing and failover mechanisms',
        'Verify DNS resolution and routing configuration'
      ],
      'Storage': [
        'Clean up temporary files and optimize storage usage',
        'Implement data archival and retention policies',
        'Add additional storage capacity',
        'Defragment disk and optimize file system'
      ],
      'Application': [
        'Update application to the latest stable version',
        'Check application logs for error details',
        'Restart the application service',
        'Review application configuration and dependencies'
      ],
      'System': [
        'Restart the affected system',
        'Update operating system patches and drivers',
        'Check system resources (CPU, RAM, Disk)',
        'Verify system time synchronization'
      ]
    };
    return categoryMap[category] || categoryMap['Application'];
  };

  // Generate root cause based on issue patterns
  const generateRootCause = (category, description) => {
    const rootCauseMap = {
      'Security': 'Unauthorized access attempt or potential security breach detected in system logs.',
      'Performance': 'System performance degradation due to high resource utilization or inefficient processes.',
      'Network': 'Network connectivity issues or bandwidth constraints affecting system communication.',
      'Storage': 'Insufficient storage space or I/O performance issues on the affected device.',
      'Application': 'Application error or unexpected behavior detected in recent logs.',
      'System': 'System-level issue including resource constraints or configuration problems.'
    };
    return rootCauseMap[category] || 'Issue detected based on log pattern analysis.';
  };

  const handleRowClick = (issue) => {
    if (!issue) return;
    setSelectedIssue(issue);
    setSelectedSolutionIndex(0);
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedIssue(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="alerts">
      <div className="alerts-header">
        <div>
          <h2>Alerts & Issues</h2>
          <p>Fleet-wide alert monitoring and issue tracking</p>
        </div>
        <div className="alerts-controls">
          {/* Search */}
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="search-input"
            />
          </div>

          {/* Device Filter */}
          <select
            value={deviceFilter}
            onChange={(e) => {
              setDeviceFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="device-filter-select"
          >
            <option value="all">All Devices ({devices.length})</option>
            {devices.map(device => (
              <option key={device} value={device}>
                {device}
              </option>
            ))}
          </select>

          {/* Date filters */}
          <div className="date-filters">
            <label className="date-label">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="date-input"
            />
            <label className="date-label">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="date-input"
            />
          </div>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="device-filter-select"
          >
            <option value="occurrences">Sort: Occurrences</option>
            <option value="severity">Sort: Severity</option>
            <option value="category">Sort: Category</option>
          </select>

          {/* Sort Order */}
          <button
            className="sort-order-btn"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Severity Summary */}
      <div className="severity-summary">
        <div className="severity-card critical">
          <div className="severity-icon">🛑</div>
          <div className="severity-info">
            <div className="severity-count">{severityCounts.Critical}</div>
            <div className="severity-label">Critical</div>
          </div>
        </div>
        <div className="severity-card error">
          <div className="severity-icon">🔴</div>
          <div className="severity-info">
            <div className="severity-count">{severityCounts.Error}</div>
            <div className="severity-label">Error</div>
          </div>
        </div>
        <div className="severity-card warning">
          <div className="severity-icon">⚠️</div>
          <div className="severity-info">
            <div className="severity-count">{severityCounts.Warning}</div>
            <div className="severity-label">Warning</div>
          </div>
        </div>
        <div className="severity-card info">
          <div className="severity-icon">ℹ️</div>
          <div className="severity-info">
            <div className="severity-count">{severityCounts.Information}</div>
            <div className="severity-label">Info</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="alerts-tabs">
        {tabs.map(t => (
          <button 
            key={t.id} 
            className={`alerts-tab ${tab === t.id ? 'active' : ''}`} 
            onClick={() => {
              setTab(t.id);
              setCurrentPage(1);
            }}
          >
            {t.label} <span className="tab-count">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Results Info */}
      <div className="alerts-results-info">
        <span>Showing {paginatedIssues.length} of {filtered.length} issues</span>
        {filtered.length !== (issues || []).length && (
          <button
            className="clear-filters-btn"
            onClick={() => {
              setSearchQuery('');
              setDeviceFilter('all');
              setDateFrom('');
              setDateTo('');
              setCurrentPage(1);
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      {paginatedIssues.length > 0 ? (
        <>
          <DataTable columns={columns} rows={paginatedIssues} onRowClick={handleRowClick} />

          {selectedIssue && (
            <div className="issue-drawer" onClick={() => setSelectedIssue(null)}>
              <div className="issue-drawer__panel" onClick={(e) => e.stopPropagation()}>
                <div className="issue-drawer__header">
                  <div>
                    <p className="drawer-kicker">Issue Detail</p>
                    <h3>{selectedIssue.description}</h3>
                  </div>
                  <button className="drawer-close" onClick={() => setSelectedIssue(null)} aria-label="Close">
                    ×
                  </button>
                </div>

                <div className="drawer-grid">
                  <div className="drawer-card">
                    <p className="label">Severity</p>
                    <span className={`badge badge-${String(selectedIssue.severity).toLowerCase() === 'information' ? 'info' : String(selectedIssue.severity).toLowerCase()}`}>{selectedIssue.severity}</span>
                  </div>
                  <div className="drawer-card">
                    <p className="label">Category</p>
                    <span>{selectedIssue.category}</span>
                  </div>
                  <div className="drawer-card">
                    <p className="label">Occurrences</p>
                    <span className="stat-value">{selectedIssue.occurrences}</span>
                  </div>
                  <div className="drawer-card">
                    <p className="label">Users Affected</p>
                    <span className="stat-value">{selectedIssue.userImpact}</span>
                  </div>
                  <div className="drawer-card">
                    <p className="label">Devices Affected</p>
                    <span className="stat-value">{selectedIssue.deviceImpact}</span>
                  </div>
                  <div className="drawer-card">
                    <p className="label">First Seen</p>
                    <span>{selectedIssue.firstSeen || 'Unknown'}</span>
                  </div>
                </div>

                <div className="drawer-section">
                  <p className="label">Root Cause Analysis</p>
                  <p>{selectedIssue.rootCause && selectedIssue.rootCause !== 'N/A' 
                    ? selectedIssue.rootCause 
                    : generateRootCause(selectedIssue.category, selectedIssue.description)}</p>
                </div>

                <div className="drawer-section">
                  <p className="label">Recommended Solution</p>
                  {(() => {
                    const solutions = selectedIssue.solution && selectedIssue.solution !== 'N/A' 
                      ? Array.isArray(selectedIssue.solution) 
                        ? selectedIssue.solution 
                        : [selectedIssue.solution]
                      : generateSolutions(selectedIssue.category, selectedIssue.description);
                    
                    return (
                      <div>
                        <p>{solutions[selectedSolutionIndex]}</p>
                        {solutions.length > 1 && (
                          <div className="solution-navigation" style={{ marginTop: '12px' }}>
                            <button 
                              className="solution-nav-btn"
                              onClick={() => setSelectedSolutionIndex(Math.max(0, selectedSolutionIndex - 1))}
                              disabled={selectedSolutionIndex === 0}
                            >
                              ← Previous
                            </button>
                            <span className="solution-dots">
                              {solutions.map((_, idx) => (
                                <button
                                  key={idx}
                                  className={`dot ${idx === selectedSolutionIndex ? 'active' : ''}`}
                                  onClick={() => setSelectedSolutionIndex(idx)}
                                />
                              ))}
                            </span>
                            <button 
                              className="solution-nav-btn"
                              onClick={() => setSelectedSolutionIndex(Math.min(solutions.length - 1, selectedSolutionIndex + 1))}
                              disabled={selectedSolutionIndex === solutions.length - 1}
                            >
                              Next →
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {(selectedIssue.affectedUsers || selectedIssue.affectedSystems) && (
                  <div className="drawer-section">
                    <p className="label">Users & Devices Affected</p>
                    <div className="list-search-box">
                      <span className="search-icon">🔍</span>
                      <input
                        type="text"
                        placeholder="Search by user ID or device..."
                        value={drawerImpactSearch}
                        onChange={(e) => setDrawerImpactSearch(e.target.value)}
                        className="list-search-input"
                      />
                    </div>
                    <div className="scrollable-list">
                      {selectedIssue.samples && selectedIssue.samples.length > 0 ? (
                        selectedIssue.samples
                          .reduce((acc, sample) => {
                            const key = `${sample.user}|${sample.system}`;
                            if (!acc.find(item => item.key === key)) {
                              acc.push({ key, user: sample.user, device: sample.system });
                            }
                            return acc;
                          }, [])
                          .filter(item => 
                            item.user.toLowerCase().includes(drawerImpactSearch.toLowerCase()) ||
                            item.device.toLowerCase().includes(drawerImpactSearch.toLowerCase())
                          )
                          .map((item, idx) => (
                            <div key={idx} className="list-item">
                              <div className="list-item-content">
                                <div className="list-user-device">
                                  <span className="list-user-id">👤 {item.user}</span>
                                  <span className="list-device-name">🖥️ {item.device}</span>
                                </div>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="list-item">
                          <span className="list-text">No impact data available</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedIssue.samples && selectedIssue.samples.length > 0 && (
                  <div className="drawer-section">
                    <p className="label">Sample Events</p>
                    <div className="samples-list">
                      {selectedIssue.samples.slice(0, 5).map((s, idx) => {
                        const sampleDate = new Date(s.timestamp);
                        const dateStr = isNaN(sampleDate.getTime()) ? 'N/A' : sampleDate.toLocaleString();
                        return (
                          <div key={idx} className="sample-item">
                            <div className="sample-meta">{dateStr} • {s.system} • {s.user}</div>
                            <div className="sample-text">{s.message || 'Log entry'}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
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
      ) : (
        <div className="empty-state">
          <span className="empty-icon">✅</span>
          <h3>No issues found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
