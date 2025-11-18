"use strict";

// --- UI & UTILITIES ---
const formatCurrency = (value) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
window.formatCurrency = formatCurrency;
const formatCurrencyShortLog = (value) => {
  // --- KORRIGIERT: Robust gegen undefined/null/NaN gemacht ---
  if (value === 0) return "0 €";
  if (value == null || !isFinite(value)) return "—";
  const valAbs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (valAbs < 1000) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  }
  return `${sign}${Math.round(valAbs / 1000)}k €`;
};
const shortenText = (text) => {
    if (!text) return "";
    const map = {
        "Markt heiß gelaufen": "HEISS", "Stabiler Höchststand": "ATH",
        "Best. Erholung": "ERHOLUNG", "Erholung im Bärenmarkt": "REC_BÄR",
        "Junge Korrektur": "KORREKTUR", "Tiefer Bär": "BÄR",
        "Seitwärts Lang": "SEITWÄRTS"
    };
    for (const [key, value] of Object.entries(map)) {
        text = text.replace(key, value);
    }
    return text.replace("(Stagflation)", "(S)");
};
const shortenReasonText = (reason, szenario) => {
    const reasonMap = {
        'emergency': 'Notfall-Refill', 'min_runway': 'MinRW-Refill', 'target_gap': 'Puffer-Refill',
        'reinvest': 'Reinvest', 'rebalance_up': 'Rebal.(G+)', 'rebalance_down': 'Rebal.(G-)',
        'rebuild_gold': 'Gold-Wiederaufbau', 'shortfall': 'DECKUNGSLÜCKE', 'none': ''
    };
    const reasonText = reasonMap[reason] || '';
    const szenarioText = shortenText(szenario);
    let combinedText = szenarioText;
    if (reasonText && reasonText.length > 0 && reasonText !== 'none') {
        combinedText += ` / ${reasonText}`;
    }
    if (combinedText.includes('/')) {
        return combinedText.split('/')[1].trim();
    }
    return szenarioText;
};
const lerp = (x, x0, x1, y0, y1) => y0 + (Math.min(Math.max(x, x0), x1) - x0) * (y1 - y0) / (x1 - x0);

/**
 * Bestimmt den zu verwendenden CAPE-Wert.
 * Priorität: Jahresdaten > Benutzereingabe > historischer Zustand > 0.
 * @param {number} yearSpecificCape - CAPE aus dem aktuellen Jahres-Datensatz.
 * @param {number} inputCape - CAPE-Wert aus dem Formular.
 * @param {number} historicalCape - CAPE aus dem Marktstatus des Vorjahres.
 * @returns {number} Gültiger CAPE-Wert (>= 0).
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

// Globale Variable für Backtest-Log Re-Rendering
window.globalBacktestData = { rows: [], startJahr: null };

// Schwellenwerte für die adaptive Anzeige der Heatmap
// Meta-Gate: Globale Mindestanforderung, damit die Heatmap überhaupt Sinn hat
const HEATMAP_META_MIN_TIMESHARE_ABOVE_45 = 0.02; // 2 % der Zeit mit Quote > 4,5 %

// Feinsteuerung innerhalb der isHeatmapInformative()-Heuristik
const HEATMAP_RED_SHARE_THRESHOLD = 0.03; // 3 % Rot (>4.5%) in mindestens einer Spalte
const HEATMAP_GREEN_SHARE_MIN     = 0.50; // Grün (0–3 %) fällt in mind. einer Spalte unter 50 %

const sum = arr => arr.reduce((a, b) => a + b, 0);
const mean = arr => arr.length > 0 ? sum(arr) / arr.length : 0;
const stdDev = arr => {
    if (arr.length < 2) return 0;
    const mu = mean(arr);
    const diffArr = arr.map(a => (a - mu) ** 2);
    return Math.sqrt(sum(diffArr) / (arr.length -1));
};
const standardize = (arr) => { const mu = mean(arr); const sigma = stdDev(arr); return arr.map(x => sigma > 0 ? (x - mu) / sigma : 0); };
const correlation = (arr1, arr2) => { if (arr1.length !== arr2.length || arr1.length < 2) return 0; const len = arr1.length; const xy = [], x = [], y = [], x2 = [], y2 = []; for(let i=0; i<len; i++) { xy.push(arr1[i]*arr2[i]); x.push(arr1[i]); y.push(arr2[i]); x2.push(arr1[i]**2); y2.push(arr1[i]**2); } const num = len * sum(xy) - sum(x) * sum(y); const den = Math.sqrt((len*sum(x2) - sum(x)**2) * (len*sum(y2) - sum(y)**2)); return den > 0 ? num/den : 0; };

const HEATMAP_V4_STYLE = `
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
    /* --- Geänderte Styles für Labels --- */
    .heatmap-v4-svg .cell-label-bg { 
        rx: 3;
        stroke: rgba(0,0,0,0.25);
        stroke-width: 0.5px;
    }
    .heatmap-v4-svg .cell-label-text { 
        text-anchor: middle; 
        dominant-baseline: middle; 
        font-size: 10.5px; /* Größer als zuvor */
        font-weight: 600;    /* Fetter für bessere Lesbarkeit */
        pointer-events: none; 
    }
    .heatmap-v4-svg .cell-dot { pointer-events: none; }
    /* --- Ende der Änderungen --- */
    .heatmap-v4-svg .critical-line { stroke: #e74c3c; stroke-width: 1.5; stroke-dasharray: 4, 3; }
    .heatmap-v4-svg .critical-overlay { fill: rgba(231, 76, 60, 0.12); pointer-events: none; } /* Leichte Erhöhung der Deckkraft */
    .heatmap-v4-svg .legend-text { font-size: 10px; fill: var(--primary-color, #2c3e50); }
    .heatmap-v4-svg .footer-text { font-size: 10px; fill: #555; }
    .heatmap-v4-svg .footer-text strong { font-weight: 600; fill: #111; }
</style>
`;

function viridis(t) {
    t = Math.min(1, Math.max(0, t));
    const C = [ // Viridis LUT
        [68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142],
        [38, 130, 142], [31, 158, 137], [53, 183, 121], [109, 205, 89],
        [180, 222, 44], [253, 231, 37]
    ];
    const i = Math.floor(t * (C.length - 1));
    const f = t * (C.length - 1) - i;
    if (f === 0) return `rgb(${C[i][0]}, ${C[i][1]}, ${C[i][2]})`;
    const c1 = C[i], c2 = C[i+1];
    const r = Math.round(c1[0] + f * (c2[0] - c1[0]));
    const g = Math.round(c1[1] + f * (c2[1] - c1[1]));
    const b = Math.round(c1[2] + f * (c2[2] - c1[2]));
    return `rgb(${r}, ${g}, ${b})`;
}

function computeHeatmapStats(heat, bins, totalRuns) {
    if (!heat || heat.length === 0) {
        return {
            shares: [], globalP90: 0, perColP90: [], colSharesAbove45: [],
            shareYear1In_3_to_3_5: 0, shareYear1Above_5_5: 0, criticalRowIndex: bins ? bins.findIndex(b => b === 4.5) : -1
        };
    }

    // Erkennen, ob 'heat' bereits Anteile (Summe ≈ 1) oder Zählwerte (Counts) enthält.
    const col0 = heat[0] || [];
    const sumCol0 = col0.reduce((a, b) => a + (Number(b) || 0), 0);
    const looksLikeShares = sumCol0 > 0 && sumCol0 < 1.000001;

    // In 'shares' immer Anteile (0..1) bereitstellen
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

function resolveProfileKey(raw) {
  if (!Ruhestandsmodell_v30?.CONFIG?.PROFIL_MAP) return raw;
  const keys = Object.keys(Ruhestandsmodell_v30.CONFIG.PROFIL_MAP || {});
  const norm = s => String(s||"").toLowerCase().replace(/[\s\-_]/g, "");
  const nraw = norm(raw);
  let hit = keys.find(k => norm(k) === nraw);
  if (hit) return hit;
  hit = keys.find(k => nraw.includes(norm(k)) || norm(k).includes(nraw));
  return hit || keys[0];
}

function renderHeatmapSVG(heat, bins, totalRuns, extraKPI = {}, options = {}) {
    if (!heat || heat.length === 0) return '';

    // --- Interne Helfer zur Farbberechnung ---
    const parseRgb = (rgbString) => {
        const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
    };
    
    const relativeLuminance = ([r, g, b]) => {
        const srgb = [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    };

    const computeLabelStyles = (cellColor) => {
        const lum = relativeLuminance(parseRgb(cellColor));
        if (lum > 0.6) { // Helle Zelle
            return { textFill: '#111', bgFill: 'rgba(255,255,255,0.7)', dotFill: 'rgba(0,0,0,0.4)' };
        } else { // Dunkle Zelle
            return { textFill: '#fff', bgFill: 'rgba(0,0,0,0.55)', dotFill: 'rgba(255,255,255,0.5)' };
        }
    };

    // --- Optionen und Vorkalkulation ---
    const opts = Object.assign({
        width: 980, height: 420, normalize: 'global',
        labelThresholdPct: 0.1,  // Text schon ab 0,1 %
        dotThresholdPct: 0.01,   // Punkt schon ab 0,01 %
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
    
    const paletteFn = opts.palette === 'viridis' ? viridis : (t) => `hsl(${lerp(t,0,1,240,0)}, 80%, 50%)`;

    let cellBackgrounds = '', cellOverlays = '', cellAnnotations = ''; // Getrennte Layer für korrekte Z-Order

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
                            `${bins[bIdx+1] < 100 ? bins[bIdx+1].toFixed(1) : '∞'}% | ` +
                            `Anteil: ${pct.toFixed(2)}% (${heat[yIdx][bIdx]} Läufe)`;

            cellBackgrounds += `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" fill="${color}" class="heatmap-cell"><title>${tooltip}</title></rect>`;

            if (opts.showCriticalOverlay && criticalRowIndex !== -1 && bIdx >= criticalRowIndex) {
                cellOverlays += `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" class="critical-overlay" />`;
            }

            // --- Geänderte Logik für die Textanzeige ---
            const showText = (pct > 0) && (cellWidth >= 24 && cellHeight >= 16);
            const labelText = (pct <= 0) ? '0' : (pct < 0.1 ? '<0.1' : (pct < 1 ? pct.toFixed(1) : Math.round(pct)));
            
            if (showText) {
                cellAnnotations += `<rect x="${x + cellWidth/2 - 15}" y="${y + cellHeight/2 - 8}" width="30" height="16" fill="${bgFill}" class="cell-label-bg" />`;
                cellAnnotations += `<text x="${x + cellWidth/2}" y="${y + cellHeight/2}" fill="${textFill}" class="cell-label-text">${labelText}%</text>`;
            } else if (pct >= opts.dotThresholdPct) {
                cellAnnotations += `<circle cx="${x + cellWidth/2}" cy="${y + cellHeight/2}" r="1.5" fill="${dotFill}" class="cell-dot" />`;
            }
        });
    });
    
    // --- Restlicher SVG-Aufbau (unverändert) ---
    const yAxisLabels = bins.slice(0, -1).map((bin, i) => `<text x="-8" y="${i * cellHeight + cellHeight/2}" class="bin-label">${bin.toFixed(1)}%</text>`).join('');
    const xAxisLabels = [...Array(numYears).keys()].map(i => `<text x="${i * cellWidth + cellWidth/2}" y="${chartHeight + 20}" class="year-label">${i+1}</text>`).join('');
    const colHeaders = colSharesAbove45.map((share, i) => `<text x="${i * cellWidth + cellWidth/2}" y="-18" class="col-header" fill="var(--danger-color, #c0392b)">${(share*100).toFixed(1)}%</text>`).join('');
    
    let legend = '';
    if (opts.showLegend) {
        const legendHeight = chartHeight, legendWidth = 15;
        const stops = [0, 0.25, 0.5, 0.75, 1];
        const legendMaxVal = (opts.normalize === 'global' ? globalP90 : Math.max(...perColP90)) * 100;
        let gradientStops = stops.map(s => `<stop offset="${s*100}%" stop-color="${paletteFn(s)}" />`).join('');
        let legendLabels = stops.map(s => `<text x="${chartWidth + 30 + legendWidth}" y="${legendHeight * (1-s)}" dominant-baseline="middle" class="legend-text">${(s * legendMaxVal).toFixed(1)}%</text>`).join('');

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
                <text x="${chartWidth/2}" y="-35" text-anchor="middle" class="axis-label">Simulationsjahr</text>
                <text x="${chartWidth/2}" y="-5" text-anchor="middle" class="axis-label" font-size="9" fill="var(--danger-color, #c0392b)">Anteil Läufe >4.5% Quote</text>
                <text transform="translate(-50, ${chartHeight/2}) rotate(-90)" text-anchor="middle" class="axis-label">Entnahmerate</text>
                
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

function renderWorstRunToggle(hasCareWorst) {
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

  // Das div 'worst-run-toggle' wird direkt in den 'worst-controls' Container platziert
  return `
    ${style}
    <div class="worst-run-toggle">
      <button id="btnWorstAll" class="toggle-btn active">Schlechtester Lauf (alle)</button>
      ${careBtn}
    </div>`;
}

// --- DATA & CONFIG ---
/**
 * Altersabhängige Pflegegrade nach BARMER Pflegereport 2024 (Kapitel 2).
 * Die Prävalenzen wurden auf Jahresinzidenzen heruntergebrochen (Ø-Pflegedauer 4 Jahre)
 * und auf 5-Jahres-Buckets geglättet.
 */
const SUPPORTED_PFLEGE_GRADES = [1, 2, 3, 4, 5];
const PFLEGE_GRADE_LABELS = {
    1: 'Pflegegrad 1 – geringe Beeinträchtigung',
    2: 'Pflegegrad 2 – erhebliche Beeinträchtigung',
    3: 'Pflegegrad 3 – schwere Beeinträchtigung',
    4: 'Pflegegrad 4 – schwerste Beeinträchtigung',
    5: 'Pflegegrad 5 – besondere Anforderungen'
};
const PFLEGE_GRADE_PROBABILITIES = {
    65: { 1: 0.012, 2: 0.006, 3: 0.003, 4: 0.0015, 5: 0.0005 },
    70: { 1: 0.020, 2: 0.010, 3: 0.005, 4: 0.0025, 5: 0.0010 },
    75: { 1: 0.035, 2: 0.018, 3: 0.009, 4: 0.0045, 5: 0.0020 },
    80: { 1: 0.055, 2: 0.032, 3: 0.016, 4: 0.0075, 5: 0.0035 },
    85: { 1: 0.085, 2: 0.055, 3: 0.032, 4: 0.0150, 5: 0.0070 },
    90: { 1: 0.120, 2: 0.080, 3: 0.050, 4: 0.0280, 5: 0.0120 },
    95: { 1: 0.140, 2: 0.090, 3: 0.060, 4: 0.0350, 5: 0.0150 }
};
const CARE_GRADE_FIELD_IDS = SUPPORTED_PFLEGE_GRADES.flatMap(grade => [
    `pflegeStufe${grade}Zusatz`,
    `pflegeStufe${grade}FlexCut`
]);
const HISTORICAL_DATA = {
	1969: { msci_eur: 60.8, inflation_de: 1.9, zinssatz_de:6, lohn_de: 9.8, gold_eur_perf: -8.5},1970: { msci_eur: 60.9, inflation_de: 3.4, zinssatz_de: 7.5, lohn_de: 12.6, gold_eur_perf: 4.3 },1971: { msci_eur: 72.4, inflation_de: 5.3, zinssatz_de: 5, lohn_de: 10.5, gold_eur_perf: 19.8 },1972: { msci_eur: 88.4, inflation_de: 5.5, zinssatz_de: 4, lohn_de: 9.1, gold_eur_perf: 47.2 },1973: { msci_eur: 74.4, inflation_de: 7.1, zinssatz_de: 7, lohn_de: 10.2, gold_eur_perf: 68.5 },1974: { msci_eur: 53.6, inflation_de: 7, zinssatz_de: 6, lohn_de: 10.8, gold_eur_perf: 70.1 },1975: { msci_eur: 71, inflation_de: 6, zinssatz_de: 4.5, lohn_de: 7.2, gold_eur_perf: -25.8 },1976: { msci_eur: 72.6, inflation_de: 4.3, zinssatz_de: 3.5, lohn_de: 7.3, gold_eur_perf: -1.5 },1977: { msci_eur: 67.1, inflation_de: 3.7, zinssatz_de: 3, lohn_de: 7.1, gold_eur_perf: 22.4 },1978: { msci_eur: 77.7, inflation_de: 2.7, zinssatz_de: 3, lohn_de: 5.4, gold_eur_perf: 35.7 },1979: { msci_eur: 79.2, inflation_de: 4.1, zinssatz_de: 5, lohn_de: 6.2, gold_eur_perf: 126.3 },1980: { msci_eur: 97.8, inflation_de: 5.5, zinssatz_de: 8.5, lohn_de: 6.6, gold_eur_perf: -6.2 },1981: { msci_eur: 91.2, inflation_de: 6.3, zinssatz_de: 10.5, lohn_de: 4.8, gold_eur_perf: -20.8 },1982: { msci_eur: 90.7, inflation_de: 5.3, zinssatz_de: 7.5, lohn_de: 4.2, gold_eur_perf: 18.9 },1983: { msci_eur: 110.8, inflation_de: 3.3, zinssatz_de: 5.5, lohn_de: 3.7, gold_eur_perf: -18.9 },1984: { msci_eur: 114.5, inflation_de: 2.4, zinssatz_de: 5.5, lohn_de: 3.4, gold_eur_perf: -15.4 },1985: { msci_eur: 164.3, inflation_de: 2.2, zinssatz_de: 5.5, lohn_de: 3.7, gold_eur_perf: 12.7 },1986: { msci_eur: 206.5, inflation_de: -0.1, zinssatz_de: 4.5, lohn_de: 4.1, gold_eur_perf: 24.1 },1987: { msci_eur: 227.1, inflation_de: 0.2, zinssatz_de: 3.5, lohn_de: 3.2, gold_eur_perf: 1.8 },1988: { msci_eur: 274.6, inflation_de: 1.3, zinssatz_de: 4, lohn_de: 3.8, gold_eur_perf: -12.4 },1989: { msci_eur: 326.8, inflation_de: 2.8, zinssatz_de: 7, lohn_de: 3.9, gold_eur_perf: -2.4 },1990: { msci_eur: 274, inflation_de: 2.7, zinssatz_de: 8, lohn_de: 5.8, gold_eur_perf: -7.8 },1991: { msci_eur: 317.9, inflation_de: 3.5, zinssatz_de: 8.5, lohn_de: 6.7, gold_eur_perf: -6.1 },1992: { msci_eur: 300, inflation_de: 5.1, zinssatz_de: 9.5, lohn_de: 5.7, gold_eur_perf: -5.8 },1993: { msci_eur: 376.1, inflation_de: 4.5, zinssatz_de: 7.25, lohn_de: 3.3, gold_eur_perf: 20.1 },1994: { msci_eur: 382.7, inflation_de: 2.7, zinssatz_de: 5, lohn_de: 2.4, gold_eur_perf: -2.3 },1995: { msci_eur: 450.4, inflation_de: 1.7, zinssatz_de: 4, lohn_de: 3.5, gold_eur_perf: 0.6 },1996: { msci_eur: 505.7, inflation_de: 1.4, zinssatz_de: 3, lohn_de: 2.2, gold_eur_perf: -6.9 },1997: { msci_eur: 590, inflation_de: 1.9, zinssatz_de: 3, lohn_de: 1.9, gold_eur_perf: -20.7 },1998: { msci_eur: 758.3, inflation_de: 0.9, zinssatz_de: 3, lohn_de: 2.8, gold_eur_perf: 0.9 },1999: { msci_eur: 958.4, inflation_de: 0.6, zinssatz_de: 2.5, lohn_de: 2.7, gold_eur_perf: -0.6 },
    2000: { msci_eur: 823.1, inflation_de: 1.4, zinssatz_de: 4.25, lohn_de: 2.5, gold_eur_perf: -2.7 },2001: { msci_eur: 675.2, inflation_de: 2.1, zinssatz_de: 3.75, lohn_de: 1.9, gold_eur_perf: 4.3 },2002: { msci_eur: 462.8, inflation_de: 1.3, zinssatz_de: 2.75, lohn_de: 2.1, gold_eur_perf: 19.4 },2003: { msci_eur: 511, inflation_de: 1, zinssatz_de: 2, lohn_de: 1.2, gold_eur_perf: 11.7 },2004: { msci_eur: 565.6, inflation_de: 1.7, zinssatz_de: 2, lohn_de: 1.1, gold_eur_perf: 2.2 },2005: { msci_eur: 724, inflation_de: 1.5, zinssatz_de: 2.1, lohn_de: 0.8, gold_eur_perf: 22.3 },2006: { msci_eur: 825, inflation_de: 1.8, zinssatz_de: 3, lohn_de: 1.6, gold_eur_perf: 17.3 },2007: { msci_eur: 842.2, inflation_de: 2.3, zinssatz_de: 4, lohn_de: 2.8, gold_eur_perf: 2.1 },2008: { msci_eur: 462.6, inflation_de: 2.8, zinssatz_de: 3.25, lohn_de: 3.4, gold_eur_perf: 2.7 },2009: { msci_eur: 609.4, inflation_de: 0.2, zinssatz_de: 1, lohn_de: 0.8, gold_eur_perf: 17.2 },2010: { msci_eur: 687.9, inflation_de: 1.1, zinssatz_de: 1, lohn_de: 2.3, gold_eur_perf: 34.9 },2011: { msci_eur: 634.3, inflation_de: 2.5, zinssatz_de: 1.25, lohn_de: 3.9, gold_eur_perf: 7.6 },2012: { msci_eur: 726.6, inflation_de: 2.1, zinssatz_de: 0.75, lohn_de: 2.9, gold_eur_perf: 4 },2013: { msci_eur: 898, inflation_de: 1.6, zinssatz_de: 0.25, lohn_de: 2.4, gold_eur_perf: -22.8 },2014: { msci_eur: 1062.5, inflation_de: 0.9, zinssatz_de: 0.05, lohn_de: 2.8, gold_eur_perf: -0.6 },2015: { msci_eur: 1159.2, inflation_de: 0.7, zinssatz_de: 0.05, lohn_de: 2.9, gold_eur_perf: -10 },2016: { msci_eur: 1248, inflation_de: 0.4, zinssatz_de: 0, lohn_de: 2.5, gold_eur_perf: 11.7 },2017: { msci_eur: 1329.8, inflation_de: 1.7, zinssatz_de: 0, lohn_de: 2.6, gold_eur_perf: -0.4 },2018: { msci_eur: 1268.4, inflation_de: 1.9, zinssatz_de: 0, lohn_de: 3.1, gold_eur_perf: -4.3 },2019: { msci_eur: 1619.5, inflation_de: 1.4, zinssatz_de: 0, lohn_de: 2.8, gold_eur_perf: 19.4 },2020: { msci_eur: 1706.7, inflation_de: 0.5, zinssatz_de: -0.5, lohn_de: 1.2, gold_eur_perf: 13.9 },2021: { msci_eur: 2260.4, inflation_de: 3.1, zinssatz_de: -0.5, lohn_de: 3, gold_eur_perf: -5.2 },2022: { msci_eur: 1960.9, inflation_de: 6.9, zinssatz_de: 1.25, lohn_de: 4, gold_eur_perf: 5.7 },2023: { msci_eur: 2318.9, inflation_de: 5.9, zinssatz_de: 3.5, lohn_de: 6, gold_eur_perf: 12.1 },2024: { msci_eur: 2500, inflation_de: 2.5, zinssatz_de: 3.75, lohn_de: 3, gold_eur_perf: 15 }
};
const MORTALITY_TABLE={m:{50:0.003,51:0.003,52:0.004,53:0.004,54:0.004,55:0.005,56:0.005,57:0.006,58:0.006,59:0.007,60:0.007,61:0.008,62:0.009,63:0.009,64:0.010,65:0.010,66:0.011,67:0.012,68:0.013,69:0.014,70:0.016,71:0.017,72:0.019,73:0.021,74:0.023,75:0.026,76:0.029,77:0.032,78:0.036,79:0.040,80:0.045,81:0.051,82:0.057,83:0.065,84:0.073,85:0.083,86:0.094,87:0.107,88:0.121,89:0.137,90:0.155,91:0.175,92:0.197,93:0.221,94:0.247,95:0.275,96:0.305,97:0.337,98:0.370,99:0.400,100:0.430,101:0.46,102:0.49,103:0.52,104:0.55,105:0.6,106:0.65,107:0.7,108:0.8,109:0.9,110:1},w:{50:0.002,51:0.002,52:0.002,53:0.003,54:0.003,55:0.003,56:0.004,57:0.004,58:0.004,59:0.005,60:0.005,61:0.006,62:0.006,63:0.007,64:0.007,65:0.007,66:0.008,67:0.008,68:0.009,69:0.010,70:0.011,71:0.012,72:0.013,73:0.015,74:0.016,75:0.018,76:0.021,77:0.023,78:0.026,79:0.030,80:0.034,81:0.039,82:0.044,83:0.050,84:0.057,85:0.066,86:0.076,87:0.087,88:0.100,89:0.115,90:0.131,91:0.149,92:0.169,93:0.191,94:0.215,95:0.241,96:0.269,97:0.298,98:0.329,99:0.360,100:0.390,101:0.42,102:0.45,103:0.48,104:0.51,105:0.55,106:0.6,107:0.65,108:0.75,109:0.85,110:1}};

const STRESS_PRESETS = {
  NONE: { label: "Kein Stress", type: "none", years: 0 },

  STAGFLATION_70s: {
    label: "Stagflation (70er-ähnlich)",
    type: "conditional_bootstrap",
    years: 7,
    // härter: hohe Inflation UND klar negative Realrendite
    filter: { inflationMin: 7.0, equityRealMax: -2.0 }
  },

  DOUBLE_BEAR_00s: {
    label: "Doppelbär (Dotcom/GFC-ähnlich)",
    type: "conditional_bootstrap",
    years: 6,
    // real < -8% und Clusteranforderung (minCluster wird von Engine v30.2 ignoriert)
    filter: { equityRealMax: -8.0, minCluster: 2 }
  },

  INFLATION_SPIKE_3Y: {
    label: "Inflationsschock (3 Jahre)",
    type: "parametric",
    years: 3,
    muShiftEq: -0.05,        // -5 pp auf Aktiendrift
    volScaleEq: 1.5,         // +50% Volatilität
    inflationFloor: 7.0,    // min. 7% Inflation
    muShiftAu: 0.00          // kein automatischer Gold-Boost
  },

  FORCED_DRAWDOWN_3Y: {
    label: "Erzwungener Drawdown (3 Jahre)",
    type: "parametric_sequence",
    years: 3,
    seqReturnsEq: [-0.25, -0.20, -0.15], // ≈ -49% kumulativ
    noiseVol: 0.04,                      // ±4% Noise
    reboundClamp: { years: 2, cap: 0.05 } // Erholung auf 5% p.a. gedeckelt
  }
};

const ENGINE_VERSION = '31.0';
const ENGINE_HASH = '2016807894';
const DEFAULT_RISIKOPROFIL = 'sicherheits-dynamisch';

let annualData = [];
let REGIME_DATA = { BULL: [], BEAR: [], SIDEWAYS: [], STAGFLATION: [] };
let REGIME_TRANSITIONS = {};
const BREAK_ON_RUIN = true;
const CARE_PROBABILITY_BUCKETS = Object.keys(PFLEGE_GRADE_PROBABILITIES).map(Number).sort((a, b) => a - b);

function getCommonInputs() {
    const goldAktiv = document.getElementById('goldAllokationAktiv').checked;
    const pflegeGradeConfigs = {};
    SUPPORTED_PFLEGE_GRADES.forEach(grade => {
        const zusatzInput = document.getElementById(`pflegeStufe${grade}Zusatz`);
        const flexInput = document.getElementById(`pflegeStufe${grade}FlexCut`);
        const zusatz = parseFloat(zusatzInput?.value) || 0;
        const flexPercent = parseFloat(flexInput?.value);
        const flexCut = Math.min(1, Math.max(0, ((Number.isFinite(flexPercent) ? flexPercent : 100) / 100)));
        pflegeGradeConfigs[grade] = { zusatz, flexCut };
    });
    const grade1Config = pflegeGradeConfigs[1] || { zusatz: 0, flexCut: 1 };
    const baseInputs = {
        startVermoegen: parseFloat(document.getElementById('simStartVermoegen').value) || 0,
        depotwertAlt: parseFloat(document.getElementById('depotwertAlt').value) || 0,
        einstandAlt: parseFloat(document.getElementById('einstandAlt').value) || 0,
        zielLiquiditaet: parseFloat(document.getElementById('zielLiquiditaet').value) || 0,
        startFloorBedarf: parseFloat(document.getElementById('startFloorBedarf').value) || 0,
        startFlexBedarf: parseFloat(document.getElementById('startFlexBedarf').value) || 0,
        marketCapeRatio: parseFloat(document.getElementById('marketCapeRatio').value) || 0,
        risikoprofil: DEFAULT_RISIKOPROFIL,
        goldAktiv: goldAktiv,
        goldZielProzent: (goldAktiv ? parseFloat(document.getElementById('goldAllokationProzent').value) : 0),
        goldFloorProzent: (goldAktiv ? parseFloat(document.getElementById('goldFloorProzent').value) : 0),
        rebalancingBand: (goldAktiv ? parseFloat(document.getElementById('rebalancingBand').value) : 25), 
        goldSteuerfrei: goldAktiv && document.getElementById('goldSteuerfrei').checked,
        startAlter: parseInt(document.getElementById('startAlter').value) || 65,
        geschlecht: document.getElementById('geschlecht').value || 'w',
        startSPB: parseFloat(document.getElementById('startSPB').value) || 0,
        kirchensteuerSatz: parseFloat(document.getElementById('kirchensteuerSatz').value) || 0,
        renteMonatlich: parseFloat(document.getElementById('renteMonatlich').value) || 0,
        renteStartOffsetJahre: parseInt(document.getElementById('renteStartOffsetJahre').value) || 0,
        renteIndexierungsart: document.getElementById('renteIndexierungsart').value,
        renteFesterSatz: parseFloat(document.getElementById('renteFesterSatz').value) || 0,
        pflegefallLogikAktivieren: document.getElementById('pflegefallLogikAktivieren').checked,
        pflegeModellTyp: document.getElementById('pflegeModellTyp').value,
        pflegeGradeConfigs,
        pflegeStufe1Zusatz: grade1Config.zusatz,
        pflegeStufe1FlexCut: grade1Config.flexCut,
        pflegeMaxFloor: parseFloat(document.getElementById('pflegeMaxFloor').value) || 0,
        pflegeRampUp: parseInt(document.getElementById('pflegeRampUp').value) || 5,
        pflegeMinDauer: parseInt(document.getElementById('pflegeMinDauer').value) || 3,
        pflegeMaxDauer: parseInt(document.getElementById('pflegeMaxDauer').value) || 8,
        pflegeKostenDrift: (parseFloat(document.getElementById('pflegeKostenDrift').value) || 0) / 100,
        pflegebeschleunigtMortalitaetAktivieren: document.getElementById('pflegebeschleunigtMortalitaetAktivieren').checked,
        pflegeTodesrisikoFaktor: parseFloat(document.getElementById('pflegeTodesrisikoFaktor').value) || 1.0,
        decumulation: { mode: 'none' },
        stressPreset: document.getElementById('stressPreset').value || 'NONE'	
    };

    // NEU: Harte Verdrahtung der fehlenden Strategie-Parameter für die v31 Engine
    // Diese Werte werden dem Simulator hinzugefügt, ohne die UI zu ändern.
    const strategyConstants = {
        runwayMinMonths: 24,
        runwayTargetMonths: 36,
        targetEq: 60,
        rebalBand: 5,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5
    };

    return { ...baseInputs, ...strategyConstants };
}

function updateStartPortfolioDisplay() {
    const inputs = getCommonInputs();
    const flexiblesVermoegen = Math.max(0, inputs.startVermoegen - inputs.depotwertAlt);
    const investitionsKapitalNeu = Math.max(0, flexiblesVermoegen - inputs.zielLiquiditaet);
    const investitionsKapitalGesamt = inputs.depotwertAlt + investitionsKapitalNeu;
    const zielwertGold = inputs.goldAktiv ? investitionsKapitalGesamt * (inputs.goldZielProzent / 100) : 0;
    const depotwertNeu = Math.max(0, investitionsKapitalNeu - zielwertGold);
    document.getElementById('einstandNeu').value = (depotwertNeu).toFixed(0);
    let breakdownHtml = `
        <div style="text-align:center; font-weight:bold; color: var(--primary-color); margin-bottom:10px;">Finale Start-Allokation</div>
        <div class="form-grid-three-col">
            <div class="form-group"><label>Depot (Aktien)</label><span class="calculated-display" style="background-color: #e0f7fa;">${formatCurrency(inputs.depotwertAlt + depotwertNeu)}</span></div>
            <div class="form-group"><label>Depot (Gold)</label><span class="calculated-display" style="background-color: #fff9c4;">${formatCurrency(zielwertGold)}</span></div>
            <div class="form-group"><label>Liquidität</label><span class="calculated-display" style="background-color: #e8f5e9;">${formatCurrency(inputs.zielLiquiditaet)}</span></div>
        </div>
        <div style="font-size: 0.8rem; text-align: center; margin-top: 10px; color: #555;">Aufteilung: Depot Alt (${formatCurrency(inputs.depotwertAlt)}) + Depot Neu (${formatCurrency(depotwertNeu)})</div>`;
    document.getElementById('displayPortfolioBreakdown').innerHTML = breakdownHtml;
    document.getElementById('goldStrategyPanel').style.display = inputs.goldAktiv ? 'block' : 'none';
}

function initializePortfolio(inputs) {
    let depotTranchesAktien = [];
    let depotTranchesGold = [];
    
    const flexiblesVermoegen = Math.max(0, inputs.startVermoegen - inputs.depotwertAlt);
    const investitionsKapitalNeu = Math.max(0, flexiblesVermoegen - inputs.zielLiquiditaet);
    const investitionsKapitalGesamt = inputs.depotwertAlt + investitionsKapitalNeu;
    const zielwertGold = inputs.goldAktiv ? investitionsKapitalGesamt * (inputs.goldZielProzent / 100) : 0;
    const depotwertNeu = Math.max(0, investitionsKapitalNeu - zielwertGold);

    if (inputs.depotwertAlt > 1) {
        depotTranchesAktien.push({ marketValue: inputs.depotwertAlt, costBasis: inputs.einstandAlt, tqf: 0.30, type: 'aktien_alt' });
    }
    if (depotwertNeu > 1) {
        depotTranchesAktien.push({ marketValue: depotwertNeu, costBasis: depotwertNeu, tqf: 0.30, type: 'aktien_neu' });
    }
    if (zielwertGold > 1) {
        depotTranchesGold.push({ marketValue: zielwertGold, costBasis: zielwertGold, tqf: inputs.goldSteuerfrei ? 1.0 : 0.0, type: 'gold' });
    }

    return {
        depotTranchesAktien: [...depotTranchesAktien],
        depotTranchesGold: [...depotTranchesGold],
        liquiditaet: inputs.zielLiquiditaet
    };
}

function prepareHistoricalData() {
    if (annualData.length > 0) return;
    const years = Object.keys(HISTORICAL_DATA).map(Number).sort((a,b)=>a-b);
    for (let i = 1; i < years.length; i++) {
        const y = years[i], prev = years[i-1];
        const cur = HISTORICAL_DATA[y], vj = HISTORICAL_DATA[prev];
        if (!cur || !vj) continue;

        const m1 = Number(cur.msci_eur);
        const m0 = Number(vj.msci_eur);
        if (!isFinite(m0) || !isFinite(m1)) {
            console.warn(`Ungültige MSCI-Daten für Jahr ${y} oder ${prev} übersprungen.`);
            continue;
        }

        let rendite = (m0 > 0) ? (m1 - m0) / m0 : 0;
        if (!isFinite(rendite)) rendite = 0;

        const dataPoint = {
            jahr: y,
            rendite: rendite,
            inflation: Number(vj.inflation_de) || 0,
            zinssatz: Number(vj.zinssatz_de) || 0,
            lohn: Number(vj.lohn_de) || 0,
            gold_eur_perf: Number(vj.gold_eur_perf) || 0
        };

        annualData.push(dataPoint);
        const realRendite = rendite * 100 - dataPoint.inflation;
        let regime = (dataPoint.inflation > 4 && realRendite < 0) ? 'STAGFLATION' : (rendite > 0.15) ? 'BULL' : (rendite < -0.10) ? 'BEAR' : 'SIDEWAYS';
        dataPoint.regime = regime;
        if (!REGIME_DATA[regime]) REGIME_DATA[regime] = [];
        REGIME_DATA[regime].push(dataPoint);
    }
    const regimes = ['BULL', 'BEAR', 'SIDEWAYS', 'STAGFLATION'];
    regimes.forEach(from => { REGIME_TRANSITIONS[from] = { BULL: 0, BEAR: 0, SIDEWAYS: 0, STAGFLATION: 0, total: 0 }; });
    for (let i = 1; i < annualData.length; i++) {
        const fromRegime = annualData[i-1].regime, toRegime = annualData[i].regime;
        if (fromRegime && toRegime) { REGIME_TRANSITIONS[fromRegime][toRegime]++; REGIME_TRANSITIONS[fromRegime].total++; }
    }
}

function computeYearlyPension({ yearIndex, baseMonthly, startOffset, lastAnnualPension, indexierungsArt, inflRate, lohnRate, festerSatz }) {
    if (!baseMonthly || yearIndex < startOffset) return 0;
    let anpassungsSatz = 0;
    switch (indexierungsArt) {
        case 'inflation': anpassungsSatz = inflRate / 100; break;
        case 'lohn': anpassungsSatz = (lohnRate ?? inflRate) / 100; break;
        case 'fest': anpassungsSatz = festerSatz / 100; break;
    }
    if (yearIndex === startOffset) return baseMonthly * 12;
    const last = lastAnnualPension > 0 ? lastAnnualPension : baseMonthly * 12;
    return last * (1 + anpassungsSatz);
}

/**
 * Bereitet den Kontext für ein Stress-Szenario vor.
 * Wird einmal vor der Monte-Carlo-Schleife aufgerufen.
 */
function buildStressContext(presetKey, rand) {
    const preset = STRESS_PRESETS[presetKey] || STRESS_PRESETS.NONE;
    if (preset.type === 'none') return null;

    const context = {
        preset: preset,
        remainingYears: preset.years,
        type: preset.type
    };

    if (preset.type === 'conditional_bootstrap') {
        context.pickableIndices = annualData
            .map((d, i) => ({...d, index: i}))
            .filter(d => {
                const realReturnPct = (d.rendite * 100) - d.inflation;
                const passesInflation = preset.filter.inflationMin === undefined || d.inflation >= preset.filter.inflationMin;
                const passesRealReturn = preset.filter.equityRealMax === undefined || realReturnPct <= preset.filter.equityRealMax;
                return passesInflation && passesRealReturn;
            })
            .map(d => d.index);
        
        if (context.pickableIndices.length === 0) {
            console.warn(`Stress-Szenario "${preset.label}" fand keine passenden historischen Jahre. Fallback auf 'Kein Stress'.`);
            return null;
        }
    }
    
    if (preset.type === 'parametric_sequence' && preset.reboundClamp) {
        context.reboundYearsRemaining = preset.reboundClamp.years;
    }

    return context;
}

/**
 * Überschreibt oder modifiziert die gezogenen Jahresdaten basierend auf dem Stress-Kontext.
 */
function applyStressOverride(yearData, stressCtx, rand) {
    if (!stressCtx || stressCtx.remainingYears <= 0) {
        // Rebound-Phase nach dem eigentlichen Stress
        if (stressCtx?.reboundYearsRemaining > 0 && stressCtx.preset.reboundClamp) {
            yearData.rendite = Math.min(yearData.rendite, stressCtx.preset.reboundClamp.cap);
            stressCtx.reboundYearsRemaining--;
        }
        return yearData;
    }

    const preset = stressCtx.preset;
    const modifiedData = { ...yearData };

    switch (preset.type) {
        case 'parametric':
            modifiedData.rendite += (preset.muShiftEq || 0);
            modifiedData.gold_eur_perf = (modifiedData.gold_eur_perf || 0) + ((preset.muShiftAu || 0) * 100);
            modifiedData.inflation = Math.max(modifiedData.inflation, preset.inflationFloor || 0);
            break;

        case 'parametric_sequence':
            const i = preset.years - stressCtx.remainingYears;
            const baseReturn = preset.seqReturnsEq[i] || 0;
            const noise = (rand() * 2 - 1) * (preset.noiseVol || 0);
            modifiedData.rendite = baseReturn + noise;
            if (preset.inflationFixed !== undefined) {
                modifiedData.inflation = preset.inflationFixed;
            }
            break;
    }
    
    stressCtx.remainingYears--;
    return modifiedData;
}

function applySaleToPortfolio(portfolio, saleResult) {
    if (!saleResult || !saleResult.breakdown) return;
    saleResult.breakdown.forEach(saleItem => {
        const tranches = saleItem.kind.startsWith('aktien') ? portfolio.depotTranchesAktien : portfolio.depotTranchesGold;
        const tranche = tranches.find(t => t.type === saleItem.kind);
        if (tranche) {
            const reduction = Math.min(saleItem.brutto, tranche.marketValue);
            const reductionRatio = tranche.marketValue > 0 ? reduction / tranche.marketValue : 0;
            tranche.costBasis -= tranche.costBasis * reductionRatio;
            tranche.marketValue -= reduction;
        }
    });
}

function summarizeSalesByAsset(saleResult) {
  const sums = { vkAkt: 0, vkGld: 0, stAkt: 0, stGld: 0, vkGes: 0, stGes: 0 };
  if (!saleResult || !Array.isArray(saleResult.breakdown)) return sums;
  for (const item of saleResult.breakdown) {
    const isAktie = String(item.kind || '').startsWith('aktien');
    const brutto = +item.brutto || 0;
    const steuer = (item.steuer != null) ? (+item.steuer) : 0;
    if (isAktie) { sums.vkAkt += brutto; sums.stAkt += steuer; }
    else         { sums.vkGld += brutto; sums.stGld += steuer; }
    sums.vkGes += brutto; sums.stGes += steuer;
  }
  if (sums.stGes === 0 && saleResult.steuerGesamt > 0 && (sums.vkAkt + sums.vkGld) > 0) {
    const tot = sums.vkAkt + sums.vkGld; const ges = saleResult.steuerGesamt;
    sums.stAkt = ges * (sums.vkAkt / tot); sums.stGld = ges * (sums.vkGld / tot); sums.stGes = ges;
  } else if (saleResult.steuerGesamt > 0 && Math.abs(sums.stGes - saleResult.steuerGesamt) > 1e-6) {
    sums.stGes = saleResult.steuerGesamt;
  }
  return sums;
}

function rng(seed=123456789){ let x=seed|0; return ()=> (x = (x^=(x<<13)), x^=(x>>>17), x^=(x<<5), ((x>>>0)%1e9)/1e9); }

/**
 * Berechnet ein Quantil performant mithilfe des Quickselect-Algorithmus.
 * Modifiziert das Array nicht (arbeitet auf einer Kopie).
 * @param {Float64Array|number[]} arr - Das Array von Zahlen.
 * @param {number} q - Das Quantil (z.B. 0.5 für Median).
 * @returns {number} Der Wert am angegebenen Quantil.
 */
function quantile(arr, q) {
    if (!arr || arr.length === 0) return 0;
    const sorted = new Float64Array(arr); // Kopie erstellen, um Original nicht zu ändern
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;

    const quickselect = (a, k) => {
        let l = 0, r = a.length - 1;
        while (l < r) {
            let pivot = a[k];
            let i = l, j = r;
            do {
                while (a[i] < pivot) i++;
                while (a[j] > pivot) j--;
                if (i <= j) {
                    [a[i], a[j]] = [a[j], a[i]];
                    i++; j--;
                }
            } while (i <= j);
            if (j < k) l = i;
            if (k < i) r = j;
        }
        return a[k];
    };

    if (rest === 0) {
        return quickselect(sorted, base);
    } else {
        const v1 = quickselect(sorted, base);
        const v2 = quickselect(sorted, base + 1);
        return v1 + rest * (v2 - v1);
    }
}

function buildInputsCtxFromPortfolio(inputs, portfolio, {pensionAnnual, marketData}) {
  const aktAlt = portfolio.depotTranchesAktien.find(t => t.type === 'aktien_alt') || {marketValue:0, costBasis:0};
  const aktNeu = portfolio.depotTranchesAktien.find(t => t.type === 'aktien_neu') || {marketValue:0, costBasis:0};
  const gTr   = portfolio.depotTranchesGold.find(t => t.type === 'gold')       || {marketValue:0, costBasis:0};

  return {
    ...inputs,
    tagesgeld: portfolio.liquiditaet, geldmarktEtf: 0,
    depotwertAlt: aktAlt.marketValue,  costBasisAlt: aktAlt.costBasis,  tqfAlt: 0.30,
    depotwertNeu: aktNeu.marketValue,  costBasisNeu: aktNeu.costBasis,  tqfNeu: 0.30,
    goldWert: gTr.marketValue,         goldCost:    gTr.costBasis,
    goldSteuerfrei: inputs.goldSteuerfrei,
    sparerPauschbetrag: inputs.startSPB,
    marketData,
    pensionAnnual
  };
}

function sumDepot(portfolio) {
    const sumTr = (arr) => Array.isArray(arr) ? arr.reduce((s, t) => s + (Number(t?.marketValue) || 0), 0) : 0;
    return sumTr(portfolio?.depotTranchesAktien) + sumTr(portfolio?.depotTranchesGold);
}

function buyGold(portfolio, amount) {
    if (amount <= 0) return;
    const goldTranche = portfolio.depotTranchesGold.find(t => t.type === 'gold');
    if (goldTranche) {
        goldTranche.marketValue += amount;
        goldTranche.costBasis += amount;
    } else {
        portfolio.depotTranchesGold.push({ marketValue: amount, costBasis: amount, tqf: 1.0, type: 'gold' });
    }
}

function buyStocksNeu(portfolio, amount) {
    if (amount <= 0) return;
    const neuTranche = portfolio.depotTranchesAktien.find(t => t.type === 'aktien_neu');
    if (neuTranche) {
        neuTranche.marketValue += amount;
        neuTranche.costBasis += amount;
    } else {
        portfolio.depotTranchesAktien.push({ marketValue: amount, costBasis: amount, tqf: 0.30, type: 'aktien_neu' });
    }
}

function simulateOneYear(currentState, inputs, yearData, yearIndex, pflegeMeta = null) {
    let { portfolio, baseFloor, baseFlex, lastState, currentAnnualPension, marketDataHist } = currentState;
    let { depotTranchesAktien, depotTranchesGold } = portfolio;
    let liquiditaet = portfolio.liquiditaet;
    let totalTaxesThisYear = 0;

    const rA = isFinite(yearData.rendite) ? yearData.rendite : 0;
    const rG = isFinite(yearData.gold_eur_perf) ? yearData.gold_eur_perf / 100 : 0;
    const rC = isFinite(yearData.zinssatz) ? yearData.zinssatz / 100 : 0;

    depotTranchesAktien.forEach(t => { t.marketValue *= (1 + rA); });
    depotTranchesGold.forEach(t => { t.marketValue *= (1 + rG); });

    const resolvedCapeRatio = resolveCapeRatio(yearData.capeRatio, inputs.marketCapeRatio, marketDataHist.capeRatio);
    const marketDataCurrentYear = { ...marketDataHist, inflation: yearData.inflation, capeRatio: resolvedCapeRatio };

    const algoInput = { ...inputs, floorBedarf: baseFloor, flexBedarf: baseFlex, startSPB: inputs.startSPB };
    const market = Ruhestandsmodell_v30.analyzeMarket(marketDataCurrentYear);
    
    const pensionAnnual = computeYearlyPension({ yearIndex, baseMonthly: inputs.renteMonatlich, startOffset: inputs.renteStartOffsetJahre, lastAnnualPension: currentAnnualPension, indexierungsArt: inputs.renteIndexierungsart, inflRate: yearData.inflation, lohnRate: yearData.lohn, festerSatz: inputs.renteFesterSatz });
    const inflatedFloor = Math.max(0, baseFloor - pensionAnnual);
    const inflatedFlex  = baseFlex;
    
    // ============================================================================
    // BEGINN DER KORREKTUR: Fundamentaler Bug in der Runway-Berechnung behoben
    // ============================================================================
    // FALSCH: Die alte Berechnung basierte nur auf dem Netto-Floor und ignorierte den Flex-Anteil.
    // const runwayMonths = inflatedFloor > 0 ? (liquiditaet / inflatedFloor) * 12 : 9999;

    // KORREKT: Die Reichweite (Runway) muss auf Basis des GESAMTEN aus dem Portfolio
    // zu deckenden Bedarfs (Netto-Floor + Flex) berechnet werden.
    const jahresbedarfAusPortfolio = inflatedFloor + inflatedFlex;
    const runwayMonths = jahresbedarfAusPortfolio > 0 ? (liquiditaet / (jahresbedarfAusPortfolio / 12)) : Infinity;
    // ============================================================================
    // ENDE DER KORREKTUR
    // ============================================================================
    
    const profileKey = resolveProfileKey(algoInput.risikoprofil);
    let profile = Ruhestandsmodell_v30.CONFIG.PROFIL_MAP[profileKey];
    
    if (!profile) {
        const fallbackKey = Object.keys(Ruhestandsmodell_v30.CONFIG.PROFIL_MAP)[0];
        profile = Ruhestandsmodell_v30.CONFIG.PROFIL_MAP[fallbackKey];
    }
    const zielLiquiditaet = Ruhestandsmodell_v30.calculateTargetLiquidity(profile, market, {floor: inflatedFloor, flex: inflatedFlex});

    const depotwertGesamt = sumDepot(portfolio);
    const totalWealth     = depotwertGesamt + liquiditaet;
    
    const inputsCtx = buildInputsCtxFromPortfolio(algoInput, portfolio, {pensionAnnual, marketData: marketDataCurrentYear});
    
    const { spendingResult, newState: spendingNewState } = Ruhestandsmodell_v30.determineSpending({
        market, lastState, inflatedFloor, inflatedFlex,
        runwayMonths, liquidNow: liquiditaet, profile, depotValue: depotwertGesamt, totalWealth, inputsCtx
    });
    
    const results = {
        aktuelleLiquiditaet: liquiditaet, depotwertGesamt, zielLiquiditaet, gesamtwert: totalWealth,
        inflatedFloor, grossFloor: baseFloor, spending: spendingResult, market, 
        minGold: algoInput.goldAktiv ? (algoInput.goldFloorProzent/100)*totalWealth : 0
    };
    const actionResult = Ruhestandsmodell_v30.determineAction(results, inputsCtx);

    let mergedSaleResult = actionResult.saleResult;
    if (actionResult.saleResult) {
        totalTaxesThisYear += (actionResult.saleResult.steuerGesamt || 0);
        applySaleToPortfolio(portfolio, actionResult.saleResult);
    }
    
    // ============================================================================
    // BEGINN DER KORREKTUR: Behebung des Doppelbuchungs-Fehlers
    // ============================================================================
    // Der Wert 'actionResult.liqNachTransaktion.total' enthält bereits den FINALEN Liquiditätsstand,
    // NACHDEM Verkaufserlöse gutgeschrieben UND Käufe für Gold/Aktien intern verrechnet wurden.
    // Die erneute Subtraktion von `kaufGold` und `kaufAktien` war daher falsch und wurde entfernt.
    liquiditaet = actionResult.liqNachTransaktion.total;

    if (actionResult.kaufGold > 0) {
        buyGold(portfolio, actionResult.kaufGold);
        // Die Zeile "liquiditaet -= actionResult.kaufGold;" wurde hier entfernt.
    }
    if (actionResult.kaufAktien > 0) {
        buyStocksNeu(portfolio, actionResult.kaufAktien);
        // Die Zeile "liquiditaet -= actionResult.kaufAktien;" wurde hier entfernt.
    }
    // ============================================================================
    // ENDE DER KORREKTUR
    // ============================================================================

    const depotWertVorEntnahme = sumDepot(portfolio);
    let emergencyRefillHappened = false;
    const jahresEntnahme = spendingResult.monatlicheEntnahme * 12;

    if (liquiditaet < jahresEntnahme && depotWertVorEntnahme > 0) {
        const shortfall = jahresEntnahme - liquiditaet;
        const emergencyCtx = buildInputsCtxFromPortfolio(algoInput, { depotTranchesAktien: portfolio.depotTranchesAktien.map(t => ({...t})), depotTranchesGold: portfolio.depotTranchesGold.map(t => ({...t})), liquiditaet: liquiditaet}, { pensionAnnual, marketData: marketDataCurrentYear });
        const { saleResult: emergencySale } = Ruhestandsmodell_v30.calculateSaleAndTax(shortfall, emergencyCtx, { minGold: results.minGold }, market);

        if (emergencySale && emergencySale.achievedRefill > 0) {
            liquiditaet += emergencySale.achievedRefill;
            totalTaxesThisYear += (emergencySale.steuerGesamt || 0);
            applySaleToPortfolio(portfolio, emergencySale);
            mergedSaleResult = mergedSaleResult ? Ruhestandsmodell_v30.mergeSaleResults(mergedSaleResult, emergencySale) : emergencySale;
            emergencyRefillHappened = true;
        }
    }

    if (liquiditaet < jahresEntnahme) {
        return { isRuin: true };
    }
    liquiditaet -= jahresEntnahme;

    let kaufAkt = 0, kaufGld = 0;
    const ueberschuss = liquiditaet - zielLiquiditaet;
    if (ueberschuss > 500) {
        liquiditaet -= ueberschuss;
        const aktienAnteilQuote = algoInput.targetEq / (100 - (algoInput.goldAktiv ? algoInput.goldZielProzent : 0));
        const goldTeil = algoInput.goldAktiv ? ueberschuss * (1 - aktienAnteilQuote) : 0;
        const aktienTeil = ueberschuss - goldTeil;
        kaufGld = goldTeil;
        kaufAkt = aktienTeil;
        buyGold(portfolio, goldTeil);
        buyStocksNeu(portfolio, aktienTeil);
    }

    liquiditaet *= (1 + rC);
    if (!isFinite(liquiditaet)) liquiditaet = 0;
    
    const newMarketDataHist = {
        endeVJ_3: marketDataHist.endeVJ_2,
        endeVJ_2: marketDataHist.endeVJ_1,
        endeVJ_1: marketDataHist.endeVJ,
        endeVJ: marketDataHist.endeVJ * (1 + rA),
        ath: Math.max(marketDataHist.ath, marketDataHist.endeVJ * (1 + rA)),
        jahreSeitAth: (marketDataHist.endeVJ * (1 + rA) >= marketDataHist.ath) ? 0 : marketDataHist.jahreSeitAth + 1,
        capeRatio: resolvedCapeRatio,
        inflation: yearData.inflation
    };
    
    const vk = summarizeSalesByAsset(mergedSaleResult);
    const kaufAktTotal = (actionResult.kaufAktien || 0) + (kaufAkt || 0);
    const totalGoldKauf = (actionResult.kaufGold || 0) + kaufGld;

    let aktionText = shortenReasonText(actionResult.reason || 'none', actionResult.title || market.szenarioText);
    if (emergencyRefillHappened) { aktionText += " / Not-VK"; }
    if (totalGoldKauf > 0 && actionResult.reason !== 'rebalance_up') { aktionText += " / Rebal.(G+)"; }
    if (kaufAktTotal > 0 && !actionResult.title.includes("→ Aktien")) { aktionText += " / Rebal.(A+)"; }
    
    const actionTitle = actionResult.title || '';
    const isRebalanceEvent = actionTitle.toLowerCase().includes('rebalancing') && !actionTitle.toLowerCase().includes('puffer');

    const inflFactorThisYear = 1 + (yearData.inflation / 100);
    const naechsterBaseFloor = baseFloor * inflFactorThisYear;
    const naechsterBaseFlex = baseFlex * inflFactorThisYear;

    return {
        isRuin: false,
        newState: {
            portfolio: { ...portfolio, liquiditaet },
            baseFloor: naechsterBaseFloor,
            baseFlex: naechsterBaseFlex,
            lastState: spendingNewState,
            currentAnnualPension: pensionAnnual,
            marketDataHist: newMarketDataHist,
            samplerState: currentState.samplerState
        },
        logData: {
            entscheidung: { ...spendingResult, jahresEntnahme, runwayMonths, kuerzungProzent: spendingResult.kuerzungProzent },
            FlexRatePct: spendingResult.details.flexRate,
            CutReason: spendingResult.kuerzungQuelle,
            Alarm: spendingNewState.alarmActive,
            Regime: spendingNewState.lastMarketSKey,
            QuoteEndPct: spendingResult.details.entnahmequoteDepot * 100,
            RunwayCoveragePct: (zielLiquiditaet > 0 ? (actionResult.liqNachTransaktion.total / zielLiquiditaet) : 1) * 100,
            RealReturnEquityPct: (1 + rA) / (1 + yearData.inflation/100) - 1,
            RealReturnGoldPct: (1 + rG) / (1 + yearData.inflation/100) - 1,
            entnahmequote: depotWertVorEntnahme > 0 ? (jahresEntnahme / depotWertVorEntnahme) : 0,
            steuern_gesamt: totalTaxesThisYear,
            vk,
            kaufAkt: kaufAktTotal,
            kaufGld: totalGoldKauf,
            wertAktien: sumDepot({depotTranchesAktien: portfolio.depotTranchesAktien}),
            wertGold: sumDepot({depotTranchesGold: portfolio.depotTranchesGold}),
            liquiditaet, aktionUndGrund: aktionText,
            usedSPB: mergedSaleResult ? (mergedSaleResult.pauschbetragVerbraucht || 0) : 0,
            floor_brutto: baseFloor,
            pension_annual: pensionAnnual,
            floor_aus_depot: inflatedFloor,
            flex_brutto: baseFlex,
            flex_erfuellt_nominal: jahresEntnahme > inflatedFloor ? jahresEntnahme - inflatedFloor : 0,
            inflation_factor_cum: spendingNewState.cumulativeInflationFactor,
            jahresentnahme_real: jahresEntnahme / spendingNewState.cumulativeInflationFactor,
            pflege_aktiv: pflegeMeta?.active ?? false,
            pflege_zusatz_floor: pflegeMeta?.zusatzFloorZiel ?? 0,
            pflege_zusatz_floor_delta: pflegeMeta?.zusatzFloorDelta ?? 0,
            pflege_flex_faktor: pflegeMeta?.flexFactor ?? 1.0,
            pflege_kumuliert: pflegeMeta?.kumulierteKosten ?? 0,
            pflege_grade: pflegeMeta?.grade ?? null,
            pflege_grade_label: pflegeMeta?.gradeLabel ?? ''
        },
        totalTaxesThisYear
    };
}

/**
 * Initialisiert den Startzustand für einen einzelnen Monte-Carlo-Lauf.
 * Wählt einen zufälligen Startpunkt aus der Historie, um die Anfangs-Marktbedingungen zu setzen.
 */
function initMcRunState(inputs, startYearIndex) {
    const startPortfolio = initializePortfolio(inputs);

    // Markt-Historie basierend auf dem zufälligen Startpunkt aufbauen
    const histYears = Object.keys(HISTORICAL_DATA).map(Number).sort((a,b)=>a-b);
    const validStartIndices = annualData.map((d, i) => i).filter(i => i >= 4); // Brauchen mind. 4 Vorjahre
    const effectiveIndex = validStartIndices[startYearIndex % validStartIndices.length];
    const startJahr = annualData[effectiveIndex].jahr;

    const marketDataHist = {
        endeVJ:   HISTORICAL_DATA[startJahr - 1]?.msci_eur || 1000,
        endeVJ_1: HISTORICAL_DATA[startJahr - 2]?.msci_eur || 1000,
        endeVJ_2: HISTORICAL_DATA[startJahr - 3]?.msci_eur || 1000,
        endeVJ_3: HISTORICAL_DATA[startJahr - 4]?.msci_eur || 1000,
        ath: 0,
        jahreSeitAth: 0,
        inflation: HISTORICAL_DATA[startJahr - 1]?.inflation_de || 2.0,
        capeRatio: resolveCapeRatio(undefined, inputs.marketCapeRatio, 0)
    };

    const pastValues = histYears.filter(y => y < startJahr).map(y => HISTORICAL_DATA[y].msci_eur);
    marketDataHist.ath = pastValues.length > 0 ? Math.max(...pastValues, marketDataHist.endeVJ) : marketDataHist.endeVJ;
    if (marketDataHist.endeVJ < marketDataHist.ath) {
       let lastAthYear = Math.max(...histYears.filter(y => y < startJahr && HISTORICAL_DATA[y].msci_eur >= marketDataHist.ath));
       marketDataHist.jahreSeitAth = (startJahr - 1) - lastAthYear;
    }

    return {
        portfolio: startPortfolio,
        baseFloor: inputs.startFloorBedarf,
        baseFlex: inputs.startFlexBedarf,
        lastState: null,
        currentAnnualPension: 0,
        marketDataHist: marketDataHist,
        samplerState: {} // Interner Zustand für den Sampling-Algorithmus
    };
}

/**
 * Erzeugt ein Default-Objekt für die Pflege-Metadaten.
 * Wird verwendet, um `simulateOneYear` immer ein definiertes Objekt zu übergeben.
 */
function makeDefaultCareMeta(enabled) {
    if (!enabled) return null;
    return {
        active: false,
        triggered: false,
        startAge: -1,
        durationYears: 0,
        currentYearInCare: 0,
        // Felder für die eigentliche Berechnung, die in simulateOneYear verwendet werden
        zusatzFloorZiel: 0,
        zusatzFloorDelta: 0,
        flexFactor: 1.0,
        kumulierteKosten: 0,
        // Felder zur internen Zustandsverwaltung
        floorAtTrigger: 0,
        flexAtTrigger: 0,
        maxFloorAtTrigger: 0,
        grade: null,
        gradeLabel: ''
    };
}


/**
 * Wählt die Marktdaten für das nächste Jahr gemäß der gewählten MC-Methode aus.
 * Modifiziert den samplerState im simState-Objekt.
 */
function sampleNextYearData(state, methode, blockSize, rand, stressCtx) {
    const samplerState = state.samplerState;

    if (stressCtx && stressCtx.type === 'conditional_bootstrap' && stressCtx.remainingYears > 0) {
        const randomIndex = Math.floor(rand() * stressCtx.pickableIndices.length);
        const chosenYearIndex = stressCtx.pickableIndices[randomIndex];
        // Wichtig: 'remainingYears' wird in applyStressOverride dekrementiert, um Logik zu zentralisieren.
        return { ...annualData[chosenYearIndex] };
    }
	
    if (methode === 'block') {
        if (!samplerState.blockStartIndex || samplerState.yearInBlock >= blockSize) {
            const maxIndex = annualData.length - blockSize;
            samplerState.blockStartIndex = Math.floor(rand() * maxIndex);
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
    } else { // regime_markov (Standard)
        if (!samplerState.currentRegime) {
            // Starte in einem zufälligen historischen Regime
            samplerState.currentRegime = annualData[Math.floor(rand() * annualData.length)].regime;
        }
        
        const transitions = REGIME_TRANSITIONS[samplerState.currentRegime];
        const r = rand();
        let cumulativeProb = 0;
        let nextRegime = 'SIDEWAYS'; // Fallback
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
    
    const possibleYears = REGIME_DATA[regime];
    const chosenYear = possibleYears[Math.floor(rand() * possibleYears.length)];
    return { ...chosenYear };
}

function computeRunStatsFromSeries(series) {
  if (!Array.isArray(series) || series.length < 2) {
    return { volPct: 0, maxDDpct: 0 };
  }
  const returns = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1] || 0;
    const cur  = series[i] || 0;
    const r = (prev > 0 && isFinite(prev) && isFinite(cur)) ? (cur / prev - 1) : 0;
    returns.push(r);
  }
  // Volatilität (annualisierte StdAbw der Jahresrenditen)
  const mu = returns.length > 0 ? returns.reduce((a,b)=>a+b,0) / returns.length : 0;
  const variance = returns.length > 1 ? returns.reduce((s,x)=>s + (x-mu)*(x-mu), 0) / (returns.length - 1) : 0;
  const volPct = Math.sqrt(Math.max(variance, 0)) * 100;

  // Max-Drawdown
  let peak = series[0];
  let maxDD = 0;
  for (let i = 1; i < series.length; i++) {
    peak = Math.max(peak, series[i]);
    if (peak > 0) {
      const dd = (series[i] - peak) / peak; // negativ
      if (isFinite(dd)) maxDD = Math.min(maxDD, dd);
    }
  }
  const maxDDpct = Math.abs(maxDD) * 100;
  return { volPct, maxDDpct };
}

function computeCareMortalityMultiplierLegacy(care, inputs) {
  if (!care || !care.active || !inputs?.pflegebeschleunigtMortalitaetAktivieren) {
    return 1;
  }

  const baseFactor = Math.max(1, Number(inputs.pflegeTodesrisikoFaktor) || 1);
  if (baseFactor <= 1) return 1;

  const rampYears = Math.max(1, Number(inputs.pflegeRampUp) || 1);
  if (rampYears === 1) {
    return baseFactor;
  }

  const yearsCompleted = Math.min(Math.max(1, care.currentYearInCare || 0), rampYears);
  const progress = (yearsCompleted - 1) / (rampYears - 1);
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
    const bucket = resolveCareAgeBucket(age);
    const probabilities = PFLEGE_GRADE_PROBABILITIES[bucket];
    if (!probabilities) return null;

    const totalProbability = SUPPORTED_PFLEGE_GRADES.reduce((sum, grade) => sum + (probabilities[grade] || 0), 0);
    if (totalProbability <= 0) return null;

    const roll = rand();
    if (roll > totalProbability) {
        return null;
    }

    let cumulative = 0;
    for (const grade of SUPPORTED_PFLEGE_GRADES) {
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
    return { zusatz, flexCut };
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
        flexCut: inputs?.pflegeStufe1FlexCut
    });
}

/**
 * Aktualisiert Pflege-Metadaten inkl. grade-spezifischer Kostenannahmen.
 * Datenbasis: BARMER Pflegereport 2024 (siehe README).
 */
function updateCareMeta(care, inputs, age, yearData, rand) {
    // KORRIGIERT: Die Bedingung prüft jetzt beides und stellt sicher, dass die Funktion bei
    // deaktivierter Logik oder einem null-Objekt sofort und sicher beendet wird.
    if (!inputs.pflegefallLogikAktivieren || !care) return care;

    // --- 1. Fortschreibung, falls Pflegefall bereits aktiv ist ---
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

        const gradeConfig = resolveGradeConfig(inputs, care.grade);
        const yearsSinceStart = care.currentYearInCare;
        const yearIndex = yearsSinceStart + 1;
        const inflationsAnpassung = (1 + yearData.inflation/100) * (1 + inputs.pflegeKostenDrift);

        const floorAtTriggerAdjusted = care.floorAtTrigger * Math.pow(1 + yearData.inflation/100, yearIndex);
        const flexAtTriggerAdjusted = care.flexAtTrigger * Math.pow(1 + yearData.inflation/100, yearIndex);
        const maxFloorAdjusted = care.maxFloorAtTrigger * Math.pow(inflationsAnpassung, yearIndex);

        const capZusatz = Math.max(0, maxFloorAdjusted - floorAtTriggerAdjusted);

        const zielRoh = gradeConfig.zusatz * Math.pow(inflationsAnpassung, yearIndex);
        const rampUpFactor = Math.min(1.0, yearIndex / Math.max(1, inputs.pflegeRampUp));
        const zielMitRampUp = zielRoh * rampUpFactor;

        const zusatzFloorZielFinal = Math.min(capZusatz, zielMitRampUp);

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

            care.floorAtTrigger = inputs.startFloorBedarf;
            care.flexAtTrigger = inputs.startFlexBedarf;
            care.maxFloorAtTrigger = inputs.pflegeMaxFloor;

            if (inputs.pflegeModellTyp === 'akut') {
                const min = inputs.pflegeMinDauer, max = inputs.pflegeMaxDauer;
                care.durationYears = Math.floor(rand() * (max - min + 1)) + min;
            } else {
                care.durationYears = 999;
            }

            care.log_grade_bucket = sampledGrade.bucket;
            care.log_grade_probability = sampledGrade.gradeProbability;
            care.log_grade_totalProbability = sampledGrade.totalProbability;

            return updateCareMeta(care, inputs, age, yearData, rand);
        }
    }

    return care;
}

async function runMonteCarlo() {
    const mcButton = document.getElementById('mcButton');
    mcButton.disabled = true;
    const progressBarContainer = document.getElementById('mc-progress-bar-container');
    const progressBar = document.getElementById('mc-progress-bar');
    try {
        prepareHistoricalData();
        const inputs = getCommonInputs();
        
        progressBarContainer.style.display = 'block'; progressBar.style.width = '0%';
        const anzahl = parseInt(document.getElementById('mcAnzahl').value);
        const maxDauer = parseInt(document.getElementById('mcDauer').value);
        const blockSize = parseInt(document.getElementById('mcBlockSize').value);
        const seed = parseInt(document.getElementById('mcSeed').value);
        const methode = document.getElementById('mcMethode').value;
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

        const stress_maxDrawdowns = new Float32Array(anzahl);
        const stress_timeQuoteAbove45 = new Float32Array(anzahl);
        const stress_cutYears = new Float32Array(anzahl);
        const stress_CaR_P10_Real = new Float64Array(anzahl);
        const stress_recoveryYears = new Float32Array(anzahl);

        let worstRun = { finalVermoegen: Infinity, logDataRows: [], failed: false };
        let worstRunCare = { finalVermoegen: Infinity, logDataRows: [], failed: false, hasCare: false };

        let failCount = 0;
        let pflegeTriggeredCount = 0;
        const entryAges = [], careDepotCosts = [];
        let shortfallWithCareCount = 0, shortfallNoCareProxyCount = 0;
        const endWealthWithCare = new Float64Array(anzahl);
        const endWealthNoCareProxyArr = new Float64Array(anzahl);
        
        const BINS = [0, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 10, Infinity];
        const heatmap = Array(10).fill(0).map(() => new Uint32Array(BINS.length - 1));
        let totalSimulatedYears = 0, totalYearsQuoteAbove45 = 0;
        const allRealWithdrawalsSample = [];
        
        for (let i = 0; i < anzahl; i++) {
            if (i % 50 === 0) {
                progressBar.style.width = `${(i / anzahl) * 90}%`;
                await new Promise(resolve => setTimeout(resolve, 0)); 
            }
            
            let failed = false, totalTaxesThisRun = 0, kpiJahreMitKuerzungDieserLauf = 0, kpiMaxKuerzungDieserLauf = 0;
            let lebensdauer = 0, jahreOhneFlex = 0, triggeredAge = null;
            let careEverActive = false;
            
            const startYearIndex = Math.floor(rand() * annualData.length);
            let simState = initMcRunState(inputs, startYearIndex);
            
            const depotWertHistorie = [portfolioTotal(simState.portfolio)];
            const currentRunLog = [];
            let depotNurHistorie = [ sumDepot(simState.portfolio) ];
            let depotErschoepfungAlterGesetzt = false;
            
            let careMeta = makeDefaultCareMeta(inputs.pflegefallLogikAktivieren);
            let stressCtx = stressCtxMaster ? JSON.parse(JSON.stringify(stressCtxMaster)) : null;

            const stressYears = stressCtxMaster?.preset?.years ?? 0;
            const stressPortfolioValues = [portfolioTotal(simState.portfolio)]; 
            let stressYearsAbove45 = 0;
            let stressCutYears = 0;
            const stressRealWithdrawals = [];
            let postStressRecoveryYears = null;

            for (let simulationsJahr = 0; simulationsJahr < maxDauer; simulationsJahr++) {
                const currentAge = inputs.startAlter + simulationsJahr;
                lebensdauer = simulationsJahr + 1;
                
                let yearData = sampleNextYearData(simState, methode, blockSize, rand, stressCtx);
                yearData = applyStressOverride(yearData, stressCtx, rand);
                
                careMeta = updateCareMeta(careMeta, inputs, currentAge, yearData, rand);
                
                if (careMeta && careMeta.active) careEverActive = true;
                if (careMeta && careMeta.triggered && triggeredAge === null) triggeredAge = currentAge;

                let qx = MORTALITY_TABLE[inputs.geschlecht][currentAge] || 1;
                const careFactorLegacy = computeCareMortalityMultiplierLegacy(careMeta, inputs);
                if (careFactorLegacy > 1) {
                    qx = Math.min(1.0, qx * careFactorLegacy);
                }
                
                if (rand() < qx) break;

                const result = simulateOneYear(simState, inputs, yearData, simulationsJahr, careMeta);

                if (result.isRuin) {
                    failed = true;
                    // ============================================================================
                    // BEGINN DER KORREKTUR: Expliziter Log-Eintrag für den Ruin
                    // ============================================================================
                    // Fügt einen letzten, klaren Eintrag hinzu, damit das Log den Fehlschlag zeigt.
                    currentRunLog.push({
                        jahr: simulationsJahr + 1,
                        histJahr: yearData.jahr,
                        aktionUndGrund: ">>> RUIN <<<",
                        wertAktien: 0, wertGold: 0, liquiditaet: 0
                    });
                    // ============================================================================
                    // ENDE DER KORREKTUR
                    // ============================================================================
                    if (BREAK_ON_RUIN) break; 
                } else {
                    simState = result.newState;
                    totalTaxesThisRun += result.totalTaxesThisYear;
                    if (result.logData.entscheidung.kuerzungProzent >= 10) kpiJahreMitKuerzungDieserLauf++;
                    kpiMaxKuerzungDieserLauf = Math.max(kpiMaxKuerzungDieserLauf, result.logData.entscheidung.kuerzungProzent);

                    const depotOnlyNow = sumDepot(simState.portfolio);
                    depotNurHistorie.push(depotOnlyNow);

                    if (!depotErschoepfungAlterGesetzt && depotOnlyNow <= 1e-6) {
                      alterBeiErschoepfung[i] = currentAge;
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
                        pflege_aktiv: !!(careMeta && careMeta.active),
                        pflege_zusatz_floor: careMeta?.zusatzFloorZiel ?? 0,
                        pflege_zusatz_floor_delta: careMeta?.zusatzFloorDelta ?? 0,
                        pflege_flex_faktor: careMeta?.flexFactor ?? 1,
                        pflege_kumuliert: careMeta?.kumulierteKosten ?? 0,
                        pflege_floor_anchor: careMeta?.log_floor_anchor ?? 0,
                        pflege_maxfloor_anchor: careMeta?.log_maxfloor_anchor ?? 0,
                        pflege_cap_zusatz: careMeta?.log_cap_zusatz ?? 0,
                        pflege_delta_flex: careMeta?.log_delta_flex ?? 0
                    });
                }
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
            depotErschoepft[i] = depotNurHistorie.some(v => v <= 1e-6) ? 1 : 0;

            const cumulCareDepotCosts = careMeta?.kumulierteKosten || 0;
            endWealthWithCare[i] = endVermoegen;
            endWealthNoCareProxyArr[i] = endVermoegen + cumulCareDepotCosts;
            if (triggeredAge !== null) {
                pflegeTriggeredCount++; entryAges.push(triggeredAge); careDepotCosts.push(cumulCareDepotCosts);
                if (failed) shortfallWithCareCount++;
            }
            if (endWealthNoCareProxyArr[i] <= 0) shortfallNoCareProxyCount++;
        }

        progressBar.style.width = '95%';
        await new Promise(resolve => setTimeout(resolve, 0));

        const successfulOutcomes = [];
        for(let i=0; i<anzahl; ++i) { if(finalOutcomes[i] > 0) successfulOutcomes.push(finalOutcomes[i]); }
        
        const pflegeResults = {
          entryRatePct: (pflegeTriggeredCount / anzahl) * 100,
          entryAgeMedian: entryAges.length ? quantile(entryAges, 0.5) : 0,
          shortfallRate_condCare: pflegeTriggeredCount > 0 ? (shortfallWithCareCount / pflegeTriggeredCount) * 100 : 0,
          shortfallRate_noCareProxy: (shortfallNoCareProxyCount / anzahl) * 100,
          endwealthWithCare_median: quantile(endWealthWithCare, 0.5),
          endwealthNoCare_median: quantile(endWealthNoCareProxyArr, 0.5),
          depotCosts_median: careDepotCosts.length ? quantile(careDepotCosts, 0.5) : 0
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
        
        displayMonteCarloResults(aggregatedResults, anzahl, failCount, worstRun, {}, {}, pflegeTriggeredCount, inputs, worstRunCare);

    } catch (e) {
        alert("Fehler in der Monte-Carlo-Simulation:\n\n" + e.message + "\n" + e.stack); console.error(e);
    } finally {
        progressBar.style.width = '100%'; setTimeout(() => { progressBarContainer.style.display = 'none'; }, 250); mcButton.disabled = false;
    }
}

// --- NEU: Globale Variable zum Speichern der Daten für das Re-Rendering ---
window.globalWorstRunData = { rows: [], caR_Threshold: undefined };

function createKpiCard(title, value, unit, description, colorClass = '') {
    const val = (value != null && isFinite(value)) ? value.toFixed(1).replace('.', ',') : '—';
    const unitStr = unit ? ` ${unit}` : '';
    return `
    <div class="kpi-card ${colorClass}">
      <strong>${title}</strong>
      <div class="value-line">${val}${unitStr}</div>
      <div class="kpi-description">${description || ''}</div>
    </div>`;
}

function createCurrencyKpiCard(title, value, description, colorClass = '') {
    const val = (value != null && isFinite(value)) ? formatCurrency(value) : '—';
    return `
    <div class="kpi-card ${colorClass}">
      <strong>${title}</strong>
      <div class="value-line">${val}</div>
      <div class="kpi-description">${description || ''}</div>
    </div>`;
}

function displayMonteCarloResults(results, anzahl, failCount, worstRun, resultsMitPflege, resultsOhnePflege, pflegefallEingetretenCount, inputs, worstRunCare) {
    
    // 1. Haupt-Zusammenfassung (Summary)
    document.getElementById('monteCarloSummary').innerHTML = `
        <div class="summary-grid">
          <div class="summary-item"><strong>Erfolgsquote</strong><span style="color:var(--success-color);">${(((anzahl - failCount) / anzahl) * 100).toFixed(1)}%</span></div>
          <div class="summary-item"><strong>Shortfalls</strong><span>${failCount} von ${anzahl}</span></div>
          <div class="summary-item"><strong>Median (alle)</strong><span>${formatCurrency(results.finalOutcomes.p50)}</span></div>
          <div class="summary-item"><strong>Median (erfolgreiche)</strong><span>${formatCurrency(results.finalOutcomes.p50_successful)}</span></div>
          <div class="summary-item"><strong>10%/90% Perzentil</strong><span>${formatCurrency(results.finalOutcomes.p10)} / ${formatCurrency(results.finalOutcomes.p90)}</span></div>
          <div class="summary-item tax"><strong>Median Steuern</strong><span>${formatCurrency(results.taxOutcomes.p50)}</span></div>
        </div>`;

    // 2. KPI Dashboards
    const dashboard = document.getElementById('unifiedKpiDashboard');
    let dashboardHtml = '';
    
    dashboardHtml += '<h3 class="unified-kpi-header">Operative Kennzahlen (Median)</h3><div class="kpi-grid">';
    dashboardHtml += createKpiCard('Ø Lebensdauer', results.kpiLebensdauer?.mean, 'Jahre', 'Die durchschnittliche simulierte Lebensdauer über alle Läufe.');
    dashboardHtml += createKpiCard('Anteil Kürzungsjahre (>10%)', results.kpiKuerzungsjahre?.p50, '%', 'Medianer Anteil der Jahre, in denen der Flex-Anteil um mehr als 10% gekürzt wurde.');
    dashboardHtml += createKpiCard('Max. Kürzung (Flex)', results.kpiMaxKuerzung?.p50, '%', 'Die im Median maximal aufgetretene Kürzung des Flex-Anteils in einem einzelnen Jahr.');
    dashboardHtml += '</div>';

    dashboardHtml += '<h3 class="unified-kpi-header">Qualitäts-Analyse des Ruhestands</h3><div class="kpi-grid">';
    const deQuote = results.depotErschoepfungsQuote;
    const qClass = deQuote > 20 ? 'is-red' : (deQuote > 5 ? 'is-amber' : 'is-green');
    dashboardHtml += createKpiCard('Depot-Erschöpfungs-Quote', deQuote, '%', 'Anteil der Simulationen, in denen das Depot (Aktien/Gold) vollständig aufgebraucht wird.', qClass);
    const alterErs = (results.alterBeiErschoepfung?.p50 || 0) > 0 ? results.alterBeiErschoepfung.p50 : null;
    dashboardHtml += createKpiCard('Median-Alter bei Erschöpfung', alterErs, 'Jahre', 'Das Alter, das im Median bei Eintritt der Depot-Erschöpfung erreicht wird (nur für erschöpfte Fälle).');
    dashboardHtml += createKpiCard('Median-Anteil Jahre ohne Flex', results.anteilJahreOhneFlex?.p50, ' %', 'Medianer Anteil der Jahre, in denen der Flex-Bedarf zu 100% gekürzt werden musste.');
    dashboardHtml += '</div>';

    if (isFinite(results.volatilities?.p50) || isFinite(results.maxDrawdowns?.p50)) {
        dashboardHtml += '<h3 class="unified-kpi-header">Risiko-Analyse</h3><div class="kpi-grid">';
        if (isFinite(results.volatilities?.p50)) dashboardHtml += createKpiCard('Median Portfoliovolatilität', results.volatilities.p50, '%', 'Annualisierte Standardabweichung der Portfolio-Renditen (Median).');
        if (isFinite(results.maxDrawdowns?.p50)) dashboardHtml += createKpiCard('Max. Drawdown (Median)', results.maxDrawdowns.p50, '%', 'Größter Verlust von Peak-zu-Tief im Depot (Median).', 'is-amber');
        if (isFinite(results.maxDrawdowns?.p90)) dashboardHtml += createKpiCard('Max. Drawdown (P90)', results.maxDrawdowns.p90, '%', 'Der 90%-Wert: Nur 10% der Läufe hatten einen größeren Drawdown.', 'is-red');
        dashboardHtml += '</div>';
    }

    if (results.extraKPI) {
        dashboardHtml += '<h3 class="unified-kpi-header">Weitere Detail-KPIs</h3><div class="kpi-grid">';
        const timeShare = isFinite(results.extraKPI.timeShareQuoteAbove45) ? (results.extraKPI.timeShareQuoteAbove45 * 100) : null;
        dashboardHtml += createKpiCard('Zeitanteil Quote > 4.5%', timeShare, '%', 'Anteil aller simulierten Jahre mit einer Entnahmerate über dem kritischen Schwellenwert von 4.5%.');
        if (isFinite(results.extraKPI.consumptionAtRiskP10Real)) {
          dashboardHtml += createCurrencyKpiCard('Reale Entnahme (P10)', results.extraKPI.consumptionAtRiskP10Real, 'Worst-Case (10%-Quantil) der inflationsbereinigten Jahresentnahmen.');
        }
        dashboardHtml += '</div>';
    }
    dashboard.innerHTML = dashboardHtml;
    dashboard.style.display = 'block';

// --- Logik zur Anzeige der Stress-KPIs (überarbeitet) ---
    const stressKPIs = results.stressKPI;
    const existingStressContainer = document.getElementById('stressKpiResults');
    
    // Alten Container immer zuerst entfernen, um Duplikate zu vermeiden
    if (existingStressContainer) {
        existingStressContainer.remove();
    }

    // Neuen Container nur erstellen, wenn ein aktives Stress-Szenario lief
    if (stressKPIs && stressKPIs.years > 0 && stressKPIs.presetKey !== 'NONE') {
        const presetLabel = STRESS_PRESETS[stressKPIs.presetKey]?.label || 'Stress-Szenario';
        const newContainer = document.createElement('div');
        newContainer.id = 'stressKpiResults';
        
        let stressHtml = `
            <h3 class="unified-kpi-header" style="border-color: var(--danger-color);">Ergebnisse des Stress-Szenarios</h3>
            <div style="text-align: center; margin-bottom: 15px; font-size: 1rem;">
                <strong>${presetLabel}</strong> (betrifft die ersten ${stressKPIs.years} Jahre)
            </div>
            <div class="kpi-grid">
                ${createKpiCard('Max. Drawdown (Median, Stress)', stressKPIs.maxDD.p50, '%', `Größter Depot-Verlust während der ${stressKPIs.years}-jährigen Stressphase (Median).`, 'is-amber')}
                ${createKpiCard('Max. Drawdown (P90, Stress)', stressKPIs.maxDD.p90, '%', `90% der Läufe hatten einen geringeren Drawdown in der Stressphase.`, 'is-red')}
                ${createKpiCard('Zeit mit Quote >4.5% (Stress)', stressKPIs.timeShareAbove45.p50, '%', `Medianer Anteil der Stress-Jahre mit einer kritischen Entnahmerate.`, 'is-amber')}
            </div>
            <div class="kpi-grid" style="margin-top:15px;">
                ${createKpiCard('Kürzungsjahre >10% (Stress)', stressKPIs.cutYears.p50, 'Jahre', `Anzahl der Jahre mit >10% Flex-Kürzung im Stressfenster (Median).`, 'is-amber')}
                ${createCurrencyKpiCard('Consumption-at-Risk P10 (Stress)', stressKPIs.consumptionAtRiskP10Real.p50, `Inflationsbereinigte Jahresentnahme im P10 über die Stressjahre (Median).`, 'is-red')}
                ${createKpiCard('Erholung nach Stress (Median)', stressKPIs.recoveryYears.p50, 'Jahre', `Jahre vom Ende des Stressfensters bis die Entnahmerate wieder unter 3,5% fällt (Median).`)}
            </div>
        `;
        
        newContainer.innerHTML = stressHtml;
        dashboard.parentNode.insertBefore(newContainer, dashboard.nextSibling);
    }

	// 3. Heatmap oder alternative Ansicht rendern (mit Meta-Gate)
    const advancedDashboard = document.getElementById('advancedKpiDashboard');
    
    const timeShare = (results.extraKPI && typeof results.extraKPI.timeShareQuoteAbove45 === 'number')
        ? results.extraKPI.timeShareQuoteAbove45 : 0;


    // Szenario ist komplex und relevant -> detaillierte Heatmap anzeigen
    advancedDashboard.innerHTML = renderHeatmapSVG(
		results.heatmap,
		results.bins,
		anzahl,
		results.extraKPI,
		{ width: 980, height: 420 }
    );

    advancedDashboard.style.display = 'block';

    // 4. Pflege-KPIs
    const pflegeResultsContainer = document.getElementById('pflegeKpiResults');
    if (results.extraKPI?.pflege && inputs.pflegefallLogikAktivieren) {
        const pf = results.extraKPI.pflege;
        const summaryBox = document.getElementById('pflegeKpiSummary');
        let kpiHtml = createKpiCard('Pflegefall-Eintrittsquote', pf.entryRatePct, '%', 'Anteil der Simulationen, in denen ein Pflegefall eintritt.');
        kpiHtml += createKpiCard('Median Eintrittsalter', pf.entryAgeMedian > 0 ? pf.entryAgeMedian : null, 'Jahre', 'Typisches Alter bei Eintritt des Pflegefalls (nur betroffene Läufe).');
        kpiHtml += createKpiCard('Bedingte Shortfall-Rate', pf.shortfallRate_condCare, '%', 'Anteil der Fehlschläge, WENN ein Pflegefall eingetreten ist.');
        kpiHtml += createKpiCard('Shortfall-Rate (o. Pflege)', pf.shortfallRate_noCareProxy, '%', 'Geschätzte Fehlschlag-Rate der identischen Läufe, wenn kein Pflegefall eingetreten wäre.');
        kpiHtml += createCurrencyKpiCard('Median Endvermögen (m. Pflege)', pf.endwealthWithCare_median, 'Typisches Endvermögen unter Berücksichtigung des Pflegerisikos.');
        kpiHtml += createCurrencyKpiCard('Median Endvermögen (o. Pflege)', pf.endwealthNoCare_median, 'Geschätztes typisches Endvermögen ohne die Last des Pflegefalls.');
        kpiHtml += createCurrencyKpiCard('Median Gesamtkosten (Depot)', pf.depotCosts_median, 'Typische Summe der aus dem Depot finanzierten Pflege-Mehrkosten (nur betroffene Läufe).');
        summaryBox.innerHTML = kpiHtml;
        pflegeResultsContainer.style.display = 'block';
    } else {
        pflegeResultsContainer.style.display = 'none';
    }

    // 5. Worst-Run-Log mit Umschalter
    const worstContainer = document.getElementById('worstRunLogContainer');
    const worstEl = document.getElementById('worstRunLog');
    const controlsContainer = document.getElementById('worst-controls');
    
    const hasCareWorst = !!(worstRunCare && worstRunCare.hasCare && Array.isArray(worstRunCare.logDataRows) && worstRunCare.logDataRows.length > 0);
    
    // Toggle-Buttons nur einfügen, wenn sie noch nicht existieren
    if (controlsContainer && !document.getElementById('btnWorstAll')) {
        // Die Checkbox für Pflege-Details bleibt, die Buttons kommen davor
        controlsContainer.insertAdjacentHTML('afterbegin', renderWorstRunToggle(hasCareWorst));
    }

    let view = localStorage.getItem('worstRunView') || 'all';
    if (view === 'care' && !hasCareWorst) view = 'all'; // Fallback

    const paintWorst = () => {
        const wr = (view === 'care' && hasCareWorst) ? worstRunCare : worstRun;
        
        const btnAll = document.getElementById('btnWorstAll');
        const btnCare = document.getElementById('btnWorstCare');
        if (btnAll) btnAll.classList.toggle('active', view === 'all');
        if (btnCare) btnCare.classList.toggle('active', view === 'care');

        if (wr && Array.isArray(wr.logDataRows) && wr.logDataRows.length > 0) {
            const caR = results.extraKPI?.consumptionAtRiskP10Real;
            window.globalWorstRunData = { rows: wr.logDataRows, caR_Threshold: caR };
            const showCareDetails = (localStorage.getItem('showCareDetails') === '1');
            worstEl.textContent = renderWorstRunLog(wr.logDataRows, caR, { showCareDetails: showCareDetails });
            worstContainer.style.display = 'block';
        } else {
            worstContainer.style.display = 'none';
        }
    };

    const btnAll = document.getElementById('btnWorstAll');
    const btnCare = document.getElementById('btnWorstCare');
    if (btnAll && !btnAll.onclick) {
        btnAll.onclick = () => { view = 'all'; localStorage.setItem('worstRunView', 'all'); paintWorst(); };
    }
    if (btnCare && !btnCare.onclick && hasCareWorst) {
        btnCare.onclick = () => { view = 'care'; localStorage.setItem('worstRunView', 'care'); paintWorst(); };
    }
    
    paintWorst(); // Initiales Rendern

    // 6. Gesamten Ergebnis-Container sichtbar machen
    document.getElementById('monteCarloResults').style.display = 'block';
}

function renderWorstRunLog(logRows, caR_Threshold, opts = {}) {
    const options = { showCareDetails: false, ...opts };

    const formatPctOrDash = (value, fallback = '—') => {
        if (value == null || !isFinite(value)) return fallback;
        return `${Math.round(value * 100)}%`;
    };

    const baseCols = [
        { key: 'jahr', header: 'J.', width: 2 },
        { key: 'histJahr', header: 'Hist', width: 4 },
        { key: 'entscheidung.jahresEntnahme', header: 'Entn.', width: 7, fmt: formatCurrencyShortLog },
        { key: 'floor_brutto', header: 'Floor', width: 7, fmt: formatCurrencyShortLog },
        { key: 'pension_annual', header: 'Rente', width: 7, fmt: formatCurrencyShortLog },
    ];

    const careColsMinimal = [
        { key: 'pflege_grade', header: 'PG', width: 4, fmt: (v, row) => (row.pflege_aktiv ? `PG${v ?? '—'}` : '—'), title: 'Aktiver Pflegegrad' },
        { key: 'pflege_zusatz_floor', header: 'PflegeZiel', width: 10, fmt: formatCurrencyShortLog, title: "Zusatz-Floor in diesem Jahr (nominal), gecappt durch MaxPflege-Floor – Floor@Eintritt; wächst jährlich mit Inflation/Drift." },
        { key: 'pflege_kumuliert', header: 'PflegeΣ', width: 8, fmt: formatCurrencyShortLog, title: "Kumulierte Pflege-Mehrkosten (Zusatz-Floor-Deltas + Flex-Verlust), nominal." },
    ];

    const careColsDetailed = [
        { key: 'pflege_grade', header: 'PG', width: 4, fmt: (v, row) => (row.pflege_aktiv ? `PG${v ?? '—'}` : '—') },
        { key: 'pflege_grade_label', header: 'Grad', width: 16, fmt: (v, row) => (row.pflege_aktiv ? (v || `Pflegegrad ${row.pflege_grade ?? '?'}`) : '—') },
        { key: 'pflege_floor_anchor', header: 'Floor@Eintritt', width: 14, fmt: formatCurrencyShortLog },
        { key: 'pflege_maxfloor_anchor', header: 'MaxPflege@Jahr', width: 15, fmt: formatCurrencyShortLog },
        { key: 'pflege_cap_zusatz', header: 'CapZusatz@Jahr', width: 15, fmt: formatCurrencyShortLog },
        { key: 'pflege_delta_flex', header: 'PflegeΔ_Flex', width: 12, fmt: formatCurrencyShortLog },
        { key: 'pflege_zusatz_floor', header: 'PflegeZiel', width: 10, fmt: formatCurrencyShortLog, title: "Zusatz-Floor in diesem Jahr (nominal), gecappt durch MaxPflege-Floor – Floor@Eintritt; wächst jährlich mit Inflation/Drift." },
        { key: 'pflege_zusatz_floor_delta', header: 'PflegeΔ', width: 8, fmt: formatCurrencyShortLog },
        { key: 'pflege_kumuliert', header: 'PflegeΣ', width: 8, fmt: formatCurrencyShortLog, title: "Kumulierte Pflege-Mehrkosten (Zusatz-Floor-Deltas + Flex-Verlust), nominal." },
        { key: 'pflege_flex_faktor', header: 'FlexPfl%', width: 8, fmt: (v, row) => (row.pflege_aktiv ? formatPctOrDash(v) : '—') },
    ];

    const finalCols = [
        { key: 'FlexRatePct', header: 'Flex%', width: 5, fmt: v => `${Math.round(v || 0)}%` },
        { key: 'jahresentnahme_real', header: 'Entn_real', width: 9, fmt: formatCurrencyShortLog },
        { key: 'aktionUndGrund', header: 'Status', width: 22, fmt: (v, row) => {
            const alarmMarker = row.Alarm ? '(A) ' : '';
            const regimeShort = shortenText(Ruhestandsmodell_v30.CONFIG.SCENARIO_TEXT[row.Regime] || '');
            const status = `${alarmMarker}${row.CutReason || 'NONE'}/${regimeShort}`;
            return (v || status).substring(0, 21);
        }},
        { key: 'QuoteEndPct', header: 'Quote%', width: 6, fmt: v => `${(v || 0).toFixed(1)}%` },
        { key: 'RunwayCoveragePct', header: 'Runway%', width: 7, fmt: v => `${Math.round(v || 0)}%` },
        { key: 'RealReturnEquityPct', header: 'R.Aktien', width: 8, fmt: v => `${((v||0)*100).toFixed(1)}%` },
        { key: 'RealReturnGoldPct', header: 'R.Gold', width: 8, fmt: v => `${((v||0)*100).toFixed(1)}%` },
        { key: 'inflation', header: 'Infl.', width: 5, fmt: v => `${(v || 0).toFixed(1)}%` },
        // --- GEÄNDERT: Handelsspalten zu Netto-Werten zusammengefasst ---
        { key: null, header: 'Handl.A', width: 8,
          fmt: (v, row) => formatCurrencyShortLog((row.vk?.vkAkt || 0) - (row.kaufAkt || 0)) },
        { key: null, header: 'Handl.G', width: 8,
          fmt: (v, row) => formatCurrencyShortLog((row.vk?.vkGld || 0) - (row.kaufGld || 0)) },
        { key: 'steuern_gesamt', header: 'St.', width: 6, fmt: formatCurrencyShortLog },
        // --- ENDE ---
        { key: 'wertAktien', header: 'Aktien', width: 8, fmt: formatCurrencyShortLog },
        { key: 'wertGold', header: 'Gold', width: 7, fmt: formatCurrencyShortLog },
        { key: 'liquiditaet', header: 'Liq.', width: 7, fmt: formatCurrencyShortLog },
    ];
    
    const activeCareCols = options.showCareDetails ? careColsDetailed : careColsMinimal;
    const allCols = [...baseCols, ...activeCareCols, ...finalCols];

    const getNestedValue = (obj, path) => {
        if (!path) return obj;
        return path.split('.').reduce((o, k) => (o && o[k] != null) ? o[k] : undefined, obj);
    };

    let textHeader = allCols.map(c => c.header.padStart(c.width)).join("  ");
    let log = textHeader + "\n" + "=".repeat(textHeader.length) + "\n";

    for (const row of logRows) {
        const rowValues = allCols.map(col => {
            const rawValue = col.key === null ? null : getNestedValue(row, col.key); // Für berechnete Spalten null übergeben
            const formattedValue = col.fmt ? col.fmt(rawValue, row) : String(rawValue || '');
            return String(formattedValue).padStart(col.width);
        });
        
        const isBelowCaR = caR_Threshold !== undefined && row.jahresentnahme_real < caR_Threshold;
        log += rowValues.join("  ") + (isBelowCaR ? " <CaR!" : "") + "\n";
    }
    return log;
}

function portfolioTotal(p) {
  const sumTr = (arr) => Array.isArray(arr)
    ? arr.reduce((s, t) => s + (Number(t?.marketValue) || 0), 0)
    : 0;
  return sumTr(p?.depotTranchesAktien) + sumTr(p?.depotTranchesGold) + (Number(p?.liquiditaet) || 0);
}

/**
 * Rendert den Backtest-Log aus gespeicherten Daten
 */
function renderBacktestLog() {
    if (!window.globalBacktestData || !window.globalBacktestData.rows || window.globalBacktestData.rows.length === 0) {
        return;
    }

    const logDetailLevel = localStorage.getItem('logDetailLevel') || 'normal';
    const rows = window.globalBacktestData.rows;
    const startJahr = window.globalBacktestData.startJahr;

    const p = (str, len) => String(str).padStart(len);
    const pf = (val, len) => p(`${(val || 0).toFixed(1)}%`, len);
    const pfInt = (val, len) => p(`${Math.round(val || 0)}%`, len);

    // Header basierend auf Detail-Level
    let headerCols = [
        "Jahr".padEnd(4), "Entnahme".padStart(8), "Floor".padStart(7), "RenteSum".padStart(8)
    ];
    if (logDetailLevel === 'detailed') {
        headerCols.push("FloorDep".padStart(8));
    }
    headerCols.push("Flex%".padStart(5), "Flex".padStart(7));
    if (logDetailLevel === 'detailed') {
        headerCols.push("Entn_real".padStart(9));
    }
    headerCols.push(
        "Status".padEnd(16), "Quote%".padStart(6), "Runway%".padStart(7),
        "R.Aktien".padStart(8), "R.Gold".padStart(8), "Infl.".padStart(5),
        "Handl.A".padStart(8), "Handl.G".padStart(8), "St.".padStart(6),
        "Aktien".padStart(8), "Gold".padStart(7), "Liq.".padStart(7)
    );
    let header = headerCols.join("  ");
    let log = header + "\n" + "=".repeat(header.length) + "\n";

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const jahr = startJahr + i;

        if (row.isMissingData) {
            log += `${jahr}: Fehlende Daten.\n`;
            continue;
        }

        if (row.isRuin) {
            log += `${String(jahr).padEnd(5)}... RUIN ...\n`;
            continue;
        }

        const { entscheidung, wertAktien, wertGold, liquiditaet } = row;
        const netA = (row.vk?.vkAkt || 0) - (row.kaufAkt || 0);
        const netG = (row.vk?.vkGld || 0) - (row.kaufGld || 0);

        // Log-Zeile basierend auf Detail-Level
        let logCols = [
            p(jahr, 4),
            formatCurrencyShortLog(entscheidung.jahresEntnahme).padStart(8),
            formatCurrencyShortLog(row.floor_brutto).padStart(7),
            formatCurrencyShortLog(row.renteSum || row.pension_annual).padStart(8)
        ];
        if (logDetailLevel === 'detailed') {
            logCols.push(formatCurrencyShortLog(row.floor_aus_depot).padStart(8));
        }
        logCols.push(
            pfInt(row.FlexRatePct, 5),
            formatCurrencyShortLog(row.flex_erfuellt_nominal).padStart(7)
        );
        if (logDetailLevel === 'detailed') {
            logCols.push(formatCurrencyShortLog(row.jahresentnahme_real).padStart(9));
        }
        logCols.push(
            row.aktionUndGrund.substring(0,15).padEnd(16),
            pf(row.QuoteEndPct, 6),
            pfInt(row.RunwayCoveragePct, 7),
            pf((row.RealReturnEquityPct||0)*100, 8),
            pf((row.RealReturnGoldPct||0)*100, 8),
            pf(row.inflation, 5),
            formatCurrencyShortLog(netA).padStart(8),
            formatCurrencyShortLog(netG).padStart(8),
            formatCurrencyShortLog(row.steuern_gesamt || 0).padStart(6),
            formatCurrencyShortLog(wertAktien).padStart(8),
            formatCurrencyShortLog(wertGold).padStart(7),
            formatCurrencyShortLog(liquiditaet).padStart(7)
        );
        log += logCols.join("  ") + "\n";
    }

    document.getElementById('simulationLog').textContent = log;
}

// Mache die Funktion global verfügbar
window.renderBacktestLog = renderBacktestLog;

function runBacktest() {
     try {
        const extraKPI = document.getElementById('monteCarloResults').style.display === 'block' ? (window.lastMcRunExtraKPI || {}) : {};
        document.getElementById('btButton').disabled = true;
        const inputs = getCommonInputs();
        const startJahr = parseInt(document.getElementById('simStartJahr').value); const endJahr = parseInt(document.getElementById('simEndJahr').value);
        if (startJahr < 1973 || endJahr > 2024 || startJahr >= endJahr) {
            alert(`Fehler: Bitte einen gültigen Zeitraum eingeben.\n- Der Zeitraum muss zwischen 1973 und 2024 liegen.`);
            document.getElementById('btButton').disabled = false; return;
        }
        
        let simState = {
            portfolio: initializePortfolio(inputs),
            baseFloor: inputs.startFloorBedarf,
            baseFlex: inputs.startFlexBedarf,
            lastState: null,
            currentAnnualPension: 0,
            marketDataHist: { endeVJ: HISTORICAL_DATA[startJahr-1].msci_eur, endeVJ_1: HISTORICAL_DATA[startJahr-2].msci_eur, endeVJ_2: HISTORICAL_DATA[startJahr-3].msci_eur, endeVJ_3: HISTORICAL_DATA[startJahr-4].msci_eur, ath: 0, jahreSeitAth: 0, capeRatio: inputs.marketCapeRatio || 0 }
        };
        simState.marketDataHist.ath = Math.max(...Object.keys(HISTORICAL_DATA).filter(y => y < startJahr).map(y => HISTORICAL_DATA[y].msci_eur));

        let totalEntnahme = 0, kuerzungJahreAmStueck = 0, maxKuerzungStreak = 0, jahreMitKuerzung = 0, totalSteuern = 0;

        // Array zum Sammeln der Log-Daten
        const logRows = [];
        
        for (let jahr = startJahr; jahr <= endJahr; jahr++) {
            const dataVJ = HISTORICAL_DATA[jahr - 1];
            if (!dataVJ || !HISTORICAL_DATA[jahr]) {
                logRows.push({ isRuin: false, isMissingData: true, jahr });
                continue;
            }

            const jahresrenditeAktien = (HISTORICAL_DATA[jahr].msci_eur - dataVJ.msci_eur) / dataVJ.msci_eur;
            const jahresrenditeGold = (dataVJ.gold_eur_perf || 0) / 100;
            const yearData = { ...dataVJ, rendite: jahresrenditeAktien, gold_eur_perf: dataVJ.gold_eur_perf, zinssatz: dataVJ.zinssatz_de, inflation: dataVJ.inflation_de, jahr };

            const yearIndex = jahr - startJahr;
            const result = simulateOneYear(simState, inputs, yearData, yearIndex);

            if (result.isRuin) {
                logRows.push({ isRuin: true, jahr });
                if (BREAK_ON_RUIN) break;
            }

            simState = result.newState;
            totalSteuern += result.totalTaxesThisYear;
            const row = result.logData;
            const { entscheidung } = row;
            totalEntnahme += entscheidung.jahresEntnahme;

            // Speichere die Row-Daten mit Inflation für späteres Rendering
            row.inflation = dataVJ.inflation_de;
            logRows.push(row);

            if (entscheidung.kuerzungProzent >= 10) { jahreMitKuerzung++; kuerzungJahreAmStueck++; }
            else { maxKuerzungStreak = Math.max(maxKuerzungStreak, kuerzungJahreAmStueck); kuerzungJahreAmStueck = 0; }
        }
        maxKuerzungStreak = Math.max(maxKuerzungStreak, kuerzungJahreAmStueck);
        const endVermoegen = portfolioTotal(simState.portfolio);

        // Speichere die Log-Daten für späteres Re-Rendering
        window.globalBacktestData = { rows: logRows, startJahr: startJahr };

        document.getElementById('simulationResults').style.display = 'block';
        document.getElementById('simulationSummary').innerHTML = `
         <div class="summary-grid">
            <div class="summary-item"><strong>Startvermögen</strong><span>${formatCurrency(inputs.startVermoegen)}</span></div>
            <div class="summary-item"><strong>Endvermögen</strong><span>${formatCurrency(endVermoegen)}</span></div>
            <div class="summary-item highlight"><strong>Gesamte Entnahmen</strong><span>${formatCurrency(totalEntnahme)}</span></div>
            <div class="summary-item"><strong>Max. Kürzungsdauer</strong><span>${maxKuerzungStreak} Jahre</span></div>
            <div class="summary-item"><strong>Jahre mit Kürzung (>10%)</strong><span>${jahreMitKuerzung} von ${endJahr - startJahr + 1}</span></div>
            <div class="summary-item tax"><strong>Gezahlte Steuern</strong><span>${formatCurrency(totalSteuern)}</span></div>
        </div>`;

        // Rendere den Log
        renderBacktestLog();
    } catch (error) {
        alert("Ein Fehler ist im Backtest aufgetreten:\n\n" + error.message + "\n" + error.stack);
        console.error("Fehler in runBacktest():", error);
    } finally { document.getElementById('btButton').disabled = false; }
}

function selfCheckEngine() {
    if (typeof Ruhestandsmodell_v30 === 'undefined') {
        const footer = document.getElementById('engine-mismatch-footer');
        if (footer) {
            footer.textContent = `FEHLER: Die Engine-Datei 'engine.js' konnte nicht geladen werden!`;
            footer.style.display = 'block';
        }
        return;
    };
    
    const fnBody = Object.values(Ruhestandsmodell_v30).reduce((s, fn) => s + (typeof fn === 'function' ? fn.toString() : ''), '');
    let hash = 0;
    for (let i = 0; i < fnBody.length; i++) {
        hash = ((hash << 5) - hash) + fnBody.charCodeAt(i);
        hash |= 0; 
    }
    const currentHash = String(Math.abs(hash));
    const mismatch = Ruhestandsmodell_v30.VERSION !== ENGINE_VERSION;
    
    const footer = document.getElementById('engine-mismatch-footer');
    if (mismatch && footer) {
        footer.textContent = `WARNUNG: Engine-Version veraltet! Erwartet: ${ENGINE_VERSION}, gefunden: ${Ruhestandsmodell_v30.VERSION}`;
        footer.style.display = 'block';
    }
}

window.onload = function() {
    selfCheckEngine();
    prepareHistoricalData();
    
    // UI-Hilfsfunktion für Pflege-Cap
    function updatePflegeUIInfo() {
        const pflegeMaxFloorInput = document.getElementById('pflegeMaxFloor');
        let infoBadge = document.getElementById('pflegeInfoBadge');
        if (!infoBadge) {
            infoBadge = document.createElement('div');
            infoBadge.id = 'pflegeInfoBadge';
            infoBadge.style.fontSize = '0.8rem';
            infoBadge.style.color = '#555';
            infoBadge.style.textAlign = 'center';
            infoBadge.style.marginTop = '10px';
            infoBadge.style.padding = '5px';
            infoBadge.style.background = 'var(--background-color)';
            infoBadge.style.borderRadius = '4px';
            pflegeMaxFloorInput.parentElement.parentElement.appendChild(infoBadge);
        }

        const startFloor = parseFloat(document.getElementById('startFloorBedarf').value) || 0;
        const maxFloor = parseFloat(pflegeMaxFloorInput.value) || 0;
        const capHeute = Math.max(0, maxFloor - startFloor);

        const gradeNeeds = SUPPORTED_PFLEGE_GRADES.map(grade => {
            const value = parseFloat(document.getElementById(`pflegeStufe${grade}Zusatz`)?.value) || 0;
            return { grade, value };
        });
        const maxEntry = gradeNeeds.reduce((best, entry) => entry.value > best.value ? entry : best, { grade: null, value: 0 });
        const gradeLabel = maxEntry.grade ? (PFLEGE_GRADE_LABELS[maxEntry.grade] || `Pflegegrad ${maxEntry.grade}`) : 'Pflegegrad n/a';

        infoBadge.innerHTML = `Heutiger Cap für Zusatzkosten: <strong>${formatCurrency(capHeute)}</strong><br>` +
            `Höchster Bedarf: <strong>${formatCurrency(maxEntry.value)}</strong> (${gradeLabel})`;
    }
    
    updateStartPortfolioDisplay();
    
    const allInputs = [
        'simStartVermoegen', 'depotwertAlt', 'zielLiquiditaet',
        'goldAllokationAktiv', 'goldAllokationProzent', 'goldFloorProzent', 'rebalancingBand',
        'goldSteuerfrei', 'startFloorBedarf', 'startFlexBedarf',
        'einstandAlt', 'startAlter', 'geschlecht', 'startSPB', 'kirchensteuerSatz',
        'renteMonatlich', 'renteStartOffsetJahre', 'renteIndexierungsart',
        'pflegefallLogikAktivieren', 'pflegeModellTyp', ...CARE_GRADE_FIELD_IDS,
        'pflegeMaxFloor', 'pflegeRampUp', 'pflegeMinDauer', 'pflegeMaxDauer', 'pflegeKostenDrift',
        'pflegebeschleunigtMortalitaetAktivieren', 'pflegeTodesrisikoFaktor'
    ];
    allInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const eventType = (element.type === 'radio' || element.type === 'checkbox') ? 'change' : 'input';
            element.addEventListener(eventType, updateStartPortfolioDisplay);
        }
    });

    const pflegeInfoFields = ['startFloorBedarf', 'pflegeMaxFloor', ...CARE_GRADE_FIELD_IDS];
    pflegeInfoFields.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', updatePflegeUIInfo);
    });
    
    const pflegeMaxFloorInput = document.getElementById('pflegeMaxFloor');
    if(pflegeMaxFloorInput) {
        pflegeMaxFloorInput.title = 'Gesamt-Floor inkl. Pflege. Der maximal mögliche Zusatzbedarf ergibt sich aus diesem Wert abzüglich des Basis-Floor-Bedarfs zum Zeitpunkt des Pflegeeintritts.';
    }
    updatePflegeUIInfo();
    
    const mcMethodeSelect = document.getElementById('mcMethode');
    mcMethodeSelect.addEventListener('change', () => { document.getElementById('mcBlockSize').disabled = mcMethodeSelect.value !== 'block'; });
    const renteIndexArtSelect = document.getElementById('renteIndexierungsart');
    renteIndexArtSelect.addEventListener('change', () => { document.getElementById('festerSatzContainer').style.display = renteIndexArtSelect.value === 'fest' ? 'block' : 'none'; });
    const pflegeCheckbox = document.getElementById('pflegefallLogikAktivieren');
    pflegeCheckbox.addEventListener('change', () => { document.getElementById('pflegePanel').style.display = pflegeCheckbox.checked ? 'grid' : 'none'; });
    const pflegeModellSelect = document.getElementById('pflegeModellTyp');
    pflegeModellSelect.addEventListener('change', () => { document.getElementById('pflegeDauerContainer').style.display = pflegeModellSelect.value === 'akut' ? 'contents' : 'none'; });
    const pflegeMortalitaetCheckbox = document.getElementById('pflegebeschleunigtMortalitaetAktivieren');
    pflegeMortalitaetCheckbox.addEventListener('change', () => { document.getElementById('pflegeTodesrisikoContainer').style.display = pflegeMortalitaetCheckbox.checked ? 'flex' : 'none'; });
    
    // --- NEU: Listener und Initialisierung für die Pflege-Details-Checkbox ---
    const careDetailsCheckbox = document.getElementById('toggle-care-details');
    if (careDetailsCheckbox) {
        careDetailsCheckbox.checked = localStorage.getItem('showCareDetails') === '1';
        
        careDetailsCheckbox.addEventListener('change', (e) => {
            const showDetails = e.currentTarget.checked;
            localStorage.setItem('showCareDetails', showDetails ? '1' : '0');
            
            // Re-render worst-run log if data is available
            if (window.globalWorstRunData && window.globalWorstRunData.rows.length > 0) {
                 document.getElementById('worstRunLog').textContent = renderWorstRunLog(
                    window.globalWorstRunData.rows,
                    window.globalWorstRunData.caR_Threshold,
                    { showCareDetails: showDetails }
                );
            }
        });
    }
	
    const stressSelect = document.getElementById('stressPreset');
    if (stressSelect) {
        Object.entries(STRESS_PRESETS).forEach(([key, preset]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = preset.label;
            stressSelect.appendChild(option);
        });
    }	

    document.getElementById('mcBlockSize').disabled = mcMethodeSelect.value !== 'block';
    document.getElementById('festerSatzContainer').style.display = renteIndexArtSelect.value === 'fest' ? 'block' : 'none';
    document.getElementById('pflegePanel').style.display = pflegeCheckbox.checked ? 'grid' : 'none';
    document.getElementById('pflegeDauerContainer').style.display = pflegeModellSelect.value === 'akut' ? 'contents' : 'none';
    document.getElementById('pflegeTodesrisikoContainer').style.display = pflegeMortalitaetCheckbox.checked ? 'flex' : 'none';
};
