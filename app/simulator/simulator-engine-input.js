import { buildInputsCtxFromPortfolio } from './simulator-portfolio.js';
import { buildDetailedTranchesFromPortfolio } from './simulator-engine-direct-utils.js';

export function buildSimulatorEngineInput({
    inputs,
    portfolio,
    marketDataCurrentYear,
    marketDataHist,
    yearData,
    yearIndex,
    liquiditaet,
    effectiveBaseFloor,
    baseFlex,
    temporaryFlexFactor,
    baseFlexBudgetAnnual,
    baseFlexBudgetRecharge,
    pensionAnnual,
    resolvedCapeRatio
}) {
    const inputsCtx = buildInputsCtxFromPortfolio(inputs, portfolio, {
        pensionAnnual,
        marketData: marketDataCurrentYear
    });

    const detailedTranches = buildDetailedTranchesFromPortfolio(portfolio);
    const engineInput = {
        ...inputsCtx,
        aktuelleLiquiditaet: liquiditaet,
        aktuellesAlter: inputs.startAlter + yearIndex,
        inflation: yearData.inflation,

        // Engine expects gross demand and total pension; it performs netting internally.
        floorBedarf: effectiveBaseFloor,
        flexBedarf: baseFlex * temporaryFlexFactor,
        flexBudgetAnnual: baseFlexBudgetAnnual,
        flexBudgetYears: inputs.flexBudgetYears ?? 0,
        flexBudgetRecharge: baseFlexBudgetRecharge,

        renteAktiv: pensionAnnual > 0,
        renteMonatlich: pensionAnnual / 12,

        capeRatio: resolvedCapeRatio,
        marketCapeRatio: resolvedCapeRatio,

        rebalancingBand: inputs.rebalancingBand ?? 35,
        targetEq: inputs.targetEq ?? 60,
        goldZielProzent: inputs.goldAktiv ? (inputs.goldZielProzent ?? 10) : 0,
        maxSkimPctOfEq: inputs.maxSkimPctOfEq ?? 5,
        maxBearRefillPctOfEq: inputs.maxBearRefillPctOfEq ?? 5,
        runwayTargetMonths: inputs.runwayTargetMonths ?? 36,
        runwayMinMonths: inputs.runwayMinMonths ?? 12,

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

    return { engineInput, detailedTranches };
}
