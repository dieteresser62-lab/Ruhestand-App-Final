# Slice Test Coverage 01: Runner-Hygiene und Isolation

**Stand:** 2026-06-11  
**Status:** umgesetzt durch Codex, Review ausstehend  
**Feature-Branch:** `codex/test-coverage-expansion`  
**GitHub-Status:** Branch nur lokal angelegt; GitHub-Veroeffentlichung ausstehend  
**Uebergeordneter Plan:** `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`

## Ziel

Der bestehende Test-Runner wird vor weiteren Testausbauten reproduzierbarer und diagnostisch belastbarer.

Kernpunkte:

- deterministische Testdatei-Reihenfolge,
- keine doppelte Fehlerzaehlung bei Assertion-Fehlern,
- unterscheidbare Fehlerarten fuer Assertion-, Import-/Setup- und offene Handle-Probleme,
- ein definierter isolierter Ausfuehrungspfad fuer DOM-/Browser-global-nahe Tests,
- klare Entscheidung zum bisherigen `QUICK_TESTS`-Modus.

## Akzeptanzkriterien

- Testdateien werden deterministisch sortiert.
- Ein fehlgeschlagener Assertion-Fehler wird nicht doppelt als Assertion- und Dateifehler gezaehlt.
- Der Runner unterscheidet Assertion-Fehler, Import-/Setup-Fehler und offene Handles in der Ausgabe.
- Fuer DOM-/Browser-global-nahe Tests existiert ein isolierter Ausfuehrungspfad in separaten Node-Prozessen oder ein gleichwertiger Teardown-Contract mit automatischer Kontrolle.
- Neue UI-Orchestrierungstests aus spaeteren Slices duerfen nur ueber diesen isolierten Pfad oder ueber Playwright laufen.
- `QUICK_TESTS` wird entweder durch eine dokumentierte, fachlich sinnvolle schnelle Auswahl ersetzt oder als deprecated markiert.

## Scope

Geplante Dateien:

- `tests/run-tests.mjs`
- `tests/run-single.mjs`
- `tests/runner-contract.test.mjs`
- `docs/internal/SLICE_TEST_COVERAGE_01_RUNNER_ISOLATION.md`
- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`

## Nicht-Scope

- Keine Playwright-Einfuehrung.
- Keine Coverage-Reparatur.
- Keine fachliche Engine- oder UI-Semantikaenderung.
- Keine Aenderung an `engine.js`, `dist/` oder Release-Artefakten.

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
?? docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
```

Hinweis: Der uebergeordnete Plan ist untracked, weil er in der Planungsphase vor Branch-Anlage erstellt wurde.

## Diff-Risiko-Block

Geplante Dateien:

- `tests/run-tests.mjs`
- `tests/run-single.mjs`
- `tests/runner-contract.test.mjs`
- `docs/internal/SLICE_TEST_COVERAGE_01_RUNNER_ISOLATION.md`
- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`

Voraussichtliche Änderungstiefe:

- mittel

Gefährdete bestehende Tests:

- gesamte Testsuite, weil `tests/run-tests.mjs` und Assertion-Shims zentral sind
- gezielte Single-Test-Ausfuehrung, weil `tests/run-single.mjs` betroffen ist

Nicht anfassen:

- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- fachliche Engine-/Simulator-/Balance-Logik
- `src-tauri/`

Rollback-Strategie:

```powershell
git checkout -- tests/run-tests.mjs tests/run-single.mjs docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md
```

Neue Dateien bei Bedarf nur nach Rueckfrage entfernen:

- `tests/runner-contract.test.mjs`
- `docs/internal/SLICE_TEST_COVERAGE_01_RUNNER_ISOLATION.md`

## Geplante Tests

```powershell
node tests\run-single.mjs tests\runner-contract.test.mjs
npm test
```

## Durchgefuehrte Aenderungen

- `tests/run-tests.mjs`
  - Assertion-Shims in eine wiederverwendbare `createAssertionContext()`-/`installAssertionGlobals()`-Struktur ueberfuehrt.
  - `TestAssertionError` eingefuehrt, damit Assertion-Fehler von Import-/Setup-Fehlern unterscheidbar sind.
  - Testdateien werden deterministisch sortiert.
  - Assertion-Fehler erhoehen nicht mehr zusaetzlich die Dateifehlerzahl.
  - Summary unterscheidet `Failed Assertions`, `Failed Files`, Gesamtfehler und offene Handles.
  - Optionaler isolierter Ausfuehrungspfad via `--isolated` oder `TEST_ISOLATED=1` ergaenzt; pro Testdatei wird `run-single.mjs` in einem eigenen Node-Prozess gestartet.
  - `TESTS_DIR` fuer Runner-Contract-Tests ergaenzt.
  - `QUICK_TESTS=1` als deprecated markiert und mit Warnung versehen.
- `tests/run-single.mjs`
  - nutzt dieselben Assertion-Shims wie der Gesamtrunner.
  - gibt eine eigene Single-Test-Summary mit Assertion- und Dateifehlern aus.
- `tests/runner-contract.test.mjs`
  - prueft deterministische Sortierung.
  - prueft einfache Assertion-Fehler ohne doppelte Dateifehlerzaehlung.
  - prueft Setup-/Import-Fehler als Dateifehler.
  - prueft isolierten Runner-Modus.
  - prueft `run-single.mjs` mit gemeinsamem Assertion-Kontext.
  - prueft Deprecation-Warnung fuer `QUICK_TESTS`.

## Ausgefuehrte Tests

```powershell
node tests\run-single.mjs tests\runner-contract.test.mjs
```

Ergebnis:

```text
Total Assertions: 23
Passed: 23
Failed Assertions: 0
Failed Files: 0
```

```powershell
npm test
```

Ergebnis:

```text
Found 80 test files.
Total Assertions: 2163
Passed: 2163
Failed Assertions: 0
Failed Files: 0
Failed: 0
Open Handles: 0
```

## Abweichungen vom Plan

- Kein separates `tests/run-isolated.mjs` angelegt. Der isolierte Pfad ist direkt in `tests/run-tests.mjs` ueber `--isolated` bzw. `TEST_ISOLATED=1` implementiert.
- `tests/README.md` wurde in diesem Slice nicht aktualisiert, um die Stop-Regel von maximal 5 geaenderten Dateien einzuhalten. Die Doku-Aktualisierung bleibt fuer den finalen Dokumentations-Slice vorgesehen.

## Offene Risiken

- Isolierte Ausfuehrung kann langsamer sein als der bisherige gemeinsame Prozess.
- Der isolierte Modus aggregiert noch keine Assertion-Zahlen ueber alle Unterprozesse; er liefert Dateifehler und Einzel-Summaries je `run-single`-Lauf. Fuer spaetere UI-Slices ist das ausreichend, aber fuer laengere isolierte Teil-Suites koennte eine maschinenlesbare Aggregation sinnvoll werden.
- `QUICK_TESTS=1` ist nur deprecated, nicht entfernt. Ein besserer Entwickler-Subset bleibt Aufgabe spaeterer Slices.

## Rueckdokumentation in den Arbeitsplan

- Slice 1 im uebergeordneten Plan als umgesetzt, Review ausstehend dokumentieren.

## Freigabestatus

Freigegeben. Umsetzung durch Codex abgeschlossen; Review durch Gemini (Antigravity) durchgeführt und bestanden. Blocker G-01 wurde erfolgreich behoben.

## Review-Feedback von Gemini

### 1. Prüfdimensionen

*   **Korrektheit vs. Akzeptanzkriterien:**
    *   *Deterministische Sortierung:* Bestanden. Die Dateiliste wird via `localeCompare('en')` sortiert, was eine plattformübergreifend einheitliche Ausführungsreihenfolge garantiert.
    *   *Doppelte Fehlerzählung:* Bestanden. Durch die Einführung des dedizierten `TestAssertionError` und das gezielte Auslassen von Assertion-Fehlern bei der `failedFiles`-Zählung in `runInProcess` wird eine doppelte Fehlerzählung verhindert.
    *   *Fehlerunterscheidung:* Bestanden. Der Runner differenziert in der Auswertung korrekt zwischen Assertions, Dateifehlern und offenen Handles.
    *   *Prozess-Isolation:* Bestanden. Der `--isolated`-Modus führt jede Testdatei in einem separaten `run-single.mjs`-Prozess aus. Die gesamte Testsuite läuft im isolierten Modus fehlerfrei durch (Dauer ~19s unter Windows).
    *   *QUICK_TESTS:* Bestanden. Eine Deprecation-Warnung wurde hinzugefügt, und der Modus bleibt rückwärtskompatibel.
*   **Vertragstreue:**
    *   Geprüft. Die Signatur der globalen Hilfsfunktionen `assert`, `assertEqual` und `assertClose` wurde beibehalten. Bestehende Tests laufen ohne Modifikationen.
*   **Fehlerbehandlung:**
    *   *Bestanden.* Blocker G-01 wurde behoben: Der Stack-Trace für `TestAssertionError` wird nun im `catch`-Block von `run-single.mjs` via `console.error(error.stack || error)` korrekt ausgegeben.
*   **Seiteneffekte:**
    *   Geprüft. Keine Modifikationen an Kern-Engine- oder UI-Dateien. Änderungen beschränken sich rein auf den Test-Harness (`tests/`).
*   **Was könnte brechen?**
    *   Wenn Entwickler in Zukunft Tests schreiben, die im geteilten Prozess globale Variablen (z. B. auf `globalThis`) manipulieren und diese nicht im `afterEach` oder Teardown zurücksetzen, betrifft dies weiterhin alle Tests, die im geteilten Modus (Standard) ausgeführt werden. Dies wird erst in späteren Slices durch die Playwright-Integration bzw. die erzwungene Isolation für DOM-nahe Tests behoben.

### 2. Findings

*   **[BEHOBEN] G-01: Unterdrückung des Stack-Traces bei Assertion-Fehlern in `run-single.mjs`**
    *   *Beschreibung:* Im `catch`-Block von `run-single.mjs` wurde `console.error(error)` nur aufgerufen, wenn `!isAssertionFailure` galt. Dadurch wurde bei jedem Assertion-Fehler der Stack-Trace unterdrückt.
    *   *Lösung:* Codex hat die Unterdrückung aufgehoben und gibt nun den Stack-Trace aus. Dies wurde im Contract-Test abgesichert.
*   **[HINWEIS] G-02: Aggregation der Assertions im isolierten Modus**
    *   *Beschreibung:* Im `--isolated`-Modus ist das Zusammenzählen der einzelnen Assertions über die Prozesse hinweg nicht implementiert. Die Summary zeigt `unavailable in isolated mode`.
    *   *Auswirkung:* Die Gesamtanzahl der ausgeführten Assertions geht im isolierten Lauf verloren.
    *   *Empfehlung:* In einem späteren Slice (z. B. Slice 11) könnte über eine temporäre JSON-Datei oder IPC eine Aggregation der Zahlen implementiert werden. Aktuell als Restrisiko akzeptabel.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
> Ein Entwickler führt Änderungen an einem gemeinsamen Modul durch, die einen Test brechen. Aufgrund des Windows-Prozess-Overheads läuft die CI/CD-Pipeline im geteilten Prozess-Modus (in-process). Wenn ein Test dort globale Variablen (z. B. auf `globalThis`) dauerhaft überschreibt, korrumpiert dies nachfolgende Tests im selben Lauf. Da die Prozess-Isolation nur selektiv/optional ist, wird dieser Seiteneffekt lokal nicht sofort bemerkt.

### 4. Review-Ergebnis

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** G-02

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-01 | Gemini | Unterdrückung des Stack-Traces bei Assertion-Fehlern in `run-single.mjs` | angenommen | erledigt (durch Codex behoben; `runner-contract.test.mjs` prüft Dateiname, Fehlertyp und Fehlerzählung) |
| G-02 | Gemini | Keine Aggregation der Assertions im isolierten Modus | angenommen (Hinweis) | verschoben auf späteren Slice |

## Review-Antworten von Codex

### Antwort auf Gemini G-01

Angenommen und umgesetzt.

`run-single.mjs` hat den Stack-Trace fuer `TestAssertionError` bisher im `catch`-Block bewusst nicht ausgegeben. Das war fuer die Diagnose im Einzel- und isolierten Lauf zu schwach. Der `catch`-Block gibt jetzt immer `error.stack || error` aus.

Absicherung:

- `tests/runner-contract.test.mjs` erzeugt eine temporaere fehlschlagende Testdatei.
- Der Test prueft, dass `run-single.mjs` mit Exit-Code 1 endet.
- Der Test prueft, dass Ausgabe und Stack den Fehlertyp `TestAssertionError` und den Dateinamen `single-fail.test.mjs` enthalten.
- Der Test prueft weiter, dass der Assertion-Fehler als `Failed Assertions: 1` und nicht als `Failed Files: 1` gezaehlt wird.

### Antwort auf Gemini G-02

Als Restrisiko akzeptiert und nicht in diesem Slice umgesetzt. Die fehlende Assertion-Aggregation im isolierten Gesamtlauf ist im Slice bereits dokumentiert. Fuer die aktuellen Akzeptanzkriterien ist entscheidend, dass isolierte Kindprozess-Fehler korrekt als Dateifehler in den Hauptprozess zuruecklaufen. Eine maschinenlesbare Assertion-Aggregation kann spaeter ergaenzt werden.
