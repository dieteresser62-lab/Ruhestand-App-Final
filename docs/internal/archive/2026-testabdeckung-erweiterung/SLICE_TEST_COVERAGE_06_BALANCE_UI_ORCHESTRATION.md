# Slice Test Coverage 06: Balance UI-Orchestrierung

**Feature-Branch:** `codex/test-coverage-expansion`  
**GitHub-Status:** nicht veroeffentlicht in diesem Slice  
**Status:** umgesetzt und freigegeben


## Ziel

Die Balance-UI-Orchestrierung wird mit einem fokussierten DOM-nahen Contract-Test abgesichert. Der Slice prueft Binding-Verhalten, Profilverbund-Hooks, Jahresabschluss-Reihenfolge und Import-/Export-Fehlerfeedback, ohne fachliche Engine-Semantik zu veraendern.

## Akzeptanzkriterien

- Initialisierung und Binding verhalten sich idempotent oder kontrolliert, wenn sie mehrfach angestossen werden.
- Fehlende optionale DOM-Elemente fuehren zu kontrolliertem Verhalten.
- Der neue DOM-nahe Test laeuft ueber den isolierten Runner-Pfad aus Slice 1.
- Profil-Sync und Profilverbund-Hooks werden einmalig gebunden.
- Jahresupdate-/Jahresabschluss-Aktionen bleiben in der dokumentierten Reihenfolge.
- Import-/Export-Fehlerpfade zeigen Nutzerfeedback statt stiller Fehler.

## Scope

- Neuer Contract-Test fuer Balance-UI-Orchestrierung.
- Falls noetig eng begrenzte Korrektur an der Balance-Binder-Initialisierung.
- Rueckdokumentation im uebergeordneten Testabdeckungsplan.

## Nicht-Scope

- Keine Aenderung an Engine-Semantik oder Rechenmodellen.
- Keine Aenderung an `engine.js`, `dist/` oder Release-Artefakten.
- Keine Erweiterung der Browser-Smoke-Infrastruktur.
- Keine Simulator-UI-Orchestrierung; das folgt in Slice 7.

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

- `tests/balance-ui-orchestration.test.mjs`
- `app/balance/balance-binder.js`
- `app/balance/balance-main-profilverbund.js`
- `docs/internal/SLICE_TEST_COVERAGE_06_BALANCE_UI_ORCHESTRATION.md`
- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`

Voraussichtliche Änderungstiefe:

- mittel

Gefährdete bestehende Tests:

- `tests/balance-smoke.test.mjs`
- `tests/balance-annual-workflow-contract.test.mjs`
- Balance-Binder- und Storage-nahe Tests

Nicht anfassen:

- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- fachliche Engine-Semantik
- lokale `node_modules`-Artefakte

Rollback-Strategie:

- `git checkout -- docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`
- Neue Dateien `tests/balance-ui-orchestration.test.mjs` und diese Slice-Datei nur nach Freigabe entfernen.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\balance-smoke.test.mjs
node tests\run-single.mjs tests\balance-annual-workflow-contract.test.mjs
node tests\run-single.mjs tests\balance-ui-orchestration.test.mjs
npm test
```

## Durchgefuehrte Änderungen

- `app/balance/balance-binder.js` verhindert doppelte UI-Bindings pro `initUIBinder()`-Initialisierung. Ein erneuter `initUIBinder()`-Aufruf setzt den Guard zurueck, damit Tests oder Neuinitialisierungen mit neuen DOM-Referenzen weiterhin binden koennen.
- `app/balance/balance-main-profilverbund.js` verhindert doppelte Profilverbund-Listener pro Handler-Instanz.
- `tests/balance-ui-orchestration.test.mjs` angelegt:
  - laeuft nur bei direktem Aufruf oder via `tests/run-single.mjs`, damit der DOM-nahe Test nicht im gemeinsamen `npm test`-Prozess ausgefuehrt wird,
  - prueft idempotentes Binding zentraler Balance-Controls,
  - prueft optionale Import-/Export-Control-Pfade,
  - prueft einmalige Profilverbund-Hook-Bindings,
  - prueft JSON- und CSV-Import-Fehlerfeedback ueber `UIRenderer.handleError`,
  - prueft Setzen und Loeschen der Profilverbund-Globals ohne stale Daten.

## Ausgefuehrte Tests

```powershell
node tests\run-single.mjs tests\balance-ui-orchestration.test.mjs
```

Ergebnis: erfolgreich.

- 19 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.

```powershell
node tests\run-single.mjs tests\balance-smoke.test.mjs
```

Ergebnis: erfolgreich.

- 0 fehlgeschlagene Dateien.

```powershell
node tests\run-single.mjs tests\balance-annual-workflow-contract.test.mjs
```

Ergebnis: erfolgreich.

- 45 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.

```powershell
npm test
```

Ergebnis: erfolgreich.

- 85 Testdateien gefunden.
- 2228 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.
- 0 offene Handles.

Hinweis: `tests/balance-ui-orchestration.test.mjs` wird im normalen `npm test` nur importiert und nicht ausgefuehrt, damit die Slice-6-Isolationsregel eingehalten wird. Der isolierte Gate-Lauf ist `node tests\run-single.mjs tests\balance-ui-orchestration.test.mjs`.

Bestehende Warnungen aus der Suite bleiben unveraendert sichtbar, insbesondere ``--localstorage-file` was provided without a valid path`, CAPE-Fallback-Logs und ein erwarteter Validierungslog fuer `goGoMultiplier`.

## Abweichungen vom Plan

- Der urspruengliche Diff-Risiko-Block ging von einem reinen Test-/Doku-Slice aus. Die Idempotenz-Akzeptanzkriterien haetten ohne kleine Produktionskorrekturen nur einen bekannten Fehler dokumentiert. Deshalb wurden zusaetzlich `app/balance/balance-binder.js` und `app/balance/balance-main-profilverbund.js` eng begrenzt angepasst.
- Die geaenderten Dateien bleiben mit 5 Dateien innerhalb der Stop-Regel.

## Offene Risiken

- Die DOM-Mocks decken bewusst nur Orchestrierungs-Contracts ab. Browser-spezifische Layout- und echte Event-Bubbling-Risiken bleiben beim Playwright-Smoke aus Slice 4.
- Der normale `npm test` importiert die Datei nur; der eigentliche DOM-nahe Test muss als isolierter `run-single`-Gate ausgefuehrt werden.

## Rueckdokumentation

- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md` dokumentiert Slice 6 als umgesetzt und verweist auf den isolierten Balance-UI-Orchestrierungs-Test.

## Review-Feedback von Gemini

### 1. Prüfdimensionen & Detailanalyse

#### Korrektheit
- **Idempotenz-Guards:** Der Test prüft erfolgreich, dass wiederholte Aufrufe von `UIBinder.bindUI()` und `handlers.initProfilverbundBalance()` keine doppelten Event-Listener auf den Elementen registrieren. Dies wird durch die neu eingeführten Guards (`uiBound` und `profilverbundBound`) gelöst.
- **Optionale DOM-Elemente:** Der Test verifiziert, dass das Fehlen optionaler Elemente (z. B. `exportBtn`) nicht zum Absturz führt.
- **Import/Export-Fehlerpfade:** In Test 3 wird geprüft, ob syntaktisch ungültiges JSON oder CSV zu einem kontrollierten Fehlerpfad über `UIRenderer.handleError` führt und das Eingabefeld zurückgesetzt wird.
- **Profilverbund-Globals:** In Test 4 wird verifiziert, dass die globalen Daten für die Profilverbund-Verteilung bei Profiländerungen aktualisiert bzw. bei leerem Profilverbund rückstandslos gelöscht werden, um veraltete Zustände (Stale Data) zu verhindern.

#### Vertragstreue
- **Prozess-Isolation:** Die Datei besitzt einen `shouldRun()`-Guard. Dadurch wird der DOM-mockende Test beim Standard-Lauf `npm test` zwar importiert, aber nicht ausgeführt, was globale Verschmutzungen des geteilten Node-Prozesses ausschließt. Er läuft vertragsgemäß nur isoliert über `run-single.mjs` or direkte Ausführung.
- **Guard-Resets:** In `initUIBinder` wird `uiBound` wieder zurückgesetzt. Dies stellt sicher, dass bei einer echten Neuinitialisierung (z. B. nach DOM-Wechseln) die Listener erneut gebunden werden können.

#### Fehlerbehandlung
- **Fehler-Routing:** Fehler beim Dateiparser (CSV/JSON) werden zuverlässig abgefangen und über die UI-Schicht ausgegeben.
- **Globaler Cleanup:** Alle während des Tests modifizierten globalen Variablen (`window`, `document`, `Blob`, `URL` etc.) werden in einem `finally`-Block sauber auf ihre ursprünglichen Werte zurückgerollt.

#### Seiteneffekte
- **Keine Beeinträchtigung der Unit-Tests:** Die Standard-Testsuite läuft unverändert stabil; die Ausführung des neuen Tests bleibt strikt isoliert.

#### Was könnte brechen?
- **Pflegeaufwand der DOM-Mocks (Risiko):** Da das Skript ein eigenes rudimentäres Mock-DOM implementiert, brechen die Tests, sobald in `balance-binder.js` neue DOM-Abfragen eingebaut werden, die im Mock nicht definiert sind. Dieses Risiko wird durch die echten Browser-Tests in Slice 4 kompensiert.

---

### 2. Strukturierte Findings & Blocker

| ID | Schwere | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-S6-01 | RISIKO | Hoher Pflegeaufwand für das benutzerdefinierte DOM-Mock bei zukünftigen UI-Erweiterungen. | Als Restrisiko akzeptiert, da tiefergehende UI-Prüfungen über Playwright laufen. | Keine Änderung. |
| G-S6-02 | HINWEIS | Die Pfadprüfung `shouldRun()` hängt von der Aufrufstruktur der Argumente ab. | Als Hinweis dokumentiert. | Keine Änderung. |

---

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - Wartungsaufwand für Mock-Klassen (`MockElement`, `MockDocument`), wenn neue DOM-APIs in der Anwendung genutzt werden.
- Pre-Mortem:
  > „Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  >
  > Ein Entwickler fügt ein neues Eingabefeld zur Balance-UI hinzu und liest dessen Wert in `balance-main.js` direkt über ein DOM-Element aus. Da dieses Element im `MockDocument` des Orchestrierungstests fehlt, wirft der Test beim Ausführen einen Null-Pointer-Fehler. Der Entwickler, der unter Zeitdruck steht und den Mock-Mechanismus nicht durchschaut, deaktiviert den Test oder umgeht den Fehler mit einem ad-hoc Try-Catch, wodurch eine fehlerhafte Bindung unbemerkt bleibt.“

## Freigabestatus

Freigegeben durch Gemini am 2026-06-12.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-S6-01 | Gemini | Wartungsaufwand für DOM-Mocks | Restrisiko akzeptiert | Keine |
| G-S6-02 | Gemini | Pfadabhängigkeit in `shouldRun()` | Hinweis dokumentiert | Keine |

