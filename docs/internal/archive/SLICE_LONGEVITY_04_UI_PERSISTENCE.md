# Slice Longevity 04: UI Persistence

**Stand:** 2026-06-16  
**Status:** implementiert, Review ausstehend  
**Autor:** Codex  
**Paket:** 4 - UI/Preset-Anpassung  
**Slice:** 4 - Balance/Simulator Inputs, Diagnose, Copytext  
**Feature-Branch:** `codex/langlebigkeitsmodell-konservativer`  
**GitHub-Status:** lokal angelegt, noch nicht veroeffentlicht  
**Uebergeordneter Plan:** `docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md`

## Ziel

Dieser Slice macht die in Slice 1-3 eingefuehrten Longevity-Parameter fuer Nutzer sichtbar und dauerhaft nutzbar. Balance und Simulator sollen dieselben Eingabefelder, Defaults und Persistenz-Keys verwenden. Diagnose- und Copytext sollen erklaeren, ob der konservative Horizont aktiv war, welcher Raw-/Effektivhorizont genutzt wurde und ob ein Quantil- oder Max-Horizon-Clamp den Effekt begrenzt hat.

## Akzeptanzkriterien

- Balance und Simulator stellen Longevity-Modus und die passenden Detailparameter im Dynamic-Flex-Detailbereich dar.
- Default bleibt `longevityMode='none'`; bestehende Profile und gespeicherte States laden ohne aktive Aenderung.
- UI-Reader geben `longevityMode`, `longevityQuantileShift`, `longevityRelativePct` und `longevityBufferYears` konsistent an Engine, Backtest, Monte Carlo und Sweep-Base-Inputs weiter.
- Simulator-Profilimport/-Profilverbund uebernimmt Longevity-Werte aus gespeicherten Simulator-Keys; bei unterschiedlichen Profilwerten bleibt das Hauptprofil fuehrend und eine Warnung macht das sichtbar.
- Dynamic-Flex-Presets setzen keine aktive Longevity-Pufferung als Default.
- Copytext/Diagnose zeigen Raw-Horizon, effektiven Horizon, Modus, angewandten Shift/Buffer, Clamp-Grund und Smoothing-Hinweis, sofern vorhanden.
- `quantile_shift` mit bereits gekapptem Quantil wird als wirkungslos/geklemmt erkennbar.
- Auto-Optimize-Parameterlisten bleiben unveraendert; Longevity ist in Version 1 kein Optimizer-Parameter.

## Scope

- HTML-Felder in `Balance.html` und `Simulator.html`.
- Gemeinsame Dynamic-Flex-UI-Steuerung/Persistenz in `app/simulator/simulator-main-dynamic-flex.js`.
- Simulator-Input-Reader und Profilimport/-Profilverbund.
- Balance-Input-Reader.
- Balance-Diagnose-Copytext.
- Fokussierte Tests fuer Input-/Profil-/Copytext-Contracts.
- Rueckdokumentation im Arbeitsplan.

## Nicht-Scope

- Keine Aenderung an Engine-Berechnung, Runner-Horizon-Resolvern oder Worker-Chunking.
- Keine Aufnahme von Longevity-Parametern in Auto-Optimize/Sweep-Variationsparameter.
- Keine Aenderung an generierten Artefakten (`engine.js`, `dist/`, `RuheStandSuite.exe`).
- Keine Bereinigung vorbestehender `node_modules`-Aenderungen.

## Branch- und Statuscheck vor Coding

`git branch --show-current`:

```text
codex/langlebigkeitsmodell-konservativer
```

`git status --short`:

```text
 M app/simulator/monte-carlo-runner.js
 M app/simulator/simulator-backtest.js
 M docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md
 M engine/core.mjs
 M engine/validators/InputValidator.mjs
 M node_modules/.package-lock.json
 M tests/worker-parity.test.mjs
?? app/simulator/dynamic-flex-longevity-contract.js
?? app/simulator/dynamic-flex-longevity-horizon.js
?? app/simulator/dynamic-flex-runner-horizon.js
?? docs/internal/SLICE_LONGEVITY_01_CONTRACT.md
?? docs/internal/SLICE_LONGEVITY_02_HORIZON_MODULE.md
?? docs/internal/SLICE_LONGEVITY_03_ENGINE_RUNNER.md
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
?? tests/longevity-contract.test.mjs
?? tests/longevity-engine-runner.test.mjs
?? tests/longevity-horizon.test.mjs
```

Hinweis: Die Slice-01/02/03-Aenderungen sind noch uncommitted und werden nicht zurueckgesetzt. Die `node_modules`-Aenderungen bestanden vor Slice-Beginn und liegen ausserhalb dieses Slice-Scopes.

## Diff-Risiko

Geplante Dateien:

- `Balance.html`
- `Simulator.html`
- `app/simulator/simulator-main-dynamic-flex.js`
- `app/simulator/simulator-input-strategy.js`
- `app/simulator/simulator-profile-inputs.js`
- `app/balance/balance-reader.js`
- `app/balance/balance-binder-diagnosis.js`
- `tests/longevity-ui-persistence.test.mjs`
- `tests/balance-diagnosis-copy-contract.test.mjs`
- `docs/internal/SLICE_LONGEVITY_04_UI_PERSISTENCE.md`
- `docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md`

Voraussichtliche Aenderungstiefe:

- mittel; UI-, Persistenz- und Diagnose-Contracts werden erweitert, Engine-Semantik bleibt unveraendert.

Gefaehrdete bestehende Tests:

- `balance-diagnosis-copy-contract.test.mjs`
- `simulator-profile-inputs.test.mjs`
- `simulator-ui-orchestration.test.mjs`
- `balance-reader.test.mjs`
- `longevity-engine-runner.test.mjs`

Nicht anfassen:

- `engine.js`, `dist/`, `RuheStandSuite.exe`
- Auto-Optimize-/Sweep-Parameterlisten fuer Variationsparameter
- bestehende `node_modules`-Aenderungen

Rollback-Strategie:

- Neue Slice-04-Datei und neue Tests gezielt entfernen.
- Geaenderte Runtime-/HTML-/Doku-Dateien gezielt mit `git checkout -- <datei>` zuruecksetzen, falls freigegeben/noetig.

## Geplante Tests

- `node tests/run-single.mjs tests/longevity-ui-persistence.test.mjs`
- `node tests/run-single.mjs tests/balance-diagnosis-copy-contract.test.mjs`
- `node tests/run-single.mjs tests/longevity-engine-runner.test.mjs`
- `node tests/run-single.mjs tests/simulator-profile-inputs.test.mjs`
- `npm run build:engine`
- `npm test`

## Durchgefuehrte Aenderungen

- `Balance.html` und `Simulator.html` um Longevity-Felder im Dynamic-Flex-Detailbereich erweitert:
  - `longevityMode`
  - `longevityQuantileShift`
  - `longevityRelativePct`
  - `longevityBufferYears`
- `app/simulator/simulator-main-dynamic-flex.js` erweitert:
  - Dynamic-Flex-Presets setzen Longevity explizit auf `none`.
  - aktive Longevity-Parameter schalten Preset-Auswahl auf `custom`.
  - Detailfelder werden modusabhaengig aktiviert/deaktiviert.
  - lokale `sim_`-Persistenz schreibt die neuen Felder.
- `app/simulator/simulator-main-input-persist.js` erweitert, damit gespeicherte `sim_`-Longevity-Keys beim Start geladen werden.
- `app/simulator/simulator-input-strategy.js` liest Longevity-Felder aus der Simulator-UI.
  - Ungueltige numerische Werte werden bewusst nicht still geklemmt, sondern erreichen die Engine-Validierung.
- `app/balance/balance-reader.js` liest Longevity-Felder aus Balance.
- `app/simulator/simulator-profile-inputs.js` liest Longevity-Felder aus gespeicherten Profilen.
  - Im Profilverbund bleibt das Hauptprofil fuehrend.
  - Unterschiedliche Longevity-Einstellungen erzeugen eine Warnung.
- `app/balance/balance-binder-diagnosis.js` erweitert den Dynamic-Flex-Copytext um:
  - Raw-Horizon und effektiven Horizon
  - Longevity-Modus
  - angewandten Quantil-Shift, relativen Puffer und Jahrespuffer
  - Clamp-Grund
  - Raw-/Effektivquantil
  - Joint-to-Single-Smoothing
  - Warnsignal fuer wirkungslosen Quantil-Shift.
- Neuer Test `tests/longevity-ui-persistence.test.mjs` angelegt.
- `tests/balance-diagnosis-copy-contract.test.mjs` um Longevity-Diagnosezeilen erweitert.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/longevity-ui-persistence.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 18 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/balance-diagnosis-copy-contract.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 22 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/simulator-input-readers.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 35 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/simulator-dynamic-flex-persistence.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 10 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/simulator-multiprofile-aggregation.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 30 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/longevity-engine-runner.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 23 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/balance-reader.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 43 bestanden, 0 fehlgeschlagen
- `npm run build:engine`
  - Ergebnis: bestanden
  - Hinweis: Fallback-Build ohne `esbuild` erstellt.
- `npm test`
  - Ergebnis: bestanden
  - Testdateien: 96
  - Assertions: 2783 bestanden, 0 fehlgeschlagen
  - Failed Files: 0
  - Open Handles: 0

## Abweichungen vom Plan

- `app/simulator/simulator-main-input-persist.js` wurde zusaetzlich zum urspruenglichen Diff-Risiko ergaenzt, weil der Simulator gespeicherte `sim_`-Keys dort beim Start laedt.
- `engine.js` wurde durch `npm run build:engine` nicht als Git-Aenderung ausgewiesen.

## Offene Risiken

- UI-Feldnamen muessen in Balance- und Simulator-Persistenz identisch bleiben; Abweichungen wuerden stille Fallbacks auf `none` erzeugen.
- Nutzer koennen `quantile_shift` aktivieren, ohne Effekt zu sehen, wenn das Basisquantil bereits am Cap liegt. Der Copytext muss das als Clamp ausweisen.
- Die Copytext-Diagnose ist Balance-seitig umgesetzt. Eine separate visuelle Simulator-Logspalte fuer Longevity wurde nicht eingefuehrt, weil die MC-/Backtest-Logs bereits den `vpw`-Payload enthalten und Slice 3 dessen Paritaet abdeckt.

## Rueckdokumentation

- `docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md` wurde um den Slice-04-Status ergaenzt.

## Freigabestatus

Freigegeben.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| F-01 | Gemini | Preset-Wechsel setzt die Longevity-Steuerung korrekt auf `'none'` zurueck und sperrt die Detaileingaben, was unerwartete Mischkonfigurationen verhindert. | Akzeptiert. Stellt ein intuitives UI-Verhalten sicher. | erledigt (in simulator-main-dynamic-flex.js) |
| F-02 | Gemini | Profilverbund-Warnung bei unterschiedlichen Langlebigkeits-Werten stellt sicher, dass der Anwender ueber inkonsistente Einstellungen informiert wird. | Akzeptiert. Schützt vor unbemerkten Unterschieden im Profilverbund. | erledigt (in simulator-profile-inputs.js) |

