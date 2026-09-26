@echo off
REM ============================================================
REM  Kasir Warung Monitoring - Start Script
REM  Starts both backend (API + 5-min sync) and frontend (web UI)
REM ============================================================
title Kasir Warung Monitor

echo ============================================================
echo   Kasir Warung Monitoring System
echo ============================================================
echo.
echo Starting backend (port 3001)...
start "Kasir Monitor - Backend" cmd /k "cd /d %~dp0monitoring-backend && npm start"

echo Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

echo Starting frontend (port 3000)...
start "Kasir Monitor - Frontend" cmd /k "cd /d %~dp0monitoring-frontend && npm run dev"

echo.
echo ============================================================
echo   System starting!
echo.
echo   Web UI:    http://localhost:3000
echo   API:       http://localhost:3001
echo.
echo   Login:     admin / admin123
echo ============================================================
echo.
echo Opening browser in 5 seconds...
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo Done. You can close this window.
pause
