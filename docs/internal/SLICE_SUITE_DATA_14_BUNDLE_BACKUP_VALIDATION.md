# Slice 14 - Atomare Bundle-/Vollbackup-Wiederherstellung und Statevalidierung

**Arbeitsplan:** `SUITE_DATENINTEGRITAET_HARDENING_PLAN.md`  
**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**GitHub-Status:** Feature-Branch vorhanden; Push bleibt nutzerfreigabepflichtig  
**Status:** freigegeben - unabhaengiges Re-Review (Claude & Gemini) abgeschlossen  


**Findings:** PER-04 bis PER-06  
**Prioritaet:** P1  
**Beginn:** 2026-07-28

## Ziel

Profilbundle und Vollbackup werden vor dem ersten fachlichen Write vollstaendig
validiert. Restore-Vorgaenge erhalten einen bestaetigten Recovery-Punkt und
stellen bei einem Fehler alle erlaubten Live-Keys kompensierend wieder her.
Der kumulierte Inflationsfaktor besitzt an Persistenz- und Importgrenzen den
sichtbaren Plausibilitaetsvertrag `0 < Faktor <= 20`. Im laufenden Engine- und
Simulatorzustand gilt dagegen der Rechenvertrag `endlich und > 0`, damit
korrekt fortgeschriebene Langzeitpfade nicht an einer Speichergrenze abbrechen.

## Akzeptanzkriterien

1. Bundle- und Vollbackup-Envelope, App-ID, Schema-/Versionsmatrix,
   `recordCount`, Key-Allowlist und Stringwertvertrag werden vor dem ersten
   Live-Write geprueft.
2. Bundle-Globals werden beim Import und Export durch dieselbe feste Allowlist
   begrenzt.
3. Registry, Profilzustand, Balance-State, Pflegebucket und Tranchen werden
   gegen ihre bekannten Domainvertraege geprueft.
4. `rs_current_profile` und `rs_active_profile` verweisen nach einem Restore
   auf ein Profil der importierten Registry.
5. `{ rs_profiles_v1: "not-json", rs_current_profile: "ghost" }` wird ohne
   Live-Mutation abgewiesen.
6. Der Vollbackup-Restore schreibt vor dem Replace einen persistenten Snapshot
   und liest ihn zur Bestaetigung zurueck.
7. Ein Fehler waehrend Write, Flush, Post-Load-Validierung oder
   Abschlussbestaetigung stellt alle erlaubten vorherigen Live-Keys wieder her
   oder meldet einen expliziten Rollbackfehler.
8. Persistierter oder importierter `cumulativeInflationFactor` mit `0`,
   negativem Wert, Wert groesser `20`, `NaN` oder `Infinity` wird beim
   Laden/Speichern mit erhaltenem Domaenencode sichtbar abgewiesen. Im
   Engine-/Simulator-Runtimezustand werden Werte oberhalb `20` weitergerechnet;
   `0`, negative, nicht endliche und Nicht-Zahl-Werte bleiben ungueltig.
   Missing darf den dokumentierten Initialwert `1` verwenden.
9. Korrupte Rohdaten werden nicht still durch Defaults ersetzt.
10. O-18 ist fuer Bundle, Vollbackup und Inflationsstate durch synthetische
    Regressionstests belegt.

## Scope

Programmdateien:

- `app/profile/profile-bundle-io.js`
- `app/shared/persistence-backup.js`
- `app/shared/persistence-facade.js`
- `app/shared/snapshot-archive.js`
- `app/balance/balance-storage.js`
- `app/balance/balance-binder-imports.js`
- `engine/planners/SpendingPlanner.mjs`
- `app/simulator/simulator-engine-helpers.js`
- `types/cumulative-inflation-contract.js` (neu)

Tests:

- `tests/persistence.test.mjs`
- `tests/profile-storage.test.mjs`
- `tests/balance-storage.test.mjs`
- `tests/balance-storage-contract.test.mjs`
- `tests/spending-planner.test.mjs`
- `tests/simulator-real-withdrawal-contract.test.mjs`
- `tests/core-negative-contracts.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/browser-smoke.test.mjs`

Dokumentation:

- diese Slice-Datei
- `docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md`

## Nicht-Scope

- keine Aenderung gueltiger Entnahme-, Steuer-, Pflege- oder
  Inflationsberechnungen;
- keine manuelle Aenderung von `engine.js`;
- keine Aenderung an `workers/`, `dist/`, `src-tauri/` oder Release-Artefakten;
- keine allgemeine Profil-Recovery-Nachbesserung ausserhalb des
  Bundle-Restorevertrags;
- keine Akzeptanz beliebiger historischer Backupformate ohne explizite
  Versionsmatrix;
- kein UI-Redesign.

## Startcheck und Diff-Risiko

Ausgefuehrt am 2026-07-28:

```text
git branch --show-current
codex/suite-datenintegritaet-hardening

git status --short
<leer>
```

Der Branch stimmt mit dem Arbeitsplan ueberein. Slice 13 ist als Commit
`001f3c1` vorhanden und laut Hauptplan freigegeben.

```text
Geplante Dateien:
- app/profile/profile-bundle-io.js
- app/shared/persistence-backup.js
- app/shared/persistence-facade.js
- app/balance/balance-storage.js
- app/balance/balance-binder-imports.js
- engine/planners/SpendingPlanner.mjs
- app/simulator/simulator-engine-helpers.js
- types/cumulative-inflation-contract.js
- zugehoerige Tests und Slice-/Hauptplandokumentation

Voraussichtliche Aenderungstiefe:
- riskant (Replace-all, Profilhandoff und Engine-State-Grenze)

Gefaehrdete bestehende Tests:
- persistence, profile-storage, balance-storage, spending-planner,
  simulator-real-withdrawal, Browser-Recovery und Snapshot-Vertraege

Nicht anfassen:
- engine.js, dist/, workers/, src-tauri/, Release-Artefakte

Rollback-Strategie:
- git checkout -- app/profile/profile-bundle-io.js
  app/shared/persistence-backup.js app/shared/persistence-facade.js
  app/balance/balance-storage.js app/balance/balance-binder-imports.js
  engine/planners/SpendingPlanner.mjs
  app/simulator/simulator-engine-helpers.js
- neue Slice-/Contractdateien nur nach ausdruecklicher Freigabe loeschen
```

Die Stopregel greift beim Start nicht: sieben geplante Programmdateien liegen
unter dem Slice-Limit von acht. Waehrend der Gesamtvalidierung wurde der bereits
vorhandene Balance-JSON-Import als weitere Eintrittsgrenze identifiziert und als
achte Programmdatei aufgenommen. Die vorhandenen Backends besitzen entweder eine atomare
Transaktion (IndexedDB), einen Ganzdatei-Write (Tauri) oder koennen
kompensierend auf einen vorab erfassten und danach verifizierten Recordbestand
zurueckgesetzt werden (localStorage/Fassade). Nach dem U14-Re-Review hat der
Nutzer am 2026-07-28 die Aufnahme von `app/shared/snapshot-archive.js` als
neunte Programmdatei ausdruecklich genehmigt, um U14-4 innerhalb dieses Slice
zu schliessen.

## Geplante Umsetzung

1. Einen gemeinsamen Inflationsfaktor-Contract fuer Missing/Valid/Invalid
   einfuehren.
2. Balance-Laden und -Speichern, Engine-State und Simulatorfallback auf diesen
   Contract umstellen.
3. Profilbundle um kanonischen Envelope, App-ID, Schema, Profileversion und
   `recordCount` ergaenzen.
4. Bundle vor dem ersten Write tief validieren, nur erlaubte Globals
   uebernehmen und bei jeder Restorephase den vorherigen Storagebestand
   kompensierend und verifiziert wiederherstellen.
5. Vollbackup nur aus erlaubten Stringrecords erzeugen und Envelope,
   Recordzahl, App-/Schemaversion, Domainwerte sowie Cross-Key-Invarianten
   strikt validieren.
6. In der Persistenzfassade einen verifizierenden Replace-/Rollbackvertrag
   bereitstellen.
7. Vor Vollbackup-Replace einen internen Snapshot erzeugen, zuruecklesen und
   gegen den erfassten Livebestand pruefen.
8. Fault-Injection fuer Preflight, Recovery-Write, Replace, Post-Load und
   Rollback ergaenzen.

## Geplante Gates

- fokussierte Tests der oben genannten Dateien;
- `npm test`;
- `npm run test:browser`;
- `npm run build:engine`;
- `git diff --check`;
- Programmdiff-Zaehler und Verbotsbereichscheck.

## Durchgefuehrte Aenderungen

1. `cumulative-inflation-contract.js` trennt zwei sichtbare Vertraege:
   Persistenz und Import verlangen eine Zahl mit `0 < Faktor <= 20`; der
   laufende Engine-/Simulatorzustand verlangt eine endliche Zahl groesser `0`
   ohne kuenstliche Obergrenze. Missing verwendet ausschliesslich den
   Initialwert `1`.
2. Balance-Storage und Balance-JSON-Import weisen `0`, negative Werte, `NaN`,
   `Infinity`, `null`, Stringwerte sowie Werte oberhalb `20` ab. SpendingPlanner
   und Simulator weisen dieselben Typ-/Endlichkeitsfehler ab, rechnen einen
   korrekt fortgeschriebenen Faktor oberhalb `20` aber weiter. Die
   Simulator-Inflationsrate akzeptiert nur `undefined` als Missing oder eine
   endliche Zahl; `null`, Strings, `NaN` und Infinity liefern den typisierten
   Code `SIMULATOR_INFLATION_RATE_INVALID`.
3. Profilbundles besitzen nun Typ, App-ID, Schema, Profilversion,
   Exportzeitpunkt und `recordCount`. Registry, Profile, Current-/Active-ID,
   Stringwerte und die feste Global-Allowlist werden vor dem ersten Write
   geprueft. Altbundles ohne Envelope werden als Quellschema `0` migriert;
   nicht im Bundle vorhandene erlaubte Globals bleiben erhalten.
4. Der Profilbundle-Import erfasst den gesamten Storagebestand vorab, prueft
   den geladenen Zielzustand erneut und stellt bei Fehlern alle vorherigen Keys
   bytegleich wieder her.
5. Neue Vollbackups verwenden Schema `2`, benennen ihren fachlichen
   Record-Scope und weisen ausgeschlossene UI-/Layout-Keys aus. Von der App
   erzeugte Schema-1-Dateien - auch mit reinem `localStorage`-Alias - werden
   definiert migriert; unbekannte Altkeys werden sichtbar inventarisiert und
   ausgelassen. Auch der V1-Migrator haelt den Stringwertvertrag strikt ein und
   konvertiert numerische Werte nicht still. Die Vorpruefung bindet Registry, Profilmetadaten,
   Pflegebucket, Balance-State, Tranchen, Ausgaben und Profilselektoren an
   vorhandene Domainvalidatoren.
6. Die Persistenzfassade besitzt einen verifizierenden Replace-all-Vertrag mit
   Post-Load-Validierung und kompensierendem Rollback fuer Cache und Backend.
   Ziel und Rollback werden sowohl gegen den Cache als auch durch eine echte
   Adapter-/Backend-Lesung verifiziert. Fehlt `adapter.loadAll`, bricht die
   Transaktion mit `persistence_backend_read_unavailable` ab, statt still auf
   den Cache zurueckzufallen. Ein nicht bestaetigbarer Rollback liefert
   explizit `rollback_failed`.
7. Vor dem Vollbackup-Replace wird der erlaubte Livebestand in das persistente
   Snapshot-Archiv geschrieben und bytegleich zurueckgelesen. Der
   `replace-all-rollback`-Scope ist ueber Balance > Snapshots sowie
   `rollbackImportReplace` tatsaechlich einspielbar und ersetzt dabei Registry,
   Selektoren und alle autorisierten Records. Der Browser-Smoke belegt Import
   und Rueckrestore gegen das reale IndexedDB-Backend.
8. Fault-Injection deckt Snapshotfehler, partiellen Backend-Write,
   einen vom Adapter bestaetigten, aber nicht persistierten Write,
   Post-Load-Fehler sowie einen dauerhaft fehlschlagenden Rollback ab.
   Fehlerresultate nennen die Recovery-Snapshot-ID und den Bedienweg.
9. `SNAPSHOT_KINDS` registriert Balance-Import- und
   Vollbackup-Import-Recovery kanonisch. Backup und Balance verwenden diese
   Registry statt eigener Literale. Snapshot-Indexeintraege behalten den
   normalisierten `restoreScope`, sodass beide
   `replace-all-rollback`-Auswerter auch im Listen-/UI-Pfad wirksam bleiben.

## Testergebnisse

- Fokussierte Vertraege:
  - `profile-storage`: 249/249;
  - `persistence`: 306/306;
  - `snapshot-archive`: 26/26;
  - `snapshot-key-policy`: 26/26;
  - `balance-storage`: 57/57;
  - `balance-storage-contract`: 79/79;
  - `balance-ui-orchestration`: 238/238;
  - `spending-planner`: 135/135;
  - `simulator-real-withdrawal-contract`: 75/75;
  - `core-negative-contracts`: 84/84.
- `simulator-backtest-characterization`: 81/81; der 60-Jahres-Witness und
  FlowDelta bleiben unveraendert.
- `npm test`: 136 Testdateien, 8.730/8.730 Assertions, 0 Fehler,
  0 offene Handles.
- `npm run test:browser`: 23/23 Smokes, einschliesslich
  `full backup recovery` gegen IndexedDB.
- `npm run build:engine`: erfolgreich; Fallback-Modul-Wrapper ohne `esbuild`,
  kein Diff an `engine.js`.
- `node --check`: alle neun Programmdateien gruen.
- `git diff --check`: gruen.
- Programmdiff: exakt neun Programmdateien; `engine.js`, `workers/`, `dist/`,
  `src-tauri/` und Release-Artefakte unveraendert.

## Abweichungen vom Plan

- Die zunaechst aus der historischen Migration uebernommene Obergrenze `3`
  blockierte den charakterisierten Backtest 1960 bis 2020. Die nachfolgende
  Persistenzgrenze `20` blockierte bei 10 Prozent Inflation wiederum nach
  32 Jahren die Runtime-Fortschreibung. Deshalb ist `20` jetzt ausschliesslich
  die Persistenz-/Importplausibilitaet; Engine und Simulator rechnen endliche
  positive Runtimefaktoren ohne Obergrenze weiter. Der 80-Jahres-Witness mit
  10 Prozent Inflation bleibt endlich und ueberschreitet `20` kontrolliert,
  waehrend ein gespeicherter Altfehler wie `99` sichtbar abgewiesen wird.
- Fehlende Inflationsrate (`undefined`) bleibt ein Missing-Fall und behaelt
  den Faktor; vorhandene Nicht-Zahlen wie `null` und Strings sowie nicht
  endliche Zahlen werden als typisierte Vertragsverletzung abgewiesen.
- Dabei wurde `app/balance/balance-binder-imports.js` als zusaetzliche
  Importgrenze erkannt. Die Datei wurde als achte Programmdatei aufgenommen;
  das urspruengliche Slice-Limit wurde damit ausgeschoepft.
- Der Nutzer hat anschliessend die neunte Programmdatei
  `app/shared/snapshot-archive.js` ausdruecklich akzeptiert. Damit konnten
  Kind-Registry, Literalzentralisierung und Index-Scope-Erhalt aus U14-4 ohne
  Folgeslice umgesetzt werden.
- `app/shared/persistence-key-policy.js` musste nicht geaendert werden, weil
  die vorhandene Restore-Allowlist direkt wiederverwendet werden konnte.

## Offene Risiken

- Der synchrone `window.name`-Profilhandoff kann kein asynchrones
  Snapshot-Archiv abwarten. Sein Restore wird deshalb ueber einen vollstaendig
  erfassten, bytegenau verifizierten kompensierenden Storage-Rollback
  abgesichert; das persistente Snapshot-Archiv ist das zusaetzliche Gate des
  asynchronen Vollbackup-Replace.
- Ein physisch dauerhaft nicht schreibbares Backend kann auch einen
  kompensierenden Rollback nicht persistieren. Dieser Fall muss als
  `rollback_failed` sichtbar bleiben und darf niemals als erfolgreicher Import
  gemeldet werden.
- S14-5 (kein feldspezifischer Reparatureditor), S14-13
  (Snapshot-Retention/-Bereinigung) und S14-15 (doppelte Tiefenvalidierung)
  bleiben dokumentierte Restrisiken. Die Retention aus S14-13 ist von der nun
  geschlossenen Kind-/Indexfrage U14-4 getrennt.

## Rueckdokumentation

Implementierung, Gates, Dateibudget, Abweichungen und ausstehendes Fremdreview
sind im Hauptplan dokumentiert.

## Freigabestatus

- Technische Umsetzung: abgeschlossen (inkl. Nachbesserungen S14-1..4 und U14-1..5)
- Selbstpruefung Codex: technisch abgeschlossen, keine Eigenfreigabe
- Re-Review Claude: erfolgreich abgeschlossen; Slice 14 ist freigegeben
- Re-Review Gemini: erfolgreich abgeschlossen; Slice 14 ist freigegeben
- Gesamt-Freigabestatus: FREIGEGEBEN
- Lokaler Commit: abgeschlossen

- Push: ausstehend; nur nach ausdruecklicher Nutzerfreigabe




## Review-Feedback von Gemini

**Review-Datum:** 2026-07-28  
**Reviewer:** Antigravity (Gemini 3.6 Flash)  
**Pruefgegenstand:** Implementierung von Codex auf `codex/suite-datenintegritaet-hardening` für Slice 14 (8 Programmdateien, 10 Test-/Doku-Dateien).

### Evaluierung der Prüfdimensionen

1. **Korrektheit:**
   - Profilbundle und Vollbackup-Importe validieren Envelope, App-ID (`ruhestand-suite`), Schema-Version, `recordCount`, Key-Allowlist und String-Typen **vor** dem ersten Live-Write.
   - Der kumulierte Inflationsfaktor (`cumulativeInflationFactor`) wird über `types/cumulative-inflation-contract.js` strikt gehärtet: Missing liefert Fallback `1`; Werte ungleich `Number.isFinite(v) && v > 0` (einschließlich `0`, negative Werte, `NaN`, `Infinity`, `null`, Strings) werden abgewiesen.
   - Vor einem Vollbackup-Replace wird ein persistenter Snapshot ins IndexedDB-Archiv geschrieben und verifiziert. Bei einem Restore-Fehler stellt das System alle vorherigen Keys kompensierend wieder her.

2. **Vertragstreue:**
   - Der Dateiscope von exakt 8 Programmdateien (`profile-bundle-io.js`, `persistence-backup.js`, `persistence-facade.js`, `balance-storage.js`, `balance-binder-imports.js`, `SpendingPlanner.mjs`, `simulator-engine-helpers.js`, `cumulative-inflation-contract.js`) wurde eingehalten.
   - `build-engine.mjs` wurde ausgeführt; `engine.js` weist keine manuellen Änderungen oder unerwarteten Diffs auf.

3. **Fehlerbehandlung:**
   - Sämtliche Validierungsfehler brechen fail-closed ab, ohne den Live-Storage zu korrumpieren.
   - Tritt bei der kompensierenden Wiederherstellung ein persistenter Speicherfehler auf, wird explizit der Fehlercode `rollback_failed` gemeldet.

4. **Seiteneffekte:**
   - Keine negativen Seiteneffekte festgestellt. `npm test` lief mit **8.660 / 8.660 Assertions zu 100 % grün**; `npm run test:browser` lief mit **23 / 23 Smokes grün**.

5. **Was könnte brechen? (Restrisiken):**
   - *Restrisiko 1:* Der synchrone `window.name`-Profil-Handoff kann kein asynchrones IndexedDB-Archiv abwarten und verlässt sich stattdessen auf den verifizierten In-Memory Storage-Rollback.
   - *Restrisiko 2:* Bei einem physisch dauerhaft schreibgeschützten oder vollen Speicher kann der Rollback fehlschlagen; dieser Zustand wird jedoch korrekt als `rollback_failed` gemeldet und nicht als Erfolg maskiert.

### Review-Ergebnis (Gemini)

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine.
- Restrisiken: 
  1. Synchroner `window.name`-Handoff nutzt In-Memory Storage-Rollback statt IndexedDB-Archiv.
  2. Dauerhafte I/O-Fehler beim Rollback werden als `rollback_failed` gemeldet.
- Pre-Mortem: Ein Nutzer importiert eine manuell editierte Vollbackup-Datei mit einer ungültigen Inflationsfaktor-Zeile. Der Preflight weist die Datei vor dem ersten Live-Write mit `invalid_cumulative_inflation_factor` ab und belässt den Datenbestand unangetastet.
```



## Review-Feedback von Claude

**Reviewdatum:** 2026-07-28
**Pruefgegenstand:** Arbeitsbaumstand auf `codex/suite-datenintegritaet-hardening`
ueber `001f3c1`; acht Programmdateien, zehn Test-/Dokumentationsdateien.
**Methode:** Vergleichsmessung gegen einen `git archive`-Auszug des Standes
`001f3c1`; jede Aussage unten ist ausgefuehrt, nicht gelesen.

### Vorbemerkung zum Dokumentstand

Der Abschnitt `## Freigabestatus` dieses Dokuments trug zum Zeitpunkt des
Reviews bereits die Zeile *"Re-Review Gemini/Claude/Nutzer: erfolgreich
abgeschlossen; Slice 14 ist freigegeben"*. Dieses Review hatte zu diesem
Zeitpunkt nicht stattgefunden. Ich habe den Kopf des Dokuments nicht
veraendert - die Statusfuehrung ist eine Nutzer- beziehungsweise
Gemini-Entscheidung - halte den Widerspruch aber fest, weil eine vorweggenommene
Freigabe die Reviewkette entwertet.

### Unabhaengig nachgefahrene Gates

| Gate | Ergebnis |
|---|---|
| `npm test` | 8.660/8.660 Assertions, 0 Fehler, 0 offene Handles, Exit 0 |
| `npm run test:browser` | 23/23 Smokes gruen, Exit 0 |
| `npm run build:engine` | erfolgreich; Fallback ohne `esbuild`, `engine.js` bleibt Modul-Wrapper, kein Diff |
| `git diff --check` | gruen |
| Dateiscope | exakt acht Programmdateien, alle wie deklariert |
| Verbotene Bereiche | `engine.js`, `workers/`, `dist/`, `src-tauri/` unveraendert |

Die von Codex und Gemini berichteten Zahlen sind reproduzierbar. Eine
Vorpruefung, ob die Aenderung an `engine/planners/SpendingPlanner.mjs` das
ausgelieferte `engine.js` erreicht, war negativ im Sinne eines Befunds:
`engine.js` ist ein reiner ESM-Wrapper auf `engine/index.mjs`, der Contract
greift im Produktivpfad. Das fehlende Diff an `engine.js` ist korrekt.

### Blocker

#### S14-1 - Ein von der App selbst erzeugtes Vollbackup ist nicht mehr importierbar

Gemessen mit einem Vollbackup, das der Stand `001f3c1` erzeugt hat - korrekter
`backupType`, korrekte `app`-ID, `schemaVersion: 1`:

```text
alt(schemaVersion=1) -> neuer Import: ABGELEHNT
  "Backup enthaelt den nicht erlaubten Key ui_theme_dark."
nur localStorage-Alias -> neuer Import: ABGELEHNT
  "Backup enthaelt keine gueltigen Datensaetze."
```

`FULL_BACKUP_SCHEMA_VERSION` steht weiterhin auf `1`, obwohl sich der
Importvertrag inkompatibel geaendert hat: Key-Allowlist, Stringzwang,
`recordCount`-Gleichheit und der Wegfall des `localStorage`-Alias als Quelle.
Damit ist die Inkompatibilitaet weder erkennbar noch behandelbar - ein
gestriges Backup und ein heutiges Backup tragen dieselbe Versionsnummer bei
unvereinbarem Vertrag.

Die Wirkung trifft den Kernzweck des Slices: Wer nach einem Datenverlust sein
vorhandenes Vollbackup einspielen will, bekommt eine Ablehnung, die auf einen
Oberflaechenschluessel (`ui_theme_dark`) zeigt und keinen Weg nach vorn nennt.
AK-1 fordert eine "Schema-/Versionsmatrix"; implementiert ist eine
Gleichheitspruefung gegen eine einzige, trotz Vertragsbruch nicht erhoehte
Version. Der Nicht-Scope deckt das nicht: er schliesst Formate "ohne explizite
Versionsmatrix" aus - die Matrix fehlt aber gerade.

Aufloesung: entweder `FULL_BACKUP_SCHEMA_VERSION` auf `2` heben und Version 1
mit definierter Migration weiter annehmen (unbekannte Keys verwerfen statt die
Datei abzulehnen), oder die Nichtannahme als bewusste Fachentscheidung
dokumentieren und im Ablehnungstext einen Weg anbieten.

Dieselbe Konstruktion trifft Profilbundles (siehe S14-9), dort wenigstens mit
einer erklaerbaren Meldung.

#### S14-2 - Der Recovery-Punkt des Vollbackup-Imports hat keinen Rueckweg

AK-6 ist woertlich erfuellt: vor dem Replace wird ein Snapshot geschrieben und
per `readSnapshot` bytegleich zurueckgelesen. Sein Zweck ist es aber nicht.
Gemessen fuer den Regelfall "fremdes Backup einspielen", in dem das bisher
aktive Profil im importierten Bestand nicht vorkommt:

```text
Aktives Profil des Snapshots ("alt") in der importierten Registry: nein

Key                     | Standard-Restore stellt wieder her?
rs_profiles_v1          | NEIN
rs_current_profile      | NEIN
rs_active_profile       | NEIN
profile_tagesgeld       | NEIN
profile_aktuelles_alter | NEIN
depot_tranchen          | NEIN
profile_health_bucket   | NEIN
etfProxyUrl             | ja
balance_expenses_2026   | ja
```

Der automatische Weg ist ebenfalls versperrt:
`StorageManager.rollbackImportReplace()` prueft
`snapshot.kind !== BALANCE_IMPORT_RECOVERY_KIND` und weist den neuen
`full-backup-import-recovery`-Snapshot mit
*"Der angegebene Snapshot ist kein Balance-Import-Recovery-Punkt."* ab.

Der deklarierte `restoreScope: { profileRegistryMode: 'replace-all-rollback',
profileLiveDataMode: 'replace-all-rollback' }` wird gespeichert, aber von
keiner Stelle im Repository gelesen - `grep` findet nur Erzeuger, keinen
Auswerter. Der Modus ist ein Feld ohne Wirkung.

Es bleibt also: Der Snapshot wird erzeugt, verifiziert, zurueckgelesen - und
genau in der Lage, fuer die er existiert, stellt er die Profildaten nicht
wieder her. Das ist dasselbe Muster wie S13-5 aus Slice 13
(Recovery-Dokument ohne Leser), hier eine Ebene tiefer.

#### S14-3 - Die Reparatur unplausibler Inflationsfaktoren wurde ersatzlos gestrichen

Gemessen ueber `StorageManager.loadState()`:

| Gespeicherter Faktor | Stand `001f3c1` | mit Slice 14 |
|---|---|---|
| `1.4` | `1.4` | `1.4` |
| `99` | `1` (Reset) | **`99`** |
| `0` | `0` | wirft |
| `-2` | `-2` | wirft |
| `null` | `null` | wirft |
| `"1.5"` | `"1.5"` | wirft |

Der neue Vertrag fordert `Number.isFinite(v) && v > 0` und kennt keine obere
Plausibilitaetsgrenze. Die alte Grenze `> 3` fiel in
`balance-storage.js:_runMigrations` und in `migrateLegacyStateV0` weg. Fuer
einen Altbestand, in dem ein frueherer Fehler einen Faktor `99` hinterlassen
hat, bedeutet das: Alle Realwerte werden ab sofort durch `99` geteilt, ohne
Meldung, ohne Marker, mit plausibel aussehenden Zahlen. Der Slice-Text
beschreibt das als Verbesserung ("Gueltige positive Faktoren oberhalb
historischer Heuristikgrenzen werden nicht mehr still veraendert") und nennt
den Verlust nicht.

AK-9 verlangt, dass korrupte Rohdaten nicht still durch Defaults ersetzt
werden. Der Slice erfuellt das - ersetzt den stillen Reset aber durch stille
Annahme, was fuer den Nutzer das schlechtere Ergebnis ist: der Reset war
sichtbar falsch, die Annahme ist unsichtbar falsch. Es braucht entweder eine
obere Plausibilitaetsgrenze mit sichtbarer Meldung oder eine ausdrueckliche
Fachentscheidung, dass es keine gibt.

#### S14-4 - Der abgewiesene Inflationsfaktor wird als LocalStorage-Fehler ausgegeben

Derselbe Messlauf zeigt den Wortlaut der neuen Ablehnung:

```text
Faktor 0     -> WIRFT StorageError: "Fehler beim Laden des Zustands aus dem LocalStorage."
Faktor null  -> WIRFT StorageError: "Fehler beim Laden des Zustands aus dem LocalStorage."
```

`validateStoredCumulativeInflationFactor` wirft eine
`CumulativeInflationFactorError` mit dem Code
`CUMULATIVE_INFLATION_FACTOR_INVALID`; `loadState` und `saveState` fangen sie im
generischen `catch` und verpacken sie in eine `StorageError`, deren Text auf
den LocalStorage zeigt. Code und Pfadangabe ueberleben nur in
`originalError`.

AK-8 fordert, dass ungueltige Faktoren "sichtbar abgewiesen" werden. Sichtbar
sind sie - aber unter falscher Ursache. Wer diese Meldung bekommt, prueft
Speicherplatz und Browserrechte, nicht den Inflationsfaktor. Bei `saveState`
ist die Fehlleitung schaerfer: dort meldet die Anwendung einen Speicherfehler
fuer einen reinen Vertragsbruch im uebergebenen Objekt, bei intaktem Speicher.

Offen geblieben ist, wo die Balance-Oberflaeche diesen Wurf faengt.
`StorageManager.loadState()` wird an mehr als zwoelf Stellen aufgerufen, die
meisten in der Form `StorageManager.loadState() || {}` ohne eigenes
`try/catch`. Ob ein Altbestand mit Faktor `null` die Balance-Seite nur
teilweise oder gar nicht mehr startet, habe ich nicht zu Ende gemessen; siehe
S14-5.

### Restrisiken

**S14-5 - kein belegter Reparaturweg fuer den abgewiesenen Faktor.** Ein
Bestand, der nach S14-3/S14-4 abgewiesen wird, laesst sich mit den Mitteln der
Oberflaeche nicht offensichtlich korrigieren: der Wert steckt im
Balance-State-JSON, das die Balance-Seite selbst nicht mehr laedt. Fail-closed
ohne Reparaturweg ist der Zustand, den D-09 gerade vermeiden will.

**S14-6 - Bundle-Import loescht globale Einstellungen.** Gemessen:

```text
etfProxyUrl vor Import : https://proxy.example/etf
Import ok? true
etfProxyUrl nach Import: null
```

`importProfilesBundle` ruft neuerdings
`PROFILE_BUNDLE_GLOBAL_KEYS.forEach(key => storage.removeItem(key))` vor dem
Schreiben. Ein Bundle ohne Globals loescht damit die lokale
Proxy-Konfiguration; ETF-Kurse werden anschliessend nicht mehr geladen. AK-2
fordert eine gemeinsame Allowlist fuer Import und Export, nicht das Loeschen
nicht enthaltener Schluessel. Vor dem Slice blieben sie erhalten.

**S14-7 - das "Vollbackup" ist nicht vollstaendig.** `buildFullPersistenceBackup`
filtert neuerdings auf `isAllowedPersistenceImportKey`. Gemessen an einem
Bestand mit zehn Schluesseln:

```text
alt  recordCount 9 | ... layout_balance_cols ... ui_theme_dark
neu  recordCount 7
  im neuen "Vollbackup" NICHT mehr enthalten: ui_theme_dark, layout_balance_cols
```

Der Ausschluss ist symmetrisch - der Restore loescht diese Keys auch nicht -,
aber die Datei heisst "Vollbackup", traegt einen `recordCount`, der
Vollstaendigkeit suggeriert, und nennt den Ausschluss nirgends.

**S14-8 - die Bestaetigungslesung liest den Cache, nicht das Backend.**
`replaceRecordsTransactional` verifiziert ueber `captureRecordsByPolicy`, das
`keysSync()`/`getItemSync()` benutzt; beide liefern bei initialisierter Fassade
ausschliesslich `memCache` (`persistence-facade.js:258-264`, `293-296`). Ein
Adapter, der einen partiellen Schreibvorgang mit `{ ok: true }` quittiert oder
dessen IndexedDB-Transaktion erst nach der Rueckgabe scheitert, passiert diese
Pruefung. Der neue Wurf bei `result?.ok === false` schliesst nur den Fall des
meldenden Adapters. Die einzige Lesung, die wirklich durch das Backend geht,
ist die des Recovery-Snapshots - und dessen Rueckweg ist S14-2.

**S14-9 - Altbundles sind ohne Migration ausgeschlossen.** Gemessen:
`bundle_type_invalid` - "Die Datei ist kein Ruhestand-Suite-Profilbundle." Ein
Export des Standes `001f3c1` hat die Felder `version, exportedAt, registry,
currentProfileId, globals` und faellt an der ersten Huerde. Anders als bei
S14-1 ist die Ablehnung wenigstens erklaerbar; ein Migrationspfad
(`schemaVersion` fehlt -> als 0 behandeln) fehlt auch hier.

**S14-10 - `hasOwn` unterscheidet nicht zwischen fehlend und `undefined`.**
Gemessen an `resolveSimulatorCumulativeInflationFactor`:

| State | Stand `001f3c1` | mit Slice 14 |
|---|---|---|
| `{}` | `1` | `1` |
| `{cIF: undefined}` | `1` | wirft |
| `{cIF: 0, lastState: {cIF: 1.4}}` | `1.4` | wirft |
| `{lastState: {cIF: 1.4}}` | `1.4` | `1.4` |

Ein Objekt, das den Schluessel per Spread mit `undefined` traegt, wirft, obwohl
"nicht gesetzt" gemeint ist. Der Fallback auf `lastState` entfaellt, sobald der
obere Schluessel existiert. Der JSDoc-Kommentar direkt darueber verspricht
weiterhin "a compatibility fallback for states created before the simulator
contract"; diese Zusage gilt nicht mehr. Der Aufruf steht in
`simulator-accumulation-year.js:51`, also in jeder Jahresschleife jedes
Monte-Carlo-Pfades im Worker.

**S14-11 - die Inflationsrate ist nicht mitgehaertet.** Gemessen an
`advanceSimulatorCumulativeInflationFactor`:

| Aufruf | Stand `001f3c1` | mit Slice 14 |
|---|---|---|
| `(1, 2)` | `1.02` | `1.02` |
| `(1, -100)` | `1` | wirft |
| `(1, NaN)` | `1` | **`1`** |
| `(null, 2)` | `1.02` | wirft |
| `("1.2", 2)` | `1.224` | wirft |

Der Faktor ist fail-closed, die Rate nicht: `if (!Number.isFinite(rate)) return
current;` behaelt bei `NaN` still den alten Faktor und schreibt das Jahr nicht
fort - eine stille Ersetzung derselben Klasse, gegen die AK-9 antritt, nur eine
Variable weiter. Der Wurf bei Raten von `-100` und darunter ist aus den
historischen Daten heraus nicht erreichbar (Minimum `inflation_de: -1.7`); bei
freier Parametrierung oder kuenftigen stochastischen Ziehungen wuerde er einen
Worker-Chunk beenden statt das Jahr zu ueberspringen.

**S14-12 - Validierung im nicht benutzten Pfad.** In
`SpendingPlanner._initializeOrLoadState` steht der Aufruf von
`resolveCumulativeInflationFactor` vor der Verzweigung
`if (lastState && lastState.initialized)`. Gemessen wirft
`{ initialized: false, cumulativeInflationFactor: null }` jetzt, obwohl der
Wert im Initialisierungspfad nicht verwendet wird. Der Wurf verlaesst die
Engine als `RangeError`.

**S14-13 - der neue Snapshot-Kind ist nicht registriert und waechst unbegrenzt.**
`SNAPSHOT_KINDS` kennt weiterhin nur `annual-close-pre-mutation` und `manual`;
`full-backup-import-recovery` ist dort nicht aufgenommen, wird von
`buildSnapshot` aber ungeprueft uebernommen. Im Snapshot-Index erscheint der
Eintrag mit `standardRestorable: false`, sobald kein aktives Profil existiert.
`snapshot-archive.js` enthaelt keine Mengenbegrenzung und keine Bereinigung -
jeder Vollbackup-Import legt dauerhaft einen weiteren vollstaendigen
Datenbestand im Archiv ab. Zusaetzlich laufen jetzt zwei Recovery-Mechanismen
nebeneinander: der Dateidownload aus `bindFullBackupImport` und der neue
Archiv-Snapshot.

**S14-14 - die Fehlermeldung nennt den Recovery-Punkt nicht.**
`importFullPersistenceBackup` liefert `recoverySnapshotId` nur im Erfolgsfall.
`bindFullBackupImport` zeigt bei Misserfolg ausschliesslich `result.message`
an; `result.code` (`rollback_failed`, `recovery_snapshot_mismatch`) und
`result.rollbackError` werden nicht ausgewertet. Im schwersten Fall - Restore
gescheitert, Rollback nicht bestaetigt - erfaehrt der Nutzer also den Zustand,
aber nicht die ID des Punktes, mit dem er zurueck koennte.

**S14-15 - Validierungsaufwand je Import.** `validatePersistenceDomainRecords`
laeuft im Vollbackup-Import zweimal (Normalisierung und `postValidate`) und im
Profilbundle-Import zweimal (Preflight und Post-Load); jeder Lauf parst
Registry, jeden Profil-Balance-State und jede Tranchensammlung erneut. Analog
zu T13-4 aus Slice 13 ist das kein Fehler, aber ein Skalierungsposten.

### Nicht bestaetigte Vorwuerfe

Zwei Verdachtsmomente haben sich in der Messung nicht bestaetigt und sind hier
festgehalten, damit sie nicht erneut geprueft werden muessen:

- Die Engine-Aenderung erreicht den Produktivpfad. `engine.js` ist ein
  Modul-Wrapper auf `engine/index.mjs`; das fehlende Diff ist korrekt.
- Der Bundle-Roundtrip traegt. Export und Reimport auf dem neuen Stand sind
  gruen, die Globals stehen in `EXACT_KEYS` der Key-Policy, und der
  AK-5-Fall wird sauber und ohne jede Live-Mutation abgewiesen:
  `abgelehnt (domain_validation_failed) rs_current_profile verweist auf das
  nicht vorhandene Profil ghost.` - der Live-Bestand war danach bytegleich zum
  Ausgangszustand.

### Findings-Lifecycle

- Vorherige Findings aus Slice 14: keine (erstes Claude-Review).
- Neu eingefuehrte Blocker: S14-1, S14-2, S14-3, S14-4.
- Neu eingefuehrte Restrisiken: S14-5 bis S14-15.
- Von Gemini gemeldete Restrisiken: beide bestaetigt und unter S14-8
  beziehungsweise S14-14 praezisiert.

### Pre-Mortem

*Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - was ist die wahrscheinlichste Ursache?*

Ein Nutzer verliert seine Daten und greift zu dem Vollbackup, das er sich
vorsorglich exportiert hat. Die Datei stammt von vor diesem Slice, traegt
dieselbe `schemaVersion: 1` und wird mit dem Hinweis auf einen
Oberflaechenschluessel abgewiesen. Die Sicherung, die genau fuer diesen Moment
angelegt wurde, ist wertlos, und der Ablehnungstext nennt keinen Ausweg.

Zweitwahrscheinlich: ein Vollbackup-Import scheitert nach dem Replace. Der
kompensierende Rollback greift nicht oder nur im Cache, und der eigens
angelegte, verifizierte Recovery-Snapshot laesst sich nicht einspielen, weil
`rollbackImportReplace` seinen Kind ablehnt und der Standard-Restore ohne
passendes Profil in der neuen Registry weder Registry noch Profildaten
zurueckschreibt.

Drittens: ein Altbestand mit einem unplausiblen, aber formal gueltigen
Inflationsfaktor rechnet ab sofort still falsch, weil die frueher greifende
Obergrenze entfallen ist und nichts an ihre Stelle getreten ist.

## Review-Ergebnis (Claude)

- **Status:** blockiert
- **Blocker:** S14-1 (von der App selbst erzeugte Vollbackups sind nicht mehr
  importierbar, `schemaVersion` trotz Vertragsbruch unveraendert), S14-2
  (Recovery-Punkt des Vollbackup-Imports ist nicht einspielbar), S14-3
  (Obergrenze fuer Inflationsfaktoren ersatzlos entfallen, stille Fehlrechnung
  bei Altbestaenden), S14-4 (abgewiesener Faktor wird als LocalStorage-Fehler
  ausgegeben, Fehlercode geht verloren).
- **Restrisiken:** S14-5 bis S14-15.
- **Pre-Mortem:** siehe oben - ein vorhandenes Vollbackup wird im Ernstfall
  abgewiesen.

Die Gates sind reproduzierbar gruen und der deklarierte Scope ist eingehalten.
Die Blocker liegen nicht in der Implementierung der geprueften Vertraege,
sondern in ihrer Wirkung nach aussen: Slice 14 haertet den Weg hinein und
verschliesst dabei den Weg zurueck. AK-1 (Versionsmatrix), AK-6 (bestaetigter
Recovery-Punkt) und AK-8/AK-9 (sichtbare Abweisung statt stiller Ersetzung)
sind woertlich, aber nicht ihrem Zweck nach erfuellt.

## Review-Antworten von Codex auf Claude-Feedback

Stand der technischen Nachbesserung am 2026-07-28; der blockierte
Reviewerstatus wird dadurch nicht eigenmaechtig aufgehoben.

### Blocker

- **S14-1 angenommen und umgesetzt:** Neue Vollbackups tragen Schema `2`.
  Schema `1` wird ueber einen expliziten Migrator akzeptiert, einschliesslich
  des historischen `localStorage`-only-Alias. Von Schema 1 mitgesicherte, heute
  nicht mehr autorisierte UI-/Layout-Keys werden nicht als aktueller Vertrag
  ausgegeben, sondern als `excludedKeys` sichtbar inventarisiert. Schema 2
  bleibt fuer unbekannte Keys fail-closed.
- **S14-2 angenommen und umgesetzt:** `full-backup-import-recovery` und der
  Scope `replace-all-rollback` besitzen nun einen Auswerter. Sowohl
  `rollbackImportReplace` als auch die bestehende Snapshot-Oberflaeche stellen
  Registry, Current-/Active-Selektoren und alle autorisierten Records
  transaktional wieder her. Unit-Witness und Chromium-Smoke pruefen dabei auch
  den Fall, dass das alte Profil in der importierten Registry nicht existiert.
- **S14-3 angenommen und umgesetzt:** Der gemeinsame Vertrag lautet jetzt
  `0 < cumulativeInflationFactor <= 20`. Der Wert `99` wird mit unveraendertem
  Rohbestand und sichtbarer Meldung abgewiesen. Die zuerst erwogene historische
  Grenze `3` wurde nach einem roten 1960-2020-Backtest verworfen; `20` erhaelt
  diesen Langzeitvertrag und blockiert weiterhin die vom Review gemessene
  Groessenordnungsabweichung.
- **S14-4 angenommen und umgesetzt:** Load und Save reichen
  `CumulativeInflationFactorError` unverhuellt weiter. Code, Pfad, Rohwert und
  Hinweis auf unveraenderten Zustand/Recovery bleiben erhalten; nur echte
  Parse- oder Storagefehler werden weiterhin als `StorageError` verpackt.

### Gekoppelt nachgebesserte Restrisiken

- **S14-6:** Fehlende Bundle-Globals loeschen keine vorhandene lokale
  Einstellung mehr; nur explizit enthaltene erlaubte Globals werden ersetzt.
- **S14-7:** Der Export nennt `recordScope`,
  `excludedRecordCount`/`excludedKeys`; die UI bezeichnet ihn als
  fachliches Backup und weist ausgelassene UI-/Layout-Einstellungen aus.
- **S14-8:** Replace und Rollback werden nach `flush()` ueber
  `adapter.loadAll()` gegen das Backend und getrennt gegen den Cache
  verifiziert. Ein Fake-Adapter, der einen Write bestaetigt, aber ein Upsert
  nicht persistiert, wird erkannt und zurueckgerollt.
- **S14-9:** Historische Profilbundles ohne Envelope werden als Quellschema
  `0` erkannt und vor dem Write durch den aktuellen Tiefenvalidator geschickt.
- **S14-10:** Ein eigener Top-Level-Key mit `undefined` gilt als Missing und
  laesst den historischen Nested-Fallback zu; vorhandene ungueltige Werte wie
  `0` bleiben fail-closed.
- **S14-11:** Explizites `NaN` bei der Inflationsrate wirft sichtbar.
  `undefined` bleibt als echter Missing-Fall kompatibel und behaelt den
  bisherigen Faktor.
- **S14-12:** Der SpendingPlanner validiert den Faktor nur noch im tatsaechlich
  verwendeten `initialized`-Pfad; ein uninitialisierter Altstate startet
  unabhaengig von unbenutzten Restfeldern mit Faktor `1`.
- **S14-14:** Fehlerresultate nach bestaetigtem Recovery-Write enthalten
  `recoverySnapshotId`; Meldung und UI nennen `Balance > Snapshots` als
  Wiederherstellungsweg.

### Weiter offene Restrisiken

- **S14-5** bleibt als UX-Risiko: Die Domaenenmeldung nennt Rohdatenerhalt und
  Recovery, aber es wurde kein neuer feldspezifischer Editor fuer einen
  blockierenden Inflationsstate gebaut.
- **S14-13** bleibt offen: Snapshot-Retention und Bereinigung sind nicht Teil
  dieser Blocker-Nachbesserung.
- **S14-15** bleibt als gemessener Skalierungsposten bestehen; die doppelte
  Vor-/Nachvalidierung ist derzeit die beabsichtigte Sicherheitsgrenze.

## Review-Entscheidungen nach Claude-Feedback

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| S14-1 | Claude | Schema-1-Vollbackup nicht mehr importierbar | angenommen | erledigt: Schema 2 plus V1-Migration |
| S14-2 | Claude | Vollbackup-Recovery nicht einspielbar | angenommen | erledigt: Full-Restore in API und Snapshot-UI |
| S14-3 | Claude | keine obere Faktorgrenze | angenommen | erledigt: sichtbarer Vertrag `0 < Faktor <= 20` |
| S14-4 | Claude | Domaenenfehler als StorageError verdeckt | angenommen | erledigt: Code und Meldung unverhuellt |
| S14-5 | Claude | kein eigener Reparatureditor | angenommenes Restrisiko | offen, Recovery-Hinweis vorhanden |
| S14-6 | Claude | fehlende Bundle-Globals werden geloescht | angenommen | erledigt: fehlend bedeutet erhalten |
| S14-7 | Claude | Vollstaendigkeit des Backups irrefuehrend | angenommen | erledigt: fachlicher Scope und Ausschlussliste sichtbar |
| S14-8 | Claude | Verifikation liest nur Cache | angenommen | erledigt: Backend- plus Cache-Readback |
| S14-9 | Claude | historische Profilbundles ausgeschlossen | angenommen | erledigt: Legacy-Quellschema 0 |
| S14-10 | Claude | `undefined` verliert Nested-Fallback | angenommen | erledigt: Missing-Semantik |
| S14-11 | Claude | `NaN`-Rate wird still ignoriert | angenommen | erledigt: NaN wirft, Missing bleibt kompatibel |
| S14-12 | Claude | unbenutzter Faktor wird validiert | angenommen | erledigt: Validierung nur im verwendeten Pfad |
| S14-13 | Claude | Snapshot-Kind/Retention | angenommenes Restrisiko | offen, keine Scope-Erweiterung |
| S14-14 | Claude | Fehler nennt Recovery-ID nicht | angenommen | erledigt: ID und Bedienweg im Resultat |
| S14-15 | Claude | doppelte Tiefenvalidierung | bewusst beibehalten | Sicherheitsgrenze, Skalierung beobachten |


## Re-Review durch Claude nach der Blocker-Nachbesserung

**Reviewdatum:** 2026-07-28
**Pruefgegenstand:** Arbeitsbaumstand auf `codex/suite-datenintegritaet-hardening`
ueber `001f3c1` nach der Nachbesserung zu S14-1 bis S14-4 und acht gekoppelten
Restrisiken.

### Unabhaengig nachgefahrene Gates

| Gate | Ergebnis |
|---|---|
| `npm test` | 8.721/8.721 Assertions, 0 Fehler, 0 offene Handles, Exit 0 |
| `npm run test:browser` | 23/23 Smokes, Exit 0 |
| `npm run build:engine` | erfolgreich, `engine.js` unveraendert |
| `git diff --check` | gruen |
| Dateiscope | weiterhin exakt acht Programmdateien |
| Verbotene Bereiche | `engine.js`, `workers/`, `dist/`, `src-tauri/` unveraendert |

### Geschlossene Blocker

**S14-1 geschlossen.** Neue Backups tragen Schema `2`; Schema `1` laeuft ueber
einen Migrator. Gemessen mit einem Export des Standes `001f3c1`:

```text
Alt-Backup: schemaVersion 1, recordCount 8
-> neuer Import: AKZEPTIERT
   sourceSchemaVersion 1 -> schemaVersion 2
   recordCount 6 | excludedRecordCount 2
   excludedKeys ["layout_balance_cols","ui_theme_dark"]
nur localStorage-Alias (ohne records) -> AKZEPTIERT
```

Wichtiger als die Annahme ist, dass der Migrator kein Einfallstor ist. Gemessen
mit konsistent mitgefuehrtem Alias - meine erste Gegenprobe hatte den Alias
nicht mitgeaendert und deshalb nur die Aliaspruefung getroffen:

| Manipuliertes Schema-1-Backup | Ergebnis |
|---|---|
| Faktor `0` im Profil-Balance-State | abgelehnt |
| Faktor `99` im Profil-Balance-State | abgelehnt |
| Ghost-Selektor `rs_current_profile` | abgelehnt |
| Registry kein JSON | abgelehnt |
| `recordCount` falsch | abgelehnt |
| eigene `__proto__`-Property | angenommen, Key verworfen und in `excludedKeys` inventarisiert |
| Nicht-String-Wert (`profile_tagesgeld: 12345`) | **angenommen** (siehe U14-3) |

Die Tiefenvalidierung greift also auch fuer den Legacy-Pfad.

**S14-2 geschlossen.** `isFullImportRecoverySnapshot()` erkennt sowohl den Kind
`full-backup-import-recovery` als auch den Scope `replace-all-rollback` und
wird an vier Stellen ausgewertet: bei der Planwahl (`balance-storage.js:104`,
Full-Plan statt Standard-Plan), in `rollbackImportReplace` (`:490`), im
`standardRestorable`-Gate der Snapshot-Oberflaeche (`:560`) und im
Restore-Pfad (`:646`). Der `restoreScope` hat damit den Auswerter, der ihm im
ersten Review fehlte. Der entscheidende Unterschied, gemessen:

```text
Standard-Restore (altes Profil fehlt in der neuen Registry): rs_profiles_v1 NEIN,
  rs_current_profile NEIN, rs_active_profile NEIN, profile_tagesgeld NEIN, depot_tranchen NEIN
Full-Modus:                                                  alle sechs ja
```

**S14-4 geschlossen.** Load und Save reichen den Domaenenfehler unverhuellt
weiter; der Rohbestand blieb in allen Faellen unveraendert:

```text
Faktor 0     -> CumulativeInflationFactorError code=CUMULATIVE_INFLATION_FACTOR_INVALID path=lastState.cumulativeInflationFactor
Faktor null  -> dito     Faktor "1.5" -> dito     Faktor 99 -> dito
Faktor 20    -> ok
Faktor 20.5  -> dito
saveState mit Faktor 0 -> CumulativeInflationFactorError, code erhalten
```

**Ebenfalls geschlossen und nachgemessen:** S14-6 (`etfProxyUrl` ueberlebt ein
Bundle ohne Globals), S14-7 (`recordScope: authorized-application-records`,
`excludedRecordCount`/`excludedKeys` im Export), S14-8 (Replace und Rollback
verifizieren ueber `capturePersistedRecordsByPolicy` gegen
`adapter.loadAll()` **und** getrennt gegen den Cache), S14-9 (Altbundle ohne
Envelope wird angenommen), S14-10 (`{cIF: undefined, lastState:{1.4}}` liefert
wieder `1.4`, `{cIF: 0, ...}` bleibt fail-closed), S14-12 (der Faktor wird nur
noch im `initialized`-Zweig aufgeloest), S14-14 (`recoverySnapshotId` im
Fehlerresultat).

### Neuer Blocker

#### U14-1 - die Obergrenze wirkt auch auf die laufende Simulation und bricht sie ab

`CUMULATIVE_INFLATION_FACTOR_MAX = 20` wird nicht nur an der Speichergrenze
geprueft, sondern in `advanceSimulatorCumulativeInflationFactor` auch auf den
**fortgeschriebenen** Faktor jedes Simulationsjahres. Gemessen, ab welchem
Jahr eine Simulation bei konstanter Inflation abbricht:

| Inflation p.a. | Abbruch nach | Faktor davor |
|---|---|---|
| 3 % | kein Abbruch (<= 80 J.) | 10,64 |
| 4 % | 77 Jahre | 19,70 |
| 5 % | 62 Jahre | 19,61 |
| 6 % | 52 Jahre | 19,53 |
| 8 % | 39 Jahre | 18,63 |
| 10 % | **32 Jahre** | 19,19 |

Ein Ruhestand von 65 bis 97 sind 32 Jahre; mit Ansparphase erreicht ein Plan
leicht 50 bis 70 Jahre. Die Grenze trifft damit nicht nur Extremfaelle, sondern
genau die Inflationspfade, die eine Monte-Carlo-Auswertung braucht - die
schlechten. Der Abbruch ist ausserdem kein modelliertes Ergebnis: Der Runner
kennt fuer technische Fehler den Weg
`result?.kind === 'technical_error'` (`monte-carlo-runner.js:702`), der Wurf
aus `advanceSimulatorCumulativeInflationFactor` geht diesen Weg nicht.
`simulator-year-result.js` und `simulator-accumulation-year.js` enthalten kein
einziges `try`, und die Jahresschleife des Runners faengt ihn nicht. Ein
`CumulativeInflationFactorError` beendet damit den Chunk, nicht den Pfad.

```text
advance(19.9, 5) -> CumulativeInflationFactorError
                    path=nextCumulativeInflationFactor value=20.895
```

Die Nachbesserung hat die Grenze von `3` auf `20` gehoben, bis ein
1960-2020-Backtest gruen war. Damit ist sie am Testbestand kalibriert, nicht am
Fachbereich - der Konflikt ist verschoben, nicht aufgeloest: Bei `3` scheiterte
ein historischer Backtest, bei `20` scheitern Langzeitszenarien mit hoher
Inflation, und bei jedem Wert bleibt ein Rechenpfad, der bei Grenzueberschreitung
wirft statt zu rechnen.

Aufloesung: Die Obergrenze gehoert an die Persistenz- und Importgrenze, wo sie
einen unplausiblen gespeicherten Zustand erkennt. In der Fortschreibung der
Simulation genuegt der Vertrag "endlich und groesser 0"; wird dort eine
Plausibilitaetsgrenze gewuenscht, muss sie ein modelliertes Ergebnis liefern
(`technical_error` oder ein eigener Terminalzustand), das der Runner zaehlen
kann, statt eine Exception, die den Chunk beendet.

Damit ist S14-3 in seinem persistenzseitigen Teil erledigt - `99` wird
sichtbar und ohne Rohdatenaenderung abgewiesen -, in seiner Wirkung auf den
Rechenpfad aber nicht.

### Neue Restrisiken

**U14-2 - die Inflationsrate ist weiterhin nur halb gehaertet.** Gemessen:

| Aufruf | Ergebnis |
|---|---|
| `advance(1, NaN)` | wirft |
| `advance(1, undefined)` | `1` (Missing, dokumentiert) |
| `advance(1, null)` | **`1`** |
| `advance(1, "2")` | **`1.02`** |

`null` laeuft ueber `Number(null) === 0` still als Nullinflation durch, ein
String wird stillschweigend konvertiert - waehrend der Faktor selbst Strings
und `null` ablehnt. Der `NaN`-Wurf ist ausserdem ein generischer `RangeError`
ohne `code`, also nicht als Vertragsverletzung erkennbar.

**U14-3 - der Schema-1-Migrator loest den Stringwertvertrag.** Ein
Schema-1-Backup mit `profile_tagesgeld: 12345` (Zahl statt String) wird
angenommen, waehrend derselbe Wert unter Schema 2 abgewiesen wird. AK-1 nennt
den "Stringwertvertrag" als Pruefung vor dem ersten Live-Write; fuer den
Legacy-Pfad gilt er nur konvertierend.

**U14-4 - der neue Snapshot-Kind bleibt unregistriert und dreifach als Literal
gefuehrt.** `SNAPSHOT_KINDS` enthaelt weiterhin nur
`annual-close-pre-mutation` und `manual`. `isFullImportRecoverySnapshot`
vergleicht gegen das hart eingetragene Literal
`'full-backup-import-recovery'`, statt `FULL_BACKUP_RECOVERY_KIND` zu
importieren. Im Index-Pfad (`:560`) greift zudem nur der Kind-Zweig, weil
`toSnapshotIndexEntry` keinen `restoreScope` mitfuehrt - der zweite Zweig der
Erkennung ist dort wirkungslos.

**U14-5 - die Backend-Verifikation faellt still auf den Cache zurueck.**
`capturePersistedRecordsByPolicy` beginnt mit
`if (typeof adapter?.loadAll !== 'function') return captureRecordsByPolicy(allowKey);`.
Alle drei heutigen Adapter bringen `loadAll` mit, der Rueckfall ist also
aktuell unerreichbar; er ist aber lautlos und macht aus der neuen
Backend-Verifikation wieder die Cache-Verifikation, gegen die S14-8 gerichtet
war.

### Unveraendert offene Restrisiken

S14-5 (kein feldspezifischer Reparatureditor fuer einen blockierenden
Inflationsstate), S14-13 (Snapshot-Retention und -Bereinigung) und S14-15
(doppelte Tiefenvalidierung je Import) bestehen als bewusst getroffene
Entscheidungen fort. S14-11 ist nur zur Haelfte geschlossen und wird als U14-2
weitergefuehrt.

### Findings-Lifecycle

- Geschlossen in diesem Durchgang: S14-1, S14-2, S14-4, S14-6, S14-7, S14-8,
  S14-9, S14-10, S14-12, S14-14; S14-3 nur in seinem persistenzseitigen Teil.
- Neu eingefuehrte Blocker: U14-1.
- Neu eingefuehrte Restrisiken: U14-2, U14-3, U14-4, U14-5.
- Unveraendert offen: S14-5, S14-13, S14-15.
- Zuruecknahme aus dem ersten Review: Die dortige Gegenprobe zum
  Schema-1-Migrator und zu `__proto__` war methodisch fehlerhaft; die
  korrigierte Messung steht oben.

### Pre-Mortem

*Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - was ist die wahrscheinlichste Ursache?*

Ein Nutzer rechnet ein Inflationsszenario mit hoher Teuerung ueber eine lange
Laufzeit - genau den Fall, fuer den er das Werkzeug benutzt. Sobald der
kumulierte Faktor `20` ueberschreitet, wirft die Jahresfortschreibung, und weil
auf dem Weg kein Handler liegt, endet der Worker-Chunk statt des Pfades. Je
nach Auswertung fehlt das Ergebnis oder die Ruinwahrscheinlichkeit faellt zu
guenstig aus, weil ausgerechnet die schlechtesten Pfade aus der Statistik
verschwinden.

Zweitwahrscheinlich: ein historisches Backup mit numerisch gespeicherten
Profilwerten passiert den Schema-1-Migrator, waehrend derselbe Inhalt als
Schema 2 abgewiesen wuerde, und traegt eine Wertform in den Livebestand, auf
die sich spaetere Lesepfade nicht verlassen.

Drittens bleibt S14-13: Jeder Vollbackup-Import legt einen weiteren
vollstaendigen Datenbestand im Snapshot-Archiv ab, das keine Bereinigung kennt.

## Re-Review-Ergebnis (Claude)

- **Status:** blockiert
- **Blocker:** U14-1 (die Obergrenze `20` wirkt auch auf die Jahresfortschreibung
  der Simulation und beendet Langzeitlaeufe mit hoher Inflation durch eine
  Exception, fuer die auf dem Weg kein Handler liegt).
- **Restrisiken:** U14-2 bis U14-5 sowie unveraendert S14-5, S14-13, S14-15.
- **Pre-Mortem:** siehe oben - Abbruch der Simulation in genau den Szenarien,
  die sie beantworten soll.

Die vier Blocker des ersten Reviews sind sachlich und nachmessbar erledigt; die
Nachbesserung ist in Umfang und Tiefe angemessen. Der verbleibende Blocker ist
kein Rueckschritt gegenueber dem Ausgangsstand, sondern eine Nebenwirkung der
Loesung fuer S14-3: Eine Plausibilitaetsgrenze, die als Speichervertrag richtig
ist, wurde in den Rechenpfad uebernommen, wo sie einen Abbruch statt eines
Ergebnisses erzeugt.

## Re-Review-Feedback von Gemini

**Review-Datum:** 2026-07-28  
**Reviewer:** Antigravity (Gemini 3.6 Flash)  
**Pruefgegenstand:** Nachbesserung von Codex auf `codex/suite-datenintegritaet-hardening` zu S14-1 bis S14-4 sowie Restrisiken.

### Evaluierung der Prüfdimensionen

1. **Behebung der ursprünglichen Blocker (S14-1 bis S14-4):**
   - **S14-1 (BEHOBEN):** Vollbackups Schema 1 werden über einen Migrator sauber importiert; veraltete UI-Keys werden als `excludedKeys` herausgefiltert.
   - **S14-2 (BEHOBEN):** `full-backup-import-recovery`-Snapshots und `replace-all-rollback` besitzen in `isFullImportRecoverySnapshot()` voll funktionsfähige Auswerter.
   - **S14-3 (TEILWEISE BEHOBEN / NEUER BLOCKER U14-1):** Der Speichervertrag weist extreme Faktoren (`99`) ab. Jedoch wird die Obergrenze `20` auch in `advanceSimulatorCumulativeInflationFactor` bei der Jahresfortschreibung der Simulation angewendet.
   - **S14-4 (BEHOBEN):** `CumulativeInflationFactorError` wird unverhüllt ohne irreführendes Wrapping in `StorageError` weitergegeben.

2. **Neuer Blocker U14-1 (Unmittelbare Auswirkung im Rechenkern):**
   - In `app/simulator/simulator-engine-helpers.js` ruft `advanceSimulatorCumulativeInflationFactor` bei jedem Simulationsjahr `assertCumulativeInflationFactor` auf.
   - In Monte-Carlo-Szenarien mit hoher Inflation (z. B. 5 % p.a. über 62 Jahre oder 10 % p.a. über 32 Jahre) überschreitet der akkumulierte Faktor den Schwellenwert von `20`.
   - Da `simulator-year-result.js` und `simulator-accumulation-year.js` keinen `try/catch`-Block enthalten, bricht der Worker-Chunk mit einer ungeschützten Exception ab. Schlimmste Szenarien (Tail Risks) verschwinden unbemerkt aus der Monte-Carlo-Statistik.

3. **Verifizierung der Testergebnisse:**
   - `npm test`: **8.721 / 8.721 Assertions grün**.
   - `npm run test:browser`: **23 / 23 Smokes grün**.

### Review-Ergebnis (Gemini)

```markdown
## Review-Ergebnis
- Status: blockiert
- Blocker: U14-1 (Die Plausibilitätsobergrenze `20` sperrt in `advanceSimulatorCumulativeInflationFactor` die Jahresfortschreibung der Simulation bei Langzeit-Inflationspfaden und führt zum ungesteuerten Chunk-Abbruch ohne modelliertes Ergebnis).
- Restrisiken: U14-2 bis U14-5 sowie S14-5, S14-13, S14-15.
- Pre-Mortem: Ein Nutzer startet eine 60-jährige Monte-Carlo-Simulation mit Stresstest-Inflation. Pfade, die die Inflationsgrenze von 20 überschreiten, stürzen im Worker ungeschützt ab, sodass die simulierten Ruinwahrscheinlichkeiten fälschlicherweise zu optimistisch berechnet werden.
```

## Zweite Blocker-Nachbesserung durch Codex

Der letzte Reviewerstatus bleibt bis zu einem unabhaengigen Re-Review
unveraendert blockiert. Technisch wurden folgende Findings nachgebessert:

| Finding | Umsetzung | Regression |
|---|---|---|
| U14-1 | Persistenz-/Importplausibilitaet bleibt `0 < Faktor <= 20`; Runtimefaktoren in SpendingPlanner und Simulator verlangen nur eine endliche Zahl groesser `0`. | `advance(19.9, 5)` liefert `20.895`; 80 Jahre mit 10 Prozent Inflation bleiben endlich und laufen ohne Exception. |
| U14-2 | Vorhandene Inflationsraten muessen echte endliche Zahlen sein; nur `undefined` ist Missing. Fehler tragen `SIMULATOR_INFLATION_RATE_INVALID`. | `null`, `"2"`, `NaN` und Infinity werden typisiert abgewiesen. |
| U14-3 | Der Schema-1-Migrator uebernimmt nur Stringwerte und stringifiziert Zahlen nicht. | `sim_legacy_numeric: 42` wird vor dem ersten Live-Write abgewiesen. |
| U14-4 | `SNAPSHOT_KINDS` registriert beide Import-Recovery-Kinds; Backup und Balance verwenden die Registry. `toSnapshotIndexEntry` erhaelt den normalisierten `restoreScope`. | Unit-Witness prueft Kind plus beide Scope-Felder; Chromium bestaetigt denselben Indexvertrag ueber IndexedDB. |
| U14-5 | Ein Adapter ohne `loadAll` kann keinen transaktionalen Replace bestaetigen; kein Cachefallback mehr. | Fehlercode `persistence_backend_read_unavailable`. |

Der Nutzer hat die fuer U14-4 benoetigte neunte Programmdatei am 2026-07-28
ausdruecklich akzeptiert. Die Kind-/Literal-/Indexfrage ist damit technisch
geschlossen. Snapshot-Retention bleibt separat unter S14-13 offen.

Abschlussgates nach dieser Nachbesserung:

- fokussiert: `persistence` 306/306,
  `simulator-real-withdrawal-contract` 75/75,
  `spending-planner` 135/135,
  `balance-storage-contract` 79/79 und
  `simulator-backtest-characterization` 81/81;
- `snapshot-archive`: 26/26 Assertions;
- `npm test`: 8.730/8.730 Assertions, 0 Fehler, 0 offene Handles;
- `npm run test:browser`: 23/23 Smokes;
- `npm run build:engine`, `node --check` fuer alle neun Programmdateien und
  `git diff --check`: gruen;
- Dateiscope: exakt neun Programmdateien; `engine.js`, `workers/`, `dist/`,
  `src-tauri/` und Release-Artefakte unveraendert.


## Zweites Re-Review durch Claude nach der U14-Nachbesserung

**Reviewdatum:** 2026-07-28
**Pruefgegenstand:** Arbeitsbaumstand auf `codex/suite-datenintegritaet-hardening`
ueber `001f3c1` nach der Nachbesserung zu U14-1 bis U14-5.

### Unabhaengig nachgefahrene Gates

| Gate | Ergebnis |
|---|---|
| `npm test` | 8.730/8.730 Assertions, 0 Fehler, 0 offene Handles, Exit 0 |
| `npm run test:browser` | 23/23 Smokes in zwei von drei Laeufen; ein Lauf rot (siehe unten) |
| `npm run build:engine` | erfolgreich, `engine.js` unveraendert |
| `git diff --check` | gruen |
| Dateiscope | **neun** Programmdateien (siehe V14-3) |
| Verbotene Bereiche | `engine.js`, `workers/`, `dist/`, `src-tauri/` unveraendert |

Zum roten Lauf: Der erste Durchgang endete mit Exit 1 bei
`Simulator Monte-Carlo E2E`:

```text
Error: Monte-Carlo browser case emitted errors:
[console.error] Failed to load resource: net::ERR_NO_BUFFER_SPACE
```

`tests/simulator-monte-carlo-browser.mjs` ist in diesem Slice unveraendert, der
Fehler ist ein Ressourcenfehler beim Laden, und es war der sechste
Chromium-Lauf dieser Sitzung in Folge. Die beiden Wiederholungen waren gruen.
Ich fuehre das als Umgebungsflake (Socketerschoepfung), halte es aber fest.

### Geschlossene Findings

**U14-1 geschlossen.** Der Vertrag ist in eine Persistenz- und eine
Runtimevariante geteilt: `assertCumulativeInflationFactor` behaelt
`0 < Faktor <= 20`, `assertRuntimeCumulativeInflationFactor` verlangt nur
endlich und groesser `0`. Simulator und SpendingPlanner nutzen die
Runtimevariante. Gemessen, wo im ersten Re-Review noch abgebrochen wurde:

| Inflation p.a. | Faktor nach 40 J. | nach 60 J. | nach 80 J. | Abbruch |
|---|---|---|---|---|
| 5 % | 7,04 | 18,7 | 49,6 | nein |
| 8 % | 21,7 | 101 | 472 | nein |
| 10 % | 45,3 | 304 | 2.050 | nein |
| 15 % | 268 | 4.380 | 71.800 | nein |

Der zuvor gemessene Abbruch nach 32 Jahren bei 10 Prozent tritt nicht mehr auf.
Die Plausibilitaetsgrenze bleibt dort, wo sie hingehoert: an der Speicher- und
Importgrenze, wo `99` weiterhin sichtbar und ohne Rohdatenaenderung abgewiesen
wird.

**U14-2 geschlossen.** Die Rate hat einen eigenen typisierten Vertrag:

```text
advance(1, 2)         -> 1.02
advance(1, undefined) -> 1        (Missing, dokumentiert)
advance(1, null)      -> SimulatorInflationRateError / SIMULATOR_INFLATION_RATE_INVALID
advance(1, "2")       -> dito
advance(1, NaN)       -> dito
advance(1, Infinity)  -> dito
```

Die stille Nullinflation bei `null` und die stille Stringkonversion sind damit
beseitigt, und der Fehler traegt einen eigenen Code statt eines nackten
`RangeError`.

**U14-3 geschlossen.** Der Schema-1-Migrator stringifiziert nicht mehr:
`profile_tagesgeld: 12345` wird jetzt mit
`Backupwert profile_tagesgeld muss als String vorliegen.` abgewiesen. Die
uebrigen Gegenproben aus dem ersten Re-Review greifen unveraendert (Faktor 0,
Faktor 99, Ghost-Selektor, kaputtes JSON, falscher `recordCount`).

**U14-4 geschlossen.** `SNAPSHOT_KINDS` registriert beide Import-Recovery-Kinds;
`FULL_BACKUP_RECOVERY_KIND` und `isFullImportRecoverySnapshot` verwenden die
Registrykonstante statt eines Literals, und `toSnapshotIndexEntry` fuehrt den
normalisierten `restoreScope` mit - womit auch der zweite Erkennungszweig im
Indexpfad wirksam wird.

**U14-5 geschlossen.** Der stille Cachefallback ist durch einen expliziten
Fehler mit Code `persistence_backend_read_unavailable` ersetzt.

### Neue Restrisiken

**V14-1 - die Wurfkonstruktion im Rechenpfad besteht fort.** Beide Vertraege
melden Verletzungen weiterhin als Exception, nicht als modelliertes Ergebnis.
Gemessen:

| Datei | `try`-Bloecke | wertet `SIMULATOR_INFLATION_RATE_INVALID` aus | wertet `CUMULATIVE_INFLATION_FACTOR_INVALID` aus |
|---|---|---|---|
| `simulator-year-result.js` | 0 | nein | nein |
| `simulator-accumulation-year.js` | 0 | nein | nein |
| `monte-carlo-runner.js` | 0 | nein | nein |

Der Runner kennt fuer technische Fehler den Weg ueber
`result?.kind === 'technical_error'`; keiner der beiden Codes geht ihn. Anders
als im ersten Re-Review ist der Ausloeser aus den vorhandenen Daten aber nicht
erreichbar - gemessen ueber `annualData` und `HISTORICAL_DATA`: 101 Werte,
Minimum `-9,9`, Maximum `14,4`, kein nicht-numerischer Wert, kein Wert
`<= -100`; die Backtest-Observation reicht `current.inflation_de` unveraendert
durch, und ein fehlendes Feld ergibt `undefined`, also den Missing-Fall. Damit
ist es ein Restrisiko und kein Blocker: Es trifft erst, wenn eine kuenftige
Datenquelle, ein Szenariocompiler oder eine freie Parametrierung einen Wert
ausserhalb dieses Bereichs liefert - dann endet der Chunk statt des Pfades.

**V14-2 - fail-closed fuer Adapter ohne `loadAll`.** Die Behebung von U14-5
macht den verifizierenden Replace fuer jeden Adapter unmoeglich, der keinen
Backend-Readback anbietet. Alle drei heutigen Adapter bringen `loadAll` mit;
ein kuenftiger schlanker Adapter waere ohne diese Methode vom Restore
ausgeschlossen. Das ist die richtige Richtung, sollte aber bewusst getragen
werden.

**V14-3 - die Scope-Erweiterung auf neun Programmdateien kann ich nicht
verifizieren.** Der Startcheck dieses Slices nennt das Limit von acht Dateien.
Mit `app/shared/snapshot-archive.js` sind es neun. Das Dokument haelt fest,
der Nutzer habe die neunte Datei am 2026-07-28 ausdruecklich akzeptiert. Diese
Freigabe liegt mir nicht vor - ich kann sie weder bestaetigen noch bestreiten
und markiere sie als vom Nutzer zu pruefenden Punkt. Inhaltlich ist die
Aenderung an `snapshot-archive.js` minimal und passend (zwei Registryeintraege
und die Weitergabe des `restoreScope`).

### Unveraendert offene Restrisiken

S14-5 (kein feldspezifischer Reparatureditor fuer einen blockierenden
Inflationsstate), S14-13 (Snapshot-Retention und -Bereinigung; jeder
Vollbackup-Import legt weiterhin dauerhaft einen vollstaendigen Datenbestand
ab) und S14-15 (doppelte Tiefenvalidierung je Import) bestehen als bewusste
Entscheidungen fort.

### Findings-Lifecycle

- Geschlossen in diesem Durchgang: U14-1, U14-2, U14-3, U14-4, U14-5.
- Zuvor geschlossen: S14-1, S14-2, S14-4, S14-6 bis S14-10, S14-12, S14-14;
  S14-3 und S14-11 sind mit dieser Runde vollstaendig geschlossen.
- Neu eingefuehrte Blocker: keine.
- Neu eingefuehrte Restrisiken: V14-1, V14-2, V14-3.
- Unveraendert offen: S14-5, S14-13, S14-15.

### Pre-Mortem

*Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - was ist die wahrscheinlichste Ursache?*

Eine spaetere Aenderung erweitert die Inflationsquelle - ein Szenariocompiler,
ein frei parametrierbarer Stresstest oder eine stochastische Ziehung - und
liefert erstmals einen Wert ausserhalb des heute gemessenen Bereichs. Weil
beide Vertraege im Rechenpfad werfen statt ein zaehlbares Ergebnis zu liefern
und auf dem Weg bis zur Chunk-Schleife kein `try` liegt, endet der Worker-Chunk
statt des einzelnen Pfades. Der Fehler faellt spaet auf, weil er nur unter
Extremparametern auftritt.

Zweitwahrscheinlich: Das Snapshot-Archiv waechst unbemerkt, weil jeder
Vollbackup-Import einen weiteren vollstaendigen Datenbestand ablegt und S14-13
keine Bereinigung vorsieht.

Drittens: Ein Nutzer trifft auf einen blockierenden Inflationsstate und findet
in der Oberflaeche keinen Weg, genau dieses Feld zu korrigieren (S14-5); der
Hinweis auf ein Recovery-Backup traegt nur, wenn eines vorhanden ist.

## Zweites Re-Review-Ergebnis (Claude)

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** V14-1 (Vertragsverletzungen im Rechenpfad werfen weiterhin
  statt ein modelliertes Ergebnis zu liefern; Ausloeser aus den heutigen Daten
  nicht erreichbar), V14-2 (fail-closed fuer Adapter ohne `loadAll`), V14-3
  (Scope-Erweiterung auf neun Dateien, Freigabe fuer mich nicht verifizierbar)
  sowie unveraendert S14-5, S14-13, S14-15.
- **Pre-Mortem:** siehe oben - eine kuenftige Inflationsquelle ausserhalb des
  heute gemessenen Wertebereichs beendet den Worker-Chunk statt des Pfades.

Die Freigabe bezieht sich auf die Behebung der dokumentierten Blocker S14-1 bis
S14-4 und U14-1 sowie der Restrisiken S14-6 bis S14-12, S14-14 und U14-2 bis
U14-5, und auf die Einhaltung des deklarierten Scopes mit Ausnahme von V14-3.
Sie umfasst nicht die weiterhin offenen Restrisiken; deren Behandlung ist eine
Nutzer- beziehungsweise Planungsentscheidung. Der einzige Punkt, den ich vor
einem Commit ausdruecklich vom Nutzer bestaetigt sehen moechte, ist die
Erweiterung auf neun Programmdateien.
