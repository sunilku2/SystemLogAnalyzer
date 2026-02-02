# Logging Quick Reference

## Where are the logs?

```
logs/api_server.log
```

## Viewing Logs

### Last 50 lines
```powershell
Get-Content logs/api_server.log -Tail 50
```

### Real-time (like tail -f)
```powershell
Get-Content logs/api_server.log -Wait -Tail 10
```

### Search for errors
```powershell
Select-String "ERROR" logs/api_server.log
Select-String "WARNING" logs/api_server.log
```

### Search by module
```powershell
Select-String "llm_analyzer" logs/api_server.log
Select-String "log_parser" logs/api_server.log
Select-String "issue_detector" logs/api_server.log
```

### Find analysis operations
```powershell
Select-String "Starting analysis|Retrieved.*entries|Issue detection" logs/api_server.log
```

### Count log entries by level
```powershell
Select-String "DEBUG|INFO|WARNING|ERROR" logs/api_server.log | 
  ForEach-Object {$_ -match '\- (\w+) \-'; $matches[1]} | 
  Group-Object | Sort-Object -Property Count -Descending
```

---

## Understanding Log Format

Each log line has:

```
TIMESTAMP - MODULE - LEVEL - [FILE:LINE] - MESSAGE
2026-02-02 14:30:45 - log_analyzer - INFO - [api_server.py:145] - Starting analysis
```

- **TIMESTAMP**: When the event occurred
- **MODULE**: Which logger created it (e.g., log_analyzer, log_analyzer.llm)
- **LEVEL**: Severity (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- **FILE:LINE**: Where in code it was logged
- **MESSAGE**: What happened

---

## Log Levels Explained

| Level | What It Means | Use Case |
|-------|--------------|----------|
| DEBUG | Detailed diagnostic info | Troubleshooting, understanding flow |
| INFO | General information | Progress, milestones, completion |
| WARNING | Something unexpected | Fallback used, service unavailable |
| ERROR | Something failed | Operation error, caught exception |
| CRITICAL | System failure | Fatal startup error |

**Console**: Shows INFO and higher  
**File**: Shows DEBUG and higher (more detailed)

---

## Common Searches

### After Running Analysis

```powershell
# See what was analyzed
Select-String "Retrieved.*entries|Found.*issues|identified" logs/api_server.log

# See timing
Select-String "Step.*Complete|execution|in \d+\.\d+s" logs/api_server.log

# See any errors
Select-String "ERROR|error|failed|Failed" logs/api_server.log
```

### For LLM Issues

```powershell
# Model discovery
Select-String "Fetching.*models|Found.*models" logs/api_server.log

# Connection issues
Select-String "Connection|Timeout|unavailable" logs/api_server.log

# Provider info
Select-String "provider|Base URL|endpoint" logs/api_server.log
```

### For Parsing Issues

```powershell
# File discovery
Select-String "Found log file|EVTX|parsing" logs/api_server.log

# Entry counts
Select-String "entries|Retrieved" logs/api_server.log

# Format issues
Select-String "format|encoding|parse error" logs/api_server.log
```

---

## Log File Size

- **Per file**: 10 MB
- **Backups kept**: 5 files
- **Total maximum**: ~60 MB
- **Oldest files**: Automatically deleted

After 5 files reach 10 MB each, the oldest is removed.

---

## Module-Specific Logging

Each module has its own logger:

```python
logger = logging.getLogger('log_analyzer.llm')      # llm_analyzer.py
logger = logging.getLogger('log_analyzer.parser')   # log_parser.py
logger = logging.getLogger('log_analyzer.detector') # issue_detector.py
logger = logging.getLogger('log_analyzer.data_source') # data_source.py
logger = logging.getLogger('log_analyzer')          # api_server.py (main)
```

Filter by module:
```powershell
Select-String "log_analyzer.detector" logs/api_server.log  # issue detection
Select-String "log_analyzer.llm" logs/api_server.log       # LLM operations
```

---

## Timestamps in Logs

Format: `YYYY-MM-DD HH:MM:SS`

Example:
```
2026-02-02 14:30:45 - Starting analysis
```

To find logs from a specific time:
```powershell
Select-String "2026-02-02 14:3" logs/api_server.log  # All logs from 14:30-14:39
Select-String "2026-02-02 14" logs/api_server.log    # All logs from 14:00-14:59
```

---

## Quick Problem-Solving

### No logs directory?
The `logs/` folder is created automatically when the API starts.

### Logs too old?
Logs rotate after reaching 10 MB. Old logs are in `api_server.log.1`, `api_server.log.2`, etc.

### Want to reset logs?
```powershell
Remove-Item logs/api_server.log*
```
New logs will be created when API starts.

### Logs not showing in console?
Check `logs/api_server.log` instead - file has DEBUG level (more detailed).

### Analysis seems stuck?
Watch the real-time logs:
```powershell
Get-Content logs/api_server.log -Wait -Tail 20
```

---

## Example Log Analysis Session

```powershell
# 1. Check overall health
Select-String "ERROR|WARNING|failed" logs/api_server.log

# 2. See latest activity
Get-Content logs/api_server.log -Tail 30

# 3. Trace last analysis
Select-String "Starting analysis" logs/api_server.log | Select-Object -Last 1
Select-String "Analysis execution" logs/api_server.log | Select-Object -Last 1

# 4. Find any issues found
Select-String "Created issue" logs/api_server.log

# 5. Check performance
Select-String "in \d+\.\d+s" logs/api_server.log | Select-Object -Last 5
```

---

## Integration with Other Tools

### Forward to Event Viewer
```powershell
# Windows Event Log integration (future)
Write-EventLog -LogName Application -Source "LogAnalyzer" -EventId 1000 -Message "..."
```

### Send to Log Aggregation
```powershell
# Example: Send to ELK Stack, Splunk, etc.
Get-Content logs/api_server.log | Send-ToLogService
```

### Email Critical Errors
```powershell
Select-String "CRITICAL|FATAL" logs/api_server.log | 
  Send-MailMessage -To admin@example.com
```

---

## Performance Metrics from Logs

Extract timing information:

```powershell
# Find all timing information
Select-String "in \d+\.\d+s" logs/api_server.log

# Calculate average analysis time
$lines = Select-String "Analysis execution:.*in (\d+\.\d+)s" logs/api_server.log
$times = $lines | ForEach-Object {[float]($_ -match 'in (\d+\.\d+)s'; $matches[1])}
$times | Measure-Object -Average
```

---

## Exporting Logs

### Save filtered logs
```powershell
Select-String "ERROR" logs/api_server.log | Out-File errors.txt
Select-String "WARNING" logs/api_server.log | Out-File warnings.txt
```

### Create debug bundle
```powershell
Copy-Item logs/api_server.log debug_logs_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').log
```

### Share specific session
```powershell
# Get logs from specific time range
Select-String "2026-02-02 14:30" logs/api_server.log | Out-File debug_session.txt
```

---

## Next Steps

1. **Start the API**: `python api_server.py`
2. **Watch the logs**: `Get-Content logs/api_server.log -Wait -Tail 20`
3. **Run analysis**: Use the web UI
4. **Check results**: Search logs for errors or timing info
5. **Share issues**: Export relevant log sections

See [LOGGING_GUIDE.md](LOGGING_GUIDE.md) for detailed information.

