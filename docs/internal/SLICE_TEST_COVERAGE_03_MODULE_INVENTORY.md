# Slice Test Coverage 03: Module Inventory

**Stand:** 2026-06-12  
**Status:** durch Codex umgesetzt, Review ausstehend  
**Feature-Branch:** `codex/test-coverage-expansion`  
**GitHub-Status:** Branch nur lokal angelegt; GitHub-Veroeffentlichung ausstehend  
**Uebergeordneter Plan:** `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`

## Ziel

Slice 3 erstellt ein reproduzierbares Inventar fuer alle Quellmodule aus `app/`, `engine/`, `workers/` und `types/`. Das Inventar verbindet:

- statische direkte Testimporte,
- transitive statische Imports innerhalb der Quellmodule,
- Runtime-Coverage aus `.coverage/summary.json`,
- Modulklassen und explizite Coverage-Status.

Das Inventar ersetzt die Coverage-Messung nicht, sondern macht sichtbar, welche Dateien nicht geladen, nur statisch erreichbar oder zur Laufzeit geladen sind.

## Akzeptanzkriterien

- Inventar listet alle Dateien aus `app/`, `engine/`, `workers/` und `types/`.
- Jede Datei hat eine Klasse und einen Coverage-Status.
- Nicht geladene Dateien werden explizit ausgewiesen.
- Dynamisch geladene Dateien wie `app/balance/balance-main.js` werden nicht faelschlich als ungeladen ausgegeben, wenn Runtime-Coverage sie erfasst.
- Bewusst ausgeschlossene Dateien haben eine Begruendung.

## Scope

Geplante Dateien:

- `tests/coverage-inventory.mjs`
- `tests/coverage-inventory.test.mjs`
- `docs/internal/SLICE_TEST_COVERAGE_03_MODULE_INVENTORY.md`
- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`

## Nicht-Scope

- Keine fachlichen App-/Engine-Aenderungen.
- Keine Browser-Smoke-Gates; diese folgen in Slice 4.
- Keine Coverage-Schwellen.
- Keine Aenderung an `engine.js`, `dist/`, `RuheStandSuite.exe` oder Tauri-Release-Artefakten.

## Branch- und Statuscheck vor Start

Ausgefuehrt vor Code-Aenderungen:

```powershell
git branch --show-current
```

Ergebnis:

```text
codex/test-coverage-expansion
```

Ausgefuehrt vor Code-Aenderungen:

```powershell
git status --short
```

Ergebnis:

```text
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
```

Hinweis: Der Arbeitsbaum war abgesehen von der bekannten Git-Warnung sauber.

## Diff-Risiko-Block

Geplante Dateien:

- `tests/coverage-inventory.mjs`
- `tests/coverage-inventory.test.mjs`
- `docs/internal/SLICE_TEST_COVERAGE_03_MODULE_INVENTORY.md`
- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`

Voraussichtliche Aenderungstiefe:

- mittel

Gefaehrdete bestehende Tests:

- `node tests\run-single.mjs tests\coverage-inventory.test.mjs`
- `npm test`
- `npm run test:coverage`

Nicht anfassen:

- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- fachliche Engine-/Simulator-/Balance-Logik
- `src-tauri/`

Rollback-Strategie:

```powershell
git checkout -- docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md
```

Neue Dateien bei Bedarf nur nach Rueckfrage entfernen:

- `tests/coverage-inventory.mjs`
- `tests/coverage-inventory.test.mjs`
- `docs/internal/SLICE_TEST_COVERAGE_03_MODULE_INVENTORY.md`

## Geplante Tests

```powershell
node tests\run-single.mjs tests\coverage-inventory.test.mjs
npm test
```

Zusaetzlich zur Erzeugung eines aktuellen Inventars:

```powershell
npm run test:coverage
node tests\coverage-inventory.mjs
```

## Durchgefuehrte Aenderungen

- `tests/coverage-inventory.mjs`
  - Neues Inventar-Script fuer alle `*.js`, `*.mjs` und `*.cjs` unter `app/`, `engine/`, `workers/` und `types/`.
  - Ermittelt direkte Testimporte aus `tests/*.test.mjs`.
  - Ermittelt transitive statische Source-Imports.
  - Ergaenzt Runtime-Coverage aus `.coverage/summary.json`.
  - Schreibt `.coverage/inventory.json`.
  - Klassifiziert Module als `critical-core`, `deterministic-app`, `ui-entry`, `worker-entry` oder `live-io`.
  - Klassifiziert `simulator-main.js` und alle `simulator-main-*`-Module als `ui-entry`, damit DOM-nahe Simulator-Orchestrierung spaeteren Isolation-Gates zugeordnet wird.
  - Markiert nicht statisch aufloesbare dynamische Imports separat in `unresolvedDynamicImports`.
- `tests/coverage-inventory.test.mjs`
  - Contract-Test fuer Source-Inventar ueber alle vier Roots.
  - Prueft direkte, transitive und nicht geladene Module.
  - Prueft Runtime-Status fuer covered, uncovered und zero-executable Dateien.
  - Prueft Modulklassen fuer Steuer-/Persistenz-, UI-, Worker- und Live-IO-Dateien.
  - Prueft explizit, dass Compound-Dateien wie `app/simulator/simulator-main-init.js` als `ui-entry` klassifiziert werden.
  - Prueft dynamische Importmuster inklusive Literal-, Template- und nicht aufloesbarer Identifier-Imports.

## Inventar-Ergebnis

Aktueller Lauf nach `npm run test:coverage` und `node tests\coverage-inventory.mjs`:

```text
Files: 183
Test files: 82
```

Klassen:

```text
critical-core: 47
deterministic-app: 92
live-io: 3
ui-entry: 38
worker-entry: 3
```

Coverage-Status:

```text
runtime-covered: 147
runtime-loaded-uncovered: 8
runtime-loaded-zero-executable: 4
not-loaded: 24
```

`app/balance/balance-main.js` ist im Inventar `runtime-covered` mit 167/202 Zeilen und 82.67 Prozent Coverage. Damit wird der dynamische Smoke-Import nicht als ungeladen fehlklassifiziert.

Die 24 nicht geladenen Dateien werden in `.coverage/inventory.json` explizit mit Klasse und Status ausgewiesen. Beispiele:

```text
app/profile/profile-bridge.js [critical-core]
app/profile/profile-manager.js [critical-core]
app/simulator/simulator-main-init.js [ui-entry]
app/simulator/simulator-main-reset.js [ui-entry]
app/simulator/simulator-main.js [ui-entry]
app/tranches/tranchen-manager-page.js [ui-entry]
app/tranches/tranchen-price-service.js [live-io]
types/profile-types.js [critical-core]
workers/mc-worker.js [worker-entry]
```

Bewusst ausgeschlossene Dateien:

- keine innerhalb des Slice-Scopes; alle Dateien aus `app/`, `engine/`, `workers/` und `types/` sind enthalten.
- Generierte und Release-Artefakte wie `engine.js`, `dist/` und `RuheStandSuite.exe` liegen ausserhalb der vereinbarten Source-Roots.

## Ausgefuehrte Tests

```powershell
node tests\run-single.mjs tests\coverage-inventory.test.mjs
```

Ergebnis:

```text
Total Assertions: 24
Passed: 24
Failed Assertions: 0
Failed Files: 0
```

```powershell
npm test
```

Ergebnis:

```text
Found 82 test files.
Total Assertions: 2205
Passed: 2205
Failed Assertions: 0
Failed Files: 0
Failed: 0
Open Handles: 0
```

```powershell
npm run test:coverage
```

Ergebnis:

```text
Found 82 test files.
Total Assertions: 2205
Passed: 2205
Failed Assertions: 0
Failed Files: 0
Failed: 0
Open Handles: 0

Coverage summary (approx. line coverage from V8 ranges)
Total: 72.89% (19183/26316)
Files: 159
```

```powershell
node tests\coverage-inventory.mjs
```

Ergebnis:

```text
Files: 183
Test files: 82
runtime-covered: 147
not-loaded: 24
runtime-loaded-uncovered: 8
runtime-loaded-zero-executable: 4
Wrote .coverage\inventory.json
```

Hinweis: Die Testlaeufe geben weiterhin bekannte nicht-blockierende Laufzeitwarnungen aus (`--localstorage-file`, CAPE-Fallback-/Validierungslogs). Exit-Code und Testsummary waren gruen.

## Abweichungen vom Plan

- Das Inventar wird als `.coverage/inventory.json` erzeugt, nicht als dauerhaft versioniertes JSON unter `docs/internal/`.
- Dynamische Imports wie `await import(moduleUrl)` werden nicht statisch aufgeloest, sondern als `unresolvedDynamicImports` dokumentiert. Runtime-Coverage verhindert trotzdem falsche `not-loaded`-Einstufung.

## Offene Risiken

- Die statische Importanalyse ist bewusst einfach und kein vollstaendiger JavaScript-Parser.
- Dynamische Runtime-Pfade bleiben nur ueber Coverage sicher sichtbar.
- Klassifikationen sind heuristisch und muessen bei spaeteren Grenzfaellen eventuell nachgeschaerft werden.

## Rueckdokumentation in den Arbeitsplan

- Slice 3 im uebergeordneten Plan als durch Codex umgesetzt, Review abgeschlossen.
- Inventar-Baseline dokumentiert: 183 Source-Dateien, 82 Testdateien, 24 nicht geladene Dateien.

### Freigabestatus

Freigegeben. Review durch Gemini (Antigravity) durchgeführt und bestanden. Blocker C-S3-02 wurde erfolgreich behoben.

## Review-Feedback von Gemini

### 1. Prüfdimensionen

*   **Korrektheit vs. Akzeptanzkriterien:**
    *   *Dateien aus allen vier Roots:* Bestanden. Das Inventar erfasst alle 183 Quelldateien aus `app/`, `engine/`, `workers/` und `types/`.
    *   *Modulklassen und Status:* Bestanden. Blocker C-S3-02 wurde behoben: Alle `simulator-main-*.js` Module werden nun korrekt als `ui-entry` klassifiziert.
    *   *Fehlklassifizierung dynamischer Imports:* Bestanden. Durch das Einlesen der `summary.json` werden dynamisch geladene Dateien wie `app/balance/balance-main.js` korrekt als `runtime-covered` klassifiziert und nicht als `not-loaded` fehlinterpretiert.
    *   *Dokumentation nicht-geladener Dateien:* Bestanden. Die 24 ungeladenen Dateien werden explizit mit Klasse und Status ausgewiesen.
*   **Vertragstreue:**
    *   Geprüft. Die Generierung erzeugt `.coverage/inventory.json` im vereinbarten Format.
*   **Fehlerbehandlung:**
    *   Bestanden. Das Fehlen der Coverage-Summary wird abgefangen (Fallback auf statische Imports). Fehlerhafte JSON-Dateien führen zu kontrollierten CLI-Fehlern.
*   **Seiteneffekte:**
    *   Geprüft. Keine Modifikationen an Anwendungsdateien. Das Skript greift rein lesend auf die Source-Verzeichnisse und Testdateien zu.
*   **Was könnte brechen?**
    *   Wenn in Zukunft ein neues UI-bezogenes Modul im Verzeichnis `app/simulator/` angelegt wird, das DOM-Operationen ausführt, aber weder `-ui` noch `-renderer`, `-dom`, `-tabs` oder `-main` im Dateinamen trägt, wird es fälschlicherweise als `deterministic-app` klassifiziert. In Folge läuft es ohne Isolation im geteilten Prozess, was den globalen Zustand verschmutzen und Flaky-Tests auslösen kann.

### 2. Findings

*   **[BEHOBEN] C-S3-02: Fehlklassifikation von `simulator-main-*` Modulen**
    *   *Beschreibung:* Die Klassifikationsregel `file.endsWith('-main.js')` erfasste zuvor nur `simulator-main.js`. Die Compound-Dateien wie `simulator-main-init.js` etc. wurden als `deterministic-app` falsch klassifiziert.
    *   *Lösung:* Codex hat die Regel um `file.includes('/simulator-main')` erweitert, wodurch alle Compound-Dateien korrekt als `ui-entry` erkannt werden. Der Test-Contract sichert dies nun ab.
*   **[HINWEIS] G-01: Heuristische Modulklassifizierung**
    *   *Beschreibung:* Die Modulzuordnung im Skript erfolgt anhand einfacher String-Matches auf den Dateipfad (z. B. `file.includes('tax')` für `critical-core`).
    *   *Auswirkung:* Sollten zukünftig neue Dateien hinzugefügt werden, die diese Schlüsselwörter im Namen tragen, aber eine andere Rolle einnehmen (z. B. ein UI-Element `app/simulator/tax-panel-ui.js`), könnte es zu einer Fehlklassifizierung kommen (in diesem Fall als `critical-core` statt `ui-entry`).
    *   *Empfehlung:* In einem späteren Refactoring (z. B. in Slice 11) könnte die Klassifizierung robuster über Verzeichnishierarchien oder Metadaten gelöst werden. Aktuell als heuristischer Ansatz vollkommen ausreichend.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
> Ein Entwickler fügt ein neues Modul `app/simulator/simulator-config-helper.js` hinzu, welches DOM-Operationen (z. B. Formular-Auslesen) ausführt, aber keine der UI-Schlüsselwörter im Dateinamen trägt. Da es im Pfad weder `/simulator-main` noch `-ui` enthält, wird es als `deterministic-app` klassifiziert. Der zugehörige Test wird ohne Isolation im geteilten Prozess gestartet und hinterlässt ein verschmutztes globales `document`-Objekt, was nachfolgende, unabhängige Tests fehlschlagen lässt.

### 4. Review-Ergebnis

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** G-01

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| C-S3-02 | Claude | Fehlklassifikation von `simulator-main-*` Modulen | angenommen | erledigt (durch Codex behoben; `file.includes('/simulator-main')` und Contract-Test für `simulator-main-init.js`) |
| G-01 | Gemini | Heuristische Modulklassifizierung kann bei ungünstiger Benennung fehlschlagen | angenommen (Hinweis) | steht aus (Verschoben auf Slice 11) |

## Review-Feedback von Claude

### 1. Pruefdimensionen

#### Korrektheit vs. Akzeptanzkriterien

- **C-S3-02 (BLOCKER):** `classifyModule()` klassifizierte nur Dateien mit `file.endsWith('-main.js')` als `ui-entry`. Dadurch wurde `app/simulator/simulator-main.js` korrekt erfasst, Compound-Dateien wie `app/simulator/simulator-main-init.js`, `app/simulator/simulator-main-reset.js` und `app/simulator/simulator-main-profiles.js` aber als `deterministic-app` eingestuft.

#### Vertragstreue

- Diese Fehlklassifikation widerspricht der Rolle dieser Dateien im Arbeitsplan: Die `simulator-main-*`-Module sind UI-Orchestrierungs-/Entrypoint-nahe Risikomodule und Grundlage fuer spaetere Isolation-Entscheidungen.

#### Fehlerbehandlung

- Kein IO- oder Runtime-Fehlerpfad betroffen. Das Problem liegt in der deterministischen Klassifikationslogik.

#### Seiteneffekte

- Falsch klassifizierte `simulator-main-*`-Dateien koennten in spaeteren Slices als DOM-freie App-Logik behandelt und dadurch nicht in isolierte Runner- oder Playwright-Pfade einbezogen werden.

#### Was koennte brechen?

- Das Pre-Mortem-Szenario des Plans: DOM-nahe UI-Orchestrierung laeuft versehentlich im gemeinsamen Prozess, verschmutzt globalen Zustand und erzeugt reihenfolgeabhaengige Tests.

### 2. Findings

| ID | Schwere | Finding |
|---|---|---|
| C-S3-02 | BLOCKER | `simulator-main-*`-Module werden durch `file.endsWith('-main.js')` nicht als `ui-entry` erkannt und faelschlich als `deterministic-app` klassifiziert. |

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb - was ist die wahrscheinlichste Ursache?

> Ein spaeterer UI-Orchestrierungstest fuer `simulator-main-reset.js` wird auf Basis des Inventars als DOM-freie App-Logik behandelt. Der Test laeuft im gemeinsamen Prozess, setzt globale DOM-Mocks und beeinflusst nachfolgende Tests. Die Suite bleibt lokal scheinbar gruen, aber die Reihenfolgeabhaengigkeit verdeckt einen echten UI-Fehler.

### 4. Review-Ergebnis

- **Status:** blockiert
- **Blocker:** C-S3-02
- **Restrisiken:** Heuristische Klassifikation bleibt grundsaetzlich pflegebeduerftig.

## Review-Antworten auf Claude-Feedback

### Antwort auf C-S3-02

Angenommen und umgesetzt.

Korrektur:

- `classifyModule()` klassifiziert jetzt alle Pfade mit `/simulator-main` als `ui-entry`.
- Damit werden `app/simulator/simulator-main.js` und Compound-Dateien wie `app/simulator/simulator-main-init.js`, `simulator-main-reset.js`, `simulator-main-profiles.js` und weitere `simulator-main-*`-Module derselben UI-Orchestrierungs-Risikoklasse zugeordnet.
- `tests/coverage-inventory.test.mjs` enthaelt einen Regressionstest fuer `app/simulator/simulator-main-init.js`.

Validierung:

```powershell
node tests\run-single.mjs tests\coverage-inventory.test.mjs
```

Ergebnis:

```text
Total Assertions: 24
Passed: 24
Failed Assertions: 0
Failed Files: 0
```

Neues Inventar-Ergebnis:

```text
critical-core: 47
deterministic-app: 92
live-io: 3
ui-entry: 38
worker-entry: 3
```
