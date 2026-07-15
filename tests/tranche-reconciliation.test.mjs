import {
    commitTrancheReconciliation,
    previewTrancheReconciliation,
    readReconciliationHistory,
    TrancheReconciliationError
} from '../app/tranches/tranche-reconciliation.js';

console.log('--- Tranche Reconciliation Tests ---');

const PROFILE_ID = 'profile-a';

function createLot(overrides = {}) {
    return {
        schemaVersion: 1,
        trancheId: 'lot-a',
        name: 'Synthetischer ETF',
        isin: 'DE000TEST001',
        ticker: 'TEST.DE',
        shares: 10,
        purchasePrice: 80,
        currentPrice: 120,
        purchaseDate: '2020-01-02',
        category: 'equity',
        type: 'aktien_neu',
        tqf: 0.3,
        notes: '',
        ...overrides
    };
}

function createRegistry(tranches, extra = {}) {
    const raw = JSON.stringify(tranches);
    return {
        version: 1,
        profiles: {
            [PROFILE_ID]: {
                meta: { id: PROFILE_ID, name: 'Profil A' },
                data: { depot_tranchen: raw }
            },
            'profile-b': {
                meta: { id: 'profile-b', name: 'Profil B' },
                data: { depot_tranchen: '[]' }
            }
        },
        ...extra
    };
}

function createAction(overrides = {}) {
    return {
        actionId: 'broker-order-2026-001',
        profileId: PROFILE_ID,
        trancheId: 'lot-a',
        executedAt: '2026-07-14',
        sharesSold: 4,
        grossProceeds: 510,
        fees: 10,
        recommendation: {
            sharesSold: 3.5,
            grossProceeds: 480
        },
        ...overrides
    };
}

function createStorage(tranches, registry = createRegistry(tranches)) {
    const records = new Map([
        ['depot_tranchen', JSON.stringify(tranches)],
        ['rs_profiles_v1', JSON.stringify(registry)],
        ['rs_current_profile', PROFILE_ID],
        ['rs_active_profile', PROFILE_ID]
    ]);
    return {
        records,
        getItem: key => records.has(String(key)) ? records.get(String(key)) : null,
        setItem: (key, value) => records.set(String(key), String(value)),
        removeItem: key => records.delete(String(key))
    };
}

function createCommitOptions(storage, controls = {}) {
    return {
        storage,
        getCurrentProfileId: () => controls.currentProfileId || PROFILE_ID,
        getActiveProfileId: () => controls.activeProfileId || PROFILE_ID,
        saveCurrentProfile: () => {
            controls.saveCalls = (controls.saveCalls || 0) + 1;
            const registry = JSON.parse(storage.getItem('rs_profiles_v1'));
            registry.profiles[PROFILE_ID].data.depot_tranchen = storage.getItem('depot_tranchen');
            storage.setItem('rs_profiles_v1', JSON.stringify(registry));
            return controls.saveResult !== false;
        },
        flush: async () => {
            controls.flushCalls = (controls.flushCalls || 0) + 1;
            if (controls.failFlush) throw new Error('simulated flush failure');
            return true;
        },
        clock: () => '2026-07-14T12:00:00.000Z'
    };
}

async function expectCode(run, expectedCode, message) {
    let error = null;
    try {
        await run();
    } catch (cause) {
        error = cause;
    }
    assert(error instanceof TrancheReconciliationError, `${message}: strukturierter Reconcile-Fehler erwartet`);
    assertEqual(error.code, expectedCode, message);
    return error;
}

console.log('Test 1: partial-sale preview is pure and shows actual and recommended deviations');
{
    const tranches = [createLot()];
    const original = JSON.stringify(tranches);
    const preview = previewTrancheReconciliation({
        profileId: PROFILE_ID,
        tranches,
        action: createAction(),
        registry: createRegistry(tranches)
    });

    assertEqual(preview.status, 'ready', 'Neue Ausführung ist bestätigungsbereit');
    assertEqual(preview.before.shares, 10, 'Vorschau zeigt alten Stückbestand');
    assertEqual(preview.before.marketValue, 1200, 'Vorschau zeigt alten Marktwert');
    assertEqual(preview.before.costBasis, 800, 'Vorschau zeigt alte Einstandskosten');
    assertEqual(preview.after.shares, 6, 'Teilverkauf reduziert Stückzahl proportional');
    assertEqual(preview.after.marketValue, 720, 'Teilverkauf reduziert Marktwert proportional');
    assertEqual(preview.after.costBasis, 480, 'Teilverkauf reduziert Einstandskosten proportional');
    assertEqual(preview.execution.netProceeds, 500, 'Vorschau zeigt tatsächlichen Nettoerlös');
    assertEqual(preview.deviation.sharesSold, 0.5, 'Abweichung zur empfohlenen Stückzahl bleibt explizit');
    assertEqual(preview.deviation.grossProceeds, 30, 'Abweichung zum empfohlenen Erlös bleibt explizit');
    assertEqual(JSON.stringify(tranches), original, 'Vorschau/Abbruch mutiert den Realbestand nicht');
}
console.log('✓ pure partial preview OK');

console.log('Test 2: full sale removes exactly the selected lot without negative values');
{
    const other = createLot({ trancheId: 'lot-b', shares: 2 });
    const preview = previewTrancheReconciliation({
        profileId: PROFILE_ID,
        tranches: [createLot(), other],
        action: createAction({ sharesSold: 10, grossProceeds: 1200, fees: 0, recommendation: null }),
        registry: createRegistry([createLot(), other])
    });
    assertEqual(preview.after, null, 'Vollverkauf entfernt die Zieltranche');
    assertEqual(preview.nextTranches.length, 1, 'Andere Lots bleiben erhalten');
    assertEqual(preview.nextTranches[0].trancheId, 'lot-b', 'Tranche wird ausschließlich über exakte ID gewählt');
    assertEqual(preview.auditRecord.result.remainingShares, 0, 'Audit enthält keinen negativen Restbestand');
}
console.log('✓ full-sale contract OK');

console.log('Test 3: unknown lots, excessive shares and wrong profile fail closed');
{
    const tranches = [createLot()];
    const registry = createRegistry(tranches);
    await expectCode(
        () => previewTrancheReconciliation({
            profileId: PROFILE_ID,
            tranches,
            action: createAction({ trancheId: 'missing' }),
            registry
        }),
        'RECONCILIATION_TRANCHE_UNKNOWN',
        'Gelöschte/unbekannte Tranche wird abgewiesen'
    );
    await expectCode(
        () => previewTrancheReconciliation({
            profileId: PROFILE_ID,
            tranches,
            action: createAction({ sharesSold: 10.1 }),
            registry
        }),
        'RECONCILIATION_SHARES_EXCEED_HOLDING',
        'Überverkauf wird abgewiesen'
    );
    await expectCode(
        () => previewTrancheReconciliation({
            profileId: PROFILE_ID,
            tranches,
            action: createAction({ profileId: 'profile-b' }),
            registry
        }),
        'RECONCILIATION_PROFILE_MISMATCH',
        'Falsche Profil-ID wird abgewiesen'
    );
}
console.log('✓ fail-closed identity checks OK');

console.log('Test 4: the same actionId is idempotent, conflicting reuse is rejected');
{
    const initial = [createLot()];
    const first = previewTrancheReconciliation({
        profileId: PROFILE_ID,
        tranches: initial,
        action: createAction(),
        registry: createRegistry(initial)
    });
    const registry = createRegistry(first.nextTranches, {
        trancheReconciliation: {
            schemaVersion: 1,
            actions: [{ ...first.auditRecord, reconciledAt: '2026-07-14T12:00:00.000Z' }]
        }
    });
    const duplicate = previewTrancheReconciliation({
        profileId: PROFILE_ID,
        tranches: first.nextTranches,
        action: createAction(),
        registry
    });
    assertEqual(duplicate.status, 'duplicate', 'Identische actionId und Ausführung ist ein No-op');
    assertEqual(duplicate.nextTranches[0].shares, 6, 'Doppelte Aktion reduziert den Bestand nicht erneut');
    await expectCode(
        () => previewTrancheReconciliation({
            profileId: PROFILE_ID,
            tranches: first.nextTranches,
            action: createAction({ grossProceeds: 511 }),
            registry
        }),
        'RECONCILIATION_ACTION_CONFLICT',
        'Wiederverwendete actionId mit anderen Daten wird blockiert'
    );
}
console.log('✓ actionId idempotency OK');

console.log('Test 5: confirmed execution persists live lot, profile lot and minimal audit together');
{
    const initial = [createLot()];
    const storage = createStorage(initial);
    const controls = {};
    const result = await commitTrancheReconciliation({
        profileId: PROFILE_ID,
        action: createAction(),
        expectedTranchesRaw: storage.getItem('depot_tranchen')
    }, createCommitOptions(storage, controls));

    assertEqual(result.status, 'applied', 'Bestätigung wird dauerhaft angewendet');
    assertEqual(JSON.parse(storage.getItem('depot_tranchen'))[0].shares, 6, 'Live-Bestand ist reduziert');
    const registry = JSON.parse(storage.getItem('rs_profiles_v1'));
    assertEqual(JSON.parse(registry.profiles[PROFILE_ID].data.depot_tranchen)[0].shares, 6, 'Profilbestand ist im selben Commit reduziert');
    const history = readReconciliationHistory(registry);
    assertEqual(history.length, 1, 'Idempotenz-/Audit-Eintrag ist dauerhaft vorhanden');
    assertEqual(history[0].actionId, 'broker-order-2026-001', 'Stabile actionId bleibt erhalten');
    assertEqual(controls.flushCalls, 1, 'Bestand und Audit werden mit genau einem Flush bestätigt');
    const serializedAudit = JSON.stringify(history[0]);
    assert(!serializedAudit.includes('Synthetischer ETF'), 'Audit enthält keinen Tranchennamen');
    assert(!serializedAudit.includes('DE000TEST001') && !serializedAudit.includes('TEST.DE'), 'Audit enthält keine unnötigen Instrumentdaten');

    const duplicate = await commitTrancheReconciliation({
        profileId: PROFILE_ID,
        action: createAction(),
        expectedTranchesRaw: storage.getItem('depot_tranchen')
    }, createCommitOptions(storage, controls));
    assertEqual(duplicate.status, 'duplicate', 'Erneutes Einspielen bleibt nach Reload idempotent');
    assertEqual(JSON.parse(storage.getItem('depot_tranchen'))[0].shares, 6, 'Reload-Duplikat schreibt nicht doppelt');
    assertEqual(controls.flushCalls, 1, 'Duplikat benötigt keinen weiteren Flush');
}
console.log('✓ atomic applied/duplicate persistence OK');

console.log('Test 6: flush rejection restores the confirmed state and remains retryable');
{
    const initial = [createLot()];
    const storage = createStorage(initial);
    const confirmedTranchesRaw = storage.getItem('depot_tranchen');
    const confirmedRegistryRaw = storage.getItem('rs_profiles_v1');
    const controls = { failFlush: true };
    const error = await expectCode(
        () => commitTrancheReconciliation({
            profileId: PROFILE_ID,
            action: createAction(),
            expectedTranchesRaw: confirmedTranchesRaw
        }, createCommitOptions(storage, controls)),
        'RECONCILIATION_PERSISTENCE_FAILED',
        'Flush-Rejection wird sichtbar und strukturiert'
    );
    assertEqual(error.retryable, true, 'Flushfehler ist retryfähig');
    assertEqual(storage.getItem('depot_tranchen'), confirmedTranchesRaw, 'Live-Bestand wird auf bestätigten Stand zurückgesetzt');
    assertEqual(storage.getItem('rs_profiles_v1'), confirmedRegistryRaw, 'Profil/Audit werden auf bestätigten Stand zurückgesetzt');

    controls.failFlush = false;
    const retried = await commitTrancheReconciliation({
        profileId: PROFILE_ID,
        action: createAction(),
        expectedTranchesRaw: confirmedTranchesRaw
    }, createCommitOptions(storage, controls));
    assertEqual(retried.status, 'applied', 'Dieselbe bestätigte Aktion kann nach Flushfehler wiederholt werden');
    assertEqual(JSON.parse(storage.getItem('depot_tranchen'))[0].shares, 6, 'Retry wendet die Aktion genau einmal an');
}
console.log('✓ flush recovery/retry OK');

console.log('Test 7: stale previews and parallel profile context changes write nothing');
{
    const initial = [createLot()];
    const storage = createStorage(initial);
    const beforeTranches = storage.getItem('depot_tranchen');
    const beforeRegistry = storage.getItem('rs_profiles_v1');
    const controls = { activeProfileId: 'profile-b' };
    await expectCode(
        () => commitTrancheReconciliation({
            profileId: PROFILE_ID,
            action: createAction(),
            expectedTranchesRaw: beforeTranches
        }, createCommitOptions(storage, controls)),
        'RECONCILIATION_PROFILE_CONTEXT_CHANGED',
        'Parallel geöffneter anderer Profilkontext wird blockiert'
    );
    assertEqual(storage.getItem('depot_tranchen'), beforeTranches, 'Profilkonflikt mutiert keine Lots');
    assertEqual(storage.getItem('rs_profiles_v1'), beforeRegistry, 'Profilkonflikt mutiert keinen Auditverlauf');

    controls.activeProfileId = PROFILE_ID;
    await expectCode(
        () => commitTrancheReconciliation({
            profileId: PROFILE_ID,
            action: createAction(),
            expectedTranchesRaw: '[]'
        }, createCommitOptions(storage, controls)),
        'RECONCILIATION_PREVIEW_STALE',
        'Veraltete Vorschau wird vor dem Schreiben blockiert'
    );
    assertEqual(controls.saveCalls || 0, 0, 'Stale-/Tab-Gates rufen keinen Writer auf');
}
console.log('✓ stale/two-profile write gate OK');

console.log('--- Tranche Reconciliation Tests Completed ---');
