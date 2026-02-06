/**
 * Module: Monte Carlo Runner
 * Purpose: Core orchestrator for the Monte Carlo simulation.
 *          Handles the simulation loop, years, life events (Care, Death), and results aggregation.
 * Usage: Called by auto-optimize-worker.js and the main simulation UI.
 * Dependencies: simulator-utils.js, simulator-data.js, simulator-engine-wrapper.js
 */
"use strict";

import { rng, makeRunSeed, RUNIDX_COMBO_SETUP, quantile } from './simulator-utils.js';
import { getStartYearCandidates } from '../shared/cape-utils.js';
import { BREAK_ON_RUIN, MORTALITY_TABLE, annualData } from './simulator-data.js';
import { buildStressContext, applyStressOverride, computeRentAdjRate } from './simulator-portfolio.js';
import { simulateOneYear, initMcRunState, makeDefaultCareMeta, sampleNextYearData, computeRunStatsFromSeries, updateCareMeta, calcCareCost, computeCareMortalityMultiplier, computeHouseholdFlexFactor } from './simulator-engine-wrapper.js';
import { portfolioTotal } from './simulator-results.js';
import { sumDepot } from './simulator-portfolio.js';
import { cloneStressContext, computeMarriageYearsCompleted } from './simulator-sweep-utils.js';
import { ScenarioAnalyzer } from './scenario-analyzer.js';
import { MC_HEATMAP_BINS, pickWorstRun, createMonteCarloBuffers } from './monte-carlo-runner-utils.js';
import { buildMonteCarloAggregates } from './monte-carlo-aggregates.js';

export { MC_HEATMAP_BINS, pickWorstRun, createMonteCarloBuffers, buildMonteCarloAggregates };

const MIN_START_YEAR_INDEX = 4;

function buildCdfFromIndices(indices, weightsByIndex) {
    if (!Array.isArray(indices) || indices.length === 0) return null;
    let total = 0;
    for (const idx of indices) {
        const weight = weightsByIndex ? (weightsByIndex[idx] || 0) : 1;
        total += weight;
    }
    if (total <= 0) return null;
    let cumulative = 0;
    // CDF: monoton wachsend, letzter Wert wird auf 1 geklemmt.
    const cdf = indices.map(idx => {
        const weight = weightsByIndex ? (weightsByIndex[idx] || 0) : 1;
        cumulative += weight / total;
        return cumulative;
    });
    cdf[cdf.length - 1] = 1;
    return { indices, cdf };
}

function pickFromSampler(rand, sampler, fallbackIndex = 0) {
    if (!sampler || !sampler.cdf || !sampler.indices || sampler.indices.length === 0) {
        return fallbackIndex;
    }
    const sample = rand ? rand() : Math.random();
    const r = Math.min(1 - Number.EPSILON, Math.max(0, Number.isFinite(sample) ? sample : 0));
    // Binäre Suche im CDF für O(log n) Sampling.
    let low = 0;
    let high = sampler.cdf.length - 1;
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (r < sampler.cdf[mid]) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return sampler.indices[low] ?? fallbackIndex;
}

function buildYearSamplingConfig(mode, data, { startYearFilter = 1970, startYearHalfLife = 20, blockSize = 1 } = {}) {
    if (!Array.isArray(data) || data.length === 0) return null;

    const cutoff = Number.isFinite(startYearFilter) ? startYearFilter : 1970;
    const halfLife = Number.isFinite(startYearHalfLife) && startYearHalfLife > 0 ? startYearHalfLife : 20;
    // Recency-Mode: Exponentielles Abklingen mit Halbwertszeit (halfLife).
    const currentYear = data[data.length - 1]?.jahr ?? new Date().getFullYear();

    const allowedIndices = [];
    const weightsByIndex = new Array(data.length).fill(0);
    for (let i = MIN_START_YEAR_INDEX; i < data.length; i++) {
        const year = data[i].jahr;
        if (mode === 'FILTER' && year < cutoff) continue;
        allowedIndices.push(i);
        if (mode === 'RECENCY') {
            const age = currentYear - year;
            weightsByIndex[i] = Math.pow(0.5, age / halfLife);
        } else {
            weightsByIndex[i] = 1;
        }
    }

    if (allowedIndices.length === 0) return null;

    const allowedIndexSet = new Set(allowedIndices);
    const allSampler = (mode === 'FILTER' || mode === 'RECENCY')
        ? buildCdfFromIndices(allowedIndices, weightsByIndex)
        : null;

    // Block-Sampling: Startindex so wählen, dass ein Block (blockSize) passt.
    const maxStartIndex = Math.max(1, data.length - blockSize);
    const blockStartIndices = allowedIndices.filter(idx => idx < maxStartIndex);
    const blockSampler = (mode === 'FILTER' || mode === 'RECENCY')
        ? buildCdfFromIndices(blockStartIndices, weightsByIndex)
        : null;

    const regimeSamplers = {};
    for (const idx of allowedIndices) {
        const regime = data[idx].regime;
        if (!regimeSamplers[regime]) regimeSamplers[regime] = [];
        regimeSamplers[regime].push(idx);
    }
    const regimeSamplerMap = {};
    for (const [regime, indices] of Object.entries(regimeSamplers)) {
        regimeSamplerMap[regime] = (mode === 'FILTER' || mode === 'RECENCY')
            ? buildCdfFromIndices(indices, weightsByIndex)
            : { indices, cdf: null };
    }

    return {
        allowedIndices,
        allowedIndexSet,
        allSampler,
        blockSampler,
        blockStartIndices,
        maxStartIndex,
        regimeSamplers: regimeSamplerMap,
        weightsByIndex
    };
}

export function buildStartYearCdf(mode, data, { startYearFilter = 1970, startYearHalfLife = 20 } = {}) {
    if (!Array.isArray(data) || data.length === 0) return null;
    if (mode !== 'FILTER' && mode !== 'RECENCY') return null;

    const currentYear = data[data.length - 1]?.jahr ?? new Date().getFullYear();
    const halfLife = Number.isFinite(startYearHalfLife) && startYearHalfLife > 0 ? startYearHalfLife : 20;
    const cutoff = Number.isFinite(startYearFilter) ? startYearFilter : 1970;

    const weights = data.map((entry, index) => {
        if (index < MIN_START_YEAR_INDEX) return 0;
        if (mode === 'FILTER') {
            return entry.jahr >= cutoff ? 1 : 0;
        }
        const age = currentYear - entry.jahr;
        return Math.pow(0.5, age / halfLife);
    });

    const totalWeight = weights.reduce((sum, value) => sum + value, 0);
    if (totalWeight <= 0) return null;

    let cumulative = 0;
    const cdf = weights.map(weight => {
        cumulative += weight / totalWeight;
        return cumulative;
    });
    cdf[cdf.length - 1] = 1;
    return cdf;
}

export function pickStartYearIndex(rand, data, cdf, minIndex = MIN_START_YEAR_INDEX) {
    if (!Array.isArray(data) || data.length === 0) return 0;
    const sample = rand ? rand() : Math.random();
    const r = Math.min(1 - Number.EPSILON, Math.max(0, Number.isFinite(sample) ? sample : 0));
    if (!cdf || cdf.length !== data.length) {
        // Gleichverteilung als Fallback, wenn kein CDF vorhanden ist.
        const min = Math.max(0, Math.min(minIndex, data.length - 1));
        const span = Math.max(1, data.length - min);
        return Math.min(data.length - 1, min + Math.floor(r * span));
    }
    let low = 0;
    let high = cdf.length - 1;
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (r < cdf[mid]) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return low;
}

/**
 * Reine Monte-Carlo-Simulation ohne DOM-Abhängigkeiten.
 * Erwartet alle UI-Daten als Parameter und liefert Aggregationen sowie Szenario-Metadaten zurück.
 * Fortschritts-Updates und Szenario-Logging werden über Callbacks injiziert, um maximale Trennung zu erreichen.
 * @param {object} options - Konfiguration der Simulation.
 * @param {object} options.inputs - Gemeinsame Eingaben aus dem UI.
 * @param {object} options.monteCarloParams - Parameter wie Anzahl, Dauer, Seed usw.
 * @param {object} options.widowOptions - Normalisierte Witwen-Optionen.
 * @param {boolean} options.useCapeSampling - Flag, ob CAPE-Sampling aktiv ist.
 * @param {(progressPct:number)=>void} [options.onProgress] - Optionaler Callback für Fortschritts-Updates.
 * @param {ScenarioAnalyzer} [options.scenarioAnalyzer] - Externer Analyzer zum Tracking von Szenarien.
 * @returns {Promise<{ aggregatedResults: object, failCount: number, worstRun: object, worstRunCare: object, pflegeTriggeredCount: number }>}
 */
export async function runMonteCarloSimulation({ inputs, monteCarloParams, widowOptions, useCapeSampling, onProgress = () => { }, scenarioAnalyzer = null, engine = null }) {
    const { anzahl } = monteCarloParams;
    const analyzer = scenarioAnalyzer || new ScenarioAnalyzer(anzahl);

    const chunk = await runMonteCarloChunk({
        inputs,
        monteCarloParams,
        widowOptions,
        useCapeSampling,
        onProgress,
        engine,
        runRange: { start: 0, count: anzahl }
    });

    if (analyzer && chunk.runMeta) {
        for (const meta of chunk.runMeta) {
            meta.isRandomSample = analyzer.shouldCaptureRandomSample(meta.index);
            analyzer.addRun(meta);
        }
    }

    onProgress(95);
    await new Promise(resolve => setTimeout(resolve, 0));

    const aggregatedResults = buildMonteCarloAggregates({
        inputs,
        totalRuns: anzahl,
        buffers: chunk.buffers,
        heatmap: chunk.heatmap,
        bins: chunk.bins,
        totals: chunk.totals,
        lists: chunk.lists,
        allRealWithdrawalsSample: chunk.allRealWithdrawalsSample
    });

    onProgress(100);

    return {
        aggregatedResults,
        failCount: chunk.totals.failCount,
        worstRun: chunk.worstRun,
        worstRunCare: chunk.worstRunCare,
        pflegeTriggeredCount: chunk.totals.pflegeTriggeredCount
    };
}

export async function runMonteCarloChunk({
    inputs,
    monteCarloParams,
    widowOptions,
    useCapeSampling,
    runRange = null,
    onProgress = () => { },
    logIndices = null,
    engine = null
}) {
    const {
        anzahl,
        maxDauer,
        blockSize,
        seed,
        methode,
        rngMode = 'per-run-seed',
        startYearMode = 'UNIFORM',
        startYearFilter = 1970,
        startYearHalfLife = 20
    } = monteCarloParams;
    const runStart = runRange?.start ?? 0;
    const runCount = runRange?.count ?? anzahl;

    onProgress(0);

    const resolvedRngMode = rngMode === 'legacy-stream' ? 'legacy-stream' : 'per-run-seed';
    if (resolvedRngMode === 'legacy-stream' && runStart !== 0) {
        throw new Error('legacy-stream RNG does not support chunked run ranges.');
    }

    const legacyRand = resolvedRngMode === 'legacy-stream' ? rng(seed) : null;
    const comboRand = legacyRand || rng(makeRunSeed(seed, 0, RUNIDX_COMBO_SETUP));
    const stressCtxMaster = buildStressContext(inputs.stressPreset, comboRand);

    const buffers = createMonteCarloBuffers(runCount);
    const {
        finalOutcomes,
        taxOutcomes,
        kpiLebensdauer,
        kpiKuerzungsjahre,
        kpiMaxKuerzung,
        volatilities,
        maxDrawdowns,
        depotErschoepft,
        alterBeiErschoepfung,
        anteilJahreOhneFlex,
        stress_maxDrawdowns,
        stress_timeQuoteAbove45,
        stress_cutYears,
        stress_CaR_P10_Real,
        stress_recoveryYears
    } = buffers;

    // Realistischer Schwellenwert für Depot-Erschöpfung: 100 € (vorher 0,000001 €)
    const DEPOT_DEPLETION_THRESHOLD = 100;

    let worstRun = null;
    let worstRunCare = null;

    let failCount = 0;
    let pflegeTriggeredCount = 0;
    const entryAges = [], careDepotCosts = [];
    let shortfallWithCareCount = 0, shortfallNoCareProxyCount = 0;
    // Fix: Use dynamic arrays to separate populations instead of fixed-size arrays with 0s
    const endWealthWithCareList = [];
    const endWealthNoCareList = [];

    // Dual Care KPIs
    const p1CareYearsArr = new Uint16Array(runCount);
    const p2CareYearsArr = new Uint16Array(runCount);
    const bothCareYearsArr = new Uint16Array(runCount);
    const entryAgesP2 = [];
    let p2TriggeredCount = 0;
    const maxAnnualCareSpendTriggered = [];
    const bothCareYearsOverlapTriggered = [];

    // Arrays for care years (only for triggered cases)
    const p1CareYearsTriggered = [];
    const p2CareYearsTriggered = [];
    const bothCareYearsTriggered = [];

    const heatmap = Array(10).fill(0).map(() => new Uint32Array(MC_HEATMAP_BINS.length - 1));
    let totalSimulatedYears = 0, totalYearsQuoteAbove45 = 0;
    const allRealWithdrawalsSample = [];

    const runMeta = [];

    // Optimiert: Dynamisches Progress-Update-Intervall für bessere Performance
    // Mindestens alle 100 Runs ODER 1% der Gesamtzahl (je nachdem was größer ist)
    const progressUpdateInterval = Math.max(100, Math.floor(runCount / 100));
    let lastProgressPct = -1;

    const logIndexSet = Array.isArray(logIndices) ? new Set(logIndices) : null;
    const yearSamplingConfig = buildYearSamplingConfig(startYearMode, annualData, {
        startYearFilter,
        startYearHalfLife,
        blockSize
    });
    const startYearCdf = buildStartYearCdf(startYearMode, annualData, { startYearFilter, startYearHalfLife });

    for (let i = 0; i < runCount; i++) {
        if (i % progressUpdateInterval === 0) {
            const pct = Math.floor((i / runCount) * 90);
            if (pct > lastProgressPct) {
                lastProgressPct = pct;
                onProgress(pct);
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        const runIdx = runStart + i;
        let failed = false, totalTaxesThisRun = 0, kpiJahreMitKuerzungDieserLauf = 0, kpiMaxKuerzungDieserLauf = 0;
        let lebensdauer = 0, jahreOhneFlex = 0, triggeredAge = null;
        let careEverActive = false;

        const rand = legacyRand || rng(makeRunSeed(seed, 0, runIdx));

        // --- CAPE-SAMPLING LOGIC START ---
        let startYearIndex;

        if (useCapeSampling && inputs.marketCapeRatio > 0) {
            const candidates = getStartYearCandidates(inputs.marketCapeRatio, annualData);
            if (candidates.length > 0) {
                const chosenYear = candidates[Math.floor(rand() * candidates.length)];
                startYearIndex = annualData.findIndex(d => d.jahr === chosenYear);
                if (startYearIndex === -1) startYearIndex = pickStartYearIndex(rand, annualData, null);
            } else {
                startYearIndex = pickStartYearIndex(rand, annualData, null);
            }
        } else {
            startYearIndex = yearSamplingConfig?.allSampler
                ? pickFromSampler(rand, yearSamplingConfig.allSampler, pickStartYearIndex(rand, annualData, null))
                : pickStartYearIndex(rand, annualData, startYearCdf);
        }
        // --- CAPE-SAMPLING LOGIC END ---

        let simState = initMcRunState(inputs, startYearIndex);
        if (yearSamplingConfig) {
            simState.samplerState.yearSampling = yearSamplingConfig;
        }

        const depotWertHistorie = [portfolioTotal(simState.portfolio)];
        const shouldLogRun = !logIndexSet || logIndexSet.has(runIdx);
        const currentRunLog = shouldLogRun ? [] : null;
        let depotNurHistorie = [sumDepot(simState.portfolio)];
        let depotErschoepfungAlterGesetzt = false;
        let widowBenefitActiveForP1 = false; // P1 erhält Witwenrente nach P2
        let widowBenefitActiveForP2 = false; // P2 erhält Witwenrente nach P1

        // Track dynamic transition year (can be shortened by care event)
        let effectiveTransitionYear = inputs.transitionYear ?? 0;

        // Dual Care: P1 + P2 (Partner)
        const careMetaP1 = makeDefaultCareMeta(inputs.pflegefallLogikAktivieren, inputs.geschlecht);
        const partnerGenderFallback = inputs.geschlecht === 'm' ? 'w' : 'm';
        const careMetaP2 = (inputs.partner?.aktiv === true)
            ? makeDefaultCareMeta(inputs.pflegefallLogikAktivieren, inputs.partner?.geschlecht || partnerGenderFallback)
            : null;
        const hasPartner = careMetaP2 !== null;

        // Separate RNG streams for independent care events
        const rngCareP1 = rand.fork('CARE_P1');
        const rngCareP2 = careMetaP2 ? rand.fork('CARE_P2') : null;

        let stressCtx = cloneStressContext(stressCtxMaster);

        const stressYears = stressCtxMaster?.preset?.years ?? 0;
        const stressPortfolioValues = [portfolioTotal(simState.portfolio)];
        let stressYearsAbove45 = 0;
        let stressCutYears = 0;
        const stressRealWithdrawals = [];
        let postStressRecoveryYears = null;

        // Track dual care activity
        let p1Alive = true, p2Alive = hasPartner;
        let p1CareYears = 0, p2CareYears = 0, bothCareYears = 0;
        let triggeredAgeP2 = null;
        let runEndedBecauseAllDied = false;
        let deathLogContext = null;
        let retirementYearCounter = 0; // Track years in retirement for heatmap alignment
        let p1ActiveThisYear = false;
        let p2ActiveThisYear = false;

        for (let simulationsJahr = 0; simulationsJahr < maxDauer; simulationsJahr++) {
            const ageP1 = inputs.startAlter + simulationsJahr;
            lebensdauer = simulationsJahr + 1;
            const marriageYearsCompleted = computeMarriageYearsCompleted(simulationsJahr, widowOptions);
            const widowModeEnabled = widowOptions.mode === 'percent' && widowOptions.percent > 0 && hasPartner;
            const widowEligibleThisYear = widowModeEnabled && marriageYearsCompleted > 0 && marriageYearsCompleted >= widowOptions.minMarriageYears;
            const p1AliveAtStart = p1Alive;
            const p2AliveAtStart = p2Alive;

            // Calculate P2 age (based on partner offset)
            let ageP2 = ageP1;
            if (inputs.partner?.aktiv) {
                // Use partner's startAlter + simulationsJahr to age them correctly
                ageP2 = inputs.partner.startAlter + simulationsJahr;
            }

            let yearData = sampleNextYearData(simState, methode, blockSize, rand, stressCtx);
            yearData = applyStressOverride(yearData, stressCtx, rand);

            // Update care for both persons independently
            if (p1Alive) {
                updateCareMeta(careMetaP1, inputs, ageP1, yearData, rngCareP1);
                if (careMetaP1 && careMetaP1.active) careEverActive = true;
                if (careMetaP1 && careMetaP1.triggered && triggeredAge === null) triggeredAge = ageP1;
            }

            if (p2Alive && careMetaP2) {
                updateCareMeta(careMetaP2, inputs, ageP2, yearData, rngCareP2);
                if (careMetaP2 && careMetaP2.triggered && triggeredAgeP2 === null) triggeredAgeP2 = ageP2;
                if (careMetaP2 && careMetaP2.active) careEverActive = true;
            }

            // FORCE RETIREMENT if care is active in Accumulation Phase
            // If we are currently in accumulation (simulation year < transition year) and care triggers,
            // we immediately stop accumulation and switch to retirement mode for this and future years.
            if (inputs.accumulationPhase?.enabled && simulationsJahr < effectiveTransitionYear) {
                if ((p1Alive && careMetaP1?.active) || (p2Alive && careMetaP2?.active)) {
                    effectiveTransitionYear = simulationsJahr;
                }
            }

            // Track care years
            p1ActiveThisYear = p1Alive && careMetaP1?.active;
            p2ActiveThisYear = p2Alive && careMetaP2?.active;
            if (p2ActiveThisYear) careEverActive = true;
            if (p1ActiveThisYear) p1CareYears++;
            if (p2ActiveThisYear) p2CareYears++;
            if (p1ActiveThisYear && p2ActiveThisYear) bothCareYears++;

            // Start Mortality Check
            // Check if we are in accumulation phase - if so, NO MORTALITY
            const isAccumulation = inputs.accumulationPhase?.enabled && simulationsJahr < effectiveTransitionYear;

            // Separate mortality for P1 and P2
            if (p1Alive) {
                if (isAccumulation) {
                    // No death in accumulation phase
                } else {
                    // Fallback für sehr junge Alter (< 18): sehr niedrige Sterbewahrscheinlichkeit statt 100%
                    let qx1 = MORTALITY_TABLE[inputs.geschlecht][ageP1] || 0.0005;
                    const careFactorP1 = computeCareMortalityMultiplier(careMetaP1, inputs);
                    if (careFactorP1 > 1) {
                        qx1 = Math.min(1.0, qx1 * careFactorP1);
                    }
                    if (rand() < qx1) {
                        p1Alive = false;
                    }
                }
            }

            if (p2Alive && careMetaP2) {
                if (isAccumulation) {
                    // No death in accumulation phase
                } else {
                    // Use partner's gender if specified, otherwise assume opposite gender as fallback
                    const p2Gender = inputs.partner?.geschlecht || (inputs.geschlecht === 'm' ? 'w' : 'm');
                    // Fallback für sehr junge Alter (< 18): sehr niedrige Sterbewahrscheinlichkeit statt 100%
                    let qx2 = MORTALITY_TABLE[p2Gender][ageP2] || 0.0005;
                    const careFactorP2 = computeCareMortalityMultiplier(careMetaP2, inputs);
                    if (careFactorP2 > 1) {
                        qx2 = Math.min(1.0, qx2 * careFactorP2);
                    }
                    if (rand() < qx2) {
                        p2Alive = false;
                    }
                }
            }

            if (widowEligibleThisYear && (!p1AliveAtStart || !p2AliveAtStart)) {
                if (!p1AliveAtStart && p2AliveAtStart) {
                    widowBenefitActiveForP2 = true;
                } else if (!p2AliveAtStart && p1AliveAtStart) {
                    widowBenefitActiveForP1 = true;
                }
            }

            if (!p1Alive && !p2Alive) {
                runEndedBecauseAllDied = true;
                deathLogContext = {
                    jahr: simulationsJahr + 1,
                    histJahr: yearData.jahr,
                    inflation: yearData.inflation
                };
                break;
            }

            // Calculate care costs from both persons
            const { zusatzFloor: careFloorP1 } = calcCareCost(careMetaP1, null);
            const { zusatzFloor: careFloorP2 } = careMetaP2 ? calcCareCost(careMetaP2, null) : { zusatzFloor: 0 };
            const totalCareFloor = careFloorP1 + careFloorP2;

            // Apply flex reduction by splitting the household flex share between living persons
            // so that nur der Pflegeanteil gekürzt wird.
            const effectiveFlexFactor = computeHouseholdFlexFactor({
                p1Alive,
                careMetaP1,
                p2Alive,
                careMetaP2
            });

            // Do NOT modify simState.baseFlex permanently.
            // We pass the effectiveFlexFactor to simulateOneYear to apply it only for the current year's spending decision.
            // The simulation engine will then base the NEXT year's state on the original (unreduced) baseFlex.
            const stateWithCareFlex = {
                ...simState
            };

            // Berechne dynamische Rentenanpassung basierend auf Modus (fix/wage/cpi)
            const effectiveRentAdjPct = computeRentAdjRate(inputs, yearData);
            const adjustedInputs = { ...inputs, rentAdjPct: effectiveRentAdjPct, transitionYear: effectiveTransitionYear };
            const householdContext = {
                p1Alive,
                p2Alive: hasPartner ? p2Alive : false,
                widowBenefits: {
                    p1FromP2: widowBenefitActiveForP1,
                    p2FromP1: widowBenefitActiveForP2
                }
            };

            // Pass care floor and Flex Factor as separate parameters
            const result = simulateOneYear(stateWithCareFlex, adjustedInputs, yearData, simulationsJahr, careMetaP1, totalCareFloor, householdContext, effectiveFlexFactor, engine);

            if (result.isRuin) {
                failed = true;
                // Bei Ruin ist das Depot definitiv erschöpft - setze Alter
                if (!depotErschoepfungAlterGesetzt) {
                    alterBeiErschoepfung[i] = ageP1;
                    depotErschoepfungAlterGesetzt = true;
                }
                if (currentRunLog) currentRunLog.push({
                    jahr: simulationsJahr + 1,
                    histJahr: yearData.jahr,
                    inflation: yearData.inflation,
                    aktionUndGrund: ">>> RUIN <<<",
                    wertAktien: 0, wertGold: 0, liquiditaet: 0,
                    entscheidung: { jahresEntnahme: 0 },
                    floor_brutto: 0,
                    rente1: inputs.rente1 || 0,
                    rente2: inputs.rente2 || 0,
                    renteSum: (inputs.rente1 || 0) + (inputs.rente2 || 0),
                    FlexRatePct: 0,
                    flex_erfuellt_nominal: 0,
                    QuoteEndPct: 0,
                    RunwayCoveragePct: 0,
                    RealReturnEquityPct: 0,
                    RealReturnGoldPct: 0,
                    jahresentnahme_real: 0,
                    Person1Alive: p1Alive ? 1 : 0,
                    Person2Alive: hasPartner ? (p2Alive ? 1 : 0) : null,
                    // P1 Care (legacy compatibility)
                    pflege_aktiv: !!(careMetaP1 && careMetaP1.active),
                    pflege_grade: careMetaP1?.grade ?? null,
                    pflege_grade_label: careMetaP1?.gradeLabel ?? '',
                    pflege_zusatz_floor: careMetaP1?.zusatzFloorZiel ?? 0,
                    pflege_zusatz_floor_delta: careMetaP1?.zusatzFloorDelta ?? 0,
                    pflege_flex_faktor: careMetaP1?.flexFactor ?? 1,
                    pflege_kumuliert: careMetaP1?.kumulierteKosten ?? 0,
                    pflege_floor_anchor: careMetaP1?.log_floor_anchor ?? 0,
                    pflege_maxfloor_anchor: careMetaP1?.log_maxfloor_anchor ?? 0,
                    pflege_cap_zusatz: careMetaP1?.log_cap_zusatz ?? 0,
                    pflege_delta_flex: careMetaP1?.log_delta_flex ?? 0,
                    // P2 Care (new dual care support)
                    CareP1_Active: p1ActiveThisYear ? 1 : 0,
                    CareP1_Cost: p1ActiveThisYear ? (careMetaP1?.zusatzFloorZiel ?? 0) : 0,
                    CareP1_Grade: p1ActiveThisYear ? (careMetaP1?.grade ?? null) : null,
                    CareP1_GradeLabel: p1ActiveThisYear ? (careMetaP1?.gradeLabel ?? '') : '',
                    CareP2_Active: p2ActiveThisYear ? 1 : 0,
                    CareP2_Cost: p2ActiveThisYear ? (careMetaP2?.zusatzFloorZiel ?? 0) : 0,
                    CareP2_Grade: p2ActiveThisYear ? (careMetaP2?.grade ?? null) : null,
                    CareP2_GradeLabel: p2ActiveThisYear ? (careMetaP2?.gradeLabel ?? '') : ''
                });
                if (BREAK_ON_RUIN) break;
            } else {
                simState = result.newState;
                totalTaxesThisRun += result.totalTaxesThisYear;
                if (result.logData.entscheidung.kuerzungProzent >= 10) kpiJahreMitKuerzungDieserLauf++;
                kpiMaxKuerzungDieserLauf = Math.max(kpiMaxKuerzungDieserLauf, result.logData.entscheidung.kuerzungProzent);

                const depotOnlyNow = sumDepot(simState.portfolio);
                depotNurHistorie.push(depotOnlyNow);

                if (!depotErschoepfungAlterGesetzt && depotOnlyNow <= DEPOT_DEPLETION_THRESHOLD) {
                    alterBeiErschoepfung[i] = ageP1;
                    depotErschoepfungAlterGesetzt = true;
                }

                if (result.logData.FlexRatePct <= 0.1) {
                    jahreOhneFlex++;
                }

                totalSimulatedYears++;
                if (result.logData.entnahmequote * 100 > 4.5) totalYearsQuoteAbove45++;
                if (runIdx % 100 === 0) allRealWithdrawalsSample.push(result.logData.jahresentnahme_real);

                if (!isAccumulation && retirementYearCounter < 10) {
                    const quote = result.logData.entnahmequote * 100;
                    for (let b = 0; b < MC_HEATMAP_BINS.length - 1; b++) {
                        if (quote >= MC_HEATMAP_BINS[b] && quote < MC_HEATMAP_BINS[b + 1]) { heatmap[retirementYearCounter][b]++; break; }
                    }
                    retirementYearCounter++;
                }

                depotWertHistorie.push(portfolioTotal(simState.portfolio));

                if (stressYears > 0 && simulationsJahr < stressYears) {
                    stressPortfolioValues.push(portfolioTotal(simState.portfolio));

                    if (result.logData.entnahmequote * 100 > 4.5) {
                        stressYearsAbove45++;
                    }
                    if (result.logData.entscheidung.kuerzungProzent > 10) {
                        stressCutYears++;
                    }
                    stressRealWithdrawals.push(result.logData.jahresentnahme_real);
                }

                if (stressYears > 0 && simulationsJahr >= stressYears && postStressRecoveryYears === null) {
                    if (result.logData.entnahmequote * 100 < 3.5) {
                        postStressRecoveryYears = simulationsJahr - (stressYears - 1);
                    }
                }

                if (currentRunLog) currentRunLog.push({
                    jahr: simulationsJahr + 1, histJahr: yearData.jahr, inflation: yearData.inflation, ...result.logData,
                    Person1Alive: p1Alive ? 1 : 0,
                    Person2Alive: hasPartner ? (p2Alive ? 1 : 0) : null,
                    // P1 Care (legacy compatibility)
                    pflege_aktiv: !!(careMetaP1 && careMetaP1.active),
                    pflege_zusatz_floor: careMetaP1?.zusatzFloorZiel ?? 0,
                    pflege_zusatz_floor_delta: careMetaP1?.zusatzFloorDelta ?? 0,
                    pflege_flex_faktor: careMetaP1?.flexFactor ?? 1,
                    pflege_kumuliert: careMetaP1?.kumulierteKosten ?? 0,
                    pflege_floor_anchor: careMetaP1?.log_floor_anchor ?? 0,
                    pflege_maxfloor_anchor: careMetaP1?.log_maxfloor_anchor ?? 0,
                    pflege_cap_zusatz: careMetaP1?.log_cap_zusatz ?? 0,
                    pflege_delta_flex: careMetaP1?.log_delta_flex ?? 0,
                    // P2 Care (new dual care support)
                    CareP1_Active: p1ActiveThisYear ? 1 : 0,
                    CareP1_Cost: p1ActiveThisYear ? (careMetaP1?.zusatzFloorZiel ?? 0) : 0,
                    CareP1_Grade: p1ActiveThisYear ? (careMetaP1?.grade ?? null) : null,
                    CareP1_GradeLabel: p1ActiveThisYear ? (careMetaP1?.gradeLabel ?? '') : '',
                    CareP2_Active: p2ActiveThisYear ? 1 : 0,
                    CareP2_Cost: p2ActiveThisYear ? (careMetaP2?.zusatzFloorZiel ?? 0) : 0,
                    CareP2_Grade: p2ActiveThisYear ? (careMetaP2?.grade ?? null) : null,
                    CareP2_GradeLabel: p2ActiveThisYear ? (careMetaP2?.gradeLabel ?? '') : ''
                });
            }
        }

        if (runEndedBecauseAllDied) {
            // Ergänze einen letzten Log-Eintrag, damit klar ersichtlich ist, dass alle Personen verstorben sind.
            const portfolioSnapshot = simState?.portfolio || {};
            if (currentRunLog) currentRunLog.push({
                jahr: deathLogContext?.jahr ?? (currentRunLog.length + 1),
                histJahr: deathLogContext?.histJahr ?? null,
                inflation: deathLogContext?.inflation ?? null,
                aktionUndGrund: '>>> ENDE: Alle Personen verstorben <<<',
                wertAktien: sumDepot({ depotTranchesAktien: portfolioSnapshot.depotTranchesAktien }),
                wertGold: sumDepot({ depotTranchesGold: portfolioSnapshot.depotTranchesGold }),
                liquiditaet: portfolioSnapshot.liquiditaet ?? 0,
                entscheidung: { jahresEntnahme: 0 },
                floor_brutto: 0,
                rente1: inputs.rente1 || 0,
                rente2: inputs.rente2 || 0,
                renteSum: (inputs.rente1 || 0) + (inputs.rente2 || 0),
                FlexRatePct: 0,
                flex_erfuellt_nominal: 0,
                QuoteEndPct: 0,
                RunwayCoveragePct: 0,
                RealReturnEquityPct: 0,
                RealReturnGoldPct: 0,
                jahresentnahme_real: 0,
                Person1Alive: p1Alive ? 1 : 0,
                Person2Alive: hasPartner ? (p2Alive ? 1 : 0) : null,
                // P1 Care (legacy compatibility)
                pflege_aktiv: !!(careMetaP1 && careMetaP1.active),
                pflege_grade: careMetaP1?.grade ?? null,
                pflege_grade_label: careMetaP1?.gradeLabel ?? '',
                pflege_zusatz_floor: careMetaP1?.zusatzFloorZiel ?? 0,
                pflege_zusatz_floor_delta: careMetaP1?.zusatzFloorDelta ?? 0,
                pflege_flex_faktor: careMetaP1?.flexFactor ?? 1,
                pflege_kumuliert: careMetaP1?.kumulierteKosten ?? 0,
                pflege_floor_anchor: careMetaP1?.log_floor_anchor ?? 0,
                pflege_maxfloor_anchor: careMetaP1?.log_maxfloor_anchor ?? 0,
                pflege_cap_zusatz: careMetaP1?.log_cap_zusatz ?? 0,
                pflege_delta_flex: careMetaP1?.log_delta_flex ?? 0,
                // P2 Care (new dual care support)
                CareP1_Active: p1ActiveThisYear ? 1 : 0,
                CareP1_Cost: p1ActiveThisYear ? (careMetaP1?.zusatzFloorZiel ?? 0) : 0,
                CareP1_Grade: p1ActiveThisYear ? (careMetaP1?.grade ?? null) : null,
                CareP1_GradeLabel: p1ActiveThisYear ? (careMetaP1?.gradeLabel ?? '') : '',
                CareP2_Active: p2ActiveThisYear ? 1 : 0,
                CareP2_Cost: p2ActiveThisYear ? (careMetaP2?.zusatzFloorZiel ?? 0) : 0,
                CareP2_Grade: p2ActiveThisYear ? (careMetaP2?.grade ?? null) : null,
                CareP2_GradeLabel: p2ActiveThisYear ? (careMetaP2?.gradeLabel ?? '') : ''
            });
        }

        const { maxDDpct } = computeRunStatsFromSeries(depotWertHistorie);
        volatilities[i] = maxDDpct;
        maxDrawdowns[i] = maxDDpct;

        if (stressYears > 0) {
            const { maxDDpct: stressMaxDD } = computeRunStatsFromSeries(stressPortfolioValues);
            stress_maxDrawdowns[i] = stressMaxDD;
            stress_timeQuoteAbove45[i] = (stressYearsAbove45 / stressYears) * 100;
            stress_cutYears[i] = stressCutYears;
            stress_CaR_P10_Real[i] = stressRealWithdrawals.length > 0 ? quantile(stressRealWithdrawals, 0.10) : 0;
            if (postStressRecoveryYears === null) postStressRecoveryYears = stressYears;
            stress_recoveryYears[i] = postStressRecoveryYears;
        } else {
            stress_maxDrawdowns[i] = 0;
            stress_timeQuoteAbove45[i] = 0;
            stress_cutYears[i] = 0;
            stress_CaR_P10_Real[i] = 0;
            stress_recoveryYears[i] = 0;
        }

        const depotOnlyStart = depotNurHistorie[0] || 1;
        const depotOnlyEnd = depotNurHistorie[depotNurHistorie.length - 1] || 0;
        const ruinOrDepleted = failed || depotOnlyEnd <= DEPOT_DEPLETION_THRESHOLD;
        finalOutcomes[i] = failed ? 0 : portfolioTotal(simState.portfolio);
        depotErschoepft[i] = ruinOrDepleted ? 1 : 0;
        taxOutcomes[i] = totalTaxesThisRun;
        kpiLebensdauer[i] = lebensdauer;
        kpiKuerzungsjahre[i] = kpiJahreMitKuerzungDieserLauf;
        kpiMaxKuerzung[i] = kpiMaxKuerzungDieserLauf;
        anteilJahreOhneFlex[i] = lebensdauer > 0 ? jahreOhneFlex / lebensdauer : 0;

        if (careEverActive) {
            pflegeTriggeredCount++;
            entryAges.push(triggeredAge ?? 0);
            shortfallWithCareCount += ruinOrDepleted ? 1 : 0;
            endWealthWithCareList.push(finalOutcomes[i]);
            careDepotCosts.push(Math.max(0, depotOnlyStart - depotOnlyEnd));
            p1CareYearsTriggered.push(p1CareYears);
            bothCareYearsTriggered.push(bothCareYears);
            if (hasPartner) {
                // Legacy support: We count potential shortfalls if no care happened? 
                // Currently strictly separating populations is better.
                // shortfallNoCareProxyCount += depotOnlyStart <= DEPOT_DEPLETION_THRESHOLD ? 1 : 0;
                p2CareYearsTriggered.push(p2CareYears);
                entryAgesP2.push(triggeredAgeP2 ?? 0);
            }
            const maxAnnualCareCost = Math.max(careMetaP1?.zusatzFloorZiel || 0, careMetaP2?.zusatzFloorZiel || 0);
            maxAnnualCareSpendTriggered.push(maxAnnualCareCost);
            bothCareYearsOverlapTriggered.push(bothCareYears);
        } else {
            endWealthNoCareList.push(finalOutcomes[i]);
            shortfallNoCareProxyCount += ruinOrDepleted ? 1 : 0;
        }

        p1CareYearsArr[i] = p1CareYears;
        p2CareYearsArr[i] = p2CareYears;
        bothCareYearsArr[i] = bothCareYears;
        if (p2CareYears > 0) { p2TriggeredCount++; }

        runMeta.push({
            index: runIdx,
            endVermoegen: finalOutcomes[i],
            failed,
            lebensdauer,
            careEverActive,
            totalCareYears: p1CareYears + p2CareYears,
            totalCareCosts: Math.max(0, depotOnlyStart - depotOnlyEnd),
            maxKuerzung: kpiMaxKuerzungDieserLauf,
            jahreOhneFlex,
            logDataRows: currentRunLog ? [...currentRunLog] : [],
            triggeredAge
        });

        worstRun = pickWorstRun(worstRun, {
            finalVermoegen: finalOutcomes[i],
            logDataRows: currentRunLog || [],
            failed,
            comboIdx: 0,
            runIdx
        });

        if (careEverActive) {
            worstRunCare = pickWorstRun(worstRunCare, {
                finalVermoegen: finalOutcomes[i],
                logDataRows: currentRunLog || [],
                failed,
                hasCare: true,
                comboIdx: 0,
                runIdx
            });
        }

        if (failed) failCount++;
    }

    if (!worstRun) {
        worstRun = { finalVermoegen: Infinity, logDataRows: [], failed: false, comboIdx: 0, runIdx: 0 };
    }
    if (!worstRunCare) {
        worstRunCare = { finalVermoegen: Infinity, logDataRows: [], failed: false, hasCare: false, comboIdx: 0, runIdx: 0 };
    }

    return {
        runRange: { start: runStart, count: runCount },
        buffers,
        heatmap,
        bins: MC_HEATMAP_BINS,
        totals: {
            failCount,
            pflegeTriggeredCount,
            totalSimulatedYears,
            totalYearsQuoteAbove45,
            shortfallWithCareCount,
            shortfallNoCareProxyCount,
            p2TriggeredCount
        },
        lists: {
            entryAges,
            entryAgesP2,
            careDepotCosts,
            endWealthWithCareList,
            endWealthNoCareList,
            p1CareYearsTriggered,
            p2CareYearsTriggered,
            bothCareYearsOverlapTriggered,
            maxAnnualCareSpendTriggered
        },
        allRealWithdrawalsSample,
        worstRun,
        worstRunCare,
        runMeta
    };
}
