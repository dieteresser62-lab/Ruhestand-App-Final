# Slice 06 – Runner-Capture-Paritaet im echten Stressverkauf

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Runner-Capture-Paritaet im echten Stressverkauf

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `app/simulator/simulator-engine-direct.js`, `app/simulator/stress-replay-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-echten-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-stressverkauf.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-transactions.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

Branch `codex/stress-pfad-replay` wurde vor der Umsetzung bestätigt. Im
Arbeitsbaum lagen nur die vom Orchestrator angelegte Slice-Datei und dessen
verwalteter Auditbericht. Produktives Diff-Risiko: Der neue Runner-Schalter
muss standardmäßig aktiv bleiben, damit der bestehende Replay-Pfad unverändert
Transaktionen erfasst; Capture-off dient dem expliziten Paritätsnachweis.

## Geplante Tests

Gemäß Arbeitsplan und Orchestrator-Validierungsmatrix.

## Durchgeführte Änderungen

- `runStressReplayPathV1` akzeptiert einen standardmäßig aktivierten
  `captureTransactions`-Schalter und reicht dessen booleschen Zustand an den
  bestehenden Engine-Capture-Input weiter.
- Ein echter Runner-Test führt denselben materialisierten 40-Prozent-Crash mit
  bytegleichem Startzustand Capture-off, Capture-on und wiederholt Capture-on
  aus. Der Pfad erzwingt sowohl Forced Sale als auch Payout-Fallback.
- Der Test vergleicht Finanzresultate, Jahresresultate, ScenarioLog,
  Reconciliation und Identitätsfingerprints exakt und entfernt beim
  Rohresultat nur die zwei erlaubten additiven Flächen.

## Ausgeführte Validierung mit Ergebnis

- `node tests/run-single.mjs tests/stress-replay-runner.test.mjs`: PASS,
  55/55 Assertions.
- `node tests/run-single.mjs tests/stress-replay-transactions.test.mjs`: PASS,
  46/46 Assertions.
- Die authoritative Gesamtmatrix und deren verwalteter Auditblock bleiben
  beim Orchestrator.

## Abweichungen vom Plan

Die im freigegebenen Arbeitsplan genannte kürzere Slice-Datei wurde vom
Orchestrator nicht angelegt; dokumentiert wird deshalb ausschließlich in der
erzeugten kanonischen Slice-Datei mit `...im-echten-stressverkauf.md`.

## Offene Risiken

Der Paritätstest fixiert die Position der zusätzlichen Fallback-Trace-Zeile.
Eine beabsichtigte Erweiterung früherer Trace-Phasen muss diesen Vertrag
sichtbar anpassen. Formale Findings und Freigaben bleiben Reviewer-Aufgabe.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-af5da6215f95`
- Testdateien: `tests/stress-replay-runner.test.mjs`
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-af5da6215f95`
- Testdateien: `tests/stress-replay-runner.test.mjs`
- Prüfdimensionen: Implementation correctness of &#96;captureTransactions&#96; flag propagation to engine inputs; backward-compatible default behavior (&#96;captureTransactions = true&#96;); strict diagnostic isolation ensuring zero financial KPI / summary / yearly result divergence between capture-on and capture-off runs; trace phase purity ensuring only the additive &#96;after_payout_fallback&#96; entry is appended without mutating surrounding trace ordering; input immutability of &#96;crashPath&#96; and &#96;crashInputs&#96;; byte-level replay determinism across repeated runs
- Größtes Restrisiko: Downstream callers or external integration scripts passing truthy non-boolean values (such as &#96;"true"&#96; or &#96;1&#96; parsed from query parameters or CLI arguments) directly into &#96;runStressReplayPathV1({ captureTransactions })&#96;, where strict &#96;=== true&#96; comparison silently disables transaction capture without throwing an error
- Realistische Bruchbedingung: A CLI command or UI URL parameter parser forwards uncoerced string &#96;"true"&#96; to &#96;runStressReplayPathV1&#96;, causing transaction capture to be disabled and resulting in empty transaction arrays despite active forced sales occurring during simulation
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-af5da6215f95`

- Diff-Fingerprint: `af5da6215f95dee08884ea854043c20895c71738688d041cb70edabcea36f0a3`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `ecc4f56d433dfddd22947b7ab047ac2ebc13fffd591942dc2654c2fd60c12e71`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[182833 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure cause is a future maintainer wiring &#96;captureTransactions&#96; from an external boolean-like source (e.g. a UI checkbox value, a JSON config flag serialized as &#96;"true"&#96;/&#96;1&#96;) without knowing the strict &#96;=== true&#96; requirement, causing transaction diagnostics to silently vanish from a replay run with no error — a quiet capability regression rather than a crash, only caught if someone later notices missing diagnostics in output review.
  - Ereignis 3: In three months, the most likely failure cause is an integration layer or batch test script passing a non-boolean truthy config value (e.g. from JSON or CLI options) to &#96;runStressReplayPathV1({ captureTransactions })&#96;, leading to silent deactivation of transaction diagnostics and false negatives in transaction audit reporting while core financial simulation metrics remain fully green.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The new &#96;captureTransactions&#96; parameter is compared with strict &#96;=== true&#96;, so any future caller passing a truthy-but-non-boolean value (e.g. &#96;1&#96;, &#96;"true"&#96;) silently disables transaction capture instead of erroring or coercing — no test exercises this non-boolean-truthy path today.
- Akzeptanztest: Add a unit test in tests/stress-replay-runner.test.mjs asserting that &#96;runStressReplayPathV1({..., captureTransactions: 1, ...})&#96; yields &#96;transactions.length === 0&#96;, so the strict-boolean contract is explicit and regression-proof rather than incidental.
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The new &#96;captureTransactions&#96; parameter is compared with strict &#96;=== true&#96;, so any future caller passing a truthy-but-non-boolean value (e.g. &#96;1&#96;, &#96;"true"&#96;) silently disables transaction capture instead of erroring or coercing — no test exercises this non-boolean-truthy path today. | OBSERVATION | offen | offen |
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
