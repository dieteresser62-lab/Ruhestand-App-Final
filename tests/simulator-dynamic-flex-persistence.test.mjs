import { initDynamicFlexControls } from '../app/simulator/simulator-main-dynamic-flex.js';

console.log('--- Simulator Dynamic-Flex Persistence ---');

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
        _listeners: {},
        addEventListener(evt, cb) {
            if (!this._listeners[evt]) this._listeners[evt] = [];
            this._listeners[evt].push(cb);
        },
        dispatch(evt) {
            const handlers = this._listeners[evt] || [];
            handlers.forEach(fn => fn({ target: this }));
        }
    };
}

function createLocalStorageMock() {
    const map = new Map();
    return {
        getItem(key) { return map.has(key) ? map.get(key) : null; },
        setItem(key, val) { map.set(key, String(val)); },
        removeItem(key) { map.delete(key); },
        clear() { map.clear(); }
    };
}

const prevDocument = global.document;
const prevLocalStorage = global.localStorage;

try {
    const elements = new Map();
    const add = (el) => elements.set(el.id, el);

    add(createElement({ id: 'dynamicFlexPreset', tagName: 'SELECT', value: 'off' }));
    add(createElement({ id: 'dynamicFlexShowAdvanced', type: 'checkbox', checked: false }));
    add(createElement({ id: 'dynamicFlex', type: 'checkbox', checked: false }));
    add(createElement({ id: 'horizonMethod', tagName: 'SELECT', value: 'survival_quantile' }));
    add(createElement({ id: 'horizonYears', type: 'number', value: '30' }));
    add(createElement({ id: 'survivalQuantile', type: 'number', value: '0.85' }));
    add(createElement({ id: 'goGoActive', type: 'checkbox', checked: false }));
    add(createElement({ id: 'goGoMultiplier', type: 'number', value: '1.0' }));
    add(createElement({ id: 'dynamicFlexConfigGroup', type: 'div', tagName: 'DIV' }));
    add(createElement({ id: 'dynamicFlexAdvancedToggleRow', type: 'div', tagName: 'DIV' }));

    global.document = {
        getElementById(id) {
            return elements.get(id) || null;
        }
    };
    global.localStorage = createLocalStorageMock();

    initDynamicFlexControls();

    const preset = elements.get('dynamicFlexPreset');
    preset.value = 'konservativ';
    preset.dispatch('change');

    assertEqual(localStorage.getItem('sim_dynamicFlexPreset'), 'konservativ', 'Preset should persist');
    assertEqual(localStorage.getItem('sim_dynamicFlex'), 'true', 'dynamicFlex should persist from preset');
    assertEqual(localStorage.getItem('sim_horizonMethod'), 'survival_quantile', 'horizonMethod should persist');
    assertEqual(localStorage.getItem('sim_horizonYears'), '35', 'horizonYears should persist from preset');
    assertEqual(localStorage.getItem('sim_survivalQuantile'), '0.9', 'survivalQuantile should persist from preset');
    assertEqual(localStorage.getItem('sim_goGoActive'), 'false', 'goGoActive should persist from preset');
    assertEqual(localStorage.getItem('sim_goGoMultiplier'), '1', 'goGoMultiplier should persist from preset');

    const goGo = elements.get('goGoActive');
    goGo.checked = true;
    goGo.dispatch('change');
    assertEqual(localStorage.getItem('sim_goGoActive'), 'true', 'goGoActive change should persist');
} finally {
    if (prevDocument === undefined) delete global.document; else global.document = prevDocument;
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
}

try {
    const elements = new Map();
    const add = (el) => elements.set(el.id, el);

    add(createElement({ id: 'dynamicFlexPreset', tagName: 'SELECT', value: 'off' }));
    add(createElement({ id: 'dynamicFlexShowAdvanced', type: 'checkbox', checked: false }));
    add(createElement({ id: 'dynamicFlex', type: 'checkbox', checked: false }));
    add(createElement({ id: 'horizonMethod', tagName: 'SELECT', value: 'survival_quantile' }));
    add(createElement({ id: 'horizonYears', type: 'number', value: '30' }));
    add(createElement({ id: 'survivalQuantile', type: 'number', value: '0.85' }));
    add(createElement({ id: 'goGoActive', type: 'checkbox', checked: false }));
    add(createElement({ id: 'goGoMultiplier', type: 'number', value: '1.0' }));
    add(createElement({ id: 'dynamicFlexConfigGroup', type: 'div', tagName: 'DIV' }));
    add(createElement({ id: 'dynamicFlexAdvancedToggleRow', type: 'div', tagName: 'DIV' }));

    global.document = {
        getElementById(id) {
            return elements.get(id) || null;
        }
    };
    global.localStorage = createLocalStorageMock();

    initDynamicFlexControls({ enableLocalPersistence: false });

    const preset = elements.get('dynamicFlexPreset');
    preset.value = 'konservativ';
    preset.dispatch('change');

    assertEqual(localStorage.getItem('sim_dynamicFlexPreset'), null, 'No sim_* persistence expected when disabled');
    assertEqual(localStorage.getItem('sim_dynamicFlex'), null, 'No sim_* persistence expected when disabled');
} finally {
    if (prevDocument === undefined) delete global.document; else global.document = prevDocument;
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
}

console.log('✅ Simulator Dynamic-Flex persistence test passed');
