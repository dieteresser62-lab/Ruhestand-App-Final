"use strict";

import { persistenceStorage } from '../shared/persistence-facade.js';

/**
 * Initialisiert den Reset-Button für die Simulator-Einstellungen.
 */
export function initResetButton() {
    const resetBtn = document.getElementById('resetBtn');
    if (!resetBtn) return;

    resetBtn.addEventListener('click', () => {
        if (confirm('Möchten Sie wirklich alle gespeicherten Simulator-Einstellungen zurücksetzen? Dies kann nicht rückgängig gemacht werden.')) {
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

            // Seite neu laden, um leere Felder (Default-Zustand) anzuzeigen
            window.location.reload();
        }
    });
}
