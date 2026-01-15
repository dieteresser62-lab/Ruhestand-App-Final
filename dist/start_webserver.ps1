<#
    Startskript fuer die Ruhestand-App-Suite (Native .NET HttpListener Version)
    
    Features:
    - Zombie-Prozess-Killer vor dem Start
    - Sauberer HttpListener mit korrektem Shutdown
    - Graceful Exit bei Ctrl+C
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

# 1. Zombies beseitigen
Stop-ZombiesOnPort -TargetPort $Port

# 2. HttpListener erstellen
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    # 3. Server starten
    $listener.Start()
    
    Write-Host ""
    Write-Host "=========================================================" -ForegroundColor Green
    Write-Host "  Ruhestand-App Server laeuft auf http://localhost:$Port/" -ForegroundColor Green
    Write-Host "=========================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Wurzelverzeichnis: $Root" -ForegroundColor Gray
    Write-Host "Druecke Ctrl+C um den Server zu stoppen." -ForegroundColor Yellow
    Write-Host ""

    # 4. Browser oeffnen
    Start-Sleep -Milliseconds 300
    Open-DefaultBrowser -Url "http://localhost:$Port/index.html"

    # 5. Request-Loop
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
    Write-Host "Server wird beendet..." -ForegroundColor Yellow
    
    if ($listener) {
        if ($listener.IsListening) {
            $listener.Stop()
        }
        $listener.Dispose()
        Write-Host "HttpListener sauber beendet." -ForegroundColor Green
    }
}