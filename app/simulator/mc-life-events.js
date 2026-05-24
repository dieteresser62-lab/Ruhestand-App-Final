import {
    calcCareCost,
    computeCareMortalityMultiplier,
    computeHouseholdFlexFactor,
    makeDefaultCareMeta,
    updateCareMeta
} from './simulator-engine-wrapper.js';
import { MORTALITY_TABLE } from './simulator-data.js';
import { computeMarriageYearsCompleted } from './simulator-sweep-utils.js';

export function createMonteCarloLifeState(inputs, rand) {
    const careMetaP1 = makeDefaultCareMeta(inputs.pflegefallLogikAktivieren, inputs.geschlecht);
    const partnerGenderFallback = inputs.geschlecht === 'm' ? 'w' : 'm';
    const careMetaP2 = (inputs.partner?.aktiv === true)
        ? makeDefaultCareMeta(inputs.pflegefallLogikAktivieren, inputs.partner?.geschlecht || partnerGenderFallback)
        : null;
    const hasPartner = careMetaP2 !== null;

    return {
        careMetaP1,
        careMetaP2,
        hasPartner,
        rngCareP1: rand.fork('CARE_P1'),
        rngCareP2: careMetaP2 ? rand.fork('CARE_P2') : null,
        singleNoCareFastPath: inputs.pflegefallLogikAktivieren !== true && !hasPartner,
        p1Alive: true,
        p2Alive: hasPartner,
        p1CareYears: 0,
        p2CareYears: 0,
        bothCareYears: 0,
        triggeredAgeP2: null,
        runEndedBecauseAllDied: false,
        deathLogContext: null,
        p1ActiveThisYear: false,
        p2ActiveThisYear: false,
        widowBenefitActiveForP1: false,
        widowBenefitActiveForP2: false,
        householdContext: {
            p1Alive: true,
            p2Alive: hasPartner,
            widowBenefits: {
                p1FromP2: false,
                p2FromP1: false
            }
        },
        year: {
            ageP1: 0,
            ageP2: 0,
            effectiveTransitionYear: 0,
            triggeredAge: null,
            careEverActive: false,
            isAccumulation: false,
            totalCareFloor: 0,
            effectiveFlexFactor: 1,
            householdContext: null
        }
    };
}

export function updateMonteCarloLifeEventsForYear(
    lifeState,
    inputs,
    widowOptions,
    simulationsJahr,
    yearData,
    effectiveTransitionYear,
    triggeredAge,
    careEverActive,
    rand
) {
    const ageP1 = inputs.startAlter + simulationsJahr;
    const isAccumulation = inputs.accumulationPhase?.enabled && simulationsJahr < effectiveTransitionYear;

    if (lifeState.singleNoCareFastPath) {
        if (!isAccumulation && lifeState.p1Alive) {
            const qx1 = MORTALITY_TABLE[inputs.geschlecht][ageP1] || 0.0005;
            if (rand() < qx1) {
                lifeState.p1Alive = false;
            }
        }

        if (!lifeState.p1Alive) {
            lifeState.runEndedBecauseAllDied = true;
            lifeState.deathLogContext = {
                jahr: simulationsJahr + 1,
                histJahr: yearData.jahr,
                inflation: yearData.inflation
            };
        }

        const householdContext = lifeState.householdContext;
        householdContext.p1Alive = lifeState.p1Alive;
        householdContext.p2Alive = false;
        householdContext.widowBenefits.p1FromP2 = false;
        householdContext.widowBenefits.p2FromP1 = false;
        householdContext.care = {
            p1: lifeState.careMetaP1,
            p2: null
        };

        const year = lifeState.year;
        year.ageP1 = ageP1;
        year.ageP2 = ageP1;
        year.effectiveTransitionYear = effectiveTransitionYear;
        year.triggeredAge = triggeredAge;
        year.careEverActive = careEverActive;
        year.isAccumulation = isAccumulation;
        year.totalCareFloor = 0;
        year.effectiveFlexFactor = lifeState.p1Alive ? 1 : 0;
        year.householdContext = householdContext;
        return year;
    }

    const marriageYearsCompleted = computeMarriageYearsCompleted(simulationsJahr, widowOptions);
    const widowModeEnabled = widowOptions.mode === 'percent' && widowOptions.percent > 0 && lifeState.hasPartner;
    const widowEligibleThisYear = widowModeEnabled &&
        marriageYearsCompleted > 0 &&
        marriageYearsCompleted >= widowOptions.minMarriageYears;
    const p1AliveAtStart = lifeState.p1Alive;
    const p2AliveAtStart = lifeState.p2Alive;
    const careMetaP1 = lifeState.careMetaP1;
    const careMetaP2 = lifeState.careMetaP2;
    let ageP2 = ageP1;

    if (inputs.partner?.aktiv) {
        ageP2 = inputs.partner.startAlter + simulationsJahr;
    }

    if (lifeState.p1Alive) {
        updateCareMeta(careMetaP1, inputs, ageP1, yearData, lifeState.rngCareP1);
        if (careMetaP1 && careMetaP1.active) careEverActive = true;
        if (careMetaP1 && careMetaP1.triggered && triggeredAge === null) triggeredAge = ageP1;
    }

    if (lifeState.p2Alive && careMetaP2) {
        updateCareMeta(careMetaP2, inputs, ageP2, yearData, lifeState.rngCareP2);
        if (careMetaP2 && careMetaP2.triggered && lifeState.triggeredAgeP2 === null) {
            lifeState.triggeredAgeP2 = ageP2;
        }
        if (careMetaP2 && careMetaP2.active) careEverActive = true;
    }

    if (inputs.accumulationPhase?.enabled && simulationsJahr < effectiveTransitionYear) {
        if ((lifeState.p1Alive && careMetaP1?.active) || (lifeState.p2Alive && careMetaP2?.active)) {
            effectiveTransitionYear = simulationsJahr;
        }
    }

    lifeState.p1ActiveThisYear = lifeState.p1Alive && careMetaP1?.active;
    lifeState.p2ActiveThisYear = lifeState.p2Alive && careMetaP2?.active;
    if (lifeState.p2ActiveThisYear) careEverActive = true;
    if (lifeState.p1ActiveThisYear) lifeState.p1CareYears++;
    if (lifeState.p2ActiveThisYear) lifeState.p2CareYears++;
    if (lifeState.p1ActiveThisYear && lifeState.p2ActiveThisYear) lifeState.bothCareYears++;

    if (!isAccumulation && lifeState.p1Alive) {
        let qx1 = MORTALITY_TABLE[inputs.geschlecht][ageP1] || 0.0005;
        const careFactorP1 = computeCareMortalityMultiplier(careMetaP1, inputs);
        if (careFactorP1 > 1) {
            qx1 = Math.min(1.0, qx1 * careFactorP1);
        }
        if (rand() < qx1) {
            lifeState.p1Alive = false;
        }
    }

    if (!isAccumulation && lifeState.p2Alive && careMetaP2) {
        const p2Gender = inputs.partner?.geschlecht || (inputs.geschlecht === 'm' ? 'w' : 'm');
        let qx2 = MORTALITY_TABLE[p2Gender][ageP2] || 0.0005;
        const careFactorP2 = computeCareMortalityMultiplier(careMetaP2, inputs);
        if (careFactorP2 > 1) {
            qx2 = Math.min(1.0, qx2 * careFactorP2);
        }
        if (rand() < qx2) {
            lifeState.p2Alive = false;
        }
    }

    if (widowEligibleThisYear && (!p1AliveAtStart || !p2AliveAtStart)) {
        if (!p1AliveAtStart && p2AliveAtStart) {
            lifeState.widowBenefitActiveForP2 = true;
        } else if (!p2AliveAtStart && p1AliveAtStart) {
            lifeState.widowBenefitActiveForP1 = true;
        }
    }

    if (!lifeState.p1Alive && !lifeState.p2Alive) {
        lifeState.runEndedBecauseAllDied = true;
        lifeState.deathLogContext = {
            jahr: simulationsJahr + 1,
            histJahr: yearData.jahr,
            inflation: yearData.inflation
        };
    }

    const careCostP1 = calcCareCost(careMetaP1, null);
    const careCostP2 = careMetaP2 ? calcCareCost(careMetaP2, null) : null;
    const totalCareFloor = careCostP1.zusatzFloor + (careCostP2 ? careCostP2.zusatzFloor : 0);
    const effectiveFlexFactor = computeHouseholdFlexFactor({
        p1Alive: lifeState.p1Alive,
        careMetaP1,
        p2Alive: lifeState.p2Alive,
        careMetaP2
    });
    const householdContext = lifeState.householdContext;
    householdContext.p1Alive = lifeState.p1Alive;
    householdContext.p2Alive = lifeState.hasPartner ? lifeState.p2Alive : false;
    householdContext.widowBenefits.p1FromP2 = lifeState.widowBenefitActiveForP1;
    householdContext.widowBenefits.p2FromP1 = lifeState.widowBenefitActiveForP2;
    householdContext.care = {
        p1: careMetaP1,
        p2: careMetaP2
    };

    const year = lifeState.year;
    year.ageP1 = ageP1;
    year.ageP2 = ageP2;
    year.effectiveTransitionYear = effectiveTransitionYear;
    year.triggeredAge = triggeredAge;
    year.careEverActive = careEverActive;
    year.isAccumulation = isAccumulation;
    year.totalCareFloor = totalCareFloor;
    year.effectiveFlexFactor = effectiveFlexFactor;
    year.householdContext = householdContext;
    return year;
}
