/**
 * Module: Balance Binder Snapshots
 * Purpose: Manages Snapshot UI actions (Create, Restore, Delete).
 *          It interfaces with the StorageManager to persist/retrieve specific application states.
 * Usage: Used by balance-binder.js to handle snapshot list interactions.
 * Dependencies: balance-config.js, balance-renderer.js, balance-storage.js
 */
import { StorageError } from './balance-config.js';
import { UIRenderer } from './balance-renderer.js';
import { StorageManager } from './balance-storage.js';
import { rollExpensesYear } from './balance-expenses.js';

export function createSnapshotHandlers({
    dom,
    appState,
    debouncedUpdate,
    applyAnnualInflation
}) {
    return {
        async handleJahresabschluss() {
            const label = dom.inputs.profilName.value.trim();

            if (!confirm(`Soll der Jahresabschluss ${label ? `"${label}" ` : ''}jetzt erstellt werden?\n\nHinweis: Das aktuelle Alter (+1) und die Inflation werden dabei automatisch fortgeschrieben. Der Ausgaben-Check wird auf das nächste Jahr umgestellt, die Historie bleibt abrufbar.`)) return;

            try {
                applyAnnualInflation();
                debouncedUpdate();
                await new Promise(resolve => setTimeout(resolve, 300));
                // Pass the custom label to createSnapshot
                await StorageManager.createSnapshot(appState.snapshotHandle, label);
                UIRenderer.toast(`Jahresabschluss-Snapshot ${label ? `"${label}" ` : ''}erfolgreich erstellt.`);
                const nextYear = rollExpensesYear();
                UIRenderer.toast(`Ausgaben-Check auf ${nextYear} umgestellt.`);
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
        }
    };
}
