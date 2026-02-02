import React, { useMemo, useState } from 'react';
import './Trends.css';

export default function Trends({ analysisResult }) {
  const hasData = Boolean(analysisResult?.analysis);
  const analysis = analysisResult?.analysis || {};

  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [minOccurrences, setMinOccurrences] = useState(1);
  const [showOnlyActionable, setShowOnlyActionable] = useState(false);

  const issues = useMemo(() => analysisResult?.issues || [], [analysisResult?.issues]);

  const categoriesList = useMemo(() => {
    const set = new Set();
    issues.forEach(i => set.add(i.category || 'Uncategorized'));
    return Array.from(set).sort();
  }, [issues]);

  const getIssueDates = (issue) => {
    const timestamps = (issue.samples || [])
      .map(s => new Date(s.timestamp))
      .filter(d => !Number.isNaN(d.getTime()));
    if (!timestamps.length) return { firstSeen: null, lastSeen: null };
    return {
      firstSeen: new Date(Math.min(...timestamps)),
      lastSeen: new Date(Math.max(...timestamps))
    };
  };

  const hasAction = (issue) => {
    const rootOk = issue.rootCause && issue.rootCause !== 'N/A';
    const solOk = issue.solution && issue.solution !== 'N/A' && (Array.isArray(issue.solution) ? issue.solution.length > 0 : true);
    return Boolean(rootOk || solOk);
  };

  const filteredIssues = useMemo(() => {
    return issues.filter(i => {
      if (severityFilter !== 'all' && i.severity !== severityFilter) return false;
      if (categoryFilter !== 'all' && (i.category || 'Uncategorized') !== categoryFilter) return false;
      if (minOccurrences > 1 && (i.occurrences || 0) < minOccurrences) return false;
      if (showOnlyActionable && !hasAction(i)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${i.description || ''} ${i.category || ''} ${i.pattern || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [issues, severityFilter, categoryFilter, minOccurrences, showOnlyActionable, searchQuery]);

  const severityCounts = useMemo(() => {
    const base = { Critical: 0, Error: 0, Warning: 0, Information: 0 };
    filteredIssues.forEach(i => {
      base[i.severity] = (base[i.severity] || 0) + 1;
    });
    return base;
  }, [filteredIssues]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    filteredIssues.forEach(i => {
      const key = i.category || 'Uncategorized';
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [filteredIssues]);

  const topCategories = useMemo(() => {
    return Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [categoryCounts]);

  const impactedTotals = useMemo(() => {
    const users = new Set();
    const systems = new Set();
    filteredIssues.forEach(i => {
      (i.affectedUsers || []).forEach(u => users.add(u));
      (i.affectedSystems || []).forEach(s => systems.add(s));
    });
    return { users: users.size, systems: systems.size };
  }, [filteredIssues]);

  const actionableItems = useMemo(() => {
    const severityWeight = { Critical: 4, Error: 3, Warning: 2, Information: 1 };
    return [...filteredIssues]
      .sort((a, b) => {
        const scoreA = (severityWeight[a.severity] || 0) * 100 + (a.occurrences || 0);
        const scoreB = (severityWeight[b.severity] || 0) * 100 + (b.occurrences || 0);
        return scoreB - scoreA;
      })
      .slice(0, 8)
      .map(i => {
        const rootCause = i.rootCause && i.rootCause !== 'N/A' ? i.rootCause : 'Review event details and recent changes.';
        const solution = Array.isArray(i.solution)
          ? i.solution.join(' | ')
          : (i.solution && i.solution !== 'N/A' ? i.solution : 'Validate configuration, update drivers, and re-test.');
        const { firstSeen, lastSeen } = getIssueDates(i);
        return {
          ...i,
          rootCause,
          solution,
          firstSeen,
          lastSeen
        };
      });
  }, [filteredIssues]);

  const riskScore = useMemo(() => {
    const score = (severityCounts.Critical * 25) + (severityCounts.Error * 15) + (severityCounts.Warning * 5);
    return Math.min(100, score);
  }, [severityCounts]);

  const readinessMetrics = useMemo(() => {
    const total = filteredIssues.length;
    const actionReady = filteredIssues.filter(hasAction).length;
    const withSamples = filteredIssues.filter(i => (i.samples || []).length > 0).length;
    const occurrences = filteredIssues.reduce((sum, i) => sum + (i.occurrences || 0), 0);
    const criticalError = (severityCounts.Critical + severityCounts.Error);
    return {
      total,
      actionReady,
      withSamples,
      avgOccurrences: total ? Math.round(occurrences / total) : 0,
      criticalErrorShare: total ? Math.round((criticalError / total) * 100) : 0
    };
  }, [filteredIssues, severityCounts]);

  const keiCards = useMemo(() => {
    const actionReadyRate = readinessMetrics.total
      ? Math.round((readinessMetrics.actionReady / readinessMetrics.total) * 100)
      : 0;
    return [
      {
        label: 'Risk Index',
        value: riskScore,
        helper: 'Composite severity exposure',
        calculation: `Formula: (Critical × 25) + (Error × 15) + (Warning × 5) = (${severityCounts.Critical} × 25) + (${severityCounts.Error} × 15) + (${severityCounts.Warning} × 5) = ${riskScore} (capped at 100)`,
        tone: riskScore >= 60 ? 'critical' : riskScore >= 30 ? 'warning' : 'healthy'
      },
      {
        label: 'Action Readiness',
        value: `${actionReadyRate}%`,
        helper: `${readinessMetrics.actionReady}/${readinessMetrics.total} issues`,
        calculation: `Percentage of issues with actionable remediation guidance. Calculated as: (${readinessMetrics.actionReady} issues with root cause & solutions / ${readinessMetrics.total} total issues) × 100 = ${actionReadyRate}%`,
        tone: actionReadyRate >= 70 ? 'healthy' : actionReadyRate >= 40 ? 'warning' : 'critical'
      },
      {
        label: 'Critical/Error Share',
        value: `${readinessMetrics.criticalErrorShare}%`,
        helper: 'of current view',
        calculation: `Percentage of high-severity issues. Calculated as: ((${severityCounts.Critical} Critical + ${severityCounts.Error} Error) / ${readinessMetrics.total} total issues) × 100 = ${readinessMetrics.criticalErrorShare}%`,
        tone: readinessMetrics.criticalErrorShare >= 40 ? 'critical' : readinessMetrics.criticalErrorShare >= 20 ? 'warning' : 'healthy'
      },
      {
        label: 'Impacted Assets',
        value: `${impactedTotals.systems + impactedTotals.users}`,
        helper: `${impactedTotals.systems} systems, ${impactedTotals.users} users`,
        calculation: `Total unique assets affected across all issues. Calculated as: ${impactedTotals.systems} unique systems + ${impactedTotals.users} unique users = ${impactedTotals.systems + impactedTotals.users} total assets`,
        tone: impactedTotals.systems >= 10 ? 'warning' : 'healthy'
      },
      {
        label: 'Avg Recurrence',
        value: readinessMetrics.avgOccurrences,
        helper: 'per issue',
        calculation: `Average number of times each issue occurs. Calculated as: ${filteredIssues.reduce((sum, i) => sum + (i.occurrences || 0), 0)} total occurrences / ${readinessMetrics.total} issues = ${readinessMetrics.avgOccurrences} avg per issue`,
        tone: readinessMetrics.avgOccurrences >= 5 ? 'warning' : 'healthy'
      }
    ];
  }, [readinessMetrics, riskScore, impactedTotals, severityCounts, filteredIssues]);

  const topRecurring = useMemo(() => {
    return [...filteredIssues]
      .sort((a, b) => (b.occurrences || 0) - (a.occurrences || 0))
      .slice(0, 5)
      .map(i => ({
        id: i.issueId,
        description: i.description,
        occurrences: i.occurrences || 0,
        severity: i.severity
      }));
  }, [filteredIssues]);

  const focusAreas = useMemo(() => topCategories.slice(0, 3), [topCategories]);

  const formatDate = (value) => {
    if (!value) return 'Unknown';
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? 'Unknown' : dt.toLocaleString();
  };

  const exportAnalyticsCsv = () => {
    try {
      const rows = (filteredIssues || []).map(i => {
        const rootCause = i.rootCause && i.rootCause !== 'N/A' ? i.rootCause : 'Review event details and recent changes.';
        const solutions = Array.isArray(i.solution)
          ? i.solution.join(' | ')
          : (i.solution && i.solution !== 'N/A' ? i.solution : 'Validate configuration, update drivers, and re-test.');
        const { firstSeen, lastSeen } = getIssueDates(i);
        return [
          i.issueId,
          i.severity,
          i.category,
          i.description,
          i.occurrences,
          rootCause,
          solutions,
          formatDate(firstSeen),
          formatDate(lastSeen),
          (i.affectedUsers || []).join('; '),
          (i.affectedSystems || []).join('; ')
        ];
      });
      const header = ['IssueId', 'Severity', 'Category', 'Description', 'Occurrences', 'Root Cause', 'Possible Solutions', 'First Seen', 'Last Seen', 'Affected Users', 'Affected Systems'];
      const csv = [header, ...rows].map(r => r.map(x => `"${String(x || '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `enterprise_analytics_${new Date().toISOString().split('T')[0]}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Analytics export error:', err);
    }
  };

  const maxSeverity = Math.max(...Object.values(severityCounts), 1);
  const maxCategory = Math.max(...topCategories.map(c => c.count), 1);

  return (
    <div className="trends">
      <div className="trends-header">
        <div>
          <h2>Enterprise Analytics</h2>
          <p className="trends-subtitle">Actionable insights for fleet reliability, risk, and remediation</p>
        </div>
        <div className="trends-actions">
          <div className="trends-filters">
            <input
              className="trends-filter"
              placeholder="Search issues, categories, patterns"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select className="trends-filter" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
              <option value="all">All severities</option>
              <option value="Critical">Critical</option>
              <option value="Error">Error</option>
              <option value="Warning">Warning</option>
              <option value="Information">Information</option>
            </select>
            <select className="trends-filter" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All categories</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select className="trends-filter" value={minOccurrences} onChange={(e) => setMinOccurrences(Number(e.target.value))}>
              <option value={1}>All occurrences</option>
              <option value={3}>3+ occurrences</option>
              <option value={5}>5+ occurrences</option>
              <option value={10}>10+ occurrences</option>
            </select>
            <label className="trends-toggle">
              <input
                type="checkbox"
                checked={showOnlyActionable}
                onChange={(e) => setShowOnlyActionable(e.target.checked)}
              />
              Action-ready only
            </label>
          </div>
          <button className="btn btn-secondary" onClick={exportAnalyticsCsv}>Export Analytics CSV</button>
        </div>
      </div>

      {!hasData && (
        <div className="empty-state">
          <div className="empty-icon">📈</div>
          <h2>No Analytics Data</h2>
          <p>Run an analysis to generate fleet analytics</p>
        </div>
      )}

      {hasData && (
        <div className="trends-layout">
          <div className="trends-hero">
            <div className="hero-main">
              <div className="hero-title">Fleet posture & priority view</div>
              <div className="hero-subtitle">Focus areas surfaced from live incident signals</div>
              <div className="hero-metrics">
                <div className="hero-metric">
                  <span className="metric-label">Issues in view</span>
                  <span className="metric-value">{readinessMetrics.total}</span>
                </div>
                <div className="hero-metric">
                  <span className="metric-label">Action-ready</span>
                  <span className="metric-value">{readinessMetrics.actionReady}</span>
                </div>
                <div className="hero-metric">
                  <span className="metric-label">Risk index</span>
                  <span className={`metric-value ${riskScore >= 60 ? 'tone-critical' : riskScore >= 30 ? 'tone-warning' : 'tone-healthy'}`}>{riskScore}</span>
                </div>
                <div className="hero-metric">
                  <span className="metric-label">Impacted assets</span>
                  <span className="metric-value">{impactedTotals.systems}sys / {impactedTotals.users}usr</span>
                </div>
              </div>
              <div className="hero-actions">
                <button className="btn btn-primary" onClick={exportAnalyticsCsv}>Export decision pack</button>
                <button className="btn btn-secondary">Share briefing</button>
              </div>
            </div>
            <div className="hero-focus">
              <div className="focus-title">Focus areas</div>
              {focusAreas.length === 0 && <div className="empty-row">No focus areas yet</div>}
              <div className="focus-list">
                {focusAreas.map(area => (
                  <div key={area.name} className="focus-chip">
                    <span>{area.name}</span>
                    <strong>{area.count}</strong>
                  </div>
                ))}
              </div>
              <div className="focus-note">Prioritize remediation for the highest volume categories.</div>
            </div>
          </div>

          <div className="trends-grid">
          <div className="trend-card span-2 kei-card">
            <div className="trend-title">Key Enterprise Indicators (KEI)</div>
            <div className="kei-grid">
              {keiCards.map(card => (
                <div 
                  key={card.label} 
                  className={`kei-item kei-${card.tone}`}
                  title={card.calculation}
                >
                  <div className="kei-label">{card.label}</div>
                  <div className="kei-value">{card.value}</div>
                  <div className="kei-helper">{card.helper}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="trend-card kpi-card">
            <div className="trend-title">Operational Summary</div>
            <div className="kpi-grid">
              <div className="kpi-item">
                <div className="kpi-value">{analysis.total_systems_analyzed || 0}</div>
                <div className="kpi-label">Devices analyzed</div>
              </div>
              <div className="kpi-item">
                <div className="kpi-value">{analysis.total_users_analyzed || 0}</div>
                <div className="kpi-label">Users analyzed</div>
              </div>
              <div className="kpi-item">
                <div className="kpi-value">{analysis.total_logs_processed || 0}</div>
                <div className="kpi-label">Logs processed</div>
              </div>
              <div className="kpi-item">
                <div className="kpi-value">{analysis.issues_found || 0}</div>
                <div className="kpi-label">Issues detected</div>
              </div>
              <div className="kpi-item">
                <div className={`kpi-value ${riskScore >= 60 ? 'risk-high' : riskScore >= 30 ? 'risk-mid' : 'risk-low'}`}>{riskScore}</div>
                <div className="kpi-label">Risk score</div>
              </div>
              <div className="kpi-item">
                <div className="kpi-value">{formatDate(analysis.generated_at)}</div>
                <div className="kpi-label">Last analysis run</div>
              </div>
            </div>
            <div className="kpi-note">
              Showing {readinessMetrics.total} issues in current view • {readinessMetrics.actionReady} action-ready
            </div>
          </div>

          <div className="trend-card">
            <div className="trend-title">Readiness & Coverage</div>
            <div className="impact-grid">
              <div className="impact-item">
                <div className="impact-value">{readinessMetrics.actionReady}</div>
                <div className="impact-label">Action-ready issues</div>
              </div>
              <div className="impact-item">
                <div className="impact-value">{readinessMetrics.withSamples}</div>
                <div className="impact-label">Issues with samples</div>
              </div>
              <div className="impact-item">
                <div className="impact-value">{readinessMetrics.avgOccurrences}</div>
                <div className="impact-label">Avg occurrences</div>
              </div>
              <div className="impact-item">
                <div className="impact-value">{readinessMetrics.criticalErrorShare}%</div>
                <div className="impact-label">Critical/Error share</div>
              </div>
            </div>
          </div>

          <div className="trend-card">
            <div className="trend-title">Severity Distribution</div>
            <div className="bar-list">
              {Object.entries(severityCounts).map(([name, count]) => (
                <div key={name} className="bar-row">
                  <div className="bar-label">{name}</div>
                  <div className="bar-track">
                    <div className={`bar-fill severity-${name.toLowerCase()}`} style={{ width: `${Math.round((count / maxSeverity) * 100)}%` }} />
                  </div>
                  <div className="bar-value">{count}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="trend-card">
            <div className="trend-title">Top Categories</div>
            <div className="bar-list">
              {topCategories.length === 0 && <div className="empty-row">No category data</div>}
              {topCategories.map(cat => (
                <div key={cat.name} className="bar-row">
                  <div className="bar-label">{cat.name}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${Math.round((cat.count / maxCategory) * 100)}%` }} />
                  </div>
                  <div className="bar-value">{cat.count}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="trend-card">
            <div className="trend-title">Top Recurring Issues</div>
            <div className="recurring-list">
              {topRecurring.length === 0 && <div className="empty-row">No recurring issues</div>}
              {topRecurring.map(item => (
                <div key={item.id} className="recurring-row">
                  <div className="recurring-main">
                    <div className="recurring-title">{item.description}</div>
                    <div className="recurring-meta">
                      <span className={`severity-tag severity-${item.severity.toLowerCase()}`}>{item.severity}</span>
                      <span className="recurring-divider">•</span>
                      <span className="recurring-detail">{item.category || 'Uncategorized'}</span>
                    </div>
                  </div>
                  <div className="recurring-badge">
                    <span className="badge-value">{item.occurrences}</span>
                    <span className="badge-label">occurrences</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="trend-card span-2">
            <div className="trend-title">Actionable Remediation Queue</div>
            <div className="action-table">
              <div className="action-row action-header">
                <span>Issue</span>
                <span>Severity</span>
                <span>Impact</span>
                <span>Last Seen</span>
                <span>Root Cause</span>
                <span>Recommended Action</span>
              </div>
              {actionableItems.length === 0 && (
                <div className="empty-row">No actionable issues detected</div>
              )}
              {actionableItems.map(item => (
                <div key={item.issueId} className="action-row">
                  <span className="action-issue">{item.description}</span>
                  <span className={`severity-tag severity-${item.severity.toLowerCase()}`}>{item.severity}</span>
                  <span>{(item.affectedSystems || []).length} systems / {(item.affectedUsers || []).length} users</span>
                  <span>{formatDate(item.lastSeen)}</span>
                  <span className="action-text">{item.rootCause}</span>
                  <span className="action-text">{item.solution}</span>
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
