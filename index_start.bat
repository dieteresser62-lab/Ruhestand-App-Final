@echo off
echo Starte den Ruhestands-Simulator...
echo (Fenster offen lassen, sonst ist der Server weg!)

:: Wechselt in das Verzeichnis, in dem dieses Skript liegt
cd /d "%~dp0"

:: Öffnet den Browser automatisch mit der funktionierenden IP
start http://127.0.0.1:8000/index.html

:: Startet den Server stur auf IPv4
python -m http.server 8000 --bind 127.0.0.1

pause