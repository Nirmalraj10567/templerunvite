@echo off
echo ========================================
echo Daybook Test Runner
echo ========================================
echo.

REM Check if server is running
echo Checking if server is running on port 4000...
netstat -ano | findstr :4000 >nul
if %errorlevel% neq 0 (
    echo WARNING: Server does not appear to be running on port 4000
    echo Please start the server first with: npm run dev
    echo.
    pause
    exit /b 1
)

echo Server detected on port 4000
echo.
echo Running daybook tests...
echo ========================================
echo.

node daybook.test.js

echo.
echo ========================================
echo Tests completed
echo ========================================
pause
