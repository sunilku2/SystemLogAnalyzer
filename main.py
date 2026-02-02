"""
Log Analyzer - Main Application Entry Point

This application analyzes Windows Event Logs to identify issues,
group similar problems across users, and generate comprehensive reports.

Usage:
    python main.py [options]

Options:
    --format [console|html|json|both]  : Output format (default: both)
    --data-source [filesystem|database]: Data source (default: filesystem)
"""

import sys
import argparse
from datetime import datetime
from config import LOGS_DIR, LOG_TYPES, REPORT_OUTPUT_DIR, REPORT_FORMAT, DATA_SOURCE, DB_CONFIG
from log_parser import LogParser
from issue_detector import IssueDetector
from report_generator import ReportGenerator
from data_source import DataSourceFactory
from models import AnalysisReport


class LogAnalyzer:
    """Main log analyzer application"""
    
    def __init__(self, data_source_type: str = "filesystem", report_format: str = "both"):
        self.data_source_type = data_source_type
        self.report_format = report_format
        self.log_parser = LogParser()
        self.issue_detector = IssueDetector()
        self.report_generator = ReportGenerator(REPORT_OUTPUT_DIR)
    
    def run(self):
        """Execute the log analysis workflow"""
        print("=" * 100)
        print(" " * 35 + "LOG ANALYZER STARTING")
        print("=" * 100)
        print(f"\nData Source: {self.data_source_type}")
        print(f"Report Format: {self.report_format}")
        print(f"Logs Directory: {LOGS_DIR}\n")
        
        try:
            # Step 1: Load log entries from data source
            print("\n[Step 1/4] Loading log entries...")
            print("-" * 100)
            log_entries = self._load_log_entries()
            
            if not log_entries:
                print("\n⚠ No log entries found. Please check your logs directory.")
                return
            
            # Step 2: Detect issues
            print("\n[Step 2/4] Detecting and categorizing issues...")
            print("-" * 100)
            issues = self.issue_detector.detect_issues(log_entries)
            
            # Step 3: Build analysis report
            print("\n[Step 3/4] Building analysis report...")
            print("-" * 100)
            report = self._build_report(log_entries, issues)
            
            # Step 4: Generate output
            print("\n[Step 4/4] Generating report output...")
            print("-" * 100)
            self.report_generator.generate_report(report, self.report_format)
            
            print("\n" + "=" * 100)
            print(" " * 35 + "ANALYSIS COMPLETE")
            print("=" * 100)
            
        except Exception as e:
            print(f"\n❌ Error during analysis: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
    
    def _load_log_entries(self):
        """Load log entries using the configured data source"""
        try:
            data_source = DataSourceFactory.create_data_source(
                self.data_source_type,
                log_parser=self.log_parser,
                base_logs_dir=LOGS_DIR,
                log_types=LOG_TYPES,
                db_config=DB_CONFIG
            )
            
            # Get and display statistics
            stats = data_source.get_statistics()
            print(f"Data source statistics:")
            for key, value in stats.items():
                print(f"  {key}: {value}")
            
            # Load entries
            log_entries = data_source.get_log_entries()
            return log_entries
            
        except Exception as e:
            print(f"Error loading log entries: {e}")
            raise
    
    def _build_report(self, log_entries, issues):
        """Build the analysis report"""
        # Calculate statistics
        unique_users = set(entry.user_id for entry in log_entries)
        unique_systems = set(entry.system_name for entry in log_entries)
        
        report = AnalysisReport(
            generated_at=datetime.now(),
            total_users_analyzed=len(unique_users),
            total_systems_analyzed=len(unique_systems),
            total_logs_processed=len(log_entries),
            issues=issues
        )
        
        print(f"Report prepared:")
        print(f"  Users analyzed: {report.total_users_analyzed}")
        print(f"  Systems analyzed: {report.total_systems_analyzed}")
        print(f"  Logs processed: {report.total_logs_processed}")
        print(f"  Issues identified: {len(report.issues)}")
        
        return report


def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="Analyze Windows Event Logs and generate issue reports",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py                          # Run with default settings
  python main.py --format html            # Generate only HTML report
  python main.py --format console         # Print to console only
  python main.py --data-source database   # Use database (when implemented)
        """
    )
    
    parser.add_argument(
        '--format',
        choices=['console', 'html', 'json', 'both'],
        default=REPORT_FORMAT,
        help='Output format for the report (default: both)'
    )
    
    parser.add_argument(
        '--data-source',
        choices=['filesystem', 'database'],
        default=DATA_SOURCE,
        help='Data source to read logs from (default: filesystem)'
    )
    
    return parser.parse_args()


def main():
    """Main entry point"""
    args = parse_arguments()
    
    analyzer = LogAnalyzer(
        data_source_type=args.data_source,
        report_format=args.format
    )
    
    analyzer.run()


if __name__ == "__main__":
    main()
