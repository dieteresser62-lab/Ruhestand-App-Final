# Slice 04 – Replay-Vergleichsansichten und priorisierte Kernaussage

**Feature-Branch:** `feature/mc-ergebnis-cockpit`
**GitHub-Status:** nur lokal

## Ziel des Slice

Replay-Vergleichsansichten und priorisierte Kernaussage

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `app/simulator/mc-result-cockpit.js`, `app/simulator/stress-replay-renderer.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-04-replay-vergleichsansichten-und-priorisierte-kernaussage.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

- Branchcheck vor Umsetzung: `feature/mc-ergebnis-cockpit` entspricht dem Zielbranch.
- Statuscheck vor Umsetzung: ausschließlich das orchestratorseitig erzeugte
  Audit-Artefakt und diese Slice-Datei waren geändert bzw. unversioniert.
- Diff-Risiko: dynamisches `innerHTML` im Vergleich ersetzt die Untertabs bei
  jedem Render; deshalb liegen die Listener am stabilen Vergleichscontainer
  und lösen Tabs und Panels bei jedem Ereignis neu auf.
- Fachrisiko: Missingness, Nichtanwendbarkeit oder technische Fehler dürfen
  nicht als materielle KPI-Abweichung erscheinen. Die Auswahl verlangt daher
  einen vergleichbaren Pair, `applicable`, endliche Basis-/Varianten-/Delta-
  Werte und ein Delta ungleich null.

## Geplante Tests

- Fokussierte Node-Tests für Cockpit-Delegation, Renderer-Priorität und
  Replay-UI-Schrittzustand.
- Syntax- und Whitespace-Prüfung der geänderten JavaScript-/Testdateien.
- Browser-Smoke-Erweiterung für Maus, Tastatur, Rerender, Fehlerfokus und
  Drucksichtbarkeit; die Ausführung gehört zur Orchestrator-Matrix.

## Durchgeführte Änderungen

- Eine namespacete Vergleichs-Tablist für Kennzahlen, Delta-Timeline und
  Jahresverlauf ergänzt; Kennzahlen ist nach jedem Rerender der Startzustand.
- Klick sowie Links/Rechts und Home/End werden einmalig am stabilen
  `#stressReplayComparison` delegiert und arbeiten immer auf den aktuellen
  Renderer-Knoten.
- Pro vergleichbarer Alternative wird in bestehender Reihenfolge höchstens
  eine Kernaussage aus der freigegebenen KPI-Priorität dargestellt. Angezeigt
  werden ausschließlich bereits berechnete Basis-, Varianten- und Delta-Werte.
- C-05 ist defensiv adressiert: Sowohl der öffentliche Vergleichsrenderer als
  auch der neue Kernaussagen-Helper behandeln einen fehlenden Vergleich ohne
  Dereferenzierung; ein direkter Aufruf ohne Argumente ist regressionsgetestet.
- CSS für Untertabs, Kernaussagekarten und die Drucksichtbarkeit aller drei
  vollständig gerenderten Vergleichssektionen ergänzt.
- Regressionstests für Rerender/Listener-Kardinalität, Tastatursteuerung,
  KPI-Priorität, Reihenfolge, Null-/Missingness-/Fehlerfälle sowie C-04 ergänzt.

## Ausgeführte Validierung mit Ergebnis

- `node tests/run-single.mjs tests/mc-result-cockpit.test.mjs`: PASS,
  65/65 Assertions.
- `node tests/run-single.mjs tests/stress-replay-renderer.test.mjs`: PASS,
  59/59 Assertions (einschließlich Default-Aufruf ohne Vergleich).
- `node tests/run-single.mjs tests/stress-replay-ui.test.mjs`: PASS,
  139/139 Assertions.
- `node --check` für beide geänderten Produktmodule und
  `tests/browser-smoke.test.mjs`: PASS.
- `git diff --check`: PASS.
- Die autoritative Gesamt- und Browservalidierung wird vom Orchestrator
  ausgeführt.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- C-01 bleibt offen: Der Setup-Laufkopf spiegelt weiterhin absichtlich rohe
  Eingabestrings; Slice 04 führt keine Eingabevalidierung ein.
- C-02 bleibt offen: Kein neuer Pfad fokussiert den in der geschlossenen
  Setup-Disclosure verborgenen `mcButton`.
- C-04 ist implementierungsseitig adressiert: Test 8 prüft nach erfolgreichem
  asynchronem Import explizit `stressReplayStepSelect = completed`; die
  formale Schließung bleibt dem berichtenden Reviewer vorbehalten.
- C-05 ist implementierungsseitig adressiert: Der Default-Aufruf liefert die
  neutrale Idle-Meldung, und der Kernaussagen-Helper ist zusätzlich gegen
  `null` abgesichert; die formale Schließung bleibt Claude vorbehalten.
- Die Browser-Smoke-Ausführung und finale Freigabe stehen beim Orchestrator
  bzw. den Reviewern aus.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `NO`
- Validierungsbindung: `validation-17fddc061995`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`
- Eigene Findings: `C-01`, `C-02`, `C-03`, `C-04`, `C-05`

### Ereignis 4: Runde 2

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-6eafe8d8161c`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`
- Prüfdimensionen: correctness of the null-guard fix and its placement, delegation idempotency/listener-cardinality, keyboard roving-tabindex semantics across rerenders, print-media visibility contract, escaping of user-controlled highlight strings, fingerprint-to-attestation binding for the blocker's acceptance test
- Größtes Restrisiko: largest residual risk is C-06 (no test enforces the implicit truthy-but-malformed-shape contract shared by all four comparison section renderers)
- Realistische Bruchbedingung: break condition: a future slice passes a partially-built comparison placeholder object (truthy, missing &#96;variants&#96;/&#96;pairwise&#96;) into &#96;renderStressReplayComparisonV1&#96; before validation, reintroducing an unguarded-dereference crash of the same class as C-05 but through a shape gap rather than a nullness gap.
- Eigene Findings: `C-01`, `C-02`, `C-03`, `C-04`, `C-05`, `C-06`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 5: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-6eafe8d8161c`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`
- Prüfdimensionen: Checked event delegation and listener cardinality on #stressReplayComparison across dynamic innerHTML rerenders, comparison tablist roving tabindex and keyboard navigation semantics (ArrowLeft/ArrowRight wrapping, Home/End), null-safety and fallback handling in renderStressReplayComparisonV1 and renderPrioritizedHighlights, non-recommendation invariant and KPI priority ordering for variant highlights, HTML escaping for user-controlled strings, print stylesheet visibility of all comparison panels, and orchestrator validation attestation binding (validation-6eafe8d8161c)
- Größtes Restrisiko: Largest residual risk is passing a partially constructed or malformed non-null comparison object missing expected variants or pairwise arrays into renderStressReplayComparisonV1 before validation finishes
- Realistische Bruchbedingung: Break condition: An async or optimistic comparison computation passes an incomplete object missing variants or pairwise into renderStressReplayComparisonV1, triggering property access errors on undefined sub-structures
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
- `C-01` Antwort 1: **angenommen** — Slice 02 führt keine Eingabevalidierung ein; der weiterhin rohe Echo-Vertrag ist im Slice-Dokument ausdrücklich festgehalten.
- `C-01` Antwort 2: **angenommen** — Slice 03 führt keine Eingabevalidierung ein; der dokumentierte rohe Setup-Echo-Vertrag bleibt unverändert.
- `C-01` Antwort 3: **angenommen** — Slice 04 führt keine Eingabevalidierung ein; der dokumentierte rohe Setup-Echo-Vertrag bleibt unverändert.
- `C-01` Antwort 4: **angenommen** — Slice 04 führt weiterhin keine Eingabevalidierung ein; der dokumentierte rohe Setup-Echo-Vertrag bleibt unverändert.
- `C-02` Antwort 1: **angenommen** — Der Hidden-when-collapsed-Vertrag von mcButton ist im Slice-Dokument festgehalten; Erfolgsfokus aktiviert Überblick und fokussiert den sichtbaren Ergebnisbereich.
- `C-02` Antwort 2: **angenommen** — Es wurde kein direkter Fokus auf den eingeklappten mcButton ergänzt; neue Fokuspfade aktivieren sichtbare Replay-Ziele.
- `C-02` Antwort 3: **angenommen** — Es wurde kein Fokuspfad auf den eingeklappten mcButton ergänzt; die neuen Vergleichs-Untertabs arbeiten ausschließlich im sichtbaren Replay-Bereich.
- `C-02` Antwort 4: **angenommen** — Es wurde kein Fokuspfad auf den eingeklappten mcButton ergänzt; Vergleichs-Untertabs bleiben im sichtbaren Replay-Bereich.
- `C-03` Antwort 1: **angenommen** — Die bestehende dokumentbezogene Initialisierungssperre ist nun durch explizite Listener-Kardinalitätstests für Tabs und Replay-Rückverweis abgesichert.
- `C-04` Antwort 1: **angenommen** — Der asynchrone Importtest prüft nun explizit, dass stressReplayStepSelect nach erfolgreichem Workspace-Aufbau den Zustand completed erhält.
- `C-05` Antwort 1: **angenommen** — Der Kernaussagen-Helper behandelt null defensiv; ein Regressionstest bestätigt, dass renderStressReplayComparisonV1() die neutrale Idle-Meldung liefert, ohne Highlights zu rendern.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-17fddc061995`

- Diff-Fingerprint: `17fddc06199559ac7b309538e2bec48c8754f5939e50b46acbd05f9ab6cab20f`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `10e633bf37fc2a3ec902a1557a85cd723fc1e195fb44bd277946ce91491f3c4d`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 181 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[185476 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |

### Ereignis 3: `validation-6eafe8d8161c`

- Diff-Fingerprint: `6eafe8d8161cf5338c4e4e524087fb807e1a01e5c13b9c7181a9813fb2410529`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `eb3d8775c0931f2d7063740050ac7a386252959a696084b4f5baebe2ea87b0cd`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 181 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[185476 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: (not applicable — decision is negative; see BLOCKER above.)
  - Ereignis 4: Most likely three-month failure cause is a future slice or feature (e.g. a live/incremental comparison-preview path) constructing and passing a partially-populated &#96;comparison&#96; object — truthy but missing &#96;variants&#96; or &#96;pairwise&#96; — before the full comparison finishes computing, since only the strictly-null case is now guarded and no test enforces the all-or-nothing shape contract shared by all four section renderers (C-06).
  - Ereignis 5: In three months, the most likely failure cause is an incremental or optimistic comparison calculation passing a partially initialized comparison object (truthy but missing variants or pairwise properties) into renderStressReplayComparisonV1, causing runtime property dereference errors during rendering before data validation completes.
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

### `C-04` — `CLOSED`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: &#96;updateStressReplayStepStates&#96; derives &#96;stressReplayStepSelect&#96;'s &#96;data-step-state&#96; as &#96;'completed'&#96; once a workspace exists (&#96;hasWorkspace&#96; true), but no test in &#96;stress-replay-ui.test.mjs&#96; or &#96;browser-smoke.test.mjs&#96; asserts this specific transition (only the &#96;'active'&#96;/no-workspace state and the path/variant states after a workspace exists are covered).
- Akzeptanztest: Add an assertion in the existing Test 8 (or a new case) that once &#96;hasWorkspace&#96; becomes true (e.g., right after the deferred import resolves), &#96;documentRef.getElementById('stressReplayStepSelect').dataset.stepState === 'completed'&#96;.
- Statusbegründung: The exact acceptance test requested (assert &#96;stressReplayStepSelect.dataset.stepState === 'completed'&#96; once &#96;hasWorkspace&#96; resolves) now exists verbatim in &#96;tests/stress-replay-ui.test.mjs&#96; Test 8, immediately after the asynchronous import resolution block. Verified directly in the supplied diff; closing as originally-reporting reviewer.

### `C-05` — `CLOSED`

- Quelle: `claude`; Runde 1
- Klasse: `BLOCKER`
- Finding: &#96;renderStressReplayComparisonV1({ comparison = null, ... })&#96; retains its pre-existing (unchanged) &#96;comparison = null&#96; default and, per its own template, unconditionally executes &#96;${renderPrioritizedHighlights(comparison)}&#96; as part of the single always-returned template — there is no early return before this line for the "no comparison yet" state. &#96;renderPrioritizedHighlights&#96; immediately does &#96;comparison.variants.slice(1)&#96; with no null guard, unlike its sibling helpers &#96;renderKpiTable&#96;/&#96;renderDeltaTimeline&#96;/&#96;renderYearTable&#96; (unchanged, presumably already null-tolerant to support the documented default). This is a new, unguarded dereference added by this Slice on a call shape the function's own signature says it supports; if any caller (current or future) invokes the exported renderer before a comparison exists — the exact scenario the &#96;comparison = null&#96; default exists for — it now throws &#96;TypeError: Cannot read properties of null (reading 'variants')&#96; and breaks the whole comparison render instead of degrading gracefully like the other three sections. No test in this diff (or referenced) calls &#96;renderStressReplayComparisonV1({})&#96;/&#96;renderStressReplayComparisonV1()&#96; to exercise this path; all renderer tests pass an explicit non-null &#96;comparison&#96;.
- Akzeptanztest: VALIDATE: ["shell","npm test"]
- Statusbegründung: The unguarded &#96;comparison.variants.slice(1)&#96; dereference inside &#96;renderPrioritizedHighlights&#96; is now preceded by &#96;if (!comparison) return '';&#96;, matching the null-tolerant pattern of the three sibling section renderers. A direct regression test calling &#96;renderStressReplayComparisonV1()&#96; with no arguments (the exact default-parameter path the finding targeted) asserts the neutral idle message renders and no highlight markup is emitted. The bound fingerprint-matched attestation (&#96;validation-6eafe8d8161c&#96;, PASS) satisfies the required &#96;VALIDATE: ["shell","npm test"]&#96; acceptance test. Verified directly against the supplied diff.

### `C-06` — `OPEN`

- Quelle: `claude`; Runde 2
- Klasse: `OBSERVATION`
- Finding: The new &#96;renderPrioritizedHighlights&#96; null-guard (and the pre-existing tolerance in &#96;renderKpiTable&#96;/&#96;renderDeltaTimeline&#96;/&#96;renderYearTable&#96;) only protects against a strictly falsy &#96;comparison&#96;. None of the four section renderers guard against a truthy-but-malformed &#96;comparison&#96; (e.g. missing &#96;variants&#96;/&#96;pairwise&#96;), so any future caller that passes a partially-constructed or optimistic placeholder object (rather than &#96;null&#96;) instead of the documented all-or-nothing shape would still throw, with no test currently exercising that shape boundary.
- Akzeptanztest: Add one regression test (in &#96;tests/stress-replay-renderer.test.mjs&#96;) that documents the implicit contract by calling &#96;renderStressReplayComparisonV1({ comparison: {} })&#96; (or similar minimally-shaped truthy object) and asserting either a graceful degrade or an intentionally documented throw, so the all-or-nothing shape contract is explicit rather than implied.
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The setup summary (&#96;updateMonteCarloSetupSummary&#96;) intentionally echoes raw, unnormalized field strings (e.g. leading zeros, transient partial input) with no formatting/validation layer; this is explicitly by design per the slice notes and Test 1, but could surface confusing values to users mid-edit in later slices that add validation. | OBSERVATION | angenommen | offen |
| C-02 | claude | After a successful run, &#96;completeMonteCarloCockpitRun()&#96; collapses &#96;#mcSetupDisclosure&#96;, which also visually hides &#96;#mcButton&#96; (nested inside the &#96;&lt;details&gt;&#96; content) even though &#96;.click()&#96; delegation from &#96;#mcRecalculateButton&#96; still functions programmatically. Any future code path that calls &#96;mcButton.focus()&#96; directly (bypassing the existing &#96;terminalFocusTarget&#96; fallback logic that already prefers &#96;resultRegion&#96;) would silently fail to move focus while the disclosure is collapsed. | OBSERVATION | angenommen | offen |
| C-03 | claude | &#96;initMonteCarloResultCockpit&#96; attaches &#96;click&#96;/&#96;keydown&#96; listeners to all 5 result tabs (in addition to the pre-existing recalculate-button listener) with no guard against re-invocation; the existing "idempotent init" test only asserts state consistency, not listener-count stability, so a future slice or runtime path that calls &#96;initMonteCarloResultCockpit&#96; more than once per &#96;documentRef&#96; (e.g., a hot-reload or dynamic re-init path) would silently stack duplicate tab click/keydown handlers, causing duplicated &#96;activateMonteCarloResultView&#96; calls and duplicated &#96;preventDefault&#96;/focus side effects on every keypress. | OBSERVATION | angenommen | erledigt: The requested regression test now exists verbatim: Test 1 in &#96;mc-result-cockpit.test.mjs&#96; calls &#96;initMonteCarloResultCockpit&#96; twice on the same &#96;documentRef&#96; and asserts &#96;listeners.get('click').length === 1&#96; for a result tab and for the new replay backlink button, proving init does not stack duplicate click handlers. |
| C-04 | claude | &#96;updateStressReplayStepStates&#96; derives &#96;stressReplayStepSelect&#96;'s &#96;data-step-state&#96; as &#96;'completed'&#96; once a workspace exists (&#96;hasWorkspace&#96; true), but no test in &#96;stress-replay-ui.test.mjs&#96; or &#96;browser-smoke.test.mjs&#96; asserts this specific transition (only the &#96;'active'&#96;/no-workspace state and the path/variant states after a workspace exists are covered). | OBSERVATION | angenommen | erledigt: The exact acceptance test requested (assert &#96;stressReplayStepSelect.dataset.stepState === 'completed'&#96; once &#96;hasWorkspace&#96; resolves) now exists verbatim in &#96;tests/stress-replay-ui.test.mjs&#96; Test 8, immediately after the asynchronous import resolution block. Verified directly in the supplied diff; closing as originally-reporting reviewer. |
| C-05 | claude | &#96;renderStressReplayComparisonV1({ comparison = null, ... })&#96; retains its pre-existing (unchanged) &#96;comparison = null&#96; default and, per its own template, unconditionally executes &#96;${renderPrioritizedHighlights(comparison)}&#96; as part of the single always-returned template — there is no early return before this line for the "no comparison yet" state. &#96;renderPrioritizedHighlights&#96; immediately does &#96;comparison.variants.slice(1)&#96; with no null guard, unlike its sibling helpers &#96;renderKpiTable&#96;/&#96;renderDeltaTimeline&#96;/&#96;renderYearTable&#96; (unchanged, presumably already null-tolerant to support the documented default). This is a new, unguarded dereference added by this Slice on a call shape the function's own signature says it supports; if any caller (current or future) invokes the exported renderer before a comparison exists — the exact scenario the &#96;comparison = null&#96; default exists for — it now throws &#96;TypeError: Cannot read properties of null (reading 'variants')&#96; and breaks the whole comparison render instead of degrading gracefully like the other three sections. No test in this diff (or referenced) calls &#96;renderStressReplayComparisonV1({})&#96;/&#96;renderStressReplayComparisonV1()&#96; to exercise this path; all renderer tests pass an explicit non-null &#96;comparison&#96;. | BLOCKER | angenommen | erledigt: The unguarded &#96;comparison.variants.slice(1)&#96; dereference inside &#96;renderPrioritizedHighlights&#96; is now preceded by &#96;if (!comparison) return '';&#96;, matching the null-tolerant pattern of the three sibling section renderers. A direct regression test calling &#96;renderStressReplayComparisonV1()&#96; with no arguments (the exact default-parameter path the finding targeted) asserts the neutral idle message renders and no highlight markup is emitted. The bound fingerprint-matched attestation (&#96;validation-6eafe8d8161c&#96;, PASS) satisfies the required &#96;VALIDATE: ["shell","npm test"]&#96; acceptance test. Verified directly against the supplied diff. |
| C-06 | claude | The new &#96;renderPrioritizedHighlights&#96; null-guard (and the pre-existing tolerance in &#96;renderKpiTable&#96;/&#96;renderDeltaTimeline&#96;/&#96;renderYearTable&#96;) only protects against a strictly falsy &#96;comparison&#96;. None of the four section renderers guard against a truthy-but-malformed &#96;comparison&#96; (e.g. missing &#96;variants&#96;/&#96;pairwise&#96;), so any future caller that passes a partially-constructed or optimistic placeholder object (rather than &#96;null&#96;) instead of the documented all-or-nothing shape would still throw, with no test currently exercising that shape boundary. | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

## Rückdokumentation in die Arbeitsplan-MD

Arbeitsplan: `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`.
Der Arbeitsplan selbst blieb schreibgeschützt; die orchestratorseitigen
Audit-Blöcke wurden von Codex nicht geändert.

## Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
