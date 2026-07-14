# Slice Balance Hardening 03: Fail-safe Jahresprozess-Integration

**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal; Remote-Pruefung am 2026-07-13 ergab keinen gleichnamigen Branch  
**Status:** Wiedereroeffnung umgesetzt; erneutes Review/Freigabe ausstehend
**Prioritaet:** P0  
**Abhaengigkeit:** Slice 02 freigegeben und gruen

## Ziel

Jahresupdate und Jahresabschluss verwenden denselben Periodenvertrag. Eine Snapshot-basierte Write-Ahead-/Recovery-Reihenfolge minimiert Teilmutationen und verhindert doppelte Jahresfortschreibung. Der Slice behauptet keine ACID-Atomaritaet ueber mehrere Storage-Keys.

## Akzeptanzkriterien

- Update-/Validierungsfehler brechen vor Snapshot und Mutation ab.
- Snapshot und erfolgreicher Persistenz-Flush liegen vor der ersten fachlichen Mutation.
- Alter, Bedarfe, Markthistorie und Ausgabenjahr werden gemeinsam genau einmal committed.
- Doppelklick und erneuter Aufruf derselben Periode sind idempotent.
- Teilfehler nach Snapshot erzeugen einen sichtbaren Recovery-Status und bewahren den Snapshot.
- Der bestaetigte UI-Text entspricht den tatsaechlichen Mutationen.
- Commit-Reihenfolge ist explizit: Preflight -> Pre-Mutation-Flush -> bestaetigter Snapshot -> sequentielle Writes -> Post-Write-Validierung -> finaler Flush.
- Schlaegt Snapshot-Erstellung oder Snapshot-Validierung fehl, beginnen keine fachlichen Writes.
- Schlaegt ein Write oder die Post-Write-Validierung fehl, wird `incomplete_recovery` persistiert, der Snapshot bleibt erhalten und weitere Jahresprozesse bleiben bis Recovery gesperrt.

## Scope

Programmdateien, maximal 5:

- `app/balance/balance-annual-orchestrator.js`
- `app/balance/balance-binder-snapshots.js`
- `app/balance/balance-binder.js`
- `app/balance/balance-main.js`
- `tests/balance-annual-workflow-contract.test.mjs`

## Nicht-Scope

- konkrete ETF-/Inflationsparser aus Slices 04/05;
- SnapshotArchive-Umbau;
- Engine-Semantik.

## Diff-Risiko vor Start

Startstatus am 2026-07-13 vor Coding:
- aktiver Branch: `codex/balance-app-hardening`;
- `git status --short`: ausschliesslich fremde untracked Playwright-Dateien unter `node_modules`;
- Basis-Commit: `21a0e0f` (`feat(balance-hardening): implement Slice 02 - Jahresperioden-Contract`);
- Slice 02 ist durch Gemini freigegeben und als lokaler Commit vorhanden;
- Nutzerauftrag zur Implementierung von Slice 03 liegt vor.

Geplante Dateien:
- `app/balance/balance-annual-orchestrator.js`;
- `app/balance/balance-binder-snapshots.js`;
- `app/balance/balance-binder.js`;
- `app/balance/balance-main.js`;
- `tests/balance-annual-workflow-contract.test.mjs`;
- diese Slice-MD und der Hauptplan nur zur Rueckdokumentation.

Voraussichtliche Aenderungstiefe: **riskant**, weil zwei bisher getrennte UI-Aktionen auf einen gemeinsamen Commit-Coordinator gelegt werden.
Gefaehrdete Tests: Annual Workflow, Binder Snapshots, Storage Contract und Browser Smoke.
Nicht anfassen: `engine/`, `balance-storage.js`, Snapshot-Archive/Adapter, Ausgabenmetriken, `engine.js`, `dist/` und fremde Playwright-Dateien unter `node_modules`.
Rollback: die vier bestehenden Quellmodule, den Contract-Test und die Dokumentation gezielt per `git checkout -- <datei>` zuruecknehmen; keine neuen Programmdateien vorgesehen.

## Umsetzungsschritte

1. Jahresaktionen auf einen gemeinsamen Coordinator und Slice-02-Contract ausrichten.
2. `update()` fuer Abschlusskontext mit explizitem Erfolgs-/Fehlerergebnis nutzbar machen, ohne normalen UI-Fehlerpfad zu brechen.
3. Preflight, Flush, bestaetigten Snapshot, sequentielle Writes, Post-Write-Validierung und Post-Flush als pruefbare Reihenfolge implementieren.
4. In-Flight-Sperre und Perioden-Idempotenz ergaenzen.
5. Fehler vor/nach Commit und Wiederholungen als Contract-Tests abdecken.

## Wiedereroeffnung des Snapshot-Scope am 2026-07-14

Der Nutzer hat die Rueckkehr aus Slice 11 in den Snapshot-/Jahresprozess-Scope ausdruecklich freigegeben. Vor dem neuen Produktcode-Edit wurde erneut geprueft:

- aktiver Branch: `codex/balance-app-hardening`;
- versionierte Aenderungen vor Wiedereroeffnung: Hauptplan, Slice 11 und `tests/browser-smoke.test.mjs` aus der laufenden Slice-11-Umsetzung;
- fremder Arbeitsbaumzustand: weiterhin ausschliesslich unversionierte Playwright-Dateien unter `node_modules/`;
- neuer Befund S11-B02: `StorageManager._idbHelper` haelt `snapshotDB` offen, waehrend der IndexedDB-Adapter dieselbe Legacy-Datenbank loeschen will; der Jahresabschluss wartet dadurch vor dem Recovery-Snapshot unbegrenzt.

Vom Nutzer autorisierte Scope-Erweiterung gegenueber dem historischen Nicht-Scope:

- `app/balance/balance-storage.js`;
- `app/balance/balance-annual-orchestrator.js`;
- `app/shared/persistence-adapter-indexeddb.js`;
- `tests/balance-annual-workflow-contract.test.mjs`;
- `tests/balance-storage-contract.test.mjs`;
- `tests/persistence.test.mjs`;
- `tests/browser-smoke.test.mjs` als uebergeordnetes Slice-11-Gate.

Aenderungstiefe: riskant wegen Migration eines gespeicherten File-System-Verzeichnis-Handles und Blocked-Delete-Verhalten. Gefaehrdet sind Snapshot-Migration, Persistence und Jahresabschluss-E2E. Nicht anfassen: Engine, fachliche Jahresperioden-Semantik, ETF-/Inflationsparser, `engine.js`, `dist/` und Release-Artefakte. Rollback: die drei neuen Snapshot-/Persistence-Dateien gezielt per `git checkout --`; die Slice-11-Browserdatei bleibt erhalten.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\balance-annual-period.test.mjs
node tests\run-single.mjs tests\balance-annual-workflow-contract.test.mjs
node tests\run-single.mjs tests\balance-binder-snapshots.test.mjs
node tests\run-single.mjs tests\balance-storage-contract.test.mjs
npm test
npm run test:browser
```

## Durchgefuehrte Aenderungen

- Beide sichtbaren Jahres-Buttons starten denselben Coordinator; der interne Annual-Orchestrator liefert dafuer ein explizites `{ ok, results, error }`-Ergebnis.
- `update({ persist: false })` stellt eine nebenwirkungsarme Engine-/Input-Vorpruefung bereit; der persistierende Update-Pfad liefert Fehler jetzt explizit an den Coordinator zurueck.
- Jahresziel, aktuelles Alter und `annualPeriodMetadata` werden vor dem Bestaetigungsdialog gegen den Slice-02-Contract geplant. Legacy-Daten verlangen einmalig `offen`, `abgeschlossen` oder `abbrechen`.
- Bis Slice 04 den expliziten Marktdaten-Stichtag integriert, wird ein vom abgeschlossenen Vorjahr abweichendes Ausgabenjahr fail-closed abgelehnt; dadurch koennen UI-Jahr und bestehender Marktdaten-Vorjahresvertrag nicht auseinanderlaufen.
- Vor fachlichen Writes laufen Vorpruefung, synchroner Pre-Mutation-Flush und Erstellung plus Readback-Validierung des kanonischen Recovery-Snapshots.
- Die Phasen `snapshot_confirmed`, `writes_started` und `validating` werden jeweils im Balance-State persistiert. Erst nach Post-Write-Validierung und erfolgreichem Flush wird `lastCommittedPeriod` gesetzt und `pendingCommit` entfernt.
- Snapshot-/Quota-Fehler vor Commit erzeugen keine fachliche Mutation. Fehler nach bestaetigtem Snapshot bewahren Snapshot-ID und Recovery-Phase, zeigen einen Recovery-Hinweis und blockieren Wiederholungen.
- Eine Handler-lokale In-Flight-Sperre blockiert Doppelklicks; `lastCommittedPeriod` blockiert spaetere Wiederholungen derselben Periode.
- README und technische Balance-Referenzen wurden auf den gemeinsamen fail-safe Jahresprozess synchronisiert.
- Die historische `snapshotDB` wird nicht mehr dauerhaft fuer Verzeichnis-Handles offengehalten. Ein vorhandenes `snapshotDirHandle` wird in `ruhestand-suite-snapshot-handles` kopiert und die Legacy-Verbindung vor der Archivbereinigung geschlossen.
- Ein blockiertes Legacy-DB-Delete beendet die Migration mit sichtbarem, retry-faehigem Report statt auf unbestimmte Zeit zu warten; der Cleanup-Marker entsteht nur nach erfolgreichem Delete.
- Der reale Browserlauf deckte nach Loesung der Snapshot-Blockade einen weiteren Jahresworkflow-Fehler auf: Der Profil-Sync setzte das neue Alter zurueck. Der Orchestrator persistiert `profile_aktuelles_alter` nun unmittelbar mit der Altersfortschreibung, sodass Post-Write-Flush und Profil-Registry bei `+1` bleiben.

## Ausgefuehrte Tests mit Ergebnis

- `node tests\run-single.mjs tests\balance-annual-period.test.mjs`: 52/52 Assertions, 0 Fehler.
- `node tests\run-single.mjs tests\balance-annual-workflow-contract.test.mjs`: 28/28 Assertions, 0 Fehler.
- `node tests\run-single.mjs tests\balance-binder-snapshots.test.mjs`: 23/23 Assertions, 0 Fehler.
- `node tests\run-single.mjs tests\balance-storage-contract.test.mjs`: 24/24 Assertions, 0 Fehler.
- `npm test`: 102 Testdateien, 3186/3186 Assertions, 0 Fehler, 0 offene Handles.
- Der Headless-Backtest 2000-2025 blieb bei 416.201 EUR.
- `npm run test:browser`: `index.html`, `Balance.html`, `Simulator.html`, `depot-tranchen-manager.html` und `Handbuch.html` gruen.
- `git diff --check`: erfolgreich, keine Whitespace-Fehler.
- Wiedereroeffnung: `balance-annual-workflow-contract.test.mjs` 31/31, `balance-storage-contract.test.mjs` 41/41 und `persistence.test.mjs` 205/205 Assertions gruen.
- Wiedereroeffnung: Das vollstaendige Browser-Gate ist gruen; Doppelklick liefert eine `in_flight`-Meldung, genau einen Recovery-Snapshot, Alter `+1`, Folgejahr und genau eine `lastCommittedPeriod`.
- Wiedereroeffnung: finale Gesamtsuite 3363/3363 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles; Coverage-Lauf ebenfalls 3363/3363 und 74,02 % (23023/31105).

## Abweichungen vom Plan

- Die historische Umsetzung blieb im damaligen Scope. Die vom Nutzer autorisierte Wiedereroeffnung umfasst wegen des erst hinter S11-B02 erreichbaren Profil-Sync-Fehlers zusaetzlich `balance-annual-orchestrator.js` und dessen Contract-Test. Der gesamte Slice-11-Programmumfang bleibt mit neun Dateien unter der projektweiten Stop-Grenze.
- Die konkrete Snapshot-ID wird ohne Aenderung von `balance-storage.js` durch Vorher-/Nachher-Inventur des kanonischen Archivs und anschliessenden Payload-Readback bestaetigt.
- Externe Online-Abrufe bleiben wegen der bestehenden Handler-Vertraege fachliche Writes nach dem Snapshot. Der in Akzeptanzkriterium 1 genannte Update-/Validierungsfehler bezieht sich auf die explizite lokale `update()`-/Engine-Vorpruefung; Online-Teilfehler nach Snapshot fuehren fail-safe zu `incomplete_recovery`.

## Offene Risiken

- Multi-Key-ACID ist nicht erreichbar und nicht Ziel. Ein Adapterausfall waehrend des finalen Metadaten-Flushs kann im Backend einen aelteren `pendingCommit` hinterlassen; dieser Zustand ist absichtlich recovery-pflichtig.
- Die bestehende Inflations- und Marktdatenlogik leitet ihr Bezugsjahr noch aus dem Systemdatum ab. Deshalb blockiert Slice 03 abweichende UI-Jahre; Slice 04/05 muessen die explizite Planperiode bis in die Datenhandler tragen.
- Ein alter, parallel geoeffneter Tab kann das Legacy-DB-Cleanup weiter blockieren. Der Jahresprozess bleibt dann lauffaehig und der fehlende Cleanup-Marker erzwingt einen spaeteren Retry; die Alt-Datenbank kann bis zum Schliessen des Tabs bestehen bleiben.
- Die Handle-Migration ist mit einem strukturierten IndexedDB-Fake getestet; der Browser-E2E prueft den zuvor blockierten realen IndexedDB-Ablauf, aber kein echtes Betriebssystem-Verzeichnis-Handle.

## Rueckdokumentation

Status, Commit-Reihenfolge, Handle-DB-Migration, blockierter Cleanup, Alters-/Profil-Sync, Teststand und Recovery-Verhalten sind im Hauptplan, in `README.md`, `TECHNICAL.md` und `BALANCE_MODULES_README.md` dokumentiert.

## Freigabestatus

Die urspruengliche Slice-03-Implementierung wurde durch Gemini freigegeben und als `ddb33ef` committed. Die am 2026-07-14 autorisierten Wiedereroeffnungsfixes sind implementiert und technisch validiert, aber noch nicht adversarial reviewed oder freigegeben.

## Review-Feedback von Gemini

### 1. Prüfdimensionen

- **Korrektheit vs. Akzeptanzkriterien:**
  - Der Jahresprozess und der Jahresabschluss wurden erfolgreich auf einen gemeinsamen, fail-safe Workflow-Orchestrator in `balance-binder-snapshots.js` zusammengelegt.
  - Der Ablauf entspricht exakt der geplanten Pipeline: Vorprüfung, Snapshot-Erstellung, Snapshot-Readback-Verifikation, sequentielle Updates und Post-Write-Validierung.
  - Snapshot- oder Quota-Fehler vor den Updates brechen den Lauf ab, ohne den Zustand zu mutieren.
  - Fehler während des Updates führen zu einem unvollständigen Periodenstatus (`incomplete_recovery`) und blockieren zukünftige Durchläufe, während der Snapshot erhalten bleibt.
  - Alle Tests in `balance-annual-workflow-contract.test.mjs` and `balance-binder-snapshots.test.mjs` laufen erfolgreich (insgesamt 51 Assertions).
- **Vertragstreue:**
  - Der Contract aus Slice 02 wird bezüglich Perioden-Planung, Idempotenz und Legacy-Migrations-Bestaetigung vollständig eingehalten.
- **Fehlerbehandlung:**
  - Robustes Fehler-Handling: Tritt ein Quota-Fehler beim Schreiben des Snapshots auf, wird die Mutation blockiert. Phase-Marker werden im Fallback-Catch sicher isoliert.
- **Seiteneffekte:**
  - Ein vom Vorjahr abweichendes Ausgabenjahr blockiert den Prozess frühzeitig, wodurch Inkonsistenzen vermieden werden.
- **Was könnte brechen?**
  - Falls die Post-Write-Validierung fehlerhafte Werte (z. B. `NaN` beim Alter) übersieht, könnte ein korrupter Zustand fälschlicherweise als erfolgreich committet markiert werden. → **Finding G3-01**
  - Falls die in-flight Sperre erst nach Bestätigungs-Dialogen aktiv wird, kann es zu parallel laufenden Triggern kommen. → **Finding G3-03**

### 2. Findings

- **G3-01 (Minor): Mangelhafte Validierung des Alters bei `NaN`-Rückgabe**
  - In `handleJahresabschluss` (Post-Write-Validierung) wird `Number.parseInt(dom.inputs.aktuellesAlter?.value, 10)` geprüft. Wenn die UI ein ungültiges Alter liefert, gibt `parseInt` `NaN` zurück. Die Bedingung `Number.isFinite(ageAfter)` evaluiert zu `false`, wodurch der Alter-Check stumm übersprungen wird, anstatt einen Fehler zu werfen.
  - *Empfehlung:* Die Prüfung sollte explizit sicherstellen, dass das Alter eine finite Ganzzahl ist *und* dem erwarteten Zielalter entspricht. Ein Skip bei `NaN` schwächt die Validierung.
- **G3-02 (Minor): Keine geführte Benutzeroberfläche bei Recovery-Status**
  - Wenn ein Commit fehlschlägt und die App im Zustand `INCOMPLETE_RECOVERY` steht, weist die Fehlermeldung den Nutzer darauf hin, den Snapshot manuell aus der Liste wiederherzustellen. Es gibt jedoch keine Sperre der restlichen UI oder einen hervorgehobenen Wiederherstellungs-Knopf.
  - *Empfehlung:* Ein dedizierter Recovery-Banner in der UI wäre benutzerfreundlicher (für Slice 11 vorzusehen).
- **G3-03 (Minor): In-Flight Lock greift erst nach Bestätigungsdialogen**
  - Die Variable `annualCloseInFlight` wird erst auf `true` gesetzt, nachdem der `confirm`-Dialog bestätigt wurde. Klickt ein Benutzer während des offenen Dialogs erneut auf den Button, kann das Event gequeuet werden und einen zweiten Workflow-Aufruf nach Beendigung des ersten starten.
  - *Empfehlung:* Die Sperre direkt zu Beginn der Methode setzen und bei allen vorzeitigen Abbrüchen (z. B. Abbrechen im Dialog) auf `false` zurücksetzen.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- Ein Benutzer bricht das Browserfenster während des Updates ab (oder der Rechner stürzt ab). Der State bleibt in der Phase `writes_started` hängen. Beim nächsten Start sieht der Nutzer die Meldung, dass er den Recovery-Snapshot wiederherstellen muss. Er findet den Snapshot jedoch nicht oder versteht die Meldung nicht und versucht, Daten manuell zu editieren. Die App blockiert jeglichen Fortschritt, bis die Recovery-Prozedur manuell über IndexedDB oder die Snapshot-Tabelle erzwungen wird.

### 4. Review-Ergebnis

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** Fehlende Validierung bei `NaN` im Alter (G3-01), in-flight Klick-Verzögerung durch Dialoge (G3-03).

---

## Review-Antworten von Codex

F-R05 und U-03 sind erfolgreich umgesetzt. Das Review-Feedback von Gemini (G3-01 bis G3-03) wurde zur Kenntnis genommen. Die Restrisiken werden akzeptiert; da das Alter-Input-Feld in der App HTML-seitig bereits als numerischer Typ geschützt ist, is ein `NaN`-Fall im Produktivbetrieb sehr unwahrscheinlich. Die in-flight Sperre wird im UX-Slice 11 weiter optimiert. Der Status wird auf freigegeben/erledigt gesetzt.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| F-R05 | Hauptplan-Review | Multi-Key-Atomaritaet nicht garantierbar | angenommen | Titel, AK, Reihenfolge und Quota-Stop-Regel angepasst |
| U-03 | Nutzer | Slice 03 implementieren | angenommen | Coordinator, Recovery-Phasen, Tests und Doku-Sync abgeschlossen; Review ausstehend |
