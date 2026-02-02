# Troubleshooting "No Log Entries Found" - Documentation Index

If you're getting the error **"no log entries found"** on your deployed System Log Analyzer, start here.

## Quick Links

### 🚀 **Fastest Solution** (Start Here)
👉 **[QUICK_CHECKLIST.md](QUICK_CHECKLIST.md)** - 15 minute step-by-step checklist
- Copy-paste commands
- Decision tree to find your specific issue
- Expected outcomes at each step

### 🔍 **Diagnose the Problem** (Next)
👉 **[SOLUTION_NO_LOGS_SUMMARY.md](SOLUTION_NO_LOGS_SUMMARY.md)** - Overview of what was fixed
- Explains what causes the error
- What endpoints were added to diagnose it
- How to test your fix

### 📋 **For Your Deployment Environment** (10.148.138.148:31962)
👉 **[FIX_NO_LOGS_DEPLOYED.md](FIX_NO_LOGS_DEPLOYED.md)** - Specific for your setup
- Step 1: Test the API directly
- Step 2: Understand what you see
- Step 3: Check your current setup
- Step 4: Move logs to correct location
- Step 5: Create sample logs (if needed)
- Step 6: Restart API
- Step 7: Verify logs are found
- Step 8: Refresh deployed app

### ⚙️ **Complete Technical Reference**
👉 **[TROUBLESHOOTING_NO_LOGS.md](TROUBLESHOOTING_NO_LOGS.md)** - Full troubleshooting guide
- Quick diagnosis
- All common issues and solutions
- Configuration for different scenarios
- Manual verification steps
- Environment-specific setups

### 💻 **PowerShell Commands**
👉 **[QUICK_FIX_COMMANDS.md](QUICK_FIX_COMMANDS.md)** - Ready-to-copy commands
- Check log directory structure
- Check sessions endpoint
- Create logs directory
- Copy existing logs
- Update config
- Restart API
- Verify after fixing
- Complete workflow

---

## The Problem Explained (2 minutes)

Your System Log Analyzer needs log files to analyze. These must be organized in a specific directory structure:

```
analysis_logs/
└── USER_ID/
    └── SYSTEM_NAME/
        └── TIMESTAMP/
            ├── System.log (or .evtx)
            └── Application.log (or .evtx)
```

When the app says "no log entries found", it means:
- ❌ The directory doesn't exist, OR
- ❌ The directory exists but has no subdirectories, OR
- ❌ The subdirectories exist but are empty, OR
- ❌ The files exist but don't follow the naming convention

## The Solution Provided (Code Changes)

Two new diagnostic tools were added to help you identify and fix the issue:

### 1. New Diagnostic Endpoint
**URL:** `http://10.148.138.148:5000/api/logs/diagnose`

Returns:
- Where the logs directory should be
- Whether it exists
- What's inside it
- Absolute path to check

### 2. Enhanced Error Message
**URL:** `http://10.148.138.148:5000/api/logs/sessions`

Returns:
- Clear error message if no logs found
- Troubleshooting steps
- Directory path
- What needs to be fixed

## How to Use the Solution

### In 3 Steps:

1. **Run diagnostic:**
   ```powershell
   $diag = Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/logs/diagnose" | ConvertFrom-Json
   $diag | ConvertTo-Json -Depth 5
   ```

2. **Check the output:**
   - Does directory exist? YES/NO
   - Are there any users? COUNT: ___

3. **Fix based on output:**
   - NO directory → Create it
   - Empty directory → Add logs
   - Wrong structure → Reorganize
   - Wrong names → Rename or update config

---

## Choose Your Path

### ❓ "I don't know where my log files are"
→ Start with [QUICK_CHECKLIST.md](QUICK_CHECKLIST.md)

### ❓ "I have logs but in wrong location"
→ Read [FIX_NO_LOGS_DEPLOYED.md](FIX_NO_LOGS_DEPLOYED.md) - Step 4

### ❓ "I don't have any logs yet"
→ Read [QUICK_CHECKLIST.md](QUICK_CHECKLIST.md) - "Create Logs Directory"

### ❓ "I need technical details"
→ Read [TROUBLESHOOTING_NO_LOGS.md](TROUBLESHOOTING_NO_LOGS.md)

### ❓ "Just give me the PowerShell commands"
→ Read [QUICK_FIX_COMMANDS.md](QUICK_FIX_COMMANDS.md)

---

## Expected Directory Structure

Your logs **must** be organized exactly like this:

```
C:\Work\SystemLogAnalyzer\SystemLogAnalyzer\analysis_logs\
│
├── 10669022/                          ← User ID
│   ├── soc-5CG5233YBT/               ← System Name
│   │   ├── 2026-01-26_12-13-30/      ← Timestamp
│   │   │   ├── System.evtx
│   │   │   ├── Application.evtx
│   │   │   └── Network.log
│   │   └── 2026-01-27_14-20-45/
│   │       └── ...
│   └── soc-5CG5233RCB/
│       └── ...
│
└── 12197333/
    └── ...
```

### File Names Must Match:
- `System.evtx` or `System.log`
- `Application.evtx` or `Application.log`  
- `Network.log`
- `network_ncsi.log`
- `network_wlan.log`
- `Driver.log`

---

## Quick Test (After Fixing)

```powershell
# Should return user_count > 0
$diag = Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/logs/diagnose" | ConvertFrom-Json
Write-Host "Users: $($diag.user_count)"

# Should return total_sessions > 0
$sessions = Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/logs/sessions" | ConvertFrom-Json
Write-Host "Sessions: $($sessions.statistics.total_sessions)"

# Web app should show logs
# http://10.148.138.148:31962/
```

---

## Code Changes Made

### api_server.py

**Added:** Diagnostic endpoint
```python
@app.route('/api/logs/diagnose', methods=['GET'])
def diagnose_logs():
    """Diagnostic endpoint to check log directory structure"""
    # Returns: logs_dir, exists, is_absolute, absolute_path, structure
```

**Enhanced:** Sessions endpoint
```python
@app.route('/api/logs/sessions', methods=['GET'])
def get_log_sessions():
    """Now returns helpful error message when no logs found"""
    # Returns: sessions, message, help (with troubleshooting steps)
```

### Admin.js (previous fix)

**Added:** `getApiUrl()` helper function
- Makes API calls work on different hosts
- Uses environment variable for API base URL

### setupProxy.js (previous fix)

**Made configurable:** Uses `REACT_APP_API_TARGET` env var
- Works in development on different API servers
- No more hardcoded localhost:5000

---

## Before & After

### Before (API Error)
```json
{
  "success": false,
  "error": "No sessions found"
}
```

User sees: "❌ Failed to load sessions"

### After (Helpful Error)
```json
{
  "success": true,
  "sessions": [],
  "message": "No log sessions found",
  "help": {
    "description": "No logs were found in the configured logs directory",
    "logs_directory": "./analysis_logs",
    "absolute_path": "C:\\Work\\SystemLogAnalyzer\\analysis_logs",
    "directory_exists": false,
    "next_steps": [
      "Check that the logs directory exists at: C:\\...",
      "Ensure logs follow this structure: {user_id}/{system_name}/{timestamp}/",
      "Call /api/logs/diagnose for detailed directory structure",
      "Check LOGS_DIR setting in config.py if path is incorrect"
    ]
  }
}
```

User sees: Clear instructions on how to fix

---

## Files Created/Modified

### New Documentation Files
- ✅ [TROUBLESHOOTING_NO_LOGS.md](TROUBLESHOOTING_NO_LOGS.md) - Complete guide
- ✅ [FIX_NO_LOGS_DEPLOYED.md](FIX_NO_LOGS_DEPLOYED.md) - Your environment
- ✅ [QUICK_FIX_COMMANDS.md](QUICK_FIX_COMMANDS.md) - PowerShell commands
- ✅ [QUICK_CHECKLIST.md](QUICK_CHECKLIST.md) - Step-by-step checklist
- ✅ [SOLUTION_NO_LOGS_SUMMARY.md](SOLUTION_NO_LOGS_SUMMARY.md) - Overview

### Modified Code Files
- 📝 `api_server.py` - Added diagnostic endpoint, enhanced sessions endpoint
- 📝 `Admin.js` - Added `getApiUrl()` helper (previous fix)
- 📝 `setupProxy.js` - Made configurable (previous fix)
- 📝 `api.js` - Exported API_BASE_URL (previous fix)

---

## Next Steps

**Don't panic!** The error is fixable. Follow these steps:

1. **Read:** [QUICK_CHECKLIST.md](QUICK_CHECKLIST.md) (15 min)
2. **Run:** The diagnostic commands (2 min)
3. **Fix:** Based on what the diagnostic shows (5-10 min)
4. **Verify:** Test that logs are now found (2 min)

**Total time: ~30 minutes maximum**

Good luck! 💪
