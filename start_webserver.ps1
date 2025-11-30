<#
    Startskript für die Ruhestand-App-Suite (Native .NET Version - Simplified).
    
    Kein Base64-Quatsch mehr, kein zweites Fenster. 
    Einfach nur purer, blockierender Server-Code auf localhost.
#>

$ErrorActionPreference = "Stop"

# --- CONFIG ---
$Port = 8000
$Root = $PSScriptRoot # Das Verzeichnis, in dem das Skript liegt

# --- HELPER ---

function Stop-ProcessesOnPort {
    param([int]$Port)
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    }
    catch { return } 

    if ($connections) {
        $pidsToTerminate = $connections | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -gt 4 }
        foreach ($pidVal in $pidsToTerminate) {
            try { 
                Stop-Process -Id $pidVal -Force -ErrorAction SilentlyContinue
                Write-Host "Habe Prozess $pidVal auf Port $Port ins Jenseits befördert." -ForegroundColor DarkGray
            }
            catch { }
        }
    }
}

function Stop-OldInstances {
    $currentPid = $PID
    try {
        Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*start_webserver.ps1*" -and $_.ProcessId -ne $currentPid } | ForEach-Object {
            try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; Write-Host "Alte Instanz ($($_.ProcessId)) beendet." -ForegroundColor DarkGray } catch {}
        }
    }
    catch {}
}

function Open-WebBrowser {
    param([string]$Url)
    Write-Host "Öffne Browser: $Url" -ForegroundColor Cyan
    try { Start-Process "msedge.exe" $Url -ErrorAction SilentlyContinue }
    catch { Start-Process $Url }
}

# --- MAIN LOGIC ---

# 1. Aufräumen
Write-Host "Räume alte Prozesse auf..." -ForegroundColor Gray
Stop-OldInstances
Stop-ProcessesOnPort -Port $Port

# 2. Listener vorbereiten
$listener = New-Object System.Net.HttpListener
# WICHTIG: "localhost" statt "*" verhindert den "Zugriff verweigert" Fehler!
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    $listener.Start()
    Write-Host "Server läuft auf http://localhost:$Port/" -ForegroundColor Green
    Write-Host "Wurzelverzeichnis: $Root" -ForegroundColor Gray
    Write-Host "Drücke Strg+C um den Server zu stoppen." -ForegroundColor Yellow
}
catch {
    Write-Error "FATAL: Konnte Server nicht starten. Port belegt oder Rechte fehlen."
    Write-Error $_
    # Wir werfen hier raus, damit das CMD-Fenster in den Pause-Block läuft
    exit 1
}

# 3. Browser öffnen (bevor wir in den Loop gehen)
Start-Sleep -Milliseconds 500
Open-WebBrowser -Url "http://localhost:$Port/index.html"

# 4. Der Server-Loop (blockiert das Skript, hält das Fenster offen)
$mimeTypes = @{
    ".html" = "text/html"; ".htm" = "text/html"
    ".js" = "application/javascript"
    ".mjs" = "application/javascript" # Wichtig für ES-Module!
    ".css" = "text/css"
    ".json" = "application/json"
    ".png" = "image/png"; ".jpg" = "image/jpeg"; ".ico" = "image/x-icon"
    ".svg" = "image/svg+xml"
    ".woff" = "font/woff"; ".woff2" = "font/woff2"
}

try {
    while ($listener.IsListening) {
        # Wartet hier auf den nächsten Request
        try {
            $context = $listener.GetContext()
        }
        catch {
            # Wenn der Listener gestoppt wird, wirft GetContext eine Exception
            break
        }
        
        $request = $context.Request
        $response = $context.Response
        
        # URL bereinigen
        $urlPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrEmpty($urlPath)) { $urlPath = "index.html" }
        
        # Sicherheit: Verhindern, dass jemand aus dem Ordner ausbricht (Directory Traversal)
        if ($urlPath -like "*..*") {
            $response.StatusCode = 403
            $response.Close()
            continue
        }

        $localPath = Join-Path $Root $urlPath.Replace("/", "\")
        
        Write-Host "[$($request.HttpMethod)] $urlPath" -NoNewline

        if (Test-Path $localPath -PathType Leaf) {
            try {
                $bytes = [System.IO.File]::ReadAllBytes($localPath)
                $extension = [System.IO.Path]::GetExtension($localPath).ToLower()
                
                if ($mimeTypes.ContainsKey($extension)) {
                    $response.ContentType = $mimeTypes[$extension]
                }
                else {
                    $response.ContentType = "application/octet-stream"
                }
                
                # Anti-Caching Header für Entwicklung (optional, aber nützlich)
                $response.AddHeader("Cache-Control", "no-store, no-cache, must-revalidate")
                
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.StatusCode = 200
                Write-Host " -> OK" -ForegroundColor Green
            }
            catch {
                $response.StatusCode = 500
                Write-Host " -> ERROR" -ForegroundColor Red
            }
        }
        else {
            $response.StatusCode = 404
            Write-Host " -> 404" -ForegroundColor Yellow
        }
        
        $response.Close()
    }
}
finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    $listener.Close()
    Write-Host "Server gestoppt." -ForegroundColor Yellow
}