"use strict";

import { SUPPORTED_PFLEGE_GRADES } from './simulator-data.js';
import { updateStartPortfolioDisplay } from './simulator-portfolio.js';

const CARE_GRADE_FIELD_IDS = SUPPORTED_PFLEGE_GRADES.flatMap(grade => [
    `pflegeStufe${grade}Zusatz`,
    `pflegeStufe${grade}FlexCut`,
    `pflegeStufe${grade}Mortality`
]);

export function initInputPersistence() {
    const allInputs = [
        'startFloorBedarf', 'startFlexBedarf', 'flexBudgetAnnual', 'flexBudgetYears', 'flexBudgetRecharge', 'marketCapeRatio',
        'dynamicFlexPreset', 'dynamicFlexShowAdvanced',
        'dynamicFlex', 'horizonMethod', 'horizonYears', 'survivalQuantile', 'goGoActive', 'goGoMultiplier',
        'p1StartAlter', 'p1Geschlecht', 'p1SparerPauschbetrag', 'p1KirchensteuerPct',
        'p1Monatsrente', 'p1StartInJahren', 'rentAdjMode', 'rentAdjPct',
        'pflegefallLogikAktivieren', 'pflegeModellTyp', ...CARE_GRADE_FIELD_IDS,
        'pflegeMaxFloor', 'pflegeRampUp', 'pflegeMinDauer', 'pflegeMaxDauer', 'pflegeKostenDrift',
        'pflegeRegionalZuschlag', 'pflegeKostenStaffelPreset'
    ];
    allInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            // Persistence Logic
            const storageKey = 'sim_' + id;
            const storedVal = localStorage.getItem(storageKey);
            // noPersist allows specific fields to opt out of localStorage.
            if (!element.dataset.noPersist && storedVal !== null && storedVal !== "") {
                if (element.type === 'checkbox') {
                    element.checked = (storedVal === 'true');
                } else if (element.type === 'radio') {
                    // Radio buttons usually have same name but different IDs.
                } else {
                    element.value = storedVal;
                }
            }

            const persistAndRefresh = () => {
                // Save to Storage
                if (!element.dataset.noPersist) {
                    if (element.type === 'checkbox') {
                        localStorage.setItem(storageKey, element.checked);
                    } else if (element.type !== 'radio') {
                        localStorage.setItem(storageKey, element.value);
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
