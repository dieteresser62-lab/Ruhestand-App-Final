import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

console.log('--- Tauri CSP Tests ---');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const tauriConfigPath = path.join(repoRoot, 'src-tauri', 'tauri.conf.json');
const tauriLibPath = path.join(repoRoot, 'src-tauri', 'src', 'lib.rs');
const packageJsonPath = path.join(repoRoot, 'package.json');
const tauriBuildScriptPath = path.join(repoRoot, 'scripts', 'build-tauri.ps1');
const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));
const tauriLib = fs.readFileSync(tauriLibPath, 'utf8');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const tauriBuildScript = fs.readFileSync(tauriBuildScriptPath, 'utf8');
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
assert(connectSrc.includes('https://sdmx.oecd.org'), 'Tauri CSP should allow current OECD SDMX inflation fetches');
assert(!connectSrc.includes('https://stats.oecd.org'), 'Tauri CSP should not retain the retired OECD.Stat host');
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

assert(packageJson?.scripts?.['tauri:build'] === 'tauri build', 'package.json should expose the raw Tauri build gate');
assert(
  packageJson?.scripts?.['build-tauri-exe']?.includes('scripts/build-tauri.ps1'),
  'package.json should expose the checked Windows EXE release workflow'
);
assert(
  tauriBuildScript.includes("$releaseArchiveDirName = 'release-archive'") &&
    tauriBuildScript.includes('Backup-ExistingReleaseExecutable -Path $destExe'),
  'Windows EXE release workflow should archive an existing root EXE before replacement'
);
assert(
  tauriBuildScript.indexOf('Backup-ExistingReleaseExecutable -Path $destExe') <
    tauriBuildScript.indexOf('Copy-Item -Path $sourceExe -Destination $destExe -Force'),
  'Existing root EXE should be archived before the new release EXE is copied'
);

for (const commandName of [
  'load_app_state',
  'save_app_state',
  'quarantine_app_state',
  'confirm_app_close'
]) {
  assert(
    tauriLib.includes(`fn ${commandName}`),
    `Tauri Rust command should exist: ${commandName}`
  );
}

assert(
  tauriLib.includes('target: Option<StateTarget>'),
  'Tauri state commands should keep the optional target payload contract'
);
assert(
  tauriLib.includes('StateTarget::Snapshots') && tauriLib.includes('ruhestand_suite_snapshots.json'),
  'Tauri snapshot target should map to a separate snapshot state file'
);
assert(
  tauriLib.includes('corrupt_state_filename') && tauriLib.includes('.corrupt.'),
  'Tauri quarantine path should keep a target-specific corrupt-state filename'
);
assert(
  tauriLib.includes('state_target_defaults_to_live_file_and_supports_snapshot_file'),
  'Tauri Rust unit tests should cover live and snapshot state target filenames'
);
assert(
  tauriLib.includes('corrupt_state_filename_uses_target_specific_stem'),
  'Tauri Rust unit tests should cover quarantine filename stems'
);

const iconPaths = tauriConfig?.bundle?.icon || [];
for (const iconPath of iconPaths) {
  const fullPath = path.join(repoRoot, 'src-tauri', iconPath);
  assert(fs.existsSync(fullPath), `Tauri bundle icon should exist: ${iconPath}`);
}

console.log('✅ Tauri CSP tests passed');
