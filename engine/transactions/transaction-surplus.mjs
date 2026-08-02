/**
 * Module: Transaction Surplus
 * Purpose: Logic for "Surplus Rebalancing".
 *          Invests excess liquidity while protecting the configured liquidity runway.
 *          Gold may be filled to its explicit target; all remaining surplus goes to equity.
 * Usage: Called by transaction-action.mjs.
 * Dependencies: config.mjs
 */
import { CONFIG } from '../config.mjs';

export function trySurplusRebalance({
    aktuelleLiquiditaet,
    zielLiquiditaet,
    depotwertGesamt,
    market,
    input,
    investiertesKapital,
    quantizeAmount,
    transactionDiagnostics
}) {
    // Falls kein dringender Bedarf besteht, prüfen wir auf überschüssige Liquidität.
    // Harmonisierung: Das passiert jetzt direkt in der Engine, damit Simulator und Balance App gleich handeln.
    const surplus = aktuelleLiquiditaet - zielLiquiditaet;

    // Sicherheits-Check: Nur in guten Marktphasen investieren!
    // Definition "Riskante Marktphase":
    // "Seitwärts" (side) nehmen wir jetzt raus, damit auch in ruhigen Phasen investiert wird.
    const isRiskyMarket = market.sKey.includes('bear') ||
        market.sKey.includes('crash') ||
        (market.abstandVomAthProzent > 15);

    // Mindestens 500€ Überschuss und günstige Marktlage erforderlich
    // Hysterese für Surplus: Wir nutzen die globale Min-Trade-Schwelle
    // (statisch 25k oder dynamisch 0.5%), damit wir keine "Peanuts" handeln.
    const minTradeThreshold = Math.max(
        CONFIG.THRESHOLDS.STRATEGY.minTradeAmountStatic,
        investiertesKapital * CONFIG.THRESHOLDS.STRATEGY.minTradeAmountDynamicFactor
    );

    // Hysterese: Surplus muss über der Schwelle liegen
    // (Optional: Wir könnten hier eine eigene, etwas niedrigere Schwelle nehmen,
    // aber der User wünscht sich Relevanz).
    const surplusHysteresis = CONFIG.ANTI_PSEUDO_ACCURACY.ENABLED ? minTradeThreshold : 500;

    if (surplus > surplusHysteresis && !isRiskyMarket) {
        // Der Liquiditätspuffer ist bereits durch `surplus` geschützt. Es gibt bewusst
        // kein fixes Aktienziel: Gold hat ein explizites Ziel, Aktien erhalten den Rest.
        const totalWealth = depotwertGesamt + aktuelleLiquiditaet;
        const targetGoldVal = input.goldAktiv ? totalWealth * (input.goldZielProzent / 100) : 0;
        const currentGoldVal = input.goldAktiv ? (input.goldWert || 0) : 0;
        const gapGold = Math.max(0, targetGoldVal - currentGoldVal);
        const currentStockVal = (input.depotwertAlt || 0) + (input.depotwertNeu || 0);
        const equityOverflowCap = Math.max(0, (input.maxSkimPctOfEq ?? 5) / 100) * currentStockVal;
        const goldTeilRaw = Math.min(surplus, gapGold);
        const aktienTeilRaw = Math.min(Math.max(0, surplus - goldTeilRaw), equityOverflowCap);
        let investAmountRaw = goldTeilRaw + aktienTeilRaw;

        if (CONFIG.ANTI_PSEUDO_ACCURACY.ENABLED) {
            investAmountRaw = quantizeAmount(investAmountRaw, 'floor');
        }

        if (investAmountRaw > 0) {
            const scaledGoldRaw = Math.min(goldTeilRaw, investAmountRaw);
            const scaledEquityRaw = Math.max(0, investAmountRaw - scaledGoldRaw);

            // Runden und zurückgeben...
            const goldTeil = CONFIG.ANTI_PSEUDO_ACCURACY.ENABLED
                ? quantizeAmount(scaledGoldRaw, 'floor')
                : scaledGoldRaw;

            const aktienTeil = CONFIG.ANTI_PSEUDO_ACCURACY.ENABLED
                ? quantizeAmount(scaledEquityRaw, 'floor')
                : scaledEquityRaw;

            const investAmount = goldTeil + aktienTeil;
            if (investAmount > 0) {
                return {
                    type: 'TRANSACTION',
                    anweisungKlasse: 'anweisung-gelb', // Standard yellow for transactions
                    title: 'Runway-Überschuss investieren',
                    nettoErlös: investAmount, // Zeigt den investierten Betrag an
                    quellen: [{
                        source: 'Liquidität',
                        kind: 'liquiditaet',
                        brutto: investAmount,
                        netto: investAmount,
                        steuer: 0
                    }],
                    verwendungen: {
                        aktien: aktienTeil,
                        gold: goldTeil,
                        liquiditaet: 0
                    },
                    details: {
                        kaufAkt: aktienTeil,
                        kaufGld: goldTeil,
                        verkaufLiquiditaet: investAmount,
                        grund: 'Runway-Überschuss investieren',
                        source: 'surplus'
                    },
                    zielLiquiditaet, // FIX: Expose target liquidity
                    diagnosisEntries: [{
                        step: 'Surplus Rebalancing',
                        impact: `Überschuss (${investAmount.toFixed(0)}€ von ${surplus.toFixed(0)}€) oberhalb des Runway-Ziels investiert (Markt: ${market.sKey}). Aktien: ${aktienTeil.toFixed(0)}€, Gold: ${goldTeil.toFixed(0)}€.`,
                        status: 'active',
                        severity: 'info'
                    }],
                    transactionDiagnostics: {
                        ...transactionDiagnostics,
                        allocationPolicy: 'gold_target_then_equity'
                    }
                };
            }
        }
    }

    return null;
}
