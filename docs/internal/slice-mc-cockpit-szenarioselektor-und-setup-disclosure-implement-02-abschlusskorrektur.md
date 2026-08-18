# Slice 02 – Abschlusskorrektur

**Feature-Branch:** `feature/mc-ergebnis-cockpit`
**GitHub-Status:** nur lokal

## Ziel des Slice

Abschlusskorrektur

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `Handbuch.html`, `Simulator.html`, `app/simulator/mc-result-cockpit.js`, `app/simulator/simulator-results.js`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`, `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`, `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-implement-02-abschlusskorrektur.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

Vor Umsetzung geprüft:

- Aktiver Branch: `feature/mc-ergebnis-cockpit` (entspricht dem Zielbranch).
- Ausgangsstatus: ausschließlich orchestratorisch verwaltete Änderungen am konsolidierten Auditbericht sowie die neu angelegte Slice-MD; keine vorbestehende Änderung an der korrigierten Testdatei.
- Änderungseinheit: ausschließlich `tests/simulator-monte-carlo-browser.mjs`; keine Produkt-, Engine- oder Vertragssemantik wird verändert.
- Hauptrisiko: Ein synthetisch gesetztes `failed`-Flag könnte die reale Ruin-Erzeugung umgehen. Der Test erzeugt deshalb über einen deterministischen Monte-Carlo-Lauf mit nicht finanzierbarem Floor-Bedarf ein echtes fehlgeschlagenes charakteristisches Szenario.

## Geplante Tests

Fokussiert: Syntaxprüfung der geänderten Browser-Testdatei und `git diff --check`. Der reale Monte-Carlo-Browserfall wird lokal versucht; die vollständige autoritative Matrix bleibt dem Orchestrator vorbehalten.

## Durchgeführte Änderungen

- Einen isolierten, deterministischen Browserfall mit einem Lauf, zweijährigem Horizont und nicht finanzierbarem Floor-Bedarf ergänzt.
- Der Fall ermittelt ein tatsächlich mit `failed=true` erzeugtes charakteristisches Szenario aus `globalScenarioLogs`, wählt es über den produktiven `#scenarioSelect` aus und prüft die Projektion `FAILED` unmittelbar vor der Fixierung.
- Nach erfolgreicher deterministischer Stresspfad-Fixierung prüft derselbe Fall erneut, dass `#stressReplaySelectedScenarioWealth` weiterhin `FAILED` anzeigt.

## Ausgeführte Validierung mit Ergebnis

- `node --check tests/simulator-monte-carlo-browser.mjs` – PASS.
- `git diff --check` – PASS.
- Fokussierter Lauf von `runMonteCarloBrowserRegression` – im Agentenprozess nicht ausführbar: der Sandbox-Lauf darf keinen lokalen Port binden; außerhalb der Sandbox fehlt ein Linux-Playwright-Browser, und der vorhandene Windows-Chromium-Prozess unterstützt den von WSL/Playwright geöffneten Remote-Debugging-Pipe nicht. Dies ist gemäß State-v3 kein fachlicher Stop; der Orchestrator führt den autoritativen Browserlauf in seiner Laufzeitumgebung aus.

## Abweichungen vom Plan

Keine fachliche Abweichung. Die Korrektur beschränkt sich auf den Akzeptanztest des Findings C-01.

## Offene Risiken

Bis zur Orchestrator-Validierung bleibt offen, ob die konfigurierte Ruin-Fixture in dessen Browserumgebung vollständig bis zur Fixierungsbestätigung läuft. Eine Freigabe wird durch Codex nicht erteilt.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-8363ddef0078`
- Testdateien: `tests/simulator-monte-carlo-browser.mjs`
- Eigene Findings: `C-01`, `C-02`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-8363ddef0078`
- Testdateien: `tests/simulator-monte-carlo-browser.mjs`
- Prüfdimensionen: browser test coverage for failed characteristic scenario replay projection, DOM state retention across stress path fixation, error isolation, and browser context teardown lifecycle
- Größtes Restrisiko: Changes to Monte Carlo scenario classification heuristics or ruin calculation parameters could cause seed 818181 to produce no failed characteristic scenario with log rows, causing the test precondition assertion to trip
- Realistische Bruchbedingung: Engine modifications changing the structure or key mapping of &#96;window.globalScenarioLogs.characteristic&#96; entries such that &#96;char_${scenario.key}&#96; no longer matches option values in &#96;#scenarioSelect&#96;
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
- `C-01` Antwort 1: **angenommen** — Der FAILED-Zweig ist implementiert, aber die geforderte Browserabdeckung vor und nach Fixierung fehlt weiterhin; die externe Abschlussprüfung muss das Finding schließen oder als begrenzte Korrektur zurückgeben.
- `C-01` Antwort 2: **angenommen** — Browserabdeckung für ein tatsächlich fehlgeschlagenes charakteristisches Szenario wurde vor und nach erfolgreicher Fixierung ergänzt.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-8363ddef0078`

- Diff-Fingerprint: `8363ddef00788cc5d8deb08ab396889bf4ae142dfb0a37090809f76c6789e01c`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `224fd74392ba735fdf226cec399d6362701bb8a99a51b405656ec1703249a2ad`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 181 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[185476 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Three months out, the most likely failure mode is not in this diff itself but in a future engine/UI change: someone alters how &#96;characteristic&#96; scenarios are computed, tagged, or filtered (e.g., changes &#96;failed&#96; semantics, removes &#96;logDataRows&#96; for failed runs, or changes &#96;startFloorBedarf&#96;'s effect on ruin likelihood) without noticing this test's implicit dependency on producing at least one &#96;failed===true&#96; characteristic scenario with non-empty &#96;logDataRows&#96; for seed 818181 — causing the precondition assertion to fail and masking whether the actual FAILED-rendering/fixation-persistence contract still holds.
  - Ereignis 3: In three months, the most likely failure mode is an engine-level refactoring of scenario classification or log row generation that alters how failed characteristic runs are registered in &#96;globalScenarioLogs&#96;, causing the test's scenario selection precondition to fail before reaching the replay projection assertion.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
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
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The replay-step-1 projection's &#96;failed&#96; branch (&#96;wealth.textContent = 'FAILED'&#96;) has no browser-test coverage selecting a failed characteristic scenario, only the non-failed path is asserted in simulator-monte-carlo-browser.mjs. | BLOCKER | angenommen | erledigt: The required browser coverage now exists: a genuinely &#96;failed=true&#96; characteristic scenario is selected via &#96;#scenarioSelect&#96; and &#96;#stressReplaySelectedScenarioWealth&#96; is asserted as &#96;FAILED&#96; both before and after &#96;#stressReplayFixButton&#96; fixation, exactly matching the acceptance test I specified. The change is scoped to the test file only, and the orchestrator's bound attestation for this fingerprint shows PASS. No further action needed on my own finding. |
| C-02 | claude | The new failed-scenario browser case has a single hard dependency: it asserts existence of a characteristic scenario with &#96;failed===true &amp;&amp; logDataRows.length&gt;0&#96; for seed 818181 with a fixed extreme &#96;startFloorBedarf&#96;. If a future Monte-Carlo engine or characteristic-scenario-selection change alters which runs are classified "characteristic" or how failure/log-row truncation works, the precondition assertion ("failing withdrawal profile produces a failed characteristic scenario") could start failing for reasons unrelated to the replay-projection contract this test is meant to protect, making failures hard to triage. | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

## Rückdokumentation in die Arbeitsplan-MD

Arbeitsplan: `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-implement-review-c6b4b7db.md`

## Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
