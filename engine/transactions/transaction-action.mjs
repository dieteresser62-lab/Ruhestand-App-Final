/**
 * Module: Transaction Action
 * Purpose: Determines the best financial move (Action) based on market and portfolio state.
 *          Decides between Emergency Sale, Opportunistic Rebalancing, or Surplus Investment.
 * Usage: Core decision making logic for transactions.
 * Dependencies: transaction-opportunistic.mjs, transaction-surplus.mjs, config.mjs
 */
import { CONFIG } from '../config.mjs';
import { buildOpportunisticRefill } from './transaction-opportunistic.mjs';
import { trySurplusRebalance } from './transaction-surplus.mjs';

export function determineAction(p, helpers) {
    const {
        calculateSaleAndTax,
        computeAppliedMinTradeGate,
        computeCappedRefill,
        quantizeAmount
    } = helpers;
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
            rebalancingBandPct: input.rebalBand ?? input.rebalancingBand ?? 35,
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
    // Kritischer Floor-Mangel: Wenn wir weniger als den vollen Jahres-Floor auf dem Konto haben.
    // In diesem Fall erlauben wir auch kleine Verkäufe (ignorieren MinTrade), um die Zahlungsfähigkeit zu sichern.
    const isCriticalFloorShortfall = aktuelleLiquiditaet < floorBedarfNetto;
    if (isCriticalFloorShortfall) {
        minTradeResultOverride = 0;
    }

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
        // AUSNAHME: Bei extrem kritischer Liquidität (unter absolutem Minimum oder < 25% Deckung)
        // muss der Guardrail trotzdem greifen, um Liquiditätsengpass zu verhindern.
        const absoluteMinLiq = CONFIG.THRESHOLDS.STRATEGY.absoluteMinLiquidity || 10000;
        const isCriticalLiquidityForGuardrail =
            aktuelleLiquiditaet < absoluteMinLiq ||
            zielLiquiditaetsdeckung < 0.25;
        // Nicht-Peak: Guardrail bei Coverage-Lücke oder Runway-Lücke
        const hasGuardrailGap = (isPeakRegime && !isCriticalLiquidityForGuardrail)
            ? false
            : ((hasCoverageGap || hasRunwayGap) && guardrailGapEuro > 1);

        if (isBearRegimeProxy && hasGuardrailGap) {
            // FIX: isCriticalLiquidity muss AUCH Runway% berücksichtigen, nicht nur absoluten Puffer.
            // Bei hoher Rentendeckung ist sicherheitsPuffer klein, aber 72% Runway ist trotzdem kritisch.
            // Die runwayCoverageThreshold (75%) ist der Standard für "sicher", darunter sollte das Cap angehoben werden.
            const isCriticalLiquidityBear =
                aktuelleLiquiditaet < (sicherheitsPuffer * 1.5) ||
                zielLiquiditaetsdeckung < runwayCoverageThreshold;

            const bearRefill = computeCappedRefill({
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

                // Im Bärenmarkt: Gold-Floor ignorieren um Notverkauf zu ermöglichen
                saleContext.minGold = 0;
                saleContext.ignoreGoldFloor = true;

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

            const minTradeGateResult = computeAppliedMinTradeGate({
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

            const neutralRefill = computeCappedRefill({
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

                // Bei kritischer Liquidität: Gold-Floor ignorieren, um Notverkauf zu ermöglichen
                if (isCriticalLiquidityFailsafe) {
                    saleContext.ignoreGoldFloor = true;
                    saleContext.minGold = 0;
                }

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
                // Gold-Budget setzen: Bei kritischer Liquidität volles Gold verfügbar,
                // sonst nur der Teil über dem Floor
                if (input.goldAktiv && input.goldWert > 0) {
                    const availableGold = isCriticalLiquidityFailsafe
                        ? input.goldWert
                        : Math.max(0, input.goldWert - (minGold || 0));
                    saleContext.saleBudgets.gold = availableGold;
                }
            }

            // Nicht-Bärenmarkt: Opportunistisches Rebalancing
        } else if (!isBearRegimeProxy) {
            const opportunisticResult = buildOpportunisticRefill({
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
            });
            actionDetails = opportunisticResult.actionDetails;
            verwendungen = opportunisticResult.verwendungen;
            minTradeResultOverride = opportunisticResult.minTradeResultOverride;
        }
    }

    // Verkauf berechnen
    const gesamterNettoBedarf = actionDetails.bedarf;
    if (gesamterNettoBedarf <= 0) {
        const surplusResult = trySurplusRebalance({
            aktuelleLiquiditaet,
            zielLiquiditaet,
            depotwertGesamt,
            market,
            input,
            investiertesKapital,
            quantizeAmount,
            transactionDiagnostics
        });
        if (surplusResult) {
            return surplusResult;
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
            zielLiquiditaet, // FIX: Expose target liquidity
            diagnosisEntries: actionDetails.diagnosisEntries,
            transactionDiagnostics
        };
    }

    let saleResult = calculateSaleAndTax(
        gesamterNettoBedarf,
        input,
        saleContext,
        market,
        isPufferSchutzAktiv
    );

    if (saleResult && isNaN(saleResult.achievedRefill)) {
        // Should be caught by hardening, but keeping safety check without logs
    }

    // Bei Notfall-Verkäufen (Puffer-Schutz) ODER kritischem Floor-Mangel keine minTrade-Schwelle anwenden
    // (Nutze oben deklarierte Variable isCriticalFloorShortfall)

    const minTradeResult = (isPufferSchutzAktiv || isCriticalFloorShortfall)
        ? 0
        : (minTradeResultOverride ?? Math.max(
            CONFIG.THRESHOLDS.STRATEGY.minTradeAmountStatic,
            (depotwertGesamt + aktuelleLiquiditaet) * CONFIG.THRESHOLDS.STRATEGY.minTradeAmountDynamicFactor
        ));

    if (!saleResult || (saleResult.achievedRefill < minTradeResult && !isPufferSchutzAktiv && !isCriticalFloorShortfall)) {
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
            zielLiquiditaet, // FIX: Expose target liquidity
            diagnosisEntries: actionDetails.diagnosisEntries,
            transactionDiagnostics
        };
    }

    const effektiverNettoerloes = saleResult.achievedRefill;

    if (saleResult?.breakdown && Array.isArray(saleResult.breakdown)) {
        transactionDiagnostics.selectedTranches = saleResult.breakdown
            .filter(item => item && item.kind && item.kind !== 'liquiditaet')
            .map(item => {
                const brutto = Number(item.brutto) || 0;
                const steuer = Number(item.steuer) || 0;
                const taxPerEuro = brutto > 0 ? (steuer / brutto) : 0;
                return {
                    kind: item.kind,
                    name: item.name || null,
                    trancheId: item.trancheId || null,
                    brutto,
                    steuer,
                    taxPerEuro
                };
            });
    }

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
        zielLiquiditaet, // FIX: Expose target liquidity
        diagnosisEntries: actionDetails.diagnosisEntries,
        transactionDiagnostics
    };
}
