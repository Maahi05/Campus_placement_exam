@echo off
title Campus Placement Examination Portal
echo ================================================================
echo    CAMPUS PLACEMENT ONLINE EXAMINATION PORTAL
echo    Proctored Tests | PDF Question Parser | Auto-Submit Timers
echo ================================================================
echo.
cd /d "%~dp0"

echo [1/3] Checking environment...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH! Please install Node.js.
    pause
    exit /b 1
)

echo [2/3] Starting Server and Application...
echo The portal is opening at: http://localhost:5000
echo (Press Ctrl+C in this window to stop the server)
echo.

start "" "http://localhost:5000"
node server/src/index.js
pause
