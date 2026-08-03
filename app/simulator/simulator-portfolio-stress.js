/**
 * Module: Simulator Portfolio Stress
 * Purpose: Applying stress tests to market data.
 *          Handles conditional bootstrapping and parametric modifications (e.g., rebound caps).
 * Usage: Called by simulator-portfolio.js facade.
 * Dependencies: simulator-data.js
 */
"use strict";

import { STRESS_PRESETS, annualData, simulatorDataContractError } from './simulator-data.js';

function matchesStressFilter(dataPoint, filter) {
    const realReturnPct = (dataPoint.rendite * 100) - dataPoint.inflation;
    return (filter.yearMin === undefined || dataPoint.jahr >= filter.yearMin)
        && (filter.yearMax === undefined || dataPoint.jahr <= filter.yearMax)
        && (filter.inflationMin === undefined || dataPoint.inflation >= filter.inflationMin)
        && (filter.equityRealMax === undefined || realReturnPct <= filter.equityRealMax);
}

function enforceMinimumConsecutiveCluster(matches, minimumCluster) {
    if (!Number.isInteger(minimumCluster) || minimumCluster <= 1) {
        return matches.map(match => match.index);
    }
    const allowed = new Set();
    let cluster = [];
    const flush = () => {
        if (cluster.length >= minimumCluster) cluster.forEach(match => allowed.add(match.index));
        cluster = [];
    };
    for (const match of matches) {
        if (cluster.length === 0 || match.jahr === cluster[cluster.length - 1].jahr + 1) cluster.push(match);
        else {
            flush();
            cluster.push(match);
        }
    }
    flush();
    return matches.map(match => match.index).filter(index => allowed.has(index));
}

export function resolveStressHistoricalPool(presetKey, data = annualData) {
    const normalizedPresetKey = presetKey == null || presetKey === '' ? 'NONE' : presetKey;
    if (!Object.prototype.hasOwnProperty.call(STRESS_PRESETS, normalizedPresetKey)) {
        throw simulatorDataContractError(
            'SIMULATOR_STRESS_PRESET_UNKNOWN',
            `Unknown stress preset ${String(normalizedPresetKey)}.`
        );
    }
    const preset = STRESS_PRESETS[normalizedPresetKey];
    if (preset.type !== 'conditional_bootstrap') {
        return Object.freeze({
            presetKey: normalizedPresetKey,
            type: preset.type,
            minimumDistinctYears: 0,
            candidateIndices: Object.freeze([]),
            candidateYears: Object.freeze([])
        });
    }
    const matches = data
        .map((entry, index) => ({ ...entry, index }))
        .filter(entry => matchesStressFilter(entry, preset.filter));
    const candidateIndices = enforceMinimumConsecutiveCluster(matches, preset.filter.minCluster);
    const candidateYears = candidateIndices.map(index => Number(data[index]?.jahr));
    return Object.freeze({
        presetKey: normalizedPresetKey,
        type: preset.type,
        minimumDistinctYears: Math.min(3, preset.years),
        candidateIndices: Object.freeze(candidateIndices),
        candidateYears: Object.freeze(candidateYears)
    });
}

/**
 * Bereitet den Kontext für ein Stress-Szenario vor
 */
export function buildStressContext(presetKey, rand) {
    const normalizedPresetKey = presetKey == null || presetKey === '' ? 'NONE' : presetKey;
    if (!Object.prototype.hasOwnProperty.call(STRESS_PRESETS, normalizedPresetKey)) {
        throw simulatorDataContractError(
            'SIMULATOR_STRESS_PRESET_UNKNOWN',
            `Unknown stress preset ${String(normalizedPresetKey)}.`
        );
    }
    const preset = STRESS_PRESETS[normalizedPresetKey];
    if (preset.type === 'none') return null;

    const context = {
        preset: preset,
        remainingYears: preset.years,
        type: preset.type,
        provenance: preset.provenance
    };

    if (preset.type === 'conditional_bootstrap') {
        const pool = resolveStressHistoricalPool(normalizedPresetKey, annualData);
        context.pickableIndices = [...pool.candidateIndices];
        context.candidateYears = [...pool.candidateYears];
        context.minimumDistinctYears = pool.minimumDistinctYears;

        if (context.pickableIndices.length === 0) {
            throw simulatorDataContractError(
                'SIMULATOR_STRESS_POOL_EMPTY',
                `Stress preset ${normalizedPresetKey} has no eligible canonical historical observations.`
            );
        }
        if (context.pickableIndices.length < context.minimumDistinctYears) {
            throw simulatorDataContractError(
                'SIMULATOR_STRESS_EFFECTIVE_POOL_TOO_SMALL',
                `Stress preset ${normalizedPresetKey} requires at least ${context.minimumDistinctYears} distinct historical observations.`
            );
        }
    }

    if (preset.type === 'parametric_sequence' && preset.reboundClamp) {
        // Track rebound clamp years after the parametric shock ends.
        context.reboundYearsRemaining = preset.reboundClamp.years;
    }

    return context;
}

/**
 * Wendet Stress-Überschreibungen auf Jahresdaten an
 */
export function applyStressOverride(yearData, stressCtx, rand) {
    if (!stressCtx || stressCtx.remainingYears <= 0) {
        // After the stress window, optionally cap rebounds for a few years.
        if (stressCtx?.reboundYearsRemaining > 0 && stressCtx.preset.reboundClamp) {
            yearData.rendite = Math.min(yearData.rendite, stressCtx.preset.reboundClamp.cap);
            stressCtx.reboundYearsRemaining--;
        }
        return yearData;
    }

    const preset = stressCtx.preset;
    const modifiedData = { ...yearData };

    // 1. Basis-Logik je nach Typ (Filter, Sequenz etc.)
    switch (preset.type) {
        case 'parametric_sequence':
            const i = preset.years - stressCtx.remainingYears;
            const baseReturn = preset.seqReturnsEq[i];
            if (!Number.isFinite(baseReturn)) {
                throw simulatorDataContractError(
                    'SIMULATOR_STRESS_SEQUENCE_INVALID',
                    `Stress preset sequence has no finite return at offset ${i}.`
                );
            }
            const noise = (rand() * 2 - 1) * (preset.noiseVol || 0);
            modifiedData.rendite = baseReturn + noise;
            if (preset.inflationFixed !== undefined) {
                modifiedData.inflation = preset.inflationFixed;
            }
            // Sequenz überschreibt alles, daher hier break und return
            stressCtx.remainingYears--;
            return modifiedData;
    }

    // 2. Parametrische Modifikation (Shift/Scale) auf das Jahr anwenden
    // Funktioniert nun AUCH für 'conditional_bootstrap' oder andere Typen,
    // sofern Parameter im Preset definiert sind.

    // Volatilitäts-Skalierung (staucht/streckt Abweichung vom Mittelwert)
    if (preset.volScaleEq) {
        const HIST_MEAN_APPROX = 0.08;
        modifiedData.rendite = HIST_MEAN_APPROX + (modifiedData.rendite - HIST_MEAN_APPROX) * preset.volScaleEq;
    }

    // Lineare Shifts
    modifiedData.rendite += (preset.muShiftEq || 0);
    if (!Number.isFinite(modifiedData.rendite)
        || !Number.isFinite(modifiedData.inflation)
        || !Number.isFinite(modifiedData.gold_eur_perf)) {
        throw simulatorDataContractError(
            'SIMULATOR_STRESS_INPUT_INVALID',
            'Stress overrides require finite equity, inflation and gold observations.'
        );
    }
    modifiedData.gold_eur_perf += (preset.muShiftAu || 0) * 100;

    // Caps (Obergrenzen für Renditen) - WICHTIG für "Lost Decade" (keine Gold-Raketen)
    if (preset.returnMaxAu !== undefined) {
        // Gold-Perf ist in Prozent (z.B. 19.5 für 19.5%)
        modifiedData.gold_eur_perf = Math.min(modifiedData.gold_eur_perf, preset.returnMaxAu);
    }
    if (preset.returnMaxEq !== undefined) {
        // Aktien-Rendite ist dezimal (z.B. 0.05 für 5%)
        modifiedData.rendite = Math.min(modifiedData.rendite, preset.returnMaxEq);
    }

    // Floors/Caps
    if (preset.inflationFloor !== undefined) {
        modifiedData.inflation = Math.max(modifiedData.inflation, preset.inflationFloor);
    }

    stressCtx.remainingYears--;
    return modifiedData;
}
