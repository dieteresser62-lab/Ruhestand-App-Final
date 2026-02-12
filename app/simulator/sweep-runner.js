"use strict";

import { rng, makeRunSeed, RUNIDX_COMBO_SETUP } from './simulator-utils.js';
import { buildStressContext, computeRentAdjRate, applyStressOverride } from './simulator-portfolio.js';
import { MORTALITY_TABLE, annualData, BREAK_ON_RUIN } from './simulator-data.js';
import {
    simulateOneYear,
    initMcRunState,
    makeDefaultCareMeta,
    sampleNextYearData,
    computeRunStatsFromSeries,
    updateCareMeta,
    calcCareCost,
    computeCareMortalityMultiplier
} from './simulator-engine-wrapper.js';
import { aggregateSweepMetrics, portfolioTotal } from './simulator-results.js';
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
    dynamicGoGoMultiplierMax: 2.0
};

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
            console.warn(`[SWEEP] Ignoriere Person-2-Key im Sweep: ${key}`);
            continue;
        }
        if (SWEEP_ALLOWED_KEYS.size && !SWEEP_ALLOWED_KEYS.has(key)) {
            console.warn(`[SWEEP] Key nicht auf Whitelist, übersprungen: ${key}`);
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
    sweepConfig,
    refP2Invariants = null
}) {
    const { anzahlRuns, maxDauer, blockSize, baseSeed, methode, rngMode = 'per-run-seed' } = sweepConfig;
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
                metrics: makeInvalidSweepMetrics(validation.reason)
            });
            continue;
        }
        const inputs = buildSweepInputs(baseInputs, params);

        const p2Invariants = extractP2Invariants(inputs);
        if (!resolvedRef) {
            resolvedRef = p2Invariants;
        }
        const p2VarianceWarning = resolvedRef ? !areP2InvariantsEqual(p2Invariants, resolvedRef) : false;
        if (p2VarianceWarning) {
            p2VarianceCount++;
            console.warn(`[SWEEP][ASSERT] P2-Basis-Parameter variieren im Sweep (Case ${comboIdx}), sollten konstant bleiben!`);
            console.warn('[SWEEP] Referenz:', resolvedRef);
            console.warn('[SWEEP] Aktuell:', p2Invariants);
        }

        // Legacy-stream uses one RNG per combo, otherwise per-run seeds for determinism.
        const resolvedRngMode = rngMode === 'legacy-stream' ? 'legacy-stream' : 'per-run-seed';
        const legacyRand = resolvedRngMode === 'legacy-stream' ? rng(baseSeed + comboIdx) : null;
        const comboRand = legacyRand || rng(makeRunSeed(baseSeed, comboIdx, RUNIDX_COMBO_SETUP));
        const stressCtxMaster = buildStressContext(inputs.stressPreset, comboRand);

        const runOutcomes = [];

        for (let i = 0; i < anzahlRuns; i++) {
            const rand = legacyRand || rng(makeRunSeed(baseSeed, comboIdx, i));
            let failed = false;
            const startYearIndex = Math.floor(rand() * annualData.length);
            let simState = initMcRunState(inputs, startYearIndex);

            const depotWertHistorie = [portfolioTotal(simState.portfolio)];
            let careMeta = makeDefaultCareMeta(inputs.pflegefallLogikAktivieren, inputs.geschlecht);
            let stressCtx = cloneStressContext(stressCtxMaster);

            let minRunway = Infinity;
            let effectiveTransitionYear = inputs.transitionYear ?? 0;

            for (let simulationsJahr = 0; simulationsJahr < maxDauer; simulationsJahr++) {
                const currentAge = inputs.startAlter + simulationsJahr;

                let yearData = sampleNextYearData(simState, methode, blockSize, rand, stressCtx);
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
                    let qx = MORTALITY_TABLE[inputs.geschlecht][currentAge] || 1;
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

                const result = simulateOneYear(simState, adjustedInputs, yearData, simulationsJahr, careMeta, careFloor, null, 1.0);

                if (result.isRuin) {
                    failed = true;
                    if (BREAK_ON_RUIN) break;
                } else {
                    simState = result.newState;
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
                failed: failed
            });
        }

        // Aggregate P50/P10/etc per combo to feed the heatmap.
        const metrics = aggregateSweepMetrics(runOutcomes);
        metrics.warningR2Varies = p2VarianceWarning;
        results.push({ comboIdx, params, metrics });
    }

    return { results, p2VarianceCount };
}
