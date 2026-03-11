@echo off
REM Quick Start Script untuk GSAP Animations Yearbook (Windows)

echo.
echo 🎬 GSAP Animation Setup - Quick Start
echo =====================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    echo ✅ Dependencies installed!
    echo.
)

REM Check if server.js exists
if not exist "server.js" (
    echo ❌ Error: server.js not found!
    exit /b 1
)

echo 🚀 Starting server...
echo.
echo ✅ Server running at: http://47.130.190.120:3000
echo.
echo 📱 Available pages:
echo   - Home:       http://47.130.190.120:3000/beranda.html
echo   - Memories:   http://47.130.190.120:3000/kolase.html
echo   - Teachers:   http://47.130.190.120:3000/wali-kelas.html
echo   - Profile:    http://47.130.190.120:3000/profile.html
echo.
echo 🎨 Animations are powered by GSAP 3.12.2
echo.
echo Press Ctrl+C to stop the server
echo.

call npm start
pause
