/**
 * Module: Shared Formatting
 * Purpose: Central utility for currency and number formatting (de-DE).
 *          Provides consistent formatting for UI displays (e.g. "5k €", rounded numbers).
 * Usage: Imported by various UI and logic modules.
 * Dependencies: Intl.NumberFormat
 */
"use strict";

const EUR_FORMATTER = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const EUR_NO_DEC_FORMATTER = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
});
const NUM_FORMATTER = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

export { EUR_FORMATTER, EUR_NO_DEC_FORMATTER, NUM_FORMATTER };

/**
 * Formatiert einen Wert als Währung in EUR.
 */
export const formatCurrency = (value) => EUR_FORMATTER.format(value);

/**
 * Formatiert einen Wert als verkürzte Währung (z.B. 5000 € -> 5k €).
 */
export const formatCurrencyShortLog = (value) => {
    if (value === 0) return "0 €";
    if (value == null || !isFinite(value)) return "—";
    const valAbs = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    if (valAbs < 1000) {
        return EUR_NO_DEC_FORMATTER.format(value);
    }
    return `${sign}${Math.round(valAbs / 1000)}k €`;
};

/**
 * Formatiert einen Wert als gerundete Währung (Anti-Pseudo-Accuracy) für KPIs.
 * Tiers: <10k: 1k, <50k: 5k, <200k: 10k, >200k: 25k
 */
export const formatCurrencyRounded = (value) => {
    if (value == null || !isFinite(value)) return "—";
    const valAbs = Math.abs(value);
    const sign = value < 0 ? -1 : 1;

    let step = 1000;
    if (valAbs >= 200000) {
        step = 25000;
    } else if (valAbs >= 50000) {
        step = 10000;
    } else if (valAbs >= 10000) {
        step = 5000;
    }

    // Kaufmännisch runden auf den nächsten Step
    const roundedAbs = Math.round(valAbs / step) * step;
    const result = roundedAbs * sign;

    return EUR_NO_DEC_FORMATTER.format(result);
};

/**
 * Formatiert eine Zahl als Ganzzahl mit Tausendertrennern.
 */
export const formatNumber = (num) => NUM_FORMATTER.format(Math.round(num));

/**
 * Formatiert Prozentwerte mit einstellbarer Skalierung.
 */
export function formatPercent(value, options = {}) {
    const { fractionDigits = 1, scale = 1, prefixPlus = false, invalid = 'N/A' } = options;
    if (typeof value !== 'number' || !isFinite(value)) {
        return invalid;
    }
    const sign = value > 0 ? '+' : '';
    return `${prefixPlus ? sign : ''}${(value * scale).toFixed(fractionDigits)}%`;
}

/**
 * Formatiert einen Prozentwert, der bereits in Prozent (0..100) vorliegt.
 */
export function formatPercentValue(value, options = {}) {
    const { scale, ...rest } = options;
    return formatPercent(value, { ...rest, scale: 1 });
}

/**
 * Formatiert einen Prozentwert aus einem Ratio (0..1).
 */
export function formatPercentRatio(value, options = {}) {
    const { scale, ...rest } = options;
    return formatPercent(value, { ...rest, scale: 100 });
}

/**
 * Formatiert Monatswerte mit Suffix.
 */
export function formatMonths(value, options = {}) {
    const { fractionDigits = 0, invalid = 'N/A', suffix = 'Mon.' } = options;
    if (typeof value !== 'number' || !isFinite(value)) {
        return invalid;
    }
    return `${value.toFixed(fractionDigits)} ${suffix}`;
}

/**
 * Formatiert einen numerischen Wert mit optionaler Einheit und Dezimalstellen.
 */
export function formatNumberWithUnit(value, unit = '', fractionDigits = 1) {
    if (value == null || !isFinite(value)) {
        return '—';
    }
    const formatted = Number(value).toFixed(fractionDigits).replace('.', ',');
    return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Gibt einen Prozentwert mit Standard-Formatierung aus.
 */
export function formatPercentage(value) {
    return formatNumberWithUnit(value, '%');
}
