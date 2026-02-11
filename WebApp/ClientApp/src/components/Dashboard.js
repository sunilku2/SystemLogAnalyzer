import React, { useState, useMemo } from 'react';
import './Dashboard.css';
import FiltersBar from './FiltersBar';
import HealthScore from './HealthScore';

function Dashboard({ analysisResult, sessions, isAnalyzing, onNavigate }) {
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [issueFilter, setIssueFilter] = useState('all'); // all, critical, error, warning, info
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [issueSearchQuery, setIssueSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, 7days, 30days, custom
  const [assetViewMode, setAssetViewMode] = useState('devices'); // devices or users
  const [assetMinIssues, setAssetMinIssues] = useState(0); // filter by minimum issues

  // Move all hooks (useMemo) above any early returns to satisfy rules-of-hooks
  const activeAlerts = useMemo(() => {
    const list = analysisResult?.issues || [];
    return list.filter(i => ['Critical','Error','Warning'].includes(i.severity)).length;
  }, [analysisResult]);

  const devicesAgg = useMemo(() => {
    const sess = sessions?.sessions || [];
    const systems = new Map();
    sess.forEach(s => {
      const v = systems.get(s.systemName) || { systemName: s.systemName, users: new Set(), sessions: 0 };
      v.users.add(s.userId);
      v.sessions += 1;
      systems.set(s.systemName, v);
    });
    const issuesBySystem = new Map();
    (analysisResult?.issues || []).forEach(i => (i.affectedSystems || []).forEach(sys => issuesBySystem.set(sys, (issuesBySystem.get(sys)||0) + 1)));
    return [...systems.values()].map(v => ({
      systemName: v.systemName,
      users: v.users.size,
      sessions: v.sessions,
      issues: issuesBySystem.get(v.systemName) || 0
    })).sort((a,b) => b.issues - a.issues || b.sessions - a.sessions).slice(0,5);
  }, [sessions, analysisResult]);

  const usersAgg = useMemo(() => {
    const sess = sessions?.sessions || [];
    const usersMap = new Map();
    sess.forEach(s => {
      const v = usersMap.get(s.userId) || { userId: s.userId, systems: new Set(), sessions: 0 };
      v.systems.add(s.systemName);
      v.sessions += 1;
      usersMap.set(s.userId, v);
    });
    const issuesByUser = new Map();
    (analysisResult?.issues || []).forEach(i => (i.affectedUsers || []).forEach(u => issuesByUser.set(u, (issuesByUser.get(u)||0) + 1)));
    return [...usersMap.values()].map(v => ({
      userId: v.userId,
      systems: v.systems.size,
      sessions: v.sessions,
      issues: issuesByUser.get(v.userId) || 0
    })).sort((a,b) => b.issues - a.issues || b.sessions - a.sessions).slice(0,5);
  }, [sessions, analysisResult]);

  // Problem Devices: devices with active (Critical/Error/Warning) issues
  const problemDevices = useMemo(() => {
    const problemSystemsSet = new Set();
    const affectedUsersSet = new Set();
    (analysisResult?.issues || []).forEach(issue => {
      if (['Critical', 'Error', 'Warning'].includes(issue.severity)) {
        (issue.affectedSystems || []).forEach(sys => problemSystemsSet.add(sys));
        (issue.affectedUsers || []).forEach(usr => affectedUsersSet.add(usr));
      }
    });
    return {
      deviceCount: problemSystemsSet.size,
      employeeCount: affectedUsersSet.size,
      alertCount: activeAlerts
    };
  }, [analysisResult, activeAlerts]);

  // Filtered issues based on severity, category, date, and search
  const filteredIssues = useMemo(() => {
    let filtered = analysisResult?.issues || [];
    
    // Filter by date
    if (dateFilter !== 'all') {
      let cutoffDate = new Date();
      
      if (dateFilter === 'today') {
        cutoffDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === '7days') {
        cutoffDate.setDate(cutoffDate.getDate() - 7);
      } else if (dateFilter === '30days') {
        cutoffDate.setDate(cutoffDate.getDate() - 30);
      }
      
      filtered = filtered.filter(i => {
        // Check if issue has samples with timestamps
        if (!i.samples || i.samples.length === 0) return false;
        return i.samples.some(sample => {
          const sampleDate = new Date(sample.timestamp);
          return sampleDate >= cutoffDate;
        });
      });
    }
    
    // Filter by severity
    if (issueFilter !== 'all') {
      const severityMap = {
        'critical': 'Critical',
        'error': 'Error',
        'warning': 'Warning',
        'info': 'Information'
      };
      filtered = filtered.filter(i => i.severity === severityMap[issueFilter]);
    }
    
    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(i => i.category === categoryFilter);
    }
    
    // Filter by search query
    if (issueSearchQuery.trim()) {
      const query = issueSearchQuery.toLowerCase();
      filtered = filtered.filter(i => 
        i.description.toLowerCase().includes(query) ||
        i.category.toLowerCase().includes(query) ||
        i.severity.toLowerCase().includes(query)
      );
    }
    
    // Sort by severity rank then occurrences
    const sevRank = { Critical: 0, Error: 1, Warning: 2, Information: 3 };
    return filtered.sort((a,b) => (sevRank[a.severity] - sevRank[b.severity]) || (b.occurrences - a.occurrences));
  }, [analysisResult, issueFilter, categoryFilter, issueSearchQuery, dateFilter]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set();
    (analysisResult?.issues || []).forEach(i => cats.add(i.category));
    return ['all', ...Array.from(cats)];
  }, [analysisResult]);

  if (isAnalyzing) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <h2>Analyzing Logs...</h2>
        <p>Please wait while we process your log files</p>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔍</div>
        <h2>No Analysis Available</h2>
        <p>Run an analysis to see insights and statistics</p>
      </div>
    );
  }

  const analysis = analysisResult.analysis;
  const issues = analysisResult.issues;
  const statistics = analysisResult.statistics;


  return (
      <div className="dashboard">
        <FiltersBar
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          autoRefresh={autoRefresh}
          onAutoRefreshToggle={setAutoRefresh}
          onExport={() => {
            // CSV export of issues with root cause and solutions
            try {
              // Generate root cause and solutions mapping
              const generateRootCause = (category) => {
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

              const generateSolutions = (category) => {
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

              const rows = (issues || []).map(i => {
                const rootCause = i.rootCause && i.rootCause !== 'N/A' ? i.rootCause : generateRootCause(i.category);
                const solutions = (i.solution && i.solution !== 'N/A') 
                  ? (Array.isArray(i.solution) ? i.solution.join(' | ') : i.solution)
                  : generateSolutions(i.category).join(' | ');
                return [
                  i.issueId,
                  i.severity,
                  i.category,
                  i.description,
                  i.occurrences,
                  rootCause,
                  solutions,
                  (i.affectedUsers || []).join('; '),
                  (i.affectedSystems || []).join('; ')
                ];
              });
              const header = ['IssueId', 'Severity', 'Category', 'Description', 'Occurrences', 'Root Cause', 'Possible Solutions', 'Affected Users', 'Affected Systems'];
              const csv = [header, ...rows].map(r => r.map(x => `"${String(x || '').replace(/"/g,'""')}"`).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `issues_${new Date().toISOString().split('T')[0]}.csv`; a.click();
              URL.revokeObjectURL(url);
            } catch (err) {
              console.error('CSV export error:', err);
            }
          }}
        />
        <div className="dashboard-hero">
          <div className="hero-text">
            <p className="eyebrow">Employee Device Fleet</p>
            <h2>Fleet Health & Status</h2>
            <p className="subhead">Generated {typeof analysis.generated_at === 'string' ? new Date(analysis.generated_at).toLocaleString() : analysis.generated_at.toLocaleString()} • Model {analysis.model_used}</p>
          </div>
          <div className="hero-badges">
            <span className="pill">Devices {analysis.total_systems_analyzed.toLocaleString()}</span>
            <span className="pill pill-ghost">Issues {analysis.issues_found}</span>
            <span className="pill pill-ghost">LLM {analysis.llm_used ? 'On' : 'Off'}</span>
          </div>
        </div>

      {/* Stats + Health */}
      <div className="grid grid-cols-4 modern-grid">
        <div className="stat-card glass" style={{gridColumn: 'span 1'}}>
          <HealthScore statistics={statistics} />
        </div>

        {/* Combined Impacted Assets Component */}
        <div className="stat-card glass" style={{gridColumn: 'span 2', cursor: 'pointer'}} onClick={() => onNavigate && onNavigate('systems')}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%'}}>
            <div style={{flex: 1}}>
              <div style={{fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '12px', textTransform: 'uppercase'}}>Impacted Assets</div>
              
              {/* Devices Section */}
              <div style={{marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)'}}>
                <div style={{display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px'}}>
                  <div style={{fontSize: '28px', fontWeight: 700, color: 'var(--primary-color)'}}>
                    {analysis.total_systems_analyzed}
                  </div>
                  <div style={{fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500}}>Devices</div>
                </div>
                <div style={{fontSize: '12px', color: 'var(--text-light)'}}>
                  {problemDevices.deviceCount} with active issues
                </div>
              </div>

              {/* Users Section */}
              <div style={{marginBottom: '8px'}}>
                <div style={{display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px'}}>
                  <div style={{fontSize: '28px', fontWeight: 700, color: '#8b5cf6'}}>
                    {analysis.total_users_analyzed}
                  </div>
                  <div style={{fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500}}>Employees</div>
                </div>
                <div style={{fontSize: '12px', color: 'var(--text-light)'}}>
                  {problemDevices.employeeCount} affected by issues
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'center', minWidth: '100px'}}>
              <div style={{padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)'}}>
                <div style={{fontSize: '18px', fontWeight: 700, color: '#dc2626'}}>{statistics.by_severity.critical || 0}</div>
                <div style={{fontSize: '11px', color: 'var(--text-light)', marginTop: '2px'}}>Critical</div>
              </div>
              <div style={{padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)'}}>
                <div style={{fontSize: '18px', fontWeight: 700, color: '#ea580c'}}>{statistics.by_severity.error || 0}</div>
                <div style={{fontSize: '11px', color: 'var(--text-light)', marginTop: '2px'}}>Errors</div>
              </div>
              <div style={{padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)'}}>
                <div style={{fontSize: '18px', fontWeight: 700, color: '#eab308'}}>{statistics.by_severity.warning || 0}</div>
                <div style={{fontSize: '11px', color: 'var(--text-light)', marginTop: '2px'}}>Warnings</div>
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card glass capability-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-value">{Object.keys(statistics.by_category).length}</div>
            <div className="stat-label">Categories</div>
          </div>
          <div className="capability-tooltip">
            <div className="tooltip-title">Monitored Categories</div>
            <div className="capability-list">
              {Object.keys(statistics.by_category).map((category) => (
                <div key={category} className="capability-item">
                  <span className="capability-bullet">•</span>
                  <span>{category}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links / Navigation Tiles */}
      <div className="quick-links-grid">
        {[
          { id: 'systems', icon: '�', label: 'All Devices' },
          { id: 'users', icon: '👤', label: 'By Employee' },
          { id: 'applications', icon: '📦', label: 'Software' },
          { id: 'locations', icon: '📍', label: 'Locations' },
          { id: 'alerts', icon: '🚨', label: 'Alerts' },
          { id: 'network', icon: '🌐', label: 'Network' },
          { id: 'bootlogon', icon: '⚡', label: 'Performance' },
          { id: 'trends', icon: '📈', label: 'Analytics' },
          { id: 'reports', icon: '📋', label: 'Reports' },
        ].map(link => (
          <button key={link.id} className="quick-link" onClick={() => onNavigate && onNavigate(link.id)}>
            <span className="quick-link-icon">{link.icon}</span>
            <span className="quick-link-label">{link.label}</span>
          </button>
        ))}
      </div>

      {/* Severity Cards */}
      <div className="grid grid-cols-4 modern-grid">
        {statistics.by_severity.critical > 0 && (
          <div className="severity-card severity-critical">
            <div className="severity-card-header">
              <span className="severity-icon">🔴</span>
              <span className="severity-badge">Critical</span>
            </div>
            <div className="severity-card-value">{statistics.by_severity.critical}</div>
            <div className="severity-card-label">Critical Issues</div>
          </div>
        )}
        {statistics.by_severity.error > 0 && (
          <div className="severity-card severity-error">
            <div className="severity-card-header">
              <span className="severity-icon">🟠</span>
              <span className="severity-badge">Error</span>
            </div>
            <div className="severity-card-value">{statistics.by_severity.error}</div>
            <div className="severity-card-label">Error Issues</div>
          </div>
        )}
        {statistics.by_severity.warning > 0 && (
          <div className="severity-card severity-warning">
            <div className="severity-card-header">
              <span className="severity-icon">🟡</span>
              <span className="severity-badge">Warning</span>
            </div>
            <div className="severity-card-value">{statistics.by_severity.warning}</div>
            <div className="severity-card-label">Warning Issues</div>
          </div>
        )}
        {statistics.by_severity.information > 0 && (
          <div className="severity-card severity-info">
            <div className="severity-card-header">
              <span className="severity-icon">🔵</span>
              <span className="severity-badge">Info</span>
            </div>
            <div className="severity-card-value">{statistics.by_severity.information}</div>
            <div className="severity-card-label">Information Issues</div>
          </div>
        )}
      </div>

      {/* Consolidated Fleet Issues View */}
      <div className="card" style={{marginTop: '24px'}}>
        <div className="card-header" style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '16px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', width: '100%'}}>
            <div>
              <h3 className="card-title" style={{marginBottom: '8px'}}>Fleet Issues & Alerts</h3>
              <p style={{fontSize: '13px', color: 'var(--text-light)', margin: 0}}>
                {filteredIssues.length} of {analysisResult?.issues?.length || 0} issues
                {issueFilter !== 'all' || categoryFilter !== 'all' || issueSearchQuery ? ' (filtered)' : ''}
              </p>
            </div>
            
            <div style={{display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap'}}>
              <div style={{position: 'relative', minWidth: '240px'}}>
                <input
                  type="text"
                  placeholder="🔍 Search issues..."
                  value={issueSearchQuery}
                  onChange={(e) => setIssueSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Severity Filter Pills */}
        <div style={{padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-secondary)'}}>
          <span style={{fontSize: '13px', color: 'var(--text-secondary)', marginRight: '8px', fontWeight: 600}}>Severity:</span>
          {[
            {id: 'all', label: 'All', icon: '📋', color: 'var(--text-secondary)'},
            {id: 'critical', label: 'Critical', icon: '🔴', color: 'var(--critical-color)'},
            {id: 'error', label: 'Error', icon: '🟠', color: 'var(--error-color)'},
            {id: 'warning', label: 'Warning', icon: '🟡', color: 'var(--warning-color)'},
            {id: 'info', label: 'Info', icon: '🔵', color: 'var(--secondary-color)'}
          ].map(sev => (
            <button
              key={sev.id}
              onClick={() => setIssueFilter(sev.id)}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 500,
                border: issueFilter === sev.id ? `2px solid ${sev.color}` : '1px solid var(--border-color)',
                borderRadius: '20px',
                background: issueFilter === sev.id ? `${sev.color}15` : 'white',
                color: issueFilter === sev.id ? sev.color : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{sev.icon}</span>
              <span>{sev.label}</span>
            </button>
          ))}
        </div>

        {/* Date Range Filter */}
        <div style={{padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-secondary)'}}>  
          <span style={{fontSize: '13px', color: 'var(--text-secondary)', marginRight: '8px', fontWeight: 600}}>Date:</span>
          {[
            {id: 'all', label: 'All Time', icon: '📅'},
            {id: 'today', label: 'Today', icon: '📆'},
            {id: '7days', label: 'Last 7 Days', icon: '📊'},
            {id: '30days', label: 'Last 30 Days', icon: '📈'}
          ].map(date => (
            <button
              key={date.id}
              onClick={() => setDateFilter(date.id)}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 500,
                border: dateFilter === date.id ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                borderRadius: '16px',
                background: dateFilter === date.id ? '#1e40af15' : 'white',
                color: dateFilter === date.id ? 'var(--primary-color)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>{date.icon}</span>
              <span>{date.label}</span>
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div style={{padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-secondary)'}}>
          <span style={{fontSize: '13px', color: 'var(--text-secondary)', marginRight: '8px', fontWeight: 600}}>Category:</span>
          {categories.slice(0, 6).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 500,
                border: categoryFilter === cat ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                borderRadius: '16px',
                background: categoryFilter === cat ? '#1e40af15' : 'white',
                color: categoryFilter === cat ? 'var(--primary-color)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
          {categories.length > 6 && (
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: '5px 10px',
                fontSize: '12px',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                background: 'white',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {categories.slice(6).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}
        </div>

        {/* Issues Table */}
        {filteredIssues.length === 0 ? (
          <div style={{padding: '48px 20px', textAlign: 'center'}}>
            <div style={{fontSize: '48px', marginBottom: '16px'}}>🔍</div>
            <h3 style={{fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px'}}>No Issues Found</h3>
            <p style={{fontSize: '13px', color: 'var(--text-secondary)'}}>
              {issueSearchQuery || issueFilter !== 'all' || categoryFilter !== 'all' 
                ? 'Try adjusting your filters or search query'
                : 'Your fleet is running smoothly!'}
            </p>
          </div>
        ) : (
          <div style={{overflow: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)'}}>
                  <th style={{padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase'}}>
                    Severity
                  </th>
                  <th style={{padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase'}}>
                    Category
                  </th>
                  <th style={{padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase'}}>
                    Issue Details
                  </th>
                  <th style={{padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase'}}>
                    💻 Devices
                  </th>
                  <th style={{padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase'}}>
                    👥 Employees
                  </th>
                  <th style={{padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase'}}>
                    📊 Count
                  </th>
                  <th style={{padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase'}}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.map((issue, idx) => (
                  <tr 
                    key={issue.issueId}
                    onClick={() => setSelectedIssue(issue)}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      background: idx % 2 === 0 ? 'white' : 'var(--bg-secondary)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                    onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? 'white' : 'var(--bg-secondary)'}
                  >
                    <td style={{padding: '16px', whiteSpace: 'nowrap'}}>
                      <span className={`badge badge-${issue.severity.toLowerCase()}`} style={{fontSize: '11px', padding: '4px 10px'}}>
                        {issue.severity}
                      </span>
                    </td>
                    <td style={{padding: '16px', whiteSpace: 'nowrap'}}>
                      <span style={{padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)'}}>
                        {issue.category}
                      </span>
                    </td>
                    <td style={{padding: '16px'}}>
                      <div style={{marginBottom: '4px', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500}}>
                        {issue.description}
                      </div>
                      <div style={{fontSize: '12px', color: 'var(--text-light)'}}>
                        {issue.pattern && (
                          <span style={{fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)'}}>
                            {issue.pattern.substring(0, 40)}{issue.pattern.length > 40 ? '...' : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{padding: '16px', textAlign: 'center'}}>
                      <div style={{fontSize: '18px', fontWeight: 600, color: 'var(--primary-color)'}}>
                        {issue.affectedSystems?.length || 0}
                      </div>
                    </td>
                    <td style={{padding: '16px', textAlign: 'center'}}>
                      <div style={{fontSize: '18px', fontWeight: 600, color: '#8b5cf6'}}>
                        {issue.affectedUsers?.length || 0}
                      </div>
                    </td>
                    <td style={{padding: '16px', textAlign: 'center'}}>
                      <div style={{fontSize: '18px', fontWeight: 600, color: 'var(--success-color)'}}>
                        {issue.occurrences}
                      </div>
                    </td>
                    <td style={{padding: '16px', textAlign: 'right'}}>
                      <span style={{color: 'var(--secondary-color)', fontSize: '13px', fontWeight: 500}}>
                        View Details →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Combined Top Impacted Assets */}
      <div className="card" style={{marginTop: '24px'}}>
        <div className="card-header" style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '16px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'}}>
            <h3 className="card-title" style={{margin: 0}}>Top Impacted Assets</h3>
            
            <div style={{display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'}}>
              {/* View Toggle */}
              <div style={{display: 'flex', gap: '4px', background: 'var(--bg-secondary)', borderRadius: '6px', padding: '4px'}}>
                <button
                  onClick={() => setAssetViewMode('devices')}
                  style={{
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: 500,
                    border: 'none',
                    borderRadius: '4px',
                    background: assetViewMode === 'devices' ? 'white' : 'transparent',
                    color: assetViewMode === 'devices' ? 'var(--primary-color)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  💻 Devices
                </button>
                <button
                  onClick={() => setAssetViewMode('users')}
                  style={{
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: 500,
                    border: 'none',
                    borderRadius: '4px',
                    background: assetViewMode === 'users' ? 'white' : 'transparent',
                    color: assetViewMode === 'users' ? '#8b5cf6' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  👥 Employees
                </button>
              </div>

              {/* Issue Count Filter */}
              <select
                value={assetMinIssues}
                onChange={(e) => setAssetMinIssues(parseInt(e.target.value))}
                style={{
                  padding: '6px 10px',
                  fontSize: '13px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  background: 'white',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                <option value={0}>All Issues</option>
                <option value={1}>1+ Issues</option>
                <option value={2}>2+ Issues</option>
                <option value={3}>3+ Issues</option>
                <option value={5}>5+ Issues</option>
              </select>
            </div>
          </div>
        </div>

        {/* Combined Table View */}
        <div style={{overflow: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)'}}>
                {assetViewMode === 'devices' ? (
                  <>
                    <th style={{padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase'}}>
                      Device Name
                    </th>
                    <th style={{padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase'}}>
                      👥 Users
                    </th>
                    <th style={{padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase'}}>
                      📋 Sessions
                    </th>
                    <th style={{padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase'}}>
                      ⚠️ Issues
                    </th>
                  </>
                ) : (
                  <>
                    <th style={{padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase'}}>
                      Employee ID
                    </th>
                    <th style={{padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase'}}>
                      💻 Systems
                    </th>
                    <th style={{padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase'}}>
                      📋 Sessions
                    </th>
                    <th style={{padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase'}}>
                      ⚠️ Issues
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {assetViewMode === 'devices' ? (
                devicesAgg
                  .filter(d => d.issues >= assetMinIssues)
                  .map((d, idx) => (
                    <tr
                      key={d.systemName}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        background: idx % 2 === 0 ? 'white' : 'var(--bg-secondary)',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                      onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? 'white' : 'var(--bg-secondary)'}>
                      <td style={{padding: '14px 16px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500}}>
                        {d.systemName}
                      </td>
                      <td style={{padding: '14px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--text-primary)'}}>
                        <span style={{padding: '4px 8px', background: '#eff6ff', borderRadius: '4px', color: 'var(--primary-color)', fontWeight: 600}}>
                          {d.users}
                        </span>
                      </td>
                      <td style={{padding: '14px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)'}}>
                        {d.sessions}
                      </td>
                      <td style={{padding: '14px 16px', textAlign: 'center'}}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 600,
                          background: d.issues >= 3 ? '#dc262622' : d.issues >= 2 ? '#eab30822' : '#10b98122',
                          color: d.issues >= 3 ? '#dc2626' : d.issues >= 2 ? '#eab308' : '#10b981'
                        }}>
                          {d.issues}
                        </span>
                      </td>
                    </tr>
                  ))
              ) : (
                usersAgg
                  .filter(u => u.issues >= assetMinIssues)
                  .map((u, idx) => (
                    <tr
                      key={u.userId}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        background: idx % 2 === 0 ? 'white' : 'var(--bg-secondary)',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                      onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? 'white' : 'var(--bg-secondary)'}>
                      <td style={{padding: '14px 16px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500}}>
                        {u.userId}
                      </td>
                      <td style={{padding: '14px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--text-primary)'}}>
                        <span style={{padding: '4px 8px', background: '#f3e8ff', borderRadius: '4px', color: '#8b5cf6', fontWeight: 600}}>
                          {u.systems}
                        </span>
                      </td>
                      <td style={{padding: '14px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)'}}>
                        {u.sessions}
                      </td>
                      <td style={{padding: '14px 16px', textAlign: 'center'}}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 600,
                          background: u.issues >= 3 ? '#dc262622' : u.issues >= 2 ? '#eab30822' : '#10b98122',
                          color: u.issues >= 3 ? '#dc2626' : u.issues >= 2 ? '#eab308' : '#10b981'
                        }}>
                          {u.issues}
                        </span>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>

          {((assetViewMode === 'devices' && devicesAgg.filter(d => d.issues >= assetMinIssues).length === 0) ||
            (assetViewMode === 'users' && usersAgg.filter(u => u.issues >= assetMinIssues).length === 0)) && (
            <div style={{padding: '40px 20px', textAlign: 'center'}}>
              <div style={{fontSize: '36px', marginBottom: '12px'}}>📊</div>
              <p style={{fontSize: '13px', color: 'var(--text-secondary)', margin: 0}}>
                No assets found matching your filter
              </p>
            </div>
          )}
        </div>
      </div>

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
                <span className={`badge badge-${selectedIssue.severity.toLowerCase()}`}>{selectedIssue.severity}</span>
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
                <p className="label">Affected Users</p>
                <span>{selectedIssue.affectedUsers.join(', ') || '—'}</span>
              </div>
              <div className="drawer-card">
                <p className="label">Affected Systems</p>
                <span>{selectedIssue.affectedSystems.join(', ') || '—'}</span>
              </div>
            </div>

            <div className="drawer-section">
              <p className="label">Root Cause</p>
              <p>{selectedIssue.rootCause || 'Not provided'}</p>
            </div>

            <div className="drawer-section">
              <p className="label">Recommended Fix</p>
              <p>{selectedIssue.solution || 'Not provided'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
