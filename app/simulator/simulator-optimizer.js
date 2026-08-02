"use strict";

/**
 * Auto-Parameter-Optimizer für Ruhestand Simulator
 *
 * Bietet zwei Modi:
 * 1. Best-Parameter-Finder: Findet optimale Parameter aus bestehendem Sweep
 * 2. Adaptive Grid Refinement: Iterative Verfeinerung zur Optimierung
 */

import {
    SWEEP_DECISION_METRIC_KEYS,
    SWEEP_METRICS_VERSION,
    readSweepMetricValue
} from './sweep-metrics-contract.js';
import { runParameterSweep } from './simulator-sweep.js';

const WEALTH_METRICS = new Set([
    'p10EndWealth',
    'p25EndWealth',
    'medianEndWealth',
    'p75EndWealth',
    'meanEndWealth',
    'maxEndWealth'
]);
const PERCENT_METRICS = new Set(['successProbFloor', 'worst5Drawdown']);

const formatFixed = (value, digits = 1) => value.toFixed(digits);
const formatPercent = (value, digits = 1) => `${formatFixed(value, digits)}%`;
const formatThousandsEuro = (value) => `${formatFixed(value / 1000, 0)}k €`;
const formatMetricValue = (value, metric) => {
    if (WEALTH_METRICS.has(metric)) {
        return formatThousandsEuro(value);
    }
    if (PERCENT_METRICS.has(metric)) {
        return formatPercent(value, 1);
    }
    return formatFixed(value, 1);
};

function isValidSweepResult(result, metricKeys = []) {
    return Boolean(result)
        && result.metrics?.invalidCombination !== true
        && Array.isArray(metricKeys)
        && metricKeys.length > 0
        && metricKeys.every(key => readSweepMetricValue(result, key) !== null);
}

function metricValuesEqual(left, right) {
    const scale = Math.max(1, Math.abs(left), Math.abs(right));
    return Math.abs(left - right) <= Number.EPSILON * 8 * scale;
}

function hasLegacySweepMetricShapes(results) {
    return Array.isArray(results) && results.some(result => (
        result?.metrics && result.metrics.schemaVersion !== SWEEP_METRICS_VERSION
    ));
}

function renderComparisonNotice(metrics, rankingDiagnostics = null) {
    const comparison = metrics?.comparison;
    if (!comparison) {
        return '<p style="color:#b71c1c;"><strong>Vergleichsdiagnostik fehlt:</strong> Ergebnis wird nicht als belastbares Ranking interpretiert.</p>';
    }
    const interval = comparison.successProbability?.confidenceInterval95;
    const intervalText = interval
        ? `Wilson-95%-KI der Erfolgsquote: ${formatPercent(interval.lowerPct, 1)} bis ${formatPercent(interval.upperPct, 1)}.`
        : 'Kein Wilson-Intervall verfügbar.';
    const runCountText = comparison.runCount === 1
        ? '1 Lauf'
        : `${comparison.runCount} Läufe`;
    const saturationText = comparison.drawdownQuantile?.quantileInTerminalRuinBlock === true
        ? ` <strong>Drawdown-P95 gesättigt:</strong> ${formatPercent(comparison.drawdownQuantile.terminalRuinSharePct, 1)} der Läufe enden terminal; diese Kennzahl unterscheidet Strategien in diesem Bereich nicht.`
        : '';
    const tieText = rankingDiagnostics?.status === 'indeterminate_tie'
        ? ` <strong>Keine eindeutige Führung:</strong> ${rankingDiagnostics.tiedBestCount} Kombinationen teilen denselben Punktschätzer.`
        : '';
    return `<p style="color:#8a5a00;"><strong>Experimenteller Parametervergleich:</strong> ${runCountText}; Common Random Numbers ${comparison.commonRandomNumbers === true ? 'aktiv' : 'nicht belegt'}. ${intervalText} Quantilwerte besitzen kein geschätztes Konfidenzintervall und belegen keine objektiv beste Strategie. Der Sweep-Drawdown enthält terminale Ruine und ist nicht direkt mit der unversionierten Monte-Carlo-Drawdownkennzahl vergleichbar.${saturationText}${tieText}</p>`;
}

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

    const validResults = sweepResults.filter(result => isValidSweepResult(result, [metricKey]));
    if (validResults.length === 0) return null;

    let bestIndex = 0;
    let bestValue = readSweepMetricValue(validResults[0], metricKey);

    for (let i = 1; i < validResults.length; i++) {
        const value = readSweepMetricValue(validResults[i], metricKey);

        if (maximize && value > bestValue) {
            bestValue = value;
            bestIndex = i;
        } else if (!maximize && value < bestValue) {
            bestValue = value;
            bestIndex = i;
        }
    }

    const tiedBestResults = validResults.filter(result => (
        metricValuesEqual(readSweepMetricValue(result, metricKey), bestValue)
    ));
    const rankingDiagnostics = {
        status: tiedBestResults.length > 1 ? 'indeterminate_tie' : 'unique_point_estimate',
        tiedBestCount: tiedBestResults.length,
        totalValidCount: validResults.length,
        metricKey,
        terminalRuinSaturatedCount: validResults.filter(result => (
            result.metrics?.comparison?.drawdownQuantile?.quantileInTerminalRuinBlock === true
        )).length
    };
    if (tiedBestResults.length > 1) {
        return {
            params: null,
            metricValue: bestValue,
            index: null,
            metrics: tiedBestResults[0].metrics,
            rankingDiagnostics
        };
    }

    return {
        params: validResults[bestIndex].params,
        metricValue: bestValue,
        index: bestIndex,
        metrics: validResults[bestIndex].metrics,
        rankingDiagnostics
    };
}

/**
 * Bestimmt ob eine Metrik maximiert oder minimiert werden soll
 * @param {string} metricKey
 * @returns {boolean} true = maximieren, false = minimieren
 */
export function shouldMaximizeMetric(metricKey) {
    const maximizeMetrics = [
        'successProbFloor',
        'p10EndWealth',
        'p25EndWealth',
        'medianEndWealth',
        'p75EndWealth',
        'meanEndWealth',
        'maxEndWealth',
        'minRunwayObserved'
    ];
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
        liquidityRunwayYears: 'liquidityRunwayYears',
        goldRebalancingBand: 'rebalancingBand',
        maxSkimPct: 'maxSkimPctOfEq',
        maxBearRefillPct: 'maxBearRefillPctOfEq',
        goldTargetPct: 'goldAllokationProzent',
        horizonYears: 'horizonYears',
        survivalQuantile: 'survivalQuantile',
        goGoMultiplier: 'goGoMultiplier'
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
        const goldActivElement = document.getElementById('goldAllokationAktiv');
        if (goldActivElement) {
            goldActivElement.value = params.goldTargetPct > 0 ? 'true' : 'false';
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
        p25EndWealth: 'P25 End Wealth',
        medianEndWealth: 'Median End Wealth',
        p75EndWealth: 'P75 End Wealth',
        meanEndWealth: 'Mean End Wealth',
        maxEndWealth: 'Max End Wealth',
        worst5Drawdown: 'Worst 5% Drawdown',
        minRunwayObserved: 'Min Runway Observed'
    };

    const paramLabels = {
        liquidityRunwayYears: 'Liquiditäts-Runway',
        goldRebalancingBand: 'Gold-Rebal Band',
        maxSkimPct: 'Max Skim %',
        maxBearRefillPct: 'Max Bear Refill %',
        goldTargetPct: 'Gold Target %',
        horizonYears: 'VPW Horizon',
        survivalQuantile: 'VPW Quantile',
        goGoMultiplier: 'VPW Go-Go Mult'
    };

    let html = '<div style="padding: 15px; background-color: #e8f5e9; border-radius: 8px; border: 2px solid #4caf50;">';
    html += bestResult.params
        ? '<h4 style="margin-top: 0; color: #2e7d32;">Im Sweep-Vergleich führende Kombination</h4>'
        : '<h4 style="margin-top: 0; color: #b71c1c;">Keine eindeutig führende Kombination</h4>';
    html += renderComparisonNotice(bestResult.metrics, bestResult.rankingDiagnostics);
    html += `<p><strong>Verglichen nach:</strong> ${metricLabels[metricKey] || metricKey}</p>`;
    html += `<p><strong>${bestResult.params ? 'Führender' : 'Geteilter'} Punktschätzer:</strong> ${formatMetricValue(bestResult.metricValue, metricKey)}</p>`;
    if (!bestResult.params) {
        html += '<p>Es werden keine Parameter zur Übernahme angeboten. Verwenden Sie eine zusätzliche unterscheidende Metrik oder erhöhen Sie die Aussagekraft des Versuchsdesigns.</p>';
        html += '</div>';
        container.innerHTML = html;
        container.style.display = 'block';
        return;
    }
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

    for (const key of SWEEP_DECISION_METRIC_KEYS) {
        const value = readSweepMetricValue(bestResult, key);
        if (value === null) continue;
        html += `<tr style="border-bottom: 1px solid #ddd;">`;
        html += `<td style="padding: 5px;"><strong>${metricLabels[key] || key}:</strong></td>`;
        html += `<td style="padding: 5px; text-align: right;">${formatMetricValue(value, key)}</td>`;
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
        alert('Die im experimentellen Sweep-Vergleich führenden Parameter wurden ins Hauptformular übernommen.');
    });
}


/**
 * ==========================================================================
 * Multi-Objective & Constraint-Based Optimization
 * ==========================================================================
 */

/**
 * Findet beste Parameter mit Multi-Objective Optimization (Weighted Sum Approach)
 * @param {Array} sweepResults - Sweep-Ergebnisse
 * @param {Array} objectives - Array von {metricKey, weight, maximize}
 * @returns {Object} Beste Parameter
 */
export function findBestParametersMultiObjective(sweepResults, objectives) {
    if (!sweepResults || sweepResults.length === 0 || !objectives || objectives.length === 0) {
        return null;
    }

    const metricKeys = objectives.map(obj => obj.metricKey);
    const validResults = sweepResults.filter(result => isValidSweepResult(result, metricKeys));
    if (validResults.length === 0) return null;

    // Normalisiere Metriken auf 0-1 Skala, damit die Gewichtung vergleichbar wird
    // (sonst dominiert eine Metrik mit großem Wertebereich).
    const normalized = {};
    for (const obj of objectives) {
        const values = validResults.map(r => readSweepMetricValue(r, obj.metricKey));
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;

        normalized[obj.metricKey] = { min, max, range };
    }

    // Berechne gewichtete Summe für jedes Ergebnis
    let bestIndex = 0;
    let bestScore = -Infinity;
    const scores = [];

    for (let i = 0; i < validResults.length; i++) {
        let score = 0;

        for (const obj of objectives) {
            const value = readSweepMetricValue(validResults[i], obj.metricKey);
            const norm = normalized[obj.metricKey];

            // Normalisiere auf 0-1 (Range=0 => neutraler 0.5-Wert).
            let normalizedValue = norm.range > 0 ? (value - norm.min) / norm.range : 0.5;

            // Invertiere wenn minimieren
            if (!obj.maximize) {
                normalizedValue = 1 - normalizedValue;
            }

            score += normalizedValue * obj.weight;
        }
        scores.push(score);

        if (score > bestScore) {
            bestScore = score;
            bestIndex = i;
        }
    }

    const tiedBestIndices = scores
        .map((score, index) => metricValuesEqual(score, bestScore) ? index : -1)
        .filter(index => index >= 0);
    const degenerateMetricKeys = objectives
        .filter(objective => normalized[objective.metricKey].range === 0)
        .map(objective => objective.metricKey);
    const rankingDiagnostics = {
        status: tiedBestIndices.length > 1 ? 'indeterminate_tie' : 'unique_point_estimate',
        tiedBestCount: tiedBestIndices.length,
        totalValidCount: validResults.length,
        degenerateMetricKeys
    };
    if (tiedBestIndices.length > 1) {
        return {
            params: null,
            score: bestScore,
            index: null,
            metrics: validResults[tiedBestIndices[0]].metrics,
            rankingDiagnostics
        };
    }

    return {
        params: validResults[bestIndex].params,
        score: bestScore,
        index: bestIndex,
        metrics: validResults[bestIndex].metrics,
        rankingDiagnostics
    };
}

/**
 * Findet beste Parameter unter Einhaltung von Constraints
 * @param {Array} sweepResults - Sweep-Ergebnisse
 * @param {string} objectiveMetricKey - Zu optimierende Metrik
 * @param {boolean} maximize - Maximieren oder minimieren
 * @param {Array} constraints - Array von {metricKey, operator, value} z.B. [{metricKey: 'successProbFloor', operator: '>=', value: 95}]
 * @returns {Object} Beste Parameter die Constraints erfüllen
 */
export function findBestParametersWithConstraints(sweepResults, objectiveMetricKey, maximize, constraints) {
    if (!sweepResults || sweepResults.length === 0) {
        return null;
    }

    // Filtere Ergebnisse die alle Constraints erfüllen
    const constraintMetricKeys = constraints.map(constraint => constraint.metricKey);
    const feasible = sweepResults.filter(result => {
        if (!isValidSweepResult(result, [objectiveMetricKey, ...constraintMetricKeys])) return false;
        for (const constraint of constraints) {
            const value = readSweepMetricValue(result, constraint.metricKey);
            const target = Number(constraint.value);
            if (!Number.isFinite(target)) return false;

            switch (constraint.operator) {
                case '>=':
                    if (value < target) return false;
                    break;
                case '>':
                    if (value <= target) return false;
                    break;
                case '<=':
                    if (value > target) return false;
                    break;
                case '<':
                    if (value >= target) return false;
                    break;
                case '==':
                case '=':
                    if (Math.abs(value - target) > 0.001) return false;
                    break;
                default:
                    return false;
            }
        }
        return true;
    });

    if (feasible.length === 0) {
        return {
            params: null,
            error: 'Keine Parameterkombination erfüllt alle Constraints',
            feasibleCount: 0,
            totalCount: sweepResults.length
        };
    }

    // Finde bestes unter den feasible
    let bestIndex = 0;
    let bestValue = readSweepMetricValue(feasible[0], objectiveMetricKey);

    for (let i = 1; i < feasible.length; i++) {
        const value = readSweepMetricValue(feasible[i], objectiveMetricKey);

        if (maximize && value > bestValue) {
            bestValue = value;
            bestIndex = i;
        } else if (!maximize && value < bestValue) {
            bestValue = value;
            bestIndex = i;
        }
    }

    const tiedBestResults = feasible.filter(result => (
        metricValuesEqual(readSweepMetricValue(result, objectiveMetricKey), bestValue)
    ));
    const rankingDiagnostics = {
        status: tiedBestResults.length > 1 ? 'indeterminate_tie' : 'unique_point_estimate',
        tiedBestCount: tiedBestResults.length,
        totalValidCount: feasible.length,
        metricKey: objectiveMetricKey
    };
    if (tiedBestResults.length > 1) {
        return {
            params: null,
            error: `${tiedBestResults.length} zulässige Kombinationen besitzen denselben führenden Punktschätzer`,
            metricValue: bestValue,
            metrics: tiedBestResults[0].metrics,
            feasibleCount: feasible.length,
            totalCount: sweepResults.length,
            rankingDiagnostics
        };
    }

    return {
        params: feasible[bestIndex].params,
        metricValue: bestValue,
        metrics: feasible[bestIndex].metrics,
        feasibleCount: feasible.length,
        totalCount: sweepResults.length,
        rankingDiagnostics
    };
}

/**
 * Zeigt Multi-Objective Optimization Ergebnisse
 * @param {Array} objectives - Objectives mit {metricKey, weight, maximize}
 */
export function displayMultiObjectiveOptimization(objectives) {
    if (!window.sweepResults || window.sweepResults.length === 0) {
        alert('Bitte führen Sie zuerst einen Parameter Sweep durch.');
        return null;
    }

    const result = findBestParametersMultiObjective(window.sweepResults, objectives);

    if (!result) {
        alert(hasLegacySweepMetricShapes(window.sweepResults)
            ? 'Die Sweep-Ergebnisse verwenden einen veralteten oder unversionierten Ergebnisvertrag. Bitte führen Sie den Sweep neu aus.'
            : 'Fehler bei der Multi-Objective-Optimierung.');
        return null;
    }
    if (!result.params) {
        const container = document.getElementById('optimizationResults');
        if (container) {
            container.innerHTML = `<div style="padding:15px; background:#fff3e0; border:2px solid #ff9800; border-radius:8px;"><h4>Keine eindeutig führende Kombination</h4>${renderComparisonNotice(result.metrics, result.rankingDiagnostics)}<p>Mehrere Kombinationen besitzen denselben gewichteten Punktschätzer. Es werden keine Parameter zur Übernahme angeboten.</p></div>`;
            container.style.display = 'block';
        }
        return result;
    }

    const metricLabels = {
        successProbFloor: 'Success Prob Floor',
        p10EndWealth: 'P10 End Wealth',
        p25EndWealth: 'P25 End Wealth',
        medianEndWealth: 'Median End Wealth',
        p75EndWealth: 'P75 End Wealth',
        meanEndWealth: 'Mean End Wealth',
        maxEndWealth: 'Max End Wealth',
        worst5Drawdown: 'Worst 5% Drawdown',
        minRunwayObserved: 'Min Runway Observed'
    };

    const paramLabels = {
        liquidityRunwayYears: 'Liquiditäts-Runway',
        goldRebalancingBand: 'Gold-Rebal Band',
        maxSkimPct: 'Max Skim %',
        maxBearRefillPct: 'Max Bear Refill %',
        goldTargetPct: 'Gold Target %',
        horizonYears: 'VPW Horizon',
        survivalQuantile: 'VPW Quantile',
        goGoMultiplier: 'VPW Go-Go Mult'
    };

    let html = '<div style="padding: 15px; background-color: #fff3e0; border-radius: 8px; border: 2px solid #ff9800;">';
    html += '<h4 style="margin-top: 0; color: #e65100;">Multi-Objective Parametervergleich</h4>';
    html += renderComparisonNotice(result.metrics, result.rankingDiagnostics);
    html += '<h5>Objectives:</h5>';
    html += '<ul>';
    for (const obj of objectives) {
        const dir = obj.maximize ? '↑ Maximize' : '↓ Minimize';
        html += `<li><strong>${metricLabels[obj.metricKey] || obj.metricKey}</strong> - ${dir} (Gewicht: ${obj.weight})</li>`;
    }
    html += '</ul>';
    html += `<p><strong>Gewichteter Score:</strong> ${formatFixed(result.score, 3)}</p>`;
    html += '<h5>Im Vergleich führende Parameter:</h5>';
    html += '<table style="width: 100%; border-collapse: collapse;">';

    for (const [key, value] of Object.entries(result.params)) {
        html += `<tr style="border-bottom: 1px solid #ddd;">`;
        html += `<td style="padding: 5px;"><strong>${paramLabels[key] || key}:</strong></td>`;
        html += `<td style="padding: 5px; text-align: right;">${value}</td>`;
        html += `</tr>`;
    }

    html += '</table>';
    html += '<div style="margin-top: 15px;">';
    html += '<button id="applyMultiObjectiveParams" style="padding: 10px 20px; background-color: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">📋 Parameter übernehmen</button>';
    html += '</div>';
    html += '</div>';

    const container = document.getElementById('optimizationResults');
    if (container) {
        container.innerHTML = html;
        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        document.getElementById('applyMultiObjectiveParams').addEventListener('click', () => {
            applyParametersToForm(result.params);
            alert('Die im experimentellen Multi-Objective-Vergleich führenden Parameter wurden übernommen.');
        });
    }

    return result;
}

/**
 * Zeigt Constraint-Based Optimization Ergebnisse
 * @param {string} objectiveMetricKey - Zu optimierende Metrik
 * @param {boolean} maximize - Maximieren
 * @param {Array} constraints - Constraints
 */
export function displayConstraintBasedOptimization(objectiveMetricKey, maximize, constraints) {
    if (!window.sweepResults || window.sweepResults.length === 0) {
        alert('Bitte führen Sie zuerst einen Parameter Sweep durch.');
        return null;
    }

    const result = findBestParametersWithConstraints(window.sweepResults, objectiveMetricKey, maximize, constraints);

    if (!result || !result.params) {
        const errorMessage = !result && hasLegacySweepMetricShapes(window.sweepResults)
            ? 'Die Sweep-Ergebnisse verwenden einen veralteten oder unversionierten Ergebnisvertrag. Bitte führen Sie den Sweep neu aus.'
            : (result?.error || 'Unbekannter Fehler');
        alert(`Constraint-Based Optimierung fehlgeschlagen:\n\n${errorMessage}\n\nFeasible: ${result?.feasibleCount || 0} von ${result?.totalCount || 0}`);
        return null;
    }

    const metricLabels = {
        successProbFloor: 'Success Prob Floor',
        p10EndWealth: 'P10 End Wealth',
        p25EndWealth: 'P25 End Wealth',
        medianEndWealth: 'Median End Wealth',
        p75EndWealth: 'P75 End Wealth',
        meanEndWealth: 'Mean End Wealth',
        maxEndWealth: 'Max End Wealth',
        worst5Drawdown: 'Worst 5% Drawdown',
        minRunwayObserved: 'Min Runway Observed'
    };

    const paramLabels = {
        liquidityRunwayYears: 'Liquiditäts-Runway',
        goldRebalancingBand: 'Gold-Rebal Band',
        maxSkimPct: 'Max Skim %',
        maxBearRefillPct: 'Max Bear Refill %',
        goldTargetPct: 'Gold Target %',
        horizonYears: 'VPW Horizon',
        survivalQuantile: 'VPW Quantile',
        goGoMultiplier: 'VPW Go-Go Mult'
    };

    let html = '<div style="padding: 15px; background-color: #e1f5fe; border-radius: 8px; border: 2px solid #03a9f4;">';
    html += '<h4 style="margin-top: 0; color: #01579b;">Constraint-basierter Parametervergleich</h4>';
    html += renderComparisonNotice(result.metrics, result.rankingDiagnostics);
    html += `<p><strong>Verglichen nach:</strong> ${metricLabels[objectiveMetricKey] || objectiveMetricKey} (${maximize ? 'Maximize' : 'Minimize'})</p>`;
    html += '<h5>Constraints:</h5>';
    html += '<ul>';
    for (const c of constraints) {
        html += `<li><strong>${metricLabels[c.metricKey] || c.metricKey}</strong> ${c.operator} ${c.value}</li>`;
    }
    html += '</ul>';
    html += `<p><strong>Gefunden:</strong> ${result.feasibleCount} von ${result.totalCount} Kombinationen erfüllen alle Constraints</p>`;
    html += `<p><strong>Führender Punktschätzer:</strong> ${formatMetricValue(result.metricValue, objectiveMetricKey)}</p>`;
    html += '<h5>Im Vergleich führende Parameter:</h5>';
    html += '<table style="width: 100%; border-collapse: collapse;">';

    for (const [key, value] of Object.entries(result.params)) {
        html += `<tr style="border-bottom: 1px solid #ddd;">`;
        html += `<td style="padding: 5px;"><strong>${paramLabels[key] || key}:</strong></td>`;
        html += `<td style="padding: 5px; text-align: right;">${value}</td>`;
        html += `</tr>`;
    }

    html += '</table>';
    html += '<div style="margin-top: 15px;">';
    html += '<button id="applyConstraintParams" style="padding: 10px 20px; background-color: #03a9f4; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">📋 Parameter übernehmen</button>';
    html += '</div>';
    html += '</div>';

    const container = document.getElementById('optimizationResults');
    if (container) {
        container.innerHTML = html;
        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        document.getElementById('applyConstraintParams').addEventListener('click', () => {
            applyParametersToForm(result.params);
            alert('Die im experimentellen Constraint-Vergleich führenden Parameter wurden übernommen.');
        });
    }

    return result;
}
