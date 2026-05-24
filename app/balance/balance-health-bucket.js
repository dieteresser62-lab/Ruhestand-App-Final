/**
 * Module: Balance Health Bucket
 * Purpose: Read-only consumer diagnostics for the profile-defined care bucket.
 */
"use strict";

import { DEFAULT_PROFILE_HEALTH_BUCKET, normalizeProfileHealthBucket } from '../profile/profile-state.js';

function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

export function resolveBalanceHealthBucketDefinition(inputData = {}) {
    return normalizeProfileHealthBucket(inputData.healthBucket || DEFAULT_PROFILE_HEALTH_BUCKET);
}

export function buildBalanceHealthBucketDiagnostics(inputData = {}, options = {}) {
    const definition = resolveBalanceHealthBucketDefinition(inputData);
    const tagesgeld = Math.max(0, safeNumber(inputData.tagesgeld, 0));
    const geldmarktEtf = Math.max(0, safeNumber(inputData.geldmarktEtf, 0));
    const grossLiquidity = tagesgeld + geldmarktEtf;
    const requestedAmount = definition.enabled ? Math.max(0, safeNumber(definition.initialAmount, 0)) : 0;
    const lockedAmount = Math.min(requestedAmount, grossLiquidity);
    const lockedFromMoneyMarket = Math.min(geldmarktEtf, lockedAmount);
    const lockedFromCash = Math.min(tagesgeld, Math.max(0, lockedAmount - lockedFromMoneyMarket));
    const operativeLiquidity = Math.max(0, grossLiquidity - lockedAmount);
    const nominalGap = Math.max(0, requestedAmount - lockedAmount);
    const cumulativeInflationFactor = Math.max(1, safeNumber(options.cumulativeInflationFactor, 1));
    const targetInflationAdjusted = definition.targetMode === 'inflation_indexed_diagnostic'
        ? requestedAmount * cumulativeInflationFactor
        : requestedAmount;
    const targetGap = Math.max(0, targetInflationAdjusted - lockedAmount);
    const targetCoveragePct = targetInflationAdjusted > 0
        ? (lockedAmount / targetInflationAdjusted) * 100
        : null;

    return {
        enabled: definition.enabled,
        definition,
        releasePolicy: 'diagnostic_only',
        releaseAllowed: false,
        releaseReason: definition.enabled
            ? 'Balance zeigt den Pflegebucket nur als Zweckbindung; automatische Entsperrung erfordert einen expliziten Pflegefall-Ist-Zustand.'
            : 'Pflegebucket ist deaktiviert.',
        releasedAmount: 0,
        grossLiquidity,
        requestedAmount,
        lockedAmount,
        lockedFromMoneyMarket,
        lockedFromCash,
        operativeLiquidity,
        nominalGap,
        targetInflationAdjusted,
        targetCoveragePct,
        targetGap,
        warning: definition.enabled && nominalGap > 0
            ? 'Pflegebucket-Ziel ist durch Geldmarkt/Cash aktuell nicht vollständig gedeckt.'
            : null
    };
}
