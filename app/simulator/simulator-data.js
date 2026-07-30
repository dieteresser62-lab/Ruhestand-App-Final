/**
 * Module: Simulator Data
 * Purpose: Central repository for static simulation data.
 *          Includes historical market data (1925-2025), mortality tables,
 *          care grades/probabilities, and stress test presets.
 * Usage: Imported by various simulator modules (historical, stress, etc.).
 * Dependencies: generated global equity, German CPI and German cash/money-market research-chain data
 */
"use strict";

import {
  GLOBAL_EQUITY_RESEARCH_ANNUAL_RETURNS,
  GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS
} from './global-equity-research-chain.js';
import { GERMAN_CPI_INFLATION_RATES } from './german-cpi-chain.js';
import { GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS } from './german-cash-money-market-chain.js';

// --- DATA & CONFIG ---

export const ESTIMATED_HISTORY_MIN_YEAR = 1925;
export const ESTIMATED_HISTORY_MAX_YEAR = 1950;
export const ESTIMATED_HISTORY_CUTOFF_YEAR = 1951;

function deepFreezeDataMetadata(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreezeDataMetadata(child, seen);
  return Object.freeze(value);
}

const HISTORICAL_PERIOD = Object.freeze({ startYear: 1925, endYear: 2025 });
const ESTIMATED_HISTORY_SEGMENTS = Object.freeze([
  Object.freeze({
    startYear: ESTIMATED_HISTORY_MIN_YEAR,
    endYear: ESTIMATED_HISTORY_MAX_YEAR,
    qualityStatus: 'estimated',
    note: 'The global estimated-history exclusion follows the equity proxy through 1950; series-specific evidence segments remain authoritative.'
  })
]);
const GLOBAL_EQUITY_ESTIMATED_SEGMENTS = Object.freeze([
  Object.freeze({
    startYear: 1925,
    endYear: 1950,
    qualityStatus: 'estimated',
    note: 'Open JST total-return research proxy in USD through the 1950 return; not a provider index or German-investor-currency series.'
  }),
  Object.freeze({
    startYear: 2021,
    endYear: 2025,
    qualityStatus: 'estimated',
    note: 'Open OECD price return plus frozen country-level JST 2020 dividend return, converted with ECB reference rates.'
  })
]);
const GERMAN_CPI_ESTIMATED_SEGMENTS = Object.freeze([
  Object.freeze({
    startYear: 1925,
    endYear: 1949,
    qualityStatus: 'estimated',
    note: 'JST R6 German CPI level-change proxy before the official Destatis chain begins in 1950.'
  })
]);
const GERMAN_CASH_MONEY_MARKET_ESTIMATED_SEGMENTS = Object.freeze([
  Object.freeze({
    startYear: 1925,
    endYear: 1948,
    qualityStatus: 'estimated',
    note: 'JST short-rate proxy through 1944 plus an explicit last-observation carry-forward bridge for the unobserved market-closure years 1945-1948.'
  })
]);

function historicalSeriesManifest({
  id,
  label,
  unit,
  variant,
  currency,
  region,
  transformation,
  source = { status: 'unresolved', value: null },
  license = { status: 'unresolved', value: null },
  estimatedSegments = ESTIMATED_HISTORY_SEGMENTS,
  zeroValuePolicy = 'literal_value'
}) {
  return {
    id,
    label,
    unit,
    variant,
    currency,
    region,
    frequency: { status: 'known', value: 'annual' },
    period: HISTORICAL_PERIOD,
    source,
    license,
    transformation,
    estimatedSegments,
    missingness: {
      required: true,
      rule: 'reject_missing_or_non_finite',
      fallbackZeroSegments: [],
      zeroValuePolicy
    },
    revision: '2026-07-29.5'
  };
}

/**
 * Reproduzierbarer Vertrag fuer den eingebetteten historischen Datenbestand.
 * Ungeklaerte Herkunfts-, Varianten- und Lizenzangaben bleiben absichtlich
 * `unresolved`; der Hash wird vom DOM-freien Contract gegen die kanonische
 * Post-Normalisierungs-Projektion von HISTORICAL_DATA geprueft.
 */
export const HISTORICAL_DATA_MANIFEST = deepFreezeDataMetadata({
  schemaVersion: 'HistoricalDataManifestV1',
  datasetId: 'ruhestandsapp-historical-data-v1',
  revision: '2026-07-29.5',
  period: HISTORICAL_PERIOD,
  lookback: {
    backtestYears: 4,
    reason: 'Equity return plus endeVJ, endeVJ_1, endeVJ_2 and endeVJ_3 initialization.'
  },
  contentHash: {
    algorithm: 'sha256-canonical-json-v1',
    value: '6a1ff0c9245d66d5aec69d85e216daf8c0c005804f70868f681452b47353e543'
  },
  documentation: 'docs/reference/DATA_SOURCES.md',
  series: {
    global_equity_research_index: historicalSeriesManifest({
      id: 'global_equity_research_index',
      label: 'Open global equity research total-return index level',
      unit: 'index_level',
      variant: { status: 'known', value: 'economically_weighted_research_total_return_proxy' },
      currency: {
        status: 'known',
        value: 'USD proxy 1925-1950; German investor currency 1951-2020; EUR 2021-2025'
      },
      region: { status: 'known', value: '16 advanced economies' },
      source: {
        status: 'known',
        value: 'JST Macrohistory Database R6; OECD DSD_STES@DF_FINMARK 4.0; ECB EXR'
      },
      license: {
        status: 'known',
        value: 'Derived data: CC BY-NC-SA 4.0; OECD and ESCB source terms also apply'
      },
      transformation: {
        status: 'known',
        value: 'Prior-year economic weights; JST total returns in USD through 1950 and German investor currency from 1951 through 2020; OECD December price return plus frozen JST 2020 dividend return and ECB conversion for 2021-2025.'
      },
      estimatedSegments: GLOBAL_EQUITY_ESTIMATED_SEGMENTS
    }),
    inflation_de: historicalSeriesManifest({
      id: 'inflation_de',
      label: 'German annual consumer-price inflation',
      unit: 'percent_per_year',
      variant: {
        status: 'known',
        value: 'segmented German national consumer-price chain; excludes HICP/HVPI'
      },
      currency: { status: 'not_applicable', value: null },
      region: { status: 'known', value: 'DE' },
      source: {
        status: 'known',
        value: 'JST Macrohistory Database R6 (1925-1949); Destatis consumer-price long series (1950-2024); Destatis current annual table (2025)'
      },
      license: {
        status: 'known',
        value: 'JST-derived segment CC BY-NC-SA 4.0; Destatis segments Data Licence Germany - attribution - 2.0'
      },
      transformation: {
        status: 'known',
        value: 'JST consecutive-level percentage changes through 1949; levels normalized to 1938=126 are integer-quantized for 1925-1948, 1936-1948 spans price controls/wartime freeze, and 1949 is an explicit post-currency-reform proxy splice (+7.0352% versus the -1.0526% Destatis level-derived alternative). The CPI proxy does not represent the separate 100:6.5 nominal write-down of major Reichsmark cash and bank/savings balances and must not be used as a continuous-currency monetary-asset deflator across 1948. Published Destatis annual-average changes start in 1950, with each transition calculated inside one source series.'
      },
      estimatedSegments: GERMAN_CPI_ESTIMATED_SEGMENTS
    }),
    zinssatz_de: historicalSeriesManifest({
      id: 'zinssatz_de',
      label: 'German cash and overnight money-market gross return proxy',
      unit: 'percent_per_year',
      variant: {
        status: 'known',
        value: 'segmented annual-average nominal short/overnight money-market gross return proxy'
      },
      currency: { status: 'not_applicable', value: null },
      region: { status: 'known', value: 'DE' },
      source: {
        status: 'known',
        value: 'JST Macrohistory Database R6 DEU.stir (1925-1944); explicit 1944 carry-forward bridge (1945-1948); Deutsche Bundesbank overnight-money-market long series (1949-2025), with Fritz Knapp/Bundesbank source chain through 1975'
      },
      license: {
        status: 'known',
        value: 'JST-derived segment CC BY-NC-SA 4.0; Bundesbank/ESCB statistics reuse terms with attribution; ECB EURSTR administrator disclaimer applies'
      },
      transformation: {
        status: 'known',
        value: 'Published annual-average nominal percentages are projected once through the existing shared cashBondReturn path to cash-like holdings and bond tranches. The latter is a maturity-mismatched model proxy, not a historical bond-index return. No additional compounding, product costs, bank margin or tax is embedded. The 1945-1948 gap explicitly carries the 1944 JST value forward and fails closed outside that declared gap; the separate 1948 monetary-balance write-down is not implemented.'
      },
      estimatedSegments: GERMAN_CASH_MONEY_MARKET_ESTIMATED_SEGMENTS
    }),
    lohn_de: historicalSeriesManifest({
      id: 'lohn_de',
      label: 'German wage growth proxy',
      unit: 'percent_per_year',
      variant: { status: 'unresolved', value: null },
      currency: { status: 'not_applicable', value: null },
      region: { status: 'known', value: 'DE' },
      transformation: { status: 'known', value: 'Identity projection from embedded annual percentage values.' }
    }),
    gold_eur_perf: historicalSeriesManifest({
      id: 'gold_eur_perf',
      label: 'Gold annual return proxy in EUR',
      unit: 'percent_per_year',
      variant: { status: 'unresolved', value: null },
      currency: { status: 'known', value: 'EUR' },
      region: { status: 'known', value: 'global' },
      transformation: { status: 'known', value: 'Identity projection from embedded annual percentage values.' },
      zeroValuePolicy: 'unresolved_if_zero'
    }),
    cape: historicalSeriesManifest({
      id: 'cape',
      label: 'CAPE valuation proxy',
      unit: 'ratio',
      variant: { status: 'unresolved', value: null },
      currency: { status: 'not_applicable', value: null },
      region: { status: 'unresolved', value: null },
      transformation: { status: 'known', value: 'Identity projection from embedded annual ratio values.' }
    })
  }
});

/**
 * Maschinenlesbare Metadaten zu Datenherkunft und Qualität der Simulationsreihen.
 * Detaillierte Quellenangaben stehen in docs/reference/DATA_SOURCES.md.
 */
export const DATASET_META = Object.freeze({
  historicalData: {
    manifestId: HISTORICAL_DATA_MANIFEST.datasetId,
    revision: HISTORICAL_DATA_MANIFEST.revision,
    contentHash: HISTORICAL_DATA_MANIFEST.contentHash,
    coverageYears: [1925, 2025],
    estimatedYears: [ESTIMATED_HISTORY_MIN_YEAR, ESTIMATED_HISTORY_MAX_YEAR],
    estimatedHistoryCutoffYear: ESTIMATED_HISTORY_CUTOFF_YEAR,
    notes: [
      'Equity years 1925-1950 are an explicit USD research proxy; the German investor-currency conversion starts with the 1951 return.',
      'Equity years 2021-2025 use observed OECD price components and a modelled dividend component.',
      'German inflation uses a JST proxy through 1949 and a segmented official Destatis national consumer-price chain from 1950; HICP/HVPI is excluded.',
      'German cashBondReturn uses a JST short-rate proxy through 1944, an explicit 1945-1948 carry-forward bridge, a Bundesbank-published Frankfurt-bank proxy through 1996 and official FIBOR/EONIA/EURSTR annual averages thereafter. The existing model also applies this overnight proxy to bond tranches and does not implement the separate 1948 monetary-balance write-down.',
      'Use the Monte Carlo setting "exclude estimated history" to omit observations marked estimated.'
    ],
    series: {
      global_equity_research_index: {
        label: 'Open global equity research total-return index level',
        variantStatus: 'documented_research_proxy',
        sourceStatus: 'open_segmented_source_chain'
      },
      inflation_de: {
        label: 'German CPI inflation (annual)',
        variantStatus: 'documented_segmented_national_cpi_chain',
        sourceStatus: 'open_segmented_source_chain'
      },
      zinssatz_de: {
        label: 'German cash and overnight money-market gross return proxy (annual)',
        variantStatus: 'documented_segmented_short_overnight_proxy',
        sourceStatus: 'open_segmented_source_chain'
      },
      lohn_de: {
        label: 'German wage growth proxy (annual)',
        sourceStatus: 'historical_series'
      },
      gold_eur_perf: {
        label: 'Gold annual performance (EUR proxy)',
        sourceStatus: 'partial_history_with_zero_fallbacks'
      },
      cape: {
        label: 'CAPE/Shiller valuation proxy',
        sourceStatus: 'historical_proxy'
      }
    },
    documentation: 'docs/reference/DATA_SOURCES.md'
  }
});

/**
 * Altersabhängige Eintrittswahrscheinlichkeiten für Pflegegrade 1–5.
 *
 * Quelle: BARMER Pflegereport 2024, Kapitel 2. Die dort veröffentlichten
 * Prävalenzen pro Pflegegrad wurden auf Jahresinzidenzen heruntergebrochen,
 * indem wir eine durchschnittliche Pflegedauer von vier Jahren annehmen und
 * die Werte über 5-Jahres-Altersbuckets glätten. Die Summe der Grade ergibt
 * somit den jährlichen Eintritt in irgendeinen Pflegegrad.
 */
export const SUPPORTED_PFLEGE_GRADES = [1, 2, 3, 4, 5];

export const PFLEGE_GRADE_LABELS = {
  1: 'Pflegegrad 1 – geringe Beeinträchtigung',
  2: 'Pflegegrad 2 – erhebliche Beeinträchtigung',
  3: 'Pflegegrad 3 – schwere Beeinträchtigung',
  4: 'Pflegegrad 4 – schwerste Beeinträchtigung',
  5: 'Pflegegrad 5 – besondere Anforderungen'
};

/**
 * Jährliche Wahrscheinlichkeiten für Verschlechterung des Pflegegrades (Progression).
 *
 * Basierend auf Studien zur Pflegebedürftigkeitsentwicklung:
 * - Niedrigere Grade verschlechtern sich häufiger (mehr "Raum nach oben")
 * - Höhere Grade haben geringere Progressionsraten
 * - Im Durchschnitt dauert es 6-8 Jahre von PG1 bis PG5
 *
 * Beispiel: Bei PG2 beträgt die Wahrscheinlichkeit 12% pro Jahr,
 * im nächsten Jahr zu PG3 zu wechseln.
 */
export const PFLEGE_GRADE_PROGRESSION_PROBABILITIES = {
  1: 0.15,  // PG1 → PG2: 15% pro Jahr
  2: 0.12,  // PG2 → PG3: 12% pro Jahr
  3: 0.10,  // PG3 → PG4: 10% pro Jahr
  4: 0.08,  // PG4 → PG5: 8% pro Jahr
  5: 0.00   // PG5: Keine weitere Verschlechterung möglich
};

export const PFLEGE_GRADE_PROBABILITIES = {
  65: { 1: 0.012, 2: 0.006, 3: 0.003, 4: 0.0015, 5: 0.0005 },
  70: { 1: 0.020, 2: 0.010, 3: 0.005, 4: 0.0025, 5: 0.0010 },
  75: { 1: 0.035, 2: 0.018, 3: 0.009, 4: 0.0045, 5: 0.0020 },
  80: { 1: 0.055, 2: 0.032, 3: 0.016, 4: 0.0075, 5: 0.0035 },
  85: { 1: 0.085, 2: 0.055, 3: 0.032, 4: 0.0150, 5: 0.0070 },
  90: { 1: 0.120, 2: 0.080, 3: 0.050, 4: 0.0280, 5: 0.0120 },
  95: { 1: 0.140, 2: 0.090, 3: 0.060, 4: 0.0350, 5: 0.0150 }
};

export const REGIME_CLASSIFICATION_THRESHOLDS = Object.freeze({
  inflationHighPct: 5,
  equityPoorRatio: 0,
  equityCrashRatio: -0.15,
  equityBoomRatio: 0.15,
  labels: Object.freeze(['BULL', 'BEAR', 'SIDEWAYS', 'STAGFLATION'])
});

/**
 * Historische Marktdaten (1925-2025)
 *
 * Hinweis zu `global_equity_research_index`:
 * - Offene, wirtschaftsgewichtete Forschungsproxyreihe; kein Anbieterindex.
 * - 1925-1950: JST-Total-Returns als USD-Waehrungsproxy.
 * - 1951-2020: JST-Total-Returns in deutscher Anlegerwaehrung.
 * - 2021-2025: OECD-Price-Komponente plus modellierter JST-2020-
 *   Dividendenbaustein, mit EZB-Kursen in EUR umgerechnet.
 * - Quellen der Aktienlevel, Inflationsraten und Geldmarktrenditen sind
 *   ausschliesslich die jeweiligen generierten Datenmodule.
 */
export const HISTORICAL_DATA = {
  1925: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1925], inflation_de: GERMAN_CPI_INFLATION_RATES[1925], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1925], lohn_de: 3, gold_eur_perf: 0, cape: 10 },
  1926: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1926], inflation_de: GERMAN_CPI_INFLATION_RATES[1926], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1926], lohn_de: 3, gold_eur_perf: 0, cape: 11.7 },
  1927: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1927], inflation_de: GERMAN_CPI_INFLATION_RATES[1927], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1927], lohn_de: 3, gold_eur_perf: 0, cape: 17.5 },
  1928: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1928], inflation_de: GERMAN_CPI_INFLATION_RATES[1928], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1928], lohn_de: 3, gold_eur_perf: 0, cape: 24.8 },
  1929: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1929], inflation_de: GERMAN_CPI_INFLATION_RATES[1929], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1929], lohn_de: 3, gold_eur_perf: 0, cape: 32.6 },
  1930: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1930], inflation_de: GERMAN_CPI_INFLATION_RATES[1930], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1930], lohn_de: 3, gold_eur_perf: 0, cape: 21 },
  1931: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1931], inflation_de: GERMAN_CPI_INFLATION_RATES[1931], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1931], lohn_de: 3, gold_eur_perf: 0, cape: 12.3 },
  1932: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1932], inflation_de: GERMAN_CPI_INFLATION_RATES[1932], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1932], lohn_de: 3, gold_eur_perf: 0, cape: 5.6 },
  1933: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1933], inflation_de: GERMAN_CPI_INFLATION_RATES[1933], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1933], lohn_de: 3, gold_eur_perf: 69, cape: 10.3 },
  1934: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1934], inflation_de: GERMAN_CPI_INFLATION_RATES[1934], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1934], lohn_de: 3, gold_eur_perf: 0, cape: 11.3 },
  1935: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1935], inflation_de: GERMAN_CPI_INFLATION_RATES[1935], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1935], lohn_de: 3, gold_eur_perf: 0, cape: 14 },
  1936: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1936], inflation_de: GERMAN_CPI_INFLATION_RATES[1936], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1936], lohn_de: 3, gold_eur_perf: 0, cape: 18.2 },
  1937: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1937], inflation_de: GERMAN_CPI_INFLATION_RATES[1937], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1937], lohn_de: 3, gold_eur_perf: 0, cape: 14.2 },
  1938: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1938], inflation_de: GERMAN_CPI_INFLATION_RATES[1938], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1938], lohn_de: 3, gold_eur_perf: 0, cape: 11 },
  1939: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1939], inflation_de: GERMAN_CPI_INFLATION_RATES[1939], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1939], lohn_de: 3, gold_eur_perf: 0, cape: 12 },
  1940: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1940], inflation_de: GERMAN_CPI_INFLATION_RATES[1940], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1940], lohn_de: 3, gold_eur_perf: 0, cape: 10.2 },
  1941: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1941], inflation_de: GERMAN_CPI_INFLATION_RATES[1941], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1941], lohn_de: 3, gold_eur_perf: 0, cape: 10.2 },
  1942: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1942], inflation_de: GERMAN_CPI_INFLATION_RATES[1942], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1942], lohn_de: 3, gold_eur_perf: 0, cape: 8.4 },
  1943: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1943], inflation_de: GERMAN_CPI_INFLATION_RATES[1943], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1943], lohn_de: 3, gold_eur_perf: 0, cape: 10.3 },
  1944: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1944], inflation_de: GERMAN_CPI_INFLATION_RATES[1944], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1944], lohn_de: 3, gold_eur_perf: 0, cape: 11.2 },
  1945: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1945], inflation_de: GERMAN_CPI_INFLATION_RATES[1945], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1945], lohn_de: 3, gold_eur_perf: 0, cape: 11.9 },
  1946: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1946], inflation_de: GERMAN_CPI_INFLATION_RATES[1946], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1946], lohn_de: 3, gold_eur_perf: 0, cape: 15.2 },
  1947: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1947], inflation_de: GERMAN_CPI_INFLATION_RATES[1947], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1947], lohn_de: 3, gold_eur_perf: 0, cape: 10.8 },
  1948: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1948], inflation_de: GERMAN_CPI_INFLATION_RATES[1948], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1948], lohn_de: 3, gold_eur_perf: 0, cape: 9.3 },
  1949: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1949], inflation_de: GERMAN_CPI_INFLATION_RATES[1949], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1949], lohn_de: 3, gold_eur_perf: 0, cape: 9.1 },
  1950: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1950], inflation_de: GERMAN_CPI_INFLATION_RATES[1950], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1950], lohn_de: 12.0, gold_eur_perf: 0.0, cape: 10.8 },
  1951: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1951], inflation_de: GERMAN_CPI_INFLATION_RATES[1951], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1951], lohn_de: 14.0, gold_eur_perf: 0.0, cape: 11.8 },
  1952: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1952], inflation_de: GERMAN_CPI_INFLATION_RATES[1952], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1952], lohn_de: 8.0, gold_eur_perf: 0.0, cape: 12.3 },
  1953: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1953], inflation_de: GERMAN_CPI_INFLATION_RATES[1953], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1953], lohn_de: 6.0, gold_eur_perf: 0.0, cape: 11.5 },
  1954: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1954], inflation_de: GERMAN_CPI_INFLATION_RATES[1954], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1954], lohn_de: 5.0, gold_eur_perf: 0.0, cape: 14.5 },
  1955: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1955], inflation_de: GERMAN_CPI_INFLATION_RATES[1955], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1955], lohn_de: 7.0, gold_eur_perf: 0.0, cape: 18.6 },
  1956: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1956], inflation_de: GERMAN_CPI_INFLATION_RATES[1956], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1956], lohn_de: 8.5, gold_eur_perf: 0.0, cape: 18.3 },
  1957: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1957], inflation_de: GERMAN_CPI_INFLATION_RATES[1957], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1957], lohn_de: 8.0, gold_eur_perf: 0.0, cape: 15.4 },
  1958: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1958], inflation_de: GERMAN_CPI_INFLATION_RATES[1958], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1958], lohn_de: 6.5, gold_eur_perf: 0.0, cape: 18.9 },
  1959: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1959], inflation_de: GERMAN_CPI_INFLATION_RATES[1959], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1959], lohn_de: 5.5, gold_eur_perf: 0.0, cape: 19.6 },
  1960: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1960], inflation_de: GERMAN_CPI_INFLATION_RATES[1960], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1960], lohn_de: 9.0, gold_eur_perf: 0.0, cape: 18.2 },
  1961: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1961], inflation_de: GERMAN_CPI_INFLATION_RATES[1961], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1961], lohn_de: 10.0, gold_eur_perf: -4.8, cape: 21.3 },
  1962: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1962], inflation_de: GERMAN_CPI_INFLATION_RATES[1962], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1962], lohn_de: 8.5, gold_eur_perf: 0.0, cape: 17.5 },
  1963: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1963], inflation_de: GERMAN_CPI_INFLATION_RATES[1963], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1963], lohn_de: 7.0, gold_eur_perf: 0.0, cape: 20.8 },
  1964: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1964], inflation_de: GERMAN_CPI_INFLATION_RATES[1964], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1964], lohn_de: 8.0, gold_eur_perf: 0.0, cape: 22.2 },
  1965: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1965], inflation_de: GERMAN_CPI_INFLATION_RATES[1965], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1965], lohn_de: 9.0, gold_eur_perf: 0.0, cape: 23.8 },
  1966: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1966], inflation_de: GERMAN_CPI_INFLATION_RATES[1966], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1966], lohn_de: 7.0, gold_eur_perf: 0.0, cape: 19.9 },
  1967: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1967], inflation_de: GERMAN_CPI_INFLATION_RATES[1967], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1967], lohn_de: 3.5, gold_eur_perf: 0.0, cape: 21.5 },
  1968: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1968], inflation_de: GERMAN_CPI_INFLATION_RATES[1968], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1968], lohn_de: 6.0, gold_eur_perf: 0.0, cape: 22.4 },
  1969: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1969], inflation_de: GERMAN_CPI_INFLATION_RATES[1969], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1969], lohn_de: 9.8, gold_eur_perf: -8.5, cape: 16.9 },
  1970: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1970], inflation_de: GERMAN_CPI_INFLATION_RATES[1970], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1970], lohn_de: 12.6, gold_eur_perf: 4.3, cape: 15.6 },
  1971: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1971], inflation_de: GERMAN_CPI_INFLATION_RATES[1971], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1971], lohn_de: 10.5, gold_eur_perf: 19.8, cape: 17.2 },
  1972: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1972], inflation_de: GERMAN_CPI_INFLATION_RATES[1972], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1972], lohn_de: 9.1, gold_eur_perf: 47.2, cape: 18.8 },
  1973: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1973], inflation_de: GERMAN_CPI_INFLATION_RATES[1973], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1973], lohn_de: 10.2, gold_eur_perf: 68.5, cape: 18.7 },
  1974: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1974], inflation_de: GERMAN_CPI_INFLATION_RATES[1974], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1974], lohn_de: 10.8, gold_eur_perf: 70.1, cape: 14.3 },
  1975: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1975], inflation_de: GERMAN_CPI_INFLATION_RATES[1975], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1975], lohn_de: 7.2, gold_eur_perf: -25.8, cape: 9.3 },
  1976: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1976], inflation_de: GERMAN_CPI_INFLATION_RATES[1976], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1976], lohn_de: 7.3, gold_eur_perf: -1.5, cape: 10.6 },
  1977: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1977], inflation_de: GERMAN_CPI_INFLATION_RATES[1977], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1977], lohn_de: 7.1, gold_eur_perf: 22.4, cape: 10.6 },
  1978: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1978], inflation_de: GERMAN_CPI_INFLATION_RATES[1978], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1978], lohn_de: 5.4, gold_eur_perf: 35.7, cape: 9.2 },
  1979: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1979], inflation_de: GERMAN_CPI_INFLATION_RATES[1979], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1979], lohn_de: 6.2, gold_eur_perf: 126.3, cape: 8.8 },
  1980: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1980], inflation_de: GERMAN_CPI_INFLATION_RATES[1980], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1980], lohn_de: 6.6, gold_eur_perf: -6.2, cape: 7.3 },
  1981: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1981], inflation_de: GERMAN_CPI_INFLATION_RATES[1981], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1981], lohn_de: 4.8, gold_eur_perf: -20.8, cape: 8.5 },
  1982: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1982], inflation_de: GERMAN_CPI_INFLATION_RATES[1982], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1982], lohn_de: 4.2, gold_eur_perf: 18.9, cape: 7.4 },
  1983: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1983], inflation_de: GERMAN_CPI_INFLATION_RATES[1983], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1983], lohn_de: 3.7, gold_eur_perf: -18.9, cape: 8.8 },
  1984: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1984], inflation_de: GERMAN_CPI_INFLATION_RATES[1984], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1984], lohn_de: 3.4, gold_eur_perf: -15.4, cape: 10.5 },
  1985: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1985], inflation_de: GERMAN_CPI_INFLATION_RATES[1985], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1985], lohn_de: 3.7, gold_eur_perf: 12.7, cape: 10.1 },
  1986: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1986], inflation_de: GERMAN_CPI_INFLATION_RATES[1986], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1986], lohn_de: 4.1, gold_eur_perf: 24.1, cape: 12.8 },
  1987: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1987], inflation_de: GERMAN_CPI_INFLATION_RATES[1987], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1987], lohn_de: 3.2, gold_eur_perf: 1.8, cape: 16.8 },
  1988: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1988], inflation_de: GERMAN_CPI_INFLATION_RATES[1988], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1988], lohn_de: 3.8, gold_eur_perf: -12.4, cape: 15.3 },
  1989: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1989], inflation_de: GERMAN_CPI_INFLATION_RATES[1989], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1989], lohn_de: 3.9, gold_eur_perf: -2.4, cape: 15.2 },
  1990: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1990], inflation_de: GERMAN_CPI_INFLATION_RATES[1990], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1990], lohn_de: 5.8, gold_eur_perf: -7.8, cape: 17.5 },
  1991: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1991], inflation_de: GERMAN_CPI_INFLATION_RATES[1991], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1991], lohn_de: 6.7, gold_eur_perf: -6.1, cape: 15.9 },
  1992: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1992], inflation_de: GERMAN_CPI_INFLATION_RATES[1992], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1992], lohn_de: 5.7, gold_eur_perf: -5.8, cape: 19.6 },
  1993: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1993], inflation_de: GERMAN_CPI_INFLATION_RATES[1993], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1993], lohn_de: 3.3, gold_eur_perf: 20.1, cape: 20.8 },
  1994: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1994], inflation_de: GERMAN_CPI_INFLATION_RATES[1994], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1994], lohn_de: 2.4, gold_eur_perf: -2.3, cape: 21.3 },
  1995: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1995], inflation_de: GERMAN_CPI_INFLATION_RATES[1995], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1995], lohn_de: 3.5, gold_eur_perf: 0.6, cape: 21.1 },
  1996: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1996], inflation_de: GERMAN_CPI_INFLATION_RATES[1996], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1996], lohn_de: 2.2, gold_eur_perf: -6.9, cape: 25.4 },
  1997: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1997], inflation_de: GERMAN_CPI_INFLATION_RATES[1997], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1997], lohn_de: 1.9, gold_eur_perf: -20.7, cape: 28.3 },
  1998: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1998], inflation_de: GERMAN_CPI_INFLATION_RATES[1998], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1998], lohn_de: 2.8, gold_eur_perf: 0.9, cape: 32.6 },
  1999: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[1999], inflation_de: GERMAN_CPI_INFLATION_RATES[1999], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[1999], lohn_de: 2.7, gold_eur_perf: -0.6, cape: 40.6 },
  2000: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2000], inflation_de: GERMAN_CPI_INFLATION_RATES[2000], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2000], lohn_de: 2.5, gold_eur_perf: -2.7, cape: 43.8 },
  2001: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2001], inflation_de: GERMAN_CPI_INFLATION_RATES[2001], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2001], lohn_de: 1.9, gold_eur_perf: 4.3, cape: 36.8 },
  2002: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2002], inflation_de: GERMAN_CPI_INFLATION_RATES[2002], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2002], lohn_de: 2.1, gold_eur_perf: 19.4, cape: 29.9 },
  2003: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2003], inflation_de: GERMAN_CPI_INFLATION_RATES[2003], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2003], lohn_de: 1.2, gold_eur_perf: 11.7, cape: 22.9 },
  2004: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2004], inflation_de: GERMAN_CPI_INFLATION_RATES[2004], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2004], lohn_de: 1.1, gold_eur_perf: 2.2, cape: 27.1 },
  2005: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2005], inflation_de: GERMAN_CPI_INFLATION_RATES[2005], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2005], lohn_de: 0.8, gold_eur_perf: 22.3, cape: 26.5 },
  2006: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2006], inflation_de: GERMAN_CPI_INFLATION_RATES[2006], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2006], lohn_de: 1.6, gold_eur_perf: 17.3, cape: 26.0 },
  2007: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2007], inflation_de: GERMAN_CPI_INFLATION_RATES[2007], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2007], lohn_de: 2.8, gold_eur_perf: 2.1, cape: 27.2 },
  2008: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2008], inflation_de: GERMAN_CPI_INFLATION_RATES[2008], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2008], lohn_de: 3.4, gold_eur_perf: 2.7, cape: 24.0 },
  2009: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2009], inflation_de: GERMAN_CPI_INFLATION_RATES[2009], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2009], lohn_de: 0.8, gold_eur_perf: 17.2, cape: 15.2 },
  2010: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2010], inflation_de: GERMAN_CPI_INFLATION_RATES[2010], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2010], lohn_de: 2.3, gold_eur_perf: 34.9, cape: 20.3 },
  2011: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2011], inflation_de: GERMAN_CPI_INFLATION_RATES[2011], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2011], lohn_de: 3.9, gold_eur_perf: 7.6, cape: 23.0 },
  2012: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2012], inflation_de: GERMAN_CPI_INFLATION_RATES[2012], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2012], lohn_de: 2.9, gold_eur_perf: 4, cape: 21.1 },
  2013: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2013], inflation_de: GERMAN_CPI_INFLATION_RATES[2013], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2013], lohn_de: 2.4, gold_eur_perf: -22.8, cape: 21.3 },
  2014: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2014], inflation_de: GERMAN_CPI_INFLATION_RATES[2014], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2014], lohn_de: 2.8, gold_eur_perf: -0.6, cape: 25.0 },
  2015: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2015], inflation_de: GERMAN_CPI_INFLATION_RATES[2015], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2015], lohn_de: 2.9, gold_eur_perf: -10, cape: 27.2 },
  2016: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2016], inflation_de: GERMAN_CPI_INFLATION_RATES[2016], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2016], lohn_de: 2.5, gold_eur_perf: 11.7, cape: 25.6 },
  2017: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2017], inflation_de: GERMAN_CPI_INFLATION_RATES[2017], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2017], lohn_de: 2.6, gold_eur_perf: -0.4, cape: 28.1 },
  2018: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2018], inflation_de: GERMAN_CPI_INFLATION_RATES[2018], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2018], lohn_de: 3.1, gold_eur_perf: -4.3, cape: 32.3 },
  2019: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2019], inflation_de: GERMAN_CPI_INFLATION_RATES[2019], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2019], lohn_de: 2.8, gold_eur_perf: 19.4, cape: 29.3 },
  2020: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2020], inflation_de: GERMAN_CPI_INFLATION_RATES[2020], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2020], lohn_de: 1.2, gold_eur_perf: 13.9, cape: 31.0 },
  2021: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2021], inflation_de: GERMAN_CPI_INFLATION_RATES[2021], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2021], lohn_de: 3, gold_eur_perf: -5.2, cape: 34.5 },
  2022: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2022], inflation_de: GERMAN_CPI_INFLATION_RATES[2022], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2022], lohn_de: 4, gold_eur_perf: 5.7, cape: 37.0 },
  2023: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2023], inflation_de: GERMAN_CPI_INFLATION_RATES[2023], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2023], lohn_de: 6, gold_eur_perf: 12.1, cape: 28.3 },
  2024: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2024], inflation_de: GERMAN_CPI_INFLATION_RATES[2024], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2024], lohn_de: 3, gold_eur_perf: 15, cape: 31.0 },
  2025: { global_equity_research_index: GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS[2025], inflation_de: GERMAN_CPI_INFLATION_RATES[2025], zinssatz_de: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[2025], lohn_de: 4.2, gold_eur_perf: 47.6, cape: 37.1 }
};

/**
 * Sterbetafeln für Männer und Frauen
 */
export const MORTALITY_TABLE = {
  m: {
    18: 0.0008, 19: 0.0008, 20: 0.0009, 21: 0.0009, 22: 0.0009, 23: 0.0009, 24: 0.0009, 25: 0.0009, 26: 0.0009, 27: 0.0009, 28: 0.0010, 29: 0.0010,
    30: 0.0010, 31: 0.0010, 32: 0.0011, 33: 0.0011, 34: 0.0011, 35: 0.0012, 36: 0.0012, 37: 0.0013, 38: 0.0013, 39: 0.0014,
    40: 0.0015, 41: 0.0016, 42: 0.0017, 43: 0.0018, 44: 0.0019, 45: 0.0020, 46: 0.0021, 47: 0.0022, 48: 0.0024, 49: 0.0026,
    50: 0.003, 51: 0.003, 52: 0.004, 53: 0.004, 54: 0.004, 55: 0.005, 56: 0.005, 57: 0.006, 58: 0.006, 59: 0.007, 60: 0.007, 61: 0.008, 62: 0.009, 63: 0.009, 64: 0.010, 65: 0.010, 66: 0.011, 67: 0.012, 68: 0.013, 69: 0.014, 70: 0.016, 71: 0.017, 72: 0.019, 73: 0.021, 74: 0.023, 75: 0.026, 76: 0.029, 77: 0.032, 78: 0.036, 79: 0.040, 80: 0.045, 81: 0.051, 82: 0.057, 83: 0.065, 84: 0.073, 85: 0.083, 86: 0.094, 87: 0.107, 88: 0.121, 89: 0.137, 90: 0.155, 91: 0.175, 92: 0.197, 93: 0.221, 94: 0.247, 95: 0.275, 96: 0.305, 97: 0.337, 98: 0.370, 99: 0.400, 100: 0.430, 101: 0.46, 102: 0.49, 103: 0.52, 104: 0.55, 105: 0.6, 106: 0.65, 107: 0.7, 108: 0.8, 109: 0.9, 110: 1
  },
  w: {
    18: 0.0004, 19: 0.0004, 20: 0.0004, 21: 0.0004, 22: 0.0004, 23: 0.0004, 24: 0.0004, 25: 0.0005, 26: 0.0005, 27: 0.0005, 28: 0.0005, 29: 0.0005,
    30: 0.0005, 31: 0.0006, 32: 0.0006, 33: 0.0006, 34: 0.0007, 35: 0.0007, 36: 0.0007, 37: 0.0008, 38: 0.0008, 39: 0.0009,
    40: 0.0010, 41: 0.0011, 42: 0.0011, 43: 0.0012, 44: 0.0013, 45: 0.0014, 46: 0.0015, 47: 0.0016, 48: 0.0017, 49: 0.0018,
    50: 0.002, 51: 0.002, 52: 0.002, 53: 0.003, 54: 0.003, 55: 0.003, 56: 0.004, 57: 0.004, 58: 0.004, 59: 0.005, 60: 0.005, 61: 0.006, 62: 0.006, 63: 0.007, 64: 0.007, 65: 0.007, 66: 0.008, 67: 0.008, 68: 0.009, 69: 0.010, 70: 0.011, 71: 0.012, 72: 0.013, 73: 0.015, 74: 0.016, 75: 0.018, 76: 0.021, 77: 0.023, 78: 0.026, 79: 0.030, 80: 0.034, 81: 0.039, 82: 0.044, 83: 0.050, 84: 0.057, 85: 0.066, 86: 0.076, 87: 0.087, 88: 0.100, 89: 0.115, 90: 0.131, 91: 0.149, 92: 0.169, 93: 0.191, 94: 0.215, 95: 0.241, 96: 0.269, 97: 0.298, 98: 0.329, 99: 0.360, 100: 0.390, 101: 0.42, 102: 0.45, 103: 0.48, 104: 0.51, 105: 0.55, 106: 0.6, 107: 0.65, 108: 0.75, 109: 0.85, 110: 1
  },
  // Divers: Durchschnitt von männlich und weiblich
  d: {
    18: 0.0006, 19: 0.0006, 20: 0.00065, 21: 0.00065, 22: 0.00065, 23: 0.00065, 24: 0.00065, 25: 0.0007, 26: 0.0007, 27: 0.0007, 28: 0.00075, 29: 0.00075,
    30: 0.00075, 31: 0.0008, 32: 0.00085, 33: 0.00085, 34: 0.0009, 35: 0.00095, 36: 0.00095, 37: 0.00105, 38: 0.00105, 39: 0.00115,
    40: 0.00125, 41: 0.00135, 42: 0.0014, 43: 0.0015, 44: 0.0016, 45: 0.0017, 46: 0.0018, 47: 0.0019, 48: 0.00205, 49: 0.0022,
    50: 0.0025, 51: 0.0025, 52: 0.003, 53: 0.0035, 54: 0.0035, 55: 0.004, 56: 0.0045, 57: 0.005, 58: 0.005, 59: 0.006, 60: 0.006, 61: 0.007, 62: 0.0075, 63: 0.008, 64: 0.0085, 65: 0.0085, 66: 0.0095, 67: 0.010, 68: 0.011, 69: 0.012, 70: 0.0135, 71: 0.0145, 72: 0.016, 73: 0.018, 74: 0.0195, 75: 0.022, 76: 0.025, 77: 0.0275, 78: 0.031, 79: 0.035, 80: 0.0395, 81: 0.045, 82: 0.0505, 83: 0.0575, 84: 0.065, 85: 0.0745, 86: 0.085, 87: 0.097, 88: 0.1105, 89: 0.126, 90: 0.143, 91: 0.162, 92: 0.183, 93: 0.206, 94: 0.231, 95: 0.258, 96: 0.287, 97: 0.3175, 98: 0.3495, 99: 0.38, 100: 0.41, 101: 0.44, 102: 0.47, 103: 0.50, 104: 0.53, 105: 0.575, 106: 0.625, 107: 0.675, 108: 0.775, 109: 0.875, 110: 1
  }
};

/**
 * Stress-Szenarien für die Simulation
 */
export const STRESS_PRESETS = {
  NONE: { label: "Kein Stress", type: "none", years: 0 },

  STAGFLATION_70s: {
    label: "Stagflation (70er-ähnlich)",
    type: "conditional_bootstrap",
    years: 7,
    filter: { inflationMin: 7.0, equityRealMax: -2.0 }
  },

  DOUBLE_BEAR_00s: {
    label: "Doppelbär (Dotcom/GFC-ähnlich)",
    type: "conditional_bootstrap",
    years: 6,
    filter: { equityRealMax: -8.0, minCluster: 2 }
  },

  GREAT_DEPRESSION_29_33: {
    label: "Great Depression (1929-1933)",
    type: "conditional_bootstrap",
    years: 5,
    filter: { yearMin: 1929, yearMax: 1933 }
  },

  WWII_40s: {
    label: "Zweiter Weltkrieg (1939-1945)",
    type: "conditional_bootstrap",
    years: 7,
    filter: { yearMin: 1939, yearMax: 1945 }
  },

  STAGFLATION_SUPER: {
    label: "Stagflation (Extrem: 70er -3% Rendite)",
    type: "conditional_bootstrap",
    years: 8,
    filter: { inflationMin: 7.0, equityRealMax: -2.0 },
    muShiftEq: -0.03 // Hybrid-Modus: Echte 70er Jahre, aber künstlich noch schlechter gemacht
  },

  INFLATION_SPIKE_3Y: {
    label: "Inflationsschock (3 Jahre)",
    type: "parametric",
    years: 3,
    muShiftEq: -0.05,
    volScaleEq: 1.5,
    inflationFloor: 7.0,
    muShiftAu: 0.00
  },

  FORCED_DRAWDOWN_3Y: {
    label: "Erzwungener Drawdown (3 Jahre)",
    type: "parametric_sequence",
    years: 3,
    seqReturnsEq: [-0.25, -0.20, -0.15],
    noiseVol: 0.04,
    reboundClamp: { years: 2, cap: 0.05 }
  },

  LOST_DECADE_12Y: {
    label: "Verlorenes Jahrzehnt (12J Stagnation)",
    type: "parametric",
    years: 12,
    muShiftEq: -0.06,
    volScaleEq: 0.8,
    returnMaxAu: 15.0, // Cap Gold bei +15% (verhindert historische Ausreißer wie 1979 mit +117%)
    inflationFloor: 2.0
  },

  CORRELATION_CRASH_4Y: {
    label: "System-Krise (Korrelations-Kollaps)",
    type: "parametric",
    years: 4,
    muShiftEq: -0.15,
    muShiftAu: -0.05,
    inflationFloor: 5.0
  }
};

/**
 * Engine-Version und Hash
 */

/**
 * Globale Daten für die Simulation
 */
export let annualData = [];
export let REGIME_DATA = { BULL: [], BEAR: [], SIDEWAYS: [], STAGFLATION: [] };
export let REGIME_TRANSITIONS = {};
export const BREAK_ON_RUIN = true;

// --- INITIALIZATION ---

(function initializeData() {
  const years = Object.keys(HISTORICAL_DATA).map(Number).sort((a, b) => a - b);

  years.forEach((year, index) => {
    const raw = HISTORICAL_DATA[year];

    // 1925 is intentionally a real sampling observation. The retired level-
    // differencing path emitted a structural zero because no 1924 runtime
    // level existed; the generated chain owns an explicit 1924 base level.
    const rendite = GLOBAL_EQUITY_RESEARCH_ANNUAL_RETURNS[year];
    if (!Number.isFinite(rendite)) {
      throw new Error(`Missing global equity research return for ${year}.`);
    }

    const inflation = raw.inflation_de;
    const zinssatz = raw.zinssatz_de;
    const lohn = raw.lohn_de;
    const goldPerf = raw.gold_eur_perf; // Percent
    const cape = raw.cape;

    // Determine Regime
    let regime = 'SIDEWAYS';
    const inflHigh = inflation > REGIME_CLASSIFICATION_THRESHOLDS.inflationHighPct;
    const equityPoor = rendite < REGIME_CLASSIFICATION_THRESHOLDS.equityPoorRatio;
    const equityCrash = rendite < REGIME_CLASSIFICATION_THRESHOLDS.equityCrashRatio;
    const equityBoom = rendite > REGIME_CLASSIFICATION_THRESHOLDS.equityBoomRatio;

    if (inflHigh && equityPoor) {
      regime = 'STAGFLATION';
    } else if (equityCrash) {
      regime = 'BEAR';
    } else if (equityBoom) {
      regime = 'BULL';
    } else {
      regime = 'SIDEWAYS';
    }

    const dataPoint = {
      jahr: year,
      rendite: rendite,
      inflation: inflation,
      zinssatz: zinssatz,
      lohn: lohn,
      gold_eur_perf: goldPerf,
      capeRatio: cape,
      regime: regime
    };

    annualData.push(dataPoint);

    if (REGIME_DATA[regime]) {
      REGIME_DATA[regime].push(dataPoint);
    }
  });

  // Initialize Transitions
  const regimes = REGIME_CLASSIFICATION_THRESHOLDS.labels;
  regimes.forEach(r => {
    REGIME_TRANSITIONS[r] = { total: 0 };
    regimes.forEach(target => REGIME_TRANSITIONS[r][target] = 0);
  });

  // Count transitions from historical data
  for (let i = 0; i < annualData.length - 1; i++) {
    const current = annualData[i].regime;
    const next = annualData[i + 1].regime;

    // Fallback if regime detection marked something weird (should not happen with logic above)
    if (REGIME_TRANSITIONS[current] && REGIME_TRANSITIONS[current][next] !== undefined) {
      REGIME_TRANSITIONS[current][next]++;
      REGIME_TRANSITIONS[current].total++;
    }
  }

  // Fallback for empty regimes to establish basic connectivity
  regimes.forEach(r => {
    if (REGIME_TRANSITIONS[r].total === 0) {
      // If a regime never occurred, assume it transitions to SIDEWAYS with 100%
      REGIME_TRANSITIONS[r]['SIDEWAYS'] = 1;
      REGIME_TRANSITIONS[r].total = 1;
    }
  });
})();
