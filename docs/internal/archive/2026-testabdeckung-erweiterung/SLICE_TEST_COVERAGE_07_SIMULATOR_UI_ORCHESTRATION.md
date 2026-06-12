# Slice Test Coverage 07: Simulator UI-Orchestrierung

**Feature-Branch:** `codex/test-coverage-expansion`  
**GitHub-Status:** nicht veroeffentlicht in diesem Slice  
**Status:** umgesetzt und freigegeben


## Ziel

Die Simulator-UI-Orchestrierung wird mit einem fokussierten DOM-nahen Contract-Test abgesichert. Der Slice prueft Browser-Entry-Point-Verdrahtung, Tabs, Reset-/Persistenzpfade, zentrale UI-Controls, sichtbare Sweep-Validierung und einen Optimizer-Apply-Pfad ohne lange Monte-Carlo-Laeufe.

## Akzeptanzkriterien

- Simulator-Initialisierung registriert die bestehenden Browser-/Legacy-Handler ohne unhandled rejection.
- Der neue DOM-nahe Test laeuft ueber den isolierten Runner-Pfad aus Slice 1.
- Tabs und zentrale Buttons werden korrekt verdrahtet.
- Reset- und Persistenzpfade erhalten bestehende Profil-/Input-Contracts.
- Sweep-UI blockiert ungueltige Kombinationen sichtbar.
- Optimizer-Apply-Pfad wird ohne lange MC-Laeufe getestet.

## Scope

- Neuer Contract-Test fuer Simulator-UI-Orchestrierung.
- Rueckdokumentation im uebergeordneten Testabdeckungsplan.

## Nicht-Scope

- Keine Aenderung an Engine-Semantik oder Rechenmodellen.
- Keine Aenderung an `engine.js`, `dist/` oder Release-Artefakten.
- Keine Erweiterung der Browser-Smoke-Infrastruktur.
- Keine langen Monte-Carlo- oder Sweep-Laeufe im UI-Orchestrierungstest.

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

- `tests/simulator-ui-orchestration.test.mjs`
- `docs/internal/SLICE_TEST_COVERAGE_07_SIMULATOR_UI_ORCHESTRATION.md`
- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`

Voraussichtliche Änderungstiefe:

- mittel

Gefährdete bestehende Tests:

- `tests/simulator-input-readers.test.mjs`
- `tests/simulator-sweep.test.mjs`
- `tests/browser-smoke.test.mjs`

Nicht anfassen:

- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- fachliche Engine-Semantik
- lokale `node_modules`-Artefakte

Rollback-Strategie:

- `git checkout -- docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`
- Neue Dateien `tests/simulator-ui-orchestration.test.mjs` und diese Slice-Datei nur nach Freigabe entfernen.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\simulator-input-readers.test.mjs
node tests\run-single.mjs tests\simulator-sweep.test.mjs
node tests\run-single.mjs tests\simulator-ui-orchestration.test.mjs
npm test
```

## Durchgefuehrte Änderungen

- `tests/simulator-ui-orchestration.test.mjs` angelegt:
  - laeuft nur bei direktem Aufruf oder via `tests/run-single.mjs`, damit der DOM-nahe Test nicht im gemeinsamen `npm test`-Prozess ausgefuehrt wird,
  - importiert `app/simulator/simulator-main.js` in einer kontrollierten Browser-Global-Mockumgebung und prueft die Legacy-Handler auf `window`,
  - prueft Tab-Verdrahtung ueber `initTabSwitching()`,
  - prueft Reset-Verhalten auf `sim_`-Keys und Reload-Trigger,
  - prueft Partner-Toggle und Input-Persistenz inklusive sichtbarer Portfolio-Refresh-Zielknoten,
  - prueft Stress-Preset-Befuellung und sichtbare Sweep-Grid-Warnungen fuer ungueltige und zu grosse Kombinationen,
  - prueft den Optimizer-Apply-Pfad ohne Monte-Carlo-Ausfuehrung.
- Keine Produktionsdateien geaendert.

## Ausgefuehrte Tests

```powershell
node tests\run-single.mjs tests\simulator-ui-orchestration.test.mjs
```

Ergebnis: erfolgreich.

- 25 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.

```powershell
node tests\run-single.mjs tests\simulator-input-readers.test.mjs
```

Ergebnis: erfolgreich.

- 35 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.

```powershell
node tests\run-single.mjs tests\simulator-sweep.test.mjs
```

Ergebnis: erfolgreich.

- 107 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.

```powershell
npm test
```

Ergebnis: erfolgreich.

- 86 Testdateien gefunden.
- 2228 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.
- 0 offene Handles.

Hinweis: `tests/simulator-ui-orchestration.test.mjs` wird im normalen `npm test` nur importiert und nicht ausgefuehrt, damit die Slice-7-Isolationsregel eingehalten wird. Der isolierte Gate-Lauf ist `node tests\run-single.mjs tests\simulator-ui-orchestration.test.mjs`.

Bestehende Warnungen aus der Suite bleiben unveraendert sichtbar, insbesondere ``--localstorage-file` was provided without a valid path`, CAPE-Fallback-Logs und ein erwarteter Validierungslog fuer `goGoMultiplier`.

## Abweichungen vom Plan

- Der Optimizer-Startpfad wurde als bestehender `applyParametersToForm()`-Contract ohne Fake-Runner umgesetzt. Damit wird die UI-Uebernahme optimaler Parameter ohne lange MC-Laeufe abgesichert; ein echter Auto-Optimize-Run bleibt bewusst Nicht-Scope.
- `app/simulator/simulator-main-init.js`, `simulator-main-profiles.js` und `simulator-main-sweep-selftest.js` werden ueber den Importpfad von `simulator-main.js` geladen, aber nicht vollstaendig in ihrer breiten Browser-Initialisierung ausgefuehrt. Die vollstaendige Seiteninitialisierung bleibt beim Playwright-Smoke aus Slice 4.

## Offene Risiken

- DOM-Mocks decken Orchestrierungs-Contracts ab, aber keine echten Browser-Layout- oder Event-Bubbling-Details. Diese bleiben beim Playwright-Smoke aus Slice 4.
- Der normale `npm test` importiert die Datei nur; der eigentliche DOM-nahe Test muss als isolierter `run-single`-Gate ausgefuehrt werden.

## Rueckdokumentation

- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md` dokumentiert Slice 7 als umgesetzt und verweist auf den isolierten Simulator-UI-Orchestrierungs-Test.

## Review-Feedback von Gemini

### 1. Prüfdimensionen & Detailanalyse

#### Korrektheit
- **Entry-Point-Verdrahtung:** Test 1 prüft erfolgreich, ob `simulator-main.js` die Legacy-Einstiegspunkte (wie `onload`, `runMonteCarlo`, `runBacktest`, `runParameterSweep`, `simulateOneYear`) korrekt auf `window` registriert.
- **Tab-Umschaltung:** Test 2 verifiziert, dass die `initTabSwitching()`-Funktion Klick-Events auf Tab-Buttons abfängt und exakt das gewünschte Panel als aktiv markiert (Klasse `.active`), während andere deaktiviert werden.
- **Simulator-Reset:** Test 3 prüft, ob der Reset-Button gezielt nur simulatorbezogene Storage-Keys (`sim_*`) löscht, anwendungsfremde Keys unangetastet lässt und einen Seiten-Reload anstößt.
- **Control-Persistenz:** Test 4 prüft die Sichtbarkeits-Updates (z. B. Einblenden der Partner-Sektion bei `chkPartnerAktiv`) und die automatische Persistierung von Werten (z. B. `sim_startFloorBedarf`) bei Input-Events.
- **Sweep-Validierung:** Test 5 deckt die korrekte Berechnung der Grid-Kombinationen ab und prüft, ob ungültige oder zu große Eingaben (z. B. über 300 Kombinationen) die UI-Anzeige farblich und textlich blockieren.
- **Optimizer-Übernahme:** Test 6 prüft die fehlerfreie Übernahme von Parametern aus dem Optimizer in die Formularfelder (`applyParametersToForm`), ohne Monte-Carlo-Simulationen ausführen zu müssen.

#### Vertragstreue
- **Prozess-Isolation:** Die Testdatei implementiert eine `shouldRun()`-Prüfung, die eine Ausführung während des standardmäßigen `npm test`-Laufs verhindert. Dies schützt das JSDOM- und Prozess-Setup vor gegenseitiger Verschmutzung. Die Ausführung erfolgt vertragsgemäß separat über `run-single.mjs`.

#### Fehlerbehandlung
- **Rücksetzen globaler Mocks:** Die während des Tests registrierten globalen Browser-Variablen (`window`, `document`, `localStorage`, `confirm` etc.) werden in einem `finally`-Block sauber wiederhergestellt, was den Test-Runner widerstandsfähig gegen Abstürze macht.

#### Seiteneffekte
- **Keine Beeinträchtigung der Unit-Tests:** Die Standard-Suite läuft ungestört und ohne Assertion-Verluste durch.

#### Was könnte brechen?
- **Änderungen in der DOM-Struktur (Risiko):** Neue UI-Elemente, die nicht in `createDomRefs()` oder `registerSweepDom()` gemockt sind, führen zu Null-Pointer-Fehlern. Dies erfordert regelmäßige Aktualisierung der Mocks bei Frontend-Änderungen.

---

### 2. Strukturierte Findings & Blocker

| ID | Schwere | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-S7-01 | RISIKO | Pflegeaufwand für die Mocks bei zukünftigen Änderungen im Simulator-Frontend. | Restrisiko akzeptiert, da Smokes und Contract-Tests komplementär sind. | Keine Änderung. |
| G-S7-02 | HINWEIS | Test setzt voraus, dass die Modul-Initialisierung und die Registrierung auf `window` rein synchron geschehen. | Als Hinweis dokumentiert. | Keine Änderung. |

---

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - Wartungsaufwand für Mock-DOM und Mock-APIs.
- Pre-Mortem:
  > „Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  >
  > Ein Entwickler baut eine asynchrone Bereinigungsroutine (z. B. mit einem `await` auf einen IndexedDB-Zugriff) direkt in den Initialisierungspfad von `simulator-main.js` ein. Da der Test synchron importiert und sofort Assertions auf `window.onload` und andere Handler ausführt, laufen die Assertions ins Leere, weil die Handlers zu diesem Zeitpunkt noch nicht registriert wurden. Der Test schlägt fehl, obwohl der Code im Browser (wo `onload` asynchron wartet) korrekt funktioniert.“

## Freigabestatus

Freigegeben durch Gemini am 2026-06-12.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-S7-01 | Gemini | Wartungsaufwand für DOM-Mocks | Restrisiko akzeptiert | Keine |
| G-S7-02 | Gemini | Synchronitäts-Annahme beim Laden | Hinweis dokumentiert | Keine |

