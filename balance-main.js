"use strict";

/**
 * ===================================================================================
 * BALANCE-APP HAUPTMODUL - ES6 VERSION
 * ===================================================================================
 */

import { CONFIG, REQUIRED_ENGINE_API_VERSION_PREFIX } from './balance-config.js';
import { StorageManager, initStorageManager } from './balance-storage.js';
import { UIReader, initUIReader } from './balance-reader.js';
import { UIRenderer, initUIRenderer } from './balance-renderer.js';
import { UIBinder, initUIBinder } from './balance-binder.js';
import { initTranchenStatus, syncTranchenToInputs } from './depot-tranchen-status.js';
import { listProfiles, saveCurrentProfileFromLocalStorage, setProfileVerbundMembership, updateProfileData, getCurrentProfileId } from './profile-storage.js';
import { loadProfilverbundProfiles, aggregateProfilverbundInputs, calculateWithdrawalDistribution, buildProfilverbundAssetSummary, buildProfilverbundProfileSummaries } from './profilverbund-balance.js';
import { renderProfilverbundProfileSelector, toggleProfilverbundMode } from './profilverbund-balance-ui.js';
import { UIUtils } from './balance-utils.js';

// ==================================================================================
// APPLICATION STATE & DOM REFERENCES
// ==================================================================================

const appState = {
    debounceTimer: null,
    snapshotHandle: null,
    diagnosisData: null,
    lastUpdateTimestamp: null,
    lastMarktData: null
};

const PROFILVERBUND_STORAGE_KEYS = {
    mode: 'household_withdrawal_mode'
};

const PROFILE_VALUE_KEYS = {
    tagesgeld: 'profile_tagesgeld',
    renteAktiv: 'profile_rente_aktiv',
    renteMonatlich: 'profile_rente_monatlich',
    alter: 'profile_aktuelles_alter',
    goldAktiv: 'profile_gold_aktiv',
    goldZiel: 'profile_gold_ziel_pct',
    goldFloor: 'profile_gold_floor_pct',
    goldSteuerfrei: 'profile_gold_steuerfrei',
    goldRebalBand: 'profile_gold_rebal_band'
};

const dom = {
    outputs: {
        miniSummary: document.getElementById('miniSummary'),
        depotwert: document.getElementById('displayDepotwert'),
        neuerBedarf: document.getElementById('neuerBedarf'),
        zielLiquiditaet: document.getElementById('zielLiquiditaet'),
        liquiditaetBalken: document.getElementById('liquiditaetBalken'),
        balkenContainer: document.querySelector('.progress-bar-container'),
        marktstatusText: document.getElementById('marktstatusText'),
        monatlicheEntnahme: document.getElementById('monatlicheEntnahme'),
        handlungsanweisung: document.getElementById('handlungsanweisung'),
        minGoldDisplay: document.getElementById('minGoldDisplay'),
        entnahmeDetailsContent: document.getElementById('entnahmeDetailsContent'),
        entnahmeBreakdown: document.getElementById('entnahme-breakdown'),
        snapshotList: document.getElementById('snapshotList'),
        printFooter: document.getElementById('print-footer')
    },
    inputs: {}, // Wird in init() gefüllt
    controls: {
        exportBtn: document.getElementById('exportBtn'),
        importBtn: document.getElementById('importBtn'),
        importFile: document.getElementById('importFile'),
        btnJahresUpdate: document.getElementById('btnJahresUpdate'),
        btnJahresUpdateLog: document.getElementById('btnJahresUpdateLog'),
        btnNachruecken: document.getElementById('btnNachruecken'),
        btnUndoNachruecken: document.getElementById('btnUndoNachruecken'),
        btnCsvImport: document.getElementById('btnCsvImport'),
        csvFileInput: document.getElementById('csvFileInput'),
        copyAction: document.getElementById('copyAction'),
        resetBtn: document.getElementById('resetBtn'),
        jahresabschlussBtn: document.getElementById('jahresabschlussBtn'),
        connectFolderBtn: document.getElementById('connectFolderBtn'),
        snapshotStatus: document.getElementById('snapshotStatus'),
        goldPanel: document.getElementById('goldPanel')
    },
    containers: {
        error: document.getElementById('error-container'),
        bedarfAnpassung: document.getElementById('bedarfAnpassungContainer'),
        tabButtons: document.querySelector('.tab-buttons'),
        tabPanels: document.querySelectorAll('.tab-panel'),
        form: document.querySelector('.form-column'),
        versionAlert: document.getElementById('engine-version-alert')
    },
    diagnosis: {
        drawer: document.getElementById('diagnosisDrawer'),
        overlay: document.getElementById('drawerOverlay'),
        openBtn: document.getElementById('openDiagnosisBtn'),
        closeBtn: document.getElementById('closeDiagnosisBtn'),
        copyBtn: document.getElementById('copyDiagnosisBtn'),
        filterToggle: document.getElementById('diagFilterToggle'),
        content: document.getElementById('diagContent'),
        chips: document.getElementById('diag-chips'),
        decisionTree: document.getElementById('diag-decision-tree'),
        guardrails: document.getElementById('diag-guardrails'),
        transaction: document.getElementById('diag-transaction'),
        keyParams: document.getElementById('diag-key-params')
    }
};

// ==================================================================================
// CORE APPLICATION FUNCTIONS
// ==================================================================================

/**
 * Haupt-Update-Funktion - Kern der Balance-App
 *
 * Diese Funktion orchestriert den kompletten Update-Zyklus:
 * 1. Liest alle UI-Eingaben (Vermögen, Bedarf, Marktdaten)
 * 2. Lädt persistenten Zustand (Guardrail-History)
 * 3. Ruft die externe Engine auf (engine.js)
 * 4. Rendert alle Ergebnisse in der UI
 * 5. Speichert den neuen Zustand
 *
 * Wird aufgerufen bei:
 * - Initialisierung der App
 * - Änderung von Input-Feldern (debounced)
 * - Import von Daten
 * - Jahresabschluss
 */
function update() {
    try {
        UIRenderer.clearError();

        syncProfileDerivedInputs();

        // 1. Read Inputs & State
        // Liest alle Formular-Eingaben und den letzten gespeicherten Zustand
        const inputData = UIReader.readAllInputs();
        const profilverbundProfiles = loadProfilverbundProfiles();
        if (profilverbundProfiles.length > 0) {
            const assetSummary = buildProfilverbundAssetSummary(profilverbundProfiles);
            const totalRenteMonatlich = assetSummary.totalRenteMonatlich;
            inputData.tagesgeld = assetSummary.totalTagesgeld;
            inputData.geldmarktEtf = assetSummary.totalGeldmarkt;
            inputData.depotwertAlt = assetSummary.totalDepotAlt;
            inputData.depotwertNeu = assetSummary.totalDepotNeu;
            inputData.costBasisAlt = assetSummary.totalCostAlt;
            inputData.costBasisNeu = assetSummary.totalCostNeu;
            inputData.goldWert = assetSummary.totalGold;
            inputData.goldCost = assetSummary.totalGoldCost;
            inputData.renteAktiv = totalRenteMonatlich > 0;
            inputData.renteMonatlich = totalRenteMonatlich;

            const aggregated = aggregateProfilverbundInputs(profilverbundProfiles, {
                floorBedarf: inputData.floorBedarf,
                flexBedarf: inputData.flexBedarf
            });
            window.__profilverbundDistribution = calculateWithdrawalDistribution(profilverbundProfiles, aggregated, localStorage.getItem(PROFILVERBUND_STORAGE_KEYS.mode) || 'tax_optimized');
            window.__profilverbundProfileSummaries = buildProfilverbundProfileSummaries(profilverbundProfiles);
        } else {
            window.__profilverbundDistribution = null;
            window.__profilverbundProfileSummaries = null;
        }

        // Check for empty/initial state to avoid validation errors
        if (!inputData.aktuellesAlter || inputData.aktuellesAlter === 0) {
            UIRenderer.clearError();
            // Optionally clear results or show specific "Start" message
            // For now, just return to keep UI clean
            return;
        }

        const persistentState = StorageManager.loadState();

        const profilverbundRuns = (profilverbundProfiles.length > 1)
            ? runProfilverbundProfileSimulations(inputData, profilverbundProfiles)
            : null;
        if (!profilverbundRuns && typeof window !== 'undefined') {
            window.__profilverbundActionResults = null;
        }

        // 2. Render Bedarfsanpassungs-UI
        // Zeigt Button für Inflationsanpassung, wenn das Alter sich geändert hat
        UIRenderer.renderBedarfAnpassungUI(inputData, persistentState);

        appState.lastUpdateTimestamp = Date.now();

        // 3. Call Engine
        // Die externe Engine (engine.js) berechnet alle Werte
        // Input: Benutzereingaben + letzter State
        // Output: {input, newState, diagnosis, ui} oder {error}
        const modelResult = window.EngineAPI.simulateSingleYear(inputData, persistentState.lastState);

        // 4. Handle Engine Response
        // Bei Fehler: Exception werfen für einheitliches Error-Handling
        if (modelResult.error) {
            throw modelResult.error;
        }
        if (profilverbundRuns && modelResult.ui) {
            modelResult.ui.action = mergeProfilverbundActions(profilverbundRuns);
        }

        // 5. Prepare data for Renderer
        // Kombiniert Engine-Output mit Eingaben für vollständige UI-Darstellung
        const uiDataForRenderer = {
            ...modelResult.ui,
            input: inputData
        };

        // 6. Render & Save
        // Rendert alle UI-Komponenten: Summary, Liquiditätsbalken, Handlungsanweisung, etc.
        UIRenderer.render(uiDataForRenderer);

        // Bereitet Diagnose-Daten auf und rendert das Diagnose-Panel
        const formattedDiagnosis = UIRenderer.formatDiagnosisPayload(modelResult.diagnosis);

        // Design-Note: Die Transaktionsdiagnostik wird unverändert aus der Engine übernommen,
        // damit UI und Export dieselben Kennzahlen nutzen können.
        if (formattedDiagnosis && modelResult.ui?.action?.transactionDiagnostics) {
            formattedDiagnosis.transactionDiagnostics = modelResult.ui.action.transactionDiagnostics;
        }

        appState.diagnosisData = formattedDiagnosis;
        UIRenderer.renderDiagnosis(appState.diagnosisData);

        // Speichert Eingaben und neuen Zustand
        if (profilverbundRuns) {
            persistProfilverbundProfileStates(profilverbundRuns);
        } else {
            StorageManager.saveState({ ...persistentState, inputs: inputData, lastState: modelResult.newState });
        }

        refreshProfilverbundBalance();

    } catch (error) {
        console.error("Update-Fehler:", error);
        UIRenderer.handleError(error);
    }
}

/**
 * Debounced Update-Funktion
 *
 * Verzögert den Update-Aufruf um 250ms, um bei schnellen Eingaben
 * (z.B. Tippen in Zahlenfeldern) nicht zu viele Updates auszulösen.
 * Spart Performance und reduziert Flackern.
 */
function debouncedUpdate() {
    clearTimeout(appState.debounceTimer);
    appState.debounceTimer = setTimeout(update, 250);
}

/**
 * Führt den Engine-Handshake beim Start durch
 *
 * Überprüft:
 * 1. Ob engine.js geladen wurde
 * 2. Ob die API-Version kompatibel ist (v31.x erforderlich)
 * 3. Zeigt ggf. Warnbanner bei Versionsinkompatibilität
 *
 * @throws {Error} Wenn Engine nicht geladen oder ungültig
 */
function initVersionHandshake() {
    try {
        if (typeof window.EngineAPI === 'undefined' || typeof window.EngineAPI.getVersion !== 'function') {
            throw new Error("EngineAPI (engine.js) konnte nicht geladen werden oder ist ungültig.");
        }

        const version = window.EngineAPI.getVersion();
        if (!version || typeof version.api !== 'string' || typeof version.build !== 'string') {
            throw new Error("EngineAPI.getVersion() liefert ein ungültiges Format.");
        }

        // Version Handshake
        if (!version.api.startsWith(REQUIRED_ENGINE_API_VERSION_PREFIX)) {
            const alertBanner = dom.containers.versionAlert;
            alertBanner.textContent = `WARNUNG: Veraltete Engine-Version erkannt (Geladen: ${version.api}, Erwartet: ${REQUIRED_ENGINE_API_VERSION_PREFIX}x). Die App ist möglicherweise instabil. Bitte aktualisieren Sie die Engine-Datei (engine.js).`;
            alertBanner.style.display = 'block';
            alertBanner.tabIndex = -1;
        }

        // Cache-Busting
        const scriptTag = document.querySelector('script[src^="engine.js"]');
        if (scriptTag && version.build) {
            const newSrc = `engine.js?v=${version.build}`;
            if (scriptTag.src !== newSrc) {
                scriptTag.src = newSrc;
            }
        }

    } catch (e) {
        // Harter Fehler, wenn die Engine fehlt
        const alertBanner = dom.containers.versionAlert;
        alertBanner.textContent = `FATALER FEHLER: ${e.message}. Die Anwendung kann nicht gestartet werden.`;
        alertBanner.style.display = 'block';
        alertBanner.style.backgroundColor = 'var(--danger-color)';
        alertBanner.style.color = 'white';
        alertBanner.tabIndex = -1;
        throw new Error("Engine Load Failed");
    }
}

/**
 * Initialisiert die Anwendung - Entry Point
 *
 * Ablauf:
 * 1. Engine-Handshake (Versions-Check)
 * 2. Debug-Modus initialisieren
 * 3. DOM-Referenzen sammeln
 * 4. Alle Module initialisieren (mit Dependency Injection)
 * 5. Gespeicherten Zustand laden und anwenden
 * 6. Event-Listener binden
 * 7. Theme anwenden
 * 8. Snapshot-System initialisieren
 * 9. Erstes Update durchführen
 *
 * Module-Architektur:
 * - UIReader: Liest DOM-Eingaben
 * - StorageManager: localStorage + File System API
 * - UIRenderer: Rendert alle UI-Komponenten
 * - UIBinder: Event-Handler für alle Interaktionen
 */
function init() {
    try {
        // 1. Engine Handshake
        // Prüft ob engine.js geladen ist und die Version kompatibel ist
        initVersionHandshake();
        console.info("Engine ready and handshake successful.", window.EngineAPI.getVersion());
    } catch (e) {
        console.error("Initialisierung abgebrochen wegen Engine-Fehler.");
        return;
    }

    // 2. Populate DOM inputs
    // Sammelt alle input/select-Elemente mit ID in dom.inputs{}
    document.querySelectorAll('input, select').forEach(el => {
        if (el.id) dom.inputs[el.id] = el;
    });

    // 4. Initialize all modules with their dependencies
    // Dependency Injection Pattern: Jedes Modul erhält seine Abhängigkeiten
    initUIReader(dom);
    initStorageManager(dom, appState, UIRenderer);
    initUIRenderer(dom, StorageManager);
    initUIBinder(dom, appState, update, debouncedUpdate);

    // 5. Set version info
    // Zeigt UI- und Engine-Version im Print-Footer
    dom.outputs.printFooter.textContent = `UI: ${CONFIG.APP.VERSION} | Engine: ${window.EngineAPI.getVersion().api}`;

    // 6. Load and apply saved state
    // Lädt letzten Zustand aus localStorage und wendet ihn auf die Formular-Felder an
    const persistentState = StorageManager.loadState();
    UIReader.applyStoredInputs(persistentState.inputs);
    syncProfileDerivedInputs();
    syncTranchenToInputs({ silent: true });

    // 7. Bind UI events
    // Registriert alle Event-Listener (input, change, click, keyboard shortcuts)
    UIBinder.bindUI();

    // 8. Initialize snapshots
    // Prüft ob File System API verfügbar ist und lädt Snapshot-Liste
    StorageManager.initSnapshots().then(() => {
        StorageManager.renderSnapshots(dom.outputs.snapshotList, dom.controls.snapshotStatus, appState.snapshotHandle);
    });

    // 9. Initial update
    // Führt ersten Berechnungs- und Render-Zyklus durch
    update();

    // 10. Initialize Depot-Tranchen Status Badge
    // Zeigt Status der geladenen detaillierten Tranchen an
    initTranchenStatus('tranchenStatusBadge');

    initProfilverbundBalance();
}

function refreshProfilverbundBalance() {
    const mode = localStorage.getItem(PROFILVERBUND_STORAGE_KEYS.mode) || 'tax_optimized';

    saveCurrentProfileFromLocalStorage();
    const profileInputs = loadProfilverbundProfiles();
    if (profileInputs.length < 1) {
        return;
    }

    const currentInputs = UIReader.readAllInputs();
    const aggregated = aggregateProfilverbundInputs(profileInputs, {
        floorBedarf: currentInputs.floorBedarf,
        flexBedarf: currentInputs.flexBedarf
    });
    const distribution = calculateWithdrawalDistribution(profileInputs, aggregated, mode);
    const proportional = calculateWithdrawalDistribution(profileInputs, aggregated, 'proportional');

}

function syncProfileDerivedInputs() {
    const tagesgeldRaw = localStorage.getItem(PROFILE_VALUE_KEYS.tagesgeld);
    const renteAktivRaw = localStorage.getItem(PROFILE_VALUE_KEYS.renteAktiv);
    const renteMonatlichRaw = localStorage.getItem(PROFILE_VALUE_KEYS.renteMonatlich);
    const alterRaw = localStorage.getItem(PROFILE_VALUE_KEYS.alter);
    const goldAktivRaw = localStorage.getItem(PROFILE_VALUE_KEYS.goldAktiv);
    const goldZielRaw = localStorage.getItem(PROFILE_VALUE_KEYS.goldZiel);
    const goldFloorRaw = localStorage.getItem(PROFILE_VALUE_KEYS.goldFloor);
    const goldSteuerfreiRaw = localStorage.getItem(PROFILE_VALUE_KEYS.goldSteuerfrei);
    const goldRebalRaw = localStorage.getItem(PROFILE_VALUE_KEYS.goldRebalBand);

    const profilverbundProfiles = loadProfilverbundProfiles();
    if (profilverbundProfiles.length > 0) {
        const assetSummary = buildProfilverbundAssetSummary(profilverbundProfiles);
        const tagesgeld = assetSummary.totalTagesgeld;
        const renteMonatlich = assetSummary.totalRenteMonatlich;

        if (dom.inputs.tagesgeld && Number.isFinite(tagesgeld)) {
            dom.inputs.tagesgeld.value = Math.round(tagesgeld).toLocaleString('de-DE');
        }
        if (dom.inputs.renteAktiv) {
            dom.inputs.renteAktiv.value = renteMonatlich > 0 ? 'ja' : 'nein';
        }
        if (dom.inputs.renteMonatlich && Number.isFinite(renteMonatlich)) {
            dom.inputs.renteMonatlich.value = Math.round(renteMonatlich).toLocaleString('de-DE');
        }
        if (dom.inputs.fixedIncomeAnnual && Number.isFinite(renteMonatlich)) {
            dom.inputs.fixedIncomeAnnual.value = Math.round(renteMonatlich * 12).toLocaleString('de-DE');
        }
        if (dom.inputs.aktuellesAlter && alterRaw !== null) {
            const alter = UIUtils.parseCurrency(alterRaw);
            if (Number.isFinite(alter)) {
                dom.inputs.aktuellesAlter.value = String(Math.round(alter));
            }
        }

        if (dom.inputs.geldmarktEtf && Number.isFinite(assetSummary.totalGeldmarkt)) {
            dom.inputs.geldmarktEtf.value = Math.round(assetSummary.totalGeldmarkt).toLocaleString('de-DE');
        }
        if (dom.inputs.depotwertAlt && Number.isFinite(assetSummary.totalDepotAlt)) {
            dom.inputs.depotwertAlt.value = Math.round(assetSummary.totalDepotAlt).toLocaleString('de-DE');
        }
        if (dom.inputs.depotwertNeu && Number.isFinite(assetSummary.totalDepotNeu)) {
            dom.inputs.depotwertNeu.value = Math.round(assetSummary.totalDepotNeu).toLocaleString('de-DE');
        }
        if (dom.inputs.depotwertGesamt) {
            const totalDepot = (assetSummary.totalDepotAlt || 0) + (assetSummary.totalDepotNeu || 0);
            dom.inputs.depotwertGesamt.value = Math.round(totalDepot).toLocaleString('de-DE');
        }
        if (dom.inputs.costBasisAlt && Number.isFinite(assetSummary.totalCostAlt)) {
            dom.inputs.costBasisAlt.value = Math.round(assetSummary.totalCostAlt).toLocaleString('de-DE');
        }
        if (dom.inputs.costBasisNeu && Number.isFinite(assetSummary.totalCostNeu)) {
            dom.inputs.costBasisNeu.value = Math.round(assetSummary.totalCostNeu).toLocaleString('de-DE');
        }
        if (dom.inputs.goldWert && Number.isFinite(assetSummary.totalGold)) {
            dom.inputs.goldWert.value = Math.round(assetSummary.totalGold).toLocaleString('de-DE');
        }
        if (dom.inputs.goldCost && Number.isFinite(assetSummary.totalGoldCost)) {
            dom.inputs.goldCost.value = Math.round(assetSummary.totalGoldCost).toLocaleString('de-DE');
        }

        if (typeof window !== 'undefined') {
            window.__profilverbundTranchenOverride = assetSummary.mergedTranches;
        }
    } else {
        if (dom.inputs.tagesgeld && tagesgeldRaw !== null) {
            const tagesgeld = UIUtils.parseCurrency(tagesgeldRaw);
            if (Number.isFinite(tagesgeld)) {
                dom.inputs.tagesgeld.value = Math.round(tagesgeld).toLocaleString('de-DE');
            }
        }
        if (dom.inputs.renteAktiv && renteAktivRaw !== null) {
            const normalized = String(renteAktivRaw).toLowerCase() === 'true' ? 'ja' : 'nein';
            dom.inputs.renteAktiv.value = normalized;
        }
        if (dom.inputs.renteMonatlich && renteMonatlichRaw !== null) {
            const renteMonatlich = UIUtils.parseCurrency(renteMonatlichRaw);
            if (Number.isFinite(renteMonatlich)) {
                dom.inputs.renteMonatlich.value = Math.round(renteMonatlich).toLocaleString('de-DE');
            }
        }
        if (dom.inputs.fixedIncomeAnnual) {
            const renteMonatlich = UIUtils.parseCurrency(renteMonatlichRaw);
            if (Number.isFinite(renteMonatlich)) {
                dom.inputs.fixedIncomeAnnual.value = Math.round(renteMonatlich * 12).toLocaleString('de-DE');
            }
        }
        if (dom.inputs.aktuellesAlter && alterRaw !== null) {
            const alter = UIUtils.parseCurrency(alterRaw);
            if (Number.isFinite(alter)) {
                dom.inputs.aktuellesAlter.value = String(Math.round(alter));
            }
        }
        if (dom.inputs.depotwertGesamt) {
            const depotAlt = dom.inputs.depotwertAlt ? UIUtils.parseCurrency(dom.inputs.depotwertAlt.value) : 0;
            const depotNeu = dom.inputs.depotwertNeu ? UIUtils.parseCurrency(dom.inputs.depotwertNeu.value) : 0;
            if (Number.isFinite(depotAlt) || Number.isFinite(depotNeu)) {
                const totalDepot = (Number.isFinite(depotAlt) ? depotAlt : 0) + (Number.isFinite(depotNeu) ? depotNeu : 0);
                dom.inputs.depotwertGesamt.value = Math.round(totalDepot).toLocaleString('de-DE');
            }
        }
        if (typeof window !== 'undefined') {
            window.__profilverbundTranchenOverride = null;
        }
    }

    if (dom.inputs.goldAktiv && goldAktivRaw !== null) {
        dom.inputs.goldAktiv.checked = String(goldAktivRaw).toLowerCase() === 'true';
    }
    if (dom.inputs.goldZielProzent && goldZielRaw !== null) {
        const ziel = UIUtils.parseCurrency(goldZielRaw);
        if (Number.isFinite(ziel)) dom.inputs.goldZielProzent.value = ziel;
    }
    if (dom.inputs.goldFloorProzent && goldFloorRaw !== null) {
        const floor = UIUtils.parseCurrency(goldFloorRaw);
        if (Number.isFinite(floor)) dom.inputs.goldFloorProzent.value = floor;
    }
    if (dom.inputs.goldSteuerfrei && goldSteuerfreiRaw !== null) {
        dom.inputs.goldSteuerfrei.checked = String(goldSteuerfreiRaw).toLowerCase() === 'true';
    }
    if (dom.inputs.rebalancingBand && goldRebalRaw !== null) {
        const band = UIUtils.parseCurrency(goldRebalRaw);
        if (Number.isFinite(band)) dom.inputs.rebalancingBand.value = band;
    }

    if (UIReader.applySideEffectsFromInputs) {
        UIReader.applySideEffectsFromInputs();
    }
}

function buildProfileEngineInput(sharedInput, entry) {
    const inputs = entry?.inputs || {};
    const output = { ...sharedInput };
    const perProfileKeys = [
        'aktuellesAlter',
        'tagesgeld',
        'geldmarktEtf',
        'depotwertAlt',
        'depotwertNeu',
        'goldWert',
        'costBasisAlt',
        'costBasisNeu',
        'goldCost',
        'tqfAlt',
        'tqfNeu',
        'renteAktiv',
        'renteMonatlich',
        'kirchensteuerSatz',
        'sparerPauschbetrag',
        'goldAktiv',
        'goldZielProzent',
        'goldFloorProzent',
        'goldSteuerfrei',
        'rebalancingBand'
    ];
    perProfileKeys.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(inputs, key)) {
            output[key] = inputs[key];
        }
    });
    output.detailledTranches = Array.isArray(entry?.tranches) ? entry.tranches : [];
    return output;
}

function runProfilverbundProfileSimulations(sharedInput, profiles) {
    const runs = profiles.map(entry => {
        const input = buildProfileEngineInput(sharedInput, entry);
        const lastState = entry?.balanceState?.lastState || null;
        const result = window.EngineAPI.simulateSingleYear(input, lastState);
        if (result?.error) {
            throw result.error;
        }
        return {
            profileId: entry.profileId,
            name: entry.name || entry.profileId,
            input,
            ui: result.ui,
            newState: result.newState,
            balanceState: entry.balanceState
        };
    });

    if (typeof window !== 'undefined') {
        window.__profilverbundActionResults = runs.map(run => ({
            profileId: run.profileId,
            name: run.name,
            action: run.ui?.action || {},
            input: run.input,
            spending: run.ui?.spending || {},
            targetLiquidity: run.ui?.zielLiquiditaet
        }));
    }
    return runs;
}

function mergeProfilverbundActions(runs) {
    const hasTransaction = runs.some(run => run.ui?.action?.type === 'TRANSACTION');
    const title = hasTransaction ? 'Profilverbund-Transaktionen' : (runs[0]?.ui?.action?.title || 'Kein Handlungsbedarf');
    const anweisungKlasse = hasTransaction ? 'anweisung-gelb' : (runs[0]?.ui?.action?.anweisungKlasse || 'anweisung-gruen');
    const mergedUses = runs.reduce((acc, run) => {
        const uses = run.ui?.action?.verwendungen || {};
        acc.liquiditaet += uses.liquiditaet || 0;
        acc.gold += uses.gold || 0;
        acc.aktien += uses.aktien || 0;
        acc.geldmarkt += uses.geldmarkt || 0;
        return acc;
    }, { liquiditaet: 0, gold: 0, aktien: 0, geldmarkt: 0 });

    return {
        type: hasTransaction ? 'TRANSACTION' : 'NONE',
        title,
        anweisungKlasse,
        nettoErlös: runs.reduce((sum, run) => sum + (run.ui?.action?.nettoErlös || 0), 0),
        steuer: runs.reduce((sum, run) => sum + (run.ui?.action?.steuer || 0), 0),
        verwendungen: mergedUses
    };
}

function persistProfilverbundProfileStates(runs) {
    runs.forEach(run => {
        const existing = (run.balanceState && typeof run.balanceState === 'object') ? run.balanceState : {};
        const nextState = { ...existing, inputs: run.input, lastState: run.newState };
        updateProfileData(run.profileId, {
            [CONFIG.STORAGE.LS_KEY]: JSON.stringify(nextState)
        });
        if (run.profileId === getCurrentProfileId()) {
            localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify(nextState));
        }
    });
}

function initProfilverbundBalance() {
    const modeSelect = document.getElementById('profilverbund-withdrawal-mode');
    const profileList = document.getElementById('profilverbund-profile-list');

    if (!modeSelect || !profileList) return;

    const profiles = listProfiles();
    if (profiles.length < 1) {
        toggleProfilverbundMode(false);
        return;
    }

    profiles.forEach(profile => {
        setProfileVerbundMembership(profile.id, true);
    });
    const refreshedProfiles = listProfiles();
    renderProfilverbundProfileSelector(refreshedProfiles, 'profilverbund-profile-list');

    const storedMode = localStorage.getItem(PROFILVERBUND_STORAGE_KEYS.mode) || 'tax_optimized';

    modeSelect.value = storedMode;
    toggleProfilverbundMode(true);

    modeSelect.addEventListener('change', () => {
        localStorage.setItem(PROFILVERBUND_STORAGE_KEYS.mode, modeSelect.value);
        refreshProfilverbundBalance();
    });

    profileList.addEventListener('change', event => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        const profileId = target.dataset.profileId;
        if (!profileId) return;
        setProfileVerbundMembership(profileId, target.checked);
        refreshProfilverbundBalance();
    });

    refreshProfilverbundBalance();
}

// ==================================================================================
// APPLICATION ENTRY POINT
// ==================================================================================

document.addEventListener('DOMContentLoaded', init);
