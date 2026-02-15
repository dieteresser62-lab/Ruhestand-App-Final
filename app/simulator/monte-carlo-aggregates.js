"use strict";

import { quantile, sum, mean } from './simulator-utils.js';
import { STRESS_PRESETS } from './simulator-data.js';
import { MC_HEATMAP_BINS } from './monte-carlo-runner-utils.js';

export function buildMonteCarloAggregates({
    inputs,
    totalRuns,
    buffers,
    heatmap,
    bins,
    totals,
    lists,
    allRealWithdrawalsSample
}) {
    const {
        finalOutcomes,
        taxOutcomes,
        kpiLebensdauer,
        kpiKuerzungsjahre,
        kpiMaxKuerzung,
        volatilities,
        maxDrawdowns,
        depotErschoepft,
        alterBeiErschoepfung,
        anteilJahreOhneFlex,
        stress_maxDrawdowns,
        stress_timeQuoteAbove45,
        stress_cutYears,
        stress_CaR_P10_Real,
        stress_recoveryYears
    } = buffers;
    const {
        pflegeTriggeredCount,
        totalSimulatedYears,
        totalYearsQuoteAbove45,
        totalYearsSafetyStage1plus = 0,
        totalYearsSafetyStage2 = 0,
        shortfallWithCareCount,
        shortfallNoCareProxyCount,
        p2TriggeredCount,
        runsSafetyStage1Triggered = 0,
        runsSafetyStage2Triggered = 0,
        totalTaxSavedByLossCarry = 0
    } = totals;
    const {
        entryAges,
        entryAgesP2,
        careDepotCosts,
        endWealthWithCareList,
        endWealthNoCareList,
        p1CareYearsTriggered,
        p2CareYearsTriggered,
        bothCareYearsOverlapTriggered,
        maxAnnualCareSpendTriggered
    } = lists;

    const successfulOutcomes = [];
    for (let i = 0; i < totalRuns; ++i) {
        if (finalOutcomes[i] > 0) successfulOutcomes.push(finalOutcomes[i]);
    }

    const medianWithCare = endWealthWithCareList.length ? quantile(endWealthWithCareList, 0.5) : 0;
    const medianNoCare = endWealthNoCareList.length ? quantile(endWealthNoCareList, 0.5) : 0;
    const pflegeResults = {
        entryRatePct: (pflegeTriggeredCount / totalRuns) * 100,
        entryAgeMedian: entryAges.length ? quantile(entryAges, 0.5) : 0,
        shortfallRate_condCare: pflegeTriggeredCount > 0 ? (shortfallWithCareCount / pflegeTriggeredCount) * 100 : 0,
        shortfallRate_noCareProxy: (totalRuns - pflegeTriggeredCount) > 0 ? (shortfallNoCareProxyCount / (totalRuns - pflegeTriggeredCount)) * 100 : 0,
        endwealthWithCare_median: medianWithCare,
        endwealthNoCare_median: medianNoCare,
        depotCosts_median: careDepotCosts.length ? quantile(careDepotCosts, 0.5) : 0,
        // Dual Care KPIs (only for triggered cases)
        p1CareYears: p1CareYearsTriggered.length ? quantile(p1CareYearsTriggered, 0.5) : 0,
        p2CareYears: p2CareYearsTriggered.length ? quantile(p2CareYearsTriggered, 0.5) : 0,
        bothCareYears: bothCareYearsOverlapTriggered.length ? quantile(bothCareYearsOverlapTriggered, 0.5) : 0,
        p2EntryRatePct: (p2TriggeredCount / totalRuns) * 100,
        p2EntryAgeMedian: entryAgesP2.length ? quantile(entryAgesP2, 0.5) : 0,
        maxAnnualCareSpend: maxAnnualCareSpendTriggered.length ? quantile(maxAnnualCareSpendTriggered, 0.5) : 0,
        shortfallDelta_vs_noCare: (endWealthNoCareList.length && endWealthWithCareList.length)
            ? (medianWithCare - medianNoCare)
            : 0
    };

    const stressPresetKey = inputs.stressPreset || 'NONE';
    return {
        finalOutcomes: {
            p10: quantile(finalOutcomes, 0.1), p50: quantile(finalOutcomes, 0.5),
            p90: quantile(finalOutcomes, 0.9), p50_successful: quantile(successfulOutcomes, 0.5)
        },
        taxOutcomes: { p50: quantile(taxOutcomes, 0.5) },
        kpiLebensdauer: { mean: mean(kpiLebensdauer) },
        kpiKuerzungsjahre: { p50: quantile(kpiKuerzungsjahre, 0.5) },
        kpiMaxKuerzung: { p50: quantile(kpiMaxKuerzung, 0.5) },
        depotErschoepfungsQuote: (sum(depotErschoepft) / totalRuns) * 100,
        alterBeiErschoepfung: { p50: quantile(Array.from(alterBeiErschoepfung).filter(a => a < 255), 0.5) || 0 },
        anteilJahreOhneFlex: { p50: quantile(anteilJahreOhneFlex, 0.5) },
        volatilities: { p50: quantile(volatilities, 0.5) },
        maxDrawdowns: { p50: quantile(maxDrawdowns, 0.5), p90: quantile(maxDrawdowns, 0.9) },
        heatmap: heatmap.map(yearData => Array.from(yearData)),
        bins: bins || MC_HEATMAP_BINS,
        extraKPI: {
            timeShareQuoteAbove45: totalSimulatedYears > 0 ? totalYearsQuoteAbove45 / totalSimulatedYears : 0,
            consumptionAtRiskP10Real: quantile(allRealWithdrawalsSample, 0.1),
            dynamicFlexSafety: {
                yearShareStage1plus: totalSimulatedYears > 0 ? totalYearsSafetyStage1plus / totalSimulatedYears : 0,
                yearShareStage2: totalSimulatedYears > 0 ? totalYearsSafetyStage2 / totalSimulatedYears : 0,
                runShareStage1plus: totalRuns > 0 ? runsSafetyStage1Triggered / totalRuns : 0,
                runShareStage2: totalRuns > 0 ? runsSafetyStage2Triggered / totalRuns : 0,
                runsStage1plus: runsSafetyStage1Triggered || 0,
                runsStage2: runsSafetyStage2Triggered || 0
            },
            lossCarryTaxSavings: {
                total: totalTaxSavedByLossCarry || 0,
                perRunMean: totalRuns > 0 ? (totalTaxSavedByLossCarry / totalRuns) : 0
            },
            pflege: pflegeResults
        },
        stressKPI: {
            presetKey: stressPresetKey,
            years: STRESS_PRESETS[stressPresetKey]?.years || 0,
            maxDD: {
                p50: quantile(stress_maxDrawdowns, 0.50),
                p90: quantile(stress_maxDrawdowns, 0.90)
            },
            timeShareAbove45: {
                p50: quantile(stress_timeQuoteAbove45, 0.50)
            },
            cutYears: {
                p50: quantile(stress_cutYears, 0.50)
            },
            consumptionAtRiskP10Real: {
                p50: quantile(stress_CaR_P10_Real, 0.50)
            },
            recoveryYears: {
                p50: quantile(stress_recoveryYears, 0.50)
            }
        }
    };
}
