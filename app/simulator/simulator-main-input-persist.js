"use strict";

import { SUPPORTED_PFLEGE_GRADES } from './simulator-data.js';
import { updateStartPortfolioDisplay } from './simulator-portfolio.js';
import { persistenceStorage } from '../shared/persistence-facade.js';
import { MONTE_CARLO_PARAMETER_LIMITS } from './monte-carlo-parameters.js';
import {
    HOUSEHOLD_SIMULATOR_NEED_FIELD_IDS,
    ensureHouseholdSimulatorNeedsMigrationPending,
    isHouseholdSimulatorNeedField,
    writeHouseholdSimulatorNeedOverride
} from './simulator-household-needs-persistence.js';

const CARE_GRADE_FIELD_IDS = SUPPORTED_PFLEGE_GRADES.flatMap(grade => [
    `pflegeStufe${grade}Zusatz`,
    `pflegeStufe${grade}FlexCut`,
    `pflegeStufe${grade}Mortality`
]);

export function initInputPersistence() {
    const allInputs = [
        'startFloorBedarf', 'startFlexBedarf', 'minimumFlexAnnual', 'flexBudgetAnnual', 'flexBudgetYears', 'flexBudgetRecharge', 'marketCapeRatio',
        'dynamicFlexPreset', 'dynamicFlexShowAdvanced',
        'dynamicFlex', 'horizonMethod', 'horizonYears', 'survivalQuantile', 'goGoActive', 'goGoMultiplier',
        'longevityMode', 'longevityQuantileShift', 'longevityRelativePct', 'longevityBufferYears',
        'p1StartAlter', 'p1Geschlecht', 'p1SparerPauschbetrag', 'p1KirchensteuerPct',
        'p1Monatsrente', 'p1StartInJahren', 'rentAdjMode', 'rentAdjPct',
        'pflegefallLogikAktivieren', 'pflegeModellTyp', ...CARE_GRADE_FIELD_IDS,
        'pflegeMaxFloor', 'pflegeRampUp', 'pflegeMinDauer', 'pflegeMaxDauer', 'pflegeKostenDrift',
        'pflegeRegionalZuschlag', 'pflegeKostenStaffelPreset',
        'entnahmeStrategie', 'bondTargetFactor', 'drawdownTrigger', 'bondRefillThreshold',
        'mcAnzahl', 'mcDauer', 'mcBlockSize', 'mcSeed', 'mcMethode', 'rngMode',
        'mcWorkerCount', 'mcWorkerBudget', 'useCapeSampling',
        'mcStartYearMode', 'mcStartYearFilter', 'mcStartYearHalfLife', 'mcExcludeEstimatedHistory'
    ];
    const householdNeedsState = ensureHouseholdSimulatorNeedsMigrationPending();
    const persistedHouseholdNeeds = householdNeedsState.values;

    const renderHouseholdNeedWriteResult = (element, result, eventType) => {
        const message = result.ok ? '' : result.message;
        element.dataset.householdNeedPersistenceError = result.ok ? 'false' : 'true';
        element.setCustomValidity?.(message);
        if (!result.ok && eventType === 'change') element.reportValidity?.();
    };
    allInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            // Persistence Logic
            const storageKey = 'sim_' + id;
            const isHouseholdNeed = isHouseholdSimulatorNeedField(id);
            const storedVal = isHouseholdNeed
                ? (persistedHouseholdNeeds?.[id] ?? null)
                : persistenceStorage.getItem(storageKey);
            if (id === 'mcAnzahl' && (storedVal === null || storedVal === '')) {
                element.value = String(MONTE_CARLO_PARAMETER_LIMITS.runs.default);
            }
            // noPersist allows specific fields to opt out of persisted storage.
            if (!element.dataset.noPersist && storedVal !== null && storedVal !== "") {
                if (element.type === 'checkbox') {
                    element.checked = (storedVal === 'true');
                } else if (element.type === 'radio') {
                    // Radio buttons usually have same name but different IDs.
                } else {
                    element.value = storedVal;
                    if (isHouseholdNeed) {
                        element.dataset.householdNeedLastValidValue = String(storedVal);
                    }
                }
            }

            const persistAndRefresh = (event) => {
                // Save to Storage
                if (!element.dataset.noPersist) {
                    if (isHouseholdNeed) {
                        const currentHouseholdNeeds = {};
                        HOUSEHOLD_SIMULATOR_NEED_FIELD_IDS.forEach(fieldId => {
                            const field = document.getElementById(fieldId);
                            if (field) currentHouseholdNeeds[fieldId] = field.value;
                        });
                        const fallbackHouseholdNeeds = {};
                        HOUSEHOLD_SIMULATOR_NEED_FIELD_IDS.forEach(fieldId => {
                            const field = document.getElementById(fieldId);
                            const fallback = field?.dataset?.householdNeedLastValidValue;
                            if (fallback !== undefined) fallbackHouseholdNeeds[fieldId] = fallback;
                        });
                        const result = writeHouseholdSimulatorNeedOverride(
                            id,
                            currentHouseholdNeeds,
                            persistenceStorage,
                            fallbackHouseholdNeeds
                        );
                        if (result.ok) {
                            element.dataset.householdNeedLastValidValue = result.state.values[id];
                        }
                        renderHouseholdNeedWriteResult(element, result, event?.type);
                    } else if (element.type === 'checkbox') {
                        persistenceStorage.setItem(storageKey, element.checked);
                    } else if (element.type !== 'radio') {
                        persistenceStorage.setItem(storageKey, element.value);
                    }
                }
                // Trigger UI Update
                updateStartPortfolioDisplay();
            };

            if (element.type === 'radio' || element.type === 'checkbox' || element.tagName === 'SELECT') {
                element.addEventListener('change', persistAndRefresh);
            } else {
                element.addEventListener('input', persistAndRefresh);
                element.addEventListener('change', persistAndRefresh);
            }
        }
    });
}
