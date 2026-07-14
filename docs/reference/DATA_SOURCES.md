# Data Sources And Provenance

## Optional live data

Live data is optional. The suite remains usable without internet access; failed live-data fetches must degrade to existing local values, user-visible warnings, or disabled quote updates instead of blocking the local app.

| Source | Endpoint / path | Used for | Runtime path |
| --- | --- | --- | --- |
| Yahoo Finance | Local proxy `http://127.0.0.1:8787` / `http://localhost:8787` | ETF and quote updates such as `VWCE.DE` | Browser: Node proxy from `start_suite.*`; Tauri: integrated Rust proxy in `src-tauri/src/lib.rs` |
| ECB Data API | `https://data-api.ecb.europa.eu/service/data/HICP/A.DE.N.000000.4D0.AVR` | German all-items HICP, annual average rate of change | Direct fetch from browser/Tauri WebView |
| World Bank API | `https://api.worldbank.org/v2/country/DEU/indicator/FP.CPI.TOTL.ZG` | German CPI inflation, annual percentage | Direct fetch from browser/Tauri WebView |
| OECD Data Explorer API | `https://sdmx.oecd.org/public/rest/data/OECD.SDD.TPS,DSD_PRICES@DF_PRICES_ALL,1.0/DEU.A.N.CPI.PA._T.N.GY` | German national all-items CPI, annual growth rate | Direct fetch from browser/Tauri WebView |
| Yale/CAPE mirror access | `https://r.jina.ai` | CAPE fallback fetches | Direct fetch from browser/Tauri WebView |

Tauri release builds allow these live-data targets explicitly in `src-tauri/tauri.conf.json` under `app.security.csp.connect-src`. New external live-data sources must be added there and documented in this file in the same change.

## Annual inflation contract

The Balance annual workflow queries the completed calendar year from the annual-period contract. All accepted source responses are normalized to the metric `consumer_prices_all_items_annual_average_growth_pct` and return:

- `rate`: finite percentage in the existing engine range `-10` through `50`;
- `year`: exact completed target year;
- `source`: selected provider and index family;
- `dataAsOf`: source response preparation/update timestamp, with retrieval time only as a last-resort fallback;
- `fetchStatus`: `ok_primary_ecb`, `ok_fallback_world_bank`, or `ok_fallback_oecd`;
- `metric`: the normalized metric identifier above.

Fallback order is ECB, World Bank, then OECD. Each request has its own eight-second timeout and `AbortController`; its timer is cleared on success and failure. Wrong-year, wrong-series, ambiguous, non-finite, or out-of-range observations are rejected before another source is tried. If all sources fail, inflation and need inputs remain unchanged.

Positive inflation and deflation use the same multiplicative rule: `next = previous * (1 + rate / 100)`. Negative rates are not silently clamped to zero. A positive previous value and the cumulative factor must remain finite and greater than zero; optional need fields that already equal zero remain zero.

## Deterministic browser tests

`npm run test:browser` does not depend on the live providers above. Playwright intercepts the annual workflow requests and supplies deterministic ECB-fallback, World Bank, Yahoo-proxy, and CAPE fixtures. All other external requests are blocked, so the annual preflight and one-time commit contracts remain reproducible offline.

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
