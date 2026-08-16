import {
    STRESS_REPLAY_CONTRACT_VERSION,
    STRESS_REPLAY_FORBIDDEN_VARIANT_PATHS_V1,
    STRESS_REPLAY_FORBIDDEN_VARIANT_PATHS_V2,
    STRESS_REPLAY_LIMITS,
    STRESS_REPLAY_SCHEMA_VERSIONS,
    STRESS_REPLAY_SCOPE,
    STRESS_REPLAY_UNITS_V1,
    STRESS_REPLAY_VARIANT_WHITELIST_V1,
    STRESS_REPLAY_VARIANT_WHITELIST_V2,
    STRESS_REPLAY_VARIANT_WHITELIST_VERSION_V1,
    STRESS_REPLAY_VARIANT_WHITELIST_VERSION_V2,
    StressReplayContractError,
    assertStressReplaySize,
    createStressReplayFingerprint,
    createStressReplaySourceIdentityFingerprint,
    createStressReplaySourceIdentityV1,
    createStressReplayStrategySnapshot,
    getStressReplayVariantContract,
    normalizeStressReplayVariantPatch,
    validateStressReplayEffectiveNeeds,
    validateStressReplayPathV1,
    validateStressReplaySourceIdentityV1
} from '../app/simulator/stress-replay-contract.js';

function assertJsonEqual(actual, expected, message) {
    assertEqual(JSON.stringify(actual), JSON.stringify(expected), message);
}

function assertContractError(callback, code, message, predicate = () => true) {
    try {
        callback();
        assert(false, `${message}: expected ${code}`);
    } catch (error) {
        assert(
            error instanceof StressReplayContractError && error.code === code && predicate(error),
            `${message}: received ${error?.name || typeof error}/${error?.code || 'without-code'}`
        );
    }
}

function fingerprint(character) {
    return { algorithm: 'sha256-canonical-json-v1', value: character.repeat(64) };
}

function annualRecord(yearIndex = 0) {
    return {
        yearIndex,
        recordType: 'financial_year',
        financiallyEvaluable: true,
        equityReturnPct: -12.5,
        goldReturnPct: 4.25,
        cashReturnPct: 1.5,
        inflationPct: 3.1,
        wageGrowthPct: 2.2,
        capeRatio: 22.4,
        regime: 'bear',
        stressEvents: [],
        tailRiskEvents: [],
        householdEvents: []
    };
}

function validPath(overrides = {}) {
    return {
        schemaVersion: STRESS_REPLAY_SCHEMA_VERSIONS.path,
        contractVersion: STRESS_REPLAY_CONTRACT_VERSION,
        scope: STRESS_REPLAY_SCOPE,
        source: {
            requestFingerprint: fingerprint('c'),
            seed: 12345,
            rngMode: 'per-run-seed',
            absoluteRunIndex: 2,
            displayRunNumber: 3,
            scenarioKey: 'worst_terminal_wealth',
            selectionMetric: 'nominal_terminal_wealth_eur',
            tieBreak: 'smallest_absolute_run_index'
        },
        breakOnRuin: true,
        dataFingerprint: fingerprint('a'),
        engineFingerprint: fingerprint('b'),
        units: { ...STRESS_REPLAY_UNITS_V1 },
        horizonYears: 1,
        effectiveLength: 1,
        terminalStatus: 'horizon_exhausted',
        initialMarketDataHist: [{ year: 2024, kurs: 100, capeRatio: 25 }],
        years: [annualRecord()],
        reconciliation: { sourcePrefixMatched: true },
        ...overrides
    };
}

const fullInputs = {
    liquidityRunwayYears: 5,
    maxSkimPctOfEq: 10,
    maxBearRefillPctOfEq: 5,
    decumulation: { mode: '3_bucket_jilge', bondTargetFactor: 2, drawdownTrigger: -0.2, bondRefillThreshold: 0.1 },
    dynamicFlex: true,
    horizonMethod: 'survival_quantile',
    horizonYears: 60,
    survivalQuantile: 0.99,
    goGoActive: true,
    goGoMultiplier: 1.5,
    longevityMode: 'buffer_years',
    longevityQuantileShift: 0.05,
    longevityRelativePct: 0.05,
    longevityBufferYears: 10,
    goldAktiv: true,
    startFloorBedarf: 24000,
    startFlexBedarf: 12000,
    minimumFlexAnnual: 12000
};

console.log('Test 1: whitelist maps exactly the 17 approved getCommonInputs paths');
assertEqual(STRESS_REPLAY_VARIANT_WHITELIST_V1.length, 17, 'Whitelist must contain exactly 17 paths');
assertJsonEqual(
    STRESS_REPLAY_VARIANT_WHITELIST_V1.map(entry => entry.inputPath),
    [
        'liquidityRunwayYears', 'maxSkimPctOfEq', 'maxBearRefillPctOfEq',
        'decumulation.mode', 'decumulation.bondTargetFactor', 'decumulation.drawdownTrigger',
        'decumulation.bondRefillThreshold', 'dynamicFlex', 'horizonMethod', 'horizonYears',
        'survivalQuantile', 'goGoActive', 'goGoMultiplier', 'longevityMode',
        'longevityQuantileShift', 'longevityRelativePct', 'longevityBufferYears'
    ],
    'Whitelist input paths must match getCommonInputs'
);
assert(STRESS_REPLAY_FORBIDDEN_VARIANT_PATHS_V1.includes('strategy.goldAktiv'), 'Gold activation must be forbidden');
assert(STRESS_REPLAY_FORBIDDEN_VARIANT_PATHS_V1.includes('strategy.minimumFlexAnnual'), 'minimumFlexAnnual must be forbidden');
assertEqual(STRESS_REPLAY_VARIANT_WHITELIST_V2.length, 20, 'V2 whitelist must add exactly three need paths');
assertJsonEqual(
    STRESS_REPLAY_VARIANT_WHITELIST_V2.slice(-3).map(entry => [entry.inputPath, entry.contractPath]),
    [
        ['startFloorBedarf', 'strategy.startFloorBedarf'],
        ['startFlexBedarf', 'strategy.startFlexBedarf'],
        ['minimumFlexAnnual', 'strategy.minimumFlexAnnual']
    ],
    'V2 need descriptors must map directly to getCommonInputs'
);
assert(!STRESS_REPLAY_FORBIDDEN_VARIANT_PATHS_V2.includes('strategy.minimumFlexAnnual'), 'V2 must allow minimumFlexAnnual');
assertEqual(STRESS_REPLAY_UNITS_V1.equityReturnPct, 'percent_per_year', 'Equity return unit must be explicit');

console.log('Test 2: maximal strategy snapshot uses only real, normalized inputs and is immutable');
const snapshot = createStressReplayStrategySnapshot(fullInputs);
assertEqual(snapshot.decumulation.mode, '3_bucket_jilge', '3-bucket mode must survive snapshotting');
assertEqual(snapshot.decumulation.bondTargetFactor, 2, 'Active 3-bucket field must survive snapshotting');
assertEqual(snapshot.longevityMode, 'buffer_years', 'Longevity mode must survive snapshotting');
assertEqual(snapshot.longevityBufferYears, 10, 'Active longevity field must survive snapshotting');
assert(!Object.hasOwn(snapshot, 'goldAktiv'), 'Snapshot must exclude Gold activation');
assertEqual(snapshot.startFloorBedarf, 24000, 'V2 snapshot must retain floor need');
assertEqual(snapshot.startFlexBedarf, 12000, 'V2 snapshot must retain flex need');
assertEqual(snapshot.minimumFlexAnnual, 12000, 'V2 snapshot must retain minimum flex');
const legacySnapshot = createStressReplayStrategySnapshot(fullInputs, {
    whitelistVersion: STRESS_REPLAY_VARIANT_WHITELIST_VERSION_V1
});
assert(!Object.hasOwn(legacySnapshot, 'minimumFlexAnnual'), 'V1 snapshot must retain its historical projection');
assert(Object.isFrozen(snapshot), 'Snapshot must be frozen');
assert(Object.isFrozen(snapshot.decumulation), 'Nested snapshot must be frozen');

console.log('Test 3: forbidden, unknown and optimizer-alias patches fail closed with field lists');
for (const candidate of [
    { strategy: { goldAktiv: false } },
    { strategy: { goldTargetPct: 0 } },
    { strategy: { minimumFlexAnnual: 1 } },
    { strategy: { invented: true } }
]) {
    assertContractError(
        () => normalizeStressReplayVariantPatch(candidate, {
            whitelistVersion: STRESS_REPLAY_VARIANT_WHITELIST_VERSION_V1
        }),
        'STRESS_REPLAY_VARIANT_FIELD_FORBIDDEN',
        `Patch ${JSON.stringify(candidate)} must fail closed`,
        error => error.details.fields.length === 1
    );
}

console.log('Test 3b: V2 need values retain explicit zero and reject invalid domains and relations');
const zeroNeeds = normalizeStressReplayVariantPatch({
    strategy: { startFloorBedarf: 0, startFlexBedarf: 0, minimumFlexAnnual: 0 }
});
assertJsonEqual(
    zeroNeeds.strategy,
    { startFloorBedarf: 0, startFlexBedarf: 0, minimumFlexAnnual: 0 },
    'Explicit zero must survive V2 normalization'
);
for (const key of ['startFloorBedarf', 'startFlexBedarf', 'minimumFlexAnnual']) {
    for (const invalid of [-1, null, '0']) {
        assertContractError(
            () => normalizeStressReplayVariantPatch({ strategy: { [key]: invalid } }),
            'STRESS_REPLAY_CONTRACT_INVALID',
            `${key} must reject ${String(invalid)}`
        );
    }
    assertContractError(
        () => normalizeStressReplayVariantPatch({ strategy: { [key]: Infinity } }),
        'STRESS_REPLAY_NON_FINITE',
        `${key} must reject Infinity`
    );
}
assertJsonEqual(
    validateStressReplayEffectiveNeeds({
        baselineInputs: fullInputs,
        patch: { strategy: { startFlexBedarf: 0, minimumFlexAnnual: 0 } }
    }),
    { startFloorBedarf: 24000, startFlexBedarf: 0, minimumFlexAnnual: 0 },
    'Effective relation must treat zero as present'
);
for (const patch of [
    { strategy: { startFlexBedarf: 1000, minimumFlexAnnual: 1001 } },
    { strategy: { startFlexBedarf: 11000 } },
    { strategy: { minimumFlexAnnual: 12001 } }
]) {
    assertContractError(
        () => validateStressReplayEffectiveNeeds({ baselineInputs: fullInputs, patch }),
        'STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX',
        'Effective minimum flex above flex must fail without clamping',
        error => error.details.startFlexBedarf < error.details.minimumFlexAnnual
    );
}
assertEqual(
    getStressReplayVariantContract(STRESS_REPLAY_VARIANT_WHITELIST_VERSION_V2).whitelist.length,
    20,
    'Known V2 dispatch must resolve'
);
assertContractError(
    () => getStressReplayVariantContract('StressReplayVariantWhitelistV3'),
    'STRESS_REPLAY_VERSION_UNSUPPORTED',
    'Unknown future whitelist must fail closed'
);

console.log('Test 4: conditional fields normalize against their controlling modes without clamping');
const percentageDescriptors = Object.fromEntries(
    STRESS_REPLAY_VARIANT_WHITELIST_V1
        .filter(entry => ['maxSkimPctOfEq', 'maxBearRefillPctOfEq'].includes(entry.inputPath))
        .map(entry => [entry.inputPath, entry])
);
assertJsonEqual(
    { minimum: percentageDescriptors.maxSkimPctOfEq.minimum, maximum: percentageDescriptors.maxSkimPctOfEq.maximum },
    { minimum: 0, maximum: 50 },
    'Skim percentage descriptor must expose the UI/import bounds'
);
assertJsonEqual(
    { minimum: percentageDescriptors.maxBearRefillPctOfEq.minimum, maximum: percentageDescriptors.maxBearRefillPctOfEq.maximum },
    { minimum: 0, maximum: 70 },
    'Bear-refill percentage descriptor must expose the UI/import bounds'
);
for (const [field, acceptedValues] of [
    ['maxSkimPctOfEq', [0, 12.5, 50]],
    ['maxBearRefillPctOfEq', [0, 35.5, 70]]
]) {
    for (const value of acceptedValues) {
        assertEqual(
            normalizeStressReplayVariantPatch({ strategy: { [field]: value } }).strategy[field],
            value,
            `${field} must accept ${value} without clamping`
        );
    }
}
for (const [field, invalidValues] of [
    ['maxSkimPctOfEq', [-0.1, 50.1]],
    ['maxBearRefillPctOfEq', [-0.1, 70.1]]
]) {
    for (const value of invalidValues) {
        assertContractError(
            () => normalizeStressReplayVariantPatch({ strategy: { [field]: value } }),
            'STRESS_REPLAY_CONTRACT_INVALID',
            `${field} must reject ${value} instead of clamping`,
            error => error.details.path === `strategy.${field}`
        );
    }
    for (const value of [NaN, Infinity, -Infinity]) {
        assertContractError(
            () => normalizeStressReplayVariantPatch({ strategy: { [field]: value } }),
            'STRESS_REPLAY_NON_FINITE',
            `${field} must reject ${String(value)}`,
            error => error.details.path === `patch.strategy.${field}`
        );
    }
}
assertJsonEqual(
    normalizeStressReplayVariantPatch({ strategy: { decumulation: { mode: 'standard', bondTargetFactor: 2 } } }),
    { strategy: { decumulation: { mode: 'standard' } } },
    'Inactive 3-bucket field must be removed'
);
assertJsonEqual(
    normalizeStressReplayVariantPatch({ strategy: { decumulation: { mode: 'standard', bondTargetFactor: null } } }),
    { strategy: { decumulation: { mode: 'standard' } } },
    'Inactive nullable 3-bucket input must be removed before numeric validation'
);
assertJsonEqual(
    normalizeStressReplayVariantPatch({ strategy: { longevityMode: 'none', longevityBufferYears: 3 } }),
    { strategy: { longevityMode: 'none' } },
    'Inactive longevity field must be removed'
);
assertJsonEqual(
    normalizeStressReplayVariantPatch({ strategy: { decumulation: { mode: 'dynamic_flex' }, longevityMode: 'unknown' } }),
    { strategy: { decumulation: { mode: 'standard' }, longevityMode: 'none' } },
    'Mode fields must use the existing Simulator normalizers'
);
assertContractError(
    () => normalizeStressReplayVariantPatch({ strategy: { decumulation: { mode: 'standard', bondTargetFactor: Infinity } } }),
    'STRESS_REPLAY_NON_FINITE',
    'Inactive non-finite values must still fail closed'
);
assertContractError(
    () => normalizeStressReplayVariantPatch({ strategy: { goGoMultiplier: 1.5001 } }),
    'STRESS_REPLAY_CONTRACT_INVALID',
    'Out-of-range go-go multiplier must not be clamped'
);
assertContractError(
    () => normalizeStressReplayVariantPatch({ strategy: { liquidityRunwayYears: 5.25 } }),
    'STRESS_REPLAY_VARIANT_VALUE_INVALID',
    'Invalid runway step must not be clamped'
);

console.log('Test 5: minimal path validates zero/one-based identity, explicit units and initial history');
const path = validateStressReplayPathV1(validPath());
assertEqual(path.source.absoluteRunIndex, 2, 'Absolute index must stay zero-based');
assertEqual(path.source.displayRunNumber, 3, 'Display number must stay one-based');
assert(Object.isFrozen(path), 'Validated path must be frozen');
assert(Object.isFrozen(path.years[0]), 'Validated annual record must be frozen');
const ruinTerminal = {
    yearIndex: 1,
    recordType: 'terminal_ruin',
    financiallyEvaluable: false,
    stressEvents: [],
    tailRiskEvents: [],
    householdEvents: []
};
const maximalRecordTypes = validateStressReplayPathV1(validPath({
    horizonYears: 60,
    effectiveLength: 2,
    terminalStatus: 'ruin',
    years: [annualRecord(), ruinTerminal]
}));
assertEqual(maximalRecordTypes.horizonYears, 60, 'Maximum replay horizon must validate');
assert(!Object.hasOwn(maximalRecordTypes.years[1], 'equityReturnPct'), 'Ruin terminal must not invent unavailable returns');
assertEqual(path.units.monetaryValues, 'nominal_eur', 'Validated path must carry explicit monetary units');

console.log('Test 6: length, index, history, legacy RNG, and non-finite violations are distinct');
assertContractError(
    () => validateStressReplayPathV1(validPath({ effectiveLength: 2 })),
    'STRESS_REPLAY_LENGTH_MISMATCH',
    'Length mismatch must fail'
);
assertContractError(
    () => validateStressReplayPathV1(validPath({ source: { ...validPath().source, displayRunNumber: 2 } })),
    'STRESS_REPLAY_INDEX_BASIS_INVALID',
    'Index basis mismatch must fail'
);
assertContractError(
    () => validateStressReplayPathV1(validPath({ source: { ...validPath().source, tieBreak: 'first_seen' } })),
    'STRESS_REPLAY_CONTRACT_INVALID',
    'Unsupported tie-break must fail'
);
assertContractError(
    () => validateStressReplayPathV1(validPath({ units: { ...STRESS_REPLAY_UNITS_V1, equityReturnPct: 'ratio' } })),
    'STRESS_REPLAY_CONTRACT_INVALID',
    'Mismatched units must fail'
);
assertContractError(
    () => validateStressReplayPathV1(validPath({
        terminalStatus: 'ruin',
        years: [{ ...annualRecord(), recordType: 'terminal_ruin' }]
    })),
    'STRESS_REPLAY_CONTRACT_INVALID',
    'Terminal record must not be financially evaluable'
);
assertContractError(
    () => validateStressReplayPathV1(validPath({ initialMarketDataHist: [] })),
    'STRESS_REPLAY_CONTRACT_INVALID',
    'Missing initial market history must fail'
);
assertContractError(
    () => validateStressReplayPathV1(validPath({ source: { ...validPath().source, rngMode: 'legacy-stream' } })),
    'STRESS_REPLAY_SOURCE_UNSUPPORTED',
    'Legacy stream source must fail'
);
assertContractError(
    () => validateStressReplayPathV1(validPath({ years: [{ ...annualRecord(), inflationPct: Infinity }] })),
    'STRESS_REPLAY_CONTRACT_INVALID',
    'Non-finite annual value must fail'
);

console.log('Test 7: fingerprints are canonical and exclude timestamps/display labels only');
const first = createStressReplayFingerprint({ b: 2, a: 1, label: 'A', exportedAtUtc: '2026-08-14T10:00:00Z' });
const second = createStressReplayFingerprint({ a: 1, b: 2, label: 'B', exportedAtUtc: '2027-01-01T00:00:00Z' });
assertJsonEqual(first, second, 'Display metadata and timestamps must not affect fingerprint');
assertEqual(
    first.value,
    '43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777',
    'Canonical fingerprint must match the fixed SHA-256 determinism oracle'
);
assert(first.value !== createStressReplayFingerprint({ a: 1, b: 3 }).value, 'Computational change must affect fingerprint');
assertContractError(
    () => createStressReplayFingerprint({ value: Number.NaN }),
    'STRESS_REPLAY_NON_FINITE',
    'Non-finite fingerprint input must fail'
);

console.log('Test 8: byte limits are exact and expose the persistence error contract');
assertEqual(assertStressReplaySize({ a: 1 }, 7), 7, 'Exact byte boundary must pass');
assertContractError(
    () => assertStressReplaySize({ a: 1 }, 6),
    'STRESS_REPLAY_PERSISTENCE_SIZE_LIMIT',
    'Exceeded byte boundary must fail',
    error => error.details.bytes === 7 && error.details.maximumBytes === 6
);
assertEqual(STRESS_REPLAY_LIMITS.maximumPathBytes, 1024 * 1024, 'Path limit must be 1 MiB');
assertEqual(STRESS_REPLAY_LIMITS.maximumEnvelopeBytes, 2 * 1024 * 1024, 'Envelope limit must be 2 MiB');

console.log('Test 9: independent source identity is minimal, ordered and fingerprint-bound');
const identityPath = validPath({
    years: [{ ...annualRecord(), historicalYear: 2001 }],
    reconciliation: { sourcePrefixMatched: true, sourcePrefixLength: 1 }
});
const identity = createStressReplaySourceIdentityV1({
    path: identityPath,
    sourceRows: [{
        recordType: 'financial_year', jahr: 1, histJahr: 2001,
        wertAktien: 1234, inflation: 2.5,
        entscheidung: { jahresEntnahme: 500, privateNote: 'excluded' },
        unrelatedFullLogField: 'excluded'
    }]
});
assertEqual(identity.rows.length, 1, 'Identity retains exactly the reconciled source prefix');
assertEqual(identity.rows[0].reconciliationFingerprint.algorithm, 'sha256-canonical-json-v1',
    'Identity retains only a canonical baseline reconciliation proof');
assert(!Object.hasOwn(identity.rows[0], 'unrelatedFullLogField'), 'Identity excludes unrelated source log fields');
assert(!Object.hasOwn(identity.rows[0], 'wertAktien'), 'Identity does not persist source financial details');
for (const mutate of [
    candidate => { candidate.rows[0].reconciliationFingerprint.value = 'f'.repeat(64); },
    candidate => { candidate.rows[0].invented = true; },
    candidate => { candidate.rows[0].jahr = Infinity; }
]) {
    const candidate = structuredClone(identity);
    mutate(candidate);
    assertContractError(
        () => validateStressReplaySourceIdentityV1(candidate, identityPath),
        candidate.rows[0].invented ? 'STRESS_REPLAY_SOURCE_IDENTITY_INVALID'
            : candidate.rows[0].jahr === Infinity ? 'STRESS_REPLAY_CONTRACT_INVALID'
                : 'STRESS_REPLAY_SOURCE_IDENTITY_FINGERPRINT_MISMATCH',
        'Mutated source identity must fail closed'
    );
}
const reordered = structuredClone(identity);
reordered.rows = [structuredClone(identity.rows[0]), { ...identity.rows[0], jahr: 2 }];
reordered.sourcePrefixLength = 2;
reordered.identityFingerprint = createStressReplaySourceIdentityFingerprint(reordered);
assertContractError(
    () => validateStressReplaySourceIdentityV1(reordered, identityPath),
    'STRESS_REPLAY_SOURCE_IDENTITY_INVALID',
    'Identity length drift must fail before replay'
);
const foreignPath = validPath({
    source: { ...validPath().source, absoluteRunIndex: 3, displayRunNumber: 4 },
    reconciliation: { sourcePrefixMatched: true, sourcePrefixLength: 1 }
});
assertContractError(
    () => validateStressReplaySourceIdentityV1(identity, foreignPath),
    'STRESS_REPLAY_SOURCE_IDENTITY_MISMATCH',
    'Identity cannot be rebound to another source run'
);

console.log('Stress replay contract tests passed.');
