import React, { useState } from 'react';
import { exportReport } from '../services/api';
import './ReportsView.css';

export default function ReportsView({ analysisResult }) {
  const analysis = analysisResult;
  const [status, setStatus] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  const handleExport = async (format, reportType) => {
    try {
      console.log('Export initiated:', { format, reportType });
      setStatus(`Exporting ${reportType} as ${format.toUpperCase()}...`);
      const res = await exportReport(format.toLowerCase(), reportType);
      console.log('Export response:', res);
      
      if (res?.success) {
        setStatus(`✓ ${reportType} exported as ${format.toUpperCase()}`);
        setTimeout(() => setStatus(''), 5000);
      } else {
        console.error('Export failed:', res);
        setStatus(`✗ Export failed: ${res?.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error('Export exception:', e);
      setStatus(`✗ Export failed: ${e.message}`);
    }
  };

  const reportCategories = [
    {
      id: 'executive',
      title: 'Executive Reports',
      description: 'High-level insights for leadership and stakeholders',
      icon: '📊',
      reports: [
        {
          name: 'Executive Summary',
          description: 'Fleet health overview, critical metrics, and strategic recommendations',
          audience: 'C-Suite, VPs',
          frequency: 'Weekly',
          formats: ['JSON', 'CSV'],
          includes: ['Risk Index', 'Asset Health', 'Cost Impact', 'SLA Compliance', 'Strategic Actions']
        },
        {
          name: 'Board Report',
          description: 'Quarterly IT infrastructure performance and risk assessment',
          audience: 'Board Members',
          frequency: 'Quarterly',
          formats: ['JSON', 'CSV'],
          includes: ['Trend Analysis', 'Compliance Status', 'Budget Impact', 'Risk Exposure']
        },
        {
          name: 'Business Impact Analysis',
          description: 'Productivity impact, downtime costs, and business continuity metrics',
          audience: 'Business Leaders',
          frequency: 'Monthly',
          formats: ['JSON', 'CSV'],
          includes: ['Downtime Metrics', 'User Impact', 'Revenue Impact', 'Productivity Loss']
        }
      ]
    },
    {
      id: 'operational',
      title: 'Operational Reports',
      description: 'Detailed technical analysis for IT operations teams',
      icon: '⚙️',
      reports: [
        {
          name: 'Fleet Health Dashboard',
          description: 'Comprehensive device fleet status with issue breakdowns',
          audience: 'IT Operations',
          frequency: 'Daily',
          formats: ['JSON', 'CSV'],
          includes: ['Device Status', 'Issue Distribution', 'Severity Breakdown', 'Remediation Queue']
        },
        {
          name: 'Incident Analysis Report',
          description: 'Detailed analysis of all detected incidents with root causes',
          audience: 'Support Teams',
          frequency: 'Daily',
          formats: ['JSON', 'CSV'],
          includes: ['Issue Details', 'Root Causes', 'Solutions', 'Affected Assets', 'Timeline']
        },
        {
          name: 'Remediation Status',
          description: 'Tracking of action items, resolution progress, and pending issues',
          audience: 'IT Managers',
          frequency: 'Weekly',
          formats: ['JSON', 'CSV'],
          includes: ['Open Issues', 'Resolved Issues', 'In Progress', 'Action Owners', 'SLA Status']
        },
        {
          name: 'Asset Inventory Report',
          description: 'Complete inventory of analyzed systems with health status',
          audience: 'Asset Management',
          frequency: 'Monthly',
          formats: ['JSON', 'CSV'],
          includes: ['Device List', 'OS Versions', 'Last Seen', 'Issue Count', 'Risk Level']
        }
      ]
    },
    {
      id: 'compliance',
      title: 'Compliance & Audit Reports',
      description: 'Regulatory compliance and audit trail documentation',
      icon: '🔒',
      reports: [
        {
          name: 'Compliance Status Report',
          description: 'Security baseline compliance, policy violations, and remediation status',
          audience: 'Compliance Officers',
          frequency: 'Monthly',
          formats: ['JSON', 'CSV'],
          includes: ['Policy Compliance', 'Security Violations', 'Audit Findings', 'Remediation Plans']
        },
        {
          name: 'Security Incident Log',
          description: 'Audit trail of all security-related events and responses',
          audience: 'Security Team',
          frequency: 'Weekly',
          formats: ['JSON', 'CSV'],
          includes: ['Security Events', 'Response Actions', 'Timeline', 'Impact Assessment']
        },
        {
          name: 'Change Audit Report',
          description: 'Record of system changes, configurations, and approval trails',
          audience: 'Auditors',
          frequency: 'Quarterly',
          formats: ['JSON', 'CSV'],
          includes: ['Change Records', 'Approvals', 'Impact Analysis', 'Rollback History']
        }
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Trends',
      description: 'Historical analysis and predictive insights',
      icon: '📈',
      reports: [
        {
          name: 'Trend Analysis Report',
          description: 'Historical trend analysis with predictive forecasting',
          audience: 'IT Strategy',
          frequency: 'Monthly',
          formats: ['JSON', 'CSV'],
          includes: ['Issue Trends', 'Category Growth', 'Seasonal Patterns', 'Predictions']
        },
        {
          name: 'Recurring Issues Analysis',
          description: 'Deep dive into persistent problems and root cause patterns',
          audience: 'Engineering Teams',
          frequency: 'Bi-weekly',
          formats: ['JSON', 'CSV'],
          includes: ['Top Recurring Issues', 'Pattern Analysis', 'Root Causes', 'Fix Effectiveness']
        },
        {
          name: 'Comparative Analysis',
          description: 'Period-over-period and department comparison metrics',
          audience: 'Management',
          frequency: 'Monthly',
          formats: ['JSON', 'CSV'],
          includes: ['MoM Trends', 'YoY Comparison', 'Dept Benchmarks', 'KPI Changes']
        },
        {
          name: 'Capacity Planning Report',
          description: 'Resource utilization trends and capacity recommendations',
          audience: 'IT Planning',
          frequency: 'Quarterly',
          formats: ['JSON', 'CSV'],
          includes: ['Resource Trends', 'Growth Projections', 'Capacity Gaps', 'Recommendations']
        }
      ]
    },
    {
      id: 'scheduled',
      title: 'Scheduled Delivery',
      description: 'Automated report distribution and subscriptions',
      icon: '📅',
      reports: [
        {
          name: 'Configure Schedules',
          description: 'Set up automatic report generation and delivery',
          audience: 'All Stakeholders',
          frequency: 'Custom',
          formats: ['Email', 'Portal'],
          includes: ['Schedule Setup', 'Recipient Lists', 'Delivery Preferences', 'Notifications']
        }
      ]
    }
  ];

  const hasData = analysis?.issues && analysis.issues.length > 0;

  return (
    <div className="reports-container">
      <div className="reports-header">
        <div>
          <h2>Enterprise Reports</h2>
          <p className="reports-subtitle">Comprehensive reporting suite for all organizational levels</p>
        </div>
        {status && (
          <div className={`export-status ${status.startsWith('✓') ? 'success' : status.startsWith('✗') ? 'error' : 'pending'}`}>
            {status}
          </div>
        )}
      </div>

      {!hasData && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No Analysis Data Available</h3>
          <p>Run a fleet analysis to generate enterprise reports</p>
        </div>
      )}

      {hasData && (
        <div className="report-categories">
          {reportCategories.map(category => (
            <div key={category.id} className="report-category">
              <div className="category-header">
                <span className="category-icon">{category.icon}</span>
                <div>
                  <h3 className="category-title">{category.title}</h3>
                  <p className="category-description">{category.description}</p>
                </div>
              </div>

              <div className="reports-grid">
                {category.reports.map((report, idx) => (
                  <div 
                    key={idx} 
                    className={`report-card ${selectedReport === `${category.id}-${idx}` ? 'selected' : ''}`}
                    onClick={() => setSelectedReport(selectedReport === `${category.id}-${idx}` ? null : `${category.id}-${idx}`)}
                  >
                    <div className="report-card-header">
                      <h4 className="report-name">{report.name}</h4>
                      <div className="report-badges">
                        <span className="report-badge">{report.frequency}</span>
                      </div>
                    </div>
                    
                    <p className="report-description">{report.description}</p>
                    
                    <div className="report-meta">
                      <div className="meta-item">
                        <span className="meta-label">Audience:</span>
                        <span className="meta-value">{report.audience}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Formats:</span>
                        <span className="meta-value">{report.formats.join(', ')}</span>
                      </div>
                    </div>

                    {selectedReport === `${category.id}-${idx}` && (
                      <div className="report-details">
                        <div className="details-section">
                          <span className="details-label">Includes:</span>
                          <ul className="details-list">
                            {report.includes.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="export-actions">
                          {report.formats.map(format => (
                            <button 
                              key={format}
                              className="btn btn-primary btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExport(format.toLowerCase(), report.name);
                              }}
                            >
                              Export {format}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="reports-footer">
        <div className="footer-info">
          <h4>Custom Report Builder</h4>
          <p>Need a custom report? Contact your administrator to configure specialized reports tailored to your organization's needs.</p>
        </div>
      </div>
    </div>
  );
}
