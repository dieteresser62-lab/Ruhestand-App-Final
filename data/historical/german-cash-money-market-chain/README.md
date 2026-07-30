# German cash and money-market research chain

This directory contains the pinned source material for
`GermanCashMoneyMarketChainV1`.

## Source contract

- `originals/bundesbank-long-series-2026-03-05.pdf`
  - Deutsche Bundesbank, *Long time series on economic development in
    Germany*, data status 5 March 2026.
  - Pages 15 and 16 contain annual-average overnight money-market rates for
    1949-1998 and the EONIA/EURSTR continuation for 1999-2025.
  - SHA-256:
    `cec782c8a1110a5377fe81f463d6b3b6b4a22e9fde91df98693d76ede56343c1`.
- `originals/bundesbank-money-market-pages-15-16-layout.txt`
  - Derived mechanical text extraction from the pinned PDF with Poppler
    25.07.0:
    `pdftotext -layout -f 15 -l 16 <pdf> <txt>`.
  - SHA-256:
    `85e3b0f6678944a555bb6848b2eefe5601475124bae497e6e63faf47b759c383`.
- `../global-equity-research-chain/originals/JSTdatasetR6.xlsx`
  - Reused rather than duplicated.
  - German `stir` observations provide 1925-1944.
  - SHA-256:
    `c1bb91fe56ea50d4f27af5c0fc897d481e89ae38ce41eaecab62134c9354981d`.

The generator verifies all three file hashes. It then reads the primary PDF
itself with Poppler `pdftohtml` 25.07.0 and reconstructs all 77 Bundesbank
overnight observations from XML coordinates. Those observations must agree
exactly with the independently selected layout-text values. The manual
rendered-page check remains review documentation only and is not represented
as machine evidence.

## Transformation

`scripts/build-german-cash-money-market-chain.mjs`:

1. reads `DEU.stir` from the pinned JST workbook for 1925-1944;
2. makes the missing wartime/post-war years 1945-1948 explicit by carrying
   the last observed 1944 rate of 2.13 percent;
3. selects the first `Overnight funds` column from each Bundesbank
   annual-average table for 1949-2025;
4. independently extracts the same 77 values from the pinned PDF using a
   coordinate-based `pdftohtml -xml` path and fails on any disagreement;
5. exposes the published annual-average nominal rate directly as a simple
   gross annual cash-return proxy;
6. fails on any source-hash mismatch, undeclared gap, duplicate year,
   missing year or non-finite value.

The generated output is
`app/simulator/german-cash-money-market-chain.js`.

## Interpretation boundary

This chain is not a money-market fund NAV series and not a retail overnight
deposit series. It excludes product costs, tracking difference, bank margin,
account fees and taxes. Those components must not be silently embedded in the
historical data or deducted twice.

The 1945-1948 values are an explicit simulation bridge, not observed or
official investable returns. The 1948 return does not implement the separate
100:6.5 write-down of major Reichsmark cash and bank/savings balances; runs
spanning the reform must not be interpreted as continuous real-world monetary
balance histories.

The 1949-1996 observations are Bundesbank-published proxies, but the source
states that they were not officially set or quoted. They are unweighted
monthly averages of rates reported by Frankfurt banks and carry the documented
March 1970 survey-group and July 1990 day-count breaks. The source chain
through 1975 includes *Deutsches Geld- und Bankwesen in Zahlen 1876-1975*
(Verlag Fritz Knapp) and Bundesbank calculations.

The existing runtime field is `cashBondReturn`: it applies the same overnight
proxy to operative cash, money-market holdings, the cash-like health bucket
and bond tranches. For bonds this is a declared maturity-mismatched model
proxy; duration, term premium, credit risk and mark-to-market effects are not
represented.
