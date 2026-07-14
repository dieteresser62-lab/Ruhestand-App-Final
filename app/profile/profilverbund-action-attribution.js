/**
 * Module: Profilverbund Action Attribution
 * Purpose: Attributes one finalized household action to profile-owned sources without
 *          allowing profile-level engines to create new transaction purposes.
 */
"use strict";

import { settleTaxYear } from '../../engine/tax-settlement.mjs';
import { buildProfileOwnedTranches } from './profilverbund-balance.js';

const TOLERANCE_EUR = 0.01;
const EPSILON = 1e-9;
const USE_KEYS = ['liquiditaet', 'gold', 'aktien', 'geldmarkt', 'bonds'];

function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function hasFiniteValue(value) {
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

function sum(values) {
    return values.reduce((total, value) => total + finiteNumber(value), 0);
}

function isLiquiditySource(source) {
    return source?.kind === 'liquiditaet' || source?.source === 'Liquidität';
}

function normalizeUses(uses = {}) {
    const normalized = {};
    const keys = new Set([...USE_KEYS, ...Object.keys(uses || {})]);
    keys.forEach(key => {
        const value = finiteNumber(uses?.[key]);
        if (value < -TOLERANCE_EUR) {
            throw new Error(`Profilverbund: Negative Verwendung fuer ${key} ist nicht zulaessig.`);
        }
        normalized[key] = Math.max(0, value);
    });
    return normalized;
}

function sumUses(uses) {
    return sum(Object.values(uses || {}));
}

function profileTaxParameters(profile) {
    const inputs = profile?.inputs || {};
    const lastState = profile?.balanceState?.lastState || {};
    return {
        taxStatePrev: lastState.taxState || { lossCarry: 0 },
        sparerPauschbetrag: Math.max(0, finiteNumber(inputs.sparerPauschbetrag)),
        kirchensteuerSatz: Math.max(0, finiteNumber(inputs.kirchensteuerSatz))
    };
}

function sourceRawAggregate(source, scale = 1) {
    const factor = Math.max(0, finiteNumber(scale, 1));
    const gross = Math.max(0, finiteNumber(source?.brutto)) * factor;
    const realizedRaw = Number(source?.realizedGainSigned);
    const gainQuote = finiteNumber(source?.gainQuoteSigned, finiteNumber(source?.gainQuotePlan));
    const realizedGainSigned = Number.isFinite(realizedRaw)
        ? realizedRaw * factor
        : gross * gainQuote;
    const taxableRaw = Number(source?.taxableAfterTqfSigned);
    const tqf = Math.max(0, Math.min(1, finiteNumber(source?.tqf)));
    const taxableAfterTqfSigned = Number.isFinite(taxableRaw)
        ? taxableRaw * factor
        : realizedGainSigned * (1 - tqf);
    return { sumRealizedGainSigned: realizedGainSigned, sumTaxableAfterTqfSigned: taxableAfterTqfSigned };
}

function addRawAggregate(target, source) {
    target.sumRealizedGainSigned += finiteNumber(source?.sumRealizedGainSigned);
    target.sumTaxableAfterTqfSigned += finiteNumber(source?.sumTaxableAfterTqfSigned);
    return target;
}

function rawAggregateForSources(sources, scale = 1) {
    return (sources || []).reduce(
        (aggregate, source) => addRawAggregate(aggregate, sourceRawAggregate(source, scale)),
        { sumRealizedGainSigned: 0, sumTaxableAfterTqfSigned: 0 }
    );
}

function previewTaxDueForScale(profile, rawAggregateAtFullScale, scale) {
    const params = profileTaxParameters(profile);
    const lossCarry = Math.max(0, finiteNumber(params.taxStatePrev?.lossCarry));
    const taxable = finiteNumber(rawAggregateAtFullScale?.sumTaxableAfterTqfSigned) * scale;
    const positiveAfterCarry = Math.max(0, taxable - lossCarry);
    const taxBase = Math.max(0, positiveAfterCarry - params.sparerPauschbetrag);
    const taxRate = 0.25 * (1 + 0.055 + params.kirchensteuerSatz);
    return taxBase * taxRate;
}

function allocateCentsByWeights(amount, entries, weightOf) {
    const totalCents = Math.max(0, Math.round(finiteNumber(amount) * 100));
    const weights = entries.map((entry, index) => Math.max(0, finiteNumber(weightOf(entry, index))));
    const totalWeight = sum(weights);
    if (totalCents === 0) return entries.map(() => 0);
    if (totalWeight <= 0) {
        throw new Error('Profilverbund: Verwendung kann keinem ausfuehrenden Profil zugeordnet werden.');
    }

    const rows = entries.map((entry, index) => {
        const exact = totalCents * (weights[index] / totalWeight);
        return { index, cents: Math.floor(exact), fraction: exact - Math.floor(exact) };
    });
    let remaining = totalCents - sum(rows.map(row => row.cents));
    rows.slice()
        .sort((left, right) => (right.fraction - left.fraction) || (left.index - right.index))
        .forEach(row => {
            if (remaining <= 0) return;
            rows[row.index].cents += 1;
            remaining -= 1;
        });
    return rows.map(row => row.cents / 100);
}

function allocateLiquiditySources(totalAmount, profiles, mode) {
    const totalCents = Math.max(0, Math.round(finiteNumber(totalAmount) * 100));
    const entries = profiles.map((profile, index) => ({
        profile,
        index,
        capacityCents: Math.max(0, Math.round((
            finiteNumber(profile?.inputs?.tagesgeld) + finiteNumber(profile?.inputs?.geldmarktEtf)
        ) * 100))
    }));
    const totalCapacity = sum(entries.map(entry => entry.capacityCents));
    if (totalCents > totalCapacity + 1) {
        throw new Error(`Profilverbund: Liquiditaetsquelle ist um ${((totalCents - totalCapacity) / 100).toFixed(2)} EUR unterdeckt.`);
    }

    const allocations = new Array(entries.length).fill(0);
    if (mode === 'tax_optimized') {
        let remaining = totalCents;
        entries.slice()
            .sort((left, right) => String(left.profile.profileId).localeCompare(String(right.profile.profileId)))
            .forEach(entry => {
                const used = Math.min(remaining, entry.capacityCents);
                allocations[entry.index] = used;
                remaining -= used;
            });
    } else if (totalCapacity > 0) {
        const rows = entries.map(entry => {
            const exact = totalCents * (entry.capacityCents / totalCapacity);
            return {
                ...entry,
                cents: Math.min(entry.capacityCents, Math.floor(exact)),
                fraction: exact - Math.floor(exact)
            };
        });
        let remaining = totalCents - sum(rows.map(row => row.cents));
        rows.slice()
            .sort((left, right) => (right.fraction - left.fraction) || (left.index - right.index))
            .forEach(row => {
                if (remaining <= 0) return;
                const capacityLeft = row.capacityCents - rows[row.index].cents;
                if (capacityLeft <= 0) return;
                rows[row.index].cents += 1;
                remaining -= 1;
            });
        if (remaining > 0) {
            rows.forEach(row => {
                if (remaining <= 0) return;
                const used = Math.min(remaining, row.capacityCents - row.cents);
                row.cents += used;
                remaining -= used;
            });
        }
        rows.forEach(row => { allocations[row.index] = row.cents; });
    }

    const allocated = sum(allocations);
    if (Math.abs(allocated - totalCents) > 1) {
        throw new Error(`Profilverbund: ${(Math.abs(totalCents - allocated) / 100).toFixed(2)} EUR Liquiditaet konnten keinem Profil zugeordnet werden.`);
    }

    return entries.flatMap(entry => {
        const amount = allocations[entry.index] / 100;
        if (amount <= 0) return [];
        return [{
            source: 'Liquidität',
            kind: 'liquiditaet',
            brutto: amount,
            netto: amount,
            steuer: 0,
            sourceProfileId: entry.profile.profileId
        }];
    });
}

function resolveAssetBucket(value = {}) {
    const category = String(value?.category || '').toLowerCase();
    const kind = String(value?.type || value?.kind || '').toLowerCase();
    if (category === 'bonds' || kind.includes('bond') || kind.includes('anleihe')) return 'bonds';
    if (category === 'gold' || kind.includes('gold')) return 'gold';
    if (category === 'equity' || kind.includes('aktien') || kind.includes('equity')) return 'equity';
    return null;
}

function candidateFromTranche(tranche, profile, index) {
    const marketValue = Math.max(0, finiteNumber(tranche?.marketValue, finiteNumber(tranche?.shares) * finiteNumber(tranche?.currentPrice)));
    const costBasis = Math.max(0, finiteNumber(tranche?.costBasis, finiteNumber(tranche?.shares) * finiteNumber(tranche?.purchasePrice)));
    const bucket = resolveAssetBucket(tranche);
    if (!bucket || marketValue <= EPSILON) return null;
    const tqfRaw = Number(tranche?.tqf);
    const tqf = Math.max(0, Math.min(1, Number.isFinite(tqfRaw) ? tqfRaw : 0.3));
    const realizedRatio = (marketValue - costBasis) / marketValue;
    const taxableRatio = realizedRatio * (1 - tqf);
    const purchaseStamp = tranche?.purchaseDate && Number.isFinite(Date.parse(tranche.purchaseDate))
        ? Date.parse(tranche.purchaseDate)
        : Number.POSITIVE_INFINITY;
    return {
        key: `${profile.profileId}:${tranche?.trancheId || tranche?.isin || tranche?.name || 'tranche'}:${bucket}:${index}`,
        profile,
        sourceProfileId: profile.profileId,
        sourceProfileName: profile.name || profile.profileId,
        bucket,
        kind: tranche?.type || tranche?.kind || (bucket === 'equity' ? 'aktien_neu' : bucket),
        category: tranche?.category || bucket,
        trancheId: tranche?.trancheId || null,
        name: tranche?.name || null,
        isin: tranche?.isin || null,
        purchaseDate: tranche?.purchaseDate || null,
        purchaseStamp,
        tqf,
        capacity: marketValue,
        realizedRatio,
        taxableRatio,
        sourceTemplate: tranche
    };
}

function candidateFromPlannedSource(source, profile, index) {
    const capacity = Math.max(0, finiteNumber(source?.brutto));
    const bucket = resolveAssetBucket(source);
    if (!bucket || capacity <= EPSILON) return null;
    const tqfRaw = Number(source?.tqf);
    const tqf = Math.max(0, Math.min(1, Number.isFinite(tqfRaw) ? tqfRaw : 0.3));
    const realizedRatio = hasFiniteValue(source?.realizedGainSigned)
        ? finiteNumber(source.realizedGainSigned) / capacity
        : finiteNumber(source?.gainQuoteSigned, finiteNumber(source?.gainQuotePlan));
    const taxableRatio = hasFiniteValue(source?.taxableAfterTqfSigned)
        ? finiteNumber(source.taxableAfterTqfSigned) / capacity
        : realizedRatio * (1 - tqf);
    const purchaseStamp = source?.purchaseDate && Number.isFinite(Date.parse(source.purchaseDate))
        ? Date.parse(source.purchaseDate)
        : Number.POSITIVE_INFINITY;
    return {
        key: `${profile.profileId}:${source?.trancheId || source?.isin || source?.name || 'planned'}:${bucket}:planned-${index}`,
        profile,
        sourceProfileId: profile.profileId,
        sourceProfileName: profile.name || profile.profileId,
        bucket,
        kind: source?.kind || (bucket === 'equity' ? 'aktien_neu' : bucket),
        category: source?.category || bucket,
        trancheId: source?.trancheId || null,
        name: source?.name || null,
        isin: source?.isin || null,
        purchaseDate: source?.purchaseDate || null,
        purchaseStamp,
        tqf,
        capacity,
        realizedRatio,
        taxableRatio,
        sourceTemplate: source,
        plannedSourceFallback: true
    };
}

function buildAssetCandidates(profiles, plannedSources) {
    const candidates = profiles.flatMap(profile => buildProfileOwnedTranches(profile)
        .map((tranche, index) => candidateFromTranche(tranche, profile, index))
        .filter(Boolean));
    plannedSources.forEach((source, index) => {
        const profile = profiles.find(entry => entry.profileId === source.sourceProfileId);
        const bucket = resolveAssetBucket(source);
        const matchingCandidates = candidates.filter(candidate => (
            candidate.sourceProfileId === source.sourceProfileId && candidate.bucket === bucket
        ));
        const exactCandidateExists = source?.trancheId && matchingCandidates.some(candidate => candidate.trancheId === source.trancheId);
        if (exactCandidateExists || (!source?.trancheId && matchingCandidates.length > 0)) return;
        const fallback = candidateFromPlannedSource(source, profile, index);
        if (fallback) candidates.push(fallback);
    });
    return candidates;
}

function buildAssetBlueprint(plannedSources) {
    const order = [];
    const grossByBucket = new Map();
    plannedSources.forEach(source => {
        const bucket = resolveAssetBucket(source);
        if (!bucket) {
            throw new Error(`Profilverbund: Verkaufsquelle ${source?.kind || source?.category || 'unbekannt'} besitzt keine attribuierbare Assetklasse.`);
        }
        if (!grossByBucket.has(bucket)) order.push(bucket);
        grossByBucket.set(bucket, (grossByBucket.get(bucket) || 0) + Math.max(0, finiteNumber(source.brutto)));
    });
    return { order, grossByBucket };
}

function stableCandidateComparison(left, right) {
    if (left.taxableRatio !== right.taxableRatio) return left.taxableRatio - right.taxableRatio;
    const profileOrder = String(left.sourceProfileId).localeCompare(String(right.sourceProfileId));
    if (profileOrder !== 0) return profileOrder;
    if (left.purchaseStamp !== right.purchaseStamp) return left.purchaseStamp - right.purchaseStamp;
    return String(left.key).localeCompare(String(right.key));
}

function sourceFromCandidate(candidate, gross) {
    const brutto = Math.max(0, finiteNumber(gross));
    const realizedGainSigned = brutto * candidate.realizedRatio;
    const taxableAfterTqfSigned = brutto * candidate.taxableRatio;
    return {
        kind: candidate.kind,
        category: candidate.category,
        trancheId: candidate.trancheId,
        sourceProfileId: candidate.sourceProfileId,
        sourceProfileName: candidate.sourceProfileName,
        name: candidate.name,
        isin: candidate.isin,
        purchaseDate: candidate.purchaseDate,
        brutto,
        steuer: 0,
        netto: brutto,
        tqf: candidate.tqf,
        gainQuotePlan: Math.max(0, candidate.realizedRatio),
        gainQuoteSigned: candidate.realizedRatio,
        realizedGainSigned,
        taxableAfterTqfSigned
    };
}

function appendCandidateSelection(selected, candidate, gross) {
    if (gross <= EPSILON) return;
    const existing = selected.get(candidate.key);
    selected.set(candidate.key, {
        candidate,
        gross: (existing?.gross || 0) + gross
    });
}

function marginalTaxDescriptor(candidate, rawAggregate) {
    const params = profileTaxParameters(candidate.profile);
    const currentTaxable = finiteNumber(rawAggregate?.sumTaxableAfterTqfSigned);
    if (candidate.taxableRatio <= 0) {
        return { rate: 0, zeroTaxBoundary: Number.POSITIVE_INFINITY };
    }
    const allowance = Math.max(
        0,
        Math.max(0, finiteNumber(params.taxStatePrev?.lossCarry)) + params.sparerPauschbetrag - currentTaxable
    );
    if (allowance > EPSILON) {
        return { rate: 0, zeroTaxBoundary: allowance / candidate.taxableRatio };
    }
    return {
        rate: candidate.taxableRatio * 0.25 * (1 + 0.055 + params.kirchensteuerSatz),
        zeroTaxBoundary: Number.POSITIVE_INFINITY
    };
}

function selectTaxOptimizedGross(candidates, grossTarget, selected, rawByProfile) {
    let remaining = grossTarget;
    const usedByCandidate = new Map();
    while (remaining > EPSILON) {
        const choices = candidates
            .map(candidate => {
                const capacityLeft = candidate.capacity - (usedByCandidate.get(candidate.key) || 0);
                if (capacityLeft <= EPSILON) return null;
                return {
                    candidate,
                    capacityLeft,
                    marginal: marginalTaxDescriptor(candidate, rawByProfile.get(candidate.sourceProfileId))
                };
            })
            .filter(Boolean)
            .sort((left, right) => (
                (left.marginal.rate - right.marginal.rate)
                || stableCandidateComparison(left.candidate, right.candidate)
            ));
        if (!choices.length) break;
        const choice = choices[0];
        const chunk = Math.min(remaining, choice.capacityLeft, choice.marginal.zeroTaxBoundary);
        if (chunk <= EPSILON) break;
        usedByCandidate.set(choice.candidate.key, (usedByCandidate.get(choice.candidate.key) || 0) + chunk);
        appendCandidateSelection(selected, choice.candidate, chunk);
        addRawAggregate(rawByProfile.get(choice.candidate.sourceProfileId), {
            sumRealizedGainSigned: chunk * choice.candidate.realizedRatio,
            sumTaxableAfterTqfSigned: chunk * choice.candidate.taxableRatio
        });
        remaining -= chunk;
    }
    if (remaining > TOLERANCE_EUR) {
        throw new Error(`Profilverbund: ${remaining.toFixed(2)} EUR Bruttoverkauf besitzen keine geeignete steueroptimierte Quelle.`);
    }
}

function profileAllocationWeight(profile, mode) {
    const inputs = profile?.inputs || {};
    if (mode === 'runway_first') return Math.max(0, finiteNumber(inputs.runwayTargetMonths));
    return Math.max(0,
        finiteNumber(inputs.depotwertAlt)
        + finiteNumber(inputs.depotwertNeu)
        + finiteNumber(inputs.goldWert)
        + finiteNumber(inputs.tagesgeld)
        + finiteNumber(inputs.geldmarktEtf)
    );
}

function allocateGrossByProfile(grossTarget, candidates, profiles, mode) {
    const capacities = new Map(profiles.map(profile => [
        profile.profileId,
        sum(candidates.filter(candidate => candidate.sourceProfileId === profile.profileId).map(candidate => candidate.capacity))
    ]));
    const allocations = new Map(profiles.map(profile => [profile.profileId, 0]));
    let remaining = grossTarget;
    let active = profiles.filter(profile => (capacities.get(profile.profileId) || 0) > EPSILON);
    while (remaining > EPSILON && active.length) {
        const rawWeights = active.map(profile => profileAllocationWeight(profile, mode));
        const totalRawWeight = sum(rawWeights);
        const weights = totalRawWeight > EPSILON
            ? rawWeights
            : active.map(profile => capacities.get(profile.profileId) - allocations.get(profile.profileId));
        const totalWeight = sum(weights);
        if (totalWeight <= EPSILON) break;
        const capped = [];
        active.forEach((profile, index) => {
            const capacityLeft = capacities.get(profile.profileId) - allocations.get(profile.profileId);
            const share = remaining * (weights[index] / totalWeight);
            if (share >= capacityLeft - EPSILON) capped.push({ profile, capacityLeft });
        });
        if (!capped.length) {
            active.forEach((profile, index) => {
                allocations.set(profile.profileId, allocations.get(profile.profileId) + remaining * (weights[index] / totalWeight));
            });
            remaining = 0;
            break;
        }
        capped.forEach(({ profile, capacityLeft }) => {
            allocations.set(profile.profileId, allocations.get(profile.profileId) + capacityLeft);
            remaining -= capacityLeft;
        });
        const cappedIds = new Set(capped.map(entry => entry.profile.profileId));
        active = active.filter(profile => !cappedIds.has(profile.profileId));
    }
    if (remaining > TOLERANCE_EUR) {
        throw new Error(`Profilverbund: ${remaining.toFixed(2)} EUR Bruttoverkauf konnten keinem Profil zugeordnet werden.`);
    }
    return allocations;
}

function selectWeightedGross(candidates, profiles, grossTarget, mode, selected, rawByProfile) {
    const allocations = allocateGrossByProfile(grossTarget, candidates, profiles, mode);
    profiles.forEach(profile => {
        let remaining = allocations.get(profile.profileId) || 0;
        const ordered = candidates
            .filter(candidate => candidate.sourceProfileId === profile.profileId)
            .slice()
            .sort(stableCandidateComparison);
        ordered.forEach(candidate => {
            if (remaining <= EPSILON) return;
            const gross = Math.min(remaining, candidate.capacity);
            appendCandidateSelection(selected, candidate, gross);
            addRawAggregate(rawByProfile.get(profile.profileId), {
                sumRealizedGainSigned: gross * candidate.realizedRatio,
                sumTaxableAfterTqfSigned: gross * candidate.taxableRatio
            });
            remaining -= gross;
        });
        if (remaining > TOLERANCE_EUR) {
            throw new Error(`Profilverbund: ${remaining.toFixed(2)} EUR Profilverkauf besitzen keine konkrete Tranche.`);
        }
    });
}

function selectAssetSourcesAtScale({ candidates, blueprint, profiles, mode, scale }) {
    const selected = new Map();
    const rawByProfile = new Map(profiles.map(profile => [
        profile.profileId,
        { sumRealizedGainSigned: 0, sumTaxableAfterTqfSigned: 0 }
    ]));
    blueprint.order.forEach(bucket => {
        const bucketCandidates = candidates.filter(candidate => candidate.bucket === bucket);
        const grossTarget = (blueprint.grossByBucket.get(bucket) || 0) * scale;
        if (mode === 'tax_optimized') {
            selectTaxOptimizedGross(bucketCandidates, grossTarget, selected, rawByProfile);
        } else {
            selectWeightedGross(bucketCandidates, profiles, grossTarget, mode, selected, rawByProfile);
        }
    });
    const sources = [...selected.values()].map(entry => sourceFromCandidate(entry.candidate, entry.gross));
    const tax = sum(profiles.map(profile => previewTaxDueForScale(profile, rawByProfile.get(profile.profileId), 1)));
    return {
        sources,
        tax,
        net: sum(sources.map(source => source.brutto)) - tax
    };
}

function planAssetSources(plannedSources, profiles, mode, targetNet) {
    if (targetNet <= TOLERANCE_EUR) return { sources: [], scale: 0 };
    if (!plannedSources.length) {
        throw new Error(`Profilverbund: ${targetNet.toFixed(2)} EUR Netto-Verwendung besitzen keine attribuierbare Verkaufsquelle.`);
    }
    const blueprint = buildAssetBlueprint(plannedSources);
    const candidates = buildAssetCandidates(profiles, plannedSources);
    const scaleCaps = blueprint.order.map(bucket => {
        const plannedGross = blueprint.grossByBucket.get(bucket) || 0;
        const capacity = sum(candidates.filter(candidate => candidate.bucket === bucket).map(candidate => candidate.capacity));
        return plannedGross > EPSILON ? capacity / plannedGross : Number.POSITIVE_INFINITY;
    });
    const maxScale = Math.min(...scaleCaps);
    if (!Number.isFinite(maxScale) || maxScale <= EPSILON) {
        throw new Error('Profilverbund: Haushaltsverkauf besitzt keine ausreichende profilbezogene Tranche.');
    }
    const maxPlan = selectAssetSourcesAtScale({ candidates, blueprint, profiles, mode, scale: maxScale });
    if (maxPlan.net < targetNet - TOLERANCE_EUR) {
        throw new Error(`Profilverbund: Finale Profilsteuern unterdecken die Haushaltsverwendung um ${(targetNet - maxPlan.net).toFixed(2)} EUR.`);
    }
    let lower = 0;
    let upper = maxScale;
    for (let iteration = 0; iteration < 80; iteration += 1) {
        const middle = (lower + upper) / 2;
        const plan = selectAssetSourcesAtScale({ candidates, blueprint, profiles, mode, scale: middle });
        if (plan.net < targetNet) lower = middle;
        else upper = middle;
    }
    const plan = selectAssetSourcesAtScale({ candidates, blueprint, profiles, mode, scale: upper });
    return { sources: plan.sources, scale: upper };
}

function allocateSettlementTaxToSources(sources, taxDue) {
    if (!sources.length) return [];
    const positiveTaxable = sources.map(source => Math.max(0, finiteNumber(source.taxableAfterTqfSigned)));
    const taxableTotal = sum(positiveTaxable);
    const weights = taxableTotal > 0 ? positiveTaxable : sources.map(source => finiteNumber(source.brutto));
    const weightTotal = sum(weights);
    let taxRemaining = Math.max(0, finiteNumber(taxDue));

    return sources.map((source, index) => {
        const isLast = index === sources.length - 1;
        const allocatedTax = isLast
            ? taxRemaining
            : Math.min(taxRemaining, taxDue * (weightTotal > 0 ? weights[index] / weightTotal : 0));
        taxRemaining -= allocatedTax;
        return {
            ...source,
            steuerPlan: finiteNumber(source.steuer),
            steuer: allocatedTax,
            netto: finiteNumber(source.brutto) - allocatedTax
        };
    });
}

export function calculateActionLiquidityDelta(action = {}) {
    const uses = normalizeUses(action.verwendungen || {});
    const liquidityOutflow = (Array.isArray(action.quellen) ? action.quellen : [])
        .filter(isLiquiditySource)
        .reduce((total, source) => total + Math.max(0, finiteNumber(source?.brutto)), 0);
    return finiteNumber(uses.liquiditaet) - liquidityOutflow;
}

export function reconcileHouseholdLiquidityKpis({ modelResult, inputData, action }) {
    if (!modelResult?.ui) return null;
    const liquidityBefore = finiteNumber(inputData?.tagesgeld) + finiteNumber(inputData?.geldmarktEtf);
    const liquidityAfter = liquidityBefore + calculateActionLiquidityDelta(action);
    const targetLiquidity = Math.max(0, finiteNumber(modelResult.ui.zielLiquiditaet));
    const coverage = value => targetLiquidity > 0 ? (value / targetLiquidity) * 100 : 100;
    const monthlyWithdrawal = Math.max(0, finiteNumber(modelResult.ui?.spending?.monatlicheEntnahme));
    const runwayMonths = monthlyWithdrawal > 0 ? liquidityAfter / monthlyWithdrawal : Infinity;

    modelResult.ui.liquiditaet = {
        ...(modelResult.ui.liquiditaet || {}),
        deckungVorher: coverage(liquidityBefore),
        deckungNachher: coverage(liquidityAfter)
    };
    modelResult.ui.runway = { ...(modelResult.ui.runway || {}), months: runwayMonths };
    modelResult.diagnosis = modelResult.diagnosis || {};
    modelResult.diagnosis.general = modelResult.diagnosis.general || {};
    modelResult.diagnosis.general.deckungVorher = coverage(liquidityBefore);
    modelResult.diagnosis.general.deckungNachher = coverage(liquidityAfter);
    modelResult.diagnosis.general.runwayMonate = runwayMonths;
    return { liquidityBefore, liquidityAfter, targetLiquidity, runwayMonths };
}

export function attributeHouseholdAction({ householdAction, profiles, mode = 'tax_optimized' }) {
    const profileList = Array.isArray(profiles) ? profiles : [];
    if (profileList.length < 2) {
        throw new Error('Profilverbund: Haushaltsattribution erfordert mindestens zwei Profile.');
    }
    const profileById = new Map(profileList.map(profile => [profile.profileId, profile]));
    if (profileById.size !== profileList.length || profileById.has(undefined) || profileById.has(null)) {
        throw new Error('Profilverbund: Profile besitzen keine eindeutige Profil-ID.');
    }

    const uses = normalizeUses(householdAction?.verwendungen || {});
    const targetNet = sumUses(uses);
    const originalSources = Array.isArray(householdAction?.quellen) ? householdAction.quellen : [];
    originalSources.forEach(source => {
        if (!hasFiniteValue(source?.brutto) || Number(source.brutto) < -TOLERANCE_EUR) {
            throw new Error('Profilverbund: Quelle besitzt keinen gueltigen nichtnegativen Bruttobetrag.');
        }
    });
    const cashTotal = originalSources
        .filter(isLiquiditySource)
        .reduce((total, source) => total + Math.max(0, finiteNumber(source?.brutto)), 0);
    const cashSources = allocateLiquiditySources(cashTotal, profileList, mode);
    const assetSources = originalSources
        .filter(source => !isLiquiditySource(source) && finiteNumber(source?.brutto) > 0)
        .map(source => {
            const sourceProfileId = source?.sourceProfileId;
            if (!sourceProfileId || !profileById.has(sourceProfileId)) {
                throw new Error('Profilverbund: Verkaufstranche besitzt keine eindeutige sourceProfileId.');
            }
            const hasRealizedRaw = hasFiniteValue(source?.realizedGainSigned) || hasFiniteValue(source?.gainQuoteSigned) || hasFiniteValue(source?.gainQuotePlan);
            const hasTaxableRaw = hasFiniteValue(source?.taxableAfterTqfSigned) || (hasRealizedRaw && hasFiniteValue(source?.tqf));
            if (!hasRealizedRaw || !hasTaxableRaw) {
                throw new Error('Profilverbund: Verkaufstranche besitzt keine vollstaendigen Steuer-Rohdaten.');
            }
            return { ...source, sourceProfileId, brutto: Math.max(0, finiteNumber(source.brutto)) };
        });

    const assetTargetNet = targetNet - cashTotal;
    if (assetTargetNet < -TOLERANCE_EUR) {
        throw new Error(`Profilverbund: Liquiditaetsquellen uebersteigen die Haushaltsverwendungen um ${Math.abs(assetTargetNet).toFixed(2)} EUR.`);
    }
    if (targetNet <= TOLERANCE_EUR && assetSources.some(source => source.brutto > TOLERANCE_EUR)) {
        throw new Error('Profilverbund: Verkaufsquellen besitzen keine verbindliche Haushaltsverwendung.');
    }
    const assetPlan = planAssetSources(assetSources, profileList, mode, Math.max(0, assetTargetNet));
    const assetScale = assetPlan.scale;
    const scaledAssetSources = assetPlan.sources;
    const scaledByProfile = new Map(profileList.map(profile => [profile.profileId, []]));
    scaledAssetSources.forEach(source => scaledByProfile.get(source.sourceProfileId).push(source));

    const settlements = profileList.map(profile => {
        const rawAggregate = rawAggregateForSources(scaledByProfile.get(profile.profileId), 1);
        const params = profileTaxParameters(profile);
        const settlement = settleTaxYear({ ...params, rawAggregate });
        const sources = allocateSettlementTaxToSources(scaledByProfile.get(profile.profileId), settlement.taxDue);
        return {
            profileId: profile.profileId,
            rawAggregate,
            taxDue: settlement.taxDue,
            taxStateNext: settlement.taxStateNext,
            details: settlement.details,
            sources
        };
    });
    const settlementByProfile = new Map(settlements.map(settlement => [settlement.profileId, settlement]));

    cashSources.forEach(source => {
        settlementByProfile.get(source.sourceProfileId).sources.unshift(source);
    });
    const profileNetWeights = settlements.map(settlement => sum(settlement.sources.map(source => source.netto)));
    const usesByProfile = settlements.map(() => ({}));
    Object.entries(uses).forEach(([key, amount]) => {
        const allocations = allocateCentsByWeights(amount, settlements, (_, index) => profileNetWeights[index]);
        allocations.forEach((allocation, index) => { usesByProfile[index][key] = allocation; });
    });

    const profileActions = settlements.map((settlement, index) => {
        const sources = settlement.sources;
        const profileNet = sum(sources.map(source => source.netto));
        const profileUses = usesByProfile[index];
        const material = profileNet > TOLERANCE_EUR || sumUses(profileUses) > TOLERANCE_EUR;
        return {
            profileId: settlement.profileId,
            action: {
                ...householdAction,
                type: material ? 'TRANSACTION' : 'NONE',
                title: material ? 'Profilverbund-Transaktionen' : 'Kein Handlungsbedarf',
                anweisungKlasse: material ? 'anweisung-gelb' : 'anweisung-gruen',
                nettoErlös: profileNet,
                steuer: settlement.taxDue,
                quellen: sources,
                verwendungen: profileUses,
                taxRawAggregate: { ...settlement.rawAggregate },
                taxSettlement: { ...settlement.details },
                bruttoVerkaufGesamt: sum(sources.filter(source => !isLiquiditySource(source)).map(source => source.brutto)),
                steuerPlanGesamt: settlement.taxDue,
                nettoErlösPlan: profileNet,
                taxCashAdjustment: 0,
                sourceProfileId: settlement.profileId
            },
            taxStateNext: settlement.taxStateNext
        };
    });

    const finalSources = profileActions.flatMap(entry => entry.action.quellen);
    const finalTax = sum(settlements.map(settlement => settlement.taxDue));
    const finalNet = sum(finalSources.map(source => source.netto));
    const rawAggregate = settlements.reduce(
        (aggregate, settlement) => addRawAggregate(aggregate, settlement.rawAggregate),
        { sumRealizedGainSigned: 0, sumTaxableAfterTqfSigned: 0 }
    );
    if (Math.abs(finalNet - targetNet) > TOLERANCE_EUR) {
        throw new Error(`Profilverbund: Quellen und Verwendungen weichen um ${Math.abs(finalNet - targetNet).toFixed(2)} EUR voneinander ab.`);
    }
    const transactionDiagnostics = householdAction?.transactionDiagnostics
        ? {
            ...householdAction.transactionDiagnostics,
            selectedTranches: finalSources
                .filter(source => !isLiquiditySource(source))
                .map(source => ({
                    kind: source.kind,
                    name: source.name || null,
                    trancheId: source.trancheId || null,
                    sourceProfileId: source.sourceProfileId,
                    brutto: source.brutto,
                    steuer: source.steuer,
                    taxPerEuro: source.brutto > 0 ? source.steuer / source.brutto : 0
                }))
        }
        : undefined;
    const finalTaxSettlement = {
        profilverbund: true,
        taxAfterLossCarry: finalTax,
        profiles: settlements.map(settlement => ({
            profileId: settlement.profileId,
            taxDue: settlement.taxDue,
            taxStateNext: settlement.taxStateNext,
            details: settlement.details
        }))
    };

    const finalAction = {
        ...householdAction,
        type: targetNet > TOLERANCE_EUR ? 'TRANSACTION' : (householdAction?.type || 'NONE'),
        title: targetNet > TOLERANCE_EUR ? 'Profilverbund-Transaktionen' : (householdAction?.title || 'Kein Handlungsbedarf'),
        anweisungKlasse: targetNet > TOLERANCE_EUR ? 'anweisung-gelb' : (householdAction?.anweisungKlasse || 'anweisung-gruen'),
        nettoErlös: finalNet,
        steuer: finalTax,
        quellen: finalSources,
        verwendungen: uses,
        bruttoVerkaufGesamt: sum(finalSources.filter(source => !isLiquiditySource(source)).map(source => source.brutto)),
        steuerPlanGesamt: finalTax,
        nettoErlösPlan: finalNet,
        taxCashAdjustment: 0,
        taxRawAggregate: rawAggregate,
        taxSettlement: finalTaxSettlement,
        taxSettlements: settlements.map(settlement => ({
            profileId: settlement.profileId,
            taxDue: settlement.taxDue,
            taxStateNext: settlement.taxStateNext,
            details: settlement.details
        })),
        ...(transactionDiagnostics ? { transactionDiagnostics } : {}),
        attributionMode: mode
    };

    return { finalAction, profileActions, settlements, assetScale };
}
