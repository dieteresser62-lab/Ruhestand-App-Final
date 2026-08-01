# Gold in German investor currency

This directory contains the pinned primary inputs for the generated
`GoldGermanInvestorChainV1` artifact.

## Source files

| File | Series / role | SHA-256 |
| --- | --- | --- |
| `../global-equity-research-chain/originals/JSTdatasetR6.xlsx` | JST R6 `DEU.xrusd`, end-of-year German currency per USD for the pre-Frankfurt proxy | `c1bb91fe56ea50d4f27af5c0fc897d481e89ae38ce41eaecab62134c9354981d` |
| `originals/bundesbank-frankfurt-gold-annual-1968-1998.csv` | Bundesbank `BBEX3.A.XAU.DEM.EA.AC.C03`, annual average Frankfurt fixing in DEM per kilogram | `c08654b065a5685456bf2ebd954b43fec3cef9a9755f121d9dab6420c9410e2e` |
| `originals/bundesbank-usd-eur-annual-1999-2025.csv` | Bundesbank `BBEX3.A.USD.EUR.BB.AC.A04`, annual average USD per EUR | `ba8810d1b754e63f26e84824dcf0dd2f24716c51e9ba385bb09002b2fc087a7e` |
| `originals/world-bank-cmo-historical-data-annual-2026-07.xlsx` | World Bank Pink Sheet, nominal annual Gold price in USD per troy ounce | `d418b3c12f1e374a77113d8d42aeb3ffe8c154e7156e28c7b289e7adccf36af0` |

The raw files are kept unchanged. The generator fails closed on a hash,
coverage, series-identifier, missing-value or non-finite-value mismatch.

## Reconstruction

Run:

```text
npm run build:gold-german-investor-data
npm run verify:gold-german-investor-data
```

The generator constructs nominal returns with segment-specific observation
timing:

- `1925-1932`: statutory USD year-end gold-price anchor multiplied by JST
  end-of-year German currency per USD;
- `1933`: the Federal Reserve Bank of New York reported final RFC purchase
  price of USD 34.06, fixed on 18 December, multiplied by JST end-of-year FX;
- `1934-1944`: statutory USD 35 year-end anchor multiplied by JST end-of-year
  German currency per USD;
- `1945-1950`: explicit zero-return post-war/currency-discontinuity bridge;
- `1951-1967`: USD year-end gold-price anchor multiplied by JST end-of-year
  DEM per USD;
- `1968-1998`: Bundesbank Frankfurt gold-fixing annual-average levels;
- `1999-2025`: World Bank annual-average USD gold price divided by the
  Bundesbank/ECB annual-average USD-per-EUR rate.

The 1933 observation is documented in the
[Federal Reserve Bank of New York 1933 Annual Report](https://fraser.stlouisfed.org/title/annual-report-federal-reserve-bank-new-york-467/nineteenth-annual-report-federal-reserve-bank-new-york-year-ended-december-31-1933-17978/fulltext).
The 1968 seam compares the partial-year Frankfurt average beginning on
18 June with the 1967 parity/FX anchor. The 1999 seam converts the 1998
Bundesbank level with the irrevocable `1.95583 DEM/EUR` rate and
`32.15074656862798` troy ounces per kilogram.

The early parity/FX segment is a historical research proxy, not proof of a
continuously accessible German retail gold market. The 1945-1950 bridge is a
visible model assumption, not an observed return or a silent zero fallback.
It holds nominal gold flat, so positive inflation makes the assumption
negative in real terms. JST observations for 1946-1949 are retained only as
explicitly excluded source observations because Reichsmark/post-reform values
do not form a continuous investable numeraire. The full legacy Monte Carlo
pool still samples proxy years and the bridge; this can understate modeled
gold volatility and is not an empirical claim about repeatable market returns.
