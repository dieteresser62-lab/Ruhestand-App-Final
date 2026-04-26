import { settleTaxYear } from '../../engine/tax-settlement.mjs';

export function buildTaxRawAggregate(source = {}) {
    return {
        sumRealizedGainSigned: Number(source?.sumRealizedGainSigned) || 0,
        sumTaxableAfterTqfSigned: Number(source?.sumTaxableAfterTqfSigned) || 0
    };
}

export function addTaxRawAggregate(target, source = {}, scale = 1) {
    const factor = Number.isFinite(Number(scale)) ? Number(scale) : 1;
    target.sumRealizedGainSigned += (Number(source?.sumRealizedGainSigned) || 0) * factor;
    target.sumTaxableAfterTqfSigned += (Number(source?.sumTaxableAfterTqfSigned) || 0) * factor;
    return target;
}

export function applySimulatorTaxRecompute({
    didForcedSale,
    actionResult,
    spendingNewState,
    taxStatePrev,
    combinedTaxRawAggregate,
    sparerPauschbetrag,
    kirchensteuerSatz,
    forcedSaleScaleApplied = null
}) {
    if (didForcedSale) {
        const recomputedSettlement = settleTaxYear({
            taxStatePrev,
            rawAggregate: combinedTaxRawAggregate,
            sparerPauschbetrag,
            kirchensteuerSatz
        });
        actionResult.steuer = recomputedSettlement.taxDue;
        actionResult.taxSettlement = {
            ...recomputedSettlement.details,
            recomputedWithForcedSales: true,
            forcedSaleScaleApplied
        };
        actionResult.taxRawAggregate = { ...combinedTaxRawAggregate };
        if (spendingNewState && typeof spendingNewState === 'object') {
            spendingNewState.taxState = recomputedSettlement.taxStateNext;
        }
        return {
            totalTaxesThisYear: Number(actionResult?.steuer) || 0,
            recomputedSettlement
        };
    }

    if (actionResult?.taxSettlement && typeof actionResult.taxSettlement === 'object') {
        actionResult.taxSettlement = {
            ...actionResult.taxSettlement,
            recomputedWithForcedSales: false,
            forcedSaleScaleApplied: null
        };
    }

    return {
        totalTaxesThisYear: Number(actionResult?.steuer) || 0,
        recomputedSettlement: null
    };
}
