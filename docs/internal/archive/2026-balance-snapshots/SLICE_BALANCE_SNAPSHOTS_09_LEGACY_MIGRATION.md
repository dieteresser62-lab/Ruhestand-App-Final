# Slice Balance Snapshots 09: Legacy-Migration

**Feature-Branch:** `codex-balance-snapshot-key-policy`  
**Status:** abgeschlossen, freigegeben

## Ziel

Alte `full-localstorage`-Snapshots aus `ruhestandsmodell_snapshot_*`-Records in das kanonische Snapshot-Archiv der aktiven Persistenzadapter migrieren und im Browser den alten `snapshotDB`-Directory-Handle-Store idempotent bereinigen.

## Akzeptanzkriterien

- Legacy-Snapshot-Records werden als kanonische `persistence-records-v1`-Snapshots geschrieben.
- `activeProfileId` wird aus `rs_current_profile` abgeleitet; vor Profilverbund erkennbare Snapshots ohne Registry werden als `default` migriert.
- Wenn keine gueltige aktive Profil-ID ableitbar ist, wird der Snapshot migriert, aber ohne Standard-Restore-Faehigkeit markiert.
- Migrierte Records werden ueber die Capture-Policy gefiltert; Legacy-Snapshot-Keys werden nicht in den neuen Snapshot-Payload uebernommen.
- Migration liefert einen Report mit `migratedCount`, `skippedCount`, `notStandardRestorableCount` und `errors`.
- Alte Legacy-Keys werden erst nach erfolgreichem Schreiben des kanonischen Snapshots geloescht.
- Browser-`snapshotDB`-Cleanup ist idempotent und blockiert bei Fehlern nicht die Snapshot-Migration.

## Scope

- `app/shared/persistence-adapter-indexeddb.js`
- `app/shared/persistence-adapter-tauri.js`
- `tests/persistence.test.mjs`
- Rueckdokumentation in `docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md`

## Nicht-Scope

- Alte Datei-Snapshots aus manuell verbundenen Ordnern aktiv auslesen.
- UI-Text- und Exportpfad-Neusortierung aus Paket 9.
- Release-/Tauri-EXE-Build.

## Diff-Risiko vor Start

Git-Branch vor Start:

```text
codex-balance-snapshot-key-policy
```

Git-Status vor Start:

```text
## codex-balance-snapshot-key-policy...origin/codex-balance-snapshot-key-policy [ahead 1]
```

Geplante Dateien:
- `docs/internal/SLICE_BALANCE_SNAPSHOTS_09_LEGACY_MIGRATION.md`
- `app/shared/persistence-adapter-indexeddb.js`
- `app/shared/persistence-adapter-tauri.js`
- `tests/persistence.test.mjs`
- `docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md`

Voraussichtliche Aenderungstiefe:
- mittel

Gefaehrdete bestehende Tests:
- `tests/persistence.test.mjs`
- Snapshot-/Restore-Contract-Tests

Nicht anfassen:
- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- UI-Texte und Exportpfad

Rollback-Strategie:
- `git checkout -- app/shared/persistence-adapter-indexeddb.js app/shared/persistence-adapter-tauri.js tests/persistence.test.mjs docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md`
- neu angelegte Slice-Datei nach Freigabe loeschen, falls Rollback gewuenscht ist.

## Geplante Tests

- `node tests/run-single.mjs tests/persistence.test.mjs`
- Bei erfolgreichem fokussiertem Lauf: `node tests/run-tests.mjs`

## Ergebnisse

Umgesetzt:

- IndexedDB-Adapter migriert alte `ruhestandsmodell_snapshot_*`-Records mit `snapshotType: "full-localstorage"` in den Store `snapshots`.
- Tauri-JSON-Adapter migriert entsprechende Legacy-Records aus der Live-State-Datei in das separate Snapshot-Target.
- `listSnapshots()` stoesst die Migration idempotent an, damit alte Snapshots beim normalen Snapshot-Rendering sichtbar werden.
- Migrierte Snapshots verwenden das kanonische Format `persistence-records-v1`.
- `activeProfileId` wird aus `rs_current_profile`/`rs_active_profile` abgeleitet; Snapshots ohne Profilregistry werden als Vor-Profilverbund-Fall mit `default` migriert; Snapshots mit Registry, aber ohne ableitbare Profil-ID bleiben nicht standard-restore-faehig.
- Legacy-Snapshot-Keys und technische UI-/Debug-/Telemetry-/Window-Keys werden aus dem neuen Snapshot-Payload gefiltert.
- Erfolgreich migrierte Legacy-Keys werden aus dem Live-Store entfernt.
- Browser-`snapshotDB` wird nach Migration/Initialisierung idempotent geloescht und ueber Metadata `legacySnapshotDbCleanup` markiert.

Bewusst nicht umgesetzt:

- Alte Datei-Snapshots aus einem manuell verbundenen Ordner werden nicht automatisch gelesen. Der bisherige Directory-Handle-Store wird nur bereinigt; ein manueller Import-/Exportpfad bleibt Paket 9/10.
- Die Capture-Policy ist in den Adaptern lokal dupliziert, um Import-Zyklen ueber `persistence-facade`/`snapshot-archive`/`profile-state` zu vermeiden. Das ist absichtlich eng auf Legacy-Migration begrenzt.

## Ausgefuehrte Tests

- `node tests\run-single.mjs tests\persistence.test.mjs` -> gruen.
- `node tests\run-tests.mjs` -> gruen: 79 Testdateien, 2117 Assertions, 0 Fehler.
- Nach Review-Nacharbeit:
  - `node tests\run-single.mjs tests\persistence.test.mjs` -> gruen.
  - `node tests\run-tests.mjs` -> gruen: 79 Testdateien, 2130 Assertions, 0 Fehler.

## Abweichungen vom Plan

- Migration wird bei `listSnapshots()` automatisch angestossen, weil es sonst keinen produktiven Aufrufpfad fuer die neuen Adapter-Methoden gaebe.
- Automatisches Auslesen alter Ordner-Dateisnapshots bleibt aus Scope; ohne aktiven Nutzer-Handle und UI-Entscheidung waere das nicht belastbar.

## Offene Risiken

- Die zentrale Capture-Key-Policy ist jetzt zyklusfrei und wird von den Adaptern wieder direkt verwendet. Aenderungen an fachlichen Snapshot-Keys muessen weiterhin ueber `persistence-key-policy.js` laufen.
- Bereits vorhandene kanonische Snapshot-IDs werden als Skip behandelt; der alte Legacy-Key bleibt in diesem Fall erhalten, um keinen nicht nachweislich migrierten Datensatz zu loeschen.

## Rueckdokumentation

- `docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md` markiert Paket 8 als abgeschlossen und verweist auf diese Slice-Datei.

## Freigabestatus

Review durch Claude durchgeführt am 2026-06-04. Ergebnis: **freigegeben mit Restrisiken**.

Nach Review-Nacharbeit durch Codex am 2026-06-04 sind die wesentlichen Restrisiken aus Claude/Gemini adressiert; erneute Review-Pruefung ausstehend.

## Review-Feedback von Claude

### Prüfdimensionen

#### 1. Korrektheit vs. Akzeptanzkriterien

- **Legacy-Snapshot-Records werden als kanonische `persistence-records-v1`-Snapshots geschrieben**: ✅ Geprüft. Beide Adapter (`persistence-adapter-indexeddb.js` L161–188, `persistence-adapter-tauri.js` L182–209) verwenden `buildCanonicalSnapshotFromLegacy()`, das `snapshotType: 'persistence-records-v1'` und `schemaVersion: 1` setzt.
- **`activeProfileId` aus `rs_current_profile` abgeleitet; Vor-Profilverbund als `default`**: ✅ Geprüft. `resolveLegacyActiveProfileId()` (IDB L148–153, Tauri L169–174) prüft zuerst `rs_current_profile`, dann `rs_active_profile`, fällt auf `'default'` zurück wenn keine Registry existiert, und gibt `''` zurück wenn Registry vorhanden aber kein Profil ableitbar.
- **Nicht-standard-restore-fähig markiert**: ✅ Geprüft. Zeile IDB L424 / Tauri L353: `if (!canonical.activeProfileId) report.notStandardRestorableCount += 1`.
- **Capture-Policy filtert Legacy-Snapshot-Keys**: ✅ Geprüft. `isAllowedSnapshotCaptureKey()` (IDB L118–123, Tauri L139–144) lehnt Legacy-Keys und technische Keys ab.
- **Migrationsreport mit `migratedCount`, `skippedCount`, `notStandardRestorableCount`, `errors`**: ✅ Geprüft. `createLegacyMigrationReport()` (IDB L190–197, Tauri L211–218) liefert alle vier Felder.
- **Legacy-Keys erst nach erfolgreichem Schreiben gelöscht**: ✅ Geprüft. IndexedDB: atomare Transaktion über `SNAPSHOT_STORE` und `KV_STORE` (IDB L414–421). Tauri: Delete im Speicher, Persist erst nach Schleife (Tauri L348, L359–360).
- **`snapshotDB`-Cleanup idempotent und nicht blockierend**: ✅ Geprüft. IDB L430–442: Cleanup-Marker geprüft, Fehler nur in `report.errors` geloggt, nicht geworfen.

#### 2. Vertragstreue (bestehende Contracts/Interfaces)

- Die bestehende Adapter-API (`open`, `loadAll`, `saveBatch`, `readMetadata`, `writeMetadata`, `listSnapshots`, `readSnapshot`, `writeSnapshot`, `deleteSnapshot`) bleibt unverändert. `migrateLegacySnapshotsIfNeeded()` war bereits als Contract im Plan (Paket 8) definiert.
- Die lokale Duplizierung der Capture-Policy-Konstanten in beiden Adaptern ist identisch (IDB L18–47 ≡ Tauri L18–47). Die Reihenfolge, Werte und Logik stimmen zeichengenau überein.
- **Abweichung zum Plan notiert**: Die Snapshot-ID verwendet das Muster `snapshot_legacy_<suffix>` (L174/L195), nicht `legacy-<timestamp>` wie in der initialen Slice-Beschreibung der Subagenten suggeriert. Das ist eine konsistente Implementierungsentscheidung, kein Fehler.

#### 3. Fehlerbehandlung (ungültige Eingaben, IO-Fehler, Rejection-Pfade)

- **Unparseable Legacy-Snapshots**: `parseLegacySnapshot()` (IDB L135–141, Tauri L156–162) gibt `null` zurück bei ungültigem JSON oder fehlendem `snapshotType: 'full-localstorage'`. Dies führt zu `skippedCount += 1`, kein Fehler.
- **Fehler bei einzelner Key-Migration**: Try-catch um die gesamte Migration pro Key (IDB L403–427, Tauri L336–356). Fehler werden in `report.errors` gesammelt, Migration läuft für andere Keys weiter.
- **IndexedDB Transaktionsfehler**: `transactionDone()` (IDB L65–71) fängt `onabort` und `onerror` ab und wirft einen Error, der im Catch-Block landet.
- **Tauri persist-Fehler**: Wenn `persistSnapshots()` (Tauri L359) erfolgreich aber `persist()` (Tauri L360) fehlschlägt, werden die kanonischen Snapshots geschrieben, die Legacy-Keys aber nicht aus der Live-Datei entfernt. Bei erneutem Aufruf greift die Duplikat-Prüfung (Tauri L343–345), sodass kein Datenverlust entsteht. Restrisiko: verwaiste Legacy-Keys.

#### 4. Seiteneffekte (Module außerhalb Slice-Scope)

- Keine Änderungen an `engine/`, `dist/`, `RuheStandSuite.exe` oder UI-Texten. ✅
- Die Adapter-Änderungen betreffen nur `app/shared/persistence-adapter-indexeddb.js` und `app/shared/persistence-adapter-tauri.js` – beide im Slice-Scope.
- `tests/persistence.test.mjs` wurde um Migrationstests erweitert (Test 12d L736–797, Test 13b L871–919). Die bestehenden Tests (Test 12, 12b, 12c, 13) bleiben unverändert.
- Die Rückdokumentation im Arbeitsplan ist minimal (nur Status-Update), keine unerwarteten Seiteneffekte.

#### 5. Was könnte brechen? (realistisches Versagensszenario)

- **Performance bei großen KV-Stores**: `migrateLegacySnapshotsIfNeeded()` im IndexedDB-Adapter scannt bei jedem `listSnapshots()`-Aufruf den gesamten KV-Store per Cursor (IDB L385–399). Es gibt keine In-Memory-Cache-Flag wie beim Tauri-Adapter. Nach erfolgreicher Migration sind keine Legacy-Keys mehr vorhanden und die Schleife L401 iteriert über ein leeres Array, aber der Cursor-Scan bleibt. Bei einem KV-Store mit vielen hundert Einträgen ist das bei jedem Rendering-Zyklus ein unnötiger Overhead.
- **Capture-Policy-Drift**: Die lokal duplizierte `SNAPSHOT_CAPTURE_EXACT_KEYS` (IDB L18–44, Tauri L18–44) ist eine Kopie der zentralen Policy in `persistence-key-policy.js` (L30–41), aber erweitert um zusätzliche Keys (`depot_tranchen`, `profile_*`, `showCareDetails`, `logDetailLevel`, etc.), die in der zentralen Policy nicht in `SNAPSHOT_CAPTURE_EXACT_KEYS` stehen. Die zentrale Policy verwendet stattdessen die Referenz auf `PROFILE_SCOPED_FIXED_KEYS`. Die Listen sind inhaltlich äquivalent, aber strukturell nicht aus einer gemeinsamen Quelle abgeleitet. Bei zukünftigen Key-Ergänzungen in der zentralen Policy werden die Adapter-Kopien nicht automatisch aktualisiert.

### Findings

**C-01** (Hinweis, kein Blocker): **Kein Idempotenz-Fast-Path im IndexedDB-Adapter.** Im Gegensatz zum Tauri-Adapter (der nach erfolgreicher Migration keine Legacy-Keys mehr findet und die `forEach`-Schleife sofort beendet) führt der IndexedDB-Adapter bei jedem `listSnapshots()` einen vollen Cursor-Scan über den KV-Store durch (IDB L385–399). Ein einfacher Metadata-Marker (analog zum `legacySnapshotDbCleanup`-Marker) würde den wiederholten Scan eliminieren. **Bewertung**: Funktional korrekt, da nach Migration keine Legacy-Keys mehr existieren, aber ein unnötiger IO-Overhead pro `listSnapshots()`-Aufruf.

**C-02** (Hinweis, kein Blocker): **Verwaiste Legacy-Keys bei Skip-Szenario.** Wenn ein kanonischer Snapshot mit derselben ID bereits existiert (IDB L411, Tauri L343), wird der Legacy-Key im KV-Store / Live-State belassen (IDB: keine Löschung, Tauri L345: nur `skippedCount += 1`). Diese verwaisten Keys verbrauchen Speicher und werden bei jedem Migrations-Scan erneut gelesen und übersprungen. Die Slice-MD dokumentiert dieses Verhalten korrekt unter „Offene Risiken".

**C-03** (Hinweis, kein Blocker): **Fehlender expliziter Idempotenz-Test.** Es gibt keinen Test, der `migrateLegacySnapshotsIfNeeded()` zweimal auf demselben Adapter aufruft, um die Idempotenz direkt zu beweisen. Die Idempotenz ist implizit gewährleistet (Legacy-Keys werden gelöscht → zweiter Scan findet nichts), aber ein expliziter Test würde die Contract-Garantie absichern.

**C-04** (Hinweis, kein Blocker): **Kein Test für `rs_active_profile`-Fallback.** Die Implementierung prüft korrekt zuerst `rs_current_profile`, dann `rs_active_profile` (IDB L149, Tauri L170). Es gibt jedoch keinen Test, der spezifisch den `rs_active_profile`-Pfad abdeckt (nur `rs_current_profile` und No-Profile-Szenarien sind getestet).

**C-05** (Dokumentation): **Snapshot-Kind ist `manual`, nicht `legacy-migration`.** Die Slice-Beschreibung im `## Ergebnisse`-Abschnitt spricht von Legacy-Migration, aber `SNAPSHOT_KIND_MANUAL` wird für migrierte Snapshots verwendet (IDB L7/L177, Tauri L7/L198). Das ist konsistent implementiert und die Wahl von `manual` gegenüber einem eigenen `legacy-migration`-Kind ist eine bewusste Entscheidung, hat aber keine Dokumentation in der Slice-MD.

### Pre-Mortem

> „Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?"

**Wahrscheinlichste Ursache**: Ein neuer fachlicher Key (z. B. ein neuer `profile_*`-Key oder ein neuer `balance_*`-Prefix) wird in der zentralen `persistence-key-policy.js` ergänzt, aber die lokal duplizierten `SNAPSHOT_CAPTURE_EXACT_KEYS`-Sets in den beiden Adaptern werden nicht synchron aktualisiert. Legacy-Snapshots, die diesen Key enthalten, verlieren ihn bei der Migration stillschweigend. Da die Migration idempotent ist und alte Keys nach erfolgreicher Migration gelöscht werden, ist der Datenverlust irreversibel. Dieses Risiko ist in der Slice-MD unter „Offene Risiken" korrekt dokumentiert, hat aber keinen automatischen Guard (keinen Test, der die Gleichheit der Policy-Listen erzwingt).

### Review-Ergebnis

```
Status: freigegeben
Blocker: keine
Restrisiken:
  - C-01: IndexedDB-Cursor-Scan bei jedem listSnapshots() nach Migration (Performance, nicht Korrektheit)
  - C-02: Verwaiste Legacy-Keys bei Skip-Szenario (dokumentiert)
  - C-03: Kein expliziter Idempotenz-Test (implizit gewährleistet)
  - C-04: Kein Test für rs_active_profile-Fallback (Code korrekt, Testlücke)
  - C-05: Snapshot-Kind manual vs. legacy-migration undokumentiert
  - Capture-Policy-Drift zwischen Adaptern und zentraler Policy (Pre-Mortem-Risiko)
```

## Review-Feedback von Gemini (Antigravity) - Nachprüfung

### Prüfdimensionen nach Nacharbeit

#### 1. Korrektheit vs. Akzeptanzkriterien
- **Migration wird bei `readSnapshot()` getriggert**: ✅ Behoben. Sowohl der IndexedDB- als auch der Tauri-Adapter nutzen nun `getCanonicalLegacySnapshotId` und rufen bei einem Miss `migrateLegacySnapshotsIfNeeded()` auf, um Altdaten on-demand zu migrieren. Getestet in `Test 12e` und `Test 13c`.
- **Fast-Path für IndexedDB**: ✅ Behoben. Ein `legacySnapshotMigration`-Metadatenmarker wird nach erfolgreicher Migration gesetzt. Zukünftige Aufrufe von `listSnapshots()` überspringen den KV-Store Cursor-Scan sofort. Getestet in `Test 12e`.

#### 2. Vertragstreue
- Die Schnittstellenvereinbarungen der Adapter wurden formal eingehalten. Die Tests wurden um umfassende Idempotenz- und Fehlerfalltests erweitert (`Test 12e`, `Test 13c`, `Test 13d`).

#### 3. Fehlerbehandlung
- **Atomarität im Tauri-Adapter**: ✅ Behoben. `migrateLegacySnapshotsIfNeeded()` im Tauri-Adapter schreibt nun zuerst das Snapshot-Archiv. Erst nach erfolgreichem Schreiben werden die Legacy-Keys in-memory gelöscht und der Live-State persistiert. Bei Fehlern wird der Zustand im Speicher zurückgerollt und die Originaldaten bleiben erhalten. Getestet in `Test 13d`.

#### 4. Seiteneffekte
- Die Duplizierung der Key-Listen in den Adaptern wurde komplett aufgelöst. Die Adapter importieren nun gemeinsam aus `persistence-key-policy.js`. Die Key-Policy wurde so umstrukturiert, dass keine zirkulären Abhängigkeiten im Browser entstehen.

#### 5. Was könnte brechen? (Pre-Mortem nach Nacharbeit)
- **Drift zwischen App-Zustand und Persistenz-Policy**: ⚠️ Um zyklische Abhängigkeiten zu vermeiden, sind die Profil-Keys (`PROFILE_STORAGE_KEYS` und `PROFILE_SCOPED_FIXED_KEYS`) nun redundant in `app/profile/profile-state.js` und `app/shared/persistence-key-policy.js` definiert. Wenn ein Entwickler zukünftig ein neues Feld in `profile-state.js` hinzufügt, muss er es zwingend auch in `persistence-key-policy.js` eintragen, da es andernfalls bei einer Altdaten-Migration stillschweigend verworfen wird. (Erhöhtes Restrisiko, siehe Pre-Mortem).

### Pre-Mortem

> „Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?"

**Wahrscheinlichste Ursache**: Ein neues profilspezifisches Feld wird in `profile-state.js` eingeführt und in `PROFILE_SCOPED_FIXED_KEYS` registriert. Da die Key-Definitionen aufgrund der Zyklenvermeidung redundant in `persistence-key-policy.js` gespiegelt sind, wird vergessen, das Feld dort ebenfalls einzutragen. Bei einer Migration von Altdaten verliert der Benutzer dieses neue Feld permanent.

### Review-Ergebnis (Gemini nach Nacharbeit)

```markdown
Status: freigegeben
Blocker: keine
Restrisiken:
  - Redundanz der Key-Definitionen (Gefahr von manuellem Key-Drift bei zukünftigen Erweiterungen).
  - C-02: Verwaiste Legacy-Keys bei Skip-Szenario bleiben im KV-Store (dokumentierte, bewusste Entscheidung).
```

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| C-01 | Claude | Kein Idempotenz-Fast-Path im IndexedDB-Adapter: voller KV-Cursor-Scan bei jedem `listSnapshots()` | angenommen | erledigt: Metadata-Marker `legacySnapshotMigration` verhindert wiederholte KV-Scans; Test 12e |
| C-02 | Claude | Verwaiste Legacy-Keys bei Skip-Szenario bleiben im KV-Store | akzeptiert als Restrisiko | In Slice-MD dokumentiert; bewusste Entscheidung gegen Löschung nicht-nachweislich migrierten Daten |
| C-03 | Claude | Fehlender expliziter Idempotenz-Test | angenommen | erledigt: Test 12e prueft zweiten Migrationslauf und Fast-Path |
| C-04 | Claude | Kein Test für `rs_active_profile`-Fallback | angenommen | erledigt: Test 12e und 13c pruefen `rs_active_profile` fuer IndexedDB und Tauri |
| C-05 | Claude | Snapshot-Kind `manual` statt eigenem `legacy-migration`-Kind undokumentiert | akzeptiert | Konsistente Implementierungsentscheidung, keine funktionale Auswirkung |
| G-01 | Gemini | Migration fehlt in `readSnapshot()` | angenommen | erledigt: `readSnapshot()` triggert bei fehlendem Treffer Migration und akzeptiert alte Legacy-IDs; Tests 12e und 13c |
| G-02 | Gemini | In-Memory-Zustandsdrift bei Tauri-Fehlern | angenommen | erledigt: Tauri-Migration schreibt erst das Snapshot-Archiv, loescht Legacy-Keys danach aus dem Live-State; Test 13d |
| G-03 | Gemini | Fehlender globaler Migrations-Fast-Path für IndexedDB | angenommen | erledigt: analog C-01 mit `legacySnapshotMigration`-Marker; Test 12e |
| G-04 | Gemini | Sicherheitsrisiko durch Drift der Capture-Policy-Kopie | angenommen | erledigt: Adapter nutzen wieder die zentrale `persistence-key-policy.js`; diese wurde zyklusfrei gemacht |
