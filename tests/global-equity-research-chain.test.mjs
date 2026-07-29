import { createHash } from 'node:crypto';
import fs from 'node:fs';
import {
    GLOBAL_EQUITY_RESEARCH_CHAIN,
    GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS
} from '../app/simulator/global-equity-research-chain.js';
import {
    annualData,
    DATASET_META,
    ESTIMATED_HISTORY_CUTOFF_YEAR,
    ESTIMATED_HISTORY_MAX_YEAR,
    HISTORICAL_DATA,
    HISTORICAL_DATA_MANIFEST
} from '../app/simulator/simulator-data.js';
import { canonicalizeHistoricalContractValue } from '../app/simulator/historical-backtest-contract.js';

console.log('--- Global Equity Research Chain Tests ---');

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

function parseCsvLine(line) {
    const values = [];
    let value = '';
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
        const character = line[index];
        if (character === '"') {
            if (quoted && line[index + 1] === '"') {
                value += '"';
                index += 1;
            } else {
                quoted = !quoted;
            }
        } else if (character === ',' && !quoted) {
            values.push(value);
            value = '';
        } else {
            value += character;
        }
    }
    values.push(value);
    return values;
}

function readCsvFixture(relativePath) {
    const [headerLine, ...lines] = fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8')
        .trim()
        .split(/\r?\n/);
    const headers = parseCsvLine(headerLine);
    return lines.map((line) => {
        const values = parseCsvLine(line);
        return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
    });
}

function independentAnnualReturnRecalculation() {
    const countries = GLOBAL_EQUITY_RESEARCH_CHAIN.countryUniverse;
    const currencies = {
        AUS: 'AUD',
        BEL: 'EUR',
        CHE: 'CHF',
        DEU: 'EUR',
        DNK: 'DKK',
        ESP: 'EUR',
        FIN: 'EUR',
        FRA: 'EUR',
        GBR: 'GBP',
        ITA: 'EUR',
        JPN: 'JPY',
        NLD: 'EUR',
        NOR: 'NOK',
        PRT: 'EUR',
        SWE: 'SEK',
        USA: 'USD'
    };
    const jst = new Map(readCsvFixture('../data/historical/global-equity-research-chain/jst-r6-equity-inputs.csv')
        .map(row => [`${row.iso}:${row.year}`, row]));
    const oecd = new Map(readCsvFixture('../data/historical/global-equity-research-chain/oecd-share-price-inputs.csv')
        .map(row => [`${row.iso}:${row.time_period}`, row]));
    const ecb = new Map(readCsvFixture('../data/historical/global-equity-research-chain/ecb-exr-inputs.csv')
        .map(row => [`${row.currency}:${row.time_period}`, row]));
    const returns = {};

    for (let year = 1925; year <= 2020; year += 1) {
        const countriesWithData = countries.flatMap((iso) => {
            const current = jst.get(`${iso}:${year}`);
            const previous = jst.get(`${iso}:${year - 1}`);
            if (current.eq_tr === '' || current.xrusd === '' || previous.xrusd === '') return [];
            let annualReturn = (
                (1 + Number(current.eq_tr))
                * Number(previous.xrusd)
                / Number(current.xrusd)
                - 1
            );
            if (year >= 1951) {
                const germanCurrent = jst.get(`DEU:${year}`);
                const germanPrevious = jst.get(`DEU:${year - 1}`);
                annualReturn = (
                    (1 + annualReturn)
                    * Number(germanCurrent.xrusd)
                    / Number(germanPrevious.xrusd)
                    - 1
                );
            }
            return [{
                annualReturn,
                weight: Number(previous.pop) * Number(previous.rgdpmad)
            }];
        });
        const totalWeight = countriesWithData.reduce((sum, country) => sum + country.weight, 0);
        returns[year] = countriesWithData.reduce(
            (sum, country) => sum + country.annualReturn * country.weight / totalWeight,
            0
        );
    }

    const modernWeights = Object.fromEntries(countries.map((iso) => {
        const row = jst.get(`${iso}:2020`);
        return [iso, Number(row.pop) * Number(row.rgdpmad)];
    }));
    const totalModernWeight = Object.values(modernWeights).reduce((sum, weight) => sum + weight, 0);
    for (const iso of countries) modernWeights[iso] /= totalModernWeight;
    const currencyPerEur = (iso, period) => (
        currencies[iso] === 'EUR'
            ? 1
            : Number(ecb.get(`${currencies[iso]}:${period}`).obs_value)
    );

    for (let year = 2021; year <= 2025; year += 1) {
        const previousPeriod = `${year - 1}-12`;
        const currentPeriod = `${year}-12`;
        returns[year] = countries.reduce((sum, iso) => {
            const priceReturn = (
                Number(oecd.get(`${iso}:${currentPeriod}`).obs_value)
                / Number(oecd.get(`${iso}:${previousPeriod}`).obs_value)
                - 1
            );
            const dividendReturn = Number(jst.get(`${iso}:2020`).eq_div_rtn);
            const eurReturn = (
                (1 + priceReturn + dividendReturn)
                * currencyPerEur(iso, previousPeriod)
                / currencyPerEur(iso, currentPeriod)
                - 1
            );
            return sum + eurReturn * modernWeights[iso];
        }, 0);
    }
    return returns;
}

console.log('Test 1: generated chain identity, period and source inputs are pinned');
assertEqual(GLOBAL_EQUITY_RESEARCH_CHAIN.schemaVersion, 'GlobalEquityResearchChainV1', 'Chain schema should be versioned');
assertEqual(GLOBAL_EQUITY_RESEARCH_CHAIN.seriesId, 'global_equity_research_index', 'Chain should use the neutral canonical ID');
assertEqual(GLOBAL_EQUITY_RESEARCH_CHAIN.period.startYear, 1925, 'Chain should start in 1925');
assertEqual(GLOBAL_EQUITY_RESEARCH_CHAIN.period.endYear, 2025, 'Chain should end in 2025');
assertEqual(GLOBAL_EQUITY_RESEARCH_CHAIN.countryUniverse.length, 16, 'Chain should retain the fixed 16-country universe');
assertEqual(GLOBAL_EQUITY_RESEARCH_CHAIN.numeraireTransition.usdThroughYear, 1950, 'USD proxy should include the complete 1950 return');
assertEqual(GLOBAL_EQUITY_RESEARCH_CHAIN.numeraireTransition.germanInvestorCurrencyFromYear, 1951, 'German investor currency should start with the 1951 return');
assert(Object.isFrozen(GLOBAL_EQUITY_RESEARCH_CHAIN), 'Generated chain should be deeply immutable');

for (const source of Object.values(GLOBAL_EQUITY_RESEARCH_CHAIN.sourceFiles)) {
    const originalBytes = fs.readFileSync(new URL(
        `../data/historical/global-equity-research-chain/originals/${source.originalFileName}`,
        import.meta.url
    ));
    const bytes = fs.readFileSync(new URL(`../data/historical/global-equity-research-chain/${source.fileName}`, import.meta.url));
    assertEqual(sha256(originalBytes), source.originalSha256, `${source.originalFileName} should match its original-source hash`);
    assertEqual(sha256(bytes), source.filteredInputSha256, `${source.fileName} should match its generated input hash`);
}
console.log('✓ identity and pinned inputs OK');

console.log('Test 2: every annual return and level is contiguous and linked exactly once');
let previousLevel = GLOBAL_EQUITY_RESEARCH_CHAIN.base.level;
for (let year = 1925; year <= 2025; year += 1) {
    const annualReturn = GLOBAL_EQUITY_RESEARCH_CHAIN.annualReturns[year];
    const level = GLOBAL_EQUITY_RESEARCH_CHAIN.indexLevels[year];
    assert(Number.isFinite(annualReturn) && annualReturn > -1, `${year} annual return should be finite and above -100%`);
    assert(Number.isFinite(level) && level > 0, `${year} index level should be finite and positive`);
    assertClose(level, previousLevel * (1 + annualReturn), 1e-9, `${year} level should be chained from its annual return`);
    assertEqual(HISTORICAL_DATA[year].global_equity_research_index, level, `${year} runtime history should use the generated level`);
    assertEqual(annualData[year - 1925].rendite, annualReturn, `${year} runtime return should use the generated annual return`);
    assertEqual(Object.prototype.hasOwnProperty.call(HISTORICAL_DATA[year], 'msci_eur'), false, `${year} should not retain the retired field`);
    previousLevel = level;
}
assertEqual(Object.keys(GLOBAL_EQUITY_RESEARCH_CHAIN.annualReturns).length, 101, 'Return chain should contain 101 years');
assertEqual(Object.keys(GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS).length, 101, 'Level chain should contain 101 years');
console.log('✓ contiguous chain and runtime projection OK');

console.log('Test 3: documented country gaps and evidence segments stay explicit');
assertEqual(GLOBAL_EQUITY_RESEARCH_CHAIN.countryCounts[1944], 16, '1944 should retain all countries');
assertEqual(GLOBAL_EQUITY_RESEARCH_CHAIN.countryCounts[1945], 15, '1945 should omit Germany because its FX anchor is missing');
assertEqual(GLOBAL_EQUITY_RESEARCH_CHAIN.countryCounts[1946], 14, '1946 should omit Germany and Japan');
assertEqual(GLOBAL_EQUITY_RESEARCH_CHAIN.countryCounts[1947], 15, '1947 should omit Japan');
assertEqual(GLOBAL_EQUITY_RESEARCH_CHAIN.countryCounts[1948], 16, '1948 should return to all countries');
assertEqual(JSON.stringify(GLOBAL_EQUITY_RESEARCH_CHAIN.knownMissingCountryYears.DEU), JSON.stringify([1945, 1946]), 'German FX gaps should be documented');
assertEqual(JSON.stringify(GLOBAL_EQUITY_RESEARCH_CHAIN.knownMissingCountryYears.JPN), JSON.stringify([1946, 1947]), 'Japanese equity gaps should be documented');
assertEqual(
    JSON.stringify(GLOBAL_EQUITY_RESEARCH_CHAIN.segments.map(segment => segment.evidenceClass)),
    JSON.stringify(['proxy', 'backtested', 'estimated']),
    'Segments should distinguish proxy, provider-backtested and modelled evidence'
);
assertEqual(GLOBAL_EQUITY_RESEARCH_CHAIN.segments[0].endYear, 1950, 'Proxy segment should include the USD-based 1950 return');
assertEqual(GLOBAL_EQUITY_RESEARCH_CHAIN.segments[1].startYear, 1951, 'Backtested German-investor segment should start in 1951');
assertEqual(HISTORICAL_DATA_MANIFEST.series.global_equity_research_index.estimatedSegments.length, 2, 'Runtime manifest should mark both estimated equity segments');
assertEqual(ESTIMATED_HISTORY_MAX_YEAR, 1950, 'Global estimated-history maximum should match the equity proxy segment');
assertEqual(ESTIMATED_HISTORY_CUTOFF_YEAR, 1951, 'Estimated-history exclusion should start after the equity proxy segment');
assertEqual(DATASET_META.historicalData.estimatedYears[1], 1950, 'Dataset metadata should expose the complete equity proxy range');
assertEqual(
    HISTORICAL_DATA_MANIFEST.series.global_equity_research_index.estimatedSegments[0].endYear,
    ESTIMATED_HISTORY_MAX_YEAR,
    'Sampling boundary and manifested equity proxy segment should remain aligned'
);
console.log('✓ gaps and evidence segmentation OK');

console.log('Test 4: generated value hashes and modern reference years are stable');
assertEqual(
    sha256(canonicalizeHistoricalContractValue(GLOBAL_EQUITY_RESEARCH_CHAIN.annualReturns)),
    GLOBAL_EQUITY_RESEARCH_CHAIN.annualReturnHash,
    'Annual-return hash should cover the generated return object'
);
assertEqual(
    sha256(canonicalizeHistoricalContractValue(GLOBAL_EQUITY_RESEARCH_CHAIN.indexLevels)),
    GLOBAL_EQUITY_RESEARCH_CHAIN.indexLevelHash,
    'Index-level hash should cover the generated level object'
);
assertEqual(
    GLOBAL_EQUITY_RESEARCH_CHAIN.rawDataHash,
    'a234f57c21c3184077ce00743bbd6bc149363518939eeebb016e9fb25ab1f893',
    'Raw-data set hash should remain pinned'
);
assertClose(GLOBAL_EQUITY_RESEARCH_CHAIN.annualReturns[1950], 0.19413422824725782, 1e-15, '1950 should retain the USD-proxy return without the German transition factor');
assertClose(GLOBAL_EQUITY_RESEARCH_CHAIN.annualReturns[1951], 0.2828745398723087, 1e-15, '1951 should be the first German-investor-currency return');
assert(
    GLOBAL_EQUITY_RESEARCH_CHAIN.indexLevels[1950] > GLOBAL_EQUITY_RESEARCH_CHAIN.indexLevels[1949],
    'The 1949/1950 seam should not contain the former synthetic drawdown'
);
assertClose(GLOBAL_EQUITY_RESEARCH_CHAIN.annualReturns[2021], 0.22996960295731755, 1e-15, '2021 derived return should stay stable');
assertClose(GLOBAL_EQUITY_RESEARCH_CHAIN.annualReturns[2024], 0.18604818482153548, 1e-15, '2024 derived return should stay stable');
assertClose(GLOBAL_EQUITY_RESEARCH_CHAIN.annualReturns[2025], 0.09586355213684865, 1e-15, '2025 derived return should stay stable');
console.log('✓ hashes and modern reference years OK');

console.log('Test 5: all 101 annual returns are independently recalculated from the filtered inputs');
{
    const independentlyCalculated = independentAnnualReturnRecalculation();
    for (let year = 1925; year <= 2025; year += 1) {
        assertClose(
            independentlyCalculated[year],
            GLOBAL_EQUITY_RESEARCH_CHAIN.annualReturns[year],
            1e-15,
            `${year} independently recalculated return should match the generated chain`
        );
    }
}
console.log('✓ independent full-chain recalculation OK');

console.log('Test 6: generated artifact does not claim an MSCI identity');
{
    const generatedSource = fs.readFileSync(new URL('../app/simulator/global-equity-research-chain.js', import.meta.url), 'utf8');
    assertEqual(/\bMSCI\b/i.test(generatedSource), false, 'Generated research data should not name MSCI');
    assert(generatedSource.includes('CC BY-NC-SA 4.0'), 'Generated data should carry the JST-derived license notice');
}
console.log('✓ neutral identity and data-license notice OK');

console.log('✅ Global equity research chain tests passed');
