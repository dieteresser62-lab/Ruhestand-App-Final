import { buildStartYearCdf, pickStartYearIndex } from '../monte-carlo-runner.js';
import { annualData } from '../simulator-data.js';
import { prepareHistoricalData } from '../simulator-portfolio.js';

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

console.log('--- Monte-Carlo Start-Year Sampling Tests Completed ---');
