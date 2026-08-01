"use strict";

import {
    canonicalizeHistoricalContractValue,
    sha256Hex
} from './historical-backtest-contract.js';

export const SIMULATION_DATA_INVENTORY_SCHEMA_VERSION = 'SimulationDataInventoryV1';
export const SIMULATION_DATA_INVENTORY_REVISION = '2026-08-01.4';

export const SIMULATION_DATA_EVIDENCE_CLASSES = Object.freeze([
    'official',
    'derived',
    'backtested',
    'proxy',
    'estimated',
    'model_assumption',
    'user_input',
    'stress_parameter',
    'missing',
    'unresolved'
]);

export const SIMULATION_DATA_EXTERNAL_VALIDATION_STATUSES = Object.freeze([
    'externally_validated',
    'not_validated',
    'not_applicable',
    'unresolved'
]);

const RESOLUTION_STATUSES = new Set(['known', 'unresolved', 'not_applicable']);
const EVIDENCE_CLASSES = new Set(SIMULATION_DATA_EVIDENCE_CLASSES);
const EXTERNAL_VALIDATION_STATUSES = new Set(SIMULATION_DATA_EXTERNAL_VALIDATION_STATUSES);
const REQUIRED_HISTORICAL_SERIES = Object.freeze([
    'global_equity_research_index',
    'inflation_de',
    'zinssatz_de',
    'lohn_de',
    'gold_eur_perf',
    'cape'
]);
const REQUIRED_STATIC_CATEGORIES = Object.freeze([
    'demography',
    'care',
    'survivor',
    'tax',
    'pension_social',
    'stress_regime',
    'defaults_fallbacks'
]);
const REQUIRED_RESOLUTION_FIELDS = Object.freeze([
    'source',
    'seriesIdentifier',
    'currency',
    'yearConvention',
    'transformation',
    'license',
    'retrievedAt',
    'rawDataHash',
    'embeddedValueHash'
]);
const EXTERNAL_GATE_FIELDS = Object.freeze([
    'source',
    'seriesIdentifier',
    'license',
    'retrievedAt'
]);

function deepFreeze(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const child of Object.values(value)) deepFreeze(child, seen);
    return Object.freeze(value);
}

function resolved(value) {
    return { status: 'known', value };
}

function unresolved() {
    return { status: 'unresolved', value: null };
}

function notApplicable() {
    return { status: 'not_applicable', value: null };
}

function historicalSeries({
    id,
    label,
    unit,
    currency,
    transformation,
    embeddedValueHash,
    qualitySegments,
    discontinuities = [],
    evidenceClass = 'unresolved',
    implementationLocations = [`app/simulator/simulator-data.js:HISTORICAL_DATA.*.${id}`],
    source = unresolved(),
    seriesIdentifier = unresolved(),
    yearConvention = unresolved(),
    license = unresolved(),
    retrievedAt = unresolved(),
    rawDataHash = unresolved(),
    externalValidationStatus = 'unresolved'
}) {
    return {
        id,
        category: 'historical_series',
        label,
        evidenceClass,
        implementationLocations,
        source,
        seriesIdentifier,
        unit,
        currency,
        yearConvention,
        transformation: resolved(transformation),
        license,
        retrievedAt,
        rawDataHash,
        embeddedValueHash: resolved(embeddedValueHash),
        externalValidationStatus,
        qualitySegments,
        discontinuities
    };
}

function staticEntry({
    id,
    category,
    label,
    evidenceClass,
    implementationLocations,
    unit,
    embeddedValueHash,
    source = notApplicable(),
    seriesIdentifier = notApplicable(),
    currency = notApplicable(),
    yearConvention = notApplicable(),
    transformation = notApplicable(),
    license = notApplicable(),
    retrievedAt = notApplicable(),
    rawDataHash = notApplicable(),
    externalValidationStatus = 'not_validated',
    contractValue
}) {
    return {
        id,
        category,
        label,
        evidenceClass,
        implementationLocations,
        source,
        seriesIdentifier,
        unit,
        currency,
        yearConvention,
        transformation,
        license,
        retrievedAt,
        rawDataHash,
        embeddedValueHash,
        externalValidationStatus,
        ...(contractValue === undefined ? {} : { contractValue })
    };
}

const HISTORICAL_SERIES = {
    global_equity_research_index: historicalSeries({
        id: 'global_equity_research_index',
        label: 'Open global equity research total-return index level',
        unit: 'index_level',
        evidenceClass: 'proxy',
        implementationLocations: [
            'app/simulator/global-equity-research-chain.js:GLOBAL_EQUITY_RESEARCH_CHAIN',
            'app/simulator/simulator-data.js:HISTORICAL_DATA.*.global_equity_research_index'
        ],
        source: resolved('JST Macrohistory Database R6; OECD DSD_STES@DF_FINMARK 4.0; ECB EXR'),
        seriesIdentifier: resolved('global_equity_research_index / GlobalEquityResearchChainV1'),
        currency: resolved('USD proxy 1925-1950; German investor currency 1951-2020; EUR 2021-2025'),
        yearConvention: resolved('Annual return t; JST calendar year through 2020, December-average-index ratio for OECD 2021-2025'),
        transformation: 'Prior-year JST population-times-real-GDP-per-capita weights; local-to-USD conversion through 1950 and German investor-currency conversion from 1951 through 2020; OECD December price return plus frozen JST 2020 dividend return and ECB December conversion thereafter.',
        license: resolved('Derived data CC BY-NC-SA 4.0; OECD and ESCB source terms also apply'),
        retrievedAt: resolved('2026-07-29'),
        rawDataHash: resolved('a234f57c21c3184077ce00743bbd6bc149363518939eeebb016e9fb25ab1f893'),
        embeddedValueHash: '38118b9f982ee3ff5d64a920b397451c302c34f3e46722462bac6e0732878c89',
        externalValidationStatus: 'not_validated',
        qualitySegments: [
            {
                startYear: 1925,
                endYear: 1950,
                evidenceClass: 'proxy',
                note: 'JST nominal local equity total returns converted to a USD research proxy through the 1950 return; Germany is absent in 1945-1946 and Japan in 1946-1947 where required inputs are missing.'
            },
            {
                startYear: 1951,
                endYear: 2020,
                evidenceClass: 'backtested',
                note: 'JST provider-built national total returns are economically weighted and converted into German investor currency.'
            },
            {
                startYear: 2021,
                endYear: 2025,
                evidenceClass: 'estimated',
                note: 'Observed OECD price and ECB currency components plus a frozen country-level JST 2020 dividend-return model component.'
            }
        ]
    }),
    inflation_de: historicalSeries({
        id: 'inflation_de',
        label: 'German annual consumer-price inflation',
        unit: 'percent_per_year',
        evidenceClass: 'proxy',
        implementationLocations: [
            'app/simulator/german-cpi-chain.js:GERMAN_CPI_RESEARCH_CHAIN',
            'app/simulator/simulator-data.js:HISTORICAL_DATA.*.inflation_de'
        ],
        source: resolved('JST Macrohistory Database R6 (1925-1949); Destatis consumer-price long series (1950-2024); Destatis current annual table (2025)'),
        seriesIdentifier: resolved('german_consumer_price_inflation / GermanCpiResearchChainV1'),
        currency: notApplicable(),
        yearConvention: resolved('Annual-average consumer-price change in simulation year t versus annual average t-1'),
        transformation: 'JST consecutive German CPI level changes through 1949; normalized 1925-1948 source levels are integer-quantized and 1949 is an explicit post-currency-reform splice. The price proxy excludes the separate 100:6.5 nominal write-down of major Reichsmark cash and bank/savings balances and is not a continuous-currency monetary-asset deflator across 1948. Published Destatis national consumer-price annual changes start in 1950; every seam rate stays inside one source series and HICP/HVPI is excluded.',
        license: resolved('JST-derived segment CC BY-NC-SA 4.0; Destatis segments Data Licence Germany - attribution - 2.0'),
        retrievedAt: resolved('2026-07-10'),
        rawDataHash: resolved('83841d2c11df3a5e193aa07db3bdfe815cbbeea7f9f81c3526b197702a46bdb4'),
        embeddedValueHash: '9ec87b5052d5e086517142c34213a4063e2be6ccdd8a5babf6d5722ffb76ae3a',
        externalValidationStatus: 'not_validated',
        qualitySegments: [
            {
                startYear: 1925,
                endYear: 1949,
                evidenceClass: 'proxy',
                note: 'Annual changes from JST R6 German CPI levels. Levels normalized to 1938=126 are exact integers for 1925-1948; 1936-1948 reflects price controls/wartime freeze, and 1949 is a non-integer post-currency-reform splice whose +7.0352% differs by 8.0878 pp from the -1.0526% Destatis level-derived alternative. The roughly 36.9% CPI-implied purchasing-power loss is not the separate 93.5% nominal write-down of major monetary balances under the 100:6.5 conversion.'
            },
            {
                startYear: 1950,
                endYear: 1962,
                evidenceClass: 'official',
                note: 'Destatis former West Germany four-person worker/employee household with medium income; official series with proxy_population qualifier.'
            },
            {
                startYear: 1963,
                endYear: 1991,
                evidenceClass: 'official',
                note: 'Destatis former West Germany price index for all private households.'
            },
            {
                startYear: 1992,
                endYear: 2024,
                evidenceClass: 'official',
                note: 'Destatis Verbraucherpreisindex for Germany from the pinned long-series workbook.'
            },
            {
                startYear: 2025,
                endYear: 2025,
                evidenceClass: 'official',
                note: 'Destatis Verbraucherpreisindex for Germany from the pinned current annual table.'
            }
        ]
    }),
    zinssatz_de: historicalSeries({
        id: 'zinssatz_de',
        label: 'German cash and overnight money-market gross return proxy',
        unit: 'percent_per_year',
        evidenceClass: 'proxy',
        implementationLocations: [
            'app/simulator/german-cash-money-market-chain.js:GERMAN_CASH_MONEY_MARKET_CHAIN',
            'app/simulator/simulator-data.js:HISTORICAL_DATA.*.zinssatz_de'
        ],
        source: resolved('JST Macrohistory Database R6 DEU.stir (1925-1944); explicit 1944 carry-forward bridge (1945-1948); Deutsche Bundesbank overnight-money-market long series (1949-2025), with Fritz Knapp/Bundesbank source chain through 1975'),
        seriesIdentifier: resolved('german_cash_money_market_proxy / GermanCashMoneyMarketChainV1'),
        currency: resolved('Historical German regimes/DEM through 1998; EUR from 1999; return percentages do not perform currency conversion, and the 1948 monetary-balance write-down is not implemented'),
        yearConvention: resolved('Published annual-average nominal rate in simulation year t, applied once through the existing shared cashBondReturn path to cash-like holdings and bond tranches'),
        transformation: 'JST DEU.stir is used directly through 1944; 1945-1948 carries the 1944 value forward as an explicit estimated bridge; Bundesbank annual-average reported Frankfurt overnight, FIBOR O/N, EONIA and EURSTR values are used directly from 1949. The shared bond application is a maturity-mismatched model proxy. No extra compounding, product cost, bank margin or tax is embedded.',
        license: resolved('JST-derived segment CC BY-NC-SA 4.0; Bundesbank/ESCB statistics reuse terms with attribution; ECB EURSTR administrator disclaimer applies'),
        retrievedAt: resolved('2026-07-29'),
        rawDataHash: resolved('ea1608b5dee7e00ae7bf24bb651cb01cd3f0d5423b54cdf21b9f975cced30722'),
        embeddedValueHash: 'cf5471a345234984ac3ff8de57bffdb3128c1046e01ec998198721325ede9b69',
        externalValidationStatus: 'not_validated',
        qualitySegments: [
            {
                startYear: 1925,
                endYear: 1944,
                evidenceClass: 'proxy',
                note: 'JST nominal German short-term interest-rate proxy; the instrument is not homogeneous enough to claim a continuous investable overnight return.'
            },
            {
                startYear: 1945,
                endYear: 1948,
                evidenceClass: 'estimated',
                note: 'Explicit last-observation carry-forward at 2.13 percent for unobserved market-closure and post-war years; not an observed investable return.'
            },
            {
                startYear: 1949,
                endYear: 1996,
                evidenceClass: 'proxy',
                note: 'Bundesbank-published unweighted monthly averages of rates reported by Frankfurt banks; the source states they were not officially set or quoted. Survey-group and day-count breaks occur in 1970 and 1990.'
            },
            {
                startYear: 1997,
                endYear: 1998,
                evidenceClass: 'official',
                note: 'Bundesbank annual averages of daily FIBOR overnight rates.'
            },
            {
                startYear: 1999,
                endYear: 2018,
                evidenceClass: 'official',
                note: 'EONIA annual averages as published by Deutsche Bundesbank.'
            },
            {
                startYear: 2019,
                endYear: 2019,
                evidenceClass: 'official',
                note: 'Published transition-year average: EONIA through September and EURSTR from October.'
            },
            {
                startYear: 2020,
                endYear: 2025,
                evidenceClass: 'official',
                note: 'EURSTR annual averages as published by Deutsche Bundesbank.'
            }
        ]
    }),
    lohn_de: historicalSeries({
        id: 'lohn_de',
        label: 'German average gross monthly earnings growth proxy without special payments',
        unit: 'percent_per_year',
        evidenceClass: 'proxy',
        implementationLocations: [
            'app/simulator/german-gross-wage-growth-chain.js:GERMAN_GROSS_WAGE_GROWTH_CHAIN',
            'app/simulator/simulator-data.js:HISTORICAL_DATA.*.lohn_de'
        ],
        source: resolved('JST Macrohistory Database R6 DEU.wage; Destatis Index der durchschnittlichen Bruttomonatsverdienste ohne Sonderzahlungen through 2025'),
        seriesIdentifier: resolved('german_average_gross_monthly_earnings_growth_proxy / GermanGrossWageGrowthChainV2'),
        currency: notApplicable(),
        yearConvention: resolved('Published year-over-year change for reporting year t is applied once in simulation year t'),
        transformation: '1925-1946 changes are derived from consecutive JST R6 nominal-wage levels. The 1925 start boundary and 1945 wartime break are separately classified; from 1947 the published Destatis annual change adjusts pension inputs once when rentAdjMode=wage. The 1947 source seam, 1948 currency-reform context, 1990/1991 territorial boundary, 2007 and 2022 method breaks and 1947-1955 precision limit are explicit. This remains a proxy, not the statutory German pension-adjustment series.',
        license: resolved('JST-derived segment CC BY-NC-SA 4.0; Destatis segment Data Licence Germany - attribution - version 2.0'),
        retrievedAt: resolved('2026-08-01'),
        rawDataHash: resolved('cfd5c598a8bc846a96966fa8ff7388d80c30f3ada39edbfe90d39f234eef9d9b'),
        embeddedValueHash: 'e10e581f6994e07ed0a943b3716dd8fd5dea7b8b272d47a546466af8701a3057',
        externalValidationStatus: 'not_validated',
        qualitySegments: [
            {
                startYear: 1925,
                endYear: 1925,
                evidenceClass: 'proxy',
                note: 'First in-scope JST level-derived rate; depends on the 1924 out-of-period level and carries a post-hyperinflation normalization boundary.'
            },
            {
                startYear: 1926,
                endYear: 1944,
                evidenceClass: 'proxy',
                note: 'Annual changes derived from consecutive JST R6 DEU nominal-wage levels; a macrohistory research proxy, not a statutory pension adjustment.'
            },
            {
                startYear: 1945,
                endYear: 1945,
                evidenceClass: 'estimated',
                note: 'JST level-derived wartime/post-war break value retained for continuity; not claimed as an observed market-wage change.'
            },
            {
                startYear: 1946,
                endYear: 1946,
                evidenceClass: 'proxy',
                note: 'Final JST level-derived transition year immediately before the source seam to published Destatis annual changes.'
            },
            {
                startYear: 1947,
                endYear: 1955,
                evidenceClass: 'official',
                note: 'Published Destatis annual changes for the former federal territory. In-segment current levels are 1.9-4.5; the 1947 change also uses the prior 1946 level 1.8, so one-decimal publication imposes a material precision limit.'
            },
            {
                startYear: 1956,
                endYear: 1990,
                evidenceClass: 'official',
                note: 'Published Destatis annual changes for the former federal territory before reunification.'
            },
            {
                startYear: 1991,
                endYear: 2006,
                evidenceClass: 'official',
                note: 'Published Destatis annual changes for Germany under the territorial definition since 3 October 1990, before the 2007 method break.'
            },
            {
                startYear: 2007,
                endYear: 2021,
                evidenceClass: 'official',
                note: 'Published Destatis annual changes after the documented scope change to producing industry and services.'
            },
            {
                startYear: 2022,
                endYear: 2025,
                evidenceClass: 'official',
                note: 'Published Destatis annual changes from the earnings survey introduced in 2022.'
            }
        ],
        discontinuities: [
            {
                year: 1925,
                type: 'start_boundary',
                note: 'First in-scope rate depends on the out-of-period JST 1924 level; post-hyperinflation normalization limits comparability.'
            },
            {
                year: 1945,
                type: 'wartime_market_observation_break',
                note: 'JST level-derived value is retained as estimated and is not claimed as an observed market-wage change.'
            },
            {
                year: 1947,
                type: 'source_seam',
                note: 'Switch from JST level-derived changes through 1946 to published Destatis annual changes without a cross-source level ratio.'
            },
            {
                year: 1948,
                type: 'currency_reform_context',
                note: 'Published earnings-index change does not model the separate 100:6.5 monetary-balance write-down.'
            }
        ]
    }),
    gold_eur_perf: historicalSeries({
        id: 'gold_eur_perf',
        label: 'Gold annual return proxy in German investor currency',
        unit: 'percent_per_year',
        evidenceClass: 'proxy',
        implementationLocations: [
            'app/simulator/gold-german-investor-chain.js:GOLD_GERMAN_INVESTOR_CHAIN',
            'app/simulator/simulator-data.js:HISTORICAL_DATA.*.gold_eur_perf'
        ],
        source: resolved('Federal Reserve statutory gold-price policy and 1933 RFC year-end purchase price; JST Macrohistory Database R6; Deutsche Bundesbank BBEX3; World Bank Commodity Price Data (Pink Sheet)'),
        seriesIdentifier: resolved('gold_german_investor_currency_annual_return / GoldGermanInvestorChainV1'),
        currency: resolved('historical German currency through 1944; explicit bridge 1945-1950; DEM 1951-1998; EUR 1999-2025'),
        yearConvention: resolved('Segment-specific nominal return: year-end levels through 1967, mixed 1967 year-end/1968 partial-year seam, annual-average levels thereafter'),
        transformation: 'US policy/official year-end price times JST year-end German-currency/USD through 1944 and 1951-1967; 1933 uses the official 18 December RFC purchase price; explicit zero-return bridge 1945-1950; Bundesbank Frankfurt DEM/kg annual-average level ratios with a mixed 1968 seam; World Bank USD/oz divided by Bundesbank annual-average USD/EUR from 1999, with the 1998 DEM level converted at 1.95583 DEM/EUR. Product, storage, spread and tax costs are excluded.',
        license: resolved('JST-derived segment CC BY-NC-SA 4.0; World Bank segment CC BY 4.0; Bundesbank/ESCB statistical reuse terms also apply'),
        retrievedAt: resolved('2026-07-30'),
        rawDataHash: resolved('133ed7c3d79a313de4a64f94e54b4f0e06e4f7b24ab4182aa5263958cae49b7d'),
        embeddedValueHash: '068a15a99c665b48dc14a187b654033d292c9de6ed3cf712f7e789ddcec049aa',
        externalValidationStatus: 'not_validated',
        qualitySegments: [
            {
                startYear: 1925,
                endYear: 1932,
                evidenceClass: 'proxy',
                note: 'Federal Reserve statutory USD gold-price policy multiplied by JST R6 end-of-year DEU.xrusd. This is a policy/FX research proxy, not proof of an accessible German retail gold market.'
            },
            {
                startYear: 1933,
                endYear: 1933,
                evidenceClass: 'proxy',
                note: 'Federal Reserve Bank of New York reported 18 December RFC purchase price multiplied by JST R6 end-of-year DEU.xrusd.'
            },
            {
                startYear: 1934,
                endYear: 1944,
                evidenceClass: 'proxy',
                note: 'Federal Reserve statutory USD gold-price policy multiplied by JST R6 end-of-year DEU.xrusd. This is a policy/FX research proxy, not proof of an accessible German retail gold market.'
            },
            {
                startYear: 1945,
                endYear: 1950,
                evidenceClass: 'estimated',
                note: 'Explicit zero-return bridge across the wartime/post-war market gap and German currency discontinuity; not an observed return.'
            },
            {
                startYear: 1951,
                endYear: 1967,
                evidenceClass: 'proxy',
                note: 'Federal Reserve statutory USD gold-price policy multiplied by JST R6 end-of-year DEU.xrusd before the Frankfurt fixing series begins.'
            },
            {
                startYear: 1968,
                endYear: 1968,
                evidenceClass: 'derived',
                note: 'Bundesbank Frankfurt partial-year annual average beginning 18 June compared with the 1967 parity/FX anchor.'
            },
            {
                startYear: 1969,
                endYear: 1998,
                evidenceClass: 'derived',
                note: 'Returns from consecutive official Bundesbank Frankfurt-fixing annual-average levels in DEM per kilogram.'
            },
            {
                startYear: 1999,
                endYear: 1999,
                evidenceClass: 'derived',
                note: 'Source/currency seam: World Bank Gold and Bundesbank USD/EUR compared with the 1998 Frankfurt level converted at the irrevocable DEM/EUR rate.'
            },
            {
                startYear: 2000,
                endYear: 2025,
                evidenceClass: 'derived',
                note: 'World Bank annual-average Gold in USD per troy ounce converted with Bundesbank/ECB annual-average USD per EUR.'
            }
        ]
    }),
    cape: historicalSeries({
        id: 'cape',
        label: 'US Shiller conventional CAPE decision signal',
        unit: 'ratio',
        evidenceClass: 'backtested',
        implementationLocations: [
            'app/simulator/us-shiller-cape-chain.js:US_SHILLER_CAPE_CHAIN',
            'app/simulator/simulator-data.js:HISTORICAL_DATA.*.cape'
        ],
        source: resolved('Robert J. Shiller, U.S. Stock Markets 1871-Present and CAPE Ratio workbook'),
        seriesIdentifier: resolved('us_shiller_conventional_cape_decision_signal / UsShillerCapeDecisionChainV1'),
        currency: notApplicable(),
        yearConvention: resolved('December observation from calendar year t-1 is the decision signal for return year t'),
        transformation: 'The conventional price CAPE source observation for December t-1 is embedded under return year t and consumed once as the decision-as-of input; no second lag.',
        license: resolved('Publisher download is public; no explicit open redistribution licence located; publisher/Yale disclaimer applies'),
        retrievedAt: resolved('2026-08-01'),
        rawDataHash: resolved('0e3d716f83f51c14f40c5ab5662e767cde4f83fcb7305db24ab003df2c9ee6c5'),
        embeddedValueHash: 'd1101958fed64dadf8fba76e9e4e92c8d24e86bd3d21accc42cdb60c247a835f',
        externalValidationStatus: 'not_validated',
        qualitySegments: [
            {
                startYear: 1925,
                endYear: 1935,
                evidenceClass: 'estimated',
                note: 'The trailing ten-year earnings basis includes interpolated annual Cowles observations before 1926.'
            },
            {
                startYear: 1936,
                endYear: 2025,
                evidenceClass: 'backtested',
                note: 'Publisher-compiled US conventional CAPE after the ten-year window no longer contains the documented pre-1926 interpolation; it is not a global or German valuation ratio.'
            }
        ]
    })
};

const STATIC_DATA = {
    mortality_table: staticEntry({
        id: 'mortality_table',
        category: 'demography',
        label: 'Annual mortality probabilities by age and gender',
        evidenceClass: 'proxy',
        implementationLocations: [
            'app/simulator/simulator-data.js:MORTALITY_TABLE',
            'app/simulator/mc-life-events.js'
        ],
        unit: 'annual_probability_ratio',
        rawDataHash: unresolved(),
        embeddedValueHash: resolved('f35acbc3388db53cf6df068998974d3a4b13260c7bc35be32be47e32bd3df275'),
        source: unresolved(),
        seriesIdentifier: unresolved(),
        yearConvention: resolved('period_table_probability_applied_at_simulated_age'),
        transformation: unresolved(),
        license: unresolved(),
        retrievedAt: unresolved(),
        externalValidationStatus: 'unresolved'
    }),
    care_grade_taxonomy: staticEntry({
        id: 'care_grade_taxonomy',
        category: 'care',
        label: 'Supported care grades and labels',
        evidenceClass: 'proxy',
        implementationLocations: [
            'app/simulator/simulator-data.js:SUPPORTED_PFLEGE_GRADES',
            'app/simulator/simulator-data.js:PFLEGE_GRADE_LABELS'
        ],
        unit: 'ordinal_grade',
        rawDataHash: unresolved(),
        embeddedValueHash: resolved('82e9af7152342ce8db3d6212471fa5107d1f44bc72ae0cf1d9ece5f93bb12885'),
        source: unresolved(),
        seriesIdentifier: unresolved(),
        license: unresolved(),
        retrievedAt: unresolved(),
        externalValidationStatus: 'unresolved'
    }),
    care_incidence_probabilities: staticEntry({
        id: 'care_incidence_probabilities',
        category: 'care',
        label: 'Age-bucketed annual care-entry probabilities by grade',
        evidenceClass: 'estimated',
        implementationLocations: ['app/simulator/simulator-data.js:PFLEGE_GRADE_PROBABILITIES'],
        unit: 'annual_probability_ratio',
        rawDataHash: unresolved(),
        embeddedValueHash: resolved('9625b37ee3eb7428569702ea0e91a7af7b78cd8b7ff3357204c6e5661f3028a1'),
        source: unresolved(),
        seriesIdentifier: unresolved(),
        yearConvention: resolved('annual_entry_probability_at_simulated_age_bucket'),
        transformation: resolved('Prevalence-to-incidence approximation using an assumed four-year average care duration and age-bucket smoothing.'),
        license: unresolved(),
        retrievedAt: unresolved(),
        externalValidationStatus: 'unresolved'
    }),
    care_progression_probabilities: staticEntry({
        id: 'care_progression_probabilities',
        category: 'care',
        label: 'Annual care-grade progression probabilities',
        evidenceClass: 'model_assumption',
        implementationLocations: ['app/simulator/simulator-data.js:PFLEGE_GRADE_PROGRESSION_PROBABILITIES'],
        unit: 'annual_probability_ratio',
        embeddedValueHash: resolved('34c6e6fc39b311f911f6c4b7a0d0cb8c2ab248f18802a83ce42bc9b52a56c78d'),
        yearConvention: resolved('annual_transition_to_next_care_grade'),
        externalValidationStatus: 'not_validated'
    }),
    care_cost_presets: staticEntry({
        id: 'care_cost_presets',
        category: 'care',
        label: 'Care-cost UI presets',
        evidenceClass: 'model_assumption',
        implementationLocations: ['app/simulator/simulator-ui-pflege.js:PFLEGE_COST_PRESETS'],
        unit: 'eur_per_month',
        currency: resolved('EUR'),
        embeddedValueHash: resolved('a8fd77cf3af02277429ae71d7739d263ea8756363942f5cb773ba5a17623f1bc'),
        externalValidationStatus: 'not_validated'
    }),
    widow_benefit_parameters: staticEntry({
        id: 'widow_benefit_parameters',
        category: 'survivor',
        label: 'Widow-benefit mode and percentage user defaults',
        evidenceClass: 'user_input',
        implementationLocations: [
            'Simulator.html:#widowPensionMode',
            'Simulator.html:#widowPensionPct',
            'app/simulator/simulator-input-pension.js:readWidowOptions'
        ],
        unit: 'percent_of_partner_pension',
        embeddedValueHash: resolved('2123b369b84c6a1cc50adb1bf03edae136c71b10f8dc66e9fc6ca10d4f4dbc1a'),
        contractValue: {
            defaultMode: 'stop',
            defaultPercent: 55,
            percentMinimum: 0,
            percentMaximum: 100,
            percentStep: 5
        },
        externalValidationStatus: 'not_applicable'
    }),
    capital_income_tax_parameters: staticEntry({
        id: 'capital_income_tax_parameters',
        category: 'tax',
        label: 'Parameterized capital-income tax approximation',
        evidenceClass: 'model_assumption',
        implementationLocations: [
            'engine/tax-settlement.mjs',
            'engine/transactions/sale-engine.mjs',
            'app/simulator/simulator-portfolio-tranches.js'
        ],
        unit: 'tax_rate_ratio',
        rawDataHash: unresolved(),
        embeddedValueHash: resolved('29987f286598e41c7def51bd4cbe3cb241f375e69d6ef8a321787b269ec53a8e'),
        source: unresolved(),
        seriesIdentifier: notApplicable(),
        yearConvention: resolved('current_parameterization_applied_to_all_simulated_years'),
        transformation: resolved('capitalGainsTaxRate * (1 + solidaritySurchargeRate + userChurchTaxRate), then tranche partial exemption'),
        license: notApplicable(),
        retrievedAt: unresolved(),
        contractValue: {
            capitalGainsTaxRate: 0.25,
            solidaritySurchargeRate: 0.055,
            defaultEquityTqf: 0.30,
            goldTaxFreeTqf: 1
        },
        externalValidationStatus: 'not_validated'
    }),
    pension_user_defaults: staticEntry({
        id: 'pension_user_defaults',
        category: 'pension_social',
        label: 'Pension, church-tax and adjustment user defaults',
        evidenceClass: 'user_input',
        implementationLocations: [
            'app/simulator/simulator-ui-rente.js:initRente2ConfigWithLocalStorage',
            'app/simulator/simulator-input-pension.js'
        ],
        unit: 'mixed_user_input_contract',
        embeddedValueHash: resolved('52e817148c42d8ad34667d993b10c241e5e80e71c6f8501f4219705f7fd4d3f0'),
        contractValue: {
            p1ChurchTaxPercent: 9,
            p2ChurchTaxPercent: 0,
            rentAdjustmentMode: 'wage'
        },
        externalValidationStatus: 'not_applicable'
    }),
    social_insurance_parameters: staticEntry({
        id: 'social_insurance_parameters',
        category: 'pension_social',
        label: 'Automatic social-insurance parameter table',
        evidenceClass: 'missing',
        implementationLocations: [
            'docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md:MS-07'
        ],
        unit: 'not_implemented',
        embeddedValueHash: notApplicable(),
        externalValidationStatus: 'not_applicable',
        contractValue: { implemented: false }
    }),
    stress_presets: staticEntry({
        id: 'stress_presets',
        category: 'stress_regime',
        label: 'Historical-filter and parametric stress presets',
        evidenceClass: 'stress_parameter',
        implementationLocations: ['app/simulator/simulator-data.js:STRESS_PRESETS'],
        unit: 'mixed_stress_parameter_contract',
        embeddedValueHash: resolved('f63aaaa9deae062da2b815bb3b0f3a24d696a6448c81ebd7f5f73193686a8b11'),
        externalValidationStatus: 'not_applicable'
    }),
    regime_classification_thresholds: staticEntry({
        id: 'regime_classification_thresholds',
        category: 'stress_regime',
        label: 'Historical regime-classification thresholds',
        evidenceClass: 'model_assumption',
        implementationLocations: ['app/simulator/simulator-data.js:REGIME_CLASSIFICATION_THRESHOLDS'],
        unit: 'mixed_percent_and_ratio_thresholds',
        embeddedValueHash: resolved('dcc698a12aa98bac88943cfcf0fa2be63c1ca04ac384dd054ff37a2fe3420a3c'),
        contractValue: {
            inflationHighPct: 5,
            equityPoorRatio: 0,
            equityCrashRatio: -0.15,
            equityBoomRatio: 0.15,
            labels: ['BULL', 'BEAR', 'SIDEWAYS', 'STAGFLATION']
        },
        externalValidationStatus: 'not_validated'
    }),
    regime_transition_matrix: staticEntry({
        id: 'regime_transition_matrix',
        category: 'stress_regime',
        label: 'Derived historical regime transition counts',
        evidenceClass: 'derived',
        implementationLocations: ['app/simulator/simulator-data.js:REGIME_TRANSITIONS'],
        unit: 'transition_count',
        embeddedValueHash: resolved('ab1a37acbf4a1f141983ad194108f028fac85eb3f3c5522efe1d70c42601f398'),
        source: resolved('ruhestandsapp-historical-data-v1 plus REGIME_CLASSIFICATION_THRESHOLDS'),
        seriesIdentifier: resolved('REGIME_TRANSITIONS'),
        transformation: resolved('Count consecutive annual regime labels; empty source regimes fall back to one SIDEWAYS transition.'),
        externalValidationStatus: 'not_validated'
    }),
    engine_policy_defaults: staticEntry({
        id: 'engine_policy_defaults',
        category: 'defaults_fallbacks',
        label: 'Engine policy, threshold and fallback registry',
        evidenceClass: 'model_assumption',
        implementationLocations: ['engine/config.mjs:CONFIG'],
        unit: 'mixed_engine_policy_contract',
        embeddedValueHash: resolved('17347a0c7f9ee71eddc481c6b7fb1252793974e2db70939a6bd92a77a094ba56'),
        externalValidationStatus: 'not_validated'
    }),
    monte_carlo_defaults: staticEntry({
        id: 'monte_carlo_defaults',
        category: 'defaults_fallbacks',
        label: 'Monte Carlo parameter limits, defaults and method vocabulary',
        evidenceClass: 'model_assumption',
        implementationLocations: [
            'app/simulator/monte-carlo-parameters.js:MONTE_CARLO_PARAMETER_LIMITS',
            'app/simulator/monte-carlo-parameters.js:MONTE_CARLO_SAMPLING_METHODS'
        ],
        unit: 'mixed_simulation_parameter_contract',
        embeddedValueHash: resolved('e976c0aec92821a54c299c0422c04d7663d9d9319bfd23ac43e07373c81aacc4'),
        externalValidationStatus: 'not_validated'
    }),
    longevity_defaults: staticEntry({
        id: 'longevity_defaults',
        category: 'defaults_fallbacks',
        label: 'Dynamic-flex longevity defaults, limits and smoothing',
        evidenceClass: 'model_assumption',
        implementationLocations: [
            'app/simulator/dynamic-flex-longevity-contract.js:LONGEVITY_DEFAULTS',
            'app/simulator/dynamic-flex-longevity-contract.js:LONGEVITY_LIMITS',
            'app/simulator/dynamic-flex-longevity-contract.js:LONGEVITY_TRANSITION_SMOOTHING'
        ],
        unit: 'mixed_longevity_parameter_contract',
        embeddedValueHash: resolved('def2533e3ec5c563c2694214f377525ff5d9c7d47111f99c6d7ee2750bc36758'),
        externalValidationStatus: 'not_validated'
    }),
    tail_risk_defaults: staticEntry({
        id: 'tail_risk_defaults',
        category: 'defaults_fallbacks',
        label: 'Tail-risk defaults, bounds and crisis labels',
        evidenceClass: 'stress_parameter',
        implementationLocations: [
            'app/simulator/tail-risk-contract.js:TAIL_RISK_DEFAULT_CONFIG',
            'app/simulator/tail-risk-contract.js:TAIL_RISK_LIMITS',
            'app/simulator/tail-risk-contract.js:TAIL_RISK_HISTORICAL_CRISIS_REGIMES'
        ],
        unit: 'mixed_stress_parameter_contract',
        embeddedValueHash: resolved('26d61df7b34cb51a9e974fdb2b0eb1cbd6f2891706f0150415d0ea00b59b4500'),
        externalValidationStatus: 'not_applicable'
    }),
    health_bucket_defaults: staticEntry({
        id: 'health_bucket_defaults',
        category: 'defaults_fallbacks',
        label: 'Profile health-bucket defaults',
        evidenceClass: 'model_assumption',
        implementationLocations: ['app/profile/profile-state.js:DEFAULT_PROFILE_HEALTH_BUCKET'],
        unit: 'mixed_health_bucket_contract',
        currency: resolved('EUR'),
        embeddedValueHash: resolved('8befa56ac6ab997b946de96ecd0b2625a074d3104fb51296b86a30adb911bb1b'),
        externalValidationStatus: 'not_validated'
    })
};

export const SIMULATION_DATA_INVENTORY = deepFreeze({
    schemaVersion: SIMULATION_DATA_INVENTORY_SCHEMA_VERSION,
    inventoryId: 'ruhestandsapp-simulation-data-inventory-v1',
    revision: SIMULATION_DATA_INVENTORY_REVISION,
    documentation: 'docs/reference/DATA_SOURCES.md',
    evidenceClasses: SIMULATION_DATA_EVIDENCE_CLASSES,
    historicalSeries: HISTORICAL_SERIES,
    staticData: STATIC_DATA,
    gates: {
        externallyValidatedRequires: EXTERNAL_GATE_FIELDS,
        unresolvedMayRunReproducibly: true,
        unresolvedMayClaimExternalValidation: false,
        unresolvedMayReplacePackagedData: false
    }
});

export class SimulationDataInventoryError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = 'SimulationDataInventoryError';
        this.code = code;
        this.details = details;
    }
}

function inventoryError(code, message, details = {}) {
    throw new SimulationDataInventoryError(code, message, details);
}

function requireNonEmptyString(value, path) {
    if (typeof value !== 'string' || value.trim() === '') {
        inventoryError('SIMULATION_DATA_INVENTORY_INVALID', `${path} must be a non-empty string`, { path });
    }
}

function validateResolutionField(field, path) {
    if (!field || typeof field !== 'object' || !RESOLUTION_STATUSES.has(field.status)) {
        inventoryError('SIMULATION_DATA_INVENTORY_INVALID', `${path} has no supported resolution status`, { path });
    }
    if (field.status === 'known') {
        if (field.value === null || field.value === undefined || field.value === '') {
            inventoryError('SIMULATION_DATA_INVENTORY_INVALID', `${path}.value must be populated when known`, { path });
        }
    } else if (field.value !== null) {
        inventoryError('SIMULATION_DATA_INVENTORY_INVALID', `${path}.value must be null when ${field.status}`, { path });
    }
}

function validateEntry(entry, path) {
    if (!entry || typeof entry !== 'object') {
        inventoryError('SIMULATION_DATA_INVENTORY_INVALID', `${path} must be an object`, { path });
    }
    requireNonEmptyString(entry.id, `${path}.id`);
    requireNonEmptyString(entry.category, `${path}.category`);
    requireNonEmptyString(entry.label, `${path}.label`);
    requireNonEmptyString(entry.unit, `${path}.unit`);
    if (!EVIDENCE_CLASSES.has(entry.evidenceClass)) {
        inventoryError('SIMULATION_DATA_EVIDENCE_CLASS_INVALID', `${path}.evidenceClass is unsupported`, {
            path,
            evidenceClass: entry.evidenceClass
        });
    }
    if (!Array.isArray(entry.implementationLocations) || entry.implementationLocations.length === 0) {
        inventoryError('SIMULATION_DATA_COVERAGE_MISSING', `${path} requires implementation locations`, { path });
    }
    for (const [index, location] of entry.implementationLocations.entries()) {
        requireNonEmptyString(location, `${path}.implementationLocations[${index}]`);
    }
    for (const fieldName of REQUIRED_RESOLUTION_FIELDS) {
        validateResolutionField(entry[fieldName], `${path}.${fieldName}`);
    }
    for (const hashFieldName of ['rawDataHash', 'embeddedValueHash']) {
        const hashField = entry[hashFieldName];
        if (hashField.status === 'known'
            && (typeof hashField.value !== 'string' || !/^[a-f0-9]{64}$/.test(hashField.value))) {
            inventoryError('SIMULATION_DATA_HASH_INVALID', `${path}.${hashFieldName} must use a lowercase SHA-256 hex value`, {
                path,
                hashFieldName,
                hash: hashField.value
            });
        }
    }
    if (!EXTERNAL_VALIDATION_STATUSES.has(entry.externalValidationStatus)) {
        inventoryError('SIMULATION_DATA_EXTERNAL_STATUS_INVALID', `${path}.externalValidationStatus is unsupported`, {
            path,
            externalValidationStatus: entry.externalValidationStatus
        });
    }
    if (entry.externalValidationStatus === 'externally_validated') {
        const unresolvedFields = EXTERNAL_GATE_FIELDS.filter(fieldName => entry[fieldName].status !== 'known');
        if (unresolvedFields.length > 0
            || ['model_assumption', 'user_input', 'stress_parameter', 'missing', 'unresolved'].includes(entry.evidenceClass)) {
            inventoryError(
                'SIMULATION_DATA_EXTERNAL_VALIDATION_UNPROVEN',
                `${path} cannot claim external validation`,
                { path, unresolvedFields, evidenceClass: entry.evidenceClass }
            );
        }
    }
}

function validateQualitySegments(series, path) {
    if (!Array.isArray(series.qualitySegments) || series.qualitySegments.length === 0) {
        inventoryError('SIMULATION_DATA_QUALITY_SEGMENTS_MISSING', `${path}.qualitySegments must not be empty`, { path });
    }
    let expectedStartYear = 1925;
    for (let index = 0; index < series.qualitySegments.length; index++) {
        const segment = series.qualitySegments[index];
        const segmentPath = `${path}.qualitySegments[${index}]`;
        if (!Number.isInteger(segment.startYear) || !Number.isInteger(segment.endYear)
            || segment.startYear !== expectedStartYear || segment.endYear < segment.startYear) {
            inventoryError(
                'SIMULATION_DATA_QUALITY_SEGMENTS_INVALID',
                `${segmentPath} must provide contiguous ordered coverage`,
                { segmentPath, expectedStartYear, segment }
            );
        }
        if (!EVIDENCE_CLASSES.has(segment.evidenceClass)) {
            inventoryError('SIMULATION_DATA_EVIDENCE_CLASS_INVALID', `${segmentPath}.evidenceClass is unsupported`, {
                segmentPath,
                evidenceClass: segment.evidenceClass
            });
        }
        requireNonEmptyString(segment.note, `${segmentPath}.note`);
        expectedStartYear = segment.endYear + 1;
    }
    if (expectedStartYear !== 2026) {
        inventoryError('SIMULATION_DATA_QUALITY_SEGMENTS_INVALID', `${path}.qualitySegments must cover through 2025`, {
            path,
            lastCoveredYear: expectedStartYear - 1
        });
    }
}

function validateDiscontinuities(series, path) {
    if (!Array.isArray(series.discontinuities)) {
        inventoryError('SIMULATION_DATA_DISCONTINUITIES_INVALID', `${path}.discontinuities must be an array`, { path });
    }
    let previousYear = 1924;
    for (let index = 0; index < series.discontinuities.length; index++) {
        const discontinuity = series.discontinuities[index];
        const discontinuityPath = `${path}.discontinuities[${index}]`;
        if (!Number.isInteger(discontinuity?.year)
            || discontinuity.year < 1925
            || discontinuity.year > 2025
            || discontinuity.year <= previousYear) {
            inventoryError('SIMULATION_DATA_DISCONTINUITIES_INVALID', `${discontinuityPath}.year must be unique and ascending within the historical period`, {
                discontinuityPath,
                previousYear,
                discontinuity
            });
        }
        requireNonEmptyString(discontinuity.type, `${discontinuityPath}.type`);
        requireNonEmptyString(discontinuity.note, `${discontinuityPath}.note`);
        previousYear = discontinuity.year;
    }
}

export function validateSimulationDataInventory(inventory = SIMULATION_DATA_INVENTORY) {
    if (!inventory || typeof inventory !== 'object'
        || inventory.schemaVersion !== SIMULATION_DATA_INVENTORY_SCHEMA_VERSION) {
        inventoryError('SIMULATION_DATA_INVENTORY_INVALID', 'Unsupported or missing simulation data inventory schema', {
            schemaVersion: inventory?.schemaVersion
        });
    }
    requireNonEmptyString(inventory.inventoryId, 'inventory.inventoryId');
    requireNonEmptyString(inventory.revision, 'inventory.revision');
    requireNonEmptyString(inventory.documentation, 'inventory.documentation');

    for (const seriesId of REQUIRED_HISTORICAL_SERIES) {
        const series = inventory.historicalSeries?.[seriesId];
        validateEntry(series, `inventory.historicalSeries.${seriesId}`);
        if (series.id !== seriesId || series.category !== 'historical_series') {
            inventoryError('SIMULATION_DATA_HISTORICAL_SERIES_INVALID', `Historical series ${seriesId} has inconsistent identity`, {
                seriesId,
                id: series.id,
                category: series.category
            });
        }
        validateQualitySegments(series, `inventory.historicalSeries.${seriesId}`);
        validateDiscontinuities(series, `inventory.historicalSeries.${seriesId}`);
    }

    const staticEntries = Object.values(inventory.staticData || {});
    const seenIds = new Set(REQUIRED_HISTORICAL_SERIES);
    for (const entry of staticEntries) {
        validateEntry(entry, `inventory.staticData.${entry?.id || 'unknown'}`);
        if (seenIds.has(entry.id)) {
            inventoryError('SIMULATION_DATA_DUPLICATE_ID', `Duplicate inventory ID ${entry.id}`, { id: entry.id });
        }
        seenIds.add(entry.id);
    }
    const presentCategories = new Set(staticEntries.map(entry => entry.category));
    const missingCategories = REQUIRED_STATIC_CATEGORIES.filter(category => !presentCategories.has(category));
    if (missingCategories.length > 0) {
        inventoryError('SIMULATION_DATA_STATIC_CATEGORY_MISSING', 'Static data inventory is incomplete', {
            missingCategories
        });
    }

    if (inventory.gates?.unresolvedMayRunReproducibly !== true
        || inventory.gates?.unresolvedMayClaimExternalValidation !== false
        || inventory.gates?.unresolvedMayReplacePackagedData !== false) {
        inventoryError('SIMULATION_DATA_GATE_INVALID', 'Inventory unresolved gates must fail closed for external claims and replacement');
    }
    return inventory;
}

export function findSimulationDataInventoryEntry(entryId, inventory = SIMULATION_DATA_INVENTORY) {
    return inventory.historicalSeries?.[entryId] || inventory.staticData?.[entryId] || null;
}

export function computeSimulationDataValueHash(value) {
    return sha256Hex(canonicalizeHistoricalContractValue(value));
}

export function assertSimulationDataValueHash(entryId, value, inventory = SIMULATION_DATA_INVENTORY) {
    const entry = findSimulationDataInventoryEntry(entryId, inventory);
    if (!entry) {
        inventoryError('SIMULATION_DATA_ENTRY_UNKNOWN', `Unknown simulation data inventory entry ${entryId}`, { entryId });
    }
    if (entry.embeddedValueHash.status !== 'known') {
        inventoryError('SIMULATION_DATA_HASH_UNRESOLVED', `Inventory entry ${entryId} has no resolved value hash`, { entryId });
    }
    const actualHash = computeSimulationDataValueHash(value);
    if (actualHash !== entry.embeddedValueHash.value) {
        inventoryError('SIMULATION_DATA_HASH_MISMATCH', `Inventory hash mismatch for ${entryId}`, {
            entryId,
            expectedHash: entry.embeddedValueHash.value,
            actualHash
        });
    }
    return actualHash;
}

export function evaluateSimulationDataSourceGate(entryId, inventory = SIMULATION_DATA_INVENTORY) {
    const entry = findSimulationDataInventoryEntry(entryId, inventory);
    if (!entry) {
        inventoryError('SIMULATION_DATA_ENTRY_UNKNOWN', `Unknown simulation data inventory entry ${entryId}`, { entryId });
    }
    const unresolvedFields = EXTERNAL_GATE_FIELDS.filter(fieldName => entry[fieldName].status !== 'known');
    const evidenceBlocksExternalUse = [
        'model_assumption',
        'user_input',
        'stress_parameter',
        'missing',
        'unresolved'
    ].includes(entry.evidenceClass);
    const externallyValidated = entry.externalValidationStatus === 'externally_validated'
        && unresolvedFields.length === 0
        && !evidenceBlocksExternalUse;
    return deepFreeze({
        entryId,
        technicallyReproducible: entry.embeddedValueHash.status === 'known',
        externallyValidated,
        replacementAllowed: externallyValidated,
        unresolvedFields,
        evidenceClass: entry.evidenceClass,
        externalValidationStatus: entry.externalValidationStatus
    });
}
