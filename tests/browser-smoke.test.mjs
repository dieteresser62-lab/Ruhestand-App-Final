import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMonteCarloBrowserRegression } from './simulator-monte-carlo-browser.mjs';
import { SNAPSHOT_KINDS } from '../app/shared/snapshot-archive.js';

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
        locale: 'de-DE'
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
            const target = document.getElementById('error-container');
            if (!target) return;
            new MutationObserver(() => {
                if (target.textContent) window.__browserSmokeMessages.push(target.textContent);
            }).observe(target, { childList: true, subtree: true, characterData: true });
        });
    }, options.storage || {});
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
            await route.fulfill({ json: { chart: { result: [{
                timestamp: [Math.floor(Date.UTC(2025, 11, 30) / 1000)],
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
                indicator: { id: 'FP.CPI.TOTL.ZG' }, countryiso3code: 'DEU', date: '2025', value: 2
            }]] });
            return;
        }
        if (options.annualFixtures && url.hostname === 'r.jina.ai') {
            await route.fulfill({ contentType: 'text/plain', body: '2026.07 100 25.5' });
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
    await smoke.page.locator('#error-container').filter({ hasText: 'muss fuer den Abschluss auf 2025 stehen' }).waitFor();
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

async function runBalanceAnnualCommit(browser, baseUrl) {
    const smoke = await openSmokePage(browser, baseUrl, 'Balance.html', {
        storage: createBalanceStorage(2025), annualFixtures: true
    });
    await smoke.page.locator('#profilverbund-profile-list input').waitFor({ state: 'visible' });
    await smoke.page.locator('#aktuellesAlter').waitFor({ state: 'attached' });
    await smoke.page.waitForTimeout(750);
    const closeButton = smoke.page.locator('#jahresabschlussBtn');
    await closeButton.click({ force: true });
    await closeButton.click({ force: true });
    try {
        await smoke.page.waitForFunction(() => document.getElementById('expensesYearSelect')?.value === '2026');
    } catch (error) {
        const details = await smoke.page.evaluate(() => ({
            age: document.getElementById('aktuellesAlter')?.value,
            year: document.getElementById('expensesYearSelect')?.value,
            error: document.getElementById('error-container')?.textContent,
            messages: window.__browserSmokeMessages
        }));
        const stateRow = await readIndexedDb(smoke.page, 'kv', BALANCE_STATE_KEY);
        details.metadata = JSON.parse(stateRow.value).annualPeriodMetadata;
        details.snapshots = await readIndexedDb(smoke.page, 'snapshots', null);
        throw new Error(`Jahresabschluss erreichte den Commit nicht: ${JSON.stringify(details)}`, { cause: error });
    }
    const committedAge = await smoke.page.locator('#aktuellesAlter').inputValue();
    assert(committedAge === '68', `Erfolgreicher Commit muss das Alter genau einmal erhoehen (Ist: ${committedAge})`);
    const messages = await smoke.page.evaluate(() => window.__browserSmokeMessages);
    assert(messages.some(message => message.includes('laeuft bereits')), 'Doppelklick muss als in-flight erkannt werden');
    const row = await readIndexedDb(smoke.page, 'kv', BALANCE_STATE_KEY);
    const state = JSON.parse(row.value);
    assert(state.annualPeriodMetadata.lastCommittedPeriod === 'calendar-year:2025', 'Commit muss stabile Perioden-ID speichern');
    assert(
        state.balanceStateLifecycle?.lastCommittedPeriod === 'calendar-year:2025',
        'Fachlicher State-Commit muss dieselbe stabile Perioden-ID speichern'
    );
    assert(await readIndexedDb(smoke.page, 'snapshots', null) === 1, 'Doppelklick darf nur einen Recovery-Snapshot erzeugen');
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
    await smoke.page.waitForTimeout(1000);
    const messages = await smoke.page.evaluate(() => window.__browserSmokeMessages);
    const diagnostics = await smoke.page.evaluate(() => ({
        files: Array.from(document.getElementById('importFile')?.files || []).map(file => file.name),
        error: document.getElementById('error-container')?.textContent
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
    await page.locator('#csvFileInput').setInputFiles({
        name: csvSourceFileName,
        mimeType: 'text/csv',
        buffer: Buffer.from(csv, 'utf8')
    });
    const csvImportStatus = page.locator('#error-container')
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
            tabWidths: tabs.map(tab => tab.getBoundingClientRect().width)
        };
    });
    assert(tabStripLayout.tabWidths.length === 4,
        `Simulator muss vier Haupttabs anzeigen: ${JSON.stringify(tabStripLayout)}`);
    assert(tabStripLayout.tabWidths.every(width => width < tabStripLayout.clientWidth),
        `Kein einzelner Haupttab darf die gesamte Stripleiste belegen: ${JSON.stringify(tabStripLayout)}`);
    assert(tabStripLayout.scrollWidth <= tabStripLayout.clientWidth + 1,
        `Alle vier Haupttabs muessen im Desktop-Viewport ohne horizontales Scrollen sichtbar sein: ${JSON.stringify(tabStripLayout)}`);
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
    await setupSummary.click();
    assert(!(await setupDisclosure.evaluate(details => details.open)), 'setup disclosure closes with the pointer');
    await setupSummary.press('Enter');
    assert(await setupDisclosure.evaluate(details => details.open), 'setup disclosure opens with Enter');
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
    assert(await page.locator('#mcViewPanelReplay #scenarioSelector').count() === 1,
        'the stable scenario selector container lives exactly once in replay');
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
    assert(await page.evaluate(() => document.activeElement?.id) === 'stressReplayStatus',
        'scenario-log backlink focuses the replay prerequisite without a scenario select');
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
    const retainedExpert = expertFields.locator('[data-stress-replay-path="strategy.liquidityRunwayYears"]');
    await retainedExpert.fill('7');
    await expertToggle.press('Space');
    assert(await expertFields.isHidden() && await expertToggle.getAttribute('aria-expanded') === 'false',
        'Space closes the native expert disclosure and synchronizes ARIA');
    await expertToggle.press('Enter');
    assert(await retainedExpert.inputValue() === '7', 'Closing and reopening preserves an entered expert value');
    assert(await page.locator('#stressReplayPatchPreview').innerHTML() === previewBeforeToggle,
        'Opening and closing alone does not change patch preview');
    assert(await page.locator('#stressReplayAddVariantButton').isDisabled() === addDisabledBeforeToggle,
        'Opening and closing alone does not change add-button materiality');
    assert(await page.locator('#stressReplayVariantEditor [data-active-when="decumulation:3_bucket_jilge"]').first().isHidden(),
        'Three-bucket-only controls start hidden when their strategy mode is inactive');
    const realNeedsError = await page.evaluate(async () => {
        const { createStressReplayController } = await import('./app/simulator/stress-replay-ui.js');
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
                    baselineSnapshot: {
                        startFloorBedarf: 24000,
                        startFlexBedarf: 12000,
                        minimumFlexAnnual: 0
                    },
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
    assert((await page.locator('#stressReplayWorkspace').textContent()).includes('Auf diesem fixierten Stresspfad'),
        'The browser workflow must explain the paired fixed-path interpretation');
    assert(!(await page.locator('#stressReplayWorkspace').textContent()).toLowerCase().includes('optimale strategie'),
        'The browser workflow must not present replay variants as a general optimum');
    assertEqual(await readIndexedDb(page, 'kv', 'sim.stressReplay.active.v1'), null,
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
    for (const width of [320, 768, 900, 1280, 1600]) {
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
        mcPanelDisplays: [...document.querySelectorAll('.mc-view-panel')]
            .map(panel => getComputedStyle(panel).display),
        comparisonPanelDisplays: [...document.querySelectorAll('[data-stress-replay-comparison-panel]')]
            .map(panel => getComputedStyle(panel).display),
        diagnosticsDisplay: getComputedStyle(document.querySelector('.stress-replay-diagnostics > dl')).display,
        mainNavigationDisplay: getComputedStyle(document.querySelector('.tab-buttons')).display,
        mcNavigationDisplay: getComputedStyle(document.querySelector('.mc-view-nav')).display,
        comparisonNavigationDisplay: getComputedStyle(document.querySelector('.stress-replay-comparison-tabs')).display,
        expertToggleDisplay: getComputedStyle(document.querySelector('.stress-replay-expert-toggle')).display,
        replayLinkDisplay: getComputedStyle(document.getElementById('mcShowReplayButton')).display,
        scenarioHeaderPosition: getComputedStyle(document.querySelector('[data-print-probe="sticky-header"] th')).position,
        scenarioLogOverflow: getComputedStyle(document.getElementById('scenarioLogOutput')).overflow,
        comparisonTableOverflow: getComputedStyle(document.querySelector('.stress-replay-table-scroll')).overflow
    }));
    assert(printedCockpitState.setupContentDisplay !== 'none',
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
        && printedCockpitState.expertToggleDisplay === 'none'
        && printedCockpitState.replayLinkDisplay === 'none',
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
        const workspace = {
            path: {},
            sourceIdentity: null,
            baselineSnapshot: {},
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
    const smoke = await openSmokePage(browser, baseUrl, 'index.html', { storage, quoteFixtures: true });
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

    const beforeEditRow = await readIndexedDb(page, 'kv', 'depot_tranchen');
    const beforeEditId = JSON.parse(beforeEditRow.value)[0].trancheId;
    await row.locator('[data-action="edit-tranche"]').click();
    await page.locator('#currentPrice').fill('95');
    await page.locator('#trancheForm button[type="submit"]').click();
    await page.locator('#tranchePersistenceStatus').filter({ hasText: 'aktualisiert' }).waitFor();
    const afterEditRow = await readIndexedDb(page, 'kv', 'depot_tranchen');
    const afterEditId = JSON.parse(afterEditRow.value)[0].trancheId;
    assert(afterEditId === beforeEditId, 'Editieren muss die Tranche-ID stabil halten');

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
    await page.locator('.tab-btn[data-tab="sweep"]').click();
    await page.locator('#sweepButton').waitFor({ state: 'visible' });
    await page.evaluate(() => {
        const setValue = (id, value) => {
            const element = document.getElementById(id);
            element.value = String(value);
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        };
        setValue('mcAnzahl', 2);
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
        document.getElementById('dynamicFlex').checked = true;
        document.getElementById('dynamicFlex').dispatchEvent(new Event('change', { bubbles: true }));
        document.getElementById('goGoActive').checked = true;
        document.getElementById('goGoActive').dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.locator('#sweepButton').click();
    await page.waitForFunction(
        () => window.sweepExecution?.schemaVersion === 'SweepExecutionV2',
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
    smoke.assertNoErrors();
    await smoke.close();
}

async function runSimulatorOptimizerApplyIntegration(browser, baseUrl) {
    const smoke = await openSmokePage(browser, baseUrl, 'Simulator.html');
    const { page } = smoke;
    await page.locator('.tab-btn[data-tab="sweep"]').click();
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
            ['Balance CSV import roundtrip', runBalanceCsvImportRoundtrip],
            ['Balance annual commit', runBalanceAnnualCommit]
        ];

        for (const [label, smoke] of smokes) {
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
