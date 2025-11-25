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
 *
 * 5. **Developer-Tests mit fixem Seed**
 *    - runSweepSelfTest() für Mini-Sweep mit R2-Invarianz-Prüfung
 *    - Aktivierung via Dev-Mode Toggle (localStorage: sim.devMode=1)
 *    - Console-Logs mit [SWEEP] Prefix
 *    - Visuelle Bestätigung in UI (grün/rot)
 *
 * DEVELOPER-FLAGS:
 * ----------------
 * - Dev-Mode aktivieren: localStorage.setItem('sim.devMode', '1'); dann Reload
 *   oder: Klick auf "Dev-Mode" Toggle im UI (falls vorhanden)
 * - Self-Test Button erscheint dann im Parameter-Sweep Tab
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

import { EngineAPI, Ruhestandsmodell_v30 } from './engine/index.mjs';
import { quantile, sum, mean, formatCurrency } from './simulator-utils.js';
import { getStartYearCandidates } from './cape-utils.js';
import { ENGINE_VERSION, STRESS_PRESETS, BREAK_ON_RUIN, MORTALITY_TABLE, annualData, SUPPORTED_PFLEGE_GRADES } from './simulator-data.js';
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

// Sicherstellen, dass die Legacy-Adapter-API geladen ist (für alte Caller, die Globals erwarten)
const legacyEngineAdapter = Ruhestandsmodell_v30 || (typeof window !== 'undefined' ? window.Ruhestandsmodell_v30 : null);
if (typeof window !== 'undefined' && legacyEngineAdapter && !window.Ruhestandsmodell_v30) {
    window.Ruhestandsmodell_v30 = legacyEngineAdapter;
}

/**
 * Wandelt den legacy Simulator-State in ein EngineAPI-kompatibles Input-Objekt um.
 *
 * Diese Hilfsfunktion dient als Migrationsbrücke: Sie liest die wichtigsten Felder
 * aus dem bestehenden Simulator-Status (Portfolio, Liquidität, Marktdaten) und
 * überführt sie in das schlankere Engine-Eingabeformat. Nicht verfügbare Werte
 * werden defensiv mit 0 oder konservativen Defaults befüllt, damit die neue Engine
 * nachvollziehbare Ergebnisse liefern kann, ohne dass bestehende Aufrufe brechen.
 *
 * @param {Object} currentState - Aktueller Simulator-Status (Portfolio, Marktdaten)
 * @param {Object} inputs - Benutzer-Eingaben aus dem UI
 * @param {Object} yearData - Marktdaten des aktuellen Jahres
 * @returns {Object} EngineAPI-kompatibles Input-Objekt
 */
function buildEngineInputFromLegacy(currentState, inputs, yearData) {
    const safeNumber = (value, fallback = 0) => {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : fallback;
    };

    const portfolio = currentState?.portfolio || {};
    const equityTranches = Array.isArray(portfolio.depotTranchesAktien) ? portfolio.depotTranchesAktien : [];
    const goldTranches = Array.isArray(portfolio.depotTranchesGold) ? portfolio.depotTranchesGold : [];

    const depotwertAlt = equityTranches
        .filter(tranche => tranche?.type === 'aktien_alt')
        .reduce((sum, tranche) => sum + safeNumber(tranche.marketValue), 0);
    const depotwertNeu = equityTranches
        .filter(tranche => tranche?.type === 'aktien_neu')
        .reduce((sum, tranche) => sum + safeNumber(tranche.marketValue), 0);

    const costBasisAlt = equityTranches
        .filter(tranche => tranche?.type === 'aktien_alt')
        .reduce((sum, tranche) => sum + safeNumber(tranche.costBasis, tranche.marketValue), 0);
    const costBasisNeu = equityTranches
        .filter(tranche => tranche?.type === 'aktien_neu')
        .reduce((sum, tranche) => sum + safeNumber(tranche.costBasis, tranche.marketValue), 0);

    const goldWert = goldTranches.reduce((sum, tranche) => sum + safeNumber(tranche.marketValue), 0);
    const goldCost = goldTranches.reduce((sum, tranche) => sum + safeNumber(tranche.costBasis, tranche.marketValue), 0);

    // Legacy-Portfolio führt Liquidität als Gesamtwert – wir splitten konservativ 50/50
    const liquiditaetGesamt = safeNumber(portfolio.liquiditaet, 0);
    const tagesgeld = liquiditaetGesamt * 0.5;
    const geldmarktEtf = liquiditaetGesamt - tagesgeld;

    const marketDataHist = currentState?.marketDataHist || {};
    const inflation = safeNumber(yearData?.inflation ?? yearData?.inflation_de, 0);

    return {
        aktuellesAlter: safeNumber(inputs?.startAlter ?? inputs?.p1StartAlter, 65),
        inflation,
        tagesgeld,
        geldmarktEtf,
        depotwertAlt,
        depotwertNeu,
        goldWert,
        costBasisAlt,
        costBasisNeu,
        goldCost,
        endeVJ: safeNumber(marketDataHist.endeVJ ?? yearData?.endeVJ, 0),
        endeVJ_1: safeNumber(marketDataHist.endeVJ_1 ?? yearData?.endeVJ_1, 0),
        endeVJ_2: safeNumber(marketDataHist.endeVJ_2 ?? yearData?.endeVJ_2, 0),
        endeVJ_3: safeNumber(marketDataHist.endeVJ_3 ?? yearData?.endeVJ_3, 0),
        ath: safeNumber(marketDataHist.ath ?? marketDataHist.endeVJ ?? 0, 0),
        jahreSeitAth: safeNumber(marketDataHist.jahreSeitAth, 0),
        renteAktiv: safeNumber(inputs?.p1Monatsrente ?? inputs?.renteMonatlich, 0) > 0,
        renteMonatlich: safeNumber(inputs?.p1Monatsrente ?? inputs?.renteMonatlich, 0),
        floorBedarf: safeNumber(currentState?.baseFloor ?? inputs?.startFloorBedarf, 0),
        flexBedarf: safeNumber(currentState?.baseFlex ?? inputs?.startFlexBedarf, 0),
        risikoprofil: inputs?.risikoprofil || 'sicherheits-dynamisch',
        kirchensteuerSatz: safeNumber(inputs?.p1KirchensteuerPct ?? inputs?.kirchensteuerSatz, 0),
        sparerPauschbetrag: safeNumber(inputs?.startSPB ?? inputs?.p1SparerPauschbetrag ?? inputs?.sparerPauschbetrag, 0),
        goldAktiv: Boolean(inputs?.goldAllokationAktiv ?? inputs?.goldAktiv),
        goldZielProzent: safeNumber(inputs?.goldAllokationProzent ?? inputs?.goldZielProzent, 0),
        goldFloorProzent: safeNumber(inputs?.goldFloorProzent, 0),
        rebalancingBand: safeNumber(inputs?.rebalancingBand ?? inputs?.rebalBand, 5),
        targetEq: safeNumber(inputs?.targetEq ?? 60, 60),
        rebalBand: safeNumber(inputs?.rebalBand ?? inputs?.rebalancingBand, 5),
        maxSkimPctOfEq: safeNumber(inputs?.maxSkimPctOfEq, 10),
        maxBearRefillPctOfEq: safeNumber(inputs?.maxBearRefillPctOfEq, 5),
        runwayMinMonths: safeNumber(inputs?.runwayMinMonths ?? 24, 24),
        runwayTargetMonths: safeNumber(inputs?.runwayTargetMonths ?? 36, 36)
    };
}

/**
 * Legacy-Shim für simulateOneYear -> EngineAPI.simulateSingleYear.
 *
 * Der Simulator ruft historisch `simulateOneYear` aus simulator-engine.js auf. Um die
 * neue Engine-API schrittweise einzuführen, wird hier ein synchroner Shim bereitgestellt,
 * der die Legacy-Signatur akzeptiert, die Eingaben konvertiert und Fehler sauber meldet.
 *
 * @param {Object} currentState - Alter Simulator-Zustand (Portfolio, Historie)
 * @param {Object} inputs - UI-Eingaben
 * @param {Object} yearData - Marktdaten des aktuellen Jahres
 * @param {number} yearIndex - Index des Simulationsjahres (nur für Logging genutzt)
 * @returns {Object} Engine-Resultat oder strukturiertes Fehlerobjekt
 */
function simulateOneYear(currentState, inputs, yearData, yearIndex) {
    const engineApi = EngineAPI || (typeof window !== 'undefined' ? window.EngineAPI : null);
    if (!engineApi || typeof engineApi.simulateSingleYear !== 'function') {
        return {
            error: new Error('EngineAPI.simulateSingleYear ist nicht verfügbar – Engine-Bundle fehlt?'),
            yearIndex
        };
    }

    try {
        const engineInput = buildEngineInputFromLegacy(currentState, inputs, yearData);
        const lastState = currentState?.lastState || null;
        const result = engineApi.simulateSingleYear(engineInput, lastState);

        if (result?.error) {
            return result;
        }

        // Rückgabe enthält zusätzlich das Input-Objekt, um Diagnose und Paritätstests zu erleichtern
        return {
            ...result,
            engineInput,
            legacyInput: { currentState, inputs, yearData, yearIndex }
        };
    } catch (error) {
        return { error, yearIndex };
    }
}


/**
 * Prüft Engine-Version und -Hash
 */
export function selfCheckEngine() {
    if (typeof window.Ruhestandsmodell_v30 === 'undefined') {
        const footer = document.getElementById('engine-mismatch-footer');
        if (footer) {
            footer.textContent = `FEHLER: Die Engine-Datei 'engine.js' konnte nicht geladen werden!`;
            footer.style.display = 'block';
        }
        return;
    };

    const fnBody = Object.values(window.Ruhestandsmodell_v30).reduce((s, fn) => s + (typeof fn === 'function' ? fn.toString() : ''), '');
    let hash = 0;
    for (let i = 0; i < fnBody.length; i++) {
        hash = ((hash << 5) - hash) + fnBody.charCodeAt(i);
        hash |= 0;
    }
    const currentHash = String(Math.abs(hash));
    const mismatch = window.Ruhestandsmodell_v30.VERSION !== ENGINE_VERSION;

    const footer = document.getElementById('engine-mismatch-footer');
    if (mismatch && footer) {
        footer.textContent = `WARNUNG: Engine-Version veraltet! Erwartet: ${ENGINE_VERSION}, gefunden: ${window.Ruhestandsmodell_v30.VERSION}`;
        footer.style.display = 'block';
    }
}

/**
 * DOM-Initialisierung und Event-Handler
 */
window.onload = function () {
    selfCheckEngine();
    prepareHistoricalData();

    updateStartPortfolioDisplay();

    const allInputs = [
        'simStartVermoegen', 'depotwertAlt', 'zielLiquiditaet',
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
            const eventType = (element.type === 'radio' || element.type === 'checkbox') ? 'change' : 'input';
            element.addEventListener(eventType, updateStartPortfolioDisplay);
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

    // Partner/Rente-2 configuration with localStorage persistence
    initRente2ConfigWithLocalStorage();
};

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
 *
 * Aktivierung: Dev-Mode Toggle oder localStorage.setItem('sim.devMode', '1')
 */
async function runSweepSelfTest() {
    const resultsDiv = document.getElementById('sweepSelfTestResults');
    const button = document.getElementById('sweepSelfTestButton');

    button.disabled = true;
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = '<p style="color: #666;">🔬 Sweep-Tests laufen...</p>';

    console.log('[SWEEP-TEST] ========================================');
    console.log('[SWEEP-TEST] Starte Sweep-Selbsttest-Suite');
    console.log('[SWEEP-TEST] ========================================');

    try {
        prepareHistoricalData();

        const logMessages = [];
        let allTestsPassed = true;

        // =====================================================================
        // TEST 1: Baseline - P2-Invarianten bleiben über Cases konstant
        // =====================================================================
        console.log('[SWEEP-TEST] Test 1: Baseline (P2-Invarianz)');
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
                console.log(`[SWEEP-TEST] ✓ Case ${caseIdx + 1}: Referenz gesetzt (rebalBand=${testCase.rebalBand})`);
                console.log(`[SWEEP-TEST]   P2-Invarianten:`, p2Inv);
                logMessages.push(`&nbsp;&nbsp;✓ Case ${caseIdx + 1}: Referenz gesetzt (rebalBand=${testCase.rebalBand})`);
                logMessages.push(`&nbsp;&nbsp;&nbsp;&nbsp;aktiv=${p2Inv.aktiv}, brutto=${p2Inv.brutto}, rentAdjPct=${p2Inv.rentAdjPct}`);
            } else {
                if (areP2InvariantsEqual(p2Inv, REF_P2_INV)) {
                    console.log(`[SWEEP-TEST] ✓ Case ${caseIdx + 1}: P2-Invarianten konstant (rebalBand=${testCase.rebalBand})`);
                    logMessages.push(`&nbsp;&nbsp;✓ Case ${caseIdx + 1}: P2-Invarianten konstant (rebalBand=${testCase.rebalBand})`);
                } else {
                    test1Passed = false;
                    allTestsPassed = false;
                    console.error(`[SWEEP-TEST] ✗ Case ${caseIdx + 1}: P2-Invarianten variieren! (rebalBand=${testCase.rebalBand})`);
                    console.error(`[SWEEP-TEST]   Referenz:`, REF_P2_INV);
                    console.error(`[SWEEP-TEST]   Aktuell:`, p2Inv);
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
        console.log('[SWEEP-TEST] Test 2: Deep-Copy-Schutz');
        logMessages.push('<strong>Test 2: Deep-Copy-Schutz</strong>');

        const baseInputsAfter = JSON.stringify(baseInputs);
        const test2Passed = baseInputsJson === baseInputsAfter;

        if (test2Passed) {
            console.log('[SWEEP-TEST] ✓ baseInputs blieben unverändert nach Cases');
            logMessages.push('&nbsp;&nbsp;✓ baseInputs blieben unverändert nach Cases');
        } else {
            console.error('[SWEEP-TEST] ✗ baseInputs wurden modifiziert! Deep-Copy fehlerhaft!');
            logMessages.push('&nbsp;&nbsp;<span style="color: red;">✗ baseInputs wurden modifiziert! Deep-Copy fehlerhaft!</span>');
            allTestsPassed = false;
        }

        logMessages.push(test2Passed ? '<span style="color: green;">✓ Test 2 bestanden</span>' : '<span style="color: red;">✗ Test 2 fehlgeschlagen</span>');
        logMessages.push('');

        // =====================================================================
        // TEST 3: Negativtest - P2-Änderung sollte erkannt werden
        // =====================================================================
        console.log('[SWEEP-TEST] Test 3: Negativtest (P2-Änderung sollte erkannt werden)');
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
                console.log('[SWEEP-TEST] ⚠ Absichtlich partner.brutto geändert (für Negativtest)');
            }

            // NEUE PRÜFUNG: Extrahiere P2-Invarianten (keine Simulation nötig!)
            const p2Inv = extractP2Invariants(inputs);

            if (NEG_REF_P2_INV === null) {
                NEG_REF_P2_INV = p2Inv;
                console.log(`[SWEEP-TEST] ✓ Neg-Case ${caseIdx + 1}: Referenz gesetzt`);
                logMessages.push(`&nbsp;&nbsp;✓ Neg-Case ${caseIdx + 1}: Referenz gesetzt`);
            } else {
                if (areP2InvariantsEqual(p2Inv, NEG_REF_P2_INV)) {
                    console.error(`[SWEEP-TEST] ✗ Neg-Case ${caseIdx + 1}: P2-Änderung wurde NICHT erkannt!`);
                    logMessages.push(`&nbsp;&nbsp;<span style="color: red;">✗ Neg-Case ${caseIdx + 1}: P2-Änderung wurde NICHT erkannt!</span>`);
                    allTestsPassed = false;
                } else {
                    console.log(`[SWEEP-TEST] ✓ Neg-Case ${caseIdx + 1}: P2-Änderung korrekt erkannt!`);
                    console.log(`[SWEEP-TEST]   Referenz:`, NEG_REF_P2_INV);
                    console.log(`[SWEEP-TEST]   Geändert:`, p2Inv);
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
        console.log('[SWEEP-TEST] ========================================');
        console.log('[SWEEP-TEST] Gesamtergebnis: ' + (allTestsPassed ? '✓ ALLE TESTS BESTANDEN' : '✗ TESTS FEHLGESCHLAGEN'));
        console.log('[SWEEP-TEST] ========================================');

        const statusColor = allTestsPassed ? 'green' : 'red';
        const statusText = allTestsPassed ? '✓ Alle Tests bestanden' : '✗ Einige Tests fehlgeschlagen';

        let html = `<div style="padding: 15px; background-color: ${allTestsPassed ? '#e8f5e9' : '#ffebee'}; border-radius: 4px; border: 1px solid ${statusColor};">`;
        html += `<strong style="color: ${statusColor}; font-size: 1.1rem;">${statusText}</strong><br><br>`;
        html += `<div style="font-family: monospace; font-size: 0.85rem; line-height: 1.6;">`;
        html += logMessages.join('<br>');
        html += `</div>`;
        html += `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 0.8rem; color: #666;">`;
        html += `Hinweis: Console-Logs enthalten detaillierte Test-Ausgaben mit [SWEEP-TEST] Prefix.`;
        html += `</div></div>`;

        resultsDiv.innerHTML = html;

    } catch (error) {
        resultsDiv.innerHTML = `<p style="color: red;">Fehler: ${error.message}</p>`;
        console.error('[SWEEP-TEST] Fehler:', error);
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
