import {
    buildAccessibleBacktestTableHtml,
    configureHistoricalBacktestControls,
    createImmutableCohortInventory,
    describeHistoricalBacktestResult,
    renderHistoricalBacktestCohorts,
    renderHistoricalBacktestStatus,
    renderHistoricalBacktestValidation,
    summarizeHistoricalBacktestDataQuality,
    validateHistoricalBacktestPeriod
} from '../app/simulator/historical-backtest-ui.js';
import {
    buildBacktestColumnDefinitions,
    formatColumnValue
} from '../app/simulator/simulator-main-helpers.js';
import { STRATEGY_OPTIONS } from '../types/strategy-options.js';

console.log('--- Simulator Backtest UI Contract Tests ---');

class MockElement {
    constructor(id) {
        this.id = id;
        this.value = '';
        this.textContent = '';
        this.innerHTML = '';
        this.hidden = false;
        this.dataset = {};
        this.attributes = new Map();
        this.focusCalls = 0;
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    removeAttribute(name) {
        this.attributes.delete(name);
    }

    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }

    focus() {
        this.focusCalls++;
    }
}

class MockDocument {
    constructor(ids) {
        this.elements = new Map(ids.map(id => [id, new MockElement(id)]));
    }

    getElementById(id) {
        return this.elements.get(id) || null;
    }
}

const documentRef = new MockDocument([
    'simStartJahr',
    'simEndJahr',
    'backtestCohortHorizon',
    'simStartJahrError',
    'simEndJahrError',
    'backtestCohortHorizonError',
    'backtestDatasetHint',
    'backtestStatus',
    'backtestCohortSummary'
]);

const provider = {
    datasetId: 'synthetic-browser-contract',
    revision: '2026-07-19',
    bounds: { startYear: 1951, endYear: 2025, lookbackYears: 1 }
};

console.log('Test 1: dataset bounds are projected into controls and visible guidance');
{
    const bounds = configureHistoricalBacktestControls(documentRef, provider);
    assertEqual(bounds.startYear, 1951, 'Configured bounds expose the provider start year');
    assertEqual(documentRef.getElementById('simStartJahr').min, '1951', 'Start input receives dynamic minimum');
    assertEqual(documentRef.getElementById('simEndJahr').max, '2025', 'End input receives dynamic maximum');
    assertEqual(documentRef.getElementById('backtestCohortHorizon').max, '75', 'Cohort horizon uses the complete provider span');
    assert(documentRef.getElementById('backtestDatasetHint').textContent.includes('synthetic-browser-contract'), 'Visible hint names the dataset');
    assert(documentRef.getElementById('backtestDatasetHint').textContent.includes('1951–2025'), 'Visible hint names the inclusive bounds');
}

console.log('Test 2: empty, NaN, fractional, reversed and out-of-bounds periods fail per field');
{
    const cases = [
        [{ startRaw: '', endRaw: '2000' }, 'simStartJahr', 'required'],
        [{ startRaw: 'NaN', endRaw: '2000' }, 'simStartJahr', 'finite'],
        [{ startRaw: '1999.5', endRaw: '2000' }, 'simStartJahr', 'integer'],
        [{ startRaw: '2001', endRaw: '2000' }, 'simEndJahr', 'reverse'],
        [{ startRaw: '1950', endRaw: '2000' }, 'simStartJahr', 'bounds'],
        [{ startRaw: '2000', endRaw: '2026' }, 'simEndJahr', 'bounds']
    ];
    for (const [period, expectedField, label] of cases) {
        const validation = validateHistoricalBacktestPeriod({ ...period, bounds: provider.bounds });
        assert(!validation.valid, `${label}: invalid period is rejected`);
        assertEqual(validation.firstErrorFieldId, expectedField, `${label}: first invalid field is deterministic`);
    }
    const singleYear = validateHistoricalBacktestPeriod({ startRaw: '2000', endRaw: '2000', bounds: provider.bounds });
    assert(singleYear.valid, 'Inclusive one-year period remains valid');
}

console.log('Test 3: cohort horizon validation and focus are deterministic');
{
    const invalid = validateHistoricalBacktestPeriod({
        startRaw: '2000',
        endRaw: '2025',
        bounds: provider.bounds,
        cohortsEnabled: true,
        cohortHorizonRaw: '7.5'
    });
    renderHistoricalBacktestValidation(documentRef, invalid);
    assertEqual(invalid.firstErrorFieldId, 'backtestCohortHorizon', 'Fractional cohort horizon maps to its own field');
    assertEqual(documentRef.getElementById('backtestCohortHorizon').getAttribute('aria-invalid'), 'true', 'Invalid cohort field exposes aria-invalid');
    assertEqual(documentRef.getElementById('backtestCohortHorizon').focusCalls, 1, 'First invalid cohort field receives focus');
    assert(!documentRef.getElementById('backtestCohortHorizonError').hidden, 'Inline cohort error is visible');
}

console.log('Test 4: technical status exposes a stable code without stack or local path');
{
    const result = {
        outcome: {
            kind: 'technical_error',
            error: {
                code: 'SYNTHETIC_TECHNICAL_ERROR',
                message: 'failed at C:\\Users\\private\\source.js',
                stack: 'secret stack'
            }
        },
        error: {
            code: 'SYNTHETIC_TECHNICAL_ERROR',
            message: 'failed at C:\\Users\\private\\source.js',
            stack: 'secret stack'
        }
    };
    renderHistoricalBacktestStatus(documentRef, describeHistoricalBacktestResult(result), { focus: true });
    const html = documentRef.getElementById('backtestStatus').innerHTML;
    assert(html.includes('SYNTHETIC_TECHNICAL_ERROR'), 'Technical status exposes its stable code');
    assert(!html.includes('C:\\Users') && !html.includes('secret stack'), 'Technical status suppresses local path and stack');
    assertEqual(documentRef.getElementById('backtestStatus').dataset.status, 'technical_error', 'Technical status is machine-readable');
    assert(documentRef.getElementById('backtestStatus').focusCalls > 0, 'Terminal status receives focus');
}

console.log('Test 5: data-quality projection counts canonical observation statuses');
{
    const quality = summarizeHistoricalBacktestDataQuality({
        historicalYearRecords: [{
            realized: {
                equityReturn: { qualityStatus: 'present' },
                inflation: { qualityStatus: 'estimated' }
            },
            decisionAsOf: { capeRatio: { qualityStatus: 'unresolved' } }
        }]
    });
    assertEqual(quality.total, 3, 'Every canonical observation contributes to the quality inventory');
    assertEqual(quality.limited, 2, 'Estimated and unresolved observations are limited quality');
    assert(quality.label.includes('estimated: 1') && quality.label.includes('unresolved: 1'), 'Quality label stays explicit');
}

console.log('Test 6: accessible table has caption, scoped headers and escaped cell data');
{
    const html = buildAccessibleBacktestTableHtml(
        [{ jahr: 2000, row: { status: '<unsafe>' } }],
        [
            { header: 'Jahr', key: 'jahr' },
            { header: 'Status', key: 'row.status' }
        ],
        (column, row) => column.key === 'jahr' ? row.jahr : row.row.status
    );
    assert(html.includes('<caption>'), 'Backtest table contains a caption');
    assertEqual((html.match(/scope="col"/g) || []).length, 2, 'Every column header declares scope=col');
    assert(html.includes('aria-label="Jahresentnahme"') === false, 'Accessible labels follow the actual columns');
    assert(html.includes('aria-label="Aktion und Begründung"'), 'Abbreviated status header has an understandable name');
    assert(html.includes('&lt;unsafe&gt;') && !html.includes('<unsafe>'), 'Cell data is HTML-escaped');
}

console.log('Test 7: trade cells keep plain text, sign semantics and whitelisted colors');
{
    const columns = buildBacktestColumnDefinitions('normal', {
        strategyMode: STRATEGY_OPTIONS.THREE_BUCKET_JILGE,
        goldAktiv: true
    }).filter(column => ['Handl.A', 'Handl.G', 'Handl.Bd'].includes(column.header));
    const html = buildAccessibleBacktestTableHtml([{
        netA: -120000,
        netG: 50000,
        row: {
            bondSaleAmount: 2000,
            bondRefillNet: 5000
        }
    }], columns, formatColumnValue);

    assert(html.includes('aria-label="Nettohandel Aktien: positiv = Verkauf, negativ = Kauf"'), 'Trade header explains the sign convention');
    assert(html.includes('<td class="backtest-trade-buy">-120k €</td>'), 'Equity purchase renders as escaped plain text with the buy class');
    assert(html.includes('<td class="backtest-trade-sale">50k €</td>'), 'Gold sale renders as escaped plain text with the sale class');
    assert(html.includes('<td class="backtest-trade-buy">-3k €</td>'), 'Bond purchase renders with the same sign convention');
    assert(!html.includes('<span') && !html.includes('&lt;span'), 'Trade cells contain no formatter HTML');

    const rejectedClassHtml = buildAccessibleBacktestTableHtml(
        [{ value: 'safe' }],
        [{ header: 'Test', key: 'value', cellClass: () => 'unsafe-class' }],
        (column, row) => row[column.key]
    );
    assert(!rejectedClassHtml.includes('unsafe-class'), 'Renderer rejects non-whitelisted cell classes');
}

console.log('Test 8: zero-eligible cohort inventory renders without division artifacts and is immutable');
{
    const inventory = createImmutableCohortInventory({
        candidate: 3,
        eligible: 0,
        completed: 0,
        ruin: 0,
        incomplete: 0,
        technicalError: 0,
        cancelled: 0,
        excluded: 3,
        exclusionReasons: { insufficient_horizon: 3 },
        ratesPct: { completed: null, ruin: null, incomplete: null, technicalError: null, cancelled: null }
    });
    renderHistoricalBacktestCohorts(documentRef, inventory, 100);
    const html = documentRef.getElementById('backtestCohortSummary').innerHTML;
    assert(Object.isFrozen(inventory) && Object.isFrozen(inventory.ratesPct), 'UI/export cohort snapshot is deeply immutable');
    assert(html.includes('100 Jahre') && html.includes('insufficient_horizon: 3'), 'Cohort UI shows fixed horizon and exclusions');
    assert(html.includes('keine Erfolgswahrscheinlichkeit'), 'Cohort UI states the inference boundary');
    assert(!html.includes('NaN') && !html.includes('Infinity'), 'Zero eligible cohorts never render NaN or Infinity');
}

console.log('Simulator Backtest UI contract tests passed');
