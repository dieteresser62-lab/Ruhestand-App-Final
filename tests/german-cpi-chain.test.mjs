import { createHash } from 'node:crypto';
import fs from 'node:fs';
import {
    GERMAN_CPI_INFLATION_RATES,
    GERMAN_CPI_RESEARCH_CHAIN,
    GERMAN_CPI_SYNTHETIC_INDEX_LEVELS
} from '../app/simulator/german-cpi-chain.js';
import {
    annualData,
    HISTORICAL_DATA,
    HISTORICAL_DATA_MANIFEST
} from '../app/simulator/simulator-data.js';
import { canonicalizeHistoricalContractValue } from '../app/simulator/historical-backtest-contract.js';
import { SIMULATION_DATA_INVENTORY } from '../app/simulator/simulation-data-inventory.js';

console.log('--- German CPI Research Chain Tests ---');

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

console.log('Test 1: identity, period, source files and licences are pinned');
assertEqual(GERMAN_CPI_RESEARCH_CHAIN.schemaVersion, 'GermanCpiResearchChainV1', 'Chain schema should be versioned');
assertEqual(GERMAN_CPI_RESEARCH_CHAIN.seriesId, 'german_consumer_price_inflation', 'Chain should use the canonical neutral ID');
assertEqual(GERMAN_CPI_RESEARCH_CHAIN.period.startYear, 1925, 'Chain should start in 1925');
assertEqual(GERMAN_CPI_RESEARCH_CHAIN.period.endYear, 2025, 'Chain should end in 2025');
assertEqual(
    GERMAN_CPI_RESEARCH_CHAIN.validation.publishedRateVsRoundedLevelTolerancePp,
    0.05,
    'Official rates should use the one-tick-discriminating rounded-level cross-check'
);
assert(Object.isFrozen(GERMAN_CPI_RESEARCH_CHAIN), 'Generated chain should be deeply immutable');
assert(
    GERMAN_CPI_RESEARCH_CHAIN.selectionRule.includes('HICP/HVPI')
        && GERMAN_CPI_RESEARCH_CHAIN.selectionRule.includes('excluded'),
    'The national CPI selection must explicitly exclude HICP/HVPI'
);

const sourcePaths = {
    jst: '../data/historical/global-equity-research-chain/originals/JSTdatasetR6.xlsx',
    destatisLongSeries: '../data/historical/german-cpi-chain/originals/destatis-vpi-lange-reihen-2025-06.xlsx',
    destatisCurrent: '../data/historical/german-cpi-chain/originals/destatis-vpi-current-2026-07-10.html'
};
for (const [sourceId, source] of Object.entries(GERMAN_CPI_RESEARCH_CHAIN.sourceFiles)) {
    const bytes = fs.readFileSync(new URL(sourcePaths[sourceId], import.meta.url));
    assertEqual(sha256(bytes), source.sha256, `${source.fileName} should match its pinned source hash`);
    assert(typeof source.license === 'string' && source.license.length > 0, `${sourceId} should carry a source licence`);
}
assertEqual(
    GERMAN_CPI_RESEARCH_CHAIN.rawDataHash,
    '83841d2c11df3a5e193aa07db3bdfe815cbbeea7f9f81c3526b197702a46bdb4',
    'Combined raw-data hash should remain pinned'
);
console.log('✓ identity, inputs and licences OK');

console.log('Test 2: all 101 rates and synthetic levels are contiguous and projected at runtime');
let previousLevel = GERMAN_CPI_RESEARCH_CHAIN.base.syntheticLevel;
for (let year = 1925; year <= 2025; year += 1) {
    const rate = GERMAN_CPI_INFLATION_RATES[year];
    const level = GERMAN_CPI_SYNTHETIC_INDEX_LEVELS[year];
    assert(Number.isFinite(rate) && rate > -100, `${year} annual CPI rate should be finite and above -100%`);
    assert(Number.isFinite(level) && level > 0, `${year} synthetic CPI level should be finite and positive`);
    assertClose(level, previousLevel * (1 + (rate / 100)), 1e-9, `${year} level should chain from its rate`);
    assertEqual(HISTORICAL_DATA[year].inflation_de, rate, `${year} runtime history should use the generated CPI rate`);
    assertEqual(annualData[year - 1925].inflation, rate, `${year} sampling data should use the generated CPI rate`);
    previousLevel = level;
}
assertEqual(Object.keys(GERMAN_CPI_INFLATION_RATES).length, 101, 'Rate chain should contain 101 years');
assertEqual(Object.keys(GERMAN_CPI_SYNTHETIC_INDEX_LEVELS).length, 101, 'Synthetic index should contain 101 years');
console.log('✓ contiguous chain and runtime projection OK');

console.log('Test 3: source and territory seams are exact, gap-free and stable');
assertEqual(
    JSON.stringify(GERMAN_CPI_RESEARCH_CHAIN.segments.map(({
        startYear,
        endYear,
        evidenceClass
    }) => ({ startYear, endYear, evidenceClass }))),
    JSON.stringify([
        { startYear: 1925, endYear: 1949, evidenceClass: 'proxy' },
        { startYear: 1950, endYear: 1962, evidenceClass: 'official' },
        { startYear: 1963, endYear: 1991, evidenceClass: 'official' },
        { startYear: 1992, endYear: 2024, evidenceClass: 'official' },
        { startYear: 2025, endYear: 2025, evidenceClass: 'official' }
    ]),
    'Generated evidence segments should match the canonical chain contract'
);
assertEqual(
    GERMAN_CPI_RESEARCH_CHAIN.segments[1].populationQualifier,
    'proxy_population',
    'The 1950-1962 official household series should retain its population qualifier'
);
assertClose(GERMAN_CPI_INFLATION_RATES[1949], 7.035203603123863, 1e-12, '1949 should remain the JST transition endpoint');
assertClose(
    GERMAN_CPI_RESEARCH_CHAIN.proxyQualification.historicalDiscontinuities[1]
        .officialAlternative.ratePct,
    -1.0526315789473717,
    1e-12,
    '1949 should expose the official level-derived alternative'
);
assertClose(
    GERMAN_CPI_RESEARCH_CHAIN.proxyQualification.historicalDiscontinuities[1].differencePp,
    8.087835182071234,
    1e-12,
    '1949 should quantify the proxy splice difference'
);
assert(
    GERMAN_CPI_RESEARCH_CHAIN.proxyQualification.levelQuantization
        .interpretation.includes('integer-quantized'),
    'Proxy metadata should disclose the coarse integer-level resolution'
);
assert(
    GERMAN_CPI_RESEARCH_CHAIN.proxyQualification.historicalDiscontinuities[0]
        .event.includes('price controls'),
    'Proxy metadata should name the price-control period'
);
assertEqual(
    GERMAN_CPI_RESEARCH_CHAIN.proxyQualification.monetaryAssetDiscontinuity
        .balanceConversion.nominalBalanceLossPct,
    93.5,
    'Proxy metadata should quantify the 100:6.5 write-down of major Reichsmark balances'
);
assert(
    GERMAN_CPI_RESEARCH_CHAIN.proxyQualification.monetaryAssetDiscontinuity
        .interpretation.includes('continuous-currency deflator'),
    'Proxy metadata should prohibit continuous-currency monetary-asset interpretation across 1948'
);
assertEqual(GERMAN_CPI_INFLATION_RATES[1950], -6.4, '1950 should use the medium-income household series');
assertEqual(GERMAN_CPI_INFLATION_RATES[1962], 2.8, '1962 should close the medium-income household series');
assertEqual(GERMAN_CPI_INFLATION_RATES[1963], 3, '1963 should start the all-private-household series');
assertEqual(GERMAN_CPI_INFLATION_RATES[1991], 3.7, '1991 should close the West German all-household series');
assertEqual(GERMAN_CPI_INFLATION_RATES[1992], 5, '1992 should start the German VPI segment');
assertEqual(GERMAN_CPI_INFLATION_RATES[2024], 2.2, '2024 should use the reconciled official annual rate');
assertEqual(GERMAN_CPI_INFLATION_RATES[2025], 2.2, '2025 should use the official annual rate');
console.log('✓ seams and official reference years OK');

console.log('Test 4: generated hashes, manifest and inventory remain aligned');
assertEqual(
    sha256(canonicalizeHistoricalContractValue(GERMAN_CPI_INFLATION_RATES)),
    GERMAN_CPI_RESEARCH_CHAIN.annualRateHash,
    'Annual-rate hash should cover the generated rate object'
);
assertEqual(
    sha256(canonicalizeHistoricalContractValue(GERMAN_CPI_SYNTHETIC_INDEX_LEVELS)),
    GERMAN_CPI_RESEARCH_CHAIN.indexLevelHash,
    'Synthetic-index hash should cover the generated level object'
);
assertEqual(
    HISTORICAL_DATA_MANIFEST.series.inflation_de.source.status,
    'known',
    'Runtime manifest should resolve the German CPI source chain'
);
assertEqual(
    HISTORICAL_DATA_MANIFEST.series.inflation_de.estimatedSegments[0].endYear,
    1949,
    'Runtime manifest should end the inflation proxy before the official chain'
);
assertEqual(
    SIMULATION_DATA_INVENTORY.historicalSeries.inflation_de.rawDataHash.value,
    GERMAN_CPI_RESEARCH_CHAIN.rawDataHash,
    'Inventory raw-data hash should match the generated chain'
);
assertEqual(
    SIMULATION_DATA_INVENTORY.historicalSeries.inflation_de.embeddedValueHash.value,
    GERMAN_CPI_RESEARCH_CHAIN.annualRateHash,
    'Inventory value hash should match the generated rate chain'
);
console.log('✓ hashes and metadata alignment OK');

console.log('Test 5: runtime source has no remaining hand-maintained inflation literals');
{
    const runtimeSource = fs.readFileSync(new URL('../app/simulator/simulator-data.js', import.meta.url), 'utf8');
    const generatedSource = fs.readFileSync(new URL('../app/simulator/german-cpi-chain.js', import.meta.url), 'utf8');
    assertEqual(
        /inflation_de:\s*-?\d/.test(runtimeSource),
        false,
        'Runtime history should not retain numeric inflation literals'
    );
    assert(generatedSource.includes('CC BY-NC-SA 4.0'), 'Generated data should carry the JST licence notice');
    assert(
        generatedSource.includes('Data Licence Germany - attribution - 2.0'),
        'Generated data should carry the Destatis licence notice'
    );
}
console.log('✓ generated-only runtime projection and licence notices OK');

console.log('✅ German CPI research chain tests passed');
