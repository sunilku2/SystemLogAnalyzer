@echo off
REM ========================================
REM Log Analyzer - System Diagnostic Script
REM ========================================

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║        LOG ANALYZER SYSTEM DIAGNOSTIC                  ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

REM Check Python
echo [1/6] Checking Python...
python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    python --version
    echo ✓ Python is installed
) else (
    echo ✗ Python NOT found - install Python 3.8 or higher
    set ERROR_FOUND=1
)
echo.

REM Check Virtual Environment
echo [2/6] Checking Virtual Environment...
if exist ".venv\Scripts\python.exe" (
    echo ✓ Virtual environment exists
    .venv\Scripts\python.exe --version
) else (
    echo ✗ Virtual environment NOT found - run setup.bat
    set ERROR_FOUND=1
)
echo.

REM Check Python Packages
echo [3/6] Checking Python Packages...
.venv\Scripts\python.exe -m pip list | findstr /i "flask requests" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✓ Required Python packages installed
    .venv\Scripts\python.exe -m pip list | findstr /i "flask requests"
) else (
    echo ✗ Python packages missing - run: pip install -r requirements.txt
    set ERROR_FOUND=1
)
echo.

REM Check Node.js
echo [4/6] Checking Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    node --version
    echo ✓ Node.js is installed
) else (
    echo ✗ Node.js NOT found - install from https://nodejs.org
    set ERROR_FOUND=1
)
echo.

REM Check .NET SDK
echo [5/6] Checking .NET SDK...
dotnet --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    dotnet --version
    echo ✓ .NET SDK is installed
) else (
    echo ✗ .NET SDK NOT found - install .NET 8.0 or higher
    set ERROR_FOUND=1
)
echo.

REM Check npm packages
echo [6/6] Checking npm packages...
if exist "WebApp\ClientApp\node_modules" (
    echo ✓ npm packages installed
) else (
    echo ✗ npm packages NOT installed - run: cd WebApp\ClientApp ^&^& npm install
    set ERROR_FOUND=1
)
echo.

REM Run Quick Test
echo ════════════════════════════════════════════════════════════
echo Running Quick System Test...
echo ════════════════════════════════════════════════════════════
.venv\Scripts\python.exe test_utils.py test
echo.

REM Final Status
echo ════════════════════════════════════════════════════════════
if defined ERROR_FOUND (
    echo STATUS: ✗ ISSUES FOUND - Review errors above
    echo Run setup.bat to fix missing dependencies
) else (
    echo STATUS: ✓ ALL SYSTEMS OPERATIONAL
    echo Ready to run: start-servers.bat
)
echo ════════════════════════════════════════════════════════════
echo.

pause
