@echo off
REM NurseHelper: app + túnel ngrok (Windows)
cd /d "%~dp0.."
node scripts\tunnel.js %*
if errorlevel 1 exit /b %errorlevel%
