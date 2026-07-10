import { applySaleToPortfolio, isBondKind, sumDepot } from './simulator-portfolio.js';
import { buildDetailedTranchesFromPortfolio } from './simulator-engine-direct-utils.js';
import { addTaxRawAggregate } from './simulator-tax-recompute.js';
import { calculateSaleAndTax } from '../../engine/transactions/sale-engine.mjs';
import { isBondCategory } from '../../engine/transactions/three-bucket-logic.mjs';

export function reduceAcrossTranches(tranches, amount, useFifo) {
    let remaining = Number(amount) || 0;
    if (!Array.isArray(tranches) || remaining <= 0) return 0;
    const ordered = useFifo
        ? [...tranches].sort((a, b) => new Date(a.purchaseDate || '1900-01-01') - new Date(b.purchaseDate || '1900-01-01'))
        : tranches;
    let reduced = 0;
    for (const tranche of ordered) {
        if (remaining <= 0) break;
        const marketValue = Number(tranche.marketValue) || 0;
        if (marketValue <= 0) continue;
        const reduction = Math.min(remaining, marketValue);
        const reductionRatio = marketValue > 0 ? reduction / marketValue : 0;
        tranche.costBasis -= tranche.costBasis * reductionRatio;
        tranche.marketValue -= reduction;
        remaining -= reduction;
        reduced += reduction;
    }
    return reduced;
}

function normalizeForcedBreakdown({ breakdown, fallbackKind, brutto, steuer, netto }) {
    const baseBreakdown = Array.isArray(breakdown) && breakdown.length > 0
        ? breakdown
        : [{
            kind: fallbackKind,
            brutto,
            steuer,
            netto,
            trancheId: null,
            isin: null,
            name: null
        }];
    return baseBreakdown.map(item => ({
        ...item,
        trancheId: null,
        isin: null,
        name: null
    }));
}

/**
 * Mutates portfolio and combinedTaxRawAggregate while covering pre-payout liquidity gaps.
 */
export function applyForcedSaleLiquidityCoverage({
    forcedShortfall,
    portfolio,
    engineInput,
    market,
    is3Bucket,
    isBadYear,
    depotTranchesAktien,
    depotTranchesGold,
    equityBeforeForced,
    goldBeforeForced,
    combinedTaxRawAggregate
}) {
    if (!(forcedShortfall > 0)) {
        return {
            liquiditaetDelta: 0,
            bondSaleAmountDelta: 0,
            unmetLiquidityDelta: 0,
            didForcedSale: false,
            forcedSaleScaleApplied: null,
            forcedTaxReservedDelta: 0
        };
    }

    let liquiditaetDelta = 0;
    let bondSaleAmountDelta = 0;
    let unmetLiquidityDelta = 0;
    let didForcedSale = false;
    let forcedSaleScaleApplied = null;
    let forcedTaxReservedDelta = 0;

    const currentTranches = buildDetailedTranchesFromPortfolio(portfolio);
    const forcedTranches = (is3Bucket && isBadYear)
        ? currentTranches.filter(t => isBondCategory(t))
        : currentTranches;

    if (is3Bucket && isBadYear) {
        const availableBond = forcedTranches.reduce((sum, tranche) => sum + (Number(tranche.marketValue) || 0), 0);
        if (availableBond + 1e-6 < forcedShortfall) {
            unmetLiquidityDelta += Math.max(0, forcedShortfall - availableBond);
        }
    }

    const forcedInputWithCurrentTranches = {
        ...engineInput,
        // The annual allowance was already applied by the regular engine action.
        // Simulator-induced follow-up sales therefore reserve tax without SPB.
        sparerPauschbetrag: 0,
        detailledTranches: (is3Bucket && isBadYear)
            ? forcedTranches
            : (forcedTranches.length > 0 ? forcedTranches : undefined),
        depotwertAlt: sumDepot({ depotTranchesAktien: depotTranchesAktien.filter(t => t.type === 'aktien_alt') }),
        depotwertNeu: sumDepot({ depotTranchesAktien: depotTranchesAktien.filter(t => t.type === 'aktien_neu') }),
        goldWert: sumDepot({ depotTranchesGold })
    };
    const forcedSale = calculateSaleAndTax(forcedShortfall, forcedInputWithCurrentTranches, { minGold: 0 }, market, true);
    const forcedBrutto = forcedSale.bruttoVerkaufGesamt || 0;

    if (forcedBrutto > 0) {
        const fallbackBreakdown = normalizeForcedBreakdown({
            breakdown: forcedSale.breakdown,
            fallbackKind: (is3Bucket && isBadYear) ? 'anleihe' : 'aktien_alt',
            brutto: forcedBrutto,
            steuer: forcedSale.steuerGesamt || 0,
            netto: forcedSale.achievedRefill || 0
        });
        applySaleToPortfolio(portfolio, { ...forcedSale, breakdown: fallbackBreakdown });
        const equityAfterForced = sumDepot({ depotTranchesAktien });
        const goldAfterForced = sumDepot({ depotTranchesGold });
        const forcedExecutedEq = Math.max(0, equityBeforeForced - equityAfterForced);
        const forcedExecutedGld = Math.max(0, goldBeforeForced - goldAfterForced);
        const forcedExecutedTotal = forcedExecutedEq + forcedExecutedGld;
        const forcedScale = forcedBrutto > 0 ? Math.min(1, forcedExecutedTotal / forcedBrutto) : 0;

        forcedSaleScaleApplied = forcedScale;
        forcedTaxReservedDelta += (Number(forcedSale.steuerGesamt) || 0) * forcedScale;
        liquiditaetDelta += (forcedSale.achievedRefill || 0) * forcedScale;
        bondSaleAmountDelta += fallbackBreakdown.reduce((sum, item) => {
            const kind = String(item?.kind || '').toLowerCase();
            return isBondKind(kind) ? (sum + (Number(item?.brutto) || 0) * forcedScale) : sum;
        }, 0);
        addTaxRawAggregate(combinedTaxRawAggregate, forcedSale.taxRawAggregate, forcedScale);
        didForcedSale = true;
    } else {
        const fallbackBreakdown = [{
            kind: (is3Bucket && isBadYear) ? 'anleihe' : 'aktien_alt',
            brutto: forcedShortfall,
            steuer: 0,
            netto: forcedShortfall,
            trancheId: null,
            isin: null,
            name: null
        }];
        applySaleToPortfolio(portfolio, {
            steuerGesamt: 0,
            bruttoVerkaufGesamt: forcedShortfall,
            achievedRefill: forcedShortfall,
            breakdown: fallbackBreakdown
        });
        const equityAfterForced = sumDepot({ depotTranchesAktien });
        const goldAfterForced = sumDepot({ depotTranchesGold });
        const forcedExecutedEq = Math.max(0, equityBeforeForced - equityAfterForced);
        const forcedExecutedGld = Math.max(0, goldBeforeForced - goldAfterForced);
        const forcedExecutedTotal = forcedExecutedEq + forcedExecutedGld;
        liquiditaetDelta += Math.min(forcedShortfall, forcedExecutedTotal);
    }

    const equityAfterForcedFallback = sumDepot({ depotTranchesAktien });
    const goldAfterForcedFallback = sumDepot({ depotTranchesGold });
    const forcedExecutedEq = Math.max(0, equityBeforeForced - equityAfterForcedFallback);
    const forcedExecutedGld = Math.max(0, goldBeforeForced - goldAfterForcedFallback);
    const forcedExecutedTotal = forcedExecutedEq + forcedExecutedGld;
    if (forcedExecutedTotal < 1) {
        if (is3Bucket && isBadYear) {
            const reducedBond = reduceAcrossTranches(depotTranchesAktien.filter(t => isBondCategory(t)), forcedShortfall, true);
            liquiditaetDelta += Math.min(forcedShortfall, reducedBond);
            bondSaleAmountDelta += reducedBond;
            unmetLiquidityDelta += Math.max(0, forcedShortfall - reducedBond);
        } else {
            const reducedEq = reduceAcrossTranches(depotTranchesAktien, forcedShortfall, true);
            const remaining = Math.max(0, forcedShortfall - reducedEq);
            const reducedGld = reduceAcrossTranches(depotTranchesGold, remaining, false);
            liquiditaetDelta += Math.min(forcedShortfall, reducedEq + reducedGld);
        }
    }

    return {
        liquiditaetDelta,
        bondSaleAmountDelta,
        unmetLiquidityDelta,
        didForcedSale,
        forcedSaleScaleApplied,
        forcedTaxReservedDelta
    };
}

/**
 * Mutates portfolio if the actual payout did not cover the net floor despite sufficient wealth.
 */
export function applyPayoutFallbackSale({
    jahresEntnahmeEffektiv,
    netFloorYear,
    liquiditaet,
    payout,
    is3Bucket,
    isBadYear,
    depotTranchesAktien,
    depotTranchesGold,
    formatRuinNumber = value => Number(value) || 0
}) {
    if (!(jahresEntnahmeEffektiv + 1e-6 < netFloorYear)) {
        return {
            isRuin: false,
            liquiditaet,
            bondSaleAmountDelta: 0,
            unmetLiquidityDelta: 0
        };
    }

    const additionalNeeded = netFloorYear - jahresEntnahmeEffektiv;
    const currentEquity = sumDepot({ depotTranchesAktien });
    const currentGold = sumDepot({ depotTranchesGold });

    if (currentEquity + currentGold < additionalNeeded) {
        return {
            isRuin: true,
            reason: `Entnahme (${formatRuinNumber(jahresEntnahmeEffektiv)}) < Floor (${formatRuinNumber(netFloorYear)}) und nicht genug Assets`,
            liquiditaet,
            bondSaleAmountDelta: 0,
            unmetLiquidityDelta: 0
        };
    }

    let totalReduced = 0;
    let bondSaleAmountDelta = 0;
    let unmetLiquidityDelta = 0;
    if (is3Bucket && isBadYear) {
        const reducedBond = reduceAcrossTranches(depotTranchesAktien.filter(t => isBondCategory(t)), additionalNeeded, true);
        totalReduced = reducedBond;
        bondSaleAmountDelta += reducedBond;
        unmetLiquidityDelta += Math.max(0, additionalNeeded - reducedBond);
    } else {
        const reducedEq = reduceAcrossTranches(depotTranchesAktien, additionalNeeded, true);
        const remainingAfterEq = Math.max(0, additionalNeeded - reducedEq);
        const reducedGld = reduceAcrossTranches(depotTranchesGold, remainingAfterEq, false);
        totalReduced = reducedEq + reducedGld;
    }

    let nextLiquiditaet = liquiditaet + payout + totalReduced;
    const newPayout = Math.min(nextLiquiditaet, netFloorYear);
    nextLiquiditaet -= newPayout;

    return {
        isRuin: false,
        liquiditaet: nextLiquiditaet,
        bondSaleAmountDelta,
        unmetLiquidityDelta
    };
}
