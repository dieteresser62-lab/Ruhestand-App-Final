@echo off
echo Starte Server... und wecke den RAM-Fresser Chrome...
echo (Fenster offen lassen, sonst ist der Server weg!)

:: 1. Verzeichnis wechseln
cd /d "%~dp0"

:: 2. Chrome explizit starten
:: Der erste leere String "" ist wichtig, sonst denkt Windows, der Pfad ist der Fenstertitel.
:: Pfad ist Standard-Windows. Falls dein Chrome woanders liegt, musst du den Pfad anpassen.
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" http://127.0.0.1:8000/index.html

:: 3. Server starten (stur auf IPv4)
python -m http.server 8000 --bind 127.0.0.1

pause