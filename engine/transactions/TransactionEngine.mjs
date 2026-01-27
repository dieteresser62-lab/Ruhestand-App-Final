/**
 * Module: Transaction Engine
 * Purpose: Central facade for the transaction logic.
 *          Exposes functions to determine actions (buy/sell) and calculate tax-aware sales.
 * Usage: Called by engine/core.mjs.
 * Dependencies: transaction-utils.mjs, sale-engine.mjs, transaction-action.mjs
 */
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
