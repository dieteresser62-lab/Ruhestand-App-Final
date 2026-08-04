import { settleTaxYear } from '../../engine/tax-settlement.mjs';

const EXECUTED_TAX_CONTRACT_VERSION = 'SimulatorExecutedTaxContractV1';
const EXECUTED_TAX_EPSILON = 1e-7;

function assertExecutedTaxClose(actual, expected, field) {
    if (!Number.isFinite(actual)
        || !Number.isFinite(expected)
        || Math.abs(actual - expected) > EXECUTED_TAX_EPSILON) {
        throw new Error(
            `Simulator-Steuerabschluss-Contract verletzt: ${field} (${actual}) stimmt nicht mit ${expected} ueberein.`
        );
    }
}

function attachExecutedTaxContract({
    actionResult,
    plannedActionFlow,
    regularSaleScale,
    regularTaxReserved,
    forcedTaxReserved,
    taxReservedTotal,
    saleTaxDue,
    cashInterestTaxDelta,
    finalAnnualTax,
    rawTaxCashAdjustment,
    taxCashAdjustment,
    recomputedWithForcedSales,
    recomputedAfterActionTransform
}) {
    if (!plannedActionFlow) return;
    const plannedSourceTax = plannedActionFlow.quellen.reduce(
        (total, source) => total + (Number(source?.steuer) || 0),
        0
    );
    assertExecutedTaxClose(plannedSourceTax, plannedActionFlow.steuer, 'plannedSourceTax');
    assertExecutedTaxClose(
        regularTaxReserved,
        plannedActionFlow.steuer * regularSaleScale,
        'regularTaxReserved'
    );
    assertExecutedTaxClose(taxReservedTotal, regularTaxReserved + forcedTaxReserved, 'taxReservedTotal');
    assertExecutedTaxClose(finalAnnualTax, saleTaxDue + cashInterestTaxDelta, 'finalAnnualTax');
    assertExecutedTaxClose(
        rawTaxCashAdjustment,
        taxReservedTotal - finalAnnualTax,
        'rawTaxCashAdjustment'
    );
    const adjustmentWasNormalized = rawTaxCashAdjustment < 0
        && rawTaxCashAdjustment >= -0.01
        && taxCashAdjustment === 0;
    if (!adjustmentWasNormalized) {
        assertExecutedTaxClose(taxCashAdjustment, rawTaxCashAdjustment, 'taxCashAdjustment');
    }
    assertExecutedTaxClose(Number(actionResult?.steuer), finalAnnualTax, 'actionResult.steuer');

    actionResult.plannedActionFlow = plannedActionFlow;
    actionResult.actionContractPhase = 'post_execution_annual_settlement';
    actionResult.taxSettlement = {
        ...actionResult.taxSettlement,
        executedTaxContract: {
            schemaVersion: EXECUTED_TAX_CONTRACT_VERSION,
            status: 'reconciled',
            plannedActionFlowStatus: plannedActionFlow.contractStatus,
            topLevelActionTaxRole: 'final_annual_tax_after_simulator_effects',
            plannedSourceTaxRole: 'pre_settlement_sale_tax_reserve',
            plannedActionTaxReserved: plannedActionFlow.steuer,
            plannedSourceTaxReserved: plannedSourceTax,
            regularSaleScale,
            cashEffectiveRegularTaxReserved: regularTaxReserved,
            forcedTaxReserved,
            taxReservedTotal,
            saleTaxDue,
            cashInterestTaxDelta,
            finalAnnualTax,
            rawTaxCashAdjustment,
            taxCashAdjustment,
            taxCashAdjustmentNormalized: adjustmentWasNormalized,
            recomputedWithForcedSales,
            recomputedAfterActionTransform
        }
    };
}

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
    forceRecompute = false,
    actionResult,
    plannedActionFlow = null,
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
    const shouldRecompute = forceRecompute
        || didForcedSale
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
            recomputedAfterActionTransform: Boolean(forceRecompute),
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
        attachExecutedTaxContract({
            actionResult,
            plannedActionFlow,
            regularSaleScale: normalizedRegularSaleScale,
            regularTaxReserved,
            forcedTaxReserved: normalizedForcedTaxReserved,
            taxReservedTotal,
            saleTaxDue: saleOnlySettlement.taxDue,
            cashInterestTaxDelta: recomputedSettlement.taxDue - saleOnlySettlement.taxDue,
            finalAnnualTax: recomputedSettlement.taxDue,
            rawTaxCashAdjustment,
            taxCashAdjustment,
            recomputedWithForcedSales: Boolean(didForcedSale),
            recomputedAfterActionTransform: Boolean(forceRecompute)
        });
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
            recomputedAfterActionTransform: false,
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
    const finalAnnualTax = Number(actionResult?.steuer) || 0;
    attachExecutedTaxContract({
        actionResult,
        plannedActionFlow,
        regularSaleScale: normalizedRegularSaleScale,
        regularTaxReserved,
        forcedTaxReserved: 0,
        taxReservedTotal: regularTaxReserved,
        saleTaxDue: finalAnnualTax,
        cashInterestTaxDelta: 0,
        finalAnnualTax,
        rawTaxCashAdjustment: 0,
        taxCashAdjustment: 0,
        recomputedWithForcedSales: false,
        recomputedAfterActionTransform: false
    });

    return {
        totalTaxesThisYear: Number(actionResult?.steuer) || 0,
        recomputedSettlement: null,
        taxCashAdjustment: 0
    };
}
