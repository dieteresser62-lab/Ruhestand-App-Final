"use strict";

/**
 * ===================================================================================
 * BALANCE-APP EVENT-HANDLER
 * ===================================================================================
 */

import { CONFIG, AppError, StorageError } from './balance-config.js';
import { UIUtils } from './balance-utils.js';
import { UIReader } from './balance-reader.js';
import { UIRenderer } from './balance-renderer.js';
import { StorageManager } from './balance-storage.js';

// Module-level references
let dom = null;
let appState = null;
let update = null;
let debouncedUpdate = null;
let lastUpdateResults = null;

/**
 * Initialisiert den UIBinder mit den notwendigen Abhängigkeiten
 */
export function initUIBinder(domRefs, state, updateFn, debouncedUpdateFn) {
    dom = domRefs;
    appState = state;
    update = updateFn;
    debouncedUpdate = debouncedUpdateFn;
}

export const UIBinder = {
    bindUI() {
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));

        dom.containers.form.addEventListener('input', this.handleFormInput.bind(this));
        dom.containers.form.addEventListener('change', this.handleFormChange.bind(this));
        document.querySelectorAll('input.currency').forEach(el => {
            el.addEventListener('blur', (e) => {
                e.target.value = UIUtils.formatNumber(UIUtils.parseCurrency(e.target.value));
            });
        });

        dom.containers.tabButtons.addEventListener('click', this.handleTabClick.bind(this));
        dom.controls.resetBtn.addEventListener('click', this.handleReset.bind(this));
        dom.controls.copyAction.addEventListener('click', () => {
            navigator.clipboard.writeText(document.getElementById('handlungContent').innerText.trim())
                .then(() => UIRenderer.toast('Kopiert.'));
        });
        dom.containers.bedarfAnpassung.addEventListener('click', this.handleBedarfAnpassungClick.bind(this));
        dom.controls.btnJahresUpdate.addEventListener('click', this.handleJahresUpdate.bind(this));
        if (dom.controls.btnJahresUpdateLog) {
            dom.controls.btnJahresUpdateLog.addEventListener('click', this.handleShowUpdateLog.bind(this));
        }
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

    handleKeyboardShortcuts(e) {
        // Alt+J: Jahresabschluss
        if (e.altKey && e.key === 'j') {
            e.preventDefault();
            dom.controls.jahresabschlussBtn.click();
            return;
        }

        // Alt+E: Export
        if (e.altKey && e.key === 'e') {
            e.preventDefault();
            dom.controls.exportBtn.click();
            return;
        }

        // Alt+I: Import
        if (e.altKey && e.key === 'i') {
            e.preventDefault();
            dom.controls.importBtn.click();
            return;
        }

        // Alt+N: Marktdaten nachrücken
        if (e.altKey && e.key === 'n') {
            e.preventDefault();
            dom.controls.btnNachruecken.click();
            return;
        }
    },

    handleFormInput(e) {
        const targetId = e.target.id;
        if (targetId && (targetId.startsWith('depotwert') || targetId === 'goldWert')) {
            const state = StorageManager.loadState();
            state.inputs = { ...(state.inputs || {}), depotLastUpdate: Date.now() };
            StorageManager.saveState(state);
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

    handleReset() {
        if (confirm("Alle gespeicherten Werte (inkl. Guardrail-Daten) zurücksetzen?")) {
            StorageManager.resetState();
            location.reload();
        }
    },

    handleBedarfAnpassungClick(e) {
        if (e.target.matches('.btn-apply-inflation')) {
            this._applyInflationToBedarfe();
        }
    },

    _applyInflationToBedarfe() {
        const inputData = UIReader.readAllInputs();
        const infl = inputData.inflation;
        const currentAge = inputData.aktuellesAlter;

        ['floorBedarf', 'flexBedarf'].forEach(id => {
            const el = dom.inputs[id];
            el.value = UIUtils.formatNumber(UIUtils.parseCurrency(el.value) * (1 + infl / 100));
        });

        const state = StorageManager.loadState();
        state.ageAdjustedForInflation = currentAge;
        StorageManager.saveState(state);

        update();
    },

    handleNachruecken() {
        appState.lastMarktData = {
            endeVJ: dom.inputs.endeVJ.value,
            endeVJ_1: dom.inputs.endeVJ_1.value,
            endeVJ_2: dom.inputs.endeVJ_2.value,
            endeVJ_3: dom.inputs.endeVJ_3.value,
            ath: dom.inputs.ath.value,
            jahreSeitAth: dom.inputs.jahreSeitAth.value
        };
        dom.inputs.endeVJ_3.value = dom.inputs.endeVJ_2.value;
        dom.inputs.endeVJ_2.value = dom.inputs.endeVJ_1.value;
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
            Object.entries(appState.lastMarktData).forEach(([k, v]) => {
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
        a.download = `balancing-export-${new Date().toISOString().slice(0, 10)}.json`;
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
        } catch (err) {
            UIRenderer.handleError(new AppError('Import fehlgeschlagen.', { originalError: err }));
        } finally {
            e.target.value = '';
        }
    },

    async handleCsvImport(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();

            const parseDate = (dateStr) => {
                const parts = dateStr.split('.');
                if (parts.length !== 3) return null;
                return new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
            };
            const parseValue = (numStr) => {
                if (!numStr) return NaN;
                return parseFloat(numStr.trim().replace(',', '.'));
            };

            const data = text.split(/\r?\n/).slice(1).map(line => {
                const columns = line.split(';');
                if (columns.length < 5) return null;
                return {
                    date: parseDate(columns[0]),
                    high: parseValue(columns[2]),
                    close: parseValue(columns[4])
                };
            }).filter(d => d && d.date && !isNaN(d.close))
                .sort((a, b) => a.date - b.date);

            if (data.length === 0) throw new Error('Keine gültigen Daten in der CSV gefunden.');

            const lastEntry = data[data.length - 1];
            const lastDate = lastEntry.date;
            const endeVjValue = lastEntry.close;

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

            let ath = { value: -Infinity, date: null };
            data.forEach(d => {
                if (d.close > ath.value) {
                    ath.value = d.close;
                    ath.date = d.date;
                }
            });

            let jahreSeitAth = 0;
            if (ath.value > lastEntry.close + 0.01 && ath.date) {
                const timeDiff = lastEntry.date.getTime() - ath.date.getTime();
                const yearsDiff = timeDiff / (1000 * 3600 * 24 * 365.25);
                jahreSeitAth = Math.floor(yearsDiff); // Ganze Jahre ohne Nachkommastellen
            }

            const updateField = (id, value) => {
                const el = dom.inputs[id];
                if (el) {
                    // Runde auf ganze Zahlen, keine Nachkommastellen
                    el.value = (typeof value === 'number' && isFinite(value)) ? Math.round(value).toString() : '';
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

    async handleFetchInflation() {
        const btn = dom.controls.btnFetchInflation;  // Kann undefined sein (wenn von Jahres-Update aufgerufen)
        const originalText = btn?.innerHTML;

        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '⏳ Lade...';
            }

            // Berechne das Vorjahr
            const currentYear = new Date().getFullYear();
            const previousYear = currentYear - 1;

            if (btn) {
                UIRenderer.toast(`Versuche Inflationsdaten für ${previousYear} abzurufen...`);
            }

            // Versuche verschiedene APIs nacheinander
            let inflationRate = null;
            let source = '';

            // API 1: ECB Statistical Data Warehouse (HICP - Harmonized Index of Consumer Prices)
            // Deutschland: DEU, HICP All-items, Annual rate of change
            try {
                const ecbUrl = `https://data-api.ecb.europa.eu/service/data/ICP/M.DE.N.000000.4.ANR`;
                const ecbResponse = await fetch(ecbUrl, {
                    headers: { 'Accept': 'application/json' }
                });

                if (ecbResponse.ok) {
                    const ecbData = await ecbResponse.json();

                    // Durchsuche die Zeitreihe nach dem Vorjahr
                    if (ecbData.dataSets && ecbData.dataSets[0] && ecbData.dataSets[0].series) {
                        const series = Object.values(ecbData.dataSets[0].series)[0];
                        if (series && series.observations) {
                            // Finde die neuesten verfügbaren Daten
                            const observations = Object.entries(series.observations);
                            if (observations.length > 0) {
                                // Nimm den neuesten Wert
                                const latestObs = observations[observations.length - 1];
                                inflationRate = parseFloat(latestObs[1][0]);
                                source = 'ECB (HICP)';
                            }
                        }
                    }
                }
            } catch (ecbErr) {
                // ECB API failed, try next
            }

            // API 2: World Bank API (Alternative)
            if (inflationRate === null) {
                try {
                    const wbUrl = `https://api.worldbank.org/v2/country/DE/indicator/FP.CPI.TOTL.ZG?format=json&date=${previousYear}`;
                    const wbResponse = await fetch(wbUrl);

                    if (wbResponse.ok) {
                        const wbData = await wbResponse.json();

                        if (wbData && wbData[1] && wbData[1].length > 0 && wbData[1][0].value !== null) {
                            inflationRate = parseFloat(wbData[1][0].value);
                            source = 'World Bank';
                        }
                    }
                } catch (wbErr) {
                    // World Bank API failed, try next
                }
            }

            // API 3: OECD API (Alternative)
            if (inflationRate === null) {
                try {
                    const oecdUrl = `https://stats.oecd.org/sdmx-json/data/DP_LIVE/.CPI.../OECD?contentType=json&detail=code&separator=.&dimensionAtObservation=allDimensions&startPeriod=${previousYear}&endPeriod=${previousYear}`;
                    const oecdResponse = await fetch(oecdUrl);

                    if (oecdResponse.ok) {
                        const oecdData = await oecdResponse.json();

                        // Suche Deutschland in den Daten
                        if (oecdData.dataSets && oecdData.dataSets[0] && oecdData.dataSets[0].observations) {
                            // OECD Datenstruktur ist komplex, durchsuche nach DEU
                            const observations = oecdData.dataSets[0].observations;
                            for (const [key, value] of Object.entries(observations)) {
                                // Prüfe ob das Deutschland ist
                                const indices = key.split(':');
                                if (oecdData.structure && oecdData.structure.dimensions) {
                                    const locationDim = oecdData.structure.dimensions.observation.find(d => d.id === 'LOCATION');
                                    if (locationDim && locationDim.values[parseInt(indices[0])].id === 'DEU') {
                                        inflationRate = parseFloat(value[0]);
                                        source = 'OECD';
                                        break;
                                    }
                                }
                            }
                        }
                    }
                } catch (oecdErr) {
                    // OECD API failed, try next
                }
            }

            // Ergebnis verarbeiten
            if (inflationRate !== null && !isNaN(inflationRate) && isFinite(inflationRate)) {
                // Setze den Wert im Eingabefeld
                dom.inputs.inflation.value = inflationRate.toFixed(1);
                debouncedUpdate();

                // Automatisch Bedarfe anpassen
                this._applyInflationToBedarfe();

                if (btn) {
                    UIRenderer.toast(`✅ Inflation ${previousYear}: ${inflationRate.toFixed(1)}% (Quelle: ${source})\nBedarfe automatisch angepasst`);
                }

                // Rückgabe für Jahres-Update Modal
                return {
                    rate: inflationRate,
                    year: previousYear,
                    source: source
                };
            } else {
                // Keine Daten gefunden - detailliertes Feedback
                throw new AppError(
                    `Keine Inflationsdaten für ${previousYear} gefunden.\n\n` +
                    `🔍 Getestete APIs:\n` +
                    `• ECB Statistical Data Warehouse\n` +
                    `• World Bank Data API\n` +
                    `• OECD Statistics API\n\n` +
                    `Mögliche Ursachen:\n` +
                    `• CORS-Blockierung durch Browser\n` +
                    `• Daten für ${previousYear} noch nicht verfügbar\n` +
                    `• API-Endpoints haben sich geändert\n\n` +
                    `💡 Tipp: Öffne die Browser-Konsole (F12) für Details.`
                );
            }

        } catch (err) {
            console.error('Inflation API Fehler:', err);
            UIRenderer.handleError(new AppError('Inflationsdaten-Abruf fehlgeschlagen.', { originalError: err }));
            throw err; // Re-throw für Jahres-Update
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    },

    /**
     * Führt den vollständigen Jahres-Update-Prozess aus (Inflation abrufen, Marktdaten nachrücken, Alter erhöhen)
     * und rendert anschließend das Ergebnis-Modal.
     * @returns {Promise<void>} Kein Rückgabewert; UI wird direkt aktualisiert.
     */
    async handleJahresUpdate() {
        const btn = dom.controls.btnJahresUpdate;
        const originalText = btn.innerHTML;
        const startTime = Date.now();

        // Results-Objekt für Modal
        const results = {
            startTime: startTime,
            inflation: null,
            etf: null,
            age: { old: parseInt(dom.inputs.aktuellesAlter.value) || 0, new: 0 },
            errors: []
        };

        try {
            btn.disabled = true;
            btn.innerHTML = '⏳ Lädt...';

            UIRenderer.toast('Starte Jahres-Update...');

            // Schritt 1: Alter um 1 Jahr erhoehen (ein Jahr ist vergangen)
            const currentAge = parseInt(dom.inputs.aktuellesAlter.value) || 0;
            const newAge = currentAge + 1;
            dom.inputs.aktuellesAlter.value = newAge.toString();
            results.age.new = newAge;

            // State aktualisieren: Das neue Alter gilt als "inflationsbereinigt"
            const state = StorageManager.loadState();
            state.ageAdjustedForInflation = newAge;
            StorageManager.saveState(state);

            // Schritt 2: Inflation abrufen
            btn.innerHTML = '⏳ Inflation...';
            try {
                results.inflation = await this.handleFetchInflation();
            } catch (err) {
                results.errors.push({ step: 'Inflation', error: err.message || 'Unbekannter Fehler' });
            }

            // Kurze Pause fuer besseres UX
            await new Promise(resolve => setTimeout(resolve, 500));

            // Schritt 3: Marktdaten via ETF abrufen und nachruecken
            btn.innerHTML = '⏳ ETF...';
            try {
                results.etf = await this.handleNachrueckenMitETF();
            } catch (err) {
                results.errors.push({ step: 'ETF/Nachr.', error: err.message || 'Unbekannter Fehler' });
            }

            // UI aktualisieren, damit die Erfolgsmeldung das neue Alter anzeigt
            debouncedUpdate();

            results.endTime = Date.now();

            // Protokoll für erneute Anzeige speichern und UI-Button aktivieren
            lastUpdateResults = JSON.parse(JSON.stringify(results));
            if (dom.controls.btnJahresUpdateLog) {
                dom.controls.btnJahresUpdateLog.disabled = false;
            }

            // Zeige Modal nur bei Fehlern, sonst Toast
            if (results.errors.length > 0) {
                this.showUpdateResultModal(results);
            } else {
                UIRenderer.toast('✅ Jahres-Update erfolgreich abgeschlossen.');
            }

        } catch (err) {
            console.error('Jahres-Update fehlgeschlagen:', err);
            UIRenderer.handleError(new AppError('Jahres-Update fehlgeschlagen.', { originalError: err }));
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    },

    /**
     * Rendert das Ergebnis-Modal für den Jahres-Update-Prozess und bindet Close-Handler.
     * @param {Object} results Aggregiertes Ergebnisobjekt aus Inflation, ETF-Daten und Altersfortschritt.
     * @returns {void}
     */
    showUpdateResultModal(results) {
        const modal = document.getElementById('updateResultModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalResults = document.getElementById('modalResults');
        const modalDuration = document.getElementById('modalDuration');
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        const closeX = modal.querySelector('.modal-close');
        const modalOverlay = modal.querySelector('.modal-overlay');

        if (!modal) {
            console.error('Modal Element nicht gefunden!');
            return;
        }

        if (!results || typeof results.startTime !== 'number' || typeof results.endTime !== 'number') {
            console.error('Ungültiges Ergebnisobjekt für das Jahres-Update-Modul.', results);
            UIRenderer.toast('Kein gültiges Protokoll verfügbar.');
            return;
        }

        // Berechne Dauer
        const duration = results.endTime - results.startTime;
        const durationSeconds = (duration / 1000).toFixed(1);

        // Bestimme Titel basierend auf Erfolg/Fehler
        const hasErrors = results.errors.length > 0;
        const allFailed = false;

        if (allFailed) {
            modalTitle.innerHTML = '❌ Jahres-Update fehlgeschlagen';
        } else if (hasErrors) {
            modalTitle.innerHTML = '⚠️ Jahres-Update teilweise erfolgreich';
        } else {
            modalTitle.innerHTML = '✅ Jahres-Update erfolgreich';
        }

        // Baue Ergebnis-HTML
        let html = '';

        // Inflation
        if (results.inflation) {
            html += `
                <div class="modal-result-item success">
                    <div class="result-icon">📊</div>
                    <div class="result-content">
                        <div class="result-title">Inflation ${results.inflation.year}</div>
                        <div class="result-value">${results.inflation.rate.toFixed(1)}%</div>
                        <div class="result-details">Quelle: ${results.inflation.source} • Bedarfe automatisch angepasst</div>
                    </div>
                </div>
            `;
        } else if (results.errors.find(e => e.step === 'Inflation')) {
            const error = results.errors.find(e => e.step === 'Inflation');
            html += `
                <div class="modal-result-item error">
                    <div class="result-icon">❌</div>
                    <div class="result-content">
                        <div class="result-title">Inflation</div>
                        <div class="result-value">Fehler</div>
                        <div class="result-details">${error.error}</div>
                    </div>
                </div>
            `;
        }

        // ETF & Marktdaten
        if (results.etf) {
            const athIcon = results.etf.ath.isNew ? '🎯' : '📈';
            const athText = results.etf.ath.isNew
                ? `Neues Allzeithoch! (alt: ${results.etf.ath.old} €)`
                : `ATH: ${results.etf.ath.new} € • Jahre seit ATH: ${results.etf.ath.yearsSince}`;

            html += `
                <div class="modal-result-item success">
                    <div class="result-icon">${athIcon}</div>
                    <div class="result-content">
                        <div class="result-title">${results.etf.ticker} • Nachrücken durchgeführt</div>
                        <div class="result-value">${results.etf.price} €</div>
                        <div class="result-details">Stand: ${results.etf.date} • Quelle: ${results.etf.source}<br>${athText}</div>
                    </div>
                </div>
            `;
        } else if (results.errors.find(e => e.step === 'ETF & Nachrücken')) {
            const error = results.errors.find(e => e.step === 'ETF & Nachrücken');
            html += `
                <div class="modal-result-item error">
                    <div class="result-icon">❌</div>
                    <div class="result-content">
                        <div class="result-title">ETF & Nachrücken</div>
                        <div class="result-value">Fehler</div>
                        <div class="result-details">${error.error}</div>
                    </div>
                </div>
            `;
        }

        // Alter
        html += `
            <div class="modal-result-item success">
                <div class="result-icon">🎂</div>
                <div class="result-content">
                    <div class="result-title">Aktuelles Alter</div>
                    <div class="result-value">${results.age.old} → ${results.age.new} Jahre</div>
                    <div class="result-details">Ein weiteres Jahr ist vergangen</div>
                </div>
            </div>
        `;

        modalResults.innerHTML = html;
        modalDuration.innerHTML = `⏱️ Dauer: ${durationSeconds} Sekunden`;

        // Event Handler für Schließen
        const closeModal = () => {
            modal.style.display = 'none';
        };

        // Entferne alte Event Listener (falls vorhanden)
        const newCloseBtn = modalCloseBtn.cloneNode(true);
        const newCloseX = closeX.cloneNode(true);
        const newOverlay = modalOverlay ? modalOverlay.cloneNode(true) : null;

        modalCloseBtn.parentNode.replaceChild(newCloseBtn, modalCloseBtn);
        closeX.parentNode.replaceChild(newCloseX, closeX);
        if (newOverlay) {
            modalOverlay.parentNode.replaceChild(newOverlay, modalOverlay);
        }

        // Neue Event Listener
        newCloseBtn.addEventListener('click', closeModal);
        newCloseX.addEventListener('click', closeModal);
        const activeOverlay = modal.querySelector('.modal-overlay');
        if (activeOverlay) {
            activeOverlay.addEventListener('click', closeModal);
        }

        // ESC-Taste zum Schließen
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        // Zeige Modal
        modal.style.display = 'flex';
    },

    /**
     * Öffnet das Ergebnis-Modal erneut, um das letzte gespeicherte Protokoll anzuzeigen.
     * @returns {void}
     */
    handleShowUpdateLog() {
        if (!lastUpdateResults) {
            UIRenderer.toast('Noch kein Jahres-Update durchgeführt.');
            return;
        }

        this.showUpdateResultModal(lastUpdateResults);
    },

    async _fetchVanguardETFPrice(targetDate) {
        const ticker = 'VWCE.DE'; // Vanguard FTSE All-World in EUR (Xetra)
        const isin = 'IE00BK5BQT80'; // ISIN für alternative APIs
        const LOCAL_YAHOO_PROXY = 'http://127.0.0.1:8787';

        const formatDate = (date) => Math.floor(date.getTime() / 1000); // Unix timestamp
        const formatDateYMD = (date) => date.toISOString().split('T')[0]; // YYYY-MM-DD

        // Starte am Zieldatum und gehe max. 10 Tage zurück (für Wochenenden/Feiertage)
        const targetTime = formatDate(targetDate);
        const startDate = new Date(targetDate);
        startDate.setDate(startDate.getDate() - 10);
        const startTime = formatDate(startDate);

        // Strategie 1: Yahoo Finance ueber lokalen Proxy
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startTime}&period2=${targetTime}&interval=1d`;
        const parseYahooResponse = (data, sourceLabel) => {
            if (data.chart?.result?.[0]) {
                const result = data.chart.result[0];
                const timestamps = result.timestamp;
                const quotes = result.indicators.quote[0];

                if (timestamps && quotes?.close) {
                    // Finde den letzten verf?gbaren Schlusskurs
                    for (let i = timestamps.length - 1; i >= 0; i--) {
                        const price = quotes.close[i];
                        if (price !== null && !isNaN(price)) {
                            return {
                                price: price,
                                date: new Date(timestamps[i] * 1000),
                                ticker: ticker,
                                source: sourceLabel
                            };
                        }
                    }
                }
            }
            return null;
        };
        try {
            const proxyUrl = `${LOCAL_YAHOO_PROXY}/chart?symbol=${encodeURIComponent(ticker)}&period1=${startTime}&period2=${targetTime}&interval=1d`;
            const response = await fetch(proxyUrl);
            if (response.ok) {
                const data = await response.json();
                const parsed = parseYahooResponse(data, 'Yahoo Finance (lokaler Proxy)');
                if (parsed) return parsed;
            }
        } catch (err) {
            // Yahoo Finance via local proxy failed, try fallback
        }

        const buildProxyUrl = (template, targetUrl) => {
            if (template.includes('{url}')) {
                return template.replace('{url}', encodeURIComponent(targetUrl));
            }
            return `${template}${encodeURIComponent(targetUrl)}`;
        };
        const proxyEntries = [];
        const rawCustomProxy = localStorage.getItem('etfProxyUrls') || localStorage.getItem('etfProxyUrl');
        if (rawCustomProxy) {
            let customList = [];
            try {
                const parsed = JSON.parse(rawCustomProxy);
                if (Array.isArray(parsed)) customList = parsed;
                else if (typeof parsed === 'string') customList = [parsed];
            } catch (err) {
                customList = [rawCustomProxy];
            }
            customList
                .filter(entry => typeof entry === 'string' && entry.trim().length > 0)
                .forEach(entry => {
                    proxyEntries.push({
                        name: 'Custom Proxy',
                        template: entry.trim()
                    });
                });
        }

        for (const proxy of proxyEntries) {
            try {
                const proxyUrl = buildProxyUrl(proxy.template, yahooUrl);
                const response = await fetch(proxyUrl);
                if (response.ok) {
                    const data = await response.json();
                    const parsed = parseYahooResponse(data, proxy.name);
                    if (parsed) return parsed;
                }
            } catch (err) {
                // Yahoo Finance via proxy failed, try next
            }
        }

        // Strategie 3: Finnhub API (kostenlos, CORS-freundlich, aber braucht Demo-Key)
        try {
            const finnhubKey = localStorage.getItem('finnhubApiKey') || 'demo';
            const finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${finnhubKey}`;

            const response = await fetch(finnhubUrl);

            if (response.ok) {
                const data = await response.json();

                if (data.c && data.c > 0) { // c = current price
                    return {
                        price: data.c,
                        date: new Date(data.t * 1000), // t = timestamp
                        ticker: ticker,
                        source: 'Finnhub (aktueller Kurs)'
                    };
                }
            }
        } catch (err) {
            // Finnhub API failed
        }

        // Alle Strategien fehlgeschlagen
        throw new AppError(
            `ETF-Daten konnten nicht abgerufen werden.\n\n` +
            `Ticker: ${ticker} (ISIN: ${isin})\n` +
            `Zieldatum: ${targetDate.toLocaleDateString('de-DE')}\n\n` +
            `Getestete APIs:
` +
            `- Yahoo Finance via lokalem Proxy (localhost:8787)
` +
            `- Optional: Custom Proxy (localStorage etfProxyUrl/etfProxyUrls)
` +
            `- Finnhub API

` +
            
            `Hinweise:
` +
            `- Nutze den manuellen "Nachr." Button
` +
            `- Importiere Daten via "CSV" Button
` +
            `- Optional: localStorage "finnhubApiKey" setzen
` +
            `- Optional: localStorage "etfProxyUrl" oder "etfProxyUrls" setzen
` +
            `- Pruefe die Browser-Konsole (F12) fuer Details`
        );
    },

    async handleNachrueckenMitETF() {
        const btn = dom.controls.btnNachrueckenMitETF;  // Kann undefined sein (wenn von Jahres-Update aufgerufen)
        const originalText = btn?.innerHTML;

        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '⏳ ETF...';
            }

            // Zieldatum: aktuelles Tagesdatum
            const targetDate = new Date();

            if (btn) {
                const todayLabel = targetDate.toLocaleDateString('de-DE');
                UIRenderer.toast(`Rufe VWCE.DE Kurs vom ${todayLabel} ab...`);
            }

            // 1. ETF-Kurs abrufen
            const etfData = await this._fetchVanguardETFPrice(targetDate);

            // 2. Nachrücken durchführen (bestehende Logik)
            if (btn) {
                btn.innerHTML = '⏳ Nachr...';
            }

            // Speichere alte Werte für Undo und Rückgabe
            const oldATH = parseFloat(dom.inputs.ath.value) || 0;
            const oldJahreSeitAth = parseInt(dom.inputs.jahreSeitAth.value) || 0;

            appState.lastMarktData = {
                endeVJ: dom.inputs.endeVJ.value,
                endeVJ_1: dom.inputs.endeVJ_1.value,
                endeVJ_2: dom.inputs.endeVJ_2.value,
                endeVJ_3: dom.inputs.endeVJ_3.value,
                ath: dom.inputs.ath.value,
                jahreSeitAth: dom.inputs.jahreSeitAth.value
            };

            // Verschiebe die Werte
            dom.inputs.endeVJ_3.value = dom.inputs.endeVJ_2.value;
            dom.inputs.endeVJ_2.value = dom.inputs.endeVJ_1.value;
            dom.inputs.endeVJ_1.value = dom.inputs.endeVJ.value;

            // 3. Neuen ETF-Wert in Ende VJ eintragen (ohne Nachkommastellen)
            const etfPrice = Math.round(etfData.price);
            dom.inputs.endeVJ.value = etfPrice.toString();

            // 4. ATH-Logik anwenden
            const currentATH = oldATH;
            const newValue = etfPrice;
            const previousJahreSeitAth = oldJahreSeitAth;

            let isNewATH = false;
            let newJahreSeitAth = previousJahreSeitAth;

            if (newValue > currentATH) {
                // Neues Allzeithoch!
                dom.inputs.ath.value = etfPrice.toString();
                dom.inputs.jahreSeitAth.value = '0';
                isNewATH = true;
                newJahreSeitAth = 0;
            } else {
                // Kein neues ATH → Jahre erhöhen
                newJahreSeitAth = previousJahreSeitAth + 1;
                dom.inputs.jahreSeitAth.value = newJahreSeitAth.toString();
            }

            // 5. Inflation anwenden
            this._applyAnnualInflation();

            // 6. Update und Feedback
            debouncedUpdate();
            dom.controls.btnUndoNachruecken.style.display = 'inline-flex';

            const usedDate = etfData.date.toLocaleDateString('de-DE');
            const athStatus = isNewATH ? '🎯 Neues ATH!' : `Jahre seit ATH: ${newJahreSeitAth}`;

            if (btn) {
                UIRenderer.toast(
                    `✅ Nachrücken mit ETF abgeschlossen!\n` +
                    `VWCE.DE: ${etfPrice} € (${usedDate})\n` +
                    `Quelle: ${etfData.source}\n` +
                    `${athStatus}`
                );
            }

            // Rückgabe für Jahres-Update Modal
            return {
                price: etfPrice,
                date: usedDate,
                ticker: etfData.ticker,
                source: etfData.source,
                ath: {
                    old: oldATH,
                    new: isNewATH ? etfPrice : oldATH,
                    isNew: isNewATH,
                    yearsSince: newJahreSeitAth
                }
            };

        } catch (err) {
            console.error('Nachrücken mit ETF fehlgeschlagen:', err);
            UIRenderer.handleError(err);
            throw err; // Re-throw für Jahres-Update
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    },

    async handleJahresabschluss() {
        const label = dom.inputs.profilName.value.trim();

        if (!confirm(`Soll der Jahresabschluss ${label ? `"${label}" ` : ''}jetzt erstellt werden?\n\nHinweis: Das aktuelle Alter (+1) und die Inflation werden dabei automatisch fortgeschrieben.`)) return;

        try {
            this._applyAnnualInflation();
            debouncedUpdate();
            await new Promise(resolve => setTimeout(resolve, 300));
            // Pass the custom label to createSnapshot
            await StorageManager.createSnapshot(appState.snapshotHandle, label);
            UIRenderer.toast(`Jahresabschluss-Snapshot ${label ? `"${label}" ` : ''}erfolgreich erstellt.`);
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
                if (confirm(`Snapshot "${key.replace('.json', '')}" wiederherstellen? Alle aktuellen Eingaben gehen verloren.`)) {
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
        text += `Realer Drawdown: ${(diagnosis.keyParams.realerDepotDrawdown * -100).toFixed(1)}%\n`;
        const formatCoverage = (value) => (typeof value === 'number' && isFinite(value))
            ? `${value.toFixed(0)}%`
            : 'n/a';
        const coverageLine = `Liquiditätsdeckung: ${formatCoverage(diagnosis.general.deckungVorher)} → ${formatCoverage(diagnosis.general.deckungNachher)} (Ziel: 100%)`;
        text += `${coverageLine}\n`;
        const runwayMonate = diagnosis.general.runwayMonate;
        const runwayTarget = diagnosis.general.runwayTargetMonate;
        const runwaySourceInfo = UIUtils.describeRunwayTargetSource(diagnosis.general.runwayTargetQuelle);
        const formatRunwayValue = (value) => (typeof value === 'number' && isFinite(value))
            ? `${value.toFixed(1)} Monate`
            : '∞';
        const runwayLine = `Runway: ${formatRunwayValue(runwayMonate)} (Ziel: ${typeof runwayTarget === 'number' && isFinite(runwayTarget) ? `${runwayTarget.toFixed(0)} Monate` : 'n/a'}) -> Status: ${(diagnosis.general.runwayStatus || 'unbekannt').toUpperCase()} | Quelle: ${runwaySourceInfo.label}`;
        text += `${runwayLine}\nQuelle-Details: ${runwaySourceInfo.description}\n\n`;
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

        const txnDiag = diagnosis.transactionDiagnostics;
        const describeReason = (reason) => {
            const map = {
                none: 'Keine Blockade',
                min_trade: 'Unter Mindestgröße',
                liquidity_sufficient: 'Liquidität ausreichend',
                guardrail_block: 'Guardrail verhindert Verkauf',
                cap_active: 'Cap begrenzt Trade',
                gold_floor: 'Gold-Floor aktiv'
            };
            if (!reason) return map.none;
            return map[reason.toLowerCase()] || reason.replace(/[_-]/g, ' ');
        };
        const determineReasonStatus = (reason, wasTriggered) => {
            const statusMap = {
                none: 'OK',
                min_trade: 'WARN',
                liquidity_sufficient: 'INFO',
                guardrail_block: 'DANGER',
                cap_active: 'WARN',
                gold_floor: 'DANGER'
            };
            return statusMap[reason?.toLowerCase()] || (wasTriggered ? 'OK' : 'INFO');
        };
        const formatThresholdValue = (key, value) => {
            if (typeof value === 'number' && isFinite(value)) {
                if (/pct|percent|quote|rate/i.test(key)) {
                    return `${value.toFixed(1)}%`;
                }
                if (/amount|wert|value|eur|euro|betrag|volume|blocked/i.test(key)) {
                    return UIUtils.formatCurrency(value);
                }
                if (/month|monate|runway/i.test(key)) {
                    return `${value.toFixed(0)} Monate`;
                }
                return value.toFixed(2);
            }
            return (value ?? 'n/a').toString();
        };
        const appendThresholdBlock = (label, thresholds) => {
            if (!thresholds || typeof thresholds !== 'object' || Object.keys(thresholds).length === 0) {
                text += `${label}: keine Daten\n`;
                return;
            }
            text += `${label}:\n`;
            Object.entries(thresholds).forEach(([key, value]) => {
                text += `  - ${key}: ${formatThresholdValue(key, value)}\n`;
            });
        };

        if (txnDiag) {
            text += `\n--- Transaktionsdiagnostik ---\n`;
            text += `Status: ${determineReasonStatus(txnDiag.blockReason, txnDiag.wasTriggered)} (${describeReason(txnDiag.blockReason)})\n`;
            text += `Ausgelöst: ${txnDiag.wasTriggered ? 'Ja' : 'Nein'}\n`;
            text += `Blockierter Betrag: ${UIUtils.formatCurrency(txnDiag.blockedAmount || 0)}\n`;
            if (txnDiag.blockReason && txnDiag.blockReason !== 'none') {
                text += `Grundcode: ${txnDiag.blockReason}\n`;
            }
            if (txnDiag.potentialTrade && typeof txnDiag.potentialTrade === 'object' && Object.keys(txnDiag.potentialTrade).length > 0) {
                const trade = txnDiag.potentialTrade;
                const tradeParts = [];
                if (trade.direction || trade.kind) {
                    tradeParts.push(trade.direction || trade.kind);
                }
                const tradeValue = [trade.netAmount, trade.netto, trade.amount].find(v => typeof v === 'number' && isFinite(v));
                if (typeof tradeValue === 'number') {
                    tradeParts.push(UIUtils.formatCurrency(tradeValue));
                }
                if (tradeParts.length > 0) {
                    text += `Geplante Aktion: ${tradeParts.join(' / ')}\n`;
                }
            }
            appendThresholdBlock('Aktien-Grenzen', txnDiag.equityThresholds);
            appendThresholdBlock('Gold-Grenzen', txnDiag.goldThresholds);
        }

        text += `\n--- Schlüsselparameter ---\n`;
        text += `Peak (real): ${UIUtils.formatCurrency(diagnosis.keyParams.peakRealVermoegen)}\n`;
        text += `Aktuell (real): ${UIUtils.formatCurrency(diagnosis.keyParams.currentRealVermoegen)}\n`;
        text += `Kumulierte Inflation: +${((diagnosis.keyParams.cumulativeInflationFactor - 1) * 100).toFixed(1)}%\n`;
        if (typeof diagnosis.keyParams.aktuelleFlexRate === 'number') {
            text += `Effektive Flex-Rate: ${diagnosis.keyParams.aktuelleFlexRate.toFixed(1)}%\n`;
        }
        if (typeof diagnosis.keyParams.kuerzungProzent === 'number') {
            text += `Kürzung ggü. Flex-Bedarf: ${diagnosis.keyParams.kuerzungProzent.toFixed(1)}%\n`;
        }
        if (typeof diagnosis.keyParams.jahresentnahme === 'number') {
            text += `Jahresentnahme (brutto): ${UIUtils.formatCurrency(diagnosis.keyParams.jahresentnahme)}\n`;
        }
        text += `\n===== Ende der Diagnose =====`;
        return text;
    }
};
