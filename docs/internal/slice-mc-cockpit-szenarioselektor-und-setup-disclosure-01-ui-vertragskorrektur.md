# Slice 01 – Szenarioauswahl, Replay-Projektion und Setup-Affordance

**Feature-Branch:** `feature/mc-ergebnis-cockpit`
**GitHub-Status:** nur lokal

## Ziel des Slice

Szenarioauswahl, Replay-Projektion und Setup-Affordance

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Persistierte Änderungspfade:

- `Simulator.html`
- `simulator.css`
- `app/simulator/simulator-results.js`
- `app/simulator/mc-result-cockpit.js`
- `tests/mc-result-cockpit.test.mjs`
- `tests/browser-smoke.test.mjs`
- `tests/simulator-monte-carlo-browser.mjs`
- `docs/reference/TECHNICAL.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `Handbuch.html`
- `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`

Vier produktive Änderungseinheiten sind betroffen: `Simulator.html`, `simulator.css` und die beiden JavaScript-Module. Nicht im Scope sind Engine, Worker, Persistenz, Exporte, Monte-Carlo-Berechnung, ein zweiter Auswahlzustand sowie Replay-Schrittkarten 2, 3 und 4. Insbesondere werden weder deren Markup noch deren Controller- oder Datenverträge geändert. Damit ist das offene Plan-Finding C-01 im Slice ausdrücklich berücksichtigt.

## Diff-Risiko inklusive Branch- und Statuscheck

Vor dem ersten Produktedit geprüft:

- Aktiver Branch: `feature/mc-ergebnis-cockpit` (entspricht dem Zielbranch).
- Ausgangsstatus: nur orchestratorisch angelegte, ungetrackte Review-/Slice-Dokumente; keine vorbestehenden Produktänderungen im Slice-Scope.
- Hauptrisiken: Fokus auf ein inzwischen verborgenes Panel, veraltete Replay-Projektion nach Rerender/Reset, doppelte dynamische Selects sowie schmaler Summary-Overflow bei 700 px.
- Rollback: Markupänderungen ausschließlich in `Simulator.html`, Zustandsdarstellung ausschließlich in `simulator.css`, Projektionslogik ausschließlich in `simulator-results.js` und Fokusverdrahtung ausschließlich in `mc-result-cockpit.js` zurücknehmen; die drei zugehörigen Testdateien und drei Nutzungs-/Architekturdokumente dateigleich auf den Ausgangsvertrag zurückführen.

## Geplante Tests

Fokussiert: `tests/mc-result-cockpit.test.mjs`, Syntaxchecks der beiden Produktmodule und der drei Testdateien sowie `git diff --check`. Die vollständige Matrix bleibt dem Orchestrator vorbehalten.

## Durchgeführte Änderungen

- Den stabilen `#scenarioSelector` in das Logs-Panel unmittelbar vor die gesteuerte Logausgabe verschoben; der dynamische `#scenarioSelect` und die Default-Auswahl `char_worst` bleiben unverändert eindeutig.
- Replay-Schritt 1 um eine rein lesende Projektion für Laufbezeichnung, formatiertes Endvermögen beziehungsweise `FAILED` und Pflegemarkierung ergänzt. Auswahl-, Fehler-, Leer- und loglose Pfade setzen Projektion und Replay-Controller gemeinsam zurück.
- Bidirektionale Navigation zwischen Logs und Replay über den zentralen Aktivierungsweg verdrahtet. Fokusziele liegen nach dem Wechsel ausschließlich im sichtbaren Zielpanel; die Initialisierung bleibt dokumentbezogen idempotent.
- Das native Setup-Summary um „Setup bearbeiten“/„Setup ausblenden“ und ein per `[open]` rotierendes CSS-Chevron ergänzt. Erfolgs-Einklappen, Eingabewerte, Tastatur- und Fokusvertrag des kanonischen Startbuttons bleiben unverändert.
- Unit-/DOM-, Browser-Smoke- und realen Monte-Carlo-Browservertrag sowie Handbuch und technische Referenzen synchronisiert.

## Ausgeführte Validierung mit Ergebnis

- `node tests/run-single.mjs tests/mc-result-cockpit.test.mjs` – PASS, 80/80 Assertions.
- `node --check app/simulator/simulator-results.js` – PASS.
- `node --check app/simulator/mc-result-cockpit.js` – PASS.
- `node --check tests/mc-result-cockpit.test.mjs` – PASS.
- `node --check tests/browser-smoke.test.mjs` – PASS.
- `node --check tests/simulator-monte-carlo-browser.mjs` – PASS.
- `git diff --check` – PASS.

`npm test` und `npm run test:browser` wurden gemäß State-v3-Ausführungsgrenze nicht im Agentenprozess gestartet; die autoritative Matrix führt der Orchestrator aus.

## Abweichungen vom Plan

Keine fachliche Abweichung. Der freigegebene Arbeitsplan blieb gemäß Implementierungsübergabe schreibgeschützt; die Rückdokumentation erfolgt vollständig in dieser vom Orchestrator angelegten Slice-MD.

## Offene Risiken

Die reale Browsermatrix muss noch bestätigen, dass die zusätzlichen Summary- und Replay-Elemente bei exakt 700/899 px sowie im Druck ohne Overflow bleiben und dass die deterministische Fixierung nach einem echten Szenariowechsel vollständig abschließt. Die entsprechenden Assertions sind in den autorisierten Browser-Testdateien ergänzt. Eine Freigabe wird durch Codex nicht erteilt.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-4f0d35be138f`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-4f0d35be138f`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/mc-result-cockpit.test.mjs`, `tests/simulator-monte-carlo-browser.mjs`
- Prüfdimensionen: DOM uniqueness, cross-panel focus containment, XSS immunity (strict textContent projection), idempotent cockpit listener attachment, CSS layout resilience at 320px-1600px, and print-style navigation suppression
- Größtes Restrisiko: Desynchronization between selectStressReplayScenario and projectStressReplayScenario if a new scenario dispatch path is added to simulator-results.js without paired projection calls
- Realistische Bruchbedingung: An asynchronous or conditional scenario loader in displayMonteCarloResults resets or updates the controller selection without calling projectStressReplayScenario, causing the read-only Replay Step 1 projection to display stale metadata
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-4f0d35be138f`

- Diff-Fingerprint: `4f0d35be138f74a46cc180b48d270f38bcf1a28aca25fade488a24799e6dedf8`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `1f4234c2f7169518e64b70bdca2fa9d9ad5124b7c447ce45ca5406dbb7c57cea`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 181 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[185476 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Three months out, the most likely failure is a future edit to &#96;displayMonteCarloResults()&#96; (e.g. a new early-return branch for a new result state) that forgets to pair &#96;selectStressReplayScenario(...)&#96; with &#96;projectStressReplayScenario(...)&#96;, leaving the read-only Replay-Step-1 projection stale relative to the actual fixation target — the only guard against this today is a source-regex count assertion, not a behavioral one.
  - Ereignis 3: In three months, the most likely defect is a feature addition to simulator-results.js (such as custom scenario filtering or batch scenario switching) that introduces an alternate scenario selection branch calling selectStressReplayScenario without invoking projectStressReplayScenario, leaving the Replay Step 1 read-only summary card desynchronized from the actual replay fixation target.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The replay-step-1 projection's &#96;failed&#96; branch (&#96;wealth.textContent = 'FAILED'&#96;) has no browser-test coverage selecting a failed characteristic scenario, only the non-failed path is asserted in simulator-monte-carlo-browser.mjs.
- Akzeptanztest: Add a browser assertion that selecting a scenario with &#96;failed=true&#96; (e.g. a worst-run scenario if failure occurs) renders &#96;stressReplaySelectedScenarioWealth&#96; as &#96;FAILED&#96; before/after fixation, in a later slice touching this file.
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The replay-step-1 projection's &#96;failed&#96; branch (&#96;wealth.textContent = 'FAILED'&#96;) has no browser-test coverage selecting a failed characteristic scenario, only the non-failed path is asserted in simulator-monte-carlo-browser.mjs. | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

## Rückdokumentation in die Arbeitsplan-MD

Fachliche Quelle: `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`. Implementierung und fokussierte Validierung sind in dieser Slice-MD dokumentiert; die verwaltete Arbeitsplan-Auditsektion bleibt dem Orchestrator vorbehalten.

## Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
