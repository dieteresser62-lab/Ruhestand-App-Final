import { CONFIG } from '../config.mjs';
import { calculateWealthAdjustedReductionFactor } from './wealth-reduction.mjs';

/**
 * Mutates state.keyParams with wealthReductionFactor and entnahmequoteUsed in recovery contexts.
 */
export function applyGuardrails(rate, state, params, addDecision) {
    const {
        market, inflatedBedarf, renteJahr, input,
        runwayMonate, profil, kuerzungQuelle: initialSource
    } = params;
    const { entnahmequoteDepot } = state.keyParams;

    const isRecoveryContext = (market.sKey === 'recovery_in_bear') ||
        (market.sKey === 'recovery' && market.abstandVomAthProzent >= 15);
    const isCautionContext = (entnahmequoteDepot >= CONFIG.THRESHOLDS.CAUTION.withdrawalRate);

    let kuerzungQuelle = initialSource;
    let geglätteteFlexRate = rate;
    let cautiousRuleApplied = false;
    const diagnostics = {};

    if (market.sKey === 'recovery_in_bear') {
        const gap = market.abstandVomAthProzent || 0;
        let basisCurb = CONFIG.RECOVERY_GUARDRAILS.getCurb(gap);
        if (runwayMonate < 30) basisCurb = Math.max(basisCurb, 20);

        const wealthReduction = calculateWealthAdjustedReductionFactor(params);
        const reductionFactor = wealthReduction.factor;
        if (state.keyParams && Number.isFinite(reductionFactor)) {
            state.keyParams.wealthReductionFactor = reductionFactor;
        }
        if (state.keyParams && Number.isFinite(wealthReduction.entnahmequoteUsed)) {
            state.keyParams.entnahmequoteUsed = wealthReduction.entnahmequoteUsed;
        }

        const curb = basisCurb * reductionFactor;
        const maxFlexRate = 100 - curb;

        if (reductionFactor > 0 && geglätteteFlexRate > maxFlexRate) {
            geglätteteFlexRate = maxFlexRate;
            kuerzungQuelle = reductionFactor < 1
                ? 'Guardrail (vermögensadj.)'
                : 'Guardrail (Vorsicht)';
            addDecision(
                kuerzungQuelle,
                `Recovery-Cap: Flex-Rate auf ${maxFlexRate.toFixed(1)}% gekappt.`,
                'active',
                'guardrail'
            );
            cautiousRuleApplied = true;
        } else if (reductionFactor === 0) {
            addDecision(
                'Vermögensbasierte Anpassung',
                'Recovery-Cap entfällt – Entnahmequote unter dem Safe-Wert.',
                'active',
                'info'
            );
        }
    }

    let inflationCap = input.inflation;
    if (entnahmequoteDepot >= CONFIG.THRESHOLDS.CAUTION.withdrawalRate) {
        const calculatedInflationCap = Math.min(
            input.inflation,
            CONFIG.THRESHOLDS.CAUTION.inflationCap
        );
        if (calculatedInflationCap < input.inflation) {
            kuerzungQuelle = 'Guardrail (Vorsicht)';
            addDecision(
                'Guardrail (Vorsicht)',
                `Caution-Cap: Inflationsanpassung auf ${calculatedInflationCap}% begrenzt.`,
                'active',
                'guardrail'
            );
        }
        inflationCap = calculatedInflationCap;
        cautiousRuleApplied = true;
        diagnostics.inflationCap = {
            rule: 'max',
            type: 'percent',
            threshold: Math.max(0, inflationCap) / 100,
            value: Math.max(0, input.inflation) / 100,
            details: {
                entnahmequoteDepot,
                capBinding: calculatedInflationCap < input.inflation
            }
        };
    }

    const isWeakSource = ['Profil', 'Glättung (Anstieg)', 'Glättung (Abfall)'].includes(kuerzungQuelle);
    if ((isRecoveryContext || isCautionContext) && cautiousRuleApplied && isWeakSource) {
        kuerzungQuelle = 'Guardrail (Vorsicht)';
    }

    const inflationsFaktor = 1 + Math.max(0, inflationCap) / 100;
    const inflationsAnhebung = Math.max(0, Math.min(100, input.budgetInflationBoost || 0));
    const inflationsBoost = inflationsAnhebung / 100;
    const floorBedarfNachInflation = (inflatedBedarf.floor / inflationsFaktor) * (1 + inflationsBoost);
    const flexBedarfNachInflation = inflatedBedarf.flex / inflationsFaktor;
    const angepasstesMinBudget = floorBedarfNachInflation + flexBedarfNachInflation + renteJahr;
    let geplanteJahresentnahme = inflatedBedarf.floor +
        (inflatedBedarf.flex * (Math.max(0, Math.min(100, geglätteteFlexRate)) / 100));
    let aktuellesGesamtbudget = geplanteJahresentnahme + renteJahr;
    const wealthFactor = Number.isFinite(state.keyParams?.wealthReductionFactor)
        ? Math.min(1, Math.max(0, state.keyParams.wealthReductionFactor))
        : 1;
    const minBudgetWithWealth = aktuellesGesamtbudget + (angepasstesMinBudget - aktuellesGesamtbudget) * wealthFactor;
    const noNewLowerYearlyCloses = input.endeVJ > Math.min(input.endeVJ_1, input.endeVJ_2);
    const budgetFloorErlaubt = !['bear_deep', 'recovery_in_bear'].includes(market.sKey) ||
        ((market.abstandVomAthProzent || 0) <= 10 && noNewLowerYearlyCloses &&
            runwayMonate >= Math.max(30, profil.minRunwayMonths + 6));

    if (budgetFloorErlaubt) {
        diagnostics.budgetFloor = {
            rule: 'min',
            type: 'currency',
            threshold: minBudgetWithWealth,
            value: aktuellesGesamtbudget
        };
    }

    if (budgetFloorErlaubt && !cautiousRuleApplied && aktuellesGesamtbudget + 1 < minBudgetWithWealth) {
        const benötigteJahresentnahme = Math.max(0, minBudgetWithWealth - renteJahr);
        const nötigeFlexRate = inflatedBedarf.flex > 0
            ? Math.min(100, Math.max(0, ((benötigteJahresentnahme - inflatedBedarf.floor) / inflatedBedarf.flex) * 100))
            : 0;

        if (nötigeFlexRate > geglätteteFlexRate) {
            geglätteteFlexRate = nötigeFlexRate;
            kuerzungQuelle = 'Budget-Floor';
            addDecision(
                kuerzungQuelle,
                `Um realen Kaufkraftverlust zu vermeiden, wird Rate auf ${geglätteteFlexRate.toFixed(1)}% angehoben.`,
                'active',
                'guardrail'
            );
            const aktualisierteEntnahme = inflatedBedarf.floor +
                (inflatedBedarf.flex * (Math.max(0, Math.min(100, geglätteteFlexRate)) / 100));
            aktuellesGesamtbudget = aktualisierteEntnahme + renteJahr;
            if (diagnostics.budgetFloor) {
                diagnostics.budgetFloor.value = aktuellesGesamtbudget;
            }
        }
    }

    return { rate: geglätteteFlexRate, source: kuerzungQuelle, diagnostics };
}
