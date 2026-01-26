<#
    Startskript fuer die Ruhestand-Suite (Native .NET HttpListener Version)

    Features:
    - Startet Webserver und Yahoo-Proxy gemeinsam
    - Zombie-Prozess-Killer vor dem Start
    - Sauberer HttpListener mit korrektem Shutdown
    - Graceful Exit bei Ctrl+C (beendet beide Prozesse)
    - Directory Traversal Protection
#>

$ErrorActionPreference = "Stop"

# --- CONFIG ---
$Port = 8000
$Root = $PSScriptRoot

# --- MIME TYPES ---
$script:MimeTypes = @{
    ".html"  = "text/html; charset=utf-8"
    ".htm"   = "text/html; charset=utf-8"
    ".js"    = "application/javascript; charset=utf-8"
    ".mjs"   = "application/javascript; charset=utf-8"
    ".css"   = "text/css; charset=utf-8"
    ".json"  = "application/json; charset=utf-8"
    ".png"   = "image/png"
    ".jpg"   = "image/jpeg"
    ".jpeg"  = "image/jpeg"
    ".gif"   = "image/gif"
    ".ico"   = "image/x-icon"
    ".svg"   = "image/svg+xml"
    ".woff"  = "font/woff"
    ".woff2" = "font/woff2"
    ".ttf"   = "font/ttf"
    ".pdf"   = "application/pdf"
}

# --- HELPER FUNCTIONS ---

function Stop-ZombiesOnPort {
    param([int]$TargetPort)
    
    Write-Host "Suche nach Zombies auf Port $TargetPort..." -ForegroundColor Gray
    
    try {
        $connections = Get-NetTCPConnection -LocalPort $TargetPort -ErrorAction SilentlyContinue
    }
    catch { 
        Write-Host "  Keine Untoten gefunden. Gut so." -ForegroundColor DarkGray
        return 
    }

    if ($connections) {
        $pidsToTerminate = $connections | 
        Select-Object -ExpandProperty OwningProcess -Unique | 
        Where-Object { $_ -gt 4 }
        
        foreach ($pidVal in $pidsToTerminate) {
            try { 
                $procName = (Get-Process -Id $pidVal -ErrorAction SilentlyContinue).ProcessName
                Stop-Process -Id $pidVal -Force -ErrorAction Stop
                Write-Host "  Prozess $pidVal ($procName) ins Jenseits befoerdert." -ForegroundColor Yellow
            }
            catch {
                Write-Host "  Prozess $pidVal konnte nicht beendet werden: $_" -ForegroundColor Red
            }
        }
        Start-Sleep -Milliseconds 500
    }
    else {
        Write-Host "  Port ist frei. Kein Exorzismus noetig." -ForegroundColor DarkGray
    }
}

function Open-DefaultBrowser {
    param([string]$Url)
    
    try {
        Start-Process $Url
        Write-Host "Browser geoeffnet: $Url" -ForegroundColor Cyan
    }
    catch {
        Write-Host "Browser konnte nicht geoeffnet werden: $_" -ForegroundColor Yellow
    }
}

function Get-MimeType {
    param([string]$Extension)
    
    if ($script:MimeTypes.ContainsKey($Extension)) {
        return $script:MimeTypes[$Extension]
    }
    return "application/octet-stream"
}

# --- MAIN ---

# 1. Zombies beseitigen (Webserver)
Stop-ZombiesOnPort -TargetPort $Port

# 2. Yahoo-Proxy starten
$ProxyPort = 8787
Stop-ZombiesOnPort -TargetPort $ProxyPort

$proxyProcess = $null
$proxyScript = Join-Path $Root "tools\yahoo-proxy.cjs"

if (Test-Path $proxyScript) {
    Write-Host "Starte Yahoo-Proxy auf Port $ProxyPort..." -ForegroundColor Gray
    try {
        $proxyProcess = Start-Process -FilePath "node" -ArgumentList "`"$proxyScript`"" -PassThru -WindowStyle Minimized -ErrorAction Stop
        Start-Sleep -Milliseconds 500
        if ($proxyProcess -and !$proxyProcess.HasExited) {
            Write-Host "  Yahoo-Proxy gestartet (PID: $($proxyProcess.Id))" -ForegroundColor DarkGray
        } else {
            Write-Host "  Yahoo-Proxy konnte nicht gestartet werden (Node.js installiert?)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  Yahoo-Proxy Start fehlgeschlagen: $_" -ForegroundColor Yellow
        Write-Host "  (Online-Kurse nicht verfuegbar, App funktioniert trotzdem)" -ForegroundColor DarkGray
    }
} else {
    Write-Host "Yahoo-Proxy nicht gefunden, ueberspringe..." -ForegroundColor DarkGray
}

# 4. HttpListener erstellen
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    # 5. Server starten
    $listener.Start()
    
    Write-Host ""
    Write-Host "=========================================================" -ForegroundColor Green
    Write-Host "  Ruhestand-App Server laeuft auf http://localhost:$Port/" -ForegroundColor Green
    Write-Host "=========================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Wurzelverzeichnis: $Root" -ForegroundColor Gray
    Write-Host "Druecke Ctrl+C um den Server zu stoppen." -ForegroundColor Yellow
    Write-Host ""

    # 6. Browser oeffnen
    Start-Sleep -Milliseconds 300
    Open-DefaultBrowser -Url "http://localhost:$Port/index.html"

    # 7. Request-Loop
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
        }
        catch [System.Net.HttpListenerException] {
            break
        }
        
        $request = $context.Request
        $response = $context.Response
        
        try {
            $urlPath = $request.Url.LocalPath.TrimStart('/')
            if ([string]::IsNullOrEmpty($urlPath)) { 
                $urlPath = "index.html" 
            }
            
            # Sicherheit: Directory Traversal verhindern
            if ($urlPath -match '\.\.' -or $urlPath -match '^/' -or $urlPath -match '^\\') {
                Write-Host "[$($request.HttpMethod)] $urlPath -> 403 FORBIDDEN" -ForegroundColor Red
                $response.StatusCode = 403
                $response.Close()
                continue
            }
            
            $localPath = Join-Path $Root $urlPath.Replace("/", "\")
            
            # Zusaetzliche Pruefung: Liegt die Datei wirklich unter Root?
            $resolvedPath = [System.IO.Path]::GetFullPath($localPath)
            $resolvedRoot = [System.IO.Path]::GetFullPath($Root)
            if (-not $resolvedPath.StartsWith($resolvedRoot, [StringComparison]::OrdinalIgnoreCase)) {
                Write-Host "[$($request.HttpMethod)] $urlPath -> 403 ESCAPE ATTEMPT" -ForegroundColor Red
                $response.StatusCode = 403
                $response.Close()
                continue
            }
            
            Write-Host "[$($request.HttpMethod)] $urlPath" -NoNewline
            
            if (Test-Path $localPath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($localPath)
                $extension = [System.IO.Path]::GetExtension($localPath).ToLower()
                
                $response.ContentType = Get-MimeType -Extension $extension
                $response.AddHeader("Cache-Control", "no-store, no-cache, must-revalidate")
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.StatusCode = 200
                
                $size = $bytes.Length
                Write-Host " -> 200 OK ($size bytes)" -ForegroundColor Green
            }
            else {
                $response.StatusCode = 404
                Write-Host " -> 404 NOT FOUND" -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host " -> 500 ERROR: $_" -ForegroundColor Red
            $response.StatusCode = 500
        }
        finally {
            $response.Close()
        }
    }
}
catch {
    Write-Error "FATAL: Server konnte nicht gestartet werden."
    Write-Error $_.Exception.Message
    exit 1
}
finally {
    Write-Host ""
    Write-Host "Suite wird beendet..." -ForegroundColor Yellow

    # Yahoo-Proxy beenden
    if ($proxyProcess -and !$proxyProcess.HasExited) {
        try {
            Stop-Process -Id $proxyProcess.Id -Force -ErrorAction Stop
            Write-Host "Yahoo-Proxy beendet." -ForegroundColor Green
        } catch {
            Write-Host "Yahoo-Proxy konnte nicht beendet werden: $_" -ForegroundColor Yellow
        }
    }

    # HttpListener beenden
    if ($listener) {
        if ($listener.IsListening) {
            $listener.Stop()
        }
        $listener.Dispose()
        Write-Host "HttpListener sauber beendet." -ForegroundColor Green
    }
}