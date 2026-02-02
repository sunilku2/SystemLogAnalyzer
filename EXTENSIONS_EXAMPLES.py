"""
Example: How to extend the Log Analyzer System
This file demonstrates various customization examples
"""

import os
from datetime import datetime

# ===========================================
# EXAMPLE 1: Add Custom Issue Pattern
# ===========================================

# Edit issue_detector.py and add to _load_issue_patterns():

CUSTOM_PATTERN_EXAMPLE = {
    "category": "Custom Issue Category",
    "pattern": r"your_error_pattern|another_pattern",
    "severity": "Critical",
    "keywords": ["error", "failure", "critical"],
    "root_cause": "Detailed explanation of why this issue occurs",
    "solution": "Step-by-step solution to fix the issue"
}

# ===========================================
# EXAMPLE 2: Custom Report Format
# ===========================================

# Add a new method to ReportGenerator class in report_generator.py:

class ReportGeneratorExample:
    def __init__(self, output_dir="reports"):
        self.output_dir = output_dir
        
    def generate_csv_report_example(self, report):
        """Generate CSV format report"""
        import csv
        
        filename = f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        filepath = os.path.join(self.output_dir, filename)
        
        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['Issue ID', 'Category', 'Severity', 'User Count', 
                            'Occurrences', 'Root Cause', 'Solution'])
            
            for issue in report.get_sorted_issues():
                writer.writerow([
                    issue.issue_id,
                    issue.category,
                    issue.severity,
                    issue.user_count,
                    issue.occurrences,
                    issue.root_cause,
                    issue.solution
                ])
        
        print(f"CSV Report saved: {filepath}")

# ===========================================
# EXAMPLE 3: Database Integration
# ===========================================

# In data_source.py, implement DatabaseDataSource.get_log_entries():

from models import LogEntry

class DatabaseDataSourceExample:
    def __init__(self, db_config):
        self.db_config = db_config
        
    def get_log_entries_database_example(self):
        """Example implementation for database reading"""
        import psycopg2
        from datetime import datetime
        
        # Connect to database
        conn = psycopg2.connect(
            host=self.db_config['host'],
            database=self.db_config['database'],
            user=self.db_config['user'],
            password=self.db_config['password']
        )
        
        cursor = conn.cursor()
        
        # Query log entries
        query = """
            SELECT 
                event_number, level, source, event_id, 
                timestamp, message, log_type, user_id, 
                system_name, session_timestamp
            FROM log_entries
            WHERE timestamp >= NOW() - INTERVAL '7 days'
            ORDER BY timestamp DESC
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        # Convert to LogEntry objects
        log_entries = []
        for row in rows:
            entry = LogEntry(
                event_number=row[0],
                level=row[1],
                source=row[2],
                event_id=row[3],
                timestamp=row[4],
                message=row[5],
                log_type=row[6],
                user_id=row[7],
                system_name=row[8],
                session_timestamp=row[9]
            )
            log_entries.append(entry)
        
        cursor.close()
        conn.close()
        
        return log_entries

# ===========================================
# EXAMPLE 4: Custom Log Parser
# ===========================================

# To support different log formats, extend LogParser:

def parse_custom_format_example(file_path):
    """Example for parsing custom log format"""
    from datetime import datetime
    from models import LogEntry
    
    log_entries = []
    
    with open(file_path, 'r') as f:
        for line in f:
            # Parse your custom format
            # Example: "2026-01-23 10:30:45 | ERROR | Message text"
            parts = line.split('|')
            if len(parts) >= 3:
                timestamp_str = parts[0].strip()
                level = parts[1].strip()
                message = parts[2].strip()
                
                # Create LogEntry object
                entry = LogEntry(
                    event_number=0,
                    level=level,
                    source="Custom",
                    event_id=0,
                    timestamp=datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S'),
                    message=message,
                    log_type="Custom",
                    user_id="unknown",
                    system_name="unknown",
                    session_timestamp=""
                )
                log_entries.append(entry)
    
    return log_entries

# ===========================================
# EXAMPLE 5: Filter Logs by Date Range
# ===========================================

# In main.py, add filtering logic:

def filter_by_date_example(log_entries, start_date, end_date):
    """Filter log entries by date range"""
    from datetime import datetime
    
    filtered = [
        entry for entry in log_entries
        if start_date <= entry.timestamp <= end_date
    ]
    
    return filtered

# Usage:
# from datetime import datetime, timedelta
# start = datetime.now() - timedelta(days=7)  # Last 7 days
# end = datetime.now()
# filtered_logs = filter_by_date_example(log_entries, start, end)

# ===========================================
# EXAMPLE 6: Email Report Notifications
# ===========================================

# Add email notification feature:

def send_email_report_example(report, recipient_email):
    """Send report via email"""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    # Create message
    msg = MIMEMultipart()
    msg['Subject'] = f'Log Analysis Report - {report.generated_at.strftime("%Y-%m-%d")}'
    msg['From'] = 'loganalyzer@company.com'
    msg['To'] = recipient_email
    
    # Create body
    body = f"""
    Log Analysis Report
    
    Generated: {report.generated_at}
    Users Analyzed: {report.total_users_analyzed}
    Issues Found: {len(report.issues)}
    
    Critical Issues: {sum(1 for i in report.issues if i.severity == 'Critical')}
    Errors: {sum(1 for i in report.issues if i.severity == 'Error')}
    Warnings: {sum(1 for i in report.issues if i.severity == 'Warning')}
    
    Please review the attached HTML report for details.
    """
    
    msg.attach(MIMEText(body, 'plain'))
    
    # Send email (configure your SMTP server)
    # server = smtplib.SMTP('smtp.gmail.com', 587)
    # server.starttls()
    # server.login('your_email@gmail.com', 'your_password')
    # server.send_message(msg)
    # server.quit()

# ===========================================
# EXAMPLE 7: Real-time Monitoring
# ===========================================

# Add continuous monitoring:

def monitor_logs_realtime_example(interval_seconds=300):
    """Monitor logs continuously"""
    import time
    from datetime import datetime
    # Note: This is example code - you would need to import your actual LogAnalyzer
    # from main import LogAnalyzer
    
    while True:
        print(f"\n[{datetime.now()}] Starting analysis...")
        
        # Run analysis (requires importing actual LogAnalyzer class)
        # analyzer = LogAnalyzer()
        # analyzer.run()
        
        print(f"Waiting {interval_seconds} seconds before next scan...")
        time.sleep(interval_seconds)

# Usage:
# monitor_logs_realtime_example(interval_seconds=300)  # Every 5 minutes

# ===========================================
# EXAMPLE 8: Integration with Ticketing System
# ===========================================

# Create tickets for critical issues:

def create_tickets_example(issues):
    """Create tickets for critical issues"""
    import requests
    
    critical_issues = [i for i in issues if i.severity in ['Critical', 'Error']]
    
    for issue in critical_issues:
        ticket_data = {
            'title': f"{issue.category} - {issue.severity}",
            'description': f"""
            Issue ID: {issue.issue_id}
            Affected Users: {issue.user_count}
            Occurrences: {issue.occurrences}
            
            Root Cause:
            {issue.root_cause}
            
            Solution:
            {issue.solution}
            """,
            'priority': 'high' if issue.severity == 'Critical' else 'medium',
            'labels': [issue.category, issue.severity]
        }
        
        # Send to ticketing system API
        # response = requests.post(
        #     'https://your-ticketing-system.com/api/tickets',
        #     json=ticket_data,
        #     headers={'Authorization': 'Bearer YOUR_TOKEN'}
        # )

# ===========================================
# EXAMPLE 9: Machine Learning Integration
# ===========================================

# Use ML for better issue classification:

def ml_classify_issue_example(log_entry):
    """Use ML model to classify issues"""
    # This is a placeholder - implement with your ML framework
    
    # Example with scikit-learn:
    # from sklearn.feature_extraction.text import TfidfVectorizer
    # from sklearn.naive_bayes import MultinomialNB
    
    # 1. Train model on historical data
    # vectorizer = TfidfVectorizer()
    # X_train = vectorizer.fit_transform(training_messages)
    # model = MultinomialNB()
    # model.fit(X_train, training_labels)
    
    # 2. Predict category for new log
    # X_test = vectorizer.transform([log_entry.message])
    # predicted_category = model.predict(X_test)[0]
    
    # return predicted_category
    pass

# ===========================================
# EXAMPLE 10: Dashboard Integration
# ===========================================

# Expose data via REST API for dashboard:

def create_api_endpoint_example():
    """Create REST API for dashboard integration"""
    from flask import Flask, jsonify
    # Note: This is example code - you would need to import your actual LogAnalyzer
    # from main import LogAnalyzer
    
    app = Flask(__name__)
    
    @app.route('/api/report/latest', methods=['GET'])
    def get_latest_report():
        # Run analysis (requires importing actual LogAnalyzer class)
        # analyzer = LogAnalyzer()
        # report = analyzer.get_report()
        
        # Example return structure (uncomment when using real report object):
        # return jsonify({
        #     'timestamp': report.generated_at.isoformat(),
        #     'stats': {
        #         'users': report.total_users_analyzed,
        #         'systems': report.total_systems_analyzed,
        #         'logs': report.total_logs_processed
        #     },
        #     'issues': [
        #         {
        #             'id': i.issue_id,
        #             'category': i.category,
        #             'severity': i.severity,
        #             'user_count': i.user_count,
        #             'occurrences': i.occurrences
        #         }
        #         for i in report.get_sorted_issues()
        #     ]
        # })
        
        return jsonify({'status': 'example endpoint'})
    
    # app.run(host='0.0.0.0', port=5000)

print("Extension examples loaded. See file for implementation details.")
