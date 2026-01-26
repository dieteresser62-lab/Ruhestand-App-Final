@echo off
echo Suche nach Geister-Servern auf Port 8000 und 8787...

REM Wir nutzen PowerShell für die Drecksarbeit, weil Batch zu dumm dafür ist.
REM Webserver (Port 8000)
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -gt 4 } | ForEach-Object { Stop-Process -Id $_ -Force; Write-Host 'Webserver-Prozess' $_ 'wurde terminiert.' -ForegroundColor Red }"
REM Yahoo-Proxy (Port 8787)
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8787 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -gt 4 } | ForEach-Object { Stop-Process -Id $_ -Force; Write-Host 'Proxy-Prozess' $_ 'wurde terminiert.' -ForegroundColor Red }"
REM Ghost-Prozesse
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*start_suite.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host 'Ghost-Prozess' $_.ProcessId 'terminiert.' -ForegroundColor Red }"

echo.
echo Alles sauber.
timeout /t 3