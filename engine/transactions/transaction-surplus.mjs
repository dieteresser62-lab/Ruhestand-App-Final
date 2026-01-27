/**
 * Module: Transaction Surplus
 * Purpose: Logic for "Surplus Rebalancing".
 *          Invests excess liquidity into underweighted assets (Gold, Equity) when the market is safe.
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
        // FIX v31.1: Gap-Based Rebalancing
        // Anstatt den gesamten Surplus blind zu investieren, füllen wir nur die Lücken auf,
        // um die Ziel-Allokation zu erreichen. Der Rest bleibt Cash (und geht in den Geldmarkt).

        // KORREKTUR: Wir nutzen wieder das VOLLE Vermögen zur Berechnung der Soll-Werte.
        // Der Puffer wird bereits durch "surplus = aktuelleLiquiditaet - zielLiquiditaet" geschützt.
        // Wir dürfen totalWealth hier NICHT künstlich klein rechnen, sonst sind die Ziel-Beträge für Aktien/Gold zu niedrig.
        const totalWealth = depotwertGesamt + aktuelleLiquiditaet;

        // 1. Zielwerte + Obergrenzen (Rebalancing-Band) berechnen
        const targetStockVal = totalWealth * (input.targetEq / 100);
        const targetGoldVal = input.goldAktiv ? totalWealth * (input.goldZielProzent / 100) : 0;
        const equityBandPct = (input.rebalBand ?? input.rebalancingBand ?? 35) / 100;
        const goldBandPct = (input.rebalancingBand ?? input.rebalBand ?? 35) / 100;
        const upperStockVal = targetStockVal * (1 + equityBandPct);
        const upperGoldVal = targetGoldVal * (1 + goldBandPct);

        // 2. Aktuelle Werte ermitteln
        // FIX: p.aktienWert und p.goldWert existieren nicht als Parameter.
        // Wir müssen stattdessen die Input-Werte nutzen.
        const currentStockVal = (input.depotwertAlt || 0) + (input.depotwertNeu || 0);
        const currentGoldVal = input.goldAktiv ? (input.goldWert || 0) : 0;

        // 3. Gaps berechnen (bis zur Obergrenze; wir verkaufen hier nichts, nur Kauf)
        const gapStock = Math.max(0, upperStockVal - currentStockVal);
        const gapGold = Math.max(0, upperGoldVal - currentGoldVal);
        const totalGap = gapStock + gapGold;

        // 4. Investitionsbetrag begrenzen
        let investAmountRaw = Math.min(surplus, totalGap);

        // Wenn keine Gaps existieren, aber Überschuss hoch ist, erlauben wir
        // einen begrenzten Cash-Abbau in Aktien (marktabhängig).
        const equityOverflowCap = ((input.maxSkimPctOfEq || 5) / 100) * currentStockVal;
        if (totalGap <= 0) {
            investAmountRaw = Math.min(surplus, equityOverflowCap);
        }

        if (CONFIG.ANTI_PSEUDO_ACCURACY.ENABLED) {
            investAmountRaw = quantizeAmount(investAmountRaw, 'floor');
        }

        if (investAmountRaw > 0) {
            // 5. Aufteilung proportional zur LÜCKE (nicht zum Ziel)
            // Wer die größte Lücke hat, kriegt am meisten.
            const realTotalGap = gapStock + gapGold;

            const shareStock = (realTotalGap > 0) ? gapStock / realTotalGap : 1;
            const shareGold = (realTotalGap > 0) ? gapGold / realTotalGap : 0;

            const goldTeilRaw = investAmountRaw * shareGold;
            const aktienTeilRaw = investAmountRaw * shareStock;

            // Runden und zurückgeben...
            const goldTeil = CONFIG.ANTI_PSEUDO_ACCURACY.ENABLED
                ? quantizeAmount(goldTeilRaw, 'floor')
                : goldTeilRaw;

            const aktienTeil = CONFIG.ANTI_PSEUDO_ACCURACY.ENABLED
                ? quantizeAmount(aktienTeilRaw, 'floor')
                : aktienTeilRaw;

            const investAmount = goldTeil + aktienTeil;
            const isOverflowInvest = totalGap <= 0;

            if (investAmount > 0) {
                return {
                    type: 'TRANSACTION',
                    anweisungKlasse: 'anweisung-gelb', // Standard yellow for transactions
                    title: isOverflowInvest ? 'Surplus Rebalancing (Liquiditätsabbau)' : 'Surplus Rebalancing (Opportunistisch)',
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
                        grund: isOverflowInvest ? 'Surplus Rebalancing (Liquiditätsabbau)' : 'Surplus Rebalancing (Opportunistisch)',
                        source: 'surplus'
                    },
                    zielLiquiditaet, // FIX: Expose target liquidity
                    diagnosisEntries: [{
                        step: 'Surplus Rebalancing',
                        impact: `Überschuss (${investAmount.toFixed(0)}€ von ${surplus.toFixed(0)}€) investiert (Markt: ${market.sKey}). Aktien: ${aktienTeil.toFixed(0)}€, Gold: ${goldTeil.toFixed(0)}€.`,
                        status: 'active',
                        severity: 'info'
                    }],
                    transactionDiagnostics
                };
            }
        }
    }

    return null;
}
