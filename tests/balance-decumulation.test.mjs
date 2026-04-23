import { initUIReader, UIReader } from '../app/balance/balance-reader.js';

console.log('--- Balance Decumulation Tests ---');

class MockLocalStorage {
    constructor() {
        this.store = new Map();
    }
    getItem(key) {
        return this.store.has(key) ? this.store.get(key) : null;
    }
    setItem(key, value) {
        this.store.set(key, String(value));
    }
    clear() {
        this.store.clear();
    }
}

class MockElement {
    constructor(type = 'input', value = '', checked = false) {
        this.type = type;
        this.value = value;
        this.checked = checked;
        this.disabled = false;
        this.style = { display: '' };
        this.classList = {
            _classes: new Set(),
            contains(cls) { return this._classes.has(cls); },
            add(cls) { this._classes.add(cls); }
        };
    }
}

const mockLocalStorage = new MockLocalStorage();
const originalLocalStorage = global.localStorage;
global.localStorage = mockLocalStorage;

const originalDocument = global.document;
const documentElements = {};
global.document = {
    getElementById(id) {
        return documentElements[id] || null;
    },
    createElement(tag) {
        return new MockElement(tag);
    }
};

function setupDom(inputOverrides = {}) {
    documentElements.threeBucketConfigGroup = new MockElement('div');
    documentElements.runwayMinMonths = new MockElement('input', '24');
    documentElements.runwayTargetMonths = new MockElement('input', '36');
    documentElements.minCashBufferMonths = new MockElement('input', '2');
    documentElements.targetEq = new MockElement('input', '60');
    const dom = {
        inputs: {
            aktuellesAlter: new MockElement('input', '67'),
            floorBedarf: new MockElement('input', '24000'),
            flexBedarf: new MockElement('input', '12000'),
            renteAktiv: new MockElement('select', 'ja'),
            renteMonatlich: new MockElement('input', '1500'),
            entnahmeStrategie: new MockElement('select', '3_bucket_jilge'),
            bondTargetFactor: new MockElement('input', '4.5'),
            drawdownTrigger: new MockElement('input', '18'),
            bondRefillThreshold: new MockElement('input', '12')
        },
        controls: {
            goldPanel: new MockElement('div')
        }
    };
    Object.assign(dom.inputs, inputOverrides);
    initUIReader(dom);
    return dom;
}

console.log('Test 1: readAllInputs liefert flache Decumulation-Felder');
{
    mockLocalStorage.clear();
    const dom = setupDom();
    const result = UIReader.readAllInputs();

    assertEqual(result.decumulation.mode, '3_bucket_jilge', 'Decumulation mode wird gelesen');
    assertEqual(result.decumulation.bondTargetFactor, 4.5, 'Bond target factor ist flach gespeichert');
    assertEqual(result.decumulation.drawdownTrigger, 18, 'Drawdown trigger ist flach gespeichert');
    assertEqual(result.decumulation.bondRefillThreshold, 12, 'Bond refill threshold ist flach gespeichert');
    assert(!('threeBucket' in result.decumulation), 'Es wird kein verschachteltes threeBucket-Objekt mehr erzeugt');
    assertEqual(documentElements.threeBucketConfigGroup.style.display, '', 'Lesen allein verändert die Sichtbarkeit nicht');
    void dom;
}

console.log('Test 2: applyStoredInputs bleibt kompatibel zu altem nested Shape');
{
    mockLocalStorage.clear();
    const dom = setupDom({
        entnahmeStrategie: new MockElement('select', 'standard'),
        bondTargetFactor: new MockElement('input', ''),
        drawdownTrigger: new MockElement('input', ''),
        bondRefillThreshold: new MockElement('input', '')
    });

    UIReader.applyStoredInputs({
        decumulation: {
            mode: '3_bucket_jilge',
            threeBucket: {
                bondTargetFactor: 6,
                drawdownTrigger: 22,
                bondRefillThresholdPct: 8
            }
        }
    });

    assertEqual(dom.inputs.entnahmeStrategie.value, '3_bucket_jilge', 'Legacy mode wird geladen');
    assertEqual(dom.inputs.bondTargetFactor.value, 6, 'Legacy bond target factor wird geladen');
    assertEqual(dom.inputs.drawdownTrigger.value, 22, 'Legacy drawdown trigger wird geladen');
    assertEqual(dom.inputs.bondRefillThreshold.value, 8, 'Legacy refill threshold wird geladen');
    assertEqual(documentElements.threeBucketConfigGroup.style.display, 'grid', '3-Bucket-Konfiguration wird sichtbar');
}

console.log('Test 3: applyStoredInputs lädt auch den neuen flachen Shape');
{
    mockLocalStorage.clear();
    const dom = setupDom({
        entnahmeStrategie: new MockElement('select', 'standard'),
        bondTargetFactor: new MockElement('input', ''),
        drawdownTrigger: new MockElement('input', ''),
        bondRefillThreshold: new MockElement('input', '')
    });

    UIReader.applyStoredInputs({
        decumulation: {
            mode: '3_bucket_jilge',
            bondTargetFactor: 5,
            drawdownTrigger: 17,
            bondRefillThreshold: 9
        }
    });

    assertEqual(dom.inputs.bondTargetFactor.value, 5, 'Neuer bond target factor wird geladen');
    assertEqual(dom.inputs.drawdownTrigger.value, 17, 'Neuer drawdown trigger wird geladen');
    assertEqual(dom.inputs.bondRefillThreshold.value, 9, 'Neuer refill threshold wird geladen');
    assertEqual(documentElements.threeBucketConfigGroup.style.display, 'grid', '3-Bucket bleibt sichtbar');
}

console.log('--- Balance Decumulation Tests Completed ---');

global.document = originalDocument;
global.localStorage = originalLocalStorage;
