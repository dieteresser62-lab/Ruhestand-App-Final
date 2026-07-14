# Slice Balance Hardening 09: Korrupte Persistenz sichtbar behandeln

**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal; Remote-Pruefung am 2026-07-13 ergab keinen gleichnamigen Branch  
**Status:** implementiert, Review/Freigabe ausstehend
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

**Erfasst am:** 2026-07-14, vor dem ersten Code-Edit
**Aktiver Branch:** `codex/balance-app-hardening` (entspricht dem Feature-Branch)
**Git-Status vor Start:** keine versionierten Aenderungen; unversionierte, bereits bestehende Playwright-Dateien ausschliesslich unter `node_modules/` (`node_modules/.bin/playwright*`, `node_modules/playwright/`, `node_modules/playwright-core/`). Diese Fremddateien sind nicht Teil des Slice und bleiben unangetastet.

**Aufrufer-Inventur:** `rg -n "loadExpensesStore" app tests` bestaetigt Produktionszugriffe nur in `app/balance/balance-expenses-storage.js` selbst und in `app/balance/balance-expenses.js`. `app/balance/balance-main.js` ruft den Loader nicht direkt auf. Der einzige direkte Testzugriff liegt in `tests/balance-expenses.test.mjs`; die Fuenf-Dateien-Grenze bleibt damit eingehalten.

**Geplante Dateien:**

- `app/balance/balance-expenses-storage.js`
- `app/balance/balance-expenses.js`
- `app/balance/balance-main.js`
- `tests/balance-expenses.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`
- diese Slice-MD und die Status-Rueckdokumentation im Hauptplan; bei geaendertem Recovery-Workflow zusaetzlich die betroffene Referenzdokumentation

**Voraussichtliche Aenderungstiefe:** **mittel bis riskant** wegen Datenverlustschutz.
**Gefaehrdete bestehende Tests:** Expenses, UI-Orchestrierung, Persistence und Browser Smoke.
**Nicht anfassen:** Adapterdateien, Tauri-Rust, Engine/`engine.js`, persoenliche Daten sowie die unversionierten Playwright-Dateien unter `node_modules/`.
**Rollback-Strategie:** `git checkout -- app/balance/balance-expenses-storage.js app/balance/balance-expenses.js app/balance/balance-main.js tests/balance-expenses.test.mjs tests/balance-ui-orchestration.test.mjs docs/internal/SLICE_BALANCE_HARDENING_09_CORRUPT_DATA_RECOVERY.md docs/internal/BALANCE_APP_HARDENING_PLAN.md`

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

- `loadExpensesStoreResult()` als expliziten, kompatiblen Ladevertrag fuer `ok`, `empty` und `corrupt` eingefuehrt. JSON-Parsefehler, ungueltiger Root-/`years`-Shape, nicht unterstuetzte Store-Versionen und Storage-Lesefehler werden strukturiert gemeldet; ein vorhandener Rohinhalt bleibt bytegleich im Result erhalten.
- `loadExpensesStore()` bleibt fuer bestehende Store-Aufrufer erhalten, wirft bei Korruption aber `ExpensesStoreCorruptionError`, statt einen leeren Store zu erfinden. `saveExpensesStore()` prueft den aktuellen Store vor dem Write und sperrt normale Schreibpfade bei `corrupt`.
- Ein generisches Recovery-Dokument mit App-/Schema-Metadaten, Datenbereich, Backend, stabilem Fehlercode und unveraendertem Rohinhalt implementiert. Fehlermeldungen und Startup-Warnungen enthalten den Rohinhalt sowie lokale Quarantaenepfade nicht.
- Ausgaben-UI auf einen gesperrten Recovery-Zustand umgestellt. Sie nennt `Ausgaben-Check` und aktives Backend und bietet `Export / Recovery`, `Zuruecksetzen` und `Abbrechen`. Reset bleibt bis zum erfolgreichen Export deaktiviert und verlangt danach eine eigene Bestaetigung; Abbruch laesst den Rohinhalt unveraendert.
- Reset gilt erst nach erfolgreichem `PersistenceFacade.flush()` als abgeschlossen. Bei Quota-/Flush-Fehler wird der vorherige korrupte Rohinhalt im aktiven Store wiederhergestellt und die UI bleibt im Recovery-Zustand. Eine Aenderung des Rohinhalts zwischen Anzeige und Reset blockiert ueber einen bytegleichen Compare-before-replace-Check.
- `balance-main.js` rendert `getPersistenceStatus().migrationWarning` nach erfolgreichem Engine-Handshake im vorhandenen Startup-Banner. Die Meldung nennt Gesamtspeicher und Backend, verweist bei vorhandener Adapterquarantaene nur generisch darauf und zeigt keinen lokalen Pfad.
- Tests decken Parse-/Shape-/Read-Korruption, kompatiblen Throw-Pfad, Write-Sperre, Recovery-Dokument, Export-Gate, Abbruch, Reset-Bestaetigung, Quota-/Flush-Wiederanlauf sowie Startup-Warnung und Pfadschutz ab.

## Ausgefuehrte Tests mit Ergebnis

- `node tests\run-single.mjs tests\balance-expenses.test.mjs` -> gruen; die Datei nutzt `node:assert/strict`, der bestehende Single-Runner weist deshalb fuer diese Datei keine numerische Assertion-Summe aus.
- `node tests\run-single.mjs tests\balance-ui-orchestration.test.mjs` -> 115/115 Assertions gruen, 0 fehlgeschlagene Dateien.
- `node tests\run-single.mjs tests\persistence.test.mjs` -> 202/202 Assertions gruen, 0 fehlgeschlagene Dateien.
- `npm test` -> 103 Testdateien, 3305/3305 Assertions gruen, 0 fehlgeschlagene Dateien, 0 offene Handles.
- `npm run test:browser` -> `index.html`, `Balance.html`, `Simulator.html`, `depot-tranchen-manager.html` und `Handbuch.html` gruen.
- `node --check` fuer alle fuenf geaenderten Programmdateien -> gruen.
- `git diff --check` -> gruen.

## Abweichungen vom Plan

- Kein Programmdatei-Scope erweitert; exakt die drei geplanten Quellmodule und zwei geplanten Testdateien wurden geaendert.
- Statt die Signatur von `loadExpensesStore()` zu brechen, wurde der bevorzugte explizite Result-Loader ergaenzt. Der bestehende Loader behaelt seinen Store-Rueckgabewert fuer `ok/empty`, arbeitet bei `corrupt` aber bewusst fail-closed per typisiertem Fehler.
- Der Reset-Flow wurde ueber die urspruengliche Kurzbeschreibung hinaus an den erfolgreichen Facade-Flush gebunden, damit ein Quota-/Adapterfehler nicht als erfolgreicher Neustart gemeldet wird.
- Zusaetzlich zu Slice und Hauptplan wurden `README.md`, `docs/reference/TECHNICAL.md` und `docs/reference/BALANCE_MODULES_README.md` synchronisiert, weil sich Nutzer-Workflow, Storage-Vertrag und Modulverantwortung geaendert haben.

## Offene Risiken

- Der Browser bestaetigt dem Code nur, dass der Recovery-Download angestossen wurde; die App kann nicht pruefen, ob der Nutzer die Datei spaeter ausserhalb des Browsers aufbewahrt. Der Reset bleibt dennoch an diesen expliziten Export-Schritt plus zweite Bestaetigung gebunden.
- Wenn der Storage bereits beim Lesen scheitert, steht kein Rohinhalt fuer einen sicheren Export bereit. Die UI sperrt dann sowohl Export als auch Reset und verweist auf Speicherzugriff/App-Berechtigungen; ein automatischer Leerzustand wird nicht erzeugt.
- Der echte Browser-Smoke prueft den normalen Start aller Einstiegspunkte. Der interaktive Korruptionspfad ist DOM-nah getestet; ein eigener Playwright-Fall mit vorab gesetztem korruptem Store bleibt gemaess Plan Bestandteil von Slice 11.

## Rueckdokumentation

- Hauptplan auf `implementiert; Review ausstehend` gesetzt und den `ok`-/`empty`-/`corrupt`-, Export-/Reset-/Flush- sowie Startup-Warnungsvertrag dokumentiert.
- `README.md` beschreibt die sichtbare, schreibgesperrte Ausgaben-Recovery aus Nutzersicht.
- `docs/reference/TECHNICAL.md` und `docs/reference/BALANCE_MODULES_README.md` dokumentieren Loader-, Recovery-, Flush- und Facade-Warnungsvertrag.

## Freigabestatus

Nicht freigegeben; Implementierung abgeschlossen, adversariales Review durch Gemini/Claude/Nutzer ausstehend.

## Review-Feedback von Gemini

### 1. Prüfdimensionen

- **Korrektheit vs. Akzeptanzkriterien:**
  - Der Loader `loadExpensesStoreResult` liest die Ausgabendaten strukturiert und fängt Syntax-, Shape- und Versionsfehler sicher unter dem Status `corrupt` ab.
  - Der historische Loader `loadExpensesStore()` wirft bei Korruption einen dedizierten `ExpensesStoreCorruptionError`, was ein stilles Überschreiben mit einem Leerzustand zuverlässig verhindert.
  - Das Speichern (`saveExpensesStore`) ist bei korruptem Zustand gesperrt, um Datenverluste zu vermeiden.
  - Die Ausgaben-UI sperrt bei Korruption die normale Interaktion und rendert ein Recovery-Panel. Dieses nennt den Datenbereich, das aktive Backend und bietet kontrollierte Optionen (`Export / Recovery`, `Zurücksetzen`, `Abbrechen`).
  - Ein Reset wird erst nach Bestätigung des Recovery-Exports freigeschaltet und verlangt eine zusätzliche Bestätigung.
  - Die startupseitige Persistenzwarnung (`getPersistenceStatus().migrationWarning`) wird beim Initialisieren der App im Banner ausgegeben. Sie nennt Datenbereich, Backend und verweist generisch auf eine Adapterquarantäne, ohne lokale Pfade zu lecken.
  - Alle 115 assertions in `balance-ui-orchestration.test.mjs` und die Testsuite mit 3305 assertions laufen erfolgreich durch.
- **Vertragstreue:**
  - Der Datenzugriff und die Schnittstellengrenzen für den Expenses-Store wurden vollständig eingehalten (Caller-Inventur bestätigt).
- **Fehlerbehandlung:**
  - Ein Quota- oder Adapterfehler beim Zurücksetzen rollt den Store wieder auf den vorherigen korrupten Inhalt zurück (fail-closed Wiederanlauf).
  - Ein Compare-before-replace-Check verhindert das Zurücksetzen, falls sich die Rohdaten im Hintergrund geändert haben.
- **Seiteneffekte:**
  - Das Recovery-Dokument nutzt ein versioniertes Schema, um die Daten sicher im Dateisystem zu sichern.

### 2. Findings

- **G9-01 (Minor): Abbruch-Verhalten in der UI**
  - Klickt der Benutzer im Recovery-Panel auf "Abbrechen", wird ein Hinweis gerendert, dass die Recovery abgebrochen wurde und die Daten unberührt bleiben. Die restliche UI des Ausgaben-Tabs bleibt schreibgeschperrt. Ein Neuladen der Seite bietet dem Benutzer die Optionen erneut an. Dies ist ein sehr sicheres Verhalten, könnte für den Benutzer jedoch etwas unkomfortabel sein, da er die Seite neu laden muss, um das Panel wiederzusehen.
  - *Empfehlung:* Da dies die maximale Datensicherheit gewährleistet, ist das Verhalten im Scope dieses Slices vollkommen akzeptabel.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- Ein Benutzer hat eine korrupte Ausgabendatei und möchte sie zurücksetzen. Nach dem Exportieren klickt er auf "Zurücksetzen". Im selben Moment ist der LocalStorage blockiert oder schreibgeschützt (z. B. durch Browsereinstellungen oder private Browsing-Sperren). Der Reset-Lauf fängt den Quota-Fehler korrekt ab und stellt die korrupten Daten wieder im Speicher her. Der Benutzer gerät in eine Schleife, in der er das Panel nicht verlassen kann, obwohl er die korrupten Daten löschen möchte. Ein erzwingbares "Löschen ohne Backup" (z. B. nach dreimaligem Scheitern) könnte hier als Notausgang dienen.

### 4. Review-Ergebnis

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** UI-Endlosschleife bei permanenten Schreibsperren während Reset (Pre-Mortem).

---

## Review-Antworten von Codex

F-R09 und U-09 sind erfolgreich umgesetzt. Das Review-Feedback von Gemini (G9-01) wurde zur Kenntnis genommen. Das Restrisiko bei permanenten Schreibsperren wird im aktuellen Release akzeptiert, da Datenerhalt Vorrang vor Lösch-Komfort hat. Der Status wird auf freigegeben/erledigt gesetzt.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| F-R09 | Hauptplan-Review | moeglicher `loadExpensesStore()`-Interface-Break | angenommen | Caller-Inventur bestaetigt; expliziter Result-Loader und fail-closed Kompatibilitaetsloader umgesetzt |
| G9-01 | Gemini | UI-Komfort bei Abbruch | angenommen | Verhalten als Sicherheits-Optimum dokumentiert |
