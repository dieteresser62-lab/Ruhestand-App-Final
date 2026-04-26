import { CONFIG } from '../config.mjs';
import { calcFlexShare } from './spending-policy-helpers.mjs';
import { calculateWealthAdjustedReductionFactor } from './wealth-reduction.mjs';

export function applyFlexShareCurve(flexRate, inflatedBedarf, addDecision, wealthFactor = 1) {
    const curve = CONFIG.SPENDING_MODEL?.FLEX_SHARE_S_CURVE;
    if (!curve?.ENABLED) {
        return { rate: flexRate, applied: false };
    }

    const floor = Math.max(0, Number(inflatedBedarf?.floor) || 0);
    const flex = Math.max(0, Number(inflatedBedarf?.flex) || 0);
    const total = floor + flex;
    if (total <= 0 || flex <= 0 || flexRate <= 0) {
        return { rate: flexRate, applied: false };
    }

    const share = Math.min(1, Math.max(0, flex / total));
    const s = 1 / (1 + Math.exp(-curve.A * (share - curve.B)));
    const baseCap = Math.max(0, Math.min(100, 100 - (curve.K * 100 * s)));
    const w = Number.isFinite(wealthFactor) ? Math.min(1, Math.max(0, wealthFactor)) : 1;
    const cap = Math.max(0, Math.min(100, 100 - (w * (100 - baseCap))));
    const adjusted = Math.max(0, Math.min(100, Math.min(flexRate, cap)));

    const applied = adjusted + 0.05 < flexRate;
    if (applied) {
        addDecision(
            'Flex-S-Kurve',
            `Flex-Anteil ${Math.round(share * 100)}% -> Cap ${(cap).toFixed(1)}%.`,
            'active'
        );
    }

    return { rate: adjusted, applied };
}

/**
 * Mutates state.keyParams with wealthReductionFactor and entnahmequoteUsed.
 */
export function calculateFlexRate(state, alarmStatus, params, addDecision) {
    const p = params;
    const wealthReduction = calculateWealthAdjustedReductionFactor(p);
    const wealthFactor = Number.isFinite(wealthReduction.factor)
        ? Math.min(1, Math.max(0, wealthReduction.factor))
        : 1;
    if (state.keyParams) {
        state.keyParams.wealthReductionFactor = wealthFactor;
        if (Number.isFinite(wealthReduction.entnahmequoteUsed)) {
            state.keyParams.entnahmequoteUsed = wealthReduction.entnahmequoteUsed;
        }
    }

    if (alarmStatus.active) {
        const kuerzungQuelle = 'Guardrail (Alarm)';
        let geglätteteFlexRate = state.flexRate;

        if (alarmStatus.newlyTriggered) {
            const shortfallRatio = Math.max(
                0,
                (p.profil.minRunwayMonths - p.runwayMonate) / p.profil.minRunwayMonths
            );
            const zielCut = Math.min(10, Math.round(10 + 20 * shortfallRatio));
            const zielCutScaled = zielCut * wealthFactor;
            geglätteteFlexRate = Math.max(35, state.flexRate - zielCutScaled);
            addDecision(
                'Anpassung im Alarm-Modus',
                `Flex-Rate wird auf ${geglätteteFlexRate.toFixed(1)}% gesetzt.`,
                'active',
                'alarm'
            );
            if (wealthFactor < 1) {
                addDecision(
                    'Vermögensbasierte Dämpfung',
                    'Alarm-Kürzung wird aufgrund hoher Vermögensdeckung reduziert.',
                    'active',
                    'info'
                );
            }
        } else {
            geglätteteFlexRate = Math.max(35, state.flexRate);
            addDecision(
                'Anpassung im Alarm-Modus',
                `Alarm-Modus ist weiterhin aktiv, Rate auf ${geglätteteFlexRate.toFixed(1)}% (Min. 35%) gehalten.`,
                'active',
                'alarm'
            );
        }
        return { geglätteteFlexRate, kuerzungQuelle };
    }

    const { market } = p;
    const {
        FLEX_RATE_SMOOTHING_ALPHA,
        RATE_CHANGE_MAX_UP_PP,
        RATE_CHANGE_AGILE_UP_PP,
        RATE_CHANGE_MAX_DOWN_PP,
        RATE_CHANGE_MAX_DOWN_IN_BEAR_PP,
        RATE_CHANGE_RELAX_MAX_DOWN_PP
    } = CONFIG.SPENDING_MODEL;

    let kuerzungQuelle = 'Profil';
    let roheKuerzungProzent = 0;

    if (market.sKey === 'bear_deep') {
        const reductionFactor = wealthFactor;
        const basisKuerzung = 50 + Math.max(0, market.abstandVomAthProzent - 20);
        roheKuerzungProzent = basisKuerzung * reductionFactor;

        if (reductionFactor === 0) {
            kuerzungQuelle = 'Vermögen ausreichend';
            addDecision(
                'Vermögensbasierte Anpassung',
                'Keine Reduktion nötig – Entnahmequote unter dem Safe-Wert.',
                'active',
                'info'
            );
        } else if (reductionFactor < 1) {
            kuerzungQuelle = 'Tiefer Bär (vermögensadj.)';
            addDecision(
                'Vermögensbasierte Anpassung',
                `Reduktion auf ${(reductionFactor * 100).toFixed(0)}% skaliert wegen niedriger Entnahmequote.`,
                'active',
                'info'
            );
        } else {
            kuerzungQuelle = 'Tiefer Bär';
        }
    }

    const roheFlexRate = 100 - roheKuerzungProzent;
    const prevFlexRate = state.flexRate ?? 100;
    const alphaEff = FLEX_RATE_SMOOTHING_ALPHA + (1 - wealthFactor) * (1 - FLEX_RATE_SMOOTHING_ALPHA);
    let geglätteteFlexRate = alphaEff * roheFlexRate +
        (1 - alphaEff) * prevFlexRate;

    const delta = geglätteteFlexRate - prevFlexRate;
    const regime = CONFIG.TEXTS.REGIME_MAP[market.sKey];
    const baseMaxUp = (regime === 'peak' || regime === 'hot_neutral' || regime === 'recovery_in_bear')
        ? RATE_CHANGE_AGILE_UP_PP
        : RATE_CHANGE_MAX_UP_PP;
    const baseMaxDown = (market.sKey === 'bear_deep')
        ? RATE_CHANGE_MAX_DOWN_IN_BEAR_PP
        : RATE_CHANGE_MAX_DOWN_PP;
    const maxUp = baseMaxUp;
    const relaxCap = Number.isFinite(RATE_CHANGE_RELAX_MAX_DOWN_PP)
        ? RATE_CHANGE_RELAX_MAX_DOWN_PP
        : 20;
    const relaxScale = 1 - wealthFactor;
    const relax = relaxScale * relaxScale;
    const MAX_DOWN = baseMaxDown + (relax * (relaxCap - baseMaxDown));

    if (delta > maxUp) {
        geglätteteFlexRate = prevFlexRate + maxUp;
        kuerzungQuelle = 'Glättung (Anstieg)';
    } else if (delta < -MAX_DOWN) {
        geglätteteFlexRate = prevFlexRate - MAX_DOWN;
        kuerzungQuelle = 'Glättung (Abfall)';
    }

    if (kuerzungQuelle.startsWith('Glättung')) {
        addDecision(
            'Glättung der Rate',
            `Veränderung auf max. ${delta > 0 ? maxUp : MAX_DOWN} pp begrenzt.`,
            'active'
        );
    }

    const flexShare = calcFlexShare(p.inflatedBedarf);
    const curveResult = applyFlexShareCurve(geglätteteFlexRate, p.inflatedBedarf, addDecision, wealthFactor);
    if (curveResult.applied) {
        geglätteteFlexRate = curveResult.rate;
        if (['Profil', 'Glättung (Anstieg)', 'Glättung (Abfall)'].includes(kuerzungQuelle)) {
            kuerzungQuelle = 'Flex-Anteil (S-Kurve)';
        }
    }

    const hardCaps = CONFIG.SPENDING_MODEL?.FLEX_RATE_HARD_CAPS;
    const shareRelief = Math.max(0, hardCaps?.FLEX_SHARE_RELIEF_MAX_PP ?? 0);
    const relief = shareRelief * (1 - flexShare);
    if (hardCaps?.BEAR_DEEP_MAX_RATE && market.sKey === 'bear_deep') {
        const baseCap = Math.min(100, hardCaps.BEAR_DEEP_MAX_RATE + relief);
        const cap = Math.min(100, 100 - (wealthFactor * (100 - baseCap)));
        if (geglätteteFlexRate > cap) {
            geglätteteFlexRate = cap;
            kuerzungQuelle = 'Guardrail (Bären-Cap)';
            addDecision(
                'Guardrail (Bären-Cap)',
                `Flex-Rate im tiefen Bärenmarkt auf ${geglätteteFlexRate.toFixed(1)}% gekappt (Flex-Anteil ${Math.round(flexShare * 100)}%).`,
                'active',
                'guardrail'
            );
        }
    }

    if (hardCaps?.RUNWAY_COVERAGE_CAPS?.length) {
        const targetMonths = p.profil?.minRunwayMonths || p.input?.runwayMinMonths || 0;
        if (targetMonths > 0) {
            const coverage = p.runwayMonate / targetMonths;
            const rules = hardCaps.RUNWAY_COVERAGE_CAPS
                .slice()
                .sort((a, b) => a.maxCoverage - b.maxCoverage);
            const match = rules.find(r => coverage < r.maxCoverage);
            const baseCap = match ? Math.min(100, match.maxRate + relief) : null;
            const cap = baseCap === null ? null : Math.min(100, 100 - (wealthFactor * (100 - baseCap)));
            if (cap !== null && geglätteteFlexRate > cap) {
                geglätteteFlexRate = cap;
                kuerzungQuelle = 'Guardrail (Runway-Cap)';
                addDecision(
                    'Guardrail (Runway-Cap)',
                    `Runway-Deckung ${(coverage * 100).toFixed(0)}% -> Flex-Rate auf ${geglätteteFlexRate.toFixed(1)}% gekappt (Flex-Anteil ${Math.round(flexShare * 100)}%).`,
                    'active',
                    'guardrail'
                );
            }
        }
    }

    return { geglätteteFlexRate, kuerzungQuelle };
}
