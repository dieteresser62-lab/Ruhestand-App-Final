"use strict";

import nodeAssert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function assert(condition, message = 'Assertion should pass') {
    if (typeof globalThis.assert === 'function') {
        globalThis.assert(condition, message);
        return;
    }
    nodeAssert(condition, message);
}

assert.equal = (actual, expected, message = 'Values should be equal') => {
    if (typeof globalThis.assertEqual === 'function') {
        globalThis.assertEqual(actual, expected, message);
        return;
    }
    nodeAssert.equal(actual, expected, message);
};

assert.deepEqual = (actual, expected, message = 'Values should be deeply equal') => {
    try {
        nodeAssert.deepEqual(actual, expected, message);
    } catch (error) {
        if (typeof globalThis.assert === 'function') {
            globalThis.assert(false, `${message}: ${error.message}`);
            return;
        }
        throw error;
    }
    if (typeof globalThis.assert === 'function') {
        globalThis.assert(true, message);
    }
};

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, '..');
const runtimeRoot = path.resolve(
    process.env.DEMOGRAPHY_MEASUREMENT_RUNTIME_ROOT || projectRoot
);
const captureMode = process.env.DEMOGRAPHY_MEASUREMENT_CAPTURE === '1';
const printDeltaMode = process.env.DEMOGRAPHY_MEASUREMENT_PRINT_DELTA === '1';
const fixturePath = path.join(
    testDir,
    'fixtures',
    'monte-carlo-measurement',
    'post-backtest-data-07-v1.json'
);
const slice08FixturePath = path.join(
    testDir,
    'fixtures',
    'monte-carlo-measurement',
    'liquidity-runway-slice-08-v1.json'
);

function runtimeModule(relativePath) {
    return import(pathToFileURL(path.join(runtimeRoot, relativePath)).href);
}

const [
    { EngineAPI },
    { annualData },
    { runMonteCarloChunk },
    { buildSweepInputs, runSweepChunk },
    { MONTE_CARLO_OUTCOME_CODE },
    { quantile }
] = await Promise.all([
    runtimeModule('engine/index.mjs'),
    runtimeModule('app/simulator/simulator-data.js'),
    runtimeModule('app/simulator/monte-carlo-runner.js'),
    runtimeModule('app/simulator/sweep-runner.js'),
    runtimeModule('app/simulator/monte-carlo-chunk-result.js'),
    runtimeModule('app/simulator/simulator-utils.js')
]);

if (typeof global.window === 'undefined') global.window = {};
global.window.EngineAPI = EngineAPI;

const RUNS = 2048;
const MAX_DURATION_YEARS = 40;
const SEED = 20260801;
const WIDOW_OPTIONS = Object.freeze({
    mode: 'percent',
    percent: 0.55,
    marriageOffsetYears: 0,
    minMarriageYears: 1
});
const GRADE_CONFIGS = Object.freeze(Object.fromEntries(
    [1, 2, 3, 4, 5].map(grade => [
        grade,
        {
            zusatz: grade * 3000,
            flexCut: Math.max(0.5, 1 - grade * 0.08),
            mortalityFactor: grade <= 2 ? 1 : 1 + (grade - 2) * 0.25
        }
    ])
));
const INPUTS = Object.freeze({
    startAlter: 65,
    geschlecht: 'm',
    startVermoegen: 1200000,
    depotwertAlt: 1100000,
    einstandAlt: 800000,
    tagesgeld: 100000,
    geldmarktEtf: 0,
    zielLiquiditaet: 72000,
    startFloorBedarf: 30000,
    startFlexBedarf: 18000,
    flexBudgetAnnual: 0,
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
    renteMonatlich: 1800,
    renteStartOffsetJahre: 0,
    dynamicFlex: true,
    horizonMethod: 'survival_quantile',
    horizonYears: 35,
    survivalQuantile: 0.85,
    goGoActive: true,
    goGoMultiplier: 1.1,
    capeRatio: 20,
    marketCapeRatio: 20,
    stressPreset: 'NONE',
    pflegefallLogikAktivieren: true,
    pflegeModellTyp: 'chronisch',
    pflegeRampUp: 3,
    pflegeKostenDrift: 0.035,
    pflegeRegionalZuschlag: 0,
    pflegeMinDauer: 1,
    pflegeMaxDauer: 5,
    pflegeMaxFloor: 60000,
    pflegeGradeConfigs: GRADE_CONFIGS,
    partner: {
        aktiv: true,
        geschlecht: 'w',
        startAlter: 62,
        startInJahren: 0,
        monatsrente: 1400,
        brutto: 16800,
        steuerquotePct: 0
    },
    widowOptions: WIDOW_OPTIONS,
    accumulationPhase: { enabled: false },
    transitionYear: 0,
    tailRiskEnabled: false
});
const MONTE_CARLO_PARAMETERS = Object.freeze({
    anzahl: RUNS,
    maxDauer: MAX_DURATION_YEARS,
    blockSize: 5,
    seed: SEED,
    methode: 'block',
    rngMode: 'per-run-seed',
    startYearMode: 'UNIFORM',
    startYearFilter: 1970,
    startYearHalfLife: 20,
    excludeEstimatedHistory: false
});
const SWEEP_COMBINATIONS = Object.freeze([
    Object.freeze({
        liquidityRunwayYears: 3,
        goldRebalancingBand: 25,
        maxSkimPct: 10,
        maxBearRefillPct: 5,
        goldTargetPct: 0,
        horizonYears: 35,
        survivalQuantile: 0.85,
        goGoMultiplier: 1.1
    }),
    Object.freeze({
        liquidityRunwayYears: 5,
        goldRebalancingBand: 25,
        maxSkimPct: 10,
        maxBearRefillPct: 5,
        goldTargetPct: 0,
        horizonYears: 35,
        survivalQuantile: 0.85,
        goGoMultiplier: 1.1
    })
]);

function rounded(value) {
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return null;
        return Number(value.toFixed(6));
    }
    if (ArrayBuffer.isView(value)) return Array.from(value, rounded);
    if (Array.isArray(value)) return value.map(rounded);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, rounded(child)]));
    }
    return value;
}

function sha256(value) {
    return crypto.createHash('sha256').update(JSON.stringify(rounded(value))).digest('hex');
}

function values(source) {
    return Array.from(source || [], value => Number(value));
}

function countEqual(source, expected) {
    return values(source).filter(value => value === expected).length;
}

function countPositive(source) {
    return values(source).filter(value => value > 0).length;
}

function sum(source) {
    return values(source).reduce((total, value) => total + value, 0);
}

function quantiles(source) {
    const finite = values(source).filter(Number.isFinite);
    return rounded({
        p10: quantile(finite, 0.10),
        p50: quantile(finite, 0.50),
        p90: quantile(finite, 0.90)
    });
}

function selectSweepMetrics(metrics) {
    return rounded({
        successProbFloor: metrics.successProbFloor,
        p10EndWealth: metrics.p10EndWealth,
        medianEndWealth: metrics.medianEndWealth,
        worst5Drawdown: metrics.worst5Drawdown,
        minRunwayObserved: metrics.minRunwayObserved
    });
}

async function captureMeasurement() {
    const monteCarlo = await runMonteCarloChunk({
        inputs: buildSweepInputs(INPUTS, SWEEP_COMBINATIONS[0]),
        monteCarloParams: MONTE_CARLO_PARAMETERS,
        widowOptions: WIDOW_OPTIONS,
        useCapeSampling: false,
        runRange: { start: 0, count: RUNS },
        logIndices: [0, 1, 2],
        engine: EngineAPI
    });
    const sweep = runSweepChunk({
        baseInputs: INPUTS,
        paramCombinations: SWEEP_COMBINATIONS,
        comboRange: { start: 0, count: SWEEP_COMBINATIONS.length },
        sweepRequest: {
            monteCarloParameters: MONTE_CARLO_PARAMETERS,
            useCapeSampling: false
        },
        engine: EngineAPI
    });
    const summaries = monteCarlo.pathSummaries;
    const outcomeCodes = summaries.outcomeCode;
    const fullPathEvidence = {
        outcomeCode: summaries.outcomeCode,
        finalValueNominalEur: summaries.finalValueNominalEur,
        p1CareEntryAge: summaries.p1CareEntryAge,
        p2CareEntryAge: summaries.p2CareEntryAge,
        p1CareYears: summaries.p1CareYears,
        p2CareYears: summaries.p2CareYears,
        bothCareYears: summaries.bothCareYears,
        careEverActive: summaries.careEverActive,
        totalCareAdditionalNeedNominalEur: summaries.totalCareAdditionalNeedNominalEur
    };

    return rounded({
        runtime: {
            node: process.version,
            platform: process.platform,
            architecture: process.arch
        },
        profile: {
            runs: RUNS,
            durationYears: MAX_DURATION_YEARS,
            seed: SEED,
            startAgeP1: INPUTS.startAlter,
            startAgeP2: INPUTS.partner.startAlter,
            careActive: INPUTS.pflegefallLogikAktivieren,
            partnerActive: INPUTS.partner.aktiv,
            widowMode: WIDOW_OPTIONS.mode,
            widowPercent: WIDOW_OPTIONS.percent,
            sweepCombinationCount: SWEEP_COMBINATIONS.length,
            inputHash: sha256({ inputs: INPUTS, monteCarloParameters: MONTE_CARLO_PARAMETERS })
        },
        monteCarlo: {
            outcomeCounts: {
                ruin: countEqual(outcomeCodes, MONTE_CARLO_OUTCOME_CODE.RUIN),
                allDead: countEqual(outcomeCodes, MONTE_CARLO_OUTCOME_CODE.ALL_DEAD),
                horizonExhausted: countEqual(outcomeCodes, MONTE_CARLO_OUTCOME_CODE.HORIZON_EXHAUSTED),
                technicalError: countEqual(outcomeCodes, MONTE_CARLO_OUTCOME_CODE.TECHNICAL_ERROR)
            },
            lifespanYears: quantiles(monteCarlo.buffers.kpiLebensdauer),
            finalWealthNominalEur: quantiles(summaries.finalValueNominalEur),
            care: {
                anyCareRunCount: countPositive(summaries.careEverActive),
                p1EntryRunCount: countPositive(summaries.p1CareEntryAge),
                p2EntryRunCount: countPositive(summaries.p2CareEntryAge),
                p1CareYearsTotal: sum(summaries.p1CareYears),
                p2CareYearsTotal: sum(summaries.p2CareYears),
                bothCareYearsTotal: sum(summaries.bothCareYears),
                additionalNeedNominalEur: quantiles(summaries.totalCareAdditionalNeedNominalEur)
            },
            modelContract: monteCarlo.samplingDiagnostics?.modelContracts?.demographyCareSurvivor ?? null,
            pathEvidenceHash: sha256(fullPathEvidence)
        },
        sweep: sweep.results.map(result => {
            const diagnostics = result.provenance.householdRiskDiagnostics;
            if (!diagnostics) {
                throw new Error(`Invalid measurement Sweep combination: ${JSON.stringify(result.metrics)}`);
            }
            return {
                comboIdx: result.comboIdx,
                params: result.params,
                metrics: selectSweepMetrics(result.metrics),
                household: rounded(diagnostics.household),
                horizon: rounded(diagnostics.horizon),
                evidenceHash: sha256({
                    metrics: result.metrics,
                    householdRiskDiagnostics: diagnostics
                })
            };
        })
    });
}

function collectLeafDiffPaths(before, after, pathName = '$') {
    if (JSON.stringify(before) === JSON.stringify(after)) return [];
    const beforeObject = before !== null && typeof before === 'object';
    const afterObject = after !== null && typeof after === 'object';
    if (!beforeObject || !afterObject || Array.isArray(before) !== Array.isArray(after)) {
        return [pathName];
    }
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    return Array.from(keys).sort().flatMap(key => collectLeafDiffPaths(
        before[key],
        after[key],
        `${pathName}.${key}`
    ));
}

function collectNumericLeafDeltas(before, after, pathName = '$') {
    if (typeof before === 'number' && typeof after === 'number') {
        return Object.is(before, after)
            ? []
            : [{ path: pathName, before, after, delta: rounded(after - before) }];
    }
    const beforeObject = before !== null && typeof before === 'object';
    const afterObject = after !== null && typeof after === 'object';
    if (!beforeObject || !afterObject || Array.isArray(before) !== Array.isArray(after)) return [];
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    return Array.from(keys).sort().flatMap(key => collectNumericLeafDeltas(
        before[key],
        after[key],
        `${pathName}.${key}`
    ));
}

const actualMeasurement = await captureMeasurement();

if (captureMode) {
    console.log('__DEMOGRAPHY_MEASUREMENT_START__');
    console.log(JSON.stringify(actualMeasurement, null, 2));
    console.log('__DEMOGRAPHY_MEASUREMENT_END__');
} else {
    const fixtureBytes = fs.readFileSync(fixturePath);
    assert.equal(
        crypto.createHash('sha256').update(fixtureBytes).digest('hex'),
        '1eac45e475fa0029bd41df29099e69f242320443b6f2db8e584303f2e69db7fc',
        'Archived Slice-07 runtime measurement must remain byte-identical'
    );
    const fixture = JSON.parse(fixtureBytes.toString('utf8'));
    const slice08Fixture = JSON.parse(fs.readFileSync(slice08FixturePath, 'utf8'));
    assert.equal(fixture.schemaVersion, 'DemographyCareSurvivorRuntimeMeasurementV1');
    assert.equal(fixture.snapshotId, 'post-backtest-data-07-v1');
    assert.equal(fixture.sourceReference, 'post-backtest-data-06-v2');
    assert.equal(fixture.reviewStatus, 'pending');
    assert.equal(slice08Fixture.sourceReference, 'post-backtest-data-07-v1');
    assert.deepEqual(
        { ...actualMeasurement, runtime: slice08Fixture.targetMeasurement.runtime },
        slice08Fixture.targetMeasurement,
        'Current runtime must reproduce the full Slice-08 demography/Monte-Carlo projection'
    );
    assert.deepEqual(
        {
            outcomeCounts: actualMeasurement.monteCarlo.outcomeCounts,
            lifespanYears: actualMeasurement.monteCarlo.lifespanYears,
            care: {
                anyCareRunCount: actualMeasurement.monteCarlo.care.anyCareRunCount,
                p1EntryRunCount: actualMeasurement.monteCarlo.care.p1EntryRunCount,
                p2EntryRunCount: actualMeasurement.monteCarlo.care.p2EntryRunCount,
                additionalNeedNominalEur: actualMeasurement.monteCarlo.care.additionalNeedNominalEur
            }
        },
        {
            outcomeCounts: fixture.targetMeasurement.monteCarlo.outcomeCounts,
            lifespanYears: fixture.targetMeasurement.monteCarlo.lifespanYears,
            care: {
                anyCareRunCount: fixture.targetMeasurement.monteCarlo.care.anyCareRunCount,
                p1EntryRunCount: fixture.targetMeasurement.monteCarlo.care.p1EntryRunCount,
                p2EntryRunCount: fixture.targetMeasurement.monteCarlo.care.p2EntryRunCount,
                additionalNeedNominalEur: fixture.targetMeasurement.monteCarlo.care.additionalNeedNominalEur
            }
        },
        'Slice-07 demography invariants must remain live and exact through Slice 08'
    );
    assert(Number.isFinite(Date.parse(fixture.capturedAtUtc)), 'Capture timestamp must be valid ISO time');
    assert(Date.parse(fixture.capturedAtUtc) <= Date.now() + 60000, 'Capture timestamp must not be in the future');
    const changedLeafPaths = collectLeafDiffPaths(
        fixture.sourceMeasurement,
        fixture.targetMeasurement
    );
    const numericDeltas = collectNumericLeafDeltas(
        fixture.sourceMeasurement,
        fixture.targetMeasurement
    );
    if (printDeltaMode) {
        console.log('__DEMOGRAPHY_DELTA_START__');
        console.log(JSON.stringify({
            changedLeafCount: changedLeafPaths.length,
            changedLeafPathsHash: sha256(changedLeafPaths),
            numericDeltaCount: numericDeltas.length,
            numericDeltasHash: sha256(numericDeltas),
            numericDeltas
        }, null, 2));
        console.log('__DEMOGRAPHY_DELTA_END__');
    }
    assert.equal(changedLeafPaths.length, fixture.changedLeafCount);
    assert.equal(sha256(changedLeafPaths), fixture.changedLeafPathsHash);
    assert.equal(numericDeltas.length, fixture.numericDeltaCount);
    assert.equal(sha256(numericDeltas), fixture.numericDeltasHash);
    assert.deepEqual(fixture.effectSummary, {
        monteCarloLifespanP10Years: rounded(
            fixture.targetMeasurement.monteCarlo.lifespanYears.p10
            - fixture.sourceMeasurement.monteCarlo.lifespanYears.p10
        ),
        monteCarloLifespanP50Years: rounded(
            fixture.targetMeasurement.monteCarlo.lifespanYears.p50
            - fixture.sourceMeasurement.monteCarlo.lifespanYears.p50
        ),
        monteCarloLifespanP90Years: rounded(
            fixture.targetMeasurement.monteCarlo.lifespanYears.p90
            - fixture.sourceMeasurement.monteCarlo.lifespanYears.p90
        ),
        monteCarloMedianEndWealthNominalEur: rounded(
            fixture.targetMeasurement.monteCarlo.finalWealthNominalEur.p50
            - fixture.sourceMeasurement.monteCarlo.finalWealthNominalEur.p50
        ),
        monteCarloAnyCareRunCount: rounded(
            fixture.targetMeasurement.monteCarlo.care.anyCareRunCount
            - fixture.sourceMeasurement.monteCarlo.care.anyCareRunCount
        ),
        sweepTargetEq50MedianEndWealthNominalEur: rounded(
            fixture.targetMeasurement.sweep[0].metrics.medianEndWealth
            - fixture.sourceMeasurement.sweep[0].metrics.medianEndWealth
        ),
        sweepTargetEq50WidowP1ActiveYears: rounded(
            fixture.targetMeasurement.sweep[0].household.widowP1ActiveYears
            - fixture.sourceMeasurement.sweep[0].household.widowP1ActiveYears
        ),
        sweepTargetEq50WidowP2ActiveYears: rounded(
            fixture.targetMeasurement.sweep[0].household.widowP2ActiveYears
            - fixture.sourceMeasurement.sweep[0].household.widowP2ActiveYears
        )
    });
    assert(numericDeltas.length > 0, 'Slice 07 must measure numeric runtime deltas');
    assert(changedLeafPaths.some(pathName => pathName.includes('.monteCarlo.')),
        'Slice 07 must measure Monte Carlo changes');
    assert(changedLeafPaths.some(pathName => pathName.includes('.sweep.')),
        'Slice 07 must measure Sweep changes');
    assert(actualMeasurement.monteCarlo.care.anyCareRunCount > 0,
        'Measurement profile must activate care in Monte Carlo');
    assert(actualMeasurement.sweep.every(entry => entry.household.p1DeathEvents > 0),
        'Measurement profile must exercise P1 mortality in every Sweep combination');
    assert(actualMeasurement.sweep.every(entry => entry.household.p2DeathEvents > 0),
        'Measurement profile must exercise partner mortality in every Sweep combination');
    assert(actualMeasurement.sweep.every(entry => entry.household.widowP1ActiveYears > 0),
        'Measurement profile must exercise survivor benefits in every Sweep combination');
}

console.log('Demography/care/survivor runtime measurement passed');
