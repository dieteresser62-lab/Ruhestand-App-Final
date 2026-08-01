import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    GOLD_GERMAN_INVESTOR_ANNUAL_RETURNS,
    GOLD_GERMAN_INVESTOR_CHAIN
} from '../app/simulator/gold-german-investor-chain.js';
import {
    annualData,
    HISTORICAL_DATA,
    HISTORICAL_DATA_MANIFEST
} from '../app/simulator/simulator-data.js';
import { canonicalizeHistoricalContractValue } from '../app/simulator/historical-backtest-contract.js';
import { SIMULATION_DATA_INVENTORY } from '../app/simulator/simulation-data-inventory.js';
import { applyAnnualReturnsToPortfolio } from '../app/simulator/simulator-year-portfolio.js';

console.log('--- Gold German-Investor Chain Tests ---');

const directory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(directory, '..');
const sourcePaths = {
    jst: path.join(
        projectRoot,
        'data',
        'historical',
        'global-equity-research-chain',
        'originals',
        'JSTdatasetR6.xlsx'
    ),
    bundesbankGoldDem: path.join(
        projectRoot,
        'data',
        'historical',
        'gold-german-investor-chain',
        'originals',
        'bundesbank-frankfurt-gold-annual-1968-1998.csv'
    ),
    bundesbankUsdEur: path.join(
        projectRoot,
        'data',
        'historical',
        'gold-german-investor-chain',
        'originals',
        'bundesbank-usd-eur-annual-1999-2025.csv'
    ),
    worldBankGoldUsd: path.join(
        projectRoot,
        'data',
        'historical',
        'gold-german-investor-chain',
        'originals',
        'world-bank-cmo-historical-data-annual-2026-07.xlsx'
    )
};

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

function returnPct(current, previous) {
    return ((current / previous) - 1) * 100;
}

console.log('Test 1: chain identity, convention and source bytes are pinned');
assertEqual(GOLD_GERMAN_INVESTOR_CHAIN.schemaVersion, 'GoldGermanInvestorChainV1', 'Gold schema should be versioned');
assertEqual(
    GOLD_GERMAN_INVESTOR_CHAIN.seriesId,
    'gold_german_investor_currency_annual_return',
    'Gold chain should use its canonical neutral ID'
);
assertEqual(GOLD_GERMAN_INVESTOR_CHAIN.coverage.startYear, 1925, 'Gold chain should start in 1925');
assertEqual(GOLD_GERMAN_INVESTOR_CHAIN.coverage.endYear, 2025, 'Gold chain should end in 2025');
assertEqual(GOLD_GERMAN_INVESTOR_CHAIN.coverage.yearCount, 101, 'Gold chain should contain 101 years');
assertEqual(
    GOLD_GERMAN_INVESTOR_CHAIN.returnConvention.timing,
    'simulation year t compares the documented segment-specific level t with level t-1',
    'Gold chain should declare a segmented timing convention'
);
assertEqual(
    JSON.stringify(GOLD_GERMAN_INVESTOR_CHAIN.returnConvention.timingSegments.map(segment => ({
        startYear: segment.startYear,
        endYear: segment.endYear,
        convention: segment.convention
    }))),
    JSON.stringify([
        { startYear: 1925, endYear: 1967, convention: 'end_of_year_policy_price_times_end_of_year_fx' },
        { startYear: 1968, endYear: 1968, convention: 'mixed_seam_1967_end_of_year_to_1968_partial_year_average' },
        { startYear: 1969, endYear: 1998, convention: 'annual_average_to_annual_average_frankfurt_fixing' },
        { startYear: 1999, endYear: 1999, convention: 'mixed_source_and_numeraire_annual_average_seam' },
        { startYear: 2000, endYear: 2025, convention: 'annual_average_world_bank_gold_divided_by_annual_average_usd_eur' }
    ]),
    'Every timing regime should be machine-readable'
);
assertEqual(GOLD_GERMAN_INVESTOR_CHAIN.returnConvention.productCosts, 'excluded', 'Product costs should be excluded');
assertEqual(GOLD_GERMAN_INVESTOR_CHAIN.returnConvention.storageCosts, 'excluded', 'Storage costs should be excluded');
assertEqual(GOLD_GERMAN_INVESTOR_CHAIN.returnConvention.taxes, 'excluded', 'Taxes should be excluded');
assert(Object.isFrozen(GOLD_GERMAN_INVESTOR_CHAIN), 'Generated chain should be deeply immutable');
for (const [sourceId, source] of Object.entries(GOLD_GERMAN_INVESTOR_CHAIN.sourceFiles)) {
    assertEqual(
        sha256(fs.readFileSync(sourcePaths[sourceId])),
        source.sha256,
        `${source.fileName} should retain its pinned source hash`
    );
    assert(typeof source.license === 'string' && source.license.length > 0, `${sourceId} should retain source terms`);
}
console.log('✓ identity, convention and source hashes OK');

console.log('Test 2: all 101 runtime observations come only from the generated chain');
for (let year = 1925; year <= 2025; year += 1) {
    const rate = GOLD_GERMAN_INVESTOR_ANNUAL_RETURNS[year];
    assert(Number.isFinite(rate), `${year} gold return should be finite`);
    assert(rate > -100, `${year} gold return should remain greater than -100 percent`);
    assertEqual(HISTORICAL_DATA[year].gold_eur_perf, rate, `${year} runtime history should use the generated gold return`);
    assertEqual(annualData[year - 1925].gold_eur_perf, rate, `${year} sampling data should use the generated gold return`);
}
assertEqual(Object.keys(GOLD_GERMAN_INVESTOR_ANNUAL_RETURNS).length, 101, 'Return object should contain 101 years');
const runtimeSource = fs.readFileSync(
    path.join(projectRoot, 'app', 'simulator', 'simulator-data.js'),
    'utf8'
);
assertEqual(
    /gold_eur_perf:\s*-?\d/.test(runtimeSource),
    false,
    'Runtime history should not retain hand-maintained numeric gold literals'
);
console.log('✓ contiguous generated-only projection OK');

console.log('Test 3: independent marker formulas lock policy, source and currency seams');
assertClose(
    GOLD_GERMAN_INVESTOR_ANNUAL_RETURNS[1925],
    returnPct(20.67 * 4.2004452471962033, 20.67 * 4.2011511154056205),
    1e-12,
    '1925 should combine the statutory price anchor with JST German FX'
);
assertClose(
    GOLD_GERMAN_INVESTOR_ANNUAL_RETURNS[1933],
    returnPct(34.06 * 2.679528403001072, 20.67 * 4.201680672268907),
    1e-12,
    '1933 should use the official 18 December RFC year-end purchase price and JST year-end FX'
);
assertClose(
    GOLD_GERMAN_INVESTOR_ANNUAL_RETURNS[1934],
    returnPct(35 * 2.488181139586962, 34.06 * 2.679528403001072),
    1e-12,
    '1934 should compare the statutory reset with the official 1933 year-end price'
);
assertClose(
    GOLD_GERMAN_INVESTOR_ANNUAL_RETURNS[1969],
    returnPct(5048, 5106.33),
    1e-12,
    '1969 should be reconstructed from consecutive Frankfurt annual averages'
);
const converted1998EurPerOunce = 16701.93 / 1.95583 / 32.15074656862798;
assertClose(
    GOLD_GERMAN_INVESTOR_ANNUAL_RETURNS[1999],
    returnPct(279 / 1.0658, converted1998EurPerOunce),
    1e-12,
    '1999 should lock the DEM/EUR, unit and source seam'
);
assertClose(
    GOLD_GERMAN_INVESTOR_ANNUAL_RETURNS[2000],
    returnPct(279 / 0.9236, 279 / 1.0658),
    1e-12,
    '2000 should combine World Bank gold with Bundesbank USD/EUR annual averages'
);
assertClose(
    GOLD_GERMAN_INVESTOR_ANNUAL_RETURNS[2025],
    returnPct(3442 / 1.13, 2388 / 1.0824),
    1e-12,
    '2025 should use the pinned current annual source observations'
);
console.log('✓ source and currency marker formulas OK');

console.log('Test 4: zero values and evidence seams are explicit');
assertEqual(
    JSON.stringify(GOLD_GERMAN_INVESTOR_CHAIN.qualitySegments.map(({
        startYear,
        endYear,
        evidenceClass
    }) => ({ startYear, endYear, evidenceClass }))),
    JSON.stringify([
        { startYear: 1925, endYear: 1932, evidenceClass: 'proxy' },
        { startYear: 1933, endYear: 1933, evidenceClass: 'proxy' },
        { startYear: 1934, endYear: 1944, evidenceClass: 'proxy' },
        { startYear: 1945, endYear: 1950, evidenceClass: 'estimated' },
        { startYear: 1951, endYear: 1967, evidenceClass: 'proxy' },
        { startYear: 1968, endYear: 1968, evidenceClass: 'derived' },
        { startYear: 1969, endYear: 1998, evidenceClass: 'derived' },
        { startYear: 1999, endYear: 1999, evidenceClass: 'derived' },
        { startYear: 2000, endYear: 2025, evidenceClass: 'derived' }
    ]),
    'Gold evidence should expose every market, source and currency seam'
);
const zeroYears = Object.entries(GOLD_GERMAN_INVESTOR_ANNUAL_RETURNS)
    .filter(([_year, value]) => value === 0)
    .map(([year]) => Number(year));
assertEqual(
    JSON.stringify(GOLD_GERMAN_INVESTOR_CHAIN.zeroObservations.map(entry => entry.year)),
    JSON.stringify(zeroYears),
    'Every literal zero should have a machine-readable explanation'
);
for (let year = 1945; year <= 1950; year += 1) {
    const observation = GOLD_GERMAN_INVESTOR_CHAIN.zeroObservations
        .find(entry => entry.year === year);
    assertEqual(GOLD_GERMAN_INVESTOR_ANNUAL_RETURNS[year], 0, `${year} bridge should be literal zero`);
    assertEqual(observation?.classification, 'explicit_estimated_bridge', `${year} bridge should be explicitly classified`);
    assert(observation?.explanation.includes('not an observed return'), `${year} bridge should reject an observed-return interpretation`);
}
for (const observation of GOLD_GERMAN_INVESTOR_CHAIN.zeroObservations) {
    if (observation.classification !== 'derived_unchanged_components') continue;
    assert(observation.componentProof !== null, `${observation.year} derived zero should publish component proof`);
    assertEqual(
        observation.componentProof.previousUsdGoldPrice,
        observation.componentProof.currentUsdGoldPrice,
        `${observation.year} derived zero should require an unchanged USD gold anchor`
    );
    assertEqual(
        observation.componentProof.previousGermanCurrencyPerUsd,
        observation.componentProof.currentGermanCurrencyPerUsd,
        `${observation.year} derived zero should require unchanged German FX`
    );
}
assertEqual(GOLD_GERMAN_INVESTOR_CHAIN.gapPolicy.fallbackZeroSegments.length, 0, 'Silent fallback-zero segments should remain forbidden');
assertEqual(GOLD_GERMAN_INVESTOR_CHAIN.gapPolicy.rejectMissingOrNonFinite, true, 'Undeclared gaps should fail closed');
assertEqual(GOLD_GERMAN_INVESTOR_CHAIN.gapPolicy.rejectUnclassifiedZero, true, 'Unclassified zero returns should fail closed');
assertEqual(
    Object.keys(GOLD_GERMAN_INVESTOR_CHAIN.excludedSourceObservations.jstGermanCurrencyPerUsd1946To1949.values).length,
    4,
    'Unused post-war JST observations should be separated from calculation inputs'
);
for (const year of [1933, 1934, 1961, 1968, 1971, 1973, 1999]) {
    assert(
        GOLD_GERMAN_INVESTOR_CHAIN.discontinuities.some(entry => entry.year === year),
        `${year} regime discontinuity should be machine-readable`
    );
}
console.log('✓ explicit zero and evidence policy OK');

console.log('Test 5: runtime application, hashes, manifest and inventory align');
const portfolio = {
    depotTranchesAktien: [],
    depotTranchesGold: [{
        marketValue: 100000,
        costBasis: 100000,
        type: 'gold',
        category: 'gold'
    }],
    liquiditaet: 0
};
applyAnnualReturnsToPortfolio({
    portfolio,
    yearData: {
        rendite: 0,
        gold_eur_perf: GOLD_GERMAN_INVESTOR_ANNUAL_RETURNS[2025],
        zinssatz: 0
    },
    threeBucketInput: {}
});
assertClose(
    portfolio.depotTranchesGold[0].marketValue,
    100000 * (1 + (GOLD_GERMAN_INVESTOR_ANNUAL_RETURNS[2025] / 100)),
    1e-9,
    'Declared gold return should reach the existing gold-holding runtime path exactly once'
);
assertEqual(
    sha256(canonicalizeHistoricalContractValue(GOLD_GERMAN_INVESTOR_ANNUAL_RETURNS)),
    GOLD_GERMAN_INVESTOR_CHAIN.hashes.annualReturnHash,
    'Annual-return hash should cover the generated rate object'
);
const manifestSeries = HISTORICAL_DATA_MANIFEST.series.gold_eur_perf;
assertEqual(manifestSeries.source.status, 'known', 'Runtime manifest should resolve the gold source chain');
assertEqual(manifestSeries.estimatedSegments[0].startYear, 1945, 'Runtime manifest should expose the bridge start');
assertEqual(manifestSeries.estimatedSegments[0].endYear, 1950, 'Runtime manifest should expose the bridge end');
const inventorySeries = SIMULATION_DATA_INVENTORY.historicalSeries.gold_eur_perf;
assertEqual(inventorySeries.rawDataHash.value, GOLD_GERMAN_INVESTOR_CHAIN.hashes.rawDataHash, 'Inventory raw-data hash should match');
assertEqual(inventorySeries.embeddedValueHash.value, GOLD_GERMAN_INVESTOR_CHAIN.hashes.annualReturnHash, 'Inventory value hash should match');
assertEqual(inventorySeries.externalValidationStatus, 'not_validated', 'Codex must not mark its own replacement externally validated');
console.log('✓ runtime and metadata alignment OK');

console.log('Test 6: read-only generator reconstruction is byte-identical');
const verification = spawnSync(
    process.execPath,
    ['scripts/build-gold-german-investor-chain.mjs', '--verify-only'],
    {
        cwd: projectRoot,
        encoding: 'utf8',
        windowsHide: true
    }
);
assertEqual(verification.status, 0, `Gold generator verification should succeed: ${verification.stderr}`);
assert(
    verification.stdout.includes(GOLD_GERMAN_INVESTOR_CHAIN.hashes.annualReturnHash),
    'Gold generator verification should report the committed annual-return hash'
);
console.log('✓ byte-identical generator verification OK');

console.log('✅ Gold German-investor chain tests passed');
