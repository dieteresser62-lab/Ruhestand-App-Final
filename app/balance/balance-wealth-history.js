// @ts-check

import { CONFIG } from './balance-config.js';
import { StorageManager } from './balance-storage.js';
import { PersistenceFacade, persistenceStorage } from '../shared/persistence-facade.js';
import { PROFILE_STORAGE_KEYS } from '../profile/profile-state.js';
import { getProfileRegistry } from '../profile/profile-registry.js';
import { BALANCE_UPDATE_MODE } from './balance-update-pipeline.js';
import {
    createAnnualWealthHistoryEntry,
    createManualWealthHistoryEntry,
    readWealthHistory,
    upsertAnnualWealthHistory,
    upsertManualWealthHistory,
    formatLocalWealthHistoryDate
} from '../../types/wealth-history-contract.js';

const coordinators = new WeakMap();

/** Gemeinsame Sperre auch für mehrere Dienstinstanzen mit derselben Persistenz. */
export function createBalanceWealthHistoryService({
    storage = persistenceStorage,
    persistence = PersistenceFacade,
    loadState = () => StorageManager.loadState(),
    loadRegistry = () => getProfileRegistry(storage)
} = {}) {
    if (!coordinators.has(storage)) coordinators.set(storage, { tail: Promise.resolve(), annual: 0 });
    const coordinator = coordinators.get(storage);
    const stateKey = CONFIG.STORAGE.LS_KEY;
    const registryKey = PROFILE_STORAGE_KEYS.registry;

    function captureContext() {
        const current = storage.getItem(PROFILE_STORAGE_KEYS.current);
        const active = storage.getItem(PROFILE_STORAGE_KEYS.active);
        if (!current || active !== current || !loadRegistry().profiles[current]) {
            throw new Error('Die Verlaufserfassung benötigt ein eindeutiges aktives Profil.');
        }
        return { current, active };
    }

    function assertContext(context) {
        if (storage.getItem(PROFILE_STORAGE_KEYS.current) !== context.current
            || storage.getItem(PROFILE_STORAGE_KEYS.active) !== context.active) {
            throw new Error('Das Profil wurde während der Verlaufserfassung gewechselt.');
        }
    }

    function enqueue(operation) {
        const result = coordinator.tail.then(operation);
        coordinator.tail = result.catch(() => {});
        return result;
    }

    async function persistEntry({ context, entry, metadata, expectedPending, validateSource = () => {} }) {
        assertContext(context);
        validateSource();
        await persistence.flush();
        assertContext(context);
        validateSource();
        // Erst nach dem Warten lesen: keine Historie aus einem veralteten Candidate übernehmen.
        const state = loadState();
        const history = readWealthHistory(state);
        if (entry.reason === 'manual' && state.annualPeriodMetadata?.pendingCommit) {
            throw new Error('Vor einer manuellen Erfassung muss der Jahresabschluss wiederhergestellt werden.');
        }
        if (expectedPending && JSON.stringify(state.annualPeriodMetadata) !== JSON.stringify(expectedPending)) {
            throw new Error('Der ausstehende Jahresabschluss wurde während der Erfassung verändert.');
        }
        const registry = loadRegistry();
        if (!registry.profiles[context.current]) throw new Error('Das erfasste Profil existiert nicht mehr.');
        const nextState = {
            ...state,
            wealthHistory: entry.reason === 'manual'
                ? upsertManualWealthHistory(history, entry)
                : upsertAnnualWealthHistory(history, entry),
            ...(metadata ? { annualPeriodMetadata: metadata } : {})
        };
        const serialized = JSON.stringify(nextState);
        const nextRegistry = {
            ...registry,
            profiles: {
                ...registry.profiles,
                [context.current]: {
                    ...registry.profiles[context.current],
                    data: { ...registry.profiles[context.current].data, [stateKey]: serialized }
                }
            }
        };
        const records = { [stateKey]: serialized, [registryKey]: JSON.stringify(nextRegistry) };
        const previous = { [stateKey]: storage.getItem(stateKey), [registryKey]: storage.getItem(registryKey) };
        // Die Facade wartet intern erneut. Ihre Key-Prüfung prüft deshalb auch unmittelbar
        // vor dem Replace den Kontext und die beiden betroffenen Cache-Records.
        const allowKey = key => {
            assertContext(context);
            validateSource({ state: nextState, registry: nextRegistry });
            for (const affected of [stateKey, registryKey]) {
                const raw = storage.getItem(affected);
                if (raw !== previous[affected] && raw !== records[affected]) {
                    throw new Error('Der Balance-Zustand wurde während der Verlaufsschreibung verändert.');
                }
            }
            return key === stateKey || key === registryKey;
        };
        await persistence.replaceRecordsTransactional(records, {
            allowKey,
            postValidate: confirmed => {
                assertContext(context);
                validateSource({ state: nextState, registry: nextRegistry });
                if (confirmed[stateKey] !== serialized || confirmed[registryKey] !== records[registryKey]) {
                    throw new Error('Der Vermögensverlauf konnte nicht dauerhaft bestätigt werden.');
                }
                return true;
            }
        });
        assertContext(context);
        return nextState;
    }

    return {
        captureContext,
        assertContext,
        assertManualReady() {
            if (coordinator.annual) throw new Error('Der Jahresabschluss läuft bereits.');
            if (loadState().annualPeriodMetadata?.pendingCommit) {
                throw new Error('Vor einer manuellen Erfassung muss der Jahresabschluss wiederhergestellt werden.');
            }
        },
        runAnnual(operation) {
            const context = captureContext();
            coordinator.annual += 1;
            return enqueue(() => {
                assertContext(context);
                return operation(context);
            }).finally(() => { coordinator.annual -= 1; });
        },
        // Wird ausschließlich innerhalb von runAnnual aufgerufen; kein zweiter Engine-Commit.
        finalizeAnnual({ context, result, targetYear, metadata, expectedPending }) {
            if (!result?.ok) throw result?.error || new Error('Der Balance-Periodencommit ist fehlgeschlagen.');
            const entry = createAnnualWealthHistoryEntry(result.inputData, targetYear);
            return persistEntry({ context, entry, metadata, expectedPending });
        },
        captureManual({ result, asOf, context = captureContext(), validateSource }) {
            if (coordinator.annual) return Promise.reject(new Error('Der Jahresabschluss läuft bereits.'));
            assertContext(context);
            if (!result?.ok) return Promise.reject(result?.error || new Error('Aktuelle gültige Balance-Eingaben fehlen.'));
            const entry = createManualWealthHistoryEntry(result.inputData, asOf);
            return enqueue(() => persistEntry({ context, entry, validateSource }));
        }
    };
}

/** Beide unterjährigen Auslöser lesen genau dieselbe frische PREVIEW. */
export function previewWealthHistory({ service, update, context }) {
    service.assertContext(context);
    const result = update({ mode: BALANCE_UPDATE_MODE.PREVIEW });
    service.assertContext(context);
    if (!result?.ok) throw result?.error || new Error('Aktuelle gültige Balance-Eingaben fehlen.');
    return result;
}

/** UI-Koordination hält Klickdatum und frische Vorschau vor dem ersten Warten fest. */
export function createManualWealthHistoryController({ service, update, refresh, button, status,
    annualButtons = [], now = () => new Date(), toast = () => {} }) {
    let manualBusy = false;
    let annualBusy = 0;
    const syncControls = () => {
        if (button) button.disabled = manualBusy || annualBusy > 0;
        annualButtons.forEach(control => { if (control) control.disabled = manualBusy || annualBusy > 0; });
    };
    const message = text => { if (status) status.textContent = text; };
    return {
        async capture() {
            if (manualBusy || annualBusy) return { status: 'in_flight' };
            manualBusy = true;
            syncControls();
            message('Stand wird geprüft und gespeichert …');
            try {
                const asOf = formatLocalWealthHistoryDate(now());
                const context = service.captureContext();
                const result = previewWealthHistory({ service, update, context });
                await service.captureManual({ result, asOf, context });
                service.assertContext(context);
                refresh();
                message('Stand gesichert');
                toast('Aktueller Vermögensstand gespeichert.');
                return { status: 'saved' };
            } catch (error) {
                refresh();
                message(`Stand nicht bestätigt: ${error.message || error}`);
                return { status: 'failed', error };
            } finally {
                manualBusy = false;
                syncControls();
            }
        },
        async withAnnual(operation) {
            if (manualBusy) return { status: 'in_flight' };
            annualBusy += 1;
            syncControls();
            message('');
            try { return await operation(); }
            finally {
                annualBusy -= 1;
                refresh();
                syncControls();
            }
        }
    };
}
