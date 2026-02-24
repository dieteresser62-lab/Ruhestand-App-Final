import {
    initThreeBucketControls,
    refreshThreeBucketControls
} from '../app/simulator/simulator-main-3bucket.js';
import {
    buildBacktestColumnDefinitions,
    convertRowsToCsv
} from '../app/simulator/simulator-main-helpers.js';
import { renderThreeBucketPortfolioChart } from '../app/simulator/simulator-portfolio-chart.js';
import { STRATEGY_OPTIONS } from '../types/strategy-options.js';

console.log('--- Simulator 3-Bucket UI E2E Tests ---');

function createElement({ id, value = '', tagName = 'INPUT' }) {
    return {
        id,
        value,
        tagName,
        style: {},
        _listeners: {},
        addEventListener(event, cb) {
            this._listeners[event] = this._listeners[event] || [];
            this._listeners[event].push(cb);
        },
        dispatch(event) {
            (this._listeners[event] || []).forEach(cb => cb({ target: this }));
        }
    };
}

const prevDocument = global.document;
try {
    const elements = new Map();
    const add = (el) => elements.set(el.id, el);
    add(createElement({ id: 'entnahmeStrategie', tagName: 'SELECT', value: STRATEGY_OPTIONS.THREE_BUCKET_JILGE }));
    add(createElement({ id: 'bondTargetFactor', value: '' }));
    add(createElement({ id: 'drawdownTrigger', value: '' }));
    add(createElement({ id: 'bondRefillThreshold', value: '' }));
    add(createElement({ id: 'threeBucketConfigGroup', tagName: 'DIV', value: '' }));
    global.document = {
        getElementById(id) {
            return elements.get(id) || null;
        }
    };

    initThreeBucketControls();
    assertEqual(elements.get('bondTargetFactor').value, '5', 'bondTargetFactor default should only be set when empty');
    assertEqual(elements.get('drawdownTrigger').value, '15', 'drawdownTrigger default should only be set when empty');
    assertEqual(elements.get('threeBucketConfigGroup').style.display, 'grid', '3-bucket fields should be visible in 3-bucket mode');

    elements.get('bondTargetFactor').value = '6.5';
    elements.get('drawdownTrigger').value = '12';
    refreshThreeBucketControls();
    assertEqual(elements.get('bondTargetFactor').value, '6.5', 'existing bondTargetFactor must not be overwritten');
    assertEqual(elements.get('drawdownTrigger').value, '12', 'existing drawdownTrigger must not be overwritten');

    elements.get('entnahmeStrategie').value = 'vpw';
    refreshThreeBucketControls();
    assertEqual(elements.get('entnahmeStrategie').value, STRATEGY_OPTIONS.STANDARD, 'legacy mode should normalize to standard');
    assertEqual(elements.get('threeBucketConfigGroup').style.display, 'none', '3-bucket fields should hide in standard mode');
} finally {
    if (prevDocument === undefined) delete global.document;
    else global.document = prevDocument;
}

{
    const standardCols = buildBacktestColumnDefinitions('normal', { strategyMode: STRATEGY_OPTIONS.STANDARD });
    const threeBucketCols = buildBacktestColumnDefinitions('normal', { strategyMode: STRATEGY_OPTIONS.THREE_BUCKET_JILGE });
    const headers = threeBucketCols.map(col => col.header);
    assert(!standardCols.some(col => col.header === 'Bonds/Puffer'), 'standard mode must not expose 3-bucket columns');
    assert(headers.includes('ETF'), '3-bucket mode should expose ETF column');
    assert(headers.includes('Bonds/Puffer'), '3-bucket mode should expose Bonds/Puffer column');
    assert(headers.includes('Bd.Kauf'), '3-bucket mode should expose Bd.Kauf column');
    assert(headers.includes('Bd.Verk'), '3-bucket mode should expose Bd.Verk column');

    const csv = convertRowsToCsv([{
        jahr: 1,
        entscheidung: { jahresEntnahme: 12000 },
        row: {
            floor_brutto: 24000,
            bondBucketAfter: 15000,
            bondRefillNet: 5000,
            bondSaleAmount: 2000
        },
        wertAktien: 90000,
        wertGold: 0,
        liquiditaet: 10000,
        inflationVJ: 2,
        netA: 0,
        netG: 0
    }], threeBucketCols);
    assert(csv.includes('Bonds/Puffer'), 'CSV should include Bonds/Puffer header in 3-bucket mode');
    assert(csv.includes('Bd.Kauf'), 'CSV should include Bd.Kauf header in 3-bucket mode');
    assert(csv.includes('Bd.Verk'), 'CSV should include Bd.Verk header in 3-bucket mode');
}

{
    const prevDoc = global.document;
    try {
        const createNode = () => ({
            children: [],
            style: {},
            setAttribute() { },
            appendChild(child) { this.children.push(child); }
        });
        global.document = {
            createElementNS() { return createNode(); },
            createElement() { return createNode(); }
        };
        const container = {
            _html: 'stale',
            children: [1, 2, 3],
            appendChild(node) { this.children.push(node); },
            get innerHTML() { return this._html; },
            set innerHTML(value) {
                this._html = value;
                this.children = [];
            }
        };
        const rows = [{
            row: { bondBucketAfter: 20000 },
            wertAktien: 120000,
            liquiditaet: 30000
        }];
        renderThreeBucketPortfolioChart(container, rows);
        const firstCount = container.children.length;
        renderThreeBucketPortfolioChart(container, rows);
        const secondCount = container.children.length;
        assert(firstCount > 0, 'chart render should append chart nodes');
        assertEqual(secondCount, firstCount, 'chart rerender must clear container before drawing');
    } finally {
        if (prevDoc === undefined) delete global.document;
        else global.document = prevDoc;
    }
}

console.log('✅ Simulator 3-bucket UI E2E tests passed');

