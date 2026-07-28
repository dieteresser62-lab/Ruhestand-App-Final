// @ts-check

import {
    listProfiles,
    getCurrentProfileId,
    getProfileMeta,
    createProfile,
    renameProfile,
    deleteProfile,
    switchProfile,
    saveCurrentProfileFromLocalStorage,
    createProfileRecoveryDocument,
    getLastProfileBootstrapResult,
    getProfileRecoveryFromError,
    resetProfileRecovery
} from './profile-storage.js';
import { initProfileIndexLifecycle } from './profile-navigation.js';
import { downloadJsonFile } from '../shared/persistence-backup.js';
import { PersistenceFacade, init as initPersistence } from '../shared/persistence-facade.js';

function byId(id) {
    return document.getElementById(id);
}

function renderProfiles(selectEl, activeId) {
    const profiles = listProfiles();
    selectEl.innerHTML = '';
    profiles.forEach(meta => {
        const option = document.createElement('option');
        option.value = meta.id;
        option.textContent = meta.name || meta.id;
        if (meta.id === activeId) option.selected = true;
        selectEl.appendChild(option);
    });
}

function updateActiveBadge(badgeEl, activeId) {
    const meta = getProfileMeta(activeId);
    const name = meta?.name || activeId;
    const updatedAt = meta?.updatedAt ? new Date(meta.updatedAt).toLocaleString('de-DE') : 'unbekannt';
    badgeEl.textContent = `Aktiv: ${name} (zuletzt: ${updatedAt})`;
}

function setStatus(statusEl, message, kind = '') {
    statusEl.textContent = message;
    statusEl.dataset.kind = kind;
}

function createRecoveryFilename(date = new Date()) {
    return `profil-recovery-${date.toISOString().replace(/[:.]/g, '-')}.json`;
}

function setProfileControlsDisabled(controls, disabled) {
    controls.forEach(control => {
        if (control && 'disabled' in control) control.disabled = disabled;
    });
}

function renderProfileRecovery({
    statusEl,
    recovery,
    controls,
    win = window,
    doc = document
}) {
    statusEl.textContent = '';
    statusEl.dataset.kind = 'error';
    statusEl.dataset.profileRecovery = recovery.status;
    setProfileControlsDisabled(controls, true);

    const message = doc.createElement('p');
    message.textContent = `${recovery.message} Ohne ausdrueckliche Nutzerentscheidung werden keine Profildaten ueberschrieben.`;
    statusEl.appendChild(message);

    const actions = doc.createElement('div');
    actions.className = 'profile-row';
    statusEl.appendChild(actions);

    if (recovery.status === 'unavailable' || recovery.canReset !== true) {
        const retryButton = doc.createElement('button');
        retryButton.type = 'button';
        retryButton.className = 'profile-button secondary';
        retryButton.textContent = 'Erneut versuchen';
        retryButton.dataset.profileRecoveryAction = 'retry';
        retryButton.addEventListener('click', () => win.location.reload());
        actions.appendChild(retryButton);
        return;
    }

    let exportedDocument = null;
    const exportButton = doc.createElement('button');
    exportButton.type = 'button';
    exportButton.className = 'profile-button secondary';
    exportButton.textContent = 'Export / Recovery';
    exportButton.dataset.profileRecoveryAction = 'export';

    const resetButton = doc.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'profile-button danger';
    resetButton.textContent = 'Bestaetigt zuruecksetzen';
    resetButton.dataset.profileRecoveryAction = 'reset';
    resetButton.disabled = true;

    exportButton.addEventListener('click', () => {
        try {
            exportedDocument = createProfileRecoveryDocument(recovery, {
                backend: PersistenceFacade.getPersistenceStatus()?.backend || 'unknown'
            });
            downloadJsonFile(exportedDocument, createRecoveryFilename(), doc);
            exportButton.textContent = 'Recovery exportiert';
            resetButton.disabled = false;
        } catch (error) {
            exportedDocument = null;
            resetButton.disabled = true;
            message.textContent = `Der Recovery-Export ist fehlgeschlagen. ${error?.message || ''}`.trim();
        }
    });

    resetButton.addEventListener('click', async () => {
        if (!exportedDocument) return;
        const confirmed = typeof globalThis.confirm === 'function'
            && globalThis.confirm(
                'Betroffenen Profilbereich wirklich zuruecksetzen?\n\n'
                + 'Der korrupte Rohinhalt wurde zuvor als Recovery-Datei exportiert.'
            );
        if (!confirmed) return;
        try {
            resetProfileRecovery(recovery, {
                recoveryDocument: exportedDocument,
                confirmed: true
            });
            await PersistenceFacade.flush();
            win.location.reload();
        } catch (error) {
            resetButton.disabled = true;
            message.textContent = `Der Profilbereich wurde nicht zurueckgesetzt. ${error?.message || ''}`.trim();
        }
    });

    actions.appendChild(exportButton);
    actions.appendChild(resetButton);
}

document.addEventListener('DOMContentLoaded', async () => {
    await initPersistence();

    const profileSelect = byId('profileSelect');
    const profileNameInput = byId('profileNameInput');
    const createBtn = byId('profileCreateBtn');
    const renameBtn = byId('profileRenameBtn');
    const deleteBtn = byId('profileDeleteBtn');
    const saveBtn = byId('profileSaveBtn');
    const activeBadge = byId('activeProfileBadge');
    const statusEl = byId('profileStatus');
    let isSwitching = false;

    if (!profileSelect || !profileNameInput || !createBtn || !renameBtn || !deleteBtn || !activeBadge || !statusEl) {
        return;
    }

    const profileControls = [
        profileSelect,
        profileNameInput,
        createBtn,
        renameBtn,
        deleteBtn,
        saveBtn
    ];
    initProfileIndexLifecycle();
    const bootstrapResult = getLastProfileBootstrapResult();
    if (bootstrapResult?.action === 'recovery' && bootstrapResult.recovery) {
        renderProfileRecovery({
            statusEl,
            recovery: bootstrapResult.recovery,
            controls: profileControls
        });
        return;
    }

    const refresh = () => {
        const activeId = getCurrentProfileId();
        renderProfiles(profileSelect, activeId);
        updateActiveBadge(activeBadge, activeId);
    };

    refresh();

    profileSelect.addEventListener('change', () => {
        const selectedId = profileSelect.value;
        if (!selectedId) return;
        if (isSwitching) return;
        isSwitching = true;
        try {
            const ok = switchProfile(selectedId);
            isSwitching = false;
            if (ok) {
                refresh();
                setStatus(statusEl, 'Profil gewechselt und geladen.', 'ok');
            } else {
                setStatus(statusEl, 'Profil konnte nicht geladen werden.', 'error');
            }
        } catch (error) {
            isSwitching = false;
            const recovery = getProfileRecoveryFromError(error);
            if (recovery) {
                renderProfileRecovery({
                    statusEl,
                    recovery,
                    controls: profileControls
                });
                return;
            }
            setStatus(statusEl, `Profil konnte nicht geladen werden. ${error?.message || ''}`.trim(), 'error');
        }
    });

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            try {
                const ok = saveCurrentProfileFromLocalStorage();
                if (ok) {
                    refresh();
                    setStatus(statusEl, 'Aktuelles Profil gespeichert.', 'ok');
                } else {
                    setStatus(statusEl, 'Speichern fehlgeschlagen.', 'error');
                }
            } catch (error) {
                const recovery = getProfileRecoveryFromError(error);
                if (recovery) {
                    renderProfileRecovery({
                        statusEl,
                        recovery,
                        controls: profileControls
                    });
                    return;
                }
                setStatus(statusEl, `Speichern fehlgeschlagen. ${error?.message || ''}`.trim(), 'error');
            }
        });
    }

    createBtn.addEventListener('click', () => {
        const name = profileNameInput.value.trim();
        if (!name) {
            setStatus(statusEl, 'Bitte einen Profilnamen eingeben.', 'error');
            return;
        }
        const meta = createProfile(name);
        switchProfile(meta.id);
        profileNameInput.value = '';
        refresh();
        setStatus(statusEl, 'Neues Profil erstellt und aktiviert.', 'ok');
    });

    renameBtn.addEventListener('click', () => {
        const name = profileNameInput.value.trim();
        if (!name) {
            setStatus(statusEl, 'Bitte neuen Namen eingeben.', 'error');
            return;
        }
        const activeId = getCurrentProfileId();
        const meta = renameProfile(activeId, name);
        profileNameInput.value = '';
        refresh();
        if (meta) {
            setStatus(statusEl, 'Profil umbenannt.', 'ok');
        } else {
            setStatus(statusEl, 'Umbenennen fehlgeschlagen.', 'error');
        }
    });

    deleteBtn.addEventListener('click', () => {
        const selectedId = profileSelect.value;
        if (!selectedId) return;
        if (selectedId === 'default') {
            const profiles = listProfiles();
            if (profiles.length <= 1) {
                setStatus(statusEl, 'Default-Profil kann nicht geloescht werden, solange keine anderen Profile existieren.', 'error');
                return;
            }
        }
        const name = getProfileMeta(selectedId)?.name || selectedId;
        if (!confirm(`Profil "${name}" wirklich loeschen? Dies kann nicht rueckgaengig gemacht werden.`)) {
            return;
        }
        const ok = deleteProfile(selectedId);
        if (ok) {
            refresh();
            setStatus(statusEl, 'Profil geloescht.', 'ok');
        } else {
            setStatus(statusEl, 'Loeschen fehlgeschlagen.', 'error');
        }
    });
});
