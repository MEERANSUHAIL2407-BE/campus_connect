@echo off
TITLE Campus Connect - College Management System
COLOR 0B

echo ==============================================================================
echo                      CAMPUS CONNECT - STARTUP SCRIPT
echo ==============================================================================
echo.

:: 1. Navigate to script directory
cd /d "%~dp0"

:: 2. Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    COLOR 0C
    echo [ERROR] Node.js is not found on your system!
    echo Please download and install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 3. Check if .env file exists
if not exist ".env" (
    echo [INFO] .env file not found. Creating from .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [SUCCESS] Created .env file.
    ) else (
        echo PORT=5000 > .env
        echo MONGO_URI=mongodb+srv://admin:admin123@cluster0.mongodb.net/campus_connect?retryWrites=true^&w=majority >> .env
        echo JWT_SECRET=campus_connect_super_secure_jwt_secret_key_2026 >> .env
        echo [SUCCESS] Generated default .env file.
    )
    echo [REMINDER] Make sure to put your actual MongoDB Atlas connection string in .env!
    echo.
)

:: 4. Check if dependencies are installed
if not exist "node_modules\" (
    echo [INFO] Installing required packages... This may take a moment on the first run.
    call npm install
    echo.
)

:: 5. Open browser in the background after 2 seconds
start "" powershell -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:5000'"

:: 6. Start the server (foreground)
echo.
echo ==============================================================================
echo [STARTING] Starting Campus Connect on http://localhost:5000 ...
echo [NOTE] Keep this window open while using the application.
echo ==============================================================================
echo.

node server.js

pause
