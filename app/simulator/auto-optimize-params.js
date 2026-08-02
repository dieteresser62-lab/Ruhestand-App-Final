/**
 * Module: Auto-Optimize Params
 * Purpose: Defines allowed parameters, mutation logic, and validation constraints for candidates.
 *          Ensures generated candidates are logically valid (e.g. Min <= Target).
 * Usage: Used by auto_optimize.js and auto-optimize-evaluate.js.
 * Dependencies: None
 */
"use strict";

/**
 * Whitelist der erlaubten Parameter-Keys
 */
const ALLOWED_PARAM_KEYS = [
    'liquidityRunwayYears',
    'goldTargetPct',
    'goldRebalancingBand',
    'maxSkimPct',
    'maxBearRefillPct',
    'horizonYears',
    'survivalQuantile',
    'goGoMultiplier'
];

/**
 * Mutator-Map: Wie werden die Parameter auf die Config angewendet?
 * @param {object} cfg - Config-Objekt (wird mutiert)
 * @param {string} key - Parameter-Key
 * @param {number} value - Wert
 */
function applyParameterMutation(cfg, key, value) {
    switch (key) {
        case 'liquidityRunwayYears':
            if (!cfg.runway) cfg.runway = {};
            cfg.runway.targetYears = Number(value);
            break;
        case 'goldTargetPct':
            if (!cfg.alloc) cfg.alloc = {};
            cfg.alloc.goldTarget = Number(value);
            break;
        case 'goldRebalancingBand':
            if (!cfg.rebal) cfg.rebal = {};
            cfg.rebal.band = Number(value);
            break;
        case 'maxSkimPct':
            if (!cfg.skim) cfg.skim = {};
            cfg.skim.maxPct = Number(value);
            break;
        case 'maxBearRefillPct':
            if (!cfg.bear) cfg.bear = {};
            cfg.bear.maxRefillPct = Number(value);
            break;
        case 'horizonYears':
            cfg.horizonYears = Math.round(Number(value));
            break;
        case 'survivalQuantile':
            cfg.survivalQuantile = Number(value);
            cfg.horizonMethod = 'survival_quantile';
            break;
        case 'goGoMultiplier':
            cfg.goGoMultiplier = Number(value);
            if (cfg.dynamicFlex === true) {
                cfg.goGoActive = true;
            }
            break;
        default:
            throw new Error(`Unknown parameter key: ${key}`);
    }
}

/**
 * Prüft harte Invarianten (sofort verwerfen)
 * @param {object} candidate - Kandidat mit beliebigen Parametern
 * @param {number} goldCap - Max. erlaubter Gold-Anteil
 * @returns {boolean} true wenn valide
 */
export function isValidCandidate(candidate, goldCap) {
    if (candidate.liquidityRunwayYears !== undefined) {
        if (candidate.liquidityRunwayYears < 1 || candidate.liquidityRunwayYears > 10) return false;
    }

    // Gold-Invariante: 0 <= goldTarget <= goldCap
    if (candidate.goldTargetPct !== undefined) {
        if (candidate.goldTargetPct < 0 || candidate.goldTargetPct > goldCap) return false;
    }

    // Gold Rebal Band: 0 <= goldRebalancingBand <= 100
    if (candidate.goldRebalancingBand !== undefined) {
        if (candidate.goldRebalancingBand < 0 || candidate.goldRebalancingBand > 100) return false;
    }

    // Max Skim %: 0 <= maxSkimPct <= 100
    if (candidate.maxSkimPct !== undefined) {
        if (candidate.maxSkimPct < 0 || candidate.maxSkimPct > 100) return false;
    }

    // Max Bear Refill %: 0 <= maxBearRefillPct <= 100
    if (candidate.maxBearRefillPct !== undefined) {
        if (candidate.maxBearRefillPct < 0 || candidate.maxBearRefillPct > 100) return false;
    }

    // Dynamic-Flex Stellschrauben (Stage B): enger Suchraum für robuste Lösungen.
    if (candidate.horizonYears !== undefined) {
        if (candidate.horizonYears < 15 || candidate.horizonYears > 45) return false;
    }
    if (candidate.survivalQuantile !== undefined) {
        if (candidate.survivalQuantile < 0.75 || candidate.survivalQuantile > 0.95) return false;
    }
    if (candidate.goGoMultiplier !== undefined) {
        if (candidate.goGoMultiplier < 1.0 || candidate.goGoMultiplier > 1.35) return false;
    }

    return true;
}
