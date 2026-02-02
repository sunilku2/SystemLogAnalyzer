# EVTX File Support - Implementation Summary

## Overview
The Log Analyzer has been updated to support parsing Windows Event Log (.evtx) binary files in addition to the existing text-based .log files.

## Changes Made

### 1. Core Modules

#### `log_parser.py` (Updated)
- Added support for both .log and .evtx file formats
- Routing logic to direct files to appropriate parsers based on extension
- Auto-detection of .evtx files in session directories
- Backward compatible with existing .log parsing

#### `evtx_parser.py` (New)
- Main EVTX parsing module
- Multi-strategy approach:
  1. **Primary**: Uses `pyevtx` library if available (best compatibility)
  2. **Secondary**: Falls back to Windows API parsing (Windows only)
  3. **Tertiary**: Falls back to pure Python parsing
- Extracts events from binary EVTX files using XML parsing
- Supports Event ID, Level, Source/Provider, Timestamp, and Message data

#### `simple_evtx_parser.py` (New)
- Pure Python/Windows API fallback parser
- No external dependencies required
- Extracts XML data from binary EVTX files
- Two parsing strategies:
  1. Windows API (`win32evtlog`) - most reliable on Windows
  2. Pure Python regex extraction - works on any platform

#### `api_server.py` (Updated)
- Updated `_compute_logs_signature()` to include .evtx files
- Background watcher now detects changes to .evtx files
- Ensures analysis includes newly added EVTX files

### 2. Dependencies

#### Optional: For Full EVTX Support
```bash
pip install pyevtx
# or
pip install libevtx-python
```

#### Windows API Support (Optional, Windows Only)
```bash
pip install pywin32
# Run: pywin32_postinstall.py (included with pywin32)
```

#### Pure Python Fallback (No additional dependencies needed)
- Uses built-in `xml.etree` and `re` modules
- Works on Windows, Linux, and macOS

## Usage

### Automatic EVTX Detection
The system automatically detects and parses .evtx files found in the log directories:
```
analysis_logs/
├── userid/
│   └── systemname/
│       └── timestamp/
│           ├── System.log          (text format - existing)
│           ├── Application.log     (text format - existing)
│           ├── System.evtx         (binary format - NEW)
│           └── Application.evtx    (binary format - NEW)
```

### Command Line Usage
No changes needed - the system automatically detects and parses .evtx files:
```bash
python main.py
```

### API Endpoint
The REST API automatically includes EVTX events in analysis:
```bash
POST /api/analysis/run
GET /api/issues
```

## Features

### Supported Event Data Extraction
- ✅ Event ID
- ✅ Severity/Level (Critical, Error, Warning, Information, Verbose)
- ✅ Source/Provider Name
- ✅ Timestamp (ISO 8601 format)
- ✅ Message/Data fields
- ✅ Event Number/Index

### Network Connectivity Analysis (EVTX)
Works seamlessly with NetworkConnectivity-Analysis-Instructions.md:
- ✅ NCSI Events (4042, 4001-4006)
- ✅ Kernel-Power Events (506, 507)
- ✅ WLAN AutoConfig Events (8002, 11006)
- ✅ Network-specific pattern matching

### Fallback Strategies
If primary parser fails, automatically tries:
1. pyevtx library parsing
2. Windows API parsing
3. Pure Python XML extraction
4. Graceful degradation with warning messages

## Architecture

```
LogParser (log_parser.py)
    ├─> .log file? → _parse_text_log_file()
    └─> .evtx file? → EvtxParser
            ├─> pyevtx available? → _parse_with_pyevtx()
            └─> Fall back to SimpleEvtxParser
                    ├─> Windows API available? → _parse_with_windows_api()
                    └─> Pure Python parsing → _parse_basic_evtx()
```

## Logging Output

When EVTX files are processed, you'll see:
```
[EVTX] pyevtx library available for parsing
Parsing logs for User: admin, System: PC-001, Session: 2026-01-28_10-30-45
  - Parsed 245 entries from System.log
  - Parsed 156 entries from System.evtx (EVTX)
  - Parsed 89 entries from Application.evtx (EVTX)
Total entries parsed: 490
```

## Error Handling

- Missing EVTX library: Uses fallback parser automatically
- Invalid EVTX file: Skips gracefully with warning
- Parsing errors on individual events: Continues to next event
- No parser available: Falls back to text logs only

## Performance Considerations

- EVTX parsing is faster than text logs (binary format vs string parsing)
- First run may take longer (parsing larger event log files)
- Subsequent runs benefit from filtering logic
- Memory usage depends on number of events (typically < 100MB for typical logs)

## Troubleshooting

### EVTX Files Not Being Parsed
1. Check if file extension is exactly `.evtx` (case-insensitive matching works)
2. Verify file is in correct directory structure
3. Try installing pyevtx for better compatibility:
   ```bash
   pip install pyevtx
   ```

### Parser Selection Issues
The system logs which parser is being used:
```
[EVTX] pyevtx library available for parsing
```

To force a specific parser, check the code and modify parser priority in `evtx_parser.py`.

### Windows API Errors
If Windows API fails:
1. Ensure `pywin32` is installed and post-installed
2. Check that you have permissions to read event logs
3. System will automatically fall back to pure Python parser

## Future Enhancements

- [ ] Direct Event Viewer integration (Windows)
- [ ] EVTX filtering by event ID before parsing
- [ ] Caching of parsed events
- [ ] Batch processing optimization
- [ ] Event log export functionality

## Compatibility

- ✅ Windows 7/8/10/11
- ✅ Windows Server 2012+
- ✅ Linux/macOS (basic parsing only, no Windows API)
- ✅ Python 3.8+

## References

- EVTX Format: Microsoft Windows Event Log File Format
- pyevtx: https://github.com/libyal/libevtx
- win32evtlog: Part of pywin32
- Network Analysis: See `NetworkConnectivity-Analysis-Instructions.md`
