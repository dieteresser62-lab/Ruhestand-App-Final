# Arbeitsplan: Browser-Smoke wieder vollständig grün

## Auftrag und Ausführungsgrenze

Zielbranch: `feature/browser-smoke-gruen`. Planungsbasis: `2cce6eabf80aaba29a48c2c2a26fe3a046686e2f`; der ausgecheckte Branch und HEAD stimmen damit überein.

Dieser Schritt ist `PLAN_ONLY`: Sein einziges Änderungsartefakt ist `docs/internal/a-browser-smoke-gruen-arbeitsplan.md`. Der unten beschriebene Umsetzungsslice ist ein zukünftiger Auftrag. In diesem Planungsschritt werden Produktcode, Tests, Konfiguration und generierte Artefakte nicht verändert. Branchwechsel, Staging und Commits bleiben beim Orchestrator.

Das Ziel ist ein vollständiger Durchlauf von `npm run test:browser` mit `Browser smoke passed` für alle registrierten Fälle und Exitcode 0; `npm test` muss ebenfalls grün bleiben. Die Prüfungen dürfen ihre Aussagekraft nicht verlieren. Die beiden gemeldeten Ausgangsfehler auf `main` und `a942453` sind Auftragsevidenz vom 02.10.2026, keine in dieser Planung erneut ausgeführten Messungen.

## Quellenbefund und Entscheidung je Fall

### Fall „Simulator.html“

`tests/browser-smoke.test.mjs`, Funktion `runSimulatorSmoke()`, fordert derzeit genau vier `.tab-btn` in der Hauptleiste und spricht auch in der Overflow-Assertion von vier Tabs. `Simulator.html` enthält dagegen fünf Haupttabs in dieser Reihenfolge:

1. `rahmendaten` – Rahmendaten
2. `montecarlo` – Monte-Carlo
3. `backtesting` – Backtesting
4. `sweep` – Parameter-Sweep
5. `auto-optimize` – Auto-Optimize

Dieser Zustand ist bereits durch `tests/simulator-tab-layout.test.mjs` sowie `runSimulatorOptimizerApplyIntegration()` im Browser-Smoke abgesichert. Sweep und Auto-Optimize besitzen getrennte Panels. Der Quellbefund spricht deshalb für eine veraltete Smoke-Erwartung, nicht für einen zusätzlichen unerwünschten Tab. Die Korrektur muss genau fünf Tabs samt Identität und Reihenfolge prüfen und die bestehenden Desktop-Layoutbedingungen erhalten. Die fünf untergeordneten `.mc-view-tab` des Ergebnis-Cockpits sind ein eigener Vertrag und bleiben davon getrennt.

### Fall „Simulator Monte-Carlo E2E“

`tests/simulator-monte-carlo-browser.mjs`, Funktion `configureMonteCarloRun()`, aktiviert den Haupttab `montecarlo`. Anschließend versucht `runFailedReplayProjectionCase()`, `#startFloorBedarf` unmittelbar mit `fill('2000000')` zu bedienen. Das Feld gehört jedoch zu `#tab-rahmendaten`, im Fieldset `[data-fieldset="portfolio"]` mit der Legende „Startportfolio & Bedarf“.

`app/simulator/simulator-main-tabs.js` aktiviert ausschließlich das zum angeklickten Haupttab gehörende Panel. `simulator.css` blendet `.tab-panel` ohne `.active` mit `display: none` aus. Dass das Rahmendatenfeld bei aktivem Monte-Carlo-Tab nicht sichtbar ist, entspricht damit dem gewollten Tabverhalten. Das Portfolio-Fieldset ist im HTML zunächst geöffnet; sein vorhandener Legenden-Klick kann einen eingeklappten Zustand aufheben. Auch `runSimulatorSmoke()` wechselt vor einer späteren sichtbaren Bedarfseingabe ausdrücklich zurück zu Rahmendaten.

Der Quellbefund spricht für einen fehlenden Navigationsschritt im E2E-Test. Die Korrektur führt vor der Eingabe über den sichtbaren Rahmendaten-Tab und danach zurück zu Monte Carlo. Der bewusst überhöhte Floor muss weiterhin ein fehlgeschlagenes charakteristisches Szenario mit echten Logzeilen erzeugen; die Anzeige `FAILED` vor und nach dem Fixieren des Stresspfads bleibt die fachliche Aussage dieses Falls.

## Umsetzung

Beide Fehler werden in einem gemeinsamen Slice behoben: Die zusätzliche Browserregel wird durch Änderungen an `tests/browser-smoke.test.mjs` ausgelöst und führt nach dem Slice das gesamte Browser-Gate aus. Eine Aufteilung würde nach der ersten Teilkorrektur den jeweils anderen bekannten Fehler im Pflicht-Gate belassen.

### Slice 1 - Haupttabvertrag und Monte-Carlo-Bedienweg korrigieren

**Ziel**

Die beiden veralteten Testannahmen an die vorhandene Oberfläche anpassen und mit unveränderten fachlichen Nachweisen das vollständige Browser-Gate wiederherstellen.

**Exakter Änderungspfad**

- `tests/browser-smoke.test.mjs`
- `tests/simulator-monte-carlo-browser.mjs`

**Arbeitsschritte**

1. In `runSimulatorSmoke()` die Hauptleiste weiterhin auf `.tab-buttons .tab-btn` begrenzen. Genau fünf Tabs mit den oben genannten `data-tab`-Werten, Beschriftungen und ihrer Reihenfolge erwarten. Die veralteten Fehlermeldungen auf fünf Haupttabs aktualisieren. Die vorhandene Prüfung, dass kein Tab die gesamte Leiste belegt, und die Overflow-Toleranz von höchstens einem CSS-Pixel erhalten; die Tabs müssen sichtbar sein und positive Breite haben. Die anschließenden Cockpit-, Ressourcen-, Tastatur-, Replay-, Responsive- und Druckprüfungen erhalten.
2. In `runFailedReplayProjectionCase()` nach der bisherigen kleinen, deterministischen Laufkonfiguration den Haupttab `.tab-btn[data-tab="rahmendaten"]` anklicken und auf das sichtbare `#tab-rahmendaten` warten. Falls das Portfolio-Fieldset eingeklappt ist, ausschließlich über seine vorhandene Legende öffnen. Auf das sichtbare und bedienbare `#startFloorBedarf` warten, `2000000` mit Playwright `fill()` eingeben und den resultierenden Eingabewert prüfen. Durch den anschließenden Tabwechsel den normalen Fokus-/Änderungspfad auslösen.
3. Zurück zu `.tab-btn[data-tab="montecarlo"]` wechseln, auf das sichtbare `#tab-montecarlo` und den Startknopf warten und den Lauf starten. `configureMonteCarloRun()` nach der Floor-Eingabe nicht erneut aufrufen: Der Helper würde den Floor auf `24000` zurücksetzen. Die bisherigen Werte für Runzahl, Dauer, Workerzahl und Seed erhalten. Zusätzlich mit dem vorhandenen Downloadhelper am abgeschlossenen Lauf prüfen, dass `request.scenario.normalizedInputs.startFloorBedarf` tatsächlich `2000000` ist. Danach den vorhandenen Ablauf zur Szenarioauswahl, Replay-Aktivierung und Fixierung ausführen.
4. Alle bestehenden Assertions zu fehlgeschlagenem Szenario mit Logzeilen, `FAILED` vor und nach Fixierung sowie unerwarteten Browserfehlern erhalten. Worker-Erfolg, erzwungener serieller Fallback, technischer Fehler und Abbruch/Neustart in `runMonteCarloBrowserRegression()` bleiben Bestandteil des Falls. Keine Fehlerfilter verbreitern, Fälle auslassen, Laufzeitlimits erhöhen, festen Wartepausen ergänzen oder fehlgeschlagene Assertions abfangen. Die sichtbare Eingabe nicht durch DOM-Wertsetzung, `force` oder manipulierte CSS-/Aktivklassen umgehen.
5. Gezielte Prüfungen durchführen und deren Ergebnisse einschließlich einer eventuellen Sandboxgrenze dokumentieren. Im vom Orchestrator geführten Slice-Bericht für jeden der beiden Fälle getrennt Ausgangsfehler, Quellbeleg, Einstufung als veralteter Test, konkrete Änderung und Validierungsstatus begründen. Keine separate eigene Slice-Datei anlegen.

**Akzeptanzkriterien**

1. An der Quellgrenze fordert `runSimulatorSmoke()` genau die fünf vorgesehenen Haupttabs mit Identität, Beschriftung und Reihenfolge. Im echten Browser bei der vorhandenen Desktop-Viewportgröße 1366 × 900 sind alle fünf sichtbar, mit positiver Breite kleiner als die Leistenbreite; `scrollWidth <= clientWidth + 1` bleibt verbindlich. Die eigenständigen fünf MC-Ergebnisansichten behalten ihre bisherigen Assertions.
2. An der Browser-Bediengrenze öffnet `runFailedReplayProjectionCase()` vor `fill()` sichtbar den Rahmendatenbereich und gegebenenfalls das Portfolio-Fieldset, bestätigt den Wert `2000000` und kehrt vor dem Start sichtbar zum Monte-Carlo-Tab zurück. An der Exportgrenze bestätigt der reale Lauf denselben Floor in seinen normalisierten Eingaben.
3. An der fachlichen Browsergrenze erzeugt der unverändert kleine deterministische Lauf ein fehlgeschlagenes charakteristisches Szenario mit Logzeilen. Dessen Auswahl zeigt `FAILED` vor dem Fixieren; nach der Statusmeldung „Stresspfad fixiert“ bleibt die Anzeige `FAILED`. Die bestehende Kontrolle unerwarteter Browserfehler bleibt wirksam.
4. An der Testquellgrenze bleiben alle registrierten Browserfälle und sämtliche bisherigen fachlichen, Export-, Worker-, Lifecycle-, Layout-, Tastatur- und Druckprüfungen erhalten; Änderungen betreffen nur die beiden korrigierten Erwartungen beziehungsweise Bedienwege und ihre zusätzlichen Nachweise. Das Gate hat keine neuen Ausnahmen, Auslassungen oder erhöhten Timeouts.
5. An der Ausführungsgrenze laufen die gezielten Fälle `Simulator.html` und `Simulator Monte-Carlo E2E` außerhalb einer gegebenenfalls blockierenden Sandbox jeweils mit ihrer Erfolgsmeldung und Exitcode 0. Anschließend bestätigt der Orchestrator auf dem fertigen Slice-Stand `npm run test:browser` ohne `--only` mit Erfolg für sämtliche registrierten Fälle und Exitcode 0 sowie `npm test` mit Exitcode 0.
6. An der Berichtsgrenze enthält der vom Orchestrator geführte Slice-Bericht für beide Fälle eine separate, belegte Begründung der Testkorrektur und unterscheidet ausgeführte erfolgreiche Prüfungen von in der Sandbox nicht ausführbaren Prüfungen.

**Gezielte Validierung und Abschlussgates**

Während der späteren Umsetzung:

```bash
node --check tests/browser-smoke.test.mjs
node --check tests/simulator-monte-carlo-browser.mjs
node tests/run-single.mjs tests/simulator-tab-layout.test.mjs
node tests/browser-smoke.test.mjs --only='Simulator.html'
node tests/browser-smoke.test.mjs --only='Simulator Monte-Carlo E2E'
```

Der Browser-Harness verwendet seinen eigenen lokalen Server und isolierte Browserkontexte. Die Filter sind nur für fokussierte Läufe vorgesehen. `tests/simulator-monte-carlo-browser.mjs` ist ein vom Harness importierter Helper; seine direkte Ausführung ersetzt den E2E-Fall nicht.

Falls Server-, Browser- oder Unterprozessstart in der Agentensandbox scheitert, die konkrete Einschränkung berichten und die Browsernachweise dem Orchestrator außerhalb der Sandbox überlassen. Ein Syntaxcheck oder der statische Tabtest ersetzt keinen Browsernachweis. Keine Netzinstallation oder Änderung am Harness zur Umgehung der Sandbox vornehmen. Die volle Node-Suite führt ausschließlich der Orchestrator aus.

Verbindliche Abschlussgates des Orchestrators auf demselben fertigen Stand:

```bash
npm test
npm run test:browser
```

## Risiken, Umfang und Dokumentation

- Die bloße Ersetzung von vier durch fünf könnte falsche oder unsichtbare Tabs zulassen. Die exakten Tabidentitäten sowie Sichtbarkeits- und Layoutprüfungen verhindern das.
- Ein erneuter Konfigurationsaufruf oder ein nicht wirksamer Eingabepfad könnte das beabsichtigte Fehlerprofil verlieren. Eingabewert, exportierte normalisierte Eingabe und das echte fehlgeschlagene Szenario liefern getrennte Nachweise.
- Nach Beseitigung eines frühen Abbruchs können nachgelagerte Fehler sichtbar werden. Deshalb gelten die beiden gefilterten Läufe nur als Zwischenprüfung; erst das vollständige Browser-Gate erfüllt den Auftrag. Keine nachgelagerte Assertion anpassen, ohne deren Produktvertrag und Ursache zu belegen.
- Der geplante Umfang besteht aus Testkorrekturen an zwei konkreten Dateien. Anwendung, Engine-Semantik, Persistenzverträge, Buildpfade und Nutzerworkflow werden dadurch nicht verändert; ein Architektur- oder Workflow-Dokumentationssync ist daher nicht erforderlich. Die vorhandenen widersprüchlichen Vier-Tab-Formulierungen in den MC-Cockpit-Abschnitten der technischen Referenzen sind kein Beleg gegen den durch HTML und bestehende Layout-/Optimizer-Tests abgesicherten Fünf-Tab-Zustand.
- Zeigt die spätere Browsermessung einen echten Anwendungsfehler, muss dessen Ursache belegt und der Arbeitsplan mit den konkret nötigen Quell-/Test-/gegebenenfalls Dokumentationspfaden vor der Änderung erweitert werden. Der vorliegende Slice autorisiert keine vorsorglichen Produktänderungen. Für erforderliche Änderungen außerhalb seiner beiden Pfade gilt `SCOPE-EXTENSION-REQUESTED`; unklare fachliche Verträge werden als `CONTRACT-UNCLEAR` gemeldet.
- Fremde Arbeitsbaumänderungen bleiben unangetastet. `engine.js`, `dist/`, Agentenverzeichnisse und Orchestratorzustand werden nicht bearbeitet. Lokale Finanzdaten werden nicht als Testdaten verwendet.

## Nachweis dieses Planungsschritts

Die Planung beruht auf lesender Prüfung der Testimplementierungen, des Simulator-HTML, der Tabsteuerung, der CSS-Sichtbarkeitsregeln, der vorhandenen Tab-/Optimizer-Prüfungen sowie von `package.json`, `tests/README.md` und `orchestrator.toml`. In diesem `PLAN_ONLY`-Schritt wurden keine Node- oder Browserläufe ausgeführt; die oben aufgeführten Befehle gehören zur späteren Umsetzung und Abnahme. Die Fertigmeldung dieses Schritts bestätigt ausschließlich das geschriebene und erneut gelesene Arbeitsplanartefakt, keine Produktfreigabe.

## Orchestrator-Prüfprotokoll

### Verlauf

<!-- audit:history:begin -->
- Runde 1: Planung · Validierung grün · Prüfurteil freigegeben · 0 neu, 0 geschlossen.
<!-- audit:history:end -->

### Befunde

<!-- audit:findings:begin -->
Keine.
<!-- audit:findings:end -->

### Abschlussprüfung

<!-- audit:approval:begin -->
Geprüft:
> Geprüft habe ich PLAN_ONLY-Artefaktvertrag, Pfadgrenze, Slice-Struktur, Ursachenanalyse je Fall, Akzeptanzkriterien, Validierungsgates, Stoppregeln sowie Resume/Idempotenz. Der Diff enthält nur die neue Datei docs/internal/a-browser-smoke-gruen-arbeitsplan.md und liegt damit exakt in authorized_paths. Die Attestation internal:work-plan-contract ist PASS (slices=1, changed_paths=1, future_slices=1) mit passendem Fingerprint [Hash ausgelassen]…. Der Plan enthält einen künftigen Slice 1 mit den exakten Pfaden tests/browser-smoke.test.mjs und tests/simulator-monte-carlo-browser.mjs. Für beide Fälle gibt es eine belegte Einstufung: veralteter Test mit vier statt fünf Tabs bzw. fehlender Navigationsschritt zu #tab-rahmendaten. Dazu kommen sechs grenzbezogene Akzeptanzkriterien, gezielte Läufe (--only) und die vollständigen Gates npm test und npm run test:browser beim Orchestrator. Schutzvorgaben gegen eine Abschwächung der Tests sind ausdrücklich enthalten: exakte Tabidentität und Reihenfolge, keine force- oder DOM-Wertsetzung, keine erhöhten Timeouts oder verbreiterten Filter, Exportnachweis von startFloorBedarf=2000000. Den Fall eines echten Anwendungsfehlers leitet der Plan korrekt an SCOPE-EXTENSION-REQUESTED bzw. CONTRACT-UNCLEAR weiter.

Größtes Restrisiko:
> Die Quellbehauptungen des Plans sind aus dem bereitgestellten Snapshot nicht entscheidbar. Dazu gehören die fünf data-tab-Werte in Simulator.html, die Lage von #startFloorBedarf in #tab-rahmendaten, der Reset auf 24000 in configureMonteCarloRun() und ein vorhandener Downloadhelper mit request.scenario.normalizedInputs. Grund: Die Review-Evidenz enthält nur Auftrag, Kontext und Plan-Diff, aber keine Quelldateien. Unter der vorgegebenen Leseregel von genau drei Dateien war keine weitere Einsicht zulässig. Erweist sich eine dieser Annahmen als falsch, scheitert Slice 1 erst in der Browsermessung.

Bruchbedingung:
> Der Plan wäre falsch, wenn #startFloorBedarf auch nach dem Wechsel zu Rahmendaten nicht bedienbar ist, wenn der Wert beim Rückwechsel zu Monte Carlo verworfen wird oder wenn der Exporthelper normalizedInputs nicht bereitstellt. Dann wäre eine Scope-Erweiterung oder eine Produktkorrektur nötig. Dasselbe gilt, wenn das vollständige Browser-Gate nach den beiden Korrekturen weitere, bisher verdeckte Fehler zeigt.

Vorab-Risikoanalyse:
> Wahrscheinlichste Ursache eines späteren Scheiterns: Nach Behebung der frühen Abbrüche treten nachgelagerte Assertions im Monte-Carlo-E2E- oder Simulator-Smoke auf, etwa der Fixierungsstatus oder Cockpit-Ansichten. Möglich ist auch, dass der Floor von 2000000 durch Normalisierung oder Validierung begrenzt wird und das FAILED-Szenario ausbleibt. Der Plan fängt beides ab: Gefilterte Läufe gelten nur als Zwischenprüfung. Nachgelagerte Anpassungen sind nur mit belegtem Produktvertrag erlaubt, Pfadbedarf außerhalb der zwei Testdateien führt zu einem Stopp. Ein weiteres Risiko sind abweichende Vier-Tab-Formulierungen in den Referenzdokumenten. Der Plan nennt sie ausdrücklich und grenzt sie vom Auftrag ab.
<!-- audit:approval:end -->
