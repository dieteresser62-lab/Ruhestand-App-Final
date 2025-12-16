"use strict";

/**
 * ==========================================================================
 * Sweep-spezifische Logik (UI-Defaults, Range-Parsing, Simulation)
 * --------------------------------------------------------------------------
 * Diese Datei kapselt alle Sweep-bezogenen Funktionen aus simulator-main.js,
 * um die Hauptdatei zu entschlacken und die Sweep-Interaktionen klar zu
 * trennen. Die Funktionen bleiben unverändert in ihrem Verhalten
 * (Benutzer-Alerts, Fortschrittsbalken, Whitelist/Blocklist), erhalten aber
 * zusätzliche Kommentare zur Fehlerbehandlung.
 * ==========================================================================
 */

import { rng, parseRangeInput, cartesianProductLimited } from './simulator-utils.js';
import { prepareHistoricalData, getCommonInputs, buildStressContext, computeRentAdjRate, applyStressOverride } from './simulator-portfolio.js';
import { MORTALITY_TABLE, annualData, BREAK_ON_RUIN } from './simulator-data.js';
import { findBestParameters, shouldMaximizeMetric, displayBestParameters, displayMultiObjectiveOptimization, displayConstraintBasedOptimization } from './simulator-optimizer.js';
import { displaySensitivityAnalysis, displayParetoFrontier } from './simulator-visualization.js';
import {
    simulateOneYear,
    initMcRunState,
    makeDefaultCareMeta,
    sampleNextYearData,
    computeRunStatsFromSeries,
    updateCareMeta,
    calcCareCost,
    computeCareMortalityMultiplier
} from './simulator-engine.js';
import { aggregateSweepMetrics, portfolioTotal } from './simulator-results.js';
import {
    deepClone,
    SWEEP_ALLOWED_KEYS,
    cloneStressContext,
    isBlockedKey,
    extractP2Invariants,
    areP2InvariantsEqual
} from './simulator-sweep-utils.js';
import { renderSweepHeatmapSVG } from './simulator-heatmap.js';
import { Ruhestandsmodell_v30 } from './engine/index.mjs';

/**
 * Initialisiert Sweep-Inputfelder und synchronisiert sie mit localStorage.
 *
 * Jeder Eintrag im Mapping wird beim Laden mit einem evtl. gespeicherten Wert
 * vorbelegt. Änderungen werden defensiv sowohl auf "change" als auch
 * "input"-Events gespeichert, um keine Benutzerinteraktion zu verlieren.
 */
export function initSweepDefaultsWithLocalStorageFallback() {
    const map = [
        ['sweepRunwayMin', 'sim.sweep.runwayMin'],
        ['sweepRunwayTarget', 'sim.sweep.runwayTarget'],
        ['sweepTargetEq', 'sim.sweep.targetEq'],
        ['sweepRebalBand', 'sim.sweep.rebalBand'],
        ['sweepMaxSkimPct', 'sim.sweep.maxSkimPct'],
        ['sweepMaxBearRefillPct', 'sim.sweep.maxBearRefillPct'],
        ['sweepGoldTargetPct', 'sim.sweep.goldTarget']
    ];

    for (const [elementId, storageKey] of map) {
        const element = document.getElementById(elementId);
        if (!element) {
            // UI fehlt (z.B. in Tests) – bewusst überspringen.
            continue;
        }

        const persistedValue = localStorage.getItem(storageKey);
        if (persistedValue !== null && persistedValue !== undefined && persistedValue !== '') {
            element.value = persistedValue;
        }

        // Speichere Änderungen unabhängig davon, ob das Event über Enter oder Tippen ausgelöst wurde.
        element.addEventListener('change', () => localStorage.setItem(storageKey, element.value));
        element.addEventListener('input', () => localStorage.setItem(storageKey, element.value));
    }
}

/**
 * Rendert die Heatmap der Sweep-Ergebnisse basierend auf aktuell ausgewählten
 * Achsen und Metriken. Bewahrt Benutzerwarnungen und setzt im Fehlerfall eine
 * klar sichtbare Fehlermeldung im UI.
 */
export function displaySweepResults() {
    try {
        const metricKey = document.getElementById('sweepMetric').value;
        const xParam = document.getElementById('sweepAxisX').value;
        const yParam = document.getElementById('sweepAxisY').value;

        const xValues = window.sweepParamRanges[xParam] || [];
        const yValues = window.sweepParamRanges[yParam] || [];

        const heatmapHtml = renderSweepHeatmapSVG(
            window.sweepResults,
            metricKey,
            xParam,
            yParam,
            xValues,
            yValues
        );

        document.getElementById('sweepHeatmap').innerHTML = heatmapHtml;
    } catch (error) {
        // Nutzerfreundliche Meldung beibehalten, ergänzt um Konsolenlog.
        alert("Fehler beim Rendern der Sweep-Heatmap:\n\n" + error.message);
        console.error('displaySweepResults Fehler:', error);
        document.getElementById('sweepHeatmap').innerHTML = '<p style="color: red;">Fehler beim Rendern der Heatmap. Siehe Konsole für Details.</p>';
    }
}

/**
 * Führt den Parameter-Sweep über alle gewählten Parameterkombinationen aus.
 *
 * Beachtet weiterhin:
 * - Alerts für ungültige Eingaben
 * - Fortschrittsbalken-Updates
 * - Whitelist/Blocklist-Prüfungen für Sweep-Overrides
 *
 * Zusätzliche Kommentare erklären die Fehlerpfade, damit künftige Änderungen
 * die UI-Fehlerbehandlung nicht versehentlich entfernen.
 */
export async function runParameterSweep() {
    const sweepButton = document.getElementById('sweepButton');
    sweepButton.disabled = true;
    const progressBarContainer = document.getElementById('sweep-progress-bar-container');
    const progressBar = document.getElementById('sweep-progress-bar');

    try {
        prepareHistoricalData();

        // ========= Parameter-Parsing (mit frühzeitigen, konkreten Alerts) =========
        const rangeInputs = {
            runwayMin: document.getElementById('sweepRunwayMin').value,
            runwayTarget: document.getElementById('sweepRunwayTarget').value,
            targetEq: document.getElementById('sweepTargetEq').value,
            rebalBand: document.getElementById('sweepRebalBand').value,
            maxSkimPct: document.getElementById('sweepMaxSkimPct').value,
            maxBearRefillPct: document.getElementById('sweepMaxBearRefillPct').value,
            goldTargetPct: document.getElementById('sweepGoldTargetPct').value
        };

        const paramLabels = {
            runwayMin: 'Runway Min',
            runwayTarget: 'Runway Target',
            targetEq: 'Target Eq',
            rebalBand: 'Rebal Band',
            maxSkimPct: 'Max Skim %',
            maxBearRefillPct: 'Max Bear Refill %',
            goldTargetPct: 'Gold Target %'
        };

        const paramRanges = {};
        try {
            for (const [key, rangeStr] of Object.entries(rangeInputs)) {
                const values = parseRangeInput(rangeStr);
                if (values.length === 0) {
                    // Frühzeitiger Abbruch mit explizitem Hinweis pro Feld.
                    alert(`Leeres Range-Input für ${paramLabels[key] || key}.\n\nBitte geben Sie einen Wert ein:\n- Einzelwert: 24\n- Liste: 24,36,48\n- Range: 24:12:48`);
                    return;
                }
                paramRanges[key] = values;
            }
        } catch (error) {
            // Fehlformate klar melden, bestehender Alert-Text beibehalten.
            alert(`Fehler beim Parsen der Range-Eingaben:\n\n${error.message}\n\nErlaubte Formate:\n- Einzelwert: 24\n- Kommaliste: 50,60,70\n- Range: start:step:end (z.B. 18:6:36)`);
            return;
        }

        // ========= Kombinatorik prüfen (Limit-Alert beibehalten) =========
        const arrays = Object.values(paramRanges);
        const { combos, tooMany, size } = cartesianProductLimited(arrays, 300);

        if (tooMany) {
            alert(`Zu viele Kombinationen: ${size} (theoretisch)\n\nMaximum: 300\n\nBitte reduzieren Sie die Anzahl der Parameter-Werte.`);
            return;
        }

        if (combos.length === 0) {
            alert('Keine Parameter-Kombinationen gefunden.');
            return;
        }

        // Map zurück in Objektstruktur
        const paramKeys = Object.keys(paramRanges);
        const paramCombinations = combos.map(combo => {
            const obj = {};
            paramKeys.forEach((key, index) => {
                obj[key] = combo[index];
            });
            return obj;
        });

        progressBarContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';

        // Basis-Inputs nur EINMAL lesen und einfrieren (Deep Clone)
        const baseInputs = deepClone(getCommonInputs());
        const anzahlRuns = parseInt(document.getElementById('mcAnzahl').value) || 100;
        const maxDauer = parseInt(document.getElementById('mcDauer').value) || 35;
        const blockSize = parseInt(document.getElementById('mcBlockSize').value) || 5;
        const baseSeed = parseInt(document.getElementById('mcSeed').value) || 12345;
        const methode = document.getElementById('mcMethode').value;

        const sweepResults = [];

        // P2-Invarianz-Guard: Referenz-Invarianten für Person 2 (wird beim ersten Case gesetzt)
        let REF_P2_INVARIANTS = null;

        for (let comboIdx = 0; comboIdx < paramCombinations.length; comboIdx++) {
            const params = paramCombinations[comboIdx];

            // Erstelle Case-spezifische Inputs durch Deep Clone der Basis
            const inputs = deepClone(baseInputs);

            // Überschreibe nur erlaubte Parameter (Whitelist + Blockliste prüfen)
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

            // Wende Overrides an mit Whitelist/Blockliste-Prüfung
            for (const [key, value] of Object.entries(caseOverrides)) {
                if (isBlockedKey(key)) {
                    console.warn(`[SWEEP] Ignoriere Person-2-Key im Sweep: ${key}`);
                    continue;
                }
                if (SWEEP_ALLOWED_KEYS.size && !SWEEP_ALLOWED_KEYS.has(key)) {
                    console.warn(`[SWEEP] Key nicht auf Whitelist, übersprungen: ${key}`);
                    continue;
                }
                // Setze erlaubten Parameter
                inputs[key] = value;
            }

            // P2-Invarianz-Guard: Extrahiere Basis-Parameter (NICHT abgeleitete Zeitserien!)
            const p2Invariants = extractP2Invariants(inputs);

            if (REF_P2_INVARIANTS === null) {
                // Erste Case-Referenz setzen
                REF_P2_INVARIANTS = p2Invariants;
            }

            // Prüfe P2-Invarianz VOR der Simulation (keine YearLogs mehr nötig!)
            const p2VarianceWarning = !areP2InvariantsEqual(p2Invariants, REF_P2_INVARIANTS);

            if (p2VarianceWarning) {
                console.warn(`[SWEEP][ASSERT] P2-Basis-Parameter variieren im Sweep (Case ${comboIdx}), sollten konstant bleiben!`);
                console.warn('[SWEEP] Referenz:', REF_P2_INVARIANTS);
                console.warn('[SWEEP] Aktuell:', p2Invariants);
            }

            const rand = rng(baseSeed + comboIdx);
            const stressCtxMaster = buildStressContext(inputs.stressPreset, rand);

            const runOutcomes = [];

            for (let i = 0; i < anzahlRuns; i++) {
                let failed = false;
                const startYearIndex = Math.floor(rand() * annualData.length);
                let simState = initMcRunState(inputs, startYearIndex);

                const depotWertHistorie = [portfolioTotal(simState.portfolio)];
                let careMeta = makeDefaultCareMeta(inputs.pflegefallLogikAktivieren, inputs.geschlecht);
                let stressCtx = cloneStressContext(stressCtxMaster);

                let minRunway = Infinity;

                // Track dynamic transition year (can be shortened by care event)
                let effectiveTransitionYear = inputs.transitionYear ?? 0;

                for (let simulationsJahr = 0; simulationsJahr < maxDauer; simulationsJahr++) {
                    const currentAge = inputs.startAlter + simulationsJahr;

                    let yearData = sampleNextYearData(simState, methode, blockSize, rand, stressCtx);
                    yearData = applyStressOverride(yearData, stressCtx, rand);

                    careMeta = updateCareMeta(careMeta, inputs, currentAge, yearData, rand);

                    // FORCE RETIREMENT if care is active in Accumulation Phase
                    // If we are currently in accumulation (simulation year < transition year) and care triggers,
                    // we immediately stop accumulation and switch to retirement mode for this and future years.
                    if (inputs.accumulationPhase?.enabled && simulationsJahr < effectiveTransitionYear) {
                        if (careMeta && careMeta.active) {
                            effectiveTransitionYear = simulationsJahr;
                        }
                    }

                    // Mortality Check
                    // Skip mortality during Accumulation Phase to focus on financial outcome
                    const isAccumulation = inputs.accumulationPhase?.enabled && simulationsJahr < effectiveTransitionYear;

                    if (!isAccumulation) {
                        let qx = MORTALITY_TABLE[inputs.geschlecht][currentAge] || 1;
                        const careFactor = computeCareMortalityMultiplier(careMeta, inputs);
                        if (careFactor > 1) {
                            qx = Math.min(1.0, qx * careFactor);
                        }

                        if (rand() < qx) break;
                    }

                    // Berechne dynamische Rentenanpassung basierend auf Modus (fix/wage/cpi)
                    const effectiveRentAdjPct = computeRentAdjRate(inputs, yearData);
                    const adjustedInputs = { ...inputs, rentAdjPct: effectiveRentAdjPct, transitionYear: effectiveTransitionYear };

                    // Calculate care floor addition (if active)
                    const { zusatzFloor: careFloor } = calcCareCost(careMeta, null);

                    const result = simulateOneYear(simState, adjustedInputs, yearData, simulationsJahr, careMeta, careFloor, null, 1.0, Ruhestandsmodell_v30);

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
            metrics.warningR2Varies = p2VarianceWarning; // Füge Warnung zu Metriken hinzu
            sweepResults.push({ params, metrics });

            const progress = ((comboIdx + 1) / paramCombinations.length) * 100;
            progressBar.style.width = `${progress}%`;
            progressBar.textContent = `${Math.round(progress)}%`;

            if (comboIdx % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        window.sweepResults = sweepResults;
        window.sweepParamRanges = paramRanges;

        displaySweepResults();

        document.getElementById('sweepResults').style.display = 'block';

        // Zeige Optimierungs- und Visualisierungs-Buttons an
        document.getElementById('findBestButton').style.display = 'inline-block';
        document.getElementById('sensitivityButton').style.display = 'inline-block';
        document.getElementById('paretoButton').style.display = 'inline-block';
    } catch (error) {
        // Bewusste, knappe Nutzerwarnung – ergänzt mit Hinweis für Entwickler.
        alert("Fehler im Parameter-Sweep:\n\n" + error.message);
        console.error('Parameter-Sweep Fehler:', error);

        // Reset UI on error (damit der Nutzer einen neuen Versuch starten kann)
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
    } finally {
        if (progressBar.style.width !== '0%') {
            progressBar.style.width = '100%';
            progressBar.textContent = '100%';
        }
        setTimeout(() => { progressBarContainer.style.display = 'none'; }, 250);
        sweepButton.disabled = false;
    }
}

/**
 * ==========================================================================
 * Optimierungs-Funktionen (Global für HTML onclick Handler)
 * ==========================================================================
 */

/**
 * Findet und zeigt die besten Parameter aus dem aktuellen Sweep an
 */
window.findAndDisplayBest = function () {
    if (!window.sweepResults || window.sweepResults.length === 0) {
        alert('Bitte führen Sie zuerst einen Parameter Sweep durch.');
        return;
    }

    const metricKey = document.getElementById('sweepMetric').value;
    const maximize = shouldMaximizeMetric(metricKey);
    const bestResult = findBestParameters(window.sweepResults, metricKey, maximize);

    if (bestResult) {
        displayBestParameters(bestResult, metricKey);
        // Scroll zu den Ergebnissen
        document.getElementById('optimizationResults').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        alert('Keine Ergebnisse zum Optimieren gefunden.');
    }
};


/**
 * Zeigt Sensitivity Analysis
 */
window.showSensitivityAnalysis = function () {
    displaySensitivityAnalysis();
};

/**
 * Zeigt Dialog für Pareto Frontier
 */
window.showParetoDialog = function () {
    // Erstelle ein einfaches Dialog für Metrik-Auswahl
    const metric1 = prompt(
        'Erste Metrik (X-Achse):\n\n' +
        'Optionen:\n' +
        '- successProbFloor\n' +
        '- medianEndWealth (default)\n' +
        '- p10EndWealth\n' +
        '- p75EndWealth\n' +
        '- meanEndWealth\n' +
        '- maxEndWealth\n' +
        '- worst5Drawdown\n' +
        '- minRunwayObserved',
        'medianEndWealth'
    );

    if (!metric1) return;

    const metric2 = prompt(
        'Zweite Metrik (Y-Achse):\n\n' +
        'Optionen:\n' +
        '- successProbFloor\n' +
        '- medianEndWealth\n' +
        '- p10EndWealth\n' +
        '- p75EndWealth\n' +
        '- meanEndWealth\n' +
        '- maxEndWealth\n' +
        '- worst5Drawdown (default)\n' +
        '- minRunwayObserved',
        'worst5Drawdown'
    );

    if (!metric2) return;

    // Speichere Auswahl für displayParetoFrontier
    if (!window.paretoMetrics) window.paretoMetrics = {};
    window.paretoMetrics.metric1 = metric1;
    window.paretoMetrics.metric2 = metric2;

    displayParetoFrontier();
};

/**
 * Demo: Multi-Objective Optimization
 * Optimiert für Wealth UND Success Probability gleichzeitig
 */
window.runMultiObjectiveDemo = function () {
    const objectives = [
        { metricKey: 'medianEndWealth', weight: 0.6, maximize: true },
        { metricKey: 'successProbFloor', weight: 0.4, maximize: true }
    ];
    displayMultiObjectiveOptimization(objectives);
};

/**
 * Demo: Constraint-Based Optimization
 * Maximiere Median Wealth unter Einhaltung von Success Rate >= 95%
 */
window.runConstraintBasedDemo = function () {
    const constraints = [
        { metricKey: 'successProbFloor', operator: '>=', value: 95 },
        { metricKey: 'worst5Drawdown', operator: '<=', value: 40 }
    ];
    displayConstraintBasedOptimization('medianEndWealth', true, constraints);
};

// Event-Listener für Metrik-Änderung (um Optimierungsergebnisse zu aktualisieren)
document.addEventListener('DOMContentLoaded', function () {
    const metricSelector = document.getElementById('sweepMetric');
    if (metricSelector) {
        metricSelector.addEventListener('change', function () {
            // Verstecke alte Optimierungsergebnisse bei Metrik-Wechsel
            const optimizationResults = document.getElementById('optimizationResults');
            if (optimizationResults && optimizationResults.style.display !== 'none') {
                optimizationResults.style.display = 'none';
            }

            // Verstecke auch Sensitivity-Ergebnisse
            const sensitivityResults = document.getElementById('sensitivityResults');
            if (sensitivityResults && sensitivityResults.style.display !== 'none') {
                sensitivityResults.style.display = 'none';
            }
        });
    }
});
