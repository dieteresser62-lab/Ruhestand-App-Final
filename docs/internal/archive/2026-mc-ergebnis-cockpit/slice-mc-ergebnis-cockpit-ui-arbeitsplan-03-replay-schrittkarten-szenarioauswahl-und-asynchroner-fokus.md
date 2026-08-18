# Slice 03 – Replay-Schrittkarten, Szenarioauswahl und asynchroner Fokus

**Feature-Branch:** `feature/mc-ergebnis-cockpit`
**GitHub-Status:** nur lokal

## Ziel des Slice

Replay-Schrittkarten, Szenarioauswahl und asynchroner Fokus

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-03-replay-schrittkarten-szenarioauswahl-und-asynchroner-fokus.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`, `tests/stress-replay-ui.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

- Branchcheck vor Umsetzung: `feature/mc-ergebnis-cockpit` entspricht dem persistierten Ziel-Branch.
- Vorbestehende Orchestrator-Änderung: `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`; nicht durch Codex bearbeitet.
- Produktive Änderungseinheiten dieses Slice: fünf und damit unter der Stopgrenze von zehn.
- Hauptrisiken: dynamischer Select-Rerender, Fokus in einem inzwischen verborgenen Panel und versehentlich gebrochener Direkt-Kind-Vertrag des Editors.

## Geplante Tests

- Fokussiert: `tests/mc-result-cockpit.test.mjs` und `tests/stress-replay-ui.test.mjs`.
- Syntax- und Diff-Prüfung der geänderten JavaScript-/Testdateien.
- Browser-Smoke und der echte Zwei-Läufe-Ablauf bleiben Bestandteil der orchestratorseitigen Validierungsmatrix.

## Durchgeführte Änderungen

- `#scenarioSelector` in die erste Replay-Schrittkarte neben `#stressReplayFixButton` verschoben; die Szenario-Logs besitzen stattdessen den Rückverweis `#mcShowReplayButton`.
- Drei aus Banner-/Fieldset-Zustand abgeleitete Replay-Schrittkarten ergänzt; kein neuer persistierter Fachzustand eingeführt.
- Quelle, Horizont und Terminalstatus priorisiert; Modus, Fortsetzung und beide Fingerprints in eine tastaturbedienbare native Detail-Disclosure verschoben. Alle sieben vorhandenen `dt`/`dd`-Ziele bleiben erhalten.
- Variantenliste und Editor ab 900 CSS-Pixeln zweispaltig, darunter einspaltig angeordnet; der fokussierte Editor-Grid bleibt direktes Kind von `#stressReplayVariantFields`.
- Sämtliche Status-, Banner-, Vergleichs- und Fixierfokuspfade aktivieren über `activateMonteCarloResultView()` zuerst die Replay-Ansicht.
- Dynamischer Szenario-Select wird je Ergebnisprojektion im stabilen Container ersetzt; ein Lauf ohne Logs leert einen eventuell veralteten Select.
- Idempotenztest um Listener-Kardinalität ergänzt und damit C-03 regressionsfest abgedeckt. C-01 bleibt mangels neuer Eingabevalidierung unverändert; C-02 bleibt durch sichtbare Replay-/Ergebnis-Fokusziele gewahrt.

## Ausgeführte Validierung mit Ergebnis

- `node tests/run-single.mjs tests/mc-result-cockpit.test.mjs`: 55/55 Assertions bestanden.
- `node tests/run-single.mjs tests/stress-replay-ui.test.mjs`: 138/138 Assertions bestanden.
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`: 166/166 Assertions bestanden.
- `node --check` für die drei geänderten Produktmodule und vier geänderten Testdateien: bestanden.
- `git diff --check`: bestanden.
- Die vollständige Browser- und Repository-Matrix wurde vertragsgemäß nicht im Agentenprozess ausgeführt; sie wird vom Orchestrator ausgeführt.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Die erweiterte echte Browserprüfung mit zwei kleinen Monte-Carlo-Läufen, dynamischem Select-Rerender und 320-/900-px-Layout steht bis zum Orchestrator-Gate aus.
- C-01 (roher Setup-Echo-Vertrag) bleibt offen, weil dieser Slice keine Eingabevalidierung oder Normalisierung einführt.
- C-02 (verborgener kanonischer Startbutton nach Erfolg) bleibt offen; neue Fokuspfade zielen ausschließlich auf sichtbare Ergebnis-/Replay-Knoten.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-6d17048d2408`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`, `tests/stress-replay-ui.test.mjs`
- Prüfdimensionen: DOM structure/uniqueness of moved &#96;#scenarioSelector&#96; and new &#96;#mcShowReplayButton&#96;, init idempotency/listener cardinality, async focus-vs-hidden-panel race across import/discard/comparison paths, derived step-state correctness and single &#96;aria-current&#96;, stale-select cleanup across reruns, CSS responsive collapse at 899px, and the managed audit-block bookkeeping (scope, findings carry-forward) in the slice doc
- Größtes Restrisiko: the untested &#96;stressReplayStepSelect → 'completed'&#96; transition (C-04) could silently regress since nothing currently asserts it
- Realistische Bruchbedingung: a future slice refactors &#96;updateStressReplayStepStates&#96;'s ternary ordering/logic (e.g., while adding a 4th step or reusing the helper for another workflow) and inverts or drops the &#96;'completed'&#96; branch for the select step without any test catching it, leaving users on a stale "step 1 active" indicator after fixing a run
- Eigene Findings: `C-01`, `C-02`, `C-03`, `C-04`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-6d17048d2408`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`, `tests/stress-replay-ui.test.mjs`
- Prüfdimensionen: DOM structure &amp; step card hierarchy (#scenarioSelector relocated to replay step 1, #mcShowReplayButton backlink in logs, 7 diagnostic dl items preserved across key facts and technical details disclosure), step-state derivation logic &amp; single aria-current attribute assignment in updateStressReplayStepStates, asynchronous focus synchronization via focusReplayTarget ensuring panel unhiding before element focusing across import/discard/comparison actions, selector cleanup on Monte Carlo reset in simulator-results.js, initMonteCarloResultCockpit listener cardinality idempotency, and responsive grid collapse at &lt;=899px
- Größtes Restrisiko: Asynchronous operations or external DOM manipulations that bypass focusReplayTarget could attempt to focus elements inside collapsed disclosures or inactive result panels, leading to silent focus failures
- Realistische Bruchbedingung: A future slice or feature adds a new replay workflow or custom button handler that invokes focusElement directly rather than focusReplayTarget, failing to activate the replay tab panel when triggered from an external context (e.g. logs or quick-action bar)
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
- `C-01` Antwort 1: **angenommen** — Slice 02 führt keine Eingabevalidierung ein; der weiterhin rohe Echo-Vertrag ist im Slice-Dokument ausdrücklich festgehalten.
- `C-01` Antwort 2: **angenommen** — Slice 03 führt keine Eingabevalidierung ein; der dokumentierte rohe Setup-Echo-Vertrag bleibt unverändert.
- `C-02` Antwort 1: **angenommen** — Der Hidden-when-collapsed-Vertrag von mcButton ist im Slice-Dokument festgehalten; Erfolgsfokus aktiviert Überblick und fokussiert den sichtbaren Ergebnisbereich.
- `C-02` Antwort 2: **angenommen** — Es wurde kein direkter Fokus auf den eingeklappten mcButton ergänzt; neue Fokuspfade aktivieren sichtbare Replay-Ziele.
- `C-03` Antwort 1: **angenommen** — Die bestehende dokumentbezogene Initialisierungssperre ist nun durch explizite Listener-Kardinalitätstests für Tabs und Replay-Rückverweis abgesichert.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-6d17048d2408`

- Diff-Fingerprint: `6d17048d2408b698734c4ddaf6c861904561593bd19fa7d05b630f393a89131a`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `5b2df6f2e1e169cb56081ed1e94f15be514b29751ceba46a59b0bf6f266b7ee5`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 181 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[185389 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Most likely three-month failure cause is a later slice (Slice 4, replay comparison/priority work) adding another dynamic focus or render path that calls &#96;focusElement&#96; directly instead of the new &#96;focusReplayTarget&#96; wrapper — reintroducing the hidden-panel focus race that Test 8 now guards against only for the four call sites touched in this Slice, while a fifth new call site added later bypasses the wrapper and is missed because there is no lint/architecture guard forcing all replay focus calls through &#96;focusReplayTarget&#96;.
  - Ereignis 3: A future enhancement introduces dynamic DOM subtree replacement for the scenario selector or step cards during a background recalculation without re-invoking updateStressReplayStepStates, leaving step state attributes and aria-current stale relative to the active workspace state.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The setup summary (&#96;updateMonteCarloSetupSummary&#96;) intentionally echoes raw, unnormalized field strings (e.g. leading zeros, transient partial input) with no formatting/validation layer; this is explicitly by design per the slice notes and Test 1, but could surface confusing values to users mid-edit in later slices that add validation.
- Akzeptanztest: Add a formatting/normalization pass (or explicit "raw echo" documentation note) once a later slice introduces input validation for these fields, and add a regression test asserting the summary reflects normalized rather than raw values at that point.
- Statusbegründung: Carried forward unchanged; the current review supplied no explicit status update.

### `C-02` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: After a successful run, &#96;completeMonteCarloCockpitRun()&#96; collapses &#96;#mcSetupDisclosure&#96;, which also visually hides &#96;#mcButton&#96; (nested inside the &#96;&lt;details&gt;&#96; content) even though &#96;.click()&#96; delegation from &#96;#mcRecalculateButton&#96; still functions programmatically. Any future code path that calls &#96;mcButton.focus()&#96; directly (bypassing the existing &#96;terminalFocusTarget&#96; fallback logic that already prefers &#96;resultRegion&#96;) would silently fail to move focus while the disclosure is collapsed.
- Akzeptanztest: Add a targeted test asserting focus/interaction behavior when a future slice adds any direct &#96;mcButton.focus()&#96; call while the disclosure is collapsed, or document the hidden-when-collapsed contract next to &#96;mcButton&#96; in the slice docs so later slices don't reintroduce a focus target that has become invisible.
- Statusbegründung: Carried forward unchanged; the current review supplied no explicit status update.

### `C-03` — `CLOSED`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: &#96;initMonteCarloResultCockpit&#96; attaches &#96;click&#96;/&#96;keydown&#96; listeners to all 5 result tabs (in addition to the pre-existing recalculate-button listener) with no guard against re-invocation; the existing "idempotent init" test only asserts state consistency, not listener-count stability, so a future slice or runtime path that calls &#96;initMonteCarloResultCockpit&#96; more than once per &#96;documentRef&#96; (e.g., a hot-reload or dynamic re-init path) would silently stack duplicate tab click/keydown handlers, causing duplicated &#96;activateMonteCarloResultView&#96; calls and duplicated &#96;preventDefault&#96;/focus side effects on every keypress.
- Akzeptanztest: acceptance=Add a regression test that calls &#96;initMonteCarloResultCockpit&#96; twice against the same &#96;documentRef&#96; and asserts a single &#96;click&#96; dispatch on a result tab triggers exactly one &#96;activateMonteCarloResultView&#96; invocation (e.g., via a call-count spy or by asserting &#96;tab.listeners.get('click').length === 1&#96;), or make init explicitly idempotent by clearing/reusing listeners via the existing &#96;cockpitInstances&#96; map.
- Statusbegründung: The requested regression test now exists verbatim: Test 1 in &#96;mc-result-cockpit.test.mjs&#96; calls &#96;initMonteCarloResultCockpit&#96; twice on the same &#96;documentRef&#96; and asserts &#96;listeners.get('click').length === 1&#96; for a result tab and for the new replay backlink button, proving init does not stack duplicate click handlers.

### `C-04` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: &#96;updateStressReplayStepStates&#96; derives &#96;stressReplayStepSelect&#96;'s &#96;data-step-state&#96; as &#96;'completed'&#96; once a workspace exists (&#96;hasWorkspace&#96; true), but no test in &#96;stress-replay-ui.test.mjs&#96; or &#96;browser-smoke.test.mjs&#96; asserts this specific transition (only the &#96;'active'&#96;/no-workspace state and the path/variant states after a workspace exists are covered).
- Akzeptanztest: Add an assertion in the existing Test 8 (or a new case) that once &#96;hasWorkspace&#96; becomes true (e.g., right after the deferred import resolves), &#96;documentRef.getElementById('stressReplayStepSelect').dataset.stepState === 'completed'&#96;.
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The setup summary (&#96;updateMonteCarloSetupSummary&#96;) intentionally echoes raw, unnormalized field strings (e.g. leading zeros, transient partial input) with no formatting/validation layer; this is explicitly by design per the slice notes and Test 1, but could surface confusing values to users mid-edit in later slices that add validation. | OBSERVATION | angenommen | offen |
| C-02 | claude | After a successful run, &#96;completeMonteCarloCockpitRun()&#96; collapses &#96;#mcSetupDisclosure&#96;, which also visually hides &#96;#mcButton&#96; (nested inside the &#96;&lt;details&gt;&#96; content) even though &#96;.click()&#96; delegation from &#96;#mcRecalculateButton&#96; still functions programmatically. Any future code path that calls &#96;mcButton.focus()&#96; directly (bypassing the existing &#96;terminalFocusTarget&#96; fallback logic that already prefers &#96;resultRegion&#96;) would silently fail to move focus while the disclosure is collapsed. | OBSERVATION | angenommen | offen |
| C-03 | claude | &#96;initMonteCarloResultCockpit&#96; attaches &#96;click&#96;/&#96;keydown&#96; listeners to all 5 result tabs (in addition to the pre-existing recalculate-button listener) with no guard against re-invocation; the existing "idempotent init" test only asserts state consistency, not listener-count stability, so a future slice or runtime path that calls &#96;initMonteCarloResultCockpit&#96; more than once per &#96;documentRef&#96; (e.g., a hot-reload or dynamic re-init path) would silently stack duplicate tab click/keydown handlers, causing duplicated &#96;activateMonteCarloResultView&#96; calls and duplicated &#96;preventDefault&#96;/focus side effects on every keypress. | OBSERVATION | angenommen | erledigt: The requested regression test now exists verbatim: Test 1 in &#96;mc-result-cockpit.test.mjs&#96; calls &#96;initMonteCarloResultCockpit&#96; twice on the same &#96;documentRef&#96; and asserts &#96;listeners.get('click').length === 1&#96; for a result tab and for the new replay backlink button, proving init does not stack duplicate click handlers. |
| C-04 | claude | &#96;updateStressReplayStepStates&#96; derives &#96;stressReplayStepSelect&#96;'s &#96;data-step-state&#96; as &#96;'completed'&#96; once a workspace exists (&#96;hasWorkspace&#96; true), but no test in &#96;stress-replay-ui.test.mjs&#96; or &#96;browser-smoke.test.mjs&#96; asserts this specific transition (only the &#96;'active'&#96;/no-workspace state and the path/variant states after a workspace exists are covered). | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

## Rückdokumentation in die Arbeitsplan-MD

Arbeitsplan: `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`

## Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
