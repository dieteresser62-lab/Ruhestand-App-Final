param (
    [switch]$VerboseMode
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Split-Path -Parent $scriptDir
Set-Location $repoRoot

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
    'docs',
    'tools',
    'tests',
    'types',
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

Start-Process -FilePath 'robocopy' -ArgumentList $robocopyArgs -NoNewWindow -Wait
