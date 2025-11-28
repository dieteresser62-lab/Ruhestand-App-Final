"use strict";

/**
 * Erweiterte Visualisierungen für Parameter Sweep
 *
 * Features:
 * 1. Sensitivity Analysis - Zeigt wie stark jeder Parameter die Ergebnisse beeinflusst
 * 2. Pareto Frontier - Multi-objective optimization visualization
 * 3. Parameter Distribution Charts
 */

import { aggregateSweepMetrics } from './simulator-results.js';

/**
 * Berechnet Sensitivity für jeden Parameter
 * @param {Array} sweepResults - Sweep-Ergebnisse
 * @param {string} metricKey - Metrik zum Analysieren
 * @returns {Object} Sensitivity-Daten für jeden Parameter
 */
export function calculateSensitivity(sweepResults, metricKey) {
    if (!sweepResults || sweepResults.length === 0) return null;

    const paramRanges = window.sweepParamRanges;
    if (!paramRanges) return null;

    const sensitivity = {};

    // Für jeden Parameter
    for (const [paramKey, values] of Object.entries(paramRanges)) {
        if (values.length <= 1) {
            // Konstanter Parameter - keine Sensitivity
            sensitivity[paramKey] = {
                impact: 0,
                min: null,
                max: null,
                range: 0,
                normalized: 0
            };
            continue;
        }

        // Finde min/max Metrik-Werte für diesen Parameter
        const metricsByParamValue = {};
        for (const result of sweepResults) {
            const paramValue = result.params[paramKey];
            const metricValue = result.metrics[metricKey];

            if (!metricsByParamValue[paramValue]) {
                metricsByParamValue[paramValue] = [];
            }
            metricsByParamValue[paramValue].push(metricValue);
        }

        // Berechne Durchschnitt für jeden Parameter-Wert
        const avgByParamValue = {};
        for (const [paramValue, metricValues] of Object.entries(metricsByParamValue)) {
            avgByParamValue[paramValue] = metricValues.reduce((sum, val) => sum + val, 0) / metricValues.length;
        }

        const avgValues = Object.values(avgByParamValue);
        const minMetric = Math.min(...avgValues);
        const maxMetric = Math.max(...avgValues);
        const range = maxMetric - minMetric;

        sensitivity[paramKey] = {
            impact: range,
            min: minMetric,
            max: maxMetric,
            range: range,
            avgByParamValue: avgByParamValue
        };
    }

    // Normalisiere Sensitivity (0-100)
    const maxImpact = Math.max(...Object.values(sensitivity).map(s => s.impact));
    if (maxImpact > 0) {
        for (const key of Object.keys(sensitivity)) {
            sensitivity[key].normalized = (sensitivity[key].impact / maxImpact) * 100;
        }
    }

    return sensitivity;
}

/**
 * Rendert ein Sensitivity-Analysis Balkendiagramm
 * @param {Object} sensitivity - Sensitivity-Daten
 * @param {string} metricKey - Metrik-Name
 * @returns {string} HTML für das Diagramm
 */
export function renderSensitivityChart(sensitivity, metricKey) {
    if (!sensitivity) return '<p>Keine Sensitivity-Daten verfügbar.</p>';

    const paramLabels = {
        runwayMin: 'Runway Min',
        runwayTarget: 'Runway Target',
        targetEq: 'Target Eq',
        rebalBand: 'Rebal Band',
        maxSkimPct: 'Max Skim %',
        maxBearRefillPct: 'Max Bear Refill %',
        goldTargetPct: 'Gold Target %'
    };

    // Sortiere Parameter nach Impact (höchster zuerst)
    const sorted = Object.entries(sensitivity)
        .filter(([key, data]) => data.impact > 0)
        .sort(([, a], [, b]) => b.normalized - a.normalized);

    if (sorted.length === 0) {
        return '<p>Alle Parameter sind konstant - keine Sensitivity-Analyse möglich.</p>';
    }

    let html = '<div style="padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">';
    html += '<h4 style="margin-top: 0;">📊 Parameter Sensitivity Analysis</h4>';
    html += `<p style="color: #666; font-size: 0.9rem;">Zeigt wie stark jeder Parameter die Metrik "${metricKey}" beeinflusst</p>`;
    html += '<div style="margin-top: 20px;">';

    const maxWidth = 400;

    for (const [paramKey, data] of sorted) {
        const barWidth = (data.normalized / 100) * maxWidth;
        const label = paramLabels[paramKey] || paramKey;

        html += '<div style="margin-bottom: 15px;">';
        html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">`;
        html += `<strong>${label}</strong>`;
        html += `<span style="color: #666; font-size: 0.85rem;">${data.normalized.toFixed(0)}% Impact</span>`;
        html += `</div>`;
        html += `<div style="background: #e0e0e0; height: 24px; border-radius: 4px; position: relative;">`;
        html += `<div style="background: linear-gradient(90deg, #4caf50, #8bc34a); height: 100%; width: ${barWidth}px; border-radius: 4px; transition: width 0.3s;"></div>`;
        html += `</div>`;
        html += `<div style="font-size: 0.8rem; color: #999; margin-top: 2px;">`;
        html += `Range: ${data.min.toFixed(1)} → ${data.max.toFixed(1)} (Δ ${data.range.toFixed(1)})`;
        html += `</div>`;
        html += '</div>';
    }

    html += '</div>';
    html += '</div>';

    return html;
}

/**
 * Berechnet Pareto-Frontier für zwei Metriken
 * @param {Array} sweepResults - Sweep-Ergebnisse
 * @param {string} metricKey1 - Erste Metrik
 * @param {string} metricKey2 - Zweite Metrik
 * @param {boolean} maximize1 - Maximiere erste Metrik?
 * @param {boolean} maximize2 - Maximiere zweite Metrik?
 * @returns {Array} Pareto-optimale Punkte
 */
export function calculateParetoFrontier(sweepResults, metricKey1, metricKey2, maximize1 = true, maximize2 = true) {
    if (!sweepResults || sweepResults.length === 0) return [];

    const paretoPoints = [];

    for (let i = 0; i < sweepResults.length; i++) {
        const point = sweepResults[i];
        const m1 = point.metrics[metricKey1];
        const m2 = point.metrics[metricKey2];

        let isDominated = false;

        // Prüfe ob dieser Punkt von einem anderen dominiert wird
        for (let j = 0; j < sweepResults.length; j++) {
            if (i === j) continue;

            const other = sweepResults[j];
            const om1 = other.metrics[metricKey1];
            const om2 = other.metrics[metricKey2];

            // Prüfe Dominanz basierend auf Maximierung/Minimierung
            const better1 = maximize1 ? (om1 > m1) : (om1 < m1);
            const better2 = maximize2 ? (om2 > m2) : (om2 < m2);
            const equal1 = om1 === m1;
            const equal2 = om2 === m2;

            // Andere Punkt dominiert wenn er in mindestens einer Dimension besser und in keiner schlechter ist
            if ((better1 || equal1) && (better2 || equal2) && (better1 || better2)) {
                isDominated = true;
                break;
            }
        }

        if (!isDominated) {
            paretoPoints.push({
                ...point,
                metric1: m1,
                metric2: m2,
                index: i
            });
        }
    }

    // Sortiere Pareto-Punkte für bessere Visualisierung
    paretoPoints.sort((a, b) => a.metric1 - b.metric1);

    return paretoPoints;
}

/**
 * Rendert Pareto-Frontier als Scatter-Plot (SVG)
 * @param {Array} paretoPoints - Pareto-optimale Punkte
 * @param {Array} allPoints - Alle Punkte
 * @param {string} metricKey1 - X-Achsen Metrik
 * @param {string} metricKey2 - Y-Achsen Metrik
 * @returns {string} SVG HTML
 */
export function renderParetoFrontier(paretoPoints, allPoints, metricKey1, metricKey2) {
    const width = 600;
    const height = 400;
    const margin = { top: 40, right: 40, bottom: 60, left: 80 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const metricLabels = {
        successProbFloor: 'Success Prob Floor (%)',
        p10EndWealth: 'P10 End Wealth (€)',
        p25EndWealth: 'P25 End Wealth (€)',
        medianEndWealth: 'Median End Wealth (€)',
        p75EndWealth: 'P75 End Wealth (€)',
        meanEndWealth: 'Mean End Wealth (€)',
        maxEndWealth: 'Max End Wealth (€)',
        worst5Drawdown: 'Worst 5% Drawdown (%)',
        minRunwayObserved: 'Min Runway Observed'
    };

    // Extrahiere Metrik-Werte
    const m1Values = allPoints.map(p => p.metrics[metricKey1]);
    const m2Values = allPoints.map(p => p.metrics[metricKey2]);

    const minX = Math.min(...m1Values);
    const maxX = Math.max(...m1Values);
    const minY = Math.min(...m2Values);
    const maxY = Math.max(...m2Values);

    // Skalierung
    const scaleX = (val) => margin.left + ((val - minX) / (maxX - minX)) * plotWidth;
    const scaleY = (val) => height - margin.bottom - ((val - minY) / (maxY - minY)) * plotHeight;

    let svg = `<svg width="${width}" height="${height}" style="background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">`;

    // Titel
    svg += `<text x="${width / 2}" y="20" text-anchor="middle" style="font-size: 16px; font-weight: bold;">Pareto Frontier</text>`;

    // Achsen
    svg += `<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="#333" stroke-width="2"/>`;
    svg += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="#333" stroke-width="2"/>`;

    // Achsenbeschriftungen
    svg += `<text x="${width / 2}" y="${height - 10}" text-anchor="middle" style="font-size: 12px;">${metricLabels[metricKey1] || metricKey1}</text>`;
    svg += `<text x="15" y="${height / 2}" text-anchor="middle" transform="rotate(-90, 15, ${height / 2})" style="font-size: 12px;">${metricLabels[metricKey2] || metricKey2}</text>`;

    // Alle Punkte (grau)
    for (const point of allPoints) {
        const x = scaleX(point.metrics[metricKey1]);
        const y = scaleY(point.metrics[metricKey2]);
        svg += `<circle cx="${x}" cy="${y}" r="4" fill="#ccc" opacity="0.6"/>`;
    }

    // Pareto-Punkte (grün, größer)
    for (const point of paretoPoints) {
        const x = scaleX(point.metric1);
        const y = scaleY(point.metric2);
        svg += `<circle cx="${x}" cy="${y}" r="6" fill="#4caf50" stroke="#2e7d32" stroke-width="2"/>`;
    }

    // Verbinde Pareto-Punkte
    if (paretoPoints.length > 1) {
        let pathData = `M ${scaleX(paretoPoints[0].metric1)} ${scaleY(paretoPoints[0].metric2)}`;
        for (let i = 1; i < paretoPoints.length; i++) {
            pathData += ` L ${scaleX(paretoPoints[i].metric1)} ${scaleY(paretoPoints[i].metric2)}`;
        }
        svg += `<path d="${pathData}" fill="none" stroke="#4caf50" stroke-width="2" stroke-dasharray="5,5"/>`;
    }

    svg += '</svg>';

    return svg;
}

/**
 * Zeigt Sensitivity Analysis in der UI
 */
export function displaySensitivityAnalysis() {
    if (!window.sweepResults || window.sweepResults.length === 0) {
        alert('Bitte führen Sie zuerst einen Parameter Sweep durch.');
        return;
    }

    const metricKey = document.getElementById('sweepMetric').value;
    const sensitivity = calculateSensitivity(window.sweepResults, metricKey);

    if (!sensitivity) {
        alert('Fehler beim Berechnen der Sensitivity-Analyse.');
        return;
    }

    const html = renderSensitivityChart(sensitivity, metricKey);

    const container = document.getElementById('sensitivityResults');
    if (container) {
        container.innerHTML = html;
        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Zeigt Pareto-Frontier in der UI
 */
export function displayParetoFrontier() {
    if (!window.sweepResults || window.sweepResults.length === 0) {
        alert('Bitte führen Sie zuerst einen Parameter Sweep durch.');
        return;
    }

    // Verwende gespeicherte Metriken aus Dialog
    const metric1 = window.paretoMetrics?.metric1 || 'medianEndWealth';
    const metric2 = window.paretoMetrics?.metric2 || 'worst5Drawdown';

    // Import shouldMaximizeMetric
    const maximize1 = shouldMaximizeMetricLocal(metric1);
    const maximize2 = shouldMaximizeMetricLocal(metric2);

    const paretoPoints = calculateParetoFrontier(window.sweepResults, metric1, metric2, maximize1, maximize2);
    const svg = renderParetoFrontier(paretoPoints, window.sweepResults, metric1, metric2);

    let html = '<div style="padding: 20px;">';
    html += '<h4>Pareto Frontier</h4>';
    html += `<p style="color: #666; font-size: 0.9rem;">Grüne Punkte = Pareto-optimal (nicht von anderen dominiert)</p>`;
    html += `<p style="color: #666; font-size: 0.9rem;">Gefunden: ${paretoPoints.length} von ${window.sweepResults.length} Punkten sind Pareto-optimal</p>`;
    html += svg;
    html += '</div>';

    const container = document.getElementById('paretoResults');
    if (container) {
        container.innerHTML = html;
        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Helper function (lokale Kopie von shouldMaximizeMetric)
function shouldMaximizeMetricLocal(metricKey) {
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
    return maximizeMetrics.includes(metricKey);
}
