import { createHash } from 'node:crypto';
import fs from 'node:fs';
import {
    GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS,
    GERMAN_CASH_MONEY_MARKET_CHAIN
} from '../app/simulator/german-cash-money-market-chain.js';
import {
    annualData,
    HISTORICAL_DATA,
    HISTORICAL_DATA_MANIFEST
} from '../app/simulator/simulator-data.js';
import { canonicalizeHistoricalContractValue } from '../app/simulator/historical-backtest-contract.js';
import { SIMULATION_DATA_INVENTORY } from '../app/simulator/simulation-data-inventory.js';
import { applyAnnualReturnsToPortfolio } from '../app/simulator/simulator-year-portfolio.js';

console.log('--- German Cash/Money-Market Chain Tests ---');

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

console.log('Test 1: identity, sources, convention and applicability are pinned');
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.schemaVersion, 'GermanCashMoneyMarketChainV1', 'Chain schema should be versioned');
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.seriesId, 'german_cash_money_market_proxy', 'Chain should use the canonical neutral ID');
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.coverage.startYear, 1925, 'Chain should start in 1925');
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.coverage.endYear, 2025, 'Chain should end in 2025');
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.coverage.yearCount, 101, 'Chain should contain 101 years');
assert(Object.isFrozen(GERMAN_CASH_MONEY_MARKET_CHAIN), 'Generated chain should be deeply immutable');
assertEqual(
    GERMAN_CASH_MONEY_MARKET_CHAIN.returnConvention.runtimeMeasure,
    'simple gross annual return proxy applied once by the existing simulator cash-interest path',
    'Runtime convention should prohibit an implicit second accrual'
);
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.returnConvention.productCosts, 'excluded', 'Source values should exclude product costs');
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.returnConvention.taxes, 'excluded', 'Source values should exclude taxes');
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.applicability.operativeCash, true, 'Operative cash should use the proxy');
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.applicability.moneyMarketTranches, true, 'Money-market tranches should use the proxy');
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.applicability.bondTranches, true, 'The existing cashBondReturn path should disclose bond-tranche application');
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.applicability.equityTranches, false, 'Equity tranches should not use the proxy');
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.applicability.runtimeField, 'cashBondReturn', 'Applicability should name the runtime field');
assert(
    GERMAN_CASH_MONEY_MARKET_CHAIN.proxyQualification.bondMaturityMismatch.limitation.includes('bond duration'),
    'Bond applicability should disclose the overnight-versus-bond maturity mismatch'
);
const bondApplicationProbe = {
    depotTranchesAktien: [{
        marketValue: 100000,
        costBasis: 100000,
        type: 'anleihe',
        category: 'bonds'
    }],
    depotTranchesGold: [],
    liquiditaet: 0
};
applyAnnualReturnsToPortfolio({
    portfolio: bondApplicationProbe,
    yearData: {
        rendite: 0,
        gold_eur_perf: 0,
        zinssatz: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2020]
    },
    threeBucketInput: {}
});
assertClose(
    bondApplicationProbe.depotTranchesAktien[0].marketValue,
    100000 * (1 + (GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2020] / 100)),
    1e-9,
    'Declared bond applicability should match the existing shared cashBondReturn runtime path'
);
console.log('✓ identity, convention and applicability OK');

console.log('Test 2: all pinned source bytes retain their identities and licences');
const sourcePaths = {
    jst: '../data/historical/global-equity-research-chain/originals/JSTdatasetR6.xlsx',
    bundesbankPdf: '../data/historical/german-cash-money-market-chain/originals/bundesbank-long-series-2026-03-05.pdf',
    bundesbankTextExtract: '../data/historical/german-cash-money-market-chain/originals/bundesbank-money-market-pages-15-16-layout.txt'
};
for (const [sourceId, source] of Object.entries(GERMAN_CASH_MONEY_MARKET_CHAIN.sourceFiles)) {
    const bytes = fs.readFileSync(new URL(sourcePaths[sourceId], import.meta.url));
    assertEqual(sha256(bytes), source.sha256, `${source.fileName} should match its pinned source hash`);
    assert(typeof source.license === 'string' && source.license.length > 0, `${sourceId} should carry source terms`);
}
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.sourceFiles.bundesbankPdf.sourceRole, 'primary', 'The Bundesbank PDF should be a primary source');
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.sourceFiles.bundesbankTextExtract.sourceRole, 'derived', 'The layout text should be a derived artifact');
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.hashes.rawDataScope, 'primary_source_files_only', 'Raw-data hash should exclude derived artifacts');
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.sourceValidation.primaryPdfReadByCode, true, 'Verification should read the primary PDF');
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.sourceValidation.independentCoordinateOracleYears, 77, 'PDF coordinate oracle should cover all Bundesbank years');
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.sourceExtraction.coordinateOracle.tool.implementation, 'Poppler', 'PDF oracle should pin the implementation');
assertEqual(
    GERMAN_CASH_MONEY_MARKET_CHAIN.sourceExtraction.coordinateOracle.tool.minimumCompatibleVersion,
    '25.07.0',
    'PDF oracle should pin the minimum compatible Poppler version'
);
assert(
    GERMAN_CASH_MONEY_MARKET_CHAIN.sourceExtraction.coordinateOracle.tool.compatibilityRule.includes('greater_than_or_equal'),
    'PDF oracle should accept compatible upgrades only with exact source-value agreement'
);
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.sourceExtraction.coordinateOracle.exactAgreementRequired, true, 'PDF and layout paths should require exact agreement');
assertEqual(Object.hasOwn(GERMAN_CASH_MONEY_MARKET_CHAIN.sourceExtraction, 'visualVerification'), false, 'Machine evidence should not carry an unverifiable visual-review claim');
console.log('✓ source identities and terms OK');

console.log('Test 3: the 101-year chain is contiguous and is the sole runtime projection');
for (let year = 1925; year <= 2025; year += 1) {
    const rate = GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[year];
    assert(Number.isFinite(rate), `${year} annual return should be finite`);
    assertEqual(HISTORICAL_DATA[year].zinssatz_de, rate, `${year} runtime history should use the generated return`);
    assertEqual(annualData[year - 1925].zinssatz, rate, `${year} sampling data should use the generated return`);
}
assertEqual(Object.keys(GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS).length, 101, 'Return chain should contain 101 years');
const runtimeSource = fs.readFileSync(new URL('../app/simulator/simulator-data.js', import.meta.url), 'utf8');
assertEqual(
    /zinssatz_de:\s*-?\d/.test(runtimeSource),
    false,
    'Runtime history should not retain hand-maintained numeric interest literals'
);
console.log('✓ contiguous generated-only runtime projection OK');

console.log('Test 4: seams, negative rates and gap policy remain explicit');
assertEqual(
    JSON.stringify(GERMAN_CASH_MONEY_MARKET_CHAIN.qualitySegments.map(({
        startYear,
        endYear,
        evidenceClass
    }) => ({ startYear, endYear, evidenceClass }))),
    JSON.stringify([
        { startYear: 1925, endYear: 1944, evidenceClass: 'proxy' },
        { startYear: 1945, endYear: 1948, evidenceClass: 'estimated' },
        { startYear: 1949, endYear: 1996, evidenceClass: 'proxy' },
        { startYear: 1997, endYear: 1998, evidenceClass: 'official' },
        { startYear: 1999, endYear: 2018, evidenceClass: 'official' },
        { startYear: 2019, endYear: 2019, evidenceClass: 'official' },
        { startYear: 2020, endYear: 2025, evidenceClass: 'official' }
    ]),
    'Evidence segments should expose every source and benchmark seam'
);
assertEqual(
    JSON.stringify(GERMAN_CASH_MONEY_MARKET_CHAIN.gapPolicy.missingYears),
    JSON.stringify([1945, 1946, 1947, 1948]),
    'Only the declared post-war gap may be bridged'
);
for (let year = 1945; year <= 1948; year += 1) {
    assertEqual(GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[year], 2.13, `${year} should use the explicit 1944 carry-forward`);
}
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.gapPolicy.failClosedOutsideDeclaredGap, true, 'Undeclared gaps should fail closed');
assertEqual(GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1949], 3.24, '1949 should start the Bundesbank-published Frankfurt proxy segment');
assertEqual(GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1997], 3.22, '1997 should start FIBOR O/N');
assertEqual(GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1999], 2.74, '1999 should start EONIA');
assertEqual(GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2019], -0.39, '2019 should retain the benchmark transition average');
assertEqual(GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2021], -0.57, 'Negative official money-market returns must remain valid');
assertEqual(GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2025], 2.18, '2025 should use the current official annual average');
assertEqual(
    GERMAN_CASH_MONEY_MARKET_CHAIN.qualitySegments[2].quotationStatus,
    'not_officially_set_or_quoted',
    'Frankfurt-bank observations should not be overclassified as officially quoted rates'
);
assertEqual(
    GERMAN_CASH_MONEY_MARKET_CHAIN.proxyQualification.historicalDiscontinuities[0].mixedAnnualAverageYear,
    1970,
    'The broader survey-group break should be explicit'
);
assertEqual(
    GERMAN_CASH_MONEY_MARKET_CHAIN.proxyQualification.historicalDiscontinuities[1].mixedAnnualAverageYear,
    1990,
    'The day-count break should be explicit'
);
assertEqual(
    GERMAN_CASH_MONEY_MARKET_CHAIN.proxyQualification.monetaryAssetDiscontinuity.balanceConversion.nominalBalanceLossPct,
    93.5,
    'The 1948 monetary-balance discontinuity should match the sibling CPI contract'
);
assert(
    GERMAN_CASH_MONEY_MARKET_CHAIN.proxyQualification.monetaryAssetDiscontinuity.runtimeLimitation.includes('does not apply'),
    'The artifact should prohibit continuous historical cash-balance interpretation across 1948'
);
assertEqual(
    GERMAN_CASH_MONEY_MARKET_CHAIN.benchmarkDisclaimers[0].url,
    'https://www.ecb.europa.eu/stats/financial_markets_and_interest_rates/euro_short-term_rate/html/index.en.html',
    'EURSTR should retain the required ECB administrator disclaimer reference'
);
console.log('✓ seams, negative rates and fail-closed gap policy OK');

console.log('Test 5: generated hashes, manifest and inventory remain aligned');
assertEqual(
    sha256(canonicalizeHistoricalContractValue(GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS)),
    GERMAN_CASH_MONEY_MARKET_CHAIN.hashes.annualReturnHash,
    'Annual-return hash should cover the generated rate object'
);
const manifestSeries = HISTORICAL_DATA_MANIFEST.series.zinssatz_de;
assertEqual(manifestSeries.source.status, 'known', 'Runtime manifest should resolve the cash source chain');
assertEqual(manifestSeries.estimatedSegments[0].endYear, 1948, 'Runtime exclusion should cover the proxy and estimated bridge');
const inventorySeries = SIMULATION_DATA_INVENTORY.historicalSeries.zinssatz_de;
assertEqual(inventorySeries.rawDataHash.value, GERMAN_CASH_MONEY_MARKET_CHAIN.hashes.rawDataHash, 'Inventory raw-data hash should match');
assertEqual(inventorySeries.embeddedValueHash.value, GERMAN_CASH_MONEY_MARKET_CHAIN.hashes.annualReturnHash, 'Inventory value hash should match');
assertEqual(inventorySeries.externalValidationStatus, 'not_validated', 'Codex must not mark its own replacement externally validated');
console.log('✓ hashes and metadata alignment OK');

console.log('✅ German cash/money-market chain tests passed');
