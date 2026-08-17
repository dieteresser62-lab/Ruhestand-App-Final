# Slice 07 – Produktiver transaktionaler Persistenzpfad

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Produktiver transaktionaler Persistenzpfad

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `app/shared/persistence-facade.js`, `app/simulator/stress-replay-persistence.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-07-produktiver-transaktionaler-persistenzpfad.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/persistence.test.mjs`, `tests/stress-replay-persistence.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

Branchcheck auf `codex/stress-pfad-replay` war erfolgreich. Vor Umsetzung waren
nur die vom Orchestrator angelegten bzw. projizierten Slice-/Auditdokumente im
Arbeitsbaum geändert. Das Diff-Risiko bleibt auf die zwei freigegebenen
produktiven Persistenzmodule und die beiden fokussierten Testdateien begrenzt.

## Geplante Tests

Gemäß Arbeitsplan und Orchestrator-Validierungsmatrix.

## Durchgeführte Änderungen

- Der Stress-Replay-Defaultpfad wird ohne injiziertes Backend gegen einen über
  die vorhandene Test-Facade kontrollierten Adapter ausgeführt.
- Save, idempotentes Save, Replace und Discard werden per Backend-Readback
  belegt; ein Fremdkey-Sentinel bleibt unverändert.
- Transaktionale Fehler transportieren neben dem stabilen Stress-Replay-Code
  auch den Facade-Code, `rollbackFailed` und gegebenenfalls die
  Rollback-Ursache. Readback-Mismatches tragen einen stabilen internen Code.
- Write-, Readback- und Rollbackfehler sowie Wiederholung nach bestätigtem
  Rollback sind durch Fault-Injection abgedeckt. Der globale Facade-Zustand
  wird im `finally` zurückgesetzt.

## Ausgeführte Validierung mit Ergebnis

Fokussierte Entwicklerläufe:

- `node tests/run-single.mjs tests/stress-replay-persistence.test.mjs`:
  erfolgreich, 56/56 Assertions.
- `node tests/run-single.mjs tests/persistence.test.mjs`: erfolgreich,
  324/324 Assertions.
- `git diff --check`: erfolgreich.

Die autoritative Validierungsmatrix wird ausschließlich durch den
Orchestrator ausgeführt und attestiert.

## Abweichungen vom Plan

Keine.

## Offene Risiken

Die autoritative Gesamtvalidierung und das externe Review stehen aus. Ein
fehlgeschlagener Rollback bleibt absichtlich als Recovery-Fall sichtbar und
wird nicht als wiederhergestellter Zustand ausgegeben.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-1ea6ef556ff8`
- Testdateien: `tests/persistence.test.mjs`, `tests/stress-replay-persistence.test.mjs`
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-1ea6ef556ff8`
- Testdateien: `tests/persistence.test.mjs`, `tests/stress-replay-persistence.test.mjs`
- Prüfdimensionen: Transactional atomicity in replaceRecordsTransactional, readback verification across backend and cache, compensating rollback error categorization, sentinel key isolation, and test lifecycle cleanup
- Größtes Restrisiko: Non-standard storage adapters throwing primitive non-Error exceptions during rollback leading to null rollbackCause in diagnostic details
- Realistische Bruchbedingung: A custom storage adapter throws a raw string on saveBatch failure during rollback, causing rollbackError.message to be undefined and rollbackCause to become null in failure metadata
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-1ea6ef556ff8`

- Diff-Fingerprint: `1ea6ef556ff8f86606628015f6a5d845c9868613f014733cf96c5f90f2df0fc6`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `0ed48b4f31ccc0652dea8bdea0f85e9fae4ce26ed885c69caef4c44d29230896`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[182976 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure cause is a maintainer refactoring the rollback-readback check in persistence-facade.js (e.g. changing comparison order or exception wrapping) and inadvertently causing &#96;persistence_rollback_readback_mismatch&#96; failures to be mis-tagged as generic &#96;persistence_transaction_rollback_failed&#96; (or vice versa) — since no test asserts the exact code for that specific branch, the regression would only surface later as a diagnostics-quality complaint from an operator trying to distinguish "rollback write failed" from "rollback write succeeded but state diverged" during an incident, not as a functional test failure.
  - Ereignis 3: In three months, the most likely failure cause is an integration layer or custom storage driver throwing non-standard error structures (such as string rejections or plain objects without a .message property) during compensating rollback, resulting in rollbackCause resolving to null in structured failure telemetry while rollbackFailed is true, mildly degrading operator observability during backend contention incidents.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The newly introduced &#96;persistence_rollback_readback_mismatch&#96; code path in &#96;createRestoreError&#96;/&#96;replaceRecordsTransactional&#96; (persistence-facade.js) — reached when a rollback's compensating write resolves without throwing but the post-rollback backend/cache readback still disagrees with the pre-transaction snapshot (e.g. a concurrent writer or an eventually-consistent backend) — is not exercised by any test added in this slice. &#96;createFacadeAdapter&#96; in tests/stress-replay-persistence.test.mjs only supports fault modes that either throw (&#96;write_once&#96;, &#96;write_and_rollback&#96;) or silently no-op the write (&#96;readback_mismatch&#96;); it has no mode that lets the rollback write "succeed" while leaving the store in a state that still fails the post-rollback verification, so &#96;rollbackCode==='persistence_rollback_readback_mismatch'&#96; is never asserted. This is a diagnostics-only gap (the outer throw/rollback-attempted behavior itself is unchanged and covered), but a future refactor could silently mis-tag this specific failure mode without any test catching the regression.
- Akzeptanztest: Add a fault-injection mode to the stress-replay-persistence test facade adapter (or a dedicated persistence.test.mjs case) where the compensating rollback &#96;saveBatch&#96; resolves normally but a subsequent readback returns a value diverging from the pre-transaction snapshot, then assert &#96;error.rollbackCode === 'persistence_rollback_readback_mismatch'&#96; and &#96;error.code === 'rollback_failed'&#96;.
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The newly introduced &#96;persistence_rollback_readback_mismatch&#96; code path in &#96;createRestoreError&#96;/&#96;replaceRecordsTransactional&#96; (persistence-facade.js) — reached when a rollback's compensating write resolves without throwing but the post-rollback backend/cache readback still disagrees with the pre-transaction snapshot (e.g. a concurrent writer or an eventually-consistent backend) — is not exercised by any test added in this slice. &#96;createFacadeAdapter&#96; in tests/stress-replay-persistence.test.mjs only supports fault modes that either throw (&#96;write_once&#96;, &#96;write_and_rollback&#96;) or silently no-op the write (&#96;readback_mismatch&#96;); it has no mode that lets the rollback write "succeed" while leaving the store in a state that still fails the post-rollback verification, so &#96;rollbackCode==='persistence_rollback_readback_mismatch'&#96; is never asserted. This is a diagnostics-only gap (the outer throw/rollback-attempted behavior itself is unchanged and covered), but a future refactor could silently mis-tag this specific failure mode without any test catching the regression. | OBSERVATION | offen | offen |
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
