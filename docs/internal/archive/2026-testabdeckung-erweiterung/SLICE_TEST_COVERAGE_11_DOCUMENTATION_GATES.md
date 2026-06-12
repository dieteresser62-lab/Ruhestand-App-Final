# Slice Test Coverage 11: Dokumentation, Gates und Review-Workflow

**Feature-Branch:** `codex/test-coverage-expansion`
**GitHub-Status:** nicht veroeffentlicht in diesem Slice
**Status:** umgesetzt und freigegeben

## Ziel

Die in Slices 1 bis 10 erweiterte Testabdeckungsstrategie wird in den zentralen Test- und Architekturreferenzen verankert. Standard-, Coverage-, Browser- und release-nahe Tauri-Gates sollen reproduzierbar beschrieben sein, ohne manuelle Checks als automatisierte Tests auszugeben.

## Akzeptanzkriterien

- Testbefehle sind aktuell und reproduzierbar dokumentiert.
- Coverage-Gates und Coverage-Ausnahmen sind beschrieben.
- Browser-Smoke-Gate und Tauri-/Release-Gate sind getrennt von `npm test` dokumentiert.
- Manuelle Verifikationen bleiben klar als manuelle Release-Smokes markiert.
- Review-Feedback wird in dieser Slice-Datei mit Entscheidung dokumentiert.

## Scope

- `tests/README.md`
- `docs/reference/TECHNICAL.md`
- `docs/internal/PROJEKTUEBERSICHT.md`
- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` nach Review-Blocker G-S11-02 und Nutzerfreigabe zur Stop-Regel-Ausnahme
- diese Slice-Datei

## Nicht-Scope

- Keine Produktionscode-Aenderung.
- Keine Testcode-Aenderung.
- Keine Aenderung an `src-tauri/`, `engine.js`, `dist/`, `RuheStandSuite.exe` oder `node_modules`.
- Keine neuen Coverage-Schwellen als hartes Fail-Gate.
- Keine Aktualisierung von `README.md`, weil sich die Package-Kommandos in diesem Slice nicht aendern und die detaillierten Gates in Test-/Technikreferenzen dokumentiert werden.

## Git-Status vor Start

Branch:

```text
codex/test-coverage-expansion
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
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
```

Die `node_modules`-Aenderungen stammen aus dem Playwright-Setup und werden in diesem Slice nicht angefasst.

## Diff-Risiko-Block

Geplante Dateien:

- `docs/internal/SLICE_TEST_COVERAGE_11_DOCUMENTATION_GATES.md`
- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`
- `tests/README.md`
- `docs/reference/TECHNICAL.md`
- `docs/internal/PROJEKTUEBERSICHT.md`

Voraussichtliche Aenderungstiefe:

- klein, reine Dokumentations- und Arbeitsplanpflege

Gefaehrdete bestehende Tests:

- keine direkten Codepfade; Validierungsrisiko liegt in veralteter oder widerspruechlicher Doku

Nicht anfassen:

- `src-tauri/`
- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- `node_modules`
- Produktions- und Testcode

Rollback-Strategie:

- `git checkout -- docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md tests/README.md docs/reference/TECHNICAL.md docs/internal/PROJEKTUEBERSICHT.md`
- Neue Datei `docs/internal/SLICE_TEST_COVERAGE_11_DOCUMENTATION_GATES.md` nur nach Freigabe entfernen.

## Geplante Tests

```powershell
npm test
npm run test:coverage
```

`npm run tauri:build` ist nicht geplant, weil `src-tauri/` in diesem Slice unveraendert bleibt.

## Durchgefuehrte Aenderungen

- `tests/README.md` aktualisiert:
  - Teststatistik auf 90 Testdateien / 2294 Assertions aktualisiert.
  - `QUICK_TESTS=1` aus der normalen Nutzungsdoku entfernt und als deprecated dokumentiert.
  - Standard-Suite, Coverage-Baseline, Browser-Smoke-Gate und release-nahe Tauri-Gates getrennt beschrieben.
  - Coverage-Ausnahmen fuer UI-nahe Browserpfade, Wrapper/Re-Exports und Dateien ohne ausfuehrbare Zeilen dokumentiert.
- `docs/reference/TECHNICAL.md` aktualisiert:
  - Build-/Laufzeit-Hinweise um `npm run test:coverage`, `npm run test:browser` und das Tauri-/Rust-Gate bei `src-tauri/`-Aenderungen ergaenzt.
  - Verweis auf `tests/README.md` von veralteter Testdatei-Zahl auf Gate-Dokumentation umgestellt.
- `docs/internal/PROJEKTUEBERSICHT.md` aktualisiert:
  - Stand auf 2026-06-12 gesetzt.
  - Skriptliste um `npm run test:browser` ergaenzt.
  - Teststatistik, Coverage-Baseline, Browser-Smokes, Persistenz-/Tauri-Gates und Validierungsregeln aktualisiert.
- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md` aktualisiert:
  - Slice 11 als umgesetzt dokumentiert.
  - Review-Checkliste geschlossen.
  - Vertagte Entscheidungen zu Coverage-Schwellen, UI-Modulen, `QUICK_TESTS=1` und Parallelisierung dokumentiert.
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` nach Gemini-Blocker G-S11-02 aktualisiert:
  - Dokumentstand und gepruefte Codebasis auf 2026-06-12 gesetzt.
  - Komponenten- und Bestandszahlen auf 90 Testdateien, 2294 Assertions und Coverage-Baseline 72,25% aktualisiert.
  - B.5-Testuebersicht und Validierungstabelle um `npm run test:coverage`, `npm run test:browser` und `npm run tauri:build` ergaenzt.
  - `QUICK_TESTS=1` nicht mehr als regulaerer Quick-Subset-Befehl gefuehrt, sondern als deprecated dokumentiert.

## Ausgefuehrte Tests

```powershell
npm test
```

Ergebnis: erfolgreich.

- 90 Testdateien gefunden.
- 2294 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.
- 0 offene Handles.

```powershell
npm run test:coverage
```

Ergebnis: erfolgreich.

- 90 Testdateien gefunden.
- 2294 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- Coverage summary: 72,25% (19352/26784 ausfuehrbare Zeilen).
- 162 Projektdateien ausgewertet.
- Worst files weiterhin dokumentationsgemaess UI-/Wrapper-nahe Pfade, u. a. `app/simulator/auto-optimize-evaluate.js`, `app/simulator/monte-carlo-ui.js`, `app/tranches/tranchen-manager-page.js`, `engine/index.mjs`.
- `.coverage\summary.json` wurde geschrieben, erscheint aber nicht als Git-Aenderung.

Bestehende Warnungen aus der Suite bleiben unveraendert sichtbar, insbesondere ``--localstorage-file` was provided without a valid path`, CAPE-Fallback-Logs und ein erwarteter Validierungslog fuer `goGoMultiplier`.

`npm run tauri:build` wurde nicht ausgefuehrt, weil `src-tauri/` in diesem Slice unveraendert blieb.

## Abweichungen vom Plan

- `README.md` wurde nicht aktualisiert. Begruendung: Die Package-Kommandos selbst haben sich in Slice 11 nicht geaendert; die detaillierte Gate-Dokumentation steht in `tests/README.md`, `docs/reference/TECHNICAL.md` und `docs/internal/PROJEKTUEBERSICHT.md`. Dadurch bleibt der Slice innerhalb der 5-Dateien-Stop-Regel.
- Nach Review-Blocker G-S11-02 wurde `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` zusaetzlich aktualisiert. Damit umfasst der Slice sechs Dateien; der Nutzer hat die Stop-Regel-Ausnahme am 2026-06-12 ausdruecklich freigegeben.

## Offene Risiken

- Es gibt weiterhin keine harte Mindest-Coverage-Schwelle; `npm run test:coverage` ist ein Baseline-/Transparenz-Gate.
- Browser-Smoke und Tauri-Build bleiben getrennte Gates und werden nicht automatisch durch `npm test` ersetzt.
- Die bestehenden `node_modules`-Aenderungen aus dem Playwright-Setup bleiben ausserhalb des Slice-Scopes im Arbeitsbaum.

## Rueckdokumentation

- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md` dokumentiert Slice 11 als umgesetzt.
- Die Review-Checkliste im Arbeitsplan ist fuer Doku-Gates und Coverage-Ausnahmen geschlossen.
- Die noch nicht entschiedenen Governance-Fragen sind als bewusst vertagt markiert.

## Review-Antworten von Codex

### G-S11-02

Angenommen und umgesetzt.

- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` wurde synchronisiert:
  - alte Metadaten/Statistiken `2026-06-04`, 79 Testdateien und 2134 Assertions ersetzt,
  - aktuelle Werte aus dem Slice-11-Testlauf dokumentiert: 90 Testdateien, 2294 Assertions, Coverage 72,25%,
  - `QUICK_TESTS=1` aus der regulaeren Validierungstabelle entfernt und als deprecated markiert,
  - Coverage-, Browser-Smoke- und Tauri/Rust-Gates in B.5.2 ergaenzt.
- Kontrollsuche:
  - keine Treffer mehr fuer `79 Testdateien`, `2134`, `2026-06-04`, `QUICK_TESTS=1 npm test` oder `Quick-Subset` in `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`.

Keine Code- oder Testsemantik wurde geaendert.

## Review-Feedback von Gemini (Re-Review nach Fix)

### 1. Prüfdimensionen & Detailanalyse

#### Korrektheit
- **Statistik-Synchronisation (Behoben):** Alle Teststatistiken wurden in `tests/README.md`, `PROJEKTUEBERSICHT.md` und `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` konsistent auf 90 Testdateien, 2294 Assertions, eine V8-Coverage-Baseline von 72,25% und das Prüfdatum 2026-06-12 aktualisiert.
- **Kommando-Dokumentation (Behoben):** Die veraltete `QUICK_TESTS`-Option ist überall als *deprecated* markiert, und die neuen Befehle `npm run test:coverage`, `npm run test:browser` sowie `npm run tauri:build` wurden in allen Architektur- und Testdokumenten einheitlich erfasst.

#### Vertragstreue
- Die Schnittstellenbeschreibung der Testsuite (Mocks, globaler Context) entspricht dem realen Stand.
- Es gibt keine produktiven oder testbezogenen Semantikänderungen.

#### Fehlerbehandlung
- Das Fehlerverhalten bei leeren Reports und Portkollisionen ist in der Test-Infrastruktur-Dokumentation korrekt abgebildet.

#### Seiteneffekte
- Die Dokumentationsänderungen haben keine Seiteneffekte auf den Code.

#### Was könnte brechen?
- **Zukünftige Drift (Risiko):** Da Testzahlen (Dateien/Assertions) statisch in Dokumenten eingetragen sind, werden sie bei jedem zukünftigen Test-Ausbau erneut veralten. Dies ist ein bekanntes Risiko, das als vertretbar eingestuft wird.

---

### 2. Strukturierte Findings & Blocker

| ID | Schwere | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-S11-01 | HINWEIS | Zukünftiger Drift der statisch dokumentierten Teststatistiken bei Erweiterung der Suite. | Als Restrisiko akzeptiert. | Keine Änderung erforderlich; dynamische Ermittlung bleibt Backlog-Option. |
| G-S11-02 | BLOCKER | **Fehlende Doku-Synchronisation im Fachkonzept:** Das Dokument `ARCHITEKTUR_UND_FACHKONZEPT.md` verweist an mehreren Stellen auf veraltete Teststatistiken. | **Behoben.** | Codex hat alle 5 Vorkommen synchronisiert und die neuen Gates erfasst. |

---

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - Zukünftige Driftgefahr statisch dokumentierter Testdateizahlen.
- Pre-Mortem:
  > „Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  >
  > Ein Entwickler baut neue Tests ein und verlässt sich auf die in `tests/README.md` dokumentierte Zahl von 90 Dateien, um die Vollständigkeit seiner lokalen Ausführung abzuschätzen, während real bereits 95 Dateien existieren. Ein fehlerhafter Test wird dadurch lokal übersehen und gelangt unbemerkt in Produktion.“

## Freigabestatus

Freigegeben durch Gemini am 2026-06-12.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-S11-01 | Gemini | Zukünftiger Drift statischer Zahlen | Restrisiko akzeptiert | Keine |
| G-S11-02 | Gemini | Inkompatible Teststatistiken im Fachkonzept | Behoben (Freigabe erteilt) | Synchronisation in `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` erfolgreich durchgeführt |
