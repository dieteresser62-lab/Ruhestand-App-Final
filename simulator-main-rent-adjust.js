"use strict";

export function initRentAdjModeUI() {
    const rentAdjModeSelect = document.getElementById('rentAdjMode');
    const rentAdjPctInput = document.getElementById('rentAdjPct');
    if (!rentAdjModeSelect || !rentAdjPctInput) return;

    const rentAdjPctGroup = rentAdjPctInput.closest('.form-group');

    rentAdjModeSelect.addEventListener('change', () => {
        const mode = rentAdjModeSelect.value;
        if (mode === 'fix') {
            rentAdjPctInput.disabled = false;
            rentAdjPctInput.title = 'Gemeinsame Rentenanpassung für beide Personen';
            if (rentAdjPctGroup) rentAdjPctGroup.style.display = 'flex';
        } else {
            // For wage/CPI coupling, the percent is derived from data.
            rentAdjPctInput.disabled = true;
            rentAdjPctInput.title = 'Wird automatisch über Koppelung gesteuert (' + (mode === 'wage' ? 'Lohnentwicklung' : 'Inflation') + ')';
            if (rentAdjPctGroup) rentAdjPctGroup.style.display = 'none';
        }
    });
    // Initial state
    const initialMode = rentAdjModeSelect.value || 'fix';
    rentAdjPctInput.disabled = initialMode !== 'fix';
    if (initialMode !== 'fix') {
        rentAdjPctInput.title = 'Wird automatisch über Koppelung gesteuert (' + (initialMode === 'wage' ? 'Lohnentwicklung' : 'Inflation') + ')';
        if (rentAdjPctGroup) rentAdjPctGroup.style.display = 'none';
    } else {
        rentAdjPctInput.title = 'Gemeinsame Rentenanpassung für beide Personen';
        if (rentAdjPctGroup) rentAdjPctGroup.style.display = 'flex';
    }
}
