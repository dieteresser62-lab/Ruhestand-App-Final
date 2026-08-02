"use strict";

import fs from 'node:fs';

import { EngineAPI } from '../engine/index.mjs';
import { applyChampionToForm } from '../app/simulator/auto-optimize-apply.js';
import { evaluateCandidate } from '../app/simulator/auto-optimize-evaluate.js';
import { AUTO_OPTIMIZE_METRIC_RESULT_VERSION } from '../app/simulator/auto-optimize-metrics.js';
import {
    AUTO_OPTIMIZE_PARAMETER_OPTIONS,
    AUTO_OPTIMIZE_PARAMETER_REGISTRY,
    applyAutoOptimizeCandidateToInputs,
    assertAutoOptimizeParameterRanges,
    assertAutoOptimizeParameterSet,
    createAutoOptimizeParameterFingerprint,
    createAutoOptimizeRequestFingerprint
} from '../app/simulator/auto-optimize-param-meta.js';
import { AUTO_OPTIMIZE_PRESETS } from '../app/simulator/auto-optimize-presets.js';
import { resolveDynamicFlexRunnerHorizon } from '../app/simulator/dynamic-flex-runner-horizon.js';
import { runMonteCarloChunk } from '../app/simulator/monte-carlo-runner.js';

console.log('--- Auto-Optimize Fidelity Tests ---');

const baseInputs = {
    dynamicFlex: false,
    horizonMethod: 'survival_quantile',
    liquidityRunwayYears: 5,
    goldAktiv: false,
    goldZielProzent: 0,
    rebalancingBand: 25,
    maxSkimPctOfEq: 25,
    maxBearRefillPctOfEq: 50,
    horizonYears: 30,
    survivalQuantile: 0.85,
    goGoActive: false,
    goGoMultiplier: 1
};

function createSimulationInputs() {
    return {
        startAlter: 65,
        geschlecht: 'm',
        startVermoegen: 1000000,
        depotwertAlt: 0,
        einstandAlt: 0,
        tagesgeld: 50000,
        geldmarktEtf: 0,
        zielLiquiditaet: 50000,
        startFloorBedarf: 30000,
        startFlexBedarf: 10000,
        minimumFlexAnnual: 0,
        flexBudgetAnnual: 0,
        flexBudgetYears: 0,
        flexBudgetRecharge: 0,
        rebalancingBand: 25,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5,
        liquidityRunwayYears: 5,
        goldAktiv: false,
        goldZielProzent: 0,
        goldFloorProzent: 0,
        goldSteuerfrei: true,
        startSPB: 1000,
        kirchensteuerSatz: 0,
        rentAdjMode: 'fix',
        rentAdjPct: 0,
        renteMonatlich: 0,
        renteStartOffsetJahre: 0,
        dynamicFlex: false,
        horizonMethod: 'survival_quantile',
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoActive: false,
        goGoMultiplier: 1,
        longevityMode: 'none',
        stressPreset: 'NONE',
        pflegefallLogikAktivieren: false,
        partner: { aktiv: false },
        accumulationPhase: { enabled: false },
        transitionYear: 0,
        simulationSourceProfileId: 'auto-optimize-fidelity'
    };
}

console.log('Test 1: every interactive parameter perturbs its canonical request key');
{
    const fixtures = {
        liquidityRunwayYears: { value: 7, requestKey: 'liquidityRunwayYears', expected: 7 },
        goldTargetPct: { value: 25, requestKey: 'goldZielProzent', expected: 25 },
        goldRebalancingBand: { value: 40, requestKey: 'rebalancingBand', expected: 40 },
        maxSkimPct: { value: 0, requestKey: 'maxSkimPctOfEq', expected: 0 },
        survivalQuantile: { value: 0.9, requestKey: 'survivalQuantile', expected: 0.9 },
        goGoMultiplier: { value: 1.2, requestKey: 'goGoMultiplier', expected: 1.2 }
    };

    for (const { key } of AUTO_OPTIMIZE_PARAMETER_OPTIONS) {
        const fixture = fixtures[key];
        assert(fixture, `${key} should have an explicit request perturbation fixture`);
        const inputs = {
            ...baseInputs,
            dynamicFlex: key === 'survivalQuantile' || key === 'goGoMultiplier',
            horizonMethod: 'survival_quantile'
        };
        applyAutoOptimizeCandidateToInputs({ [key]: fixture.value }, inputs);
        assertEqual(inputs[fixture.requestKey], fixture.expected,
            `${key} should perturb canonical request key ${fixture.requestKey}`);
    }
    assertEqual(Object.keys(fixtures).length, AUTO_OPTIMIZE_PARAMETER_OPTIONS.length,
        'interactive registry and perturbation matrix should remain complete');
}

console.log('Test 2: gold uses canonical request key and zero caps stay zero');
{
    const zeroInputs = { ...baseInputs };
    const goldZero = applyAutoOptimizeCandidateToInputs({
        goldTargetPct: 0,
        maxSkimPct: 0,
        maxBearRefillPct: 0
    }, zeroInputs);
    const goldTwentyFiveInputs = { ...baseInputs };
    const goldTwentyFive = applyAutoOptimizeCandidateToInputs({ goldTargetPct: 25 }, goldTwentyFiveInputs);

    assertEqual(zeroInputs.goldZielProzent, 0, 'gold 0 should reach canonical goldZielProzent');
    assertEqual(zeroInputs.maxSkimPctOfEq, 0, 'max skim cap 0 should remain 0');
    assertEqual(zeroInputs.maxBearRefillPctOfEq, 0, 'max bear refill cap 0 should remain 0');
    assert(!Object.prototype.hasOwnProperty.call(zeroInputs, 'goldAllokationProzent'),
        'evaluator input should not create the legacy goldAllokationProzent key');
    assert(createAutoOptimizeRequestFingerprint(goldZero).includes('"goldZielProzent":0'),
        'zero-gold fingerprint should name the canonical request key');
    assert(createAutoOptimizeRequestFingerprint(goldTwentyFive).includes('"goldZielProzent":25'),
        '25-percent-gold fingerprint should name the canonical request key');
    assert(
        createAutoOptimizeRequestFingerprint(goldZero) !== createAutoOptimizeRequestFingerprint(goldTwentyFive),
        'gold 0 and 25 should produce different canonical request fingerprints'
    );
}

console.log('Test 3: direct horizon is mode-gated and uses 15/55 exactly');
{
    let actuarialError = null;
    try {
        assertAutoOptimizeParameterSet(['horizonYears'], {
            ...baseInputs,
            dynamicFlex: true,
            horizonMethod: 'survival_quantile'
        });
    } catch (error) {
        actuarialError = error;
    }
    assertEqual(actuarialError?.code, 'AUTO_OPTIMIZE_PARAMETER_NOT_APPLICABLE',
        'actuarial optimizer should reject direct horizon before evaluation');

    const directCandidateInputs = {
        ...baseInputs,
        dynamicFlex: true,
        horizonMethod: 'direct'
    };
    applyAutoOptimizeCandidateToInputs({ horizonYears: 55 }, directCandidateInputs);
    assertEqual(directCandidateInputs.horizonYears, 55,
        'direct optimizer request contract should accept the O-20 upper fixture');

    const longevityFixtures = [
        { longevityMode: 'none' },
        { longevityMode: 'quantile_shift', longevityQuantileShift: 0.1 },
        { longevityMode: 'relative_horizon_buffer', longevityRelativePct: 0.2 },
        { longevityMode: 'buffer_years', longevityBufferYears: 10 }
    ];
    for (const longevity of longevityFixtures) {
        for (const horizonYears of [15, 55]) {
            const direct = resolveDynamicFlexRunnerHorizon({
                ...baseInputs,
                dynamicFlex: true,
                horizonMethod: 'direct',
                horizonYears,
                ...longevity
            }, { yearIndex: 0 });
            assertEqual(direct.horizonYears, horizonYears,
                `direct horizon ${horizonYears} should ignore ${longevity.longevityMode}`);
            assertEqual(direct.diagnostics.horizonMethod, 'direct', 'direct horizon should be diagnosed');
            assertEqual(direct.diagnostics.directInputApplicable, true,
                'direct horizon diagnostics should mark the direct field applicable');
            assertEqual(direct.diagnostics.longevityApplied, false,
                'direct horizon should never report an actuarial Longevity adjustment');
        }
    }

    const actuarial15 = resolveDynamicFlexRunnerHorizon({
        ...baseInputs,
        dynamicFlex: true,
        horizonMethod: 'mean',
        horizonYears: 15,
        startAlter: 65,
        geschlecht: 'm',
        longevityMode: 'none'
    }, { yearIndex: 0 });
    const actuarial55 = resolveDynamicFlexRunnerHorizon({
        ...baseInputs,
        dynamicFlex: true,
        horizonMethod: 'mean',
        horizonYears: 55,
        startAlter: 65,
        geschlecht: 'm',
        longevityMode: 'none'
    }, { yearIndex: 0 });
    assertEqual(actuarial15.horizonYears, actuarial55.horizonYears,
        'actuarial mean should ignore the direct horizon field');
    assertEqual(actuarial15.diagnostics.directInputApplicable, false,
        'actuarial diagnostics should mark the direct field inapplicable');

    const monteCarloParameters = {
        anzahl: 1,
        maxDauer: 1,
        blockSize: 1,
        seed: 1703,
        methode: 'block',
        rngMode: 'per-run-seed',
        startYearMode: 'UNIFORM',
        startYearFilter: 1970,
        startYearHalfLife: 20,
        excludeEstimatedHistory: false
    };
    const runDirect = async (horizonYears, longevity) => runMonteCarloChunk({
        inputs: {
            ...createSimulationInputs(),
            dynamicFlex: true,
            horizonMethod: 'direct',
            horizonYears,
            ...longevity
        },
        widowOptions: {},
        monteCarloParams: monteCarloParameters,
        useCapeSampling: false,
        runRange: { start: 0, count: 1 },
        logIndices: [0],
        engine: EngineAPI
    });
    const direct15Chunk = await runDirect(15, { longevityMode: 'buffer_years', longevityBufferYears: 10 });
    const direct55Chunk = await runDirect(55, { longevityMode: 'relative_horizon_buffer', longevityRelativePct: 0.2 });
    const direct15Vpw = direct15Chunk.runMeta?.[0]?.logDataRows?.[0]?.vpw;
    const direct55Vpw = direct55Chunk.runMeta?.[0]?.logDataRows?.[0]?.vpw;
    assertEqual(direct15Vpw?.horizonYears, 15, 'normal MC runner should consume direct horizon 15');
    assertEqual(direct55Vpw?.horizonYears, 55, 'normal MC runner should consume direct horizon 55');
}

console.log('Test 4: apply roundtrip preserves the evaluated fingerprint');
{
    const championCfg = {
        goldTargetPct: 25,
        maxSkimPct: 0,
        maxBearRefillPct: 0
    };
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
    const events = [];
    const controls = {
        goldAllokationProzent: { value: '0', dispatchEvent: event => events.push(['gold', event.type]) },
        goldAllokationAktiv: { value: 'false', dispatchEvent: event => events.push(['goldActive', event.type]) },
        maxSkimPctOfEq: { value: '25', dispatchEvent: event => events.push(['skim', event.type]) },
        maxBearRefillPctOfEq: { value: '50', dispatchEvent: event => events.push(['bear', event.type]) }
    };
    const fidelity = applyChampionToForm({
        championCfg,
        doc: { getElementById: id => controls[id] || null },
        EventCtor: class {
            constructor(type) {
                this.type = type;
            }
        }
    });

    assertEqual(fidelity.parameterFingerprint, championCfg.__autoOptimizeParameterFingerprint,
        'applied parameter fingerprint should match evaluation');
    assertEqual(fidelity.requestFingerprint, championCfg.__autoOptimizeRequestFingerprint,
        'applied request fingerprint should match evaluation');
    assertEqual(controls.goldAllokationProzent.value, 25, 'apply should write gold 25');
    assertEqual(controls.goldAllokationAktiv.value, 'true', 'apply should activate gold for a positive target');
    assertEqual(controls.maxSkimPctOfEq.value, 0, 'apply should retain max skim 0');
    assertEqual(controls.maxBearRefillPctOfEq.value, 0, 'apply should retain max bear refill 0');
    assert(events.length >= 4, 'apply should dispatch change events for canonical targets');

    const tampered = { goldTargetPct: 25 };
    Object.defineProperties(tampered, {
        __autoOptimizeParameterFingerprint: {
            value: createAutoOptimizeParameterFingerprint(tampered),
            enumerable: false
        },
        __autoOptimizeRequestFingerprint: {
            value: createAutoOptimizeRequestFingerprint({ goldTargetPct: 0 }),
            enumerable: false
        }
    });
    let tamperError = null;
    try {
        applyChampionToForm({
            championCfg: tampered,
            doc: { getElementById: id => controls[id] || null },
            EventCtor: class {
                constructor(type) {
                    this.type = type;
                }
            }
        });
    } catch (error) {
        tamperError = error;
    }
    assertEqual(tamperError?.code, 'AUTO_OPTIMIZE_APPLY_REQUEST_FINGERPRINT_MISMATCH',
        'tampered champion should fail before apply');

    let missingFingerprintError = null;
    try {
        applyChampionToForm({
            championCfg: { maxSkimPct: 0 },
            doc: { getElementById: id => controls[id] || null }
        });
    } catch (error) {
        missingFingerprintError = error;
    }
    assertEqual(missingFingerprintError?.code, 'AUTO_OPTIMIZE_APPLY_FINGERPRINT_REQUIRED',
        'apply should reject candidates without evaluated provenance');

    const sideEffectCandidate = { goGoMultiplier: 1.2 };
    Object.defineProperties(sideEffectCandidate, {
        __autoOptimizeParameterFingerprint: {
            value: createAutoOptimizeParameterFingerprint(sideEffectCandidate),
            enumerable: false
        },
        __autoOptimizeRequestFingerprint: {
            value: createAutoOptimizeRequestFingerprint(sideEffectCandidate),
            enumerable: false
        }
    });
    const sideEffectControls = {
        dynamicFlex: { checked: true },
        horizonMethod: { value: 'survival_quantile' },
        goGoMultiplier: { value: '1', dispatchEvent: () => { } },
        goGoActive: {
            checked: false,
            dispatchEvent() {
                this.checked = false;
            }
        }
    };
    let sideEffectError = null;
    try {
        applyChampionToForm({
            championCfg: sideEffectCandidate,
            doc: { getElementById: id => sideEffectControls[id] || null },
            EventCtor: class {
                constructor(type) {
                    this.type = type;
                }
            }
        });
    } catch (error) {
        sideEffectError = error;
    }
    assertEqual(sideEffectError?.code, 'AUTO_OPTIMIZE_APPLY_SIDE_EFFECT_MISMATCH',
        'apply should verify the goGoActive side effect after dispatched handlers');

    const incompleteFormCandidate = { goldTargetPct: 10, maxSkimPct: 0 };
    Object.defineProperties(incompleteFormCandidate, {
        __autoOptimizeParameterFingerprint: {
            value: createAutoOptimizeParameterFingerprint(incompleteFormCandidate),
            enumerable: false
        },
        __autoOptimizeRequestFingerprint: {
            value: createAutoOptimizeRequestFingerprint(incompleteFormCandidate),
            enumerable: false
        }
    });
    const preflightControls = {
        goldAllokationProzent: { value: '3', dispatchEvent: () => { } },
        goldAllokationAktiv: { value: 'true', dispatchEvent: () => { } }
    };
    let preflightError = null;
    try {
        applyChampionToForm({
            championCfg: incompleteFormCandidate,
            doc: { getElementById: id => preflightControls[id] || null }
        });
    } catch (error) {
        preflightError = error;
    }
    assertEqual(preflightError?.code, 'AUTO_OPTIMIZE_APPLY_FORM_TARGET_MISSING',
        'apply should preflight every form target');
    assertEqual(preflightControls.goldAllokationProzent.value, '3',
        'failed preflight should not partially mutate an earlier form target');

    const directChampion = { horizonYears: 55 };
    Object.defineProperties(directChampion, {
        __autoOptimizeParameterFingerprint: {
            value: createAutoOptimizeParameterFingerprint(directChampion),
            enumerable: false
        },
        __autoOptimizeRequestFingerprint: {
            value: createAutoOptimizeRequestFingerprint(directChampion),
            enumerable: false
        }
    });
    const actuarialControls = {
        dynamicFlex: { checked: true },
        horizonMethod: { value: 'survival_quantile' },
        horizonYears: { value: '30', dispatchEvent: () => { } }
    };
    let applicabilityError = null;
    try {
        applyChampionToForm({
            championCfg: directChampion,
            doc: { getElementById: id => actuarialControls[id] || null }
        });
    } catch (error) {
        applicabilityError = error;
    }
    assertEqual(applicabilityError?.code, 'AUTO_OPTIMIZE_APPLY_PARAMETER_NOT_APPLICABLE',
        'direct champion should not apply to an actuarial form mode');
    assertEqual(actuarialControls.horizonYears.value, '30',
        'mode rejection should preserve the direct horizon form target');
}

console.log('Test 5: every interactive parameter has a deterministic causal witness');
{
    const previousDocument = globalThis.document;
    const previousWindow = globalThis.window;
    const previousWorker = globalThis.Worker;
    try {
        globalThis.document = { getElementById: () => null };
        globalThis.window = { EngineAPI };
        delete globalThis.Worker;
        const monteCarloWitnesses = [
            { key: 'liquidityRunwayYears', lower: 1, upper: 10 },
            { key: 'goldTargetPct', lower: 0, upper: 25 },
            {
                key: 'goldRebalancingBand',
                lower: 0,
                upper: 100,
                seed: 1,
                inputOverrides: {
                    tagesgeld: 300000,
                    zielLiquiditaet: 300000,
                    goldAktiv: true,
                    goldZielProzent: 10
                }
            },
            { key: 'maxSkimPct', lower: 0, upper: 50 },
            {
                key: 'survivalQuantile',
                lower: 0.75,
                upper: 0.95,
                inputOverrides: { dynamicFlex: true, startFlexBedarf: 30000 }
            },
            {
                key: 'goGoMultiplier',
                lower: 1,
                upper: 1.35,
                inputOverrides: { dynamicFlex: true, goGoActive: true, startFlexBedarf: 30000 }
            }
        ];
        const resultMetrics = [
            'medianEndWealth',
            'successProbFloor',
            'depletionRate',
            'timeShareWRgt45',
            'worst5Drawdown'
        ];

        for (const witness of monteCarloWitnesses) {
            const simulationInputs = {
                ...createSimulationInputs(),
                ...(witness.inputOverrides || {})
            };
            const lower = await evaluateCandidate(
                { [witness.key]: witness.lower },
                simulationInputs,
                5,
                10,
                [witness.seed ?? 1703]
            );
            const upper = await evaluateCandidate(
                { [witness.key]: witness.upper },
                simulationInputs,
                5,
                10,
                [witness.seed ?? 1703]
            );
            assert(
                resultMetrics.some(metric => Math.abs((lower[metric] ?? 0) - (upper[metric] ?? 0)) > 1e-9),
                `${witness.key} should change at least one deterministic MC result metric`
            );
            assert(
                lower.parameterFidelity.requestFingerprint !== upper.parameterFidelity.requestFingerprint,
                `${witness.key} causal witness should retain distinct canonical request fingerprints`
            );
            if (witness === monteCarloWitnesses[0]) {
                assertEqual(lower.metricContract.schemaVersion, AUTO_OPTIMIZE_METRIC_RESULT_VERSION,
                    'real evaluate results should expose the versioned Slice-11 metric shape');
                assert(lower.p10EndWealth <= lower.p25EndWealth,
                    'real evaluate P10 should not exceed P25');
                assert(lower.p25EndWealth <= lower.medianEndWealth,
                    'real evaluate P25 should not exceed P50');
                assert(Number.isFinite(lower.medianWithdrawalRate),
                    'real evaluate should expose a finite D-14 median for a decumulation scenario');
                assert(lower.metricContract.withdrawalRate.sampleSize > 0,
                    'real evaluate should expose the D-14 run sample size');
            }
        }

    } finally {
        if (previousDocument === undefined) delete globalThis.document;
        else globalThis.document = previousDocument;
        if (previousWindow === undefined) delete globalThis.window;
        else globalThis.window = previousWindow;
        if (previousWorker === undefined) delete globalThis.Worker;
        else globalThis.Worker = previousWorker;
    }
}

console.log('Test 6: UI copy states horizon and MC-assumption limits');
{
    const simulatorHtml = fs.readFileSync(new URL('../Simulator.html', import.meta.url), 'utf8');
    assert(simulatorHtml.includes('Nicht anwendbar bei Survival-Quantile'),
        'normal simulator UI should visibly mark direct horizon inapplicable in actuarial modes');
    assert(/id="horizonYears"[^>]*\sreadonly(?:\s|>)/.test(simulatorHtml),
        'normal simulator UI should make the inapplicable direct field read-only');
    assert(simulatorHtml.includes('Auto-Optimize übernimmt Samplingmethode'),
        'optimizer UI should disclose that MC model assumptions are inherited');
    assert(simulatorHtml.includes('Experimentelles Vergleichsverfahren'),
        'optimizer UI should visibly mark the method as experimental');
    assert(simulatorHtml.includes('keine Finanzempfehlung'),
        'optimizer UI should not present a model champion as professional advice');
    assert(!AUTO_OPTIMIZE_PARAMETER_OPTIONS.some(option => option.key === 'horizonYears'),
        'actuarial optimizer parameter picker should not expose direct horizon');
    assert(!AUTO_OPTIMIZE_PARAMETER_OPTIONS.some(option => option.key === 'maxBearRefillPct'),
        'optimizer picker should not expose the runner-no-op Bear-Refill dimension');
    assert(!Object.values(AUTO_OPTIMIZE_PRESETS).some(
        preset => preset.params.some(parameter => parameter.key === 'maxBearRefillPct')
    ), 'optimizer presets should not reintroduce the runner-no-op Bear-Refill dimension');
    assert(!AUTO_OPTIMIZE_PRESETS.dynamicFlexBalanced.params.some(
        parameter => parameter.key === 'survivalQuantile'
    ), 'Dynamic-Flex preset should remain applicable with horizonMethod=mean');
    assertEqual(AUTO_OPTIMIZE_PARAMETER_REGISTRY.horizonYears.requestKey, 'horizonYears',
        'direct request registry should retain the horizon contract');
}

console.log('Test 6b: real ruin years remain part of D-14');
{
    const ruinRunCount = 3;
    const ruinChunk = await runMonteCarloChunk({
        inputs: {
            ...createSimulationInputs(),
            startVermoegen: 1000,
            tagesgeld: 20000,
            zielLiquiditaet: 20000,
            startFloorBedarf: 34000,
            startFlexBedarf: 0,
            liquidityRunwayYears: 1
        },
        widowOptions: {},
        monteCarloParams: {
            anzahl: ruinRunCount,
            maxDauer: 3,
            blockSize: 1,
            seed: 4242,
            methode: 'block',
            rngMode: 'per-run-seed',
            startYearMode: 'UNIFORM',
            startYearFilter: 1970,
            startYearHalfLife: 20,
            excludeEstimatedHistory: false
        },
        useCapeSampling: false,
        runRange: { start: 0, count: ruinRunCount },
        logIndices: [],
        engine: EngineAPI
    });
    assertEqual(ruinChunk.totals.outcomeRuinCount, ruinRunCount,
        'ruin witness should terminate every path in the real first financial year');
    for (let index = 0; index < ruinRunCount; index++) {
        assertEqual(ruinChunk.buffers.withdrawalRateObservationCount[index], 1,
            `ruin path ${index} should retain its actually calculated final year`);
        assertEqual(
            ruinChunk.buffers.meanWithdrawalRateMissingness[index],
            1,
            `ruin path ${index} should classify its D-14 value as observed`
        );
        assertEqual(ruinChunk.buffers.meanWithdrawalRateRatio[index], 0,
            `ruin path ${index} should retain the actual zero payout before pre-payout ruin`);
    }
}

console.log('Test 7: registry domains and range preflight match canonical input contracts');
{
    assertEqual(AUTO_OPTIMIZE_PARAMETER_REGISTRY.goldRebalancingBand.domain.max, 100,
        'Gold-Rebal-Band optimizer domain should match the engine maximum');
    assertEqual(AUTO_OPTIMIZE_PARAMETER_REGISTRY.survivalQuantile.domain.min, 0.5,
        'survival quantile should cover the full canonical input domain');
    assertEqual(AUTO_OPTIMIZE_PARAMETER_REGISTRY.survivalQuantile.domain.max, 0.99,
        'survival quantile should cover the full canonical input domain');
    assertEqual(AUTO_OPTIMIZE_PARAMETER_REGISTRY.goGoMultiplier.domain.max, 1.5,
        'Go-Go multiplier should cover the full canonical input domain');

    assertAutoOptimizeParameterRanges({
        survivalQuantile: { min: 0.5, max: 0.99, step: 0.01 }
    }, {
        ...baseInputs,
        dynamicFlex: true,
        horizonMethod: 'survival_quantile'
    });
    let rangeError = null;
    try {
        assertAutoOptimizeParameterRanges({
            survivalQuantile: { min: 0.49, max: 0.99, step: 0.01 }
        }, {
            ...baseInputs,
            dynamicFlex: true,
            horizonMethod: 'survival_quantile'
        });
    } catch (error) {
        rangeError = error;
    }
    assertEqual(rangeError?.code, 'AUTO_OPTIMIZE_PARAMETER_RANGE_DOMAIN_INVALID',
        'out-of-domain search ranges should fail before candidate generation');

    const simulatorHtml = fs.readFileSync(new URL('../Simulator.html', import.meta.url), 'utf8');
    assert(/id="rebalancingBand"[^>]*max="100"/.test(simulatorHtml),
        'Gold-Rebal-Band form maximum should match the engine and optimizer domain');
}

console.log('Test 8: Slice-15 model matrix and backlog links remain complete');
{
    const architectureText = fs.readFileSync(
        new URL('../docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md', import.meta.url),
        'utf8'
    );
    const matrixRows = architectureText
        .split(/\r?\n/)
        .filter(line => /^\| MS-\d{2} /.test(line));
    assertEqual(matrixRows.length, 10,
        'model matrix should retain exactly the declared MS-01 through MS-10 inventory');

    const expectedIds = Array.from({ length: 10 }, (_, index) => `MS-${String(index + 1).padStart(2, '0')}`);
    const observedIds = [];
    for (const row of matrixRows) {
        const cells = row.split('|').slice(1, -1).map(cell => cell.trim());
        const id = cells[0].split(' ')[0];
        observedIds.push(id);
        assert(cells.length === 8, `${id} should retain all eight model-matrix columns`);
        assert(cells[1].length > 0, `${id} should retain an owner`);
        assert(/\b(?:19|20)\d{2}\b/.test(cells[2]), `${id} should retain a source or contract data date`);
        assert(cells[3].length > 0, `${id} should retain a scope/limit`);
        assert(cells[4].length > 0 && cells[5].length > 0 && cells[6].length > 0,
            `${id} should retain separate technical, internal and external status cells`);
        assert(/\b20\d{2}-\d{2}-\d{2}\b/.test(cells[7]), `${id} should retain a next-review date`);
    }
    assertEqual(JSON.stringify(observedIds), JSON.stringify(expectedIds),
        'model matrix should retain the contiguous MS-01 through MS-10 ids');
    const ms09Cells = matrixRows.find(row => row.startsWith('| MS-09 ')).split('|').slice(1, -1).map(cell => cell.trim());
    assert(ms09Cells[4].startsWith('entfaellt'),
        'missing cost/FX/asset models should not claim a positive technical-test status');

    const backlogUrl = new URL('../docs/internal/archive/FORSCHUNGSVALIDIERUNGS_BACKLOG.md', import.meta.url);
    const backlogText = fs.readFileSync(backlogUrl, 'utf8');
    const localTargets = Array.from(backlogText.matchAll(/\]\(([^)]+\.md(?:#[^)]+)?)\)/g), match => match[1]);
    assert(localTargets.length >= 5, 'research backlog should expose its normative and operational local links');
    for (const localTarget of localTargets) {
        const resolved = new URL(localTarget, backlogUrl);
        resolved.hash = '';
        assert(fs.existsSync(resolved), `research backlog link should resolve: ${localTarget}`);
    }
}

console.log('--- Auto-Optimize Fidelity Tests Completed ---');
