import React, { useMemo, useState } from 'react';
import './LocationsView.css';

// Map DHCP scopes / SSIDs / APs to locations (customize for your environment)
const LOCATION_MAPPINGS = {
  ssid: {
    // 'Corp-WiFi': 'HQ',
    // 'Branch-Guest': 'Branch-01'
  },
  ap: {
    // 'AP-01': 'HQ-1F',
    // 'AP-22': 'Branch-01'
  },
  dhcpScope: {
    // '10.10.0.0': 'HQ',
    // '10.20.0.0': 'Branch-01'
  },
  ipPrefix: {
    // '10.10.': 'HQ',
    // '10.20.': 'Branch-01'
  }
};

// Extract location from system name (e.g., "soc-5CG5233YBT" -> "SOC")
const extractLocationFromSystemName = (systemName) => {
  if (!systemName) return 'Unknown';
  // Try to extract prefix before dash or first 3 characters
  const match = systemName.match(/^([a-zA-Z]+)/);
  return match ? match[1].toUpperCase() : systemName.substring(0, 3).toUpperCase();
};

const extractNetworkLocation = (message) => {
  if (!message) return null;
  const getMatch = (regex) => {
    const match = message.match(regex);
    return match && match[1] ? match[1].trim() : null;
  };

  const ssid = getMatch(/SSID\s*[:=]\s*"?([^"\n\r]+)"?/i);
  if (ssid && LOCATION_MAPPINGS.ssid[ssid]) return LOCATION_MAPPINGS.ssid[ssid];

  const ap = getMatch(/(?:Access\s*Point|BSSID|AP)\s*[:=]\s*"?([^"\n\r]+)"?/i);
  if (ap && LOCATION_MAPPINGS.ap[ap]) return LOCATION_MAPPINGS.ap[ap];

  const scope = getMatch(/(?:Scope\s*Name|DHCP\s*Scope|Scope)\s*[:=]\s*"?([^"\n\r]+)"?/i);
  if (scope && LOCATION_MAPPINGS.dhcpScope[scope]) return LOCATION_MAPPINGS.dhcpScope[scope];

  const ip = getMatch(/\b(?:IP\s*Address|IPv4\s*Address|Client\s*IP)\s*[:=]\s*([0-9]{1,3}(?:\.[0-9]{1,3}){3})\b/i);
  if (ip) {
    const prefix = Object.keys(LOCATION_MAPPINGS.ipPrefix).find(p => ip.startsWith(p));
    if (prefix) return LOCATION_MAPPINGS.ipPrefix[prefix];
  }

  return null;
};

export default function LocationsView({ analysisResult, sessions }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [healthFilter, setHealthFilter] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid | table

  const systemLocationOverrides = useMemo(() => {
    const map = new Map();
    (analysisResult?.issues || []).forEach(issue => {
      (issue.samples || []).forEach(sample => {
        const location = extractNetworkLocation(sample.message);
        if (location && sample.system) {
          map.set(sample.system, location);
        }
      });
    });
    return map;
  }, [analysisResult]);

  const resolveLocation = (systemName) => {
    return systemLocationOverrides.get(systemName) || extractLocationFromSystemName(systemName);
  };

  // Calculate location health based on severity counts
  const getLocationHealth = (severityCounts) => {
    const critical = severityCounts.Critical || 0;
    const error = severityCounts.Error || 0;
    const warning = severityCounts.Warning || 0;

    if (critical > 0) return { 
      score: 'Critical', 
      color: '#991b1b', 
      bg: '#fee2e2' 
    };
    if (error > 2) return { 
      score: 'Poor', 
      color: '#9a3412', 
      bg: '#fed7aa' 
    };
    if (warning > 3 || error > 0) return { 
      score: 'Fair', 
      color: '#92400e', 
      bg: '#fef3c7' 
    };
    return { 
      score: 'Healthy', 
      color: '#065f46', 
      bg: '#d1fae5' 
    };
  };

  // Aggregate data by location
  const locationData = useMemo(() => {
    if (!sessions?.sessions || !analysisResult?.issues) return [];

    const locationMap = new Map();

    // Process sessions to get devices and users per location
    sessions.sessions.forEach(session => {
      const location = resolveLocation(session.systemName);
      
      if (!locationMap.has(location)) {
        locationMap.set(location, {
          location,
          devices: new Set(),
          users: new Set(),
          issues: [],
          severityCounts: { Critical: 0, Error: 0, Warning: 0, Information: 0 }
        });
      }

      const loc = locationMap.get(location);
      loc.devices.add(session.systemName);
      loc.users.add(session.userId);
    });

    // Process issues and assign to locations based on affected systems
    analysisResult.issues.forEach(issue => {
      (issue.affectedSystems || []).forEach(system => {
        const location = resolveLocation(system);
        if (locationMap.has(location)) {
          const loc = locationMap.get(location);
          loc.issues.push({
            ...issue,
            issueId: issue.description // Use description as unique id
          });
          loc.severityCounts[issue.severity] = (loc.severityCounts[issue.severity] || 0) + 1;
        }
      });
    });

    // Convert to array and add computed properties
    return Array.from(locationMap.values()).map(loc => ({
      ...loc,
      deviceCount: loc.devices.size,
      userCount: loc.users.size,
      issueCount: loc.issues.length,
      devices: Array.from(loc.devices),
      users: Array.from(loc.users),
      health: getLocationHealth(loc.severityCounts)
    }));
  }, [sessions, analysisResult]);

  // Filter locations
  const filteredLocations = useMemo(() => {
    return locationData.filter(loc => {
      const matchesSearch = loc.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesHealth = healthFilter === 'all' || loc.health.score.toLowerCase() === healthFilter.toLowerCase();
      return matchesSearch && matchesHealth;
    });
  }, [locationData, searchQuery, healthFilter]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    return {
      totalLocations: locationData.length,
      totalDevices: locationData.reduce((sum, loc) => sum + loc.deviceCount, 0),
      totalUsers: new Set(locationData.flatMap(loc => loc.users)).size,
      totalIssues: locationData.reduce((sum, loc) => sum + loc.issueCount, 0),
      criticalLocations: locationData.filter(loc => loc.health.score === 'Critical').length
    };
  }, [locationData]);

  if (selectedLocation) {
    return (
      <div className="location-detail-modal" onClick={() => setSelectedLocation(null)}>
        <div className="location-detail-panel" onClick={(e) => e.stopPropagation()}>
          <div className="location-detail-header">
            <div className="location-detail-title-section">
              <p className="location-detail-kicker">Location Details</p>
              <h2 className="location-detail-title">📍 {selectedLocation.location}</h2>
              <p className="location-detail-subtitle">
                {selectedLocation.deviceCount} devices • {selectedLocation.userCount} users
              </p>
            </div>
            <button className="location-detail-close" onClick={() => setSelectedLocation(null)}>
              ×
            </button>
          </div>

          <div className="location-detail-body">
            {/* Statistics */}
            <div className="location-detail-stats">
              <div className="location-detail-stat">
                <div className="location-detail-stat-value">{selectedLocation.deviceCount}</div>
                <div className="location-detail-stat-label">Devices</div>
              </div>
              <div className="location-detail-stat">
                <div className="location-detail-stat-value">{selectedLocation.userCount}</div>
                <div className="location-detail-stat-label">Users</div>
              </div>
              <div className="location-detail-stat">
                <div className="location-detail-stat-value">{selectedLocation.issueCount}</div>
                <div className="location-detail-stat-label">Issues</div>
              </div>
              <div className="location-detail-stat">
                <div className="location-detail-stat-value" style={{ color: selectedLocation.health.color }}>
                  {selectedLocation.health.score}
                </div>
                <div className="location-detail-stat-label">Health</div>
              </div>
            </div>

            {/* Devices */}
            <div className="location-detail-section">
              <h3 className="location-detail-section-title">Devices ({selectedLocation.deviceCount})</h3>
              <div className="location-devices-list">
                {selectedLocation.devices.map(device => {
                  const deviceIssues = selectedLocation.issues.filter(i => 
                    (i.affectedSystems || []).includes(device)
                  ).length;
                  return (
                    <div key={device} className="location-device-item">
                      <span className="location-device-icon">🖥️</span>
                      <span className="location-device-name">{device}</span>
                      <span className="location-device-issues">{deviceIssues} issues</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Users */}
            <div className="location-detail-section">
              <h3 className="location-detail-section-title">Users ({selectedLocation.userCount})</h3>
              <div className="location-users-list">
                {selectedLocation.users.slice(0, 10).map(user => {
                  const userIssues = selectedLocation.issues.filter(i => 
                    (i.affectedUsers || []).includes(user)
                  ).length;
                  return (
                    <div key={user} className="location-user-item">
                      <span className="location-user-icon">👤</span>
                      <span className="location-user-name">{user}</span>
                      <span className="location-user-issues">{userIssues} issues</span>
                    </div>
                  );
                })}
                {selectedLocation.users.length > 10 && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '8px' }}>
                    + {selectedLocation.users.length - 10} more users
                  </div>
                )}
              </div>
            </div>

            {/* Issues */}
            <div className="location-detail-section">
              <h3 className="location-detail-section-title">Issues ({selectedLocation.issueCount})</h3>
              <div className="location-issues-list">
                {selectedLocation.issues.slice(0, 10).map((issue, idx) => (
                  <div 
                    key={idx} 
                    className={`location-issue-item ${issue.severity.toLowerCase()}`}
                  >
                    <div className="location-issue-header">
                      <span className="location-issue-title">{issue.description}</span>
                      <span className="location-issue-count">{issue.occurrences}×</span>
                    </div>
                    <div className="location-issue-meta">
                      <span>🏷️ {issue.category}</span>
                      <span>⚠️ {issue.severity}</span>
                    </div>
                  </div>
                ))}
                {selectedLocation.issues.length > 10 && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '8px' }}>
                    + {selectedLocation.issues.length - 10} more issues
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="locations-view">
      {/* Header */}
      <div className="locations-header">
        <div>
          <h2>Device Locations</h2>
          <p>Issue distribution and health monitoring by location</p>
        </div>
        <div className="locations-controls">
          <div className="locations-view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              Table
            </button>
          </div>
          <div className="location-search-box">
            <span className="location-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="location-search-input"
            />
          </div>
          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="location-filter-select"
          >
            <option value="all">All Health</option>
            <option value="critical">Critical</option>
            <option value="poor">Poor</option>
            <option value="fair">Fair</option>
            <option value="healthy">Healthy</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="location-summary">
        <div className="location-summary-card">
          <span className="location-summary-label">Locations</span>
          <span className="location-summary-value">{summary.totalLocations}</span>
          <span className="location-summary-subtitle">Active sites</span>
        </div>
        <div className="location-summary-card">
          <span className="location-summary-label">Devices</span>
          <span className="location-summary-value">{summary.totalDevices}</span>
          <span className="location-summary-subtitle">Fleet-wide</span>
        </div>
        <div className="location-summary-card">
          <span className="location-summary-label">Users</span>
          <span className="location-summary-value">{summary.totalUsers}</span>
          <span className="location-summary-subtitle">Total employees</span>
        </div>
        <div className="location-summary-card">
          <span className="location-summary-label">Issues</span>
          <span className="location-summary-value">{summary.totalIssues}</span>
          <span className="location-summary-subtitle">Across all locations</span>
        </div>
        {summary.criticalLocations > 0 && (
          <div className="location-summary-card">
            <span className="location-summary-label">Critical</span>
            <span className="location-summary-value" style={{ color: '#dc2626' }}>
              {summary.criticalLocations}
            </span>
            <span className="location-summary-subtitle">Needs attention</span>
          </div>
        )}
      </div>

      {/* Location Views */}
      {filteredLocations.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="locations-grid">
            {filteredLocations.map(location => (
              <div 
                key={location.location} 
                className="location-card"
                onClick={() => setSelectedLocation(location)}
              >
                <div className="location-card-header">
                  <div className="location-info">
                    <h3 className="location-name">📍 {location.location}</h3>
                    <p className="location-region">Site Location</p>
                  </div>
                  <span 
                    className="location-health-badge"
                    style={{ 
                      backgroundColor: location.health.bg,
                      color: location.health.color 
                    }}
                  >
                    {location.health.score}
                  </span>
                </div>

                <div className="location-metrics">
                  <div className="location-metric">
                    <span className="location-metric-value">{location.deviceCount}</span>
                    <span className="location-metric-label">Devices</span>
                  </div>
                  <div className="location-metric">
                    <span className="location-metric-value">{location.userCount}</span>
                    <span className="location-metric-label">Users</span>
                  </div>
                  <div className="location-metric">
                    <span className="location-metric-value">{location.issueCount}</span>
                    <span className="location-metric-label">Issues</span>
                  </div>
                </div>

                {location.issueCount > 0 && (
                  <div className="location-issues-preview">
                    <p className="location-issues-title">Issue Distribution</p>
                    <div className="location-severity-distribution">
                      {location.severityCounts.Critical > 0 && (
                        <span className="location-severity-chip critical">
                          🛑 {location.severityCounts.Critical}
                        </span>
                      )}
                      {location.severityCounts.Error > 0 && (
                        <span className="location-severity-chip error">
                          🔴 {location.severityCounts.Error}
                        </span>
                      )}
                      {location.severityCounts.Warning > 0 && (
                        <span className="location-severity-chip warning">
                          ⚠️ {location.severityCounts.Warning}
                        </span>
                      )}
                      {location.severityCounts.Information > 0 && (
                        <span className="location-severity-chip info">
                          ℹ️ {location.severityCounts.Information}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="locations-table">
            <div className="locations-table-header">
              <div>Location</div>
              <div>Health</div>
              <div>Devices</div>
              <div>Users</div>
              <div>Issues</div>
              <div>Critical</div>
              <div>Error</div>
              <div>Warning</div>
              <div>Info</div>
            </div>
            {filteredLocations.map(location => (
              <div
                key={location.location}
                className="locations-table-row"
                onClick={() => setSelectedLocation(location)}
              >
                <div className="locations-table-cell location-name-cell">📍 {location.location}</div>
                <div className="locations-table-cell">
                  <span
                    className="location-health-badge"
                    style={{ backgroundColor: location.health.bg, color: location.health.color }}
                  >
                    {location.health.score}
                  </span>
                </div>
                <div className="locations-table-cell">{location.deviceCount}</div>
                <div className="locations-table-cell">{location.userCount}</div>
                <div className="locations-table-cell">{location.issueCount}</div>
                <div className="locations-table-cell">{location.severityCounts.Critical || 0}</div>
                <div className="locations-table-cell">{location.severityCounts.Error || 0}</div>
                <div className="locations-table-cell">{location.severityCounts.Warning || 0}</div>
                <div className="locations-table-cell">{location.severityCounts.Information || 0}</div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="locations-empty">
          <div className="locations-empty-icon">📍</div>
          <h3>No locations found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
