import fs from 'node:fs';
import { validateMonteCarloExportV1 } from '../app/simulator/monte-carlo-export.js';

const EXTERNAL_HOSTS = new Set([
    'fonts.googleapis.com',
    'fonts.gstatic.com'
]);

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

async function createMonteCarloPage(browser, baseUrl, { workerMode = 'pass' } = {}) {
    const context = await browser.newContext({
        viewport: { width: 1366, height: 900 },
        locale: 'de-DE',
        acceptDownloads: true
    });
    await context.addInitScript(({ mode }) => {
        window.alert = () => {};
        window.confirm = () => true;
        window.prompt = () => '';
        window.__mcE2eProbe = {
            mode,
            constructed: 0,
            terminated: 0,
            heldResult: false,
            staleDeliveryAttempts: 0,
            delayedGeneration: null
        };

        if (mode === 'throw') {
            window.Worker = class ThrowingMonteCarloWorker {
                constructor() {
                    window.__mcE2eProbe.constructed += 1;
                    throw new Error('S11 controlled worker bootstrap failure');
                }
            };
            return;
        }

        const NativeWorker = window.Worker;
        window.Worker = class InstrumentedMonteCarloWorker {
            constructor(url, options) {
                const probe = window.__mcE2eProbe;
                probe.constructed += 1;
                this.inner = new NativeWorker(url, options);
                this._onmessage = null;
                this._lastMessageHandler = null;
                this._onerror = null;
                this._heldMessage = null;
                this.inner.onmessage = event => {
                    const message = event.data;
                    const shouldHold = mode === 'delay-first-result'
                        && message?.type === 'result'
                        && message?.generationId === probe.delayedGeneration
                        && probe.heldResult === false;
                    if (shouldHold) {
                        probe.heldResult = true;
                        this._heldMessage = message;
                        return;
                    }
                    this._onmessage?.(event);
                };
                this.inner.onerror = event => this._onerror?.(event);
            }

            set onmessage(handler) {
                this._onmessage = handler;
                if (typeof handler === 'function') this._lastMessageHandler = handler;
            }

            get onmessage() {
                return this._onmessage;
            }

            set onerror(handler) {
                this._onerror = handler;
            }

            get onerror() {
                return this._onerror;
            }

            postMessage(message, transferables) {
                const probe = window.__mcE2eProbe;
                if (mode === 'delay-first-result'
                    && message?.type === 'job'
                    && probe.delayedGeneration === null) {
                    probe.delayedGeneration = message.generationId;
                }
                this.inner.postMessage(message, transferables);
            }

            terminate() {
                const probe = window.__mcE2eProbe;
                probe.terminated += 1;
                const staleHandler = this._lastMessageHandler;
                const staleMessage = this._heldMessage;
                this.inner.terminate();
                if (staleMessage && typeof staleHandler === 'function') {
                    queueMicrotask(() => {
                        probe.staleDeliveryAttempts += 1;
                        staleHandler({ data: staleMessage });
                    });
                }
            }
        };
    }, { mode: workerMode });

    await context.route('**/*', async route => {
        const url = new URL(route.request().url());
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
        if (message.type() === 'error') errors.push(`[console.error] ${message.text()}`);
    });
    page.on('pageerror', error => errors.push(`[pageerror] ${error.message}`));
    await page.goto(`${baseUrl}/Simulator.html`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
    });
    await page.waitForLoadState('load', { timeout: 15000 });
    await page.locator('h1').filter({ hasText: 'Ruhestand-Simulator' }).waitFor({ state: 'visible' });

    return {
        context,
        page,
        errors,
        assertNoUnexpectedErrors(allowed = []) {
            const unexpected = errors.filter(error => !allowed.some(fragment => error.includes(fragment)));
            assert(unexpected.length === 0, `Monte-Carlo browser case emitted errors:\n${unexpected.join('\n')}`);
        }
    };
}

async function configureMonteCarloRun(page, {
    runs = 8,
    duration = 3,
    workers = 2,
    seed = 424242
} = {}) {
    await page.locator('.tab-btn[data-tab="montecarlo"]').click();
    await page.locator('#tab-montecarlo').waitFor({ state: 'visible' });
    await page.evaluate(({ runs, duration, workers, seed }) => {
        const values = {
            simStartVermoegen: '520000',
            depotwertGesamt: '500000',
            depotwertAlt: '500000',
            einstandAlt: '400000',
            tagesgeld: '20000',
            geldmarktEtf: '0',
            startFloorBedarf: '24000',
            startFlexBedarf: '6000',
            minimumFlexAnnual: '0',
            mcAnzahl: String(runs),
            mcDauer: String(duration),
            mcBlockSize: '1',
            mcSeed: String(seed),
            mcMethode: 'regime_iid',
            rngMode: 'per-run-seed',
            mcWorkerCount: String(workers),
            mcWorkerBudget: '50'
        };
        for (const [id, value] of Object.entries(values)) {
            const element = document.getElementById(id);
            if (!element) continue;
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const compare = document.getElementById('mcCompareMode');
        if (compare) compare.checked = false;
        const cape = document.getElementById('useCapeSampling');
        if (cape) cape.checked = false;
        const care = document.getElementById('pflegefallLogikAktivieren');
        if (care) care.checked = false;
    }, { runs, duration, workers, seed });
}

async function startMonteCarloWithKeyboard(page) {
    const button = page.locator('#mcButton');
    await button.focus();
    assert(await page.evaluate(() => document.activeElement?.id) === 'mcButton', 'keyboard start begins on the visible MC button');
    await page.keyboard.press('Enter');
}

async function waitForCompletedRun(page) {
    await page.locator('#mcRunStatus').filter({ hasText: 'abgeschlossen' }).waitFor({
        state: 'visible',
        timeout: 45000
    });
    await page.locator('#monteCarloResults').waitFor({ state: 'visible', timeout: 45000 });
    await page.locator('#mcButton').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.getElementById('mcButton')?.disabled === false);
}

async function downloadRunExport(page) {
    const button = page.locator('#exportMonteCarloRunJson');
    await button.waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.getElementById('exportMonteCarloRunJson')?.disabled === false);
    await button.focus();
    const downloadPromise = page.waitForEvent('download');
    await page.keyboard.press('Enter');
    const download = await downloadPromise;
    const downloadPath = await download.path();
    assert(downloadPath, 'MC browser export exposes a readable temporary file');
    const document = JSON.parse(fs.readFileSync(downloadPath, 'utf8'));
    validateMonteCarloExportV1(document);
    const serialized = JSON.stringify(document);
    for (const removedAlias of [
        'kpiKuerzungsjahre',
        'consumptionAtRiskP10Real'
    ]) {
        assert(!serialized.includes(removedAlias), `new V1 browser export omits removed alias ${removedAlias}`);
    }
    return document;
}

async function runWorkerSuccessCase(browser, baseUrl) {
    const test = await createMonteCarloPage(browser, baseUrl);
    try {
        const { page } = test;
        await configureMonteCarloRun(page, { runs: 8, duration: 3, workers: 2 });
        assert(await page.locator('#mc-progress-bar-container').getAttribute('role') === 'progressbar', 'browser progress exposes progressbar semantics');
        assert(await page.locator('#mc-error-container').getAttribute('role') === 'alert', 'browser errors expose alert semantics');
        assert(await page.locator('#mcRunStatus').getAttribute('aria-live') === 'polite', 'run status is announced politely');
        assert(await page.locator('#monteCarloResults').getAttribute('tabindex') === '-1', 'result region is programmatically focusable');

        await startMonteCarloWithKeyboard(page);
        await page.locator('#mcCancelButton').waitFor({ state: 'visible' });
        assert(await page.locator('#mcButton').getAttribute('aria-busy') === 'true', 'running button exposes busy state');
        await waitForCompletedRun(page);

        const visibleResult = await page.locator('#monteCarloResults').textContent();
        for (const label of [
            'Floor-Deckung im gewählten Horizont',
            'Terminale Outcomes',
            'Anteil Kürzungsjahre (≥ 10 %)',
            'Reale Depotentnahme P10'
        ]) {
            assert(visibleResult.includes(label), `completed browser result shows ${label}`);
        }
        assert(visibleResult.includes('95%-KI'), 'completed browser result shows estimator uncertainty');
        assert(await page.evaluate(() => document.activeElement?.id) === 'monteCarloResults', 'completed run focuses the result region');

        const exported = await downloadRunExport(page);
        assert(exported.request.execution.mode === 'worker', 'successful browser run records worker execution');
        assert(exported.request.execution.workerCount === 2, 'successful browser run records requested worker count');
        assert(exported.request.execution.chunkConfiguration.strategy === 'adaptive-time-budget-v1', 'worker export records adaptive chunk strategy');
        assert(exported.result.diagnostics.sampling.schemaVersion === 'MonteCarloSamplingDiagnosticsV1', 'export contains versioned sampling diagnostics');
        const inventory = exported.result.outcomeInventory;
        assert(inventory.ruin + inventory.all_dead + inventory.horizon_exhausted + inventory.technical_error === 8, 'browser outcome inventory accounts for every requested run');
        assert(exported.result.uncertainty.floorCoverage?.confidenceInterval95, 'browser export contains floor-coverage uncertainty');
        test.assertNoUnexpectedErrors();
    } finally {
        await test.context.close();
    }
}

async function runForcedFallbackCase(browser, baseUrl) {
    const test = await createMonteCarloPage(browser, baseUrl, { workerMode: 'throw' });
    try {
        const { page } = test;
        await configureMonteCarloRun(page, { runs: 5, duration: 2, workers: 2, seed: 515151 });
        await page.locator('#mcButton').click();
        await waitForCompletedRun(page);
        const exported = await downloadRunExport(page);
        const probe = await page.evaluate(() => window.__mcE2eProbe);
        assert(probe.constructed === 1, 'controlled fallback attempts worker bootstrap exactly once');
        assert(exported.request.execution.mode === 'serial', 'controlled worker failure records the serial fallback path');
        assert(exported.request.execution.workerCount === 0, 'serial fallback export records no active workers');
        test.assertNoUnexpectedErrors(['S11 controlled worker bootstrap failure']);
    } finally {
        await test.context.close();
    }
}

async function runTechnicalErrorCase(browser, baseUrl) {
    const test = await createMonteCarloPage(browser, baseUrl, { workerMode: 'throw' });
    try {
        const { page } = test;
        await configureMonteCarloRun(page, { runs: 3, duration: 2, workers: 1, seed: 616161 });
        await page.evaluate(() => {
            window.EngineAPI = {};
        });
        await page.locator('#mcButton').click();
        await page.locator('#mc-error-container').waitFor({ state: 'visible', timeout: 45000 });
        await page.waitForFunction(() => document.getElementById('mcButton')?.disabled === false);
        const errorText = await page.locator('#mc-error-message').textContent();
        assert(errorText.includes('ENGINE_METHOD_UNAVAILABLE'), 'technical browser path exposes the stable engine error code');
        assert(errorText.includes('Terminale Outcomes:'), 'technical browser path preserves the outcome inventory');
        assert(await page.evaluate(() => document.activeElement?.id) === 'mc-error-container', 'technical run focuses the alert region');
        const exported = await downloadRunExport(page);
        assert(exported.result.batchStatus === 'technical_error', 'technical browser export is fail-closed');
        assert(exported.result.outcomeInventory.technical_error === 3, 'technical browser export accounts for every failed path');
        assert(exported.result.outcomeInventory.floorCoveragePct === null, 'technical browser export suppresses floor coverage');
        test.assertNoUnexpectedErrors(['S11 controlled worker bootstrap failure']);
    } finally {
        await test.context.close();
    }
}

async function runCancelRestartCase(browser, baseUrl) {
    const test = await createMonteCarloPage(browser, baseUrl, { workerMode: 'delay-first-result' });
    try {
        const { page } = test;
        await configureMonteCarloRun(page, { runs: 40, duration: 3, workers: 1, seed: 717171 });
        await page.locator('#mcButton').click();
        await page.waitForFunction(() => window.__mcE2eProbe?.heldResult === true, null, { timeout: 45000 });

        const cancelButton = page.locator('#mcCancelButton');
        await cancelButton.focus();
        await page.keyboard.press('Enter');
        await page.locator('#mcRunStatus').filter({ hasText: 'abgebrochen' }).waitFor({ state: 'visible', timeout: 45000 });
        await page.waitForFunction(() => document.getElementById('mcButton')?.disabled === false);
        assert(await page.evaluate(() => document.activeElement?.id) === 'mcButton', 'cancel returns focus to the start control');
        await page.waitForFunction(() => window.__mcE2eProbe?.staleDeliveryAttempts === 1);

        await startMonteCarloWithKeyboard(page);
        await waitForCompletedRun(page);
        const exported = await downloadRunExport(page);
        const probe = await page.evaluate(() => window.__mcE2eProbe);
        assert(probe.constructed === 2, 'cancel plus explicit restart creates exactly one lazy replacement worker');
        assert(probe.terminated === 1, 'user cancel terminates only the active old-generation worker');
        assert(probe.staleDeliveryAttempts === 1, 'fixture delivers one late old-generation result');
        assert(exported.request.execution.mode === 'worker', 'restart completes through the replacement worker');
        assert(exported.request.parameters.seed === 717171, 'late old result cannot replace the restarted request');
        assert(exported.result.batchStatus === 'completed', 'restart remains completed after the stale delivery attempt');
        test.assertNoUnexpectedErrors();
    } finally {
        await test.context.close();
    }
}

export async function runMonteCarloBrowserRegression(browser, baseUrl) {
    await runWorkerSuccessCase(browser, baseUrl);
    await runForcedFallbackCase(browser, baseUrl);
    await runTechnicalErrorCase(browser, baseUrl);
    await runCancelRestartCase(browser, baseUrl);
}
