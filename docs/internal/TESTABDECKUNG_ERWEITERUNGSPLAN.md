# Testabdeckung-Erweiterungsplan

**Stand:** 2026-06-11  
**Status:** implementierungsreif; Freigabe durch Gemini und Claude Code erteilt  
**Autor:** Codex  
**Vorgeschlagener Feature-Branch:** `codex/test-coverage-expansion`  
**Aktueller Erstellungsbranch:** `main`  
**GitHub-Status:** nicht veroeffentlicht; Branch-Anlage und Push erst nach Freigabe  
**Review-Freigabe:** Gemini und Claude Code haben die Planfreigabe am 2026-06-11 erteilt; nicht-blockierende Empfehlungen C-13 bis C-15 wurden eingearbeitet.  
**Slice-Regeln:** Umsetzung nur nach `docs/internal/SLICE_EXECUTION_RULES.md`

## Ziel

Die vorhandene Testsuite soll von einer umfangreichen, aber nicht belastbar quantifizierten Absicherung zu einer messbaren und reviewfaehigen Testabdeckung ausgebaut werden.

Der Plan adressiert drei unterschiedliche Luecken:

1. Die Coverage-Messung liefert derzeit keinen nutzbaren Wert.
2. Die Test-Infrastruktur hat vor Erweiterung der UI-Tests Isolation- und Diagnose-Luecken.
3. Mehrere App-/UI-/Worker-Einstiegsmodule werden gar nicht, nur indirekt oder nur ueber fragile DOM-Mocks geladen.
4. Die Testsuite prueft viele Kernpfade, aber nur begrenzt echte Browser-, Tauri-, Live-Daten- und Fehlerpfade.

Nichtziel ist eine abstrakte "100 Prozent Coverage"-Metrik. Ziel ist eine belastbare, priorisierte Abdeckung der risikoreichen fachlichen und technischen Pfade.

## Ausgangsbefund vom 2026-06-11

Ausgefuehrt:

```powershell
npm run test:coverage
```

Ergebnis:

- 79 Testdateien gefunden.
- 2140 Assertions.
- 2140 bestanden.
- 0 fehlgeschlagen.
- Coverage-Report meldet trotzdem `100.00% (0/0), Files: 0`.

Statische Modulpruefung:

- 181 Quellcodedateien in `app/`, `engine/`, `workers/`.
- 183 Laufzeit-Quelldateien, wenn `types/` einbezogen wird.
- 118 Dateien werden direkt aus Tests importiert.
- 150 Dateien werden transitiv ueber Tests geladen.
- 31 Dateien werden nicht transitiv geladen.

Korrektur nach Review:

- `app/balance/balance-main.js` wird in `tests/balance-smoke.test.mjs` dynamisch via `await import()` geladen. Die statische Importanalyse erkennt diesen Pfad nicht. Die Zahl "31 nicht transitiv geladen" ist deshalb als vorlaeufiger statischer Befund zu behandeln, nicht als kanonische Wahrheit.
- `types/profile-types.js` und `types/strategy-options.js` sind Runtime-Quellen und muessen in Coverage- und Inventar-Scope aufgenommen werden.
- Die Testdatei-Anzahl ist zum Zeitpunkt dieser Ueberarbeitung lokal erneut mit `Get-ChildItem tests -Filter *.test.mjs` geprueft: 79. Abweichende Reviewer-Zaehlungen werden in Slice 3 ueber ein reproduzierbares Inventar geklaert.

Nicht transitiv geladene Beispiele:

- `app/balance/balance-binder.js`
- `app/simulator/simulator-main.js`
- mehrere `app/simulator/simulator-main-*.js`
- `app/tranches/tranchen-manager-page.js`
- `app/tranches/tranchen-price-service.js`
- `workers/mc-worker.js`

Wichtige Einschraenkung: Die vorhandene Analyse ist statisch und approximativ. Sie ersetzt keine reparierte Runtime-Coverage.

## Harte Entscheidungen

1. Test-Runner-Korrektheit und Isolation werden vor UI-Orchestrierung erweitert.
2. Coverage muss erst repariert werden, bevor Prozentziele verbindlich werden.
3. Coverage-Pfadnormalisierung nutzt zwingend `fileURLToPath` aus `node:url`; Ad-hoc-Stringersetzungen sind fuer `file://`-URLs nicht zulaessig.
4. Coverage- und Inventar-Scope umfasst `app/`, `engine/`, `workers/` und `types/`.
5. Browser-Smoke-Gates werden als vollautomatisiertes Playwright-Gate geplant. Manuelle oder reine in-app-Browser-Verifikation reicht fuer diesen Plan nicht als Gate.
6. Browser-Smokes laufen gegen einen durch das Testskript gestarteten lokalen HTTP-Server, nicht ueber `file://`.
7. DOM-nahe UI-Orchestrierungstests laufen isoliert pro Datei oder pro Suite in separaten Node-Prozessen. Gemeinsamer globaler `window`-/`document`-Zustand ueber Testdateien hinweg ist fuer neue UI-Slices nicht akzeptiert.
8. Branch-Coverage und Fehlerpfad-Abdeckung sind wichtiger als reine Line-Coverage.
9. Worker-Einstiegspunkte werden explizit mit echten Worker-/Structured-Clone-nahem Verhalten getestet, nicht nur ueber Mock-Harnesses.
10. Live-Datenpfade werden mit kontrollierten Fakes und Fehlerfaellen abgesichert, nicht mit echten Netzwerkaufrufen in der Standardsuite.
11. Tauri/Rust-Verifikation bleibt getrennt von der schnellen Node-Standardsuite, wird aber fuer Release-nahe Pfade als Gate dokumentiert.
12. Neue Tests duerfen fachliche Engine-Semantik nicht still anpassen. Unerwartete Snapshot-/Backtest-/FlowDelta-Abweichungen sind Stop-Regeln.
13. `minimumFlexAnnual`-Tests duerfen keine neue Semantik erzwingen. Wenn eine stille Begrenzung oder ein Migrationsproblem in Bestandsdaten entdeckt wird, stoppt der Slice und es wird ein separater Bugfix-/Migrationsplan erstellt.

## Zielbild

Die Testsuite soll nach Abschluss der Slices folgende Ebenen haben:

- **Unit/Contract:** schnelle Node-Tests fuer deterministische Module.
- **Integration:** headless Tests fuer Engine, Simulator, Balance, Persistenz und Profilverbund.
- **Browser-Smoke:** echte Browserausfuehrung der HTML-Einstiege und zentraler UI-Aktionen.
- **Worker-Entrypoint:** Tests gegen Message-Contracts echter Worker-Dateien.
- **Runtime-Adapter:** getrennte Tests fuer IndexedDB/localStorage/Tauri-Adaptervertraege.
- **Coverage-Gates:** reparierte Coverage-Auswertung mit Mindestwerten und expliziten Ausnahmen.
- **Coverage-Inventar:** dokumentierte Liste bewusst nicht automatisierter Pfade mit manueller Verifikation.
- **Runner-Hygiene:** sortierte, reproduzierbare Testdatei-Auswahl, korrekte Fehlerzaehlung und isolierte Ausfuehrungsoptionen fuer DOM-nahe Tests.

## Coverage-Gates

Die finalen Schwellen werden erst nach Slice 2 verbindlich festgelegt. Vorlaeufige Zielwerte:

- `engine/`: mindestens 90 Prozent Line-Coverage, zusaetzlich kritische Branch-/Fehlerpfade dokumentiert.
- `app/shared/`: mindestens 85 Prozent Line-Coverage.
- `workers/`: mindestens 80 Prozent Line-Coverage inklusive Entrypoint-Contracts.
- `types/`: 100 Prozent Import-/Contract-Abdeckung oder explizite Begruendung, falls reine Konstantenmodule nicht sinnvoll per Line-Coverage bewertet werden.
- `app/balance/` und `app/simulator/`: keine globale Prozent-Freigabe ohne Browser-Smoke-Gates; UI-nahe Module duerfen begruendete Ausnahmen haben.

Jede Ausnahme muss im Coverage-Inventar stehen:

- Datei.
- Grund fuer fehlende Automatisierung.
- Risiko.
- Manuelle oder alternative Verifikation.
- Geplante spaetere Automatisierung oder bewusste Akzeptanz.

## Umsetzungsslices

Jeder Slice bekommt vor Umsetzung eine eigene Slice-MD nach `docs/internal/SLICE_EXECUTION_RULES.md`. Die Nummerierung ist 1-basiert.

### Slice 1: Test-Runner-Hygiene und Isolation vorbereiten

**Geplante Slice-Datei:** `docs/internal/SLICE_TEST_COVERAGE_01_RUNNER_ISOLATION.md`  
**Abhaengigkeiten:** keine  
**Aenderungstyp:** Test-Infrastruktur  
**Status:** umgesetzt und freigegeben

Umsetzungsstand 2026-06-12:

- `tests/run-tests.mjs` sortiert Testdateien deterministisch, unterscheidet Assertion- und Dateifehler, zaehlt Assertion-Fehler nicht doppelt und bietet `--isolated`/`TEST_ISOLATED=1`.
- `tests/run-single.mjs` nutzt dieselben Assertion-Shims wie der Gesamtrunner und gibt den Stack-Trace bei Assertion-Fehlern aus.
- `tests/runner-contract.test.mjs` deckt Sortierung, Fehlerzaehlung, Setup-Fehler, isolierten Modus, `run-single` und `QUICK_TESTS`-Deprecation ab.
- Validierung: `node tests\run-single.mjs tests\runner-contract.test.mjs` und `npm test` erfolgreich; nach Behebung des Review-Blockers G-01 meldete `npm test` 80 Testdateien, 2163 Assertions, 0 Fehler, 0 offene Handles.
- Review/Freigabe fuer Slice 1 wurde am 2026-06-12 durch Gemini erteilt.

Ziel:

- Der bestehende Test-Runner soll vor weiteren Testausbauten reproduzierbarer und diagnostisch belastbarer werden.
- DOM-nahe Tests erhalten eine definierte Isolation-Strategie, bevor Balance-/Simulator-Orchestrierungstests erweitert werden.

Scope:

- `tests/run-tests.mjs`
- `tests/run-single.mjs`
- ggf. neuer isolierter Runner, z. B. `tests/run-isolated.mjs`
- ggf. neue Runner-Selbsttests fuer Dateiauswahl, Fehlerzaehlung und Isolation

Akzeptanzkriterien:

- Testdateien werden deterministisch sortiert.
- Ein fehlgeschlagener Assertion-Fehler wird nicht doppelt als Assertion- und Dateifehler gezaehlt.
- Der Runner unterscheidet Assertion-Fehler, Import-/Setup-Fehler und offene Handles in der Ausgabe.
- Fuer DOM-/Browser-global-nahe Tests existiert ein isolierter Ausfuehrungspfad in separaten Node-Prozessen oder ein gleichwertiger Teardown-Contract mit automatischer Kontrolle.
- Neue UI-Orchestrierungstests aus Slices 6 und 7 duerfen nur ueber diesen isolierten Pfad oder ueber Playwright laufen.
- `QUICK_TESTS` wird entweder durch eine dokumentierte, fachlich sinnvolle schnelle Auswahl ersetzt oder als deprecated markiert.

Pflichttests:

```powershell
node tests\run-single.mjs tests\runner-contract.test.mjs
npm test
```

Risiken:

- Aenderungen am Runner koennen die gesamte Testsuite betreffen.
- Wenn die Isolation ueber separate Prozesse erfolgt, muss die Laufzeit beobachtet werden.

### Slice 2: Coverage-Messung reparieren und baseline-faehig machen

**Geplante Slice-Datei:** `docs/internal/SLICE_TEST_COVERAGE_02_COVERAGE_BASELINE.md`  
**Abhaengigkeiten:** Slice 1  
**Aenderungstyp:** Test-Infrastruktur
**Status:** umgesetzt und freigegeben

Umsetzungsstand 2026-06-12:

- `tests/coverage-report.mjs` nutzt fuer `file://`-URLs `fileURLToPath` aus `node:url` und filtert `node:`, `http:`, leere und sonstige Nicht-Datei-URLs vor der Konvertierung.
- `app/`, `engine/`, `workers/` und `types/` werden ausgewertet; der finale Coverage-Lauf erzeugte `.coverage/summary.json` mit 159 Projektdateien.
- Reports ohne Projektdateien oder ohne ausfuehrbare Projektzeilen brechen mit Fehler ab.
- Dateien mit 0 ausfuehrbaren Zeilen bleiben sichtbar und erhalten `coveragePct: null`, statt als `100%` oder `NaN%` zu erscheinen.
- `tests/coverage-report.test.mjs` deckt Projektdateien aus allen vier Roots, Windows-Pfade mit Leerzeichen, UNC-`file://`, Nicht-Datei-URLs und den Leerreport-Exit-Code ab.
- Review-Finding G-01 wurde behoben: Verschachtelte V8-Ranges werden pro Script-Eintrag hierarchisch ausgewertet, sodass innere `count: 0`-Ranges nicht mehr durch aeussere ausgefuehrte Funktionsranges als covered erscheinen.
- Validierung nach Review-Fix: `node tests\run-single.mjs tests\coverage-report.test.mjs` erfolgreich mit 19 Assertions; `npm run test:coverage` erfolgreich mit 81 Testdateien, 2182 Assertions, 0 Fehler, 0 offenen Handles und Coverage-Baseline 72.89 Prozent (19183/26316).
- Review/Freigabe fuer Slice 2 wurde am 2026-06-12 durch Gemini erteilt.

Ziel:

- `npm run test:coverage` muss echte Dateien aus `app/`, `engine/`, `workers/` und `types/` auswerten.
- Windows- und UNC-`file://`-URLs muessen zwingend mit `fileURLToPath` aus `node:url` in lokale Pfade konvertiert werden.
- `.coverage/summary.json` darf bei erfolgreichem Testlauf nicht mehr `Files: 0` liefern.

Scope:

- `tests/coverage-report.mjs`
- ggf. `tests/run-coverage.mjs`
- ggf. Test fuer Coverage-URL-Normalisierung

Nicht-Scope:

- Keine fachlichen Tests.
- Keine Coverage-Schwellen, die den Build sofort blockieren.

Akzeptanzkriterien:

- Coverage-Report enthaelt echte Dateien aus `app/`, `engine/`, `workers/`.
- Coverage-Report enthaelt `types/` oder dokumentiert je Datei eine explizite Ausnahme.
- Der Report unterscheidet "keine Daten gefunden" von "100 Prozent".
- Fehlerhafte oder leere Coverage-Daten fuehren zu `process.exit(1)`.
- Ein Report mit 0 ausgewerteten Projektdateien darf niemals erfolgreich sein.
- Coverage-URLs werden vor `fileURLToPath` auf `file://` gefiltert; `node:`, `http:`, leere oder sonstige Nicht-Datei-URLs werden uebersprungen und nicht in `fileURLToPath` gegeben.
- `fileURLToPath` ist per Test fuer Windows-Pfade mit Leerzeichen und fuer UNC-/Netzwerkpfadformen abgedeckt, soweit unter Node sinnvoll simulierbar.
- Die Ausgabe nennt Gesamtwerte und schlechteste Dateien.

Pflichttests:

```powershell
node tests\run-single.mjs tests\coverage-report.test.mjs
npm run test:coverage
```

Risiken:

- V8-Coverage kann je nach Node-Version andere Range-Formate liefern.
- Line-Coverage aus V8-Ranges bleibt approximativ und darf nicht als Branch-Coverage verkauft werden.

### Slice 3: Coverage-Inventar und Modulklassifikation

**Geplante Slice-Datei:** `docs/internal/SLICE_TEST_COVERAGE_03_MODULE_INVENTORY.md`  
**Abhaengigkeiten:** Slice 2  
**Aenderungstyp:** Test-Infrastruktur und Dokumentation

Ziel:

- Automatisiert ermitteln, welche Quellmodule direkt, transitiv oder gar nicht durch Tests geladen werden.
- Dynamische Imports aus Tests muessen zumindest fuer bekannte Muster wie `await import(moduleUrl)` im Inventar beruecksichtigt oder als "runtime-dynamisch, statisch nicht aufloesbar" markiert werden.
- Risikoklassen fuer Module einfuehren.

Scope:

- neues oder erweitertes Script unter `tests/` oder `scripts/dev/`
- Coverage-Inventar unter `docs/internal/` oder generierter `.coverage/`-JSON
- Doku im uebergeordneten Plan aktualisieren

Modulklassen:

- `critical-core`: Engine, Steuer, Transaktion, Persistenzvertrag.
- `deterministic-app`: DOM-freie App-Logik.
- `ui-entry`: Browser-/HTML-nahe Einstiegsmodule.
- `worker-entry`: Worker-Dateien und Message-Contracts.
- `live-io`: Netzwerk-/Preis-/Datenabrufpfade.
- `generated-or-release`: generierte oder Release-Artefakte, die nicht primaer editiert werden.

Akzeptanzkriterien:

- Inventar listet alle Dateien aus `app/`, `engine/`, `workers/` und `types/`.
- Jede Datei hat eine Klasse und einen Coverage-Status.
- Nicht geladene Dateien werden explizit ausgewiesen.
- Dynamisch geladene Dateien wie `app/balance/balance-main.js` werden nicht faelschlich als ungeladen ausgegeben, wenn Runtime-Coverage sie erfasst.
- Bewusst ausgeschlossene Dateien haben eine Begruendung.

Pflichttests:

```powershell
node tests\run-single.mjs tests\coverage-inventory.test.mjs
npm test
```

Risiken:

- Statische Importanalyse erkennt dynamische Imports und HTML-Script-Einstiege nur begrenzt.
- Das Inventar darf deshalb Runtime-Coverage nicht ersetzen.

### Slice 4: Browser-Smoke-Gates fuer HTML-Einstiege

**Geplante Slice-Datei:** `docs/internal/SLICE_TEST_COVERAGE_04_BROWSER_SMOKE.md`  
**Abhaengigkeiten:** Slice 3  
**Aenderungstyp:** Browser-Test-Infrastruktur

Ziel:

- Die wichtigsten HTML-Einstiege in einem echten Browser starten und minimale Nutzeraktionen pruefen.

Zu pruefende Einstiege:

- `index.html`
- `Balance.html`
- `Simulator.html`
- `depot-tranchen-manager.html`
- `Handbuch.html`

Mindestaktionen:

- Seite laedt ohne Console-Error der Schwere `error`.
- Hauptnavigation oder zentrale Controls sind sichtbar.
- Balance: Initialberechnung und mindestens eine Input-Aenderung.
- Simulator: Eingaben lesen, Simulation/Backtest oder ein schneller deterministischer Pfad startet.
- Tranchenmanager: Tabelle/Empty-State und Modal-Open-Flow.
- Handbuch: Navigation/Abschnittsanker funktioniert.

Tool-Entscheidung:

- Harte Planentscheidung: Playwright wird als CI-faehiges Browser-Gate vorgesehen.
- Playwright laeuft in einem separaten Script, z. B. `npm run test:browser`, und nicht automatisch in `npm test`, solange Laufzeit und Browser-Installation nicht bewertet sind.
- Das Testskript startet und stoppt einen lokalen HTTP-Server selbst. `file://` ist fuer ES-Modul-Smokes nicht zulaessig.
- Falls Playwright nicht installiert oder nicht freigegeben werden kann, bleibt Slice 4 blockiert; Slices 6 und 7 duerfen dann nicht beginnen.

Akzeptanzkriterien:

- Jeder Einstieg hat mindestens einen automatisierten Playwright-Smoke; dokumentierte manuelle Checks sind nur Zusatz, kein Gate-Ersatz.
- Console-Errors werden gesammelt und bewertet.
- Tests laufen ohne echte Netzwerkpflicht.
- DOM-Mocks werden fuer diese Gate-Klasse nicht als Ersatz akzeptiert.
- HTTP-Server-Start, dynamische Portwahl via Port `0` oder Freiportpruefung, Timeout, Cleanup und Fehlerausgabe sind im Testskript geregelt.

Pflichttests:

```powershell
npm test
```

Zusaetzlich, je nach gewaehltem Browser-Gate:

```powershell
node tests\browser-smoke.test.mjs
```

Risiken:

- Browser-Automation kann lokale Port-/File-URL-Unterschiede offenlegen.
- Playwright-Einfuehrung waere eine neue Dependency und muss separat begruendet werden.

### Slice 5: Worker-Entrypoints und Message-Contracts

**Geplante Slice-Datei:** `docs/internal/SLICE_TEST_COVERAGE_05_WORKER_ENTRYPOINTS.md`  
**Abhaengigkeiten:** Slice 3  
**Aenderungstyp:** Worker-Testabdeckung

Ziel:

- Worker-Dateien selbst testen, nicht nur gemeinsam genutzte Runner.
- Message-Contracts fuer Erfolg, Fehler, Progress und unbekannte Jobtypen absichern.

Betroffene Dateien:

- `workers/mc-worker.js`
- `workers/worker-pool.js`
- `workers/worker-telemetry.js`
- `app/simulator/auto-optimize-worker.js`

Akzeptanzkriterien:

- `mc-worker.js` wird in einem echten Worker-/Worker-Thread-nahen Pfad geladen; reine Funktionsmocks reichen nicht als Entrypoint-Test.
- Structured-Clone-/Transferable-nahe Message-Payloads werden getestet.
- Gueltige Jobs liefern erwartete Ergebnisstruktur.
- Ungueltige Jobs liefern kontrollierte Fehlerantworten.
- Worker-Fehler beenden nicht den gesamten Testprozess unkontrolliert.
- Bestehende Parity-Tests bleiben gruen.

Pflichttests:

```powershell
node tests\run-single.mjs tests\worker-pool.test.mjs
node tests\run-single.mjs tests\worker-parity.test.mjs
node tests\run-single.mjs tests\mc-worker-contract.test.mjs
npm test
```

Risiken:

- Node Worker Threads und Browser Worker unterscheiden sich in Details.
- Wenn kein echter Browser-Worker genutzt wird, muss der Unterschied dokumentiert bleiben.

### Slice 6: UI-Orchestrierung der Balance-App

**Geplante Slice-Datei:** `docs/internal/SLICE_TEST_COVERAGE_06_BALANCE_UI_ORCHESTRATION.md`  
**Abhaengigkeiten:** Slices 1 und 4  
**Aenderungstyp:** Balance-Integrationstests

Ziel:

- Die derzeit schwach geladenen Balance-Einstiegsmodule gezielt absichern.

Betroffene Risikomodule:

- `app/balance/balance-main.js`
- `app/balance/balance-binder.js`
- `app/balance/balance-binder-annual.js`
- `app/balance/balance-binder-imports.js`
- `app/balance/balance-main-profile-sync.js`
- `app/balance/balance-main-profilverbund.js`
- `app/balance/balance-annual-modal.js`

Akzeptanzkriterien:

- Initialisierung ist idempotent.
- Fehlende DOM-Elemente fuehren zu kontrolliertem Verhalten.
- Tests laufen entweder in Playwright oder im isolierten Runner aus Slice 1; gemeinsamer globaler Node-Prozess ist fuer neue DOM-nahe Tests nicht zulaessig.
- Profil-Sync und Profilverbund-Hooks werden einmalig gebunden.
- Jahresupdate-/Jahresabschluss-Aktionen bleiben in der dokumentierten Reihenfolge.
- Import-/Export-Fehlerpfade zeigen Nutzerfeedback statt stiller Fehler.

Pflichttests:

```powershell
node tests\run-single.mjs tests\balance-smoke.test.mjs
node tests\run-single.mjs tests\balance-annual-workflow-contract.test.mjs
node tests\run-single.mjs tests\balance-ui-orchestration.test.mjs
npm test
```

Risiken:

- Zu breite DOM-Mocks koennen falsche Sicherheit erzeugen.
- Browser-Smoke aus Slice 4 bleibt deshalb Voraussetzung.

### Slice 7: UI-Orchestrierung des Simulators

**Geplante Slice-Datei:** `docs/internal/SLICE_TEST_COVERAGE_07_SIMULATOR_UI_ORCHESTRATION.md`  
**Abhaengigkeiten:** Slices 1 und 4  
**Aenderungstyp:** Simulator-Integrationstests

Ziel:

- Die Simulator-Hauptmodule und UI-Orchestrierung absichern, die derzeit nicht transitiv geladen werden.

Betroffene Risikomodule:

- `app/simulator/simulator-main.js`
- `app/simulator/simulator-main-init.js`
- `app/simulator/simulator-main-tabs.js`
- `app/simulator/simulator-main-reset.js`
- `app/simulator/simulator-main-stress.js`
- `app/simulator/simulator-main-profiles.js`
- `app/simulator/simulator-main-partner.js`
- `app/simulator/simulator-main-input-persist.js`
- `app/simulator/simulator-main-sweep-ui.js`
- `app/simulator/simulator-main-sweep-selftest.js`
- `app/simulator/simulator-optimizer.js`
- `app/simulator/simulator-sweep.js`

Akzeptanzkriterien:

- Simulator-Initialisierung laeuft einmalig und ohne unhandled rejection.
- Tests laufen entweder in Playwright oder im isolierten Runner aus Slice 1; gemeinsamer globaler Node-Prozess ist fuer neue DOM-nahe Tests nicht zulaessig.
- Tabs und zentrale Buttons werden korrekt verdrahtet.
- Reset- und Persistenzpfade erhalten bestehende Profil-/Input-Contracts.
- Sweep-UI blockiert ungueltige Kombinationen sichtbar.
- Optimizer-Startpfad kann mit Fake-Runner ohne lange MC-Laeufe getestet werden.

Pflichttests:

```powershell
node tests\run-single.mjs tests\simulator-input-readers.test.mjs
node tests\run-single.mjs tests\simulator-sweep.test.mjs
node tests\run-single.mjs tests\simulator-ui-orchestration.test.mjs
npm test
```

Risiken:

- Simulator-UI ist breit gekoppelt. Wenn mehr als 5 Dateien geaendert werden muessten, greift die Stop-Regel.
- Lange Monte-Carlo-Laeufe duerfen nicht in UI-Smoke-Tests landen.

### Slice 8: Tranchenmanager, Profil-UI und Preisservice

**Geplante Slice-Datei:** `docs/internal/SLICE_TEST_COVERAGE_08_TRANCHES_PROFILE_PRICE_SERVICE.md`  
**Abhaengigkeiten:** Slices 1, 3 und 4 fuer UI-nahe Teile  
**Aenderungstyp:** UI-/Service-Contract-Tests

Ziel:

- Nicht geladene Profil- und Tranchenmodule sowie Live-Preisservice absichern.

Betroffene Dateien:

- `app/tranches/tranchen-manager-page.js`
- `app/tranches/tranchen-price-service.js`
- `app/profile/profile-bridge.js`
- `app/profile/profile-manager.js`
- `app/profile/profilverbund-balance-ui.js`

Akzeptanzkriterien:

- Tranchenmanager-Seite initialisiert mit leerem, gueltigem und korruptem Storage.
- Preisservice wird mit Fake-Fetch getestet: Erfolg, Timeout, HTTP-Fehler, unvollstaendige Antwort.
- Dauerhaft offlineer Preisservice blockiert die UI nicht; vorhandene lokale Daten bleiben nutzbar und es gibt einen sichtbaren degradierenden Status.
- Profil-Bridge behandelt fehlende Profile und Handoff-Daten kontrolliert.
- Profilverbund-UI rendert keine doppelt gezaehlten Assets.
- Keine echten Netzwerkaufrufe in `npm test`.

Pflichttests:

```powershell
node tests\run-single.mjs tests\tranchen-manager-state.test.mjs
node tests\run-single.mjs tests\tranchen-manager-page.test.mjs
node tests\run-single.mjs tests\tranchen-price-service.test.mjs
node tests\run-single.mjs tests\profile-ui-contract.test.mjs
npm test
```

Risiken:

- Live-Datenformate koennen sich extern aendern. Tests muessen deshalb den internen Contract pruefen, nicht aktuelle Anbieterantworten.

### Slice 9: Fehlerpfade und negative Contracts im Finanzkern

**Geplante Slice-Datei:** `docs/internal/SLICE_TEST_COVERAGE_09_CORE_NEGATIVE_CONTRACTS.md`  
**Abhaengigkeiten:** Slice 2  
**Aenderungstyp:** Engine-/Contract-Tests

Ziel:

- Nicht nur Happy Paths, sondern fachlich riskante Fehler- und Grenzfaelle im Kern explizit absichern.

Fokusbereiche:

- `minimumFlexAnnual` darf nie still begrenzt werden, sondern muss validiert werden.
- UI- und Engine-Parameternamen muessen konsistent bleiben.
- Steuer-/Settlement-Pfade mit Verlusttopf, Teilfreistellung und Forced Sales.
- FlowDelta- und Snapshot-/Backtest-Abweichungen als harte Signale.
- Negative/NaN/Infinity-Werte in Engine- und Simulator-Inputs.

Akzeptanzkriterien:

- Jede Stop-Regel aus `AGENTS.md`, die testbar ist, hat mindestens einen Contract-Test oder eine dokumentierte manuelle Pruefung.
- `minimumFlexAnnual`-Tests pruefen zuerst die bestehende Lade-, Migrations- und Validierungsstrecke. Sie duerfen keine neue strikte Runtime-Validierung einfuehren.
- Wenn Tests zeigen, dass Bestandsdaten mit ungueltigem `minimumFlexAnnual` abstuerzen oder still verfremdet werden, stoppt dieser Slice. Dann wird ein separater Migrations-/Bugfix-Plan erstellt, bevor Semantik geaendert wird.
- Unklare Engine-Semantik wird nicht im Test "festgeschrieben", sondern als offene Frage markiert.
- Bestehende Golden-/Backtest-Erwartungen werden nicht ohne Review angepasst.

Pflichttests:

```powershell
node tests\run-single.mjs tests\engine-robustness.test.mjs
node tests\run-single.mjs tests\simulator-backtest.test.mjs
node tests\run-single.mjs tests\core-negative-contracts.test.mjs
npm test
```

Risiken:

- Neue negative Tests koennen reale Altfehler offenlegen. Dann wird die Umsetzung gestoppt und ein separater Bugfix-Plan erstellt.

### Slice 10: Persistenz-, Migration- und Tauri-Gates

**Geplante Slice-Datei:** `docs/internal/SLICE_TEST_COVERAGE_10_PERSISTENCE_TAURI_GATES.md`  
**Abhaengigkeiten:** Slice 2  
**Aenderungstyp:** Adapter-/Release-nahe Tests

Ziel:

- Persistenz- und Tauri-nahe Pfade als eigene Gate-Klasse absichern.

Fokusbereiche:

- IndexedDB Upgrade-/Blocked-/Versionchange-Pfade.
- localStorage-Fallback und Recovery.
- Tauri JSON-Adapter-Contracts.
- Rust-Commands fuer Datei-Targets, Quarantaene und Fehlerantworten.
- CSP-/Release-Konfiguration.

Akzeptanzkriterien:

- `persistence.test.mjs` bleibt die zentrale Contract-Suite und wird bei neuen Adapterpfaden erweitert.
- Tauri-spezifische Tests sind als separates Gate dokumentiert, falls sie nicht in `npm test` laufen.
- Frontend-Aenderungen an Tauri-Payload-Shapes muessen ein Tauri-/Rust-Gate ausloesen oder explizit begruenden, warum kein Rust-Contract betroffen ist.
- Release-nahe Tests nennen exakt, wann `npm run tauri:build` oder ein Rust-Test erforderlich ist.

Pflichttests:

```powershell
node tests\run-single.mjs tests\persistence.test.mjs
node tests\run-single.mjs tests\tauri-csp.test.mjs
npm test
```

Wenn `src-tauri/` geaendert wird:

```powershell
npm run tauri:build
```

Risiken:

- Tauri-Builds sind langsamer und koennen lokale Toolchain-Probleme offenlegen.
- Rust-Tests duerfen nicht durch reine Frontend-Tests ersetzt werden, wenn Rust-Code geaendert wird.

### Slice 11: Dokumentation, Gates und Review-Workflow finalisieren

**Geplante Slice-Datei:** `docs/internal/SLICE_TEST_COVERAGE_11_DOCUMENTATION_GATES.md`  
**Abhaengigkeiten:** Slices 1 bis 10  
**Aenderungstyp:** Dokumentation und Test-Gates

Ziel:

- Die neue Testabdeckungsstrategie in Referenzdoku und Testsuite-Doku verankern.

Zu aktualisieren:

- `tests/README.md`
- `README.md`, falls sich Standard-Testbefehle oder Gates aendern.
- `docs/reference/TECHNICAL.md`, falls Testarchitektur oder Browser-/Tauri-Gates relevant fuer Architektur sind.
- `docs/internal/PROJEKTUEBERSICHT.md`, falls aktive Qualitaetsgates beschrieben werden.
- dieser Arbeitsplan mit tatsaechlichem Abschlussstatus je Slice.

Akzeptanzkriterien:

- Testbefehle sind aktuell und reproduzierbar.
- Coverage-Gates sind beschrieben.
- Ausnahmen sind dokumentiert.
- Manuelle Verifikationen sind nicht mit automatisierten Tests vermischt.
- Review-Feedback von Gemini/Claude ist eingearbeitet oder mit Entscheidung dokumentiert.

Pflichttests:

```powershell
npm test
npm run test:coverage
```

Je nach vorherigen Slices zusaetzlich:

```powershell
npm run tauri:build
```

Risiken:

- Dokumentations-Sync kann Dateien ausserhalb des urspruenglichen Test-Scope betreffen. Wenn mehr als 5 Dateien geaendert werden muessten, greift die Stop-Regel.

## Reihenfolge und Abhaengigkeiten

Empfohlene Reihenfolge:

1. Slice 1 stabilisiert Runner, Fehlerzaehlung und Isolation.
2. Slice 2 repariert die Coverage-Messung.
3. Slice 3 erstellt Inventar und Klassifikation.
4. Slice 4 etabliert Playwright-basierte Browser-Smoke-Gates mit eigenem HTTP-Testserver.
5. Slice 5 sichert Worker-Einstiege.
6. Slice 6 und 7 decken Balance- und Simulator-Orchestrierung ab.
7. Slice 8 deckt Tranchen-/Profil-/Preisservice-Luecken ab.
8. Slice 9 haertet negative Kern-Contracts.
9. Slice 10 ergaenzt Persistenz-/Tauri-Gates.
10. Slice 11 finalisiert Doku und Gates.

Slices 5, 8, 9 und 10 koennen nach Slice 3 teilweise parallel geplant werden. Slices 6 und 7 bleiben blockiert, bis Slice 1 und Slice 4 erfolgreich abgeschlossen und freigegeben sind.

## Review-Checkliste

- [ ] Coverage-Report wertet echte Dateien aus.
- [ ] Leere Coverage-Daten fuehren nicht zu falschen 100 Prozent.
- [ ] Test-Runner zaehlt Fehler nicht doppelt und bietet einen isolierten Pfad fuer DOM-nahe Tests.
- [ ] Alle nicht geladenen Quellmodule sind klassifiziert.
- [ ] Browser-Einstiege haben echte Playwright-Smoke-Gates mit lokalem HTTP-Testserver.
- [ ] Worker-Einstiegspunkte sind explizit getestet.
- [ ] Balance-Orchestrierung ist ueber Einstiegsmodule abgedeckt.
- [ ] Simulator-Orchestrierung ist ueber Einstiegsmodule abgedeckt.
- [ ] Tranchenmanager, Profil-UI und Preisservice haben Contract-Tests.
- [ ] Finanzkern hat negative Contract-Tests fuer Stop-Regeln.
- [ ] Persistenz- und Tauri-Gates sind getrennt und reproduzierbar.
- [ ] Doku beschreibt Standard-, Coverage-, Browser- und Release-nahe Gates.
- [ ] Coverage-Ausnahmen sind begruendet und reviewfaehig.

## Geklaerte Entscheidungen und offene Fragen

Geklaert:

1. Browser-Smokes werden als Playwright-Gate geplant. In-app Browser und manuelle Verifikation sind Zusatz, kein Gate-Ersatz.
2. Browser-Smokes laufen ueber einen vom Testskript verwalteten lokalen HTTP-Server.
3. Neue DOM-nahe UI-Orchestrierungstests laufen isoliert pro Prozess oder ueber Playwright.
4. `npm test` bleibt die schnelle Standardsuite; Browser- und Tauri-Gates laufen separat, bis Laufzeit und Installationsaufwand bewertet sind.

Offen:

1. Welche Coverage-Schwellen sollen nach reparierter Baseline verbindlich werden?
2. Welche nicht geladenen UI-Module sind bewusst nur ueber Browser-Smoke zu pruefen und bekommen keine Node-Unit-Tests?
3. Soll nach Runner-Hygiene ein kleiner, dokumentierter Entwickler-Subset-Befehl als Ersatz fuer `QUICK_TESTS=1` eingefuehrt werden?
4. Soll mittelbar eine Parallelisierung fuer nicht-DOM-nahe Tests eingefuehrt werden, oder bleibt die Suite bewusst sequentiell?

## Nicht-Ziele

- Keine manuelle Bearbeitung von `engine.js`.
- Keine Veraenderung fachlicher Engine-Semantik.
- Kein Build oder Sync von `dist/` oder `RuheStandSuite.exe`.
- Keine echten Netzwerkaufrufe in der Standardsuite.
- Keine pauschale Einfuehrung neuer Testframeworks ohne gesonderte Entscheidung.

## Review-Feedback von Gemini

### 1. Adversariale Detailanalyse

#### Korrektheit
- **Slice 1 (Coverage-Messung):** Der Plan spricht vage davon, dass Windows-`file:///C:/...`-URLs in lokale Pfade konvertiert werden müssen. Wenn hierfür eine eigene Regex- oder Ersetzungslogik anstelle des in Node.js integrierten und standardisierten `fileURLToPath` verwendet wird, drohen Fehler bei gemischter Groß-/Kleinschreibung von Laufwerksbuchstaben, Leerzeichen im Pfad oder UNC-Netzwerkpfaden.
- **Slice 3 (Browser-Smoke-Gates):** Die Formulierung „Bevorzugt Browser-Plugin/in-app Browser fuer lokale Smoke-Verifikation“ deutet darauf hin, dass diese Tests manuell oder semi-automatisch durchgeführt werden sollen. Ein Smoke-Gate, das nicht vollautomatisiert in der CLI (`npm test` oder ein CI-Run) ausgeführt werden kann, verliert seine präventive Wirkung. Ohne eine klare Festlegung auf ein Tool wie Playwright bleibt unklar, wie Regressionen vor dem Commit automatisch verhindert werden.
- **Slice 4 (Worker-Entrypoints):** Die Verwendung einer „Worker-ähnlichen Harness“ zur Messung von Contracts birgt das Risiko, dass Concurrency-Probleme, Deadlocks, Speicherlecks oder Serialisierungsfehler (Structured Clone) unentdeckt bleiben. Echte Node-Worker verhalten sich anders als Mock-Harnesses.

#### Vertragstreue
- **Slice 8 (Negative Contracts):** Die Durchsetzung von `minimumFlexAnnual`-Validierung statt stiller Begrenzung ist fachlich korrekt. Wenn jedoch bestehende (ältere) Nutzerprofile ungültige oder zuvor still korrigierte Werte enthalten, führt die strikte Validierung ohne automatischen Migrationspfad oder sanften Fallback zu einem Absturz beim Laden alter Daten.
- **Slice 9 (Tauri-Gates):** Tauri-Commands basieren auf stark typisierter Serialisierung in Rust. Wenn sich JS-Strukturen ändern, bricht die Rust-Deserialisierung. Der Plan sieht vor, die Tauri/Rust-Verifikation „getrennt von der schnellen Node-Standardsuite“ zu halten. Dies führt zu einer Lücke, in der inkompatible Typänderungen im Frontend committet werden können, ohne dass die Standardsuite anschlägt.

#### Fehlerbehandlung
- **Coverage-Skript-Ausfälle:** Falls das V8-Coverage-Skript unvollständige Daten erzeugt, darf dies nicht geräuschlos ignoriert werden oder zu einem Exit-Code 0 führen. Der Fehlerbehandlungspfad der Coverage-Pipeline selbst muss strikt validiert werden.
- **Slice 7 (Preisservice-Fakes):** Der HTTP-Fehlertest des Preisservice prüft zwar Fakes, aber der Plan definiert nicht, wie das UI reagiert, wenn der Service dauerhaft offline ist. Es fehlt ein Test, der sicherstellt, dass das UI nicht blockiert, sondern eine degradierte, aber stabile Offline-Nutzung ermöglicht.

#### Seiteneffekte
- **Laufzeit-Performance:** V8-Coverage-Messung über die gesamte Testsuite (einschließlich rechenintensiver Monte-Carlo-Simulationen) kann die Testlaufzeit drastisch erhöhen. Wenn Entwickler durch langsame Testläufe frustriert werden, sinkt die Frequenz der lokalen Testausführung.
- **DOM- und Global-Scope-Pollution:** Das direkte Laden von Modulen wie `balance-main.js` oder `simulator-main.js` in einer Node-JSDOM-Umgebung (Slices 5 & 6) kann globale Variablen (`window`, `document`) verschmutzen und Seiteneffekte zwischen Testdateien erzeugen, wenn sie nicht strikt isoliert werden.

#### Was könnte brechen?
- Das Laden von Browser-ES-Modulen in Node.js ohne Bundling-Schritt ist extrem fragil. Diese Module importieren andere Module, die möglicherweise auf Browser-APIs oder spezifische Pfadauflösungen angewiesen sind. Wenn JSDOM-Mocks nicht exakt dem Browser entsprechen, schlagen Tests aufgrund von syntaktischen oder umgebungsbedingten Fehlern fehl, die im realen Betrieb gar nicht existieren. Dies führt zu einem hohen Wartungsaufwand für die Mocks.

---

### 2. Strukturierte Findings & Blocker

1. **[BLOCKER] Fehlende Standardisierung bei Pfadkonvertierung (Slice 1):** Die Korrektur der Pfade darf nicht durch Ad-hoc-Stringoperationen gelöst werden. Es muss zwingend `fileURLToPath` verwendet werden.
2. **[BLOCKER] Fehlender Migrationsschutz bei `minimumFlexAnnual` (Slice 8):** Bevor die strikte Validierung scharf geschaltet wird, muss spezifiziert werden, wie Alt-Profile migriert oder abgefangen werden, um Runtime-Crashes bei existierenden Nutzerdaten zu verhindern.
3. **[KRITIK] Unentschlossenheit bei Browser-Automation (Slice 3):** Die Wahl des Tools (Playwright vs. lokal manuell) muss vor Beginn von Slice 3 geklärt sein. Reine manuelle oder Plug-in-basierte Verifikation reicht für ein stabiles Gate nicht aus.
4. **[KRITIK] Fehlende Isolation bei UI-Orchestrierungstest (Slice 5 & 6):** Da diese Module stark mit dem DOM und globalen Events gekoppelt sind, müssen die Testdateien in komplett isolierten Prozessen oder sauber aufgeräumten JSDOM-Umgebungen ausgeführt werden.

---

## Review-Ergebnis
- **Status:** blockiert (Freigabe erst nach Behebung der Blocker 1 und 2 sowie Klärung der Kritikpunkte)
- **Blocker:**
  1. Fehlender Einsatz von `fileURLToPath` für die Pfadnormalisierung in Slice 1 festschreiben.
  2. Migrations- und Fallback-Konzept für `minimumFlexAnnual` bei Bestandsdaten in Slice 8 ergänzen.
- **Restrisiken:**
  - Erhöhte Testlaufzeit durch V8-Coverage-Messung bei Monte-Carlo-Tests.
  - Fragilität von DOM-Mocks für komplexe Browser-ESMs in Node.js.
  - Divergenz zwischen Tauri-Rust-Command-Typen und JS-Payloads bei getrennten Testsuites.
- **Pre-Mortem:**
  > „Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  >
  > Ein Benutzer lädt ein altes, lokal gespeichertes Profil, das einen ungültigen `minimumFlexAnnual`-Wert enthält. Die in Slice 8 eingeführte strikte Validierung wirft beim Laden eine Exception, die vom UI-Orchestrierer (Slice 5) nicht abgefangen wird. Die App friert mit einem Whitescreen ein, da im Test-Scope nur der Happy-Path der Profil-Bridge mit neuen Mock-Daten getestet wurde.“

## Review-Feedback von Claude

**Reviewer:** Claude (optionaler Reviewer gemäss SLICE_EXECUTION_RULES.md)  
**Datum:** 2026-06-11  
**Grundlage:** Quelltext-Stand 2026-06-11, statische und dynamische Importanalyse, Inspektion von `tests/run-tests.mjs`, `tests/run-coverage.mjs`, `tests/coverage-report.mjs`, `tests/README.md`, `.coverage/summary.json`, alle 80 Testdateien, alle 181 Quellmodule.

---

### 1. Prüfdimensionen

#### Korrektheit vs. Akzeptanzkriterien

- **Faktische Ungenauigkeit im Ausgangsbefund (Zeilen 46–54):** Der Plan listet `app/balance/balance-main.js` als „nicht transitiv geladen". Tatsächlich wird `balance-main.js` in `balance-smoke.test.mjs` (Zeilen 272–276) über einen dynamischen `await import(moduleUrl)` geladen und zur Laufzeit ausgeführt. Die statische Importanalyse hat diesen Pfad nicht erkannt. Die Angabe „31 Dateien werden nicht transitiv geladen" ist damit überhöht — der tatsächliche Wert liegt bei maximal 30 oder weniger, je nachdem ob `balance-main.js` transitiv weitere Module zieht, die dann ebenfalls als „geladen" reklassifiziert werden müssten. Das ist kein gravierender Fehler, aber der Plan darf sich nicht auf eine Zahl stützen, die bereits bei Erstellung ungenau war.
- **Testdatei-Zählung veraltet:** Der Plan nennt „79 Testdateien" (Zeile 33, übernommen aus `tests/README.md`). Tatsächlich existieren **80** `.test.mjs`-Dateien. Die Dateien `persistence.test.mjs` (61 KB — die grösste Testdatei), `snapshot-archive.test.mjs` und `snapshot-key-policy.test.mjs` fehlen in der README-Tabelle. Der Plan übernimmt die veraltete Zahl unkritisch.
- **`types/`-Verzeichnis nicht im Scope:** Das Verzeichnis `types/` enthält 2 Laufzeit-Quelldateien (`profile-types.js`, `strategy-options.js`), die zur Runtime genutzt werden. Der Plan beschränkt sich auf `app/`, `engine/`, `workers/` — konsistent mit `coverage-report.mjs` Zeile 11. Trotzdem ist `types/` eine blinde Stelle: Diese Dateien definieren Profil- und Strategie-Typen, die bei Inkonsistenz fachliche Fehler verursachen können.

#### Vertragstreue (bestehende Contracts/Interfaces)

- **Test-Runner hat einen Double-Counting-Bug:** In `run-tests.mjs` wird bei einer fehlgeschlagenen Assertion `failedTests` sowohl im Assertion-Handler (Zeile 29/42/52 via `throw`) als auch im `catch`-Block (Zeile 79) inkrementiert. Die Fehlerzählung ist damit systematisch inflationiert (1 extra pro fehlgeschlagener Datei). Der Plan erwähnt dieses Problem nirgends, obwohl es die Aussagekraft der Testresultate betrifft.
- **Keine Test-Isolation zwischen Dateien:** Alle 80 Testdateien laufen im selben Node.js-Prozess sequentiell via `import()`. Es gibt keinen Mechanismus, der globale Zustandsverschmutzung (`window`, `document`, `localStorage`-Mocks, Event-Listener) zwischen Dateien verhindert. Die Reihenfolge hängt von `readdirSync` ab, d.h. vom Dateisystem. Slices 5 und 6 (Balance- und Simulator-UI-Orchestrierung) planen das Laden von stark DOM-gekoppelten Modulen — ohne Isolation-Strategie wird das zu reihenfolgeabhängigen Flaky Tests führen.
- **Assertion-Modell limitiert Diagnosefähigkeit:** Es gibt kein `describe`/`it`-Muster, kein `beforeEach`/`afterEach`, keine Skip-/Focus-Mechanismen. Ein Assertion-Fehler in einer Datei bricht alle nachfolgenden Tests in derselben Datei ab. Slice 8 (negative Contracts) plant viele Grenzfälle pro Datei — ein früher Fehler könnte die restlichen Grenzfälle komplett verbergen.

#### Fehlerbehandlung (ungültige Eingaben, IO-Fehler, Rejection-Pfade)

- **Coverage-Pipeline Fehlerverhalten unklar:** `.coverage/summary.json` enthält aktuell `{"files": [], "total": {"executableLines": 0, "coveredLines": 0, "percent": 100}}`. Das ist ein falsches 100-Prozent-Signal. Der Plan erkennt das Problem (Zeile 37), aber die Akzeptanzkriterien für Slice 1 verlangen lediglich, dass der Report „echte Dateien enthält" und „leere Daten zu einem klaren Fehlerstatus führen". Es fehlt eine explizite Vorgabe, welcher Exit-Code oder welches Signal bei 0 gefundenen Dateien produziert wird — ein `exit(0)` mit leerer Datei wäre erneut ein stilles Versagen.
- **`run-single.mjs` vs. `run-tests.mjs` Divergenz:** Der Single-Runner gibt `PASS`-Meldungen aus (via `console.log`), der Hauptrunner hat diese auskommentiert. Der Single-Runner ruft bei Fehler `process.exit(1)` auf, zählt aber keine Statistiken. Wenn Slice-Pflichttests via `run-single.mjs` laufen (wie in mehreren Slices als erste Validierung geplant), entsteht eine abweichende Diagnosequalität.

#### Seiteneffekte (Module ausserhalb Slice-Scope)

- **`QUICK_TESTS`-Modus veraltet:** `QUICK_TESTS=1` führt ausschliesslich `worker-parity.test.mjs` aus. Das ist als Entwickler-Schnellvalidierung unbrauchbar. Der Plan adressiert diesen Zustand nicht. Wenn die Suite durch Coverage-Messung und Browser-Smoke deutlich langsamer wird (Gemini-Restrisiko „Laufzeit-Performance"), verschärft sich das Problem eines fehlenden schnellen Subsets.
- **Parallelisierungspotenzial ignoriert:** 80 sequentielle Testdateien in einem Prozess. Der Plan fügt potenziell 10+ weitere Testdateien hinzu, ohne die Parallelisierung auch nur als spätere Ausbaustufe zu erwähnen. Die Gesamtlaufzeit wird relevant.

#### Was könnte brechen?

- **Slice-3-Entscheidung als kritischer Engpass:** Slices 5 und 6 hängen von Slice 3 ab (Browser-Smoke-Gates als „Voraussetzung"). Slice 3 hat eine ungelöste offene Frage (Playwright ja/nein). Solange diese Entscheidung nicht gefällt ist, sind 3 von 10 Slices blockiert. Der Plan stuft die Frage als „offen" ein (Zeile 569), aber die Abhängigkeitskette macht sie zum kritischen Pfad. Eine Verzögerung bei Slice 3 blockiert die gesamte UI-Orchestrierungsabdeckung.
- **Browser-Smoke erfordert HTTP-Server-Infrastruktur:** Die HTML-Einstiege (`Balance.html`, `Simulator.html` etc.) laden ES-Module über relative Pfade und benötigen einen HTTP-Server (kein `file://`-Zugriff wegen CORS/Module-Einschränkungen). Der Plan spezifiziert nicht, wie der Test-Server gestartet/gestoppt wird. Das Projekt nutzt `python dev_server.py` oder `start_suite.cmd` — keines davon ist in die Testpipeline integriert.

---

### 2. Findings

| ID | Schwere | Finding |
|---|---|---|
| C-01 | FAKTISCH | `balance-main.js` wird dynamisch via `await import()` in `balance-smoke.test.mjs` geladen und ist damit NICHT „nicht transitiv geladen". Der Ausgangsbefund „31 Dateien" ist überhöht. |
| C-02 | FAKTISCH | 80 Testdateien auf dem Dateisystem, Plan und README nennen 79. Drei Dateien (`persistence.test.mjs`, `snapshot-archive.test.mjs`, `snapshot-key-policy.test.mjs`) sind undokumentiert. |
| C-03 | RISIKO | `types/` (2 Laufzeit-Quelldateien: `profile-types.js`, `strategy-options.js`) ist weder im 181-Dateien-Scope noch im Coverage-Scope, obwohl die Dateien Profil- und Strategietypen definieren, die zur Runtime genutzt werden. |
| C-04 | INFRASTRUKTUR | Test-Runner `run-tests.mjs` zählt Fehler doppelt (Assertion-Handler + Catch-Block). Der Plan plant erhebliche Erweiterungen der Suite, ohne diesen bestehenden Bug zu adressieren. |
| C-05 | BLOCKER | Keine Test-Isolation zwischen Dateien. Alle 80+ Tests teilen denselben Prozess und globalen Scope. Slices 5 und 6 planen das Laden stark DOM-gekoppelter Module — ohne Isolation-Strategie werden reihenfolgeabhängige Flaky Tests entstehen. Die Stop-Regel „Tests nicht ausführbar" könnte greifen. |
| C-06 | RISIKO | Das Assertion-Modell (`throw` bei erstem Fehler) bricht alle Folgetests in einer Datei ab. Slice 8 (negative Contracts) plant viele Grenzfälle pro Datei — ein einzelner Fehler verbirgt potentiell Dutzende weitere. |
| C-07 | KRITIK | Exit-Code-Verhalten bei leerem Coverage-Report nicht spezifiziert. Die aktuelle `summary.json` zeigt 100% bei 0 Dateien — das ist ein falsches Signal, das in CI/Entwicklerworkflows durchrutschen kann. Akzeptanzkriterien für Slice 1 müssen den Fehlerexitcode bei 0 gefundenen Dateien explizit fordern. |
| C-08 | KRITIK | Slice-3-Abhängigkeitskette: Die Tool-Entscheidung (Playwright vs. manuell) blockiert Slices 5 und 6. Das ist keine offene Frage, sondern ein kritischer Pfad, der vor Beginn der Umsetzung entschieden sein muss. |
| C-09 | RISIKO | Browser-Smoke-Tests (Slice 3) benötigen einen HTTP-Server für ES-Module. Die Serverstart-/Stoppinfrastruktur für die Testpipeline ist nicht spezifiziert. |
| C-10 | RISIKO | `QUICK_TESTS`-Modus läuft nur `worker-parity.test.mjs` — wird durch geplante Erweiterungen (Coverage, Browser-Smoke) noch nutzloser. Kein Konzept für einen schnellen Entwickler-Subset. |
| C-11 | HINWEIS | `run-single.mjs` und `run-tests.mjs` divergieren in Ausgabeformat und Fehlerberichterstattung. Wenn Slice-Pflichtvalidierungen via `run-single.mjs` laufen, ist die Diagnosekonsistenz eingeschränkt. |
| C-12 | HINWEIS | Plan enthält keine Erwähnung der fehlenden Parallelisierung der Testsuite. Mit 80+ Dateien, geplanten Browser-Smoke-Tests und Coverage-Messung wird die Gesamtlaufzeit ein praktisches Problem für die Entwicklerergonomie. |

---

### 3. Abgrenzung zu Gemini-Findings

| Gemini-Finding | Claude-Einordnung |
|---|---|
| G-1 (BLOCKER: `fileURLToPath`) | **Unterstützt.** Die bestehende `coverage-report.mjs` Zeile 111 nutzt tatsächlich `entry.url.replace('file://', '')`, was auf Windows `/C:/...` statt `C:\...` erzeugt. `fileURLToPath` ist die korrekte Lösung. |
| G-2 (BLOCKER: `minimumFlexAnnual`-Migration) | **Unterstützt, aber reduziert.** Slice 8 plant Tests für Stop-Regeln — die Validierung selbst wird nicht implementiert, sondern nur getestet. Der Migrations-Blocker greift nur, wenn der Test eine bestehende stille Begrenzung als Fehler offenlegt und Codex dann die Semantik ändert. Das wäre ein Stop-Regel-Fall aus AGENTS.md, kein Plan-Defizit. Empfehlung: Geminis Blocker auf Risiko-Dokumentation reduzieren, aber Stop-Regel-Verweis beibehalten. |
| G-3 (KRITIK: Browser-Automation) | **Verstärkt als C-08:** Nicht nur „Unentschlossenheit", sondern ein kritischer Pfad, der Slices 5 und 6 blockiert. |
| G-4 (KRITIK: Fehlende Isolation) | **Verstärkt als C-05 (BLOCKER):** Ohne Isolation-Strategie ist die geplante Erweiterung in Slices 5/6 nicht nur riskant, sondern architektonisch unsicher. |

---

### 4. Pre-Mortem

> „Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb — was ist die wahrscheinlichste Ursache?"
>
> Ein Entwickler fügt einen neuen Test in Slice 6 (Simulator-UI) hinzu, der global `document.getElementById` überschreibt. Der Test selbst läuft grün. Aber der folgende Test in alphabetischer Reihenfolge — `spending-planner.test.mjs` — nutzt ebenfalls einen DOM-Mock und erbt den korrumpierten Zustand. Ein subtil falsches Testergebnis im SpendingPlanner wird als „grün" gemeldet, obwohl die getestete Logik bei bestimmten Guardrail-Konstellationen einen falschen Entnahmebetrag berechnet. Der Fehler geht in Produktion, weil die Testsuite keine Isolation erzwingt und die Coverage-Zahl von 90%+ ein falsches Sicherheitsgefühl vermittelt.
>
> **Sekundäres Szenario:** Die Coverage-Messung wird nach Slice 1 repariert und zeigt 72% für `engine/`. Das Team konzentriert sich auf Line-Coverage-Steigerung und schreibt Tests, die Codezeilen durchlaufen, ohne fachlich relevante Assertions zu prüfen. Branch-Coverage und Fehlerpfade bleiben unterbelichtet. Ein seltener Steuer-/Verlusttopf-Grenzfall in `tax-settlement.mjs` wird nie getestet und tritt bei einem Jahresabschluss mit negativem Settlement-Delta auf.

---

### 5. Review-Ergebnis

- **Status:** blockiert
- **Blocker:**
  1. **C-05 (Test-Isolation):** Der Plan muss vor Slices 5/6 eine konkrete Isolation-Strategie spezifizieren (separate Prozesse, Worker-Threads, JSDOM-Teardown-Contract oder vergleichbar). Ohne dies ist die geplante Erweiterung architektonisch unsicher.
  2. **C-08 (Browser-Automation-Entscheidung):** Die Playwright-vs.-manuell-Frage muss vor Slice-3-Start als harte Entscheidung im Plan stehen, nicht als offene Frage. Sie blockiert den kritischen Pfad.
- **Blocker-Übernahme von Gemini:**
  3. G-1 (`fileURLToPath`) — unterstützt als Blocker.
  4. G-2 (`minimumFlexAnnual`) — empfohlen als Risiko-Dokumentation mit Stop-Regel-Verweis statt als harter Plan-Blocker.
- **Restrisiken:**
  - Double-Counting-Bug im Test-Runner verfälscht Fehlerstatistiken (C-04).
  - `types/`-Verzeichnis im Coverage-Blindspot (C-03).
  - Assertion-Modell verhindert vollständige Grenzfall-Diagnose in Slice 8 (C-06).
  - Fehlender Schnelltest-Subset für Entwickler-Workflow (C-10).
  - Steigende Testlaufzeit ohne Parallelisierungs-Konzept (C-12).
  - HTTP-Server-Infrastruktur für Browser-Smoke nicht spezifiziert (C-09).

## Review-Antworten von Codex

**Stand:** 2026-06-11  
**Status:** Ueberarbeitung 1 eingearbeitet; erneutes Review durch Gemini/Claude erforderlich. Codex erteilt keine Selbstfreigabe.

### Antworten auf Gemini

G-1 `fileURLToPath`: angenommen. Slice 2 schreibt jetzt zwingend `fileURLToPath` aus `node:url` vor, inklusive Akzeptanzkriterium fuer Windows-Pfade mit Leerzeichen und UNC-/Netzwerkpfadformen. Ein Report mit 0 Projektdateien muss `process.exit(1)` liefern.

G-2 `minimumFlexAnnual`-Migration: teilweise angenommen und eingegrenzt. Slice 9 darf keine neue strikte Runtime-Semantik einfuehren. Er prueft zuerst bestehende Lade-, Migrations- und Validierungsstrecken. Wenn dabei eine stille Begrenzung, ein Bestandsdaten-Crash oder eine notwendige Semantikaenderung sichtbar wird, greift die Stop-Regel: separater Bugfix-/Migrationsplan statt Fortsetzung im Testabdeckungs-Slice.

G-3 Browser-Automation: angenommen. Der Plan entscheidet sich hart fuer Playwright als automatisiertes Gate. Manuelle oder in-app-Browser-Verifikation ist nur Zusatz. Slice 4 bleibt blockiert, falls Playwright nicht installiert/freigegeben werden kann; Slices 6 und 7 duerfen dann nicht beginnen.

G-4 Isolation bei UI-Orchestrierung: angenommen. Neuer Slice 1 fuehrt Runner-Hygiene und Isolation vor UI-Orchestrierung ein. Slices 6 und 7 duerfen neue DOM-nahe Tests nur ueber Playwright oder den isolierten Runner aus Slice 1 ausfuehren.

### Antworten auf Claude

C-01 `balance-main.js` dynamisch geladen: angenommen. Der Ausgangsbefund wurde korrigiert. `balance-main.js` steht nicht mehr als Beispiel fuer nicht geladene Dateien; die Zahl 31 ist als vorlaeufiger statischer Befund markiert.

C-02 Testdatei-Zaehlung: lokal erneut geprueft mit `Get-ChildItem tests -Filter *.test.mjs`; Ergebnis ist 79. Das Finding wird nicht als Fakt uebernommen, aber Slice 3 muss die Testdatei- und Modulzaehlung reproduzierbar ausgeben, damit kuenftige Abweichungen nicht manuell diskutiert werden.

C-03 `types/` im Blindspot: angenommen. `types/` ist jetzt Bestandteil von Coverage- und Inventar-Scope.

C-04 Double-Counting im Runner: angenommen. Neuer Slice 1 adressiert Fehlerzaehlung und Runner-Diagnose vor Coverage- und UI-Ausbau.

C-05 Test-Isolation: angenommen als Blocker. Neuer Slice 1 ist Voraussetzung fuer Slices 6 und 7.

C-06 Assertion-Modell: teilweise angenommen. Slice 1 muss die Diagnose verbessern; ein kompletter Wechsel auf ein Framework ist aber kein Muss fuer diesen Plan. Fuer negative Contracts in Slice 9 gilt: Tests sollen so strukturiert werden, dass ein frueher Fehler nicht systematisch alle Grenzfaelle verdeckt, soweit dies mit dem bestehenden Runner bzw. dessen Ueberarbeitung vertretbar ist.

C-07 Exit-Code bei leerer Coverage: angenommen. Slice 2 fordert explizit `process.exit(1)` bei 0 ausgewerteten Projektdateien.

C-08 Browser-Automation als kritischer Pfad: angenommen. Playwright ist jetzt harte Planentscheidung, und Slices 6/7 haengen explizit an Slice 4.

C-09 HTTP-Server fuer Browser-Smoke: angenommen. Slice 4 fordert einen vom Testskript gestarteten und gestoppten lokalen HTTP-Server; `file://` ist nicht zulaessig.

C-10 `QUICK_TESTS`: angenommen. Slice 1 muss `QUICK_TESTS` ersetzen oder als deprecated markieren.

C-11 `run-single`/`run-tests` Divergenz: teilweise angenommen. Slice 1 nimmt Diagnosekonsistenz in den Scope auf, ohne zwingend beide Runner vollstaendig zu vereinheitlichen.

C-12 Parallelisierung: als Risiko angenommen. Die Entscheidung bleibt offen, wird aber als explizite offene Frage und Ergonomie-Risiko dokumentiert. Parallelisierung ist kein Blocker fuer die erste Ueberarbeitung.

### Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-01 | Gemini | `fileURLToPath` zwingend fuer Coverage-Pfade | angenommen | Slice 2 konkretisiert |
| G-02 | Gemini | `minimumFlexAnnual` braucht Migrationsschutz | teilweise angenommen | Slice 9 als Stop-Regel-/Migrationsrisiko konkretisiert |
| G-03 | Gemini | Browser-Automation unentschieden | angenommen | Playwright als harte Entscheidung |
| G-04 | Gemini | UI-Test-Isolation fehlt | angenommen | neuer Slice 1 und Abhaengigkeiten fuer Slices 6/7 |
| C-01 | Claude | `balance-main.js` faktisch dynamisch geladen | angenommen | Ausgangsbefund korrigiert |
| C-02 | Claude | 80 statt 79 Testdateien | abgelehnt nach lokaler Pruefung | Slice 3 muss reproduzierbare Zaehlung liefern |
| C-03 | Claude | `types/` fehlt im Scope | angenommen | Scope auf `types/` erweitert |
| C-04 | Claude | Runner zaehlt Fehler doppelt | angenommen | Slice 1 Scope |
| C-05 | Claude | fehlende Test-Isolation | angenommen | Slice 1 Blocker vor UI-Slices |
| C-06 | Claude | Assertion-Modell verdeckt Grenzfaelle | teilweise angenommen | Slice 1/9 konkretisiert |
| C-07 | Claude | leere Coverage braucht Fehlerexit | angenommen | Slice 2 Akzeptanzkriterium |
| C-08 | Claude | Playwright-Frage ist kritischer Pfad | angenommen | Slice 4 harte Entscheidung |
| C-09 | Claude | HTTP-Testserver fehlt | angenommen | Slice 4 Akzeptanzkriterium |
| C-10 | Claude | `QUICK_TESTS` unbrauchbar | angenommen | Slice 1 Scope |
| C-11 | Claude | Runner-Divergenz | teilweise angenommen | Slice 1 Diagnosekonsistenz |
| C-12 | Claude | fehlende Parallelisierung | teilweise angenommen | als offenes Ergonomie-Risiko dokumentiert |

## Zweites Review-Feedback von Gemini (Überarbeitung 1)

### 1. Prüfdimensionen & Detailanalyse

#### Korrektheit
- **Port-Kollisionen bei Playwright (Slice 4):** Der geplante lokale HTTP-Server für Playwright-Smoke-Tests benötigt eine dynamische Port-Vergabe (Port `0`) oder eine Prüfung auf freie Ports. Bei einem statisch konfigurierten Port kommt es bei parallelen Builds oder lokal blockierten Ports zu scheiternden Testläufen.
- **Fehleranfälligkeit von `fileURLToPath` (Slice 2):** Wenn `fileURLToPath` unkontrolliert auf alle URLs angewendet wird, werfen Nicht-Datei-URLs (wie eingestreute `http://`- oder `node:`-Protokolle) eine unbehandelte Exception. Es muss sichergestellt sein, dass nur gültige `file://`-URLs verarbeitet werden.

#### Vertragstreue
- **Prozess-Exit-Auswertung (Slice 1):** Die Prozess-Isolation via Kindprozesse muss sicherstellen, dass Exit-Codes ungleich `0` in den Kindprozessen sauber akkumuliert und an den Hauptprozess zurückgemeldet werden, da sonst fehlgeschlagene Tests als erfolgreich gewertet werden.

#### Seiteneffekte
- **Windows-Prozess-Overhead (Slice 1):** Der Start von separaten Node-Prozessen ist unter Windows extrem langsam. Eine Isolation aller 80+ Testdateien würde die Suite unbenutzbar verlangsamen. Daher ist es kritisch, dass die Prozess-Isolation selektiv erfolgt – d. h. reine Unit-Tests verbleiben im Hauptprozess, und nur DOM-nahe Integrations-Tests werden ausgelagert.

#### Was könnte brechen?
- **Offline-Fähigkeit von Playwright (Slice 4):** Da Playwright beim ersten Setup eigene Browser-Binaries herunterladen möchte, brechen Testausführungen in Offline-Umgebungen ab. Es muss ein klarer Fallback-Mechanismus (z. B. Überspringen mit Warnung, falls Playwright-Browser nicht installiert sind) definiert sein.

---

### 2. Strukturierte Findings & Blocker
1. **[HINWEIS] Statische Port-Vergabe verhindern (Slice 4):** Zwingend dynamische Port-Vergabe (Port `0`) für den HTTP-Server vorschreiben, um Port-Kollisionen zu vermeiden.
2. **[HINWEIS] Selektive Isolation (Slice 1):** Festlegen, dass die Prozess-Isolation nur für DOM-nahe Tests (Slices 6 & 7) angewendet wird, um die Performance unter Windows zu erhalten.

---

## Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine (die vorherigen Blocker G-1, G-2, G-3 und G-4 wurden durch die Überarbeitung vollständig aufgelöst)
- **Restrisiken:**
  - Erhöhte Testlaufzeit unter Windows durch den Overhead von Kindprozessen (gemildert durch selektive Isolation).
  - Mögliches Fehlschlagen von Playwright-Tests in strikten Offline-Entwicklungsumgebungen ohne vorinstallierte Browser.
  - Exception-Risiko bei `fileURLToPath` mit Nicht-Datei-URLs.
- **Pre-Mortem:**
  > „Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  >
  > Bei einer lokalen Ausführung der Testsuite blockiert ein Hintergrundprozess den HTTP-Port des Test-Servers. Das Skript wirft beim Start des HTTP-Servers eine EADDRINUSE-Fehlermeldung, die nicht abgefangen wird. Der gesamte Testlauf stürzt ab, und der Entwickler umgeht das Browser-Smoke-Gate mit einer manuellen Auslassung, wodurch eine kritische UI-Fehlfunktion unbemerkt in den Release-Zweig gelangt.“

## Zweites Review-Feedback von Claude (Überarbeitung 1)

**Reviewer:** Claude (optionaler Reviewer gemäss SLICE_EXECUTION_RULES.md)  
**Datum:** 2026-06-11  
**Grundlage:** Überarbeiteter Plan (Überarbeitung 1), Codex-Antworten auf alle 12 Claude-Findings und 4 Gemini-Findings, zweites Gemini-Review (freigegeben).

---

### 1. Prüfdimensionen

#### Korrektheit vs. Akzeptanzkriterien

- **C-01 (balance-main.js):** Korrekt aufgelöst. `balance-main.js` ist aus der Beispielliste entfernt (Zeile 54ff.). Die Zahl 31 ist als „vorläufiger statischer Befund" qualifiziert (Zeile 50). Akzeptanzkriterium in Slice 3 fordert, dass dynamisch geladene Dateien nicht fälschlich als ungeladen ausgegeben werden (Zeile 232). **Gelöst.**
- **C-02 (Testdatei-Zählung 79 vs. 80):** Codex hat lokal 79 gezählt und das Finding abgelehnt. Die Auflösung ist vertretbar: Slice 3 muss eine reproduzierbare automatisierte Zählung liefern (Zeile 229ff.), womit die Diskrepanz objektiv geklärt wird. **Akzeptiert als gelöst — die Differenz wird durch das Inventar in Slice 3 zweifelsfrei aufgeklärt.**
- **C-03 (types/ im Blindspot):** Vollständig aufgelöst. `types/` ist jetzt explizit im Scope: Harte Entscheidung Nr. 4 (Zeile 70), Coverage-Gates (Zeile 101), Slice 2 Akzeptanzkriterien (Zeile 181), Slice 3 Akzeptanzkriterien (Zeile 229). **Gelöst.**

#### Vertragstreue (bestehende Contracts/Interfaces)

- **C-04 (Double-Counting-Bug):** Neuer Slice 1 adressiert Fehlerzählung explizit (Zeile 137: „Ein fehlgeschlagener Assertion-Fehler wird nicht doppelt als Assertion- und Dateifehler gezählt"). **Gelöst.**
- **C-05 (Test-Isolation, war BLOCKER):** Vollständig aufgelöst durch neuen Slice 1 als Voraussetzung. Harte Entscheidung Nr. 7 (Zeile 73) verbietet gemeinsamen globalen Scope für neue DOM-nahe Tests. Slices 6 und 7 hängen explizit an Slice 1 (Zeilen 351, 394). Akzeptanzkriterien in Slices 6/7 fordern isolierten Runner oder Playwright (Zeilen 372, 419). **Blocker gelöst.**
- **C-06 (Assertion-Modell):** Teilweise angenommen — vertretbar. Slice 1 verbessert die Diagnose (Zeile 138); ein Framework-Wechsel ist bewusst kein Ziel. Für Slice 9 wird gefordert, dass Tests so strukturiert werden, dass ein früher Fehler nicht alle Grenzfälle verdeckt (Codex-Antwort Zeile 835). **Akzeptiert als Risiko, nicht als Blocker.**

#### Fehlerbehandlung

- **C-07 (Exit-Code bei leerer Coverage):** Vollständig aufgelöst. Slice 2 fordert `process.exit(1)` bei 0 Projektdateien (Zeile 183–184). **Gelöst.**

#### Seiteneffekte

- **C-08 (Browser-Automation als kritischer Pfad, war BLOCKER):** Vollständig aufgelöst. Playwright ist jetzt harte Planentscheidung (Zeile 71, Zeile 276). Slices 6/7 hängen explizit an Slice 4 (Zeilen 351, 394). Falls Playwright nicht installierbar, bleiben Slices 4/6/7 blockiert (Zeile 279). **Blocker gelöst.**
- **C-09 (HTTP-Server-Infrastruktur):** Vollständig aufgelöst. Slice 4 fordert Testskript-verwalteten HTTP-Server (Zeile 278, Zeile 288). `file://` ist explizit nicht zugelassen. **Gelöst.**
- **C-10 (QUICK_TESTS):** Aufgelöst. Slice 1 fordert Ersatz oder Deprecation (Zeile 141). Offene Frage 3 dokumentiert den Nachfolge-Bedarf (Zeile 652). **Gelöst.**
- **C-11 (Runner-Divergenz):** Teilweise angenommen — Slice 1 nimmt Diagnosekonsistenz in den Scope (Codex-Antwort Zeile 845), ohne vollständige Vereinheitlichung zu erzwingen. **Akzeptiert.**
- **C-12 (Parallelisierung):** Als offene Frage 4 dokumentiert (Zeile 653). Kein Blocker, aber das Ergonomie-Risiko ist benannt. **Akzeptiert.**

#### Was könnte brechen?

- **Gemini-Hinweis: Port-Kollisionen (Slice 4):** Valides Risiko. Dynamische Port-Vergabe (Port `0`) ist die richtige Lösung. Das Akzeptanzkriterium „Portwahl" (Zeile 288) deckt dies implizit ab, könnte aber expliziter sein. **Empfehlung: Im Slice-4-Akzeptanzkriterium „Portwahl" um „dynamisch (Port 0) oder mit Freiportprüfung" ergänzen.**
- **Gemini-Hinweis: fileURLToPath mit Nicht-Datei-URLs:** Korrekter Einwand. Wenn V8-Coverage-Daten `node:`- oder `http://`-URLs enthalten, wirft `fileURLToPath` eine Exception. Die Filter-Logik in `coverage-report.mjs` muss URLs vor der Konvertierung auf `file://`-Protokoll prüfen. **Empfehlung: In Slice 2 ein Akzeptanzkriterium ergänzen, dass Nicht-file://-URLs gefiltert werden, bevor fileURLToPath aufgerufen wird.**
- **Gemini-Hinweis: Selektive Isolation:** Korrekt. Prozess-Isolation für alle 80+ Dateien wäre unter Windows unbrauchbar. Die bestehende Formulierung (Slice 1 Zeile 139–140) ist bereits selektiv: „Fuer DOM-/Browser-global-nahe Tests" — nicht für alle. **Kein zusätzlicher Handlungsbedarf.**
- **Gemini-Hinweis: Playwright Offline-Fähigkeit:** Valides Risiko. Die bestehende Formulierung (Zeile 279: „Falls Playwright nicht installiert oder nicht freigegeben werden kann, bleibt Slice 4 blockiert") deckt den Fall ab. Der Fallback ist dokumentiert: Slices 6/7 starten nicht. **Kein zusätzlicher Handlungsbedarf, aber im Slice-4-Risiko-Abschnitt einen Hinweis auf `npx playwright install` als Setup-Voraussetzung ergänzen wäre hilfreich.**

---

### 2. Findings (Überarbeitung 1)

| ID | Schwere | Finding |
|---|---|---|
| C-13 | HINWEIS | Slice 4, Zeile 288: „Portwahl" sollte explizit „dynamisch (Port 0) oder mit Freiportprüfung" fordern, um Port-Kollisionen zu vermeiden (unterstützt Gemini-Hinweis 1). |
| C-14 | HINWEIS | Slice 2: `fileURLToPath` wirft bei Nicht-`file://`-URLs. V8-Coverage kann `node:`- oder `http://`-URLs enthalten. Die Filter-Logik muss URLs vor Konvertierung auf `file://`-Protokoll prüfen (unterstützt Gemini-Hinweis zu fileURLToPath-Fehleranfälligkeit). |
| C-15 | HINWEIS | Slice 4 Akzeptanzkriterien Zeile 283 enthält noch einen Resteditor-Artefakt: „Jeder Einstieg hat mindestens einen automatisierten oder dokumentierten Browser-Smoke" — das ist die alte Formulierung. Zeile 284 enthält die korrekte Playwright-Variante. Die Zeile 283 sollte entfernt oder als Duplikat bereinigt werden, um Widersprüche zu vermeiden. |

---

### 3. Bewertung der Codex-Antworten

Die Entscheidungstabelle (Zeilen 851–868) ist vollständig und nachvollziehbar. Alle 12 Claude-Findings und 4 Gemini-Findings sind dokumentiert mit Entscheidung und Umsetzungsort. Die Differenzierung zwischen „angenommen", „teilweise angenommen" und „abgelehnt nach lokaler Prüfung" (C-02) ist transparent.

Besonders positiv:
- Die Einführung von Slice 1 (Runner-Hygiene) als harter Vorgänger für UI-Slices ist die richtige architektonische Antwort auf C-05/G-04.
- Die harte Playwright-Entscheidung eliminiert den kritischen Pfadengpass (C-08/G-03).
- Die `minimumFlexAnnual`-Stop-Regel (Zeile 502) ist ein sauberer Kompromiss: Bestandsdaten werden erst geprüft, Semantikänderungen nur nach separatem Plan.

---

### 4. Pre-Mortem

> „Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb — was ist die wahrscheinlichste Ursache?"
>
> Die Coverage-Messung wird in Slice 2 repariert und liefert korrekte Werte. In Slice 9 (negative Contracts) schreibt ein Entwickler einen Test für `minimumFlexAnnual`, der die Stop-Regel korrekt auslöst — Bestandsdaten verhalten sich anders als erwartet. Der separate Bugfix-Plan wird erstellt, aber unter Zeitdruck nur halbherzig umgesetzt, weil das eigentliche Ziel „Testabdeckung erweitern" war. Der Migrationspfad wird zwar implementiert, aber nicht mit realen Nutzerprofilen aus der Produktion getestet, sondern nur mit Fake-Daten. Beim nächsten Jahresabschluss eines Langzeitnutzers greift die Migration nicht korrekt, weil das Profil eine historische Feldkombination enthält, die im Test nicht abgedeckt war.
>
> **Sekundäres Szenario:** Die selektive Prozess-Isolation aus Slice 1 funktioniert korrekt für die explizit als DOM-nah markierten Tests. Ein späterer Entwickler schreibt jedoch einen „normalen" Unit-Test, der versehentlich `globalThis.document` setzt und nicht aufräumt. Da dieser Test im Hauptprozess läuft, korrumpiert er den globalen Zustand für nachfolgende Tests — exakt das Szenario, das die Isolation verhindern sollte, nur an der Grenze der „selektiv"-Klassifikation.

---

### 5. Review-Ergebnis

- **Status:** freigegeben
- **Blocker:** keine — alle vorherigen Blocker (C-05, C-08) sind durch die Überarbeitung vollständig aufgelöst.
- **Nicht-blockierende Empfehlungen:**
  1. C-13: Slice 4 — dynamische Portwahl explizit in Akzeptanzkriterien aufnehmen.
  2. C-14: Slice 2 — URL-Protokoll-Filter vor `fileURLToPath` als Akzeptanzkriterium ergänzen.
  3. C-15: Slice 4 — doppeltes Akzeptanzkriterium (Zeilen 283/284) bereinigen.
- **Restrisiken:**
  - Assertion-Modell ohne `describe`/`it` erschwert Grenzfall-Diagnose in Slice 9 (C-06, teilweise akzeptiert).
  - Parallelisierung bleibt offen; Suite-Laufzeit kann zum Ergonomie-Problem werden (C-12).
  - Selektive Isolation erfordert klare Klassifikationsregeln — Grenzfälle zwischen „DOM-nah" und „Unit" können die Isolation unterlaufen (neues Pre-Mortem-Szenario).
  - Playwright-Offline-Fähigkeit erfordert dokumentierte Setup-Voraussetzungen.
