# Slice 06 – Variantenvergleich und Delta-Ledger

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Variantenvergleich und Delta-Ledger

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `app/simulator/stress-replay-comparison.js`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-transactions.js`, `docs/internal/slice-stress-pfad-replay-arbeitsplan-06-variantenvergleich-und-delta-ledger.md`, `docs/internal/slice-stress-replay-implement-06-variantenvergleich-und-delta-ledger.md`, `docs/internal/stress-replay-implement-review-fa2904b2.md`, `tests/stress-replay-comparison.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

- Branch vor Umsetzung: `codex/stress-pfad-replay` (entspricht dem Zielbranch).
- Vorhandene Änderungen lagen ausschließlich in orchestratorverwalteter
  Slice-/Auditdokumentation; es gab keine fremde Änderung in einem
  produktiven Slice-06-Pfad.
- Diff-Risiko: mittel. Der neue Vergleichscontract wird von späteren
  Persistenz- und UI-Slices konsumiert; die Runner-Erweiterung aktiviert nur
  die in Slice 05 additive Transaktionserfassung und ändert keine
  Finanzsemantik.

## Geplante Tests

- Reihenfolgeunabhängige Baseline-/Variantenkopplung und Vergleichsfingerprint.
- Eine Baseline plus maximal drei Alternativen sowie Entfernen ausschließlich
  von Alternativen.
- KPI-Deltas, erste Delta-Marker, Single-/Multi-Faktor-Kennzeichnung und
  explizite Missingness.
- Technische Fehler ohne Nullwert- oder Rankinginterpretation.
- Unabhängig geklonter Startzustand je Replaylauf.

## Durchgeführte Änderungen

- Versionierten, tief unveränderlichen Vergleichscontract mit stabilem
  Baseline-zuerst-/ID-Sortiervertrag und kanonischem Fingerprint ergänzt.
- DOM-freien Vergleichsrunner für denselben materialisierten Pfad und separat
  geklonte Baseline-/Variantenläufe ergänzt.
- Paarweise KPI-Deltas sowie erste Marker für Portfolio, Policyentscheidung,
  Rebalancing, Forced Sale, Haushalts-Flex, Mindest-Flex-Fehlbetrag und
  Terminalstatus umgesetzt.
- Strukturierte Transaktionssummen erhalten unbekannte Geldwerte als `null`
  einschließlich ihrer Missingness; technische Ergebnisse blockieren die
  finanzielle Paarinterpretation und den Gesamtstatus.
- Replayrunner an die additive Slice-05-Transaktionserfassung angebunden und
  um beobachtbare Flex-, Mindest-Flex- und Health-Bucket-Summen erweitert.
- Entfernen von Alternativen erzeugt einen neu fingerprinteten Vergleich;
  Entfernen der Baseline wird fail-closed abgewiesen.

## Ausgeführte Validierung mit Ergebnis

Die verbindliche Attestierung wird durch den Orchestrator projiziert. Lokale
Codex-Plausibilisierung:

- `node tests/run-single.mjs tests/stress-replay-comparison.test.mjs`: 29/29
  Assertions bestanden.
- `node tests/run-single.mjs tests/stress-replay-runner.test.mjs`: 19/19
  Assertions bestanden.
- `node tests/run-single.mjs tests/stress-replay-transactions.test.mjs`: 33/33
  Assertions bestanden.
- `node tests/run-single.mjs tests/stress-replay-variant.test.mjs`: 36/36
  Assertions bestanden.
- `node tests/run-single.mjs tests/stress-replay-contract.test.mjs`: 47/47
  Assertions bestanden.
- Syntaxprüfung der vier geänderten/neu angelegten Simulator-Module:
  bestanden.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Persistenz und UI konsumieren den Contract erst in den Folgeslices 07 bis
  09; deren Integration ist nicht Teil dieses Slice.
- Die Finanzresultate werden nicht gerankt, weil ein einzelner fixierter Pfad
  keine allgemeine Strategieaussage erlaubt.
- Externes Review und Orchestrator-Validierungsattestierung stehen aus; siehe
  Findings-Lebenszyklus.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-bf873dc014f2`
- Testdateien: `tests/stress-replay-comparison.test.mjs`
- Prüfdimensionen: correctness of contract whitelist/round-trip fingerprinting, fail-closed technical-error handling, aggregation poisoning semantics, missingness null-vs-zero discipline, removal/idempotency of comparison recomputation
- Größtes Restrisiko: Largest residual risk: always-on transaction capture in the deterministic runner is unverified against a real forced-sale/payout-fallback year at the integration (runner/comparison) level, only at the isolated engine level from Slice 05
- Realistische Bruchbedingung: Break condition: a future real bear-market replay produces a payout-floor fallback sale whose additive &#96;after_payout_fallback&#96; balance-trace entry leaks into a downstream reconciliation/hash comparison that assumed capture-off shape, silently flipping &#96;reconciliation.matched&#96; or corrupting a persisted/exported diff in exactly the stressed year this feature exists to diagnose.
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-bf873dc014f2`
- Testdateien: `tests/stress-replay-comparison.test.mjs`
- Prüfdimensionen: Contract whitelist adherence, deterministic canonical comparison fingerprinting, start-state isolation across variant replay runs, fail-closed technical error blocking, and zero-vs-null missingness discipline across KPI deltas and transaction summaries
- Größtes Restrisiko: Downstream persistence (Slice 07) or UI comparison renderer (Slice 09) assuming all paired KPI deltas are numeric and failing to handle null values with structured missingness reasons or not_applicable ruin states
- Realistische Bruchbedingung: A non-ruined or partially unobserved stress path replay produces null deltas for health bucket usage or ruin year that a downstream exporter or UI table attempts to format as percentages or currency, resulting in NaN displays or serialization exceptions &#124;
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-bf873dc014f2`

- Diff-Fingerprint: `bf873dc014f2e91299ccc2148e83b85908dca7043f5ab0053d602a491ad9c2d2`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `a257e5a2713cbf41b6ba62fa54109f34f543d06e8ee77864d5167f9bc8b21690`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 175 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[178874 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure is that C-01 materializes — a persistence/export/UI consumer in Slices 07–09 diffs or hashes the stress-replay runner's &#96;scenarioLog&#96;/reconciliation output for a genuinely stressed (forced-sale/payout-fallback) year, and the now-permanent additive capture instrumentation (untested at this integration boundary) produces an unexpected divergence that gets silently masked or misinterpreted rather than caught by a regression test.
  - Ereignis 3: In three months, the most likely issue is that a downstream consumer in Slice 07 (export) or Slice 09 (UI) fails to check kpiDeltas[field].applicability or null absoluteDelta, directly formatting unobserved metrics (e.g. unobserved health-bucket or non-ruined ruinYear) and causing rendering exceptions or displaying '0.00 EUR' instead of the structured missingness reason.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: &#96;runStressReplayPathV1&#96; now unconditionally enables &#96;STRESS_REPLAY_TRANSACTION_CAPTURE_INPUT&#96; for every year, reactivating exactly the "capture perturbs the log surface in a real forced-sale/payout-fallback year" scenario the Slice-05 pre-mortem predicted would surface in Slice 06. No test in this slice drives an actual forced-sale/payout-floor-fallback branch through the real runner (only Slice 05's isolated &#96;simulateOneYear&#96;-level test and this slice's trivial comparison fixture, which never triggers those branches), so the always-on capture's effect on this runner's own &#96;scenarioLog&#96;/&#96;reconciliation&#96; output in a genuinely stressed year is asserted but not demonstrated at the integration level.
- Akzeptanztest: Add a stress-replay-runner or stress-replay-comparison test that forces &#96;applyForcedSaleLiquidityCoverage&#96;/&#96;applyPayoutFallbackSale&#96; to fire within an actual &#96;runStressReplayPathV1&#96; (or &#96;runStressReplayComparisonV1&#96;) call on a bear/crash-year materialized path, then assert byte-identical &#96;reconciliation&#96;/&#96;scenarioLog&#96; shape aside from the additive &#96;after_payout_fallback&#96; trace phase and the new &#96;stressReplayTransactionDiagnostics&#96;-equivalent fields, mirroring Slice 05's Test 6b but at this runner's integration boundary. VALIDATE: ["node","tests/run-single.mjs","tests/stress-replay-runner.test.mjs"]
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | &#96;runStressReplayPathV1&#96; now unconditionally enables &#96;STRESS_REPLAY_TRANSACTION_CAPTURE_INPUT&#96; for every year, reactivating exactly the "capture perturbs the log surface in a real forced-sale/payout-fallback year" scenario the Slice-05 pre-mortem predicted would surface in Slice 06. No test in this slice drives an actual forced-sale/payout-floor-fallback branch through the real runner (only Slice 05's isolated &#96;simulateOneYear&#96;-level test and this slice's trivial comparison fixture, which never triggers those branches), so the always-on capture's effect on this runner's own &#96;scenarioLog&#96;/&#96;reconciliation&#96; output in a genuinely stressed year is asserted but not demonstrated at the integration level. | OBSERVATION | offen | offen |
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
