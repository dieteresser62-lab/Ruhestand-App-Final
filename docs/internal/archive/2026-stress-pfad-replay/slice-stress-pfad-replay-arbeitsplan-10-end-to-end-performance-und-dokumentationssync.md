# Slice 10 – End-to-End, Performance und Dokumentationssync

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

End-to-End, Performance und Dokumentationssync

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `README.md`, `docs/internal/slice-stress-pfad-replay-arbeitsplan-10-end-to-end-performance-und-dokumentationssync.md`, `docs/internal/slice-stress-replay-implement-10-end-to-end-performance-und-dokumentationssync.md`, `docs/internal/stress-replay-implement-review-fa2904b2.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/fixtures/stress-replay-performance-baseline-v1.json`, `tests/monte-carlo-export-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/worker-parity.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

Branchcheck vor Umsetzung: `codex/stress-pfad-replay` entspricht dem
persistierten Zielbranch. Vorbestehend waren ausschliesslich die vom
Orchestrator erzeugte Slice-MD und dessen Projektion in den konsolidierten
Auditbericht geaendert. Das Slice fuegt keine Fachsemantik hinzu; groesstes
Diff-Risiko sind zeitabhaengige Performanceassertions und eine unvollstaendige
Integrationsverkettung. Beides wird durch ein relatives Budget mit Rauschboden
und einen echten 60-Jahres-Durchstich begrenzt.

## Geplante Tests

Gemäß Arbeitsplan und Orchestrator-Validierungsmatrix.

## Durchgeführte Änderungen

- Synthetischer End-to-End-Test fuer MC-Capture, Materialisierung,
  deterministisches Baseline-/Varianten-Replay, Export/Import und Groesse.
- Workerartige Chunk-Paritaet fuer den absolut indexierten Replay-Capture und
  MC-Export-Negativvertrag fuer nicht persistierte Capture-Traces.
- Browser-Smoke fuer Interpretationscopy und inaktive Persistenz.
- Versionierte 60-Jahres-Performancebaseline mit dokumentierter Umgebung,
  Rohmessungen, Exportgroesse und relativem Budget.
- Nutzer-, Architektur-, Modul- und Testdokumentation synchronisiert.

## Ausgeführte Validierung mit Ergebnis

Gezielter Implementer-Lauf zur Baseline-Erhebung:
`node tests/run-single.mjs tests/stress-replay-e2e.test.mjs` – PASS, 13
Assertions. `worker-parity.test.mjs` – PASS, 602 Assertions;
`monte-carlo-export-contract.test.mjs` – PASS, 266 Assertions. Der direkte
Browser-Smoke-Versuch konnte im Implementer-Sandbox keine lokale
`127.0.0.1`-Listener-Socket oeffnen (`EPERM`) und bleibt Teil der
Orchestrator-Validierung. Die deterministische Gesamtvalidierung und
Attestierung wird durch den Orchestrator projiziert.

## Abweichungen vom Plan

Keine erfasst.

## Offene Risiken

Die lokale Zeitmessung kann auf stark gedrosselter oder ausgelasteter Hardware
streuen; deshalb gilt der relative Faktor zusammen mit dem absoluten
Rauschboden. Fachliche Freigabe und Gesamtvalidierung bleiben extern.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-03b55dc8dc48`
- Testdateien: `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/fixtures/stress-replay-performance-baseline-v1.json`, `tests/monte-carlo-export-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/worker-parity.test.mjs`
- Prüfdimensionen: scope/allowlist conformance, e2e wiring correctness (capture→materialize→compare→export/import), determinism/idempotency of comparisonFingerprint across repeated runs, chunk-boundary parity for absolute-indexed capture, export-schema non-leakage, browser-level persistence/idempotency and financial-advice-boundary copy checks, performance-budget design
- Größtes Restrisiko: Largest residual risk: the relative+floor performance budget (4×/250ms) in stress-replay-e2e.test.mjs could still intermittently fail on heavily contended/throttled CI/dev hardware, and the worker-parity addition only exercises a second-half split (not a first-half split), leaving a narrow gap in offset-independence coverage
- Realistische Bruchbedingung: Break condition: a shared/throttled CI runner pushes the 5-sample median for baseline+one-alternative on the 60-year path above &#96;max(4×435.858ms, 250ms)&#96; purely from scheduling noise, or a future chunk-splitting change breaks first-half offset correctness in a way the current split-only-from-6 test cannot detect.
- Eigene Findings: keine
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-03b55dc8dc48`
- Testdateien: `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/fixtures/stress-replay-performance-baseline-v1.json`, `tests/monte-carlo-export-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/worker-parity.test.mjs`
- Prüfdimensionen: scope and allowlist compliance, end-to-end integration wiring (Monte Carlo opt-in capture -&gt; path materialization -&gt; single-path replay comparison -&gt; workspace creation -&gt; versioned JSON export/import round-trip), contract non-leakage (asserting no replay capture traces in standard MonteCarloExportV2), worker chunk boundary invariance for absolute run indices, browser smoke disclaimer and persistence hygiene verification, 60-year performance baseline budgeting (4x relative multiplier with 250ms absolute noise floor), and complete cross-documentation synchronization
- Größtes Restrisiko: Largest residual risk is that execution duration measurements in stress-replay-e2e.test.mjs could encounter transient OS-level CPU throttling or heavy background scheduler contention on severely constrained shared CI nodes, causing duration spikes during the 5 measured iterations
- Realistische Bruchbedingung: Break condition: A shared virtualized CI runner experiencing severe CPU starvation pushes the 5-iteration median duration on the 60-year path above max(250ms, 4 * 435.858ms = 1743.432ms) due solely to host scheduling jitter rather than an algorithmic regression
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-03b55dc8dc48`

- Diff-Fingerprint: `03b55dc8dc48f588a0f24d7606b08fdf8e8e84fc14e1ab5c9f4eb15ea3996416`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `022e1bfb10b59c0d624f6edf004714dce4501dda7ccd2636c50e547159bc1d12`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[182494 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months the most likely failure is an intermittent CI red on &#96;stress-replay-e2e.test.mjs&#96;'s performance assertion under a busier/slower runner than the Ryzen 7 3700X reference, prompting the budget or fixture to be loosened ad hoc without re-measuring, which would silently erode the regression-detection value of the gate rather than fixing an actual throughput regression.
  - Ereignis 3: In three months, the most likely failure cause is that a future modification to the underlying engine transaction loops subtly shifts microsecond execution characteristics on long simulation horizons (e.g., 80–100 years), tempting developers to loosen or bypass the performance baseline budget ad hoc rather than re-measuring against a documented reference hardware profile.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
Noch keine strukturierten Findings.
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| – | – | Noch keine Findings | – | – | – |
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
