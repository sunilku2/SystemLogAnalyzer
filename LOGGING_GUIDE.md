# Enhanced Logging Guide

## Overview

Comprehensive logging has been added to the System Log Analyzer for better debugging and troubleshooting. All key modules now include detailed debug information to help identify issues.

---

## Logging Architecture

### Log Locations

```
c:\Work\SystemLogAnalyzer\SystemLogAnalyzer\logs\
├── api_server.log          # Main API and analysis logs
└── (rotating - keeps 5 backup files, 10MB each)
```

**Log Files**: Automatically created in a `logs` directory at the application root.

### Log Levels

| Level | Purpose | Example |
|-------|---------|---------|
| **DEBUG** | Detailed diagnostic info | File discovered, URL called, decision branches |
| **INFO** | General informational | Analysis started, models found, files parsed |
| **WARNING** | Warning messages | Fallback used, service unavailable |
| **ERROR** | Error conditions | File read error, connection failed |
| **CRITICAL** | Critical errors | API startup failed, fatal exception |

---

## Logging Configuration

### Dual Output

The logging system writes to **two destinations**:

1. **File** - `logs/api_server.log`
   - Level: DEBUG (most detailed)
   - Rotating: 10MB per file, keeps 5 backups
   - Good for: Post-analysis, storage, audit trail

2. **Console** - Terminal output
   - Level: INFO (less verbose)
   - Good for: Real-time monitoring during execution

### Log Format

```
2026-02-02 14:30:45 - log_analyzer - INFO - [api_server.py:145] - Starting analysis... (source=manual)
```

Format: `TIMESTAMP - LOGGER_NAME - LEVEL - [FILE:LINE] - MESSAGE`

---

## Modules with Enhanced Logging

### 1. api_server.py
**Main API Backend**

```
✓ Server startup and configuration
✓ Request handling and timing
✓ Analysis execution flow
✓ Background watcher operation
✓ Error handling and recovery
```

**Sample Log Output:**
```
INFO - [api_server.py:52] - === Log Analyzer API Server Starting ===
INFO - [api_server.py:53] - Logs Directory: C:\Path\analysis_logs
INFO - [api_server.py:54] - LLM Enabled: True
INFO - [api_server.py:55] - LLM Provider: ollama
DEBUG - [api_server.py:89] - Computing logs signature from C:\Path\analysis_logs
DEBUG - [api_server.py:98] - Found log file: C:\Path\System.log
INFO - [api_server.py:101] - Logs signature: 5 files, latest mtime: 1704111600
```

### 2. llm_analyzer.py
**LLM Integration and Model Management**

```
✓ LLM initialization
✓ Model discovery and fetching
✓ Connection attempts and timeouts
✓ Response handling
✓ Provider-specific debugging
```

**Sample Log Output:**
```
INFO - [llm_analyzer.py:24] - LLMAnalyzer initialized: provider=ollama, model=llama3.2:3b
DEBUG - [llm_analyzer.py:31] - Base URL for ollama: http://localhost:11434
INFO - [llm_analyzer.py:46] - Fetching available models from ollama
DEBUG - [llm_analyzer.py:55] - Querying Ollama endpoint: http://localhost:11434/api/tags
INFO - [llm_analyzer.py:62] - Found 3 models in Ollama
```

### 3. log_parser.py
**Log File Parsing and Discovery**

```
✓ File format detection
✓ EVTX support status
✓ Text file parsing
✓ Entry extraction
✓ Format-specific details
```

**Sample Log Output:**
```
INFO - [log_parser.py:16] - EVTX support enabled
DEBUG - [log_parser.py:42] - Parsing log file: C:\Windows\System.log
DEBUG - [log_parser.py:43] - Using text parser for C:\Windows\System.log
DEBUG - [log_parser.py:53] - Parsing text log file: C:\Windows\System.log (type: System)
```

### 4. data_source.py
**Data Loading and Statistics**

```
✓ Data source initialization
✓ Log retrieval operations
✓ Statistics gathering
✓ Session discovery
```

**Sample Log Output:**
```
INFO - [data_source.py:38] - Retrieving log entries from C:\analysis_logs
DEBUG - [data_source.py:39] - Log types to retrieve: ['System.log', 'Application.log']
INFO - [data_source.py:41] - Retrieved 1250 log entries
DEBUG - [data_source.py:48] - Gathering filesystem statistics
INFO - [data_source.py:54] - Filesystem stats: 3 sessions, 2 users, 2 systems
```

### 5. issue_detector.py
**Issue Detection and Categorization**

```
✓ Issue detection start/completion
✓ Entry filtering
✓ Grouping and signatures
✓ Issue categorization
✓ Statistics
```

**Sample Log Output:**
```
INFO - [issue_detector.py:180] - Starting issue detection on 1250 log entries
INFO - [issue_detector.py:185] - Found 156 significant entries (Warning/Error/Critical)
DEBUG - [issue_detector.py:196] - Grouped entries into 12 unique issue signatures
DEBUG - [issue_detector.py:203] - Created issue: category=Network Connectivity, severity=Error, count=8
INFO - [issue_detector.py:206] - Issue detection complete: 12 issues found
```

---

## Viewing Logs

### Real-Time Console Output

When running the API server, you'll see INFO level messages in the terminal:

```powershell
PS> python api_server.py

2026-02-02 14:30:45 - log_analyzer - INFO - === Log Analyzer API Server Starting ===
2026-02-02 14:30:45 - log_analyzer - INFO - Logs Directory: C:\analysis_logs
2026-02-02 14:30:45 - log_analyzer - INFO - LLM Provider: ollama
...
```

### Reading Log Files

```powershell
# View latest entries (last 50 lines)
Get-Content logs/api_server.log -Tail 50

# Real-time monitoring (like Unix tail -f)
Get-Content logs/api_server.log -Wait -Tail 10

# Search for errors
Select-String "ERROR" logs/api_server.log

# Search for a specific module
Select-String "llm_analyzer" logs/api_server.log

# Count by level
Select-String "INFO|DEBUG|WARNING|ERROR|CRITICAL" logs/api_server.log | Group-Object {$_.Line.Split("-")[2]}
```

### Analysis Commands

```powershell
# Find all errors
Select-String "\[ERROR\]" logs/api_server.log

# Find analysis execution
Select-String "Starting analysis|Analysis complete" logs/api_server.log

# Find LLM operations
Select-String "llm_analyzer|LLM" logs/api_server.log

# Find timing information
Select-String "in \d+\.\d+s" logs/api_server.log
```

---

## Common Log Patterns

### Successful Analysis Flow

```
INFO - Starting analysis... (source=manual)
DEBUG - Computing logs signature from C:\analysis_logs
DEBUG - Found log file: System.log
INFO - Retrieved 1500 log entries
INFO - Found 200 significant entries (Warning/Error/Critical)
DEBUG - Grouped entries into 15 unique issue signatures
DEBUG - Created issue: category=Network Connectivity, severity=Error, count=8
INFO - Issue detection complete: 15 issues found
INFO - Analysis execution: 2.34s
```

### LLM Model Discovery

```
INFO - Fetching available models from ollama
DEBUG - Querying Ollama endpoint: http://localhost:11434/api/tags
DEBUG - Ollama response status: 200
INFO - Found 3 models in Ollama
```

### Missing Ollama

```
INFO - Fetching available models from ollama
DEBUG - Querying Ollama endpoint: http://localhost:11434/api/tags
WARNING - Connection error to ollama at http://localhost:11434
WARNING - Could not fetch models, returning empty list
```

### Log File Parsing

```
DEBUG - Parsing log file: C:\Windows\System.log
DEBUG - Using text parser for C:\Windows\System.log
DEBUG - Parsing text log file: C:\Windows\System.log (type: System)
DEBUG - Found log file: C:\Windows\System.log
INFO - Retrieved 1500 log entries
```

---

## Troubleshooting with Logs

### Issue: No logs found

**What to look for:**
```powershell
Select-String "Found log file|EVTX" logs/api_server.log
Select-String "Logs signature: 0 files" logs/api_server.log
```

**Solution:** Check that logs are in the correct directory specified in the output.

---

### Issue: LLM not responding

**What to look for:**
```powershell
Select-String "Connection error|Timeout" logs/api_server.log
Select-String "Could not fetch models" logs/api_server.log
```

**Solution:** 
- Check Ollama is running: `ollama serve`
- Verify URL in logs matches your Ollama location
- Check firewall settings

---

### Issue: Analysis slow or hanging

**What to look for:**
```powershell
# Find analysis timing
Select-String "Analysis execution:" logs/api_server.log

# Find parsing steps
Select-String "Parsing log file|Retrieved.*entries" logs/api_server.log
```

**Solution:**
- Check if many large log files exist
- Look for DEBUG logs showing file processing
- Check system disk performance

---

### Issue: Memory usage increasing

**What to look for:**
```powershell
# Count how many entries being loaded
Select-String "Retrieved \d+ log entries" logs/api_server.log

# See issue grouping
Select-String "Grouped entries into" logs/api_server.log
```

**Solution:**
- Archive old logs to reduce dataset
- Configure log rotation or size limits

---

## Environment Variables for Logging

Currently, logging is configured programmatically. To customize logging in the future:

```python
# These would go in api_server.py if needed:
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')  # DEBUG, INFO, WARNING, ERROR
LOG_DIR = os.environ.get('LOG_DIR', './logs')
LOG_FILE_SIZE = int(os.environ.get('LOG_FILE_SIZE', 10*1024*1024))  # 10MB
LOG_BACKUP_COUNT = int(os.environ.get('LOG_BACKUP_COUNT', 5))
```

---

## Log Analysis Examples

### Find all unique issue categories detected

```powershell
Select-String "category=" logs/api_server.log | 
  ForEach-Object {$_ -match 'category=(\w+)'; $matches[1]} | 
  Select-Object -Unique
```

### Find slowest analysis operations

```powershell
Select-String "in \d+\.\d+s" logs/api_server.log | 
  Sort-Object {[float]($_ -match 'in (\d+\.\d+)s'; $matches[1])} -Descending | 
  Select-Object -First 10
```

### Count errors by module

```powershell
Select-String "ERROR" logs/api_server.log | 
  ForEach-Object {$_ -match '\[(\w+\.py)'; $matches[1]} | 
  Group-Object | 
  Sort-Object -Property Count -Descending
```

### Timeline of analysis operations

```powershell
Select-String "Starting analysis|Issue detection|Analysis execution" logs/api_server.log | 
  Format-Table -Property @{Name='Time'; Expression={($_ -split ' - ')[0]}}, 
                         @{Name='Message'; Expression={($_ -split ' - ')[-1]}}
```

---

## Performance Metrics from Logs

### Example: Extract execution times

```powershell
$logs = Get-Content logs/api_server.log

# Parsing time
$logs | Select-String "Step 1 Complete.*in (\d+\.\d+)s" | 
  ForEach-Object {[float]($_ -match 'in (\d+\.\d+)s'; $matches[1])}

# Detection time
$logs | Select-String "Step 2 Complete.*in (\d+\.\d+)s" | 
  ForEach-Object {[float]($_ -match 'in (\d+\.\d+)s'; $matches[1])}

# Total time
$logs | Select-String "Analysis execution:.*in (\d+\.\d+)s" | 
  ForEach-Object {[float]($_ -match 'in (\d+\.\d+)s'; $matches[1])}
```

---

## Debugging with Logs

### Enable All Debug Logs

Currently, DEBUG logs go to file (api_server.log) but only INFO+ to console.

To see debug output on console, you could modify:
```python
console_handler.setLevel(logging.DEBUG)  # Change from INFO to DEBUG
```

### Filter for Specific Operations

```powershell
# Watch model fetching
Select-String "model" logs/api_server.log -i

# Watch file operations
Select-String "file|parse|evtx" logs/api_server.log -i

# Watch API calls
Select-String "endpoint|url|request|response" logs/api_server.log -i
```

### Create Debug Report

```powershell
# Save filtered logs for sharing
Select-String "ERROR|WARNING" logs/api_server.log | 
  Out-File debug_report.txt
```

---

## Summary

**Key Points:**
- ✅ All major operations are logged
- ✅ Logs go to `logs/api_server.log` (rotating file)
- ✅ Console shows INFO level + higher
- ✅ File contains DEBUG level + higher (detailed)
- ✅ Easy to search and analyze logs
- ✅ Performance timing included in logs
- ✅ Module-specific loggers for filtering

**Next Steps:**
1. Start the API server normally
2. Open `logs/api_server.log` to see detailed logs
3. Use the log analysis commands for troubleshooting
4. Share relevant log sections when reporting issues

