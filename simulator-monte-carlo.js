"use strict";

import { rng, quantile, sum, mean } from './simulator-utils.js';
import { getStartYearCandidates } from './cape-utils.js';
import { STRESS_PRESETS, BREAK_ON_RUIN, MORTALITY_TABLE, annualData } from './simulator-data.js';
import { getCommonInputs, prepareHistoricalData, buildStressContext, applyStressOverride, computeRentAdjRate } from './simulator-portfolio.js';
import { simulateOneYear, initMcRunState, makeDefaultCareMeta, sampleNextYearData, computeRunStatsFromSeries, updateCareMeta, calcCareCost, computeCareMortalityMultiplier, computeHouseholdFlexFactor } from './simulator-engine.js';
import { portfolioTotal, displayMonteCarloResults } from './simulator-results.js';
import { sumDepot } from './simulator-portfolio.js';
import { cloneStressContext, normalizeWidowOptions, computeMarriageYearsCompleted } from './simulator-sweep-utils.js';

/**
 * Liefert ein Pflicht-DOM-Element und validiert dessen Existenz, damit wir bei fehlerhaften
 * UI-Verkabelungen frühzeitig aussagekräftige Fehlermeldungen liefern können.
 * @param {string} elementId - Die erwartete DOM-ID des Elements.
 * @param {string} description - Menschlich lesbare Beschreibung für Fehlermeldungen.
 * @returns {HTMLElement} Referenz auf das gefundene Element.
 */
function requireElement(elementId, description) {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error(`UI-Element fehlt: ${description} (id=${elementId})`);
    }
    return element;
}

/**
 * Liest einen Integer-Wert aus einem Input-Feld und erzwingt sinnvolle Parameterbereiche,
 * damit Simulationen nicht mit stillschweigenden NaN-Werten starten.
 * @param {string} elementId - DOM-ID des Inputs.
 * @param {string} description - Menschlich lesbare Beschreibung für Fehlermeldungen.
 * @param {{min?: number, max?: number, defaultValue?: number}} [options] - Validierungsgrenzen.
 * @returns {number} Der validierte Integer-Wert.
 */
function readIntegerInput(elementId, description, { min = -Infinity, max = Infinity, defaultValue } = {}) {
    const element = requireElement(elementId, description);
    const rawValue = (element.value ?? '').trim();
    const parsed = parseInt(rawValue, 10);

    if (Number.isNaN(parsed)) {
        if (typeof defaultValue === 'number') {
            return defaultValue;
        }
        throw new Error(`Ungültiger Wert für ${description}: Bitte eine Zahl eingeben.`);
    }
    if (!Number.isFinite(parsed)) {
        throw new Error(`Ungültiger Wert für ${description}: Zahl ist nicht endlich.`);
    }
    if (parsed < min || parsed > max) {
        const minInfo = Number.isFinite(min) ? ` (min: ${min})` : '';
        const maxInfo = Number.isFinite(max) ? ` (max: ${max})` : '';
        throw new Error(`Ungültiger Wert für ${description}: ${parsed}${minInfo}${maxInfo}`);
    }
    return parsed;
}

/**
 * Liest alle Monte-Carlo-Steuerparameter aus dem UI und validiert sie defensiv.
 * Design-Entscheidung: Frühes Validieren verhindert späte Ausfälle tief in der Simulation
 * und liefert dem Nutzer klare Fehlermeldungen.
 * @returns {{ anzahl: number, maxDauer: number, blockSize: number, seed: number, methode: string }}
 */
function readMonteCarloParameters() {
    const methodeSelect = requireElement('mcMethode', 'Monte-Carlo Methode');
    const allowedMethods = Array.from(methodeSelect.options || []).map(option => option.value);
    const methode = methodeSelect.value || allowedMethods[0] || '';
    if (allowedMethods.length > 0 && !allowedMethods.includes(methode)) {
        throw new Error(`Ungültige Monte-Carlo-Methode: ${methode}`);
    }

    const anzahl = readIntegerInput('mcAnzahl', 'Anzahl der Simulationen', { min: 1 });
    const maxDauer = readIntegerInput('mcDauer', 'Simulationsdauer in Jahren', { min: 1 });
    const blockSize = readIntegerInput('mcBlockSize', 'Blockgröße', { min: 1 });
    const seed = readIntegerInput('mcSeed', 'Zufalls-Seed', { defaultValue: 0 });

    return { anzahl, maxDauer, blockSize, seed, methode };
}

/**
 * Führt die Monte-Carlo-Simulation inklusive KPI-Berechnung und Szenario-Logging aus.
 * Validiert die UI-Parameter, zeigt Fortschrittsupdates und leitet die aggregierten
 * Ergebnisse an die Anzeige-Komponenten weiter.
 * @returns {Promise<void>} Promise, das nach Abschluss der Simulation aufgelöst wird.
 */
export async function runMonteCarlo() {
    const mcButton = requireElement('mcButton', 'Monte-Carlo Start-Button');
    const progressBarContainer = requireElement('mc-progress-bar-container', 'Monte-Carlo Fortschrittsanzeige');
    const progressBar = requireElement('mc-progress-bar', 'Monte-Carlo Fortschrittsbalken');
    mcButton.disabled = true;
    try {
        prepareHistoricalData();
        const inputs = getCommonInputs();
        const widowOptions = normalizeWidowOptions(inputs.widowOptions);
        const { anzahl, maxDauer, blockSize, seed, methode } = readMonteCarloParameters();

        progressBarContainer.style.display = 'block';
        progressBar.style.width = '0%';

        const rand = rng(seed);

        const stressCtxMaster = buildStressContext(inputs.stressPreset, rand);

        const finalOutcomes = new Float64Array(anzahl);
        const taxOutcomes = new Float64Array(anzahl);
        const kpiLebensdauer = new Uint8Array(anzahl);
        const kpiKuerzungsjahre = new Float32Array(anzahl);
        const kpiMaxKuerzung = new Float32Array(anzahl);
        const volatilities = new Float32Array(anzahl);
        const maxDrawdowns = new Float32Array(anzahl);
        const depotErschoepft = new Uint8Array(anzahl);
        const alterBeiErschoepfung = new Uint8Array(anzahl).fill(255);
        const anteilJahreOhneFlex = new Float32Array(anzahl);

        // Realistischer Schwellenwert für Depot-Erschöpfung: 100 € (vorher 0,000001 €)
        const DEPOT_DEPLETION_THRESHOLD = 100;

        const stress_maxDrawdowns = new Float32Array(anzahl);
        const stress_timeQuoteAbove45 = new Float32Array(anzahl);
        const stress_cutYears = new Float32Array(anzahl);
        const stress_CaR_P10_Real = new Float64Array(anzahl);
        const stress_recoveryYears = new Float32Array(anzahl);

        let worstRun = { finalVermoegen: Infinity, logDataRows: [], failed: false };
        let worstRunCare = { finalVermoegen: Infinity, logDataRows: [], failed: false, hasCare: false };

        // Szenario-Logging: Speichere alle Runs mit Metadaten für spätere Auswahl
        const allScenarioMeta = [];
        // Für zufällige Szenarien: Sample-Indizes berechnen (15 gleichmäßig verteilt)
        const randomSampleIndices = new Set();
        const sampleStep = Math.max(1, Math.floor(anzahl / 15));
        for (let s = 0; s < 15 && s * sampleStep < anzahl; s++) {
            randomSampleIndices.add(s * sampleStep + Math.floor(sampleStep / 2));
        }

        let failCount = 0;
        let pflegeTriggeredCount = 0;
        const entryAges = [], careDepotCosts = [];
        let shortfallWithCareCount = 0, shortfallNoCareProxyCount = 0;
        const endWealthWithCare = new Float64Array(anzahl);
        const endWealthNoCareProxyArr = new Float64Array(anzahl);

        // Dual Care KPIs
        const p1CareYearsArr = new Uint16Array(anzahl);
        const p2CareYearsArr = new Uint16Array(anzahl);
        const bothCareYearsArr = new Uint16Array(anzahl);
        const entryAgesP2 = [];
        let p2TriggeredCount = 0;
        const maxAnnualCareSpendTriggered = [];
        const bothCareYearsOverlapTriggered = [];

        // Arrays for care years (only for triggered cases)
        const p1CareYearsTriggered = [];
        const p2CareYearsTriggered = [];
        const bothCareYearsTriggered = [];

        const BINS = [0, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 10, Infinity];
        const heatmap = Array(10).fill(0).map(() => new Uint32Array(BINS.length - 1));
        let totalSimulatedYears = 0, totalYearsQuoteAbove45 = 0;
        const allRealWithdrawalsSample = [];

        // Optimiert: Dynamisches Progress-Update-Intervall für bessere Performance
        // Mindestens alle 100 Runs ODER 1% der Gesamtzahl (je nachdem was größer ist)
        const progressUpdateInterval = Math.max(100, Math.floor(anzahl / 100));

        for (let i = 0; i < anzahl; i++) {
            if (i % progressUpdateInterval === 0) {
                progressBar.style.width = `${(i / anzahl) * 90}%`;
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            let failed = false, totalTaxesThisRun = 0, kpiJahreMitKuerzungDieserLauf = 0, kpiMaxKuerzungDieserLauf = 0;
            let lebensdauer = 0, jahreOhneFlex = 0, triggeredAge = null;
            let careEverActive = false;

            // --- CAPE-SAMPLING LOGIC START ---
            let startYearIndex;
            const useCapeSampling = document.getElementById('useCapeSampling')?.checked;

            if (useCapeSampling && inputs.marketCapeRatio > 0) {
                const candidates = getStartYearCandidates(inputs.marketCapeRatio, annualData);
                if (candidates.length > 0) {
                    const chosenYear = candidates[Math.floor(rand() * candidates.length)];
                    startYearIndex = annualData.findIndex(d => d.jahr === chosenYear);
                    if (startYearIndex === -1) startYearIndex = Math.floor(rand() * annualData.length);
                } else {
                    startYearIndex = Math.floor(rand() * annualData.length);
                }
            } else {
                startYearIndex = Math.floor(rand() * annualData.length);
            }
            // --- CAPE-SAMPLING LOGIC END ---

            let simState = initMcRunState(inputs, startYearIndex);

            const depotWertHistorie = [portfolioTotal(simState.portfolio)];
            const currentRunLog = [];
            let depotNurHistorie = [sumDepot(simState.portfolio)];
            let depotErschoepfungAlterGesetzt = false;
            let widowBenefitActiveForP1 = false; // P1 erhält Witwenrente nach P2
            let widowBenefitActiveForP2 = false; // P2 erhält Witwenrente nach P1

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

                // Track care years
                const p1ActiveThisYear = p1Alive && careMetaP1?.active;
                const p2ActiveThisYear = p2Alive && careMetaP2?.active;
                if (p2ActiveThisYear) careEverActive = true;
                if (p1ActiveThisYear) p1CareYears++;
                if (p2ActiveThisYear) p2CareYears++;
                if (p1ActiveThisYear && p2ActiveThisYear) bothCareYears++;

                // Separate mortality for P1 and P2
                if (p1Alive) {
                    let qx1 = MORTALITY_TABLE[inputs.geschlecht][ageP1] || 1;
                    const careFactorP1 = computeCareMortalityMultiplier(careMetaP1, inputs);
                    if (careFactorP1 > 1) {
                        qx1 = Math.min(1.0, qx1 * careFactorP1);
                    }
                    if (rand() < qx1) {
                        p1Alive = false;
                    }
                }

                if (p2Alive && careMetaP2) {
                    // Use partner's gender if specified, otherwise assume opposite gender as fallback
                    const p2Gender = inputs.partner?.geschlecht || (inputs.geschlecht === 'm' ? 'w' : 'm');
                    let qx2 = MORTALITY_TABLE[p2Gender][ageP2] || 1;
                    const careFactorP2 = computeCareMortalityMultiplier(careMetaP2, inputs);
                    if (careFactorP2 > 1) {
                        qx2 = Math.min(1.0, qx2 * careFactorP2);
                    }
                    if (rand() < qx2) {
                        p2Alive = false;
                    }
                }

                const p1DiedThisYear = p1AliveAtStart && !p1Alive;
                const p2DiedThisYear = p2AliveAtStart && !p2Alive;

                if (!p1Alive) {
                    widowBenefitActiveForP1 = false;
                }
                if (!p2Alive) {
                    widowBenefitActiveForP2 = false;
                }

                if (p1DiedThisYear) {
                    if (widowEligibleThisYear && p2Alive) {
                        widowBenefitActiveForP2 = true;
                        simState.widowPensionP2 = Math.max(0, (simState.currentAnnualPension || 0) * widowOptions.percent);
                    } else {
                        widowBenefitActiveForP2 = false;
                        simState.widowPensionP2 = 0;
                    }
                }

                if (p2DiedThisYear) {
                    if (widowEligibleThisYear && p1Alive) {
                        widowBenefitActiveForP1 = true;
                        simState.widowPensionP1 = Math.max(0, (simState.currentAnnualPension2 || 0) * widowOptions.percent);
                    } else {
                        widowBenefitActiveForP1 = false;
                        simState.widowPensionP1 = 0;
                    }
                }

                // Simulation ends when both persons have died
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

                const stateWithCareFlex = {
                    ...simState,
                    baseFlex: simState.baseFlex * effectiveFlexFactor
                };

                // Berechne dynamische Rentenanpassung basierend auf Modus (fix/wage/cpi)
                const effectiveRentAdjPct = computeRentAdjRate(inputs, yearData);
                const adjustedInputs = { ...inputs, rentAdjPct: effectiveRentAdjPct };
                const householdContext = {
                    p1Alive,
                    p2Alive: hasPartner ? p2Alive : false,
                    widowBenefits: {
                        p1FromP2: widowBenefitActiveForP1,
                        p2FromP1: widowBenefitActiveForP2
                    }
                };

                // Pass care floor as separate parameter (NOT added to baseFloor to avoid inflation compounding)
                const result = simulateOneYear(stateWithCareFlex, adjustedInputs, yearData, simulationsJahr, careMetaP1, totalCareFloor, householdContext);

                if (result.isRuin) {
                    failed = true;
                    // Bei Ruin ist das Depot definitiv erschöpft - setze Alter
                    if (!depotErschoepfungAlterGesetzt) {
                        alterBeiErschoepfung[i] = ageP1;
                        depotErschoepfungAlterGesetzt = true;
                    }
                    currentRunLog.push({
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
                    if (i % 100 === 0) allRealWithdrawalsSample.push(result.logData.jahresentnahme_real);

                    if (simulationsJahr < 10) {
                        const quote = result.logData.entnahmequote * 100;
                        for (let b = 0; b < BINS.length - 1; b++) {
                            if (quote >= BINS[b] && quote < BINS[b + 1]) { heatmap[simulationsJahr][b]++; break; }
                        }
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

                    currentRunLog.push({
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
                currentRunLog.push({
                    jahr: deathLogContext?.jahr ?? (currentRunLog.length + 1),
                    histJahr: deathLogContext?.histJahr ?? null,
                    inflation: deathLogContext?.inflation ?? null,
                    aktionUndGrund: '>>> ENDE: Alle Personen verstorben <<<',
                    wertAktien: sumDepot({ depotTranchesAktien: portfolioSnapshot.depotTranchesAktien }),
                    wertGold: sumDepot({ depotTranchesGold: portfolioSnapshot.depotTranchesGold }),
                    liquiditaet: portfolioSnapshot.liquiditaet ?? 0,
                    Person1Alive: 0,
                    Person2Alive: hasPartner ? 0 : null,
                    terminationReason: 'all_participants_deceased'
                });
            }

            if (stressYears > 0) {
                const { maxDDpct: stressMaxDD } = computeRunStatsFromSeries(stressPortfolioValues);
                stress_maxDrawdowns[i] = stressMaxDD;
                stress_timeQuoteAbove45[i] = (stressYearsAbove45 / stressYears) * 100;
                stress_cutYears[i] = stressCutYears;
                stress_CaR_P10_Real[i] = stressRealWithdrawals.length > 0 ? quantile(stressRealWithdrawals, 0.10) : 0;

                if (postStressRecoveryYears === null) {
                    postStressRecoveryYears = Math.max(0, lebensdauer - stressYears);
                }
                stress_recoveryYears[i] = postStressRecoveryYears;
            }

            const endVermoegen = failed ? 0 : portfolioTotal(simState.portfolio);

            if ((failed ? -Infinity : endVermoegen) < (worstRun.failed ? -Infinity : worstRun.finalVermoegen)) {
                worstRun = { finalVermoegen: endVermoegen, logDataRows: currentRunLog, failed: failed };
            }
            if (careEverActive && ((failed ? -Infinity : endVermoegen) < (worstRunCare.failed ? -Infinity : worstRunCare.finalVermoegen))) {
                worstRunCare = { finalVermoegen: endVermoegen, logDataRows: currentRunLog, failed: failed, hasCare: true };
            }

            if (failed) failCount++;
            const { volPct, maxDDpct } = computeRunStatsFromSeries(depotWertHistorie);

            finalOutcomes[i] = endVermoegen;
            taxOutcomes[i] = totalTaxesThisRun;
            kpiLebensdauer[i] = lebensdauer;
            kpiKuerzungsjahre[i] = lebensdauer > 0 ? (kpiJahreMitKuerzungDieserLauf / lebensdauer) * 100 : 0;
            kpiMaxKuerzung[i] = kpiMaxKuerzungDieserLauf;
            anteilJahreOhneFlex[i] = lebensdauer > 0 ? (jahreOhneFlex / lebensdauer) * 100 : 0;
            volatilities[i] = volPct;
            maxDrawdowns[i] = maxDDpct;
            // Depot gilt als erschöpft, wenn es jemals unter den Schwellenwert fiel ODER der Run fehlgeschlagen ist
            depotErschoepft[i] = (failed || depotNurHistorie.some(v => v <= DEPOT_DEPLETION_THRESHOLD)) ? 1 : 0;

            const cumulCareDepotCosts = (careMetaP1?.kumulierteKosten || 0) + (careMetaP2?.kumulierteKosten || 0);
            endWealthWithCare[i] = endVermoegen;
            endWealthNoCareProxyArr[i] = endVermoegen + cumulCareDepotCosts;
            const runHadCareP1 = (triggeredAge !== null);
            const runHadCareP2 = (triggeredAgeP2 !== null);
            const runHadAnyCare = runHadCareP1 || runHadCareP2;

            if (runHadCareP1) {
                pflegeTriggeredCount++; entryAges.push(triggeredAge); careDepotCosts.push(careMetaP1?.kumulierteKosten || 0);
                if (failed) shortfallWithCareCount++;
                // Store care years only for triggered cases
                p1CareYearsTriggered.push(p1CareYears);
            }
            if (runHadCareP2) {
                p2TriggeredCount++; entryAgesP2.push(triggeredAgeP2);
                // Store care years only for triggered cases
                p2CareYearsTriggered.push(p2CareYears);
            }
            if (bothCareYears > 0) {
                bothCareYearsOverlapTriggered.push(bothCareYears);
            }
            // Store bothCareYears only if at least one person had care
            if (runHadAnyCare) {
                bothCareYearsTriggered.push(bothCareYears);
            }
            if (endWealthNoCareProxyArr[i] <= 0) shortfallNoCareProxyCount++;

            // Store dual care metrics (for all runs, needed for internal tracking)
            p1CareYearsArr[i] = p1CareYears;
            p2CareYearsArr[i] = p2CareYears;
            bothCareYearsArr[i] = bothCareYears;

            // Track max annual care spend (sum of both P1 and P2)
            let maxAnnualSpend = 0;
            for (const logRow of currentRunLog) {
                const annualSpend = (logRow.CareP1_Cost || 0) + (logRow.CareP2_Cost || 0);
                maxAnnualSpend = Math.max(maxAnnualSpend, annualSpend);
            }
            if (runHadAnyCare) {
                maxAnnualCareSpendTriggered.push(maxAnnualSpend);
            }

            // Szenario-Metadaten speichern für spätere Auswahl
            const totalCareYears = p1CareYears + p2CareYears;
            const totalCareCosts = (careMetaP1?.kumulierteKosten || 0) + (careMetaP2?.kumulierteKosten || 0);
            allScenarioMeta.push({
                index: i,
                endVermoegen: endVermoegen,
                failed: failed,
                lebensdauer: lebensdauer,
                careEverActive: careEverActive,
                triggeredAge: triggeredAge,
                totalCareYears: totalCareYears,
                totalCareCosts: totalCareCosts,
                maxKuerzung: kpiMaxKuerzungDieserLauf,
                jahreOhneFlex: jahreOhneFlex,
                // Alle Logs temporär speichern für spätere Auswahl der charakteristischen Szenarien
                logDataRows: [...currentRunLog],
                isRandomSample: randomSampleIndices.has(i)
            });
        }

        progressBar.style.width = '95%';
        await new Promise(resolve => setTimeout(resolve, 0));

        const successfulOutcomes = [];
        for (let i = 0; i < anzahl; ++i) { if (finalOutcomes[i] > 0) successfulOutcomes.push(finalOutcomes[i]); }

        const pflegeResults = {
            entryRatePct: (pflegeTriggeredCount / anzahl) * 100,
            entryAgeMedian: entryAges.length ? quantile(entryAges, 0.5) : 0,
            shortfallRate_condCare: pflegeTriggeredCount > 0 ? (shortfallWithCareCount / pflegeTriggeredCount) * 100 : 0,
            shortfallRate_noCareProxy: (shortfallNoCareProxyCount / anzahl) * 100,
            endwealthWithCare_median: quantile(endWealthWithCare, 0.5),
            endwealthNoCare_median: quantile(endWealthNoCareProxyArr, 0.5),
            depotCosts_median: careDepotCosts.length ? quantile(careDepotCosts, 0.5) : 0,
            // Dual Care KPIs (only for triggered cases)
            p1CareYears: p1CareYearsTriggered.length ? quantile(p1CareYearsTriggered, 0.5) : 0,
            p2CareYears: p2CareYearsTriggered.length ? quantile(p2CareYearsTriggered, 0.5) : 0,
            bothCareYears: bothCareYearsOverlapTriggered.length ? quantile(bothCareYearsOverlapTriggered, 0.5) : 0,
            p2EntryRatePct: (p2TriggeredCount / anzahl) * 100,
            p2EntryAgeMedian: entryAgesP2.length ? quantile(entryAgesP2, 0.5) : 0,
            maxAnnualCareSpend: maxAnnualCareSpendTriggered.length ? quantile(maxAnnualCareSpendTriggered, 0.5) : 0,
            shortfallDelta_vs_noCare: quantile(endWealthNoCareProxyArr, 0.5) - quantile(endWealthWithCare, 0.5)
        };

        const stressPresetKey = inputs.stressPreset || 'NONE';
        const aggregatedResults = {
            finalOutcomes: {
                p10: quantile(finalOutcomes, 0.1), p50: quantile(finalOutcomes, 0.5),
                p90: quantile(finalOutcomes, 0.9), p50_successful: quantile(successfulOutcomes, 0.5)
            },
            taxOutcomes: { p50: quantile(taxOutcomes, 0.5) },
            kpiLebensdauer: { mean: mean(kpiLebensdauer) },
            kpiKuerzungsjahre: { p50: quantile(kpiKuerzungsjahre, 0.5) },
            kpiMaxKuerzung: { p50: quantile(kpiMaxKuerzung, 0.5) },
            depotErschoepfungsQuote: (sum(depotErschoepft) / anzahl) * 100,
            alterBeiErschoepfung: { p50: quantile(Array.from(alterBeiErschoepfung).filter(a => a < 255), 0.5) || 0 },
            anteilJahreOhneFlex: { p50: quantile(anteilJahreOhneFlex, 0.5) },
            volatilities: { p50: quantile(volatilities, 0.5) },
            maxDrawdowns: { p50: quantile(maxDrawdowns, 0.5), p90: quantile(maxDrawdowns, 0.9) },
            heatmap: heatmap.map(yearData => Array.from(yearData)),
            bins: BINS,
            extraKPI: {
                timeShareQuoteAbove45: totalSimulatedYears > 0 ? totalYearsQuoteAbove45 / totalSimulatedYears : 0,
                consumptionAtRiskP10Real: quantile(allRealWithdrawalsSample, 0.1),
                pflege: pflegeResults
            },
            stressKPI: {
                presetKey: stressPresetKey,
                years: STRESS_PRESETS[stressPresetKey]?.years || 0,
                maxDD: {
                    p50: quantile(stress_maxDrawdowns, 0.50),
                    p90: quantile(stress_maxDrawdowns, 0.90)
                },
                timeShareAbove45: {
                    p50: quantile(stress_timeQuoteAbove45, 0.50)
                },
                cutYears: {
                    p50: quantile(stress_cutYears, 0.50)
                },
                consumptionAtRiskP10Real: {
                    p50: quantile(stress_CaR_P10_Real, 0.50)
                },
                recoveryYears: {
                    p50: quantile(stress_recoveryYears, 0.50)
                }
            }
        };

        // ===== Charakteristische Szenarien identifizieren =====
        // Sortiere nach Endvermögen für Perzentil-Berechnung
        const sortedByWealth = [...allScenarioMeta].sort((a, b) => a.endVermoegen - b.endVermoegen);

        // Hilfsfunktion für Perzentil-Index
        const percentileIndex = (arr, p) => Math.min(Math.floor(arr.length * p), arr.length - 1);

        // 1. Vermögensbasierte Perzentile (9 Szenarien)
        const wealthPercentiles = [
            { key: 'worst', label: 'Worst Case', scenario: sortedByWealth[0] },
            { key: 'p5', label: 'P5', scenario: sortedByWealth[percentileIndex(sortedByWealth, 0.05)] },
            { key: 'p10', label: 'P10', scenario: sortedByWealth[percentileIndex(sortedByWealth, 0.10)] },
            { key: 'p25', label: 'P25', scenario: sortedByWealth[percentileIndex(sortedByWealth, 0.25)] },
            { key: 'p50', label: 'Median', scenario: sortedByWealth[percentileIndex(sortedByWealth, 0.50)] },
            { key: 'p75', label: 'P75', scenario: sortedByWealth[percentileIndex(sortedByWealth, 0.75)] },
            { key: 'p90', label: 'P90', scenario: sortedByWealth[percentileIndex(sortedByWealth, 0.90)] },
            { key: 'p95', label: 'P95', scenario: sortedByWealth[percentileIndex(sortedByWealth, 0.95)] },
            { key: 'best', label: 'Best Case', scenario: sortedByWealth[sortedByWealth.length - 1] }
        ];

        // 2. Pflege-spezifische Szenarien (4 Szenarien)
        const careScenarios = allScenarioMeta.filter(s => s.careEverActive);
        const careSpecific = [];

        if (careScenarios.length > 0) {
            // Worst mit Pflege
            const worstWithCare = careScenarios.reduce((a, b) => a.endVermoegen < b.endVermoegen ? a : b);
            careSpecific.push({ key: 'worstCare', label: 'Worst MIT Pflege', scenario: worstWithCare });

            // Längste Pflegedauer
            const longestCare = careScenarios.reduce((a, b) => a.totalCareYears > b.totalCareYears ? a : b);
            careSpecific.push({ key: 'longestCare', label: 'Längste Pflegedauer', scenario: longestCare });

            // Höchste Pflegekosten
            const highestCareCost = careScenarios.reduce((a, b) => a.totalCareCosts > b.totalCareCosts ? a : b);
            careSpecific.push({ key: 'highestCareCost', label: 'Höchste Pflegekosten', scenario: highestCareCost });

            // Frühester Pflegeeintritt
            const earliestCare = careScenarios.filter(s => s.triggeredAge !== null)
                .reduce((a, b) => (a.triggeredAge < b.triggeredAge ? a : b), careScenarios[0]);
            careSpecific.push({ key: 'earliestCare', label: 'Frühester Pflegeeintritt', scenario: earliestCare });
        }

        // 3. Risiko-Szenarien (2 Szenarien)
        const longestLife = allScenarioMeta.reduce((a, b) => a.lebensdauer > b.lebensdauer ? a : b);
        const maxCut = allScenarioMeta.reduce((a, b) => a.maxKuerzung > b.maxKuerzung ? a : b);
        const riskScenarios = [
            { key: 'longestLife', label: 'Längste Lebensdauer', scenario: longestLife },
            { key: 'maxCut', label: 'Maximale Kürzung', scenario: maxCut }
        ];

        // 4. Zufällige Szenarien (15 Szenarien)
        const randomScenarios = allScenarioMeta
            .filter(s => s.isRandomSample)
            .map((s, idx) => ({
                key: `random_${s.index}`,
                label: `Zufällig #${s.index + 1}`,
                scenario: s
            }));

        // Alle charakteristischen Szenarien zusammenstellen
        const characteristicScenarios = [...wealthPercentiles, ...careSpecific, ...riskScenarios];

        // Szenarien-Objekt für UI erstellen
        const scenarioLogs = {
            characteristic: characteristicScenarios.map(s => ({
                key: s.key,
                label: s.label,
                endVermoegen: s.scenario.endVermoegen,
                failed: s.scenario.failed,
                lebensdauer: s.scenario.lebensdauer,
                careEverActive: s.scenario.careEverActive,
                totalCareYears: s.scenario.totalCareYears,
                logDataRows: s.scenario.logDataRows
            })),
            random: randomScenarios.map(s => ({
                key: s.key,
                label: s.label,
                endVermoegen: s.scenario.endVermoegen,
                failed: s.scenario.failed,
                lebensdauer: s.scenario.lebensdauer,
                careEverActive: s.scenario.careEverActive,
                totalCareYears: s.scenario.totalCareYears,
                logDataRows: s.scenario.logDataRows
            }))
        };

        // Speicher freigeben - nur die ausgewählten Logs behalten
        allScenarioMeta.length = 0;

        displayMonteCarloResults(aggregatedResults, anzahl, failCount, worstRun, {}, {}, pflegeTriggeredCount, inputs, worstRunCare, scenarioLogs);

    } catch (e) {
        alert("Fehler in der Monte-Carlo-Simulation:\n\n" + e.message + "\n" + e.stack); console.error(e);
    } finally {
        progressBar.style.width = '100%'; setTimeout(() => { progressBarContainer.style.display = 'none'; }, 250); mcButton.disabled = false;
    }
}
