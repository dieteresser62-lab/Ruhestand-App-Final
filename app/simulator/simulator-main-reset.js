"use strict";

import { PersistenceFacade, persistenceStorage } from '../shared/persistence-facade.js';
import { clearHouseholdSimulatorNeeds } from './simulator-household-needs-persistence.js';

/**
 * Initialisiert den Reset-Button für die Simulator-Einstellungen.
 */
export function initResetButton() {
    const resetBtn = document.getElementById('resetBtn');
    if (!resetBtn) return;

    resetBtn.addEventListener('click', async () => {
        if (confirm('Möchten Sie wirklich alle gespeicherten Simulator-Einstellungen zurücksetzen? Dies kann nicht rückgängig gemacht werden.')) {
            const statusEl = document.getElementById('simProfileStatus');
            resetBtn.disabled = true;
            // Alle Keys entfernen, die mit 'sim_' beginnen
            const keysToRemove = [];
            for (let i = 0; i < persistenceStorage.length; i++) {
                const key = persistenceStorage.key(i);
                if (key && key.startsWith('sim_')) {
                    keysToRemove.push(key);
                }
            }

            // Remove after collecting to avoid index shifting while iterating.
            keysToRemove.forEach(key => persistenceStorage.removeItem(key));
            clearHouseholdSimulatorNeeds();

            // IndexedDB-Schreibvorgaenge muessen vor dem Reload abgeschlossen sein,
            // sonst kann der alte Override beim Neustart erneut eingelesen werden.
            try {
                await PersistenceFacade.flush();
            } catch (error) {
                resetBtn.disabled = false;
                if (statusEl) {
                    statusEl.dataset.kind = 'error';
                    statusEl.textContent = 'Simulator-Reset konnte nicht dauerhaft gespeichert werden. Bitte erneut versuchen.';
                }
                console.error('[SimulatorReset] Persistenz-Flush fehlgeschlagen.', error);
                return;
            }

            // Seite neu laden, um leere Felder (Default-Zustand) anzuzeigen
            window.location.reload();
        }
    });
}
