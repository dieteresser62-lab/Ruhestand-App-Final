# Slice Longevity 03: Engine Runner

**Stand:** 2026-06-16  
**Status:** implementiert, Review ausstehend  
**Autor:** Codex  
**Paket:** 3 - Langlebigkeitsmodell konservativer  
**Slice:** 3 - Engine, Backtest, Monte Carlo, Worker  
**Feature-Branch:** `codex/langlebigkeitsmodell-konservativer`  
**GitHub-Status:** lokal angelegt, noch nicht veroeffentlicht  
**Uebergeordneter Plan:** `docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md`

## Ziel

Dieser Slice verdrahtet den in Slice 2 implementierten Longevity-Horizon-Helper produktiv in Dynamic-Flex-Engine- und Runner-Pfade. Balance/Backtest/Monte Carlo/Sweep/Worker sollen denselben Effektivhorizont verwenden, wenn Longevity-Felder in den Inputs vorhanden sind. Default `longevityMode='none'` bleibt rueckwaertskompatibel.

## Akzeptanzkriterien

- `longevityMode='none'` erzeugt fuer Engine, Backtest, MC und Sweep identische Ergebnisse zur bisherigen Baseline.
- Bei aktivem Longevity-Modus verwendet die Engine `horizonYears` als effektiven Horizon und diagnostiziert Raw-Horizon, effektiven Horizon, Modus, angewandten Shift/Buffer und Clamp-Grund.
- Backtest und Monte Carlo leiten den Raw-Horizon aus derselben Sterbetafel-Logik ab und wenden das Longevity-Adjustment genau einmal auf den finalen Haushalts-Horizon an.
- `quantile_shift` nutzt fuer Single und Paar dieselbe Quantil-Neuberechnung wie die bestehende Dynamic-Flex-Horizon-Ableitung.
- Worker-/Chunk-Paritaet belegt, dass Longevity-Felder in seriellen und gesplitteten MC-/Sweep-Pfaden identisch wirken.
- Sweep und Auto-Optimize nehmen Longevity-Parameter in Version 1 nicht als Optimizer-/Sweep-Variablen auf.
- Ungueltige Longevity-Settings erzeugen Validierungsfehler statt stiller Normalisierung.

## Scope

- Gemeinsamer DOM-freier Resolver fuer Dynamic-Flex-Horizon mit Longevity-Adjustment.
- Verdrahtung in Backtest und Monte Carlo.
- Engine-Validierung und VPW-Diagnose fuer Longevity-Felder.
- Fokussierte Tests fuer Engine-/Runner-Integration und Worker-Paritaet.
- Rueckdokumentation im Arbeitsplan.

## Nicht-Scope

- Keine UI-/Profilpersistenzfelder.
- Keine Optimizer-Steuerung fuer Longevity-Parameter.
- Keine Aenderung an generierten Artefakten (`engine.js`, `dist/`, `RuheStandSuite.exe`).
- Keine Bereinigung vorbestehender `node_modules`-Aenderungen.

## Branch- und Statuscheck vor Coding

`git branch --show-current`:

```text
codex/langlebigkeitsmodell-konservativer
```

`git status --short`:

```text
 M docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md
 M node_modules/.package-lock.json
?? app/simulator/dynamic-flex-longevity-contract.js
?? app/simulator/dynamic-flex-longevity-horizon.js
?? docs/internal/SLICE_LONGEVITY_01_CONTRACT.md
?? docs/internal/SLICE_LONGEVITY_02_HORIZON_MODULE.md
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
?? tests/longevity-contract.test.mjs
?? tests/longevity-horizon.test.mjs
```

Hinweis: Die Slice-01/02-Dateien sind noch uncommitted. Die `node_modules`-Aenderungen bestanden vor Slice-Beginn und liegen ausserhalb des Slice-Scopes.

## Diff-Risiko

Geplante Dateien:

- `app/simulator/dynamic-flex-longevity-horizon.js`
- `app/simulator/dynamic-flex-runner-horizon.js`
- `app/simulator/monte-carlo-runner.js`
- `app/simulator/simulator-backtest.js`
- `engine/core.mjs`
- `engine/validators/InputValidator.mjs`
- `tests/longevity-engine-runner.test.mjs`
- `tests/worker-parity.test.mjs`
- `docs/internal/SLICE_LONGEVITY_03_ENGINE_RUNNER.md`
- `docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md`

Voraussichtliche Aenderungstiefe:

- mittel bis riskant; Runtime-Pfade fuer Dynamic-Flex, Backtest, MC und Engine-Diagnose werden beruehrt.

Gefaehrdete bestehende Tests:

- `dynamic-flex-horizon.test.mjs`
- `vpw-dynamic-flex.test.mjs`
- `simulator-monte-carlo.test.mjs`
- `simulator-sweep.test.mjs`
- `worker-parity.test.mjs`

Nicht anfassen:

- `engine.js`, `dist/`, `RuheStandSuite.exe`
- UI-/Profilpersistenz und Optimizer-Parameterlisten fuer Longevity
- vorhandene `node_modules`-Aenderungen

Rollback-Strategie:

- Neue Slice-03-Dateien gezielt entfernen.
- Geaenderte Runtime-/Test-/Doku-Dateien gezielt mit `git checkout -- <datei>` zuruecksetzen, falls freigegeben/noetig.

## Geplante Tests

- `node tests/run-single.mjs tests/longevity-engine-runner.test.mjs`
- `node tests/run-single.mjs tests/longevity-horizon.test.mjs`
- `node tests/run-single.mjs tests/longevity-contract.test.mjs`
- `node tests/run-single.mjs tests/worker-parity.test.mjs`
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
- `node tests/run-single.mjs tests/simulator-sweep.test.mjs`
- `npm run build:engine`
- `npm test`

## Durchgefuehrte Aenderungen

- Neues Modul `app/simulator/dynamic-flex-runner-horizon.js` angelegt.
  - Buendelt die bestehende Single-/Joint-Sterbetafelableitung fuer Dynamic-Flex.
  - Wendet `applyLongevityHorizonAdjustment()` genau einmal auf den finalen Haushalts-Horizon an.
  - Recomputet `quantile_shift` ueber dieselbe Single-/Joint-Quantilfunktion wie der Raw-Horizon.
  - Unterstuetzt MC-Joint-to-Single-Smoothing ueber den Slice-2-Helfer.
- `app/simulator/monte-carlo-runner.js` auf den gemeinsamen Resolver umgestellt.
  - MC nutzt den effektiven Horizon als `horizonYears`.
  - Aktive Longevity-Diagnose wird an die Engine weitergegeben.
  - Joint-to-Single-Uebergaenge merken den letzten Joint-Horizon als Smoothing-Anker.
- `app/simulator/simulator-backtest.js` auf den gemeinsamen Resolver umgestellt.
- `engine/validators/InputValidator.mjs` validiert Longevity-Modus und numerische V1-Grenzen.
- `engine/core.mjs` normalisiert Longevity-Zahlen aus String-Eingaben und erweitert `ui.vpw` um Raw-/Effektivhorizont, Modus, Shift-/Buffer-/Clamp- und Smoothing-Diagnose.
- `tests/longevity-engine-runner.test.mjs` neu angelegt.
- `tests/worker-parity.test.mjs` um Longevity-MC-Chunk-Paritaet mit VPW-Payload-Vergleich erweitert.
- Beim Re-Test wurde ein Null-Fallback-Fehler im neuen Resolver gefunden (`null` wurde zu q=0.50 statt Fallback q=0.85). Der Fehler wurde in `dynamic-flex-runner-horizon.js` und defensiv in `dynamic-flex-longevity-horizon.js` korrigiert.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/longevity-engine-runner.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 23 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/longevity-horizon.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 22 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/longevity-contract.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 33 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/worker-parity.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 332 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 87 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 39 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/simulator-sweep.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 107 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/dynamic-flex-horizon.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 10 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/vpw-dynamic-flex.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 52 bestanden, 0 fehlgeschlagen
- `npm run build:engine`
  - Ergebnis: bestanden
  - Hinweis: Fallback-Build ohne `esbuild` erstellt.
- `npm test`
  - Ergebnis: bestanden
  - Testdateien: 95
  - Assertions: 2759 bestanden, 0 fehlgeschlagen
  - Failed Files: 0
  - Open Handles: 0

## Abweichungen vom Plan

- Keine fachliche Abweichung.
- Balance nutzt in diesem Slice noch keine neuen UI-/Persistenzfelder; ohne Longevity-Input bleibt `longevityMode='none'`. Die produktive Nutzersteuerung folgt in Slice 4.
- Sweep/Auto-Optimize erhalten Longevity-Parameter nicht als Variationsparameter. Bestehende feste Longevity-Inputs bleiben im Base-Input erhalten.

## Offene Risiken

- UI-/Profilpersistenz und Copytext folgen erst in Slice 4; bis dahin sind Longevity-Felder nur config-/testseitig wirksam.
- `quantile_shift` kann bei Basisquantil 0.95 weiterhin wirkungslos sein; Diagnose `quantile_cap` bleibt Pflicht fuer UI/Copytext in Slice 4.

## Rueckdokumentation

- `docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md` wurde um den Slice-03-Status ergaenzt.

## Freigabestatus

Freigegeben.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| F-01 | Gemini | Typkonvertierung fuer `longevityQuantileShift`, `longevityRelativePct` und `longevityBufferYears` in `_normalizeEngineInput` loest das Typkonvertierungs-Problem. | Akzeptiert. Strings wie `"2"` werden sicher in Zahlen umgewandelt. | erledigt (in Core.mjs) |
| F-02 | Gemini | `_buildLongevityDiagnostics` stellt sicher, dass die Diagnosefelder fuer den Horizont und das Smoothing in der Engine-Antwort auch dann repraesentiert werden, wenn die Engine direkt aufgerufen wird (mit Fallbacks). | Akzeptiert. Sorgt fuer ein robustes API-Verhalten. | erledigt (in Core.mjs) |

