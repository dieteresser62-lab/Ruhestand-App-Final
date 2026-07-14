import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

async function runIndexSmoke(browser, baseUrl) {
    const smoke = await openSmokePage(browser, baseUrl, 'index.html');
    const { page } = smoke;
    await page.locator('h1').filter({ hasText: 'Ruhestand-Apps Suite' }).waitFor({ state: 'visible' });
    await page.locator('a[href="Balance.html"]').waitFor({ state: 'visible' });
    await page.locator('a[href="Simulator.html"]').waitFor({ state: 'visible' });
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
        'Abgelehnter Import darf die persistenten Eingaben nicht veraendern'
    );
    assert(
        JSON.stringify(afterState.annualPeriodMetadata) === JSON.stringify(beforeState.annualPeriodMetadata),
        'Abgelehnter Import darf die Jahresperioden-Metadaten nicht veraendern'
    );
    assert(await readIndexedDb(smoke.page, 'snapshots', null) === 0, 'Abgelehnter Import darf keinen Recovery-Snapshot erzeugen');
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
    await page.locator('#startFloorBedarf').fill('24000');
    await page.locator('#startFlexBedarf').fill('12000');
    await page.locator('.tab-btn[data-tab="backtesting"]').click();
    await page.locator('#btButton').waitFor({ state: 'visible' });
    await page.locator('#btButton').click();
    await page.waitForTimeout(500);
    smoke.assertNoErrors();
    await smoke.close();
}

async function runTranchesSmoke(browser, baseUrl) {
    const smoke = await openSmokePage(browser, baseUrl, 'depot-tranchen-manager.html');
    const { page } = smoke;
    await page.locator('h1').filter({ hasText: 'Profil-Assets Manager' }).waitFor({ state: 'visible' });
    await page.locator('#tranchenTable').waitFor({ state: 'visible' });
    await page.locator('#addTrancheBtn').click();
    await page.locator('#trancheModal.active').waitFor({ state: 'visible' });
    await page.locator('#modalTitle').filter({ hasText: 'Neue Tranche' }).waitFor({ state: 'visible' });
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
            ['Balance.html', runBalanceSmoke],
            ['Balance membership reload', runBalanceMembershipReload],
            ['Balance engine gate', runBalanceEngineGate],
            ['Balance annual preflight', runBalanceAnnualPreflight],
            ['Balance corrupt expenses', runBalanceCorruptExpenses],
            ['Simulator.html', runSimulatorSmoke],
            ['depot-tranchen-manager.html', runTranchesSmoke],
            ['Handbuch.html', runManualSmoke],
            ['Balance import reject', runBalanceImportReject],
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
