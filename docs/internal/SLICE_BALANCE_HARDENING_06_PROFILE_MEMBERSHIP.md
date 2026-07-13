# Slice Balance Hardening 06: Persistente Profilmitgliedschaft

**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal; Remote-Pruefung am 2026-07-13 ergab keinen gleichnamigen Branch  
**Status:** geplant, Review/Freigabe ausstehend  
**Prioritaet:** P1  
**Abhaengigkeit:** Slice 01

## Ziel

Die gespeicherte Entscheidung `belongsToHousehold` bleibt beim Start erhalten. Nur neue Profile erhalten einen dokumentierten Default.

## Akzeptanzkriterien

- Ein explizit ausgeschlossenes Profil bleibt nach Reload ausgeschlossen.
- Initialisierung schreibt nicht pauschal `true` fuer alle Profile.
- Neu angelegte beziehungsweise Legacy-Profile ohne Wert erhalten genau den festgelegten Default.
- Nicht ausgewaehlte Profile beeinflussen keine Balance-Aggregate oder Actions.
- Checkboxen spiegeln den gespeicherten Zustand.

## Scope

Programmdateien, maximal 3:

- `app/balance/balance-main-profilverbund.js`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/profile-storage.test.mjs`

Funktionsgrenze in `balance-main-profilverbund.js`: Dieser Slice aendert nur `initProfilverbundBalance()` und unmittelbar zugehoerige Initialisierungs-/Membership-Helfer. Die in Slice 01 geaenderten Pfade `buildProfileEngineInput()`, `runProfilverbundProfileSimulations()` und Allokationslogik sind Basis und duerfen hier nicht erneut fachlich veraendert werden.

## Nicht-Scope

- Profil-CRUD-Redesign;
- Simulator-Profilselektion;
- Bedarfsallokation aus Slice 01.

## Diff-Risiko vor Start

Branch/Status vor Coding neu erfassen.  
Aenderungstiefe: **mittel**. Merge-/Ueberschneidungsrisiko mit Slice 01 ist explizit vorhanden; vor Coding wird der nach Slice 01 commitierte Diff von `balance-main-profilverbund.js` gegen die oben definierte Funktionsgrenze geprueft.  
Gefaehrdete Tests: Profil-Storage, UI-Orchestrierung, Profilverbund.  
Nicht anfassen: Registry-Schema, sofern Default ohne Migration darstellbar; Engine/Simulator.  
Rollback: Scope-Dateien per `git checkout --`.

## Umsetzungsschritte

1. Initialisierungs-Write entfernen beziehungsweise auf fehlenden Wert begrenzen.
2. Default fuer Legacy-/Neuprofile zentral nachvollziehbar machen.
3. Reload- und Opt-out-Tests ergaenzen.
4. Aggregationsausschluss als End-to-End-Contract im Modulmock pruefen.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\balance-ui-orchestration.test.mjs
node tests\run-single.mjs tests\profile-storage.test.mjs
node tests\run-single.mjs tests\profilverbund-balance.test.mjs
npm test
```

## Durchgefuehrte Aenderungen

Noch keine.

## Ausgefuehrte Tests mit Ergebnis

Noch keine.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Default `true` oder `false` fuer Legacy-Profile muss gegen bestehende Produktentscheidung geprueft werden.

## Rueckdokumentation

Profilmitgliedschaftscontract im Hauptplan aktualisieren.

## Freigabestatus

Nicht freigegeben.

## Review-Feedback von Gemini

Ausstehend.

## Review-Antworten von Codex

F-R08 wurde angenommen. Der Slice ist auf `initProfilverbundBalance()`/Membership-Initialisierung begrenzt und muss den freigegebenen Slice-01-Diff als Basis pruefen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| - | - | Noch kein Review | offen | - |
| F-R08 | Hauptplan-Review | Scope-Ueberschneidung mit Slice 01 | angenommen | Funktionsgrenze und Merge-Risiko dokumentiert |
