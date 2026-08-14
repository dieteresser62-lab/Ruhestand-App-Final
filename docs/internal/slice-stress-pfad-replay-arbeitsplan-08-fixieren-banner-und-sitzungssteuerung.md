# Slice 08 – Fixieren, Banner und Sitzungssteuerung

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Fixieren, Banner und Sitzungssteuerung

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `Simulator.html`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-main-init.js`, `app/simulator/simulator-main.js`, `app/simulator/simulator-results.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/slice-stress-pfad-replay-arbeitsplan-08-fixieren-banner-und-sitzungssteuerung.md`, `docs/internal/slice-stress-replay-implement-08-fixieren-banner-und-sitzungssteuerung.md`, `docs/internal/stress-replay-implement-review-fa2904b2.md`, `tests/browser-smoke.test.mjs`, `tests/stress-replay-ui.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

- Branch vor Umsetzung: `codex/stress-pfad-replay` (entspricht Zielbranch).
- Vorbestehende Arbeitsbaumabweichung: ausschließlich orchestratorverwaltetes
  Auditdokument `docs/internal/stress-replay-implement-review-fa2904b2.md` und
  dieses vom Orchestrator angelegte Slice-Dokument; beide wurden nicht als
  Produktcode behandelt.
- Produktive Änderungseinheiten: vier von maximal sechs (`Simulator.html`,
  `simulator-main-init.js`, `simulator-results.js`, `stress-replay-ui.js`).
- Diff-Risiko: mittel. Der Slice bindet bestehende Capture-, Runner-,
  Persistenz- und Exportcontracts an den DOM, verändert aber weder Engine-
  Semantik noch Profil-/Tranchenpersistenz.

## Geplante Tests

Gemäß Arbeitsplan und Orchestrator-Validierungsmatrix.

## Durchgeführte Änderungen

- Testbarer Sitzungscontroller für Auswahl, Fixierung, Baseline-Reconciliation,
  Reload, Nur-Lesen-Anzeige, Export, Import und explizites Verwerfen ergänzt.
- Monte-Carlo-Szenarioauswahl transportiert die bestehende Source-Identity an
  den Replaycontroller; `legacy-stream` bleibt sichtbar gesperrt.
- Dauerhaft sichtbarer Replaybereich mit Live-Region, Fokusziel und Banner für
  Quelle, Horizont, Terminalstatus, Fortsetzung sowie Pfad- und
  Baseline-Fingerprint ergänzt.
- Initialisierung in den vorhandenen Simulatorstart eingebunden. Eingaben
  werden für die Baseline ausschließlich geklont; Profil- und Tranchenwerte
  werden nicht geschrieben.
- Fokussierte Unit- und Browser-Smoke-Assertions für Sitzungs- und
  Zugänglichkeitsgrenzen ergänzt.

## Ausgeführte Validierung mit Ergebnis

- Fokussiert durch Codex: `node tests/run-single.mjs
  tests/stress-replay-ui.test.mjs` – 34/34 Assertions bestanden.
- Statische Prüfungen: `node --check` für die geänderten JS-Module,
  `git diff --check` und Eindeutigkeit der neuen DOM-IDs – ohne Befund.
- Die verbindliche Validierungsattestierung und Browserausführung übernimmt
  ausschließlich der Orchestrator.

## Abweichungen vom Plan

Keine fachliche Abweichung. `app/simulator/monte-carlo-ui.js` und
`app/simulator/simulator-main.js` benötigten keine Änderung; die Integration
erfolgt über die vorhandenen Exportfunktionen und `simulator-main-init.js`.

## Offene Risiken

- Browser-Smoke und orchestratorseitige Gesamtvalidierung stehen noch aus.
- Varianteneditor und Vergleichsdarstellung sind planmäßig erst Gegenstand von
  Slice 09.
- Externes Review und Freigabe bleiben ausstehend; Codex erteilt keine
  Eigenfreigabe.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-389eb8fdb571`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/stress-replay-ui.test.mjs`
- Prüfdimensionen: checked selection/RNG-gate invariants, error-path non-mutation of workspaceState, replace-confirmation fail-closed behavior, baseline input immutability, focus/live-region accessibility wiring, and scope/allowlist conformance of the diff
- Größtes Restrisiko: Largest residual risk is the button-state race above plus an unverified assumption (not resolvable from this packet alone) that &#96;readMonteCarloParameters(inputs)&#96; called at result-display time reflects the exact parameters that produced the already-computed &#96;scenarioLogs&#96; rather than any live DOM edits made while a long-running MC batch was in flight; a mismatch there would at worst surface as a safe &#96;STRESS_REPLAY_BASELINE_RECONCILIATION_FAILED&#96; (fails closed, no silent corruption)
- Realistische Bruchbedingung: Break condition: a user double-clicks or rapidly alternates Fix/Import/Discard/Export during an in-flight persistence call, producing two concurrent writes to the same &#96;sim.stressReplay.active.v1&#96; record with no ordering guarantee, or the storage backend genuinely takes multi-second latency (real IndexedDB) making the race practically reachable rather than theoretical.
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-389eb8fdb571`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/stress-replay-ui.test.mjs`
- Prüfdimensionen: UI lifecycle and session state transitions (empty/executable/read_only/corrupt), deterministic single-run capture and baseline reconciliation gating, strict rejection of legacy RNG streams, deep-clone isolation of baseline inputs, import/export download wiring, replace and discard confirmation fail-closed semantics, accessible live regions and focus management, and strict slice path allowlist conformance
- Größtes Restrisiko: Largest residual risk is the missing busy lock during asynchronous import and discard operations (as identified in C-01) where rapid repeated user interactions during delayed persistence I/O could trigger concurrent uncoordinated operations against the active workspace key
- Realistische Bruchbedingung: Break condition: A user with a slow storage backend or rapid clicking clicks "Stresspfad importieren" and immediately clicks "Stresspfad verwerfen" or "Fixieren" before the initial asynchronous replace/discard promise resolves, causing racing persistence writes without synchronization.
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-389eb8fdb571`

- Diff-Fingerprint: `389eb8fdb5713fd56652e5b94d882ec8dd61f0f3157ca8e5861fe95ac22ee04c`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `4316b98e18312e66c577ba58a992e8822706a8c870a524b65ef2ed897ccde561`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 178 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[181171 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure is a support report of a "disappeared" or "corrupted" stress-replay workspace after a user clicked Import then immediately clicked Discard (or vice versa) before the first operation's persistence write completed — the unguarded concurrent write path in C-01 fires, and because no regression test ever drove that interleaving, the resulting inconsistent state (or a thrown-but-unhandled rejection from a second overlapping &#96;saveStressReplayWorkspaceV1&#96; call) ships undetected through this slice's otherwise-passing matrix.
  - Ereignis 3: In three months, the most likely issue is a user report of inconsistent workspace state resulting from rapid alternating clicks on Import and Discard during high-latency storage I/O, hitting the unshielded concurrent async path before the initial persistence write completes.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: &#96;fixSelectedScenario()&#96; wraps its capture/materialize/reconcile/save flow in &#96;setBusy(true/false)&#96;, which disables all four session buttons (fix/export/import/discard) for its duration. However, &#96;importSerialized()&#96; and &#96;discardActiveWorkspace()&#96; never call &#96;setBusy&#96;: after the synchronous &#96;window.confirm&#96; gate, &#96;await replaceFromImport(...)&#96; / &#96;await discardWorkspace(...)&#96; run with every button still enabled. A user who clicks e.g. "Fixieren" or "Stresspfad exportieren" while an import or discard is still in flight can trigger a second concurrent &#96;saveWorkspace&#96;/&#96;discardWorkspace&#96;/&#96;exportActiveWorkspace&#96; call racing the same persisted workspace key; no test exercises this interleaving (all six tests in tests/stress-replay-ui.test.mjs drive the controller strictly sequentially with immediately-resolving mocks).
- Akzeptanztest: Add a stress-replay-ui.test.mjs case where &#96;discardWorkspace&#96;/&#96;replaceFromImport&#96; are backed by a manually-controlled deferred promise; assert that stressReplayFixButton/Export/Discard/Import remain disabled for the duration of an in-flight import or discard, and that only one save/discard call is ever issued if a second action is triggered before the first resolves. VALIDATE: ["node","tests/run-single.mjs","tests/stress-replay-ui.test.mjs"]
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | &#96;fixSelectedScenario()&#96; wraps its capture/materialize/reconcile/save flow in &#96;setBusy(true/false)&#96;, which disables all four session buttons (fix/export/import/discard) for its duration. However, &#96;importSerialized()&#96; and &#96;discardActiveWorkspace()&#96; never call &#96;setBusy&#96;: after the synchronous &#96;window.confirm&#96; gate, &#96;await replaceFromImport(...)&#96; / &#96;await discardWorkspace(...)&#96; run with every button still enabled. A user who clicks e.g. "Fixieren" or "Stresspfad exportieren" while an import or discard is still in flight can trigger a second concurrent &#96;saveWorkspace&#96;/&#96;discardWorkspace&#96;/&#96;exportActiveWorkspace&#96; call racing the same persisted workspace key; no test exercises this interleaving (all six tests in tests/stress-replay-ui.test.mjs drive the controller strictly sequentially with immediately-resolving mocks). | OBSERVATION | offen | offen |
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
