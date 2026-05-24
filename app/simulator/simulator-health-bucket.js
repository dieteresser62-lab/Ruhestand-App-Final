"use strict";

import { normalizeProfileHealthBucket } from '../profile/profile-state.js';
import { euros } from './simulator-engine-direct-utils.js';

const DEFAULT_TRIGGER = Object.freeze({
    triggered: false,
    mode: 'OR',
    minGrade: 4,
    qualifyingPersons: [],
    reason: 'disabled'
});

function resolveHealthBucketConfig(inputs = {}, portfolio = {}) {
    const source = portfolio?.healthBucketConfig && typeof portfolio.healthBucketConfig === 'object'
        ? portfolio.healthBucketConfig
        : (inputs?.healthBucket && typeof inputs.healthBucket === 'object'
            ? inputs.healthBucket
            : {
                enabled: inputs.healthBucketEnabled,
                initialAmount: inputs.healthBucketInitialAmount,
                assetSource: inputs.healthBucketAssetSource,
                triggerMinGrade: inputs.healthBucketTriggerMinGrade,
                triggerMode: inputs.healthBucketTriggerMode,
                coverageMode: inputs.healthBucketCoverageMode,
                returnMode: inputs.healthBucketReturnMode,
                targetMode: inputs.healthBucketTargetMode
            });
    return normalizeProfileHealthBucket(source);
}

function resolveCarePerson(meta, alive = true, person = 'p1') {
    const grade = Number(meta?.grade);
    const active = alive !== false && meta?.active === true;
    return {
        person,
        active,
        alive: alive !== false,
        grade: Number.isFinite(grade) ? grade : null,
        gradeLabel: meta?.gradeLabel || '',
        additionalFloor: active ? euros(meta?.zusatzFloorZiel) : 0,
        raw: meta || null
    };
}

export function resolveHealthBucketCareState({ householdContext = null, pflegeMeta = null } = {}) {
    const care = householdContext?.care || {};
    const p1Meta = care.p1 ?? householdContext?.careMetaP1 ?? pflegeMeta ?? null;
    const p2Meta = care.p2 ?? householdContext?.careMetaP2 ?? null;

    return {
        p1: resolveCarePerson(p1Meta, householdContext?.p1Alive !== false, 'p1'),
        p2: p2Meta
            ? resolveCarePerson(p2Meta, householdContext?.p2Alive !== false, 'p2')
            : null
    };
}

export function evaluateHealthBucketTrigger({
    inputs = {},
    portfolio = {},
    householdContext = null,
    pflegeMeta = null
} = {}) {
    const config = resolveHealthBucketConfig(inputs, portfolio);
    if (!config.enabled) {
        return { ...DEFAULT_TRIGGER, mode: config.triggerMode, minGrade: config.triggerMinGrade };
    }

    const minGrade = Number(config.triggerMinGrade) || 4;
    const mode = config.triggerMode === 'AND' ? 'AND' : 'OR';
    const careState = resolveHealthBucketCareState({ householdContext, pflegeMeta });
    const persons = [careState.p1, careState.p2].filter(Boolean);
    const qualifyingPersons = persons.filter(p => p.active && Number(p.grade) >= minGrade);

    if (mode === 'AND') {
        const eligiblePersons = persons.filter(p => p.alive);
        const triggered = eligiblePersons.length > 1
            && eligiblePersons.every(p => p.active && Number(p.grade) >= minGrade);
        return {
            triggered,
            mode,
            minGrade,
            qualifyingPersons,
            careState,
            reason: triggered ? 'trigger_and_met' : 'trigger_and_not_met'
        };
    }

    const triggered = qualifyingPersons.length > 0;
    return {
        triggered,
        mode,
        minGrade,
        qualifyingPersons,
        careState,
        reason: triggered ? 'trigger_or_met' : 'trigger_or_not_met'
    };
}

export function computeHealthBucketEligibleNeed({
    forcedShortfall = 0,
    careFloorAddition = 0,
    coverageMode = 'care_additional_floor_only',
    trigger = null
} = {}) {
    const shortfall = euros(forcedShortfall);
    if (shortfall <= 0 || !trigger?.triggered) return 0;

    if (coverageMode === 'floor_when_care_active') {
        return shortfall;
    }

    const careNeedFromPersons = Array.isArray(trigger.qualifyingPersons)
        ? trigger.qualifyingPersons.reduce((sum, p) => sum + euros(p.additionalFloor), 0)
        : 0;
    const careNeed = euros(careFloorAddition) || careNeedFromPersons;
    return Math.min(shortfall, careNeed);
}

function reduceBucketTranches(portfolio, drawAmount) {
    const tranches = Array.isArray(portfolio.healthBucketTranches)
        ? portfolio.healthBucketTranches
        : [];
    let remaining = euros(drawAmount);
    let realizedGainRaw = 0;
    const consumed = [];
    const kept = [];

    for (const tranche of tranches) {
        const marketValue = euros(tranche?.marketValue);
        if (remaining <= 0 || marketValue <= 0) {
            kept.push(tranche);
            continue;
        }
        const take = Math.min(remaining, marketValue);
        const ratio = marketValue > 0 ? take / marketValue : 0;
        const costBasis = euros(tranche?.costBasis);
        const costTaken = euros(costBasis * ratio);
        const gainTaken = take - costTaken;
        realizedGainRaw += gainTaken;
        consumed.push({
            ...tranche,
            marketValue: euros(take),
            costBasis: costTaken,
            realizedGainRaw: gainTaken
        });
        remaining = euros(remaining - take);

        const remainingMarketValue = euros(marketValue - take);
        if (remainingMarketValue > 0) {
            kept.push({
                ...tranche,
                marketValue: remainingMarketValue,
                costBasis: euros(costBasis - costTaken)
            });
        }
    }

    portfolio.healthBucketTranches = kept;
    if (remaining > 0) {
        portfolio.healthBucketCashAmount = euros((Number(portfolio.healthBucketCashAmount) || 0) - remaining);
    }

    return {
        consumedTranches: consumed,
        realizedGainRaw
    };
}

export function applyHealthBucketCoverage({
    inputs = {},
    portfolio = {},
    householdContext = null,
    pflegeMeta = null,
    forcedShortfall = 0,
    careFloorAddition = 0
} = {}) {
    const config = resolveHealthBucketConfig(inputs, portfolio);
    const trigger = evaluateHealthBucketTrigger({ inputs, portfolio, householdContext, pflegeMeta });
    const startAmount = euros(portfolio.healthBucketGeldmarkt);
    const eligibleNeed = computeHealthBucketEligibleNeed({
        forcedShortfall,
        careFloorAddition,
        coverageMode: config.coverageMode,
        trigger
    });
    const used = trigger.triggered ? Math.min(startAmount, eligibleNeed) : 0;
    const uncoveredNeed = euros(eligibleNeed - used);
    let trancheSettlement = { consumedTranches: [], realizedGainRaw: 0 };

    if (used > 0) {
        trancheSettlement = reduceBucketTranches(portfolio, used);
        portfolio.healthBucketGeldmarkt = euros(startAmount - used);
    }

    return {
        enabled: config.enabled,
        triggered: trigger.triggered,
        reason: trigger.reason,
        trigger,
        startAmount,
        eligibleNeed,
        used,
        uncoveredNeed,
        endAmount: euros(portfolio.healthBucketGeldmarkt),
        taxModel: 'money_market_tranches_track_raw_gain_no_tax_settlement_yet',
        realizedGainRaw: trancheSettlement.realizedGainRaw,
        consumedTranches: trancheSettlement.consumedTranches
    };
}

function distributeInterestAcrossBucketSources(portfolio, interest) {
    const amount = euros(interest);
    if (amount <= 0) return;

    const tranches = Array.isArray(portfolio.healthBucketTranches)
        ? portfolio.healthBucketTranches
        : [];
    const trancheTotal = tranches.reduce((sum, t) => sum + euros(t?.marketValue), 0);
    const cashAmount = euros(portfolio.healthBucketCashAmount);
    const total = trancheTotal + cashAmount;

    if (total <= 0) return;

    for (const tranche of tranches) {
        const share = trancheTotal > 0 ? euros(tranche?.marketValue) / total : 0;
        tranche.marketValue = euros((Number(tranche.marketValue) || 0) + amount * share);
    }

    if (cashAmount > 0 || tranches.length === 0) {
        const cashShare = tranches.length === 0 ? 1 : cashAmount / total;
        portfolio.healthBucketCashAmount = euros(cashAmount + amount * cashShare);
    }
}

export function applyHealthBucketInterest({
    inputs = {},
    portfolio = {},
    rC = 0
} = {}) {
    const config = resolveHealthBucketConfig(inputs, portfolio);
    const startAmount = euros(portfolio.healthBucketGeldmarkt);
    const rate = config.enabled && config.returnMode === 'cash_return' && Number.isFinite(Number(rC))
        ? Number(rC)
        : 0;
    const interest = euros(startAmount * rate);
    if (interest > 0) {
        distributeInterestAcrossBucketSources(portfolio, interest);
        portfolio.healthBucketGeldmarkt = euros(startAmount + interest);
    }

    return {
        enabled: config.enabled,
        startAmount,
        rate,
        interest,
        endAmount: euros(portfolio.healthBucketGeldmarkt)
    };
}

export function buildHealthBucketDiagnostics({
    inputs = {},
    portfolio = {},
    cumulativeInflationFactor = 1
} = {}) {
    const config = resolveHealthBucketConfig(inputs, portfolio);
    const currentAmount = euros(portfolio.healthBucketGeldmarkt);
    const nominalTarget = config.enabled ? euros(config.initialAmount) : 0;
    const inflationFactor = Math.max(0, Number(cumulativeInflationFactor) || 1);
    const inflationAdjustedTarget = config.targetMode === 'inflation_indexed_diagnostic'
        ? euros(nominalTarget * inflationFactor)
        : nominalTarget;
    const realCoveragePct = inflationAdjustedTarget > 0
        ? (currentAmount / inflationAdjustedTarget) * 100
        : null;

    return {
        enabled: config.enabled,
        targetMode: config.targetMode,
        currentAmount,
        nominalTarget,
        inflationAdjustedTarget,
        realCoveragePct,
        targetGap: euros(inflationAdjustedTarget - currentAmount)
    };
}

