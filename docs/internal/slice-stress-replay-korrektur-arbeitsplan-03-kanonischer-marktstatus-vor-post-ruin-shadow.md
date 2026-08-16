# Slice 03 – Kanonischer Marktstatus vor Post-Ruin-Shadow

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Kanonischer Marktstatus vor Post-Ruin-Shadow

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `app/simulator/monte-carlo-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-03-kanonischer-marktstatus-vor-post-ruin-shadow.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/worker-parity.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

Branch `codex/stress-pfad-replay` stimmt mit dem Zielbranch überein. Vor der
Umsetzung waren ausschließlich das vom Orchestrator erzeugte Slice-Dokument
und der konsolidierte Auditbericht geändert; beide liegen im erlaubten Scope.
Das Diff-Risiko liegt in einer doppelten Fortschreibung des Ruinjahres oder
einer unbeabsichtigten Änderung normaler Monte-Carlo-Ergebnisse.

## Geplante Tests

Fokussiert: `node tests/run-single.mjs tests/worker-parity.test.mjs`.
Die vollständige Validierungsmatrix wird gemäß Arbeitsvertrag vom
Orchestrator ausgeführt.

## Durchgeführte Änderungen

- Der Stress-Replay-Capture übernimmt den effektiven Marktstatus des
  terminalen Ruinjahres genau einmal in `marketDataHist`, bevor die
  Post-Ruin-Shadow-Fortsetzung beginnt.
- Ein deterministischer Kontrastfall belegt Ruinjahresrendite, CAPE-Fallback
  im ersten und in einem weiteren Shadow-Jahr sowie streng steigende
  Jahresindizes.

## Ausgeführte Validierung mit Ergebnis

`node tests/run-single.mjs tests/worker-parity.test.mjs`: erfolgreich, 605
Assertions, 0 fehlgeschlagene Assertions, 0 fehlgeschlagene Dateien. Die
autoritative Validierungsattestierung wird durch den Orchestrator projiziert.

## Abweichungen vom Plan

Keine erfasst.

## Offene Risiken

Die Mutation historischer Fixture-Werte im fokussierten Test ist mit
`try/finally` gekapselt. Das verbleibende Risiko einer Doppelanwendung wird
durch die CAPE-Fallback-Folgeprüfung abgedeckt; Reviewer-Findings bleiben dem
strukturierten Findings-Lebenszyklus vorbehalten.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-b1417bdfd59b`
- Testdateien: `tests/worker-parity.test.mjs`
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-b1417bdfd59b`
- Testdateien: `tests/worker-parity.test.mjs`
- Prüfdimensionen: canonical market state advancement on terminal ruin, post-ruin shadow CAPE inheritance and path progression, non-captured Monte Carlo run isolation and financial parity, strict year index monotonicity, and test fixture cleanup safety via try/finally
- Größtes Restrisiko: Future refactoring in monte-carlo-runner.js that decouples or relaxes BREAK_ON_RUIN while stress-replay capture is enabled, causing simState.marketDataHist advancement to execute during an active loop iteration rather than terminating live simulation
- Realistische Bruchbedingung: A custom runner configuration or test where BREAK_ON_RUIN is overridden to false while stressReplayCapture is active, allowing the terminal ruin market update to leak into subsequent non-shadow simulation steps and diverge financial outcomes against uncaptured runs
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-b1417bdfd59b`

- Diff-Fingerprint: `b1417bdfd59b7965643853c87819353a1675e9ff8136cbf5aec46290c81b25a8`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `3a2c7275f059e0571ed22bfa4941d306d223b8c17a95d9b86b89e955308e3462`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[182593 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure is a maintainer adding a configuration path where ruin no longer unconditionally breaks the main simulation loop while stress-replay capture is active (e.g., for a new post-ruin household-only continuation feature), which would let the now-mutated &#96;simState.marketDataHist&#96; leak into further live engine sampling for captured runs only, silently diverging captured-run financial outcomes from otherwise-identical non-captured runs — a defect the current test suite would not catch because no test exercises &#96;BREAK_ON_RUIN=false&#96; together with active capture, and no test seeds ruin at year index 0.
  - Ereignis 3: In three months, the most likely failure cause is an engine refactoring that introduces configurable post-ruin continuation loops without BREAK_ON_RUIN, causing the ruin-time mutation of simState.marketDataHist to persist into further live simulation steps rather than being restricted to the shadow domain, resulting in an undetected return and CAPE divergence between captured and uncaptured Monte Carlo runs.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The new ruin-transition fixture only covers a non-initial ruin year (&#96;ruinYearIndex &gt; 0&#96; is asserted as a precondition), so the edge case of ruin on the very first simulated year — where &#96;marketDataHist&#96; has minimal/initial prior state — is untested; separately, the diff's safety depends on &#96;BREAK_ON_RUIN&#96; being unconditionally true whenever stress-replay capture seeds &#96;simState.marketDataHist&#96;, which is not visible/provable from this diff alone.
- Akzeptanztest: Add a worker-parity fixture where the sampled ruin year is index 0 (first simulated year) and assert the first/second post-ruin shadow years still resolve a stable, correctly-seeded CAPE/return from that terminal ruin year; additionally add or reference an assertion/comment at the &#96;BREAK_ON_RUIN&#96; definition confirming it is unconditionally true for any run where &#96;stressReplayCapture&#96; is requested, so capture-vs-no-capture financial parity cannot regress via this code path.
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The new ruin-transition fixture only covers a non-initial ruin year (&#96;ruinYearIndex &gt; 0&#96; is asserted as a precondition), so the edge case of ruin on the very first simulated year — where &#96;marketDataHist&#96; has minimal/initial prior state — is untested; separately, the diff's safety depends on &#96;BREAK_ON_RUIN&#96; being unconditionally true whenever stress-replay capture seeds &#96;simState.marketDataHist&#96;, which is not visible/provable from this diff alone. | OBSERVATION | offen | offen |
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
