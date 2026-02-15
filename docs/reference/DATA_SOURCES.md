# Data Sources And Provenance

## Historical market dataset (`app/simulator/simulator-data.js`)

- Coverage: `1925-2024`
- Estimated history segment: `1925-1949`
- Baseline segment: `1950-2024`

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
