"""
Test and Utility Script for Log Analyzer
Run this to validate the system or add test data
"""

import os
import sys
from datetime import datetime


def test_system():
    """Run a complete system test"""
    print("=" * 80)
    print("LOG ANALYZER SYSTEM TEST")
    print("=" * 80)
    
    # Test 1: Check if all modules can be imported
    print("\n[Test 1] Checking module imports...")
    try:
        import config
        import models
        import log_parser
        import issue_detector
        import report_generator
        import data_source
        import main
        print("✅ All modules imported successfully")
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    
    # Test 2: Check if logs directory exists
    print("\n[Test 2] Checking logs directory...")
    from config import LOGS_DIR
    if os.path.exists(LOGS_DIR):
        print(f"✅ Logs directory exists: {LOGS_DIR}")
        
        # Count log sessions
        parser = log_parser.LogParser()
        sessions = parser.discover_logs(LOGS_DIR)
        print(f"   Found {len(sessions)} log session(s)")
    else:
        print(f"❌ Logs directory not found: {LOGS_DIR}")
        return False
    
    # Test 3: Check if reports directory exists
    print("\n[Test 3] Checking reports directory...")
    from config import REPORT_OUTPUT_DIR
    if not os.path.exists(REPORT_OUTPUT_DIR):
        os.makedirs(REPORT_OUTPUT_DIR)
        print(f"✅ Created reports directory: {REPORT_OUTPUT_DIR}")
    else:
        print(f"✅ Reports directory exists: {REPORT_OUTPUT_DIR}")
    
    # Test 4: Test log parser
    print("\n[Test 4] Testing log parser...")
    try:
        parser = log_parser.LogParser()
        sessions = parser.discover_logs(LOGS_DIR)
        if sessions:
            test_session = sessions[0]
            print(f"✅ Log parser working - found session: {test_session[0]}/{test_session[1]}")
        else:
            print("⚠ No log sessions found to test")
    except Exception as e:
        print(f"❌ Log parser error: {e}")
        return False
    
    # Test 5: Test issue detector
    print("\n[Test 5] Testing issue detector...")
    try:
        detector = issue_detector.IssueDetector()
        patterns = detector.issue_patterns
        print(f"✅ Issue detector initialized with {len(patterns)} patterns")
    except Exception as e:
        print(f"❌ Issue detector error: {e}")
        return False
    
    # Test 6: Test report generator
    print("\n[Test 6] Testing report generator...")
    try:
        from models import AnalysisReport
        generator = report_generator.ReportGenerator(REPORT_OUTPUT_DIR)
        
        # Create dummy report
        test_report = AnalysisReport(
            generated_at=datetime.now(),
            total_users_analyzed=0,
            total_systems_analyzed=0,
            total_logs_processed=0,
            issues=[]
        )
        print("✅ Report generator initialized successfully")
    except Exception as e:
        print(f"❌ Report generator error: {e}")
        return False
    
    # Test 7: Test data source factory
    print("\n[Test 7] Testing data source factory...")
    try:
        from data_source import DataSourceFactory
        from config import LOG_TYPES
        
        ds = DataSourceFactory.create_data_source(
            "filesystem",
            log_parser=parser,
            base_logs_dir=LOGS_DIR,
            log_types=LOG_TYPES
        )
        stats = ds.get_statistics()
        print(f"✅ Data source factory working")
        print(f"   Stats: {stats}")
    except Exception as e:
        print(f"❌ Data source factory error: {e}")
        return False
    
    print("\n" + "=" * 80)
    print("ALL TESTS PASSED ✅")
    print("=" * 80)
    print("\nSystem is ready to use!")
    print("Run: python main.py")
    return True


def show_statistics():
    """Show current log statistics"""
    print("\n" + "=" * 80)
    print("LOG STATISTICS")
    print("=" * 80)
    
    from config import LOGS_DIR, LOG_TYPES
    from log_parser import LogParser
    
    parser = LogParser()
    sessions = parser.discover_logs(LOGS_DIR)
    
    if not sessions:
        print("\nNo log sessions found!")
        return
    
    print(f"\nTotal Sessions: {len(sessions)}")
    print(f"\nSession Details:")
    print("-" * 80)
    
    for user_id, system_name, session_time, path in sessions:
        print(f"\nUser ID: {user_id}")
        print(f"System: {system_name}")
        print(f"Session: {session_time}")
        print(f"Path: {path}")
        
        # Count logs in this session
        log_count = 0
        for log_type in LOG_TYPES:
            log_file = os.path.join(path, log_type)
            if os.path.exists(log_file):
                log_count += 1
        
        print(f"Log Files: {log_count}/{len(LOG_TYPES)}")
    
    print("\n" + "=" * 80)


def validate_log_structure():
    """Validate the log directory structure"""
    print("\n" + "=" * 80)
    print("LOG STRUCTURE VALIDATION")
    print("=" * 80)
    
    from config import LOGS_DIR, LOG_TYPES
    
    if not os.path.exists(LOGS_DIR):
        print(f"\n❌ Base logs directory not found: {LOGS_DIR}")
        print("\nExpected structure:")
        print("  analysis_logs/")
        print("    {user_id}/")
        print("      {system_name}/")
        print("        {timestamp}/")
        print("          System.log")
        print("          Application.log")
        print("          ...")
        return False
    
    print(f"\n✅ Base directory exists: {LOGS_DIR}")
    
    # Check structure
    issues = []
    valid_sessions = 0
    
    for user_id in os.listdir(LOGS_DIR):
        user_path = os.path.join(LOGS_DIR, user_id)
        if not os.path.isdir(user_path):
            continue
        
        for system_name in os.listdir(user_path):
            system_path = os.path.join(user_path, system_name)
            if not os.path.isdir(system_path):
                continue
            
            for session_time in os.listdir(system_path):
                session_path = os.path.join(system_path, session_time)
                if not os.path.isdir(session_path):
                    continue
                
                # Check for log files
                found_logs = []
                missing_logs = []
                
                for log_type in LOG_TYPES:
                    log_file = os.path.join(session_path, log_type)
                    if os.path.exists(log_file):
                        found_logs.append(log_type)
                    else:
                        missing_logs.append(log_type)
                
                if found_logs:
                    valid_sessions += 1
                    print(f"\n✅ Valid session: {user_id}/{system_name}/{session_time}")
                    print(f"   Found: {', '.join(found_logs)}")
                    if missing_logs:
                        print(f"   Missing: {', '.join(missing_logs)}")
                else:
                    issues.append(f"No log files in: {session_path}")
    
    print(f"\n{'-' * 80}")
    print(f"Valid Sessions: {valid_sessions}")
    
    if issues:
        print(f"\n⚠ Issues Found: {len(issues)}")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("\n✅ No issues found!")
    
    print("=" * 80)
    return len(issues) == 0


def main_menu():
    """Display main menu"""
    while True:
        print("\n" + "=" * 80)
        print("LOG ANALYZER - TEST & UTILITY MENU")
        print("=" * 80)
        print("\n1. Run System Test")
        print("2. Show Log Statistics")
        print("3. Validate Log Structure")
        print("4. Run Full Analysis")
        print("5. Exit")
        
        choice = input("\nEnter your choice (1-5): ").strip()
        
        if choice == "1":
            test_system()
        elif choice == "2":
            show_statistics()
        elif choice == "3":
            validate_log_structure()
        elif choice == "4":
            print("\nRunning full analysis...")
            from main import main as run_analyzer
            run_analyzer()
        elif choice == "5":
            print("\nGoodbye!")
            break
        else:
            print("\n❌ Invalid choice. Please enter 1-5.")
        
        input("\nPress Enter to continue...")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "test":
            test_system()
        elif command == "stats":
            show_statistics()
        elif command == "validate":
            validate_log_structure()
        else:
            print(f"Unknown command: {command}")
            print("\nAvailable commands:")
            print("  python test_utils.py test      - Run system tests")
            print("  python test_utils.py stats     - Show log statistics")
            print("  python test_utils.py validate  - Validate log structure")
    else:
        main_menu()
