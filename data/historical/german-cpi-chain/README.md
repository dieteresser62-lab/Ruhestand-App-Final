# German CPI research chain

This directory pins the licensed source artifacts used to generate the Simulator's
German annual consumer-price inflation series for 1925-2025.

## Build

Run:

```text
npm run build:german-cpi-data
npm run verify:german-cpi-data
```

The build writes `app/simulator/german-cpi-chain.js`. Verification reconstructs
the module from the pinned originals and fails if an original hash or the
generated module differs.

## Source artifacts

| Artifact | SHA-256 | Use |
| --- | --- | --- |
| `../global-equity-research-chain/originals/JSTdatasetR6.xlsx` | `c1bb91fe56ea50d4f27af5c0fc897d481e89ae38ce41eaecab62134c9354981d` | German `cpi` levels for the 1925-1949 proxy segment |
| `originals/destatis-vpi-lange-reihen-2025-06.xlsx` | `8c728e44fa400d762009fa34507a34e1fee3947641d2579484d7d040763b11f4` | Official annual levels and annual rates for 1950-2024 |
| `originals/destatis-vpi-current-2026-07-10.html` | `82ab91a5e53db7cd74cdf4f7b4d85813e586fbd3ae0bbd3d01a6cb231b596743` | Official 2025 annual-average index and annual rate |

The Destatis long-series workbook has source vintage `2025-06`; the current
HTML snapshot is pinned as of `2026-07-10`. The workbook is read from its machine-oriented
`csv-611xx-01` and `csv-611xx-02` worksheets. The current HTML snapshot is
read only from the two pinned total-index table entries for annual averages and
annual change rates.

## Series contract

- 1925-1949: percentage change calculated from consecutive JST R6 German CPI
  levels; evidence class `proxy`. Normalized to 1938=126, the 1925-1948
  levels are exact integers,
  so the implied annual-rate resolution is only about 0.48-0.85 percentage
  points rather than the 0.1-point resolution of the published Destatis rates.
- 1950-1962: former West Germany, four-person households of workers and
  employees with medium income; evidence class `official` with the population
  qualifier `proxy_population`.
- 1963-1991: former West Germany, all private households; evidence class
  `official`.
- 1992-2025: German Verbraucherpreisindex; evidence class `official`.

Every transition-year rate comes from one internally consistent source series.
Published Destatis rates are cross-checked against rounded annual levels with a
maximum tolerance of 0.06 percentage points.
The 1948 Destatis value for the four-person household series is a second-half
average, so the chain deliberately keeps JST through 1949 and starts Destatis
with its published 1950 rate. The Harmonised Index of Consumer Prices
(HICP/HVPI) is not part of this chain.

The proxy must not be read as an unrestricted market-price history. German
price controls and the wartime price freeze materially affect 1936-1948.
The 1949 JST level is the segment's unique non-integer endpoint and acts as a
splice across the 1948 currency reform: the selected JST change is
`+7.0352%`, while the Destatis former-West-German medium-income-household
levels `28.5 -> 28.2` imply `-1.0526%`. The difference is `8.0878` percentage
points. This is a documented proxy decision, not a claim that the JST rate is
the official German 1949 inflation rate.
