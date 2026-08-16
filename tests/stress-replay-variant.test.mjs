import {
    STRESS_REPLAY_CONTRACT_VERSION,
    STRESS_REPLAY_SCHEMA_VERSIONS,
    STRESS_REPLAY_SCOPE,
    STRESS_REPLAY_UNITS_V1,
    STRESS_REPLAY_VARIANT_WHITELIST_VERSION_V1,
    STRESS_REPLAY_VARIANT_WHITELIST_VERSION_V2,
    StressReplayContractError,
    createStressReplayFingerprint,
    createStressReplayVariantFingerprint,
    validateStressReplayVariantV1
} from '../app/simulator/stress-replay-contract.js';
import {
    STRESS_REPLAY_MULTI_FACTOR_WARNING,
    applyStressReplayVariantV1,
    createStressReplayBaselineVariantV1,
    createStressReplayVariantV1,
    previewStressReplayVariantPatchV1
} from '../app/simulator/stress-replay-variant.js';
import { runStressReplayVariantV1 } from '../app/simulator/stress-replay-runner.js';

function assertJsonEqual(actual, expected, message) {
    assertEqual(JSON.stringify(actual), JSON.stringify(expected), message);
}

function assertContractError(callback, code, message, field = null) {
    try {
        callback();
        assert(false, `${message}: expected ${code}`);
    } catch (error) {
        assert(
            error instanceof StressReplayContractError
                && error.code === code
                && (field === null || error.details.fields?.includes(field)),
            `${message}: received ${error?.name || typeof error}/${error?.code || 'without-code'}`
        );
    }
}

function baselineInputs(overrides = {}) {
    return {
        startAlter: 65,
        geschlecht: 'm',
        partner: { aktiv: false },
        startFloorBedarf: 24000,
        startFlexBedarf: 12000,
        minimumFlexAnnual: 6000,
        depotTranchesAktien: [{ trancheId: 'equity-1', marketValue: 100 }],
        depotTranchesGold: [],
        liquidityRunwayYears: 5,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5,
        decumulation: {
            mode: '3_bucket_jilge',
            bondTargetFactor: 2,
            drawdownTrigger: -0.2,
            bondRefillThreshold: 0.1
        },
        dynamicFlex: true,
        horizonMethod: 'survival_quantile',
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoActive: false,
        goGoMultiplier: 1,
        longevityMode: 'buffer_years',
        longevityQuantileShift: 0.05,
        longevityRelativePct: 0.05,
        longevityBufferYears: 2,
        rentAdjMode: 'fix',
        rentAdjPct: 0,
        ...overrides
    };
}

console.log('Test 1: baseline and alternatives are versioned, immutable and exact');
const inputs = baselineInputs();
const inputsBefore = JSON.stringify(inputs);
const baseline = createStressReplayBaselineVariantV1({ baselineInputs: inputs });
assertEqual(baseline.role, 'baseline', 'Baseline role must be explicit');
assertEqual(baseline.whitelistVersion, STRESS_REPLAY_VARIANT_WHITELIST_VERSION_V2, 'New variants must use V2');
assertJsonEqual(baseline.patch, {}, 'Baseline patch must be empty');
assert(Object.isFrozen(baseline) && Object.isFrozen(baseline.patch), 'Baseline contract must be deeply immutable');

const skimVariant = createStressReplayVariantV1({
    id: 'skim-12',
    label: 'Skim 12',
    baselineInputs: inputs,
    patch: { strategy: { maxSkimPctOfEq: 12 } }
});
const applied = applyStressReplayVariantV1({ baselineInputs: inputs, variant: skimVariant });
assertEqual(applied.maxSkimPctOfEq, 12, 'Whitelisted value must map to its real input path');
assertEqual(applied.minimumFlexAnnual, 6000, 'Fixed need interpretation must remain unchanged');
assertJsonEqual(applied.depotTranchesAktien, inputs.depotTranchesAktien, 'Real tranches must remain unchanged');
assertEqual(JSON.stringify(inputs), inputsBefore, 'Variant creation and application must not mutate baseline inputs');
assert(Object.isFrozen(applied), 'Applied inputs must be immutable at their root');

console.log('Test 2: legacy V1 remains exact while V2 allows only the three new need fields');
for (const [field, patch] of [
    ['strategy.goldAktiv', { strategy: { goldAktiv: false } }],
    ['strategy.startAlter', { strategy: { startAlter: 70 } }],
    ['strategy.tranchen', { strategy: { tranchen: [] } }],
    ['person.name', { person: { name: 'X' } }]
]) {
    assertContractError(
        () => createStressReplayVariantV1({ id: `bad-${field}`, label: 'Bad', baselineInputs: inputs, patch }),
        'STRESS_REPLAY_VARIANT_FIELD_FORBIDDEN',
        `${field} must be rejected`,
        field
    );
}
assertContractError(
    () => createStressReplayVariantV1({
        id: 'legacy-min-flex',
        label: 'Legacy minimum flex',
        baselineInputs: inputs,
        patch: { strategy: { minimumFlexAnnual: 1 } },
        whitelistVersion: STRESS_REPLAY_VARIANT_WHITELIST_VERSION_V1
    }),
    'STRESS_REPLAY_VARIANT_FIELD_FORBIDDEN',
    'V1 minimum flex must remain forbidden',
    'strategy.minimumFlexAnnual'
);
const needsVariant = createStressReplayVariantV1({
    id: 'needs-zero',
    label: 'Needs zero',
    baselineInputs: inputs,
    patch: { strategy: { startFloorBedarf: 0, startFlexBedarf: 0, minimumFlexAnnual: 0 } }
});
assertJsonEqual(
    needsVariant.patch.strategy,
    { startFloorBedarf: 0, startFlexBedarf: 0, minimumFlexAnnual: 0 },
    'V2 must retain all explicit zero leaves against positive baselines'
);
const zeroApplied = applyStressReplayVariantV1({ baselineInputs: inputs, variant: needsVariant });
assertEqual(zeroApplied.startFloorBedarf, 0, 'Applied floor zero must survive');
assertEqual(zeroApplied.startFlexBedarf, 0, 'Applied flex zero must survive');
assertEqual(zeroApplied.minimumFlexAnnual, 0, 'Applied minimum-flex zero must survive');
assertContractError(
    () => createStressReplayVariantV1({
        id: 'invalid-relation',
        label: 'Invalid relation',
        baselineInputs: inputs,
        patch: { strategy: { startFlexBedarf: 0 } }
    }),
    'STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX',
    'Patch flex must be checked against baseline minimum flex'
);
assertContractError(
    () => createStressReplayVariantV1({
        id: 'future',
        label: 'Future',
        baselineInputs: inputs,
        patch: {},
        whitelistVersion: 'StressReplayVariantWhitelistV3'
    }),
    'STRESS_REPLAY_VERSION_UNSUPPORTED',
    'Unknown whitelist version must fail closed'
);

console.log('Test 3: mode-bound fields retain their controller and count as one factor');
const bucketVariant = createStressReplayVariantV1({
    id: 'bucket-factor',
    label: 'Bucket factor',
    baselineInputs: inputs,
    patch: { strategy: { decumulation: { bondTargetFactor: 3 } } }
});
assertEqual(bucketVariant.patch.strategy.decumulation.mode, '3_bucket_jilge', 'Conditional patch must retain its effective mode');
assertEqual(bucketVariant.materialChangeGroups.length, 1, 'Mode and subfield must count as one factor');
assertEqual(bucketVariant.warnings.length, 0, 'One conditional factor must not produce a multi-factor warning');

const switchedBucketVariant = createStressReplayVariantV1({
    id: 'bucket-mode-switch',
    label: 'Switch to bucket',
    baselineInputs: baselineInputs({
        decumulation: { mode: 'standard', bondTargetFactor: 2, drawdownTrigger: -0.2, bondRefillThreshold: 0.1 }
    }),
    patch: { strategy: { decumulation: { mode: '3_bucket_jilge', bondTargetFactor: 3 } } }
});
assertEqual(switchedBucketVariant.patch.strategy.decumulation.mode, '3_bucket_jilge', 'A changed controller must not be overwritten by the baseline mode');
assertEqual(switchedBucketVariant.patch.strategy.decumulation.bondTargetFactor, 3, 'Newly active bucket value must survive a mode switch');

const longevityVariant = createStressReplayVariantV1({
    id: 'longevity-buffer',
    label: 'Longevity buffer',
    baselineInputs: inputs,
    patch: { strategy: { longevityBufferYears: 4 } }
});
assertEqual(longevityVariant.patch.strategy.longevityMode, 'buffer_years', 'Longevity subfield must retain its effective mode');
assertEqual(longevityVariant.materialChangeGroups.length, 1, 'Longevity mode and value must be one factor');

const standardInputs = baselineInputs({
    decumulation: { mode: 'standard', bondTargetFactor: 2, drawdownTrigger: -0.2, bondRefillThreshold: 0.1 }
});
const inactivePreview = previewStressReplayVariantPatchV1({
    baselineInputs: standardInputs,
    patch: { strategy: { decumulation: { bondTargetFactor: 3 } } }
});
assertJsonEqual(inactivePreview.patch, {}, 'Inactive 3-bucket subfield must normalize away');

console.log('Test 4: no-op alternatives fail and independent changes get a multi-factor marker');
for (const [field, baselineValue, acceptedValues] of [
    ['maxSkimPctOfEq', 10, [0, 50]],
    ['maxBearRefillPctOfEq', 5, [0, 70]]
]) {
    for (const value of acceptedValues) {
        const boundedVariant = createStressReplayVariantV1({
            id: `${field}-${value}`,
            label: `${field} ${value}`,
            baselineInputs: baselineInputs({ [field]: baselineValue }),
            patch: { strategy: { [field]: value } }
        });
        assertEqual(
            applyStressReplayVariantV1({
                baselineInputs: baselineInputs({ [field]: baselineValue }),
                variant: boundedVariant
            })[field],
            value,
            `${field} direct creation must preserve boundary ${value}`
        );
    }
}
for (const [field, value] of [
    ['maxSkimPctOfEq', -0.1],
    ['maxSkimPctOfEq', 50.1],
    ['maxBearRefillPctOfEq', -0.1],
    ['maxBearRefillPctOfEq', 70.1]
]) {
    assertContractError(
        () => createStressReplayVariantV1({
            id: `invalid-${field}-${value}`,
            label: 'Invalid percentage',
            baselineInputs: inputs,
            patch: { strategy: { [field]: value } }
        }),
        'STRESS_REPLAY_CONTRACT_INVALID',
        `${field} direct creation must reject ${value}`
    );
}
const persistedOutOfRange = {
    ...skimVariant,
    patch: { strategy: { maxSkimPctOfEq: 50.1 } }
};
persistedOutOfRange.variantFingerprint = createStressReplayVariantFingerprint(persistedOutOfRange);
assertContractError(
    () => validateStressReplayVariantV1(persistedOutOfRange),
    'STRESS_REPLAY_CONTRACT_INVALID',
    'Recomputed variant fingerprint must not bypass percentage bounds'
);
assertContractError(
    () => createStressReplayVariantV1({
        id: 'zero-noop',
        label: 'Zero no-op',
        baselineInputs: baselineInputs({ startFloorBedarf: 0 }),
        patch: { strategy: { startFloorBedarf: 0 } }
    }),
    'STRESS_REPLAY_VARIANT_NO_OP',
    'Explicit zero against zero must be recognized before no-op rejection'
);
assertContractError(
    () => createStressReplayVariantV1({
        id: 'noop',
        label: 'No-op',
        baselineInputs: inputs,
        patch: { strategy: { maxSkimPctOfEq: 10 } }
    }),
    'STRESS_REPLAY_VARIANT_NO_OP',
    'Unchanged values must not create an alternative'
);
assertContractError(
    () => createStressReplayVariantV1({
        id: 'baseline',
        label: 'Reserved id',
        baselineInputs: inputs,
        patch: { strategy: { maxSkimPctOfEq: 12 } }
    }),
    'STRESS_REPLAY_CONTRACT_INVALID',
    'Alternative variants must not use the reserved baseline id'
);
const multi = createStressReplayVariantV1({
    id: 'multi',
    label: 'Two factors',
    baselineInputs: inputs,
    patch: { strategy: { maxSkimPctOfEq: 12, dynamicFlex: false } }
});
assertEqual(multi.materialChangeGroups.length, 2, 'Independent material changes must remain visible');
assertEqual(multi.warnings[0].code, STRESS_REPLAY_MULTI_FACTOR_WARNING, 'Multi-factor warning must be machine-readable');

console.log('Test 5: normalized fingerprints ignore labels but reject content tampering');
const relabeled = createStressReplayVariantV1({
    id: 'skim-12',
    label: 'A different display label',
    baselineInputs: inputs,
    patch: { strategy: { maxSkimPctOfEq: 12 } }
});
assertEqual(skimVariant.variantFingerprint.value, relabeled.variantFingerprint.value, 'Display labels must not affect fingerprints');
assertEqual(skimVariant.normalizedInputFingerprint.value, relabeled.normalizedInputFingerprint.value, 'Equal normalized inputs need equal fingerprints');
assertEqual(
    skimVariant.variantFingerprint.value,
    createStressReplayVariantFingerprint(skimVariant).value,
    'Variant creation and validation must share the canonical fingerprint projection'
);
assertContractError(
    () => validateStressReplayVariantV1({ ...skimVariant, id: 'tampered' }),
    'STRESS_REPLAY_VARIANT_FINGERPRINT_MISMATCH',
    'Variant contract tampering must fail'
);
const nonCanonical = {
    ...skimVariant,
    patch: { strategy: { ...skimVariant.patch.strategy, decumulation: { bondTargetFactor: 9 } } }
};
nonCanonical.variantFingerprint = createStressReplayFingerprint(
    Object.fromEntries(Object.entries(nonCanonical).filter(([key]) => key !== 'variantFingerprint'))
);
assertContractError(
    () => validateStressReplayVariantV1(nonCanonical),
    'STRESS_REPLAY_CONTRACT_INVALID',
    'Persisted variants must not carry inactive non-canonical fields'
);
const renamedBaseline = {
    ...baseline,
    id: 'not-baseline'
};
renamedBaseline.variantFingerprint = createStressReplayVariantFingerprint(renamedBaseline);
assertContractError(
    () => validateStressReplayVariantV1(renamedBaseline),
    'STRESS_REPLAY_CONTRACT_INVALID',
    'Baseline-role variants must use the reserved baseline id'
);
assertContractError(
    () => applyStressReplayVariantV1({ baselineInputs: baselineInputs({ maxSkimPctOfEq: 9 }), variant: skimVariant }),
    'STRESS_REPLAY_BASELINE_FINGERPRINT_MISMATCH',
    'A variant must not apply to a different baseline'
);

function replayPath() {
    return {
        schemaVersion: STRESS_REPLAY_SCHEMA_VERSIONS.path,
        contractVersion: STRESS_REPLAY_CONTRACT_VERSION,
        scope: STRESS_REPLAY_SCOPE,
        source: {
            requestFingerprint: createStressReplayFingerprint({ request: 1 }),
            seed: 1,
            rngMode: 'per-run-seed',
            absoluteRunIndex: 0,
            displayRunNumber: 1,
            scenarioKey: 'fixture',
            selectionMetric: 'nominal_terminal_wealth_eur',
            tieBreak: 'smallest_absolute_run_index',
            startYearIndex: 0
        },
        breakOnRuin: true,
        dataFingerprint: createStressReplayFingerprint({ data: 1 }),
        engineFingerprint: createStressReplayFingerprint({ engine: 1 }),
        units: { ...STRESS_REPLAY_UNITS_V1 },
        horizonYears: 1,
        effectiveLength: 1,
        terminalStatus: 'horizon_exhausted',
        initialMarketDataHist: [{ endeVJ: 100, endeVJ_1: 100, endeVJ_2: 100, endeVJ_3: 100 }],
        years: [{
            yearIndex: 0,
            recordType: 'financial_year',
            financiallyEvaluable: true,
            historicalYear: 2000,
            equityReturnPct: 0,
            goldReturnPct: 0,
            cashReturnPct: 0,
            inflationPct: 0,
            wageGrowthPct: 0,
            capeRatio: 20,
            regime: 'NORMAL',
            stressEvents: [],
            tailRiskEvents: [],
            householdEvents: [{ type: 'household_state', p1Alive: 1, p2Alive: null, effectiveFlexFactor: 1 }]
        }],
        reconciliation: { sourcePrefixMatched: true, sourcePrefixLength: 1 }
    };
}

console.log('Test 6: alternative runner uses normalized inputs without baseline reconciliation');
let observedSkim = null;
const variantResult = runStressReplayVariantV1({
    path: replayPath(),
    baselineInputs: inputs,
    variant: skimVariant,
    dependencies: {
        initMcRunState: () => ({
            portfolio: { depotTranchesAktien: [{ marketValue: 100, costBasis: 80 }], depotTranchesGold: [], liquiditaet: 0 },
            cumulativeInflationFactor: 1,
            marketDataHist: {}
        }),
        simulateOneYear(state, adjustedInputs) {
            observedSkim = adjustedInputs.maxSkimPctOfEq;
            return {
                kind: 'success',
                isRuin: false,
                newState: state,
                totalTaxesThisYear: 0,
                logData: {
                    wertAktien: 100,
                    wertGold: 0,
                    liquiditaet: 0,
                    entscheidung: { jahresEntnahme: 0 },
                    floor_brutto: 0,
                    rente1: 0,
                    rente2: 0,
                    renteSum: 0,
                    FlexRatePct: 100,
                    flex_erfuellt_nominal: 0,
                    QuoteEndPct: 0,
                    RealReturnEquityPct: 0,
                    RealReturnGoldPct: 0,
                    jahresentnahme_real: 0
                },
                ui: { vpw: null }
            };
        }
    }
});
assertEqual(observedSkim, 12, 'Runner must receive the applied whitelisted input');
assertEqual(variantResult.role, 'alternative', 'Result role must preserve variant identity');
assertEqual(variantResult.variantId, 'skim-12', 'Result must preserve stable variant id');
assertEqual(variantResult.reconciliation.reason, 'alternative_not_source_reconciled', 'Alternative must not be compared to source rows');

console.log('Stress replay variant tests passed.');
