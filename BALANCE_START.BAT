@echo off
echo Starte Balance App Server...
echo (Bitte dieses Fenster minimieren, aber NICHT schliessen!)

:: 1. Verzeichnis wechseln (falls von Verknuepfung gestartet)
cd /d "%~dp0"

:: 2. Browser verzoegert oeffnen (in 2 Sekunden)
:: Nutzt den Standard-Browser ("start http...") statt hartkodiert Edge
start /b cmd /c "timeout /t 2 >nul && start http://127.0.0.1:8000/Balance.html"

:: 3. Server starten
python -u dev_server.py --port 8000 --bind 127.0.0.1 --directory .

pause
