import {
    SNAPSHOT_KINDS,
    SNAPSHOT_TYPE,
    buildSnapshot,
    captureCurrentRecords,
    createSnapshot,
    deleteSnapshot,
    listSnapshots,
    readSnapshot,
    toSnapshotIndexEntry,
    validateSnapshot,
    writeSnapshot
} from '../app/shared/snapshot-archive.js';

function createMemorySnapshotStorage() {
    const snapshots = new Map();
    const calls = [];
    return {
        calls,
        async writeSnapshot(snapshot) {
            calls.push(`write:${snapshot.id}`);
            snapshots.set(snapshot.id, JSON.parse(JSON.stringify(snapshot)));
        },
        async readSnapshot(id) {
            calls.push(`read:${id}`);
            return snapshots.get(id);
        },
        async listSnapshots() {
            calls.push('list');
            return Array.from(snapshots.values());
        },
        async deleteSnapshot(id) {
            calls.push(`delete:${id}`);
            snapshots.delete(id);
        }
    };
}

console.log('Test 1: buildSnapshot normalisiert Schema und erzeugt stabile ID');
{
    const snapshot = buildSnapshot({
        label: 'Profil:/2026?',
        kind: SNAPSHOT_KINDS.annualClosePreMutation,
        createdAt: '2026-06-02T18:00:00.000Z',
        activeProfileId: 'default',
        activeProfileName: 'Standard',
        records: {
            ruhestandsmodellValues_v29_guardrails: '{"inputs":{}}',
            depot_tranchen: null,
            balance_expenses_v1: 42
        }
    });

    assert(snapshot.id.startsWith('snapshot_2026-06-02T18-00-00-000Z--Profil-2026'), 'ID wird aus Zeit und bereinigtem Label gebildet');
    assertEqual(snapshot.schemaVersion, 1, 'Schema-Version ist 1');
    assertEqual(snapshot.snapshotType, SNAPSHOT_TYPE, 'Snapshot-Type ist kanonisch');
    assertEqual(snapshot.recordCount, 2, 'recordCount ignoriert null/undefined Records');
    assertEqual(snapshot.records.balance_expenses_v1, '42', 'Record-Werte werden als Strings normalisiert');
    assertEqual(snapshot.restoreScope.profileRegistryMode, 'preserve-by-default', 'Default-Restore-Scope wird gesetzt');
}

console.log('Test 2: captureCurrentRecords nutzt Snapshot-Key-Policy');
{
    const source = {
        ruhestandsmodellValues_v29_guardrails: 'live',
        depot_tranchen: 'tranches',
        ruhestandsmodell_snapshot_old: 'legacy snapshot',
        featureFlags: 'technical',
        debug_panel: 'technical',
        unrelated: 'no'
    };
    const records = captureCurrentRecords({
        keys: Object.keys(source),
        getItem: key => source[key]
    });

    assertEqual(records.ruhestandsmodellValues_v29_guardrails, 'live', 'fachlicher Balance-State wird aufgenommen');
    assertEqual(records.depot_tranchen, 'tranches', 'profilbezogener Fixed-Key wird aufgenommen');
    assert(!Object.prototype.hasOwnProperty.call(records, 'ruhestandsmodell_snapshot_old'), 'Legacy-Snapshot-Key wird ausgeschlossen');
    assert(!Object.prototype.hasOwnProperty.call(records, 'featureFlags'), 'technischer Exact-Key wird ausgeschlossen');
    assert(!Object.prototype.hasOwnProperty.call(records, 'unrelated'), 'nicht erlaubter Key wird ausgeschlossen');
}

console.log('Test 3: validateSnapshot lehnt unpassenden recordCount ab');
{
    let failed = false;
    try {
        validateSnapshot({
            schemaVersion: 1,
            id: 'bad',
            snapshotType: SNAPSHOT_TYPE,
            kind: 'manual',
            createdAt: '2026-06-02T18:00:00.000Z',
            recordCount: 99,
            records: { a: '1' }
        });
    } catch (err) {
        failed = /recordCount/.test(err.message);
    }
    assert(failed, 'recordCount-Abweichung wird als Fehler behandelt');
}

console.log('Test 4: SnapshotArchive delegiert an In-Memory-Fake-Storage');
{
    const storage = createMemorySnapshotStorage();
    const first = await createSnapshot({
        label: 'Alt',
        createdAt: '2026-06-01T10:00:00.000Z',
        activeProfileId: 'default',
        records: { balance_expenses_v1: 'old' }
    }, { storage });
    const second = buildSnapshot({
        label: 'Neu',
        createdAt: '2026-06-02T10:00:00.000Z',
        activeProfileId: 'default',
        records: { balance_expenses_v1: 'new' }
    });
    await writeSnapshot(second, { storage });

    const listed = await listSnapshots({ storage });
    assertEqual(listed.length, 2, 'zwei Snapshots werden gelistet');
    assertEqual(listed[0].id, second.id, 'Liste ist absteigend nach createdAt sortiert');
    assert(!Object.prototype.hasOwnProperty.call(listed[0], 'records'), 'Indexeintrag enthaelt keine Records');

    const readBack = await readSnapshot(first.id, { storage });
    assertEqual(readBack.records.balance_expenses_v1, 'old', 'readSnapshot validiert und liefert Vollsnapshot');

    await deleteSnapshot(first.id, { storage });
    const remaining = await listSnapshots({ storage });
    assertEqual(remaining.length, 1, 'deleteSnapshot entfernt den Eintrag');
    assert(storage.calls.includes(`write:${first.id}`), 'createSnapshot delegiert writeSnapshot');
    assert(storage.calls.includes(`read:${first.id}`), 'readSnapshot delegiert readSnapshot');
}

console.log('Test 5: toSnapshotIndexEntry markiert fehlende activeProfileId als nicht standard-restorable');
{
    const snapshot = buildSnapshot({
        label: 'Ohne Profil',
        createdAt: '2026-06-02T18:00:00.000Z',
        records: { balance_expenses_v1: 'x' }
    });
    const indexEntry = toSnapshotIndexEntry(snapshot);
    assertEqual(indexEntry.standardRestorable, false, 'Snapshot ohne activeProfileId ist nicht standard-restore-faehig');
    assertEqual(indexEntry.recordCount, 1, 'Index enthaelt recordCount');
}

console.log('Snapshot archive tests passed.');
