import {
    buildRegimeSignalSnapshot,
    buildRegimeSignalContract,
    calculateSmoothedRunwayTargetMonths,
    calculateRegimeSignalSeverities,
    interpolateRange,
    lerp
} from '../engine/analyzers/regime-signals.mjs';
import TransactionEngine from '../engine/transactions/TransactionEngine.mjs';
import { CONFIG } from '../engine/config.mjs';

console.log('--- Regime Signals Contract Tests ---');

// interpolateRange: ascending drawdown scale
{
    assertClose(interpolateRange(0.10, 0.10, 0.30), 0, 1e-12, 'Ascending scale maps lower threshold to severity 0');
    assertClose(interpolateRange(0.30, 0.10, 0.30), 1, 1e-12, 'Ascending scale maps upper threshold to severity 1');
    assertClose(interpolateRange(0.20, 0.10, 0.30), 0.5, 1e-12, 'Ascending scale maps midpoint to severity 0.5');
    assertClose(interpolateRange(0.09, 0.10, 0.30), 0, 1e-12, 'Ascending scale clamps below range to severity 0');
    assertClose(interpolateRange(0.31, 0.10, 0.30), 1, 1e-12, 'Ascending scale clamps above range to severity 1');
}

// interpolateRange: descending runway scale
{
    assertClose(interpolateRange(60, 60, 36), 0, 1e-12, 'Descending scale maps safe runway to severity 0');
    assertClose(interpolateRange(36, 60, 36), 1, 1e-12, 'Descending scale maps critical runway to severity 1');
    assertClose(interpolateRange(40, 60, 36), 20 / 24, 1e-12, 'Descending scale keeps support-value direction');
    assertClose(interpolateRange(66, 60, 36), 0, 1e-12, 'Descending scale clamps safe side to severity 0');
    assertClose(interpolateRange(30, 60, 36), 1, 1e-12, 'Descending scale clamps crisis side to severity 1');
}

// interpolateRange: invalid inputs and hard-threshold fallback
{
    assertClose(interpolateRange(NaN, 0, 1), 0, 1e-12, 'NaN value returns finite severity 0');
    assertClose(interpolateRange(0.5, Infinity, 1), 0, 1e-12, 'Infinite support value returns finite severity 0');
    assertClose(interpolateRange(0.5, 0, -Infinity), 0, 1e-12, 'Negative infinite support value returns finite severity 0');
    assertClose(interpolateRange(9, 10, 10), 0, 1e-12, 'Identical supports act as hard threshold below boundary');
    assertClose(interpolateRange(10, 10, 10), 1, 1e-12, 'Identical supports act as hard threshold at boundary');
    assertClose(interpolateRange(11, 10, 10), 1, 1e-12, 'Identical supports act as hard threshold above boundary');
    assertClose(interpolateRange(37, 36, 36, { scale: 'descending' }), 0, 1e-12, 'Descending identical supports treat safe side as severity 0');
    assertClose(interpolateRange(36, 36, 36, { scale: 'descending' }), 1, 1e-12, 'Descending identical supports treat boundary as severity 1');
    assertClose(interpolateRange(35, 36, 36, { scale: 'descending' }), 1, 1e-12, 'Descending identical supports treat crisis side as severity 1');
}

// lerp: finite, clamped target interpolation
{
    assertClose(lerp(36, 60, 0), 36, 1e-12, 'lerp severity 0 returns lower target');
    assertClose(lerp(36, 60, 1), 60, 1e-12, 'lerp severity 1 returns upper target');
    assertClose(lerp(36, 60, 0.5), 48, 1e-12, 'lerp midpoint returns midpoint target');
    assertClose(lerp(36, 60, -1), 36, 1e-12, 'lerp clamps severity below 0');
    assertClose(lerp(36, 60, 2), 60, 1e-12, 'lerp clamps severity above 1');
    assertClose(lerp(36, 60, NaN), 36, 1e-12, 'lerp falls back to lower target for invalid severity');
}

// Contract inventory and combined severity calculation
{
    const contract = buildRegimeSignalContract();
    assertEqual(contract.drawdownSeverity.scale, 'ascending', 'Drawdown severity contract is ascending');
    assertEqual(contract.runwaySeverity.scale, 'descending', 'Runway severity contract is descending');
    assert(!contract.drawdownSeverity.hardBoundary, 'Drawdown severity is a soft target signal');
    assert(!contract.runwaySeverity.hardBoundary, 'Runway severity is a soft target signal');

    const severities = calculateRegimeSignalSeverities({
        drawdownPct: 20,
        capeRatio: 30,
        runwayMonths: 40
    });
    assertClose(severities.drawdownSeverity, 0.5, 1e-12, 'Combined severities include drawdown severity');
    assertClose(severities.capeSeverity, 0.5, 1e-12, 'Combined severities include CAPE severity');
    assertClose(severities.runwaySeverity, 20 / 24, 1e-12, 'Combined severities include descending runway severity');

    const hardRunwayContract = {
        ...contract,
        runwaySeverity: {
            ...contract.runwaySeverity,
            severity0Value: 36,
            severity1Value: 36
        }
    };
    const safeHardRunway = calculateRegimeSignalSeverities({
        drawdownPct: 20,
        capeRatio: 30,
        runwayMonths: 37,
        contract: hardRunwayContract
    });
    const crisisHardRunway = calculateRegimeSignalSeverities({
        drawdownPct: 20,
        capeRatio: 30,
        runwayMonths: 35,
        contract: hardRunwayContract
    });
    assertClose(safeHardRunway.runwaySeverity, 0, 1e-12, 'Combined severity honors descending hard runway safe side');
    assertClose(crisisHardRunway.runwaySeverity, 1, 1e-12, 'Combined severity honors descending hard runway crisis side');
}

// Signal snapshot: DOM-free diagnosis payload with raw values and severities
{
    const snapshot = buildRegimeSignalSnapshot({
        abstandVomAthProzent: 20,
        capeRatio: 30,
        runwayMonths: 40
    });

    assertClose(snapshot.severities.drawdownSeverity, 0.5, 1e-12, 'Snapshot includes drawdown severity');
    assertClose(snapshot.severities.capeSeverity, 0.5, 1e-12, 'Snapshot includes CAPE severity');
    assertClose(snapshot.severities.runwaySeverity, 20 / 24, 1e-12, 'Snapshot includes runway severity');
    assert(snapshot.smoothingApplied === true, 'Snapshot marks interpolated severities as smoothing-applied');
    assertEqual(snapshot.factors.drawdownSeverity.source, 'abstandVomAthProzent', 'Snapshot keeps drawdown source');
    assertEqual(snapshot.factors.drawdownSeverity.rawValue, 20, 'Snapshot keeps drawdown raw value');
    assertEqual(snapshot.factors.drawdownSeverity.severityPct, 50, 'Snapshot exposes rounded severity percent');
    assertEqual(snapshot.factors.runwaySeverity.scale, 'descending', 'Snapshot keeps runway scale direction');

    const invalidSnapshot = buildRegimeSignalSnapshot({
        abstandVomAthProzent: NaN,
        capeRatio: Infinity,
        runwayMonths: undefined
    });
    assertClose(invalidSnapshot.severities.drawdownSeverity, 0, 1e-12, 'Invalid drawdown snapshot severity falls back to 0');
    assertEqual(invalidSnapshot.factors.drawdownSeverity.rawValue, null, 'Invalid drawdown raw value is explicit null');
    assert(invalidSnapshot.smoothingApplied === false, 'Invalid all-zero severities do not claim smoothing');
}

// Smoothed runway targets: feature-flagged, monotonic, and bounded
{
    const profil = {
        minRunwayMonths: 24,
        runway: {
            hot_neutral: { total: 36 },
            bear: { total: 60 }
        }
    };

    const disabled = calculateSmoothedRunwayTargetMonths({
        enabled: false,
        profil,
        discreteTargetMonths: 60,
        minRunwayMonths: 24,
        severity: 0.5
    });
    assertClose(disabled.targetMonths, 60, 1e-12, 'Disabled target smoothing returns discrete target');
    assert(disabled.smoothingApplied === false, 'Disabled target smoothing does not mark smoothing');

    const mid = calculateSmoothedRunwayTargetMonths({
        enabled: true,
        profil,
        discreteTargetMonths: 60,
        minRunwayMonths: 24,
        severity: 0.5
    });
    assertClose(mid.targetMonths, 48, 1e-12, 'Enabled target smoothing interpolates runway target months');
    assert(mid.smoothingApplied === true, 'Enabled target smoothing marks changed target');
    assertEqual(mid.lowerTargetMonths, 36, 'Target smoothing exposes lower support');
    assertEqual(mid.upperTargetMonths, 60, 'Target smoothing exposes upper support');

    const lowStress = calculateSmoothedRunwayTargetMonths({
        enabled: true,
        profil,
        discreteTargetMonths: 60,
        minRunwayMonths: 24,
        severity: 0.25
    });
    const highStress = calculateSmoothedRunwayTargetMonths({
        enabled: true,
        profil,
        discreteTargetMonths: 60,
        minRunwayMonths: 24,
        severity: 0.75
    });
    assert(lowStress.targetMonths < highStress.targetMonths, 'Runway target months increase monotonically with severity');

    const invalid = calculateSmoothedRunwayTargetMonths({
        enabled: true,
        profil,
        discreteTargetMonths: 60,
        minRunwayMonths: 24,
        severity: NaN
    });
    assertClose(invalid.targetMonths, 60, 1e-12, 'Invalid smoothing severity falls back to discrete target');
    assert(invalid.smoothingApplied === false, 'Invalid smoothing severity does not mark smoothing');
}

// TransactionEngine target-liquidity integration stays feature-flagged
{
    const originalEnabled = CONFIG.REGIME_SMOOTHING.TARGETS_ENABLED;
    const profil = {
        isDynamic: true,
        minRunwayMonths: 24,
        runway: {
            hot_neutral: { total: 36 },
            bear: { total: 60 }
        }
    };
    const market = {
        sKey: 'bear_deep',
        seiATH: 1,
        regimeSignalSeverities: {
            drawdownSeverity: 0.5
        }
    };
    const inflatedBedarf = { floor: 12000, flex: 0 };
    const input = {
        liquidityRunwayYears: 2,
        floorBedarf: 12000,
        flexBedarf: 0
    };

    try {
        CONFIG.REGIME_SMOOTHING.TARGETS_ENABLED = false;
        const legacyTarget = TransactionEngine.calculateTargetLiquidity(profil, market, inflatedBedarf, input);
        assertClose(legacyTarget, 24000, 1e-12, 'Canonical user runway determines the target independent of market regime');

        CONFIG.REGIME_SMOOTHING.TARGETS_ENABLED = true;
        const smoothedTarget = TransactionEngine.calculateTargetLiquidity(profil, market, inflatedBedarf, input);
        assertClose(smoothedTarget, 24000, 1e-12, 'Legacy smoothing flag cannot override the canonical user runway');
        const smoothedDetails = TransactionEngine.calculateTargetLiquidityDetails(profil, market, inflatedBedarf, input);
        assertClose(smoothedDetails.runwayTargetDiagnostics.targetMonths, 24, 1e-12, 'Target-liquidity details expose the configured target months');
        assert(smoothedDetails.runwayTargetDiagnostics.smoothingActive === false, 'Target-liquidity details keep smoothing inactive');
        assert(smoothedDetails.runwayTargetDiagnostics.smoothingApplied === false, 'Target-liquidity details report no smoothing');
        assert(smoothedDetails.runwayTargetDiagnostics.severityPct === 0, 'Target-liquidity details do not mix market severity into the target');
        assert(smoothedDetails.runwayTargetDiagnostics.hardMinimumMonths === 24, 'Target-liquidity details expose hard minimum runway');

        const explicitTarget = TransactionEngine.calculateTargetLiquidity(profil, market, inflatedBedarf, {
            ...input,
            liquidityRunwayYears: 5
        });
        assertClose(explicitTarget, 60000, 1e-12, 'Explicit user target bypasses target smoothing');

        const fallbackDetails = TransactionEngine.calculateTargetLiquidityDetails(
            { isDynamic: true, minRunwayMonths: 24, runway: { hot_neutral: { total: 36 } } },
            market,
            inflatedBedarf,
            input
        );
        assert(fallbackDetails.runwayTargetDiagnostics.smoothingFallback === false, 'Profile target gaps do not affect the canonical runway contract');
        assert(fallbackDetails.runwayTargetDiagnostics.fallbackReason === null, 'Canonical runway needs no profile-target fallback');
    } finally {
        CONFIG.REGIME_SMOOTHING.TARGETS_ENABLED = originalEnabled;
    }
}

// Regression: boundary-adjacent drawdowns must not create runway target cliffs
{
    const originalEnabled = CONFIG.REGIME_SMOOTHING.TARGETS_ENABLED;
    const profil = {
        isDynamic: true,
        minRunwayMonths: 24,
        runway: {
            hot_neutral: { total: 36 },
            bear: { total: 60 }
        }
    };
    const inflatedBedarf = { floor: 12000, flex: 0 };
    const input = {
        liquidityRunwayYears: 2,
        floorBedarf: 12000,
        flexBedarf: 0
    };

    function targetMonthsForDrawdown(drawdownPct) {
        const severities = calculateRegimeSignalSeverities({ drawdownPct });
        const details = TransactionEngine.calculateTargetLiquidityDetails(
            profil,
            {
                sKey: 'bear_deep',
                seiATH: 1,
                regimeSignalSeverities: severities
            },
            inflatedBedarf,
            input
        );
        return details.runwayTargetDiagnostics.targetMonths;
    }

    try {
        assert(CONFIG.REGIME_SMOOTHING.TARGETS_ENABLED === false, 'Runway target smoothing remains disabled by default');
        CONFIG.REGIME_SMOOTHING.TARGETS_ENABLED = true;

        const lowerBoundary = [9.9, 10.0, 10.1].map(targetMonthsForDrawdown);
        lowerBoundary.forEach(value => assertClose(value, 24, 1e-12, '10% drawdown boundary keeps the configured runway target'));

        const bearBoundary = [19.9, 20.0, 20.1].map(targetMonthsForDrawdown);
        bearBoundary.forEach(value => assertClose(value, 24, 1e-12, '20% drawdown boundary keeps the configured runway target'));

        const upperBoundary = [29.9, 30.0, 30.1].map(targetMonthsForDrawdown);
        upperBoundary.forEach(value => assertClose(value, 24, 1e-12, '30% drawdown boundary keeps the configured runway target'));

        const hardMinimum = calculateSmoothedRunwayTargetMonths({
            enabled: true,
            profil: {
                minRunwayMonths: 42,
                runway: {
                    hot_neutral: { total: 36 },
                    bear: { total: 60 }
                }
            },
            discreteTargetMonths: 36,
            minRunwayMonths: 42,
            severity: 0
        });
        assertClose(hardMinimum.targetMonths, 42, 1e-12, 'Smoothed target never undercuts hard minimum runway');
    } finally {
        CONFIG.REGIME_SMOOTHING.TARGETS_ENABLED = originalEnabled;
    }
}

console.log('--- Regime Signals Contract Tests Completed ---');
