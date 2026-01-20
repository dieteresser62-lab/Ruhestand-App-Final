"use strict";

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
    // 1. Höhere Success Rate
    const srA = a.results.successProbFloor ?? 0;
    const srB = b.results.successProbFloor ?? 0;
    if (Math.abs(srA - srB) > 0.001) return srB - srA > 0 ? 1 : -1;

    // 2. Niedrigerer Drawdown P90
    const ddA = a.results.drawdown?.p90 ?? 0;
    const ddB = b.results.drawdown?.p90 ?? 0;
    if (Math.abs(ddA - ddB) > 0.001) return ddA - ddB > 0 ? 1 : -1;

    // 3. Niedrigerer TimeShare > 4.5%
    const tsA = a.results.timeShareWRgt45 ?? 0;
    const tsB = b.results.timeShareWRgt45 ?? 0;
    if (Math.abs(tsA - tsB) > 0.0001) return tsA - tsB > 0 ? 1 : -1;

    return 0;
}
