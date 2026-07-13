# Slice Balance Hardening 08: Schema-validierter Balance-Import

**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal; Remote-Pruefung am 2026-07-13 ergab keinen gleichnamigen Branch  
**Status:** geplant, Review/Freigabe ausstehend  
**Prioritaet:** P1  
**Abhaengigkeit:** Slice 07

## Ziel

Ein Balance-JSON-Import wird vor jeder Mutation nach App-ID, Schema, Version und fachlichen Pflichtfeldern validiert und erzeugt einen Recovery-Punkt.

## Akzeptanzkriterien

- Falsche App-ID, nicht unterstuetzte Version, falscher Shape und ungueltige Kernwerte veraendern keine Live-Daten.
- Legacy-Importe laufen nur ueber explizite, getestete Migrationen.
- Vor ersetzendem Import entsteht ein Recovery-Snapshot oder gleichwertiger Rueckfallpunkt.
- Dry-Run und persistenter Replace sind getrennt und atomar.
- Engine-/Update-Validierung muss vor Erfolgsmeldung gruen sein.
- Fehler nennen Ursache und Handlungsoption ohne Payload-Leak.

## Scope

Programmdateien, maximal 4:

- `app/balance/balance-binder-imports.js`
- `app/balance/balance-storage.js`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/balance-storage-contract.test.mjs`

## Nicht-Scope

- kompletter Profilbundle-Import;
- Vollbackup-UI;
- CSV-Marktdatenimport aus Slice 10.

## Diff-Risiko vor Start

Branch/Status vor Coding neu erfassen.  
Aenderungstiefe: **riskant** wegen ersetzender Persistenzoperation.  
Gefaehrdete Tests: Import/UI, Storage, Snapshot, Persistence.  
Nicht anfassen: Profilbundle-IO, Adapterimplementierungen, reale Exportdateien.  
Rollback: Scope-Dateien per `git checkout --`.

## Umsetzungsschritte

1. Balance-Export-/Import-Schema und unterstuetzte Versionen definieren.
2. Pure Validierung und Legacy-Migration vor `saveState()` einfuehren.
3. Recovery-Snapshot vor Replace erstellen.
4. Update-Ergebnis aus Slice 07 fuer den Dry-Run verwenden.
5. Negative und Rollback-Tests ergaenzen.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\balance-ui-orchestration.test.mjs
node tests\run-single.mjs tests\balance-storage-contract.test.mjs
node tests\run-single.mjs tests\snapshot-archive.test.mjs
node tests\run-single.mjs tests\persistence.test.mjs
npm test
```

## Durchgefuehrte Aenderungen

Noch keine.

## Ausgefuehrte Tests mit Ergebnis

Noch keine.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Recovery-Snapshot muss auch bei lokalem Fallback ohne Quota-Verlust moeglich sein; andernfalls Import blockieren.

## Rueckdokumentation

Importformat, Versionierung und Recovery im Hauptplan dokumentieren.

## Freigabestatus

Nicht freigegeben.

## Review-Feedback von Gemini

Ausstehend.

## Review-Antworten von Codex

Ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| - | - | Noch kein Review | offen | - |
