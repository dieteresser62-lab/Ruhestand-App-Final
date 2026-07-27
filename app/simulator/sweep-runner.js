"use strict";

import { rng, makeRunSeed, RUNIDX_COMBO_SETUP } from './simulator-utils.js';
import { buildStressContext, computeRentAdjRate, applyStressOverride } from './simulator-portfolio.js';
import { annualData, BREAK_ON_RUIN } from './simulator-data.js';
import {
    assertSimulatorHorizonAgeContract,
    createMonteCarloLifeState,
    updateMonteCarloLifeEventsForYear
} from './mc-life-events.js';
import {
    simulateOneYear,
    initMcRunState,
    sampleNextYearData,
    computeRunStatsFromSeries,
    getDataVersion,
    resolveMonteCarloCape
} from './simulator-engine-wrapper.js';
import { aggregateSweepMetrics, portfolioTotal } from './simulator-results.js';
import { normalizeSweepRequestV1 } from './monte-carlo-parameters.js';
import { resolveDynamicFlexRunnerHorizon } from './dynamic-flex-runner-horizon.js';
import {
    applyTailRiskOverlay,
    createTailRiskSchedule,
    summarizeTailRiskEvents
} from './tail-risk-overlay.js';
import {
    buildYearSamplingConfig,
    createMonteCarloSamplingDiagnosticsV1,
    finalizeMonteCarloSamplingDiagnosticsV1,
    initializeMonteCarloSamplingStateV1,
    pickMonteCarloStartYearIndex,
    recordMonteCarloSampledYearV1,
    recordMonteCarloSamplingStartV1,
    resolveMonteCarloSamplingContractV1,
    sampleMonteCarloYearV1
} from './mc-year-sampling.js';
import {
    deepClone,
    SWEEP_ALLOWED_KEYS,
    cloneStressContext,
    isBlockedKey,
    extractP2Invariants,
    areP2InvariantsEqual,
    normalizeWidowOptions
} from './simulator-sweep-utils.js';

const SWEEP_LIMITS = {
    runwayMonthsMin: 0,
    runwayMonthsMax: 120,
    targetEqMin: 0,
    targetEqMax: 100,
    rebalBandMin: 0,
    rebalBandMax: 50,
    skimMin: 0,
    skimMax: 100,
    refillMin: 0,
    refillMax: 100,
    goldTargetMin: 0,
    goldTargetMax: 30,
    dynamicHorizonMin: 1,
    dynamicHorizonMax: 60,
    dynamicQuantileMin: 0.5,
    dynamicQuantileMax: 0.99,
    dynamicGoGoMultiplierMin: 1.0,
    dynamicGoGoMultiplierMax: 1.5
};
export const SWEEP_RESULT_PROVENANCE_VERSION = 'SweepResultProvenanceV1';
export const SWEEP_SAMPLING_FINGERPRINT_VERSION = 'SweepSamplingFingerprintV1';
export const SWEEP_HOUSEHOLD_RISK_DIAGNOSTICS_VERSION = 'SweepHouseholdRiskDiagnosticsV1';

const MAX_FINGERPRINT_TRACE_RUNS = 3;
const MAX_FINGERPRINT_TRACE_YEARS = 64;
const MAX_HOUSEHOLD_TRACE_RUNS = 1;
const MAX_HOUSEHOLD_TRACE_EVENTS = 32;
const MAX_TAIL_SCHEDULE_TRACE_EVENTS = 16;
const HOUSEHOLD_TRACE_INITIAL_YEARS = 4;
const FINGERPRINT_RUN_SEPARATOR = 0xFFFFFFFD;
const FINGERPRINT_UNKNOWN_YEAR = 0xFFFFFFFE;
const ANNUAL_DATA_INDEX_BY_YEAR = new Map(
    annualData.map((entry, index) => [Number(entry?.jahr), index])
);

function updateFingerprintHash(hash, value) {
    const normalized = Number.isSafeInteger(value) ? value >>> 0 : 0xFFFFFFFE;
    return Math.imul((hash ^ normalized) >>> 0, 0x01000193) >>> 0;
}

function createSweepSamplingFingerprint(request, combinationIndex) {
    return {
        hash: 0x811C9DC5,
        publicValue: {
            schemaVersion: SWEEP_SAMPLING_FINGERPRINT_VERSION,
            hashAlgorithm: 'fnv1a32_run_and_historical_index_sequence',
            hash: null,
            combinationIndex,
            requestedSamplingMethod: request.requestedSamplingMethod,
            appliedSamplingMethod: request.appliedSamplingMethod,
            tracedRuns: [],
            truncated: false
        }
    };
}

function beginSweepFingerprintRun(fingerprint, runIndex) {
    fingerprint.hash = updateFingerprintHash(fingerprint.hash, FINGERPRINT_RUN_SEPARATOR);
    fingerprint.hash = updateFingerprintHash(fingerprint.hash, runIndex);
    if (fingerprint.publicValue.tracedRuns.length >= MAX_FINGERPRINT_TRACE_RUNS) {
        fingerprint.publicValue.truncated = true;
        return null;
    }
    const trace = { runIndex, historicalYearIndices: [] };
    fingerprint.publicValue.tracedRuns.push(trace);
    return trace;
}

function recordSweepFingerprintYear(fingerprint, trace, yearData) {
    const historicalIndex = ANNUAL_DATA_INDEX_BY_YEAR.get(Number(yearData?.jahr));
    const normalizedIndex = Number.isInteger(historicalIndex)
        ? historicalIndex
        : FINGERPRINT_UNKNOWN_YEAR;
    fingerprint.hash = updateFingerprintHash(fingerprint.hash, normalizedIndex);
    if (!trace) return;
    if (trace.historicalYearIndices.length >= MAX_FINGERPRINT_TRACE_YEARS) {
        fingerprint.publicValue.truncated = true;
        return;
    }
    trace.historicalYearIndices.push(normalizedIndex);
}

function finalizeSweepSamplingFingerprint(fingerprint) {
    fingerprint.publicValue.hash = fingerprint.hash.toString(16).padStart(8, '0');
    return fingerprint.publicValue;
}

function createSweepHouseholdRiskDiagnostics() {
    return {
        schemaVersion: SWEEP_HOUSEHOLD_RISK_DIAGNOSTICS_VERSION,
        runsEvaluated: 0,
        yearsEvaluated: 0,
        household: {
            p1DeathEvents: 0,
            p2DeathEvents: 0,
            allDeadRuns: 0,
            p1CareActiveYears: 0,
            p2CareActiveYears: 0,
            bothCareActiveYears: 0,
            widowP1ActiveYears: 0,
            widowP2ActiveYears: 0,
            totalCareFloorNominalEur: 0,
            minimumTemporaryFlexFactor: null
        },
        horizon: {
            resolutionCount: 0,
            invalidResolutionCount: 0,
            minimumYears: null,
            maximumYears: null
        },
        tailRisk: {
            evaluatedYears: 0,
            runsWithScheduledEvents: 0,
            scheduledEventCount: 0,
            activeYears: 0,
            appliedYears: 0,
            skippedHistoricalCrisisYears: 0,
            invalidScheduleCount: 0
        },
        tracedRuns: []
    };
}

function beginSweepHouseholdRiskTrace(diagnostics, runIndex, tailRiskPlan) {
    if (diagnostics.tracedRuns.length >= MAX_HOUSEHOLD_TRACE_RUNS) return null;
    const scheduledEvents = Array.isArray(tailRiskPlan?.events)
        ? tailRiskPlan.events.slice(0, MAX_TAIL_SCHEDULE_TRACE_EVENTS).map(event => ({ ...event }))
        : [];
    const trace = {
        runIndex,
        tailRiskSchedule: {
            valid: tailRiskPlan?.valid === true,
            horizonYears: tailRiskPlan?.horizonYears ?? null,
            scheduledEvents,
            truncated: (tailRiskPlan?.events?.length || 0) > scheduledEvents.length,
            errors: Array.isArray(tailRiskPlan?.errors)
                ? tailRiskPlan.errors.map(error => ({ ...error }))
                : []
        },
        events: [],
        truncated: false
    };
    diagnostics.tracedRuns.push(trace);
    return trace;
}

function recordSweepHouseholdRiskYear(
    diagnostics,
    trace,
    {
        runIndex,
        simulationsJahr,
        yearData,
        lifeYear,
        previousLife,
        horizonResolution = null,
        tailRiskOverlay = null,
        result = null,
        runEndedBecauseAllDied = false
    }
) {
    diagnostics.yearsEvaluated += 1;
    const household = diagnostics.household;
    const p1Alive = lifeYear?.householdContext?.p1Alive !== false;
    const p2Alive = lifeYear?.householdContext?.p2Alive === true;
    const p1CareActive = p1Alive && lifeYear?.householdContext?.care?.p1?.active === true;
    const p2CareActive = p2Alive && lifeYear?.householdContext?.care?.p2?.active === true;
    const widowP1Active = lifeYear?.householdContext?.widowBenefits?.p1FromP2 === true;
    const widowP2Active = lifeYear?.householdContext?.widowBenefits?.p2FromP1 === true;

    if (previousLife?.p1Alive === true && !p1Alive) household.p1DeathEvents += 1;
    if (previousLife?.p2Alive === true && !p2Alive) household.p2DeathEvents += 1;
    if (p1CareActive) household.p1CareActiveYears += 1;
    if (p2CareActive) household.p2CareActiveYears += 1;
    if (p1CareActive && p2CareActive) household.bothCareActiveYears += 1;
    if (widowP1Active) household.widowP1ActiveYears += 1;
    if (widowP2Active) household.widowP2ActiveYears += 1;

    const careFloor = Number(lifeYear?.totalCareFloor);
    if (Number.isFinite(careFloor)) {
        household.totalCareFloorNominalEur += careFloor;
    }
    const temporaryFlexFactor = Number(lifeYear?.effectiveFlexFactor);
    if (Number.isFinite(temporaryFlexFactor)) {
        household.minimumTemporaryFlexFactor = household.minimumTemporaryFlexFactor === null
            ? temporaryFlexFactor
            : Math.min(household.minimumTemporaryFlexFactor, temporaryFlexFactor);
    }

    const horizonYears = Number(horizonResolution?.horizonYears);
    if (horizonResolution) {
        diagnostics.horizon.resolutionCount += 1;
        if (horizonResolution.valid !== true || !Number.isFinite(horizonYears)) {
            diagnostics.horizon.invalidResolutionCount += 1;
        } else {
            diagnostics.horizon.minimumYears = diagnostics.horizon.minimumYears === null
                ? horizonYears
                : Math.min(diagnostics.horizon.minimumYears, horizonYears);
            diagnostics.horizon.maximumYears = diagnostics.horizon.maximumYears === null
                ? horizonYears
                : Math.max(diagnostics.horizon.maximumYears, horizonYears);
        }
    }

    if (!trace) return;
    const lifeChanged = previousLife?.p1Alive !== p1Alive
        || previousLife?.p2Alive !== p2Alive
        || previousLife?.p1CareActive !== p1CareActive
        || previousLife?.p2CareActive !== p2CareActive
        || previousLife?.widowP1Active !== widowP1Active
        || previousLife?.widowP2Active !== widowP2Active;
    const shouldTrace = simulationsJahr < HOUSEHOLD_TRACE_INITIAL_YEARS
        || lifeChanged
        || tailRiskOverlay?.tailRiskActive === true
        || (Number.isFinite(previousLife?.horizonYears)
            && Number.isFinite(horizonYears)
            && previousLife.horizonYears !== horizonYears)
        || runEndedBecauseAllDied;
    if (!shouldTrace) return;
    if (trace.events.length >= MAX_HOUSEHOLD_TRACE_EVENTS) {
        trace.truncated = true;
        return;
    }

    trace.events.push({
        runIndex,
        simulationYearIndex: simulationsJahr,
        historicalYear: Number.isFinite(Number(yearData?.jahr)) ? Number(yearData.jahr) : null,
        p1Alive,
        p2Alive,
        p1CareActive,
        p2CareActive,
        widowP1Active,
        widowP2Active,
        widowP1Percent: Number(lifeYear?.householdContext?.widowBenefits?.p1FromP2Percent) || 0,
        widowP2Percent: Number(lifeYear?.householdContext?.widowBenefits?.p2FromP1Percent) || 0,
        totalCareFloorNominalEur: Number.isFinite(careFloor) ? careFloor : null,
        temporaryFlexFactor: Number.isFinite(temporaryFlexFactor) ? temporaryFlexFactor : null,
        horizonYears: Number.isFinite(horizonYears) ? horizonYears : null,
        horizonValid: horizonResolution ? horizonResolution.valid === true : null,
        vpwHorizonYears: Number.isFinite(Number(result?.ui?.vpw?.horizonYears))
            ? Number(result.ui.vpw.horizonYears)
            : null,
        vpwRate: Number.isFinite(Number(result?.ui?.vpw?.vpwRate))
            ? Number(result.ui.vpw.vpwRate)
            : null,
        pensionAnnualEur: Number.isFinite(Number(result?.logData?.pension_annual))
            ? Number(result.logData.pension_annual)
            : null,
        pensionP1Eur: Number.isFinite(Number(result?.logData?.rente1))
            ? Number(result.logData.rente1)
            : null,
        pensionP2Eur: Number.isFinite(Number(result?.logData?.rente2))
            ? Number(result.logData.rente2)
            : null,
        widowPensionP1Eur: Number.isFinite(Number(result?.logData?.WidowBenefitP1))
            ? Number(result.logData.WidowBenefitP1)
            : null,
        widowPensionP2Eur: Number.isFinite(Number(result?.logData?.WidowBenefitP2))
            ? Number(result.logData.WidowBenefitP2)
            : null,
        tailRisk: tailRiskOverlay?.tailRiskActive === true
            ? {
                eventId: tailRiskOverlay.tailRiskEventId,
                eventYearOffset: tailRiskOverlay.tailRiskEventYearOffset,
                applied: tailRiskOverlay.tailRiskApplied === true,
                skippedReason: tailRiskOverlay.tailRiskSkippedReason,
                returnShockPct: tailRiskOverlay.tailRiskReturnShockPct,
                inflationShockPct: tailRiskOverlay.tailRiskInflationShockPct,
                historicalReturnPct: tailRiskOverlay.historicalReturnPct,
                effectiveReturnPct: tailRiskOverlay.effectiveReturnPct,
                historicalInflationPct: tailRiskOverlay.historicalInflationPct,
                effectiveInflationPct: tailRiskOverlay.effectiveInflationPct
            }
            : null,
        runEndedBecauseAllDied
    });
}

function finalizeSweepRunRiskDiagnostics(diagnostics, tailRiskPlan, tailRiskEntries, allDied) {
    diagnostics.runsEvaluated += 1;
    if (allDied) diagnostics.household.allDeadRuns += 1;
    if (tailRiskPlan?.valid !== true) diagnostics.tailRisk.invalidScheduleCount += 1;
    const scheduledEventCount = Array.isArray(tailRiskPlan?.events)
        ? tailRiskPlan.events.length
        : 0;
    diagnostics.tailRisk.scheduledEventCount += scheduledEventCount;
    if (scheduledEventCount > 0) diagnostics.tailRisk.runsWithScheduledEvents += 1;

    const summary = summarizeTailRiskEvents(tailRiskEntries);
    diagnostics.tailRisk.evaluatedYears += Array.isArray(tailRiskEntries)
        ? tailRiskEntries.length
        : 0;
    diagnostics.tailRisk.activeYears += summary.tailRiskActiveYears;
    diagnostics.tailRisk.appliedYears += summary.tailRiskAppliedYears;
    diagnostics.tailRisk.skippedHistoricalCrisisYears += summary.tailRiskSkippedHistoricalCrisisYears;
}

function buildSweepResultProvenance(
    request,
    combinationIndex,
    samplingDiagnostics,
    samplingFingerprint,
    householdRiskDiagnostics = null
) {
    return {
        schemaVersion: SWEEP_RESULT_PROVENANCE_VERSION,
        requestVersion: request.schemaVersion,
        combinationIndex,
        requestedSamplingMethod: request.requestedSamplingMethod,
        appliedSamplingMethod: request.appliedSamplingMethod,
        samplingMethodResolution: request.samplingMethodResolution,
        useCapeSampling: request.useCapeSampling,
        normalizedParameters: { ...request.monteCarloParameters },
        unsupportedOverlays: [],
        samplingDiagnostics: samplingDiagnostics
            ? {
                ...samplingDiagnostics,
                tailRisk: householdRiskDiagnostics?.tailRisk ?? null
            }
            : null,
        samplingFingerprint,
        householdRiskDiagnostics
    };
}

function isConditionalStressActive(stressContext) {
    return stressContext?.type === 'conditional_bootstrap'
        && stressContext.remainingYears > 0;
}

function makeInvalidSweepMetrics(reason) {
    return {
        successProbFloor: 0,
        p10EndWealth: 0,
        p25EndWealth: 0,
        medianEndWealth: 0,
        p75EndWealth: 0,
        meanEndWealth: 0,
        maxEndWealth: 0,
        worst5Drawdown: 0,
        minRunwayObserved: 0,
        invalidCombination: true,
        invalidReason: String(reason || 'ungueltige Kombination')
    };
}

function isFiniteNumber(value) {
    return Number.isFinite(Number(value));
}

function validateSweepCombination(baseInputs, params) {
    if (!params || typeof params !== 'object') {
        return { valid: false, reason: 'fehlende Parameter' };
    }

    if (!isFiniteNumber(params.runwayMin) || !isFiniteNumber(params.runwayTarget)) {
        return { valid: false, reason: 'Runway-Werte fehlen' };
    }
    if (Number(params.runwayMin) > Number(params.runwayTarget)) {
        return { valid: false, reason: 'runwayMin > runwayTarget' };
    }

    const numericChecks = [
        ['runwayMin', SWEEP_LIMITS.runwayMonthsMin, SWEEP_LIMITS.runwayMonthsMax],
        ['runwayTarget', SWEEP_LIMITS.runwayMonthsMin, SWEEP_LIMITS.runwayMonthsMax],
        ['targetEq', SWEEP_LIMITS.targetEqMin, SWEEP_LIMITS.targetEqMax],
        ['rebalBand', SWEEP_LIMITS.rebalBandMin, SWEEP_LIMITS.rebalBandMax],
        ['maxSkimPct', SWEEP_LIMITS.skimMin, SWEEP_LIMITS.skimMax],
        ['maxBearRefillPct', SWEEP_LIMITS.refillMin, SWEEP_LIMITS.refillMax],
        ['goldTargetPct', SWEEP_LIMITS.goldTargetMin, SWEEP_LIMITS.goldTargetMax]
    ];
    for (const [key, min, max] of numericChecks) {
        if (params[key] === undefined) continue;
        const value = Number(params[key]);
        if (!Number.isFinite(value) || value < min || value > max) {
            return { valid: false, reason: `${key} außerhalb [${min}, ${max}]` };
        }
    }

    const hasDynamicOverride = (
        params.horizonYears !== undefined ||
        params.survivalQuantile !== undefined ||
        params.goGoMultiplier !== undefined
    );
    if (hasDynamicOverride && baseInputs?.dynamicFlex !== true) {
        return { valid: false, reason: 'Dynamic-Flex-Parameter gesetzt, aber Dynamic Flex ist deaktiviert' };
    }

    if (params.horizonYears !== undefined) {
        const value = Number(params.horizonYears);
        if (!Number.isFinite(value) || value < SWEEP_LIMITS.dynamicHorizonMin || value > SWEEP_LIMITS.dynamicHorizonMax) {
            return { valid: false, reason: `horizonYears außerhalb [${SWEEP_LIMITS.dynamicHorizonMin}, ${SWEEP_LIMITS.dynamicHorizonMax}]` };
        }
    }
    if (params.survivalQuantile !== undefined) {
        const value = Number(params.survivalQuantile);
        if (!Number.isFinite(value) || value < SWEEP_LIMITS.dynamicQuantileMin || value > SWEEP_LIMITS.dynamicQuantileMax) {
            return { valid: false, reason: `survivalQuantile außerhalb [${SWEEP_LIMITS.dynamicQuantileMin}, ${SWEEP_LIMITS.dynamicQuantileMax}]` };
        }
        if ((baseInputs?.horizonMethod || 'survival_quantile') !== 'survival_quantile') {
            return { valid: false, reason: 'survivalQuantile ist nur bei Horizon-Methode survival_quantile zulaessig' };
        }
    }
    if (params.goGoMultiplier !== undefined) {
        const value = Number(params.goGoMultiplier);
        if (!Number.isFinite(value) || value < SWEEP_LIMITS.dynamicGoGoMultiplierMin || value > SWEEP_LIMITS.dynamicGoGoMultiplierMax) {
            return { valid: false, reason: `goGoMultiplier außerhalb [${SWEEP_LIMITS.dynamicGoGoMultiplierMin}, ${SWEEP_LIMITS.dynamicGoGoMultiplierMax}]` };
        }
        if (baseInputs?.goGoActive !== true) {
            return { valid: false, reason: 'goGoMultiplier gesetzt, aber Go-Go ist deaktiviert' };
        }
    }

    return { valid: true, reason: '' };
}

export function buildSweepInputs(baseInputs, params) {
    const inputs = deepClone(baseInputs);
    const caseOverrides = {
        runwayMinMonths: params.runwayMin,
        runwayTargetMonths: params.runwayTarget,
        targetEq: params.targetEq,
        rebalBand: params.rebalBand,
        maxSkimPctOfEq: params.maxSkimPct,
        maxBearRefillPctOfEq: params.maxBearRefillPct,
        horizonYears: params.horizonYears,
        survivalQuantile: params.survivalQuantile,
        goGoMultiplier: params.goGoMultiplier
    };

    if (params.goldTargetPct !== undefined) {
        caseOverrides.goldZielProzent = params.goldTargetPct;
        // Gold is implicitly active once a target is set.
        caseOverrides.goldAktiv = params.goldTargetPct > 0;
    }

    // Apply only whitelisted keys and block any partner-specific fields.
    for (const [key, value] of Object.entries(caseOverrides)) {
        if (isBlockedKey(key)) {
            continue;
        }
        if (SWEEP_ALLOWED_KEYS.size && !SWEEP_ALLOWED_KEYS.has(key)) {
            continue;
        }
        inputs[key] = value;
    }

    return inputs;
}

export function runSweepChunk({
    baseInputs,
    paramCombinations,
    comboRange,
    sweepRequest = null,
    sweepConfig = null,
    refP2Invariants = null,
    engine = null
}) {
    const normalizedRequest = normalizeSweepRequestV1(sweepRequest ?? sweepConfig, {
        inputs: baseInputs,
        historicalRecordCount: annualData.length || null
    });
    const {
        anzahl: anzahlRuns,
        maxDauer,
        blockSize,
        seed: baseSeed,
        methode,
        rngMode,
        startYearMode,
        startYearFilter,
        startYearHalfLife,
        excludeEstimatedHistory
    } = normalizedRequest.monteCarloParameters;
    assertSimulatorHorizonAgeContract(baseInputs, maxDauer);
    const { useCapeSampling } = normalizedRequest;
    const yearSamplingConfig = buildYearSamplingConfig(startYearMode, annualData, {
        startYearFilter,
        startYearHalfLife,
        blockSize,
        excludeEstimatedHistory
    });
    const samplingResolution = resolveMonteCarloSamplingContractV1({
        method: methode,
        inputs: baseInputs,
        annualData,
        useCapeSampling,
        startYearMode,
        startYearFilter,
        startYearHalfLife,
        blockSize,
        excludeEstimatedHistory,
        yearSamplingConfig
    });
    const start = comboRange?.start ?? 0;
    const count = comboRange?.count ?? paramCombinations.length;

    const results = [];
    let p2VarianceCount = 0;
    let resolvedRef = refP2Invariants;

    // Sweep each combination deterministically using comboIdx-based seeds.
    for (let offset = 0; offset < count; offset++) {
        const comboIdx = start + offset;
        const params = paramCombinations[comboIdx];
        const validation = validateSweepCombination(baseInputs, params);
        if (!validation.valid) {
            results.push({
                comboIdx,
                params,
                metrics: makeInvalidSweepMetrics(validation.reason),
                provenance: buildSweepResultProvenance(normalizedRequest, comboIdx, null, null)
            });
            continue;
        }
        const inputs = buildSweepInputs(baseInputs, params);
        const widowOptions = normalizeWidowOptions(inputs.widowOptions);
        const samplingDiagnostics = createMonteCarloSamplingDiagnosticsV1({
            contract: samplingResolution.contract,
            dataVersion: getDataVersion()
        });
        const samplingFingerprint = createSweepSamplingFingerprint(normalizedRequest, comboIdx);
        const householdRiskDiagnostics = createSweepHouseholdRiskDiagnostics();

        const p2Invariants = extractP2Invariants(inputs);
        if (!resolvedRef) {
            resolvedRef = p2Invariants;
        }
        const p2VarianceWarning = resolvedRef ? !areP2InvariantsEqual(p2Invariants, resolvedRef) : false;
        if (p2VarianceWarning) {
            p2VarianceCount++;
        }

        // Legacy-stream uses one RNG per combo, otherwise per-run seeds for determinism.
        const resolvedRngMode = rngMode === 'legacy-stream' ? 'legacy-stream' : 'per-run-seed';
        const legacyRand = resolvedRngMode === 'legacy-stream' ? rng(baseSeed + comboIdx) : null;
        const comboRand = legacyRand || rng(makeRunSeed(baseSeed, comboIdx, RUNIDX_COMBO_SETUP));
        const stressCtxMaster = buildStressContext(inputs.stressPreset, comboRand);

        const runOutcomes = [];
        let invalidComboReason = '';

        for (let i = 0; i < anzahlRuns; i++) {
            const runSeed = makeRunSeed(baseSeed, comboIdx, i);
            const rand = legacyRand || rng(runSeed);
            const tailRiskPlan = createTailRiskSchedule(runSeed, inputs, maxDauer);
            const tailRiskEntriesThisRun = [];
            let failed = false;
            let totalTaxSavedByLossCarryThisRun = 0;
            const startYearIndex = pickMonteCarloStartYearIndex({
                rand,
                inputs,
                annualData,
                useCapeSampling,
                excludeEstimatedHistory,
                yearSamplingConfig,
                samplingContract: samplingResolution
            });
            recordMonteCarloSamplingStartV1(samplingDiagnostics, annualData[startYearIndex]);
            let simState = initMcRunState(inputs, startYearIndex);
            initializeMonteCarloSamplingStateV1({
                state: simState,
                method: methode,
                blockSize,
                rand,
                startYearIndex,
                samplingResolution,
                annualData
            });
            const fingerprintTrace = beginSweepFingerprintRun(samplingFingerprint, i);
            const householdRiskTrace = beginSweepHouseholdRiskTrace(
                householdRiskDiagnostics,
                i,
                tailRiskPlan
            );

            const depotWertHistorie = [portfolioTotal(simState.portfolio)];
            let stressCtx = cloneStressContext(stressCtxMaster);

            let minRunway = Infinity;
            let effectiveTransitionYear = inputs.transitionYear ?? 0;
            let triggeredAge = null;
            let careEverActive = false;
            const lifeState = createMonteCarloLifeState(inputs, rand, widowOptions);
            let previousDynamicHorizon = null;
            let wasJointAliveAtPreviousHorizon = lifeState.hasPartner
                && lifeState.p1Alive
                && lifeState.p2Alive;
            let longevityTransitionStartYear = null;
            let longevityTransitionAnchorHorizon = null;
            let previousLife = {
                p1Alive: lifeState.p1Alive,
                p2Alive: lifeState.p2Alive,
                p1CareActive: false,
                p2CareActive: false,
                widowP1Active: false,
                widowP2Active: false,
                horizonYears: null
            };

            for (let simulationsJahr = 0; simulationsJahr < maxDauer; simulationsJahr++) {
                const samplingStep = sampleMonteCarloYearV1({
                    state: simState,
                    method: methode,
                    blockSize,
                    rand,
                    stressContext: stressCtx,
                    conditionalStressActive: isConditionalStressActive(stressCtx),
                    samplingResolution,
                    annualData,
                    sampleNextYearData
                });
                let yearData = samplingStep.yearData;
                recordMonteCarloSampledYearV1(samplingDiagnostics, {
                    yearData,
                    source: samplingStep.source,
                    stationaryRestartReason: samplingStep.stationaryRestartReason
                });
                recordSweepFingerprintYear(samplingFingerprint, fingerprintTrace, yearData);
                yearData = applyStressOverride(yearData, stressCtx, rand);
                const tailRiskOverlay = applyTailRiskOverlay(
                    yearData,
                    tailRiskPlan.schedule[simulationsJahr] ?? null,
                    {
                        runIdx: i,
                        combinationIndex: comboIdx,
                        simulationsJahr,
                        methode,
                        stressPreset: inputs?.stressPreset
                    }
                );
                yearData = tailRiskOverlay.yearData;
                tailRiskEntriesThisRun.push(tailRiskOverlay);

                const lifeYear = updateMonteCarloLifeEventsForYear(
                    lifeState,
                    inputs,
                    widowOptions,
                    simulationsJahr,
                    yearData,
                    effectiveTransitionYear,
                    triggeredAge,
                    careEverActive,
                    rand
                );
                effectiveTransitionYear = lifeYear.effectiveTransitionYear;
                triggeredAge = lifeYear.triggeredAge;
                careEverActive = lifeYear.careEverActive;

                if (lifeState.runEndedBecauseAllDied) {
                    recordSweepHouseholdRiskYear(
                        householdRiskDiagnostics,
                        householdRiskTrace,
                        {
                            runIndex: i,
                            simulationsJahr,
                            yearData,
                            lifeYear,
                            previousLife,
                            tailRiskOverlay,
                            runEndedBecauseAllDied: true
                        }
                    );
                    previousLife = {
                        p1Alive: false,
                        p2Alive: false,
                        p1CareActive: false,
                        p2CareActive: false,
                        widowP1Active: lifeYear.householdContext.widowBenefits.p1FromP2 === true,
                        widowP2Active: lifeYear.householdContext.widowBenefits.p2FromP1 === true,
                        horizonYears: previousDynamicHorizon
                    };
                    break;
                }

                // Inflation/rent adjustment can be regime-dependent.
                const effectiveRentAdjPct = computeRentAdjRate(inputs, yearData);
                const resolvedCapeRatio = resolveMonteCarloCape(
                    yearData,
                    inputs,
                    simState.marketDataHist
                );
                const p1Alive = lifeYear.householdContext.p1Alive !== false;
                const p2Alive = lifeYear.householdContext.p2Alive === true;
                const jointAliveThisYear = lifeState.hasPartner && p1Alive && p2Alive;
                if (
                    wasJointAliveAtPreviousHorizon
                    && !jointAliveThisYear
                    && Number.isFinite(previousDynamicHorizon)
                ) {
                    longevityTransitionStartYear = simulationsJahr;
                    longevityTransitionAnchorHorizon = previousDynamicHorizon;
                } else if (jointAliveThisYear) {
                    longevityTransitionStartYear = null;
                    longevityTransitionAnchorHorizon = null;
                }
                const horizonResolution = resolveDynamicFlexRunnerHorizon(inputs, {
                    yearIndex: simulationsJahr,
                    ageP1: lifeYear.ageP1,
                    ageP2: lifeYear.ageP2,
                    p1Alive,
                    p2Alive,
                    applyTransitionSmoothing: longevityTransitionStartYear !== null,
                    previousHorizon: longevityTransitionAnchorHorizon,
                    yearsSinceTransition: longevityTransitionStartYear === null
                        ? 0
                        : simulationsJahr - longevityTransitionStartYear
                });
                const dynamicHorizonYears = horizonResolution.horizonYears;
                const adjustedInputs = {
                    ...inputs,
                    rentAdjPct: effectiveRentAdjPct,
                    transitionYear: effectiveTransitionYear,
                    capeRatio: resolvedCapeRatio,
                    marketCapeRatio: resolvedCapeRatio,
                    horizonYears: dynamicHorizonYears,
                    ...(horizonResolution.diagnostics?.longevityMode !== 'none'
                        ? { longevityHorizonDiagnostics: horizonResolution.diagnostics }
                        : {})
                };
                previousDynamicHorizon = dynamicHorizonYears;
                wasJointAliveAtPreviousHorizon = jointAliveThisYear;
                yearData.capeRatio = resolvedCapeRatio;

                const result = simulateOneYear(
                    { ...simState },
                    adjustedInputs,
                    yearData,
                    simulationsJahr,
                    lifeState.careMetaP1,
                    lifeYear.totalCareFloor,
                    lifeYear.householdContext,
                    lifeYear.effectiveFlexFactor,
                    engine
                );
                recordSweepHouseholdRiskYear(
                    householdRiskDiagnostics,
                    householdRiskTrace,
                    {
                        runIndex: i,
                        simulationsJahr,
                        yearData,
                        lifeYear,
                        previousLife,
                        horizonResolution,
                        tailRiskOverlay,
                        result
                    }
                );
                previousLife = {
                    p1Alive,
                    p2Alive,
                    p1CareActive: p1Alive && lifeState.careMetaP1?.active === true,
                    p2CareActive: p2Alive && lifeState.careMetaP2?.active === true,
                    widowP1Active: lifeYear.householdContext.widowBenefits.p1FromP2 === true,
                    widowP2Active: lifeYear.householdContext.widowBenefits.p2FromP1 === true,
                    horizonYears: dynamicHorizonYears
                };

                if (result?.error) {
                    const firstFieldError = Array.isArray(result.error?.errors) && result.error.errors.length > 0
                        ? result.error.errors[0]?.message
                        : '';
                    invalidComboReason = firstFieldError || result.error?.message || 'Engine-Validierungsfehler';
                    failed = true;
                    break;
                }

                if (result.isRuin) {
                    failed = true;
                    if (BREAK_ON_RUIN) break;
                } else {
                    simState = result.newState;
                    totalTaxSavedByLossCarryThisRun += Number(result.logData?.taxSavedByLossCarry) || 0;
                    depotWertHistorie.push(portfolioTotal(simState.portfolio));

                    // Track the worst runway coverage within a run.
                    const runway = result.logData.RunwayCoveragePct || 0;
                    if (runway < minRunway) minRunway = runway;
                }
            }

            finalizeSweepRunRiskDiagnostics(
                householdRiskDiagnostics,
                tailRiskPlan,
                tailRiskEntriesThisRun,
                lifeState.runEndedBecauseAllDied
            );

            const endVermoegen = failed ? 0 : portfolioTotal(simState.portfolio);
            const { maxDDpct } = computeRunStatsFromSeries(depotWertHistorie);

            runOutcomes.push({
                finalVermoegen: endVermoegen,
                maxDrawdown: maxDDpct,
                minRunway: minRunway === Infinity ? 0 : minRunway,
                taxSavedByLossCarry: totalTaxSavedByLossCarryThisRun,
                failed: failed
            });

            if (invalidComboReason) {
                break;
            }
        }

        finalizeMonteCarloSamplingDiagnosticsV1(samplingDiagnostics);
        const resultProvenance = buildSweepResultProvenance(
            normalizedRequest,
            comboIdx,
            samplingDiagnostics,
            finalizeSweepSamplingFingerprint(samplingFingerprint),
            householdRiskDiagnostics
        );
        if (invalidComboReason) {
            results.push({
                comboIdx,
                params,
                metrics: makeInvalidSweepMetrics(`Engine Validation: ${invalidComboReason}`),
                provenance: resultProvenance
            });
            continue;
        }

        // Aggregate P50/P10/etc per combo to feed the heatmap.
        const metrics = aggregateSweepMetrics(runOutcomes);
        metrics.warningR2Varies = p2VarianceWarning;
        results.push({ comboIdx, params, metrics, provenance: resultProvenance });
    }

    return { results, p2VarianceCount, sweepRequest: normalizedRequest };
}
