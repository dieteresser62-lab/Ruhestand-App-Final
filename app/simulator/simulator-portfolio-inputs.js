/**
 * Module: Simulator Portfolio Inputs
 * Purpose: Collecting input values from the UI.
 *          Handles complex parsing of form fields, care config, and partner details.
 * Usage: Called by simulator-portfolio.js facade.
 * Dependencies: simulator-data.js, simulator-portfolio-care.js, simulator-portfolio-format.js
 */
"use strict";

import { SUPPORTED_PFLEGE_GRADES } from './simulator-data.js';
import { normalizeCareDurationRange } from './simulator-portfolio-care.js';
import { parseDisplayNumber } from './simulator-portfolio-format.js';

const DEFAULT_RISIKOPROFIL = 'sicherheits-dynamisch';
const DEFAULT_PFLEGE_DRIFT_PCT = 3.5; // Realistische Langfrist-Annahme (3–4 % über VPI)
const DYNAMIC_FLEX_DEFAULTS = {
    HORIZON_METHOD: 'survival_quantile',
    HORIZON_YEARS: 30,
    SURVIVAL_QUANTILE: 0.85,
    GO_GO_MULTIPLIER: 1.0
};
const DYNAMIC_FLEX_ALLOWED_HORIZON_METHODS = new Set(['mean', 'survival_quantile']);

function parseBoundedNumber(rawValue, fallback, min, max) {
    const n = Number.parseFloat(String(rawValue ?? '').replace(',', '.'));
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}

/**
 * Sammelt alle Eingabewerte aus dem UI
 */
export function getCommonInputs() {
    // Lade detaillierte Tranchen aus localStorage (falls vorhanden)
    let detailledTranches = null;
    try {
        const override = (typeof window !== 'undefined') ? window.__profilverbundTranchenOverride : null;
        const preferAggregates = (typeof window !== 'undefined') && window.__profilverbundPreferAggregates;
        if (Array.isArray(override) && override.length > 0) {
            // Profilverbund override has highest priority.
            detailledTranches = override;
        } else if (!preferAggregates) {
            const saved = localStorage.getItem('depot_tranchen');
            if (saved) {
                detailledTranches = JSON.parse(saved);
            }
        }
    } catch (err) { }

    const goldAktiv = String(document.getElementById('goldAllokationAktiv')?.value || '').toLowerCase() === 'true';

    // Gemeinsame Rentenanpassung (gilt für Person 1 und Partner)
    const rentAdjMode = document.getElementById('rentAdjMode')?.value || 'fix';
    const rentAdjPct = parseFloat(document.getElementById('rentAdjPct')?.value) || 0;

    // Hinterbliebenen-Rente Konfiguration
    const widowModeRaw = document.getElementById('widowPensionMode')?.value || 'stop';
    const widowPctRaw = parseFloat(document.getElementById('widowPensionPct')?.value);
    const widowMarriageOffsetRaw = parseInt(document.getElementById('widowMarriageOffsetYears')?.value);
    const widowMinMarriageYearsRaw = parseInt(document.getElementById('widowMinMarriageYears')?.value);
    // Normalize widow options into validated percent + integer years.
    const widowOptions = {
        mode: widowModeRaw,
        percent: (() => {
            const pct = Number.isFinite(widowPctRaw) ? widowPctRaw : 0;
            return Math.max(0, Math.min(100, pct)) / 100;
        })(),
        marriageOffsetYears: Math.max(0, Number.isFinite(widowMarriageOffsetRaw) ? widowMarriageOffsetRaw : 0),
        minMarriageYears: Math.max(0, Number.isFinite(widowMinMarriageYearsRaw) ? widowMinMarriageYearsRaw : 0)
    };

    // Pflegegrade: normalize per-grade extra cost, flex cut, mortality factor.
    const pflegeGradeConfigs = {};
    SUPPORTED_PFLEGE_GRADES.forEach(grade => {
        const zusatzInput = document.getElementById(`pflegeStufe${grade}Zusatz`);
        const flexInput = document.getElementById(`pflegeStufe${grade}FlexCut`);
        const mortalityInput = document.getElementById(`pflegeStufe${grade}Mortality`);
        const zusatz = parseFloat(zusatzInput?.value) || 0;
        const flexPercent = parseFloat(flexInput?.value);
        const flexCut = Math.min(1, Math.max(0, ((Number.isFinite(flexPercent) ? flexPercent : 100) / 100)));
        const mortalityRaw = parseFloat(mortalityInput?.value);
        const mortalityFactor = Math.max(0, Number.isFinite(mortalityRaw) ? mortalityRaw : 0);
        pflegeGradeConfigs[grade] = { zusatz, flexCut, mortalityFactor };
    });
    const grade1Config = pflegeGradeConfigs[1] || { zusatz: 0, flexCut: 1 };

    // Person 1 Felder - mit Fallback auf alte IDs für Abwärtskompatibilität
    const p1StartAlter = parseInt(document.getElementById('p1StartAlter')?.value || document.getElementById('startAlter')?.value) || 65;
    const p1Geschlecht = document.getElementById('p1Geschlecht')?.value || document.getElementById('geschlecht')?.value || 'w';
    const p1SparerPB = parseFloat(document.getElementById('p1SparerPauschbetrag')?.value || document.getElementById('startSPB')?.value) || 0;
    const p1KirchensteuerPct = parseFloat(document.getElementById('p1KirchensteuerPct')?.value || document.getElementById('kirchensteuerSatz')?.value) || 0;
    const p1Monatsrente = parseFloat(document.getElementById('p1Monatsrente')?.value || document.getElementById('renteMonatlich')?.value) || 0;
    const p1StartInJahren = parseInt(document.getElementById('p1StartInJahren')?.value || document.getElementById('renteStartOffsetJahre')?.value) || 0;

    // Person 2 Migration: r2Brutto (jährlich) → r2Monatsrente (monatlich)
    let r2Monatsrente = parseFloat(document.getElementById('r2Monatsrente')?.value) || 0;
    if (!r2Monatsrente) {
        const r2BruttoJahr = parseFloat(document.getElementById('r2Brutto')?.value) || 0;
        if (r2BruttoJahr > 0) {
            r2Monatsrente = Math.round(r2BruttoJahr / 12);
            // Migration in localStorage wird später in simulator-main.js durchgeführt
        }
    }

    const rawPflegeMin = parseInt(document.getElementById('pflegeMinDauer')?.value);
    const rawPflegeMax = parseInt(document.getElementById('pflegeMaxDauer')?.value);
    // Normalize care duration bounds with gender defaults.
    const normalizedCareDuration = normalizeCareDurationRange(rawPflegeMin, rawPflegeMax, p1Geschlecht);

    const tagesgeld = parseDisplayNumber(document.getElementById('tagesgeld')?.value);
    const geldmarktEtf = parseDisplayNumber(document.getElementById('geldmarktEtf')?.value);
    const dynamicFlex = document.getElementById('dynamicFlex')?.checked === true;
    const horizonMethodRaw = document.getElementById('horizonMethod')?.value;
    const horizonMethod = DYNAMIC_FLEX_ALLOWED_HORIZON_METHODS.has(horizonMethodRaw)
        ? horizonMethodRaw
        : DYNAMIC_FLEX_DEFAULTS.HORIZON_METHOD;
    const horizonYears = parseBoundedNumber(
        document.getElementById('horizonYears')?.value,
        DYNAMIC_FLEX_DEFAULTS.HORIZON_YEARS,
        1,
        60
    );
    const survivalQuantile = parseBoundedNumber(
        document.getElementById('survivalQuantile')?.value,
        DYNAMIC_FLEX_DEFAULTS.SURVIVAL_QUANTILE,
        0.5,
        0.99
    );
    const goGoActive = document.getElementById('goGoActive')?.checked === true;
    const goGoMultiplier = parseBoundedNumber(
        document.getElementById('goGoMultiplier')?.value,
        DYNAMIC_FLEX_DEFAULTS.GO_GO_MULTIPLIER,
        1.0,
        1.5
    );
    const marketCapeRatio = Math.max(0, parseBoundedNumber(
        document.getElementById('marketCapeRatio')?.value,
        0,
        0,
        Number.MAX_SAFE_INTEGER
    ));

    const baseInputs = {
        startVermoegen: parseDisplayNumber(document.getElementById('simStartVermoegen')?.value),
        depotwertAlt: parseFloat(document.getElementById('depotwertAlt').value) || 0,
        tagesgeld: tagesgeld,
        geldmarktEtf: geldmarktEtf,
        einstandAlt: parseFloat(document.getElementById('einstandAlt').value) || 0,
        // Liquidity target is current cash + money market.
        zielLiquiditaet: tagesgeld + geldmarktEtf,
        startFloorBedarf: parseFloat(document.getElementById('startFloorBedarf').value) || 0,
        startFlexBedarf: parseFloat(document.getElementById('startFlexBedarf').value) || 0,
        flexBudgetAnnual: parseFloat(document.getElementById('flexBudgetAnnual')?.value) || 0,
        flexBudgetYears: parseFloat(document.getElementById('flexBudgetYears')?.value) || 0,
        flexBudgetRecharge: parseFloat(document.getElementById('flexBudgetRecharge')?.value) || 0,
        marketCapeRatio,
        capeRatio: marketCapeRatio,
        dynamicFlex,
        horizonMethod,
        horizonYears,
        survivalQuantile,
        goGoActive,
        goGoMultiplier,
        risikoprofil: DEFAULT_RISIKOPROFIL,
        goldAktiv: goldAktiv,
        goldZielProzent: (goldAktiv ? parseFloat(document.getElementById('goldAllokationProzent')?.value) : 0),
        goldFloorProzent: (goldAktiv ? parseFloat(document.getElementById('goldFloorProzent')?.value) : 0),
        rebalancingBand: (goldAktiv ? parseFloat(document.getElementById('rebalancingBand')?.value) : 25),
        goldSteuerfrei: goldAktiv && (String(document.getElementById('goldSteuerfrei')?.value || '').toLowerCase() === 'true'),
        startAlter: p1StartAlter,
        geschlecht: p1Geschlecht,
        startSPB: p1SparerPB,
        kirchensteuerSatz: p1KirchensteuerPct / 100, // Konvertiere zu Dezimal (9 → 0.09)
        renteMonatlich: p1Monatsrente,
        renteStartOffsetJahre: p1StartInJahren,
        rentAdjMode: rentAdjMode,
        rentAdjPct: rentAdjPct,
        // VERALTET: Alte Indexierungsfelder (für Abwärtskompatibilität, werden nicht mehr verwendet)
        renteIndexierungsart: document.getElementById('renteIndexierungsart')?.value || 'fest',
        renteFesterSatz: parseFloat(document.getElementById('renteFesterSatz')?.value) || 0,
        pflegefallLogikAktivieren: document.getElementById('pflegefallLogikAktivieren').checked,
        pflegeModellTyp: document.getElementById('pflegeModellTyp').value,
        pflegeGradeConfigs,
        pflegeStufe1Zusatz: grade1Config.zusatz,
        pflegeStufe1FlexCut: grade1Config.flexCut,
        pflegeMaxFloor: parseFloat(document.getElementById('pflegeMaxFloor').value) || 0,
        pflegeRampUp: parseInt(document.getElementById('pflegeRampUp').value) || 5,
        // Defensive Defaults: greifen auf geschlechtsspezifische Annahmen zurück.
        pflegeMinDauer: normalizedCareDuration.minYears,
        pflegeMaxDauer: normalizedCareDuration.maxYears,
        pflegeKostenDrift: (() => {
            const driftPctRaw = parseFloat(document.getElementById('pflegeKostenDrift')?.value);
            const driftPct = Number.isFinite(driftPctRaw) ? driftPctRaw : DEFAULT_PFLEGE_DRIFT_PCT;
            return Math.max(0, driftPct) / 100;
        })(),
        pflegeRegionalZuschlag: (() => {
            const raw = parseFloat(document.getElementById('pflegeRegionalZuschlag')?.value);
            return Math.max(0, Number.isFinite(raw) ? raw : 0) / 100;
        })(),
        decumulation: { mode: 'none' },
        stressPreset: document.getElementById('stressPreset').value || 'NONE',
        // Partner-Konfiguration (Rente 2)
        partner: {
            aktiv: document.getElementById('chkPartnerAktiv')?.checked || false,
            geschlecht: document.getElementById('r2Geschlecht')?.value || 'w',
            startAlter: parseInt(document.getElementById('r2StartAlter')?.value) || 0,
            startInJahren: parseInt(document.getElementById('r2StartInJahren')?.value) || 0,
            monatsrente: r2Monatsrente,
            sparerPauschbetrag: parseFloat(document.getElementById('r2SparerPauschbetrag')?.value) || 0,
            kirchensteuerPct: parseFloat(document.getElementById('r2KirchensteuerPct')?.value) || 0,
            steuerquotePct: parseFloat(document.getElementById('r2Steuerquote')?.value) || 0,
            // VERALTET: brutto wird durch monatsrente ersetzt
            brutto: r2Monatsrente * 12
        },
        widowOptions
    };

    const strategyInputs = {
        runwayMinMonths: parseInt(document.getElementById('runwayMinMonths')?.value) || 24,
        runwayTargetMonths: parseInt(document.getElementById('runwayTargetMonths')?.value) || 36,
        targetEq: parseInt(document.getElementById('targetEq')?.value) || 60,
        rebalBand: parseInt(document.getElementById('rebalBand')?.value) || 5,
        maxSkimPctOfEq: parseInt(document.getElementById('maxSkimPctOfEq')?.value) || 10,
        maxBearRefillPctOfEq: parseInt(document.getElementById('maxBearRefillPctOfEq')?.value) || 5
    };

    // Ansparphase-Konfiguration
    const accumulationPhaseEnabled = document.getElementById('enableAccumulationPhase')?.checked || false;
    const accumulationDurationYears = parseInt(document.getElementById('accumulationDurationYears')?.value) || 0;
    const accumulationSparrate = parseFloat(document.getElementById('accumulationSparrate')?.value) || 0;
    const sparrateIndexing = document.getElementById('sparrateIndexing')?.value || 'none';

    const accumulationPhase = {
        enabled: accumulationPhaseEnabled,
        durationYears: accumulationDurationYears,
        sparrate: accumulationSparrate,
        sparrateIndexing: sparrateIndexing
    };

    // Transition occurs after the accumulation window ends.
    const transitionYear = accumulationPhaseEnabled ? accumulationDurationYears : 0;
    const transitionAge = p1StartAlter + transitionYear;

    return {
        ...baseInputs,
        ...strategyInputs,
        accumulationPhase,
        transitionYear,
        transitionAge,
        // NEU: Detaillierte Tranchen für FIFO und präzise Steuerberechnung
        detailledTranches: detailledTranches
    };
}
