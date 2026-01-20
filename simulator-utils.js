"use strict";

// --- UI & UTILITIES ---

export {
    formatCurrency,
    formatCurrencyShortLog,
    formatCurrencyRounded
} from './simulator-formatting.js';

/**
 * Verkürzt Textbezeichnungen für kompakte Darstellung
 */
export const shortenText = (text) => {
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

/**
 * Verkürzt Grund-Text für Transaktionen
 */
export const shortenReasonText = (reason, szenario) => {
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

/**
 * Lineare Interpolation
 */
export const lerp = (x, x0, x1, y0, y1) => y0 + (Math.min(Math.max(x, x0), x1) - x0) * (y1 - y0) / (x1 - x0);

/**
 * Mathematische Hilfsfunktionen
 */
export const sum = arr => arr.reduce((a, b) => a + b, 0);
export const mean = arr => arr.length > 0 ? sum(arr) / arr.length : 0;

/**
 * Random Number Generator mit Seed
 * Supports forking for independent RNG streams
 */
export function rng(seed = 123456789) {
    let x = seed | 0;
    const generator = () => (x = (x ^= (x << 13)), x ^= (x >>> 17), x ^= (x << 5), ((x >>> 0) % 1e9) / 1e9);

    // Fork: creates a new independent RNG stream with derived seed
    generator.fork = (label = '') => {
        let derivedSeed = x;
        for (let i = 0; i < label.length; i++) {
            derivedSeed = ((derivedSeed << 5) - derivedSeed + label.charCodeAt(i)) | 0;
        }
        return rng(derivedSeed);
    };

    return generator;
}

export const RUNIDX_COMBO_SETUP = 0x7fffffff;

function normalizeSeed(value) {
    return (Number.isFinite(value) ? value : 0) >>> 0;
}

function mix32(x) {
    let h = x >>> 0;
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
}

export function makeRunSeed(baseSeed, comboIdx, runIdx) {
    const base = normalizeSeed(baseSeed);
    const combo = normalizeSeed(comboIdx);
    const run = normalizeSeed(runIdx);
    let h = mix32(base ^ mix32(combo + 0x9e3779b9));
    h = mix32(h ^ mix32(run + 0x85ebca6b));
    return h >>> 0;
}

/**
 * Berechnet ein Quantil performant mithilfe des Quickselect-Algorithmus.
 * @param {Float64Array|number[]} arr - Das Array von Zahlen.
 * @param {number} q - Das Quantil (z.B. 0.5 für Median).
 * @returns {number} Der Wert am angegebenen Quantil.
 */
export function quantile(arr, q) {
    if (!arr || arr.length === 0) return 0;
    const sorted = new Float64Array(arr);
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

/**
 * Parse range input with multiple formats:
 * - "start:step:end" (e.g., "18:6:36") -> [18, 24, 30, 36]
 * - "a,b,c" (e.g., "50,60,70") -> [50, 60, 70]
 * - "x" (e.g., "24") -> [24]
 * @param {string} str - Range input string
 * @returns {number[]} Array of numbers
 * @throws {Error} If input format is invalid
 */
export function parseRangeInput(str) {
    if (!str || typeof str !== 'string') {
        return [];
    }

    const trimmed = str.trim();
    if (!trimmed) {
        return [];
    }

    // Format: start:step:end
    if (trimmed.includes(':')) {
        const parts = trimmed.split(':');
        if (parts.length !== 3) {
            throw new Error(`Ungültiges Range-Format: "${str}". Erwartet: start:step:end (z.B. 18:6:36)`);
        }

        const [start, step, end] = parts.map(p => parseFloat(p.trim()));

        if (!isFinite(start) || !isFinite(step) || !isFinite(end)) {
            throw new Error(`Ungültiges Range-Format: "${str}". Alle Werte müssen Zahlen sein.`);
        }

        if (step <= 0) {
            throw new Error(`Ungültiges Range-Format: "${str}". Step muss > 0 sein.`);
        }

        if (start > end) {
            throw new Error(`Ungültiges Range-Format: "${str}". Start muss <= End sein.`);
        }

        // Edge case: start == end
        if (start === end) {
            return [start];
        }

        const result = [];
        for (let val = start; val <= end + 1e-9; val += step) {
            result.push(Math.round(val * 1e9) / 1e9);
        }
        return result;
    }

    // Format: a,b,c (comma-separated list)
    if (trimmed.includes(',')) {
        const parts = trimmed.split(',');
        const values = parts.map(p => parseFloat(p.trim()));

        if (values.some(v => !isFinite(v))) {
            throw new Error(`Ungültiges Range-Format: "${str}". Alle Werte müssen Zahlen sein.`);
        }

        return values;
    }

    // Format: x (single value)
    const singleValue = parseFloat(trimmed);
    if (!isFinite(singleValue)) {
        throw new Error(`Ungültiges Range-Format: "${str}". Erwartet: Zahl, Kommaliste (a,b,c) oder Range (start:step:end)`);
    }

    return [singleValue];
}

/**
 * Create Cartesian product of arrays with limit checking
 * @param {Array[]} arrays - Arrays to create product from
 * @param {number} limit - Maximum number of combinations
 * @returns {Object} { combos: any[][], tooMany: boolean, size: number }
 */
export function cartesianProductLimited(arrays, limit) {
    if (!Array.isArray(arrays) || arrays.length === 0) {
        return { combos: [], tooMany: false, size: 0 };
    }

    // Calculate theoretical size
    let size = 1;
    for (const arr of arrays) {
        if (!Array.isArray(arr) || arr.length === 0) {
            return { combos: [], tooMany: false, size: 0 };
        }
        size *= arr.length;
    }

    const tooMany = size > limit;

    // If too many, return immediately without generating
    if (tooMany) {
        return { combos: [], tooMany: true, size };
    }

    // Generate combinations
    const result = [[]];
    for (const arr of arrays) {
        const newResult = [];
        for (const existing of result) {
            for (const value of arr) {
                newResult.push([...existing, value]);
            }
        }
        result.splice(0, result.length, ...newResult);
    }

    return { combos: result, tooMany: false, size };
}
