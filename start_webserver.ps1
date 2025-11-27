<#
    Startskript für die Ruhestand-App-Suite über einen Node.js-basierten Webserver.

    Dieses Skript räumt belegte Ports zuverlässig auf, prüft die Verfügbarkeit
    des npm-Pakets "http-server", startet den Server und öffnet anschließend den
    Browser. Es richtet sich an lokale Entwicklungsumgebungen und wurde so
    gestaltet, dass typische Stolperfallen (fehlende Administratorrechte,
    fehlendes npm-Paket, belegte Ports, fehlender Edge-Browser) abgefangen und
    klar kommuniziert werden.
#>

# Beenden bei Fehlern, damit wir nicht in einen halbgaren Zustand laufen.
$ErrorActionPreference = "Stop"

function Assert-RunningAsAdministrator {
    <#
        Prüft, ob das Skript mit Administrator-Rechten läuft.

        Returns
        -------
        bool
            True, wenn der aktuelle Prozess administrative Rechte besitzt,
            andernfalls False.
    #>
    $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($currentIdentity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Ensure-HttpServerAvailable {
    <#
        Stellt sicher, dass das npm-Paket "http-server" verfügbar ist.

        Throws
        ------
        Will throw if das Kommando nicht gefunden wird, damit der Aufrufer
        kontrolliert abbrechen kann.
    #>
    $httpServerCmd = Get-Command http-server -ErrorAction SilentlyContinue
    if (-not $httpServerCmd) {
        throw "FEHLER: http-server nicht gefunden. Installiere es mit: npm install -g http-server"
    }
}

function Stop-ProcessesOnPort {
    <#
        Beendet alle Prozesse, die den angegebenen TCP-Port belegen.

        Parameters
        ----------
        port : int
            Der TCP-Port, der freigemacht werden soll.
    #>
    param(
        [Parameter(Mandatory = $true)]
        [int] $Port
    )

    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction Stop
    }
    catch {
        Write-Warning "Konnte bestehende TCP-Verbindungen nicht prüfen (Administrator-Rechte erforderlich?): $_"
        return
    }

    $pidsToTerminate = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    if (-not $pidsToTerminate) {
        Write-Host "Port $Port ist frei."
        return
    }

    foreach ($pid in $pidsToTerminate) {
        try {
            # Force, damit Zombie-Prozesse wirklich beendet werden.
            Stop-Process -Id $pid -Force -ErrorAction Stop
            Write-Host "Beendete Prozess $pid, der Port $Port belegte."
        }
        catch {
            Write-Warning "Konnte Prozess $pid nicht beenden: $_"
        }
    }
}

function Start-StaticServer {
    <#
        Startet http-server auf dem gewünschten Port und Host.

        Parameters
        ----------
        port : int
            Der TCP-Port, den der Server nutzen soll.
        bindAddress : string
            Die IP-Adresse, an die der Server gebunden wird.
        contentRoot : string
            Verzeichnis, das ausgeliefert werden soll.

        Returns
        -------
        System.Diagnostics.Process
            Der gestartete Prozess, um bei Bedarf später darauf zugreifen zu
            können.
    #>
    param(
        [Parameter(Mandatory = $true)]
        [int] $Port,
        [Parameter(Mandatory = $true)]
        [string] $BindAddress,
        [Parameter(Mandatory = $true)]
        [string] $ContentRoot
    )

    $arguments = @("-a", $BindAddress, "-p", $Port, "-c-1", $ContentRoot)

    # Wir starten in einem separaten Fenster, damit der Server weiterläuft,
    # wenn das Skript beendet ist und die Ausgabe sichtbar bleibt.
    $process = Start-Process -FilePath "http-server" `
                              -ArgumentList $arguments `
                              -WorkingDirectory $ContentRoot `
                              -PassThru

    Write-Host "http-server läuft (PID: $($process.Id)) auf http://$BindAddress:$Port"
    return $process
}

function Open-WebBrowser {
    <#
        Öffnet die gewünschte URL im bevorzugten Browser.

        Parameters
        ----------
        url : string
            Die zu öffnende URL.
    #>
    param(
        [Parameter(Mandatory = $true)]
        [string] $Url
    )

    try {
        # Edge als bevorzugter Browser, weil er ES-Module zuverlässig lädt.
        Start-Process "msedge.exe" $Url -ErrorAction Stop
        return
    }
    catch {
        Write-Warning "Microsoft Edge konnte nicht gestartet werden (fehlend?): $_"
    }

    try {
        # Fallback auf Standard-Browser.
        Start-Process $Url -ErrorAction Stop
    }
    catch {
        Write-Warning "Kein Browser konnte automatisch geöffnet werden: $_"
    }
}

function Start-AppSuite {
    <#
        Orchestriert das gesamte Starten der App-Suite über http-server.

        Dieses Entry-Point-Wrapper setzt sinnvolle Defaults, räumt Ports auf und
        öffnet zum Schluss den Browser.
    #>
    param(
        [int] $Port = 8000,
        [string] $BindAddress = "127.0.0.1"
    )

    $scriptRoot = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
    $contentRoot = Resolve-Path -Path (Join-Path -Path $scriptRoot -ChildPath ".")

    if (-not (Assert-RunningAsAdministrator)) {
        Write-Warning "Dieses Skript sollte als Administrator ausgeführt werden, damit laufende Prozesse auf Port $Port zuverlässig beendet werden können."
    }

    Ensure-HttpServerAvailable
    Stop-ProcessesOnPort -Port $Port

    $serverProcess = Start-StaticServer -Port $Port -BindAddress $BindAddress -ContentRoot $contentRoot

    $url = "http://$BindAddress:$Port/index.html"
    Open-WebBrowser -Url $url

    Write-Host "Fertig. Schließe dieses Fenster nicht, falls du den Server weiterlaufen lassen möchtest."
}

# Entry Point
Start-AppSuite
