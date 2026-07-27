"use strict";

import { rng, makeRunSeed, RUNIDX_COMBO_SETUP } from './simulator-utils.js';
import { buildStressContext, computeRentAdjRate, applyStressOverride } from './simulator-portfolio.js';
import { annualData, BREAK_ON_RUIN } from './simulator-data.js';
import { resolveSimulatorMortalityProbability } from './mc-life-events.js';
import {
    simulateOneYear,
    initMcRunState,
    makeDefaultCareMeta,
    sampleNextYearData,
    computeRunStatsFromSeries,
    updateCareMeta,
    calcCareCost,
    computeCareMortalityMultiplier,
    getDataVersion
} from './simulator-engine-wrapper.js';
import { aggregateSweepMetrics, portfolioTotal } from './simulator-results.js';
import { normalizeSweepRequestV1 } from './monte-carlo-parameters.js';
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
    areP2InvariantsEqual
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

const MAX_FINGERPRINT_TRACE_RUNS = 3;
const MAX_FINGERPRINT_TRACE_YEARS = 64;
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

function buildSweepResultProvenance(request, combinationIndex, samplingDiagnostics, samplingFingerprint) {
    return {
        schemaVersion: SWEEP_RESULT_PROVENANCE_VERSION,
        requestVersion: request.schemaVersion,
        combinationIndex,
        requestedSamplingMethod: request.requestedSamplingMethod,
        appliedSamplingMethod: request.appliedSamplingMethod,
        samplingMethodResolution: request.samplingMethodResolution,
        useCapeSampling: request.useCapeSampling,
        normalizedParameters: { ...request.monteCarloParameters },
        unsupportedOverlays: ['tailRisk'],
        samplingDiagnostics: samplingDiagnostics
            ? { ...samplingDiagnostics, tailRisk: null }
            : null,
        samplingFingerprint
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
        const samplingDiagnostics = createMonteCarloSamplingDiagnosticsV1({
            contract: samplingResolution.contract,
            dataVersion: getDataVersion()
        });
        const samplingFingerprint = createSweepSamplingFingerprint(normalizedRequest, comboIdx);

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
            const rand = legacyRand || rng(makeRunSeed(baseSeed, comboIdx, i));
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

            const depotWertHistorie = [portfolioTotal(simState.portfolio)];
            let careMeta = makeDefaultCareMeta(inputs.pflegefallLogikAktivieren, inputs.geschlecht);
            let stressCtx = cloneStressContext(stressCtxMaster);

            let minRunway = Infinity;
            let effectiveTransitionYear = inputs.transitionYear ?? 0;

            for (let simulationsJahr = 0; simulationsJahr < maxDauer; simulationsJahr++) {
                const currentAge = inputs.startAlter + simulationsJahr;

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

                careMeta = updateCareMeta(careMeta, inputs, currentAge, yearData, rand);

                // If care triggers during accumulation, force early transition to withdrawal.
                if (inputs.accumulationPhase?.enabled && simulationsJahr < effectiveTransitionYear) {
                    if (careMeta && careMeta.active) {
                        effectiveTransitionYear = simulationsJahr;
                    }
                }

                const isAccumulation = inputs.accumulationPhase?.enabled && simulationsJahr < effectiveTransitionYear;

                // Mortality only applies in withdrawal phase.
                if (!isAccumulation) {
                    let qx = resolveSimulatorMortalityProbability(inputs.geschlecht, currentAge);
                    const careFactor = computeCareMortalityMultiplier(careMeta, inputs);
                    if (careFactor > 1) {
                        qx = Math.min(1.0, qx * careFactor);
                    }
                    if (rand() < qx) break;
                }

                // Inflation/rent adjustment can be regime-dependent.
                const effectiveRentAdjPct = computeRentAdjRate(inputs, yearData);
                const adjustedInputs = { ...inputs, rentAdjPct: effectiveRentAdjPct, transitionYear: effectiveTransitionYear };

                const { zusatzFloor: careFloor } = calcCareCost(careMeta, null);

                const householdContext = {
                    p1Alive: true,
                    p2Alive: false,
                    widowBenefits: { p1FromP2: false, p2FromP1: false },
                    care: { p1: careMeta, p2: null }
                };
                const result = simulateOneYear(simState, adjustedInputs, yearData, simulationsJahr, careMeta, careFloor, householdContext, 1.0, engine);

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
            finalizeSweepSamplingFingerprint(samplingFingerprint)
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
