# Overall audit – MC_Cockpit_Szenarioselektor_und_Setup_Disclosure-implement

Dieses Dokument wird vom Orchestrator geführt. Slice-Dokumente entstehen erst beim tatsächlichen Beginn ihrer Implementierung.

- Task-Datei: `inbox/MC_Cockpit_Szenarioselektor_und_Setup_Disclosure-implement.md`
- Run-ID: `watch-20260818-085303.891726Z-9c26c13628ff`
- Zielbranch: `feature/mc-ergebnis-cockpit`
- Deklarierter Produktscope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

## Orchestrator-Prüfprotokoll

### Review-Feedback von Claude

<!-- audit:claude-review:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

Noch kein strukturiertes Reviewereignis.

#### Work Unit 02 – Slice 01

- Auftrag: Szenarioauswahl, Replay-Projektion und Setup-Affordance
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-4f0d35be138f`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`
- Eigene Findings: `C-01`

#### Work Unit 03 – Gesamtreview

- Auftrag: Branchweite Gesamtabnahme durch Codex, Claude und Antigravity
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

Noch kein strukturiertes Reviewereignis.

#### Work Unit 04 – Slice 02

- Auftrag: Abschlusskorrektur
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-implement-02-abschlusskorrektur.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-8363ddef0078`
- Testdateien: `tests/simulator-monte-carlo-browser.mjs`
- Eigene Findings: `C-01`, `C-02`

#### Work Unit 05 – Gesamtreview

- Auftrag: Branchweite Gesamtabnahme durch Codex, Claude und Antigravity
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-093557071985`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`
- Prüfdimensionen: checked architecture drift (single &#96;.mc-view-*&#96; navigation boundary, no parallel selection state), interface consistency (projection/controller pairing, focus-chain fallbacks, idempotent listeners), dead transition states (all activate-view calls guard focus on the successfully-activated panel), documentation synchronization (README/TECHNICAL/Handbuch match the moved selector and toggle contract), and declared acceptance criteria (setup affordance labels+chevron, bidirectional log/replay navigation, FAILED-branch coverage)
- Größtes Restrisiko: Largest residual risk: the closed C-02 coupling — a future Monte-Carlo engine change to characteristic-scenario classification, &#96;failed&#96; semantics, or &#96;logDataRows&#96; truncation could break the seed-818181 precondition fixture and mask whether the real FAILED-rendering contract still holds, and separately, any future new selection/reset branch added to &#96;displayMonteCarloResults()&#96; that forgets to pair &#96;projectStressReplayScenario&#96; with &#96;selectStressReplayScenario&#96; would desynchronize the read-only Step‑1 summary from the actual fixation target, guarded today only by a source-regex assertion rather than a deeper behavioral invariant
- Realistische Bruchbedingung: Break condition: an engine refactor changes how &#96;characteristic&#96; runs are tagged/filtered or truncates &#96;logDataRows&#96; for failed runs such that no failed characteristic scenario with rows exists for seed 818181, or a new scenario-selection code path in &#96;simulator-results.js&#96; calls &#96;selectStressReplayScenario&#96; without the paired &#96;projectStressReplayScenario&#96; call, silently desyncing the replay projection from the fixation target.
- Eigene Findings: `C-01`, `C-02`
<!-- audit:claude-review:end -->

### Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

Noch kein strukturiertes Reviewereignis.

#### Work Unit 02 – Slice 01

- Auftrag: Szenarioauswahl, Replay-Projektion und Setup-Affordance
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-4f0d35be138f`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`
- Prüfdimensionen: DOM uniqueness, cross-panel focus containment, XSS immunity (strict textContent projection), idempotent cockpit listener attachment, CSS layout resilience at 320px-1600px, and print-style navigation suppression
- Größtes Restrisiko: Desynchronization between selectStressReplayScenario and projectStressReplayScenario if a new scenario dispatch path is added to simulator-results.js without paired projection calls
- Realistische Bruchbedingung: An asynchronous or conditional scenario loader in displayMonteCarloResults resets or updates the controller selection without calling projectStressReplayScenario, causing the read-only Replay Step 1 projection to display stale metadata
- Eigene Findings: keine

#### Work Unit 03 – Gesamtreview

- Auftrag: Branchweite Gesamtabnahme durch Codex, Claude und Antigravity
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

Noch kein strukturiertes Reviewereignis.

#### Work Unit 04 – Slice 02

- Auftrag: Abschlusskorrektur
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-implement-02-abschlusskorrektur.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-8363ddef0078`
- Testdateien: `tests/simulator-monte-carlo-browser.mjs`
- Prüfdimensionen: browser test coverage for failed characteristic scenario replay projection, DOM state retention across stress path fixation, error isolation, and browser context teardown lifecycle
- Größtes Restrisiko: Changes to Monte Carlo scenario classification heuristics or ruin calculation parameters could cause seed 818181 to produce no failed characteristic scenario with log rows, causing the test precondition assertion to trip
- Realistische Bruchbedingung: Engine modifications changing the structure or key mapping of &#96;window.globalScenarioLogs.characteristic&#96; entries such that &#96;char_${scenario.key}&#96; no longer matches option values in &#96;#scenarioSelect&#96;
- Eigene Findings: keine

#### Work Unit 05 – Gesamtreview

- Auftrag: Branchweite Gesamtabnahme durch Codex, Claude und Antigravity
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-093557071985`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`
- Prüfdimensionen: Checked architecture drift (single &#96;.mc-view-*&#96; result navigation boundary, zero parallel selection state, unified DOM selector location), interface consistency (strict 1:1 pairing of &#96;projectStressReplayScenario&#96; and &#96;selectStressReplayScenario&#96; across all 5 initialization/reset/selection branches, safe textContent projection preventing XSS, robust multi-tier focus fallbacks), dead transition states (all programmatic focus operations gated behind successful &#96;activateMonteCarloResultView&#96; return checks), documentation synchronization (Handbuch.html, SIMULATOR_MODULES_README.md, and TECHNICAL.md accurately reflect selector relocation, read-only projection card, and CSS-driven disclosure toggle), and declared requirements and acceptance criteria (native &#96;details&#96; affordance with chevron rotation, bidirectional focus routing between logs and replay, and Playwright coverage for &#96;failed=true&#96; scenario projection before and after fixation)
- Größtes Restrisiko: Future modifications to &#96;displayMonteCarloResults()&#96; in &#96;simulator-results.js&#96; (e.g., custom scenario filters, paging, or new early-return error branches) that update or reset &#96;selectStressReplayScenario&#96; without invoking &#96;projectStressReplayScenario&#96;, desynchronizing the read-only Replay Step 1 summary card from the actual fixation controller target
- Realistische Bruchbedingung: A developer adds a new scenario-selection or reset branch to &#96;simulator-results.js&#96; calling &#96;selectStressReplayScenario&#96; without the matching &#96;projectStressReplayScenario&#96; call, causing Replay Step 1 to display stale metadata while the underlying controller fixes a different run
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

### Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

Noch keine strukturierten Codex-Antworten.

#### Work Unit 02 – Slice 01

- Auftrag: Szenarioauswahl, Replay-Projektion und Setup-Affordance
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

Noch keine strukturierten Codex-Antworten.

#### Work Unit 03 – Gesamtreview

- Auftrag: Branchweite Gesamtabnahme durch Codex, Claude und Antigravity
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

Noch keine strukturierten Codex-Antworten.

#### Work Unit 04 – Slice 02

- Auftrag: Abschlusskorrektur
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-implement-02-abschlusskorrektur.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

- `C-01` Antwort 1: **angenommen** — Der FAILED-Zweig ist implementiert, aber die geforderte Browserabdeckung vor und nach Fixierung fehlt weiterhin; die externe Abschlussprüfung muss das Finding schließen oder als begrenzte Korrektur zurückgeben.
- `C-01` Antwort 2: **angenommen** — Browserabdeckung für ein tatsächlich fehlgeschlagenes charakteristisches Szenario wurde vor und nach erfolgreicher Fixierung ergänzt.

#### Work Unit 05 – Gesamtreview

- Auftrag: Branchweite Gesamtabnahme durch Codex, Claude und Antigravity
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

- `C-01` Antwort 1: **angenommen** — Der FAILED-Zweig ist implementiert, aber die geforderte Browserabdeckung vor und nach Fixierung fehlt weiterhin; die externe Abschlussprüfung muss das Finding schließen oder als begrenzte Korrektur zurückgeben.
- `C-01` Antwort 2: **angenommen** — Browserabdeckung für ein tatsächlich fehlgeschlagenes charakteristisches Szenario wurde vor und nach erfolgreicher Fixierung ergänzt.
- `C-02` Antwort 1: **angenommen** — Die deterministische Fixture hängt von Seed 818181, extremem &#96;startFloorBedarf&#96; und der aktuellen Charakteristik-/Logklassifikation ab. Die separate Precondition-Meldung unterscheidet Fixture-Ausfälle bereits von den nachfolgenden FAILED-Projektionsassertionen; die Kopplung bleibt dennoch ein Wartungsrisiko.
<!-- audit:codex-responses:end -->

### Validierungsattestierung

<!-- audit:validation-attestation:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

Noch keine strukturierte Validierungsattestierung.

#### Work Unit 02 – Slice 01

- Auftrag: Szenarioauswahl, Replay-Projektion und Setup-Affordance
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

### Ereignis 1: `validation-4f0d35be138f`

- Diff-Fingerprint: `4f0d35be138f74a46cc180b48d270f38bcf1a28aca25fade488a24799e6dedf8`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `1f4234c2f7169518e64b70bdca2fa9d9ad5124b7c447ce45ca5406dbb7c57cea`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 181 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[185476 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |

#### Work Unit 03 – Gesamtreview

- Auftrag: Branchweite Gesamtabnahme durch Codex, Claude und Antigravity
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

### Ereignis 1: `validation-4f0d35be138f`

- Diff-Fingerprint: `4f0d35be138f74a46cc180b48d270f38bcf1a28aca25fade488a24799e6dedf8`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `282bcf33f4368c3c70180a0d78c46966a1328ff123db7f12fdd878974ea94216`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 181 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[185474 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |

#### Work Unit 04 – Slice 02

- Auftrag: Abschlusskorrektur
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-implement-02-abschlusskorrektur.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

### Ereignis 1: `validation-8363ddef0078`

- Diff-Fingerprint: `8363ddef00788cc5d8deb08ab396889bf4ae142dfb0a37090809f76c6789e01c`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `224fd74392ba735fdf226cec399d6362701bb8a99a51b405656ec1703249a2ad`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 181 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[185476 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |

#### Work Unit 05 – Gesamtreview

- Auftrag: Branchweite Gesamtabnahme durch Codex, Claude und Antigravity
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

### Ereignis 1: `validation-093557071985`

- Diff-Fingerprint: `093557071985dd5658488cb7afdef5bd37ba22fc9c1d5a69833d4275f3a6ce46`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `0ec370aaa88037443acacdde28e59bd9a5793c54a65dacebc5943e6a5d8b6f27`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 181 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[185476 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

### Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems: keine erfasst.

#### Work Unit 02 – Slice 01

- Auftrag: Szenarioauswahl, Replay-Projektion und Setup-Affordance
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Three months out, the most likely failure is a future edit to &#96;displayMonteCarloResults()&#96; (e.g. a new early-return branch for a new result state) that forgets to pair &#96;selectStressReplayScenario(...)&#96; with &#96;projectStressReplayScenario(...)&#96;, leaving the read-only Replay-Step-1 projection stale relative to the actual fixation target — the only guard against this today is a source-regex count assertion, not a behavioral one.
  - Ereignis 3: In three months, the most likely defect is a feature addition to simulator-results.js (such as custom scenario filtering or batch scenario switching) that introduces an alternate scenario selection branch calling selectStressReplayScenario without invoking projectStressReplayScenario, leaving the Replay Step 1 read-only summary card desynchronized from the actual replay fixation target.

#### Work Unit 03 – Gesamtreview

- Auftrag: Branchweite Gesamtabnahme durch Codex, Claude und Antigravity
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems: keine erfasst.

#### Work Unit 04 – Slice 02

- Auftrag: Abschlusskorrektur
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-implement-02-abschlusskorrektur.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Three months out, the most likely failure mode is not in this diff itself but in a future engine/UI change: someone alters how &#96;characteristic&#96; scenarios are computed, tagged, or filtered (e.g., changes &#96;failed&#96; semantics, removes &#96;logDataRows&#96; for failed runs, or changes &#96;startFloorBedarf&#96;'s effect on ruin likelihood) without noticing this test's implicit dependency on producing at least one &#96;failed===true&#96; characteristic scenario with non-empty &#96;logDataRows&#96; for seed 818181 — causing the precondition assertion to fail and masking whether the actual FAILED-rendering/fixation-persistence contract still holds.
  - Ereignis 3: In three months, the most likely failure mode is an engine-level refactoring of scenario classification or log row generation that alters how failed characteristic runs are registered in &#96;globalScenarioLogs&#96;, causing the test's scenario selection precondition to fail before reaching the replay projection assertion.

#### Work Unit 05 – Gesamtreview

- Auftrag: Branchweite Gesamtabnahme durch Codex, Claude und Antigravity
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure is a feature addition to &#96;displayMonteCarloResults()&#96; (e.g., custom scenario filtering, batch switching, or a new early-return result state) that adds a &#96;selectStressReplayScenario&#96; call without the paired &#96;projectStressReplayScenario&#96; call, leaving the Replay Step‑1 read-only summary stale relative to the actual stress-path fixation target; the only current guard is a static source-regex pairing assertion, not a runtime/behavioral invariant, so the drift could ship silently until a user notices mismatched wealth/care metadata after fixation.
  - Ereignis 3: In three months, the most likely defect is a feature addition to &#96;displayMonteCarloResults()&#96; (such as custom scenario filtering or batch scenario switching) that introduces an alternate scenario selection branch calling &#96;selectStressReplayScenario&#96; without invoking &#96;projectStressReplayScenario&#96;, leaving the Replay Step 1 read-only summary card desynchronized from the actual replay fixation target.
<!-- audit:test-approval-premortem:end -->

### Findings-Lebenszyklus

<!-- audit:findings:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

Noch keine strukturierten Findings.

#### Work Unit 02 – Slice 01

- Auftrag: Szenarioauswahl, Replay-Projektion und Setup-Affordance
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The replay-step-1 projection's &#96;failed&#96; branch (&#96;wealth.textContent = 'FAILED'&#96;) has no browser-test coverage selecting a failed characteristic scenario, only the non-failed path is asserted in simulator-monte-carlo-browser.mjs.
- Akzeptanztest: Add a browser assertion that selecting a scenario with &#96;failed=true&#96; (e.g. a worst-run scenario if failure occurs) renders &#96;stressReplaySelectedScenarioWealth&#96; as &#96;FAILED&#96; before/after fixation, in a later slice touching this file.
- Statusbegründung: –

#### Work Unit 03 – Gesamtreview

- Auftrag: Branchweite Gesamtabnahme durch Codex, Claude und Antigravity
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

Noch keine strukturierten Findings.

#### Work Unit 04 – Slice 02

- Auftrag: Abschlusskorrektur
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-implement-02-abschlusskorrektur.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

### `C-01` — `CLOSED`

- Quelle: `claude`; Runde 1
- Klasse: `BLOCKER`
- Finding: The replay-step-1 projection's &#96;failed&#96; branch (&#96;wealth.textContent = 'FAILED'&#96;) has no browser-test coverage selecting a failed characteristic scenario, only the non-failed path is asserted in simulator-monte-carlo-browser.mjs.
- Akzeptanztest: Add a browser assertion that selecting a scenario with &#96;failed=true&#96; (e.g. a worst-run scenario if failure occurs) renders &#96;stressReplaySelectedScenarioWealth&#96; as &#96;FAILED&#96; before/after fixation, in a later slice touching this file.
- Statusbegründung: The required browser coverage now exists: a genuinely &#96;failed=true&#96; characteristic scenario is selected via &#96;#scenarioSelect&#96; and &#96;#stressReplaySelectedScenarioWealth&#96; is asserted as &#96;FAILED&#96; both before and after &#96;#stressReplayFixButton&#96; fixation, exactly matching the acceptance test I specified. The change is scoped to the test file only, and the orchestrator's bound attestation for this fingerprint shows PASS. No further action needed on my own finding.

### `C-02` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The new failed-scenario browser case has a single hard dependency: it asserts existence of a characteristic scenario with &#96;failed===true &amp;&amp; logDataRows.length&gt;0&#96; for seed 818181 with a fixed extreme &#96;startFloorBedarf&#96;. If a future Monte-Carlo engine or characteristic-scenario-selection change alters which runs are classified "characteristic" or how failure/log-row truncation works, the precondition assertion ("failing withdrawal profile produces a failed characteristic scenario") could start failing for reasons unrelated to the replay-projection contract this test is meant to protect, making failures hard to triage.
- Akzeptanztest: Acceptance test (non-blocking, prose): when this precondition assertion fails in CI, the failure message should be distinguishable from an actual FAILED-rendering regression; a follow-up slice touching this file may add a short comment or secondary assertion that clarifies the fixture's dependency on &#96;startFloorBedarf&#96;/seed to aid triage.
- Statusbegründung: –

#### Work Unit 05 – Gesamtreview

- Auftrag: Branchweite Gesamtabnahme durch Codex, Claude und Antigravity
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

### `C-01` — `CLOSED`

- Quelle: `claude`; Runde 1
- Klasse: `BLOCKER`
- Finding: The replay-step-1 projection's &#96;failed&#96; branch (&#96;wealth.textContent = 'FAILED'&#96;) has no browser-test coverage selecting a failed characteristic scenario, only the non-failed path is asserted in simulator-monte-carlo-browser.mjs.
- Akzeptanztest: Add a browser assertion that selecting a scenario with &#96;failed=true&#96; (e.g. a worst-run scenario if failure occurs) renders &#96;stressReplaySelectedScenarioWealth&#96; as &#96;FAILED&#96; before/after fixation, in a later slice touching this file.
- Statusbegründung: The required browser coverage now exists: a genuinely &#96;failed=true&#96; characteristic scenario is selected via &#96;#scenarioSelect&#96; and &#96;#stressReplaySelectedScenarioWealth&#96; is asserted as &#96;FAILED&#96; both before and after &#96;#stressReplayFixButton&#96; fixation, exactly matching the acceptance test I specified. The change is scoped to the test file only, and the orchestrator's bound attestation for this fingerprint shows PASS. No further action needed on my own finding.

### `C-02` — `CLOSED`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The new failed-scenario browser case has a single hard dependency: it asserts existence of a characteristic scenario with &#96;failed===true &amp;&amp; logDataRows.length&gt;0&#96; for seed 818181 with a fixed extreme &#96;startFloorBedarf&#96;. If a future Monte-Carlo engine or characteristic-scenario-selection change alters which runs are classified "characteristic" or how failure/log-row truncation works, the precondition assertion ("failing withdrawal profile produces a failed characteristic scenario") could start failing for reasons unrelated to the replay-projection contract this test is meant to protect, making failures hard to triage.
- Akzeptanztest: Acceptance test (non-blocking, prose): when this precondition assertion fails in CI, the failure message should be distinguishable from an actual FAILED-rendering regression; a follow-up slice touching this file may add a short comment or secondary assertion that clarifies the fixture's dependency on &#96;startFloorBedarf&#96;/seed to aid triage.
- Statusbegründung: The acceptance test only required that a precondition-fixture failure be distinguishable from an actual FAILED-rendering regression in CI output. That is already structurally satisfied: &#96;runFailedReplayProjectionCase&#96; asserts the precondition (&#96;'failing withdrawal profile produces a failed characteristic scenario'&#96;) on its own line/message before ever touching &#96;#stressReplaySelectedScenarioWealth&#96;, and the two subsequent FAILED-rendering assertions use distinct messages ("...projects FAILED before fixation" / "...remains FAILED after fixation"). A CI failure on the precondition line cannot be confused with a rendering-contract failure. The residual coupling to seed 818181 / &#96;startFloorBedarf&#96; / characteristic-classification heuristics is a real but non-actionable maintenance risk with no current defect behind it, so per the final-review contract it is recorded below as residual risk rather than re-opened as a blocker.
<!-- audit:findings:end -->

### Entscheidungstabelle

<!-- audit:decision-table:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| – | – | Noch keine Findings | – | – | – |

#### Work Unit 02 – Slice 01

- Auftrag: Szenarioauswahl, Replay-Projektion und Setup-Affordance
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The replay-step-1 projection's &#96;failed&#96; branch (&#96;wealth.textContent = 'FAILED'&#96;) has no browser-test coverage selecting a failed characteristic scenario, only the non-failed path is asserted in simulator-monte-carlo-browser.mjs. | OBSERVATION | offen | offen |

#### Work Unit 03 – Gesamtreview

- Auftrag: Branchweite Gesamtabnahme durch Codex, Claude und Antigravity
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| – | – | Noch keine Findings | – | – | – |

#### Work Unit 04 – Slice 02

- Auftrag: Abschlusskorrektur
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-implement-02-abschlusskorrektur.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The replay-step-1 projection's &#96;failed&#96; branch (&#96;wealth.textContent = 'FAILED'&#96;) has no browser-test coverage selecting a failed characteristic scenario, only the non-failed path is asserted in simulator-monte-carlo-browser.mjs. | BLOCKER | angenommen | erledigt: The required browser coverage now exists: a genuinely &#96;failed=true&#96; characteristic scenario is selected via &#96;#scenarioSelect&#96; and &#96;#stressReplaySelectedScenarioWealth&#96; is asserted as &#96;FAILED&#96; both before and after &#96;#stressReplayFixButton&#96; fixation, exactly matching the acceptance test I specified. The change is scoped to the test file only, and the orchestrator's bound attestation for this fingerprint shows PASS. No further action needed on my own finding. |
| C-02 | claude | The new failed-scenario browser case has a single hard dependency: it asserts existence of a characteristic scenario with &#96;failed===true &amp;&amp; logDataRows.length&gt;0&#96; for seed 818181 with a fixed extreme &#96;startFloorBedarf&#96;. If a future Monte-Carlo engine or characteristic-scenario-selection change alters which runs are classified "characteristic" or how failure/log-row truncation works, the precondition assertion ("failing withdrawal profile produces a failed characteristic scenario") could start failing for reasons unrelated to the replay-projection contract this test is meant to protect, making failures hard to triage. | OBSERVATION | offen | offen |

#### Work Unit 05 – Gesamtreview

- Auftrag: Branchweite Gesamtabnahme durch Codex, Claude und Antigravity
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The replay-step-1 projection's &#96;failed&#96; branch (&#96;wealth.textContent = 'FAILED'&#96;) has no browser-test coverage selecting a failed characteristic scenario, only the non-failed path is asserted in simulator-monte-carlo-browser.mjs. | BLOCKER | angenommen | erledigt: The required browser coverage now exists: a genuinely &#96;failed=true&#96; characteristic scenario is selected via &#96;#scenarioSelect&#96; and &#96;#stressReplaySelectedScenarioWealth&#96; is asserted as &#96;FAILED&#96; both before and after &#96;#stressReplayFixButton&#96; fixation, exactly matching the acceptance test I specified. The change is scoped to the test file only, and the orchestrator's bound attestation for this fingerprint shows PASS. No further action needed on my own finding. |
| C-02 | claude | The new failed-scenario browser case has a single hard dependency: it asserts existence of a characteristic scenario with &#96;failed===true &amp;&amp; logDataRows.length&gt;0&#96; for seed 818181 with a fixed extreme &#96;startFloorBedarf&#96;. If a future Monte-Carlo engine or characteristic-scenario-selection change alters which runs are classified "characteristic" or how failure/log-row truncation works, the precondition assertion ("failing withdrawal profile produces a failed characteristic scenario") could start failing for reasons unrelated to the replay-projection contract this test is meant to protect, making failures hard to triage. | OBSERVATION | angenommen | erledigt: The acceptance test only required that a precondition-fixture failure be distinguishable from an actual FAILED-rendering regression in CI output. That is already structurally satisfied: &#96;runFailedReplayProjectionCase&#96; asserts the precondition (&#96;'failing withdrawal profile produces a failed characteristic scenario'&#96;) on its own line/message before ever touching &#96;#stressReplaySelectedScenarioWealth&#96;, and the two subsequent FAILED-rendering assertions use distinct messages ("...projects FAILED before fixation" / "...remains FAILED after fixation"). A CI failure on the precondition line cannot be confused with a rendering-contract failure. The residual coupling to seed 818181 / &#96;startFloorBedarf&#96; / characteristic-classification heuristics is a real but non-actionable maintenance risk with no current defect behind it, so per the final-review contract it is recorded below as residual risk rather than re-opened as a blocker. |
<!-- audit:decision-table:end -->

### Freigabestatus

<!-- audit:approval-status:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

- Implementierung bereit: `NOT_RECORDED`
- Validierung: `NOT_RECORDED`
- Claude-Freigabe: `NOT_RECORDED`
- Antigravity-Freigabe: `NOT_RECORDED`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `NO`

#### Work Unit 02 – Slice 01

- Auftrag: Szenarioauswahl, Replay-Projektion und Setup-Affordance
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`

#### Work Unit 03 – Gesamtreview

- Auftrag: Branchweite Gesamtabnahme durch Codex, Claude und Antigravity
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `NOT_RECORDED`
- Antigravity-Freigabe: `NOT_RECORDED`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `NO`

#### Work Unit 04 – Slice 02

- Auftrag: Abschlusskorrektur
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-implement-02-abschlusskorrektur.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`

#### Work Unit 05 – Gesamtreview

- Auftrag: Branchweite Gesamtabnahme durch Codex, Claude und Antigravity
- Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan-01-szenarioauswahl-replay-projektion-und-setup-affordance.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `NO`
<!-- audit:approval-status:end -->
