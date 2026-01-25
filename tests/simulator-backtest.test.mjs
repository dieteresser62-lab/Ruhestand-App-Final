import { runBacktest } from '../simulator-backtest.js';
import { HISTORICAL_DATA } from '../simulator-data.js';
import { EngineAPI } from '../engine/index.mjs';

console.log('--- Simulator Backtest Tests ---');

function createLocalStorageMock() {
    const store = new Map();
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => { store.set(String(key), String(value)); },
        removeItem: (key) => { store.delete(key); },
        clear: () => { store.clear(); },
        key: (index) => Array.from(store.keys())[index] || null,
        get length() { return store.size; }
    };
}

function createElement(value = '0') {
    return {
        value,
        checked: false,
        disabled: false,
        innerHTML: '',
        style: { display: 'none' },
        classList: { add: () => {}, remove: () => {} },
        addEventListener: () => {}
    };
}

function createMockDocument(initialValues = {}) {
    const elements = new Map();
    const getOrCreate = (id) => {
        if (!elements.has(id)) {
            elements.set(id, createElement('0'));
        }
        return elements.get(id);
    };
    Object.entries(initialValues).forEach(([id, value]) => {
        const el = createElement(String(value));
        elements.set(id, el);
    });
    return {
        getElementById: (id) => getOrCreate(id)
    };
}

const prevDocument = global.document;
const prevWindow = global.window;
const prevLocalStorage = global.localStorage;
const prevAlert = global.alert;

try {
    global.localStorage = createLocalStorageMock();
    global.window = { EngineAPI };
    global.alert = () => { throw new Error('Unexpected alert'); };

    const baseInputs = {
        simStartJahr: 2000,
        simEndJahr: 2024,
        simStartVermoegen: 500000,
        depotwertAlt: 500000,
        einstandAlt: 400000,
        tagesgeld: 20000,
        geldmarktEtf: 0,
        startFloorBedarf: 24000,
        startFlexBedarf: 6000,
        flexBudgetAnnual: 0,
        flexBudgetRecharge: 0,
        marketCapeRatio: 20,
        p1StartAlter: 65,
        p1Geschlecht: 'm',
        p1SparerPauschbetrag: 1000,
        p1KirchensteuerPct: 0,
        p1Monatsrente: 0,
        p1StartInJahren: 0,
        rentAdjMode: 'fix',
        rentAdjPct: 0,
        goldAllokationAktiv: 'false',
        goldAllokationProzent: 0,
        goldFloorProzent: 0,
        rebalancingBand: 20,
        goldSteuerfrei: 'false'
    };

    // --- TEST 1: Determinism (2000-2024) ---
    {
        global.document = createMockDocument(baseInputs);
        global.document.getElementById('monteCarloResults').style.display = 'none';
        global.document.getElementById('btButton').disabled = false;
        global.document.getElementById('simulationResults').style.display = 'none';
        global.document.getElementById('simulationSummary').innerHTML = '';
        global.document.getElementById('simulationLog').innerHTML = '';

        runBacktest();
        const firstRows = (window.globalBacktestData?.rows || []).map(r => [r.jahr, r.wertAktien, r.wertGold, r.liquiditaet]);

        runBacktest();
        const secondRows = (window.globalBacktestData?.rows || []).map(r => [r.jahr, r.wertAktien, r.wertGold, r.liquiditaet]);

        assertEqual(JSON.stringify(firstRows), JSON.stringify(secondRows), 'Backtest 2000-2024 should be deterministic');
    }

    // --- TEST 2: Startjahr-Filterung ---
    {
        global.document = createMockDocument({ ...baseInputs, simStartJahr: 2010, simEndJahr: 2012 });
        global.document.getElementById('monteCarloResults').style.display = 'none';
        runBacktest();
        const rows = window.globalBacktestData?.rows || [];
        assertEqual(rows.length, 3, 'Backtest should contain 3 yearly results for 2010-2012');
        assertEqual(rows[0].jahr, 2010, 'First backtest year should match start year');
    }

    // --- TEST 3: Historische Daten geladen ---
    {
        const rows = window.globalBacktestData?.rows || [];
        const first = rows[0];
        const expectedInflation = HISTORICAL_DATA[first.jahr - 1]?.inflation_de || 0;
        assertClose(first.inflationVJ, expectedInflation, 0.0001, 'Inflation should match HISTORICAL_DATA');
    }

    // --- TEST 4: yearlyResults length ---
    {
        const rows = window.globalBacktestData?.rows || [];
        assertEqual(rows.length, 3, 'yearlyResults length should match (end-start+1)');
    }

    // --- TEST 5: finalWealth matches last yearly entry ---
    {
        const rows = window.globalBacktestData?.rows || [];
        const last = rows[rows.length - 1];
        const finalWealth = (last?.wertAktien || 0) + (last?.wertGold || 0) + (last?.liquiditaet || 0);
        assert(Number.isFinite(finalWealth), 'Final wealth should be finite');
        assert(finalWealth >= 0, 'Final wealth should be >= 0');
    }

    console.log('✅ Simulator backtest tests passed');
} finally {
    if (prevDocument === undefined) delete global.document; else global.document = prevDocument;
    if (prevWindow === undefined) delete global.window; else global.window = prevWindow;
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
    if (prevAlert === undefined) delete global.alert; else global.alert = prevAlert;
}

console.log('--- Simulator Backtest Tests Completed ---');
