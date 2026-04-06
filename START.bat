@echo off
title Consumption Report - Starting Servers
color 0A

echo ============================================
echo   CONSUMPTION REPORTING SYSTEM
echo   Starting Backend + Frontend...
echo ============================================
echo.

:: Kill any old running instances first
echo [1/3] Clearing old processes...
taskkill /F /IM python.exe /T >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 1 /nobreak >nul

:: Start Backend in a new window
echo [2/3] Starting Backend API (port 8014)...
start "Backend API" cmd /k "cd /d D:\CONSUMPTION REPORT\backend && python test_refresh_8014.py"

:: Wait for backend to initialise
timeout /t 4 /nobreak >nul

:: Start Frontend in a new window
echo [3/3] Starting Frontend (port 5173)...
start "Frontend" cmd /k "cd /d D:\CONSUMPTION REPORT\frontend && npm run dev"

:: Wait for Vite to spin up
timeout /t 4 /nobreak >nul

:: Open browser
echo.
echo ============================================
echo   Opening http://localhost:5173
echo ============================================
start "" "http://localhost:5173"

echo.
echo Both servers are running in their own windows.
echo Close those windows to shut down the system.
echo.
pause
