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

function Get-RuntimeBuildProvenance {
    param([string]$RepositoryRoot)

    $sourceCommit = $null
    $sourceTreeStatus = 'dirty'
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        # Git kann trotz Exitcode 0 Warnungen auf stderr schreiben. Diese
        # duerfen den validierten Exitcodepfad nicht ueberspringen.
        $ErrorActionPreference = 'Continue'
        $commitOutput = & git -C $RepositoryRoot rev-parse HEAD 2>$null
        if ($LASTEXITCODE -eq 0) {
            $candidate = ([string]$commitOutput).Trim().ToLowerInvariant()
            if ($candidate -match '^[0-9a-f]{40}$') {
                $sourceCommit = $candidate
                $statusOutput = @(& git -C $RepositoryRoot status --porcelain --untracked-files=no 2>$null)
                if ($LASTEXITCODE -eq 0 -and $statusOutput.Count -eq 0) {
                    $sourceTreeStatus = 'clean'
                }
            }
        }
    }
    catch {
        $sourceCommit = $null
        $sourceTreeStatus = 'dirty'
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    return [ordered]@{
        schemaVersion = 'RuntimeBuildProvenanceV1'
        sourceCommit = $sourceCommit
        sourceTreeStatus = $sourceTreeStatus
        provider = 'sync_dist'
    }
}

function Assert-CleanRuntimeBuildProvenance {
    param(
        [Parameter(Mandatory = $true)]
        $Provenance,
        [string]$ExpectedCommit = ''
    )

    if ($Provenance.sourceCommit -notmatch '^[0-9a-f]{40}$') {
        throw 'Dist sync requires an exact Git source commit; no dist files were generated.'
    }
    if ($Provenance.sourceTreeStatus -ne 'clean') {
        throw 'Dist sync requires a clean tracked Git source tree; commit all tracked source changes before packaging.'
    }
    if ($ExpectedCommit -and $Provenance.sourceCommit -ne $ExpectedCommit) {
        throw 'Git source commit changed during dist sync; the generated dist was rejected.'
    }
}

$preSyncProvenance = Get-RuntimeBuildProvenance -RepositoryRoot $repoRoot
Assert-CleanRuntimeBuildProvenance -Provenance $preSyncProvenance

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
    '.agents',
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

New-Item -ItemType Directory -Path $distDir | Out-Null

$runtimeSourcePathspecs = @(
    'app',
    'workers',
    'types',
    'css',
    ':(top,glob)*.html',
    ':(top,glob)*.js',
    ':(top,glob)*.mjs',
    ':(top,glob)*.css'
)
$previousErrorActionPreference = $ErrorActionPreference
try {
    $ErrorActionPreference = 'Continue'
    $trackedFiles = @(& git -C $repoRoot ls-files 2>$null)
    $trackedFilesExitCode = $LASTEXITCODE
    $untrackedFiles = @(& git -C $repoRoot ls-files --others --exclude-standard -- @runtimeSourcePathspecs 2>$null)
    $untrackedFilesExitCode = $LASTEXITCODE
    $ignoredFiles = @(& git -C $repoRoot ls-files --others --ignored --exclude-standard -- @runtimeSourcePathspecs 2>$null)
    $ignoredFilesExitCode = $LASTEXITCODE
}
finally {
    $ErrorActionPreference = $previousErrorActionPreference
}
if ($trackedFilesExitCode -ne 0 -or $trackedFiles.Count -eq 0) {
    throw 'Dist sync could not enumerate tracked Git files.'
}
if ($untrackedFilesExitCode -ne 0 -or $ignoredFilesExitCode -ne 0) {
    throw 'Dist sync could not inspect unversioned runtime files.'
}
$unversionedFiles = @($untrackedFiles) + @($ignoredFiles)
$unversionedRuntimeFiles = @($unversionedFiles | Sort-Object -Unique | Where-Object {
    $candidate = ([string]$_).Replace('\', '/').TrimStart('/')
    $isRuntimeDirectory = $candidate -match '^(app|workers|types|css)/'
    $isRootRuntimeFile = $candidate -match '^[^/]+\.(html|js|mjs|css)$'
    $isRuntimeDirectory -or $isRootRuntimeFile
})
if ($unversionedRuntimeFiles.Count -gt 0) {
    throw "Dist sync requires runtime source files to be versioned: $($unversionedRuntimeFiles -join ', ')."
}

$repoRootResolved = [System.IO.Path]::GetFullPath($repoRoot).TrimEnd([System.IO.Path]::DirectorySeparatorChar)
$distRootResolved = [System.IO.Path]::GetFullPath($distDir).TrimEnd([System.IO.Path]::DirectorySeparatorChar)
$forbiddenExtensions = @('.exe', '.msi', '.zip', '.7z', '.tar', '.gz', '.bz2')
$copiedFileCount = 0
foreach ($gitPathRaw in $trackedFiles) {
    $gitPath = ([string]$gitPathRaw).Replace('\', '/').TrimStart('/')
    if (-not $gitPath) { continue }
    $excludedByDirectory = $false
    foreach ($excludedDirectory in $excludedDirectories) {
        if ($gitPath -eq $excludedDirectory -or $gitPath.StartsWith("$excludedDirectory/", [System.StringComparison]::OrdinalIgnoreCase)) {
            $excludedByDirectory = $true
            break
        }
    }
    if ($excludedByDirectory -or $forbiddenExtensions -contains [System.IO.Path]::GetExtension($gitPath).ToLowerInvariant()) {
        continue
    }

    $relativeWindowsPath = $gitPath.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    $sourcePath = [System.IO.Path]::GetFullPath((Join-Path $repoRootResolved $relativeWindowsPath))
    $targetPath = [System.IO.Path]::GetFullPath((Join-Path $distRootResolved $relativeWindowsPath))
    $sourceWithinRepository = $sourcePath.StartsWith("$repoRootResolved$([System.IO.Path]::DirectorySeparatorChar)", [System.StringComparison]::OrdinalIgnoreCase)
    $targetWithinDist = $targetPath.StartsWith("$distRootResolved$([System.IO.Path]::DirectorySeparatorChar)", [System.StringComparison]::OrdinalIgnoreCase)
    if (-not $sourceWithinRepository -or -not $targetWithinDist) {
        throw "Tracked distribution path escaped the repository boundary: '$gitPath'."
    }
    $sourceItem = Get-Item -LiteralPath $sourcePath -Force
    if (-not $sourceItem.PSIsContainer -and ($sourceItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
        throw "Tracked reparse-point files are not allowed in dist: '$gitPath'."
    }
    if ($sourceItem.PSIsContainer) { continue }
    $targetParent = Split-Path -Parent $targetPath
    if (-not (Test-Path -LiteralPath $targetParent)) {
        New-Item -ItemType Directory -Path $targetParent | Out-Null
    }
    Copy-Item -LiteralPath $sourcePath -Destination $targetPath
    $copiedFileCount++
}

if ($copiedFileCount -eq 0) {
    throw 'Dist sync produced no tracked application files.'
}

$runtimeBuildProvenance = Get-RuntimeBuildProvenance -RepositoryRoot $repoRoot
Assert-CleanRuntimeBuildProvenance -Provenance $runtimeBuildProvenance -ExpectedCommit $preSyncProvenance.sourceCommit
$runtimeBuildProvenanceJson = $runtimeBuildProvenance | ConvertTo-Json -Compress
$runtimeBuildProvenancePath = Join-Path $distDir '__build-provenance.json'
[System.IO.File]::WriteAllText(
    $runtimeBuildProvenancePath,
    $runtimeBuildProvenanceJson,
    [System.Text.UTF8Encoding]::new($false)
)

if ($VerboseMode) {
    Write-Host "Copied $copiedFileCount tracked application files; untracked files were excluded." -ForegroundColor Green
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
    'dist/app/shared/runtime-build-provenance.js',
    'dist/app/simulator',
    'dist/app/tranches',
    'dist/workers',
    'dist/workers/worker-pool.js',
    'dist/workers/mc-worker.js',
    'dist/types',
    'dist/types/strategy-options.js',
    'dist/types/profile-types.js',
    'dist/css/balance.css',
    'dist/simulator.css',
    'dist/__build-provenance.json'
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
    'dist/.agents',
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
