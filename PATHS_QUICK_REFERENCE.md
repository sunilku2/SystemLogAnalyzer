# Quick Reference: Dynamic Paths in System Log Analyzer

## TL;DR - It Just Works!

The solution automatically uses dynamic paths. **No configuration needed** to deploy it anywhere.

```powershell
# 1. Navigate anywhere
cd "C:\any\location\you\want"

# 2. Start the API (logs directory auto-detected)
python api_server.py
# Logs go to: C:\any\location\you\want\analysis_logs

# 3. Build frontend with your API server
$env:REACT_APP_API_URL = "http://your-server:5000/api"
npm run build
```

## Key Files

| File | Purpose | Notes |
|------|---------|-------|
| [config.py](config.py) | Central configuration | Uses `BASE_DIR` for automatic path detection |
| [api_server.py](api_server.py) | Backend API | Reads `LOGS_DIR` from config |
| [Admin.js](WebApp/ClientApp/src/components/Admin.js) | Frontend settings | Uses `getApiUrl()` helper |
| [setupProxy.js](WebApp/ClientApp/src/setupProxy.js) | Dev proxy | Uses `REACT_APP_API_TARGET` env var |

## Deployment Quick Start

### Local Development
```powershell
cd SystemLogAnalyzer
python api_server.py  # API at http://localhost:5000

cd WebApp/ClientApp
npm start  # Frontend at http://localhost:3000
```

### Remote Deployment
```powershell
# On API server
cd "path\to\solution"
python api_server.py

# On frontend server (or same server)
$env:REACT_APP_API_URL = "http://api-server:5000/api"
npm run build
# Deploy build/ folder to your web server
```

## Environment Variables

| Variable | When Used | Example |
|----------|-----------|---------|
| `REACT_APP_API_URL` | Building frontend for production | `http://10.10.1.100:5000/api` |
| `REACT_APP_API_TARGET` | Dev proxy (npm start) | `http://localhost:5000` |
| `LOG_ANALYZER_LOGS_DIR` | Custom logs location | `D:\LogRepository\analysis_logs` |

## Verify It's Working

```powershell
# Test API
Invoke-WebRequest -Uri "http://your-server:5000/api/health"
# Should return: {"status":"ok"}

# Test logs location
$diag = Invoke-WebRequest -Uri "http://your-server:5000/api/logs/diagnose" | ConvertFrom-Json
$diag.absolute_path
# Should show where logs are stored
```

## Common Scenarios

### Scenario 1: Single Machine Development
```powershell
cd C:\Projects\SystemLogAnalyzer
python api_server.py                    # Logs: C:\Projects\SystemLogAnalyzer\analysis_logs
# In another terminal:
npm start                               # Frontend: http://localhost:3000
```

### Scenario 2: Different Servers
```powershell
# Server A (10.10.1.100) - API
cd D:\Services\Analyzer
python api_server.py                    # Logs: D:\Services\Analyzer\analysis_logs

# Server B (10.10.1.200) - Frontend
$env:REACT_APP_API_URL = "http://10.10.1.100:5000/api"
npm run build
# Deploy build/ folder to IIS/nginx/Apache
```

### Scenario 3: Custom Logs Directory
```powershell
# Modify config.py first
LOGS_DIR = "D:\CentralLogRepo\analysis_logs"

# Then start
cd "wherever\solution\is"
python api_server.py                    # Logs: D:\CentralLogRepo\analysis_logs
```

## Troubleshooting

| Problem | Check | Solution |
|---------|-------|----------|
| Logs not found | `GET /api/logs/diagnose` | Create the directory shown in response |
| Frontend can't reach API | Browser console (F12) | Verify `REACT_APP_API_URL` matches running server |
| Wrong logs location | Check diagnostic path | Set `LOG_ANALYZER_LOGS_DIR` or edit config.py |

## Architecture

```
┌─ Solution Directory (any location)
│  ├─ config.py ─► BASE_DIR (detected automatically)
│  ├─ api_server.py ─► Reads LOGS_DIR from config
│  ├─ analysis_logs/ ─► {BASE_DIR}/analysis_logs
│  │  └─ {user_id}/{system_name}/{timestamp}/
│  └─ WebApp/ClientApp/
│     ├─ setupProxy.js ─► env:REACT_APP_API_TARGET
│     └─ src/api.js ─► env:REACT_APP_API_URL
```

## The Core Pattern

```python
# Python Backend
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # Auto-detect
LOGS_DIR = os.path.join(BASE_DIR, "analysis_logs")     # Relative to BASE_DIR
```

```javascript
// React Frontend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
function getApiUrl(endpoint) {
  return API_BASE_URL + endpoint  // Always uses correct server
}
```

## No Hardcoded Paths!

✅ Code uses `BASE_DIR` - works anywhere  
✅ Frontend uses env vars - works for any server  
✅ Documentation uses placeholders - no edits needed  
✅ Logs path is relative - moves with installation  

## For Detailed Info

- [PATH_CONFIGURATION_GUIDE.md](PATH_CONFIGURATION_GUIDE.md) - Complete path guide
- [DEPLOYMENT_COMMANDS.md](DEPLOYMENT_COMMANDS.md) - Exact commands
- [TROUBLESHOOTING_NO_LOGS.md](TROUBLESHOOTING_NO_LOGS.md) - Diagnosis guide
