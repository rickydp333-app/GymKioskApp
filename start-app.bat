@echo off
REM GymKiosk App Launcher
title GymKiosk Launcher
cd /d "%~dp0"
echo.
echo Starting GymKiosk App...
echo Launching server and kiosk interface...
echo.
npm start
pause
