// @ts-check

import {
    listProfiles,
    getCurrentProfileId,
    getProfileMeta,
    createProfile,
    renameProfile,
    deleteProfile,
    switchProfile,
    saveCurrentProfileFromLocalStorage
} from './profile-storage.js';
import { initProfileIndexLifecycle } from './profile-navigation.js';
import { init as initPersistence } from '../shared/persistence-facade.js';

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

document.addEventListener('DOMContentLoaded', async () => {
    await initPersistence();
    initProfileIndexLifecycle();

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
        const ok = switchProfile(selectedId);
        isSwitching = false;
        if (ok) {
            refresh();
            setStatus(statusEl, 'Profil gewechselt und geladen.', 'ok');
        } else {
            setStatus(statusEl, 'Profil konnte nicht geladen werden.', 'error');
        }
    });

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const ok = saveCurrentProfileFromLocalStorage();
            if (ok) {
                refresh();
                setStatus(statusEl, 'Aktuelles Profil gespeichert.', 'ok');
            } else {
                setStatus(statusEl, 'Speichern fehlgeschlagen.', 'error');
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
