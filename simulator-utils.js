"use strict";

// --- UI & UTILITIES ---

/**
 * Formatiert einen Wert als Währung in EUR
 */
export const formatCurrency = (value) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);

/**
 * Formatiert einen Wert als verkürzte Währung (z.B. 5000 € -> 5k €)
 */
export const formatCurrencyShortLog = (value) => {
  if (value === 0) return "0 €";
  if (value == null || !isFinite(value)) return "—";
  const valAbs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (valAbs < 1000) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  }
  return `${sign}${Math.round(valAbs / 1000)}k €`;
};

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
export const stdDev = arr => {
    if (arr.length < 2) return 0;
    const mu = mean(arr);
    const diffArr = arr.map(a => (a - mu) ** 2);
    return Math.sqrt(sum(diffArr) / (arr.length -1));
};
export const standardize = (arr) => {
    const mu = mean(arr);
    const sigma = stdDev(arr);
    return arr.map(x => sigma > 0 ? (x - mu) / sigma : 0);
};
export const correlation = (arr1, arr2) => {
    if (arr1.length !== arr2.length || arr1.length < 2) return 0;
    const len = arr1.length;
    const xy = [], x = [], y = [], x2 = [], y2 = [];
    for(let i=0; i<len; i++) {
        xy.push(arr1[i]*arr2[i]);
        x.push(arr1[i]);
        y.push(arr2[i]);
        x2.push(arr1[i]**2);
        y2.push(arr1[i]**2);
    }
    const num = len * sum(xy) - sum(x) * sum(y);
    const den = Math.sqrt((len*sum(x2) - sum(x)**2) * (len*sum(y2) - sum(y)**2));
    return den > 0 ? num/den : 0;
};

/**
 * Random Number Generator mit Seed
 */
export function rng(seed=123456789){
    let x=seed|0;
    return ()=> (x = (x^=(x<<13)), x^=(x>>>17), x^=(x<<5), ((x>>>0)%1e9)/1e9);
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
