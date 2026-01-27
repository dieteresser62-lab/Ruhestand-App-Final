"use strict";

export function initAccumulationControls() {
    const enableAccumulationPhase = document.getElementById('enableAccumulationPhase');
    const accumulationPhaseDetails = document.getElementById('accumulationPhaseDetails');
    const accumulationDurationYears = document.getElementById('accumulationDurationYears');
    const accumulationSparrate = document.getElementById('accumulationSparrate');
    const sparrateIndexing = document.getElementById('sparrateIndexing');
    const p1StartAlter = document.getElementById('p1StartAlter');

    function updateAccumulationCalculations() {
        if (!enableAccumulationPhase || !enableAccumulationPhase.checked) return;

        // Compute derived outputs for the summary panel.
        const startAge = parseInt(p1StartAlter?.value || 40);
        const duration = parseInt(accumulationDurationYears?.value || 25);
        const monthlySavings = parseFloat(accumulationSparrate?.value || 2000);

        const transitionAge = startAge + duration;
        const totalContributions = monthlySavings * 12 * duration;

        const transitionAgeDisplay = document.getElementById('transitionAgeDisplay');
        const transitionYearDisplay = document.getElementById('transitionYearDisplay');
        const totalContributionsDisplay = document.getElementById('totalContributionsDisplay');

        if (transitionAgeDisplay) {
            transitionAgeDisplay.textContent = `${transitionAge} Jahre`;
        }
        if (transitionYearDisplay) {
            transitionYearDisplay.textContent = `Jahr ${duration}`;
        }
        if (totalContributionsDisplay) {
            totalContributionsDisplay.textContent = `${totalContributions.toLocaleString('de-DE')} €`;
        }
    }

    if (enableAccumulationPhase && accumulationPhaseDetails) {
        enableAccumulationPhase.addEventListener('change', () => {
            const enabled = enableAccumulationPhase.checked;
            // Toggle details panel and persist the flag.
            accumulationPhaseDetails.style.display = enabled ? 'block' : 'none';
            localStorage.setItem('sim_accumulationPhaseEnabled', enabled ? '1' : '0');
            if (enabled) {
                updateAccumulationCalculations();
            }
        });
    }

    // Generic Persistence Helper for Accumulation Fields
    const accumInputs = [
        { el: accumulationDurationYears, key: 'sim_accumulationDurationYears' },
        { el: accumulationSparrate, key: 'sim_accumulationSparrate' },
        { el: sparrateIndexing, key: 'sim_sparrateIndexing' }
    ];

    accumInputs.forEach(({ el, key }) => {
        if (el) {
            const saved = localStorage.getItem(key);
            if (saved !== null && saved !== "") {
                el.value = saved;
            }
            el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
                localStorage.setItem(key, el.value);
            });
        }
    });

    // Update calculations when input fields change
    if (accumulationDurationYears)
        accumulationDurationYears.addEventListener('input', updateAccumulationCalculations);
    if (accumulationSparrate)
        accumulationSparrate.addEventListener('input', updateAccumulationCalculations);
    if (p1StartAlter)
        p1StartAlter.addEventListener('input', updateAccumulationCalculations);

    // Trigger initial calc if enabled
    if (enableAccumulationPhase && enableAccumulationPhase.checked) {
        updateAccumulationCalculations();
    }
}
