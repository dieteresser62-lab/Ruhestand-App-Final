/**
 * Module: Balance Annual Orchestrator
 * Purpose: Coordinates the complex "Annual Update" workflow (Year Adjustment -> Inflation -> Market Data).
 *          It ensures the sequence is correct (Age update first, then financial data) and tracks errors.
 * Usage: Used by balance-binder-annual.js to provide the main "Jahres-Update" function.
 * Dependencies: balance-config.js, balance-renderer.js, balance-storage.js
 */
"use strict";

import { AppError } from './balance-config.js';
import { UIRenderer } from './balance-renderer.js';
import { StorageManager } from './balance-storage.js';
import { saveCurrentProfileFromLocalStorage } from '../profile/profile-storage.js';

export function createAnnualOrchestrator({
    dom,
    debouncedUpdate,
    handleFetchInflation,
    handleNachrueckenMitETF,
    showUpdateResultModal,
    setLastUpdateResults
}) {
    const handleJahresUpdate = async () => {
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
                results.inflation = await handleFetchInflation();
            } catch (err) {
                results.errors.push({ step: 'Inflation', error: err.message || 'Unbekannter Fehler' });
            }

            // Kurze Pause fuer besseres UX
            await new Promise(resolve => setTimeout(resolve, 500));

            // Schritt 3: Marktdaten via ETF abrufen und nachruecken
            btn.innerHTML = '⏳ ETF...';
            try {
                results.etf = await handleNachrueckenMitETF();
            } catch (err) {
                results.errors.push({ step: 'ETF/Nachr.', error: err.message || 'Unbekannter Fehler' });
            }

            // UI aktualisieren, damit die Erfolgsmeldung das neue Alter anzeigt
            debouncedUpdate();

            // Profil-Daten (inkl. Tranchen) explizit in Registry speichern
            saveCurrentProfileFromLocalStorage();

            results.endTime = Date.now();

            // Protokoll für erneute Anzeige speichern und UI-Button aktivieren
            setLastUpdateResults(JSON.parse(JSON.stringify(results)));
            if (dom.controls.btnJahresUpdateLog) {
                dom.controls.btnJahresUpdateLog.disabled = false;
            }

            // Zeige Modal nur bei Fehlern, sonst Toast
            if (results.errors.length > 0) {
                showUpdateResultModal(results);
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
    };

    return { handleJahresUpdate };
}
