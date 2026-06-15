import { runBacktest } from '../app/simulator/simulator-backtest.js';
import { HISTORICAL_DATA } from '../app/simulator/simulator-data.js';
import { EngineAPI } from '../engine/index.mjs';
import { CONFIG } from '../engine/config.mjs';

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
        simEndJahr: 2025,
        simStartVermoegen: 2000000,
        depotwertAlt: 2000000,
        einstandAlt: 1600000,
        tagesgeld: 20000,
        geldmarktEtf: 0,
        startFloorBedarf: 24000,
        startFlexBedarf: 6000,
        minimumFlexAnnual: 0,
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
        dynamicFlex: false,
        horizonMethod: 'survival_quantile',
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoActive: false,
        goGoMultiplier: 1.0,
        goldAllokationAktiv: 'false',
        goldAllokationProzent: 0,
        goldFloorProzent: 0,
        rebalancingBand: 20,
        goldSteuerfrei: 'false'
    };

    // --- TEST 1: Determinism (2000-2025) ---
    {
        global.document = createMockDocument(baseInputs);
        global.document.getElementById('monteCarloResults').style.display = 'none';
        global.document.getElementById('btButton').disabled = false;
        global.document.getElementById('simulationResults').style.display = 'none';
        global.document.getElementById('simulationSummary').innerHTML = '';
        global.document.getElementById('simulationLog').innerHTML = '';

        // Zwei Läufe mit gleichen Inputs müssen identisch sein.
        runBacktest();
        const firstRows = (window.globalBacktestData?.rows || []).map(r => [r.jahr, r.wertAktien, r.wertGold, r.liquiditaet]);

        runBacktest();
        const secondRows = (window.globalBacktestData?.rows || []).map(r => [r.jahr, r.wertAktien, r.wertGold, r.liquiditaet]);

        assertEqual(JSON.stringify(firstRows), JSON.stringify(secondRows), 'Backtest 2000-2025 should be deterministic');
        assertEqual(firstRows.length, 26, 'Backtest should contain 26 yearly results for 2000-2025');
        assertEqual(window.globalBacktestData?.rows?.at(-1)?.jahr, 2025, 'Last backtest year should be 2025');
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

    // --- TEST 6: Dynamic Flex horizon is recomputed per year and ui.vpw is exposed ---
    {
        global.document = createMockDocument({
            ...baseInputs,
            simStartJahr: 2010,
            simEndJahr: 2013,
            dynamicFlex: 'true',
            horizonMethod: 'mean',
            p1StartAlter: 65
        });
        global.document.getElementById('dynamicFlex').checked = true;
        global.document.getElementById('goGoActive').checked = false;
        global.document.getElementById('monteCarloResults').style.display = 'none';
        runBacktest();

        const rows = window.globalBacktestData?.rows || [];
        assert(rows.length >= 3, 'Dynamic flex test should create multiple rows');
        assert(rows.every(r => r?.vpw !== undefined), 'Backtest rows should expose ui.vpw payload');
        const horizons = rows.map(r => Number(r?.vpw?.horizonYears)).filter(Number.isFinite);
        assert(horizons.length >= 3, 'Dynamic flex rows should contain horizon values');
        assert(horizons[1] <= horizons[0], 'Horizon should not increase from year 1 to year 2');
        assert(horizons[2] <= horizons[1], 'Horizon should not increase from year 2 to year 3');
        const hints = rows.map(r => r?.vpwFallbackHint);
        assert(hints.every(h => typeof h === 'string' && h.length > 0), 'Each row should include VPW fallback hint');
        assert(hints.every(h => h === 'ok'), 'Active dynamic-flex rows should not report fallback in this scenario');
        assert(rows.every(r => Number.isFinite(Number(r.row?.entnahme_plan))), 'Backtest rows should expose planned withdrawal');
        assert(rows.every(r => Number.isFinite(Number(r.row?.entnahme_effektiv))), 'Backtest rows should expose effective withdrawal');
        assert(rows.every(r => Number.isFinite(Number(r.row?.liq_before_payout))), 'Backtest rows should expose liquidity before payout');
        assert(rows.every(r => Number.isFinite(Number(r.row?.liq_after_payout))), 'Backtest rows should expose liquidity after payout');
        assert(rows.every(r => Number.isFinite(Number(r.row?.portfolio_total_end))), 'Backtest rows should expose end portfolio total');
    }

    // --- TEST 7: Dynamic Flex off exposes explicit hint ---
    {
        global.document = createMockDocument({
            ...baseInputs,
            simStartJahr: 2015,
            simEndJahr: 2016,
            dynamicFlex: 'false'
        });
        global.document.getElementById('dynamicFlex').checked = false;
        global.document.getElementById('monteCarloResults').style.display = 'none';
        runBacktest();
        const rows = window.globalBacktestData?.rows || [];
        assert(rows.length === 2, 'Dynamic flex off scenario should create two rows');
        assert(rows.every(r => r?.vpw?.status === 'disabled'), 'VPW status should be disabled when dynamic flex is off');
        assert(rows.every(r => r?.vpwFallbackHint === 'dynamic_flex_off'), 'Hint should explicitly mark dynamic flex off mode');
    }

    // --- TEST 8: Continuous CAPE policy reaches backtest rows via Engine config ---
    {
        const previousPolicy = CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY;
        CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY = 'cape_continuous';
        try {
            global.document = createMockDocument({
                ...baseInputs,
                simStartJahr: 2010,
                simEndJahr: 2012,
                dynamicFlex: 'true',
                horizonMethod: 'mean',
                marketCapeRatio: 20
            });
            global.document.getElementById('dynamicFlex').checked = true;
            global.document.getElementById('goGoActive').checked = false;
            global.document.getElementById('monteCarloResults').style.display = 'none';
            runBacktest();

            const rows = window.globalBacktestData?.rows || [];
            assertEqual(rows.length, 3, 'Continuous CAPE backtest should create three rows');
            assert(rows.every(r => r?.vpw?.returnPolicy === 'cape_continuous'), 'Backtest VPW rows should expose continuous return policy');
            assert(rows.every(r => r?.vpw?.expectedReturnSource === 'cape_continuous'), 'Backtest VPW rows should expose continuous return source');
            assert(rows.every(r => r?.vpw?.capeInputStatus === 'valid'), 'Backtest VPW rows should use valid historical CAPE');
            assert(rows.every(r => Number.isFinite(Number(r?.vpw?.expectedRealReturn))), 'Backtest VPW rows should expose finite real return');
            assert(rows.every(r => r?.vpwFallbackHint === 'ok'), 'Continuous CAPE backtest should not trigger fallback hints');
        } finally {
            CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY = previousPolicy;
        }
    }

    // --- TEST 8: Mindest-Flex increases stressed withdrawals without flow drift ---
    {
        global.document = createMockDocument({
            ...baseInputs,
            simStartJahr: 2005,
            simEndJahr: 2014,
            simStartVermoegen: 500000,
            depotwertAlt: 480000,
            einstandAlt: 400000,
            tagesgeld: 20000,
            startFlexBedarf: 12000,
            minimumFlexAnnual: 9000,
            flexBudgetAnnual: 0,
            marketCapeRatio: 35,
            dynamicFlex: 'true',
            horizonYears: 10
        });
        global.document.getElementById('dynamicFlex').checked = true;
        global.document.getElementById('monteCarloResults').style.display = 'none';
        runBacktest();
        const withMinimumFlexRows = window.globalBacktestData?.rows || [];
        const withMinimumFlexTotal = withMinimumFlexRows.reduce((sum, r) => sum + (r.entscheidung?.jahresEntnahme || 0), 0);

        global.document = createMockDocument({
            ...baseInputs,
            simStartJahr: 2005,
            simEndJahr: 2014,
            simStartVermoegen: 500000,
            depotwertAlt: 480000,
            einstandAlt: 400000,
            tagesgeld: 20000,
            startFlexBedarf: 12000,
            minimumFlexAnnual: 0,
            flexBudgetAnnual: 0,
            marketCapeRatio: 35,
            dynamicFlex: 'true',
            horizonYears: 10
        });
        global.document.getElementById('dynamicFlex').checked = true;
        global.document.getElementById('monteCarloResults').style.display = 'none';
        runBacktest();
        const withoutMinimumFlexRows = window.globalBacktestData?.rows || [];
        const withoutMinimumFlexTotal = withoutMinimumFlexRows.reduce((sum, r) => sum + (r.entscheidung?.jahresEntnahme || 0), 0);

        assert(withMinimumFlexTotal > withoutMinimumFlexTotal, 'Mindest-Flex should increase 2005-2014 withdrawals');
        assert(withMinimumFlexRows.some(r => r.row?.minimumFlexStatus === 'applied'), 'Backtest log should expose applied minimum-flex status');
        assert(withMinimumFlexRows.every(r => Math.abs(Number(r.row?.portfolio_flow_delta) || 0) < 1), 'FlowDelta should remain near zero with minimum flex');
    }

    // --- TEST 9: 3-Bucket and Mindest-Flex stay balanced in backtest accounting ---
    {
        global.document = createMockDocument({
            ...baseInputs,
            simStartJahr: 2005,
            simEndJahr: 2014,
            simStartVermoegen: 500000,
            depotwertAlt: 360000,
            einstandAlt: 300000,
            tagesgeld: 20000,
            geldmarktEtf: 120000,
            initialBondBucket: 120000,
            startFlexBedarf: 12000,
            minimumFlexAnnual: 9000,
            flexBudgetAnnual: 0,
            marketCapeRatio: 35,
            entnahmeStrategie: '3_bucket_jilge',
            bondTargetFactor: 2,
            drawdownTrigger: 20,
            bondRefillThreshold: 1.5
        });
        global.document.getElementById('dynamicFlex').checked = false;
        global.document.getElementById('monteCarloResults').style.display = 'none';
        global.window.__profilverbundMinimumFlexProfiles = [
            { profileId: 'a', name: 'A', minimumFlexAnnual: 0 },
            { profileId: 'b', name: 'B', minimumFlexAnnual: 9000 }
        ];
        runBacktest();

        const rows = window.globalBacktestData?.rows || [];
        assert(rows.length === 10, '3-Bucket minimum-flex backtest should create ten rows');
        assertEqual(window.globalBacktestData?.decumulationMode, '3_bucket_jilge', 'Backtest should run in 3-Bucket mode');
        assertEqual(window.globalBacktestData?.minimumFlexProfiles?.length, 2, 'Backtest should retain profile-level minimum-flex split');
        assertEqual(window.globalBacktestData?.minimumFlexProfiles?.[1]?.minimumFlexAnnual, 9000, 'Backtest should expose profile B minimum flex');
        assert(rows.some(r => r.row?.minimumFlexStatus === 'applied'), '3-Bucket log should expose applied minimum-flex status');
        assert(rows.every(r => Math.abs(Number(r.row?.portfolio_flow_delta) || 0) < 1), '3-Bucket FlowDelta should remain near zero with minimum flex');
    }

    console.log('✅ Simulator backtest tests passed');
} finally {
    if (prevDocument === undefined) delete global.document; else global.document = prevDocument;
    if (prevWindow === undefined) delete global.window; else global.window = prevWindow;
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
    if (prevAlert === undefined) delete global.alert; else global.alert = prevAlert;
}

console.log('--- Simulator Backtest Tests Completed ---');
