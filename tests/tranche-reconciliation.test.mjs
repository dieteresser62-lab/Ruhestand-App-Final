import {
    commitCashPostingConfirmation,
    commitCashPostingCorrection,
    commitTrancheReconciliation,
    deriveCashConfirmationActionId,
    deriveCashCorrectionActionId,
    previewCashPostingConfirmation,
    previewCashPostingCorrection,
    previewTrancheReconciliation,
    projectReconciliationCashStatuses,
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

console.log('Test 8: legacy v1 sales remain untouched and project an operational legacy_unknown status');
{
    const initial = [createLot()];
    const preview = previewTrancheReconciliation({
        profileId: PROFILE_ID,
        tranches: initial,
        action: createAction(),
        registry: createRegistry(initial)
    });
    const legacy = JSON.parse(JSON.stringify(preview.auditRecord));
    delete legacy.eventType;
    delete legacy.cashStatus;
    const registry = createRegistry(preview.nextTranches, {
        trancheReconciliation: { schemaVersion: 1, actions: [legacy] }
    });
    const rawBefore = JSON.stringify(registry.trancheReconciliation.actions[0]);
    const history = readReconciliationHistory(registry);
    const statuses = projectReconciliationCashStatuses(registry, PROFILE_ID);

    assertEqual(history[0].eventType, 'sale_reconciled', 'Legacy-Verkauf wird nur im Leser als Verkauf projiziert');
    assertEqual(history[0].cashStatus, 'legacy_unknown', 'Legacy-Verkauf erhält keinen erfundenen Cashnachweis');
    assertEqual(statuses[0].operationallyComplete, true, 'Legacy-Verkauf blockiert den laufenden Workflow nicht');
    assertEqual(statuses[0].isPending, false, 'Legacy-Verkauf erscheint nicht als offener Rückstand');
    assertEqual(statuses[0].canConfirm, true, 'Freiwillige spätere Nachbestätigung bleibt möglich');
    assertEqual(JSON.stringify(registry.trancheReconciliation.actions[0]), rawBefore, 'Lesen schreibt den Legacy-Record nicht um');
}
console.log('✓ legacy projection contract OK');

console.log('Test 9: pending sale, confirmation and corrections form one append-only linear chain');
{
    const initial = [createLot()];
    const salePreview = previewTrancheReconciliation({
        profileId: PROFILE_ID,
        tranches: initial,
        action: createAction(),
        registry: createRegistry(initial)
    });
    const saleRecord = { ...salePreview.auditRecord, reconciledAt: '2026-07-14T12:00:00.000Z' };
    const registry = createRegistry(salePreview.nextTranches, {
        trancheReconciliation: { schemaVersion: 1, actions: [saleRecord] }
    });
    const confirmation = previewCashPostingConfirmation({
        profileId: PROFILE_ID,
        targetActionId: saleRecord.actionId,
        cashBalanceAfterPostingEur: 12500.25,
        confirmedAt: '2026-07-15T08:00:00.000Z',
        registry
    });
    assertEqual(confirmation.status, 'ready', 'Offener Verkauf kann manuell abgeschlossen werden');
    assertEqual(confirmation.auditRecord.actionId, confirmation.auditRecord.confirmationActionId,
        'Abschluss verwendet dieselbe globale und fachliche Action-ID');
    assertEqual(confirmation.auditRecord.confirmedNetProceedsEur, 500,
        'Abschluss kopiert den Nettoerlös unverändert aus dem Verkauf');
    registry.trancheReconciliation.actions.push(confirmation.auditRecord);

    const confirmationDuplicate = previewCashPostingConfirmation({
        profileId: PROFILE_ID,
        targetActionId: saleRecord.actionId,
        cashBalanceAfterPostingEur: 12500.25,
        confirmedAt: '2026-07-15T08:00:05.000Z',
        registry
    });
    assertEqual(confirmationDuplicate.status, 'duplicate', 'Semantisch gleicher Abschluss bleibt trotz neu erzeugtem Zeitstempel idempotent');
    assertEqual(confirmationDuplicate.auditRecord.confirmedAt, '2026-07-15T08:00:00.000Z',
        'Idempotenter Abschluss bewahrt den zuerst gespeicherten Nachweiszeitpunkt');
    await expectCode(
        () => previewCashPostingConfirmation({
            profileId: PROFILE_ID,
            targetActionId: saleRecord.actionId,
            cashBalanceAfterPostingEur: 12501.25,
            confirmedAt: '2026-07-15T08:00:00.000Z',
            registry
        }),
        'RECONCILIATION_ACTION_CONFLICT',
        'Gleiche Abschluss-ID mit anderem Cashstand wird blockiert'
    );

    const correction1 = previewCashPostingCorrection({
        profileId: PROFILE_ID,
        targetActionId: saleRecord.actionId,
        cashBalanceAfterPostingEur: 12490.25,
        correctionReason: 'Übertragungsfehler korrigiert',
        correctedAt: '2026-07-15T09:00:00.000Z',
        registry
    });
    assertEqual(correction1.auditRecord.correctionRevision, 1, 'Erste Korrektur beginnt bei Revision 1');
    assertEqual(correction1.auditRecord.correctsActionId, confirmation.auditRecord.actionId,
        'Erste Korrektur verweist auf den wirksamen Abschluss');
    registry.trancheReconciliation.actions.push(correction1.auditRecord);
    const correctionDuplicate = previewCashPostingCorrection({
        profileId: PROFILE_ID,
        targetActionId: saleRecord.actionId,
        cashBalanceAfterPostingEur: 12490.25,
        correctionReason: 'Übertragungsfehler korrigiert',
        correctionRevision: 1,
        correctionActionId: correction1.auditRecord.actionId,
        actionId: correction1.auditRecord.actionId,
        correctsActionId: confirmation.auditRecord.actionId,
        correctedAt: '2026-07-15T09:00:05.000Z',
        registry
    });
    assertEqual(correctionDuplicate.status, 'duplicate',
        'Semantisch gleiche Korrektur bleibt trotz neu erzeugtem Zeitstempel idempotent');
    assertEqual(correctionDuplicate.auditRecord.correctedAt, '2026-07-15T09:00:00.000Z',
        'Idempotente Korrektur bewahrt den zuerst gespeicherten Nachweiszeitpunkt');

    const correction2 = previewCashPostingCorrection({
        profileId: PROFILE_ID,
        targetActionId: saleRecord.actionId,
        cashBalanceAfterPostingEur: 12495.25,
        correctionReason: 'Bankvaluta nachgetragen',
        correctedAt: '2026-07-16T09:00:00.000Z',
        registry
    });
    assertEqual(correction2.auditRecord.correctionRevision, 2, 'Zweite Korrektur erhöht die Revision lückenlos');
    assertEqual(correction2.auditRecord.correctsActionId, correction1.auditRecord.actionId,
        'Zweite Korrektur verweist auf die aktuell wirksame Korrektur');
    registry.trancheReconciliation.actions.push(correction2.auditRecord);

    const status = projectReconciliationCashStatuses(registry, PROFILE_ID)[0];
    assertEqual(status.cashStatus, 'confirmed_corrected', 'Effektive Projektion kennzeichnet die Korrektur');
    assertEqual(status.cashBalanceAfterPostingEur, 12495.25, 'Nur der letzte Cashstand ist effektiv');
    assertEqual(status.correctionRevision, 2, 'Effektive Projektion zeigt die letzte Revision');
    assertEqual(readReconciliationHistory(registry).length, 4, 'Verkauf, Abschluss und beide Korrekturen bleiben im Audit');

    const duplicateSale = previewTrancheReconciliation({
        profileId: PROFILE_ID,
        tranches: salePreview.nextTranches,
        action: createAction({ cashStatus: 'confirmed_already_reflected', cashBalanceAfterPostingEur: 1,
            cashConfirmedAt: '2026-07-20T10:00:00.000Z' }),
        registry
    });
    assertEqual(duplicateSale.status, 'duplicate', 'Cashstatusänderungen verändern die Verkaufsduplikat-Semantik nicht');
}
console.log('✓ append-only confirmation/correction chain OK');

console.log('Test 10: initial confirmation, event-specific lengths and corrupt mixed events fail closed');
{
    const initial = [createLot()];
    const confirmedSale = previewTrancheReconciliation({
        profileId: PROFILE_ID,
        tranches: initial,
        action: createAction({
            cashStatus: 'confirmed_already_reflected',
            cashBalanceAfterPostingEur: 9000,
            cashConfirmedAt: '2026-07-14T12:00:00.000Z'
        }),
        registry: createRegistry(initial)
    });
    assertEqual(confirmedSale.auditRecord.cashStatus, 'confirmed_already_reflected',
        'Initiale Bestätigung wird am Verkaufsrecord gespeichert');
    assertEqual(confirmedSale.auditRecord.cashBalanceAfterPostingEur, 9000,
        'Initial bestätigter Cashstand bleibt im Verkaufsrecord');

    const maxTarget = 'x'.repeat(128);
    assertEqual(deriveCashConfirmationActionId(maxTarget).length, 149,
        '128-Zeichen-Ziel erzeugt exakt 149-Zeichen-Abschluss-ID');
    assertEqual(deriveCashCorrectionActionId(maxTarget, 999999).length, 154,
        'Maximale Revision erzeugt exakt 154-Zeichen-Korrektur-ID');
    await expectCode(
        () => Promise.resolve(deriveCashConfirmationActionId('x'.repeat(129))),
        'RECONCILIATION_ID_INVALID',
        '129-Zeichen-Ziel wird abgewiesen'
    );
    await expectCode(
        () => Promise.resolve(deriveCashCorrectionActionId(maxTarget, 1000000)),
        'RECONCILIATION_CORRECTION_REVISION_INVALID',
        'Revision 1000000 wird abgewiesen'
    );
    await expectCode(
        () => Promise.resolve(previewTrancheReconciliation({
            profileId: PROFILE_ID,
            tranches: initial,
            action: createAction({ actionId: 'cash-confirmation:v1:not-a-sale' }),
            registry: createRegistry(initial)
        })),
        'RECONCILIATION_ACTION_ID_RESERVED',
        'Reservierter Cash-Prefix ist für neue Verkäufe gesperrt'
    );

    const corruptRegistry = createRegistry([], {
        trancheReconciliation: {
            schemaVersion: 1,
            actions: [{ ...confirmedSale.auditRecord, eventType: 'future_event' }]
        }
    });
    await expectCode(
        () => Promise.resolve(readReconciliationHistory(corruptRegistry)),
        'RECONCILIATION_EVENT_TYPE_UNSUPPORTED',
        'Unbekannter Eventtyp blockiert den Leser fail-closed'
    );
}
console.log('✓ mixed-event boundary contract OK');

console.log('Test 11: cash commits persist without lot mutation and exact retry remains idempotent');
{
    const initial = [createLot()];
    const storage = createStorage(initial);
    const controls = {};
    await commitTrancheReconciliation({
        profileId: PROFILE_ID,
        action: createAction(),
        expectedTranchesRaw: storage.getItem('depot_tranchen')
    }, createCommitOptions(storage, controls));
    const lotsAfterSale = storage.getItem('depot_tranchen');
    const confirmationRequest = {
        profileId: PROFILE_ID,
        targetActionId: createAction().actionId,
        cashBalanceAfterPostingEur: 15000,
        confirmedAt: '2026-07-15T08:00:00.000Z',
        expectedRegistryRaw: storage.getItem('rs_profiles_v1')
    };
    const confirmed = await commitCashPostingConfirmation(
        confirmationRequest,
        createCommitOptions(storage, controls)
    );
    assertEqual(confirmed.status, 'applied', 'Cashabschluss wird append-only persistiert');
    assertEqual(storage.getItem('depot_tranchen'), lotsAfterSale, 'Cashabschluss mutiert keine Lots');

    const correctionPreview = previewCashPostingCorrection({
        profileId: PROFILE_ID,
        targetActionId: createAction().actionId,
        cashBalanceAfterPostingEur: 14990,
        correctionReason: 'Zahlendreher',
        correctedAt: '2026-07-15T09:00:00.000Z',
        registry: storage.getItem('rs_profiles_v1')
    });
    const correctionRequest = {
        ...correctionPreview.auditRecord,
        expectedRegistryRaw: storage.getItem('rs_profiles_v1')
    };
    const corrected = await commitCashPostingCorrection(correctionRequest, createCommitOptions(storage, controls));
    assertEqual(corrected.status, 'applied', 'Cashkorrektur wird als drittes Event persistiert');
    const retried = await commitCashPostingCorrection(correctionRequest, createCommitOptions(storage, controls));
    assertEqual(retried.status, 'duplicate', 'Exakter Korrektur-Retry hängt kein weiteres Event an');
    assertEqual(readReconciliationHistory(storage.getItem('rs_profiles_v1')).length, 3,
        'Idempotenter Retry lässt die Auditlänge unverändert');
    assertEqual(storage.getItem('depot_tranchen'), lotsAfterSale, 'Cashkorrektur mutiert keine Lots');
}
console.log('✓ cash persistence and retry contract OK');

console.log('Test 12: correction-chain corruption and global ID collisions fail closed');
{
    const initial = [createLot()];
    const salePreview = previewTrancheReconciliation({
        profileId: PROFILE_ID,
        tranches: initial,
        action: createAction(),
        registry: createRegistry(initial)
    });
    const sale = { ...salePreview.auditRecord, reconciledAt: '2026-07-14T12:00:00.000Z' };
    const baseRegistry = createRegistry(salePreview.nextTranches, {
        trancheReconciliation: { schemaVersion: 1, actions: [sale] }
    });
    const confirmation = previewCashPostingConfirmation({
        profileId: PROFILE_ID,
        targetActionId: sale.actionId,
        cashBalanceAfterPostingEur: 1000,
        confirmedAt: '2026-07-15T08:00:00.000Z',
        registry: baseRegistry
    }).auditRecord;
    const confirmedRegistry = JSON.parse(JSON.stringify(baseRegistry));
    confirmedRegistry.trancheReconciliation.actions.push(confirmation);
    const correction1 = previewCashPostingCorrection({
        profileId: PROFILE_ID,
        targetActionId: sale.actionId,
        cashBalanceAfterPostingEur: 999,
        correctionReason: 'erste Korrektur',
        correctedAt: '2026-07-15T09:00:00.000Z',
        registry: confirmedRegistry
    }).auditRecord;

    const failHistory = async (actions, code, message) => {
        await expectCode(
            () => Promise.resolve(readReconciliationHistory(createRegistry([], {
                trancheReconciliation: { schemaVersion: 1, actions }
            }))),
            code,
            message
        );
    };
    await failHistory(
        [sale, { ...correction1, correctsActionId: sale.actionId }],
        'RECONCILIATION_CORRECTION_WITHOUT_CONFIRMATION',
        'Korrektur ohne wirksame Bestätigung wird blockiert'
    );
    await failHistory(
        [sale, confirmation, {
            ...correction1,
            actionId: deriveCashCorrectionActionId(sale.actionId, 2),
            correctionActionId: deriveCashCorrectionActionId(sale.actionId, 2),
            correctionRevision: 2
        }],
        'RECONCILIATION_CORRECTION_CHAIN_INVALID',
        'Revisionslücke wird blockiert'
    );
    const withCorrection1 = JSON.parse(JSON.stringify(confirmedRegistry));
    withCorrection1.trancheReconciliation.actions.push(correction1);
    const correction2 = previewCashPostingCorrection({
        profileId: PROFILE_ID,
        targetActionId: sale.actionId,
        cashBalanceAfterPostingEur: 998,
        correctionReason: 'zweite Korrektur',
        correctedAt: '2026-07-15T10:00:00.000Z',
        registry: withCorrection1
    }).auditRecord;
    await failHistory(
        [sale, confirmation, correction1, { ...correction2, correctsActionId: confirmation.actionId }],
        'RECONCILIATION_CORRECTION_CHAIN_INVALID',
        'Veralteter Rückverweis wird blockiert'
    );
    await failHistory(
        [sale, confirmation, { ...correction1, confirmedNetProceedsEur: 501 }],
        'RECONCILIATION_NET_PROCEEDS_MISMATCH',
        'Geänderter Nettoerlös in Korrektur wird blockiert'
    );
    await failHistory(
        [sale, confirmation, { ...correction1, correctionReason: '   ' }],
        'RECONCILIATION_CORRECTION_REASON_REQUIRED',
        'Leerer Korrekturgrund wird blockiert'
    );
    await failHistory(
        [sale, confirmation, { ...correction1, actionId: `${correction1.actionId}-falsch`,
            correctionActionId: `${correction1.actionId}-falsch` }],
        'RECONCILIATION_CORRECTION_ID_INVALID',
        'Nichtkanonische Korrektur-ID wird blockiert'
    );
    await failHistory(
        [sale, confirmation, correction1, correction1],
        'RECONCILIATION_HISTORY_INVALID',
        'Doppelter Korrektur-Fork mit gleicher globaler ID wird blockiert'
    );
    const saleWithoutCashStatus = { ...sale };
    delete saleWithoutCashStatus.cashStatus;
    await failHistory(
        [saleWithoutCashStatus],
        'RECONCILIATION_CASH_STATUS_INVALID',
        'Expliziter neuer Verkauf ohne Cashstatus wird blockiert'
    );
    const legacyWithUnsupportedSchema = { ...sale, schemaVersion: 99 };
    delete legacyWithUnsupportedSchema.eventType;
    delete legacyWithUnsupportedSchema.cashStatus;
    await failHistory(
        [legacyWithUnsupportedSchema],
        'RECONCILIATION_HISTORY_INVALID',
        'Legacy-Verkauf mit nicht unterstützter Record-Schemaversion wird blockiert'
    );

    const targetSale = { ...sale, actionId: 'target-sale' };
    const collidingLegacySale = { ...sale, actionId: deriveCashConfirmationActionId('target-sale') };
    delete collidingLegacySale.eventType;
    delete collidingLegacySale.cashStatus;
    const collisionRegistry = createRegistry([], {
        trancheReconciliation: { schemaVersion: 1, actions: [targetSale, collidingLegacySale] }
    });
    await expectCode(
        () => Promise.resolve(previewCashPostingConfirmation({
            profileId: PROFILE_ID,
            targetActionId: 'target-sale',
            cashBalanceAfterPostingEur: 1000,
            confirmedAt: '2026-07-15T08:00:00.000Z',
            registry: collisionRegistry
        })),
        'RECONCILIATION_ACTION_CONFLICT',
        'Kanonische Abschluss-ID-Kollision mit Legacy-Verkauf wird blockiert'
    );

    const initiallyConfirmed = { ...sale, cashStatus: 'confirmed_already_reflected',
        cashBalanceAfterPostingEur: 1000, cashConfirmedAt: '2026-07-15T08:00:00.000Z' };
    const initialRegistry = createRegistry([], {
        trancheReconciliation: { schemaVersion: 1, actions: [initiallyConfirmed] }
    });
    const initialCorrection = previewCashPostingCorrection({
        profileId: PROFILE_ID,
        targetActionId: initiallyConfirmed.actionId,
        cashBalanceAfterPostingEur: 999,
        correctionReason: 'Initialstand korrigiert',
        correctedAt: '2026-07-15T09:00:00.000Z',
        registry: initialRegistry
    });
    assertEqual(initialCorrection.auditRecord.correctsActionId, initiallyConfirmed.actionId,
        'Erste Korrektur einer Initialbestätigung verweist auf den Verkauf');
}
console.log('✓ adversarial correction-chain contract OK');

console.log('Test 13: cash flush failure restores the exact audit and remains retryable');
{
    const initial = [createLot()];
    const storage = createStorage(initial);
    const controls = {};
    await commitTrancheReconciliation({
        profileId: PROFILE_ID,
        action: createAction(),
        expectedTranchesRaw: storage.getItem('depot_tranchen')
    }, createCommitOptions(storage, controls));
    const registryBeforeCash = storage.getItem('rs_profiles_v1');
    const lotsBeforeCash = storage.getItem('depot_tranchen');
    const request = {
        profileId: PROFILE_ID,
        targetActionId: createAction().actionId,
        cashBalanceAfterPostingEur: 1000,
        confirmedAt: '2026-07-15T08:00:00.000Z',
        expectedRegistryRaw: registryBeforeCash
    };
    controls.failFlush = true;
    const error = await expectCode(
        () => commitCashPostingConfirmation(request, createCommitOptions(storage, controls)),
        'RECONCILIATION_PERSISTENCE_FAILED',
        'Cashabschluss-Flushfehler wird strukturiert gemeldet'
    );
    assertEqual(error.retryable, true, 'Cashabschluss-Flushfehler bleibt retryfähig');
    assertEqual(storage.getItem('rs_profiles_v1'), registryBeforeCash,
        'Cashabschluss-Flushfehler stellt den exakten Auditstand wieder her');
    assertEqual(storage.getItem('depot_tranchen'), lotsBeforeCash,
        'Cashabschluss-Flushfehler berührt den bestätigten Lotbestand nicht');
    controls.failFlush = false;
    const retried = await commitCashPostingConfirmation(request, createCommitOptions(storage, controls));
    assertEqual(retried.status, 'applied', 'Cashabschluss kann nach Flushfehler exakt wiederholt werden');
    assertEqual(readReconciliationHistory(storage.getItem('rs_profiles_v1')).length, 2,
        'Retry hängt den Cashabschluss genau einmal an');
}
console.log('✓ cash flush recovery contract OK');

console.log('--- Tranche Reconciliation Tests Completed ---');
