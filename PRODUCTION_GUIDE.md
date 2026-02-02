# Production Deployment Guide

## Overview
This guide helps you deploy the Log Analyzer System in a production environment.

## Prerequisites

### System Requirements
- Python 3.8 or higher
- Windows Server 2016+ or Windows 10+ (for log collection)
- 2GB RAM minimum (4GB recommended)
- 10GB disk space for logs and reports

### Dependencies
```bash
pip install -r requirements.txt
```

## Installation Steps

### 1. Clone/Download the Project
```bash
cd /path/to/deployment
# Copy all project files here
```

### 2. Set Up Virtual Environment
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure the System
Edit `config.py`:

```python
# Production settings
LOGS_DIR = "D:\\LogAnalyzer\\logs"  # Use dedicated drive
REPORT_OUTPUT_DIR = "D:\\LogAnalyzer\\reports"
REPORT_FORMAT = "both"  # Console + HTML
DATA_SOURCE = "filesystem"  # Or "database" when ready
```

### 5. Verify Installation
```bash
python test_utils.py test
```

## Log Collection Setup

### Option 1: Manual Log Collection
1. Collect Windows Event Logs using PowerShell:
   ```powershell
   # Save this as collect_logs.ps1
   $userId = "USER123"
   $systemName = $env:COMPUTERNAME
   $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
   $outputPath = "\\server\logs\$userId\$systemName\$timestamp"
   
   New-Item -ItemType Directory -Path $outputPath -Force
   
   # Export System logs
   wevtutil epl System "$outputPath\System.evtx"
   wevtutil qe System /f:text > "$outputPath\System.log"
   
   # Export Application logs
   wevtutil epl Application "$outputPath\Application.evtx"
   wevtutil qe Application /f:text > "$outputPath\Application.log"
   
   # Export Network logs
   wevtutil qe "Microsoft-Windows-NetworkProfile/Operational" /f:text > "$outputPath\Network.log"
   ```

2. Run on each client machine:
   ```powershell
   .\collect_logs.ps1
   ```

### Option 2: Automated Collection (GPO)
1. Create Group Policy Object
2. Deploy log collection script via Scheduled Task
3. Set to run daily/weekly
4. Configure central log repository

### Option 3: Use Existing SIEM/Log Management
If you have centralized logging:
1. Export logs to filesystem
2. Or implement database integration (see below)

## Running the Analyzer

### Manual Execution
```bash
# Basic run
python main.py

# HTML report only
python main.py --format html

# Console output only
python main.py --format console

# JSON export
python main.py --format json
```

### Scheduled Execution

#### Windows Task Scheduler
1. Open Task Scheduler
2. Create New Task
3. Configure:
   - **Name**: Log Analyzer Daily
   - **Trigger**: Daily at 2:00 AM
   - **Action**: Start Program
     - Program: `C:\LogAnalyzer\.venv\Scripts\python.exe`
     - Arguments: `C:\LogAnalyzer\main.py --format both`
     - Start in: `C:\LogAnalyzer`

#### Linux Cron
```bash
# Edit crontab
crontab -e

# Add line (run daily at 2 AM)
0 2 * * * cd /path/to/loganalyzer && /path/to/.venv/bin/python main.py --format both
```

## Database Integration (Future)

### 1. Set Up Database

#### PostgreSQL
```sql
-- Create database
CREATE DATABASE log_analyzer;

-- Create user
CREATE USER log_user WITH ENCRYPTED PASSWORD 'secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE log_analyzer TO log_user;

-- Connect and create schema
\c log_analyzer

CREATE TABLE log_entries (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    system_name VARCHAR(100) NOT NULL,
    session_timestamp VARCHAR(50) NOT NULL,
    log_type VARCHAR(50) NOT NULL,
    event_number INT,
    level VARCHAR(20),
    source VARCHAR(100),
    event_id INT,
    timestamp TIMESTAMP NOT NULL,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_user_id ON log_entries(user_id);
CREATE INDEX idx_system_name ON log_entries(system_name);
CREATE INDEX idx_level ON log_entries(level);
CREATE INDEX idx_timestamp ON log_entries(timestamp);
CREATE INDEX idx_created_at ON log_entries(created_at);
```

### 2. Update Configuration
```python
# In config.py
DATA_SOURCE = "database"

DB_CONFIG = {
    "host": "db-server.company.com",
    "port": 5432,
    "database": "log_analyzer",
    "user": "log_user",
    "password": "secure_password"  # Use env variable in production!
}
```

### 3. Implement Database Methods
Update `data_source.py` with actual SQL queries (examples provided in file).

### 4. Install Database Drivers
```bash
# Uncomment in requirements.txt
pip install psycopg2-binary
# or
pip install pymysql
```

## Monitoring and Maintenance

### Daily Tasks
- Check if scheduled analysis ran successfully
- Review generated reports in reports/ folder
- Monitor disk space for logs

### Weekly Tasks
- Review critical/error issues
- Archive old reports
- Update issue patterns if needed

### Monthly Tasks
- Clean up old logs (retention policy)
- Review system performance
- Update documentation for new patterns
- Backup configuration

## Security Best Practices

### 1. Protect Sensitive Data
```bash
# Set appropriate permissions
chmod 600 config.py  # Linux
icacls config.py /grant Administrators:F /inheritance:r  # Windows
```

### 2. Use Environment Variables
```python
# Instead of hardcoding passwords
import os
DB_CONFIG = {
    "password": os.getenv("LOG_ANALYZER_DB_PASSWORD")
}
```

### 3. Secure Log Files
- Store logs on encrypted drive
- Implement access controls
- Enable audit logging

### 4. Network Security
- Use VPN for remote access
- Enable firewall rules
- Use SSL/TLS for database connections

## Troubleshooting

### Issue: No logs found
**Solution**: 
- Check LOGS_DIR in config.py
- Verify directory structure matches expected format
- Run: `python test_utils.py validate`

### Issue: Permission denied
**Solution**:
- Run as administrator/sudo
- Check file permissions
- Verify user has read access to logs

### Issue: Out of memory
**Solution**:
- Process logs in batches
- Increase system RAM
- Optimize log retention

### Issue: Slow performance
**Solution**:
- Move logs to faster disk (SSD)
- Implement database backend
- Use parallel processing
- Archive old logs

## Performance Tuning

### For Large Datasets
```python
# In config.py
# Process in batches
BATCH_SIZE = 1000
MAX_LOG_ENTRIES = 100000

# Adjust similarity threshold
MIN_SIMILARITY_SCORE = 0.8  # Higher = fewer groups
```

### Parallel Processing
```python
# Add to log_parser.py
from multiprocessing import Pool

def parse_logs_parallel(log_files):
    with Pool(processes=4) as pool:
        results = pool.map(parse_log_file, log_files)
    return results
```

## Backup and Recovery

### Backup Strategy
```bash
# Daily backup script
DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/loganalyzer/$DATE"

mkdir -p $BACKUP_DIR
cp -r /path/to/loganalyzer/*.py $BACKUP_DIR/
cp /path/to/loganalyzer/config.py $BACKUP_DIR/
cp -r /path/to/loganalyzer/reports $BACKUP_DIR/
```

### Recovery
```bash
# Restore from backup
cp -r /backups/loganalyzer/20260125/* /path/to/loganalyzer/
```

## Integration Options

### 1. Email Notifications
See EXTENSIONS_EXAMPLES.py for email integration

### 2. Ticketing System
Integrate with Jira, ServiceNow, etc.

### 3. Dashboard
- Build web dashboard with Flask/Django
- Use provided JSON export
- Create REST API endpoint

### 4. SIEM Integration
- Export to Splunk
- Send to ELK Stack
- Forward to Azure Sentinel

## Scaling Considerations

### Small Scale (1-50 users)
- Current filesystem approach works well
- Run daily analysis
- Store 30 days of logs

### Medium Scale (50-500 users)
- Consider database backend
- Run multiple times daily
- Implement log rotation
- Add caching layer

### Large Scale (500+ users)
- **Required**: Database backend
- Distributed processing
- Load balancing
- Auto-scaling
- 24/7 monitoring

## Support and Maintenance

### Log Rotation
```bash
# Keep only last 30 days
find /path/to/logs -type f -mtime +30 -delete
```

### Report Cleanup
```bash
# Keep only last 90 days of reports
find /path/to/reports -type f -mtime +90 -delete
```

### Update Patterns
Edit `issue_detector.py` to add new patterns based on discovered issues.

## Compliance and Audit

### Data Retention
- Define retention policy (e.g., 90 days)
- Implement automatic cleanup
- Archive critical data

### Audit Trail
- Log all analysis runs
- Track who viewed reports
- Record configuration changes

### Privacy
- Anonymize user data if required
- Implement data masking
- Follow GDPR/CCPA guidelines

## Production Checklist

- [ ] Virtual environment configured
- [ ] Dependencies installed
- [ ] Configuration customized
- [ ] Log collection automated
- [ ] Scheduled analysis configured
- [ ] Reports directory monitored
- [ ] Backup strategy implemented
- [ ] Security measures applied
- [ ] Documentation updated
- [ ] Team trained on system
- [ ] Monitoring alerts configured
- [ ] Incident response plan ready

## Contact and Support

For issues:
1. Check troubleshooting section
2. Review logs in console
3. Run: `python test_utils.py test`
4. Contact development team

---

**Version**: 1.0.0
**Last Updated**: January 25, 2026
**Status**: Production Ready
