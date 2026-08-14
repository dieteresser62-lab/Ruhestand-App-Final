# Slice 05 – Strukturierte Transaktionsdiagnostik

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Strukturierte Transaktionsdiagnostik

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `app/simulator/simulator-bond-refill.js`, `app/simulator/simulator-engine-direct.js`, `app/simulator/simulator-forced-sale.js`, `app/simulator/simulator-year-result.js`, `app/simulator/stress-replay-transactions.js`, `docs/internal/slice-stress-pfad-replay-arbeitsplan-05-strukturierte-transaktionsdiagnostik.md`, `docs/internal/slice-stress-replay-implement-05-strukturierte-transaktionsdiagnostik.md`, `docs/internal/stress-replay-implement-review-fa2904b2.md`, `tests/stress-replay-transactions.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

- Branchcheck vor Umsetzung: `codex/stress-pfad-replay` (erwartet).
- Baseline-HEAD: `bc8e541`.
- Vorhandene Orchestratoränderungen lagen ausschließlich in den beiden
  orchestratorverwalteten Dokumentationspfaden; es gab keine fremde
  Codeänderung im Slice-Scope.
- Diff-Risiko: hoch für unbeabsichtigte Änderungen an Finanzsemantik,
  Steuerreconciliation, Balance-Trace-Reihenfolge und FlowDelta. Deshalb ist
  die Diagnose über `stressReplayTransactionCapture` opt-in; Standardläufe
  behalten ihre bisherige Payloadform.

## Geplante Tests

- Ereignisisolation für alle fünf Contractklassen.
- Brutto/Netto/Steuer bei strukturierten Orakeln.
- explizite Steuer-Missingness beim Payout-Fallback.
- Fail-closed-Verhalten bei unbekannten Klassen und fehlender Missingness.
- exakte Ergebnis- und FlowDelta-Invarianz mit und ohne Replay-Capture.

## Durchgeführte Änderungen

- `stress-replay-transactions.js` definiert den versionierten Ereignisvertrag,
  die erlaubten Klassen sowie deterministische Jahres- und Laufprojektionen.
- Forced Sale, Payout-Fallback und Bond-Refill liefern bei explizitem Capture
  strukturierte Diagnoseobjekte aus Zustands- bzw. Sale-Engine-Orakeln.
- Der Direct Runner instrumentiert Policyverkäufe und reicht die Diagnosen
  ausschließlich im Replay-Capture-Modus an das Jahresergebnis weiter.
- Der Payout-Fallback besitzt im Capture-Modus eine eigene Balance-Trace-Phase;
  seine nicht berechnete Steuer bleibt `null` mit maschinenlesbarer
  Missingness statt als geschätzte Null.
- Standardläufe erzeugen weder das neue Logfeld noch zusätzliche Trace-Phasen.
- Die Korrektur zu C-03 ergänzt einen Volljahres-Paritätswitness, der sowohl
  die Liquiditäts-Notdeckung als auch den Payout-Fallback tatsächlich ausführt
  und die einzelne additive Trace-Phase gegen den Standardlauf abgrenzt.

## Ausgeführte Validierung mit Ergebnis

- `node tests/run-single.mjs tests/stress-replay-transactions.test.mjs`:
  33/33 Assertions bestanden (einschließlich Korrekturtest zu C-03).
- `node tests/run-single.mjs tests/simulation.test.mjs`:
  94/94 Assertions bestanden.
- `node tests/run-single.mjs tests/3bucket-refill.test.mjs`:
  32/32 Assertions bestanden.
- `node tests/run-single.mjs tests/simulator-tax-settlement.test.mjs`:
  77/77 Assertions bestanden.
- `node tests/run-single.mjs tests/core-negative-contracts.test.mjs`:
  192/192 Assertions bestanden.
- `node tests/run-single.mjs tests/simulator-backtest-characterization.test.mjs`:
  257/258 Assertions bestanden; der einzige Fehler ist der bereits auf
  Baseline-HEAD vorhandene Mismatch
  `resultProjection.targetActualSha256` (`5f936b...` statt `aed5b9...`). Ein
  lesender Vergleichslauf, der die vier geänderten produktiven Dateien aus
  `HEAD` lud, reproduzierte exakt denselben einzelnen Fehler. Die während der
  Umsetzung zunächst sichtbare zusätzliche Änderung am Canonical-Rows-Hash
  wurde durch den Replay-Opt-in beseitigt.
- `git diff --check`: bestanden.
- Die deterministische Gesamtvalidierung und Attestierung bleibt dem
  Orchestrator vorbehalten.

## Abweichungen vom Plan

Keine fachliche Abweichung. Die Instrumentierung ist ausdrücklich opt-in, um
die geforderte Replay-Spezifität und unveränderte Standardresultate gemeinsam
zu sichern.

## Offene Risiken

- Die Zuordnung der finalen Jahressteuer auf einzelne kombinierte Verkäufe
  bleibt auf den jeweils strukturiert beobachtbaren Steuerbetrag begrenzt.
- Die Aktivierung und Sammlung des Capture-Modus im Replay-Runner folgt in
  Slice 06 innerhalb dessen eigener Allowlist.
- Siehe außerdem Findings-Lebenszyklus.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `NO`
- Validierungsbindung: `validation-74b9032cde45`
- Testdateien: `tests/stress-replay-transactions.test.mjs`
- Eigene Findings: `C-03`

### Ereignis 4: Runde 2

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-97ebefd95c90`
- Testdateien: `tests/stress-replay-transactions.test.mjs`
- Prüfdimensionen: Checked dimensions — invariant coverage for the executed-sale stress path (C-03 fix), additive-only contract on &#96;logData&#96;/&#96;balance_trace&#96;, determinism of &#96;collectStressReplayTransactions&#96; IDs/ordering, fail-closed behavior on unknown classes/missing money, immutability (&#96;deepFreeze&#96;) of projected events, and consistency between top-level and breakdown missingness handling (C-04).
- Größtes Restrisiko: downstream Slice 06 comparison/delta-ledger or Slice 09 renderer consuming &#96;breakdown[].netEur/taxEur&#96; nulls as "confirmed data" rather than "not itemized," since only aggregate-level nulls are contractually forced to carry a machine-readable reason.
- Realistische Bruchbedingung: a future slice diffs or displays per-asset breakdown tax/net figures across baseline vs. alternative variants and treats an unexplained &#96;null&#96; as &#96;0&#96; or as equal-therefore-ignorable, masking a real divergence in a stressed year.
- Eigene Findings: `C-03`, `C-04`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 5: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-97ebefd95c90`
- Testdateien: `tests/stress-replay-transactions.test.mjs`
- Prüfdimensionen: Checked dimensions — strict opt-in isolation of &#96;stressReplayTransactionCapture&#96; preserving default simulation output and canonical row hashes; fail-closed schema validation on unsupported transaction classes, negative/non-finite amounts, and malformed missingness; deterministic sequential ID synthesis (&#96;${yearIndex}:${sequence}:${class}&#96;) and chronological ordering in &#96;collectStressReplayTransactions&#96;; recursive immutability via &#96;deepFreeze&#96;; explicit machine-readable tax missingness on &#96;payout_floor_fallback_sale&#96; avoiding synthetic zero tax; additive single-phase trace balance invariant under forced sale and payout fallback verified by Test 6b; structured diagnostic coverage across policy rebalancing, forced liquidity coverage, payout fallback, and 3-bucket bond refill.
- Größtes Restrisiko: Largest residual risk: Downstream consumers in Slice 06 (comparison ledger) or Slice 09 (renderer) summing &#96;breakdown[].netEur&#96; or &#96;breakdown[].taxEur&#96; directly across asset classes rather than consuming top-level aggregate figures, leading to unhandled &#96;null&#96; values or skewed tranche comparisons on forced sales where per-asset tax is unitemized.
- Realistische Bruchbedingung: Realistic break condition: A downstream comparison routine in Slice 06 performs an asset-by-asset tax delta calculation by iterating over &#96;event.breakdown[].taxEur&#96; without falling back to aggregate &#96;event.taxEur&#96; and &#96;event.missingness&#96;, treating &#96;null&#96; as 0.00 EUR or throwing a TypeError during delta computation for bear-market forced-sale years.
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
- `C-03` Antwort 1: **angenommen** — Volljahres-Test 6b prüft byte-identische übrige Logdaten sowie exakt eine additive &#96;after_payout_fallback&#96;-Trace-Phase.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-74b9032cde45`

- Diff-Fingerprint: `74b9032cde45c871b2464298d88d0e0cc4e5791d00e6778b7785a62c0fdc214b`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `178f074ce7dc9c8c8ac013b868d1cae99398fa44c7ebe0149d89a74f49fc5c78`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 174 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[178001 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |

### Ereignis 3: `validation-97ebefd95c90`

- Diff-Fingerprint: `97ebefd95c90860e183f3a0ebbca267f369ee09aa0286cebd15efb81a320397d`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `8c0fb64d682abee4bd74d7084081d560010dc00fc776b70654ba170d11f5ec49`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 174 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[178092 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Three months from now, Slice 06's variant comparison/delta-ledger turns on &#96;stressReplayTransactionCapture&#96; for real bear/crash years, compares &#96;logData&#96;/&#96;balance_trace&#96; between baseline and alternative runs (or persists/replays them), and discovers the extra &#96;after_payout_fallback&#96; trace phase perturbs a hash-based parity check or duplicates itself across replay/import cycles — traced back to this slice's unverified additive-invariant for the forced-sale/payout-fallback branch.
  - Ereignis 4: In three months, the most likely failure is that Slice 06's comparison/delta-ledger or Slice 09's renderer consumes &#96;breakdown[]&#96; line items directly (bypassing the aggregate &#96;grossEur/netEur/taxEur&#96; that do carry proper missingness semantics), silently treating the unexplained per-asset &#96;null&#96; net/tax values as zero or as "nothing to show," producing a comparison view that understates realized tax/proceeds differences for exactly the stressed forced-sale/payout-fallback years this feature was built to surface — the C-04 gap materializing downstream rather than being caught here.
  - Ereignis 5: In three months, the most likely issue is that Slice 06 comparison logic or Slice 09 UI rendering aggregates &#96;breakdown[]&#96; line items instead of top-level &#96;grossEur&#96;/&#96;netEur&#96;/&#96;taxEur&#96; properties, encountering &#96;null&#96; values from forced sales and displaying incomplete tax breakdowns or computing zero tax deltas in crash years rather than presenting the structured missingness reason.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-03` — `CLOSED`

- Quelle: `claude`; Runde 1
- Klasse: `BLOCKER`
- Finding: The slice's core invariant — "capture only adds the new &#96;stressReplayTransactionDiagnostics&#96; field and never changes other financial/log output" — is asserted by Test 6 but is only exercised for a market scenario with sufficient liquidity where neither &#96;applyForcedSaleLiquidityCoverage&#96; nor &#96;applyPayoutFallbackSale&#96; actually executes a sale. However, &#96;simulator-engine-direct.js&#96; also adds a *conditional* call to the pre-existing &#96;snapshotBalance('after_payout_fallback', {...})&#96; inside &#96;if (stressReplayTransactionCapture &amp;&amp; payoutFallback.transactionDiagnostic) {...}&#96;, i.e. whenever capture is on AND a payout-floor fallback sale actually fires, an extra entry is appended to the pre-existing &#96;balanceTrace&#96;/&#96;logData.balance_trace&#96; field — a field that is not new to this slice and (per the slice MD's own note about the Canonical-Rows-Hash regression that had to be "beseitigt" by making capture opt-in) is evidently part of the hashed/characterized financial log surface. Test 6's round-trip check (&#96;delete projectedCapture.logData.stressReplayTransactionDiagnostics; assertJsonEqual(projectedCapture, withoutCapture, ...)&#96;) never triggers this branch, so the claim "capture changes diagnostics only, not financial results" is unverified for exactly the scenario this whole slice was built to diagnose (an actual forced sale / payout-floor fallback under stress). If a later slice (03 runner, 06 comparison/delta-ledger) turns capture on for a genuinely stressed path and diffs/hashes &#96;logData&#96; (or &#96;balance_trace&#96; specifically) between capture-on and capture-off runs, or persists/compares &#96;balance_trace&#96; as part of a determinism oracle, this untested additive mutation could silently break parity or corrupt a comparison baseline — the exact class of regression this stress-replay feature exists to prevent.
- Akzeptanztest: Add a Test 6b scenario in tests/stress-replay-transactions.test.mjs that forces &#96;applyPayoutFallbackSale&#96; (and ideally also &#96;applyForcedSaleLiquidityCoverage&#96;) to actually execute inside a full &#96;simulateOneYear&#96; call (e.g. lower &#96;zielLiquiditaet&#96;/floor coverage or shrink starting liquidity so &#96;jahresEntnahmeEffektiv + 1e-6 &lt; netFloorYear&#96;), run it once with &#96;stressReplayTransactionCapture: true&#96; and once without, and assert: (a) all &#96;logData&#96; keys other than &#96;stressReplayTransactionDiagnostics&#96; and &#96;balance_trace&#96; are byte-identical (&#96;JSON.stringify&#96; equal after deleting only those two keys from both sides), and (b) &#96;withCapture.logData.balance_trace&#96; has exactly one additional entry (phase &#96;after_payout_fallback&#96;) compared to &#96;withoutCapture.logData.balance_trace&#96;, with all prior entries in matching order and content. VALIDATE: ["node","tests/run-single.mjs","tests/stress-replay-transactions.test.mjs"]
- Statusbegründung: Test 6b (tests/stress-replay-transactions.test.mjs) forces both &#96;applyForcedSaleLiquidityCoverage&#96; and &#96;applyPayoutFallbackSale&#96; to execute inside a full &#96;simulateOneYear&#96; capture-on/off comparison, proves byte-identical &#96;logData&#96; outside the two additive keys, and proves exactly one additive, correctly-ordered &#96;after_payout_fallback&#96; &#96;balance_trace&#96; entry with no other trace perturbation (including none from the forced-sale branch). Bound validation-97ebefd95c90 shows the full suite, including this file, passing. The previously unverified invariant is now covered for the stress scenario this slice targets.

### `C-04` — `OPEN`

- Quelle: `claude`; Runde 2
- Klasse: `OBSERVATION`
- Finding: &#96;normalizeBreakdown&#96; in app/simulator/stress-replay-transactions.js permits &#96;breakdown[].netEur&#96;/&#96;taxEur&#96; to be &#96;null&#96; without a corresponding &#96;missingness&#96; entry, unlike top-level monetary fields, creating an unaudited "silent null" path in an otherwise fail-closed contract; forced-sale breakdown entries already emit unconditional null net/tax per asset class while the aggregate reports a computed tax figure.
- Akzeptanztest: Add an assertion in tests/stress-replay-transactions.test.mjs that a &#96;breakdown&#96; entry with &#96;netEur: null&#96;/&#96;taxEur: null&#96; and no matching &#96;missingness&#96; entry either throws (contract requires alignment) or, if intentionally permitted, add an explicit test documenting and locking in that per-line nulls are exempt from the missingness requirement, plus a regression test on the forced-sale producer confirming its breakdown null usage is intentional and stable. VALIDATE: ["node","tests/run-single.mjs","tests/stress-replay-transactions.test.mjs"]
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-03 | claude | The slice's core invariant — "capture only adds the new &#96;stressReplayTransactionDiagnostics&#96; field and never changes other financial/log output" — is asserted by Test 6 but is only exercised for a market scenario with sufficient liquidity where neither &#96;applyForcedSaleLiquidityCoverage&#96; nor &#96;applyPayoutFallbackSale&#96; actually executes a sale. However, &#96;simulator-engine-direct.js&#96; also adds a *conditional* call to the pre-existing &#96;snapshotBalance('after_payout_fallback', {...})&#96; inside &#96;if (stressReplayTransactionCapture &amp;&amp; payoutFallback.transactionDiagnostic) {...}&#96;, i.e. whenever capture is on AND a payout-floor fallback sale actually fires, an extra entry is appended to the pre-existing &#96;balanceTrace&#96;/&#96;logData.balance_trace&#96; field — a field that is not new to this slice and (per the slice MD's own note about the Canonical-Rows-Hash regression that had to be "beseitigt" by making capture opt-in) is evidently part of the hashed/characterized financial log surface. Test 6's round-trip check (&#96;delete projectedCapture.logData.stressReplayTransactionDiagnostics; assertJsonEqual(projectedCapture, withoutCapture, ...)&#96;) never triggers this branch, so the claim "capture changes diagnostics only, not financial results" is unverified for exactly the scenario this whole slice was built to diagnose (an actual forced sale / payout-floor fallback under stress). If a later slice (03 runner, 06 comparison/delta-ledger) turns capture on for a genuinely stressed path and diffs/hashes &#96;logData&#96; (or &#96;balance_trace&#96; specifically) between capture-on and capture-off runs, or persists/compares &#96;balance_trace&#96; as part of a determinism oracle, this untested additive mutation could silently break parity or corrupt a comparison baseline — the exact class of regression this stress-replay feature exists to prevent. | BLOCKER | angenommen | erledigt: Test 6b (tests/stress-replay-transactions.test.mjs) forces both &#96;applyForcedSaleLiquidityCoverage&#96; and &#96;applyPayoutFallbackSale&#96; to execute inside a full &#96;simulateOneYear&#96; capture-on/off comparison, proves byte-identical &#96;logData&#96; outside the two additive keys, and proves exactly one additive, correctly-ordered &#96;after_payout_fallback&#96; &#96;balance_trace&#96; entry with no other trace perturbation (including none from the forced-sale branch). Bound validation-97ebefd95c90 shows the full suite, including this file, passing. The previously unverified invariant is now covered for the stress scenario this slice targets. |
| C-04 | claude | &#96;normalizeBreakdown&#96; in app/simulator/stress-replay-transactions.js permits &#96;breakdown[].netEur&#96;/&#96;taxEur&#96; to be &#96;null&#96; without a corresponding &#96;missingness&#96; entry, unlike top-level monetary fields, creating an unaudited "silent null" path in an otherwise fail-closed contract; forced-sale breakdown entries already emit unconditional null net/tax per asset class while the aggregate reports a computed tax figure. | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

## Rückdokumentation in die Arbeitsplan-MD

Arbeitsplan: `docs/internal/stress-replay-implement-review-fa2904b2.md`

## Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
