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
    _computeCappedRefill({ isBearContext, liquiditaetsbedarf, aktienwert, input, isCriticalLiquidity = false }) {
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
        // Bei kritischer Liquidität: erhöhtes Cap erlauben (10% des Aktienwerts)
        const effectiveMaxCap = isCriticalLiquidity
            ? Math.max(maxCapEuro, aktienwert * 0.10)
            : maxCapEuro;
        const nettoBedarf = Math.min(liquiditaetsbedarf, effectiveMaxCap);
        const isCapped = nettoBedarf < liquiditaetsbedarf;

        // Bei kritischer Liquidität: stark reduzierte Mindestschwelle verwenden
        // Wenn isCriticalLiquidity true ist, setzen wir das Limit auf 0, um JEDE notwendige Auffüllung zu erlauben
        // und so den "Notfall-Verkauf" im Folgejahr zu verhindern.
        const effectiveMinRefill = isCriticalLiquidity
            ? 0
            : CONFIG.THRESHOLDS.STRATEGY.minRefillAmount;

        if (nettoBedarf < effectiveMinRefill) {
            if (liquiditaetsbedarf >= effectiveMinRefill) {
                return {
                    bedarf: 0,
                    title: '',
                    diagnosisEntries: [{
                        step: "Aktion unterdrückt",
                        impact: `Geplanter Verkauf (${nettoBedarf.toFixed(0)}€) unter Mindestgröße nach Capping.`,
                        status: 'inactive',
                        severity: 'guardrail'
                    }],
                    isCapped
                };
            }
            return { bedarf: 0, title: '', diagnosisEntries: [], isCapped };
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

        return { bedarf: nettoBedarf, title, diagnosisEntries, isCapped };
    },

    /**
     * Ermittelt die anwendbare Mindest-Trade-Schwelle für liquiditätsgetriebene Aktionen.
     *
     * @param {Object} params - Parameterobjekt
     * @param {number} params.investiertesKapital - Gesamtwert des Portfolios inkl. Liquidität
     * @param {number} params.liquiditaetsBedarf - Geplanter Liquiditätszufluss (ohne Gold)
     * @param {number} params.totalerBedarf - Gesamter Zielzufluss (inklusive etwaiger Gold-Beschaffungen)
     * @returns {{ appliedMinTradeGate: number, minTradeResultOverride: (number|null), diagnosisEntry: (Object|null) }}
     */
    _computeAppliedMinTradeGate({ investiertesKapital, liquiditaetsBedarf, totalerBedarf }) {
        const basisMinTrade = Math.max(
            CONFIG.THRESHOLDS.STRATEGY.minTradeAmountStatic,
            investiertesKapital * CONFIG.THRESHOLDS.STRATEGY.minTradeAmountDynamicFactor
        );
        const liquidityEmergencyGate = Math.max(
            CONFIG.THRESHOLDS.STRATEGY.minRefillAmount || 0,
            CONFIG.THRESHOLDS.STRATEGY.cashRebalanceThreshold || 0
        );

        let appliedMinTradeGate = basisMinTrade;
        let minTradeResultOverride = null;
        let diagnosisEntry = null;

        const shouldRelaxMinTradeGate =
            liquiditaetsBedarf > 0 && totalerBedarf > 0 && totalerBedarf < basisMinTrade;

        if (shouldRelaxMinTradeGate) {
            appliedMinTradeGate = Math.min(basisMinTrade, liquidityEmergencyGate);

            if (appliedMinTradeGate < basisMinTrade) {
                minTradeResultOverride = appliedMinTradeGate;
                diagnosisEntry = {
                    step: 'Liquiditäts-Priorität',
                    impact: `Mindestschwelle temporär auf ${appliedMinTradeGate.toFixed(0)}€ gesenkt (statt ${basisMinTrade.toFixed(0)}€).`,
                    status: 'active',
                    severity: 'info'
                };
            }
        }

        return { appliedMinTradeGate, minTradeResultOverride, diagnosisEntry };
    },

    /**
     * Bestimmt notwendige Transaktionsaktion
     */
    determineAction(p) {
        const {
            aktuelleLiquiditaet, depotwertGesamt, zielLiquiditaet,
            market, spending, minGold, profil, input
        } = p;

        let actionDetails = { bedarf: 0, title: '', diagnosisEntries: [], isCapped: false };
        let isPufferSchutzAktiv = false;
        let verwendungen = { liquiditaet: 0, gold: 0, aktien: 0 };
        let minTradeResultOverride = null;
        const transactionDiagnostics = {
            wasTriggered: false,
            blockReason: 'none',
            blockedAmount: 0,
            equityThresholds: {
                targetAllocationPct: input.targetEq,
                rebalancingBandPct: input.rebalancingBand ?? input.rebalBand ?? 35,
                maxSkimPctOfEq: input.maxSkimPctOfEq
            },
            goldThresholds: {
                minGoldReserve: minGold,
                targetPct: input.goldZielProzent || 0,
                maxBearRefillPctOfEq: input.maxBearRefillPctOfEq
            },
            potentialTrade: {}
        };
        const markAsBlocked = (reason, blockedAmount = 0, overrides = {}) => {
            transactionDiagnostics.blockReason = reason;
            transactionDiagnostics.blockedAmount = Math.max(0, blockedAmount);
            if (overrides && typeof overrides === 'object') {
                transactionDiagnostics.potentialTrade = {
                    ...transactionDiagnostics.potentialTrade,
                    ...overrides
                };
            }
        };
        const saleContext = { minGold, saleBudgets: {} };

        const renteJahr = input.renteAktiv ? input.renteMonatlich * 12 : 0;
        const floorBedarfNetto = Math.max(0, input.floorBedarf - renteJahr);

        // Strukturales Runway-Mindestmaß ableiten: Bevorzugt das Profil-Minimum, fällt sonst auf Input/Strategie zurück.
        // Design-Entscheidung: Die neutrale Notfüllung soll nur bei echter Runway-Unterschreitung auslösen –
        // daher orientieren wir uns an der harten Untergrenze (Profil), nicht an höheren Zielwerten.
        const runwayMinThresholdMonths = profil?.minRunwayMonths
            ?? CONFIG.THRESHOLDS.STRATEGY.runwayThinMonths
            ?? input.runwayMinMonths;

        const krisenMindestLiquiditaet = (floorBedarfNetto / 12) * runwayMinThresholdMonths;
        // Sicherheits-Puffer: Entweder rechnerischer Bedarf oder absolutes Minimum (für ruhiges Schlafen)
        const sicherheitsPuffer = Math.max(
            krisenMindestLiquiditaet,
            CONFIG.THRESHOLDS.STRATEGY.absoluteMinLiquidity || 10000
        );
        const isBearRegimeProxy = market.sKey === 'bear_deep' || market.sKey === 'recovery_in_bear';
        console.log('DEBUG TransactionEngine: isBearRegimeProxy', isBearRegimeProxy, 'market.sKey', market.sKey, 'aktuelleLiquiditaet', aktuelleLiquiditaet, 'sicherheitsPuffer', sicherheitsPuffer);
        const investiertesKapital = depotwertGesamt + aktuelleLiquiditaet;

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
            const zielLiquiditaetsdeckung = (zielLiquiditaet > 0)
                ? (aktuelleLiquiditaet / zielLiquiditaet)
                : 1;
            const runwayCoverageThreshold = CONFIG.THRESHOLDS.STRATEGY.runwayCoverageMinPct || 0;
            const hasRunwayGap = currentRunwayMonths < runwayMinThresholdMonths;
            const monthlyBaselineNeed = (gesamtjahresbedarf / 12);
            const guardrailTargetEuro = Math.max(
                runwayMinThresholdMonths * monthlyBaselineNeed,
                runwayCoverageThreshold * zielLiquiditaet
            );
            const guardrailTargetMonths = (monthlyBaselineNeed > 0)
                ? (guardrailTargetEuro / monthlyBaselineNeed)
                : 0;
            const guardrailGapEuro = Math.max(0, guardrailTargetEuro - aktuelleLiquiditaet);
            const hasGuardrailGap = guardrailGapEuro > 1; // kleine Toleranz gegen Rundungsartefakte

            // Bärenmarkt: Runway auffüllen, sobald Guardrail unterschritten wird
            if (isBearRegimeProxy && hasGuardrailGap) {
                const isCriticalLiquidityBear = aktuelleLiquiditaet < (sicherheitsPuffer * 1.5);

                const bearRefill = this._computeCappedRefill({
                    isBearContext: true,
                    liquiditaetsbedarf: guardrailGapEuro,
                    aktienwert,
                    input,
                    isCriticalLiquidity: isCriticalLiquidityBear
                });

                if (bearRefill.bedarf > 0) {
                    actionDetails = bearRefill;
                    actionDetails.title = `Runway-Notfüllung (Bär)${bearRefill.isCapped ? ' (Cap aktiv)' : ''}`;
                    actionDetails.diagnosisEntries.unshift({
                        step: 'Runway-Notfüllung (Bär)',
                        impact: `Liquidität auf mindestens ${guardrailTargetMonths.toFixed(1)} Monate bzw. ${(runwayCoverageThreshold * 100).toFixed(0)}% des Ziels anheben (Ziel: ${guardrailTargetEuro.toFixed(0)}€).`,
                        status: 'active',
                        severity: 'warning'
                    });
                    verwendungen.liquiditaet = actionDetails.bedarf;
                }

                // Universeller Runway-Failsafe: gilt in allen Nicht-Bären-Regimes
            } else if (hasGuardrailGap) {
                const isCriticalLiquidityFailsafe = zielLiquiditaetsdeckung < runwayCoverageThreshold || hasRunwayGap;

                const minTradeGateResult = this._computeAppliedMinTradeGate({
                    investiertesKapital,
                    liquiditaetsBedarf: guardrailGapEuro,
                    totalerBedarf: guardrailGapEuro
                });
                minTradeResultOverride = minTradeGateResult.minTradeResultOverride;
                if (minTradeGateResult.diagnosisEntry) {
                    actionDetails.diagnosisEntries.push(minTradeGateResult.diagnosisEntry);
                }

                const neutralRefill = this._computeCappedRefill({
                    isBearContext: false,
                    liquiditaetsbedarf: guardrailGapEuro,
                    aktienwert,
                    input,
                    isCriticalLiquidity: isCriticalLiquidityFailsafe
                });

                if (neutralRefill.bedarf > 0) {
                    actionDetails = neutralRefill;
                    actionDetails.title = `Runway-Notfüllung (neutral)${neutralRefill.isCapped ? ' (Cap aktiv)' : ''}`;
                    actionDetails.diagnosisEntries.unshift({
                        step: 'Runway-Notfüllung (neutral)',
                        impact: `Liquidität auf mindestens ${guardrailTargetMonths.toFixed(1)} Monate bzw. ${(runwayCoverageThreshold * 100).toFixed(0)}% des Ziels anheben (Ziel: ${guardrailTargetEuro.toFixed(0)}€).`,
                        status: 'active',
                        severity: 'warning'
                    });
                    verwendungen.liquiditaet = actionDetails.bedarf;
                }

                // Nicht-Bärenmarkt: Opportunistisches Rebalancing
            } else if (!isBearRegimeProxy) {
                const liquiditaetsBedarf = Math.max(0, zielLiquiditaet - aktuelleLiquiditaet);

                // Prüfe ob kritische Liquiditätssituation vorliegt
                const zielLiquiditaetsdeckungLocal = (zielLiquiditaet > 0)
                    ? (aktuelleLiquiditaet / zielLiquiditaet)
                    : 1;
                const runwayCoverageThresholdLocal = CONFIG.THRESHOLDS.STRATEGY.runwayCoverageMinPct || 0.75;
                const isCriticalLiquidity = zielLiquiditaetsdeckungLocal < runwayCoverageThresholdLocal;

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

                // Bei kritischer Liquidität: niedrigere Mindestschwelle verwenden
                let appliedMinTradeGate;
                if (isCriticalLiquidity) {
                    appliedMinTradeGate = Math.max(
                        CONFIG.THRESHOLDS.STRATEGY.minRefillAmount || 2500,
                        CONFIG.THRESHOLDS.STRATEGY.cashRebalanceThreshold || 2500
                    );
                } else {
                    const minTradeGateResult = this._computeAppliedMinTradeGate({
                        investiertesKapital,
                        liquiditaetsBedarf,
                        totalerBedarf
                    });
                    appliedMinTradeGate = minTradeGateResult.appliedMinTradeGate;
                    minTradeResultOverride = minTradeGateResult.minTradeResultOverride;
                    if (minTradeGateResult.diagnosisEntry) {
                        actionDetails.diagnosisEntries.push(minTradeGateResult.diagnosisEntry);
                    }
                }

                if (totalerBedarf >= appliedMinTradeGate) {
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
                    transactionDiagnostics.goldThresholds = {
                        ...transactionDiagnostics.goldThresholds,
                        saleBudgetGold: maxSellableFromGold,
                        rebalancingBandPct: input.rebalancingBand ?? input.rebalBand ?? 35
                    };

                    // Aktien-Verkaufsbudget berechnen
                    const aktienZielwert = investiertesKapital * (input.targetEq / 100);
                    const aktienObergrenze = aktienZielwert * (1 + (input.rebalBand / 100));
                    let aktienUeberschuss = (aktienwert > aktienObergrenze)
                        ? (aktienwert - aktienZielwert)
                        : 0;

                    // Bei kritischer Liquidität: Verkauf auch unter Obergrenze/Zielwert erlauben
                    // um RUIN durch Liquiditätsmangel zu verhindern
                    if (isCriticalLiquidity && aktienUeberschuss < liquiditaetsBedarf) {
                        // Erlaube Verkauf bis zum Liquiditätsbedarf, begrenzt durch verfügbare Aktien
                        aktienUeberschuss = Math.min(liquiditaetsBedarf, aktienwert);
                    }

                    const maxSkimCapEuro = (input.maxSkimPctOfEq / 100) * aktienwert;
                    // Bei kritischer Liquidität: Cap auf 10% des Aktienwerts erhöhen
                    const effectiveSkimCap = isCriticalLiquidity
                        ? Math.max(maxSkimCapEuro, aktienwert * 0.10)
                        : maxSkimCapEuro;
                    const maxSellableFromEquity = Math.min(aktienUeberschuss, effectiveSkimCap);

                    const totalEquityValue = input.depotwertAlt + input.depotwertNeu;
                    if (totalEquityValue > 0) {
                        saleContext.saleBudgets.aktien_alt =
                            maxSellableFromEquity * (input.depotwertAlt / totalEquityValue);
                        saleContext.saleBudgets.aktien_neu =
                            maxSellableFromEquity * (input.depotwertNeu / totalEquityValue);
                    }
                    transactionDiagnostics.equityThresholds = {
                        ...transactionDiagnostics.equityThresholds,
                        saleBudgetAktienAlt: saleContext.saleBudgets.aktien_alt || 0,
                        saleBudgetAktienNeu: saleContext.saleBudgets.aktien_neu || 0
                    };

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
            markAsBlocked('liquidity_sufficient', 0, {
                direction: 'Keine Aktion',
                title: actionDetails.title || 'Keine Aktion',
                netAmount: 0
            });
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

        // Bei Notfall-Verkäufen (Puffer-Schutz) keine minTrade-Schwelle anwenden
        const minTradeResult = isPufferSchutzAktiv
            ? 0
            : (minTradeResultOverride ?? Math.max(
                CONFIG.THRESHOLDS.STRATEGY.minTradeAmountStatic,
                (depotwertGesamt + aktuelleLiquiditaet) * CONFIG.THRESHOLDS.STRATEGY.minTradeAmountDynamicFactor
            ));

        if (!saleResult || (saleResult.achievedRefill < minTradeResult && !isPufferSchutzAktiv)) {
            const achieved = saleResult?.achievedRefill || 0;
            markAsBlocked('min_trade', Math.max(0, minTradeResult - achieved), {
                direction: actionDetails.title || 'Verkauf',
                title: actionDetails.title || 'Verkauf',
                netAmount: gesamterNettoBedarf
            });
            return {
                type: 'NONE',
                anweisungKlasse: 'anweisung-gruen',
                title: `${market.szenarioText} (Kein Handlungsbedarf)`,
                diagnosisEntries: actionDetails.diagnosisEntries,
                transactionDiagnostics
            };
        }

        const effektiverNettoerloes = saleResult.achievedRefill;

        if (gesamterNettoBedarf > effektiverNettoerloes + 1 && !actionDetails.isCapped) {
            actionDetails.title += ' (Cap aktiv)';
            actionDetails.isCapped = true;
        }

        // Erlös verteilen: Priorität 1: Liquidität, 2: Gold, 3: Aktien
        let erloesUebrig = effektiverNettoerloes;

        const finalLiq = Math.min(erloesUebrig, verwendungen.liquiditaet);
        erloesUebrig -= finalLiq;

        const finalGold = Math.min(erloesUebrig, verwendungen.gold);
        erloesUebrig -= finalGold;

        const finalAktien = Math.min(erloesUebrig, verwendungen.aktien);

        transactionDiagnostics.wasTriggered = true;
        transactionDiagnostics.blockReason = 'none';
        transactionDiagnostics.blockedAmount = 0;
        transactionDiagnostics.potentialTrade = {
            direction: 'Verkauf',
            title: actionDetails.title,
            netAmount: effektiverNettoerloes,
            liquidityUse: finalLiq,
            goldUse: finalGold,
            equityUse: finalAktien
        };

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
