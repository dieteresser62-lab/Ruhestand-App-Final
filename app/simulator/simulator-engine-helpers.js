/**
 * Module: Simulator Engine Helpers
 * Purpose: Shared helper functions for the simulation engine.
 *          Handles MC initialization, market data preparation, care logic updates, and statistics.
 * Usage: Imported by simulator-engine-direct.js and simulator-engine-wrapper.js.
 * Dependencies: simulator-data.js, simulator-portfolio.js
 */
"use strict";

import { HISTORICAL_DATA, PFLEGE_GRADE_PROBABILITIES, PFLEGE_GRADE_LABELS, PFLEGE_GRADE_PROGRESSION_PROBABILITIES, SUPPORTED_PFLEGE_GRADES, annualData, REGIME_DATA, REGIME_TRANSITIONS, MORTALITY_TABLE } from './simulator-data.js';
import { initializePortfolio, prepareHistoricalData } from './simulator-portfolio.js';

let historicalDataPrepared = false;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function prepareHistoricalDataOnce() {
    if (historicalDataPrepared) return;
    prepareHistoricalData();
    historicalDataPrepared = true;
}

function stableStringify(value) {
    const stringify = (val) => {
        if (val === null) return 'null';
        const type = typeof val;
        if (type === 'number') {
            if (Number.isNaN(val)) return '"__NaN__"';
            if (val === Infinity) return '"__Infinity__"';
            if (val === -Infinity) return '"__-Infinity__"';
            return JSON.stringify(val);
        }
        if (type === 'string') return JSON.stringify(val);
        if (type === 'boolean') return val ? 'true' : 'false';
        if (type === 'undefined') return '"__undefined__"';
        if (Array.isArray(val)) {
            return `[${val.map(stringify).join(',')}]`;
        }
        if (type === 'object') {
            const keys = Object.keys(val).sort();
            return `{${keys.map(k => `${JSON.stringify(k)}:${stringify(val[k])}`).join(',')}}`;
        }
        return JSON.stringify(String(val));
    };
    return stringify(value);
}

function hashString(input) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16);
}

export function compileScenario(inputs, widowOptions, methode, useCapeSampling, stressPreset) {
    const payload = { inputs, widowOptions, methode, useCapeSampling, stressPreset };
    const key = hashString(stableStringify(payload));
    return {
        scenarioKey: key,
        compiledScenario: payload
    };
}

export function getDataVersion() {
    return {
        annualDataHash: hashString(stableStringify(annualData)),
        regimeHash: hashString(stableStringify(REGIME_TRANSITIONS))
    };
}

/**
 * Hilfsfunktion für CAPE-Ratio Resolution
 */
function resolveCapeRatio(yearSpecificCape, inputCape, historicalCape) {
    if (typeof yearSpecificCape === 'number' && Number.isFinite(yearSpecificCape) && yearSpecificCape > 0) {
        return yearSpecificCape;
    }
    if (typeof inputCape === 'number' && Number.isFinite(inputCape) && inputCape > 0) {
        return inputCape;
    }
    if (typeof historicalCape === 'number' && Number.isFinite(historicalCape) && historicalCape > 0) {
        return historicalCape;
    }
    return 0;
}

/**
 * Initialisiert den Startzustand für einen Monte-Carlo-Lauf
 */
export function initMcRunState(inputs, startYearIndex) {
    const startPortfolio = initializePortfolio(inputs);

    const histYears = Object.keys(HISTORICAL_DATA).map(Number).sort((a, b) => a - b);
    const minIndex = 4;
    const maxIndex = Math.max(minIndex, annualData.length - 1);
    const rawIndex = Number.isFinite(startYearIndex) ? Math.round(startYearIndex) : minIndex;
    const effectiveIndex = Math.min(maxIndex, Math.max(minIndex, rawIndex));
    // Startjahr wird aus den historischen Daten gezogen (Index stabilisiert).
    const startJahr = annualData[effectiveIndex].jahr;

    const marketDataHist = {
        endeVJ: HISTORICAL_DATA[startJahr - 1]?.msci_eur || 1000,
        endeVJ_1: HISTORICAL_DATA[startJahr - 2]?.msci_eur || 1000,
        endeVJ_2: HISTORICAL_DATA[startJahr - 3]?.msci_eur || 1000,
        endeVJ_3: HISTORICAL_DATA[startJahr - 4]?.msci_eur || 1000,
        ath: 0,
        jahreSeitAth: 0,
        inflation: HISTORICAL_DATA[startJahr - 1]?.inflation_de || 2.0,
        capeRatio: resolveCapeRatio(undefined, inputs.marketCapeRatio, 0)
    };

    // ATH-Bestimmung über alle Jahre vor Startjahr.
    const pastValues = histYears.filter(y => y < startJahr).map(y => HISTORICAL_DATA[y].msci_eur);
    marketDataHist.ath = pastValues.length > 0 ? Math.max(...pastValues, marketDataHist.endeVJ) : marketDataHist.endeVJ;
    if (marketDataHist.endeVJ < marketDataHist.ath) {
        let lastAthYear = Math.max(...histYears.filter(y => y < startJahr && HISTORICAL_DATA[y].msci_eur >= marketDataHist.ath));
        marketDataHist.jahreSeitAth = (startJahr - 1) - lastAthYear;
    }

    // Ansparphase-Tracking (vor Ruhestand) optional.
    const accumulationState = inputs.accumulationPhase?.enabled ? {
        yearsSaved: 0,
        totalContributed: 0,
        sparrateThisYear: 0
    } : null;

    return {
        portfolio: startPortfolio,
        baseFloor: inputs.startFloorBedarf,
        baseFlex: inputs.startFlexBedarf,
        baseFlexBudgetAnnual: inputs.flexBudgetAnnual || 0,
        baseFlexBudgetRecharge: inputs.flexBudgetRecharge || 0,
        lastState: null,
        // Initialisiere mit Eingabewert (Jahresbasis), damit Indexierung ab Jahr 0 starten kann
        currentAnnualPension: (inputs.renteMonatlich || 0) * 12,
        currentAnnualPension2: (inputs.partner?.brutto || 0),
        marketDataHist: marketDataHist,
        samplerState: {},
        widowPensionP1: 0,
        widowPensionP2: 0,
        accumulationState,
        transitionYear: inputs.transitionYear || 0
    };
}

/**
 * Schätzt die verbleibende Lebenserwartung anhand der Sterbetafel.
 */
export function estimateRemainingLifeYears(gender, currentAge) {
    const table = MORTALITY_TABLE[gender] || MORTALITY_TABLE.m;
    const ages = Object.keys(table).map(Number).sort((a, b) => a - b);
    const minAge = ages[0] ?? currentAge;
    const maxAge = ages[ages.length - 1] ?? currentAge;
    let survivalProbability = 1;
    let expectedYears = 0;

    // Erwartungswert über die Überlebenswahrscheinlichkeiten der Sterbetafel.
    for (let age = Math.max(currentAge, minAge); age <= maxAge; age++) {
        const qxRaw = table[age] ?? 1;
        const qx = Math.min(1, Math.max(0, qxRaw));
        expectedYears += survivalProbability;
        survivalProbability *= (1 - qx);
        if (survivalProbability < 0.0001) break;
    }

    return Math.max(1, Math.round(expectedYears));
}

/**
 * Joint Life: Erwartete Restjahre bis der letzte von beiden stirbt.
 * Der Erwartungswert wird ueber die Wahrscheinlichkeit berechnet,
 * dass mindestens eine Person im jeweiligen Jahr noch lebt.
 * Hinweis zur Reihenfolge: Fuer den Erwartungswert wird die aktuelle
 * Ueberlebenswahrscheinlichkeit aufsummiert und danach in den naechsten
 * Jahresschritt fortgeschrieben.
 */
export function estimateJointRemainingLifeYears(gender1, age1, gender2, age2) {
    const table1 = MORTALITY_TABLE[gender1] || MORTALITY_TABLE.m;
    const table2 = MORTALITY_TABLE[gender2] || MORTALITY_TABLE.m;
    let survP1 = 1;
    let survP2 = 1;
    let expectedYears = 0;

    for (let t = 0; t < 60; t++) {
        const qx1 = Math.min(1, Math.max(0, table1[age1 + t] ?? 1));
        const qx2 = Math.min(1, Math.max(0, table2[age2 + t] ?? 1));
        const jointSurvival = 1 - ((1 - survP1) * (1 - survP2));
        expectedYears += jointSurvival;
        survP1 *= (1 - qx1);
        survP2 *= (1 - qx2);
        if (jointSurvival < 0.0001) break;
    }

    return Math.max(1, Math.round(expectedYears));
}

/**
 * Restlaufzeit auf einem Langlebigkeits-Quantil fuer eine Einzelperson.
 * Liefert den ersten Jahresschritt, in dem die Ueberlebenswahrscheinlichkeit
 * auf oder unter das Zielniveau faellt.
 */
export function estimateSingleRemainingLifeYearsAtQuantile(gender, currentAge, quantile, options = {}) {
    const minYears = Number.isFinite(options?.minYears) ? options.minYears : 1;
    const maxYears = Number.isFinite(options?.maxYears) ? options.maxYears : 60;
    const table = MORTALITY_TABLE[gender] || MORTALITY_TABLE.m;
    const q = clamp(Number(quantile) || 0.85, 0.5, 0.99);
    const targetSurvival = 1 - q;
    let survivalProbability = 1;

    for (let t = 0; t < maxYears; t++) {
        const qx = clamp(Number(table[currentAge + t] ?? 1), 0, 1);
        survivalProbability *= (1 - qx);
        if (survivalProbability <= targetSurvival) {
            return clamp(t + 1, minYears, maxYears);
        }
    }
    return maxYears;
}

/**
 * Restlaufzeit auf einem Langlebigkeits-Quantil fuer Joint-Life.
 * Hinweis zur Reihenfolge: Fuer die Quantil-Suche wird der Survival-Wert
 * "am Ende von Jahr t" verwendet (erst Fortschreibung, dann Schwellwerttest).
 */
export function estimateJointRemainingLifeYearsAtQuantile(gender1, age1, gender2, age2, quantile, options = {}) {
    const minYears = Number.isFinite(options?.minYears) ? options.minYears : 1;
    const maxYears = Number.isFinite(options?.maxYears) ? options.maxYears : 60;
    const table1 = MORTALITY_TABLE[gender1] || MORTALITY_TABLE.m;
    const table2 = MORTALITY_TABLE[gender2] || MORTALITY_TABLE.m;
    const q = clamp(Number(quantile) || 0.85, 0.5, 0.99);
    const targetSurvival = 1 - q;
    let survP1 = 1;
    let survP2 = 1;

    for (let t = 0; t < maxYears; t++) {
        const qx1 = clamp(Number(table1[age1 + t] ?? 1), 0, 1);
        const qx2 = clamp(Number(table2[age2 + t] ?? 1), 0, 1);
        survP1 *= (1 - qx1);
        survP2 *= (1 - qx2);
        const jointSurvival = 1 - ((1 - survP1) * (1 - survP2));
        if (jointSurvival <= targetSurvival) {
            return clamp(t + 1, minYears, maxYears);
        }
    }
    return maxYears;
}

/**
 * Erstellt ein Standard-Pflege-Metadata-Objekt
 */
export function makeDefaultCareMeta(enabled, personGender = 'm') {
    if (!enabled) return null;
    return {
        active: false,
        triggered: false,
        startAge: -1,
        durationYears: 0,
        currentYearInCare: 0,
        zusatzFloorZiel: 0,
        zusatzFloorDelta: 0,
        flexFactor: 1.0,
        kumulierteKosten: 0,
        floorAtTrigger: 0,
        flexAtTrigger: 0,
        maxFloorAtTrigger: 0,
        grade: null,
        gradeLabel: '',
        mortalityFactor: 0,
        personGender
    };
}

function pickIndexFromSampler(rand, sampler, fallbackIndex = 0) {
    if (sampler && Array.isArray(sampler.indices) && sampler.indices.length > 0) {
        if (Array.isArray(sampler.cdf) && sampler.cdf.length === sampler.indices.length) {
            const r = Math.min(1 - Number.EPSILON, Math.max(0, rand()));
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
            return sampler.indices[low];
        }
        return sampler.indices[Math.floor(rand() * sampler.indices.length)];
    }
    return fallbackIndex;
}

/**
 * Wählt Marktdaten für das nächste Jahr gemäß der MC-Methode aus
 */
export function sampleNextYearData(state, methode, blockSize, rand, stressCtx) {
    if (!Array.isArray(annualData) || annualData.length === 0) {
        return {
            jahr: 0,
            rendite: 0,
            inflation: 0,
            zinssatz: 0,
            lohn: 0,
            gold_eur_perf: 0,
            capeRatio: null,
            regime: 'SIDEWAYS'
        };
    }
    const samplerState = state.samplerState;
    const yearSampling = samplerState?.yearSampling || null;
    const allowedIndexSet = yearSampling?.allowedIndexSet || null;

    if (stressCtx && stressCtx.type === 'conditional_bootstrap' && stressCtx.remainingYears > 0) {
        const pickable = Array.isArray(stressCtx.pickableIndices) ? stressCtx.pickableIndices : [];
        const filteredPickable = allowedIndexSet
            ? pickable.filter(idx => allowedIndexSet.has(idx))
            : pickable;
        const pool = filteredPickable.length > 0
            ? filteredPickable
            : (yearSampling?.allowedIndices || pickable);
        const randomIndex = Math.floor(rand() * pool.length);
        const chosenYearIndex = pool[randomIndex];
        return { ...annualData[chosenYearIndex] };
    }

    if (methode === 'block') {
        if (!samplerState.blockStartIndex || samplerState.yearInBlock >= blockSize) {
            if (yearSampling?.blockSampler) {
                samplerState.blockStartIndex = pickIndexFromSampler(rand, yearSampling.blockSampler, 0);
            } else if (Array.isArray(yearSampling?.blockStartIndices) && yearSampling.blockStartIndices.length > 0) {
                const indices = yearSampling.blockStartIndices;
                samplerState.blockStartIndex = indices[Math.floor(rand() * indices.length)];
            } else {
                const maxIndex = annualData.length - blockSize;
                samplerState.blockStartIndex = Math.floor(rand() * maxIndex);
            }
            samplerState.yearInBlock = 0;
        }
        const data = annualData[samplerState.blockStartIndex + samplerState.yearInBlock];
        samplerState.yearInBlock++;
        return { ...data };
    }

    let regime;
    if (methode === 'regime_iid') {
        const regimes = Object.keys(REGIME_DATA);
        regime = regimes[Math.floor(rand() * regimes.length)];
    } else {
        if (!samplerState.currentRegime) {
            if (yearSampling?.allSampler) {
                const initialIndex = pickIndexFromSampler(rand, yearSampling.allSampler, 0);
                samplerState.currentRegime = annualData[initialIndex].regime;
            } else if (Array.isArray(yearSampling?.allowedIndices) && yearSampling.allowedIndices.length > 0) {
                const indices = yearSampling.allowedIndices;
                samplerState.currentRegime = annualData[indices[Math.floor(rand() * indices.length)]].regime;
            } else {
                samplerState.currentRegime = annualData[Math.floor(rand() * annualData.length)].regime;
            }
        }

        const transitions = REGIME_TRANSITIONS[samplerState.currentRegime];
        const r = rand();
        let cumulativeProb = 0;
        let nextRegime = 'SIDEWAYS';
        for (const [targetRegime, count] of Object.entries(transitions)) {
            if (targetRegime === 'total') continue;
            cumulativeProb += (count / transitions.total);
            if (r <= cumulativeProb) {
                nextRegime = targetRegime;
                break;
            }
        }
        regime = nextRegime;
        samplerState.currentRegime = nextRegime;
    }

    const samplerForRegime = yearSampling?.regimeSamplers?.[regime];
    if (samplerForRegime && Array.isArray(samplerForRegime.indices) && samplerForRegime.indices.length > 0) {
        const idx = pickIndexFromSampler(rand, samplerForRegime, samplerForRegime.indices[0]);
        return { ...annualData[idx] };
    }

    const possibleYears = REGIME_DATA[regime];
    const chosenYear = possibleYears[Math.floor(rand() * possibleYears.length)];
    return { ...chosenYear };
}

/**
 * Berechnet Volatilität und maximalen Drawdown aus einer Serie
 */
export function computeRunStatsFromSeries(series) {
    if (!Array.isArray(series) || series.length < 2) {
        return { volPct: 0, maxDDpct: 0 };
    }
    const returns = [];
    for (let i = 1; i < series.length; i++) {
        const prev = series[i - 1] || 0;
        const cur = series[i] || 0;
        const r = (prev > 0 && isFinite(prev) && isFinite(cur)) ? (cur / prev - 1) : 0;
        returns.push(r);
    }
    const mu = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length > 1 ? returns.reduce((s, x) => s + (x - mu) * (x - mu), 0) / (returns.length - 1) : 0;
    const volPct = Math.sqrt(Math.max(variance, 0)) * 100;

    let peak = series[0];
    let maxDD = 0;
    for (let i = 1; i < series.length; i++) {
        peak = Math.max(peak, series[i]);
        if (peak > 0) {
            const dd = (series[i] - peak) / peak;
            if (isFinite(dd)) maxDD = Math.min(maxDD, dd);
        }
    }
    const maxDDpct = Math.abs(maxDD) * 100;
    return { volPct, maxDDpct };
}

/**
 * Berechnet die Pflege-Zusatzkosten für Floor und Flex
 */
export function calcCareCost(careMetaP1, careMetaP2 = null) {
    let zusatzFloor = 0;
    let flexFactor = 1.0;

    if (careMetaP1?.active) {
        zusatzFloor += careMetaP1.zusatzFloorZiel || 0;
        flexFactor = Math.min(flexFactor, careMetaP1.flexFactor || 1.0);
    }

    if (careMetaP2?.active) {
        zusatzFloor += careMetaP2.zusatzFloorZiel || 0;
        flexFactor = Math.min(flexFactor, careMetaP2.flexFactor || 1.0);
    }

    return { zusatzFloor, flexFactor };
}

/**
 * Computes the effective household flex factor by splitting the flex budget across
 * all living persons and only cutting the portion that belongs to the person in care.
 */
export function computeHouseholdFlexFactor({ p1Alive, careMetaP1, p2Alive, careMetaP2 }) {
    const f1 = p1Alive ? resolveIndividualFlexFactor(careMetaP1) : 0.0;
    const isCoupleProfile = (careMetaP2 !== null);

    if (!isCoupleProfile) {
        return f1;
    }

    const f2 = p2Alive ? resolveIndividualFlexFactor(careMetaP2) : 0.0;
    const householdFactor = (0.5 * Math.max(f1, f2)) + (0.25 * f1) + (0.25 * f2);
    return householdFactor;
}

function resolveIndividualFlexFactor(careMeta) {
    if (!careMeta || !careMeta.active) {
        return 1.0;
    }
    const rawFactor = careMeta.flexFactor;
    if (typeof rawFactor !== 'number' || !Number.isFinite(rawFactor)) {
        return 1.0;
    }
    return Math.min(1, Math.max(0, rawFactor));
}

const CARE_PROBABILITY_BUCKETS = Object.keys(PFLEGE_GRADE_PROBABILITIES).map(Number).sort((a, b) => a - b);

/**
 * Berechnet den Mortalitäts-Multiplikator während eines Pflegefalls.
 */
export function computeCareMortalityMultiplier(careMeta, inputs) {
    if (!careMeta?.active) {
        return 1;
    }

    const baseFactor = Math.max(1, Number(careMeta?.mortalityFactor) || 0);
    if (baseFactor <= 1) {
        return 1;
    }

    const rampYears = Math.max(1, Number(inputs.pflegeRampUp) || 1);
    const yearsCompleted = Math.min(careMeta.currentYearInCare || 0, rampYears);
    if (yearsCompleted <= 0) {
        return 1;
    }

    const progress = yearsCompleted / rampYears;
    return 1 + (baseFactor - 1) * progress;
}

function resolveCareAgeBucket(age) {
    const numericAge = Number(age);
    if (!Number.isFinite(numericAge)) {
        return CARE_PROBABILITY_BUCKETS[0];
    }

    let bucket = CARE_PROBABILITY_BUCKETS[0];
    for (const candidate of CARE_PROBABILITY_BUCKETS) {
        if (numericAge >= candidate) {
            bucket = candidate;
        } else {
            break;
        }
    }
    return bucket;
}

function sampleCareGrade(age, rand) {
    const minBucket = CARE_PROBABILITY_BUCKETS[0];
    if (age < minBucket) {
        return null;
    }

    const bucket = resolveCareAgeBucket(age);
    const probabilities = PFLEGE_GRADE_PROBABILITIES[bucket];
    if (!probabilities) return null;

    const INITIAL_ENTRY_GRADES = [1, 2];

    const totalProbability = INITIAL_ENTRY_GRADES.reduce((sum, grade) => sum + (probabilities[grade] || 0), 0);
    if (totalProbability <= 0) return null;

    const roll = rand();
    if (roll > totalProbability) {
        return null;
    }

    let cumulative = 0;
    for (const grade of INITIAL_ENTRY_GRADES) {
        const gradeProbability = probabilities[grade] || 0;
        cumulative += gradeProbability;
        if (roll <= cumulative) {
            return { grade, bucket, gradeProbability, totalProbability };
        }
    }
    return null;
}

function normalizeGradeConfig(config) {
    const zusatz = Math.max(0, Number(config?.zusatz) || 0);
    const rawFlex = config?.flexCut;
    const flexCut = Math.min(1, Math.max(0, Number.isFinite(rawFlex) ? rawFlex : 1));
    const rawMortality = Number(config?.mortalityFactor);
    const mortalityFactor = Math.max(0, Number.isFinite(rawMortality) ? rawMortality : 0);
    return { zusatz, flexCut, mortalityFactor };
}

function resolveGradeConfig(inputs, grade) {
    const configs = inputs?.pflegeGradeConfigs;
    if (configs && configs[grade]) {
        return normalizeGradeConfig(configs[grade]);
    }
    if (configs) {
        for (const fallbackGrade of SUPPORTED_PFLEGE_GRADES) {
            if (configs[fallbackGrade]) {
                return normalizeGradeConfig(configs[fallbackGrade]);
            }
        }
    }
    return normalizeGradeConfig({
        zusatz: inputs?.pflegeStufe1Zusatz,
        flexCut: inputs?.pflegeStufe1FlexCut,
        mortalityFactor: inputs?.pflegeStufe1Mortality
    });
}

/**
 * Aktualisiert Pflege-Metadaten inklusive grad-spezifischer Kosten.
 */
export function updateCareMeta(care, inputs, age, yearData, rand) {
    if (!inputs.pflegefallLogikAktivieren || !care) return care;

    if (care.active) {
        if (inputs.pflegeModellTyp === 'akut' && care.currentYearInCare >= care.durationYears) {
            care.active = false;
            care.zusatzFloorDelta = 0;
            care.grade = null;
            care.gradeLabel = '';
            return care;
        }

        if (!care.grade) {
            care.grade = SUPPORTED_PFLEGE_GRADES[0];
            care.gradeLabel = PFLEGE_GRADE_LABELS[care.grade] || `Pflegegrad ${care.grade}`;
        }

        const currentGrade = care.grade;
        const progressionProb = PFLEGE_GRADE_PROGRESSION_PROBABILITIES[currentGrade] || 0;

        let gradeChanged = false;
        const canProgressThisYear = (care.currentYearInCare || 0) >= 1;
        if (canProgressThisYear && currentGrade < 5 && rand() < progressionProb) {
            const newGrade = currentGrade + 1;
            care.grade = newGrade;
            care.gradeLabel = PFLEGE_GRADE_LABELS[newGrade] || `Pflegegrad ${newGrade}`;
            const newGradeConfig = resolveGradeConfig(inputs, newGrade);
            care.mortalityFactor = newGradeConfig.mortalityFactor || 0;
            gradeChanged = true;
        }

        const gradeConfig = resolveGradeConfig(inputs, care.grade);
        const yearsSinceStart = care.currentYearInCare;
        const yearIndex = yearsSinceStart + 1;
        care.mortalityFactor = gradeConfig.mortalityFactor || 0;
        const rawDriftPct = Number(inputs.pflegeKostenDrift);
        const driftFactor = Number.isFinite(rawDriftPct) ? Math.max(0, rawDriftPct) / 100 : 0;
        const inflationsAnpassung = (1 + yearData.inflation / 100) * (1 + driftFactor);
        const regionalMultiplier = 1 + Math.max(0, inputs?.pflegeRegionalZuschlag || 0);

        const floorAtTriggerAdjusted = care.floorAtTrigger * Math.pow(1 + yearData.inflation / 100, yearIndex);
        const flexAtTriggerAdjusted = care.flexAtTrigger * Math.pow(1 + yearData.inflation / 100, yearIndex);
        const maxFloorAdjusted = care.maxFloorAtTrigger * Math.pow(inflationsAnpassung, yearIndex);

        const capZusatz = Math.max(0, maxFloorAdjusted - floorAtTriggerAdjusted);

        let zielRoh;
        if (gradeChanged || !care.previousZielRoh) {
            zielRoh = gradeConfig.zusatz * inflationsAnpassung * regionalMultiplier;
        } else {
            zielRoh = care.previousZielRoh * inflationsAnpassung;
        }
        care.previousZielRoh = zielRoh;
        const cappedZiel = Math.min(capZusatz, zielRoh);
        const needsRamp = (zielRoh > capZusatz) && capZusatz > 0;
        let zusatzFloorZielFinal = cappedZiel;
        if (needsRamp) {
            const rampYears = Math.max(1, inputs.pflegeRampUp);
            const rampUpFactor = Math.min(1.0, yearIndex / rampYears);
            const rampedTarget = Math.min(capZusatz, zielRoh * rampUpFactor);
            zusatzFloorZielFinal = rampedTarget;
        }

        const zusatzFloorDelta = Math.max(0, zusatzFloorZielFinal - care.zusatzFloorZiel);
        care.zusatzFloorDelta = zusatzFloorDelta;
        care.zusatzFloorZiel = zusatzFloorZielFinal;
        care.flexFactor = gradeConfig.flexCut;

        const flexVerlust = flexAtTriggerAdjusted * (1 - care.flexFactor);
        care.kumulierteKosten += zusatzFloorDelta + flexVerlust;

        care.log_floor_anchor = floorAtTriggerAdjusted;
        care.log_maxfloor_anchor = maxFloorAdjusted;
        care.log_cap_zusatz = capZusatz;
        care.log_delta_flex = flexVerlust;
        care.log_grade = care.grade;
        care.log_grade_label = care.gradeLabel;

        care.currentYearInCare = yearIndex;

        return care;
    }

    if (!care.triggered) {
        const sampledGrade = sampleCareGrade(age, rand);

        if (sampledGrade) {
            care.triggered = true;
            care.active = true;
            care.startAge = age;
            care.currentYearInCare = 0;
            care.grade = sampledGrade.grade;
            care.gradeLabel = PFLEGE_GRADE_LABELS[sampledGrade.grade] || `Pflegegrad ${sampledGrade.grade}`;
            const gradeConfig = resolveGradeConfig(inputs, care.grade);
            care.mortalityFactor = gradeConfig.mortalityFactor || 0;

            care.floorAtTrigger = inputs.startFloorBedarf;
            care.flexAtTrigger = inputs.startFlexBedarf;
            care.maxFloorAtTrigger = inputs.pflegeMaxFloor;

            if (inputs.pflegeModellTyp === 'akut') {
                const min = inputs.pflegeMinDauer, max = inputs.pflegeMaxDauer;
                care.durationYears = Math.floor(rand() * (max - min + 1)) + min;
            } else {
                const genderForCalc = care.personGender || inputs?.geschlecht || 'm';
                care.durationYears = estimateRemainingLifeYears(genderForCalc, age);
            }

            care.log_grade_bucket = sampledGrade.bucket;
            care.log_grade_probability = sampledGrade.gradeProbability;
            care.log_grade_totalProbability = sampledGrade.totalProbability;

            return updateCareMeta(care, inputs, age, yearData, rand);
        }
    }

    return care;
}
