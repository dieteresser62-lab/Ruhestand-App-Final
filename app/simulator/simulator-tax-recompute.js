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
    cashInterestIncomeSigned = 0,
    forcedSaleScaleApplied = null,
    regularSaleScale = 1,
    forcedTaxReserved = 0
}) {
    const normalizedRegularSaleScale = Math.max(0, Math.min(1, Number(regularSaleScale) || 0));
    const regularTaxReserved = (Number(actionResult?.steuer) || 0) * normalizedRegularSaleScale;
    const normalizedForcedTaxReserved = Math.max(0, Number(forcedTaxReserved) || 0);
    const taxReservedTotal = regularTaxReserved + normalizedForcedTaxReserved;
    const normalizedCashInterestIncomeSigned = Number.isFinite(Number(cashInterestIncomeSigned))
        ? Number(cashInterestIncomeSigned)
        : 0;
    const saleOnlyRawAggregate = buildTaxRawAggregate(combinedTaxRawAggregate);
    const settlementRawAggregate = {
        ...saleOnlyRawAggregate,
        sumTaxableAfterTqfSigned: saleOnlyRawAggregate.sumTaxableAfterTqfSigned
            + normalizedCashInterestIncomeSigned
    };
    const shouldRecompute = didForcedSale
        || normalizedRegularSaleScale < 1 - 1e-9
        || Math.abs(normalizedCashInterestIncomeSigned) > 1e-9;

    if (shouldRecompute) {
        const saleOnlySettlement = settleTaxYear({
            taxStatePrev,
            rawAggregate: saleOnlyRawAggregate,
            sparerPauschbetrag,
            kirchensteuerSatz
        });
        const recomputedSettlement = settleTaxYear({
            taxStatePrev,
            rawAggregate: settlementRawAggregate,
            sparerPauschbetrag,
            kirchensteuerSatz
        });
        const saleTaxCashAdjustment = taxReservedTotal - saleOnlySettlement.taxDue;
        if (saleTaxCashAdjustment < -0.01) {
            throw new Error(
                `Simulator-Steuerreserve-Contract verletzt: finale Verkaufssteuer uebersteigt Reserven um ${Math.abs(saleTaxCashAdjustment).toFixed(2)} EUR.`
            );
        }
        const rawTaxCashAdjustment = taxReservedTotal - recomputedSettlement.taxDue;
        // Historisch fuehrte ein negativer Subcent-Rest aus der Verkaufsreserve
        // an der naechsten Enginegrenze zu einem Validierungsfehler, den Monte
        // Carlo als Portfolio-Ruin fehlklassifizieren konnte. Nur dieses
        // negative Rundungsrauschen wird neutralisiert. Positive Erstattungen
        // bleiben auch unter einem Cent erhalten; groessere negative Werte sind
        // die gewollte Cashbelastung aus dem Zins-Settlement.
        const taxCashAdjustment = rawTaxCashAdjustment < 0 && rawTaxCashAdjustment >= -0.01
            ? 0
            : rawTaxCashAdjustment;
        actionResult.steuer = recomputedSettlement.taxDue;
        actionResult.taxSettlement = {
            ...recomputedSettlement.details,
            recomputedWithForcedSales: Boolean(didForcedSale),
            forcedSaleScaleApplied,
            regularSaleScale: normalizedRegularSaleScale,
            regularTaxReserved,
            forcedTaxReserved: normalizedForcedTaxReserved,
            taxReservedTotal,
            cashInterestIncomeSigned: normalizedCashInterestIncomeSigned,
            taxableBaseIncludesCashInterest: true,
            saleTaxDue: saleOnlySettlement.taxDue,
            cashInterestTaxDelta: recomputedSettlement.taxDue - saleOnlySettlement.taxDue,
            saleTaxCashAdjustment,
            taxCashAdjustment
        };
        actionResult.taxRawAggregate = {
            ...settlementRawAggregate,
            cashInterestIncomeSigned: normalizedCashInterestIncomeSigned
        };
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
            cashInterestIncomeSigned: 0,
            taxableBaseIncludesCashInterest: true,
            saleTaxDue: Number(actionResult?.steuer) || 0,
            cashInterestTaxDelta: 0,
            saleTaxCashAdjustment: 0,
            taxCashAdjustment: 0
        };
    }

    return {
        totalTaxesThisYear: Number(actionResult?.steuer) || 0,
        recomputedSettlement: null,
        taxCashAdjustment: 0
    };
}
