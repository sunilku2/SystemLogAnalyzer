# Logging Enhancement Summary

## Overview

Comprehensive logging has been added to the System Log Analyzer for improved debugging and troubleshooting. All critical modules now include detailed logging at DEBUG and INFO levels.

---

## What Was Added

### 1. Enhanced Logging in Core Modules

#### **api_server.py**
- ✅ Import logging modules (logging, RotatingFileHandler)
- ✅ Setup logging configuration with rotating file handler (10MB, 5 backups)
- ✅ Dual output: File (DEBUG) + Console (INFO)
- ✅ Startup information logged (configuration, directories, LLM settings)
- ✅ Enhanced `_compute_logs_signature()` with file discovery logging
- ✅ Improved error handling with detailed logging

**New Features:**
- Logs directory automatically created: `logs/api_server.log`
- Rotating file handler prevents log bloat
- Formatter includes timestamp, module, level, file:line, message

#### **llm_analyzer.py**
- ✅ Logger initialization
- ✅ Initialization logging (provider, model)
- ✅ Base URL logging
- ✅ Model discovery with detailed endpoint logging
- ✅ Connection error handling (timeout, connection error)
- ✅ Response status code logging
- ✅ Provider-specific debugging

**New Features:**
- Track which providers are being used
- Log all API calls and responses
- Distinguish between timeout and connection errors
- Show fallback behavior

#### **log_parser.py**
- ✅ Logger initialization
- ✅ EVTX support status on startup
- ✅ File parsing logging (format detection)
- ✅ Text file parsing with type information
- ✅ File discovery and statistics

**New Features:**
- See which log formats are being parsed
- Track EVTX support availability
- Monitor parsing progress

#### **data_source.py**
- ✅ Logger initialization
- ✅ Log retrieval logging with entry count
- ✅ Statistics gathering with results
- ✅ Session discovery information

**New Features:**
- Track total sessions, users, systems
- Monitor data source operations
- Log retrieval statistics

#### **issue_detector.py**
- ✅ Logger initialization
- ✅ Detection start/completion logging
- ✅ Entry filtering with count
- ✅ Issue grouping and signature logging
- ✅ Category and severity tracking per issue

**New Features:**
- See issue detection progress
- Track how many entries of each severity
- Monitor issue categorization
- See grouping statistics

---

## Log File Details

### Location
```
c:\Work\SystemLogAnalyzer\SystemLogAnalyzer\logs\api_server.log
```

### File Management
- **Size per file**: 10 MB
- **Backup count**: 5 files
- **Total capacity**: ~60 MB
- **Rotation**: Automatic when reaching size limit
- **Oldest files**: Automatically deleted

### Format
```
TIMESTAMP - MODULE_NAME - LEVEL - [FILENAME:LINE] - MESSAGE
2026-02-02 14:30:45 - log_analyzer - INFO - [api_server.py:145] - Starting analysis
```

---

## Output Destinations

### Console (Terminal)
- **Level**: INFO and above
- **Purpose**: Real-time progress monitoring
- **Good for**: Watching analysis run, quick status

### Log File
- **Level**: DEBUG and above (all messages)
- **Purpose**: Complete detailed record
- **Good for**: Troubleshooting, post-analysis review, archival

---

## Module Loggers

Each module has its own logger for easy filtering:

```python
'log_analyzer'              # api_server.py (main)
'log_analyzer.llm'          # llm_analyzer.py
'log_analyzer.parser'       # log_parser.py
'log_analyzer.detector'     # issue_detector.py
'log_analyzer.data_source'  # data_source.py
```

### Usage Example
```powershell
# Watch only LLM operations
Select-String "log_analyzer.llm" logs/api_server.log

# Watch only issue detection
Select-String "log_analyzer.detector" logs/api_server.log

# Watch parser operations
Select-String "log_analyzer.parser" logs/api_server.log
```

---

## What Gets Logged

### Startup (Logged Once)
```
=== Log Analyzer API Server Starting ===
Logs Directory: ...
Report Output Directory: ...
LLM Enabled: True/False
LLM Provider: ...
LLM Model: ...
```

### Log Discovery
```
Computing logs signature from ...
Found log file: ...
Found EVTX file: ...
Logs signature: X files, latest mtime: ...
```

### Analysis Execution
```
Starting analysis... (source=X)
Step 1: Loading logs...
  Step 1 Complete: Loaded N entries in X.XXs
Step 2: Analyzing N entries...
  Step 2 Complete: Detected N issues in X.XXs
```

### LLM Operations
```
LLMAnalyzer initialized: provider=..., model=...
Fetching available models from ...
Querying Ollama/LM Studio endpoint: ...
Found N models in ...
```

### Issue Detection
```
Starting issue detection on N entries
Found M significant entries (Warning/Error/Critical)
Grouped entries into K unique issue signatures
Created issue: category=..., severity=..., count=N
Issue detection complete: N issues found
```

### Errors and Warnings
```
ERROR - [module.py:123] - Description of error
WARNING - Connection error to ollama at http://localhost:11434
WARNING - Could not fetch models, returning empty list
```

---

## Common Log Patterns

### Successful Analysis
```
INFO - Starting analysis... (source=manual)
DEBUG - Computing logs signature
DEBUG - Found log file: System.log
INFO - Step 1 Complete: Loaded 1500 entries in 0.45s
INFO - Found 200 significant entries
DEBUG - Grouped entries into 15 signatures
DEBUG - Created issue: category=Network Connectivity, severity=Error, count=8
INFO - Issue detection complete: 15 issues found
```

### Ollama Available
```
INFO - LLMAnalyzer initialized: provider=ollama, model=llama3.2:3b
INFO - Fetching available models from ollama
DEBUG - Querying Ollama endpoint: http://localhost:11434/api/tags
DEBUG - Ollama response status: 200
INFO - Found 3 models in Ollama
```

### Ollama Unavailable
```
INFO - LLMAnalyzer initialized: provider=ollama, model=llama3.2:3b
INFO - Fetching available models from ollama
DEBUG - Querying Ollama endpoint: http://localhost:11434/api/tags
WARNING - Connection error to ollama at http://localhost:11434
WARNING - Could not fetch models, returning empty list
```

---

## Viewing Logs

### In PowerShell

**Last 50 lines:**
```powershell
Get-Content logs/api_server.log -Tail 50
```

**Real-time monitoring (like tail -f):**
```powershell
Get-Content logs/api_server.log -Wait -Tail 20
```

**Search for errors:**
```powershell
Select-String "ERROR" logs/api_server.log
Select-String "WARNING" logs/api_server.log
```

**Search by module:**
```powershell
Select-String "llm_analyzer" logs/api_server.log
Select-String "issue_detector" logs/api_server.log
```

**Count by level:**
```powershell
Select-String "DEBUG|INFO|WARNING|ERROR|CRITICAL" logs/api_server.log | 
  ForEach-Object {$_ -match '- (\w+) -'; $matches[1]} | 
  Group-Object | Sort-Object Count -Descending
```

---

## Performance Metrics

Logs include timing information for analysis steps:

```
Step 1 Complete: Loaded 1500 entries in 0.45s
Step 2 Complete: Detected 15 issues in 0.23s
Analysis execution: 0.68s
```

Extract timing:
```powershell
Select-String "in \d+\.\d+s" logs/api_server.log
```

---

## Troubleshooting with Logs

### Issue: Analysis hangs or is very slow
**Check logs for:**
```powershell
Select-String "Loading logs|Analyzing|Grouped" logs/api_server.log -Context 2
```
Look at the time between log entries to find the bottleneck.

### Issue: LLM not working
**Check logs for:**
```powershell
Select-String "LLM|ollama|model" logs/api_server.log
```
Look for "Connection error" or "response status" codes.

### Issue: Logs not found
**Check logs for:**
```powershell
Select-String "Logs signature: 0 files" logs/api_server.log
```
Verify the LOGS_DIR path is correct.

### Issue: Analysis results differ from expected
**Check logs for:**
```powershell
Select-String "Retrieved|significant|grouped|Created issue" logs/api_server.log
```
Track how many entries were processed at each stage.

---

## Documentation Added

### 1. **LOGGING_GUIDE.md** (Comprehensive)
- Detailed logging architecture
- All modules explained with examples
- Common log patterns
- Troubleshooting guide
- Log analysis techniques
- Performance metrics extraction

### 2. **LOGGING_QUICK_REFERENCE.md** (Quick)
- Quick viewing commands
- Common searches
- Log format explanation
- Module-specific logging
- Quick problem-solving

---

## Backward Compatibility

✅ **No breaking changes**
- Existing functionality unchanged
- Print statements still work (can be removed)
- No new dependencies
- Uses Python standard library (logging module)

---

## Future Enhancements

Possible extensions:
- [ ] Log rotation by date (daily, weekly)
- [ ] Log cleanup policies
- [ ] Structured logging (JSON format)
- [ ] Remote log aggregation (ELK, Splunk)
- [ ] Email alerts for critical errors
- [ ] Dashboard for log analysis
- [ ] Performance metrics database
- [ ] Environment variable configuration for log level

---

## Implementation Details

### Changes Made

**api_server.py:**
- Lines 1-20: Added logging imports
- Lines 29-65: Added logging configuration with RotatingFileHandler
- Lines 89-118: Enhanced `_compute_logs_signature()` with logging
- Enhanced error handling with exc_info=True for full tracebacks

**llm_analyzer.py:**
- Lines 1-10: Added logging
- Lines 23-25: Enhanced __init__ with logging
- Lines 30-33: Enhanced _get_base_url with logging
- Lines 44-95: Enhanced get_available_models with detailed logging

**log_parser.py:**
- Lines 1-9: Added logging
- Lines 39-45: Enhanced parse_log_file with logging
- Lines 51-52: Enhanced _parse_text_log_file with logging

**data_source.py:**
- Lines 1-8: Added logging
- Lines 35-40: Enhanced get_log_entries with logging
- Lines 42-51: Enhanced get_statistics with logging

**issue_detector.py:**
- Lines 1-10: Added logging
- Lines 177-206: Enhanced detect_issues with logging

---

## Testing Logs

### Quick Test
```powershell
# 1. Start API
python api_server.py

# 2. In another terminal, watch logs
Get-Content logs/api_server.log -Wait

# 3. Run analysis (click "Analyze" in web UI)

# 4. See detailed logs appear in real-time
```

### Log Content Verification
```powershell
# Should see all these messages:
Select-String "API Server Starting" logs/api_server.log           # Startup
Select-String "Logs Directory" logs/api_server.log                 # Config
Select-String "Computing logs signature" logs/api_server.log       # Log discovery
Select-String "Parsing" logs/api_server.log                        # Parsing
Select-String "issue detection" logs/api_server.log                # Detection
```

---

## Summary

✅ **What was added:**
- Comprehensive logging to 5 key modules
- Automatic log rotation and file management
- Dual output (console + file)
- DEBUG detail + INFO progress
- Module-specific loggers
- Performance timing
- Error tracking with tracebacks

✅ **Benefits:**
- Easy debugging of issues
- Performance analysis
- Operation tracking
- Error diagnosis
- Audit trail
- Non-blocking (async logging possible in future)

✅ **Usage:**
- Automatic - no configuration needed
- Logs at: `logs/api_server.log`
- View with: `Get-Content logs/api_server.log -Tail 50`
- Search with: `Select-String "pattern" logs/api_server.log`

---

See [LOGGING_GUIDE.md](LOGGING_GUIDE.md) and [LOGGING_QUICK_REFERENCE.md](LOGGING_QUICK_REFERENCE.md) for detailed usage instructions.

