import { createInflationHandlers } from '../app/balance/balance-annual-inflation.js';
import { initUIReader } from '../app/balance/balance-reader.js';
import { StorageManager } from '../app/balance/balance-storage.js';
import { CONFIG } from '../app/balance/balance-config.js';
import { UIUtils } from '../app/balance/balance-utils.js';

console.log('--- Balance Annual Inflation Tests ---');

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

const prevLocalStorage = global.localStorage;
const prevDocument = global.document;

try {
    global.localStorage = createLocalStorageMock();
    global.document = {
        getElementById: (id) => {
            const defaults = {
                runwayMinMonths: { value: '24' },
                runwayTargetMonths: { value: '36' },
                minCashBufferMonths: { value: '2' },
                targetEq: { value: '60' }
            };
            return defaults[id] || { value: '0' };
        }
    };

    const dom = {
        inputs: {
            aktuellesAlter: { value: '60' },
            inflation: { value: '2' },
            floorBedarf: { value: '1000' },
            flexBedarf: { value: '500' },
            flexBudgetAnnual: { value: '300' },
            flexBudgetRecharge: { value: '200' }
        },
        controls: {}
    };

    initUIReader(dom);
    const handlers = createInflationHandlers({
        dom,
        update: () => {},
        debouncedUpdate: () => {}
    });

    // --- TEST 1: Kumulative Inflation 2% über 10 Jahre -> ~1.22 ---
    {
        const baseState = { lastState: { cumulativeInflationFactor: 1, lastInflationAppliedAtAge: 60 } };
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify(baseState));

        // Jährlich erhöhen (Alter 61..70) -> Faktor ~1.219.
        for (let age = 61; age <= 70; age++) {
            dom.inputs.aktuellesAlter.value = String(age);
            dom.inputs.inflation.value = '2';
            handlers.applyAnnualInflation();
        }
        const state = StorageManager.loadState();
        const factor = state.lastState.cumulativeInflationFactor;
        assertClose(factor, 1.219, 0.01, 'Cumulative inflation should be ~1.22 after 10 years at 2%');
    }

    // --- TEST 2: Spending adjustment with cumulative inflation ---
    {
        dom.inputs.floorBedarf.value = '1000';
        dom.inputs.flexBedarf.value = '500';
        dom.inputs.flexBudgetAnnual.value = '300';
        dom.inputs.flexBudgetRecharge.value = '200';
        dom.inputs.inflation.value = '2';
        handlers.applyInflationToBedarfe();
        // Inputs werden im DOM angepasst (Strings), dann geparst.
        const floor = UIUtils.parseCurrency(dom.inputs.floorBedarf.value);
        const flex = UIUtils.parseCurrency(dom.inputs.flexBedarf.value);
        assertClose(floor, 1020, 0.01, 'Floor should be adjusted by inflation');
        assertClose(flex, 510, 0.01, 'Flex should be adjusted by inflation');
    }

    // --- TEST 3: Negative inflation handled (no reduction) ---
    {
        const baseState = { lastState: { cumulativeInflationFactor: 1.1, lastInflationAppliedAtAge: 70 } };
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify(baseState));
        dom.inputs.aktuellesAlter.value = '71';
        dom.inputs.inflation.value = '-5';
        handlers.applyAnnualInflation();
        const state = StorageManager.loadState();
        assertClose(state.lastState.cumulativeInflationFactor, 1.1, 0.0001, 'Negative inflation should not reduce factor');
    }

    // --- TEST 4: lastInflationAppliedAtAge updated ---
    {
        const baseState = { lastState: { cumulativeInflationFactor: 1, lastInflationAppliedAtAge: 71 } };
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify(baseState));
        dom.inputs.aktuellesAlter.value = '72';
        dom.inputs.inflation.value = '1';
        handlers.applyAnnualInflation();
        const state = StorageManager.loadState();
        assertEqual(state.lastState.lastInflationAppliedAtAge, 72, 'lastInflationAppliedAtAge should update');
    }

    // --- TEST 5: Inflation data loaded from storage ---
    {
        const baseState = { lastState: { cumulativeInflationFactor: 1.5, lastInflationAppliedAtAge: 72 } };
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify(baseState));
        dom.inputs.aktuellesAlter.value = '73';
        dom.inputs.inflation.value = '2';
        handlers.applyAnnualInflation();
        const state = StorageManager.loadState();
        assertClose(state.lastState.cumulativeInflationFactor, 1.53, 0.001, 'Stored factor should be used and updated');
    }

    console.log('✅ Balance annual inflation tests passed');
} finally {
    if (prevDocument === undefined) delete global.document; else global.document = prevDocument;
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
}

console.log('--- Balance Annual Inflation Tests Completed ---');
