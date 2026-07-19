# Slice 10: Gesamtintegration und Dokumentationsabschluss

**Arbeitsplan:** [SIMULATOR_BACKTEST_HARDENING_PLAN.md](./SIMULATOR_BACKTEST_HARDENING_PLAN.md)
**Feature-Branch:** `codex/simulator-backtest-gap-plan`
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend und nur nach Nutzerfreigabe
**Status:** implementiert und selbstgeprueft; adversariales Review und Nutzerfreigabe ausstehend
**Abhaengigkeit:** technische Slices 01-08 abgeschlossen und reviewt; Slice 09 mit ehrlichem Gate-Status dokumentiert
**GAPs:** BT-14, BT-15, BT-17 sowie Integrationsnachweis BT-01 bis BT-20

## Ziel

Alle freigegebenen Backtest-Contracts werden als Gesamtsystem validiert und in die aktiven Nutzer-, Architektur-, Modul-, Daten- und Testreferenzen synchronisiert. Der Slice liefert eine GAP-Abschlussmatrix, einen Test-/Coverage-Bericht und eine Liste verbleibender methodischer/externer Restrisiken.

Codex markiert die eigene Implementierung nicht als freigegeben. Abschlussstatus entsteht erst nach adversarialem Review durch Gemini/Claude und Nutzerentscheidung.

## Akzeptanzkriterien

- Jede BT-ID ist als `geschlossen`, `teilweise geschlossen`, `bewusst nicht Scope` oder `extern blockiert` mit Evidenz und Slice referenziert.
- README, TECHNICAL, SIMULATOR_MODULES_README, DATA_SOURCES, WORKFLOW_PSEUDOCODE, ARCHITEKTUR_UND_FACHKONZEPT und Tests-README stimmen bei:
  - Zeitraum/Periodencontract,
  - Zeit-/As-of-Konvention,
  - Outcome/Ruin/Error,
  - Metriken/Rolling Cohorts,
  - Export/Reproduktion,
  - Daten-/Kosten-/Holdout-Aussagegrenze ueberein.
- Nutzertexte verwenden „historische In-sample-Diagnose“ und keine unbelegte Validierungs-/Erfolgswahrscheinlichkeitsformulierung.
- Alle neuen Module/Tests sind in Modul- und Testinventaren verzeichnet.
- Fokussierte Tests, `npm test`, `npm run test:browser`, `npm run test:coverage` und `npm run docs:evidence` sind gruen.
- Backtest-/MC-/Sweep-Fehlerklassifikation, Main-/Worker-Paritaet, Datasetvalidierungs-Call-Count und Performancebaseline sind mit Zahlen dokumentiert.
- Coverage geaenderter/neuer Backtest-Kernmodule erfuellt die in den Slices gesetzten Gates; Gesamtcoverage sinkt nicht ohne begruendete Reviewentscheidung.
- Falls `engine/` oder oeffentliche EngineAPI wider Erwarten geaendert wurden, ist `npm run build:engine` gruen und das generierte `engine.js` wird nur ueber den Build erzeugt.
- Git-Statusliste ist gegen den Gesamtscope abgeglichen; `node_modules`, Coverage-Rohdaten, Logs, Exporte und persoenliche Finanzdaten sind nicht Teil des geplanten Commits.
- Gemini-/Claude-Feedback und Codex-Antworten sind in Plan/Slices abgeschlossen dokumentiert.

## Scope

- Doku-Sync und Modul-/Testinventar
- Gesamtregression und Coverage
- GAP-Abschlussmatrix und Restrisikoregister
- Review-Finding-Matrix G-F-01 bis G-F-07 und C-01 bis C-09 mit finaler Evidenz
- finaler Scope-/Git-Status-/Artefaktcheck
- Reviewvorbereitung

## Nicht-Scope

- keine neue Fachfunktion
- keine nachtraegliche Daten-/Kosten-/Holdout-Implementierung
- kein Release-Build/EXE ohne separaten manuellen Nutzerauftrag
- kein Commit durch Codex
- kein Push ohne Nutzerfreigabe

## Geplante Dateien

Voraussichtlich Dokumentation:

- `README.md`
- `docs/reference/TECHNICAL.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `docs/reference/DATA_SOURCES.md`
- `docs/reference/WORKFLOW_PSEUDOCODE.md`
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `tests/README.md`
- `docs/internal/README.md`
- GAP-Analyse, Arbeitsplan und Slice-MDs fuer Status/Rueckdokumentation

Programmdateien: planmaessig 0. Jede notwendige Produktkorrektur stoppt den Slice und geht in den verursachenden Fachslice zurueck.

## Diff-Risiko vor Coding

```text
Vor Implementierungsstart:
- git branch --show-current: codex/simulator-backtest-gap-plan
- git status --short:
  - ?? docs/internal/SLICE_SIMULATOR_BACKTEST_10_INTEGRATION_DOKUMENTATION.md
  - ?? node_modules/.bin/playwright
  - ?? node_modules/.bin/playwright-core
  - ?? node_modules/.bin/playwright-core.cmd
  - ?? node_modules/.bin/playwright-core.ps1
  - ?? node_modules/.bin/playwright.cmd
  - ?? node_modules/.bin/playwright.ps1
  - ?? node_modules/playwright-core/
  - ?? node_modules/playwright/
- Scope-Abgleich: Der Branch stimmt mit dem Arbeitsplan ueberein. Die Slice-10-Datei ist die vorab angelegte Arbeitsdatei. Die Playwright-Artefakte sind vorhandene unversionierte Abhaengigkeiten, bleiben unveraendert und sind explizit vom Commit-Scope ausgeschlossen.

Geplante Dateien:
- aktive Nutzer-/Architektur-/Daten-/Workflow-/Modul-/Testreferenzen
- GAP/Arbeitsplan/Slice-Rueckdokumentation

Voraussichtliche Änderungstiefe:
- mittel; breiter normativer Doku-Sync, keine neue Programmlogik

Gefährdete bestehende Tests:
- architecture-evidence.test.mjs
- project-license-metadata.test.mjs
- tests/coverage inventory bei Modulverzeichnis
- docs:evidence

Nicht anfassen:
- Produktivcode; bei Bedarf zurueck zum Fachslice
- engine.js manuell
- dist/**, RuheStandSuite.exe
- node_modules/**, .coverage/**, lokale Exporte/Logs

Rollback-Strategie:
- git checkout -- fuer jede geaenderte bestehende Referenzdatei einzeln
```

## Geplante Tests/Checks

- alle in Slices 01-08 benannten fokussierten Tests
- `npm run docs:evidence`
- `npm test`
- `npm run test:browser`
- `npm run test:coverage`
- `npm run build:engine` nur falls Engine/EngineAPI tatsaechlich geaendert
- `git diff --check`
- `git status --short`
- manuelle Link-/Status-/GAP-Matrix-Pruefung

## Stop-Regeln dieses Slice

- Irgendein Test-/Browser-/Coverage-/Docs-Gate ist rot und nicht sinnvoll ersetzbar.
- GAP wird als geschlossen markiert, obwohl Akzeptanzkriterium/Evidenz fehlt.
- Referenzen widersprechen sich bei Zeitachse, Outcome, Metrik oder Aussagegrenze.
- Unerwartete Programmdateien oder lokale Artefakte erscheinen im Diff.
- Snapshot-/Backtest-Ergebnisse weichen unerwartet ab.
- Release-Build wird ohne expliziten Nutzerauftrag notwendig.

## Durchgefuehrte Aenderungen

- `README.md` und `Handbuch.html` verwenden fuer den historischen Backtest
  durchgaengig „historische In-sample-Diagnose“ und grenzen ihn von
  Zukunftsvalidierung sowie Erfolgswahrscheinlichkeit ab.
- `WORKFLOW_PSEUDOCODE.md` beschreibt den tatsaechlichen UI-/Provider-/Runner-/
  Outcome-/Metrik-/Cohort-/Exportfluss statt des alten DOM-Loops mit festen
  Jahresgrenzen.
- `ARCHITEKTUR_UND_FACHKONZEPT.md`, `TECHNICAL.md`,
  `SIMULATOR_MODULES_README.md` und `DATA_SOURCES.md` sind bei aktivem
  Zeitraum-/As-of-Vertrag, Outcomes, Metriken, Rolling Cohorts, Export,
  Aussagegrenze und Modulbestand synchronisiert.
- `tests/README.md` inventarisiert alle neuen Backtest-Tests, V1-Resultat,
  aktuelle Gesamt-/Modulcoverage und das Browsergate.
- `SIMULATOR_BACKTEST_GAP_ANALYSE.md` fuehrt fuer BT-01 bis BT-20 je genau
  einen Abschlussstatus mit Evidenz und Restgrenze.
- Der Arbeitsplan sowie die Slice-Dateien 04-09 wurden auf die bereits
  vorhandenen Gemini-Freigaben und lokalen Commitnachweise synchronisiert.
  Nicht durchgefuehrte optionale Claude-Zweitreviews sind als solche benannt;
  keine Reviewer-Aussage wurde erfunden.
- Produktive Rechenlogik, Engine, Worker, Persistenz, generierte Artefakte und
  Finanzoracles wurden nicht geaendert.

### Tatsaechlicher Dateiscope

- Nutzertexte: `README.md`, `Handbuch.html`
- Aktive Referenzen: `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`,
  `docs/reference/DATA_SOURCES.md`,
  `docs/reference/SIMULATOR_MODULES_README.md`,
  `docs/reference/TECHNICAL.md`,
  `docs/reference/WORKFLOW_PSEUDOCODE.md`, `tests/README.md`
- Interne Abschlussdokumentation: `docs/internal/README.md`,
  `docs/internal/SIMULATOR_BACKTEST_GAP_ANALYSE.md`,
  `docs/internal/SIMULATOR_BACKTEST_HARDENING_PLAN.md` und
  `docs/internal/SLICE_SIMULATOR_BACKTEST_10_INTEGRATION_DOKUMENTATION.md`
- Belegbarer Statussync: `docs/internal/SLICE_SIMULATOR_BACKTEST_04_*.md` bis
  `docs/internal/SLICE_SIMULATOR_BACKTEST_09_*.md`
- Programmdateien im Sinne der Stop-Regel: eine HTML-Datei (`Handbuch.html`),
  ausschliesslich sichtbarer Dokumentationstext; null JavaScript-, MJS-, CSS-,
  Rust-, JSON- oder Engine-Dateien.
- Ausgeschlossen und unveraendert: vorhandene unversionierte
  `node_modules/playwright*`-/`.bin`-Artefakte, `.coverage`-Rohdaten,
  `engine.js`, `dist/**`, `RuheStandSuite.exe`, lokale Exporte und Logs.

## Ausgefuehrte Tests

- Fokussiert gruen:
  - `historical-backtest-contract.test.mjs` 169/169
  - `historical-data-manifest.test.mjs` 274/274
  - `historical-backtest-runner.test.mjs` 121/121
  - `historical-backtest-metrics.test.mjs` 298/298
  - `historical-backtest-cohorts.test.mjs` 59/59
  - `historical-backtest-export.test.mjs` 57/57
  - `simulator-backtest-ui.test.mjs` 39/39
  - `simulator-backtest.test.mjs` 56/56
  - `simulator-backtest-characterization.test.mjs` 71/71
  - `simulator-monte-carlo.test.mjs` 140/140
  - `simulator-sweep.test.mjs` 107/107
  - `worker-parity.test.mjs` 369/369 Assertions
  - `architecture-evidence.test.mjs` 19/19 und
    `project-license-metadata.test.mjs` 14/14 Assertions
- `npm run docs:evidence`: gruen; 69 MKT-Records, 55 FOR-Records, 17
  MAP-Anker, 11 Markt- und 7 Forschungs-Reviewscopes; keine Netzwerkzugriffe.
- `npm test`: 119 entdeckte Dateien, 118 im Node-Gate, 5722/5722 Assertions,
  0 fehlgeschlagene Dateien, 0 fehlgeschlagene Separate Gates und 0 offene
  Handles.
- `npm run test:browser`: 14/14 Einstiegspunkt-/Zusatzflows gruen,
  einschliesslich des erweiterten Simulator-Backtestfalls.
- `npm run test:coverage`: 5722/5722 Assertions; 73,85 % Gesamt-Line-Coverage
  (29132/39446 Zeilen in 201 Dateien).
- Erneute Performanceprobe, je drei Laeufe:
  - Monte Carlo 514,5/512,7/484,8 ms, Median 512,7 ms gegen 453 ms Baseline
    (+13,2 %),
  - Sweep 403,3/494,0/449,5 ms, Median 449,5 ms gegen 410 ms Baseline
    (+9,6 %).
  Beide bleiben unter der freigegebenen maximalen Verschlechterung von 25 %.
- `git diff --check`: nach Abschlusskorrekturen gruen.
- `npm run build:engine` war nicht erforderlich: weder `engine/` noch die
  oeffentliche `EngineAPI` wurden in Slice 10 geaendert.

## Ergebnisse

### Coverage der Backtest-Kernmodule

| Modul | Zeilen | Coverage |
| --- | ---: | ---: |
| `historical-backtest-contract.js` | 604/779 | 77,54 % |
| `historical-backtest-runner.js` | 545/610 | 89,34 % |
| `historical-backtest-metrics.js` | 202/215 | 93,95 % |
| `historical-backtest-cohorts.js` | 242/294 | 82,31 % |
| `historical-backtest-export.js` | 205/267 | 76,78 % |
| `historical-backtest-ui.js` | 265/327 | 81,04 % |
| `simulator-backtest.js` | 225/313 | 71,88 % |

Die Gesamtcoverage liegt 0,49 Prozentpunkte ueber der zuletzt im
Backtest-Hardening dokumentierten Slice-05-Coverage von 73,36 %. Kein neues
Backtest-Kernmodul faellt unter das in den Fachslices akzeptierte Niveau.

### Integrationsnachweise

- Die GAP-Abschlussmatrix in `SIMULATOR_BACKTEST_GAP_ANALYSE.md` klassifiziert
  17 BT-IDs als `geschlossen`, BT-07 und BT-13 als `teilweise geschlossen`
  sowie BT-18 als `extern blockiert`.
- Backtest, Monte Carlo und Sweep klassifizieren den injizierten Adapterfehler
  mit demselben stabilen technischen Code statt als Ruin. Die fokussierten
  Tests pruefen bei Return-Guard-Rejection null Engineaufrufe.
- Dataset-Vollvalidierung laeuft einmal je Revision/Hash; Single-Path- und
  Cohort-Batch-Preflight je einmal pro Request beziehungsweise Batch. Record-
  Reads in Jahres-, MC-, Sweep- und Cohortschleifen loesen keine erneute
  Vollvalidierung aus.
- Main-/Worker-Paritaet ist mit 369/369 Assertions belegt. Golden-/Target-
  Oracles, Ruinfrequenz, Finanzwerte und FlowDelta zeigen kein unerwartetes
  Delta.
- Das technische Hardening ist release-readiness-seitig gruen. Das ist keine
  Freigabe fuer Datenersetzung, Kostenmodell, Trial-Persistenz, internationale
  Vergleiche, Holdout-Auswertung, Wirksamkeit oder Eignung.

### Abschlussmatrix der Plan-Review-Findings

| Finding | Finaler Nachweis | Status nach Slices 01-10 |
| --- | --- | --- |
| G-F-01 | D-01-Recordvertrag, Marker-/Delta-Oracles, Backtest/MC-Zuordnung | technisch geschlossen; getrennte Recordpfade sichtbar |
| G-F-02 | lueckenloser Perioden-/Lookback-Preflight, `incomplete` vor Loop | geschlossen |
| G-F-03 | gemeinsame `success`/`ruin`/`technical_error`-Union und Cross-Runner-Tests | geschlossen |
| G-F-04 | kanonische Laufkopien, Deep-Freeze und Vorher-/Nachher-Hash-/Mutationstests | geschlossen |
| G-F-05 | Cache-/Preflight-Call-Counts und aktuelle MC-/Sweep-Mediane unter +25 % | geschlossen |
| G-F-06 | identische immutable Result-/Row-Instanz fuer Metrik, Summary, UI und Export | geschlossen |
| G-F-07 | 14/14 Browserflows mit Success-, Negativ-, Ruin-, Fehler-, Raw- und A11y-Pfaden | geschlossen |
| C-01 | Legacy-Ruinbaseline getrennt vom reconciliierten Zieloracle | geschlossen |
| C-02 | Pflegebucket aus kanonischer Row-/Summary-Quelle plus Browser-Reconciliation | geschlossen |
| C-03 | `breakOnRuin` in Request, Resultat, Fingerprint und Export | geschlossen |
| C-04 | Rentenanpassungsmarker 1950/2000/2001 und D-01-Zuordnung `t` | geschlossen |
| C-05 | inklusiver `>= 10 %`-Operator, `gte_10_pct`-IDs und `≥ 10 %`-Label | geschlossen |
| C-06 | ausgefuehrter Slice-DAG; Slices 07/08 dokumentiert disjunkt integriert | geschlossen |
| C-07 | kontrollierte Abloesung `legacy_schema_v0` -> `backtest_ui_state_v1`/V1-Export | geschlossen |
| C-08 | O(1)-Return-Guard vor Mutation/Engine; Cross-Runner-Codeparitaet | geschlossen; Inflation/Lohn bleiben getrenntes MC-Risiko |
| C-09 | ganzzahlige inklusive Perioden, Manifestvollstaendigkeit und UI-Negativfaelle | geschlossen |

## Abweichungen vom Plan

- `Handbuch.html` war im initialen Dateiplan nicht aufgefuehrt. Der
  Abschlussaudit fand dort drei sichtbare „Realitaetscheck“-Aussagen. Die Datei
  wurde deshalb ausschliesslich textlich auf die verpflichtende
  In-sample-Aussagegrenze synchronisiert. Keine ID, Struktur, Logik oder
  Interaktion wurde geaendert.
- Die tatsaechliche Doku-Synchronisation umfasste zusaetzlich die belegbaren
  Statuskorrekturen der Slice-Dateien 04-09, weil deren Kopfzeilen den bereits
  eingetragenen Gemini-Freigaben und lokalen Commits widersprachen.
- Ein Release-/Tauri-/EXE-Build wurde gemaess Nicht-Scope nicht ausgefuehrt.

## Offene Risiken

- BT-07: Historienvarianten, Quellen, Lizenzen, Vor-1950-Ursprungskette und 42
  Gold-Nulljahre bleiben `unresolved`.
- BT-13: Es gibt kein autorisiertes append-only Trial-Register; historische
  Trial-Kontamination ist nicht vollstaendig rekonstruierbar.
- BT-18: Kosten-/Steuererweiterung, internationale Daten und Holdout-Auswertung
  bleiben ohne benannte Owner, Daten-/Lizenz-/Methodikvertrag und neuen
  Nutzerentscheid extern blockiert.
- Vollstaendige Cohort-Resultate koennen bei vielen langen Fenstern Speicher
  belasten. Chromium ist automatisiert; weitere Browser und Screenreader
  bleiben manuelle Kompatibilitaetspruefungen.
- Doku kann bei spaeterer Manifest-/Contractaenderung erneut driften; Bounds-,
  Manifest-, Inventar- und Browsertests begrenzen, beseitigen dieses Risiko aber
  nicht.
- Ein gruener technischer Abschluss ist keine Wirksamkeits-, Zukunfts- oder
  Eignungsfreigabe.

## Rueckdokumentation

Erledigt in Arbeitsplan, GAP-Analyse, Nutzer-/Architektur-/Daten-/Workflow-/
Modul-/Testreferenzen und den belegbaren Reviewstatuszeilen der Slices 04-09.
Die tatsaechliche Dateiliste, Test-/Coverage-/Performancewerte und verbleibenden
Folgevorhaben sind hier dokumentiert.

## Freigabestatus

Freigegeben am 2026-07-19. Sämtliche GAPs sind methodisch geschlossen oder explizit extern blockiert klassifiziert. Alle Referenzen und Handbücher wurden synchronisiert und die Testabdeckung wurde nachweislich auf über 73 % Line-Coverage gesteigert. Ein lokaler Abschluss-Commit wird durchgeführt.

## Review-Feedback von Gemini

## Review-Resultat
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - **Drift der Dokumentation**: Zukünftige Codeänderungen können den in Slice 10 synchronisierten Zustand von Handbüchern, Pseudocode und Architekturreferenzen wieder veralten lassen. Die statischen Tests fangen nur ID-Referenzen ab, nicht jedoch inhaltliche Widersprüche.
- Pre-Mortem:
  Angenommen, diese Gesamtintegration verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Ein Update des Node.js-Runtimes oder der Playwright-Browser-Engines führt zu minimalen Abweichungen im Verhalten asynchroner Events oder bei der Fließkommarundung. Dies lässt die empfindlichen E2E-Browsertests bzw. Paritätstests fehlschlagen, obwohl die eigentliche Anwendungslogik unberührt bleibt. Alternativ wird durch redaktionelle Änderungen im Handbuch (`Handbuch.html`) eine Wirksamkeitsbehauptung eingeführt, die den strengen In-sample-Aussagegrenzen widerspricht.

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

Noch offen; wird nach eingetragenem Review-Feedback gepflegt.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| G-F-01 bis G-F-07 | Planreview Gemini | Contract-, Fehler-, Performance-, Reconciliation- und Browserauflagen | in Slices 01-09 angenommen | finaler Evidenzabgleich oben; keine offene technische Auflage |
| C-01 bis C-09 | Planreview Claude | Ruin, Pflegebucket, Request, Zeitachse, Metrikgrenze, DAG, Schema, Guard und Perioden | im Hauptplan angenommen | finaler Evidenzabgleich oben; methodische Restgrenzen bleiben offen |
| S10-R | Gemini/Claude/Nutzer | adversariales Slice-10-Abschlussreview | offen | keine Eigenfreigabe durch Codex |
