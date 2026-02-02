# Quick Setup for Your Deployment

Your app is deployed at: `http://10.148.138.148:31962/`

## What You Need to Do

### Step 1: Identify Your API Server Location

First, figure out where your Python API server is running. It should be reachable at one of these:
- `http://10.148.138.148:5000` (same host, port 5000)
- `http://[other-host]:5000` (different host)
- `http://localhost:5000` (if you're running locally during testing)

Test it:
```powershell
Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/health"
```

If this works and returns JSON, your API URL is: `http://10.148.138.148:5000/api`

### Step 2: Rebuild the React App with the Correct API URL

Navigate to the ClientApp directory:
```bash
cd WebApp\ClientApp
```

Set the API URL and build:
```powershell
# Windows PowerShell
$env:REACT_APP_API_URL = "http://10.148.138.148:5000/api"
npm run build
```

Or on Windows Command Prompt:
```cmd
set REACT_APP_API_URL=http://10.148.138.148:5000/api
npm run build
```

### Step 3: Deploy the Built App

After the build completes, the built files are in `WebApp/ClientApp/build/`. Deploy these files to your web server.

## Alternatively: Create a .env File

Instead of setting the environment variable each time, create a `.env` file in `WebApp/ClientApp/`:

```
REACT_APP_API_URL=http://10.148.138.148:5000/api
```

Then just run `npm run build` without setting environment variables.

## Verification

After deployment, check that:

1. The frontend loads at `http://10.148.138.148:31962/`
2. Open DevTools (F12) → Network tab
3. Click on the Admin section
4. You should see API requests being made to `http://10.148.138.148:5000/api/...`

## If Still Getting Errors

1. **Check the Python API is running**
   ```powershell
   Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/health"
   ```

2. **Check browser console (F12)**
   - Look for specific error messages
   - Check which URL is being requested

3. **Check that the API URL doesn't have trailing slashes**
   - ✅ Correct: `http://10.148.138.148:5000/api`
   - ❌ Wrong: `http://10.148.138.148:5000/api/`
   - ❌ Wrong: `http://10.148.138.148:5000`

## Environment Variable Options

### For Development (npm start)
Use `REACT_APP_API_TARGET` if you want to test with a different API server:
```powershell
$env:REACT_APP_API_TARGET = "http://10.148.138.148:5000"
npm start
```

### For Production (npm build)
Use `REACT_APP_API_URL`:
```powershell
$env:REACT_APP_API_URL = "http://10.148.138.148:5000/api"
npm run build
```

## Full Documentation

See [DEPLOYMENT_API_CONFIG.md](DEPLOYMENT_API_CONFIG.md) for complete details about API configuration.
