# Slice Test Coverage 02: Coverage-Baseline

**Stand:** 2026-06-12  
**Status:** Review-Fix durch Codex umgesetzt, erneutes Review ausstehend  
**Feature-Branch:** `codex/test-coverage-expansion`  
**GitHub-Status:** Branch nur lokal angelegt; GitHub-Veroeffentlichung ausstehend  
**Uebergeordneter Plan:** `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`

## Ziel

Die bestehende Coverage-Auswertung wird so repariert, dass `npm run test:coverage` echte Projektdateien auswertet und ein leerer oder defekter Report nicht mehr als erfolgreich durchlaufen kann.

Kernpunkte:

- V8-`file://`-URLs werden mit `fileURLToPath` in lokale Pfade konvertiert.
- Nicht-Datei-URLs werden vor der Konvertierung gefiltert.
- Projektdateien aus `app/`, `engine/`, `workers/` und `types/` werden beruecksichtigt.
- Reports ohne ausgewertete Projektdateien enden mit `process.exit(1)`.
- Die Ausgabe nennt Gesamtwerte und schlechteste Dateien.

## Akzeptanzkriterien

- Coverage-Report enthaelt echte Dateien aus `app/`, `engine/`, `workers/`.
- Coverage-Report enthaelt `types/` oder dokumentiert je Datei eine explizite Ausnahme.
- Der Report unterscheidet "keine Daten gefunden" von "100 Prozent".
- Fehlerhafte oder leere Coverage-Daten fuehren zu `process.exit(1)`.
- Ein Report mit 0 ausgewerteten Projektdateien darf niemals erfolgreich sein.
- Coverage-URLs werden vor `fileURLToPath` auf `file://` gefiltert; `node:`, `http:`, leere oder sonstige Nicht-Datei-URLs werden uebersprungen und nicht in `fileURLToPath` gegeben.
- `fileURLToPath` ist per Test fuer Windows-Pfade mit Leerzeichen und fuer UNC-/Netzwerkpfadformen abgedeckt, soweit unter Node sinnvoll simulierbar.
- Die Ausgabe nennt Gesamtwerte und schlechteste Dateien.

## Scope

Geplante Dateien:

- `tests/coverage-report.mjs`
- `tests/coverage-report.test.mjs`
- `docs/internal/SLICE_TEST_COVERAGE_02_COVERAGE_BASELINE.md`
- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`

## Nicht-Scope

- Keine fachlichen Tests.
- Keine Coverage-Schwellen, die den Build sofort blockieren.
- Keine Aenderung an Engine-, Simulator- oder Balance-Semantik.
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
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
```

Hinweis: Der Arbeitsbaum ist abgesehen von der bekannten Git-Warnung sauber.

## Diff-Risiko-Block

Geplante Dateien:

- `tests/coverage-report.mjs`
- `tests/coverage-report.test.mjs`
- `docs/internal/SLICE_TEST_COVERAGE_02_COVERAGE_BASELINE.md`
- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`

Voraussichtliche Änderungstiefe:

- mittel

Gefährdete bestehende Tests:

- `npm run test:coverage`
- neuer Coverage-Report-Contract-Test
- indirekt die Gesamtsuite, falls Coverage-Parsing fehlerhafte Exit-Codes liefert

Nicht anfassen:

- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- fachliche Engine-/Simulator-/Balance-Logik
- `src-tauri/`

Rollback-Strategie:

```powershell
git checkout -- tests/coverage-report.mjs docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md
```

Neue Dateien bei Bedarf nur nach Rueckfrage entfernen:

- `tests/coverage-report.test.mjs`
- `docs/internal/SLICE_TEST_COVERAGE_02_COVERAGE_BASELINE.md`

## Geplante Tests

```powershell
node tests\run-single.mjs tests\coverage-report.test.mjs
npm run test:coverage
```

## Durchgefuehrte Aenderungen

- `tests/coverage-report.mjs`
  - V8-Coverage-URLs werden ueber `new URL()` vorgefiltert und nur bei `file:` an `fileURLToPath` uebergeben.
  - Windows-/UNC-`file://`-Pfade werden nicht mehr per String-Ersetzung/`decodeURIComponent` normalisiert.
  - `types/` ist in die Projektdatei-Auswertung aufgenommen.
  - Coverage-Pfade sind fuer Contract-Tests ueber `COVERAGE_REPO_ROOT`, `COVERAGE_V8_DIR` und `COVERAGE_SUMMARY_PATH` konfigurierbar.
  - Mehrere Coverage-Eintraege je Datei werden ueber zusammengefuehrte V8-Ranges aggregiert statt per Dateiduplikat aufaddiert.
  - Reports ohne Projektdateien oder ohne ausfuehrbare Projektzeilen brechen mit Fehler ab.
  - Dateien mit 0 ausfuehrbaren Zeilen bleiben sichtbar, erhalten aber `coveragePct: null` statt `100` oder `NaN`.
- `tests/coverage-report.test.mjs`
  - Neuer Contract-Test fuer Projektdateien aus `app/`, `engine/`, `workers/` und `types/`.
  - Prueft Windows-Pfade mit Leerzeichen, UNC-`file://`-URL, Nicht-Datei-URL-Filter und leeren Coverage-Report mit Exit-Code 1.
  - Prueft, dass 0-ausfuehrbare Projektdateien sichtbar bleiben und nicht als `100%` oder `NaN%` erscheinen.

## Ausgefuehrte Tests

```powershell
node tests\run-single.mjs tests\coverage-report.test.mjs
```

Ergebnis:

```text
Total Assertions: 19
Passed: 19
Failed Assertions: 0
Failed Files: 0
```

```powershell
npm run test:coverage
```

Ergebnis:

```text
Found 81 test files.
Total Assertions: 2182
Passed: 2182
Failed Assertions: 0
Failed Files: 0
Failed: 0
Open Handles: 0

Coverage summary (approx. line coverage from V8 ranges)
Total: 72.89% (19183/26316)
Files: 159
```

Schlechteste Dateien im finalen Report:

```text
- app/simulator/auto-optimize-evaluate.js: 0.00% (0/114)
- app/simulator/auto-optimize-param-meta.js: 0.00% (0/5)
- app/simulator/monte-carlo-ui.js: 0.00% (0/210)
- app/simulator/results-metrics.js: 0.00% (0/338)
- app/simulator/results-renderers.js: 0.00% (0/117)
```

Hinweis: Ein Zwischenlauf von `npm run test:coverage` schlug nach gruener Testsuite wegen eines lokalen Refactoringfehlers in der Konsolenausgabe fehl (`totalPct is not defined`). Der Fehler wurde behoben und durch den erneuten erfolgreichen Pflichtlauf validiert.

Nach Review-Finding G-01 wurde die V8-Range-Auswertung korrigiert. Die Baseline sank dadurch erwartungsgemaess von 86.24 Prozent auf 72.89 Prozent, weil nicht ausgefuehrte innere `count: 0`-Ranges nicht mehr durch ausgefuehrte aeussere Funktionsranges maskiert werden.

## Abweichungen vom Plan

- `tests/run-coverage.mjs` musste nicht geaendert werden.
- Die Coverage-Baseline enthaelt 0-ausfuehrbare Projektdateien mit `coveragePct: null`; sie werden nicht als Ausnahme ausgeblendet, sondern bleiben fuer Slice 3 sichtbar.

## Offene Risiken

- Line-Coverage aus V8-Ranges bleibt approximativ und ist keine Branch-Coverage.
- V8-Coverage kann je nach Node-Version andere Range-Formate liefern; die aktuelle Normalisierung wertet verschachtelte Ranges konservativ aus, bleibt aber weiterhin approximative Line-Coverage und keine semantische Branch-Auswertung.
- Der Coverage-Lauf gibt weiterhin bekannte nicht-blockierende Laufzeitwarnungen aus (`--localstorage-file`, CAPE-Fallback-/Validierungslogs). Sie beeinflussten Exit-Code und Testsummary nicht.
- Mehrere aktuell niedrig oder gar nicht abgedeckte UI-nahe Simulator-Dateien sind jetzt sichtbar, werden aber erst in spaeteren Slices fachlich bewertet.

## Rueckdokumentation in den Arbeitsplan

- Slice 2 im uebergeordneten Plan als Review-Fix umgesetzt, erneutes Review ausstehend dokumentieren.
- Coverage-Baseline dokumentiert: 159 Projektdateien, 19183/26316 Zeilen, 72.89 Prozent approximative Line-Coverage.

## Freigabestatus

Freigegeben. Review durch Gemini (Antigravity) durchgeführt und bestanden. Blocker G-01 wurde erfolgreich behoben, wodurch die tatsächliche Baseline-Coverage ehrlich von 86.24% auf 72.89% korrigiert wurde.

## Review-Feedback von Gemini

### 1. Prüfdimensionen

*   **Korrektheit vs. Akzeptanzkriterien:**
    *   *Normalisierung & fileURLToPath:* Bestanden. Die Pfadnormalisierung wurde von Ad-hoc-Regex auf das native `fileURLToPath` umgestellt und deckt auch Windows-Pfade mit Leerzeichen und UNC-Formen ab.
    *   *Roots app/, engine/, workers/, types/:* Bestanden. Alle vier Roots werden erfasst, und die resultierenden 159 Projektdateien spiegeln das echte Projektinventar wider.
    *   *Leere/fehlerhafte Reports:* Bestanden. Der Runner bricht mit Exit-Code 1 ab, wenn keine Projektdateien oder keine ausführbaren Zeilen gefunden werden.
    *   *Zero-executable Files:* Bestanden. Dateien wie `strategy-options.js` werden mit `null` statt `100%` oder `NaN%` gelistet und bleiben für die Inventur sichtbar.
*   **Vertragstreue:**
    *   Geprüft. Die JSON-Struktur in `summary.json` entspricht dem vereinbarten Schema.
*   **Fehlerbehandlung:**
    *   *Bestanden.* Blocker G-01 wurde behoben: Die V8-Ranges werden nun segmentbasiert über die umschließende Hierarchie aufgelöst, was falsch-positive Abdeckungen bei ungespielten Zweigen ausschließt.
*   **Seiteneffekte:**
    *   Geprüft. Die Änderungen betreffen ausschließlich den Test- und Reporting-Harness. Keine Anwendungslogik modifiziert.
*   **Was könnte brechen?**
    *   Die zeilenweise Abdeckungsberechnung kann ungenau werden, wenn eine Zeile sowohl ausgeführten Code (z. B. den Kopf einer Funktion) als auch nicht-ausgeführten Code (z. B. einen kurzen Einzeiler-Zweig) enthält. Dies ist jedoch ein bekanntes Limit von zeilenbasierter Coverage und akzeptabel.

### 2. Findings

*   **[BEHOBEN] G-01: Falsch-positive Abdeckung bei unvollständig ausgeführten Funktionen (Zweig-Verschluckung)**
    *   *Beschreibung:* Im `collectCoverageEntries`-Ablauf wurden zuvor alle V8-Ranges mit `count > 0` flach gesammelt.
    *   *Lösung:* Codex hat eine segmentbasierte Auflösung über die hierarchische Verschachtelung der V8-Bereiche implementiert. Ein Bereich ist nur abgedeckt, wenn die *innerste* umschließende Range `count > 0` aufweist. Dadurch sank die gemeldete Baseline-Coverage von ehemals fälschlichen 86.24% auf ehrliche **72.89%** (19183 von 26316 Zeilen).
*   **[HINWEIS] G-02: Keine automatische Bereinigung alter V8-Dateien**
    *   *Beschreibung:* Die Coverage-Generierung liest alle `.json`-Dateien in `.coverage/v8/`. Wenn alte Profile von gelöschten oder umbenannten Tests dort verbleiben, fließen sie weiterhin in den Report ein.
    *   *Auswirkung:* Veraltete Testabdeckungen verfälschen das Ergebnis.
    *   *Empfehlung:* Im finalen Dokumentations-/Gate-Slice 11 sollte sichergestellt werden, dass das Verzeichnis vor jedem Testlauf bereinigt wird (z. B. via Clean-Skript in `package.json`).

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
> Ein neues Projektmodul wird hinzugefügt, das ES-Klassen mit komplexen statischen Initialisierern oder geschachtelten Generatoren enthält. Da V8-Coverage-Profile je nach Node.js-Version syntaktisch abweichende Ranges für Generatoren und statische Blöcke liefern, könnte die Segment-Verschachtelungsberechnung bei extremen syntaktischen Sonderfällen falsche Grenzen ermitteln und den Report fehlerhaft abbrechen lassen.

### 4. Review-Ergebnis

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** G-02

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-01 | Gemini | Falsch-positive Abdeckung bei unvollständig ausgeführten Funktionen (Zweig-Verschluckung) | angenommen | erledigt (durch Codex behoben; segmentbasierte Verschachtelungslogik implementiert) |
| G-02 | Gemini | Keine automatische Bereinigung alter V8-Dateien | angenommen (Hinweis) | steht aus (Verschoben auf Slice 11) |

## Review-Antworten von Codex

### Antwort auf Gemini G-01

Angenommen und umgesetzt.

Die Coverage-Auswertung analysiert V8-Ranges jetzt pro Script-Eintrag hierarchisch, bevor Ergebnisse ueber mehrere Testprozesse hinweg zusammengefuehrt werden:

- Alle V8-Ranges einschliesslich `count: 0` werden in disjunkte Offset-Segmente zerlegt.
- Fuer jedes Segment entscheidet die innerste umschliessende Range ueber covered/uncovered.
- Erst die daraus abgeleiteten effektiven executable-/covered-Segmente werden pro Datei aggregiert.
- Die Line-Coverage ist konservativ: Eine ausfuehrbare Zeile gilt nur dann als covered, wenn ihre ausfuehrbaren Segmente vollstaendig covered sind. Enthaltene ungespielte Segmente verhindern eine falsch-positive Zeilenabdeckung.

Absicherung:

- `tests/coverage-report.test.mjs` enthaelt jetzt einen Regressionstest mit ausgefuehrtem aeusserem Funktionsrange und ungespieltem innerem `count: 0`-Range.
- Der Test prueft, dass diese Datei nicht mehr 100 Prozent meldet und die covered line count unter der executable line count liegt.
- `node tests\run-single.mjs tests\coverage-report.test.mjs` ist mit 19 Assertions gruen.
- `npm run test:coverage` ist mit 81 Testdateien, 2182 Assertions, 0 Fehlern und 0 offenen Handles gruen.

Die neue Baseline betraegt 72.89 Prozent (19183/26316) fuer 159 Projektdateien. Die Differenz zur vorherigen 86.24-Prozent-Baseline ist die erwartete Korrektur der zuvor falsch-positiven inneren Ranges.

### Antwort auf Gemini G-02

Als Hinweis angenommen und fuer Slice 11 vorgemerkt. `tests/run-coverage.mjs` loescht `.coverage/` bereits vor dem normalen `npm run test:coverage`-Pfad. Der Hinweis bleibt trotzdem sinnvoll fuer spaetere Doku-/Gate-Arbeiten, weil direkte Aufrufe von `tests/coverage-report.mjs` weiterhin alle vorhandenen `.coverage/v8/*.json` lesen.
