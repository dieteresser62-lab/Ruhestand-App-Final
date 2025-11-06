'use strict';

/**
 * ===================================================================
 * ENGINE ADAPTER MODULE
 * ===================================================================
 * Adapter-Schicht für Simulator V5 (Ruhestandsmodell_v30)
 * Stellt Abwärtskompatibilität mit älteren Anwendungen sicher
 * ===================================================================
 */

const { ENGINE_API_VERSION, CONFIG } = require('./config.js');
const { EngineAPI, _internal_calculateModel } = require('./core.js');
const TransactionEngine = require('./transactions/TransactionEngine.js');

/**
 * Adapter für Simulator V5
 * Bildet alte Funktionssignaturen auf neue Engine-Logik ab
 */
const Ruhestandsmodell_v30_Adapter = {
    VERSION: ENGINE_API_VERSION,

    CONFIG: {
        ...CONFIG,
        SCENARIO_TEXT: CONFIG.TEXTS?.SCENARIO || {}
    },

    analyzeMarket: EngineAPI.analyzeMarket,

    /**
     * Berechnet Ziel-Liquidität (alte Signatur)
     */
    calculateTargetLiquidity: function(profil, market, annualNeedOrInflated, inflatedFloor, inflatedFlex) {
        const inflated = (annualNeedOrInflated && typeof annualNeedOrInflated === 'object')
            ? annualNeedOrInflated
            : { floor: Number(inflatedFloor) || 0, flex: Number(inflatedFlex) || 0 };

        return EngineAPI.calculateTargetLiquidity(profil, market, inflated);
    },

    mergeSaleResults: TransactionEngine.mergeSaleResults,

    _lastSimulationResult: null,

    /**
     * Führt vollständige Simulation aus und cached das Ergebnis
     * @private
     */
    _runFullSimulationAndCache(v30_inputsCtx, lastState) {
        const v38_input = {
            ...v30_inputsCtx,
            renteAktiv: (v30_inputsCtx.pensionAnnual ?? 0) > 0,
            renteMonatlich: (v30_inputsCtx.pensionAnnual ?? 0) / 12,
            endeVJ: v30_inputsCtx.marketData?.endeVJ ?? v30_inputsCtx.endeVJ ?? 0,
            endeVJ_1: v30_inputsCtx.marketData?.endeVJ_1 ?? v30_inputsCtx.endeVJ_1 ?? 0,
            endeVJ_2: v30_inputsCtx.marketData?.endeVJ_2 ?? v30_inputsCtx.endeVJ_2 ?? 0,
            endeVJ_3: v30_inputsCtx.marketData?.endeVJ_3 ?? v30_inputsCtx.endeVJ_3 ?? 0,
            ath: v30_inputsCtx.marketData?.ath ?? v30_inputsCtx.ath ?? 0,
            jahreSeitAth: v30_inputsCtx.marketData?.jahreSeitAth ?? v30_inputsCtx.jahreSeitAth ?? 0
        };

        const fullResult = EngineAPI.simulateSingleYear(v38_input, lastState);
        this._lastSimulationResult = fullResult;
        return fullResult;
    },

    /**
     * Bestimmt Ausgabenstrategie (alte Signatur)
     */
    determineSpending: function({
        market, lastState, inflatedFloor, inflatedFlex,
        round5, runwayMonths, liquidNow, profile,
        depotValue, inputsCtx, totalWealth
    }) {
        const fullResult = this._runFullSimulationAndCache(inputsCtx, lastState);

        if (fullResult.error) {
            return {
                error: fullResult.error,
                spendingResult: null,
                newState: lastState
            };
        }

        return {
            spendingResult: fullResult.ui.spending,
            newState: fullResult.newState,
            diagnosis: fullResult.diagnosis,
            _fullEngineResponse: fullResult
        };
    },

    /**
     * Bestimmt Transaktionsaktion (alte Signatur)
     */
    determineAction: function(v30_results, v30_inputsCtx) {
        let fullResult;

        if (this._lastSimulationResult) {
            fullResult = this._lastSimulationResult;
            this._lastSimulationResult = null;
        } else {
            fullResult = this._runFullSimulationAndCache(
                v30_inputsCtx,
                v30_results.spending?.details
            );
        }

        if (fullResult.error) {
            return {
                error: fullResult.error,
                title: "Fehler in der Engine"
            };
        }

        const v38_actionResult = fullResult.ui.action;
        const saleBreakdown = v38_actionResult.quellen || [];
        const aktuelleLiquiditaet = fullResult.input.tagesgeld + fullResult.input.geldmarktEtf;
        const depotwertGesamt = fullResult.input.depotwertAlt +
            fullResult.input.depotwertNeu +
            (fullResult.input.goldAktiv ? fullResult.input.goldWert : 0);

        return {
            ...v38_actionResult,
            saleResult: v38_actionResult.type === 'TRANSACTION' ? {
                steuerGesamt: v38_actionResult.steuer,
                bruttoVerkaufGesamt: saleBreakdown.reduce((sum, q) => sum + q.brutto, 0),
                achievedRefill: v38_actionResult.nettoErlös,
                breakdown: saleBreakdown
            } : null,
            liqNachTransaktion: {
                total: aktuelleLiquiditaet + (v38_actionResult.verwendungen?.liquiditaet || 0)
            },
            kaufGold: v38_actionResult.verwendungen?.gold || 0,
            kaufAktien: v38_actionResult.verwendungen?.aktien || 0,
            reason: v38_actionResult.transactionDiagnostics?.blockReason || 'none',
            rebalFlag: !!(v38_actionResult.title?.toLowerCase().includes('rebal')),
            netSaleEquity: saleBreakdown
                .filter(q => q.kind.startsWith('aktien'))
                .reduce((sum, q) => sum + q.brutto, 0),
            netSaleGold: saleBreakdown.find(q => q.kind === 'gold')?.brutto || 0,
            diagnostics: v38_actionResult.transactionDiagnostics,
            goldWeightBeforePct: depotwertGesamt > 0
                ? (fullResult.input.goldWert / depotwertGesamt) * 100
                : 0,
            taxRateSalesPct: (v38_actionResult.nettoErlös > 0)
                ? (v38_actionResult.steuer / v38_actionResult.nettoErlös) * 100
                : 0,
            liquidityGapEUR: fullResult.ui.zielLiquiditaet - aktuelleLiquiditaet,
            _fullEngineResponse: fullResult
        };
    },

    /**
     * Berechnet Verkauf und Steuer (alte Signatur)
     */
    calculateSaleAndTax: function(requestedRefill, v30_inputsCtx, caps = {}, market) {
        const v38_input = {
            ...v30_inputsCtx,
            tagesgeld: v30_inputsCtx.tagesgeld,
            geldmarktEtf: v30_inputsCtx.geldmarktEtf,
            depotwertAlt: v30_inputsCtx.depotwertAlt,
            depotwertNeu: v30_inputsCtx.depotwertNeu,
            goldWert: v30_inputsCtx.goldWert,
            costBasisAlt: v30_inputsCtx.costBasisAlt,
            costBasisNeu: v30_inputsCtx.costBasisNeu,
            goldCost: v30_inputsCtx.goldCost
        };

        const v38_saleResult = TransactionEngine.calculateSaleAndTax(
            requestedRefill,
            v38_input,
            { minGold: caps?.minGold ?? 0 },
            market,
            true
        );

        return { saleResult: v38_saleResult };
    }
};

// Exporte
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Ruhestandsmodell_v30_Adapter;
}
