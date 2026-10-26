@echo off
title TokenPile - Stream Betting Engine
color 0b
cd /d "%~dp0"

echo ======================================================
echo           TokenPile - Stream Betting Engine           
echo ======================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0c
    echo [ERROR] Node.js is not installed or not in your PATH!
    echo Please install Node.js from https://nodejs.org/ to run TokenPile.
    echo.
    pause
    exit /b 1
)

:: Check if node_modules exists, if not run npm install
if not exist "node_modules\" (
    echo [INFO] Installing project dependencies...
    call npm install
    if errorlevel 1 (
        color 0c
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)

echo [INFO] Launching local dev server and opening browser...
echo Local URL: http://localhost:5173/
echo.
echo Press Ctrl+C in this window to stop the server when finished streaming.
echo.

:: Run dev server and automatically open browser
call npm run dev -- --open

echo.
echo [NOTICE] Server stopped.
pause
