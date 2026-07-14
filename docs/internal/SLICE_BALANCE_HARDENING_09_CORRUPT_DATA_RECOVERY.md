# Slice Balance Hardening 09: Korrupte Persistenz sichtbar behandeln

**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal; Remote-Pruefung am 2026-07-13 ergab keinen gleichnamigen Branch  
**Status:** geplant, Review/Freigabe ausstehend  
**Prioritaet:** P1  
**Abhaengigkeit:** Slice 08

## Ziel

Korrupte Balance-/Ausgabendaten und Warnungen der Persistence Facade werden sichtbar und recoverbar behandelt, statt still mit Leerzustand weiterzuarbeiten.

## Akzeptanzkriterien

- Parsefehler im Ausgabenstore liefern einen strukturierten Korruptionsstatus, keinen normalen leeren Store.
- Korrupter Rohinhalt wird vor einem moeglichen Replace bewahrt oder durch vorhandene Adapterquarantaene referenziert.
- UI zeigt betroffenen Datenbereich, Backend und sichere Optionen: Export/Recovery, Zuruecksetzen nach Bestaetigung, Abbrechen.
- Ohne explizite Nutzerentscheidung wird korrupter Inhalt nicht ueberschrieben.
- `PersistenceFacade.getPersistenceStatus().migrationWarning` wird beim Balance-Start sichtbar gemacht.
- Tests enthalten keine echten Finanzdaten oder lokalen Pfade.

## Scope

Programmdateien, maximal 5:

- `app/balance/balance-expenses-storage.js`
- `app/balance/balance-expenses.js`
- `app/balance/balance-main.js`
- `tests/balance-expenses.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`

## Nicht-Scope

- Adapter-interne Quarantaene neu implementieren;
- Vollbackup-Format aendern;
- allgemeines Recovery-Center fuer alle Apps.

## Diff-Risiko vor Start

Branch/Status vor Coding neu erfassen.  
Aenderungstiefe: **mittel bis riskant** wegen Datenverlustschutz.  
Gefaehrdete Tests: Expenses, UI-Orchestrierung, Persistence, Browser Smoke.  
Nicht anfassen: Adapterdateien, Tauri-Rust, persoenliche Daten.  
Rollback: Scope-Dateien per `git checkout --`.

## Umsetzungsschritte

1. Vor Coding die Aufrufer-Inventur mit `rg -n "loadExpensesStore" app tests` erneut dokumentieren. Stand 2026-07-13: Produktionsaufrufe liegen nur in `balance-expenses-storage.js` selbst und `balance-expenses.js`; Tests greifen ueber `balance-expenses.test.mjs` zu. `balance-main.js` ruft die Funktion nicht direkt auf.
2. Einen kompatiblen Result-Pfad fuer `ok/empty/corrupt` entwerfen. Bevorzugt wird ein neuer expliziter Loader fuer Statusdaten, waehrend der alte Loader nur erhalten bleibt, wenn kein stilles Leeren im Produktivpfad mehr moeglich ist.
3. Schreibpfade bei `corrupt` sperren.
4. Bestehende Persistence-Warnung beim Bootstrap in die Balance-UI weiterreichen.
5. Recovery-/Reset-Aktionen nur nach ausdruecklicher Bestaetigung anbieten und Korruptions-, Quota- und Wiederanlauf-Tests ergaenzen.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\balance-expenses.test.mjs
node tests\run-single.mjs tests\balance-ui-orchestration.test.mjs
node tests\run-single.mjs tests\persistence.test.mjs
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

- Eine Signaturaenderung von `loadExpensesStore()` ist ein Interface-Break. Wenn die erneute Aufrufer-Inventur weitere Produktionsmodule ergibt und dadurch die Stop-Regel in `AGENTS.md` verletzt wird, wird vor dem Edit gestoppt und der Slice geteilt.

## Rueckdokumentation

Recovery-Verhalten und UI-Status im Hauptplan dokumentieren.

## Freigabestatus

Nicht freigegeben.

## Review-Feedback von Gemini

Ausstehend.

## Review-Antworten von Codex

F-R09 wurde angenommen. Die aktuelle Aufruferinventur ist dokumentiert; sie wird vor Coding wiederholt. Ein kompatibler Result-Pfad und die Stop-Regel gemaess `AGENTS.md` sind verbindlich.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| - | - | Noch kein Review | offen | - |
| F-R09 | Hauptplan-Review | moeglicher `loadExpensesStore()`-Interface-Break | angenommen | Caller-Inventur, kompatibler Pfad und Split-Stop ergaenzt |
