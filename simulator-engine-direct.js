import {
    applySaleToPortfolio,
    buildInputsCtxFromPortfolio,
    buyGold,
    buyStocksNeu,
    initializePortfolio,
    summarizeSalesByAsset,
    sumDepot
} from './simulator-portfolio.js';
import { resolveProfileKey } from './simulator-heatmap.js';
import { calculateTargetLiquidityBalanceLike, buildDetailedTranchesFromPortfolio, computeLiqNeedForFloor, euros, normalizeHouseholdContext, resolveCapeRatio } from './simulator-engine-direct-utils.js';
import { shortenReasonText } from './simulator-utils.js';
import { calculateSaleAndTax } from './engine/transactions/sale-engine.mjs';

const formatInteger = (value) => Number.isFinite(value) ? Math.round(value) : 0;

/**
 * FAIL-SAFE Liquidity Guard - Hilfsfunktionen
 */

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
        baseFlexBudgetAnnual = 0,
        baseFlexBudgetRecharge = 0,
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
    let initialLiqStart = euros(liquiditaet);
    let cashZinsen = 0;
    let liqNachZins = initialLiqStart;
    let totalTaxesThisYear = 0;
    let plannedTaxesThisYear = 0;
    let forcedTaxesThisYear = 0;

    const rA = isFinite(yearData.rendite) ? yearData.rendite : 0;
    const rG = isFinite(yearData.gold_eur_perf) ? yearData.gold_eur_perf / 100 : 0;
    const rC = isFinite(yearData.zinssatz) ? yearData.zinssatz / 100 : 0;
    const equityBeforeReturn = sumDepot({ depotTranchesAktien });
    const goldBeforeReturn = sumDepot({ depotTranchesGold });

    // Renditen anwenden
    for (let i = 0; i < depotTranchesAktien.length; i++) {
        depotTranchesAktien[i].marketValue *= (1 + rA);
    }
    for (let i = 0; i < depotTranchesGold.length; i++) {
        depotTranchesGold[i].marketValue *= (1 + rG);
    }
    const equityAfterReturn = sumDepot({ depotTranchesAktien });
    const goldAfterReturn = sumDepot({ depotTranchesGold });

    const resolvedCapeRatio = resolveCapeRatio(yearData.capeRatio, inputs.marketCapeRatio, marketDataHist.capeRatio);

    // FIX (Redux): Calculate current market end value for Regime Detection
    // Shift the historical window by 1 year so 'endeVJ' reflects the value AFTER this year's returns.
    // This allows the Engine to see the crash (e.g. 2008) in the year it happens.
    // FIX (Redux): Calculate current market end value for Regime Detection
    // Shift the historical window by 1 year so 'endeVJ' reflects the value AFTER this year's returns.
    // This allows the Engine to see the crash (e.g. 2008) in the year it happens.
    //
    // CRITICAL FIX: Always calculate synthetically!
    // We cannot use HISTORICAL_DATA[yearData.jahr] because in Monte Carlo, the sampled year 
    // has an absolute index value unrelated to the current synthetic simulation state.
    const marketEnd = marketDataHist.endeVJ * (1 + rA);

    const marketDataCurrentYear = {
        ...marketDataHist,
        inflation: yearData.inflation,
        capeRatio: resolvedCapeRatio,
        endeVJ_3: marketDataHist.endeVJ_2,
        endeVJ_2: marketDataHist.endeVJ_1,
        endeVJ_1: marketDataHist.endeVJ,
        endeVJ: marketEnd
    };

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
        const zielLiquiditaet = calculateTargetLiquidityBalanceLike(
            inputs,
            marketDataCurrentYear,
            effectiveBaseFloor,
            baseFlex,
            currentAnnualPension + currentAnnualPension2
        );
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
        const naechsterFlexBudgetAnnual = euros(baseFlexBudgetAnnual * (1 + yearData.inflation / 100));
        const naechsterFlexBudgetRecharge = euros(baseFlexBudgetRecharge * (1 + yearData.inflation / 100));

        const marketEnd = marketDataHist.endeVJ * (1 + rA);
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
                baseFlexBudgetAnnual: naechsterFlexBudgetAnnual,
                baseFlexBudgetRecharge: naechsterFlexBudgetRecharge,
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
                liqStart: euros(initialLiqStart),
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

    // FIX: Do NOT add pension to liquidity explicitly!
    // The Engine nets pension against usage (monatlicheEntnahme = Bedarf - Pension).
    // Adding it here would count it twice (once as reduced withdrawal, once as cash injection).
    // liquiditaet += pensionAnnual;  <-- REMOVED

    // Use TOTAL pension to calculate household floor/flex coverage
    const pensionSurplus = Math.max(0, pensionAnnual - effectiveBaseFloor);
    const inflatedFloor = Math.max(0, effectiveBaseFloor - pensionAnnual);
    const inflatedFlex = Math.max(0, (baseFlex * temporaryFlexFactor) - pensionSurplus);

    const depotwertGesamt = sumDepot(portfolio);
    const totalWealth = depotwertGesamt + liquiditaet;

    // Calculate reduced floor/flex for FAIL-SAFE Guard (NOT for engine input!)
    // The engine calculates this internally, but we need it for emergency guard logic
    // (Variables already calculated above: pensionSurplus, inflatedFloor, inflatedFlex)

    // ==========================================
    // DIREKTE ENGINE API - SINGLE CALL
    // ==========================================

    // Baue EngineAPI-Input auf - WICHTIG: Verwende buildInputsCtxFromPortfolio() wie der Adapter!
    // FIX: Pass FULL pension for correct context (though we override specific fields below)
    const inputsCtx = buildInputsCtxFromPortfolio(inputs, portfolio, {
        pensionAnnual: pensionAnnual,  // FIX: Total Hosehold Pension
        marketData: marketDataCurrentYear
    });

    const detailedTranches = buildDetailedTranchesFromPortfolio(portfolio);
    const engineInput = {
        ...inputsCtx,
        aktuelleLiquiditaet: liquiditaet, // FIX: Override with tracked local liquidity (inputsCtx has stale portfolio cash)
        aktuellesAlter: inputs.startAlter + yearIndex,
        inflation: yearData.inflation,

        // FIX: Engine expects GROSS Floor/Flex and TOTAL Pension to do its own netting calculation.
        // If we pass Net Floor (inflatedFloor), Engine subtracts pension AGAIN, leading to zero demand.
        floorBedarf: effectiveBaseFloor,
        flexBedarf: baseFlex * temporaryFlexFactor,
        flexBudgetAnnual: baseFlexBudgetAnnual,
        flexBudgetYears: inputs.flexBudgetYears ?? 0,
        flexBudgetRecharge: baseFlexBudgetRecharge,

        // FIX: Ensure Engine knows about the Total Pension used for netting
        renteAktiv: pensionAnnual > 0,
        renteMonatlich: pensionAnnual / 12,

        marketCapeRatio: resolvedCapeRatio,

        // DEFAULT VALUES TO PREVENT NaN (Fix for Bug 4: Liquidity Evaporation)
        rebalancingBand: inputs.rebalancingBand ?? 35,
        targetEq: inputs.targetEq ?? 60,
        goldZielProzent: inputs.goldAktiv ? (inputs.goldZielProzent ?? 10) : 0,
        maxSkimPctOfEq: inputs.maxSkimPctOfEq ?? 5,
        maxBearRefillPctOfEq: inputs.maxBearRefillPctOfEq ?? 5,
        runwayTargetMonths: inputs.runwayTargetMonths ?? 36,
        runwayMinMonths: inputs.runwayMinMonths ?? 12,

        // WICHTIG: Historische Marktdaten für Regime-Erkennung (ATH, Drawdown)
        // FIX für 2008-Diskrepanz:
        // Die Engine entscheidet "am Ende des Jahres" (oder Anfang des nächsten) über Rebalancing.
        // Daher muss sie den aktuellen Marktstand (nach Crash) kennen.
        // Wir nutzen 'marketDataCurrentYear', das den aktuellen Kurs als 'endeVJ' enthält.
        endeVJ: marketDataCurrentYear.endeVJ || 0,
        endeVJ_1: marketDataCurrentYear.endeVJ_1 || 0,
        endeVJ_2: marketDataCurrentYear.endeVJ_2 || 0,
        endeVJ_3: marketDataCurrentYear.endeVJ_3 || 0,
        ath: marketDataCurrentYear.ath || marketDataHist.ath || 0,
        jahreSeitAth: marketDataCurrentYear.jahreSeitAth || marketDataHist.jahreSeitAth || 0
    };
    if (detailedTranches.length) {
        engineInput.detailledTranches = detailedTranches;
    }


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

    const allQuellen = Array.isArray(actionResult.quellen) ? actionResult.quellen : [];
    let saleQuellen = allQuellen.filter(q => q?.kind && q.kind !== 'liquiditaet');
    let plannedSaleBrutto = saleQuellen.reduce((sum, q) => sum + (q?.brutto || 0), 0);
    let hasSales = plannedSaleBrutto > 0;
    let buyGoldAmount = 0;
    let buyEqAmount = 0;

    // Check if this is a cash-funded transaction (Surplus Rebalancing)
    // In this case, we DON'T sell assets - we BUY them using liquidity
    const cashQuellen = allQuellen.filter(q => q?.kind === 'liquiditaet');
    const isCashFundedPurchase = cashQuellen.length > 0 && !hasSales &&
        (actionResult.verwendungen?.gold > 0 || actionResult.verwendungen?.aktien > 0);

    // Wende Transaktionen auf Portfolio an
    // FIX: Only infer sales from nettoErlös if this is NOT a cash-funded purchase
    // (Surplus Rebalancing uses liquidity to BUY assets, not sell them)
    if (actionResult.type === 'TRANSACTION' && !hasSales && actionResult.nettoErlös > 0 && !isCashFundedPurchase) {
        const inferredBrutto = (actionResult.nettoErlös || 0) + (actionResult.steuer || 0);
        if (inferredBrutto > 0) {
            saleQuellen = [{
                kind: 'aktien_alt',
                brutto: inferredBrutto,
                steuer: actionResult.steuer || 0,
                trancheId: null,
                name: null,
                isin: null,
                netto: actionResult.nettoErlös || 0
            }];
            plannedSaleBrutto = inferredBrutto;
            hasSales = true;
        }
    }

    if (actionResult.type === 'TRANSACTION' && hasSales) {
        const saleResult = {
            steuerGesamt: actionResult.steuer || 0,
            bruttoVerkaufGesamt: plannedSaleBrutto,
            achievedRefill: actionResult.nettoErlös || 0,
            breakdown: saleQuellen
        };

        plannedTaxesThisYear += saleResult.steuerGesamt;
        applySaleToPortfolio(portfolio, saleResult);
    }
    const equityAfterSalesAction = sumDepot({ depotTranchesAktien });
    const goldAfterSalesAction = sumDepot({ depotTranchesGold });

    // Cash-funded Käufe (Quelle: Liquidität) reduzieren die Liquidität direkt.
    const cashSpend = allQuellen.reduce(
        (sum, q) => (q?.kind === 'liquiditaet' ? sum + (q.brutto || 0) : sum),
        0
    );
    if (cashSpend > 0) {
        liquiditaet -= cashSpend;
    }

    // FIX: For cash-funded purchases (Surplus Rebalancing), set buy amounts directly
    if (isCashFundedPurchase) {
        buyGoldAmount = actionResult.verwendungen?.gold || 0;
        buyEqAmount = actionResult.verwendungen?.aktien || 0;
    }

    // Aktualisiere Liquidität nach Transaktionen
    if (hasSales && actionResult.nettoErlös > 0) {
        const reinvestedPlanned = (actionResult.verwendungen?.gold || 0) + (actionResult.verwendungen?.aktien || 0);
        const executedEqSale = Math.max(0, equityAfterReturn - equityAfterSalesAction);
        const executedGldSale = Math.max(0, goldAfterReturn - goldAfterSalesAction);
        const executedTotalSale = executedEqSale + executedGldSale;
        const saleScale = plannedSaleBrutto > 0 ? Math.min(1, executedTotalSale / plannedSaleBrutto) : 0;
        const actualNettoErlos = (actionResult.nettoErlös || 0) * saleScale;
        const actualReinvested = reinvestedPlanned * saleScale;
        buyGoldAmount = (actionResult.verwendungen?.gold || 0) * saleScale;
        buyEqAmount = (actionResult.verwendungen?.aktien || 0) * saleScale;
        liquiditaet += Math.max(0, actualNettoErlos - actualReinvested);
    }

    const jahresEntnahme = spendingResult.monatlicheEntnahme * 12;
    const jahresEntnahmePlan = jahresEntnahme;

    // RUIN-Check: Können wir zumindest den Floor decken?
    // Berechnung des Netto-Floors (Floor - Rente)
    const netFloorYear = Math.max(0, engineInput.floorBedarf - pensionAnnual);

    // FIX: forcedShortfall muss die TATSÄCHLICHE Entnahme abdecken, nicht nur den Floor.
    // Sonst kann bei Flex-Ausgaben ein Liquiditätsengpass entstehen.
    // Zusätzlich: Mindest-Puffer für das nächste Jahr einplanen (1 Monat Floor-Deckung),
    // um emergency_guard am Jahresende zu vermeiden.
    const jahresEntnahmeTarget = Math.max(jahresEntnahmePlan, netFloorYear);
    const minLiqAfterPayout = netFloorYear / 12; // 1 Monat Mindest-Liquidität nach Auszahlung
    const totalLiqNeed = jahresEntnahmeTarget + minLiqAfterPayout;
    const forcedShortfall = Math.max(0, totalLiqNeed - liquiditaet);
    const equityBeforeForced = equityAfterSalesAction;
    const goldBeforeForced = goldAfterSalesAction;
    if (forcedShortfall > 0) {
        // FIX: Build CURRENT tranches from portfolio (not stale engineInput.detailledTranches)
        // This ensures we use up-to-date marketValue after any prior sales in this year
        const currentTranches = buildDetailedTranchesFromPortfolio(portfolio);
        const forcedInputWithCurrentTranches = {
            ...engineInput,
            detailledTranches: currentTranches.length > 0 ? currentTranches : undefined,
            // Also update the fallback fields with current values
            depotwertAlt: sumDepot({ depotTranchesAktien: depotTranchesAktien.filter(t => t.type === 'aktien_alt') }),
            depotwertNeu: sumDepot({ depotTranchesAktien: depotTranchesAktien.filter(t => t.type === 'aktien_neu') }),
            goldWert: sumDepot({ depotTranchesGold })
        };
        const forcedSale = calculateSaleAndTax(forcedShortfall, forcedInputWithCurrentTranches, { minGold: 0 }, market, true);
        const forcedBrutto = forcedSale.bruttoVerkaufGesamt || 0;
        if (forcedBrutto > 0) {
            const baseBreakdown = Array.isArray(forcedSale.breakdown) && forcedSale.breakdown.length > 0
                ? forcedSale.breakdown
                : [{
                    kind: 'aktien_alt',
                    brutto: forcedBrutto,
                    steuer: forcedSale.steuerGesamt || 0,
                    netto: forcedSale.achievedRefill || 0,
                    trancheId: null,
                    isin: null,
                    name: null
                }];
            const fallbackBreakdown = baseBreakdown.map(item => ({
                ...item,
                trancheId: null,
                isin: null,
                name: null
            }));
            applySaleToPortfolio(portfolio, { ...forcedSale, breakdown: fallbackBreakdown });
            const equityAfterForced = sumDepot({ depotTranchesAktien });
            const goldAfterForced = sumDepot({ depotTranchesGold });
            const forcedExecutedEq = Math.max(0, equityBeforeForced - equityAfterForced);
            const forcedExecutedGld = Math.max(0, goldBeforeForced - goldAfterForced);
            const forcedExecutedTotal = forcedExecutedEq + forcedExecutedGld;
            const forcedScale = forcedBrutto > 0 ? Math.min(1, forcedExecutedTotal / forcedBrutto) : 0;
            liquiditaet += (forcedSale.achievedRefill || 0) * forcedScale;
            forcedTaxesThisYear += (forcedSale.steuerGesamt || 0) * forcedScale;
        } else {
            const fallbackBreakdown = [{
                kind: 'aktien_alt',
                brutto: forcedShortfall,
                steuer: 0,
                netto: forcedShortfall,
                trancheId: null,
                isin: null,
                name: null
            }];
            applySaleToPortfolio(portfolio, { steuerGesamt: 0, bruttoVerkaufGesamt: forcedShortfall, achievedRefill: forcedShortfall, breakdown: fallbackBreakdown });
            const equityAfterForced = sumDepot({ depotTranchesAktien });
            const goldAfterForced = sumDepot({ depotTranchesGold });
            const forcedExecutedEq = Math.max(0, equityBeforeForced - equityAfterForced);
            const forcedExecutedGld = Math.max(0, goldBeforeForced - goldAfterForced);
            const forcedExecutedTotal = forcedExecutedEq + forcedExecutedGld;
            liquiditaet += Math.min(forcedShortfall, forcedExecutedTotal);
        }
    }

    if (forcedShortfall > 0) {
        const equityAfterForcedFallback = sumDepot({ depotTranchesAktien });
        const goldAfterForcedFallback = sumDepot({ depotTranchesGold });
        const forcedExecutedEq = Math.max(0, equityBeforeForced - equityAfterForcedFallback);
        const forcedExecutedGld = Math.max(0, goldBeforeForced - goldAfterForcedFallback);
        const forcedExecutedTotal = forcedExecutedEq + forcedExecutedGld;
        if (forcedExecutedTotal < 1) {
            const reduceAcrossTranches = (tranches, amount, useFifo) => {
                let remaining = Number(amount) || 0;
                if (!Array.isArray(tranches) || remaining <= 0) return 0;
                const ordered = useFifo
                    ? [...tranches].sort((a, b) => new Date(a.purchaseDate || '1900-01-01') - new Date(b.purchaseDate || '1900-01-01'))
                    : tranches;
                let reduced = 0;
                for (const t of ordered) {
                    if (remaining <= 0) break;
                    const mv = Number(t.marketValue) || 0;
                    if (mv <= 0) continue;
                    const reduction = Math.min(remaining, mv);
                    const reductionRatio = mv > 0 ? reduction / mv : 0;
                    t.costBasis -= t.costBasis * reductionRatio;
                    t.marketValue -= reduction;
                    remaining -= reduction;
                    reduced += reduction;
                }
                return reduced;
            };
            const reducedEq = reduceAcrossTranches(depotTranchesAktien, forcedShortfall, true);
            const remaining = Math.max(0, forcedShortfall - reducedEq);
            const reducedGld = reduceAcrossTranches(depotTranchesGold, remaining, false);
            liquiditaet += Math.min(forcedShortfall, reducedEq + reducedGld);
        }
    }

    const equityAfterSales = sumDepot({ depotTranchesAktien });
    const goldAfterSales = sumDepot({ depotTranchesGold });

    // Kaufe Gold/Aktien wenn vorhanden
    if (buyGoldAmount > 0) {
        buyGold(portfolio, buyGoldAmount);
    }
    if (buyEqAmount > 0) {
        buyStocksNeu(portfolio, buyEqAmount);
    }
    let equityAfterBuys = sumDepot({ depotTranchesAktien });
    let goldAfterBuys = sumDepot({ depotTranchesGold });

    const totalWealthAvailable = equityAfterBuys + goldAfterBuys + liquiditaet;
    if (totalWealthAvailable + 1e-6 < netFloorYear) {
        return {
            isRuin: true,
            reason: `Gesamtvermögen (${formatInteger(totalWealthAvailable)}) < Floor (${formatInteger(netFloorYear)})`
        };
    }

    // Hinweis: Ein Liquiditäts-Engpass erzeugt keinen Ruin, solange das Gesamtvermögen den Floor deckt.
    // Payout wird unten an die Liquidität angepasst.

    // Auszahlung (begrenzt auf verfügbare Liquidität)
    // Hinweis: jahresEntnahmeTarget wurde bereits oben für forcedShortfall berechnet
    const payout = Math.min(liquiditaet, jahresEntnahmeTarget);
    liquiditaet -= payout;
    const jahresEntnahmeEffektiv = payout;

    // FIX: If payout is less than needed floor, but we HAVE enough total wealth (checked above),
    // we must force additional sales to cover the floor. This handles cases where the
    // forcedShortfall mechanism didn't sell enough due to stale data or other edge cases.
    if (jahresEntnahmeEffektiv + 1e-6 < netFloorYear) {
        const additionalNeeded = netFloorYear - jahresEntnahmeEffektiv;
        const currentEquity = sumDepot({ depotTranchesAktien });
        const currentGold = sumDepot({ depotTranchesGold });

        // Only declare RUIN if there truly isn't enough total wealth
        if (currentEquity + currentGold < additionalNeeded) {
            return {
                isRuin: true,
                reason: `Entnahme (${formatInteger(jahresEntnahmeEffektiv)}) < Floor (${formatInteger(netFloorYear)}) und nicht genug Assets`
            };
        }

        // Force emergency sale to cover shortfall
        const reduceAcrossTranches = (tranches, amount, useFifo) => {
            let remaining = Number(amount) || 0;
            if (!Array.isArray(tranches) || remaining <= 0) return 0;
            const ordered = useFifo
                ? [...tranches].sort((a, b) => new Date(a.purchaseDate || '1900-01-01') - new Date(b.purchaseDate || '1900-01-01'))
                : tranches;
            let reduced = 0;
            for (const t of ordered) {
                if (remaining <= 0) break;
                const mv = Number(t.marketValue) || 0;
                if (mv <= 0) continue;
                const reduction = Math.min(remaining, mv);
                const reductionRatio = mv > 0 ? reduction / mv : 0;
                t.costBasis -= t.costBasis * reductionRatio;
                t.marketValue -= reduction;
                remaining -= reduction;
                reduced += reduction;
            }
            return reduced;
        };

        // Sell from equity first, then gold
        const reducedEq = reduceAcrossTranches(depotTranchesAktien, additionalNeeded, true);
        const remainingAfterEq = Math.max(0, additionalNeeded - reducedEq);
        const reducedGld = reduceAcrossTranches(depotTranchesGold, remainingAfterEq, false);
        const totalReduced = reducedEq + reducedGld;

        // Add the sold amount to liquidity and then pay out
        liquiditaet += payout; // Undo the payout subtraction
        liquiditaet += totalReduced; // Add new sales
        const newPayout = Math.min(liquiditaet, netFloorYear);
        liquiditaet -= newPayout;
        // Note: We continue with reduced payout but don't declare RUIN since we have the wealth
    }

    // Rebalancing bei Überschuss
    // HINWEIS: Die Logik wurde in die TransactionEngine (determineAction) verschoben,
    // um Simulator und Balance App zu harmonisieren (Surplus Rebalancing nur in guten Märkten).
    // simulator-engine-direct.js verlässt sich nun rein auf die Engine-Ergebnisse.
    let kaufAkt = 0, kaufGld = 0;
    // (Legacy Block entfernt)

    // Cash-Verzinsung
    // Cash-Verzinsung
    const liqBasisForInterest = euros(liquiditaet);
    cashZinsen = euros(liqBasisForInterest * rC);
    liquiditaet = euros(liqBasisForInterest * (1 + rC));
    liqNachZins = euros(liquiditaet);
    if (!isFinite(liquiditaet)) liquiditaet = 0;

    // FAIL-SAFE LIQUIDITY GUARD (vereinfacht, da Engine bereits Guard hat)
    // Diese Guard ist nur für extreme Notfälle wo Engine fehlschlägt
    let guardSellGold = 0, guardSellEq = 0, guardReason = "";
    const guardCtx = { inflatedFloor, inputs };
    const need = computeLiqNeedForFloor(guardCtx);
    const floorCoveredByPension = inflatedFloor === 0;

    // Emergency Guard nur feuern, wenn wir weniger als 1 Monat Floor-Deckung haben (echter Notfall)
    const criticalLiqThreshold = netFloorYear / 12;
    if (!floorCoveredByPension && liquiditaet < criticalLiqThreshold) {
        guardReason = "emergency_guard_triggered";
        // In der direkten API-Version sollte dies nicht passieren,
        // da die Engine bereits Guardrails hat
        // console.warn('FAIL-SAFE Guard triggered in direct API version - this should not happen!');
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

    const plannedEqSale = vk.vkAkt || 0;
    const plannedGldSale = vk.vkGld || 0;
    const executedEqSale = Math.max(0, equityAfterReturn - equityAfterSalesAction);
    const executedGldSale = Math.max(0, goldAfterReturn - goldAfterSalesAction);

    // FIX: Only calculate taxes if there were ACTUAL executed sales
    // This prevents showing taxes when no sales occurred
    const totalExecutedSales = executedEqSale + executedGldSale;
    if (totalExecutedSales > 0) {
        const eqTaxFactor = plannedEqSale > 0 ? Math.min(1, executedEqSale / plannedEqSale) : 0;
        const gldTaxFactor = plannedGldSale > 0 ? Math.min(1, executedGldSale / plannedGldSale) : 0;
        totalTaxesThisYear = (vk.stAkt || 0) * eqTaxFactor + (vk.stGld || 0) * gldTaxFactor;
        if (totalTaxesThisYear === 0 && plannedTaxesThisYear > 0 && (plannedEqSale + plannedGldSale) > 0) {
            const ratio = Math.min(1, totalExecutedSales / (plannedEqSale + plannedGldSale));
            totalTaxesThisYear = plannedTaxesThisYear * ratio;
        }
    }
    // Always add forced taxes (from emergency sales to cover shortfall)
    totalTaxesThisYear += forcedTaxesThisYear;

    const kaufAktTotal = buyEqAmount + kaufAkt;
    const totalGoldKauf = buyGoldAmount + kaufGld;

    let aktionText = shortenReasonText(
        actionResult.transactionDiagnostics?.blockReason || 'none',
        actionResult.title || market.szenarioText
    );
    if (totalGoldKauf > 0) aktionText += " / Rebal.(G+)";
    if (kaufAktTotal > 0) aktionText += " / Rebal.(A+)";

    const inflFactorThisYear = 1 + (yearData.inflation / 100);
    const naechsterBaseFloor = baseFloor * inflFactorThisYear;
    const naechsterBaseFlex = baseFlex * inflFactorThisYear;
    const naechsterFlexBudgetAnnual = baseFlexBudgetAnnual * inflFactorThisYear;
    const naechsterFlexBudgetRecharge = baseFlexBudgetRecharge * inflFactorThisYear;

    const widowAdjFactor = 1 + (rentAdjPct / 100);
    const nextWidowPensionP1 = widowBenefits.p1FromP2 ? Math.max(0, widowPensionP1 * widowAdjFactor) : 0;
    const nextWidowPensionP2 = widowBenefits.p2FromP1 ? Math.max(0, widowPensionP2 * widowAdjFactor) : 0;

    const nextAnnualPension = currentAnnualPension * (1 + rentAdjPct / 100);
    const nextAnnualPension2 = currentAnnualPension2 * (1 + rentAdjPct / 100);



    const nextPortfolio = { ...portfolio, liquiditaet };

    return {
        isRuin: false,
        portfolio: nextPortfolio,
        ui: {
            spending: spendingResult,
            action: actionResult,
            market: { sKey: spendingNewState.lastMarketSKey, ...yearData }, // Approximation
            zielLiquiditaet: 0, // Not tracked here?
            liquiditaet: { // Mock structure for UI compatibility
                vorher: initialLiqStart,
                nachher: liquiditaet,
                deckungNachher: (jahresEntnahmePlan > 0) ? ((liquiditaet / jahresEntnahmePlan) * 100) : 100
            },
            runway: { months: 999 } // Mock
        },
        newState: {
            portfolio: nextPortfolio,
            baseFloor: naechsterBaseFloor,
            baseFlex: naechsterBaseFlex,
            baseFlexBudgetAnnual: naechsterFlexBudgetAnnual,
            baseFlexBudgetRecharge: naechsterFlexBudgetRecharge,
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
                jahresEntnahme: jahresEntnahmeEffektiv,
                jahresEntnahme_plan: jahresEntnahmePlan,
                runwayMonths: fullResult.ui.runway?.months || Infinity,
                kuerzungProzent: spendingResult.kuerzungProzent
            },
            FlexRatePct: spendingResult.details?.flexRate || 1.0,
            MinFlexRatePct: spendingResult.details?.minFlexRatePct ?? null,
            WealthRedF: Number.isFinite(spendingResult.details?.wealthReductionFactor)
                ? spendingResult.details.wealthReductionFactor * 100
                : null,
            WealthQuoteUsedPct: Number.isFinite(spendingResult.details?.entnahmequoteUsed)
                ? spendingResult.details.entnahmequoteUsed * 100
                : null,
            CutReason: spendingResult.kuerzungQuelle || 'none',
            Alarm: spendingNewState.alarmActive || false,
            Regime: spendingNewState.lastMarketSKey || 'unknown',
            QuoteEndPct: (spendingResult.details?.entnahmequoteDepot || 0) * 100,
            RunwayCoveragePct: fullResult.ui.liquiditaet?.deckungNachher || 100,
            RealReturnEquityPct: (1 + rA) / (1 + yearData.inflation / 100) - 1,
            RealReturnGoldPct: (1 + rG) / (1 + yearData.inflation / 100) - 1,
            NominalReturnEquityPct: rA,
            NominalReturnGoldPct: rG,
            entnahmequote: depotwertGesamt > 0 ? (jahresEntnahmeEffektiv / depotwertGesamt) : 0,
            steuern_gesamt: totalTaxesThisYear,
            vk,
            kaufAkt: kaufAktTotal,
            kaufGld: totalGoldKauf,
            wertAktien: sumDepot({ depotTranchesAktien }),
            wertGold: sumDepot({ depotTranchesGold }),
            liquiditaet,
            eq_before_return: equityBeforeReturn,
            eq_after_return: equityAfterReturn,
            eq_after_sales: equityAfterSales,
            eq_after_buys: equityAfterBuys,
            gold_before_return: goldBeforeReturn,
            gold_after_return: goldAfterReturn,
            gold_after_sales: goldAfterSales,
            gold_after_buys: goldAfterBuys,
            netTradeEq: equityAfterReturn - equityAfterBuys,
            executedSaleEq: equityAfterReturn - equityAfterSales,
            liqStart: initialLiqStart,
            cashInterestEarned: cashZinsen,
            liqEnd: liqNachZins,
            zielLiquiditaet: zielLiquiditaet || 0,
            aktionUndGrund: aktionText,
            usedSPB: actionResult.pauschbetragVerbraucht || 0,
            floor_brutto: effectiveBaseFloor,
            pension_annual: pensionAnnual,
            rente1,
            rente2,
            renteSum,
            floor_aus_depot: inflatedFloor,
            flex_brutto: inflatedFlex,
            flex_erfuellt_nominal: jahresEntnahmeEffektiv > inflatedFloor ? jahresEntnahmeEffektiv - inflatedFloor : 0,
            inflation_factor_cum: spendingNewState.cumulativeInflationFactor || 1,
            jahresentnahme_real: jahresEntnahmeEffektiv / (spendingNewState.cumulativeInflationFactor || 1),
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
} from './simulator-engine-helpers.js';

export { resolveCapeRatio };
