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

import { parseRangeInput, cartesianProductLimited } from './simulator-utils.js';
import { getCommonInputs } from './simulator-portfolio.js';
import { prepareHistoricalDataOnce } from './simulator-engine-helpers.js';
import { findBestParameters, shouldMaximizeMetric, displayBestParameters, displayMultiObjectiveOptimization, displayConstraintBasedOptimization } from './simulator-optimizer.js';
import { displaySensitivityAnalysis, displayParetoFrontier } from './simulator-visualization.js';
import { deepClone, extractP2Invariants } from './simulator-sweep-utils.js';
import { renderSweepHeatmapSVG } from './simulator-heatmap.js';
import { WorkerPool } from '../../workers/worker-pool.js';
import { WorkerJobRunner } from './worker-job-runner.js';
import { buildSweepInputs, runSweepChunk } from './sweep-runner.js';
import { persistenceStorage } from '../shared/persistence-facade.js';
import { formatSimulatorValidationError, validateSimulatorInputs } from './simulator-input-validation.js';
import { readMonteCarloParameters } from './monte-carlo-ui.js';
import {
    SWEEP_REQUEST_VERSION,
    normalizeSweepRequestV1
} from './monte-carlo-parameters.js';
import { SWEEP_METRICS_VERSION } from './sweep-metrics-contract.js';

export const SWEEP_EXECUTION_VERSION = 'SweepExecutionV2';

const SWEEP_FIELDS = [
    ['liquidityRunwayYears', 'sweepLiquidityRunwayYears', 'Liquiditäts-Runway'],
    ['goldRebalancingBand', 'sweepGoldRebalancingBand', 'Gold-Rebal Band'],
    ['maxSkimPct', 'sweepMaxSkimPct', 'Max Skim %'],
    ['maxBearRefillPct', 'sweepMaxBearRefillPct', 'Max Bear Refill %'],
    ['goldTargetPct', 'sweepGoldTargetPct', 'Gold Target %'],
    ['survivalQuantile', 'sweepSurvivalQuantile', 'VPW Survival-Quantile'],
    ['goGoMultiplier', 'sweepGoGoMultiplier', 'VPW Go-Go Multiplikator']
];

export function readInteractiveSweepRanges() {
    const dynamicFlex = document.getElementById('dynamicFlex')?.checked === true;
    const quantileActive = dynamicFlex && document.getElementById('horizonMethod')?.value === 'survival_quantile';
    const goGoActive = dynamicFlex && document.getElementById('goGoActive')?.checked === true;
    const ranges = {};
    for (const [key, id, label] of SWEEP_FIELDS) {
        if (key === 'survivalQuantile' && !quantileActive) continue;
        if (key === 'goGoMultiplier' && !goGoActive) continue;
        const values = parseRangeInput(document.getElementById(id)?.value ?? '');
        if (values.length === 0) return { ranges, emptyLabel: label };
        ranges[key] = values;
    }
    return { ranges, emptyLabel: null };
}

/**
 * Initialisiert Sweep-Inputfelder und synchronisiert sie mit der Persistenz-Facade.
 *
 * Jeder Eintrag im Mapping wird beim Laden mit einem evtl. gespeicherten Wert
 * vorbelegt. Änderungen werden defensiv sowohl auf "change" als auch
 * "input"-Events gespeichert, um keine Benutzerinteraktion zu verlieren.
 */
export function initSweepDefaultsWithLocalStorageFallback() {
    // The direct horizon is no longer an interactive Sweep dimension. Remove
    // its stale UI-only value so a future field cannot silently revive it.
    persistenceStorage.removeItem('sim.sweep.horizonYears');
    persistenceStorage.removeItem('sim.sweep.runwayMin');
    persistenceStorage.removeItem('sim.sweep.runwayTarget');
    persistenceStorage.removeItem('sim.sweep.targetEq');

    const map = [
        ['sweepLiquidityRunwayYears', 'sim.sweep.liquidityRunwayYears'],
        ['sweepGoldRebalancingBand', 'sim.sweep.goldRebalancingBand'],
        ['sweepMaxSkimPct', 'sim.sweep.maxSkimPct'],
        ['sweepMaxBearRefillPct', 'sim.sweep.maxBearRefillPct'],
        ['sweepGoldTargetPct', 'sim.sweep.goldTarget'],
        ['sweepSurvivalQuantile', 'sim.sweep.survivalQuantile'],
        ['sweepGoGoMultiplier', 'sim.sweep.goGoMultiplier']
    ];

    for (const [elementId, storageKey] of map) {
        const element = document.getElementById(elementId);
        if (!element) {
            // UI fehlt (z.B. in Tests) – bewusst überspringen.
            continue;
        }

        const persistedValue = persistenceStorage.getItem(storageKey);
        if (persistedValue !== null && persistedValue !== undefined && persistedValue !== '') {
            element.value = persistedValue;
        }

        // Speichere Änderungen unabhängig davon, ob das Event über Enter oder Tippen ausgelöst wurde.
        element.addEventListener('change', () => persistenceStorage.setItem(storageKey, element.value));
        element.addEventListener('input', () => persistenceStorage.setItem(storageKey, element.value));
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

function readSweepWorkerConfig() {
    const workerCountRaw = document.getElementById('mcWorkerCount')?.value ?? '8';
    const budgetRaw = document.getElementById('mcWorkerBudget')?.value ?? '500';
    const workerCount = parseInt(String(workerCountRaw).trim(), 10);
    const timeBudgetMs = parseInt(String(budgetRaw).trim(), 10);
    return {
        // 0 means "auto" (use hardwareConcurrency heuristic).
        workerCount: Number.isFinite(workerCount) && workerCount > 0 ? workerCount : 0,
        timeBudgetMs: Number.isFinite(timeBudgetMs) && timeBudgetMs > 0 ? timeBudgetMs : 500
    };
}

async function runSweepWithWorkers({
    baseInputs,
    paramCombinations,
    sweepRequest,
    refP2Invariants,
    onProgress
}) {
    const totalCombos = paramCombinations.length;
    const workerConfig = readSweepWorkerConfig();
    const desiredWorkers = workerConfig.workerCount ?? 0;
    const workerCount = Math.max(1, Number.isFinite(desiredWorkers) && desiredWorkers > 0
        ? desiredWorkers
        : Math.max(1, (navigator?.hardwareConcurrency || 2) - 1));
    const timeBudgetMs = workerConfig.timeBudgetMs ?? 200;
    const workerUrl = new URL('../../workers/mc-worker.js', import.meta.url);

    const pool = new WorkerPool({
        workerUrl,
        size: workerCount,
        type: 'module',
        telemetryName: 'SweepPool',
        onError: error => console.error('[SWEEP WorkerPool] Error:', error)
    });

    const sweepResults = new Array(totalCombos);
    const minChunk = 2;
    const maxChunk = Math.min(80, Math.max(minChunk, Math.ceil(totalCombos / workerCount)));
    const runner = new WorkerJobRunner({
        pool,
        totalItems: totalCombos,
        workerCount,
        timeBudgetMs,
        minChunk,
        maxChunk,
        enableStallDetection: false,
        onProgress,
        buildPayload: (start, count) => ({
            type: 'sweep',
            sweepRequest,
            comboRange: { start, count },
            refP2Invariants
        }),
        mergeResult: result => {
            // Merge sparse results into the full array by combo index.
            for (const item of result.results) {
                sweepResults[item.comboIdx] = {
                    params: item.params,
                    metrics: item.metrics,
                    provenance: item.provenance
                };
            }
        }
    });

    try {
        await pool.broadcast({
            type: 'sweep-init',
            baseInputs,
            paramCombinations
        });
        await runner.run();
    } finally {
        pool.dispose();
    }

    return sweepResults;
}

async function runSweepSerial({
    baseInputs,
    paramCombinations,
    sweepRequest,
    refP2Invariants,
    onProgress
}) {
    const totalCombos = paramCombinations.length;
    const sweepResults = new Array(totalCombos);
    let completedCombos = 0;
    // Chunk serial execution to keep UI responsive.
    const chunkSize = Math.min(20, Math.max(1, Math.ceil(totalCombos / 20)));

    for (let start = 0; start < totalCombos; start += chunkSize) {
        const count = Math.min(chunkSize, totalCombos - start);
        const serial = runSweepChunk({
            baseInputs,
            paramCombinations,
            comboRange: { start, count },
            sweepRequest,
            refP2Invariants
        });
        for (const item of serial.results) {
            sweepResults[item.comboIdx] = {
                params: item.params,
                metrics: item.metrics,
                provenance: item.provenance
            };
        }
        completedCombos += count;
        if (typeof onProgress === 'function') {
            onProgress((completedCombos / totalCombos) * 100);
        }
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    return sweepResults;
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
        prepareHistoricalDataOnce();

        // ========= Parameter-Parsing (mit frühzeitigen, konkreten Alerts) =========
        let paramRanges;
        try {
            const selection = readInteractiveSweepRanges();
            if (selection.emptyLabel) {
                alert(`Leeres Range-Input für ${selection.emptyLabel}.\n\nBitte geben Sie einen Wert ein:\n- Einzelwert: 24\n- Liste: 24,36,48\n- Range: 24:12:48`);
                return;
            }
            paramRanges = selection.ranges;
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
        // Clone once so each combo can be safely overridden without side effects.
        const baseInputs = deepClone(validateSimulatorInputs(getCommonInputs()));
        const sweepRequest = normalizeSweepRequestV1({
            schemaVersion: SWEEP_REQUEST_VERSION,
            monteCarloParameters: readMonteCarloParameters(baseInputs),
            useCapeSampling: document.getElementById('useCapeSampling')?.checked === true
        }, { inputs: baseInputs });
        const sweepResults = new Array(paramCombinations.length);

        // Reference P2 invariants guard against accidental partner changes.
        const refInputs = buildSweepInputs(baseInputs, paramCombinations[0]);
        const refP2Invariants = extractP2Invariants(refInputs);

        try {
            const workerResults = await runSweepWithWorkers({
                baseInputs,
                paramCombinations,
                sweepRequest,
                refP2Invariants,
                onProgress: pct => {
                    progressBar.style.width = `${pct}%`;
                    progressBar.textContent = `${Math.round(pct)}%`;
                }
            });
            for (let i = 0; i < workerResults.length; i++) {
                sweepResults[i] = workerResults[i];
            }
        } catch (error) {
            console.error('[SWEEP] Worker execution failed, falling back to serial.', error);
            const serialResults = await runSweepSerial({
                baseInputs,
                paramCombinations,
                sweepRequest,
                refP2Invariants,
                onProgress: pct => {
                    progressBar.style.width = `${pct}%`;
                    progressBar.textContent = `${Math.round(pct)}%`;
                }
            });
            for (let i = 0; i < serialResults.length; i++) {
                sweepResults[i] = serialResults[i];
            }
        }

        window.sweepResults = sweepResults;
        const representativeResult = sweepResults.find(result => result?.metrics);
        window.sweepExecution = {
            schemaVersion: SWEEP_EXECUTION_VERSION,
            request: sweepRequest,
            metricMetadata: representativeResult?.metrics?.metricMetadata ?? null,
            comparisonRandomness: representativeResult?.provenance?.comparisonRandomness ?? null,
            results: sweepResults
        };
        window.sweepParamRanges = paramRanges;

        displaySweepResults();

        document.getElementById('sweepResults').style.display = 'block';

        // Zeige Optimierungs- und Visualisierungs-Buttons an
        document.getElementById('findBestButton').style.display = 'inline-block';
        document.getElementById('sensitivityButton').style.display = 'inline-block';
        document.getElementById('paretoButton').style.display = 'inline-block';
    } catch (error) {
        // Bewusste, knappe Nutzerwarnung – ergänzt mit Hinweis für Entwickler.
        alert("Fehler im Parameter-Sweep:\n\n" + formatSimulatorValidationError(error));
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
 * Zeigt die im experimentellen Sweep-Vergleich führende Kombination an.
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
        const hasLegacyShape = window.sweepResults.some(result => (
            result?.metrics && result.metrics.schemaVersion !== SWEEP_METRICS_VERSION
        ));
        alert(hasLegacyShape
            ? 'Die Sweep-Ergebnisse verwenden einen veralteten oder unversionierten Ergebnisvertrag. Bitte führen Sie den Sweep neu aus.'
            : 'Keine gültigen versionierten Ergebnisse für die gewählte Metrik gefunden.');
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
        { metricKey: 'successProbFloor', operator: '>=', value: 95 }
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
