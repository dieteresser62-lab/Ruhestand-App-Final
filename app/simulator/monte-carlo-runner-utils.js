"use strict";

export const MC_HEATMAP_BINS = [0, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 10, Infinity];

export function pickWorstRun(current, candidate) {
    if (!current) return candidate;
    if (!candidate) return current;
    if (candidate.finalVermoegen < current.finalVermoegen) return candidate;
    if (candidate.finalVermoegen > current.finalVermoegen) return current;
    const currentCombo = Number.isFinite(current.comboIdx) ? current.comboIdx : 0;
    const candidateCombo = Number.isFinite(candidate.comboIdx) ? candidate.comboIdx : 0;
    if (candidateCombo < currentCombo) return candidate;
    if (candidateCombo > currentCombo) return current;
    const currentRun = Number.isFinite(current.runIdx) ? current.runIdx : 0;
    const candidateRun = Number.isFinite(candidate.runIdx) ? candidate.runIdx : 0;
    return candidateRun < currentRun ? candidate : current;
}

export function createMonteCarloBuffers(runCount) {
    return {
        finalOutcomes: new Float64Array(runCount),
        taxOutcomes: new Float64Array(runCount),
        kpiLebensdauer: new Uint8Array(runCount),
        kpiKuerzungsjahre: new Float32Array(runCount),
        kpiMaxKuerzung: new Float32Array(runCount),
        volatilities: new Float32Array(runCount),
        maxDrawdowns: new Float32Array(runCount),
        depotErschoepft: new Uint8Array(runCount),
        alterBeiErschoepfung: new Uint8Array(runCount).fill(255),
        anteilJahreOhneFlex: new Float32Array(runCount),
        stress_maxDrawdowns: new Float32Array(runCount),
        stress_timeQuoteAbove45: new Float32Array(runCount),
        stress_cutYears: new Float32Array(runCount),
        stress_CaR_P10_Real: new Float64Array(runCount),
        stress_recoveryYears: new Float32Array(runCount)
    };
}
