# Slice 01 – Inhaltsinventar, Einstieg und Datensicherheit

**Feature-Branch:** `codex/handbuch-ueberarbeitung`
**GitHub-Status:** nur lokal

## Ziel des Slice

Inhaltsinventar, Einstieg und Datensicherheit

## Akzeptanzkriterien

- Kein regulärer Ablauf empfiehlt das direkte Öffnen einer HTML-Datei über `file://`.
- Desktop-App, lokaler Browser-HTTP-Start, optionale Node.js-Abhängigkeit und Offlinegrenzen sind getrennt beschrieben.
- Browser- und Tauri-Persistenz, fehlender Cloud-Sync sowie Profilwechsel/Handoff sind nutzerverständlich erklärt.
- Komplettbackup, Jahresabschluss-Snapshot und Ergebnisexport sind nach Zweck und Wiederherstellungsumfang getrennt.
- Der neue Datensicherheitsanker ist im Inhaltsverzeichnis erreichbar; interne Hashziele bleiben eindeutig.

## Scope und Nicht-Scope

Erlaubter Scope: `Handbuch.html`, `docs/internal/slice-handbuch-01-inhaltsinventar-einstieg-und-datensicherheit.md`

## Diff-Risiko inklusive Branch- und Statuscheck

**Branch vor Umsetzung:** `codex/handbuch-ueberarbeitung`

**`git status --short` vor Umsetzung:**

```text
 M Handbuch.html
?? docs/internal/slice-handbuch-01-inhaltsinventar-einstieg-und-datensicherheit.md
```

Beide vorgefundenen Änderungen gehören zum persistierten Slice-Scope. Änderungen außerhalb des erlaubten
Pfadumfangs waren nicht vorhanden. Die bereits im Arbeitsbaum liegende Handbuchänderung wurde in diesem
Implementierungslauf gegen Plan, Laufzeitquellen und Akzeptanzkriterien geprüft und fortgeführt.

Geplante Dateien:
- `Handbuch.html`
- `docs/internal/slice-handbuch-01-inhaltsinventar-einstieg-und-datensicherheit.md`

Voraussichtliche Änderungstiefe:
- mittel; redaktionelle Neuordnung mit neuen Ankern, ohne Produktlogik oder Scriptänderung

Gefährdete bestehende Tests:
- Browser-Smoke und statische Hashnavigation von `Handbuch.html`

Nicht anfassen:
- Produktlogik, Engine, Tests, Referenzdokumente und Inhalte der späteren Slices

Rollback-Strategie:
- `Handbuch.html` dateibezogen über Git/Orchestrator zurücksetzen; die neue Slice-Datei nur nach ausdrücklicher Freigabe entfernen

## Soll-/Ist-Inventar vor Textänderung

| Bereich/TOC-Ziel | Einstieg oder Workflow | Ist-Befund | Soll und Slice-Zuordnung |
|---|---|---|---|
| Schnellstart (eigener Tab) | `index.html`, Simulator, Balance, Tranchen | Startarten vorhanden; Profilkontext und Backup fehlen; Simulator-/Balance-Details teils veraltet | Einstieg, Profilkontext und erstes Komplettbackup in Slice 1; Fachabläufe in Slices 2–4 |
| `#ueberblick` | alle fünf Einstiegspunkte | Nur Balance und Simulator als Kernwerkzeuge genannt | Nutzerreise und fünf Einstiegspunkte abschließend in Slice 5 ordnen |
| `#ansparer-jung`, `#ansparphase` | Simulator, Balance | Doppelte Persona-/Anspartexte mit teils unbelegten Regeln | Simulatorrealität in Slice 3, Redundanz/IA in Slice 5 |
| `#installation-start` | `RuhestandSuite.exe`, lokaler Browserstart | Direkter HTML-Start, Konfigurationsordner-Backup und pauschales Offlineversprechen veraltet | In Slice 1 korrigieren |
| fehlender Datensicherheitsanker | Startseite/Profile, Browser/Tauri, alle Exporte | Persistenz-, Sync-, Backup-, Snapshot- und Exportgrenzen über mehrere Abschnitte verteilt | `#datensicherheit` in Slice 1 neu anlegen und ins TOC aufnehmen |
| `#simulator` mit Unterzielen | `Simulator.html` | Vollständige Themenbreite, aber Stress-, Ressourcen-, Ergebnis- und Sweep-Aussagen zu prüfen; Stress-TOC-Ziel fehlt | Slice 3; Navigation abschließend Slice 5 |
| `#balance-app` mit Unterzielen | `Balance.html` | Jahresprozess, Diagnose, Snapshot, Ausgaben und Umsetzung vorhanden, aber Prozessfolge/Begriffe teilweise widersprüchlich | Slice 2 |
| `#jahres-update-kette` | `Balance.html` | Detailablauf dupliziert Teile des Balance-Abschnitts | Slice 2; Redundanzprüfung Slice 5 |
| `#profilverbund` mit Unterzielen | `index.html`, Balance, Simulator | Profilverwaltung und Aggregation vorhanden; Handoff und Demografiegrenze zu verteilen | Profilwechsel/Handoff Slice 1, Fachgrenzen Slice 4 |
| `#onboarding-playbook` | alle Nutzeroberflächen | Wiederholt direkten HTML-Start und setzt Ergebnisexport mit Sicherung gleich | Start-/Sicherungsfehler Slice 1; übrige Empfehlungen Slices 3/5 |
| `#haeufige-probleme` | Balance, Persistenz/Dateien | Netzwerk-, Eingabe- und Speicherhilfe vorhanden; Cloud- und Backupaussagen widersprüchlich | Speicher-/Backuphilfe Slice 1; Balancefehler Slice 2; Konsistenz Slice 5 |
| `#jahrespflege` | Balance und Exporte | Backup, Snapshot und Export nicht durchgehend getrennt | Jahresprozess Slice 2; Querschnitt Slice 5 |
| `#anhang` und Unterziele | Referenz/Support | Datenquellen, Versionen, Dokumente und unbelegte Supportzusagen | Slice 5 |
| `#faq` | alle Workflows | Zweitdefinitionen für Offline, Rebalancing, Modelle und Verträge | Offlinegrenze Slice 1; Fachthemen Slices 2–4; Konsistenz Slice 5 |
| `#glossar` | alle Workflows | Zentrale Begriffe vorhanden, einzelne Definitionen veraltet | Slices 2–4; Gesamtprüfung Slice 5 |

**Inventar nach Nutzeroberfläche:**

- `index.html`: Startseite, Profilverwaltung, App-Handoff und Komplettbackup; in Slice 1 kanonischer Einstieg und Datensicherheitsort.
- `Balance.html`: Schnellstart, Hauptabschnitt, Jahreskette, Pflege/Probleme/FAQ; fachliche Konsolidierung in Slice 2.
- `Simulator.html`: Schnellstart, Ansparertexte, Hauptabschnitt, FAQ/Glossar; fachliche Konsolidierung in Slice 3.
- `depot-tranchen-manager.html`: Schnellstart sowie Simulator-, Balance- und Profilverbundpassagen; Lebenszyklus in Slice 4.
- `Handbuch.html`: Quickstart, TOC, Haupttext, FAQ und Glossar; Navigation und Querschnittskonsistenz abschließend in Slice 5.

## Geplante Tests

- Statische Suche nach direktem HTML-/`file://`-Start und „Konfigurationsordner“.
- Prüfung aller internen `href="#…"` auf genau ein vorhandenes `id`-Ziel.
- Suche nach widersprüchlichen Offline-, Cloud-, Backup-, Snapshot- und Exportaussagen.
- HTML-/Browser-Smoke gemäß Orchestrator-Validierungsmatrix; Codex führt nicht die vollständige Matrix aus.

## Durchgeführte Änderungen

- Schnellstart nach Desktop- und Browservariante getrennt; Profilkontext und frühes Komplettbackup ergänzt.
- „Installation & Start“ auf Tauri und lokalen HTTP-Server neu geordnet; direkten `file://`-Start und das unbelegte Konfigurationsordner-Backup entfernt.
- Eigenen Abschnitt `#datensicherheit` mit lokaler Persistenz, fehlendem Cloud-Sync, Profilwechsel/Handoff, drei Sicherungsarten, Vertraulichkeit und Offline-Recovery ergänzt.
- Onboarding, Problemhilfe und Offline-FAQ mit dem kanonischen Start-/Sicherungsvertrag synchronisiert.

## Ausgeführte Validierung mit Ergebnis

- `git diff --check`: PASS.
- Statische Hashprüfung: PASS; 50 interne Hashlinks, keine fehlenden oder mehrdeutigen Ziele, keine doppelten `id`-Werte.
- Statische Suche nach „Konfigurationsordner“, empfohlenem Direktstart von `index.html` und der alten pauschalen Formulierung „funktioniert auch offline“: PASS, keine Treffer.
- Quellenabgleich: PASS. `src-tauri/src/lib.rs` leitet `ruhestand_suite_data.json` aus `app.path().app_data_dir()` ab und startet den eingebauten Rust-Loopback-Proxy auf `127.0.0.1:8787`; `start_suite.ps1` startet den Browser-HTTP-Server selbst und verwendet `node` nur für `tools/yahoo-proxy.cjs`; `README.md` schreibt wegen ES-Modulen und Workern den lokalen HTTP-Start vor. `index.html`, `app/profile/profile-storage.js` und `app/profile/profile-navigation.js` bestätigen die sichtbaren Backup-Labels sowie Profilwechsel und Handoff/Flush.
- Slice-Pfadgrenze via `git status --short` und `git diff -- Handbuch.html docs/internal/slice-handbuch-01-inhaltsinventar-einstieg-und-datensicherheit.md`: PASS; ausschließlich die beiden erlaubten Slice-Pfade sind geändert.
- Keine vollständige Validierungsmatrix ausgeführt; die autoritative Validierungsattestierung wird durch den Orchestrator projiziert.

## Abweichungen vom Plan

Keine erfasst.

## Offene Risiken

- Spätere Slices ändern dieselbe HTML-Datei. Quickstart, FAQ und Querverweise müssen nach jedem Slice erneut auf Begriffskonsistenz geprüft werden.
- Die vollständige Informationsarchitektur und alle übrigen TOC-Ergänzungen sind ausdrücklich Slice 5 vorbehalten.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-8362bb1ab82f`
- Testdateien: keine
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-8362bb1ab82f`
- Testdateien: keine
- Prüfdimensionen: Checked HTML TOC/id invariants, documentation of security boundaries (cloud sync, local storage persistence contexts), and resume behavior descriptions (offline limits, incomplete period states).
- Größtes Restrisiko: The lack of automated checks for TOC integrity could lead to broken anchor links in Slices 2-5, as identified in C-01.
- Realistische Bruchbedingung: A future slice inadvertently deletes or renames an anchor ID that is still referenced by a TOC link or an external document, causing silent navigation failures for users.
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-8362bb1ab82f`

- Diff-Fingerprint: `8362bb1ab82fabcff8cd5ce2c648bff7cc19fcdf8690263f55557b9de740b55c`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `6ebd4f17a25f2bac42979350d040b1e93dc83ad71b02deee6c97a70c03a2e33c`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 169 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[174072 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Most likely 3-month failure: a later slice (2–5) edits Handbuch.html and inadvertently renames/removes the &#96;#datensicherheit&#96; id or duplicates an id while adding new sections, silently breaking TOC/FAQ links or reintroducing an inconsistent offline/backup claim; because no automated link/content-guard test exists, this ships undetected until a human notices a dead in-page anchor or a support/user report about conflicting backup guidance.
  - Ereignis 3: A subsequent slice modifies Handbuch.html and introduces a typo in an id attribute or href, breaking the internal documentation navigation. Since no automated test validates these links during the build/test cycle, the breakage is merged and deployed, leading to user confusion when trying to reach critical safety or recovery instructions.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: Handbuch.html TOC/id integrity and the removed direct-file://-start / "Konfigurationsordner" guidance are validated only by ad hoc, self-reported checks in the slice doc, not by an automated, repeatable check in the test suite, despite four more slices still to touch the same file before Slice 5's final consistency pass.
- Akzeptanztest: Add (at latest by Slice 5) a lightweight static check that (a) every internal &#96;href="#…"&#96; in Handbuch.html resolves to exactly one &#96;id&#96;, and (b) the strings "file://" preceding a direct index.html open instruction and "Konfigurationsordner" do not reappear; acceptance: VALIDATE: ["python3","-c","import re,sys; h=open('Handbuch.html',encoding='utf-8').read(); ids=set(re.findall(r'id=\"([^\"]+)\"',h)); hrefs=re.findall(r'href=\"#([^\"]+)\"',h); missing=[x for x in hrefs if x not in ids]; bad=('Konfigurationsordner' in h); sys.exit(1 if (missing or bad) else 0)"]
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | Handbuch.html TOC/id integrity and the removed direct-file://-start / "Konfigurationsordner" guidance are validated only by ad hoc, self-reported checks in the slice doc, not by an automated, repeatable check in the test suite, despite four more slices still to touch the same file before Slice 5's final consistency pass. | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

## Rückdokumentation in die Arbeitsplan-MD

Arbeitsplan: `docs/internal/handbuch.md`. Im Orchestrator-Modus bleibt der freigegebene Plan schreibgeschützt; der Slice-Fortschritt wird deshalb ausschließlich in dieser Slice-Datei dokumentiert.

## Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
