#!/usr/bin/env node
/**
 * Module: Local Suite Server
 * Purpose: Serves the working tree for the browser variant of the suite and starts the
 *          Yahoo quote proxy (tools/yahoo-proxy.cjs) in the same process, so Ctrl+C or
 *          closing the window stops both. __build-provenance.json is answered from Git
 *          on every request; untracked files count as a dirty source tree.
 * Usage: node scripts/serve.mjs [--port 8000] [--host 127.0.0.1] [--proxy-port 8787] [--no-proxy] [--open]
 * Dependencies: git (optional, for provenance), http, fs, path, child_process
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Must match RUNTIME_BUILD_PROVENANCE_SCHEMA_VERSION in app/shared/runtime-build-provenance.js.
const PROVENANCE_SCHEMA_VERSION = 'RuntimeBuildProvenanceV1';
const PROVENANCE_REQUEST_PATH = '/__build-provenance.json';

export const MIME_TYPES = Object.freeze({
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.pdf': 'application/pdf'
});

/**
 * Liest die Build-Herkunft des Arbeitsbaums bei jedem Aufruf neu aus Git.
 * @param {string} root
 */
export function readWorkingTreeProvenance(root) {
    const git = args => spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
    const head = git(['rev-parse', 'HEAD']);
    const commit = head.status === 0 ? String(head.stdout).trim().toLowerCase() : '';
    const sourceCommit = /^[0-9a-f]{40}$/.test(commit) ? commit : null;
    let sourceTreeStatus = 'dirty';
    if (sourceCommit) {
        const status = git(['status', '--porcelain', '--untracked-files=normal']);
        if (status.status === 0 && String(status.stdout).trim() === '') sourceTreeStatus = 'clean';
    }
    return {
        schemaVersion: PROVENANCE_SCHEMA_VERSION,
        sourceCommit,
        sourceTreeStatus,
        provider: 'local_dev_server'
    };
}

/**
 * Bildet eine Request-URL auf eine Datei unter root ab. Liefert null fuer
 * Pfade ausserhalb von root und fuer Punkt-Segmente wie .git.
 * @param {string} root
 * @param {string} requestUrl
 * @returns {string|null}
 */
export function resolveRequestPath(root, requestUrl) {
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
    } catch {
        return null;
    }
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    if (relative.includes('\0')) return null;
    const segments = relative.split(/[\\/]/).filter(Boolean);
    if (segments.length === 0 || segments.some(segment => segment.startsWith('.'))) return null;
    const target = path.resolve(root, ...segments);
    const fromRoot = path.relative(root, target);
    if (fromRoot.startsWith('..') || path.isAbsolute(fromRoot)) return null;
    return target;
}

/**
 * @param {{root: string, provenance?: () => object}} options
 * @returns {http.Server}
 */
export function createSuiteServer({ root, provenance = () => readWorkingTreeProvenance(root) }) {
    return http.createServer(async (request, response) => {
        const send = (status, headers = {}, body = '') => {
            response.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
            response.end(request.method === 'HEAD' ? undefined : body);
        };
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            send(405, { Allow: 'GET, HEAD' });
            return;
        }
        let pathname = '';
        try {
            pathname = new URL(request.url || '/', 'http://localhost').pathname;
        } catch {
            send(400);
            return;
        }
        if (pathname === PROVENANCE_REQUEST_PATH) {
            send(200, { 'Content-Type': 'application/json; charset=utf-8' }, JSON.stringify(provenance()));
            return;
        }
        const target = resolveRequestPath(root, request.url || '/');
        if (!target) {
            send(403);
            return;
        }
        try {
            const stat = await fs.promises.stat(target);
            if (!stat.isFile()) {
                send(404);
                return;
            }
            const body = await fs.promises.readFile(target);
            const contentType = MIME_TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream';
            send(200, { 'Content-Type': contentType, 'Content-Length': body.length }, body);
        } catch (error) {
            send(error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : 500);
        }
    });
}

function listen(server, port, host) {
    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
            server.off('error', reject);
            resolve(server.address().port);
        });
    });
}

function openBrowser(url) {
    const [command, args, extra] = process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '""', url], { windowsVerbatimArguments: true }]
        : [process.platform === 'darwin' ? 'open' : 'xdg-open', [url], {}];
    try {
        const child = spawn(command, args, { stdio: 'ignore', detached: true, windowsHide: true, ...extra });
        child.on('error', () => console.log(`Browser bitte selbst oeffnen: ${url}`));
        child.unref();
    } catch {
        console.log(`Browser bitte selbst oeffnen: ${url}`);
    }
}

function parseArgs(argv) {
    const options = { port: 8000, host: '127.0.0.1', proxyPort: 8787, proxy: true, open: false };
    const valueOf = (index, name) => {
        const value = argv[index + 1];
        if (!value || value.startsWith('--')) throw new Error(`${name} requires a value.`);
        return value;
    };
    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];
        if (arg === '--port') options.port = Number(valueOf(index++, arg));
        else if (arg === '--host') options.host = valueOf(index++, arg);
        else if (arg === '--proxy-port') options.proxyPort = Number(valueOf(index++, arg));
        else if (arg === '--no-proxy') options.proxy = false;
        else if (arg === '--open') options.open = true;
        else throw new Error(`Unknown argument '${arg}'. Usage: node scripts/serve.mjs [--port 8000] [--host 127.0.0.1] [--proxy-port 8787] [--no-proxy] [--open]`);
    }
    for (const [name, port] of [['--port', options.port], ['--proxy-port', options.proxyPort]]) {
        if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error(`${name} must be a port number.`);
    }
    return options;
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const servers = [];

    if (options.proxy) {
        const require = createRequire(import.meta.url);
        const { createServer: createProxyServer } = require('../tools/yahoo-proxy.cjs');
        const proxy = createProxyServer();
        try {
            await listen(proxy, options.proxyPort, options.host);
            servers.push(proxy);
            console.log(`Yahoo-Proxy laeuft auf http://${options.host}:${options.proxyPort}`);
        } catch (error) {
            console.warn(`Yahoo-Proxy nicht gestartet (${error.code || error.message}); Online-Kurse fehlen, die Suite laeuft trotzdem.`);
        }
    }

    const suite = createSuiteServer({ root });
    const port = await listen(suite, options.port, options.host);
    servers.push(suite);
    const displayHost = options.host === '127.0.0.1' ? 'localhost' : options.host;
    const url = `http://${displayHost}:${port}/index.html`;
    console.log(`Ruhestand-Suite laeuft auf ${url}`);
    console.log(`Wurzelverzeichnis: ${root}`);
    console.log('Beenden mit Ctrl+C.');
    if (options.open) openBrowser(url);

    const shutdown = () => {
        for (const server of servers) {
            server.closeAllConnections?.();
            server.close();
        }
        process.exit(0);
    };
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, shutdown);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
    main().catch(error => {
        console.error(`Server konnte nicht starten: ${error.message}`);
        process.exitCode = 1;
    });
}
