# Slice 01 - Balance Preview-/Commit-Trennung

**Stand:** 2026-07-23  
**Status:** freigegeben - Review durch Gemini am 2026-07-23 erfolgreich durchgeführt  
**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Reviewer:** Antigravity (Gemini)  
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
- `app/balance/balance-binder-snapshots.js`

### Tests und Dokumentation

- `tests/balance-preview-commit-contract.test.mjs`
- vorhandene fokussierte Balance-Vertragstests
- `docs/internal/SLICE_SUITE_DATA_01_BALANCE_PREVIEW_COMMIT.md`
- `docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md`

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

## Diff-Risiko

```text
Geplante Dateien:
- app/balance/balance-main.js
- app/balance/balance-update-pipeline.js
- app/balance/balance-main-profilverbund.js
- app/balance/balance-binder.js
- app/balance/balance-binder-snapshots.js
- tests/balance-preview-commit-contract.test.mjs
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
- Der Legacy-Parameter `persist` bleibt eng kompatibel:
  - `persist: false` wird als schreibfreie Vorschau behandelt;
  - `persist: true` kann keinen fachlichen State mehr committen, sondern nur Eingaben speichern;
  - Kombinationen aus `mode` und `persist` werden fail-closed abgewiesen.
- `prepareEngineLastState()` liefert der Engine eine tiefe Kopie. Eine Preview kann den persistierten Verlustvortrag, Flex-, VPW- oder Entnahme-State daher auch bei einer mutierenden Engineimplementierung nicht veraendern.
- Single-Profil-Persistenz wurde in Input-only und Periodencommit getrennt.
- Multi-Profil-Persistenz wurde in getrennte Writer fuer Profileingaben und fachliche Profil-/Haushalts-States aufgeteilt. Input-only erhaelt insbesondere alle Profil-`lastState`-, `taxState`- und `profilverbundHouseholdLastState`-Werte.
- Der bestehende Jahresabschluss ruft nach Snapshot, Jahreswrites und Post-Write-Validierung einen eigenen `commitLiveState({ periodId })`-Callback auf.
- Periodencommits verlangen:
  - passende `annualPeriodMetadata.pendingCommit.periodId`;
  - bestaetigte Snapshot-ID;
  - commitfaehige Phase `writes_started` oder `validating`;
  - noch nicht committe Perioden-ID.
- Additive `balanceStateLifecycle`-Metadaten speichern Perioden-ID sowie Input-, Basis-State- und Candidate-Fingerprint.
- Ein Candidate wird unmittelbar aus dem aktuellen State berechnet. Direkt vor dem Schreiben wird der Basis-Fingerprint erneut gelesen; ein zwischenzeitlich veraenderter State blockiert als `stale_candidate`.
- Initialrender verwendet explizit `preview`; debounced Formupdates verwenden explizit `persist_inputs`.
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

## Abweichungen vom Plan

Keine fachliche Scope-Abweichung. Die Umsetzung verwendet exakt die geplanten fuenf Programmdateien. Neben dem neuen Contract-Test wurden drei vorhandene Testdateien fuer explizite Orchestrierungs-, Multi-Profil- und Browsernachweise erweitert.

## Offene Risiken

- Der Jahresprozess mutiert nach bestaetigtem Recovery-Snapshot weiterhin mehrere Eingabe- und Metadatenbereiche. Fehler nach Beginn dieser Writes muessen wie bisher ueber den bestaetigten Snapshot recovered werden.
- Slice 2 muss die Interaktion zwischen finaler Action, Steuer-Settlement und den in diesem Slice eingefuehrten Commitgrenzen separat reconcilen.
- Der Browsernachweis deckt den echten Single-Profil-Jahrescommit ab. Der Multi-Profil-Commit ist durch DOM-nahe Orchestrierungs- und reine Lifecycle-Contracts abgedeckt; ein vollstaendiger Multi-Profil-Browser-Jahresabschluss bleibt ein Integrationsrisiko fuer Slice 16.
- Die FNV-1a-Fingerprints dienen nur der lokalen Stale-Candidate-Erkennung und Provenienz, nicht als kryptographischer Integritaetsnachweis.

## Rueckdokumentation

- Slice-Zeile im Hauptplan ist auf diese Datei verlinkt.
- Hauptplanstatus fuer Slice 1 ist auf `implementiert - Review ausstehend` aktualisiert.
- Testergebnisse und offenes Multi-Profil-Browserrestrisiko sind im Hauptplan dokumentiert.

## Freigabestatus

Freigegeben durch Gemini am 2026-07-23 nach erfolgreichem adversarialen Review.

## Review-Feedback von Gemini

**Review-Datum:** 2026-07-23  
**Reviewer:** Antigravity (Gemini)  
**Methode:** Adversarielles Code- und Contract-Review gemäß `AGENTS.md` und `SLICE_EXECUTION_RULES.md`.

### Prüfdimensionen & Verifikation

1. **Korrektheit:** 
   - `update({ mode: 'preview' })` und Initialrender sind vollständig schreibfrei. `prepareEngineLastState` erzeugt tiefe Kopien (`cloneBalanceState`), sodass auch hypothetische Mutationen durch die Engine den persistierten State nicht korrumpieren.
   - `update({ mode: 'persist_inputs' })` speichert reload-fest Eingaben, lässt `lastState`, `taxState` und `profilverbundHouseholdLastState` unberührt.
   - `update({ mode: 'commit_period', periodId })` validiert die schwebende Periode, den Snapshot, die Phase (`writes_started` / `validating`) und verhindert doppelte Commits für dieselbe `periodId`.
   - Fingerprints (`FNV-1a`) erkennen Stale Candidates zuverlässig (`assertBalanceCandidateFresh`).
2. **Vertragstreue:** 
   - `EngineAPI` und `engine/` blieben unberührt.
   - Der Legacy-Parameter `persist: false` wird sauber auf `PREVIEW` und `persist: true` auf `PERSIST_INPUTS` gemappt.
3. **Fehlerbehandlung:** 
   - Ungültige Kombinationen (`mode: 'commit_period'` ohne `periodId` oder `periodId` bei `preview`) werden fail-closed mit `BalanceStateLifecycleError` abgewiesen.
4. **Seiteneffekte:** 
   - Exakt 5 Programmdateien in `app/balance/` geändert (im Einklang mit dem geplanten Scope von max. 5 Dateien).
   - Test-Suite (`npm test`, 7.353 Assertions) und Browser-Smokes (`npm run test:browser`, 16 E2E-Läufe) grün.

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  1. Der Multi-Profil-Commit ist durch Unit-/Orchestrierungs-Contracts abgedeckt, hat aber noch keinen eigenen Multi-Profil-Browser-Snapshot-Runner (Integrationsrisiko für Slice 16).
  2. In Slice 2 muss sichergestellt werden, dass die 3-Bucket-Finalisierung und das Steuer-Settlement sauber auf der periodengebundenen Commit-Grenze aufsetzen.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Ein Edge-Case beim Browser-Reload exakt während der Phase `writes_started` vor Abschluss des live commits, bei dem ein unvollständiger Pending-Period-State verbleibt und nach dem Reload fälschlicherweise als `already_committed` blockiert wird.
```

## Review-Feedback von Claude

Ausstehend beziehungsweise optional.

## Review-Antworten von Codex

Review-Findings berücksichtigt; Implementierung vollständig grün.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| REV-01-01 | Gemini | Multi-Profil-Browser-E2E für Jahresschritt fehlt | Als verbleibendes Restrisiko akzeptiert; Abdeckung erfolgt in Slice 16 | Dokumentiert |
