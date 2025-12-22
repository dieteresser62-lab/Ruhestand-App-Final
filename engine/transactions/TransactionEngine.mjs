/**
 * ===================================================================
 * TRANSACTION ENGINE MODULE
 * ===================================================================
 * Bestimmt Transaktionsaktionen und berechnet Verkäufe mit Steuern
 * ===================================================================
 */
import { CONFIG } from '../config.mjs';

export const TransactionEngine = {
    /**
     * Berechnet Ziel-Liquidität basierend auf Profil und Markt
     */
    calculateTargetLiquidity: (profil, market, inflatedBedarf, input = null) => {
        // 1. Runway-Logik (Netto-Bedarf, falls man so will, aber hier wird oft Brutto verwendet)
        // Die aktuelle Implementierung nutzt Full Flex oder 50% Flex je nach Regime für die Ziel-Berechnung.
        // Das ist okay als "Runway"-Ziel.

        let calculatedTarget = 0;

        if (!profil.isDynamic) {
            calculatedTarget = (inflatedBedarf.floor + inflatedBedarf.flex) * 2;
        } else {
            const regime = CONFIG.TEXTS.REGIME_MAP[market.sKey];
            const profilMax = profil.runway[regime]?.total || profil.runway.hot_neutral.total;
            const minMonths = input?.runwayMinMonths || profil.minRunwayMonths;
            const userTarget = input?.runwayTargetMonths || profilMax;

            // Bidirektionale ATH-Skalierung
            const seiATH = market.seiATH || 1;
            let zielMonate;
            if (seiATH >= 1) {
                const aboveAthFactor = Math.min((seiATH - 1) * 5, 1);
                zielMonate = userTarget + aboveAthFactor * (profilMax - userTarget);
            } else {
                const belowAthFactor = Math.min((1 - seiATH) * 2.5, 1);
                zielMonate = userTarget - belowAthFactor * (userTarget - minMonths);
            }

            const useFullFlex = (regime === 'peak' || regime === 'hot_neutral');
            const anpassbarerBedarf = useFullFlex
                ? (inflatedBedarf.floor + inflatedBedarf.flex)
                : (inflatedBedarf.floor + 0.5 * inflatedBedarf.flex);

            calculatedTarget = (Math.max(1, anpassbarerBedarf) / 12) * zielMonate;
        }

        // 2. Mindest-Puffer (Brutto)
        // "sicherheitsPuffer" im Sinne von: Waschmaschine muss bezahlbar sein.
        // Auch wenn durch Rente monatliche Entnahme 0 ist.
        const minBufferMonths = (input && input.minCashBufferMonths !== undefined)
            ? input.minCashBufferMonths
            : 2; // Default 2 Monate

        // FIX: inflatedBedarf ist bereits um die Rente reduziert (Netto).
        // Wir brauchen hier aber den Brutto-Bedarf für den "Waschmaschinen-Puffer".
        // Daher nutzen wir die Werte aus dem Input, falls verfügbar.
        let bruttoJahresbedarf = inflatedBedarf.floor + inflatedBedarf.flex;

        if (input && (input.floorBedarf !== undefined || input.flexBedarf !== undefined)) {
            const fBedarf = Number(input.floorBedarf) || 0;
            const flexB = Number(input.flexBedarf) || 0;
            bruttoJahresbedarf = fBedarf + flexB;
        }

        const bruttoMonatsbedarf = bruttoJahresbedarf / 12;
        const absoluteBufferTarget = bruttoMonatsbedarf * minBufferMonths;

        // 3. Absolute Untergrenze (technisch)

        const minAbs = CONFIG.THRESHOLDS.STRATEGY.absoluteMinLiquidity || 0;

        // Das Maximum gewinnt
        return Math.max(calculatedTarget, absoluteBufferTarget, minAbs);
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
        // Bei kritischer Liquidität: erhöhtes Cap erlauben (10% des Aktienwerts)
        let effectiveMaxCap = isCriticalLiquidity
            ? Math.max(maxCapEuro, aktienwert * 0.10)
            : maxCapEuro;

        // ANTI-PSEUDO-ACCURACY: Auch das Cap runden (abrunden, um Limit einzuhalten)
        effectiveMaxCap = this._quantizeAmount(effectiveMaxCap, 'floor');

        // ANTI-PSEUDO-ACCURACY: Liquiditätsbedarf 'aufrunden', um glatte Summe zu erhalten
        const quantizedBedarf = this._quantizeAmount(liquiditaetsbedarf, 'ceil');

        const nettoBedarf = Math.min(quantizedBedarf, effectiveMaxCap);
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
     * Quantisiert einen Betrag gemäß Anti-Pseudo-Accuracy Regeln
     * @private
     * @param {number} amount - Der zu rundende Betrag
     * @param {string} mode - 'ceil' (Aufrunden) oder 'floor' (Abrunden)
     * @returns {number} Quantisierter Betrag
     */
    _quantizeAmount(amount, mode = 'ceil') {
        if (!CONFIG.ANTI_PSEUDO_ACCURACY.ENABLED) return amount;

        const tiers = CONFIG.ANTI_PSEUDO_ACCURACY.QUANTIZATION_TIERS;
        const tier = tiers.find(t => amount < t.limit);
        const step = tier ? tier.step : 25000;

        if (mode === 'ceil') {
            return Math.ceil(amount / step) * step;
        }
        return Math.floor(amount / step) * step;
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

        // EXTENDED DEBUGGING
        let verwendungen = { liquiditaet: 0, gold: 0, aktien: 0 };
        let minTradeResultOverride = null;
        const transactionDiagnostics = {
            wasTriggered: false,
            blockReason: 'none',
            blockedAmount: 0,
            equityThresholds: {
                targetAllocationPct: input.targetEq,
                rebalancingBandPct: input.rebalancingBand ?? input.rebalBand ?? 35,
                maxSkimPctOfEq: input.maxSkimPctOfEq ?? 1.0
            },
            goldThresholds: {
                minGoldReserve: minGold,
                targetPct: input.goldZielProzent || 0,
                maxBearRefillPctOfEq: input.maxBearRefillPctOfEq ?? 0.5
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
            // Floor-basierter Runway für Guardrail-Prüfung (konsistent mit UI-Anzeige)
            const currentFloorRunwayMonths = (floorBedarfNetto > 0)
                ? (aktuelleLiquiditaet / (floorBedarfNetto / 12))
                : Infinity;
            const aktienwert = input.depotwertAlt + input.depotwertNeu;
            const zielLiquiditaetsdeckung = (zielLiquiditaet > 0)
                ? (aktuelleLiquiditaet / zielLiquiditaet)
                : 1;
            const runwayCoverageThreshold = CONFIG.THRESHOLDS.STRATEGY.runwayCoverageMinPct || 0;
            const guardrailActivationThreshold =
                CONFIG.THRESHOLDS.STRATEGY.runwayGuardrailActivationPct
                ?? runwayCoverageThreshold
                ?? 0;

            // Regime-Prüfung für konditionierte Guardrail-Aktivierung
            const marketRegime = CONFIG.TEXTS.REGIME_MAP[market.sKey] || market.sKey;
            const isPeakRegime = marketRegime === 'peak' || marketRegime === 'hot_neutral';

            // Design-Entscheidung: Guardrail greift nur bei echten Lücken (unter Aktivierungsschwelle oder Mindest-Runway),
            // damit moderate Unterdeckungen über die reguläre Rebalancing-Logik aufgefüllt werden können.
            // Prüfe BEIDE Runways: Floor-Runway UND Gesamt-Runway
            // Floor-Runway kann irreführend hoch sein wenn Pension den Großteil des Floors deckt
            const hasFloorRunwayGap = currentFloorRunwayMonths < runwayMinThresholdMonths;
            const hasTotalRunwayGap = currentRunwayMonths < runwayMinThresholdMonths;
            const hasRunwayGap = hasFloorRunwayGap || hasTotalRunwayGap;
            const hasCoverageGap = zielLiquiditaetsdeckung < guardrailActivationThreshold;
            const monthlyBaselineNeed = (gesamtjahresbedarf / 12);
            const guardrailTargetEuro = Math.max(
                runwayMinThresholdMonths * monthlyBaselineNeed,
                runwayCoverageThreshold * zielLiquiditaet
            );
            const guardrailTargetMonths = (monthlyBaselineNeed > 0)
                ? (guardrailTargetEuro / monthlyBaselineNeed)
                : 0;
            const guardrailGapEuro = Math.max(0, guardrailTargetEuro - aktuelleLiquiditaet);
            // Peak-Regimes: KEIN Guardrail - immer Opportunistisches Rebalancing verwenden.
            // Im Peak wollen wir die gute Marktlage nutzen, um BEIDES aufzufüllen (Liquidität + Gold).
            // Gold aufschieben ist riskant, da der nächste Bär jederzeit kommen kann.
            // Nicht-Peak: Guardrail bei Coverage-Lücke oder Runway-Lücke
            const hasGuardrailGap = isPeakRegime
                ? false
                : ((hasCoverageGap || hasRunwayGap) && guardrailGapEuro > 1);

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

                    // Im Bärenmarkt: Gold-Floor auf 0 setzen
                    saleContext.minGold = 0;

                    // Sale-Budgets setzen
                    const totalEquityValue = input.depotwertAlt + input.depotwertNeu;
                    if (totalEquityValue > 0) {
                        const requiredEquitySale = Math.min(actionDetails.bedarf, totalEquityValue);
                        saleContext.saleBudgets.aktien_alt =
                            requiredEquitySale * (input.depotwertAlt / totalEquityValue);
                        saleContext.saleBudgets.aktien_neu =
                            requiredEquitySale * (input.depotwertNeu / totalEquityValue);
                    }

                    if (input.goldAktiv && input.goldWert > 0) {
                        saleContext.saleBudgets.gold = input.goldWert;
                    }

                    // Bei Guardrail-Aktivierung: Mindestschwelle deaktivieren
                    minTradeResultOverride = 0;
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

                // Bei kritischer Liquidität: Mindestschwelle deaktivieren, um RUIN durch
                // Liquiditätsmangel zu verhindern. Bei Guardrail-Aktivierung MUSS die
                // Auffüllung erfolgen, auch wenn der Betrag unter dem normalen Minimum liegt.
                if (isCriticalLiquidityFailsafe) {
                    minTradeResultOverride = 0;
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

                    // Sale-Budgets setzen um Aktien-Verkauf zu ermöglichen
                    // Bei Guardrail-Aktivierung muss genug verkauft werden können
                    const totalEquityValue = input.depotwertAlt + input.depotwertNeu;
                    if (totalEquityValue > 0) {
                        // Erlaube Verkauf bis zum Bedarf, verteilt auf beide Aktien-Tranchen
                        const requiredEquitySale = Math.min(actionDetails.bedarf, totalEquityValue);
                        saleContext.saleBudgets.aktien_alt =
                            requiredEquitySale * (input.depotwertAlt / totalEquityValue);
                        saleContext.saleBudgets.aktien_neu =
                            requiredEquitySale * (input.depotwertNeu / totalEquityValue);
                    }
                    // Gold-Budget auf verfügbaren Wert setzen (über dem Floor)
                    if (input.goldAktiv && input.goldWert > 0) {
                        const availableGold = Math.max(0, input.goldWert - (minGold || 0));
                        saleContext.saleBudgets.gold = availableGold;
                    }
                }

                // Nicht-Bärenmarkt: Opportunistisches Rebalancing
            } else if (!isBearRegimeProxy) {
                const rawLiqGap = zielLiquiditaet - aktuelleLiquiditaet;
                // ANTI-PSEUDO-ACCURACY: Liquiditätsbedarf kaufmännisch runden (Ceil)
                let liquiditaetsBedarf = Math.max(0, rawLiqGap);
                liquiditaetsBedarf = this._quantizeAmount(liquiditaetsBedarf, 'ceil');

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
                    const bandPct = (input.rebalancingBand ?? input.rebalBand ?? 35) / 100;
                    const goldUntergrenze = goldZielwert * (1 - bandPct);
                    const goldObergrenze = goldZielwert * (1 + bandPct);

                    if (input.goldWert < goldUntergrenze) {
                        goldKaufBedarf = Math.max(0, goldZielwert - input.goldWert);
                    } else if (input.goldWert > goldObergrenze) {
                        // FIX: Gold-Überschuss erkennen!
                        // Wenn Gold stark gestiegen ist (über Band), muss verkauft werden.
                        goldVerkaufBedarf = Math.max(0, input.goldWert - goldZielwert);
                    }
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
                        quantisierterBedarf = this._quantizeAmount(totalerBedarf, 'ceil');
                    }
                } else if (quantisierterBedarf > 0) {
                    // Bei Gefahr (Critical/Floor) auch runden, aber Hysterese ignorieren
                    quantisierterBedarf = this._quantizeAmount(quantisierterBedarf, 'ceil');
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
                    const minTradeGateResult = this._computeAppliedMinTradeGate({
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
                    if (input.goldAktiv && input.goldZielProzent > 0) {
                        const goldZielwert = investiertesKapital * (input.goldZielProzent / 100);
                        const bandPct = (input.rebalancingBand ?? input.rebalBand ?? 35) / 100;
                        const goldObergrenze = goldZielwert * (1 + bandPct);

                        if (input.goldWert > goldObergrenze) {
                            maxSellableFromGold = input.goldWert - goldZielwert;
                            // ANTI-PSEUDO-ACCURACY: Auch Rebalancing-Verkäufe runden (abrunden)
                            // Damit wir nicht krumme Beträge wie 40.136,63 EUR verkaufen
                            maxSellableFromGold = this._quantizeAmount(maxSellableFromGold, 'floor');
                        }
                    }
                    saleContext.saleBudgets.gold = maxSellableFromGold;
                    transactionDiagnostics.goldThresholds = {
                        ...transactionDiagnostics.goldThresholds,
                        saleBudgetGold: maxSellableFromGold,
                        rebalancingBandPct: input.rebalancingBand ?? input.rebalBand ?? 35
                    };

                    if (isNaN(maxSellableFromGold)) {
                        console.error('DEBUG: maxSellableFromGold is NaN!');
                        console.error('goldWert:', input.goldWert);
                        console.error('investiertesKapital:', investiertesKapital);
                        console.error('goldZielProzent:', input.goldZielProzent);
                    }

                    // Aktien-Verkaufsbudget berechnen
                    const aktienZielwert = investiertesKapital * (input.targetEq / 100);
                    const aktienObergrenze = aktienZielwert * (1 + ((input.rebalancingBand ?? input.rebalBand ?? 35) / 100));
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
                    if (aktienwert > 0) {
                        saleContext.saleBudgets.aktien_alt = aktienUeberschuss * (input.depotwertAlt / aktienwert);
                        saleContext.saleBudgets.aktien_neu = aktienUeberschuss * (input.depotwertNeu / aktienwert);
                    }
                    transactionDiagnostics.equityThresholds = {
                        ...transactionDiagnostics.equityThresholds,
                        saleBudgetAktienAlt: saleContext.saleBudgets.aktien_alt || 0,
                        saleBudgetAktienNeu: saleContext.saleBudgets.aktien_neu || 0
                    };

                    // ANTI-PSEUDO-ACCURACY: Liquiditätsbedarf kaufmännisch runden (Ceil)

                    // NEU: Wir runden den BRUTTO-VERKAUF, nicht den Netto-Bedarf.
                    // 1. Dry Run: Wie viel Brutto müssten wir für den exakten Netto-Bedarf verkaufen?
                    let dryRunSale = this.calculateSaleAndTax(
                        effectiveTotalerBedarf,
                        input,
                        { minGold: saleContext.minGold, saleBudgets: saleContext.saleBudgets },
                        market,
                        false // isEmergencySale
                    );

                    let bruttoTarget = dryRunSale.bruttoVerkaufGesamt;

                    // 2. Brutto-Betrag runden (Aufrunden)
                    let cleanBruttoTarget = this._quantizeAmount(bruttoTarget, 'ceil');

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
                    const goldAllocQuant = this._quantizeAmount(goldAllocRaw, 'floor');
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
            }
        }

        // Verkauf berechnen
        const gesamterNettoBedarf = actionDetails.bedarf;
        if (gesamterNettoBedarf <= 0) {
            // 6. Opportunistisches Rebalancing (Neu aus Simulator portiert)
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

                // FIX: totalWealth muss die ZIEL-Liquidität verwenden, nicht die aktuelle.
                // Sonst würde der Puffer mit in die Allokationsberechnung einfließen und investiert werden.
                // Beispiel: 225k Cash, 18k Ziel → Wir wollen nur 207k investieren, nicht 225k.
                const totalWealth = depotwertGesamt + zielLiquiditaet;

                // 1. Absolute Zielwerte berechnen
                const targetStockVal = totalWealth * (input.targetEq / 100);
                const targetGoldVal = input.goldAktiv ? totalWealth * (input.goldZielProzent / 100) : 0;

                // 2. Aktuelle Werte ermitteln
                // Da `p` (Parameter-Objekt) Zugriff auf `aktienWert` und `goldWert` hat, nutzen wir diese.
                // Falls sie im Kontext fehlen (z.B. bei Initialisierung), fallen wir auf 0 zurück.
                const currentStockVal = p.aktienWert || 0;
                const currentGoldVal = p.goldWert || 0;

                // 3. Gaps berechnen (Nur positive Gaps, wir verkaufen hier nichts, nur Kauf)
                const gapStock = Math.max(0, targetStockVal - currentStockVal);
                const gapGold = Math.max(0, targetGoldVal - currentGoldVal);
                const totalGap = gapStock + gapGold;

                // 4. Investitionsbetrag begrenzen
                // Wir investieren maximal den Surplus, aber NICHT mehr als nötig, um die Lücken zu schließen.
                let investAmountRaw = Math.min(surplus, totalGap);

                if (CONFIG.ANTI_PSEUDO_ACCURACY.ENABLED) {
                    investAmountRaw = this._quantizeAmount(investAmountRaw, 'floor');
                }

                if (investAmountRaw > 0) {
                    // 5. Aufteilung proportional zur LÜCKE (nicht zum Ziel)
                    // Wer die größte Lücke hat, kriegt am meisten.
                    const realTotalGap = gapStock + gapGold;

                    const shareStock = (realTotalGap > 0) ? gapStock / realTotalGap : 0;
                    const shareGold = (realTotalGap > 0) ? gapGold / realTotalGap : 0;

                    const goldTeilRaw = investAmountRaw * shareGold;
                    const aktienTeilRaw = investAmountRaw * shareStock;

                    // Runden und zurückgeben...
                    const goldTeil = CONFIG.ANTI_PSEUDO_ACCURACY.ENABLED
                        ? this._quantizeAmount(goldTeilRaw, 'floor')
                        : goldTeilRaw;

                    const aktienTeil = CONFIG.ANTI_PSEUDO_ACCURACY.ENABLED
                        ? this._quantizeAmount(aktienTeilRaw, 'floor')
                        : aktienTeilRaw;

                    const investAmount = goldTeil + aktienTeil;

                    if (investAmount > 0) {
                        return {
                            type: 'TRANSACTION',
                            anweisungKlasse: 'anweisung-gelb', // Standard yellow for transactions
                            title: 'Surplus Rebalancing (Opportunistisch)',
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
                                grund: 'Surplus Rebalancing (Opportunistisch)',
                                source: 'surplus'
                            },
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

            markAsBlocked('liquidity_sufficient', 0, {
                direction: 'Keine Aktion',
                title: actionDetails.title || 'Keine Aktion',
                netAmount: 0
            });
            return {
                type: 'NONE',
                anweisungKlasse: 'anweisung-gruen',
                title: `${market.szenarioText} (${actionDetails.title || 'Kein Handlungsbedarf'})`,
                diagnosisEntries: actionDetails.diagnosisEntries,
                transactionDiagnostics
            };
        }

        /* ------------------------------------------------------------------
     * INTERNE HELPER
     * ------------------------------------------------------------------ */


        let saleResult = this.calculateSaleAndTax(
            gesamterNettoBedarf,
            input,
            saleContext,
            market,
            isPufferSchutzAktiv
        );

        if (saleResult && isNaN(saleResult.achievedRefill)) {
            // Should be caught by hardening, but keeping safety check without logs
        }

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

        // Erlös verteilen: 
        // ANTI-PSEUDO-ACCURACY: Prio 1: Gold-Kauf (damit Rundung erhalten bleibt), Prio 2: Liquidität.
        let erloesUebrig = effektiverNettoerloes;

        // Wenn Gold KAUF geplant war (verwendungen.gold > 0), dann diesen zuerst bedienen,
        // damit der Betrag "glatt" bleibt (wie in 'verwendungen.gold' quantisiert).
        // Außer wir haben gar nicht genug Erlös für Gold allein (Notfall/Cap).
        const finalGold = Math.min(erloesUebrig, verwendungen.gold);
        erloesUebrig -= finalGold;

        // Den Rest in die Liquidität (absorbiert "Unrundheit" durch Steuern/Caps)
        let finalLiq = Math.min(erloesUebrig, verwendungen.liquiditaet);
        erloesUebrig -= finalLiq;

        const finalAktien = Math.min(erloesUebrig, verwendungen.aktien);
        erloesUebrig -= finalAktien;

        // Fix: Überschüssigen Erlös (z.B. durch Gold-Rebalancing) der Liquidität zuschlagen
        // Damit stimmt die Summe der Verwendungen wieder mit dem Netto-Erlös überein.
        if (erloesUebrig > 0) {
            // INFO für den User, warum das Geld in Cash fließt
            if (erloesUebrig > 1000) {
                actionDetails.diagnosisEntries.push({
                    step: 'Verwendung (Restbetrag)',
                    impact: `${erloesUebrig.toFixed(0)}€ zur Liquidität addiert, da Investitionsziele (Aktien/Gold) bereits erreicht sind.`,
                    status: 'info',
                    severity: 'info'
                });
            }
            finalLiq += erloesUebrig;
            erloesUebrig = 0;
        }

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


            // DEBUG SALE LOOP (REMOVED)

            for (const tranche of tranchesToUse) {
                // Abbruchbedingung: Wenn Netto-Bedarf gedeckt ist (Normalfall)
                // ODER: Wenn ein explizites Brutto-Ziel gesetzt ist, muss dieses erreicht werden.
                if (forceGrossSellAmount > 0) {
                    if (totalBrutto >= forceGrossSellAmount) break;
                } else {
                    if (nochZuDeckenderNettoBetrag <= 0.01) break;
                }

                let maxBruttoVerkaufbar = Number(tranche.marketValue) || 0;

                // Gold-Floor berücksichtigen
                if (tranche.kind === 'gold' && context.minGold !== undefined) {
                    const goldVal = Number(input.goldWert) || 0;
                    const minG = Number(context.minGold) || 0;
                    maxBruttoVerkaufbar = Math.max(0, goldVal - minG);
                }

                // Sale-Budget berücksichtigen
                if (context.saleBudgets && context.saleBudgets[tranche.kind] !== undefined) {
                    const budget = Number(context.saleBudgets[tranche.kind]);
                    // Only apply budget if it's a valid number, assume 0 if NaN (conservative)
                    maxBruttoVerkaufbar = Math.min(maxBruttoVerkaufbar, isNaN(budget) ? 0 : budget);
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

        return _calculateSingleSale(requestedRefill, input.sparerPauschbetrag || 0, orderedTranches);
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
                return (gqA * (1 - (tA.tqf || 0))) - (gqB * (1 - (tB.tqf || 0)));
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
export default TransactionEngine;
