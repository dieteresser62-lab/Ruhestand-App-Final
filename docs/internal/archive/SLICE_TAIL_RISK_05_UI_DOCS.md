# Slice Tail Risk 05: UI, Export und Doku

**Feature-Branch:** `codex/fat-tail-crash-modell`  
**GitHub-Status:** lokal angelegt, noch nicht veroeffentlicht  
**Status:** freigegeben  
**Startdatum:** 2026-06-17  
**Uebergeordneter Plan:** `docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md`

## Ziel

Dieser Slice macht das optionale Tail-Risk-Overlay im Simulator bewusst aktivierbar, zeigt die aggregierten Tail-Risk-KPIs in der Ergebnisdarstellung, stellt sicher, dass Scenario-Log-Exporte die Tail-Event-Felder enthalten, und aktualisiert die Referenzdokumentation samt Beispielvergleich Standard vs. Tail-Risk.

## Akzeptanzkriterien

- Tail-Risk bleibt standardmaessig deaktiviert.
- Aktivierung ist ein explizites Opt-in mit sichtbarem Warnhinweis als Modellannahme, nicht Prognose.
- UI-Parameter werden in denselben Grenzen validiert wie der Tail-Risk-Contract.
- Ungueltige Tail-Risk-Parameter blockieren den Simulationsstart mit klarer Fehlermeldung und werden nicht still geklemmt.
- Ergebnis-KPIs zeigen Tail-Risk nur bei aktivierter Konfiguration und trennen aktive Events, applizierte Events und historische Krisenjahr-Skips.
- Scenario-Log-JSON/CSV enthaelt die Tail-Event-Felder, weil die vorhandenen Row-Strukturen unverkuerzt exportiert werden.
- Referenzdoku beschreibt das optionale Overlay, den Anti-Doppelpessimismus-Schutz und den Beispielvergleich.

## Scope

- `Simulator.html`
- `app/simulator/simulator-portfolio-inputs.js`
- `app/simulator/simulator-input-validation.js`
- `app/simulator/results-metrics.js`
- `tests/simulator-input-readers.test.mjs`
- `docs/reference/TECHNICAL.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `README.md`
- `docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md`
- `docs/internal/SLICE_TAIL_RISK_05_UI_DOCS.md`

## Nicht-Scope

- Keine Aenderung am Tail-Risk-Overlay-Modul.
- Keine Aenderung an Runner-, Worker- oder Merge-Semantik.
- Keine Persistenzpflicht fuer Tail-Risk-Controls in Version 1.
- Keine Aenderung an `engine/`, `engine.js`, `dist/` oder Release-Artefakten.
- Keine Aenderung vorhandener `node_modules`-Aenderungen.

## Git-Status Vor Start

Branch:

```text
codex/fat-tail-crash-modell
```

Status:

```text
 M node_modules/.package-lock.json
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
```

Hinweis: Die `node_modules`-Aenderungen waren vor Slice-Start vorhanden und werden nicht angefasst.

## Diff-Risiko

Geplante Dateien:

- `docs/internal/SLICE_TAIL_RISK_05_UI_DOCS.md`
- `docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md`
- `Simulator.html`
- `app/simulator/simulator-portfolio-inputs.js`
- `app/simulator/simulator-input-validation.js`
- `app/simulator/results-metrics.js`
- `tests/simulator-input-readers.test.mjs`
- `README.md`
- `docs/reference/TECHNICAL.md`
- `docs/reference/SIMULATOR_MODULES_README.md`

Voraussichtliche Aenderungstiefe:

- mittel

Gefaehrdete bestehende Tests:

- `tests/simulator-input-readers.test.mjs`
- `tests/tail-risk-contract.test.mjs`
- `tests/simulator-monte-carlo.test.mjs`
- `tests/worker-parity.test.mjs`

Nicht anfassen:

- `workers/mc-worker.js`
- `app/simulator/monte-carlo-runner.js`
- `app/simulator/tail-risk-overlay.js`
- `engine/`, `engine.js`, `dist/`, `RuheStandSuite.exe`
- vorhandene `node_modules`-Aenderungen

Rollback-Strategie:

- Geaenderte bestehende Dateien: `git checkout -- docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md Simulator.html app/simulator/simulator-portfolio-inputs.js app/simulator/simulator-input-validation.js app/simulator/results-metrics.js tests/simulator-input-readers.test.mjs README.md docs/reference/TECHNICAL.md docs/reference/SIMULATOR_MODULES_README.md`
- Neue Slice-Datei nach Rueckfrage entfernen: `docs/internal/SLICE_TAIL_RISK_05_UI_DOCS.md`

## Stop-Regel-Pruefung

Der geplante Scope beruehrt 5 Programmdateien (`.html`, `.js`, `.mjs`) und bleibt damit innerhalb der 5-Dateien-Stop-Regel. Markdown-Dokumentation ist nach AGENTS-Regel ausgenommen.

## Geplante Tests

- `node tests/run-single.mjs tests/simulator-input-readers.test.mjs`
- `node tests/run-single.mjs tests/tail-risk-contract.test.mjs`
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
- `node tests/run-single.mjs tests/worker-parity.test.mjs`
- `npm test`

## Durchgefuehrte Aenderungen

- `Simulator.html` ergaenzt im Monte-Carlo-Tab ein explizites Tail-Risk-Opt-in mit Parametern fuer Wahrscheinlichkeit, Return-Schock, Inflationsschock, Dauer und Cooldown sowie sichtbarem Hinweis "Modellannahme, keine Prognose".
- `app/simulator/simulator-portfolio-inputs.js` liest die Tail-Risk-UI-Felder und normalisiert sie ueber `normalizeTailRiskConfig()`. Der MC-Horizont wird fuer die spaetere Kompatibilitaetspruefung mittransportiert.
- `app/simulator/simulator-input-validation.js` fuehrt Tail-Risk-Contractfehler und Horizontfehler zusammen und blockiert ungueltige UI-Eingaben mit `SimulatorValidationError`, statt sie still in Runner-Defaults kippen zu lassen.
- `app/simulator/results-metrics.js` zeigt bei aktivem Tail-Risk-Overlay eine eigene Detailsektion mit aktiven/applizierten Runs, aktiven/applizierten Jahresanteilen und historischen Krisen-Skips.
- `tests/simulator-input-readers.test.mjs` prueft Tail-Risk-Input-Reading, valide Konfiguration, Bereichsfehler und Dauer-vs.-Horizont-Fehler.
- `README.md`, `docs/reference/TECHNICAL.md` und `docs/reference/SIMULATOR_MODULES_README.md` dokumentieren optionales Overlay, Anti-Doppelpessimismus, Exportfelder und Standard-vs.-Tail-Risk-Vergleich.
- `docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md` markiert Slice 5 als implementiert mit ausstehendem Review.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/simulator-input-readers.test.mjs`
  - Ergebnis: gruen, 43 Assertions.
- `node tests/run-single.mjs tests/tail-risk-contract.test.mjs`
  - Ergebnis: gruen, 53 Assertions.
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
  - Ergebnis: gruen, 110 Assertions.
- `node tests/run-single.mjs tests/worker-parity.test.mjs`
  - Ergebnis: gruen, 354 Assertions.
- `npm test`
  - Erster Lauf: rot wegen `tests/simulator-backtest.test.mjs` (`Unexpected alert`), verursacht durch Tail-Risk-Validierung deaktivierter/missing DOM-Felder im Backtest-Testmock. Behoben, indem deaktiviertes Tail-Risk keine Parameter aus dem DOM validiert.
  - Zweiter Lauf: gruen, 101 Testdateien, 2996 Assertions, 0 fehlgeschlagene Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles.
- `npm run test:browser`
  - Ergebnis: gruen fuer `index.html`, `Balance.html`, `Simulator.html`, `depot-tranchen-manager.html` und `Handbuch.html`.

## Abweichungen Vom Plan

- Keine Persistenz der Tail-Risk-Controls in Version 1. Das ist bewusst ausserhalb dieses Slice-Scopes gehalten, damit ein lokaler Test-Opt-in nicht dauerhaft versehentlich aktiv bleibt.
- Export wurde nicht mit separater Exportlogik erweitert: JSON exportiert die vollstaendigen Log-Rows, CSV nutzt alle Keys der ersten Row. Da die Tail-Risk-Felder in den Row-Strukturen vorhanden sind, sind sie im Export enthalten.

## Offene Risiken

- Tail-Risk ist nun sichtbar, aber weiterhin fachlich nicht kalibriert. Die UI weist es als Stressannahme aus; Nutzer koennen die Erfolgsquote trotzdem als Prognose missverstehen.
- Die bekannte nicht-monotone Skip-Klippe an der historischen Krisenschwelle bleibt unveraendert.
- Ein manueller visueller Browser-Check wurde nicht ausgefuehrt; der automatisierte Browser-Smoke laedt alle Einstiegspunkte inklusive `Simulator.html`.

## Rueckdokumentation

- `docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md` dokumentiert Slice 5 als implementiert mit ausstehendem Review.
- README und Referenzdokumente beschreiben Tail-Risk als optionales, standardmaessig deaktiviertes Overlay inklusive Vergleichsmetriken.

## Freigabestatus

Codex-Implementierung abgeschlossen; Review durch Gemini/Nutzer steht aus. Codex markiert den Slice nicht als freigegeben.

## Review-Feedback von Gemini

- **Status:** freigegeben
- **Blocker:** keine
- **Findings & Analysen:**
  - **TR-05-01 (Doku-Synchronität):** Die Änderungen in `README.md`, `TECHNICAL.md` und `SIMULATOR_MODULES_README.md` beschreiben das Feature, seine Funktionsweise (Doppelpessimismus-Schutz) und die Vergleichbarkeit präzise und widerspruchsfrei.
  - **TR-05-02 (UI-Validierung & Fehlerblockade):** Ungültige Parameter blockieren den Start mit einem regulären `SimulatorValidationError` (verifiziert im Unit-Test), was stilles Klemmen oder Fehler im Web Worker verhindert.
  - **TR-05-03 (Fehlende Persistenz):** Die bewusste Entscheidung, die Stress-Schockparameter nicht im Profil zu persistieren, verhindert, dass Benutzer versehentlich in dauerhaft verzerrten Testkonfigurationen verbleiben.
- **Restrisiken:**
  - Fehlende Persistenz kann bei komplexen Testreihen zu wiederholtem manuellem Konfigurationsaufwand führen (akzeptabel für Version 1).

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

Noch offen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| TR-05-01 | Gemini | Synchronität der Referenzdokumente | Geprüft & Freigegeben | Alle Doku-Quellen wurden synchron erweitert |
| TR-05-02 | Gemini | UI-Bereichsfehler blockieren Simulationslauf | Geprüft & Freigegeben | Bestätigt durch `tests/simulator-input-readers.test.mjs` |
| TR-05-03 | Gemini | Fehlende Persistenz der Tail-Risk-Parameter | Akzeptiert als Restrisiko | Bewusster Schutz vor Fehlkonfigurationen in Version 1 |

