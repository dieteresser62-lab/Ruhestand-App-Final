"use strict";

/**
 * ===================================================================================
 * SHARED UTILITY FUNKTIONEN
 * ===================================================================================
 * Zentrale Sammlung von Hilfsfunktionen für Formatierung, Text-Verarbeitung
 * und mathematische Operationen. Diese Funktionen werden von verschiedenen
 * Modulen der App verwendet.
 * ===================================================================================
 */

// ===================================================================================
// FORMATIERUNGS-FUNKTIONEN
// ===================================================================================

// Intl.NumberFormat-Instanzen für Performance (einmalige Initialisierung)
const EUR_FORMATTER = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const EUR_FORMATTER_NO_DECIMAL = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const NUM_FORMATTER = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const PERCENT_FORMATTER = new Intl.NumberFormat('de-DE', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Formatiert einen Wert als Währung in EUR
 * @param {number} value - Zu formatierende Zahl
 * @returns {string} Formatierter String (z.B. "1.234,56 €") oder "N/A"
 * @example
 * formatCurrency(1234.56) // => "1.234,56 €"
 * formatCurrency(null)    // => "N/A"
 */
export function formatCurrency(value) {
    if (typeof value !== 'number' || !isFinite(value)) return 'N/A';
    return EUR_FORMATTER.format(value);
}

/**
 * Formatiert einen Wert als verkürzte Währung (z.B. 5000 € -> 5k €)
 * @param {number} value - Zu formatierende Zahl
 * @returns {string} Verkürzter formatierter String
 * @example
 * formatCurrencyShort(5000)   // => "5k €"
 * formatCurrencyShort(500)    // => "500 €"
 * formatCurrencyShort(0)      // => "0 €"
 */
export function formatCurrencyShort(value) {
    if (value === 0) return "0 €";
    if (value == null || !isFinite(value)) return "—";
    const valAbs = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    if (valAbs < 1000) {
        return EUR_FORMATTER_NO_DECIMAL.format(value);
    }
    return `${sign}${Math.round(valAbs / 1000)}k €`;
}

/**
 * Formatiert eine Zahl als Ganzzahl mit Tausendertrennern
 * @param {number} num - Zu formatierende Zahl
 * @returns {string} Formatierter String (z.B. "1.234")
 * @example
 * formatNumber(1234.56) // => "1.235"
 */
export function formatNumber(num) {
    return NUM_FORMATTER.format(Math.round(num));
}

/**
 * Formatiert einen Wert als Prozent
 * @param {number} value - Zu formatierende Zahl (0.05 = 5%)
 * @returns {string} Formatierter String (z.B. "5,0 %")
 * @example
 * formatPercent(0.055) // => "5,5 %"
 */
export function formatPercent(value) {
    if (typeof value !== 'number' || !isFinite(value)) return 'N/A';
    return PERCENT_FORMATTER.format(value);
}

/**
 * Parst einen Währungs-String zu einer Zahl
 * Unterstützt deutsches Format (1.234,56) und englisches Format (1,234.56)
 * @param {string} str - Zu parsender String
 * @returns {number} Geparste Zahl oder 0 bei Fehler
 * @example
 * parseCurrency("1.234,56 €") // => 1234.56
 * parseCurrency("invalid")    // => 0
 */
export function parseCurrency(str) {
    if (!str) return 0;
    const n = parseFloat(String(str).replace(/\./g, '').replace(',', '.'));
    return isFinite(n) ? n : 0;
}

// ===================================================================================
// TEXT-VERARBEITUNGS-FUNKTIONEN
// ===================================================================================

/**
 * Verkürzt Textbezeichnungen für kompakte Darstellung
 * @param {string} text - Zu verkürzender Text
 * @returns {string} Verkürzter Text
 * @example
 * shortenText("Markt heiß gelaufen") // => "HEISS"
 * shortenText("Stabiler Höchststand") // => "ATH"
 */
export function shortenText(text) {
    if (!text) return "";
    const map = {
        "Markt heiß gelaufen": "HEISS",
        "Stabiler Höchststand": "ATH",
        "Best. Erholung": "ERHOLUNG",
        "Erholung im Bärenmarkt": "REC_BÄR",
        "Junge Korrektur": "KORREKTUR",
        "Tiefer Bär": "BÄR",
        "Seitwärts Lang": "SEITWÄRTS"
    };
    for (const [key, value] of Object.entries(map)) {
        text = text.replace(key, value);
    }
    return text.replace("(Stagflation)", "(S)");
}

/**
 * Verkürzt Grund-Text für Transaktionen
 * @param {string} reason - Grund-Code (z.B. 'emergency', 'min_runway')
 * @param {string} szenario - Szenario-Beschreibung
 * @returns {string} Verkürzter kombinierter Text
 * @example
 * shortenReasonText('emergency', 'Stabiler Höchststand') // => "Notfall-Refill"
 */
export function shortenReasonText(reason, szenario) {
    const reasonMap = {
        'emergency': 'Notfall-Refill',
        'min_runway': 'MinRW-Refill',
        'target_gap': 'Puffer-Refill',
        'reinvest': 'Reinvest',
        'rebalance_up': 'Rebal.(G+)',
        'rebalance_down': 'Rebal.(G-)',
        'rebuild_gold': 'Gold-Wiederaufbau',
        'shortfall': 'DECKUNGSLÜCKE',
        'none': ''
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
}

// ===================================================================================
// MATHEMATISCHE HILFSFUNKTIONEN
// ===================================================================================

/**
 * Lineare Interpolation zwischen zwei Punkten
 * @param {number} x - Eingabewert
 * @param {number} x0 - Untere Grenze für x
 * @param {number} x1 - Obere Grenze für x
 * @param {number} y0 - Ausgabe bei x0
 * @param {number} y1 - Ausgabe bei x1
 * @returns {number} Interpolierter Wert
 */
export const lerp = (x, x0, x1, y0, y1) => y0 + (Math.min(Math.max(x, x0), x1) - x0) * (y1 - y0) / (x1 - x0);

/**
 * Summiert alle Elemente eines Arrays
 * @param {number[]} arr - Array von Zahlen
 * @returns {number} Summe
 */
export const sum = arr => arr.reduce((a, b) => a + b, 0);

/**
 * Berechnet den Mittelwert eines Arrays
 * @param {number[]} arr - Array von Zahlen
 * @returns {number} Mittelwert
 */
export const mean = arr => arr.length > 0 ? sum(arr) / arr.length : 0;

/**
 * Berechnet die Standardabweichung eines Arrays
 * @param {number[]} arr - Array von Zahlen
 * @returns {number} Standardabweichung
 */
export const stdDev = arr => {
    if (arr.length < 2) return 0;
    const mu = mean(arr);
    const diffArr = arr.map(a => (a - mu) ** 2);
    return Math.sqrt(sum(diffArr) / (arr.length - 1));
};

/**
 * Standardisiert ein Array (z-Score)
 * @param {number[]} arr - Array von Zahlen
 * @returns {number[]} Standardisiertes Array
 */
export const standardize = (arr) => {
    const mu = mean(arr);
    const sigma = stdDev(arr);
    return arr.map(x => sigma > 0 ? (x - mu) / sigma : 0);
};

/**
 * Berechnet die Korrelation zwischen zwei Arrays
 * @param {number[]} arr1 - Erstes Array
 * @param {number[]} arr2 - Zweites Array
 * @returns {number} Korrelationskoeffizient
 */
export const correlation = (arr1, arr2) => {
    if (arr1.length !== arr2.length || arr1.length < 2) return 0;
    const len = arr1.length;
    const xy = [], x = [], y = [], x2 = [], y2 = [];
    for (let i = 0; i < len; i++) {
        xy.push(arr1[i] * arr2[i]);
        x.push(arr1[i]);
        y.push(arr2[i]);
        x2.push(arr1[i] ** 2);
        y2.push(arr2[i] ** 2);
    }
    const num = len * sum(xy) - sum(x) * sum(y);
    const den = Math.sqrt((len * sum(x2) - sum(x) ** 2) * (len * sum(y2) - sum(y) ** 2));
    return den > 0 ? num / den : 0;
};

// ===================================================================================
// RANDOM & QUANTILE
// ===================================================================================

/**
 * Random Number Generator mit Seed
 * Supports forking for independent RNG streams
 * @param {number} seed - Seed-Wert
 * @returns {Function} RNG-Funktion
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

// ===================================================================================
// RANGE & CARTESIAN PRODUCT
// ===================================================================================

/**
 * Parse range string in format "start:step:end" to array of numbers
 * @param {string} rangeStr - Range string (e.g., "18:6:36")
 * @returns {number[]} Array of numbers
 */
export function parseRange(rangeStr) {
    if (!rangeStr || typeof rangeStr !== 'string') return [];
    const parts = rangeStr.trim().split(':');
    if (parts.length !== 3) return [];

    const [start, step, end] = parts.map(p => parseFloat(p.trim()));
    if (!isFinite(start) || !isFinite(step) || !isFinite(end)) return [];
    if (step <= 0) return [];
    if (start > end) return [];

    const result = [];
    for (let val = start; val <= end + 1e-9; val += step) {
        result.push(Math.round(val * 1e9) / 1e9);
    }
    return result;
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
 * Create Cartesian product of parameter arrays
 * @param {Object} paramRanges - Object with parameter names as keys and arrays as values
 * @returns {Object[]} Array of parameter combinations
 */
export function cartesianProduct(paramRanges) {
    const keys = Object.keys(paramRanges);
    if (keys.length === 0) return [];

    const result = [{}];
    for (const key of keys) {
        const values = paramRanges[key];
        if (!Array.isArray(values) || values.length === 0) continue;

        const newResult = [];
        for (const existing of result) {
            for (const value of values) {
                newResult.push({ ...existing, [key]: value });
            }
        }
        result.splice(0, result.length, ...newResult);
    }
    return result;
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

// ===================================================================================
// CONFIG HELPER
// ===================================================================================

/**
 * Holt einen Schwellenwert aus der Engine-Konfiguration
 * Fallback auf defaultValue, wenn Pfad nicht existiert
 *
 * @param {string} path - Pfad in der Config (z.B. "THRESHOLDS.ALARM.withdrawalRate")
 * @param {number} defaultValue - Fallback-Wert
 * @returns {number} Schwellenwert oder defaultValue
 *
 * @example
 * getThreshold('THRESHOLDS.ALARM.withdrawalRate', 0.055) // => 0.055
 */
export function getThreshold(path, defaultValue) {
    const config = (typeof window !== 'undefined') ?
        (window.EngineAPI?.getConfig() || window.Ruhestandsmodell_v30?.CONFIG) : null;
    if (!config || typeof path !== 'string') {
        return defaultValue;
    }
    const value = path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, config);
    return (typeof value === 'number') ? value : defaultValue;
}

/**
 * Liefert eine menschenlesbare Beschreibung für die Quelle eines Runway-Ziels.
 *
 * @param {string} sourceKey - Maschineller Source-Key (z.B. "input" oder "profil:peak_hot").
 * @returns {{ label: string, description: string }} Beschreibender Text für UI/Export.
 */
export function describeRunwayTargetSource(sourceKey) {
    const fallback = {
        label: 'Unbekannt (Legacy)',
        description: 'Quelle konnte nicht bestimmt werden – bitte Zielwerte prüfen.'
    };

    if (typeof sourceKey !== 'string' || !sourceKey.trim()) {
        return fallback;
    }

    const normalized = sourceKey.trim().toLowerCase();
    const staticMap = {
        input: {
            label: 'Manueller Input',
            description: 'Runway-Ziel wurde direkt in den Profil-Inputs definiert.'
        },
        fallback: {
            label: 'Fallback (Minimum)',
            description: 'Es wurde auf den minimalen Runway-Wert des Profils zurückgegriffen.'
        },
        unknown: fallback,
        legacy: fallback
    };

    if (normalized.startsWith('profil:')) {
        const regime = normalized.split(':')[1] || 'unbekanntes Regime';
        return {
            label: `Profil (Regime: ${regime})`,
            description: 'Dynamisches Profil-Ziel abhängig vom aktuellen Marktregime.'
        };
    }

    return staticMap[normalized] || fallback;
}
