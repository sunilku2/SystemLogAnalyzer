# Quick Troubleshooting Commands

## Check Log Directory Structure

### Using the Diagnostic Endpoint

```powershell
# Get detailed diagnostic information
$url = "http://10.148.138.148:5000/api/logs/diagnose"
$result = Invoke-WebRequest -Uri $url | ConvertFrom-Json
$result | ConvertTo-Json -Depth 10

# Or just check key info
$result = Invoke-WebRequest -Uri $url | ConvertFrom-Json
Write-Host "Logs Directory: $($result.logs_dir)"
Write-Host "Directory Exists: $($result.exists)"
Write-Host "Absolute Path: $($result.absolute_path)"
Write-Host "User Count: $($result.user_count)"
```

### Check Sessions Endpoint

```powershell
# Get list of discovered log sessions
$sessions = Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/logs/sessions" | ConvertFrom-Json
$sessions | ConvertTo-Json -Depth 10

# If no logs found, will show helpful information:
if ($sessions.sessions.Count -eq 0) {
    Write-Host "Help Information:"
    $sessions.help.next_steps | ForEach-Object { Write-Host "  - $_" }
}
```

## Common Fixes

### Fix 1: Create the Logs Directory

```powershell
# Create the directory structure
$baseDir = "C:\Work\SystemLogAnalyzer\SystemLogAnalyzer"
$logPath = "$baseDir\analysis_logs\test-user\test-system\2026-02-02_00-00-00"
New-Item -Path $logPath -ItemType Directory -Force

# Create sample log files
@"
[2026-02-02 10:00:00] System startup
[2026-02-02 10:00:05] Services loaded
"@ | Set-Content "$logPath\System.log"

@"
[2026-02-02 10:00:01] Application started
"@ | Set-Content "$logPath\Application.log"

# Verify
Get-ChildItem -Recurse "$baseDir\analysis_logs"
```

### Fix 2: Copy Existing Logs to Correct Location

```powershell
# If you have logs elsewhere, copy them
$sourceLogs = "D:\MyLogs\*"
$destLogs = "C:\Work\SystemLogAnalyzer\SystemLogAnalyzer\analysis_logs\"
Copy-Item -Path $sourceLogs -Destination $destLogs -Recurse -Force

# Verify structure
Get-ChildItem -Recurse "$destLogs"
```

### Fix 3: Update Config to Use Different Path

```powershell
# Edit config.py to use custom logs path
$configFile = "C:\Work\SystemLogAnalyzer\SystemLogAnalyzer\config.py"

# Backup original
Copy-Item $configFile "$configFile.backup"

# Change LOGS_DIR in config.py
# Open with notepad and find the line:
# LOGS_DIR = os.path.join(BASE_DIR, "analysis_logs")
# Change to:
# LOGS_DIR = "C:\YourCustomPath\analysis_logs"

notepad $configFile
```

## Verify After Fixing

```powershell
# 1. Test the diagnostic endpoint
$diag = Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/logs/diagnose" | ConvertFrom-Json
Write-Host "Directory exists: $($diag.exists)"
Write-Host "User count: $($diag.user_count)"

# 2. Test the sessions endpoint
$sessions = Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/logs/sessions" | ConvertFrom-Json
Write-Host "Sessions found: $($sessions.statistics.total_sessions)"
Write-Host "Unique users: $($sessions.statistics.unique_users)"

# 3. If sessions found, try analysis
if ($sessions.statistics.total_sessions -gt 0) {
    Write-Host "SUCCESS: Logs are now discoverable!"
    Write-Host "Sessions: $($sessions.sessions | ConvertTo-Json)"
} else {
    Write-Host "ISSUE: Still no sessions found"
    Write-Host "Help: $($sessions.help.next_steps)"
}
```

## Check Log File Format

```powershell
# Verify log files are readable
$logDir = "C:\Work\SystemLogAnalyzer\SystemLogAnalyzer\analysis_logs"
Get-ChildItem -Recurse $logDir -File | ForEach-Object {
    Write-Host "File: $($_.FullName)"
    Write-Host "  Size: $($_.Length) bytes"
    Write-Host "  Type: $($_.Extension)"
}

# For .evtx files, check if they're Windows Event Log files
# For .log files, check if they're text files
$logFile = Get-ChildItem -Recurse $logDir -File | Select-Object -First 1
if ($logFile.Extension -eq ".log") {
    Get-Content $logFile.FullName -Head 10
}
```

## API Testing

```powershell
# Test API health
Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/health" | ConvertFrom-Json

# Test config endpoint
Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/config" | ConvertFrom-Json

# Test analyzer status
Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/analyzer/status" | ConvertFrom-Json

# Test with credentials if needed (modify as needed)
$headers = @{
    "Content-Type" = "application/json"
}
Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/logs/sessions" -Headers $headers | ConvertFrom-Json
```

## Restart API Server

```powershell
# Stop current API process
Get-Process python | Where-Object { $_.CommandLine -like "*api_server*" } | Stop-Process -Force

# Restart API
cd C:\Work\SystemLogAnalyzer\SystemLogAnalyzer
python api_server.py

# In a new PowerShell window, verify it's running
Start-Sleep -Seconds 3
Invoke-WebRequest -Uri "http://localhost:5000/api/health"
```

## Rebuild Frontend with Correct API URL

```powershell
# Navigate to React app
cd C:\Work\SystemLogAnalyzer\SystemLogAnalyzer\WebApp\ClientApp

# Set API URL
$env:REACT_APP_API_URL = "http://10.148.138.148:5000/api"

# Build
npm run build

# Deploy build folder to your web server
```

## Check Web Server Logs

```powershell
# If using IIS
Get-Content "C:\inetpub\logs\LogFiles\W3SVC1\*.log" -Tail 50

# If using Node/Express (if that's your setup)
# Check the console where the web server is running

# If deployed to Docker/Container
docker logs <container-id>
```

## Complete Workflow to Fix the Issue

```powershell
# 1. Stop everything
Write-Host "Step 1: Stopping services..."
Get-Process python | Where-Object { $_.CommandLine -like "*api_server*" } | Stop-Process -Force

# 2. Create proper directory structure (relative to where api_server.py is)
Write-Host "Step 2: Creating directory structure..."
# Find where the solution is running
$solutionDir = Split-Path (Get-Process python | Where-Object { $_.CommandLine -like "*api_server*" } | Select-Object -First 1).CommandLine
# OR use the solution location directly:
$solutionDir = "C:\Work\SystemLogAnalyzer\SystemLogAnalyzer"

$logPath = Join-Path $solutionDir "analysis_logs\test-user\test-system\2026-02-02_00-00-00"
New-Item -Path $logPath -ItemType Directory -Force | Out-Null

# 3. Add sample logs
Write-Host "Step 3: Adding sample logs..."
@"
[2026-02-02 10:00:00] System boot
[2026-02-02 10:00:05] Services ready
"@ | Set-Content "$logPath\System.log"

# 4. Restart API
Write-Host "Step 4: Starting API server..."
$apiProcess = Start-Process python -ArgumentList "$solutionDir\api_server.py" -PassThru -NoNewWindow
Start-Sleep -Seconds 3

# 5. Test
Write-Host "Step 5: Testing..."
$diag = Invoke-WebRequest -Uri "http://localhost:5000/api/logs/diagnose" | ConvertFrom-Json
Write-Host "Directory exists: $($diag.exists)"

$sessions = Invoke-WebRequest -Uri "http://localhost:5000/api/logs/sessions" | ConvertFrom-Json
Write-Host "Sessions found: $($sessions.statistics.total_sessions)"

# 6. Rebuild frontend
Write-Host "Step 6: Rebuilding frontend..."
cd "$solutionDir\WebApp\ClientApp"
$env:REACT_APP_API_URL = "http://localhost:5000/api"
npm run build

Write-Host "Done! Check the build folder at: $solutionDir\WebApp\ClientApp\build"
```
