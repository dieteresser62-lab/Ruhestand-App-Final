# CAPE Automation Contract (Ticket T12)

Status: agreed preparation spec for later implementation in Balance annual rollover.

## Scope
- Source-of-Truth for CAPE in app logic is `capeRatio` (numeric).
- Operational source is US Shiller CAPE.
- Annual rollover must stay non-blocking: CAPE failures must not abort the workflow.

## Canonical Source and Fallback Chain
1. `yale_ie_data_xls` (primary): Yale `ie_data.xls`
2. `shillerdata_mirror` (fallback 1): mirror endpoint with equivalent data
3. `stored_last_value` (fallback 2): last persisted CAPE metadata/value in local state

If all remote sources fail and no stored value exists:
- do not crash;
- keep current input value unchanged;
- set fetch status to hard error (see status enum).

## Data Contract

### Runtime input field (already canonical)
- `capeRatio: number`  
  Engine-facing CAPE field. `marketCapeRatio` stays alias/fallback only.

### Persisted metadata fields (new contract)
- `capeAsOf: string | null`  
  ISO date (`YYYY-MM-DD`) of source observation used for `capeRatio`.
- `capeSource: string | null`  
  One of: `yale_ie_data_xls | shillerdata_mirror | stored_last_value | manual`.
- `capeFetchStatus: string`  
  One of:
  - `ok_primary`
  - `ok_fallback_mirror`
  - `ok_fallback_stored`
  - `warn_stale_source`
  - `error_no_source_no_stored`
- `capeUpdatedAt: string | null`  
  ISO timestamp (`YYYY-MM-DDTHH:mm:ss.sssZ`) of local update event.

## Freshness and Staleness Rules
- A fetched value is accepted if numeric and in plausibility band `(5..80)`.
- `warn_stale_source` if source `capeAsOf` is older than 18 months.
- Staleness warning is informational only; rollover still succeeds.

## Rollover Behavior Contract
During annual rollover:
1. Try fetch/parse primary.
2. If primary fails, try mirror.
3. If mirror fails, use stored last value.
4. Update `capeRatio` only if a valid CAPE candidate exists.
5. Persist metadata fields atomically with rollover state write.
6. Never abort rollover because of CAPE.

## UX Contract
- Success text example: `ETF + CAPE aktualisiert`.
- Fallback text example: `ETF aktualisiert, CAPE aus lokalem Stand übernommen (DD.MM.YYYY)`.
- Hard-error text example: `ETF aktualisiert, CAPE unverändert (keine Quelle verfügbar)`.

## Parser Contract (for later implementation)
- Parser output shape:
  - `value: number`
  - `asOf: YYYY-MM-DD`
  - `rawSource: source id`
- Parser must ignore trailing notes/headers and take the latest valid observation.
- Invalid parse never throws to UI layer; returns structured failure reason.

## Failure Scenarios (must be handled)
1. Network timeout primary
2. Primary schema/format drift
3. Mirror unavailable
4. Parsed CAPE out of plausibility band
5. Stored value missing/corrupt
6. Partial write risk on metadata persistence

## Test Matrix Definition (for implementation phase)
1. `primary_ok`: primary accepted, status `ok_primary`.
2. `primary_fail_mirror_ok`: mirror accepted, status `ok_fallback_mirror`.
3. `all_fail_stored_ok`: stored value used, status `ok_fallback_stored`.
4. `all_fail_no_stored`: no update, status `error_no_source_no_stored`.
5. `stale_primary`: accepted + status `warn_stale_source`.
6. `invalid_out_of_range`: rejected source value, fallback continues.
7. `metadata_persist`: all four metadata fields written with valid formats.
8. `rollover_non_blocking`: CAPE failure does not abort annual rollover.

## Non-Goals (T12)
- No fetch implementation in this ticket.
- No Balance UI wiring changes in this ticket.
- No simulator CAPE model change in this ticket.
