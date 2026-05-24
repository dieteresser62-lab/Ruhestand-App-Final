import { buildBalanceHealthBucketDiagnostics } from '../app/balance/balance-health-bucket.js';

console.log('--- Balance Health Bucket Tests ---');

{
    const diagnostics = buildBalanceHealthBucketDiagnostics({
        tagesgeld: 50000,
        geldmarktEtf: 120000,
        healthBucket: {
            enabled: true,
            initialAmount: 150000,
            targetMode: 'inflation_indexed_diagnostic'
        }
    }, { cumulativeInflationFactor: 1.2 });

    assertEqual(diagnostics.lockedAmount, 150000, 'Bucket should reserve target from cash-like liquidity');
    assertEqual(diagnostics.lockedFromMoneyMarket, 120000, 'Money market should be reserved first');
    assertEqual(diagnostics.lockedFromCash, 30000, 'Remaining reserve should come from cash');
    assertEqual(diagnostics.operativeLiquidity, 20000, 'Operational liquidity should exclude reserved bucket');
    assertEqual(diagnostics.targetInflationAdjusted, 180000, 'Inflation-indexed diagnostic target should be computed');
    assertEqual(diagnostics.targetGap, 30000, 'Inflation target gap should be exposed');
    assertEqual(diagnostics.releasePolicy, 'diagnostic_only', 'Balance should keep health bucket policy diagnostic-only');
    assertEqual(diagnostics.releaseAllowed, false, 'Balance should not automatically unlock the health bucket');
    assertEqual(diagnostics.releasedAmount, 0, 'Balance should not add a released amount');
}

{
    const diagnostics = buildBalanceHealthBucketDiagnostics({
        tagesgeld: 20000,
        geldmarktEtf: 30000,
        healthBucket: {
            enabled: true,
            initialAmount: 150000
        }
    });

    assertEqual(diagnostics.lockedAmount, 50000, 'Reserve should be capped to available cash-like liquidity');
    assertEqual(diagnostics.operativeLiquidity, 0, 'Operational liquidity should not go negative');
    assert(diagnostics.warning.includes('nicht vollständig gedeckt'), 'Cap warning should be visible');
}

{
    const diagnostics = buildBalanceHealthBucketDiagnostics({
        tagesgeld: 20000,
        geldmarktEtf: 30000,
        healthBucket: {
            enabled: false,
            initialAmount: 150000
        }
    });

    assertEqual(diagnostics.lockedAmount, 0, 'Disabled bucket should not reserve liquidity');
    assertEqual(diagnostics.operativeLiquidity, 50000, 'Disabled bucket should leave all liquidity operative');
}

console.log('✅ Balance health bucket tests passed');
