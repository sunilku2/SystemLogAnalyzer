# Path Configuration Guide - Dynamic Paths

## Overview

All paths in the System Log Analyzer are **automatically dynamic** and relative to the solution directory. This means the application works correctly regardless of where it's deployed.

## How Dynamic Paths Work

### Python Backend (api_server.py & config.py)

The Python backend automatically detects the solution directory:

```python
# In config.py
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOGS_DIR = os.path.join(BASE_DIR, "analysis_logs")
```

This means:
- If the solution is at `C:\Deploy\SystemLogAnalyzer\`, then `LOGS_DIR` = `C:\Deploy\SystemLogAnalyzer\analysis_logs`
- If the solution is at `D:\Apps\Analyzer\`, then `LOGS_DIR` = `D:\Apps\Analyzer\analysis_logs`
- If the solution is at `/opt/analyzer/`, then `LOGS_DIR` = `/opt/analyzer/analysis_logs`

**No code changes needed** - the paths automatically adapt to the installation location.

### React Frontend (setupProxy.js & api.js)

The React frontend uses environment variables for API connectivity:

```javascript
// In api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api'

// In setupProxy.js (development)
const target = process.env.REACT_APP_API_TARGET || 'http://localhost:5000'
```

This means:
- **Development**: Uses `http://localhost:5000` by default
- **Production**: Uses `REACT_APP_API_URL` environment variable
- **Remote Deployment**: Automatically uses the correct server address via `getApiUrl()` helper

## Deployment Scenarios

### Scenario 1: Local Development (Same Machine)

```powershell
# Navigate to solution directory
cd C:\Work\SystemLogAnalyzer\SystemLogAnalyzer

# Start the API (automatically uses C:\Work\SystemLogAnalyzer\SystemLogAnalyzer\analysis_logs)
python api_server.py

# In another terminal, start the React app
cd WebApp\ClientApp
npm start
# Frontend at http://localhost:3000
# API at http://localhost:5000 (automatic)
```

**Paths used:**
- Logs: `C:\Work\SystemLogAnalyzer\SystemLogAnalyzer\analysis_logs` ✅
- API: `http://localhost:5000` ✅
- Frontend: `http://localhost:3000` ✅

### Scenario 2: Remote Server - API and Frontend Same Host

```powershell
# On the server, navigate to solution directory
cd "D:\Applications\SystemLogAnalyzer"

# Start API (automatically uses D:\Applications\SystemLogAnalyzer\analysis_logs)
python api_server.py

# Build React app with API URL pointing to same server
$env:REACT_APP_API_URL = "http://your-server-ip:5000/api"
cd WebApp\ClientApp
npm run build

# Copy build/ files to web server (IIS, nginx, Apache, etc.)
# Frontend served at http://your-server-ip/
```

**Paths used:**
- Logs: `D:\Applications\SystemLogAnalyzer\analysis_logs` ✅
- API: `http://your-server-ip:5000` ✅
- Frontend: `http://your-server-ip` ✅

### Scenario 3: Remote Server - API and Frontend Different Hosts

```powershell
# API Server (e.g., 10.10.1.100)
cd "E:\Services\LogAnalyzer"
python api_server.py
# Logs automatically at: E:\Services\LogAnalyzer\analysis_logs

# Frontend Server (e.g., 10.10.1.200)
$env:REACT_APP_API_URL = "http://10.10.1.100:5000/api"
cd WebApp\ClientApp
npm run build
# Deploy to web server
# Access at http://10.10.1.200/analyzer
```

**Paths used:**
- Logs: `E:\Services\LogAnalyzer\analysis_logs` ✅
- API: `http://10.10.1.100:5000` ✅
- Frontend: `http://10.10.1.200/analyzer` ✅

### Scenario 4: Containerized (Docker/Kubernetes)

```dockerfile
FROM python:3.9
WORKDIR /app
COPY . .
# Logs directory is automatically: /app/analysis_logs

# For frontend
FROM node:16
WORKDIR /app/WebApp/ClientApp
COPY . .
ARG REACT_APP_API_URL=http://api-service:5000/api
RUN npm run build
# Frontend served with hardcoded API URL from build time
```

**Paths used:**
- Logs: `/app/analysis_logs` ✅
- API: `http://api-service:5000` ✅ (service discovery)
- Frontend: `http://app-service` ✅ (service discovery)

## Custom Logs Directory (Optional)

If you want to use a logs directory outside the solution directory:

### Option 1: Environment Variable

```powershell
# Set before running the API
$env:LOG_ANALYZER_LOGS_DIR = "D:\LogRepository\analysis_logs"
python api_server.py
```

**Note:** You need to modify `config.py` first to support this:

```python
# In config.py
LOGS_DIR = os.environ.get('LOG_ANALYZER_LOGS_DIR', os.path.join(BASE_DIR, "analysis_logs"))
```

### Option 2: Edit config.py

```python
# In config.py - change this line to absolute path
LOGS_DIR = "D:\LogRepository\analysis_logs"  # Or use os.environ.get()

# Or use environment variable
LOGS_DIR = os.environ.get('LOG_ANALYZER_LOGS_DIR', "D:\LogRepository\analysis_logs")
```

Then restart the API:
```powershell
python api_server.py
```

## Verifying Your Paths Are Correct

### Check Logs Directory

```powershell
# Call the diagnostic endpoint
$apiServer = "http://your-api-server:5000"
$diag = Invoke-WebRequest -Uri "$apiServer/api/logs/diagnose" | ConvertFrom-Json

# Display the configured path
Write-Host "Configured logs directory: $($diag.logs_dir)"
Write-Host "Absolute path: $($diag.absolute_path)"
Write-Host "Directory exists: $($diag.exists)"
```

### Check Frontend API URL

```powershell
# Look at network requests in browser DevTools (F12)
# Requests should go to your configured API server
# Example: GET http://your-server:5000/api/logs/sessions
```

## Common Path Issues & Solutions

### Issue: Logs directory not found

**Symptom:** Diagnostic shows `"exists": false`

**Solution:** Create the directory where the API expects it:
```powershell
$apiServer = "http://your-api-server:5000"
$diag = Invoke-WebRequest -Uri "$apiServer/api/logs/diagnose" | ConvertFrom-Json
$correctPath = $diag.absolute_path
New-Item -Path $correctPath -ItemType Directory -Force
```

### Issue: Logs exist but API can't find them

**Symptom:** Directory exists but "user_count" is 0

**Solution:** Check directory structure matches expected format:
```
{LOGS_DIR}/
└── {USER_ID}/
    └── {SYSTEM_NAME}/
        └── {TIMESTAMP}/
            └── {LOG_FILES}
```

### Issue: Frontend can't reach API

**Symptom:** Browser console shows "Failed to fetch"

**Solution:** Verify the API URL:
```powershell
# Check if API is running
Invoke-WebRequest -Uri "http://your-api-server:5000/api/health"

# Verify frontend has correct API URL
# In browser DevTools Network tab, should see requests to correct server
```

## Best Practices

1. **Keep logs in solution directory** - Simplest deployment
   ```
   {solution_dir}/analysis_logs/
   ```

2. **Use relative paths in documentation** - When giving examples, use:
   ```
   {solution_directory}/analysis_logs/
   {solution_directory}/WebApp/
   ```

3. **Set API URL via environment variable** - Don't hardcode:
   ```powershell
   $env:REACT_APP_API_URL = "http://your-server:5000/api"
   npm run build
   ```

4. **Test with diagnostic endpoint** - Always verify:
   ```powershell
   Invoke-WebRequest -Uri "{api}/logs/diagnose" | ConvertFrom-Json
   ```

5. **Document your deployment** - Note where you deployed:
   - Solution directory location
   - API server address
   - Frontend server address

## Environment Variables Summary

| Variable | Usage | Default | Required |
|----------|-------|---------|----------|
| `REACT_APP_API_URL` | Frontend API endpoint (production) | `http://localhost:5000/api` | No (dev) / Yes (prod) |
| `REACT_APP_API_TARGET` | Dev proxy target | `http://localhost:5000` | No |
| `LOG_ANALYZER_LOGS_DIR` | Custom logs directory | `{BASE_DIR}/analysis_logs` | No |

## Diagram: How Paths Flow

```
┌─────────────────────────────────────────────┐
│     Solution Directory (Any Location)       │
│  C:\Deploy\, D:\Apps\, /opt/, etc.         │
└────────────────┬────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    v                         v
┌─────────────┐        ┌────────────────┐
│ api_server  │        │  config.py     │
│             │        │                │
│ BASE_DIR ───────────►│  LOGS_DIR      │
│ (auto-     │        │  (auto-        │
│  detected) │        │   calculated)  │
└─────────────┘        └────────────────┘
    │                         │
    │                         v
    │                  ┌──────────────────┐
    │                  │  analysis_logs/  │
    │                  │  ├── user-id/    │
    │                  │  │  └── sys-name/│
    │                  │  │     └── TS/   │
    │                  │  └── ...         │
    │                  └──────────────────┘
    │
    v
┌──────────────┐      Environment Variable
│  Frontend    │    ┌──────────────────────┐
│  (React)     │───►│ REACT_APP_API_URL    │
│              │    │ (points to API)      │
│ setupProxy ──┼───►└──────────────────────┘
│ getApiUrl()  │
└──────────────┘
```

## For More Help

- See [TROUBLESHOOTING_NO_LOGS.md](TROUBLESHOOTING_NO_LOGS.md) for diagnostic issues
- See [FIX_NO_LOGS_DEPLOYED.md](FIX_NO_LOGS_DEPLOYED.md) for deployment problems
- See [DEPLOYMENT_COMMANDS.md](DEPLOYMENT_COMMANDS.md) for exact commands
