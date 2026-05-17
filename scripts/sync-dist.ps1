param (
    [switch]$VerboseMode
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Split-Path -Parent $scriptDir
Set-Location $repoRoot

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

$distDir = Join-Path $repoRoot 'dist'
if (Test-Path $distDir) {
    Remove-Item $distDir -Recurse -Force
}

$excludedDirectories = @(
    'dist',
    'node_modules',
    'src-tauri',
    '.git',
    '.agent',
    '.claude',
    '.codex',
    '.github',
    '.coverage',
    '.orchestrator',
    '.pytest_cache',
    '__pycache__',
    'audit',
    'inbox',
    'outbox',
    'docs',
    'Presentation',
    'Screenshots',
    'tools',
    'tests',
    'scripts'
)

$excludedFiles = @(
    '*.exe',
    '*.msi',
    '*.zip',
    '*.7z',
    '*.tar',
    '*.gz',
    '*.bz2'
)

$robocopyArgs = @('.', 'dist', '/MIR', '/XD') + $excludedDirectories + '/XF' + $excludedFiles

if ($VerboseMode) {
    Write-Host 'Running robocopy with arguments:' -ForegroundColor Cyan
    Write-Host ($robocopyArgs -join ' ')
}

$robocopy = Start-Process -FilePath 'robocopy' -ArgumentList $robocopyArgs -NoNewWindow -Wait -PassThru
$robocopyExitCode = $robocopy.ExitCode
if ($robocopyExitCode -ge 8) {
    throw "robocopy failed with exit code $robocopyExitCode."
}

if ($VerboseMode) {
    Write-Host "robocopy completed with exit code $robocopyExitCode." -ForegroundColor Green
}

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

$forbiddenArtifacts = Get-ChildItem -Path $distDir -Recurse -File -Include '*.exe', '*.msi', '*.zip', '*.7z', '*.tar', '*.gz', '*.bz2' -ErrorAction SilentlyContinue
if ($forbiddenArtifacts) {
    $relativeArtifacts = $forbiddenArtifacts | ForEach-Object {
        [System.IO.Path]::GetRelativePath($repoRoot, $_.FullName)
    }
    throw "Release artifacts were copied into dist: $($relativeArtifacts -join ', ')."
}

if ($VerboseMode) {
    Write-Host 'dist validation completed.' -ForegroundColor Green
}
