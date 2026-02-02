"""
Quick Start Guide - Log Analyzer System
"""

# ===========================================
# QUICK START - Run the Log Analyzer
# ===========================================

# 1. Install dependencies (first time only)
#    pip install -r requirements.txt

# 2. Run the analyzer
#    python main.py

# 3. View results
#    - Console output: displayed in terminal
#    - HTML report: saved in reports/ folder

# ===========================================
# COMMAND LINE OPTIONS
# ===========================================

# Generate only console output
# python main.py --format console

# Generate only HTML report
# python main.py --format html

# Generate JSON report
# python main.py --format json

# Use database (when implemented)
# python main.py --data-source database

# ===========================================
# UNDERSTANDING THE OUTPUT
# ===========================================

# The report shows:
# 1. Issue ID: Unique identifier for the issue
# 2. Category: Type of issue (Network, Driver, System, etc.)
# 3. Severity: Critical, Error, Warning, Information
# 4. User Count: Number of unique users affected
# 5. Occurrences: Total number of times the issue occurred
# 6. Root Cause: Why the issue happened
# 7. Solution: Recommended fix

# ===========================================
# LOG STRUCTURE
# ===========================================

# Expected directory structure:
# analysis_logs/
#   {user_id}/
#     {system_name}/
#       {timestamp}/
#         System.log
#         Application.log
#         Network.log
#         Driver.log
#         network_ncsi.log
#         network_wlan.log

# ===========================================
# CONFIGURATION
# ===========================================

# Edit config.py to customize:
# - LOGS_DIR: Base directory for log files
# - LOG_TYPES: Types of logs to analyze
# - REPORT_OUTPUT_DIR: Where to save reports
# - REPORT_FORMAT: Default report format
# - MIN_SIMILARITY_SCORE: Issue grouping threshold

# ===========================================
# TROUBLESHOOTING
# ===========================================

# No logs found?
# - Check LOGS_DIR in config.py
# - Verify directory structure matches expected format

# Module not found?
# - Install dependencies: pip install -r requirements.txt

# Permission errors?
# - Run with appropriate permissions
# - Check file/folder access rights

# ===========================================
# ADDING MORE LOG SESSIONS
# ===========================================

# 1. Create directory: analysis_logs/{new_user_id}/{new_system}/{timestamp}/
# 2. Add log files to the directory
# 3. Run analyzer again: python main.py

# The analyzer will automatically discover and analyze all log sessions

# ===========================================
# FUTURE DATABASE INTEGRATION
# ===========================================

# To prepare for database integration:
# 1. Uncomment database dependencies in requirements.txt
# 2. Install: pip install -r requirements.txt
# 3. Implement queries in data_source.py (DatabaseDataSource class)
# 4. Update DB_CONFIG in config.py with your database credentials
# 5. Run: python main.py --data-source database

print(__doc__)
