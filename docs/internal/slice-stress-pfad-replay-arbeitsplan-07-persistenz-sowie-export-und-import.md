# Slice 07 – Persistenz sowie Export und Import

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Persistenz sowie Export und Import

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `app/shared/persistence-key-policy.js`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-persistence.js`, `docs/internal/slice-stress-pfad-replay-arbeitsplan-07-persistenz-sowie-export-und-import.md`, `docs/internal/slice-stress-replay-implement-07-persistenz-sowie-export-und-import.md`, `docs/internal/stress-replay-implement-review-fa2904b2.md`, `tests/persistence.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

- Branch vor Umsetzung geprüft: `codex/stress-pfad-replay` (entspricht dem Zielbranch).
- Vorbestehende Änderungen: ausschließlich orchestratorverwaltete Audit-/Slice-Dateien; deren verwaltete Auditblöcke wurden nicht editiert.
- Produktive Änderungseinheiten dieses Slice: vier; damit bleibt der Slice unter dem Stop-Limit von zehn.
- Hauptrisiken: unbestätigtes Ersetzen eines aktiven Pfads, Ausführung bei Daten-/Engine-Mismatch, unvollständiger Rollback und versehentliche Aufnahme des Replay-Envelopes in Snapshots.

## Geplante Tests

Gemäß Arbeitsplan und Orchestrator-Validierungsmatrix.

## Durchgeführte Änderungen

- `StressReplayWorkspaceV1` mit Pfad-, Baseline-, Varianten-, Reihenfolge-, Zeit- und Fingerprint-Reconciliation ergänzt.
- Einzelnen aktiven Arbeitsstand unter `sim.stressReplay.active.v1` über die Persistenz-Fassade beziehungsweise einen injizierbaren Backend-Vertrag implementiert.
- Ersetzen und Verwerfen an explizite Bestätigung gebunden; korrupte Daten bleiben bis dahin unverändert erhalten.
- Fehlende oder abweichende Daten-/Enginefingerprints führen fail-closed zu `read_only` statt zu exakter Ausführbarkeit.
- `StressReplayComparisonExportV1` mit striktem JSON-/Versions-/Fingerprint-/Privacy-Vertrag sowie Importinspektion ergänzt.
- Replay-Schlüssel aus Snapshot-Capture und Snapshot-Restore ausgeschlossen, im vollständigen Backupvertrag jedoch belassen.

## Ausgeführte Validierung mit Ergebnis

- Gezielte Implementer-Selbstprüfung erfolgreich:
  - `node tests/run-single.mjs tests/stress-replay-export.test.mjs` (13 Assertions),
  - `node tests/run-single.mjs tests/stress-replay-persistence.test.mjs` (28 Assertions),
  - `node tests/run-single.mjs tests/persistence.test.mjs` (319 Assertions),
  - angrenzende Regressionstests für Contract, Varianten, Vergleich und Snapshot-Key-Policy (144 Assertions).
- Die verbindliche Validierungsattestierung wird gemäß Orchestratorvertrag separat projiziert.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Die UI-Anbindung und das konsequente Weiterreichen der aktuellen Daten-/Enginefingerprints folgen erst in Slice 08; ohne diese Nachweise klassifiziert die Persistenzschicht den Arbeitsstand absichtlich als nur-lesbar.
- Finale Freigabe und vollständige Validierung liegen beim Orchestrator und den Reviewern, nicht bei Codex.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-c6a5eb7a405e`
- Testdateien: `tests/persistence.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`
- Eigene Findings: `C-02`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-c6a5eb7a405e`
- Testdateien: `tests/persistence.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`
- Prüfdimensionen: correctness (StressReplayWorkspaceV1 contract, schema versions, UTC timestamps, path &amp; baseline fingerprint validation, variant order and role verification, StressReplayComparisonExportV1 export/import serialization), security &amp; privacy boundaries (regex screening for credentials/tokens/secrets and absolute/UNC/drive filesystem paths, circular reference defense, deepFreeze immutability, snapshot exclusion policy in persistence-key-policy), failure paths &amp; corruption (fail-closed read-only status on missing or mismatched engine/data fingerprints, non-destructive graceful handling of corrupt storage items, confirmation barriers for replace and discard operations), idempotency (fingerprint-checked no-op writes on unchanged workspace saves, transactional rollback handling)
- Größtes Restrisiko: Residual risk is that downstream UI lifecycle integration in Slice 08 fails to pass the live runtime engine and data fingerprints during workspace load or comparison execution, causing valid persisted replays to be permanently classified as read_only or causing unexpected modal confirmations if replace actions are triggered without user-visible confirmation prompts
- Realistische Bruchbedingung: In Slice 08, a user modifies a variant parameter in the UI and clicks save/re-evaluate without passing updated runtime data/engine fingerprints to loadStressReplayWorkspaceV1 / inspectStressReplayWorkspaceV1, which triggers a mismatchReason 'current_data_fingerprint_unavailable' and renders the entire workspace in read_only mode, preventing the user from running the comparison until the page is fully reloaded.
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-c6a5eb7a405e`

- Diff-Fingerprint: `c6a5eb7a405e31d9b43d4c4e1e3de056491c3828b5622a892ac571831dd0fb37`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `5d4b65294786677e13507a2a37e6ee49f88c6355589fa46b0df84fc3e6a3b4cc`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 177 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[180381 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure is that C-02 materializes — Slice 08 wires the UI to the default (no-override) &#96;saveStressReplayWorkspaceV1&#96;/&#96;discardStressReplayWorkspaceV1&#96; path, a real IndexedDB flush intermittently fails mid-transaction in the browser, and the untested &#96;replaceRecordsTransactional&#96; rollback contract (specifically whether &#96;cause.code === 'rollback_failed'&#96; is set correctly and whether the underlying facade truly restores the previous bytes) behaves differently than the manually-mocked non-transactional rollback this slice's tests validated, leaving the active stress-replay workspace either silently corrupted or duplicated across storage layers without a regression test having ever exercised that branch.
  - Ereignis 3: In three months, the most likely issue is that during a future migration or backup restore, a third-party tool or browser extension injects unexpected technical metadata keys into localStorage alongside sim.stressReplay.active.v1, or a future schema update adds optional fields to the export format that fail the strict allowedKeys whitelist in validateStressReplayWorkspaceV1 / validateStressReplayComparisonExportV1, causing previously valid exported replay files to fail import inspection with STRESS_REPLAY_CONTRACT_INVALID rather than migrating gracefully.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-02` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The transactional/production default-backend branch of &#96;saveStressReplayWorkspaceV1&#96;/&#96;discardStressReplayWorkspaceV1&#96; (the &#96;replaceRecordsTransactional&#96; path taken when no &#96;backend&#96; override is supplied) is never exercised by &#96;tests/stress-replay-persistence.test.mjs&#96;; all tests inject a custom in-memory &#96;backend.storage&#96;/&#96;backend.flush&#96;, forcing the non-transactional manual-rollback branch instead, leaving the real atomic write/rollback contract with &#96;persistence-facade.js&#96; unverified.
- Akzeptanztest: Add a persistence test that omits &#96;backend&#96; (or only overrides &#96;persistenceStorage&#96;/&#96;flush&#96; indirectly via a stub of &#96;replaceRecordsTransactional&#96;) to drive &#96;saveStressReplayWorkspaceV1&#96;/&#96;discardStressReplayWorkspaceV1&#96; through the &#96;transactionalReplace&#96; branch, asserting a successful replace, a successful discard, and that a simulated &#96;replaceRecordsTransactional&#96; rejection with &#96;cause.code === 'rollback_failed'&#96; surfaces &#96;STRESS_REPLAY_PERSISTENCE_WRITE_FAILED&#96; with &#96;rollbackFailed: true&#96;. VALIDATE: ["node","tests/run-single.mjs","tests/stress-replay-persistence.test.mjs"]
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-02 | claude | The transactional/production default-backend branch of &#96;saveStressReplayWorkspaceV1&#96;/&#96;discardStressReplayWorkspaceV1&#96; (the &#96;replaceRecordsTransactional&#96; path taken when no &#96;backend&#96; override is supplied) is never exercised by &#96;tests/stress-replay-persistence.test.mjs&#96;; all tests inject a custom in-memory &#96;backend.storage&#96;/&#96;backend.flush&#96;, forcing the non-transactional manual-rollback branch instead, leaving the real atomic write/rollback contract with &#96;persistence-facade.js&#96; unverified. | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

## Rückdokumentation in die Arbeitsplan-MD

Arbeitsplan: `docs/internal/STRESS_PFAD_REPLAY_ARBEITSPLAN.md`; Statusprojektion erfolgt durch den Orchestrator.

## Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
