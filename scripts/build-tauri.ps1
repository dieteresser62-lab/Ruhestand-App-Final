param (
    [switch]$VerboseMode
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Split-Path -Parent $scriptDir
Set-Location $repoRoot

function Assert-CommandExists {
    param (
        [Parameter(Mandatory = $true)]
        [string]$CommandName,
        [Parameter(Mandatory = $true)]
        [string]$InstallHint
    )

    $command = Get-Command $CommandName -ErrorAction SilentlyContinue
    if (-not $command) {
        throw "Required command '$CommandName' not found. $InstallHint"
    }
}

function Import-VsDevEnvironment {
    $vsWherePath = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
    if (-not (Test-Path $vsWherePath)) {
        return $false
    }

    $vsInstallPath = & $vsWherePath -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>$null
    if (-not $vsInstallPath) {
        return $false
    }

    $vsDevCmd = Join-Path $vsInstallPath 'Common7\Tools\VsDevCmd.bat'
    if (-not (Test-Path $vsDevCmd)) {
        return $false
    }

    $envDump = & cmd.exe /s /c "`"$vsDevCmd`" -no_logo -arch=x64 -host_arch=x64 >nul && set" 2>$null
    if (-not $envDump) {
        return $false
    }

    foreach ($line in $envDump) {
        if ($line -notmatch '=') {
            continue
        }
        $parts = $line -split '=', 2
        if ($parts.Count -ne 2) {
            continue
        }
        [System.Environment]::SetEnvironmentVariable($parts[0], $parts[1], 'Process')
    }
    return $true
}

function Assert-TauriBuildPrerequisites {
    Assert-CommandExists -CommandName 'npm' -InstallHint 'Install Node.js and ensure npm is in PATH.'
    Assert-CommandExists -CommandName 'rustup' -InstallHint 'Install Rust via rustup (https://rustup.rs/).'
    Assert-CommandExists -CommandName 'cargo' -InstallHint 'Install Rust toolchain via rustup.'

    $rustVersionOutput = & rustc -vV 2>$null
    if (-not $rustVersionOutput) {
        throw "Unable to execute 'rustc -vV'. Ensure Rust toolchain is installed correctly."
    }
    $hostLine = $rustVersionOutput | Where-Object { $_ -like 'host:*' } | Select-Object -First 1
    if (-not $hostLine -or $hostLine -notmatch 'msvc') {
        throw "Rust host toolchain is not MSVC. Install/select MSVC target (e.g. 'rustup default stable-x86_64-pc-windows-msvc')."
    }

    $clCommand = Get-Command 'cl.exe' -ErrorAction SilentlyContinue
    if (-not $clCommand) {
        $loadedVsEnv = Import-VsDevEnvironment
        if ($loadedVsEnv) {
            $clCommand = Get-Command 'cl.exe' -ErrorAction SilentlyContinue
        }
    }
    if (-not $clCommand) {
        throw "MSVC compiler 'cl.exe' not found. Install Visual Studio Build Tools (Desktop development with C++) incl. MSVC v143 + Windows SDK. If already installed, run build from 'x64 Native Tools Command Prompt for VS 2022'."
    }
}

if ($VerboseMode) {
    Write-Host 'Starting Tauri build workflow...' -ForegroundColor Cyan
}

if ($VerboseMode) {
    Write-Host 'Preflight: Checking build prerequisites.'
}
Assert-TauriBuildPrerequisites

if ($VerboseMode) {
    Write-Host 'Step 1/3: Syncing dist with required assets.'
}
& npm run sync-dist

if ($VerboseMode) {
    Write-Host 'Step 2/3: Running Tauri build.'
}
& npm run tauri:build

$sourceExe = Join-Path $repoRoot 'src-tauri\target\release\ruhestand_suite.exe'
if (-not (Test-Path $sourceExe)) {
    throw "Tauri build output '$sourceExe' not found."
}

$destExe = Join-Path $repoRoot 'RuheStandSuite.exe'
Copy-Item -Path $sourceExe -Destination $destExe -Force

if ($VerboseMode) {
    Write-Host "Step 3/3: Copied '$sourceExe' -> '$destExe'." -ForegroundColor Green
}
