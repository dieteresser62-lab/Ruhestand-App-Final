"use strict";

/**
 * Tests für auto_optimize.js und zugehörige Module
 * - Latin Hypercube Sampling
 * - Nachbarschafts-Generierung
 * - Kandidaten-Validierung
 * - Constraint-Prüfung
 * - Objective-Extraktion
 * - Cache-Funktionalität
 * - Tie-Breaker-Logik
 * - Haupt-Optimierungsfunktion
 */

console.log('--- Auto-Optimizer Tests ---');

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

function createDocumentStub() {
    const controls = {
        mcBlockSize: { value: '7' },
        mcAnzahl: { value: '10000' },
        mcDauer: { value: '35' },
        mcSeed: { value: '12345' },
        mcMethode: { value: 'stationary' },
        rngMode: { value: 'per-run-seed' },
        mcStartYearMode: { value: 'RECENCY' },
        mcStartYearFilter: { value: '1980' },
        mcStartYearHalfLife: { value: '15' },
        mcExcludeEstimatedHistory: { checked: true },
        useCapeSampling: { checked: true },
        liquidityRunwayYears: { value: '5' },
        rebalancingBand: { value: '25' },
        maxSkimPctOfEq: { value: '10' },
        maxBearRefillPctOfEq: { value: '5' },
        dynamicFlex: { checked: false },
        horizonMethod: { value: 'survival_quantile' },
        horizonYears: { value: '30' },
        survivalQuantile: { value: '0.85' },
        goGoActive: { checked: false },
        goGoMultiplier: { value: '1' }
    };
    return {
        getElementById: id => controls[id] || ({ value: '0', checked: false })
    };
}

const prevDocument = global.document;
const prevLocalStorage = global.localStorage;
const prevWindow = global.window;

try {
    global.document = createDocumentStub();
    global.localStorage = createLocalStorageMock();
    global.window = {};

    // Importiere Module
    const { latinHypercubeSample, generateNeighborsReduced } = await import('../app/simulator/auto-optimize-sampling.js');
    const {
        createAutoOptimizeParameterFingerprint,
        createAutoOptimizeRequestFingerprint,
        isAutoOptimizeCandidateValid: isValidCandidate
    } = await import('../app/simulator/auto-optimize-param-meta.js');
    const {
        AUTO_OPTIMIZE_METRIC_RESULT_VERSION,
        checkConstraints,
        getObjectiveValue
    } = await import('../app/simulator/auto-optimize-metrics.js');
    const { CandidateCache, tieBreaker } = await import('../app/simulator/auto-optimize-utils.js');
    const { applyChampionToForm } = await import('../app/simulator/auto-optimize-apply.js');
    const { readAutoOptimizeConfigFromUI } = await import('../app/simulator/auto-optimize-config-ui.js');
    const { AUTO_OPTIMIZE_PRESETS } = await import('../app/simulator/auto-optimize-presets.js');
    const {
        appendAutoOptimizeApplySuccess,
        createAutoOptimizeParameterBlock,
        formatAutoOptimizeProgress,
        renderAutoOptimizeResult
    } = await import('../app/simulator/auto-optimize-renderer.js');
    const { rng } = await import('../app/simulator/simulator-utils.js');
    const {
        AUTO_OPTIMIZE_VALIDATION_STATUS_VOCABULARY,
        buildAutoOptimizeModelStatus,
        runAutoOptimize
    } = await import('../app/simulator/auto_optimize.js');
    const createVersionedMetricResult = (overrides = {}) => ({
        metricContract: { schemaVersion: AUTO_OPTIMIZE_METRIC_RESULT_VERSION },
        medianEndWealth: 500000,
        successProbFloor: 1,
        depletionRate: 0,
        worst5Drawdown: 0,
        timeShareWRgt45: 0,
        medianWithdrawalRate: 0,
        ...overrides
    });

    // ========== Auto-Optimize UI Helper Tests ==========

    // Test 0a: Presets bleiben DOM-frei importierbar
    console.log('Test 0a: UI presets importierbar');
    {
        assert(AUTO_OPTIMIZE_PRESETS.standard.params.length === 3, 'Standard-Preset sollte drei Parameter enthalten');
        assert(AUTO_OPTIMIZE_PRESETS.dynamicFlexBalanced.dynamicFlexMode === 'force_on', 'Dynamic-Flex-Preset sollte Force-On setzen');
        assert(
            !Object.values(AUTO_OPTIMIZE_PRESETS).some(
                preset => preset.params.some(parameter => parameter.key === 'maxBearRefillPct')
            ),
            'Presets sollten die nachweislich wirkungslose Bear-Refill-Dimension nicht anbieten'
        );
        assert(
            !AUTO_OPTIMIZE_PRESETS.dynamicFlexBalanced.params.some(parameter => parameter.key === 'survivalQuantile'),
            'Dynamic-Flex-Preset sollte auch bei Horizon-Methode mean anwendbar bleiben'
        );
    }
    console.log('✓ UI presets OK');

    // Test 0b: Config-Reader liest DOM-Mock und validiert Dynamic-Flex-Modus
    console.log('Test 0b: UI config reader');
    {
        const paramBlock = {
            querySelector(selector) {
                const values = {
                    '.ao-param-key': { value: 'survivalQuantile' },
                    '.ao-param-min': { value: '0.80' },
                    '.ao-param-max': { value: '0.92' },
                    '.ao-param-step': { value: '0.01' }
                };
                return values[selector] || null;
            }
        };
        const controls = {
            ao_metric: { value: 'EndWealth_P50' },
            ao_direction: { value: 'max' },
            ao_quantile: { value: '50' },
            ao_parameters_container: { querySelectorAll: () => [paramBlock] },
            ao_runs_per_candidate: { value: '2000' },
            ao_seeds_train: { value: '5' },
            ao_seeds_test: { value: '2' },
            ao_c_sr99: { checked: true },
            ao_c_noex: { checked: true },
            ao_c_ts45: { checked: false },
            ao_c_dd55: { checked: false },
            ao_dynamic_flex_mode: { value: 'force_on' },
            dynamicFlex: { checked: false }
        };
        const doc = { getElementById: (id) => controls[id] || null };
        const config = readAutoOptimizeConfigFromUI(doc);
        assertEqual(config.params.survivalQuantile.min, 0.8, 'Config-Reader sollte Param-Min lesen');
        assertEqual(config.dynamicFlexMode, 'force_on', 'Config-Reader sollte Dynamic-Flex-Modus normalisieren');

        controls.ao_dynamic_flex_mode.value = 'inherit';
        let dynamicFlexError = null;
        try {
            readAutoOptimizeConfigFromUI(doc);
        } catch (err) {
            dynamicFlexError = err;
        }
        assert(dynamicFlexError && /Dynamic-Flex Parameter/.test(dynamicFlexError.message), 'Dynamic-Flex-Parameter sollten bei effektiv AUS abgelehnt werden');
    }
    console.log('✓ UI config reader OK');

    // Test 0c: Progress-Formatter und Apply-Mapping
    console.log('Test 0c: UI renderer/apply helpers');
    {
        assert(
            formatAutoOptimizeProgress({ stage: 'quick_filter', progress: 5, total: 10 }).includes('50%'),
            'Progress-Formatter sollte Prozent anzeigen'
        );

        const events = [];
        const controls = {
            dynamicFlex: { checked: true },
            horizonMethod: { value: 'survival_quantile' },
            liquidityRunwayYears: { value: '', dispatchEvent: (event) => events.push(['liquidityRunwayYears', event.type]) },
            goGoMultiplier: { value: '', dispatchEvent: (event) => events.push(['goGoMultiplier', event.type]) },
            goGoActive: { checked: false, dispatchEvent: (event) => events.push(['goGoActive', event.type]) }
        };
        const doc = { getElementById: (id) => controls[id] || null };
        const championCfg = { liquidityRunwayYears: 5, goGoMultiplier: 1.1 };
        Object.defineProperties(championCfg, {
            __autoOptimizeParameterFingerprint: {
                value: createAutoOptimizeParameterFingerprint(championCfg),
                enumerable: false
            },
            __autoOptimizeRequestFingerprint: {
                value: createAutoOptimizeRequestFingerprint(championCfg),
                enumerable: false
            }
        });
        applyChampionToForm({
            championCfg,
            doc,
            EventCtor: class {
                constructor(type) {
                    this.type = type;
                }
            }
        });
        assertEqual(controls.liquidityRunwayYears.value, 5, 'Apply sollte den kanonischen Runway auf das Formularfeld schreiben');
        assertEqual(controls.goGoActive.checked, true, 'Apply sollte goGoActive bei goGoMultiplier aktivieren');
        assert(events.some(([id]) => id === 'goGoActive'), 'Apply sollte Change-Events dispatchen');

        const dataFilter = {
            startYearMode: 'FILTER',
            startYearFilter: 1950,
            startYearHalfLife: 20,
            excludeEstimatedHistory: true
        };
        const modelStatus = buildAutoOptimizeModelStatus({
            evaluationContract: {
                schemaVersion: 'AutoOptimizeEvaluationContractV1',
                dataFilter
            }
        });
        const resultEl = {
            innerHTML: '',
            style: {},
            appendChild(node) {
                this.appended = node;
            }
        };
        renderAutoOptimizeResult({
            resultEl,
            objective: { metric: 'EndWealth_P50' },
            result: {
                modelStatus,
                championCfg: { liquidityRunwayYears: 5 },
                metricsTest: createVersionedMetricResult(),
                deltaVsCurrent: {
                    successRate: 0,
                    drawdownP90: 0,
                    endWealthP50: 0,
                    timeShareWRgt45: 0
                },
                stability: 0.9,
                parameterFidelity: { requestFingerprint: 'request-test' },
                optimizationContext: {
                    dynamicFlexMode: 'inherit',
                    dynamicFlexActive: false,
                    safetyGuardsActive: false,
                    evaluationContract: {
                        dataFilter,
                        monteCarloParameters: {
                            methode: 'stationary',
                            rngMode: 'per-run-seed',
                            anzahl: 10,
                            blockSize: 5
                        },
                        seedContract: {
                            trainSeeds: [1, 2],
                            confirmationSeeds: [3]
                        },
                        fixedModelAssumptions: {
                            capeRatio: 30,
                            stressPreset: 'NONE',
                            horizonMethod: 'survival_quantile',
                            maxDauer: 25
                        },
                        useCapeSampling: false
                    }
                }
            }
        });
        assert(resultEl.innerHTML.includes('Experimenteller Szenariokandidat'),
            'Ergebnisansicht sollte den Experimentstatus sichtbar wiederholen');
        assert(resultEl.innerHTML.includes('keine Finanzempfehlung'),
            'Ergebnisansicht sollte den Nicht-Empfehlungsvorbehalt sichtbar wiederholen');
        assert(resultEl.innerHTML.includes('AutoOptimizeModelStatusV1'),
            'Ergebnisansicht sollte das Modellstatusschema rendern');
        assert(resultEl.innerHTML.includes(modelStatus.dataVersion.annualDataHash),
            'Ergebnisansicht sollte den Jahresdatenhash rendern');
        assert(resultEl.innerHTML.includes(modelStatus.dataVersion.regimeHash),
            'Ergebnisansicht sollte den Regimehash rendern');
        assert(
            resultEl.innerHTML.includes('technically_tested')
                && resultEl.innerHTML.includes('partially_plausibilized')
                && resultEl.innerHTML.includes('not_validated'),
            'Ergebnisansicht sollte alle drei getrennten Validierungsachsen rendern'
        );
        assert(
            resultEl.innerHTML.includes('Startjahr 1950')
                && resultEl.innerHTML.includes('geschaetzte Historie ausgeschlossen'),
            'Ergebnisansicht sollte die effektive Datenauswahl zusammen mit den Datenhashes rendern'
        );

        const previousSetTimeout = global.setTimeout;
        global.setTimeout = () => 0;
        try {
            appendAutoOptimizeApplySuccess({
                resultEl,
                doc: {
                    createElement() {
                        return { style: {}, textContent: '', remove() { } };
                    }
                }
            });
        } finally {
            global.setTimeout = previousSetTimeout;
        }
        assert(
            resultEl.appended.textContent.includes('Experimenteller Szenariokandidat')
                && resultEl.appended.textContent.includes('keine Finanzempfehlung'),
            'Apply-Bestaetigung sollte Experiment- und Nicht-Empfehlungsvorbehalt wiederholen'
        );
        assertEqual(
            AUTO_OPTIMIZE_VALIDATION_STATUS_VOCABULARY.technical.matrixValue,
            'ja',
            'technischer Laufzeitcode sollte auf das Matrixvokabular abgebildet sein'
        );
    }
    console.log('✓ UI renderer/apply helpers OK');

    // Test 0d: Neue Parameterbloecke verwenden Registry-Domains
    console.log('Test 0d: UI renderer domain defaults');
    {
        class FakeControl {
            constructor() {
                this.value = '';
                this.min = '';
                this.max = '';
                this.step = '';
                this.listeners = {};
            }
            addEventListener(type, listener) {
                this.listeners[type] = listener;
            }
            dispatch(type) {
                this.listeners[type]?.();
            }
        }
        const controls = {
            '.ao-param-key': new FakeControl(),
            '.ao-param-min': new FakeControl(),
            '.ao-param-max': new FakeControl(),
            '.ao-param-step': new FakeControl()
        };
        const parseAttribute = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? '';
        const doc = {
            createElement() {
                return {
                    style: {},
                    set innerHTML(markup) {
                        for (const [selector, control] of Object.entries(controls)) {
                            const className = selector.slice(1);
                            const tag = markup.match(new RegExp(`<[^>]+class="${className}"[^>]*>`, 's'))?.[0] || '';
                            control.value = parseAttribute(tag, 'value');
                            control.min = parseAttribute(tag, 'min');
                            control.max = parseAttribute(tag, 'max');
                            control.step = parseAttribute(tag, 'step');
                        }
                        controls['.ao-param-key'].value = markup.match(
                            /<option value="([^"]+)" selected>/
                        )?.[1] || markup.match(/<option value="([^"]+)"/)?.[1] || '';
                    },
                    querySelector(selector) {
                        return controls[selector] || null;
                    }
                };
            }
        };
        createAutoOptimizeParameterBlock({ paramId: 1, paramNumber: 1, doc });
        assertEqual(Number(controls['.ao-param-min'].value), 1,
            'neuer Parameterblock sollte mit dem kanonischen Runway-Minimum starten');
        assertEqual(Number(controls['.ao-param-max'].value), 10,
            'neuer Parameterblock sollte mit dem kanonischen Runway-Maximum starten');

        controls['.ao-param-key'].value = 'survivalQuantile';
        controls['.ao-param-key'].dispatch('change');
        assertEqual(Number(controls['.ao-param-min'].value), 0.5,
            'Parameterwechsel sollte das vollständige Quantilminimum setzen');
        assertEqual(Number(controls['.ao-param-max'].value), 0.99,
            'Parameterwechsel sollte das vollständige Quantilmaximum setzen');
        assertEqual(Number(controls['.ao-param-step'].value), 0.01,
            'Parameterwechsel sollte die Registry-Schrittweite setzen');
    }
    console.log('✓ UI renderer domain defaults OK');

    // ========== Latin Hypercube Sampling Tests ==========

    // Test 1: LHS - Grundfunktionalität
    console.log('Test 1: LHS - Grundfunktionalität');
    {
        const rand = rng(42);
        const ranges = {
            liquidityRunwayYears: { min: 1, max: 10, step: 0.5 }
        };

        // Erwartung: LHS liefert gleichmäßig verteilte Samples im Range.
        const samples = latinHypercubeSample(ranges, 10, rand);

        assert(samples.length === 10, 'LHS sollte 10 Samples liefern');
        assert(samples.every(s => typeof s.liquidityRunwayYears === 'number'), 'Alle Samples sollten den kanonischen Runway haben');
        assert(samples.every(s => s.liquidityRunwayYears >= 1 && s.liquidityRunwayYears <= 10), 'Alle Werte sollten in Range liegen');
    }
    console.log('✓ LHS Grundfunktionalität OK');

    // Test 2: LHS - Multi-Parameter
    console.log('Test 2: LHS - Multi-Parameter');
    {
        const rand = rng(123);
        const ranges = {
            liquidityRunwayYears: { min: 1, max: 10, step: 0.5 },
            goldRebalancingBand: { min: 10, max: 40, step: 1 },
            goldTargetPct: { min: 0, max: 15, step: 1 }
        };

        const samples = latinHypercubeSample(ranges, 20, rand);

        assert(samples.length === 20, 'LHS sollte 20 Samples liefern');
        assert(samples.every(s => 'liquidityRunwayYears' in s && 'goldRebalancingBand' in s && 'goldTargetPct' in s),
            'Alle Samples sollten alle Parameter haben');
    }
    console.log('✓ LHS Multi-Parameter OK');

    // Test 3: LHS - Step-Rounding
    console.log('Test 3: LHS - Step-Rounding');
    {
        const rand = rng(999);
        const ranges = {
            liquidityRunwayYears: { min: 1, max: 10, step: 0.5 }
        };

        // Alle Samples müssen auf dem Step-Grid landen.
        const samples = latinHypercubeSample(ranges, 50, rand);

        // Alle Werte sollten durch Step teilbar sein
        const validSteps = samples.every(s => Math.abs((s.liquidityRunwayYears - 1) % 0.5) < 0.0001);
        assert(validSteps, 'Alle Werte sollten auf Step-Grid liegen');
    }
    console.log('✓ LHS Step-Rounding OK');

    // ========== Nachbarschafts-Generierung Tests ==========

    // Test 4: generateNeighborsReduced - Basis
    console.log('Test 4: generateNeighborsReduced - Basis');
    {
        const candidate = { liquidityRunwayYears: 5, goldRebalancingBand: 25 };
        const ranges = {
            liquidityRunwayYears: { min: 1, max: 10, step: 0.5 },
            goldRebalancingBand: { min: 0, max: 100, step: 1 }
        };

        const neighbors = generateNeighborsReduced(candidate, ranges);

        assert(neighbors.length > 0, 'Sollte Nachbarn generieren');
        assert(neighbors.every(n => n.liquidityRunwayYears !== undefined && n.goldRebalancingBand !== undefined),
            'Alle Nachbarn sollten alle Parameter haben');
    }
    console.log('✓ generateNeighborsReduced Basis OK');

    // Test 5: generateNeighborsReduced - Respektiert Grenzen
    console.log('Test 5: generateNeighborsReduced - Respektiert Grenzen');
    {
        const candidate = { liquidityRunwayYears: 1 }; // Am Minimum
        const ranges = {
            liquidityRunwayYears: { min: 1, max: 10, step: 0.5 }
        };

        // Nachbarn dürfen nicht unter das Minimum fallen.
        const neighbors = generateNeighborsReduced(candidate, ranges);

        // Kein Nachbar sollte unter 20 sein
        assert(neighbors.every(n => n.liquidityRunwayYears >= 1), 'Kein Nachbar sollte unter Minimum sein');
    }
    console.log('✓ generateNeighborsReduced Grenzen OK');

    // ========== Kandidaten-Validierung Tests ==========

    // Test 6: isValidCandidate - Gültiger Kandidat
    console.log('Test 6: isValidCandidate - Gültiger Kandidat');
    {
        const candidate = {
            liquidityRunwayYears: 5,
            goldRebalancingBand: 25,
            goldTargetPct: 5
        };

        assert(isValidCandidate(candidate, 10), 'Gültiger Kandidat sollte akzeptiert werden');
    }
    console.log('✓ isValidCandidate Gültiger Kandidat OK');

    // Test 7: isValidCandidate - Runway-Domain verletzt
    console.log('Test 7: isValidCandidate - Runway-Domain');
    {
        assert(!isValidCandidate({ liquidityRunwayYears: 0.5 }, 10), 'Runway unter einem Jahr sollte abgelehnt werden');
        assert(!isValidCandidate({ liquidityRunwayYears: 10.5 }, 10), 'Runway über zehn Jahren sollte abgelehnt werden');
    }
    console.log('✓ isValidCandidate Runway-Domain OK');

    // Test 8: isValidCandidate - Gold-Cap überschritten
    console.log('Test 8: isValidCandidate - Gold-Cap');
    {
        const candidate = { goldTargetPct: 15 };
        const goldCap = 10;

        assert(!isValidCandidate(candidate, goldCap), 'Kandidat mit goldTargetPct > Cap sollte abgelehnt werden');
    }
    console.log('✓ isValidCandidate Gold-Cap OK');

    // Test 9: isValidCandidate - Negative Werte
    console.log('Test 9: isValidCandidate - Negative Werte');
    {
        assert(!isValidCandidate({ liquidityRunwayYears: -10 }, 10), 'Negativer Runway sollte abgelehnt werden');
        assert(!isValidCandidate({ goldRebalancingBand: -5 }, 10), 'Negatives Gold-Rebalancing-Band sollte abgelehnt werden');
        assert(!isValidCandidate({ goldTargetPct: -1 }, 10), 'Negativer goldTargetPct sollte abgelehnt werden');
    }
    console.log('✓ isValidCandidate Negative Werte OK');

    // Test 10: isValidCandidate - Grenzen überschritten
    console.log('Test 10: isValidCandidate - Grenzen überschritten');
    {
        assert(!isValidCandidate({ liquidityRunwayYears: 11 }, 10), 'Runway > 10 sollte abgelehnt werden');
        assert(!isValidCandidate({ goldRebalancingBand: 101 }, 10), 'Gold-Rebalancing-Band > 100 sollte abgelehnt werden');
        assert(!isValidCandidate({ maxSkimPct: 51 }, 10), 'maxSkimPct > 50 sollte abgelehnt werden');
        assert(!isValidCandidate({ maxBearRefillPct: 71 }, 10), 'maxBearRefillPct > 70 sollte abgelehnt werden');
    }
    console.log('✓ isValidCandidate Grenzen OK');

    // ========== Constraint-Prüfung Tests ==========

    // Test 11: checkConstraints - Alle erfüllt
    console.log('Test 11: checkConstraints - Alle erfüllt');
    {
        const results = {
            successProbFloor: 1.0,
            depletionRate: 0,
            timeShareWRgt45: 0,
            worst5Drawdown: 0.3
        };

        const constraints = { sr99: true, noex: true, ts45: true, dd55: true };

        assert(checkConstraints(results, constraints), 'Alle Constraints sollten erfüllt sein');
    }
    console.log('✓ checkConstraints Alle erfüllt OK');

    // Test 12: checkConstraints - Success Rate verletzt
    console.log('Test 12: checkConstraints - Success Rate verletzt');
    {
        const results = { successProbFloor: 0.95 }; // < 99%

        assert(!checkConstraints(results, { sr99: true }), 'sr99 Constraint sollte verletzt sein');
    }
    console.log('✓ checkConstraints Success Rate OK');

    // Test 13: checkConstraints - Drawdown verletzt
    console.log('Test 13: checkConstraints - Drawdown verletzt');
    {
        const results = { worst5Drawdown: 0.6 }; // > 55%

        assert(!checkConstraints(results, { dd55: true }), 'dd55 Constraint sollte verletzt sein');
    }
    console.log('✓ checkConstraints Drawdown OK');

    // Test 14: checkConstraints - Leere Constraints
    console.log('Test 14: checkConstraints - Leere Constraints');
    {
        const results = { successProbFloor: 0.5, worst5Drawdown: 0.9 };
        const constraints = { sr99: false, noex: false, ts45: false, dd55: false };

        assert(checkConstraints(results, constraints), 'Inaktive Constraints sollten immer erfüllt sein');
    }
    console.log('✓ checkConstraints Leere Constraints OK');

    // ========== Objective-Extraktion Tests ==========

    // Test 15: getObjectiveValue - EndWealth_P50
    console.log('Test 15: getObjectiveValue - EndWealth_P50');
    {
        const results = { medianEndWealth: 500000 };
        const objective = { metric: 'EndWealth_P50', direction: 'max' };

        assertEqual(getObjectiveValue(results, objective), 500000, 'EndWealth_P50 sollte medianEndWealth zurückgeben');
    }
    console.log('✓ getObjectiveValue EndWealth_P50 OK');

    // Test 16: getObjectiveValue - Minimierung (negiert)
    console.log('Test 16: getObjectiveValue - Minimierung');
    {
        const results = { worst5Drawdown: 0.3 };
        const objective = { metric: 'Drawdown_P90', direction: 'min' };

        assertEqual(getObjectiveValue(results, objective), -0.3, 'min-Direction sollte negieren');
    }
    console.log('✓ getObjectiveValue Minimierung OK');

    // Test 17: getObjectiveValue - Unbekannte Metrik
    console.log('Test 17: getObjectiveValue - Unbekannte Metrik');
    {
        let errorThrown = false;
        try {
            getObjectiveValue({}, { metric: 'UnknownMetric', direction: 'max' });
        } catch (e) {
            errorThrown = true;
            assert(e.message.includes('Unknown metric'), 'Fehler sollte "Unknown metric" enthalten');
        }
        assert(errorThrown, 'Unbekannte Metrik sollte Fehler werfen');
    }
    console.log('✓ getObjectiveValue Unbekannte Metrik OK');

    // ========== Cache Tests ==========

    // Test 18: CandidateCache - Basis-Operationen
    console.log('Test 18: CandidateCache - Basis-Operationen');
    {
        const cache = new CandidateCache();

        const candidate = { liquidityRunwayYears: 5, goldRebalancingBand: 25 };
        const results = { medianEndWealth: 500000 };

        assert(!cache.has(candidate), 'Cache sollte initial leer sein');

        cache.set(candidate, results);

        assert(cache.has(candidate), 'Cache sollte Kandidat enthalten');
        assertEqual(cache.get(candidate).medianEndWealth, 500000, 'Cache sollte korrekten Wert zurückgeben');
    }
    console.log('✓ CandidateCache Basis-Operationen OK');

    // Test 19: CandidateCache - Key-Generierung
    console.log('Test 19: CandidateCache - Key-Generierung');
    {
        const cache = new CandidateCache();

        // Gleiche Werte in unterschiedlicher Reihenfolge sollten gleichen Key haben
        const candidate1 = { a: 1, b: 2 };
        const candidate2 = { b: 2, a: 1 };

        cache.set(candidate1, { value: 'test' });

        assert(cache.has(candidate2), 'Kandidaten mit gleichen Werten sollten gleichen Key haben');
    }
    console.log('✓ CandidateCache Key-Generierung OK');

    // ========== Tie-Breaker Tests ==========

    // Test 20: tieBreaker - Höhere Success Rate gewinnt
    console.log('Test 20: tieBreaker - Höhere Success Rate');
    {
        const a = { results: createVersionedMetricResult({ successProbFloor: 0.95 }) };
        const b = { results: createVersionedMetricResult({ successProbFloor: 0.99 }) };

        const result = tieBreaker(a, b);

        assert(result > 0, 'b (höhere SR) sollte gewinnen');
    }
    console.log('✓ tieBreaker Höhere Success Rate OK');

    // Test 21: tieBreaker - Niedrigerer Drawdown bei gleicher SR
    console.log('Test 21: tieBreaker - Niedrigerer Drawdown');
    {
        const a = { results: createVersionedMetricResult({ successProbFloor: 0.99, worst5Drawdown: 0.4 }) };
        const b = { results: createVersionedMetricResult({ successProbFloor: 0.99, worst5Drawdown: 0.3 }) };

        const result = tieBreaker(a, b);

        assert(result > 0, 'a (höherer DD) sollte verlieren');
    }
    console.log('✓ tieBreaker Niedrigerer Drawdown OK');

    // Test 22: tieBreaker - Gleiche Werte
    console.log('Test 22: tieBreaker - Gleiche Werte');
    {
        const a = {
            results: createVersionedMetricResult({
                successProbFloor: 0.99,
                worst5Drawdown: 0.3,
                timeShareWRgt45: 0.01
            })
        };
        const b = {
            results: createVersionedMetricResult({
                successProbFloor: 0.99,
                worst5Drawdown: 0.3,
                timeShareWRgt45: 0.01
            })
        };

        const result = tieBreaker(a, b);

        assertEqual(result, 0, 'Identische Werte sollten 0 ergeben');
    }
    console.log('✓ tieBreaker Gleiche Werte OK');

    // ========== Haupt-Optimierung Test ==========

    // Test 23: runAutoOptimize - Champion nahe Optimum
    console.log('Test 23: runAutoOptimize - Champion nahe Optimum');
    {
        const mockEvaluate = async (candidate, baseInputs) => {
            const runwayYears = Number.isFinite(candidate?.liquidityRunwayYears)
                ? candidate.liquidityRunwayYears
                : (Number.isFinite(baseInputs?.liquidityRunwayYears) ? baseInputs.liquidityRunwayYears : 5);
            const score = 1000 - Math.pow(runwayYears - 5, 2) * 100;
            return createVersionedMetricResult({
                medianEndWealth: score,
                medianWithdrawalRate: 0.03
            });
        };

        const result = await runAutoOptimize({
            objective: { metric: 'EndWealth_P50', direction: 'max' },
            params: {
                liquidityRunwayYears: { min: 1, max: 10, step: 0.5 }
            },
            runsPerCandidate: 20,
            seedsTrain: 2,
            seedsTest: 2,
            constraints: { sr99: false, noex: false, ts45: false, dd55: false },
            maxDauer: 30,
            evaluateCandidateFn: mockEvaluate
        });

        assert(result && result.championCfg, 'Sollte Champion zurückgeben');
        assert(Number.isFinite(result.championCfg.liquidityRunwayYears), 'Champion sollte den kanonischen Runway haben');
        const delta = Math.abs(result.championCfg.liquidityRunwayYears - 5);
        assert(delta <= 1, `Champion sollte nahe Optimum sein (delta ${delta})`);
        assert(result.metricsTest.medianEndWealth > 900, 'Objective sollte nahe Maximum sein');
        const evaluationContract = result.optimizationContext.evaluationContract;
        assertEqual(evaluationContract.monteCarloParameters.methode, 'stationary',
            'Optimizer sollte die MC-Samplingmethode aus dem Hauptvertrag ausweisen');
        assertEqual(evaluationContract.monteCarloParameters.blockSize, 7,
            'Optimizer sollte die MC-Blockgroesse aus dem Hauptvertrag ausweisen');
        assertEqual(evaluationContract.dataFilter.startYearMode, 'RECENCY',
            'Optimizer sollte den MC-Datenfilter aus dem Hauptvertrag ausweisen');
        assertEqual(evaluationContract.dataFilter.startYearHalfLife, 15,
            'Optimizer sollte die MC-Halbwertszeit aus dem Hauptvertrag ausweisen');
        assert(evaluationContract.dataFilter.excludeEstimatedHistory === true,
            'Optimizer sollte den Ausschluss geschaetzter Historie uebernehmen');
        assert(evaluationContract.useCapeSampling === true,
            'Optimizer sollte CAPE-Sampling aus dem Hauptvertrag uebernehmen');
        assert(evaluationContract.seedContract.disjoint === true,
            'Train- und Bestaetigungsseeds sollten disjunkt sein');
        assert(
            evaluationContract.seedContract.trainSeeds.every(
                seed => !evaluationContract.seedContract.confirmationSeeds.includes(seed)
            ),
            'Train- und Bestaetigungsseedmengen sollten keine Ueberschneidung besitzen'
        );
        assertEqual(evaluationContract.source, 'main_monte_carlo_controls',
            'Optimizer sollte den kanonischen Haupt-Control-Lesepfad ausweisen');
    }
    console.log('✓ runAutoOptimize Champion nahe Optimum OK');

    // Test 23b: Ungueltige Rahmendaten stoppen vor der ersten Evaluation
    console.log('Test 23b: runAutoOptimize - Current-Config Preflight');
    {
        const validDocument = global.document;
        let evaluations = 0;
        global.document = {
            getElementById(id) {
                if (id === 'liquidityRunwayYears') return { value: '11' };
                return validDocument.getElementById(id);
            }
        };
        let preflightError = null;
        try {
            await runAutoOptimize({
                objective: { metric: 'EndWealth_P50', direction: 'max' },
                params: { liquidityRunwayYears: { min: 1, max: 10, step: 0.5 } },
                runsPerCandidate: 10,
                seedsTrain: 2,
                seedsTest: 2,
                constraints: {},
                maxDauer: 20,
                evaluateCandidateFn: async () => {
                    evaluations++;
                    return createVersionedMetricResult({
                        medianEndWealth: 1,
                    });
                }
            });
        } catch (error) {
            preflightError = error;
        } finally {
            global.document = validDocument;
        }
        assertEqual(preflightError?.code, 'AUTO_OPTIMIZE_PARAMETER_DOMAIN_INVALID',
            'ungueltige aktuelle Rahmendaten sollten einen konkreten Domainfehler liefern');
        assertEqual(evaluations, 0,
            'ungueltige aktuelle Rahmendaten sollten vor der ersten Kandidatenevaluation stoppen');
    }
    console.log('✓ runAutoOptimize Current-Config Preflight OK');

    // Test 24: runAutoOptimize - Multi-Parameter
    console.log('Test 24: runAutoOptimize - Multi-Parameter');
    {
        const mockEvaluate = async (candidate) => {
            const runway = candidate.liquidityRunwayYears ?? 5;
            const band = candidate.goldRebalancingBand ?? 25;
            // Optimum bei fünf Jahren Runway und 25 Prozent Gold-Band.
            const score = 1000 - Math.pow(runway - 5, 2) * 100 - Math.pow(band - 25, 2);
            return createVersionedMetricResult({
                medianEndWealth: Math.max(0, score),
            });
        };

        const result = await runAutoOptimize({
            objective: { metric: 'EndWealth_P50', direction: 'max' },
            params: {
                liquidityRunwayYears: { min: 1, max: 10, step: 0.5 },
                goldRebalancingBand: { min: 10, max: 40, step: 1 }
            },
            runsPerCandidate: 10,
            seedsTrain: 2,
            seedsTest: 2,
            constraints: {},
            maxDauer: 25,
            evaluateCandidateFn: mockEvaluate
        });

        assert(result && result.championCfg, 'Sollte Champion zurückgeben');
        assert('liquidityRunwayYears' in result.championCfg && 'goldRebalancingBand' in result.championCfg,
            'Champion sollte beide Parameter haben');
        assertEqual(result.modelStatus?.schemaVersion, 'AutoOptimizeModelStatusV1',
            'Auto-Optimize sollte einen versionierten Modellstatus ausgeben');
        assertEqual(result.modelStatus?.methodClassification, 'experimental',
            'Auto-Optimize sollte als experimentelles Verfahren gekennzeichnet sein');
        assertEqual(result.modelStatus?.evaluationMode, 'custom_evaluator',
            'Testhook sollte als benutzerdefinierter Evaluator ausgewiesen sein');
        assertEqual(result.modelStatus?.technicalTestStatus, 'custom_evaluator_not_assessed',
            'Testhook sollte nicht den technischen Status des eingebauten Evaluators erben');
        assertEqual(result.modelStatus?.internalPlausibilityStatus, 'custom_evaluator_not_assessed',
            'Testhook sollte nicht die interne Plausibilisierung des eingebauten Evaluators erben');
        assertEqual(result.modelStatus?.externalValidationStatus, 'not_validated',
            'externe Validierung sollte nicht aus technischen Tests abgeleitet werden');
        assertEqual(result.modelStatus?.decisionUse, 'scenario_comparison_only',
            'Auto-Optimize sollte keine fachliche Empfehlung behaupten');
        assertEqual(result.modelStatus?.dataVersion, null,
            'Testhook sollte keine eingebauten Datenhashes als verwendet ausgeben');
        assertEqual(result.modelStatus?.effectiveDataSelection?.startYearFilter, 1980,
            'Modellstatus sollte die effektive Datenauswahl des Evaluation-Contracts binden');
    }
    console.log('✓ runAutoOptimize Multi-Parameter OK');

    // Test 25: runAutoOptimize - Stability-Metrik
    console.log('Test 25: runAutoOptimize - Stability-Metrik');
    {
        const mockEvaluate = async (candidate) => {
            return createVersionedMetricResult({ worst5Drawdown: 0.2 });
        };

        const result = await runAutoOptimize({
            objective: { metric: 'EndWealth_P50', direction: 'max' },
            params: { liquidityRunwayYears: { min: 4, max: 6, step: 0.5 } },
            runsPerCandidate: 10,
            seedsTrain: 2,
            seedsTest: 2,
            constraints: {},
            maxDauer: 20,
            evaluateCandidateFn: mockEvaluate
        });

        assert(typeof result.stability === 'number', 'Stability sollte Zahl sein');
        assert(result.stability >= 0 && result.stability <= 1, 'Stability sollte zwischen 0 und 1 liegen');
    }
    console.log('✓ runAutoOptimize Stability-Metrik OK');

    // Test 26: runAutoOptimize - Delta vs Current
    console.log('Test 26: runAutoOptimize - Delta vs Current');
    {
        const mockEvaluate = async (candidate) => {
            const runway = candidate.liquidityRunwayYears ?? 5;
            return createVersionedMetricResult({
                medianEndWealth: runway * 100000,
                successProbFloor: 0.95 + runway / 1000,
                worst5Drawdown: 0.5 - runway / 200,
                timeShareWRgt45: 0.01
            });
        };

        const result = await runAutoOptimize({
            objective: { metric: 'EndWealth_P50', direction: 'max' },
            params: { liquidityRunwayYears: { min: 1, max: 10, step: 0.5 } },
            runsPerCandidate: 10,
            seedsTrain: 2,
            seedsTest: 2,
            constraints: {},
            maxDauer: 20,
            evaluateCandidateFn: mockEvaluate
        });

        assert(result.deltaVsCurrent !== undefined, 'deltaVsCurrent sollte vorhanden sein');
        assert('successRate' in result.deltaVsCurrent, 'Delta sollte successRate enthalten');
        assert('endWealthP50' in result.deltaVsCurrent, 'Delta sollte endWealthP50 enthalten');
    }
    console.log('✓ runAutoOptimize Delta vs Current OK');

    // Test 27: runAutoOptimize - Dynamic-Flex Modus (Stufe A)
    console.log('Test 27: runAutoOptimize - Dynamic-Flex Modus (Stufe A)');
    {
        const seenModes = [];
        const mockEvaluate = async (_candidate, baseInputs) => {
            seenModes.push(baseInputs?.dynamicFlex === true);
            return createVersionedMetricResult({ worst5Drawdown: 0.2 });
        };

        const resultOn = await runAutoOptimize({
            objective: { metric: 'EndWealth_P50', direction: 'max' },
            params: { liquidityRunwayYears: { min: 4, max: 6, step: 0.5 } },
            runsPerCandidate: 10,
            seedsTrain: 2,
            seedsTest: 2,
            constraints: {},
            maxDauer: 20,
            dynamicFlexMode: 'force_on',
            evaluateCandidateFn: mockEvaluate
        });
        assert(resultOn.optimizationContext.dynamicFlexMode === 'force_on', 'Mode sollte force_on sein');
        assert(resultOn.optimizationContext.dynamicFlexActive === true, 'Dynamic Flex sollte aktiv sein');

        const resultOff = await runAutoOptimize({
            objective: { metric: 'EndWealth_P50', direction: 'max' },
            params: { liquidityRunwayYears: { min: 4, max: 6, step: 0.5 } },
            runsPerCandidate: 10,
            seedsTrain: 2,
            seedsTest: 2,
            constraints: {},
            maxDauer: 20,
            dynamicFlexMode: 'force_off',
            evaluateCandidateFn: mockEvaluate
        });
        assert(resultOff.optimizationContext.dynamicFlexMode === 'force_off', 'Mode sollte force_off sein');
        assert(resultOff.optimizationContext.dynamicFlexActive === false, 'Dynamic Flex sollte inaktiv sein');

        assert(seenModes.includes(true), 'Evaluations sollten den force_on Modus sehen');
        assert(seenModes.includes(false), 'Evaluations sollten den force_off Modus sehen');
    }
    console.log('✓ runAutoOptimize Dynamic-Flex Modus (Stufe A) OK');

    // Test 28: runAutoOptimize - Safety-Guards bremsen aggressive Dynamic-Flex Loesungen
    console.log('Test 28: runAutoOptimize - Safety-Guards bremsen aggressive Dynamic-Flex Loesungen');
    {
        const mockEvaluate = async (candidate) => {
            const multiplier = Number(candidate.goGoMultiplier) || 1.0;
            const isAggressive = multiplier >= 1.25;
            return createVersionedMetricResult({
                medianEndWealth: isAggressive ? 1200000 : 900000,
                successProbFloor: isAggressive ? 0.90 : 0.985,
                worst5Drawdown: isAggressive ? 0.72 : 0.42,
                timeShareWRgt45: isAggressive ? 0.35 : 0.08,
                medianWithdrawalRate: isAggressive ? 0.072 : 0
            });
        };

        const result = await runAutoOptimize({
            objective: { metric: 'EndWealth_P50', direction: 'max' },
            params: {
                goGoMultiplier: { min: 1.0, max: 1.3, step: 0.05 }
            },
            runsPerCandidate: 20,
            seedsTrain: 2,
            seedsTest: 2,
            constraints: { sr99: false, noex: false, ts45: false, dd55: false },
            maxDauer: 30,
            dynamicFlexMode: 'force_on',
            evaluateCandidateFn: mockEvaluate
        });

        assert(Number(result.championCfg.goGoMultiplier) < 1.25, 'Champion sollte keine aggressive Go-Go Loesung sein');
        assert(result.optimizationContext.safetyGuardsActive === true, 'Safety-Guards sollten aktiv sein');
        assert(result.optimizationContext.usesDynamicFlexParams === true, 'Dynamic-Flex-Parameter sollten erkannt sein');
    }
    console.log('✓ runAutoOptimize Safety-Guards bremsen aggressive Dynamic-Flex Loesungen OK');

    // Test 28b: Missingness in der Safety-Penalty ist nicht gleich einer echten Null
    console.log('Test 28b: runAutoOptimize - Safety-Penalty Missingness');
    {
        let missingMetricError = null;
        try {
            await runAutoOptimize({
                objective: { metric: 'EndWealth_P50', direction: 'max' },
                params: {
                    goGoMultiplier: { min: 1.0, max: 1.1, step: 0.05 }
                },
                runsPerCandidate: 20,
                seedsTrain: 2,
                seedsTest: 2,
                constraints: {},
                maxDauer: 30,
                dynamicFlexMode: 'force_on',
                evaluateCandidateFn: async () => {
                    const result = createVersionedMetricResult({ medianEndWealth: 900000 });
                    delete result.medianWithdrawalRate;
                    return result;
                }
            });
        } catch (error) {
            missingMetricError = error;
        }
        assertEqual(missingMetricError?.code, 'AUTO_OPTIMIZE_METRIC_UNAVAILABLE',
            'fehlende Entnahmequote sollte bei aktiven Safety-Guards fail-closed stoppen');
    }
    console.log('✓ runAutoOptimize Safety-Penalty Missingness OK');

    console.log('✅ Auto-Optimizer objective search works');

} finally {
    if (prevDocument === undefined) delete global.document; else global.document = prevDocument;
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
    if (prevWindow === undefined) delete global.window; else global.window = prevWindow;
}

console.log('--- Auto-Optimizer Tests Completed ---');
