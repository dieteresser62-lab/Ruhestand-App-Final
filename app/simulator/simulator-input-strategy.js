/**
 * Module: Simulator Input Strategy
 * Purpose: Reads base portfolio, strategy, dynamic-flex, decumulation, and accumulation inputs.
 */
"use strict";

import { STRATEGY_OPTIONS } from '../../types/strategy-options.js';
import {
    parseBoundedNumber,
    readBoundedNumber,
    readChecked,
    readDisplayNumber,
    readInt,
    readNumber,
    readValue
} from './simulator-input-dom.js';

export const DEFAULT_RISIKOPROFIL = 'sicherheits-dynamisch';

const DYNAMIC_FLEX_DEFAULTS = {
    HORIZON_METHOD: 'survival_quantile',
    HORIZON_YEARS: 30,
    SURVIVAL_QUANTILE: 0.85,
    GO_GO_MULTIPLIER: 1.0
};
const DYNAMIC_FLEX_ALLOWED_HORIZON_METHODS = new Set(['mean', 'survival_quantile']);
const LEGACY_STANDARD_MODES = new Set(['dynamic_flex', 'vpw', 'guardrails', 'fixed_real', 'none']);

export function normalizeDecumulationMode(modeRaw) {
    const mode = String(modeRaw || '').trim().toLowerCase();
    if (mode === STRATEGY_OPTIONS.THREE_BUCKET_JILGE) return STRATEGY_OPTIONS.THREE_BUCKET_JILGE;
    if (mode === STRATEGY_OPTIONS.STANDARD || LEGACY_STANDARD_MODES.has(mode) || mode === '') {
        return STRATEGY_OPTIONS.STANDARD;
    }
    return STRATEGY_OPTIONS.STANDARD;
}

export function readBasePortfolioInputs(doc = globalThis.document) {
    const tagesgeld = readDisplayNumber('tagesgeld', doc);
    const geldmarktEtf = readDisplayNumber('geldmarktEtf', doc);
    const goldAktiv = String(readValue('goldAllokationAktiv', '', doc) || '').toLowerCase() === 'true';

    return {
        startVermoegen: readDisplayNumber('simStartVermoegen', doc),
        depotwertAlt: readNumber('depotwertAlt', 0, doc) || 0,
        tagesgeld,
        geldmarktEtf,
        einstandAlt: readNumber('einstandAlt', 0, doc) || 0,
        // Liquidity target is current cash + money market.
        zielLiquiditaet: tagesgeld + geldmarktEtf,
        startFloorBedarf: readNumber('startFloorBedarf', 0, doc) || 0,
        startFlexBedarf: readNumber('startFlexBedarf', 0, doc) || 0,
        flexBudgetAnnual: readNumber('flexBudgetAnnual', 0, doc) || 0,
        flexBudgetYears: readNumber('flexBudgetYears', 0, doc) || 0,
        flexBudgetRecharge: readNumber('flexBudgetRecharge', 0, doc) || 0,
        risikoprofil: DEFAULT_RISIKOPROFIL,
        goldAktiv,
        goldZielProzent: goldAktiv ? readNumber('goldAllokationProzent', NaN, doc) : 0,
        goldFloorProzent: goldAktiv ? readNumber('goldFloorProzent', NaN, doc) : 0,
        rebalancingBand: goldAktiv ? readNumber('rebalancingBand', NaN, doc) : 25,
        goldSteuerfrei: goldAktiv && String(readValue('goldSteuerfrei', '', doc) || '').toLowerCase() === 'true',
        stressPreset: readValue('stressPreset', 'NONE', doc) || 'NONE'
    };
}

export function readDynamicFlexInputs(doc = globalThis.document) {
    const horizonMethodRaw = readValue('horizonMethod', '', doc);
    const horizonMethod = DYNAMIC_FLEX_ALLOWED_HORIZON_METHODS.has(horizonMethodRaw)
        ? horizonMethodRaw
        : DYNAMIC_FLEX_DEFAULTS.HORIZON_METHOD;
    const marketCapeRatio = Math.max(0, readBoundedNumber(
        'marketCapeRatio',
        0,
        0,
        Number.MAX_SAFE_INTEGER,
        doc
    ));

    return {
        marketCapeRatio,
        capeRatio: marketCapeRatio,
        dynamicFlex: readChecked('dynamicFlex', false, doc) === true,
        horizonMethod,
        horizonYears: readBoundedNumber('horizonYears', DYNAMIC_FLEX_DEFAULTS.HORIZON_YEARS, 1, 60, doc),
        survivalQuantile: readBoundedNumber('survivalQuantile', DYNAMIC_FLEX_DEFAULTS.SURVIVAL_QUANTILE, 0.5, 0.99, doc),
        goGoActive: readChecked('goGoActive', false, doc) === true,
        goGoMultiplier: readBoundedNumber('goGoMultiplier', DYNAMIC_FLEX_DEFAULTS.GO_GO_MULTIPLIER, 1.0, 1.5, doc)
    };
}

export function readDecumulationInputs(doc = globalThis.document) {
    const bondTargetFactorRaw = parseBoundedNumber(readValue('bondTargetFactor', '', doc), NaN, -Infinity, Infinity);
    const drawdownTriggerRaw = parseBoundedNumber(readValue('drawdownTrigger', '', doc), NaN, -Infinity, Infinity);
    const bondRefillThresholdRaw = parseBoundedNumber(readValue('bondRefillThreshold', '', doc), NaN, -Infinity, Infinity);

    return {
        decumulation: {
            mode: normalizeDecumulationMode(readValue('entnahmeStrategie', '', doc)),
            bondTargetFactor: Number.isFinite(bondTargetFactorRaw) ? Math.max(0, bondTargetFactorRaw) : null,
            drawdownTrigger: Number.isFinite(drawdownTriggerRaw) ? drawdownTriggerRaw : null,
            bondRefillThreshold: Number.isFinite(bondRefillThresholdRaw) ? Math.max(0, bondRefillThresholdRaw) : null
        }
    };
}

export function readStrategyInputs(doc = globalThis.document) {
    return {
        runwayMinMonths: readInt('runwayMinMonths', 24, doc) || 24,
        runwayTargetMonths: readInt('runwayTargetMonths', 36, doc) || 36,
        targetEq: readInt('targetEq', 60, doc) || 60,
        rebalBand: readInt('rebalBand', 5, doc) || 5,
        maxSkimPctOfEq: readInt('maxSkimPctOfEq', 10, doc) || 10,
        maxBearRefillPctOfEq: readInt('maxBearRefillPctOfEq', 5, doc) || 5
    };
}

export function readAccumulationInputs({ startAlter = 65, doc = globalThis.document } = {}) {
    const enabled = readChecked('enableAccumulationPhase', false, doc) || false;
    const durationYears = readInt('accumulationDurationYears', 0, doc) || 0;
    const accumulationPhase = {
        enabled,
        durationYears,
        sparrate: readNumber('accumulationSparrate', 0, doc) || 0,
        sparrateIndexing: readValue('sparrateIndexing', 'none', doc) || 'none'
    };
    const transitionYear = enabled ? durationYears : 0;

    return {
        accumulationPhase,
        transitionYear,
        transitionAge: startAlter + transitionYear
    };
}
