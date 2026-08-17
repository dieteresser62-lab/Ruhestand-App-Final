# Slice 09 – Varianteneditor und Vergleichsansicht

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Varianteneditor und Vergleichsansicht

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `Simulator.html`, `app/simulator/simulator-results.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/slice-stress-pfad-replay-arbeitsplan-09-varianteneditor-und-vergleichsansicht.md`, `docs/internal/slice-stress-replay-implement-09-varianteneditor-und-vergleichsansicht.md`, `docs/internal/stress-replay-implement-review-fa2904b2.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

**Branch vor Umsetzung:** `codex/stress-pfad-replay`

**Git-Status vor Umsetzung:**

- `M docs/internal/stress-replay-implement-review-fa2904b2.md` (vom Orchestrator verwalteter, vorbestehender Auditpfad)
- `?? docs/internal/slice-stress-pfad-replay-arbeitsplan-09-varianteneditor-und-vergleichsansicht.md` (vom Orchestrator angelegter Slice-Plan)

**Geplante Dateien:**

- `Simulator.html`
- `app/simulator/simulator-results.js`
- `app/simulator/stress-replay-renderer.js`
- `app/simulator/stress-replay-ui.js`
- `simulator.css`
- `tests/browser-smoke.test.mjs`
- `tests/stress-replay-renderer.test.mjs`
- diese Slice-MD; verwaltete Auditblöcke bleiben unverändert

**Voraussichtliche Änderungstiefe:** mittel. Der Controller erhält einen
persistierten Variantenworkflow; der Renderer bildet bestehende Contracts ohne
neue Fachsemantik ab.

**Gefährdete bestehende Tests:** Stress-Replay-UI, Persistenz/Export,
Browser-Smoke und Modulimport des Simulators.

**Nicht anfassen:** Contracts, Runner-/Vergleichssemantik, Engine, Profil- und
Tranchenpersistenz sowie alle Pfade außerhalb der Slice-Allowlist.

**Rollback-Strategie:** Rückkehr auf den vom Orchestrator verwalteten
Slice-08-Commit; Codex führt selbst weder Checkout noch Reset aus.

## Geplante Tests

- DOM-neutraler Renderertest für Patchvorschau, bedingte Hinweise,
  Variantenlimit, Technical Error, KPI-, Delta- und Jahrestabelle.
- Browser-Smoke für semantische Controls, Tastaturbedienbarkeit und den lokal
  horizontal scrollenden Vergleichscontainer.
- Fokussierte bestehende Stress-Replay-UI-Tests als Plausibilisierung; die
  deterministische Gesamtvalidierung bleibt beim Orchestrator.

## Durchgeführte Änderungen

- Whitelist-basierter Varianteneditor mit sichtbaren, eingefrorenen
  Baselinewerten und leeren Patchfeldern; Profil- und Tranchenwerte werden
  nicht beschrieben.
- Modusabhängige Drei-Bucket- und Langlebigkeitsfelder, Patchvorschau,
  Mehrfaktorwarnung, UI-Domainvalidierung und Limit von Baseline plus drei
  Alternativen.
- Persistierter Add/Remove-Workflow und explizite Neuberechnung auf demselben
  materialisierten Pfad; ein neuer Monte-Carlo-Ergebnissatz verwirft eine alte
  Szenarioauswahl.
- DOM-neutraler Renderer für Variantenliste, KPI-Tabelle, First-Delta-Timeline
  und Jahrestabelle. Technical Errors sperren finanzielle Deltas, und die Copy
  schließt Rangfolge, Empfehlung und Scheinkausalität aus.
- Vergleichstabellen scrollen auf schmalen Viewports in lokalen,
  tastaturfokussierbaren Containern; Nutzungslabels werden HTML-escaped.

## Ausgeführte Validierung mit Ergebnis

- `node --check` für die drei geänderten/neu angelegten JS-Module und beide
  geänderten Testdateien: erfolgreich.
- `node tests/run-single.mjs tests/stress-replay-renderer.test.mjs`: 26/26
  Assertions erfolgreich.
- `node tests/run-single.mjs tests/stress-replay-ui.test.mjs`: 34/34 Assertions
  erfolgreich (bestehende Slice-08-Regression).
- `git diff --check`: erfolgreich.
- `tests/browser-smoke.test.mjs` wurde um statische/semantische Browserchecks
  erweitert, aber nicht isoliert ausgeführt; der vollständige Browserlauf und
  die Gesamtmatrix gehören laut State-v3-Vertrag dem Orchestrator.

## Abweichungen vom Plan

Keine fachliche Abweichung. Der bereits freigegebene Contract bleibt
unverändert; die Vergleichsansicht konsumiert ausschließlich bestehende
Varianten-, Resultat- und Comparison-Strukturen.

## Offene Risiken

- Die reale Engine-/DOM-Integration und das Verhalten bei einem vollständigen
  1+3-Vergleich werden erst durch die orchestrierte Browser- und Gesamtmatrix
  attestiert.
- Jahrestabellen eines inkompatiblen Nur-Lesen-Imports sind nur verfügbar,
  wenn der Import bereits einen Comparison-Stand enthält; es wird absichtlich
  keine inkompatible Neuberechnung gestartet.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-7e5f1f3e312d`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`
- Eigene Findings: `C-02`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-7e5f1f3e312d`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`
- Prüfdimensionen: Whitelist conformance, baseline immutability, variant limits (max 3 alternatives), HTML escaping and XSS safety, conditional 3-bucket/longevity form dynamics, monotonic timestamp persistence, technical error suppression, local horizontal table containment, and browser smoke integration
- Größtes Restrisiko: Largest residual risk is that rapid user interaction with the variant editor form controls while a calculation is in flight or while invalid DOM form inputs are present could trigger unhandled validation rejections if client-side validation states are circumvented prior to checkValidity() calls
- Realistische Bruchbedingung: Break condition: A user inputs unexpected non-standard floating point notation or extreme numeric values into number fields that pass HTML5 form validity but exceed safe calculation boundaries during simulation execution on high-iteration models
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-7e5f1f3e312d`

- Diff-Fingerprint: `7e5f1f3e312d439c3e39ec6c32f7ef22a3454944601e1bb1bef8ec27b861efdc`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `a607561930142b8eead11223dd2903cc721877d86583e2c0fe2c2927b3f7c06f`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 179 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[181906 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure is a support report of a stress-replay workspace whose comparison view claims a clean/reconciled baseline after the browser was reloaded or the workspace was re-imported, even though the persisted &#96;path.years&#96; had silently diverged from the true original Monte-Carlo run (e.g. due to a storage-layer bug, manual JSON edit, or a regression in an earlier slice's materializer) — because the reload-path reconciliation in &#96;defaultRunComparison&#96; is self-referential (C-02) and therefore structurally unable to surface that drift.
  - Ereignis 3: In three months, the most likely failure cause is a support issue where an atypical browser autofill or script submits incomplete numeric values into the variant editor without triggering standard input events, resulting in an unvalidated patch payload being passed directly to createVariant and surfacing as a visible UI validation error instead of being caught in live preview.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-02` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: After browser reload (&#96;initialize()&#96;) or &#96;importSerialized()&#96;, &#96;sourceScenarioLog&#96; is reset to &#96;null&#96;, causing &#96;defaultRunComparison&#96; to derive the baseline "source" identity rows from &#96;workspace.path&#96; itself instead of an independently persisted original scenario log; the baseline reconciliation check therefore becomes tautological on every reload/import and cannot detect drift between the persisted fixed path and its true originating Monte-Carlo run across sessions.
- Akzeptanztest: Add a &#96;stress-replay-ui.test.mjs&#96;/&#96;stress-replay-renderer.test.mjs&#96; case that stubs &#96;runComparison&#96;/&#96;runStressReplayPathV1&#96; to record the &#96;sourceScenarioLog&#96; argument passed for the baseline variant across (a) a fresh &#96;fixSelectedScenario()&#96; call and (b) a subsequent &#96;initialize()&#96; reload of the same persisted workspace; assert the two invocations receive an identical, independently-sourced scenario log (e.g. because it is itself persisted in the workspace) rather than (b) deriving it from &#96;workspace.path.years&#96;. VALIDATE: ["node","tests/run-single.mjs","tests/stress-replay-ui.test.mjs"]
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-02 | claude | After browser reload (&#96;initialize()&#96;) or &#96;importSerialized()&#96;, &#96;sourceScenarioLog&#96; is reset to &#96;null&#96;, causing &#96;defaultRunComparison&#96; to derive the baseline "source" identity rows from &#96;workspace.path&#96; itself instead of an independently persisted original scenario log; the baseline reconciliation check therefore becomes tautological on every reload/import and cannot detect drift between the persisted fixed path and its true originating Monte-Carlo run across sessions. | OBSERVATION | offen | offen |
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
