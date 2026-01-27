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
    'runwayMinM',
    'runwayTargetM',
    'goldTargetPct',
    'targetEq',
    'rebalBand',
    'maxSkimPct',
    'maxBearRefillPct'
];

/**
 * Mutator-Map: Wie werden die Parameter auf die Config angewendet?
 * @param {object} cfg - Config-Objekt (wird mutiert)
 * @param {string} key - Parameter-Key
 * @param {number} value - Wert
 */
function applyParameterMutation(cfg, key, value) {
    switch (key) {
        case 'runwayMinM':
            if (!cfg.runway) cfg.runway = {};
            cfg.runway.min = Math.round(value);
            break;
        case 'runwayTargetM':
            if (!cfg.runway) cfg.runway = {};
            cfg.runway.target = Math.round(value);
            break;
        case 'goldTargetPct':
            if (!cfg.alloc) cfg.alloc = {};
            cfg.alloc.goldTarget = Number(value);
            break;
        case 'targetEq':
            if (!cfg.alloc) cfg.alloc = {};
            cfg.alloc.targetEq = Number(value);
            break;
        case 'rebalBand':
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
    // Runway-Invariante: Min <= Target
    if (candidate.runwayMinM !== undefined && candidate.runwayTargetM !== undefined) {
        if (candidate.runwayMinM > candidate.runwayTargetM) return false;
    }

    // Gold-Invariante: 0 <= goldTarget <= goldCap
    if (candidate.goldTargetPct !== undefined) {
        if (candidate.goldTargetPct < 0 || candidate.goldTargetPct > goldCap) return false;
    }

    // Target Eq: 0 <= targetEq <= 100
    if (candidate.targetEq !== undefined) {
        if (candidate.targetEq < 0 || candidate.targetEq > 100) return false;
    }

    // Rebal Band: 0 <= rebalBand <= 50
    if (candidate.rebalBand !== undefined) {
        if (candidate.rebalBand < 0 || candidate.rebalBand > 50) return false;
    }

    // Max Skim %: 0 <= maxSkimPct <= 100
    if (candidate.maxSkimPct !== undefined) {
        if (candidate.maxSkimPct < 0 || candidate.maxSkimPct > 100) return false;
    }

    // Max Bear Refill %: 0 <= maxBearRefillPct <= 100
    if (candidate.maxBearRefillPct !== undefined) {
        if (candidate.maxBearRefillPct < 0 || candidate.maxBearRefillPct > 100) return false;
    }

    return true;
}
