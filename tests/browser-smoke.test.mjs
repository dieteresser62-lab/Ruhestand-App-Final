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
        schemaVersion: 1,
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
                depot_tranchen: profile.tranchesRaw ?? '[]',
                profile_tagesgeld: profile.tagesgeld ?? '10000',
                profile_aktuelles_alter: profile.alter ?? '67',
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
    await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (options.engineMismatch && url.pathname === '/engine.js') {
            await route.fulfill({
                contentType: 'text/javascript',
                body: 'window.EngineAPI={getVersion(){return {api:"0.0",build:"e2e-mismatch"}}};'
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
    const storage = {
        ...createBalanceStorage(2025),
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
    await page.locator('#marketCsvMode').evaluate(element => {
        const details = element.closest('details');
        if (details) details.open = true;
    });
    await page.locator('#marketCsvMode').selectOption('current');
    await page.locator('#marketCsvTargetYear').fill('2025');
    await page.locator('#marketCsvExpectedAsOf').fill('2025-12-30');
    await page.locator('#marketCsvInstrument').fill('vwce.de');

    const csv = [
        'Datum;Schluss',
        '30.12.2022;100',
        '30.12.2023;110',
        '30.12.2024;120',
        '30.12.2025;130'
    ].join('\n');
    await page.locator('#csvFileInput').setInputFiles({
        name: 'markt-2025.csv',
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
    assert(meta?.periodId === 'calendar-year:2025', 'CSV-Provenienz muss die explizite Zielperiode persistieren');
    assert(meta?.asOf === '2025-12-30', 'CSV-Provenienz muss den bestätigten Stichtag persistieren');
    assert(meta?.instrument === 'VWCE.DE', 'CSV-Provenienz muss das normalisierte Instrument persistieren');
    assert(meta?.sourceFileName === 'markt-2025.csv', 'CSV-Provenienz muss die Quelldatei persistieren');
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
    assert(provenanceView.periodId === 'calendar-year:2025', 'Reload muss die persistierte CSV-Periode wieder anzeigen');
    assert(provenanceView.asOf === '2025-12-30', 'Reload muss den persistierten Stichtag wieder anzeigen');
    assert(provenanceView.instrument === 'VWCE.DE', 'Reload muss das persistierte Instrument wieder anzeigen');
    assert(provenanceView.highScope === 'windowHigh', 'Reload muss die eingeschränkte Hoch-Semantik wieder anzeigen');
    assert(provenanceView.engineReferenceApplied === 'false',
        'Reload muss den neutralen Anwendungsstatus der Engine-Referenz anzeigen');
    assert(provenanceView.text.includes('markt-2025.csv'), 'Reload muss die persistierte Quelle sichtbar anzeigen');
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
    assert(await mcRuns.inputValue() === '10000', 'new Simulator profile uses the 10,000-run Monte-Carlo default');
    await mcEstimate.filter({ hasText: 'Run-Jahre' }).waitFor({ state: 'visible' });
    assert((await mcEstimate.textContent()).includes('Speicherklasse'), 'Monte-Carlo resource estimate names its memory class');
    assert(await page.locator('#mc-progress-bar-container').getAttribute('role') === 'progressbar', 'Monte-Carlo progress is semantic in a real browser');
    assert(await page.locator('#mc-error-container').getAttribute('role') === 'alert', 'Monte-Carlo errors are not color-only in a real browser');

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

    const [csvDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('#exportBacktestCsv').click()
    ]);
    const rawCsvText = await readDownloadText(csvDownload);
    assert(rawCsvText.startsWith('simulation_year_calendar_year;outcome_code;'), 'Raw CSV must use the versioned technical header contract');
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
    await page.locator('#reconciliationConfirmBtn').click();
    await page.locator('#reconciliationStatus').filter({ hasText: 'dauerhaft bestätigt' }).waitFor();

    const reconciledRow = await readIndexedDb(page, 'kv', 'depot_tranchen');
    assert(JSON.parse(reconciledRow.value)[0].shares === 1,
        'Bestaetigte tatsaechliche Ausfuehrung muss den persistenten Stueckbestand reduzieren');
    const reconciledRegistryRow = await readIndexedDb(page, 'kv', 'rs_profiles_v1');
    const reconciledRegistry = JSON.parse(reconciledRegistryRow.value);
    assert(reconciledRegistry.trancheReconciliation.actions[0].actionId === 'browser-order-1',
        'Bestaetigung muss stabile Action-ID fuer Reload-Idempotenz speichern');

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
            ['Balance corrupt expenses', runBalanceCorruptExpenses],
            ['Simulator.html', runSimulatorSmoke],
            ['Simulator Monte-Carlo E2E', runMonteCarloBrowserRegression],
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
