# US Shiller conventional CAPE decision chain

This directory pins the publisher workbook used to generate
`UsShillerCapeDecisionChainV1`.

## Source and identity

| File | Series / role | SHA-256 |
| --- | --- | --- |
| `originals/shiller-ie-data-2026-08-01.xls` | Robert J. Shiller `Data` sheet, conventional CAPE column | `0e3d716f83f51c14f40c5ab5662e767cde4f83fcb7305db24ab003df2c9ee6c5` |

The selected series is the conventional price CAPE for the US stock market,
not total-return CAPE and not a global or German valuation ratio. The raw
workbook is kept unchanged. The generator fails closed if its hash, worksheet,
coverage or required numeric observations differ.

## Time convention

Run:

```text
npm run build:us-shiller-cape-data
npm run verify:us-shiller-cape-data
```

For simulation return year `t`, the generator selects the workbook's
conventional CAPE observation for December `t-1`. The generated artifact stores
that value under return year `t` and separately exposes `observationYear`,
`observationMonth`, `asOfYear` and `decisionYear`. Runtime consumers must use
this generated year-`t` value once; applying another `previous-year` lookup
would create an incorrect double lag.

The chain covers return years 1925–2025, using observations from December 1924
through December 2024. Its generated decision-signal hash is
`d1101958fed64dadf8fba76e9e4e92c8d24e86bd3d21accc42cdb60c247a835f`.

