import { buyGold, buyStocksNeu, sumDepot } from './simulator-portfolio.js';
import { calculateTargetLiquidityBalanceLike, euros } from './simulator-engine-direct-utils.js';
import { buildNextMarketDataHist } from './simulator-year-portfolio.js';
import { sumBondBucketValuation } from '../../engine/transactions/three-bucket-logic.mjs';

export function isAccumulationYear(inputs, yearIndex) {
    return Boolean(inputs.accumulationPhase?.enabled && yearIndex < (inputs.transitionYear || 0));
}

/**
 * Mutates portfolio by applying cash interest, savings contributions and optional purchases.
 */
export function simulateAccumulationYear({
    currentState,
    inputs,
    yearData,
    yearIndex,
    portfolio,
    liquiditaet,
    initialLiqStart,
    rA,
    rG,
    rC,
    bondBucketBefore,
    marketDataCurrentYear,
    marketDataHist,
    resolvedCapeRatio,
    baseFloor,
    baseFlex,
    baseFlexBudgetAnnual,
    baseFlexBudgetRecharge,
    effectiveBaseFloor,
    currentAnnualPension,
    currentAnnualPension2,
    householdCtx,
    isBadYear
}) {
    let cashZinsen = euros(liquiditaet * rC);
    let liqNachZins = initialLiqStart;

    let sparrateThisYear = inputs.accumulationPhase.sparrate * 12;
    if (inputs.accumulationPhase.sparrateIndexing === 'inflation' && currentState.accumulationState) {
        const lastYearSparrate = currentState.accumulationState.sparrateThisYear || (inputs.accumulationPhase.sparrate * 12);
        sparrateThisYear = lastYearSparrate * (1 + yearData.inflation / 100);
    } else if (inputs.accumulationPhase.sparrateIndexing === 'wage' && currentState.accumulationState) {
        const lastYearSparrate = currentState.accumulationState.sparrateThisYear || (inputs.accumulationPhase.sparrate * 12);
        const wageGrowth = yearData.lohn || 2.0;
        sparrateThisYear = lastYearSparrate * (1 + wageGrowth / 100);
    }

    const rentAdjPct = inputs.rentAdjPct || 0;
    const nextP1 = (currentState.currentAnnualPension || 0) * (1 + rentAdjPct / 100);
    const nextP2 = (currentState.currentAnnualPension2 || 0) * (1 + rentAdjPct / 100);

    liquiditaet += cashZinsen;
    liqNachZins = euros(liquiditaet);
    liquiditaet += sparrateThisYear;

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
        const aktienAnteil = targetEq / 100;
        const goldAnteil = goldZielProzent / 100;
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

    const newMarketDataHist = buildNextMarketDataHist({ marketDataHist, yearData, rA, resolvedCapeRatio });
    const wertAktien = sumDepot({ depotTranchesAktien: portfolio.depotTranchesAktien });
    const wertGold = sumDepot({ depotTranchesGold: portfolio.depotTranchesGold });

    return {
        newState: {
            portfolio,
            baseFloor: euros(baseFloor * (1 + yearData.inflation / 100)),
            baseFlex: euros(baseFlex * (1 + yearData.inflation / 100)),
            baseFlexBudgetAnnual: euros(baseFlexBudgetAnnual * (1 + yearData.inflation / 100)),
            baseFlexBudgetRecharge: euros(baseFlexBudgetRecharge * (1 + yearData.inflation / 100)),
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
            vk: { vkAkt: 0, vkGld: 0, vkBnd: 0, stAkt: 0, stGld: 0, stBnd: 0, vkGes: 0, stGes: 0 },
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
            CareP2_GradeLabel: '',
            threeBucket: {
                isBadYear,
                bondBucketBefore: euros(bondBucketBefore),
                bondBucketAfter: euros(sumBondBucketValuation(portfolio.depotTranchesAktien)),
                bondRefillGross: 0,
                bondRefillNet: 0,
                bondRefillTax: 0,
                bondSaleAmount: 0,
                equityPreserved: 0
            }
        }
    };
}
