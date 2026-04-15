@echo off
echo ============================================================
echo DAYBOOK LOGIN STATUS CHECK
echo ============================================================
echo.

echo 1. Checking if backend server is running on port 4000...
netstat -ano | findstr :4000 >nul
if %errorlevel% neq 0 (
    echo    [WARNING] Backend server is NOT running on port 4000!
    echo    Start it with: npm run dev
    echo.
    pause
    exit /b 1
) else (
    echo    [OK] Backend server is running
)

echo.
echo 2. Testing login endpoint...
echo.

node verify-login.js

echo.
echo ============================================================
echo STATUS CHECK COMPLETE
echo ============================================================
echo.
echo If you see "LOGIN SUCCESSFUL" above, you can now:
echo   1. Open your frontend at http://localhost:8080 or http://localhost:5173
echo   2. Login with: test_admin / test123
echo   3. Access Daybook from the sidebar
echo.
pause
