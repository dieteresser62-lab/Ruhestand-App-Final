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
import { WorkerPool } from './workers/worker-pool.js';
import { buildSweepInputs, runSweepChunk } from './sweep-runner.js';

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

function readSweepWorkerConfig() {
    const workerCountRaw = document.getElementById('mcWorkerCount')?.value ?? '0';
    const budgetRaw = document.getElementById('mcWorkerBudget')?.value ?? '200';
    const workerCount = parseInt(String(workerCountRaw).trim(), 10);
    const timeBudgetMs = parseInt(String(budgetRaw).trim(), 10);
    return {
        workerCount: Number.isFinite(workerCount) && workerCount > 0 ? workerCount : 0,
        timeBudgetMs: Number.isFinite(timeBudgetMs) && timeBudgetMs > 0 ? timeBudgetMs : 200
    };
}

async function runSweepWithWorkers({
    baseInputs,
    paramCombinations,
    sweepConfig,
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
    const workerUrl = new URL('./workers/mc-worker.js', import.meta.url);

    const pool = new WorkerPool({
        workerUrl,
        size: workerCount,
        type: 'module',
        onError: error => console.error('[SWEEP WorkerPool] Error:', error)
    });

    const sweepResults = new Array(totalCombos);
    let completedCombos = 0;
    let p2VarianceCount = 0;
    let nextComboIdx = 0;

    const minChunk = 1;
    const maxChunk = Math.max(minChunk, Math.ceil(totalCombos / workerCount));
    let chunkSize = Math.min(maxChunk, Math.max(minChunk, Math.floor(totalCombos / (workerCount * 4)) || minChunk));
    let smoothedChunkSize = chunkSize;

    const pending = new Set();

    const scheduleJob = (start, count) => {
        const startedAt = performance.now();
        const payload = {
            type: 'sweep',
            sweepConfig,
            comboRange: { start, count },
            refP2Invariants
        };
        const promise = pool.runJob(payload).then(result => {
            const elapsedMs = result.elapsedMs ?? (performance.now() - startedAt);
            return { result, start, count, elapsedMs };
        });
        pending.add(promise);
        promise.finally(() => pending.delete(promise));
    };

    try {
        await pool.broadcast({
            type: 'sweep-init',
            baseInputs,
            paramCombinations
        });

        while (nextComboIdx < totalCombos && pending.size < workerCount) {
            const count = Math.min(chunkSize, totalCombos - nextComboIdx);
            scheduleJob(nextComboIdx, count);
            nextComboIdx += count;
        }

        while (pending.size > 0) {
            const { result, start, count, elapsedMs } = await Promise.race(pending);

            for (const item of result.results) {
                sweepResults[item.comboIdx] = { params: item.params, metrics: item.metrics };
            }
            p2VarianceCount += result.p2VarianceCount || 0;

            completedCombos += count;
            onProgress((completedCombos / totalCombos) * 100);

            if (elapsedMs > 0) {
                const scaled = Math.round(count * (timeBudgetMs / elapsedMs));
                const targetSize = Math.max(minChunk, Math.min(maxChunk, scaled || minChunk));
                smoothedChunkSize = Math.max(minChunk, Math.min(maxChunk, Math.round(smoothedChunkSize * 0.7 + targetSize * 0.3)));
                chunkSize = smoothedChunkSize;
            }

            if (nextComboIdx < totalCombos) {
                const nextCount = Math.min(chunkSize, totalCombos - nextComboIdx);
                scheduleJob(nextComboIdx, nextCount);
                nextComboIdx += nextCount;
            }
        }
    } finally {
        pool.dispose();
    }

    if (p2VarianceCount > 0) {
        console.warn(`[SWEEP][ASSERT] P2-Basis-Parameter variieren in ${p2VarianceCount} Kombos.`);
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
        const rngModeEl = document.getElementById('rngMode');
        const rngMode = rngModeEl ? rngModeEl.value : 'per-run-seed';

        const sweepConfig = { anzahlRuns, maxDauer, blockSize, baseSeed, methode, rngMode };
        const sweepResults = new Array(paramCombinations.length);

        const refInputs = buildSweepInputs(baseInputs, paramCombinations[0]);
        const refP2Invariants = extractP2Invariants(refInputs);

        try {
            const workerResults = await runSweepWithWorkers({
                baseInputs,
                paramCombinations,
                sweepConfig,
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
            const serial = runSweepChunk({
                baseInputs,
                paramCombinations,
                comboRange: { start: 0, count: paramCombinations.length },
                sweepConfig,
                refP2Invariants
            });
            for (const item of serial.results) {
                sweepResults[item.comboIdx] = { params: item.params, metrics: item.metrics };
            }
            progressBar.style.width = '100%';
            progressBar.textContent = '100%';
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
