/**
 * Module: Simulator Portfolio Stress
 * Purpose: Applying stress tests to market data.
 *          Handles conditional bootstrapping and parametric modifications (e.g., rebound caps).
 * Usage: Called by simulator-portfolio.js facade.
 * Dependencies: simulator-data.js
 */
"use strict";

import { STRESS_PRESETS, annualData } from './simulator-data.js';

/**
 * Bereitet den Kontext für ein Stress-Szenario vor
 */
export function buildStressContext(presetKey, rand) {
    const preset = STRESS_PRESETS[presetKey] || STRESS_PRESETS.NONE;
    if (preset.type === 'none') return null;

    const context = {
        preset: preset,
        remainingYears: preset.years,
        type: preset.type
    };

    if (preset.type === 'conditional_bootstrap') {
        // Build a filtered list of historical years that match the stress criteria.
        context.pickableIndices = annualData
            .map((d, i) => ({ ...d, index: i }))
            .filter(d => {
                const realReturnPct = (d.rendite * 100) - d.inflation;
                const passesYearMin = preset.filter.yearMin === undefined || d.jahr >= preset.filter.yearMin;
                const passesYearMax = preset.filter.yearMax === undefined || d.jahr <= preset.filter.yearMax;
                const passesInflation = preset.filter.inflationMin === undefined || d.inflation >= preset.filter.inflationMin;
                const passesRealReturn = preset.filter.equityRealMax === undefined || realReturnPct <= preset.filter.equityRealMax;
                return passesYearMin && passesYearMax && passesInflation && passesRealReturn;
            })
            .map(d => d.index);

        if (context.pickableIndices.length === 0) {
            console.warn(`Stress-Szenario "${preset.label}" fand keine passenden historischen Jahre. Fallback auf 'Kein Stress'.`);
            return null;
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
            const baseReturn = preset.seqReturnsEq[i] || 0;
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
    modifiedData.gold_eur_perf = (modifiedData.gold_eur_perf || 0) + ((preset.muShiftAu || 0) * 100);

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
    if (preset.inflationFloor) {
        modifiedData.inflation = Math.max(modifiedData.inflation, preset.inflationFloor);
    }

    stressCtx.remainingYears--;
    return modifiedData;
}
