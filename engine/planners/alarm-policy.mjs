import { CONFIG } from '../config.mjs';
import { calculateWealthAdjustedReductionFactor } from './wealth-reduction.mjs';

export function shouldDeescalateInPeak(alarmWarAktiv, state, params) {
    const { market } = params;
    if (!alarmWarAktiv || !['peak_hot', 'peak_stable', 'side_long'].includes(market.sKey)) {
        return false;
    }
    const { entnahmequoteDepot, realerDepotDrawdown } = state.keyParams;
    return entnahmequoteDepot <= CONFIG.THRESHOLDS.ALARM.withdrawalRate ||
        realerDepotDrawdown <= 0.15;
}

export function shouldDeescalateInRecovery(alarmWarAktiv, state, params) {
    if (!alarmWarAktiv || params.market.sKey !== 'recovery_in_bear') {
        return false;
    }
    const { runwayMonate, profil, input } = params;
    const { entnahmequoteDepot, realerDepotDrawdown } = state.keyParams;
    const okRunway = runwayMonate >= (profil.minRunwayMonths + 6);
    const okDrawdnRecovery = realerDepotDrawdown <= (CONFIG.THRESHOLDS.ALARM.realDrawdown - 0.05);
    const noNewLowerYearlyCloses = input.endeVJ > Math.min(input.endeVJ_1, input.endeVJ_2);

    return (entnahmequoteDepot <= CONFIG.THRESHOLDS.ALARM.withdrawalRate ||
        okRunway || okDrawdnRecovery) && noNewLowerYearlyCloses;
}

export function evaluateAlarmConditions(state, params, addDecision) {
    const { market, runwayMonate } = params;
    const { entnahmequoteDepot, realerDepotDrawdown } = state.keyParams;
    const wealthReduction = calculateWealthAdjustedReductionFactor(params);
    const wealthFactor = Number.isFinite(wealthReduction.factor)
        ? Math.min(1, Math.max(0, wealthReduction.factor))
        : 1;
    const wealthSufficient = wealthFactor < 0.5;

    let alarmWarAktiv = state.alarmActive;

    if (shouldDeescalateInPeak(alarmWarAktiv, state, params)) {
        alarmWarAktiv = false;
        addDecision(
            'Alarm-Deeskalation (Peak)',
            'Markt erholt, Drawdown/Quote unkritisch. Alarm wird beendet.',
            'active',
            'guardrail'
        );
    } else if (shouldDeescalateInRecovery(alarmWarAktiv, state, params)) {
        alarmWarAktiv = false;
        addDecision(
            'Alarm-Deeskalation (Recovery)',
            'Bedingungen für Entspannung sind erfüllt. Alarm wird beendet.',
            'active',
            'guardrail'
        );
    }

    const isCrisis = market.sKey === 'bear_deep';
    const isRunwayThin = runwayMonate < CONFIG.THRESHOLDS.STRATEGY.runwayThinMonths;
    const isQuoteCritical = entnahmequoteDepot > CONFIG.THRESHOLDS.ALARM.withdrawalRate;
    const isDrawdownCritical = realerDepotDrawdown > CONFIG.THRESHOLDS.ALARM.realDrawdown;

    if (isCrisis && wealthSufficient) {
        if (alarmWarAktiv) {
            addDecision(
                'Alarm unterdrückt',
                'Vermögen ausreichend – Alarm-Modus wird beendet.',
                'active',
                'info'
            );
        } else {
            addDecision(
                'Alarm unterdrückt',
                'Vermögen ausreichend – kein Alarm-Modus trotz Bärenmarkt.',
                'active',
                'info'
            );
        }
        alarmWarAktiv = false;
    }

    const alarmAktivInDieserRunde = !alarmWarAktiv && isCrisis && !wealthSufficient &&
        ((isQuoteCritical && isRunwayThin) || isDrawdownCritical);

    if (alarmAktivInDieserRunde) {
        addDecision(
            'Alarm-Aktivierung!',
            'Bärenmarkt und kritische Schwelle überschritten. Alarm-Modus AN.',
            'active',
            'alarm'
        );
    }

    return {
        active: alarmAktivInDieserRunde || alarmWarAktiv,
        newlyTriggered: alarmAktivInDieserRunde
    };
}
