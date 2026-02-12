import { initUIReader, UIReader } from '../app/balance/balance-reader.js';
import { CONFIG } from '../app/balance/balance-config.js';

console.log('--- Balance Dynamic Flex Gate Tests ---');

function createLocalStorageMock() {
    const store = new Map();
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => { store.set(String(key), String(value)); },
        removeItem: (key) => { store.delete(String(key)); },
        clear: () => { store.clear(); }
    };
}

function createInput(value = '', checked = false) {
    return {
        value: String(value),
        checked,
        classList: { contains: () => false }
    };
}

const prevLocalStorage = global.localStorage;
const prevDocument = global.document;

try {
    global.localStorage = createLocalStorageMock();
    global.document = {
        getElementById: (id) => {
            const map = {
                runwayMinMonths: { value: '24' },
                runwayTargetMonths: { value: '36' },
                minCashBufferMonths: { value: '2' },
                targetEq: { value: '60' }
            };
            return map[id] || { value: '0' };
        }
    };

    const dom = {
        inputs: {
            aktuellesAlter: createInput('65'),
            floorBedarf: createInput('24000'),
            flexBedarf: createInput('12000'),
            inflation: createInput('2'),
            dynamicFlex: createInput('', true),
            marketCapeRatio: createInput('0'),
            horizonMethod: createInput('survival_quantile'),
            horizonYears: createInput('30'),
            survivalQuantile: createInput('0.85'),
            goGoActive: createInput('', false),
            goGoMultiplier: createInput('1.0')
        },
        controls: {}
    };

    initUIReader(dom);

    // Test 1: Dynamic Flex should be gated off when no CAPE is available.
    {
        localStorage.clear();
        dom.inputs.marketCapeRatio.value = '0';
        const inputs = UIReader.readAllInputs();
        assertEqual(inputs.dynamicFlex, false, 'dynamicFlex should be disabled without CAPE anchor');
    }

    // Test 2: Dynamic Flex should activate with direct CAPE input.
    {
        localStorage.clear();
        dom.inputs.marketCapeRatio.value = '28.3';
        const inputs = UIReader.readAllInputs();
        assertEqual(inputs.dynamicFlex, true, 'dynamicFlex should be enabled with direct CAPE input');
        assertClose(inputs.capeRatio, 28.3, 1e-9, 'capeRatio should use direct input');
    }

    // Test 3: Dynamic Flex should activate with persisted CAPE fallback.
    {
        dom.inputs.marketCapeRatio.value = '0';
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({
            capeMeta: { capeRatio: 31.1, capeAsOf: '2024-12-01' }
        }));
        const inputs = UIReader.readAllInputs();
        assertEqual(inputs.dynamicFlex, true, 'dynamicFlex should be enabled with persisted CAPE fallback');
        assertClose(inputs.capeRatio, 31.1, 1e-9, 'capeRatio should use persisted fallback');
    }

    console.log('✅ Balance dynamic flex gate tests passed');
} finally {
    if (prevDocument === undefined) delete global.document; else global.document = prevDocument;
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
}

console.log('--- Balance Dynamic Flex Gate Tests Completed ---');
