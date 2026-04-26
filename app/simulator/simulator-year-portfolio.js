/**
 * Module: Simulator Year Portfolio
 * Purpose: DOM-free market and portfolio progression helpers for one simulator year.
 */
"use strict";

import { sumDepot } from './simulator-portfolio.js';
import { resolveCapeRatio } from './simulator-engine-direct-utils.js';
import { isBondCategory, sumBondBucketValuation } from '../../engine/transactions/three-bucket-logic.mjs';

export function readYearReturnRates(yearData = {}) {
    return {
        rA: isFinite(yearData.rendite) ? yearData.rendite : 0,
        rG: isFinite(yearData.gold_eur_perf) ? yearData.gold_eur_perf / 100 : 0,
        rC: isFinite(yearData.zinssatz) ? yearData.zinssatz / 100 : 0
    };
}

/**
 * Mutates the passed portfolio by applying this year's equity/bond/gold returns.
 */
export function applyAnnualReturnsToPortfolio({ portfolio, yearData, threeBucketInput }) {
    const { rA, rG, rC } = readYearReturnRates(yearData);
    const depotTranchesAktien = portfolio.depotTranchesAktien || [];
    const depotTranchesGold = portfolio.depotTranchesGold || [];
    const bondBucketBefore = sumBondBucketValuation(depotTranchesAktien);
    const equityBeforeReturn = sumDepot({ depotTranchesAktien });
    const goldBeforeReturn = sumDepot({ depotTranchesGold });

    for (let i = 0; i < depotTranchesAktien.length; i++) {
        const tranche = depotTranchesAktien[i];
        const isBond = isBondCategory(tranche.type) || isBondCategory(tranche.category);
        const trancheReturn = isBond ? threeBucketInput.bondNominalReturn : rA;
        tranche.marketValue *= (1 + trancheReturn);
    }
    for (let i = 0; i < depotTranchesGold.length; i++) {
        depotTranchesGold[i].marketValue *= (1 + rG);
    }

    return {
        rA,
        rG,
        rC,
        bondBucketBefore,
        equityBeforeReturn,
        goldBeforeReturn,
        equityAfterReturn: sumDepot({ depotTranchesAktien }),
        goldAfterReturn: sumDepot({ depotTranchesGold })
    };
}

export function buildCurrentYearMarketData({ yearData, inputs, marketDataHist, rA }) {
    const resolvedCapeRatio = resolveCapeRatio(
        yearData.capeRatio,
        inputs.capeRatio,
        inputs.marketCapeRatio ?? marketDataHist.capeRatio
    );
    const marketEnd = marketDataHist.endeVJ * (1 + rA);
    return {
        resolvedCapeRatio,
        marketEnd,
        marketDataCurrentYear: {
            ...marketDataHist,
            inflation: yearData.inflation,
            capeRatio: resolvedCapeRatio,
            endeVJ_3: marketDataHist.endeVJ_2,
            endeVJ_2: marketDataHist.endeVJ_1,
            endeVJ_1: marketDataHist.endeVJ,
            endeVJ: marketEnd
        }
    };
}

export function buildNextMarketDataHist({ marketDataHist, yearData, rA, resolvedCapeRatio }) {
    const marketEnd = marketDataHist.endeVJ * (1 + rA);
    const newAth = Math.max(marketDataHist.ath, marketEnd);
    return {
        endeVJ: marketEnd,
        endeVJ_1: marketDataHist.endeVJ,
        endeVJ_2: marketDataHist.endeVJ_1,
        endeVJ_3: marketDataHist.endeVJ_2,
        ath: newAth,
        jahreSeitAth: (marketEnd < newAth) ? marketDataHist.jahreSeitAth + 1 : 0,
        inflation: yearData.inflation,
        capeRatio: resolvedCapeRatio
    };
}

