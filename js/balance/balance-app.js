'use strict';
;(function() { // START OF MAIN IIFE

/**
 * ===================================================================================
 * APP-KONFIGURATION & FEHLERKLASSEN (UI-SCHICHT)
 * ===================================================================================
 */

// NEU: Erforderliche Engine-Version
const REQUIRED_ENGINE_API_VERSION_PREFIX = "31.";

// App-spezifische Konfiguration (bleibt in der UI)
const CONFIG = {
    APP: {
        VERSION: 'v21.1 Refactored (Engine v31)',
        NAME: 'Ruhestand-Balancing'
    },
    STORAGE: {
        LS_KEY: `ruhestandsmodellValues_v29_guardrails`,
        MIGRATION_FLAG: 'migration_v29_inflation_sanitized',
        SNAPSHOT_PREFIX: 'ruhestandsmodell_snapshot_'
    }
};

// FEHLERKLASSEN (bleiben in der UI, da UIRenderer.handleError sie verwendet)
class AppError extends Error {
    constructor(message, context = {}) {
        super(message);
        this.context = context;
        this.timestamp = new Date();
    }
}
class ValidationError extends AppError {
    constructor(errors) {
        super("Einige Eingaben sind ungültig. Bitte korrigieren Sie die markierten Felder.");
        this.name = 'ValidationError';
        this.errors = errors; // Array von {field, message}
    }
}
class FinancialCalculationError extends AppError {
    constructor(message, context) {
        super(message, context);
        this.name = 'FinancialCalculationError';
    }
}
class StorageError extends AppError {
    constructor(message, context) {
        super(message, context);
        this.name = 'StorageError';
    }
}

// ===================================================================================
// 3. ANWENDUNGS-ORCHESTRIERUNG & STATE MANAGEMENT (UI-SCHICHT)
// ===================================================================================

    const appState = {
        debounceTimer: null,
        snapshotHandle: null,
        diagnosisData: null,
        lastUpdateTimestamp: null,
        lastMarktData: null
    };

    const dom = { // Selektiert alle DOM-Elemente einmalig
        outputs: {
            miniSummary: document.getElementById('miniSummary'), depotwert: document.getElementById('displayDepotwert'),
            neuerBedarf: document.getElementById('neuerBedarf'), zielLiquiditaet: document.getElementById('zielLiquiditaet'),
            liquiditaetBalken: document.getElementById('liquiditaetBalken'), balkenContainer: document.querySelector('.progress-bar-container'),
            marktstatusText: document.getElementById('marktstatusText'), monatlicheEntnahme: document.getElementById('monatlicheEntnahme'),
            handlungsanweisung: document.getElementById('handlungsanweisung'), minGoldDisplay: document.getElementById('minGoldDisplay'),
            entnahmeDetailsContent: document.getElementById('entnahmeDetailsContent'), entnahmeBreakdown: document.getElementById('entnahme-breakdown'),
            snapshotList: document.getElementById('snapshotList'), printFooter: document.getElementById('print-footer')
        },
        inputs: {}, // Wird in init() gefüllt
        controls: {
            depotLastUpdated: document.getElementById('depotLastUpdated'), 
            themeToggle: document.getElementById('themeToggle'), exportBtn: document.getElementById('exportBtn'),
            importBtn: document.getElementById('importBtn'), importFile: document.getElementById('importFile'),
            btnNachruecken: document.getElementById('btnNachruecken'), btnUndoNachruecken: document.getElementById('btnUndoNachruecken'),
            btnCsvImport: document.getElementById('btnCsvImport'), csvFileInput: document.getElementById('csvFileInput'),
            copyAction: document.getElementById('copyAction'), resetBtn: document.getElementById('resetBtn'),
            jahresabschlussBtn: document.getElementById('jahresabschlussBtn'), connectFolderBtn: document.getElementById('connectFolderBtn'),
            snapshotStatus: document.getElementById('snapshotStatus'), goldPanel: document.getElementById('goldPanel')
        },
        containers: {
            error: document.getElementById('error-container'),  bedarfAnpassung: document.getElementById('bedarfAnpassungContainer'),
			tabButtons: document.querySelector('.tab-buttons'),
            tabPanels: document.querySelectorAll('.tab-panel'), form: document.querySelector('.form-column'),
            // NEU: Referenz auf das Alert-Banner
            versionAlert: document.getElementById('engine-version-alert')
        },
        diagnosis: {
            drawer: document.getElementById('diagnosisDrawer'), overlay: document.getElementById('drawerOverlay'),
            openBtn: document.getElementById('openDiagnosisBtn'), closeBtn: document.getElementById('closeDiagnosisBtn'),
            copyBtn: document.getElementById('copyDiagnosisBtn'), filterToggle: document.getElementById('diagFilterToggle'),
            content: document.getElementById('diagContent'), chips: document.getElementById('diag-chips'),
            decisionTree: document.getElementById('diag-decision-tree'), guardrails: document.getElementById('diag-guardrails'),
            keyParams: document.getElementById('diag-key-params')
        }
    };

    /**
     * Haupt-Update-Funktion: Liest UI, ruft die EXTERNE ENGINE auf, rendert Ergebnis, speichert Zustand.
     * (GEÄNDERT in v1)
     */
    function update() {
        try {
            UIRenderer.clearError();

            // 1. Read Inputs & State (Unchanged)
            const inputData = UIReader.readAllInputs();
            const persistentState = StorageManager.loadState();
			
			// NEU: Ruft die Logik zur Anzeige des Anpassungs-Buttons auf
			UIRenderer.renderBedarfAnpassungUI(inputData, persistentState);	
			
            appState.lastUpdateTimestamp = Date.now(); // Für Diagnose-Panel

            // 2. Call Engine (Replaced)
            // Statt der alten Inline-Logik (`calculateModel(inputData, ...)`)...
            // ...rufen wir die neue, saubere EngineAPI auf.
            const modelResult = EngineAPI.simulateSingleYear(inputData, persistentState.lastState);

            // 3. Handle Engine Response (New)
            if (modelResult.error) {
                // Wenn die Engine einen Fehler (z.B. Validierung) zurückgibt, werfen wir ihn,
                // damit die lokale `handleError`-Logik ihn fangen kann.
                // (Wirft z.B. eine 'ValidationError')
                throw modelResult.error;
            }

            // 4. Prepare data for Renderer (NEW FIX in v1)
            // Die Engine gibt {ui, input, ...} zurück. Der Renderer erwartet {ui: {input, ...}}.
            // Wir fügen `inputData` explizit zum `ui`-Objekt hinzu.
            const uiDataForRenderer = {
                ...modelResult.ui, // Übernimmt depotwertGesamt, neuerBedarf, market, spending, action etc.
                input: inputData   // Fügt das input-Objekt hinzu, das die Renderer erwarten
            };

            // 5. Render & Save (Unchanged, uses fixed uiDataForRenderer)
            UIRenderer.render(uiDataForRenderer); // Übergibt die korrigierte Struktur

            appState.diagnosisData = UIRenderer.formatDiagnosisPayload(modelResult.diagnosis);
            UIRenderer.renderDiagnosis(appState.diagnosisData);

            StorageManager.saveState({ ...persistentState, inputs: inputData, lastState: modelResult.newState });

        } catch (error) {
            // Dieser Block fängt nun auch die Fehler aus der EngineAPI (z.B. ValidationErrors)
            console.error("Update-Fehler:", error);
            UIRenderer.handleError(error);
        }
    }

    function debouncedUpdate() {
        clearTimeout(appState.debounceTimer);
        appState.debounceTimer = setTimeout(update, 250);
    }

    /**
     * NEU: Führt den Engine-Handshake beim Start durch.
     */
    function initVersionHandshake() {
        try {
            if (typeof EngineAPI === 'undefined' || typeof EngineAPI.getVersion !== 'function') {
                throw new Error("EngineAPI (neu_enginev1.js) konnte nicht geladen werden oder ist ungültig.");
            }

            const version = EngineAPI.getVersion();
            if (!version || typeof version.api !== 'string' || typeof version.build !== 'string') {
                throw new Error("EngineAPI.getVersion() liefert ein ungültiges Format.");
            }

            // Version Handshake
            if (!version.api.startsWith(REQUIRED_ENGINE_API_VERSION_PREFIX)) {
                const alertBanner = dom.containers.versionAlert;
                alertBanner.textContent = `WARNUNG: Veraltete Engine-Version erkannt (Geladen: ${version.api}, Erwartet: ${REQUIRED_ENGINE_API_VERSION_PREFIX}x). Die App ist möglicherweise instabil. Bitte aktualisieren Sie die Engine-Datei (neu_enginev1.js).`;
                alertBanner.style.display = 'block';
                // Mache es tastaturfokussierbar, wie gewünscht
                alertBanner.tabIndex = -1;
                // alertBanner.focus(); // Fokus kann störend sein, ggf. weglassen
            }

            // Cache-Busting (Bonus)
            const scriptTag = document.querySelector('script[src^="neu_enginev1.js"]'); // src^= um ?v= zu erlauben
            if (scriptTag && version.build) {
                 const newSrc = `neu_enginev1.js?v=${version.build}`;
                 if (scriptTag.src !== newSrc) {
                    scriptTag.src = newSrc;
                 }
            }

            console.log(`Engine Handshake erfolgreich. API v${version.api} (Build: ${version.build}) geladen.`);

        } catch (e) {
            // Harter Fehler, wenn die Engine fehlt
            const alertBanner = dom.containers.versionAlert;
            alertBanner.textContent = `FATALER FEHLER: ${e.message}. Die Anwendung kann nicht gestartet werden.`;
            alertBanner.style.display = 'block';
            alertBanner.style.backgroundColor = 'var(--danger-color)';
            alertBanner.style.color = 'white';
            alertBanner.tabIndex = -1;
            // alertBanner.focus(); // Fokus kann störend sein
            // Verhindere weitere Initialisierung
            throw new Error("Engine Load Failed");
        }
    }

	/**
     * Initialisiert die Anwendung: Bindet UI-Events, lädt Daten und führt das erste Update aus.
     * (GEÄNDERT)
     */
    function init() {
        try {
            // 1. Engine Handshake (NEU)
            initVersionHandshake();
            // NEU: Hinzufügen eines Log-Eintrags zur Bestätigung
            console.info("Engine ready and handshake successful.", EngineAPI.getVersion());
        } catch (e) {
            // Beende die Initialisierung, wenn die Engine fehlt/inkompatibel ist
            console.error("Initialisierung abgebrochen wegen Engine-Fehler.");
            return;
        }

        // 2. Restliche Initialisierung (Unverändert)
        document.querySelectorAll('input, select').forEach(el => {
            if(el.id) dom.inputs[el.id] = el;
        });
        dom.outputs.printFooter.textContent = `UI: ${CONFIG.APP.VERSION} | Engine: ${EngineAPI.getVersion().api}`;

        const persistentState = StorageManager.loadState();
        UIReader.applyStoredInputs(persistentState.inputs);

        UIBinder.bindUI();
        UIRenderer.applyTheme(localStorage.getItem('theme') || 'system');

        StorageManager.initSnapshots().then(() => {
            StorageManager.renderSnapshots(dom.outputs.snapshotList, dom.controls.snapshotStatus, appState.snapshotHandle);
        });

        update();
    }

    document.addEventListener('DOMContentLoaded', init);


// ===================================================================================
// 4. PERSISTENZ-SCHICHT (StorageManager) (UI-SCHICHT)
// (UNVERÄNDERT)
// ===================================================================================
const StorageManager = {
    _idbHelper: {
        db: null,
        open() {
            return new Promise((resolve, reject) => {
                if (this.db) return resolve();
                const request = indexedDB.open('snapshotDB', 1);
                request.onupgradeneeded = e => e.target.result.createObjectStore('handles');
                request.onsuccess = e => { this.db = e.target.result; resolve(); };
                request.onerror = e => reject(e.target.error);
            });
        },
        async get(key) {
            await this.open();
            return new Promise((res, rej) => {
                const req = this.db.transaction('handles').objectStore('handles').get(key);
                req.onsuccess = e => res(e.target.result);
                req.onerror = e => rej(e.target.error);
            });
        },
        async set(key, val) {
            await this.open();
            return new Promise((res, rej) => {
                const req = this.db.transaction('handles', 'readwrite').objectStore('handles').put(val, key);
                req.onsuccess = () => res();
                req.onerror = e => rej(e.target.error);
            });
        }
    },

    loadState() {
        try {
            const data = localStorage.getItem(CONFIG.STORAGE.LS_KEY);
            const parsed = data ? JSON.parse(data) : {};
            return this._runMigrations(parsed);
        } catch (e) {
            throw new StorageError("Fehler beim Laden des Zustands aus dem LocalStorage.", { originalError: e });
        }
    },

    saveState(state) {
        try {
            localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify(state));
        } catch (e) {
            throw new StorageError("Fehler beim Speichern des Zustands im LocalStorage.", { originalError: e });
        }
    },

    _runMigrations(data) {
        if (localStorage.getItem(CONFIG.STORAGE.MIGRATION_FLAG)) return data;

        let state = data.lastState || {};
        if (state) {
            if (!isFinite(state.cumulativeInflationFactor) || state.cumulativeInflationFactor > 3) {
                state.cumulativeInflationFactor = 1;
            }
            if (!Number.isFinite(state.lastInflationAppliedAtAge)) {
                state.lastInflationAppliedAtAge = 0;
            }
            data.lastState = state;
        }
        localStorage.setItem(CONFIG.STORAGE.MIGRATION_FLAG, '1');
        return data;
    },

    resetState() {
        localStorage.removeItem(CONFIG.STORAGE.LS_KEY);
        localStorage.removeItem(CONFIG.STORAGE.MIGRATION_FLAG);
    },

    async initSnapshots() {
        if (!('showDirectoryPicker' in window)) {
            dom.controls.connectFolderBtn.style.display = 'none';
            dom.controls.snapshotStatus.textContent = "Speicherort: Browser (File System API nicht unterstützt)";
            return;
        }
        try {
            const handle = await this._idbHelper.get('snapshotDirHandle');
            if (handle && (await handle.queryPermission({ mode: 'readwrite' })) === 'granted') {
                appState.snapshotHandle = handle;
            }
        } catch(e) {
            console.warn("Konnte Snapshot-Handle nicht laden.", e);
        }
    },

    async renderSnapshots(listEl, statusEl, handle) {
        const liLoading = document.createElement('li');
        liLoading.textContent = 'Lade...';
        listEl.replaceChildren(liLoading);

        let snapshots = [];
        try {
            if (handle) {
                statusEl.textContent = `Verbunden mit: ${handle.name}`;
                for await (const entry of handle.values()) {
                    if (entry.kind === 'file' && entry.name.endsWith('.json')) {
                        snapshots.push({ key: entry.name, name: entry.name.replace('.json', '') });
                    }
                }
            } else {
                statusEl.textContent = 'Speicherort: Browser (localStorage)';
                snapshots = Object.keys(localStorage)
                    .filter(key => key.startsWith(CONFIG.STORAGE.SNAPSHOT_PREFIX))
                    .map(key => ({
                        key,
                        name: new Date(key.replace(CONFIG.STORAGE.SNAPSHOT_PREFIX, ''))
                            .toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
                    }));
            }
        } catch (err) {
            liLoading.textContent = 'Fehler beim Laden der Snapshots.';
            return;
        }

        if (snapshots.length === 0) {
            liLoading.textContent = 'Keine Snapshots vorhanden.';
            listEl.replaceChildren(liLoading);
            return;
        }

        const fragment = document.createDocumentFragment();
        snapshots.sort((a,b) => b.name.localeCompare(a.name)).forEach(({ key, name }) => {
            const li = document.createElement('li');
            const nameSpan = document.createElement('span');
            nameSpan.textContent = name;

            const actionsSpan = document.createElement('span');
            actionsSpan.className = 'snapshot-actions';

            const restoreBtn = document.createElement('button');
            restoreBtn.type = 'button';
            restoreBtn.className = 'btn btn-sm btn-utility restore-snapshot';
            restoreBtn.dataset.key = key;
            restoreBtn.textContent = 'Wiederherstellen';

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'btn btn-sm delete-snapshot';
            deleteBtn.dataset.key = key;
            deleteBtn.style.color = 'var(--danger-color)';
            deleteBtn.textContent = 'Löschen';

            actionsSpan.append(restoreBtn, deleteBtn);
            li.append(nameSpan, actionsSpan);
            fragment.appendChild(li);
        });
        listEl.replaceChildren(fragment);
    },

    async createSnapshot(handle) {
        const currentData = this.loadState();
        if (!currentData || Object.keys(currentData).length === 0) {
            throw new StorageError("Keine Daten zum Sichern vorhanden.");
        }
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');

        if (handle) {
            const fileName = `Snapshot_${timestamp}.json`;
            const fileHandle = await handle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(currentData, null, 2));
            await writable.close();
        } else {
            const key = CONFIG.STORAGE.SNAPSHOT_PREFIX + new Date().toISOString();
            localStorage.setItem(key, JSON.stringify(currentData));
        }
    },

    async connectFolder() {
        try {
            const handle = await window.showDirectoryPicker();
            if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
                throw new StorageError('Zugriff auf den Ordner wurde nicht gewährt.');
            }
            await this._idbHelper.set('snapshotDirHandle', handle);
            appState.snapshotHandle = handle;
            UIRenderer.toast('Snapshot-Ordner erfolgreich verbunden.');
            this.renderSnapshots(dom.outputs.snapshotList, dom.controls.snapshotStatus, appState.snapshotHandle);
        } catch (err) {
            if (err.name !== 'AbortError') {
                throw new StorageError('Ordner konnte nicht verbunden werden.', { originalError: err });
            }
        }
    },

    async restoreSnapshot(key, handle) {
        let snapshotData;
        if (handle) {
            const fileHandle = await handle.getFileHandle(key);
            const file = await fileHandle.getFile();
            snapshotData = JSON.parse(await file.text());
        } else {
            snapshotData = JSON.parse(localStorage.getItem(key));
        }
        this.saveState(snapshotData);
        location.reload();
    },

    async deleteSnapshot(key, handle) {
        if (handle) {
            await handle.removeEntry(key);
        } else {
            localStorage.removeItem(key);
        }
        this.renderSnapshots(dom.outputs.snapshotList, dom.controls.snapshotStatus, handle);
        UIRenderer.toast('Snapshot gelöscht.');
    }
};


// ===================================================================================
// 5. UI-SCHICHT (Reader, Renderer, Binder, Formatters)
// (WEITGEHEND UNVERÄNDERT, mit Anpassungen v1)
// ===================================================================================
const UIUtils = {
    EUR_FORMATTER: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }),
    NUM_FORMATTER: new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }),
    formatCurrency: val => (typeof val === 'number' && isFinite(val)) ? UIUtils.EUR_FORMATTER.format(val) : 'N/A',
    formatNumber: num => UIUtils.NUM_FORMATTER.format(Math.round(num)),
    parseCurrency: str => {
        if (!str) return 0;
        const n = parseFloat(String(str).replace(/\./g, '').replace(',', '.'));
        return isFinite(n) ? n : 0;
    },
    getThreshold(path, defaultValue) {
        // Sicherer Zugriff auf die Engine-Konfiguration mit Fallbacks
        const config = window.EngineAPI?.getConfig() || window.Ruhestandsmodell_v30?.CONFIG;
        if (!config || typeof path !== 'string') {
            return defaultValue;
        }
        const value = path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, config);
        return (typeof value === 'number') ? value : defaultValue;
    }	
};

const UIReader = {
    readAllInputs() {
        const num = (id) => UIUtils.parseCurrency(dom.inputs[id].value);
        const val = (id) => dom.inputs[id].value;
        const checked = (id) => dom.inputs[id].checked;
        return {
            aktuellesAlter: parseInt(val('aktuellesAlter')), floorBedarf: num('floorBedarf'),
            flexBedarf: num('flexBedarf'), inflation: parseFloat(val('inflation')),
            tagesgeld: num('tagesgeld'), geldmarktEtf: num('geldmarktEtf'),
            depotwertAlt: num('depotwertAlt'), depotwertNeu: num('depotwertNeu'), goldWert: num('goldWert'),
            endeVJ: parseFloat(val('endeVJ')), endeVJ_1: parseFloat(val('endeVJ_1')),
            endeVJ_2: parseFloat(val('endeVJ_2')), endeVJ_3: parseFloat(val('endeVJ_3')),
            ath: parseFloat(val('ath')), jahreSeitAth: parseFloat(val('jahreSeitAth')),
            renteAktiv: val('renteAktiv') === 'ja', renteMonatlich: num('renteMonatlich'),
            risikoprofil: 'sicherheits-dynamisch', round5: checked('round5'),
            goldAktiv: checked('goldAktiv'), goldZielProzent: parseFloat(val('goldZielProzent')),
            goldFloorProzent: parseFloat(val('goldFloorProzent')), goldSteuerfrei: checked('goldSteuerfrei'),
            rebalancingBand: parseFloat(val('rebalancingBand')), costBasisAlt: num('costBasisAlt'),
            costBasisNeu: num('costBasisNeu'), tqfAlt: parseFloat(val('tqfAlt')),
            tqfNeu: parseFloat(val('tqfNeu')), goldCost: num('goldCost'),
            kirchensteuerSatz: parseFloat(val('kirchensteuerSatz')), sparerPauschbetrag: num('sparerPauschbetrag'),
            runwayMinMonths: parseInt(val('runwayMinMonths'), 10),
            runwayTargetMonths: parseInt(val('runwayTargetMonths'), 10),
            targetEq: parseFloat(val('targetEq')),
            rebalBand: parseFloat(val('rebalBand')),
            maxSkimPctOfEq: parseFloat(val('maxSkimPctOfEq')),

            // --- NEU: Bear-Mode-Einstellung auslesen ---
            maxBearRefillPctOfEq: parseFloat(val('maxBearRefillPctOfEq'))
        };
    },
    applyStoredInputs(storedInputs = {}) {
        Object.keys(dom.inputs).forEach(key => {
            const el = dom.inputs[key];
            if (el && key in storedInputs) {
                if(el.type === 'checkbox') {
                    el.checked = storedInputs[key];
                } else if (el.classList.contains('currency')) {
                    el.value = UIUtils.formatNumber(UIUtils.parseCurrency(storedInputs[key]));
                } else {
                    el.value = storedInputs[key];
                }
            }
        });
        this.applySideEffectsFromInputs();
    },
    applySideEffectsFromInputs() {
        const isGoldActive = dom.inputs.goldAktiv.checked;
        dom.controls.goldPanel.style.display = isGoldActive ? 'block' : 'none';
        document.getElementById('goldWertGroup').style.display = isGoldActive ? '' : 'none';
        if (!isGoldActive) {
            dom.inputs.goldWert.value = UIUtils.formatNumber(0);
        }

        const isRenteAktiv = dom.inputs.renteAktiv.value === 'ja';
        dom.inputs.renteMonatlich.disabled = !isRenteAktiv;
        if (!isRenteAktiv) {
            dom.inputs.renteMonatlich.value = UIUtils.formatNumber(0);
        }
    }
};

const UIRenderer = {
    // DOM-SAFE: Nur textContent/DOM-APIs; kein innerHTML für dynamische Inhalte.
    render(ui) {
        // HINWEIS: 'ui' enthält jetzt auch 'ui.input' dank des Fixes in update()
        this.renderMiniSummary(ui);
        dom.outputs.depotwert.textContent = UIUtils.formatCurrency(ui.depotwertGesamt);
        dom.outputs.neuerBedarf.textContent = UIUtils.formatCurrency(ui.neuerBedarf);
        dom.outputs.minGoldDisplay.textContent = UIUtils.formatCurrency(ui.minGold);
        dom.outputs.zielLiquiditaet.textContent = UIUtils.formatCurrency(ui.zielLiquiditaet);
        this.renderEntnahme(ui.spending);
        this.renderMarktstatus(ui.market);
        // Übergibt ui.action und das notwendige ui.input an renderHandlungsanweisung
        this.renderHandlungsanweisung(ui.action, ui.input);
        this.renderLiquidityBar(ui.liquiditaet.deckungNachher);
        this.updateDepotMetaUI();
    },
    // In UIRenderer

    renderBedarfAnpassungUI(inputData, persistentState) {
        const container = dom.containers.bedarfAnpassung;
        const currentAge = inputData.aktuellesAlter;
        const lastAdjustedAge = persistentState.ageAdjustedForInflation || 0;
        const inflation = inputData.inflation;

        let content = '';
        if (currentAge > lastAdjustedAge) {
            // Ein neues Jahr, eine Anpassung steht an
            content = `<button type="button" class="btn btn-sm btn-utility btn-apply-inflation">Bedarfe um ${inflation.toFixed(1)} % erhöhen</button>`;
        } else if (currentAge === lastAdjustedAge && lastAdjustedAge > 0) {
            // Anpassung für dieses Alter ist bereits erfolgt
            content = `<small style="color: var(--success-color);">✓ Bedarfe für Alter ${currentAge} sind aktuell.</small>`;
        }
        // Wenn currentAge < lastAdjustedAge, wird nichts angezeigt (z.B. bei Korrektur des Alters)

        container.innerHTML = content;
    },
	
    renderMiniSummary(ui) {
        let currentInput = ui.input;
        if (!currentInput) {
            console.warn("UIRenderer.renderMiniSummary: ui.input fehlt, versuche Fallback.");
            currentInput = StorageManager.loadState()?.inputs || UIReader.readAllInputs();
        }
        if (!currentInput) {
            console.error("UIRenderer.renderMiniSummary: Konnte keine Input-Daten laden!");
            dom.outputs.miniSummary.textContent = 'Fehler beim Laden der Input-Daten für Mini-Summary.';
            return;
        }

        // Hilfsfunktion für die alten Vergleichs-Items
        const createItem = (label, before, after, unit) => {
            const item = document.createElement('div');
            item.className = 'summary-item';
            const labelEl = document.createElement('span');
            labelEl.className = 'label';
            labelEl.textContent = label;
            const valueEl = document.createElement('span');
            valueEl.className = 'value';
            const strongEl = document.createElement('strong');
            const formatVal = v => (v === Infinity) ? '>20' : (typeof v === 'number' && isFinite(v)) ? v.toFixed(1) : 'N/A';
            strongEl.textContent = `${formatVal(after)}${unit}`;
            valueEl.textContent = `${formatVal(before)}${unit} → `;
            valueEl.appendChild(strongEl);
            item.append(labelEl, valueEl);
            return item;
        };

        // NEUE Hilfsfunktion für den KPI-Badge
        const createKpiBadge = (label, value, unit, status) => {
            const kpi = document.createElement('div');
            // 'status-info' als Fallback, falls kein Status geliefert wird
            kpi.className = `summary-kpi status-${status || 'info'}`; 
            
            const labelEl = document.createElement('span');
            labelEl.className = 'label';
            labelEl.textContent = label;
            
            const valueEl = document.createElement('span');
            valueEl.className = 'value';
            const formattedValue = (typeof value === 'number' && isFinite(value)) ? value.toFixed(0) : '∞';
            valueEl.textContent = `${formattedValue} ${unit}`;
            
            kpi.append(labelEl, valueEl);
            return kpi;
        };

        const inflatedBedarf = { 
            floor: Math.max(0, currentInput.floorBedarf - (currentInput.renteAktiv ? currentInput.renteMonatlich * 12 : 0)), 
            flex: currentInput.flexBedarf 
        };
        const liqVorher = currentInput.tagesgeld + currentInput.geldmarktEtf;
        const liqNachher = liqVorher + (ui.action.verwendungen?.liquiditaet || 0);

        const reichweite = {
            floorVorher: inflatedBedarf.floor > 0 ? (liqVorher / inflatedBedarf.floor) : Infinity,
            floorNachher: inflatedBedarf.floor > 0 ? (liqNachher / inflatedBedarf.floor) : Infinity,
        };

        const fragment = document.createDocumentFragment();

        // Füge den neuen Runway-KPI als erstes und wichtigstes Element hinzu
        if (ui.runway && typeof ui.runway.months === 'number') {
            const runwayKpi = createKpiBadge('Runway (Gesamtbedarf)', ui.runway.months, 'Monate', ui.runway.status);
            fragment.appendChild(runwayKpi);
        }

        fragment.appendChild(createItem('Liquid.-Deckung', ui.liquiditaet.deckungVorher, ui.liquiditaet.deckungNachher, '%'));
        fragment.appendChild(createItem('Reichweite (Floor)', reichweite.floorVorher, reichweite.floorNachher, ' J'));
        
        dom.outputs.miniSummary.replaceChildren(fragment);
    },

    renderEntnahme(spending) {
        dom.outputs.monatlicheEntnahme.replaceChildren(document.createTextNode(UIUtils.formatCurrency(spending.monatlicheEntnahme)));
        const small1 = document.createElement('small');
        small1.style.cssText = 'display:block; font-size:0.85em; opacity:0.8; margin-top: 4px;';
        small1.textContent = `(${UIUtils.formatCurrency(spending.monatlicheEntnahme * 12)} / Jahr)`;
        const small2 = document.createElement('small');
        small2.style.cssText = 'display:block; opacity:.8;';
        small2.textContent = spending.anmerkung.trim();
        dom.outputs.monatlicheEntnahme.append(small1, small2);

        if (spending.details) {
            dom.outputs.entnahmeDetailsContent.replaceChildren(this.buildEntnahmeDetails(spending.details, spending.kuerzungQuelle));
            dom.outputs.entnahmeBreakdown.style.display = 'block';
        } else {
            dom.outputs.entnahmeBreakdown.style.display = 'none';
        }
    },
    buildEntnahmeDetails(details, kuerzungQuelle) {
        const fragment = document.createDocumentFragment();
        const createLine = (label, value) => {
            fragment.appendChild(document.createTextNode(`• ${label}: ${value}`));
            fragment.appendChild(document.createElement('br'));
        };
        createLine('Effektive Flex-Rate', `${details.flexRate.toFixed(1)}%`);
        createLine('Entnahmequote (v. Depot)', `${(details.entnahmequoteDepot * 100).toFixed(2)}%`);
        createLine('Realer Drawdown (seit Peak)', `${(details.realerDepotDrawdown * -100).toFixed(1)}%`);

        fragment.appendChild(document.createTextNode(`• Grund für Anpassung: `));
        const strong = document.createElement('strong');
        strong.textContent = kuerzungQuelle;
        fragment.appendChild(strong);

        return fragment;
    },
    renderMarktstatus(market) {
        dom.outputs.marktstatusText.replaceChildren(document.createTextNode(market.szenarioText + ' '));
        const info = document.createElement('span');
        info.style.cssText = 'cursor:help; opacity:0.7;';
        info.title = market.reasons.join(', ');
        info.textContent = 'ⓘ';
        dom.outputs.marktstatusText.appendChild(info);
    },
	determineInternalCashRebalance(input, liqNachTransaktion, jahresentnahme) {
        // Robustheits-Check: Nur mit validen Zahlen arbeiten
        if (!input || !isFinite(liqNachTransaktion) || !isFinite(jahresentnahme)) {
            return null;
        }

        const zielTagesgeld = jahresentnahme;
        const tagesgeldVorTransaktion = input.tagesgeld;
        const liqZufluss = liqNachTransaktion - (tagesgeldVorTransaktion + input.geldmarktEtf);
        const tagesgeldNachTransaktion = tagesgeldVorTransaktion + liqZufluss;
        const geldmarktNachTransaktion = input.geldmarktEtf;

        const umschichtungsbetrag = tagesgeldNachTransaktion - zielTagesgeld;
        
        // FEHLERBEHEBUNG: Sicherer Zugriff auf den Schwellenwert via Helper
        const schwelle = UIUtils.getThreshold('THRESHOLDS.STRATEGY.cashRebalanceThreshold', 2500);

        if (umschichtungsbetrag > schwelle) {
            return { from: 'Tagesgeld', to: 'Geldmarkt-ETF', amount: umschichtungsbetrag };
        } else if (umschichtungsbetrag < -schwelle) {
            const benoetigterBetrag = Math.abs(umschichtungsbetrag);
            if (geldmarktNachTransaktion >= benoetigterBetrag) {
                return { from: 'Geldmarkt-ETF', to: 'Tagesgeld', amount: benoetigterBetrag };
            }
        }
        return null;
    },
    buildInternalRebalance(data) {
        const div = document.createElement('div');
        div.style.cssText = 'font-size: 1rem; text-align: center; line-height: 1.5; font-weight: 500;';
        const strong = document.createElement('strong');
        strong.textContent = UIUtils.formatCurrency(data.amount);
        div.append(document.createTextNode(`${data.from} → ${data.to}: `), strong);
        return div;
    },
    // In UIRenderer
// DOM-SAFE: Nur textContent/DOM-APIs; kein innerHTML für dynamische Inhalte.
renderHandlungsanweisung(action, input) { // Signatur bleibt gleich
    const container = dom.outputs.handlungsanweisung;
    [...container.children].filter(n => n.id !== 'copyAction').forEach(n => n.remove());
    container.className = action.anweisungKlasse || 'anweisung-grau';

    const content = document.createElement('div');
    content.id = 'handlungContent';

    if (action.type === 'TRANSACTION') {
        const title = document.createElement('strong');
        title.style.cssText = 'display: block; font-size: 1.1rem; margin-bottom: 8px; text-align:center;';
        title.textContent = action.title;
        if (action.isPufferSchutzAktiv) {
            const badge = document.createElement('span');
            badge.className = 'strategy-badge';
            badge.textContent = 'PUFFER-SCHUTZ';
            title.append(document.createTextNode(' '), badge);
        }
        const createSection = (titleText, items) => {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; margin-bottom: 12px;';
            const head = document.createElement('strong');
            head.style.cssText = 'display:block; border-bottom: 1px solid var(--border-color); padding-bottom: 5px; margin-bottom: 8px;';
            head.textContent = titleText;
            wrapper.appendChild(head);
            items.forEach(item => wrapper.appendChild(item));
            return wrapper;
        };
        const createRow = (label, value) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; justify-content:space-between;';
            const labelSpan = document.createElement('span');
            labelSpan.textContent = label;
            const valueSpan = document.createElement('span');
            valueSpan.textContent = value;
            row.append(labelSpan, valueSpan);
            return row;
        };
        const quellenMap = { 'gold': 'Gold', 'aktien_neu': 'Aktien (neu)', 'aktien_alt': 'Aktien (alt)'};
        const quellenItems = action.quellen.map(q => createRow(`- ${quellenMap[q.kind]}`, UIUtils.formatCurrency(q.brutto)));
        const steuerRow = createRow('- Steuern (geschätzt)', UIUtils.formatCurrency(action.steuer));
        steuerRow.style.cssText += 'border-top: 1px solid var(--border-color); margin-top: 5px; padding-top: 5px;';
        quellenItems.push(steuerRow);
        
        // BEGINN DER ÄNDERUNG
        const verwendungenItems = [];
        if (action.verwendungen.liquiditaet > 0) verwendungenItems.push(createRow('Liquidität auffüllen:', UIUtils.formatCurrency(action.verwendungen.liquiditaet)));
        if (action.verwendungen.gold > 0) verwendungenItems.push(createRow('Kauf von Gold:', UIUtils.formatCurrency(action.verwendungen.gold)));
        if (action.verwendungen.aktien > 0) verwendungenItems.push(createRow('Kauf von Aktien:', UIUtils.formatCurrency(action.verwendungen.aktien)));
        // ENDE DER ÄNDERUNG
        
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'text-align: left; font-size: 1rem; line-height: 1.6;';
        wrapper.append(title, createSection(`A. Quellen (Netto: ${UIUtils.formatCurrency(action.nettoErlös)})`, quellenItems), createSection('B. Verwendungen', verwendungenItems));
        content.appendChild(wrapper);
    } else {
        content.textContent = action.title;
    }

    // --- Interne Rebalancing-Logik (GEÄNDERT v1) ---
    // Defensiver Check und Nutzung des übergebenen 'input'-Parameters
    let internalRebalance = null;
    if (input) { // Nur berechnen, wenn input vorhanden ist
        const liqNachTransaktion = (input.tagesgeld + input.geldmarktEtf) + (action.verwendungen?.liquiditaet || 0);
        // Wir brauchen die monatliche Entnahme aus dem `spending`-Objekt, das hier nicht direkt verfügbar ist.
        // Sicherster Weg: Aus dem DOM lesen (wie vorher), aber defensiv.
        let jahresentnahme = 0;
        try {
             // Versuche, den Wert zu parsen, aber fange Fehler ab
             const entnahmeText = dom.outputs.monatlicheEntnahme?.firstChild?.textContent || "0";
             const monatlich = UIUtils.parseCurrency(entnahmeText);
             if (isFinite(monatlich)) {
                 jahresentnahme = monatlich * 12;
             } else {
                console.warn("Konnte monatliche Entnahme für internes Rebalancing nicht parsen:", entnahmeText);
             }
        } catch (e) {
             console.warn("Fehler beim Lesen der monatlichen Entnahme für internes Rebalancing:", e);
        }
        if (isFinite(jahresentnahme)) {
            internalRebalance = this.determineInternalCashRebalance(input, liqNachTransaktion, jahresentnahme);
        }
    } else {
        console.warn("UIRenderer.renderHandlungsanweisung: 'input'-Parameter fehlt, internes Rebalancing übersprungen.");
    }
    // --- Ende Interne Rebalancing-Logik ---


    if (internalRebalance) {
        if (content.childNodes.length > 0) {
            const hr = document.createElement('hr');
            hr.style.cssText = 'margin: 15px -10px; border-color: rgba(127,127,127,0.2);';
            content.appendChild(hr);
        }
        content.appendChild(this.buildInternalRebalance(internalRebalance));
    }
    container.appendChild(content);
},
    renderLiquidityBar(percent) {
        const pct = Math.min(100, Math.max(0, percent));
        const bar = dom.outputs.liquiditaetBalken;
        bar.className = 'progress-bar';
        bar.style.width = pct + '%';
        bar.classList.add(pct >= 100 ? 'bar-ok' : pct >= 70 ? 'bar-warn' : 'bar-bad');
        dom.outputs.balkenContainer.setAttribute('aria-valuenow', pct.toFixed(0));
    },
    updateDepotMetaUI() {
        const state = StorageManager.loadState();
        const inputs = state.inputs || {};
        const tsUpd = inputs.depotLastUpdate ? new Date(inputs.depotLastUpdate) : null;
        dom.controls.depotLastUpdated.textContent = tsUpd ? tsUpd.toLocaleString('de-DE', {dateStyle: 'short', timeStyle: 'short'}) : '—';     
    },
    toast(msg, isSuccess = true) {
        const container = dom.containers.error;
        container.classList.remove('error-warn');
        container.style.color = isSuccess ? 'var(--success-color)' : 'var(--danger-color)';
        container.textContent = msg;
        setTimeout(() => { container.textContent = ''; }, 3500);
    },
    handleError(error) {
        const container = dom.containers.error;
        container.className = 'error-warn';

        if (error instanceof ValidationError) {
            container.textContent = error.message;
            const ul = document.createElement('ul');
            error.errors.forEach(({ fieldId, message }) => {
                const li = document.createElement('li');
                li.textContent = message;
                ul.appendChild(li);
                const inputEl = dom.inputs[fieldId];
                if (inputEl) {
                    inputEl.classList.add('input-error');
                }
            });
            container.appendChild(ul);
        } else if (error instanceof AppError) {
            container.textContent = `Ein interner Fehler ist aufgetreten: ${error.message}`;
        } else {
            // Fallback für generische Errors (z.B. aus der Engine)
            container.textContent = `Ein unerwarteter Anwendungsfehler ist aufgetreten: ${error.message || 'Unbekannter Fehler'}`;
        }
    },
    clearError() {
        dom.containers.error.textContent = "";
        dom.containers.error.className = "";
        Object.values(dom.inputs).forEach(el => el.classList.remove('input-error'));
    },
    applyTheme(mode) {
        const effectiveTheme = (mode === 'system') ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : mode;
        document.documentElement.setAttribute('data-theme', effectiveTheme);
        dom.controls.themeToggle.textContent = (mode === 'dark') ? '☀️' : (mode === 'light') ? '🌙' : '🖥️';
    },
    formatDiagnosisPayload(raw) {
        if(!raw) return null;
        const formatted = { ...raw };
        formatted.guardrails = raw.guardrails.map(g => {
            let status = 'ok';
            if ((g.rule === 'max' && g.value > g.threshold) || (g.rule === 'min' && g.value < g.threshold)) {
                status = 'danger';
            } else if ((g.rule === 'max' && g.value > g.threshold * 0.90) || (g.rule === 'min' && g.value < g.threshold * 1.10)) {
                status = 'warn';
            }
            const formatVal = (v, t, sgn) => {
                let s = (sgn && v > 0) ? '-' : '';
                if (t === 'percent') return `${s}${(v * 100).toFixed(1)}%`;
                if (t === 'months') return `${v.toFixed(0)} Mon.`;
                return v;
            };
            return {
                name: g.name,
                value: formatVal(g.value, g.type, g.name.includes("Drawdown")),
                threshold: (g.rule === 'max' ? '< ' : '> ') + formatVal(g.threshold, g.type),
                status
            };
        });
        return formatted;
    },
    // DOM-SAFE: Nur textContent/DOM-APIs; kein innerHTML für dynamische Inhalte.
    renderDiagnosis(diagnosis) {
        if (!diagnosis) return;
        dom.diagnosis.chips.replaceChildren(this.buildChips(diagnosis));
        dom.diagnosis.decisionTree.replaceChildren(this.buildDecisionTree(diagnosis.decisionTree));
        dom.diagnosis.guardrails.replaceChildren(this.buildGuardrails(diagnosis.guardrails));
        dom.diagnosis.keyParams.replaceChildren(this.buildKeyParams(diagnosis.keyParams));
    },
	buildChips(d) {
        const { entnahmequoteDepot, realerDepotDrawdown } = d.keyParams;
        const runwayMonate = d.general.runwayMonate;

        // REFACTORING: Hartkodierte Werte durch sicheren Zugriff auf Engine-Config ersetzen
        const ALARM_withdrawalRate = UIUtils.getThreshold('THRESHOLDS.ALARM.withdrawalRate', 0.055);
        const CAUTION_withdrawalRate = UIUtils.getThreshold('THRESHOLDS.CAUTION.withdrawalRate', 0.045);
        const ALARM_realDrawdown = UIUtils.getThreshold('THRESHOLDS.ALARM.realDrawdown', 0.25);
        const STRATEGY_runwayThinMonths = UIUtils.getThreshold('THRESHOLDS.STRATEGY.runwayThinMonths', 24);

        const qStatus = entnahmequoteDepot > ALARM_withdrawalRate ? 'danger' : entnahmequoteDepot > CAUTION_withdrawalRate ? 'warn' : 'ok';
        const ddStatus = realerDepotDrawdown > ALARM_realDrawdown ? 'danger' : realerDepotDrawdown > 0.15 ? 'warn' : 'ok';
        const rStatus = runwayMonate > 36 ? 'ok' : runwayMonate >= STRATEGY_runwayThinMonths ? 'warn' : 'danger';

        const createChip = (status, label, value, title) => {
            const chip = document.createElement('span');
            chip.className = `diag-chip status-${status}`;
            chip.title = title || '';
            const labelEl = document.createElement('span');
            labelEl.className = 'label';
            labelEl.textContent = label;
            chip.append(labelEl, document.createTextNode(value));
            return chip;
        };
        const fragment = document.createDocumentFragment();
        fragment.append(
            createChip('info', 'Regime', d.general.marketSzenario),
            createChip(d.general.alarmActive ? 'danger' : 'ok', 'Alarm', d.general.alarmActive ? 'AKTIV' : 'Inaktiv'),
            createChip(qStatus, 'Quote', `${(entnahmequoteDepot * 100).toFixed(1)}%`, 'Entnahmequote = Jährliche Entnahme / Depotwert'),
            createChip(ddStatus, 'Drawdown', `${(realerDepotDrawdown * -100).toFixed(1)}%`, 'Realer Drawdown des Gesamtvermögens seit dem inflationsbereinigten Höchststand'),
            createChip(rStatus, 'Runway', `${runwayMonate.toFixed(0)} Mon.`, 'Reichweite der Liquidität bei aktueller monatlicher Entnahme')
        );
        return fragment;
    },
	buildDecisionTree(treeData) {
        const fragment = document.createDocumentFragment();
        treeData.forEach(item => {
            const li = document.createElement('li');
            // KORREKTUR/ERWEITERUNG: Die severity wird nun explizit zugewiesen.
            let severity = item.severity || 'info'; // Fallback auf 'info'
            if (item.step.toLowerCase().includes('cap wirksam')) {
                severity = 'guardrail'; // Weise Caps dem Guardrail-Typ zu für das Schild-Icon
            }

            li.className = `${item.status} severity-${severity} ${item.status === 'inactive' ? 'decision-inactive' : ''}`;
            li.textContent = item.step + ' ';
            const impact = document.createElement('span');
            impact.className = 'impact';
            impact.textContent = item.impact;
            li.appendChild(impact);
            fragment.appendChild(li);
        });
        return fragment;
    },
    buildGuardrails(guardrailData) {
        const fragment = document.createDocumentFragment();
        guardrailData.forEach(g => {
            const card = document.createElement('div');
            card.className = `guardrail-card status-${g.status} ${g.status === 'ok' ? 'guardrail-ok' : ''}`;
            const name = document.createElement('strong');
            name.textContent = g.name;
            const value = document.createElement('div');
            value.className = 'value';
            value.textContent = g.value;
            const threshold = document.createElement('div');
            threshold.className = 'threshold';
            threshold.textContent = `Schwelle: ${g.threshold}`;
            card.append(name, value, threshold);
            fragment.appendChild(card);
        });
        return fragment;
    },
    buildKeyParams(params) {
        const fragment = document.createDocumentFragment();
        const createLine = (label, value) => {
            const code = document.createElement('code');
            code.textContent = value;
            fragment.append(
                document.createTextNode(label),
                code,
                document.createElement('br')
            );
        };
        createLine('Peak (real): ', UIUtils.formatCurrency(params.peakRealVermoegen));
        createLine('Aktuell (real): ', UIUtils.formatCurrency(params.currentRealVermoegen));
        createLine('Kumulierte Inflation: ', `+${((params.cumulativeInflationFactor - 1) * 100).toFixed(1)}%`);
        return fragment;
    }
};

const UIBinder = {
    bindUI() {
        dom.containers.form.addEventListener('input', this.handleFormInput.bind(this));
        dom.containers.form.addEventListener('change', this.handleFormChange.bind(this));
        document.querySelectorAll('input.currency').forEach(el => {
            el.addEventListener('blur', (e) => {
                e.target.value = UIUtils.formatNumber(UIUtils.parseCurrency(e.target.value));
            });
        });

        dom.containers.tabButtons.addEventListener('click', this.handleTabClick.bind(this));
        dom.controls.themeToggle.addEventListener('click', this.handleThemeToggle.bind(this));
        dom.controls.resetBtn.addEventListener('click', this.handleReset.bind(this));
        dom.controls.copyAction.addEventListener('click', () => {
            navigator.clipboard.writeText(document.getElementById('handlungContent').innerText.trim())
                .then(() => UIRenderer.toast('Kopiert.'));
        });
        dom.containers.bedarfAnpassung.addEventListener('click', this.handleBedarfAnpassungClick.bind(this));
        dom.controls.btnNachruecken.addEventListener('click', this.handleNachruecken.bind(this));
        dom.controls.btnUndoNachruecken.addEventListener('click', this.handleUndoNachruecken.bind(this));
        dom.controls.exportBtn.addEventListener('click', this.handleExport.bind(this));
        dom.controls.importBtn.addEventListener('click', () => dom.controls.importFile.click());
        dom.controls.importFile.addEventListener('change', this.handleImport.bind(this));
        dom.controls.btnCsvImport.addEventListener('click', () => dom.controls.csvFileInput.click());
        dom.controls.csvFileInput.addEventListener('change', this.handleCsvImport.bind(this));
        dom.controls.jahresabschlussBtn.addEventListener('click', this.handleJahresabschluss.bind(this));
        dom.controls.connectFolderBtn.addEventListener('click', () => {
            try { StorageManager.connectFolder(); }
            catch (error) { UIRenderer.handleError(error); }
        });

        dom.outputs.snapshotList.addEventListener('click', this.handleSnapshotActions.bind(this));

        const toggleDrawer = (isOpen) => {
            dom.diagnosis.drawer.classList.toggle('is-open', isOpen);
            dom.diagnosis.overlay.classList.toggle('is-open', isOpen);
        };
        dom.diagnosis.openBtn.addEventListener('click', () => toggleDrawer(true));
        dom.diagnosis.closeBtn.addEventListener('click', () => toggleDrawer(false));
        dom.diagnosis.overlay.addEventListener('click', () => toggleDrawer(false));
        dom.diagnosis.copyBtn.addEventListener('click', this.handleCopyDiagnosis.bind(this));
        dom.diagnosis.filterToggle.addEventListener('change', (e) => {
            dom.diagnosis.content.classList.toggle('filter-inactive', e.target.checked)
        });
    },
    handleFormInput(e) {
        const targetId = e.target.id;
        if (targetId && (targetId.startsWith('depotwert') || targetId === 'goldWert')) {
            const state = StorageManager.loadState();
            state.inputs = { ...(state.inputs || {}), depotLastUpdate: Date.now() };
            StorageManager.saveState(state);
            UIRenderer.updateDepotMetaUI();
        }
        debouncedUpdate();
    },
    handleFormChange() {
        UIReader.applySideEffectsFromInputs();
        debouncedUpdate();
    },
    handleTabClick(e) {
        const clickedButton = e.target.closest('.tab-btn');
        if (!clickedButton) return;
        dom.containers.tabButtons.querySelector('.active').classList.remove('active');
        clickedButton.classList.add('active');
        dom.containers.tabPanels.forEach(panel => panel.classList.remove('active'));
        document.getElementById('tab-' + clickedButton.dataset.tab).classList.add('active');
    },
    handleThemeToggle() {
        const modes = ['light', 'dark', 'system'];
        const current = localStorage.getItem('theme') || 'system';
        const next = modes[(modes.indexOf(current) + 1) % modes.length];
        localStorage.setItem('theme', next);
        UIRenderer.applyTheme(next);
    },
    handleReset() {
        if(confirm("Alle gespeicherten Werte (inkl. Guardrail-Daten) zurücksetzen?")) {
            StorageManager.resetState();
            location.reload();
        }
    },
handleBedarfAnpassungClick(e) {
    // Event Delegation: Nur reagieren, wenn der Button geklickt wurde
    if (e.target.matches('.btn-apply-inflation')) {
        // 1. Benötigte Werte auslesen
        const inputData = UIReader.readAllInputs();
        const infl = inputData.inflation;
        const currentAge = inputData.aktuellesAlter;

        // 2. DOM-Felder für Bedarfe aktualisieren
        ['floorBedarf', 'flexBedarf'].forEach(id => {
            const el = dom.inputs[id];
            el.value = UIUtils.formatNumber(UIUtils.parseCurrency(el.value) * (1 + infl / 100));
        });

        // 3. Den Zustand speichern: Merken, dass für dieses Alter angepasst wurde
        const state = StorageManager.loadState();
        state.ageAdjustedForInflation = currentAge;
        StorageManager.saveState(state);

        // 4. Ein vollständiges Update auslösen
        // Dies berechnet alles neu und aktualisiert die UI, inklusive des Hinweises.
        update();
    }
},
    // In UIBinder
    handleNachruecken() {
        appState.lastMarktData = {
            endeVJ: dom.inputs.endeVJ.value, endeVJ_1: dom.inputs.endeVJ_1.value,
            endeVJ_2: dom.inputs.endeVJ_2.value, endeVJ_3: dom.inputs.endeVJ_3.value,
            ath: dom.inputs.ath.value, jahreSeitAth: dom.inputs.jahreSeitAth.value
        };
        dom.inputs.endeVJ_3.value = dom.inputs.endeVJ_2.value;
        dom.inputs.endeVJ_2.value = dom.inputs.endeVJ_1.value;
        // KORRIGIERT v1: Tippfehler 'dom.inputsL' -> 'dom.inputs'
        dom.inputs.endeVJ_1.value = dom.inputs.endeVJ.value;
        const ath = parseFloat(dom.inputs.ath.value) || 0;
        const endevj = parseFloat(dom.inputs.endeVJ.value) || 0;
        const j = parseFloat(dom.inputs.jahreSeitAth.value) || 0;
        dom.inputs.jahreSeitAth.value = (endevj >= ath) ? 0 : (j + 1);

        this._applyAnnualInflation();
        debouncedUpdate();
        dom.controls.btnUndoNachruecken.style.display = 'inline-flex';
    },
    handleUndoNachruecken() {
        if (appState.lastMarktData) {
            Object.entries(appState.lastMarktData).forEach(([k,v]) => {
                dom.inputs[k].value = v;
            });
        }
        dom.controls.btnUndoNachruecken.style.display = 'none';
        debouncedUpdate();
    },
    handleExport() {
        const dataToExport = { app: CONFIG.APP.NAME, version: CONFIG.APP.VERSION, payload: StorageManager.loadState() };
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `balancing-export-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        UIRenderer.toast('Export erstellt.');
    },
    async handleImport(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const json = JSON.parse(await file.text());
            StorageManager.saveState(json.payload ?? json);
            UIReader.applyStoredInputs(StorageManager.loadState().inputs);
            update();
            UIRenderer.toast('Import erfolgreich.');
        } catch(err) {
            UIRenderer.handleError(new AppError('Import fehlgeschlagen.', { originalError: err }));
        } finally {
            e.target.value = '';
        }
    },
// In UIBinder
    async handleCsvImport(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();

            // Hilfsfunktionen zum Parsen
            const parseDate = (dateStr) => {
                const parts = dateStr.split('.');
                if (parts.length !== 3) return null;
                return new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
            };
            const parseValue = (numStr) => {
                if (!numStr) return NaN;
                return parseFloat(numStr.trim().replace(',', '.'));
            };

            // 1. Alle Zeilen einlesen, parsen und chronologisch sortieren
            const data = text.split(/\r?\n/).slice(1).map(line => {
                const columns = line.split(';');
                if (columns.length < 5) return null;
                return {
                    date: parseDate(columns[0]),
                    // 'high' wird eingelesen, aber für ATH nicht mehr verwendet
                    high: parseValue(columns[2]), 
                    close: parseValue(columns[4])
                };
            }).filter(d => d && d.date && !isNaN(d.close)) // Es reicht, 'close' zu prüfen
              .sort((a, b) => a.date - b.date);

            if (data.length === 0) throw new Error('Keine gültigen Daten in der CSV gefunden.');

            // 2. Den letzten Eintrag als Referenz für "Ende VJ" nehmen
            const lastEntry = data[data.length - 1];
            const lastDate = lastEntry.date;
            const endeVjValue = lastEntry.close;

            // 3. Werte für VJ-1, VJ-2, VJ-3 finden (relativ zum letzten Datum)
            const findClosestPreviousEntry = (targetDate, allData) => {
                let bestEntry = null;
                for (let i = allData.length - 1; i >= 0; i--) {
                    if (allData[i].date <= targetDate) {
                        bestEntry = allData[i];
                        break;
                    }
                }
                return bestEntry ? bestEntry.close : null;
            };

            const targetDateVJ1 = new Date(lastDate);
            targetDateVJ1.setFullYear(lastDate.getFullYear() - 1);
            const endeVj1Value = findClosestPreviousEntry(targetDateVJ1, data);

            const targetDateVJ2 = new Date(lastDate);
            targetDateVJ2.setFullYear(lastDate.getFullYear() - 2);
            const endeVj2Value = findClosestPreviousEntry(targetDateVJ2, data);

            const targetDateVJ3 = new Date(lastDate);
            targetDateVJ3.setFullYear(lastDate.getFullYear() - 3);
            const endeVj3Value = findClosestPreviousEntry(targetDateVJ3, data);

            // 4. Allzeithoch (ATH) basierend auf dem SCHLUSSKURS finden
            // ============================================================================
            // KORREKTUR: ATH wird jetzt ebenfalls auf Basis des Schlusskurses (d.close) berechnet.
            // ============================================================================
            let ath = { value: -Infinity, date: null };
            data.forEach(d => {
                if (d.close > ath.value) {
                    ath.value = d.close;
                    ath.date = d.date;
                }
            });

            // 5. "Jahre seit ATH" relativ zum letzten Datum berechnen
            let jahreSeitAth = 0;
            if (ath.value > lastEntry.close + 0.01 && ath.date) {
                const timeDiff = lastEntry.date.getTime() - ath.date.getTime();
                jahreSeitAth = timeDiff / (1000 * 3600 * 24 * 365.25);
            }

            // 6. Alle DOM-Felder sicher aktualisieren
            const updateField = (id, value) => {
                const el = dom.inputs[id];
                if (el) {
                    el.value = (typeof value === 'number' && isFinite(value)) ? value.toFixed(2) : '';
                }
            };

            updateField('endeVJ', endeVjValue);
            updateField('endeVJ_1', endeVj1Value);
            updateField('endeVJ_2', endeVj2Value);
            updateField('endeVJ_3', endeVj3Value);
            updateField('ath', ath.value);
            updateField('jahreSeitAth', jahreSeitAth < 0 ? 0 : jahreSeitAth);

            debouncedUpdate();
            UIRenderer.toast(`CSV importiert: Daten relativ zum ${lastDate.toLocaleDateString('de-DE')} übernommen.`);

        } catch (err) {
            UIRenderer.handleError(new AppError('CSV-Import fehlgeschlagen.', { originalError: err }));
        } finally {
            e.target.value = '';
        }
    },
    async handleJahresabschluss() {
        if (!confirm("Möchten Sie einen Jahresabschluss-Snapshot erstellen? Die Inflation für das aktuelle Alter wird dabei fortgeschrieben.")) return;
        try {
            this._applyAnnualInflation();
            debouncedUpdate();
            await new Promise(resolve => setTimeout(resolve, 300)); // Warten auf debouncedUpdate
            await StorageManager.createSnapshot(appState.snapshotHandle);
            UIRenderer.toast('Jahresabschluss-Snapshot erfolgreich erstellt.');
            await StorageManager.renderSnapshots(dom.outputs.snapshotList, dom.controls.snapshotStatus, appState.snapshotHandle);
        } catch (err) {
            UIRenderer.handleError(err);
        }
    },
    async handleSnapshotActions(e) {
        const restoreBtn = e.target.closest('.restore-snapshot');
        const deleteBtn = e.target.closest('.delete-snapshot');
        try {
            if (restoreBtn) {
                const key = restoreBtn.dataset.key;
                if (confirm(`Snapshot "${key.replace('.json','')}" wiederherstellen? Alle aktuellen Eingaben gehen verloren.`)) {
                    await StorageManager.restoreSnapshot(key, appState.snapshotHandle);
                }
            }
            if (deleteBtn) {
                const key = deleteBtn.dataset.key;
                if (confirm(`Diesen Snapshot wirklich endgültig löschen?`)) {
                    await StorageManager.deleteSnapshot(key, appState.snapshotHandle);
                }
            }
        } catch (err) {
            UIRenderer.handleError(new StorageError("Snapshot-Aktion fehlgeschlagen.", { originalError: err }));
        }
    },
    handleCopyDiagnosis() {
        const textToCopy = this._generateDiagnosisText(appState.diagnosisData);
        navigator.clipboard.writeText(textToCopy).then(() => UIRenderer.toast('Diagnose kopiert!'));
    },
    _applyAnnualInflation() {
        const state = StorageManager.loadState();
        if (!state || !state.lastState) return;

        const currentAge = parseInt(dom.inputs.aktuellesAlter.value, 10);
        const lastAppliedAge = state.lastState.lastInflationAppliedAtAge || 0;

        if (currentAge > lastAppliedAge) {
            const infl = UIReader.readAllInputs().inflation;
            const fac = Math.max(0, infl) / 100;
            const oldFactor = state.lastState.cumulativeInflationFactor || 1;
            state.lastState.cumulativeInflationFactor = oldFactor * (1 + fac);
            state.lastState.lastInflationAppliedAtAge = currentAge;
            StorageManager.saveState(state);
            UIRenderer.toast(`Kumulierte Inflation für Alter ${currentAge} fortgeschrieben.`);
        } else if (currentAge <= lastAppliedAge) {
            UIRenderer.toast(`Inflation für Alter ${currentAge} wurde bereits angewendet.`, false);
        }
    },
    _generateDiagnosisText(diagnosis) {
        if (!diagnosis) return "Keine Diagnose-Daten verfügbar.";

        let text = `===== KI-Diagnose für Ruhestand-Balancing =====\n`;
        text += `Version: ${CONFIG.APP.VERSION}\n`;
        text += `Zeitstempel: ${new Date(appState.lastUpdateTimestamp).toLocaleString('de-DE')}\n\n`;
        text += `--- Status-Übersicht ---\n`;
        text += `Marktregime: ${diagnosis.general.marketSzenario}\n`;
        text += `Alarm-Modus: ${diagnosis.general.alarmActive ? 'AKTIV' : 'Inaktiv'}\n`;
        text += `Entnahmequote: ${(diagnosis.keyParams.entnahmequoteDepot * 100).toFixed(2)}%\n`;
        text += `Realer Drawdown: ${(diagnosis.keyParams.realerDepotDrawdown * -100).toFixed(1)}%\n\n`;
        text += `--- Entscheidungsbaum (Warum?) ---\n`;
        diagnosis.decisionTree.forEach(item => {
            if (dom.diagnosis.filterToggle.checked && item.status === 'inactive') return;
            text += `[${item.status === 'active' ? '⚡' : '✓'}] ${item.step}\n   ↳ ${item.impact}\n`;
        });
        text += `\n--- Guardrails ---\n`;
        diagnosis.guardrails.forEach(g => {
            if (dom.diagnosis.filterToggle.checked && g.status === 'ok') return;
            text += `${g.name}: ${g.value} (Schwelle: ${g.threshold}) -> Status: ${g.status.toUpperCase()}\n`;
        });
        text += `\n--- Schlüsselparameter ---\n`;
        text += `Peak (real): ${UIUtils.formatCurrency(diagnosis.keyParams.peakRealVermoegen)}\n`;
        text += `Aktuell (real): ${UIUtils.formatCurrency(diagnosis.keyParams.currentRealVermoegen)}\n`;
        text += `Kumulierte Inflation: +${((diagnosis.keyParams.cumulativeInflationFactor - 1) * 100).toFixed(1)}%\n`;
        text += `\n===== Ende der Diagnose =====`;
        return text;
    }
};

// ===================================================================================
// 8. DEVELOPER TEST HARNESS & CI INTEGRATION (UI-SCHICHT)
// (ANGEPASST für EngineAPI)
// ===================================================================================
(function() {
    'use strict';

    const DEV_CONFIG = {
        PROPERTY_QUICK_N: 100,
        PROPERTY_DEEP_N: 1000,
        FIXED_SEED: 123,
        ROTATING_SEEDS: [42, 1337, 2024], // Für den Deep-Run
        MAX_FAILURES_TO_SHOW: 5,
    };

    const _isClose = (actual, expected, tolerance = 0.01) => {
        if (typeof expected === 'number' && typeof actual === 'number') {
            return Math.abs(actual - expected) <= tolerance;
        }
        return actual === expected;
    };

    const _getNestedValue = (obj, path) => {
        if (!obj || !path) return undefined;
        return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, obj);
    };

	const TEST_SNAPSHOTS = {
        'Peak/Hot Market -> No Action': { alarmActive: false, kuerzungProzent: 0, flexRate: 100, type: 'NONE' },
        'Deep Bear & Thin Runway -> Alarm & Buffer Protection': { alarmActive: true, isPufferSchutzAktiv: true, type: 'TRANSACTION', title: 'Notfall-Verkauf (Puffer-Auffüllung)' },
        'Recovery -> Flex Rate Capped & Alarm Deactivated': { kuerzungQuelle: "Guardrail (Vorsicht)", flexRate: 64.50, alarmActive: false },
        'High Withdrawal Rate -> Inflation Capped by Caution Guardrail': { kuerzungQuelle: "Guardrail (Vorsicht)", monatlicheEntnahme: 5000.00 },
        'Gold Rebalancing -> Tax-Free Gold Sold First': { type: 'TRANSACTION', steuer: 0, 'quellen.0.kind': 'gold' },
        'Complex Tax -> Sells Lowest Tax-Drag Tranche, Uses Pauschbetrag': { type: 'TRANSACTION', 'quellen.0.kind': 'aktien_alt', steuer: 500.97 },
        'Boundary: Withdrawal Rate at ALARM Threshold': { alarmActive: false, kuerzungQuelle: "Guardrail (Vorsicht)", monatlicheEntnahme: 4583.33 },
        'Boundary: Real Drawdown at ALARM Threshold': { alarmActive: false, kuerzungQuelle: "Glättung (Abfall)" },
        'Boundary: Runway at EXACT Minimum': { isPufferSchutzAktiv: true, nettoErlös: 35000, type: 'TRANSACTION' },
        'Boundary: Recovery Gap at 15%': { kuerzungQuelle: "Guardrail (Vorsicht)", flexRate: 82.5 },
        'Skim & Fill -> Cap wirkt (maxSkimPctOfEq)': { type: 'TRANSACTION', title: 'Opportunistisches Rebalancing (Skim & Fill) (Cap aktiv)', nettoErlös: 22500, 'diag.step': 'Cap wirksam (Skim)' },
        'Bear Drip -> Cap wirkt (maxBearRefillPctOfEq)': { type: 'TRANSACTION', title: 'Bärenmarkt-Auffüllung (Drip) (Cap aktiv)', nettoErlös: 35000, 'diag.step': 'Cap wirksam (Bär)' },
        'Emergency Sell -> Gold first (bis Floor)': { 
            isPufferSchutzAktiv: true,
            nettoErlös: 85266.97, 
            'quellen.0.kind': 'gold',
            'quellen.0.brutto': 56000,
            'quellen.1.kind': 'aktien_neu'
        },
        'Emergency Sell -> No Gold Buffer, uses low-tax equity': { type: 'TRANSACTION', 'quellen.0.kind': 'aktien_alt'}
    };

    const _runSingleTest = (testCase) => {
        const { name, input, lastState, snapshotId } = testCase;
        const snapshot = TEST_SNAPSHOTS[snapshotId];
        if (!snapshot) {
            return { name, passed: false, deltas: [{ key: 'snapshot', expected: `ID '${snapshotId}'`, actual: 'Not Found' }] };
        }

        const modelResult = EngineAPI.simulateSingleYear(input, lastState);

        if (modelResult.error) {
             return { name, passed: false, deltas: [{ key: 'EngineError', expected: 'Success', actual: modelResult.error.message }] };
        }
        
        const capDecision = modelResult.diagnosis?.decisionTree.find(d => d.step.includes('Cap wirksam'));

        const results = {
            alarmActive: modelResult.newState?.alarmActive,
            flexRate: modelResult.newState?.flexRate,
            kuerzungProzent: modelResult.ui?.spending?.kuerzungProzent,
            kuerzungQuelle: modelResult.ui?.spending?.kuerzungQuelle,
            monatlicheEntnahme: modelResult.ui?.spending?.monatlicheEntnahme,
            type: modelResult.ui?.action?.type,
            title: modelResult.ui?.action?.title,
            isPufferSchutzAktiv: modelResult.ui?.action?.isPufferSchutzAktiv,
            steuer: modelResult.ui?.action?.steuer,
            nettoErlös: modelResult.ui?.action?.nettoErlös,
            'quellen.0.kind': _getNestedValue(modelResult, 'ui.action.quellen.0.kind'),
            'quellen.0.brutto': _getNestedValue(modelResult, 'ui.action.quellen.0.brutto'),
            'quellen.1.kind': _getNestedValue(modelResult, 'ui.action.quellen.1.kind'),
            'diag.step': capDecision?.step
        };

        const deltas = [];
        Object.keys(snapshot).forEach(key => {
            const expectedValue = snapshot[key];
            const actualValue = results[key];

            if (!_isClose(actualValue, expectedValue, key === 'steuer' ? 1.0 : 0.01)) { // Höhere Toleranz für Steuer
                deltas.push({
                    key,
                    expected: expectedValue,
                    actual: (actualValue === undefined) ? 'undefined' : (typeof actualValue === 'number' ? parseFloat(actualValue.toFixed(2)) : actualValue)
                });
            }
        });

        return { name, passed: deltas.length === 0, deltas };
    };

	function runDomainTests() {
        const baseInput = {
            aktuellesAlter: 65, floorBedarf: 35000, flexBedarf: 25000, inflation: 2.0,
            tagesgeld: 60000, geldmarktEtf: 360000, depotwertAlt: 0, depotwertNeu: 750000, goldWert: 0,
            endeVJ: 2318, endeVJ_1: 1960, endeVJ_2: 1850, endeVJ_3: 1706, ath: 2318, jahreSeitAth: 0,
            renteAktiv: false, renteMonatlich: 0, risikoprofil: 'sicherheits-dynamisch', round5: false,
            goldAktiv: false, goldZielProzent: 5, goldFloorProzent: 3, goldSteuerfrei: true, rebalancingBand: 35,
            costBasisAlt: 0, costBasisNeu: 750000, tqfAlt: 0.3, tqfNeu: 0.3, goldCost: 0,
            kirchensteuerSatz: 0.08, sparerPauschbetrag: 1000,
            runwayMinMonths: 24, runwayTargetMonths: 36, targetEq: 60, rebalBand: 5, maxSkimPctOfEq: 10, maxBearRefillPctOfEq: 5
        };
        const originalTestCases = [
            { name: "1. Peak/Hot Market -> No Action", snapshotId: 'Peak/Hot Market -> No Action', input: { ...baseInput, endeVJ: 2500, ath: 2500, depotwertNeu: 800000, tagesgeld: 150000, geldmarktEtf: 150000 }, lastState: { flexRate: 100, lastTotalBudget: 60000, peakRealVermoegen: 1200000, initialized: true, alarmActive: false, cumulativeInflationFactor: 1.02 }},
            { name: "2. Deep Bear & Thin Runway -> Alarm & Buffer Protection", snapshotId: 'Deep Bear & Thin Runway -> Alarm & Buffer Protection', input: { ...baseInput, endeVJ: 1500, ath: 2500, jahreSeitAth: 1.5, depotwertNeu: 500000, tagesgeld: 20000, geldmarktEtf: 40000 }, lastState: { flexRate: 90, lastTotalBudget: 58000, peakRealVermoegen: 1200000, initialized: true, alarmActive: false, cumulativeInflationFactor: 1.05 }},
            { name: "3. Recovery -> Flex Rate Capped & Alarm Deactivated", snapshotId: 'Recovery -> Flex Rate Capped & Alarm Deactivated', input: { ...baseInput, endeVJ: 1900, endeVJ_1: 1600, ath: 2500, jahreSeitAth: 1, depotwertNeu: 650000 }, lastState: { flexRate: 60, lastTotalBudget: 50000, peakRealVermoegen: 1200000, initialized: true, alarmActive: true, cumulativeInflationFactor: 1.05 }},
            { name: "4. High Withdrawal Rate -> Inflation Capped by Caution Guardrail", snapshotId: 'High Withdrawal Rate -> Inflation Capped by Caution Guardrail', input: { ...baseInput, depotwertNeu: 400000, inflation: 5.0, tagesgeld: 120000, geldmarktEtf: 80000 }, lastState: { flexRate: 100, lastTotalBudget: 60000, peakRealVermoegen: 1000000, initialized: true, alarmActive: false, cumulativeInflationFactor: 1.02 }},
            { name: "5. Gold Rebalancing -> Tax-Free Gold Sold First", snapshotId: 'Gold Rebalancing -> Tax-Free Gold Sold First', input: { ...baseInput, depotwertNeu: 700000, goldAktiv: true, goldWert: 150000, goldZielProzent: 5, rebalancingBand: 20, goldSteuerfrei: true, tagesgeld: 60000, geldmarktEtf: 150000 }, lastState: { flexRate: 100, lastTotalBudget: 60000, initialized: true, alarmActive: false, cumulativeInflationFactor: 1.02 }},
            { name: "6. Complex Tax -> Sells Lowest Tax-Drag Tranche, Uses Pauschbetrag", snapshotId: 'Complex Tax -> Sells Lowest Tax-Drag Tranche, Uses Pauschbetrag', input: { ...baseInput, depotwertAlt: 100000, costBasisAlt: 80000, tqfAlt: 0.3, depotwertNeu: 100000, costBasisNeu: 50000, tqfNeu: 0.3, kirchensteuerSatz: 0, tagesgeld: 50000, geldmarktEtf: 50000 }, lastState: { flexRate: 90, lastTotalBudget: 58000, initialized: true, alarmActive: false, cumulativeInflationFactor: 1.02 }},
            { name: "7. Boundary: Withdrawal Rate at ALARM Threshold", snapshotId: 'Boundary: Withdrawal Rate at ALARM Threshold', input: { ...baseInput, floorBedarf: 55000, flexBedarf: 0, depotwertNeu: 1000000 - baseInput.depotwertAlt, tagesgeld: 150000, geldmarktEtf: 150000 }, lastState: { flexRate: 100, lastTotalBudget: 55000, peakRealVermoegen: 1200000, initialized: true, alarmActive: false, cumulativeInflationFactor: 1.0 }},
            { name: "8. Boundary: Real Drawdown at ALARM Threshold", snapshotId: 'Boundary: Real Drawdown at ALARM Threshold', input: { ...baseInput, endeVJ: 1600, ath: 2500, depotwertNeu: 500000, tagesgeld: 50000, geldmarktEtf: 200000 }, lastState: { flexRate: 100, lastTotalBudget: 60000, peakRealVermoegen: 1000000, initialized: true, alarmActive: false, cumulativeInflationFactor: 1.0 }},
            { name: "9. Boundary: Runway at EXACT Minimum", snapshotId: 'Boundary: Runway at EXACT Minimum', input: { ...baseInput, endeVJ: 1500, ath: 2500, jahreSeitAth: 1.5, tagesgeld: 35000, geldmarktEtf: 35000 }, lastState: { flexRate: 85, lastTotalBudget: 55000, peakRealVermoegen: 1200000, initialized: true, alarmActive: false, cumulativeInflationFactor: 1.05 }},
            { name: "10. Boundary: Recovery Gap at 15%", snapshotId: 'Boundary: Recovery Gap at 15%', input: { ...baseInput, endeVJ: 2125, endeVJ_1: 1800, ath: 2500, jahreSeitAth: 1 }, lastState: { flexRate: 80, lastTotalBudget: 55000, peakRealVermoegen: 1200000, initialized: true, alarmActive: false, cumulativeInflationFactor: 1.05 }}
        ];
        const newTestCases = [
            { name: "11. Skim & Fill -> Cap (maxSkimPctOfEq) greift", snapshotId: 'Skim & Fill -> Cap wirkt (maxSkimPctOfEq)', input: { ...baseInput, depotwertNeu: 750000, tagesgeld: 50000, geldmarktEtf: 50000, targetEq: 50, rebalBand: 2, maxSkimPctOfEq: 3, runwayTargetMonths: 48 }, lastState: { flexRate: 100, lastTotalBudget: 60000, peakRealVermoegen: 1000000, initialized: true }},
            { name: "12. Bear Drip -> Cap (maxBearRefillPctOfEq) greift", snapshotId: 'Bear Drip -> Cap wirkt (maxBearRefillPctOfEq)', input: { ...baseInput, endeVJ: 1800, endeVJ_1: 2200, depotwertNeu: 700000, tagesgeld: 50000, geldmarktEtf: 40000, runwayMinMonths: 30, maxBearRefillPctOfEq: 5 }, lastState: { flexRate: 90, lastTotalBudget: 58000, peakRealVermoegen: 1200000, initialized: true, cumulativeInflationFactor: 1.05 }},
            // KORRIGIERTER INPUT FÜR TEST #13
            { name: "13. Emergency Sell -> Gold first (bis Floor)", 
              snapshotId: 'Emergency Sell -> Gold first (bis Floor)', 
              input: { ...baseInput, 
                  endeVJ: 1500, endeVJ_1: 2500, 
                  depotwertNeu: 500000, costBasisNeu: 450000, 
                  goldAktiv: true, goldWert: 80000, goldCost: 60000, goldFloorProzent: 4, 
                  tagesgeld: 10000, geldmarktEtf: 10000, 
                  runwayMinMonths: 36, // Wichtig: 36 Monate!
              }, 
              lastState: { 
                  flexRate: 80, peakRealVermoegen: 1200000, initialized: true, cumulativeInflationFactor: 1.1 
              }
            },
            { name: "14. Emergency Sell -> No Gold Buffer, low-tax equity", snapshotId: 'Emergency Sell -> No Gold Buffer, uses low-tax equity', input: { ...baseInput, endeVJ: 1500, endeVJ_1: 2500, depotwertAlt: 200000, costBasisAlt: 190000, tqfAlt: 0.3, depotwertNeu: 300000, costBasisNeu: 200000, tqfNeu: 0.3, tagesgeld: 10000, geldmarktEtf: 10000, runwayMinMonths: 36 }, lastState: { flexRate: 80, peakRealVermoegen: 1200000, initialized: true, cumulativeInflationFactor: 1.1 }}
        ];

        const testCases = [...originalTestCases, ...newTestCases];
        const results = testCases.map(_runSingleTest);
        const failedCount = results.filter(r => !r.passed).length;
        return { total: results.length, passed: results.length - failedCount, failed: failedCount, cases: results };
    }

    class SeededRandom {
        constructor(seed) { this.seed = seed; }
        next() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
        nextInt(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; }
        nextFloat(min, max) { return this.next() * (max - min) + min; }
        nextBool(probability = 0.5) { return this.next() < probability; }
    }

    function generateRandomInput(rng) {
        const tagesgeld = rng.nextInt(5000, 90000);
        const geldmarktEtf = rng.nextInt(30000, 250000);
        let flexBedarf = rng.nextInt(10000, 35000);
        let rebalancingBand = 35;
        if (rng.next() < 0.3) {
            flexBedarf = rng.nextInt(30000, 50000);
            rebalancingBand = rng.nextInt(10, 20);
        }
        const depotwertNeu = rng.nextInt(200000, 2500000);
        const costBasisNeu = depotwertNeu * rng.nextFloat(0.6, 1.0);
        const gesamtwert = depotwertNeu + tagesgeld + geldmarktEtf;
        const endeVJ = rng.nextInt(1000, 3000);
        const ath = endeVJ * rng.nextFloat(1.0, 1.4);
        const goldAktiv = rng.nextBool(0.15);
        let goldWert = 0, goldCost = 0;
        if (goldAktiv) {
            goldWert = (depotwertNeu * rng.nextFloat(0.01, 0.15));
            goldCost = goldWert * rng.nextFloat(0.7, 1.2);
        }
        const baseInput = {
            aktuellesAlter: rng.nextInt(65, 85), floorBedarf: rng.nextInt(25000, 45000), flexBedarf,
            inflation: rng.nextFloat(-2.0, 10.0), tagesgeld, geldmarktEtf, depotwertAlt: 0, depotwertNeu, goldWert,
            endeVJ, endeVJ_1: endeVJ * rng.nextFloat(0.8, 1.2), endeVJ_2: endeVJ * rng.nextFloat(0.7, 1.1), endeVJ_3: endeVJ * rng.nextFloat(0.6, 1.0),
            ath, jahreSeitAth: rng.nextFloat(0, 5), renteAktiv: false, renteMonatlich: 0, risikoprofil: 'sicherheits-dynamisch',
            round5: rng.nextBool(), goldAktiv, goldZielProzent: 5, goldFloorProzent: 3, goldSteuerfrei: true, rebalancingBand,
            costBasisAlt: 0, costBasisNeu, tqfAlt: 0.3, tqfNeu: 0.3, goldCost,
            kirchensteuerSatz: [0, 0.08, 0.09][rng.nextInt(0, 2)], sparerPauschbetrag: rng.nextInt(0, 2000),
            runwayMinMonths: 24, runwayTargetMonths: 36, targetEq: 60, rebalBand: 5, maxSkimPctOfEq: 10, maxBearRefillPctOfEq: 5
        };
        const lastState = {
            flexRate: rng.nextFloat(40, 100), lastTotalBudget: (baseInput.floorBedarf + baseInput.flexBedarf) * rng.nextFloat(0.8, 1.1),
            peakRealVermoegen: gesamtwert * rng.nextFloat(1.0, 1.3), initialized: true, alarmActive: rng.nextBool(0.2),
            cumulativeInflationFactor: rng.nextFloat(1.0, 1.2)
        };
        return { input: baseInput, lastState };
    }

    function _expectTax(action, input) {
        if (!action || action.type !== 'TRANSACTION' || !action.quellen) { return 0; }
        let totalExpectedTax = 0, remainingPauschbetrag = input.sparerPauschbetrag;
        const keSt = 0.25 * (1 + 0.055 + input.kirchensteuerSatz);
        for (const q of action.quellen) {
            let gewinnQuote = 0, tqf = 0;
            if (q.kind === 'aktien_alt' && input.depotwertAlt > 0) { gewinnQuote = (input.depotwertAlt - input.costBasisAlt) / input.depotwertAlt; tqf = input.tqfAlt; }
            else if (q.kind === 'aktien_neu' && input.depotwertNeu > 0) { gewinnQuote = (input.depotwertNeu - input.costBasisNeu) / input.depotwertNeu; tqf = input.tqfNeu; }
            const gewinnBrutto = q.brutto * gewinnQuote;
            const steuerbarerGewinnBasis = gewinnBrutto * (1 - tqf);
            const anrechenbarerPauschbetrag = Math.min(remainingPauschbetrag, steuerbarerGewinnBasis);
            const steuerpflichtigerGewinn = steuerbarerGewinnBasis - anrechenbarerPauschbetrag;
            const steuerFuerTranche = Math.max(0, steuerpflichtigerGewinn) * keSt;
            totalExpectedTax += steuerFuerTranche; remainingPauschbetrag -= anrechenbarerPauschbetrag;
        }
        return totalExpectedTax;
    }


    const PROPERTIES_TO_CHECK = [
        {
            name: "Determinismus: Gleicher Input erzeugt gleichen Output (via Hash)",
            generate: (rng) => [{...generateRandomInput(rng)}],
            check: (inputs) => {
                const result1 = EngineAPI.simulateSingleYear(inputs[0].input, inputs[0].lastState);
                const result2 = EngineAPI.simulateSingleYear(inputs[0].input, inputs[0].lastState);
                const _hashResult = (result) => {
                    if (result.error) return JSON.stringify({ error: result.error.name });
                    const { ui, newState } = result;
                    const keyData = { entnahme: ui.spending.monatlicheEntnahme.toFixed(2), quelle: ui.spending.kuerzungQuelle, alarm: newState.alarmActive, actionType: ui.action.type, netto: (ui.action.nettoErlös || 0).toFixed(2), steuer: (ui.action.steuer || 0).toFixed(2), quellenOrder: ui.action.quellen ? ui.action.quellen.map(q => q.kind) : [], zielLiq: Math.round(ui.zielLiquiditaet), sKey: ui.market.sKey, };
                    return JSON.stringify(keyData);
                };
                const hash1 = _hashResult(result1); const hash2 = _hashResult(result2);
                if (hash1 !== hash2) { console.error("Determinismus-Fehler! Hash1:", hash1, "Hash2:", hash2); }
                return hash1 === hash2;
            }
        },
        {
            name: "Sinnhaftigkeit: Finanzielle Ergebnisse sind nicht-negativ",
            generate: (rng) => [generateRandomInput(rng)],
            check: (inputs) => {
                const result = EngineAPI.simulateSingleYear(inputs[0].input, inputs[0].lastState);
                if (result.error) return false;
                const ui = result.ui;
                return ui.spending.monatlicheEntnahme >= 0 && ui.zielLiquiditaet >= 0 && ui.neuerBedarf >= 0;
            }
        },
        {
            name: "Steuerlogik: Korrekte Berechnung, Reihenfolge und Pauschbetrag-Nutzung",
            generate: (rng) => [rng],
            check: (inputs) => {
                const rng = inputs[0];
                let allPassed = true;
                const baseGen = () => generateRandomInput(rng);

                // G1: Testet, ob der Pauschbetrag einen kleinen Gewinn komplett steuerfrei stellt
                const case1 = baseGen();
                case1.input = {...case1.input, goldAktiv: false, endeVJ: case1.input.ath, tagesgeld: 5000, geldmarktEtf: 5000, depotwertNeu: 500000, costBasisNeu: 498000, tqfNeu: 0.0, sparerPauschbetrag: 2500 };
                const res1 = EngineAPI.simulateSingleYear(case1.input, case1.lastState).ui?.action;
                if (!res1 || res1.type !== 'TRANSACTION') { console.error("Steuer-Test G1: Kein Verkauf."); allPassed = false; }
                else if (res1.steuer > 0.01) { console.error("Steuer-Fehler G1:", { got: res1.steuer, exp: 0 }); allPassed = false; }
                
                // G2: Testet, ob bei hohem Gewinn und kleinem Pauschbetrag signifikante Steuern anfallen
                // Testet, ob bei hohem Gewinn die Steuer exakt der Erwartung entspricht.
        const case2 = baseGen();
        case2.input = {
            ...case2.input, 
            goldAktiv: false, 
            endeVJ: case2.input.ath, 
            tagesgeld: 5000, 
            geldmarktEtf: 5000, 
            depotwertNeu: 500000, 
            costBasisNeu: 450000, 
            sparerPauschbetrag: 1000, 
            tqfNeu: 0.0,
            // Optional/Empfohlen: inputs deterministischer machen
            kirchensteuerSatz: 0.08,
            maxSkimPctOfEq: 25
        };
        const res2 = EngineAPI.simulateSingleYear(case2.input, case2.lastState).ui?.action;
        if (!res2 || res2.type !== 'TRANSACTION') { 
            console.error("Steuer-Test G2: Kein Verkauf ausgelöst."); 
            allPassed = false; 
        } else {
            // Ersetzt die starre "> 1000"-Prüfung durch einen exakten Abgleich mit Toleranz
            const erwarteteSteuer = _expectTax(res2, case2.input);
            if (Math.abs(res2.steuer - erwarteteSteuer) > Math.max(1.0, erwarteteSteuer * 0.005)) {
                console.error("Steuer-Fehler G2 Betrag:", { got: res2.steuer.toFixed(2), exp: erwarteteSteuer.toFixed(2) });
                allPassed = false;
            }
        }

                // G3: Testet die korrekte Verkaufsreihenfolge (steuergünstigste Tranche zuerst)
                const case3 = baseGen();
                case3.input = {...case3.input, goldAktiv: false, endeVJ: case3.input.ath, tagesgeld: 5000, geldmarktEtf: 5000, depotwertAlt: 100000, costBasisAlt: 95000, tqfAlt: 0.3, depotwertNeu: 100000, costBasisNeu: 80000, tqfNeu: 0.0, sparerPauschbetrag: 6000 };
                const res3 = EngineAPI.simulateSingleYear(case3.input, case3.lastState).ui?.action;
                if (!res3 || res3.type !== 'TRANSACTION') { console.error("Steuer-Test G3: Kein Verkauf."); allPassed = false; }
                else {
                    if (res3.quellen[0]?.kind !== 'aktien_alt') { console.error("Steuer-Fehler G3 Reihenfolge:", { got: res3.quellen.map(q=>q.kind), exp0: 'aktien_alt' }); allPassed = false; }
                    const erwarteteSteuer = _expectTax(res3, case3.input);
                    if (Math.abs(res3.steuer - erwarteteSteuer) > Math.max(1.0, erwarteteSteuer * 0.005)) { console.error("Steuer-Fehler G3 Betrag:", { got: res3.steuer.toFixed(2), exp: erwarteteSteuer.toFixed(2) }); allPassed = false; }
                }

                // NEU: G4 - Mikro-Test für die Pipeline TFS -> PB
                const case4 = baseGen();
                case4.input = {...case4.input, goldAktiv: false, endeVJ: case4.input.ath, tagesgeld: 1000, geldmarktEtf: 1000, depotwertNeu: 200000, costBasisNeu: 100000, tqfNeu: 0.3, sparerPauschbetrag: 1000 };
                const result4 = EngineAPI.simulateSingleYear(case4.input, case4.lastState);
                if(result4.error) { console.error("Steuer-Test G4: Engine-Fehler", result4.error); allPassed = false; }
                else {
                    const res4 = result4.ui?.action;
                    if (!res4 || res4.type !== 'TRANSACTION') { console.error("Steuer-Test G4: Kein Verkauf."); allPassed = false; }
                    else {
                        if (res4.steuer <= 1000) { console.error("Steuer-Fehler G4 (Betrag): Steuer sollte >1000 sein.", { got: res4.steuer }); allPassed = false; }
                        if (res4.pauschbetragVerbraucht > case4.input.sparerPauschbetrag || res4.pauschbetragVerbraucht < 0) {
                            console.error("Steuer-Fehler G4 (PB-Verbrauch): Pauschbetrag außerhalb der Grenzen.", { got: res4.pauschbetragVerbraucht, max: case4.input.sparerPauschbetrag }); allPassed = false;
                        }
                    }
                }
                
                return allPassed;
            }
        },
        {
            name: "Sicherheit: Entnahme fällt nie unter den Floor-Bedarf",
            generate: (rng) => [generateRandomInput(rng)],
            check: (inputs) => {
                const result = EngineAPI.simulateSingleYear(inputs[0].input, inputs[0].lastState);
                if (result.error) return false;
                const jahresentnahme = result.ui.spending.monatlicheEntnahme * 12;
                const floorBedarfNetto = Math.max(0, inputs[0].input.floorBedarf - (inputs[0].input.renteAktiv ? inputs[0].input.renteMonatlich * 12 : 0));
                return jahresentnahme >= floorBedarfNetto - 0.01;
            }
        },
        {
            name: "Monotonie: Höhere Inflation senkt nominales Budget nicht",
            generate: (rng) => {
                const base = generateRandomInput(rng);
                const variant = JSON.parse(JSON.stringify(base));
                variant.input.inflation = base.input.inflation + rng.nextFloat(1.0, 5.0);
                return [base, variant];
            },
            check: (inputs) => {
                const res1 = EngineAPI.simulateSingleYear(inputs[0].input, inputs[0].lastState);
                const res2 = EngineAPI.simulateSingleYear(inputs[1].input, inputs[1].lastState);
                if (res1.error || res2.error) return false;
                const budget1 = res1.newState.lastTotalBudget;
                const budget2 = res2.newState.lastTotalBudget;
                return budget2 >= budget1 - 0.01;
            }
        },
        {
            name: "Cash-Rebalance: Korrekte Umschichtung (TG <-> GM)",
            generate: (rng) => [rng],
            check: (inputs) => {
                let allPassed = true;
                const jahresentnahme = 60000;

                // Fall 1: TG -> GM (Tagesgeld ist >3k über Ziel)
                const input1 = { tagesgeld: 63001, geldmarktEtf: 100000 };
                const res1 = UIRenderer.determineInternalCashRebalance(input1, input1.tagesgeld + input1.geldmarktEtf, jahresentnahme);
                if (!res1 || res1.from !== 'Tagesgeld' || res1.to !== 'Geldmarkt-ETF' || !_isClose(res1.amount, 3001)) {
                    console.error("Cash-Rebalance Fehler (TG->GM):", { got: res1 }); allPassed = false;
                }

                // Fall 2: GM -> TG (Tagesgeld ist >3k unter Ziel)
                const input2 = { tagesgeld: 56999, geldmarktEtf: 100000 };
                const res2 = UIRenderer.determineInternalCashRebalance(input2, input2.tagesgeld + input2.geldmarktEtf, jahresentnahme);
                if (!res2 || res2.from !== 'Geldmarkt-ETF' || res2.to !== 'Tagesgeld' || !_isClose(res2.amount, 3001)) {
                    console.error("Cash-Rebalance Fehler (GM->TG):", { got: res2 }); allPassed = false;
                }

                // Fall 3: Keine Aktion (Tagesgeld ist <2.5k vom Ziel entfernt)
                const input3 = { tagesgeld: 57501, geldmarktEtf: 100000 };
                const res3 = UIRenderer.determineInternalCashRebalance(input3, input3.tagesgeld + input3.geldmarktEtf, jahresentnahme);
                if (res3 !== null) {
                    console.error("Cash-Rebalance Fehler (Keine Aktion):", { got: res3 }); allPassed = false;
                }
                return allPassed;
            }
        }
    ];

    const COVERAGE_THRESHOLDS = {
        transaction: 0.20, alarm: 0.05, guardrail: 0.15, bear_market: 0.10
    };
    window.COVERAGE_THRESHOLDS = COVERAGE_THRESHOLDS;

    function runPropertyChecks(n = 200, seed = 123) {
        const resultsByProperty = {};
        const coverage = { transaction: 0, alarm: 0, guardrail: 0, bear_market: 0, totalRuns: 0 };

        PROPERTIES_TO_CHECK.forEach(prop => {
            resultsByProperty[prop.name] = { passed: 0, failed: 0, firstFail: null };
            const rng = new SeededRandom(seed);

            for (let i = 0; i < n; i++) {
                const currentSeed = rng.seed;
                const inputs = prop.generate(rng);
                let checkPassed = false;
                let errorOccurred = null;

                try {
                    checkPassed = prop.check(inputs);
                    if (prop.name.includes("Sicherheit")) {
                        const result = EngineAPI.simulateSingleYear(inputs[0].input, inputs[0].lastState);
                        if (!result.error) {
                             coverage.totalRuns++;
                             if (result.ui.action.type === 'TRANSACTION') coverage.transaction++;
                             if (result.newState.alarmActive) coverage.alarm++;
                             if (!['Profil', 'Tiefer Bär', 'NONE'].includes(result.ui.spending?.details?.cutReason) || result.diagnosis?.guardrails?.some(g => g.status !== 'ok')) coverage.guardrail++;
                             if (result.ui.market.sKey === 'bear_deep') coverage.bear_market++;
                         }
                    }
                } catch (e) {
                    errorOccurred = e;
                    checkPassed = false;
                }

                if (checkPassed) {
                    resultsByProperty[prop.name].passed++;
                } else {
                    resultsByProperty[prop.name].failed++;
                    if (!resultsByProperty[prop.name].firstFail) {
                        resultsByProperty[prop.name].firstFail = { seed: currentSeed, inputs, error: errorOccurred };
                    }
                }
                if (resultsByProperty[prop.name].failed >= DEV_CONFIG.MAX_FAILURES_TO_SHOW) {
                    break;
                }
            }
        });

        let allPropsPassed = Object.values(resultsByProperty).every(res => res.failed === 0);
        let coveragePassed = true;
        if (coverage.totalRuns > 0) {
            Object.entries(COVERAGE_THRESHOLDS).forEach(([key, threshold]) => {
                if ((coverage[key] / coverage.totalRuns) < threshold) {
                    coveragePassed = false;
                }
            });
        } else {
             coveragePassed = false;
        }

        const exitCode = (allPropsPassed && coveragePassed) ? 0 : 1;

        return {
            results: resultsByProperty,
            coverage: { transaction: coverage.transaction, alarm: coverage.alarm, guardrail: coverage.guardrail, bear_market: coverage.bear_market },
            n,
            exitCode
        };
    }

    function _createDevBar() {
        const bar = document.createElement('div');
        bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Entwickler-Testwerkzeuge');
        bar.style.cssText = `position: fixed; bottom: 0; left: 0; width: 100%; background: var(--surface-color); border-top: 1px solid var(--border-color); padding: 8px 15px; display: flex; gap: 10px; align-items: center; z-index: 1000; box-shadow: 0 -2px 10px rgba(0,0,0,0.1);`;
        const createButton = (text, label, handler) => {
            const btn = document.createElement('button'); btn.textContent = text; btn.className = 'btn btn-sm btn-utility'; btn.setAttribute('aria-label', label); btn.addEventListener('click', handler); return btn;
        };
        bar.appendChild(createButton('Domain Tests', 'Ctrl+Alt+D', () => _runAndReport(window.runDomainTests, 'Domain Tests')));
        bar.appendChild(createButton('Property Quick', 'Ctrl+Alt+Q', () => _runAndReport(() => window.runPropertyChecks(DEV_CONFIG.PROPERTY_QUICK_N, DEV_CONFIG.FIXED_SEED), `Property Quick (n=${DEV_CONFIG.PROPERTY_QUICK_N})`)));
        bar.appendChild(createButton('Property Deep', 'Ctrl+Alt+L', () => _runAndReport(() => window.runPropertyChecks(DEV_CONFIG.PROPERTY_DEEP_N, DEV_CONFIG.ROTATING_SEEDS[new Date().getMinutes() % DEV_CONFIG.ROTATING_SEEDS.length]), `Property Deep (n=${DEV_CONFIG.PROPERTY_DEEP_N})`)));
        document.body.appendChild(bar);
    }

    function _setupHotkeys() {
         document.addEventListener('keydown', (e) => {
            if (!e.ctrlKey || !e.altKey) return;
            switch (e.key.toLowerCase()) {
                case 'd': e.preventDefault(); _runAndReport(window.runDomainTests, 'Domain Tests'); break;
                case 'q': e.preventDefault(); _runAndReport(() => window.runPropertyChecks(DEV_CONFIG.PROPERTY_QUICK_N, DEV_CONFIG.FIXED_SEED), `Property Quick (n=${DEV_CONFIG.PROPERTY_QUICK_N})`); break;
                case 'l': e.preventDefault(); _runAndReport(() => window.runPropertyChecks(DEV_CONFIG.PROPERTY_DEEP_N, DEV_CONFIG.ROTATING_SEEDS[new Date().getMinutes() % DEV_CONFIG.ROTATING_SEEDS.length]), `Property Deep (n=${DEV_CONFIG.PROPERTY_DEEP_N})`); break;
            }
        });
    }

    async function _runAndReport(testFn, testName) {
        console.clear(); console.log(`%c[RUNNING] ${testName}...`, 'font-weight:bold; color:var(--accent-color);');
        if (typeof testFn !== 'function') {
            console.error(`%c[ERROR] Testfunktion ${testName} (window.${testFn?.name || 'unknown'}) ist nicht definiert.`, 'font-weight:bold; color:var(--danger-color);');
            window.__TEST_EXIT_CODE = 1; return { exitCode: 1 };
        }
        const startTime = performance.now(); await new Promise(resolve => setTimeout(resolve, 10));
        const result = testFn(); const endTime = performance.now(); const duration = endTime - startTime;
        return UnifiedTestReporter.report({ testName, result, duration });
    }

    async function _runCiMode() {
        console.log("CI-Modus erkannt. Starte vollständige Test-Suite...");
        if (typeof window.runDomainTests !== 'function' || typeof window.runPropertyChecks !== 'function') {
            console.error('%c[FATAL CI ERROR] Essentielle Testfunktionen nicht gefunden.', 'font-size: 1.2em; font-weight: bold; color: #ef4444;');
            window.__TEST_EXIT_CODE = 1; return;
        }
        const domainResult = await _runAndReport(window.runDomainTests, 'Domain Tests');
        const propResult = await _runAndReport(() => window.runPropertyChecks(DEV_CONFIG.PROPERTY_DEEP_N, DEV_CONFIG.FIXED_SEED), 'Property Deep (CI)');
        const finalExitCode = (domainResult.exitCode === 0 && propResult.exitCode === 0) ? 0 : 1;
        window.__TEST_EXIT_CODE = finalExitCode;
        console.log(`%cCI Run-Gesamtergebnis: ${finalExitCode === 0 ? 'PASS' : 'FAIL'} (Exit Code: ${finalExitCode})`, `font-size: 1.2em; font-weight: bold; color: ${finalExitCode === 0 ? '#22c55e' : '#ef4444'};`);
    }
    
    const UnifiedTestReporter = {
        report({ testName, result, duration }) {
            let exitCode = 0;
            if (result && result.cases) {
                exitCode = this._formatDomainResults(testName, result, duration);
            } else if (result && result.results) {
                exitCode = this._formatPropertyResults(testName, result, duration);
            } else {
                 console.error(`%c[ERROR] Unbekanntes Ergebnisformat für Test "${testName}"`, 'font-weight:bold; color:var(--danger-color);');
                 exitCode = 1;
            }
            window.__TEST_EXIT_CODE = exitCode;
            return { exitCode };
        },

        _formatDomainResults(testName, { total, passed, failed, cases }, duration) {
             const isSuccess = failed === 0;
            const summaryStyle = `font-size: 1.2em; font-weight: bold; color: ${isSuccess ? '#22c55e' : '#ef4444'};`;
            console.log(`%c[${isSuccess ? 'PASS' : 'FAIL'}] ${testName}: ${passed}/${total} in ${duration.toFixed(0)}ms`, summaryStyle);
            if (!isSuccess) {
                console.groupCollapsed(`Fehlerdetails für ${failed} fehlgeschlagene(n) Test(s)`);
                cases.filter(r => !r.passed).slice(0, DEV_CONFIG.MAX_FAILURES_TO_SHOW).forEach(res => {
                    console.group(res.name);
                    console.table(res.deltas.map(d => ({ Key: d.key, Expected: d.expected, Got: d.actual })));
                    console.groupEnd();
                });
                console.groupEnd();
            }
            return isSuccess ? 0 : 1;
        },

        _formatPropertyResults(testName, { results, coverage, n, exitCode }, duration) {
            const thresholds = window.COVERAGE_THRESHOLDS || { transaction: 0.20, alarm: 0.05, guardrail: 0.15, bear_market: 0.10 };
            const isSuccess = exitCode === 0;
            const summaryStyle = `font-size: 1.2em; font-weight: bold; color: ${isSuccess ? '#22c55e' : '#ef4444'};`;
            console.log(`%c[${isSuccess ? 'PASS' : 'FAIL'}] ${testName} in ${duration.toFixed(0)}ms`, summaryStyle);

            console.groupCollapsed('Property-Ergebnisse');
            Object.entries(results).forEach(([name, res]) => {
                const style = res.failed > 0 ? 'color:#ef4444;' : 'color:#22c55e;';
                console.log(`%c${res.failed > 0 ? 'FAIL' : 'PASS'}%c - ${name} (${res.passed}/${n})`, style, 'color:inherit;');
                if (res.firstFail) {
                    console.groupCollapsed('  ↳ Erstes Gegenbeispiel (seed:', res.firstFail.seed, ')');
                    console.log('Inputs:', res.firstFail.inputs);
                    if (res.firstFail.error) console.error('Fehler:', res.firstFail.error);
                    console.groupEnd();
                }
            });
            console.groupEnd();

            if (coverage && Object.keys(coverage).length > 0) {
                 const totalRunsForCoverage = n;
                 console.groupCollapsed('Coverage-Bericht');
                 Object.entries(coverage).forEach(([path, count]) => {
                     const percentage = totalRunsForCoverage > 0 ? count / totalRunsForCoverage : 0;
                     const threshold = thresholds[path] || 0;
                     const passed = percentage >= threshold;
                     const style = passed ? 'color:#22c55e;' : 'color:#ef4444;';
                     console.log(`%c${passed ? 'PASS' : 'FAIL'}%c - ${path}: ${(percentage * 100).toFixed(1)}% (>= ${(threshold * 100)}%)`, style, 'color:inherit;');
                 });
                 console.groupEnd();
            } else { console.log('%c[WARN] Keine Coverage-Daten für den Report verfügbar.', 'color:var(--warning-color);'); }

             if (isSuccess) { console.log("%c✅ Alle Property-Tests und Coverage-Ziele erfolgreich erreicht!", "background-color:#2c4238; color:#9ae6b4; font-weight:bold; padding: 4px 8px; border-radius: 4px; margin-top: 10px;"); }
            return exitCode;
        }
    };

    function initDevHarness() {
        const params = new URLSearchParams(window.location.search);
        if (params.has('dev')) { _createDevBar(); _setupHotkeys(); }
        if (params.has('ci')) { _runCiMode(); }
    }

    // Globale Zuweisungen für die Dev-Bar
    window.runDomainTests = runDomainTests;
    window.runPropertyChecks = runPropertyChecks;
    
    document.addEventListener('DOMContentLoaded', initDevHarness);
})(); // Ende Developer Test Harness IIFE

})(); // Ende Hauptanwendungs-IIFE

