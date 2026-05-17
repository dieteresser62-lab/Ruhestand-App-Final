import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

console.log('--- Tauri CSP Tests ---');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const tauriConfigPath = path.join(repoRoot, 'src-tauri', 'tauri.conf.json');
const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));
const security = tauriConfig?.app?.security || {};
const csp = security?.csp || {};
const connectSrc = String(csp?.['connect-src'] || '');
const workerSrc = String(csp?.['worker-src'] || '');
const scriptSrc = String(csp?.['script-src'] || '');
const styleSrc = String(csp?.['style-src'] || '');
const fontSrc = String(csp?.['font-src'] || '');

assert(tauriConfig?.build?.frontendDist === '../dist', 'Tauri should load the synced dist folder');
assert(tauriConfig?.productName === 'RuhestandSuite', 'Tauri product name should match release docs');

const mainWindow = tauriConfig?.app?.windows?.[0] || {};
assert(mainWindow.width === 1920, 'Tauri default window width should stay documented');
assert(mainWindow.height === 1080, 'Tauri default window height should stay documented');
assert(mainWindow.resizable === true, 'Tauri window should remain resizable');

assert(connectSrc.includes('http://127.0.0.1:8787'), 'Tauri CSP should allow the local Yahoo proxy');
assert(connectSrc.includes('http://localhost:8787'), 'Tauri CSP should allow localhost Yahoo proxy fallback');
assert(connectSrc.includes('https://data-api.ecb.europa.eu'), 'Tauri CSP should allow ECB inflation fetches');
assert(connectSrc.includes('https://api.worldbank.org'), 'Tauri CSP should allow World Bank inflation fetches');
assert(connectSrc.includes('https://stats.oecd.org'), 'Tauri CSP should allow OECD inflation fetches');
assert(connectSrc.includes('https://r.jina.ai'), 'Tauri CSP should allow CAPE fetches via r.jina.ai');

assert(workerSrc.includes("'self'"), 'Tauri CSP should allow bundled worker modules');
assert(workerSrc.includes('blob:'), 'Tauri CSP should allow blob worker fallback');
assert(scriptSrc.includes("'self'"), 'Tauri CSP should allow bundled scripts');
assert(scriptSrc.includes("'unsafe-inline'"), 'Tauri CSP should document existing inline script usage');
assert(scriptSrc.includes("'unsafe-eval'"), 'Tauri CSP should document existing dynamic script/eval usage');
assert(styleSrc.includes("'unsafe-inline'"), 'Tauri CSP should allow existing inline styles');
assert(styleSrc.includes('https://fonts.googleapis.com'), 'Tauri CSP should allow Google Fonts stylesheet');
assert(fontSrc.includes('https://fonts.gstatic.com'), 'Tauri CSP should allow Google Fonts assets');

assert(
  security.dangerousDisableAssetCspModification === true,
  'Tauri CSP asset modification is disabled intentionally and must be documented'
);

const iconPaths = tauriConfig?.bundle?.icon || [];
for (const iconPath of iconPaths) {
  const fullPath = path.join(repoRoot, 'src-tauri', iconPath);
  assert(fs.existsSync(fullPath), `Tauri bundle icon should exist: ${iconPath}`);
}

console.log('✅ Tauri CSP tests passed');
