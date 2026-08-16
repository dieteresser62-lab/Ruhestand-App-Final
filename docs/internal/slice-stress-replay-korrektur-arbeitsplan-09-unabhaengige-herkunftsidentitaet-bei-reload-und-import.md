# Slice 09 – Unabhaengige Herkunftsidentitaet bei Reload und Import

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Unabhaengige Herkunftsidentitaet bei Reload und Import

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-09-unabhaengige-herkunftsidentitaet-bei-reload-und-import.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-09-unabhaengige-herkunftsidentitaet.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-ui.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

Branchcheck auf `codex/stress-pfad-replay` bestanden. Vor Umsetzung waren nur
der vom Orchestrator verwaltete Auditbericht und diese neu angelegte Slice-MD
im Arbeitsbaum sichtbar. Das Diff-Risiko lag vor allem in einer
selbstreferenziellen Rekonstruktion aus `workspace.path` sowie in einer
Überschreitung des bestehenden Exportbudgets.

## Geplante Tests

Gemäß Arbeitsplan und Orchestrator-Validierungsmatrix.

## Durchgeführte Änderungen

- Beim Fixieren wird aus den Original-Szenariozeilen eine unabhängige
  `StressReplaySourceIdentityV1` erzeugt. Persistiert werden je Prefixzeile nur
  Ordnungs-/Typfelder und ein kanonischer Fingerprint der vorhandenen
  Baseline-Abgleichfelder, nicht das vollständige Log oder Finanzdetails.
- Source-Descriptor, Prefixlänge, Reihenfolge, Pfadstruktur, erlaubte Felder
  und innere Fingerprints werden fail-closed validiert und in den
  Workspace-Fingerprint einbezogen.
- Reload und kompatibler Import übergeben dieselbe persistierte Identität an
  den Baseline-Runner. Der produktive Fallback aus `workspace.path` wurde
  entfernt; Variantenänderungen tragen die Identität unverändert weiter.
- Legacy-V1-Workspaces ohne Identität bleiben validierbar, werden mit
  `source_identity_unavailable` jedoch ausschließlich zur Inspektion geöffnet.
- Der Export schließt vollständige Quelllogs ausdrücklich aus und validiert
  die eingebettete Identität über den Workspace-Contract.

## Ausgeführte Validierung mit Ergebnis

Fokussierte Implementer-Läufe bestanden:

- `tests/stress-replay-contract.test.mjs`: 74/74 Assertions
- `tests/stress-replay-ui.test.mjs`: 72/72 Assertions
- `tests/stress-replay-persistence.test.mjs`: 58/58 Assertions
- `tests/stress-replay-export.test.mjs`: 18/18 Assertions
- `tests/stress-replay-e2e.test.mjs`: 15/15 Assertions; 107.523 Bytes Export,
  Median 431,370 ms bei Budget 1.743,432 ms
- zusätzlicher Runner-Plausibilisierungslauf: 55/55 Assertions
- `git diff --check`: bestanden

Die autoritative Validierungsmatrix bleibt beim Orchestrator.

## Abweichungen vom Plan

Keine fachliche Abweichung. Zur Einhaltung von Datenschutz- und Größenbudget
werden die benötigten Abgleichwerte nicht direkt persistiert, sondern pro
Originalzeile kanonisch fingerprint-gebunden. Der Runner erzeugt denselben
Beweis aus seinen Ergebniszeilen und vergleicht ihn deterministisch.

## Offene Risiken

Die Identität bindet exakt die bereits vom Baseline-Abgleich verwendeten
Felder. Eine spätere Erweiterung dieses Feldsatzes muss Producer und
Runnerprojektion gemeinsam ändern; andernfalls würde ein neues Abgleichfeld
nicht Bestandteil des Herkunftsnachweises. Die aktuelle V1-Feldmenge ist in
einer gemeinsamen Contractkonstante zentralisiert.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-284fa702d4b0`
- Testdateien: `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-ui.test.mjs`
- Prüfdimensionen: checked contract fail-closed validation (unknown-key rejection, prefix-length/order drift, cross-run rebinding, fingerprint self-consistency), legacy-workspace read-only downgrade without path-derived synthesis, runner reconciliation via persisted-only identity (no raw log) end-to-end, export tamper-resistance for identity and path-source rebinding, and UI wiring of persisted identity through fixation/reload/import
- Größtes Restrisiko: beyond C-02: &#96;createStressReplaySourceIdentityV1&#96;'s &#96;requireInteger(identity.sourcePrefixLength, …, 1)&#96; floors the prefix at 1, which would reject a legitimate zero-length reconciled prefix if such a state is ever reachable independent of the existing &#96;STRESS_REPLAY_BASELINE_RECONCILIATION_FAILED&#96; early-return guard in the UI fixation flow; current call sites appear to always guard this upstream, so it is not currently exploitable, but it is not proven unreachable from the diff alone
- Realistische Bruchbedingung: any future direct caller of &#96;createStressReplaySourceIdentityV1&#96; (bypassing the UI's pre-check) for a baseline whose replay diverges at year 1 would hard-fail fixation with a generic contract error instead of a clear reconciliation-failed message
- Eigene Findings: `C-02`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-284fa702d4b0`
- Testdateien: `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-ui.test.mjs`
- Prüfdimensionen: Checked fail-closed contract validation for &#96;StressReplaySourceIdentityV1&#96; (allowed keys, descriptor binding to source run metadata, prefix length bounds up to 60, strict 1-indexed ordering &#96;jahr === index + 1&#96;, structural alignment with &#96;path.years&#96;, SHA-256 canonical JSON row and identity fingerprints), runner reconciliation via persisted identity fingerprint proof without raw logs, persistence downgrade of legacy workspaces missing &#96;sourceIdentity&#96; to &#96;read_only&#96; (&#96;source_identity_unavailable&#96;) without synthesizing evidence from &#96;workspace.path&#96;, export privacy exclusion of &#96;complete-source-scenario-logs&#96;, and UI controller session wiring across fixation, workspace transformation, reload, and import
- Größtes Restrisiko: Future modifications to simulation annual row records or decision structures adding new baseline comparison dimensions require synchronized updates to &#96;SOURCE_RECONCILIATION_FIELDS&#96;; if structured fields evolve without updating the shared projection contract, baseline reconciliation during replay could produce subtle mismatches
- Realistische Bruchbedingung: An engine extension adding new decision fields to annual simulation records where the reconciliation comparison in the runner is updated but &#96;SOURCE_RECONCILIATION_FIELDS&#96; in &#96;stress-replay-contract.js&#96; is not, causing replays of newly generated workspaces to omit the new fields from the identity proof
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-284fa702d4b0`

- Diff-Fingerprint: `284fa702d4b0862eed14f22b4c75af8c3da7083402f2040996d89926da187b33`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `8bc74792926d1cc076f6fd52fd91f2220906f8a196d47e452d86bbfce7ce2f97`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[183390 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure is an engine change (e.g., a new decumulation mode altering how &#96;entscheidung&#96; is populated on some row types) that produces a malformed or shaped-differently &#96;entscheidung&#96; object only on the runner/reconciliation side; because &#96;createStressReplaySourceIdentityRowFingerprint&#96; swallows that instead of throwing like its producer twin, users would see intermittent "reconciliation mismatch" errors on otherwise-valid replays that look like data corruption rather than the actual root cause (the duplicated, strictness-divergent projection logic), costing debugging time until someone traces it back to the two near-duplicate functions in stress-replay-contract.js.
  - Ereignis 3: In three months, the most likely failure cause is an engine update that introduces optional sub-properties to &#96;entscheidung&#96; or changes financial log field formats during decumulation; because &#96;projectSourceIdentityRow&#96; and &#96;createStressReplaySourceIdentityRowFingerprint&#96; filter down strictly to &#96;jahresEntnahme&#96;, any new field influencing baseline decision parity would be omitted from the fingerprint basis, leading to undetected drift between original run decisions and replayed baseline decisions until identified in production.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-02` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: &#96;projectSourceIdentityRow&#96; (producer path, used by &#96;createStressReplaySourceIdentityV1&#96; at fixation time) and &#96;createStressReplaySourceIdentityRowFingerprint&#96; (consumer path, used by the runner during reconciliation) independently re-implement the same &#96;SOURCE_RECONCILIATION_FIELDS&#96; projection instead of sharing one function, and the two copies are not strictness-equivalent: the producer calls &#96;requirePlainObject(row.entscheidung, …)&#96; and throws (fail-closed) if &#96;entscheidung&#96; is present but malformed, while the consumer only checks &#96;row.entscheidung &amp;&amp;&#96; truthiness and silently treats a malformed non-object &#96;entscheidung&#96; as absent (no throw). If the deterministic engine ever emits a malformed &#96;entscheidung&#96; on an *actual* replayed row, the runner would silently drop that field from the fingerprint basis instead of failing loudly, producing either a false reconciliation match or a confusing generic value-mismatch instead of a clear malformed-data error. The slice's own "Offene Risiken" section already flags that producer/runner projections must be changed together, which is exactly the drift risk this duplication creates.
- Akzeptanztest: Acceptance test: extract a single shared &#96;projectSourceReconciliationFields(row)&#96; helper used by both &#96;projectSourceIdentityRow&#96; and &#96;createStressReplaySourceIdentityRowFingerprint&#96; (or make the consumer call &#96;requirePlainObject&#96; identically to the producer), then add a unit test in tests/stress-replay-contract.test.mjs that feeds a row with a non-object &#96;entscheidung&#96; into both functions and asserts they either both throw or both apply identical projection semantics.
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-02 | claude | &#96;projectSourceIdentityRow&#96; (producer path, used by &#96;createStressReplaySourceIdentityV1&#96; at fixation time) and &#96;createStressReplaySourceIdentityRowFingerprint&#96; (consumer path, used by the runner during reconciliation) independently re-implement the same &#96;SOURCE_RECONCILIATION_FIELDS&#96; projection instead of sharing one function, and the two copies are not strictness-equivalent: the producer calls &#96;requirePlainObject(row.entscheidung, …)&#96; and throws (fail-closed) if &#96;entscheidung&#96; is present but malformed, while the consumer only checks &#96;row.entscheidung &amp;&amp;&#96; truthiness and silently treats a malformed non-object &#96;entscheidung&#96; as absent (no throw). If the deterministic engine ever emits a malformed &#96;entscheidung&#96; on an *actual* replayed row, the runner would silently drop that field from the fingerprint basis instead of failing loudly, producing either a false reconciliation match or a confusing generic value-mismatch instead of a clear malformed-data error. The slice's own "Offene Risiken" section already flags that producer/runner projections must be changed together, which is exactly the drift risk this duplication creates. | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

## Rückdokumentation in die Arbeitsplan-MD

Arbeitsplan: `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`

## Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
