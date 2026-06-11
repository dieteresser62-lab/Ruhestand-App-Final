import { CONFIG } from '../app/balance/balance-config.js';
import {
    LEGACY_MIGRATION_MARKER_KEYS,
    isAllowedSnapshotCaptureKey,
    isAllowedSnapshotRestoreLiveKey,
    isLegacySnapshotKey,
    isProfileRegistryKey,
    isProfileScopedFixedKey,
    isSnapshotGlobalDomainKey,
    isSnapshotProfileScopedKey,
    isSnapshotTechnicalKey
} from '../app/shared/persistence-key-policy.js';
import { PROFILE_STORAGE_KEYS } from '../app/profile/profile-state.js';

console.log('--- Snapshot Key Policy Tests ---');

const registry = {
    profiles: {
        default: { meta: { name: 'Default' }, data: {} }
    }
};

console.log('Test 1: capture includes fachliche Live-Daten and excludes snapshot archive data');
{
    assert(isAllowedSnapshotCaptureKey(CONFIG.STORAGE.LS_KEY), 'Capture erlaubt Balance-State');
    assert(isAllowedSnapshotCaptureKey('depot_tranchen'), 'Capture erlaubt Tranchen');
    assert(isAllowedSnapshotCaptureKey('balance_expenses_2026'), 'Capture erlaubt Ausgaben-Rollover-Daten');
    assert(isAllowedSnapshotCaptureKey(PROFILE_STORAGE_KEYS.registry), 'Capture erlaubt Profil-Registry');
    assert(isAllowedSnapshotCaptureKey(PROFILE_STORAGE_KEYS.current), 'Capture erlaubt aktuelles Profil');
    assert(isAllowedSnapshotCaptureKey(LEGACY_MIGRATION_MARKER_KEYS.target), 'Capture erlaubt Schema-Migrationsmarker');
    assert(!isAllowedSnapshotCaptureKey(`${CONFIG.STORAGE.SNAPSHOT_PREFIX}2026`), 'Capture schliesst Legacy-Snapshot-Keys aus');
    assert(!isAllowedSnapshotCaptureKey('featureFlags'), 'Capture schliesst technische Feature-Flags aus');
    assert(!isAllowedSnapshotCaptureKey('telemetry_lastRun'), 'Capture schliesst technische Telemetry-Keys aus');
}

console.log('Test 2: key categories are explicit and non-overlapping for important keys');
{
    assert(isLegacySnapshotKey(`${CONFIG.STORAGE.SNAPSHOT_PREFIX}abc`), 'Legacy-Snapshot-Key wird erkannt');
    assert(isProfileRegistryKey(PROFILE_STORAGE_KEYS.registry), 'Profil-Registry-Key wird erkannt');
    assert(isProfileScopedFixedKey('depot_tranchen'), 'Fester profilbezogener Key wird erkannt');
    assert(isSnapshotProfileScopedKey('profile_tagesgeld'), 'Profilbezogener Snapshot-Key wird erkannt');
    assert(isSnapshotGlobalDomainKey(CONFIG.STORAGE.LS_KEY), 'Globaler fachlicher Balance-Key wird erkannt');
    assert(isSnapshotTechnicalKey('featureFlags'), 'Feature-Flags sind technisch');
    assert(isSnapshotTechnicalKey('layout_balance_sidebar'), 'Layout-Key ist technisch');
    assert(!isSnapshotGlobalDomainKey('featureFlags'), 'Technischer Key ist kein globaler Fach-Key');
}

console.log('Test 3: standard restore preserves profile registry and requires existing profile id');
{
    assert(!isAllowedSnapshotRestoreLiveKey(PROFILE_STORAGE_KEYS.registry, {
        mode: 'standard',
        snapshotActiveProfileId: 'default',
        currentRegistry: registry
    }), 'Standard-Restore schreibt Profil-Registry nicht blind zurueck');

    assert(isAllowedSnapshotRestoreLiveKey('depot_tranchen', {
        mode: 'standard',
        snapshotActiveProfileId: 'default',
        currentRegistry: registry
    }), 'Standard-Restore erlaubt Profil-Live-Key bei existierender Profil-ID');

    assert(!isAllowedSnapshotRestoreLiveKey('depot_tranchen', {
        mode: 'standard',
        snapshotActiveProfileId: 'missing',
        currentRegistry: registry
    }), 'Standard-Restore blockiert Profil-Live-Key bei fehlender Profil-ID');

    assert(isAllowedSnapshotRestoreLiveKey(CONFIG.STORAGE.LS_KEY, {
        mode: 'standard',
        snapshotActiveProfileId: 'missing',
        currentRegistry: registry
    }), 'Standard-Restore erlaubt globale fachliche Keys unabhaengig vom Profil');
}

console.log('Test 4: restore keeps technical keys and legacy snapshot history untouched');
{
    assert(!isAllowedSnapshotRestoreLiveKey('featureFlags', {
        mode: 'standard',
        snapshotActiveProfileId: 'default',
        currentRegistry: registry
    }), 'Restore erhaelt technische Feature-Flags');
    assert(!isAllowedSnapshotRestoreLiveKey('ui_panel_state', {
        mode: 'standard',
        snapshotActiveProfileId: 'default',
        currentRegistry: registry
    }), 'Restore erhaelt technischen UI-Zustand');
    assert(!isAllowedSnapshotRestoreLiveKey(`${CONFIG.STORAGE.SNAPSHOT_PREFIX}old`, {
        mode: 'standard',
        snapshotActiveProfileId: 'default',
        currentRegistry: registry
    }), 'Restore loescht oder ueberschreibt keine Legacy-Snapshot-Historie');
}

console.log('Test 5: full restore is explicit and still excludes technical keys');
{
    assert(isAllowedSnapshotRestoreLiveKey(PROFILE_STORAGE_KEYS.registry, {
        mode: 'full',
        snapshotActiveProfileId: 'default',
        currentRegistry: registry
    }), 'Full-Restore darf Profil-Registry explizit schreiben');
    assert(!isAllowedSnapshotRestoreLiveKey('enableWorkerTelemetry', {
        mode: 'full',
        snapshotActiveProfileId: 'default',
        currentRegistry: registry
    }), 'Full-Restore schreibt technische Telemetry-Schalter nicht automatisch');
}

console.log('--- Snapshot Key Policy Tests Completed ---');
