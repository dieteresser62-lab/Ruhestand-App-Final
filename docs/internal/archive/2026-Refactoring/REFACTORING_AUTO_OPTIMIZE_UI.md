# Refactoring: Auto-Optimize UI trennen

Status: `[x]` umgesetzt

Backlog-Referenz: `docs/internal/REFACTORING_BACKLOG.md`, Punkt `4. Auto-Optimize UI trennen`

Startdatum: 2026-04-24

## Ziel

`app/simulator/auto_optimize_ui.js` soll von einem UI-Monolithen zu einer schlanken Fassade werden. Presets, Parameter-Metadaten, Config-Lesen, Ergebnis-Rendering und Apply-Logik werden getrennt. Der Optimizer-Kern `auto_optimize.js` bleibt unveraendert.

## Ausgangslage

`auto_optimize_ui.js` enthaelt vor dem Refactoring ca. 819 Zeilen und mischt:

- Preset-Definitionen
- DOM-Event-Wiring
- dynamische Parameter-UI
- Config-Parsing und Validierung
- Progress-Texte
- Ergebnis-HTML inklusive Inline-Styles
- Apply-Logik fuer Champion-Parameter

## Nicht-Ziele

- Keine Aenderung an `auto_optimize.js` oder der Optimizer-Fachlogik.
- Keine Aenderung am finalen Config-Shape fuer `runAutoOptimize()`.
- Keine Migration von UI-IDs.
- Keine visuelle Umgestaltung ausser unvermeidbarer Modultrennung.
- Keine Aenderung an `engine.js`, `dist/` oder Release-Artefakten.

## Schnittstellen-Regeln

- `initAutoOptimizeUI()` und `setAutoOptimizeDefaults()` bleiben als oeffentliche Exporte erhalten.
- `auto_optimize_ui.js` bleibt der Browser-Einstieg fuer `Simulator.html`.
- Presets und Parameter-Metadaten sind ohne DOM importierbar.
- Config-Parsing ist separat mit DOM-Mocks testbar.
- Renderer-Funktionen bekommen Daten plus DOM-Refs oder `document`, aber rufen den Optimizer nicht selbst auf.
- Apply-Logik kapselt das Mapping von Optimizer-Parametern auf Formular-IDs.

## Geplante Modulstruktur

- `app/simulator/auto_optimize_ui.js`
  - Fassade fuer Initialisierung, Event-Wiring, Run-Flow und Parameter-Management.
- `app/simulator/auto-optimize-presets.js`
  - Preset-Definitionen.
- `app/simulator/auto-optimize-param-meta.js`
  - Parameter-Optionen, Labels, Units, Dynamic-Flex-Keys und Form-ID-Mapping.
- `app/simulator/auto-optimize-config-ui.js`
  - Config aus DOM lesen und validieren.
- `app/simulator/auto-optimize-renderer.js`
  - Parameterblock-Markup, Progress-Texte, Ergebnis-HTML und Apply-Erfolgsmeldung.
- `app/simulator/auto-optimize-apply.js`
  - Champion-Config in Formularfelder uebernehmen.

## Umsetzungsschritte

### Step 1: Presets und Parameter-Metadaten auslagern

Soll:

- Preset-Definitionen DOM-frei aus `auto_optimize_ui.js` entfernen.
- Parameter-Labels, Units, Select-Optionen und Apply-Mapping zentralisieren.

Ist:

- Umgesetzt in:
  - `app/simulator/auto-optimize-presets.js`
  - `app/simulator/auto-optimize-param-meta.js`
- Presets sind DOM-frei importierbar.
- Parameter-Optionen, Labels, Units, Dynamic-Flex-Keys und Apply-Form-ID-Mapping sind zentralisiert.

### Step 2: Config-Reader extrahieren

Soll:

- Objective, Parameter, Runs/Seeds, Constraints und Dynamic-Flex-Validierung aus dem DOM lesen.
- Bestehende Fehlerbedingungen beibehalten.
- Direkte Tests mit DOM-Mocks ergaenzen.

Ist:

- Umgesetzt in `app/simulator/auto-optimize-config-ui.js`.
- Enthaltene Exporte:
  - `readAutoOptimizeConfigFromUI()`
  - `validateAutoOptimizeInputs()`
  - `setAutoOptimizeDefaultsInDOM()`
- Direkte Tests mit DOM-Mock wurden in `tests/auto-optimizer.test.mjs` ergaenzt.

### Step 3: Renderer extrahieren

Soll:

- Parameterblock-Markup, Progress-Status und Ergebnis-HTML auslagern.
- Sichtbare Informationen unveraendert lassen.

Ist:

- Umgesetzt in `app/simulator/auto-optimize-renderer.js`.
- Enthaltene Exporte:
  - `createAutoOptimizeParameterBlock()`
  - `formatAutoOptimizeProgress()`
  - `renderAutoOptimizeResult()`
  - `appendAutoOptimizeApplySuccess()`

### Step 4: Apply-Logik extrahieren

Soll:

- Mapping von Champion-Parametern auf Formularfelder auslagern.
- `goGoMultiplier` aktiviert weiter `goGoActive`.
- `updateStartPortfolioDisplay()` bleibt nach Apply erhalten.

Ist:

- Umgesetzt in `app/simulator/auto-optimize-apply.js`.
- `applyChampionToForm()` schreibt die bestehenden Formularfelder und aktiviert `goGoActive`, wenn `goGoMultiplier` uebernommen wird.

### Step 5: Fassade stabilisieren

Soll:

- `auto_optimize_ui.js` enthaelt hauptsaechlich Event-Wiring und Run-Orchestrierung.
- `initAutoOptimizeUI()` und `setAutoOptimizeDefaults()` bleiben kompatibel.

Ist:

- `auto_optimize_ui.js` wurde auf ca. 223 Zeilen reduziert.
- Die Datei orchestriert weiterhin:
  - `initAutoOptimizeUI()`
  - Preset-Anwendung
  - Add-/Remove-Parameter
  - Run-Flow mit `runAutoOptimize()`
  - Apply-Button-Flow
- `setAutoOptimizeDefaults()` bleibt als kompatibler Export erhalten.

### Step 6: Tests und Doku

Soll:

- `tests/auto-optimizer.test.mjs` um direkte Tests der neuen UI-Helfer erweitern.
- `node tests/run-single.mjs tests/auto-optimizer.test.mjs` ausfuehren.
- `npm test` ausfuehren.
- Backlog und Referenzdoku aktualisieren.

Ist:

- `tests/auto-optimizer.test.mjs` testet jetzt zusaetzlich:
  - Preset-Import
  - Dynamic-Flex-Preset-Modus
  - Config-Reader mit DOM-Mock
  - Dynamic-Flex-Validierung bei effektiv ausgeschaltetem Dynamic-Flex
  - Progress-Formatter
  - Apply-Mapping und Change-Events
- Aktualisiert:
  - `docs/internal/REFACTORING_BACKLOG.md`
  - `docs/internal/README.md`
  - `docs/reference/TECHNICAL.md`
  - `docs/reference/SIMULATOR_MODULES_README.md`

## Risiko-Checkliste

- [x] Config-Shape fuer `runAutoOptimize()` bleibt unveraendert.
- [x] Presets bleiben inhaltlich identisch.
- [x] Dynamic-Flex-Parameter pruefen weiter den effektiven Dynamic-Flex-Modus.
- [x] Apply-Mapping schreibt weiter dieselben Formularfelder.
- [x] Ergebnisanzeige enthaelt weiterhin Champion, Key Metrics, Delta und Stability.
- [x] Existing Optimizer Tests bleiben gruen.

## Abschlussdokumentation

- Abschlussdatum: 2026-04-24
- Commit: noch nicht erstellt
- Geaenderte Dateien:
  - `app/simulator/auto_optimize_ui.js`
  - `tests/auto-optimizer.test.mjs`
  - `docs/internal/REFACTORING_BACKLOG.md`
  - `docs/internal/README.md`
  - `docs/internal/REFACTORING_AUTO_OPTIMIZE_UI.md`
  - `docs/reference/TECHNICAL.md`
  - `docs/reference/SIMULATOR_MODULES_README.md`
- Neu angelegte Dateien:
  - `app/simulator/auto-optimize-presets.js`
  - `app/simulator/auto-optimize-param-meta.js`
  - `app/simulator/auto-optimize-config-ui.js`
  - `app/simulator/auto-optimize-renderer.js`
  - `app/simulator/auto-optimize-apply.js`
- Entfernte/verschobene Logik:
  - Presets aus `auto_optimize_ui.js` nach `auto-optimize-presets.js`.
  - Parameter-Metadaten und Apply-Mapping nach `auto-optimize-param-meta.js`.
  - Config-Parsing und Validierung nach `auto-optimize-config-ui.js`.
  - Parameterblock-, Progress-, Result- und Success-Rendering nach `auto-optimize-renderer.js`.
  - Champion-Apply-Logik nach `auto-optimize-apply.js`.
- Tests:
  - `node tests/run-single.mjs tests/auto-optimizer.test.mjs` erfolgreich
  - `npm test` erfolgreich, 69 Testdateien, 1186/1186 Assertions
- Offene Restpunkte:
  - Keine fuer diesen Refactoring-Step.
