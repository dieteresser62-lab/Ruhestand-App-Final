import {
    LIQUIDITY_RUNWAY_CONTRACT_V1,
    deriveLiquidityRunwayPolicy,
    isValidLiquidityRunwayYears,
    migrateLiquidityRunwayInput,
    resolveLiquidityRunwayYears
} from '../types/liquidity-runway-contract.js';

console.log('--- Liquidity Runway Contract Tests ---');

assertEqual(LIQUIDITY_RUNWAY_CONTRACT_V1.version, 'LiquidityRunwayContractV1', 'contract version is explicit');
assertEqual(LIQUIDITY_RUNWAY_CONTRACT_V1.requestKey, 'liquidityRunwayYears', 'canonical request key is explicit');
assertEqual(LIQUIDITY_RUNWAY_CONTRACT_V1.defaultYears, 5, 'default runway is five years');
assertEqual(LIQUIDITY_RUNWAY_CONTRACT_V1.legacyKeys.targetMonths, 'runwayTargetMonths', 'legacy target key remains documented');
assertEqual(LIQUIDITY_RUNWAY_CONTRACT_V1.legacyKeys.minimumMonths, 'runwayMinMonths', 'legacy minimum key remains documented');
assertEqual(LIQUIDITY_RUNWAY_CONTRACT_V1.legacyMonthDomains.normalization, 'ceil_to_next_half_year', 'legacy rounding policy is explicit');

{
    const resolved = resolveLiquidityRunwayYears({
        liquidityRunwayYears: 6,
        runwayTargetMonths: 36,
        runwayMinMonths: 24
    });
    assertEqual(resolved.years, 6, 'canonical years win over every legacy value');
    assertEqual(resolved.source, 'canonical', 'canonical source is diagnosed');
}

{
    const resolved = resolveLiquidityRunwayYears({
        liquidityRunwayYears: undefined,
        runwayTargetMonths: 42
    });
    assertEqual(resolved.years, 3.5, 'undefined canonical value must not suppress a finite legacy target');
    assertEqual(resolved.source, 'legacy_runway_target_months', 'undefined canonical value diagnoses the migrated source');
}

for (const emptyCanonical of [null, '']) {
    const resolved = resolveLiquidityRunwayYears({
        liquidityRunwayYears: emptyCanonical,
        runwayMinMonths: 24
    });
    assertEqual(resolved.years, 2, 'empty canonical value must fall back to a finite legacy minimum');
}

{
    const resolved = resolveLiquidityRunwayYears({
        liquidityRunwayYears: 'not-a-number',
        runwayTargetMonths: 36
    });
    assert(Number.isNaN(resolved.years), 'non-empty invalid canonical value must fail closed instead of silently migrating');
    assertEqual(resolved.source, 'canonical_invalid', 'invalid canonical value is diagnosed explicitly');
}

{
    const resolved = resolveLiquidityRunwayYears({ runwayTargetMonths: 36, runwayMinMonths: 24 });
    assertEqual(resolved.years, 3, 'legacy target months migrate to years');
    assertEqual(resolved.source, 'legacy_runway_target_months', 'legacy target source is diagnosed');
}

{
    const resolved = resolveLiquidityRunwayYears({ runwayMinMonths: 24 });
    assertEqual(resolved.years, 2, 'legacy minimum is the fallback only when legacy target is absent');
    assertEqual(resolved.source, 'legacy_runway_min_months', 'legacy minimum source is diagnosed');
}

for (const legacyTargetMonths of Array.from({ length: 55 }, (_, index) => 18 + index)) {
    const expectedMonths = Math.ceil(legacyTargetMonths / 6) * 6;
    const resolved = resolveLiquidityRunwayYears({ runwayTargetMonths: legacyTargetMonths });
    const migrated = migrateLiquidityRunwayInput({ runwayTargetMonths: legacyTargetMonths });
    assertEqual(resolved.normalizedMonths, expectedMonths, `legacy target ${legacyTargetMonths} months rounds up to the canonical half-year grid`);
    assertEqual(migrated.liquidityRunwayYears, expectedMonths / 12, `legacy target ${legacyTargetMonths} months remains migratable`);
    assert(resolved.normalizedMonths >= legacyTargetMonths, `legacy target ${legacyTargetMonths} months must never be shortened`);
}

for (const legacyMinimumMonths of Array.from({ length: 49 }, (_, index) => 12 + index)) {
    const expectedMonths = Math.ceil(legacyMinimumMonths / 6) * 6;
    const resolved = resolveLiquidityRunwayYears({ runwayMinMonths: legacyMinimumMonths });
    const migrated = migrateLiquidityRunwayInput({ runwayMinMonths: legacyMinimumMonths });
    assertEqual(resolved.normalizedMonths, expectedMonths, `legacy minimum ${legacyMinimumMonths} months rounds up to the canonical half-year grid`);
    assertEqual(migrated.liquidityRunwayYears, expectedMonths / 12, `legacy minimum ${legacyMinimumMonths} months remains migratable`);
    assert(resolved.normalizedMonths >= legacyMinimumMonths, `legacy minimum ${legacyMinimumMonths} months must never be shortened`);
}

for (const invalidLegacy of [
    { input: { runwayTargetMonths: 17 }, label: 'target below the old UI domain' },
    { input: { runwayTargetMonths: 73 }, label: 'target above the old UI domain' },
    { input: { runwayMinMonths: 11 }, label: 'minimum below the old UI domain' },
    { input: { runwayMinMonths: 61 }, label: 'minimum above the old UI domain' }
]) {
    const resolved = resolveLiquidityRunwayYears(invalidLegacy.input);
    assert(Number.isNaN(resolved.years), `${invalidLegacy.label} must still fail closed`);
}

{
    const resolved = resolveLiquidityRunwayYears({});
    assertEqual(resolved.years, 5, 'missing runway uses the new five-year default');
    assertEqual(resolved.source, 'default', 'default source is diagnosed');
}

{
    const migrated = migrateLiquidityRunwayInput({
        runwayTargetMonths: 42,
        runwayMinMonths: 18,
        targetEq: 80,
        maxSkimPctOfEq: 10
    }, { dropTargetEq: true });
    assertEqual(migrated.liquidityRunwayYears, 3.5, 'migration preserves a legacy 42-month target exactly');
    assert(!Object.hasOwn(migrated, 'runwayTargetMonths'), 'legacy target key is removed');
    assert(!Object.hasOwn(migrated, 'runwayMinMonths'), 'legacy minimum key is removed');
    assert(!Object.hasOwn(migrated, 'targetEq'), 'removed target allocation is not retained');
    assertEqual(migrated.maxSkimPctOfEq, 10, 'unrelated strategy fields survive migration');
}

{
    const policy = deriveLiquidityRunwayPolicy(5);
    assertEqual(policy.targetMonths, 60, 'five years become a 60-month target');
    assertEqual(policy.hardMinimumMonths, 24, 'hard minimum is derived engine policy');
    assertEqual(policy.hardMinimumSource, 'engine_policy_cap_24_months', 'hard minimum is not represented as a user input');
}

{
    const policy = deriveLiquidityRunwayPolicy(1);
    assertEqual(policy.targetMonths, 12, 'one year becomes a 12-month target');
    assertEqual(policy.hardMinimumMonths, 12, 'derived hard minimum never exceeds the configured target');
}

for (const validYears of [1, 1.5, 5, 9.5, 10]) {
    assert(isValidLiquidityRunwayYears(validYears), `${validYears} years should satisfy range and step contract`);
}

for (const invalidYears of [0, 1.25, 10.5, -4, NaN, Infinity]) {
    assert(!isValidLiquidityRunwayYears(invalidYears), `${invalidYears} years should violate range or step contract`);
    let threw = false;
    try {
        deriveLiquidityRunwayPolicy(invalidYears);
    } catch (error) {
        threw = error instanceof RangeError;
    }
    assert(threw, `${invalidYears} years must fail closed before deriving an engine hard minimum`);
}

{
    let threw = false;
    try {
        migrateLiquidityRunwayInput({ liquidityRunwayYears: -4 });
    } catch (error) {
        threw = error instanceof RangeError;
    }
    assert(threw, 'migration must not persist an invalid negative canonical runway');
}

console.log('✅ Liquidity runway contract tests passed');
