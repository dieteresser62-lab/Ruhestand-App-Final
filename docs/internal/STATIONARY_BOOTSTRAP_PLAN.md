# Arbeitsdokument: Stationary Bootstrap ergaenzen

**Stand:** 2026-06-16  
**Status:** Slice 4 freigegeben
**Autor:** Codex  
**Verbesserungspunkt:** 3 - Stationary Bootstrap ergaenzen  
**Geplanter Feature-Branch:** `codex/stationary-bootstrap`  
**GitHub-Status:** Feature-Branch `codex/stationary-bootstrap` lokal angelegt, noch nicht veroeffentlicht.

## Einordnung in Roadmap

Dieses Arbeitsdokument ist Schritt 4 der freigegebenen Roadmap `docs/internal/ROADMAP_ENGINE_STOCHASTIK_VERBESSERUNGEN.md`.

Rolle in der Roadmap:

- Erste stochastische Erweiterung nach Abschluss der deterministischen Engine-Phase.
- Veraendert die Pfadgenerierung, nicht die Engine-Semantik fuer Entnahme, Liquiditaet oder Horizont.
- Bereitet Gate 2 `Sampling-Freeze` vor.

Startvoraussetzungen:

- Gate 1 `Baseline-Freeze Engine-Semantik` ist abgeschlossen und dokumentiert.
- Das Freeze-Artefakt liegt als `docs/internal/BASELINE_FREEZE_ENGINE_SEMANTIK.md` vor oder ist im Roadmap-Dokument vollstaendig protokolliert.
- Eigener Feature-Branch gemaess Projektregeln.

Uebergabegate zu Schritt 5:

- Klassischer Bootstrap und Stationary Bootstrap sind per Konfiguration getrennt ausfuehrbar.
- Seed-Verhalten ist reproduzierbar.
- Worker- und Serial-Pfade liefern konsistente Ergebnisse, falls beide Pfade betroffen sind.
- Gate 2 `Sampling-Freeze` ist abgeschlossen, bevor Fat-Tail/Crash beginnt.

## Ziel

Der Simulator soll neben bestehendem Block-Bootstrap einen Stationary Bootstrap anbieten. Dadurch koennen historische Rendite-/Inflationssequenzen mit variabler Blocklaenge resampelt werden, ohne die starren Blockgrenzen des klassischen Block-Bootstrap.

Das Ziel ist ein methodischer Ausbau der Monte-Carlo-Datenbasis, nicht die Entfernung bestehender Methoden.

## Ausgangslage

Relevante Bereiche:

- `app/simulator/monte-carlo-runner.js`: Jahresloop und Sampling-Verbrauch.
- `app/simulator/mc-year-sampling.js`: Startjahr-, Filter-, Recency- und CAPE-Sampling.
- `app/simulator/monte-carlo-ui.js`: MC-Input-Reader, Methode und Blockgroesse.
- `app/simulator/simulator-portfolio-historical.js`: historische Daten und Regime-Aufbereitung.
- `workers/mc-worker.js`: Worker-Payload und Runner-Aufruf.
- Tests: `monte-carlo-sampling.test.mjs`, `monte-carlo-startyear.test.mjs`, `simulator-monte-carlo.test.mjs`, `worker-parity.test.mjs`.

Die Doku nennt derzeit "Kein Stationary Bootstrap" als bekannte Einschraenkung.

## Fachlicher Hintergrund

Beim klassischen Block-Bootstrap werden fixe Bloecke historischer Jahre gezogen. Beim Stationary Bootstrap wird in jedem Jahr probabilistisch entschieden:

- mit Wahrscheinlichkeit `p = 1 / expectedBlockLength`: neuer historischer Startpunkt,
- sonst: naechstes historisches Jahr im aktuellen Block.

So entstehen geometrisch verteilte Blocklaengen. Das erhaelt lokale Autokorrelation besser als IID und vermeidet starre Blocklaengen.

## Vorgeschlagene Architektur

### DOM-freier Sampler

Moeglicher Pfad:

- `app/simulator/stationary-bootstrap-sampler.js`

Exports:

- `createStationaryBootstrapSampler({ annualData, expectedBlockLength, mode, cdf, rng })`
- `nextYearSample(state)`
- `normalizeStationaryBootstrapConfig(inputs)`

Der Sampler muss deterministisch und worker-kompatibel sein.

### Integration in bestehende MC-Methoden

Der bestehende MC-Methodenwert sollte erweitert werden:

- `historical`
- `regime`
- `block`
- `stationary_block` oder `stationary`

Namensentscheidung fuer Review offen.

### Filter/Recency/CAPE

Zu klaeren:

- Startpunkte koennen FILTER/RECENCY-gewichtet gezogen werden.
- Fortsetzungsjahre laufen sequenziell weiter.
- CAPE-Sampling hat heute Vorrang vor Startjahr-Gewichtung; dieser Contract muss beibehalten oder explizit neu entschieden werden.

## Umsetzungspakete

### Paket 1: Contract und Sampler-Tests

- Methode, Parameter und Edge Cases definieren.
- Tests fuer deterministische Sequenzen, mittlere Blocklaenge, Jahresgrenzen.

Akzeptanz:

- Gleicher Seed erzeugt gleiche Sequenz.
- Sehr kleine/grosse erwartete Blocklaengen werden validiert.
- Kein Zugriff auf DOM oder globale Browserobjekte.

### Paket 2: Sampler-Modul

- DOM-freies Modul implementieren.
- Keine UI-Integration.

Akzeptanz:

- Unit-Tests pruefen Reset-/Continue-Verhalten.
- Sampler laeuft mit `annualData` und synthetischen Kleindaten.

### Paket 3: Monte-Carlo-Runner integrieren

- Runner-Methode `stationary` ergaenzen.
- Worker-Payload erweitern.
- Serial und Worker muessen identische Resultate liefern.

Akzeptanz:

- `worker-parity` fuer Stationary Bootstrap gruen.
- Bestehende Methoden unveraendert.

### Paket 4: UI und Persistenz

- MC-Methode im Simulator auswählbar machen.
- Erwartete Blocklaenge als bestehende Blockgroesse wiederverwenden oder separaten Parameter einfuehren.
- Tooltip/Hilfe ergaenzen.

Akzeptanz:

- Bestehende gespeicherte Einstellungen migrieren ohne Fehler.
- Bei Methode ungleich Stationary bleiben irrelevante Felder deaktiviert.

### Paket 5: Doku und Vergleich

- `ARCHITEKTUR_UND_FACHKONZEPT.md` bekannte Einschraenkung entfernen/anpassen.
- Methodik in Referenzdoku beschreiben.
- Vergleichs-MC: Block vs. Stationary bei gleichem Seed-Setup dokumentieren.

## Betroffene Dateien voraussichtlich

- `app/simulator/stationary-bootstrap-sampler.js` (neu)
- `app/simulator/mc-year-sampling.js`
- `app/simulator/monte-carlo-runner.js`
- `app/simulator/monte-carlo-ui.js`
- `app/simulator/simulator-main-init.js`
- `workers/mc-worker.js`
- `Simulator.html`
- Tests: `monte-carlo-sampling.test.mjs`, `simulator-monte-carlo.test.mjs`, `worker-parity.test.mjs`, ggf. neue Sampler-Testdatei
- Referenzdoku

Mehr als 5 Dateien werden betroffen sein; Umsetzung in Slices erforderlich.

## Risiken

- Determinismus kann durch Worker-Chunking brechen, wenn Sampler-State nicht pro Run sauber initialisiert wird.
- FILTER/RECENCY/CAPE-Regeln koennen unklar werden.
- Variable Blocklaengen koennen Performance- und Debug-Verhalten veraendern.
- UI kann Nutzer mit zu vielen Sampling-Methoden ueberfordern.

## Stop-Regeln fuer Umsetzung

Stoppen und nachfragen, wenn:

- Worker-Paritaet nicht eindeutig herstellbar ist.
- CAPE-Sampling und Stationary Bootstrap fachlich kollidieren.
- Bestehende Methode `block` geaendert werden muessste.
- MC-Ergebnisse durch Chunking variieren.

## Validierung

Mindestens:

- Neuer Sampler-Test.
- `node tests/run-single.mjs tests/monte-carlo-sampling.test.mjs`
- `node tests/run-single.mjs tests/monte-carlo-startyear.test.mjs`
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
- `node tests/run-single.mjs tests/worker-parity.test.mjs`
- `npm test`

Bei UI-Aenderung:

- `npm run test:browser`

## Konkretisierung fuer Review

### Nicht-Ziele

- Keine Entfernung oder Veraenderung der bestehenden Methode `block`.
- Keine Aenderung des RNG-Contracts fuer `legacy-stream`.
- Keine Vermischung mit Fat-Tail-Overlay; Stationary Bootstrap bleibt reines Resampling.
- Keine neue historische Datenquelle.

### Contract-Matrix

| Bereich | Bestehender Contract | Neuer/erweiterter Contract | Review-Fokus |
|---|---|---|---|
| MC-Methode | `historical`, `regime`, `block` | zusaetzlich `stationary` | Bestehende Methoden unveraendert |
| Blockparameter | fixe Blockgroesse fuer `block` | erwartete Blocklaenge fuer `stationary` | UI-Begriff darf nicht irrefuehren |
| Startjahrfilter | FILTER/RECENCY-CDF | gilt fuer neue Blockstarts | CAPE-Vorrang klar definieren |
| Runner-State | pro Run deterministisch | Sampler-State pro Run und Jahr | Chunking-unabhaengig |
| Worker | gleiche Inputs wie serial | Methode + expectedBlockLength im Payload | Worker-Paritaet |

### Vorgeschlagener Methoden-Contract

- Interner Methodenwert: `stationary`.
- UI-Label: `Stationary Bootstrap`.
- Parameter: vorhandenes Feld `mcBlockSize` wird als `expectedBlockLength` interpretiert, aber UI-Text muss bei Methode `stationary` "Erwartete Blocklaenge" anzeigen.
- Grenzen: `expectedBlockLength` 1..30, Default 5.
- `p = 1 / expectedBlockLength`.
- Bei Erreichen des Datenendes wird unabhaengig von `p` ein neuer Blockstart erzwungen. Wrap-around ist fuer Version 1 ausgeschlossen, weil es einen historisch kuenstlichen Sprung vom letzten zum ersten Datenjahr erzeugen wuerde.

Sampler-State-Contract:

- Der Sampler wird pro Run aus dem per-run Seed initialisiert.
- Der Sampler-State enthaelt mindestens `currentIndex`, `yearsInCurrentBlock`, `restartCount` und `lastRestartReason`.
- Zufallszahlenverbrauch ist Bestandteil des Contracts: pro Simulationsjahr genau ein Restart-Wurf; bei erzwungenem Datenende-Restart kein zusaetzlicher zweiter Wurf.
- Worker-Chunking darf den Sampler-State nicht zwischen Runs teilen.

### Messbare Akzeptanzkriterien

- Bei `expectedBlockLength=1` verhaelt sich der Sampler wie IID-Ziehen aus erlaubten Startjahren.
- Bei sehr grosser erwarteter Blocklaenge entstehen laengere Sequenzen; der Test prueft nicht exakte Statistik, aber die Restart-Anzahl muss bei gleichem Seed reproduzierbar sein.
- Serial Full-Run und Worker-Chunked-Run liefern identische Aggregate fuer gleiche Seeds.
- Bestehende `block`-Tests bleiben unveraendert.
- FILTER/RECENCY wirken nur bei neuen Blockstarts; CAPE-Sampling-Vorrang wird entweder beibehalten oder explizit als Review-Entscheidung geaendert.
- Wenn `currentIndex` das letzte erlaubte Jahr erreicht, muss das naechste Jahr einen neuen Blockstart ausloesen und `lastRestartReason='data_end'` setzen.
- Der Worker-Paritaetstest muss einen Fall enthalten, in dem ein Run das Datenende erreicht.

### Referenzszenarien

| ID | Methode | Parameter | Erwartung |
|---|---|---|---|
| S1 | stationary | expectedBlockLength 1 | viele Restarts, deterministisch |
| S2 | stationary | expectedBlockLength 5 | gemischte Blocklaengen |
| S3 | stationary + FILTER | Startjahr >= 1980 | neue Starts nur aus erlaubtem Fenster |
| S4 | stationary + RECENCY | Half-Life 20 | neuere Starts hoeher gewichtet |
| S5 | block vs stationary | gleiche Blockgroesse | Ergebnisse koennen abweichen, aber Contracts bleiben stabil |

### Slice-Zuschnitt fuer spaetere Umsetzung

1. `SLICE_STATIONARY_BOOTSTRAP_01_CONTRACT.md`: Methodenname, Parameter, CAPE/FILTER/RECENCY-Entscheidung. Status: freigegeben.
2. `SLICE_STATIONARY_BOOTSTRAP_02_SAMPLER.md`: DOM-freier Sampler und Unit-Tests. Status: freigegeben.
3. `SLICE_STATIONARY_BOOTSTRAP_03_RUNNER.md`: Runner-Integration serial. Status: freigegeben.
4. `SLICE_STATIONARY_BOOTSTRAP_04_WORKER_PARITY.md`: Worker-Payload und Paritaet. Status: freigegeben.
5. `SLICE_STATIONARY_BOOTSTRAP_05_UI_DOCS.md`: UI, Persistenz, Doku, Browser-Smoke.

### Reviewer-Pruefauftrag

- Pruefen, ob der Sampler-State chunking-unabhaengig modellierbar ist.
- Pruefen, ob die Wiederverwendung von `mcBlockSize` fachlich und UX-seitig akzeptabel ist.
- Pruefen, ob FILTER/RECENCY/CAPE-Regeln widerspruchsfrei sind.
- Pruefen, ob die Methode einen echten Mehrwert gegenueber bestehendem Block-Bootstrap bringt.

## Offene Fragen fuer Review

1. Name der Methode: `stationary`, `stationary_block` oder deutsch sichtbar "Stationary Bootstrap"?
2. Soll die bestehende Blockgroesse als erwartete Blocklaenge wiederverwendet werden?
3. Wie soll Stationary Bootstrap mit CAPE-Sampling interagieren?
4. Soll Recency fuer jeden neuen Blockstart oder nur fuer den initialen Start gelten?

## Review-Feedback von Gemini (Erstes Review - blockiert)

### 1. Korrektheit
- **Wrap-around am Array-Ende**: Wenn der Sampler das Ende des historischen Datensatzes erreicht (z. B. das Jahr 2025), würde ein naives `currentYear + 1` zu einem Out-of-Bounds-Fehler führen. Ein unreflektierter Wrap-around zum ersten Jahr (z. B. 1926) erzeugt einen extremen, historisch unmöglichen Regimesprung. Es muss zwingend vorgeschrieben werden, dass beim Erreichen des Datenendes unabhängig von `p` ein neuer Block gestartet wird.
- **RNG-Verbrauch und Varianz**: Da bei jedem Zeitschritt gewürfelt wird, ob ein neuer Block startet, verbraucht die Methode pro Simulationsjahr eine Zufallszahl. Der Sampler muss deterministisch an den generatorischen Seed des jeweiligen Runs gekoppelt sein, um Worker-Parität zu wahren.

### 2. Vertragstreue
- **Wechselwirkung mit CAPE/FILTER/RECENCY**: Diese Selektionsgewichtungen dürfen nur bei der Ziehung eines *neuen* Blockstarts greifen. Läuft ein Block sequentiell weiter, muss dies ohne Gewichtungs-Eingriffe geschehen. Der Plan muss klarstellen, dass der CAPE-Vorrang nur für den Eintritt in einen neuen Block gilt, um den Autokorrelationsvorteil des Stationary Bootstrap nicht zu zerstören.

### 3. Fehlerbehandlung
- **Parameter-Validierung**: Werte für `expectedBlockLength <= 0` müssen abgefangen und auf einen sicheren Fallback (z. B. `1` für IID-Sampling) gesetzt werden, um Divisionen durch Null oder negative Wahrscheinlichkeiten zu verhindern.

### 4. Seiteneffekte
- **Geometrische Verteilungsextreme**: Da die Blocklängen geometrisch verteilt sind, kann es in seltenen Fällen zu extrem langen Blöcken (z. B. >30 Jahre am Stück) kommen. Wenn dadurch fast die gesamte Simulation aus einem einzigen historischen Segment besteht, erhöht sich die Pfadabhängigkeit. Dies muss im Doku-Vergleich sauber analysiert werden.

### 5. Was könnte brechen?
- **Worker-Paritätsverlust**: Wenn der Zustand des Samplers (ob ein Block aktiv ist und welches Jahr aktuell läuft) nicht sauber pro Run-Index im Worker zurückgesetzt wird, führt die parallele Chunk-Verarbeitung zu abweichenden Simulationsergebnissen im Vergleich zum seriellen Lauf.

## Review-Ergebnis (Erstes Review)
- Status: blockiert
- Blocker: 
  - Fehlendes concept zur Behandlung des Datenendes (Array-Grenzen).
  - Fehlende Spezifikation der Interaktion von CAPE/FILTER/RECENCY mit der Block-Fortsetzungslogik.
- Restrisiken: 
  - Höhere stochastische Varianz durch zufällig sehr lange historische Pfade.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache? Der Sampler-Zustand wird im Web Worker zwischen den einzelnen MC-Runs nicht vollständig zurückgesetzt. Ein verbleibender Block-Status aus Run 1 blutet in Run 2 hinein, wodurch die Ergebnisse bei gleicher Seed-Eingabe nicht reproduzierbar sind.

## Review-Feedback von Gemini (Zweites Review - freigegeben)

### 1. Korrektheit
- **Datenende-Behandlung**: Die Erzwingung eines neuen Blockstarts bei Erreichen des Array-Endes (`lastRestartReason='data_end'`) löst das Out-of-Bounds- und Wrap-around-Problem fachlich sauber.
- **RNG-Ausrichtung**: Der Wurf-Zufallszahlen-Contract (genau ein Restart-Wurf pro Jahr) verhindert Drift-Effekte. **Empfehlung für die Umsetzung**: Um den RNG-Verbrauch absolut uniform zu halten, sollte bei einem erzwungenen `data_end`-Restart dennoch eine Zufallszahl gezogen und verworfen werden. So bleibt der RNG-Fußabdruck pro Simulationsjahr exakt konstant auf 1 Aufruf, was die Paritätsprüfung bei komplexen Seeds vereinfacht.

### 2. Vertragstreue
- **Gewichtungs-Interaktion**: Der geänderte Contract stellt sicher, dass CAPE/FILTER/RECENCY-Gewichte nur beim Eintritt in einen neuen Block wirksam sind, wodurch die Autokorrelation innerhalb des Blocks erhalten bleibt.

### 3. Fehlerbehandlung
- **Parameter-Validierung**: Die Drosselung von `expectedBlockLength <= 0` auf ein IID-Verhalten (p=1.0) ist robust gelöst.

### 4. Seiteneffekte
- **Worker-Parität**: Die Koppelung des Sampler-State an den per-run Seed und die Isolierung des States pro Run-Index eliminieren die Paritätsrisiken im Multithreading.

### 5. Was könnte brechen?
- Es gibt keine verbleibenden prozessualen oder stochastischen Blocker.

## Review-Ergebnis (Zweites Review)
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - Geringfügige Abweichungen im RNG-Footprint, falls bei erzwungenem `data_end`-Restart der stochastische Wurf komplett übersprungen wird, anstatt ihn auszuführen und zu verwerfen.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache? Ein unbemerktes Update des historischen Daten-Arrays im Speicher ändert dessen Länge während einer laufenden Monte-Carlo-Simulation, wodurch die Bedingung für den erzwungenen Block-Restart (`currentIndex === array.length - 1`) für einige Worker fehlschlägt und die Threads asynchron laufen.

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

### Antwort auf Gemini-Feedback

- **Out-of-Bounds / Wrap-around:** Angenommen. Der Plan verbietet Wrap-around fuer Version 1. Bei Datenende wird zwingend ein neuer Blockstart mit `lastRestartReason='data_end'` erzeugt.
- **RNG-Verbrauch und Varianz:** Angenommen. Der Sampler-State-Contract schreibt pro Simulationsjahr genau einen Restart-Wurf vor und koppelt den Sampler pro Run an den per-run Seed. Datenende-Restarts verbrauchen keinen zweiten Wurf.
- **CAPE/FILTER-Interaktion:** Angenommen. FILTER/RECENCY gelten nur fuer neue Blockstarts; Fortsetzung ist rein sequenziell. CAPE-Vorrang bleibt Review-Entscheidung in Slice 1, wird aber nicht implizit geaendert.
- **Paritaets-Sicherung:** Angenommen. Worker-Paritaet muss einen Datenende-Fall und isolierten Sampler-State pro Run testen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| 1 | Gemini | Out-of-Bounds am Datenende | Bei Erreichen des Array-Endes einen neuen Block-Start erzwingen | erledigt: Wrap-around ausgeschlossen, `data_end`-Restart definiert |
| 2 | Gemini | CAPE/FILTER-Interaktion | Gewichtetes Sampling nur bei Blockstart anwenden; Fortsetzung rein sequentiell | erledigt: Contract ergaenzt |
| 3 | Gemini | Paritäts-Sicherung | Sampler-State-Isolierung und Seed-Initialisierung pro Run explizit testen | erledigt: Sampler-State- und Worker-Paritaetsanforderungen ergaenzt |
