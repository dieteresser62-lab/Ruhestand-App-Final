// @ts-check

import {
    ensureProfileRegistry,
    listProfiles,
    getCurrentProfileId,
    getProfileMeta,
    createProfile,
    renameProfile,
    deleteProfile,
    switchProfile,
    saveCurrentProfileFromLocalStorage,
    exportProfilesBundle,
    importProfilesBundle
} from './profile-storage.js';

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

document.addEventListener('DOMContentLoaded', () => {
    ensureProfileRegistry();
    saveCurrentProfileFromLocalStorage();

    const profileSelect = byId('profileSelect');
    const profileNameInput = byId('profileNameInput');
    const activateBtn = byId('profileActivateBtn');
    const createBtn = byId('profileCreateBtn');
    const renameBtn = byId('profileRenameBtn');
    const deleteBtn = byId('profileDeleteBtn');
    const saveBtn = byId('profileSaveBtn');
    const exportBtn = byId('profileExportBtn');
    const importBtn = byId('profileImportBtn');
    const importFile = byId('profileImportFile');
    const activeBadge = byId('activeProfileBadge');
    const statusEl = byId('profileStatus');
    let isSwitching = false;

    if (!profileSelect || !profileNameInput || !activateBtn || !createBtn || !renameBtn || !deleteBtn || !saveBtn || !exportBtn || !importBtn || !importFile || !activeBadge || !statusEl) {
        return;
    }

    const refresh = () => {
        const activeId = getCurrentProfileId();
        renderProfiles(profileSelect, activeId);
        updateActiveBadge(activeBadge, activeId);
    };

    refresh();

    activateBtn.addEventListener('click', () => {
        const selectedId = profileSelect.value;
        if (!selectedId) return;
        if (isSwitching) return;
        isSwitching = true;
        const ok = switchProfile(selectedId);
        isSwitching = false;
        if (ok) {
            refresh();
            setStatus(statusEl, 'Profil aktiviert und geladen.', 'ok');
        } else {
            setStatus(statusEl, 'Profil konnte nicht geladen werden.', 'error');
        }
    });

    saveBtn.addEventListener('click', () => {
        const ok = saveCurrentProfileFromLocalStorage();
        if (ok) {
            refresh();
            setStatus(statusEl, 'Aktuelles Profil gespeichert.', 'ok');
        } else {
            setStatus(statusEl, 'Speichern fehlgeschlagen.', 'error');
        }
    });

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
            setStatus(statusEl, 'Default-Profil kann nicht geloescht werden.', 'error');
            return;
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

    exportBtn.addEventListener('click', () => {
        const bundle = exportProfilesBundle();
        const json = JSON.stringify(bundle, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ruhestand-profiles-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setStatus(statusEl, 'Backup exportiert.', 'ok');
    });

    importBtn.addEventListener('click', () => {
        importFile.value = '';
        importFile.click();
    });

    importFile.addEventListener('change', () => {
        const file = importFile.files && importFile.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const payload = JSON.parse(String(reader.result || ''));
                const result = importProfilesBundle(payload);
                if (!result.ok) {
                    setStatus(statusEl, result.message || 'Import fehlgeschlagen.', 'error');
                    return;
                }
                refresh();
                setStatus(statusEl, 'Backup importiert. Seite ggf. neu laden.', 'ok');
            } catch (err) {
                setStatus(statusEl, `Import fehlgeschlagen: ${err.message}`, 'error');
            }
        };
        reader.readAsText(file);
    });
});
