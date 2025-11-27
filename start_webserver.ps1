# In den Ordner des Skripts wechseln
Set-Location -Path $PSScriptRoot

# Port konfigurieren
$port = 8000
$url = "http://localhost:$port/index.html"

# ---------------------------------------------------------
# Automatische Bereinigung von Zombie-Prozessen auf Port 8000
# ---------------------------------------------------------
Write-Host "Prüfe Port $port..."
try {
    # Sucht nach TCP-Verbindungen auf dem Port. ErrorAction Stop wirft Fehler, wenn nichts gefunden wird.
    $tcpConnection = Get-NetTCPConnection -LocalPort $port -ErrorAction Stop
    
    if ($tcpConnection) {
        # Es kann mehrere Einträge geben (z.B. IPv4 und IPv6), wir nehmen den ersten eindeutigen Prozess
        $pidToKill = $tcpConnection.OwningProcess | Select-Object -Unique -First 1
        
        Write-Host "ACHTUNG: Port $port ist belegt durch PID $pidToKill." -ForegroundColor Yellow
        
        $process = Get-Process -Id $pidToKill -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "Beende Prozess '$($process.ProcessName)' ($pidToKill)..." -ForegroundColor Red
            Stop-Process -Id $pidToKill -Force
            Write-Host "Prozess beendet. Port $port ist wieder frei." -ForegroundColor Green
            # Kurze Pause, damit das OS den Port freigeben kann
            Start-Sleep -Seconds 1
        }
    }
}
catch {
    # Fehler wird geworfen, wenn Port NICHT belegt ist (Get-NetTCPConnection findet nichts)
    Write-Host "Port $port ist frei." -ForegroundColor Green
}
# ---------------------------------------------------------

Write-Host "Starte http-server im Ordner:"
Write-Host "  $PSScriptRoot"
Write-Host "Öffne Edge: $url"
Write-Host "Beenden mit STRG+C."
Write-Host ""

# Edge EXPLIZIT starten, egal welcher Standardbrowser gesetzt ist
Start-Process "msedge.exe" $url

# http-server starten und im Fenster behalten
http-server . -p $port
