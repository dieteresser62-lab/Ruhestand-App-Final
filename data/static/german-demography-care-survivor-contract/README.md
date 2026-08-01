# German demography, care and survivor contract

This directory pins the official source files used to reconstruct the
demography and care observations for Slice 07.

## Originals

- `destatis-period-life-table-2023-2025.xlsx`
  - Destatis period life table 2023/2025, Germany, male and female annual
    death probabilities (`qx`).
  - SHA-256:
    `fbc46083d581e5978c679600875164bcc5af0565a9eb33c57bf33d44ca87aadc`
- `destatis-care-statistics-2023.xlsx`
  - Destatis care statistics at year-end 2023, including observed care
    prevalence by age and sex and observed stock counts by care grade.
  - SHA-256:
    `a8088d8e95964c5ffade848b9f303d000dc499519512f66f92ee6b8d60aa4280`

The source files are reconstructed into
`app/simulator/german-demography-care-survivor-contract.js` by
`npm run build:german-demography-data`. The build fails closed when a source
hash, table identity, period, sex, age or marker value differs.

## Semantic boundary

- The mortality source is a **period** life table. It is not a cohort forecast
  and contains no assumed future mortality improvement.
- Destatis care percentages are observed prevalence at a reporting date. They
  are retained for validation only and are never transformed into annual care
  entry or progression probabilities.
- Care entry, progression and duration are separate model assumptions.
- The survivor percentage is a simplified user-controlled cash-flow model. It
  is not a statutory entitlement calculator.

See `LICENSE.md` for source reuse terms and
`docs/reference/DATA_SOURCES.md` for the complete contract description.
