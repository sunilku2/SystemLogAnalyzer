# Fixing "No Log Entries Found" - Deployed Environment

You're deployed at `http://10.148.138.148:31962/` and getting "no log entries found" error.

## Step 1: Test the API Directly

First, verify your API server is returning correct results:

```powershell
# Test the diagnostic endpoint
# Replace with your actual API server address
$apiUrl = "http://your-api-server:5000"
$diag = Invoke-WebRequest -Uri "$apiUrl/api/logs/diagnose" | ConvertFrom-Json

# Display results
Write-Host "API URL: $apiUrl"
Write-Host "Logs Directory: $($diag.logs_dir)"
Write-Host "Directory Exists: $($diag.exists)"
Write-Host "Absolute Path: $($diag.absolute_path)"
Write-Host "User Count: $($diag.user_count)"
Write-Host ""
Write-Host "Directory Structure:"
$diag.structure | ConvertTo-Json

# Also check sessions
$sessions = Invoke-WebRequest -Uri "$apiUrl/api/logs/sessions" | ConvertFrom-Json
Write-Host ""
Write-Host "Sessions Found: $($sessions.statistics.total_sessions)"
Write-Host "Users: $($sessions.statistics.users)"
Write-Host "Systems: $($sessions.statistics.systems)"
```

## Step 2: Understand What You See

### Scenario A: "exists": false

The logs directory doesn't exist where the API is looking.

**Next steps:**
1. Note the `absolute_path` from the diagnostic output
2. Create that directory using the path shown in the diagnostic output
3. Copy your log files to that location following the structure:
   ```
   {absolute_path_from_diagnostic}/
   └── USER_ID/
       └── SYSTEM_NAME/
           └── TIMESTAMP/
               ├── System.evtx (or .log)
               ├── Application.evtx (or .log)
               └── ...
   ```

### Scenario B: "exists": true but "user_count": 0

The directory exists but has no subdirectories.

**Next steps:**
1. Use the `absolute_path` from diagnostic output
2. Verify if you have logs somewhere else on the server
3. Copy logs to the correct path with the structure above

### Scenario C: "exists": true, users found, but still "no log entries found" in UI

The API is finding directories but maybe missing the actual log files.

**Check:**
1. Navigate to the path shown in diagnostic
2. Verify you see actual log files
3. Verify file names match: `System.evtx`, `Application.log`, etc.

## Step 3: Check Your Current Setup

On the server where API is running, verify:

```powershell
# Check if Python/API is running
Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*api_server*" }

# The logs directory is automatically relative to where api_server.py is located
# It should be: {solution_directory}\analysis_logs

# To find the exact logs path, run the diagnostic endpoint from your local machine
# or check the server's config.py for LOGS_DIR setting

# Count files in the logs directory
$logsDir = ".\analysis_logs"  # Relative to solution directory
if (Test-Path $logsDir) {
    (Get-ChildItem -Recurse $logsDir -File | Measure-Object).Count
}
```

## Step 4: Move Logs to Correct Location

If logs exist but are in the wrong place:

```powershell
# Example: Move logs to the solution's analysis_logs directory
# First, find where the solution is running from
$solutionDir = Get-Location  # or the actual path where api_server.py is

# Create the proper directory structure
$timestamp = (Get-Date).ToString("yyyy-MM-dd_HH-mm-ss")
$logDestination = Join-Path $solutionDir "analysis_logs\user-id\system-name\$timestamp"
New-Item -Path $logDestination -ItemType Directory -Force

# Move your logs there
Copy-Item "D:\SourceLogs\*" $logDestination -Recurse

$sourceLogsDir = "D:\YourLogs"
$solutionDir = Get-Location  # Where api_server.py is located
$destLogsDir = Join-Path $solutionDir "analysis_logs"

# Verify source structure
Write-Host "Source logs structure:"
Get-ChildItem -Recurse $sourceLogsDir | Select-Object FullName

Write-Host ""
Write-Host "Moving logs to solution directory..."

# Create destination if needed
New-Item -Path $destLogsDir -ItemType Directory -Force | Out-Null

# Copy logs (preserving structure)
Get-ChildItem -Path $sourceLogsDir -Recurse | 
ForEach-Object {
    $relPath = $_.FullName.Substring($sourceLogsDir.Length + 1)
    $destPath = Join-Path $destLogsDir $relPath
    
    if ($_.PSIsContainer) {
        New-Item -Path $destPath -ItemType Directory -Force | Out-Null
    } else {
        New-Item -Path (Split-Path $destPath) -ItemType Directory -Force | Out-Null
        Copy-Item -Path $_.FullName -Destination $destPath -Force
    }
}

Write-Host "Done! Logs moved to: $destLogsDir"
```

## Step 5: Create Sample Logs (if you have no logs)

If you don't have any logs yet, create sample ones to test:

```powershell
# Navigate to where your solution is deployed
cd "path\to\your\solution\directory"

# Create the expected directory structure (relative to current location)
$timestamp = (Get-Date).ToString("yyyy-MM-dd_HH-mm-ss")
$sampleLogPath = "analysis_logs\user-123\system-abc\$timestamp"

New-Item -Path $sampleLogPath -ItemType Directory -Force | Out-Null

# Create sample log files
@"
[2026-02-02T10:00:00Z] System startup
[2026-02-02T10:00:05Z] Network interfaces initialized
[2026-02-02T10:00:10Z] Services started
[2026-02-02T10:00:15Z] System ready
"@ | Set-Content "$sampleLogPath\System.log"

@"
[2026-02-02T10:00:01Z] Application initialization
[2026-02-02T10:00:02Z] Loading config
[2026-02-02T10:00:03Z] Ready to accept requests
"@ | Set-Content "$sampleLogPath\Application.log"

# Verify
Write-Host "Created sample logs at:"
Get-ChildItem -Recurse $sampleLogPath | Select-Object FullName
```

## Step 6: Restart API Server

After placing logs in the correct location:

```powershell
# Stop the running API server
Get-Process python | Where-Object { $_.CommandLine -like "*api_server*" } | Stop-Process -Force -ErrorAction Continue

# Wait a moment
Start-Sleep -Seconds 2

# Start API again
cd "C:\Work\SystemLogAnalyzer\SystemLogAnalyzer"
python api_server.py

# In another PowerShell, verify it started
Start-Sleep -Seconds 3
Invoke-WebRequest -Uri "http://localhost:5000/api/health" | ConvertFrom-Json
```

## Step 7: Verify Logs Are Found

```powershell
# Test the diagnostic endpoint again
$diag = Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/logs/diagnose" | ConvertFrom-Json
if ($diag.user_count -gt 0) {
    Write-Host "SUCCESS! Found $($diag.user_count) user directories"
    Write-Host "Users: $($diag.users | ConvertTo-Json)"
} else {
    Write-Host "Still no logs found. Check the path:"
    Write-Host $diag.absolute_path
    Write-Host "Directory exists: $($diag.exists)"
}

# Test sessions endpoint
$sessions = Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/logs/sessions" | ConvertFrom-Json
Write-Host "Sessions: $($sessions.statistics.total_sessions)"
if ($sessions.help) {
    Write-Host "Issues:"
    $sessions.help.next_steps | ForEach-Object { Write-Host "  - $_" }
}
```

## Step 8: Refresh Your Deployed App

Once API shows logs correctly:

```powershell
# Clear browser cache
# Press Ctrl+Shift+Delete in browser

# Or force-rebuild and redeploy
cd "C:\Work\SystemLogAnalyzer\SystemLogAnalyzer\WebApp\ClientApp"
$env:REACT_APP_API_URL = "http://10.148.138.148:5000/api"
rm -r build -Force
npm run build

# Deploy the new build folder
```

## Troubleshooting If Still Not Working

### Check API Logs

```powershell
# Look at the Python API console for errors when calling /api/logs/sessions
# The output should show:
# - Which directory it's checking
# - How many user/system/session directories it found
# - Any errors parsing files

# You should see something like:
# "Discovered 3 user directories"
# "Found 5 sessions total"
```

### Verify File Permissions

```powershell
# Check if API process can read the logs
$logsDir = "C:\Work\SystemLogAnalyzer\SystemLogAnalyzer\analysis_logs"
icacls $logsDir /T

# Make sure the user running the API has read permissions
# If not, grant them:
icacls $logsDir /grant:r "Users:F" /T
```

### Check for Spaces in Path

The code should handle spaces, but verify:

```powershell
$logsDir = "C:\Work\SystemLogAnalyzer\SystemLogAnalyzer\analysis_logs"
# If it has spaces like:
# "C:\Program Files\My App\analysis_logs"
# Make sure to quote it properly

# Test:
Test-Path -LiteralPath $logsDir
```

## Expected Success State

Once everything is working:

1. **API Health Check**
   ```powershell
   Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/health" | ConvertFrom-Json
   # Returns: {"status":"ok"}
   ```

2. **Diagnostic Shows Logs**
   ```powershell
   $diag = Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/logs/diagnose" | ConvertFrom-Json
   # Shows: "exists": true, "user_count": > 0
   ```

3. **Sessions Endpoint Returns Data**
   ```powershell
   $sessions = Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/logs/sessions" | ConvertFrom-Json
   # Shows: "total_sessions": > 0
   ```

4. **Web App Shows Logs**
   - Navigate to `http://10.148.138.148:31962/`
   - Should see log entries and sessions
   - Can click "Analyze Logs" button

## If You Need Help

Collect this information and provide it:

```powershell
# Run this diagnostic bundle
Write-Host "=== SYSTEM INFORMATION ==="
Write-Host "Date: $(Get-Date)"
Write-Host "API URL: http://10.148.138.148:5000"
Write-Host "Web URL: http://10.148.138.148:31962"

Write-Host ""
Write-Host "=== API DIAGNOSTIC ==="
try {
    $diag = Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/logs/diagnose" | ConvertFrom-Json
    $diag | ConvertTo-Json -Depth 10
} catch {
    Write-Host "ERROR: Cannot reach API - $_"
}

Write-Host ""
Write-Host "=== SESSIONS DATA ==="
try {
    $sessions = Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/logs/sessions" | ConvertFrom-Json
    $sessions | ConvertTo-Json -Depth 10
} catch {
    Write-Host "ERROR: Cannot fetch sessions - $_"
}

Write-Host ""
Write-Host "=== CONFIG ==="
Get-Content "C:\Work\SystemLogAnalyzer\SystemLogAnalyzer\config.py" | grep -i "LOGS_DIR|log_types"
```
