# Log Analyzer System

A Python-based system for analyzing Windows Event Logs to identify issues, group similar problems across multiple users and systems, and generate comprehensive reports.

## Features

- **Multi-User Log Analysis**: Analyze logs from multiple users and systems
- **Automatic Issue Detection**: Identifies and categorizes issues from Windows Event Logs
- **Pattern Matching**: Groups similar issues across different users
- **Root Cause Analysis**: Provides root cause and solutions for common issues
- **Multiple Report Formats**: Console output, HTML, and JSON reports
- **Extensible Architecture**: Ready for future database integration
- **Log Type Support**: System, Application, Network, Driver, and Security logs

## Project Structure

```
UserSystemLogAnalyzer/
├── main.py                 # Main application entry point
├── config.py              # Configuration settings
├── models.py              # Data models (LogEntry, Issue, AnalysisReport)
├── log_parser.py          # Log file parser
├── issue_detector.py      # Issue detection and categorization
├── report_generator.py    # Report generation (Console, HTML, JSON)
├── data_source.py         # Data source abstraction layer
├── requirements.txt       # Python dependencies
├── analysis_logs/         # Log files directory
│   └── {user_id}/
│       └── {system_name}/
│           ├── {timestamp}/   # Optional session folder
│           │   ├── System.log
│           │   ├── Application.log
│           │   ├── Network.log
│           │   ├── Driver.log
│           │   └── ...
│           └── (or logs directly under system_name)
└── reports/               # Generated reports (HTML/JSON)
```

## Installation

1. **Clone or download the project**

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Verify log structure**: Ensure your logs follow the structure:
   ```
  analysis_logs/{user_id}/{system_name}/{timestamp}/
  # or
  analysis_logs/{user_id}/{system_name}/
   ```

## Usage

### Basic Usage

Run the analyzer with default settings (console + HTML output):
```bash
python main.py
```

### Command Line Options

```bash
# Generate only HTML report
python main.py --format html

# Generate only console output
python main.py --format console

# Generate JSON report
python main.py --format json

# Use database as data source (when implemented)
python main.py --data-source database
```

### Configuration

Edit [config.py](config.py) to customize:

- `LOGS_DIR`: Base directory for log files
- `LOG_TYPES`: Types of logs to analyze
- `REPORT_OUTPUT_DIR`: Where to save reports
- `REPORT_FORMAT`: Default report format
- `DATA_SOURCE`: Data source type (filesystem or database)
- `MIN_SIMILARITY_SCORE`: Threshold for grouping similar issues

## Report Output

### Console Report
Displays a formatted table with:
- Issue ID
- Category
- Severity
- Affected user count
- Occurrences
- Detailed root cause and solutions

### HTML Report
Creates a beautiful, interactive HTML report with:
- Summary statistics
- Sortable issue table
- Color-coded severity levels
- Detailed issue information
- Recommended solutions

### JSON Report
Machine-readable format for integration with other tools

## Issue Categories

The system detects and categorizes issues into:

- **Service Management**: Windows service configuration changes
- **Network Connectivity**: Network disconnections and DNS issues
- **Disk Issues**: Disk errors and bad sectors
- **Application Crash**: Application faults and exceptions
- **Driver Issues**: Driver loading failures
- **Memory Issues**: Out of memory errors
- **Security/Authentication**: Login failures and access denied
- **System Performance**: Timeouts and performance degradation
- **Windows Update**: Update installation failures

## Future Database Integration

The system is designed with a data source abstraction layer for easy database integration. To switch to database mode:

1. Uncomment database dependencies in `requirements.txt`
2. Install: `pip install -r requirements.txt`
3. Implement database queries in [data_source.py](data_source.py)
4. Update connection settings in [config.py](config.py)
5. Run: `python main.py --data-source database`

### Database Schema (Recommended)

```sql
CREATE TABLE log_entries (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50),
    system_name VARCHAR(100),
    session_timestamp VARCHAR(50),
    log_type VARCHAR(50),
    event_number INT,
    level VARCHAR(20),
    source VARCHAR(100),
    event_id INT,
    timestamp TIMESTAMP,
    message TEXT
);

CREATE INDEX idx_user_id ON log_entries(user_id);
CREATE INDEX idx_level ON log_entries(level);
CREATE INDEX idx_timestamp ON log_entries(timestamp);
```

## Extending the System

### Adding New Issue Patterns

Edit the `_load_issue_patterns()` method in [issue_detector.py](issue_detector.py):

```python
{
    "category": "Your Category",
    "pattern": r"your_regex_pattern",
    "severity": "Error",
    "keywords": ["keyword1", "keyword2"],
    "root_cause": "Description of root cause",
    "solution": "Recommended solution"
}
```

### Custom Report Formats

Extend the `ReportGenerator` class in [report_generator.py](report_generator.py) to add new formats.

## Example Output

```
================================================================================
                            LOG ANALYSIS REPORT
================================================================================

Generated At: 2026-01-25 10:30:45
Total Users Analyzed: 1
Total Systems Analyzed: 1
Total Logs Processed: 450
Unique Issues Found: 5

================================================================================

[Issue #1] a7b3c2d1
--------------------------------------------------------------------------------
Category        : Service Management
Severity        : Warning
Affected Users  : 1 users (12197333)
Total Occurrences: 15
Pattern         : Event ID: 7040, Source: System

Root Cause:
  Windows service configuration is being frequently modified, possibly by 
  system updates or third-party software

Recommended Solution:
  Review service dependencies and check for conflicting software that may be 
  changing service configurations
--------------------------------------------------------------------------------
```

## Troubleshooting

### No logs found
- Verify the `LOGS_DIR` path in [config.py](config.py)
- Ensure logs follow the correct directory structure

### Missing dependencies
```bash
pip install -r requirements.txt
```

### Permission errors
- Run with appropriate permissions to read log files
- Check file system permissions on the analysis_logs directory

## Contributing

To contribute:
1. Add new issue patterns for better detection
2. Implement database integration
3. Add new report formats
4. Improve issue grouping algorithms
5. Enhance root cause analysis

## License

Internal use only. Proprietary software.

## Support

For issues and questions, contact the development team.
