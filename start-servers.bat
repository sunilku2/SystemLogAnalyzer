@echo off
REM Log Analyzer - Start All Servers
REM This script starts Python API, .NET backend, and React frontend

echo ========================================
echo  Log Analyzer - Starting Services
echo ========================================
echo.

REM Check if Python API is already running
curl -s http://localhost:5000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo Python API is already running on port 5000
) else (
    echo Starting Python API Server (Port 5000)...
    start "Python API Server" cmd /k "python api_server.py"
    timeout /t 3 /nobreak >nul
)

echo.
echo Starting .NET Web Application (Port 5001)...
cd WebApp
start "ASP.NET Core Server" cmd /k "dotnet run"
timeout /t 3 /nobreak >nul

echo.
echo Starting React Development Server (Port 3000)...
cd ClientApp
start "React Dev Server" cmd /k "npm start"

cd ..\..

echo.
echo ========================================
echo  All Services Starting...
echo ========================================
echo.
echo Services will be available at:
echo  - Python API:  http://localhost:5000
echo  - ASP.NET:     https://localhost:5001
echo  - React UI:    http://localhost:3000
echo.
echo The React app should open automatically in your browser.
echo If not, open http://localhost:3000 manually.
echo.
echo Press any key to open the application...
pause >nul

REM Wait a bit for services to start
timeout /t 5 /nobreak >nul

REM Open browser
start http://localhost:3000

echo.
echo To stop all services, close the command windows.
echo.
