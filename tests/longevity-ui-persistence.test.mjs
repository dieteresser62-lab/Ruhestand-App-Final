import { initUIReader, UIReader } from '../app/balance/balance-reader.js';
import { initDynamicFlexControls } from '../app/simulator/simulator-main-dynamic-flex.js';
import { readDynamicFlexInputs } from '../app/simulator/simulator-input-strategy.js';
import { buildSimulatorInputsFromProfileData, combineSimulatorProfiles } from '../app/simulator/simulator-profile-inputs.js';

console.log('--- Longevity UI Persistence Tests ---');

function createElement({ id, type = 'text', value = '', checked = false, tagName = 'INPUT' }) {
    return {
        id,
        type,
        value,
        checked,
        tagName,
        dataset: {},
        disabled: false,
        style: {},
        classList: { contains: () => false },
        _listeners: {},
        addEventListener(evt, cb) {
            if (!this._listeners[evt]) this._listeners[evt] = [];
            this._listeners[evt].push(cb);
        },
        dispatch(evt) {
            (this._listeners[evt] || []).forEach(fn => fn({ target: this }));
        }
    };
}

function createDocumentMock(values = {}) {
    return {
        getElementById(id) {
            if (!Object.prototype.hasOwnProperty.call(values, id)) return null;
            const entry = values[id];
            if (entry && typeof entry === 'object' && !Array.isArray(entry)) return entry;
            return { value: entry, checked: false };
        }
    };
}

function createLocalStorageMock() {
    const map = new Map();
    return {
        getItem(key) { return map.has(key) ? map.get(key) : null; },
        setItem(key, val) { map.set(key, String(val)); },
        removeItem(key) { map.delete(key); },
        clear() { map.clear(); },
        key(index) { return Array.from(map.keys())[index] || null; },
        get length() { return map.size; }
    };
}

const prevDocument = global.document;
const prevLocalStorage = global.localStorage;

try {
    console.log('Test 1: Dynamic-Flex UI persists longevity fields and disables inactive detail inputs');
    const elements = new Map();
    const add = (el) => elements.set(el.id, el);
    add(createElement({ id: 'dynamicFlexPreset', tagName: 'SELECT', value: 'off' }));
    add(createElement({ id: 'dynamicFlexShowAdvanced', type: 'checkbox', checked: true }));
    add(createElement({ id: 'dynamicFlex', type: 'checkbox', checked: true }));
    add(createElement({ id: 'horizonMethod', tagName: 'SELECT', value: 'survival_quantile' }));
    add(createElement({ id: 'horizonYears', type: 'number', value: '30' }));
    add(createElement({ id: 'survivalQuantile', type: 'number', value: '0.85' }));
    add(createElement({ id: 'goGoActive', type: 'checkbox', checked: false }));
    add(createElement({ id: 'goGoMultiplier', type: 'number', value: '1.0' }));
    add(createElement({ id: 'longevityMode', tagName: 'SELECT', value: 'none' }));
    add(createElement({ id: 'longevityQuantileShift', type: 'number', value: '0.05' }));
    add(createElement({ id: 'longevityRelativePct', type: 'number', value: '0.05' }));
    add(createElement({ id: 'longevityBufferYears', type: 'number', value: '2' }));
    add(createElement({ id: 'dynamicFlexConfigGroup', type: 'div', tagName: 'DIV' }));
    add(createElement({ id: 'dynamicFlexAdvancedToggleRow', type: 'div', tagName: 'DIV' }));

    global.document = { getElementById: id => elements.get(id) || null };
    global.localStorage = createLocalStorageMock();

    initDynamicFlexControls();
    const longevityMode = elements.get('longevityMode');
    longevityMode.value = 'quantile_shift';
    longevityMode.dispatch('change');

    assertEqual(localStorage.getItem('sim_longevityMode'), 'quantile_shift', 'Longevity mode should persist');
    assertEqual(localStorage.getItem('sim_longevityQuantileShift'), '0.05', 'Quantile shift should persist');
    assertEqual(elements.get('longevityQuantileShift').disabled, false, 'Quantile shift input should be enabled in quantile mode');
    assertEqual(elements.get('longevityRelativePct').disabled, true, 'Relative input should be disabled outside relative mode');
    assertEqual(elements.get('dynamicFlexPreset').value, 'custom', 'Active longevity should make preset custom');

    const preset = elements.get('dynamicFlexPreset');
    preset.value = 'konservativ';
    preset.dispatch('change');
    assertEqual(elements.get('longevityMode').value, 'none', 'Presets should reset longevity to none');
    assertEqual(localStorage.getItem('sim_longevityMode'), 'none', 'Preset reset should persist longevity none');
    console.log('✓ UI persistence OK');
} finally {
    if (prevDocument === undefined) delete global.document; else global.document = prevDocument;
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
}

console.log('Test 2: Simulator reader forwards longevity fields without silent clamp');
{
    const doc = createDocumentMock({
        dynamicFlex: { checked: true },
        horizonMethod: 'survival_quantile',
        horizonYears: '30',
        survivalQuantile: '0.85',
        goGoActive: { checked: false },
        goGoMultiplier: '1.0',
        marketCapeRatio: '31',
        longevityMode: 'buffer_years',
        longevityQuantileShift: '0.12',
        longevityRelativePct: '0.25',
        longevityBufferYears: '2.5'
    });
    const inputs = readDynamicFlexInputs(doc);
    assertEqual(inputs.longevityMode, 'buffer_years', 'Mode should be read from DOM');
    assertEqual(inputs.longevityQuantileShift, 0.12, 'Invalid shift should not be silently clamped');
    assertEqual(inputs.longevityRelativePct, 0.25, 'Invalid relative pct should not be silently clamped');
    assertEqual(inputs.longevityBufferYears, 2.5, 'Invalid buffer integer should reach engine validation');
    console.log('✓ Simulator reader OK');
}

console.log('Test 3: Simulator profile import and aggregation preserve primary longevity contract');
{
    const primary = buildSimulatorInputsFromProfileData({
        sim_dynamicFlex: 'true',
        sim_longevityMode: 'quantile_shift',
        sim_longevityQuantileShift: '0.05',
        sim_longevityRelativePct: '0.05',
        sim_longevityBufferYears: '2'
    });
    const secondary = buildSimulatorInputsFromProfileData({
        sim_dynamicFlex: 'true',
        sim_longevityMode: 'relative_horizon_buffer',
        sim_longevityQuantileShift: '0.03',
        sim_longevityRelativePct: '0.10',
        sim_longevityBufferYears: '3'
    });
    const result = combineSimulatorProfiles([
        { profileId: 'a', name: 'A', inputs: primary },
        { profileId: 'b', name: 'B', inputs: secondary }
    ], 'a');
    assertEqual(result.combined.longevityMode, 'quantile_shift', 'Primary profile should lead longevity mode');
    assertEqual(result.combined.longevityQuantileShift, 0.05, 'Primary profile should lead shift');
    assert(result.warnings.some(w => w.includes('Langlebigkeits-Puffer')), 'Longevity profile diff should warn');
    console.log('✓ Profile import and aggregation OK');
}

try {
    console.log('Test 4: Balance reader forwards longevity fields');
    const inputs = {
        dynamicFlex: createElement({ id: 'dynamicFlex', type: 'checkbox', checked: true }),
        horizonMethod: createElement({ id: 'horizonMethod', tagName: 'SELECT', value: 'survival_quantile' }),
        horizonYears: createElement({ id: 'horizonYears', type: 'number', value: '30' }),
        survivalQuantile: createElement({ id: 'survivalQuantile', type: 'number', value: '0.85' }),
        goGoActive: createElement({ id: 'goGoActive', type: 'checkbox', checked: false }),
        goGoMultiplier: createElement({ id: 'goGoMultiplier', type: 'number', value: '1.0' }),
        longevityMode: createElement({ id: 'longevityMode', tagName: 'SELECT', value: 'relative_horizon_buffer' }),
        longevityQuantileShift: createElement({ id: 'longevityQuantileShift', type: 'number', value: '0.04' }),
        longevityRelativePct: createElement({ id: 'longevityRelativePct', type: 'number', value: '0.08' }),
        longevityBufferYears: createElement({ id: 'longevityBufferYears', type: 'number', value: '3' }),
        marketCapeRatio: createElement({ id: 'marketCapeRatio', type: 'number', value: '28' }),
        entnahmeStrategie: createElement({ id: 'entnahmeStrategie', tagName: 'SELECT', value: 'standard' })
    };
    ['floorBedarf', 'flexBedarf', 'minimumFlexAnnual', 'flexBudgetAnnual', 'flexBudgetYears', 'flexBudgetRecharge',
        'inflation', 'tagesgeld', 'geldmarktEtf', 'depotwertAlt', 'depotwertNeu', 'goldWert', 'endeVJ', 'endeVJ_1',
        'endeVJ_2', 'endeVJ_3', 'ath', 'jahreSeitAth', 'renteAktiv', 'renteMonatlich', 'goldZielProzent',
        'goldFloorProzent', 'rebalancingBand', 'costBasisAlt', 'costBasisNeu', 'tqfAlt', 'tqfNeu', 'goldCost',
        'kirchensteuerSatz', 'sparerPauschbetrag', 'rebalBand', 'maxSkimPctOfEq', 'maxBearRefillPctOfEq',
        'bondTargetFactor', 'drawdownTrigger', 'bondRefillThreshold', 'profilName'].forEach(id => {
            if (!inputs[id]) inputs[id] = createElement({ id, value: '0' });
        });
    ['goldAktiv', 'goldSteuerfrei'].forEach(id => {
        inputs[id] = createElement({ id, type: 'checkbox', checked: false });
    });
    const docElements = new Map(Object.entries(inputs));
    docElements.set('runwayMinMonths', createElement({ id: 'runwayMinMonths', value: '24' }));
    docElements.set('runwayTargetMonths', createElement({ id: 'runwayTargetMonths', value: '36' }));
    docElements.set('minCashBufferMonths', createElement({ id: 'minCashBufferMonths', value: '2' }));
    docElements.set('targetEq', createElement({ id: 'targetEq', value: '60' }));
    global.document = { getElementById: id => docElements.get(id) || null };
    global.localStorage = createLocalStorageMock();
    initUIReader({ inputs, controls: {} });

    const result = UIReader.readAllInputs();
    assertEqual(result.dynamicFlex, true, 'Balance dynamicFlex should stay enabled with CAPE anchor');
    assertEqual(result.longevityMode, 'relative_horizon_buffer', 'Balance should read longevity mode');
    assertEqual(result.longevityRelativePct, 0.08, 'Balance should read relative pct');
    assertEqual(result.longevityBufferYears, 3, 'Balance should read buffer years');
    console.log('✓ Balance reader OK');
} finally {
    if (prevDocument === undefined) delete global.document; else global.document = prevDocument;
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
}

console.log('Longevity UI persistence tests passed');
console.log('--- Longevity UI Persistence Tests Completed ---');
