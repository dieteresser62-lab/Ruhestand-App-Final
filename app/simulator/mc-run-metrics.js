import { pickWorstRun } from './monte-carlo-runner-utils.js';
import { portfolioTotal } from './simulator-results.js';
import { summarizeTailRiskEvents } from './tail-risk-overlay.js';

export function createMonteCarloCareNeedTracker() {
    return {
        p1CareAdditionalNeedRealEur: 0,
        p2CareAdditionalNeedRealEur: 0,
        totalCareAdditionalNeedRealEur: 0,
        maxAnnualCareAdditionalNeedRealEur: 0,
        p1CareAdditionalNeedNominalEur: 0,
        p2CareAdditionalNeedNominalEur: 0,
        totalCareAdditionalNeedNominalEur: 0,
        maxAnnualCareAdditionalNeedNominalEur: 0
    };
}

export function recordMonteCarloCareNeedYear(tracker, {
    p1CareAdditionalNeedNominalEur = 0,
    p2CareAdditionalNeedNominalEur = 0,
    priceFactor = 1
} = {}) {
    const normalizedPriceFactor = Number(priceFactor);
    if (!tracker || !Number.isFinite(normalizedPriceFactor) || normalizedPriceFactor <= 0) {
        throw new TypeError('Care-need tracking requires a positive finite price factor.');
    }
    const p1Nominal = Math.max(0, Number(p1CareAdditionalNeedNominalEur) || 0);
    const p2Nominal = Math.max(0, Number(p2CareAdditionalNeedNominalEur) || 0);
    const totalNominal = p1Nominal + p2Nominal;
    const p1Real = p1Nominal / normalizedPriceFactor;
    const p2Real = p2Nominal / normalizedPriceFactor;
    const totalReal = totalNominal / normalizedPriceFactor;

    tracker.p1CareAdditionalNeedNominalEur += p1Nominal;
    tracker.p2CareAdditionalNeedNominalEur += p2Nominal;
    tracker.totalCareAdditionalNeedNominalEur += totalNominal;
    tracker.maxAnnualCareAdditionalNeedNominalEur = Math.max(
        tracker.maxAnnualCareAdditionalNeedNominalEur,
        totalNominal
    );
    tracker.p1CareAdditionalNeedRealEur += p1Real;
    tracker.p2CareAdditionalNeedRealEur += p2Real;
    tracker.totalCareAdditionalNeedRealEur += totalReal;
    tracker.maxAnnualCareAdditionalNeedRealEur = Math.max(
        tracker.maxAnnualCareAdditionalNeedRealEur,
        totalReal
    );
    return tracker;
}

export function createMonteCarloRunMetrics(runCount) {
    return {
        failCount: 0,
        pflegeTriggeredCount: 0,
        p1TriggeredCount: 0,
        p2TriggeredCount: 0,
        shortfallWithCareCount: 0,
        shortfallNoCareProxyCount: 0,
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
        tailRiskRunsActiveCount: 0,
        tailRiskRunsAppliedCount: 0,
        tailRiskEventCount: 0,
        tailRiskEvaluatedYears: 0,
        tailRiskActiveYears: 0,
        tailRiskAppliedYears: 0,
        tailRiskSkippedHistoricalCrisisYears: 0,
        entryAges: [],
        entryAgesP2: [],
        p1CareAdditionalNeedRealEur: [],
        p2CareAdditionalNeedRealEur: [],
        totalCareAdditionalNeedRealEur: [],
        endWealthWithCareRealEur: [],
        endWealthNoCareRealEur: [],
        healthBucketUsedAmounts: [],
        healthBucketEndAmounts: [],
        healthBucketCoveragePct: [],
        healthBucketTargetGaps: [],
        healthBucketInterestAmounts: [],
        p1CareYearsTriggered: [],
        p2CareYearsTriggered: [],
        bothCareYearsOverlapTriggered: [],
        maxAnnualCareAdditionalNeedRealEur: [],
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
    finalValueRealEur,
    ruinOrDepleted,
    careEverActive,
    triggeredAge,
    triggeredAgeP2,
    p1CareYears,
    p2CareYears,
    bothCareYears,
    hasPartner,
    p1CareAdditionalNeedRealEur,
    p2CareAdditionalNeedRealEur,
    totalCareAdditionalNeedRealEur,
    maxAnnualCareAdditionalNeedRealEur,
    runSafetyStage1Ever,
    runSafetyStage2Ever,
    healthBucketEnabledThisRun = false,
    healthBucketUsedThisRun = 0,
    healthBucketEndThisRun = 0,
    healthBucketCoveragePctThisRun = null,
    healthBucketTargetGapThisRun = 0,
    healthBucketInterestThisRun = 0,
    tailRiskEntriesThisRun = null,
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

    const p1Triggered = Number.isFinite(Number(triggeredAge)) && Number(triggeredAge) > 0;
    const p2Triggered = hasPartner && Number.isFinite(Number(triggeredAgeP2)) && Number(triggeredAgeP2) > 0;
    const householdCareTriggered = p1Triggered || p2Triggered;

    if (p1Triggered) {
        metrics.p1TriggeredCount++;
        metrics.entryAges.push(Number(triggeredAge));
        metrics.p1CareYearsTriggered.push(p1CareYears);
        metrics.p1CareAdditionalNeedRealEur.push(Math.max(0, Number(p1CareAdditionalNeedRealEur) || 0));
    }
    if (p2Triggered) {
        metrics.p2TriggeredCount++;
        metrics.entryAgesP2.push(Number(triggeredAgeP2));
        metrics.p2CareYearsTriggered.push(p2CareYears);
        metrics.p2CareAdditionalNeedRealEur.push(Math.max(0, Number(p2CareAdditionalNeedRealEur) || 0));
    }

    if (householdCareTriggered) {
        metrics.pflegeTriggeredCount++;
        metrics.shortfallWithCareCount += ruinOrDepleted ? 1 : 0;
        metrics.endWealthWithCareRealEur.push(Math.max(0, Number(finalValueRealEur) || 0));
        metrics.totalCareAdditionalNeedRealEur.push(Math.max(0, Number(totalCareAdditionalNeedRealEur) || 0));
        metrics.maxAnnualCareAdditionalNeedRealEur.push(Math.max(0, Number(maxAnnualCareAdditionalNeedRealEur) || 0));
        metrics.bothCareYearsOverlapTriggered.push(bothCareYears);
    } else {
        metrics.endWealthNoCareRealEur.push(Math.max(0, Number(finalValueRealEur) || 0));
        metrics.shortfallNoCareProxyCount += ruinOrDepleted ? 1 : 0;
    }

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

    const tailRiskSummary = summarizeTailRiskEvents(tailRiskEntriesThisRun || currentRunLog || []);
    if (tailRiskSummary.tailRiskActiveYears > 0) metrics.tailRiskRunsActiveCount++;
    if (tailRiskSummary.tailRiskAppliedYears > 0) metrics.tailRiskRunsAppliedCount++;
    metrics.tailRiskEventCount += tailRiskSummary.tailRiskEventCount;
    metrics.tailRiskEvaluatedYears += Array.isArray(tailRiskEntriesThisRun) ? tailRiskEntriesThisRun.length : 0;
    metrics.tailRiskActiveYears += tailRiskSummary.tailRiskActiveYears;
    metrics.tailRiskAppliedYears += tailRiskSummary.tailRiskAppliedYears;
    metrics.tailRiskSkippedHistoricalCrisisYears += tailRiskSummary.tailRiskSkippedHistoricalCrisisYears;

    metrics.runMeta.push({
        index: runIdx,
        endVermoegen: finalOutcomes[i],
        failed,
        lebensdauer,
        careEverActive: householdCareTriggered,
        totalCareYears: p1CareYears + p2CareYears,
        p1CareEntryAge: p1Triggered ? Number(triggeredAge) : null,
        p2CareEntryAge: p2Triggered ? Number(triggeredAgeP2) : null,
        p1CareAdditionalNeedRealEur: Math.max(0, Number(p1CareAdditionalNeedRealEur) || 0),
        p2CareAdditionalNeedRealEur: Math.max(0, Number(p2CareAdditionalNeedRealEur) || 0),
        totalCareAdditionalNeedRealEur: Math.max(0, Number(totalCareAdditionalNeedRealEur) || 0),
        healthBucketUsed: healthBucketUsedThisRun,
        healthBucketEnd: healthBucketEndThisRun,
        healthBucketCoveragePct: healthBucketCoveragePctThisRun,
        healthBucketTargetGap: healthBucketTargetGapThisRun,
        maxKuerzung: kpiMaxKuerzungDieserLauf,
        jahreOhneFlex,
        logDataRows: currentRunLog ? [...currentRunLog] : [],
        triggeredAge: p1Triggered ? Number(triggeredAge) : null,
        triggeredAgeP2: p2Triggered ? Number(triggeredAgeP2) : null
    });

    metrics.worstRun = pickWorstRun(metrics.worstRun, {
        finalVermoegen: finalOutcomes[i],
        logDataRows: currentRunLog || [],
        failed,
        comboIdx: 0,
        runIdx
    });

    if (householdCareTriggered) {
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
            p1TriggeredCount: metrics.p1TriggeredCount,
            p2TriggeredCount: metrics.p2TriggeredCount,
            totalSimulatedYears: metrics.totalSimulatedYears,
            totalYearsQuoteAbove45: metrics.totalYearsQuoteAbove45,
            totalYearsSafetyStage1plus: metrics.totalYearsSafetyStage1plus,
            totalYearsSafetyStage2: metrics.totalYearsSafetyStage2,
            shortfallWithCareCount: metrics.shortfallWithCareCount,
            shortfallNoCareProxyCount: metrics.shortfallNoCareProxyCount,
            runsSafetyStage1Triggered: metrics.runsSafetyStage1Triggered,
            runsSafetyStage2Triggered: metrics.runsSafetyStage2Triggered,
            totalTaxSavedByLossCarry: metrics.totalTaxSavedByLossCarry,
            healthBucketEnabledCount: metrics.healthBucketEnabledCount,
            healthBucketUsedCount: metrics.healthBucketUsedCount,
            healthBucketDepletedCount: metrics.healthBucketDepletedCount,
            totalHealthBucketUsed: metrics.totalHealthBucketUsed,
            tailRiskRunsActiveCount: metrics.tailRiskRunsActiveCount,
            tailRiskRunsAppliedCount: metrics.tailRiskRunsAppliedCount,
            tailRiskEventCount: metrics.tailRiskEventCount,
            tailRiskEvaluatedYears: metrics.tailRiskEvaluatedYears,
            tailRiskActiveYears: metrics.tailRiskActiveYears,
            tailRiskAppliedYears: metrics.tailRiskAppliedYears,
            tailRiskSkippedHistoricalCrisisYears: metrics.tailRiskSkippedHistoricalCrisisYears
        },
        lists: {
            entryAges: metrics.entryAges,
            entryAgesP2: metrics.entryAgesP2,
            p1CareAdditionalNeedRealEur: metrics.p1CareAdditionalNeedRealEur,
            p2CareAdditionalNeedRealEur: metrics.p2CareAdditionalNeedRealEur,
            totalCareAdditionalNeedRealEur: metrics.totalCareAdditionalNeedRealEur,
            endWealthWithCareRealEur: metrics.endWealthWithCareRealEur,
            endWealthNoCareRealEur: metrics.endWealthNoCareRealEur,
            p1CareYearsTriggered: metrics.p1CareYearsTriggered,
            p2CareYearsTriggered: metrics.p2CareYearsTriggered,
            bothCareYearsOverlapTriggered: metrics.bothCareYearsOverlapTriggered,
            maxAnnualCareAdditionalNeedRealEur: metrics.maxAnnualCareAdditionalNeedRealEur,
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
