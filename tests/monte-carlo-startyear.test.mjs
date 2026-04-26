import {
    buildStartYearCdf,
    pickMonteCarloStartYearIndex,
    pickStartYearIndex
} from '../app/simulator/mc-year-sampling.js';
import { annualData } from '../app/simulator/simulator-data.js';
import { prepareHistoricalData } from '../app/simulator/simulator-portfolio.js';

console.log('--- Monte-Carlo Start-Year Sampling Tests ---');

prepareHistoricalData();

// --- TEST 1: Filtered Start Years ---
{
    const startYearFilter = 1970;
    const cdf = buildStartYearCdf('FILTER', annualData, { startYearFilter, startYearHalfLife: 20 });
    assert(cdf && cdf.length === annualData.length, 'CDF should be built for FILTER');

    const firstEligibleIdx = annualData.findIndex(entry => entry.jahr >= startYearFilter);
    assert(firstEligibleIdx >= 0, 'Filter should have at least one eligible year');

    // Deterministische CDF-Samples über r in [0,1).
    for (let r = 0; r < 1; r += 0.02) {
        const idx = pickStartYearIndex(() => r, annualData, cdf);
        assert(idx >= firstEligibleIdx, `Filtered index should be >= ${startYearFilter} (got ${annualData[idx].jahr})`);
    }

    console.log('✅ Filtered start years respected');
}

// --- TEST 2: Recency Weights Prefer Recent Years ---
{
    const cdf = buildStartYearCdf('RECENCY', annualData, { startYearHalfLife: 20 });
    assert(cdf && cdf.length === annualData.length, 'CDF should be built for RECENCY');
    assert(Math.abs(cdf[cdf.length - 1] - 1) < 1e-9, 'CDF should end at 1');

    const weights = cdf.map((value, idx) => idx === 0 ? value : value - cdf[idx - 1]);
    const firstWeight = weights[0];
    const lastWeight = weights[weights.length - 1];
    assert(lastWeight > firstWeight, 'Recent years should have higher weight than earliest years');

    console.log('✅ Recency weights prefer recent years');
}

// --- TEST 3: Uniform Mode Falls Back ---
{
    const cdf = buildStartYearCdf('UNIFORM', annualData);
    assert(cdf === null, 'Uniform mode should not build a CDF');

    const minIndex = 4;
    const idx = pickStartYearIndex(() => 0.5, annualData, null);
    const expected = minIndex + Math.floor(0.5 * (annualData.length - minIndex));
    assert(idx === expected, 'Uniform sampling should respect min start-year index');

    console.log('✅ Uniform mode fallback works');
}

// --- TEST 4: Excluding Estimated History Works ---
{
    const cdf = buildStartYearCdf('FILTER', annualData, {
        startYearFilter: 1925,
        startYearHalfLife: 20,
        excludeEstimatedHistory: true
    });
    assert(cdf && cdf.length === annualData.length, 'CDF should be built when excluding estimated history');

    const firstEligibleIdx = annualData.findIndex(entry => entry.jahr >= 1950);
    assert(firstEligibleIdx >= 0, 'Expected at least one year >= 1950');

    for (let r = 0; r < 1; r += 0.02) {
        const idx = pickStartYearIndex(() => r, annualData, cdf);
        assert(idx >= firstEligibleIdx, `Index must be >= 1950 (got ${annualData[idx].jahr})`);
    }

    console.log('✅ Estimated years can be excluded from start-year sampling');
}

// --- TEST 5: CAPE Sampling Uses Candidate Years ---
{
    const idx = pickMonteCarloStartYearIndex({
        rand: () => 0,
        inputs: { capeRatio: 20, marketCapeRatio: 0 },
        annualData,
        useCapeSampling: true,
        excludeEstimatedHistory: false,
        minStartYearIndex: 4
    });
    assert(idx >= 0 && idx < annualData.length, 'CAPE sampling should return a valid index');
    assert(annualData[idx].jahr >= 1925, 'CAPE sampling should map to a historical year');

    console.log('✅ CAPE sampling returns valid candidate index');
}

// --- TEST 6: CAPE Sampling Falls Back Without CAPE ---
{
    const idx = pickMonteCarloStartYearIndex({
        rand: () => 0.5,
        inputs: { capeRatio: 0, marketCapeRatio: 0 },
        annualData,
        useCapeSampling: true,
        excludeEstimatedHistory: false,
        startYearCdf: null,
        minStartYearIndex: 4
    });
    const expected = 4 + Math.floor(0.5 * (annualData.length - 4));
    assert(idx === expected, 'CAPE sampling without CAPE should fall back to uniform start year');

    console.log('✅ CAPE sampling fallback without CAPE works');
}

console.log('--- Monte-Carlo Start-Year Sampling Tests Completed ---');
