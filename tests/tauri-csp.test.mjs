import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

console.log('--- Tauri CSP Tests ---');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const tauriConfigPath = path.join(repoRoot, 'src-tauri', 'tauri.conf.json');
const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));
const connectSrc = String(tauriConfig?.app?.security?.csp?.['connect-src'] || '');

assert(connectSrc.includes('http://127.0.0.1:8787'), 'Tauri CSP should allow the local Yahoo proxy');
assert(connectSrc.includes('https://data-api.ecb.europa.eu'), 'Tauri CSP should allow ECB inflation fetches');
assert(connectSrc.includes('https://api.worldbank.org'), 'Tauri CSP should allow World Bank inflation fetches');
assert(connectSrc.includes('https://stats.oecd.org'), 'Tauri CSP should allow OECD inflation fetches');
assert(connectSrc.includes('https://r.jina.ai'), 'Tauri CSP should allow CAPE fetches via r.jina.ai');

console.log('✅ Tauri CSP tests passed');
