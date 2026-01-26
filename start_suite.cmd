@echo off
REM Startet die Ruhestand-Suite (Webserver + Yahoo-Proxy fuer Online-Kurse).
REM Dieses Wrapper-Skript delegiert die eigentliche Logik an start_webserver.ps1.
REM Aus Sicherheitsgründen nutzen wir ExecutionPolicy RemoteSigned statt Bypass.

setlocal
set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%start_suite.ps1"

powershell.exe -NoLogo -NoProfile -ExecutionPolicy RemoteSigned -File "%PS_SCRIPT%"
set "EXIT_CODE=%ERRORLEVEL%"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Ein Fehler ist aufgetreten. Das Fenster bleibt offen, damit du die Meldung lesen kannst.
    pause
) else (
    echo.
    echo Suite gestartet. Dieses Fenster kann geschlossen werden.
    timeout /t 5
)
endlocal & exit /b %EXIT_CODE%
