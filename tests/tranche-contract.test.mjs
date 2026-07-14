"use strict";

import {
    calculateCanonicalTrancheValues,
    classifyTranche,
    normalizeTranche,
    normalizeTrancheCollection,
    TRANCHE_FIELD_GROUPS,
    TRANCHE_SCHEMA_VERSION,
    TrancheValidationError
} from '../types/tranche-contract.js';

console.log('--- Tranche Contract Tests ---');

function validTranche(overrides = {}) {
    return {
        schemaVersion: 1,
        trancheId: 'lot-1',
        name: 'Global ETF',
        isin: ' de00 abc 12345 ',
        ticker: ' vwce.de ',
        shares: 10,
        purchasePrice: 100,
        currentPrice: 120,
        purchaseDate: '2024-02-29',
        category: 'equity',
        type: 'aktien_neu',
        tqf: 0.3,
        notes: ' synthetisch ',
        ...overrides
    };
}

function captureValidationError(action, message) {
    let error = null;
    try {
        action();
    } catch (caught) {
        error = caught;
    }
    assert(error instanceof TrancheValidationError, `${message}: strukturierter Fehlertyp`);
    assertEqual(error?.code, 'TRANCHE_VALIDATION_FAILED', `${message}: stabiler Sammelfehlercode`);
    return error;
}

console.log('Test 1: canonical v1 normalization is deterministic and mutation-free');
{
    const input = validTranche();
    const before = JSON.stringify(input);
    const result = normalizeTranche(input);
    assertEqual(result.schemaVersion, TRANCHE_SCHEMA_VERSION, 'Current schema version is retained');
    assertEqual(result.isin, 'DE00ABC12345', 'ISIN is upper-cased without whitespace');
    assertEqual(result.ticker, 'VWCE.DE', 'Ticker is trimmed and upper-cased');
    assertEqual(result.marketValue, 1200, 'Market value is derived from canonical inputs');
    assertEqual(result.costBasis, 1000, 'Cost basis is derived from canonical inputs');
    assertEqual(result.instrumentId, 'isin:DE00ABC12345', 'Instrument identity prefers normalized ISIN');
    assertEqual(result.notes, 'synthetisch', 'Notes are trimmed');
    assertEqual(JSON.stringify(input), before, 'Normalization does not mutate its input');
}

console.log('Test 2: field groups distinguish persistence, derivation, and provenance');
{
    assert(TRANCHE_FIELD_GROUPS.persisted.includes('trancheId'), 'trancheId is a persisted field');
    assert(TRANCHE_FIELD_GROUPS.derived.includes('instrumentId'), 'instrumentId is derived');
    assert(TRANCHE_FIELD_GROUPS.provenance.includes('sourceProfileId'), 'sourceProfileId is merge provenance');
    assert(!TRANCHE_FIELD_GROUPS.persisted.includes('sourceProfileId'), 'Merge provenance is not a required persisted field');
    const persisted = normalizeTranche(validTranche({ sourceProfileId: 'profile-a' }));
    assertEqual('sourceProfileId' in persisted, false, 'Profile-internal normalization removes merge-only provenance');
}

console.log('Test 3: supported v0 records migrate by explicit rules');
{
    const legacy = {
        id: ' legacy-id ',
        name: ' Bond ',
        isin: ' de000bond001 ',
        ticker: ' bond.de ',
        shares: 2,
        purchasePrice: 99,
        purchaseDate: '2020-01-02',
        kind: 'anleihe',
        tqf: 0,
        notes: ''
    };
    const migrated = normalizeTranche(legacy);
    assertEqual(migrated.schemaVersion, 1, 'Legacy record migrates to schema v1');
    assertEqual(migrated.trancheId, 'legacy-id', 'Legacy id migrates to trancheId');
    assertEqual(migrated.type, 'anleihe', 'Legacy kind migrates to type');
    assertEqual(migrated.category, 'bonds', 'Missing legacy category is inferred from type');
    assertEqual(migrated.currentPrice, 99, 'Missing legacy current price uses purchase price');
    assertEqual(migrated.marketValue, 198, 'Missing legacy market value is derived');
    assertEqual('id' in migrated, false, 'Legacy id alias is removed');
    assertEqual('kind' in migrated, false, 'Legacy kind alias is removed');
}

console.log('Test 4: missing legacy ids are deterministic but collection-unique');
{
    const raw = {
        name: 'Synthetic ETF', shares: 1, purchasePrice: 10, currentPrice: 11,
        category: 'equity', type: 'aktien_neu', tqf: 0.3
    };
    const first = normalizeTrancheCollection([raw, raw]);
    const second = normalizeTrancheCollection([raw, raw]);
    assertEqual(first[0].trancheId, second[0].trancheId, 'Legacy id migration is repeatable');
    assert(first[0].trancheId.startsWith('tranche_legacy_'), 'Generated legacy id is visibly migrated');
    assert(first[0].trancheId !== first[1].trancheId, 'Identical legacy lots still receive unique ids by position');
}

console.log('Test 5: classification matrix is disjoint and fail-closed');
{
    assertEqual(classifyTranche({ category: 'equity', type: 'aktien_alt' }), 'equity', 'Valid equity pair classifies');
    assertEqual(classifyTranche({ category: 'bonds', type: 'anleihe' }), 'bonds', 'Valid bond pair classifies');
    const error = captureValidationError(
        () => classifyTranche({ trancheId: 'mismatch', category: 'equity', type: 'anleihe' }),
        'Category/type mismatch'
    );
    assertEqual(error.errors[0].code, 'TRANCHE_CLASSIFICATION_MISMATCH', 'Mismatch has stable field error code');
    assertEqual(error.errors[0].trancheId, 'mismatch', 'Mismatch contains tranche context');
    assertEqual(error.errors[0].field, 'category', 'Mismatch contains field context');
}

console.log('Test 6: duplicate ids and unknown versions are rejected');
{
    const duplicate = captureValidationError(
        () => normalizeTrancheCollection([validTranche(), validTranche({ name: 'Second lot' })]),
        'Duplicate tranche ids'
    );
    assert(duplicate.errors.some(error => error.code === 'TRANCHE_ID_DUPLICATE'), 'Duplicate id is reported');

    const unknownVersion = captureValidationError(
        () => normalizeTranche(validTranche({ schemaVersion: 2 })),
        'Unknown schema version'
    );
    assert(unknownVersion.errors.some(error => error.code === 'TRANCHE_SCHEMA_VERSION_UNSUPPORTED'), 'Unknown version is not interpreted');
}

console.log('Test 7: financial values and TQF reject non-finite and out-of-range data');
{
    const cases = [
        ['shares', Number.NaN, 'TRANCHE_NUMBER_NON_FINITE'],
        ['purchasePrice', Number.POSITIVE_INFINITY, 'TRANCHE_NUMBER_NON_FINITE'],
        ['currentPrice', 0, 'TRANCHE_NUMBER_OUT_OF_RANGE'],
        ['tqf', -0.01, 'TRANCHE_NUMBER_OUT_OF_RANGE'],
        ['tqf', 1.01, 'TRANCHE_NUMBER_OUT_OF_RANGE'],
        ['marketValue', Number.NaN, 'TRANCHE_NUMBER_NON_FINITE']
    ];
    for (const [field, value, code] of cases) {
        const error = captureValidationError(
            () => normalizeTranche(validTranche({ [field]: value })),
            `${field}=${String(value)}`
        );
        assert(error.errors.some(item => item.field === field && item.code === code), `${field} reports ${code}`);
    }

    const missingTqf = captureValidationError(
        () => normalizeTranche({ ...validTranche(), tqf: '' }),
        'Empty TQF'
    );
    assert(missingTqf.errors.some(error => error.code === 'TRANCHE_TQF_REQUIRED'), 'Empty TQF is not converted to zero');
}

console.log('Test 8: dates and current-schema identities are strict');
{
    const invalidDate = captureValidationError(
        () => normalizeTranche(validTranche({ purchaseDate: '2023-02-29' })),
        'Invalid calendar date'
    );
    assert(invalidDate.errors.some(error => error.code === 'TRANCHE_DATE_INVALID'), 'Invalid date is rejected');

    const emptyId = captureValidationError(
        () => normalizeTranche(validTranche({ trancheId: ' ' })),
        'Empty current id'
    );
    assert(emptyId.errors.some(error => error.code === 'TRANCHE_ID_REQUIRED'), 'Current schema does not invent an id');
}

console.log('Test 9: engine records preserve exact values and provenance');
{
    const engineLot = normalizeTranche({
        trancheId: 'profile-a:lot-1',
        sourceProfileId: ' profile-a ',
        name: 'ETF',
        isin: 'de0000000001',
        type: 'aktien_alt',
        category: 'equity',
        marketValue: 100,
        costBasis: 0,
        tqf: 0.3,
        purchaseDate: '2020-01-01'
    }, { mode: 'engine' });
    assertEqual(engineLot.marketValue, 100, 'Engine market value is preserved');
    assertEqual(engineLot.costBasis, 0, 'Zero engine cost basis is valid');
    assertEqual(engineLot.sourceProfileId, 'profile-a', 'Merge provenance is normalized and preserved');

    const legacyAggregate = normalizeTranche({
        trancheId: null,
        name: null,
        isin: null,
        shares: 0,
        purchasePrice: 0,
        currentPrice: 0,
        type: 'aktien_neu',
        category: 'equity',
        marketValue: 150,
        costBasis: 120,
        tqf: 0.3
    }, { mode: 'engine' });
    assert(legacyAggregate.trancheId.startsWith('tranche_legacy_'), 'Nullable legacy engine id migrates deterministically');
    assertEqual(legacyAggregate.marketValue, 150, 'Legacy zero unit placeholders do not replace aggregate market value');
    assertEqual('shares' in legacyAggregate, false, 'Legacy zero unit placeholder is removed from canonical engine output');
}

console.log('Test 10: derived-value helper is strict and mutation-free');
{
    const input = { shares: 3, purchasePrice: 20, currentPrice: 25 };
    const result = calculateCanonicalTrancheValues(input);
    assertEqual(result.marketValue, 75, 'Derived helper calculates market value');
    assertEqual(result.costBasis, 60, 'Derived helper calculates cost basis');
    assertEqual('marketValue' in input, false, 'Derived helper does not mutate input');
}

console.log('--- Tranche Contract Tests Completed ---');
