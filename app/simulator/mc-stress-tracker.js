import { quantile } from './simulator-utils.js';
import { computeRunStatsFromSeries } from './simulator-engine-wrapper.js';

export function createMonteCarloStressTracker(stressCtxMaster, initialPortfolioValue) {
    const stressYears = stressCtxMaster?.preset?.years ?? 0;
    return {
        stressYears,
        portfolioValues: stressYears > 0 ? [initialPortfolioValue] : null,
        yearsAbove45: 0,
        cutYears: 0,
        realWithdrawals: stressYears > 0 ? [] : null,
        postStressRecoveryYears: null
    };
}

export function recordMonteCarloStressYear(
    tracker,
    simulationsJahr,
    portfolioValue,
    logData,
    { realWithdrawalObserved = true } = {}
) {
    if (tracker.stressYears <= 0) return;

    if (simulationsJahr < tracker.stressYears) {
        tracker.portfolioValues.push(portfolioValue);

        if (logData.entnahmequote * 100 > 4.5) {
            tracker.yearsAbove45++;
        }
        if (logData.entscheidung.kuerzungProzent > 10) {
            tracker.cutYears++;
        }
        if (realWithdrawalObserved && Number.isFinite(Number(logData.jahresentnahme_real))) {
            tracker.realWithdrawals.push(Number(logData.jahresentnahme_real));
        }
        return;
    }

    if (tracker.postStressRecoveryYears === null && logData.entnahmequote * 100 < 3.5) {
        tracker.postStressRecoveryYears = simulationsJahr - (tracker.stressYears - 1);
    }
}

export function recordMonteCarloStressZeroWithdrawal(tracker, simulationsJahr) {
    if (tracker?.stressYears > 0 && simulationsJahr < tracker.stressYears) {
        tracker.realWithdrawals.push(0);
    }
}

export function writeMonteCarloStressMetrics(
    tracker,
    index,
    stress_maxDrawdowns,
    stress_timeQuoteAbove45,
    stress_cutYears,
    stress_CaR_P10_Real,
    stress_recoveryYears
) {
    if (tracker.stressYears > 0) {
        const { maxDDpct: stressMaxDD } = computeRunStatsFromSeries(tracker.portfolioValues);
        stress_maxDrawdowns[index] = stressMaxDD;
        stress_timeQuoteAbove45[index] = (tracker.yearsAbove45 / tracker.stressYears) * 100;
        stress_cutYears[index] = tracker.cutYears;
        stress_CaR_P10_Real[index] = tracker.realWithdrawals.length > 0
            ? quantile(tracker.realWithdrawals, 0.10)
            : 0;
        stress_recoveryYears[index] = tracker.postStressRecoveryYears === null
            ? tracker.stressYears
            : tracker.postStressRecoveryYears;
        return;
    }

    stress_maxDrawdowns[index] = 0;
    stress_timeQuoteAbove45[index] = 0;
    stress_cutYears[index] = 0;
    stress_CaR_P10_Real[index] = 0;
    stress_recoveryYears[index] = 0;
}
