"use strict";

import { shortenReasonText } from './simulator-utils.js';
import { HISTORICAL_DATA, PFLEGE_GRADE_PROBABILITIES, PFLEGE_GRADE_LABELS, PFLEGE_GRADE_PROGRESSION_PROBABILITIES, SUPPORTED_PFLEGE_GRADES, annualData, REGIME_DATA, REGIME_TRANSITIONS, MORTALITY_TABLE } from './simulator-data.js';
import {
    computeYearlyPension, computePensionNext, initializePortfolio, applySaleToPortfolio, summarizeSalesByAsset,
    buildInputsCtxFromPortfolio, sumDepot, buyGold, buyStocksNeu
} from './simulator-portfolio.js';
import { resolveProfileKey } from './simulator-heatmap.js';

/**
 * FAIL-SAFE Liquidity Guard - Hilfsfunktionen
 */

/**
 * Stellt sicher, dass ein Wert eine nicht-negative Zahl ist
 * @param {*} x - Eingabewert
 * @returns {number} Wert >= 0
 */
function euros(x) {
    return Math.max(0, Number(x) || 0);
}

/**
 * Berechnet die benötigte Liquidität für den Floor-Bedarf.
 * Akzeptiert einen explizit auf 0 gesetzten `inflatedFloor` (z. B. wenn Renten den Floor vollständig decken)
 * und fällt nur bei null/undefined auf den ursprünglichen Startwert zurück.
 * @param {Object} ctx - Kontext mit inputs und state
 * @returns {number} Benötigte Liquidität in €
 */
function computeLiqNeedForFloor(ctx) {
    /**
     * Design-Entscheidung: `inflatedFloor` kann bewusst 0 sein, wenn die Rente den Floor vollständig deckt.
     * Wir dürfen diesen Wert nicht per `||` auf den Start-Floor zurücksetzen, sonst erzwingen wir unnötig
     * Liquidität (Fail-Safe-Guard würde fälschlich verkaufen). Deshalb prüfen wir explizit auf null/undefined
     * und akzeptieren 0 als gültigen Wert. Negative Eingaben werden auf 0 gekappt.
     */
    const hasInflatedFloor = ctx.inflatedFloor !== undefined && ctx.inflatedFloor !== null;
    const normalizedStartFloor = euros(ctx.inputs?.startFloorBedarf ?? 0);
    const floorBasis = hasInflatedFloor ? euros(ctx.inflatedFloor) : normalizedStartFloor;

    // Wenn der (netto) Floor bereits vollständig durch Renten gedeckt ist, darf die Guard keinen Bedarf erzeugen.
    if (hasInflatedFloor && floorBasis === 0) {
        return 0;
    }

    // Berechne monatlichen Floor-Bedarf (netto nach Rente) und stelle sicher, dass negative/NaN-Werte abgefangen werden.
    const floorMonthlyNet = euros(Number(floorBasis) / 12);

    // Ziel-Runway in Monaten (Standard: 12, kann über runwayTargetMonths konfiguriert werden). Fällt bei ungültigen Werten auf 12 zurück.
    const runwayTargetMonths = Number.isFinite(ctx?.inputs?.runwayTargetMonths) ? ctx.inputs.runwayTargetMonths : 12;
    const runwayTargetSafe = runwayTargetMonths > 0 ? runwayTargetMonths : 12;

    // Endgültiger Liquiditätsbedarf als nicht-negative Zahl.
    return euros(runwayTargetSafe * floorMonthlyNet);
}

/**
 * Berechnet die Liquidität nach der Action-Phase robust gegen fehlende Adapter-Felder.
 * Falls der Adapter (liqNachTransaktion) keinen Zielwert liefert, werden geplante
 * Liquiditätszuflüsse aus Verkäufen und sonstigen Verwendungen additiv auf den aktuellen
 * Stand aufgeschlagen. Dadurch gehen reale Verkäufe nicht im Nirwana verloren.
 * @param {number} currentLiquidity - Liquidität vor der Action-Phase.
 * @param {object} actionResult - Ergebnisobjekt der Action-Phase (kann Teilfelder weglassen).
 * @param {object|null} saleResult - Normiertes SaleResult mit achievedRefill.
 * @returns {number} Liquidität nach allen Transaktionen.
 */
function computeLiquidityAfterAction(currentLiquidity, actionResult, saleResult) {
    // Primärpfad: Der Adapter liefert einen fertigen Zielwert (z. B. { total: 123 }).
    const adapterValue = actionResult?.liqNachTransaktion;
    if (adapterValue !== undefined && adapterValue !== null) {
        const numericAdapterValue = typeof adapterValue === 'number'
            ? adapterValue
            : (typeof adapterValue.total === 'number' ? adapterValue.total : NaN);
        if (Number.isFinite(numericAdapterValue)) {
            return euros(numericAdapterValue);
        }
    }

    // Fallback: Additive Berechnung aus aktuellem Stand + geplante Zuflüsse.
    const plannedLiquidity = Number.isFinite(actionResult?.verwendungen?.liquiditaet)
        ? actionResult.verwendungen.liquiditaet
        : 0;
    const saleRefill = Number.isFinite(saleResult?.achievedRefill)
        ? saleResult.achievedRefill
        : 0;

    // Design-Entscheidung: Wir addieren nur Zuflüsse; Abflüsse werden bereits in der
    // Spending-Phase berücksichtigt. Negative Eingaben werden defensiv gekappt.
    return euros(currentLiquidity + euros(plannedLiquidity) + euros(saleRefill));
}

/**
 * Stellt sicher, dass simulateOneYear immer valide Haushaltsdaten erhält.
 * @param {object|null} context - Rohdaten zum Haushaltsstatus (kann null sein).
 * @returns {{p1Alive:boolean,p2Alive:boolean,widowBenefits:{p1FromP2:boolean,p2FromP1:boolean}}}
 */
function normalizeHouseholdContext(context) {
    const defaultContext = {
        p1Alive: true,
        p2Alive: true,
        widowBenefits: {
            p1FromP2: false,
            p2FromP1: false
        }
    };
    if (!context) return defaultContext;
    return {
        p1Alive: context.p1Alive !== false,
        p2Alive: context.p2Alive !== false,
        widowBenefits: {
            p1FromP2: !!context?.widowBenefits?.p1FromP2,
            p2FromP1: !!context?.widowBenefits?.p2FromP1
        }
    };
}

/**
 * Verkauft Assets für Cash ohne Regelprüfungen (FAIL-SAFE Mode).
 * Rückgabe enthält zusätzlich das detaillierte SaleResult, damit
 * Notverkäufe im Jahres-Log erfasst werden können.
 * @param {Object} portfolio - Portfolio-Objekt.
 * @param {Object} inputsCtx - Inputs-Context für Steuerberechnung.
 * @param {Object} market - Marktkontext.
 * @param {string} asset - 'gold' oder 'equity'.
 * @param {number} amountEuros - Zielbetrag in €.
 * @param {number} minGold - Minimaler Gold-Bestand.
 * @returns {Object} { cashGenerated, taxesPaid, saleResult }
 */
function sellAssetForCash(portfolio, inputsCtx, market, asset, amountEuros, minGold, engine) {
    if (amountEuros <= 0) {
        return { cashGenerated: 0, taxesPaid: 0, saleResult: null };
    }

    let cashGenerated = 0;
    let taxesPaid = 0;
    let saleResult = null;

    if (asset === 'gold') {
        const goldWert = sumDepot({ depotTranchesGold: portfolio.depotTranchesGold });
        const availableGold = Math.max(0, goldWert - minGold);
        const targetSale = Math.min(amountEuros, availableGold);

        if (targetSale > 0) {
            // Create modified context that only allows gold sales
            // by setting equity values to 0
            const goldOnlyCtx = {
                ...inputsCtx,
                depotwertAlt: 0,
                depotwertNeu: 0,
                costBasisAlt: 0,
                costBasisNeu: 0
            };
            const { saleResult: forcedSaleResult } = engine.calculateSaleAndTax(
                targetSale,
                goldOnlyCtx,
                { minGold: minGold },
                market
            );

            if (forcedSaleResult && forcedSaleResult.achievedRefill > 0) {
                applySaleToPortfolio(portfolio, forcedSaleResult);
                cashGenerated = forcedSaleResult.achievedRefill;
                taxesPaid = forcedSaleResult.steuerGesamt || 0;
                saleResult = forcedSaleResult;
            }
        }
    } else if (asset === 'equity') {
        const equityWert = sumDepot({ depotTranchesAktien: portfolio.depotTranchesAktien });
        const targetSale = Math.min(amountEuros, equityWert);

        if (targetSale > 0) {
            // Create modified context that only allows equity sales
            // by setting gold values to 0
            const equityOnlyCtx = {
                ...inputsCtx,
                goldWert: 0,
                goldCost: 0
            };
            const { saleResult: forcedSaleResult } = engine.calculateSaleAndTax(
                targetSale,
                equityOnlyCtx,
                { minGold: 0 },
                market
            );

            if (forcedSaleResult && forcedSaleResult.achievedRefill > 0) {
                applySaleToPortfolio(portfolio, forcedSaleResult);
                cashGenerated = forcedSaleResult.achievedRefill;
                taxesPaid = forcedSaleResult.steuerGesamt || 0;
                saleResult = forcedSaleResult;
            }
        }
    }

    return { cashGenerated: euros(cashGenerated), taxesPaid: euros(taxesPaid), saleResult };
}

/**
 * Simuliert ein Jahr des Ruhestandsszenarios
 * @param {Object} currentState - Aktuelles Portfolio und Marktstatus
 * @param {Object} inputs - Benutzereingaben und Konfiguration
 * @param {Object} yearData - Marktdaten für das Jahr
 * @param {number} yearIndex - Index des Simulationsjahres
 * @param {Object} pflegeMeta - Pflege-Metadata (optional)
 * @param {number} careFloorAddition - Zusätzlicher Floor-Bedarf durch Pflege (optional, wird nicht inflationsangepasst)
 * @param {Object|null} householdContext - Haushaltsstatus (wer lebt noch, Witwenrenten-Flags)
 * @param {number} temporaryFlexFactor - Temporärer Faktor (0..1) zur Reduktion des Flex-Budgets in diesem Jahr (z.B. durch Pflegekosten)
 * @param {Object|null} engineAPI - Explizit injizierte Engine-API. Falls nicht gesetzt, wird versucht,
 *                                  eine globale EngineAPI zu finden.
 * @returns {Object} Simulationsergebnisse
 */
export function simulateOneYear(currentState, inputs, yearData, yearIndex, pflegeMeta = null, careFloorAddition = 0, householdContext = null, temporaryFlexFactor = 1.0, engineAPI = null) {
    // Falls engineAPI nicht übergeben wurde (Legacy-Support), Fallback auf global registrierte EngineAPI.
    // Headless/Worker-Kontexte müssen explizit injizieren, damit versehentlich fehlende Abhängigkeiten
    // sofort auffallen und Tests eine klare Fehlermeldung erhalten.
    const globalEngine = (typeof window !== 'undefined')
        ? (window.EngineAPI || null)
        : null;
    const engine = engineAPI || globalEngine;

    if (!engine) {
        throw new Error("Critical: No Engine API available in simulateOneYear. Pass it as argument or ensure global scope.");
    }
    let {
        portfolio,
        baseFloor,
        baseFlex,
        lastState,
        currentAnnualPension,
        currentAnnualPension2,
        marketDataHist,
        widowPensionP1 = 0,
        widowPensionP2 = 0
    } = currentState;

    // WICHTIG: Pflegekosten werden nur für die Jahresberechnung zum Floor addiert,
    // aber NICHT in den persistenten baseFloor eingerechnet, der mit Inflation angepasst wird
    const effectiveBaseFloor = baseFloor + careFloorAddition;
    currentAnnualPension2 = currentAnnualPension2 || 0;
    widowPensionP1 = Math.max(0, widowPensionP1 || 0);
    widowPensionP2 = Math.max(0, widowPensionP2 || 0);
    const householdCtx = normalizeHouseholdContext(householdContext);
    const { p1Alive, p2Alive, widowBenefits } = householdCtx;

    let { depotTranchesAktien, depotTranchesGold } = portfolio;
    let liquiditaet = portfolio.liquiditaet;
    // Neue Log-Felder: Wir erfassen den Cash-Stand vor Zinsen, die daraus erzielten Zinsen
    // sowie den Cash-Stand nach Verzinsung. So lässt sich nachvollziehen, wie Liquidität
    // ohne Verkäufe anwächst. Alle Werte werden defensiv normalisiert.
    let liqStartVorZins = euros(liquiditaet);
    let cashZinsen = 0;
    let liqNachZins = liqStartVorZins;
    let totalTaxesThisYear = 0;

    const rA = isFinite(yearData.rendite) ? yearData.rendite : 0;
    const rG = isFinite(yearData.gold_eur_perf) ? yearData.gold_eur_perf / 100 : 0;
    const rC = isFinite(yearData.zinssatz) ? yearData.zinssatz / 100 : 0;

    // Optimiert: for-Loop statt forEach für bessere Performance
    for (let i = 0; i < depotTranchesAktien.length; i++) {
        depotTranchesAktien[i].marketValue *= (1 + rA);
    }
    for (let i = 0; i < depotTranchesGold.length; i++) {
        depotTranchesGold[i].marketValue *= (1 + rG);
    }

    const resolvedCapeRatio = resolveCapeRatio(yearData.capeRatio, inputs.marketCapeRatio, marketDataHist.capeRatio);
    const marketDataCurrentYear = { ...marketDataHist, inflation: yearData.inflation, capeRatio: resolvedCapeRatio };

    const algoInput = { ...inputs, floorBedarf: effectiveBaseFloor, flexBedarf: baseFlex, startSPB: inputs.startSPB };
    const market = engine.analyzeMarket(marketDataCurrentYear);

    // ==========================================
    // ANSPARPHASE-LOGIK
    // ==========================================
    const isAccumulationYear = inputs.accumulationPhase?.enabled && yearIndex < (inputs.transitionYear || 0);

    if (isAccumulationYear) {
        // In der Ansparphase: Sparrate hinzufügen, keine Entnahmen
        let sparrateThisYear = inputs.accumulationPhase.sparrate * 12;

        // Indexierung der Sparrate basierend auf VORJAHRES-Wert (kumulativ)
        if (inputs.accumulationPhase.sparrateIndexing === 'inflation' && currentState.accumulationState) {
            // Verwende die Sparrate vom letzten Jahr und indexiere mit aktueller Inflation
            const lastYearSparrate = currentState.accumulationState.sparrateThisYear || (inputs.accumulationPhase.sparrate * 12);
            sparrateThisYear = lastYearSparrate * (1 + yearData.inflation / 100);
        } else if (inputs.accumulationPhase.sparrateIndexing === 'wage' && currentState.accumulationState) {
            // Verwende die Sparrate vom letzten Jahr und indexiere mit Lohnentwicklung
            const lastYearSparrate = currentState.accumulationState.sparrateThisYear || (inputs.accumulationPhase.sparrate * 12);
            const wageGrowth = yearData.lohn || 2.0; // Fallback 2%
            sparrateThisYear = lastYearSparrate * (1 + wageGrowth / 100);
        }

        // Shadow Pension Tracking during Accumulation:
        // Auch in der Ansparphase müssen die Rentenansprüche (Shadow Pensions) indexiert werden,
        // damit sie zum Renteneintritt die korrekte Kaufkraft/Nominalhöhe haben.
        const rentAdjPct = inputs.rentAdjPct || 0;
        const currentP1 = currentState.currentAnnualPension || 0;
        const currentP2 = currentState.currentAnnualPension2 || 0;
        // Indexieren für das NÄCHSTE Jahr
        const nextP1 = currentP1 * (1 + rentAdjPct / 100);
        const nextP2 = currentP2 * (1 + rentAdjPct / 100);


        // Zinsen auf Liquidität
        cashZinsen = euros(liquiditaet * rC);
        liquiditaet += cashZinsen;
        liqNachZins = euros(liquiditaet);

        // Sparrate zur Liquidität hinzufügen
        liquiditaet += sparrateThisYear;

        // Rebalancing: Überschüssige Liquidität investieren
        const zielLiquiditaet = inputs.zielLiquiditaet || 0;
        const ueberschuss = liquiditaet - zielLiquiditaet;

        let kaufAktTotal = 0;
        let kaufGldTotal = 0;

        if (ueberschuss > 500) {
            // Investiere nach Zielallokation
            const targetEq = inputs.targetEq || 60;
            const goldZielProzent = inputs.goldAktiv ? (inputs.goldZielProzent || 0) : 0;

            const aktienAnteil = (targetEq / 100);
            const goldAnteil = (goldZielProzent / 100);
            const gesamtAnteil = aktienAnteil + goldAnteil;

            if (gesamtAnteil > 0) {
                const aktienBetrag = ueberschuss * (aktienAnteil / gesamtAnteil);
                const goldBetrag = ueberschuss * (goldAnteil / gesamtAnteil);

                if (aktienBetrag > 0) {
                    buyStocksNeu(portfolio, aktienBetrag);
                    liquiditaet -= aktienBetrag;
                    kaufAktTotal = aktienBetrag;
                }
                if (goldBetrag > 0 && inputs.goldAktiv) {
                    buyGold(portfolio, goldBetrag);
                    liquiditaet -= goldBetrag;
                    kaufGldTotal = goldBetrag;
                }
            }
        }

        portfolio.liquiditaet = euros(liquiditaet);

        // Update Accumulation State
        const newAccumulationState = currentState.accumulationState ? {
            yearsSaved: currentState.accumulationState.yearsSaved + 1,
            totalContributed: euros(currentState.accumulationState.totalContributed + sparrateThisYear),
            sparrateThisYear: euros(sparrateThisYear)
        } : null;

        // Inflation-Anpassung für nächstes Jahr
        const naechsterBaseFloor = euros(baseFloor * (1 + yearData.inflation / 100));
        const naechsterBaseFlex = euros(baseFlex * (1 + yearData.inflation / 100));

        // Update Market History für nächstes Jahr
        const marketEnd = yearData.jahr ? (HISTORICAL_DATA[yearData.jahr]?.msci_eur || marketDataHist.endeVJ) : marketDataHist.endeVJ;
        const newAth = Math.max(marketDataHist.ath, marketEnd);
        const jahreSeitAth = (marketEnd < newAth) ? marketDataHist.jahreSeitAth + 1 : 0;

        const newMarketDataHist = {
            endeVJ: marketEnd,
            endeVJ_1: marketDataHist.endeVJ,
            endeVJ_2: marketDataHist.endeVJ_1,
            endeVJ_3: marketDataHist.endeVJ_2,
            ath: newAth,
            jahreSeitAth: jahreSeitAth,
            inflation: yearData.inflation,
            capeRatio: resolvedCapeRatio
        };

        const depotwertGesamt = sumDepot(portfolio);
        const totalWealth = depotwertGesamt + portfolio.liquiditaet;
        const wertAktien = sumDepot({ depotTranchesAktien: portfolio.depotTranchesAktien });
        const wertGold = sumDepot({ depotTranchesGold: portfolio.depotTranchesGold });

        return {
            newState: {
                portfolio,
                baseFloor: naechsterBaseFloor,
                baseFlex: naechsterBaseFlex,
                lastState: null,
                currentAnnualPension: nextP1,
                currentAnnualPension2: nextP2,
                marketDataHist: newMarketDataHist,
                samplerState: currentState.samplerState,
                widowPensionP1: 0,
                widowPensionP2: 0,
                accumulationState: newAccumulationState,
                transitionYear: currentState.transitionYear
            },
            totalTaxesThisYear: 0, // Fix für NaN im Backtest: Steuern explizit zurückgeben
            logData: {
                jahr: yearIndex + 1,  // WICHTIG: Simulationsjahr, nicht historisches Jahr!
                histJahr: yearData.jahr,
                alter: inputs.startAlter + yearIndex,
                inflation: yearData.inflation,
                entscheidung: {
                    kuerzungProzent: 0,
                    monatlicheEntnahme: 0,
                    jahresEntnahme: 0,
                    kuerzungQuelle: 'none',
                    flexRate: 1.0,
                    runwayMonths: Infinity
                },
                FlexRatePct: 1.0,
                CutReason: 'none',
                Alarm: false,
                Regime: 'accumulation',
                QuoteEndPct: 0,
                RunwayCoveragePct: (zielLiquiditaet > 0 ? (portfolio.liquiditaet / zielLiquiditaet) * 100 : Infinity),
                RealReturnEquityPct: ((1 + rA) / (1 + yearData.inflation / 100) - 1),
                RealReturnGoldPct: ((1 + rG) / (1 + yearData.inflation / 100) - 1),
                entnahmequote: 0,
                steuern_gesamt: 0,
                vk: { vkAkt: 0, vkGld: 0, stAkt: 0, stGld: 0, vkGes: 0, stGes: 0 },
                kaufAkt: euros(kaufAktTotal),
                kaufGld: euros(kaufGldTotal),
                wertAktien: euros(wertAktien),
                wertGold: euros(wertGold),
                liquiditaet: euros(portfolio.liquiditaet),
                liqStart: euros(liqStartVorZins),
                cashInterestEarned: euros(cashZinsen),
                liqEnd: euros(liqNachZins),
                aktionUndGrund: `Sparrate: ${euros(sparrateThisYear)}€ / Kauf A: ${euros(kaufAktTotal)}€ / Kauf G: ${euros(kaufGldTotal)}€`,
                usedSPB: 0,
                floor_brutto: 0,
                pension_annual: 0,
                rente1: 0,
                rente2: 0,
                renteSum: 0,
                floor_aus_depot: 0,
                flex_brutto: 0,
                flex_erfuellt_nominal: 0,
                inflation_factor_cum: 1,
                jahresentnahme_real: 0,
                pflege_aktiv: false,
                pflege_zusatz_floor: 0,
                pflege_zusatz_floor_delta: 0,
                pflege_flex_faktor: 1,
                pflege_kumuliert: 0,
                pflege_grade: null,
                pflege_grade_label: '',
                pflege_delta_flex: 0,
                WidowBenefitP1: 0,
                WidowBenefitP2: 0,
                NeedLiq: 0,
                GuardGold: 0,
                GuardEq: 0,
                GuardNote: 'accumulation_phase',
                Person1Alive: householdCtx.p1Alive ? 1 : 0,
                Person2Alive: householdCtx.p2Alive ? 1 : 0,
                pflege_floor_anchor: 0,
                pflege_maxfloor_anchor: 0,
                pflege_cap_zusatz: 0,
                CareP1_Active: 0,
                CareP1_Cost: 0,
                CareP1_Grade: null,
                CareP1_GradeLabel: '',
                CareP2_Active: 0,
                CareP2_Cost: 0,
                CareP2_Grade: null,
                CareP2_GradeLabel: ''
            }
        };
    }

    // ==========================================
    // ENTNAHMEPHASE-LOGIK (wie bisher)
    // ==========================================

    // Gemeinsame Rentenanpassung (% p.a.) für beide Personen
    const rentAdjPct = inputs.rentAdjPct || 0;

    // Rente Person 1 - Neue Logik: Zustandsbasiert (Shadow Pension)
    const currentAgeP1 = inputs.startAlter + yearIndex;
    const r1StartOffsetYears = Math.max(0, Number(inputs.renteStartOffsetJahre) || 0);
    let rente1BruttoEigen = 0;
    let widowBenefitP1ThisYear = 0;

    // Wir nutzen den indexierten Wert aus dem State. 
    // Falls das aktuelle Jahr >= Startjahr ist, wird ausgezahlt.
    if (p1Alive && yearIndex >= r1StartOffsetYears) {
        rente1BruttoEigen = currentAnnualPension;
    }

    if (p1Alive && widowBenefits.p1FromP2) {
        widowBenefitP1ThisYear = widowPensionP1;
    }

    const rente1_brutto = rente1BruttoEigen + widowBenefitP1ThisYear;
    const rente1 = rente1_brutto;

    // Rente Person 2 (Partner)
    let rente2BruttoEigen = 0;
    let widowBenefitP2ThisYear = 0;
    let rente2_brutto = 0;
    let rente2 = 0;

    if (inputs.partner?.aktiv && p2Alive) {
        const partnerStartOffsetYears = Math.max(0, Number(inputs.partner.startInJahren) || 0);
        if (yearIndex >= partnerStartOffsetYears) {
            rente2BruttoEigen = currentAnnualPension2;

            /**
             * Steuerberechnung für Person 2 (Partner-Rente)
             * (Vereinfachte Methode via Steuerquote)
             */
            if (inputs.partner.steuerquotePct > 0) {
                rente2 = rente2BruttoEigen * (1 - inputs.partner.steuerquotePct / 100);
            } else {
                rente2 = rente2BruttoEigen;
            }
            rente2 = Math.max(0, rente2);
        }
    }

    if (p2Alive && widowBenefits.p2FromP1) {
        widowBenefitP2ThisYear = widowPensionP2;
    }

    rente2_brutto = rente2BruttoEigen + widowBenefitP2ThisYear;
    if (widowBenefitP2ThisYear > 0) {
        rente2 += widowBenefitP2ThisYear;
    }

    // Gesamtrente (renteSum)
    const renteSum = rente1 + rente2;
    const pensionAnnual = renteSum;

    const pensionSurplus = Math.max(0, pensionAnnual - effectiveBaseFloor);
    const inflatedFloor = Math.max(0, effectiveBaseFloor - pensionAnnual);
    // Apply pension surplus to flex expenses (Re-applied Fix)
    // Apply temporary flex factor here - ONLY for the current year's budget
    const inflatedFlex = Math.max(0, (baseFlex * temporaryFlexFactor) - pensionSurplus);

    const jahresbedarfAusPortfolio = inflatedFloor + inflatedFlex;
    const runwayMonths = jahresbedarfAusPortfolio > 0 ? (liquiditaet / (jahresbedarfAusPortfolio / 12)) : Infinity;

    const profileKey = resolveProfileKey(algoInput.risikoprofil, engine);
    let profile = engine.CONFIG.PROFIL_MAP[profileKey];

    if (!profile) {
        const fallbackKey = Object.keys(engine.CONFIG.PROFIL_MAP)[0];
        profile = engine.CONFIG.PROFIL_MAP[fallbackKey];
    }

    // SAFEGUARE: Ensure target liquidity never drops below 6 months of TARGET GROSS floor (input)
    // This handles both the "Liquidity Trap" (Low Net Need) and "Accumulation Phase" (0 effective Floor),
    // ensuring we enter retirement or shocks with a cash buffer.
    let zielLiquiditaet = engine.calculateTargetLiquidity(profile, market, { floor: inflatedFloor, flex: inflatedFlex }, null, null, inputs);

    // Use algoInput.floorBedarf because in Accumulation, effectiveBaseFloor is 0.
    const safeMinLiquidity = (algoInput.floorBedarf / 12) * 6;
    if (zielLiquiditaet < safeMinLiquidity) {
        zielLiquiditaet = safeMinLiquidity;
    }

    const depotwertGesamt = sumDepot(portfolio);
    const totalWealth = depotwertGesamt + liquiditaet;

    const inputsCtx = buildInputsCtxFromPortfolio(algoInput, portfolio, { pensionAnnual, marketData: marketDataCurrentYear });



    // EngineAPI erwartet ein gebündeltes Bedarf-Objekt; separate Felder führen zu undefinierten Werten
    // im SpendingPlanner. Deshalb legen wir die Struktur explizit an und übergeben sie unverändert weiter.
    const inflatedBedarf = { floor: inflatedFloor, flex: inflatedFlex };
    const spendingResponse = engine.determineSpending({
        // Behalte Legacy-Felder für den V30-Adapter bei, damit Headless-Tests weiterhin darauf zugreifen können
        inflatedFloor,
        inflatedFlex,
        runwayMonths,
        liquidNow: liquiditaet,
        profile,
        depotValue: depotwertGesamt,
        inputsCtx,
        totalWealth,
        // Neue EngineAPI-Signatur
        market,
        lastState,
        inflatedBedarf,
        runwayMonate: runwayMonths,
        profil: profile,
        depotwertGesamt: depotwertGesamt,
        gesamtwert: totalWealth,
        renteJahr: pensionAnnual,
        input: algoInput
    });

    // FAIL-SAFE: Check if engine returned error or null spendingResult
    if (spendingResponse.error || !spendingResponse.spendingResult) {
        console.error('Engine error in determineSpending:', spendingResponse.error);
        return { isRuin: true, error: spendingResponse.error };
    }

    const { spendingResult, newState: spendingNewState } = spendingResponse;

    // Design-Entscheidung: Die Action-Phase arbeitet auf derselben Input-Struktur wie der Core, damit
    // Rebalancing/Verkaufslogik konsistente Schwellen (Band, Gold-Floor, Runway) verwenden kann.
    const results = {
        aktuelleLiquiditaet: liquiditaet,
        depotwertGesamt,
        zielLiquiditaet,
        gesamtwert: totalWealth,
        inflatedFloor,
        grossFloor: baseFloor,
        spending: spendingResult,
        market,
        profil: profile,
        input: algoInput,
        minGold: algoInput.goldAktiv ? (algoInput.goldFloorProzent / 100) * totalWealth : 0
    };
    const actionResult = engine.determineAction(results, inputsCtx);

    // FAIL-SAFE: Check if engine returned error in action determination
    if (actionResult.error) {
        console.error('Engine error in determineAction:', actionResult.error);
        return { isRuin: true, error: actionResult.error };
    }

    const normalizedSaleResult = actionResult.saleResult
        || (Array.isArray(actionResult.quellen)
            ? {
                achievedRefill: actionResult.nettoErlös || (actionResult.verwendungen?.liquiditaet ?? 0),
                steuerGesamt: actionResult.steuer || 0,
                bruttoVerkaufGesamt: actionResult.quellen.reduce((sum, item) => sum + (item?.brutto || 0), 0),
                breakdown: actionResult.quellen
            }
            : null);

    if (normalizedSaleResult) {
        totalTaxesThisYear += (normalizedSaleResult.steuerGesamt || 0);
        applySaleToPortfolio(portfolio, normalizedSaleResult);
    }

    // Sicherstellen, dass Verkaufserlöse immer in der Liquidität ankommen – auch ohne liqNachTransaktion-Adapter.
    const liqAfterAction = computeLiquidityAfterAction(liquiditaet, actionResult, normalizedSaleResult);
    liquiditaet = liqAfterAction;

    const geplanteGoldKauefe = actionResult.kaufGold || 0;
    const geplanteAktienKauefe = actionResult.kaufAktien || 0;
    if (geplanteGoldKauefe > 0) {
        buyGold(portfolio, geplanteGoldKauefe);
    }
    if (geplanteAktienKauefe > 0) {
        buyStocksNeu(portfolio, geplanteAktienKauefe);
    }

    let mergedSaleResult = normalizedSaleResult;

    const depotWertVorEntnahme = sumDepot(portfolio);
    let emergencyRefillHappened = false;
    const jahresEntnahme = spendingResult.monatlicheEntnahme * 12;

    // REFILL LOGIC: Ensure we have enough for Expenses AND Target Buffer
    // We target (jahresEntnahme + zielLiquiditaet) so that after spending, we still hold the buffer.
    // This fixes the "0 Cash Trap" where we only refilled what we spent, staying perpetually at 0.
    const liquidityTargetTotal = jahresEntnahme + zielLiquiditaet;
    if (liquiditaet < liquidityTargetTotal && depotWertVorEntnahme > 0) {
        // Calculate shortfall against the FULL target (Spending + Buffer)
        const shortfall = liquidityTargetTotal - liquiditaet;
        const emergencyCtx = buildInputsCtxFromPortfolio(algoInput, { depotTranchesAktien: portfolio.depotTranchesAktien.map(t => ({ ...t })), depotTranchesGold: portfolio.depotTranchesGold.map(t => ({ ...t })), liquiditaet: liquiditaet }, { pensionAnnual, marketData: marketDataCurrentYear });

        // EMERGENCY REFILL: Ignore minGold floor to prevent false RUIN
        // We try to fill the full buffer using standard emergency logic (Tax-efficient / Gold priority)
        const { saleResult: emergencySale } = engine.calculateSaleAndTax(shortfall, emergencyCtx, { minGold: 0 }, market);

        if (emergencySale && emergencySale.achievedRefill > 0) {
            liquiditaet += emergencySale.achievedRefill;
            totalTaxesThisYear += (emergencySale.steuerGesamt || 0);
            applySaleToPortfolio(portfolio, emergencySale);
            mergedSaleResult = mergedSaleResult ? engine.mergeSaleResults(mergedSaleResult, emergencySale) : emergencySale;
            emergencyRefillHappened = true;
        }

        // If still insufficient for SURVIVAL (Expenses) after first sale, try aggressive asset sale
        // Note: We switch check to `jahresEntnahme` (Survival) here, not `liquidityTargetTotal`.
        // If we missed the Buffer target but covered Expenses, we don't need aggressive panic sales.
        if (liquiditaet < jahresEntnahme && sumDepot(portfolio) > 0) {
            let missing = jahresEntnahme - liquiditaet;

            // Try selling Gold first (without minGold constraint)
            const goldWert = sumDepot({ depotTranchesGold: portfolio.depotTranchesGold });
            if (goldWert > 0 && missing > 0) {
                // Rebuild context to get current asset values after any prior sales
                const goldCtx = buildInputsCtxFromPortfolio(algoInput, portfolio, { pensionAnnual, marketData: marketDataCurrentYear });
                const goldResult = sellAssetForCash(portfolio, goldCtx, market, 'gold', missing, 0);
                liquiditaet += goldResult.cashGenerated;
                totalTaxesThisYear += goldResult.taxesPaid;
                if (goldResult.saleResult) {
                    mergedSaleResult = mergedSaleResult
                        ? engine.mergeSaleResults(mergedSaleResult, goldResult.saleResult)
                        : goldResult.saleResult;
                }
                missing = Math.max(0, missing - goldResult.cashGenerated);
                emergencyRefillHappened = true;
            }
            // Then try selling Equity
            if (missing > 0) {
                const equityWert = sumDepot({ depotTranchesAktien: portfolio.depotTranchesAktien });
                if (equityWert > 0) {
                    // CRITICAL: Rebuild context after gold sale to prevent stale asset values
                    // This ensures calculateSaleAndTax sees the actual remaining assets
                    const updatedCtx = buildInputsCtxFromPortfolio(algoInput, portfolio, { pensionAnnual, marketData: marketDataCurrentYear });
                    const { cashGenerated, taxesPaid, saleResult } = sellAssetForCash(
                        portfolio,
                        updatedCtx,
                        market,
                        'equity',
                        missing,
                        0,
                        engine
                    );
                    liquiditaet += cashGenerated;
                    totalTaxesThisYear += taxesPaid;
                    if (saleResult) {
                        mergedSaleResult = mergedSaleResult
                            ? engine.mergeSaleResults(mergedSaleResult, saleResult)
                            : saleResult;
                    }
                    // Design-Entscheidung: Wir rechnen mit dem tatsächlich generierten Cash,
                    // falls der Verkauf gedeckelt wurde. Ein negativer Wert würde auf 0 gekappt.
                    missing = Math.max(0, missing - cashGenerated);
                    emergencyRefillHappened = true;
                }
            }
        }
    }

    // Only declare RUIN if we truly cannot cover the withdrawal after emergency refill
    if (liquiditaet < jahresEntnahme) {
        return { isRuin: true };
    }
    liquiditaet -= jahresEntnahme;

    let kaufAkt = 0, kaufGld = 0;
    const ueberschuss = liquiditaet - zielLiquiditaet;
    if (ueberschuss > 500) {
        liquiditaet -= ueberschuss;
        const aktienAnteilQuote = algoInput.targetEq / (100 - (algoInput.goldAktiv ? algoInput.goldZielProzent : 0));
        const goldTeil = algoInput.goldAktiv ? ueberschuss * (1 - aktienAnteilQuote) : 0;
        const aktienTeil = ueberschuss - goldTeil;
        kaufGld = goldTeil;
        kaufAkt = aktienTeil;
        buyGold(portfolio, goldTeil);
        buyStocksNeu(portfolio, aktienTeil);
    }

    // Cash-Verzinsung separat loggen, um Zuwächse ohne Verkäufe sichtbar zu machen.
    liqStartVorZins = euros(liquiditaet);
    cashZinsen = euros(liqStartVorZins * rC);
    liquiditaet = euros(liqStartVorZins * (1 + rC));
    liqNachZins = euros(liquiditaet);
    if (!isFinite(liquiditaet)) liquiditaet = 0;

    // ========== FAIL-SAFE LIQUIDITY GUARD ==========
    // Prüft nach allen Transaktionen, ob genug Liquidität für Floor vorhanden ist
    // Falls nicht: Verkauft Assets OHNE Regelprüfungen (Band/ATH/MaxSkim ignoriert)
    let guardSellGold = 0, guardSellEq = 0, guardReason = "", guardTaxes = 0;

    const guardCtx = {
        inflatedFloor: inflatedFloor,
        inputs: algoInput
    };
    const need = computeLiqNeedForFloor(guardCtx);
    let liq = euros(liquiditaet);
    const floorCoveredByPension = guardCtx.inflatedFloor === 0;

    // Defensive Check: Falls inflatierter Floor 0 ist (vollständig durch Rente gedeckt), darf kein Guard-Verkauf ausgelöst werden.
    if (floorCoveredByPension) {
        guardReason = "floor_covered_by_pension";
    }

    if (!floorCoveredByPension && liq < need) {
        let missing = need - liq;
        const minGold = algoInput.goldAktiv ? (algoInput.goldFloorProzent / 100) * totalWealth : 0;

        // 2a) Gold zuerst bis Minimum verkaufen
        if (missing > 0) {
            const goldWert = sumDepot({ depotTranchesGold: portfolio.depotTranchesGold });
            if (goldWert > minGold) {
                const result = sellAssetForCash(
                    portfolio,
                    inputsCtx,
                    market,
                    'gold',
                    missing,
                    0, // Im FAIL-SAFE Mode ignorieren wir minGold-Floor temporär
                    engine
                );
                guardSellGold = result.cashGenerated;
                guardTaxes += result.taxesPaid;
                if (result.saleResult) {
                    mergedSaleResult = mergedSaleResult
                        ? engine.mergeSaleResults(mergedSaleResult, result.saleResult)
                        : result.saleResult;
                }
                liquiditaet += guardSellGold;
                missing = Math.max(0, missing - guardSellGold);
            }
        }

        // 2b) Dann Aktien verkaufen
        if (missing > 0) {
            const equityWert = sumDepot({ depotTranchesAktien: portfolio.depotTranchesAktien });
            if (equityWert > 0) {
                const result = sellAssetForCash(
                    portfolio,
                    inputsCtx,
                    market,
                    'equity',
                    missing,
                    0,
                    engine
                );
                guardSellEq = result.cashGenerated;
                guardTaxes += result.taxesPaid;
                if (result.saleResult) {
                    mergedSaleResult = mergedSaleResult
                        ? engine.mergeSaleResults(mergedSaleResult, result.saleResult)
                        : result.saleResult;
                }
                liquiditaet += guardSellEq;
                missing = Math.max(0, missing - guardSellEq);
            }
        }

        // Wenn weiterhin missing > 0 → echtes RUIN (Assets wirklich leer)
        guardReason = (missing > 0) ? "assets_exhausted" : "rules_overridden";
        totalTaxesThisYear += guardTaxes;
    }

    // Validierung: Sicherstellen, dass kritische Werte finite sind
    if (!Number.isFinite(liquiditaet)) {
        liquiditaet = 0;
    }
    // ========== ENDE FAIL-SAFE LIQUIDITY GUARD ==========

    const newMarketDataHist = {
        endeVJ_3: marketDataHist.endeVJ_2,
        endeVJ_2: marketDataHist.endeVJ_1,
        endeVJ_1: marketDataHist.endeVJ,
        endeVJ: marketDataHist.endeVJ * (1 + rA),
        ath: Math.max(marketDataHist.ath, marketDataHist.endeVJ * (1 + rA)),
        jahreSeitAth: (marketDataHist.endeVJ * (1 + rA) >= marketDataHist.ath) ? 0 : marketDataHist.jahreSeitAth + 1,
        capeRatio: resolvedCapeRatio,
        inflation: yearData.inflation
    };

    const vk = summarizeSalesByAsset(mergedSaleResult);
    const kaufAktTotal = (actionResult.kaufAktien || 0) + (kaufAkt || 0);
    const totalGoldKauf = (actionResult.kaufGold || 0) + kaufGld;

    let aktionText = shortenReasonText(actionResult.reason || 'none', actionResult.title || market.szenarioText);
    if (emergencyRefillHappened) { aktionText += " / Not-VK"; }
    if (totalGoldKauf > 0 && actionResult.reason !== 'rebalance_up') { aktionText += " / Rebal.(G+)"; }
    if (kaufAktTotal > 0 && !actionResult.title.includes("→ Aktien")) { aktionText += " / Rebal.(A+)"; }

    const actionTitle = actionResult.title || '';
    const isRebalanceEvent = actionTitle.toLowerCase().includes('rebalancing') && !actionTitle.toLowerCase().includes('puffer');

    const inflFactorThisYear = 1 + (yearData.inflation / 100);
    const naechsterBaseFloor = baseFloor * inflFactorThisYear;
    const naechsterBaseFlex = baseFlex * inflFactorThisYear;

    // Fix: widowAdjFactor was undefined. Using rentAdjPct for indexation.
    const widowAdjFactor = 1 + (rentAdjPct / 100);


    const nextWidowPensionP1 = widowBenefits.p1FromP2 ? Math.max(0, widowPensionP1 * widowAdjFactor) : 0;
    const nextWidowPensionP2 = widowBenefits.p2FromP1 ? Math.max(0, widowPensionP2 * widowAdjFactor) : 0;

    // Update der Shadow Pensions für das nächste Jahr
    // (unabhängig davon, ob ausgezahlt wurde oder nicht, die Basis wächst weiter)
    const nextAnnualPension = currentAnnualPension * (1 + rentAdjPct / 100);
    const nextAnnualPension2 = currentAnnualPension2 * (1 + rentAdjPct / 100);

    return {
        isRuin: false,
        newState: {
            portfolio: { ...portfolio, liquiditaet },
            baseFloor: naechsterBaseFloor,
            baseFlex: naechsterBaseFlex,
            lastState: spendingNewState,
            // Speichere den indexierten Wert für das nächste Jahr
            currentAnnualPension: nextAnnualPension,
            currentAnnualPension2: nextAnnualPension2,
            marketDataHist: newMarketDataHist,
            samplerState: currentState.samplerState,
            widowPensionP1: nextWidowPensionP1,
            widowPensionP2: nextWidowPensionP2
        },
        logData: {
            entscheidung: { ...spendingResult, jahresEntnahme, runwayMonths, kuerzungProzent: spendingResult.kuerzungProzent },
            FlexRatePct: spendingResult.details.flexRate,
            CutReason: spendingResult.kuerzungQuelle,
            Alarm: spendingNewState.alarmActive,
            Regime: spendingNewState.lastMarketSKey,
            QuoteEndPct: spendingResult.details.entnahmequoteDepot * 100,
                RunwayCoveragePct: (zielLiquiditaet > 0 ? (liqAfterAction / zielLiquiditaet) : 1) * 100,
            RealReturnEquityPct: (1 + rA) / (1 + yearData.inflation / 100) - 1,
            RealReturnGoldPct: (1 + rG) / (1 + yearData.inflation / 100) - 1,
            entnahmequote: depotWertVorEntnahme > 0 ? (jahresEntnahme / depotWertVorEntnahme) : 0,
            steuern_gesamt: totalTaxesThisYear,
            vk,
            kaufAkt: kaufAktTotal,
            kaufGld: totalGoldKauf,
            wertAktien: sumDepot({ depotTranchesAktien: portfolio.depotTranchesAktien }),
            wertGold: sumDepot({ depotTranchesGold: portfolio.depotTranchesGold }),
            liquiditaet,
            liqStart: liqStartVorZins,
            cashInterestEarned: cashZinsen,
            liqEnd: liqNachZins,
            aktionUndGrund: aktionText,
            usedSPB: mergedSaleResult ? (mergedSaleResult.pauschbetragVerbraucht || 0) : 0,
            floor_brutto: effectiveBaseFloor,
            pension_annual: pensionAnnual,
            rente1: rente1,
            rente2: rente2,
            renteSum: renteSum,
            floor_aus_depot: inflatedFloor, // Corrected logic: Use inflatedFloor directly as it represents net floor demand
            flex_brutto: inflatedFlex, // FIX: Use inflatedFlex (effective reduced flex) instead of baseFlex (theoretical max)
            flex_erfuellt_nominal: jahresEntnahme > inflatedFloor ? jahresEntnahme - inflatedFloor : 0,
            inflation_factor_cum: spendingNewState.cumulativeInflationFactor,
            jahresentnahme_real: jahresEntnahme / spendingNewState.cumulativeInflationFactor,
            pflege_aktiv: pflegeMeta?.active ?? false,
            pflege_zusatz_floor: pflegeMeta?.zusatzFloorZiel ?? 0,
            pflege_zusatz_floor_delta: pflegeMeta?.zusatzFloorDelta ?? 0,
            pflege_flex_faktor: pflegeMeta?.flexFactor ?? 1.0,
            pflege_kumuliert: pflegeMeta?.kumulierteKosten ?? 0,
            pflege_grade: pflegeMeta?.grade ?? null,
            pflege_grade_label: pflegeMeta?.gradeLabel ?? '',
            pflege_delta_flex: pflegeMeta?.log_delta_flex ?? 0,
            WidowBenefitP1: widowBenefits.p1FromP2 ? widowPensionP1 : 0,
            WidowBenefitP2: widowBenefits.p2FromP1 ? widowPensionP2 : 0,
            // FAIL-SAFE Guard Debug-Spalten
            NeedLiq: Math.round(need),
            GuardGold: Math.round(guardSellGold),
            GuardEq: Math.round(guardSellEq),
            GuardNote: guardReason
        },
        totalTaxesThisYear
    };
}

/**
* Initialisiert den Startzustand für einen Monte-Carlo-Lauf
*/
export function initMcRunState(inputs, startYearIndex) {
    const startPortfolio = initializePortfolio(inputs);

    const histYears = Object.keys(HISTORICAL_DATA).map(Number).sort((a, b) => a - b);
    const validStartIndices = annualData.map((d, i) => i).filter(i => i >= 4);
    const effectiveIndex = validStartIndices[startYearIndex % validStartIndices.length];
    const startJahr = annualData[effectiveIndex].jahr;

    const marketDataHist = {
        endeVJ: HISTORICAL_DATA[startJahr - 1]?.msci_eur || 1000,
        endeVJ_1: HISTORICAL_DATA[startJahr - 2]?.msci_eur || 1000,
        endeVJ_2: HISTORICAL_DATA[startJahr - 3]?.msci_eur || 1000,
        endeVJ_3: HISTORICAL_DATA[startJahr - 4]?.msci_eur || 1000,
        ath: 0,
        jahreSeitAth: 0,
        inflation: HISTORICAL_DATA[startJahr - 1]?.inflation_de || 2.0,
        capeRatio: resolveCapeRatio(undefined, inputs.marketCapeRatio, 0)
    };

    const pastValues = histYears.filter(y => y < startJahr).map(y => HISTORICAL_DATA[y].msci_eur);
    marketDataHist.ath = pastValues.length > 0 ? Math.max(...pastValues, marketDataHist.endeVJ) : marketDataHist.endeVJ;
    if (marketDataHist.endeVJ < marketDataHist.ath) {
        let lastAthYear = Math.max(...histYears.filter(y => y < startJahr && HISTORICAL_DATA[y].msci_eur >= marketDataHist.ath));
        marketDataHist.jahreSeitAth = (startJahr - 1) - lastAthYear;
    }

    // Ansparphase-Tracking
    const accumulationState = inputs.accumulationPhase?.enabled ? {
        yearsSaved: 0,
        totalContributed: 0,
        sparrateThisYear: 0
    } : null;

    return {
        portfolio: startPortfolio,
        baseFloor: inputs.startFloorBedarf,
        baseFlex: inputs.startFlexBedarf,
        lastState: null,
        // Initialisiere mit Eingabewert (Jahresbasis), damit Indexierung ab Jahr 0 starten kann
        currentAnnualPension: (inputs.renteMonatlich || 0) * 12,
        currentAnnualPension2: (inputs.partner?.brutto || 0),
        marketDataHist: marketDataHist,
        samplerState: {},
        widowPensionP1: 0,
        widowPensionP2: 0,
        accumulationState,
        transitionYear: inputs.transitionYear || 0
    };
}

/**
 * Schätzt die verbleibende Lebenserwartung anhand der Sterbetafel.
 * @param {string} gender - 'm', 'w' oder 'd'.
 * @param {number} currentAge - Alter beim Eintritt in die Pflege.
 * @returns {number} Erwartete verbleibende Jahre (≥ 1).
 */
function estimateRemainingLifeYears(gender, currentAge) {
    const table = MORTALITY_TABLE[gender] || MORTALITY_TABLE.m;
    const ages = Object.keys(table).map(Number).sort((a, b) => a - b);
    const minAge = ages[0] ?? currentAge;
    const maxAge = ages[ages.length - 1] ?? currentAge;
    let survivalProbability = 1;
    let expectedYears = 0;

    for (let age = Math.max(currentAge, minAge); age <= maxAge; age++) {
        const qxRaw = table[age] ?? 1;
        const qx = Math.min(1, Math.max(0, qxRaw));
        expectedYears += survivalProbability;
        survivalProbability *= (1 - qx);
        if (survivalProbability < 0.0001) break;
    }

    return Math.max(1, Math.round(expectedYears));
}

/**
 * Erstellt ein Standard-Pflege-Metadata-Objekt
 * @param {boolean} enabled - Schaltet die Logik ein/aus.
 * @param {string} personGender - Geschlecht für Mortalitätsannahmen.
 */
export function makeDefaultCareMeta(enabled, personGender = 'm') {
    if (!enabled) return null;
    return {
        active: false,
        triggered: false,
        startAge: -1,
        durationYears: 0,
        currentYearInCare: 0,
        zusatzFloorZiel: 0,
        zusatzFloorDelta: 0,
        flexFactor: 1.0,
        kumulierteKosten: 0,
        floorAtTrigger: 0,
        flexAtTrigger: 0,
        maxFloorAtTrigger: 0,
        grade: null,
        gradeLabel: '',
        mortalityFactor: 0,
        personGender
    };
}

/**
 * Wählt Marktdaten für das nächste Jahr gemäß der MC-Methode aus
 */
export function sampleNextYearData(state, methode, blockSize, rand, stressCtx) {
    const samplerState = state.samplerState;

    if (stressCtx && stressCtx.type === 'conditional_bootstrap' && stressCtx.remainingYears > 0) {
        const randomIndex = Math.floor(rand() * stressCtx.pickableIndices.length);
        const chosenYearIndex = stressCtx.pickableIndices[randomIndex];
        return { ...annualData[chosenYearIndex] };
    }

    if (methode === 'block') {
        if (!samplerState.blockStartIndex || samplerState.yearInBlock >= blockSize) {
            const maxIndex = annualData.length - blockSize;
            samplerState.blockStartIndex = Math.floor(rand() * maxIndex);
            samplerState.yearInBlock = 0;
        }
        const data = annualData[samplerState.blockStartIndex + samplerState.yearInBlock];
        samplerState.yearInBlock++;
        return { ...data };
    }

    let regime;
    if (methode === 'regime_iid') {
        const regimes = Object.keys(REGIME_DATA);
        regime = regimes[Math.floor(rand() * regimes.length)];
    } else {
        if (!samplerState.currentRegime) {
            samplerState.currentRegime = annualData[Math.floor(rand() * annualData.length)].regime;
        }

        const transitions = REGIME_TRANSITIONS[samplerState.currentRegime];
        const r = rand();
        let cumulativeProb = 0;
        let nextRegime = 'SIDEWAYS';
        for (const [targetRegime, count] of Object.entries(transitions)) {
            if (targetRegime === 'total') continue;
            cumulativeProb += (count / transitions.total);
            if (r <= cumulativeProb) {
                nextRegime = targetRegime;
                break;
            }
        }
        regime = nextRegime;
        samplerState.currentRegime = nextRegime;
    }

    const possibleYears = REGIME_DATA[regime];
    const chosenYear = possibleYears[Math.floor(rand() * possibleYears.length)];
    return { ...chosenYear };
}

/**
 * Berechnet Volatilität und maximalen Drawdown aus einer Serie
 */
export function computeRunStatsFromSeries(series) {
    if (!Array.isArray(series) || series.length < 2) {
        return { volPct: 0, maxDDpct: 0 };
    }
    const returns = [];
    for (let i = 1; i < series.length; i++) {
        const prev = series[i - 1] || 0;
        const cur = series[i] || 0;
        const r = (prev > 0 && isFinite(prev) && isFinite(cur)) ? (cur / prev - 1) : 0;
        returns.push(r);
    }
    const mu = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length > 1 ? returns.reduce((s, x) => s + (x - mu) * (x - mu), 0) / (returns.length - 1) : 0;
    const volPct = Math.sqrt(Math.max(variance, 0)) * 100;

    let peak = series[0];
    let maxDD = 0;
    for (let i = 1; i < series.length; i++) {
        peak = Math.max(peak, series[i]);
        if (peak > 0) {
            const dd = (series[i] - peak) / peak;
            if (isFinite(dd)) maxDD = Math.min(maxDD, dd);
        }
    }
    const maxDDpct = Math.abs(maxDD) * 100;
    return { volPct, maxDDpct };
}

/**
 * Berechnet die Pflege-Zusatzkosten für Floor und Flex
 * @param {Object} careMetaP1 - Pflege-Meta für Person 1
 * @param {Object} careMetaP2 - Pflege-Meta für Person 2 (oder null)
 * @returns {Object} { zusatzFloor, flexFactor }
 */
export function calcCareCost(careMetaP1, careMetaP2 = null) {
    let zusatzFloor = 0;
    let flexFactor = 1.0;

    if (careMetaP1?.active) {
        zusatzFloor += careMetaP1.zusatzFloorZiel || 0;
        flexFactor = Math.min(flexFactor, careMetaP1.flexFactor || 1.0);
    }

    if (careMetaP2?.active) {
        zusatzFloor += careMetaP2.zusatzFloorZiel || 0;
        flexFactor = Math.min(flexFactor, careMetaP2.flexFactor || 1.0);
    }

    return { zusatzFloor, flexFactor };
}

/**
 * Computes the effective household flex factor by splitting the flex budget across
 * all living persons and only cutting the portion that belongs to the person in care.
 *
 * Example: Two living persons share the flex need 50/50. If person A suffers a
 * 80% flex cut (factor 0.2) while person B remains healthy (factor 1.0), the
 * household factor becomes 0.5 * 0.2 + 0.5 * 1.0 = 0.6. Only the affected share
 * is reduced.
 *
 * @param {Object} params - Calculation context.
 * @param {boolean} params.p1Alive - True if person 1 still needs flex spending.
 * @param {Object|null} params.careMetaP1 - Care meta data for person 1.
 * @param {boolean} params.p2Alive - True if person 2 still needs flex spending.
 * @param {Object|null} params.careMetaP2 - Care meta data for person 2.
 * @returns {number} Household flex factor in [0, 1]. Defaults to 1 if nobody is alive.
 */
export function computeHouseholdFlexFactor({ p1Alive, careMetaP1, p2Alive, careMetaP2 }) {
    // Determine the individual flex factors (0.0 to 1.0) for each person.
    // A dead person contributes 0.0 leverage to the household budget.
    // A person in care contributes reduced leverage (e.g. 0.0, 0.5).
    const f1 = p1Alive ? resolveIndividualFlexFactor(careMetaP1) : 0.0;

    // We determine if this is a "Couple Simulation" by checking if careMetaP2 is provided (even if null/healthy)
    // or if p2Alive was true at some point. The caller (monte-carlo-runner) initializes careMetaP2 based on inputs.partner.aktiv.
    // If inputs.partner.aktiv is false, careMetaP2 is usually null or undefined in a way we can distinguish?
    // Actually, monte-carlo-runner passes `careMetaP2` as `null` if partner is inactive. 
    // But if partner IS active but healthy, it is ALSO `null`? NO.
    // In monte-carlo-runner:
    // const careMetaP2 = (inputs.partner?.aktiv === true) ? makeDefaultCareMeta(...) : null;
    // So if partner is active, careMetaP2 is an OBJECT (even if not triggered).
    // If partner is NOT active, careMetaP2 is NULL.
    // Therefore: careMetaP2 !== null implies "Couple Household".

    // Wait, the updated logic in monte-carlo might handle "null" differently now?
    // Let's assume: if careMetaP2 is passed as an object (even empty), it's a couple. 
    // If it's explicitly null/undefined, it's a single.
    // CAUTION: In the runner loop, p2Alive might be true, but careMetaP2 might be the object.

    // Let's refine the detection. 
    // In monte-carlo-runner.js:
    // const careMetaP2 = (inputs.partner?.aktiv === true) ? makeDefaultCareMeta(...) : null;
    // So `careMetaP2 !== null` is the indicator for "Couple Configured".

    const isCoupleProfile = (careMetaP2 !== null);

    if (!isCoupleProfile) {
        // Single Profile: The input budget is for ONE person.
        // Factor is simply f1.
        return f1;
    }

    // Couple Profile: The input budget is for TWO persons.
    // We apply the "75% Rule" for survivors/singles relative to the Couple Budget.
    // If P2 is dead (p2Alive=false), f2 is 0.
    const f2 = p2Alive ? resolveIndividualFlexFactor(careMetaP2) : 0.0;

    // Formula:
    // Shared Base (50%) - available if AT LEAST ONE person is "active" (max(f1, f2)).
    // Plus 25% for Person 1's share.
    // Plus 25% for Person 2's share.
    //
    // Examples:
    // 1. Both Healthy: 0.5*1 + 0.25*1 + 0.25*1 = 1.0 (100%)
    // 2. T1 Dead:      0.5*1 + 0.25*1 + 0 = 0.75 (75%) -> "One person less needs 75%"
    // 3. T1 Care(0%):  0.5*1 + 0 + 0.25*1 = 0.75 (75%) -> "Same if one person needs no Flex from care"
    // 4. Both Dead:    0.5*0 + 0 + 0 = 0.0 (0%)
    // 5. Both Care(0%):0.5*0 + 0 + 0 = 0.0 (0%) -> "No flex from care" for both.

    const householdFactor = (0.5 * Math.max(f1, f2)) + (0.25 * f1) + (0.25 * f2);

    return householdFactor;
}

/**
 * Normalizes an individual's flex factor to [0, 1] and defaults to 1 for invalid values.
 * @param {Object|null} careMeta - Care metadata for the person.
 * @returns {number} Clamped flex factor.
 */
function resolveIndividualFlexFactor(careMeta) {
    if (!careMeta || !careMeta.active) {
        // No active care = 100% Flex
        return 1.0;
    }
    const rawFactor = careMeta.flexFactor;
    if (typeof rawFactor !== 'number' || !Number.isFinite(rawFactor)) {
        return 1.0;
    }
    return Math.min(1, Math.max(0, rawFactor));
}

/**
 * Bestimmt den CAPE-Wert für das aktuelle Jahr.
 * Priorität: Jahresdaten > Benutzereingabe > historischer Zustand > 0.
 * @param {number} yearSpecificCape - CAPE-Wert aus den Jahresdaten.
 * @param {number} inputCape - Vom Nutzer gesetzter CAPE-Wert.
 * @param {number} historicalCape - CAPE-Wert aus dem Vorjahr.
 * @returns {number} Gültiger CAPE-Wert (>= 0).
 */
function resolveCapeRatio(yearSpecificCape, inputCape, historicalCape) {
    if (typeof yearSpecificCape === 'number' && Number.isFinite(yearSpecificCape) && yearSpecificCape > 0) {
        return yearSpecificCape;
    }
    if (typeof inputCape === 'number' && Number.isFinite(inputCape) && inputCape > 0) {
        return inputCape;
    }
    if (typeof historicalCape === 'number' && Number.isFinite(historicalCape) && historicalCape > 0) {
        return historicalCape;
    }
    return 0;
}

const CARE_PROBABILITY_BUCKETS = Object.keys(PFLEGE_GRADE_PROBABILITIES).map(Number).sort((a, b) => a - b);

/**
 * Berechnet den Mortalitäts-Multiplikator während eines Pflegefalls.
 * Der Multiplikator steigt linear vom Basiswert 1 bis zum grad-spezifischen
 * Mortalitätsfaktor über die konfigurierte Ramp-Up-Dauer an.
 */
export function computeCareMortalityMultiplier(careMeta, inputs) {
    if (!careMeta?.active) {
        return 1;
    }

    const baseFactor = Math.max(1, Number(careMeta?.mortalityFactor) || 0);
    if (baseFactor <= 1) {
        return 1;
    }

    const rampYears = Math.max(1, Number(inputs.pflegeRampUp) || 1);
    const yearsCompleted = Math.min(careMeta.currentYearInCare || 0, rampYears);
    if (yearsCompleted <= 0) {
        return 1;
    }

    const progress = yearsCompleted / rampYears;
    return 1 + (baseFactor - 1) * progress;
}

function resolveCareAgeBucket(age) {
    const numericAge = Number(age);
    if (!Number.isFinite(numericAge)) {
        return CARE_PROBABILITY_BUCKETS[0];
    }

    let bucket = CARE_PROBABILITY_BUCKETS[0];
    for (const candidate of CARE_PROBABILITY_BUCKETS) {
        if (numericAge >= candidate) {
            bucket = candidate;
        } else {
            break;
        }
    }
    return bucket;
}

function sampleCareGrade(age, rand) {
    const minBucket = CARE_PROBABILITY_BUCKETS[0];
    if (age < minBucket) {
        return null;
    }

    const bucket = resolveCareAgeBucket(age);
    const probabilities = PFLEGE_GRADE_PROBABILITIES[bucket];
    if (!probabilities) return null;

    // WICHTIG: PG4 und PG5 sind NICHT als initiale Einstiegsgrade möglich.
    // Sie können nur durch Progression aus niedrigeren Graden erreicht werden.
    // Dies ist medizinisch realistischer: Menschen entwickeln normalerweise nicht
    // sofort schwerste Pflegebedürftigkeit, sondern beginnen mit leichteren Graden.
    // Stand heute erlauben wir nur Einstiege in PG1 und PG2.
    const INITIAL_ENTRY_GRADES = [1, 2];  // Nur PG1-2 für initialen Eintritt

    const totalProbability = INITIAL_ENTRY_GRADES.reduce((sum, grade) => sum + (probabilities[grade] || 0), 0);
    if (totalProbability <= 0) return null;

    const roll = rand();
    if (roll > totalProbability) {
        return null;
    }

    let cumulative = 0;
    for (const grade of INITIAL_ENTRY_GRADES) {
        const gradeProbability = probabilities[grade] || 0;
        cumulative += gradeProbability;
        if (roll <= cumulative) {
            return { grade, bucket, gradeProbability, totalProbability };
        }
    }
    return null;
}

function normalizeGradeConfig(config) {
    const zusatz = Math.max(0, Number(config?.zusatz) || 0);
    const rawFlex = config?.flexCut;
    const flexCut = Math.min(1, Math.max(0, Number.isFinite(rawFlex) ? rawFlex : 1));
    const rawMortality = Number(config?.mortalityFactor);
    const mortalityFactor = Math.max(0, Number.isFinite(rawMortality) ? rawMortality : 0);
    return { zusatz, flexCut, mortalityFactor };
}

function resolveGradeConfig(inputs, grade) {
    const configs = inputs?.pflegeGradeConfigs;
    if (configs && configs[grade]) {
        return normalizeGradeConfig(configs[grade]);
    }
    if (configs) {
        for (const fallbackGrade of SUPPORTED_PFLEGE_GRADES) {
            if (configs[fallbackGrade]) {
                return normalizeGradeConfig(configs[fallbackGrade]);
            }
        }
    }
    return normalizeGradeConfig({
        zusatz: inputs?.pflegeStufe1Zusatz,
        flexCut: inputs?.pflegeStufe1FlexCut,
        mortalityFactor: inputs?.pflegeStufe1Mortality
    });
}

/**
 * Aktualisiert Pflege-Metadaten inklusive grad-spezifischer Kosten.
 *
 * Vorgehen:
 * 1. Alters-Bucket gemäß Barmer-Pflegereport (2024) bestimmen.
 * 2. Pflegegrad anhand der Bucket-Verteilung ziehen und dessen Konfiguration anwenden.
 * 3. Zusatzkosten/Flex-Verlust rampenbasiert auf den Max-Floor capen.
 */
export function updateCareMeta(care, inputs, age, yearData, rand) {
    if (!inputs.pflegefallLogikAktivieren || !care) return care;

    if (care.active) {
        if (inputs.pflegeModellTyp === 'akut' && care.currentYearInCare >= care.durationYears) {
            care.active = false;
            care.zusatzFloorDelta = 0;
            care.grade = null;
            care.gradeLabel = '';
            return care;
        }

        if (!care.grade) {
            care.grade = SUPPORTED_PFLEGE_GRADES[0];
            care.gradeLabel = PFLEGE_GRADE_LABELS[care.grade] || `Pflegegrad ${care.grade}`;
        }

        // Pflegegrad-Progression: Prüfe ob sich der Pflegegrad verschlechtert
        const currentGrade = care.grade;
        const progressionProb = PFLEGE_GRADE_PROGRESSION_PROBABILITIES[currentGrade] || 0;

        let gradeChanged = false;
        const canProgressThisYear = (care.currentYearInCare || 0) >= 1;
        // Prüfe ob Verschlechterung eintritt (nur wenn nicht bereits PG5)
        if (canProgressThisYear && currentGrade < 5 && rand() < progressionProb) {
            const newGrade = currentGrade + 1;
            care.grade = newGrade;
            care.gradeLabel = PFLEGE_GRADE_LABELS[newGrade] || `Pflegegrad ${newGrade}`;
            // Aktualisiere Mortalitätsfaktor für neuen Grad
            const newGradeConfig = resolveGradeConfig(inputs, newGrade);
            care.mortalityFactor = newGradeConfig.mortalityFactor || 0;
            gradeChanged = true;
        }

        const gradeConfig = resolveGradeConfig(inputs, care.grade);
        const yearsSinceStart = care.currentYearInCare;
        const yearIndex = yearsSinceStart + 1;
        care.mortalityFactor = gradeConfig.mortalityFactor || 0;
        // Pflegekosten steigen historisch schneller als die CPI, daher modellieren wir Inflation * Drift.
        const rawDriftPct = Number(inputs.pflegeKostenDrift);
        const driftFactor = Number.isFinite(rawDriftPct) ? Math.max(0, rawDriftPct) / 100 : 0;
        const inflationsAnpassung = (1 + yearData.inflation / 100) * (1 + driftFactor);
        // Regionale Aufschläge (z.B. Ballungsräume) skalieren alle Grade linear.
        const regionalMultiplier = 1 + Math.max(0, inputs?.pflegeRegionalZuschlag || 0);

        const floorAtTriggerAdjusted = care.floorAtTrigger * Math.pow(1 + yearData.inflation / 100, yearIndex);
        const flexAtTriggerAdjusted = care.flexAtTrigger * Math.pow(1 + yearData.inflation / 100, yearIndex);
        const maxFloorAdjusted = care.maxFloorAtTrigger * Math.pow(inflationsAnpassung, yearIndex);

        const capZusatz = Math.max(0, maxFloorAdjusted - floorAtTriggerAdjusted);

        // FIX: Pflegekosten korrekt berechnen - Jahr-für-Jahr mit Inflation, nicht kumulativ über alle Pflegejahre
        let zielRoh;
        if (gradeChanged || !care.previousZielRoh) {
            // Bei Gradwechsel oder erstem Jahr: Basiskosten mit aktueller Inflation
            zielRoh = gradeConfig.zusatz * inflationsAnpassung * regionalMultiplier;
        } else {
            // In Folgejahren: Vorjahreskosten mit aktueller Inflation
            zielRoh = care.previousZielRoh * inflationsAnpassung;
        }
        care.previousZielRoh = zielRoh;
        const cappedZiel = Math.min(capZusatz, zielRoh);
        const needsRamp = (zielRoh > capZusatz) && capZusatz > 0;
        let zusatzFloorZielFinal = cappedZiel;
        if (needsRamp) {
            const rampYears = Math.max(1, inputs.pflegeRampUp);
            const rampUpFactor = Math.min(1.0, yearIndex / rampYears);
            const rampedTarget = Math.min(capZusatz, zielRoh * rampUpFactor);
            zusatzFloorZielFinal = rampedTarget;
        }

        const zusatzFloorDelta = Math.max(0, zusatzFloorZielFinal - care.zusatzFloorZiel);
        care.zusatzFloorDelta = zusatzFloorDelta;
        care.zusatzFloorZiel = zusatzFloorZielFinal;
        care.flexFactor = gradeConfig.flexCut;

        const flexVerlust = flexAtTriggerAdjusted * (1 - care.flexFactor);
        care.kumulierteKosten += zusatzFloorDelta + flexVerlust;

        care.log_floor_anchor = floorAtTriggerAdjusted;
        care.log_maxfloor_anchor = maxFloorAdjusted;
        care.log_cap_zusatz = capZusatz;
        care.log_delta_flex = flexVerlust;
        care.log_grade = care.grade;
        care.log_grade_label = care.gradeLabel;

        care.currentYearInCare = yearIndex;

        return care;
    }

    if (!care.triggered) {
        const sampledGrade = sampleCareGrade(age, rand);

        if (sampledGrade) {
            care.triggered = true;
            care.active = true;
            care.startAge = age;
            care.currentYearInCare = 0;
            care.grade = sampledGrade.grade;
            care.gradeLabel = PFLEGE_GRADE_LABELS[sampledGrade.grade] || `Pflegegrad ${sampledGrade.grade}`;
            const gradeConfig = resolveGradeConfig(inputs, care.grade);
            care.mortalityFactor = gradeConfig.mortalityFactor || 0;

            care.floorAtTrigger = inputs.startFloorBedarf;
            care.flexAtTrigger = inputs.startFlexBedarf;
            care.maxFloorAtTrigger = inputs.pflegeMaxFloor;

            if (inputs.pflegeModellTyp === 'akut') {
                const min = inputs.pflegeMinDauer, max = inputs.pflegeMaxDauer;
                care.durationYears = Math.floor(rand() * (max - min + 1)) + min;
            } else {
                const genderForCalc = care.personGender || inputs?.geschlecht || 'm';
                care.durationYears = estimateRemainingLifeYears(genderForCalc, age);
            }

            care.log_grade_bucket = sampledGrade.bucket;
            care.log_grade_probability = sampledGrade.gradeProbability;
            care.log_grade_totalProbability = sampledGrade.totalProbability;

            return updateCareMeta(care, inputs, age, yearData, rand);
        }
    }

    return care;
}
