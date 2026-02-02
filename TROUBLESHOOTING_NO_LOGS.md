# Troubleshooting: "No Log Entries Found" Error

This guide helps you diagnose and fix the "no log entries found" error in the deployed System Log Analyzer.

## Quick Diagnosis

### Step 1: Check Log Directory Structure

Call this diagnostic endpoint from your API server:

```
GET http://{your-api-server}:5000/api/logs/diagnose
```

Or from PowerShell:

```powershell
$apiServer = "http://your-api-server:5000"
Invoke-WebRequest -Uri "$apiServer/api/logs/diagnose" | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

This will return information about:
- Where the logs directory is located (automatically set to solution directory + \analysis_logs)
- Whether it exists
- The directory structure
- Any errors encountered

### Step 2: Expected Directory Structure

The application expects logs in this structure (relative to where the solution is deployed):

```
{solution_directory}/
└── analysis_logs/
    ├── USER_ID_1/
    │   ├── SYSTEM_NAME_1/
    │   │   ├── 2026-01-26_12-13-30/
    │   │   │   ├── System.evtx          (or System.log)
    │   │   │   ├── Application.evtx    (or Application.log)
    │   │   │   ├── Network.evtx
    │   │   │   └── ...
    │   │   └── 2026-01-27_14-20-45/
    │   │       └── ...
    │   └── SYSTEM_NAME_2/
    │       └── ...
    └── USER_ID_2/
        └── ...
```

### Step 3: Check What You Have

After running the diagnostic endpoint, you should see:

**Good Response (logs found):**
```json
{
  "logs_dir": "/path/to/analysis_logs",
  "exists": true,
  "is_absolute": true,
  "absolute_path": "/full/path/to/analysis_logs",
  "user_count": 3,
  "users": [
    {
      "user_id": "10669022",
      "systems": ["soc-5CG5233YBT", "soc-5CG5233RCB"]
    },
    ...
  ],
  "structure": {
    "directories": ["10669022", "12197333", "12345678"],
    "files": [],
    "total_items": 3
  }
}
```

**Bad Response (no logs):**
```json
{
  "logs_dir": "./analysis_logs",
  "exists": false,
  "is_absolute": false,
  "absolute_path": "C:\\path\\to\\solution\\analysis_logs"
}
```

## Common Issues & Solutions

### Issue 1: Logs Directory Doesn't Exist

**Symptom:** `"exists": false`

**Solution:**

1. Create the required directory structure
2. Place log files in the correct location

Example:
```powershell
# Create directory structure
$solutionDir = "D:\Deploy\SystemLogAnalyzer"
$logsPath = "$solutionDir\analysis_logs\12345678\soc-5CG5233YBT\2026-01-26_12-13-30"
New-Item -Path $logsPath -ItemType Directory -Force

# Copy logs to the directory
# Place System.evtx, Application.evtx, etc. in the timestamp folder
```

### Issue 2: Wrong Directory Path

**Symptom:** 
- `"is_absolute": false`
- `"absolute_path"` points to wrong location
- Directory exists but logs aren't found

**Solution:**

The application is looking for logs at:
```
{BASE_DIR}/analysis_logs
```

Where `BASE_DIR` is the directory containing `api_server.py`.

**Verify:**
```powershell
# Check the current logs path the API is using
$apiServer = "http://your-api-server:5000"
Invoke-WebRequest -Uri "$apiServer/api/logs/diagnose" | ConvertFrom-Json | Select-Object logs_dir, absolute_path
```

If you need to use a different location, set the environment variable before starting the API:

```powershell
# Set custom logs directory before running the API
$env:LOG_ANALYZER_LOGS_DIR = "D:\CustomLogLocation\analysis_logs"

# Then start the API server
python api_server.py
```

Or edit [config.py](config.py) to use a custom path (the code already supports this via environment variable).

### Issue 3: Logs Exist But Not Being Found

**Symptom:**
- `"exists": true`
- `"directories"` shows user IDs
- But still "no log entries found"

**Check the Structure:**

The logs must follow this exact structure:

```
analysis_logs/
└── {USER_ID}/
    └── {SYSTEM_NAME}/
        └── {TIMESTAMP}/
            └── {LOG_FILES}
```

**Verify each level:**

```powershell
# First, navigate to your solution directory
$solutionDir = Get-Location  # or the path where api_server.py is located

# Level 1: Check user ID directories exist
Get-ChildItem "$solutionDir\analysis_logs"

# Level 2: Check system name directories exist (example user ID)
Get-ChildItem "$solutionDir\analysis_logs\10669022"

# Level 3: Check timestamp directories exist
Get-ChildItem "$solutionDir\analysis_logs\10669022\soc-5CG5233YBT"

# Level 4: Check log files exist
Get-ChildItem "$solutionDir\analysis_logs\10669022\soc-5CG5233YBT\2026-01-26_12-13-30"
```

If the structure is different, reorganize it to match.

### Issue 4: Log Files Not Recognized

**Symptom:**
- Directory structure is correct
- Directory contains files
- But logs still not found

**Check Supported File Types:**

The application supports:
- `System.evtx` or `System.log`
- `Application.evtx` or `Application.log`
- `Network.log`
- `network_ncsi.log`
- `network_wlan.log`
- `Driver.log`

**Verify your log files match one of these names:**

```powershell
# List actual files (example path)
$solutionDir = Get-Location
Get-ChildItem "$solutionDir\analysis_logs\10669022\soc-5CG5233YBT\2026-01-26_12-13-30"

# You should see files like:
# System.evtx
# Application.evtx
# etc.
```

If your files have different names, rename them to match or update `LOG_TYPES` in [config.py](config.py).

## Manual Verification

To completely verify your setup:

```powershell
# 1. Call the diagnostic endpoint (replace with your actual API server address)
$apiServer = "http://your-api-server:5000"
$diag = Invoke-WebRequest -Uri "$apiServer/api/logs/diagnose" | ConvertFrom-Json
$diag

# 2. Call the sessions endpoint
$sessions = Invoke-WebRequest -Uri "$apiServer/api/logs/sessions" | ConvertFrom-Json
$sessions.sessions | ConvertTo-Json -Depth 5

# 3. If sessions shows data, try running analysis
$analysisResult = Invoke-WebRequest -Uri "$apiServer/api/analyze" -Method POST -Headers @{'Content-Type'='application/json'} | ConvertFrom-Json
$analysisResult
```

## If All Else Fails

### Option 1: Add Sample Logs

Create sample log files to test:

```powershell
# Create the directory structure (in your solution directory)
$solutionDir = Get-Location
$logPath = "$solutionDir\analysis_logs\test-user\test-system\2026-02-02_00-00-00"
New-Item -Path $logPath -ItemType Directory -Force

# Create a sample System.log file
@"
[2026-02-02 10:00:00] System boot starting
[2026-02-02 10:00:05] System services starting
[2026-02-02 10:00:10] Network adapter initialized
[2026-02-02 10:00:15] System boot complete
"@ | Set-Content "$logPath\System.log"

# Create a sample Application.log file
@"
[2026-02-02 10:00:01] Application startup
[2026-02-02 10:00:02] Loading configuration
[2026-02-02 10:00:03] Application ready
"@ | Set-Content "$logPath\Application.log"
```

Then check if the app finds these logs:

```powershell
# Reload the page and check if test-user shows up
Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/logs/sessions" | ConvertFrom-Json | ConvertTo-Json
```

### Option 2: Check API Server Logs

Look at the Python API server console output for any error messages during startup or when calling `/api/logs/sessions`.

### Option 3: Verify Permissions

Ensure the API server process has read permission to the logs directory:

```powershell
# Get the current user/process
whoami

# Check directory permissions
icacls C:\Work\SystemLogAnalyzer\SystemLogAnalyzer\analysis_logs /T
```

## Configuration for Different Deployment Scenarios

### Scenario 1: Logs on Same Server

```python
# config.py
LOGS_DIR = os.path.join(BASE_DIR, "analysis_logs")
```

Place logs in: `C:\Work\SystemLogAnalyzer\SystemLogAnalyzer\analysis_logs`

### Scenario 2: Logs on Different Drive

```python
# config.py
LOGS_DIR = "D:\\SharedLogs\\analysis_logs"
```

Place logs in: `D:\SharedLogs\analysis_logs`

### Scenario 3: Logs from Network Share

```python
# config.py
LOGS_DIR = r"\\network-server\shared\analysis_logs"
```

Place logs in: `\\network-server\shared\analysis_logs`

Make sure the network share is mounted and accessible to the API server.

### Scenario 4: Environment Variable

```python
# config.py - Make it configurable
LOGS_DIR = os.environ.get(
    'LOG_ANALYZER_LOGS_DIR',
    os.path.join(BASE_DIR, "analysis_logs")
)
```

Then set environment variable before running API:

```powershell
$env:LOG_ANALYZER_LOGS_DIR = "C:\MyLogs\analysis_logs"
python api_server.py
```

## After Fixing the Issue

Once you've fixed the directory structure:

1. **Restart the API server**
   ```powershell
   # Stop the current process
   # Restart with: python api_server.py
   ```

2. **Refresh the browser**
   - Clear browser cache (F12 → Storage → Clear All)
   - Reload the page

3. **Verify logs appear**
   - Go to the main analysis page
   - Should see log entries loaded
   - Sessions should show in the UI

4. **Run analysis**
   - Click "Analyze Logs" button
   - Monitor should show progress
   - Report should generate successfully
