# Slice 04 – Profilverbund und Tranchen-Lebenszyklus

**Feature-Branch:** `codex/handbuch-ueberarbeitung`
**GitHub-Status:** nur lokal

## Ziel des Slice

Profilverbund und Tranchen-Lebenszyklus

## Akzeptanzkriterien

- Finanzaggregation beliebig vieler ausgewählter Profile wird klar von den höchstens zwei individuellen Demografie-/Rentenpfaden getrennt.
- Profilbesitz von Vermögen, Bedarf, Rente, Gold, Pflegebucket und Tranchen sowie die Hauptprofilregeln sind nachvollziehbar.
- Nicht geladener, explizit leerer, valider und korrupter beziehungsweise nicht verfügbarer Tranchenbestand werden unterschieden.
- Empfehlung und Simulation bleiben schreibfrei; nur Vorschau plus bestätigter Reconcile ändern ein reales Lot.
- Reconcile, offener Cashstatus, Erstbestätigung, append-only Korrektur und Legacyanzeige stehen in zeitlicher Reihenfolge.
- Eine Checkliste ermöglicht den Abgleich von App, Brokerbestand und freier Liquidität.

## Scope und Nicht-Scope

Erlaubter Scope: `Handbuch.html`, `docs/internal/slice-handbuch-04-profilverbund-und-tranchen-lebenszyklus.md`

## Diff-Risiko inklusive Branch- und Statuscheck

**Prüfung vor dem ersten HTML-Edit:**

- Aktiver Branch: `codex/handbuch-ueberarbeitung`
- `git status --short`: `?? docs/internal/slice-handbuch-04-profilverbund-und-tranchen-lebenszyklus.md`

Geplante Dateien:
- `Handbuch.html`
- `docs/internal/slice-handbuch-04-profilverbund-und-tranchen-lebenszyklus.md`

Voraussichtliche Änderungstiefe:
- mittel; redaktionelle Erweiterung bestehender Profilverbund- und Tranchenabschnitte ohne Produktcodeänderung

Gefährdete bestehende Tests:
- Browser-Smoke und statische HTML-/Ankerprüfungen könnten bei beschädigter HTML-Struktur oder doppelten IDs fehlschlagen.

Nicht anfassen:
- Produktivlogik, Engine, Tests, Referenzdokumente, generierte Artefakte und alle nicht im Slice-Scope genannten Pfade

Rollback-Strategie:
- `git checkout -- Handbuch.html`
- Die neue Slice-Datei nur nach ausdrücklicher Freigabe entfernen.

## Geplante Tests

- Begriffssuche zu Profil, Hauptprofil, Tranche, Verkauf, Reconcile, Cashstatus und Liquidität.
- Statischer Check auf eindeutige IDs und auflösbare interne Hashlinks.
- Synthetischer Trockenlauf für einen Haushalt mit mehr als zwei Finanzprofilen und höchstens zwei Demografiepfaden.
- Synthetischer Trockenlauf für Brokerverkauf, Reconcile, manuelle Cashnachführung und append-only Korrektur.
- `git diff --check` sowie Branch-, Status- und Scopeprüfung.
- Die deterministische Validierungsmatrix wird ausschließlich durch den Orchestrator ausgeführt.

## Durchgeführte Änderungen

- Inhaltsverzeichnis um direkte Ziele für Tranchenzustände/Recovery und Verkauf/Cashabschluss ergänzt.
- Profilbesitz und Haushaltsaggregation getrennt; Balance-Mehrprofilaggregation und Simulatorgrenze von höchstens zwei ausgewählten Profilen ausdrücklich unterschieden.
- Hauptprofil, Person 1/Person 2, maßgebliche Haushaltswerte und Warnverhalten bei abweichenden Profilkonfigurationen erklärt.
- Profilbezogene Aggregat-, Detailtranchen-, Gold-, Renten- und Pflegebucket-Semantik konsolidiert.
- Nicht geladener, explizit leerer, valider, korrupter und nicht verfügbarer Tranchenzustand einschließlich Quote-Teilupdates, Backup und Recovery dokumentiert.
- Schreibfreie Empfehlung, Brokerverkauf, Vorschau, idempotenter Reconcile, offener beziehungsweise bereits berücksichtigter Cashstatus, manuelle Cashnachführung, Erstbestätigung, append-only Korrektur, Parallelfensterblockade und Legacyanzeige in zeitlicher Reihenfolge beschrieben.
- Checkliste für Profil-/Lotzuordnung, Brokerabrechnung, Restbestand und freie Liquidität ergänzt.
- Doppelte Langbeschreibung des Cashablaufs im Balance-Unterkapitel durch einen kanonischen Querverweis ersetzt.
- FAQ zur Zwei-Personen-Grenze an die sichtbare Simulatorbegrenzung angepasst.

## Ausgeführte Validierung mit Ergebnis

- Statischer Hashlink-/ID-Check: 54 eindeutige echte IDs, 58 interne Hashlinks, keine Duplikate, keine fehlenden Ziele.
- UI-Label-Abgleich: `Cashbuchung manuell bestätigen`, `Bestätigten Cashstand korrigieren`, `Nein / noch unklar – manuell offen halten`, `bereits berücksichtigt` und die Legacyanzeige stimmen mit den Tranchenmodulen überein.
- Begriffssuche: keine verbliebene Aussage, Profile ohne Simulator-Daten würden still übersprungen; Schreibfreiheit und fehlende automatische Cashbuchung bleiben an allen relevanten Fundstellen erhalten.
- Synthetischer Drei-Profil-Trockenlauf: Balance-Mehrprofilaggregation bleibt von der sichtbaren Zwei-Profil-/Zwei-Personen-Grenze des Simulators getrennt; Hauptprofil und Warnprüfung sind benannt.
- Synthetischer Verkaufstrockenlauf: Empfehlung → Broker → schreibfreie Vorschau → bestätigter Reconcile → offener Cashstatus → manuelle Liquiditätsnachführung → Cashbestätigung → append-only Korrektur ist vollständig und ohne automatische Cashbuchung nachvollziehbar.
- `git diff --check`: ohne Befund.
- Branchprüfung: weiterhin `codex/handbuch-ueberarbeitung`.
- Status-/Scopeprüfung: ausschließlich `Handbuch.html` sowie diese neue Slice-Datei geändert; keine Testdatei geändert.
- Die vollständige deterministische Validierungsmatrix wurde vertragsgemäß nicht durch Codex ausgeführt und bleibt der Orchestrator-Attestierung vorbehalten.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Der vollständige Browser-Smoke und die orchestrierte Testsuite stehen noch aus.
- Die fachliche Beschreibung ist gegen aktuellen Code und Referenzvertrag abgeglichen; spätere Änderungen an Profilselektion oder Reconcile-UI erfordern erneuten Dokumentationsabgleich.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-0413b97708b2`
- Testdateien: keine
- Prüfdimensionen: checked dimensions = scope/path allowlist adherence, reconcile idempotency and preview/flush separation, cash-status state machine and append-only correction, tranche corrupt/empty/not-loaded/unavailable taxonomy, profile-ownership vs. Hauptprofil vs. Balance-multi-profile aggregation boundary, anchor/TOC wiring for the two new &#96;#tranchen-zustaende&#96;/&#96;#tranchen-lebenszyklus&#96; targets, FAQ silent-skip-vs-block correction, duplication removal between Depot-Tranchen-Manager and the new lifecycle section
- Größtes Restrisiko: largest residual risk = doc fidelity to the actual profile-selection/Pflegebucket resolver code cannot be independently confirmed from the diff alone (Codex's self-reported static ID/link check and synthetic dry-runs are asserted in the slice file but their raw output is not part of this evidence packet), and the Pflegebucket wording split noted in C-01 could mislead a user about which profile's care-fund rules are authoritative in Balance
- Realistische Bruchbedingung: break condition = a future code change to the primary-profile/Hauptprofil resolver (e.g. changing open-profile priority, or changing which aggregates a valid tranche payload replaces) would silently desynchronize this documentation with no automated doc-to-code consistency test to catch it, since this slice adds prose only and no executable assertion tying anchor text to actual resolver behavior.
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-0413b97708b2`
- Testdateien: keine
- Prüfdimensionen: scope adherence, HTML anchor validity, cash-status state machine review, profile precedence documentation check
- Größtes Restrisiko: potential inconsistency between UI behavior and documentation for profile precedence (as noted in C-01) which cannot be verified without code
- Realistische Bruchbedingung: UI workflow changes in the future might silently invalidate the documented manual cash reconciliation process since there is no test binding the prose to the UI state machine
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-0413b97708b2`

- Diff-Fingerprint: `0413b97708b2bfa603a4a90448893917a102bd3cf939f59a4fd78ce6f0c1f618`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `87113fc5e23036b6ad261afa8c51fee9cecc0336007b928f383421f730be0458`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 169 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[174072 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Most likely three-month failure cause is documentation drift — a later code change to profile-selection precedence, Pflegebucket resolution, or the reconcile/cash-status constants (e.g. renaming &#96;pending_manual_posting&#96;) ships without a corresponding Handbuch update, because no test in the suite ties this prose to the underlying resolver logic; the C-01 ambiguity around "erstes ausgewähltes Profil" vs. "Hauptprofil" is the most likely first place this drift becomes user-visible.
  - Ereignis 3: A future code change alters the manual cash reconciliation process (e.g., auto-posting cash or changing state constants) and ships without a corresponding update to the Handbuch, as there are no tests to enforce synchronization between the UI workflow and the documentation.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The new Balance-section bullet states the Pflegebucket definition is governed by "das erste ausgewählte Profil" (first selected profile, list-order), while the new Hauptprofil definition in &#96;#profilverbund-haushalt&#96; and the unchanged Simulator Pflegebucket bullet both key off "Hauptprofil" = currently-open profile if selected, else first selected. The doc never states whether Balance's Pflegebucket resolution intentionally differs from the Simulator's Hauptprofil-based resolution (open-profile priority) or whether "erstes ausgewähltes Profil" is meant as informal shorthand for the same Hauptprofil concept. As written, a user with an open profile that is not first in selection order could be misled about which profile's care-bucket parameters actually apply in Balance vs. Simulator.
- Akzeptanztest: Acceptance test: confirm against the actual profile-selection resolver used by Balance (does it apply open-profile priority like Hauptprofil, or strict first-selected order?) and either (a) align the Balance bullet wording to explicitly say "Hauptprofil (siehe Profilverbund)" if the logic is identical, or (b) add one clause explaining the deliberate difference if the logic differs. No code or test change required, doc-only clarification in a follow-up commit is sufficient.
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The new Balance-section bullet states the Pflegebucket definition is governed by "das erste ausgewählte Profil" (first selected profile, list-order), while the new Hauptprofil definition in &#96;#profilverbund-haushalt&#96; and the unchanged Simulator Pflegebucket bullet both key off "Hauptprofil" = currently-open profile if selected, else first selected. The doc never states whether Balance's Pflegebucket resolution intentionally differs from the Simulator's Hauptprofil-based resolution (open-profile priority) or whether "erstes ausgewähltes Profil" is meant as informal shorthand for the same Hauptprofil concept. As written, a user with an open profile that is not first in selection order could be misled about which profile's care-bucket parameters actually apply in Balance vs. Simulator. | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

## Rückdokumentation in die Arbeitsplan-MD

Arbeitsplan: `docs/internal/handbuch.md`. Der Plan blieb gemäß Orchestratorvertrag schreibgeschützt; der Slice-Fortschritt ist vollständig in dieser Slice-Datei dokumentiert.

## Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
