# Slice 08: Backtest-UI, Browser-Gate und Accessibility

**Arbeitsplan:** [SIMULATOR_BACKTEST_HARDENING_PLAN.md](./SIMULATOR_BACKTEST_HARDENING_PLAN.md)  
**Feature-Branch:** `codex/simulator-backtest-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend und nur nach Nutzerfreigabe  
**Status:** implementiert und selbstgeprueft; adversariales Review ausstehend  
**Abhaengigkeit:** Slice 05 freigegeben; Export-/Downloadteil wartet auf Slice 07, optionaler Cohortteil auf Slice 06  
**GAPs:** BT-06, BT-10, BT-11, BT-15, BT-16, BT-17

## Ziel

Die Backtest-Oberflaeche rendert ausschliesslich aus dem kanonischen Result-/Metrikvertrag. Periodengrenzen, Status, Warnungen und Outcomes werden inline und barrierearm dargestellt. Ein deterministisches Browser-End-to-End-Gate prueft den Hauptworkflow einschliesslich Export und Fehlerzustaenden.

## Akzeptanzkriterien

- Start-/Endjahr erhalten dynamische `min`/`max`-Grenzen und einen sichtbaren Dataset-/Zeitraumhinweis.
- Ungueltige Perioden werden inline einem Feld zugeordnet; kein ausschliessliches `alert`.
- Laufstatus nutzt eine `aria-live`-/Statusregion und unterscheidet running/completed/ruin/incomplete/technical_error.
- Nutzerfehlermeldungen enthalten stabilen Code, Ursache und Handlungsoption, aber keinen Stacktrace/lokalen Pfad.
- Nach Lauf springt der Fokus sinnvoll auf Ergebnisstatus/Ueberschrift; bei Validierungsfehler auf das erste fehlerhafte Feld.
- Die Tabelle besitzt Caption, Header-`scope`, nachvollziehbare Spaltennamen und bleibt horizontal/vertikal bedienbar.
- Outcome-/Datenqualitaets-/In-sample-Warnung ist sichtbar und nicht nur im Export vorhanden.
- Falls Rolling Cohorts freigegeben sind, zeigt die UI feste Horizontlaenge, Cohort-Inventar, Ausschluesse und getrennte Outcomes; keine „Erfolgswahrscheinlichkeit“.
- JSON/CSV-Buttons laden den Raw-Vertrag aus Slice 07; Detailtoggle bleibt reine Anzeigeoption.
- UI-Summary und Export werden aus demselben kanonischen Resultsnapshot gespeist; ein Browsertest reconciliiert mindestens Start/Ende, Outcome, Jahrinventar, exakt-10-%-Metrik und Pflegebucket zwischen Raw-JSON und sichtbarer Anzeige innerhalb der dokumentierten Rundung.
- Browser-Gate prueft ohne Netz:
  - gueltiger Single-Path-Lauf samt Summary/Zeilen,
  - leeres, NaN-/nicht-ganzzahliges, rueckwaertiges und ausserhalb der dynamischen Bounds liegendes Fenster,
  - synthetisch fehlendes mittleres Jahr -> `incomplete`, kein scheinbar vollstaendiges Ergebnis,
  - Ruin und technical_error getrennt,
  - Detailtoggle,
  - JSON-/CSV-Download ohne HTML,
  - Realbestands-Non-Mutation,
  - optional Rolling-Cohort-Summary.
- Keine doppelten Eventhandler durch Inline-`onclick` plus Modulbindung.

## Scope

- Backtest-HTML/CSS und eng begrenzter UI-Adapter
- Inline-Validierung/Status/A11y
- Rendering aus Result/Metriken
- deterministische Playwright-Fixtures/Browserassertions
- Download- und Non-Mutation-Gate

UI-Validierung, Statusregion, Fokus und Tabellensemantik koennen nach Slice 05 vor dem Exportteil vorbereitet werden. Gleichzeitig mit Slice 07 darf nur gearbeitet werden, wenn die konkrete Dateiliste disjunkt ist; andernfalls wird zuerst Slice 07 abgeschlossen.

## Nicht-Scope

- keine Rechen-/Metrikdefinition
- keine allgemeine Simulator-UI-Neugestaltung
- keine Live-Daten-/Netztests
- keine Engine-/Runner-Fachsemantik
- keine Release-/Tauri-Artefakte

## Geplante Dateien

Voraussichtlich:

- geaendert: `Simulator.html`
- geaendert: `simulator.css`
- geaendert: `app/simulator/simulator-backtest.js`
- optional neu: `app/simulator/historical-backtest-ui.js`
- geaendert: `app/simulator/simulator-main-init.js` nur falls Eventbindung dorthin gehoert
- geaendert: `tests/browser-smoke.test.mjs`
- geaendert oder neu: `tests/simulator-backtest-ui.test.mjs`
- geaendert: `tests/simulator-ui-orchestration.test.mjs`

Programmdateien: 7 bis maximal 8.

## Diff-Risiko vor Coding

```text
Vor Implementierungsstart:
- git branch --show-current: codex/simulator-backtest-gap-plan
- git status --short:
  - ?? docs/internal/SLICE_SIMULATOR_BACKTEST_08_UI_BROWSER_ACCESSIBILITY.md
  - ?? docs/internal/SLICE_SIMULATOR_BACKTEST_09_FORSCHUNGS_GATES.md
  - ?? docs/internal/SLICE_SIMULATOR_BACKTEST_10_INTEGRATION_DOKUMENTATION.md
  - ?? node_modules/.bin/playwright*
  - ?? node_modules/playwright-core/
  - ?? node_modules/playwright/

Geplante Dateien:
- Simulator.html
- simulator.css
- app/simulator/simulator-backtest.js
- neu: app/simulator/historical-backtest-ui.js
- tests/browser-smoke.test.mjs
- neu: tests/simulator-backtest-ui.test.mjs
- tests/simulator-ui-orchestration.test.mjs
- betroffene Nutzer-, Modul-, Test- und Arbeitsplandokumentation

Voraussichtliche Änderungstiefe:
- mittel bis riskant; sichtbarer Hauptworkflow und Browser-E2E

Gefährdete bestehende Tests:
- browser-smoke.test.mjs
- simulator-ui-orchestration.test.mjs
- simulator-backtest.test.mjs
- simulator-3bucket-ui-e2e.test.mjs
- Tauri-CSP nur bei unbeabsichtigten externen Abhaengigkeiten

Nicht anfassen:
- Backtest-Rechen-/Zeitachsen-/Outcome-/Metriksemantik
- andere Simulator-Tabs ausser gemeinsam notwendiger Initcode
- engine/**, workers/**, engine.js
- dist/** und RuheStandSuite.exe

Rollback-Strategie:
- git checkout -- Simulator.html simulator.css app/simulator/simulator-backtest.js tests/browser-smoke.test.mjs tests/simulator-ui-orchestration.test.mjs
- neue app/simulator/historical-backtest-ui.js und tests/simulator-backtest-ui.test.mjs nur nach Nutzerfreigabe entfernen
- bereits vorhandene unversionierte Slice-09/10- und Playwright-Artefakte nicht anfassen
```

Programmdateien im geplanten Produktivscope: vier; Tests und Dokumentation fallen nicht unter die projektweite Zehn-Dateien-Stop-Regel. Slice 06 und Slice 07 sind mit `04dcafc` beziehungsweise `cce302b` freigegeben und committed; der Cohort- und Download-Join ist damit fuer Slice 08 offen.

## Geplante Tests

- fokussierter UI-Contract fuer Status/Fokus/Fehlermeldung/Tabelle
- `node tests/run-single.mjs tests/simulator-backtest-ui.test.mjs`
- `node tests/run-single.mjs tests/simulator-ui-orchestration.test.mjs`
- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`
- `node tests/run-single.mjs tests/simulator-3bucket-ui-e2e.test.mjs`
- `npm run test:browser`
- `npm test`
- optional automatisierter Accessibility-Smoke nur wenn lokal bereits ohne neue Abhaengigkeit verfuegbar

## Review-Auflagen in diesem Slice

- Gemini G-F-06/G-F-07: canonical UI-/Raw-Reconciliation und deterministische Negativpfade statt reinem Erfolgssmoke.
- Claude C-06: nur der UI-/A11y-Teil besitzt Parallelisierungspotenzial; Downloadintegration bleibt ein Join mit Slice 07.
- BT-15: Tests warten auf einen fachlichen Status/Resultat, nicht auf eine feste 500-ms-Pause als Erfolgskriterium.

## Stop-Regeln dieses Slice

- Rechenwerte unterscheiden sich zwischen UI und Raw-Resultat.
- UI und Runner verwenden andere Feld-/Parameternamen.
- Browser-Gate ist nicht deterministisch oder benoetigt Netz.
- A11y-Verbesserung erfordert eine breite Simulator-UI-Umschreibung ueber zehn Programmdateien.
- Export enthaelt weiterhin HTML oder Detailtoggle beeinflusst Rohdaten.
- Realbestand/Persistenz wird durch Backtestlauf veraendert.

## Durchgefuehrte Aenderungen

- `Simulator.html` fuehrt manifestabgeleitete Zeitraum-Hinweise, feldnahe Fehlercontainer, optionalen Rolling-Cohort-Horizont, fokussierbaren Live-Status, sichtbare Warnhinweise, Cohort-Summary, semantische Tabellenregion und ausgeschriebene Raw-Downloadbuttons. Der Inline-`onclick` des Startbuttons wurde entfernt.
- `historical-backtest-ui.js` kapselt Perioden-/Cohortvalidierung, Boundsprojektion, Fokus, sanitizierte Statuscodes, Datenqualitaetsinventar, In-sample-Hinweis, tief eingefrorenen Cohort-UI-/Exportsnapshot und semantisches/escaped Tabellen-HTML.
- `simulator-backtest.js` bindet alle Backtestcontrols idempotent, unterscheidet `validation_error`, `running`, `completed`, `ruin`, `incomplete` und `technical_error`, rendert Summary nur aus kanonischen Metriken und uebergibt dasselbe Cohort-Inventar an UI und JSON-Export. Browser-Gate-Dependencies sind injizierbar; der produktive Standardpfad bleibt unveraendert.
- `simulator.css` ergaenzt sichtbare Fehler-/Status-/Notice-/Cohortzustaende, Fokusrahmen und responsives Cohortlayout. Der bestehende Tabellencontainer bleibt horizontal und vertikal scrollbar.
- `simulator-backtest-ui.test.mjs` deckt Bounds, alle Periodenfehler, Fokus/ARIA, sichere technische Meldung, Datenqualitaet, Tabellensemantik/HTML-Escaping und `eligible=0` ab.
- `simulator-ui-orchestration.test.mjs` prueft dynamische Bounds und genau einen Handler auch nach doppelter Initialisierung.
- `browser-smoke.test.mjs` wartet nicht mehr 500 ms, sondern liest den fachlichen Terminalstatus. Der Simulatorfall prueft completed samt Cohorts, UI/Raw-Reconciliation, beide Downloads, Detailtoggle, Falscheingaben, Datenluecke, Ruin, `technical_error`, Fokus/A11y, null Alerts und Realbestands-Non-Mutation.
- `simulator-backtest-characterization.test.mjs` und `fixtures/simulator-backtest-target-v1.json` erfassen die erwartete neue Summary-/Inline-Statusprojektion. Finanzwerte, kanonische Row-Hashes, Ruinfrequenz und FlowDelta blieben unveraendert.
- `README.md`, `docs/reference/TECHNICAL.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `tests/README.md` und der Arbeitsplan dokumentieren Nutzerworkflow, Modulgrenzen und Browser-Gate.

## Ausgefuehrte Tests

- `node --check app/simulator/historical-backtest-ui.js` – gruen
- `node --check app/simulator/simulator-backtest.js` – gruen
- `node tests/run-single.mjs tests/simulator-backtest-ui.test.mjs` – 39/39 Assertions gruen
- `node tests/run-single.mjs tests/simulator-ui-orchestration.test.mjs` – 37/37 Assertions gruen
- `node tests/run-single.mjs tests/simulator-backtest.test.mjs` – 56/56 Assertions gruen
- `node tests/run-single.mjs tests/simulator-backtest-characterization.test.mjs` – 71/71 Assertions gruen; kontrollierter Oracle-Update danach ohne unerwartetes Delta
- `node tests/run-single.mjs tests/simulator-3bucket-ui-e2e.test.mjs` – 15/15 Assertions gruen
- `npm test` – 119 Testdateien, 5722/5722 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles; Browser-Gate separat
- `npm run test:browser` – alle 14 Einstiegspunkt-/Zusatzflows inklusive erweitertem Simulatorfall gruen; nach Doku-Sync erneut gruen
- `git diff --check` – gruen

## Ergebnisse

- Alle Akzeptanzkriterien fuer Periodenvalidierung, Status/Fokus, Warnungen, Tabelle, Cohorts, Raw-Downloads und Browser-Gate sind umgesetzt.
- UI-Summary, Tabelle und Export verwenden dieselbe tief eingefrorene `BacktestRunResultV1`-Instanz; das optionale Cohort-Inventar wird einmal kopiert/tief eingefroren und von UI sowie JSON-Export geteilt.
- Das Browser-Gate reconciliiert Start/Ende, Outcome, angeforderte/ausgewertete Jahre, Row-Inventar, `flex_reduction_years_gte_10_pct`, `health_bucket_end_nominal_eur` und Cohort-Eligible exakt gegen das Raw-JSON. Der sichtbare Detailtoggle laesst Result-Fingerprint und Raw-Rows unveraendert.
- Keine Engine-, Runner-, Zeitachsen-, Metrik-, MC-, Sweep-, Worker- oder Persistenzsemantik wurde geaendert. Vier produktive Programmdateien liegen im Slice-Scope und damit unter der Stop-Grenze.

## Abweichungen vom Plan

- `simulator-main-init.js` musste nicht geaendert werden; die bestehende Initgrenze ruft den nun idempotenten Backtestbinder bereits korrekt auf.
- Der erwartete UI-Projektionswechsel erforderte eine kontrollierte Fortschreibung des bestehenden Target-Characterization-Oracles und eine kleine Status-Erweiterung im Characterization-Test. Es gab keine numerische Backtestabweichung.
- Der Browser-Completed-Fall benoetigt ein explizites synthetisches Startportfolio, weil der profilfreie Browsercontext fachlich mit leerem Realbestand startet. Ruin bleibt als eigener synthetischer Browserfall abgedeckt.
- Ein zusaetzlicher automatisierter A11y-Scanner wurde nicht eingefuehrt; Caption, Header-Scopes, ARIA, Fokus, Tastaturregion und Meldungssicherheit sind durch fokussierte Node-/Browserassertions gedeckt, ohne neue Abhaengigkeit.

## Offene Risiken

- Sehr breite Detailtabellen bleiben auf kleinen Displays scrollintensiv.
- Fokusmanagement darf Nutzer nicht bei jedem Re-Render unerwartet verschieben.
- Browser-Downloadpruefung muss Blob-/Downloadverhalten robust abfangen.
- Das automatisierte Browser-Gate nutzt Chromium; Edge/Firefox und Screenreader bleiben manuelle Kompatibilitaetspruefungen.
- Fokus wird nur durch expliziten Start/Downloadfehler oder Validierungsfehler verschoben; ein reiner Detailtoggle behaelt den Nutzerkontext. Dieses Verhalten bleibt bei spaeteren Re-Render-Anlaessen zu schuetzen.

## Rueckdokumentation

Erledigt in `SIMULATOR_BACKTEST_HARDENING_PLAN.md`, `README.md`, `docs/reference/TECHNICAL.md`, `docs/reference/SIMULATOR_MODULES_README.md` und `tests/README.md`.

## Freigabestatus

Freigegeben am 2026-07-19. Die Akzeptanzkriterien für UI-Gestaltung, Feldvalidierung, Fokussteuerung und E2E-Tests sind vollumfänglich erfüllt. Sämtliche 5722 Assertions der Testsuite sowie die Playwright-Browsertests laufen fehlerfrei durch. Ein lokaler Commit wird durchgeführt.

## Review-Feedback von Gemini

## Review-Resultat
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - **Darstellung langer Fehlermeldungen**: Sehr lange technische Fehlermeldungen ohne Stacktrace können das Grid-Layout der Parameter-Spalten verschieben. Die CSS-Klassen sind jedoch flexibel genug gestaltet, um responsive Spaltenumbrüche zuzulassen.
- Pre-Mortem:
  Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Ein Anwender nutzt einen Nischen-Browser (oder ein veraltetes System), in dem die Fokus-Klasse und das `focus()`-Verhalten bei `#backtestStatus` (insbesondere das `preventScroll`-Flag) zu unruhigem Viewport-Springen führen, was den Lesefluss oder Screenreader-Fokus stört. Alternativ könnte ein zukünftiger Refactoring-Schritt in einem anderen UI-Tab (z. B. Monte Carlo) das globale `window.globalBacktestData` manipulieren, was zu inkonsistenten Darstellungen in der Backtest-Ergebnistabelle führt, da diese Instanz geteilt wird.

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

Noch offen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| - | - | Noch kein Review | offen | - |
