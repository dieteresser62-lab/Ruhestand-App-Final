#!/usr/bin/env node
/**
 * Module: Sync Dist
 * Purpose: Builds the Tauri frontend folder (dist/) from exactly one Git commit.
 *          Only runtime files are copied: the directories in DIST_RUNTIME_DIRECTORIES
 *          plus the root-level HTML/JS/CSS files. A generated __build-provenance.json
 *          records the source commit.
 * Usage: node scripts/sync-dist.mjs [--rev <commit-ish>] [--out <dir>]
 *        Without --rev, HEAD is used and the working tree must not hold uncommitted
 *        tracked changes or unversioned runtime files, because those would be
 *        silently missing from the build.
 * Dependencies: git, fs, path, child_process
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const DIST_RUNTIME_DIRECTORIES = Object.freeze(['app', 'engine', 'workers', 'types', 'css', 'assets']);
export const DIST_REQUIRED_FILES = Object.freeze([
    'index.html',
    'Balance.html',
    'Simulator.html',
    'depot-tranchen-manager.html',
    'Handbuch.html',
    'engine.js',
    'simulator.css',
    'app/shared/runtime-build-provenance.js',
    'workers/worker-pool.js',
    'workers/mc-worker.js',
    'types/strategy-options.js',
    'css/balance.css'
]);
export const PROVENANCE_FILE_NAME = '__build-provenance.json';

// Must match RUNTIME_BUILD_PROVENANCE_SCHEMA_VERSION in app/shared/runtime-build-provenance.js.
const PROVENANCE_SCHEMA_VERSION = 'RuntimeBuildProvenanceV1';
const ROOT_RUNTIME_FILE_PATTERN = /^[^/]+\.(?:html|js|css)$/;
const REGULAR_FILE_MODES = new Set(['100644', '100755']);
const USAGE = 'Usage: node scripts/sync-dist.mjs [--rev <commit-ish>] [--out <dir>]';

/**
 * Entscheidet, ob ein Repo-Pfad (mit '/' getrennt) zur Laufzeit der App gehoert.
 * @param {string} relativePath
 * @returns {boolean}
 */
export function isDistRuntimePath(relativePath) {
    const normalized = String(relativePath).replace(/\\/g, '/');
    if (ROOT_RUNTIME_FILE_PATTERN.test(normalized)) return true;
    const slash = normalized.indexOf('/');
    return slash > 0 && DIST_RUNTIME_DIRECTORIES.includes(normalized.slice(0, slash));
}

function runGit(repoRoot, args, { input, binary = false } = {}) {
    // Ohne encoding liefert spawnSync Buffer; ein String-Input wuerde sonst mit
    // demselben encoding kodiert.
    const result = spawnSync('git', ['-C', repoRoot, ...args], {
        input: input === undefined ? undefined : Buffer.from(input, 'utf8'),
        encoding: binary ? undefined : 'utf8',
        maxBuffer: 512 * 1024 * 1024
    });
    if (result.error) {
        throw new Error(`git could not be started (${result.error.message}). Git is required for dist sync.`);
    }
    if (result.status !== 0) {
        throw new Error(`git ${args.join(' ')} failed: ${String(result.stderr).trim()}`);
    }
    return result.stdout;
}

function resolveCommit(repoRoot, rev) {
    let commit;
    try {
        commit = runGit(repoRoot, ['rev-parse', '--verify', '--quiet', `${rev}^{commit}`]).trim().toLowerCase();
    } catch (error) {
        if (error.message.startsWith('git could not be started')) throw error;
        throw new Error(`'${rev}' is not a commit in ${repoRoot}.`);
    }
    if (!/^[0-9a-f]{40}$/.test(commit)) {
        throw new Error(`'${rev}' does not resolve to a SHA-1 commit (got '${commit}').`);
    }
    return commit;
}

function assertWorkingTreeMatchesHead(repoRoot) {
    const trackedChanges = runGit(repoRoot, ['status', '--porcelain', '--untracked-files=no']).trim();
    if (trackedChanges) {
        throw new Error('Tracked files have uncommitted changes; commit them first or pass --rev to build a specific commit.');
    }
    const scope = ['--', ...DIST_RUNTIME_DIRECTORIES, ':(top,glob)*.html', ':(top,glob)*.js', ':(top,glob)*.css'];
    const untracked = runGit(repoRoot, ['ls-files', '-z', '--others', '--exclude-standard', ...scope]);
    const ignored = runGit(repoRoot, ['ls-files', '-z', '--others', '--ignored', '--exclude-standard', ...scope]);
    const unversioned = [...new Set(`${untracked}\0${ignored}`.split('\0'))]
        .filter(entry => entry && isDistRuntimePath(entry))
        .sort();
    if (unversioned.length > 0) {
        throw new Error(`Runtime source files must be versioned, otherwise they would be missing from dist: ${unversioned.join(', ')}.`);
    }
}

function listRuntimeEntries(repoRoot, commit) {
    const listing = runGit(repoRoot, ['ls-tree', '-r', '-z', '--full-tree', commit]);
    const entries = [];
    for (const record of listing.split('\0')) {
        if (!record) continue;
        const tab = record.indexOf('\t');
        const [mode, type, oid] = record.slice(0, tab).split(' ');
        const filePath = record.slice(tab + 1);
        if (!isDistRuntimePath(filePath)) continue;
        if (type !== 'blob' || !REGULAR_FILE_MODES.has(mode)) {
            throw new Error(`Runtime path '${filePath}' is not a regular file in ${commit} (mode ${mode}, type ${type}).`);
        }
        if (filePath.split('/').some(segment => segment === '..' || segment === '')) {
            throw new Error(`Runtime path '${filePath}' is not a plain relative path.`);
        }
        entries.push({ path: filePath, oid });
    }
    const present = new Set(entries.map(entry => entry.path));
    const missing = DIST_REQUIRED_FILES.filter(required => !present.has(required));
    if (missing.length > 0) {
        throw new Error(`Commit ${commit} lacks required runtime files: ${missing.join(', ')}.`);
    }
    return entries;
}

function readBlobs(repoRoot, entries) {
    const output = runGit(repoRoot, ['cat-file', '--batch'], {
        input: `${entries.map(entry => entry.oid).join('\n')}\n`,
        binary: true
    });
    const contents = [];
    let offset = 0;
    for (const entry of entries) {
        const headerEnd = output.indexOf(0x0a, offset);
        const [oid, type, size] = output.toString('utf8', offset, headerEnd).split(' ');
        if (oid !== entry.oid || type !== 'blob') {
            throw new Error(`Unexpected git cat-file answer for '${entry.path}'.`);
        }
        const start = headerEnd + 1;
        const end = start + Number(size);
        contents.push({ path: entry.path, data: output.subarray(start, end) });
        offset = end + 1;
    }
    return contents;
}

function prepareOutputDirectory(repoRoot, outDir) {
    const resolved = path.resolve(outDir);
    const repoFromOut = path.relative(resolved, repoRoot);
    if (repoFromOut === '' || (!repoFromOut.startsWith('..') && !path.isAbsolute(repoFromOut))) {
        throw new Error(`Refusing to use '${resolved}' as dist output because it contains the repository.`);
    }
    if (fs.existsSync(resolved)) {
        if (!fs.lstatSync(resolved).isDirectory()) {
            throw new Error(`Dist output '${resolved}' exists and is not a directory.`);
        }
        const children = fs.readdirSync(resolved);
        if (children.length > 0 && !children.includes(PROVENANCE_FILE_NAME)) {
            throw new Error(`Refusing to replace '${resolved}': it is not empty and holds no ${PROVENANCE_FILE_NAME} from an earlier dist sync.`);
        }
        fs.rmSync(resolved, { recursive: true, force: true });
    }
    fs.mkdirSync(resolved, { recursive: true });
    return resolved;
}

/**
 * Baut dist/ aus einem Commit. Alle Git-Pruefungen und Lesevorgaenge laufen,
 * bevor das Zielverzeichnis angefasst wird.
 * @param {{repoRoot: string, rev?: string|null, outDir?: string}} options
 * @returns {{commit: string, fileCount: number, outDir: string}}
 */
export function syncDist({ repoRoot, rev = null, outDir = path.join(repoRoot, 'dist') }) {
    if (rev === null) assertWorkingTreeMatchesHead(repoRoot);
    const commit = resolveCommit(repoRoot, rev ?? 'HEAD');
    const files = readBlobs(repoRoot, listRuntimeEntries(repoRoot, commit));

    const resolvedOut = prepareOutputDirectory(repoRoot, outDir);
    for (const file of files) {
        const target = path.join(resolvedOut, ...file.path.split('/'));
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, file.data);
    }
    const provenance = {
        schemaVersion: PROVENANCE_SCHEMA_VERSION,
        sourceCommit: commit,
        sourceTreeStatus: 'clean',
        provider: 'sync_dist'
    };
    fs.writeFileSync(path.join(resolvedOut, PROVENANCE_FILE_NAME), JSON.stringify(provenance), 'utf8');
    return { commit, fileCount: files.length, outDir: resolvedOut };
}

function parseArgs(argv) {
    const options = { rev: null, out: null };
    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];
        if (arg !== '--rev' && arg !== '--out') {
            throw new Error(`Unknown argument '${arg}'. ${USAGE}`);
        }
        const value = argv[index + 1];
        if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value. ${USAGE}`);
        options[arg.slice(2)] = value;
        index++;
    }
    return options;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    try {
        const options = parseArgs(process.argv.slice(2));
        const result = syncDist({
            repoRoot,
            rev: options.rev,
            outDir: options.out ?? path.join(repoRoot, 'dist')
        });
        console.log(`dist synced from ${result.commit.slice(0, 7)}: ${result.fileCount} runtime files -> ${result.outDir}`);
    } catch (error) {
        console.error(`Dist sync failed: ${error.message}`);
        process.exitCode = 1;
    }
}
