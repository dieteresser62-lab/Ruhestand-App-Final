/**
 * Module: Sale Engine
 * Purpose: Calculates tax-efficient sales of assets (Shares, Gold).
 *          Handles FIFO vs Tax-Optimized sorting and capital gains tax (Abgeltungsteuer).
 * Usage: Called by transaction-action.mjs to execute sell orders.
 * Dependencies: None (pure logic)
 */
export function calculateSaleAndTax(requestedRefill, input, context, market, isEmergencySale) {
    const forceGrossSellAmount = context && context.forceGrossSellAmount ? Number(context.forceGrossSellAmount) : 0;

    // Hardening against NaN inputs
    const kiSt = Number(input.kirchensteuerSatz) || 0;
    const keSt = 0.25 * (1 + 0.055 + kiSt);

    const _calculateSingleSale = (nettoBedarf, pauschbetrag, tranchesToUse) => {
        let finalBreakdown = [];
        let totalBrutto = 0;
        let totalSteuer = 0;
        let pauschbetragVerbraucht = 0;
        let nochZuDeckenderNettoBetrag = Math.max(0, Number(nettoBedarf) || 0);
        let pauschbetragRest = Math.max(0, Number(pauschbetrag) || 0);

        const remainingBudgets = (context && context.saleBudgets)
            ? { ...context.saleBudgets }
            : null;
        let remainingEquityBudget = Number(context?.maxEquityBudgetTotal);
        if (!Number.isFinite(remainingEquityBudget) || remainingEquityBudget <= 0) {
            remainingEquityBudget = null;
        }

        for (const tranche of tranchesToUse) {
            // Abbruchbedingung: Wenn Netto-Bedarf gedeckt ist (Normalfall)
            // ODER: Wenn ein explizites Brutto-Ziel gesetzt ist, muss dieses erreicht werden.
            if (forceGrossSellAmount > 0) {
                if (totalBrutto >= forceGrossSellAmount) break;
            } else {
                if (nochZuDeckenderNettoBetrag <= 0.01) break;
            }

            let maxBruttoVerkaufbar = Number(tranche.marketValue) || 0;

            // Gold-Floor berücksichtigen - ABER: Bei Notfallverkäufen (isEmergencySale)
            // oder wenn context.ignoreGoldFloor gesetzt ist, darf der Floor ignoriert werden,
            // um Liquiditätsengpässe zu vermeiden.
            if (tranche.kind === 'gold' && context.minGold !== undefined) {
                const goldVal = Number(input.goldWert) || 0;
                const minG = Number(context.minGold) || 0;
                // Bei Notfallverkäufen: Gold-Floor auf 0 setzen, um volle Liquiditätsbeschaffung zu ermöglichen
                const effectiveMinGold = (isEmergencySale || context.ignoreGoldFloor) ? 0 : minG;
                maxBruttoVerkaufbar = Math.max(0, goldVal - effectiveMinGold);
            }

            // Sale-Budget berücksichtigen
            if (remainingBudgets && remainingBudgets[tranche.kind] !== undefined) {
                const budgetRaw = remainingBudgets[tranche.kind];
                const budget = Number.isFinite(budgetRaw) ? budgetRaw : 0;
                maxBruttoVerkaufbar = Math.min(maxBruttoVerkaufbar, budget);
            }
            if (remainingEquityBudget !== null && String(tranche.kind || '').startsWith('aktien')) {
                maxBruttoVerkaufbar = Math.min(maxBruttoVerkaufbar, remainingEquityBudget);
            }

            if (maxBruttoVerkaufbar <= 0) continue;

            // Gewinnquote berechnen
            const mv = Number(tranche.marketValue) || 0;
            const cb = Number(tranche.costBasis) || 0;
            const gewinnQuote = mv > 0
                ? Math.max(0, (mv - cb) / mv)
                : 0;

            // Maximal möglichen Netto-Erlös berechnen
            const gewinnBruttoMax = maxBruttoVerkaufbar * gewinnQuote;
            const tqf = Number(tranche.tqf) || 0;
            const steuerpflichtigerAnteilMax = gewinnBruttoMax * (1 - tqf);
            const anrechenbarerPauschbetragMax = Math.min(pauschbetragRest, steuerpflichtigerAnteilMax);
            const finaleSteuerbasisMax = steuerpflichtigerAnteilMax - anrechenbarerPauschbetragMax;
            const steuerMax = Math.max(0, finaleSteuerbasisMax) * keSt;
            const maxNettoAusTranche = maxBruttoVerkaufbar - steuerMax;

            if (maxNettoAusTranche <= 0) continue;

            // Normalfall: Wir verkaufen nur so viel wie nötig für Netto-Bedarf
            // Sonderfall (Gross Target): Wir verkaufen so viel wie nötig für Brutto-Ziel
            let nettoAusDieserTranche = 0;

            if (forceGrossSellAmount > 0) {
                // Bei Gross Target Logik berechnen wir "zuVerkaufenBrutto" direkt vom Brutto-Rest
                const remainingGross = Math.max(0, forceGrossSellAmount - totalBrutto);
                // Wir setzen nettoAusDieserTranche vorläufig auf max, um "zuVerkaufenBrutto" Logik unten nicht zu brechen
                // (oder wir passen die Logik unten an)
                // Einfacher: Wir nutzen direkt maxBruttoVerkaufbar, aber gekappt auf remainingGross
                const targetBruttoForTranche = Math.min(remainingGross, maxBruttoVerkaufbar);

                // Helper variable to bypass standard calc
                var explicitBrutto = targetBruttoForTranche;
            } else {
                nettoAusDieserTranche = Math.min(nochZuDeckenderNettoBetrag, maxNettoAusTranche);
            }

            // Zu verkaufenden Bruttobetrag berechnen
            let zuVerkaufenBrutto;
            if (forceGrossSellAmount > 0 && typeof explicitBrutto !== 'undefined') {
                zuVerkaufenBrutto = explicitBrutto;
            } else if (nettoAusDieserTranche < maxNettoAusTranche) {
                zuVerkaufenBrutto = (nettoAusDieserTranche / maxNettoAusTranche) * maxBruttoVerkaufbar;
            } else {
                zuVerkaufenBrutto = maxBruttoVerkaufbar;
            }

            if (zuVerkaufenBrutto < 1) continue;

            if (remainingBudgets && remainingBudgets[tranche.kind] !== undefined) {
                const budgetLeft = Number(remainingBudgets[tranche.kind]) || 0;
                remainingBudgets[tranche.kind] = Math.max(0, budgetLeft - zuVerkaufenBrutto);
            }
            if (remainingEquityBudget !== null && String(tranche.kind || '').startsWith('aktien')) {
                remainingEquityBudget = Math.max(0, remainingEquityBudget - zuVerkaufenBrutto);
            }

            // Tatsächliche Steuer berechnen
            const bruttogewinn = zuVerkaufenBrutto * gewinnQuote;
            const gewinnNachTFS = bruttogewinn * (1 - (tranche.tqf || 0));
            const anrechenbarerPauschbetrag = Math.min(pauschbetragRest, gewinnNachTFS);
            const finaleSteuerbasis = gewinnNachTFS - anrechenbarerPauschbetrag;
            const steuer = Math.max(0, finaleSteuerbasis) * keSt;
            const nettoErlös = zuVerkaufenBrutto - steuer;

            totalBrutto += zuVerkaufenBrutto;
            totalSteuer += steuer;
            pauschbetragRest -= anrechenbarerPauschbetrag;
            pauschbetragVerbraucht += anrechenbarerPauschbetrag;
            nochZuDeckenderNettoBetrag -= nettoErlös;

            finalBreakdown.push({
                kind: tranche.kind,
                trancheId: tranche.trancheId || null,
                name: tranche.name || null,
                isin: tranche.isin || null,
                purchaseDate: tranche.purchaseDate || null,
                brutto: zuVerkaufenBrutto,
                steuer,
                tqf: tranche.tqf,
                spbUsed: anrechenbarerPauschbetrag,
                netto: nettoErlös
            });
        }

        return {
            steuerGesamt: totalSteuer,
            bruttoVerkaufGesamt: totalBrutto,
            achievedRefill: Math.max(0, nettoBedarf - nochZuDeckenderNettoBetrag),
            breakdown: finalBreakdown,
            pauschbetragVerbraucht: pauschbetragVerbraucht,
        };
    };

    // Tranchen zusammenstellen
    let tranches = {};

    // Prüfe ob detaillierte Tranchen verfügbar sind (aus Portfolio)
    if (input.detailledTranches && Array.isArray(input.detailledTranches)) {
        // Verwende detaillierte Tranchen
        input.detailledTranches.forEach((t, idx) => {
            const baseKey = t.trancheId || t.isin || `tranche_${t.name || 'unnamed'}_${idx}`;
            let key = baseKey;
            let suffix = 1;
            while (tranches[key]) {
                key = `${baseKey}_${suffix++}`;
            }
            tranches[key] = {
                ...t,
                trancheId: t.trancheId || null,
                kind: t.type || t.kind || 'aktien_alt',
                marketValue: t.marketValue || (t.shares * t.currentPrice) || 0,
                costBasis: t.costBasis || (t.shares * t.purchasePrice) || 0,
                tqf: t.tqf ?? 0.30
            };
        });
    } else {
        // Fallback auf alte Struktur
        tranches = {
            aktien_alt: {
                marketValue: input.depotwertAlt,
                costBasis: input.costBasisAlt,
                tqf: input.tqfAlt,
                kind: 'aktien_alt'
            },
            aktien_neu: {
                marketValue: input.depotwertNeu,
                costBasis: input.costBasisNeu,
                tqf: input.tqfNeu,
                kind: 'aktien_neu'
            },
            gold: (input.goldAktiv && input.goldWert > 0)
                ? {
                    marketValue: input.goldWert,
                    costBasis: input.goldCost,
                    tqf: input.goldSteuerfrei ? 1.0 : 0.0,
                    kind: 'gold'
                }
                : null
        };
    }

    // Leere Tranchen entfernen
    Object.keys(tranches).forEach(key => {
        if (!tranches[key] || !tranches[key].marketValue) {
            delete tranches[key];
        }
    });

    const sellOrder = getSellOrder(tranches, market, input, context, isEmergencySale);
    const orderedTranches = sellOrder.map(k => tranches[k]);

    return _calculateSingleSale(requestedRefill, input.sparerPauschbetrag || 0, orderedTranches);
}

/**
 * Bestimmt Verkaufsreihenfolge (mit FIFO-Unterstützung)
 */
export function getSellOrder(tranches, market, input, context, isEmergencySale) {
    // Alle verfügbaren Keys
    const allKeys = Object.keys(tranches);

    // Separate Aktien- und Gold-Keys
    const equityKeys = allKeys.filter(k => {
        const t = tranches[k];
        return k.startsWith('aktien') || (t.category && t.category === 'equity');
    });

    const goldKeys = allKeys.filter(k => {
        const t = tranches[k];
        return k === 'gold' || (t.category && t.category === 'gold');
    });

    // Steuer-optimierte Sortierung für Aktien (geringste Steuerlast zuerst)
    const sortedEquityKeys = [...equityKeys].sort((a, b) => {
        const tA = tranches[a];
        const tB = tranches[b];
        const kiSt = Number(input.kirchensteuerSatz) || 0;
        const keSt = 0.25 * (1 + 0.055 + kiSt);
        const mvA = Number(tA.marketValue) || 0;
        const mvB = Number(tB.marketValue) || 0;
        const cbA = Number(tA.costBasis) || 0;
        const cbB = Number(tB.costBasis) || 0;
        const tqfA = Number(tA.tqf) || 0;
        const tqfB = Number(tB.tqf) || 0;
        const gqA = mvA > 0 ? Math.max(0, (mvA - cbA) / mvA) : 0;
        const gqB = mvB > 0 ? Math.max(0, (mvB - cbB) / mvB) : 0;
        const taxRateA = gqA * (1 - tqfA) * keSt;
        const taxRateB = gqB * (1 - tqfB) * keSt;

        if (taxRateA !== taxRateB) return taxRateA - taxRateB;
        if (gqA !== gqB) return gqA - gqB;

        const dateA = tA.purchaseDate ? Date.parse(tA.purchaseDate) : NaN;
        const dateB = tB.purchaseDate ? Date.parse(tB.purchaseDate) : NaN;
        const dateAOk = Number.isFinite(dateA);
        const dateBOk = Number.isFinite(dateB);
        if (dateAOk && dateBOk && dateA !== dateB) return dateB - dateA; // newer first
        if (dateAOk && !dateBOk) return -1;
        if (!dateAOk && dateBOk) return 1;

        return String(a).localeCompare(String(b));
    });

    // FIFO-Sortierung für Gold (falls mehrere Gold-Tranchen existieren)
    const sortedGoldKeys = [...goldKeys].sort((a, b) => {
        const tA = tranches[a];
        const tB = tranches[b];

        if (tA.purchaseDate && tB.purchaseDate) {
            const dateA = new Date(tA.purchaseDate);
            const dateB = new Date(tB.purchaseDate);
            return dateA - dateB;
        }

        if (tA.purchaseDate && !tB.purchaseDate) return -1;
        if (!tA.purchaseDate && tB.purchaseDate) return 1;

        return 0;
    });

    const isDefensiveContext = isEmergencySale ||
        market.sKey === 'bear_deep' ||
        market.sKey === 'recovery_in_bear';

    // Im defensiven Kontext: Gold zuerst, dann Aktien (beide FIFO-sortiert)
    if (isDefensiveContext) {
        const order = [...sortedGoldKeys, ...sortedEquityKeys];
        return order.filter(k => tranches[k]);
    }

    // Gold über Obergrenze? Gold zuerst verkaufen
    if (input.goldAktiv && sortedGoldKeys.length > 0) {
        const depotwertGesamt = (input.depotwertAlt || 0) +
            (input.depotwertNeu || 0) +
            (input.goldWert || 0);
        const investiertesKapital = depotwertGesamt + input.tagesgeld + input.geldmarktEtf;
        const goldZielwert = investiertesKapital * (input.goldZielProzent / 100);
        const goldBandPct = (input.rebalancingBand ?? input.rebalBand ?? 35) / 100;
        const goldObergrenze = goldZielwert * (1 + goldBandPct);

        // Gesamter Gold-Wert berechnen
        const totalGoldValue = sortedGoldKeys.reduce((sum, k) => sum + (tranches[k].marketValue || 0), 0);

        if (totalGoldValue > goldObergrenze) {
            return [...sortedGoldKeys, ...sortedEquityKeys].filter(k => tranches[k]);
        }
    }

    // Standard: Aktien zuerst (FIFO), dann Gold (FIFO)
    return [...sortedEquityKeys, ...sortedGoldKeys].filter(k => tranches[k]);
}

/**
 * Merge zwei Verkaufsergebnisse
 */
export function mergeSaleResults(res1, res2) {
    if (!res1) return res2;
    if (!res2) return res1;

    const merged = {
        steuerGesamt: (res1.steuerGesamt || 0) + (res2.steuerGesamt || 0),
        bruttoVerkaufGesamt: (res1.bruttoVerkaufGesamt || 0) + (res2.bruttoVerkaufGesamt || 0),
        achievedRefill: (res1.achievedRefill || 0) + (res2.achievedRefill || 0),
        pauschbetragVerbraucht: (res1.pauschbetragVerbraucht || 0) + (res2.pauschbetragVerbraucht || 0),
        breakdown: [...(res1.breakdown || []), ...(res2.breakdown || [])]
    };

    return merged;
}
