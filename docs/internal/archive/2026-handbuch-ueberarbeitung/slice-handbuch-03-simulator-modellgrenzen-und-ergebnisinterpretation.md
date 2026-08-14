# Slice 03 – Simulator, Modellgrenzen und Ergebnisinterpretation

**Feature-Branch:** `codex/handbuch-ueberarbeitung`
**GitHub-Status:** nur lokal

## Ziel des Slice

Den Simulator entlang eines vollständigen Nutzerlaufs erklären und Sampling,
Stress, Ressourcensteuerung, Ergebniskennzahlen sowie experimentelle
Vergleichsfunktionen mit ihren tatsächlichen Aussagegrenzen dokumentieren.

## Akzeptanzkriterien

- Eingaben, Ansparphase, Personen/Renten, Dynamic Flex, Monte Carlo und
  Backtesting folgen den sichtbaren Bedienbereichen und Labels.
- Tail Risk ist ausdrücklich ein standardmäßig deaktiviertes, optionales
  Stress-Overlay.
- Runzahl, Großlastbestätigung, Seed, Worker, Jobbudget, Fortschritt und Abbruch
  entsprechen dem sichtbaren Run-Contract.
- Ergebnisquoten, Wilson-Intervall, Endvermögen, Entnahme, Drawdown, Steuern,
  Missingness und technische Fehler besitzen eine verständliche
  Aussagegrenze.
- Sweep nennt die sieben aktuellen Dimensionen; Auto-Optimize nennt die sechs
  interaktiven Dimensionen und die experimentelle Modellgrenze.
- `legacy_step` bleibt als Default dokumentiert; `cape_continuous` wird weder
  als Default noch als normaler UI-Schalter dargestellt.
- Veraltete Ansparerempfehlungen und Sweep-Verweise auf Sparrate oder
  Rentenbeginn sind entfernt.

## Scope und Nicht-Scope

Erlaubter Scope: `Handbuch.html`, `docs/internal/slice-handbuch-03-simulator-modellgrenzen-und-ergebnisinterpretation.md`

Nicht-Scope: Produktivlogik, Engine-Semantik, UI-Labels, Referenzdokumente,
Tests, generierte Artefakte sowie alle übrigen Slice-Dokumente.

## Diff-Risiko inklusive Branch- und Statuscheck

**Branch vor Umsetzung:** `codex/handbuch-ueberarbeitung`

**Git-Status vor Umsetzung:**

```text
?? docs/internal/slice-handbuch-03-simulator-modellgrenzen-und-ergebnisinterpretation.md
```

Geplante Dateien:
- `Handbuch.html`
- `docs/internal/slice-handbuch-03-simulator-modellgrenzen-und-ergebnisinterpretation.md`

Voraussichtliche Änderungstiefe:
- mittel; umfangreiche Textkorrektur in einer eigenständigen HTML-Seite, ohne
  Änderung der Inline-Steuerung

Gefährdete bestehende Tests:
- Handbuch-Browser-Smoke, Hash-/Tab-Navigation und HTML-Struktur

Nicht anfassen:
- sämtliche Produktivmodule, Referenzen, Tests, Assets und andere Slices
- vorhandene Tabsteuerung und Inline-JavaScript

Rollback-Strategie:
- `git checkout -- Handbuch.html`
- die neue Slice-Datei nur nach ausdrücklicher Freigabe entfernen

## Geplante Tests

- Feld- und Buttonabgleich gegen `Simulator.html` und die zuständigen
  Simulator-/Engine-Verträge.
- Begriffssuche nach Monte Carlo, Backtest, Tail Risk, Seed, Wilson,
  Missingness, Sweep, Auto-Optimize, Dynamic Flex und CAPE.
- Suche nach veralteten oder normativen Sparraten-, Allokations-,
  Erfolgsquoten- und Rebalancing-Aussagen.
- Statische Prüfung aller Hashziele, eindeutiger IDs, ausgeglichener
  `div`-Struktur und `git diff --check`.
- Deterministische Validierung und Attestierung durch den Orchestrator.

## Durchgeführte Änderungen

- Simulator-Quickstart auf vorhandene Rahmendaten- und Samplingsteuerung
  umgestellt; Sparrate und Rentenbeginn ausdrücklich aus dem Sweep genommen.
- Ansparer- und Ansparphasenabschnitte auf tatsächlich sichtbare Eingaben und
  getrennte Szenariovergleiche begrenzt; unbelegte Sparquoten,
  Beispielallokationen, Rebalancingrhythmen und ETF-Empfehlungen entfernt.
- Simulatorablauf in UI-Reihenfolge konsolidiert: Portfolio/Bedarf,
  Personen/Renten, Ansparphase, Pflege, Parameter und Start.
- Samplingmodi, Startjahrwirkung, CAPE-Vorrang, Filter/Recency und das
  standardmäßig deaktivierte Fat-Tail-/Crash-Overlay abgegrenzt.
- Runzahlgrenzen, Großlastbestätigung, Ressourcenanzeige, Workerzahl,
  Job-Timebudget, Seed/RNG, Fortschritt, Fehlerstatus und Abbruch ergänzt.
- Backtest als historische In-sample-Diagnose und Monte Carlo als
  modellinterne Verteilung einschließlich unterschiedlicher Exporte erklärt.
- Ergebnisgrenzen für Floor-Deckung, Wilson-Intervall, terminale Outcomes,
  reale Depotentnahme, Endvermögen, Drawdown, Steuern, Runway/Kürzungen,
  Pflege-KPIs und Missingness ergänzt.
- Vollständigen MC-Export, Szenarioexport und Backtestexport nach Zweck und
  Vertraulichkeit getrennt.
- Sweep auf sieben sichtbare Dimensionen und Auto-Optimize auf sechs
  interaktive Dimensionen korrigiert; experimentelle Kandidatensuche und
  Champion-Grenze hervorgehoben.
- Dynamic-Flex-Horizont, Mindest-Flex und CAPE-Return-Policy mit
  `legacy_step` als Default und `cape_continuous` als explizitem Config-Modus
  beschrieben.
- TOC-Ziel „Stresstests & Presets“ ergänzt und den Sweep-Glossareintrag
  korrigiert.

## Ausgeführte Validierung mit Ergebnis

- `git diff --check`: erfolgreich, keine Whitespacefehler.
- Statische Hash-/ID-Prüfung: 50 eindeutige IDs, 54 interne Hash-Verweise,
  keine doppelten IDs und keine fehlenden Ziele.
- Simulator-Ankerprüfung: 13 eindeutige `simulator*`-IDs; alle referenzierten
  Simulatorziele vorhanden.
- HTML-Struktur-Plausibilisierung: 117 öffnende und 117 schließende
  `div`-Elemente.
- Begriffssuche und UI-/Contract-Abgleich: durchgeführt gegen
  `Simulator.html`, `app/simulator/`, `workers/`, `engine/` und die im Plan
  benannten Referenzen.
- Vollständige Validierungsmatrix: nicht durch Codex ausgeführt; gemäß
  State-v3-Vertrag dem Orchestrator vorbehalten.

## Abweichungen vom Plan

Keine fachliche Abweichung. Die Rückdokumentation verändert den freigegebenen
Arbeitsplan nicht, da er in diesem Lauf schreibgeschützt und außerhalb des
persistierten Slice-Scope liegt.

## Offene Risiken

- Die umfangreiche Textverdichtung benötigt ein adversariales Review auf
  unbeabsichtigte Bedeutungsverschiebungen und scanbare Nutzerführung.
- Die sechs Auto-Optimize-Dimensionen folgen dem produktiven interaktiven
  Registry-Contract; die noch abweichende sichtbare Überschrift „1 bis 7“ in
  `Simulator.html` liegt außerhalb dieses Dokumentations-Slice und muss vom
  Review hinsichtlich Nutzerverständlichkeit bewertet werden.
- Browserdarstellung, Tab-/Hash-Fokus und Responsive-Verhalten bleiben bis zur
  Orchestrator-Validierung ein Restrisiko.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-70e36f18dc17`
- Testdateien: keine
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-70e36f18dc17`
- Testdateien: keine
- Prüfdimensionen: correctness, scope boundaries, idempotency, failure paths
- Größtes Restrisiko: The mismatch between the updated Handbuch text (1-6 dimensions) and the out-of-scope Simulator UI (1-7 dimensions) introduces a temporary user-facing contradiction until the UI is patched in a subsequent slice.
- Realistische Bruchbedingung: A user assumes Bear-Refill is being optimized because the Simulator UI says 7 dimensions, despite the Handbuch explicitly excluding it.
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-70e36f18dc17`

- Diff-Fingerprint: `70e36f18dc174639bd1fd5e2af6c0f5cb9d7e1651f6538b439206c16bfb8fc59`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `7f7f6682d7f28f295a8f3b0fd6a69d8b7be4b3b6529817f93dd96fd4bf54404b`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 169 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[174072 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months the most likely failure is that Simulator.html's Auto-Optimize dimension-count widget is updated (or a new dimension is added/removed) without a corresponding sync pass over Handbuch.html, silently reintroducing a doc/UI mismatch that this slice only partially resolved (still showing the pre-existing "1 bis 7" vs "1 bis 6" gap); absent an explicit cross-file consistency check in slice 05, stale numeric claims in the manual will drift from the live registry contract again.
  - Ereignis 3: In three months, the Simulator UI is updated to include a 7th dimension in Auto-Optimize, but Handbuch.html is not updated back to "1-7", causing a documentation mismatch.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The rewritten Auto-Optimize copy now states explicitly "je Lauf werden 1 bis 6 dieser Dimensionen ausgewählt" (Bear-Refill excluded), while the slice's own "Offene Risiken" section discloses that the live &#96;Simulator.html&#96; UI heading still reads "1 bis 7" and explicitly defers the Nutzerverständlichkeits-judgment to review. Because &#96;Simulator.html&#96; is out of scope for this slice, this documentation change cannot fix the UI copy itself, but it does introduce a user-visible contradiction between the newly "corrected" manual text (1–6) and the on-screen widget label (1–7) that a user comparing both artifacts will notice. This is a legitimate residual-accuracy risk for a slice whose entire purpose is faithful UI-to-doc mapping, but blocking here has no in-scope remediation path (fixing Simulator.html would itself be an UNEXPECTED-PATH violation of this slice's allowlist), so I classify it as OBSERVATION rather than BLOCKER and route it forward instead of gating this slice.
- Akzeptanztest: Acceptance test: before/at slice 05 (Informationsarchitektur/Endvalidierung), diff the Auto-Optimize dimension-count copy in Simulator.html against Handbuch.html and either align both to the same enforced range or add one sentence in Handbuch.html explicitly noting the UI counter may still show a legacy "1–7" label pending a UI fix. VALIDATE: ["grep","-n","-i","1 bis 7","Simulator.html","Handbuch.html"]
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The rewritten Auto-Optimize copy now states explicitly "je Lauf werden 1 bis 6 dieser Dimensionen ausgewählt" (Bear-Refill excluded), while the slice's own "Offene Risiken" section discloses that the live &#96;Simulator.html&#96; UI heading still reads "1 bis 7" and explicitly defers the Nutzerverständlichkeits-judgment to review. Because &#96;Simulator.html&#96; is out of scope for this slice, this documentation change cannot fix the UI copy itself, but it does introduce a user-visible contradiction between the newly "corrected" manual text (1–6) and the on-screen widget label (1–7) that a user comparing both artifacts will notice. This is a legitimate residual-accuracy risk for a slice whose entire purpose is faithful UI-to-doc mapping, but blocking here has no in-scope remediation path (fixing Simulator.html would itself be an UNEXPECTED-PATH violation of this slice's allowlist), so I classify it as OBSERVATION rather than BLOCKER and route it forward instead of gating this slice. | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

## Rückdokumentation in die Arbeitsplan-MD

Arbeitsplan: `docs/internal/handbuch.md` (freigegebene, schreibgeschützte
Quelle). Umsetzung und Validierung sind in diesem Slice-Dokument
zurückdokumentiert; eine Planänderung ist durch den exakten Slice-Scope nicht
zulässig.

## Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
