"""
Report Generator Module - Creates analysis reports in various formats
"""
import os
import json
from datetime import datetime
from typing import List
from models import AnalysisReport, Issue


class ReportGenerator:
    """Generates analysis reports in various formats"""
    
    def __init__(self, output_dir: str = None):
        self.output_dir = output_dir
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)
    
    def generate_report(self, report: AnalysisReport, format_type: str = "both"):
        """
        Generate report in specified format(s)
        
        Args:
            report: AnalysisReport object
            format_type: "console", "html", "json", or "both" (console + html)
        """
        if format_type in ["console", "both"]:
            self.print_console_report(report)
        
        if format_type in ["html", "both"]:
            self.generate_html_report(report)
        
        if format_type == "json":
            self.generate_json_report(report)
    
    def print_console_report(self, report: AnalysisReport):
        """Print formatted report to console"""
        print("\n" + "=" * 100)
        print(" " * 35 + "LOG ANALYSIS REPORT")
        print("=" * 100)
        print(f"\nGenerated At: {report.generated_at.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Total Users Analyzed: {report.total_users_analyzed}")
        print(f"Total Systems Analyzed: {report.total_systems_analyzed}")
        print(f"Total Logs Processed: {report.total_logs_processed}")
        print(f"Unique Issues Found: {len(report.issues)}")
        print("\n" + "=" * 100)
        
        sorted_issues = report.get_sorted_issues()
        
        if not sorted_issues:
            print("\n✓ No significant issues detected!")
            return
        
        print("\n" + "-" * 100)
        print(f"{'#':<4} {'Issue ID':<12} {'Category':<25} {'Severity':<12} {'Users':<8} {'Occur.':<8}")
        print("-" * 100)
        
        for idx, issue in enumerate(sorted_issues, 1):
            print(f"{idx:<4} {issue.issue_id:<12} {issue.category:<25} {issue.severity:<12} {issue.user_count:<8} {issue.occurrences:<8}")
        
        print("-" * 100)
        print("\nDETAILED ISSUE ANALYSIS:")
        print("=" * 100)
        
        for idx, issue in enumerate(sorted_issues, 1):
            self._print_issue_details(idx, issue)
    
    def _print_issue_details(self, index: int, issue: Issue):
        """Print detailed information for a single issue"""
        print(f"\n[Issue #{index}] {issue.issue_id}")
        print("-" * 100)
        print(f"Category        : {issue.category}")
        print(f"Severity        : {issue.severity}")
        print(f"Affected Users  : {issue.user_count} users ({', '.join(issue.affected_users[:5])}{'...' if len(issue.affected_users) > 5 else ''})")
        print(f"Total Occurrences: {issue.occurrences}")
        print(f"Pattern         : {issue.pattern}")
        print(f"\nDescription:")
        print(f"  {issue.description}")
        print(f"\nRoot Cause:")
        print(f"  {issue.root_cause}")
        print(f"\nRecommended Solution:")
        print(f"  {issue.solution}")
        
        # Show sample log entry
        if issue.log_entries:
            sample = issue.log_entries[0]
            print(f"\nSample Log Entry:")
            print(f"  Time: {sample.timestamp}")
            print(f"  User: {sample.user_id}, System: {sample.system_name}")
            print(f"  Log Type: {sample.log_type}")
            print(f"  Message: {sample.message[:200]}{'...' if len(sample.message) > 200 else ''}")
        
        print("-" * 100)
    
    def generate_html_report(self, report: AnalysisReport):
        """Generate HTML report"""
        if not self.output_dir:
            print("Warning: No output directory specified for HTML report")
            return
        
        timestamp = report.generated_at.strftime('%Y%m%d_%H%M%S')
        filename = f"log_analysis_report_{timestamp}.html"
        filepath = os.path.join(self.output_dir, filename)
        
        html_content = self._generate_html_content(report)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"\n✓ HTML Report saved: {filepath}")
    
    def _generate_html_content(self, report: AnalysisReport) -> str:
        """Generate HTML content for report"""
        sorted_issues = report.get_sorted_issues()
        
        # Generate issue rows HTML
        issue_rows = ""
        for idx, issue in enumerate(sorted_issues, 1):
            severity_class = issue.severity.lower()
            issue_rows += f"""
            <tr class="severity-{severity_class}">
                <td>{idx}</td>
                <td>{issue.issue_id}</td>
                <td>{issue.category}</td>
                <td><span class="badge badge-{severity_class}">{issue.severity}</span></td>
                <td>{issue.user_count}</td>
                <td>{issue.occurrences}</td>
                <td class="description">{self._html_escape(issue.description)}</td>
            </tr>
            <tr class="details-row">
                <td colspan="7">
                    <div class="issue-details">
                        <div class="detail-section">
                            <strong>Pattern:</strong> {self._html_escape(issue.pattern)}
                        </div>
                        <div class="detail-section">
                            <strong>Affected Users:</strong> {', '.join(issue.affected_users[:10])}{'...' if len(issue.affected_users) > 10 else ''}
                        </div>
                        <div class="detail-section">
                            <strong>Root Cause:</strong><br>{self._html_escape(issue.root_cause)}
                        </div>
                        <div class="detail-section solution">
                            <strong>Recommended Solution:</strong><br>{self._html_escape(issue.solution)}
                        </div>
                    </div>
                </td>
            </tr>
            """
        
        html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Log Analysis Report - {report.generated_at.strftime('%Y-%m-%d %H:%M:%S')}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            color: #333;
        }}
        
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            overflow: hidden;
        }}
        
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        
        .header h1 {{
            font-size: 2.5em;
            margin-bottom: 10px;
        }}
        
        .stats {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }}
        
        .stat-card {{
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }}
        
        .stat-card h3 {{
            color: #667eea;
            font-size: 2em;
            margin-bottom: 10px;
        }}
        
        .stat-card p {{
            color: #666;
            font-size: 0.9em;
        }}
        
        .content {{
            padding: 30px;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }}
        
        th {{
            background: #667eea;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            position: sticky;
            top: 0;
        }}
        
        td {{
            padding: 12px 15px;
            border-bottom: 1px solid #e0e0e0;
        }}
        
        tr:hover {{
            background: #f5f5f5;
        }}
        
        .badge {{
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            display: inline-block;
        }}
        
        .badge-critical {{
            background: #dc3545;
            color: white;
        }}
        
        .badge-error {{
            background: #fd7e14;
            color: white;
        }}
        
        .badge-warning {{
            background: #ffc107;
            color: #333;
        }}
        
        .badge-information {{
            background: #17a2b8;
            color: white;
        }}
        
        .details-row {{
            background: #f8f9fa;
            display: none;
        }}
        
        tr.severity-critical {{
            border-left: 4px solid #dc3545;
        }}
        
        tr.severity-error {{
            border-left: 4px solid #fd7e14;
        }}
        
        tr.severity-warning {{
            border-left: 4px solid #ffc107;
        }}
        
        .issue-details {{
            padding: 20px;
            background: white;
            margin: 10px;
            border-radius: 5px;
        }}
        
        .detail-section {{
            margin: 15px 0;
        }}
        
        .solution {{
            background: #e7f3ff;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #0066cc;
        }}
        
        .description {{
            max-width: 400px;
            word-wrap: break-word;
        }}
        
        .footer {{
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            color: #666;
            font-size: 0.9em;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Log Analysis Report</h1>
            <p>Generated on {report.generated_at.strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <h3>{report.total_users_analyzed}</h3>
                <p>Users Analyzed</p>
            </div>
            <div class="stat-card">
                <h3>{report.total_systems_analyzed}</h3>
                <p>Systems Analyzed</p>
            </div>
            <div class="stat-card">
                <h3>{report.total_logs_processed}</h3>
                <p>Logs Processed</p>
            </div>
            <div class="stat-card">
                <h3>{len(report.issues)}</h3>
                <p>Unique Issues</p>
            </div>
        </div>
        
        <div class="content">
            <h2>Issues Summary</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Issue ID</th>
                        <th>Category</th>
                        <th>Severity</th>
                        <th>User Count</th>
                        <th>Occurrences</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    {issue_rows if issue_rows else '<tr><td colspan="7" style="text-align:center;">No issues detected</td></tr>'}
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p>Log Analysis System | Automatically generated report</p>
        </div>
    </div>
</body>
</html>
"""
        return html
    
    def _html_escape(self, text: str) -> str:
        """Escape HTML special characters"""
        return (text
                .replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace("'", '&#39;'))
    
    def generate_json_report(self, report: AnalysisReport):
        """Generate JSON report"""
        if not self.output_dir:
            print("Warning: No output directory specified for JSON report")
            return
        
        timestamp = report.generated_at.strftime('%Y%m%d_%H%M%S')
        filename = f"log_analysis_report_{timestamp}.json"
        filepath = os.path.join(self.output_dir, filename)
        
        report_dict = {
            "generated_at": report.generated_at.isoformat(),
            "total_users_analyzed": report.total_users_analyzed,
            "total_systems_analyzed": report.total_systems_analyzed,
            "total_logs_processed": report.total_logs_processed,
            "issues": [
                {
                    "issue_id": issue.issue_id,
                    "category": issue.category,
                    "severity": issue.severity,
                    "description": issue.description,
                    "pattern": issue.pattern,
                    "user_count": issue.user_count,
                    "affected_users": issue.affected_users,
                    "affected_systems": issue.affected_systems,
                    "occurrences": issue.occurrences,
                    "root_cause": issue.root_cause,
                    "solution": issue.solution
                }
                for issue in report.get_sorted_issues()
            ]
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(report_dict, f, indent=2, ensure_ascii=False)
        
        print(f"\n✓ JSON Report saved: {filepath}")
