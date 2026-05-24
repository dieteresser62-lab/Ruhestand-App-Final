import { pickWorstRun } from './monte-carlo-runner-utils.js';
import { portfolioTotal } from './simulator-results.js';

export function createMonteCarloRunMetrics(runCount) {
    return {
        failCount: 0,
        pflegeTriggeredCount: 0,
        shortfallWithCareCount: 0,
        shortfallNoCareProxyCount: 0,
        p2TriggeredCount: 0,
        runsSafetyStage1Triggered: 0,
        runsSafetyStage2Triggered: 0,
        totalSimulatedYears: 0,
        totalYearsQuoteAbove45: 0,
        totalYearsSafetyStage1plus: 0,
        totalYearsSafetyStage2: 0,
        totalTaxSavedByLossCarry: 0,
        healthBucketEnabledCount: 0,
        healthBucketUsedCount: 0,
        healthBucketDepletedCount: 0,
        totalHealthBucketUsed: 0,
        entryAges: [],
        entryAgesP2: [],
        careDepotCosts: [],
        endWealthWithCareList: [],
        endWealthNoCareList: [],
        healthBucketUsedAmounts: [],
        healthBucketEndAmounts: [],
        healthBucketCoveragePct: [],
        healthBucketTargetGaps: [],
        healthBucketInterestAmounts: [],
        p1CareYearsArr: new Uint16Array(runCount),
        p2CareYearsArr: new Uint16Array(runCount),
        bothCareYearsArr: new Uint16Array(runCount),
        p1CareYearsTriggered: [],
        p2CareYearsTriggered: [],
        bothCareYearsTriggered: [],
        bothCareYearsOverlapTriggered: [],
        maxAnnualCareSpendTriggered: [],
        allRealWithdrawalsSample: [],
        runMeta: [],
        worstRun: null,
        worstRunCare: null
    };
}

export function recordMonteCarloRunOutcome(metrics, {
    i,
    runIdx,
    buffers,
    simState,
    failed,
    lebensdauer,
    jahreOhneFlex,
    kpiJahreMitKuerzungDieserLauf,
    kpiMaxKuerzungDieserLauf,
    totalTaxesThisRun,
    totalTaxSavedByLossCarryThisRun,
    depotOnlyStart,
    depotOnlyEnd,
    ruinOrDepleted,
    careEverActive,
    triggeredAge,
    triggeredAgeP2,
    p1CareYears,
    p2CareYears,
    bothCareYears,
    hasPartner,
    careMetaP1,
    careMetaP2,
    runSafetyStage1Ever,
    runSafetyStage2Ever,
    healthBucketEnabledThisRun = false,
    healthBucketUsedThisRun = 0,
    healthBucketEndThisRun = 0,
    healthBucketCoveragePctThisRun = null,
    healthBucketTargetGapThisRun = 0,
    healthBucketInterestThisRun = 0,
    currentRunLog
}) {
    const {
        finalOutcomes,
        depotErschoepft,
        taxOutcomes,
        kpiLebensdauer,
        kpiKuerzungsjahre,
        kpiMaxKuerzung,
        anteilJahreOhneFlex
    } = buffers;

    finalOutcomes[i] = failed ? 0 : portfolioTotal(simState.portfolio);
    depotErschoepft[i] = ruinOrDepleted ? 1 : 0;
    taxOutcomes[i] = totalTaxesThisRun;
    metrics.totalTaxSavedByLossCarry += totalTaxSavedByLossCarryThisRun;
    kpiLebensdauer[i] = lebensdauer;
    kpiKuerzungsjahre[i] = kpiJahreMitKuerzungDieserLauf;
    kpiMaxKuerzung[i] = kpiMaxKuerzungDieserLauf;
    anteilJahreOhneFlex[i] = lebensdauer > 0 ? jahreOhneFlex / lebensdauer : 0;

    if (careEverActive) {
        metrics.pflegeTriggeredCount++;
        metrics.entryAges.push(triggeredAge ?? 0);
        metrics.shortfallWithCareCount += ruinOrDepleted ? 1 : 0;
        metrics.endWealthWithCareList.push(finalOutcomes[i]);
        metrics.careDepotCosts.push(Math.max(0, depotOnlyStart - depotOnlyEnd));
        metrics.p1CareYearsTriggered.push(p1CareYears);
        metrics.bothCareYearsTriggered.push(bothCareYears);
        if (hasPartner) {
            metrics.p2CareYearsTriggered.push(p2CareYears);
            metrics.entryAgesP2.push(triggeredAgeP2 ?? 0);
        }
        const maxAnnualCareCost = Math.max(careMetaP1?.zusatzFloorZiel || 0, careMetaP2?.zusatzFloorZiel || 0);
        metrics.maxAnnualCareSpendTriggered.push(maxAnnualCareCost);
        metrics.bothCareYearsOverlapTriggered.push(bothCareYears);
    } else {
        metrics.endWealthNoCareList.push(finalOutcomes[i]);
        metrics.shortfallNoCareProxyCount += ruinOrDepleted ? 1 : 0;
    }

    metrics.p1CareYearsArr[i] = p1CareYears;
    metrics.p2CareYearsArr[i] = p2CareYears;
    metrics.bothCareYearsArr[i] = bothCareYears;
    if (p2CareYears > 0) metrics.p2TriggeredCount++;
    if (runSafetyStage1Ever) metrics.runsSafetyStage1Triggered++;
    if (runSafetyStage2Ever) metrics.runsSafetyStage2Triggered++;
    if (healthBucketEnabledThisRun) {
        metrics.healthBucketEnabledCount++;
        metrics.healthBucketEndAmounts.push(healthBucketEndThisRun);
        metrics.healthBucketTargetGaps.push(healthBucketTargetGapThisRun);
        if (Number.isFinite(Number(healthBucketCoveragePctThisRun))) {
            metrics.healthBucketCoveragePct.push(Number(healthBucketCoveragePctThisRun));
        }
        if (healthBucketEndThisRun <= 0) metrics.healthBucketDepletedCount++;
    }
    if (healthBucketUsedThisRun > 0) {
        metrics.healthBucketUsedCount++;
        metrics.healthBucketUsedAmounts.push(healthBucketUsedThisRun);
        metrics.totalHealthBucketUsed += healthBucketUsedThisRun;
    }
    if (healthBucketInterestThisRun > 0) {
        metrics.healthBucketInterestAmounts.push(healthBucketInterestThisRun);
    }

    metrics.runMeta.push({
        index: runIdx,
        endVermoegen: finalOutcomes[i],
        failed,
        lebensdauer,
        careEverActive,
        totalCareYears: p1CareYears + p2CareYears,
        totalCareCosts: Math.max(0, depotOnlyStart - depotOnlyEnd),
        healthBucketUsed: healthBucketUsedThisRun,
        healthBucketEnd: healthBucketEndThisRun,
        healthBucketCoveragePct: healthBucketCoveragePctThisRun,
        healthBucketTargetGap: healthBucketTargetGapThisRun,
        maxKuerzung: kpiMaxKuerzungDieserLauf,
        jahreOhneFlex,
        logDataRows: currentRunLog ? [...currentRunLog] : [],
        triggeredAge
    });

    metrics.worstRun = pickWorstRun(metrics.worstRun, {
        finalVermoegen: finalOutcomes[i],
        logDataRows: currentRunLog || [],
        failed,
        comboIdx: 0,
        runIdx
    });

    if (careEverActive) {
        metrics.worstRunCare = pickWorstRun(metrics.worstRunCare, {
            finalVermoegen: finalOutcomes[i],
            logDataRows: currentRunLog || [],
            failed,
            hasCare: true,
            comboIdx: 0,
            runIdx
        });
    }

    if (failed) metrics.failCount++;
}

export function finalizeMonteCarloRunMetrics(metrics) {
    const worstRun = metrics.worstRun || {
        finalVermoegen: Infinity,
        logDataRows: [],
        failed: false,
        comboIdx: 0,
        runIdx: 0
    };
    const worstRunCare = metrics.worstRunCare || {
        finalVermoegen: Infinity,
        logDataRows: [],
        failed: false,
        hasCare: false,
        comboIdx: 0,
        runIdx: 0
    };

    return {
        totals: {
            failCount: metrics.failCount,
            pflegeTriggeredCount: metrics.pflegeTriggeredCount,
            totalSimulatedYears: metrics.totalSimulatedYears,
            totalYearsQuoteAbove45: metrics.totalYearsQuoteAbove45,
            totalYearsSafetyStage1plus: metrics.totalYearsSafetyStage1plus,
            totalYearsSafetyStage2: metrics.totalYearsSafetyStage2,
            shortfallWithCareCount: metrics.shortfallWithCareCount,
            shortfallNoCareProxyCount: metrics.shortfallNoCareProxyCount,
            p2TriggeredCount: metrics.p2TriggeredCount,
            runsSafetyStage1Triggered: metrics.runsSafetyStage1Triggered,
            runsSafetyStage2Triggered: metrics.runsSafetyStage2Triggered,
            totalTaxSavedByLossCarry: metrics.totalTaxSavedByLossCarry,
            healthBucketEnabledCount: metrics.healthBucketEnabledCount,
            healthBucketUsedCount: metrics.healthBucketUsedCount,
            healthBucketDepletedCount: metrics.healthBucketDepletedCount,
            totalHealthBucketUsed: metrics.totalHealthBucketUsed
        },
        lists: {
            entryAges: metrics.entryAges,
            entryAgesP2: metrics.entryAgesP2,
            careDepotCosts: metrics.careDepotCosts,
            endWealthWithCareList: metrics.endWealthWithCareList,
            endWealthNoCareList: metrics.endWealthNoCareList,
            p1CareYearsTriggered: metrics.p1CareYearsTriggered,
            p2CareYearsTriggered: metrics.p2CareYearsTriggered,
            bothCareYearsOverlapTriggered: metrics.bothCareYearsOverlapTriggered,
            maxAnnualCareSpendTriggered: metrics.maxAnnualCareSpendTriggered,
            healthBucketUsedAmounts: metrics.healthBucketUsedAmounts,
            healthBucketEndAmounts: metrics.healthBucketEndAmounts,
            healthBucketCoveragePct: metrics.healthBucketCoveragePct,
            healthBucketTargetGaps: metrics.healthBucketTargetGaps,
            healthBucketInterestAmounts: metrics.healthBucketInterestAmounts
        },
        allRealWithdrawalsSample: metrics.allRealWithdrawalsSample,
        worstRun,
        worstRunCare,
        runMeta: metrics.runMeta
    };
}
