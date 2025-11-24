"use strict";

/**
 * ===================================================================================
 * BALANCE-APP EVENT-HANDLER
 * ===================================================================================
 */

import { CONFIG, AppError, StorageError, DebugUtils } from './balance-config.js';
import { UIUtils } from './balance-utils.js';
import { UIReader } from './balance-reader.js';
import { UIRenderer } from './balance-renderer.js';
import { StorageManager } from './balance-storage.js';

// Module-level references
let dom = null;
let appState = null;
let update = null;
let debouncedUpdate = null;

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
        // CTRL+Shift+D: Debug-Modus umschalten
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            const newState = DebugUtils.toggleDebugMode();

            // UI-Indikator aktualisieren
            this.updateDebugModeUI(newState);

            // Wenn aktiviert: Diagnose-Panel öffnen
            if (newState) {
                dom.diagnosis.drawer.classList.add('is-open');
                dom.diagnosis.overlay.classList.add('is-open');
            }

            UIRenderer.toast(newState ? '🐛 Debug-Modus aktiviert' : '🐛 Debug-Modus deaktiviert');
            return;
        }

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

        // Alt+D: Dark-Mode umschalten
        if (e.altKey && e.key === 'd') {
            e.preventDefault();
            this.handleThemeToggle();
            return;
        }
    },

    updateDebugModeUI(isActive) {
        const debugIndicator = document.getElementById('debugModeIndicator');
        if (debugIndicator) {
            debugIndicator.style.display = isActive ? 'flex' : 'none';
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
        if(confirm("Alle gespeicherten Werte (inkl. Guardrail-Daten) zurücksetzen?")) {
            StorageManager.resetState();
            location.reload();
        }
    },

    handleBedarfAnpassungClick(e) {
        if (e.target.matches('.btn-apply-inflation')) {
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
        }
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
                jahreSeitAth = timeDiff / (1000 * 3600 * 24 * 365.25);
            }

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
            await new Promise(resolve => setTimeout(resolve, 300));
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
