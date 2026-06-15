# Arbeitsdokument: Fat-Tail- und Crash-Modell ergaenzen

**Stand:** 2026-06-14  
**Status:** Ueberarbeitet nach Review, erneute Pruefung ausstehend  
**Autor:** Codex  
**Verbesserungspunkt:** 4 - Fat-Tail-/Crash-Modell explizit ergaenzen  
**Geplanter Feature-Branch:** `codex/fat-tail-crash-modell`  
**GitHub-Status:** Noch nicht veroeffentlicht; vor Umsetzung Freigabe und Branch-Anlage erforderlich.

## Einordnung in Roadmap

Dieses Arbeitsdokument ist Schritt 5 der freigegebenen Roadmap `docs/internal/ROADMAP_ENGINE_STOCHASTIK_VERBESSERUNGEN.md`.

Rolle in der Roadmap:

- Letztes optionales Stress-Overlay nach stabiler Engine-Semantik und stabiler Pfadgenerierung.
- Baut auf Baseline-Freeze und Sampling-Freeze auf.
- Darf Standardlaeufe nicht still pessimistischer oder optimistischer machen.

Startvoraussetzungen:

- Gate 1 `Baseline-Freeze Engine-Semantik` ist abgeschlossen.
- Gate 2 `Sampling-Freeze` ist abgeschlossen.
- Stationary Bootstrap ist validiert oder bewusst fuer erste Fat-Tail-Slices deaktiviert.
- Eigener Feature-Branch gemaess Projektregeln.

Abschlussgate der Roadmap:

- Overlay ist optional und per Konfiguration deaktivierbar.
- Keine additiven Crash-Schocks auf bereits klassifizierte historische Krisenjahre ohne explizite Deckelung.
- Seed-Verhalten bleibt reproduzierbar.
- UI/Logs unterscheiden klar zwischen historischem Pfad, Bootstrap-Sampling und Fat-Tail-Overlay.

## Ziel

Der Simulator soll seltene Extremereignisse expliziter modellieren koennen, statt sie nur indirekt aus historischen Sequenzen zu ziehen. Das soll Ruhestandsrisiken robuster sichtbar machen: tiefe Crashs, Inflationsschocks, lange Seitwaertsphasen und kombinierte Stressjahre.

Die Funktion soll optional sein und Standardlaeufe nicht still pessimistischer oder optimistischer machen.

## Ausgangslage

Relevante Bereiche:

- `app/simulator/simulator-portfolio-stress.js`: Stress-/Preset-nahe Logik.
- `app/simulator/monte-carlo-runner.js`: Jahresloop und Marktjahre.
- `app/simulator/mc-run-context.js`: Run-Kontext und Sampling-Konfiguration.
- `app/simulator/mc-stress-tracker.js`: Stress-Metriken.
- `app/simulator/results-metrics.js` und `simulator-results.js`: Ergebnis-KPIs.
- `Simulator.html`: UI fuer MC/Stress.
- Tests: `care-meta`, `simulator-monte-carlo`, `scenarios`, `worker-parity`.

Die Doku nennt "Keine expliziten Fat Tails im Return-Modell" als bekannte Einschraenkung.

## Fachlicher Vorschlag

Ein optionales Tail-Overlay wird nach Auswahl eines historischen Jahres angewandt. Es veraendert einzelne Jahresrenditen/-inflation nach klaren Regeln:

- Crash-Return-Schock, z. B. Aktien -35% bis -60%.
- Inflationsschock, z. B. CPI +6% bis +12%.
- Recovery-/Aftershock-Jahre, z. B. mehrere Folgejahre mit gedrosselter Rendite oder erhöhter Inflation.
- Korrelation mit Pflege-/Liquiditaetsstress bleibt zunaechst nicht modelliert, ausser explizit als spaeterer Ausbau.

Wichtig: Das Overlay muss protokolliert werden und darf historische Daten nicht mutieren.

## Modellvarianten zur Review-Auswahl

### Variante A: Ereignis-Injektion

Pro Run wird mit niedriger Wahrscheinlichkeit ein Crash-Paket injiziert.

Vorteile:

- Einfach erklaerbar.
- Gute Kontrolle ueber Haeufigkeit und Schwere.

Nachteile:

- Parameter wirken subjektiv.

### Variante B: Tail-Mixture

Jedes Jahr hat eine kleine Wahrscheinlichkeit, aus einer Tail-Verteilung statt aus Historie zu kommen.

Vorteile:

- Naeher an statistischem Tail-Modell.

Nachteile:

- Schwerer zu erklaeren und zu kalibrieren.

### Variante C: Preset-basierte deterministische Stresspfade

Monte Carlo bleibt unveraendert, aber Nutzer koennen Stresspfade als Zusatzanalyse aktivieren.

Vorteile:

- Geringeres Risiko fuer Standard-MC.

Nachteile:

- Weniger integriert in Erfolgswahrscheinlichkeit.

Empfehlung fuer erste Umsetzung: Variante A hinter explizitem Opt-in.

## Vorgeschlagene Architektur

### Neues DOM-freies Modul

Moeglicher Pfad:

- `app/simulator/tail-risk-overlay.js`

Exports:

- `normalizeTailRiskConfig(inputs)`
- `createTailRiskSchedule(runSeed, config, horizonYears)`
- `applyTailRiskOverlay(yearData, tailEvent, context)`
- `summarizeTailRiskEvents(runState)`

### Runner-Integration

Der Jahresloop erhaelt pro Run einen Tail-Risk-State:

- vor Simulation: Ereignisplan erzeugen,
- pro Jahr: pruefen, ob Tail-Event aktiv ist,
- Rendite/Inflation nur fuer das Simulationsjahr ueberschreiben/adjustieren,
- Logfelder schreiben.

### Diagnose und KPIs

Neue Log-/KPI-Felder:

- `tailRiskActive`
- `tailRiskEventType`
- `tailRiskReturnShockPct`
- `tailRiskInflationShockPct`
- `tailRiskRunsPct`
- `tailRiskFailureContribution` optional spaeter.

## Umsetzungspakete

### Paket 1: Fachcontract und Parameter

- Variante A/B/C entscheiden.
- Parametergrenzen festlegen: Wahrscheinlichkeit, Schwere, Dauer, Korrelation.
- Default: deaktiviert.

Akzeptanz:

- Kein bestehender Lauf aendert sich bei deaktiviertem Tail-Risk.

### Paket 2: Overlay-Modul und Unit-Tests

- DOM-freies Modul implementieren.
- Synthetische Jahresdaten testen.

Akzeptanz:

- Keine Mutation der Eingabedaten.
- Deterministische Events bei gleichem Seed.

### Paket 3: MC-/Worker-Integration

- Serial und Worker ergaenzen.
- Merge von Tail-KPIs.

Akzeptanz:

- Worker-Paritaet mit Tail-Risk aktiv.
- Bestehende Worker-Paritaet unveraendert.

### Paket 4: UI und Ergebnisdarstellung

- Opt-in in Simulator.
- Ergebnis-KPI und Szenario-Logs anzeigen.
- Warnhinweis: Modellannahme, keine Prognose.

Akzeptanz:

- Aktivierung ist bewusst und sichtbar.
- Export enthaelt Tail-Event-Felder.

### Paket 5: Doku und Vergleichslaeufe

- Bekannte Einschraenkung in Referenzdoku aktualisieren.
- Beispielvergleich Standard vs. Tail-Risk dokumentieren.

## Betroffene Dateien voraussichtlich

- `app/simulator/tail-risk-overlay.js` (neu)
- `app/simulator/monte-carlo-runner.js`
- `app/simulator/mc-run-context.js`
- `app/simulator/mc-run-metrics.js`
- `app/simulator/mc-log-builder.js`
- `app/simulator/simulator-results.js`
- `app/simulator/results-metrics.js`
- `workers/mc-worker.js`
- `Simulator.html`
- Tests: neue Tail-Testdatei, `simulator-monte-carlo.test.mjs`, `worker-parity.test.mjs`, `scenario-analyzer.test.mjs`
- Referenzdoku

Mehr als 5 Dateien betroffen; Umsetzung nur in Slices.

## Risiken

- Modellparameter koennen willkuerlich wirken.
- Erfolgswahrscheinlichkeit kann dramatisch sinken und Nutzer verunsichern.
- Doppelte Crash-Zaehlen: historische Crashs plus Tail-Overlay koennen extrem pessimistisch werden.
- Worker-Determinismus kann brechen, wenn Eventplanung chunkabhaengig ist.

## Stop-Regeln fuer Umsetzung

Stoppen und nachfragen, wenn:

- Tail-Events nicht pro Run deterministisch reproduzierbar sind.
- Bestehende MC-Ergebnisse bei deaktiviertem Tail-Risk abweichen.
- Ergebnisinterpretation unklar bleibt.
- Tail-Overlay historische Daten mutieren muesste.

## Validierung

Mindestens:

- Neuer Tail-Risk-Unit-Test.
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
- `node tests/run-single.mjs tests/worker-parity.test.mjs`
- `node tests/run-single.mjs tests/scenario-analyzer.test.mjs`
- `npm test`

Bei UI-Aenderung:

- `npm run test:browser`

Vergleich:

- 1.000 Runs ohne Tail-Risk vs. mit Tail-Risk.
- Kennzahlen: Failure Rate, P10/P50/P90, Max Drawdown, Real-CaR, Tail-Event-Anteil.

## Konkretisierung fuer Review

### Nicht-Ziele

- Keine Veraenderung bestehender historischer Renditereihen.
- Kein Default-Einschalten des Tail-Risk-Modells.
- Keine Steuer-, Pflege- oder Rentenlogik-Aenderung.
- Keine Behauptung, dass die Tail-Parameter prognostisch kalibriert sind.

### Vorlaeufiger Version-1-Contract

Empfohlene erste Variante: Ereignis-Injektion pro Run, explizit opt-in.

| Feld | Vorschlag | Grenzen | Default |
|---|---:|---:|---:|
| `tailRiskEnabled` | boolean | `true/false` | `false` |
| `tailRiskAnnualProbabilityPct` | Ereigniswahrscheinlichkeit pro Jahr | 0..5 | 0 |
| `tailRiskReturnShockPct` | zusaetzlicher Aktienrendite-Schock | -60..0 | -35 |
| `tailRiskInflationShockPct` | zusaetzliche Inflation im Schockjahr | 0..15 | 6 |
| `tailRiskDurationYears` | Dauer eines Ereignispakets | 1..5 | 1 |
| `tailRiskCooldownYears` | Mindestabstand zwischen Events | 0..20 | 10 |

Version 1 soll keine ungebremsten additiven Schocks auf bereits extreme historische Krisenjahre legen. Stattdessen gilt ein Anti-Doppelpessimismus-Contract:

- Das Overlay wird nur voll angewandt, wenn das gezogene historische Jahr kein Krisenjahr ist.
- Ein Krisenjahr liegt vor, wenn Aktienrendite <= -25%, Inflation >= 8% oder ein vorhandenes Stress-/Regime-Signal `bear_deep`, `crash`, `stagflation` oder gleichwertig meldet.
- Bei Krisenjahren wird kein zusaetzlicher Return-Schock angewandt; alternativ kann spaeter eine gedeckelte Daempfung mit Review-Freigabe eingefuehrt werden.
- Effektive Aktienrendite wird fuer Version 1 auf mindestens -65% begrenzt.
- Effektive Inflation wird fuer Version 1 auf maximal 15% begrenzt.
- Der Log muss ausweisen: `tailRiskSkippedReason='historical_crisis'` oder `tailRiskApplied=true`.

Keine Mutation von `annualData`.

### Contract-Matrix

| Bereich | Bestehender Contract | Neuer/erweiterter Contract | Review-Fokus |
|---|---|---|---|
| MC-Jahresdaten | historisches Sample liefert Rendite/Inflation | optionales Overlay erzeugt effektive Werte | Originaldaten unveraendert |
| Runner | Run-Seed bestimmt Pfad | Run-Seed bestimmt auch Tail-Schedule | Determinismus |
| Worker | Aggregates + ausgewählte Logs | Tail-KPIs werden gemerged | Paritaet |
| UI | Stress-/MC-Parameter | expliziter Tail-Risk-Block | Kein versehentliches Aktivieren |
| Ergebnis | Failure/P10/P50/P90 | zusaetzliche Tail-Event-KPIs | Interpretation klar |

### Messbare Akzeptanzkriterien

- Bei `tailRiskEnabled=false` sind MC-Ergebnisse identisch zu vorher.
- Gleicher Seed erzeugt gleiche Tail-Event-Jahre und gleiche Ergebnisaggregate.
- Tail-Overlay schreibt pro betroffenem Logjahr `tailRiskActive=true` und die angewandten Schocks.
- `tailRiskAnnualProbabilityPct=0` erzeugt keine Events.
- Event-Dauer und Cooldown werden eingehalten.
- Failure-Rate darf sich bei aktivem Tail-Risk aendern, muss aber im Vergleichsreport ausgewiesen werden.
- Historische Krisenjahre erhalten keinen zusaetzlichen Return-Schock; Log setzt `tailRiskSkippedReason='historical_crisis'`.
- Effektive Aktienrendite bleibt >= -65%, effektive Inflation bleibt <= 15%.
- Parameter ausserhalb der Grenzen werden validiert und nicht still geklemmt, sofern sie aus UI/User-Input stammen.
- Tail-Schedule wird aus `runIdx`/per-run Seed abgeleitet und ist unabhaengig von Worker-Chunking.

### Referenzszenarien

| ID | Konfiguration | Erwartung |
|---|---|---|
| T1 | Tail aus | identisch zu Baseline |
| T2 | Wahrscheinlichkeit 0 | keine Events |
| T3 | Wahrscheinlichkeit hoch, Dauer 1 | Events sichtbar, deterministisch |
| T4 | Dauer 3, Cooldown 10 | keine ueberlappenden Events |
| T5 | starker Return- und Inflationsschock | hoehere Failure-/Stress-Metriken moeglich |

### Slice-Zuschnitt fuer spaetere Umsetzung

1. `SLICE_TAIL_RISK_01_CONTRACT.md`: Parameter, UI-Default, Red-State-Tests.
2. `SLICE_TAIL_RISK_02_OVERLAY_MODULE.md`: DOM-freies Overlay und Unit-Tests.
3. `SLICE_TAIL_RISK_03_RUNNER_INTEGRATION.md`: Serial-MC und Logs.
4. `SLICE_TAIL_RISK_04_WORKER_METRICS.md`: Worker-Payload, Merge, Paritaet.
5. `SLICE_TAIL_RISK_05_UI_DOCS.md`: UI, Export, Doku, Vergleichsreport.

### Reviewer-Pruefauftrag

- Pruefen, ob Ereignis-Injektion als Version 1 fachlich tragfaehig ist.
- Pruefen, ob die Default-Parameter zu alarmistisch oder zu weich sind.
- Pruefen, ob Doppelpessimismus durch historische Crashs plus Overlay ausreichend adressiert ist.
- Pruefen, ob die Nutzerfuehrung klar zwischen Simulation und Prognose unterscheidet.

## Offene Fragen fuer Review

1. Welche Modellvariante ist fuer Version 1 angemessen?
2. Welche Default-Parameter sind konservativ, aber nicht alarmistisch?
3. Soll Tail-Risk die Erfolgswahrscheinlichkeit beeinflussen oder nur als Zusatz-Stresstest erscheinen?
4. Wie verhindern wir Doppelpessimismus durch historische Crashs plus Overlay?
## Review-Feedback von Gemini (Erstes Review - blockiert)

### 1. Korrektheit
- **Double-Crash-Problem (Doppelpessimismus)**: Der Plan berücksichtigt nicht, dass Monte-Carlo-Läufe bereits reale historische Krisenjahre (z. B. 1929, 2008) ziehen. Wird darauf additiv ein Aktien-Schock von `-35%` bis `-60%` gelegt, führt dies zu einem physikalisch unmöglichen und statistisch verzerrenden Portfoliokollaps von `-70%` bis `-95%` in einem einzigen Jahr. Es bedarf einer Logik, die Schocks nur auf "normale" Jahre anwendet oder relative Dämpfungen statt additiver Schocks nutzt.
- **Inflations-Schock-Grenzen**: Ein additiver Inflationsschock von `+12%` auf ein historisches Jahr wie 1979 (Inflation ca. 11%) erzeugt eine Inflation von `23%`. Solche Extremwerte können Folgewirkungen in der Engine (z. B. Rentenwertdynamik oder Steuerprogression) verzerren.

### 2. Vertragstreue
- **Daten-Immutabilität**: Das Overlay darf unter keinen Umständen die geteilten historischen Arrays (`annualData`) modifizieren, da dies nachfolgende Simulationsläufe in demselben Thread/Worker korrumpieren würde. Ein Deep-Copy- oder Read-Through-Mechanismus muss garantiert sein.

### 3. Fehlerbehandlung
- **Endlosschleifen bei Event-Platzierung**: Wenn `duration` + `cooldown` nahe an der Gesamtlaufzeit liegen, kann ein naiver stochastischer Platzierungs-Algorithmus in eine Endlosschleife geraten. Die Konfiguration muss strikt validiert werden (`duration + cooldown <= horizonYears`).

### 4. Seiteneffekte
- **Verzerrung der Erfolgswahrscheinlichkeit**: Wenn Tail-Events in die reguläre Erfolgsquote einfließen, werden diese extrem sinken. Dies entwertet das MC-Modell als Planungstool und verunsichert Nutzer, da die Parameter der Injektion stochastisch willkürlich und nicht empirisch kalibriert sind.

### 5. Was könnte brechen?
- **Determinismus-Verlust im Worker-Chunking**: Wenn die Injektionswahrscheinlichkeit pro Run stochastisch ausgewertet wird, muss sichergestellt sein, dass der RNG-Zustand strikt an den Run-Index gekoppelt ist. Ein geteilter oder unvollständig zurückgesetzter Generator führt bei paralleler Ausführung auf unterschiedlichen CPU-Kernen zu unterschiedlichen Ergebnissen.

## Review-Ergebnis (Erstes Review)
- Status: blockiert
- Blocker: 
  - Fehlendes mathematisches/fachliches Konzept zur Vermeidung unphysikalisch akkumulierter Krisen (Doppelpessimismus-Schutz).
  - Fehlende Spezifikation zur deterministischen RNG-Initialisierung pro Run im Multithreading-Kontext (Workers).
- Restrisiken: 
  - Fehlende Validierung der Konfigurationsgrenzen (z. B. negative Wahrscheinlichkeiten oder Cooldowns, die den Zeithorizont überschreiten).
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache? Ein Anwender setzt die Wahrscheinlichkeit hoch und den Cooldown auf 0. Die Engine gerät bei der stochastischen Eventplatzierung in einem kurzen Zeithorizont in eine Endlosschleife, blockiert den Browser-Thread und führt zum Absturz des Tabs.

## Review-Feedback von Gemini (Zweites Review - freigegeben)

### 1. Korrektheit
- **Anti-Doppelpessimismus-Mechanismus**: Der Ausschluss historischer Krisenjahre und die harten Kappungsgrenzen (`-65%` Rendite, `15%` Inflation) lösen das Problem physikalisch unmöglicher Extremkumulationen vollständig.
- **Klippen-Effekt der Krisenjahr-Ausschlussschwelle (Restrisiko)**: Die binäre Skip-Logik (z. B. kein Schock bei historischen Renditen <= -25%) erzeugt eine mathematische Klippe: Ein Jahr mit `-24%` Rendite wird durch den Schock auf `-59%` gedrückt, während ein schlechteres Jahr mit `-25.1%` Rendite den Schock überspringt und bei `-25.1%` verbleibt. Dies führt zu einer unnatürlichen Verteilung der Simulationspfade. Für Version 1 ist dieser pragmatische Ansatz akzeptabel, sollte jedoch langfristig durch eine kontinuierliche Dämpfung ersetzt werden.

### 2. Vertragstreue
- **Worker-Determinismus**: Die feste Koppelung der Event-Generierung an den `runIdx` und den per-run Seed stellt sicher, dass Paritätstests bei Multithreading stabil durchlaufen.

### 3. Fehlerbehandlung
- **Parametervalidierung**: Die Definition von Eingabegrenzen für Duration, Cooldown und Wahrscheinlichkeit verhindert wirksam Fehlkonfigurationen und Endlosschleifen.

### 4. Seiteneffekte
- **Verzerrung der Erfolgsquoten**: Die Erfolgsquote wird bei aktiviertem Tail-Risk absinken. Da dies nun als explizites Opt-in mit Warnhinweisen und separaten Logs abgebildet wird, ist die UX-Transparenz gewahrt.

### 5. Was könnte brechen?
- Keine Blockaden identifiziert. Der Versuchsaufbau in Slice 1 muss die mathematische Nicht-Monotonie (Klippen-Effekt bei -25%) quantifizieren.

## Review-Ergebnis (Zweites Review)
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - Stochastischer Klippen-Effekt: Durch den binären Skip-Threshold (-25%) werden moderate Krisenjahre im Endergebnis schlechter bewertet als schwere Krisenjahre.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache? Die logische Abfrage auf `bear_deep` oder `crash` im Code der Engine greift ins Leere, da sich die genauen String-Bezeichnungen der Regimes im `MarketAnalyzer` leicht geändert haben, was die Ausschlusslogik stumm deaktiviert und das Doppelpessimismus-Problem unerwartet wiederbelebt.

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

### Antwort auf Gemini-Feedback

- **Double-Crash / Doppelpessimismus:** Angenommen. Der Plan enthaelt jetzt einen Anti-Doppelpessimismus-Contract: historische Krisenjahre bekommen keinen zusaetzlichen Return-Schock; effektive Rendite wird auf -65% begrenzt und Skip-Grund geloggt.
- **Inflations-Schock-Grenzen:** Angenommen. Effektive Inflation wird fuer Version 1 auf maximal 15% begrenzt; historische Hochinflationsjahre koennen Tail-Inflation ebenfalls skippen oder deckeln.
- **Worker-Seed-Determinismus:** Angenommen. Tail-Schedule wird aus `runIdx` bzw. per-run Seed abgeleitet und muss worker-chunking-unabhaengig getestet werden.
- **Parameter-Validierung:** Angenommen. Duration, Cooldown, Probability und Schockstaerken sind User-Input-Validierungsfelder. Ungueltige Werte duerfen nicht still in extreme Effekte umschlagen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| 1 | Gemini | Doppelpessimismus bei historischen Krisen | Ausschlusslogik oder Dämpfungskonzept für Schocks erarbeiten | erledigt: Krisenjahr-Skip, Rendite-/Inflationsdeckel und Log-Grund ergänzt |
| 2 | Gemini | Worker-Seed-Determinismus | Seed-Zuweisung pro Run-Index im Plan explizit vorschreiben | erledigt: Tail-Schedule aus per-run Seed/runIdx festgelegt |
| 3 | Gemini | Parameter-Validierung | Range-Checks für Duration, Cooldown und Probability einführen | erledigt: User-Input-Validierung und Grenzen als Akzeptanzkriterium ergänzt |
