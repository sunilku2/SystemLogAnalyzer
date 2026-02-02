# Quick Checklist: Fix "No Log Entries Found"

## Before You Start
- [ ] Know your API URL: `http://10.148.138.148:5000`
- [ ] Know your Web URL: `http://10.148.138.148:31962`
- [ ] Have PowerShell or command line ready
- [ ] Know where your log files are (or need to create them)

## Step 1: Diagnose the Problem (5 minutes)

```powershell
# Run this command
$diag = Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/logs/diagnose" | ConvertFrom-Json

# Check these values
Write-Host "Directory exists: $($diag.exists)"
Write-Host "Path: $($diag.absolute_path)"
Write-Host "User count: $($diag.user_count)"
```

- [ ] Copy the output - you'll need it
- [ ] Note: Does the directory exist? (YES/NO)
- [ ] Note: Are there any user directories? (COUNT: ___)

## Step 2: Choose Your Path

### Path A: Directory Doesn't Exist (directory exists = false)

Go to "Create Logs Directory" below

### Path B: Directory Exists But Empty (user count = 0)

Go to "Find or Copy Logs" below

### Path C: Directory Has Logs But Not Found (user count > 0 but still getting error)

Go to "Verify Directory Structure" below

## Create Logs Directory

1. [ ] Open PowerShell
2. [ ] Navigate to where the solution is running (where api_server.py is located)
3. [ ] Run these commands:
   ```powershell
   # Get the solution directory (where this PowerShell is running from)
   $solutionDir = Get-Location
   
   # Create directory relative to solution location
   $logPath = "$solutionDir\analysis_logs\test-user\test-system\$(Get-Date -f 'yyyy-MM-dd_HH-mm-ss')"
   New-Item -Path $logPath -ItemType Directory -Force
   
   # Create sample logs
   @"
[2026-02-02 10:00:00] System startup
   @"@ | Set-Content "$logPath\System.log"
   
   @"
[2026-02-02 10:00:01] App ready
   @"@ | Set-Content "$logPath\Application.log"
   ```
4. [ ] Go to "Restart API" below

## Find or Copy Logs

1. [ ] Determine where your log files are
   - [ ] Same server in different folder?
   - [ ] Network share?
   - [ ] USB drive?
   - [ ] Don't know (create sample logs instead)

2. [ ] If you found them:
   ```powershell
   $sourceDir = "YOUR_LOG_LOCATION"
   $destDir = "C:\Work\SystemLogAnalyzer\SystemLogAnalyzer\analysis_logs"
   
   # Copy everything
   Copy-Item -Path "$sourceDir\*" -Destination $destDir -Recurse -Force
   ```
3. [ ] Go to "Restart API" below

## Verify Directory Structure

Expected structure (relative to solution folder):
```
analysis_logs/
└── USER_ID/
    └── SYSTEM_NAME/
        └── TIMESTAMP/
            ├── System.log (or .evtx)
            └── Application.log (or .evtx)
```

1. [ ] Check your actual structure:
   ```powershell
   # Navigate to solution directory
   cd (solution directory path)
   
   # View directory structure
   Get-ChildItem -Recurse "analysis_logs" | Select-Object FullName
   ```

2. [ ] Verify you have at least:
   - [ ] One user ID folder
   - [ ] One system name folder inside it
   - [ ] One timestamp folder inside that
   - [ ] At least one .log or .evtx file inside

3. [ ] If structure is wrong:
   - [ ] Rename folders to match expected structure
   - [ ] Rename files to use correct names (System.log, Application.log, etc.)
   - [ ] OR update `LOG_TYPES` in config.py

4. [ ] Go to "Restart API" below

## Restart API

1. [ ] Navigate to the solution directory (where api_server.py is located):
   ```powershell
   cd "path\to\solution\directory"
   ```

2. [ ] Stop the current API:
   ```powershell
   Get-Process python | Where-Object { $_.CommandLine -like "*api_server*" } | Stop-Process -Force
   ```

3. [ ] Wait 2 seconds:
   ```powershell
   Start-Sleep -Seconds 2
   ```

4. [ ] Start API again:
   ```powershell
   python api_server.py
   ```

5. [ ] Wait for startup message:
   ```
   Log Analyzer REST API Server
   ...
   Press Ctrl+C to stop the server
   ```

6. [ ] Open new PowerShell window for next step

## Verify Fix

1. [ ] Run diagnostic again:
   ```powershell
   $diag = Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/logs/diagnose" | ConvertFrom-Json
   Write-Host "User count: $($diag.user_count)"
   ```
   - [ ] Should show user count > 0

2. [ ] Check sessions:
   ```powershell
   $sessions = Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/logs/sessions" | ConvertFrom-Json
   Write-Host "Sessions: $($sessions.statistics.total_sessions)"
   ```
   - [ ] Should show sessions > 0

3. [ ] If both show > 0:
   - [ ] SUCCESS! Go to "Test Web App"
   - [ ] If still 0, review the above steps

## Test Web App

1. [ ] Open browser
2. [ ] Go to: `http://10.148.138.148:31962/`
3. [ ] Wait for page to load
4. [ ] Check if you see log entries
   - [ ] YES: You're done! 🎉
   - [ ] NO: Clear cache and try again

## Clear Browser Cache (if needed)

1. [ ] Press `Ctrl+Shift+Delete` in browser
2. [ ] Select "All time"
3. [ ] Check: Cookies, Cache, Files
4. [ ] Click "Clear"
5. [ ] Refresh page: `Ctrl+F5`

## If Still Not Working

Try this complete workflow:

```powershell
# 1. Stop API
Get-Process python | Where-Object { $_.CommandLine -like "*api_server*" } | Stop-Process -Force
Start-Sleep -Seconds 2

# 2. Create fresh logs
$logDir = "C:\Work\SystemLogAnalyzer\SystemLogAnalyzer\analysis_logs"
Remove-Item -Path $logDir -Recurse -Force -ErrorAction Continue
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logPath = "$logDir\user-1\system-1\$timestamp"
New-Item -Path $logPath -ItemType Directory -Force | Out-Null

@"
[2026-02-02 10:00:00] Test log entry
"@ | Set-Content "$logPath\System.log"

# 3. Start API
cd C:\Work\SystemLogAnalyzer\SystemLogAnalyzer
python api_server.py

# In new PowerShell window:
Start-Sleep -Seconds 3

# 4. Test
$diag = Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/logs/diagnose" | ConvertFrom-Json
$diag | ConvertTo-Json -Depth 5
```

## Contact Support

If stuck, provide:
1. [ ] Output from `/api/logs/diagnose` endpoint
2. [ ] Output from `/api/logs/sessions` endpoint
3. [ ] Directory listing: `Get-ChildItem -Recurse "C:\Work\SystemLogAnalyzer\SystemLogAnalyzer\analysis_logs"`
4. [ ] Error message from browser console (F12)

## Success Indicators

- [ ] `/api/logs/diagnose` shows `"exists": true`
- [ ] `/api/logs/diagnose` shows `"user_count": > 0`
- [ ] `/api/logs/sessions` shows `"total_sessions": > 0`
- [ ] Web page at `http://10.148.138.148:31962/` displays log entries
- [ ] "Analyze Logs" button works without error

---

**Total Time: 15-30 minutes**

You got this! 💪
