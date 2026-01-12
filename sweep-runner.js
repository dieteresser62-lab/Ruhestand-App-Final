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

export function buildSweepInputs(baseInputs, params) {
    const inputs = deepClone(baseInputs);
    const caseOverrides = {
        runwayMinMonths: params.runwayMin,
        runwayTargetMonths: params.runwayTarget,
        targetEq: params.targetEq,
        rebalBand: params.rebalBand,
        maxSkimPctOfEq: params.maxSkimPct,
        maxBearRefillPctOfEq: params.maxBearRefillPct
    };

    if (params.goldTargetPct !== undefined) {
        caseOverrides.goldZielProzent = params.goldTargetPct;
        caseOverrides.goldAktiv = params.goldTargetPct > 0;
    }

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

    for (let offset = 0; offset < count; offset++) {
        const comboIdx = start + offset;
        const params = paramCombinations[comboIdx];
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

                if (inputs.accumulationPhase?.enabled && simulationsJahr < effectiveTransitionYear) {
                    if (careMeta && careMeta.active) {
                        effectiveTransitionYear = simulationsJahr;
                    }
                }

                const isAccumulation = inputs.accumulationPhase?.enabled && simulationsJahr < effectiveTransitionYear;

                if (!isAccumulation) {
                    let qx = MORTALITY_TABLE[inputs.geschlecht][currentAge] || 1;
                    const careFactor = computeCareMortalityMultiplier(careMeta, inputs);
                    if (careFactor > 1) {
                        qx = Math.min(1.0, qx * careFactor);
                    }
                    if (rand() < qx) break;
                }

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

        const metrics = aggregateSweepMetrics(runOutcomes);
        metrics.warningR2Varies = p2VarianceWarning;
        results.push({ comboIdx, params, metrics });
    }

    return { results, p2VarianceCount };
}
