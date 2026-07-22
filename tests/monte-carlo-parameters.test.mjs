import fs from 'node:fs';
import {
    MONTE_CARLO_PARAMETER_LIMITS,
    estimateMonteCarloResourcesV1,
    normalizeMonteCarloParametersV1,
    normalizeMonteCarloResourceConfigV1,
    resolveMonteCarloDurationMaximumV1,
    resolveMonteCarloWorkerCountV1
} from '../app/simulator/monte-carlo-parameters.js';
import { runMonteCarloSimulation } from '../app/simulator/monte-carlo-runner.js';
import {
    createMonteCarloUI,
    initMonteCarloResourceControls,
    readMonteCarloParameters
} from '../app/simulator/monte-carlo-ui.js';

console.log('--- MonteCarloParametersV1 Contract Tests ---');

function expectRejected(action, message) {
    let rejected = false;
    try {
        const result = action();
        if (result?.then) {
            return result.then(
                () => assert(false, message),
                error => {
                    assert(error instanceof Error, `${message}: rejection exposes an Error`);
                    return error;
                }
            );
        }
    } catch (error) {
        rejected = error instanceof Error;
    }
    assert(rejected, message);
    return null;
}

const validParameters = Object.freeze({
    anzahl: 10000,
    maxDauer: 35,
    blockSize: 5,
    seed: 12345,
    methode: 'regime_markov',
    rngMode: 'per-run-seed',
    startYearMode: 'UNIFORM',
    startYearFilter: 1970,
    startYearHalfLife: 20,
    excludeEstimatedHistory: false
});

{
    const defaults = normalizeMonteCarloParametersV1();
    assertEqual(defaults.anzahl, 10000, 'central MC fallback uses 10,000 runs');
    assertEqual(defaults.maxDauer, 35, 'central MC fallback retains 35 years');
    assert(Object.isFrozen(defaults), 'normalized MC parameters are immutable');

    const boundary = normalizeMonteCarloParametersV1({
        ...validParameters,
        anzahl: 1000000,
        seed: 4294967295
    }, { inputs: { startAlter: 76, partner: { aktiv: false } } });
    assertEqual(boundary.anzahl, 1000000, 'one million runs remains startable at the hard boundary');
    assertEqual(boundary.seed, 4294967295, 'uint32 seed maximum is accepted');
}

{
    const rejectFixtures = [
        ['decimal run count', { anzahl: '100.5' }],
        ['run count suffix', { anzahl: '100runs' }],
        ['NaN run count', { anzahl: Number.NaN }],
        ['infinite run count', { anzahl: Number.POSITIVE_INFINITY }],
        ['run count above hard maximum', { anzahl: 1000001 }],
        ['decimal duration', { maxDauer: '35.0' }],
        ['block length above configured maximum', { blockSize: 31 }],
        ['negative seed', { seed: -1 }],
        ['unsupported method', { methode: 'magic_bootstrap' }],
        ['unsupported RNG mode', { rngMode: 'random' }],
        ['unsupported start-year mode', { startYearMode: 'LATEST' }],
        ['string boolean', { excludeEstimatedHistory: 'false' }]
    ];
    for (const [name, override] of rejectFixtures) {
        expectRejected(
            () => normalizeMonteCarloParametersV1({ ...validParameters, ...override }),
            `central validator rejects ${name}`
        );
    }

    expectRejected(
        () => normalizeMonteCarloParametersV1({ ...validParameters, methode: 'block', blockSize: 4 }, {
            historicalRecordCount: 3
        }),
        'fixed block length cannot exceed the eligible historical record count'
    );
}

{
    assertEqual(
        resolveMonteCarloDurationMaximumV1({ startAlter: 65, partner: { aktiv: false } }),
        46,
        'single-person horizon includes mortality age 110 exactly once'
    );
    assertEqual(
        resolveMonteCarloDurationMaximumV1({
            startAlter: 65,
            partner: { aktiv: true, startAlter: 60 }
        }),
        51,
        'youngest household member determines the reviewed mortality horizon'
    );
    expectRejected(
        () => normalizeMonteCarloParametersV1({ ...validParameters, maxDauer: 47 }, {
            inputs: { startAlter: 65, partner: { aktiv: false } }
        }),
        'duration beyond the mortality-table contract is rejected instead of clamped'
    );
}

{
    const recommended = estimateMonteCarloResourcesV1({ ...validParameters, anzahl: 100000 });
    const warning = estimateMonteCarloResourcesV1({ ...validParameters, anzahl: 100001 });
    const stress = estimateMonteCarloResourcesV1({ ...validParameters, anzahl: 1000000 });
    assertEqual(recommended.requiresLargeRunConfirmation, false, '100,000 runs need no large-load confirmation');
    assertEqual(warning.requiresLargeRunConfirmation, true, '100,001 runs require explicit confirmation');
    assertEqual(stress.memoryClass, 'hoch', 'one-million-run estimate exposes a high memory class');
    assertEqual(stress.runYears, 35000000, 'stress estimate exposes exact run-years');
    assert(stress.estimatedWorkerResultMiB > 390, 'stress estimate uses measured full worker-result bytes per run');

    assertEqual(normalizeMonteCarloResourceConfigV1({ workerCount: '0', timeBudgetMs: '50' }).workerCount, 0, 'worker auto sentinel is valid');
    assertEqual(normalizeMonteCarloResourceConfigV1({ workerCount: '32', timeBudgetMs: '5000' }).timeBudgetMs, 5000, 'resource maxima are valid');
    assertEqual(
        resolveMonteCarloWorkerCountV1({ workerCount: 0, timeBudgetMs: 500 }, { hardwareConcurrency: 128 }),
        32,
        'automatic worker count respects the configured maximum'
    );
    for (const [name, config] of [
        ['decimal worker count', { workerCount: '2.5', timeBudgetMs: '500' }],
        ['worker suffix', { workerCount: '8x', timeBudgetMs: '500' }],
        ['worker maximum', { workerCount: '33', timeBudgetMs: '500' }],
        ['budget minimum', { workerCount: '8', timeBudgetMs: '49' }],
        ['budget maximum', { workerCount: '8', timeBudgetMs: '5001' }]
    ]) {
        expectRejected(() => normalizeMonteCarloResourceConfigV1(config), `resource validator rejects ${name}`);
    }
}

class MockElement {
    constructor(id, { value = '', checked = false } = {}) {
        this.id = id;
        this.value = value;
        this.checked = checked;
        this.disabled = false;
        this.hidden = false;
        this.textContent = '';
        this.dataset = {};
        this.style = { display: '', width: '' };
        this.attributes = new Map();
        this.listeners = new Map();
        this.focusCalls = 0;
    }

    addEventListener(type, handler) {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type).push(handler);
    }

    removeEventListener(type, handler) {
        this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item !== handler));
    }

    dispatch(type) {
        for (const handler of this.listeners.get(type) || []) handler({ type, preventDefault() {} });
    }

    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    removeAttribute(name) { this.attributes.delete(name); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    focus() { this.focusCalls++; }
}

class MockDocument {
    constructor() { this.elements = new Map(); }
    register(id, options) {
        const element = new MockElement(id, options);
        this.elements.set(id, element);
        return element;
    }
    getElementById(id) { return this.elements.get(id) || null; }
}

{
    const previousDocument = global.document;
    const documentRef = new MockDocument();
    const values = {
        mcAnzahl: '100001',
        mcDauer: '35',
        mcBlockSize: '5',
        mcSeed: '12345',
        mcMethode: 'regime_markov',
        rngMode: 'per-run-seed',
        mcStartYearMode: 'UNIFORM',
        mcStartYearFilter: '1970',
        mcStartYearHalfLife: '20',
        mcWorkerCount: '8',
        mcWorkerBudget: '500'
    };
    for (const [id, value] of Object.entries(values)) documentRef.register(id, { value });
    documentRef.register('mcExcludeEstimatedHistory', { checked: false });
    const startButton = documentRef.register('mcButton');
    const cancelButton = documentRef.register('mcCancelButton');
    const progress = documentRef.register('mc-progress-bar-container');
    const progressBar = documentRef.register('mc-progress-bar');
    const status = documentRef.register('mcRunStatus');
    const errorContainer = documentRef.register('mc-error-container');
    documentRef.register('mc-error-message');
    const resultRegion = documentRef.register('monteCarloResults');
    const estimate = documentRef.register('mcResourceEstimate');
    const confirmationRow = documentRef.register('mcLargeRunConfirmationRow');
    const confirmation = documentRef.register('mcLargeRunConfirm');
    documentRef.register('mc-compare-results');

    try {
        global.document = documentRef;
        const uiParameters = readMonteCarloParameters({ startAlter: 65, partner: { aktiv: false } });
        assertEqual(uiParameters.anzahl, 100001, 'UI consumer returns centrally normalized parameters');
        initMonteCarloResourceControls();
        assert(estimate.textContent.includes('Run-Jahre'), 'UI shows run-years before execution');
        assert(estimate.textContent.includes('Speicherklasse'), 'UI shows a memory class before execution');
        assertEqual(confirmationRow.hidden, false, 'large-run confirmation becomes visible above 100,000 runs');

        const ui = createMonteCarloUI();
        expectRejected(() => ui.requireLargeRunConfirmation(uiParameters), 'UI blocks a large run without explicit confirmation');
        assert(confirmation.focusCalls > 0, 'missing large-run confirmation receives focus');
        confirmation.checked = true;
        documentRef.getElementById('mcDauer').value = '36';
        documentRef.getElementById('mcDauer').dispatch('input');
        assertEqual(confirmation.checked, false, 'changing duration invalidates a prior large-run confirmation');
        confirmation.checked = true;
        const refreshedParameters = readMonteCarloParameters({ startAlter: 65, partner: { aktiv: false } });
        ui.requireLargeRunConfirmation(refreshedParameters);
        assertEqual(confirmation.checked, false, 'large-run confirmation is consumed once per explicit start');

        ui.beginRun();
        ui.showProgress();
        ui.updateProgress(42.4);
        assertEqual(startButton.disabled, true, 'start is disabled while running');
        assertEqual(cancelButton.disabled, false, 'cancel is enabled while running');
        assertEqual(progress.getAttribute('aria-valuenow'), '42', 'progress exposes aria-valuenow');
        assertEqual(progressBar.style.width, '42.4%', 'visual progress matches semantic progress');
        assert(status.textContent.includes('42 Prozent'), 'progress has a live textual status');
        ui.beginCancelling();
        assertEqual(startButton.disabled, true, 'start stays disabled while cancelling');
        assertEqual(cancelButton.disabled, true, 'duplicate cancel is disabled');
        ui.showError(new Error('Sichtbarer Testfehler'));
        assert(errorContainer.focusCalls > 0, 'error region receives focus and is not color-only');
        ui.showCompleted();
        ui.finishRun();
        assert(resultRegion.focusCalls > 0, 'completed results receive focus');

        documentRef.getElementById('mcAnzahl').value = '100.5';
        expectRejected(
            () => readMonteCarloParameters({ startAlter: 65, partner: { aktiv: false } }),
            'UI consumer rejects decimal runs through the shared contract'
        );
        documentRef.getElementById('mcAnzahl').value = '10000';
        documentRef.getElementById('mcWorkerCount').value = '8x';
        expectRejected(() => ui.readWorkerConfig(), 'UI worker configuration rejects suffixes');
    } finally {
        if (previousDocument === undefined) delete global.document;
        else global.document = previousDocument;
    }
}

{
    await expectRejected(
        () => runMonteCarloSimulation({
            inputs: { startAlter: 65, partner: { aktiv: false } },
            monteCarloParams: { ...validParameters, anzahl: '10runs' },
            widowOptions: {},
            useCapeSampling: false
        }),
        'direct runner consumer rejects the same suffix fixture before simulation'
    );
}

{
    const html = fs.readFileSync(new URL('../Simulator.html', import.meta.url), 'utf8');
    assert(/id="mcAnzahl" value="10000" min="1" max="1000000" step="1"/.test(html), 'HTML uses the reviewed 10,000 default and hard run bounds');
    assert(/id="mc-progress-bar-container" role="progressbar"/.test(html), 'progress element has a semantic progressbar role');
    assert(/aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"/.test(html), 'progress element declares min, max and current values');
    assert(/id="mc-error-container"[\s\S]*?role="alert"/.test(html), 'error region has an alert role');
    assert(/id="mcRunExportStatus" role="status" aria-live="polite"/.test(html), 'export readiness remains keyboard and screen-reader visible');
}

assertEqual(MONTE_CARLO_PARAMETER_LIMITS.runs.default, 10000, 'exported resource contract documents the 10,000 default');
console.log('--- MonteCarloParametersV1 Contract Tests Completed ---');
