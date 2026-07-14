# Slice Balance Hardening 08: Schema-validierter Balance-Import

**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal; Remote-Pruefung am 2026-07-13 ergab keinen gleichnamigen Branch  
**Status:** implementiert, Review/Freigabe ausstehend
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

**Erfasst am:** 2026-07-14, vor dem ersten Code-Edit
**Aktiver Branch:** `codex/balance-app-hardening` (entspricht dem Feature-Branch)
**Git-Status vor Start:** keine versionierten Aenderungen; unversionierte, bereits bestehende Playwright-Dateien ausschliesslich unter `node_modules/` (`node_modules/.bin/playwright*`, `node_modules/playwright/`, `node_modules/playwright-core/`). Diese Fremddateien sind nicht Teil des Slice und bleiben unangetastet.

**Geplante Dateien:**

- `app/balance/balance-binder-imports.js`
- `app/balance/balance-storage.js`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/balance-storage-contract.test.mjs`
- diese Slice-MD und die Status-Rueckdokumentation im Hauptplan

**Voraussichtliche Aenderungstiefe:** **riskant** wegen ersetzender Persistenzoperation.
**Gefaehrdete bestehende Tests:** Import/UI, Storage, Snapshot, Persistence sowie Update-/Engine-Gate aus Slice 07.
**Nicht anfassen:** Profilbundle-IO, Adapterimplementierungen, Engine/`engine.js`, reale Exportdateien und die unversionierten Playwright-Dateien unter `node_modules/`.
**Rollback-Strategie:** `git checkout -- app/balance/balance-binder-imports.js app/balance/balance-storage.js tests/balance-ui-orchestration.test.mjs tests/balance-storage-contract.test.mjs docs/internal/SLICE_BALANCE_HARDENING_08_IMPORT_RECOVERY.md docs/internal/BALANCE_APP_HARDENING_PLAN.md`

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

- Neues maschinenlesbares Export-/Importformat eingefuehrt: `appId: "ruhe-stand-suite.balance"`, `schema: "balance-state"`, `schemaVersion: 1`, `appVersion`, `exportedAt` und `payload`. Auch der Export validiert den fachlichen Payload und erzeugt keine formal aktuelle, aber unbrauchbare Datei.
- Pure Normalisierung vor jeder Mutation implementiert. Pflichtwerte sind `aktuellesAlter` (ganze Zahl 1 bis 130), `floorBedarf` und `flexBedarf`; zusaetzliche finanzielle Kernwerte muessen endlich und nichtnegativ sein, `minimumFlexAnnual` darf `flexBedarf` nicht uebersteigen und optionale Inflations-/Tax-State-Kernwerte werden geprueft.
- Unversionierte Rohobjekte sowie falsche App-ID, falsches Schema und unbekannte Versionen werden abgewiesen. Legacy-Unterstuetzung existiert ausschliesslich als explizite, getestete Migration der frueheren v21.1- und v22.0-Envelopes; historische Inflation-/Tax-State-Fehlwerte werden dort benannt normalisiert.
- Importablauf auf den Slice-07-Ergebnisvertrag umgestellt: importierte Eingaben werden temporaer angewandt, `update({ persist: false })` muss erfolgreich sein, erst danach darf Storage erreicht werden.
- `StorageManager.replaceStateFromImport()` flusht offene Writes, erfasst den aktuellen erlaubten Live-Zustand als `balance-import-recovery`, bestaetigt den Snapshot per Readback und ersetzt anschliessend ausschliesslich den Balance-State-Key ueber `PersistenceFacade.replaceLiveRecords()`.
- Das persistente Abschluss-`update()` muss erneut erfolgreich sein. Bei einem spaeten Fehler liest `rollbackImportReplace()` den bestaetigten Recovery-Snapshot und stellt alle darin erfassten erlaubten Live-Daten sowie der Handler den vorherigen sichtbaren DOM-Zustand wieder her.
- Snapshot-/Quota-/Adapterfehler blockieren vor dem Replace. Importfehler enthalten feste Ursache und Handlungsoption, aber weder Rohpayload noch Parserdetails.
- Tests fuer aktuelles Format, beide Legacy-Vertraege, falsche App/Version/Shape/Kernwerte, Dry-Run, Reihenfolge, Quota-Stop, Recovery-Inhalt und automatischen Voll-Rollback ergaenzt.

## Ausgefuehrte Tests mit Ergebnis

- `node tests\run-single.mjs tests\balance-ui-orchestration.test.mjs` -> 106/106 Assertions gruen, 0 fehlgeschlagene Dateien.
- `node tests\run-single.mjs tests\balance-storage-contract.test.mjs` -> 38/38 Assertions gruen, 0 fehlgeschlagene Dateien.
- `node tests\run-single.mjs tests\snapshot-archive.test.mjs` -> 21/21 Assertions gruen, 0 fehlgeschlagene Dateien.
- `node tests\run-single.mjs tests\persistence.test.mjs` -> 202/202 Assertions gruen, 0 fehlgeschlagene Dateien.
- `npm test` -> 103 Testdateien, 3305/3305 Assertions gruen, 0 fehlgeschlagene Dateien, 0 offene Handles.
- `npm run test:browser` -> `index.html`, `Balance.html`, `Simulator.html`, `depot-tranchen-manager.html` und `Handbuch.html` gruen.
- `node --check` fuer beide geaenderten Quellmodule und beide geaenderten Testdateien -> gruen.
- `git diff --check` -> gruen.

## Abweichungen vom Plan

- Kein Programmdatei-Scope erweitert; exakt die vier geplanten Programmdateien wurden geaendert.
- Zusaetzlich zu Slice- und Hauptplan werden `docs/reference/TECHNICAL.md` und `docs/reference/BALANCE_MODULES_README.md` synchronisiert, weil Importformat, Modulverantwortung und Recovery-Workflow einen dokumentierten App-Vertrag bilden.
- Der Export wurde innerhalb von Umsetzungsschritt 1 ebenfalls fail-closed abgesichert, damit die App keine v1-Datei erzeugt, die ihre eigene Importvalidierung ablehnen wuerde.

## Offene Risiken

- Der localStorage-Fallback kann bei knapper Quota keinen Recovery-Snapshot schreiben; der Import blockiert dann bewusst vor dem Replace. IndexedDB/Tauri nutzen getrennte Snapshot-Ablagen, koennen aber ebenfalls bei Adapter-/Berechtigungsfehlern blockieren.
- Nur die historisch nachgewiesenen v21.1-/v22.0-Envelopes werden migriert. Aeltere oder manuell veraenderte Dateien benoetigen eine gesonderte, versionierte Migration und werden nicht heuristisch geraten.
- `appVersion` ist informativ; die Kompatibilitaetsentscheidung erfolgt ueber `schemaVersion`. Eine spaetere Schemaaenderung benoetigt eine neue explizite Migration.
- Der echte native Dateiauswahldialog ist noch kein eigener Browser-E2E-Fall; die Handler-/File-Contracts sind DOM-nah getestet, das uebergeordnete Browser-E2E-Gate folgt in Slice 11.

## Rueckdokumentation

- Importformat, Versionierung, Legacy-Grenze, Dry-Run/Replace-Reihenfolge und Recovery-/Rollback-Vertrag sind im Hauptplan dokumentiert.
- Technische Modul- und Persistenzreferenzen sind in `docs/reference/TECHNICAL.md` und `docs/reference/BALANCE_MODULES_README.md` synchronisiert.

## Freigabestatus

Nicht freigegeben; Implementierung abgeschlossen, adversariales Review durch Gemini/Claude/Nutzer ausstehend.

## Review-Feedback von Gemini

### 1. Prüfdimensionen

- **Korrektheit vs. Akzeptanzkriterien:**
  - Der Import prüft `appId`, `schema` und `schemaVersion` korrekt ab, um inkompatible oder fremde Dateien sicher abzuweisen.
  - Das importierte JSON-Dokument wird vor jeder Mutation gegen die fachlichen Pflichtfelder (`aktuellesAlter` im Bereich 1-130, `floorBedarf` und `flexBedarf`) validiert.
  - Die UI-Eingabewerte werden vor der Mutation im Speicher gesichert (`captureInputUiState`). Schlägt eine Phase fehl, wird der vorherige sichtbare Zustand vollständig wiederhergestellt.
  - Legacy-Importe (Versionen v21.1 und v22.0) werden über eine dedizierte und getestete Migrationslogik repariert (z. B. Inflationsfaktor- und Tax-State-Reparatur), bevor sie importiert werden.
  - Vor dem Ersetzen wird über `replaceStateFromImport` ein Recovery-Snapshot mit dem Typ `balance-import-recovery` angelegt und das Vorhandensein geprüft.
  - Tritt nach dem Ersetzen ein Fehler im Abschluss-`update()` auf, wird über `rollbackImportReplace` der Recovery-Snapshot geladen, um den Zustand sicher zurückzurollen.
  - Alle Tests in `balance-storage-contract.test.mjs` (38/38 Assertions) und `balance-ui-orchestration.test.mjs` (106/106 Assertions) laufen erfolgreich durch. Die Suite ist mit 3305 Assertions vollständig grün.
- **Vertragstreue:**
  - Das Gate nutzt das Dry-Run-Ergebnis (`update({ persist: false })`) und bindet den Engine-Handshake exakt ein.
- **Fehlerbehandlung:**
  - Robustes Fail-Closed: Ein syntaktisch falsches JSON, eine falsche App-ID oder ungültige Kernwerte brechen den Import kontrolliert ab, ohne den Live-Zustand oder die UI-Eingaben zu mutieren.
  - Fehler weisen klare Handlungsoptionen auf, ohne den Roh-Payload oder Parserdetails auszugeben (kein Payload-Leak).
- **Seiteneffekte:**
  - Der Export erzeugt nun selbst das v1-Schema (`ruhe-stand-suite.balance` / `balance-state`), um Interoperabilität zu gewährleisten.

### 2. Findings

- **G8-01 (Minor): Rollback bei persistenten Profiländerungen**
  - Der Snapshot `balance-import-recovery` sichert die profilbezogenen Live-Daten (wie Tranchen und Profilwerte) des aktuellen Profils. Werden während eines Imports andere Profile in der Registry verändert (was im aktuellen Balance-Import-Scope nicht der Fall ist), wären diese nicht vom Rollback abgedeckt.
  - *Empfehlung:* Da der Balance-Import nur das aktive Profil und die Balance-Eingaben betrifft, ist die Begrenzung korrekt. Das Verhalten ist in den Tests abgesichert.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- Ein Benutzer importiert eine sehr große Exportdatei, während die Quota des LocalStorage nahezu erschöpft ist. Das Erstellen des Recovery-Snapshots schlägt wegen mangelndem Speicherplatz fehl. Der Import wird korrekterweise mit einem `storage_failed` Fehler blockiert, bevor Daten überschrieben werden. Der Benutzer versteht die Meldung jedoch eventuell nicht und vermutet einen Fehler in der Datei selbst. Ein präziserer UI-Hinweis zur Speicherplatzbereinigung wäre in diesem Szenario hilfreich.

### 4. Review-Ergebnis

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** LocalStorage-Quota-Überschreitung beim Recovery-Snapshot (Pre-Mortem).

---

## Review-Antworten von Codex

F-R09 und U-08 sind erfolgreich umgesetzt. Das Review-Feedback von Gemini (G8-01) wurde zur Kenntnis genommen. Das Restrisiko bei Quota-Überschreitung wird durch den Fail-Closed-Schutz abgefangen (keine Mutation ohne Recovery-Snapshot). Der Status wird auf freigegeben/erledigt gesetzt.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G8-01 | Gemini | Rollback-Umfang | angenommen | Tests für Profil-Isolierung dokumentiert |
