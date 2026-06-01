import { applySaleToPortfolio, sumDepot } from './simulator-portfolio.js';
import { buildDetailedTranchesFromPortfolio } from './simulator-engine-direct-utils.js';
import { addTaxRawAggregate } from './simulator-tax-recompute.js';
import { calculateSaleAndTax } from '../../engine/transactions/sale-engine.mjs';
import { isBondCategory, sumBondBucketValuation } from '../../engine/transactions/three-bucket-logic.mjs';

export const BOND_REFILL_PATCH_VERSION = 'bond-refill-equity-sale-guard-20260531-1';

function findOrCreateBondTranche(depotTranchesAktien) {
    let bondTranche = depotTranchesAktien.find(t => isBondCategory(t.type) || isBondCategory(t.category));
    if (!bondTranche) {
        bondTranche = {
            type: 'anleihe',
            category: 'bonds',
            marketValue: 0,
            costBasis: 0,
            isin: 'BOND_BUCKET_AUTO',
            name: 'Auto-Bond-Puffer'
        };
        depotTranchesAktien.push(bondTranche);
    }
    return bondTranche;
}

function sumEquityOnly(depotTranchesAktien) {
    return (Array.isArray(depotTranchesAktien) ? depotTranchesAktien : []).reduce((sum, tranche) => {
        const isBond = isBondCategory(tranche?.type) || isBondCategory(tranche?.category);
        return isBond ? sum : sum + (Number(tranche?.marketValue) || 0);
    }, 0);
}

function forceReduceEquityTranches(depotTranchesAktien, amount) {
    let remaining = Number(amount) || 0;
    if (!(remaining > 0) || !Array.isArray(depotTranchesAktien)) return 0;
    let reduced = 0;
    for (const tranche of depotTranchesAktien) {
        if (remaining <= 1e-6) break;
        const isBond = isBondCategory(tranche?.type) || isBondCategory(tranche?.category);
        if (isBond) continue;
        const marketValue = Number(tranche?.marketValue) || 0;
        if (!(marketValue > 0)) continue;
        const reduction = Math.min(remaining, marketValue);
        const ratio = marketValue > 0 ? reduction / marketValue : 0;
        tranche.costBasis = (Number(tranche.costBasis) || 0) * (1 - ratio);
        tranche.marketValue = marketValue - reduction;
        reduced += reduction;
        remaining -= reduction;
    }
    return reduced;
}

/**
 * Mutates portfolio and combinedTaxRawAggregate by refilling the 3-bucket bond buffer.
 */
export function applyBondRefillPostprocessing({
    is3Bucket,
    isBadYear,
    threeBucketInput,
    jahresEntnahmeTarget,
    netFloorYear,
    portfolio,
    depotTranchesAktien,
    engineInput,
    market,
    combinedTaxRawAggregate
}) {
    if (!(is3Bucket && !isBadYear && threeBucketInput.bondTargetFactor > 0)) {
        return {
            bondRefillGrossDelta: 0,
            bondRefillNetDelta: 0,
            bondRefillTaxDelta: 0,
            didForcedSale: false
        };
    }

    const bondTarget = Math.max(0, threeBucketInput.bondTargetFactor * jahresEntnahmeTarget);
    const currentBondValue = sumBondBucketValuation(depotTranchesAktien);
    const bondDeficit = Math.max(0, bondTarget - currentBondValue);
    const refillThreshold = Number.isFinite(threeBucketInput.bondRefillThresholdPct)
        ? (bondTarget * (threeBucketInput.bondRefillThresholdPct / 100))
        : 0;
    if (!(bondDeficit > refillThreshold)) {
        return {
            bondRefillGrossDelta: 0,
            bondRefillNetDelta: 0,
            bondRefillTaxDelta: 0,
            didForcedSale: false
        };
    }

    const bondTranche = findOrCreateBondTranche(depotTranchesAktien);
    const equityOnly = depotTranchesAktien.reduce((sum, tranche) => {
        const isBond = isBondCategory(tranche.type) || isBondCategory(tranche.category);
        return isBond ? sum : sum + (Number(tranche.marketValue) || 0);
    }, 0);
    const equityGuardMin = Math.max(jahresEntnahmeTarget, netFloorYear);
    const maxRefillNet = Math.max(0, equityOnly - equityGuardMin);
    if (!(maxRefillNet > 0)) {
        return {
            bondRefillGrossDelta: 0,
            bondRefillNetDelta: 0,
            bondRefillTaxDelta: 0,
            didForcedSale: false
        };
    }

    const requestedNet = Math.min(bondDeficit, maxRefillNet);
    const refillTranches = buildDetailedTranchesFromPortfolio(portfolio)
        .filter(t => !(isBondCategory(t.type) || isBondCategory(t.category)) && String(t.category || '') === 'equity');
    if (!(requestedNet > 0 && refillTranches.length > 0)) {
        return {
            bondRefillGrossDelta: 0,
            bondRefillNetDelta: 0,
            bondRefillTaxDelta: 0,
            didForcedSale: false
        };
    }

    const refillSale = calculateSaleAndTax(requestedNet, {
        ...engineInput,
        detailledTranches: refillTranches,
        depotwertAlt: sumDepot({ depotTranchesAktien: depotTranchesAktien.filter(t => t.type === 'aktien_alt') }),
        depotwertNeu: sumDepot({ depotTranchesAktien: depotTranchesAktien.filter(t => t.type === 'aktien_neu') }),
        goldWert: 0
    }, { minGold: 0 }, market, false);
    const refillNet = Math.max(0, refillSale.achievedRefill || 0);
    if (!((refillSale.bruttoVerkaufGesamt || 0) > 0 && refillNet > 0)) {
        return {
            bondRefillGrossDelta: 0,
            bondRefillNetDelta: 0,
            bondRefillTaxDelta: 0,
            didForcedSale: false
        };
    }

    const refillBreakdown = Array.isArray(refillSale.breakdown)
        ? refillSale.breakdown.map(item => ({
            ...item,
            category: item?.category || 'equity'
        }))
        : [];
    const equityBeforeSale = sumEquityOnly(depotTranchesAktien);
    applySaleToPortfolio(portfolio, {
        ...refillSale,
        breakdown: refillBreakdown
    });
    const expectedGrossReduction = Number(refillSale.bruttoVerkaufGesamt) || 0;
    const equityReduction = Math.max(0, equityBeforeSale - sumEquityOnly(depotTranchesAktien));
    const saleShortfallGross = Math.max(0, expectedGrossReduction - equityReduction);
    if (saleShortfallGross > 0.01) {
        forceReduceEquityTranches(depotTranchesAktien, saleShortfallGross);
    }
    bondTranche.marketValue += refillNet;
    bondTranche.costBasis += refillNet;
    addTaxRawAggregate(combinedTaxRawAggregate, refillSale.taxRawAggregate);

    return {
        bondRefillGrossDelta: Number(refillSale.bruttoVerkaufGesamt) || 0,
        bondRefillNetDelta: refillNet,
        bondRefillTaxDelta: Number(refillSale.steuerGesamt) || 0,
        didForcedSale: true,
        debugVersion: BOND_REFILL_PATCH_VERSION,
        saleShortfallGross
    };
}
