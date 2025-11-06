'use strict';

/**
 * ===================================================================
 * TRANSACTION ENGINE MODULE
 * ===================================================================
 * Bestimmt Transaktionsaktionen und berechnet Verkäufe mit Steuern
 * ===================================================================
 */

const { CONFIG } = require('../config.js');

const TransactionEngine = {
    /**
     * Berechnet Ziel-Liquidität basierend auf Profil und Markt
     */
    calculateTargetLiquidity: (profil, market, inflatedBedarf) => {
        if (!profil.isDynamic) {
            return (inflatedBedarf.floor + inflatedBedarf.flex) * 2;
        }

        const regime = CONFIG.TEXTS.REGIME_MAP[market.sKey];
        const zielMonate = profil.runway[regime]?.total || profil.runway.hot_neutral.total;
        const useFullFlex = (regime === 'peak' || regime === 'hot_neutral');
        const anpassbarerBedarf = useFullFlex
            ? (inflatedBedarf.floor + inflatedBedarf.flex)
            : (inflatedBedarf.floor + 0.5 * inflatedBedarf.flex);

        return (Math.max(1, anpassbarerBedarf) / 12) * zielMonate;
    },

    /**
     * Berechnet gewichtete Allokation
     * @private
     */
    _computeWeights(input, gesamtwert) {
        if (gesamtwert <= 0) {
            return { eqWeight: 0, goldWeight: 0, liqWeight: 0 };
        }

        const aktienwert = input.depotwertAlt + input.depotwertNeu;
        const goldwert = input.goldAktiv ? input.goldWert : 0;
        const liquiditaet = input.tagesgeld + input.geldmarktEtf;

        return {
            eqWeight: aktienwert / gesamtwert,
            goldWeight: goldwert / gesamtwert,
            liqWeight: liquiditaet / gesamtwert
        };
    },

    /**
     * Berechnet begrenztes Auffüllen (mit Cap)
     * @private
     */
    _computeCappedRefill({ isBearContext, liquiditaetsbedarf, aktienwert, input }) {
        const capConfig = isBearContext
            ? {
                pct: input.maxBearRefillPctOfEq,
                title: 'Bärenmarkt-Auffüllung (Drip)',
                diagStep: 'Cap wirksam (Bär)'
            }
            : {
                pct: input.maxSkimPctOfEq,
                title: 'Opportunistisches Rebalancing (Skim & Fill)',
                diagStep: 'Cap wirksam (Skim)'
            };

        const maxCapEuro = (capConfig.pct / 100) * aktienwert;
        const nettoBedarf = Math.min(liquiditaetsbedarf, maxCapEuro);
        const isCapped = nettoBedarf < liquiditaetsbedarf;

        if (nettoBedarf < CONFIG.THRESHOLDS.STRATEGY.minRefillAmount) {
            if (liquiditaetsbedarf >= CONFIG.THRESHOLDS.STRATEGY.minRefillAmount) {
                return {
                    bedarf: 0,
                    title: '',
                    diagnosisEntries: [{
                        step: "Aktion unterdrückt",
                        impact: `Geplanter Verkauf (${nettoBedarf.toFixed(0)}€) unter Mindestgröße nach Capping.`,
                        status: 'inactive',
                        severity: 'guardrail'
                    }]
                };
            }
            return { bedarf: 0, title: '', diagnosisEntries: [] };
        }

        const title = isCapped ? `${capConfig.title} (Cap aktiv)` : capConfig.title;
        const diagnosisEntries = isCapped
            ? [{
                step: capConfig.diagStep,
                impact: `Auffüllen auf ${nettoBedarf.toFixed(0)}€ (${capConfig.pct}%) begrenzt.`,
                status: 'active',
                severity: 'guardrail'
            }]
            : [];

        return { bedarf: nettoBedarf, title, diagnosisEntries };
    },

    /**
     * Bestimmt notwendige Transaktionsaktion
     */
    determineAction(p) {
        const {
            aktuelleLiquiditaet, depotwertGesamt, zielLiquiditaet,
            market, spending, minGold, profil, input
        } = p;

        let actionDetails = { bedarf: 0, title: '', diagnosisEntries: [] };
        let isPufferSchutzAktiv = false;
        let verwendungen = { liquiditaet: 0, gold: 0, aktien: 0 };
        const transactionDiagnostics = {
            wasTriggered: false,
            blockReason: 'none',
            blockedAmount: 0,
            equityThresholds: {},
            goldThresholds: {},
            potentialTrade: {}
        };
        const saleContext = { minGold, saleBudgets: {} };

        const renteJahr = input.renteAktiv ? input.renteMonatlich * 12 : 0;
        const floorBedarfNetto = Math.max(0, input.floorBedarf - renteJahr);
        const krisenMindestLiquiditaet = (floorBedarfNetto / 12) * input.runwayMinMonths;
        const sicherheitsPuffer = krisenMindestLiquiditaet;
        const isBearRegimeProxy = market.sKey === 'bear_deep' || market.sKey === 'recovery_in_bear';

        // Puffer-Schutz im Bärenmarkt
        if (aktuelleLiquiditaet <= sicherheitsPuffer && isBearRegimeProxy) {
            isPufferSchutzAktiv = true;
            const gap = sicherheitsPuffer - aktuelleLiquiditaet;

            if (gap > 1) {
                actionDetails.bedarf = Math.max(0, gap);
                actionDetails.title = "Notfall-Verkauf (Puffer-Auffüllung)";
            } else {
                actionDetails.bedarf = floorBedarfNetto;
                actionDetails.title = "Notfall-Verkauf (Puffer-Sicherung)";
            }

            actionDetails.diagnosisEntries.push({
                step: "Puffer-Schutz (Floor-Fill)",
                impact: `Runway-Sicherung um ${actionDetails.bedarf.toFixed(0)}€`,
                status: 'active',
                severity: 'alarm'
            });
            verwendungen.liquiditaet = actionDetails.bedarf;
        }

        // Normale Transaktionslogik
        if (!isPufferSchutzAktiv) {
            const gesamtjahresbedarf = floorBedarfNetto + input.flexBedarf;
            const currentRunwayMonths = (gesamtjahresbedarf > 0)
                ? (aktuelleLiquiditaet / (gesamtjahresbedarf / 12))
                : Infinity;
            const aktienwert = input.depotwertAlt + input.depotwertNeu;

            // Bärenmarkt: Runway auffüllen
            if (isBearRegimeProxy && currentRunwayMonths < input.runwayMinMonths) {
                const runwayBedarfEuro = (input.runwayMinMonths - currentRunwayMonths) *
                    (gesamtjahresbedarf / 12);
                actionDetails = this._computeCappedRefill({
                    isBearContext: true,
                    liquiditaetsbedarf: runwayBedarfEuro,
                    aktienwert,
                    input
                });
                verwendungen.liquiditaet = actionDetails.bedarf;

            // Nicht-Bärenmarkt: Opportunistisches Rebalancing
            } else if (!isBearRegimeProxy) {
                const investiertesKapital = depotwertGesamt + aktuelleLiquiditaet;
                const minTrade = Math.max(
                    CONFIG.THRESHOLDS.STRATEGY.minTradeAmountStatic,
                    investiertesKapital * CONFIG.THRESHOLDS.STRATEGY.minTradeAmountDynamicFactor
                );

                const liquiditaetsBedarf = Math.max(0, zielLiquiditaet - aktuelleLiquiditaet);
                let goldKaufBedarf = 0;

                // Gold-Rebalancing prüfen
                if (input.goldAktiv && input.goldZielProzent > 0) {
                    const goldZielwert = investiertesKapital * (input.goldZielProzent / 100);
                    const bandPct = (input.rebalancingBand ?? input.rebalBand ?? 35) / 100;
                    const goldUntergrenze = goldZielwert * (1 - bandPct);

                    if (input.goldWert < goldUntergrenze) {
                        goldKaufBedarf = Math.max(0, goldZielwert - input.goldWert);
                    }
                }

                const totalerBedarf = liquiditaetsBedarf + goldKaufBedarf;

                if (totalerBedarf >= minTrade) {
                    // Gold-Verkaufsbudget berechnen
                    let maxSellableFromGold = 0;
                    if (input.goldAktiv && input.goldZielProzent > 0) {
                        const goldZielwert = investiertesKapital * (input.goldZielProzent / 100);
                        const bandPct = (input.rebalancingBand ?? input.rebalBand ?? 35) / 100;
                        const goldObergrenze = goldZielwert * (1 + bandPct);

                        if (input.goldWert > goldObergrenze) {
                            maxSellableFromGold = input.goldWert - goldZielwert;
                        }
                    }
                    saleContext.saleBudgets.gold = maxSellableFromGold;

                    // Aktien-Verkaufsbudget berechnen
                    const aktienZielwert = investiertesKapital * (input.targetEq / 100);
                    const aktienObergrenze = aktienZielwert * (1 + (input.rebalBand / 100));
                    const aktienUeberschuss = (aktienwert > aktienObergrenze)
                        ? (aktienwert - aktienZielwert)
                        : 0;
                    const maxSkimCapEuro = (input.maxSkimPctOfEq / 100) * aktienwert;
                    const maxSellableFromEquity = Math.min(aktienUeberschuss, maxSkimCapEuro);

                    const totalEquityValue = input.depotwertAlt + input.depotwertNeu;
                    if (totalEquityValue > 0) {
                        saleContext.saleBudgets.aktien_alt =
                            maxSellableFromEquity * (input.depotwertAlt / totalEquityValue);
                        saleContext.saleBudgets.aktien_neu =
                            maxSellableFromEquity * (input.depotwertNeu / totalEquityValue);
                    }

                    actionDetails.bedarf = totalerBedarf;
                    actionDetails.title = "Opportunistisches Rebalancing & Liquidität auffüllen";
                    verwendungen.gold = Math.min(totalerBedarf, goldKaufBedarf);
                    verwendungen.liquiditaet = Math.min(totalerBedarf - verwendungen.gold, liquiditaetsBedarf);
                }
            }
        }

        // Verkauf berechnen
        const gesamterNettoBedarf = actionDetails.bedarf;
        if (gesamterNettoBedarf <= 0) {
            return {
                type: 'NONE',
                anweisungKlasse: 'anweisung-gruen',
                title: `${market.szenarioText} (Kein Handlungsbedarf)`,
                diagnosisEntries: actionDetails.diagnosisEntries,
                transactionDiagnostics
            };
        }

        let saleResult = this.calculateSaleAndTax(
            gesamterNettoBedarf,
            input,
            saleContext,
            market,
            isPufferSchutzAktiv
        );

        const minTradeResult = Math.max(
            CONFIG.THRESHOLDS.STRATEGY.minTradeAmountStatic,
            (depotwertGesamt + aktuelleLiquiditaet) * CONFIG.THRESHOLDS.STRATEGY.minTradeAmountDynamicFactor
        );

        if (!saleResult || saleResult.achievedRefill < minTradeResult) {
            return {
                type: 'NONE',
                anweisungKlasse: 'anweisung-gruen',
                title: `${market.szenarioText} (Kein Handlungsbedarf)`,
                diagnosisEntries: actionDetails.diagnosisEntries,
                transactionDiagnostics
            };
        }

        const effektiverNettoerloes = saleResult.achievedRefill;

        if (gesamterNettoBedarf > effektiverNettoerloes + 1 && !actionDetails.title.includes('(Cap aktiv)')) {
            actionDetails.title += ' (Cap aktiv)';
        }

        // Erlös verteilen: Priorität 1: Liquidität, 2: Gold, 3: Aktien
        let erloesUebrig = effektiverNettoerloes;

        const finalLiq = Math.min(erloesUebrig, verwendungen.liquiditaet);
        erloesUebrig -= finalLiq;

        const finalGold = Math.min(erloesUebrig, verwendungen.gold);
        erloesUebrig -= finalGold;

        const finalAktien = Math.min(erloesUebrig, verwendungen.aktien);

        return {
            type: 'TRANSACTION',
            anweisungKlasse: 'anweisung-gelb',
            title: actionDetails.title,
            isPufferSchutzAktiv,
            nettoErlös: effektiverNettoerloes,
            quellen: saleResult.breakdown,
            steuer: saleResult.steuerGesamt,
            verwendungen: { liquiditaet: finalLiq, gold: finalGold, aktien: finalAktien },
            diagnosisEntries: actionDetails.diagnosisEntries,
            transactionDiagnostics
        };
    },

    /**
     * Berechnet Verkauf und Steuer
     */
    calculateSaleAndTax(requestedRefill, input, context, market, isEmergencySale) {
        const keSt = 0.25 * (1 + 0.055 + input.kirchensteuerSatz);

        const _calculateSingleSale = (nettoBedarf, pauschbetrag, tranchesToUse) => {
            let finalBreakdown = [];
            let totalBrutto = 0;
            let totalSteuer = 0;
            let pauschbetragVerbraucht = 0;
            let nochZuDeckenderNettoBetrag = nettoBedarf;
            let pauschbetragRest = pauschbetrag;

            for (const tranche of tranchesToUse) {
                if (nochZuDeckenderNettoBetrag <= 0.01) break;

                let maxBruttoVerkaufbar = tranche.marketValue;

                // Gold-Floor berücksichtigen
                if (tranche.kind === 'gold' && context.minGold !== undefined) {
                    maxBruttoVerkaufbar = Math.max(0, input.goldWert - context.minGold);
                }

                // Sale-Budget berücksichtigen
                if (context.saleBudgets && context.saleBudgets[tranche.kind] !== undefined) {
                    maxBruttoVerkaufbar = Math.min(maxBruttoVerkaufbar, context.saleBudgets[tranche.kind]);
                }

                if (maxBruttoVerkaufbar <= 0) continue;

                // Gewinnquote berechnen
                const gewinnQuote = tranche.marketValue > 0
                    ? Math.max(0, (tranche.marketValue - tranche.costBasis) / tranche.marketValue)
                    : 0;

                // Maximal möglichen Netto-Erlös berechnen
                const gewinnBruttoMax = maxBruttoVerkaufbar * gewinnQuote;
                const steuerpflichtigerAnteilMax = gewinnBruttoMax * (1 - tranche.tqf);
                const anrechenbarerPauschbetragMax = Math.min(pauschbetragRest, steuerpflichtigerAnteilMax);
                const finaleSteuerbasisMax = steuerpflichtigerAnteilMax - anrechenbarerPauschbetragMax;
                const steuerMax = Math.max(0, finaleSteuerbasisMax) * keSt;
                const maxNettoAusTranche = maxBruttoVerkaufbar - steuerMax;

                if (maxNettoAusTranche <= 0) continue;

                const nettoAusDieserTranche = Math.min(nochZuDeckenderNettoBetrag, maxNettoAusTranche);

                // Zu verkaufenden Bruttobetrag berechnen
                let zuVerkaufenBrutto;
                if (nettoAusDieserTranche < maxNettoAusTranche) {
                    zuVerkaufenBrutto = (nettoAusDieserTranche / maxNettoAusTranche) * maxBruttoVerkaufbar;
                } else {
                    zuVerkaufenBrutto = maxBruttoVerkaufbar;
                }

                if (zuVerkaufenBrutto < 1) continue;

                // Tatsächliche Steuer berechnen
                const bruttogewinn = zuVerkaufenBrutto * gewinnQuote;
                const gewinnNachTFS = bruttogewinn * (1 - tranche.tqf);
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
        let tranches = {
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

        // Leere Tranchen entfernen
        Object.keys(tranches).forEach(key => {
            if (!tranches[key] || !tranches[key].marketValue) {
                delete tranches[key];
            }
        });

        const sellOrder = this._getSellOrder(tranches, market, input, context, isEmergencySale);
        const orderedTranches = sellOrder.map(k => tranches[k]);

        return _calculateSingleSale(requestedRefill, input.sparerPauschbetrag, orderedTranches);
    },

    /**
     * Bestimmt Verkaufsreihenfolge
     * @private
     */
    _getSellOrder(tranches, market, input, context, isEmergencySale) {
        // Aktien nach steuerlicher Effizienz sortieren
        const equityKeys = Object.keys(tranches)
            .filter(k => k.startsWith('aktien'))
            .sort((a, b) => {
                const tA = tranches[a];
                const tB = tranches[b];
                const gqA = tA.marketValue > 0
                    ? Math.max(0, (tA.marketValue - tA.costBasis) / tA.marketValue)
                    : 0;
                const gqB = tB.marketValue > 0
                    ? Math.max(0, (tB.marketValue - tB.costBasis) / tB.marketValue)
                    : 0;
                return (gqA * (1 - tA.tqf)) - (gqB * (1 - tB.tqf));
            });

        const isDefensiveContext = isEmergencySale ||
            market.sKey === 'bear_deep' ||
            market.sKey === 'recovery_in_bear';

        // Im defensiven Kontext: Gold zuerst
        if (isDefensiveContext) {
            const order = ['gold', ...equityKeys];
            return order.filter(k => tranches[k]);
        }

        // Gold über Obergrenze? Gold zuerst verkaufen
        if (input.goldAktiv && tranches.gold) {
            const depotwertGesamt = (input.depotwertAlt || 0) +
                (input.depotwertNeu || 0) +
                (input.goldWert || 0);
            const investiertesKapital = depotwertGesamt + input.tagesgeld + input.geldmarktEtf;
            const goldZielwert = investiertesKapital * (input.goldZielProzent / 100);
            const bandPct = (input.rebalancingBand ?? input.rebalBand ?? 35) / 100;
            const goldObergrenze = goldZielwert * (1 + bandPct);

            if (tranches.gold.marketValue > goldObergrenze) {
                return ['gold', ...equityKeys].filter(k => tranches[k]);
            }
        }

        // Standard: Aktien zuerst, dann Gold
        return [...equityKeys, 'gold'].filter(k => tranches[k]);
    },

    /**
     * Merge zwei Verkaufsergebnisse
     */
    mergeSaleResults(res1, res2) {
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
};

// Exporte
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransactionEngine;
}
