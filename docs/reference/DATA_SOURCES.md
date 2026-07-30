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

- `rate`: finite percentage in the Balance live-provider range `-10` through
  `50`; the separate historical Engine input and Balance import contracts
  accept `-15` through `50` so the 1932 research-proxy observation remains
  representable without weakening the live-data plausibility gate;
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

### Manual market CSV contract

Manual files are local user-provided sources and do not contact an external
provider. The import requires an explicit `current` or `historical` mode,
target calendar year, expected ISO `asOf`, instrument and source filename.
`current` must match the period derived from the active annual contract (or the
last completed calendar year outside a running commit); `historical` is valid
only for an earlier target year. The last CSV observation must exactly match
both target year and expected `asOf`.

The parser requires a date and close column plus comparison observations for
the previous three calendar years. Persisted provenance includes source file,
instrument, import timestamp, coverage start/end, covered calendar years, row
count and `highScope`. This four-year window can prove only `windowHigh`; it
does not establish an all-time high. The metadata therefore keeps
`verifiedAllTimeHighAvailable: false`. Under the user-decided directional D-13
policy,
the Engine-facing `ath` and `jahreSeitAth` receive the observed window high and
its observed age only when the window high is strictly above the latest close.
That positive gap is a conservative lower bound of the true ATH drawdown. If
the window high equals the latest close, the ATH inputs remain neutral. This
directional use is separately marked by `engineReference.policy =
"window_high_as_conservative_ath_lower_bound"` and
`engineReference.applied`; it does not upgrade the source claim to an
all-time high. The metadata is part of the Balance state, JSON export, reload
display, diagnosis and import recovery/rollback.

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
- Equity estimated/proxy segments: `1925-1950` and `2021-2025`
- Equity provider-backtested segment: `1951-2020`
- Inflation proxy segment: `1925-1949`
- Inflation official Destatis segments: `1950-1962`, `1963-1991`,
  `1992-2024` and `2025`
- Cash/money-market proxy segments: JST `1925-1944`, estimated bridge
  `1945-1948`, Bundesbank overnight/FIBOR `1949-1998`, EONIA `1999-2018`,
  EONIA/EURSTR transition `2019` and EURSTR `2020-2025`
- Machine-readable manifest: `HISTORICAL_DATA_MANIFEST`, schema `HistoricalDataManifestV1`
- Dataset ID/revision: `ruhestandsapp-historical-data-v1` / `2026-07-29.5`
- Canonical content hash: `6a1ff0c9245d66d5aec69d85e216daf8c0c005804f70868f681452b47353e543`
- Hash algorithm: SHA-256 over canonical JSON (`sha256-canonical-json-v1`); year keys are numeric ascending, object fields lexical, and numbers are locale-independent JSON tokens.
- Backtest lookback contract: four complete years before `startYear`; the contract-derived technical bounds are therefore `1929-2025`. The Backtest UI reads these bounds from the active provider, sets both year inputs dynamically, and validates against the same contract.

The DOM-free contract lives in
`app/simulator/historical-backtest-contract.js`. It validates the full dataset
once per manifest revision/content hash, creates an immutable lookup of
`HistoricalYearRecordV1`, and performs one period preflight per single-path
request or cohort batch. The productive historical backtest and its rolling
cohorts consume this provider. Monte Carlo, sweep, optimizer and worker data
paths remain separate and must not be described as manifest-backed holdouts.

The canonical equity field is `global_equity_research_index`. Its generated
source module is `app/simulator/global-equity-research-chain.js`; the filtered
original and filtered inputs, hashes, attribution and separate data license live under
`data/historical/global-equity-research-chain/`. Rebuild it with
`npm run build:global-equity-data`. The chain is a 16-country research proxy,
not an MSCI or other provider index.

The canonical inflation field is `inflation_de`. Its generated source module
is `app/simulator/german-cpi-chain.js`; pinned originals, hashes, attribution
and separate data licences live under
`data/historical/german-cpi-chain/`. Rebuild it with
`npm run build:german-cpi-data` and verify the read-only reconstruction with
`npm run verify:german-cpi-data`. The selected identity is annual-average
German national consumer-price inflation, not HICP/HVPI. The JST R6 segment
through 1949 is a historical cost-of-living research proxy, not the modern
German VPI. Normalized to 1938=126, its 1925-1948 levels are exact integers
(about 0.48-0.85
percentage-point implied rate resolution); price controls and the wartime
freeze affect 1936-1948. The 1949 non-integer JST endpoint is an explicit
post-currency-reform splice: `+7.0352%` selected versus `-1.0526%` from the
Destatis levels `28.5 -> 28.2`, a difference of `8.0878` percentage points.
This price proxy does not capture the separate write-down of major Reichsmark
cash and bank/savings balances. Under the October 1948 settlement, 100 RM
became 6.50 DM, a 93.5% nominal balance loss; by contrast the chain's
1936-1948 price change of about 58.5% implies about 36.9% purchasing-power
loss. The series must therefore not be used as a continuous-currency deflator
for monetary wealth across the reform. Source:
[Deutsche Bundesbank, Währungsreform 1948](https://www.bundesbank.de/de/aufgaben/themen/waehrungsreform-1948-614040).
JST R6 German CPI level changes provide the 1925-1949 proxy. Destatis provides the official
former-West-German medium-income four-person-household series for 1950-1962,
the all-private-household series for 1963-1991 and the German VPI for
1992-2025. Each seam-year rate is calculated inside one source series. The
Destatis 1948 observation is a second-half average and is therefore not used
to calculate the 1949 rate. Published rates are checked against the rounded
annual levels with a maximum deviation of `0.05` percentage points. This
threshold passes the measured maximum genuine rounding drift (`0.049688` pp)
but rejects every plus/minus `0.1`-pp published-rate mutation across all 76
official 1950-2025 cross-checks. The
long-series source vintage is `2025-06`; the latest source snapshot is
`2026-07-10`. The selected national VPI annual rates are
2.2 percent in both 2024 and 2025. The combined raw-data hash is
`83841d2c11df3a5e193aa07db3bdfe815cbbeea7f9f81c3526b197702a46bdb4`;
the generated 101-rate hash is
`9ec87b5052d5e086517142c34213a4063e2be6ccdd8a5babf6d5722ffb76ae3a`.

The canonical cash field is `zinssatz_de`. Its generated source module is
`app/simulator/german-cash-money-market-chain.js`; the pinned Bundesbank PDF,
its mechanically extracted table pages, hashes, attribution and source terms
live under `data/historical/german-cash-money-market-chain/`. Rebuild it with
`npm run build:german-cash-money-market-data` and verify the read-only
reconstruction with `npm run verify:german-cash-money-market-data`. Build and
verify read the primary PDF with Poppler `pdftohtml` 25.07.0 and require an
independent coordinate-based 77-year oracle to agree exactly with the
layout-text selection. The layout text is a derived artifact and is excluded
from the primary-source `rawDataHash`.

The chain uses JST R6 `DEU.stir` for 1925-1944 as a non-homogeneous
short-rate proxy. The missing 1945-1948 observations are an explicit
last-observation carry-forward of the 1944 value `2.13%`; they are
`estimated`, not observed investable returns. From 1949 it uses the first
overnight-funds column in the Deutsche Bundesbank long-series annual-average
tables: reported Frankfurt overnight rates through 1996, FIBOR O/N for
1997-1998, EONIA for 1999-2018, the published EONIA/EURSTR transition average
for 2019 and EURSTR from 2020. Negative annual averages remain signed.
The 1949-1996 segment is a Bundesbank-published proxy rather than an
officially set or quoted rate: it consists of unweighted monthly averages
reported by Frankfurt banks. The source chain through 1975 also names
*Deutsches Geld- und Bankwesen in Zahlen 1876-1975* (Verlag Fritz Knapp) and
Bundesbank calculations. The March 1970 survey-group change and July 1990
360/360-to-actual/360 day-count change are explicit discontinuities; 1970 and
1990 are mixed-method annual averages.

The published nominal percentage is applied once as a simple gross annual
cash-return proxy. It is not a fund NAV return and contains no additional
compounding, product cost, bank margin, account fee or tax. Under the existing
simulator contract the field is `cashBondReturn`: it applies to operative
cash, money-market holdings, the cash-like health bucket and bond tranches.
For bonds this is a declared maturity-mismatched proxy without duration, term
premium, credit-risk or mark-to-market effects; equity and gold do not use it.
The 1948 carry-forward rate does not implement the separate 100:6.5 nominal
write-down of major Reichsmark cash and bank/savings balances, so a run across
the reform is not a continuous real-world monetary-balance history. The
primary-source-only raw-data hash is
`ea1608b5dee7e00ae7bf24bb651cb01cd3f0d5423b54cdf21b9f975cced30722`;
the derived-extract hash is
`eae9ce9d4a172ecce6264fde18a618f810b4f11af2adb4bd53d1670fca44a97a`;
the generated 101-return hash is
`cf5471a345234984ac3ff8de57bffdb3128c1046e01ec998198721325ede9b69`.
The ECB administrator disclaimer for EURSTR is referenced in
`data/historical/german-cash-money-market-chain/LICENSE.md`.

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
| `global_equity_research_index` | economically weighted research total-return proxy | USD proxy 1925-1950; German investor currency 1951-2020; EUR 2021-2025 | 16 advanced economies | annual | JST R6; OECD `DSD_STES@DF_FINMARK` 4.0; ECB `EXR` | derived data `CC BY-NC-SA 4.0`; OECD/ESCB terms also apply | generated prior-year economic weights; USD through 1950; German investor currency from 1951; documented price/dividend transformations | 1925-1950 and 2021-2025 | required; reject missing/non-finite and non-positive levels |
| `inflation_de` | segmented German national consumer-price chain; excludes HICP/HVPI | not applicable | DE | annual | JST R6 1925-1949; Destatis long series 1950-2024; Destatis current annual table 2025 | JST-derived segment `CC BY-NC-SA 4.0`; Destatis segments Data Licence Germany - attribution - 2.0 | JST consecutive-level changes through 1949; published Destatis annual-average changes from 1950 with source-local seams; excludes the separate 100:6.5 nominal monetary-balance write-down across the 1948 reform | 1925-1949 | required; reject missing/non-finite |
| `zinssatz_de` | segmented annual-average nominal short/overnight gross `cashBondReturn` proxy | historical German regimes/DEM through 1998; EUR from 1999; percentages do not convert balances and the 1948 write-down is not implemented | DE | annual | JST R6 `DEU.stir` 1925-1944; explicit carry-forward 1945-1948; Bundesbank-published Frankfurt proxy/FIBOR/EONIA/EURSTR 1949-2025; Fritz Knapp/Bundesbank source chain through 1975 | JST-derived segment `CC BY-NC-SA 4.0`; Bundesbank/ESCB terms and ECB EURSTR disclaimer | published annual averages used once through the shared cash/bond path; bond maturity effects, extra compounding, costs, margin and tax are excluded | 1925-1948 | required; reject missing/non-finite |
| `lohn_de` | `unresolved` | not applicable | DE | annual | `unresolved` | `unresolved` | identity from embedded annual percentage | 1925-1949 | required; reject missing/non-finite |
| `gold_eur_perf` | `unresolved` | EUR | global | annual | `unresolved` | `unresolved` | identity from embedded annual percentage | 1925-1949 | required; reject missing/non-finite; zero quality unresolved |
| `cape` | `unresolved` | not applicable | `unresolved` | annual | `unresolved` | `unresolved` | identity from embedded annual ratio | 1925-1949 | required; reject missing/non-finite and non-positive ratios |

The equity, German CPI and German cash/money-market sources, identities,
transformations and data licences/terms are resolved. The remaining three historical source and licence
statuses remain intentionally unresolved. A resolved source chain does not
turn any of these research/proxy chains into an externally validated provider
series.

### Simulation-wide data inventory

`app/simulator/simulation-data-inventory.js` adds the wider, immutable
`SimulationDataInventoryV1`, revision `2026-07-29.5`. The existing
`HistoricalDataManifestV1` remains the active runtime/backtest record contract;
the wider inventory is an evidence and change gate around that runtime
contract and the productively used static model-data classes.

Each inventory entry carries:

- internal ID, category, unit and implementation locations;
- source, external series identifier, currency, annual convention,
  transformation, license and retrieval date as resolution fields;
- a `rawDataHash` resolution field and a separate canonical
  `embeddedValueHash` over the current in-app value when that value exists;
- evidence class and a separate external-validation status.

Resolution fields use `known`, `unresolved` or `not_applicable`. An
`unresolved` field always has `value: null`; a guessed label is invalid. The
evidence vocabulary keeps `official`, `derived`, `backtested`, `proxy`,
`estimated`, `model_assumption`, `user_input`, `stress_parameter`, `missing`
and `unresolved` distinct. A matching embedded-value hash proves technical
reproduction only. It does not prove the external identity, correctness or
usage right of the value.

The six historical entries own separate, contiguous `qualitySegments` for
1925-2025:

| Series | Current segment contract | Important gate |
| --- | --- | --- |
| `global_equity_research_index` | 1925-1950 `proxy`; 1951-2020 `backtested`; 2021-2025 `estimated` | source chain is reproducible; 1950 stays in USD so the reconstructed German 1949/1950 factor is not a global return; the modern frozen-dividend model remains an explicit limitation. The local German component still contains a documented currency-reform reconstruction in 1948/1949: Germany contributes about -4.17 percentage points in 1948 and +37.38 percentage points in 1949 despite an economic weight near five percent. This low-evidence proxy artifact is retained, not presented as a market event, and is removed when estimated history is excluded. |
| `inflation_de` | 1925-1949 `proxy`; 1950-1962 `official` with `proxy_population`; 1963-1991 `official`; 1992-2024 `official`; 2025 `official` | pinned JST/Destatis originals and generated hashes resolve the national VPI chain; territory/population seams remain explicit and HICP/HVPI is excluded |
| `zinssatz_de` | 1925-1944 `proxy`; 1945-1948 `estimated`; 1949-1996 Frankfurt overnight `proxy`; 1997-1998 FIBOR O/N `official`; 1999-2018 EONIA `official`; 2019 transition `official`; 2020-2025 EURSTR `official` | primary PDF and derived layout path agree exactly; 1970/1990 methods, 1948 monetary discontinuity and EURSTR disclaimer are explicit; the shared bond application remains a maturity-mismatched gross model proxy |
| `lohn_de` | 1925-1949 `estimated`; 1950-2023 `unresolved`; 2024-2025 separately `unresolved` | nominal wage/pension-adjustment identity and D-20 reconciliation unresolved |
| `gold_eur_perf` | zero ranges 1925-1932, 1934-1960 and 1962-1968 separately `unresolved`; remaining ranges separately inventoried | 42 zeros, gold-price source, market regime and USD/DM/EUR conversion unresolved |
| `cape` | 1925-1949 `estimated`; 1950-2025 `unresolved` | productive `t-1` use is known; external region, series and reconstruction are unresolved |

`qualitySegments` are evidence segments, not a rewrite of the runtime
`HistoricalYearRecordV1` completeness statuses. In particular, a finite
post-1950 number can still be technically present while its external evidence
remains `unresolved`.

The static inventory covers these product classes:

| Category | Inventory entries | Evidence boundary |
| --- | --- | --- |
| Demography | `mortality_table` | embedded period-table proxy; exact external table, transformation, license and retrieval unresolved |
| Care | `care_grade_taxonomy`, `care_incidence_probabilities`, `care_progression_probabilities`, `care_cost_presets` | taxonomy/proxy, estimated prevalence-to-incidence conversion and explicit model assumptions stay separate |
| Survivor | `widow_benefit_parameters` | user-input/default contract, not an observed benefit entitlement |
| Tax/tranches | `capital_income_tax_parameters` | current parameterized approximation; no historical-tax simulation or external tax validation |
| Pension/social | `pension_user_defaults`, `social_insurance_parameters` | user inputs are authoritative; an automatic social-insurance table is explicitly `missing`, not fabricated |
| Stress/regime | `stress_presets`, `regime_classification_thresholds`, `regime_transition_matrix` | stress parameters, model thresholds and derived transition counts use different classes |
| Defaults/fallbacks | `engine_policy_defaults`, `monte_carlo_defaults`, `longevity_defaults`, `tail_risk_defaults`, `health_bucket_defaults` | policy assumptions and stress defaults are hash-gated without being promoted to observations |

The source gate deliberately separates three questions:

1. `technicallyReproducible` requires a matching embedded-value hash.
2. `externallyValidated` requires the validation status plus resolved source,
   external identifier, license and retrieval date and a compatible evidence
   class.
3. `replacementAllowed` is false until the external-validation gate passes.

Therefore all six historical series can replay deterministically. The equity
inflation and cash entries now have resolved source, licence/terms, retrieval
and raw-data hashes, but their external-validation statuses remain
`not_validated`. Equity is a research proxy with a modelled 2021-2025 dividend
component; inflation includes a JST proxy through 1949 and explicit official
territory/population seams; cash includes a proxy and an explicit estimated
post-war bridge. The remaining three series retain their unresolved
replacement gates. Later data-replacement
slices must update their exact series entry, raw-data and embedded-value
hashes, segments, transformation and source/license evidence together.

### Cross-domain model source snapshots

The machine-readable market manifest and the following official snapshots are
different evidence classes. Official context is not automatically imported
into the application, does not calibrate the embedded tables by citation, and
does not make a technically tested model externally validated. Retrieval date
for all links below is 2026-07-28.

| Domain | Source / data date | Unit and intended comparison | Current implementation status | Owner / next review |
| --- | --- | --- | --- | --- |
| Capital-income tax | [EStG section 32d](https://www.gesetze-im-internet.de/estg/__32d.html) and [BMF/LStH 2026 section 43a](https://lsth.bundesfinanzministerium.de/lsth/2026/A-Einkommensteuergesetz/VI-Steuererhebung-36-47/3-Steuerabzug-vom-Kapitalertrag-KapSt-43-45e/Paragraf-43a/inhalt.html), legal/handbook state 2026 | EUR tax base and rate ratios | church-tax calculation remains a documented simplified formula; not a complete assessment | user / tax reviewer unassigned; 2026-10-31 |
| Mortality | [Destatis period life table 2023/2025](https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Bevoelkerung/Sterbefaelle-Lebenserwartung/sterbetafel.html), page dated 2026-07-07 | annual death probabilities and life expectancy by age/sex | official comparator not imported; embedded table is technically exercised but externally unvalidated | user / actuarial reviewer unassigned; 2027-01-15 |
| Long-term care benefits | [BMG benefits overview](https://www.bundesgesundheitsministerium.de/themen/pflege/online-ratgeber-pflege/leistungen-der-pflegeversicherung/leistungen-im-ueberblick/seite), page updated 2026-02-13 | EUR benefit amounts by care grade | benefit amounts are not an incidence/progression calibration and are not automatically imported | user / care reviewer unassigned; 2027-01-15 |
| Long-term care population | [Destatis care population at end-2023](https://www.destatis.de/DE/Presse/Pressemitteilungen/2024/12/PD24_478_224.html), released 2024-12-18 | persons and shares at a population stock date | stock data do not establish individual annual transition probabilities | user / care-actuarial reviewer unassigned; 2027-01-15 |
| Statutory pension | [German Pension Insurance values](https://www.deutsche-rentenversicherung.de/DRV/DE/Experten/Zahlen-und-Fakten/Werte-der-Rentenversicherung/werte-der-rentenversicherung_node.html), retrieved 2026-07-28 | EUR and official ratios/dates | the suite uses user-entered pension amounts and escalation; no automatic official-value import | user / next pension notice, no later than 2027-01-15 |

The normative cross-domain inventory, validation axes, scope and decision
status are maintained in
[`ARCHITEKTUR_UND_FACHKONZEPT.md`](ARCHITEKTUR_UND_FACHKONZEPT.md#modell--datenstands--und-validierungsmatrix).

### Research-gate status

The
[Simulator backtest research protocol](../internal/archive/2026-simulator-backtest-hardening/SIMULATOR_BACKTEST_FORSCHUNGSPROTOKOLL.md)
is the operational owner of FV-G01 through FV-G08 for FQ-01 through FQ-03. It
does not replace this runtime manifest and does not upgrade any field to
`known`.

| Open item | Current state | Required owner and next evidence | Blocking effect |
| --- | --- | --- | --- |
| exact equity provider-index identity | intentionally not applicable: `global_equity_research_index` is a named research proxy | external methodology review may compare it with licensed provider indices without renaming the proxy | blocks claims of provider-index equivalence, not deterministic use |
| variants and primary sources for the remaining three series | `unresolved` | exact series identifiers, definitions, retrieval/data dates and permitted source chain | blocks research-grade FV-G02 for those series |
| licenses/usage rights for the remaining three series | `unresolved` | license text, use/redistribution scope and review date; legal review where needed | blocks their replacement, integration or redistribution |
| equity proxy segments | original and filtered JST/OECD/ECB inputs, hashes and transformation resolved; 1925-1950 USD proxy and 2021-2025 frozen-dividend model | independent methodology validation and future dividend-source replacement | prevents provider-index and externally-validated claims |
| cash/money-market proxy segments | JST and Bundesbank inputs, hashes and transformation resolved; 1925-1944 non-homogeneous proxy and 1945-1948 carry-forward bridge | independent methodology validation and future observed pre-1949 replacement | prevents claims of a continuous investable product return and external validation |
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

- `global_equity_research_index` is a neutral research proxy and must not be
  displayed or exported as an MSCI series.
- The 2021-2025 OECD component is a price index; the dividend component is the
  country-specific JST 2020 dividend return held constant by construction.
- Monte Carlo supports excluding observations marked estimated via
  `mcExcludeEstimatedHistory`.

## Series overview

- `global_equity_research_index`: open, segmented global equity research index level
- `inflation_de`: open, segmented German annual-average national CPI chain
- `zinssatz_de`: annual German rate proxy
- `lohn_de`: annual wage growth proxy
- `gold_eur_perf`: annual gold return proxy
- `cape`: CAPE valuation proxy

## Follow-up actions

- Independently validate the weighting and currency methodology of the equity
  research proxy.
- Replace the frozen 2020 dividend component when an open observed
  total-return source for 2021-2025 becomes available.
- Clarify zero values in early `gold_eur_perf` years (`no data` vs `assumed 0`).
