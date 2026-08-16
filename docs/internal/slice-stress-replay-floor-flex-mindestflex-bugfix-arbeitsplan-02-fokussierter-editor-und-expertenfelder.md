# Slice 02 – Fokussierter Editor und Expertenfelder

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Fokussierter Editor und Expertenfelder

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `Simulator.html`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_02_EDITOR_UND_EXPERTENFELDER.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-02-fokussierter-editor-und-expertenfelder.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

- Branch vor Umsetzung: `codex/stress-pfad-replay` (entspricht Zielbranch).
- Vorbestehender Arbeitsbaum: nur die vom Orchestrator angelegte Slice-MD und
  das verwaltete Auditdokument waren geändert beziehungsweise untracked.
- Produktive Änderungsgruppen: vier (`Simulator.html`, `simulator.css`,
  `stress-replay-ui.js`, `stress-replay-renderer.js`); damit kein
  `PRODUCTIVE-FILE-LIMIT`-Risiko.
- Höchstes Diff-Risiko war ein Verlust oder eine Umbenennung der 17
  bestehenden Expertencontrols. Sie bleiben vollständig mit unveränderten
  `data-stress-replay-path`-Werten im neuen Container erhalten.

## Geplante Tests

- UI-Controller: leere Werte gegenüber numerischer Null, EUR-Baselineausgabe,
  effektive Mindest-Flex-Relation, Togglezustand und Werterhalt.
- Renderer: verständliche Bezeichnungen der drei neuen Materialitätsgruppen.
- Browser-Smoke: reale DOM-Struktur, initiale Sichtbarkeit, ARIA sowie Enter-
  und Leertastenbedienung.

## Durchgeführte Änderungen

- Standardraster auf Variantenname, Floor-Bedarf, Flex-Bedarf und
  Mindest-Flex fokussiert; alle drei Zahlenfelder beginnen leer und verwenden
  die V2-Patchpfade.
- Separate EUR-formatierte Baselineoutputs ergänzt; eine Baseline von null
  wird als Geldbetrag ausgegeben.
- Alle bisherigen 17 Controls in einen initial geschlossenen, nativen und
  ARIA-gekoppelten Expertenbereich verschoben.
- Der Toggle verändert nur `hidden`, `aria-expanded` und seine Beschriftung;
  er erzeugt keinen Patch und wird nicht persistiert.
- Der UI-Controller bildet den Contractfehler
  `STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX` mit beiden effektiven Werten
  deutschsprachig in Vorschau und Statusregion ab; es erfolgt kein Clamping.
- Renderer und Variantenliste benennen die drei neuen Materialitätsgruppen
  verständlich.

## Ausgeführte Validierung mit Ergebnis

- `node tests/run-single.mjs tests/stress-replay-ui.test.mjs`: PASS, 88/88.
- `node tests/run-single.mjs tests/stress-replay-renderer.test.mjs`: PASS,
  41/41.
- `node tests/browser-smoke.test.mjs`: in der Agentensandbox nicht
  ausführbar, weil der lokale Server nicht an `127.0.0.1` binden durfte
  (`EPERM`). Gemäß Arbeitsplan übernimmt der Orchestrator diesen Lauf.
- `git diff --check`: PASS.

## Abweichungen vom Plan

Keine fachliche Abweichung. Der Browser-Smoke wurde geändert, konnte lokal
aber ausschließlich wegen der dokumentierten Sandbox-Portrestriktion nicht
ausgeführt werden.

## Offene Risiken

Die echten Tastatur- und Sichtbarkeitsorakel benötigen den autoritativen
Browserlauf des Orchestrators. Die DOM-unabhängigen Controller- und
Renderergrenzen sind fokussiert grün.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-027c86583644`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`
- Eigene Findings: `C-01`, `C-02`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-027c86583644`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`
- Prüfdimensionen: HTML structure, ARIA accessibility attributes, CSS styling, renderer KPI/group labels, baseline Euro formatting, UI error mapping, DOM-local toggle state preservation, form reset lifecycle, and slice boundary adherence
- Größtes Restrisiko: Contract detail property restructuring in stress-replay-contract.js silently degrading German error interpolation to 'unbekannt' placeholders in the UI
- Realistische Bruchbedingung: A future refactoring of STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX in stress-replay-contract.js modifies details.startFlexBedarf or details.minimumFlexAnnual without updating formatStressReplayUiError, leading to missing amounts in user-facing validation messages
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-027c86583644`

- Diff-Fingerprint: `027c86583644acd7458e27d8debcc38e9d646999c3f9b31c53f16704ba554c6e`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `c16b5da8ae4dd15e9bae10b4e3b1ee57bb8342ed14d1f22e9a6c66d8582554d4`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[183895 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Most likely three-month failure is that a later Slice/contract change alters the &#96;details&#96; key names or the effective-value semantics of &#96;STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX&#96; in stress-replay-contract.js, silently degrading the Mindest-Flex error message to "unbekannt" amounts in production, because this Slice's only test for that mapping is a synthetic mock rather than the real contract path (C-02), and this would ship past both this Slice's tests and generic full-suite runs unless a dedicated end-to-end assertion is added in Slice 3.
  - Ereignis 3: Most likely failure cause in three months is that future contract adjustments to error payloads in stress-replay-contract.js drift from the UI error formatter expectation without failing unit tests due to synthetic mock error payloads in stress-replay-ui.test.mjs, causing production error announcements to display fallback 'unbekannt' values until caught in end-to-end browser tests.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: In &#96;previewEditorPatch&#96;, the &#96;region.dataset.patchError&#96; sentinel is only ever written/cleared for the single code &#96;STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX&#96;. If the preview transitions from that error to a *different* validation error and back to success, the stale sentinel from the first error would still be read as &#96;true&#96; on the eventual success path, triggering the "Die Patchvorschau ist zulässig." announcement while never having explicitly announced the second, different error through this same code path. No test in this Slice exercises an error-type transition (only the single-error and pure-toggle cases are covered), so this edge-case status/aria-live regression would not be caught by regression tests.
- Akzeptanztest: Add a stress-replay-ui.test.mjs case that first triggers &#96;STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX&#96;, then triggers an unrelated preview error (e.g. a whitelist/schema rejection), and finally a successful preview, asserting the status text/dataset.status reflect only the current error at each step and that the "zulässig" announcement fires exactly once, only after the truly last error was cleared.
- Statusbegründung: –

### `C-02` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: &#96;formatStressReplayUiError&#96;'s new branch depends on &#96;error.details.{minimumFlexAnnual,startFlexBedarf}&#96; being produced exactly this way by Slice 1's contract validator (&#96;app/simulator/stress-replay-contract.js&#96;, out of this Slice's scope). This Slice's only coverage of that mapping (Test 11 in tests/stress-replay-ui.test.mjs) constructs a hand-rolled mock error rather than invoking the real contract function, and no browser-smoke/e2e assertion in this packet exercises the real end-to-end error text. A future rename or restructuring of the real error's &#96;details&#96; shape in Slice 1/3 would silently break the German message (fields would render as &#96;undefined&#96;/&#96;unbekannt&#96;) without failing any test owned by this Slice.
- Akzeptanztest: Add an integration-level assertion (either importing the real &#96;applyStressReplayVariantPatch&#96;/validator from stress-replay-contract.js in a unit test, or an e2e assertion in tests/stress-replay-e2e.test.mjs in Slice 3) that triggers the genuine &#96;STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX&#96; error and asserts &#96;formatStressReplayUiError&#96; produces the expected German text with correct amounts.
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | In &#96;previewEditorPatch&#96;, the &#96;region.dataset.patchError&#96; sentinel is only ever written/cleared for the single code &#96;STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX&#96;. If the preview transitions from that error to a *different* validation error and back to success, the stale sentinel from the first error would still be read as &#96;true&#96; on the eventual success path, triggering the "Die Patchvorschau ist zulässig." announcement while never having explicitly announced the second, different error through this same code path. No test in this Slice exercises an error-type transition (only the single-error and pure-toggle cases are covered), so this edge-case status/aria-live regression would not be caught by regression tests. | OBSERVATION | offen | offen |
| C-02 | claude | &#96;formatStressReplayUiError&#96;'s new branch depends on &#96;error.details.{minimumFlexAnnual,startFlexBedarf}&#96; being produced exactly this way by Slice 1's contract validator (&#96;app/simulator/stress-replay-contract.js&#96;, out of this Slice's scope). This Slice's only coverage of that mapping (Test 11 in tests/stress-replay-ui.test.mjs) constructs a hand-rolled mock error rather than invoking the real contract function, and no browser-smoke/e2e assertion in this packet exercises the real end-to-end error text. A future rename or restructuring of the real error's &#96;details&#96; shape in Slice 1/3 would silently break the German message (fields would render as &#96;undefined&#96;/&#96;unbekannt&#96;) without failing any test owned by this Slice. | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

## Rückdokumentation in die Arbeitsplan-MD

Arbeitsplan: `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`

Die Umsetzung ist zusätzlich in
`docs/internal/SLICE_STRESS_REPLAY_BEDARFE_02_EDITOR_UND_EXPERTENFELDER.md`
fachlich dokumentiert. Das verwaltete Auditdokument wurde von Codex nicht
bearbeitet.

## Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
