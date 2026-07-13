# Slice Balance Hardening 07: Engine-Gate und Update-Ergebnis

**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal; Remote-Pruefung am 2026-07-13 ergab keinen gleichnamigen Branch  
**Status:** geplant, Review/Freigabe ausstehend  
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

Branch/Status vor Coding neu erfassen.  
Aenderungstiefe: **riskant** wegen zentralem Bootstrap/Update.  
Gefaehrdete Tests: Balance Smoke, UI-Orchestrierung, Annual Workflow, Browser Smoke.  
Nicht anfassen: `engine/`, Renderer-Fachlogik, Persistenzadapter.  
Rollback: Scope-Dateien per `git checkout --`.

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

Noch keine.

## Ausgefuehrte Tests mit Ergebnis

Noch keine.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Bestehende Smoke-Mocks verwenden absichtlich eine inkompatible Version und muessen auf den echten Contract angepasst werden.
- `ENGINE_API_VERSION` selbst bleibt in `engine/config.mjs` unveraendert; dieser Slice aendert keine Engine-Datei.

## Rueckdokumentation

Engine-Gate und Update-Status im Hauptplan und in `TECHNICAL.md` nachfuehren.

## Freigabestatus

Nicht freigegeben.

## Review-Feedback von Gemini

Ausstehend.

## Review-Antworten von Codex

F-R12 wurde angenommen. Der tatsaechliche Contract ueber `ENGINE_API_VERSION`, `EngineAPI.getVersion()` und `REQUIRED_ENGINE_API_VERSION_PREFIX` ist verifiziert und ersetzt die nicht vorhandene Bezeichnung `ENGINE_VERSION`.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| - | - | Noch kein Review | offen | - |
| F-R12 | Hauptplan-Review | Versionsmechanismus unklar | angenommen | realen oeffentlichen Versionscontract dokumentiert |
