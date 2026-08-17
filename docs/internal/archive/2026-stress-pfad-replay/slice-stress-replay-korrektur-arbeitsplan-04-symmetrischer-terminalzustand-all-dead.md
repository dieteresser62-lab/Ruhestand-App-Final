# Slice 04 – Symmetrischer Terminalzustand all_dead

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Symmetrischer Terminalzustand all_dead

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `app/simulator/stress-replay-comparison.js`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-04-symmetrischer-terminalzustand-all-dead.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

- Branch vor Umsetzung: `codex/stress-pfad-replay` (entspricht dem Zielbranch).
- Der Arbeitsbaum enthielt vor Umsetzung ausschließlich die vom Orchestrator
  angelegten beziehungsweise verwalteten Slice-/Audit-Dokumente.
- Produktive Änderungsgruppen: 3 von maximal 10
  (`stress-replay-contract.js`, `stress-replay-runner.js`,
  `stress-replay-comparison.js`).
- Downstream-Prüfung: Renderer und Export verarbeiten Jahres- beziehungsweise
  Pfadzeilen bereits generisch; für diese Produktquellen war keine
  Scope-Erweiterung erforderlich.
- Hauptrisiko: Consumer könnten einen terminalen Todesdatensatz fälschlich als
  Finanzjahr oder eine fehlende Vergleichsseite als `undefined` behandeln.

## Geplante Tests

- `node tests/run-single.mjs tests/stress-replay-runner.test.mjs`
- `node tests/run-single.mjs tests/stress-replay-comparison.test.mjs`
- `node tests/run-single.mjs tests/stress-replay-renderer.test.mjs`
- `node tests/run-single.mjs tests/stress-replay-export.test.mjs`
- Die vollständige autoritative Matrix bleibt dem Orchestrator vorbehalten.

## Durchgeführte Änderungen

- Der Runner übernimmt ein verarbeitetes `terminal_death`-Jahr in
  `yearResults`, bewahrt Nominal- und Realportfolio unverändert und weist
  Entnahme sowie Steuer mit `null` und feldbezogener Missingness als nicht
  anwendbar aus.
- Der Ergebnisvertrag validiert Jahresstatus, nullbasierte Zeitachse,
  Portfoliofelder und die vollständige Todesjahr-Missingness. `all_dead`
  muss in genau einer abschließenden Todeszeile enden; die Zahl finanziell
  ausgewerteter Jahre wird gegen die `financial_year`-Zeilen geprüft und
  `ruinYear` muss `null` bleiben.
- Der Vergleich projiziert eine auf einer Seite fehlende Jahreszeile als
  explizites `null`, sodass asymmetrisch lange Pfade weder `undefined`
  erzeugen noch die längere terminale Zeile abschneiden.
- Regressionstests decken Todesjahr nach einem Finanzjahr, beide Richtungen
  asymmetrischer Pfadlängen, fail-closed Missingness, sichtbare Tabellen-
  Missingness und den Export-Roundtrip der terminalen Pfadzeile ab.

## Ausgeführte Validierung mit Ergebnis

Fokussierte Entwicklerläufe (keine Orchestrator-Attestierung):

- `stress-replay-runner.test.mjs`: 30/30 Assertions bestanden.
- `stress-replay-comparison.test.mjs`: 34/34 Assertions bestanden.
- `stress-replay-renderer.test.mjs`: 28/28 Assertions bestanden.
- `stress-replay-export.test.mjs`: 15/15 Assertions bestanden.
- `git diff --check`: bestanden.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Die vollständige Integrations- und Browsermatrix wird erst durch den
  Orchestrator ausgeführt.
- Freigabe und adversariales Review stehen aus; Codex markiert die eigene
  Implementierung nicht als freigegeben.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-ba9259054cd4`
- Testdateien: `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`
- Prüfdimensionen: correctness of terminal_death row emission and its portfolio/inflation values, contract fail-closed checks for missing/duplicate/inconsistent year-result status and missingness, all_dead single-terminal-row and last-row invariants, ruinYear-null invariant for all_dead, comparison-side explicit-null vs undefined fix and its serialization consequence, export/renderer downstream compatibility via generic row handling, scope containment to the allow-listed 9 files
- Größtes Restrisiko: Largest residual risk: immediate (yearIndex 0) all_dead death is contract-validated but not runner-execution-tested, so a future change to portfolio/inflation initialization order could silently produce wrong values for that specific edge case without any test catching it
- Realistische Bruchbedingung: Break condition: a maintainer changes state.portfolio or resolveSimulatorCumulativeInflationFactor initialization ordering relative to the death-check in the simulation loop, causing the very-first-year death row to report a stale or double-mutated portfolio value; the existing suite (death now always preceded by a financial year) would not detect this because it never exercises the zero-prior-year case.
- Eigene Findings: `C-02`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-ba9259054cd4`
- Testdateien: `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`
- Prüfdimensionen: contract validation of terminal_death year records and all_dead terminal summary invariants
- Größtes Restrisiko: comparison-side explicit null projection for asymmetric survival horizons
- Realistische Bruchbedingung: runner emission of terminal death rows with unmutated portfolio snapshots, explicit null withdrawals/taxes, and field-level missingness &#124; renderer and export compatibility with terminal death rows &#124; scope containment across the allowlisted 9 files &#124; A future refactoring in the runner simulation loop mutates state.portfolio before branching on terminal_death, silently corrupting the reported death row valuation on multi-year paths &#124; A future change adds pre-loop fee deductions or cash adjustments at the start of each iteration before the recordType === 'terminal_death' check, leaking non-zero deductions into the terminal death snapshot
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-ba9259054cd4`

- Diff-Fingerprint: `ba9259054cd4264ae20f25c0888c1d1da806be3b94a4a51c99cca500f8c6ce4b`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `14039b38104bb95d8fd171427bc5c3e0e360693f729d7d11b76c58ff84a05e6e`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[182677 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure is exactly the gap above — a refactor of loop initialization or portfolio-snapshot timing regresses the immediate-first-year-death value computation, and it ships undetected because no runner test seeds death at yearIndex 0 with zero prior financial years; it would only surface as a subtle nominal/real value mismatch reported by end users on very short/adverse scenario paths.
  - Ereignis 3: In three months, the most likely failure cause is a feature addition introducing partial-year estate settlement or inheritance transaction records upon terminal_death, which accidentally marks terminal death rows as partially financially evaluable without updating the strict contract validator invariants (financiallyEvaluable === false, withdrawalEur === null, taxEur === null), causing downstream contract validation failures across existing stress-replay workspaces.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-02` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The runner-level all_dead fixture no longer covers death occurring on the very first simulated year (yearIndex 0, no preceding financial_year row); coverage shifted to death-after-one-financial-year, leaving the initial-state portfolio/inflation computation for an immediate first-year death unverified end-to-end, only contract-schema-validated in isolation.
- Akzeptanztest: Add a runner test with pathFor([deathRecord], 'all_dead') where deathRecord = year(0, {recordType:'terminal_death', financiallyEvaluable:false, householdEvents: household({p1Alive:0})}) and assert yearResults.length===1, yearResults[0].status==='terminal_death', nominalValueEur/realValueEur equal the pre-loop initial portfolio value, and summary.financiallyEvaluatedYears===0.
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-02 | claude | The runner-level all_dead fixture no longer covers death occurring on the very first simulated year (yearIndex 0, no preceding financial_year row); coverage shifted to death-after-one-financial-year, leaving the initial-state portfolio/inflation computation for an immediate first-year death unverified end-to-end, only contract-schema-validated in isolation. | OBSERVATION | offen | offen |
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
