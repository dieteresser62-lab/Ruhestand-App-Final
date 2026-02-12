"use strict";

/**
 * Latin Hypercube Sampling für N-dimensionalen Parameter-Raum
 * @param {object} ranges - {param1: {min, max, step}, param2: {...}, ...}
 * @param {number} n - Anzahl Samples
 * @param {Function} rand - RNG-Funktion
 * @returns {Array<object>} Array von {param1: val, param2: val, ...}
 */
export function latinHypercubeSample(ranges, n, rand) {
    const params = Object.keys(ranges);

    if (params.length === 0) {
        throw new Error('At least 1 parameter required');
    }

    const samples = [];

    // Generiere Permutationen für jede Dimension
    const perms = params.map(() => {
        const perm = Array.from({ length: n }, (_, i) => i);
        // Fisher-Yates Shuffle
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [perm[i], perm[j]] = [perm[j], perm[i]];
        }
        return perm;
    });

    for (let i = 0; i < n; i++) {
        const sample = {};
        params.forEach((key, dim) => {
            const { min, max, step } = ranges[key];
            const bin = perms[dim][i];
            const binSize = (max - min) / n;
            const offset = rand() * binSize;
            const rawValue = min + bin * binSize + offset;

            // Snap to step grid
            const steppedValue = Math.round(rawValue / step) * step;
            sample[key] = Math.max(min, Math.min(max, steppedValue));
        });
        samples.push(sample);
    }

    return samples;
}

/**
 * Gibt Delta-Werte für einen Parameter-Key zurück (für Nachbarschafts-Generierung)
 * @param {string} key - Parameter-Key
 * @param {boolean} reduced - Reduzierte Deltas (true) oder volle Deltas (false)
 * @returns {Array<number>} Delta-Werte
 */
function getParameterDeltas(key, reduced = false) {
    const deltaMap = {
        runwayMinM: reduced ? [-2, 2] : [-4, -2, 2, 4],
        runwayTargetM: reduced ? [-2, 2] : [-4, -2, 2, 4],
        goldTargetPct: reduced ? [-1, 1] : [-2, -1, 1, 2],
        targetEq: reduced ? [-2, 2] : [-5, -2, 2, 5],
        rebalBand: reduced ? [-0.5, 0.5] : [-1, -0.5, 0.5, 1],
        maxSkimPct: reduced ? [-2, 2] : [-5, -2, 2, 5],
        maxBearRefillPct: reduced ? [-2, 2] : [-5, -2, 2, 5],
        horizonYears: reduced ? [-2, 2] : [-4, -2, 2, 4],
        survivalQuantile: reduced ? [-0.02, 0.02] : [-0.04, -0.02, 0.02, 0.04],
        goGoMultiplier: reduced ? [-0.05, 0.05] : [-0.1, -0.05, 0.05, 0.1]
    };
    return deltaMap[key] || (reduced ? [-1, 1] : [-2, -1, 1, 2]);
}

/**
 * Lokale Verfeinerung: Nachbarschaft eines Kandidaten generieren
 * @param {object} candidate - Parameter-Objekt
 * @param {object} ranges - Original-Ranges
 * @returns {Array<object>} Nachbarn
 */
/**
 * Reduzierte Nachbarschaft für schnellere Verfeinerung
 * @param {object} candidate - Parameter-Objekt
 * @param {object} ranges - Original-Ranges
 * @returns {Array<object>} Nachbarn (nur kleinere Deltas)
 */
export function generateNeighborsReduced(candidate, ranges) {
    const neighbors = [];

    // Für jeden Parameter im Kandidaten
    for (const [key, value] of Object.entries(candidate)) {
        if (!ranges[key]) continue; // Überspringe Parameter ohne Range

        const deltas = getParameterDeltas(key, true);
        for (const delta of deltas) {
            const newVal = value + delta;
            if (newVal >= ranges[key].min && newVal <= ranges[key].max) {
                neighbors.push({ ...candidate, [key]: newVal });
            }
        }
    }

    return neighbors;
}
