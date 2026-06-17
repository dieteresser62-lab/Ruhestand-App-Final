# Slice Tail Risk 01: Contract

**Feature-Branch:** `codex/fat-tail-crash-modell`  
**GitHub-Status:** lokal angelegt, noch nicht veroeffentlicht  
**Status:** freigegeben  
**Startdatum:** 2026-06-17  
**Uebergeordneter Plan:** `docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md`

## Ziel

Dieser Slice legt den DOM-freien Contract fuer das optionale Fat-Tail-/Crash-Overlay fest. Festgeschrieben werden Default, Parametergrenzen, Validierungsverhalten, Krisenjahr-Skip-Logik und der bekannte Klippen-Effekt an der historischen Krisenschwelle. Runner, Worker, UI und Ergebnis-KPIs bleiben unveraendert.

## Akzeptanzkriterien

- Tail-Risk ist per Default deaktiviert.
- Version 1 verwendet Ereignis-Injektion pro Run als explizites Opt-in.
- Parametergrenzen sind als Contract zentral dokumentiert: Wahrscheinlichkeit 0..5%, Return-Schock -60..0%, Inflationsschock 0..15%, Dauer 1..5 Jahre, Cooldown 0..20 Jahre.
- User-/UI-nahe Validierung meldet Werte ausserhalb der Grenzen als Fehler und klemmt sie nicht still.
- `tailRiskAnnualProbabilityPct=0` bleibt ein explizit eventfreier Zustand.
- Historische Krisenjahre werden ueber Aktienrendite <= -25%, Inflation >= 8% oder bekannte Stress-/Regime-Labels erkannt.
- Effektive Aktienrendite wird fuer Version 1 auf mindestens -65% begrenzt; effektive Inflation auf maximal 15%.
- Der Klippen-Effekt rund um -25% wird in einem Contract-Test quantifiziert und als Restrisiko dokumentiert.
- Kein Zugriff auf DOM, Worker oder globale Browserobjekte.

## Scope

- Neues Contract-Modul unter `app/simulator/`.
- Fokussierter Contract-Test.
- Slice-Dokumentation und Rueckdokumentation im Arbeitsplan.

## Nicht-Scope

- Keine Monte-Carlo-Runner-Integration.
- Keine Worker-Payload-Aenderung.
- Keine UI-/Persistenz-Aenderung.
- Keine Ergebnis-KPI- oder Export-Aenderung.
- Keine Mutation historischer Daten.
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

- `docs/internal/SLICE_TAIL_RISK_01_CONTRACT.md`
- `docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md`
- `app/simulator/tail-risk-contract.js`
- `tests/tail-risk-contract.test.mjs`

Voraussichtliche Aenderungstiefe:

- klein bis mittel

Gefaehrdete bestehende Tests:

- `tests/simulator-monte-carlo.test.mjs`
- `tests/worker-parity.test.mjs`
- `tests/scenario-analyzer.test.mjs`

Nicht anfassen:

- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- bestehende Monte-Carlo-Runner-/Worker-Semantik
- vorhandene `node_modules`-Aenderungen

Rollback-Strategie:

- Geaenderte bestehende Dateien: `git checkout -- docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md`
- Neue Dateien nach Rueckfrage entfernen: `docs/internal/SLICE_TAIL_RISK_01_CONTRACT.md`, `app/simulator/tail-risk-contract.js`, `tests/tail-risk-contract.test.mjs`

## Geplante Tests

- `node tests/run-single.mjs tests/tail-risk-contract.test.mjs`
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
- `node tests/run-single.mjs tests/worker-parity.test.mjs`
- `node tests/run-single.mjs tests/scenario-analyzer.test.mjs`
- `npm test`

## Durchgefuehrte Aenderungen

- `app/simulator/tail-risk-contract.js` neu angelegt.
- Contract-Konstanten fuer Ereignis-Injektion, Default `tailRiskEnabled=false`, Parametergrenzen, Krisenjahr-Schwellen und Effektivwert-Clamps definiert.
- `normalizeTailRiskConfig()` implementiert; invalides User-/UI-nahes Input erzeugt explizite `tailRiskValidationErrors` und wird nicht still auf Grenzwerte geklemmt.
- `classifyHistoricalTailRiskCrisisYear()` implementiert; erkennt Krisenjahre ueber Aktienrendite <= -25%, Inflation >= 8% und bekannte Regime-/Stresslabels.
- `previewTailRiskOverlay()` als nicht-mutierende Contract-Vorschau implementiert; Runner-/Schedule-Integration bleibt Folge-Slice.
- `validateTailRiskHorizonCompatibility()` implementiert, damit die Event-Dauer gegen einen Simulationshorizont validierbar ist; ein Cooldown darf ueber den Horizont hinausreichen.
- `tests/tail-risk-contract.test.mjs` neu angelegt, inklusive Test fuer den bekannten Klippen-Effekt: -24% historisch + -35% Tail-Schock wird schlechter als ein geskipptes -25.1%-Krisenjahr.
- Nach Gemini-Review korrigiert: `rendite` wird strikt als Dezimalrendite interpretiert, `returnPct`/`equityReturnPct`/`stockReturnPct` strikt als Prozentfelder; boolesche Zahlenfelder werden als Validierungsfehler abgelehnt.
- Uebergeordneten Arbeitsplan mit lokalem Branch und Slice-Status aktualisiert.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/tail-risk-contract.test.mjs`
  - Ergebnis vor Review-Nacharbeit: gruen, 44 Assertions.
  - Ergebnis nach Review-Nacharbeit: gruen, 53 Assertions.
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
  - Ergebnis: gruen, 95 Assertions.
- `node tests/run-single.mjs tests/worker-parity.test.mjs`
  - Ergebnis: gruen, 353 Assertions.
- `node tests/run-single.mjs tests/scenario-analyzer.test.mjs`
  - Ergebnis: gruen, 23 Assertions.
- `npm test`
  - Ergebnis vor Review-Nacharbeit: gruen, 100 Testdateien, 2932 Assertions, 0 fehlgeschlagene Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles.
  - Ergebnis nach Review-Nacharbeit: gruen, 100 Testdateien, 2941 Assertions, 0 fehlgeschlagene Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles.

## Abweichungen Vom Plan

- Keine fachliche Abweichung. Der Slice implementiert nur den Contract; Runner, Worker und UI bleiben Folge-Slices.
- Die im Plan erwaehnten Red-State-Tests wurden als gruene Contract-Tests umgesetzt, weil keine produktive Integration in diesem Slice erwartet wird. Ein bewusst roter Zustand ist daher nicht erforderlich.
- Nach Review wurde die urspruengliche Horizon-Regel konkretisiert: Nur die Event-Dauer selbst muss in den Horizont passen; der Cooldown darf ueber den Horizont hinausreichen, um maximal einen Crash zu erzwingen.

## Offene Risiken

- Das Contract-Modul ist noch nicht in Monte-Carlo-Runner, Worker, UI oder Persistenz verdrahtet.
- Die nicht-monotone Skip-Klippe an der -25%-Schwelle ist bewusst dokumentiert: Ein -24%-Jahr kann nach Tail-Schock schlechter enden als ein geskipptes -25.1%-Krisenjahr.
- Die Regime-Label-Erkennung ist defensiv, bleibt aber davon abhaengig, dass spaetere Integrations-Slices die tatsaechlichen Runner-/MarketAnalyzer-Felder korrekt weiterreichen.
- RNG-Determinismus und Worker-Chunking werden erst in den Folge-Slices technisch abgesichert.

## Rueckdokumentation

- `docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md` dokumentiert den lokalen Feature-Branch `codex/fat-tail-crash-modell` und den Status von Slice 1.

## Freigabestatus

- Codex-Implementierung abgeschlossen; Review durch Gemini/Nutzer steht aus. Codex markiert den Slice nicht als freigegeben.

### Review-Feedback von Gemini

### Nachtrag nach Re-Review (2026-06-17)
- **Status:** freigegeben
- **Blocker:** keine (alle Blocker TR-01-01 und TR-01-02 wurden erfolgreich behoben).
- **Behebung der Findings:**
  - **TR-01-01 (normalizeReturnPct Heuristik):** Die fehleranfällige Heuristik wurde durch eine explizite Feldsemantik ersetzt. `rendite` wird nun immer als Dezimalwert (multipliziert mit 100) interpretiert, während alle `*Pct`-Felder direkt als Prozentwerte gelesen werden. Dies wurde mit entsprechenden Grenzwert-Tests (nahe Null und extrem) abgesichert.
  - **TR-01-02 (HorizonCompatibility):** Die Prüfung blockiert nicht mehr fälschlicherweise bei langen Cooldowns. Nur noch die Event-Dauer (`tailRiskDurationYears`) muss kleiner oder gleich dem Horizont sein.
  - **TR-01-03 (Boolean-Konvertierung):** Boolesche Werte werden in `normalizeBoundedNumber` jetzt explizit abgefangen und melden einen regulären Validierungsfehler.
  - **TR-01-04 (Nicht-monotone Skip-Klippe):** Wurde als bewusstes Restrisiko für Version 1 akzeptiert und bleibt durch den Contract-Test quantifiziert.


## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

### Antwort auf Gemini-Feedback

- **TR-01-01 normalizeReturnPct-Heuristik:** Angenommen. Die Heuristik wurde entfernt. `rendite` wird nun explizit als Dezimalrendite gelesen und mit 100 multipliziert; `returnPct`, `equityReturnPct` und `stockReturnPct` werden explizit als Prozentfelder gelesen und nicht skaliert. Regressionstests decken `returnPct: -0.5` und `rendite: -1.2` ab.
- **TR-01-02 HorizonCompatibility/Cooldown:** Angenommen. Die Horizon-Kompatibilitaet blockiert nur noch, wenn `tailRiskDurationYears > horizonYears`. Ein Cooldown ueber den Horizont hinaus ist erlaubt, weil er maximal einen weiteren Event verhindert.
- **TR-01-03 Boolean-Konvertierung:** Angenommen. `normalizeBoundedNumber()` lehnt boolesche Werte jetzt explizit als Validierungsfehler ab, statt `true`/`false` ueber `Number()` zu akzeptieren.
- **TR-01-04 Nicht-monotone Skip-Klippe:** Angenommen als bewusstes Restrisiko fuer Version 1. Der Contract-Test quantifiziert die Nicht-Monotonie weiterhin; Folge-Slices duerfen diesen Effekt nicht verstecken, sondern muessen ihn in Logs/Vergleichsreport ausweisen.

## Review-Entscheidungen
 
| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| TR-01-01 | Gemini | normalizeReturnPct Heuristik verfälscht Renditen nahe Null und extreme Renditen | angenommen | erledigt: explizite Feldsemantik `rendite`=Dezimal, `*Pct`=Prozent plus Regressionstests |
| TR-01-02 | Gemini | HorizonCompatibility blockiert unnötig lange Cooldowns | angenommen | erledigt: nur Event-Dauer muss in den Horizont passen; Cooldown darf ueber Horizont hinausreichen |
| TR-01-03 | Gemini | Stille Typkonvertierung von Booleans in normalizeBoundedNumber | angenommen | erledigt: Boolean-Werte erzeugen Validierungsfehler |
| TR-01-04 | Gemini | Nicht-monotone Skip-Klippe verzerrt Pfadstatistiken | angenommen als Restrisiko | dokumentiert und per Contract-Test quantifiziert |
