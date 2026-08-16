# Slice 08 – Busy- und Parallelitaetsvertrag der UI

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Busy- und Parallelitaetsvertrag der UI

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `app/simulator/stress-replay-ui.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-08-busy-und-parallelitaetsvertrag-der-ui.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/browser-smoke.test.mjs`, `tests/stress-replay-ui.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

- Branch vor Umsetzung geprüft: `codex/stress-pfad-replay`.
- Ausgangsdiff bestand ausschließlich aus dem vom Orchestrator verwalteten
  Auditbericht und dieser neu angelegten Slice-Datei.
- Diff-Risiko: mittel. Der zentrale UI-Zustand wirkt auf synchrone und
  asynchrone Aktionen; ein fehlendes `finally` oder ein interner Wiedereintritt
  könnte die Oberfläche dauerhaft sperren oder einen Vergleich auslassen.

## Geplante Tests

Gemäß Arbeitsplan und Orchestrator-Validierungsmatrix.

## Durchgeführte Änderungen

- Eine zentrale Reentrancy-Sperre serialisiert Fixieren, Export, Import,
  Verwerfen sowie Add/Remove/Recompute ohne nachgelagertes Queueing.
- Import und Verwerfen setzen Busy vor dem Persistenzaufruf und lösen Busy in
  `finally`; auch die asynchrone Dateilesung des Import-Handlers ist umfasst.
- Buttons, Import-Dateiauswahl, Varianten-Fieldset, Add-Aktion und dynamisch
  gerenderte Variantenaktionen erhalten konsistente Busy-Zustände einschließlich
  `aria-busy` am Workspace.
- Interne Neuberechnungen verwenden einen nicht-reentranten Hilfspfad, während
  öffentliche und ereignisgesteuerte Recompute-Aufrufe die zentrale Sperre
  respektieren.
- Deferred-Promise-Tests decken Import-vs.-Discard, Discard-vs.-Fixieren,
  Import-vs.-Variante, schnelle doppelte Discards und abgewiesene Import- sowie
  Discard-Promises ab.

## Ausgeführte Validierung mit Ergebnis

- Fokussiert lokal: `node tests/run-single.mjs tests/stress-replay-ui.test.mjs`
  mit 69/69 bestandenen Assertions.
- Lokal versucht: `npm run test:browser`; Start nicht möglich, weil das
  Playwright-Chromium-Binary in der Agentenumgebung nicht installiert ist.
- Das autoritative Browser- und Gesamt-Gate wird durch den Orchestrator
  ausgeführt und attestiert.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Das echte Browser-Gate muss weiterhin bestätigen, dass native
  Disabled-Semantik und dynamisches Re-Rendering im vollständigen Simulator-DOM
  mit dem Unit-Harness übereinstimmen.
- Eigene Implementierung nicht freigegeben; Review und Freigabe verbleiben bei
  Claude, Antigravity und Orchestrator.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-54178bdc5481`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/stress-replay-ui.test.mjs`
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-54178bdc5481`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/stress-replay-ui.test.mjs`
- Prüfdimensionen: UI concurrency and reentrancy serialization (single busy contract via beginBusyAction/finishBusyAction covering fixation, export, import, discard, add/remove variant, and comparison recompute), deferred Promise lifecycle and error resilience (unconditional cleanup in finally blocks on rejected promises and thrown exceptions), DOM and ARIA synchronization (aria-busy on workspace container, native disabled properties on buttons/fieldsets/file inputs), non-reentrant internal computeComparison vs public recomputeComparison separation, event listener guards across click, input, and file change handlers
- Größtes Restrisiko: Native browser file picker cancellation or custom user agent file dialog events firing in unexpected sequence before change event resolution, potentially dropping subsequent identical file selections if value reset is bypassed
- Realistische Bruchbedingung: An unhandled exception during native file input dispatch before the change handler begins, leaving the file input in an untracked state without activating or releasing the busy cycle &#124;
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-54178bdc5481`

- Diff-Fingerprint: `54178bdc5481f34827fa5ca192510fed0f18f8465e2cbeaca5783696fed6fb9e`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `b581f33012c08c3217c32ed24b279d279196cfef9ad159d3260a8aabe38b43bf`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[183226 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure cause is a support ticket where a user runs a new Monte-Carlo simulation immediately after triggering an import/discard on the stress-replay panel; the second run's context is silently dropped, and the user's subsequent "Fix" action on a scenario from the new run replays against stale inputs, producing an opaque &#96;STRESS_REPLAY_SOURCE_UNSUPPORTED&#96;-style or fingerprint-mismatch error that looks like a bug in the fixation logic rather than the actual root cause (a dropped context update with no user-visible signal).
  - Ereignis 3: In three months, the most likely failure cause is an external long-running async operation (such as an extended background Monte-Carlo calculation or large file read) finishing while a user triggers a rapid sequence of discard and re-import actions, where context updates dropped during the busy window lead to stale parameter references if future maintainers add new asynchronous UI workflows without routing them through the centralized beginBusyAction/finishBusyAction lifecycle.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: &#96;setMonteCarloContext&#96; now silently no-ops (&#96;if (busy) return;&#96;) instead of queueing when a stress-replay busy action (import/discard/fix/etc.) is in flight. If a Monte-Carlo run completes and calls &#96;setMonteCarloContext&#96; while the stress-replay UI is mid-async-action, the new inputs/scenarioLogs are dropped permanently — &#96;runContext&#96; stays bound to the previous run with no retry, no status message, and no visual indicator that the context is stale. A subsequent &#96;selectScenario&#96; (once busy clears) can then reference a scenario from the newer run while &#96;fixSelectedScenario&#96; replays against the stale &#96;runContext.inputs&#96;, risking a source-identity/fingerprint mismatch surfaced as a confusing recomputation error rather than a clear "run context outdated, please retry" message. No test in this slice (or elsewhere in the packet) exercises &#96;setMonteCarloContext&#96; invoked while &#96;busy === true&#96;.
- Akzeptanztest: Add a unit test in tests/stress-replay-ui.test.mjs that starts a deferred discard/import action, calls &#96;controller.setMonteCarloContext({...newInputs})&#96; while busy is true, resolves the pending action, and asserts either that the context update is applied once busy clears (queued) or that the fixation button/status explicitly communicates a stale/rejected context — whichever behavior is intended.
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | &#96;setMonteCarloContext&#96; now silently no-ops (&#96;if (busy) return;&#96;) instead of queueing when a stress-replay busy action (import/discard/fix/etc.) is in flight. If a Monte-Carlo run completes and calls &#96;setMonteCarloContext&#96; while the stress-replay UI is mid-async-action, the new inputs/scenarioLogs are dropped permanently — &#96;runContext&#96; stays bound to the previous run with no retry, no status message, and no visual indicator that the context is stale. A subsequent &#96;selectScenario&#96; (once busy clears) can then reference a scenario from the newer run while &#96;fixSelectedScenario&#96; replays against the stale &#96;runContext.inputs&#96;, risking a source-identity/fingerprint mismatch surfaced as a confusing recomputation error rather than a clear "run context outdated, please retry" message. No test in this slice (or elsewhere in the packet) exercises &#96;setMonteCarloContext&#96; invoked while &#96;busy === true&#96;. | OBSERVATION | offen | offen |
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
