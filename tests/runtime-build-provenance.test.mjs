import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
    getRuntimeBuildProvenance,
    loadRuntimeBuildProvenance,
    normalizeRuntimeBuildProvenance,
    RUNTIME_BUILD_PROVENANCE_PATH,
    RUNTIME_BUILD_PROVENANCE_SCHEMA_VERSION
} from '../app/shared/runtime-build-provenance.js';

console.log('--- Runtime Build Provenance Tests ---');

const clean = normalizeRuntimeBuildProvenance({
    schemaVersion: RUNTIME_BUILD_PROVENANCE_SCHEMA_VERSION,
    sourceCommit: 'ABCDEF0123456789ABCDEF0123456789ABCDEF01',
    sourceTreeStatus: 'clean',
    provider: 'test'
});
assertEqual(clean.sourceCommit, 'abcdef0123456789abcdef0123456789abcdef01',
    'runtime provenance normalizes an exact source commit');
assertEqual(clean.sourceTreeStatus, 'clean', 'runtime provenance retains clean source status');
assert(Object.isFrozen(clean), 'runtime provenance is immutable');

assertEqual(normalizeRuntimeBuildProvenance({
    schemaVersion: RUNTIME_BUILD_PROVENANCE_SCHEMA_VERSION,
    sourceCommit: 'abc',
    sourceTreeStatus: 'clean'
}), null, 'short source commits are rejected');
assertEqual(normalizeRuntimeBuildProvenance({
    schemaVersion: RUNTIME_BUILD_PROVENANCE_SCHEMA_VERSION,
    sourceCommit: 'a'.repeat(40),
    sourceTreeStatus: 'unknown'
}), null, 'unknown source-tree states are rejected');

const previousWindow = globalThis.window;
const previousFetch = globalThis.fetch;
const requestedUrls = [];
try {
    globalThis.window = {};
    globalThis.fetch = async url => {
        requestedUrls.push(String(url));
        return {
            ok: true,
            json: async () => ({
                schemaVersion: RUNTIME_BUILD_PROVENANCE_SCHEMA_VERSION,
                sourceCommit: 'b'.repeat(40),
                sourceTreeStatus: 'clean',
                provider: 'endpoint_test'
            })
        };
    };
    const loaded = await loadRuntimeBuildProvenance({ force: true });
    assertEqual(loaded.provider, 'endpoint_test', 'runtime provenance is loaded from the same-origin endpoint');
    assertEqual(getRuntimeBuildProvenance(), loaded, 'loaded endpoint provenance becomes the synchronous run value');
    assert(requestedUrls[0] === RUNTIME_BUILD_PROVENANCE_PATH,
        'runtime client requests the pinned provenance endpoint path');

    globalThis.fetch = async () => ({ ok: false, status: 404 });
    assertEqual(await loadRuntimeBuildProvenance({ force: true }), null,
        'a failed forced refresh clears stale provenance fail-closed');
    assertEqual(getRuntimeBuildProvenance(), null, 'failed refresh leaves no stale provenance behind');
} finally {
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousFetch === undefined) delete globalThis.fetch; else globalThis.fetch = previousFetch;
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const startScript = fs.readFileSync(path.join(repoRoot, 'start_suite.ps1'), 'utf8');
const syncScript = fs.readFileSync(path.join(repoRoot, 'scripts', 'sync-dist.ps1'), 'utf8');
for (const [label, source] of [['local server', startScript], ['dist sync', syncScript]]) {
    assert(source.includes('RuntimeBuildProvenanceV1'), `${label} emits the versioned provenance payload`);
    assert(source.includes('rev-parse HEAD'), `${label} reads the exact Git source commit`);
}
assert(startScript.includes('status --porcelain --untracked-files=normal'),
    'local server reports untracked development files as dirty provenance');
assert(syncScript.includes('status --porcelain --untracked-files=no'),
    'dist sync evaluates tracked source changes independently from untracked scratch files');
assert(syncScript.includes('git -C $repoRoot ls-files'),
    'dist sync copies only the tracked Git file inventory so untracked files cannot enter dist');
assert(startScript.includes('__build-provenance.json'), 'local server exposes the same-origin provenance endpoint');
assert(syncScript.includes("dist/__build-provenance.json"), 'dist sync validates the bundled provenance document');
assertEqual(RUNTIME_BUILD_PROVENANCE_PATH, './__build-provenance.json',
    'client endpoint path remains a relative same-origin contract for subpath deployments');
assert(!RUNTIME_BUILD_PROVENANCE_PATH.startsWith('/'),
    'runtime provenance endpoint never escapes an application subpath');
const serverEndpointIndex = startScript.indexOf("if ($urlPath -eq '__build-provenance.json')");
assert(startScript.indexOf('Get-RuntimeBuildProvenanceBytes -RepositoryRoot $Root', serverEndpointIndex) > serverEndpointIndex,
    'local server refreshes Git provenance for every endpoint request');
assert(syncScript.indexOf('Assert-CleanRuntimeBuildProvenance -Provenance $preSyncProvenance') < syncScript.indexOf('Remove-Item $distDir'),
    'dist sync rejects dirty or missing source provenance before deleting or copying dist');
assert(syncScript.indexOf('Assert-CleanRuntimeBuildProvenance -Provenance $runtimeBuildProvenance') > syncScript.lastIndexOf('Copy-Item -LiteralPath'),
    'dist sync revalidates source provenance after copying so concurrent changes remain detectable');

const powershellPath = path.join(
    process.env.SystemRoot || 'C:\\Windows',
    'System32',
    'WindowsPowerShell',
    'v1.0',
    'powershell.exe'
);
const syncFixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ruhestand-sync-dist-'));
try {
    const fixtureFiles = [
        'index.html',
        'Balance.html',
        'Simulator.html',
        'depot-tranchen-manager.html',
        'Handbuch.html',
        'engine.js',
        'simulator.css',
        'app/balance/sentinel.js',
        'app/profile/sentinel.js',
        'app/shared/runtime-build-provenance.js',
        'app/simulator/sentinel.js',
        'app/tranches/sentinel.js',
        'workers/worker-pool.js',
        'workers/mc-worker.js',
        'types/strategy-options.js',
        'types/profile-types.js',
        'css/balance.css'
    ];
    for (const relativePath of fixtureFiles) {
        const absolutePath = path.join(syncFixtureRoot, relativePath);
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.writeFileSync(absolutePath, `fixture:${relativePath}\n`, 'utf8');
    }
    const fixtureSyncScript = path.join(syncFixtureRoot, 'scripts', 'sync-dist.ps1');
    fs.mkdirSync(path.dirname(fixtureSyncScript), { recursive: true });
    fs.copyFileSync(path.join(repoRoot, 'scripts', 'sync-dist.ps1'), fixtureSyncScript);
    fs.writeFileSync(
        path.join(syncFixtureRoot, '.gitignore'),
        'dist/\napp/shared/ignored-runtime.js\n',
        'utf8'
    );

    const git = (...args) => execFileSync('git', args, {
        cwd: syncFixtureRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    });
    git('init');
    git('add', '.');
    git('-c', 'user.name=Slice 11 Test', '-c', 'user.email=slice11@example.invalid', 'commit', '-m', 'fixture');
    const fixtureHead = git('rev-parse', 'HEAD').trim();
    assert(/^[0-9a-f]{40}$/.test(fixtureHead),
        'isolated dist fixture uses an exact SHA-1 source commit');
    const powershellGitProbe = spawnSync(powershellPath, [
        '-NoProfile',
        '-Command',
        `& git -C '${syncFixtureRoot.replace(/'/g, "''")}' rev-parse HEAD`
    ], { cwd: syncFixtureRoot, encoding: 'utf8' });
    assertEqual(powershellGitProbe.status, 0,
        `Windows PowerShell resolves the isolated Git fixture: ${powershellGitProbe.stderr}`);
    assertEqual(powershellGitProbe.stdout.trim(), fixtureHead,
        'Windows PowerShell sees the same isolated source commit');
    fs.writeFileSync(path.join(syncFixtureRoot, 'scratch.txt'), 'untracked scratch\n', 'utf8');

    const successfulSync = spawnSync(powershellPath, [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', fixtureSyncScript
    ], { cwd: syncFixtureRoot, encoding: 'utf8' });
    assertEqual(successfulSync.status, 0,
        `dist sync executes successfully with untracked scratch: ${successfulSync.stderr || successfulSync.stdout}`);
    assert(fs.existsSync(path.join(syncFixtureRoot, 'dist', 'app', 'shared', 'runtime-build-provenance.js')),
        'executed dist sync includes the required runtime provenance module');
    assert(!fs.existsSync(path.join(syncFixtureRoot, 'dist', 'scratch.txt')),
        'executed dist sync excludes untracked scratch files');
    const packagedProvenance = JSON.parse(fs.readFileSync(
        path.join(syncFixtureRoot, 'dist', '__build-provenance.json'),
        'utf8'
    ));
    assertEqual(packagedProvenance.sourceTreeStatus, 'clean',
        'executed dist sync writes clean tracked source provenance');

    const untrackedRuntimePath = path.join(syncFixtureRoot, 'app', 'shared', 'untracked-runtime.js');
    fs.writeFileSync(untrackedRuntimePath, 'export const untracked = true;\n', 'utf8');
    const rejectedSync = spawnSync(powershellPath, [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', fixtureSyncScript
    ], { cwd: syncFixtureRoot, encoding: 'utf8' });
    assert(rejectedSync.status !== 0,
        'dist sync rejects unversioned files in runtime source roots');
    assert(`${rejectedSync.stdout}\n${rejectedSync.stderr}`.includes('requires runtime source files to be versioned'),
        'dist sync reports the actionable unversioned-runtime cause');

    fs.rmSync(untrackedRuntimePath);
    const ignoredRuntimePath = path.join(syncFixtureRoot, 'app', 'shared', 'ignored-runtime.js');
    fs.writeFileSync(ignoredRuntimePath, 'export const ignored = true;\n', 'utf8');
    const ignoredRuntimeSync = spawnSync(powershellPath, [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', fixtureSyncScript
    ], { cwd: syncFixtureRoot, encoding: 'utf8' });
    assert(ignoredRuntimeSync.status !== 0,
        'dist sync rejects ignored files in runtime source roots');
    assert(`${ignoredRuntimeSync.stdout}\n${ignoredRuntimeSync.stderr}`.includes('ignored-runtime.js'),
        'dist sync names the ignored runtime source that would otherwise disappear');
} finally {
    fs.rmSync(syncFixtureRoot, { recursive: true, force: true });
}

console.log('✅ Runtime build provenance tests passed');
