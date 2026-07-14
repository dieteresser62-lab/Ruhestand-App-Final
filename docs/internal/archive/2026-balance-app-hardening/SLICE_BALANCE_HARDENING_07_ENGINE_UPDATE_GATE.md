# Slice Balance Hardening 07: Engine-Gate und Update-Ergebnis

**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal; Remote-Pruefung am 2026-07-13 ergab keinen gleichnamigen Branch  
**Status:** erledigt; durch Gemini freigegeben und als `81b3544` committed
**Prioritaet:** P1  
**Abhaengigkeit:** Slice 03

## Ziel

Eine inkompatible Engine kann keine Berechnung oder Persistenz ausloesen. Die zentrale Update-Pipeline liefert einen expliziten, maschinenlesbaren Erfolgs- oder Fehlerstatus fuer Abschluss- und Importworkflows.

## Verifizierter Versionsmechanismus

- `engine/config.mjs` exportiert `ENGINE_API_VERSION = "31.0"` und `ENGINE_BUILD_ID`.
- `engine/core.mjs` stellt beide Werte ueber `EngineAPI.getVersion()` als `{ api, build }` bereit.
- `app/balance/balance-config.js` definiert `REQUIRED_ENGINE_API_VERSION_PREFIX = "31."`.
- Das Gate verwendet diesen bestehenden oeffentlichen Contract; eine Konstante `ENGINE_VERSION` wird nicht vorausgesetzt und nicht neu erfunden.

## Akzeptanzkriterien

- Fehlende oder inkompatible Engine-Major-Version blockiert `simulateSingleYear()`.
- Bei blockierter Engine werden weder Balance-State noch Profil-State geschrieben.
- `update()` unterscheidet mindestens `success`, `validation_error`, `engine_error`, `blocked` und gibt den Status an Aufrufer zurueck.
- Normaler debounced UI-Pfad zeigt weiterhin nutzerfreundliche Fehler.
- Jahresabschluss kann anhand des Status sicher abbrechen.
- Cache-Busting veraendert keinen bereits laufenden Engine-Vertrag nach dem Handshake.

## Scope

Programmdateien, maximal 4:

- `app/balance/balance-main.js`
- `app/balance/balance-update-pipeline.js`
- `tests/balance-smoke.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`

## Nicht-Scope

- neue Engine-Version;
- `engine.js`-Build;
- allgemeines Error-UI-Redesign.

## Diff-Risiko vor Start

**Erfasst am:** 2026-07-14 vor dem ersten Code-Edit

**Aktiver Branch:** `codex/balance-app-hardening`

**Git-Status vor Coding:** keine versionierten Aenderungen; bestehende unversionierte Playwright-Dateien unter `node_modules/.bin/`, `node_modules/playwright/` und `node_modules/playwright-core/` bleiben unangetastet.

**Geplante Programmdateien:** `app/balance/balance-main.js`, `app/balance/balance-update-pipeline.js`, `tests/balance-smoke.test.mjs`, `tests/balance-ui-orchestration.test.mjs`.

**Aenderungstiefe:** **riskant** wegen zentralem Bootstrap-/Update-Pfad, aber innerhalb des freigegebenen Vier-Dateien-Scope.

**Gefaehrdete Tests:** Balance Smoke, UI-Orchestrierung, Annual Workflow, Browser Smoke und die vollstaendige Testsuite.

**Nicht anfassen:** `engine/`, `engine.js`, Renderer-Fachlogik, Persistenzadapter und bestehende unversionierte Playwright-Dateien.

**Rollback:** `git checkout -- app/balance/balance-main.js app/balance/balance-update-pipeline.js tests/balance-smoke.test.mjs tests/balance-ui-orchestration.test.mjs`.

## Umsetzungsschritte

1. Bestehenden Contract `EngineAPI.getVersion().api` gegen `REQUIRED_ENGINE_API_VERSION_PREFIX` als fail-closed Gate mit explizitem Ergebnis modellieren.
2. Update-Ergebnisvertrag in Pipeline/Main einfuehren.
3. Persistenz nur bei `success` ausfuehren.
4. Tests fuer kompatibel, inkompatibel, unvollstaendig, ValidationError und EngineError ergaenzen.
5. Spaetes Script-`src`-Umschreiben entfernen oder vor Laden korrekt loesen.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\balance-smoke.test.mjs
node tests\run-single.mjs tests\balance-ui-orchestration.test.mjs
node tests\run-single.mjs tests\balance-annual-workflow-contract.test.mjs
npm test
npm run test:browser
```

## Durchgefuehrte Aenderungen

- Einen fail-closed Engine-Handshake in `balance-update-pipeline.js` eingefuehrt. Er verlangt den bestehenden `EngineAPI.getVersion()`-Contract mit kompatiblem `31.`-Praefix, einen String-Build und `simulateSingleYear()`.
- Den erfolgreichen Handshake als unveraenderlichen Laufzeitvertrag gebunden. Ein fehlendes Handshake, ein ausgetauschtes Engine-Objekt oder ersetzte `getVersion()`-/`simulateSingleYear()`-Methoden blockieren jedes Update vor Eingabelesen, Engine-Aufruf und Persistenz.
- Den maschinenlesbaren Update-Ergebnisvertrag `success`, `validation_error`, `engine_error`, `blocked` ergaenzt. Das bestehende Feld `ok` bleibt fuer Jahresabschluss- und Importaufrufer kompatibel; Gate-Gruende wie `missing_engine`, `invalid_version`, `incompatible_version` und `contract_changed` bleiben maschinenlesbar.
- `update()` und den Bootstrap so umgestellt, dass Persistenz nur nach erfolgreicher Validierung und Engine-Ausfuehrung erreichbar ist. Validation- und Enginefehler laufen weiterhin durch `UIRenderer.handleError()`.
- Das spaete Umschreiben von `script.src` nach dem Engine-Handshake entfernt. Eine neue Engine kann dadurch nur mit einem neuen Seitenladen gebunden werden, nicht mitten in einem laufenden Vertrag.
- Smoke- und UI-Orchestrierungstests fuer kompatible, fehlende, unvollstaendige, inkompatible und nachtraeglich ersetzte Engines sowie Success-, Validation-, Engine- und Blocked-Ergebnisse ergaenzt. Blockierte Engine-Pfade pruefen zusaetzlich, dass weder Simulation noch Local-/Profil-Storage geschrieben werden.

## Ausgefuehrte Tests mit Ergebnis

- `node tests\run-single.mjs tests\balance-smoke.test.mjs` -> gruen; kompatibler Bootstrap, unveraenderter Engine-Scriptpfad, vier Update-Statuspfade, UI-Fehlerausgabe und mutationsfreies Engine-Gate verifiziert.
- `node tests\run-single.mjs tests\balance-ui-orchestration.test.mjs` -> 63/63 Assertions gruen, 0 fehlgeschlagene Dateien.
- `node tests\run-single.mjs tests\balance-annual-workflow-contract.test.mjs` -> 30/30 Assertions gruen, 0 fehlgeschlagene Dateien; fehlerhafter Preflight stoppt weiterhin Snapshot und Jahreswrites.
- `npm test` -> 103 Testdateien, 3291/3291 Assertions gruen, 0 fehlgeschlagene Dateien, 0 offene Handles.
- `npm run test:browser` -> `index.html`, `Balance.html`, `Simulator.html`, `depot-tranchen-manager.html` und `Handbuch.html` gruen.
- `node --check app/balance/balance-update-pipeline.js` und `node --check app/balance/balance-main.js` -> gruen.

## Abweichungen vom Plan

Keine Scope- oder Vertragsabweichung. Der im Slice alternativ formulierte Cache-Busting-Schritt wurde durch vollstaendiges Entfernen des spaeten `script.src`-Umschreibens umgesetzt; vor dem Seitenladen ist kein zusaetzlicher Build-Parameter erforderlich.

## Offene Risiken

- Der Laufzeitvertrag blockiert absichtlich jeden Engine-Hot-Swap nach dem Handshake. Ein Engine-Update wird erst nach einem vollstaendigen Seiten-Reload aktiv.
- Nicht durch Validation oder Engine verursachte Laufzeit-/Persistenzfehler verwenden den fail-closed Status `blocked`; ein eigener `persistence_error`-Status ist nicht Teil dieses Slice.
- `ENGINE_API_VERSION` selbst bleibt in `engine/config.mjs` unveraendert; dieser Slice aendert keine Engine-Datei und baut `engine.js` nicht neu.

## Rueckdokumentation

- Hauptplan markiert Slice 07 als implementiert und Review/Freigabe ausstehend und enthaelt das Testergebnis im Umsetzungsprotokoll.
- `docs/reference/TECHNICAL.md` dokumentiert Engine-Handshake, Laufzeit-Gate, Statusvertrag, `ok`-Kompatibilitaet und persistenzfreien Blocked-Pfad.
- `docs/reference/BALANCE_MODULES_README.md` dokumentiert die erweiterten Verantwortungen von `balance-main.js` und `balance-update-pipeline.js`.

## Freigabestatus

Gemini hat die Implementierung ohne Blocker freigegeben; lokaler Abschluss-Commit: `81b3544`.

## Review-Feedback von Gemini

### 1. Prüfdimensionen

- **Korrektheit vs. Akzeptanzkriterien:**
  - Der Engine-Handshake wurde erfolgreich in `balance-update-pipeline.js` implementiert. Er verlangt das Vorhandensein von `EngineAPI.getVersion()` mit passendem Versionspräfix (`31.`).
  - Eine Dopplung oder Neudefinition von `ENGINE_VERSION` wurde vermieden; stattdessen wird der existierende `api`-Präfix-Check (`REQUIRED_ENGINE_API_VERSION_PREFIX`) konsequent genutzt.
  - Das Gate blockiert jegliche Berechnung oder Speicherung bei inkompatibler, fehlender oder unvollständiger Engine (fail-closed Verhalten).
  - Ein Hot-Swap/Austausch der Engine nach dem Handshake wird über `assertActiveEngineHandshake` sicher blockiert.
  - `update()` liefert nun strukturierte, maschinenlesbare Ergebnisse (`success`, `validation_error`, `engine_error`, `blocked`).
  - Der Smoke-Test `balance-smoke.test.mjs` und die Orchestrierungstests wurden erweitert und prüfen alle Handshake-, Status- und Speicherausschluss-Pfade. Alle 3291 Assertions der Suite sind grün.
- **Vertragstreue:**
  - Der Engine-Contract wird vollständig eingehalten. `EngineAPI.getVersion()` und `EngineAPI.simulateSingleYear()` werden exakt verwendet.
- **Fehlerbehandlung:**
  - Robustes Fail-Closed: Ein Blockieren der Engine verhindert die Ausführung von `update()` und stoppt die Persistenz (`StorageManager.saveState`), bevor Daten verändert werden können.
- **Seiteneffekte:**
  - Das Umschreiben von `script.src` nach dem Handshake wurde entfernt, um Hot-Swaps über die Script-Quelle auszuschließen.
- **Was könnte brechen?**
  - Falls eine Drittkomponente oder ein Import-Pfad direkt `update()` aufruft, ohne auf das geänderte Antwortobjekt (mit Statusfeldern statt einfachem Boolean) vorbereitet zu sein, könnte es zu unvollständigem Verhalten kommen. Die Abwärtskompatibilität über das Feld `ok` fängt dies jedoch weitestgehend ab.

### 2. Findings

- **G7-01 (Minor): Einordnung von unkategorisierten Fehlern unter `blocked`**
  - Tritt in der Update-Pipeline ein unerwarteter Fehler op (z. B. ein Persistenz- oder Datenbankfehler), wird dieser unter der Phase `update` gefangen und liefert den Status `blocked` mit dem Fehlerobjekt. Ein dedizierter Status `persistence_error` existiert nicht.
  - *Empfehlung:* Da dies im Scope von Slice 07 so vereinbart war, ist das Verhalten korrekt. Bei künftigen Härtungen könnte überlegt werden, Persistenzfehler dediziert auszuweisen.
- **G7-02 (Hinweis): Engine-Austausch während Tests**
  - In `balance-ui-orchestration.test.mjs` wird `global.window.EngineAPI` zu Testzwecken temporär ausgetauscht. Durch den Handshake-Check in `update()` wirft dies nun regulär `contract_changed` und liefert `blocked`, falls der Handshake nicht aktualisiert wird. Die Mocks wurden im Test entsprechend angepasst. Dies zeigt die Wirksamkeit der Schutzfunktion.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- Ein Browser-Addon oder eine externe Script-Injektion überschreibt im globalen Window-Scope `window.EngineAPI` nach dem erfolgreichen Handshake. Die App blockiert daraufhin sofort jegliche Eingabeverarbeitung und meldet einen `contract_changed` Fehler. Der Nutzer sieht eine rote Fehlermeldung und kann keine Simulationen mehr ausführen, bis die Störung beseitigt oder die Seite neu geladen wird. Dies ist ein gewolltes Sicherheitsverhalten, führt jedoch zu Support-Fragen.

### 4. Review-Ergebnis

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** Fehlende Ausdifferenzierung von Persistenzfehlern (G7-01).

---

## Review-Antworten von Codex

F-R12 und U-07 sind erfolgreich umgesetzt. Das Review-Feedback von Gemini (G7-01) wurde zur Kenntnis genommen; ein gesonderter Persistenz-Fehlerstatus wird für zukünftige Optimierungen vorgemerkt. Die Hot-Swap-Sicherung arbeitet wie entworfen und schützt den Laufzeitvertrag. Der Status wird auf freigegeben/erledigt gesetzt.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| - | - | Noch kein Review | offen | - |
| F-R12 | Hauptplan-Review | Versionsmechanismus unklar | angenommen | realen oeffentlichen Versionscontract dokumentiert |
