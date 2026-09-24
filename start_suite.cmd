@echo off
REM Startet die Ruhestand-Suite im Browser: lokaler Webserver (Port 8000) plus
REM Yahoo-Proxy fuer Online-Kurse (Port 8787), beide in einem Node.js-Prozess.
REM Beenden mit Strg+C oder durch Schliessen dieses Fensters.

setlocal
where node >nul 2>nul
if errorlevel 1 (
    echo Node.js wurde nicht gefunden. Bitte Node.js installieren: https://nodejs.org/
    pause
    exit /b 1
)

node "%~dp0scripts\serve.mjs" --open
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
    echo.
    echo Ein Fehler ist aufgetreten. Das Fenster bleibt offen, damit du die Meldung lesen kannst.
    pause
)
endlocal & exit /b %EXIT_CODE%
