# Overall audit – MC_ERGEBNIS_COCKPIT_UI-implement

Dieses Dokument wird vom Orchestrator geführt. Slice-Dokumente entstehen erst beim tatsächlichen Beginn ihrer Implementierung.

- Task-Datei: `inbox/MC_ERGEBNIS_COCKPIT_UI-implement.md`
- Run-ID: `watch-20260817-124540.356556Z-406ad1b9b549`
- Zielbranch: `feature/mc-ergebnis-cockpit`
- Deklarierter Produktscope: `CHANGELOG.md`, `Handbuch.html`, `README.md`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-main-init.js`, `app/simulator/simulator-results.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-01-cockpit-grundstruktur-setup-und-laufkopf.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-02-ergebnis-unteransichten-und-zentraler-aktivierungs-fokuspfad.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-03-replay-schrittkarten-szenarioauswahl-und-asynchroner-fokus.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-04-replay-vergleichsansichten-und-priorisierte-kernaussage.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-05-responsive-druckabschluss-und-dokumentationssync.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`

## Orchestrator-Prüfprotokoll

### Review-Feedback von Claude

<!-- audit:claude-review:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `CHANGELOG.md`, `Handbuch.html`, `README.md`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-main-init.js`, `app/simulator/simulator-results.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-01-cockpit-grundstruktur-setup-und-laufkopf.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-02-ergebnis-unteransichten-und-zentraler-aktivierungs-fokuspfad.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-03-replay-schrittkarten-szenarioauswahl-und-asynchroner-fokus.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-04-replay-vergleichsansichten-und-priorisierte-kernaussage.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-05-responsive-druckabschluss-und-dokumentationssync.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`

Noch kein strukturiertes Reviewereignis.

#### Work Unit 02 – Slice 01

- Auftrag: Cockpit-Grundstruktur, Setup und Laufkopf
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-main-init.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-01-cockpit-grundstruktur-setup-und-laufkopf.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`

### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-17ee7c11b9d2`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`
- Prüfdimensionen: dimensions checked — DOM restructuring integrity (no duplicate IDs/dead markup), idempotent module initialization, lifecycle state-mirroring correctness (disable/busy sync, delegated single-start), success-only disclosure collapse, XSS/injection surface, failure-path null-guards, and test coverage breadth (unit + keyboard + browser lifecycle)
- Größtes Restrisiko: largest residual risk: reliance on &#96;MutationObserver&#96; as the sole safety net for state mirroring in any future code path that mutates &#96;#mcButton&#96; attributes without going through the existing lifecycle methods
- Realistische Bruchbedingung: break condition: a future slice adds a new path that disables/enables &#96;#mcButton&#96; outside &#96;disableStart/enableStart/beginRun/beginCancelling/finishRun&#96; and without triggering an attribute mutation observable by &#96;MutationObserver&#96; (e.g., a different mechanism than &#96;disabled&#96;/&#96;aria-busy&#96;), causing &#96;#mcRecalculateButton&#96; to desync from the canonical start control.
- Eigene Findings: `C-01`, `C-02`

#### Work Unit 03 – Slice 02

- Auftrag: Ergebnis-Unteransichten und zentraler Aktivierungs-/Fokuspfad
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-02-ergebnis-unteransichten-und-zentraler-aktivierungs-fokuspfad.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`

### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-a12562bfea03`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`
- Eigene Findings: `C-01`, `C-02`, `C-03`

#### Work Unit 04 – Slice 03

- Auftrag: Replay-Schrittkarten, Szenarioauswahl und asynchroner Fokus
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-03-replay-schrittkarten-szenarioauswahl-und-asynchroner-fokus.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`, `tests/stress-replay-ui.test.mjs`

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

### Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `CHANGELOG.md`, `Handbuch.html`, `README.md`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-main-init.js`, `app/simulator/simulator-results.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-01-cockpit-grundstruktur-setup-und-laufkopf.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-02-ergebnis-unteransichten-und-zentraler-aktivierungs-fokuspfad.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-03-replay-schrittkarten-szenarioauswahl-und-asynchroner-fokus.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-04-replay-vergleichsansichten-und-priorisierte-kernaussage.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-05-responsive-druckabschluss-und-dokumentationssync.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`

Noch kein strukturiertes Reviewereignis.

#### Work Unit 02 – Slice 01

- Auftrag: Cockpit-Grundstruktur, Setup und Laufkopf
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-main-init.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-01-cockpit-grundstruktur-setup-und-laufkopf.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`

### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-17ee7c11b9d2`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`
- Prüfdimensionen: DOM structural hierarchy and ID uniqueness, idempotent lifecycle registration, start/recalculate action delegation and synchronization across busy/disabled states, disclosure behavior under error/cancel vs success states, XSS-safe textContent projections, responsive stylesheet styling, unit contract test fidelity, and browser smoke test coverage.
- Größtes Restrisiko: Asynchronous DOM manipulations or future view toggles in subsequent slices that mutate or re-render &#96;#mcButton&#96; without notifying &#96;mc-result-cockpit.js&#96; or triggering the MutationObserver attributes filter.
- Realistische Bruchbedingung: A subsequent slice replaces or detaches &#96;#mcButton&#96; dynamically during sub-view switching or re-binds click handlers, causing &#96;#mcRecalculateButton&#96; delegation to trigger an unattached node or stale event handler.
- Eigene Findings: keine

#### Work Unit 03 – Slice 02

- Auftrag: Ergebnis-Unteransichten und zentraler Aktivierungs-/Fokuspfad
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-02-ergebnis-unteransichten-und-zentraler-aktivierungs-fokuspfad.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`

### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-a12562bfea03`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`
- Prüfdimensionen: ARIA tab contracts and roving tabindex keyboard navigation (ArrowLeft/Right wrap, Home/End, focusTab), central activation resolver with panel containment resolution, replay variant badge calculation and MutationObserver lifecycle, main-tab isolation, and exact slice allowlist conformance
- Größtes Restrisiko: Dynamic subtree replacement in subsequent replay slices (Slices 03/04) rebuilding or replacing #stressReplayVariantList DOM nodes without re-binding the variantObserver
- Realistische Bruchbedingung: A future replay refactoring replaces the #stressReplayVariantList container DOM element dynamically rather than mutating its children, causing variantObserver to observe a detached node and leaving the variant badge count permanently out of sync with active scenario variants.
- Eigene Findings: keine

#### Work Unit 04 – Slice 03

- Auftrag: Replay-Schrittkarten, Szenarioauswahl und asynchroner Fokus
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-03-replay-schrittkarten-szenarioauswahl-und-asynchroner-fokus.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`, `tests/stress-replay-ui.test.mjs`

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

### Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `CHANGELOG.md`, `Handbuch.html`, `README.md`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-main-init.js`, `app/simulator/simulator-results.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-01-cockpit-grundstruktur-setup-und-laufkopf.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-02-ergebnis-unteransichten-und-zentraler-aktivierungs-fokuspfad.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-03-replay-schrittkarten-szenarioauswahl-und-asynchroner-fokus.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-04-replay-vergleichsansichten-und-priorisierte-kernaussage.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-05-responsive-druckabschluss-und-dokumentationssync.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`

Noch keine strukturierten Codex-Antworten.

#### Work Unit 02 – Slice 01

- Auftrag: Cockpit-Grundstruktur, Setup und Laufkopf
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-main-init.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-01-cockpit-grundstruktur-setup-und-laufkopf.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`

Noch keine strukturierten Codex-Antworten.

#### Work Unit 03 – Slice 02

- Auftrag: Ergebnis-Unteransichten und zentraler Aktivierungs-/Fokuspfad
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-02-ergebnis-unteransichten-und-zentraler-aktivierungs-fokuspfad.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`

- `C-01` Antwort 1: **angenommen** — Slice 02 führt keine Eingabevalidierung ein; der weiterhin rohe Echo-Vertrag ist im Slice-Dokument ausdrücklich festgehalten.
- `C-02` Antwort 1: **angenommen** — Der Hidden-when-collapsed-Vertrag von mcButton ist im Slice-Dokument festgehalten; Erfolgsfokus aktiviert Überblick und fokussiert den sichtbaren Ergebnisbereich.

#### Work Unit 04 – Slice 03

- Auftrag: Replay-Schrittkarten, Szenarioauswahl und asynchroner Fokus
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-03-replay-schrittkarten-szenarioauswahl-und-asynchroner-fokus.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`, `tests/stress-replay-ui.test.mjs`

- `C-01` Antwort 1: **angenommen** — Slice 02 führt keine Eingabevalidierung ein; der weiterhin rohe Echo-Vertrag ist im Slice-Dokument ausdrücklich festgehalten.
- `C-01` Antwort 2: **angenommen** — Slice 03 führt keine Eingabevalidierung ein; der dokumentierte rohe Setup-Echo-Vertrag bleibt unverändert.
- `C-02` Antwort 1: **angenommen** — Der Hidden-when-collapsed-Vertrag von mcButton ist im Slice-Dokument festgehalten; Erfolgsfokus aktiviert Überblick und fokussiert den sichtbaren Ergebnisbereich.
- `C-02` Antwort 2: **angenommen** — Es wurde kein direkter Fokus auf den eingeklappten mcButton ergänzt; neue Fokuspfade aktivieren sichtbare Replay-Ziele.
- `C-03` Antwort 1: **angenommen** — Die bestehende dokumentbezogene Initialisierungssperre ist nun durch explizite Listener-Kardinalitätstests für Tabs und Replay-Rückverweis abgesichert.
<!-- audit:codex-responses:end -->

### Validierungsattestierung

<!-- audit:validation-attestation:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `CHANGELOG.md`, `Handbuch.html`, `README.md`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-main-init.js`, `app/simulator/simulator-results.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-01-cockpit-grundstruktur-setup-und-laufkopf.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-02-ergebnis-unteransichten-und-zentraler-aktivierungs-fokuspfad.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-03-replay-schrittkarten-szenarioauswahl-und-asynchroner-fokus.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-04-replay-vergleichsansichten-und-priorisierte-kernaussage.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-05-responsive-druckabschluss-und-dokumentationssync.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`

Noch keine strukturierte Validierungsattestierung.

#### Work Unit 02 – Slice 01

- Auftrag: Cockpit-Grundstruktur, Setup und Laufkopf
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-main-init.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-01-cockpit-grundstruktur-setup-und-laufkopf.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`

### Ereignis 1: `validation-17ee7c11b9d2`

- Diff-Fingerprint: `17ee7c11b9d2bce7eb7712b3632c717970f119a3f86f3d6a4492d7483d8f466d`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `ef7426a89999b683ac3b4d034c832595c380b2db5a11f30d71e3424213b11f95`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 181 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[185166 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |

#### Work Unit 03 – Slice 02

- Auftrag: Ergebnis-Unteransichten und zentraler Aktivierungs-/Fokuspfad
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-02-ergebnis-unteransichten-und-zentraler-aktivierungs-fokuspfad.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`

### Ereignis 1: `validation-a12562bfea03`

- Diff-Fingerprint: `a12562bfea03f6bbeb132ef5f3c0f26c56ac9984d46ad7eed6e2a09226f301e0`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `31dfb37f0c7c0cf8535ba5aabb84d8d408b760f6be208632ab6f929ef58bc55e`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 181 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[185302 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |

#### Work Unit 04 – Slice 03

- Auftrag: Replay-Schrittkarten, Szenarioauswahl und asynchroner Fokus
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-03-replay-schrittkarten-szenarioauswahl-und-asynchroner-fokus.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`, `tests/stress-replay-ui.test.mjs`

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

### Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `CHANGELOG.md`, `Handbuch.html`, `README.md`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-main-init.js`, `app/simulator/simulator-results.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-01-cockpit-grundstruktur-setup-und-laufkopf.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-02-ergebnis-unteransichten-und-zentraler-aktivierungs-fokuspfad.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-03-replay-schrittkarten-szenarioauswahl-und-asynchroner-fokus.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-04-replay-vergleichsansichten-und-priorisierte-kernaussage.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-05-responsive-druckabschluss-und-dokumentationssync.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`

- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems: keine erfasst.

#### Work Unit 02 – Slice 01

- Auftrag: Cockpit-Grundstruktur, Setup und Laufkopf
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-main-init.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-01-cockpit-grundstruktur-setup-und-laufkopf.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`

- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Most likely three-month failure cause is a later slice (2–4) adding another entry point that toggles &#96;#mcButton&#96;'s busy/disabled state through a mechanism the current sync logic doesn't observe (e.g., a class-based disabled style or a wrapper button), silently desynchronizing "Neu rechnen" from the canonical start action and allowing a double-run or a stuck disabled recalculate button.
  - Ereignis 3: A future enhancement introduces dynamic parameter presets or URL parameter loading that programmatically mutates &#96;#mcAnzahl&#96;/&#96;#mcDauer&#96;/&#96;#mcMethode&#96;/&#96;#mcSeed&#96; without dispatching &#96;input&#96; or &#96;change&#96; events, leaving &#96;#mcSetupSummary&#96; displaying stale configuration values until the next manual user interaction.

#### Work Unit 03 – Slice 02

- Auftrag: Ergebnis-Unteransichten und zentraler Aktivierungs-/Fokuspfad
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-02-ergebnis-unteransichten-und-zentraler-aktivierungs-fokuspfad.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`

- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Most likely three-month failure cause is a later slice (e.g. Slice 3/4 adding dynamic re-render or a scenario-switch re-init path for the replay workspace) calling &#96;initMonteCarloResultCockpit&#96; a second time on the same document, silently duplicating the 10 tab click/keydown listeners; this manifests as double-fired keyboard navigation (e.g., ArrowRight skipping two tabs) or doubled focus calls, intermittently reproducible only under specific re-init timing and easy to miss because existing idempotency tests only check resulting DOM/state values, not listener cardinality.
  - Ereignis 3: Most likely three-month failure cause is a future enhancement introducing asynchronous dynamic sub-view rendering or panel teardown that re-creates panel elements without updating getResultViewElements mappings, resulting in activateMonteCarloResultView operating on stale element references and leaving conflicting panels visible simultaneously.

#### Work Unit 04 – Slice 03

- Auftrag: Replay-Schrittkarten, Szenarioauswahl und asynchroner Fokus
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-03-replay-schrittkarten-szenarioauswahl-und-asynchroner-fokus.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`, `tests/stress-replay-ui.test.mjs`

- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Most likely three-month failure cause is a later slice (Slice 4, replay comparison/priority work) adding another dynamic focus or render path that calls &#96;focusElement&#96; directly instead of the new &#96;focusReplayTarget&#96; wrapper — reintroducing the hidden-panel focus race that Test 8 now guards against only for the four call sites touched in this Slice, while a fifth new call site added later bypasses the wrapper and is missed because there is no lint/architecture guard forcing all replay focus calls through &#96;focusReplayTarget&#96;.
  - Ereignis 3: A future enhancement introduces dynamic DOM subtree replacement for the scenario selector or step cards during a background recalculation without re-invoking updateStressReplayStepStates, leaving step state attributes and aria-current stale relative to the active workspace state.
<!-- audit:test-approval-premortem:end -->

### Findings-Lebenszyklus

<!-- audit:findings:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `CHANGELOG.md`, `Handbuch.html`, `README.md`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-main-init.js`, `app/simulator/simulator-results.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-01-cockpit-grundstruktur-setup-und-laufkopf.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-02-ergebnis-unteransichten-und-zentraler-aktivierungs-fokuspfad.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-03-replay-schrittkarten-szenarioauswahl-und-asynchroner-fokus.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-04-replay-vergleichsansichten-und-priorisierte-kernaussage.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-05-responsive-druckabschluss-und-dokumentationssync.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`

Noch keine strukturierten Findings.

#### Work Unit 02 – Slice 01

- Auftrag: Cockpit-Grundstruktur, Setup und Laufkopf
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-main-init.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-01-cockpit-grundstruktur-setup-und-laufkopf.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`

### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The setup summary (&#96;updateMonteCarloSetupSummary&#96;) intentionally echoes raw, unnormalized field strings (e.g. leading zeros, transient partial input) with no formatting/validation layer; this is explicitly by design per the slice notes and Test 1, but could surface confusing values to users mid-edit in later slices that add validation.
- Akzeptanztest: Add a formatting/normalization pass (or explicit "raw echo" documentation note) once a later slice introduces input validation for these fields, and add a regression test asserting the summary reflects normalized rather than raw values at that point.
- Statusbegründung: –

### `C-02` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: After a successful run, &#96;completeMonteCarloCockpitRun()&#96; collapses &#96;#mcSetupDisclosure&#96;, which also visually hides &#96;#mcButton&#96; (nested inside the &#96;&lt;details&gt;&#96; content) even though &#96;.click()&#96; delegation from &#96;#mcRecalculateButton&#96; still functions programmatically. Any future code path that calls &#96;mcButton.focus()&#96; directly (bypassing the existing &#96;terminalFocusTarget&#96; fallback logic that already prefers &#96;resultRegion&#96;) would silently fail to move focus while the disclosure is collapsed.
- Akzeptanztest: Add a targeted test asserting focus/interaction behavior when a future slice adds any direct &#96;mcButton.focus()&#96; call while the disclosure is collapsed, or document the hidden-when-collapsed contract next to &#96;mcButton&#96; in the slice docs so later slices don't reintroduce a focus target that has become invisible.
- Statusbegründung: –

#### Work Unit 03 – Slice 02

- Auftrag: Ergebnis-Unteransichten und zentraler Aktivierungs-/Fokuspfad
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-02-ergebnis-unteransichten-und-zentraler-aktivierungs-fokuspfad.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`

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

### `C-03` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: &#96;initMonteCarloResultCockpit&#96; attaches &#96;click&#96;/&#96;keydown&#96; listeners to all 5 result tabs (in addition to the pre-existing recalculate-button listener) with no guard against re-invocation; the existing "idempotent init" test only asserts state consistency, not listener-count stability, so a future slice or runtime path that calls &#96;initMonteCarloResultCockpit&#96; more than once per &#96;documentRef&#96; (e.g., a hot-reload or dynamic re-init path) would silently stack duplicate tab click/keydown handlers, causing duplicated &#96;activateMonteCarloResultView&#96; calls and duplicated &#96;preventDefault&#96;/focus side effects on every keypress.
- Akzeptanztest: acceptance=Add a regression test that calls &#96;initMonteCarloResultCockpit&#96; twice against the same &#96;documentRef&#96; and asserts a single &#96;click&#96; dispatch on a result tab triggers exactly one &#96;activateMonteCarloResultView&#96; invocation (e.g., via a call-count spy or by asserting &#96;tab.listeners.get('click').length === 1&#96;), or make init explicitly idempotent by clearing/reusing listeners via the existing &#96;cockpitInstances&#96; map.
- Statusbegründung: –

#### Work Unit 04 – Slice 03

- Auftrag: Replay-Schrittkarten, Szenarioauswahl und asynchroner Fokus
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-03-replay-schrittkarten-szenarioauswahl-und-asynchroner-fokus.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`, `tests/stress-replay-ui.test.mjs`

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

### Entscheidungstabelle

<!-- audit:decision-table:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `CHANGELOG.md`, `Handbuch.html`, `README.md`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-main-init.js`, `app/simulator/simulator-results.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-01-cockpit-grundstruktur-setup-und-laufkopf.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-02-ergebnis-unteransichten-und-zentraler-aktivierungs-fokuspfad.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-03-replay-schrittkarten-szenarioauswahl-und-asynchroner-fokus.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-04-replay-vergleichsansichten-und-priorisierte-kernaussage.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-05-responsive-druckabschluss-und-dokumentationssync.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`

| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| – | – | Noch keine Findings | – | – | – |

#### Work Unit 02 – Slice 01

- Auftrag: Cockpit-Grundstruktur, Setup und Laufkopf
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-main-init.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-01-cockpit-grundstruktur-setup-und-laufkopf.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`

| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The setup summary (&#96;updateMonteCarloSetupSummary&#96;) intentionally echoes raw, unnormalized field strings (e.g. leading zeros, transient partial input) with no formatting/validation layer; this is explicitly by design per the slice notes and Test 1, but could surface confusing values to users mid-edit in later slices that add validation. | OBSERVATION | offen | offen |
| C-02 | claude | After a successful run, &#96;completeMonteCarloCockpitRun()&#96; collapses &#96;#mcSetupDisclosure&#96;, which also visually hides &#96;#mcButton&#96; (nested inside the &#96;&lt;details&gt;&#96; content) even though &#96;.click()&#96; delegation from &#96;#mcRecalculateButton&#96; still functions programmatically. Any future code path that calls &#96;mcButton.focus()&#96; directly (bypassing the existing &#96;terminalFocusTarget&#96; fallback logic that already prefers &#96;resultRegion&#96;) would silently fail to move focus while the disclosure is collapsed. | OBSERVATION | offen | offen |

#### Work Unit 03 – Slice 02

- Auftrag: Ergebnis-Unteransichten und zentraler Aktivierungs-/Fokuspfad
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-02-ergebnis-unteransichten-und-zentraler-aktivierungs-fokuspfad.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`

| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The setup summary (&#96;updateMonteCarloSetupSummary&#96;) intentionally echoes raw, unnormalized field strings (e.g. leading zeros, transient partial input) with no formatting/validation layer; this is explicitly by design per the slice notes and Test 1, but could surface confusing values to users mid-edit in later slices that add validation. | OBSERVATION | angenommen | offen |
| C-02 | claude | After a successful run, &#96;completeMonteCarloCockpitRun()&#96; collapses &#96;#mcSetupDisclosure&#96;, which also visually hides &#96;#mcButton&#96; (nested inside the &#96;&lt;details&gt;&#96; content) even though &#96;.click()&#96; delegation from &#96;#mcRecalculateButton&#96; still functions programmatically. Any future code path that calls &#96;mcButton.focus()&#96; directly (bypassing the existing &#96;terminalFocusTarget&#96; fallback logic that already prefers &#96;resultRegion&#96;) would silently fail to move focus while the disclosure is collapsed. | OBSERVATION | angenommen | offen |
| C-03 | claude | &#96;initMonteCarloResultCockpit&#96; attaches &#96;click&#96;/&#96;keydown&#96; listeners to all 5 result tabs (in addition to the pre-existing recalculate-button listener) with no guard against re-invocation; the existing "idempotent init" test only asserts state consistency, not listener-count stability, so a future slice or runtime path that calls &#96;initMonteCarloResultCockpit&#96; more than once per &#96;documentRef&#96; (e.g., a hot-reload or dynamic re-init path) would silently stack duplicate tab click/keydown handlers, causing duplicated &#96;activateMonteCarloResultView&#96; calls and duplicated &#96;preventDefault&#96;/focus side effects on every keypress. | OBSERVATION | offen | offen |

#### Work Unit 04 – Slice 03

- Auftrag: Replay-Schrittkarten, Szenarioauswahl und asynchroner Fokus
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-03-replay-schrittkarten-szenarioauswahl-und-asynchroner-fokus.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`, `tests/stress-replay-ui.test.mjs`

| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The setup summary (&#96;updateMonteCarloSetupSummary&#96;) intentionally echoes raw, unnormalized field strings (e.g. leading zeros, transient partial input) with no formatting/validation layer; this is explicitly by design per the slice notes and Test 1, but could surface confusing values to users mid-edit in later slices that add validation. | OBSERVATION | angenommen | offen |
| C-02 | claude | After a successful run, &#96;completeMonteCarloCockpitRun()&#96; collapses &#96;#mcSetupDisclosure&#96;, which also visually hides &#96;#mcButton&#96; (nested inside the &#96;&lt;details&gt;&#96; content) even though &#96;.click()&#96; delegation from &#96;#mcRecalculateButton&#96; still functions programmatically. Any future code path that calls &#96;mcButton.focus()&#96; directly (bypassing the existing &#96;terminalFocusTarget&#96; fallback logic that already prefers &#96;resultRegion&#96;) would silently fail to move focus while the disclosure is collapsed. | OBSERVATION | angenommen | offen |
| C-03 | claude | &#96;initMonteCarloResultCockpit&#96; attaches &#96;click&#96;/&#96;keydown&#96; listeners to all 5 result tabs (in addition to the pre-existing recalculate-button listener) with no guard against re-invocation; the existing "idempotent init" test only asserts state consistency, not listener-count stability, so a future slice or runtime path that calls &#96;initMonteCarloResultCockpit&#96; more than once per &#96;documentRef&#96; (e.g., a hot-reload or dynamic re-init path) would silently stack duplicate tab click/keydown handlers, causing duplicated &#96;activateMonteCarloResultView&#96; calls and duplicated &#96;preventDefault&#96;/focus side effects on every keypress. | OBSERVATION | angenommen | erledigt: The requested regression test now exists verbatim: Test 1 in &#96;mc-result-cockpit.test.mjs&#96; calls &#96;initMonteCarloResultCockpit&#96; twice on the same &#96;documentRef&#96; and asserts &#96;listeners.get('click').length === 1&#96; for a result tab and for the new replay backlink button, proving init does not stack duplicate click handlers. |
| C-04 | claude | &#96;updateStressReplayStepStates&#96; derives &#96;stressReplayStepSelect&#96;'s &#96;data-step-state&#96; as &#96;'completed'&#96; once a workspace exists (&#96;hasWorkspace&#96; true), but no test in &#96;stress-replay-ui.test.mjs&#96; or &#96;browser-smoke.test.mjs&#96; asserts this specific transition (only the &#96;'active'&#96;/no-workspace state and the path/variant states after a workspace exists are covered). | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

### Freigabestatus

<!-- audit:approval-status:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `CHANGELOG.md`, `Handbuch.html`, `README.md`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-main-init.js`, `app/simulator/simulator-results.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-01-cockpit-grundstruktur-setup-und-laufkopf.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-02-ergebnis-unteransichten-und-zentraler-aktivierungs-fokuspfad.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-03-replay-schrittkarten-szenarioauswahl-und-asynchroner-fokus.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-04-replay-vergleichsansichten-und-priorisierte-kernaussage.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-05-responsive-druckabschluss-und-dokumentationssync.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`

- Implementierung bereit: `NOT_RECORDED`
- Validierung: `NOT_RECORDED`
- Claude-Freigabe: `NOT_RECORDED`
- Antigravity-Freigabe: `NOT_RECORDED`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `NO`

#### Work Unit 02 – Slice 01

- Auftrag: Cockpit-Grundstruktur, Setup und Laufkopf
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-main-init.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-01-cockpit-grundstruktur-setup-und-laufkopf.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`

- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`

#### Work Unit 03 – Slice 02

- Auftrag: Ergebnis-Unteransichten und zentraler Aktivierungs-/Fokuspfad
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/monte-carlo-ui.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-02-ergebnis-unteransichten-und-zentraler-aktivierungs-fokuspfad.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`

- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`

#### Work Unit 04 – Slice 03

- Auftrag: Replay-Schrittkarten, Szenarioauswahl und asynchroner Fokus
- Scope: `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/mc-ergebnis-cockpit-ui-implement-review-5d8d7864.md`, `docs/internal/slice-mc-ergebnis-cockpit-ui-arbeitsplan-03-replay-schrittkarten-szenarioauswahl-und-asynchroner-fokus.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`, `tests/stress-replay-ui.test.mjs`

- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
