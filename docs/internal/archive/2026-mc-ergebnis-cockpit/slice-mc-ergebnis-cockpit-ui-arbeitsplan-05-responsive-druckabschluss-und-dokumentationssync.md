# Slice 05 – Responsive-/Druckabschluss und Dokumentationssync

**Feature-Branch:** `feature/mc-ergebnis-cockpit`
**GitHub-Status:** nur lokal

## Ziel des Slice

Responsive-/Druckabschluss und Dokumentationssync

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `CHANGELOG.md`, `Handbuch.html`, `README.md`,
`docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`,
`docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-05-responsive-druckabschluss-und-dokumentationssync.md`,
`docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`,
`tests/README.md` sowie die automatisch freigegebene Remediation in
`simulator.css` und `tests/browser-smoke.test.mjs`.

## Diff-Risiko inklusive Branch- und Statuscheck

- Branch vor Umsetzung: `feature/mc-ergebnis-cockpit` (Soll/Ist identisch).
- Ausgangsstatus: nur das orchestratorverwaltete Gesamtaudit war geaendert;
  die Slice-Datei war vom Orchestrator neu angelegt. Beide Pfade liegen in der
  aktuellen Allowlist; verwaltete Audit-Bloecke wurden nicht editiert.
- Diff-Risiko: Dokumentationssynchronisation plus CSS-basierte
  Druckprojektion ohne produktive Fachsemantik. Hauptgefahr sind Aussagen
  oder Printselektoren, die vom implementierten DOM-, Fokus- oder
  Druckvertrag abweichen.

## Geplante Tests

- Strukturelle Text-/HTML-Plausibilisierung der geaenderten Dokumente.
- Pfadkontrolle gegen die aktuelle Slice-Allowlist.
- `npm test` und `npm run test:browser` bleiben die orchestratorseitigen
  Abschlussgates; Codex startet die volle Matrix in diesem Work Unit nicht.

## Durchgeführte Änderungen

- README und Handbuch beschreiben den Bedienweg Setup, Laufkopf,
  Ergebnisansichten und Replay sowie die feste, nicht empfehlende Prioritaet
  der Replay-Kernaussage.
- Technische Referenzen dokumentieren `mc-result-cockpit.js`, den zentralen
  Aktivierungs-/Fokuspfad, den stabilen Selector-Rerender und den CSS-basierten
  Responsive-/Druckvertrag.
- Die Testdokumentation inventarisiert den fokussierten Cockpit-Test und die
  erweiterte Browserabdeckung fuer Tastatur, Fokus, Viewports und Druck.
- Das Changelog benennt die UI-Neuordnung ausdruecklich ohne Aenderung der
  Monte-Carlo-, Engine-, Persistenz- oder Exportsemantik.
- Die freigegebene Remediation macht geschlossenes Setup, inaktive MC-Panels,
  geschlossene Replay-Diagnosedetails und alle Vergleichssektionen im Druck
  sichtbar. Navigation, reine Umschaltaktionen, Sticky-Positionierung sowie
  feste Hoehen und abschneidendes Overflow werden im Druck deaktiviert.
- Der Browser-Smoke prueft zusaetzlich die Zielbreiten 320, 768, 900, 1280
  und 1600 CSS-Pixel sowie den vollstaendigen Printzustand.

## Ausgeführte Validierung mit Ergebnis

- `node --check tests/browser-smoke.test.mjs`: bestanden.
- `node tests/run-single.mjs tests/mc-result-cockpit.test.mjs`: bestanden
  (65/65 Assertions).
- Statischer Printselektor-Contract fuer Setup, MC-Panels,
  Vergleichspanels, Diagnosedetails und Tabellenkoepfe: bestanden.
- `git diff --check`: bestanden.
- Branch-/Status- und Pfadkontrolle: bestanden; alle Aenderungen liegen in
  der aktuellen Allowlist. Das geaenderte Gesamtaudit ist
  orchestratorverwaltet und wurde von Codex nicht editiert.
- Ein fokussierter lokaler Chromium-Lauf konnte im Agent-Sandboxprozess nicht
  gestartet werden: Das Binden eines lokalen Testservers wurde mit
  `PermissionError: [Errno 1] Operation not permitted` blockiert; der
  serverlose Ersatzlauf traf auf das in dieser Laufzeit nicht installierte
  Playwright-Chromium-Binary. Das ist kein fachliches Gate; die autoritative
  Browsermatrix laeuft beim Orchestrator ausserhalb dieser Sandbox.
- Autoritative `npm test`-/Browser-Ergebnisse werden durch den Orchestrator
  projiziert; die verwaltete Attestierung bleibt unberuehrt.

## Abweichungen vom Plan

Beim Soll-/Ist-Abgleich wurde eine vorgelagerte Druckabweichung gefunden. Sie
wurde ueber die automatisch freigegebene Remediation in `simulator.css` und
`tests/browser-smoke.test.mjs` behoben und nachgewiesen. Es wurden keine
Screenshots oder Build-/Releaseartefakte geaendert.

## Offene Risiken

- Die abschliessende reale Browser-/Printdarstellung ist an die
  orchestratorseitige Browsermatrix gebunden.
- `C-01`, `C-02` und `C-06` bleiben Reviewer-Beobachtungen; Slice 05 fuehrt
  weder Eingabevalidierung noch neue Fokusziele oder Renderer-Shape-Semantik
  ein und schliesst sie daher nicht selbst.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-b128250d914c`
- Testdateien: `tests/README.md`, `tests/browser-smoke.test.mjs`
- Prüfdimensionen: path/scope conformance vs. declared allowlist and REMEDIATION_PATHS precedent, print-media CSS correctness for &#96;&lt;details&gt;&#96;/&#96;hidden&#96;-attribute override semantics, doc-vs-implementation factual accuracy, and test/failure-path robustness (DOM mutation/restoration idempotency) of the new browser-smoke assertions, plus non-interference with prior Slices' business logic
- Größtes Restrisiko: the unguarded (no try/finally) DOM mutation/restore sequence in the new print-state smoke block (C-07) could turn a genuine print-CSS regression into a confusing multi-assertion failure cascade
- Realistische Bruchbedingung: a future change narrows or removes one of the new print selectors (e.g. &#96;.mc-view-panel[hidden]&#96;), the corresponding assertion throws, and the un-restored &#96;setup.open = false&#96;/&#96;banner.hidden = false&#96;/&#96;diagnostics.open = false&#96;/orphaned probe &#96;&lt;table&gt;&#96; state causes an unrelated-looking failure or false pass in a later assertion of the same smoke run
- Eigene Findings: `C-01`, `C-02`, `C-03`, `C-04`, `C-05`, `C-06`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-b128250d914c`
- Testdateien: `tests/README.md`, `tests/browser-smoke.test.mjs`
- Prüfdimensionen: Checked scope conformance across declared allowlist, CSS print media override mechanics (&#96;!important&#96; display/overflow/position rules for disclosures and hidden panels), multi-viewport responsive behavior (320px–1600px page overflow invariants), documentation parity across README/Handbuch/Technical docs, and DOM state mutation/restoration in browser smoke tests
- Größtes Restrisiko: Unprotected DOM mutation and probe element cleanup in browser-smoke print assertions without a try/finally guard, creating potential state contamination if an intermediate assertion fails
- Realistische Bruchbedingung: A regression in a print CSS rule causes an assertion throw before reaching the cleanup block, leaving the probe header element attached and disclosure states modified for subsequent test assertions in the same context
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
- `C-01` Antwort 1: **angenommen** — Slice 02 führt keine Eingabevalidierung ein; der weiterhin rohe Echo-Vertrag ist im Slice-Dokument ausdrücklich festgehalten.
- `C-01` Antwort 2: **angenommen** — Slice 03 führt keine Eingabevalidierung ein; der dokumentierte rohe Setup-Echo-Vertrag bleibt unverändert.
- `C-01` Antwort 3: **angenommen** — Slice 04 führt keine Eingabevalidierung ein; der dokumentierte rohe Setup-Echo-Vertrag bleibt unverändert.
- `C-01` Antwort 4: **angenommen** — Slice 04 führt weiterhin keine Eingabevalidierung ein; der dokumentierte rohe Setup-Echo-Vertrag bleibt unverändert.
- `C-01` Antwort 5: **angenommen** — Slice 05 führt keine Eingabevalidierung ein; der dokumentierte rohe Setup-Echo-Vertrag bleibt unverändert.
- `C-02` Antwort 1: **angenommen** — Der Hidden-when-collapsed-Vertrag von mcButton ist im Slice-Dokument festgehalten; Erfolgsfokus aktiviert Überblick und fokussiert den sichtbaren Ergebnisbereich.
- `C-02` Antwort 2: **angenommen** — Es wurde kein direkter Fokus auf den eingeklappten mcButton ergänzt; neue Fokuspfade aktivieren sichtbare Replay-Ziele.
- `C-02` Antwort 3: **angenommen** — Es wurde kein Fokuspfad auf den eingeklappten mcButton ergänzt; die neuen Vergleichs-Untertabs arbeiten ausschließlich im sichtbaren Replay-Bereich.
- `C-02` Antwort 4: **angenommen** — Es wurde kein Fokuspfad auf den eingeklappten mcButton ergänzt; Vergleichs-Untertabs bleiben im sichtbaren Replay-Bereich.
- `C-02` Antwort 5: **angenommen** — Es wurde kein Fokuspfad auf den eingeklappten mcButton ergänzt; sichtbare Ergebnis- und Replay-Ziele bleiben der Fokusvertrag.
- `C-03` Antwort 1: **angenommen** — Die bestehende dokumentbezogene Initialisierungssperre ist nun durch explizite Listener-Kardinalitätstests für Tabs und Replay-Rückverweis abgesichert.
- `C-04` Antwort 1: **angenommen** — Der asynchrone Importtest prüft nun explizit, dass stressReplayStepSelect nach erfolgreichem Workspace-Aufbau den Zustand completed erhält.
- `C-05` Antwort 1: **angenommen** — Der Kernaussagen-Helper behandelt null defensiv; ein Regressionstest bestätigt, dass renderStressReplayComparisonV1() die neutrale Idle-Meldung liefert, ohne Highlights zu rendern.
- `C-06` Antwort 1: **angenommen** — Slice 05 verändert weder Renderer-Shape noch Vergleichsdatenvertrag; die Beobachtung bleibt für eine spätere explizite Contractprüfung offen.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-b128250d914c`

- Diff-Fingerprint: `b128250d914cab8ec4db61511eb0c77620d64940c5f1ab939e5c246f6a09374a`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `8d0ce026d3de45aa4b0869cb8652338b77c647aa4013534e155e8595113e6a36`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 181 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[185477 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Most likely three-month failure cause is exactly C-07's scenario — a later simulator.css edit (e.g. during unrelated CSS cleanup) accidentally weakens one of these new print overrides, the print assertion in browser-smoke.test.mjs fails, and because the restore step never runs, the failure report/triage is muddied by leftover mutated banner/setup/diagnostics state and a stray probe table, delaying root-cause identification of the actual print regression.
  - Ereignis 3: In three months, the most likely failure cause is a future styling refactoring that introduces new nested overflow wrappers or fixed-height containers to the simulator without adding corresponding &#96;@media print&#96; visibility/height resets, causing print output to silently clip content or reintroduce pagination bugs unnoticed by Node-only unit test suites.
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
- Statusbegründung: Carried forward unchanged; the current review supplied no explicit status update.
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
| C-06 | claude | The new &#96;renderPrioritizedHighlights&#96; null-guard (and the pre-existing tolerance in &#96;renderKpiTable&#96;/&#96;renderDeltaTimeline&#96;/&#96;renderYearTable&#96;) only protects against a strictly falsy &#96;comparison&#96;. None of the four section renderers guard against a truthy-but-malformed &#96;comparison&#96; (e.g. missing &#96;variants&#96;/&#96;pairwise&#96;), so any future caller that passes a partially-constructed or optimistic placeholder object (rather than &#96;null&#96;) instead of the documented all-or-nothing shape would still throw, with no test currently exercising that shape boundary. | OBSERVATION | angenommen | offen |
<!-- audit:decision-table:end -->

## Rückdokumentation in die Arbeitsplan-MD

Arbeitsplan: `docs/internal/MC_ERGEBNIS_COCKPIT_UI_ARBEITSPLAN.md` (freigegebene,
schreibgeschuetzte Quelle). Das Orchestrator-Gesamtaudit
`docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md` bleibt in
seinen verwalteten Bloecken unveraendert.

## Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
