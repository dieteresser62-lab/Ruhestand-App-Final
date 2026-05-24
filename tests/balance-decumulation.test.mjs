import { initUIReader, UIReader } from '../app/balance/balance-reader.js';
import { postprocessBalanceAction } from '../app/balance/balance-action-postprocessor.js';
import {
    buildBalanceRendererPayload,
    calculateExpensesBudget,
    enrichBalanceDiagnosisPayload
} from '../app/balance/balance-update-pipeline.js';

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
    mockLocalStorage.setItem('profile_health_bucket', JSON.stringify({
        enabled: true,
        initialAmount: 150000,
        triggerMinGrade: 4
    }));
    const dom = setupDom();
    const result = UIReader.readAllInputs();

    assertEqual(result.decumulation.mode, '3_bucket_jilge', 'Decumulation mode wird gelesen');
    assertEqual(result.decumulation.bondTargetFactor, 4.5, 'Bond target factor ist flach gespeichert');
    assertEqual(result.decumulation.drawdownTrigger, 18, 'Drawdown trigger ist flach gespeichert');
    assertEqual(result.decumulation.bondRefillThreshold, 12, 'Bond refill threshold ist flach gespeichert');
    assert(!('threeBucket' in result.decumulation), 'Es wird kein verschachteltes threeBucket-Objekt mehr erzeugt');
    assertEqual(result.healthBucket.enabled, true, 'Balance liest Pflegebucket aus dem Profil');
    assertEqual(result.healthBucketInitialAmount, 150000, 'Balance stellt flachen Pflegebucket-Betrag bereit');
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

console.log('Test 4: Balance-Update-Pipeline-Helfer bauen Payloads ohne Seiteneffekte');
{
    const modelResult = {
        ui: {
            action: { transactionDiagnostics: { source: 'engine' } },
            vpw: { rate: 0.04 },
            spending: { monatlicheEntnahme: 1800 }
        },
        diagnosis: {
            keyParams: {
                cumulativeInflationFactor: 1.2
            }
        }
    };
    const input = {
        aktuellesAlter: 67,
        tagesgeld: 50000,
        geldmarktEtf: 120000,
        healthBucket: { enabled: true, initialAmount: 150000, targetMode: 'inflation_indexed_diagnostic' }
    };
    const rendererPayload = buildBalanceRendererPayload(modelResult, input);
    assertEqual(rendererPayload.input, input, 'Renderer-Payload referenziert Input');
    assertEqual(rendererPayload.spending.monatlicheEntnahme, 1800, 'Renderer-Payload behält UI-Daten');
    assertEqual(rendererPayload.healthBucketDiagnostics.lockedAmount, 150000, 'Renderer-Payload enthält Pflegebucket-Zweckbindung');
    assertEqual(rendererPayload.healthBucketDiagnostics.operativeLiquidity, 20000, 'Renderer-Payload zeigt operative Liquidität nach Zweckbindung');

    const diagnosis = enrichBalanceDiagnosisPayload({
        formattedDiagnosis: { keyParams: {} },
        modelResult,
        inputData: input,
        threeBucketDiagnosis: { is3Bucket: true }
    });
    assertEqual(diagnosis.transactionDiagnostics.source, 'engine', 'Diagnose übernimmt Transaction Diagnostics');
    assertEqual(diagnosis.keyParams.vpw.rate, 0.04, 'Diagnose übernimmt VPW-Daten');
    assertEqual(diagnosis.keyParams.healthBucket.lockedAmount, 150000, 'Diagnose übernimmt Pflegebucket-Daten');
    assertEqual(diagnosis.threeBucket.is3Bucket, true, 'Diagnose übernimmt 3-Bucket-Daten');

    const budget = calculateExpensesBudget({ fixedIncomeAnnual: 12000, monthlyWithdrawal: 1800 });
    assertEqual(budget.monthlyBudget, 2800, 'Ausgabenbudget addiert fixe Einkünfte pro Monat');
    assertEqual(budget.annualBudget, 33600, 'Jahresbudget leitet sich aus Monatsbudget ab');
}

console.log('Test 5: Action-Postprocessor merged Profilverbund ohne 3-Bucket');
{
    const modelResult = { ui: { action: { type: 'NONE' } } };
    const runs = [{ ui: { action: { type: 'TRANSACTION', nettoErlös: 1000 } } }];
    const result = postprocessBalanceAction({
        inputData: { decumulation: { mode: 'standard' } },
        modelResult,
        profilverbundRuns: runs,
        mergeProfilverbundActions: (receivedRuns) => ({
            type: receivedRuns[0].ui.action.type,
            nettoErlös: receivedRuns[0].ui.action.nettoErlös
        })
    });
    assertEqual(modelResult.ui.action.type, 'TRANSACTION', 'Postprocessor ersetzt Action durch Profilverbund-Merge');
    assertEqual(modelResult.ui.action.nettoErlös, 1000, 'Postprocessor übernimmt Merge-Ergebnis');
    assertEqual(result.threeBucketDiagnosis, null, 'Ohne 3-Bucket gibt es keine 3-Bucket-Diagnose');
}

console.log('--- Balance Decumulation Tests Completed ---');

global.document = originalDocument;
global.localStorage = originalLocalStorage;
