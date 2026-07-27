# Slice 01 - Balance Preview-/Commit-Trennung

**Stand:** 2026-07-26
**Status:** nachgebessert - Claude-Re-Review gegen aktuellen Arbeitsbaum ausstehend
**Feature-Branch:** `codex/suite-datenintegritaet-hardening`
**Reviewer:** Antigravity (Gemini) / Claude (Opus 5)
**GitHub-Status:** Branch nur lokal; Push nach Nutzerfreigabe
**Uebergeordneter Plan:** [SUITE_DATENINTEGRITAET_HARDENING_PLAN.md](./SUITE_DATENINTEGRITAET_HARDENING_PLAN.md)

## Ziel und Findings

**Finding:** BAL-01  
**Prioritaet:** P0

Berechnung, Eingabepersistenz und fachliche Jahresfortschreibung werden explizit getrennt. Initialrender, Eingabeaenderungen, Profilwechsel und Import-Dry-runs duerfen keinen Guardrail-, Flex-, VPW-, Steuer- oder Verlustvortragszustand fortschreiben. Nur der bestehende periodengebundene Jahresabschluss darf einen fachlichen Candidate-State genau einmal committen.

## Akzeptanzkriterien

- Initialrender, fuenf identische Eingaben und Profilwechsel veraendern keinen fachlichen State.
- Verlustvortrag 20.000 EUR bleibt nach beliebig vielen Vorschauen 20.000 EUR.
- Ein Flex-Budget von 3 Jahren bleibt nach Vorschauen 3 und wird erst beim Commit fortgeschrieben.
- VPW-Streak, Flex-Glaettung und letzte Entnahme bleiben bis zum Commit unveraendert.
- Nutzereingaben bleiben reload-fest speicherbar, ohne Candidate-State mitzuschreiben.
- Import-Dry-runs sind vollstaendig mutationsfrei.
- Der Commit ist an die bestehende Perioden-ID und den bestaetigten Jahresprozess gebunden.
- Derselbe Periodencommit kann keinen zweiten fachlichen State-Uebergang erzeugen.
- Single- und Multi-Profil verwenden denselben expliziten Lifecycle-Vertrag.
- Veraltete Candidates werden nicht wiederverwendet; ein Commit basiert auf aktuellen Input-/Basis-State-Fingerprints.

## Scope

### Programmdateien

- `app/balance/balance-main.js`
- `app/balance/balance-update-pipeline.js`
- `app/balance/balance-main-profilverbund.js`
- `app/balance/balance-binder.js`
- `app/balance/balance-annual-inflation.js`
- `app/balance/balance-binder-imports.js`
- `app/profile/profile-storage.js`

### Tests und Dokumentation

- `tests/balance-preview-commit-contract.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/balance-annual-inflation.test.mjs`
- `tests/balance-smoke.test.mjs`
- `tests/browser-smoke.test.mjs`
- `tests/profile-storage.test.mjs`
- vorhandene fokussierte Balance-Vertragstests
- `docs/internal/SLICE_SUITE_DATA_01_BALANCE_PREVIEW_COMMIT.md`
- `docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`

## Nicht-Scope

- keine Aenderung der Flex-, VPW-, Guardrail- oder Steuerformeln;
- keine 3-Bucket-Korrektur;
- keine Aenderung der Engine oder der oeffentlichen `EngineAPI`;
- keine Migration historischer States ausser additiven Lifecycle-Metadaten;
- keine Aenderung des bestehenden Snapshot-/Recovery-Vertrags;
- keine generierten Artefakte (`engine.js`, `dist/`, `RuheStandSuite.exe`).

## Branch- und Statuscheck vor Coding

Ausgefuehrt am 2026-07-23.

### `git branch --show-current`

```text
codex/suite-datenintegritaet-hardening
```

### `git status --short`

```text
```

Der Worktree war vor Anlage dieser Slice-MD sauber.

## Branch- und Statuscheck vor Re-Review-Nachbesserung

Ausgefuehrt am 2026-07-26.

### `git branch --show-current`

```text
codex/suite-datenintegritaet-hardening
```

### `git status --short`

```text
 M .claude/settings.local.json
 M app/simulator/mc-year-sampling.js
 M app/simulator/monte-carlo-parameters.js
 M app/simulator/sweep-runner.js
 M docs/internal/SLICE_SUITE_DATA_01_BALANCE_PREVIEW_COMMIT.md
 M docs/internal/SLICE_SUITE_DATA_07_SWEEP_REQUEST_SAMPLING.md
 M docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md
 M tests/mc-worker-contract.test.mjs
 M tests/monte-carlo-parameters.test.mjs
 M tests/monte-carlo-sampling-contract.test.mjs
 M tests/simulator-sweep.test.mjs
```

Die vorhandenen Simulator-, Slice-07- und lokalen Claude-Einstellungen gehoeren
nicht zu dieser Nachbesserung und werden nicht veraendert. Der Re-Review erweitert
den produktiven Slice-01-Scope von fuenf auf sieben Programmdateien; die
Stop-Grenze von mehr als zehn Programmdateien wird nicht erreicht.

### Status vor zweiter Claude-Nachbesserung

Claude hat am 2026-07-26 den neuen Blocker N01-1 sowie N01-2 bis N01-6
dokumentiert. Branch und vorhandene Fremdaenderungen sind gegenueber dem oben
dokumentierten Re-Review-Check unveraendert. Die zweite Nachbesserung bleibt in
den bereits deklarierten sieben Programmdateien; zusaetzlich werden nur
Slice-01-Tests und betroffene Referenzdokumentation angepasst.

## Diff-Risiko

```text
Geplante Dateien:
- app/balance/balance-main.js
- app/balance/balance-update-pipeline.js
- app/balance/balance-main-profilverbund.js
- app/balance/balance-binder.js
- app/balance/balance-binder-snapshots.js
- app/balance/balance-annual-inflation.js
- app/balance/balance-binder-imports.js
- tests/balance-preview-commit-contract.test.mjs
- tests/balance-ui-orchestration.test.mjs
- tests/balance-annual-inflation.test.mjs
- tests/balance-smoke.test.mjs
- tests/browser-smoke.test.mjs
- docs/internal/SLICE_SUITE_DATA_01_BALANCE_PREVIEW_COMMIT.md
- docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md

Voraussichtliche Aenderungstiefe:
- riskant

Gefaehrdete bestehende Tests:
- tests/balance-ui-orchestration.test.mjs
- tests/balance-annual-workflow-contract.test.mjs
- tests/balance-annual-period.test.mjs
- tests/balance-storage-contract.test.mjs
- Balance-Browser-Jahresabschluss

Nicht anfassen:
- engine/
- engine.js
- 3-Bucket- und Steuerformeln
- Snapshot-/Recovery-Vertrag
- dist/
- RuheStandSuite.exe

Rollback-Strategie:
- git checkout -- app/balance/balance-main.js app/balance/balance-update-pipeline.js app/balance/balance-main-profilverbund.js app/balance/balance-binder.js app/balance/balance-binder-snapshots.js docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md
- Neue Slice- und Testdatei nur nach ausdruecklicher Freigabe loeschen.
```

## Baseline- und Delta-Ledger

### Vorher-Vertrag

- `update()` persistiert standardmaessig `modelResult.newState`.
- Initialrender und debounced Eingaben koennen dadurch fachlichen State fortschreiben.
- Multi-Profil-Vorschauen koennen profilbezogene `taxState`- und Haushalts-Guardrail-States ersetzen.
- Der Jahresprozess ruft dieselbe untypisierte Persistenzfunktion sowohl vor als auch nach dem Snapshot auf.

### Erwartetes Delta

- Anzahl fachlicher State-Uebergaenge bei Preview/Eingabepersistenz: von mindestens 1 auf 0.
- Anzahl fachlicher State-Uebergaenge bei erstmaligem gueltigem Periodencommit: exakt 1.
- Anzahl fachlicher State-Uebergaenge bei Wiederholung derselben Perioden-ID: 0.
- Engine-Ergebnis, angezeigte Action und fachliche Formeln bleiben unveraendert; nur der Persistenzzeitpunkt aendert sich.
- Snapshot-, Steuer-, Backtest- und FlowDelta-Ergebnisse duerfen in diesem Slice nicht unerwartet abweichen.

### Kontrollfaelle

- Single-Profil mit Verlustvortrag und Guardrail-State.
- Multi-Profil mit getrennten Verlustvortraegen und Haushalts-State.
- Input-only-Persistenz mit unveraendertem `lastState`.
- Import-Dry-run ohne Schreibzugriff.
- Jahrescommit mit gueltiger Pending-Periode und Snapshot.
- Wiederholter Commit derselben Periode.

## Geplante Umsetzung

1. Expliziten Modusvertrag `preview`, `persist_inputs` und `commit_period` einfuehren.
2. Preview immer schreibfrei halten.
3. Eingaben getrennt speichern und `lastState` beziehungsweise Profil-/Haushalts-State erhalten.
4. Commit nur aus dem vorhandenen Jahresprozess mit Perioden-ID ausfuehren.
5. Candidate unmittelbar aus aktuellem Basis-State berechnen und Input-/State-Fingerprints dokumentieren.
6. Periodencommit additiv im persistierten Lifecycle markieren und Wiederholungen blockieren.
7. Single- und Multi-Profil-Persistenz ueber denselben Modusvertrag fuehren.

## Geplante Tests und fachliche Orakel

- Neuer Contract-Test mit handgebauten States fuer:
  - Preview schreibt nichts;
  - Input-Persistenz erhaelt `lastState`;
  - Commit schreibt Candidate genau einmal;
  - Verlustvortrag, Flex-Budget und VPW-Felder bleiben vor Commit stabil;
  - Multi-Profil-Inputs erhalten alle fachlichen States;
  - falsche, fehlende oder bereits committe Perioden-ID blockiert.
- Fokussierte Tests:
  - `node tests/run-single.mjs tests/balance-preview-commit-contract.test.mjs`
  - `node tests/run-single.mjs tests/balance-ui-orchestration.test.mjs`
  - `node tests/run-single.mjs tests/balance-annual-workflow-contract.test.mjs`
  - `node tests/run-single.mjs tests/balance-annual-period.test.mjs`
  - `node tests/run-single.mjs tests/balance-storage-contract.test.mjs`
  - `node tests/run-single.mjs tests/core-tax-settlement.test.mjs`
- Pflichtgates:
  - `npm test`
  - `npm run test:browser`
  - `git diff --check`

## Durchgefuehrte Aenderungen

- Expliziter Update-Modusvertrag eingefuehrt:
  - `preview` berechnet und rendert ohne Persistenz;
  - `persist_inputs` speichert ausschliesslich Eingaben;
  - `commit_period` schreibt fachlichen State nur fuer eine vorbereitete Jahresperiode.
- Der Legacy-Parameter `persist` wird fuer jeden Wert fail-closed mit
  `legacy_persist_unsupported` abgewiesen. Der argumentlose Default ist
  schreibfreies `preview`; jeder produktive Schreibaufruf nennt seinen Modus.
- `prepareEngineLastState()` liefert der Engine eine tiefe Kopie. Eine Preview kann den persistierten Verlustvortrag, Flex-, VPW- oder Entnahme-State daher auch bei einer mutierenden Engineimplementierung nicht veraendern.
- Single-Profil-Persistenz wurde in Input-only und Periodencommit getrennt.
- Multi-Profil-Persistenz wurde in getrennte Writer fuer Profileingaben und fachliche Profil-/Haushalts-States aufgeteilt. Input-only erhaelt insbesondere alle Profil-`lastState`-, `taxState`- und `profilverbundHouseholdLastState`-Werte.
- Profilregistry und Haupt-`LS_KEY` besitzen einen asymmetrischen Vertrag.
  Profildaten enthalten ausschliesslich profilbezogene Inputs und States;
  `annualPeriodMetadata`, `balanceStateLifecycle`, `ageAdjustedForInflation`,
  `annualMarketDataMeta` und `capeMeta` bleiben ausschliesslich im Haupt-State.
- Der aktive Haupt-State wird ueber `StorageManager.loadState()` inklusive
  Migration geladen und nur mit einem expliziten Patch fortgeschrieben:
  `persist_inputs` aktualisiert Inputs und Haushaltsinputs, `commit_period`
  zusaetzlich fachliche Profil-/Haushalts-States und Lifecycle-Metadaten. Ein
  spaeterer Input-Write kann deshalb keinen abgeschlossenen Periodenstatus aus
  veralteten Profildaten zurueckspielen.
- Derselbe Ownership-Vertrag gilt am Profilwechsel-Rand: Profilsnapshots
  entfernen die haushaltsweiten Schluessel, beim Laden gewinnt der aktuelle
  Haupt-State fuer diese Schluessel gegen jeden Profilwert. Bereits durch den
  ersten fehlerhaften Fix verunreinigte Profildaten werden beim Laden
  kanonisch bereinigt und in der Registry ersetzt.
- Der bestehende Jahresabschluss ruft nach Snapshot, Jahreswrites und Post-Write-Validierung einen eigenen `commitLiveState({ periodId })`-Callback auf.
- Periodencommits verlangen:
  - passende `annualPeriodMetadata.pendingCommit.periodId`;
  - bestaetigte Snapshot-ID;
  - commitfaehige Phase `writes_started` oder `validating`;
  - noch nicht committe Perioden-ID.
- Additive `balanceStateLifecycle`-Metadaten speichern Perioden-ID sowie Input-, Basis-State- und Candidate-Fingerprint.
- Ein Candidate wird unmittelbar aus dem aktuellen State berechnet. Direkt vor
  dem Schreiben wird innerhalb desselben synchronen `update()`-Laufs ein
  zweites Mal fingerprinted. Geaenderte fachliche Inputs, Profil-, Haushalts-
  oder `lastState`-Daten blockieren als `stale_candidate`; Workflow-/UI-Metadaten
  und `depotLastUpdate` sind bewusst nicht Bestandteil dieses Finanzfingerprints.
  Unmittelbar vor dem Persistieren werden Haupt-State und Profilregistry erneut
  geladen; `assertBalanceCommitStillCurrent()` revalidiert neben dem
  Finanzfingerprint auch den aktuellen Periodenstatus. Der Guard ist weiterhin
  keine atomare Transaktionssperre gegen einen Parallelwrite im verbleibenden
  synchronen Schreibfenster.
- `depotLastUpdate` wird bei Depot-/Goldupdates nur im App-State vorgemerkt,
  durch `persist_inputs` geschrieben und bei anderen Input-Persistenzen
  erhalten. Es existiert kein direkter Storage-Write mehr im Form-Handler.
- Initialrender verwendet explizit `preview`; debounced Formupdates,
  Inflationsfortschreibung und Importabschluss verwenden explizit
  `persist_inputs`. Import-Dry-runs verwenden explizit `preview`.
- Datei-`change`-Events werden nicht durch den allgemeinen Form-Handler
  persistiert; damit kann ein abgelehnter Import keinen parallelen Debounce-Write
  ausloesen.
- Leere beziehungsweise ungueltige `profilverbundRuns` blockieren vor einem
  Writer-Aufruf mit `profile_runs_required`. Die toten Writer-Argumente
  `inputData` und `periodId` wurden entfernt.
- Persistierte Balance-States sind vertraglich JSON-Daten. Clone- und
  Fingerprint-Pfad validieren denselben Vertrag fail-closed; `Date`, `Map`,
  `Set`, Funktionen, zyklische oder sparse Strukturen sowie nicht endliche
  Zahlen werden vor Candidate-Bildung beziehungsweise Persistenz abgewiesen.
- Im Profilverbund sind die Verlustvortraege der einzelnen Profile autoritativ.
  Der gemeinsame Haushalts-State ist nur Guardrail-/Haushaltskontext; sein
  nicht autoritativer `taxState.lossCarry` wird deshalb beim Commit bewusst auf
  nullwertige Semantik (`0`) gesetzt.
- Browserregression ergaenzt:
  - Initialrender schreibt keinen fachlichen State;
  - fuenf identische Inputevents schreiben nur Eingaben;
  - Jahrescommit schreibt genau eine gemeinsame Lifecycle-Perioden-ID.

## Ausgefuehrte Tests

### Red-State vor Implementierung

- `node tests/run-single.mjs tests/balance-preview-commit-contract.test.mjs`
  - erwartungsgemaess rot;
  - Ursache: der neue Export `BALANCE_STATE_LIFECYCLE_KEY` und der Lifecycle-Vertrag existierten noch nicht.

### Fokussierte Tests nach Implementierung

- `node tests/run-single.mjs tests/balance-preview-commit-contract.test.mjs`
  - 40 Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/balance-ui-orchestration.test.mjs`
  - 129 Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/balance-annual-workflow-contract.test.mjs`
  - 33 Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/balance-annual-period.test.mjs`
  - 52 Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/balance-storage-contract.test.mjs`
  - 41 Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/core-tax-settlement.test.mjs`
  - 73 Assertions, 0 Fehler.

### Pflichtgates

- `npm test`
  - 130 Testdateien;
  - 7.353 Assertions;
  - 0 fehlgeschlagene Assertions;
  - 0 fehlgeschlagene Dateien;
  - 0 offene Handles.
- `npm run test:browser`
  - 16 Browser-Smokes gruen;
  - enthalten sind der neue Balance-Preview-Lifecycle und der echte Jahrescommit.
- `git diff --check`
  - gruen.

`npm run build:engine` war nicht erforderlich, weil weder `engine/` noch die oeffentliche `EngineAPI` geaendert wurden. Es wurden keine Golden-Fixtures, Snapshots, Backtest-Baselines oder generierten Artefakte aktualisiert.

### Re-Review-Nachbesserung

#### Red-State

- `node tests/run-single.mjs tests/balance-preview-commit-contract.test.mjs`
  - erwartungsgemaess rot;
  - Ursache: `createBalanceCommitBaseFingerprint` fehlte.
- `npm run test:browser`
  - nach der ersten Nachbesserung rot im Smoke `Balance import reject`;
  - Ursache: das bubbled Datei-`change`-Event plante parallel zum abgelehnten
    Import einen `persist_inputs`-Lauf.

#### Fokussierte Gates

- `tests/balance-preview-commit-contract.test.mjs`: 54/54.
- `tests/balance-ui-orchestration.test.mjs`: 142/142.
- `tests/balance-annual-inflation.test.mjs`: 36/36.
- `tests/balance-smoke.test.mjs`: 36/36.
- `tests/balance-annual-workflow-contract.test.mjs`: 33/33.
- `tests/balance-annual-period.test.mjs`: 52/52.
- `tests/balance-storage-contract.test.mjs`: 41/41.
- `tests/core-tax-settlement.test.mjs`: 73/73.

#### Abschlussgates

- `npm test`
  - 132 Testdateien;
  - 7.637 Assertions;
  - 0 Fehler;
  - 0 offene Handles.
- `npm run test:browser`
  - 16/16 Browser-Smokes gruen;
  - einschliesslich mutationsfreiem Import-Reject, Preview-Lifecycle und
    echtem Jahrescommit.
- `git diff --check`
  - gruen.

### Zweite Claude-Re-Review-Nachbesserung

#### Red-State

- `node tests/run-single.mjs tests/balance-ui-orchestration.test.mjs`
  - erwartungsgemaess rot;
  - Ursache: der erste Fix spiegelte haushaltsweite Perioden-Metadaten in die
    Profilregistry. Ein zweiter realer `persist_inputs`-Write konnte den
    inzwischen abgeschlossenen Haupt-State aus dem veralteten Profil
    zuruecksetzen (N01-1).
- `node tests/run-single.mjs tests/balance-preview-commit-contract.test.mjs`
  - erwartungsgemaess rot;
  - Ursache: der finale Periodenstatus-Guard
    `assertBalanceCommitStillCurrent()` fehlte (N01-5).

#### Fokussierte Gates

- `tests/balance-preview-commit-contract.test.mjs`: 68/68.
- `tests/balance-ui-orchestration.test.mjs`: 151/151.
- `tests/balance-annual-inflation.test.mjs`: 36/36.
- `tests/balance-smoke.test.mjs`: 36/36.
- `tests/balance-annual-workflow-contract.test.mjs`: 33/33.
- `tests/balance-annual-period.test.mjs`: 52/52.
- `tests/balance-storage-contract.test.mjs`: 41/41.
- `tests/core-tax-settlement.test.mjs`: 73/73.
- `tests/profilverbund-balance.test.mjs`: 118/118.

Der reale Profilverbund-Test verwendet die produktiven
`StorageManager.loadState()`-/`saveState()`-Pfade, prueft die Migration eines
Altwerts, den `depotLastUpdate`-Transport sowie die Write-Sequenz
`persist_inputs -> commit_period -> Periodenabschluss -> persist_inputs`.

#### Abschlussgates

- `npm test`
  - 132 Testdateien;
  - 7.660 Assertions;
  - 0 Fehler;
  - 0 offene Handles.
- `npm run test:browser`
  - 16/16 Browser-Smokes gruen;
  - einschliesslich mutationsfreiem Import-Reject, Preview-Lifecycle und
    echtem Jahrescommit.
- `git diff --check`
  - gruen.

### Claude-Snapshotabgleich und Altlasten-Nachbesserung

Claude meldete nach der zweiten Codex-Nachbesserung, weiterhin den
Balance-Diff `f7e380d` zu sehen. Dieser Review-Snapshot enthielt die zweite
Nachbesserung nicht: Im aktuellen Arbeitsbaum sind unter anderem
`createProfileOwnedBalanceState`, der migrierende `StorageManager`-Writer, der
finale `assertBalanceCommitStillCurrent`-Recheck und der reale Zwei-Write-Test
vorhanden. Mit Git Bash und `git diff | git hash-object --stdin` ergeben sich
nach der zusaetzlichen Altlastenbehebung:

- Balance-Code: `03b51a5fa63f4ffc58e8095b89a5e422474e60db`;
- vollstaendiger Slice-01-Code inklusive `profile-storage.js`:
  `bd6c885fbfac7d984f69a19af86a936105212a39`.

Claudes zusaetzliche Frage nach bereits verunreinigten Profildaten deckte eine
weitere echte Randluecke auf: Ein normaler Profilwechsel konnte alte
haushaltsweite Metadaten aus der Profilregistry erneut in den Haupt-State
laden. Dieser Fall wird als `N01-7` nachgefuehrt.

#### Red-State

- `node tests/run-single.mjs tests/profile-storage.test.mjs`
  - erwartungsgemaess rot bei Assertion 21;
  - der Profilsnapshot enthielt weiterhin `annualPeriodMetadata` und
    `balanceStateLifecycle`.

#### Umsetzung und fokussierte Gates

- `profile-storage.js` besitzt jetzt den gemeinsamen asymmetrischen
  Ownership-Contract fuer Profilwriter, Profilsnapshots und Profilwechsel.
- Beim Laden eines kontaminierten Altprofils:
  - stammen Inputs und profilbezogener `lastState` aus dem Zielprofil;
  - bleiben Periodenstatus, Lifecycle, Inflationsalter und Marktmetadaten aus
    dem aktuellen Haupt-State erhalten;
  - werden die haushaltsweiten Schluessel aus dem gespeicherten Profil entfernt.
- `tests/profile-storage.test.mjs`: 154/154.
- `tests/profile-navigation.test.mjs`: 25/25.
- `tests/balance-preview-commit-contract.test.mjs`: 68/68.
- `tests/balance-ui-orchestration.test.mjs`: 151/151.
- `tests/balance-storage-contract.test.mjs`: 41/41.
- `tests/balance-smoke.test.mjs`: 36/36.
- `tests/balance-annual-workflow-contract.test.mjs`: 33/33.
- `tests/profilverbund-balance.test.mjs`: 118/118.

#### Abschlussgates

- `npm test`
  - 132 Testdateien;
  - 7.669 Assertions;
  - 0 Fehler;
  - 0 offene Handles.
- `npm run test:browser`
  - 16/16 Browser-Smokes gruen.
- `git diff --check`
  - gruen.

## Abweichungen vom Plan

Der produktive Scope bleibt bei sieben Programmdateien.
`balance-annual-inflation.js` und `balance-binder-imports.js` mussten ihre
impliziten Update-Aufrufe auf den expliziten Modusvertrag umstellen. Die
urspruenglich vorgesehene, aber unveraenderte
`balance-binder-snapshots.js` wurde im Scope durch `profile-storage.js`
ersetzt, weil die Altlastenbereinigung an der tatsaechlichen
Profil-Capture-/Load-Grenze erfolgen muss. Die Stop-Grenze von mehr als zehn
Programmdateien wurde nicht erreicht.

## Offene Risiken

- Der Jahresprozess mutiert nach bestaetigtem Recovery-Snapshot weiterhin mehrere Eingabe- und Metadatenbereiche. Fehler nach Beginn dieser Writes muessen wie bisher ueber den bestaetigten Snapshot recovered werden.
- Multi-Profil-Writes besitzen weiterhin keine echte transaktionale
  Speicherschicht. Ein I/O-Fehler mitten im Profil-Loop kann nur ueber den vor
  dem Jahresprozess bestaetigten Recovery-Snapshot korrigiert werden
  (REV-01-F03).
- Fuer einen Abbruch in `writes_started` existiert weiterhin kein eigener
  gefuehrter UI-Recovery-Dialog; der vorhandene Snapshot-Restore ist manuell
  auszufuehren (REV-01-F04). Eine UI-/Recovery-Erweiterung wuerde den expliziten
  Nicht-Scope dieses Slice verlassen.
- Slice 2 muss die Interaktion zwischen finaler Action, Steuer-Settlement und den in diesem Slice eingefuehrten Commitgrenzen separat reconcilen.
- Der Browsernachweis deckt den echten Single-Profil-Jahrescommit ab. Der Multi-Profil-Commit ist durch DOM-nahe Orchestrierungs- und reine Lifecycle-Contracts abgedeckt; ein vollstaendiger Multi-Profil-Browser-Jahresabschluss bleibt ein Integrationsrisiko fuer Slice 16.
- Die FNV-1a-Fingerprints dienen nur der lokalen Stale-Candidate-Erkennung und Provenienz, nicht als kryptographischer Integritaetsnachweis.

## Rueckdokumentation

- Slice-Zeile im Hauptplan ist auf diese Datei verlinkt.
- Hauptplanstatus fuer Slice 1 ist auf `nachgebessert - Re-Review ausstehend` aktualisiert.
- Testergebnisse und offenes Multi-Profil-Browserrestrisiko sind im Hauptplan dokumentiert.

## Freigabestatus

Gemini hat die Codex-Nachbesserung am 2026-07-26 freigegeben. Claudes
nachgelagerte Aussage bezieht sich nach seinem eigenen Diff-Hinweis noch auf
den aelteren Snapshot `f7e380d` und bestaetigt die aktuelle zweite
Nachbesserung nicht. Zusaetzlich wurde sein Altlastenhinweis N01-7 umgesetzt.
Das unabhaengige Claude-Re-Review gegen den aktuellen Arbeitsbaum-Hash
`bd6c885fbfac7d984f69a19af86a936105212a39` steht aus. Codex markiert den Slice
nicht selbst als freigegeben.

## Review-Feedback von Gemini

**Review-Datum:** 2026-07-26 (Re-Review nach Nachbesserung)
**Reviewer:** Antigravity (Gemini)
**Methode:** Adversarielles Code- und Contract-Review gemäß `AGENTS.md` und `SLICE_EXECUTION_RULES.md`.

### Prüfdimensionen & Verifikation

1. **Korrektheit:** 
   - **`REV-01-F01` synchroner Storage-Write behoben:** `handleFormInput` in `balance-binder.js` schreibt keinen Zustand mehr direkt. Der Zeitstempel `depotLastUpdate` wird im App-State vorgemerkt und ordnungsgemäß über `update({ mode: 'persist_inputs' })` gespeichert.
   - **`REV-01-F02` Fingerprint-Isolation behoben:** `createBalanceCommitBaseFingerprint` isoliert rein fachliche Finanzzustände (Vermögen, Verlustvortrag, Profil-States) und schließt transiente UI-Zeitstempel (`depotLastUpdate`) aus. Tastatureingaben während eines Jahrescommits lösen keinen False-Positive `stale_candidate` mehr aus.
   - **`S01-1` & `S01-2` Profilverbund-Perioden-Metadaten behoben:** `writeProfileBalanceState` in `balance-main-profilverbund.js` führt den Profil-State mit dem Live-Hauptstate zusammen, sodass `annualPeriodMetadata` im Haupt-`LS_KEY` erhalten bleibt. Der Jahresabschluss verbleibt nicht mehr fälschlicherweise in `INCOMPLETE_RECOVERY`.
   - **`S01-3` Legacy-`persist` Mapping behoben:** Legacy-`persist` wird für alle Werte fail-closed mit `legacy_persist_unsupported` abgewiesen.
   - **`S01-4` Default-Update behoben:** Argumentloser `update()`-Aufruf fällt sicher auf schreibfreies `preview` zurück; produktive Schreibzugriffe nennen ihren Modus explizit.
2. **Vertragstreue:** 
   - Modusvertrag (`preview`, `persist_inputs`, `commit_period`) wird lückenlos und fail-closed im gesamten UI- und Lifecycle-Workflow eingehalten.
3. **Fehlerbehandlung:** 
   - Ungültige Modi, fehlende Perioden-IDs oder leere `profilverbundRuns` werden strikt mit strukturierten Lifecycle-Fehlern abgewiesen.
4. **Seiteneffekte:** 
   - `npm test` (7.637 Assertions, 132 Dateien) und `npm run test:browser` (16 Browser-Smokes) laufen ohne Fehler durch.

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  1. REV-01-F03 / Multi-Profil: Writes besitzen keine atomare Transaktionsschicht bei partiellen I/O-Abbrüchen während des Profil-Loops (Korrektur über Recovery-Snapshot).
  2. REV-01-F04 / UI-Recovery: Ein Abbruch in Phase writes_started erfordert manuelles Restore des erstellten Recovery-Snapshots über die UI.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Ein Tab-Schließen exakt im Millisekundenfenster während des Profil-Loop-Schreibens im Multi-Profil-Jahresabschluss, wodurch ein Profil auf dem neuen Stand und ein zweites auf dem Altstand verbleibt und manuell über den Recovery-Snapshot zurückgerollt werden muss.
```

## Review-Feedback von Claude

- **Review-Datum:** 2026-07-26 (nachgelagert, Stand nach Slice 07)
- **Reviewer:** Claude (Opus 5)
- **Methode:** Adversariales Code- und Contract-Review nach `CLAUDE.md` und
  `SLICE_EXECUTION_RULES.md`, gegen den heutigen Codestand statt nur gegen den
  Commitdiff `1b23e29`.

### Verifikation

- fokussierte Gates nachgefahren: `balance-preview-commit-contract` 40/40,
  `balance-ui-orchestration` 134/134, `balance-annual-workflow-contract`
  33/33, `balance-annual-period` 52/52, `balance-storage-contract` 41/41;
- Modusvertrag mit zwoelf Eingabevarianten direkt vermessen (Ergebnisse in
  S01-3 und S01-4);
- Datenfluss `persistMetadata` -> `writeProfileBalanceState` ->
  Haupt-`LS_KEY` statisch durchverfolgt (S01-1).

### Pruefdimensionen

1. **Korrektheit:** Der Single-Profil-Pfad erfuellt die Akzeptanzkriterien.
   Der Multi-Profil-Pfad verletzt sie (S01-1). Ungeprueft geblieben waren
   genau die Eingaben, die S01-1 und S01-3 ausloesen.
2. **Vertragstreue:** Das Legacy-`persist`-Mapping ist schwaecher als der
   neue `mode`-Pfad (S01-3); der Default ohne Argument ist ein schreibender
   Modus (S01-4).
3. **Fehlerbehandlung:** Der `mode`-Pfad ist sauber fail-closed. Ein leeres
   `profilverbundRuns` meldet dagegen Erfolg ohne Schreibvorgang (S01-7).
4. **Seiteneffekte:** Der neue Lifecycle sitzt auf einem Schreibpfad auf, der
   den Haupt-State vollstaendig ersetzt (S01-1).
5. **Was koennte brechen?** Am wenigsten durchdacht ist die Frage, welche
   Schluessel ausschliesslich im Haupt-`LS_KEY` leben und wer sie ueberschreibt.

### Findings

1. **S01-1 (Blocker) - im Profilverbund loescht jeder Schreibvorgang die
   Perioden-Metadaten, auf die der neue Commitvertrag angewiesen ist.**
   `writeProfileBalanceState` (`balance-main-profilverbund.js`) schreibt den
   Profil-State nicht nur in die Profildaten, sondern spiegelt ihn fuer das
   aktive Profil vollstaendig auf den Haupt-`LS_KEY`:
   `persistenceStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify(nextState))`.
   `nextState` entsteht aus `run.balanceState`, und `run.balanceState` stammt
   laut `loadProfilverbundProfiles` und `parseStoredBalanceStateFromData`
   ausschliesslich aus den Profildaten. `annualPeriodMetadata` wird dagegen
   nur an einer einzigen Stelle geschrieben - `balance-binder-snapshots.js`
   Zeile 88 ueber `StorageManager.saveState` - und damit nur in den
   Haupt-State. Der Schluessel kann die Profildaten also nie erreichen und
   wird bei jedem Profilverbund-Write aus dem Haupt-State entfernt.
   Auslesepfad: `assertBalancePeriodCommit` liest genau
   `persistentState.annualPeriodMetadata`.
   Deterministischer Ausloeser innerhalb des Jahresabschlusses: Schritt
   `applyAnnualInflation()` fuehrt ueber `commitNeedMutation` in
   `balance-annual-inflation.js` Zeile 375 ein argumentloses `update()` aus,
   das nach S01-4 im Modus `persist_inputs` schreibt. Zusaetzlich kann jedes
   waehrend der `await`-Abschnitte faellig werdende `debouncedUpdate`
   denselben Effekt haben.
   Folge: `commitLiveState` scheitert mit `period_not_pending`, der
   Jahresprozess endet wegen `commitStarted === true` im Zustand
   `INCOMPLETE_RECOVERY` und fordert den Nutzer zur Wiederherstellung des
   Recovery-Snapshots auf. Damit ist das Akzeptanzkriterium „Single- und
   Multi-Profil verwenden denselben expliziten Lifecycle-Vertrag" nicht
   erfuellt.
   Gleiches Muster trifft jeden weiteren nur im Haupt-State gefuehrten
   Schluessel. `commitNeedMutation` setzt unmittelbar vor dem `update()`
   `state.ageAdjustedForInflation` und speichert; im Profilverbund wird genau
   dieser Wert durch den unmittelbar folgenden Write wieder entfernt.
   Der Spiegelmechanismus selbst stammt aus `f8431fc` und ist damit aelter als
   dieser Slice. In Scope dieses Slice faellt er trotzdem, weil der neue
   Lifecycle- und Periodenvertrag auf ihm aufsetzt und seine Kernannahme
   verletzt wird.
2. **S01-2 (Blocker, Testabdeckung) - der Multi-Profil-Pfad ist nirgends
   real geprueft.** Test 6 in `balance-preview-commit-contract.test.mjs`
   ersetzt `persistProfilverbundInputs` und
   `persistProfilverbundProfileStates` durch Spies und verifiziert nur, dass
   der richtige Writer aufgerufen wird. Der tatsaechliche Schreibpfad wird von
   keinem Test ausgefuehrt. Die Slice-MD fuehrt als Restrisiko nur „kein
   Multi-Profil-Browser-Jahresabschluss" - das untertreibt: es fehlt nicht
   der Browsertest, sondern jede Pruefung der realen Multi-Profil-Persistenz.
   Genau in dieser Luecke sitzt S01-1.
3. **S01-3 (Blocker) - das Legacy-`persist`-Mapping ist fail-open Richtung
   Schreiben.** Nur `persist === false` wird auf `preview` abgebildet.
   Gemessen ergeben `persist: 0`, `persist: null`, `persist: ''` und
   `persist: 'false'` samtlich `persist_inputs`, also einen schreibenden
   Modus. Der neue `mode`-Pfad ist demgegenueber strikt fail-closed:
   `mode: undefined` und `mode: 'PREVIEW'` werfen `invalid_update_mode`. Ein
   Aufrufer, der `update({ persist: irgendeinFalsyWert })` schreibt, um eine
   Vorschau zu erzwingen, erhaelt stattdessen einen Schreibvorgang - exakt die
   Richtung, die dieser Slice schliessen sollte.
4. **S01-4 (Restrisiko) - der Default ohne Argument schreibt, und zwei
   Produktivaufrufer nutzen ihn.** `resolveBalanceUpdateRequest` faellt ohne
   `mode` und ohne `persist` auf `persist_inputs` zurueck. Bare `update()`
   steht in `balance-annual-inflation.js` Zeile 375 und
   `balance-binder-imports.js` Zeile 482. Der Import-Dry-run selbst nutzt
   korrekt `update({ persist: false })`, das Akzeptanzkriterium zur
   Mutationsfreiheit ist also erfuellt; der implizite Default widerspricht
   aber dem erklaerten Ziel eines expliziten Lifecycle-Vertrags und ist der
   Hebel fuer S01-1.
5. **S01-5 (Restrisiko) - der Stale-Candidate-Guard leistet weniger als
   dokumentiert.** `update()` ist vollstaendig synchron; zwischen Zeile 175
   und 346 existiert kein `await`. Basis-Fingerprint (Zeile 217) und
   Re-Read (Zeile 317 bis 323) liegen damit im selben synchronen Aufruf.
   `assertBalanceCandidateFresh` kann deshalb nur Schreibzugriffe des
   dazwischenliegenden Render- und Postprocess-Codes entdecken, nicht einen
   „zwischenzeitlich veraenderten State" im zeitlichen Sinn, wie die
   Slice-MD formuliert. Als Schutz gegen unbeabsichtigte Seiteneffekte des
   Renderings ist der Guard sinnvoll; seine Wirkung sollte aber korrekt
   beschrieben sein.
6. **S01-6 (Restrisiko) - tote Argumente an den Profilverbund-Writern.**
   `persistBalanceUpdate` uebergibt `persistProfilverbundInputs(runs,
   { inputData })` und `persistProfilverbundProfileStates(runs, { lifecycle,
   periodId })`. Die Implementierungen lauten `(runs) => ...` beziehungsweise
   `(runs, { lifecycle = null } = {}) => ...`; `inputData` und `periodId`
   werden ignoriert. Der Aufrufer suggeriert eine Wirkung, die es nicht gibt.
7. **S01-7 (Hinweis) - leeres `profilverbundRuns` meldet falschen Erfolg.**
   Ein leeres Array ist truthy. `persist_inputs` schreibt dann nichts,
   liefert aber `{ persisted: true, kind: 'persist_inputs' }`.
8. **S01-8 (Hinweis) - Fingerprint und Klon behandeln Nicht-JSON-Werte
   unterschiedlich.** `normalizeFingerprintValue` nutzt `Object.keys`; `Date`,
   `Map` und `Set` normalisieren damit zu `{}` und sind nicht unterscheidbar.
   `cloneBalanceState` verwendet `structuredClone`, faellt aber auf
   `JSON.parse(JSON.stringify(...))` zurueck - beide Pfade behandeln genau
   diese Typen verschieden. Heute unkritisch, weil der State ueber
   `JSON.stringify` in den localStorage geht; die Annahme ist aber nirgends
   festgehalten.
9. **S01-9 (Hinweis) - undokumentierte Verlustvortragssemantik im
   Haushalts-State.** `persistProfilverbundProfileStates` setzt beim Commit
   `taxState: { lossCarry: 0 }` auf dem Haushalts-State (aus `98bc13b`,
   Per-Profil-Settlement). Die Per-Profil-Verlustvortraege in `run.newState`
   bleiben erhalten, die Konstruktion ist also vermutlich beabsichtigt. Das
   Akzeptanzkriterium dieses Slice spricht jedoch pauschal vom erhaltenen
   Verlustvortrag, ohne zwischen Haushalts- und Profilebene zu unterscheiden.

### Review-Ergebnis

```markdown
## Review-Ergebnis
- Status: blockiert
- Blocker:
  1. S01-1 - im Profilverbund loescht jeder Schreibvorgang
     `annualPeriodMetadata` aus dem Haupt-State; der Periodencommit scheitert
     mit `period_not_pending` und der Jahresabschluss endet in
     INCOMPLETE_RECOVERY. Akzeptanzkriterium „gleicher Lifecycle-Vertrag fuer
     Single- und Multi-Profil" nicht erfuellt.
  2. S01-2 - der reale Multi-Profil-Schreibpfad ist durch keinen Test
     abgedeckt; Test 6 prueft ausschliesslich den Dispatch gegen Spies.
  3. S01-3 - das Legacy-`persist`-Mapping ist fail-open Richtung Schreiben
     (`0`, `null`, `''`, `'false'` ergeben gemessen `persist_inputs`).
- Restrisiken:
  1. S01-4 schreibender Default ohne Argument, zwei Produktivaufrufer.
  2. S01-5 Stale-Candidate-Guard wirkt enger als dokumentiert.
  3. S01-6 tote Argumente an den Profilverbund-Writern.
  4. S01-7 leeres `profilverbundRuns` meldet falschen Erfolg.
  5. S01-8 Fingerprint- und Klonpfad fuer Nicht-JSON-Werte inkonsistent.
  6. S01-9 undokumentierte Nullung des Haushalts-Verlustvortrags.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten
  einen Fehler im Produktivbetrieb - was ist die wahrscheinlichste Ursache?
  Ein Nutzer mit Profilverbund fuehrt den Jahresabschluss aus. Die
  Inflationsanpassung loest ein argumentloses `update()` aus, der
  Profilverbund-Write ersetzt den Haupt-State durch den Profil-State, die
  vorbereitete Periode verschwindet und der Commit bricht ab. Der Nutzer
  sieht die Aufforderung, einen Recovery-Snapshot wiederherzustellen,
  obwohl fachlich nichts falsch gerechnet wurde - und wiederholt den
  Vorgang, was denselben Abbruch erzeugt. Weil kein Test den realen
  Multi-Profil-Schreibpfad ausfuehrt, faellt das erst im Feld auf.
```

### Re-Review nach Nachbesserung (Claude, 2026-07-26)

#### Verifikation

- `npm test`: 7.637/7.637 Assertions gruen (vorher 7.613), 0 offene Handles;
- `git diff --check` fuer `app/` und `tests/` gruen;
- Modusvertrag erneut vermessen;
- Reproduktion von N01-1 mit dem echten Modul
  `createProfilverbundHandlers` gegen einen localStorage-Mock.

#### Findingstatus

- **S01-3 behoben, staerker als gefordert.** Der Legacy-Parameter `persist`
  wird nicht mehr gemappt, sondern mit `legacy_persist_unsupported`
  abgewiesen. Gemessen werfen `persist: false`, `persist: 0` und
  `persist: true` gleichermassen.
- **S01-4 behoben.** Der Default ohne Argument ist jetzt `preview`. Beide
  bisher impliziten Produktivaufrufer sind explizit:
  `balance-annual-inflation.js` nutzt `persist_inputs`,
  `balance-binder-imports.js` `preview` fuer den Dry-run und `persist_inputs`
  fuer den Abschluss.
- **S01-6 behoben.** Die toten Argumente `inputData` und `periodId` sind
  entfernt.
- **S01-7 behoben.** Ein leeres oder nicht-arrayfoermiges
  `profilverbundRuns` wirft `profile_runs_required`.
- **S01-2 teilweise behoben.** `balance-ui-orchestration.test.mjs` fuehrt den
  realen Schreibpfad jetzt ohne Spies aus. Die neue Abdeckung prueft aber nur
  einen einzelnen Write gegen einen frischen Haupt-State; die Sequenz aus zwei
  Writes mit zwischenzeitlicher Metadatenaenderung fehlt weiterhin - genau in
  dieser Luecke sitzt N01-1.
- **S01-5, S01-8, S01-9 unveraendert offen** (Restrisiken beziehungsweise
  Hinweise).

#### Neue Findings

1. **N01-1 (Blocker) - S01-1 ist nicht behoben, sondern um einen
   Jahreszyklus verschoben.** `writeProfileBalanceState` merged jetzt
   `{ ...readActiveMainBalanceState(), ...nextState }`. Der zusammengefuehrte
   Zustand wird aber nicht nur auf den Haupt-`LS_KEY` geschrieben, sondern
   ueber `updateProfileData` auch in die **Profildaten**. Damit wandert
   `annualPeriodMetadata` in die Profildaten. Beim naechsten Write ist genau
   dieser Profilstand die Quelle von `existing` in
   `persistProfilverbundInputs`, landet in `nextState` und gewinnt im Spread
   gegen den frischen Haupt-State.
   Reproduktion mit dem echten Modul:

   ```text
   1) Haupt-State vor Write A : lastCommittedPeriod=null,
                                pendingCommit{phase:"writes_started"}
   2) nach Write A  -> Haupt   : unveraendert (Merge wirkt)
      nach Write A  -> Profil  : annualPeriodMetadata jetzt in den Profildaten
   3) Jahresabschluss fertig   : lastCommittedPeriod="calendar-year:2025",
                                pendingCommit=null
   4) nach Write B  -> Haupt   : lastCommittedPeriod=null,
                                pendingCommit{phase:"writes_started"}
   ```

   Schritt 4 ist ein ganz normaler `persist_inputs`-Lauf nach einem
   abgeschlossenen Jahr. Er macht das abgeschlossene Jahr wieder unabgeschlossen
   und laesst einen Phantom-`pendingCommit` fuer dieselbe Periode
   wiederauferstehen. Der naechste Jahresabschluss kommt an
   `createAnnualPeriodPlan` vorbei, weil `lastCommittedPeriod` fehlt, und wird
   erst in `assertBalancePeriodCommit` ueber
   `lifecycle.lastCommittedPeriod` mit `period_already_committed` gestoppt -
   also nach `commitStarted = true` und damit erneut mit
   `INCOMPLETE_RECOVERY` und Snapshot-Aufforderung.
   Die neue Testzusicherung „Realer aktiver Profil-Write uebernimmt die nur im
   Haupt-State vorbereitete Periode" schreibt genau dieses Leck als
   gewuenschtes Verhalten fest.
   Ursache ist eine ungeklaerte Eigentuemerfrage: Perioden- und
   Workflow-Metadaten sind haushaltsweit, liegen aber in einem Speicher, den
   profilbezogene Writer vollstaendig ersetzen. Eine Behebung sollte den Merge
   asymmetrisch machen - `nextState` in die Profildaten, `{ ...main,
   ...nextState }` nur auf den Haupt-Key - oder die haushaltsweiten Schluessel
   vor dem Merge explizit aus `nextState` entfernen.
2. **N01-2 (Restrisiko) - der Merge liest an den Migrationen vorbei.**
   `readActiveMainBalanceState` greift direkt auf
   `persistenceStorage.getItem(CONFIG.STORAGE.LS_KEY)` zu und umgeht
   `StorageManager.loadState()` samt `_runMigrations`. In einem Update-Lauf
   existieren damit zwei Sichten auf denselben Schluessel: `persistentState`
   migriert, die Merge-Basis roh. Eine Migration, die einen Wert normalisiert,
   wird vom naechsten Profilverbund-Write wieder zurueckgeschrieben.
3. **N01-3 (Restrisiko) - `depotLastUpdate` erreicht im Profilverbund nie den
   Speicher.** `persistProfilverbundInputs` schreibt
   `inputs: run.persistedInput || run.input`, also profilabgeleitete Eingaben.
   Im Spread `{ ...main, ...nextState }` ersetzt `nextState.inputs` das
   gesamte `main.inputs`. Die in `balance-main.js` neu ergaenzte
   Uebernahme von `depotLastUpdate` aus `persistentState.inputs` wirkt damit
   nur im Single-Profil. Die Nachbesserung zu REV-01-F01 ist im Profilverbund
   wirkungslos.
4. **N01-4 (Hinweis) - undeklarierte Verhaltensaenderung.** `handleFormChange`
   verlaesst sich neu fuer `event.target.type === 'file'` vorzeitig und plant
   keinen `debouncedUpdate` mehr. Die Aenderung ist plausibel, gehoert aber zu
   keinem der adressierten Findings und ist im Delta-Ledger nicht ausgewiesen.
5. **N01-5 (Hinweis) - der eingegrenzte Fingerprint hat keinen Ersatzschutz.**
   `createBalanceCommitBaseFingerprint` klammert `annualPeriodMetadata` und
   Lifecycle jetzt korrekt aus. Der Kommentar verweist auf
   `assertBalancePeriodCommit` als separaten Schutz; dieser laeuft jedoch
   ausschliesslich gegen den zu Beginn von `update()` geladenen Zustand und
   liest nie neu. Innerhalb eines Tabs ist das unkritisch, weil `update()`
   synchron ist; ueber zwei Fenster auf demselben localStorage nicht.
6. **N01-6 (Hinweis)** - in `selectPersistentFinancialInputs` ist
   `.map(([key, value]) => [key, value])` eine Identitaetsabbildung ohne
   Wirkung.

#### Review-Ergebnis

```markdown
## Review-Ergebnis
- Status: blockiert
- Blocker:
  1. N01-1 - der Merge in `writeProfileBalanceState` schreibt die
     haushaltsweiten Perioden-Metadaten in die Profildaten; der naechste
     `persist_inputs`-Lauf setzt damit den Haupt-State auf einen veralteten
     Stand zurueck. Ein abgeschlossenes Jahr wird wieder unabgeschlossen und
     ein Phantom-`pendingCommit` erscheint. Mit dem echten Modul reproduziert.
- Restrisiken:
  1. S01-2 - die neue Testabdeckung prueft nur einen einzelnen Write.
  2. N01-2 - Merge-Basis umgeht die Storage-Migrationen.
  3. N01-3 - `depotLastUpdate` wirkt nur im Single-Profil.
  4. N01-4 - undeklarierte Aenderung an `handleFormChange`.
  5. N01-5 - eingegrenzter Fingerprint ohne Ersatzschutz ueber Fenstergrenzen.
  6. N01-6 - wirkungslose Identitaetsabbildung.
  7. S01-5, S01-8, S01-9 unveraendert.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten
  einen Fehler im Produktivbetrieb - was ist die wahrscheinlichste Ursache?
  Ein Haushalt mit Profilverbund schliesst das Jahr erfolgreich ab. Tage
  spaeter aendert der Nutzer einen beliebigen Eingabewert; der
  Profilverbund-Write spielt den in den Profildaten konservierten
  Metadatenstand zurueck. Der Jahresabschluss erscheint wieder als offen,
  der erneute Versuch bricht nach Beginn der Writes mit
  `period_already_committed` ab und fordert die Wiederherstellung eines
  Recovery-Snapshots - obwohl fachlich alles korrekt gerechnet wurde. Weil
  die Testabdeckung nur einen einzelnen Write gegen einen frischen
  Haupt-State prueft, bleibt die Sequenz gruen.
```

### Zweites Re-Review nach Ownership-Nachbesserung (Claude, 2026-07-27)

#### Pruefgegenstand

Arbeitsbaum ueber `4cb907b`, Balance-Diff-Hash `03b51a5` (vorher `f7e380d`).
Sieben Programmdateien, davon neu `app/profile/profile-storage.js`;
`balance-binder-snapshots.js` ist aus dem Scope entfallen. Die
Scope-Deklaration dieser Slice-MD stimmt mit dem tatsaechlichen Diff ueberein.

#### Verifikation

- `npm test`: 7.669/7.669 Assertions gruen (vorher 7.637), 0 offene Handles;
- `git diff --check` fuer `app/` und `tests/` gruen;
- fokussierte Gates: `balance-preview-commit-contract` 68,
  `balance-ui-orchestration` 151, `balance-annual-period` 52,
  `balance-storage-contract` 41, `profile-storage` 154 - alle ohne Fehler;
- fuenf eigene Reproduktionslaeufe gegen die geaenderten Module.

#### Nachgemessenes Verhalten

Dasselbe Szenario, das N01-1 zuvor ausgeloest hat:

```text
A) nach Write A -> Haupt : pendingCommit{phase:"writes_started"}
   nach Write A -> Profil: (nicht vorhanden)      <- Leck geschlossen
B) nach Write B -> Haupt : lastCommittedPeriod="calendar-year:2025",
                           pendingCommit=null     <- Regression beseitigt
D) nach Profilwechsel    : lastCommittedPeriod="calendar-year:2025",
                           pendingCommit=null
E) verunreinigtes Profil : Haupt-State gewinnt; Profildaten bereinigt
```

D und E decken die beiden Faelle ab, die als naechste Angriffspunkte offen
waren: `loadProfileIntoLocalStorage` rettet den Haushaltszustand ueber den
Profilwechsel, und `sanitizeProfileDataBalanceOwnership` migriert Altbestaende
beim Laden. Damit ist auch das im ersten Re-Review dokumentierte Restrisiko zu
persistent verunreinigten Profildaten erledigt.

#### Korrektur eines eigenen Vorbefunds

Das im ersten Re-Review protokollierte Ergebnis „`depotLastUpdate` verloren"
war ein Fehler des Pruefaufbaus: die verwendeten `runs` enthielten kein
`persistedInput`. Auf dem realen Pfad setzt `buildProfileEngineInput` auf
`{ ...sharedInput }` auf, `depotLastUpdate` gehoert nicht zu den per Profil
ueberschriebenen Schluesseln und wird transportiert. Mit realistischem
`persistedInput` nachgemessen: `Haupt-State depotLastUpdate: 777`. N01-3 ist
tatsaechlich behoben.

#### Pruefdimensionen

1. **Korrektheit:** N01-1 ist an der Wurzel behoben. Es existiert ein
   expliziter Eigentuemervertrag `HOUSEHOLD_OWNED_BALANCE_STATE_KEYS`;
   Profilschreibvorgaenge streifen diese Schluessel ab, der Haupt-State wird
   nicht mehr ersetzt, sondern ueber `mainStatePatch` gezielt gepatcht.
2. **Vertragstreue:** Das Akzeptanzkriterium „Single- und Multi-Profil
   verwenden denselben expliziten Lifecycle-Vertrag" ist erfuellt. N01-2 ist
   behoben, der Haupt-State laeuft ausschliesslich ueber
   `StorageManager.loadState()`/`saveState()`, die Migrationen greifen wieder.
   N01-5 ist substanzieller geloest als gefordert: `assertBalanceCommitStillCurrent`
   revalidiert Fingerprint und Periodenstatus gegen den frisch gelesenen State
   und gibt genau diesen fuer den Write zurueck.
3. **Fehlerbehandlung:** Unveraendert sauber. Der zusaetzliche Lesepfad in
   `loadProfileIntoLocalStorage` behandelt fehlendes und unparsbares JSON ueber
   `parseBalanceState` defensiv, ohne zu werfen - angemessen, weil ein
   Profilwechsel an korrupten Fremddaten nicht scheitern soll.
4. **Seiteneffekte:** Zwei neue Abhaengigkeitsrichtungen (M01-2). Die Migration
   in `loadProfileIntoLocalStorage` schreibt Profildaten in einem bisher
   lesenden Pfad zurueck; sie ist idempotent und nur bei tatsaechlicher
   Verunreinigung aktiv.
5. **Was koennte brechen?** Die Allowlist ist jetzt der zentrale Vertrag und
   zugleich eine dauerhafte Wartungspflicht (M01-1).

#### Neue Findings

1. **M01-1 (Restrisiko) - die Allowlist hat keine
   Vollstaendigkeitssicherung.** `loadProfileIntoLocalStorage` ersetzt den
   Haupt-State durch `{ ...profilEigenes, ...haushaltsEigenes }`. Ein
   kuenftiger haushaltsweiter Schluessel, der nicht in
   `HOUSEHOLD_OWNED_BALANCE_STATE_KEYS` eingetragen wird, verschwindet damit
   beim naechsten Profilwechsel still. Weder ein Test noch eine Assertion
   wuerde das bemerken.
   Empfehlung: ein Contract-Test, der die Allowlist gegen die tatsaechlich im
   Haupt-State vorkommenden Top-Level-Schluessel prueft und bei unbekannten
   Schluesseln fehlschlaegt. Kein Blocker, aber der guenstigste Zeitpunkt
   dafuer ist jetzt.
2. **M01-2 (Hinweis) - neue Abhaengigkeitsrichtung.**
   `app/profile/profile-storage.js` importiert `../balance/balance-config.js`,
   `balance-main-profilverbund.js` importiert `balance-storage.js`. Die
   Profilschicht haengt damit an der Balance-Schicht. Zur Laufzeit
   unproblematisch - kein Zyklus, Suite gruen -, aber eine Umkehrung der
   bisherigen Schichtung, die in keinem Architekturdokument steht.
3. **M01-3 (Hinweis) - inkonsistente Ablage von
   `lastInflationAppliedAtAge`.** `balance-binder-imports.js` fuehrt das Feld
   auf Top-Level, `balance-annual-inflation.js` dagegen unter `lastState`. Das
   Top-Level-Feld wird nirgends gelesen.

#### Findings-Lifecycle

```text
N01-1  Blocker      BEHOBEN - Ownership-Vertrag statt Merge; reproduziert und gegengeprueft
N01-2  Restrisiko   BEHOBEN - Haupt-State ausschliesslich ueber StorageManager
N01-3  Restrisiko   BEHOBEN - auf dem realen Pfad verifiziert; Vorbefund war ein Testfehler
N01-4  Hinweis      GEKLAERT - Begruendung und Delta-Eintrag nachgetragen
N01-5  Restrisiko   BEHOBEN - assertBalanceCommitStillCurrent revalidiert gegen frischen State
N01-6  Hinweis      BEHOBEN - Identitaetsabbildung entfernt
N01-7  Restrisiko   BEHOBEN - Capture strippt, Load migriert Altbestaende (D und E verifiziert)
S01-1..S01-9        alle behoben beziehungsweise geklaert
REV-01-F01..F04     im aktuellen Stand adressiert
M01-1  Restrisiko   NEU - Allowlist ohne Vollstaendigkeitssicherung
M01-2  Hinweis      NEU - Abhaengigkeitsrichtung profile -> balance undokumentiert
M01-3  Hinweis      NEU - inkonsistente Ablage von lastInflationAppliedAtAge
```

#### Review-Ergebnis

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine. N01-1 ist an der Wurzel behoben und mit derselben
  Zwei-Write-Sequenz gegengeprueft, die den Fehler zuvor erzeugt hat.
  Profilwechsel und Altbestandsmigration sind zusaetzlich verifiziert.
- Restrisiken:
  1. M01-1 - HOUSEHOLD_OWNED_BALANCE_STATE_KEYS ist eine Allowlist ohne
     Vollstaendigkeitssicherung; ein kuenftiger haushaltsweiter Schluessel geht
     beim Profilwechsel still verloren.
  2. M01-2 - undokumentierte Abhaengigkeit der Profil- von der Balance-Schicht.
  3. M01-3 - inkonsistente Ablage von lastInflationAppliedAtAge.
  4. S01-5 - der Stale-Candidate-Guard bleibt auf synchrone Seiteneffekte
     begrenzt; ueber zwei Fenster auf demselben localStorage schuetzt weiterhin
     nichts (durch den finalen Reread abgemildert, nicht aufgehoben).
  5. Kein vollstaendiger Multi-Profil-Browser-Jahresabschluss; bleibt
     Integrationsrisiko fuer Slice 16.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen
  Fehler im Produktivbetrieb - was ist die wahrscheinlichste Ursache?
  Ein spaeterer Slice fuehrt einen neuen haushaltsweiten Schluessel im
  Balance-State ein - etwa Metadaten fuer Marktdatenimport oder Recovery - und
  traegt ihn nicht in HOUSEHOLD_OWNED_BALANCE_STATE_KEYS ein. Der Schluessel
  funktioniert im Single-Profil einwandfrei und verschwindet im Profilverbund
  bei jedem Profilwechsel spurlos. Weil die Allowlist eine stille Vorgabe ohne
  Gegenprobe ist, faellt das erst auf, wenn ein Nutzer meldet, dass eine
  Einstellung nach dem Profilwechsel weg ist.
```

## Review-Antworten von Codex

Die Findings REV-01-F01/F02, S01-1 bis S01-9 sowie N01-1 bis N01-7 wurden
technisch beziehungsweise dokumentarisch nachgebessert und durch
reproduzierende Tests abgesichert. Insbesondere trennt der reale
Zwei-Write-Test nun Profil- und Haushalts-Ownership, benutzt den migrierenden
StorageManager-Pfad und beweist, dass ein spaeter Input-Write keinen
abgeschlossenen Periodenstatus zuruecksetzt. Der Profilwechseltest migriert
zusaetzlich einen bereits kontaminierten Profildatensatz und beweist, dass
aktuelle Haushaltsmetadaten nicht durch das Zielprofil ersetzt werden.
REV-01-F03 und REV-01-F04 bleiben bewusst dokumentierte
Architekturrestrisiken, weil eine echte Transaktionsschicht beziehungsweise
ein neuer Recovery-UI-Vertrag ausserhalb des freigegebenen Slice-Scope liegen.
Codex markiert die Nachbesserung nicht selbst als freigegeben.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| REV-01-F01 | Gemini (2026-07-26) | Direct `StorageManager.saveState` in `handleFormInput` bypasses update pipeline | behoben - Zeitstempel wird vorgemerkt und nur ueber `persist_inputs` geschrieben | umgesetzt und getestet |
| REV-01-F02 | Gemini (2026-07-26) | `createBaseStateFingerprint` includes transient `depotLastUpdate` timestamp | behoben - eigener Finanzfingerprint schliesst transiente Metadaten aus | umgesetzt und getestet |
| REV-01-F03 | Gemini (2026-07-26) | Non-atomic profile writes in multi-profile household commit | Restrisiko - als Restrisiko dokumentiert | dokumentiert |
| REV-01-F04 | Gemini (2026-07-26) | Missing guided UI recovery flow for `writes_started` crash recovery | Restrisiko - als Restrisiko dokumentiert | dokumentiert |
| S01-1 | Claude 2026-07-26 | Profilverbund-Write spiegelt den Profil-State auf den Haupt-`LS_KEY` und loescht `annualPeriodMetadata`; Periodencommit scheitert mit `period_not_pending` | behoben - Haupt-State wird migriert geladen und nur per explizitem, modusabhaengigem Patch fortgeschrieben | umgesetzt und real getestet |
| S01-2 | Claude 2026-07-26 | realer Multi-Profil-Schreibpfad durch keinen Test abgedeckt (Test 6 nutzt Spies); praezisiert REV-01-01 | behoben - realer Writer-Test prueft asymmetrische Ownership und eine zweite Eingabepersistenz nach Periodenabschluss | umgesetzt und getestet |
| S01-3 | Claude 2026-07-26 | Legacy-`persist`-Mapping fail-open Richtung Schreiben (`0`, `null`, `''`, `'false'` ergeben `persist_inputs`) | behoben - Legacy-Parameter wird fuer alle Werte fail-closed abgewiesen | umgesetzt und getestet |
| S01-4 | Claude 2026-07-26 | argumentloser `update()`-Default schreibt; zwei Produktivaufrufer nutzen ihn | behoben - Default ist `preview`, Produktivaufrufer sind explizit | umgesetzt und getestet |
| S01-5 | Claude 2026-07-26 | Stale-Candidate-Guard wirkt enger als dokumentiert (`update()` ist vollstaendig synchron) | nachgebessert - synchrone Finanzdatenpruefung plus finaler Storage-/Periodenstatus-Recheck; keine atomare Transaktionsgarantie | umgesetzt, getestet und dokumentiert |
| S01-6 | Claude 2026-07-26 | tote Argumente `inputData` und `periodId` an den Profilverbund-Writern | behoben | umgesetzt |
| S01-7 | Claude 2026-07-26 | leeres `profilverbundRuns` meldet `persisted: true` ohne Schreibvorgang | behoben - `profile_runs_required` | umgesetzt und getestet |
| S01-8 | Claude 2026-07-26 | Fingerprint- und Klonpfad behandeln Date/Map/Set inkonsistent | behoben - beide Pfade validieren denselben JSON-Vertrag fail-closed | umgesetzt und getestet |
| S01-9 | Claude 2026-07-26 | Nullung des Haushalts-Verlustvortrags beim Commit nicht dokumentiert | geklaert - Profil-Verlustvortraege autoritativ, Haushaltswert nicht autoritativ | in Code- und Referenzdokumentation erlaeutert |
| N01-1 | Claude Re-Review 2026-07-26 | Merge in `writeProfileBalanceState` schreibt haushaltsweite Perioden-Metadaten in die Profildaten; naechster `persist_inputs`-Lauf setzt den Haupt-State zurueck (reproduziert) | behoben - Haupt-Ownership-Schluessel werden aus Profilen entfernt; Haupt-State erhaelt nur explizite Patches | umgesetzt und mit realer Zwei-Write-Sequenz getestet |
| N01-2 | Claude Re-Review 2026-07-26 | Merge-Basis `readActiveMainBalanceState` umgeht `StorageManager.loadState()` und damit `_runMigrations` | behoben - Haupt-State wird ausschliesslich ueber `StorageManager.loadState()`/`saveState()` aktualisiert | umgesetzt und Migration im realen Writer-Test belegt |
| N01-3 | Claude Re-Review 2026-07-26 | `depotLastUpdate` erreicht im Profilverbund nie den Speicher; REV-01-F01-Nachbesserung dort wirkungslos | behoben - Profil- und Hauptinput-Patch transportieren den vorgemerkten Zeitstempel | umgesetzt und real getestet |
| N01-4 | Claude Re-Review 2026-07-26 | undeklarierte Verhaltensaenderung an `handleFormChange` (Early-Return fuer `type === 'file'`) | geklaert - verhindert den konkurrierenden Debounce-Write eines abgelehnten Imports | in Delta und Browserregression dokumentiert |
| N01-5 | Claude Re-Review 2026-07-26 | eingegrenzter Commit-Fingerprint ohne Ersatzschutz ueber Fenstergrenzen | behoben - finaler Storage-Reread revalidiert Finanzfingerprint und Periodenstatus unmittelbar vor Persistenz | umgesetzt und getestet; verbleibendes Nicht-Atomaritaetsrisiko dokumentiert |
| N01-6 | Claude Re-Review 2026-07-26 | `selectPersistentFinancialInputs` enthaelt eine wirkungslose Identitaetsabbildung | behoben - Identitaetsabbildung entfernt | umgesetzt |
| N01-7 | Claude-Nachtrag via Nutzer 2026-07-26 | bereits verunreinigte Profildaten koennen haushaltsweite Metadaten bei einem Profilwechsel erneut laden | behoben - Profil-Capture entfernt Haupt-Ownership-Schluessel; Profil-Load migriert Altbestand und laesst aktuelle Hauptmetadaten gewinnen | umgesetzt und mit realem Profilwechsel getestet |
| M01-1 | Claude 2. Re-Review 2026-07-27 | Allowlist HOUSEHOLD_OWNED_BALANCE_STATE_KEYS ohne Vollstaendigkeitssicherung; ein nicht eingetragener haushaltsweiter Schluessel geht beim Profilwechsel still verloren | offen - Restrisiko | Contract-Test gegen die tatsaechlichen Top-Level-Schluessel empfohlen |
| M01-2 | Claude 2. Re-Review 2026-07-27 | neue Abhaengigkeitsrichtung profile -> balance (profile-storage.js importiert balance-config.js) nicht dokumentiert | offen - Hinweis | ausstehend |
| M01-3 | Claude 2. Re-Review 2026-07-27 | lastInflationAppliedAtAge wird in balance-binder-imports.js auf Top-Level, in balance-annual-inflation.js unter lastState gefuehrt; Top-Level-Feld wird nie gelesen | offen - Hinweis | ausstehend |
