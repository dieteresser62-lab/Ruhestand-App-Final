/**
 * ===================================================================
 * TRANSACTION ENGINE MODULE
 * ===================================================================
 * Bestimmt Transaktionsaktionen und berechnet Verkäufe mit Steuern
 * ===================================================================
 */
import {
    calculateTargetLiquidity,
    computeAppliedMinTradeGate,
    computeCappedRefill,
    computeWeights,
    quantizeAmount
} from './transaction-utils.mjs';
import {
    calculateSaleAndTax,
    getSellOrder,
    mergeSaleResults
} from './sale-engine.mjs';
import { determineAction } from './transaction-action.mjs';

export const TransactionEngine = {
    calculateTargetLiquidity,
    _computeWeights: computeWeights,
    _computeCappedRefill: computeCappedRefill,
    _computeAppliedMinTradeGate: computeAppliedMinTradeGate,
    _quantizeAmount: quantizeAmount,
    determineAction: (params) => determineAction(params, {
        calculateSaleAndTax,
        computeAppliedMinTradeGate,
        computeCappedRefill,
        quantizeAmount
    }),
    calculateSaleAndTax,
    _getSellOrder: getSellOrder,
    mergeSaleResults
};

// Exporte
export default TransactionEngine;
