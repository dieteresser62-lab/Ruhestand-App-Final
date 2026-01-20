import { CONFIG } from '../config.mjs';

export function buildOpportunisticRefill({
    aktuelleLiquiditaet,
    zielLiquiditaet,
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
        const goldBandPct = (input.rebalancingBand ?? input.rebalBand ?? 35) / 100;
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
    if (liquiditaetsBedarf > 0 && goldKaufBedarf > 0) {
        // Kein Gold-Kauf aus Verkäufen, solange Liquidität unter Ziel ist.
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

    // Hysterese-Check vor Quantisierung (außer bei Gefahr)
    if (!isCriticalLiquidity && !belowAbsoluteFloor) {
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
        const minTradeGateResult = computeAppliedMinTradeGate({
            investiertesKapital,
            liquiditaetsBedarf: effectiveLiquiditätsBedarf,
            totalerBedarf: effectiveTotalerBedarf
        });
        appliedMinTradeGate = minTradeGateResult.appliedMinTradeGate;
        minTradeResultOverride = minTradeGateResult.minTradeResultOverride;
        if (minTradeGateResult.diagnosisEntry) {
            actionDetails.diagnosisEntries.push(minTradeGateResult.diagnosisEntry);
        }
    }

    // DEBUG PROBE
    if (effectiveLiquiditätsBedarf > 50000 && effectiveTotalerBedarf < appliedMinTradeGate) {
        console.warn('DEBUG: Trade Gated!');
        console.warn('Total Bedarf:', effectiveTotalerBedarf);
        console.warn('Applied Gate:', appliedMinTradeGate);
        console.warn('Is Critical:', isCriticalLiquidity);
        console.warn('Min Trade Override:', minTradeResultOverride);
    }

    if (effectiveTotalerBedarf >= appliedMinTradeGate) {
        // Gold-Verkaufsbudget berechnen
        let maxSellableFromGold = 0;
        const goldBandPct = (input.rebalancingBand ?? input.rebalBand ?? 35) / 100;
        const equityBandPct = (input.rebalBand ?? input.rebalancingBand ?? 35) / 100;

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

        if (isNaN(maxSellableFromGold)) {
            console.error('DEBUG: maxSellableFromGold is NaN!');
            console.error('goldWert:', input.goldWert);
            console.error('investiertesKapital:', investiertesKapital);
            console.error('goldZielProzent:', input.goldZielProzent);
        }

        // Aktien-Verkaufsbudget berechnen
        const aktienZielwert = investiertesKapital * (input.targetEq / 100);
        const aktienObergrenze = aktienZielwert * (1 + equityBandPct);
        let aktienUeberschuss = (aktienwert > aktienObergrenze)
            ? (aktienwert - aktienZielwert)
            : 0;

        // FIX: Priorisierung von Gold-Verkäufen.
        // Wenn Gold massiv verkauft wird (> 150% des Bedarfs), deckt dies die Liquidität sicher ab.
        // Wir verzichten dann auf Aktien-Verkauf (Skimming), auch im Notfall (belowAbsoluteFloor),
        // da der Gold-Erlös ausreicht.
        if (goldVerkaufBedarf > 1.5 * effectiveLiquiditätsBedarf) {
            aktienUeberschuss = 0;
        } else if (goldVerkaufBedarf >= effectiveLiquiditätsBedarf && !isCriticalLiquidity && !belowAbsoluteFloor) {
            // Fallback für normale Fälle: Wenn Gold reicht und keine Not ist -> Aktien sparen.
            aktienUeberschuss = 0;
        }

        // Fix: Bei Unterschreitung des absoluten Limits (10k) müssen wir Verkauf erlauben,
        // aber NUR wenn der Gold-Verkauf nicht bereits ausreicht (Check gegen konservativen Netto-Erlös).
        const estimatedNetGold = goldVerkaufBedarf * 0.8;
        const isGoldInsufficient = estimatedNetGold < effectiveLiquiditätsBedarf;

        if (belowAbsoluteFloor && aktienUeberschuss < effectiveLiquiditätsBedarf && isGoldInsufficient) {
            aktienUeberschuss = Math.min(effectiveLiquiditätsBedarf, aktienwert);
        }

        // Bei kritischer Liquidität: Verkauf auch unter Obergrenze/Zielwert erlauben
        // um RUIN durch Liquiditätsmangel zu verhindern. Auch hier: Prüfe ob Gold reicht.
        if (isCriticalLiquidity && aktienUeberschuss < effectiveLiquiditätsBedarf && isGoldInsufficient) {
            // Erlaube Verkauf bis zum Liquiditätsbedarf, begrenzt durch verfügbare Aktien
            aktienUeberschuss = Math.min(effectiveLiquiditätsBedarf, aktienwert);
        }

        // ATH-skaliertes Cap: Bei -20% ATH-Abstand kein Rebalancing mehr
        const baseMaxSkimCapEuro = ((input.maxSkimPctOfEq || 5) / 100) * aktienwert;
        const athScaledSkimCap = baseMaxSkimCapEuro * athRebalancingFaktor;
        // Bei kritischer Liquidität ODER absolutem Minimum: Cap auf Liquiditätsbedarf + 20% Puffer begrenzen
        // Das stellt sicher, dass die Liquidität aufgefüllt wird.
        const effectiveSkimCap = (isCriticalLiquidity || belowAbsoluteFloor)
            ? Math.max(athScaledSkimCap, effectiveLiquiditätsBedarf * 1.2)
            : athScaledSkimCap;
        const maxSellableFromEquity = Math.min(aktienUeberschuss, effectiveSkimCap);

        const totalEquityValue = input.depotwertAlt + input.depotwertNeu;
        if (totalEquityValue > 0) {
            saleContext.maxEquityBudgetTotal = maxSellableFromEquity;
        }
        transactionDiagnostics.equityThresholds = {
            ...transactionDiagnostics.equityThresholds,
            saleBudgetEquityTotal: maxSellableFromEquity || 0
        };

        // ANTI-PSEUDO-ACCURACY: Liquiditätsbedarf kaufmännisch runden (Ceil)

        // NEU: Wir runden den BRUTTO-VERKAUF, nicht den Netto-Bedarf.
        // 1. Dry Run: Wie viel Brutto müssten wir für den exakten Netto-Bedarf verkaufen?
        let dryRunSale = calculateSaleAndTax(
            effectiveTotalerBedarf,
            input,
            { minGold: saleContext.minGold, saleBudgets: saleContext.saleBudgets },
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

        // Falls Gold verkauft wird (Rebalancing), Erlös in Aktien stecken (wenn Platz)
        if (goldVerkaufBedarf > 0) {
            // Prüfen wie viel Platz im Aktien-Bucket ist (bis Zielwert)
            const aktienZielwert = investiertesKapital * (input.targetEq / 100);
            const aktienCurrent = input.depotwertAlt + input.depotwertNeu;
            const aktienGap = Math.max(0, aktienZielwert - aktienCurrent);

            // Alles was nicht für Liquidität nötig war, kann in Aktien gehen
            const remainingForEq = Math.max(0, availableForLiq - verwendungen.liquiditaet);
            verwendungen.aktien = Math.min(remainingForEq, aktienGap);

            // Wenn noch was übrig ist (weil Aktien voll), geht der Rest implizit in Liquidität
            // indem er nicht ausgegeben wird -> Cash erhöht sich.
            // Hier explizit als Liquiditätsverwendung erfassen, damit die Rechnung aufgeht?
            // Nein, die Engine bucht (NettoErlös - Reinvest).
            // Wenn wir verwendungen.aktien begrenzen, bleibt der Rest Cash. Korrekt.
        }
    }

    return {
        actionDetails,
        verwendungen,
        minTradeResultOverride
    };
}
