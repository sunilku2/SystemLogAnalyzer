@echo off
REM Log Analyzer - Start Python API Only

echo ========================================
echo  Starting Python API Server
echo ========================================
echo.

REM Check if already running
curl -s http://localhost:5000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo Python API is already running on port 5000
    echo.
    pause
    exit /b 0
)

echo Starting server on http://localhost:5000
echo Press Ctrl+C to stop the server
echo.

python api_server.py

pause
