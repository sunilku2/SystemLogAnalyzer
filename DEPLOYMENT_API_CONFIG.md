# API Configuration for Deployment

This guide explains how to configure the application to work with the Python API server when deployed to different hosts.

## Problem

When you deploy the React application to a different host (e.g., `http://10.148.138.148:31962/`), the frontend cannot communicate with the Python API server unless you properly configure the API URL.

## Solution

The application uses the `REACT_APP_API_URL` environment variable to determine where the API server is located.

### Development Mode (npm start)

In development mode, the React development server proxies API requests to the Python backend. By default, it assumes the Python server is at `http://localhost:5000`.

To use a different API server during development:

```bash
# On Windows (PowerShell)
$env:REACT_APP_API_TARGET = "http://YOUR_API_HOST:PORT"
npm start

# On Windows (Command Prompt)
set REACT_APP_API_TARGET=http://YOUR_API_HOST:PORT
npm start

# On Linux/Mac
REACT_APP_API_TARGET=http://YOUR_API_HOST:PORT npm start
```

Example:
```bash
# PowerShell
$env:REACT_APP_API_TARGET = "http://10.148.138.148:5000"
npm start
```

### Production Build (npm build)

When you build for production (`npm run build`), the proxy middleware is not used. Instead, the app will use `REACT_APP_API_URL` directly.

#### Option 1: Set during build

```bash
# On Windows (PowerShell)
$env:REACT_APP_API_URL = "http://10.148.138.148:5000/api"
npm run build

# On Windows (Command Prompt)
set REACT_APP_API_URL=http://10.148.138.148:5000/api
npm run build

# On Linux/Mac
REACT_APP_API_URL=http://10.148.138.148:5000/api npm run build
```

#### Option 2: Set in .env file (create in ClientApp directory)

Create a `.env` file in `WebApp/ClientApp/.env`:

```env
# Development API URL (used by setupProxy.js)
REACT_APP_API_TARGET=http://localhost:5000

# Production API URL (used in built app)
REACT_APP_API_URL=http://10.148.138.148:5000/api
```

Then build normally:
```bash
npm run build
```

## Understanding the Architecture

### In Development
```
Browser (localhost:3000)
    ↓
React Dev Server (setupProxy.js)
    ↓
Python API Server (http://localhost:5000)
```

The `setupProxy.js` middleware intercepts requests to `/api/*` and forwards them to the Python server.

### In Production
```
Browser (http://10.148.138.148:31962/)
    ↓
.NET Web Server (ports redirected)
    ↓
Python API Server (http://10.148.138.148:5000)
```

The built React app makes direct calls to the `REACT_APP_API_URL`.

## Default Values

- **Development**: `http://localhost:5000` (via `REACT_APP_API_TARGET`)
- **Production**: `/api` (relative path, assumes API is on same host)

## For Your Deployment

Since you're deploying to `http://10.148.138.148:31962/`:

1. **Identify where your Python API server is running**
   - Is it on the same host? (e.g., `http://10.148.138.148:5000`)
   - Is it on a different port on the same host?
   - Is it on a completely different server?

2. **Build the app with the correct API URL**

   If your API is at `http://10.148.138.148:5000`:
   
   ```bash
   $env:REACT_APP_API_URL = "http://10.148.138.148:5000/api"
   npm run build
   ```

3. **Verify the API is accessible**
   
   Test the API endpoint:
   ```bash
   Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/health"
   ```

## Troubleshooting

If you see the error "❌ Failed to fetch analyzer status":

1. **Check browser DevTools (F12)**
   - Look at the Network tab to see which URL is being called
   - Check the Console for error messages

2. **Verify API server is running**
   ```bash
   # Windows
   curl.exe http://10.148.138.148:5000/api/health
   
   # PowerShell
   Invoke-WebRequest -Uri "http://10.148.138.148:5000/api/health"
   ```

3. **Check CORS settings**
   - The Python API has CORS enabled for all origins by default
   - If you're still getting errors, check the Python server logs

4. **Verify the API URL is correct**
   - The app should be making requests to the right host and port
   - Use the browser DevTools Network tab to confirm

## API URL Format

- **With proxy (development)**: `/api` (handled by setupProxy.js)
- **Without proxy (production)**: Full URL with `/api` suffix
  - Example: `http://10.148.138.148:5000/api`
  - NOT: `http://10.148.138.148:5000` (missing `/api`)

## Code Implementation Details

The app uses a `getApiUrl()` helper function in Admin.js that properly constructs API URLs based on the configured base URL. All API calls in Admin.js have been updated to use this function to ensure consistency across different deployment scenarios.

See [Admin.js](WebApp/ClientApp/src/components/Admin.js) for the implementation.
