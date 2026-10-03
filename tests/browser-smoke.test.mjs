import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMonteCarloBrowserRegression } from './simulator-monte-carlo-browser.mjs';
import { SNAPSHOT_KINDS } from '../app/shared/snapshot-archive.js';
import { formatCurrency } from '../app/shared/shared-formatting.js';
import { BALANCE_UPDATE_DEBOUNCE_MS } from '../app/balance/balance-config.js';
import { prepareExpensesHistoryMetrics } from '../app/balance/balance-expenses-metrics.js';
import { installWealthBrowserUpdateObserver } from './wealth-browser-update-observer.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
const projectRoot = path.resolve(__dirname, '..');

const MIME_TYPES = new Map([
    ['.html', 'text/html; charset=utf-8'],
    ['.js', 'text/javascript; charset=utf-8'],
    ['.mjs', 'text/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'],
    ['.json', 'application/json; charset=utf-8'],
    ['.png', 'image/png'],
    ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'],
    ['.svg', 'image/svg+xml'],
    ['.ico', 'image/x-icon']
]);

const EXTERNAL_HOSTS = new Set([
    'fonts.googleapis.com',
    'fonts.gstatic.com'
]);
const BALANCE_STATE_KEY = 'ruhestandsmodellValues_v29_guardrails';
const EXPENSES_KEY = 'balance_expenses_v1';

function createBalanceStorage(activeYear = 2025) {
    const inputs = {
        aktuellesAlter: 67, floorBedarf: 12000, flexBedarf: 24000, minimumFlexAnnual: 0,
        flexBudgetAnnual: 7000, flexBudgetYears: 5, flexBudgetRecharge: 5000,
        inflation: 2, tagesgeld: 100000, geldmarktEtf: 0, depotwertAlt: 500000,
        depotwertNeu: 0, endeVJ: 100, endeVJ_1: 95, endeVJ_2: 90, endeVJ_3: 85,
        ath: 105, jahreSeitAth: 1, renteAktiv: false, renteMonatlich: 0,
        marketCapeRatio: 25, capeRatio: 25
    };
    return {
        [BALANCE_STATE_KEY]: JSON.stringify({
            inputs,
            lastState: { cumulativeInflationFactor: 1, lastInflationAppliedAtAge: 67, taxState: { lossCarry: 0 } },
            annualPeriodMetadata: { schemaVersion: 1, lastCommittedPeriod: null, pendingCommit: null }
        }),
        profile_aktuelles_alter: '67',
        profile_tagesgeld: '100000',
        [EXPENSES_KEY]: JSON.stringify({ version: 1, activeYear, years: { [activeYear]: { months: {} } } })
    };
}

function createBrowserTranche(overrides = {}) {
    return {
        schemaVersion: 2,
        trancheId: 'browser-lot-1',
        name: 'Synthetische Browser-Tranche',
        isin: '',
        ticker: 'FLOW.DE',
        shares: 2,
        purchasePrice: 100,
        currentPrice: 90,
        purchaseDate: '2024-01-02',
        category: 'equity',
        type: 'aktien_neu',
        tqf: 0.3,
        taxExempt: false,
        notes: '',
        ...overrides
    };
}

function createBrowserProfileStorage(profiles, currentProfileId) {
    const registry = {
        version: 1,
        profiles: Object.fromEntries(Object.entries(profiles).map(([id, profile]) => [id, {
            meta: {
                id,
                name: profile.name,
                createdAt: '2026-07-14T00:00:00.000Z',
                updatedAt: '2026-07-14T00:00:00.000Z',
                belongsToHousehold: profile.belongsToHousehold !== false
            },
            data: {
                ...(profile.omitTranches === true
                    ? {}
                    : { depot_tranchen: profile.tranchesRaw ?? '[]' }),
                profile_tagesgeld: profile.tagesgeld ?? '10000',
                profile_aktuelles_alter: profile.alter ?? '67',
                ...(profile.extraData || {}),
                ...(profile.healthBucketRaw !== undefined
                    ? { profile_health_bucket: profile.healthBucketRaw }
                    : {}),
                ...(profile.balanceStateRaw !== undefined
                    ? { [BALANCE_STATE_KEY]: profile.balanceStateRaw }
                    : {})
            }
        }]))
    };
    return {
        rs_profiles_v1: JSON.stringify(registry),
        rs_current_profile: currentProfileId,
        rs_active_profile: currentProfileId
    };
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function resolveRequestPath(url) {
    const parsed = new URL(url, 'http://127.0.0.1');
    const decodedPath = decodeURIComponent(parsed.pathname);
    const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.slice(1);
    const targetPath = path.resolve(projectRoot, relativePath);
    const relativeToRoot = path.relative(projectRoot, targetPath);
    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) return null;
    return targetPath;
}

function startStaticServer() {
    const server = http.createServer((req, res) => {
        try {
            const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
            if (requestUrl.pathname === '/__build-provenance.json') {
                const body = JSON.stringify({
                    schemaVersion: 'RuntimeBuildProvenanceV1',
                    sourceCommit: 'b'.repeat(40),
                    sourceTreeStatus: 'clean',
                    provider: 'browser_static_endpoint'
                });
                res.writeHead(200, {
                    'content-type': 'application/json; charset=utf-8',
                    'cache-control': 'no-store'
                });
                res.end(body);
                return;
            }
            const targetPath = resolveRequestPath(req.url || '/');
            if (!targetPath) {
                res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
                res.end('Forbidden');
                return;
            }
            if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
                res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
                res.end('Not found');
                return;
            }
            const ext = path.extname(targetPath).toLowerCase();
            res.writeHead(200, {
                'content-type': MIME_TYPES.get(ext) || 'application/octet-stream',
                'cache-control': 'no-store'
            });
            fs.createReadStream(targetPath).pipe(res);
        } catch (error) {
            res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
            res.end(error.stack || String(error));
        }
    });

    server.keepAliveTimeout = 1000;

    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            server.off('error', reject);
            const address = server.address();
            resolve({
                server,
                baseUrl: `http://127.0.0.1:${address.port}`
            });
        });
    });
}

function stopStaticServer(server) {
    return new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
    });
}

async function createPage(browser, label, options = {}) {
    const context = await browser.newContext({
        viewport: { width: 1366, height: 900 },
        locale: 'de-DE',
        ...(options.fixedTime ? { timezoneId: 'Europe/Berlin' } : {})
    });
    await context.addInitScript(storage => {
        if (!sessionStorage.getItem('__browserSmokeSeeded')) {
            Object.entries(storage).forEach(([key, value]) => localStorage.setItem(key, value));
            sessionStorage.setItem('__browserSmokeSeeded', 'true');
        }
        window.alert = message => {
            window.__browserSmokeAlerts = [...(window.__browserSmokeAlerts || []), String(message)];
        };
        window.confirm = () => true;
        window.prompt = () => 'offen';
        window.__browserSmokeMessages = [];
        addEventListener('DOMContentLoaded', () => {
            for (const id of ['error-container', 'toast-container', 'action-error-container']) {
                const target = document.getElementById(id);
                if (!target) continue;
                let previousActions = new Map();
                new MutationObserver(() => {
                    if (id === 'action-error-container') {
                        const current = new Map();
                        for (const entry of target.querySelectorAll('.action-error-entry')) {
                            const text = entry.querySelector('.action-error-text')?.textContent;
                            const previous = previousActions.get(entry.dataset.scope);
                            if (text && (previous?.entry !== entry || previous?.text !== text)) {
                                window.__browserSmokeMessages.push(text);
                            }
                            current.set(entry.dataset.scope, { entry, text });
                        }
                        previousActions = current;
                        return;
                    }
                    const text = id === 'toast-container'
                        ? target.querySelector('.toast-text')?.textContent : target.textContent;
                    if (text) window.__browserSmokeMessages.push(text);
                }).observe(target, { childList: true, subtree: true, characterData: true });
            }
        });
    }, options.storage || {});
    if (options.observeWealthUpdates) {
        // Auch nach Reload und Profilnavigation vor dem ersten Seitenskript installieren.
        await context.addInitScript(installWealthBrowserUpdateObserver, BALANCE_UPDATE_DEBOUNCE_MS);
    }
    if (options.engineMismatch) {
        await context.addInitScript(() => {
            window.EngineAPI = {
                getVersion() {
                    return { api: '0.0', build: 'e2e-mismatch' };
                }
            };
        });
    }
    await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (options.engineMismatch && url.pathname === '/engine.js') {
            await route.fulfill({
                contentType: 'text/javascript',
                body: ''
            });
            return;
        }
        if (options.quoteFixtures && url.hostname === '127.0.0.1' && url.port === '8787') {
            const symbol = String(url.searchParams.get(url.pathname === '/search' ? 'q' : 'symbol') || '').trim().toUpperCase();
            const fixture = typeof options.quoteFixtures === 'object'
                ? (options.quoteFixtures[symbol] ?? options.quoteFixtures.default)
                : options.quoteFixtures;
            if (fixture === 'offline' || fixture?.offline === true) {
                await route.abort('failed');
                return;
            }
            if (url.pathname === '/search') {
                await route.fulfill({ json: { quotes: symbol ? [{ symbol }] : [] } });
                return;
            }
            if (url.pathname === '/quote') {
                await route.fulfill({ json: {
                    symbol,
                    price: fixture?.price ?? 105,
                    currency: fixture?.currency ?? 'EUR',
                    asOf: fixture?.asOf ?? Math.floor(Date.now() / 1000),
                    source: fixture?.source ?? 'yahoo-chart'
                } });
                return;
            }
        }
        if (options.annualFixtures && url.hostname === '127.0.0.1' && url.port === '8787') {
            const year = options.annualFixtures.targetYear ?? 2025;
            await route.fulfill({ json: { chart: { result: [{
                timestamp: [Math.floor(Date.UTC(year, 11, 30) / 1000)],
                indicators: { quote: [{ close: [120] }] }
            }] } } });
            return;
        }
        if (options.annualFixtures && url.hostname === 'data-api.ecb.europa.eu') {
            await route.fulfill({ json: {} });
            return;
        }
        if (options.annualFixtures && url.hostname === 'api.worldbank.org') {
            await route.fulfill({ json: [{ lastupdated: '2026-07-01' }, [{
                indicator: { id: 'FP.CPI.TOTL.ZG' }, countryiso3code: 'DEU', date: String(options.annualFixtures.targetYear ?? 2025), value: 2
            }]] });
            return;
        }
        if (options.annualFixtures && url.hostname === 'r.jina.ai') {
            const year = (options.annualFixtures.targetYear ?? 2025) + 1;
            await route.fulfill({ contentType: 'text/plain', body: `${year}.01 100 25.5` });
            return;
        }
        if (EXTERNAL_HOSTS.has(url.hostname)) {
            await route.fulfill({
                status: 200,
                contentType: url.hostname === 'fonts.googleapis.com' ? 'text/css' : 'font/woff2',
                body: ''
            });
            return;
        }
        if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
            await route.abort('blockedbyclient');
            return;
        }
        await route.continue();
    });

    const page = await context.newPage();
    // Nur Date fixieren; Debounce, Netzwerk und Persistenz laufen mit echten Timern.
    if (options.fixedTime) await page.clock.setFixedTime(new Date(options.fixedTime));
    const errors = [];
    page.on('console', message => {
        if (message.type() === 'error') {
            errors.push(`[console.error] ${message.text()}`);
        }
    });
    page.on('pageerror', error => {
        errors.push(`[pageerror] ${error.message}`);
    });

    return {
        page,
        errors,
        async close() {
            await context.close();
        },
        assertNoErrors(allowed = []) {
            const unexpected = errors.filter(error => !allowed.some(fragment => error.includes(fragment)));
            assert(unexpected.length === 0, `${label} emitted browser errors:\n${unexpected.join('\n')}`);
        }
    };
}

async function openSmokePage(browser, baseUrl, entry, options) {
    const smoke = await createPage(browser, entry, options);
    await smoke.page.goto(`${baseUrl}/${entry}`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
    });
    await smoke.page.waitForLoadState('load', { timeout: 15000 });
    await smoke.page.waitForTimeout(250);
    return smoke;
}

async function readIndexedDb(page, storeName, key) {
    return page.evaluate(({ storeName, key }) => new Promise((resolve, reject) => {
        const request = indexedDB.open('ruhestand-suite');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const store = db.transaction(storeName).objectStore(storeName);
            const read = key === null ? store.count() : store.get(key);
            read.onerror = () => reject(read.error);
            read.onsuccess = () => { db.close(); resolve(read.result ?? null); };
        };
    }), { storeName, key });
}

async function readDownloadText(download) {
    const downloadPath = await download.path();
    assert(downloadPath, 'Browser download must expose a readable temporary path');
    return fs.readFileSync(downloadPath, 'utf8');
}

async function runIndexSmoke(browser, baseUrl) {
    const smoke = await openSmokePage(browser, baseUrl, 'index.html');
    const { page } = smoke;
    await page.locator('h1').filter({ hasText: 'Ruhestand-Apps Suite' }).waitFor({ state: 'visible' });
    await page.locator('a[href="Balance.html"]').waitFor({ state: 'visible' });
    await page.locator('a[href="Simulator.html"]').waitFor({ state: 'visible' });
    smoke.assertNoErrors();
    await smoke.close();
}

async function runFullBackupRecoverySmoke(browser, baseUrl) {
    const oldProfileId = 'browser-backup-old';
    const newProfileId = 'browser-backup-new';
    const storage = createBrowserProfileStorage({
        [oldProfileId]: {
            name: 'Browser Backup Alt',
            tagesgeld: '15000',
            alter: '66'
        }
    }, oldProfileId);
    const smoke = await openSmokePage(browser, baseUrl, 'index.html', { storage });
    const { page } = smoke;
    await page.locator('#fullBackupImportBtn').waitFor({ state: 'attached' });
    const previousRegistryRaw = (await readIndexedDb(page, 'kv', 'rs_profiles_v1')).value;
    const newRegistry = {
        version: 1,
        profiles: {
            [newProfileId]: {
                meta: {
                    id: newProfileId,
                    name: 'Browser Backup Neu',
                    createdAt: '2026-07-28T00:00:00.000Z',
                    updatedAt: '2026-07-28T00:00:00.000Z',
                    belongsToHousehold: true
                },
                data: {
                    profile_tagesgeld: '42000',
                    profile_aktuelles_alter: '67'
                }
            }
        }
    };
    const records = {
        rs_profiles_v1: JSON.stringify(newRegistry),
        rs_current_profile: newProfileId,
        rs_active_profile: newProfileId
    };
    const importResult = await page.evaluate(async ({ records }) => {
        const {
            FULL_BACKUP_APP_ID,
            FULL_BACKUP_SCHEMA_VERSION,
            FULL_BACKUP_TYPE,
            importFullPersistenceBackup
        } = await import('./app/shared/persistence-backup.js');
        return importFullPersistenceBackup({
            backupType: FULL_BACKUP_TYPE,
            app: FULL_BACKUP_APP_ID,
            schemaVersion: FULL_BACKUP_SCHEMA_VERSION,
            exportedAt: '2026-07-28T00:00:00.000Z',
            recordCount: Object.keys(records).length,
            records,
            localStorage: records
        });
    }, { records });
    assert(importResult.ok, `Browser full-backup restore must succeed: ${JSON.stringify(importResult)}`);
    assert(typeof importResult.recoverySnapshotId === 'string' && importResult.recoverySnapshotId,
        'Browser full-backup restore must return a persistent recovery snapshot ID');

    const importedRegistryRaw = (await readIndexedDb(page, 'kv', 'rs_profiles_v1')).value;
    assert(Boolean(JSON.parse(importedRegistryRaw).profiles[newProfileId]),
        'Browser full-backup restore must replace the live profile registry');
    assert((await readIndexedDb(page, 'kv', 'rs_current_profile')).value === newProfileId,
        'Browser full-backup restore must replace the current profile selector');

    const recoveryRow = await readIndexedDb(page, 'snapshots', importResult.recoverySnapshotId);
    const recoverySnapshot = recoveryRow?.snapshot || recoveryRow;
    assert(recoverySnapshot?.kind === SNAPSHOT_KINDS.fullBackupImportRecovery,
        'Browser full-backup restore must persist the typed recovery snapshot');
    assert(recoverySnapshot?.records?.rs_profiles_v1 === previousRegistryRaw,
        'Browser full-backup recovery snapshot must preserve the previous registry byte-for-byte');
    assert(recoverySnapshot?.records?.rs_current_profile === oldProfileId,
        'Browser full-backup recovery snapshot must preserve the previous profile selector');
    const recoveryIndexEntry = await page.evaluate(async ({ recoverySnapshotId }) => {
        const { SnapshotArchive } = await import('./app/shared/snapshot-archive.js');
        const snapshots = await SnapshotArchive.listSnapshots();
        return snapshots.find(entry => entry.id === recoverySnapshotId) || null;
    }, { recoverySnapshotId: importResult.recoverySnapshotId });
    assert(recoveryIndexEntry?.kind === SNAPSHOT_KINDS.fullBackupImportRecovery,
        'Browser snapshot index must retain the registered full-backup recovery kind');
    assert(recoveryIndexEntry?.restoreScope?.profileRegistryMode === 'replace-all-rollback',
        'Browser snapshot index must retain the full registry restore scope');
    assert(recoveryIndexEntry?.restoreScope?.profileLiveDataMode === 'replace-all-rollback',
        'Browser snapshot index must retain the full profile-live-data restore scope');

    const rollbackResult = await page.evaluate(async ({ recoverySnapshotId }) => {
        const { StorageManager } = await import('./app/balance/balance-storage.js');
        return StorageManager.rollbackImportReplace({ recoverySnapshotId });
    }, { recoverySnapshotId: importResult.recoverySnapshotId });
    assert(rollbackResult.ok, `Browser full-backup recovery must be restorable: ${JSON.stringify(rollbackResult)}`);
    const restoredRegistryRaw = (await readIndexedDb(page, 'kv', 'rs_profiles_v1')).value;
    assert(restoredRegistryRaw === previousRegistryRaw,
        'Browser full-backup recovery must restore the previous registry byte-for-byte');
    assert((await readIndexedDb(page, 'kv', 'rs_current_profile')).value === oldProfileId,
        'Browser full-backup recovery must restore the previous current profile selector');
    assert((await readIndexedDb(page, 'kv', 'rs_active_profile')).value === oldProfileId,
        'Browser full-backup recovery must restore the previous active profile selector');
    smoke.assertNoErrors();
    await smoke.close();
}

async function runBalanceSmoke(browser, baseUrl) {
    const smoke = await openSmokePage(browser, baseUrl, 'Balance.html');
    const { page } = smoke;
    await page.locator('h1').filter({ hasText: 'Ruhestand-Balancing' }).waitFor({ state: 'visible' });
    await page.locator('#btnJahresUpdate').waitFor({ state: 'visible' });
    await page.locator('.tab-btn[data-tab="settings"]').click();
    await page.locator('#tab-settings').waitFor({ state: 'visible' });
    await page.locator('#floorBedarf').fill('18000');
    await page.locator('#floorBedarf').dispatchEvent('input');
    await page.waitForTimeout(350);
    smoke.assertNoErrors();
    await smoke.close();
}

async function runBalanceMembershipReload(browser, baseUrl) {
    const registry = {
        version: 1,
        profiles: {
            default: { meta: { id: 'default', name: 'Default', belongsToHousehold: true }, data: {} },
            secondary: { meta: { id: 'secondary', name: 'Sekundaer', belongsToHousehold: true }, data: {} }
        }
    };
    const smoke = await openSmokePage(browser, baseUrl, 'Balance.html', { storage: {
        rs_profiles_v1: JSON.stringify(registry), rs_current_profile: 'default', rs_active_profile: 'default'
    } });
    const member = smoke.page.locator('input[data-profile-id="secondary"]');
    await member.waitFor({ state: 'visible' });
    await member.uncheck();
    await smoke.page.waitForTimeout(400);
    await smoke.page.reload({ waitUntil: 'load' });
    await smoke.page.waitForTimeout(250);
    assert(!(await member.isChecked()), 'Profilabwahl muss nach echtem Browser-Reload erhalten bleiben');
    smoke.assertNoErrors();
    await smoke.close();
}

async function runBalanceSharedTrancheIds(browser, baseUrl) {
    const sharedTrancheId = 'shared-browser-lot';
    const activeProfileTranches = JSON.stringify([createBrowserTranche({
        trancheId: sharedTrancheId,
        name: 'Haushalt A Tranche'
    })]);
    const balanceStorage = createBalanceStorage(2025);
    const balanceState = JSON.parse(balanceStorage[BALANCE_STATE_KEY]);
    balanceState.inputs = {
        ...balanceState.inputs,
        floorBedarf: 0,
        flexBedarf: 0,
        liquidityRunwayYears: 1
    };
    balanceStorage[BALANCE_STATE_KEY] = JSON.stringify(balanceState);
    const storage = {
        ...balanceStorage,
        ...createBrowserProfileStorage({
            'browser-household-a': {
                name: 'Haushalt A',
                tranchesRaw: activeProfileTranches,
                tagesgeld: '10000'
            },
            'browser-household-b': {
                name: 'Haushalt B',
                tranchesRaw: JSON.stringify([createBrowserTranche({
                    trancheId: sharedTrancheId,
                    name: 'Haushalt B Tranche',
                    currentPrice: 110
                })]),
                tagesgeld: '20000'
            }
        }, 'browser-household-a'),
        depot_tranchen: activeProfileTranches
    };
    const smoke = await openSmokePage(browser, baseUrl, 'Balance.html', { storage });
    const { page } = smoke;
    await page.waitForFunction(() => document.querySelectorAll('#profilverbund-profile-list input:checked').length === 2);
    await page.waitForFunction(() => Array.isArray(window.__profilverbundTranchenOverride)
        && window.__profilverbundTranchenOverride.length === 2);

    const runtimeIds = await page.evaluate(() => window.__profilverbundTranchenOverride.map(tranche => tranche.trancheId));
    assert(runtimeIds.includes('browser-household-a:shared-browser-lot'),
        `Erste Profiltranche braucht eine profilbezogene Laufzeit-ID: ${JSON.stringify(runtimeIds)}`);
    assert(runtimeIds.includes('browser-household-b:shared-browser-lot'),
        `Zweite Profiltranche braucht eine eigene Laufzeit-ID: ${JSON.stringify(runtimeIds)}`);
    const errorText = await page.locator('#error-container').textContent();
    assert(!errorText.includes('Der Tranchenbestand ist fehlerhaft'), 'Gleiche profilinterne IDs duerfen den Profilverbund nicht blockieren');
    smoke.assertNoErrors();
    await smoke.close();
}

async function runBalanceEngineGate(browser, baseUrl) {
    const smoke = await openSmokePage(browser, baseUrl, 'Balance.html', { engineMismatch: true });
    const banner = smoke.page.locator('#engine-version-alert');
    await banner.filter({ hasText: 'FATALER FEHLER' }).waitFor({ state: 'visible' });
    assert(await smoke.page.locator('#miniSummary').textContent() === '', 'Engine-Mismatch darf kein Ergebnis rendern');
    smoke.assertNoErrors(['Initialisierung abgebrochen wegen Engine-Fehler']);
    await smoke.close();
}

async function runBalanceAnnualPreflight(browser, baseUrl) {
    const smoke = await openSmokePage(browser, baseUrl, 'Balance.html', { storage: createBalanceStorage(2026) });
    await smoke.page.locator('#profilverbund-profile-list input').waitFor({ state: 'visible' });
    const age = smoke.page.locator('#aktuellesAlter');
    await age.waitFor({ state: 'attached' });
    const before = await age.inputValue();
    await smoke.page.locator('#jahresabschlussBtn').click();
    await smoke.page.locator('#action-error-container .action-error-text').filter({ hasText: 'muss fuer den Abschluss auf 2025 stehen' }).waitFor();
    assert(await age.inputValue() === before, 'Fehlgeschlagener Preflight darf das Alter nicht mutieren');
    assert(await readIndexedDb(smoke.page, 'snapshots', null) === 0, 'Fehlgeschlagener Preflight darf keinen Snapshot anlegen');
    smoke.assertNoErrors();
    await smoke.close();
}

async function runBalancePreviewLifecycle(browser, baseUrl) {
    const seededStorage = createBalanceStorage(2025);
    const seededState = JSON.parse(seededStorage[BALANCE_STATE_KEY]);
    seededState.lastState = {
        ...seededState.lastState,
        taxState: { lossCarry: 20000 },
        flexBudget: { balanceYears: 3 },
        vpw: { streak: 4 },
        lastWithdrawal: 36000
    };
    seededStorage[BALANCE_STATE_KEY] = JSON.stringify(seededState);

    const smoke = await openSmokePage(browser, baseUrl, 'Balance.html', { storage: seededStorage });
    await smoke.page.locator('#profilverbund-profile-list input').waitFor({ state: 'visible' });
    await smoke.page.locator('#floorBedarf').waitFor({ state: 'attached' });
    await smoke.page.waitForTimeout(750);

    const afterInitialRender = JSON.parse(
        (await readIndexedDb(smoke.page, 'kv', BALANCE_STATE_KEY)).value
    );
    assert(
        JSON.stringify(afterInitialRender.lastState) === JSON.stringify(seededState.lastState),
        'Initialrender darf den fachlichen Balance-State nicht fortschreiben'
    );

    await smoke.page.locator('#floorBedarf').evaluate(element => {
        element.value = '13000';
        for (let count = 0; count < 5; count++) {
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });
    await smoke.page.waitForTimeout(750);

    const afterRepeatedInputs = JSON.parse(
        (await readIndexedDb(smoke.page, 'kv', BALANCE_STATE_KEY)).value
    );
    assert(afterRepeatedInputs.inputs.floorBedarf === 13000, 'Input-only Persistenz muss reload-fest bleiben');
    assert(
        JSON.stringify(afterRepeatedInputs.lastState) === JSON.stringify(seededState.lastState),
        'Fuenf identische Eingaben duerfen Verlustvortrag, Flex, VPW und letzte Entnahme nicht fortschreiben'
    );
    assert(
        afterRepeatedInputs.balanceStateLifecycle === undefined,
        'Input-only Persistenz darf keinen Periodencommit vortaeuschen'
    );
    smoke.assertNoErrors();
    await smoke.close();
}

async function runBalanceThreeBucketBear(browser, baseUrl) {
    const storage = createBalanceStorage(2025);
    const seededState = JSON.parse(storage[BALANCE_STATE_KEY]);
    seededState.inputs = {
        ...seededState.inputs,
        inflation: 0,
        liquidityRunwayYears: 1,
        endeVJ: 70,
        endeVJ_1: 100,
        endeVJ_2: 100,
        endeVJ_3: 100,
        ath: 100,
        jahreSeitAth: 1,
        decumulation: {
            mode: '3_bucket_jilge',
            bondTargetFactor: 5,
            drawdownTrigger: 15,
            bondRefillThreshold: 80
        }
    };
    storage[BALANCE_STATE_KEY] = JSON.stringify(seededState);

    const smoke = await openSmokePage(browser, baseUrl, 'Balance.html', { storage });
    const { page } = smoke;
    await page.locator('#profilverbund-profile-list input').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.getElementById('entnahmeStrategie')?.value === '3_bucket_jilge');
    const diagnosis = await page.evaluate(async lastState => {
        const { UIReader } = await import('./app/balance/balance-reader.js');
        const inputs = UIReader.readAllInputs();
        const result = window.EngineAPI.simulateSingleYear({
            ...inputs,
            finalizeThreeBucketAction: true
        }, lastState);
        return {
            strategy: inputs.decumulation?.mode,
            realReturnEq: result.ui?.market?.realReturnEq,
            threeBucket: result.ui?.threeBucket || null
        };
    }, seededState.lastState);
    assert(
        diagnosis.strategy === '3_bucket_jilge'
        && diagnosis.realReturnEq < -0.15
        && diagnosis.threeBucket?.isBadYear === true,
        `Browser 3-Bucket bear diagnosis must use the real engine return: ${JSON.stringify(diagnosis)}`
    );
    assert(diagnosis.threeBucket?.is3Bucket === true,
        'Browser 3-Bucket diagnosis must remain attached to the selected strategy');
    smoke.assertNoErrors();
    await smoke.close();
}

async function runBalanceFiveYearRunwayForcedSale(browser, baseUrl) {
    const smoke = await openSmokePage(browser, baseUrl, 'Balance.html', {
        storage: createBalanceStorage(2025)
    });
    const { page } = smoke;
    await page.locator('#profilverbund-profile-list input').waitFor({ state: 'visible' });
    const witness = await page.evaluate(async () => {
        const { UIReader } = await import('./app/balance/balance-reader.js');
        const base = UIReader.readAllInputs();
        const detailledTranches = [{
            trancheId: 'runway-witness:eq',
            schemaVersion: 2,
            sourceProfileId: 'runway-witness',
            marketValue: 500000,
            costBasis: 250000,
            shares: 1000,
            purchasePrice: 250,
            currentPrice: 500,
            purchaseDate: '2000-01-01',
            type: 'aktien_alt',
            category: 'equity',
            tqf: 0.3,
            taxExempt: false
        }];
        const run = liquidityRunwayYears => window.EngineAPI.simulateSingleYear({
            ...base,
            floorBedarf: 12000,
            flexBedarf: 24000,
            tagesgeld: 100000,
            geldmarktEtf: 0,
            aktuelleLiquiditaet: 100000,
            depotwertAlt: 500000,
            depotwertNeu: 0,
            costBasisAlt: 250000,
            detailledTranches,
            liquidityRunwayYears
        }, null);
        const project = result => ({
            error: result?.error?.message || null,
            configuredRunwayYears: result?.input?.liquidityRunwayYears,
            actionType: result?.ui?.action?.type || 'NONE',
            grossSale: Array.isArray(result?.ui?.action?.quellen)
                ? result.ui.action.quellen.reduce((sum, entry) => sum + (Number(entry.brutto) || 0), 0)
                : 0
        });
        return { oneYear: project(run(1)), fiveYears: project(run(5)) };
    });
    assert(!witness.oneYear.error && !witness.fiveYears.error,
        `Runway forced-sale witness must execute without engine errors: ${JSON.stringify(witness)}`);
    assert(Math.abs(witness.oneYear.grossSale - 50000) <= 0.01,
        `One-year runway control arm must pin the documented 50,000 EUR gross sale: ${JSON.stringify(witness)}`);
    assert(Math.abs(witness.fiveYears.grossSale - 80000) <= 0.01,
        `Five-year runway arm must pin the Slice-17 post-policy 80,000 EUR gross sale: ${JSON.stringify(witness)}`);
    assert(witness.oneYear.configuredRunwayYears === 1 && witness.fiveYears.configuredRunwayYears === 5,
        `Forced-sale witness must preserve both configured runway arms end to end: ${JSON.stringify(witness)}`);
    smoke.assertNoErrors();
    await smoke.close();
}

function createWealthBrowserTranches() {
    return JSON.stringify([
        createBrowserTranche({ trancheId: 'wealth-old', type: 'aktien_alt', shares: 340,
            currentPrice: 100, purchaseDate: '2008-01-02', taxExempt: true }),
        createBrowserTranche({ trancheId: 'wealth-new', shares: 450, currentPrice: 100 }),
        createBrowserTranche({ trancheId: 'wealth-money', category: 'money_market', type: 'geldmarkt',
            shares: 230, currentPrice: 100, tqf: 0 })
    ]);
}

async function readBalanceBrowserState(page) {
    return JSON.parse((await readIndexedDb(page, 'kv', BALANCE_STATE_KEY)).value);
}

async function captureWealthBrowserStand(page, keyboard = false) {
    const button = page.getByRole('button', { name: 'Stand jetzt erfassen', exact: true });
    if (keyboard) {
        await button.focus();
        await page.keyboard.press('Enter');
    } else {
        await button.click();
    }
    await page.locator('#wealthHistoryStatus').filter({ hasText: 'Stand gesichert' }).waitFor();
}

async function assertWealthBrowserVisibility(page, expanded, count = null) {
    const buttons = page.locator('.tab-buttons > .tab-btn');
    assert(JSON.stringify(await buttons.allTextContents()) === JSON.stringify([
        'Jahres-Update', 'Einstellungen & Strategie', 'Ausgaben-Check', 'Auswertung'
    ]), 'Genau vier Haupttabs in bisheriger Reihenfolge');
    assert(await page.locator('#tab-wealth').isVisible() === expanded, 'Tatsächliche Tabaktivität');
    assert(await page.locator('.tab-btn[data-tab="wealth"]').evaluate(el => el.classList.contains('active')) === expanded,
        'Buttonaktivität entspricht Verlaufspanel');
    assert(await page.locator('#captureWealthBtn').count() === 1, 'Genau eine Capturetaste');
    assert(await page.locator('#tab-wealth #captureWealthBtn').count() === 1, 'Capture ausschließlich im Verlaufspanel');
    assert(await page.locator('.results-column .wealth-history, .results-column #captureWealthBtn').count() === 0,
        'Ergebnisspalte enthält keinen Verlauf oder Capture');
    assert(await page.locator('#toggleWealthHistoryBtn').count() === 0, 'Kein Toggle mehr vorhanden');
    const entries = (await readBalanceBrowserState(page)).wealthHistory?.entries || [];
    const latest = entries.reduce((max, entry) => entry.asOf > max ? entry.asOf : max, '');
    const expectedDate = latest ? `Zuletzt erfasst am ${latest.split('-').reverse().join('.')}` : 'Noch keine Stände erfasst';
    await page.waitForFunction(expected => document.getElementById('wealthHistoryDate').textContent === expected, expectedDate);
    assert(await page.locator('#wealthHistoryDate').textContent() === expectedDate, 'Exaktes Datum aus größtem bestätigten Stichtag');
    if (count !== null) {
        await page.waitForFunction(expected => document.getElementById('wealthHistoryCount').textContent === expected,
            count ? count + (count === 1 ? ' Stand' : ' Stände') : '');
        assert(await page.locator('#wealthHistoryCount').textContent() === (count ? count + (count === 1 ? ' Stand' : ' Stände') : ''),
            'Aktuelle Anzahl bleibt außerhalb der Details sichtbar');
    }
    if (!expanded) {
        assert(await page.locator('#tab-wealth svg, #tab-wealth table').count() === 0, 'Geschlossen keine erzeugten Inhalte');
        assert(await page.getByRole('region', { name: 'Vermögensdiagramm', exact: true }).count() === 0
            && await page.getByRole('region', { name: 'Tabelle der Vermögensstände', exact: true }).count() === 0,
        'Geschlossene Details fehlen aus dem Zugänglichkeitsbaum');
        await page.locator('#wealthHistoryChart').evaluate(el => el.focus());
        assert(await page.locator('#wealthHistoryChart').evaluate(el => el !== document.activeElement), 'Verborgene Region nicht fokussierbar');
        for (const id of ['expensesHistoryChart', 'expensesHistoryTable']) {
            const region = page.locator(`#${id}`);
            assert(await region.getAttribute('tabindex') === '0', 'Ausgabenregion behält native Tastaturbedienung');
            await region.evaluate(el => el.focus());
            assert(await region.evaluate(el => el !== document.activeElement), 'Inaktive Ausgabenregion nicht fokussierbar');
        }
        assert(await page.getByRole('region', { name: 'Diagramm der Jahresausgaben', exact: true }).count() === 0
            && await page.getByRole('region', { name: 'Tabelle der Jahresausgaben', exact: true }).count() === 0,
        'Inaktive Ausgabenregionen fehlen aus dem Zugänglichkeitsbaum');
    } else {
        const chart = page.getByRole('region', { name: 'Vermögensdiagramm', exact: true });
        const table = page.getByRole('region', { name: 'Tabelle der Vermögensstände', exact: true });
        assert(await chart.count() === 1 && await table.count() === 1,
            'Offene Regionen mit bisherigen Namen im Zugänglichkeitsbaum vorhanden');
        const entryCount = count ?? (await readBalanceBrowserState(page)).wealthHistory?.entries.length ?? 0;
        if (entryCount === 0) {
            // Leere Container haben keine Höhe; zugänglich bleiben sie trotzdem.
            assert(await page.locator('#wealthHistoryHint').filter({ hasText: 'Noch keine Stände erfasst' }).isVisible(),
                'Offene leere Historie zeigt den sichtbaren Leerhinweis');
            assert(await page.locator('#wealthHistoryChart svg, #wealthHistoryTable table').count() === 0,
                'Leere Historie erzeugt keine Diagramm- oder Tabelleninhalte');
            for (const region of [chart, table]) {
                await region.focus();
                assert(await region.evaluate(el => el === document.activeElement),
                    'Offene leere Region bleibt fokussierbar');
            }
        } else {
            assert(await chart.isVisible() && await table.isVisible(),
                'Gefüllte offene Regionen mit bisherigen Namen sichtbar');
        }
    }
}

async function assertExpensesBrowserTable(page, store, currentYear = 2026) {
    const expected = prepareExpensesHistoryMetrics(store, currentYear);
    const table = page.locator('#expensesHistoryTable tbody tr');
    await page.waitForFunction(count => document.querySelectorAll('#expensesHistoryTable tbody tr').length === count, expected.length);
    assert(await table.count() === expected.length, 'Jahresübersicht enthält exakt die importierten Jahre');
    if (!expected.length) {
        assert(await page.locator('#expensesHistoryHint').textContent() === 'Noch keine Ausgabendaten vorhanden.', 'Sichtbarer Leerhinweis');
        assert(await page.locator('#expensesHistoryChart svg, #expensesHistoryTable table').count() === 0, 'Leerzustand erzeugt keine Inhalte');
        return;
    }
    const chart = page.getByRole('img', { name: 'Ausgaben je Jahr in nominalen Euro', exact: true });
    assert(await chart.count() === 1 && await chart.getAttribute('aria-labelledby') === 'expensesChartTitle'
        && await chart.getAttribute('aria-describedby') === 'expensesChartDesc', 'Ausgaben-SVG hat einen eindeutigen Namen und getrennte Beschreibung');
    assert((await chart.locator('#expensesChartDesc').textContent()).includes('Ø pro Monat'), 'Beschreibung erklärt den Teiljahresvergleich');
    assert(await chart.locator('g').count() === expected.length, 'Eine Jahressäule je Tabellenzeile');
    for (const [index, row] of expected.entries()) {
        const cells = await table.nth(index).locator('th, td').allTextContents();
        assert(JSON.stringify(cells) === JSON.stringify([
            String(row.year) + (row.isCurrentPartialYear ? ' – laufendes Teiljahr' : ''),
            formatCurrency(row.annualUsed), String(row.monthsWithData), formatCurrency(row.avgMonthly)
        ]), `${row.year}: Jahreswerte und Status entsprechen Slice 1`);
        const title = await chart.locator('g > title').nth(index).textContent();
        assert(title.includes(formatCurrency(row.annualUsed)) && title.includes(formatCurrency(row.avgMonthly))
            && title.includes(`${row.monthsWithData} Monate mit Daten`), 'SVG und Tabelle haben dieselbe Datenbasis');
    }
}

async function runBalanceExpensesWealthCapture(browser, baseUrl) {
    const fixedTime = '2026-10-03T12:00:00.000Z';
    const quoteAsOf = Date.parse(fixedTime) / 1000;
    const storage = createBalanceStorage(2025);
    const initialState = JSON.parse(storage[BALANCE_STATE_KEY]);
    const annual = { id: 'annual:2026', asOf: '2026-12-31', reason: 'annual_close', periodId: 'calendar-year:2026',
        tagesgeld: 1, geldmarktEtf: 0, depotwertAlt: 0, depotwertNeu: 0, aktienEtf: 0, total: 1 };
    initialState.wealthHistory = { schemaVersion: 1, entries: [annual] };
    storage[BALANCE_STATE_KEY] = JSON.stringify(initialState);
    const profileId = 'import-quote';
    const tranchesRaw = createWealthBrowserTranches();
    // Wie beim echten Profilwechsel liegt der aktive Bestand auch im Live-Schlüssel, den der Manager liest.
    storage.depot_tranchen = tranchesRaw;
    Object.assign(storage, createBrowserProfileStorage({ [profileId]: { name: 'Importprofil',
        balanceStateRaw: storage[BALANCE_STATE_KEY], tranchesRaw },
        'import-quote-empty': { name: 'Ohne ETF', tranchesRaw: '[]', tagesgeld: '0',
            balanceStateRaw: JSON.stringify({ ...initialState, inputs: { ...initialState.inputs,
                tagesgeld: 0, depotwertAlt: 0, depotwertNeu: 0, floorBedarf: 0, flexBedarf: 0 } }) }
    }, profileId));
    const smoke = await createPage(browser, 'Balance automatic expenses capture', {
        storage, fixedTime, observeWealthUpdates: true, quoteFixtures: { default: { asOf: quoteAsOf, price: 105 } }
    });
    const { page } = smoke;
    const importCsv = async (month, expanded, expected, text = 'Kategorie;Betrag\nAusgabe;-250') => {
        await page.locator('.tab-btn[data-tab="ausgaben"]').click();
        const index = await page.evaluate(() => window.__browserSmokeMessages.length);
        // Reale Dateifeldgrenze kontrollieren, damit der Abschluss aktiv/inaktiv gemessen wird.
        await page.evaluate(() => {
            const original = File.prototype.text;
            window.__importFileStarted = false;
            File.prototype.text = function () {
                window.__importFileStarted = true;
                return new Promise((resolve, reject) => {
                    window.__releaseImportFile = () => original.call(this).then(resolve, reject);
                });
            };
            window.__restoreImportFile = () => { File.prototype.text = original; };
        });
        const button = page.locator(`#expensesTable button[data-action="import"][data-month="${month}"]`).first();
        const chooser = page.waitForEvent('filechooser'); await button.click();
        await (await chooser).setFiles({ name: 'ausgaben.csv', mimeType: 'text/csv', buffer: Buffer.from(text) });
        await page.waitForFunction(() => window.__importFileStarted);
        await page.locator(`.tab-btn[data-tab="${expanded ? 'wealth' : 'update'}"]`).click();
        await page.evaluate(() => { window.__releaseImportFile(); window.__restoreImportFile(); });
        await page.waitForFunction(({ index, expected }) => window.__browserSmokeMessages.slice(index).some(text => text.includes(expected)), { index, expected });
        await waitForWealthBrowserIdle(page);
        assert(await page.locator('#tab-wealth').isVisible() === expanded, 'Automatischer Importabschluss erhält Tabaktivität');
        const messages = await page.evaluate(index => window.__browserSmokeMessages.slice(index), index);
        if (!expected.includes('CSV-Import abgebrochen')) {
            assert(messages[0] === 'CSV importiert.', 'CSV-Erfolg bleibt vor optionalem Ergebnis nachweisbar');
            const record = JSON.parse((await readIndexedDb(page, 'kv', EXPENSES_KEY)).value);
            assert(record.years['2025'].months[String(month)].profiles[profileId], 'Ausgabenimport ist unabhängig bestätigt');
        }
        return messages;
    };
    try {
        await page.goto(`${baseUrl}/Balance.html`, { waitUntil: 'load' });
        await waitForWealthBrowserStartup(page);
        await waitForWealthBrowserIdle(page);
        const unknown = await importCsv(1, false, 'Kursdatum unbekannt');
        assert(unknown.length === 2, 'Undatierter Import erzeugt genau Importbestätigung und Hinweis');
        assert((await readBalanceBrowserState(page)).wealthHistory.entries.length === 1, 'Undatierte reale ETFs erzeugen keinen Verlaufwrite');
        await assertWealthBrowserVisibility(page, false, 1);
        await page.locator('a[href="depot-tranchen-manager.html"]').click();
        await page.locator('#updatePricesBtn').waitFor();
        await page.locator('#updatePricesBtn').click();
        await page.locator('#priceUpdateStatus').filter({ hasText: 'Kurse erfolgreich aktualisiert.' }).waitFor();
        const priced = JSON.parse((await readIndexedDb(page, 'kv', 'depot_tranchen')).value);
        assert(priced.length === 3 && priced.every(tranche => tranche.asOf === quoteAsOf && tranche.currentPrice === 105),
            'Echter Managerlistener bestätigt Preis und Zeit aller beitragenden ETFs');
        const registry = JSON.parse((await readIndexedDb(page, 'kv', 'rs_profiles_v1')).value);
        assert(JSON.parse(registry.profiles[profileId].data.depot_tranchen).every(tranche => tranche.asOf === quoteAsOf), 'Registry trägt dieselbe bestätigte Kurszeit');
        await page.locator('#managerBackLink').click();
        await page.locator('a[href="Balance.html"]').click();
        await waitForWealthBrowserStartup(page);
        await waitForWealthBrowserIdle(page);
        await page.evaluate(async () => {
            const { UIReader } = await import('./app/balance/balance-reader.js');
            const original = UIReader.readAllInputs;
            window.__importPreviews = 0;
            UIReader.readAllInputs = function (...args) { window.__importPreviews++; return original.apply(this, args); };
        });
        const success = await importCsv(2, true, 'Vermögensstand gesichert (Kurse vom 03.10.2026).');
        assert(success.length === 2 && await page.evaluate(() => window.__importPreviews) === 1, 'Frischer produktiver Import erzeugt genau eine Vorschau und Erfolg');
        let state = await readBalanceBrowserState(page);
        const captured = state.wealthHistory.entries.find(entry => entry.reason === 'manual');
        assert(captured.id === 'manual:2026-10-03' && captured.periodId === null && captured.asOf === '2026-10-03', 'Lokaler Importtag und unveränderter Unterjahresvertrag');
        assert(captured.aktienEtf === (340 + 450) * 105 && captured.geldmarktEtf === 230 * 105, 'PREVIEW nutzt die tatsächlich gespeicherten Managerpreise');
        assert(JSON.stringify(state.wealthHistory.entries.find(entry => entry.reason === 'annual_close')) === JSON.stringify(annual), 'Jahresstand bleibt unverändert');
        await assertWealthBrowserVisibility(page, true, 2);
        await assertWealthBrowserTable(page, state.wealthHistory.entries);
        assert(await page.locator('#expensesHistoryTable tbody tr').count() === 1, 'Aktive Auswertung zeichnet auch Jahresausgaben');
        await importCsv(3, false, 'Vermögensstand gesichert (Kurse vom 03.10.2026).');
        state = await readBalanceBrowserState(page);
        assert(state.wealthHistory.entries.length === 2, 'Zweiter Import desselben Tages ersetzt');
        await assertWealthBrowserVisibility(page, false, 2);
        const setQuoteState = async kind => {
            await page.evaluate(async ({ kind, profileId, quoteAsOf }) => {
                const { persistenceStorage, PersistenceFacade } = await import('./app/shared/persistence-facade.js');
                const lots = kind === 'none' ? [] : JSON.parse(persistenceStorage.getItem('depot_tranchen'));
                for (const lot of lots) { if (kind === 'unknown') delete lot.asOf; else lot.asOf = quoteAsOf - 604801; }
                const raw = JSON.stringify(lots);
                const registry = JSON.parse(persistenceStorage.getItem('rs_profiles_v1'));
                registry.profiles[profileId].data.depot_tranchen = raw;
                persistenceStorage.setItem('depot_tranchen', raw);
                persistenceStorage.setItem('rs_profiles_v1', JSON.stringify(registry));
                await PersistenceFacade.flush();
            }, { kind, profileId, quoteAsOf });
            await page.reload({ waitUntil: 'load' });
            await waitForWealthBrowserStartup(page);
            await waitForWealthBrowserIdle(page);
        };
        await setQuoteState('old');
        const old = await importCsv(4, true, 'sind älter als 7 Tage.');
        assert(old.length === 2 && (await readBalanceBrowserState(page)).wealthHistory.entries.length === 2, 'Alter realer Kurs meldet Hinweis ohne Write');
        await setQuoteState('unknown');
        await importCsv(5, false, 'Kursdatum unbekannt');
        assert((await readBalanceBrowserState(page)).wealthHistory.entries.length === 2, 'Fehlende Zeit verhindert Verlaufwrite');
        await setQuoteState('none');
        await importCsv(6, true, 'Vermögensstand gesichert (keine kursabhängigen Bestände).');
        assert((await readBalanceBrowserState(page)).wealthHistory.entries.find(entry => entry.reason === 'manual').aktienEtf === 0, 'Kursfreier produktiver Bestand wird gesichert');
        const beforeFault = JSON.stringify((await readBalanceBrowserState(page)).wealthHistory);
        await page.evaluate(async () => {
            const { PersistenceFacade } = await import('./app/shared/persistence-facade.js');
            const original = PersistenceFacade.replaceRecordsTransactional;
            PersistenceFacade.replaceRecordsTransactional = async () => { throw new Error('Gezielter Verlauf-Schreibfehler'); };
            window.__restoreCaptureWrite = () => { PersistenceFacade.replaceRecordsTransactional = original; };
        });
        await importCsv(7, false, 'Ausgaben importiert; Vermögensstand nicht bestätigt:');
        assert(await page.locator('[data-scope="expenses-wealth"]').count() === 1, 'Optionaler Fehler bleibt als Ausgabenaktionsfehler stehen');
        assert(JSON.stringify((await readBalanceBrowserState(page)).wealthHistory) === beforeFault, 'Schreibfehler bestätigt keinen neuen Stand');
        await page.evaluate(() => window.__restoreCaptureWrite());
        const beforeReject = JSON.stringify((await readBalanceBrowserState(page)).wealthHistory);
        await importCsv(8, false, 'CSV-Import abgebrochen', 'Kategorie;Betrag\nAusgabe;ungueltig');
        assert(JSON.stringify((await readBalanceBrowserState(page)).wealthHistory) === beforeReject, 'Ungültige CSV startet keine Erfassung');
        smoke.assertNoErrors();
    } finally { await smoke.close(); }
}

async function runBalanceExpensesHistory(browser, baseUrl) {
    const storage = createBalanceStorage(2026);
    const store = { version: 1, activeYear: 2026, years: {
        '2023': { months: { '1': { profiles: { A: { categories: { Nullimport: 0 } } } } } },
        '2025': { months: Object.fromEntries(Array.from({ length: 12 }, (_, i) =>
            [String(i + 1), { profiles: { A: { categories: { Ausgabe: -100 } } } }])) },
        '2026': { months: { '1': { profiles: {
            A: { categories: { Ausgabe: -100, Erstattung: 20 } },
            hidden: { categories: { Ausgabe: 30 } }
        } } } },
        '2027': { months: {} }
    } };
    storage[EXPENSES_KEY] = JSON.stringify(store);
    // Der beobachtete Haushalts-Startupvertrag gilt für zwei Profile.
    Object.assign(storage, createBrowserProfileStorage({
        'expenses-a': { name: 'Ausgaben A', balanceStateRaw: storage[BALANCE_STATE_KEY] },
        'expenses-b': { name: 'Ausgaben B', balanceStateRaw: storage[BALANCE_STATE_KEY] }
    }, 'expenses-a'));
    const smoke = await createPage(browser, 'Balance expenses history', {
        storage, observeWealthUpdates: true, fixedTime: '2026-10-03T12:00:00+02:00'
    });
    const { page } = smoke;
    try {
        await page.goto(`${baseUrl}/Balance.html`, { waitUntil: 'load' });
        await waitForWealthBrowserStartup(page);
        await assertWealthBrowserVisibility(page, false, 0);
        await activateWealthBrowserTab(page, true);
        await assertExpensesBrowserTable(page, store);
        assert((await page.locator('.expenses-history').textContent()).includes('Jahresbudgets werden nicht historisch gespeichert'), 'Budgetgrenze sichtbar erläutert');
        for (const id of ['wealthHistoryChart', 'wealthHistoryTable', 'expensesHistoryChart', 'expensesHistoryTable']) {
            await page.locator(`#${id}`).focus();
            assert(await page.locator(`#${id}`).evaluate(el => el === document.activeElement), 'Alle vier aktiven Scrollregionen fokussierbar');
        }
        await page.emulateMedia({ media: 'print' });
        assert(await page.locator('.form-column').evaluate(el => getComputedStyle(el).display) === 'none', 'Bestehender Druckvertrag blendet Auswertung aus');
        await page.emulateMedia({ media: 'screen' });
        await activateWealthBrowserTab(page, false);
        await page.locator('.tab-btn[data-tab="ausgaben"]').click();
        // Beobachtbar offenes Dateilesen; die Leseübersicht erhält keinen Importknopf.
        await page.evaluate(() => {
            const descriptor = Object.getOwnPropertyDescriptor(File.prototype, 'text');
            const original = File.prototype.text;
            window.__restoreExpensesFileText = () => {
                if (descriptor) Object.defineProperty(File.prototype, 'text', descriptor);
                else delete File.prototype.text;
            };
            File.prototype.text = function () {
                window.__expensesFileReadStarted = true;
                return new Promise((resolve, reject) => {
                    window.__releaseExpensesFileText = () => original.call(this).then(resolve, reject);
                });
            };
        });
        const importButton = page.locator('#expensesTable button[data-action="import"][data-month="3"]').first();
        const profileId = await importButton.getAttribute('data-profile');
        const messageIndex = await page.evaluate(() => window.__browserSmokeMessages.length);
        const beforeImport = (await readBalanceBrowserState(page)).wealthHistory;
        const chooser = page.waitForEvent('filechooser');
        await importButton.click();
        await (await chooser).setFiles({ name: 'ausgaben.csv', mimeType: 'text/csv', buffer: Buffer.from('Kategorie;Betrag\nAusgabe;-250') });
        await page.waitForFunction(() => window.__expensesFileReadStarted);
        await activateWealthBrowserTab(page, true);
        await assertExpensesBrowserTable(page, store);
        await page.evaluate(() => { window.__releaseExpensesFileText(); window.__restoreExpensesFileText(); });
        store.years['2026'].months['3'] = { profiles: { [profileId]: { categories: { Ausgabe: -250 } } } };
        await page.waitForFunction(index => window.__browserSmokeMessages.slice(index).includes('CSV importiert.'), messageIndex);
        await page.waitForFunction(index => window.__browserSmokeMessages.slice(index).some(text => text.includes('Kursdatum unbekannt')), messageIndex);
        await assertExpensesBrowserTable(page, store);
        assert(await page.locator('#tab-wealth').isVisible(), 'Importabschluss erhält aktive Auswertung');
        assert(JSON.stringify((await readBalanceBrowserState(page)).wealthHistory) === JSON.stringify(beforeImport), 'Undatierte synthetische ETF-Bestände verhindern automatische Sicherung');
        await page.reload({ waitUntil: 'load' });
        await waitForWealthBrowserStartup(page);
        await assertWealthBrowserVisibility(page, false, 0);
        await activateWealthBrowserTab(page, true);
        await assertExpensesBrowserTable(page, store);
        await switchWealthBrowserProfile(page, baseUrl, 'expenses-b');
        await assertWealthBrowserVisibility(page, false, 0);
        await activateWealthBrowserTab(page, true);
        await assertExpensesBrowserTable(page, store);
        // Datenstrukturen und JSON-Fehler werden unabhängig vom Vermögensabschnitt angezeigt.
        for (const raw of ['{private-rohdaten', JSON.stringify({ version: 1, years: [] }),
            JSON.stringify({ version: 1, years: { '2026': { months: [] } } })]) {
            await page.evaluate(async raw => {
                const { persistenceStorage, PersistenceFacade } = await import('./app/shared/persistence-facade.js');
                persistenceStorage.setItem('balance_expenses_v1', raw);
                await PersistenceFacade.flush();
            }, raw);
            await activateWealthBrowserTab(page, false);
            await activateWealthBrowserTab(page, true);
            const hint = await page.locator('#expensesHistoryHint').textContent();
            assert(hint.includes('Backend:') && hint.includes('Recovery im Ausgaben-Check') && !hint.includes('private-rohdaten'), 'Sichere Korruptionsdiagnose ohne Rohinhalt');
            assert(await page.locator('#expensesHistoryChart svg, #expensesHistoryTable table').count() === 0, 'Korruption entfernt alte Ausgabenwerte');
            assert(await page.locator('#captureWealthBtn').isEnabled(), 'Ausgabenfehler lässt Vermögensabschnitt bedienbar');
            assert((await readIndexedDb(page, 'kv', EXPENSES_KEY)).value === raw, 'Lesen setzt korrupte Daten nicht zurück');
        }
        await page.evaluate(async () => {
            const { persistenceStorage, PersistenceFacade } = await import('./app/shared/persistence-facade.js');
            persistenceStorage.setItem('balance_expenses_v1', JSON.stringify({ version: 1, activeYear: 2026, years: {} }));
            await PersistenceFacade.flush();
        });
        await activateWealthBrowserTab(page, false);
        await activateWealthBrowserTab(page, true);
        await assertExpensesBrowserTable(page, { years: {} });
        smoke.assertNoErrors();
    } finally { await smoke.close(); }
}

async function waitForBrowserValue(read, predicate, message, timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    let value = await read();
    while (!predicate(value) && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 100));
        value = await read();
    }
    assert(predicate(value), message);
    return value;
}

async function waitForWealthBrowserStartup(page) {
    // Nach Laden und Profilwechsel ergänzt die App die Haushaltswerte des Profilverbunds
    // asynchron (gemessen 1-3 s ohne Bedienung); erst danach taugt der persistierte
    // State als Vorher-Stand für Umschaltvergleiche.
    await page.locator('#profilverbund-profile-list input').first().waitFor();
    await waitForBrowserValue(() => readBalanceBrowserState(page),
        state => Object.hasOwn(state, 'profilverbundHouseholdInputs'),
        'Startpersistenz des Profilverbunds abgeschlossen');
}

async function waitForWealthBrowserIdle(page) {
    // Der Init-Hook erfasst bereits den Inputtimer aus initTranchenStatus(), bevor
    // ein gespeichertes profilverbundHouseholdInputs den Startupcheck erfüllen kann.
    // Ausstehende Updates über ihren Abschluss beobachten, nicht über Schlafzeiten.
    await page.waitForFunction(() => window.__wealthPendingUpdates.size === 0);
    await page.evaluate(async () => (await import('./app/shared/persistence-facade.js')).PersistenceFacade.flush());
}

// page.evaluate serialisiert diese Funktion ebenfalls ohne Modul-Closure.
function readWealthBrowserStorage() {
    return Object.fromEntries(['localStorage', 'sessionStorage'].map(name => {
        const storage = window[name];
        const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).sort();
        return [name, { keys, entries: keys.map(key => [key, storage.getItem(key)]) }];
    }));
}

async function activateWealthBrowserTab(page, expanded, key = null) {
    await waitForWealthBrowserIdle(page);
    const before = await readBalanceBrowserState(page);
    const registryBefore = (await readIndexedDb(page, 'kv', 'rs_profiles_v1')).value;
    const exportBefore = await page.evaluate(async () => {
        const { createBalanceExportDocument } = await import('./app/balance/balance-binder-imports.js');
        const { StorageManager } = await import('./app/balance/balance-storage.js');
        return createBalanceExportDocument(StorageManager.loadState()).payload;
    });
    const storageBefore = await page.evaluate(readWealthBrowserStorage);
    const button = page.locator(`.tab-btn[data-tab="${expanded ? 'wealth' : 'update'}"]`);
    try {
        await page.evaluate(async () => {
            const { UIReader } = await import('./app/balance/balance-reader.js');
            const { UIRenderer } = await import('./app/balance/balance-renderer.js');
            const { persistenceStorage } = await import('./app/shared/persistence-facade.js');
            const calls = window.__wealthTabCalls = { updates: 0, clears: 0, writes: 0,
                localStorage: { setItem: 0, removeItem: 0, clear: 0 },
                sessionStorage: { setItem: 0, removeItem: 0, clear: 0 } };
            const restores = [];
            window.__restoreWealthTabCalls = () => {
                restores.reverse().forEach(restore => restore());
                delete window.__wealthTabCalls;
                delete window.__restoreWealthTabCalls;
            };
            const instrument = (object, method, count) => {
                const descriptor = Object.getOwnPropertyDescriptor(object, method);
                const original = object[method];
                restores.push(() => {
                    if (descriptor) Object.defineProperty(object, method, descriptor);
                    else delete object[method];
                });
                Object.defineProperty(object, method, { configurable: true, writable: true,
                    value: function (...args) { count(this); return original.apply(this, args); } });
            };
            for (const [object, method, counter] of [[UIReader, 'readAllInputs', 'updates'],
                [UIRenderer, 'clearError', 'clears'], [UIRenderer, 'clearActionError', 'clears'],
                [persistenceStorage, 'setItem', 'writes']]) {
                instrument(object, method, () => { calls[counter] += 1; });
            }
            // Storage-Instanzen haben benannte Eigenschaften: Methoden am Prototyp
            // instrumentieren, damit direkte Zugriffe auf beide Speicher erfasst werden.
            for (const method of ['setItem', 'removeItem', 'clear']) {
                instrument(Storage.prototype, method, storage => {
                    if (storage === window.localStorage) calls.localStorage[method] += 1;
                    if (storage === window.sessionStorage) calls.sessionStorage[method] += 1;
                });
            }
        });
        if (key) {
            await button.focus();
            await page.keyboard.press(key);
        } else await button.click();
        await assertWealthBrowserVisibility(page, expanded);
        await waitForWealthBrowserIdle(page);
        const calls = await page.evaluate(() => window.__wealthTabCalls);
        assert(calls.updates === 0 && calls.clears === 0 && calls.writes === 0,
            `Tabwechsel ohne Update/Fehlerbereinigung/Write: ${JSON.stringify(calls)}`);
        const storageAfter = await page.evaluate(readWealthBrowserStorage);
        for (const name of ['localStorage', 'sessionStorage']) {
            assert(Object.values(calls[name]).every(count => count === 0),
                `Tabwechsel ohne ${name}-Mutationen: ${JSON.stringify(calls[name])}`);
            assert(JSON.stringify(storageAfter[name].keys) === JSON.stringify(storageBefore[name].keys),
                `Tabwechsel erhält alle Schlüssel von ${name}`);
            assert(JSON.stringify(storageAfter[name].entries) === JSON.stringify(storageBefore[name].entries),
                `Tabwechsel erhält sämtliche Schlüssel/Wert-Paare von ${name}`);
        }
    } finally { await page.evaluate(() => window.__restoreWealthTabCalls?.()); }
    const after = await readBalanceBrowserState(page);
    assert(JSON.stringify(after) === JSON.stringify(before), 'Tabwechsel erhält gesamten Fachzustand ohne Erfassung/Sichtbarkeitsflag');
    assert((await readIndexedDb(page, 'kv', 'rs_profiles_v1')).value === registryBefore, 'Tabwechsel erhält aktive Registrykopie');
    const exportAfter = await page.evaluate(async () => {
        const { createBalanceExportDocument } = await import('./app/balance/balance-binder-imports.js');
        const { StorageManager } = await import('./app/balance/balance-storage.js');
        return createBalanceExportDocument(StorageManager.loadState()).payload;
    });
    assert(JSON.stringify(exportAfter) === JSON.stringify(exportBefore), 'Balance-Export ohne neues Tabfeld');
}

async function assertWealthBrowserTable(page, entries) {
    // Die aktive Registrykopie folgt dem Balance-State über die nächste Neuberechnung
    // (nach einem Import gemessen 200-420 ms später).
    await waitForBrowserValue(async () => {
        const registry = JSON.parse((await readIndexedDb(page, 'kv', 'rs_profiles_v1')).value);
        const current = (await readIndexedDb(page, 'kv', 'rs_current_profile')).value;
        return JSON.stringify(JSON.parse(registry.profiles[current].data[BALANCE_STATE_KEY]).wealthHistory?.entries);
    }, registryEntries => registryEntries === JSON.stringify(entries),
    'Dargestellte Daten entsprechen auch der bestätigten aktiven Registrykopie');
    // Tabelle und Diagramm zeigen chronologisch (Darstellungsvertrag), gespeichert wird in Schreibreihenfolge.
    const shown = [...entries].sort((a, b) => a.asOf.localeCompare(b.asOf)
        || (a.reason === 'annual_close' ? 0 : 1) - (b.reason === 'annual_close' ? 0 : 1)
        || a.id.localeCompare(b.id));
    const rows = page.locator('#wealthHistoryTable tbody tr');
    assert(await rows.count() === shown.length, 'Die Verlaufstabelle zeigt genau die gespeicherten Stände');
    for (const [index, entry] of shown.entries()) {
        const cells = await rows.nth(index).locator('th, td').allTextContents();
        assert(cells[0] === entry.asOf.split('-').reverse().join('.'), 'Die Tabelle zeigt den gespeicherten Stichtag');
        assert(cells[1].includes(entry.reason === 'manual' ? '◇ Unterjährig' : '■ Jahresabschluss'),
            'Der Anlass ist als Text und Form zugänglich');
        const amounts = ['tagesgeld', 'geldmarktEtf', 'aktienEtf', 'depotwertAlt', 'depotwertNeu', 'total'];
        assert(JSON.stringify(cells.slice(2)) === JSON.stringify(amounts.map(key => formatCurrency(entry[key]))),
            'Alle Gruppen, Teildepots und die Summe entsprechen dem persistenten Stand');
    }
    const chart = page.getByRole('img', { name: 'Vermögensverlauf in nominalen Euro', exact: true });
    assert(await chart.count() === 1, 'Der Verlauf besitzt ein benanntes SVG');
    assert(await chart.getAttribute('aria-labelledby') === 'wealthChartTitle', 'Nur der Titel benennt das SVG');
    assert(await chart.getAttribute('aria-describedby') === 'wealthChartDesc', 'Die Beschreibung ist separat zugeordnet');
    const description = chart.locator('desc[id="wealthChartDesc"]');
    assert(await description.count() === 1, 'Das SVG besitzt genau ein referenziertes Beschreibungselement');
    assert(await description.textContent() === 'Gestapelte Säulen für Liquidität, Geldmarkt-ETF und Aktien-ETF. Jahresabschluss: Quadrat und durchgezogener Rahmen. Unterjährig: Raute und gestrichelter Rahmen. Alle Werte und beide Teildepots stehen in der folgenden Tabelle.',
        'Die vollständige Langbeschreibung ist erhalten');
    assert(await chart.locator('g').count() === shown.length, 'Jeder Stand besitzt eine eigene Säule');
    for (const [index, entry] of shown.entries()) {
        const title = await chart.locator('g > title').nth(index).textContent();
        assert(title.includes(entry.asOf.split('-').reverse().join('.')) && title.includes(formatCurrency(entry.total)),
            'Diagramm zeigt Datum und Summe aus derselben bestätigten Datenbasis wie die Tabelle');
    }
    assert(!(await chart.innerHTML()).match(/NaN|Infinity/), 'Auch Nullstände haben endliche SVG-Koordinaten');
}

async function switchWealthBrowserProfile(page, baseUrl, profileId) {
    // Derselbe echte Profilwechsel und Handoff wie bei der regulären Suite-Bedienung.
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'load' });
    await page.locator('#profileSelect').selectOption(profileId);
    await page.waitForFunction(id => document.getElementById('profileSelect')?.value === id
        && document.body.textContent.includes('Profil gewechselt und geladen.'), profileId);
    await page.evaluate(async () => {
        const { PersistenceFacade } = await import('./app/shared/persistence-facade.js');
        await PersistenceFacade.flush();
    });
    await page.goto(`${baseUrl}/Balance.html`, { waitUntil: 'load' });
    await waitForWealthBrowserStartup(page);
}

async function waitForWealthBrowserLayout(page) {
    await waitForWealthBrowserIdle(page);
    await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {})));
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
}

async function measureWealthBrowserLayout(page) {
    await waitForWealthBrowserLayout(page);
    return page.evaluate(() => {
        const rect = el => {
            const { x, y, width, height } = el.getBoundingClientRect();
            return { x, y, width, height };
        };
        const wrapper = document.querySelector('.expenses-table-wrap');
        const table = document.querySelector('#expensesTable table');
        const tableRect = table.getBoundingClientRect();
        let left = Math.max(0, tableRect.left);
        let right = Math.min(document.documentElement.clientWidth, tableRect.right);
        for (let parent = table.parentElement; parent; parent = parent.parentElement) {
            if (getComputedStyle(parent).overflowX !== 'visible') {
                const box = parent.getBoundingClientRect();
                left = Math.max(left, box.left + parent.clientLeft);
                right = Math.min(right, box.left + parent.clientLeft + parent.clientWidth);
            }
        }
        return {
            viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth,
            direction: getComputedStyle(document.querySelector('.main-layout')).flexDirection,
            form: rect(document.querySelector('.form-column')),
            expenses: { table: rect(table), wrapper: rect(wrapper), wrapperClient: wrapper.clientWidth,
                visible: Math.max(0, right - left) },
            tabContainer: rect(document.querySelector('.tab-buttons')),
            tabs: [...document.querySelectorAll('.tab-buttons > .tab-btn')].map(button => {
                const range = document.createRange();
                range.selectNodeContents(button);
                return { label: button.textContent, ...rect(button),
                    textLines: [...range.getClientRects()].map(line => ({ y: line.y, height: line.height })),
                    client: button.clientWidth, scroll: button.scrollWidth };
            }),
            actions: [...document.querySelector('.wealth-actions').children].map(el => ({ id: el.id, text: el.textContent, ...rect(el) })),
            regions: [...document.querySelectorAll('#tab-wealth .wealth-scroll')].map(el => {
                el.scrollLeft = el.scrollWidth;
                const region = { id: el.id, ...rect(el), client: el.clientWidth, scroll: el.scrollWidth,
                    position: el.scrollLeft, overflow: getComputedStyle(el).overflowX };
                el.scrollLeft = 0;
                return region;
            }),
            drawer: { ...rect(document.getElementById('diagnosisDrawer')),
                open: document.getElementById('diagnosisDrawer').classList.contains('is-open'),
                overlay: getComputedStyle(document.getElementById('drawerOverlay')).visibility }
        };
    });
}

const WEALTH_TAB_SINGLE_ROW_MIN_WIDTH = 1366;

async function assertWealthBrowserLayoutMatrix(browser, baseUrl) {
    const storage = createBalanceStorage(2026);
    const state = JSON.parse(storage[BALANCE_STATE_KEY]);
    // Synthetische lange Historie: breite Säulenfolge und breite Eurospalten.
    const entries = Array.from({ length: 24 }, (_, index) => {
        const asOf = `2026-01-${String(index + 1).padStart(2, '0')}`;
        const tagesgeld = 1_234_567_890_123_000 + index;
        const geldmarktEtf = 2_345_678_901_234_000, depotwertAlt = 3_456_789_012_345_000, depotwertNeu = 4_567_890_123_456_000;
        const aktienEtf = depotwertAlt + depotwertNeu;
        return { id: `manual:${asOf}`, asOf, reason: 'manual', periodId: null,
            tagesgeld, geldmarktEtf, depotwertAlt, depotwertNeu, aktienEtf,
            total: tagesgeld + geldmarktEtf + aktienEtf };
    });
    state.wealthHistory = { schemaVersion: 1, entries };
    storage[EXPENSES_KEY] = JSON.stringify({ version: 1, activeYear: 2027, years: Object.fromEntries(
        Array.from({ length: 24 }, (_, index) => [String(2003 + index), { months: { '1': { profiles: {
            A: { categories: { Ausgabe: -1e100 } }
        } } } }])) });
    storage[BALANCE_STATE_KEY] = JSON.stringify(state);
    Object.assign(storage, createBrowserProfileStorage({
        'wealth-layout': { name: 'Layoutprüfung', balanceStateRaw: storage[BALANCE_STATE_KEY] }
    }, 'wealth-layout'));
    const smoke = await createPage(browser, 'Balance.html', { storage, observeWealthUpdates: true });
    const { page } = smoke;
    const tolerance = 1;
    try {
        await page.goto(`${baseUrl}/Balance.html`, { waitUntil: 'load', timeout: 15000 });
        await waitForWealthBrowserIdle(page);
        await assertWealthBrowserVisibility(page, false, entries.length);
        for (const width of [1250, 1251, 1280, 1366, 1440, 1600, 1920]) {
            await page.setViewportSize({ width, height: 900 });
            await page.locator('.tab-btn[data-tab="ausgaben"]').click();
            await page.locator('#expensesTable table').waitFor();
            const expenses = await measureWealthBrowserLayout(page);
            await activateWealthBrowserTab(page, false);
            const before = await measureWealthBrowserLayout(page);
            await activateWealthBrowserTab(page, true);
            await assertWealthBrowserTable(page, entries);
            const history = await measureWealthBrowserLayout(page);
            console.log('Balance wealth layout SOURCE ' + JSON.stringify({ width, expenses, before, history }));
            assert(history.direction === (width === 1250 ? 'column' : 'row'), `${width}: vorhandene Breakpointgrenze 1250/1251`);
            assert(Math.abs(history.form.width - before.form.width) <= tolerance, `${width}: gefüllter Verlauf vergrößert die Formularspalte nicht`);
            assert(history.page <= history.viewport + tolerance, `${width}: kein seitenweiter Überlauf im Verlauf`);
            if (width > 1250) {
                assert(expenses.expenses.table.width >= 720 - tolerance && expenses.expenses.visible >= 720 - tolerance
                    && Math.abs(expenses.expenses.table.width - expenses.expenses.visible) <= tolerance,
                `${width}: mindestens 720 px Ausgabentabelle vollständig sichtbar`);
                // Die kürzere Beschriftung „Auswertung“ muss die vollständige gemeinsame Tabzeile
                // bereits bei 1366 CSS-Pixeln ermöglichen; Rechtecke und Textzeilen werden gemessen.
                const singleRow = width >= WEALTH_TAB_SINGLE_ROW_MIN_WIDTH;
                for (const layout of [expenses, before, history]) {
                    assert(layout.tabs.length === 4 && layout.tabs.every(tab => tab.textLines.length === 1
                        && tab.scroll <= tab.client + tolerance
                        && tab.x >= layout.tabContainer.x - tolerance
                        && tab.x + tab.width <= layout.tabContainer.x + layout.tabContainer.width + tolerance),
                    `${width}: vier vollständige, nicht abgeschnittene Tabtitel`);
                    if (singleRow) assert(layout.tabs.every(tab => Math.abs(tab.y - layout.tabs[0].y) <= tolerance),
                        `${width}: vier vollständige Titel in einer Tabzeile`);
                }
                const actionCenter = history.actions[0].y + history.actions[0].height / 2;
                assert(history.actions.map(action => action.id).join(',') === 'captureWealthBtn,wealthHistoryCount,wealthHistoryDate'
                    && history.actions.every(action => Math.abs(action.y + action.height / 2 - actionCenter) <= tolerance),
                `${width}: Capture, Anzahl und Datum in einer gemeinsamen Desktopzeile`);
            }
            assert(history.regions.length === 4 && history.regions.every(region => region.scroll > region.client && region.position > 0
                && region.overflow === 'auto' && region.width <= history.form.width + tolerance),
            `${width}: lange Historie scrollt tatsächlich intern`);
        }
        await page.setViewportSize({ width: 375, height: 812 });
        for (const button of await page.locator('.tab-buttons > .tab-btn').all()) {
            await button.scrollIntoViewIfNeeded();
            await waitForWealthBrowserLayout(page);
            const box = await button.boundingBox();
            assert(await button.isEnabled() && box.x >= -tolerance && box.x + box.width <= 375 + tolerance,
                '375: alle vier Tabs erreichbar');
        }
        const capture = page.locator('#captureWealthBtn');
        await capture.scrollIntoViewIfNeeded();
        await waitForWealthBrowserLayout(page);
        const captureBox = await capture.boundingBox();
        assert(await capture.isEnabled() && captureBox.x >= -tolerance && captureBox.x + captureBox.width <= 375 + tolerance,
            '375: Capturetaste vollständig erreichbar');
        for (const step of ['geschlossen', 'geöffnet', 'wieder geschlossen']) {
            if (step === 'geöffnet') await page.locator('#openDiagnosisBtn').click();
            if (step === 'wieder geschlossen') await page.locator('#closeDiagnosisBtn').click();
            const layout = await measureWealthBrowserLayout(page);
            console.log('Balance wealth layout SOURCE ' + JSON.stringify({ width: 375, step, layout }));
            assert(layout.page <= layout.viewport + tolerance, `375/${step}: kein seitenweiter Überlauf`);
            assert(layout.regions.length === 4 && layout.regions.every(region => region.x >= -tolerance && region.x + region.width <= 375 + tolerance
                && region.scroll > region.client && region.position > 0 && region.overflow === 'auto'),
            `375/${step}: Diagramm und Tabelle scrollen intern`);
            const open = step === 'geöffnet';
            assert(layout.drawer.open === open && layout.drawer.overlay === (open ? 'visible' : 'hidden'),
                `375/${step}: bestehender Drawer-/Overlayzustand`);
            assert(open ? layout.drawer.x >= -tolerance && layout.drawer.x + layout.drawer.width <= 375 + tolerance
                : layout.drawer.x >= 375 - tolerance, `375/${step}: bestehende Drawertransformation`);
        }
        await assertWealthBrowserVisibility(page, true, entries.length);
        smoke.assertNoErrors();
    } finally { await smoke.close(); }
}

async function runBalanceWealthHistory(browser, baseUrl) {
    const markupContext = await browser.newContext({ javaScriptEnabled: false });
    try {
        await markupContext.route('**/*', async route => {
            const host = new URL(route.request().url()).hostname;
            if (host === '127.0.0.1' || host === 'localhost') await route.continue();
            else await route.fulfill({ status: 200, body: '' });
        });
        const markupPage = await markupContext.newPage();
        await markupPage.goto(`${baseUrl}/Balance.html`, { waitUntil: 'load' });
        assert(!(await markupPage.locator('#tab-wealth').isVisible()), 'Verlaufstab schon vor JavaScript inaktiv');
        assert(await markupPage.locator('.tab-panel.active').count() === 1 && await markupPage.locator('#tab-update').isVisible(), 'Nur Jahres-Update vor JavaScript aktiv');
        assert(await markupPage.getByRole('region', { name: 'Vermögensdiagramm', exact: true }).count() === 0,
            'Ausgeliefertes Markup verbirgt die Details auch vor Initialisierung aus dem Zugänglichkeitsbaum');
    } finally { await markupContext.close(); }
    await assertWealthBrowserLayoutMatrix(browser, baseUrl);
    const baseline = createBalanceStorage(2026);
    const profileState = JSON.parse(baseline[BALANCE_STATE_KEY]);
    profileState.inputs.floorBedarf = 0;
    profileState.inputs.flexBedarf = 0;
    Object.assign(profileState.inputs, { tagesgeld: 12000, geldmarktEtf: 23000, depotwertAlt: 34000, depotwertNeu: 45000 });
    baseline[BALANCE_STATE_KEY] = JSON.stringify(profileState);
    const zeroEntry = { id: 'manual:2026-01-02', asOf: '2026-01-02', reason: 'manual', periodId: null,
        tagesgeld: 0, geldmarktEtf: 0, depotwertAlt: 0, depotwertNeu: 0, aktienEtf: 0, total: 0 };
    const tranchesRaw = createWealthBrowserTranches();
    const smoke = await openSmokePage(browser, baseUrl, 'Balance.html', {
        fixedTime: '2026-10-03T00:30:00+02:00',
        observeWealthUpdates: true,
        storage: {
            ...baseline, profile_tagesgeld: '12000', depot_tranchen: tranchesRaw,
            ...createBrowserProfileStorage({
                'wealth-a': { name: 'Verlauf A', tagesgeld: '12000', tranchesRaw,
                    balanceStateRaw: baseline[BALANCE_STATE_KEY] },
                'wealth-b': { name: 'Verlauf B', tagesgeld: '2000', balanceStateRaw: JSON.stringify({
                    ...profileState, inputs: { ...profileState.inputs, tagesgeld: 2000,
                        geldmarktEtf: 0, depotwertAlt: 0, depotwertNeu: 0 },
                    wealthHistory: { schemaVersion: 1, entries: [zeroEntry] }
                }) }
            }, 'wealth-a')
        }
    });
    const { page } = smoke;
    await waitForWealthBrowserStartup(page);
    await assertWealthBrowserVisibility(page, false, 0);
    await activateWealthBrowserTab(page, true, 'Enter');
    await page.locator('#wealthHistoryHint').filter({ hasText: 'Noch keine Stände erfasst' }).waitFor();
    await activateWealthBrowserTab(page, false, 'Space');
    await page.waitForFunction(() => document.querySelectorAll('#profilverbund-profile-list input:checked').length === 2);
    await activateWealthBrowserTab(page, true, 'Space');
    await captureWealthBrowserStand(page, true);
    const first = (await readBalanceBrowserState(page)).wealthHistory.entries;
    assert(first.length === 1 && first[0].asOf === '2026-10-03' && first[0].id === 'manual:2026-10-03',
        'Tastaturerfassung nutzt den lokalen Klicktag statt des noch vorherigen UTC-Tags');
    assert(first[0].tagesgeld === 14000 && first[0].geldmarktEtf === 23000
        && first[0].depotwertAlt === 34000 && first[0].depotwertNeu === 45000
        && first[0].aktienEtf === 79000 && first[0].total === 116000,
    'Der echte Knopf erfasst die Profilverbund- und Tranchenwerte, keine simulierten Bestände');
    await assertWealthBrowserVisibility(page, true, 1);
    await assertWealthBrowserTable(page, first);
    const registryAfterCapture = JSON.parse((await readIndexedDb(page, 'kv', 'rs_profiles_v1')).value);
    assert(JSON.stringify(JSON.parse(registryAfterCapture.profiles['wealth-a'].data[BALANCE_STATE_KEY]).wealthHistory.entries)
        === JSON.stringify(first), 'Live-State und aktive Registrykopie sind dauerhaft gleich');
    assert(JSON.stringify(JSON.parse(registryAfterCapture.profiles['wealth-b'].data[BALANCE_STATE_KEY]).wealthHistory.entries)
        === JSON.stringify([zeroEntry]), 'Der Verbundstand wird nicht in den Verlauf des zweiten Profils kopiert');

    await page.locator('.tab-btn[data-tab="update"]').click();
    await page.locator('input[data-profile-id="wealth-b"]').uncheck();
    await waitForWealthBrowserIdle(page);
    await activateWealthBrowserTab(page, true);
    await captureWealthBrowserStand(page);
    const replaced = (await readBalanceBrowserState(page)).wealthHistory.entries;
    assert(replaced.length === 1 && replaced[0].tagesgeld === 12000 && replaced[0].total === 114000,
        'Ein weiterer Klick am selben Tag ersetzt den Stand aus der frischen Profilbasis');
    await assertWealthBrowserVisibility(page, true, 1);
    await assertWealthBrowserTable(page, replaced);
    await page.reload({ waitUntil: 'load' });
    await waitForWealthBrowserStartup(page);
    await assertWealthBrowserVisibility(page, false, 1);
    await activateWealthBrowserTab(page, true);
    await page.locator('#wealthHistoryTable tbody tr').waitFor();
    assert(JSON.stringify((await readBalanceBrowserState(page)).wealthHistory.entries) === JSON.stringify(replaced),
        'Reload erhält die gespeicherten Werte exakt');
    await assertWealthBrowserTable(page, replaced);

    await page.clock.setFixedTime(new Date('2026-10-04T12:00:00+02:00'));
    await captureWealthBrowserStand(page);
    let nextDay = (await readBalanceBrowserState(page)).wealthHistory.entries;
    assert(nextDay.length === 2 && nextDay[1].asOf === '2026-10-04', 'Ein anderer lokaler Tag ergänzt einen Stand');
    await assertWealthBrowserVisibility(page, true, 2);
    await assertWealthBrowserTable(page, nextDay);
    await activateWealthBrowserTab(page, false);
    await page.clock.setFixedTime(new Date('2026-10-05T12:00:00+02:00'));
    await activateWealthBrowserTab(page, true);
    await captureWealthBrowserStand(page);
    nextDay = (await readBalanceBrowserState(page)).wealthHistory.entries;
    await assertWealthBrowserVisibility(page, true, 3);
    await assertWealthBrowserTable(page, nextDay);

    await switchWealthBrowserProfile(page, baseUrl, 'wealth-b');
    await assertWealthBrowserVisibility(page, false, 1);
    await page.setViewportSize({ width: 375, height: 812 });
    await waitForWealthBrowserLayout(page);
    for (const button of await page.locator('.tab-buttons > .tab-btn').all()) {
        await button.scrollIntoViewIfNeeded();
        const box = await button.boundingBox();
        assert(await button.isEnabled() && box.width > 0 && box.x >= 0 && box.x + box.width <= 375,
            'Alle vier Tabs bei 375 CSS-Pixeln erreichbar');
    }
    await activateWealthBrowserTab(page, true, 'Space');
    await assertWealthBrowserTable(page, [zeroEntry]);
    const capture = page.getByRole('button', { name: 'Stand jetzt erfassen', exact: true });
    await capture.focus();
    await page.keyboard.press('Tab');
    assert(await page.getByRole('region', { name: 'Vermögensdiagramm', exact: true }).evaluate(el => el === document.activeElement),
        'Das Diagramm ist per Tab erreichbar');
    await page.keyboard.press('Tab');
    const table = page.getByRole('region', { name: 'Tabelle der Vermögensstände', exact: true });
    assert(await table.evaluate(el => el === document.activeElement), 'Die Datentabelle ist per Tab erreichbar');
    await page.keyboard.press('End');
    await assertWealthBrowserTable(page, [zeroEntry]);
    await waitForWealthBrowserLayout(page);
    const widths = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth,
        regions: [...document.querySelectorAll('#wealthHistoryChart, #wealthHistoryTable')].map(el => {
            el.scrollLeft = el.scrollWidth;
            return { width: el.clientWidth, scroll: el.scrollWidth, position: el.scrollLeft, overflow: getComputedStyle(el).overflowX };
        })
    }));
    console.log('Balance wealth layout SOURCE ' + JSON.stringify({ width: 375, fixture: 'Nullstand', widths }));
    assert(widths.page <= widths.viewport + 1, 'Kein seitenweiter horizontaler Überlauf bei 375 CSS-Pixeln');
    assert(widths.regions.every(region => region.width <= 375 && region.scroll > region.width && region.position > 0 && region.overflow === 'auto'),
        'SVG und Tabelle scrollen tatsächlich innerhalb ihrer Regionen');
    await activateWealthBrowserTab(page, false);

    await page.setViewportSize({ width: 1366, height: 900 });
    await switchWealthBrowserProfile(page, baseUrl, 'wealth-a');
    await assertWealthBrowserVisibility(page, false, 3);
    await activateWealthBrowserTab(page, true, 'Enter');
    await page.waitForFunction(() => document.querySelectorAll('#wealthHistoryTable tbody tr').length === 3);
    await assertWealthBrowserTable(page, nextDay);
    const legacy = {
        app: await page.evaluate(async () => (await import('./app/balance/balance-config.js')).CONFIG.APP.NAME),
        version: 'v21.1 Refactored (Engine v31)', payload: profileState
    };
    const valid = { ...legacy, payload: { ...profileState, wealthHistory: { schemaVersion: 1, entries: [zeroEntry] } } };
    for (const active of [true, false]) {
        await activateWealthBrowserTab(page, active);
        const runImport = async (name, content, message) => {
            await waitForWealthBrowserIdle(page);
            const messageIndex = await page.evaluate(() => window.__browserSmokeMessages.length);
            await page.locator('#importFile').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(content) });
            await page.waitForFunction(({ messageIndex, message }) => document.getElementById('importFile').value === ''
                && window.__browserSmokeMessages.slice(messageIndex).some(text => text.includes(message)), { messageIndex, message });
            await waitForWealthBrowserIdle(page);
            if (message === 'kein gültiges JSON' || message === 'automatisch wiederhergestellt') {
                const visibleError = page.locator('#action-error-container .action-error-text').filter({ hasText: message });
                await visibleError.waitFor({ state: 'visible' });
                const text = await visibleError.textContent();
                await page.waitForTimeout(2000);
                assert(await visibleError.isVisible() && await visibleError.textContent() === text,
                    `${name}: Aktionsfehler bleibt bei ${active ? 'offenem' : 'geschlossenem'} Verlauf nach 2 s sichtbar`);
                assert((await page.evaluate(index => window.__browserSmokeMessages.slice(index), messageIndex)).includes(text),
                    `${name}: Das Protokoll enthält den unveränderten Text ohne Schließenbeschriftung`);
                await activateWealthBrowserTab(page, !active);
                assert(await visibleError.isVisible() && await visibleError.textContent() === text, `${name}: Tabwechsel erhält den Fehler`);
                await activateWealthBrowserTab(page, active);
                assert(await visibleError.isVisible() && await visibleError.textContent() === text, `${name}: Rückwechsel erhält den Fehler`);
            }
        };
        await runImport('synthetischer-verlauf.json', JSON.stringify(valid), 'erfolgreich');
        await assertWealthBrowserVisibility(page, active, 1);
        if (active) await assertWealthBrowserTable(page, [zeroEntry]);
        assert(JSON.stringify((await readBalanceBrowserState(page)).wealthHistory.entries) === JSON.stringify([zeroEntry]), 'Import ersetzt den Verlauf exakt');
        await waitForBrowserValue(async () => {
            const registry = JSON.parse((await readIndexedDb(page, 'kv', 'rs_profiles_v1')).value);
            return JSON.parse(registry.profiles['wealth-a'].data[BALANCE_STATE_KEY]).wealthHistory.entries;
        }, entries => JSON.stringify(entries) === JSON.stringify([zeroEntry]), 'Import in aktiver Registry bestätigt');
        await runImport('ungueltiger-verlauf.json', '{kein-json', 'kein gültiges JSON');
        await assertWealthBrowserVisibility(page, active, 1);
        if (active) await assertWealthBrowserTable(page, [zeroEntry]);
        const beforeRollback = await readBalanceBrowserState(page);
        await page.evaluate(async () => {
            const { StorageManager } = await import('./app/balance/balance-storage.js');
            const { UIReader } = await import('./app/balance/balance-reader.js');
            const replace = StorageManager.replaceStateFromImport;
            StorageManager.replaceStateFromImport = async (...args) => {
                const receipt = await replace.apply(StorageManager, args);
                StorageManager.replaceStateFromImport = replace;
                const read = UIReader.readAllInputs;
                UIReader.readAllInputs = () => {
                    UIReader.readAllInputs = read;
                    throw new Error('Synthetischer UI-Fehler nach Replace');
                };
                return receipt;
            };
        });
        await runImport('synthetischer-rollback.json', JSON.stringify(legacy), 'automatisch wiederhergestellt');
        await assertWealthBrowserVisibility(page, active, 1);
        assert(JSON.stringify(await readBalanceBrowserState(page)) === JSON.stringify(beforeRollback), 'Rollback bewahrt endgültigen bestätigten State');
        if (active) await assertWealthBrowserTable(page, [zeroEntry]);
        await activateWealthBrowserTab(page, !active);
        await activateWealthBrowserTab(page, active);
        await runImport('synthetischer-legacy-verlauf.json', JSON.stringify(legacy), 'erfolgreich');
        await assertWealthBrowserVisibility(page, active, 0);
        assert(!(await readBalanceBrowserState(page)).wealthHistory, 'Legacy-Replace übernimmt keinen alten Verlauf');
        if (active) await page.locator('#wealthHistoryHint').filter({ hasText: 'Noch keine Stände erfasst' }).waitFor();
    }
    await page.reload({ waitUntil: 'load' });
    // Nach dem Legacy-Replace ergänzt die App profilverbundHouseholdInputs nicht mehr;
    // hier folgt kein Zustandsvergleich, der Profilwechsel wartet selbst auf seinen Start.
    await page.locator('#profilverbund-profile-list input').first().waitFor();
    await assertWealthBrowserVisibility(page, false, 0);
    await switchWealthBrowserProfile(page, baseUrl, 'wealth-b');
    await assertWealthBrowserVisibility(page, false, 1);
    await activateWealthBrowserTab(page, true);
    await assertWealthBrowserTable(page, [zeroEntry]);
    smoke.assertNoErrors(['Synthetischer UI-Fehler nach Replace']);
    await smoke.close();
}

async function runBalanceAnnualCommit(browser, baseUrl) {
    // Zwei frisch initialisierte Profile: jeweils ein echter neuer Jahresabschluss.
    for (const open of [false, true]) await runBalanceAnnualCommitScenario(browser, baseUrl, open);
    await runBalanceAnnualCommitBeforeWealthHistory(browser, baseUrl);
}

async function assertBalanceBrowserToast(page, expectedText, expectedType) {
    const expected = {
        info: { label: 'Hinweis: ', icon: 'i', className: 'toast-info' },
        success: { label: 'Erfolg: ', icon: '✓', className: 'toast-success' }
    }[expectedType];
    await page.waitForFunction(text => document.querySelector('#toast-container .toast-text')?.textContent === text, expectedText);
    const toast = page.locator('#toast-container');
    const actual = await toast.evaluate(container => ({
        text: container.querySelector('.toast-text')?.textContent,
        label: container.querySelector('.toast-type')?.textContent,
        icon: container.querySelector('.toast-icon')?.textContent,
        className: container.className
    }));
    assert(await toast.isVisible() && actual.text === expectedText, 'Jahresprozess zeigt den bytegleichen Originaltext');
    assert(actual.label === expected.label && actual.icon === expected.icon && actual.className === expected.className,
        `Jahresprozess zeigt ${expectedType} mit eigenem Typ, Symbol und Formklasse`);
}

async function runBalanceAnnualCommitBeforeWealthHistory(browser, baseUrl) {
    const smoke = await openSmokePage(browser, baseUrl, 'Balance.html', {
        storage: createBalanceStorage(2025), annualFixtures: { targetYear: 2025 },
        observeWealthUpdates: true, fixedTime: '2026-01-15T12:00:00+01:00'
    });
    await smoke.page.locator('#profilverbund-profile-list input').waitFor({ state: 'visible' });
    await waitForWealthBrowserIdle(smoke.page);
    const messageIndex = await smoke.page.evaluate(() => window.__browserSmokeMessages.length);
    await smoke.page.locator('#jahresabschlussBtn').click({ force: true });
    const expectedText = 'Ausgaben-Check auf 2026 umgestellt.';
    await smoke.page.waitForFunction(({ index, text }) => window.__browserSmokeMessages.slice(index).includes(text),
        { index: messageIndex, text: expectedText });
    const toast = smoke.page.locator('#toast-container .toast-text');
    assert(await toast.isVisible() && await toast.textContent() === expectedText,
        'Jahresabschluss vor 2026 bleibt sichtbar ohne Vermögenszusatz');
    const messages = await smoke.page.evaluate(index => window.__browserSmokeMessages.slice(index), messageIndex);
    assert(!messages.some(message => message.includes('Vermögensstand gesichert.')),
        'Jahre vor 2026 erhalten auch im neuen Kanal keinen Vermögenszusatz');
    const state = await readBalanceBrowserState(smoke.page);
    assert(state.annualPeriodMetadata.lastCommittedPeriod === 'calendar-year:2025',
        'Der Fall vor 2026 erreicht einen echten bestätigten Jahresabschluss');
    assert(!state.wealthHistory?.entries?.length, 'Jahresabschluss vor 2026 erzeugt keinen Vermögensstand');
    smoke.assertNoErrors();
    await smoke.close();
}

async function runBalanceAnnualCommitScenario(browser, baseUrl, open) {
    const smoke = await openSmokePage(browser, baseUrl, 'Balance.html', {
        storage: createBalanceStorage(2026), annualFixtures: { targetYear: 2026 },
        observeWealthUpdates: true,
        fixedTime: '2027-01-15T12:00:00+01:00'
    });
    await smoke.page.locator('#profilverbund-profile-list input').waitFor({ state: 'visible' });
    await smoke.page.locator('#aktuellesAlter').waitFor({ state: 'attached' });
    // Ein-Profil-Szenario ohne Verbund: kein profilverbundHouseholdInputs, daher auf ausstehende Updates warten.
    await waitForWealthBrowserIdle(smoke.page);
    await assertWealthBrowserVisibility(smoke.page, false, 0);
    if (open) await activateWealthBrowserTab(smoke.page, true);
    const closeButton = smoke.page.locator('#jahresabschlussBtn');
    let releaseInflationFetch;
    const inflationFetchGate = new Promise(resolve => { releaseInflationFetch = resolve; });
    await smoke.page.route(url => url.hostname === 'data-api.ecb.europa.eu', async route => {
        await inflationFetchGate;
        await route.fallback();
    });
    let releaseAnnualFetch;
    let annualFetchStarted = false;
    const annualFetchGate = new Promise(resolve => { releaseAnnualFetch = resolve; });
    await smoke.page.route(url => url.hostname === '127.0.0.1' && url.port === '8787' && url.pathname === '/chart', async route => {
        annualFetchStarted = true;
        await annualFetchGate;
        await route.fallback();
    });
    const commitMessageIndex = await smoke.page.evaluate(() => window.__browserSmokeMessages.length);
    await closeButton.click({ force: true });
    try {
        // Echter Jahresprozess; der kontrollierte Inflationsabruf hält den Fortschritt sichtbar.
        await assertBalanceBrowserToast(smoke.page, 'Starte Jahres-Update...', 'info');
    } finally {
        releaseInflationFetch();
    }
    await waitForBrowserValue(async () => annualFetchStarted, started => started, 'Kontrollierter ETF-Abruf erreicht');
    await smoke.page.waitForFunction(() => document.getElementById('captureWealthBtn').disabled);
    assert(await closeButton.isDisabled() && await smoke.page.locator('#btnJahresUpdate').isDisabled(),
        'Der laufende Abschluss sperrt beide Jahresknöpfe und die manuelle Erfassung');
    await closeButton.click({ force: true });
    await smoke.page.keyboard.press('Alt+j');
    releaseAnnualFetch();
    try {
        await smoke.page.waitForFunction(() => document.getElementById('expensesYearSelect')?.value === '2027'
            && !document.getElementById('captureWealthBtn').disabled);
    } catch (error) {
        const details = await smoke.page.evaluate(() => ({
            age: document.getElementById('aktuellesAlter')?.value,
            year: document.getElementById('expensesYearSelect')?.value,
            error: document.getElementById('error-container')?.textContent,
            actionError: document.getElementById('action-error-container')?.textContent,
            messages: window.__browserSmokeMessages
        }));
        const stateRow = await readIndexedDb(smoke.page, 'kv', BALANCE_STATE_KEY);
        details.metadata = JSON.parse(stateRow.value).annualPeriodMetadata;
        details.snapshots = await readIndexedDb(smoke.page, 'snapshots', null);
        throw new Error(`Jahresabschluss erreichte den Commit nicht: ${JSON.stringify(details)}`, { cause: error });
    }
    await smoke.page.waitForFunction(index => window.__browserSmokeMessages.slice(index)
        .some(message => message === 'Ausgaben-Check auf 2027 umgestellt. Vermögensstand gesichert.'), commitMessageIndex);
    const commitMessages = await smoke.page.evaluate(index => window.__browserSmokeMessages.slice(index), commitMessageIndex);
    assert(commitMessages.filter(message => message.includes('Vermögensstand gesichert.')).length === 1,
        `Verlauf ${open ? 'aktiv' : 'inaktiv'}: neuer Abschluss bestätigt genau einmal den gesicherten Vermögensstand`);
    const commitToast = smoke.page.locator('#toast-container .toast-text');
    const expectedCommitText = 'Ausgaben-Check auf 2027 umgestellt. Vermögensstand gesichert.';
    await assertBalanceBrowserToast(smoke.page, expectedCommitText, 'success');
    // Reguläre Timer bleiben aktiv; gemessen wird die aktuelle Oberfläche, nicht das Protokoll.
    for (const [delay, elapsed] of [[1000, 1], [2000, 3]]) {
        await smoke.page.waitForTimeout(delay);
        assert(await commitToast.isVisible() && await commitToast.textContent() === expectedCommitText,
            `Verlauf ${open ? 'aktiv' : 'inaktiv'}: Abschlussbestätigung nach ${elapsed} s sichtbar und wortgleich`);
        await assertBalanceBrowserToast(smoke.page, expectedCommitText, 'success');
    }
    const committedAge = await smoke.page.locator('#aktuellesAlter').inputValue();
    assert(committedAge === '68', `Erfolgreicher Commit muss das Alter genau einmal erhoehen (Ist: ${committedAge})`);
    const row = await readIndexedDb(smoke.page, 'kv', BALANCE_STATE_KEY);
    const state = JSON.parse(row.value);
    assert(state.annualPeriodMetadata.lastCommittedPeriod === 'calendar-year:2026', 'Commit muss stabile Perioden-ID speichern');
    assert(
        state.balanceStateLifecycle?.lastCommittedPeriod === 'calendar-year:2026',
        'Fachlicher State-Commit muss dieselbe stabile Perioden-ID speichern'
    );
    assert(await readIndexedDb(smoke.page, 'snapshots', null) === 1, 'Doppelklick darf nur einen Recovery-Snapshot erzeugen');
    await smoke.page.keyboard.press('Escape');
    const entries = state.wealthHistory.entries;
    assert(entries.length === 1 && entries[0].id === 'annual:2026' && entries[0].asOf === '2026-12-31'
        && entries[0].reason === 'annual_close' && entries[0].periodId === 'calendar-year:2026',
    'Genau ein Jahresstand gehört zum abgeschlossenen Jahr, nicht zum Ausführungs- oder Rolloverjahr');
    assert(entries[0].tagesgeld === 100000 && entries[0].geldmarktEtf === 0
        && entries[0].depotwertAlt === 500000 && entries[0].depotwertNeu === 0
        && entries[0].aktienEtf === 500000 && entries[0].total === 600000,
    'Der Jahresstand erfasst die kontrollierten realen Eingabebestände statt simulierter Entnahmen');
    await assertWealthBrowserVisibility(smoke.page, open, 1);
    assert(await smoke.page.locator('#wealthHistoryStatus').textContent() === 'Stand gesichert', 'Neuer Jahresstand bestätigt nach Speicherung');
    if (!open) await activateWealthBrowserTab(smoke.page, true);
    await assertWealthBrowserTable(smoke.page, entries);
    const registry = JSON.parse((await readIndexedDb(smoke.page, 'kv', 'rs_profiles_v1')).value);
    const current = (await readIndexedDb(smoke.page, 'kv', 'rs_current_profile')).value;
    assert(JSON.stringify(JSON.parse(registry.profiles[current].data[BALANCE_STATE_KEY]).wealthHistory) === JSON.stringify(state.wealthHistory),
        'Der Jahresstand ist auch in der aktiven Registrykopie bestätigt');
    await smoke.page.getByRole('button', { name: 'Ausgaben-Check', exact: true }).click();
    await smoke.page.locator('#expensesYearSelect').selectOption('2026');
    await smoke.page.getByRole('button', { name: 'Jahres-Update', exact: true }).click();
    const repeatMessageIndex = await smoke.page.evaluate(() => window.__browserSmokeMessages.length);
    await smoke.page.locator('#btnJahresUpdate').click();
    await smoke.page.waitForFunction(index => window.__browserSmokeMessages.slice(index)
        .some(message => message.includes('Die Jahresperiode 2026 wurde bereits abgeschlossen.')), repeatMessageIndex);
    await smoke.page.waitForFunction(() => !document.getElementById('captureWealthBtn').disabled);
    await assertBalanceBrowserToast(smoke.page, 'Die Jahresperiode 2026 wurde bereits abgeschlossen.', 'info');
    assert(await smoke.page.locator('#wealthHistoryStatus').textContent() === '', 'Wiederholungs-No-op ohne neue Erfassungsbestätigung');
    const repeatMessages = await smoke.page.evaluate(index => window.__browserSmokeMessages.slice(index), repeatMessageIndex);
    assert(repeatMessages.some(message => message.includes('Die Jahresperiode 2026 wurde bereits abgeschlossen.')),
        'Die Wiederholung erreicht den fachlichen No-op statt an einer Vorprüfung zu scheitern');
    assert(!repeatMessages.some(message => message.includes('Vermögensstand gesichert.')),
        `Verlauf ${open ? 'aktiv' : 'inaktiv'}: fachlicher No-op ohne erneuten Vermögenszusatz`);
    assert(JSON.stringify((await readBalanceBrowserState(smoke.page)).wealthHistory.entries) === JSON.stringify(entries),
        'Der zweite Jahresknopf verändert einen bereits abgeschlossenen Jahresstand nicht');
    assert(await readIndexedDb(smoke.page, 'snapshots', null) === 1, 'Wiederholung erzeugt keinen zweiten Recovery-Snapshot');
    await smoke.page.reload({ waitUntil: 'load' });
    await waitForWealthBrowserIdle(smoke.page);
    await assertWealthBrowserVisibility(smoke.page, false, 1);
    await activateWealthBrowserTab(smoke.page, true);
    await smoke.page.locator('#wealthHistoryTable tbody tr').waitFor();
    await assertWealthBrowserTable(smoke.page, entries);
    smoke.assertNoErrors();
    await smoke.close();
}

async function runBalanceImportReject(browser, baseUrl) {
    const smoke = await openSmokePage(browser, baseUrl, 'Balance.html', { storage: createBalanceStorage(2025) });
    await smoke.page.locator('#profilverbund-profile-list input').waitFor({ state: 'visible' });
    await smoke.page.waitForTimeout(750);
    const before = await readIndexedDb(smoke.page, 'kv', BALANCE_STATE_KEY);
    await smoke.page.locator('.tab-btn[data-tab="settings"]').click();
    await smoke.page.locator('#snapshot-management').evaluate(element => { element.open = true; });
    await smoke.page.evaluate(() => {
        const transfer = new DataTransfer();
        transfer.items.add(new File(['{not-json'], 'invalid.json', { type: 'application/json' }));
        const input = document.getElementById('importFile');
        input.files = transfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await smoke.page.waitForFunction(() => document.getElementById('importFile').value === ''
        && window.__browserSmokeMessages.some(text => text.includes('kein gültiges JSON')));
    const visibleError = smoke.page.locator('#action-error-container .action-error-text').filter({ hasText: 'kein gültiges JSON' });
    await visibleError.waitFor({ state: 'visible' });
    const errorBeforeWait = await visibleError.textContent();
    await smoke.page.waitForTimeout(2000);
    assert(await visibleError.isVisible() && await visibleError.textContent() === errorBeforeWait,
        'Import-Reject bleibt nach abgeschlossener Verarbeitung noch nach 2 s sichtbar');
    const messages = await smoke.page.evaluate(() => window.__browserSmokeMessages);
    const diagnostics = await smoke.page.evaluate(() => ({
        files: Array.from(document.getElementById('importFile')?.files || []).map(file => file.name),
        error: document.getElementById('action-error-container')?.textContent
    }));
    assert(
        messages.some(message => message.includes('kein gültiges JSON')),
        `Import-Reject muss im Browser sichtbar werden: ${JSON.stringify({ messages, diagnostics, errors: smoke.errors })}`
    );
    const after = await readIndexedDb(smoke.page, 'kv', BALANCE_STATE_KEY);
    const beforeState = JSON.parse(before.value);
    const afterState = JSON.parse(after.value);
    assert(
        JSON.stringify(afterState.inputs) === JSON.stringify(beforeState.inputs),
        `Abgelehnter Import darf die persistenten Eingaben nicht veraendern: ${JSON.stringify({
            before: beforeState.inputs,
            after: afterState.inputs
        })}`
    );
    assert(
        JSON.stringify(afterState.annualPeriodMetadata) === JSON.stringify(beforeState.annualPeriodMetadata),
        'Abgelehnter Import darf die Jahresperioden-Metadaten nicht veraendern'
    );
    assert(await readIndexedDb(smoke.page, 'snapshots', null) === 0, 'Abgelehnter Import darf keinen Recovery-Snapshot erzeugen');
    smoke.assertNoErrors();
    await smoke.close();
}

async function runBalanceMessagePresentation(browser, baseUrl) {
    const smoke = await openSmokePage(browser, baseUrl, 'Balance.html', {
        storage: createBalanceStorage(2025), observeWealthUpdates: true
    });
    const { page } = smoke;
    const list = page.locator('#action-error-container');
    const button = scope => list.locator(`[data-scope="${scope}"] button`);
    const assertFocus = async locator => assert(await locator.evaluate(el => el === document.activeElement
        && document.activeElement !== document.body), 'Fokus bleibt auf dem erwarteten sichtbaren Knopf');
    const assertDescriptions = async () => {
        const valid = await list.evaluate(container => [...container.children].every(entry => {
            const text = entry.querySelector('.action-error-text');
            const close = entry.querySelector('button');
            return text.id && document.querySelectorAll(`[id="${text.id}"]`).length === 1
                && close.getAttribute('aria-label') === 'Fehlermeldung schließen'
                && document.getElementById(close.getAttribute('aria-describedby')) === text;
        }));
        assert(valid, 'Jeder Knopf hat den exakten Namen und eine eindeutige vorhandene Beschreibung');
    };
    const assertEmptyTabOrder = async () => {
        assert(await list.evaluate(el => el.children.length === 0 && el.tabIndex === -1
            && !el.hasAttribute('aria-label')), 'Leere Fehlerliste ist unbeschriftet und außerhalb der Tab-Reihenfolge');
        await page.locator('#openDiagnosisBtn').focus();
        await page.keyboard.press('Tab');
        assert(await page.evaluate(() => document.activeElement !== document.getElementById('action-error-container')
            && document.activeElement !== document.getElementById('openDiagnosisBtn')),
        'Tab vom Diagnoseknopf vor der leeren Liste überspringt den Fehlercontainer');
    };
    try {
        await page.locator('#profilverbund-profile-list input').waitFor({ state: 'visible' });
        await waitForWealthBrowserIdle(page);
        await assertEmptyTabOrder();
        await page.evaluate(async () => {
            const { UIRenderer } = await import('./app/balance/balance-renderer.js');
            UIRenderer.handleError(new Error('Berechnungsrahmen unverändert'));
            for (const scope of ['focus-a', 'focus-b', 'focus-c']) {
                UIRenderer.handleActionError(new Error(`Synthetischer Fehler ${scope}`), scope);
            }
        });
        await assertDescriptions();
        await page.locator('#openDiagnosisBtn').focus();
        await page.keyboard.press('Tab');
        assert(await list.evaluate(el => el === document.activeElement && el.tabIndex === 0),
            'Befüllte Fehlerliste ist vom vorherigen Diagnoseknopf per Tab erreichbar');
        assert(await page.getByRole('button', { name: 'Fehlermeldung schließen', exact: true }).count() === 3,
            'Alle drei Knöpfe besitzen denselben kurzen zugänglichen Namen');
        const calculationFrame = await page.locator('#error-container').evaluate(el => {
            const css = getComputedStyle(el);
            return [css.borderTopWidth, css.borderTopStyle, css.borderTopColor];
        });
        assert(JSON.stringify(calculationFrame) === JSON.stringify(['1px', 'solid', 'rgb(254, 178, 178)']),
            'Der Berechnungsfehler behält seinen bisherigen Rahmen');
        assert(await list.evaluate(el => [...el.children].every(entry =>
            getComputedStyle(entry).borderTopWidth === '2px'
            && getComputedStyle(entry.querySelector('.action-error-text')).borderTopWidth === '0px')),
        'Aktionsfehler haben jeweils nur einen sichtbaren Rahmen');

        const oldId = await list.locator('[data-scope="focus-b"] .action-error-text').getAttribute('id');
        await page.locator('#openDiagnosisBtn').focus();
        await page.evaluate(async () => {
            const { UIRenderer } = await import('./app/balance/balance-renderer.js');
            window.__staleMessageClose = document.querySelector('[data-scope="focus-b"] button');
            UIRenderer.handleActionError(new Error('Ersatzfehler'), 'focus-b');
            window.__staleMessageClose.click();
        });
        await assertFocus(page.locator('#openDiagnosisBtn'));
        assert(await page.locator(`[id="${oldId}"]`).count() === 0, 'Ersetzter Fehlertext bleibt nicht als verwaiste ID bestehen');
        await assertDescriptions();
        // Reihenfolge nach Ersatz: A, C, B. Mitte -> nächster, Ende -> Nachbar, letzter -> Diagnose.
        await button('focus-c').focus();
        await page.keyboard.press('Enter');
        await assertFocus(button('focus-b'));
        await page.keyboard.press('Space');
        await assertFocus(button('focus-a'));
        await page.keyboard.press('Enter');
        await assertFocus(page.locator('#openDiagnosisBtn'));
        assert(await list.locator('[aria-describedby]').count() === 0, 'Leere Liste hat keine verwaisten Beschreibungsbezüge');
        await assertEmptyTabOrder();
        await page.locator('#openDiagnosisBtn').focus();
        await page.evaluate(async () => {
            const { UIRenderer } = await import('./app/balance/balance-renderer.js');
            UIRenderer.handleActionError(new Error('Automatisch bereinigt'), 'automatic');
            UIRenderer.clearActionError('automatic');
            window.__staleMessageClose.click();
            delete window.__staleMessageClose;
        });
        await assertFocus(page.locator('#openDiagnosisBtn'));
        await assertEmptyTabOrder();

        for (const type of [true, 'info', false]) {
            await page.evaluate(async type => {
                const { UIRenderer } = await import('./app/balance/balance-renderer.js');
                UIRenderer.toast('Synthetische Kontrastprüfung', type);
            }, type);
            const colors = await page.locator('#toast-container').evaluate(el => {
                const foreground = getComputedStyle(el.querySelector('.toast-text')).color;
                const background = getComputedStyle(el).backgroundColor;
                const parse = color => color.match(/[\d.]+/g).map(Number);
                const luminance = color => parse(color).slice(0, 3).map(value => {
                    const srgb = value / 255;
                    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
                }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
                const fg = luminance(foreground), bg = luminance(background);
                return { foreground, background, opaque: (parse(background)[3] ?? 1) === 1,
                    contrast: (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05) };
            });
            assert(colors.opaque && colors.contrast >= 4.5,
                `Toast ${type}: errechneter Textkontrast mindestens 4,5:1: ${JSON.stringify(colors)}`);
        }

        for (const viewport of [{ width: 1366, height: 900 }, { width: 375, height: 700 }]) {
            await page.setViewportSize(viewport);
            const expectedText = await page.evaluate(async () => {
                const { UIRenderer } = await import('./app/balance/balance-renderer.js');
                const message = `${'Langer synthetischer Fehlertext mit vollständigen Details. '.repeat(35)}${'X'.repeat(150)}`;
                for (let i = 0; i < 4; i++) UIRenderer.handleActionError(new Error(message), `layout-${i}`);
                UIRenderer.toast('X'.repeat(150), 'info');
                return message;
            });
            await assertDescriptions();
            const layout = await list.evaluate(el => ({
                height: el.getBoundingClientRect().height,
                limit: Math.min(16 * parseFloat(getComputedStyle(document.documentElement).fontSize), innerHeight * 0.3),
                scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
                scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
                pageWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth
            }));
            assert(layout.height <= layout.limit + 1 && layout.scrollHeight > layout.clientHeight,
                `${viewport.width}px: lange Fehlerliste hält die maximale Höhe ein und scrollt: ${JSON.stringify(layout)}`);
            assert(layout.scrollWidth <= layout.clientWidth + 1 && layout.pageWidth <= layout.viewportWidth + 1,
                `${viewport.width}px: kein horizontaler Überlauf: ${JSON.stringify(layout)}`);
            for (const text of await list.locator('.action-error-text').allTextContents()) {
                assert(text.includes(expectedText), 'Lange Meldung wird vollständig ohne Kürzung gerendert');
            }
            await list.focus();
            await page.keyboard.press('Home');
            await page.waitForFunction(() => document.getElementById('action-error-container').scrollTop <= 1);
            await page.keyboard.press('End');
            await page.waitForFunction(() => {
                const el = document.getElementById('action-error-container');
                return el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
            });
            assert(await list.evaluate(el => {
                const bounds = el.getBoundingClientRect();
                return el.lastElementChild.getBoundingClientRect().bottom <= bounds.bottom + 1;
            }), 'Listenende mit vollständigem letztem Text ist per Tastatur erreichbar');
            await list.focus();
            for (let i = 0; i < 4; i++) {
                await page.keyboard.press('Tab');
                const reachable = await list.evaluate((el, i) => {
                    const close = el.children[i].querySelector('button');
                    const bounds = el.getBoundingClientRect(), rect = close.getBoundingClientRect();
                    return document.activeElement === close && rect.top >= bounds.top - 1 && rect.bottom <= bounds.bottom + 1;
                }, i);
                assert(reachable, `Knopf ${i + 1} ist bei ${viewport.width}px durch Tab sichtbar erreichbar`);
            }
        }
        await page.emulateMedia({ media: 'print' });
        assert(await list.evaluate(el => getComputedStyle(el).display === 'none')
            && await page.locator('#toast-container').evaluate(el => getComputedStyle(el).display === 'none'),
        'Aktionsfehler und nichtleerer Toast bleiben im Druck ausgeblendet');
        await page.emulateMedia({ media: 'screen' });
        assert(JSON.stringify(await page.locator('#error-container').evaluate(el => {
            const css = getComputedStyle(el);
            return [css.borderTopWidth, css.borderTopStyle, css.borderTopColor];
        })) === JSON.stringify(calculationFrame), 'Meldungsaktionen verändern den Berechnungsfehlerrahmen nicht');
        smoke.assertNoErrors();
    } finally { await smoke.close(); }
}

async function runBalanceFolderAbort(browser, baseUrl) {
    const smoke = await openSmokePage(browser, baseUrl, 'Balance.html', {
        storage: createBalanceStorage(2025), observeWealthUpdates: true
    });
    const { page } = smoke;
    try {
        await page.locator('#profilverbund-profile-list input').waitFor({ state: 'visible' });
        await waitForWealthBrowserIdle(page);
        await page.locator('.tab-btn[data-tab="settings"]').click();
        await page.locator('#snapshot-management').evaluate(element => {
            element.open = true;
            element.querySelector('details').open = true;
        });
        await page.evaluate(async () => {
            const { UIRenderer } = await import('./app/balance/balance-renderer.js');
            const { StorageManager } = await import('./app/balance/balance-storage.js');
            const picker = window.showDirectoryPicker;
            const connect = StorageManager.connectFolder;
            const clear = UIRenderer.clearActionError;
            const toast = UIRenderer.toast;
            UIRenderer.handleActionError(new Error('Snapshotfehler vor Ordnerwahl'), 'snapshots');
            UIRenderer.handleActionError(new Error('Unabhängiger Importfehler'), 'balance-import');
            const observer = window.__folderAbort = {
                opened: false, settled: false, completed: false, clears: [], toasts: [],
                entry: document.querySelector('#action-error-container [data-scope="snapshots"]'),
                foreign: document.querySelector('#action-error-container [data-scope="balance-import"]')
            };
            observer.text = observer.entry.textContent;
            observer.restore = () => {
                if (picker === undefined) delete window.showDirectoryPicker;
                else window.showDirectoryPicker = picker;
                StorageManager.connectFolder = connect;
                UIRenderer.clearActionError = clear;
                UIRenderer.toast = toast;
                delete window.__folderAbort;
            };
            // Nur den Betriebssystemdialog ersetzen; Knopf und Storage-Ablauf bleiben echt.
            window.showDirectoryPicker = () => {
                observer.opened = true;
                return new Promise((_, reject) => {
                    observer.abort = () => {
                        observer.settled = true;
                        reject(new DOMException('Ordnerwahl abgebrochen', 'AbortError'));
                    };
                });
            };
            StorageManager.connectFolder = async function (...args) {
                try { return await connect.apply(this, args); }
                finally { observer.completed = true; }
            };
            UIRenderer.clearActionError = function (scope) {
                observer.clears.push(scope);
                return clear.call(this, scope);
            };
            UIRenderer.toast = function (...args) {
                observer.toasts.push(args);
                return toast.apply(this, args);
            };
        });
        await page.locator('#connectFolderBtn').click();
        await page.waitForFunction(() => window.__folderAbort.opened);
        const unchanged = () => {
            const observer = window.__folderAbort;
            return document.querySelector('#action-error-container [data-scope="snapshots"]') === observer.entry
                && observer.entry.textContent === observer.text
                && document.querySelector('#action-error-container [data-scope="balance-import"]') === observer.foreign
                && observer.clears.length === 0 && observer.toasts.length === 0;
        };
        assert(await page.evaluate(unchanged), 'Offener Ordnerdialog erhält identische Meldungen ohne Bereinigung oder Erfolg');
        const messageIndex = await page.evaluate(() => {
            const index = window.__browserSmokeMessages.length;
            window.__folderAbort.abort();
            return index;
        });
        await page.waitForFunction(() => window.__folderAbort.settled && window.__folderAbort.completed);
        await page.waitForFunction(unchanged);
        await page.locator('#action-error-container [data-scope="snapshots"]').waitFor({ state: 'visible' });
        assert(await page.evaluate(unchanged), 'Abgeschlossener AbortError erhält Meldungsidentität und fremde Bereiche');
        assert(await page.evaluate(index => window.__browserSmokeMessages.length === index, messageIndex),
            'Abbruch erzeugt weder neue Fehlermeldung noch Erfolgsmeldung');
        smoke.assertNoErrors();
    } finally {
        await page.evaluate(() => window.__folderAbort?.restore());
        await smoke.close();
    }
}

// Ohne Modul-Closure auch direkt über page.evaluate verwendbar.
function readBalanceImportResults() {
    return Object.fromEntries(['displayDepotwert', 'monatlicheEntnahme', 'miniSummary', 'handlungContent']
        .map(id => [id, document.getElementById(id)?.textContent]));
}

async function runBalanceImportRestoration(browser, baseUrl) {
    const smoke = await openSmokePage(browser, baseUrl, 'Balance.html', {
        storage: createBalanceStorage(2025), observeWealthUpdates: true,
        fixedTime: '2026-10-03T12:00:00+02:00'
    });
    const { page } = smoke;
    try {
        await page.locator('#profilverbund-profile-list input').waitFor({ state: 'visible' });
        await waitForWealthBrowserIdle(page);
        const valid = await page.evaluate(async () => (await import('./app/balance/balance-main.js')).update({ mode: 'preview' }).ok);
        assert(valid, 'Importregression startet mit gültiger Baseline');

        // Gesonderte Dateievents: echte Formbindung, kein Importhandlerstart.
        const protection = await page.evaluate(async debounceMs => {
            const { UIReader } = await import('./app/balance/balance-reader.js');
            const { UIRenderer } = await import('./app/balance/balance-renderer.js');
            const { ValidationError } = await import('./app/balance/balance-config.js');
            UIRenderer.handleError(new ValidationError([{ fieldId: 'minimumFlexAnnual', message: 'Synthetischer bestehender Berechnungsfehler' }]));
            const before = document.getElementById('error-container').textContent;
            const marks = () => [...document.querySelectorAll('.input-error')].map(el => el.id).sort();
            const markedBefore = marks();
            const calls = { updates: 0, clears: 0, scheduled: 0 };
            const read = UIReader.readAllInputs;
            const clear = UIRenderer.clearError;
            const timerDescriptor = Object.getOwnPropertyDescriptor(window, 'setTimeout');
            const schedule = window.setTimeout;
            const temporary = document.createElement('input');
            temporary.type = 'file';
            document.querySelector('.form-column').appendChild(temporary);
            try {
                UIReader.readAllInputs = function (...args) { calls.updates++; return read.apply(this, args); };
                UIRenderer.clearError = function (...args) { calls.clears++; return clear.apply(this, args); };
                Object.defineProperty(window, 'setTimeout', { configurable: true, writable: true,
                    value: (callback, delay, ...args) => {
                        if (delay === debounceMs) calls.scheduled++;
                        return schedule(callback, delay, ...args);
                    } });
                temporary.dispatchEvent(new Event('input', { bubbles: true }));
                temporary.dispatchEvent(new Event('change', { bubbles: true }));
                for (const id of ['importFile', 'csvFileInput', 'expensesCsvInput']) {
                    document.getElementById(id).dispatchEvent(new Event('input', { bubbles: true }));
                }
                await new Promise(resolve => schedule(resolve, debounceMs + 50));
                return { calls, before, after: document.getElementById('error-container').textContent,
                    markedBefore, markedAfter: marks() };
            } finally {
                temporary.remove();
                UIReader.readAllInputs = read;
                UIRenderer.clearError = clear;
                Object.defineProperty(window, 'setTimeout', timerDescriptor);
            }
        }, BALANCE_UPDATE_DEBOUNCE_MS);
        assert(Object.values(protection.calls).every(count => count === 0), `Dateievents: null Updates, clearError und entprellte Vormerkungen: ${JSON.stringify(protection.calls)}`);
        assert(protection.before === protection.after && protection.markedBefore.includes('minimumFlexAnnual')
            && JSON.stringify(protection.markedBefore) === JSON.stringify(protection.markedAfter), 'Dateievents erhalten Fehler und Feldmarkierungen exakt');
        await page.evaluate(async () => (await import('./app/balance/balance-main.js')).update({ mode: 'preview' }));

        await page.locator('#marketCsvMode').evaluate(el => { el.closest('details').open = true; });
        // Direkte Belegung vermeidet zusätzliche fachfremde Formupdates vor dem Import.
        await page.evaluate(() => {
            for (const [id, value] of Object.entries({ marketCsvMode: 'current', marketCsvTargetYear: '2025',
                marketCsvExpectedAsOf: '2025-12-30', marketCsvInstrument: 'VWCE.DE' })) document.getElementById(id).value = value;
        });

        for (const failure of ['json-replace', 'json-final', 'csv-replace']) {
            await waitForWealthBrowserIdle(page);
            const baseline = await page.evaluate(readBalanceImportResults);
            const beforeState = await readBalanceBrowserState(page);
            const fields = await page.evaluate(() => Object.fromEntries(['floorBedarf', 'endeVJ', 'ath', 'minimumFlexAnnual']
                .map(id => [id, document.getElementById(id).value])));
            const provenance = await page.locator('#marketDataProvenance').textContent();
            const messageIndex = await page.evaluate(() => window.__browserSmokeMessages.length);
            const document = await page.evaluate(async () => {
                const { StorageManager } = await import('./app/balance/balance-storage.js');
                const { createBalanceExportDocument } = await import('./app/balance/balance-binder-imports.js');
                const doc = createBalanceExportDocument(StorageManager.loadState());
                doc.payload.inputs.floorBedarf = 32000;
                doc.payload.inputs.endeVJ = 500;
                return doc;
            });
            await page.evaluate(async ({ failure, baseline }) => {
                const { StorageManager } = await import('./app/balance/balance-storage.js');
                const { StorageError } = await import('./app/balance/balance-config.js');
                const { UIRenderer } = await import('./app/balance/balance-renderer.js');
                const replace = StorageManager.replaceStateFromImport;
                const actionError = UIRenderer.handleActionError;
                const read = () => Object.fromEntries(['displayDepotwert', 'monatlicheEntnahme', 'miniSummary', 'handlungContent']
                    .map(id => [id, document.getElementById(id)?.textContent]));
                const observation = window.__importFailureObservation = {};
                window.__restoreImportFailureHooks = () => {
                    StorageManager.replaceStateFromImport = replace;
                    UIRenderer.handleActionError = actionError;
                    delete window.__restoreImportFailureHooks;
                    delete window.__importFailureObservation;
                };
                StorageManager.replaceStateFromImport = async function (...args) {
                    observation.dryDiffers = JSON.stringify(read()) !== JSON.stringify(baseline);
                    if (failure !== 'json-final') throw new StorageError('Synthetischer Import-Snapshotfehler');
                    const receipt = await replace.apply(this, args);
                    document.getElementById('minimumFlexAnnual').value = '-1';
                    return receipt;
                };
                UIRenderer.handleActionError = function (error, scope) {
                    observation.beforeError = read();
                    observation.code = error.code || error.context?.code;
                    observation.scope = scope;
                    return actionError.call(this, error, scope);
                };
            }, { failure, baseline });
            try {
                const isCsv = failure === 'csv-replace';
                const id = isCsv ? 'csvFileInput' : 'importFile';
                const content = isCsv ? 'Datum;Schluss\n30.12.2022;1000\n30.12.2023;1200\n30.12.2024;900\n30.12.2025;500' : JSON.stringify(document);
                const expectedText = failure === 'json-final' ? 'automatisch wiederhergestellt' : 'Speicherung konnte nicht bestätigt werden';
                await page.locator(`#${id}`).setInputFiles({ name: isCsv ? 'synthetischer-markt.csv' : 'synthetischer-import.json',
                    mimeType: isCsv ? 'text/csv' : 'application/json', buffer: Buffer.from(content) });
                await page.waitForFunction(({ id, index, text }) => document.getElementById(id).value === ''
                    && window.__browserSmokeMessages.slice(index).some(message => message.includes(text)),
                { id, index: messageIndex, text: expectedText });
                await waitForWealthBrowserIdle(page);
                const observation = await page.evaluate(() => window.__importFailureObservation);
                assert(observation.dryDiffers, `${failure}: erfolgreicher Dry-Run zeigt abweichende Ergebnisse`);
                assert(JSON.stringify(observation.beforeError) === JSON.stringify(baseline), `${failure}: KPI und Handlung bereits vor dem Aktionsfehler wiederhergestellt`);
                assert(observation.code === (failure === 'json-final' ? 'post_replace_validation_failed' : 'storage_failed'), `${failure}: ursprünglicher sicherer Fehlercode`);
                assert(JSON.stringify(await page.evaluate(readBalanceImportResults)) === JSON.stringify(baseline), `${failure}: Ergebnisse entsprechen gültiger Baseline`);
                assert(JSON.stringify(await readBalanceBrowserState(page)) === JSON.stringify(beforeState), `${failure}: gespeicherter Ausgangsstand erhalten`);
                for (const [id, value] of Object.entries(fields)) assert(await page.locator(`#${id}`).inputValue() === value, `${failure}: ${id} wiederhergestellt`);
                assert(await page.locator('#marketDataProvenance').textContent() === provenance, `${failure}: Provenienzanzeige erhalten`);
                const error = page.locator(`#action-error-container [data-scope="${isCsv ? 'market-csv-import' : 'balance-import'}"] .action-error-text`);
                assert(await error.isVisible(), `${failure}: neuer Aktionsfehler sichtbar`);
                assert((await page.evaluate(index => window.__browserSmokeMessages.slice(index), messageIndex)).includes(await error.textContent()), `${failure}: neuer Aktionsfehler protokolliert`);
                assert(await page.locator('.input-error').count() === 0 && await page.locator('#error-container').textContent() === '', `${failure}: verworfene Berechnungsfehler und Markierungen entfernt`);
            } finally { await page.evaluate(() => window.__restoreImportFailureHooks?.()); }
        }
        smoke.assertNoErrors(['Synthetischer bestehender Berechnungsfehler', 'Update-Fehler: ValidationError']);
    } finally { await smoke.close(); }
}

async function runBalanceCsvImportRoundtrip(browser, baseUrl) {
    const storage = createBalanceStorage(2025);
    const seededState = JSON.parse(storage[BALANCE_STATE_KEY]);
    seededState.inputs.dynamicFlex = true;
    seededState.inputs.goGoActive = false;
    storage[BALANCE_STATE_KEY] = JSON.stringify(seededState);
    const smoke = await openSmokePage(browser, baseUrl, 'Balance.html', { storage });
    const { page } = smoke;
    await page.locator('#profilverbund-profile-list input').waitFor({ state: 'visible' });
    await page.waitForTimeout(750);
    const csvTargetYear = await page.evaluate(() => new Date().getFullYear() - 1);
    const csvExpectedAsOf = `${csvTargetYear}-12-30`;
    const csvSourceFileName = `markt-${csvTargetYear}.csv`;
    await page.locator('#marketCsvMode').evaluate(element => {
        const details = element.closest('details');
        if (details) details.open = true;
    });
    await page.locator('#marketCsvMode').selectOption('current');
    await page.locator('#marketCsvTargetYear').fill(String(csvTargetYear));
    await page.locator('#marketCsvExpectedAsOf').fill(csvExpectedAsOf);
    await page.locator('#marketCsvInstrument').fill('vwce.de');

    const csv = [
        'Datum;Schluss',
        `30.12.${csvTargetYear - 3};100`,
        `30.12.${csvTargetYear - 2};110`,
        `30.12.${csvTargetYear - 1};120`,
        `30.12.${csvTargetYear};130`
    ].join('\n');
    const csvMessageIndex = await page.evaluate(() => window.__browserSmokeMessages.length);
    await page.locator('#csvFileInput').setInputFiles({
        name: csvSourceFileName,
        mimeType: 'text/csv',
        buffer: Buffer.from(csv, 'utf8')
    });
    const csvImportStatus = page.locator('#toast-container .toast-text')
        .filter({ hasText: 'CSV importiert' });
    await csvImportStatus.waitFor({
        state: 'visible',
        timeout: 10000
    });
    const csvImportStatusText = await csvImportStatus.textContent();
    assert(
        csvImportStatusText.includes('CSV importiert'),
        `CSV-Roundtrip muss erfolgreich abschliessen; Status war: ${csvImportStatusText}`
    );
    await page.waitForFunction(({ index, text }) => window.__browserSmokeMessages.slice(index).includes(text),
        { index: csvMessageIndex, text: csvImportStatusText });
    assert(await page.evaluate(({ index, text }) => window.__browserSmokeMessages.slice(index).includes(text),
        { index: csvMessageIndex, text: csvImportStatusText }),
    'Der Markt-CSV-Erfolg erzeugt seit der Aktion einen neuen wortgleichen Protokolleintrag');

    const row = await readIndexedDb(page, 'kv', BALANCE_STATE_KEY);
    const imported = JSON.parse(row.value);
    const meta = imported.annualMarketDataMeta;
    assert(imported.inputs.ath === 0,
        'Ein CSV-Fensterhoch am letzten Kurs darf nicht als Allzeithoch persistiert werden');
    assert(imported.inputs.jahreSeitAth === 0,
        'Jahre seit der Engine-Untergrenze müssen aus dem beobachteten CSV-Fenster stammen');
    assert(meta?.periodId === `calendar-year:${csvTargetYear}`, 'CSV-Provenienz muss die explizite Zielperiode persistieren');
    assert(meta?.asOf === csvExpectedAsOf, 'CSV-Provenienz muss den bestätigten Stichtag persistieren');
    assert(meta?.instrument === 'VWCE.DE', 'CSV-Provenienz muss das normalisierte Instrument persistieren');
    assert(meta?.sourceFileName === csvSourceFileName, 'CSV-Provenienz muss die Quelldatei persistieren');
    assert(meta?.highScope === 'windowHigh', 'Vier CSV-Zeilen dürfen nur ein windowHigh belegen');
    assert(meta?.ath?.engineAvailable === false, 'Manueller Fensterimport darf weiterhin kein echtes ATH behaupten');
    assert(
        meta?.engineReference?.policy === 'window_high_as_conservative_ath_lower_bound',
        'Die interne Engine-Verwendung muss maschinenlesbar als konservative Untergrenze markiert sein'
    );
    assert(meta?.engineReference?.applied === false,
        'Das steigende CSV-Fenster muss die Engine-Untergrenze als nicht angewendet markieren');
    assert(imported.inputs.dynamicFlex === true, 'CSV-Roundtrip muss Boolean true semantisch erhalten');
    assert(imported.inputs.goGoActive === false, 'CSV-Roundtrip muss Boolean false semantisch erhalten');
    assert(await readIndexedDb(page, 'snapshots', null) === 1, 'CSV-Replace muss genau einen Recovery-Snapshot anlegen');

    await page.reload({ waitUntil: 'load' });
    await page.locator('#marketDataProvenance[data-available="true"]').waitFor({
        state: 'visible',
        timeout: 10000
    });
    const provenanceView = await page.locator('#marketDataProvenance').evaluate(element => ({
        text: element.textContent,
        periodId: element.dataset.periodId,
        asOf: element.dataset.asOf,
        instrument: element.dataset.instrument,
        highScope: element.dataset.highScope,
        engineReferenceApplied: element.dataset.engineReferenceApplied
    }));
    assert(provenanceView.periodId === `calendar-year:${csvTargetYear}`, 'Reload muss die persistierte CSV-Periode wieder anzeigen');
    assert(provenanceView.asOf === csvExpectedAsOf, 'Reload muss den persistierten Stichtag wieder anzeigen');
    assert(provenanceView.instrument === 'VWCE.DE', 'Reload muss das persistierte Instrument wieder anzeigen');
    assert(provenanceView.highScope === 'windowHigh', 'Reload muss die eingeschränkte Hoch-Semantik wieder anzeigen');
    assert(provenanceView.engineReferenceApplied === 'false',
        'Reload muss den neutralen Anwendungsstatus der Engine-Referenz anzeigen');
    assert(provenanceView.text.includes(csvSourceFileName), 'Reload muss die persistierte Quelle sichtbar anzeigen');
    assert(provenanceView.text.includes('nicht angewendet'),
        'Reload muss den neutralen Fallback der Fensterhoch-Untergrenze sichtbar benennen');
    assert(await page.locator('#dynamicFlex').isChecked(), 'Reload muss Dynamic Flex als echtes Boolean true anwenden');
    assert(!(await page.locator('#goGoActive').isChecked()), 'Reload muss Go-Go als echtes Boolean false anwenden');

    await page.locator('#openDiagnosisBtn').click();
    await page.locator('#diag-key-params').filter({ hasText: 'Marktdaten-Provenienz' }).waitFor({
        state: 'visible',
        timeout: 10000
    });
    const diagnosisText = await page.locator('#diag-key-params').textContent();
    assert(diagnosisText.includes('Hoch-Scope windowHigh'), 'Diagnose muss das CSV-Hoch nach Reload als windowHigh kennzeichnen');
    assert(diagnosisText.includes('Engine-Referenz nicht angewendet'),
        'Diagnose muss den neutralen Anwendungsstatus der Engine-Referenz sichtbar benennen');

    smoke.assertNoErrors();
    await smoke.close();
}

async function runBalanceCorruptExpenses(browser, baseUrl) {
    const storage = { ...createBalanceStorage(2025), [EXPENSES_KEY]: '{not-json' };
    const smoke = await openSmokePage(browser, baseUrl, 'Balance.html', { storage });
    await smoke.page.locator('#profilverbund-profile-list input').waitFor({ state: 'visible' });
    await smoke.page.locator('.tab-btn[data-tab="ausgaben"]').click();
    await smoke.page.locator('[data-expenses-recovery="corrupt"]').waitFor({ state: 'visible' });
    assert(await smoke.page.locator('#expensesYearSelect').isDisabled(), 'Korruptionszustand muss Ausgabenaktionen sperren');
    const row = await readIndexedDb(smoke.page, 'kv', EXPENSES_KEY);
    assert(row.value === '{not-json', 'Korruptionswarnung darf Rohdaten nicht ueberschreiben');
    smoke.assertNoErrors();
    await smoke.close();
}

async function runSimulatorSmoke(browser, baseUrl) {
    const smoke = await openSmokePage(browser, baseUrl, 'Simulator.html');
    const { page } = smoke;
    await page.locator('h1').filter({ hasText: 'Ruhestand-Simulator' }).waitFor({ state: 'visible' });
    const tabStripLayout = await page.locator('.tab-buttons').evaluate(strip => {
        const tabs = [...strip.querySelectorAll('.tab-btn')];
        return {
            clientWidth: strip.clientWidth,
            scrollWidth: strip.scrollWidth,
            tabs: tabs.map(tab => ({ id: tab.dataset.tab, label: tab.textContent.trim() })),
            tabWidths: tabs.map(tab => tab.getBoundingClientRect().width)
        };
    });
    assert(JSON.stringify(tabStripLayout.tabs) === JSON.stringify([
        { id: 'rahmendaten', label: 'Rahmendaten' },
        { id: 'montecarlo', label: 'Monte-Carlo' },
        { id: 'backtesting', label: 'Backtesting' },
        { id: 'sweep', label: 'Parameter-Sweep' },
        { id: 'auto-optimize', label: 'Auto-Optimize' }
    ]), `Simulator muss genau die fuenf Haupttabs in der vorgesehenen Reihenfolge anzeigen: ${JSON.stringify(tabStripLayout)}`);
    for (const { id } of tabStripLayout.tabs) {
        assert(await page.locator(`.tab-buttons .tab-btn[data-tab="${id}"]`).isVisible(),
            `Haupttab ${id} muss im Desktop-Viewport sichtbar sein`);
    }
    assert(tabStripLayout.tabWidths.every(width => width > 0 && width < tabStripLayout.clientWidth),
        `Jeder Haupttab muss positive Breite haben und schmaler als die Stripleiste sein: ${JSON.stringify(tabStripLayout)}`);
    assert(tabStripLayout.scrollWidth <= tabStripLayout.clientWidth + 1,
        `Alle fuenf Haupttabs muessen im Desktop-Viewport ohne horizontales Scrollen sichtbar sein: ${JSON.stringify(tabStripLayout)}`);
    const mcCancelButton = page.locator('#mcCancelButton');
    assert(await mcCancelButton.count() === 1, 'Simulator must expose exactly one Monte-Carlo cancel control');
    assert(await mcCancelButton.isHidden(), 'Monte-Carlo cancel control must stay hidden before a run starts');
    assert(await mcCancelButton.isDisabled(), 'Monte-Carlo cancel control must stay disabled before a run starts');
    const mcRuns = page.locator('#mcAnzahl');
    const mcDuration = page.locator('#mcDauer');
    const mcEstimate = page.locator('#mcResourceEstimate');
    const mcConfirmationRow = page.locator('#mcLargeRunConfirmationRow');
    const mcConfirmation = page.locator('#mcLargeRunConfirm');
    await page.locator('.tab-btn[data-tab="montecarlo"]').click();
    await page.locator('#tab-montecarlo').waitFor({ state: 'visible' });
    assert(await page.locator('.tab-buttons').count() === 1,
        'Monte-Carlo cockpit must not introduce a second main-tab strip');
    const mcViewTabs = page.locator('.mc-view-tab');
    assert(await mcViewTabs.count() === 5, 'Monte-Carlo cockpit exposes five result views');
    assert(await page.locator('.mc-view-panel').count() === 5, 'each Monte-Carlo result view owns one panel');
    assert(await page.locator('#mcViewTabOverview').getAttribute('aria-selected') === 'true',
        'overview is the initial Monte-Carlo result view');
    await page.locator('#mcViewTabOverview').press('End');
    assert(await page.locator('#mcViewTabReplay').getAttribute('aria-selected') === 'true'
        && await page.locator('#mcViewTabReplay').getAttribute('tabindex') === '0',
    'End activates replay and moves the roving tabindex');
    assert(await page.locator('#mcViewPanelReplay').isVisible()
        && await page.locator('#mcViewPanelOverview').isHidden(),
    'only the activated Monte-Carlo result panel is visible');
    assert(await page.evaluate(() => document.activeElement?.id) === 'mcViewTabReplay',
        'End moves focus with activation');
    await page.locator('#mcViewTabReplay').press('ArrowRight');
    assert(await page.locator('#mcViewTabOverview').getAttribute('aria-selected') === 'true',
        'ArrowRight wraps from replay to overview');
    await page.locator('#mcViewTabOverview').press('ArrowLeft');
    assert(await page.locator('#mcViewTabReplay').getAttribute('aria-selected') === 'true',
        'ArrowLeft wraps from overview to replay');
    await page.locator('#mcViewTabReplay').press('Home');
    assert(await page.locator('#mcViewTabOverview').getAttribute('aria-selected') === 'true',
        'Home activates and focuses overview');
    const setupDisclosure = page.locator('#mcSetupDisclosure');
    const setupSummary = setupDisclosure.locator('summary');
    assert(await setupDisclosure.evaluate(details => details.open), 'Monte-Carlo setup starts expanded');
    assert((await page.locator('#mcSetupSummaryRuns').textContent()) === '10000',
        'Monte-Carlo setup summary exposes the current run count');
    assert((await page.locator('#mcSetupSummaryDuration').textContent()) === '35',
        'Monte-Carlo setup summary exposes the current duration');
    const openChevronTransform = await page.locator('.mc-setup-toggle').evaluate(toggle =>
        getComputedStyle(toggle, '::after').transform);
    assert(await page.locator('.mc-setup-state-open').isVisible()
        && await page.locator('.mc-setup-state-closed').isHidden(),
    'expanded setup shows only the Setup ausblenden state');
    await page.locator('#mcSeed').fill('24680');
    // Die Mitte der Summary kann ein eingebettetes output statt der Toggle-Beschriftung treffen.
    await setupSummary.locator('.mc-setup-state-open').click();
    assert(!(await setupDisclosure.evaluate(details => details.open)), 'setup disclosure closes with the pointer');
    // Der Chevron dreht per CSS-Transition (0.2s); den Endwinkel erst nach Ablauf der Drehung lesen.
    await page.locator('.mc-setup-toggle').evaluate(toggle => Promise.all(
        toggle.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))));
    const closedChevronTransform = await page.locator('.mc-setup-toggle').evaluate(toggle =>
        getComputedStyle(toggle, '::after').transform);
    assert(await page.locator('.mc-setup-state-open').isHidden()
        && await page.locator('.mc-setup-state-closed').isVisible(),
    'collapsed setup shows only the Setup bearbeiten state');
    assert(closedChevronTransform !== openChevronTransform, 'setup chevron rotation follows the native open state');
    await setupSummary.press('Enter');
    assert(await setupDisclosure.evaluate(details => details.open), 'setup disclosure opens with Enter');
    assert(await page.locator('#mcSeed').inputValue() === '24680', 'opening setup preserves the configured values');
    await setupSummary.press('Space');
    assert(!(await setupDisclosure.evaluate(details => details.open)), 'setup disclosure closes with Space');
    await setupSummary.press('Space');
    assert(await setupDisclosure.evaluate(details => details.open), 'setup disclosure reopens with Space');

    const lifecycleDisclosureStates = await page.evaluate(async () => {
        const { createMonteCarloUI } = await import('./app/simulator/monte-carlo-ui.js');
        const ui = createMonteCarloUI();
        const setup = document.getElementById('mcSetupDisclosure');
        setup.open = true;
        ui.showCancelled();
        const afterCancel = setup.open;
        ui.showError('Cockpit-Smoke-Fehler');
        const afterError = setup.open;
        document.getElementById('mc-error-container').style.display = 'none';
        setup.open = true;
        ui.showCompleted();
        const afterCompleted = setup.open;
        const activeAfterCompleted = document.querySelector('.mc-view-tab[aria-selected="true"]')?.dataset.mcView;
        setup.open = true;
        return { afterCancel, afterError, afterCompleted, activeAfterCompleted };
    });
    assert(lifecycleDisclosureStates.afterCancel, 'cancel leaves the Monte-Carlo setup open');
    assert(lifecycleDisclosureStates.afterError, 'technical error leaves the Monte-Carlo setup open');
    assert(!lifecycleDisclosureStates.afterCompleted, 'successful completion closes the Monte-Carlo setup');
    assert(lifecycleDisclosureStates.activeAfterCompleted === 'overview',
        'successful completion activates overview before terminal focus');

    const cancelledRerunFocus = await page.evaluate(async () => {
        const { createMonteCarloUI } = await import('./app/simulator/monte-carlo-ui.js');
        const ui = createMonteCarloUI();
        const setup = document.getElementById('mcSetupDisclosure');
        const primary = document.getElementById('mcButton');
        ui.showCompleted();
        ui.beginRun();
        ui.showCancelled();
        ui.finishRun();
        // Buttons tragen eine allgemeine Transition (0.3s); Breite und Rand des
        // Skip-Link-Knopfs gleiten von 1px auf die Zielgroesse. Erst danach messen.
        await Promise.all(primary.getAnimations().map(animation => animation.finished.catch(() => {})));
        const result = {
            setupOpen: setup.open,
            activeElementId: document.activeElement?.id || null,
            primaryDisplay: getComputedStyle(primary).display,
            primaryRectCount: primary.getClientRects().length,
            primaryRectWidth: primary.getBoundingClientRect().width
        };
        setup.open = true;
        return result;
    });
    assert(!cancelledRerunFocus.setupOpen,
        'cancelled recalculation keeps the setup collapsed after a successful run');
    assert(cancelledRerunFocus.activeElementId === 'mcButton'
        && cancelledRerunFocus.primaryDisplay !== 'none'
        && cancelledRerunFocus.primaryRectCount > 0
        && cancelledRerunFocus.primaryRectWidth > 1,
    `cancelled recalculation restores focus to a visible canonical start button: ${JSON.stringify(cancelledRerunFocus)}`);

    const delegatedStarts = await page.evaluate(async () => {
        const primary = document.getElementById('mcButton');
        const secondary = document.getElementById('mcRecalculateButton');
        let starts = 0;
        primary.addEventListener('click', event => {
            starts += 1;
            event.preventDefault();
            event.stopImmediatePropagation();
        }, { capture: true, once: true });
        secondary.click();
        await Promise.resolve();
        primary.disabled = true;
        primary.setAttribute('aria-busy', 'true');
        await new Promise(resolve => setTimeout(resolve, 0));
        const mirroredBusy = secondary.disabled && secondary.getAttribute('aria-busy') === 'true';
        secondary.click();
        primary.disabled = false;
        primary.removeAttribute('aria-busy');
        await new Promise(resolve => setTimeout(resolve, 0));
        return { starts, mirroredBusy, restored: !secondary.disabled && !secondary.hasAttribute('aria-busy') };
    });
    assert(delegatedStarts.starts === 1, 'Neu rechnen delegates exactly one start to the canonical button');
    assert(delegatedStarts.mirroredBusy, 'Neu rechnen mirrors disabled and busy state during a run');
    assert(delegatedStarts.restored, 'Neu rechnen returns to idle with the canonical button');
    await page.locator('#mcViewTabReplay').click();
    assert(await page.locator('#mcViewPanelReplay').isVisible(),
        'replay remains reachable through the result navigation before a Monte-Carlo run');
    assert(await page.locator('#mcViewPanelLogs #scenarioSelector').count() === 1,
        'the stable scenario selector container lives exactly once in scenario logs');
    assert(await page.locator('#stressReplaySelectedScenario').count() === 1
        && (await page.locator('#stressReplaySelectedScenario').textContent()).includes('Kein Lauf ausgewählt.'),
    'replay exposes one empty read-only selection projection before a run');
    assert(await page.locator('.stress-replay-step').count() === 3,
        'replay exposes three derived workflow cards');
    assert(await page.locator('#stressReplayStepSelect').getAttribute('data-step-state') === 'active',
        'run selection is the active step without a workspace');
    assert(await page.locator('#stressReplayBanner dt').count() === 7,
        'banner retains all seven source and diagnostic values');
    await page.locator('#mcViewTabLogs').click();
    await page.locator('#mcShowReplayButton').click();
    assert(await page.locator('#mcViewPanelReplay').isVisible(),
        'scenario-log backlink activates replay without a completed run');
    assert(await page.evaluate(() => document.activeElement?.id) === 'stressReplaySelectedScenario',
        'scenario-log backlink focuses the visible replay projection without a scenario select');
    await page.locator('#mcShowScenarioLogsButton').click();
    assert(await page.locator('#mcViewPanelLogs').isVisible()
        && await page.evaluate(() => document.activeElement?.id) === 'mcShowReplayButton',
    'replay return action exposes logs and focuses its visible fallback before a run');
    assert(await mcRuns.inputValue() === '10000', 'new Simulator profile uses the 10,000-run Monte-Carlo default');
    await mcEstimate.filter({ hasText: 'Run-Jahre' }).waitFor({ state: 'visible' });
    assert((await mcEstimate.textContent()).includes('Speicherklasse'), 'Monte-Carlo resource estimate names its memory class');
    assert(await page.locator('#mc-progress-bar-container').getAttribute('role') === 'progressbar', 'Monte-Carlo progress is semantic in a real browser');
    assert(await page.locator('#mc-error-container').getAttribute('role') === 'alert', 'Monte-Carlo errors are not color-only in a real browser');
    assert(await page.locator('#stressReplayFixButton').count() === 1,
        'Simulator must expose exactly one stress replay fixation action');
    assert(await page.locator('#stressReplayFixButton').isDisabled(),
        'Stress replay fixation stays disabled before a scenario selection');
    assert(await page.locator('#stressReplayStatus').getAttribute('aria-live') === 'polite',
        'Stress replay session updates must use a polite live region');
    assert(await page.locator('#stressReplayWorkspace').getAttribute('aria-busy') === 'false',
        'Stress replay workspace exposes its initially idle mutation state');
    assert(await page.locator('#stressReplayBanner').getAttribute('tabindex') === '-1',
        'Stress replay banner must be programmatically focusable');
    assert(await page.locator('#stressReplayImportFile').getAttribute('accept') === 'application/json,.json',
        'Stress replay import must be constrained to JSON files');
    assert(!(await page.locator('#stressReplayImportFile').isDisabled()),
        'Stress replay file selection is available while the workspace is idle');
    const variantFieldsetState = await page.locator('#stressReplayVariantFields').evaluate(fieldset => ({
        disabledProperty: fieldset.disabled === true,
        hasDisabledAttribute: fieldset.hasAttribute('disabled')
    }));
    assert(variantFieldsetState.disabledProperty,
        'Variant editor fieldset has its disabled DOM property until an executable fixed path exists');
    assert(variantFieldsetState.hasDisabledAttribute,
        'Variant editor fieldset keeps its disabled HTML attribute until an executable fixed path exists');
    assert(await page.locator('#stressReplayVariantFields #stressReplayVariantLabel').isDisabled(),
        'Variant editor contains an effectively disabled control until an executable fixed path exists');
    assert((await page.locator('#stressReplayStatus').textContent()).includes('Starten Sie zuerst einen Monte-Carlo-Lauf.'),
        'Empty stress replay status requests a Monte-Carlo run before scenario selection');
    assert(await page.locator('#stressReplayVariantLabel').getAttribute('maxlength') === '60',
        'Variant labels have a bounded keyboard-editable control');
    // Der Varianten-Editor liegt in der Replay-Unteransicht; zuletzt waren die Logs aktiv.
    await page.locator('#mcShowReplayButton').click();
    assert(await page.locator('#mcViewPanelReplay').isVisible(),
        'variant editor checks run inside the visible replay view');
    const focusedEditorPaths = await page.locator('#stressReplayVariantFields > .stress-replay-editor-grid').evaluate(grid =>
        [...grid.querySelectorAll('input, select')].map(control => control.id || control.dataset.stressReplayPath));
    assert(JSON.stringify(focusedEditorPaths) === JSON.stringify([
        'stressReplayVariantLabel',
        'strategy.startFloorBedarf',
        'strategy.startFlexBedarf',
        'strategy.minimumFlexAnnual'
    ]), `Focused editor exposes exactly name, floor need, flex need and minimum flex: ${JSON.stringify(focusedEditorPaths)}`);
    assert(await page.locator('#stressReplayAddVariantButton').count() === 1,
        'Variant calculation uses one native button');
    assert(await page.locator('#stressReplayVariantEditor [data-stress-replay-path="strategy.goldAktiv"]').count() === 0,
        'Forbidden asset fields are absent from the variant editor');
    for (const path of ['strategy.startFloorBedarf', 'strategy.startFlexBedarf', 'strategy.minimumFlexAnnual']) {
        const needControl = page.locator(`#stressReplayVariantEditor [data-stress-replay-path="${path}"]`);
        assert(await needControl.count() === 1, `Focused editor exposes ${path} exactly once`);
        assert(await needControl.inputValue() === '', `${path} starts empty and inherits its baseline`);
        assert(await needControl.getAttribute('min') === '0', `${path} rejects negative values in the browser`);
        assert(await needControl.isVisible(), `${path} is visible in the focused editor`);
    }
    assert(await page.locator('#stressReplayVariantEditor [data-stress-replay-format="currency-eur"]').count() === 3,
        'Exactly the three focused baseline outputs opt into Euro formatting');
    const expertToggle = page.locator('#stressReplayExpertToggle');
    const expertFields = page.locator('#stressReplayExpertFields');
    assert(await expertToggle.getAttribute('type') === 'button', 'Expert disclosure uses a native non-submit button');
    assert(await expertToggle.getAttribute('aria-expanded') === 'false', 'Expert disclosure starts collapsed');
    assert(await expertToggle.getAttribute('aria-controls') === 'stressReplayExpertFields', 'Expert disclosure names its controlled container');
    assert(await expertFields.isHidden(), 'All expert controls start hidden');
    assert(await expertFields.locator('[data-stress-replay-path]').count() === 17,
        'All 17 existing expert controls remain present inside the disclosure');
    const previewBeforeToggle = await page.locator('#stressReplayPatchPreview').innerHTML();
    const addDisabledBeforeToggle = await page.locator('#stressReplayAddVariantButton').isDisabled();
    await page.locator('#stressReplayVariantFields').evaluate(fieldset => { fieldset.disabled = false; });
    await expertToggle.press('Enter');
    assert(await expertFields.isVisible() && await expertToggle.getAttribute('aria-expanded') === 'true',
        'Enter opens the native expert disclosure and synchronizes ARIA');
    await expertToggle.press('Space');
    assert(await expertFields.isHidden() && await expertToggle.getAttribute('aria-expanded') === 'false',
        'Space closes the native expert disclosure and synchronizes ARIA');
    await expertToggle.press('Enter');
    assert(await expertFields.isVisible() && await expertToggle.getAttribute('aria-expanded') === 'true',
        'Enter reopens the native expert disclosure after the keyboard-only toggle cycle');
    assert(await page.locator('#stressReplayPatchPreview').innerHTML() === previewBeforeToggle,
        'Opening and closing alone does not change patch preview');
    assert(await page.locator('#stressReplayAddVariantButton').isDisabled() === addDisabledBeforeToggle,
        'Opening and closing alone does not change add-button materiality');
    const retainedExpert = expertFields.locator('[data-stress-replay-path="strategy.liquidityRunwayYears"]');
    await retainedExpert.fill('7');
    assert(await retainedExpert.inputValue() === '7', 'Pre-run rerender preserves the entered expert value');
    const preRunRelockState = await page.locator('#stressReplayVariantFields').evaluate(fieldset => ({
        fieldsetDisabled: fieldset.disabled === true,
        expertToggleDisabled: fieldset.querySelector('#stressReplayExpertToggle')?.matches(':disabled') === true
    }));
    assert(preRunRelockState.fieldsetDisabled
        && preRunRelockState.expertToggleDisabled,
    `A real pre-run editor input rerenders and relocks the unavailable variant workflow: ${JSON.stringify(preRunRelockState)}`);
    assert(await page.locator('#stressReplayVariantEditor [data-active-when="decumulation:3_bucket_jilge"]').first().isHidden(),
        'Three-bucket-only controls start hidden when their strategy mode is inactive');
    const realNeedsError = await page.evaluate(async () => {
        const { createStressReplayController } = await import('./app/simulator/stress-replay-ui.js');
        const { getCommonInputs } = await import('./app/simulator/simulator-portfolio.js');
        const baselineSnapshot = {
            ...getCommonInputs(),
            startFloorBedarf: 24000,
            startFlexBedarf: 12000,
            minimumFlexAnnual: 0
        };
        const documentRef = {
            getElementById(id) {
                return id === 'stressReplayBanner' ? null : document.getElementById(id);
            },
            querySelectorAll(selector) {
                return document.querySelectorAll(selector);
            }
        };
        const controller = createStressReplayController({
            documentRef,
            loadWorkspace: () => ({
                status: 'executable',
                workspace: {
                    baselineSnapshot,
                    variants: [{ id: 'baseline', role: 'baseline' }]
                },
                compatibility: { readOnly: false },
                error: null
            }),
            renderViews: () => {}
        });
        controller.initialize();
        document.querySelector('[data-stress-replay-path="strategy.startFlexBedarf"]').value = '5000';
        document.querySelector('[data-stress-replay-path="strategy.minimumFlexAnnual"]').value = '6000';
        controller.previewEditorPatch();
        const status = document.getElementById('stressReplayStatus');
        return { code: status.dataset.patchError, text: status.textContent, status: status.dataset.status };
    });
    assert(realNeedsError.code === 'STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX'
        && realNeedsError.status === 'error'
        && realNeedsError.text.includes('Mindest-Flex p. a.')
        && realNeedsError.text.includes('6.000')
        && realNeedsError.text.includes('5.000'),
    `The real contract error must render both effective amounts in the live status region: ${JSON.stringify(realNeedsError)}`);
    const replayWorkspaceText = (await page.locator('#stressReplayWorkspace').textContent()).replace(/\s+/g, ' ').trim();
    assert(replayWorkspaceText.includes('Fixiert genau einen ausgewählten Monte-Carlo-Lauf')
        && replayWorkspaceText.includes('Varianten werden nur auf diesem Pfad verglichen')
        && replayWorkspaceText.includes('keine allgemeine Strategieempfehlung'),
    'The browser workflow must explain the paired fixed-path interpretation');
    assert(!replayWorkspaceText.toLowerCase().includes('optimale strategie'),
        'The browser workflow must not present replay variants as a general optimum');
    assert(await readIndexedDb(page, 'kv', 'sim.stressReplay.active.v1') === null,
        'Opening the Simulator with replay inactive must not create a persisted replay workspace');
    const replayScrollStyle = await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.className = 'stress-replay-table-scroll';
        document.body.appendChild(probe);
        const overflowX = getComputedStyle(probe).overflowX;
        probe.remove();
        return overflowX;
    });
    assert(replayScrollStyle === 'auto',
        'Stress replay comparison tables contain horizontal overflow locally');

    const replayKpiSemantics = await page.evaluate(async () => {
        const { renderStressReplayComparisonV1 } = await import('./app/simulator/stress-replay-renderer.js');
        const summary = {
            maximumDrawdownNominalPct: 10,
            ruinYear: 3
        };
        const comparison = {
            overallStatus: 'complete',
            variants: [
                { variantId: 'baseline', label: 'Baseline', summary },
                {
                    variantId: 'alternative-1',
                    label: 'Variante',
                    summary: { ...summary, maximumDrawdownNominalPct: 12.5, ruinYear: 5 }
                }
            ],
            pairwise: [{
                variantId: 'alternative-1',
                comparable: true,
                factorMode: 'single_factor',
                firstDeltaMarkers: [],
                kpiDeltas: {
                    maximumDrawdownNominalPct: {
                        unit: 'percentage_points', absoluteDelta: 2.5, applicability: 'applicable'
                    },
                    ruinYear: {
                        unit: 'zero_based_year_index', absoluteDelta: 2, applicability: 'applicable'
                    }
                }
            }]
        };
        const target = document.getElementById('stressReplayComparison');
        target.innerHTML = renderStressReplayComparisonV1({ comparison });
        const rowText = label => [...target.querySelectorAll('tr')]
            .find(row => row.querySelector('th[scope="row"]')?.textContent.trim() === label)
            ?.textContent.replace(/\s+/g, ' ').trim();
        return {
            ruin: rowText('Jahr des Vermögensaufbrauchs'),
            drawdown: rowText('Maximaler Drawdown nominal')
        };
    });
    assert(replayKpiSemantics.ruin?.includes('Jahr 4')
        && replayKpiSemantics.ruin.includes('Jahr 6')
        && replayKpiSemantics.ruin.includes('Δ 2 Jahre')
        && !replayKpiSemantics.ruin.includes('Δ Jahr 3'),
    'Browser KPI row separates absolute ruin years from a year-count delta');
    assert(replayKpiSemantics.drawdown?.includes('10 %')
        && replayKpiSemantics.drawdown.includes('12,5 %')
        && replayKpiSemantics.drawdown.includes('Δ 2,5 Prozentpunkte'),
    'Browser KPI row maps absolute drawdown percent and delta percentage points semantically');

    assert(await page.locator('#stressReplayKpiTab').getAttribute('aria-selected') === 'true',
        'Replay comparison rerender starts on Kennzahlen');
    await page.locator('#stressReplayKpiTab').press('End');
    assert(await page.locator('#stressReplayYearTab').getAttribute('aria-selected') === 'true'
        && await page.locator('#stressReplayYearPanel').isVisible(),
    'Replay comparison End activates and focuses Jahresverlauf');
    await page.locator('#stressReplayYearTab').press('ArrowRight');
    assert(await page.locator('#stressReplayKpiTab').getAttribute('aria-selected') === 'true'
        && await page.locator('#stressReplayKpiPanel').isVisible(),
    'Replay comparison ArrowRight wraps independently to Kennzahlen');
    await page.locator('#stressReplayDeltaTab').click();
    assert(await page.locator('#stressReplayDeltaPanel').isVisible()
        && await page.locator('#stressReplayKpiPanel').isHidden(),
    'Replay comparison pointer activation exposes only its selected panel');
    const rerenderedComparisonState = await page.evaluate(async () => {
        const { renderStressReplayComparisonV1 } = await import('./app/simulator/stress-replay-renderer.js');
        const target = document.getElementById('stressReplayComparison');
        target.innerHTML = renderStressReplayComparisonV1({
            comparison: {
                overallStatus: 'complete',
                variants: [
                    { variantId: 'baseline', label: 'Baseline', summary: {} },
                    { variantId: 'alternative-rerender', label: 'Rerender', summary: {} }
                ],
                pairwise: [{
                    variantId: 'alternative-rerender', comparable: true,
                    factorMode: 'single_factor', firstDeltaMarkers: [], kpiDeltas: {}
                }]
            }
        });
        const selected = target.querySelector('[data-stress-replay-comparison-view][aria-selected="true"]');
        selected.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        return {
            selectedAfterRender: selected.dataset.stressReplayComparisonView,
            selectedAfterDelegatedKey: target.querySelector('[data-stress-replay-comparison-view][aria-selected="true"]')?.dataset.stressReplayComparisonView,
            focusedAfterDelegatedKey: document.activeElement?.dataset.stressReplayComparisonView || null,
            tablists: target.querySelectorAll('[role="tablist"]').length,
            headings: ['stressReplayKpiHeading', 'stressReplayDeltaHeading', 'stressReplayYearHeading']
                .filter(id => document.getElementById(id)).length
        };
    });
    assert(rerenderedComparisonState.selectedAfterRender === 'kpi'
        && rerenderedComparisonState.selectedAfterDelegatedKey === 'year'
        && rerenderedComparisonState.focusedAfterDelegatedKey === 'year',
    `Delegated comparison controls must survive renderer replacement: ${JSON.stringify(rerenderedComparisonState)}`);
    assert(rerenderedComparisonState.tablists === 1 && rerenderedComparisonState.headings === 3,
        'A rerender keeps one comparison tablist and all three established headings');

    const cockpitViewportResults = [];
    for (const width of [320, 700, 768, 899, 900, 1280, 1600]) {
        await page.setViewportSize({ width, height: 900 });
        cockpitViewportResults.push(await page.evaluate(viewportWidth => {
            const withinViewport = element => {
                const rect = element.getBoundingClientRect();
                return rect.left >= -1 && rect.right <= document.documentElement.clientWidth + 1;
            };
            const localScrollers = [
                ...document.querySelectorAll('.mc-view-nav > [role="tablist"], .stress-replay-table-scroll')
            ];
            const cockpitCards = [
                ...document.querySelectorAll('.mc-setup-disclosure, .mc-run-head, .mc-view-panel, .stress-replay-step')
            ].filter(element => getComputedStyle(element).display !== 'none');
            return {
                viewportWidth,
                clientWidth: document.documentElement.clientWidth,
                scrollWidth: document.documentElement.scrollWidth,
                cardsWithinViewport: cockpitCards.every(withinViewport),
                localScrollersWithinViewport: localScrollers.every(withinViewport),
                localOverflowModes: localScrollers.map(element => getComputedStyle(element).overflowX)
            };
        }, width));
    }
    assert(cockpitViewportResults.every(result => result.scrollWidth <= result.clientWidth + 1),
        `Cockpit must not create page-level horizontal overflow: ${JSON.stringify(cockpitViewportResults)}`);
    assert(cockpitViewportResults.every(result => result.cardsWithinViewport && result.localScrollersWithinViewport),
        `Cockpit cards, navigation and table scrollers must stay inside every target viewport: ${JSON.stringify(cockpitViewportResults)}`);
    assert(cockpitViewportResults.every(result => result.localOverflowModes.every(mode => mode === 'auto')),
        `Wide navigation and tables must keep overflow local on screen: ${JSON.stringify(cockpitViewportResults)}`);
    await page.setViewportSize({ width: 1366, height: 900 });

    const printStateBefore = await page.evaluate(() => {
        const setup = document.getElementById('mcSetupDisclosure');
        const banner = document.getElementById('stressReplayBanner');
        const diagnostics = banner.querySelector('.stress-replay-diagnostics');
        const scenarioLog = document.getElementById('scenarioLogOutput');
        const probeTable = document.createElement('table');
        probeTable.dataset.printProbe = 'sticky-header';
        probeTable.innerHTML = '<thead><tr><th>Druckkopf</th></tr></thead>';
        scenarioLog.appendChild(probeTable);
        const state = {
            setupOpen: setup.open,
            bannerHidden: banner.hidden,
            diagnosticsOpen: diagnostics.open
        };
        setup.open = false;
        banner.hidden = false;
        diagnostics.open = false;
        return state;
    });
    await page.emulateMedia({ media: 'print' });
    const printedCockpitState = await page.evaluate(() => ({
        setupContentDisplay: getComputedStyle(document.querySelector('#mcSetupDisclosure > .mc-setup-content')).display,
        setupFieldsetDisplay: getComputedStyle(document.querySelector('#mcSetupDisclosure > .mc-setup-content > fieldset')).display,
        mcPanelDisplays: [...document.querySelectorAll('.mc-view-panel')]
            .map(panel => getComputedStyle(panel).display),
        comparisonPanelDisplays: [...document.querySelectorAll('[data-stress-replay-comparison-panel]')]
            .map(panel => getComputedStyle(panel).display),
        diagnosticsDisplay: getComputedStyle(document.querySelector('.stress-replay-diagnostics > dl')).display,
        mainNavigationDisplay: getComputedStyle(document.querySelector('.tab-buttons')).display,
        mcNavigationDisplay: getComputedStyle(document.querySelector('.mc-view-nav')).display,
        comparisonNavigationDisplay: getComputedStyle(document.querySelector('.stress-replay-comparison-tabs')).display,
        setupToggleDisplay: getComputedStyle(document.querySelector('.mc-setup-toggle')).display,
        expertToggleDisplay: getComputedStyle(document.querySelector('.stress-replay-expert-toggle')).display,
        replayLinkDisplay: getComputedStyle(document.getElementById('mcShowReplayButton')).display,
        scenarioReturnDisplay: getComputedStyle(document.getElementById('mcShowScenarioLogsButton')).display,
        scenarioHeaderPosition: getComputedStyle(document.querySelector('[data-print-probe="sticky-header"] th')).position,
        scenarioLogOverflow: getComputedStyle(document.getElementById('scenarioLogOutput')).overflow,
        comparisonTableOverflow: getComputedStyle(document.querySelector('.stress-replay-table-scroll')).overflow
    }));
    assert(printedCockpitState.setupContentDisplay !== 'none'
        && printedCockpitState.setupFieldsetDisplay !== 'none',
        `Print exposes a closed Monte-Carlo setup: ${JSON.stringify(printedCockpitState)}`);
    assert(printedCockpitState.mcPanelDisplays.length === 5
        && printedCockpitState.mcPanelDisplays.every(display => display !== 'none'),
    `Print exposes all Monte-Carlo result panels in DOM order: ${JSON.stringify(printedCockpitState)}`);
    assert(printedCockpitState.comparisonPanelDisplays.length === 3
        && printedCockpitState.comparisonPanelDisplays.every(display => display !== 'none'),
    `Print exposes all comparison sections in DOM order: ${JSON.stringify(printedCockpitState)}`);
    assert(printedCockpitState.diagnosticsDisplay !== 'none',
        `Print exposes closed native replay diagnostics: ${JSON.stringify(printedCockpitState)}`);
    assert(printedCockpitState.mainNavigationDisplay === 'none'
        && printedCockpitState.mcNavigationDisplay === 'none'
        && printedCockpitState.comparisonNavigationDisplay === 'none'
        && printedCockpitState.setupToggleDisplay === 'none'
        && printedCockpitState.expertToggleDisplay === 'none'
        && printedCockpitState.replayLinkDisplay === 'none'
        && printedCockpitState.scenarioReturnDisplay === 'none',
    `Print removes navigation and pure toggle controls: ${JSON.stringify(printedCockpitState)}`);
    assert(printedCockpitState.scenarioHeaderPosition === 'static'
        && printedCockpitState.scenarioLogOverflow === 'visible'
        && printedCockpitState.comparisonTableOverflow === 'visible',
    `Print disables sticky positioning and clipping overflow: ${JSON.stringify(printedCockpitState)}`);
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(state => {
        const setup = document.getElementById('mcSetupDisclosure');
        const banner = document.getElementById('stressReplayBanner');
        const diagnostics = banner.querySelector('.stress-replay-diagnostics');
        setup.open = state.setupOpen;
        banner.hidden = state.bannerHidden;
        diagnostics.open = state.diagnosticsOpen;
        document.querySelector('[data-print-probe="sticky-header"]')?.remove();
    }, printStateBefore);

    const replayComparisonFailure = await page.evaluate(async () => {
        const { createStressReplayController } = await import('./app/simulator/stress-replay-ui.js');
        const { renderStressReplayViewsV1 } = await import('./app/simulator/stress-replay-renderer.js');
        const { getCommonInputs } = await import('./app/simulator/simulator-portfolio.js');
        const workspace = {
            path: {},
            sourceIdentity: null,
            baselineSnapshot: getCommonInputs(),
            variants: [
                { id: 'baseline', variantId: 'baseline', role: 'baseline', label: 'Baseline', summary: {} },
                {
                    id: 'browser-failure', variantId: 'browser-failure', role: 'alternative',
                    label: 'Browserfehler', materialChangeGroups: ['dynamicFlex'], summary: {}
                }
            ]
        };
        let comparisonCalls = 0;
        const documentRef = {
            getElementById(id) {
                return id === 'stressReplayBanner' ? null : document.getElementById(id);
            },
            querySelectorAll(selector) {
                return selector === '[data-stress-replay-baseline]' ? [] : document.querySelectorAll(selector);
            }
        };
        const controller = createStressReplayController({
            documentRef,
            loadWorkspace: () => ({
                status: 'executable', workspace, compatibility: { readOnly: false }, error: null
            }),
            runComparison: () => {
                comparisonCalls += 1;
                if (comparisonCalls > 1) {
                    throw Object.assign(new Error('<browser failure>'), {
                        code: 'STRESS_REPLAY_BROWSER_FAILURE'
                    });
                }
                return {
                    comparison: { variants: workspace.variants, pairwise: [] },
                    results: []
                };
            },
            renderViews: options => renderStressReplayViewsV1(options)
        });
        controller.initialize();
        document.querySelector('[data-stress-replay-action="recompute"][data-variant-id="browser-failure"]').click();
        const comparison = document.getElementById('stressReplayComparison');
        const status = document.getElementById('stressReplayStatus');
        return {
            comparisonText: comparison.textContent.replace(/\s+/g, ' ').trim(),
            alertCount: comparison.querySelectorAll('[role="alert"]').length,
            statusText: status.textContent,
            statusKind: status.dataset.status,
            activeElementId: document.activeElement?.id || null,
            comparisonHtml: comparison.innerHTML
        };
    });
    assert(replayComparisonFailure.alertCount === 1
        && replayComparisonFailure.comparisonText.includes('STRESS_REPLAY_BROWSER_FAILURE')
        && replayComparisonFailure.comparisonText.includes('<browser failure>'),
    `Real recompute click must render the controlled failure as an alert: ${JSON.stringify(replayComparisonFailure)}`);
    assert(replayComparisonFailure.statusKind === 'error'
        && replayComparisonFailure.statusText.includes('Variantenvergleich fehlgeschlagen')
        && !replayComparisonFailure.statusText.includes('neu berechnet'),
    'Real recompute click must not overwrite a calculation failure with success');
    assert(replayComparisonFailure.activeElementId === 'stressReplayComparison',
        'Real recompute click focuses the failed comparison region');
    assert(!replayComparisonFailure.comparisonHtml.includes('<browser failure>'),
        'Real comparison diagnostics remain HTML-escaped in the browser DOM');

    await mcRuns.fill('100001');
    await mcRuns.dispatchEvent('input');
    await mcConfirmationRow.waitFor({ state: 'visible' });
    await mcConfirmation.check();
    await mcDuration.fill('36');
    await mcDuration.dispatchEvent('input');
    assert(!(await mcConfirmation.isChecked()), 'duration changes invalidate a prior large-run confirmation');
    await mcRuns.fill('100000');
    await mcRuns.dispatchEvent('input');
    await mcConfirmationRow.waitFor({ state: 'hidden' });
    await mcRuns.fill('10000');
    await mcRuns.dispatchEvent('input');
    await mcDuration.fill('35');
    await mcDuration.dispatchEvent('input');
    await page.locator('.tab-btn[data-tab="rahmendaten"]').click();
    await page.locator('#tab-rahmendaten').waitFor({ state: 'visible' });
    await page.evaluate(() => {
        const values = {
            simStartVermoegen: '2020000',
            depotwertGesamt: '2000000',
            depotwertAlt: '2000000',
            einstandAlt: '1600000',
            tagesgeld: '20000',
            geldmarktEtf: '0'
        };
        for (const [id, value] of Object.entries(values)) {
            const element = document.getElementById(id);
            if (element) element.value = value;
        }
    });
    await page.locator('#startFloorBedarf').fill('24000');
    await page.locator('#startFlexBedarf').fill('12000');
    await page.locator('.tab-btn[data-tab="backtesting"]').click();
    await page.locator('#btButton').waitFor({ state: 'visible' });

    const bounds = await page.evaluate(() => ({
        startMin: Number(document.getElementById('simStartJahr').min),
        startMax: Number(document.getElementById('simStartJahr').max),
        endMin: Number(document.getElementById('simEndJahr').min),
        endMax: Number(document.getElementById('simEndJahr').max),
        hint: document.getElementById('backtestDatasetHint').textContent
    }));
    assert(Number.isInteger(bounds.startMin) && bounds.startMin < bounds.startMax, 'Backtest start input needs dynamic integer bounds');
    assert(bounds.startMin === bounds.endMin && bounds.startMax === bounds.endMax, 'Start/end inputs must share provider bounds');
    assert(bounds.hint.includes(String(bounds.startMin)) && bounds.hint.includes(String(bounds.endMax)), 'Visible dataset hint must name both bounds');

    const realInventoryBefore = await readIndexedDb(page, 'kv', 'depot_tranchen');
    await page.locator('#runBacktestCohorts').check();
    await page.locator('#backtestCohortHorizon').fill('10');
    await page.locator('#btButton').click();
    await page.waitForFunction(() => ['completed', 'ruin', 'incomplete', 'technical_error', 'validation_error']
        .includes(document.getElementById('backtestStatus')?.dataset?.status));
    const initialTerminalStatus = await page.locator('#backtestStatus').getAttribute('data-status');
    const initialTerminalText = await page.locator('#backtestStatus').textContent();
    assert(initialTerminalStatus === 'completed', `Default browser backtest must complete: ${JSON.stringify({ initialTerminalStatus, initialTerminalText })}`);
    await page.locator('#simulationResults').waitFor({ state: 'visible' });
    await page.locator('#backtestCohortSummary').waitFor({ state: 'visible' });

    assert(await page.evaluate(() => document.activeElement?.id) === 'backtestStatus', 'Completed run must focus the terminal result status');
    assert(await page.locator('#simulationLog caption').count() === 1, 'Backtest table needs exactly one caption');
    assert(await page.locator('#simulationLog thead th[scope="col"]').count() === await page.locator('#simulationLog thead th').count(),
        'Every backtest column header needs scope=col');
    assert(await page.locator('#simulationLog').getAttribute('tabindex') === '0', 'Scrollable backtest table region must be keyboard-focusable');
    const notices = await page.locator('#backtestNotices').textContent();
    assert(notices.includes('Outcome:') && notices.includes('Datenqualität:') && notices.includes('In-sample-Hinweis:'),
        'Outcome, data quality and in-sample warning must all be visible');
    const cohortText = await page.locator('#backtestCohortSummary').textContent();
    assert(cohortText.includes('Feste Horizontlänge: 10 Jahre'), 'Cohort summary must name its fixed horizon');
    assert(cohortText.includes('Geeignet') && cohortText.includes('Ausgeschlossen') && cohortText.includes('Ruin'),
        'Cohort summary must separate inventory, exclusions and outcomes');
    assert(cohortText.includes('keine Erfolgswahrscheinlichkeit'), 'Cohort summary must state its inference boundary');

    const normalHeaderCount = await page.locator('#simulationLog thead th').count();
    const [jsonDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('#exportBacktestJson').click()
    ]);
    const rawJsonText = await readDownloadText(jsonDownload);
    assert(!/<(?:table|tr|td|th)\b/i.test(rawJsonText), 'Raw JSON download must not contain rendered table HTML');
    const rawDocument = JSON.parse(rawJsonText);
    assert(rawDocument.request.engine.sourceCommit === 'b'.repeat(40),
        'Raw JSON binds the commit loaded through the browser provenance endpoint');
    assert(rawDocument.request.engine.sourceProvenanceProvider === 'browser_static_endpoint',
        'Raw JSON proves that the browser run consumed the endpoint rather than a mutable global injection');

    const [csvDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('#exportBacktestCsv').click()
    ]);
    const rawCsvText = await readDownloadText(csvDownload);
    assert(rawCsvText.startsWith('run_id;simulation_year_calendar_year;outcome_code;'), 'Raw CSV must use the versioned technical header contract');
    assert(rawCsvText.split('\n')[1]?.split(';')[0] === rawDocument.identifiers.runId,
        'Raw CSV and JSON downloads identify the same canonical browser run');
    assert(!/<(?:table|tr|td|th)\b/i.test(rawCsvText), 'Raw CSV download must not contain rendered table HTML');

    const visibleCanonical = await page.evaluate(() => {
        const field = name => document.querySelector(`#simulationSummary [data-result-field="${name}"]`)?.dataset.canonicalValue;
        const metric = id => document.querySelector(`#simulationSummary [data-metric-id="${id}"]`)?.dataset.canonicalValue;
        return {
            startYear: field('period_start'),
            endYear: field('period_end'),
            outcome: field('outcome'),
            requestedYears: field('requested_years'),
            completedYears: field('completed_years'),
            rowCount: field('row_count'),
            exactTenPctMetric: metric('flex_reduction_years_gte_10_pct'),
            healthBucketEnd: metric('health_bucket_end_nominal_eur'),
            cohortEligible: document.querySelector('[data-cohort-field="eligible"]')?.textContent?.trim()
        };
    });
    assert(visibleCanonical.startYear === String(rawDocument.request.startYear), 'Visible start year reconciles with Raw JSON');
    assert(visibleCanonical.endYear === String(rawDocument.request.endYear), 'Visible end year reconciles with Raw JSON');
    assert(visibleCanonical.outcome === rawDocument.result.outcome.kind, 'Visible outcome reconciles with Raw JSON');
    assert(visibleCanonical.requestedYears === String(rawDocument.result.requestedYears), 'Visible requested-year inventory reconciles with Raw JSON');
    assert(visibleCanonical.completedYears === String(rawDocument.result.completedYears), 'Visible completed-year inventory reconciles with Raw JSON');
    assert(visibleCanonical.rowCount === String(rawDocument.result.rows.length), 'Visible row inventory reconciles with Raw JSON');
    assert(visibleCanonical.exactTenPctMetric === String(rawDocument.result.metrics.values.flex_reduction_years_gte_10_pct),
        'Visible exact-10-percent reduction metric reconciles with Raw JSON');
    assert(visibleCanonical.healthBucketEnd === String(rawDocument.result.metrics.values.health_bucket_end_nominal_eur),
        'Visible health-bucket end reconciles with Raw JSON');
    assert((await page.locator('#simulationSummary').textContent()).includes('im Endvermögen enthalten'),
        'Visible summary states that the health bucket is already included in end wealth');
    assert(visibleCanonical.cohortEligible === String(rawDocument.result.cohortInventory.eligible),
        'Visible cohort inventory reconciles with the Raw JSON snapshot');

    await page.locator('#toggle-backtest-detail').check();
    const detailedHeaderCount = await page.locator('#simulationLog thead th').count();
    assert(detailedHeaderCount > normalHeaderCount, 'Detail toggle must add display-only diagnostic columns');
    const [detailedJsonDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('#exportBacktestJson').click()
    ]);
    const detailedRawDocument = JSON.parse(await readDownloadText(detailedJsonDownload));
    assert(detailedRawDocument.fingerprint.value === rawDocument.fingerprint.value,
        'Detail toggle must not change the canonical Raw JSON fingerprint');
    assert(JSON.stringify(detailedRawDocument.result.rows) === JSON.stringify(rawDocument.result.rows),
        'Detail toggle must not change Raw JSON rows');
    const realInventoryAfter = await readIndexedDb(page, 'kv', 'depot_tranchen');
    assert(JSON.stringify(realInventoryAfter) === JSON.stringify(realInventoryBefore), 'Backtest and cohort runs must not mutate real tranche inventory');

    const runPeriodValidationCase = async ({ start, end, expectedField, label, startType = 'number' }) => {
        await page.locator('#simStartJahr').evaluate((input, type) => { input.type = type; }, startType);
        await page.locator('#simStartJahr').fill(String(start));
        await page.locator('#simEndJahr').fill(String(end));
        await page.locator('#btButton').click();
        await page.waitForFunction(expectedFieldId => (
            document.getElementById('backtestStatus')?.textContent?.includes('BACKTEST_PERIOD_INVALID')
            && document.activeElement?.id === expectedFieldId
        ), expectedField);
        assert(await page.locator('#backtestStatus').textContent().then(text => text.includes('BACKTEST_PERIOD_INVALID')), `${label}: stable validation code must be visible`);
        assert(await page.evaluate(() => document.activeElement?.id) === expectedField, `${label}: first invalid field must receive focus`);
        assert(await page.locator(`#${expectedField}`).getAttribute('aria-invalid') === 'true', `${label}: invalid field must expose aria-invalid`);
    };

    await page.locator('#runBacktestCohorts').uncheck();
    await runPeriodValidationCase({ start: '', end: 2000, expectedField: 'simStartJahr', label: 'empty start' });
    await runPeriodValidationCase({ start: 'NaN', end: 2000, expectedField: 'simStartJahr', label: 'NaN start', startType: 'text' });
    await runPeriodValidationCase({ start: '2000.5', end: 2001, expectedField: 'simStartJahr', label: 'fractional start' });
    await runPeriodValidationCase({ start: 2002, end: 2001, expectedField: 'simEndJahr', label: 'reversed period' });
    await runPeriodValidationCase({ start: bounds.startMin - 1, end: 2000, expectedField: 'simStartJahr', label: 'out-of-bounds start' });

    await page.locator('#simStartJahr').fill('2000');
    await page.locator('#simEndJahr').fill('2002');
    await page.evaluate(() => {
        const defaultBounds = {
            startYear: Number(document.getElementById('simStartJahr').min),
            endYear: Number(document.getElementById('simStartJahr').max),
            lookbackYears: 1
        };
        return window.runBacktest({
            historicalDataProvider: {
                schemaVersion: 'SyntheticHistoricalProviderV1',
                datasetId: 'synthetic-missing-middle-year',
                revision: 'browser-gate',
                contentHash: '0'.repeat(64),
                temporalConventionId: 'synthetic-browser-gate',
                bounds: defaultBounds,
                preparePeriod(period) {
                    return {
                        status: 'incomplete',
                        period,
                        reason: { code: 'historical_year_missing', year: period.startYear + 1 }
                    };
                }
            }
        });
    });
    assert(await page.locator('#backtestStatus').getAttribute('data-status') === 'incomplete', 'Synthetic middle-year gap must render incomplete');
    assert((await page.locator('#backtestStatus').textContent()).includes('historical_year_missing'), 'Incomplete state must expose its stable reason code');
    assert(!(await page.locator('#simulationResults').isVisible()), 'Incomplete result must not masquerade as a complete summary');

    await page.evaluate(() => window.runBacktest({
        simulateYear() {
            return {
                kind: 'technical_error',
                error: {
                    code: 'SYNTHETIC_TECHNICAL_ERROR',
                    message: 'SYNTHETIC_TECHNICAL_ERROR at C:\\Users\\private\\runner.js',
                    stack: 'synthetic stack'
                }
            };
        }
    }));
    const technicalStatus = await page.locator('#backtestStatus').textContent();
    assert(await page.locator('#backtestStatus').getAttribute('data-status') === 'technical_error', 'Synthetic engine failure must render technical_error');
    assert(technicalStatus.includes('SYNTHETIC_TECHNICAL_ERROR'), 'Technical state must expose its stable code');
    assert(!technicalStatus.includes('C:\\Users') && !technicalStatus.includes('synthetic stack'), 'Technical state must suppress local paths and stack details');

    await page.evaluate(() => window.runBacktest({
        simulateYear(state) {
            return {
                kind: 'ruin',
                isRuin: true,
                newState: state,
                reason: 'synthetic_floor_shortfall',
                ruinDetails: { requiredFloorNominal: 1, coveredFloorNominal: 0, shortfallNominal: 1 }
            };
        }
    }));
    assert(await page.locator('#backtestStatus').getAttribute('data-status') === 'ruin', 'Synthetic floor shortfall must render ruin separately');
    assert((await page.locator('#backtestStatus').textContent()).includes('BACKTEST_RUIN'), 'Ruin state must expose its stable financial code');
    assert(await page.locator('#simulationResults').isVisible(), 'Ruin remains a financial result with summary and rows');
    assert((await page.evaluate(() => window.__browserSmokeAlerts || [])).length === 0, 'Backtest validation and terminal states must not rely on alert dialogs');
    smoke.assertNoErrors();
    await smoke.close();
}

async function runSimulatorHouseholdNeedsReload(browser, baseUrl) {
    const balanceState = (floorBedarf, flexBedarf, minimumFlexAnnual) => JSON.stringify({
        inputs: { floorBedarf, flexBedarf, minimumFlexAnnual }
    });
    const storage = createBrowserProfileStorage({
        dieter: {
            name: 'Dieter',
            extraData: {
                sim_startFloorBedarf: '24002',
                sim_startFlexBedarf: '150000',
                sim_minimumFlexAnnual: '60000'
            },
            balanceStateRaw: balanceState(12000, 30000, 15000)
        },
        karin: {
            name: 'Karin',
            extraData: {
                sim_startFloorBedarf: '12000',
                sim_startFlexBedarf: '30000',
                sim_minimumFlexAnnual: '15000'
            },
            balanceStateRaw: balanceState(12000, 30000, 15000)
        }
    }, 'dieter');
    const smoke = await openSmokePage(browser, baseUrl, 'Simulator.html', { storage });
    const { page } = smoke;
    await page.locator('#simProfileList input').first().waitFor({ state: 'visible' });

    assert(await page.locator('#startFloorBedarf').inputValue() === '24000',
        'Mehrprofil-Start behaelt die aggregierte Balance-Floor-Summe');
    assert(await page.locator('#startFlexBedarf').inputValue() === '60000',
        'Mehrprofil-Start behaelt die aggregierte Balance-Flex-Summe');
    assert(await page.locator('#minimumFlexAnnual').inputValue() === '30000',
        'Mehrprofil-Start behaelt die aggregierte Balance-Mindest-Flex-Summe');
    assert((await page.locator('#simProfileStatus').textContent()).includes('nicht eindeutig'),
        'Mehrdeutige Legacy-Werte werden sichtbar gemeldet statt als Haushalt uebernommen');

    await page.locator('#startFloorBedarf').fill('25000');
    await page.locator('#startFlexBedarf').fill('140000');
    await page.locator('#minimumFlexAnnual').fill('55000');
    await page.reload({ waitUntil: 'load' });
    await page.locator('#simProfileList input').first().waitFor({ state: 'visible' });

    assert(await page.locator('#startFloorBedarf').inputValue() === '25000',
        'Reload behaelt den manuellen Haushalts-Floor exakt');
    assert(await page.locator('#startFlexBedarf').inputValue() === '140000',
        'Reload behaelt den manuellen Haushalts-Flex exakt');
    assert(await page.locator('#minimumFlexAnnual').inputValue() === '55000',
        'Reload behaelt den manuellen Haushalts-Mindest-Flex exakt');

    const persisted = JSON.parse((await readIndexedDb(page, 'kv', 'household_simulator_needs_v1')).value);
    assert(persisted.values.startFloorBedarf === '25000'
        && persisted.values.startFlexBedarf === '140000'
        && persisted.values.minimumFlexAnnual === '55000',
    'Der Haushalts-Override wird gemeinsam und versioniert persistiert');
    const registry = JSON.parse((await readIndexedDb(page, 'kv', 'rs_profiles_v1')).value);
    assert(registry.profiles.dieter.data.sim_startFloorBedarf === '24002',
        'Der manuelle Haushalts-Floor wird nicht in das aktuelle Einzelprofil zurueckgeschrieben');
    assert(await page.evaluate(() => window.__profilverbundMinimumFlexProfiles === null),
        'Ein manueller Haushalts-Mindest-Flex behauptet keine erfundene Profilaufteilung');

    await Promise.all([
        page.waitForNavigation({ waitUntil: 'load' }),
        page.locator('#resetBtn').click()
    ]);
    await page.locator('#simProfileList input').first().waitFor({ state: 'visible' });
    const resetFloorValue = await page.locator('#startFloorBedarf').inputValue();
    assert(resetFloorValue === '24000',
        `Reset stellt die aktuelle aggregierte Balance-Floor-Summe wieder her (ist: ${resetFloorValue})`);
    assert(await page.locator('#startFlexBedarf').inputValue() === '60000',
        'Reset stellt die aktuelle aggregierte Balance-Flex-Summe wieder her');
    assert(await page.locator('#minimumFlexAnnual').inputValue() === '30000',
        'Reset stellt die aktuelle aggregierte Balance-Mindest-Flex-Summe wieder her');

    await page.locator('#startFloorBedarf').fill('24001');
    await page.reload({ waitUntil: 'load' });
    await page.locator('#simProfileList input').first().waitFor({ state: 'visible' });
    assert(await page.locator('#startFloorBedarf').inputValue() === '24001',
        'Ein reiner Floor-Override bleibt nach Reload erhalten');
    assert(await page.locator('#startFlexBedarf').inputValue() === '60000'
        && await page.locator('#minimumFlexAnnual').inputValue() === '30000',
    'Nicht bearbeitete Bedarfsfelder bleiben bei ihren Profil-Summen');
    assert(await page.evaluate(() => window.__profilverbundMinimumFlexProfiles?.length === 2),
        'Ein reiner Floor-Override behaelt die Mindest-Flex-Profilaufschluesselung');

    await page.locator('#minimumFlexAnnual').fill('');
    await page.locator('#startFlexBedarf').fill('70000');
    await page.evaluate(async () => {
        const { PersistenceFacade } = await import('./app/shared/persistence-facade.js');
        await PersistenceFacade.flush();
    });
    const editingGapRecord = JSON.parse((await readIndexedDb(page, 'kv', 'household_simulator_needs_v1')).value);
    assert(editingGapRecord.values.startFlexBedarf === '70000',
        'Gueltiger Flex wird waehrend eines leeren Mindest-Flex-Zwischenstands gespeichert');
    await page.locator('#minimumFlexAnnual').fill('30000');
    await page.reload({ waitUntil: 'load' });
    await page.locator('#simProfileList input').first().waitFor({ state: 'visible' });
    assert(await page.locator('#startFlexBedarf').inputValue() === '70000',
        'Flex-Aenderung ueberlebt die Nachbarkorrektur und einen echten Reload');
    assert(await page.locator('#minimumFlexAnnual').inputValue() === '30000',
        'Korrigierter Mindest-Flex ueberlebt den echten Reload');

    await page.evaluate(async () => {
        const { persistenceStorage, PersistenceFacade } = await import('./app/shared/persistence-facade.js');
        persistenceStorage.setItem('household_simulator_needs_v1', JSON.stringify({
            schemaVersion: 2,
            mode: 'override',
            overriddenFields: ['startFloorBedarf'],
            values: {
                startFloorBedarf: '99999',
                startFlexBedarf: '99999',
                minimumFlexAnnual: '0'
            }
        }));
        await PersistenceFacade.flush();
    });
    await page.reload({ waitUntil: 'load' });
    await page.locator('#simProfileList input').first().waitFor({ state: 'visible' });
    assert((await page.locator('#simProfileStatus').textContent()).includes('nicht unterstützte Version'),
        'Eine unbekannte kuenftige Override-Version wird sichtbar gemeldet');
    assert(await page.locator('#startFloorBedarf').inputValue() === '24000',
        'Eine unbekannte Override-Version faellt auf den aktuellen Profil-Default zurueck');
    await page.locator('#startFloorBedarf').fill('31000');
    assert((await page.locator('#startFloorBedarf').evaluate(element => element.validationMessage))
        .includes('neueren Version'),
    'Ein Schreibversuch auf Zukunftsdaten wird direkt am Feld blockiert');
    const preservedFutureRecord = JSON.parse(
        (await readIndexedDb(page, 'kv', 'household_simulator_needs_v1')).value
    );
    assert(preservedFutureRecord.schemaVersion === 2
        && preservedFutureRecord.values.startFloorBedarf === '99999',
    'Der blockierte Schreibversuch erhaelt den Zukunftsdatensatz bytegleich fachlich');

    smoke.assertNoErrors();
    await smoke.close();
}

async function runTranchesSmoke(browser, baseUrl) {
    const profileA = 'browser-slice09-a';
    const profileB = 'browser-slice09-b';
    const storage = createBrowserProfileStorage({
        [profileA]: { name: 'Browserprofil A', tranchesRaw: '[]' },
        [profileB]: { name: 'Browserprofil B', tranchesRaw: '[]', belongsToHousehold: false }
    }, profileB);
    const quoteAsOf = Math.floor(Date.now() / 1000) - 60;
    const smoke = await openSmokePage(browser, baseUrl, 'index.html', {
        storage, quoteFixtures: { default: { asOf: quoteAsOf } }
    });
    const { page } = smoke;
    await page.locator('#profileSelect').waitFor({ state: 'visible' });
    await page.locator('#profileSelect').selectOption(profileA);
    await page.locator('#profileStatus').filter({ hasText: 'Profil gewechselt' }).waitFor({ state: 'visible' });
    await Promise.all([
        page.waitForURL(/depot-tranchen-manager\.html$/),
        page.locator('a[href="depot-tranchen-manager.html"]').click()
    ]);
    await page.locator('h1').filter({ hasText: 'Profil-Assets Manager' }).waitFor({ state: 'visible' });
    await page.locator('#tranchenTable').waitFor({ state: 'visible' });
    assert(!(await page.locator('#tranchenTable').textContent()).includes('FIFO aktiv'), 'Leerer Manager darf FIFO nicht als aktiv melden');
    const profileContext = await page.evaluate(() => ({
        label: document.getElementById('activeProfileName')?.dataset.profileId,
        back: document.getElementById('managerBackLink')?.dataset.profileId
    }));
    assert(profileContext.label === profileA && profileContext.back === profileA,
        'Profilwahl, Manager-Kontext und Rücknavigation müssen Profil A referenzieren');

    await page.locator('#addTrancheBtn').click();
    await page.locator('#trancheModal.active').waitFor({ state: 'visible' });
    await page.locator('#modalTitle').filter({ hasText: 'Neue Tranche' }).waitFor({ state: 'visible' });
    assert(await page.locator('#trancheModal').getAttribute('role') === 'dialog', 'Editor muss als Dialog ausgezeichnet sein');
    assert(await page.locator('#trancheModal').getAttribute('aria-modal') === 'true', 'Editor muss modal ausgezeichnet sein');
    assert(await page.evaluate(() => document.activeElement?.id) === 'name', 'Dialog muss den initialen Fokus auf den Namen setzen');
    await page.keyboard.press('Shift+Tab');
    assert(await page.evaluate(() => document.activeElement?.textContent?.trim()) === 'Speichern', 'Fokusfalle muss rückwärts zum letzten Dialogelement springen');
    await page.keyboard.press('Escape');
    assert(await page.evaluate(() => document.activeElement?.id) === 'addTrancheBtn', 'Escape muss Fokus an den Auslöser zurückgeben');

    await page.locator('#addTrancheBtn').click();
    await page.locator('#name').fill('Synthetische Browser-Tranche');
    await page.locator('#ticker').fill('FLOW.DE');
    await page.locator('#shares').fill('-1');
    await page.locator('#purchasePrice').fill('100');
    await page.locator('#currentPrice').fill('90');
    await page.locator('#purchaseDate').fill('2024-01-02');
    await page.locator('#category').selectOption('equity');
    await page.locator('#type').selectOption('aktien_neu');
    await page.locator('#tqf').fill('0.3');
    const typeState = await page.locator('#type').evaluate(select => ({
        value: select.value,
        enabled: Array.from(select.options).filter(option => !option.disabled && !option.hidden).map(option => option.value)
    }));
    assert(typeState.value === 'aktien_neu' && typeState.enabled.includes('aktien_alt') && typeState.enabled.includes('aktien_neu'),
        'Aktienkategorie darf nur die beiden kanonischen Aktientypen anbieten');
    await page.locator('#trancheForm').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await page.locator('#trancheFormError').filter({ hasText: 'Stückzahl' }).waitFor({ state: 'visible' });

    await page.locator('#shares').fill('2');
    await page.locator('#trancheForm button[type="submit"]').click();
    const row = page.locator('.tranche-row');
    await row.filter({ hasText: 'Synthetische Browser-Tranche' }).waitFor({ state: 'visible' });
    const rowText = await row.textContent();
    assert(rowText.includes('Aktien') && rowText.includes('Neubestand') && !rowText.includes('Geldmarkt'),
        'Aktientranche muss kanonisch klassifiziert sein');
    assert(await row.locator('[data-action="edit-tranche"]').getAttribute('aria-label'), 'Edit-Icon benötigt einen zugänglichen Namen');
    assert(await row.locator('[data-action="delete-tranche"]').getAttribute('aria-label'), 'Delete-Icon benötigt einen zugänglichen Namen');
    const createdTranche = JSON.parse((await readIndexedDb(page, 'kv', 'depot_tranchen')).value)[0];
    assert(!('asOf' in createdTranche), 'Manuelle Neuanlage erhält keinen Kurszeitpunkt');

    await page.locator('#updatePricesBtn').click();
    await page.locator('#priceUpdateStatus').filter({ hasText: 'Kurse erfolgreich aktualisiert.' }).waitFor();
    const quoteStatus = await page.locator('#priceUpdateStatus').textContent();
    assert(quoteStatus === 'Kurse erfolgreich aktualisiert.',
        'Online-Kursupdate muss Erfolg ohne technische Kursdetails melden');
    assert((await row.textContent()).includes('105.00 €'), 'Valider EUR-Quote muss den sichtbaren Kurs aktualisieren');
    const quotedRow = await readIndexedDb(page, 'kv', 'depot_tranchen');
    const quotedTranche = JSON.parse(quotedRow.value)[0];
    assert(quotedTranche.currentPrice === 105 && quotedTranche.marketValue === 210,
        'Validierter Kurs-/Wertpfad muss Kurs und abgeleiteten Marktwert gemeinsam persistieren');
    assert(quotedTranche.asOf === quoteAsOf, 'Kurslistener persistiert exakt quote.asOf');
    const quotedRegistry = JSON.parse((await readIndexedDb(page, 'kv', 'rs_profiles_v1')).value);
    assert(JSON.parse(quotedRegistry.profiles[profileA].data.depot_tranchen)[0].asOf === quoteAsOf,
        'Bestätigte Registrykopie erhält dieselbe Kurszeit');

    await row.locator('[data-action="edit-tranche"]').click();
    await page.locator('#notes').fill('Nur eine Notiz');
    await page.locator('#trancheForm button[type="submit"]').click();
    await page.locator('#trancheModal.active').waitFor({ state: 'hidden' });
    assert(JSON.parse((await readIndexedDb(page, 'kv', 'depot_tranchen')).value)[0].asOf === quoteAsOf,
        'Reine Notizänderung bewahrt Kursprovenienz');
    await page.reload({ waitUntil: 'load' });
    await row.waitFor({ state: 'visible' });
    assert(await page.evaluate(() => window.tranchen[0].asOf) === quoteAsOf,
        'Reload lädt den bestätigten Kurszeitpunkt');

    const beforeEditRow = await readIndexedDb(page, 'kv', 'depot_tranchen');
    const beforeEditId = JSON.parse(beforeEditRow.value)[0].trancheId;
    await row.locator('[data-action="edit-tranche"]').click();
    await page.locator('#currentPrice').fill('95');
    await page.locator('#trancheForm button[type="submit"]').click();
    await page.locator('#tranchePersistenceStatus').filter({ hasText: 'aktualisiert' }).waitFor();
    const afterEditRow = await readIndexedDb(page, 'kv', 'depot_tranchen');
    const afterEditId = JSON.parse(afterEditRow.value)[0].trancheId;
    assert(afterEditId === beforeEditId, 'Editieren muss die Tranche-ID stabil halten');
    assert(!('asOf' in JSON.parse(afterEditRow.value)[0]), 'Manuelle Kursänderung entfernt die Zeitprovenienz');

    await page.reload({ waitUntil: 'load' });
    await page.locator('.tranche-row').filter({ hasText: 'Synthetische Browser-Tranche' }).waitFor({ state: 'visible' });
    const afterReloadRow = await readIndexedDb(page, 'kv', 'depot_tranchen');
    assert(afterReloadRow.value === afterEditRow.value, 'Reload muss den bestätigten Profil-A-Bestand bytegleich laden');

    await page.locator('#managerBackLink').click();
    await page.locator('h1').filter({ hasText: 'Ruhestand-Apps Suite' }).waitFor({ state: 'visible' });
    const beforeRecommendationRaw = (await readIndexedDb(page, 'kv', 'depot_tranchen')).value;
    await page.locator('a[href="Balance.html"]').click();
    await page.locator('h1').filter({ hasText: 'Ruhestand-Balancing' }).waitFor({ state: 'visible' });
    await page.locator('#handlungContent').filter({ hasText: /./ }).waitFor({ state: 'visible' });
    assert((await readIndexedDb(page, 'kv', 'depot_tranchen')).value === beforeRecommendationRaw,
        'Reine Balance-Empfehlung darf den Realbestand nicht verändern');

    await page.locator('a[href="index.html"]').first().click();
    await page.locator('h1').filter({ hasText: 'Ruhestand-Apps Suite' }).waitFor({ state: 'visible' });
    await page.locator('a[href="Simulator.html"]').click();
    await page.locator('h1').filter({ hasText: 'Ruhestand-Simulator' }).waitFor({ state: 'visible' });
    await page.waitForLoadState('load');
    await page.waitForTimeout(250);
    await page.locator('.tab-btn[data-tab="backtesting"]').click();
    await page.locator('#btButton').waitFor({ state: 'visible' });
    await page.locator('#btButton').click();
    await page.locator('#simulationResults').waitFor({ state: 'visible' });
    assert((await readIndexedDb(page, 'kv', 'depot_tranchen')).value === beforeRecommendationRaw,
        'Historische Simulation darf den Realbestand nicht verändern');

    await page.locator('a[href="index.html"]').first().click();
    await page.locator('#profileSelect').waitFor({ state: 'visible' });
    await page.locator('#profileSelect').selectOption(profileB);
    await page.locator('#profileStatus').filter({ hasText: 'Profil gewechselt' }).waitFor({ state: 'visible' });
    await page.locator('a[href="depot-tranchen-manager.html"]').click();
    await page.locator('#tranchenTable').filter({ hasText: 'Keine Tranchen vorhanden' }).waitFor({ state: 'visible' });
    assert(await page.locator('#activeProfileName').getAttribute('data-profile-id') === profileB,
        'Profil B muss einen isolierten leeren Realbestand anzeigen');

    await page.locator('#managerBackLink').click();
    await page.locator('#profileSelect').selectOption(profileA);
    await page.locator('#profileStatus').filter({ hasText: 'Profil gewechselt' }).waitFor({ state: 'visible' });
    await page.locator('a[href="depot-tranchen-manager.html"]').click();
    await page.locator('.tranche-row').filter({ hasText: 'Synthetische Browser-Tranche' }).waitFor({ state: 'visible' });
    assert(await page.locator('#activeProfileName').getAttribute('data-profile-id') === profileA,
        'Rückwechsel muss exakt den bestätigten Bestand von Profil A laden');

    await page.locator('#reconcileActionId').fill('browser-order-1');
    await page.locator('#reconcileTrancheId').selectOption(afterEditId);
    await page.locator('#reconcileExecutedAt').fill('2026-07-14');
    await page.locator('#reconcileSharesSold').fill('1');
    await page.locator('#reconcileGrossProceeds').fill('97');
    await page.locator('#reconcileFees').fill('2');
    await page.locator('.reconciliation-recommendation').evaluate(details => { details.open = true; });
    await page.locator('#reconcileRecommendedShares').fill('0.8');
    await page.locator('#reconcileRecommendedGross').fill('90');
    await page.locator('#reconciliationPreviewBtn').click();
    await page.locator('#reconciliationPreview').waitFor({ state: 'visible' });
    const previewText = await page.locator('#reconciliationPreviewContent').textContent();
    assert(previewText.includes(afterEditId) && previewText.includes('browser-order-1'),
        'Reconcile-Vorschau muss exakte Profil-/Tranche-/Action-Identitaet zeigen');
    assert(previewText.includes('Resultierender Bestand') && previewText.includes('Abweichung'),
        'Reconcile-Vorschau muss resultierenden Bestand und Empfehlungsabweichung zeigen');
    assert(previewText.includes('Cashstatus: offen') && previewText.includes('keine automatische Cashbuchung'),
        'Reconcile-Vorschau muss den offenen manuellen Cashprozess unmissverständlich zeigen');
    await page.locator('#reconciliationConfirmBtn').click();
    await page.locator('#reconciliationStatus').filter({ hasText: 'Cashbuchung bleibt manuell offen' }).waitFor();

    const reconciledRow = await readIndexedDb(page, 'kv', 'depot_tranchen');
    assert(JSON.parse(reconciledRow.value)[0].shares === 1,
        'Bestaetigte tatsaechliche Ausfuehrung muss den persistenten Stueckbestand reduzieren');
    const reconciledRegistryRow = await readIndexedDb(page, 'kv', 'rs_profiles_v1');
    const reconciledRegistry = JSON.parse(reconciledRegistryRow.value);
    assert(reconciledRegistry.trancheReconciliation.actions[0].actionId === 'browser-order-1',
        'Bestaetigung muss stabile Action-ID fuer Reload-Idempotenz speichern');
    assert(reconciledRegistry.trancheReconciliation.actions[0].eventType === 'sale_reconciled'
        && reconciledRegistry.trancheReconciliation.actions[0].cashStatus === 'pending_manual_posting',
    'Neuer Realverkauf muss explizit als offener Cashstatus gespeichert werden');
    const saleRecordBeforeCash = JSON.stringify(reconciledRegistry.trancheReconciliation.actions[0]);

    await page.locator('#reconcileActionId').fill('browser-order-1');
    await page.locator('#reconcileTrancheId').selectOption(afterEditId);
    await page.locator('#reconcileExecutedAt').fill('2026-07-14');
    await page.locator('#reconcileSharesSold').fill('1');
    await page.locator('#reconcileGrossProceeds').fill('97');
    await page.locator('#reconcileFees').fill('2');
    await page.locator('.reconciliation-recommendation').evaluate(details => { details.open = true; });
    await page.locator('#reconcileRecommendedShares').fill('0.8');
    await page.locator('#reconcileRecommendedGross').fill('90');
    await page.locator('#reconciliationPreviewBtn').click();
    await page.locator('#reconciliationStatus').filter({ hasText: 'bereits identisch verarbeitet' }).waitFor();
    assert(await page.locator('#reconciliationConfirmBtn').isDisabled(),
        'Identische Action-ID darf keine zweite Bestaetigung anbieten');
    const duplicateRow = await readIndexedDb(page, 'kv', 'depot_tranchen');
    assert(JSON.parse(duplicateRow.value)[0].shares === 1,
        'Identische Action-ID darf den Bestand nicht ein zweites Mal reduzieren');

    await page.locator('#managerBackLink').click();
    await page.locator('a[href="Balance.html"]').click();
    await page.getByText(/1 Realverkauf\/Realverkäufe mit offener manueller Cashbuchung/).waitFor({ state: 'visible' });
    assert((await readIndexedDb(page, 'kv', 'depot_tranchen')).value === duplicateRow.value,
        'Seitenwechsel mit sichtbarem Cashrückstand darf den Realbestand nicht verändern');
    await page.locator('a[href="index.html"]').first().click();
    await page.locator('a[href="depot-tranchen-manager.html"]').click();
    await page.locator('#reconciliationCashStatuses').waitFor({ state: 'visible' });
    await page.reload({ waitUntil: 'load' });
    await page.locator('#reconciliationCashStatuses').filter({ hasText: 'offener manueller Cashbuchung' }).waitFor();
    assert(await page.locator('[data-cash-action="confirm"][data-target-action-id="browser-order-1"]').isVisible(),
        'Offener Cashstatus muss Reload ueberleben und eine explizite Bestaetigung anbieten');
    await page.locator('[data-cash-action="confirm"][data-target-action-id="browser-order-1"]').click();
    await page.locator('#cashPostingModal.active').waitFor({ state: 'visible' });
    const confirmationSummary = await page.locator('#cashPostingModalSummary').textContent();
    assert(confirmationSummary.includes('browser-order-1') && confirmationSummary.includes('95,00')
        && confirmationSummary.includes('cash-confirmation:v1:browser-order-1'),
    'Cashdialog muss Zielverkauf, unveraenderten Nettoerloes und kanonische Abschluss-ID zeigen');
    await page.locator('#cashPostingBalance').fill('10095');
    await page.locator('#cashPostingSubmitBtn').click();
    await page.locator('#reconciliationStatus').filter({ hasText: 'append-only bestätigt' }).waitFor();

    const confirmedCashRegistry = JSON.parse((await readIndexedDb(page, 'kv', 'rs_profiles_v1')).value);
    assert(confirmedCashRegistry.trancheReconciliation.actions.length === 2,
        'Manueller Cashabschluss muss genau ein Folgeereignis anhaengen');
    assert(JSON.stringify(confirmedCashRegistry.trancheReconciliation.actions[0]) === saleRecordBeforeCash,
        'Cashabschluss darf den Verkaufsrecord byte-/wertgleich nicht mutieren');
    const cashConfirmation = confirmedCashRegistry.trancheReconciliation.actions[1];
    assert(cashConfirmation.eventType === 'cash_posting_confirmed'
        && cashConfirmation.actionId === cashConfirmation.confirmationActionId
        && cashConfirmation.targetActionId === 'browser-order-1'
        && cashConfirmation.confirmedNetProceedsEur === 95,
    'Cashabschluss muss kanonisch auf Verkauf und Nettoerloes verweisen');

    await page.reload({ waitUntil: 'load' });
    await page.locator('#reconciliationCashStatuses').filter({ hasText: 'Kein offener manueller Cashrückstand' }).waitFor();
    await page.locator('[data-cash-action="correct"][data-target-action-id="browser-order-1"]').click();
    await page.locator('#cashPostingModal.active').waitFor({ state: 'visible' });
    const correctionSummary = await page.locator('#cashPostingModalSummary').textContent();
    assert(correctionSummary.includes('10.095,00') && correctionSummary.includes('Korrekturrevision: 1')
        && correctionSummary.includes('cash-correction:v1:browser-order-1:1'),
    'Korrekturdialog muss bisherigen Cashstand, naechste Revision und kanonische ID zeigen');
    await page.locator('#cashPostingBalance').fill('10090');
    await page.locator('#cashPostingReason').fill('Browser-Test: Zahlendreher korrigiert');
    await page.locator('#cashPostingSubmitBtn').click();
    await page.locator('#reconciliationStatus').filter({ hasText: 'Cashstandkorrektur append-only gespeichert' }).waitFor();

    const correctedCashRegistry = JSON.parse((await readIndexedDb(page, 'kv', 'rs_profiles_v1')).value);
    assert(correctedCashRegistry.trancheReconciliation.actions.length === 3,
        'Cashkorrektur muss genau ein drittes Folgeereignis anhaengen');
    assert(JSON.stringify(correctedCashRegistry.trancheReconciliation.actions[0]) === saleRecordBeforeCash
        && JSON.stringify(correctedCashRegistry.trancheReconciliation.actions[1]) === JSON.stringify(cashConfirmation),
    'Cashkorrektur darf weder Verkauf noch bestaetigten Vorgänger mutieren');
    const cashCorrection = correctedCashRegistry.trancheReconciliation.actions[2];
    assert(cashCorrection.eventType === 'cash_posting_corrected'
        && cashCorrection.correctionRevision === 1
        && cashCorrection.correctsActionId === cashConfirmation.actionId
        && cashCorrection.cashBalanceAfterPostingEur === 10090,
    'Cashkorrektur muss als lineare Revision auf den wirksamen Vorgänger zeigen');

    const duplicateCorrectionStatus = await page.evaluate(async () => {
        const { commitCashPostingCorrection } = await import('./app/tranches/tranche-reconciliation.js');
        const { persistenceStorage } = await import('./app/shared/persistence-facade.js');
        const registryRaw = persistenceStorage.getItem('rs_profiles_v1');
        const registry = JSON.parse(registryRaw);
        const record = registry.trancheReconciliation.actions[2];
        const result = await commitCashPostingCorrection({ ...record, expectedRegistryRaw: registryRaw });
        return result.status;
    });
    assert(duplicateCorrectionStatus === 'duplicate',
        'Byte-/wertgleiche Korrekturwiederholung muss idempotent bleiben');
    assert(JSON.parse((await readIndexedDb(page, 'kv', 'rs_profiles_v1')).value)
        .trancheReconciliation.actions.length === 3,
    'Idempotente Korrekturwiederholung darf kein viertes Event erzeugen');

    await page.reload({ waitUntil: 'load' });
    const correctedStatusText = await page.locator('#reconciliationCashStatuses').textContent();
    assert(correctedStatusText.includes('Revision 1') && correctedStatusText.includes('10.090,00'),
        'Reload muss ausschließlich den letzten wirksamen korrigierten Cashstand anzeigen');

    await page.evaluate(async () => {
        const { persistenceStorage, PersistenceFacade } = await import('./app/shared/persistence-facade.js');
        const registry = JSON.parse(persistenceStorage.getItem('rs_profiles_v1'));
        const legacy = JSON.parse(JSON.stringify(registry.trancheReconciliation.actions[0]));
        legacy.actionId = 'legacy-browser-sale';
        legacy.executedAt = '2025-01-02';
        delete legacy.eventType;
        delete legacy.cashStatus;
        delete legacy.cashBalanceAfterPostingEur;
        delete legacy.cashConfirmedAt;
        registry.trancheReconciliation.actions.push(legacy);
        persistenceStorage.setItem('rs_profiles_v1', JSON.stringify(registry));
        await PersistenceFacade.flush();
    });
    await page.reload({ waitUntil: 'load' });
    const legacyStatusText = await page.locator('#reconciliationCashStatuses').textContent();
    assert(legacyStatusText.includes('Abgeschlossen (Altfall – Cashstatus nicht dokumentiert)')
        && legacyStatusText.includes('Kein offener manueller Cashrückstand'),
    'Legacy-Verkauf muss sichtbar, operativ abgeschlossen und nicht als pending dargestellt werden');

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileLayout = await page.evaluate(() => {
        const scroller = document.querySelector('.table-scroll');
        return {
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: document.documentElement.clientWidth,
            tableScrolls: Boolean(scroller && scroller.scrollWidth > scroller.clientWidth)
        };
    });
    assert(mobileLayout.documentWidth <= mobileLayout.viewportWidth, `390px-Viewport darf Dokument nicht horizontal überlaufen: ${JSON.stringify(mobileLayout)}`);
    assert(mobileLayout.tableScrolls, 'Erforderliche Tabellenbewegung muss im Tabellencontainer liegen');

    await page.locator('[data-action="delete-tranche"]').click();
    await page.locator('#tranchenTable').filter({ hasText: 'Keine Tranchen vorhanden' }).waitFor();
    assert((await readIndexedDb(page, 'kv', 'depot_tranchen')).value === '[]',
        'Bestätigtes Löschen muss nur den temporären Profil-A-Testbestand leeren');
    smoke.assertNoErrors();
    await smoke.close();
}

async function runTranchesQuoteFailureSmoke(browser, baseUrl) {
    const profileId = 'browser-slice09-quotes';
    const initialTranches = [
        createBrowserTranche({ trancheId: 'quote-eur', name: 'Synthetischer EUR-Kurs', ticker: 'EUR.DE', currentPrice: 100 }),
        createBrowserTranche({ trancheId: 'quote-usd', name: 'Synthetischer Fremdkurs', ticker: 'USD.DE', currentPrice: 80 })
    ];
    const storage = createBrowserProfileStorage({
        [profileId]: { name: 'Browserprofil Kurse', tranchesRaw: JSON.stringify(initialTranches) }
    }, profileId);
    const smoke = await openSmokePage(browser, baseUrl, 'depot-tranchen-manager.html', {
        storage,
        quoteFixtures: {
            'EUR.DE': { price: 120, currency: 'EUR' },
            'USD.DE': { price: 130, currency: 'USD' }
        }
    });
    const { page } = smoke;
    await page.locator('.tranche-row').nth(1).waitFor({ state: 'visible' });
    await page.locator('#updatePricesBtn').click();
    await page.locator('#priceUpdateStatus').filter({ hasText: 'Kurse teilweise aktualisiert (1 von 2).' }).waitFor();
    const status = await page.locator('#priceUpdateStatus').textContent();
    assert(status.includes('Synthetischer Fremdkurs: Waehrung USD wird nicht unterstuetzt.'),
        'Browser-Teilerfolg muss betroffene Tranche und verständlichen Grund anzeigen');
    assert(!status.includes('yahoo-chart') && !status.includes('Stichtag'),
        'Browser-Teilerfolg darf erfolgreiche Kursmetadaten nicht anzeigen');
    const persisted = JSON.parse((await readIndexedDb(page, 'kv', 'depot_tranchen')).value);
    assert(persisted.find(item => item.trancheId === 'quote-eur').currentPrice === 120,
        'EUR-Teilerfolg muss übernommen werden');
    assert(persisted.find(item => item.trancheId === 'quote-usd').currentPrice === 80,
        'Fremdwährungsfehler muss den alten bestätigten Kurs erhalten');
    smoke.assertNoErrors();
    await smoke.close();

    const offlineProfileId = 'browser-slice09-offline';
    const offlineRaw = JSON.stringify([createBrowserTranche({
        trancheId: 'quote-offline', name: 'Synthetischer Offline-Kurs', ticker: 'OFFLINE.DE', currentPrice: 77
    })]);
    const offlineSmoke = await openSmokePage(browser, baseUrl, 'depot-tranchen-manager.html', {
        storage: createBrowserProfileStorage({
            [offlineProfileId]: { name: 'Browserprofil Offline', tranchesRaw: offlineRaw }
        }, offlineProfileId),
        quoteFixtures: 'offline'
    });
    await offlineSmoke.page.locator('.tranche-row').waitFor({ state: 'visible' });
    await offlineSmoke.page.locator('#updatePricesBtn').click();
    await offlineSmoke.page.locator('#priceUpdateStatus').filter({ hasText: 'Kurse konnten nicht aktualisiert werden.' }).waitFor();
    const offlineStatus = await offlineSmoke.page.locator('#priceUpdateStatus').textContent();
    assert(offlineStatus.includes('Synthetischer Offline-Kurs: Lokaler Kursproxy nicht erreichbar'),
        'Browser-Offlinefall muss betroffene Tranche und Proxy-Nichterreichbarkeit anzeigen');
    assert((await readIndexedDb(offlineSmoke.page, 'kv', 'depot_tranchen')).value === offlineRaw,
        'Kompletter Offlinefehler darf keinen bestätigten Kursbestand schreiben');
    offlineSmoke.assertNoErrors(['Failed to load resource: net::ERR_FAILED']);
    await offlineSmoke.close();
}

async function runTranchesRecoverySmoke(browser, baseUrl) {
    const profileId = 'browser-slice09-recovery';
    const corruptRaw = '{synthetisch-not-json';
    const storage = createBrowserProfileStorage({
        [profileId]: { name: 'Browserprofil Recovery', tranchesRaw: corruptRaw }
    }, profileId);
    const smoke = await openSmokePage(browser, baseUrl, 'depot-tranchen-manager.html', { storage });
    const { page } = smoke;
    await page.locator('#trancheRecoveryActions').waitFor({ state: 'visible' });
    assert((await readIndexedDb(page, 'kv', 'depot_tranchen')).value === corruptRaw,
        'Recovery-Start muss korrupten Rohpayload bytegleich erhalten');
    await page.locator('#revealCorruptPayloadBtn').click();
    assert(await page.locator('#corruptPayloadPreview').textContent() === corruptRaw,
        'Bewusstes Anzeigen muss exakt den synthetischen Rohpayload zeigen');
    await page.locator('#resetCorruptPayloadBtn').click();
    await page.locator('#tranchePersistenceStatus').filter({ hasText: 'bestätigt zurückgesetzt' }).waitFor({ state: 'visible' });
    assert((await readIndexedDb(page, 'kv', 'depot_tranchen')).value === '[]',
        'Bestätigter Recovery-Reset muss den temporären Testbestand explizit leeren');
    smoke.assertNoErrors();
    await smoke.close();
}

async function runProfileRegistryRecoverySmoke(browser, baseUrl) {
    const corruptRaw = '{synthetisch-profile-registry-not-json';
    const smoke = await openSmokePage(browser, baseUrl, 'index.html', {
        storage: { rs_profiles_v1: corruptRaw }
    });
    const { page } = smoke;
    await page.locator('#profileStatus[data-profile-recovery="corrupt"]').waitFor({ state: 'visible' });
    assert((await readIndexedDb(page, 'kv', 'rs_profiles_v1')).value === corruptRaw,
        'Profile recovery must preserve corrupt registry bytes before export');
    assert(await page.locator('[data-profile-recovery-action="reset"]').isDisabled(),
        'Profile reset must stay disabled before recovery export');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-profile-recovery-action="export"]').click();
    const download = await downloadPromise;
    const recoveryDocument = JSON.parse(await readDownloadText(download));
    assert(recoveryDocument.schema === 'ruhestand-profile-recovery',
        'Profile recovery download must use the typed recovery schema');
    assert(recoveryDocument.recovery.raw === corruptRaw,
        'Profile recovery download must contain the exact corrupt registry payload');
    assert(!(await page.locator('[data-profile-recovery-action="reset"]').isDisabled()),
        'Successful recovery export must unlock the confirmed reset');

    await page.locator('[data-profile-recovery-action="reset"]').click();
    await page.waitForFunction(() => {
        const select = document.getElementById('profileSelect');
        const status = document.getElementById('profileStatus');
        return select?.querySelector('option[value="default"]')
            && status?.dataset?.profileRecovery !== 'corrupt';
    });
    const registryRow = await readIndexedDb(page, 'kv', 'rs_profiles_v1');
    const currentRow = await readIndexedDb(page, 'kv', 'rs_current_profile');
    assert(Boolean(JSON.parse(registryRow.value).profiles.default),
        'Confirmed registry reset must create a safe default profile');
    assert(currentRow.value === 'default',
        'Confirmed registry reset must reconcile the current profile ID');
    smoke.assertNoErrors();
    await smoke.close();
}

async function runBalanceCorruptProfileHealthSmoke(browser, baseUrl) {
    const profileId = 'browser-slice13-health';
    const corruptRaw = '{"enabled":"maybe","initialAmount":150000}';
    const storage = {
        ...createBalanceStorage(2025),
        ...createBrowserProfileStorage({
            [profileId]: {
                name: 'Browserprofil Pflege-Recovery',
                healthBucketRaw: corruptRaw
            }
        }, profileId)
    };
    const registryRaw = storage.rs_profiles_v1;
    const smoke = await openSmokePage(browser, baseUrl, 'Balance.html', { storage });
    const { page } = smoke;
    await page.locator('#error-container')
        .filter({ hasText: 'Profil-Recovery erforderlich' })
        .waitFor({ state: 'visible' });
    const errorText = await page.locator('#error-container').textContent();
    assert(errorText.includes('Pflegebucket') && errorText.includes('Browserprofil Pflege-Recovery'),
        'Balance must name the profile and corrupt care area visibly');
    assert((await readIndexedDb(page, 'kv', 'rs_profiles_v1')).value === registryRaw,
        'Balance care blocker must not mutate the registry');
    smoke.assertNoErrors(['Update-Fehler: ProfileRecoveryError']);
    await smoke.close();
}

async function runSimulatorCorruptProfileBalanceSmoke(browser, baseUrl) {
    const profileId = 'browser-slice13-balance';
    const corruptRaw = '{"inputs":null}';
    const storage = createBrowserProfileStorage({
        [profileId]: {
            name: 'Browserprofil Balance-Recovery',
            balanceStateRaw: corruptRaw
        }
    }, profileId);
    const registryRaw = storage.rs_profiles_v1;
    const smoke = await openSmokePage(browser, baseUrl, 'Simulator.html', { storage });
    const { page } = smoke;
    await page.locator('#simProfileStatus')
        .filter({ hasText: 'Profil-Recovery erforderlich' })
        .waitFor({ state: 'visible' });
    const statusText = await page.locator('#simProfileStatus').textContent();
    assert(statusText.includes('Balance-State') && statusText.includes('Browserprofil Balance-Recovery'),
        `Simulator must name the profile and corrupt balance area visibly: ${JSON.stringify(statusText)}`);
    assert((await readIndexedDb(page, 'kv', 'rs_profiles_v1')).value === registryRaw,
        'Simulator balance blocker must not mutate the registry');
    const blockedControls = [
        'mcButton',
        'btButton',
        'sweepButton',
        'sweepSelfTestButton',
        'findBestButton',
        'sensitivityButton',
        'paretoButton',
        'ao_run_btn',
        'ao_apply_btn'
    ];
    for (const controlId of blockedControls) {
        assert(await page.locator(`#${controlId}`).isDisabled(),
            `Simulator profile recovery must disable ${controlId}`);
    }
    const guardState = await page.evaluate(() => ({
        result: window.runMonteCarlo(),
        preferAggregates: window.__profilverbundPreferAggregates,
        hasBlocker: Boolean(window.__profileRecoveryBlocker)
    }));
    assert(guardState.result === false,
        'Programmatic Monte-Carlo start must be rejected during profile recovery');
    assert(guardState.preferAggregates === false,
        'Profile recovery must not discard live tranches in favor of partial aggregates');
    assert(guardState.hasBlocker,
        'Simulator must expose one hard profile recovery blocker for all run paths');

    await page.locator('#ao_presets_container .ao-preset-btn').first().dispatchEvent('click');
    await page.waitForFunction(() => document.getElementById('ao_run_btn')?.disabled === true);
    const blockedActionCount = await page.evaluate(() => window.__profileRecoveryBlockedActionCount || 0);
    await page.locator('#ao_run_btn').dispatchEvent('click');
    await page.waitForFunction(previousCount => (
        (window.__profileRecoveryBlockedActionCount || 0) > previousCount
    ), blockedActionCount);
    assert(await page.locator('#ao_run_btn').isDisabled(),
        'Auto-Optimize interactions must not re-enable the run button during profile recovery');
    assert((await page.locator('#ao_progress').textContent()) !== 'Starting...',
        'Auto-Optimize local click handler must not run during profile recovery');
    smoke.assertNoErrors();
    await smoke.close();
}

async function runBalanceGhostProfileContextSmoke(browser, baseUrl) {
    const profileId = 'browser-slice13-balance-context';
    const healthyProfileStorage = createBrowserProfileStorage({
        [profileId]: {
            name: 'Gesundes Balance-Profil',
            tagesgeld: '50000',
            alter: '67'
        }
    }, profileId);
    const storage = {
        ...createBalanceStorage(2025),
        ...healthyProfileStorage,
        rs_active_profile: 'geloeschtes-balance-profil',
        profile_tagesgeld: '20000',
        profile_aktuelles_alter: '61'
    };
    const registryRaw = storage.rs_profiles_v1;
    const smoke = await openSmokePage(browser, baseUrl, 'Balance.html', { storage });
    const { page } = smoke;
    await page.locator('#error-container')
        .filter({ hasText: 'Profil-Recovery erforderlich' })
        .waitFor({ state: 'visible' });
    const errorText = await page.locator('#error-container').textContent();
    assert(errorText.includes('geloeschtes-balance-profil'),
        'Balance must surface a ghost active profile context visibly');

    await page.evaluate(() => window.dispatchEvent(new Event('beforeunload')));
    await page.waitForTimeout(100);
    const registryAfterUnload = (await readIndexedDb(page, 'kv', 'rs_profiles_v1')).value;
    assert(registryAfterUnload === registryRaw,
        'Balance beforeunload must not overwrite a healthy profile while active ID is a ghost');
    const healthyProfile = JSON.parse(registryAfterUnload).profiles[profileId];
    assert(healthyProfile.data.profile_tagesgeld === '50000',
        'Balance ghost recovery must retain healthy registry profile data');
    smoke.assertNoErrors([
        'Update-Fehler: ProfileRecoveryError',
        '[ProfileNavigation] Profil-Snapshot fehlgeschlagen:'
    ]);
    await smoke.close();
}

async function runSimulatorGhostProfileContextSmoke(browser, baseUrl) {
    const profileId = 'browser-slice13-simulator-context';
    const storage = {
        ...createBrowserProfileStorage({
            [profileId]: {
                name: 'Gesundes Simulator-Profil',
                tranchesRaw: JSON.stringify([createBrowserTranche({ trancheId: 'healthy-lot' })]),
                tagesgeld: '50000',
                alter: '67'
            }
        }, profileId),
        rs_active_profile: 'geloeschtes-simulator-profil',
        depot_tranchen: JSON.stringify([createBrowserTranche({ trancheId: 'stale-live-lot' })]),
        profile_tagesgeld: '20000',
        profile_aktuelles_alter: '61'
    };
    const registryRaw = storage.rs_profiles_v1;
    const smoke = await openSmokePage(browser, baseUrl, 'Simulator.html', { storage });
    const { page } = smoke;
    await page.locator('#simProfileStatus')
        .filter({ hasText: 'Profil-Recovery erforderlich' })
        .waitFor({ state: 'visible' });
    const statusText = await page.locator('#simProfileStatus').textContent();
    assert(statusText.includes('geloeschtes-simulator-profil'),
        'Simulator must surface a ghost active profile context visibly');
    assert(await page.locator('#mcButton').isDisabled(),
        'Simulator ghost context must hard-disable Monte-Carlo execution');
    assert(await page.evaluate(() => window.runMonteCarlo()) === false,
        'Simulator ghost context must reject programmatic simulation starts');
    assert((await readIndexedDb(page, 'kv', 'rs_profiles_v1')).value === registryRaw,
        'Simulator ghost context must not mutate the healthy registry');
    smoke.assertNoErrors();
    await smoke.close();
}

async function runSimulatorHybridProfileBlocker(browser, baseUrl) {
    const detailedProfileId = 'browser-hybrid-detail';
    const aggregateProfileId = 'browser-hybrid-aggregate';
    const storage = createBrowserProfileStorage({
        [detailedProfileId]: {
            name: 'Browser Detailprofil',
            tranchesRaw: JSON.stringify([createBrowserTranche({
                trancheId: 'hybrid-detail-lot',
                shares: 800,
                purchasePrice: 100,
                currentPrice: 100
            })]),
            tagesgeld: '10000'
        },
        [aggregateProfileId]: {
            name: 'Browser Aggregatprofil',
            omitTranches: true,
            tagesgeld: '20000',
            extraData: {
                sim_depotwertAlt: '150000',
                sim_geldmarktEtf: '30000',
                sim_simStartVermoegen: '200000'
            }
        }
    }, detailedProfileId);
    const registryRaw = storage.rs_profiles_v1;
    const smoke = await openSmokePage(browser, baseUrl, 'Simulator.html', { storage });
    const { page } = smoke;
    await page.locator('#simProfileStatus')
        .filter({ hasText: 'Hybridhaushalt wurde blockiert' })
        .waitFor({ state: 'visible', timeout: 10000 });
    const statusText = await page.locator('#simProfileStatus').textContent();
    assert(
        statusText.includes('Browser Aggregatprofil') && statusText.includes('Cost Basis'),
        'Browser hybrid household must fail closed'
    );
    assert(await page.locator('#mcButton').isDisabled(),
        'Hybrid provenance blocker must disable Monte-Carlo execution');
    assert(await page.locator('#sweepButton').isDisabled(),
        'Hybrid provenance blocker must disable Sweep execution');
    assert(await page.locator('#ao_run_btn').isDisabled(),
        'Hybrid provenance blocker must disable Auto-Optimize execution');
    assert((await readIndexedDb(page, 'kv', 'rs_profiles_v1')).value === registryRaw,
        'Hybrid provenance blocker must not mutate the profile registry');
    smoke.assertNoErrors();
    await smoke.close();
}

async function runSimulatorSweepIntegration(browser, baseUrl) {
    const smoke = await openSmokePage(browser, baseUrl, 'Simulator.html');
    const { page } = smoke;
    const setMcDuration = value => page.locator('#mcDauer').evaluate((element, next) => {
        element.value = next;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
    await page.locator('.tab-btn[data-tab="sweep"]').click();
    await page.locator('#sweepButton').waitFor({ state: 'visible' });
    assert(await page.locator('#sweepRuns').inputValue() === '500',
        'Frischer Simulator zeigt 500 Sweep-Simulationen');
    assert(await page.locator('#mcAnzahl').inputValue() === '10000',
        'Frischer Simulator behaelt 10000 MC-Simulationen');
    await page.locator('#sweepRuns').fill('2');
    await page.evaluate(async () => {
        const { flush } = await import('./app/shared/persistence-facade.js');
        await flush();
    });
    await page.reload();
    await page.locator('.tab-btn[data-tab="sweep"]').click();
    await page.waitForFunction(() => document.getElementById('sweepRuns')?.value === '2');
    assert(await page.locator('#sweepRuns').inputValue() === '2',
        'Sweep-Laufzahl ueberlebt das Neuladen');
    await page.evaluate(() => {
        const setValue = (id, value) => {
            const element = document.getElementById(id);
            element.value = String(value);
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        };
        setValue('mcAnzahl', 'ungueltig');
        setValue('mcDauer', 2);
        setValue('mcBlockSize', 1);
        setValue('mcWorkerCount', 1);
        setValue('mcWorkerBudget', 50);
        setValue('sweepLiquidityRunwayYears', 3);
        setValue('sweepGoldRebalancingBand', 25);
        setValue('sweepMaxSkimPct', 0);
        setValue('sweepMaxBearRefillPct', 5);
        setValue('sweepGoldTargetPct', 0);
        setValue('sweepSurvivalQuantile', 0.85);
        setValue('sweepGoGoMultiplier', 1.1);
        document.getElementById('dynamicFlex').checked = false;
        document.getElementById('dynamicFlex').dispatchEvent(new Event('change', { bubbles: true }));
        document.getElementById('goGoActive').checked = false;
        document.getElementById('goGoActive').dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert((await page.locator('#sweepGridSize').textContent()).includes('Grid: 1 Kombis'),
        'Inaktive VPW-Ranges werden im Grid nicht mitgezaehlt');
    const workload = page.locator('#sweepWorkload');
    assert((await workload.textContent()).includes('1 Kombination × 2 Läufe × 2 Jahre = 4 nominelle Laufjahre'),
        'Sweep-Aufwand zeigt Kombinationen, eigene Laufzahl und nominelle Jahre vor dem Start');
    await page.locator('#sweepRuns').fill('3');
    assert((await workload.textContent()).includes('= 6 nominelle Laufjahre'),
        'Sweep-Aufwand reagiert auf die eigene Laufzahl');
    await page.locator('#sweepRuns').fill('2');
    await setMcDuration('3');
    assert((await workload.textContent()).includes('= 6 nominelle Laufjahre'),
        'Sweep-Aufwand reagiert auf die Dauer');
    await setMcDuration('2');
    await page.locator('#sweepLiquidityRunwayYears').fill('3,4');
    assert((await workload.textContent()).includes('2 Kombinationen × 2 Läufe × 2 Jahre = 8 nominelle Laufjahre'),
        'Sweep-Aufwand verwendet die aktiven Ranges');
    await page.locator('#sweepLiquidityRunwayYears').fill('3');
    await page.locator('#sweepGoldRebalancingBand').fill('0:1:299');
    assert((await page.locator('#sweepGridSize').textContent()).includes('Grid: 300 Kombis')
        && !(await page.locator('#sweepGridSize').textContent()).includes('Max: 300')
        && (await workload.textContent()).includes('= 1.200 nominelle Laufjahre'),
    'Genau 300 Kombinationen bleiben innerhalb des Grid-Limits');
    await page.locator('#sweepGoldRebalancingBand').fill('0:1:300');
    assert((await page.locator('#sweepGridSize').textContent()).includes('Max: 300')
        && (await workload.textContent()).includes('?'),
    '300-Kombinationen-Limit bleibt sichtbar und uebergrosse Grids haben keinen belastbaren Aufwand');
    await page.locator('#sweepGoldRebalancingBand').fill('25');
    await page.locator('#sweepLiquidityRunwayYears').fill('');
    assert((await workload.textContent()).includes('?'), 'Leere aktive Range zeigt keinen Aufwand');
    await page.locator('#sweepLiquidityRunwayYears').fill('3');
    await page.locator('#sweepRuns').fill('');
    assert((await workload.textContent()).includes('?'), 'Leere Laufzahl zeigt keinen Aufwand');
    await page.locator('#sweepRuns').fill('2');
    await setMcDuration('0');
    assert((await workload.textContent()).includes('?'), 'Ungueltige Dauer zeigt keinen Aufwand');
    await setMcDuration('2');
    await page.locator('#sweepButton').click();
    await page.waitForFunction(() => window.sweepExecution?.results?.length === 1
        && document.querySelector('#sweepHeatmap svg'), null, { timeout: 30000 });
    const standard = await page.evaluate(() => {
        const result = window.sweepExecution.results[0];
        return {
            requestedRuns: window.sweepExecution.request.monteCarloParameters.anzahl,
            provenRuns: result.provenance.normalizedParameters.anzahl,
            metricVersion: result.metrics?.schemaVersion,
            invalidCombination: result.metrics?.invalidCombination,
            invalidReason: result.metrics?.invalidReason,
            value: result.metrics?.successProbFloor,
            keys: Object.keys(result.params).sort(),
            cellCount: document.querySelectorAll('#sweepHeatmap svg rect[stroke]').length,
            text: document.getElementById('sweepHeatmap').textContent
        };
    });
    assert(standard.metricVersion === 'SweepMetricsV4'
        && standard.invalidCombination !== true && Number.isFinite(standard.value),
    `Standard-Sweep muss einen kanonischen Metrikwert liefern: ${JSON.stringify(standard)}`);
    assert(standard.requestedRuns === 2 && standard.provenRuns === 2,
        'Sweep nutzt seine eigene Laufzahl in Request und gueltiger Provenienz');
    assert(standard.cellCount > 0 && standard.text.includes(`${standard.value.toFixed(1)}%`)
        && !standard.text.includes('Keine gültigen Sweep-Ergebnisse'),
        'Standard-Sweep zeigt eine SVG-Zelle mit kanonischem Wert');
    assert(standard.keys.length === 5 && !standard.keys.includes('survivalQuantile')
        && !standard.keys.includes('goGoMultiplier'),
        'Inaktive VPW-Felder fehlen in der gestarteten Kombination');
    await page.locator('#sweepRuns').fill('10000');
    await page.evaluate(() => {
        window.__sweepBeforeAbort = window.sweepExecution;
        window.__sweepHeatmapBeforeAbort = document.getElementById('sweepHeatmap').innerHTML;
        window.__sweepWorkerBase = window.Worker;
        window.__sweepTerminations = 0;
        window.Worker = class extends window.__sweepWorkerBase {
            terminate() {
                window.__sweepTerminations++;
                return super.terminate();
            }
        };
    });
    await page.locator('#sweepButton').click();
    await page.waitForFunction(() => parseFloat(document.getElementById('sweep-progress-bar').style.width) > 0
        && !document.getElementById('sweepCancelButton').disabled, null, { timeout: 30000 });
    await page.locator('#sweepCancelButton').click();
    await page.waitForFunction(() => document.getElementById('sweepStatus').textContent === 'Abgebrochen'
        && !document.getElementById('sweepButton').disabled, null, { timeout: 30000 });
    const aborted = await page.evaluate(() => ({
        sameExecution: window.sweepExecution === window.__sweepBeforeAbort,
        sameHeatmap: document.getElementById('sweepHeatmap').innerHTML === window.__sweepHeatmapBeforeAbort,
        terminated: window.__sweepTerminations,
        progress: document.getElementById('sweep-progress-bar').textContent,
        status: document.getElementById('sweepStatus').textContent
    }));
    assert(aborted.sameExecution && aborted.sameHeatmap && aborted.terminated > 0
        && aborted.progress !== '100%' && aborted.status === 'Abgebrochen',
    `Abbruch bewahrt vollstaendige Heatmap und beendet Worker: ${JSON.stringify(aborted)}`);
    await page.evaluate(() => { window.Worker = window.__sweepWorkerBase; });
    await page.locator('#sweepRuns').fill('2');
    await page.locator('#sweepButton').click();
    await page.waitForFunction(() => window.sweepExecution !== window.__sweepBeforeAbort
        && window.sweepExecution?.request?.monteCarloParameters?.anzahl === 2
        && document.getElementById('sweepStatus').textContent === 'Abgeschlossen',
    null, { timeout: 30000 });
    assert(await page.locator('#sweepHeatmap svg rect[stroke]').count() > 0,
        'Direkter Neustart veroeffentlicht eine vollstaendige neue Heatmap');
    await page.locator('#sweepRuns').fill('10000');
    await page.evaluate(() => {
        window.__sweepBeforeSerialAbort = window.sweepExecution;
        window.__sweepHeatmapBeforeSerialAbort = document.getElementById('sweepHeatmap').innerHTML;
        window.Worker = class {
            constructor() { throw new Error('serial sweep abort smoke'); }
        };
    });
    await page.locator('#sweepButton').click();
    await page.waitForFunction(() => parseFloat(document.getElementById('sweep-progress-bar').style.width) > 0
        && !document.getElementById('sweepCancelButton').disabled, null, { timeout: 30000 });
    await page.locator('#sweepCancelButton').click();
    await page.waitForFunction(() => document.getElementById('sweepStatus').textContent === 'Abgebrochen'
        && !document.getElementById('sweepButton').disabled, null, { timeout: 30000 });
    const serialAbort = await page.evaluate(() => ({
        sameExecution: window.sweepExecution === window.__sweepBeforeSerialAbort,
        sameHeatmap: document.getElementById('sweepHeatmap').innerHTML === window.__sweepHeatmapBeforeSerialAbort,
        progress: document.getElementById('sweep-progress-bar').textContent
    }));
    await page.evaluate(() => { window.Worker = window.__sweepWorkerBase; });
    assert(serialAbort.sameExecution && serialAbort.sameHeatmap && serialAbort.progress !== '100%',
        `Serieller Abbruch bewahrt das Altresultat: ${JSON.stringify(serialAbort)}`);
    await page.evaluate(() => {
        window.sweepExecution = undefined;
        window.sweepResults = undefined;
        window.sweepParamRanges = undefined;
        document.getElementById('sweepHeatmap').innerHTML = '';
        document.getElementById('sweepResults').style.display = 'none';
    });
    await page.locator('#sweepButton').click();
    await page.waitForFunction(() => parseFloat(document.getElementById('sweep-progress-bar').style.width) > 0
        && !document.getElementById('sweepCancelButton').disabled, null, { timeout: 30000 });
    await page.locator('#sweepCancelButton').click();
    await page.waitForFunction(() => document.getElementById('sweepStatus').textContent === 'Abgebrochen'
        && !document.getElementById('sweepButton').disabled, null, { timeout: 30000 });
    assert(await page.evaluate(() => window.sweepExecution === undefined
        && window.sweepResults === undefined
        && document.getElementById('sweepHeatmap').innerHTML === ''
        && document.getElementById('sweepResults').style.display === 'none'),
    'Abbruch ohne Altresultat laesst die Ergebnisansicht leer');
    // Eine Kombination erzwingt einen einzigen Worker-Block. Jede Breite unter
    // 99 Prozent stammt dann aus einem Lauf innerhalb dieses Blocks.
    await page.locator('#sweepLiquidityRunwayYears').fill('3');
    await page.locator('#sweepRuns').fill('30');
    await page.evaluate(() => {
        const previous = window.sweepExecution;
        const bar = document.getElementById('sweep-progress-bar');
        window.__sweepWorkerProgress = false;
        window.__sweepWorkerMessage = false;
        window.__sweepOriginalWorker = window.Worker;
        window.Worker = class extends window.__sweepOriginalWorker {
            constructor(...args) {
                super(...args);
                this.sweepJobs = new Map();
                this.addEventListener('message', event => {
                    const message = event.data;
                    const generationId = this.sweepJobs.get(message?.jobId);
                    if (window.sweepExecution === previous && message?.type === 'progress'
                        && message.phase === 'sweep' && generationId
                        && message.generationId === generationId
                        && message.comboRange?.start === 0 && message.comboRange?.count === 1
                        && message.completedUnits > 0 && message.completedUnits < 1) {
                        window.__sweepWorkerMessage = true;
                    }
                });
            }
            postMessage(message, transferables) {
                if (message?.type === 'sweep') {
                    this.sweepJobs.set(message.jobId, message.generationId);
                }
                return super.postMessage(message, transferables);
            }
        };
        const observer = new MutationObserver(() => {
            const width = parseFloat(bar.style.width);
            if (window.sweepExecution === previous && width > 0 && width < 99) {
                window.__sweepWorkerProgress = true;
            }
        });
        observer.observe(bar, { attributes: true, attributeFilter: ['style'] });
        window.__sweepWorkerObserver = observer;
        window.__sweepWorkerPrevious = previous;
    });
    await page.locator('#sweepButton').click();
    await page.waitForFunction(() => window.sweepExecution !== window.__sweepWorkerPrevious,
        null, { timeout: 30000 });
    const workerReference = await page.evaluate(() => {
        window.__sweepWorkerObserver.disconnect();
        window.Worker = window.__sweepOriginalWorker;
        return {
            progress: window.__sweepWorkerProgress,
            message: window.__sweepWorkerMessage,
            execution: JSON.stringify(window.sweepExecution)
        };
    });
    assert(workerReference.progress && workerReference.message,
        'Echte Worker-Nachricht erreicht vor dem Ende des einzigen Blocks den Fortschrittsbalken');
    await page.evaluate(() => {
        window.Worker = class {
            constructor() { throw new Error('serial sweep smoke'); }
        };
        const probe = window.__sweepProgressProbe = {
            previous: window.sweepExecution,
            partial: false, painted: false, clicked: false
        };
        const clickTarget = document.createElement('button');
        clickTarget.id = 'sweep-progress-click-target';
        clickTarget.addEventListener('click', () => { probe.clicked = true; });
        document.body.append(clickTarget);
        const observe = () => {
            if (window.sweepExecution !== probe.previous) return;
            const width = parseFloat(document.getElementById('sweep-progress-bar').style.width);
            if (width > 0 && width < 100) {
                probe.partial = true;
                clickTarget.click();
                probe.painted = true;
            }
            requestAnimationFrame(observe);
        };
        requestAnimationFrame(observe);
    });
    await page.locator('#sweepButton').click();
    await page.waitForFunction(() => window.sweepExecution !== window.__sweepProgressProbe.previous,
        null, { timeout: 30000 });
    const serialProbe = await page.evaluate(() => {
        const { partial, painted, clicked } = window.__sweepProgressProbe;
        const execution = JSON.stringify(window.sweepExecution);
        window.Worker = window.__sweepOriginalWorker;
        document.getElementById('sweep-progress-click-target').remove();
        return { partial, painted, clicked, execution };
    });
    assert(serialProbe.partial && serialProbe.painted && serialProbe.clicked,
        `Serieller Sweep zeigt Zwischenfortschritt und verarbeitet Paint und Klick: ${JSON.stringify({ partial: serialProbe.partial, painted: serialProbe.painted, clicked: serialProbe.clicked })}`);
    assert(serialProbe.execution === workerReference.execution,
        'Worker und serieller Sweep liefern identische Resultate, Seeds und Provenienz');
    await page.locator('#sweepLiquidityRunwayYears').fill('3');
    await page.locator('#sweepRuns').fill('2');
    await page.locator('#sweepMetric').selectOption('p10EndWealth');
    assert((await page.locator('#sweepHeatmap').textContent()).includes('k €'),
        'Metrikwechsel rendert vorhandene Ergebnisse erneut');
    await page.locator('#sweepAxisX').selectOption('goldTargetPct');
    assert(await page.locator('#sweepHeatmap svg rect[stroke]').count() > 0,
        'Achsenwechsel rendert vorhandene Ergebnisse erneut');
    await page.evaluate(() => {
        document.getElementById('dynamicFlex').checked = true;
        document.getElementById('dynamicFlex').dispatchEvent(new Event('change', { bubbles: true }));
        document.getElementById('goGoActive').checked = true;
        document.getElementById('goGoActive').dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.locator('#sweepMetric').selectOption('successProbFloor');
    await page.locator('#sweepAxisX').selectOption('liquidityRunwayYears');
    await page.locator('#sweepButton').click();
    await page.waitForFunction(
        () => window.sweepExecution?.schemaVersion === 'SweepExecutionV2'
            && window.sweepExecution?.results?.[0]?.params?.goGoMultiplier === 1.1,
        null,
        { timeout: 30000 }
    );
    const execution = await page.evaluate(() => ({
        schemaVersion: window.sweepExecution?.schemaVersion,
        requestVersion: window.sweepExecution?.request?.schemaVersion,
        resultCount: window.sweepExecution?.results?.length,
        metricVersion: window.sweepExecution?.results?.[0]?.metrics?.schemaVersion,
        invalidCombination: window.sweepExecution?.results?.[0]?.metrics?.invalidCombination,
        parameterKeys: Object.keys(window.sweepExecution?.results?.[0]?.params || {}).sort(),
        maxBearRefillPct: window.sweepExecution?.results?.[0]?.params?.maxBearRefillPct,
        heatmapText: document.getElementById('sweepHeatmap')?.textContent || ''
    }));
    assert(
        execution.schemaVersion === 'SweepExecutionV2'
        && execution.requestVersion === 'SweepRequestV1'
        && execution.metricVersion === 'SweepMetricsV4',
        'Browser sweep must expose versioned execution provenance'
    );
    assert(execution.resultCount === 1,
        'Browser Sweep single-value matrix must execute exactly one combination');
    assert(execution.invalidCombination !== true,
        `Browser Sweep integration combination must be valid: ${JSON.stringify(execution)}`);
    assert(JSON.stringify(execution.parameterKeys) === JSON.stringify([
        'goGoMultiplier',
        'goldRebalancingBand',
        'goldTargetPct',
        'liquidityRunwayYears',
        'maxBearRefillPct',
        'maxSkimPct',
        'survivalQuantile'
    ]), 'Browser Sweep result must expose every interactive parameter and no unsupported direct-horizon field');
    assert(execution.maxBearRefillPct === 5,
        'Browser Sweep must preserve the visible Bear-Refill assumption instead of forcing zero');
    await page.locator('#sweepGoldRebalancingBand').fill('999');
    await page.locator('#sweepButton').click();
    await page.waitForFunction(() => window.sweepExecution?.results?.[0]?.metrics?.invalidCombination === true);
    const invalid = await page.evaluate(() => ({
        runs: window.sweepExecution.request.monteCarloParameters.anzahl,
        provenRuns: window.sweepExecution.results[0].provenance.normalizedParameters.anzahl,
        provenMethod: window.sweepExecution.results[0].provenance.requestedSamplingMethod
    }));
    assert(invalid.runs === 2 && invalid.provenRuns === 2 && invalid.provenMethod,
        'Ungueltige Kombination behaelt die validierte Laufzahl und Methode in der Provenienz');
    await setMcDuration('40');
    await page.locator('#sweepRuns').fill('125000');
    assert((await workload.textContent()).includes('125.000 Läufe × 40 Jahre = 5.000.000 nominelle Laufjahre'),
        'Der Schwellwert wird aus validierten Faktoren im deutschen Zahlenformat angezeigt');
    await page.evaluate(() => {
        window.__sweepConfirmations = [];
        window.confirm = message => {
            window.__sweepConfirmations.push(String(message));
            return false;
        };
    });
    await page.locator('#sweepButton').click();
    await page.waitForFunction(() => window.sweepExecution?.request?.monteCarloParameters?.anzahl === 125000,
        null, { timeout: 30000 });
    await page.locator('#sweep-progress-bar-container').waitFor({ state: 'hidden' });
    assert((await page.evaluate(() => window.__sweepConfirmations)).length === 0,
        'Genau 5.000.000 nominelle Laufjahre brauchen keine Bestaetigung');
    await page.locator('#sweepRuns').fill('125001');
    await page.evaluate(() => {
        window.__sweepExecutionBeforeRefusal = window.sweepExecution;
        window.__sweepResultsBeforeRefusal = window.sweepResults;
        window.__sweepHeatmapBeforeRefusal = document.getElementById('sweepHeatmap').innerHTML;
        window.__sweepWorkerCount = 0;
        const NativeWorker = window.Worker;
        window.Worker = class extends NativeWorker {
            constructor(...args) {
                window.__sweepWorkerCount++;
                super(...args);
            }
        };
    });
    await page.locator('#sweepButton').click();
    const refusal = await page.evaluate(() => ({
        confirmations: window.__sweepConfirmations,
        sameExecution: window.sweepExecution === window.__sweepExecutionBeforeRefusal,
        sameResults: window.sweepResults === window.__sweepResultsBeforeRefusal,
        sameHeatmap: document.getElementById('sweepHeatmap').innerHTML === window.__sweepHeatmapBeforeRefusal,
        workerCount: window.__sweepWorkerCount,
        progressVisible: document.getElementById('sweep-progress-bar-container').style.display !== 'none'
    }));
    assert(refusal.confirmations.length === 1
        && refusal.confirmations[0].includes('5.000.040 nominelle Laufjahre')
        && refusal.confirmations[0].includes('nicht zuverlässig vorhersagbar'),
    'Ueber dem Schwellwert nennt die Rueckfrage den konkreten Aufwand und unsichere Dauer');
    assert(refusal.sameExecution && refusal.sameResults && refusal.sameHeatmap && refusal.workerCount === 0
        && !refusal.progressVisible,
    'Ablehnung behaelt das vorherige Ergebnis und startet weder Worker noch Fortschritt');
    await page.locator('#sweepRuns').fill('');
    await page.evaluate(async () => {
        const { flush } = await import('./app/shared/persistence-facade.js');
        await flush();
    });
    await page.reload();
    await page.locator('.tab-btn[data-tab="sweep"]').click();
    await page.waitForFunction(() => document.getElementById('sweepRuns')?.value === '');
    await page.locator('#sweepButton').click();
    assert((await page.evaluate(() => window.__browserSmokeAlerts || []))
        .some(message => message.includes('Sweep-Simulationen je Kombination')),
    'Leere gespeicherte Laufzahl verhindert den Sweep mit verstaendlicher Meldung');
    assert(await page.evaluate(() => window.sweepExecution === undefined),
        'Fehleingabe startet keinen Sweep');
    await page.evaluate(async () => {
        const { persistenceStorage, flush } = await import('./app/shared/persistence-facade.js');
        persistenceStorage.setItem('sim.sweep.runs', 'ungueltig');
        await flush();
    });
    await page.reload();
    await page.locator('.tab-btn[data-tab="sweep"]').click();
    await page.locator('#sweepButton').click();
    assert((await page.evaluate(() => window.__browserSmokeAlerts || []))
        .some(message => message.includes('Sweep-Simulationen je Kombination')),
    'Ungueltiger gespeicherter Wert wird nicht auf 500 korrigiert');
    smoke.assertNoErrors(['Parameter-Sweep Fehler:', '[SWEEP] Worker execution failed, falling back to serial.']);
    await smoke.close();
}

async function runSimulatorOptimizerApplyIntegration(browser, baseUrl) {
    const smoke = await openSmokePage(browser, baseUrl, 'Simulator.html');
    const { page } = smoke;
    const tabLayout = await page.evaluate(() => ({
        labels: [...document.querySelectorAll('.tab-buttons .tab-btn')].map(button => button.textContent.trim()),
        optimizePanel: document.getElementById('ao_run_btn')?.closest('.tab-panel')?.id,
        sweepPanel: document.getElementById('sweepButton')?.closest('.tab-panel')?.id
    }));
    assert(JSON.stringify(tabLayout.labels) === JSON.stringify([
        'Rahmendaten', 'Monte-Carlo', 'Backtesting', 'Parameter-Sweep', 'Auto-Optimize'
    ]), 'Simulator tabs must include Auto-Optimize directly after Parameter-Sweep');
    assert(tabLayout.optimizePanel === 'tab-auto-optimize' && tabLayout.sweepPanel === 'tab-sweep',
        'Optimizer and sweep controls must belong to separate tab panels');
    await page.locator('.tab-btn[data-tab="auto-optimize"]').click();
    await page.locator('#ao_run_btn').waitFor({ state: 'visible' });
    assert(await page.locator('#tab-auto-optimize.active').count() === 1
        && await page.locator('#tab-sweep.active').count() === 0,
    'Auto-Optimize tab must activate its own panel');
    await page.locator('#ao_parameters_container .ao-parameter-block').first().waitFor({
        state: 'visible',
        timeout: 10000
    });
    const evaluation = await page.evaluate(async () => {
        const [{ runAutoOptimize }, { renderAutoOptimizeResult }] = await Promise.all([
            import('./app/simulator/auto_optimize.js'),
            import('./app/simulator/auto-optimize-renderer.js')
        ]);
        const evaluateCandidateFn = async candidate => ({
            metricContract: { schemaVersion: 'AutoOptimizeMetricResultV1' },
            medianEndWealth: 1000000 - Math.pow(Number(candidate.liquidityRunwayYears) - 5, 2),
            successProbFloor: 1,
            depletionRate: 0,
            worst5Drawdown: 0.2,
            timeShareWRgt45: 0,
            medianWithdrawalRate: 0.03
        });
        const objective = { metric: 'EndWealth_P50', direction: 'max', quantile: 50 };
        const result = await runAutoOptimize({
            objective,
            params: { liquidityRunwayYears: { min: 5, max: 5, step: 0.5 } },
            runsPerCandidate: 2,
            seedsTrain: 1,
            seedsTest: 1,
            constraints: { sr99: false, noex: false, ts45: false, dd55: false },
            maxDauer: 2,
            safetyGuards: false,
            evaluateCandidateFn
        });
        window.aoChampionResult = result;
        const resultEl = document.getElementById('ao_result');
        renderAutoOptimizeResult({ resultEl, result, objective });
        const applyButton = document.getElementById('ao_apply_btn');
        applyButton.style.display = 'inline-block';
        return {
            parameterFingerprint: result.parameterFidelity.parameterFingerprint,
            requestFingerprint: result.parameterFidelity.requestFingerprint,
            modelMode: result.modelStatus.evaluationMode,
            liquidityRunwayYears: result.championCfg.liquidityRunwayYears
        };
    });
    assert(evaluation.modelMode === 'custom_evaluator',
        'Browser optimizer fixture must not claim built-in MC validation for its synthetic evaluator');
    await page.locator('#ao_apply_btn').click();
    const applied = await page.evaluate(async () => {
        const {
            createAutoOptimizeParameterFingerprint,
            createAutoOptimizeRequestFingerprint
        } = await import('./app/simulator/auto-optimize-param-meta.js');
        const candidate = { liquidityRunwayYears: Number(document.getElementById('liquidityRunwayYears').value) };
        return {
            parameterFingerprint: createAutoOptimizeParameterFingerprint(candidate),
            requestFingerprint: createAutoOptimizeRequestFingerprint(candidate),
            liquidityRunwayYears: candidate.liquidityRunwayYears,
            resultText: document.getElementById('ao_result')?.textContent || ''
        };
    });
    assert(
        applied.parameterFingerprint === evaluation.parameterFingerprint
        && applied.requestFingerprint === evaluation.requestFingerprint,
        'Browser optimizer apply must preserve the evaluated canonical fingerprint'
    );
    assert(applied.liquidityRunwayYears === evaluation.liquidityRunwayYears,
        'Browser optimizer apply must write the evaluated canonical runway');
    assert(applied.resultText.includes('Experimenteller Szenariokandidat')
        && applied.resultText.includes('keine Finanzempfehlung'),
    'Browser optimizer result and apply confirmation must preserve the model-status boundary');
    smoke.assertNoErrors();
    await smoke.close();
}

async function runManualSmoke(browser, baseUrl) {
    const smoke = await openSmokePage(browser, baseUrl, 'Handbuch.html');
    const { page } = smoke;
    await page.locator('h1').filter({ hasText: 'Benutzerhandbuch' }).waitFor({ state: 'visible' });
    const tab = page.locator('.tab-btn').nth(1);
    await tab.click();
    await page.waitForTimeout(150);
    const activeTabCount = await page.locator('.tab-btn.active').count();
    assert(activeTabCount === 1, 'Handbuch tab navigation should leave exactly one active tab');
    smoke.assertNoErrors();
    await smoke.close();
}

async function main() {
    const { chromium } = await import('playwright');
    const { server, baseUrl } = await startStaticServer();
    let browser;
    try {
        browser = await chromium.launch();
        const smokes = [
            ['index.html', runIndexSmoke],
            ['full backup recovery', runFullBackupRecoverySmoke],
            ['Balance.html', runBalanceSmoke],
            ['Balance membership reload', runBalanceMembershipReload],
            ['Balance wealth history', runBalanceWealthHistory],
            ['Balance expenses history', runBalanceExpensesHistory],
            ['Balance automatic expenses capture', runBalanceExpensesWealthCapture],
            ['Balance shared tranche ids', runBalanceSharedTrancheIds],
            ['Balance engine gate', runBalanceEngineGate],
            ['Balance annual preflight', runBalanceAnnualPreflight],
            ['Balance preview lifecycle', runBalancePreviewLifecycle],
            ['Balance 3-Bucket bear', runBalanceThreeBucketBear],
            ['Balance five-year runway forced sale', runBalanceFiveYearRunwayForcedSale],
            ['Balance corrupt expenses', runBalanceCorruptExpenses],
            ['Simulator.html', runSimulatorSmoke],
            ['Simulator household needs reload', runSimulatorHouseholdNeedsReload],
            ['Simulator Monte-Carlo E2E', runMonteCarloBrowserRegression],
            ['Simulator hybrid profile blocker', runSimulatorHybridProfileBlocker],
            ['Simulator Sweep integration', runSimulatorSweepIntegration],
            ['Simulator optimizer apply integration', runSimulatorOptimizerApplyIntegration],
            ['depot-tranchen-manager.html', runTranchesSmoke],
            ['tranche quote partial/offline', runTranchesQuoteFailureSmoke],
            ['tranche corrupt recovery', runTranchesRecoverySmoke],
            ['profile registry recovery', runProfileRegistryRecoverySmoke],
            ['Balance corrupt profile health', runBalanceCorruptProfileHealthSmoke],
            ['Simulator corrupt profile balance', runSimulatorCorruptProfileBalanceSmoke],
            ['Balance ghost profile context', runBalanceGhostProfileContextSmoke],
            ['Simulator ghost profile context', runSimulatorGhostProfileContextSmoke],
            ['Handbuch.html', runManualSmoke],
            ['Balance import reject', runBalanceImportReject],
            ['Balance message presentation', runBalanceMessagePresentation],
            ['Balance folder abort', runBalanceFolderAbort],
            ['Balance import restoration', runBalanceImportRestoration],
            ['Balance CSV import roundtrip', runBalanceCsvImportRoundtrip],
            ['Balance annual commit', runBalanceAnnualCommit]
        ];

        const only = process.argv.find(argument => argument.startsWith('--only='))?.slice('--only='.length);
        if (only && !smokes.some(([label]) => label === only)) {
            throw new Error(`Unbekannter Browser-Smoke: ${only}`);
        }
        for (const [label, smoke] of smokes.filter(([label]) => !only || label === only)) {
            console.log(`Running browser smoke: ${label}`);
            await smoke(browser, baseUrl);
            console.log(`Browser smoke passed: ${label}`);
        }
    } finally {
        if (browser) await browser.close();
        await stopStaticServer(server);
    }
}

if (isMain) {
    main().catch(error => {
        console.error('Browser smoke failed:');
        console.error(error);
        process.exit(1);
    });
}
