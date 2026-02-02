@echo off
REM Log Analyzer - Complete Setup Script
REM This script sets up both Python API and .NET Web Application

echo ========================================
echo  Log Analyzer - Complete Setup
echo ========================================
echo.

REM Step 1: Setup Python Environment
echo [1/4] Setting up Python environment...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Please install Python 3.8+ first.
    pause
    exit /b 1
)

echo Installing Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Checking .NET SDK...
dotnet --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: .NET SDK not found. Please install .NET 8.0 SDK first.
    pause
    exit /b 1
)

echo.
echo [3/4] Setting up React frontend...
cd WebApp\ClientApp
if not exist node_modules (
    echo Installing npm packages (this may take a few minutes)...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install npm packages
        pause
        exit /b 1
    )
) else (
    echo npm packages already installed
)

cd ..\..

echo.
echo [4/4] Checking Ollama installation...
ollama --version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Ollama not found. LLM features will not work.
    echo Please install from: https://ollama.com/download
    echo.
    echo You can still run without LLM (pattern-based analysis)
) else (
    echo Ollama detected. Checking for models...
    ollama list | findstr llama3.2 >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo No LLM models found. Downloading llama3.2:3b (recommended)...
        echo This may take several minutes depending on your internet speed...
        ollama pull llama3.2:3b
    ) else (
        echo LLM models found!
    )
)

echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Next steps:
echo  1. Run start-servers.bat to start all services
echo  2. Open http://localhost:3000 in your browser
echo  3. Navigate to "Run Analysis" and start analyzing logs
echo.
pause
