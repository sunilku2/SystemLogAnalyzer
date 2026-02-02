"""
REST API Backend for Log Analyzer
Provides endpoints for the .NET frontend
"""
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from datetime import datetime, timedelta
import json
import os
import sys
import threading
import time
import subprocess
import tempfile
import requests
import logging
from logging.handlers import RotatingFileHandler

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import LOGS_DIR, LOG_TYPES, REPORT_OUTPUT_DIR, LLM_ENABLED, LLM_PROVIDER, LLM_MODEL, LLM_FALLBACK_TO_PATTERNS
from log_parser import LogParser
from issue_detector import IssueDetector
from llm_analyzer import LLMAnalyzer
from report_generator import ReportGenerator
from data_source import DataSourceFactory
from models import AnalysisReport

app = Flask(__name__)
CORS(app)  # Enable CORS for .NET frontend

# Setup logging
log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
os.makedirs(log_dir, exist_ok=True)

logger = logging.getLogger('log_analyzer')
logger.setLevel(logging.DEBUG)

# File handler - rotating logs
file_handler = RotatingFileHandler(
    os.path.join(log_dir, 'api_server.log'),
    maxBytes=10*1024*1024,
    backupCount=5
)
file_handler.setLevel(logging.DEBUG)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

# Formatter
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

logger.addHandler(file_handler)
logger.addHandler(console_handler)

logger.info('=== Log Analyzer API Server Starting ===')
logger.info(f'Logs Directory: {LOGS_DIR}')
logger.info(f'Report Output Directory: {REPORT_OUTPUT_DIR}')
logger.info(f'LLM Enabled: {LLM_ENABLED}')
logger.info(f'LLM Provider: {LLM_PROVIDER}')
logger.info(f'LLM Model: {LLM_MODEL}')

# Background watcher settings
WATCH_INTERVAL_SECONDS = 600  # 10 minutes
WATCH_SLEEP_SECONDS = 60  # check once per minute for changes

# Global state
current_llm_analyzer = None
analysis_cache = {}
analysis_state = {
    'last_run_at': None,
    'last_source': None,
    'last_error': None,
    'last_logs_signature': None
}

watcher_thread = None
watcher_stop_event = threading.Event()
watcher_started = False
analysis_lock = threading.Lock()


def _compute_logs_signature():
    """Return a lightweight signature of current logs (max mtime, file count) - includes .log and .evtx files."""
    logger.debug(f'Computing logs signature from {LOGS_DIR}')
    latest_mtime = 0
    file_count = 0
    try:
        for root, _dirs, files in os.walk(LOGS_DIR):
            # Check configured log types
            for log_name in LOG_TYPES:
                path = os.path.join(root, log_name)
                if os.path.exists(path):
                    file_count += 1
                    mtime = os.path.getmtime(path)
                    latest_mtime = max(latest_mtime, mtime)
                    logger.debug(f'Found log file: {path}')
            
            # Also check for .evtx files
            for filename in files:
                if filename.lower().endswith('.evtx'):
                    path = os.path.join(root, filename)
                    file_count += 1
                    mtime = os.path.getmtime(path)
                    latest_mtime = max(latest_mtime, mtime)
                    logger.debug(f'Found EVTX file: {path}')
        
        signature = (latest_mtime, file_count)
        logger.debug(f'Logs signature: {file_count} files, latest mtime: {latest_mtime}')
        return signature
    except Exception as e:
        logger.error(f'Error computing logs signature: {str(e)}', exc_info=True)
        return (0, 0)


def _execute_analysis(use_llm: bool, model_name: str, provider: str, source: str = "manual"):
    """Shared analysis routine for API requests and background watcher."""
    with analysis_lock:
        print(f"\n[API] Starting analysis... (source={source})")
        print(f"  LLM Enabled: {use_llm}")
        if use_llm:
            print(f"  Provider: {provider}")
            print(f"  Model: {model_name}")

        # Step 1: Load logs
        print("[API] Loading logs...")
        parser = LogParser()
        data_source = DataSourceFactory.create_data_source(
            "filesystem",
            log_parser=parser,
            base_logs_dir=LOGS_DIR,
            log_types=LOG_TYPES
        )
        log_entries = data_source.get_log_entries()

        if not log_entries:
            raise Exception('No log entries found')

        # Step 2: Detect issues
        print(f"[API] Analyzing {len(log_entries)} log entries...")

        detector = IssueDetector()
        issues = detector.detect_issues(log_entries)

        if use_llm:
            llm_analyzer = LLMAnalyzer(model_name=model_name, provider=provider)

            # Check if LLM is available
            if not llm_analyzer.check_provider_availability():
                if LLM_FALLBACK_TO_PATTERNS:
                    print(f"[API] LLM provider {provider} unavailable. Falling back to pattern-based analysis.")
                    use_llm = False
                else:
                    raise Exception(f'LLM provider {provider} is not available. Please start {provider} and try again.')

            if use_llm:
                # Enhance issues with LLM analysis
                print("[API] Enhancing analysis with LLM...")
                for issue in issues:
                    try:
                        llm_result = llm_analyzer.analyze_issue_group_with_llm(issue.log_entries)

                        # Update issue with LLM insights
                        if llm_result.get('issue_title'):
                            issue.description = llm_result['issue_title']
                        if llm_result.get('root_cause'):
                            issue.root_cause = llm_result['root_cause']
                        if llm_result.get('solution'):
                            issue.solution = llm_result['solution']
                        if llm_result.get('category'):
                            issue.category = llm_result['category']

                    except Exception as e:
                        print(f"[API] LLM analysis failed for issue {issue.issue_id}: {e}")
                        continue

        # Step 3: Build report
        unique_users = set(entry.user_id for entry in log_entries)
        unique_systems = set(entry.system_name for entry in log_entries)

        report = AnalysisReport(
            generated_at=datetime.now(),
            total_users_analyzed=len(unique_users),
            total_systems_analyzed=len(unique_systems),
            total_logs_processed=len(log_entries),
            issues=issues
        )

        # Convert to JSON-friendly format
        sorted_issues = report.get_sorted_issues()

        result = {
            'success': True,
            'analysis': {
                'generated_at': report.generated_at.isoformat(),
                'total_users_analyzed': report.total_users_analyzed,
                'total_systems_analyzed': report.total_systems_analyzed,
                'total_logs_processed': report.total_logs_processed,
                'issues_found': len(report.issues),
                'llm_used': use_llm,
                'model_used': model_name if use_llm else 'Pattern-based',
                'provider_used': provider if use_llm else 'N/A',
                'source': source
            },
            'issues': [
                {
                    'issueId': issue.issue_id,
                    'category': issue.category,
                    'severity': issue.severity,
                    'description': issue.description,
                    'pattern': issue.pattern,
                    'userCount': issue.user_count,
                    'affectedUsers': issue.affected_users,
                    'affectedSystems': issue.affected_systems,
                    'occurrences': issue.occurrences,
                    'rootCause': issue.root_cause,
                    'solution': issue.solution,
                    'samples': [
                        {
                            'timestamp': le.timestamp.isoformat(),
                            'system': le.system_name,
                            'user': le.user_id
                        }
                        for le in (issue.log_entries[:5] if issue.log_entries else [])
                    ]
                }
                for issue in sorted_issues
            ],
            'statistics': {
                'by_severity': {
                    'critical': sum(1 for i in issues if i.severity == 'Critical'),
                    'error': sum(1 for i in issues if i.severity == 'Error'),
                    'warning': sum(1 for i in issues if i.severity == 'Warning'),
                    'information': sum(1 for i in issues if i.severity == 'Information')
                },
                'by_category': {}
            }
        }

        for issue in issues:
            cat = issue.category
            result['statistics']['by_category'][cat] = result['statistics']['by_category'].get(cat, 0) + 1

        # Cache result and state
        analysis_cache['latest'] = result
        analysis_state['last_run_at'] = datetime.now()
        analysis_state['last_source'] = source
        analysis_state['last_error'] = None
        analysis_state['last_logs_signature'] = _compute_logs_signature()

        print("[API] Analysis complete!")
        return result


def _list_ollama_models():
    """Return installed Ollama model names or raise an error if Ollama is not available."""
    try:
        result = subprocess.run(
            ['ollama', 'list'],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode != 0:
            return [], result.stderr.strip() or result.stdout.strip() or 'Failed to list Ollama models'

        models = []
        for line in result.stdout.splitlines()[1:]:  # Skip header
            if line.strip():
                model_name = line.split()[0]
                if model_name:
                    models.append(model_name)
        return models, None
    except FileNotFoundError:
        return [], 'Ollama CLI not found. Please install Ollama to download models.'
    except subprocess.TimeoutExpired:
        return [], 'Ollama list timed out. Please try again.'
    except Exception as e:
        return [], f'Error listing Ollama models: {e}'


def _ollama_model_exists(model_name: str):
    models, error = _list_ollama_models()
    if error:
        return False, error
    return model_name in models, None


def _pull_ollama_model(model_name: str):
    """Download an Ollama model and return (success, message)."""
    try:
        result = subprocess.run(
            ['ollama', 'pull', model_name],
            capture_output=True,
            text=True,
            timeout=1800
        )
        if result.returncode == 0:
            return True, result.stdout.strip() or f"Model '{model_name}' downloaded successfully."
        return False, result.stderr.strip() or result.stdout.strip() or 'Failed to download model'
    except FileNotFoundError:
        return False, 'Ollama CLI not found. Please install Ollama to download models.'
    except subprocess.TimeoutExpired:
        return False, 'Model download timed out. Please try again.'
    except Exception as e:
        return False, f'Error downloading model: {e}'


def _watcher_loop():
    """Background loop that triggers analysis when logs change or interval elapses."""
    last_signature = None
    while not watcher_stop_event.is_set():
        try:
            current_signature = _compute_logs_signature()

            now = datetime.now()
            last_run = analysis_state['last_run_at']
            run_due = last_run is None or (now - last_run >= timedelta(seconds=WATCH_INTERVAL_SECONDS))
            changed = last_signature is None or current_signature != last_signature

            if changed or run_due:
                print("[Watcher] Detected log change or interval elapsed. Running analysis...")
                # Use pattern-based analysis in the watcher to avoid LLM latency/timeouts
                _execute_analysis(False, LLM_MODEL, LLM_PROVIDER, source="watcher")
                last_signature = current_signature

        except Exception as e:
            analysis_state['last_error'] = str(e)
            print(f"[Watcher] Analysis failed: {e}")

        watcher_stop_event.wait(WATCH_SLEEP_SECONDS)


def _start_watcher_if_needed():
    """Start the background watcher thread once per process."""
    global watcher_thread, watcher_started
    if watcher_started:
        return
    watcher_started = True
    watcher_stop_event.clear()
    watcher_thread = threading.Thread(target=_watcher_loop, name="LogWatcher", daemon=True)
    watcher_thread.start()
    print("[Watcher] Started background log watcher thread.")


@app.before_request
def _ensure_watcher_running():
    """Ensure watcher starts before handling requests (works on Flask 2/3)."""
    _start_watcher_if_needed()


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })


@app.route('/api/logs/sessions', methods=['GET'])
def get_log_sessions():
    """Get list of available log sessions"""
    try:
        parser = LogParser()
        sessions = parser.discover_logs(LOGS_DIR)
        
        # Provide helpful message if no logs found
        if not sessions:
            # Return helpful diagnostic info
            return jsonify({
                'success': True,
                'sessions': [],
                'message': 'No log sessions found',
                'help': {
                    'description': 'No logs were found in the configured logs directory',
                    'logs_directory': LOGS_DIR,
                    'absolute_path': os.path.abspath(LOGS_DIR),
                    'directory_exists': os.path.exists(LOGS_DIR),
                    'next_steps': [
                        'Check that the logs directory exists at: ' + os.path.abspath(LOGS_DIR),
                        'Ensure logs follow this structure: {user_id}/{system_name}/{timestamp}/',
                        'Call /api/logs/diagnose for detailed directory structure',
                        'Check LOGS_DIR setting in config.py if path is incorrect'
                    ]
                },
                'statistics': {
                    'total_sessions': 0,
                    'unique_users': 0,
                    'unique_systems': 0,
                    'users': [],
                    'systems': []
                }
            })
        
        session_list = [
            {
                'userId': user_id,
                'systemName': system_name,
                'sessionTimestamp': session_time,
                'path': path
            }
            for user_id, system_name, session_time, path in sessions
        ]
        
        # Get statistics
        unique_users = list(set(s['userId'] for s in session_list))
        unique_systems = list(set(s['systemName'] for s in session_list))
        
        return jsonify({
            'success': True,
            'sessions': session_list,
            'statistics': {
                'total_sessions': len(session_list),
                'unique_users': len(unique_users),
                'unique_systems': len(unique_systems),
                'users': unique_users,
                'systems': unique_systems
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/logs/diagnose', methods=['GET'])
def diagnose_logs():
    """Diagnostic endpoint to check log directory structure"""
    try:
        diagnosis = {
            'logs_dir': LOGS_DIR,
            'exists': os.path.exists(LOGS_DIR),
            'is_absolute': os.path.isabs(LOGS_DIR),
            'absolute_path': os.path.abspath(LOGS_DIR),
            'structure': {}
        }
        
        if not os.path.exists(LOGS_DIR):
            return jsonify(diagnosis)
        
        # Check directory structure
        try:
            user_dirs = os.listdir(LOGS_DIR)
            diagnosis['user_count'] = len(user_dirs)
            diagnosis['users'] = []
            
            for user_id in user_dirs[:5]:  # Only check first 5 users
                user_path = os.path.join(LOGS_DIR, user_id)
                if os.path.isdir(user_path):
                    system_dirs = os.listdir(user_path)
                    diagnosis['users'].append({
                        'user_id': user_id,
                        'systems': system_dirs[:3]  # Only first 3 systems
                    })
            
            # Also list all files at root level
            all_items = os.listdir(LOGS_DIR)
            files_at_root = [f for f in all_items if os.path.isfile(os.path.join(LOGS_DIR, f))]
            dirs_at_root = [d for d in all_items if os.path.isdir(os.path.join(LOGS_DIR, d))]
            
            diagnosis['structure'] = {
                'directories': dirs_at_root,
                'files': files_at_root,
                'total_items': len(all_items)
            }
            
        except Exception as e:
            diagnosis['error_reading_directory'] = str(e)
        
        return jsonify(diagnosis)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/analyze', methods=['POST'])
def run_analysis():
    """Run log analysis with optional LLM"""
    try:
        data = request.json
        use_llm = data.get('use_llm', LLM_ENABLED)
        model_name = data.get('model', LLM_MODEL)
        provider = data.get('provider', LLM_PROVIDER)
        auto_download = data.get('auto_download', False)

        if use_llm and provider == 'ollama':
            model_exists, error = _ollama_model_exists(model_name)
            if error:
                return jsonify({
                    'success': False,
                    'error': error
                }), 503
            if not model_exists:
                if auto_download:
                    success, message = _pull_ollama_model(model_name)
                    if not success:
                        return jsonify({
                            'success': False,
                            'error': message
                        }), 500
                else:
                    return jsonify({
                        'success': False,
                        'error': f"Model '{model_name}' not found. Download it and try again.",
                        'model_missing': True
                    }), 404

        result = _execute_analysis(use_llm, model_name, provider, source="manual")
        return jsonify(result)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/reports/latest', methods=['GET'])
def get_latest_report():
    """Get the latest analysis report"""
    if 'latest' in analysis_cache:
        return jsonify(analysis_cache['latest'])
    else:
        return jsonify({
            'success': False,
            'error': 'No analysis has been run yet'
        }), 200


def generate_report_data(full_data, report_type):
    """Generate report-specific data based on report type"""
    
    # Extract common metrics
    issues = full_data.get('issues', [])
    
    # Calculate severity counts
    critical = sum(1 for i in issues if i.get('severity') == 'CRITICAL')
    error = sum(1 for i in issues if i.get('severity') == 'ERROR')
    warning = sum(1 for i in issues if i.get('severity') == 'WARNING')
    
    # Get unique systems and users
    all_systems = set()
    all_users = set()
    for issue in issues:
        all_systems.update(issue.get('affectedSystems', []))
        all_users.update(issue.get('affectedUsers', []))
    
    # Base metrics common to all reports
    base_metrics = {
        'reportType': report_type,
        'generatedAt': datetime.now().isoformat(),
        'summary': {
            'totalIssues': len(issues),
            'criticalIssues': critical,
            'errorIssues': error,
            'warningIssues': warning,
            'affectedSystems': len(all_systems),
            'affectedUsers': len(all_users)
        }
    }
    
    # Report-specific data
    if 'Executive Summary' in report_type:
        # High-level KPIs and business impact
        top_issues = sorted(issues, key=lambda x: x.get('occurrences', 0), reverse=True)[:5]
        return {
            **base_metrics,
            'keyFindings': [
                f"{critical} critical security/stability issues require immediate attention",
                f"{len(all_systems)} systems impacted across the fleet",
                f"Top issue: {top_issues[0].get('description', 'N/A')}" if top_issues else "No issues found",
                f"Risk Index: {(critical * 25) + (error * 15) + (warning * 5)}"
            ],
            'topIssues': top_issues,
            'recommendations': [
                'Address critical issues within 24 hours',
                'Implement automated monitoring for top recurring patterns',
                'Schedule quarterly security audits'
            ]
        }
    
    elif 'Board Report' in report_type:
        # Business-focused metrics
        return {
            **base_metrics,
            'executiveSummary': {
                'fleetHealth': 'Good' if critical == 0 else 'At Risk' if critical < 5 else 'Critical',
                'systemsAffected': len(all_systems),
                'usersImpacted': len(all_users),
                'riskLevel': 'High' if critical > 5 else 'Medium' if critical > 0 else 'Low'
            },
            'businessImpact': {
                'productivity': f"{len(all_users)} users potentially affected",
                'security': f"{critical} critical security issues",
                'compliance': 'Review required' if critical > 0 else 'Compliant'
            },
            'strategicRecommendations': [
                'Invest in proactive monitoring systems',
                'Increase IT support capacity',
                'Implement preventive maintenance programs'
            ]
        }
    
    elif 'Business Impact Analysis' in report_type:
        # Detailed business metrics
        categories = {}
        for issue in issues:
            cat = issue.get('category', 'Other')
            if cat not in categories:
                categories[cat] = {'count': 0, 'systems': set(), 'users': set()}
            categories[cat]['count'] += 1
            categories[cat]['systems'].update(issue.get('affectedSystems', []))
            categories[cat]['users'].update(issue.get('affectedUsers', []))
        
        impact_by_category = {
            cat: {
                'issueCount': data['count'],
                'systemsAffected': len(data['systems']),
                'usersAffected': len(data['users']),
                'businessImpact': 'High' if data['count'] > 10 else 'Medium' if data['count'] > 5 else 'Low'
            }
            for cat, data in categories.items()
        }
        
        return {
            **base_metrics,
            'impactAnalysis': impact_by_category,
            'costEstimate': {
                'downtimeHours': len(all_users) * 0.5,  # Estimated
                'productivityLoss': f"${len(all_users) * 100:,}",  # Estimated
                'remediationCost': f"${len(issues) * 50:,}"  # Estimated
            },
            'issues': issues
        }
    
    elif 'Fleet Health Dashboard' in report_type:
        # Operational health metrics
        return {
            **base_metrics,
            'fleetStatus': {
                'totalSystems': len(all_systems),
                'healthySystems': max(0, len(all_systems) - len([s for s in all_systems if any(s in i.get('affectedSystems', []) for i in issues if i.get('severity') == 'CRITICAL')])),
                'atRiskSystems': len([s for s in all_systems if any(s in i.get('affectedSystems', []) for i in issues if i.get('severity') in ['ERROR', 'WARNING'])]),
                'criticalSystems': len([s for s in all_systems if any(s in i.get('affectedSystems', []) for i in issues if i.get('severity') == 'CRITICAL')])
            },
            'systemDetails': list(all_systems),
            'issues': issues
        }
    
    elif 'Incident Analysis' in report_type:
        # Detailed incident breakdown
        return {
            **base_metrics,
            'incidents': [
                {
                    'id': issue.get('issueId'),
                    'severity': issue.get('severity'),
                    'category': issue.get('category'),
                    'description': issue.get('description'),
                    'occurrences': issue.get('occurrences'),
                    'systems': issue.get('affectedSystems', []),
                    'users': issue.get('affectedUsers', []),
                    'rootCause': issue.get('rootCause'),
                    'solution': issue.get('solution')
                }
                for issue in sorted(issues, key=lambda x: x.get('occurrences', 0), reverse=True)
            ]
        }
    
    elif 'Remediation Status' in report_type:
        # Action items and solutions
        return {
            **base_metrics,
            'actionItems': [
                {
                    'priority': 'High' if issue.get('severity') == 'CRITICAL' else 'Medium' if issue.get('severity') == 'ERROR' else 'Low',
                    'issue': issue.get('description'),
                    'solution': issue.get('solution'),
                    'affectedCount': len(issue.get('affectedSystems', [])),
                    'status': 'Open'
                }
                for issue in sorted(issues, key=lambda x: ('CRITICAL', 'ERROR', 'WARNING').index(x.get('severity', 'WARNING')))
            ],
            'issues': issues
        }
    
    elif 'Asset Inventory' in report_type:
        # System and user inventory
        return {
            **base_metrics,
            'inventory': {
                'systems': sorted(list(all_systems)),
                'users': sorted(list(all_users)),
                'systemCount': len(all_systems),
                'userCount': len(all_users)
            },
            'systemIssues': {
                system: [
                    {
                        'issueId': i.get('issueId'),
                        'severity': i.get('severity'),
                        'description': i.get('description')
                    }
                    for i in issues if system in i.get('affectedSystems', [])
                ]
                for system in all_systems
            }
        }
    
    elif 'Compliance Status Report' in report_type:
        # Compliance metrics
        security_issues = [i for i in issues if 'security' in i.get('category', '').lower()]
        policy_violations = [i for i in issues if i.get('severity') == 'CRITICAL']
        
        return {
            **base_metrics,
            'complianceStatus': {
                'overallStatus': 'Non-Compliant' if critical > 0 else 'Compliant',
                'securityIssues': len(security_issues),
                'policyViolations': len(policy_violations),
                'auditFindings': len(issues)
            },
            'violations': policy_violations,
            'recommendations': [
                'Address all critical issues immediately',
                'Review security policies',
                'Conduct staff training'
            ],
            'issues': issues
        }
    
    elif 'Security Incident Log' in report_type:
        # Security audit trail
        security_events = [i for i in issues if 'security' in i.get('category', '').lower() or i.get('severity') == 'CRITICAL']
        return {
            **base_metrics,
            'securityEvents': [
                {
                    'timestamp': datetime.now().isoformat(),
                    'severity': event.get('severity'),
                    'type': event.get('category'),
                    'description': event.get('description'),
                    'systems': event.get('affectedSystems', []),
                    'response': 'Automated detection and logging',
                    'status': 'Requires Review'
                }
                for event in security_events
            ],
            'issues': security_events
        }
    
    elif 'Trend Analysis' in report_type or 'Recurring Issues' in report_type:
        # Pattern analysis
        recurring = [i for i in issues if i.get('occurrences', 0) > 1]
        return {
            **base_metrics,
            'patterns': {
                'recurringIssues': len(recurring),
                'topRecurring': sorted(recurring, key=lambda x: x.get('occurrences', 0), reverse=True)[:10]
            },
            'trends': {
                'criticalTrend': 'Increasing' if critical > 5 else 'Stable',
                'categoryBreakdown': {
                    cat: len([i for i in issues if i.get('category') == cat])
                    for cat in set(i.get('category', 'Other') for i in issues)
                }
            },
            'issues': recurring
        }
    
    elif 'Comparative Analysis' in report_type:
        # Period comparison (simulated)
        return {
            **base_metrics,
            'currentPeriod': {
                'issues': len(issues),
                'critical': critical,
                'systems': len(all_systems)
            },
            'previousPeriod': {
                'issues': int(len(issues) * 0.9),  # Simulated
                'critical': max(0, critical - 2),
                'systems': len(all_systems)
            },
            'changes': {
                'issuesChange': '+10%',
                'criticalChange': f"+{critical - max(0, critical - 2)}" if critical > max(0, critical - 2) else "0",
                'trend': 'Increasing'
            },
            'issues': issues
        }
    
    elif 'Capacity Planning' in report_type:
        # Resource planning
        return {
            **base_metrics,
            'currentCapacity': {
                'systemsManaged': len(all_systems),
                'usersSupported': len(all_users),
                'issueVolume': len(issues)
            },
            'projections': {
                '3MonthForecast': int(len(issues) * 1.15),
                '6MonthForecast': int(len(issues) * 1.30),
                'recommendedCapacity': len(all_systems) + 10
            },
            'recommendations': [
                'Plan for 15% growth in Q2',
                'Add 2 support staff',
                'Upgrade monitoring infrastructure'
            ],
            'issues': issues
        }
    
    else:
        # Default: return full data with report type
        return {
            **base_metrics,
            'issues': issues,
            'fullAnalysis': full_data
        }


@app.route('/api/reports/export', methods=['POST', 'GET'])
def export_report():
    """Export report to file"""
    try:
        # Handle both POST (JSON) and POST (form data)
        if request.method == 'POST':
            if request.is_json:
                data = request.json
            else:
                data = request.form
        else:
            data = request.args
            
        format_type = data.get('format', 'html').lower()
        report_type = data.get('reportType', 'General Report')
        
        print(f"[EXPORT] Request received for format: {format_type}")
        print(f"[EXPORT] Report type: {report_type}")
        print(f"[EXPORT] Request method: {request.method}")
        print(f"[EXPORT] Request data: {data}")
        
        if 'latest' not in analysis_cache:
            print("[EXPORT] Error: No analysis data available")
            return jsonify({
                'success': False,
                'error': 'No analysis available to export'
            }), 404
        
        report_data = analysis_cache['latest']
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Generate report-specific data
        filtered_data = generate_report_data(report_data, report_type)
        
        # Create filename from report type
        report_slug = report_type.lower().replace(' ', '_').replace('-', '_')
        filename = f'{report_slug}_{timestamp}.{format_type}'
        
        print(f"[EXPORT] Generating {format_type.upper()} report: {filename}")
        print(f"[EXPORT] Report type for CSV matching: '{report_type}'")
        
        # Generate report based on format
        if format_type == 'json':
            from flask import make_response
            print(f"[EXPORT] Creating JSON response with {len(json.dumps(filtered_data))} bytes")
            response = make_response(json.dumps(filtered_data, indent=2))
            response.headers['Content-Type'] = 'application/json'
            response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
            response.headers['Access-Control-Expose-Headers'] = 'Content-Disposition'
            print("[EXPORT] JSON response ready")
            return response
            
        elif format_type == 'csv':
            import io
            import csv
            output = io.StringIO()
            writer = csv.writer(output)
            
            print(f"[EXPORT] Checking report type for CSV format: '{report_type}'")
            
            # Generate report-specific CSV format
            if 'Executive Summary' in report_type:
                print("[EXPORT] Using Executive Summary CSV format")
                writer.writerow(['Report Type', 'Generated At', 'Total Issues', 'Critical', 'Error', 'Warning', 'Systems', 'Users'])
                writer.writerow([
                    filtered_data['reportType'],
                    filtered_data['generatedAt'],
                    filtered_data['summary']['totalIssues'],
                    filtered_data['summary']['criticalIssues'],
                    filtered_data['summary']['errorIssues'],
                    filtered_data['summary']['warningIssues'],
                    filtered_data['summary']['affectedSystems'],
                    filtered_data['summary']['affectedUsers']
                ])
                writer.writerow([])  # Empty row
                writer.writerow(['Key Findings'])
                for finding in filtered_data.get('keyFindings', []):
                    writer.writerow([finding])
                writer.writerow([])
                writer.writerow(['Top Issues', 'Severity', 'Occurrences', 'Description'])
                for issue in filtered_data.get('topIssues', []):
                    writer.writerow(['', issue.get('severity'), issue.get('occurrences'), issue.get('description')])
                    
            elif 'Board Report' in report_type:
                writer.writerow(['Board Report - Generated:', filtered_data['generatedAt']])
                writer.writerow([])
                writer.writerow(['Fleet Health', filtered_data['executiveSummary']['fleetHealth']])
                writer.writerow(['Systems Affected', filtered_data['executiveSummary']['systemsAffected']])
                writer.writerow(['Users Impacted', filtered_data['executiveSummary']['usersImpacted']])
                writer.writerow(['Risk Level', filtered_data['executiveSummary']['riskLevel']])
                writer.writerow([])
                writer.writerow(['Business Impact'])
                writer.writerow(['Productivity', filtered_data['businessImpact']['productivity']])
                writer.writerow(['Security', filtered_data['businessImpact']['security']])
                writer.writerow(['Compliance', filtered_data['businessImpact']['compliance']])
                writer.writerow([])
                writer.writerow(['Strategic Recommendations'])
                for rec in filtered_data.get('strategicRecommendations', []):
                    writer.writerow([rec])
                    
            elif 'Business Impact Analysis' in report_type:
                writer.writerow(['Business Impact Analysis - Generated:', filtered_data['generatedAt']])
                writer.writerow([])
                writer.writerow(['Category', 'Issue Count', 'Systems Affected', 'Users Affected', 'Business Impact'])
                for cat, data in filtered_data.get('impactAnalysis', {}).items():
                    writer.writerow([cat, data['issueCount'], data['systemsAffected'], data['usersAffected'], data['businessImpact']])
                writer.writerow([])
                writer.writerow(['Cost Estimates'])
                cost = filtered_data.get('costEstimate', {})
                writer.writerow(['Downtime Hours', cost.get('downtimeHours', 0)])
                writer.writerow(['Productivity Loss', cost.get('productivityLoss', '$0')])
                writer.writerow(['Remediation Cost', cost.get('remediationCost', '$0')])
                
            elif 'Fleet Health Dashboard' in report_type:
                writer.writerow(['Fleet Health Dashboard - Generated:', filtered_data['generatedAt']])
                writer.writerow([])
                status = filtered_data.get('fleetStatus', {})
                writer.writerow(['Total Systems', status.get('totalSystems', 0)])
                writer.writerow(['Healthy Systems', status.get('healthySystems', 0)])
                writer.writerow(['At Risk Systems', status.get('atRiskSystems', 0)])
                writer.writerow(['Critical Systems', status.get('criticalSystems', 0)])
                writer.writerow([])
                writer.writerow(['System Inventory'])
                for system in filtered_data.get('systemDetails', []):
                    writer.writerow([system])
                    
            elif 'Incident Analysis' in report_type:
                writer.writerow(['Incident ID', 'Severity', 'Category', 'Description', 'Occurrences', 'Systems', 'Users', 'Root Cause'])
                for incident in filtered_data.get('incidents', []):
                    writer.writerow([
                        incident.get('id', ''),
                        incident.get('severity', ''),
                        incident.get('category', ''),
                        incident.get('description', ''),
                        incident.get('occurrences', 0),
                        ', '.join(incident.get('systems', [])),
                        ', '.join(incident.get('users', [])),
                        incident.get('rootCause', '')
                    ])
                    
            elif 'Remediation Status' in report_type:
                writer.writerow(['Priority', 'Issue', 'Solution', 'Affected Count', 'Status'])
                for item in filtered_data.get('actionItems', []):
                    solution = item.get('solution', '')
                    if isinstance(solution, list):
                        solution = ' | '.join(solution)
                    writer.writerow([
                        item.get('priority', ''),
                        item.get('issue', ''),
                        solution,
                        item.get('affectedCount', 0),
                        item.get('status', '')
                    ])
                    
            elif 'Asset Inventory' in report_type:
                writer.writerow(['Asset Inventory - Generated:', filtered_data['generatedAt']])
                writer.writerow([])
                inv = filtered_data.get('inventory', {})
                writer.writerow(['Total Systems', inv.get('systemCount', 0)])
                writer.writerow(['Total Users', inv.get('userCount', 0)])
                writer.writerow([])
                writer.writerow(['System Name', 'Issue Count', 'Critical Issues'])
                system_issues = filtered_data.get('systemIssues', {})
                for system in inv.get('systems', []):
                    issues = system_issues.get(system, [])
                    critical_count = sum(1 for i in issues if i.get('severity') == 'CRITICAL')
                    writer.writerow([system, len(issues), critical_count])
                    
            elif 'Compliance Status Report' in report_type:
                writer.writerow(['Compliance Status Report - Generated:', filtered_data['generatedAt']])
                writer.writerow([])
                status = filtered_data.get('complianceStatus', {})
                writer.writerow(['Overall Status', status.get('overallStatus', '')])
                writer.writerow(['Security Issues', status.get('securityIssues', 0)])
                writer.writerow(['Policy Violations', status.get('policyViolations', 0)])
                writer.writerow(['Audit Findings', status.get('auditFindings', 0)])
                writer.writerow([])
                writer.writerow(['Critical Violations', 'Severity', 'Description', 'Affected Systems'])
                for violation in filtered_data.get('violations', []):
                    writer.writerow([
                        violation.get('issueId', ''),
                        violation.get('severity', ''),
                        violation.get('description', ''),
                        ', '.join(violation.get('affectedSystems', []))
                    ])
                    
            elif 'Security Incident Log' in report_type:
                writer.writerow(['Timestamp', 'Severity', 'Type', 'Description', 'Systems', 'Status'])
                for event in filtered_data.get('securityEvents', []):
                    writer.writerow([
                        event.get('timestamp', ''),
                        event.get('severity', ''),
                        event.get('type', ''),
                        event.get('description', ''),
                        ', '.join(event.get('systems', [])),
                        event.get('status', '')
                    ])
                    
            elif 'Trend Analysis' in report_type or 'Recurring Issues' in report_type:
                patterns = filtered_data.get('patterns', {})
                writer.writerow(['Trend Analysis - Generated:', filtered_data['generatedAt']])
                writer.writerow(['Total Recurring Issues', patterns.get('recurringIssues', 0)])
                writer.writerow([])
                writer.writerow(['Issue ID', 'Severity', 'Description', 'Occurrences', 'Category'])
                for issue in patterns.get('topRecurring', []):
                    writer.writerow([
                        issue.get('issueId', ''),
                        issue.get('severity', ''),
                        issue.get('description', ''),
                        issue.get('occurrences', 0),
                        issue.get('category', '')
                    ])
                writer.writerow([])
                writer.writerow(['Category Trends'])
                for cat, count in filtered_data.get('trends', {}).get('categoryBreakdown', {}).items():
                    writer.writerow([cat, count])
                    
            elif 'Comparative Analysis' in report_type:
                writer.writerow(['Comparative Analysis - Generated:', filtered_data['generatedAt']])
                writer.writerow([])
                writer.writerow(['Metric', 'Current Period', 'Previous Period', 'Change'])
                curr = filtered_data.get('currentPeriod', {})
                prev = filtered_data.get('previousPeriod', {})
                changes = filtered_data.get('changes', {})
                writer.writerow(['Total Issues', curr.get('issues', 0), prev.get('issues', 0), changes.get('issuesChange', '')])
                writer.writerow(['Critical Issues', curr.get('critical', 0), prev.get('critical', 0), changes.get('criticalChange', '')])
                writer.writerow(['Systems Affected', curr.get('systems', 0), prev.get('systems', 0), '-'])
                writer.writerow(['Trend', '', '', changes.get('trend', '')])
                
            elif 'Capacity Planning' in report_type:
                writer.writerow(['Capacity Planning Report - Generated:', filtered_data['generatedAt']])
                writer.writerow([])
                curr = filtered_data.get('currentCapacity', {})
                proj = filtered_data.get('projections', {})
                writer.writerow(['Current Capacity'])
                writer.writerow(['Systems Managed', curr.get('systemsManaged', 0)])
                writer.writerow(['Users Supported', curr.get('usersSupported', 0)])
                writer.writerow(['Issue Volume', curr.get('issueVolume', 0)])
                writer.writerow([])
                writer.writerow(['Projections'])
                writer.writerow(['3-Month Forecast', proj.get('3MonthForecast', 0)])
                writer.writerow(['6-Month Forecast', proj.get('6MonthForecast', 0)])
                writer.writerow(['Recommended Capacity', proj.get('recommendedCapacity', 0)])
                writer.writerow([])
                writer.writerow(['Recommendations'])
                for rec in filtered_data.get('recommendations', []):
                    writer.writerow([rec])
                    
            else:
                # Default: Export issues as CSV
                if 'issues' in filtered_data:
                    writer.writerow(['Issue ID', 'Severity', 'Category', 'Description', 'Occurrences', 
                                   'Root Cause', 'Solution', 'Affected Systems', 'Affected Users'])
                    
                    for issue in filtered_data['issues']:
                        writer.writerow([
                            issue.get('issueId', ''),
                            issue.get('severity', ''),
                            issue.get('category', ''),
                            issue.get('description', ''),
                            issue.get('occurrences', 0),
                            issue.get('rootCause', ''),
                            ' | '.join(issue.get('solution', [])) if isinstance(issue.get('solution'), list) else issue.get('solution', ''),
                            ', '.join(issue.get('affectedSystems', [])),
                            ', '.join(issue.get('affectedUsers', []))
                        ])
            
            print(f"[EXPORT] CSV generated for {report_type}")
            
            from flask import make_response
            response = make_response(output.getvalue())
            response.headers['Content-Type'] = 'text/csv'
            response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
            response.headers['Access-Control-Expose-Headers'] = 'Content-Disposition'
            print("[EXPORT] CSV response ready")
            return response
            
        elif format_type in ['html', 'pdf', 'powerpoint', 'ppt', 'excel', 'xlsx']:
            # For these formats, return success with download link
            # In production, these would generate actual files
            print(f"[EXPORT] Returning success message for {format_type.upper()}")
            return jsonify({
                'success': True,
                'message': f'Report export initiated for {format_type.upper()}',
                'filename': filename,
                'note': f'{format_type.upper()} generation would be implemented here'
            })
        
        else:
            print(f"[EXPORT] Error: Unsupported format {format_type}")
            return jsonify({
                'success': False,
                'error': f'Unsupported format: {format_type}'
            }), 400
        
    except Exception as e:
        print(f"[EXPORT] Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/analysis/state', methods=['GET'])
def get_analysis_state():
    """Return the background watcher state and last analysis metadata."""
    last_run_at = analysis_state['last_run_at']
    return jsonify({
        'success': True,
        'last_run_at': last_run_at.isoformat() if last_run_at else None,
        'last_source': analysis_state['last_source'],
        'last_error': analysis_state['last_error'],
        'watcher_running': watcher_thread is not None and watcher_thread.is_alive(),
        'has_latest_report': 'latest' in analysis_cache
    })


# ============================================================================
# ADMIN API ENDPOINTS
# ============================================================================

@app.route('/api/config', methods=['GET'])
def get_config():
    """Get current system configuration"""
    return jsonify({
        'success': True,
        'llm_enabled': LLM_ENABLED,
        'llm_provider': LLM_PROVIDER,
        'llm_model': LLM_MODEL,
        'llm_temperature': 0.7,  # Default value
        'auto_analysis_enabled': watcher_thread is not None and watcher_thread.is_alive(),
        'analysis_interval': WATCH_INTERVAL_SECONDS,
        'log_retention_days': 30,
        'max_threads': 4,
    })


@app.route('/api/config', methods=['POST'])
def update_config():
    """Update system configuration"""
    try:
        data = request.json
        
        # In a production system, you would persist these settings
        # For now, we validate and return success
        config_update = {
            'llm_model': data.get('llm_model', LLM_MODEL),
            'llm_provider': data.get('llm_provider', LLM_PROVIDER),
            'llm_enabled': data.get('llm_enabled', LLM_ENABLED),
            'llm_temperature': data.get('llm_temperature', 0.7),
            'auto_analysis_enabled': data.get('auto_analysis_enabled', False),
            'analysis_interval': data.get('analysis_interval', WATCH_INTERVAL_SECONDS),
            'log_retention_days': data.get('log_retention_days', 30),
            'max_threads': data.get('max_threads', 4),
        }
        
        # Update global settings if needed
        global current_llm_analyzer
        if config_update['llm_enabled']:
            current_llm_analyzer = LLMAnalyzer(
                model_name=config_update['llm_model'],
                provider=config_update['llm_provider']
            )
        
        return jsonify({
            'success': True,
            'message': 'Configuration updated successfully',
            'config': config_update
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400


@app.route('/api/models/available', methods=['GET'])
def get_available_models():
    """Get list of available LLM models"""
    try:
        provider = request.args.get('provider', LLM_PROVIDER)
        models = []
        
        installed_models = []
        if provider == 'ollama':
            installed_models, error = _list_ollama_models()
            if not error:
                models.extend(installed_models)

        # Add default models as suggestions
        defaults = ['llama3.2:3b', 'llama2', 'neural-chat', 'mistral']
        for model in defaults:
            if model not in models:
                models.append(model)
        
        return jsonify({
            'success': True,
            'models': sorted(list(set(models))),
            'installed_models': sorted(list(set(installed_models))),
            'suggested_models': defaults
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'models': []
        }), 500


@app.route('/api/test-llm', methods=['POST'])
def test_llm_connection():
    """Test LLM connection and availability"""
    try:
        data = request.json
        model = data.get('model', LLM_MODEL)
        provider = data.get('provider', LLM_PROVIDER)
        
        llm = LLMAnalyzer(model_name=model, provider=provider)
        
        if llm.check_provider_availability():
            return jsonify({
                'success': True,
                'message': f'{provider} is available',
                'model': model,
                'provider': provider
            })
        else:
            return jsonify({
                'success': False,
                'error': f'{provider} is not available. Please ensure it is running.',
                'model': model,
                'provider': provider
            }), 503
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/analyzer/start', methods=['POST'])
def start_analyzer():
    """Start the background log analyzer"""
    try:
        global watcher_thread, watcher_started
        
        if watcher_thread is not None and watcher_thread.is_alive():
            return jsonify({
                'success': True,
                'message': 'Analyzer is already running',
                'status': 'running'
            })
        
        # Reset the flag to allow restart
        watcher_started = False
        watcher_stop_event.clear()
        watcher_thread = threading.Thread(target=_watcher_loop, name="LogWatcher", daemon=True)
        watcher_thread.start()
        watcher_started = True
        
        return jsonify({
            'success': True,
            'message': 'Log analyzer started',
            'status': 'running'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/analyzer/stop', methods=['POST'])
def stop_analyzer():
    """Stop the background log analyzer"""
    try:
        global watcher_thread, watcher_started
        
        if watcher_thread is None or not watcher_thread.is_alive():
            return jsonify({
                'success': True,
                'message': 'Analyzer is already stopped',
                'status': 'stopped'
            })
        
        watcher_stop_event.set()
        watcher_thread.join(timeout=5)
        watcher_thread = None
        watcher_stop_event.clear()
        # Allow a subsequent start/restart to recreate the watcher
        watcher_started = False
        
        return jsonify({
            'success': True,
            'message': 'Log analyzer stopped',
            'status': 'stopped'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/analyzer/restart', methods=['POST'])
def restart_analyzer():
    """Restart the background log analyzer"""
    try:
        global watcher_thread, watcher_started
        
        # Stop if running
        if watcher_thread is not None and watcher_thread.is_alive():
            watcher_stop_event.set()
            watcher_thread.join(timeout=5)
            watcher_thread = None
            watcher_stop_event.clear()
        
        # Start again (force reset so restart works even after a stop)
        watcher_started = False
        watcher_stop_event.clear()
        watcher_thread = threading.Thread(target=_watcher_loop, name="LogWatcher", daemon=True)
        watcher_thread.start()
        watcher_started = True
        
        return jsonify({
            'success': True,
            'message': 'Log analyzer restarted',
            'status': 'running'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/analyzer/status', methods=['GET'])
def get_analyzer_status():
    """Get current analyzer status"""
    try:
        is_running = watcher_thread is not None and watcher_thread.is_alive()
        
        return jsonify({
            'success': True,
            'status': 'running' if is_running else 'stopped',
            'is_running': is_running,
            'last_run': analysis_state['last_run_at'].isoformat() if analysis_state['last_run_at'] else None,
            'last_error': analysis_state['last_error']
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ollama/status', methods=['GET'])
def get_ollama_status():
    """Get Ollama service status and information"""
    try:
        proxies = {'http': None, 'https': None}
        
        # Check if Ollama is running
        try:
            response = requests.get(
                'http://localhost:11434/api/tags',
                timeout=3,
                proxies=proxies
            )
            is_running = response.status_code in [200, 403]
        except:
            is_running = False
        
        # Get installed models
        installed_models = []
        if is_running:
            try:
                response = requests.get(
                    'http://localhost:11434/api/tags',
                    timeout=5,
                    proxies=proxies
                )
                if response.status_code == 200:
                    data = response.json()
                    installed_models = [
                        {
                            'name': model.get('name', ''),
                            'size': model.get('size', 0),
                            'size_gb': round(model.get('size', 0) / (1024**3), 2),
                            'modified': model.get('modified_at', '')
                        }
                        for model in data.get('models', [])
                    ]
            except Exception as e:
                print(f"Error fetching Ollama models: {e}")
        
        return jsonify({
            'success': True,
            'is_running': is_running,
            'status': 'running' if is_running else 'stopped',
            'base_url': 'http://localhost:11434',
            'installed_models': installed_models,
            'model_count': len(installed_models),
            'total_size_gb': round(sum(m.get('size', 0) for m in installed_models) / (1024**3), 2)
        })
    except Exception as e:
        return jsonify({
            'success': True,
            'error': str(e),
            'is_running': False
        }), 200


@app.route('/api/ollama/pull', methods=['POST'])
def ollama_pull_model():
    """Download an Ollama model"""
    try:
        data = request.json
        model_name = data.get('model')
        
        if not model_name:
            return jsonify({
                'success': False,
                'error': 'Model name is required'
            }), 400
        
        # Check if Ollama is running
        try:
            response = requests.get(
                'http://localhost:11434/api/tags',
                timeout=3,
                proxies={'http': None, 'https': None}
            )
            is_running = response.status_code in [200, 403]
        except:
            is_running = False
        
        if not is_running:
            return jsonify({
                'success': False,
                'error': 'Ollama service is not running. Please start Ollama first.',
                'is_running': False
            }), 503
        
        # Pull the model
        success, message = _pull_ollama_model(model_name)
        
        if success:
            return jsonify({
                'success': True,
                'message': message,
                'model': model_name
            })
        else:
            return jsonify({
                'success': False,
                'error': message,
                'model': model_name
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ollama/start', methods=['POST'])
def start_ollama():
    """Start Ollama service"""
    try:
        # Check if already running
        try:
            response = requests.get(
                'http://localhost:11434/api/tags',
                timeout=3,
                proxies={'http': None, 'https': None}
            )
            if response.status_code in [200, 403]:
                return jsonify({
                    'success': True,
                    'message': 'Ollama is already running',
                    'is_running': True
                })
        except:
            pass
        
        # Try to start Ollama
        try:
            # For Windows - try to start Ollama
            result = subprocess.Popen(
                ['ollama', 'serve'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform == 'win32' else 0
            )
            
            # Give it a moment to start
            time.sleep(2)
            
            # Check if it started
            try:
                response = requests.get(
                    'http://localhost:11434/api/tags',
                    timeout=3,
                    proxies={'http': None, 'https': None}
                )
                if response.status_code in [200, 403]:
                    return jsonify({
                        'success': True,
                        'message': 'Ollama service started successfully',
                        'is_running': True
                    })
            except:
                pass
            
            # If not responding yet, it might still be starting
            return jsonify({
                'success': True,
                'message': 'Ollama service starting (please wait a moment and refresh)',
                'is_running': False,
                'started': True
            })
            
        except FileNotFoundError:
            return jsonify({
                'success': False,
                'error': 'Ollama is not installed. Please download and install from ollama.ai',
                'is_installed': False,
                'download_url': 'https://ollama.ai'
            }), 503
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Failed to start Ollama: {str(e)}',
                'is_running': False
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ollama/check-installed', methods=['GET'])
def check_ollama_installed():
    """Check if Ollama is installed"""
    try:
        result = subprocess.run(
            ['ollama', '--version'],
            capture_output=True,
            text=True,
            timeout=5
        )
        is_installed = result.returncode == 0
        version = result.stdout.strip() if is_installed else None
        
        return jsonify({
            'success': True,
            'is_installed': is_installed,
            'version': version,
            'download_url': 'https://ollama.ai'
        })
    except FileNotFoundError:
        return jsonify({
            'success': True,
            'is_installed': False,
            'version': None,
            'download_url': 'https://ollama.ai'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'is_installed': False
        }), 200


@app.route('/api/ollama/install', methods=['POST'])
def install_ollama():
    """Download and install Ollama automatically"""
    try:
        
        # Check if already installed
        try:
            result = subprocess.run(
                ['ollama', '--version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                return jsonify({
                    'success': True,
                    'message': 'Ollama is already installed',
                    'is_installed': True,
                    'version': result.stdout.strip()
                })
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass
        except Exception as check_error:
            print(f"Error checking Ollama installation: {check_error}")
        
        # Download Ollama installer
        print("Downloading Ollama installer...")
        try:
            # Use the direct download URL from Ollama
            installer_url = 'https://ollama.ai/download/OllamaSetup.exe'
            temp_dir = tempfile.gettempdir()
            installer_path = os.path.join(temp_dir, 'OllamaSetup.exe')
            
            print(f"Downloading from: {installer_url}")
            print(f"Saving to: {installer_path}")
            
            # Download the file with proper headers
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(installer_url, timeout=120, stream=True, headers=headers)
            response.raise_for_status()
            
            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0
            
            with open(installer_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total_size > 0:
                            progress = (downloaded / total_size * 100)
                            print(f"Download progress: {progress:.1f}%")
            
            print(f"Installer downloaded successfully to: {installer_path}")
            print(f"File size: {os.path.getsize(installer_path)} bytes")
            
            # Run the installer
            print("Running Ollama installer...")
            result = subprocess.Popen(
                [installer_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform == 'win32' else 0
            )
            
            # Wait for installer to complete (with timeout)
            try:
                stdout, stderr = result.communicate(timeout=300)  # 5 minute timeout
                print(f"Installer completed with return code: {result.returncode}")
                
                if result.returncode == 0:
                    # Verify installation
                    time.sleep(2)
                    try:
                        verify_result = subprocess.run(
                            ['ollama', '--version'],
                            capture_output=True,
                            text=True,
                            timeout=5
                        )
                        if verify_result.returncode == 0:
                            return jsonify({
                                'success': True,
                                'message': 'Ollama installed successfully!',
                                'is_installed': True,
                                'version': verify_result.stdout.strip()
                            })
                        else:
                            return jsonify({
                                'success': False,
                                'error': 'Installation completed but verification failed. Please restart the application.',
                                'is_installed': False
                            }), 500
                    except subprocess.TimeoutExpired:
                        return jsonify({
                            'success': False,
                            'error': 'Installation completed but verification timed out. Please restart the application.',
                            'is_installed': False
                        }), 500
                else:
                    error_msg = stderr.decode('utf-8', errors='ignore') if stderr else 'Unknown error'
                    print(f"Installer error: {error_msg}")
                    return jsonify({
                        'success': False,
                        'error': f'Installer failed. Please try downloading from https://ollama.ai manually.',
                        'is_installed': False
                    }), 500
            except subprocess.TimeoutExpired:
                # Installer is still running, which is fine
                return jsonify({
                    'success': True,
                    'message': 'Ollama installation started. Please wait for the installer to complete.',
                    'is_installed': False,
                    'installing': True
                })
            
        except requests.exceptions.RequestException as e:
            print(f"Download error: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to download Ollama. Please visit https://ollama.ai to download manually.',
                'is_installed': False,
                'download_url': 'https://ollama.ai'
            }), 500
        except IOError as io_error:
            print(f"File I/O error: {io_error}")
            return jsonify({
                'success': False,
                'error': f'Failed to save installer file. Check disk space.',
                'is_installed': False
            }), 500
        
    except Exception as e:
        print(f"Error installing Ollama: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'Installation error: {str(e)}',
            'is_installed': False
        }), 500


if __name__ == '__main__':
    print("=" * 80)
    print("Log Analyzer REST API Server")
    print("=" * 80)
    print(f"\nAPI Server starting...")
    print(f"LLM Enabled: {LLM_ENABLED}")
    print(f"Default Provider: {LLM_PROVIDER}")
    print(f"Default Model: {LLM_MODEL}")
    print(f"\nAvailable Endpoints:")
    print("\n  Analysis:")
    print("    GET  /api/health")
    print("    POST /api/analyze")
    print("    GET  /api/analysis/state")
    print("    GET  /api/reports/latest")
    print("    POST /api/reports/export")
    print("\n  Configuration (Admin):")
    print("    GET  /api/config")
    print("    POST /api/config")
    print("    GET  /api/models/available")
    print("    POST /api/test-llm")
    print("\n  Analyzer Control (Admin):")
    print("    POST /api/analyzer/start")
    print("    POST /api/analyzer/stop")
    print("    POST /api/analyzer/restart")
    print("    GET  /api/analyzer/status")
    print("\n  Ollama Control (Admin):")
    print("    GET  /api/ollama/status")
    print("    GET  /api/ollama/check-installed")
    print("    POST /api/ollama/start")
    print("    POST /api/ollama/pull")
    print("    POST /api/ollama/install")
    print("\n  Data:")
    print("    GET  /api/logs/sessions")
    print("    GET  /api/logs/diagnose (troubleshooting)")
    print(f"\nServer running on: http://localhost:5000")
    print("=" * 80)
    print("\nPress Ctrl+C to stop the server\n")

    # Start watcher only in the reloaded main process (prevents double-start with debug reloader)
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true" or not app.debug:
        _start_watcher_if_needed()

    app.run(host='0.0.0.0', port=5000, debug=False)
