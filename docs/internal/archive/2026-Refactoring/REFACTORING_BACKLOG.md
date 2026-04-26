# Refactoring Backlog

Stand: 2026-04-26

Dieses Dokument dient als Arbeitsliste fuer die naechsten Refactoring-Schritte. Jeder Punkt enthaelt:

- warum der Bereich refaktoriert werden sollte
- was konkret gemacht werden soll
- welche Tests/Checks nach der Umsetzung laufen sollen
- Platz fuer die Dokumentation der tatsaechlich umgesetzten Aenderungen

Baseline vor Erstellung dieses Backlogs: `npm test` erfolgreich, 68 Testdateien, 1152/1152 Assertions.

## Status-Legende

- `[ ]` offen
- `[~]` in Arbeit
- `[x]` umgesetzt
- `[!]` blockiert

## Prioritaeten

- `P0`: dringend, hohes Aenderungsrisiko oder zentrale Fachlogik
- `P1`: hoch, relevante Wartbarkeit/Fehleranfaelligkeit
- `P2`: mittel, verbessert Struktur und Testbarkeit

---

## 1. Simulator-Jahreslogik zerlegen

Status: `[x]`

Prioritaet: `P0`

Umsetzungsdokument: `docs/internal/REFACTORING_SIMULATOR_YEAR_LOGIC.md`

Betroffene Dateien:

- `app/simulator/simulator-engine-direct.js`
- ggf. neue Module unter `app/simulator/`
- ggf. `tests/simulator-tax-settlement.test.mjs`
- ggf. `tests/simulator-headless.test.mjs`
- ggf. `tests/simulation.test.mjs`

### Problem

`simulateOneYear()` in `app/simulator/simulator-engine-direct.js` ist mit mehr als 1.100 Zeilen der groesste Produktions-Hotspot. Die Funktion vermischt mehrere Verantwortlichkeiten:

- Jahresrenditen auf Portfolio-Tranchen anwenden
- Ansparphase und Uebergang in die Rentenphase behandeln
- Renten- und Witwenrentenlogik berechnen
- Pflege-/Haushaltskontext in die Simulation einspeisen
- Engine-Input fuer `EngineAPI.simulateSingleYear()` bauen
- 3-Bucket-Logik inklusive Bond-Verkaeufe und Refill anwenden
- Forced-Sale-Steuer-Recompute ausfuehren
- UI-kompatible Rueckgabe- und Logdaten erzeugen

Das macht jede fachliche Aenderung an Rente, Pflege, Steuer, 3-Bucket oder Engine-Vertrag riskant.

### Zielbild

`simulateOneYear()` bleibt als Orchestrator erhalten, delegiert aber klar getrennte Teilaufgaben. Zielgroesse: ca. 150 bis 250 Zeilen fuer den Orchestrator. Fachlogik soll in kleine, DOM-freie und separat testbare Module wandern.

### Besondere Risiken

State-Drilling ist hier das Hauptrisiko. Die Zerlegung darf nicht dazu fuehren, dass ein riesiges `context`-Objekt durch alle Module gereicht und dort beliebig mutiert wird. Stattdessen muessen die Schnittstellen klein und explizit bleiben.

### Schnittstellen-Regeln

- Jede extrahierte Funktion bekommt nur die Daten, die sie wirklich benoetigt.
- Rueckgaben sind klein und zweckgebunden, z. B. `{ nextPortfolio, cashInterest }` statt kompletter Simulations-State.
- Mutationen an Portfolio/State muessen im Funktionsnamen oder per Rueckgabe erkennbar sein.
- Neue Context-Objekte brauchen eine dokumentierte Shape-Beschreibung direkt im Modul.
- Keine Funktion darf gleichzeitig Eingabe-Mapping, Portfolio-Mutation und Log-Building erledigen.
- Vor jeder Extraktion zuerst notieren: Input-Felder, Output-Felder, erlaubte Seiteneffekte.

### Soll-Umsetzung

1. Neues Modul fuer Markt- und Portfoliofortschreibung anlegen, z. B. `app/simulator/simulator-year-portfolio.js`.
2. Ansparphasenlogik aus `simulateOneYear()` extrahieren, z. B. `simulateAccumulationYear(...)`.
3. Renten-/Haushaltsberechnung extrahieren, z. B. `app/simulator/simulator-household-pension.js`.
4. Engine-Input-Mapping extrahieren, z. B. `app/simulator/simulator-engine-input.js`.
5. Forced-Sale- und Settlement-Recompute in ein eigenes Modul auslagern, z. B. `app/simulator/simulator-tax-recompute.js`.
6. 3-Bucket-spezifische Simulator-Anpassungen in ein eigenes Modul verlagern oder konsequent ueber `engine/transactions/three-bucket-logic.mjs` fuehren.
7. Rueckgabe- und Logdatenaufbau in kleine Builder-Funktionen verschieben.
8. Bestehende Exporte aus `simulator-engine-direct.js` kompatibel halten.

### Done-Kriterien

- `simulateOneYear()` enthaelt keine grossen Inline-Bloecke fuer Ansparphase, Rentenlogik, Tax-Recompute oder 3-Bucket mehr.
- Alle neuen Module sind DOM-frei.
- Keine neuen Mega-Context-Objekte ohne dokumentierte Shape und klar begrenzte Mutation.
- Jede extrahierte Funktion hat eine schlanke Signatur oder eine begruendete Context-Signatur.
- Bestehende Tests laufen unveraendert.
- Mindestens ein gezielter Test deckt den extrahierten Tax-Recompute oder 3-Bucket-Pfad ab, falls dabei Logik verschoben wurde.
- Keine Aenderung an `engine.js` ohne expliziten Engine-Build-Auftrag.

### Validierung

- `npm test`
- Bei Aenderung an Engine-Vertraegen zusaetzlich `npm run build:engine`

### Umsetzung dokumentiert

- Datum: 2026-04-24, erste P0-Scheibe umgesetzt
- Commit:
- Geaenderte Module:
  - `app/simulator/simulator-engine-direct.js`
  - `app/simulator/simulator-year-portfolio.js`
  - `app/simulator/simulator-household-pension.js`
  - `app/simulator/simulator-engine-input.js`
  - `app/simulator/simulator-accumulation-year.js`
  - `app/simulator/simulator-tax-recompute.js`
  - `app/simulator/simulator-forced-sale.js`
  - `app/simulator/simulator-bond-refill.js`
  - `app/simulator/simulator-year-result.js`
  - `tests/simulation.test.mjs`
  - `tests/simulator-tax-settlement.test.mjs`
  - `tests/3bucket-refill.test.mjs`
- Was wurde umgesetzt:
  - Markt- und Portfoliofortschreibung aus `simulateOneYear()` extrahiert.
  - Renten-/Haushaltsberechnung inklusive Witwenrente aus `simulateOneYear()` extrahiert.
  - Engine-Input-Mapping fuer `EngineAPI.simulateSingleYear()` aus `simulateOneYear()` extrahiert.
  - Ansparphasen-Jahrespfad inklusive Sparrate, Zins, Rebalancing, Shadow-Pension und Logdaten aus `simulateOneYear()` extrahiert.
  - Tax-Rohaggregat-Aufbau und finales Settlement-Recompute nach Forced-Sale-/Bond-Refill-Pfaden extrahiert.
  - Initiale Forced-Sale-Liquiditaetsdeckung vor Auszahlung extrahiert.
  - Bond-Refill-/3-Bucket-Nachsteuerung fuer gute Jahre extrahiert.
  - Payout-Fallback-Verkauf nach Auszahlung extrahiert.
  - Finaler Rueckgabe-, State- und Logdatenaufbau extrahiert.
  - Direkte Tests fuer die neuen DOM-freien Helfer ergaenzt.
- Welche Tests liefen:
  - `node --check app/simulator/simulator-engine-direct.js` erfolgreich
  - `node --check app/simulator/simulator-forced-sale.js` erfolgreich
  - `node --check app/simulator/simulator-year-result.js` erfolgreich
  - `node tests/run-single.mjs tests/simulation.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/3bucket-refill.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/simulator-headless.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/simulator-tax-settlement.test.mjs` erfolgreich
  - `npm test` erfolgreich, 69 Testdateien, 1217/1217 Assertions
- Offene Restpunkte:
  - Keine offenen P0-Slices innerhalb von `simulateOneYear()`; optional bleibt eine spaetere Gesamt-Review auf weitere Kleinschnitt-Optimierung.

---

## 2. SpendingPlanner in Policy-Module aufteilen

Status: `[x]`

Prioritaet: `P0`

Umsetzungsdokument: `docs/internal/REFACTORING_SPENDING_PLANNER_POLICIES.md`

Betroffene Dateien:

- `engine/planners/SpendingPlanner.mjs`
- ggf. neue Module unter `engine/planners/`
- `tests/spending-planner.test.mjs`
- `tests/spending-quantization.test.mjs`
- `tests/core-engine.test.mjs`
- `tests/vpw-dynamic-flex.test.mjs`

### Problem

`engine/planners/SpendingPlanner.mjs` ist fachlich zentral und enthaelt mehrere Policies in einem Objekt:

- Wealth-adjusted Reduction
- Alarm-Aktivierung und Deeskalation
- Flex-Rate-Berechnung und Glaettung
- Flex-S-Kurve
- Flex-Budget-Cap und Min-Rate
- Final-Rate-Limits
- Recovery-/Caution-Guardrails
- Diagnose- und Result-Aufbau

Die Logik ist durch Tests abgesichert, aber schwer gezielt zu erweitern, weil Aenderungen an einer Policy leicht Nebenwirkungen in anderen Policies erzeugen.

### Zielbild

Der SpendingPlanner wird ein schlanker Orchestrator. Jede Policy wird in einem kleinen Modul berechnet und liefert strukturierte Ergebnisse plus Diagnoseeintraege.

### Soll-Umsetzung

1. Reine Helper zuerst extrahieren:
   `quantizeMonthly`, `smoothstep`, `calcFlexShare`.
2. Wealth-Reduction in `engine/planners/wealth-reduction.mjs` auslagern.
3. Alarm-Policy in `engine/planners/alarm-policy.mjs` auslagern.
4. Flex-Rate-Policy in `engine/planners/flex-rate-policy.mjs` auslagern.
5. Flex-Budget-Policy in `engine/planners/flex-budget-policy.mjs` auslagern.
6. Guardrail-Policy in `engine/planners/spending-guardrails.mjs` auslagern.
7. Diagnose-Aufbau in `engine/planners/spending-diagnosis.mjs` auslagern.
8. `SpendingPlanner.determineSpending()` als Orchestrator stabilisieren.

### Done-Kriterien

- `SpendingPlanner.mjs` enthaelt nur noch Orchestrierung und keine langen Policy-Bloecke.
- Jede Policy-Funktion ist rein oder hat klar dokumentierte State-Mutationen.
- Bestehende Spending-Tests bleiben gruen.
- Tests fuer mindestens eine extrahierte Policy werden hinzugefuegt oder bestehende Tests importieren die Policy direkt.

### Validierung

- `npm test`
- `npm run build:engine`

### Umsetzung dokumentiert

- Datum: 2026-04-26
- Commit:
- Geaenderte Module:
  - `engine/planners/SpendingPlanner.mjs`
  - `engine/planners/alarm-policy.mjs`
  - `engine/planners/final-rate-policy.mjs`
  - `engine/planners/flex-budget-policy.mjs`
  - `engine/planners/flex-rate-policy.mjs`
  - `engine/planners/spending-diagnosis.mjs`
  - `engine/planners/spending-guardrails.mjs`
  - `engine/planners/spending-policy-pipeline.mjs`
  - `engine/planners/spending-policy-helpers.mjs`
  - `engine/planners/wealth-reduction.mjs`
  - `tests/spending-quantization.test.mjs`
  - `tests/spending-planner.test.mjs`
  - `docs/internal/REFACTORING_SPENDING_PLANNER_POLICIES.md`
  - `docs/internal/README.md`
  - `docs/reference/TECHNICAL.md`
  - `engine/README.md`
  - `README.md`
- Was wurde umgesetzt:
  - Reine Helper `quantizeMonthly`, `smoothstep` und `calcFlexShare` nach `spending-policy-helpers.mjs` extrahiert.
  - Bestehende interne Planner-Helper als kompatible Delegates erhalten.
  - Direkte Helper-Tests fuer Quantisierung, S-Kurven-Clamping und Flex-Anteil ergaenzt.
  - Wealth-Reduction-Policy nach `wealth-reduction.mjs` extrahiert.
  - Bestehende interne Wealth-Reduction-Methode als kompatibler Delegate erhalten.
  - Direkte Policy-Tests fuer Safe-/Mid-/Full-Rate, Rentenabzug, S-Kurve und reale Vorjahresentnahme ergaenzt.
  - Alarm-Policy nach `alarm-policy.mjs` extrahiert.
  - Bestehende interne Alarm-Methoden als kompatible Delegates erhalten.
  - Direkte Policy-Tests fuer Peak-/Recovery-Deeskalation und Wealth-Sufficient-Unterdrueckung ergaenzt.
  - Flex-Rate-Policy nach `flex-rate-policy.mjs` extrahiert.
  - Bestehende interne Flex-Rate- und Flex-S-Kurven-Methoden als kompatible Delegates erhalten.
  - Direkte Policy-Tests fuer S-Kurve, Alarmmodus, Bear-Pfad und Planner-Delegate-Paritaet ergaenzt.
  - Flex-Budget-Policy nach `flex-budget-policy.mjs` extrahiert.
  - Bestehende interne Flex-Budget-Methode als kompatibler Delegate erhalten.
  - Direkte Policy-Tests fuer Cap, Topfverbrauch, Recharge, Min-Rate und Planner-Delegate-Paritaet ergaenzt.
  - Guardrail-Policy nach `spending-guardrails.mjs` extrahiert.
  - Bestehende interne Guardrail-Methode als kompatibler Delegate erhalten.
  - Direkte Policy-Tests fuer Recovery-Cap, Caution-Inflationscap, Budget-Floor und Planner-Delegate-Paritaet ergaenzt.
  - Diagnose-Aufbau nach `spending-diagnosis.mjs` extrahiert.
  - Bestehende interne Diagnose- und Runway-Ziel-Methoden als kompatible Delegates erhalten.
  - Direkte Diagnose-Tests fuer oeffentlichen Shape, Guardrail-Diagnosen, Key-Parameter und Runway-Ziel ergaenzt.
  - Finale Rate-Limits nach `final-rate-policy.mjs` extrahiert.
  - Guardrails, Flex-Budget und finale Rate-Limits in `spending-policy-pipeline.mjs` gebuendelt.
  - Finale Entnahme- und effektive Flex-Rate-Berechnung als Helper `calculateFinalWithdrawal()` gekapselt.
  - `SpendingPlanner.determineSpending()` als schlanker Orchestrator stabilisiert.
  - Direkte Tests fuer Final-Rate-Policy, Policy-Pipeline und finale Entnahme inklusive Delegate-Paritaet ergaenzt.
- Welche Tests liefen:
  - Vor Step 2: `npm test` erfolgreich, 69 Testdateien, 1224/1224 Assertions
  - `node --check engine/planners/SpendingPlanner.mjs` erfolgreich
  - `node --check engine/planners/alarm-policy.mjs` erfolgreich
  - `node --check engine/planners/final-rate-policy.mjs` erfolgreich
  - `node --check engine/planners/flex-budget-policy.mjs` erfolgreich
  - `node --check engine/planners/flex-rate-policy.mjs` erfolgreich
  - `node --check engine/planners/spending-diagnosis.mjs` erfolgreich
  - `node --check engine/planners/spending-guardrails.mjs` erfolgreich
  - `node --check engine/planners/spending-policy-pipeline.mjs` erfolgreich
  - `node --check engine/planners/wealth-reduction.mjs` erfolgreich
  - `node tests/run-single.mjs tests/spending-planner.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/spending-quantization.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/core-engine.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/vpw-dynamic-flex.test.mjs` erfolgreich
  - `npm run build:engine` erfolgreich, Fallback-Build ohne esbuild
  - `npm test` erfolgreich, 69 Testdateien, 1224/1224 Assertions
- Offene Restpunkte:
  - Keine.

---

## 3. Monte-Carlo-Runner entflechten

Status: `[x]`

Prioritaet: `P0`

Umsetzungsdokument: `docs/internal/REFACTORING_MONTE_CARLO_RUNNER.md`

Betroffene Dateien:

- `app/simulator/monte-carlo-runner.js`
- `app/simulator/monte-carlo-runner-utils.js`
- `app/simulator/monte-carlo-aggregates.js`
- ggf. neue Module unter `app/simulator/`
- `workers/mc-worker.js`
- `tests/simulator-monte-carlo.test.mjs`
- `tests/worker-parity.test.mjs`

### Problem

`runMonteCarloChunk()` verwaltet zu viele Verantwortlichkeiten:

- Startjahr-Sampling und CAPE-Sampling
- Run-State-Initialisierung
- Sterblichkeit P1/P2
- Pflege-Trigger, Pflegekosten und Pflege-KPIs
- Witwenrente
- Stress-Metriken
- Heatmap-Daten
- Worst-Run-Auswahl
- Logzeilen fuer Ruin, Normalfall und Tod beider Personen
- Aggregatlisten und Typed Arrays

Die Logdaten fuer Ruin, Normalfall und Todesfall enthalten wiederholte Feldsets, was bei neuen Logspalten schnell zu Inkonsistenzen fuehrt.

### Zielbild

Der Runner soll die Monte-Carlo-Schleife steuern, aber Lebensereignisse, Logging und Metriken delegieren.

### Besondere Risiken

Performance ist hier ein Gate, kein nachgelagerter Optimierungswunsch. Die innere Monte-Carlo-Schleife darf nicht durch zu viele kleinteilige Funktionsaufrufe, unnoetige Objektallokationen oder Log-Builder im Hot Path verlangsamt werden.

### Performance-Regeln

- Extraktionen im Hot Path muessen grobgranular bleiben.
- Log-Builder duerfen nur laufen, wenn fuer den Run tatsaechlich Logging aktiv ist.
- Keine neuen Objektallokationen pro Jahr, wenn einfache lokale Variablen oder wiederverwendbare Tracker reichen.
- Hilfsfunktionen, die pro Simulationsjahr laufen, muessen klein, rein und V8-freundlich bleiben.
- Vorher/Nachher-Benchmark ist Pflicht.

### Soll-Umsetzung

1. Run-Kontext-Erzeugung extrahieren, z. B. `mc-run-context.js`.
2. Startjahr-/CAPE-Sampling in eigenes Modul verschieben, z. B. `mc-year-sampling.js`.
3. Pflege- und Sterblichkeitslogik in `mc-life-events.js` oder `mc-care-events.js` auslagern.
4. Stress-Metriken in `mc-stress-tracker.js` kapseln.
5. Logzeilen-Erstellung in `mc-log-builder.js` vereinheitlichen.
6. KPI- und Listen-Fortschreibung in `mc-run-metrics.js` kapseln.
7. Worker-Payloads unveraendert halten oder Migration in Worker-Paritaetstests absichern.

### Done-Kriterien

- `runMonteCarloChunk()` bleibt deterministisch.
- Keine Duplikation der Pflege-/Alive-/VPW-Logfelder in mehreren Inline-Objekten.
- Worker- und serieller Lauf bleiben parity-kompatibel.
- Bestehende `runMeta`- und Worst-Run-Strukturen bleiben kompatibel.
- Performance-Benchmark: Laufzeit fuer einen definierten 10.000-Run-Benchmark darf gegenueber der Baseline maximal 5% langsamer werden. Wenn die Abweichung groesser ist, muss entweder optimiert oder die Abweichung mit Messdaten begruendet und akzeptiert werden.

### Validierung

- `npm test`
- Performance-Benchmark mit dokumentierter Baseline und Nachher-Wert.
- Fokus bei Bedarf:
  - `node tests/run-single.mjs simulator-monte-carlo.test.mjs`
  - `node tests/run-single.mjs worker-parity.test.mjs`
  - `node tests/run-single.mjs care-meta.test.mjs`

### Umsetzung dokumentiert

- Datum: 2026-04-25, Step 1 abgeschlossen
- Commit:
- Geaenderte Module:
  - `app/simulator/monte-carlo-runner.js`
  - `app/simulator/mc-run-context.js`
  - `app/simulator/mc-year-sampling.js`
  - `app/simulator/mc-life-events.js`
  - `app/simulator/mc-stress-tracker.js`
  - `app/simulator/mc-log-builder.js`
  - `app/simulator/mc-run-metrics.js`
  - `tests/monte-carlo-startyear.test.mjs`
  - `tests/simulator-monte-carlo.test.mjs`
  - `tests/care-meta.test.mjs`
  - `docs/internal/REFACTORING_MONTE_CARLO_RUNNER.md`
  - `docs/internal/README.md`
  - `docs/reference/SIMULATOR_MODULES_README.md`
  - `docs/reference/TECHNICAL.md`
- Was wurde umgesetzt:
  - Run-Kontext-Erzeugung nach `mc-run-context.js` extrahiert.
  - Kontext umfasst RunRange, RNG-Modus, Legacy-RNG, Stress-Master, Buffers, Progress-Intervall, LogIndexSet und Sampling-Konfiguration.
  - Sampling-Algorithmen und innere Jahreslogik bleiben unveraendert im Runner.
  - Direkte Tests fuer Kontext-Erzeugung und Legacy-Stream-Chunking-Fehler ergaenzt.
  - Startjahr-/CAPE-Sampling nach `mc-year-sampling.js` extrahiert.
  - Bestehende Startjahr-Helper bleiben ueber `monte-carlo-runner.js` kompatibel re-exportiert.
  - Direkte Tests fuer FILTER, RECENCY, UNIFORM, Estimated-History-Filter, CAPE-Sampling und No-CAPE-Fallback ergaenzt.
  - Life-State-Initialisierung nach `mc-life-events.js` extrahiert.
  - `runMonteCarloChunk()` nutzt den Life-State fuer Care-Meta, Partnerstatus, Care-RNGs, Alive-Initialwerte und HouseholdContext.
  - Die per-year Pflege-/Sterblichkeitslogik bleibt bewusst lokal im Runner, weil die vollstaendige Jahreslogik-Extraktion im Benchmark das 5%-Gate verletzt hat.
  - Direkter Life-Events-Test fuer den Single-Person-Mortality-Pfad ergaenzt.
  - Stress-Metriken nach `mc-stress-tracker.js` extrahiert.
  - Stress-Tracker kapselt Run-Initialisierung, Jahresfortschreibung und finale Schreibung der bestehenden Stress-Buffer.
  - No-Stress-Pfad vermeidet zusaetzliche Portfolio-Bewertung pro Jahr.
  - Direkter Stress-Tracker-Test fuer Drawdown, Quote-Above-4.5, Cut-Years, Real-CaR und Recovery-Years ergaenzt.
  - Logzeilen-Erstellung nach `mc-log-builder.js` extrahiert.
  - Ruin-, Jahres- und Todesfall-Logs nutzen zentrale Builder fuer Alive-, Partner-, P1-/P2-Care- und Legacy-Pflegefelder.
  - Builder werden nur bei aktivem Run-Logging aufgerufen.
  - Direkte Log-Builder-Tests fuer Ruin-, Jahres- und Todesfall-Logs ergaenzt.
  - KPI- und Listen-Fortschreibung nach `mc-run-metrics.js` extrahiert.
  - Run-Ende-Fortschreibung fuer Ergebnisbuffer, Pflege-Listen, Safety-Run-Zaehler, Worst-Run-Auswahl und `runMeta` ist gekapselt.
  - `totals`, `lists`, Worst-Runs, `allRealWithdrawalsSample` und `runMeta` werden ueber `finalizeMonteCarloRunMetrics()` gebaut.
  - Direkte Run-Metrics-Tests fuer Buffer-Schreibung, Care-Listen, Safety-Zaehler, `runMeta` und Worst-Run-Auswahl ergaenzt.
- Welche Tests liefen:
  - `node --check app/simulator/monte-carlo-runner.js` erfolgreich
  - `node --check app/simulator/mc-run-context.js` erfolgreich
  - `node --check app/simulator/mc-year-sampling.js` erfolgreich
  - `node --check app/simulator/mc-life-events.js` erfolgreich
  - `node --check app/simulator/mc-stress-tracker.js` erfolgreich
  - `node --check app/simulator/mc-log-builder.js` erfolgreich
  - `node --check app/simulator/mc-run-metrics.js` erfolgreich
  - `node tests/run-single.mjs tests/monte-carlo-startyear.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/monte-carlo-sampling.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/worker-parity.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/care-meta.test.mjs` erfolgreich
  - Benchmark 10.000 Runs / `maxDauer=2`: 1432 ms vor Step 1, 1493 ms nach Step 1, +4,27%
  - Benchmark 10.000 Runs / `maxDauer=2`: 1493 ms vor Step 2, 1437 ms nach Step 2, -3,72%
  - Benchmark 10.000 Runs / `maxDauer=2`: Step-3-Messreihe 1836 ms, 1224 ms, 1219 ms; warmgelaufene Laeufe -14,84% und -15,17% gegen Step-2-Baseline
  - Benchmark 10.000 Runs / `maxDauer=2`: Step-4-Messreihe 1865 ms, 1206 ms, 1228 ms; warmgelaufene Laeufe -16,09% und -14,55% gegen Step-2-Baseline
  - Benchmark 10.000 Runs / `maxDauer=2`: Step-5-Messreihe 1858 ms, 1244 ms, 1267 ms; warmgelaufene Laeufe -13,42% und -11,86% gegen Step-2-Baseline
  - Benchmark 10.000 Runs / `maxDauer=2`: Step-6-Messreihe 1565 ms, 953 ms, 945 ms; warmgelaufene Laeufe -33,68% und -34,23% gegen Step-2-Baseline
  - `npm test` erfolgreich, 69 Testdateien, 1256/1256 Assertions
- Bewusst zurueckgestellt:
  - Vollstaendige Pflege-/Sterblichkeits-Jahreslogik nicht weiter im aktuellen Block auslagern. Die Initialisierung ist in `mc-life-events.js` extrahiert, die per-year-Logik bleibt wegen Benchmark-Risiko im Runner-Hot-Path. Eine spaetere Extraktion braucht einen eigenen Performance-Schnitt ohne zusaetzliche Objektallokationen pro Jahr.

---

## 4. Auto-Optimize UI trennen

Status: `[x]`

Prioritaet: `P1`

Umsetzungsdokument: `docs/internal/REFACTORING_AUTO_OPTIMIZE_UI.md`

Betroffene Dateien:

- `app/simulator/auto_optimize_ui.js`
- ggf. neue Module unter `app/simulator/`
- `tests/auto-optimizer.test.mjs`

### Problem

`auto_optimize_ui.js` mischt:

- Preset-Definitionen
- DOM-Event-Wiring
- dynamische Parameter-UI
- Config-Parsing und Validierung
- Progress-Texte
- Ergebnis-HTML inklusive Inline-Styles
- Apply-Logik fuer Champion-Parameter

Dadurch ist das Feature schwer visuell oder fachlich zu aendern, obwohl der Optimizer-Kern bereits gut separiert ist.

### Zielbild

Das UI-Modul wird eine Fassade. Presets, Config-Lesen, Rendering und Apply-Logik werden getrennt.

### Soll-Umsetzung

1. Presets nach `app/simulator/auto-optimize-presets.js` verschieben.
2. Parameter-Key-Metadaten nach `app/simulator/auto-optimize-param-meta.js` verschieben.
3. Config-Lesen und Validierung nach `app/simulator/auto-optimize-config-ui.js` verschieben.
4. Ergebnis-Rendering nach `app/simulator/auto-optimize-renderer.js` verschieben.
5. Apply-Logik nach `app/simulator/auto-optimize-apply.js` verschieben.
6. Inline-Styles in CSS-Klassen ueberfuehren, falls der Scope UI-Polish erlaubt.

### Done-Kriterien

- `auto_optimize_ui.js` enthaelt hauptsaechlich Initialisierung und Event-Wiring.
- Presets sind ohne DOM importierbar und testbar.
- Config-Parser kann mit DOM-Mocks separat getestet werden.
- Ergebnisrenderer erzeugt dieselben sichtbaren Informationen wie vorher.

### Validierung

- `npm test`
- Optional gezielt: `node tests/run-single.mjs auto-optimizer.test.mjs`

### Umsetzung dokumentiert

- Datum: 2026-04-24
- Commit: noch nicht erstellt
- Geaenderte Module:
  - `app/simulator/auto_optimize_ui.js`
  - `app/simulator/auto-optimize-presets.js`
  - `app/simulator/auto-optimize-param-meta.js`
  - `app/simulator/auto-optimize-config-ui.js`
  - `app/simulator/auto-optimize-renderer.js`
  - `app/simulator/auto-optimize-apply.js`
  - `tests/auto-optimizer.test.mjs`
  - `docs/internal/REFACTORING_AUTO_OPTIMIZE_UI.md`
  - `docs/reference/TECHNICAL.md`
  - `docs/reference/SIMULATOR_MODULES_README.md`
- Was wurde umgesetzt:
  - `auto_optimize_ui.js` zur Fassade fuer Initialisierung, Event-Wiring, Run-Flow und Parameter-Management reduziert.
  - Presets nach `auto-optimize-presets.js` verschoben.
  - Parameter-Optionen, Labels, Units, Dynamic-Flex-Keys und Apply-Mapping nach `auto-optimize-param-meta.js` verschoben.
  - Config-Lesen und Validierung nach `auto-optimize-config-ui.js` verschoben.
  - Parameterblock-, Progress-, Ergebnis- und Apply-Erfolgsmeldungs-Rendering nach `auto-optimize-renderer.js` verschoben.
  - Champion-Apply-Logik nach `auto-optimize-apply.js` verschoben.
- Welche Tests liefen:
  - `node tests/run-single.mjs tests/auto-optimizer.test.mjs` erfolgreich
  - `npm test` erfolgreich, 69 Testdateien, 1186/1186 Assertions
- Offene Restpunkte:
  - Keine.

---

## 5. Balance-Ausgaben-Check modularisieren

Status: `[x]`

Prioritaet: `P1`

Umsetzungsdokument: `docs/internal/REFACTORING_BALANCE_EXPENSES.md`

Betroffene Dateien:

- `app/balance/balance-expenses.js`
- ggf. neue Module unter `app/balance/`
- `tests/balance-expenses.test.mjs`

### Problem

`balance-expenses.js` ist ein Mini-Monolith. Es enthaelt:

- localStorage-Schema und Store-Zugriffe
- CSV-Delimiter-Erkennung und Parsing
- Betragsnormalisierung
- Jahresstatistiken und Forecast-Logik
- Tabellenaufbau
- Detaildialog
- Event-Handling

Die fachliche Logik ist gut abgrenzbar, aber derzeit eng mit DOM und globalem Modul-State verbunden.

### Zielbild

Storage, CSV, Metriken und Rendering werden getrennt. Die Hauptdatei initialisiert nur noch den Tab und verbindet Events.

### Soll-Umsetzung

1. Storage-Funktionen nach `balance-expenses-storage.js` verschieben.
2. CSV-Parser nach `balance-expenses-csv.js` verschieben.
3. Statistikfunktionen nach `balance-expenses-metrics.js` verschieben.
4. DOM-Rendering nach `balance-expenses-renderer.js` verschieben.
5. Event-Wiring in `balance-expenses.js` belassen oder in `balance-expenses-controller.js` auslagern.
6. Bestehende Tests an neue reine Module anpassen.

### Done-Kriterien

- CSV-Parsing und Metriken sind ohne DOM/localStorage testbar.
- `balance-expenses.js` enthaelt keine langen Tabellen-/Dialog-Bau-Bloecke mehr.
- Persistenzschema `balance_expenses_v1` bleibt kompatibel.

### Validierung

- `npm test`
- Optional gezielt: `node tests/run-single.mjs balance-expenses.test.mjs`

### Umsetzung dokumentiert

- Datum: 2026-04-24
- Commit: noch nicht erstellt
- Geaenderte Module:
  - `app/balance/balance-expenses.js`
  - `app/balance/balance-expenses-storage.js`
  - `app/balance/balance-expenses-csv.js`
  - `app/balance/balance-expenses-metrics.js`
  - `app/balance/balance-expenses-renderer.js`
  - `tests/balance-expenses.test.mjs`
  - `docs/reference/TECHNICAL.md`
  - `docs/reference/BALANCE_MODULES_README.md`
- Was wurde umgesetzt:
  - `balance-expenses.js` zur Controller-Fassade fuer Initialisierung, Event-Wiring und oeffentliche Exporte reduziert.
  - localStorage-Zugriffe und Schema-Helfer in `balance-expenses-storage.js` verschoben.
  - CSV-Delimiter-Erkennung, Zeilen-Splitting und Betragsnormalisierung in `balance-expenses-csv.js` verschoben.
  - Ausgaben-, Median-, Monats- und Jahreskennzahlen in `balance-expenses-metrics.js` verschoben.
  - Tabellen-, Summary-, Year-Select- und Detaildialog-Rendering in `balance-expenses-renderer.js` verschoben.
  - Bestehendes Persistenzschema `balance_expenses_v1` beibehalten.
- Welche Tests liefen:
  - `node tests/run-single.mjs tests/balance-expenses.test.mjs` erfolgreich
  - `npm test` erfolgreich, 69 Testdateien, 1177/1177 Assertions
- Offene Restpunkte:
  - Keine.

---

## 6. Simulator-Input-Layer gruppieren

Status: `[x]`

Prioritaet: `P1`

Umsetzungsdokument: `docs/internal/REFACTORING_SIMULATOR_INPUT_LAYER.md`

Betroffene Dateien:

- `app/simulator/simulator-portfolio-inputs.js`
- ggf. neue Module unter `app/simulator/`
- `tests/simulator-3bucket-ui-e2e.test.mjs`
- `tests/simulator-dynamic-flex-persistence.test.mjs`
- ggf. neue Input-Parser-Tests

### Problem

`getCommonInputs()` liest sehr viele DOM-Felder direkt in einer langen Funktion. Enthalten sind u. a.:

- Tranchen-Override aus Profilverbund
- Gold-Konfiguration
- Renten und Partnerdaten
- Witwenrente
- Pflegegrade
- Dynamic-Flex
- CAPE
- 3-Bucket-Decumulation
- Strategieparameter
- Ansparphase

Neue Felder erhoehen die Gefahr von Seiteneffekten und versteckten Legacy-Abhaengigkeiten.

### Zielbild

Der Input-Layer besteht aus klaren Reader-Funktionen pro Fachgruppe. `getCommonInputs()` fuehrt nur noch die Gruppen zusammen.

### Soll-Umsetzung

1. Gemeinsame DOM-Parser-Helfer einfuehren, z. B. `readNumber`, `readBool`, `readSelect`.
2. `readTrancheInputs()` extrahieren.
3. `readPensionInputs()` und `readPartnerInputs()` extrahieren.
4. `readWidowOptions()` extrahieren.
5. `readCareInputs()` extrahieren.
6. `readDynamicFlexInputs()` extrahieren.
7. `readDecumulationInputs()` extrahieren.
8. `readStrategyInputs()` und `readAccumulationInputs()` extrahieren.

### Done-Kriterien

- Jede Fachgruppe ist separat testbar.
- Legacy-Fallbacks sind dokumentiert und bleiben erhalten.
- `getCommonInputs()` hat nur noch Aggregationslogik.
- Keine Aenderung am finalen Input-Shape ohne explizite Migration.

### Validierung

- `npm test`
- Fokus bei Bedarf:
  - `node tests/run-single.mjs simulator-3bucket-ui-e2e.test.mjs`
  - `node tests/run-single.mjs simulator-dynamic-flex-persistence.test.mjs`

### Umsetzung dokumentiert

- Datum: 2026-04-23
- Commit: noch nicht erstellt
- Geaenderte Module:
  - `app/simulator/simulator-portfolio-inputs.js`
  - `app/simulator/simulator-input-dom.js`
  - `app/simulator/simulator-input-tranches.js`
  - `app/simulator/simulator-input-pension.js`
  - `app/simulator/simulator-input-care.js`
  - `app/simulator/simulator-input-strategy.js`
  - `tests/simulator-input-readers.test.mjs`
- Was wurde umgesetzt:
  - `getCommonInputs()` zur Aggregator-Fassade umgebaut.
  - DOM-Parsing und Fachgruppen-Reader getrennt.
  - Legacy-Fallbacks, Tranche-Prioritaet, Dynamic-Flex-Bounds und 3-Bucket-Normalisierung abgesichert.
- Welche Tests liefen:
  - `node tests/run-single.mjs tests/simulator-input-readers.test.mjs`
  - `node tests/run-single.mjs tests/portfolio.test.mjs`
  - `node tests/run-single.mjs tests/simulator-3bucket-ui-e2e.test.mjs`
  - `node tests/run-single.mjs tests/simulator-dynamic-flex-persistence.test.mjs`
  - `npm test` erfolgreich, 69 Testdateien, 1177/1177 Assertions
- Offene Restpunkte:
  - Keine.

---

## 7. Balance-Update-Pipeline entlasten

Status: `[x]`

Prioritaet: `P1`

Umsetzungsdokument: `docs/internal/REFACTORING_BALANCE_UPDATE_PIPELINE.md`

Betroffene Dateien:

- `app/balance/balance-main.js`
- `app/balance/balance-main-profilverbund.js`
- ggf. neues Modul `app/balance/balance-action-postprocessor.js`
- `tests/balance-smoke.test.mjs`
- `tests/balance-decumulation.test.mjs`
- `tests/profilverbund-balance.test.mjs`

### Problem

`balance-main.js` ist nicht extrem gross, aber `update()` ist fachlich stark beladen:

- Profilwerte synchronisieren
- Inputs lesen
- Profilverbund vorbereiten
- Guardrail-State resetten
- Engine aufrufen
- Profilverbund-Actions mergen
- 3-Bucket anwenden
- Renderer-Daten zusammenbauen
- Storage aktualisieren

Die 3-Bucket-Integration im Update-Pfad macht die Pipeline schwerer nachvollziehbar.

### Zielbild

`update()` wird zur klaren Pipeline: `read -> prepare -> simulate -> postprocess -> render -> persist`.

### Soll-Umsetzung

1. Engine-Call-Vorbereitung in eine kleine Funktion auslagern.
2. Profilverbund-Merge als Postprocessing-Schritt modellieren.
3. 3-Bucket-Postprocessing in eigenes Modul verschieben.
4. Renderer-Payload-Building aus `update()` herausziehen.
5. Bestehendes Verhalten bei Ein-Personen- und Mehr-Profil-Szenarien absichern.

### Done-Kriterien

- `update()` ist kurz und in benannte Schritte gegliedert.
- 3-Bucket-Logik ist nicht mehr inline in `balance-main.js`.
- Profilverbund- und Single-Profil-Pfade bleiben testbar getrennt.

### Validierung

- `npm test`
- Optional gezielt:
  - `node tests/run-single.mjs balance-smoke.test.mjs`
  - `node tests/run-single.mjs balance-decumulation.test.mjs`
  - `node tests/run-single.mjs profilverbund-balance.test.mjs`

### Umsetzung dokumentiert

- Datum: 2026-04-24
- Commit: noch nicht erstellt
- Geaenderte Module:
  - `app/balance/balance-main.js`
  - `app/balance/balance-update-pipeline.js`
  - `app/balance/balance-action-postprocessor.js`
  - `tests/balance-decumulation.test.mjs`
  - `docs/internal/REFACTORING_BALANCE_UPDATE_PIPELINE.md`
  - `docs/reference/TECHNICAL.md`
  - `docs/reference/BALANCE_MODULES_README.md`
- Was wurde umgesetzt:
  - Engine-Last-State-Vorbereitung in `prepareEngineLastState()` verschoben.
  - Profilverbund-Merge und Single-3-Bucket-Postprocessing in `postprocessBalanceAction()` verschoben.
  - Renderer-Payload und Diagnose-Anreicherung in Pipeline-Helfer verschoben.
  - Single-/Profilverbund-Persistenz in `persistBalanceUpdate()` benannt.
  - Ausgabenbudget-Berechnung in `calculateExpensesBudget()` verschoben.
- Welche Tests liefen:
  - `node tests/run-single.mjs tests/balance-decumulation.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/balance-smoke.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/profilverbund-balance.test.mjs` erfolgreich
  - `npm test` erfolgreich, 69 Testdateien, 1196/1196 Assertions
- Offene Restpunkte:
  - Keine.

---

## 8. Profile Storage in Registry, Key-Policy und Import/Export trennen

Status: `[x]`

Prioritaet: `P2`

Betroffene Dateien:

- `app/profile/profile-storage.js`
- `app/profile/profile-state.js`
- ggf. neue Module unter `app/profile/`
- `tests/profile-storage.test.mjs`
- `tests/profile-state.test.mjs`

### Problem

`profile-storage.js` enthaelt mehrere Schichten gleichzeitig:

- Profil-Registry CRUD
- profilbezogene Key-Erkennung
- Live-localStorage Snapshotting
- Profilwechsel
- Bootstrap-Verhalten
- Bundle Export/Import
- `window.name` Transfer fuer Tauri/WebView-Sonderfall

Persistenz ist ein sensibler Bereich. Die Logik ist getestet, aber neue Profil-Features koennen schnell bestehende Datenvertraege brechen.

Dieser Bereich wurde zuletzt wegen Tauri-/WebView- und `window.name`-Handoff-Themen stabilisiert. Deshalb ist das Refactoring bewusst niedriger priorisiert und sollte erst erfolgen, wenn die hoeher priorisierten, weniger persistenzkritischen Strukturrefactorings abgeschlossen sind oder wenn ein konkreter Profil-/Storage-Change es erzwingt.

### Zielbild

Klare Trennung:

- Key-Policy: Welche Keys gehoeren zu Profilen?
- Registry: Profile anlegen, umbenennen, loeschen, Metadaten.
- Live-Snapshot: localStorage sichern/laden.
- Import/Export: Bundle-Format und window.name-Transfer.

### Soll-Umsetzung

1. Key-Erkennung und `listProfileScopedKeys()` in `profile-key-policy.js` verschieben.
2. Registry-CRUD in `profile-registry.js` verschieben.
3. Capture/Clear/Load localStorage in `profile-live-storage.js` verschieben.
4. Import/Export in `profile-bundle-io.js` verschieben.
5. `profile-storage.js` als kompatible Fassade erhalten.
6. Tests schrittweise auf die neuen Module erweitern.

### Done-Kriterien

- Exporte aus `profile-storage.js` bleiben kompatibel.
- Key-Policy ist separat getestet.
- Bundle-Import/Export bleibt rueckwaertskompatibel.
- Kein Verlust profilbezogener Daten bei Profilwechsel.

### Validierung

- `npm test`
- Optional gezielt:
  - `node tests/run-single.mjs profile-storage.test.mjs`
  - `node tests/run-single.mjs profile-state.test.mjs`

### Umsetzung dokumentiert

- Datum:
- Commit:
- Geaenderte Module:
  - `app/profile/profile-storage.js`
  - `app/profile/profile-key-policy.js`
  - `app/profile/profile-registry.js`
  - `app/profile/profile-live-storage.js`
  - `app/profile/profile-bundle-io.js`
  - `tests/profile-storage.test.mjs`
  - `docs/internal/REFACTORING_PROFILE_STORAGE.md`
- Was wurde umgesetzt:
  - Key-Erkennung und `listProfileScopedKeys()` nach `profile-key-policy.js` verschoben.
  - `profile-storage.js` bleibt kompatible Fassade und nutzt die ausgelagerte Key-Policy fuer Snapshot, Clear, Load und Live-Data-Erkennung.
  - Direkte Tests fuer profilbezogene Keys (`sim_`, `sim.`, Balance-State) und globale Nicht-Profil-Keys ergaenzt.
  - Registry-Parsing, Default-Profil-Erzeugung, Current-Profile-Key, Profil-CRUD, Verbundmitgliedschaft und Profildaten-Merge nach `profile-registry.js` verschoben.
  - `profile-storage.js` delegiert Registry-CRUD und bleibt Orchestrator fuer Live-localStorage, Profilwechsel und Bundle-IO.
  - Direkte Registry-Tests fuer Default-Erzeugung per Capture-Callback, Slug-Erzeugung, Data-Merge und Profil-Liste ergaenzt.
  - Live-localStorage-Snapshotting, Clear, Load und Live-Data-Erkennung nach `profile-live-storage.js` verschoben.
  - `profile-storage.js` nutzt Live-Storage fuer Default-Snapshot, Profilwechsel, Import-Load und Bootstrap-Erkennung weiter als Fassade.
  - Direkte Live-Storage-Tests fuer Snapshot, Clear, Load, Null-Skip und Erhalt globaler Keys ergaenzt.
  - Bundle-Erstellung, Bundle-Import und `window.name`-Transfer nach `profile-bundle-io.js` verschoben.
  - `profile-storage.js` delegiert Bundle-IO und liefert Save-/Load-Callbacks fuer kompatibles Fassadenverhalten.
  - Direkte Bundle-IO-Tests fuer Save-Callback, Registry-/Globals-Export, `window.name`-Prefix, Import-Load-Callback und Globals-Restore ergaenzt.
- Welche Tests liefen:
  - `node --check app/profile/profile-storage.js` erfolgreich
  - `node --check app/profile/profile-key-policy.js` erfolgreich
  - `node --check app/profile/profile-registry.js` erfolgreich
  - `node --check app/profile/profile-live-storage.js` erfolgreich
  - `node --check app/profile/profile-bundle-io.js` erfolgreich
  - `node tests/run-single.mjs tests/profile-storage.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/profile-state.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/profile-navigation.test.mjs` erfolgreich
  - `npm test` erfolgreich, 69 Testdateien, 1290/1290 Assertions
- Offene Restpunkte:
  - Keine.

---

## Querschnittsregeln fuer alle Refactorings

### Arbeitsregeln

- Immer in Quellmodulen arbeiten, nicht direkt in `engine.js`, `dist/` oder `RuheStandSuite.exe`.
- Refactorings klein schneiden und nach jedem groesseren Schritt testen.
- Oeffentliche Datenformen und localStorage-Schluessel nur bewusst und dokumentiert aendern.
- Legacy-Fallbacks erst entfernen, wenn Migration und Tests explizit abgesichert sind.
- Bei Engine-Aenderungen `npm run build:engine` ausfuehren.
- Bei Worker-/Runner-Aenderungen Worker-Paritaet testen.
- Bei P0-Refactorings zuerst eine Baseline notieren: relevante Tests, ggf. Performance-Wert, zentrale Input-/Output-Vertraege.
- Keine grossen Context-Objekte einfuehren, nur um Funktionssignaturen kuenstlich kurz zu halten.
- Wenn ein Context-Objekt sinnvoll ist, muss es read-only behandelt oder seine Mutation explizit dokumentiert werden.
- Hot-Path-Code im Monte-Carlo-Runner nur nach Benchmark-Vergleich refaktorieren.

### Abschlussnotiz je Step

Nach der Umsetzung eines Steps den jeweiligen Abschnitt oben aktualisieren:

- Status auf `[x]` setzen.
- Datum und Commit eintragen.
- Kurz beschreiben, welche Module verschoben oder neu angelegt wurden.
- Tests mit Ergebnis eintragen.
- Restpunkte oder bewusst aufgeschobene Folgearbeiten nennen.

### Empfohlene Abarbeitungsreihenfolge

1. Profile Storage trennen.

Begruendung: Die anderen Backlog-Bloecke sind umgesetzt oder bewusst abgeschlossen. Profile Storage bleibt zuletzt, weil der Bereich aktuell stabil und persistenzkritisch ist.
