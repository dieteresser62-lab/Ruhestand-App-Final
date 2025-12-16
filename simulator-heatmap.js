"use strict";

import { lerp } from './simulator-utils.js';

// Schwellenwerte für die adaptive Anzeige der Heatmap
export const HEATMAP_META_MIN_TIMESHARE_ABOVE_45 = 0.02; // 2 % der Zeit mit Quote > 4,5 %
export const HEATMAP_RED_SHARE_THRESHOLD = 0.03; // 3 % Rot (>4.5%) in mindestens einer Spalte
export const HEATMAP_GREEN_SHARE_MIN = 0.50; // Grün (0–3 %) fällt in mind. einer Spalte unter 50 %

/**
 * CSS-Styles für die Heatmap
 */
export const HEATMAP_V4_STYLE = `
<style id="heatmap-v4-style">
    .heatmap-v4-svg {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 11px;
        user-select: none;
    }
    .heatmap-v4-svg .axis-label { font-weight: 600; fill: var(--primary-color, #2c3e50); }
    .heatmap-v4-svg .tick-label, .heatmap-v4-svg .bin-label { fill: #333; }
    .heatmap-v4-svg .bin-label { text-anchor: end; dominant-baseline: middle; }
    .heatmap-v4-svg .year-label, .heatmap-v4-svg .col-header { text-anchor: middle; }
    .heatmap-v4-svg .col-header { font-weight: 600; }
    .heatmap-v4-svg .heatmap-cell { stroke: rgba(255,255,255,0.4); stroke-width: 1px; }
    .heatmap-v4-svg .cell-label-bg {
        rx: 3;
        stroke: rgba(0,0,0,0.25);
        stroke-width: 0.5px;
    }
    .heatmap-v4-svg .cell-label-text {
        text-anchor: middle;
        dominant-baseline: middle;
        font-size: 10.5px;
        font-weight: 600;
        pointer-events: none;
    }
    .heatmap-v4-svg .cell-dot { pointer-events: none; }
    .heatmap-v4-svg .critical-line { stroke: #e74c3c; stroke-width: 1.5; stroke-dasharray: 4, 3; }
    .heatmap-v4-svg .critical-overlay { fill: rgba(231, 76, 60, 0.12); pointer-events: none; }
    .heatmap-v4-svg .legend-text { font-size: 10px; fill: var(--primary-color, #2c3e50); }
    .heatmap-v4-svg .footer-text { font-size: 10px; fill: #555; }
    .heatmap-v4-svg .footer-text strong { font-weight: 600; fill: #111; }
</style>
`;

/**
 * Viridis-Farbpalette
 */
export function viridis(t) {
    t = Math.min(1, Math.max(0, t));
    const C = [
        [68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142],
        [38, 130, 142], [31, 158, 137], [53, 183, 121], [109, 205, 89],
        [180, 222, 44], [253, 231, 37]
    ];
    const i = Math.floor(t * (C.length - 1));
    const f = t * (C.length - 1) - i;
    if (f === 0) return `rgb(${C[i][0]}, ${C[i][1]}, ${C[i][2]})`;
    const c1 = C[i], c2 = C[i + 1];
    const r = Math.round(c1[0] + f * (c2[0] - c1[0]));
    const g = Math.round(c1[1] + f * (c2[1] - c1[1]));
    const b = Math.round(c1[2] + f * (c2[2] - c1[2]));
    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Parst RGB-String zu Array [r, g, b]
 */
function parseRgb(rgbString) {
    const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
}

/**
 * Berechnet relative Luminanz für Farbkontrast (WCAG)
 */
function relativeLuminance([r, g, b]) {
    const srgb = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/**
 * Wählt Textfarbe (schwarz oder weiß) basierend auf Hintergrundfarbe für ausreichenden Kontrast
 */
function pickTextColorForBg(rgb) {
    const lum = relativeLuminance(rgb);
    return lum > 0.5 ? '#000' : '#fff';
}

/**
 * Berechnet Statistiken für die Heatmap
 */
export function computeHeatmapStats(heat, bins, totalRuns) {
    if (!heat || heat.length === 0) {
        return {
            shares: [], globalP90: 0, perColP90: [], colSharesAbove45: [],
            shareYear1In_3_to_3_5: 0, shareYear1Above_5_5: 0, criticalRowIndex: bins ? bins.findIndex(b => b === 4.5) : -1
        };
    }

    const col0 = heat[0] || [];
    const sumCol0 = col0.reduce((a, b) => a + (Number(b) || 0), 0);
    const looksLikeShares = sumCol0 > 0 && sumCol0 < 1.000001;

    const shares = looksLikeShares
        ? heat.map(col => Array.from(col).map(Number))
        : heat.map(col => Array.from(col).map(count => (Number(count) || 0) / Math.max(1, totalRuns)));

    const quantileSimple = (arr, q) => {
        if (!arr || arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const pos = (sorted.length - 1) * q;
        const base = Math.floor(pos);
        const rest = pos - base;
        return sorted[base] + (rest * (sorted[base + 1] - sorted[base]) || 0);
    };

    const allSharesFlat = shares.flat().filter(s => s > 1e-6);

    const binIdx30 = bins.findIndex(b => b === 3.0);
    const binIdx55 = bins.findIndex(b => b === 5.5);
    const binIdx45 = bins.findIndex(b => b === 4.5);

    const shareYear1In_3_to_3_5 = (binIdx30 !== -1 && shares.length > 0 && shares[0]) ? (shares[0][binIdx30] || 0) : 0;

    let shareYear1Above_5_5 = 0;
    if (binIdx55 !== -1 && shares.length > 0 && shares[0]) {
        for (let i = binIdx55; i < shares[0].length; i++) shareYear1Above_5_5 += shares[0][i];
    }

    const colSharesAbove45 = shares.map(col => {
        let sum = 0;
        if (binIdx45 !== -1) {
            for (let i = binIdx45; i < col.length; i++) sum += col[i];
        }
        return sum;
    });

    const perColP90 = shares.map(col => quantileSimple(col.filter(s => s > 1e-6), 0.9));

    return {
        shares,
        globalP90: quantileSimple(allSharesFlat, 0.90),
        perColP90,
        colSharesAbove45,
        shareYear1In_3_to_3_5,
        shareYear1Above_5_5,
        criticalRowIndex: binIdx45
    };
}

/**
 * Löst den Profilschlüssel auf
 */
/**
 * Löst den Profilschlüssel auf
 * @param {string} raw - Der rohe Profil-Name/Key
 * @param {object} [engine] - Optionale Engine-Instanz (für Headless use). Fallback auf window.Ruhestandsmodell_v30
 */
export function resolveProfileKey(raw, engine) {
    const effectiveEngine = engine || (typeof window !== 'undefined' ? window.Ruhestandsmodell_v30 : null);
    if (!effectiveEngine?.CONFIG?.PROFIL_MAP) return raw;

    const keys = Object.keys(effectiveEngine.CONFIG.PROFIL_MAP || {});
    const norm = s => String(s || "").toLowerCase().replace(/[\s\-_]/g, "");
    const nraw = norm(raw);
    let hit = keys.find(k => norm(k) === nraw);
    if (hit) return hit;
    hit = keys.find(k => nraw.includes(norm(k)) || norm(k).includes(nraw));
    return hit || keys[0];
}

/**
 * Rendert die Heatmap als SVG
 */
export function renderHeatmapSVG(heat, bins, totalRuns, extraKPI = {}, options = {}) {
    if (!heat || heat.length === 0) return '';

    const computeLabelStyles = (cellColor) => {
        const lum = relativeLuminance(parseRgb(cellColor));
        if (lum > 0.6) {
            return { textFill: '#111', bgFill: 'rgba(255,255,255,0.7)', dotFill: 'rgba(0,0,0,0.4)' };
        } else {
            return { textFill: '#fff', bgFill: 'rgba(0,0,0,0.55)', dotFill: 'rgba(255,255,255,0.5)' };
        }
    };

    const opts = Object.assign({
        width: 980, height: 420, normalize: 'global',
        labelThresholdPct: 0.1,
        dotThresholdPct: 0.01,
        palette: 'viridis', showCriticalOverlay: true,
        criticalThreshold: 4.5, showLegend: true, showFooterStats: true
    }, options);

    const stats = computeHeatmapStats(heat, bins, totalRuns);
    const { shares, globalP90, perColP90, colSharesAbove45, criticalRowIndex } = stats;

    const margin = { top: 50, right: 90, bottom: 60, left: 70 };
    const numYears = heat.length;
    const numBins = heat[0].length;
    const chartHeight = opts.height - margin.top - margin.bottom;
    const chartWidth = opts.width - margin.left - margin.right;
    const cellHeight = chartHeight / numBins;
    const cellWidth = chartWidth / numYears;

    const paletteFn = opts.palette === 'viridis' ? viridis : (t) => `hsl(${lerp(t, 0, 1, 240, 0)}, 80%, 50%)`;

    let cellBackgrounds = '', cellOverlays = '', cellAnnotations = '';

    shares.forEach((yearData, yIdx) => {
        const colNormFactor = Math.max(1e-6, perColP90[yIdx] || 0);
        yearData.forEach((share, bIdx) => {
            const x = yIdx * cellWidth;
            const y = bIdx * cellHeight;
            const pct = share * 100;

            const normFactor = opts.normalize === 'global' ? globalP90 : colNormFactor;
            const t = Math.min(1, share / Math.max(1e-6, normFactor));
            const color = paletteFn(t);
            const { textFill, bgFill, dotFill } = computeLabelStyles(color);

            const tooltip = `Jahr ${yIdx + 1} | Entnahme: ${bins[bIdx].toFixed(1)}%-` +
                `${bins[bIdx + 1] < 100 ? bins[bIdx + 1].toFixed(1) : '∞'}% | ` +
                `Anteil: ${pct.toFixed(2)}% (${heat[yIdx][bIdx]} Läufe)`;

            cellBackgrounds += `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" fill="${color}" class="heatmap-cell"><title>${tooltip}</title></rect>`;

            if (opts.showCriticalOverlay && criticalRowIndex !== -1 && bIdx >= criticalRowIndex) {
                cellOverlays += `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" class="critical-overlay" />`;
            }

            const showText = (pct > 0) && (cellWidth >= 24 && cellHeight >= 16);
            const labelText = (pct <= 0) ? '0' : (pct < 0.1 ? '<0.1' : (pct < 1 ? pct.toFixed(1) : Math.round(pct)));

            if (showText) {
                cellAnnotations += `<rect x="${x + cellWidth / 2 - 15}" y="${y + cellHeight / 2 - 8}" width="30" height="16" fill="${bgFill}" class="cell-label-bg" />`;
                cellAnnotations += `<text x="${x + cellWidth / 2}" y="${y + cellHeight / 2}" fill="${textFill}" class="cell-label-text">${labelText}%</text>`;
            } else if (pct >= opts.dotThresholdPct) {
                cellAnnotations += `<circle cx="${x + cellWidth / 2}" cy="${y + cellHeight / 2}" r="1.5" fill="${dotFill}" class="cell-dot" />`;
            }
        });
    });

    const yAxisLabels = bins.slice(0, -1).map((bin, i) => `<text x="-8" y="${i * cellHeight + cellHeight / 2}" class="bin-label">${bin.toFixed(1)}%</text>`).join('');
    const xAxisLabels = [...Array(numYears).keys()].map(i => `<text x="${i * cellWidth + cellWidth / 2}" y="${chartHeight + 20}" class="year-label">${i + 1}</text>`).join('');
    const colHeaders = colSharesAbove45.map((share, i) => `<text x="${i * cellWidth + cellWidth / 2}" y="-18" class="col-header" fill="var(--danger-color, #c0392b)">${(share * 100).toFixed(1)}%</text>`).join('');

    let legend = '';
    if (opts.showLegend) {
        const legendHeight = chartHeight, legendWidth = 15;
        const stops = [0, 0.25, 0.5, 0.75, 1];
        const legendMaxVal = (opts.normalize === 'global' ? globalP90 : Math.max(...perColP90)) * 100;
        let gradientStops = stops.map(s => `<stop offset="${s * 100}%" stop-color="${paletteFn(s)}" />`).join('');
        let legendLabels = stops.map(s => `<text x="${chartWidth + 30 + legendWidth}" y="${legendHeight * (1 - s)}" dominant-baseline="middle" class="legend-text">${(s * legendMaxVal).toFixed(1)}%</text>`).join('');

        legend = `
            <g class="legend" transform="translate(${chartWidth + 25}, 0)">
                <defs><linearGradient id="heatmapGradV4" x1="0" y1="1" x2="0" y2="0">${gradientStops}</linearGradient></defs>
                <rect x="0" y="0" width="${legendWidth}" height="${legendHeight}" fill="url(#heatmapGradV4)"></rect>
                ${legendLabels}
            </g>`;
    }

    const criticalLine = (criticalRowIndex !== -1)
        ? `<line x1="0" y1="${criticalRowIndex * cellHeight}" x2="${chartWidth}" y2="${criticalRowIndex * cellHeight}" class="critical-line" />`
        : '';

    let footer = '';
    if (opts.showFooterStats) {
        const kpi1 = extraKPI.timeShareQuoteAbove45 !== undefined ? `${(extraKPI.timeShareQuoteAbove45 * 100).toFixed(1)}%` : 'N/A';
        const kpi2 = `${(stats.shareYear1In_3_to_3_5 * 100).toFixed(1)}%`;
        const kpi3 = `${(stats.shareYear1Above_5_5 * 100).toFixed(1)}%`;
        footer = `
            <g class="footer" transform="translate(0, ${opts.height - 25})">
                <text x="0" y="0" class="footer-text">
                    <tspan>Zeitanteil Quote > 4.5%:</tspan><tspan x="140" font-weight="600">${kpi1}</tspan>
                    <tspan x="280">Anteil Jahr-1 in 3.0-3.5%:</tspan><tspan x="440" font-weight="600">${kpi2}</tspan>
                    <tspan x="580">Anteil Jahr-1 > 5.5%:</tspan><tspan x="710" font-weight="600">${kpi3}</tspan>
                </text>
            </g>`;
    }

    return `
    <div id="heatmap-container" style="text-align:center;">
        <h4 style="text-align:center;">Verteilung der Entnahmeraten in den ersten 10 Jahren</h4>
        <svg class="heatmap-v4-svg" viewBox="0 0 ${opts.width} ${opts.height}">
            <defs>${HEATMAP_V4_STYLE}</defs>
            <g transform="translate(${margin.left}, ${margin.top})">
                <text x="${chartWidth / 2}" y="-35" text-anchor="middle" class="axis-label">Simulationsjahr</text>
                <text x="${chartWidth / 2}" y="-5" text-anchor="middle" class="axis-label" font-size="9" fill="var(--danger-color, #c0392b)">Anteil Läufe >4.5% Quote</text>
                <text transform="translate(-50, ${chartHeight / 2}) rotate(-90)" text-anchor="middle" class="axis-label">Entnahmerate</text>

                ${cellBackgrounds}
                ${cellOverlays}
                ${yAxisLabels}
                ${xAxisLabels}
                ${colHeaders}
                ${criticalLine}
                ${cellAnnotations}
                ${legend}
            </g>
            ${footer}
        </svg>
    </div>`;
}

/**
 * Rendert den Toggle für Worst-Run-Anzeige
 */
export function renderWorstRunToggle(hasCareWorst) {
    const careBtn = hasCareWorst
        ? `<button id="btnWorstCare" class="toggle-btn">Schlechtester Pflege-Lauf</button>`
        : '';

    const style = `
    <style>
      .worst-run-toggle { text-align: center; margin-bottom: 12px; display: flex; justify-content: center; gap: 10px; }
      .toggle-btn { padding: 6px 12px; font-size: 0.9rem; border: 1px solid var(--border-color); background-color: #f0f0f0; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
      .toggle-btn:hover { border-color: var(--secondary-color); }
      .toggle-btn.active { background-color: var(--secondary-color); color: white; border-color: var(--secondary-color); font-weight: bold; }
      .toggle-btn:disabled { background-color: #e0e0e0; cursor: not-allowed; color: #999; }
    </style>
  `;

    return `
    ${style}
    <div class="worst-run-toggle">
      <button id="btnWorstAll" class="toggle-btn active">Schlechtester Lauf (alle)</button>
      ${careBtn}
    </div>`;
}

/**
 * Rendert die Parameter-Sweep-Heatmap als SVG
 */
export function renderSweepHeatmapSVG(sweepResults, metricKey, xParam, yParam, xValues, yValues, options = {}) {
    if (!sweepResults || sweepResults.length === 0) return '<p>Keine Sweep-Ergebnisse vorhanden.</p>';

    try {

        const opts = Object.assign({
            width: 980, height: 500, showLegend: true
        }, options);

        const paramLabels = {
            runwayMin: 'Runway Min',
            runwayTarget: 'Runway Target',
            targetEq: 'Target Eq',
            rebalBand: 'Rebal Band',
            maxSkimPct: 'Max Skim %',
            maxBearRefillPct: 'Max Bear Refill %',
            goldTargetPct: 'Gold Target %'
        };

        const metricLabels = {
            successProbFloor: 'Success Prob Floor (%)',
            p10EndWealth: 'P10 End Wealth (€)',
            p25EndWealth: 'P25 End Wealth (€)',
            medianEndWealth: 'Median End Wealth (€)',
            p75EndWealth: 'P75 End Wealth (€)',
            meanEndWealth: 'Mean End Wealth (€)',
            maxEndWealth: 'Max End Wealth (€)',
            worst5Drawdown: 'Worst 5% Drawdown (%)',
            minRunwayObserved: 'Min Runway Observed (Monate)'
        };

        const margin = { top: 60, right: 120, bottom: 60, left: 80 };
        const chartWidth = opts.width - margin.left - margin.right;
        const chartHeight = opts.height - margin.top - margin.bottom;

        const cellWidth = chartWidth / xValues.length;
        const cellHeight = chartHeight / yValues.length;

        const heatmapData = new Map();
        for (const result of sweepResults) {
            const key = `${result.params[xParam]}_${result.params[yParam]}`;
            heatmapData.set(key, result.metrics[metricKey] || 0);
        }

        const allValues = Array.from(heatmapData.values());
        const minVal = Math.min(...allValues);
        const maxVal = Math.max(...allValues);
        const range = maxVal - minVal;

        const getColor = (value) => {
            if (range === 0) return viridis(0.5);
            const t = (value - minVal) / range;
            return viridis(t);
        };

        const formatValue = (value, metric) => {
            const wealthMetrics = ['p10EndWealth', 'p25EndWealth', 'medianEndWealth', 'p75EndWealth', 'meanEndWealth', 'maxEndWealth'];
            if (wealthMetrics.includes(metric)) {
                return `${(value / 1000).toFixed(0)}k €`;
            } else if (metric === 'successProbFloor' || metric === 'worst5Drawdown') {
                return `${value.toFixed(1)}%`;
            } else {
                return value.toFixed(1);
            }
        };

        let cellsHtml = '';
        for (let yi = 0; yi < yValues.length; yi++) {
            for (let xi = 0; xi < xValues.length; xi++) {
                const xVal = xValues[xi];
                const yVal = yValues[yValues.length - 1 - yi];
                const key = `${xVal}_${yVal}`;
                const value = heatmapData.get(key) || 0;

                const x = xi * cellWidth;
                const y = yi * cellHeight;
                const color = getColor(value);

                const result = sweepResults.find(r => r.params[xParam] === xVal && r.params[yParam] === yVal);
                const hasR2Warning = result && result.metrics && result.metrics.warningR2Varies;

                const tooltipLines = result ? [
                    `${paramLabels[xParam]}: ${xVal}`,
                    `${paramLabels[yParam]}: ${yVal}`,
                    '',
                    `Success Prob: ${result.metrics.successProbFloor.toFixed(1)}%`,
                    `P10 End Wealth: ${(result.metrics.p10EndWealth / 1000).toFixed(0)}k €`,
                    `Worst 5% DD: ${result.metrics.worst5Drawdown.toFixed(1)}%`,
                    `Min Runway: ${result.metrics.minRunwayObserved.toFixed(1)} Mo`,
                    hasR2Warning ? '\n⚠ Rente 2 variierte im Sweep' : ''
                ].filter(Boolean) : [`${paramLabels[xParam]}: ${xVal}`, `${paramLabels[yParam]}: ${yVal}`, 'Keine Daten'];

                const tooltip = tooltipLines.join('&#10;');

                // Füge gelben Rand hinzu bei R2-Warnung
                const strokeColor = hasR2Warning ? '#ffc107' : '#fff';
                const strokeWidth = hasR2Warning ? '3' : '1';
                cellsHtml += `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}"><title>${tooltip}</title></rect>`;

                if (cellWidth >= 40 && cellHeight >= 30) {
                    const textColor = pickTextColorForBg(parseRgb(color));
                    const yOffset = hasR2Warning ? -5 : 0;
                    cellsHtml += `<text x="${x + cellWidth / 2}" y="${y + cellHeight / 2 + yOffset}" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" font-size="11px" font-weight="600" pointer-events="none">${formatValue(value, metricKey)}</text>`;

                    // Warn-Symbol bei R2-Varianz
                    if (hasR2Warning) {
                        cellsHtml += `<text x="${x + cellWidth / 2}" y="${y + cellHeight / 2 + 10}" text-anchor="middle" dominant-baseline="middle" font-size="14px" pointer-events="none" title="Rente 2 variierte im Sweep">⚠</text>`;
                    }
                }
            }
        }

        const xAxisLabels = xValues.map((v, i) => `<text x="${i * cellWidth + cellWidth / 2}" y="${chartHeight + 20}" text-anchor="middle" class="tick-label">${v}</text>`).join('');
        const yAxisLabels = yValues.map((v, i) => `<text x="-8" y="${(yValues.length - 1 - i) * cellHeight + cellHeight / 2}" text-anchor="end" dominant-baseline="middle" class="tick-label">${v}</text>`).join('');

        let legend = '';
        if (opts.showLegend) {
            const legendHeight = chartHeight;
            const legendWidth = 15;
            const stops = [0, 0.25, 0.5, 0.75, 1];
            const gradientStops = stops.map(s => `<stop offset="${s * 100}%" stop-color="${viridis(s)}" />`).join('');

            const legendLabels = stops.map(s => {
                const val = minVal + s * range;
                return `<text x="${chartWidth + 35 + legendWidth}" y="${legendHeight * (1 - s)}" dominant-baseline="middle" class="legend-text">${formatValue(val, metricKey)}</text>`;
            }).join('');

            legend = `
            <g class="legend" transform="translate(${chartWidth + 30}, 0)">
                <defs><linearGradient id="sweepGradient" x1="0" y1="1" x2="0" y2="0">${gradientStops}</linearGradient></defs>
                <rect x="0" y="0" width="${legendWidth}" height="${legendHeight}" fill="url(#sweepGradient)"></rect>
                ${legendLabels}
            </g>`;
        }

        return `
        ${HEATMAP_V4_STYLE}
        <div style="text-align:center;">
            <h4>Parameter Sweep: ${metricLabels[metricKey] || metricKey}</h4>
            <svg class="heatmap-v4-svg" viewBox="0 0 ${opts.width} ${opts.height}">
                <g transform="translate(${margin.left}, ${margin.top})">
                    <text x="${chartWidth / 2}" y="-35" text-anchor="middle" class="axis-label">${paramLabels[xParam] || xParam}</text>
                    <text transform="translate(-60, ${chartHeight / 2}) rotate(-90)" text-anchor="middle" class="axis-label">${paramLabels[yParam] || yParam}</text>
                    ${cellsHtml}
                    ${xAxisLabels}
                    ${yAxisLabels}
                    ${legend}
                </g>
            </svg>
        </div>`;

    } catch (error) {
        console.error('Fehler beim Rendern der Sweep-Heatmap:', error);
        throw error;
    }
}
