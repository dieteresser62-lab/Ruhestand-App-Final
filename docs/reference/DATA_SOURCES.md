# Data Sources And Provenance

## Optional live data

Live data is optional. The suite remains usable without internet access; failed
live-data fetches degrade to existing local values, user-visible warnings or a
disabled quote update instead of making the local application unusable. This
availability rule is not permission to finish an already confirmed atomic
annual commit with a missing, stale or wrong-period value: required annual
steps fail closed and leave the coordinator in its documented recovery path.

| Source | Endpoint / path | Used for | Runtime path |
| --- | --- | --- | --- |
| Yahoo Finance | Local proxy `http://127.0.0.1:8787` / `http://localhost:8787` | ETF and quote updates such as `VWCE.DE` | Browser: Node proxy from `start_suite.*`; Tauri: integrated Rust proxy in `src-tauri/src/lib.rs` |
| ECB Data API | `https://data-api.ecb.europa.eu/service/data/HICP/A.DE.N.000000.4D0.AVR` | German all-items HICP, annual average rate of change | Direct fetch from browser/Tauri WebView |
| World Bank API | `https://api.worldbank.org/v2/country/DEU/indicator/FP.CPI.TOTL.ZG` | German CPI inflation, annual percentage | Direct fetch from browser/Tauri WebView |
| OECD Data Explorer API | `https://sdmx.oecd.org/public/rest/data/OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL,1.0/DEU.A.N.CPI.PA._T.N.GY` | German national all-items CPI, annual growth rate | Direct fetch from browser/Tauri WebView |
| Yale/CAPE mirror access | `https://r.jina.ai` | CAPE fallback fetches | Direct fetch from browser/Tauri WebView |
| Google Fonts | `https://fonts.googleapis.com`, `https://fonts.gstatic.com` | Optional UI fonts | Direct stylesheet/font request; local fallback fonts remain usable offline |

Tauri release builds allow the Yahoo, inflation and CAPE targets explicitly in
`src-tauri/tauri.conf.json` under `app.security.csp.connect-src`. New external
live-data sources must be added there and documented in this file in the same
change. Font hosts use the separate CSP directives described below.

Yahoo requests contain the requested symbol or search term and, for chart data,
the period and interval. Inflation and CAPE use fixed source identifiers and
target periods. These paths do not intentionally transmit portfolio quantities,
cost basis, spending needs or profile state. External providers still receive
ordinary IP and transport metadata. Google Fonts are governed by the separate
`style-src` and `font-src` CSP directives rather than `connect-src`.

### Tranche quote contract

The tranche manager accepts automatic quotes only when symbol, positive finite
price, `EUR` currency, UTC Unix timestamp and source are present and consistent.
Quotes older than seven calendar days or more than five minutes in the future are
rejected. Foreign currencies are never treated as EUR and no implicit FX
conversion is performed.

Batch updates are single-flight, deduplicate symbols and use bounded concurrency.
Valid partial results are persisted in one confirmed commit; failed lots retain
their previous quote. If every request fails, the stored tranche payload remains
unchanged. Browser tests route deterministic EUR, foreign-currency and offline
fixtures through the same local proxy contract.

## Annual inflation contract

The Balance annual workflow queries the completed calendar year from the annual-period contract. All accepted source responses are normalized to the metric `consumer_prices_all_items_annual_average_growth_pct` and return:

- `rate`: finite percentage in the existing engine range `-10` through `50`;
- `year`: exact completed target year;
- `source`: selected provider and index family;
- `dataAsOf`: source response preparation/update timestamp, with retrieval time only as a last-resort fallback;
- `fetchStatus`: `ok_primary_ecb`, `ok_fallback_world_bank`, or `ok_fallback_oecd`;
- `metric`: the normalized metric identifier above.

Fallback order is ECB, World Bank, then OECD. Each request has its own eight-second timeout and `AbortController`; its timer is cleared on success and failure. Wrong-year, wrong-series, ambiguous, non-finite, or out-of-range observations are rejected before another source is tried. If all sources fail, inflation and need inputs remain unchanged. Outside the annual coordinator this is a safe no-write result; during a confirmed annual commit the failed step prevents completion and the pre-mutation snapshot remains the recovery boundary.

Positive inflation and deflation use the same multiplicative rule: `next = previous * (1 + rate / 100)`. Negative rates are not silently clamped to zero. A positive previous value and the cumulative factor must remain finite and greater than zero; optional need fields that already equal zero remain zero.

## Annual market-data contract

The annual ETF step is bound to the coordinator's pending period and requires
phase `writes_started` plus a confirmed recovery snapshot. It requests
`VWCE.DE` for the UTC window from 27 December of the completed target year up
to, but excluding, 1 January of the following year. The accepted observation is
the last valid close dated 27-31 December of that exact target year, with a
finite EUR price from `0.50` through `100000`.

The persisted `annualMarketDataMeta` records schema, price, ISO `asOf`, ticker,
source, target year, period ID and the same-cutoff ATH evaluation. Empty charts,
wrong or stale years, implausible prices and proxy failures fail closed. The
market-data step restores its previous local input/meta values, while the
annual coordinator retains the wider snapshot-based recovery responsibility.

CAPE has a separate provenance contract and is not assigned the ETF year-end
date. It tries the configured primary resource, then its mirror, then an
existing stored value. `capeAsOf`, `capeSource`, `capeFetchStatus` and
`capeUpdatedAt` distinguish observation date, provider and retrieval state. A
stored or stale fallback remains labelled as such. If neither a fetched nor a
stored value exists, the step fails; inside the atomic annual workflow this is
commit-blocking.

## Deterministic browser tests

`npm run test:browser` does not depend on the live providers above. Playwright intercepts the annual workflow requests and supplies deterministic ECB-fallback, World Bank, Yahoo-proxy, CAPE and tranche-quote fixtures. All other external requests are blocked, so annual preflight, one-time commit, tranche partial-success and offline contracts remain reproducible offline.

## Historical market dataset (`app/simulator/simulator-data.js`)

- Coverage: `1925-2025`
- Estimated history segment: `1925-1949`
- Baseline segment: `1950-2025`
- Machine-readable manifest: `HISTORICAL_DATA_MANIFEST`, schema `HistoricalDataManifestV1`
- Dataset ID/revision: `ruhestandsapp-historical-data-v1` / `2026-07-18.1`
- Canonical content hash: `8246422d98657c2a76b750ce9fd1253e01aa7a9a4dfa0f0f01dcb96b5507ef29`
- Hash algorithm: SHA-256 over canonical JSON (`sha256-canonical-json-v1`); year keys are numeric ascending, object fields lexical, and numbers are locale-independent JSON tokens.
- Backtest lookback contract: four complete years before `startYear`; the contract-derived technical bounds are therefore `1929-2025`. The Backtest UI reads these bounds from the active provider, sets both year inputs dynamically, and validates against the same contract.

The DOM-free contract lives in
`app/simulator/historical-backtest-contract.js`. It validates the full dataset
once per manifest revision/content hash, creates an immutable lookup of
`HistoricalYearRecordV1`, and performs one period preflight per single-path
request or cohort batch. The productive historical backtest and its rolling
cohorts consume this provider. Monte Carlo, sweep, optimizer and worker data
paths remain separate and must not be described as manifest-backed holdouts.

### Manifest status terms

- Resolution fields (`variant`, `currency`, `region`, `frequency`, `source`,
  `license`, `transformation`) use `known`, `unresolved`, or
  `not_applicable`. A `known` value must be non-empty. `unresolved` never
  carries a guessed value.
- Record quality uses `present`, `estimated`, `unresolved`, `fallback_zero`,
  or `missing`.
- `missing` and non-finite required values are contract errors.
- `fallback_zero` is valid only inside a series segment explicitly listed in
  `missingness.fallbackZeroSegments`. No current series declares such a
  segment.
- Zero values in `gold_eur_perf` remain numerically unchanged but receive
  quality `unresolved`; the repository does not currently prove whether these
  values mean a genuine zero return or unavailable history.

### Series manifest

| Series ID | Variant | Currency | Region | Frequency | Source | License | Transformation | Estimated segment | Missingness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `msci_eur` | `unresolved` | EUR | global | annual | `unresolved` | `unresolved` | embedded levels; 1925-1949 rescaled to the 1950 bridge | 1925-1949 | required; reject missing/non-finite and non-positive levels |
| `inflation_de` | `unresolved` | not applicable | DE | annual | `unresolved` | `unresolved` | identity from embedded annual percentage | 1925-1949 | required; reject missing/non-finite |
| `zinssatz_de` | `unresolved` | not applicable | DE | annual | `unresolved` | `unresolved` | identity from embedded annual percentage | 1925-1949 | required; reject missing/non-finite |
| `lohn_de` | `unresolved` | not applicable | DE | annual | `unresolved` | `unresolved` | identity from embedded annual percentage | 1925-1949 | required; reject missing/non-finite |
| `gold_eur_perf` | `unresolved` | EUR | global | annual | `unresolved` | `unresolved` | identity from embedded annual percentage | 1925-1949 | required; reject missing/non-finite; zero quality unresolved |
| `cape` | `unresolved` | not applicable | `unresolved` | annual | `unresolved` | `unresolved` | identity from embedded annual ratio | 1925-1949 | required; reject missing/non-finite and non-positive ratios |

All source and license statuses above are intentionally unresolved. The
manifest improves traceability but is not evidence that external provenance,
index variant, or usage rights have been established.

### Research-gate status

The
[Simulator backtest research protocol](../internal/SIMULATOR_BACKTEST_FORSCHUNGSPROTOKOLL.md)
is the operational owner of FV-G01 through FV-G08 for FQ-01 through FQ-03. It
does not replace this runtime manifest and does not upgrade any field to
`known`.

| Open item | Current state | Required owner and next evidence | Blocking effect |
| --- | --- | --- | --- |
| exact `msci_eur` Price/Net/Gross-TR variant | `unresolved` | named data/capital-markets methodology owner; primary-source index identity, currency treatment, data vintage and license | blocks FQ-01 baseline and international comparison |
| variants and primary sources for all six series | `unresolved` | exact series identifiers, definitions, retrieval/data dates and permitted source chain | blocks research-grade FV-G02 |
| licenses/usage rights for all six series | `unresolved` | license text, use/redistribution scope and review date; legal review where needed | blocks replacement, integration or redistribution |
| pre-1950 source and transformation chain | internal bridge/rescaling documented; external origin `unresolved` | raw-data hashes plus reproducible transformation and bridge evidence | 1925-1949 remain `estimated` and cannot be treated like baseline observations |
| zero-valued `gold_eur_perf` observations | 42 records with unresolved quality: 1925-1932, 1934-1960 and 1962-1968 | evidence whether each segment is genuine zero return, missing data or an assumption, followed by a new manifest revision | blocks gold-effect and holdout claims; values must not be silently reinterpreted |
| CAPE region | `unresolved` | exact market/region and transformation contract | blocks international CAPE/policy comparison |

The embedded 1925-2025 history and every period or rolling cohort derived from
it are exploratory/contaminated for confirmatory research because the data and
results have already been visible during development. A raw
`HistoricalBacktestExportV1` records one explicit run and its fingerprints; it
is not an append-only trial registry and does not prove a locked holdout.

### `HistoricalYearRecordV1` and assignment inventory

The active backtest record separates ex-post `realized` observations from
`decisionAsOf` policy inputs. Every observation carries `sourceYear`,
`asOfYear`, unit, derivation, and quality. The record is marked
`approved_d01` and uses temporal convention
`realized_t_decision_t_minus_1_v1`.

| Simulated field in year `t` | Legacy backtest | Active `annualData` / Monte Carlo | Alternative `prepareHistoricalData()` | Active D-01 backtest contract |
| --- | --- | --- | --- | --- |
| Equity return | index `t / (t-1) - 1` | index `t / (t-1) - 1` | index `t / (t-1) - 1` | realized `t`, input levels `t-1` and `t` |
| Gold return | `t-1` | `t` | `t-1` | realized `t` |
| Cash/bond proxy | `t-1` | `t` | `t-1` | realized `t` |
| Inflation | `t-1` | `t` | `t-1` | realized `t` |
| Wage/pension adjustment | `t` via `simStartYear - series.startYear + yearIdx` | `t` | `t-1` | realized `t` |
| CAPE | `t-1` | `t` | not mapped | decision-as-of `t-1` |

Marker tests cover the pension-adjustment offset for 1950, 2000, and 2001. The
low-level `simulator-year-portfolio.js:readYearReturnRates()` normalizer retains
its fallback shape, while the productive Backtest/Monte-Carlo/Sweep adapter
rejects non-finite required returns before portfolio mutation.

## Important notes

- The `msci_eur` series is currently treated as an MSCI-World-EUR-like proxy.
- The exact variant (`Price` vs `Net TR` vs `Gross TR`) is not yet fully documented in code history.
- Years `1925-1949` are normalized to connect to the 1950 base level.
- Monte Carlo now supports excluding estimated years via `mcExcludeEstimatedHistory`.

## Series overview

- `msci_eur`: equity index level proxy (undocumented exact index variant)
- `inflation_de`: annual German inflation proxy
- `zinssatz_de`: annual German rate proxy
- `lohn_de`: annual wage growth proxy
- `gold_eur_perf`: annual gold return proxy
- `cape`: CAPE valuation proxy

## Follow-up actions

- Document the exact MSCI variant with a primary source.
- Add explicit source references for pre-1950 extension methodology.
- Clarify zero values in early `gold_eur_perf` years (`no data` vs `assumed 0`).
