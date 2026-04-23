/**
 * Module: Three-Bucket Jilge Logic
 * Purpose: Provides shared logic for applying the 3-Bucket decumulation strategy
 *          (selling bonds instead of stocks during a market crash) to the standard 
 *          engine output. Used by both Simulator and Balance App.
 */

import { STRATEGY_OPTIONS } from '../../types/strategy-options.js';
import { CONFIG } from '../config.mjs';
import { calculateSaleAndTax } from './sale-engine.mjs';

const THREE_BUCKET_CFG = CONFIG.SPENDING_MODEL?.THREE_BUCKET || {};

/**
 * Checks if an asset type or category is considered a bond.
 */
export function isBondCategory(category) {
    if (!category) return false;
    const catStr = String(category).toLowerCase();
    return catStr === 'anleihe' || catStr === 'bonds' || catStr.includes('bond');
}

/**
 * Normalizes input settings specifically for the 3-Bucket strategy.
 */
export function getThreeBucketInputs(inputs) {
    const dec = (inputs?.decumulation && typeof inputs.decumulation === 'object') ? inputs.decumulation : {};
    const modeRaw = String(dec.mode || '').toLowerCase();
    const drawdownRaw = Number(dec.drawdownTrigger);

    // Normalize drawdown to negative, fallback to config
    const normalizedDrawdown = Number.isFinite(drawdownRaw)
        ? (drawdownRaw > 0 ? -drawdownRaw : drawdownRaw)
        : Number(THREE_BUCKET_CFG.DEFAULT_DRAWDOWN_TRIGGER ?? -15);

    const targetRaw = Number(dec.bondTargetFactor);
    const refillRaw = Number(dec.bondRefillThreshold);

    return {
        is3Bucket: modeRaw === STRATEGY_OPTIONS.THREE_BUCKET_JILGE,
        drawdownTrigger: normalizedDrawdown,
        bondTargetFactor: Number.isFinite(targetRaw) ? Math.max(0, targetRaw) : Number(THREE_BUCKET_CFG.DEFAULT_BOND_TARGET_FACTOR ?? 5),
        bondRefillThresholdPct: Number.isFinite(refillRaw) ? Math.max(0, refillRaw) : null,
        bondNominalReturn: Number(THREE_BUCKET_CFG.BOND_NOMINAL_RETURN ?? 0.02)
    };
}

/**
 * Sums the value of all bond tranches currently present.
 */
export function sumBondBucketValuation(tranches) {
    return (tranches || []).reduce((sum, tranche) => {
        return sum + (isBondCategory(tranche.type) || isBondCategory(tranche.category) ? (Number(tranche.marketValue) || 0) : 0);
    }, 0);
}

/**
 * Central function to apply the 3-Bucket Decumulation.
 * Analyzes the standard Action recommendation. If it's a "bad year" (equity dropped below trigger),
 * overrides equity sales with bond sales.
 * 
 * @param {Array} detailedTranches - The complete list of tranches for calculating sales
 * @param {Object} engineInput - The input config originally passed to the engine
 * @param {Object} market - The market conditions calculated by engine
 * @param {Object} pendingAction - The action recommendation from the standard engine
 * @param {Number} rA - Real return of equities
 * @param {Number} currentBondValuation - Total market value of bonds before this sale
 * @returns {Object} { updatedAction, threeBucketState }
 */
export function applyThreeBucketLogic(
    detailedTranches,
    engineInput,
    market,
    pendingAction,
    rA,
    currentBondValuation
) {
    const threeBucketInput = getThreeBucketInputs(engineInput);
    const is3Bucket = threeBucketInput.is3Bucket;

    // Default pristine state for Diagnostics
    const threeBucketState = {
        is3Bucket,
        isBadYear: false,
        bondBucketBefore: currentBondValuation,
        bondBucketAfter: currentBondValuation,
        bondRefillGross: 0,
        bondRefillNet: 0,
        bondRefillTax: 0,
        bondSaleAmount: 0,
        equityPreserved: 0,
        unmetLiquidity: 0
    };

    if (!is3Bucket) {
        return { updatedAction: pendingAction, threeBucketState };
    }

    // Determine if trigger hit
    const drawdownRatio = (Math.abs(threeBucketInput.drawdownTrigger) > 1)
        ? (threeBucketInput.drawdownTrigger / 100)
        : threeBucketInput.drawdownTrigger;

    const isBadYear = (rA < drawdownRatio);
    threeBucketState.isBadYear = isBadYear;

    let updatedAction = { ...pendingAction };
    const allQuellen = Array.isArray(updatedAction.quellen) ? updatedAction.quellen : [];
    let saleQuellen = allQuellen.filter(q => q?.kind && q.kind !== 'liquiditaet');

    if (isBadYear) {
        // Collect how much equity the engine wanted to sell
        const blockedEquitySale = saleQuellen.reduce((sum, q) => {
            const kind = String(q?.kind || '').toLowerCase();
            if (!kind || kind === 'liquiditaet' || isBondCategory(kind) || kind.startsWith('gold')) return sum;
            return sum + (Number(q?.brutto) || 0);
        }, 0);

        threeBucketState.equityPreserved = blockedEquitySale;

        // Calculate the netto value that MUST be produced
        const requestedNetto = Math.max(0, Number(updatedAction.nettoErlös) || 0);

        // Find specific bond tranches
        const bondTranchesOnly = (detailedTranches || []).filter(t => isBondCategory(t.type) || isBondCategory(t.category));

        if (requestedNetto > 0 && bondTranchesOnly.length > 0) {
            // Re-run the sale engine, BUT restrict it ONLY to Bond tranches
            const bondSale = calculateSaleAndTax(requestedNetto, {
                ...engineInput,
                detailledTranches: bondTranchesOnly,
                depotwertAlt: 0, // Prevent dynamic scaling tricks for equity
                depotwertNeu: 0,
                goldWert: 0
            }, { minGold: 0 }, market, false);

            updatedAction.quellen = Array.isArray(bondSale.breakdown)
                ? bondSale.breakdown.map(item => ({ ...item, category: 'bonds' }))
                : [];

            updatedAction.nettoErlös = bondSale.achievedRefill || 0;
            updatedAction.steuer = bondSale.steuerGesamt || 0;
            updatedAction.taxRawAggregate = {
                sumRealizedGainSigned: Number(bondSale.taxRawAggregate?.sumRealizedGainSigned) || 0,
                sumTaxableAfterTqfSigned: Number(bondSale.taxRawAggregate?.sumTaxableAfterTqfSigned) || 0
            };

            // Deficit if bonds run dry
            threeBucketState.unmetLiquidity = Math.max(0, requestedNetto - (bondSale.achievedRefill || 0));
            threeBucketState.bondSaleAmount = updatedAction.quellen.reduce((sum, q) => sum + (q?.brutto || 0), 0);
            threeBucketState.bondBucketAfter -= threeBucketState.bondSaleAmount;
        } else if (requestedNetto > 0) {
            // No bonds left to sell
            updatedAction.quellen = [];
            updatedAction.nettoErlös = 0;
            updatedAction.steuer = 0;
            threeBucketState.unmetLiquidity = requestedNetto;
        } else {
            // No sales requested
            updatedAction.quellen = [];
        }

    } else {
        // Good year -> Normal behavior. Engine handles standard sales.
        // We do NOT override the action here. Replenishing bond bucket happens 
        // outside of the engine action, usually in the calling wrapper via buy orders
        // if liquidity is excess relative to Target Liquidität.
    }

    return { updatedAction, threeBucketState };
}

/**
 * Calculates whether bonds need to be replenished (bought) in a good year,
 * by selling excess equity. Updates the pendingAction to include these transactions.
 * 
 * @param {Array} detailedTranches - The complete list of tranches for calculating sales
 * @param {Object} engineInput - The input config originally passed to the engine
 * @param {Object} pendingAction - The action recommendation from the standard engine
 * @param {Number} rA - Real return of equities
 * @param {Number} jahresEntnahmeTarget - The annual spending target to size the bond bucket
 * @param {Number} currentBondValuation - Total market value of bonds before this sale
 * @param {Object} market - The market conditions calculated by engine
 * @returns {Object} { updatedAction, bondReplenishmentAmount }
 */
export function appendBondReplenishment(
    detailedTranches,
    engineInput,
    pendingAction,
    rA,
    jahresEntnahmeTarget,
    currentBondValuation,
    market
) {
    const threeBucketInput = getThreeBucketInputs(engineInput);
    if (!threeBucketInput.is3Bucket) return { updatedAction: pendingAction, bondReplenishmentAmount: 0 };

    const drawdownRatio = (Math.abs(threeBucketInput.drawdownTrigger) > 1)
        ? (threeBucketInput.drawdownTrigger / 100)
        : threeBucketInput.drawdownTrigger;
    const isBadYear = (rA < drawdownRatio);

    let updatedAction = { ...pendingAction };
    let bondReplenishmentAmount = 0;
    let addedActionDelta = null;

    if (!isBadYear && threeBucketInput.bondTargetFactor > 0) {
        const bondTarget = Math.max(0, threeBucketInput.bondTargetFactor * jahresEntnahmeTarget);
        const bondDeficit = Math.max(0, bondTarget - currentBondValuation);
        const refillThreshold = Number.isFinite(threeBucketInput.bondRefillThresholdPct)
            ? (bondTarget * (threeBucketInput.bondRefillThresholdPct / 100))
            : 0;

        if (bondDeficit > refillThreshold) {
            const equityOnly = (detailedTranches || []).reduce((sum, t) => sum + (!(isBondCategory(t.type) || isBondCategory(t.category)) ? (Number(t.marketValue) || 0) : 0), 0);
            const netFloorYear = Math.max(0, engineInput.floorBedarf - (engineInput.renteAktiv ? (engineInput.renteMonatlich * 12) : 0));
            const equityGuardMin = Math.max(jahresEntnahmeTarget, netFloorYear);
            const maxRefillNet = Math.max(0, equityOnly - equityGuardMin);

            if (maxRefillNet > 0) {
                const requestedNet = Math.min(bondDeficit, maxRefillNet);
                const refillTranches = (detailedTranches || []).filter(t => !(isBondCategory(t.type) || isBondCategory(t.category)) && String(t.category || '') === 'equity');

                if (requestedNet > 0 && refillTranches.length > 0) {
                    const refillSale = calculateSaleAndTax(requestedNet, {
                        ...engineInput,
                        detailledTranches: refillTranches,
                        depotwertAlt: 0,
                        depotwertNeu: 0,
                        goldWert: 0
                    }, { minGold: 0 }, market, false);

                    const refillNet = Math.max(0, refillSale.achievedRefill || 0);

                    if ((refillSale.bruttoVerkaufGesamt || 0) > 0 && refillNet > 0) {
                        bondReplenishmentAmount = refillNet;

                        addedActionDelta = {
                            nettoErlös: refillNet,
                            steuer: refillSale.steuerGesamt,
                            quellen: Array.isArray(refillSale.breakdown) ? refillSale.breakdown : [],
                            verwendungen: { bonds: refillNet },
                            taxRawAggregate: {
                                sumRealizedGainSigned: Number(refillSale.taxRawAggregate?.sumRealizedGainSigned) || 0,
                                sumTaxableAfterTqfSigned: Number(refillSale.taxRawAggregate?.sumTaxableAfterTqfSigned) || 0
                            }
                        };

                        updatedAction.type = 'TRANSACTION';
                        if (!updatedAction.quellen || updatedAction.quellen.length === 0) {
                            updatedAction.anweisungKlasse = 'anweisung-gelb';
                            updatedAction.title = 'Umschichtung: Aktien in Anleihen (3-Bucket)';
                            updatedAction.nettoErlös = refillNet;
                            updatedAction.steuer = refillSale.steuerGesamt;
                            updatedAction.verwendungen = {
                                liquiditaet: 0,
                                gold: 0,
                                aktien: 0,
                                bonds: refillNet
                            };
                            updatedAction.quellen = Array.isArray(refillSale.breakdown) ? refillSale.breakdown : [];
                            updatedAction.taxRawAggregate = {
                                sumRealizedGainSigned: Number(refillSale.taxRawAggregate?.sumRealizedGainSigned) || 0,
                                sumTaxableAfterTqfSigned: Number(refillSale.taxRawAggregate?.sumTaxableAfterTqfSigned) || 0
                            };
                        } else {
                            // If there is already an action (e.g., standard runway fill), we merge the sales.
                            // However, since it's a "good year", the standard action might just be opportunistic or surplus.
                            // We simplify by just appending to the uses and sources.
                            const existingNetto = updatedAction.nettoErlös || 0;
                            const existingSteuer = updatedAction.steuer || 0;
                            updatedAction.title += ' + Bonds Auffüllen';
                            updatedAction.nettoErlös = existingNetto + refillNet;
                            updatedAction.steuer = existingSteuer + refillSale.steuerGesamt;

                            updatedAction.verwendungen = updatedAction.verwendungen || {};
                            updatedAction.verwendungen.bonds = (updatedAction.verwendungen.bonds || 0) + refillNet;

                            if (Array.isArray(refillSale.breakdown)) {
                                updatedAction.quellen = [...(updatedAction.quellen || []), ...refillSale.breakdown];
                            }
                            updatedAction.taxRawAggregate = {
                                sumRealizedGainSigned: (Number(updatedAction.taxRawAggregate?.sumRealizedGainSigned) || 0) + (Number(refillSale.taxRawAggregate?.sumRealizedGainSigned) || 0),
                                sumTaxableAfterTqfSigned: (Number(updatedAction.taxRawAggregate?.sumTaxableAfterTqfSigned) || 0) + (Number(refillSale.taxRawAggregate?.sumTaxableAfterTqfSigned) || 0)
                            };
                        }
                    }
                }
            }
        }
    }

    return { updatedAction, bondReplenishmentAmount, addedActionDelta };
}
