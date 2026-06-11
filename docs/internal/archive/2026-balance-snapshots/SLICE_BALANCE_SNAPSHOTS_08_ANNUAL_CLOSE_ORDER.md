# Slice Balance Snapshots 08: Jahresabschluss-Reihenfolge

**Feature-Branch:** `codex-balance-snapshot-key-policy`
**GitHub-Status:** Branch lokal vorhanden; keine weitere Veroeffentlichung ohne Freigabe
**Status:** abgeschlossen, freigegeben durch Gemini

## Ziel

Der Jahresabschluss erstellt den Snapshot vor jeder Jahresabschluss-Mutation und bricht bei Flush- oder Snapshot-Fehlern ohne Mutation ab.

## Akzeptanzkriterien

- `handleJahresabschluss()` fuehrt vor der Snapshot-Erstellung einen Live-Flush aus.
- `StorageManager.createSnapshot()` wird vor `applyAnnualInflation()`, `rollExpensesYear()` und dem mutierten Live-Update/-Flush aufgerufen.
- Ein Fehler im Vorab-Flush oder bei der Snapshot-Erstellung verhindert Inflation, Live-Update, Ausgaben-Rollover und erfolgreiche Snapshot-Listen-Aktualisierung.
- Nach erfolgreichem Snapshot laufen die definierten Mutationen und danach ein Live-Flush fuer den mutierten Stand.
- Die bestehende Jahresabschluss-Contract-Rotstelle wird gruen.

## Scope

- `app/balance/balance-binder-snapshots.js`
- `app/balance/balance-binder.js`
- `tests/balance-annual-workflow-contract.test.mjs`
- `docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md`
- diese Slice-Datei

## Nicht-Scope

- Kein StorageManager-/SnapshotArchive-Umbau.
- Keine Legacy-Migration.
- Keine UI-Text-/Exportpfad-Neusortierung.
- Keine Engine-Semantik-Aenderung.

## Diff-Risiko Vor Start

Branch vor Start:

```text
codex-balance-snapshot-key-policy
```

Git-Status vor Start:

```text
## codex-balance-snapshot-key-policy...origin/codex-balance-snapshot-key-policy
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
```

Geplante Dateien:
- `app/balance/balance-binder-snapshots.js`
- `app/balance/balance-binder.js`
- `tests/balance-annual-workflow-contract.test.mjs`
- `docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md`
- `docs/internal/SLICE_BALANCE_SNAPSHOTS_08_ANNUAL_CLOSE_ORDER.md`

Voraussichtliche Änderungstiefe:
- niedrig bis mittel

Gefährdete bestehende Tests:
- `tests/balance-annual-workflow-contract.test.mjs`
- `tests/balance-binder-snapshots.test.mjs`

Nicht anfassen:
- `app/balance/balance-storage.js`
- `app/shared/`
- `engine.js`, `dist/`, `RuheStandSuite.exe`

Rollback-Strategie:
- `git checkout -- app/balance/balance-binder-snapshots.js app/balance/balance-binder.js tests/balance-annual-workflow-contract.test.mjs docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md`
- neu angelegte Slice-Datei `docs/internal/SLICE_BALANCE_SNAPSHOTS_08_ANNUAL_CLOSE_ORDER.md` nach Freigabe loeschen, falls Rollback gewuenscht ist.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\balance-annual-workflow-contract.test.mjs
node tests\run-single.mjs tests\balance-binder-snapshots.test.mjs
node tests\run-tests.mjs
```

## Durchgefuehrte Änderungen

- `createSnapshotHandlers()` akzeptiert jetzt einen injizierbaren `flushLiveState`-Hook und nutzt `PersistenceFacade.flush()` als Default.
- `handleJahresabschluss()` fuehrt vor der Snapshot-Erstellung `flushLiveState({ sync: true })` aus.
- Der Snapshot wird vor `applyAnnualInflation()`, `rollExpensesYear()` und dem mutierten Live-Update/-Flush geschrieben.
- Nach den erfolgreichen Jahresabschluss-Mutationen fuehrt der Handler `flushLiveState({ sync: true })` aus. Im echten Binder bedeutet das synchrones `update()` plus `PersistenceFacade.flush()`.
- `rollExpensesYear()` laeuft vor dem Post-Mutations-Flush und gehoert damit zur atomar zu persistierenden Jahresabschluss-Mutation.
- Der fragile Debounce-/Timeout-Pfad wurde aus dem Jahresabschluss entfernt.
- `initUIBinder()` bindet `flushLiveState` so, dass `sync: true` zuerst `update()` ausfuehrt und danach `PersistenceFacade.flush()` abwartet.
- Der Jahresabschluss-Contract wurde um den Vorab-Flush-Fehlerfall erweitert.
- Der Jahresabschluss-Contract wurde zusaetzlich um Post-Mutations-Flush-Fehler, explizite `{ sync: true }`-Argumente und die Rollover-vor-Flush-Reihenfolge erweitert.

## Ausgefuehrte Tests

```powershell
node tests\run-single.mjs tests\balance-annual-workflow-contract.test.mjs
```

Ergebnis: gruen. Snapshot-vor-Mutation, Rollover-vor-Post-Flush, Snapshot-Fehler-bricht-ab, Vorab-Flush-Fehler-bricht-ab und Post-Mutations-Flush-Fehler wurden geprueft.

```powershell
node tests\run-single.mjs tests\balance-binder-snapshots.test.mjs
```

Ergebnis: gruen. Bestehende Snapshot-Archiv-Contracts bleiben intakt.

```powershell
node tests\run-tests.mjs
```

Ergebnis: gruen. 79 Testdateien, 2095 Assertions, 0 Fehler.

## Abweichungen Vom Plan

- Keine fachliche Abweichung.
- Die konkrete Altersfortschreibung bleibt weiterhin im bestehenden Jahresupdate-Orchestrator; dieser Slice stellt sicher, dass der Jahresabschluss-Snapshot vor den im Jahresabschluss-Handler konkret ausgefuehrten Mutationen entsteht.

## Offene Risiken

- Wenn `update()` im Vorab-Sync wegen Eingabevalidierung fehlschlaegt, wird der Jahresabschluss korrekt abgebrochen. Der Nutzer sieht den bestehenden UI-Fehlerpfad.
- Wenn der Post-Mutations-Flush nach Snapshot, Inflation und Ausgaben-Rollover fehlschlaegt, wird der Fehler gemeldet und der Pre-Mutation-Snapshot bleibt als Rueckfallpunkt erhalten.

## Rueckdokumentation

- `docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md` markiert Paket 7 als abgeschlossen und verweist auf diese Slice-Datei.

## Review-Feedback von Gemini

### 1. Prüfdimensionen
- **Korrektheit vs. Akzeptanzkriterien:** 
  - *Kriterium 1 (Vorab-Flush vor Snapshot):* Erfüllt.
  - *Kriterium 2 (Snapshot vor Mutationen):* Nicht voll erfüllt. `rollExpensesYear()` läuft nach dem Post-Mutations-Flush (Abweichung vom Plan).
  - *Kriterium 3 (Fehlervermeidung bei Abbruch):* Erfüllt.
  - *Kriterium 4 (Post-Mutations-Flush):* Erfüllt.
- **Vertragstreue:** Der Standard-Fallback von `flushLiveState` in `createSnapshotHandlers` ignoriert das `{ sync }`-Argument (latent fehlerhaft).
- **Fehlerbehandlung:** Wenn der Post-Mutations-Flush fehlschlägt, wird `rollExpensesYear()` komplett übersprungen.
- **Seiteneffekte:** `rollExpensesYear()` schreibt direkt in `localStorage` und umgeht die Facade.
- **Was könnte brechen?** Race-Condition bei `debouncedUpdate` (250ms) vs `setTimeout` (300ms) und folgendem asynchronen Flush.

### 2. Findings
- **G-01 (Blocker):** `rollExpensesYear()` nach dem Post-Mutations-Flush widerspricht dem Arbeitsplan. Die Mutation wird dadurch nicht atomar geflusht und kann bei Flush-Fehlern unkontrolliert übersprungen werden.
- **G-02 (Niedrig):** Default-`flushLiveState` in `createSnapshotHandlers` ignoriert den `{ sync }`-Parameter.
- **G-03 (Mittel):** Testlücke im Contract-Test. Der zweite Flush und die übergebenen `{ sync }`-Parameter werden nicht assertiert.
- **G-05 (Niedrig):** Timing-Fragilität mit `debouncedUpdate` (250ms) und `setTimeout(300)`.

### 3. Pre-Mortem
Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
Ein IndexedDB-Quota-Fehler verhindert den Post-Mutations-Flush. `rollExpensesYear()` wird übersprungen. Die Inflation ist persistiert (im Cache / vorab geflusht), aber das Ausgabenjahr wird nicht erhöht. Der Benutzer merkt die Inkonsistenz erst Monate später.

### 4. Review-Ergebnis
- Status: blockiert
- Blocker: G-01
- Restrisiken: G-02, G-03, G-05

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-01 | Gemini | `rollExpensesYear()` nach Post-Mutations-Flush widerspricht dem Arbeitsplan. | Angenommen | Erledigt: Rollover laeuft jetzt vor dem Post-Mutations-Flush. |
| G-02 | Gemini | Default-`flushLiveState` ignoriert den `{ sync }`-Parameter. | Angenommen | Erledigt: Default-Hook akzeptiert `{ sync }` und fuehrt bei `sync` den injizierten `debouncedUpdate`-Fallback aus; Produktion nutzt den expliziten Binder-Hook. |
| G-03 | Gemini | Testlücken beim Post-Mutations-Flush und `{ sync }`-Argumenten. | Angenommen | Erledigt: Contract assertiert beide `{ sync: true }`-Flushes, Rollover-vor-Flush und Post-Flush-Fehlerpfad. |
| G-05 | Gemini | Fragiles Timing-Muster mit `debouncedUpdate` und `setTimeout(300)`. | Angenommen | Erledigt: Jahresabschluss nutzt keinen `setTimeout(300)`/Debounce-Wartepfad mehr; der Binder-Hook ruft synchron `update()` und anschliessend `PersistenceFacade.flush()` auf. |

## Review-Antworten von Codex

- **G-01:** Behoben. `rollExpensesYearFn()` wird direkt nach `applyAnnualInflation()` und vor dem zweiten `flushLiveState({ sync: true })` ausgefuehrt.
- **G-02:** Behoben. Der Default-Hook akzeptiert die Options-Signatur. Im echten UI-Pfad wird weiterhin der explizite Binder-Hook genutzt, der `sync` auswertet.
- **G-03:** Behoben. Der Contract prueft jetzt die exakten Flush-Argumente, die Rollover-Reihenfolge vor dem Post-Flush und den Post-Mutations-Flush-Fehlerfall.
- **G-05:** Behoben. Der Jahresabschluss wartet nicht mehr 300 ms auf einen Debounce-Timer; im Produktionspfad wird `update()` synchron vor dem Persistenz-Flush ausgefuehrt.

## Nacharbeitstests

```powershell
node tests\run-single.mjs tests\balance-annual-workflow-contract.test.mjs
node tests\run-single.mjs tests\balance-binder-snapshots.test.mjs
node tests\run-tests.mjs
```

Ergebnis: alle gruen; Gesamtsuite mit 79 Testdateien, 2095 Assertions, 0 Fehler.

## Review-Feedback von Gemini (Runde 2)

### 1. Prüfdimensionen
- **Korrektheit vs. Akzeptanzkriterien:**
  - *Kriterium 1 (Vorab-Flush vor Snapshot):* Erfüllt.
  - *Kriterium 2 (Snapshot vor Mutationen):* Erfüllt. `rollExpensesYearFn()` läuft jetzt vor dem Post-Mutations-Flush.
  - *Kriterium 3 (Fehlervermeidung bei Abbruch):* Erfüllt.
  - *Kriterium 4 (Post-Mutations-Flush):* Erfüllt.
  - *Kriterium 5 (Tests grün):* Erfüllt.
- **Vertragstreue:** Der Default-Fallback in `createSnapshotHandlers` unterstützt jetzt die `{ sync }`-Parameterübergabe korrekt.
- **Fehlerbehandlung:** Der Post-Mutations-Flush-Fehlerfall (Test 5) wurde neu hinzugefügt und verifiziert, dass der Pre-Mutation-Snapshot im Fehlerfall erhalten bleibt.
- **Seiteneffekte:** Keine neuen Seiteneffekte identifiziert.
- **Was könnte brechen?** Die synchrone Ausführung des gesamten Mutation- und Update-Pfads eliminiert die Race-Conditions mit dem Debounce-Timer vollständig. Das verbleibende Restrisiko liegt in potenziellen UI-Fehlern während des synchronen Renders im `rollExpensesYear()`-Schritt, falls dort UI-Elemente fehlen. Dies wurde in den Tests nicht beobachtet und ist als minimal zu bewerten.

### 2. Findings
- Keine neuen Findings. Alle vorherigen Findings (G-01, G-02, G-03, G-05) wurden durch Codex erfolgreich behoben und verifiziert.

### 3. Pre-Mortem
Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
Ein Fehler tritt auf, wenn ein zukünftiges Refactoring von `rollExpensesYear` in `balance-expenses.js` asynchrone Logik einführt, ohne dass dies im Jahresabschluss-Handler durch ein `await` abgefangen wird. Da `rollExpensesYearFn` synchron aufgerufen wird, würde eine asynchrone Signatur unbemerkt zu einem unvollständigen State führen, bevor der Post-Mutations-Flush läuft.

### 4. Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken: Latente Asynchronität bei zukünftigen Änderungen an `rollExpensesYear` (niedrig).

