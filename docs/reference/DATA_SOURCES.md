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
