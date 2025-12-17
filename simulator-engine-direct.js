"use strict";

/**
 * ===================================================================
 * SIMULATOR ENGINE - DIRECT API VERSION (NO ADAPTER)
 * ===================================================================
 * Diese Version verwendet EngineAPI direkt statt den Adapter.
 * Für Side-by-Side Vergleich mit simulator-engine.js
 * ===================================================================
 */

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
 */
function computeLiqNeedForFloor(ctx) {
    const hasInflatedFloor = ctx.inflatedFloor !== undefined && ctx.inflatedFloor !== null;
    const normalizedStartFloor = euros(ctx.inputs?.startFloorBedarf ?? 0);
    const floorBasis = hasInflatedFloor ? euros(ctx.inflatedFloor) : normalizedStartFloor;

    if (hasInflatedFloor && floorBasis === 0) {
        return 0;
    }

    const floorMonthlyNet = euros(Number(floorBasis) / 12);
    const runwayTargetMonths = Number.isFinite(ctx?.inputs?.runwayTargetMonths) ? ctx.inputs.runwayTargetMonths : 12;
    const runwayTargetSafe = runwayTargetMonths > 0 ? runwayTargetMonths : 12;

    return euros(runwayTargetSafe * floorMonthlyNet);
}

/**
 * Stellt sicher, dass simulateOneYear immer valide Haushaltsdaten erhält.
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
 * Simuliert ein Jahr des Ruhestandsszenarios - DIREKTE EngineAPI Version
 *
 * HAUPTUNTERSCHIED zur Adapter-Version:
 * - Verwendet EINEN EngineAPI.simulateSingleYear() Aufruf
 * - Statt mehrerer Adapter-Methoden (determineSpending, determineAction, calculateSaleAndTax)
 * - Direkter Zugriff auf diagnosis, ui.spending, ui.action
 *
 * @param {Object} currentState - Aktuelles Portfolio und Marktstatus
 * @param {Object} inputs - Benutzereingaben und Konfiguration
 * @param {Object} yearData - Marktdaten für das Jahr
 * @param {number} yearIndex - Index des Simulationsjahres
 * @param {Object} pflegeMeta - Pflege-Metadata (optional)
 * @param {number} careFloorAddition - Zusätzlicher Floor-Bedarf durch Pflege
 * @param {Object|null} householdContext - Haushaltsstatus
 * @param {number} temporaryFlexFactor - Temporärer Flex-Faktor (0..1)
 * @param {Object} engineAPI - EngineAPI Instanz (DIREKT, kein Adapter!)
 * @returns {Object} Simulationsergebnisse
 */
export function simulateOneYear(currentState, inputs, yearData, yearIndex, pflegeMeta = null, careFloorAddition = 0, householdContext = null, temporaryFlexFactor = 1.0, engineAPI = null) {
    // EngineAPI muss übergeben werden oder global verfügbar sein
    const engine = engineAPI || (typeof window !== 'undefined' ? window.EngineAPI : null);

    if (!engine) {
        console.error('[simulator-engine-direct] EngineAPI not available!', {
            engineAPI,
            windowEngineAPI: typeof window !== 'undefined' ? window.EngineAPI : 'no window',
            windowKeys: typeof window !== 'undefined' ? Object.keys(window).filter(k => k.includes('Engine') || k.includes('Ruhe')) : []
        });
        throw new Error("Critical: No EngineAPI available in simulateOneYear. Pass it as argument or ensure global scope.");
    }

    if (typeof engine.simulateSingleYear !== 'function') {
        console.error('[simulator-engine-direct] engine.simulateSingleYear is not a function!', {
            engine,
            engineType: typeof engine,
            engineKeys: Object.keys(engine || {}),
            hasSimulateSingleYear: 'simulateSingleYear' in (engine || {}),
            simulateSingleYearType: typeof engine?.simulateSingleYear
        });
        throw new Error("Critical: engine.simulateSingleYear is not a function. Wrong engine object?");
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

    const effectiveBaseFloor = baseFloor + careFloorAddition;
    currentAnnualPension2 = currentAnnualPension2 || 0;
    widowPensionP1 = Math.max(0, widowPensionP1 || 0);
    widowPensionP2 = Math.max(0, widowPensionP2 || 0);
    const householdCtx = normalizeHouseholdContext(householdContext);
    const { p1Alive, p2Alive, widowBenefits } = householdCtx;

    let { depotTranchesAktien, depotTranchesGold } = portfolio;
    let liquiditaet = portfolio.liquiditaet;
    let liqStartVorZins = euros(liquiditaet);
    let cashZinsen = 0;
    let liqNachZins = liqStartVorZins;
    let totalTaxesThisYear = 0;

    const rA = isFinite(yearData.rendite) ? yearData.rendite : 0;
    const rG = isFinite(yearData.gold_eur_perf) ? yearData.gold_eur_perf / 100 : 0;
    const rC = isFinite(yearData.zinssatz) ? yearData.zinssatz / 100 : 0;

    // Renditen anwenden
    for (let i = 0; i < depotTranchesAktien.length; i++) {
        depotTranchesAktien[i].marketValue *= (1 + rA);
    }
    for (let i = 0; i < depotTranchesGold.length; i++) {
        depotTranchesGold[i].marketValue *= (1 + rG);
    }

    const resolvedCapeRatio = resolveCapeRatio(yearData.capeRatio, inputs.marketCapeRatio, marketDataHist.capeRatio);
    const marketDataCurrentYear = { ...marketDataHist, inflation: yearData.inflation, capeRatio: resolvedCapeRatio };

    // ==========================================
    // ANSPARPHASE-LOGIK (unverändert, da keine Engine-Aufrufe)
    // ==========================================
    const isAccumulationYear = inputs.accumulationPhase?.enabled && yearIndex < (inputs.transitionYear || 0);

    if (isAccumulationYear) {
        // Sparrate berechnen
        let sparrateThisYear = inputs.accumulationPhase.sparrate * 12;

        if (inputs.accumulationPhase.sparrateIndexing === 'inflation' && currentState.accumulationState) {
            const lastYearSparrate = currentState.accumulationState.sparrateThisYear || (inputs.accumulationPhase.sparrate * 12);
            sparrateThisYear = lastYearSparrate * (1 + yearData.inflation / 100);
        } else if (inputs.accumulationPhase.sparrateIndexing === 'wage' && currentState.accumulationState) {
            const lastYearSparrate = currentState.accumulationState.sparrateThisYear || (inputs.accumulationPhase.sparrate * 12);
            const wageGrowth = yearData.lohn || 2.0;
            sparrateThisYear = lastYearSparrate * (1 + wageGrowth / 100);
        }

        // Shadow Pension Tracking
        const rentAdjPct = inputs.rentAdjPct || 0;
        const currentP1 = currentState.currentAnnualPension || 0;
        const currentP2 = currentState.currentAnnualPension2 || 0;
        const nextP1 = currentP1 * (1 + rentAdjPct / 100);
        const nextP2 = currentP2 * (1 + rentAdjPct / 100);

        // Cash-Zinsen
        cashZinsen = euros(liquiditaet * rC);
        liquiditaet += cashZinsen;
        liqNachZins = euros(liquiditaet);

        // Sparrate hinzufügen
        liquiditaet += sparrateThisYear;

        // Rebalancing
        const zielLiquiditaet = inputs.zielLiquiditaet || 0;
        const ueberschuss = liquiditaet - zielLiquiditaet;

        let kaufAktTotal = 0;
        let kaufGldTotal = 0;

        if (ueberschuss > 500) {
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

        const newAccumulationState = currentState.accumulationState ? {
            yearsSaved: currentState.accumulationState.yearsSaved + 1,
            totalContributed: euros(currentState.accumulationState.totalContributed + sparrateThisYear),
            sparrateThisYear: euros(sparrateThisYear)
        } : null;

        const naechsterBaseFloor = euros(baseFloor * (1 + yearData.inflation / 100));
        const naechsterBaseFlex = euros(baseFlex * (1 + yearData.inflation / 100));

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
            totalTaxesThisYear: 0,
            logData: {
                jahr: yearIndex + 1,
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
    // ENTNAHMEPHASE-LOGIK - DIREKTE ENGINE API
    // ==========================================

    const rentAdjPct = inputs.rentAdjPct || 0;

    // Rente Person 1
    const currentAgeP1 = inputs.startAlter + yearIndex;
    const r1StartOffsetYears = Math.max(0, Number(inputs.renteStartOffsetJahre) || 0);
    let rente1BruttoEigen = 0;
    let widowBenefitP1ThisYear = 0;

    if (p1Alive && yearIndex >= r1StartOffsetYears) {
        rente1BruttoEigen = currentAnnualPension;
    }

    if (p1Alive && widowBenefits.p1FromP2) {
        widowBenefitP1ThisYear = widowPensionP1;
    }

    const rente1_brutto = rente1BruttoEigen + widowBenefitP1ThisYear;
    const rente1 = rente1_brutto;

    // Rente Person 2
    let rente2BruttoEigen = 0;
    let widowBenefitP2ThisYear = 0;
    let rente2_brutto = 0;
    let rente2 = 0;

    if (inputs.partner?.aktiv && p2Alive) {
        const partnerStartOffsetYears = Math.max(0, Number(inputs.partner.startInJahren) || 0);
        if (yearIndex >= partnerStartOffsetYears) {
            rente2BruttoEigen = currentAnnualPension2;

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

    // Calculate TOTAL household pension income (both persons)
    const renteSum = rente1 + rente2;
    const pensionAnnual = renteSum;

    // Use TOTAL pension to calculate household floor/flex coverage
    const pensionSurplus = Math.max(0, pensionAnnual - effectiveBaseFloor);
    const inflatedFloor = Math.max(0, effectiveBaseFloor - pensionAnnual);
    const inflatedFlex = Math.max(0, (baseFlex * temporaryFlexFactor) - pensionSurplus);

    const depotwertGesamt = sumDepot(portfolio);
    const totalWealth = depotwertGesamt + liquiditaet;

    // ==========================================
    // DIREKTE ENGINE API - SINGLE CALL
    // ==========================================

    // Baue EngineAPI-Input auf - WICHTIG: Verwende buildInputsCtxFromPortfolio() wie der Adapter!
    // CRITICAL: buildInputsCtxFromPortfolio() expects only Person 1's pension, NOT the sum!
    const inputsCtx = buildInputsCtxFromPortfolio(inputs, portfolio, {
        pensionAnnual: rente1,  // Only Person 1's pension! Person 2 is handled separately
        marketData: marketDataCurrentYear
    });

    const engineInput = {
        ...inputsCtx,
        aktuellesAlter: inputs.startAlter + yearIndex,
        inflation: yearData.inflation,
        floorBedarf: inflatedFloor,  // Floor NACH Rentendeckung
        flexBedarf: inflatedFlex,     // Flex NACH Rentendeckung
        marketCapeRatio: resolvedCapeRatio,
        // pensionAnnual und renteMonatlich kommen bereits aus inputsCtx!
        // NICHT überschreiben - inputsCtx hat die richtigen Werte!
    };

    // **HAUPTUNTERSCHIED**: Ein einziger Engine-Aufruf statt 3-5 Adapter-Aufrufe
    const fullResult = engine.simulateSingleYear(engineInput, lastState);

    // FAIL-SAFE: Error-Handling
    if (fullResult.error || !fullResult.ui) {
        console.error('EngineAPI error:', fullResult.error);
        return { isRuin: true, error: fullResult.error };
    }

    // Extrahiere Ergebnisse direkt aus fullResult
    const spendingResult = fullResult.ui.spending;
    const actionResult = fullResult.ui.action;
    const market = fullResult.ui.market;
    const zielLiquiditaet = fullResult.ui.zielLiquiditaet;
    const spendingNewState = fullResult.newState;

    // Wende Transaktionen auf Portfolio an
    if (actionResult.type === 'TRANSACTION' && actionResult.quellen) {
        const saleResult = {
            steuerGesamt: actionResult.steuer || 0,
            bruttoVerkaufGesamt: actionResult.quellen.reduce((sum, q) => sum + q.brutto, 0),
            achievedRefill: actionResult.nettoErlös || 0,
            breakdown: actionResult.quellen
        };

        totalTaxesThisYear += saleResult.steuerGesamt;
        applySaleToPortfolio(portfolio, saleResult);
    }

    // Aktualisiere Liquidität nach Transaktionen
    liquiditaet = actionResult.verwendungen?.liquiditaet
        ? liquiditaet + actionResult.verwendungen.liquiditaet
        : liquiditaet;

    // Kaufe Gold/Aktien wenn vorhanden
    if (actionResult.verwendungen?.gold > 0) {
        buyGold(portfolio, actionResult.verwendungen.gold);
    }
    if (actionResult.verwendungen?.aktien > 0) {
        buyStocksNeu(portfolio, actionResult.verwendungen.aktien);
    }

    const jahresEntnahme = spendingResult.monatlicheEntnahme * 12;

    // RUIN-Check: Können wir die Entnahme leisten?
    if (liquiditaet < jahresEntnahme) {
        return { isRuin: true };
    }

    liquiditaet -= jahresEntnahme;

    // Rebalancing bei Überschuss
    let kaufAkt = 0, kaufGld = 0;
    const ueberschuss = liquiditaet - zielLiquiditaet;
    if (ueberschuss > 500) {
        liquiditaet -= ueberschuss;
        const aktienAnteilQuote = inputs.targetEq / (100 - (inputs.goldAktiv ? inputs.goldZielProzent : 0));
        const goldTeil = inputs.goldAktiv ? ueberschuss * (1 - aktienAnteilQuote) : 0;
        const aktienTeil = ueberschuss - goldTeil;
        kaufGld = goldTeil;
        kaufAkt = aktienTeil;
        buyGold(portfolio, goldTeil);
        buyStocksNeu(portfolio, aktienTeil);
    }

    // Cash-Verzinsung
    liqStartVorZins = euros(liquiditaet);
    cashZinsen = euros(liqStartVorZins * rC);
    liquiditaet = euros(liqStartVorZins * (1 + rC));
    liqNachZins = euros(liquiditaet);
    if (!isFinite(liquiditaet)) liquiditaet = 0;

    // FAIL-SAFE LIQUIDITY GUARD (vereinfacht, da Engine bereits Guard hat)
    // Diese Guard ist nur für extreme Notfälle wo Engine fehlschlägt
    let guardSellGold = 0, guardSellEq = 0, guardReason = "";
    const guardCtx = { inflatedFloor, inputs };
    const need = computeLiqNeedForFloor(guardCtx);
    const floorCoveredByPension = inflatedFloor === 0;

    if (!floorCoveredByPension && liquiditaet < need) {
        guardReason = "emergency_guard_triggered";
        // In der direkten API-Version sollte dies nicht passieren,
        // da die Engine bereits Guardrails hat
        console.warn('FAIL-SAFE Guard triggered in direct API version - this should not happen!');
    } else if (floorCoveredByPension) {
        guardReason = "floor_covered_by_pension";
    }

    // Market History für nächstes Jahr
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

    // Verkäufe zusammenfassen
    const vk = actionResult.quellen ? summarizeSalesByAsset({
        breakdown: actionResult.quellen,
        steuerGesamt: actionResult.steuer || 0
    }) : { vkAkt: 0, vkGld: 0, stAkt: 0, stGld: 0, vkGes: 0, stGes: 0 };

    const kaufAktTotal = (actionResult.verwendungen?.aktien || 0) + kaufAkt;
    const totalGoldKauf = (actionResult.verwendungen?.gold || 0) + kaufGld;

    let aktionText = shortenReasonText(
        actionResult.transactionDiagnostics?.blockReason || 'none',
        actionResult.title || market.szenarioText
    );
    if (totalGoldKauf > 0) aktionText += " / Rebal.(G+)";
    if (kaufAktTotal > 0) aktionText += " / Rebal.(A+)";

    const inflFactorThisYear = 1 + (yearData.inflation / 100);
    const naechsterBaseFloor = baseFloor * inflFactorThisYear;
    const naechsterBaseFlex = baseFlex * inflFactorThisYear;

    const widowAdjFactor = 1 + (rentAdjPct / 100);
    const nextWidowPensionP1 = widowBenefits.p1FromP2 ? Math.max(0, widowPensionP1 * widowAdjFactor) : 0;
    const nextWidowPensionP2 = widowBenefits.p2FromP1 ? Math.max(0, widowPensionP2 * widowAdjFactor) : 0;

    const nextAnnualPension = currentAnnualPension * (1 + rentAdjPct / 100);
    const nextAnnualPension2 = currentAnnualPension2 * (1 + rentAdjPct / 100);

    return {
        isRuin: false,
        newState: {
            portfolio: { ...portfolio, liquiditaet },
            baseFloor: naechsterBaseFloor,
            baseFlex: naechsterBaseFlex,
            lastState: spendingNewState,
            currentAnnualPension: nextAnnualPension,
            currentAnnualPension2: nextAnnualPension2,
            marketDataHist: newMarketDataHist,
            samplerState: currentState.samplerState,
            widowPensionP1: nextWidowPensionP1,
            widowPensionP2: nextWidowPensionP2
        },
        logData: {
            entscheidung: {
                ...spendingResult,
                jahresEntnahme,
                runwayMonths: fullResult.ui.runway?.months || Infinity,
                kuerzungProzent: spendingResult.kuerzungProzent
            },
            FlexRatePct: spendingResult.details?.flexRate || 1.0,
            CutReason: spendingResult.kuerzungQuelle || 'none',
            Alarm: spendingNewState.alarmActive || false,
            Regime: spendingNewState.lastMarketSKey || 'unknown',
            QuoteEndPct: (spendingResult.details?.entnahmequoteDepot || 0) * 100,
            RunwayCoveragePct: fullResult.ui.liquiditaet?.deckungNachher || 100,
            RealReturnEquityPct: (1 + rA) / (1 + yearData.inflation / 100) - 1,
            RealReturnGoldPct: (1 + rG) / (1 + yearData.inflation / 100) - 1,
            entnahmequote: depotwertGesamt > 0 ? (jahresEntnahme / depotwertGesamt) : 0,
            steuern_gesamt: totalTaxesThisYear,
            vk,
            kaufAkt: kaufAktTotal,
            kaufGld: totalGoldKauf,
            wertAktien: sumDepot({ depotTranchesAktien }),
            wertGold: sumDepot({ depotTranchesGold }),
            liquiditaet,
            liqStart: liqStartVorZins,
            cashInterestEarned: cashZinsen,
            liqEnd: liqNachZins,
            aktionUndGrund: aktionText,
            usedSPB: actionResult.pauschbetragVerbraucht || 0,
            floor_brutto: effectiveBaseFloor,
            pension_annual: pensionAnnual,
            rente1,
            rente2,
            renteSum,
            floor_aus_depot: inflatedFloor,
            flex_brutto: inflatedFlex,
            flex_erfuellt_nominal: jahresEntnahme > inflatedFloor ? jahresEntnahme - inflatedFloor : 0,
            inflation_factor_cum: spendingNewState.cumulativeInflationFactor || 1,
            jahresentnahme_real: jahresEntnahme / (spendingNewState.cumulativeInflationFactor || 1),
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
            NeedLiq: Math.round(need),
            GuardGold: Math.round(guardSellGold),
            GuardEq: Math.round(guardSellEq),
            GuardNote: guardReason,
            Person1Alive: p1Alive ? 1 : 0,
            Person2Alive: p2Alive ? 1 : 0,
            pflege_floor_anchor: pflegeMeta?.log_floor_anchor ?? 0,
            pflege_maxfloor_anchor: pflegeMeta?.log_maxfloor_anchor ?? 0,
            pflege_cap_zusatz: pflegeMeta?.log_cap_zusatz ?? 0,
            CareP1_Active: 0,
            CareP1_Cost: 0,
            CareP1_Grade: null,
            CareP1_GradeLabel: '',
            CareP2_Active: 0,
            CareP2_Cost: 0,
            CareP2_Grade: null,
            CareP2_GradeLabel: ''
        },
        totalTaxesThisYear
    };
}

// Exportiere alle Helper-Funktionen die auch von simulator-engine.js exportiert werden
export {
    initializePortfolio as initMcRunState,
    normalizeHouseholdContext,
    computeLiqNeedForFloor,
    euros
};

// Die restlichen Export-Funktionen müssen aus simulator-engine.js importiert werden
// da sie unverändert bleiben
export {
    makeDefaultCareMeta,
    sampleNextYearData,
    computeRunStatsFromSeries,
    calcCareCost,
    computeHouseholdFlexFactor,
    computeCareMortalityMultiplier,
    updateCareMeta
} from './simulator-engine.js';

/**
 * Hilfsfunktion für CAPE-Ratio Resolution
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
