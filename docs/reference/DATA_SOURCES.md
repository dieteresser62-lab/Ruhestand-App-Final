# Data Sources And Provenance

## Optional live data

Live data is optional. The suite remains usable without internet access; failed live-data fetches must degrade to existing local values, user-visible warnings, or disabled quote updates instead of blocking the local app.

| Source | Endpoint / path | Used for | Runtime path |
| --- | --- | --- | --- |
| Yahoo Finance | Local proxy `http://127.0.0.1:8787` / `http://localhost:8787` | ETF and quote updates such as `VWCE.DE` | Browser: Node proxy from `start_suite.*`; Tauri: integrated Rust proxy in `src-tauri/src/lib.rs` |
| ECB Data API | `https://data-api.ecb.europa.eu` | Inflation fallback chain | Direct fetch from browser/Tauri WebView |
| World Bank API | `https://api.worldbank.org` | Inflation fallback chain | Direct fetch from browser/Tauri WebView |
| OECD stats | `https://stats.oecd.org` | Inflation fallback chain | Direct fetch from browser/Tauri WebView |
| Yale/CAPE mirror access | `https://r.jina.ai` | CAPE fallback fetches | Direct fetch from browser/Tauri WebView |

Tauri release builds allow these live-data targets explicitly in `src-tauri/tauri.conf.json` under `app.security.csp.connect-src`. New external live-data sources must be added there and documented in this file in the same change.

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
