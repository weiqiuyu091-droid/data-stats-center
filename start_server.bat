@echo off
title Data Center Server - Start
cd /d "%~dp0"

rem ========== Admin password (change it!) ==========
set ADMIN_PW=lnm010530

rem ========== Rental control: 0=off 1=on ==========
set AUTH_ENABLED=1

rem ========== Storage: json or sqlite ==========
set AUTH_STORE=json

echo.
echo  ==========================================
echo   Data Center starting...
echo   Admin:   http://localhost:3456/admin
echo   Password: %ADMIN_PW%
echo   AUTH:    %AUTH_ENABLED% (0=off 1=on)
echo   Close this window to stop server
echo  ==========================================
echo.

start http://localhost:3456/admin
node server.js
pause
