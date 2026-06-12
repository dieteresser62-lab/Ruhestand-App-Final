# Slice Test Coverage 04: Browser-Smoke-Gates

**Feature-Branch:** `codex/test-coverage-expansion`  
**GitHub-Status:** nicht veroeffentlicht in diesem Slice  
**Status:** umgesetzt und freigegeben


## Ziel

Die wichtigsten HTML-Einstiege werden in einem echten Browser ueber einen vom Testskript verwalteten lokalen HTTP-Server geladen. Das Gate prueft minimale UI-Aktionen und sammelt Console-Errors der Schwere `error`.

## Akzeptanzkriterien

- `index.html`, `Balance.html`, `Simulator.html`, `depot-tranchen-manager.html` und `Handbuch.html` haben je einen automatisierten Playwright-Smoke.
- Das Browser-Gate laeuft separat ueber `npm run test:browser` bzw. `node tests\browser-smoke.test.mjs`.
- Der HTTP-Server wird im Testskript gestartet und gestoppt.
- Die Portwahl erfolgt dynamisch ueber Port `0`.
- Externe Requests werden blockiert oder lokal beantwortet, sodass keine echte Netzwerkpflicht entsteht.
- Console-Errors und Page-Errors werden gesammelt und mit Seitennamen ausgegeben.

## Scope

- Neue Browser-Testinfrastruktur fuer HTML-Einstiege.
- Package-Script fuer das separate Browser-Gate.
- Dokumentation der Ausfuehrung und Ergebnisse.

## Nicht-Scope

- Keine Aenderung an fachlicher App-Logik.
- Keine Aufnahme des Browser-Gates in `npm test`.
- Keine Tauri- oder Release-Gates.
- Keine manuelle Bearbeitung von `engine.js`, `dist/` oder Release-Artefakten.

## Git-Status vor Start

Branch:

```text
codex/test-coverage-expansion
```

Status:

```text
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
```

Keine geaenderten Dateien wurden ausgegeben.

## Diff-Risiko-Block

Geplante Dateien:

- `tests/browser-smoke.test.mjs`
- `package.json`
- `package-lock.json`
- `docs/internal/SLICE_TEST_COVERAGE_04_BROWSER_SMOKE.md`
- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`

Voraussichtliche Änderungstiefe:

- mittel

Gefährdete bestehende Tests:

- `npm test` sollte unveraendert bleiben.
- `node tests\browser-smoke.test.mjs` haengt von installierten Playwright-Browser-Binaries ab.

Nicht anfassen:

- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- fachliche Engine-/UI-Semantik

Rollback-Strategie:

- `git checkout -- package.json package-lock.json docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md`
- Neue Dateien `tests/browser-smoke.test.mjs` und diese Slice-Datei nur nach Freigabe entfernen.

## Geplante Tests

```powershell
npm test
node tests\browser-smoke.test.mjs
```

## Durchgefuehrte Änderungen

- `tests/browser-smoke.test.mjs` angelegt:
  - startet einen lokalen statischen HTTP-Server auf dynamischem Port `0`,
  - bedient Projektdateien ohne `file://`,
  - blockiert bzw. beantwortet externe Font-Requests lokal,
  - sammelt `console.error` und `pageerror`,
  - prueft `index.html`, `Balance.html`, `Simulator.html`, `depot-tranchen-manager.html` und `Handbuch.html`.
- `package.json` um `test:browser` erweitert.
- `playwright` als Dev-Dependency in `package.json` und `package-lock.json` eingetragen.
- Uebergeordnete Checkliste im Arbeitsplan fuer Browser-Smoke-Gates aktualisiert.

## Ausgefuehrte Tests

```powershell
node tests\browser-smoke.test.mjs
```

Ergebnis: erfolgreich. Gepruefte Einstiege:

- `index.html`
- `Balance.html`
- `Simulator.html`
- `depot-tranchen-manager.html`
- `Handbuch.html`

```powershell
npm test
```

Ergebnis: erfolgreich.

- 83 Testdateien gefunden.
- 2206 Assertions bestanden.
- 0 fehlgeschlagene Assertions.
- 0 fehlgeschlagene Dateien.
- 0 offene Handles.

Hinweis: `browser-smoke.test.mjs` hat einen Direct-Run-Guard. Beim normalen `npm test` wird die Datei zwar wegen Namensmuster importiert, startet den Browser-Smoke aber nicht. Das eigentliche Browser-Gate laeuft ueber `node tests\browser-smoke.test.mjs` bzw. `npm run test:browser`.

## Abweichungen vom Plan

- Playwright war initial nicht installiert. `npm install` war wegen Sandbox-/Netzwerkzugriff nur mit Freigabe moeglich.
- Der Playwright-Chromium-Browser musste einmalig ueber `npx playwright install chromium` installiert werden.
- Durch `npm install` erzeugte lokale `node_modules`-Aenderungen wurden wieder aus dem Git-Diff entfernt; versioniert bleiben nur `package.json` und `package-lock.json`.

## Offene Risiken

- Playwright selbst und die Browser-Binaries muessen lokal verfuegbar sein. Falls die Browser-Binaries fehlen, ist `npx playwright install chromium` die Setup-Voraussetzung.
- Die Smoke-Aktionen sind bewusst minimal. Tiefe fachliche UI-Orchestrierung bleibt Scope spaeterer Slices.

## Rueckdokumentation

- `docs/internal/TESTABDECKUNG_ERWEITERUNGSPLAN.md` markiert das Browser-Smoke-Gate in der Review-Checkliste als umgesetzt und verweist auf Slice-Datei, Testskript und `npm run test:browser`.

## Review-Feedback von Gemini

### 1. Prüfdimensionen & Detailanalyse

#### Korrektheit
- **Harte Timeouts vs. Asynchrone Fehler (Risiko):** In `tests/browser-smoke.test.mjs` werden nach Interaktionen harte Timeouts (`waitForTimeout(350)` in `Balance.html` und `waitForTimeout(500)` in `Simulator.html`) verwendet. Wenn Berechnungen oder Render-Vorgänge auf langsameren Systemen länger dauern, bricht der Test ab und schließt den Browser, bevor verzögerte Console- oder Page-Errors erfasst werden können. Dies kann zu unvollständiger Fehlerabdeckung führen.
- **Wartebedingungen bei Navigation:** In `runManualSmoke` wird nach einem Tab-Wechsel `waitForTimeout(150)` aufgerufen, bevor die Anzahl der aktiven Tabs validiert wird. Es wäre robuster, direkt auf die Zustandsänderung (z. B. Vorhandensein der Klasse `.active` auf dem Ziel-Tab) zu warten.

#### Vertragstreue
- **Direct-Run-Guard:** Der Check `isMain` stellt zuverlässig sicher, dass `main()` nicht ausgeführt wird, wenn die Datei im Rahmen von `npm test` importiert wird.
- **Dynamischer Port:** Die Verwendung von Port `0` wird im Server-Setup eingehalten, was Port-Kollisionen bei parallelen Testläufen verhindert.

#### Fehlerbehandlung
- **Robuster Test-Server:** Der statische Express-Ersatz-Server unterbindet Verzeichnis-Traversierungen (`..` Checks) und liefert bei Dateifehlern korrekte HTTP-Statuscodes (403, 404, 500) zurück, ohne das Skript abstürzen zu lassen.
- **Externe Requests:** Die Playwright-Interzeption blockiert externe Netzwerkaufrufe sauber bzw. beantwortet Font-Requests lokal, was Offline-Stabilität garantiert.

#### Seiteneffekte
- **TestSuite-Verschmutzung:** Obwohl der Direct-Run-Guard eine Ausführung in `npm test` verhindert, wird die Datei aufgrund der Endung `.test.mjs` geladen. Falls Syntaxfehler oder Modulauflösungsfehler in Playwright vorliegen, schlägt `npm test` fehl, obwohl die Browser-Smokes gar nicht Teil des Standard-Runs sind.

#### Was könnte brechen?
- Falls Playwright-Binaries im CI-System oder offline fehlen, stürzt der Run mit einem harten Startfehler ab. Dies ist als Gate-Verhalten gewollt, erfordert jedoch eine saubere Dokumentation des Setups (`npx playwright install chromium`).

---

### 2. Strukturierte Findings & Blocker

| ID | Schwere | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-S4-01 | RISIKO | Harte Timeouts (`waitForTimeout`) können verzögerte asynchrone Berechnungsfehler maskieren oder zu Flakiness führen. | Akzeptiert als Restrisiko. Zukünftige UI-Tests müssen auf konkrete DOM-Zustände warten. | Keine Änderung in diesem Slice. |
| G-S4-02 | HINWEIS | Fehlende MIME-Typen (z. B. `.woff2`) im Test-Server führen zu Fallback-Typen. | Akzeptiert, da externe Schriften abgefangen werden. | Keine Änderung. |
| G-S4-03 | HINWEIS | Das Dateinamensmuster `.test.mjs` führt zum Laden in `npm test`, was Syntaxfehler-Bleeding in die Unit-Suite riskiert. | Akzeptiert. Empfehlung: Zukünftig Namensschema für Browser-Tests abgrenzen. | Keine Änderung. |

---

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - Maskierung von Berechnungsfehlern durch zu frühes Beenden der Seite nach Klicks.
  - Mitnahme-Fehler in `npm test` bei Syntaxfehlern in Playwright-Dateien.
- Pre-Mortem:
  > „Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  >
  > Auf einer extrem ausgelasteten virtuellen CPU in einem CI-Runner benötigt die Initialberechnung des Simulators nach dem Klick auf `#btButton` 600 ms statt der erwarteten 500 ms. Der Test schließt die Seite nach 500 ms und meldet Erfolg, während 100 ms später im geschlossenen Kontext ein fataler Fehler auftritt. Der Fehler wird nicht gemeldet und gelangt in die Produktion.“

## Freigabestatus

Freigegeben durch Gemini am 2026-06-12.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-S4-01 | Gemini | Harte Timeouts können asynchrone Fehler maskieren | Restrisiko akzeptiert | Keine |
| G-S4-02 | Gemini | Fehlende MIME-Typen im Test-Server | Hinweis dokumentiert | Keine |
| G-S4-03 | Gemini | Dateinamensmuster `.test.mjs` führt zu Import in `npm test` | Empfehlung dokumentiert | Keine |

