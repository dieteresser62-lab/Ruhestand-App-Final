@echo off
REM Startet die Ruhestand-App-Suite über den Node.js-basierten http-server.
REM Dieses Wrapper-Skript delegiert die eigentliche Logik an start_webserver.ps1.
REM Aus Sicherheitsgründen nutzen wir ExecutionPolicy RemoteSigned statt Bypass.

setlocal
set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%start_webserver.ps1"

powershell.exe -NoLogo -NoProfile -ExecutionPolicy RemoteSigned -File "%PS_SCRIPT%"
set "EXIT_CODE=%ERRORLEVEL%"
endlocal & exit /b %EXIT_CODE%
