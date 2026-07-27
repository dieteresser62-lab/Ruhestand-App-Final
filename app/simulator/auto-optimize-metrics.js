"use strict";

export const AUTO_OPTIMIZE_METRIC_RESULT_VERSION = 'AutoOptimizeMetricResultV1';

function metricContractError(message, code = 'AUTO_OPTIMIZE_METRIC_UNAVAILABLE') {
    const error = new Error(message);
    error.code = code;
    return error;
}

export function readAutoOptimizeMetricValue(results, key) {
    const value = results?.[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function requireAutoOptimizeMetricValue(results, key, label = key) {
    const value = readAutoOptimizeMetricValue(results, key);
    if (value === null) {
        throw metricContractError(`${label} fehlt im Auto-Optimize-Metrikresultat.`);
    }
    return value;
}

function resolveEndWealthQuantilePct(metric, quantile) {
    const namedQuantile = metric === 'EndWealth_P25' ? 25 : 50;
    if (quantile === null || quantile === undefined || quantile === '') return namedQuantile;
    const requested = Number(quantile);
    if (!Number.isInteger(requested) || requested < 1 || requested > 99) {
        throw metricContractError(
            'Endvermoegensquantil muss als ganze Prozentzahl zwischen 1 und 99 vorliegen.',
            'AUTO_OPTIMIZE_QUANTILE_INVALID'
        );
    }
    // Das bestehende UI-Feld startet bei 50. Beim benannten P25-Selector ist
    // dieser unveraenderte Default kein Override, sondern der P25-Vertrag.
    if (metric === 'EndWealth_P25' && requested === 50) return 25;
    return requested;
}

function readEndWealthQuantile(results, metric, quantile) {
    const pct = resolveEndWealthQuantilePct(metric, quantile);
    const selected = results?.endWealthQuantilesPct?.[pct];
    if (typeof selected === 'number' && Number.isFinite(selected)) {
        return selected;
    }
    const canonicalFallbackKey = pct === 10
        ? 'p10EndWealth'
        : pct === 25
            ? 'p25EndWealth'
            : pct === 50
                ? 'medianEndWealth'
                : null;
    if (canonicalFallbackKey) {
        return requireAutoOptimizeMetricValue(results, canonicalFallbackKey, `Endvermoegen P${pct}`);
    }
    throw metricContractError(`Endvermoegen P${pct} fehlt im Auto-Optimize-Metrikresultat.`);
}

/**
 * Extrahiert Metriken aus aggregierten MC-Ergebnissen
 * @param {object} results - Aggregierte MC-Ergebnisse (FLACHE Struktur!)
 * @param {object} objective - {metric, direction, quantile}
 * @returns {number} Metrikwert
 */
export function getObjectiveValue(results, objective) {
    const { metric, direction, quantile } = objective;
    let value;

    switch (metric) {
        case 'EndWealth_P50':
        case 'EndWealth_P25':
            value = readEndWealthQuantile(results, metric, quantile);
            break;
        case 'SuccessRate':
            value = requireAutoOptimizeMetricValue(results, 'successProbFloor', 'Success Rate');
            break;
        case 'Drawdown_P90':
            value = requireAutoOptimizeMetricValue(results, 'worst5Drawdown', 'Drawdown P90');
            break;
        case 'TimeShare_WR_gt_4_5':
            value = requireAutoOptimizeMetricValue(results, 'timeShareWRgt45', 'Time Share WR > 4,5 %');
            break;
        case 'Median_WR':
            value = requireAutoOptimizeMetricValue(results, 'medianWithdrawalRate', 'Median Withdrawal Rate');
            break;
        default:
            throw new Error(`Unknown metric: ${metric}`);
    }

    if (direction !== 'max' && direction !== 'min') {
        throw metricContractError(
            `Unbekannte Optimierungsrichtung: ${String(direction)}`,
            'AUTO_OPTIMIZE_DIRECTION_INVALID'
        );
    }
    // Bei "min" negieren wir, damit Maximierung funktioniert
    return direction === 'max' ? value : -value;
}

/**
 * Prüft Constraints
 * @param {object} results - Aggregierte MC-Ergebnisse (FLACHE Struktur!)
 * @param {object} constraints - {sr99, noex, ts45, dd55}
 * @returns {boolean} true wenn alle aktiven Constraints erfüllt
 */
export function checkConstraints(results, constraints) {
    if (constraints.sr99) {
        const sr = readAutoOptimizeMetricValue(results, 'successProbFloor');
        if (sr === null) return false;
        if (sr < 0.99) return false;
    }

    if (constraints.noex) {
        const exhaustionRate = readAutoOptimizeMetricValue(results, 'depletionRate');
        if (exhaustionRate === null) return false;
        if (exhaustionRate > 0.005) return false; // > 0.5% (relaxed from 0% for practicality)
    }

    if (constraints.ts45) {
        const ts = readAutoOptimizeMetricValue(results, 'timeShareWRgt45');
        if (ts === null) return false;
        if (ts > 0.01) return false; // > 1%
    }

    if (constraints.dd55) {
        const dd = readAutoOptimizeMetricValue(results, 'worst5Drawdown');
        if (dd === null) return false;
        if (dd > 0.55) return false; // > 55%
    }

    return true;
}
