param (
    [switch]$VerboseMode
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Split-Path -Parent $scriptDir
Set-Location $repoRoot

$releaseExeName = 'RuhestandSuite.exe'
$minimumExeSizeBytes = 1MB

function Invoke-CheckedCommand {
    param (
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [Parameter(Mandatory = $true)]
        [string]$StepName
    )

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & $FilePath @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($output) {
        $output | ForEach-Object { Write-Host $_ }
    }
    if ($null -ne $exitCode -and $exitCode -ne 0) {
        throw "$StepName failed with exit code $exitCode. Output: $($output -join ' ')"
    }
}

function Assert-PathExists {
    param (
        [Parameter(Mandatory = $true)]
        [string]$RelativePath
    )

    $fullPath = Join-Path $repoRoot $RelativePath
    if (-not (Test-Path $fullPath)) {
        throw "Required dist asset missing after sync: '$RelativePath'."
    }
}

function Assert-PathAbsent {
    param (
        [Parameter(Mandatory = $true)]
        [string]$RelativePath
    )

    $fullPath = Join-Path $repoRoot $RelativePath
    if (Test-Path $fullPath) {
        throw "Excluded path was copied into dist: '$RelativePath'."
    }
}

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

function Assert-NpmUsable {
    Assert-CommandExists -CommandName 'npm' -InstallHint 'Install Node.js and ensure npm is in PATH.'

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $npmVersionOutput = & npm --version 2>&1
        $npmExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($null -ne $npmExitCode -and $npmExitCode -ne 0) {
        throw "Required command 'npm' was found but is not usable. Output: $($npmVersionOutput -join ' ')"
    }
}

function Assert-DistReady {
    $requiredDistPaths = @(
        'dist/index.html',
        'dist/Balance.html',
        'dist/Simulator.html',
        'dist/depot-tranchen-manager.html',
        'dist/Handbuch.html',
        'dist/engine.js',
        'dist/app',
        'dist/app/balance',
        'dist/app/profile',
        'dist/app/shared',
        'dist/app/simulator',
        'dist/app/tranches',
        'dist/workers',
        'dist/workers/worker-pool.js',
        'dist/workers/mc-worker.js',
        'dist/types',
        'dist/types/strategy-options.js',
        'dist/types/profile-types.js',
        'dist/css/balance.css',
        'dist/simulator.css'
    )
    foreach ($requiredPath in $requiredDistPaths) {
        Assert-PathExists -RelativePath $requiredPath
    }

    $excludedDistPaths = @(
        'dist/dist',
        'dist/node_modules',
        'dist/src-tauri',
        'dist/.git',
        'dist/.agent',
        'dist/.claude',
        'dist/.codex',
        'dist/.github',
        'dist/.coverage',
        'dist/.orchestrator',
        'dist/.pytest_cache',
        'dist/__pycache__',
        'dist/audit',
        'dist/inbox',
        'dist/outbox',
        'dist/docs',
        'dist/Presentation',
        'dist/Screenshots',
        'dist/tools',
        'dist/tests',
        'dist/scripts'
    )
    foreach ($excludedPath in $excludedDistPaths) {
        Assert-PathAbsent -RelativePath $excludedPath
    }

    $distDir = Join-Path $repoRoot 'dist'
    $forbiddenArtifacts = Get-ChildItem -Path $distDir -Recurse -File -Include '*.exe', '*.msi', '*.zip', '*.7z', '*.tar', '*.gz', '*.bz2' -ErrorAction SilentlyContinue
    if ($forbiddenArtifacts) {
        $relativeArtifacts = $forbiddenArtifacts | ForEach-Object {
            [System.IO.Path]::GetRelativePath($repoRoot, $_.FullName)
        }
        throw "Release artifacts were copied into dist: $($relativeArtifacts -join ', ')."
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
    Assert-NpmUsable
    Assert-CommandExists -CommandName 'rustup' -InstallHint 'Install Rust via rustup (https://rustup.rs/).'
    Assert-CommandExists -CommandName 'cargo' -InstallHint 'Install Rust toolchain via rustup.'

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $rustVersionOutput = & rustc -vV 2>$null
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
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

function Assert-ReleaseExecutable {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [datetime]$BuildStartedAt
    )

    if (-not (Test-Path $Path)) {
        throw "Tauri build output '$Path' not found."
    }

    $exe = Get-Item $Path
    if ($exe.Length -lt $minimumExeSizeBytes) {
        throw "Tauri build output '$Path' is unexpectedly small ($($exe.Length) bytes)."
    }
    if ($exe.LastWriteTime -lt $BuildStartedAt) {
        throw "Tauri build output '$Path' was not updated by this build. LastWriteTime: $($exe.LastWriteTime); build started: $BuildStartedAt."
    }
}

if ($VerboseMode) {
    Write-Host 'Starting Tauri build workflow...' -ForegroundColor Cyan
}

$buildStartedAt = Get-Date

if ($VerboseMode) {
    Write-Host 'Preflight: Checking build prerequisites.'
}
Assert-TauriBuildPrerequisites

if ($VerboseMode) {
    Write-Host 'Step 1/3: Syncing dist with required assets.'
}
Invoke-CheckedCommand -FilePath 'npm' -Arguments @('run', 'sync-dist') -StepName 'npm run sync-dist'
Assert-DistReady

if ($VerboseMode) {
    Write-Host 'Step 2/3: Running Tauri build.'
}
Invoke-CheckedCommand -FilePath 'npm' -Arguments @('run', 'tauri:build') -StepName 'npm run tauri:build'

$sourceExe = Join-Path $repoRoot 'src-tauri\target\release\ruhestand_suite.exe'
Assert-ReleaseExecutable -Path $sourceExe -BuildStartedAt $buildStartedAt

$destExe = Join-Path $repoRoot $releaseExeName
Copy-Item -Path $sourceExe -Destination $destExe -Force
Assert-ReleaseExecutable -Path $destExe -BuildStartedAt $buildStartedAt

$sourceInfo = Get-Item $sourceExe
$destInfo = Get-Item $destExe
if ($sourceInfo.Length -ne $destInfo.Length) {
    throw "Copied EXE size mismatch. Source: $($sourceInfo.Length) bytes; destination: $($destInfo.Length) bytes."
}

if ($VerboseMode) {
    Write-Host "Step 3/3: Copied '$sourceExe' -> '$destExe'." -ForegroundColor Green
    Write-Host "Release EXE: $releaseExeName ($($destInfo.Length) bytes, $($destInfo.LastWriteTime))" -ForegroundColor Green
    Write-Host 'Manual smoke checks should be run before publishing the EXE.' -ForegroundColor Yellow
}
