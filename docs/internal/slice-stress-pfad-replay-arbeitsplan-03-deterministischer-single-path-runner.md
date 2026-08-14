# Slice 03 – Deterministischer Single-Path-Runner

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Deterministischer Single-Path-Runner

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `app/simulator/mc-log-builder.js`,
`app/simulator/monte-carlo-runner.js`,
`app/simulator/stress-replay-contract.js`,
`app/simulator/stress-replay-runner.js`,
`docs/internal/slice-stress-pfad-replay-arbeitsplan-03-deterministischer-single-path-runner.md`,
`docs/internal/slice-stress-replay-implement-03-deterministischer-single-path-runner.md`,
`docs/internal/stress-replay-implement-review-fa2904b2.md`,
`tests/stress-replay-runner.test.mjs`, `tests/worker-parity.test.mjs`.
Die beiden zusaetzlichen Pfade sind die vom Orchestrator freigegebene
automatische Slice-02-Remediation fuer den kanonischen Terminalstatus.

## Diff-Risiko inklusive Branch- und Statuscheck

- Branchcheck: `codex/stress-pfad-replay` entspricht dem persistierten Zielbranch.
- Vorhandene Aenderungen betrafen nur orchestratorverwaltete Auditdateien; im
  produktiven Slice-Scope lagen keine fremden Aenderungen vor.
- Produktives Diff-Risiko: vier produktive Pfade, damit unterhalb der
  Zehn-Dateien-Stopregel; keine Engine-, Worker- oder UI-Semantik im Scope.

## Geplante Tests

Gemäß Arbeitsplan und Orchestrator-Validierungsmatrix.

## Durchgeführte Änderungen

- DOM-, Worker-, Sampling- und RNG-freier Single-Path-Runner mit
  materialisiertem Marktstartzustand und bestehender Jahres-API.
- Fail-closed Baseline-Reconciliation mit Cent-/Ratiotoleranzen sowie
  getrennten Terminalzustaenden fuer Ruin, Tod, Horizont und Technikfehler.
- Versionierter Ergebniscontract mit kanonischen Pfad-, Baseline-, Varianten-
  und Ergebnisfingerprints.
- Additive Replay-Projektion in die bestehenden Monte-Carlo-Logbuilder und
  `ScenarioLogExportV2`.
- Freigegebene Slice-02-Remediation: Der Capture projiziert interne numerische
  MC-Outcome-Codes fail-closed auf die kanonischen Pfadstatus `ruin`,
  `all_dead` und `horizon_exhausted`; normale MC-Buffer bleiben unveraendert.
- Paritaetstest deckt die kanonischen Capture-Terminalstatus fuer ueberlebende
  und ruinierte Pfade ab.
- Regressionstest injiziert einen Engine-Fehler in den zur Erfassung
  ausgewaehlten Lauf und belegt, dass der technische Pfad ohne Capture endet,
  waehrend ein Geschwisterlauf im selben Chunk finanziell auswertbar bleibt.
- Fokustests fuer Wiederholungsgleichheit, RNG-Freiheit, Immutabilitaet,
  Akkumulation, Pflege, Partner/Witwe, Ruin, Tod, Technikfehler und Mismatch.

## Ausgeführte Validierung mit Ergebnis

- `node tests/run-single.mjs tests/stress-replay-runner.test.mjs`: 19/19
  Assertions erfolgreich.
- `node tests/run-single.mjs tests/worker-parity.test.mjs`: 600/600 Assertions
  erfolgreich; normale Finanzresultate, Path-Summaries und Source-Logs bleiben
  mit und ohne Capture identisch, ein technischer Capture-Lauf bricht seinen
  Geschwisterlauf nicht ab und publiziert keinen finanziellen Replay-Pfad.
- Echte MC-Capture-/Materialisierungs-/Replay-Plausibilisierung ohne
  Test-Doubles: Capture, Pfad und Replay meldeten jeweils
  `horizon_exhausted`; 3/3 Source-Zeilen reconcilierten.
- `git diff --check`: erfolgreich.
- Die deterministische Orchestrator-Validierungsattestierung bleibt davon
  unberuehrt und wird ausschließlich durch den Orchestrator projiziert.

## Abweichungen vom Plan

Keine fachliche Abweichung im Slice-03-Diff. Die vom Orchestrator autorisierte
Slice-02-Remediation wurde in den zwei exakt benannten Pfaden umgesetzt.

## Offene Risiken

- Die fokussierte reale Integration deckt einen ueberlebenden Dreijahrespfad
  ab; Ruin-/Shadow-Fortsetzung ist durch den 595-Assertion-Paritaetslauf
  abgedeckt. Die vollstaendige Matrix und externe Freigabe stehen aus.
- Siehe Findings-Lebenszyklus; Codex markiert die eigene Umsetzung nicht als
  freigegeben.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `NO`
- Validierungsbindung: `validation-da23f16852b7`
- Testdateien: `tests/stress-replay-runner.test.mjs`, `tests/worker-parity.test.mjs`
- Eigene Findings: `C-03`

### Ereignis 4: Runde 2

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-c687853a18e3`
- Testdateien: `tests/stress-replay-runner.test.mjs`, `tests/worker-parity.test.mjs`
- Eigene Findings: `C-03`, `C-04`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 5: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-c687853a18e3`
- Testdateien: `tests/stress-replay-runner.test.mjs`, `tests/worker-parity.test.mjs`
- Prüfdimensionen: correctness of deterministic single-path execution, RNG &amp; worker isolation, baseline input immutability, fail-closed reconciliation with monetary/ratio tolerances, life-event context projection (care, widow, partner, accumulation transition), dynamic flex runner horizon alignment, distinct terminal state handling (ruin, all_dead, horizon_exhausted, technical_error), result schema validation and fingerprint integrity, error fault isolation
- Größtes Restrisiko: downstream slices (Slice 06 delta-ledger comparison or Slice 08/09 UI renderer) assuming yearResults contains a uniform terminal entry across all paths, experiencing an index mismatch when processing all_dead paths where terminal_death breaks before pushing to yearResults
- Realistische Bruchbedingung: a death-terminated replay path is evaluated against an alternative strategy variant in Slice 06 that survives one additional year, and the comparison ledger iterates baseline.yearResults directly without checking terminalStatus or aligning lengths, triggering an uncaught property access on undefined.
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
- `C-03` Antwort 1: **angenommen** — Regressionstest bestätigt: Ein technischer Capture-Lauf wird isoliert, veröffentlicht keinen finanziellen Replay-Pfad und bricht Geschwisterläufe nicht ab; fokussierte Validierung 600/600 erfolgreich.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-da23f16852b7`

- Diff-Fingerprint: `da23f16852b7e4fd360dab823526a9110b57885ac9058f9a472854ff35c0058b`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `39b81463cce8123a984d497b211f6fc1d1dd63a3a626ce2b3501686d5451f0e8`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 172 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[176493 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |

### Ereignis 3: `validation-c687853a18e3`

- Diff-Fingerprint: `c687853a18e3791725f2969c39814afb99c85aa1f024a5241b0613a8d0cbb465`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `eed76802eac224ac33dc45eaf316d07740026948200acf1029693fd60c9cbe0e`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 172 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[176570 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure is that a production Monte Carlo batch with stress-replay capture enabled hits a technical-error outcome on the specific run selected for capture, causing &#96;resolveStressReplayTerminalStatus&#96; to throw uncaught and abort the entire chunk's remaining runs — surfacing to end users as an unexplained Monte-Carlo computation failure with no connection to the stress-replay feature they never interacted with, and only traced back to this exact remediation line long after this slice was marked approved.
  - Ereignis 4: In three months, the most likely failure is that a death-terminated stress-replay path reaches Slice 6's variant/delta comparison or Slice 8/9's UI, and the missing &#96;yearResults&#96; terminal entry for &#96;all_dead&#96; paths (C-04) causes a silent off-by-one truncation or mismatch versus ruin/horizon paths, surfacing as a confusing "last year missing" bug in the comparison view that is hard to trace back to this exact asymmetry in the runner.
  - Ereignis 5: In three months, the most likely failure cause is that a downstream consumer in Slice 06 (variant comparison) or Slice 09 (comparison UI) indexes into result.yearResults assuming every processed path has an entry for its terminating year, causing an off-by-one gap or undefined property access for all_dead paths that terminate on terminal_death without appending to yearResults.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-03` — `CLOSED`

- Quelle: `claude`; Runde 1
- Klasse: `BLOCKER`
- Finding: &#96;resolveStressReplayTerminalStatus&#96; in &#96;app/simulator/monte-carlo-runner.js&#96; throws for any outcome code outside {RUIN, ALL_DEAD, HORIZON_EXHAUSTED}, including a plausible technical-error outcome (evidenced by the pre-existing &#96;MAX_TECHNICAL_ERROR_SAMPLES&#96; tracking in the same file), with no evidence in the diff that this call site is guarded by a try/catch or that technical-error outcomes are excluded from ever reaching a &#96;replayCapture&#96; before this line executes; an uncaught throw here would abort the whole &#96;runMonteCarloChunk&#96; batch for all runs, not just the captured one, degrading a normal Monte-Carlo simulation whenever replay capture happens to be enabled.
- Akzeptanztest: acceptance=Add a &#96;tests/worker-parity.test.mjs&#96; fixture that forces the captured run to end in a technical-error outcome (e.g., inject a fault in the engine step for the run selected for capture while &#96;stressReplayCapture&#96; opt-in is active) and assert &#96;runMonteCarloChunk&#96; either (a) completes normally with the capture omitted/marked non-financial rather than throwing, or (b) if throwing is truly intended, that the throw is caught upstream and surfaced as a scoped, non-fatal technical-error signal that does not abort sibling runs in the same chunk. VALIDATE: ["node", "tests/run-single.mjs", "tests/worker-parity.test.mjs"]
- Statusbegründung: Regression test in tests/worker-parity.test.mjs directly encodes the acceptance criteria (technical-error captured run isolated, sibling run unaffected, no stressReplayCapture published for the technical run, no uncaught throw/batch abort) and is part of the bound PASS attestation for fingerprint c687853a18e3.

### `C-04` — `OPEN`

- Quelle: `claude`; Runde 2
- Klasse: `OBSERVATION`
- Finding: &#96;runStressReplayPathV1&#96;'s &#96;terminal_death&#96; branch never appends a terminal entry to &#96;yearResults&#96; (unlike the &#96;terminal_ruin&#96; branch, which does), producing an asymmetric/short &#96;yearResults&#96; array for all_dead-terminated paths that downstream Slice 6 (variant/delta comparison) or Slice 8/9 (renderer/UI) consumers may not expect.
- Akzeptanztest: acceptance=Extend &#96;tests/stress-replay-runner.test.mjs&#96; Test 3's death fixture to assert &#96;deathResult.yearResults.length&#96; matches the number of processed years including the death year (or documents the intentional omission with an explicit &#96;status: 'all_dead'&#96; terminal entry mirroring the ruin branch), and assert any Slice 6/9 consumer of &#96;yearResults&#96; handles a death-terminated path without an off-by-one gap. VALIDATE: ["node", "tests/run-single.mjs", "tests/stress-replay-runner.test.mjs"]
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-03 | claude | &#96;resolveStressReplayTerminalStatus&#96; in &#96;app/simulator/monte-carlo-runner.js&#96; throws for any outcome code outside {RUIN, ALL_DEAD, HORIZON_EXHAUSTED}, including a plausible technical-error outcome (evidenced by the pre-existing &#96;MAX_TECHNICAL_ERROR_SAMPLES&#96; tracking in the same file), with no evidence in the diff that this call site is guarded by a try/catch or that technical-error outcomes are excluded from ever reaching a &#96;replayCapture&#96; before this line executes; an uncaught throw here would abort the whole &#96;runMonteCarloChunk&#96; batch for all runs, not just the captured one, degrading a normal Monte-Carlo simulation whenever replay capture happens to be enabled. | BLOCKER | angenommen | erledigt: Regression test in tests/worker-parity.test.mjs directly encodes the acceptance criteria (technical-error captured run isolated, sibling run unaffected, no stressReplayCapture published for the technical run, no uncaught throw/batch abort) and is part of the bound PASS attestation for fingerprint c687853a18e3. |
| C-04 | claude | &#96;runStressReplayPathV1&#96;'s &#96;terminal_death&#96; branch never appends a terminal entry to &#96;yearResults&#96; (unlike the &#96;terminal_ruin&#96; branch, which does), producing an asymmetric/short &#96;yearResults&#96; array for all_dead-terminated paths that downstream Slice 6 (variant/delta comparison) or Slice 8/9 (renderer/UI) consumers may not expect. | OBSERVATION | offen | offen |
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
