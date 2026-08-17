# Slice 06 – Abschlusskorrektur

**Feature-Branch:** `feature/mc-ergebnis-cockpit`
**GitHub-Status:** nur lokal

## Ziel des Slice

Abschlusskorrektur

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `CHANGELOG.md`, `Handbuch.html`, `README.md`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-main-init.js`, `app/simulator/simulator-results.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-implement-06-abschlusskorrektur.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

- Branch vor Umsetzung geprüft: `feature/mc-ergebnis-cockpit` entspricht dem Ziel-Branch.
- Vorbestehende Änderungen beschränkten sich auf den orchestratorverwalteten Auditbericht sowie dieses vom Orchestrator angelegte Slice-Dokument.
- Diff-Risiko: Die CSS-Korrektur übersteuert gezielt die native Geschlossen-Darstellung des Setup-`details`. Deshalb blendet sie alle übrigen Setup-Kinder weiterhin aus und macht den kanonischen Startbutton nach dem Skip-Link-Muster ausschließlich bei tatsächlichem Fokus sichtbar.

## Geplante Tests

- Syntaxprüfung des geänderten Browser-Smoke-Tests.
- Fokussierter Browser-Smoke für die Sequenz Erfolg → Folgelauf → Abbruch und die sichtbare Fokusreaktivierung.
- Autoritative Validierungsmatrix durch den Orchestrator.

## Durchgeführte Änderungen

- `simulator.css`: Der kanonische Monte-Carlo-Startbutton bleibt bei geschlossenem Setup programmatisch fokussierbar und wird bei Fokus sichtbar; alle übrigen Setup-Inhalte bleiben eingeklappt.
- `tests/browser-smoke.test.mjs`: Regressionstest für einen nach erfolgreichem Lauf abgebrochenen Folgelauf; geprüft werden geschlossenes Setup, aktives Fokuselement und sichtbare Button-Geometrie. Der vorhandene Drucktest prüft zusätzlich, dass nicht nur der Setup-Container, sondern auch seine Feldgruppen sichtbar bleiben.

## Ausgeführte Validierung mit Ergebnis

- `node --check tests/browser-smoke.test.mjs`: erfolgreich.
- `npm run test:browser`: im Agent-Sandbox vor Testausführung an `listen EPERM 127.0.0.1` gescheitert; die autoritative Browser-Validierung bleibt beim Orchestrator.
- Isolierter Playwright-Probelauf ohne Webserver: nicht ausführbar, da im Agent-Sandbox kein Playwright-Browser installiert ist.

## Abweichungen vom Plan

Keine fachlichen Abweichungen. Die vollständige Browser-Validierung wird entsprechend dem Orchestrator-Vertrag außerhalb des Agent-Sandboxes ausgeführt.

## Offene Risiken

- Die visuelle Browserprüfung konnte lokal im Agent-Sandbox nicht ausgeführt werden; Syntax und Selektor-Scope wurden lokal geprüft, die Laufzeitprüfung übernimmt der Orchestrator.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-ed75218fa8ec`
- Testdateien: `tests/browser-smoke.test.mjs`
- Eigene Findings: `C-01`, `C-02`, `C-03`, `C-04`, `C-05`, `C-06`, `C-07`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-ed75218fa8ec`
- Testdateien: `tests/browser-smoke.test.mjs`
- Prüfdimensionen: CSS skip-link selector specificity and ::details-content compatibility, screen vs print media isolation for setup fieldsets, terminal cancellation focus restoration on collapsed disclosure, DOM mutation and teardown isolation in browser-smoke assertions
- Größtes Restrisiko: Structural HTML refactoring wrapping #mcButton in a container div inside .mc-setup-content could invalidate direct-child CSS selectors (:not(#mcButton)) and suppress focus visibility
- Realistische Bruchbedingung: A future developer wraps Monte Carlo action buttons into a flex container (.mc-setup-actions) inside .mc-setup-content without updating simulator.css, causing the parent container to be matched by :not(#mcButton) with display:none !important, rendering #mcButton completely hidden when the disclosure is collapsed
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
- `C-01` Antwort 1: **angenommen** — Slice 02 führt keine Eingabevalidierung ein; der weiterhin rohe Echo-Vertrag ist im Slice-Dokument ausdrücklich festgehalten.
- `C-01` Antwort 2: **angenommen** — Slice 03 führt keine Eingabevalidierung ein; der dokumentierte rohe Setup-Echo-Vertrag bleibt unverändert.
- `C-01` Antwort 3: **angenommen** — Slice 04 führt keine Eingabevalidierung ein; der dokumentierte rohe Setup-Echo-Vertrag bleibt unverändert.
- `C-01` Antwort 4: **angenommen** — Slice 04 führt weiterhin keine Eingabevalidierung ein; der dokumentierte rohe Setup-Echo-Vertrag bleibt unverändert.
- `C-01` Antwort 5: **angenommen** — Slice 05 führt keine Eingabevalidierung ein; der dokumentierte rohe Setup-Echo-Vertrag bleibt unverändert.
- `C-01` Antwort 6: **angenommen** — Der rohe Setup-Echovertrag ist implementiert und dokumentiert; die Formulierung „validierte UI-Werte“ bleibt als begriffliches Restrisiko bestehen.
- `C-02` Antwort 1: **angenommen** — Der Hidden-when-collapsed-Vertrag von mcButton ist im Slice-Dokument festgehalten; Erfolgsfokus aktiviert Überblick und fokussiert den sichtbaren Ergebnisbereich.
- `C-02` Antwort 2: **angenommen** — Es wurde kein direkter Fokus auf den eingeklappten mcButton ergänzt; neue Fokuspfade aktivieren sichtbare Replay-Ziele.
- `C-02` Antwort 3: **angenommen** — Es wurde kein Fokuspfad auf den eingeklappten mcButton ergänzt; die neuen Vergleichs-Untertabs arbeiten ausschließlich im sichtbaren Replay-Bereich.
- `C-02` Antwort 4: **angenommen** — Es wurde kein Fokuspfad auf den eingeklappten mcButton ergänzt; Vergleichs-Untertabs bleiben im sichtbaren Replay-Bereich.
- `C-02` Antwort 5: **angenommen** — Es wurde kein Fokuspfad auf den eingeklappten mcButton ergänzt; sichtbare Ergebnis- und Replay-Ziele bleiben der Fokusvertrag.
- `C-02` Antwort 6: **angenommen** — Der Folgelauf-Abbruch kann den verborgenen kanonischen Startbutton tatsächlich fokussieren; dies sollte durch Öffnen des Setups oder ein sichtbares alternatives Fokusziel korrigiert werden.
- `C-02` Antwort 7: **angenommen** — Der Abbruch eines Folgelaufs fokussiert nun einen sichtbar eingeblendeten kanonischen Startbutton; der Regressionstest prüft Fokus, Geometrie und Druckdarstellung.
- `C-03` Antwort 1: **angenommen** — Die bestehende dokumentbezogene Initialisierungssperre ist nun durch explizite Listener-Kardinalitätstests für Tabs und Replay-Rückverweis abgesichert.
- `C-04` Antwort 1: **angenommen** — Der asynchrone Importtest prüft nun explizit, dass stressReplayStepSelect nach erfolgreichem Workspace-Aufbau den Zustand completed erhält.
- `C-05` Antwort 1: **angenommen** — Der Kernaussagen-Helper behandelt null defensiv; ein Regressionstest bestätigt, dass renderStressReplayComparisonV1() die neutrale Idle-Meldung liefert, ohne Highlights zu rendern.
- `C-06` Antwort 1: **angenommen** — Slice 05 verändert weder Renderer-Shape noch Vergleichsdatenvertrag; die Beobachtung bleibt für eine spätere explizite Contractprüfung offen.
- `C-06` Antwort 2: **angenommen** — Der Vergleichsrenderer setzt weiterhin einen vollständigen All-or-nothing-Shape voraus; ein Regressionstest oder defensives Shape-Gate fehlt.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-ed75218fa8ec`

- Diff-Fingerprint: `ed75218fa8ecde50cae3ddacdaf829975f80be4a4a418e75ddb696ce00cd6fd8`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `653a952f63454f3ca337984faa7046839bb26e7b55dcf68ecc77e7f26f950122`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 181 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[185476 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure cause is a Simulator.html markup refactor (e.g. wrapping &#96;#mcButton&#96; in a new container div, or moving it out of &#96;.mc-setup-content&#96;) done in an unrelated slice that doesn't touch &#96;simulator.css&#96;; the &#96;&gt; :not(#mcButton)&#96; direct-child selector then silently stops matching, the skip-link reveal-on-focus rule no longer applies to the actual button, and the dead-focus-target regression C-02 originally described reappears — caught only if the existing &#96;cancelledRerunFocus&#96; browser-smoke assertion is still wired into the authoritative validation matrix at that time.
  - Ereignis 3: In three months, the most likely failure cause is an HTML restructuring of the Monte-Carlo setup panel where #mcButton is placed inside an action container or footer toolbar within .mc-setup-content without adjusting the direct-child selector (.mc-setup-disclosure:not([open]) &gt; .mc-setup-content &gt; :not(#mcButton)), causing the entire container including #mcButton to be hidden when the disclosure is closed and breaking focus restoration on cancellation.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `CLOSED`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The setup summary (&#96;updateMonteCarloSetupSummary&#96;) intentionally echoes raw, unnormalized field strings (e.g. leading zeros, transient partial input) with no formatting/validation layer; this is explicitly by design per the slice notes and Test 1, but could surface confusing values to users mid-edit in later slices that add validation.
- Akzeptanztest: Add a formatting/normalization pass (or explicit "raw echo" documentation note) once a later slice introduces input validation for these fields, and add a regression test asserting the summary reflects normalized rather than raw values at that point.
- Statusbegründung: Raw-echo setup summary is explicitly by-design, documented in every Slice doc, and unchanged through Slice 05 with no validation layer introduced anywhere in the branch. No further slice will retroactively normalize it; closing as accepted-by-design, non-issue for this branch's scope.

### `C-02` — `CLOSED`

- Quelle: `claude`; Runde 1
- Klasse: `BLOCKER`
- Finding: After a successful run, &#96;completeMonteCarloCockpitRun()&#96; collapses &#96;#mcSetupDisclosure&#96;, which also visually hides &#96;#mcButton&#96; (nested inside the &#96;&lt;details&gt;&#96; content) even though &#96;.click()&#96; delegation from &#96;#mcRecalculateButton&#96; still functions programmatically. Any future code path that calls &#96;mcButton.focus()&#96; directly (bypassing the existing &#96;terminalFocusTarget&#96; fallback logic that already prefers &#96;resultRegion&#96;) would silently fail to move focus while the disclosure is collapsed.
- Akzeptanztest: Add a targeted test asserting focus/interaction behavior when a future slice adds any direct &#96;mcButton.focus()&#96; call while the disclosure is collapsed, or document the hidden-when-collapsed contract next to &#96;mcButton&#96; in the slice docs so later slices don't reintroduce a focus target that has become invisible.
- Statusbegründung: The exact reachable regression C-02 identified (dead focus target on &#96;#mcButton&#96; after collapse) is directly remediated: the CSS keeps &#96;#mcButton&#96; an off-screen-but-focusable skip-link-style target while the setup is collapsed, covering both legacy and modern &#96;&lt;details&gt;&#96; collapse mechanisms, and a new browser-driven regression test exercises the precise success→recalculate→cancel path and asserts focus lands on a genuinely visible, non-zero-width button. The bound fingerprint-matched attestation (&#96;validation-ed75218fa8ec&#96;, PASS) covers this exact diff. Verified directly against the supplied diff; closing as originally-reporting reviewer.

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

### `C-06` — `CLOSED`

- Quelle: `claude`; Runde 2
- Klasse: `OBSERVATION`
- Finding: The new &#96;renderPrioritizedHighlights&#96; null-guard (and the pre-existing tolerance in &#96;renderKpiTable&#96;/&#96;renderDeltaTimeline&#96;/&#96;renderYearTable&#96;) only protects against a strictly falsy &#96;comparison&#96;. None of the four section renderers guard against a truthy-but-malformed &#96;comparison&#96; (e.g. missing &#96;variants&#96;/&#96;pairwise&#96;), so any future caller that passes a partially-constructed or optimistic placeholder object (rather than &#96;null&#96;) instead of the documented all-or-nothing shape would still throw, with no test currently exercising that shape boundary.
- Akzeptanztest: Add one regression test (in &#96;tests/stress-replay-renderer.test.mjs&#96;) that documents the implicit contract by calling &#96;renderStressReplayComparisonV1({ comparison: {} })&#96; (or similar minimally-shaped truthy object) and asserting either a graceful degrade or an intentionally documented throw, so the all-or-nothing shape contract is explicit rather than implied.
- Statusbegründung: Reviewed all current call sites of &#96;renderStressReplayComparisonV1&#96;/section renderers across the final diff: every live caller passes either the strict default (&#96;null&#96;, now guarded) or a &#96;comparison&#96; object built end-to-end by the internal &#96;computeComparison&#96;/&#96;buildStressReplayComparisonV1&#96; pipeline, which always populates &#96;variants&#96; and &#96;pairwise&#96; together atomically — no code path in this branch constructs or passes a partially-built truthy placeholder. The all-or-nothing shape gap therefore has no reachable exploit in shipped code; closing as non-issue for current scope. Residual defense-in-depth risk (a future optimistic/incremental comparison-preview feature could reintroduce it) is retained below as a non-actionable residual risk per the no-new-OBSERVATION rule for final review.

### `C-07` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The new &#96;cancelledRerunFocus&#96; assertion block in &#96;tests/browser-smoke.test.mjs&#96; mutates page/focus state inside &#96;page.evaluate&#96; (including the &#96;setup.open = true&#96; cleanup) with no try/finally guard around the preceding assertions; if a future regression makes any statement before the reset throw, the cleanup is skipped and stale disclosure/focus state can leak into subsequent assertions later in the same smoke run, producing a confusing unrelated failure instead of a clean isolated one. This mirrors an already-known, previously-accepted pattern elsewhere in this file (print-state block), so it is non-blocking, but it is a second, independent instance introduced by this Slice.
- Akzeptanztest: Wrap the state-mutating portion of the &#96;cancelledRerunFocus&#96; &#96;page.evaluate&#96; block (or an outer Node-side try/finally around the whole smoke section) so &#96;setup.open&#96; is always restored even if an earlier assertion inside the block throws, and add a note in &#96;tests/README.md&#96; documenting the accepted "reset inside evaluate" convention for this file.
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The setup summary (&#96;updateMonteCarloSetupSummary&#96;) intentionally echoes raw, unnormalized field strings (e.g. leading zeros, transient partial input) with no formatting/validation layer; this is explicitly by design per the slice notes and Test 1, but could surface confusing values to users mid-edit in later slices that add validation. | OBSERVATION | angenommen | erledigt: Raw-echo setup summary is explicitly by-design, documented in every Slice doc, and unchanged through Slice 05 with no validation layer introduced anywhere in the branch. No further slice will retroactively normalize it; closing as accepted-by-design, non-issue for this branch's scope. |
| C-02 | claude | After a successful run, &#96;completeMonteCarloCockpitRun()&#96; collapses &#96;#mcSetupDisclosure&#96;, which also visually hides &#96;#mcButton&#96; (nested inside the &#96;&lt;details&gt;&#96; content) even though &#96;.click()&#96; delegation from &#96;#mcRecalculateButton&#96; still functions programmatically. Any future code path that calls &#96;mcButton.focus()&#96; directly (bypassing the existing &#96;terminalFocusTarget&#96; fallback logic that already prefers &#96;resultRegion&#96;) would silently fail to move focus while the disclosure is collapsed. | BLOCKER | angenommen | erledigt: The exact reachable regression C-02 identified (dead focus target on &#96;#mcButton&#96; after collapse) is directly remediated: the CSS keeps &#96;#mcButton&#96; an off-screen-but-focusable skip-link-style target while the setup is collapsed, covering both legacy and modern &#96;&lt;details&gt;&#96; collapse mechanisms, and a new browser-driven regression test exercises the precise success→recalculate→cancel path and asserts focus lands on a genuinely visible, non-zero-width button. The bound fingerprint-matched attestation (&#96;validation-ed75218fa8ec&#96;, PASS) covers this exact diff. Verified directly against the supplied diff; closing as originally-reporting reviewer. |
| C-03 | claude | &#96;initMonteCarloResultCockpit&#96; attaches &#96;click&#96;/&#96;keydown&#96; listeners to all 5 result tabs (in addition to the pre-existing recalculate-button listener) with no guard against re-invocation; the existing "idempotent init" test only asserts state consistency, not listener-count stability, so a future slice or runtime path that calls &#96;initMonteCarloResultCockpit&#96; more than once per &#96;documentRef&#96; (e.g., a hot-reload or dynamic re-init path) would silently stack duplicate tab click/keydown handlers, causing duplicated &#96;activateMonteCarloResultView&#96; calls and duplicated &#96;preventDefault&#96;/focus side effects on every keypress. | OBSERVATION | angenommen | erledigt: The requested regression test now exists verbatim: Test 1 in &#96;mc-result-cockpit.test.mjs&#96; calls &#96;initMonteCarloResultCockpit&#96; twice on the same &#96;documentRef&#96; and asserts &#96;listeners.get('click').length === 1&#96; for a result tab and for the new replay backlink button, proving init does not stack duplicate click handlers. |
| C-04 | claude | &#96;updateStressReplayStepStates&#96; derives &#96;stressReplayStepSelect&#96;'s &#96;data-step-state&#96; as &#96;'completed'&#96; once a workspace exists (&#96;hasWorkspace&#96; true), but no test in &#96;stress-replay-ui.test.mjs&#96; or &#96;browser-smoke.test.mjs&#96; asserts this specific transition (only the &#96;'active'&#96;/no-workspace state and the path/variant states after a workspace exists are covered). | OBSERVATION | angenommen | erledigt: The exact acceptance test requested (assert &#96;stressReplayStepSelect.dataset.stepState === 'completed'&#96; once &#96;hasWorkspace&#96; resolves) now exists verbatim in &#96;tests/stress-replay-ui.test.mjs&#96; Test 8, immediately after the asynchronous import resolution block. Verified directly in the supplied diff; closing as originally-reporting reviewer. |
| C-05 | claude | &#96;renderStressReplayComparisonV1({ comparison = null, ... })&#96; retains its pre-existing (unchanged) &#96;comparison = null&#96; default and, per its own template, unconditionally executes &#96;${renderPrioritizedHighlights(comparison)}&#96; as part of the single always-returned template — there is no early return before this line for the "no comparison yet" state. &#96;renderPrioritizedHighlights&#96; immediately does &#96;comparison.variants.slice(1)&#96; with no null guard, unlike its sibling helpers &#96;renderKpiTable&#96;/&#96;renderDeltaTimeline&#96;/&#96;renderYearTable&#96; (unchanged, presumably already null-tolerant to support the documented default). This is a new, unguarded dereference added by this Slice on a call shape the function's own signature says it supports; if any caller (current or future) invokes the exported renderer before a comparison exists — the exact scenario the &#96;comparison = null&#96; default exists for — it now throws &#96;TypeError: Cannot read properties of null (reading 'variants')&#96; and breaks the whole comparison render instead of degrading gracefully like the other three sections. No test in this diff (or referenced) calls &#96;renderStressReplayComparisonV1({})&#96;/&#96;renderStressReplayComparisonV1()&#96; to exercise this path; all renderer tests pass an explicit non-null &#96;comparison&#96;. | BLOCKER | angenommen | erledigt: The unguarded &#96;comparison.variants.slice(1)&#96; dereference inside &#96;renderPrioritizedHighlights&#96; is now preceded by &#96;if (!comparison) return '';&#96;, matching the null-tolerant pattern of the three sibling section renderers. A direct regression test calling &#96;renderStressReplayComparisonV1()&#96; with no arguments (the exact default-parameter path the finding targeted) asserts the neutral idle message renders and no highlight markup is emitted. The bound fingerprint-matched attestation (&#96;validation-6eafe8d8161c&#96;, PASS) satisfies the required &#96;VALIDATE: ["shell","npm test"]&#96; acceptance test. Verified directly against the supplied diff. |
| C-06 | claude | The new &#96;renderPrioritizedHighlights&#96; null-guard (and the pre-existing tolerance in &#96;renderKpiTable&#96;/&#96;renderDeltaTimeline&#96;/&#96;renderYearTable&#96;) only protects against a strictly falsy &#96;comparison&#96;. None of the four section renderers guard against a truthy-but-malformed &#96;comparison&#96; (e.g. missing &#96;variants&#96;/&#96;pairwise&#96;), so any future caller that passes a partially-constructed or optimistic placeholder object (rather than &#96;null&#96;) instead of the documented all-or-nothing shape would still throw, with no test currently exercising that shape boundary. | OBSERVATION | angenommen | erledigt: Reviewed all current call sites of &#96;renderStressReplayComparisonV1&#96;/section renderers across the final diff: every live caller passes either the strict default (&#96;null&#96;, now guarded) or a &#96;comparison&#96; object built end-to-end by the internal &#96;computeComparison&#96;/&#96;buildStressReplayComparisonV1&#96; pipeline, which always populates &#96;variants&#96; and &#96;pairwise&#96; together atomically — no code path in this branch constructs or passes a partially-built truthy placeholder. The all-or-nothing shape gap therefore has no reachable exploit in shipped code; closing as non-issue for current scope. Residual defense-in-depth risk (a future optimistic/incremental comparison-preview feature could reintroduce it) is retained below as a non-actionable residual risk per the no-new-OBSERVATION rule for final review. |
| C-07 | claude | The new &#96;cancelledRerunFocus&#96; assertion block in &#96;tests/browser-smoke.test.mjs&#96; mutates page/focus state inside &#96;page.evaluate&#96; (including the &#96;setup.open = true&#96; cleanup) with no try/finally guard around the preceding assertions; if a future regression makes any statement before the reset throw, the cleanup is skipped and stale disclosure/focus state can leak into subsequent assertions later in the same smoke run, producing a confusing unrelated failure instead of a clean isolated one. This mirrors an already-known, previously-accepted pattern elsewhere in this file (print-state block), so it is non-blocking, but it is a second, independent instance introduced by this Slice. | OBSERVATION | offen | offen |
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
