# Slice Balance Hardening 11: Browser-E2E und Dokumentationsgates

**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal; Remote-Pruefung am 2026-07-13 ergab keinen gleichnamigen Branch  
**Status:** geplant, Review/Freigabe ausstehend  
**Prioritaet:** P2  
**Abhaengigkeit:** Slices 01 bis 10 freigegeben und gruen

## Ziel

Die korrigierten Balance-Contracts werden in echten Browserablaeufen geprueft und in allen betroffenen Referenzen widerspruchsfrei dokumentiert.

## Akzeptanzkriterien

- Browser-E2E prueft mindestens Profilabwahl nach Reload, Engine-Mismatch-Gate, Jahresprozess-Doppelklick, fehlgeschlagenen Preflight und erfolgreichen einmaligen Commit.
- Marktdaten-/Inflationsnetzwerk wird deterministisch geroutet; keine echte externe Abhaengigkeit im Test.
- Import-Reject und Korruptionswarnung sind im Browser sichtbar und veraendern keine Daten.
- Keine Console-/Page-Errors oder offenen Handles.
- Hauptplan und alle Slices enthalten tatsaechliche Ergebnisse, Abweichungen, Restrisiken und Freigabestatus.
- README, Technical, Balance-Moduluebersicht, Datenquellen- und Testdoku stimmen ueberein.

## Scope

Programmdateien, maximal 1:

- `tests/browser-smoke.test.mjs` oder eine neue dedizierte Balance-E2E-Testdatei, aber nicht beides ohne erneuten Scope-Check

Dokumentation:

- `README.md`
- `docs/reference/TECHNICAL.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/DATA_SOURCES.md`
- `tests/README.md`
- `docs/internal/PROJEKTUEBERSICHT.md`
- `docs/internal/BALANCE_APP_HARDENING_PLAN.md`
- alle zugehoerigen Slice-Dateien

## Nicht-Scope

- weitere Produktivcode-Fixes; ein neuer Defekt fuehrt zur Rueckkehr in den verantwortlichen Slice;
- Tauri-Release-Build;
- Simulator-E2E.

## Diff-Risiko vor Start

Branch/Status vor Coding neu erfassen und alle geaenderten Dateien gegen die abgeschlossenen Slices pruefen.  
Aenderungstiefe: **mittel**.  
Gefaehrdete Tests: Browser Smoke und komplette Suite.  
Nicht anfassen: Produktivcode, `engine.js`, `dist/`, Release-EXE.  
Rollback: Testdatei und Doku per `git checkout --`; neue Testdatei nur nach Freigabe entfernen.

## Umsetzungsschritte

1. Deterministische Browser-Fixtures fuer Profile, Periodenstate, Engine-Version und Fetch-Routen anlegen.
2. Kritische Nutzerablaeufe testen.
3. Gesamtsuite, Browser-Gate und Coverage ausfuehren.
4. Referenzdokumentation und Modulanzahl aktualisieren.
5. Slice-Ergebnisse und offene Restrisiken in den Hauptplan zurueckschreiben.

## Testdatei-Grenze

Die E2E-Faelle muessen innerhalb der Datei isolierte Fixtures, eigene Storage-Baselines und getrennte Browser-Contexts verwenden. Wenn die gewaehlte Testdatei durch diesen Slice mehr als 500 Zeilen erreicht oder die Isolation nur durch gemeinsame globale Zustandslogik moeglich waere, wird vor weiterer Bearbeitung gestoppt und eine Aufteilung in einen separaten Folgeslice vorgeschlagen. Die Programmdatei-Grenze wird nicht still erweitert.

## Geplante Tests

```powershell
npm test
npm run test:browser
npm run test:coverage
```

## Durchgefuehrte Aenderungen

Noch keine.

## Ausgefuehrte Tests mit Ergebnis

Noch keine.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Playwright-Abhaengigkeiten liegen derzeit als fremder Arbeitsbaumzustand unter `node_modules`; sie duerfen nicht Teil eines Commits werden.
- Echte Tauri-Laufzeit bleibt ausserhalb dieses Slice und muss bei spaeterem Release separat gebaut werden.

## Rueckdokumentation

Dieser Slice schliesst den Hauptplan, aktualisiert die Statustabelle und bereitet die Archivierung nach Review/Freigabe vor.

## Freigabestatus

Nicht freigegeben.

## Review-Feedback von Gemini

Ausstehend.

## Review-Antworten von Codex

F-R11 wurde angenommen. Test-Isolation ist Pflicht; bei mehr als 500 Zeilen wird gestoppt und ein eigener Folgeslice vorgeschlagen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| - | - | Noch kein Review | offen | - |
| F-R11 | Hauptplan-Review | eine Datei fuer umfangreiche E2E-Faelle | angenommen | Isolations- und 500-Zeilen-Stop-Regel ergaenzt |
