"use strict";

import {
    AUTO_OPTIMIZE_METRIC_RESULT_VERSION,
    requireAutoOptimizeMetricValue
} from './auto-optimize-metrics.js';

/**
 * Memo-Cache für evaluierte Kandidaten
 */
export class CandidateCache {
    constructor() {
        this.cache = new Map();
    }

    key(candidate) {
        // Dynamically generate cache key from all parameter keys (sorted for consistency)
        const keys = Object.keys(candidate).sort();
        return keys.map(k => `${k}:${candidate[k]}`).join('|');
    }

    has(candidate) {
        return this.cache.has(this.key(candidate));
    }

    get(candidate) {
        return this.cache.get(this.key(candidate));
    }

    set(candidate, results) {
        this.cache.set(this.key(candidate), results);
    }
}

/**
 * Tie-Breaker: Wenn Objective gleich, nutze sekundäre Kriterien
 * @param {object} a - Kandidat A mit results
 * @param {object} b - Kandidat B mit results
 * @returns {number} -1 wenn a besser, 1 wenn b besser, 0 wenn gleich
 */
export function tieBreaker(a, b) {
    const contractA = a?.results?.metricContract?.schemaVersion;
    const contractB = b?.results?.metricContract?.schemaVersion;
    if (contractA !== AUTO_OPTIMIZE_METRIC_RESULT_VERSION
        || contractB !== AUTO_OPTIMIZE_METRIC_RESULT_VERSION) {
        const error = new Error('Tiebreaker erwartet zwei kompatible versionierte Auto-Optimize-Metrikresultate.');
        error.code = 'AUTO_OPTIMIZE_TIEBREAKER_CONTRACT_MISMATCH';
        throw error;
    }

    // 1. Höhere Success Rate
    const srA = requireAutoOptimizeMetricValue(a?.results, 'successProbFloor', 'Success Rate A');
    const srB = requireAutoOptimizeMetricValue(b?.results, 'successProbFloor', 'Success Rate B');
    if (Math.abs(srA - srB) > 0.001) return srB - srA > 0 ? 1 : -1;

    // 2. Niedrigerer Drawdown P90
    const ddA = requireAutoOptimizeMetricValue(a?.results, 'worst5Drawdown', 'Drawdown P90 A');
    const ddB = requireAutoOptimizeMetricValue(b?.results, 'worst5Drawdown', 'Drawdown P90 B');
    if (Math.abs(ddA - ddB) > 0.001) return ddA - ddB > 0 ? 1 : -1;

    // 3. Niedrigerer TimeShare > 4.5%
    const tsA = requireAutoOptimizeMetricValue(a?.results, 'timeShareWRgt45', 'Time Share WR > 4,5 % A');
    const tsB = requireAutoOptimizeMetricValue(b?.results, 'timeShareWRgt45', 'Time Share WR > 4,5 % B');
    if (Math.abs(tsA - tsB) > 0.0001) return tsA - tsB > 0 ? 1 : -1;

    return 0;
}
