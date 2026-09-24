import fs from 'node:fs';
import http from 'node:http';
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
import { createSuiteServer, resolveRequestPath } from '../scripts/serve.mjs';

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

assertEqual(RUNTIME_BUILD_PROVENANCE_PATH, './__build-provenance.json',
    'client endpoint path remains a relative same-origin contract for subpath deployments');
assert(!RUNTIME_BUILD_PROVENANCE_PATH.startsWith('/'),
    'runtime provenance endpoint never escapes an application subpath');

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ruhestand-sync-dist-'));

function writeFixtureFile(relativePath, content = `fixture:${relativePath}\n`) {
    const absolutePath = path.join(fixtureRoot, ...relativePath.split('/'));
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content, 'utf8');
}

function git(...args) {
    return execFileSync('git', [
        '-c', 'user.name=Dist Sync Test',
        '-c', 'user.email=dist-sync@example.invalid',
        '-c', 'commit.gpgsign=false',
        ...args
    ], { cwd: fixtureRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function runSync(...args) {
    const result = spawnSync(process.execPath, [path.join(fixtureRoot, 'scripts', 'sync-dist.mjs'), ...args], {
        cwd: fixtureRoot,
        encoding: 'utf8'
    });
    return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
}

function readPackagedProvenance(distRoot = path.join(fixtureRoot, 'dist')) {
    return normalizeRuntimeBuildProvenance(JSON.parse(
        fs.readFileSync(path.join(distRoot, '__build-provenance.json'), 'utf8')
    ));
}

function request(port, requestPath, method = 'GET') {
    return new Promise((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port, path: requestPath, method, agent: false }, res => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve({
                status: res.statusCode,
                headers: res.headers,
                body: Buffer.concat(chunks).toString('utf8')
            }));
        });
        req.on('error', reject);
        req.end();
    });
}

const runtimeFiles = [
    'index.html',
    'Balance.html',
    'Simulator.html',
    'depot-tranchen-manager.html',
    'Handbuch.html',
    'engine.js',
    'simulator.css',
    'app/shared/runtime-build-provenance.js',
    'app/balance/sentinel.js',
    'workers/worker-pool.js',
    'workers/mc-worker.js',
    'types/strategy-options.js',
    'css/balance.css',
    'engine/index.mjs',
    'assets/images/sentinel.svg'
];
const nonRuntimeFiles = [
    'README.md',
    'AGENTS.md',
    'build-engine.mjs',
    'package.json',
    'data/historical/raw.csv',
    'docs/reference/TECHNICAL.md',
    'tests/sentinel.test.mjs',
    'tools/yahoo-proxy.cjs',
    'src-tauri/tauri.conf.json',
    'config/tsconfig.json'
];

let server = null;
try {
    for (const relativePath of [...runtimeFiles, ...nonRuntimeFiles]) writeFixtureFile(relativePath);
    writeFixtureFile('.gitignore', 'dist/\napp/shared/ignored-runtime.js\n');
    fs.mkdirSync(path.join(fixtureRoot, 'scripts'), { recursive: true });
    fs.copyFileSync(path.join(repoRoot, 'scripts', 'sync-dist.mjs'), path.join(fixtureRoot, 'scripts', 'sync-dist.mjs'));
    git('init', '-q');
    git('add', '.');
    git('commit', '-q', '-m', 'fixture');
    const fixtureHead = git('rev-parse', 'HEAD');

    // Erfolgreicher Lauf: nur Laufzeitdateien plus Herkunft aus dem Commit.
    writeFixtureFile('scratch.txt', 'untracked scratch outside the runtime roots\n');
    const firstSync = runSync();
    assertEqual(firstSync.status, 0, `dist sync succeeds on a clean tracked tree: ${firstSync.output}`);
    for (const relativePath of runtimeFiles) {
        assert(fs.existsSync(path.join(fixtureRoot, 'dist', relativePath)), `dist contains runtime file ${relativePath}`);
    }
    for (const relativePath of [...nonRuntimeFiles, 'scratch.txt', 'scripts/sync-dist.mjs', '.gitignore']) {
        assert(!fs.existsSync(path.join(fixtureRoot, 'dist', relativePath)), `dist excludes non-runtime file ${relativePath}`);
    }
    const packaged = readPackagedProvenance();
    assert(packaged !== null, 'packaged provenance satisfies the runtime provenance contract');
    assertEqual(packaged.sourceCommit, fixtureHead, 'packaged provenance names the synced commit');
    assertEqual(packaged.sourceTreeStatus, 'clean', 'packaged provenance is clean by construction');
    assertEqual(packaged.provider, 'sync_dist', 'packaged provenance names the dist sync as provider');

    // Nicht versionierte Laufzeitdateien wuerden in dist fehlen und blockieren den Standardlauf.
    writeFixtureFile('app/shared/untracked-runtime.js', 'export const untracked = true;\n');
    const untrackedSync = runSync();
    assert(untrackedSync.status !== 0, 'dist sync rejects untracked files in runtime roots');
    assert(untrackedSync.output.includes('app/shared/untracked-runtime.js'),
        'dist sync names the untracked runtime file');
    fs.rmSync(path.join(fixtureRoot, 'app', 'shared', 'untracked-runtime.js'));

    writeFixtureFile('app/shared/ignored-runtime.js', 'export const ignored = true;\n');
    const ignoredSync = runSync();
    assert(ignoredSync.status !== 0, 'dist sync rejects ignored files in runtime roots');
    assert(ignoredSync.output.includes('app/shared/ignored-runtime.js'),
        'dist sync names the ignored runtime file that would otherwise disappear');
    fs.rmSync(path.join(fixtureRoot, 'app', 'shared', 'ignored-runtime.js'));

    // Uncommittete Aenderungen blockieren den Standardlauf; --rev baut den Commit-Stand.
    writeFixtureFile('index.html', 'uncommitted edit\n');
    const dirtySync = runSync();
    assert(dirtySync.status !== 0, 'dist sync rejects uncommitted tracked changes without --rev');
    assert(dirtySync.output.includes('uncommitted'), 'dist sync explains the uncommitted-change rejection');
    const revSync = runSync('--rev', 'HEAD');
    assertEqual(revSync.status, 0, `dist sync with --rev ignores the working tree: ${revSync.output}`);
    assertEqual(fs.readFileSync(path.join(fixtureRoot, 'dist', 'index.html'), 'utf8'), 'fixture:index.html\n',
        'dist sync with --rev copies committed content, not the working tree edit');
    git('checkout', '--', 'index.html');

    // Fehlt eine Pflichtdatei im Commit, bleibt das vorhandene dist unberuehrt.
    git('rm', '-q', 'workers/mc-worker.js');
    git('commit', '-q', '-m', 'drop worker');
    const missingSync = runSync();
    assert(missingSync.status !== 0, 'dist sync rejects commits without required runtime files');
    assert(missingSync.output.includes('workers/mc-worker.js'), 'dist sync names the missing required file');
    assert(fs.existsSync(path.join(fixtureRoot, 'dist', 'workers', 'mc-worker.js')),
        'a rejected dist sync leaves the previous dist untouched');
    const olderSync = runSync('--rev', 'HEAD~1');
    assertEqual(olderSync.status, 0, `dist sync builds an explicit older commit: ${olderSync.output}`);
    assertEqual(readPackagedProvenance().sourceCommit, fixtureHead, 'explicit --rev is recorded as source commit');

    // --out ersetzt nur leere Ordner oder fruehere dist-Staende.
    const foreignOut = path.join(fixtureRoot, 'foreign-out');
    fs.mkdirSync(foreignOut);
    fs.writeFileSync(path.join(foreignOut, 'keep.txt'), 'keep\n', 'utf8');
    const foreignSync = runSync('--rev', 'HEAD~1', '--out', foreignOut);
    assert(foreignSync.status !== 0, 'dist sync refuses to replace a foreign non-empty directory');
    assert(fs.existsSync(path.join(foreignOut, 'keep.txt')), 'a refused --out target keeps its content');
    const repoOutSync = runSync('--rev', 'HEAD~1', '--out', fixtureRoot);
    assert(repoOutSync.status !== 0, 'dist sync refuses an output directory that contains the repository');
    const freshOut = path.join(fixtureRoot, 'fresh-out');
    const freshSync = runSync('--rev', 'HEAD~1', '--out', freshOut);
    assertEqual(freshSync.status, 0, `dist sync writes into a new --out directory: ${freshSync.output}`);
    assert(readPackagedProvenance(freshOut) !== null, 'dist in --out carries valid provenance');
    fs.rmSync(foreignOut, { recursive: true, force: true });
    fs.rmSync(freshOut, { recursive: true, force: true });
    fs.rmSync(path.join(fixtureRoot, 'scratch.txt'));

    // Lokaler Server: Herkunft pro Anfrage aus Git, untracked Dateien machen den Stand dirty.
    server = createSuiteServer({ root: fixtureRoot });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    const fixtureTip = git('rev-parse', 'HEAD');

    const cleanResponse = await request(port, '/__build-provenance.json');
    assertEqual(cleanResponse.status, 200, 'local server answers the provenance endpoint');
    assertEqual(cleanResponse.headers['cache-control'], 'no-store', 'provenance endpoint is never cached');
    const served = normalizeRuntimeBuildProvenance(JSON.parse(cleanResponse.body));
    assert(served !== null, 'served provenance satisfies the runtime provenance contract');
    assertEqual(served.sourceCommit, fixtureTip, 'served provenance names the working tree HEAD');
    assertEqual(served.sourceTreeStatus, 'clean', 'served provenance is clean without local changes');

    writeFixtureFile('untracked-note.txt', 'local change\n');
    const dirtyResponse = normalizeRuntimeBuildProvenance(JSON.parse((await request(port, '/__build-provenance.json')).body));
    assertEqual(dirtyResponse.sourceTreeStatus, 'dirty',
        'local server refreshes provenance per request and counts untracked files as dirty');

    const page = await request(port, '/index.html');
    assertEqual(page.status, 200, 'local server serves runtime files');
    assertEqual(page.body, 'fixture:index.html\n', 'local server serves the working tree content');
    assert(String(page.headers['content-type']).startsWith('text/html'), 'local server sends the HTML MIME type');
    assertEqual(page.headers['cache-control'], 'no-store', 'local server disables caching');
    assertEqual((await request(port, '/')).body, 'fixture:index.html\n', 'root path serves index.html');
    assertEqual((await request(port, '/.git/config')).status, 403, 'local server hides dot directories such as .git');
    assertEqual((await request(port, '/..%2f..%2fsecret.txt')).status, 403, 'encoded traversal is rejected');
    assertEqual((await request(port, '/missing.js')).status, 404, 'missing files answer 404');
    assertEqual((await request(port, '/app')).status, 404, 'directories are not listed');
    assertEqual((await request(port, '/index.html', 'POST')).status, 405, 'local server is read-only');

    assertEqual(resolveRequestPath(fixtureRoot, '/'), path.join(fixtureRoot, 'index.html'),
        'request path resolution maps / to index.html');
    assertEqual(resolveRequestPath(fixtureRoot, '/%2e%2e/%2e%2e/etc/passwd'), path.join(fixtureRoot, 'etc', 'passwd'),
        'URL dot segments are normalized before resolution and stay below root');
    assertEqual(resolveRequestPath(fixtureRoot, '/app%5C..%5C..%5Csecret.txt'), null,
        'encoded backslash traversal is rejected');
    assertEqual(resolveRequestPath(fixtureRoot, '/%00.js'), null, 'NUL bytes are rejected');
} finally {
    if (server) await new Promise(resolve => server.close(resolve));
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log('✅ Runtime build provenance tests passed');
