"use strict";

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
            value = results.medianEndWealth ?? 0;
            break;
        case 'EndWealth_P25':
            value = results.p25EndWealth ?? 0;
            break;
        case 'SuccessRate':
            value = results.successProbFloor ?? 0;
            break;
        case 'Drawdown_P90':
            value = results.worst5Drawdown ?? 0;
            break;
        case 'TimeShare_WR_gt_4_5':
            value = results.timeShareWRgt45 ?? 0;
            break;
        case 'Median_WR':
            value = results.medianWithdrawalRate ?? 0;
            break;
        default:
            throw new Error(`Unknown metric: ${metric}`);
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
        const sr = results.successProbFloor ?? 0;
        if (sr < 0.99) return false;
    }

    if (constraints.noex) {
        const exhaustionRate = results.depletionRate ?? 0;
        if (exhaustionRate > 0.005) return false; // > 0.5% (relaxed from 0% for practicality)
    }

    if (constraints.ts45) {
        const ts = results.timeShareWRgt45 ?? 0;
        if (ts > 0.01) return false; // > 1%
    }

    if (constraints.dd55) {
        const dd = results.worst5Drawdown ?? 0;
        if (dd > 0.55) return false; // > 55%
    }

    return true;
}
