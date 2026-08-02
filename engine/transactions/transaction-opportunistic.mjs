/**
 * Module: Transaction Opportunistic
 * Purpose: Logic for "Opportunistic Rebalancing".
 *          Fills liquidity gaps using asset sales, but tries to respect safe withdrawal rates and market timing (Skim & Fill).
 * Usage: Called by transaction-action.mjs.
 * Dependencies: config.mjs
 */
import { CONFIG } from '../config.mjs';

export function buildOpportunisticRefill({
    aktuelleLiquiditaet,
    zielLiquiditaet,
    sicherheitsPuffer,
    investiertesKapital,
    aktienwert,
    input,
    market,
    actionDetails,
    verwendungen,
    saleContext,
    transactionDiagnostics,
    computeAppliedMinTradeGate,
    quantizeAmount,
    calculateSaleAndTax,
    minTradeResultOverride
}) {
    const rawLiqGap = zielLiquiditaet - aktuelleLiquiditaet;
    // ANTI-PSEUDO-ACCURACY: Liquiditätsbedarf kaufmännisch runden (Ceil)
    let liquiditaetsBedarf = Math.max(0, rawLiqGap);
    liquiditaetsBedarf = quantizeAmount(liquiditaetsBedarf, 'ceil');

    const surplusCash = Math.max(0, -rawLiqGap);

    // ATH-basierte Skalierung: Bei -20% ATH-Abstand kein Rebalancing mehr
    // seiATH = 1.0 (am ATH) → Faktor = 1.0, seiATH = 0.8 (-20%) → Faktor = 0.0
    const seiATH = market.seiATH || 1;
    const athRebalancingFaktor = Math.max(0, Math.min(1, (seiATH - 0.8) / 0.2));

    // Prüfe ob kritische Liquiditätssituation vorliegt
    const zielLiquiditaetsdeckungLocal = (zielLiquiditaet > 0)
        ? (aktuelleLiquiditaet / zielLiquiditaet)
        : 1;
    const runwayCoverageThresholdLocal = CONFIG.THRESHOLDS.STRATEGY.runwayCoverageMinPct || 0.75;
    const isCriticalLiquidity = zielLiquiditaetsdeckungLocal < runwayCoverageThresholdLocal;
    const belowAbsoluteFloor = aktuelleLiquiditaet < (CONFIG.THRESHOLDS.STRATEGY.absoluteMinLiquidity || 10000);

    let goldKaufBedarf = 0;
    let goldVerkaufBedarf = 0;

    // Gold-Rebalancing prüfen
    if (input.goldAktiv && input.goldZielProzent > 0) {
        const goldZielwert = investiertesKapital * (input.goldZielProzent / 100);
        const goldBandPct = (input.rebalancingBand ?? 35) / 100;
        const goldUntergrenze = goldZielwert * (1 - goldBandPct);
        const goldObergrenze = goldZielwert * (1 + goldBandPct);

        if (input.goldWert < goldUntergrenze) {
            goldKaufBedarf = Math.max(0, goldZielwert - input.goldWert);
        } else if (input.goldWert > goldObergrenze) {
            // FIX: Gold-Überschuss erkennen!
            // Wenn Gold stark gestiegen ist (über Band), muss verkauft werden.
            goldVerkaufBedarf = Math.max(0, input.goldWert - goldZielwert);
        }
    }
    const isGoldBuyCashCritical = aktuelleLiquiditaet < (sicherheitsPuffer || 0) || belowAbsoluteFloor;
    if (isGoldBuyCashCritical && goldKaufBedarf > 0) {
        // Gold-Aufbau nur in echten Cash-Krisen blockieren. Eine normale
        // Unterschreitung des Ziel-Runways darf Asset-Rebalancing nicht dauerhaft verhindern.
        goldKaufBedarf = Math.min(goldKaufBedarf, surplusCash);
    }

    // Action Details vorbereiten
    let actionTitle = '';
    if (liquiditaetsBedarf > 0) {
        actionTitle = 'Opportunistisches Rebalancing & Liquidität auffüllen';
    } else if (goldKaufBedarf > 0 || goldVerkaufBedarf > 0) {
        actionTitle = 'Opportunistisches Rebalancing (Gold)';
    } else {
        actionTitle = ''; // Titel leer lassen, falls wir in Surplus-Logik fallen
    }

    actionDetails = {
        title: actionTitle,
        type: 'REFILL',
        bedarf: liquiditaetsBedarf,
        diagnosisEntries: [],
        isCapped: false
    };
    // FIX: Wenn wir Überschuss-Liquidität haben, können wir den Gold-Kauf daraus finanzieren.
    // Das reduziert den 'totalerBedarf' (der einen VERKAUF von Assets anfordert).
    // Wenn alles durch Cash gedeckt ist, ist totalerBedarf = 0, und wir fallen
    // in die Surplus-Logik (unten), die dann sauber investiert.
    let effectiveGoldBuyNeed = goldKaufBedarf;
    if (surplusCash > 0 && goldKaufBedarf > 0) {
        effectiveGoldBuyNeed = Math.max(0, goldKaufBedarf - surplusCash);
    }

    const totalerBedarf = Math.max(liquiditaetsBedarf + effectiveGoldBuyNeed, goldVerkaufBedarf);

    // ANTI-PSEUDO-ACCURACY: Rebalancing-Bedarf quantisieren
    // Wir nutzen hier 'ceil', da es sich primär um Auffüllungen (Defizite) handelt.
    // Wenn es nur Gold-Verkauf ist, ist 'totalerBedarf' der Verkaufsbetrag.
    let quantisierterBedarf = totalerBedarf;

    // Notfall-Flag: Override von außen ODER lokale Krise
    const forceAction = (minTradeResultOverride === 0) || isCriticalLiquidity || belowAbsoluteFloor;

    // Hysterese-Check vor Quantisierung (außer bei Gefahr)
    if (!forceAction) {
        if (totalerBedarf < CONFIG.ANTI_PSEUDO_ACCURACY.HYSTERESIS_MIN_REFILL_AMOUNT) {
            // Zu kleiner Betrag, ignorieren
            quantisierterBedarf = 0;
        } else {
            quantisierterBedarf = quantizeAmount(totalerBedarf, 'ceil');
        }
    } else if (quantisierterBedarf > 0) {
        // Bei Gefahr (Critical/Floor) auch runden, aber Hysterese ignorieren
        quantisierterBedarf = quantizeAmount(quantisierterBedarf, 'ceil');
    }

    // Bedarf anpassen
    // Da wir einzelne Komponenten (liq, goldKauf) haben, müssen wir diese proportional anpassen
    // oder vereinfacht: den Delta auf Liquidität schlagen (einfacher und sicherer)
    let bedarfsDelta = Math.max(0, quantisierterBedarf - totalerBedarf);

    // Bei signifikantem Delta (durch Rundung), erhöhen wir den Liquiditätsbedarf,
    // damit am Ende "Eine glatte Summe" verkauft wird.
    // Das gilt nur, wenn wir überhaupt handeln (quantisierterBedarf > 0)
    let effectiveLiquiditätsBedarf = liquiditaetsBedarf;
    if (quantisierterBedarf > 0) {
        effectiveLiquiditätsBedarf += bedarfsDelta;
    }

    const effectiveTotalerBedarf = quantisierterBedarf;

    // Bei kritischer Liquidität: niedrigere Mindestschwelle verwenden
    // WICHTIG: minTradeResultOverride auf 0 setzen, um RUIN zu verhindern
    // Sonst würde der dynamische minTradeResult bei großen Portfolios die Transaktion blockieren
    let appliedMinTradeGate;
    if (belowAbsoluteFloor) {
        // NOTFALL: Unter absolutem Minimum -> Sofort handeln, egal wie klein der Betrag
        appliedMinTradeGate = 0;
        minTradeResultOverride = 0;
    } else if (isCriticalLiquidity) {
        appliedMinTradeGate = Math.max(
            CONFIG.THRESHOLDS.STRATEGY.minRefillAmount || 2500,
            CONFIG.THRESHOLDS.STRATEGY.cashRebalanceThreshold || 2500
        );
        minTradeResultOverride = 0;
    } else {
        // Respektiere den Override von außen (z.B. aus determineAction bei Floor-Notfall)
        if (minTradeResultOverride !== null && minTradeResultOverride !== undefined) {
            appliedMinTradeGate = minTradeResultOverride;
        } else {
            const minTradeGateResult = computeAppliedMinTradeGate({
                investiertesKapital,
                liquiditaetsBedarf: effectiveLiquiditätsBedarf,
                totalerBedarf: effectiveTotalerBedarf
            });
            appliedMinTradeGate = minTradeGateResult.appliedMinTradeGate;
            // Nur überschreiben, wenn wir keinen externen Override hatten
            minTradeResultOverride = minTradeGateResult.minTradeResultOverride;
            if (minTradeGateResult.diagnosisEntry) {
                actionDetails.diagnosisEntries.push(minTradeGateResult.diagnosisEntry);
            }
        }
    }

    if (effectiveTotalerBedarf >= appliedMinTradeGate) {
        // Gold-Verkaufsbudget berechnen
        let maxSellableFromGold = 0;
        const goldBandPct = (input.rebalancingBand ?? 35) / 100;

        if (input.goldAktiv && input.goldZielProzent > 0) {
            const goldZielwert = investiertesKapital * (input.goldZielProzent / 100);
            const goldObergrenze = goldZielwert * (1 + goldBandPct);

            if (input.goldWert > goldObergrenze) {
                maxSellableFromGold = input.goldWert - goldZielwert;
                // ANTI-PSEUDO-ACCURACY: Auch Rebalancing-Verkäufe runden (abrunden)
                // Damit wir nicht krumme Beträge wie 40.136,63 EUR verkaufen
                maxSellableFromGold = quantizeAmount(maxSellableFromGold, 'floor');
            }
        }
        saleContext.saleBudgets.gold = maxSellableFromGold;
        transactionDiagnostics.goldThresholds = {
            ...transactionDiagnostics.goldThresholds,
            saleBudgetGold: maxSellableFromGold,
            rebalancingBandPct: (goldBandPct * 100)
        };

        if (!Number.isFinite(maxSellableFromGold)) {
            maxSellableFromGold = 0;
            saleContext.saleBudgets.gold = 0;
            transactionDiagnostics.goldThresholds = {
                ...transactionDiagnostics.goldThresholds,
                saleBudgetGold: 0
            };
            actionDetails.diagnosisEntries.push({
                key: 'gold_budget_invalid',
                severity: 'warn',
                message: 'Gold-Verkaufsbudget ungueltig, auf 0 gesetzt.'
            });
        }

        // Aktien dienen ohne fixes Aktienziel als nachrangige Runway-Quelle. Der
        // Verkaufskorridor ist ein Brutto-Budget, der Bedarf dagegen netto. Statt
        // eines pauschalen Aufschlags wird deshalb nur die maximal mögliche
        // Kapitalertragsteuer als Headroom berücksichtigt. calculateSaleAndTax
        // bestimmt innerhalb dieses Budgets weiterhin den exakten Verkauf.
        const capitalGainsTaxRate = Math.min(
            0.99,
            0.25 * (1 + 0.055 + Math.max(0, Number(input.kirchensteuerSatz) || 0))
        );
        const grossEquityBudgetForNeed = effectiveTotalerBedarf > 0
            ? quantizeAmount(effectiveTotalerBedarf / (1 - capitalGainsTaxRate), 'ceil')
            : 0;
        let aktienVerkaufsbedarf = Math.min(
            aktienwert,
            grossEquityBudgetForNeed
        );

        // FIX: Priorisierung von Gold-Verkäufen.
        // Wenn Gold massiv verkauft wird (> 150% des Bedarfs), deckt dies die Liquidität sicher ab.
        // Wir verzichten dann auf Aktien-Verkauf (Skimming), auch im Notfall (belowAbsoluteFloor),
        // da der Gold-Erlös ausreicht.
        if (goldVerkaufBedarf > 1.5 * effectiveLiquiditätsBedarf) {
            aktienVerkaufsbedarf = 0;
        } else if (goldVerkaufBedarf >= effectiveLiquiditätsBedarf && !isCriticalLiquidity && !belowAbsoluteFloor) {
            // Fallback für normale Fälle: Wenn Gold reicht und keine Not ist -> Aktien sparen.
            aktienVerkaufsbedarf = 0;
        }

        // Fix: Bei Unterschreitung des absoluten Limits (10k) müssen wir Verkauf erlauben,
        // aber NUR wenn der Gold-Verkauf nicht bereits ausreicht (Check gegen konservativen Netto-Erlös).
        const estimatedNetGold = goldVerkaufBedarf * 0.8;
        const isGoldInsufficient = estimatedNetGold < effectiveLiquiditätsBedarf;

        if (belowAbsoluteFloor && aktienVerkaufsbedarf < effectiveLiquiditätsBedarf && isGoldInsufficient) {
            aktienVerkaufsbedarf = Math.min(grossEquityBudgetForNeed, aktienwert);
        }

        // Bei kritischer Liquidität: Verkauf auch unter Obergrenze/Zielwert erlauben
        // um RUIN durch Liquiditätsmangel zu verhindern. Auch hier: Prüfe ob Gold reicht.
        if (isCriticalLiquidity && aktienVerkaufsbedarf < effectiveLiquiditätsBedarf && isGoldInsufficient) {
            // Erlaube Verkauf bis zum Liquiditätsbedarf, begrenzt durch verfügbare Aktien
            aktienVerkaufsbedarf = Math.min(grossEquityBudgetForNeed, aktienwert);
        }

        // ATH-skaliertes Cap: Bei -20% ATH-Abstand kein Rebalancing mehr
        const baseMaxSkimCapEuro = ((input.maxSkimPctOfEq ?? 5) / 100) * aktienwert;
        const athScaledSkimCap = baseMaxSkimCapEuro * athRebalancingFaktor;

        // Bei kritischer Liquidität ODER absolutem Minimum ODER externem Override: Cap lockern
        const isEmergencyRefill = isCriticalLiquidity || belowAbsoluteFloor || (minTradeResultOverride === 0);

        const effectiveSkimCap = isEmergencyRefill
            ? Math.max(athScaledSkimCap, grossEquityBudgetForNeed)
            : athScaledSkimCap;

        const maxSellableFromEquity = Math.min(aktienVerkaufsbedarf, effectiveSkimCap);

        const totalEquityValue = input.depotwertAlt + input.depotwertNeu;
        if (totalEquityValue > 0) {
            saleContext.maxEquityBudgetTotal = maxSellableFromEquity;
        }
        transactionDiagnostics.equityThresholds = {
            ...transactionDiagnostics.equityThresholds,
            saleBudgetEquityTotal: maxSellableFromEquity || 0,
            allocationPolicy: 'runway_need_without_fixed_equity_target'
        };

        // ANTI-PSEUDO-ACCURACY: Liquiditätsbedarf kaufmännisch runden (Ceil)

        // NEU: Wir runden den BRUTTO-VERKAUF, nicht den Netto-Bedarf.
        // 1. Dry Run: Wie viel Brutto müssten wir für den exakten Netto-Bedarf verkaufen?
        let dryRunSale = calculateSaleAndTax(
            effectiveTotalerBedarf,
            input,
            {
                minGold: saleContext.minGold,
                saleBudgets: saleContext.saleBudgets,
                maxEquityBudgetTotal: saleContext.maxEquityBudgetTotal
            },
            market,
            false // isEmergencySale
        );

        let bruttoTarget = dryRunSale.bruttoVerkaufGesamt;

        // 2. Brutto-Betrag runden (Aufrunden)
        let cleanBruttoTarget = quantizeAmount(bruttoTarget, 'ceil');

        // 3. Context für echten Verkauf setzen
        saleContext.forceGrossSellAmount = cleanBruttoTarget;

        // Der "Bedarf" für die Anzeige/Resultat ist jetzt abgeleitet vom Gross Target?
        // Nein, calculateSaleAndTax liefert den erreichten Netto-Betrag zurück.
        // Wir lassen effectiveTotalerBedarf für die Verwendungs-Logik auf dem Netto-Gap (bzw. dem Resultat daraus).

        actionDetails.bedarf = effectiveTotalerBedarf;
        actionDetails.title = "Opportunistisches Rebalancing & Liquidität auffüllen";

        // Verwendungen zuweisen
        // ANTI-PSEUDO-ACCURACY: Auch Käufe runden (Gold), Rest in Liquidität
        const goldAllocRaw = Math.min(effectiveTotalerBedarf, goldKaufBedarf);
        const goldAllocQuant = quantizeAmount(goldAllocRaw, 'floor');
        verwendungen.gold = goldAllocQuant;

        // Liquiditätsbedarf abdecken (begrenzt auf Bedarfsdeckung)
        const availableForLiq = Math.max(0, effectiveTotalerBedarf - verwendungen.gold);
        verwendungen.liquiditaet = Math.min(availableForLiq, effectiveLiquiditätsBedarf);

        // Falls Gold verkauft wird, geht der nach dem Runway verbleibende Erlös
        // ohne fixes Aktienziel in Aktien.
        if (goldVerkaufBedarf > 0) {
            const remainingForEq = Math.max(0, availableForLiq - verwendungen.liquiditaet);
            verwendungen.aktien = remainingForEq;
        }
    }

    return {
        actionDetails,
        verwendungen,
        minTradeResultOverride
    };
}
