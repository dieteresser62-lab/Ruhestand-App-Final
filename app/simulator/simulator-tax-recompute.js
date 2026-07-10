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
    forcedSaleScaleApplied = null,
    regularSaleScale = 1,
    forcedTaxReserved = 0
}) {
    const normalizedRegularSaleScale = Math.max(0, Math.min(1, Number(regularSaleScale) || 0));
    const regularTaxReserved = (Number(actionResult?.steuer) || 0) * normalizedRegularSaleScale;
    const normalizedForcedTaxReserved = Math.max(0, Number(forcedTaxReserved) || 0);
    const taxReservedTotal = regularTaxReserved + normalizedForcedTaxReserved;
    const shouldRecompute = didForcedSale || normalizedRegularSaleScale < 1 - 1e-9;

    if (shouldRecompute) {
        const recomputedSettlement = settleTaxYear({
            taxStatePrev,
            rawAggregate: combinedTaxRawAggregate,
            sparerPauschbetrag,
            kirchensteuerSatz
        });
        const taxCashAdjustment = taxReservedTotal - recomputedSettlement.taxDue;
        if (taxCashAdjustment < -0.01) {
            throw new Error(
                `Simulator-Steuerreserve-Contract verletzt: finale Steuer uebersteigt Reserven um ${Math.abs(taxCashAdjustment).toFixed(2)} EUR.`
            );
        }
        actionResult.steuer = recomputedSettlement.taxDue;
        actionResult.taxSettlement = {
            ...recomputedSettlement.details,
            recomputedWithForcedSales: Boolean(didForcedSale),
            forcedSaleScaleApplied,
            regularSaleScale: normalizedRegularSaleScale,
            regularTaxReserved,
            forcedTaxReserved: normalizedForcedTaxReserved,
            taxReservedTotal,
            taxCashAdjustment
        };
        actionResult.taxRawAggregate = { ...combinedTaxRawAggregate };
        if (spendingNewState && typeof spendingNewState === 'object') {
            spendingNewState.taxState = recomputedSettlement.taxStateNext;
        }
        return {
            totalTaxesThisYear: Number(actionResult?.steuer) || 0,
            recomputedSettlement,
            taxCashAdjustment
        };
    }

    if (actionResult?.taxSettlement && typeof actionResult.taxSettlement === 'object') {
        actionResult.taxSettlement = {
            ...actionResult.taxSettlement,
            recomputedWithForcedSales: false,
            forcedSaleScaleApplied: null,
            regularSaleScale: normalizedRegularSaleScale,
            regularTaxReserved,
            forcedTaxReserved: 0,
            taxReservedTotal: regularTaxReserved,
            taxCashAdjustment: 0
        };
    }

    return {
        totalTaxesThisYear: Number(actionResult?.steuer) || 0,
        recomputedSettlement: null,
        taxCashAdjustment: 0
    };
}
