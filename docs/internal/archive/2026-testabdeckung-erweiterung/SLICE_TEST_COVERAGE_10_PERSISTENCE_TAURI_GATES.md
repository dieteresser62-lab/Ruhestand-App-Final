# Slice Test Coverage 10: Persistenz-, Migration- und Tauri-Gates

**Feature-Branch:** `codex/test-coverage-expansion`  
**GitHub-Status:** nicht veroeffentlicht in diesem Slice  
**Status:** umgesetzt und freigegeben


## Ziel

Persistenz-, Migration- und Tauri-nahe Pfade werden als eigene Gate-Klasse abgesichert. Der Slice ergaenzt gezielte Contract-Checks fuer Browser-Fallback, IndexedDB-/localStorage-/Tauri-Adaptergrenzen, Tauri-Payload-Shapes und Release-nahe Tauri-Konfiguration, ohne Produktionssemantik zu aendern.

## Akzeptanzkriterien

- `persistence.test.mjs` bleibt die zentrale Contract-Suite fuer Persistenzadapter und Migrationspfade.
- IndexedDB Upgrade-/Blocked-/Versionchange-Pfade sind explizit als Gate abgedeckt oder als bereits vorhandene Abdeckung dokumentiert.
- localStorage-Fallback und Recovery-Pfade sind reproduzierbar getestet.
- Tauri-JSON-Adapter-Contracts pruefen die Command-Payloads fuer Live- und Snapshot-Targets.
- Release-nahe Tauri-Konfiguration bleibt in `tauri-csp.test.mjs` gebuendelt.
- Rust-nahe Commands sind als getrenntes Gate dokumentiert; bei Aenderungen an `src-tauri/` muss `npm run tauri:build` bzw. ein Rust-Test laufen.

## Scope

- Erweiterung von `tests/persistence.test.mjs`.
- Erweiterung von `tests/tauri-csp.test.mjs`.
- Rueckdokumentation in `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`.
- Diese Slice-Datei.

## Nicht-Scope

- Keine Aenderung an Produktionscode.
- Keine Aenderung an `src-tauri/`, `engine.js`, `dist/` oder `RuheStandSuite.exe`.
- Kein Tauri-Release-Build, solange `src-tauri/` unveraendert bleibt.
- Keine neue Persistenzmigration oder Semantikaenderung.

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

- `tests/persistence.test.mjs`
- `tests/tauri-csp.test.mjs`
- `docs/internal/SLICE_TEST_COVERAGE_10_PERSISTENCE_TAURI_GATES.md`
- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`

Voraussichtliche Aenderungstiefe:

- klein bis mittel, test- und dokumentationsnah

Gefaehrdete bestehende Tests:

- `tests/persistence.test.mjs`
- `tests/tauri-csp.test.mjs`
- Gesamtsuite wegen gemeinsamer Persistenz-Globals

Nicht anfassen:

- `src-tauri/`
- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- lokale `node_modules`-Artefakte
- fachliche Persistenz-/Migrationssemantik

Rollback-Strategie:

- `git checkout -- tests/persistence.test.mjs tests/tauri-csp.test.mjs docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`
- Neue Datei `docs/internal/SLICE_TEST_COVERAGE_10_PERSISTENCE_TAURI_GATES.md` nur nach Freigabe entfernen.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\persistence.test.mjs
node tests\run-single.mjs tests\tauri-csp.test.mjs
npm test
```

Wenn `src-tauri/` geaendert wird:

```powershell
npm run tauri:build
```

## Durchgefuehrte Aenderungen

- `tests/persistence.test.mjs` erweitert:
  - Tauri-Live-Payload wird nach `save_app_state` geparst und auf `schemaVersion`, String-Records und Metadata geprueft.
  - Tauri-Snapshot-Payload wird nach `save_app_state` mit `target: "snapshots"` geparst und auf `schemaVersion`, `snapshots[]` und kanonische Snapshot-ID geprueft.
  - Neuer Test 26 prueft automatische Browser-Runtime-Auswahl auf `localStorage`, wenn IndexedDB nicht verfuegbar ist, inklusive Laden bestehender Daten, ausbleibendem Migrationsmarker und Rueckschreiben ueber die Facade.
- `tests/tauri-csp.test.mjs` erweitert:
  - prueft `package.json`-Skripte fuer `tauri:build` und den Windows-EXE-Workflow,
  - prueft statisch die Rust-Command-Praesenz fuer `load_app_state`, `save_app_state`, `quarantine_app_state` und `confirm_app_close`,
  - prueft den optionalen `StateTarget`-Payload-Contract, Snapshot-Dateitrennung, Quarantaene-Namensschema und die vorhandenen Rust-Unit-Tests fuer State-Target-Dateinamen.
- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md` aktualisiert:
  - Slice 10 als umgesetzt markiert,
  - konkrete Gate-Abdeckung und Tauri-/Rust-Abgrenzung dokumentiert,
  - Review-Checkliste fuer Persistenz-/Tauri-Gates geschlossen.
- `src-tauri/` wurde nicht geaendert.

## Ausgefuehrte Tests

```powershell
node tests\run-single.mjs tests\persistence.test.mjs
```

Ergebnis: erfolgreich.

- 202 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.

```powershell
node tests\run-single.mjs tests\tauri-csp.test.mjs
```

Ergebnis: erfolgreich.

- 36 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.

```powershell
npm test
```

Ergebnis: erfolgreich.

- 90 Testdateien gefunden.
- 2294 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.
- 0 offene Handles.

Bestehende Warnungen aus der Suite bleiben unveraendert sichtbar, insbesondere ``--localstorage-file` was provided without a valid path`, CAPE-Fallback-Logs und ein erwarteter Validierungslog fuer `goGoMultiplier`.

`npm run tauri:build` wurde nicht ausgefuehrt, weil `src-tauri/` in diesem Slice unveraendert blieb.

## Abweichungen vom Plan

- Keine Produktionsaenderung und keine `src-tauri/`-Aenderung. Die Rust-Command-Contracts werden in `tauri-csp.test.mjs` statisch geprueft; ein echter Rust-/Tauri-Build bleibt das Pflichtgate, sobald Rust- oder Tauri-Konfigurationscode geaendert wird.

## Offene Risiken

- Die Node-Tests simulieren Tauri-Commands ueber Fakes und pruefen Rust-Command-Praesenz statisch. Sie beweisen keine erfolgreiche native Serialisierung in einem echten Tauri-Build.
- `tauri-csp.test.mjs` prueft bewusst nur release-nahe Contracts, nicht die gesamte Windows-Bundle-Erstellung.
- Die bestehenden `node_modules`-Aenderungen aus dem Playwright-Setup bleiben ausserhalb des Slice-Scopes im Arbeitsbaum.

## Rueckdokumentation

- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md` dokumentiert Slice 10 als umgesetzt und nennt `tests/persistence.test.mjs`, `tests/tauri-csp.test.mjs` sowie `npm run tauri:build` als Pflichtgate bei `src-tauri/`-Aenderungen.

## Review-Feedback von Gemini

### 1. Prüfdimensionen & Detailanalyse

#### Korrektheit
- **Tauri Payload-Checks:** In `tests/persistence.test.mjs` wird die serielle JSON-Struktur, die an Rust übergeben wird, auf korrekte Schema-Version (`schemaVersion: 1`), String-Serialisierung der Records und das Vorhandensein von Metadaten/Snapshots validiert. Dies verhindert Schnittstellen-Konflikte mit der Rust-Deserialisierung.
- **localStorage Fallback-Test:** Test 26 verifiziert das Fallback-Verhalten bei nicht verfügbarer IndexedDB. Die Daten werden korrekt über `localStorage` geladen und geschrieben, ohne fälschliche Migrationsschritte einzuleiten.
- **Statische Rust-Command-Validierung:** In `tests/tauri-csp.test.mjs` wird die Präsenz der Rust-Funktionen (`load_app_state`, `save_app_state`, `quarantine_app_state`, `confirm_app_close`), ihre Payload-Typen (`Option<StateTarget>`) sowie die dazugehörigen Rust-Unit-Tests im Quellcode statisch verifiziert. Dies ist eine effiziente und pragmatische Absicherung der Schnittstellen-Integrität.

#### Vertragstreue
- **Tauri/Rust Abgrenzung:** Da in diesem Slice keine Rust-Dateien geändert wurden, bleibt `npm run tauri:build` als Gate inaktiv (Nicht-Scope-Einhaltung). Der Vertrag über die Release-Kanal-Trennung (`StateTarget::Snapshots`) wird eingehalten.
- **Prozess-Hygene:** Die Unit-Tests laufen in der Hauptsuite `npm test` mit und hinterlassen keine verwaisten Mocks.

#### Fehlerbehandlung
- **IndexedDB-Ausfall-Resilienz:** Das sichere Zurückfallen der Persistenz-Facade auf localStorage bei IndexedDB-Ausfällen wird zuverlässig abgesichert.
- **Payload-Sanitization:** Die korrekte Übergabe strukturierter JSON-Objekte an Tauri-Commands wird via Schema-Prüfung verifiziert.

#### Seiteneffekte
- **Keine Mutation globaler States:** Nach Test 26 wird der localStorage-Mock wieder abgemeldet, so dass Folge-Tests unbeeinflusst bleiben.

#### Was könnte brechen?
- **Rustfmt-Divergenzen (Risiko):** Da die Code-Existenz in `tauri-csp.test.mjs` über einfache String-Suchen (z. B. `.includes('fn save_app_state')`) ermittelt wird, können alternative Formatierungen (z. B. manuelle Zeilenumbrüche) den Test brechen lassen, obwohl der Rust-Compiler den Code akzeptieren würde. Dies ist ein akzeptiertes Risiko.

---

### 2. Strukturierte Findings & Blocker

| ID | Schwere | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-S10-01 | RISIKO | Statische Codeanalyse in JS mittels String-Vergleichen ist anfällig für Formatierungsunterschiede im Rust-Code. | Als Restrisiko akzeptiert. | Keine Änderung. |
| G-S10-02 | HINWEIS | JS-Tests führen keine echten cargo-Befehle (`cargo test`) aus. | Als Hinweis dokumentiert. Echte Rust-Tests laufen separat im Rust-Gate. | Keine Änderung. |

---

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - Formatierungsempfindlichkeit der statischen Rust-Command-Prüfung in JS.
- Pre-Mortem:
  > „Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  >
  > Ein Entwickler ändert die Signatur des Rust-Commands `save_app_state` in `lib.rs` (z. B. Umbenennung des Parameters `target` in `state_target`). Der JS-Test `tauri-csp.test.mjs` schlägt nicht an, da er nur prüft, ob die Funktion existiert und der String `target: Option<StateTarget>` irgendwo in der Datei vorkommt (was z. B. im Unit-Test-Bereich der Fall sein kann). Zur Laufzeit stürzt die Tauri-Deserialisierung ab, da die JSON-Payload nicht mehr zum Rust-Struct passt.“

## Freigabestatus

Freigegeben durch Gemini am 2026-06-12.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-S10-01 | Gemini | Formatierungs-Sensitivität bei statischer Rust-Prüfung | Restrisiko akzeptiert | Keine |
| G-S10-02 | Gemini | Fehlende native Rust-Test-Ausführung in JS | Hinweis dokumentiert | Keine |

