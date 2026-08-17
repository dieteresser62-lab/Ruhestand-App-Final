# Slice 02 – Varianten-Whitelist mit belegten Prozentgrenzen

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Varianten-Whitelist mit belegten Prozentgrenzen

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `app/simulator/stress-replay-contract.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-belegten-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-prozentgrenzen.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-variant.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

Branch `codex/stress-pfad-replay` wurde vor der Umsetzung bestätigt. Im
Arbeitsbaum lagen ausschließlich die vom Orchestrator angelegte Slice-MD und
dessen verwaltete Audit-Aktualisierung. Das Diff-Risiko ist auf einen
produktiven Contract-Deskriptor und die drei geplanten Regressionstestpfade
begrenzt; Finanz-, Runner- und Engine-Semantik werden nicht geändert.

## Geplante Tests

Gemäß Arbeitsplan und Orchestrator-Validierungsmatrix.

## Durchgeführte Änderungen

- `maxSkimPctOfEq` ist in der zentralen Stress-Replay-Whitelist inklusiv auf
  0 bis 50 begrenzt.
- `maxBearRefillPctOfEq` ist in derselben Contractquelle inklusiv auf 0 bis 70
  begrenzt.
- Contract-, Varianten- und Exporttests decken Grenzen, Innenwerte,
  Unter-/Überschreitungen, nicht-endliche Zahlen und einen manipulierten
  Import mit neu berechneten Fingerprints ab.

## Ausgeführte Validierung mit Ergebnis

Fokussierte Entwicklerläufe (die autoritative Matrix folgt durch den
Orchestrator):

- `node tests/run-single.mjs tests/stress-replay-contract.test.mjs` – 65/65
  Assertions bestanden.
- `node tests/run-single.mjs tests/stress-replay-variant.test.mjs` – 45/45
  Assertions bestanden.
- `node tests/run-single.mjs tests/stress-replay-export.test.mjs` – 14/14
  Assertions bestanden.

## Abweichungen vom Plan

Keine. Die ältere Slice-MD-Namensvariante ohne „belegten“ wurde vom
Orchestrator nicht angelegt und daher nicht künstlich erzeugt.

## Offene Risiken

Die verbindliche Gesamtvalidierung und die unabhängige Freigabe stehen beim
Orchestrator beziehungsweise den Reviewern aus. `minimumFlexAnnual`, Runner,
Engine und UI-Markup blieben unverändert.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-452abefeb86a`
- Testdateien: `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-variant.test.mjs`
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-452abefeb86a`
- Testdateien: `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-variant.test.mjs`
- Prüfdimensionen: Contract boundary validation, domain range enforcement [0, 50] and [0, 70], non-finite rejection (NaN/Infinity), patch normalization, variant factory validation, and export fingerprint tamper resistance
- Größtes Restrisiko: Stored workspace records created under prior unvalidated bounds could encounter strict deserialization rejection in downstream slices if persistence and import workflows expect automated legacy migration
- Realistische Bruchbedingung: A legacy workspace or export with maxSkimPctOfEq &gt; 50 or maxBearRefillPctOfEq &gt; 70 is imported and fails closed with STRESS_REPLAY_CONTRACT_INVALID rather than undergoing schema migration or surfacing actionable diagnostic guidance
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-452abefeb86a`

- Diff-Fingerprint: `452abefeb86ae215d6d683c350761a6d63a33de1cf060a95b9fd743cb9d9a10c`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `64ba5cff7e85284213898ae4dec8a52f1cc5f65777d4f7c950eca1d9227f0c92`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[182495 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure is a support report from a user whose stress-replay workspace was created before this correction with &#96;maxSkimPctOfEq&#96; or &#96;maxBearRefillPctOfEq&#96; outside the new bounds; on reload/import the workspace now hard-fails validation with no migration or clear guidance, and because the asymmetric bear-refill fingerprint-bypass path was never regression-tested, a similarly crafted out-of-range bear-refill import could theoretically slip through if a future refactor accidentally special-cases one field's validation path differently from the other.
  - Ereignis 3: In three months, the most likely failure cause is a deserialization error encountered when importing or restoring a legacy workspace containing percentage values outside [0,50]/[0,70] that were created before explicit bounds enforcement, leading to an unhandled contract rejection in Slice 07/09 persistence/import paths rather than a graceful schema migration.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: Percentage-bound fingerprint-bypass regression tests only exercise &#96;maxSkimPctOfEq&#96; (export and variant layers); &#96;maxBearRefillPctOfEq&#96; has no equivalent manipulated-fingerprint test, and no test in this slice demonstrates the load/import behavior for pre-existing workspaces whose stored percentage values now fall outside the newly introduced [0,50]/[0,70] bounds.
- Akzeptanztest: Add a &#96;maxBearRefillPctOfEq&#96; counterpart to the existing manipulated-import/fingerprint-recompute test in tests/stress-replay-export.test.mjs and tests/stress-replay-variant.test.mjs, and add or reference a persistence/import-layer test (in the upcoming Slice 07/09 scope) that asserts a clear, non-silent rejection (not data loss) for a persisted workspace containing an out-of-range legacy percentage value.
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | Percentage-bound fingerprint-bypass regression tests only exercise &#96;maxSkimPctOfEq&#96; (export and variant layers); &#96;maxBearRefillPctOfEq&#96; has no equivalent manipulated-fingerprint test, and no test in this slice demonstrates the load/import behavior for pre-existing workspaces whose stored percentage values now fall outside the newly introduced [0,50]/[0,70] bounds. | OBSERVATION | offen | offen |
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
