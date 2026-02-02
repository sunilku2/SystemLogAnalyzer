# Exact Commands for Your Deployment

## Your Deployment Details
- **Frontend URL**: `http://your-server:31962/` (or your configured port)
- **API Server Location**: `http://your-server:5000/api` (update to your server address)
- **Solution Directory**: Update paths below to where your solution is deployed

## Step-by-Step Instructions

### 1. Navigate to the React app directory
```powershell
# Replace with your actual solution directory
cd "C:\path\to\solution\WebApp\ClientApp"
# or
cd $env:SOLUTION_DIR\WebApp\ClientApp

### 2. Set the API URL (Windows PowerShell)
```powershell
# Replace with your actual API server address
$env:REACT_APP_API_URL = "http://your-api-server:5000/api"
# Example:
# $env:REACT_APP_API_URL = "http://10.148.138.148:5000/api"
```

### 3. Build the React app
```powershell
npm run build
```

Wait for the build to complete. You should see:
```
npm notice
npm notice
npm notice New major version of npm available! ...
npm notice 
npm notice To update run: npm install -g npm@latest
npm notice
```

And then the build directory info showing the file sizes.

### 4. Verify the build succeeded
Check that the `build` folder exists and contains `index.html`:
```powershell
ls build\
```

You should see:
```
    Directory: path\to\solution\WebApp\ClientApp\build

Mode                 LastWriteTime         Length Name
----                 -----------           ------ ----
d-----         2/2/2026   ...               build              favicon.ico
d-----         2/2/2026   ...                  static             index.html
d-----         2/2/2026   ...                    manifest.json
```

### 5. Deploy the built files
Copy the contents of the `build` folder to your web server.

The deployed files should be served at your configured URL (e.g., `http://your-server:31962/`)

The structure should be:
```
{your-web-root}/
├── index.html
├── favicon.ico
├── manifest.json
└── static/
    ├── css/
    ├── js/
    └── media/
```

### 6. Test the deployment

1. Open your deployed app in a browser (e.g., `http://your-server:31962/`)
2. Press F12 to open DevTools
3. Go to the Admin page
4. In the Network tab (F12), you should see requests being made to:
   - `http://your-server:5000/api/analyzer/status`
   - `http://your-server:5000/api/ollama/status`
   - `http://your-server:5000/api/ollama/check-installed`

If these requests succeed, your setup is correct! ✅

## Troubleshooting

### Problem: "❌ Failed to fetch analyzer status"

**Solution 1: Check if API is running**
```powershell
# Test the API health endpoint (replace with your server address)
$apiServer = "http://your-api-server:5000"
Invoke-WebRequest -Uri "$apiServer/api/health" -UseBasicParsing
```

Expected response: `{"status":"ok"}`

**Solution 2: Check the built app's API URL**
```powershell
# Look at the JavaScript files to verify the API URL is correct
Select-String -Path "build\static\js\*.js" -Pattern "your-api-server"
```

Should find matches showing `http://your-api-server:5000/api`

**Solution 3: Check browser console for errors**
- Open DevTools (F12)
- Go to Console tab
- Look for error messages about CORS or network failures
- The Network tab will show which URLs are being called

### Problem: API URL is still wrong

The API URL is baked into the build when you run `npm run build`. If it's wrong:

1. Delete the build folder: `rm -r build`
2. Set the correct API URL again: `$env:REACT_APP_API_URL = "..."`
3. Rebuild: `npm run build`

## Alternative: Use .env File

Instead of setting the environment variable each time, create `WebApp/ClientApp/.env`:

```env
REACT_APP_API_URL=http://your-api-server:5000/api
```

Then you can just do:
```powershell
npm run build
```

Without needing to set the environment variable.

## Verify Everything Works

After deployment, test each component:

```powershell
# Replace with your actual server addresses
$frontendUrl = "http://your-server:31962/"
$apiUrl = "http://your-server:5000/api/health"

# Test the frontend loads
Invoke-WebRequest -Uri $frontendUrl | Select-Object -ExpandProperty StatusCode
# Should return: 200

# Test the API is reachable
Invoke-WebRequest -Uri $apiUrl | Select-Object -ExpandProperty Content
# Should return: {"status":"ok"}
```

## If You're Using Docker or Kubernetes

If the app is deployed via Docker/Kubernetes, you may need to:

1. Set the environment variable during the build step:
   ```dockerfile
   ENV REACT_APP_API_URL=http://your-api-server:5000/api
   RUN npm run build
   ```

2. Or pass it at runtime if using a build argument:
   ```dockerfile
   ARG REACT_APP_API_URL=http://your-api-server:5000/api
   ENV REACT_APP_API_URL=${REACT_APP_API_URL}
   RUN npm run build
   ```

Then when running the container:
```bash
docker build --build-arg REACT_APP_API_URL=http://10.148.138.148:5000/api -t myapp .
```
