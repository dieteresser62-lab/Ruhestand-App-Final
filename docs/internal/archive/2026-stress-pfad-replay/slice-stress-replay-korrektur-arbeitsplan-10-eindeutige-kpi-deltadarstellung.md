# Slice 10 – Eindeutige KPI-Deltadarstellung

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Eindeutige KPI-Deltadarstellung

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `app/simulator/stress-replay-renderer.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-10-eindeutige-kpi-deltadarstellung.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

- Branch vor Umsetzung geprüft: `codex/stress-pfad-replay`.
- Im Slice-Scope lagen vor Umsetzung nur die vom Orchestrator neu angelegte
  Slice-Datei und dessen verwaltete Audit-Ergänzungen vor; sie wurden nicht
  überschrieben.
- Produktive Änderungsgruppe: 1 (`stress-replay-renderer.js`).
- Diff-Risiko: niedrig; Berechnung, Contracteinheiten und KPI-Werte bleiben
  unverändert, nur die kontextabhängige Ausgabe der vorhandenen Deltas wird
  getrennt formatiert.

## Geplante Tests

Gemäß Arbeitsplan und Orchestrator-Validierungsmatrix.

## Durchgeführte Änderungen

- Ein eigener Delta-Formatter wertet die bereits persistierte Contracteinheit
  aus, statt den Formatter für absolute KPI-Werte wiederzuverwenden.
- Ruinjahres- und Jahresdeltas werden als Anzahl Jahre mit korrektem Singular
  ausgegeben; absolute Ruinjahre bleiben 1-basiert als `Jahr N` lesbar.
- Drawdown-Deltas werden ausdrücklich als `Prozentpunkt` beziehungsweise
  `Prozentpunkte` dargestellt. Vorzeichen, Null und Missingness bleiben
  erhalten.
- Renderer- und Browser-Smoke-Tests belegen die semantische Zuordnung in der
  KPI-Zeile sowie positive, negative, singuläre, Null- und nicht anwendbare
  Jahresdifferenzen.

## Ausgeführte Validierung mit Ergebnis

- `node tests/run-single.mjs tests/stress-replay-renderer.test.mjs`: PASS,
  35/35 Assertions.
- `node --check tests/browser-smoke.test.mjs`: PASS.
- `node --check app/simulator/stress-replay-renderer.js`: PASS.
- `git diff --check`: PASS.
- `npm run test:browser`: der Testprozess startete, erreichte aber keinen
  Browserworkflow, weil das Playwright-Chromium-Executable in der
  Agentenumgebung nicht installiert ist; die autoritative Browserausführung
  verbleibt bei der Orchestrator-Matrix.

## Abweichungen vom Plan

Keine fachliche Abweichung. Der vorgesehene Browser-Smoke konnte lokal mangels
Playwright-Browser-Binary nicht ausgeführt werden; der Browser-Test selbst ist
syntaktisch geprüft und wird vom Orchestrator ausgeführt.

## Offene Risiken

Das verbleibende Risiko liegt im noch ausstehenden echten Browserlauf. Die
Unit-Abdeckung prüft denselben produktiven Rendererpfad; Browsermodulimport,
DOM-Zeilenauflösung und lokalisierte Textausgabe werden erst in der
Orchestrator-Umgebung vollständig bestätigt.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-b593c78ff4d9`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`
- Prüfdimensionen: unit dispatch correctness (currency/percentage/year branches), singular/plural and sign handling, not-applicable-vs-zero-delta distinction, escaping/XSS surface, scope containment against allowlist, attestation binding to fingerprint b593c78ff4d9
- Größtes Restrisiko: largest residual risk: silent generic-number fallback for an unrecognized &#96;delta.unit&#96; decouples the renderer from the upstream contract without a fail-loud guard or covering test
- Realistische Bruchbedingung: break condition: a new or renamed KPI field is wired into &#96;kpiDeltas&#96; with a unit value outside {nominal_eur, real_eur, percentage_points, years, zero_based_year_index}, causing its delta to silently render as an unlabeled bare number, undetected because the fallback branch has no test coverage
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-b593c78ff4d9`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`
- Prüfdimensionen: unit dispatch correctness (currency, percentage_points, years, zero_based_year_index branches), singular/plural formatting across positive/negative/zero values, distinction between unobserved missingness and not-applicable terminal states, HTML escaping and XSS boundary, path containment against exact slice allowlist
- Größtes Restrisiko: Future KPI additions or unit renamings in stress-replay-comparison.js could cause delta formatting to drop into the generic numeric fallback without explicit unit labels if formatKpiDelta is not updated concurrently
- Realistische Bruchbedingung: A new metric with a novel unit identifier (such as ratio or count_months) is added to STRESS_REPLAY_COMPARISON_KPIS_V1 without extending formatKpiDelta, resulting in bare unlabeled delta numbers in the comparison table
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-b593c78ff4d9`

- Diff-Fingerprint: `b593c78ff4d97f18ce4731e2d84490ada4f1ad45a896ea4487adec278bbe6481`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `b74700465fa42b97e6bd7bf600e9c815e6c006d4f96175f30e2be361db78b334`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[183390 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure is a new engine/report KPI being wired into &#96;kpiDeltas&#96; with a &#96;unit&#96; value that doesn't match one of the four handled branches in &#96;formatKpiDelta&#96; (typo, renamed contract constant, or a currency subfield using a differently-spelled unit token), so its delta silently falls through to the generic &#96;formatNumber&#96; branch, producing an ambiguous unlabeled number in the KPI comparison table that could be misread as unitless or as a percentage — with no test failure to surface it, since the fallback path is currently untested.
  - Ereignis 3: In three months, the most likely failure cause is an engine or reporting extension that introduces an additional summary KPI with a unit type outside the existing four unit categories (e.g., ratio or count_months); because formatKpiDelta falls back gracefully to Δ ${formatNumber(value)} rather than failing loudly or emitting a diagnostic in development mode, the new metric would render in the comparison table without unit descriptors or singular/plural localization, remaining unnoticed until visual inspection in production.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: formatKpiDelta dispatches purely on the contract-supplied &#96;delta.unit&#96; string with no validation and a silent generic-number fallback (&#96;Δ ${formatNumber(value)}&#96;) for any unrecognized or missing unit, decoupling delta formatting from the field-name-based dispatch that &#96;formatKpi&#96; still uses for absolute values. If a future KPI field is added to &#96;kpiDeltas&#96; without a correctly-produced &#96;unit&#96; (or with a typo'd unit string, e.g. from a change in stress-replay-comparison.js), its delta would silently render as a bare, unlabeled number instead of failing loudly or clearly indicating a mapping gap. Additionally, no test in tests/stress-replay-renderer.test.mjs exercises this unknown-unit fallback branch, and only the &#96;zero_based_year_index&#96; unit (ruinYear) is explicitly asserted in rendered text — the sibling &#96;years&#96; unit (e.g. &#96;financiallyEvaluatedYears&#96;) is exercised in the semantic-delta HTML fixture but never independently asserted, so a regression isolated to that branch (distinct from &#96;zero_based_year_index&#96;) would not be caught.
- Akzeptanztest: Add a unit test in tests/stress-replay-renderer.test.mjs that (a) renders a kpiDelta with an unrecognized/missing &#96;unit&#96; value and asserts the output is a clearly-flagged fallback rather than a plausible bare number, and (b) asserts the rendered text for a &#96;years&#96;-unit field (e.g. &#96;financiallyEvaluatedYears&#96;) explicitly, mirroring the existing &#96;zero_based_year_index&#96; assertions.
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | formatKpiDelta dispatches purely on the contract-supplied &#96;delta.unit&#96; string with no validation and a silent generic-number fallback (&#96;Δ ${formatNumber(value)}&#96;) for any unrecognized or missing unit, decoupling delta formatting from the field-name-based dispatch that &#96;formatKpi&#96; still uses for absolute values. If a future KPI field is added to &#96;kpiDeltas&#96; without a correctly-produced &#96;unit&#96; (or with a typo'd unit string, e.g. from a change in stress-replay-comparison.js), its delta would silently render as a bare, unlabeled number instead of failing loudly or clearly indicating a mapping gap. Additionally, no test in tests/stress-replay-renderer.test.mjs exercises this unknown-unit fallback branch, and only the &#96;zero_based_year_index&#96; unit (ruinYear) is explicitly asserted in rendered text — the sibling &#96;years&#96; unit (e.g. &#96;financiallyEvaluatedYears&#96;) is exercised in the semantic-delta HTML fixture but never independently asserted, so a regression isolated to that branch (distinct from &#96;zero_based_year_index&#96;) would not be caught. | OBSERVATION | offen | offen |
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
