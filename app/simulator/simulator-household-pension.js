/**
 * Module: Simulator Household Pension
 * Purpose: DOM-free pension and widow benefit calculations for simulator years.
 */
"use strict";

export function calculateHouseholdPensionForYear({
    inputs,
    yearIndex,
    currentAnnualPension = 0,
    currentAnnualPension2 = 0,
    widowPensionP1 = 0,
    widowPensionP2 = 0,
    p1Alive = true,
    p2Alive = true,
    widowBenefits = {},
    effectiveBaseFloor = 0,
    baseFlex = 0,
    temporaryFlexFactor = 1
}) {
    const rentAdjPct = inputs.rentAdjPct || 0;
    const currentAgeP1 = inputs.startAlter + yearIndex;
    const r1StartOffsetYears = Math.max(0, Number(inputs.renteStartOffsetJahre) || 0);
    let rente1BruttoEigen = 0;
    let widowBenefitP1ThisYear = 0;

    if (p1Alive && yearIndex >= r1StartOffsetYears) {
        rente1BruttoEigen = currentAnnualPension;
    }
    if (p1Alive && widowBenefits.p1FromP2) {
        widowBenefitP1ThisYear = widowPensionP1;
    }

    const rente1_brutto = rente1BruttoEigen + widowBenefitP1ThisYear;
    const rente1 = rente1_brutto;

    let rente2BruttoEigen = 0;
    let widowBenefitP2ThisYear = 0;
    let rente2 = 0;

    if (inputs.partner?.aktiv && p2Alive) {
        const partnerStartOffsetYears = Math.max(0, Number(inputs.partner.startInJahren) || 0);
        if (yearIndex >= partnerStartOffsetYears) {
            rente2BruttoEigen = currentAnnualPension2;
            if (inputs.partner.steuerquotePct > 0) {
                rente2 = rente2BruttoEigen * (1 - inputs.partner.steuerquotePct / 100);
            } else {
                rente2 = rente2BruttoEigen;
            }
            rente2 = Math.max(0, rente2);
        }
    }

    if (p2Alive && widowBenefits.p2FromP1) {
        widowBenefitP2ThisYear = widowPensionP2;
    }

    const rente2_brutto = rente2BruttoEigen + widowBenefitP2ThisYear;
    if (widowBenefitP2ThisYear > 0) {
        rente2 += widowBenefitP2ThisYear;
    }

    const renteSum = rente1 + rente2;
    const pensionAnnual = renteSum;
    const pensionSurplus = Math.max(0, pensionAnnual - effectiveBaseFloor);
    const inflatedFloor = Math.max(0, effectiveBaseFloor - pensionAnnual);
    const inflatedFlex = Math.max(0, (baseFlex * temporaryFlexFactor) - pensionSurplus);
    const widowAdjFactor = 1 + (rentAdjPct / 100);

    return {
        rentAdjPct,
        currentAgeP1,
        rente1BruttoEigen,
        widowBenefitP1ThisYear,
        rente1_brutto,
        rente1,
        rente2BruttoEigen,
        widowBenefitP2ThisYear,
        rente2_brutto,
        rente2,
        renteSum,
        pensionAnnual,
        pensionSurplus,
        inflatedFloor,
        inflatedFlex,
        nextWidowPensionP1: widowBenefits.p1FromP2 ? Math.max(0, widowPensionP1 * widowAdjFactor) : 0,
        nextWidowPensionP2: widowBenefits.p2FromP1 ? Math.max(0, widowPensionP2 * widowAdjFactor) : 0,
        nextAnnualPension: currentAnnualPension * (1 + rentAdjPct / 100),
        nextAnnualPension2: currentAnnualPension2 * (1 + rentAdjPct / 100)
    };
}

