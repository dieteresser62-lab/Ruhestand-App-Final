"use strict";

/**
 * Auto-Parameter-Optimizer für Ruhestand Simulator
 *
 * Bietet zwei Modi:
 * 1. Best-Parameter-Finder: Findet optimale Parameter aus bestehendem Sweep
 * 2. Adaptive Grid Refinement: Iterative Verfeinerung zur Optimierung
 */

import { aggregateSweepMetrics } from './simulator-results.js';
import { runParameterSweep } from './simulator-sweep.js';

/**
 * Findet die beste Parameterkombination aus den Sweep-Ergebnissen
 * @param {Array} sweepResults - Array von {params, metrics}
 * @param {string} metricKey - Zu optimierende Metrik
 * @param {boolean} maximize - true = maximieren, false = minimieren
 * @returns {Object} {params, metricValue, index}
 */
export function findBestParameters(sweepResults, metricKey, maximize = true) {
    if (!sweepResults || sweepResults.length === 0) {
        return null;
    }

    let bestIndex = 0;
    let bestValue = sweepResults[0].metrics[metricKey];

    for (let i = 1; i < sweepResults.length; i++) {
        const value = sweepResults[i].metrics[metricKey];

        if (maximize && value > bestValue) {
            bestValue = value;
            bestIndex = i;
        } else if (!maximize && value < bestValue) {
            bestValue = value;
            bestIndex = i;
        }
    }

    return {
        params: sweepResults[bestIndex].params,
        metricValue: bestValue,
        index: bestIndex,
        metrics: sweepResults[bestIndex].metrics
    };
}

/**
 * Bestimmt ob eine Metrik maximiert oder minimiert werden soll
 * @param {string} metricKey
 * @returns {boolean} true = maximieren, false = minimieren
 */
export function shouldMaximizeMetric(metricKey) {
    const maximizeMetrics = ['successProbFloor', 'p10EndWealth', 'medianEndWealth', 'minRunwayObserved'];
    const minimizeMetrics = ['worst5Drawdown'];

    if (maximizeMetrics.includes(metricKey)) return true;
    if (minimizeMetrics.includes(metricKey)) return false;

    // Default: maximieren
    return true;
}

/**
 * Wendet optimale Parameter auf die Hauptformular-Felder an
 * @param {Object} params - Parameter-Objekt
 */
export function applyParametersToForm(params) {
    const mapping = {
        runwayMin: 'runwayMinMonths',
        runwayTarget: 'runwayTargetMonths',
        targetEq: 'targetEq',
        rebalBand: 'rebalBand',
        maxSkimPct: 'maxSkimPct',
        maxBearRefillPct: 'maxBearRefillPct',
        goldTargetPct: 'goldZielProzent'
    };

    for (const [sweepKey, formId] of Object.entries(mapping)) {
        if (params[sweepKey] !== undefined) {
            const element = document.getElementById(formId);
            if (element) {
                element.value = params[sweepKey];
                // Trigger change event für eventuelle Listener
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }

    // Spezialbehandlung für Gold
    if (params.goldTargetPct !== undefined) {
        const goldActivElement = document.getElementById('goldAktiv');
        if (goldActivElement) {
            goldActivElement.checked = params.goldTargetPct > 0;
            goldActivElement.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
}

/**
 * Zeigt die besten Parameter in der UI an
 * @param {Object} bestResult - Ergebnis von findBestParameters
 * @param {string} metricKey - Name der Metrik
 */
export function displayBestParameters(bestResult, metricKey) {
    if (!bestResult) return;

    const container = document.getElementById('optimizationResults');
    if (!container) return;

    const metricLabels = {
        successProbFloor: 'Success Prob Floor',
        p10EndWealth: 'P10 End Wealth',
        medianEndWealth: 'Median End Wealth',
        worst5Drawdown: 'Worst 5% Drawdown',
        minRunwayObserved: 'Min Runway Observed'
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

    const formatValue = (value, metric) => {
        if (metric === 'p10EndWealth' || metric === 'medianEndWealth') {
            return `${(value / 1000).toFixed(0)}k €`;
        } else if (metric === 'successProbFloor' || metric === 'worst5Drawdown') {
            return `${value.toFixed(1)}%`;
        } else {
            return value.toFixed(1);
        }
    };

    let html = '<div style="padding: 15px; background-color: #e8f5e9; border-radius: 8px; border: 2px solid #4caf50;">';
    html += `<h4 style="margin-top: 0; color: #2e7d32;">✓ Optimale Parameter gefunden</h4>`;
    html += `<p><strong>Optimiert für:</strong> ${metricLabels[metricKey] || metricKey}</p>`;
    html += `<p><strong>Optimaler Wert:</strong> ${formatValue(bestResult.metricValue, metricKey)}</p>`;
    html += '<h5>Parameter:</h5>';
    html += '<table style="width: 100%; border-collapse: collapse;">';

    for (const [key, value] of Object.entries(bestResult.params)) {
        html += `<tr style="border-bottom: 1px solid #ddd;">`;
        html += `<td style="padding: 5px;"><strong>${paramLabels[key] || key}:</strong></td>`;
        html += `<td style="padding: 5px; text-align: right;">${value}</td>`;
        html += `</tr>`;
    }

    html += '</table>';
    html += '<h5 style="margin-top: 15px;">Alle Metriken bei diesen Parametern:</h5>';
    html += '<table style="width: 100%; border-collapse: collapse;">';

    for (const [key, value] of Object.entries(bestResult.metrics)) {
        if (key === 'warningR2Varies') continue;
        html += `<tr style="border-bottom: 1px solid #ddd;">`;
        html += `<td style="padding: 5px;"><strong>${metricLabels[key] || key}:</strong></td>`;
        html += `<td style="padding: 5px; text-align: right;">${formatValue(value, key)}</td>`;
        html += `</tr>`;
    }

    html += '</table>';
    html += '<div style="margin-top: 15px;">';
    html += '<button id="applyOptimalParams" style="padding: 10px 20px; background-color: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">📋 Parameter übernehmen</button>';
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;
    container.style.display = 'block';

    // Event-Listener für "Parameter übernehmen"
    document.getElementById('applyOptimalParams').addEventListener('click', () => {
        applyParametersToForm(bestResult.params);
        alert('✓ Optimale Parameter wurden ins Hauptformular übernommen!');
    });
}

/**
 * Berechnet eine verfeinerte Range um einen Mittelpunkt
 * @param {number} center - Mittelpunkt
 * @param {number} originalStep - Ursprünglicher Step
 * @param {number} refinementFactor - Verfeinerungsfaktor (z.B. 3 = 3x feiner)
 * @param {number} numPoints - Anzahl Punkte
 * @returns {Array} Verfeinerte Werte
 */
function refineRange(center, originalStep, refinementFactor = 3, numPoints = 3) {
    const newStep = originalStep / refinementFactor;
    const values = [];
    const halfPoints = Math.floor(numPoints / 2);

    for (let i = -halfPoints; i <= halfPoints; i++) {
        values.push(center + i * newStep);
    }

    return values;
}

/**
 * Führt adaptive Grid-Verfeinerung durch
 * @param {string} metricKey - Zu optimierende Metrik
 * @param {number} maxIterations - Maximale Iterationen
 * @param {Function} progressCallback - Callback für Fortschrittsanzeige
 */
export async function runAdaptiveOptimization(metricKey, maxIterations = 2, progressCallback = null) {
    const maximize = shouldMaximizeMetric(metricKey);
    const container = document.getElementById('optimizationResults');

    if (container) {
        container.innerHTML = '<p>🔄 Adaptive Optimierung läuft...</p>';
        container.style.display = 'block';
    }

    // Iteration 0: Initialer Sweep (bereits durchgeführt)
    let currentResults = window.sweepResults;
    if (!currentResults || currentResults.length === 0) {
        alert('Bitte führen Sie zuerst einen normalen Parameter Sweep durch.');
        return null;
    }

    let bestOverall = findBestParameters(currentResults, metricKey, maximize);
    const optimizationHistory = [{
        iteration: 0,
        best: bestOverall,
        numCombinations: currentResults.length
    }];

    if (progressCallback) {
        progressCallback(0, maxIterations, bestOverall);
    }

    // Adaptive Refinement Iterations
    for (let iter = 1; iter <= maxIterations; iter++) {
        // Verfeinere Range um aktuell besten Punkt
        const currentBest = findBestParameters(currentResults, metricKey, maximize);
        const originalRanges = window.sweepParamRanges;

        // Berechne ursprüngliche Steps
        const steps = {};
        for (const [key, values] of Object.entries(originalRanges)) {
            if (values.length > 1) {
                steps[key] = values[1] - values[0];
            } else {
                steps[key] = values[0] * 0.1; // 10% wenn nur ein Wert
            }
        }

        // Erstelle verfeinerte Ranges
        const refinedRanges = {};
        for (const [key, originalValues] of Object.entries(originalRanges)) {
            const centerValue = currentBest.params[key];
            if (originalValues.length > 1) {
                refinedRanges[key] = refineRange(centerValue, steps[key], 2, 3);
            } else {
                refinedRanges[key] = [centerValue]; // Konstant halten
            }
        }

        // Update UI mit verfeinerten Ranges (temporär)
        const originalInputs = {};
        for (const [key, values] of Object.entries(refinedRanges)) {
            const inputId = `sweep${key.charAt(0).toUpperCase() + key.slice(1)}`;
            const element = document.getElementById(inputId);
            if (element) {
                originalInputs[inputId] = element.value;
                element.value = values.join(',');
            }
        }

        // Führe verfeinerten Sweep durch
        await runParameterSweep();

        // Finde bestes Ergebnis aus verfeinertem Sweep
        currentResults = window.sweepResults;
        const iterBest = findBestParameters(currentResults, metricKey, maximize);

        // Update overall best wenn besser
        if (maximize && iterBest.metricValue > bestOverall.metricValue) {
            bestOverall = iterBest;
        } else if (!maximize && iterBest.metricValue < bestOverall.metricValue) {
            bestOverall = iterBest;
        }

        optimizationHistory.push({
            iteration: iter,
            best: iterBest,
            numCombinations: currentResults.length
        });

        if (progressCallback) {
            progressCallback(iter, maxIterations, bestOverall);
        }

        // Restore original inputs
        for (const [inputId, value] of Object.entries(originalInputs)) {
            const element = document.getElementById(inputId);
            if (element) element.value = value;
        }
    }

    return {
        bestParameters: bestOverall,
        history: optimizationHistory
    };
}

/**
 * Zeigt Optimierungsverlauf an
 * @param {Object} result - Ergebnis von runAdaptiveOptimization
 * @param {string} metricKey - Name der Metrik
 */
export function displayOptimizationHistory(result, metricKey) {
    if (!result || !result.history) return;

    const container = document.getElementById('optimizationResults');
    if (!container) return;

    const formatValue = (value, metric) => {
        if (metric === 'p10EndWealth' || metric === 'medianEndWealth') {
            return `${(value / 1000).toFixed(0)}k €`;
        } else if (metric === 'successProbFloor' || metric === 'worst5Drawdown') {
            return `${value.toFixed(1)}%`;
        } else {
            return value.toFixed(1);
        }
    };

    let html = '<div style="padding: 15px; background-color: #e3f2fd; border-radius: 8px; border: 2px solid #2196f3;">';
    html += '<h4 style="margin-top: 0; color: #1565c0;">🎯 Adaptive Optimierung abgeschlossen</h4>';
    html += '<h5>Optimierungsverlauf:</h5>';
    html += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">';
    html += '<tr style="background-color: #90caf9; font-weight: bold;">';
    html += '<th style="padding: 8px; border: 1px solid #ddd;">Iteration</th>';
    html += '<th style="padding: 8px; border: 1px solid #ddd;">Kombinationen</th>';
    html += '<th style="padding: 8px; border: 1px solid #ddd;">Bester Wert</th>';
    html += '</tr>';

    for (const entry of result.history) {
        html += '<tr>';
        html += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${entry.iteration}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${entry.numCombinations}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatValue(entry.best.metricValue, metricKey)}</td>`;
        html += '</tr>';
    }

    html += '</table>';
    html += '</div>';

    // Füge Best Parameters Display hinzu
    displayBestParameters(result.bestParameters, metricKey);

    // Prepend history
    container.innerHTML = html + container.innerHTML;
}
