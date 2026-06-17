# Slice Tail Risk 02: Overlay-Modul

**Feature-Branch:** `codex/fat-tail-crash-modell`  
**GitHub-Status:** lokal angelegt, noch nicht veroeffentlicht  
**Status:** freigegeben  
**Startdatum:** 2026-06-17  
**Uebergeordneter Plan:** `docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md`

## Ziel

Dieser Slice implementiert das DOM-freie Tail-Risk-Overlay-Modul auf Basis des in Slice 1 freigegebenen Contracts. Es erzeugt deterministische Event-Schedules aus Seed und Horizont, wendet Tail-Events nicht-mutierend auf einzelne Jahresdaten an und liefert eine einfache Event-Zusammenfassung. Runner, Worker, UI, Persistenz und Ergebnis-KPIs bleiben unveraendert.

## Akzeptanzkriterien

- `tailRiskEnabled=false` und `tailRiskAnnualProbabilityPct=0` erzeugen leere Event-Schedules.
- Gleicher Seed, gleiche Config und gleicher Horizont erzeugen identische Event-Schedules.
- Unterschiedliche Seeds koennen unterschiedliche Event-Schedules erzeugen.
- Event-Dauer und Cooldown werden eingehalten; Events ueberlappen nicht.
- Die Schedule-Erzeugung ist linear und kann nicht in eine Endlosschleife geraten.
- `applyTailRiskOverlay()` mutiert die Eingabe-Jahresdaten nicht.
- Historische Krisenjahre erhalten keinen zusaetzlichen Return-Schock und melden `tailRiskSkippedReason='historical_crisis'`.
- Effektive Aktienrendite bleibt >= -65%, effektive Inflation <= 15%.
- DOM-, Worker- und globale Browserobjekte werden nicht verwendet.

## Scope

- Neues DOM-freies Modul `app/simulator/tail-risk-overlay.js`.
- Fokussierter Unit-Test `tests/tail-risk-overlay.test.mjs`.
- Rueckdokumentation im uebergeordneten Arbeitsplan.

## Nicht-Scope

- Keine Monte-Carlo-Runner-Integration.
- Keine Worker-Payload- oder Worker-Paritaets-Aenderung.
- Keine UI-/Persistenz-Aenderung.
- Keine Ergebnis-KPI-, Log-Builder- oder Export-Aenderung.
- Keine Aenderung an `engine/`, `engine.js`, `dist/` oder Release-Artefakten.

## Git-Status Vor Start

Branch:

```text
codex/fat-tail-crash-modell
```

Status:

```text
 M node_modules/.package-lock.json
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
```

Hinweis: Die `node_modules`-Aenderungen waren vor Slice-Start vorhanden und werden nicht angefasst.

## Diff-Risiko

Geplante Dateien:

- `docs/internal/SLICE_TAIL_RISK_02_OVERLAY_MODULE.md`
- `docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md`
- `app/simulator/tail-risk-overlay.js`
- `tests/tail-risk-overlay.test.mjs`

Voraussichtliche Aenderungstiefe:

- mittel

Gefaehrdete bestehende Tests:

- `tests/tail-risk-contract.test.mjs`
- `tests/simulator-monte-carlo.test.mjs`
- `tests/worker-parity.test.mjs`

Nicht anfassen:

- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- Runner-/Worker-/UI-Verdrahtung
- vorhandene `node_modules`-Aenderungen

Rollback-Strategie:

- Geaenderte bestehende Dateien: `git checkout -- docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md`
- Neue Dateien nach Rueckfrage entfernen: `docs/internal/SLICE_TAIL_RISK_02_OVERLAY_MODULE.md`, `app/simulator/tail-risk-overlay.js`, `tests/tail-risk-overlay.test.mjs`

## Geplante Tests

- `node tests/run-single.mjs tests/tail-risk-overlay.test.mjs`
- `node tests/run-single.mjs tests/tail-risk-contract.test.mjs`
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
- `node tests/run-single.mjs tests/worker-parity.test.mjs`
- `npm test`

## Durchgefuehrte Aenderungen

- `app/simulator/tail-risk-overlay.js` neu angelegt.
- `createTailRiskSchedule(runSeed, configInput, horizonYears)` implementiert:
  - normalisiert und validiert den Slice-1-Contract,
  - erzeugt pro Horizontjahr `null` oder ein Tail-Event,
  - koppelt den RNG deterministisch an den uebergebenen Run-Seed,
  - setzt Events linear entlang der Jahre und springt nach Event-Dauer plus Cooldown weiter,
  - erzeugt bei deaktiviertem Tail-Risk, Wahrscheinlichkeit 0, invalidem Horizont oder invalidem Config-/Horizont-Contract keine Events.
- `applyTailRiskOverlay(yearData, tailEvent, context)` implementiert:
  - kopiert Jahresdaten vor jeder Anpassung,
  - schreibt effektive Aktienrendite als dezimales `rendite`-Feld und Inflation als Prozentwert,
  - nutzt den Contract aus Slice 1 fuer Krisenjahr-Erkennung, Return-Floor -65% und Inflations-Cap 15%,
  - meldet aktive, angewandte und geskippten Tail-Event-Status fuer spaetere Logs.
- `summarizeTailRiskEvents(entries)` implementiert:
  - zaehlt eindeutige Event-IDs, aktive Jahre, angewandte Jahre und historische Krisenjahr-Skips.
- `tests/tail-risk-overlay.test.mjs` neu angelegt mit Tests fuer deaktivierte/0%-Schedules, Seed-Determinismus, Duration/Cooldown, Horizon-Validierung, Immutability, Krisenjahr-Skip, Effektivwert-Clamps und Summary.
- Uebergeordneten Arbeitsplan mit Slice-2-Status aktualisiert.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/tail-risk-overlay.test.mjs`
  - Erster Lauf: rot, 28/29 Assertions. Finding: `summarizeTailRiskEvents()` zaehlte inaktive Eintraege mit `tailRiskEventId=null` faelschlich als aktiv.
  - Nach Korrektur: gruen, 31 Assertions.
- `node tests/run-single.mjs tests/tail-risk-contract.test.mjs`
  - Ergebnis: gruen, 53 Assertions.
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
  - Ergebnis: gruen, 95 Assertions.
- `node tests/run-single.mjs tests/worker-parity.test.mjs`
  - Ergebnis: gruen, 353 Assertions.
- `npm test`
  - Ergebnis: gruen, 101 Testdateien, 2972 Assertions, 0 fehlgeschlagene Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles.

## Abweichungen Vom Plan

- Keine fachliche Abweichung. Runner, Worker, UI, Persistenz, Ergebnis-KPIs und Export bleiben unveraendert fuer Folge-Slices.
- `createTailRiskSchedule()` erzeugt keine partiellen Events am Horizontende. Ein Event startet nur, wenn seine volle Dauer in den verbleibenden Horizont passt; damit wird die Duration-Regel ohne Ueberlappung eingehalten.
- `summarizeTailRiskEvents()` ist bewusst klein gehalten und kann sowohl Ergebnisse von `applyTailRiskOverlay()` als auch Schedule-Eintraege auswerten. Detail-KPIs fuer Failure-Beitrag bleiben spaeteren Slices vorbehalten.

## Offene Risiken

- Das Overlay-Modul ist nach diesem Slice noch nicht in Runner, Worker, UI oder Persistenz verdrahtet.
- Die Schedule wird aktuell aus dem uebergebenen Seed abgeleitet; die korrekte Ableitung aus `makeRunSeed(seed, comboIdx, runIdx)` muss in Slice 3/4 bei Runner-/Worker-Integration abgesichert werden.
- Der bekannte nicht-monotone Klippen-Effekt an der historischen Krisenschwelle aus Slice 1 bleibt bestehen.

## Rueckdokumentation

- `docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md` dokumentiert Slice 2 als implementiert mit ausstehendem Review.

## Freigabestatus

- Codex-Implementierung abgeschlossen; Review durch Gemini/Nutzer steht aus. Codex markiert den Slice nicht als freigegeben.

## Review-Feedback von Gemini

- **Status:** freigegeben
- **Blocker:** keine
- **Findings & Analysen:**
  - **TR-02-01 (Terminierung & Endlosschleifen):** Die stochastische Generierungsschleife terminiert sicher, da `yearIndex` in jedem Durchlauf (egal ob Event oder nicht) um mindestens 1 erhöht wird (da `tailRiskDurationYears` >= 1 ist).
  - **TR-02-02 (RNG-Determinismus):** Die Koppelung an `runSeed` ist deterministisch umgesetzt. Tests verifizieren, dass identische Seeds identische Schedules liefern.
  - **TR-02-03 (Immutability):** `applyTailRiskOverlay` arbeitet nicht-mutierend durch flache Kopie der Jahresdaten. Das wurde im Unit-Test verifiziert.
- **Restrisiken:**
  - Ableitung der Seeds für die Partitionen im Monte-Carlo-Worker-Pool (muss in Slice 3/4 verifiziert werden).
  - Nicht-monotone Skip-Klippe an der Krisenschwelle (aus Slice 1).

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

Noch offen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| TR-02-01 | Gemini | Endlosschleifen-Gefahr bei createTailRiskSchedule | Geprüft & Freigegeben | Schleife erhöht yearIndex in jedem Schritt um mindestens 1 |
| TR-02-02 | Gemini | RNG-Determinismus in MC-Worker-Partitionen gefährdet | Akzeptiert als Restrisiko | Seed-Ableitung muss in Slice 3/4 intensiv getestet werden |
| TR-02-03 | Gemini | Nicht-monotone Skip-Klippe | Akzeptiert als Restrisiko | Bereits in Slice 1 dokumentiert und per Contract-Test quantifiziert |

