import { readFileSync } from 'node:fs';

import {
    STRESS_REPLAY_CONTRACT_VERSION,
    STRESS_REPLAY_SCHEMA_VERSIONS,
    STRESS_REPLAY_SCOPE,
    STRESS_REPLAY_UNITS_V1,
    StressReplayContractError,
    createStressReplayFingerprint,
    createStressReplayPathFingerprint,
    createStressReplayVariantFingerprint,
    createStressReplayWorkspaceFingerprint,
    createStressReplayWorkspaceV1
} from '../app/simulator/stress-replay-contract.js';
import {
    buildStressReplayComparisonExportV1,
    createStressReplayComparisonExportFingerprint,
    parseStressReplayComparisonExportV1,
    serializeStressReplayComparisonExportV1,
    validateStressReplayComparisonExportV1
} from '../app/simulator/stress-replay-export.js';
import {
    createStressReplayBaselineVariantV1,
    createStressReplayVariantV1
} from '../app/simulator/stress-replay-variant.js';

function fingerprint(character) {
    return { algorithm: 'sha256-canonical-json-v1', value: character.repeat(64) };
}

function pathFixture({ terminalDeath = false } = {}) {
    return {
        schemaVersion: STRESS_REPLAY_SCHEMA_VERSIONS.path,
        contractVersion: STRESS_REPLAY_CONTRACT_VERSION,
        scope: STRESS_REPLAY_SCOPE,
        source: {
            requestFingerprint: fingerprint('c'), seed: 7, rngMode: 'per-run-seed',
            absoluteRunIndex: 0, displayRunNumber: 1, scenarioKey: 'worst_terminal_wealth',
            selectionMetric: 'nominal_terminal_wealth_eur', tieBreak: 'smallest_absolute_run_index'
        },
        breakOnRuin: true,
        dataFingerprint: fingerprint('a'),
        engineFingerprint: fingerprint('b'),
        units: { ...STRESS_REPLAY_UNITS_V1 },
        horizonYears: 1,
        effectiveLength: 1,
        terminalStatus: terminalDeath ? 'all_dead' : 'horizon_exhausted',
        initialMarketDataHist: [{ year: 2025, kurs: 100, capeRatio: 25 }],
        years: [{
            yearIndex: 0,
            recordType: terminalDeath ? 'terminal_death' : 'financial_year',
            financiallyEvaluable: !terminalDeath,
            equityReturnPct: -10, goldReturnPct: 2, cashReturnPct: 1,
            inflationPct: 2, wageGrowthPct: 2, capeRatio: 24, regime: 'bear',
            stressEvents: [], tailRiskEvents: [], householdEvents: []
        }],
        reconciliation: { sourcePrefixMatched: true }
    };
}

function inputsFixture(overrides = {}) {
    return {
        startAlter: 65,
        liquidityRunwayYears: 5,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5,
        decumulation: { mode: 'standard' },
        dynamicFlex: false,
        horizonMethod: 'mean',
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoActive: false,
        goGoMultiplier: 1,
        longevityMode: 'none',
        ...overrides
    };
}

function workspaceFixture(inputs = inputsFixture(), path = pathFixture()) {
    const baseline = createStressReplayBaselineVariantV1({ baselineInputs: inputs });
    return createStressReplayWorkspaceV1({
        path,
        sourceScenarioLog: [{ recordType: path.years[0].recordType, jahr: 1, histJahr: null }],
        baselineSnapshot: inputs,
        variants: [baseline],
        createdAtUtc: '2026-08-14T10:00:00.000Z'
    });
}

function assertContractError(callback, code, message) {
    try {
        callback();
        assert(false, `${message}: expected ${code}`);
    } catch (error) {
        assert(error instanceof StressReplayContractError && error.code === code,
            `${message}: received ${error?.code || error?.name}`);
    }
}

console.log('Test 1: versioned comparison export roundtrips without reproducible result logs');
const workspace = workspaceFixture(inputsFixture(), pathFixture({ terminalDeath: true }));
const document = buildStressReplayComparisonExportV1({
    workspace,
    exportedAt: '2026-08-14T12:00:00.000Z'
});
const serialized = serializeStressReplayComparisonExportV1(document);
const parsed = parseStressReplayComparisonExportV1(serialized);
assertEqual(parsed.schemaVersion, 'StressReplayComparisonExportV1', 'Export schema is explicit');
assertEqual(parsed.workspace.workspaceFingerprint.value, workspace.workspaceFingerprint.value, 'Workspace roundtrip is exact');
assertEqual(parsed.workspace.sourceIdentity.schemaVersion, 'StressReplaySourceIdentityV2',
    'Export roundtrip retains executable V2 source evidence');
assertEqual(parsed.workspace.path.years[0].recordType, 'terminal_death', 'Export roundtrip preserves the terminal death path row');
assertEqual(parsed.comparison, null, 'Reproducible comparison result is optional and no yearly result logs are persisted');
assertEqual(parsed.privacy.excludes.length, 4, 'Privacy exclusions are explicit');
assert(parsed.privacy.excludes.includes('complete-source-scenario-logs'), 'Complete source logs are explicitly excluded');
assert(Object.isFrozen(parsed) && Object.isFrozen(parsed.workspace), 'Imported export is deeply immutable');

console.log('Test 2: export timestamps are excluded from the technical fingerprint');
const later = buildStressReplayComparisonExportV1({
    workspace,
    exportedAt: '2027-01-01T00:00:00.000Z'
});
assertEqual(document.exportFingerprint.value, later.exportFingerprint.value, 'Export timestamp does not change the fingerprint');

console.log('Test 3: tampering and unknown versions fail closed even with a recomputed outer fingerprint');
const tampered = structuredClone(document);
tampered.workspace.baselineSnapshot.startAlter = 66;
tampered.exportFingerprint = createStressReplayComparisonExportFingerprint(tampered);
assertContractError(
    () => validateStressReplayComparisonExportV1(tampered),
    'STRESS_REPLAY_BASELINE_FINGERPRINT_MISMATCH',
    'Nested workspace tampering is rejected'
);
assertContractError(
    () => parseStressReplayComparisonExportV1(JSON.stringify({ ...document, schemaVersion: 'FutureExportV9' })),
    'STRESS_REPLAY_VERSION_UNSUPPORTED',
    'Unknown export versions are rejected'
);
const importInputs = inputsFixture();
const importedAlternative = createStressReplayVariantV1({
    id: 'skim-upper-bound',
    label: 'Skim upper bound',
    baselineInputs: importInputs,
    patch: { strategy: { maxSkimPctOfEq: 50 } }
});
const importWorkspace = createStressReplayWorkspaceV1({
    path: pathFixture(),
    sourceScenarioLog: [{ recordType: 'financial_year', jahr: 1, histJahr: null }],
    baselineSnapshot: importInputs,
    variants: [createStressReplayBaselineVariantV1({ baselineInputs: importInputs }), importedAlternative],
    createdAtUtc: '2026-08-14T10:00:00.000Z'
});
const manipulatedImport = structuredClone(buildStressReplayComparisonExportV1({
    workspace: importWorkspace,
    exportedAt: '2026-08-14T12:00:00.000Z'
}));
manipulatedImport.workspace.variants[1].patch.strategy.maxSkimPctOfEq = 50.1;
manipulatedImport.workspace.variants[1].variantFingerprint = createStressReplayVariantFingerprint(
    manipulatedImport.workspace.variants[1]
);
manipulatedImport.workspace.workspaceFingerprint = createStressReplayWorkspaceFingerprint(manipulatedImport.workspace);
manipulatedImport.exportFingerprint = createStressReplayComparisonExportFingerprint(manipulatedImport);
assertContractError(
    () => parseStressReplayComparisonExportV1(JSON.stringify(manipulatedImport)),
    'STRESS_REPLAY_CONTRACT_INVALID',
    'Recomputed nested and outer fingerprints must not bypass imported percentage bounds'
);

const identityTamper = structuredClone(document);
identityTamper.workspace.sourceIdentity.rows[0].r = '{"p":"a","v":[1]}';
identityTamper.exportFingerprint = createStressReplayComparisonExportFingerprint(identityTamper);
assertContractError(
    () => validateStressReplayComparisonExportV1(identityTamper),
    'STRESS_REPLAY_SOURCE_IDENTITY_FINGERPRINT_MISMATCH',
    'Recomputed outer fingerprint cannot hide source identity drift'
);
const pathSourceTamper = structuredClone(document);
pathSourceTamper.workspace.path.source.absoluteRunIndex = 1;
pathSourceTamper.workspace.path.source.displayRunNumber = 2;
pathSourceTamper.workspace.path.pathFingerprint = createStressReplayPathFingerprint(pathSourceTamper.workspace.path);
pathSourceTamper.workspace.pathFingerprint = pathSourceTamper.workspace.path.pathFingerprint;
pathSourceTamper.workspace.workspaceFingerprint = createStressReplayWorkspaceFingerprint(pathSourceTamper.workspace);
pathSourceTamper.exportFingerprint = createStressReplayComparisonExportFingerprint(pathSourceTamper);
assertContractError(
    () => validateStressReplayComparisonExportV1(pathSourceTamper),
    'STRESS_REPLAY_SOURCE_IDENTITY_MISMATCH',
    'Recomputed path, workspace and outer fingerprints cannot rebind the source identity'
);

console.log('Test 4: secrets and local filesystem paths are rejected before export');
for (const unsafeInputs of [
    inputsFixture({ secret: 'do-not-export' }),
    inputsFixture({ sourceFile: 'C:\\Users\\Example\\private.json' })
]) {
    assertContractError(
        () => buildStressReplayComparisonExportV1({ workspace: workspaceFixture(unsafeInputs) }),
        'STRESS_REPLAY_EXPORT_PRIVATE_DATA',
        'Private export data is rejected'
    );
}

console.log('Test 5: malformed and oversized JSON are rejected before contract use');
assertContractError(
    () => parseStressReplayComparisonExportV1('{broken'),
    'STRESS_REPLAY_EXPORT_JSON_INVALID',
    'Malformed JSON is rejected'
);
assertContractError(
    () => parseStressReplayComparisonExportV1(`"${'x'.repeat(2 * 1024 * 1024)}"`),
    'STRESS_REPLAY_PERSISTENCE_SIZE_LIMIT',
    'Oversized import is rejected before parsing'
);

assertEqual(
    document.workspace.baselineScenarioFingerprint.value,
    createStressReplayFingerprint(workspace.baselineSnapshot).value,
    'Export retains the baseline fingerprint oracle'
);

console.log('Test 6: checked-in V1 golden export roundtrips byte- and fingerprint-identically');
const legacyGoldenJson = readFileSync(
    new URL('./fixtures/stress-replay-comparison-export-v1.json', import.meta.url),
    'utf8'
);
const legacyGolden = parseStressReplayComparisonExportV1(legacyGoldenJson);
assertEqual(
    legacyGolden.workspace.variants.every(variant => variant.whitelistVersion === 'StressReplayVariantWhitelistV1'),
    true,
    'Golden export must retain only historical V1 whitelist variants'
);
assertEqual(
    serializeStressReplayComparisonExportV1(legacyGolden),
    legacyGoldenJson.trimEnd(),
    'V1 golden export must serialize byte-identically'
);
assertEqual(
    validateStressReplayComparisonExportV1(legacyGolden).exportFingerprint.value,
    legacyGolden.exportFingerprint.value,
    'V1 golden export fingerprint must remain unchanged'
);

const mixedWorkspace = structuredClone(legacyGolden.workspace);
const v2Alternative = createStressReplayVariantV1({
    id: 'v2-floor-zero',
    label: 'V2 floor zero',
    baselineInputs: mixedWorkspace.baselineSnapshot,
    patch: { strategy: { startFloorBedarf: 0 } }
});
mixedWorkspace.variantOrder.push(v2Alternative.id);
mixedWorkspace.variants.push(v2Alternative);
mixedWorkspace.workspaceFingerprint = createStressReplayWorkspaceFingerprint(mixedWorkspace);
const mixedExport = buildStressReplayComparisonExportV1({
    workspace: mixedWorkspace,
    exportedAt: legacyGolden.exportedAtUtc
});
assertEqual(mixedExport.workspace.variants[0].whitelistVersion, 'StressReplayVariantWhitelistV1', 'Mixed export retains V1 baseline');
assertEqual(mixedExport.workspace.variants[2].whitelistVersion, 'StressReplayVariantWhitelistV2', 'Mixed export accepts known V2 alternative');
assertEqual(mixedExport.workspace.variants[2].patch.strategy.startFloorBedarf, 0, 'Mixed export retains explicit V2 zero');

const invalidEffectiveNeeds = structuredClone(mixedExport);
invalidEffectiveNeeds.workspace.variants[2].patch.strategy.startFlexBedarf = 0;
invalidEffectiveNeeds.workspace.variants[2].materialChangeGroups = ['startFlexBedarf', 'startFloorBedarf'];
invalidEffectiveNeeds.workspace.variants[2].warnings = [{
    code: 'STRESS_REPLAY_MULTI_FACTOR_VARIANT',
    factorCount: 2,
    factorGroups: ['startFlexBedarf', 'startFloorBedarf']
}];
invalidEffectiveNeeds.workspace.variants[2].normalizedInputFingerprint = createStressReplayFingerprint({
    ...invalidEffectiveNeeds.workspace.baselineSnapshot,
    startFloorBedarf: 0,
    startFlexBedarf: 0
});
invalidEffectiveNeeds.workspace.variants[2].variantFingerprint = createStressReplayVariantFingerprint(
    invalidEffectiveNeeds.workspace.variants[2]
);
invalidEffectiveNeeds.workspace.workspaceFingerprint = createStressReplayWorkspaceFingerprint(
    invalidEffectiveNeeds.workspace
);
invalidEffectiveNeeds.exportFingerprint = createStressReplayComparisonExportFingerprint(invalidEffectiveNeeds);
assertContractError(
    () => validateStressReplayComparisonExportV1(invalidEffectiveNeeds),
    'STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX',
    'Recomputed nested and outer fingerprints must not bypass the effective need relation'
);

const futureWhitelist = structuredClone(legacyGolden);
futureWhitelist.workspace.variants[1].whitelistVersion = 'StressReplayVariantWhitelistV3';
futureWhitelist.workspace.variants[1].variantFingerprint = createStressReplayVariantFingerprint(
    futureWhitelist.workspace.variants[1]
);
futureWhitelist.workspace.workspaceFingerprint = createStressReplayWorkspaceFingerprint(futureWhitelist.workspace);
futureWhitelist.exportFingerprint = createStressReplayComparisonExportFingerprint(futureWhitelist);
assertContractError(
    () => validateStressReplayComparisonExportV1(futureWhitelist),
    'STRESS_REPLAY_VERSION_UNSUPPORTED',
    'Unknown nested whitelist version must fail closed before import'
);
console.log('Stress replay export tests passed.');
