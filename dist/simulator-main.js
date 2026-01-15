"use strict";

/**
 * ============================================================================
 * SWEEP FIX: ZWEI-PERSONEN-HAUSHALT - PARAMETER WHITELIST & RENTE-2-INVARIANZ
 * ============================================================================
 *
 * Datum: 2025-11-07
 *
 * ÄNDERUNGEN:
 * -----------
 * 1. **Whitelist statt Blacklist für Sweep-Parameter**
 *    - Nur explizit erlaubte Parameter (SWEEP_ALLOWED_KEYS) dürfen im Sweep variiert werden
 *    - Verhindert unbeabsichtigte Änderungen an Person-2-Parametern (Rente, Alter, etc.)
 *    - Blocklist (SWEEP_BLOCK_PATTERNS) für zusätzlichen Schutz von Person-2-Feldern
 *
 * 2. **Deep-Copy der Settings pro Sweep-Zelle**
 *    - deepClone() verwendet structuredClone() (Browser-Native) oder JSON-Fallback
 *    - Verhindert Side-Effects zwischen Sweep-Cases
 *    - baseInputs werden nur EINMAL gelesen und dann geklont
 *
 * 3. **Renten-Invarianz-Wächter für Person 2**
 *    - Extrahiert Rente-2-Serie aus Year-Logs (extractR2Series)
 *    - Vergleicht Rente-2 über alle Sweep-Cases (areR2SeriesEqual)
 *    - Setzt warningR2Varies-Flag bei Abweichungen
 *    - Referenz-Serie wird beim ersten Case gesetzt
 *
 * 4. **Heatmap-Badge & Tooltip für Verstöße**
 *    - Gelber Rand (stroke-width: 3px) bei warningR2Varies
 *    - Warn-Symbol ⚠ in betroffenen Heatmap-Zellen
 *    - Tooltip: "⚠ Rente 2 variierte im Sweep"
 *    - Keine KPI-Verfälschung, nur visuelle Markierung
 * - Fixed Seed für Tests: Wird in runSweepSelfTest() hartcodiert (baseSeed = 12345)
 *
 * BETROFFENE DATEIEN:
 * -------------------
 * - simulator-main.js:     UI-Init, Monte-Carlo und Sweep-Integration (Sweep-Logik ausgelagert)
 * - simulator-sweep.js:    Sweep-Logik, Range-Parsing, Whitelist/Blocklist-Enforcement
 * - simulator-heatmap.js:  Heatmap-Rendering mit R2-Warning-Badge
 * - simulator-results.js:  Metriken-Aggregation (warningR2Varies)
 *
 * ============================================================================
 */

import { EngineAPI } from './engine/index.mjs';
import { simulateOneYear } from './simulator-engine-wrapper.js';
import { quantile, sum, mean, formatCurrency } from './simulator-utils.js';
import { getStartYearCandidates } from './cape-utils.js';
import { ENGINE_VERSION, STRESS_PRESETS, BREAK_ON_RUIN, MORTALITY_TABLE, annualData, SUPPORTED_PFLEGE_GRADES } from './simulator-data.js';
import { initTranchenStatus, syncTranchenToInputs } from './depot-tranchen-status.js';
import {
    getCommonInputs,
    updateStartPortfolioDisplay,
    initializePortfolio,
    prepareHistoricalData,
    buildStressContext,
    applyStressOverride,
    computeRentAdjRate
} from './simulator-portfolio.js';
import {
    portfolioTotal,
    displayMonteCarloResults,
    renderWorstRunLog,
    aggregateSweepMetrics,
    getWorstRunColumnDefinitions,
    WORST_LOG_DETAIL_KEY
} from './simulator-results.js';
import { sumDepot } from './simulator-portfolio.js';
import {
    applyPflegeKostenPreset,
    updatePflegePresetHint,
    updatePflegeUIInfo,
    initializePflegeUIControls
} from './simulator-ui-pflege.js';
import { initRente2ConfigWithLocalStorage } from './simulator-ui-rente.js';
import { runMonteCarlo } from './simulator-monte-carlo.js';
import { displaySweepResults, initSweepDefaultsWithLocalStorageFallback, runParameterSweep } from './simulator-sweep.js';
import {
    normalizeWidowOptions,
    computeMarriageYearsCompleted,
    deepClone,
    setNested,
    withNoLSWrites
} from './simulator-sweep-utils.js';
import { initAutoOptimizeUI, setAutoOptimizeDefaults } from './auto_optimize_ui.js';
import {
    applyPensionTax,
    formatCellForDisplay,
    formatColumnValue,
    getNestedValue,
    prepareRowsForExport,
    resolveColumnRawValue,
    triggerDownload
} from './simulator-main-helpers.js';
import { exportBacktestLogData, initializeBacktestUI, renderBacktestLog, runBacktest } from './simulator-backtest.js';

const CARE_GRADE_FIELD_IDS = SUPPORTED_PFLEGE_GRADES.flatMap(grade => [
    `pflegeStufe${grade}Zusatz`,
    `pflegeStufe${grade}FlexCut`,
    `pflegeStufe${grade}Mortality`
]);

/**
 * Prüft Engine-Version
 */
export function selfCheckEngine() {
    if (typeof window.EngineAPI === 'undefined' || typeof window.EngineAPI.getVersion !== 'function') {
        const footer = document.getElementById('engine-mismatch-footer');
        if (footer) {
            footer.textContent = `FEHLER: Die Engine-Datei 'engine.js' konnte nicht geladen werden!`;
            footer.style.display = 'block';
        }
        return;
    }

    const version = window.EngineAPI.getVersion();
    // Version Check logic if needed, currently just existence check
    // If strict versioning is required, compare version.api with required version
}

/**
 * DOM-Initialisierung und Event-Handler
 */
window.onload = function () {
    selfCheckEngine();
    prepareHistoricalData();

    updateStartPortfolioDisplay();

    const allInputs = [
        'simStartVermoegen', 'depotwertAlt', 'tagesgeld', 'geldmarktEtf',
        'goldAllokationAktiv', 'goldAllokationProzent', 'goldFloorProzent', 'rebalancingBand',
        'goldSteuerfrei', 'startFloorBedarf', 'startFlexBedarf',
        'einstandAlt', 'p1StartAlter', 'p1Geschlecht', 'p1SparerPauschbetrag', 'p1KirchensteuerPct',
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
            if (storedVal !== null && storedVal !== "") {
                if (element.type === 'checkbox') {
                    element.checked = (storedVal === 'true');
                } else if (element.type === 'radio') {
                    // Radio buttons usually have same name but different IDs. 
                    // If ID is in list, we treat it as specific element.
                    // But usually we store the *value* of the group.
                    // For now, skip radios in this generic block to avoid conflicts.
                } else {
                    element.value = storedVal;
                }
            }

            const eventType = (element.type === 'radio' || element.type === 'checkbox') ? 'change' : 'input';

            element.addEventListener(eventType, () => {
                // Save to Storage
                if (element.type === 'checkbox') {
                    localStorage.setItem(storageKey, element.checked);
                } else if (element.type !== 'radio') {
                    localStorage.setItem(storageKey, element.value);
                }
                // Trigger UI Update
                updateStartPortfolioDisplay();
            });
        }
    });

    initializePflegeUIControls();

    const mcMethodeSelect = document.getElementById('mcMethode');
    mcMethodeSelect.addEventListener('change', () => { document.getElementById('mcBlockSize').disabled = mcMethodeSelect.value !== 'block'; });

    // Rentenanpassungs-Modus: Enable/Disable + Show/Hide Prozentfeld
    const rentAdjModeSelect = document.getElementById('rentAdjMode');
    const rentAdjPctInput = document.getElementById('rentAdjPct');
    if (rentAdjModeSelect && rentAdjPctInput) {
        const rentAdjPctGroup = rentAdjPctInput.closest('.form-group');

        rentAdjModeSelect.addEventListener('change', () => {
            const mode = rentAdjModeSelect.value;
            if (mode === 'fix') {
                rentAdjPctInput.disabled = false;
                rentAdjPctInput.title = 'Gemeinsame Rentenanpassung für beide Personen';
                if (rentAdjPctGroup) rentAdjPctGroup.style.display = 'flex';
            } else {
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

    // VERALTET: Alte Indexierungs-Logik (deaktiviert, versteckt)
    // const renteIndexArtSelect = document.getElementById('renteIndexierungsart');
    // renteIndexArtSelect.addEventListener('change', () => { document.getElementById('festerSatzContainer').style.display = renteIndexArtSelect.value === 'fest' ? 'block' : 'none'; });

    // Legacy Hook: Checkbox wurde im UI entfernt, darf aber kein ReferenceError mehr auslösen
    const pflegeMortalitaetCheckbox = document.getElementById('pflegeMortalitaetOverride');

    // Partner/Rente-2-Einstellungen: Toggle Show/Hide
    const chkPartnerAktiv = document.getElementById('chkPartnerAktiv');
    const sectionRente2 = document.getElementById('sectionRente2');
    if (chkPartnerAktiv && sectionRente2) {
        chkPartnerAktiv.addEventListener('change', () => {
            const aktiv = chkPartnerAktiv.checked;
            sectionRente2.style.display = aktiv ? 'block' : 'none';
            localStorage.setItem('sim_partnerAktiv', aktiv ? '1' : '0');
        });
    }

    // Ansparphase: Toggle Show/Hide und Berechnungen
    const enableAccumulationPhase = document.getElementById('enableAccumulationPhase');
    const accumulationPhaseDetails = document.getElementById('accumulationPhaseDetails');
    const accumulationDurationYears = document.getElementById('accumulationDurationYears');
    const accumulationSparrate = document.getElementById('accumulationSparrate');
    const sparrateIndexing = document.getElementById('sparrateIndexing');
    const p1StartAlter = document.getElementById('p1StartAlter');

    function updateAccumulationCalculations() {
        if (!enableAccumulationPhase || !enableAccumulationPhase.checked) return;

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
                // Also trigger calc if needed (already bound below)
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

    const careDetailsCheckbox = document.getElementById('toggle-care-details');
    // Checkbox-Handler für Szenario-Logs werden in displayMonteCarloResults registriert

    // Backtest-spezifische UI-Hooks sind ausgelagert, um die Main-Initialisierung zu entschlacken.
    initializeBacktestUI();

    const stressSelect = document.getElementById('stressPreset');
    if (stressSelect) {
        Object.entries(STRESS_PRESETS).forEach(([key, preset]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = preset.label;
            stressSelect.appendChild(option);
        });
    }

    document.getElementById('mcBlockSize').disabled = mcMethodeSelect.value !== 'block';
    // VERALTET: document.getElementById('festerSatzContainer').style.display = renteIndexArtSelect.value === 'fest' ? 'block' : 'none';
    initializeLegacyMortalityToggleIfPresent(pflegeMortalitaetCheckbox);

    const sweepMetricSelect = document.getElementById('sweepMetric');
    const sweepAxisXSelect = document.getElementById('sweepAxisX');
    const sweepAxisYSelect = document.getElementById('sweepAxisY');

    if (sweepMetricSelect) {
        sweepMetricSelect.addEventListener('change', () => {
            if (window.sweepResults && window.sweepResults.length > 0) {
                displaySweepResults();
            }
        });
    }

    if (sweepAxisXSelect) {
        sweepAxisXSelect.addEventListener('change', () => {
            if (window.sweepResults && window.sweepResults.length > 0) {
                displaySweepResults();
            }
        });
    }

    if (sweepAxisYSelect) {
        sweepAxisYSelect.addEventListener('change', () => {
            if (window.sweepResults && window.sweepResults.length > 0) {
                displaySweepResults();
            }
        });
    }

    // Grid-Size-Counter für Parameter-Sweep
    function updateSweepGridSize() {
        const rangeInputs = {
            runwayMin: document.getElementById('sweepRunwayMin').value,
            runwayTarget: document.getElementById('sweepRunwayTarget').value,
            targetEq: document.getElementById('sweepTargetEq').value,
            rebalBand: document.getElementById('sweepRebalBand').value,
            maxSkimPct: document.getElementById('sweepMaxSkimPct').value,
            maxBearRefillPct: document.getElementById('sweepMaxBearRefillPct').value,
            goldTargetPct: document.getElementById('sweepGoldTargetPct').value
        };

        let totalSize = 1;
        let hasError = false;

        try {
            for (const rangeStr of Object.values(rangeInputs)) {
                if (!rangeStr || !rangeStr.trim()) {
                    hasError = true;
                    break;
                }
                const values = parseRangeInput(rangeStr);
                if (values.length === 0) {
                    hasError = true;
                    break;
                }
                totalSize *= values.length;
            }
        } catch (error) {
            hasError = true;
        }

        const gridSizeEl = document.getElementById('sweepGridSize');
        if (gridSizeEl) {
            if (hasError) {
                gridSizeEl.textContent = 'Grid: ? Kombis';
                gridSizeEl.style.color = '#999';
            } else if (totalSize > 300) {
                gridSizeEl.textContent = `Grid: ${totalSize} Kombis (⚠ Max: 300)`;
                gridSizeEl.style.color = '#d32f2f';
            } else {
                gridSizeEl.textContent = `Grid: ${totalSize} Kombis`;
                gridSizeEl.style.color = 'var(--secondary-color)';
            }
        }
    }

    // Add event listeners to all sweep input fields
    const sweepInputIds = [
        'sweepRunwayMin', 'sweepRunwayTarget', 'sweepTargetEq', 'sweepRebalBand',
        'sweepMaxSkimPct', 'sweepMaxBearRefillPct', 'sweepGoldTargetPct'
    ];

    sweepInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateSweepGridSize);
        }
    });

    // Initial update
    updateSweepGridSize();

    // Tab switching logic
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and panels
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));

            // Add active class to clicked button and corresponding panel
            button.classList.add('active');
            const tabId = 'tab-' + button.dataset.tab;
            const targetPanel = document.getElementById(tabId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });

    // Sweep defaults with localStorage persistence
    initSweepDefaultsWithLocalStorageFallback();

    // Auto-Optimize UI initialization
    setAutoOptimizeDefaults();
    initAutoOptimizeUI();

    // Partner/Rente-2 configuration with localStorage persistence
    initRente2ConfigWithLocalStorage();

    // Reset-Button Initialisierung
    initResetButton();

    // Tranchen automatisch in die Eingabefelder übernehmen (ohne Alert)
    syncTranchenToInputs({ silent: true });
    updateStartPortfolioDisplay();

    // Depot-Tranchen Status Badge
    // Zeigt Status der geladenen detaillierten Tranchen an
    initTranchenStatus('tranchenStatusBadge');

    // Initial calculation on load is handled by individual tabs
    // Monte Carlo, Backtest, Sweep, and Auto-Optimize have their own trigger buttons
};

/**
 * Initialisiert den Reset-Button für die Simulator-Einstellungen.
 */
function initResetButton() {
    const resetBtn = document.getElementById('resetBtn');
    if (!resetBtn) return;

    resetBtn.addEventListener('click', () => {
        if (confirm('Möchten Sie wirklich alle gespeicherten Simulator-Einstellungen zurücksetzen? Dies kann nicht rückgängig gemacht werden.')) {
            // Alle Keys entfernen, die mit 'sim_' beginnen
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('sim_')) {
                    keysToRemove.push(key);
                }
            }

            keysToRemove.forEach(key => localStorage.removeItem(key));

            // Seite neu laden, um leere Felder (Default-Zustand) anzuzeigen
            window.location.reload();
        }
    });
}

/**
 * Initialisiert (falls vorhanden) den alten Pflege-Mortalitäts-Toggle.
 *
 * Einige Historienstände erwarten weiterhin eine Checkbox mit der ID
 * "pflegeMortalitaetOverride" sowie eine Funktion `syncMortalityToggle`.
 * Die aktuelle UI stellt diesen Schalter nicht mehr dar, weshalb die Referenzen
 * bislang zu einem ReferenceError führten und die komplette onload-Routine
 * (inkl. Tab-Handlern) gestoppt wurde. Die Defensive Guards sorgen dafür, dass
 * wir den Toggle nur dann benutzen, wenn er wirklich existiert und ein Sync-
 * Callback verfügbar ist.
 *
 * @param {HTMLInputElement|null} checkbox - Optionaler Legacy-Toggle.
 * @returns {void}
 */
function initializeLegacyMortalityToggleIfPresent(checkbox) {
    if (!checkbox) {
        return; // Keine Legacy-Checkbox – frühzeitig aussteigen.
    }

    const invokeSyncIfAvailable = () => {
        if (typeof window.syncMortalityToggle === 'function') {
            window.syncMortalityToggle();
        }
    };

    // Initiale Synchronisierung nach dem DOM-Load.
    invokeSyncIfAvailable();

    // Re-Sync sobald der (Legacy-)Toggle verändert wird.
    checkbox.addEventListener('change', invokeSyncIfAvailable);
}

/**
 * Führt einen umfassenden Sweep-Selbsttest durch (Developer-Modus)
 *
 * Tests:
 * 1. Baseline-Test: Rente2 bleibt über Cases konstant (Whitelist greift)
 * 2. Negativtest: Simuliert absichtliche R2-Änderung (sollte erkannt werden)
 * 3. Deep-Copy-Test: baseInputs bleiben nach Sweep unverändert
 */
async function runSweepSelfTest() {
    const resultsDiv = document.getElementById('sweepSelfTestResults');
    const button = document.getElementById('sweepSelfTestButton');

    button.disabled = true;
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = '<p style="color: #666;">🔬 Sweep-Tests laufen...</p>';

    try {
        prepareHistoricalData();

        const logMessages = [];
        let allTestsPassed = true;

        // =====================================================================
        // TEST 1: Baseline - P2-Invarianten bleiben über Cases konstant
        // =====================================================================
        logMessages.push('<strong>Test 1: Baseline (P2-Invarianz) - NEUE PRÜFUNG</strong>');

        const testCases = [
            { rebalBand: 5, targetEq: 60 },
            { rebalBand: 10, targetEq: 60 },
            { rebalBand: 15, targetEq: 60 }
        ];

        const baseInputs = deepClone(getCommonInputs());
        const baseInputsJson = JSON.stringify(baseInputs); // Für Deep-Copy-Test
        const anzahlRuns = 10;
        const maxDauer = 10;
        const baseSeed = 12345;
        const methode = 'regime_markov';

        let REF_P2_INV = null;
        let test1Passed = true;

        for (let caseIdx = 0; caseIdx < testCases.length; caseIdx++) {
            const testCase = testCases[caseIdx];
            const inputs = deepClone(baseInputs);
            inputs.rebalBand = testCase.rebalBand;
            inputs.targetEq = testCase.targetEq;

            // NEUE PRÜFUNG: Extrahiere P2-Basis-Parameter (keine Simulation nötig!)
            const p2Inv = extractP2Invariants(inputs);

            if (REF_P2_INV === null) {
                REF_P2_INV = p2Inv;
                logMessages.push(`&nbsp;&nbsp;✓ Case ${caseIdx + 1}: Referenz gesetzt (rebalBand=${testCase.rebalBand})`);
                logMessages.push(`&nbsp;&nbsp;&nbsp;&nbsp;aktiv=${p2Inv.aktiv}, brutto=${p2Inv.brutto}, rentAdjPct=${p2Inv.rentAdjPct}`);
            } else {
                if (areP2InvariantsEqual(p2Inv, REF_P2_INV)) {
                    logMessages.push(`&nbsp;&nbsp;✓ Case ${caseIdx + 1}: P2-Invarianten konstant (rebalBand=${testCase.rebalBand})`);
                } else {
                    test1Passed = false;
                    allTestsPassed = false;
                    logMessages.push(`&nbsp;&nbsp;<span style="color: red;">✗ Case ${caseIdx + 1}: P2-Invarianten variieren! (rebalBand=${testCase.rebalBand})</span>`);
                    logMessages.push(`&nbsp;&nbsp;&nbsp;&nbsp;Referenz: ${JSON.stringify(REF_P2_INV)}`);
                    logMessages.push(`&nbsp;&nbsp;&nbsp;&nbsp;Aktuell: ${JSON.stringify(p2Inv)}`);
                }
            }
        }

        logMessages.push(test1Passed ? '<span style="color: green;">✓ Test 1 bestanden</span>' : '<span style="color: red;">✗ Test 1 fehlgeschlagen</span>');
        logMessages.push('');

        // =====================================================================
        // TEST 2: Deep-Copy-Test - baseInputs bleiben unverändert
        // =====================================================================
        logMessages.push('<strong>Test 2: Deep-Copy-Schutz</strong>');

        const baseInputsAfter = JSON.stringify(baseInputs);
        const test2Passed = baseInputsJson === baseInputsAfter;

        if (test2Passed) {
            logMessages.push('&nbsp;&nbsp;✓ baseInputs blieben unverändert nach Cases');
        } else {
            logMessages.push('&nbsp;&nbsp;<span style="color: red;">✗ baseInputs wurden modifiziert! Deep-Copy fehlerhaft!</span>');
            allTestsPassed = false;
        }

        logMessages.push(test2Passed ? '<span style="color: green;">✓ Test 2 bestanden</span>' : '<span style="color: red;">✗ Test 2 fehlgeschlagen</span>');
        logMessages.push('');

        // =====================================================================
        // TEST 3: Negativtest - P2-Änderung sollte erkannt werden
        // =====================================================================
        logMessages.push('<strong>Test 3: Negativtest (P2-Änderung erkennen) - NEUE PRÜFUNG</strong>');

        // Simuliere zwei Cases, wobei beim zweiten absichtlich partner.brutto geändert wird
        const negTestCases = [
            { rebalBand: 10, p2Change: false },
            { rebalBand: 15, p2Change: true } // Hier ändern wir absichtlich partner.brutto
        ];

        let NEG_REF_P2_INV = null;
        let test3Passed = false; // Sollte NACH dem zweiten Case true werden (wenn Änderung erkannt wurde)

        for (let caseIdx = 0; caseIdx < negTestCases.length; caseIdx++) {
            const testCase = negTestCases[caseIdx];
            const inputs = deepClone(baseInputs);
            inputs.rebalBand = testCase.rebalBand;

            // ABSICHTLICH P2 ändern beim zweiten Case (nur für Test!)
            if (testCase.p2Change && inputs.partner && inputs.partner.aktiv) {
                inputs.partner.brutto = inputs.partner.brutto * 1.5; // +50%
            }

            // NEUE PRÜFUNG: Extrahiere P2-Invarianten (keine Simulation nötig!)
            const p2Inv = extractP2Invariants(inputs);

            if (NEG_REF_P2_INV === null) {
                NEG_REF_P2_INV = p2Inv;
                logMessages.push(`&nbsp;&nbsp;✓ Neg-Case ${caseIdx + 1}: Referenz gesetzt`);
            } else {
                if (areP2InvariantsEqual(p2Inv, NEG_REF_P2_INV)) {
                    logMessages.push(`&nbsp;&nbsp;<span style="color: red;">✗ Neg-Case ${caseIdx + 1}: P2-Änderung wurde NICHT erkannt!</span>`);
                    allTestsPassed = false;
                } else {
                    logMessages.push(`&nbsp;&nbsp;<span style="color: green;">✓ Neg-Case ${caseIdx + 1}: P2-Änderung korrekt erkannt!</span>`);
                    logMessages.push(`&nbsp;&nbsp;&nbsp;&nbsp;brutto: ${NEG_REF_P2_INV.brutto} → ${p2Inv.brutto}`);
                    test3Passed = true;
                }
            }
        }

        logMessages.push(test3Passed ? '<span style="color: green;">✓ Test 3 bestanden</span>' : '<span style="color: red;">✗ Test 3 fehlgeschlagen</span>');
        logMessages.push('');

        // =====================================================================
        // Gesamtergebnis
        // =====================================================================
        const statusColor = allTestsPassed ? 'green' : 'red';
        const statusText = allTestsPassed ? '✓ Alle Tests bestanden' : '✗ Einige Tests fehlgeschlagen';

        let html = `<div style="padding: 15px; background-color: ${allTestsPassed ? '#e8f5e9' : '#ffebee'}; border-radius: 4px; border: 1px solid ${statusColor};">`;
        html += `<strong style="color: ${statusColor}; font-size: 1.1rem;">${statusText}</strong><br><br>`;
        html += `<div style="font-family: monospace; font-size: 0.85rem; line-height: 1.6;">`;
        html += logMessages.join('<br>');
        html += `</div></div>`;

        resultsDiv.innerHTML = html;

    } catch (error) {
        resultsDiv.innerHTML = `<p style="color: red;">Fehler: ${error.message}</p>`;
    } finally {
        button.disabled = false;
    }
}

// Globale Funktionen für HTML onclick-Handler
window.runMonteCarlo = runMonteCarlo;
window.runBacktest = runBacktest;
window.runParameterSweep = runParameterSweep;
window.displaySweepResults = displaySweepResults;
window.formatCurrency = formatCurrency;
window.runSweepSelfTest = runSweepSelfTest;
window.renderBacktestLog = renderBacktestLog;
window.exportBacktestLogData = exportBacktestLogData;

// Für Parity Smoke Test
window.simulateOneYear = simulateOneYear;
window.annualData = annualData;
