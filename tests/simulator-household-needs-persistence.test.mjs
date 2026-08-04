import {
    HOUSEHOLD_SIMULATOR_NEEDS_STORAGE_KEY,
    clearHouseholdSimulatorNeeds,
    ensureHouseholdSimulatorNeedsMigrationPending,
    initializeHouseholdSimulatorNeeds,
    readHouseholdSimulatorNeedsState,
    resolveHouseholdSimulatorNeed,
    selectLegacyHouseholdSimulatorNeeds,
    writeHouseholdSimulatorNeedOverride
} from '../app/simulator/simulator-household-needs-persistence.js';

function createStorage(initial = {}) {
    const records = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
    return {
        getItem: key => records.has(String(key)) ? records.get(String(key)) : null,
        setItem: (key, value) => records.set(String(key), String(value)),
        removeItem: key => records.delete(String(key))
    };
}

const legacyValues = {
    startFloorBedarf: '24002',
    startFlexBedarf: '150000',
    minimumFlexAnnual: '60000'
};
const profileDefaults = {
    startFloorBedarf: 12000,
    startFlexBedarf: 30000,
    minimumFlexAnnual: 15000
};

console.log('Test 1: legacy migration is deterministic across the active household');
{
    const unchangedProfile = {
        legacyValues: {
            startFloorBedarf: '12000',
            startFlexBedarf: '30000',
            minimumFlexAnnual: '15000'
        },
        profileDefaults
    };
    const changedProfile = { legacyValues, profileDefaults };
    const selection = selectLegacyHouseholdSimulatorNeeds([changedProfile]);
    const multiProfile = selectLegacyHouseholdSimulatorNeeds([unchangedProfile, changedProfile]);
    const reversed = selectLegacyHouseholdSimulatorNeeds([changedProfile, unchangedProfile]);
    assertEqual(selection.status, 'candidate', 'One-profile household yields a safe migration candidate');
    assertEqual(selection.values.startFloorBedarf, '24002', 'Single-profile legacy floor is selected');
    assertEqual(multiProfile.status, 'ambiguous', 'Multi-profile legacy data is never promoted automatically');
    assertEqual(reversed.status, 'ambiguous', 'Profile ordering does not affect multi-profile rejection');

    const storage = createStorage();
    const migrated = initializeHouseholdSimulatorNeeds(selection, storage);
    assertEqual(migrated.status, 'valid', 'Selected legacy candidate creates a valid override');
    assertEqual(migrated.values.startFlexBedarf, '150000', 'Legacy flex remains exact');
    assertEqual(migrated.values.minimumFlexAnnual, '60000', 'Legacy minimum flex remains exact');
    assert(migrated.warning.includes('einmalig übernommen'), 'Successful migration is visibly reported once');

    const ambiguous = selectLegacyHouseholdSimulatorNeeds([
        changedProfile,
        {
            legacyValues: { ...legacyValues, startFloorBedarf: '99999' },
            profileDefaults
        }
    ]);
    assertEqual(ambiguous.status, 'ambiguous', 'Conflicting changed profiles are not guessed');

    const identicalMulti = selectLegacyHouseholdSimulatorNeeds([changedProfile, changedProfile]);
    assertEqual(identicalMulti.status, 'ambiguous', 'Identical per-profile values are not mistaken for a household total');
    const unchangedSingle = selectLegacyHouseholdSimulatorNeeds([unchangedProfile]);
    assertEqual(unchangedSingle.status, 'none', 'Single-profile values equal to defaults are not frozen as overrides');
}

console.log('Test 2: each edited field persists independently and invalid edits are visible');
{
    const storage = createStorage();
    initializeHouseholdSimulatorNeeds({ status: 'none', values: null }, storage);
    const floorWrite = writeHouseholdSimulatorNeedOverride('startFloorBedarf', {
        startFloorBedarf: '30000',
        startFlexBedarf: '',
        minimumFlexAnnual: '60000'
    }, storage);
    assertEqual(floorWrite.ok, true, 'Valid floor persists despite an empty neighbouring field');
    assertEqual(floorWrite.state.values.startFloorBedarf, '30000', 'Independent floor value is stored');
    assertEqual(floorWrite.state.values.startFlexBedarf, undefined, 'Empty neighbour is not frozen into the override');

    const invalidFlex = writeHouseholdSimulatorNeedOverride('startFlexBedarf', {
        startFlexBedarf: ''
    }, storage);
    assertEqual(invalidFlex.ok, false, 'Invalid edited field is rejected');
    assert(invalidFlex.message.includes('nicht gespeichert'), 'Rejected edit carries a visible message');
    assertEqual(readHouseholdSimulatorNeedsState(storage).values.startFloorBedarf, '30000',
        'Rejected edit preserves the valid independent floor');

    const commaFlex = writeHouseholdSimulatorNeedOverride('startFlexBedarf', {
        startFlexBedarf: ' 30000,50 ',
        minimumFlexAnnual: '.5'
    }, storage);
    assertEqual(commaFlex.ok, true, 'Trimmed German decimal input is accepted');
    assertEqual(commaFlex.state.values.startFlexBedarf, '30000.5', 'German decimal is canonicalized');
    const leadingDecimal = writeHouseholdSimulatorNeedOverride('minimumFlexAnnual', {
        startFlexBedarf: '30000.5',
        minimumFlexAnnual: '.5'
    }, storage);
    assertEqual(leadingDecimal.ok, true, 'Leading decimal input is accepted');
    assertEqual(leadingDecimal.state.values.minimumFlexAnnual, '0.5', 'Leading decimal is canonicalized');
    const exponentFloor = writeHouseholdSimulatorNeedOverride('startFloorBedarf', {
        startFloorBedarf: '3e4'
    }, storage);
    assertEqual(exponentFloor.ok, true, 'Scientific number input is accepted');
    assertEqual(exponentFloor.state.values.startFloorBedarf, '30000', 'Scientific input is stored as plain decimal');

    const invalidEffectiveRelation = writeHouseholdSimulatorNeedOverride('startFlexBedarf', {
        startFlexBedarf: '10000',
        minimumFlexAnnual: '30000'
    }, storage);
    assertEqual(invalidEffectiveRelation.ok, false, 'Flex below effective minimum flex is rejected immediately');
    assertEqual(invalidEffectiveRelation.reason, 'minimum_flex_exceeds_flex', 'Effective invariant has a stable reason');

    const impreciseHugeValue = writeHouseholdSimulatorNeedOverride('startFloorBedarf', {
        startFloorBedarf: '99999999999999999999'
    }, storage);
    assertEqual(impreciseHugeValue.ok, false, 'A value that Number cannot represent exactly is rejected');
    assert(impreciseHugeValue.message.includes('nicht gespeichert'), 'Precision rejection is visible');

    const flexWithEditingGap = writeHouseholdSimulatorNeedOverride(
        'startFlexBedarf',
        { startFlexBedarf: '70000', minimumFlexAnnual: '' },
        storage,
        { startFlexBedarf: '30000.5', minimumFlexAnnual: '30000' }
    );
    assertEqual(flexWithEditingGap.ok, true, 'Valid flex persists while minimum flex is temporarily empty');
    assertEqual(flexWithEditingGap.state.values.startFlexBedarf, '70000',
        'Temporarily invalid neighbour does not lose the visible flex edit');
    const completedNeighbour = writeHouseholdSimulatorNeedOverride(
        'minimumFlexAnnual',
        { startFlexBedarf: '70000', minimumFlexAnnual: '30000' },
        storage,
        { startFlexBedarf: '70000', minimumFlexAnnual: '30000' }
    );
    assertEqual(completedNeighbour.ok, true, 'Corrected neighbour is persisted');
    assertEqual(completedNeighbour.state.values.startFlexBedarf, '70000',
        'Correcting the neighbour preserves the earlier flex edit');
}

console.log('Test 3: only explicitly edited fields override profile defaults');
{
    const storage = createStorage();
    initializeHouseholdSimulatorNeeds({ status: 'none', values: null }, storage);
    const write = writeHouseholdSimulatorNeedOverride('startFloorBedarf', legacyValues, storage);
    assertEqual(write.state.overriddenFields.length, 1, 'Only one field is marked explicit');
    assertEqual(resolveHouseholdSimulatorNeed('startFloorBedarf', 24000, write.state.values), '24002',
        'Explicit floor wins over the profile sum');
    assertEqual(resolveHouseholdSimulatorNeed('startFlexBedarf', 60000, write.state.values), 60000,
        'Untouched flex continues to use the profile sum');
    assertEqual(resolveHouseholdSimulatorNeed('minimumFlexAnnual', 30000, write.state.values), 30000,
        'Untouched minimum flex continues to use the profile sum');

    const previousV1Storage = createStorage({
        [HOUSEHOLD_SIMULATOR_NEEDS_STORAGE_KEY]: JSON.stringify({
            schemaVersion: 1,
            mode: 'override',
            source: 'manual',
            overriddenFields: ['startFloorBedarf'],
            values: legacyValues
        })
    });
    const previousV1 = readHouseholdSimulatorNeedsState(previousV1Storage);
    assertEqual(previousV1.status, 'valid', 'Earlier V1 full snapshots remain readable');
    assertEqual(Object.keys(previousV1.values).length, 1, 'Earlier V1 snapshots expose only explicit fields');
}

console.log('Test 4: corruption heals once while unsupported future schemas remain untouched');
{
    const corruptStorage = createStorage({
        [HOUSEHOLD_SIMULATOR_NEEDS_STORAGE_KEY]: '{kaputt'
    });
    const recovered = initializeHouseholdSimulatorNeeds({ status: 'none', values: null }, corruptStorage);
    assertEqual(recovered.status, 'profile_default', 'Invalid JSON heals to profile defaults');
    assert(recovered.warning.includes('beschädigt'), 'Recovery reports damage once');
    const afterRecovery = readHouseholdSimulatorNeedsState(corruptStorage);
    assertEqual(afterRecovery.warning, '', 'Recovered damage does not warn forever');

    const legacyMarkerStorage = createStorage({
        [HOUSEHOLD_SIMULATOR_NEEDS_STORAGE_KEY]: JSON.stringify({
            schemaVersion: 1,
            mode: 'profile_default',
            source: 'legacy_invalid'
        })
    });
    const healedLegacyMarker = initializeHouseholdSimulatorNeeds({ status: 'none', values: null }, legacyMarkerStorage);
    assert(healedLegacyMarker.warning.includes('unvollständig'), 'Old legacy warning is surfaced once');
    assertEqual(readHouseholdSimulatorNeedsState(legacyMarkerStorage).warning, '', 'Old legacy warning self-heals');

    for (const schemaVersion of ['1.0', '01', true, 2]) {
        const raw = JSON.stringify({ schemaVersion, mode: 'override', overriddenFields: [], values: {} });
        const storage = createStorage({ [HOUSEHOLD_SIMULATOR_NEEDS_STORAGE_KEY]: raw });
        const state = initializeHouseholdSimulatorNeeds({ status: 'none', values: null }, storage);
        assertEqual(state.status, 'unsupported', `Schema ${String(schemaVersion)} is rejected`);
        assert(state.warning.includes('nicht unterstützte Version'), 'Unsupported schema produces a warning');
        assertEqual(storage.getItem(HOUSEHOLD_SIMULATOR_NEEDS_STORAGE_KEY), raw,
            'Unsupported future data remains untouched');
        assertEqual(readHouseholdSimulatorNeedsState(storage).warning, '',
            'Unsupported schema warning is automatically acknowledged after display');
        const attemptedWrite = writeHouseholdSimulatorNeedOverride(
            'startFloorBedarf',
            { startFloorBedarf: '31000' },
            storage
        );
        assertEqual(attemptedWrite.ok, false, 'Unsupported schema blocks a downgrade write');
        assertEqual(attemptedWrite.reason, 'unsupported_schema', 'Downgrade block has a stable reason');
        assertEqual(storage.getItem(HOUSEHOLD_SIMULATOR_NEEDS_STORAGE_KEY), raw,
            'Blocked downgrade write preserves future-version data');
    }
}

console.log('Test 5: reset prevents legacy values from being re-imported');
{
    const storage = createStorage();
    const pending = ensureHouseholdSimulatorNeedsMigrationPending(storage);
    assertEqual(pending.status, 'migration_pending', 'Input initialization creates a migration contract without profiles');
    initializeHouseholdSimulatorNeeds({ status: 'candidate', values: legacyValues }, storage);
    const reset = clearHouseholdSimulatorNeeds(storage);
    assertEqual(reset.status, 'profile_default', 'Reset selects profile defaults');
    const afterRestart = initializeHouseholdSimulatorNeeds({ status: 'candidate', values: legacyValues }, storage);
    assertEqual(afterRestart.status, 'profile_default', 'Reset marker prevents legacy re-import');
}

console.log('Simulator household needs persistence tests passed');
