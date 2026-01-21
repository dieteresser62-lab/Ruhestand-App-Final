param (
    [switch]$VerboseMode
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Split-Path -Parent $scriptDir
Set-Location $repoRoot

if ($VerboseMode) {
    Write-Host 'Starting Tauri build workflow...' -ForegroundColor Cyan
}

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
