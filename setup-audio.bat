@echo off
REM Audio Setup Script for Windows
REM This script installs all dependencies needed for audio feature

echo ========================================
echo    Audio Feature Setup for Yearbook 2026
echo ========================================
echo.

REM Check if Python is installed
echo Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

echo Python found!
echo.

REM Install yt-dlp
echo Installing yt-dlp...
pip install --upgrade yt-dlp
if %errorlevel% neq 0 (
    echo ERROR: Failed to install yt-dlp
    pause
    exit /b 1
)

echo yt-dlp installed successfully!
echo.

REM Check FFmpeg
echo Checking FFmpeg installation...
ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: FFmpeg is not installed or not in PATH
    echo FFmpeg is REQUIRED to convert audio formats
    echo.
    echo Attempting automatic installation...
    echo.
    
    REM Try Chocolatey
    choco --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo Chocolatey found! Installing FFmpeg...
        choco install ffmpeg -y
        if %errorlevel% equ 0 (
            echo FFmpeg installed successfully!
            ffmpeg -version | find "ffmpeg" > nul
            if %errorlevel% equ 0 (
                goto ffmpeg_success
            )
        )
    )
    
    REM Chocolatey failed or not installed
    echo.
    echo Automatic installation not available. Please install manually:
    echo.
    echo Option 1: Using Chocolatey (Admin Terminal)
    echo    choco install ffmpeg
    echo.
    echo Option 2: Download from official source
    echo    Visit: https://ffmpeg.org/download.html
    echo    Extract to a folder (e.g., C:\ffmpeg)
    echo    Add C:\ffmpeg\bin to Windows PATH
    echo.
    echo Option 3: Using Scoop
    echo    scoop install ffmpeg
    echo.
    echo After installing FFmpeg:
    echo    1. Restart this terminal
    echo    2. Run this script again
    echo    3. Or manually run: npm install
    echo.
    pause
    exit /b 1
)

:ffmpeg_success
echo FFmpeg found!
echo.

echo ========================================
echo       Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Run "npm install" to install Node dependencies
echo 2. Start the server with "npm start"
echo 3. Open http://47.130.190.120:3000 in your browser
echo.
pause

