"use strict";

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
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('sim_')) {
                    keysToRemove.push(key);
                }
            }

            // Remove after collecting to avoid index shifting while iterating.
            keysToRemove.forEach(key => localStorage.removeItem(key));

            // Seite neu laden, um leere Felder (Default-Zustand) anzuzeigen
            window.location.reload();
        }
    });
}
