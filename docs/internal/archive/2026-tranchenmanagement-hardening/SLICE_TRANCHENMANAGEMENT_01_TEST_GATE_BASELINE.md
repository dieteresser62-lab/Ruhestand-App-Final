# Slice Tranchenmanagement 01: Test-Gate und Baseline

**Feature-Branch:** `codex/tranchenmanagement-hardening`
**GitHub-Status:** lokal; Veröffentlichung ausstehend
**Status:** freigegeben
**Abhängigkeit:** freigegebener [Hauptplan](./TRANCHENMANAGEMENT_HARDENING_PLAN.md)
**GAPs:** TM-16, vorbereitend TM-17

## Ziel

Der Standardrunner darf eine entdeckte Testdatei nicht allein wegen eines erfolgreichen Imports als ausgeführt melden. DOM-nahe Tests erhalten einen expliziten Isolationsvertrag und laufen im Standardgate tatsächlich mit Assertions oder werden als separates Pflichtgate eindeutig ausgewiesen.

## Akzeptanzkriterien

- `tranchen-manager-page.test.mjs` führt im Standardgate seine Assertions in einem isolierten Prozess aus.
- Global verunreinigende Tests teilen keinen Prozess mit DOM-freien Tests.
- Eine entdeckte Testdatei mit null Assertions führt zu einem Fehler, sofern sie nicht in einer expliziten, begründeten Policy als separates Gate geführt wird.
- Der Runner berichtet pro Datei Modus und Assertionzahl nachvollziehbar.
- `npm test` bleibt deterministisch, beendet alle Kindprozesse und meldet keine offenen Handles.
- Die Coverage-Baseline wird neu erzeugt und dokumentiert; eine Prozentzielzahl allein ist kein Akzeptanzkriterium.
- Keine Produktivsemantik wird verändert.

## Scope

- Ausführungs- und Isolationspolicy des Node-Test-Runners.
- Bestehende `shouldRun()`-Tests in eine explizite Runnerstrategie überführen.
- Regressionstest gegen assertionslose False-Green-Dateien.
- Testdokumentation aktualisieren.

## Nicht-Scope

- Keine Manager-, Persistenz-, Engine- oder UI-Änderung.
- Keine Browser-E2E-Erweiterung; sie folgt in Slice 09.
- Keine pauschale Coverage-Mindestquote.

## Geplante Programmdateien

Maximal fünf:

- `tests/run-tests.mjs`
- `tests/tranchen-manager-page.test.mjs`
- `tests/profile-ui-contract.test.mjs`
- `tests/coverage-inventory.test.mjs`
- optional neu: `tests/test-execution-policy.test.mjs`

Dokumentation: `tests/README.md`, diese Slice-MD und Hauptplan.

## Git- und Diff-Risiko vor Coding

Die folgenden Werte sind **nicht** vorwegzunehmen. Unmittelbar vor dem ersten Code-Edit müssen hier reale Ausgaben ergänzt werden:

```text
git branch --show-current: codex/tranchenmanagement-hardening
git status --short:
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
```

Die unversionierten Playwright-Dateien waren bereits vor Slice-Beginn vorhanden, liegen
unter dem ausdrücklich ausgeschlossenen Verzeichnis `node_modules/` und werden nicht
verändert.

Geplante Dateien:

- ausschließlich die oben genannten Test-/Runnerdateien und Markdown-Dokumentation.

Voraussichtliche Änderungstiefe:

- mittel; Testorchestrierung und Kindprozess-Lebenszyklus.

Gefährdete bestehende Tests:

- gesamte `npm test`-Ausführung,
- DOM-nahe Profil-/Balance-/Simulator-Orchestrierungstests,
- Open-Handle-Erkennung.

Nicht anfassen:

- `app/`, `engine/`, `workers/`, `src-tauri/`, `engine.js`, `dist/`, `RuheStandSuite.exe`, `node_modules/`.

Rollback-Strategie:

- geänderte Runnerdateien gezielt auf den letzten freigegebenen Slice-Commit zurücksetzen; neue Policy-Testdatei nur nach Freigabe entfernen.

## Geplante Tests

```powershell
node tests/run-single.mjs tests/test-execution-policy.test.mjs
node tests/run-single.mjs tests/tranchen-manager-page.test.mjs
node tests/run-single.mjs tests/profile-ui-contract.test.mjs
npm test
npm run test:coverage
```

Wenn keine neue Policy-Testdatei nötig ist, wird der erste Befehl entfallen und in den Abweichungen begründet.

## Ergebnisse

- Das Standardgate fuehrt `tranchen-manager-page.test.mjs` im isolierten Prozess mit 10 Assertions aus.
- 103 Dateien werden entdeckt; 102 Node-Dateien liefern zusammen 3939 Assertions. Das Browser-Smoke-Gate wird als separates Pflichtgate mit Befehl ausgewiesen.
- Jede ausgefuehrte Datei meldet `mode`, Assertions, bestandene Assertions, fehlgeschlagene Assertions und Dateifehler.
- Null Assertions fuehren im Standardrunner und im Einzelrunner reproduzierbar zu Exit-Code 1.
- Die neue Coverage-Baseline liegt bei 71,20% (24563/34499 Zeilen, 193 Dateien). `tranchen-manager-page.js` steigt von 0% auf 51,30% (118/230).
- Keine Produktivdatei und keine fachliche Semantik wurde geaendert.

## Durchgeführte Änderungen

- `tests/run-tests.mjs`: explizites Policy-Manifest fuer `in-process`, `isolated` und `separate-gate`; per-Datei-Ergebnisse; aggregierte Kindprozess-Assertions; Null-Assertion-Fehler und Open-Handle-Summary.
- `tests/run-single.mjs`: dieselbe Policy fuer Fokuslaeufe, automatische Registrierung des Legacy-Loaders und Null-Assertion-Fehler.
- `tests/legacy-assertion-loader.mjs`: eng begrenzte Laufzeitadaption fuer acht namentlich benannte Alt-Tests mit lokalen/Node-Assertions beziehungsweise dem Headless-Smoke-Guard. Unbekannte Tests werden nicht adaptiert.
- `tests/runner-contract.test.mjs`: Regressionen fuer Import-only False-Green, Policy-Isolation, Legacy-Zaehler, Fehlerzaehlung, separates Browser-Gate und `run-single` mit null Assertions.
- `tests/balance-smoke.test.mjs`: bestehende Throw-Checks semantikgleich auf die gemeinsamen Assertion-Helfer umgestellt.
- `tests/README.md`: Policy, Statistik und Coverage-Baseline dokumentiert.

## Ausgeführte Tests

| Befehl | Ergebnis |
| --- | --- |
| `node tests/run-single.mjs tests/runner-contract.test.mjs` | gruen; 49/49 Assertions |
| `node tests/run-single.mjs tests/tranchen-manager-page.test.mjs` | gruen; 10/10 Assertions |
| `node tests/run-single.mjs tests/profile-ui-contract.test.mjs` | gruen; 14/14 Assertions |
| `node tests/run-single.mjs tests/health-bucket.test.mjs` | gruen; 19/19 Assertions; automatische Legacy-Policy belegt |
| `node tests/run-single.mjs tests/simulator-headless.test.mjs` | gruen; 26/26 Assertions; automatische Headless-Instrumentierung belegt |
| `npm test` | gruen; 103 entdeckt, 102 ausgefuehrt, 3939/3939 Assertions, 0 Dateifehler, 1 separates Gate, 0 offene Handles |
| `npm run test:coverage` | gruen; 71,20% (24563/34499), 193 Dateien; Manager-Page 51,30% |

`npm run test:browser` wurde nicht ausgefuehrt: Der Slice aendert keine Browser-E2E-Semantik; das Gate wird vom Standardrunner jetzt explizit als separater Pflichtbefehl ausgewiesen.

## Abweichungen vom Plan

- Keine neue `test-execution-policy.test.mjs` angelegt; der bereits vorhandene `runner-contract.test.mjs` ist der kanonische Runner-Regressionstest.
- `tranchen-manager-page.test.mjs`, `profile-ui-contract.test.mjs` und `coverage-inventory.test.mjs` benoetigten keine Dateiaenderung; die zentrale Policy fuehrt sie korrekt aus beziehungsweise nimmt ihre Laufzeit-Coverage auf.
- Das Null-Assertion-Gate deckte neun weitere Alt-Tests mit lokalen oder Throw-basierten Checks auf. Innerhalb des Limits von fuenf Programmdateien wurden deshalb `run-single.mjs`, ein zentraler Legacy-Loader und die semantikgleiche Assertion-Umstellung im Balance-Smoke einbezogen.
- Die Coverage-Prozentzahl sank durch den groesseren, nun sichtbaren Nenner von 74,02% auf 71,20%, obwohl die Zahl abgedeckter Zeilen von 23023 auf 24563 stieg. Dies ist eine Baseline-Korrektur, kein fachliches Akzeptanzkriterium.

## Offene Risiken

- Das Legacy-Loader-Mapping ist bewusst datei- und helperformgebunden. Aendert ein Alt-Test seine Helper-Struktur, faellt er fail-closed auf null Assertions; dann muss er auf den gemeinsamen Contract migriert oder die Transformation bewusst angepasst werden.
- Isolierte Ausfuehrung erhoeht die Laufzeit und das Logvolumen der Node-Suite, war im lokalen Lauf aber deterministisch und hinterliess keine offenen Handles.
- Das Browser-Pflichtgate ist nur ausgewiesen, nicht Bestandteil von `npm test`; CI/Release muss weiterhin `npm run test:browser` separat aufrufen.

## Rückdokumentation

- Assertionzahlen, Isolationspolicy und neue Coverage-Baseline sind im Hauptplan und in `tests/README.md` eingetragen.

## Freigabestatus

Freigegeben (Gemini-Review abgeschlossen, Claude-Review ausstehend).

## Review-Feedback von Gemini

### 1. Prüfdimensionen

* **Korrektheit vs. Akzeptanzkriterien:** Alle Akzeptanzkriterien des Slice sind vollständig erfüllt. Die zuvor stummen `throw`-Checks in `balance-smoke.test.mjs` wurden in echte, vom Runner gezählte Assertions umgeschrieben. Das Null-Assertion-Gate greift zuverlässig bei import-only Dateien.
* **Vertragstreue:** Der Vertrag des Runners wurde durch `runner-contract.test.mjs` vorbildlich abgesichert. Die Schnittstellen des Runners verhalten sich vollständig spezifikationsgemäß.
* **Fehlerbehandlung:** Robuste Handhabung von Dateifehlern (z. B. bei Abstürzen im Kindprozess ohne Assertions-Reporting) wurde belegt.
* **Seiteneffekte:** Die Isolation über `spawnSync` trennt DOM-Mocks wirksam von anderen Tests, wodurch Nebeneffekte ausgeschlossen sind.
* **Was könnte brechen:** Bei zukünftigen Änderungen an Alt-Testdateien, die durch den Loader instrumentiert werden, könnten veränderte Helper-Signaturen das Regex-Parsing brechen. Der Runner reagiert darauf jedoch robust (fail-closed, da dann 0 Assertions gezählt werden).

### 2. Findings

* **G1-01 (Node.js Versionsabhängigkeit):** Der Loader verwendet das `register()`-API, das Node.js >= 20.6.0 erfordert.
  * *Entscheidung:* Akzeptiertes Restrisiko, da die Suite auf modernen LTS-Systemen läuft. Ein expliziter Node-Versionscheck ist vorerst nicht zwingend erforderlich.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
> Ein Entwickler modifiziert einen der acht instrumentierten Alt-Tests und verändert die syntaktische Struktur der Helper-Funktion (z. B. durch Formatierungsänderungen). Der Loader matcht die Funktion per Regex nicht mehr, wodurch der Helper nicht durch die instrumentierte Version ersetzt wird. Die Suite scheitert dann beim Ausführen, da die Datei mit 0 Assertions abgebrochen wird. Dies ist zwar ein Fail-Closed, erfordert aber manuelle Pflege der Regex-Muster im Loader oder eine direkte Umstellung des Alt-Tests auf die modernen Assertions.

### 4. Review-Ergebnis

* **Status:** freigegeben
* **Blocker:** keine
* **Restrisiken:**
  * Regex-Sensitivität des `legacy-assertion-loader.mjs` bei strukturellen Änderungen an den betroffenen Alt-Tests.
  * Abhängigkeit von Node.js >= 20.6.0 für die Testausführung.

## Review-Feedback von Claude

Ausstehend: Prüfdimensionen, Findings, Pre-Mortem, Ergebnis.

## Review-Antworten von Codex

Ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| - | - | Noch kein Review | offen | - |
