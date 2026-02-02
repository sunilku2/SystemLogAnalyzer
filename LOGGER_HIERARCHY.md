# Logger Hierarchy and Configuration

## Logger Names

The logging system uses a hierarchical naming convention for loggers:

```
log_analyzer                    # Root logger for the application
├── log_analyzer.llm            # LLM operations (llm_analyzer.py)
├── log_analyzer.parser         # Log parsing (log_parser.py)
├── log_analyzer.detector       # Issue detection (issue_detector.py)
└── log_analyzer.data_source    # Data loading (data_source.py)
```

---

## Logger-to-Module Mapping

| Logger Name | Module | Purpose |
|------------|--------|---------|
| `log_analyzer` | api_server.py | Main API, request handling, analysis orchestration |
| `log_analyzer.llm` | llm_analyzer.py | LLM provider integration, model management |
| `log_analyzer.parser` | log_parser.py | Log file parsing, format detection |
| `log_analyzer.detector` | issue_detector.py | Issue detection, categorization |
| `log_analyzer.data_source` | data_source.py | Data loading, statistics |

---

## Initialization Code

Each module initializes its logger:

### Main Logger (api_server.py)
```python
import logging
from logging.handlers import RotatingFileHandler

logger = logging.getLogger('log_analyzer')
logger.setLevel(logging.DEBUG)

# File handler
file_handler = RotatingFileHandler(
    'logs/api_server.log',
    maxBytes=10*1024*1024,
    backupCount=5
)
file_handler.setLevel(logging.DEBUG)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

# Formatter
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
)
file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

logger.addHandler(file_handler)
logger.addHandler(console_handler)
```

### Child Loggers
```python
import logging

# In llm_analyzer.py
logger = logging.getLogger('log_analyzer.llm')

# In log_parser.py
logger = logging.getLogger('log_analyzer.parser')

# In issue_detector.py
logger = logging.getLogger('log_analyzer.detector')

# In data_source.py
logger = logging.getLogger('log_analyzer.data_source')
```

**Note:** Child loggers don't need individual handlers. They automatically use the handlers from the root logger.

---

## Configuration Details

### File Handler (RotatingFileHandler)

```python
RotatingFileHandler(
    filename='logs/api_server.log',
    maxBytes=10*1024*1024,      # 10 MB per file
    backupCount=5                # Keep 5 old files
)
```

**Behavior:**
- Creates `api_server.log`
- When it reaches 10 MB, rotates to `api_server.log.1`
- Previous backups: `.log.2`, `.log.3`, `.log.4`, `.log.5`
- When creating `.log.6`, `.log.5` is deleted
- Result: Maximum 6 files × 10 MB = 60 MB total

### Console Handler

```python
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
```

**Behavior:**
- Outputs to stdout (terminal)
- Only shows INFO and above (not DEBUG)
- Useful for real-time monitoring

### Formatters

```python
'%(asctime)s'        # 2026-02-02 14:30:45
'%(name)s'          # log_analyzer.llm
'%(levelname)s'     # INFO, DEBUG, ERROR, etc.
'%(filename)s'      # api_server.py
'%(lineno)d'        # 145
'%(message)s'       # The actual log message
```

---

## Log Levels and Usage

| Level | Value | Usage |
|-------|-------|-------|
| DEBUG | 10 | Detailed diagnostic information |
| INFO | 20 | General informational messages |
| WARNING | 30 | Warning messages (things working but unexpected) |
| ERROR | 40 | Error messages (something failed) |
| CRITICAL | 50 | Critical errors (system failure) |

**File**: Shows DEBUG + higher (all messages)  
**Console**: Shows INFO + higher (progress only)

---

## Example Log Output

### Console (Real-time)
```
2026-02-02 14:30:45 - log_analyzer - INFO - [api_server.py:53] - === Log Analyzer API Server Starting ===
2026-02-02 14:30:45 - log_analyzer - INFO - [api_server.py:54] - Logs Directory: C:\analysis_logs
2026-02-02 14:30:45 - log_analyzer - INFO - [api_server.py:57] - LLM Enabled: True
2026-02-02 14:30:47 - log_analyzer - INFO - [api_server.py:145] - Starting analysis...
2026-02-02 14:30:47 - log_analyzer - INFO - [api_server.py:150] - Step 1 Complete: Loaded 1500 entries in 0.45s
```

### Log File (Detailed)
```
...
2026-02-02 14:30:45 - log_analyzer - DEBUG - [api_server.py:89] - Computing logs signature from C:\analysis_logs
2026-02-02 14:30:45 - log_analyzer - DEBUG - [api_server.py:98] - Found log file: System.log
2026-02-02 14:30:45 - log_analyzer - DEBUG - [api_server.py:105] - Logs signature: 5 files, latest mtime: 1704111600
2026-02-02 14:30:45 - log_analyzer - INFO - [api_server.py:145] - Starting analysis...
2026-02-02 14:30:45 - log_analyzer.llm - INFO - [llm_analyzer.py:24] - LLMAnalyzer initialized
2026-02-02 14:30:45 - log_analyzer.parser - DEBUG - [log_parser.py:42] - Parsing log file: System.log
...
```

---

## Filtering Logs

### By Logger (Module)
```powershell
# LLM logs only
Select-String "log_analyzer.llm" logs/api_server.log

# Parser logs only
Select-String "log_analyzer.parser" logs/api_server.log

# Issue detector only
Select-String "log_analyzer.detector" logs/api_server.log

# All except DEBUG
Select-String " - INFO - | - WARNING - | - ERROR - | - CRITICAL - " logs/api_server.log
```

### By Level
```powershell
# Errors only
Select-String " - ERROR - " logs/api_server.log

# Warnings and errors
Select-String " - WARNING - | - ERROR - " logs/api_server.log

# Info only
Select-String " - INFO - " logs/api_server.log
```

### By Module and Level
```powershell
# LLM errors only
Select-String "log_analyzer.llm.*ERROR" logs/api_server.log

# Parser debug messages
Select-String "log_analyzer.parser.*DEBUG" logs/api_server.log
```

---

## Dynamic Configuration (Future)

To make logging configurable via environment variables:

```python
# At top of api_server.py
import os

LOG_LEVEL = os.environ.get('LOG_LEVEL', 'DEBUG').upper()
LOG_DIR = os.environ.get('LOG_DIR', './logs')
LOG_FILE_SIZE = int(os.environ.get('LOG_FILE_SIZE', '10485760'))  # 10MB
LOG_BACKUP_COUNT = int(os.environ.get('LOG_BACKUP_COUNT', '5'))
LOG_FORMAT = os.environ.get('LOG_FORMAT', 
    '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s')

# Then use in configuration
logger.setLevel(getattr(logging, LOG_LEVEL))
file_handler = RotatingFileHandler(
    os.path.join(LOG_DIR, 'api_server.log'),
    maxBytes=LOG_FILE_SIZE,
    backupCount=LOG_BACKUP_COUNT
)
```

### Usage
```powershell
# Set environment variables
$env:LOG_LEVEL = 'INFO'      # Less verbose
$env:LOG_DIR = 'D:\CustomLogs'
$env:LOG_FILE_SIZE = '52428800'  # 50 MB
$env:LOG_BACKUP_COUNT = '10'     # Keep 10 backups

# Run application
python api_server.py
```

---

## Advanced: Syslog Integration

To send logs to Windows Event Log or syslog:

```python
# Windows Event Viewer
from logging.handlers import NTEventLogHandler

event_handler = NTEventLogHandler('LogAnalyzer')
event_handler.setLevel(logging.WARNING)  # Only WARNING+
logger.addHandler(event_handler)

# Or syslog (Linux)
from logging.handlers import SysLogHandler

syslog_handler = SysLogHandler(address=('localhost', 514))
syslog_handler.setLevel(logging.INFO)
logger.addHandler(syslog_handler)
```

---

## Advanced: Structured Logging (JSON)

For centralized logging systems:

```python
import json
from logging import Formatter

class JSONFormatter(Formatter):
    def format(self, record):
        return json.dumps({
            'timestamp': record.created,
            'level': record.levelname,
            'logger': record.name,
            'module': record.module,
            'line': record.lineno,
            'message': record.getMessage(),
            'exception': self.formatException(record.exc_info) if record.exc_info else None
        })

# Use with handler
json_handler = RotatingFileHandler('logs/api_server.json')
json_handler.setFormatter(JSONFormatter())
logger.addHandler(json_handler)
```

---

## Performance Impact

### Minimal Overhead
- Logging to file: ~1-5 microseconds per call
- Logging to console: ~5-10 microseconds per call
- Rotation check: ~1 microsecond (only on writes)
- Total impact on 10,000 log entries: ~50-100 ms

### Not Noticeable
- Analysis time: ~1-2 seconds
- Logging time: ~50-100 ms
- Impact: 2-5% overhead (negligible)

### Optimization
If needed for high-volume scenarios:
```python
# Disable console logging for file-based use
console_handler.setLevel(logging.CRITICAL + 1)  # Disable entirely

# Or use async logging
from logging.handlers import QueueHandler, QueueListener
```

---

## Testing Logger Configuration

### Verify Setup
```python
# Add to api_server.py after logger setup
logger.debug('DEBUG message')
logger.info('INFO message')
logger.warning('WARNING message')
logger.error('ERROR message')
logger.critical('CRITICAL message')
```

### Output Should Be
**Console:**
```
INFO message
WARNING message
ERROR message
CRITICAL message
```

**File (logs/api_server.log):**
```
DEBUG message
INFO message
WARNING message
ERROR message
CRITICAL message
```

---

## Summary

- ✅ Hierarchical logger structure for organization
- ✅ Separate handlers for file and console
- ✅ Automatic rotation prevents disk bloat
- ✅ Flexible filtering by logger/level
- ✅ Ready for extensions (syslog, JSON, etc.)
- ✅ Minimal performance impact
- ✅ Python standard library (no dependencies)

---

See [LOGGING_GUIDE.md](LOGGING_GUIDE.md) for usage examples.

