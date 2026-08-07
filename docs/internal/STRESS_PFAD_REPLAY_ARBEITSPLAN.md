# Deterministisches Stress-Pfad-Replay: Arbeitsplan

**Stand:** 2026-08-07  
**Status:** Entwurf; Planreview und Nutzerentscheidungen ausstehend; nicht implementierungsreif  
**Autor:** Codex  
**Produktverantwortung und fachliche Entscheidung:** Nutzer  
**Vorgesehener Feature-Branch:** `codex/stress-pfad-replay`  
**GitHub-Status:** Branch noch nicht angelegt und nicht veroeffentlicht; vor Slice 01 nach Planfreigabe anzulegen  
**Planungsbranch:** `codex/fokussierte-abschlusshaertung`  
**Planungs-HEAD:** `55bdd84`  
**Vorgesehene Slice-Nummerierung:** 1-basiert, Slice 01 bis Slice 08

## 1. Zweck des Arbeitsdokuments

Dieser Arbeitsplan beschreibt die schrittweise Aufruestung des Simulators um
ein deterministisches Stress-Pfad-Replay. Ein interessanter einzelner
Monte-Carlo-Lauf soll im bestehenden Szenario-Log ausgewaehlt, als fester
exogener Pfad gespeichert und anschliessend mit geaenderten
Strategieparametern erneut berechnet werden koennen.

Der Kernnutzen ist ein gepaarter Gegenfaktualvergleich:

- dieselben effektiven Marktjahre;
- dieselben Stress- und Tail-Risk-Ereignisse;
- dieselben Todes-, Pflege- und Hinterbliebenenereignisse;
- derselbe Haushalt, dieselben Renten und derselbe Bedarf;
- aber eine kontrolliert geaenderte Anlagestrategie oder Entnahmepolicy.

Der Nutzer soll beispielsweise beantworten koennen:

- Wie haette genau dieser Krisenpfad mit Gold statt ohne Gold ausgesehen?
- Was aendert sich, wenn Aktienfonds im Gegenfaktum fehlen?
- Welche Wirkung hat ein anderer Liquiditaets-Runway?
- Entsteht mit Standardstrategie oder 3-Bucket-Strategie frueher ein
  Notverkauf?
- Ab welchem Jahr unterscheiden sich Entscheidungen, Vermoegen,
  Mindest-Flex-Erfuellung oder Ruinstatus?

Der Plan verwendet bewusst den Begriff **gepaarter Gegenfaktualvergleich**.
Das Feature beweist keine allgemeine Kausalwirkung einer Strategie ausserhalb
des ausgewaehlten Pfades und bezeichnet keine Variante als objektiv beste
Strategie.

## 2. Verbindlicher Prozessrahmen

Dieser Plan unterliegt `docs/internal/SLICE_EXECUTION_RULES.md` und den
projektweiten Regeln aus `AGENTS.md`.

Vor der ersten Umsetzung muessen deshalb:

1. der Plan durch Gemini und optional Claude adversarial geprueft sein;
2. die offenen Nutzerentscheidungen in Abschnitt 17 geschlossen sein;
3. Codex die Findings eingearbeitet und beantwortet haben;
4. der Planstatus auf `implementierungsreif` gesetzt sein;
5. `codex/stress-pfad-replay` angelegt und aktiv sein;
6. der Branch lokal dokumentiert und nur nach ausdruecklicher Nutzerfreigabe
   auf GitHub veroeffentlicht sein;
7. fuer den beginnenden Slice eine eigene 1-basierte Slice-MD vorliegen;
8. Branch, `git status --short` und Diff-Risiko in der Slice-MD dokumentiert
   sein;
9. der Arbeitsbaum sauber oder jede Fremdaenderung nachweisbar vom
   Slice-Scope getrennt sein.

Codex implementiert die Slices und fuehrt Selbstpruefungen durch. Die
Freigabe erfolgt durch Gemini, optional Claude und den Nutzer. Codex markiert
die eigene Umsetzung nicht selbst als freigegeben und erstellt keine
Abnahme-Commits.

## 3. Planungsbaseline und Arbeitsbaumtrennung

Bei Erstellung dieses Entwurfs war folgender fremde Arbeitsstand vorhanden:

```text
Branch: codex/fokussierte-abschlusshaertung
HEAD: 55bdd84

 M README.md
 M Simulator.html
 M app/simulator/auto-optimize-evaluate.js
 M app/simulator/auto-optimize-metrics.js
 M app/simulator/auto-optimize-renderer.js
 M app/simulator/results-metrics.js
 M app/simulator/results-renderers.js
 M app/simulator/scenario-analyzer.js
 M app/simulator/simulator-heatmap.js
 M docs/internal/FOKUSSIERTE_ABSCHLUSSHAERTUNG_PLAN.md
 M docs/internal/SLICE_ABSCHLUSSHAERTUNG_02_RISIKOANZEIGEN.md
 M docs/reference/SIMULATOR_MODULES_README.md
 M docs/reference/TECHNICAL.md
 M tests/README.md
 M tests/auto-optimizer.test.mjs
 M tests/results-metrics.test.mjs
 M tests/results-renderers.test.mjs
 M tests/scenario-analyzer.test.mjs
 M tests/simulator-heatmap.test.mjs
 M tests/simulator-monte-carlo-browser.mjs
?? tests/slice-02-risk-display-copy-contract.test.mjs
```

Diese Aenderungen gehoeren nicht zum Stress-Replay-Scope und duerfen weder
ueberschrieben noch in einen spaeteren Replay-Commit aufgenommen werden. Der
aktuelle Branch ist nur der Ort, an dem der Planentwurf erstellt wurde. Er ist
keine zulaessige Implementierungsbaseline.

Insbesondere `Simulator.html`, `scenario-analyzer.js`, `results-metrics.js`,
`results-renderers.js`, `simulator-monte-carlo-browser.mjs`, `README.md`,
`TECHNICAL.md` und `SIMULATOR_MODULES_README.md` sind bereits fremd
veraendert. Vor einem Replay-Slice, der eine dieser Dateien benoetigt, muss der
zuständige Slice nachweisen, dass die Replay-Baseline sauber ist oder die
Fremdaenderungen bereits reviewt und committed wurden.

## 4. Produktentscheidung: bevorzugter Nutzerworkflow

### 4.1 Grundablauf

Der bevorzugte V1-Ablauf kombiniert die vorhandenen Eingabefelder mit einem
kleinen Replay-spezifischen Bedienbereich:

1. Der Nutzer startet wie bisher einen Monte-Carlo-Lauf.
2. Im Bereich `Szenario-Logs analysieren` waehlt er einen interessanten Lauf,
   beispielsweise `Worst Case`, `Worst MIT Pflege`, `P10` oder einen
   Zufallslauf.
3. Neben JSON und CSV erscheint die Aktion
   **`Diesen Lauf als Stresspfad fixieren`**.
4. Das System materialisiert den vollstaendigen exogenen Pfad, prueft seine
   Uebereinstimmung mit dem sichtbaren Ursprungslauf und speichert genau einen
   aktiven Replay-Arbeitsstand.
5. Ein sichtbarer Replay-Banner zeigt Quelle, internen Run-Index,
   Auswahlmetrik, Horizont, Terminalstatus und Fingerprint.
6. Die Baseline des Ursprungslaufs ist automatisch Variante 1 und kann nicht
   entfernt werden.
7. Der Nutzer aendert bereits sichtbare Strategieparameter an ihren heutigen
   Stellen, zum Beispiel Runway, Dynamic Flex oder Entnahmestrategie.
8. Gold- und Aktienfonds-Schalter werden in einem kompakten
   **Replay-Override-Bereich** angeboten. Sie veraendern weder das aktive
   Profil noch den gespeicherten realen Tranchenbestand.
9. `Aenderungen pruefen` zeigt den exakten Patch gegen die eingefrorene
   Baseline und blockiert nicht erlaubte Aenderungen.
10. `Als Variante berechnen` fuehrt den festen Pfad aus und fuegt das Ergebnis
    als Variante 2, 3 oder 4 hinzu.
11. Nach weiteren Parameteraenderungen koennen weitere Varianten hinzugefuegt
    werden.
12. Die Vergleichsansicht zeigt Gesamtwerte, Jahresdeltas und die ersten
    materiellen Abweichungsjahre.

### 4.2 Warum kein vollstaendig separater Varianteneditor vorgesehen ist

Viele gewuenschte Parameter besitzen bereits validierte UI-Felder und
Normalisierer. Eine zweite vollstaendige Eingabemaske wuerde leicht andere
Defaults, Einheiten oder Validierungsregeln entwickeln. Deshalb werden
vorhandene Felder wiederverwendet, wo das fachlich sicher ist.

Gold ist heute profilgesteuert und in `Simulator.html` nur als verborgenes,
`data-no-persist` markiertes Feld vorhanden. Ein allgemeiner Schalter
`Aktienfonds aktiv` existiert nicht. Fuer diese beiden Faktoren ist daher ein
Replay-spezifischer Override sicherer als eine Mutation des Profils oder der
realen Tranchen.

### 4.3 Persistenzumfang in V1

V1 speichert genau **einen aktiven Replay-Arbeitsstand**:

- den fixierten exogenen Pfad;
- den eingefrorenen Baseline-Request;
- die Baseline-Identitaet;
- maximal drei alternative Varianten-Patches;
- kompakte Variantenmetadaten.

Vollstaendige Jahreslogs muessen nicht dauerhaft gespeichert werden. Sie
koennen aus Pfad und Patch deterministisch erneut erzeugt werden. Das reduziert
Speicherverbrauch und verhindert veraltete Ergebnisduplikate.

Ein zweiter fixierter Pfad ersetzt den ersten nur nach sichtbarer
Bestaetigung. `Stresspfad verwerfen` loescht ausschliesslich den Replay-Eintrag,
nicht Profile, Tranchen oder allgemeine Simulatorwerte.

## 5. Begriffe und fachliche Grenzen

### 5.1 Bestehendes Monte-Carlo-Replay

`extractMonteCarloReplayArgsV1()` kann bereits einen vollstaendigen
Monte-Carlo-Request aus dem Export rekonstruieren. Dieser Ablauf wiederholt
den gesamten stochastischen Lauf mit identischem Seed und identischer
Konfiguration.

Das neue Feature ist davon zu unterscheiden:

| Begriff | Bedeutung |
| --- | --- |
| Monte-Carlo-Run-Replay | Wiederholt den gesamten MC-Request mit Seed und Samplingverfahren |
| Stress-Pfad-Replay | Berechnet einen einzelnen bereits materialisierten exogenen Pfad ohne neue Zufallsziehung |
| Variante | Baseline oder kontrollierter Strategie-Patch auf demselben Stresspfad |
| Vergleichssitzung | Ein Pfad mit Baseline und insgesamt zwei bis vier Varianten |

Neue Funktions- und Contractnamen muessen die Begriffe eindeutig trennen.
`extractMonteCarloReplayArgsV1()` wird weder umdefiniert noch fuer den neuen
Pfadvertrag missbraucht.

### 5.2 Exogener Pfad

Ein `StressReplayPathV1` ist mehr als eine Liste historischer Jahreszahlen. Er
enthaelt alle von der Strategie unabhaengigen Tatsachen, die im Ursprungslauf
wirksam waren:

- effektive Aktienrendite nach Stress- und Tail-Risk-Anwendung;
- effektive Goldrendite;
- Geldmarkt-/Cashrendite;
- Inflation;
- Lohnentwicklung;
- CAPE-Wert beziehungsweise seine wirksame Jahresquelle;
- historisches Quelljahr und Regime;
- Tail-Risk-Ereignis und Skip-Grund;
- P1-/P2-Lebensstatus;
- Pflegeaktivitaet, Pflegegrad, Pflegekostenparameter und Flexfaktor;
- Hinterbliebenenstatus;
- Verkuerzung einer Ansparphase durch Pflege;
- Kennzeichnung, ob das Jahr finanziell ausgewertet wurde.

Der Pfad enthaelt zusaetzlich eine abgeleitete
`historicalYearSequence`. Diese ist fuer Anzeige und schnelle Kontrolle
gedacht, aber nicht die alleinige Rechenquelle.

### 5.3 Fixierte und veraenderbare Groessen

Folgende Groessen bleiben im V1-Vergleich zwingend fixiert:

- Personen, Alter, Geschlecht und Partnerkonfiguration;
- Mortalitaets- und Pflegemodell;
- konkrete Todes-, Pflege- und Witwenereignisse;
- Renten, Rentenstart und Rentenanpassungsquelle;
- Floor, Flexbedarf, Pflegebedarf und deren Ausgangsbasis;
- Simulationshorizont;
- historische Datenbasis und effektiver Marktpfad;
- Stresspreset, Tail-Risk-Konfiguration und deren realisierte Ereignisse;
- Steuerparameter der Personen;
- Health-Bucket-Ausgangszustand;
- Akkumulationsstart und Haushaltslebenslauf.

Diese Felder duerfen nicht unbemerkt aus dem aktuellen UI in eine Variante
uebernommen werden. Abweichungen erzeugen einen fail-closed
`STRESS_REPLAY_VARIANT_FIELD_FORBIDDEN`-Fehler mit Feldliste.

Veraenderbar sind ausschliesslich versioniert freigegebene Strategiefelder.

## 6. Variantenkatalog V1

### 6.1 Pflichtfaktoren

V1 muss mindestens folgende Gegenfaktoren unterstuetzen:

1. **Gold aktiv / inaktiv**
   - Contractfeld: `assetAllocation.goldEnabled`.
   - Beim Aktivieren ist zusaetzlich `goldTargetPct` erforderlich.
   - Ein boolesches `Gold an` ohne Zielhoehe ist unvollstaendig und wird
     abgewiesen.

2. **Aktienfonds aktiv / inaktiv**
   - Contractfeld: `assetAllocation.equityFundEnabled`.
   - `Fonds` bedeutet fachlich ausschliesslich Tranchen der Kategorie
     `equity`, also Aktienfonds beziehungsweise Aktien-ETF.
   - Ein Geldmarkt-ETF ist Liquiditaet und darf nicht versehentlich als
     `Fonds` deaktiviert werden.

### 6.2 Empfohlene weitere V1-Faktoren

Der V1-Whitelist werden ausserdem folgende bereits vorhandene
Strategieparameter zugeordnet:

| Gruppe | Felder | Bemerkung |
| --- | --- | --- |
| Goldsteuerung | `goldTargetPct`, `rebalancingBand` | Goldziel nur bei aktivem Gold |
| Liquiditaet | `liquidityRunwayYears`, optional `minCashBufferMonths` | Bestehende Vertragsgrenzen bleiben verbindlich |
| Aktienverkauf | `maxSkimPctOfEq`, `maxBearRefillPctOfEq` | Keine stillen Klemmen |
| Entnahme | `decumulation.mode` | `standard` oder `3_bucket_jilge` |
| 3-Bucket | `bondTargetFactor`, `drawdownTrigger`, `bondRefillThreshold` | Nur bei passender Strategie anwendbar |
| Dynamic Flex | `dynamicFlex`, `survivalQuantile`, `goGoActive`, `goGoMultiplier` | Bestehende Normalisierung nutzen |
| Langlebigkeitspuffer | `longevityMode` und zugehoerige Parameter | Life-Events bleiben trotzdem fixiert |
| Komfortschutz | `minimumFlexAnnual`, `flexBudgetAnnual`, `flexBudgetYears`, `flexBudgetRecharge` | Nur nach eigener fachlicher Bestaetigung im Planreview |

Der Variantenvertrag verwendet konkrete Property-Pfade und keinen beliebigen
Objekt-Merge. Jeder unbekannte Pfad wird abgewiesen.

### 6.3 Nicht-Scope des Variantenkatalogs V1

V1 veraendert nicht:

- Alter, Geschlecht, Partner oder Pflegewahrscheinlichkeiten;
- Rentenhoehen und Rentenstart;
- Floor- oder Flex-Grundbedarf;
- Steuerrecht oder Sparer-Pauschbetrag;
- historische Daten;
- MC-Samplingmethode, Seed oder Startjahrfilter;
- Tail-Risk- oder Stressparameter;
- Health-Bucket-Ziel oder Pflegekostenmodell;
- reale Profile oder gespeicherte Tranchen;
- Engine-Semantik.

Ein spaeterer Ausbau darf solche Faktoren nur mit einem neuen
Path-Scope- beziehungsweise Variantenvertrag aufnehmen.

## 7. Gegenfaktische Startallokation fuer Gold und Aktienfonds

### 7.1 Problem

`Gold an/aus` und `Aktienfonds an/aus` sind ohne Reallokationsregel
unvollstaendig. Das Ausschalten einer Anlageklasse darf Vermoegen weder
verschwinden lassen noch still einer beliebigen anderen Anlageklasse
zuschlagen.

Ausserdem muss unterschieden werden zwischen:

- einer hypothetisch anderen Startaufteilung;
- einer tatsaechlichen Umschichtung zum Simulationsstart mit Verkaufsteuer;
- einer reinen Aenderung der kuenftigen Zielpolicy bei unveraendertem
  Startbestand.

### 7.2 Vorgeschlagener V1-Vertrag

V1 verwendet den expliziten Modus
`counterfactual_start_allocation_without_year_zero_transaction`:

- Gesamtvermoegen bleibt centgenau erhalten.
- Health-Bucket sowie die bereits vorhandenen Cash- und Geldmarktpositionen
  werden nicht reduziert oder umetikettiert.
- Deaktivierte Gold- oder Equity-Tranchen werden aus dem
  Gegenfaktual-Startbestand entfernt; derselbe Marktwert wird einem
  synthetischen Geldmarktbestand zugeschlagen. Dadurch steigt die gesamte
  liquide Anlage bewusst, waehrend das Gesamtvermoegen gleich bleibt. Das ist
  die Folge des ausgewaehlten Reallokationsziels und wird im
  Transformationsledger sichtbar.
- Der synthetische Gegenfaktualbestand erhaelt Einstandswert gleich Marktwert.
- Es entsteht keine Jahr-0-Verkaufsteuer.
- Der Vorgang wird nicht als realer Umschichtungsplan bezeichnet.
- Die UI zeigt dauerhaft den Hinweis
  `Hypothetische Startaufteilung; keine Steuer- oder Handelsempfehlung`.

Der empfohlene Zielort `money_market` ist konservativ und verhindert, dass das
Abschalten einer Risikoanlage automatisch die andere Risikoanlage vergroessert.
Der Vergleich misst damit gemeinsam die Wirkung der entfernten Anlageklasse
und ihrer ausdruecklichen Umschichtung in Geldmarkt. Er darf nicht als reine
Isolation des Anlageklassenlabels ohne Reallokation beschrieben werden.

### 7.3 Gold aktivieren, wenn die Baseline kein Gold besitzt

Beim Aktivieren von Gold muss der Nutzer eine Zielquote angeben. Der
Transformationsvertrag:

1. ermittelt das investierbare Vermoegen ohne Health-Bucket und ohne fest
   geschuetzte operative Ausgangsliquiditaet;
2. berechnet den Goldzielbetrag aus dem versionierten Nenner;
3. entnimmt den fehlenden Betrag zuerst aus Aktienfonds, soweit diese aktiv
   sind;
4. verwendet danach nur den fuer Gegenfaktualallokation freigegebenen
   Geldmarktanteil;
5. lehnt die Variante ab, wenn das Ziel ohne Verletzung geschuetzter Bestaende
   nicht erreichbar ist;
6. erzeugt synthetische `simreplay:`-Tranche-IDs und ein vollstaendiges
   Transformationsledger.

Der genaue Nenner und der geschuetzte Liquiditaetsanteil werden in Slice 04
als versionierter `StressReplayStartAllocationContractV1` fixiert. Eine
stille Uebernahme der heutigen Legacy-Initialisierungslogik ist nicht erlaubt.

### 7.4 Randfaelle

- Sind Gold und Aktienfonds aus, liegt das investierbare Gegenfaktualvermoegen
  im Geldmarkt.
- Das Deaktivieren einer bereits fehlenden Klasse ist ein sichtbarer No-op.
- Eine Variante, die ausschliesslich aus No-ops besteht, wird nicht als neue
  Variante gespeichert.
- Bonds der 3-Bucket-Strategie sind keine Aktienfonds und bleiben separat.
- Geldmarkt-ETF wird nicht ueber eine Namenssuche, sondern ueber die
  Tranche-Kategorie erkannt.
- Negative, nicht finite oder widerspruechliche Markt- und Einstandswerte
  werden fail-closed abgewiesen.
- Die Summe aller transformierten Marktwerte muss mit der Baseline innerhalb
  der vorhandenen Centtoleranz uebereinstimmen.

### 7.5 Spaeterer Nicht-Scope

Ein Modus `actual_transition_at_year_zero_with_tax` kann spaeter geplant
werden. Er ist nicht Teil von V1, weil er die Steuer- und
Transaktionssemantik erweitert und ein eigenes Engine- und Nutzerorakel
benoetigt.

## 8. Vertragsmodell

### 8.1 `StressReplayPathV1`

Der Pfadvertrag besitzt mindestens folgende Struktur:

```text
StressReplayPathV1
|- schemaVersion
|- pathScope = full_exogenous_path_v1
|- source
|  |- monteCarloRequestFingerprint
|  |- monteCarloRunId
|  |- seed
|  |- runIndexZeroBased
|  |- userFacingRunNumberOneBased
|  |- scenarioKey
|  |- scenarioLabel
|  |- selectionMetric
|  |- selectionValue
|  |- tieBreakPolicy
|  `- sourceTerminalOutcome
|- horizonYears
|- effectivePathLengthYears
|- historicalYearSequence
|- years[]
|  |- simulationYearIndexZeroBased
|  |- simulationYearNumberOneBased
|  |- financiallyEvaluable
|  |- market
|  |  |- historicalYear
|  |  |- equityReturnRatio
|  |  |- goldReturnPct
|  |  |- cashReturnPct
|  |  |- inflationPct
|  |  |- wageGrowthPct
|  |  |- capeRatio
|  |  `- regime
|  |- stressAndTailRisk
|  `- householdEvents
|- sourcePrefix
|  |- observedYears
|  |- reconciledAgainstScenarioLog
|  `- fingerprint
|- continuation
|  |- required
|  |- startsAfterSourceRuinYear
|  `- policy
|- dataFingerprint
|- engineFingerprint
|- baselineScenarioFingerprint
`- pathFingerprint
```

Alle Einheiten werden im Contract ausgeschrieben. Die heutigen gemischten
Rohfelder `rendite` als Ratio und `gold_eur_perf` als Prozentwert duerfen nicht
ohne Unit-Contract exportiert werden.

### 8.2 `StressReplayVariantV1`

```text
StressReplayVariantV1
|- schemaVersion
|- variantId
|- label
|- role = baseline | alternative
|- baselineScenarioFingerprint
|- patch
|  |- allowedPaths[]
|  `- values
|- assetAllocationTransformation
|- normalizedInputsFingerprint
`- warnings
```

`variantId` ist stabil und nicht vom Anzeigenamen abhaengig. Die Baseline
enthaelt einen leeren Patch. Eine Alternative muss mindestens eine materielle,
validierte Aenderung enthalten.

### 8.3 `StressReplayVariantResultV1`

```text
StressReplayVariantResultV1
|- schemaVersion
|- pathFingerprint
|- variantId
|- resultFingerprint
|- terminalOutcome
|- summary
|- yearlyResults[]
|- scenarioLog: ScenarioLogExportV2
|- transactionEvents[]
|- missingness
|- warnings
`- technicalError
```

Technische Fehler sind kein Ruin und werden niemals als Nullwerte in eine
vergleichbare Ergebnisreihe aufgenommen.

### 8.4 `StressReplayComparisonV1`

```text
StressReplayComparisonV1
|- schemaVersion
|- pathFingerprint
|- baselineVariantId
|- variantOrder[]
|- variants[2..4]
|- pairwiseAgainstBaseline[]
|- firstDeltaMarkers
|- comparisonFingerprint
|- interpretation
`- warnings
```

Die Baseline zaehlt zu den zwei bis vier Varianten. V1 erlaubt somit maximal
drei Alternativen.

### 8.5 Exportwrapper

`ScenarioLogExportV2` bleibt der Vertrag fuer einen einzelnen bereits
materialisierten Log. Er wird nicht inhaltlich zum Replayprofil umdefiniert.

Der neue Export lautet:

```text
StressReplayComparisonExportV1
|- schemaId = de.ruhestandsapp.simulator.stress-replay
|- schemaVersion
|- exportedAtUtc
|- app
|- engine
|- replaySourcePath
|- baselineScenario
|- comparison
|- fingerprint
|- compatibility
`- privacy
```

Jede Variante kann darin ihr eigenes `ScenarioLogExportV2` tragen. Der
Fingerprint schliesst `exportedAtUtc` aus. Unbekannte Versionen,
nicht-finite Zahlen, lokale Pfade und Secret-Felder werden fail-closed
abgewiesen.

## 9. Materialisierung des ausgewaehlten Monte-Carlo-Pfades

### 9.1 Quellidentitaet

Die Szenarioauswahl muss kuenftig mindestens transportieren:

- absoluten internen `runIdx`;
- nutzerlesbare 1-basierte Laufnummer;
- Szenarioschluessel und Label;
- Auswahlmetrik und Tie-Break-Regel;
- Source-Request- und Run-Fingerprint;
- vorhandene `ScenarioLogExportV2`-Zeilen.

`Worst Case` darf nicht als unqualifizierte fachliche Wahrheit behandelt
werden. Der heutige Auswahlvertrag `niedrigstes nominales Endvermoegen` und
sein Gleichstandsverhalten werden sichtbar ausgewiesen.

### 9.2 Per-Run-Seed als V1-Voraussetzung

V1 unterstuetzt nur MC-Quellen mit `rngMode = per-run-seed`. Der Defaultmodus
ist damit abgedeckt und ein einzelner absoluter Run kann isoliert reproduziert
werden.

`legacy-stream` wird mit
`STRESS_REPLAY_SOURCE_RNG_MODE_UNSUPPORTED` abgewiesen. Eine Unterstuetzung
wuerde alle vorherigen Runs erneut abspielen muessen und erhoeht Komplexitaet
und Fehlerrisiko ohne ausreichenden V1-Nutzen.

### 9.3 Source-Prefix

Der ausgewaehlte Run wird nach dem MC-Lauf seriell mit dem eingefrorenen
`MonteCarloRunRequestV1` und seinem absoluten Run-Index nachgezogen. Die
Materialisierung muss bis zum Ursprungsterminal exakt dieselbe Reihenfolge
verwenden wie der bestehende Runner:

1. Samplingjahr ermitteln;
2. Stressoverride anwenden;
3. Tail-Risk-Overlay anwenden;
4. Pflegezustand aktualisieren;
5. Mortalitaet und Hinterbliebenenstatus aktualisieren;
6. wirksame Jahresdaten und Household-Events erfassen;
7. den normalen Finanzjahrespfad ausfuehren;
8. die Capture-Zeile mit dem Ursprungsszenariolog reconciliieren.

Mindestens historisches Jahr, effektive Renditen, Inflation, Life-Status und
Terminalzeitpunkt muessen uebereinstimmen. Bereits eine Abweichung erzeugt
`STRESS_REPLAY_SOURCE_PREFIX_MISMATCH`; der Pfad wird nicht gespeichert.

### 9.4 Fortsetzung nach Ursprungstermination

Bei `horizon_exhausted` ist der Pfad bereits vollstaendig.

Bei `all_dead` endet der exogene Haushaltspfad. Da alle Varianten dieselben
Life-Events besitzen, kann keine Variante danach finanziell weiterlaufen.

Bei `ruin` kann eine alternative Strategie hingegen ueberleben. Die
Materialisierung setzt deshalb nach dem Ruinjahr einen reinen exogenen
Shadow-Loop fort:

- der Samplingstate wird aus dem Ruinjahr weiterverwendet;
- Markt-, Stress- und Tail-Risk-Schritte werden weiter ausgefuehrt;
- Life- und Pflegeereignisse werden weiter materialisiert;
- `simulateOneYear()` wird fuer die bereits ruinierte Quellstrategie nicht
  mehr aufgerufen;
- die Fortsetzung endet bei gemeinsamem Tod oder am Requesthorizont;
- die Policy wird als
  `post_source_ruin_exogenous_continuation_v1` ausgewiesen.

Diese Fortsetzung ist kein beobachtetes Finanzergebnis des Ursprungslaufs. Sie
ist der definierte exogene Restpfad, den eine ueberlebende Gegenfaktualvariante
benoetigt.

### 9.5 Keine Aenderung der normalen MC-Semantik

Path-Capture ist opt-in und nur fuer den ausgewaehlten seriellen Nachlauf
aktiv. Normale Monte-Carlo-Batches, Worker-Chunks, Sweep und Auto-Optimize
duerfen weder zusaetzliche Pfaddaten materialisieren noch andere Zufallszahlen
verbrauchen.

Ohne Capture-Option muessen bestehende MC-Resultate, Samplingdiagnostik,
Snapshots und Workerparitaet unveraendert bleiben.

## 10. Deterministischer Replay-Runner

### 10.1 Modulgrenze

Der neue DOM-freie Runner soll als eigenstaendiges Modul unter
`app/simulator/` entstehen. Er konsumiert keine Samplingmethode und keinen
RNG. Er verwendet:

- `initMcRunState()` beziehungsweise dieselbe kanonische
  Portfolioinitialisierung;
- `simulateOneYear()` aus dem bestehenden Engine-Wrapper;
- die wirksamen Jahresdaten des Pfadvertrags;
- die materialisierten Household-Events;
- vorhandene Horizon-, Log- und Metrikhelfer, soweit deren Contract passt.

Die finanzielle Jahreslogik wird nicht kopiert. Nur die mehrjaehrige
Orchestrierung fuer einen bereits materialisierten Pfad ist neu.

### 10.2 Ablauf pro Variante

1. Pfad und Variante validieren und tief klonen beziehungsweise einfrieren.
2. Baseline-Inputs aus dem Source-Request laden.
3. erlaubten Varianten-Patch anwenden.
4. Eingaben mit `validateSimulatorInputs()` und vorhandenen
   Engine-Vertraegen validieren.
5. gegebenenfalls den Gegenfaktual-Startbestand erzeugen.
6. den Startzustand initialisieren.
7. je Pfadjahr die gespeicherten Marktdaten und Household-Events anwenden.
8. `simulateOneYear()` ausfuehren.
9. finanzielle Jahreszeile, Transaktionsereignisse und Drawdownserie erfassen.
10. bei technischem Fehler fail-closed abbrechen.
11. bei Variantenruin eine terminale Ruinzeile schreiben; der feste Pfad
    bleibt unveraendert und kann fuer andere Varianten weiterlaufen.
12. beim fixierten Tod aller Personen oder am Horizont beenden.
13. `StressReplayVariantResultV1` erstellen und fingerprinten.

### 10.3 Baseline-Reconciliation

Die erste harte Abnahmebedingung des Runners ist:

> Die leere Baseline-Variante reproduziert den finanziell ausgewerteten
> Ursprungslauf bis zu dessen Terminalereignis in derselben Runtime und mit
> denselben Daten- und Enginefingerprints.

Verglichen wird eine kanonische Finanzprojektion, nicht beliebige
UI-Metadaten. Abweichungen ab einem Cent in Geldfeldern, ab der vertraglichen
Toleranz in Ratios oder in diskreten Statusfeldern blockieren das Speichern
und Ausfuehren des Pfades.

### 10.4 Determinismusgrenze

Gleichheit wird nur zugesagt bei identischem:

- Pfadfingerprint;
- Variantenfingerprint;
- Enginefingerprint;
- Datenfingerprint;
- Contractstand;
- Runtime-Rechenpfad.

Importierte Pfade mit unpassendem Daten- oder Enginefingerprint duerfen
gelesen und angezeigt, aber nicht als exaktes Replay ausgefuehrt werden. Die
UI nennt den konkreten Mismatch.

## 11. Vergleichsmetriken und Delta-Ledger

### 11.1 Gesamtmetriken je Variante

V1 weist mindestens aus:

- nominales Endvermoegen;
- reales Endvermoegen zur Preisbasis des Simulationsstarts;
- maximaler nominaler Drawdown als positiver Verlustbetrag in Prozentpunkten;
- maximaler realer Drawdown;
- Terminalstatus `ruin`, `all_dead`, `horizon_exhausted` oder
  `technical_error`;
- Ruinjahr als Simulationsjahr, Alter P1/P2 und historisches Quelljahr;
- kumulierte tatsaechliche Depotentnahme nominal und real;
- kumuliertes erfuelltes Haushalts-Flex;
- kumulierter Mindest-Flex-Fehlbetrag;
- Anzahl und Volumen echter Liquiditaets-Notverkaeufe;
- Anzahl und Volumen planmaessiger Rebalancingverkaeufe;
- 3-Bucket-Bond-Refill separat von Notverkaeufen;
- kumulierte Steuer und Verlustvortragsersparnis;
- Health-Bucket-Nutzung, sofern anwendbar;
- Beobachtungszahlen und Missingness.

### 11.2 Transaktionsklassifikation

Der Vergleich darf nicht jede Veraeusserung als Notverkauf bezeichnen.
Mindestens folgende Ereigniscodes werden getrennt:

| Code | Bedeutung |
| --- | --- |
| `liquidity_shortfall_forced_sale` | zusaetzlicher Verkauf zur Deckung eines vor Auszahlung bestehenden Liquiditaetsdefizits |
| `payout_floor_fallback_sale` | nachgelagerter Verkauf zur Floor-Deckung |
| `bond_refill_sale` | planmaessige Auffuellung des 3-Bucket-Bondpuffers |
| `policy_rebalancing_sale` | regulaere Policy-/Rebalancingentscheidung |
| `asset_allocation_initial_transform` | hypothetische Startallokation, kein Jahresverkauf |

Brutto, Netto, Steuer, Anlageklasse, Marktstatus und Trigger werden soweit im
existierenden Rechenpfad vorhanden strukturiert transportiert. Fehlt eine
fachlich notwendige Information, wird sie nicht aus Anzeigetexten geraten.

### 11.3 Erste Delta-Marker

Ein einzelner Marker `ab hier anders` ist nicht ausreichend. V1 berechnet
gegen die Baseline:

- `firstPortfolioStateDeltaYear`;
- `firstPolicyDecisionDeltaYear`;
- `firstRebalancingDeltaYear`;
- `firstForcedSaleDeltaYear`;
- `firstHouseholdFlexDeltaYear`;
- `firstMinimumFlexShortfallDeltaYear`;
- `firstTerminalOutcomeDeltaYear`.

Jeder Marker enthaelt:

- 1-basiertes Simulationsjahr;
- historisches Quelljahr;
- Cause-Code;
- betroffene Felder;
- Baselinewert und Variantenwert;
- absolute und relative Differenz, soweit anwendbar.

Geldwerte gelten ab einem Cent als materiell verschieden. Fuer Ratios und
Prozentwerte wird eine im Contract benannte numerische Toleranz verwendet.

### 11.4 Darstellung ohne Scheinkausalitaet

Die Vergleichsansicht verwendet Formulierungen wie:

- `Auf diesem fixierten Stresspfad ...`;
- `Gegenueber der Baseline ...`;
- `Erste unterschiedliche Policyentscheidung ...`.

Sie vermeidet:

- `Gold beweist ...`;
- `optimale Strategie`;
- `garantiert`;
- `verhindert allgemein`.

Wenn eine Variante mehrere Parameter gleichzeitig aendert, zeigt die UI
`Mehr-Faktor-Variante; Einzelursachen nicht isoliert`.

## 12. Persistenz, Export und Wiederaufnahme

### 12.1 Lokale Persistenz

Vorgesehener Schluessel:

```text
sim.stressReplay.active.v1
```

Der vorhandene `sim.`-Praefix ist bereits Teil der Persistence-Key-Policy.
Trotzdem muss Slice 06 testen, dass Browser-, IndexedDB- und Tauri-Adapter den
Eintrag konsistent behandeln und dass der allgemeine Backup-/Restore-Pfad
nicht gebrochen wird.

Der persistierte Envelope enthaelt:

- Schema- und Contractversion;
- aktiven Pfad;
- Baseline-Snapshot;
- Varianten-Patches und Reihenfolge;
- Fingerprints;
- Erstellungs- und letzte Nutzungszeit;
- keine vollstaendigen neu berechenbaren Jahreslogs;
- keine lokalen Pfade, Secrets oder fremden Persistenzdaten.

### 12.2 Groessenlimits

Vorgeschlagene V1-Grenzen:

- maximal 1 MiB fuer den materialisierten Pfad;
- maximal 2 MiB fuer den gesamten persistierten Replay-Envelope;
- maximal vier Varianten inklusive Baseline;
- maximal der bereits validierte MC-Horizont;
- genau ein aktiver Replay-Arbeitsstand.

Ueberschreitungen werden vor dem Schreiben mit
`STRESS_REPLAY_PERSISTENCE_SIZE_LIMIT` abgewiesen. Es gibt kein stilles
Abschneiden von Jahren oder Eventfeldern.

### 12.3 Korruptionsverhalten

Ein unlesbarer persistierter Pfad wird nicht automatisch geloescht. Die UI
zeigt:

- Fehlercode und lesbare Kurzbeschreibung;
- `Exportieren, falls noch lesbar`;
- `Replay-Daten verwerfen` als ausdrueckliche Nutzeraktion.

Der normale Simulator bleibt trotz eines korrupten Replay-Eintrags nutzbar.

### 12.4 JSON-Export und Import

Der Nutzer kann:

- den aktiven Pfad beziehungsweise die Vergleichssitzung exportieren;
- eine `StressReplayComparisonExportV1` importieren;
- inkompatible Exporte im Nur-Lesen-Modus inspizieren;
- kompatible Exporte als aktiven Replay-Arbeitsstand uebernehmen.

Vor einer Uebernahme werden Schema, Fingerprint, Groesse, Variantenanzahl,
Einheiten, nicht-finite Werte, Datenfingerprint und Enginefingerprint geprueft.
Ein Import ersetzt einen vorhandenen aktiven Pfad nur nach Bestaetigung.

## 13. UI- und Interaktionsentwurf

### 13.1 Erweiterung des Szenario-Logbereichs

Der bestehende Dropdown bleibt der Auswahlmechanismus. Sobald ein Szenario
mit vollstaendiger Quellidentitaet ausgewaehlt ist, werden angeboten:

- `JSON`;
- `CSV`;
- `Diesen Lauf als Stresspfad fixieren`.

Der Fixieren-Button ist deaktiviert mit sichtbarem Grund, wenn:

- noch kein Szenario gewaehlt wurde;
- die Source-Request-Identitaet fehlt;
- `legacy-stream` verwendet wurde;
- der MC-Lauf technisch fehlerhaft war;
- ein Pfad bereits materialisiert wird;
- der Ursprungslauf nicht reconciliert werden kann.

### 13.2 Replay-Banner

Nach erfolgreichem Fixieren erscheint oberhalb oder direkt unterhalb des
Szenario-Logs ein dauerhaft sichtbarer Banner:

```text
Fixierter Stresspfad aktiv
Quelle: Worst Case nach nominalem Endvermoegen
Lauf: intern 417 / Anzeige #418
Pfad: 30 Jahre, davon 12 Jahre bis Quellruin
Fortsetzung: exogener Shadow-Pfad ab Jahr 13
Fingerprint: 4f8a...91c2
```

Aktionen:

- `Baseline anzeigen`;
- `Basiseinstellungen in die Eingabefelder laden`;
- `Replay exportieren`;
- `Replay importieren`;
- `Stresspfad verwerfen`.

Das Laden der Basiseinstellungen ist eine ausdrueckliche Aktion. Es darf
nicht automatisch Profile oder Tranchen ueberschreiben.

### 13.3 Replay-Override-Bereich

Der kompakte Assetbereich enthaelt:

- Checkbox `Gold im Gegenfaktum`;
- Feld `Goldziel (%)`, nur bei aktivem Gold;
- Checkbox `Aktienfonds / Aktien-ETF im Gegenfaktum`;
- Anzeige `Freigesetztes Vermoegen geht in Geldmarkt`;
- Hinweis zur hypothetischen Startallokation und Jahr-0-Steuergrenze.

Bereits vorhandene Strategieparameter verbleiben an ihrer normalen Stelle.
Der Replaybereich zeigt zusaetzlich eine zusammengefasste Patchvorschau, etwa:

```text
Gold: aus -> an, Ziel 7,5 %
Aktienfonds: an -> an
Liquiditaets-Runway: 5,0 -> 7,0 Jahre
Entnahme: standard -> 3_bucket_jilge
```

Verbotene aktuelle UI-Aenderungen werden separat aufgelistet und nicht in den
Patch aufgenommen.

### 13.4 Variantenliste

Die Liste enthaelt zwei bis vier Eintraege:

- Baseline, fix und nicht loeschbar;
- Alternative A;
- Alternative B;
- Alternative C.

Jede Alternative besitzt:

- frei waehlbaren kurzen Namen;
- Patchzusammenfassung;
- Ergebnisstatus;
- `neu berechnen`;
- `entfernen`;
- `Jahreslog anzeigen`.

Eine vierte Alternative wird blockiert, sobald insgesamt vier Varianten
vorliegen. Entfernen veraendert nicht die Ergebnisse der verbleibenden
Varianten.

### 13.5 Vergleichsansicht

Vorgesehen sind drei Ebenen:

1. **KPI-Tabelle** mit Varianten als Spalten.
2. **Delta-Timeline** mit den ersten unterschiedlichen Ereignissen.
3. **Jahrestabelle** mit auswaehlbaren Feldern und Baseline-Deltas.

Die Ansicht muss ohne Farbe bedienbar sein, Tastaturfokus besitzen und
Statusaenderungen ueber `aria-live` mitteilen. In schmalen Viewports ist eine
horizontale, beschriftete Vergleichstabelle zulaessig; die Seite selbst darf
nicht unkontrolliert horizontal ueberlaufen.

## 14. Architektur und vorgesehene Module

### 14.1 Neue DOM-freie Module

| Modul | Verantwortung |
| --- | --- |
| `app/simulator/stress-replay-contract.js` | Versionen, Validierung, Normalisierung, Freeze, Fingerprints, Variant-Whitelist |
| `app/simulator/stress-replay-path-materializer.js` | Quellrun-Rekonstruktion, Capture, Source-Prefix-Reconciliation, Post-Ruin-Fortsetzung |
| `app/simulator/stress-replay-runner.js` | Deterministischer Einpfad-Runner ohne RNG |
| `app/simulator/stress-replay-variant.js` | Patchvalidierung und gegenfaktische Startallokation |
| `app/simulator/stress-replay-comparison.js` | Variantenorchestrierung, KPIs, Delta-Marker und Eventvergleich |
| `app/simulator/stress-replay-export.js` | Export-/Importwrapper und Kompatibilitaet |
| `app/simulator/stress-replay-persistence.js` | genau ein aktiver Replay-Arbeitsstand ueber PersistenceFacade |

### 14.2 Neue UI-Module

| Modul | Verantwortung |
| --- | --- |
| `app/simulator/stress-replay-ui.js` | DOM-Bindung, Nutzeraktionen, Status- und Fehlerzustaende |
| `app/simulator/stress-replay-renderer.js` | Banner, Variantenliste, KPI-Tabelle, Delta-Timeline, Jahresvergleich |

### 14.3 Erwartete bestehende Integrationspunkte

| Bestehendes Modul | Erwartete additive Aenderung |
| --- | --- |
| `scenario-analyzer.js` | Run-Index, Auswahlmetrik und Tie-Break in Szenariometadaten bewahren |
| `simulator-monte-carlo.js` | Source-Request und selektierten seriellen Materialisierungsaufruf bereitstellen |
| `monte-carlo-runner.js` | opt-in Capture-Hook und Post-Ruin-Shadow-Fortsetzung ohne Defaultdelta |
| `simulator-results.js` | Fixieren-Aktion an die aktuelle Szenarioauswahl binden |
| `simulator-engine-direct.js` | strukturierte Transaktionsdiagnostik fuer Replay bereitstellen, ohne Finanzsemantik zu aendern |
| `simulator-year-result.js` | additive, vom normalen Szenariolog getrennte Diagnoseprojektion |
| `simulator-main-init.js` | Replay-UI nach initialisierter Persistenz starten |
| `simulator-main.js` | benoetigte explizite UI-Einstiegspunkte anbinden |
| `Simulator.html` | Banner-, Override-, Varianten- und Vergleichscontainer |
| `simulator.css` | responsive und zugaengliche Replay-Darstellung |

### 14.4 Nicht anzufassende Bereiche ohne neue Freigabe

- `engine.js` wird nie manuell bearbeitet.
- `engine/` und die oeffentliche `EngineAPI` sollen fuer V1 unveraendert
  bleiben.
- `workers/` werden nicht fuer Replay erweitert; der ausgewaehlte Pfad wird
  seriell materialisiert und wenige Varianten laufen lokal.
- historischer Backtest, Sweep und Auto-Optimize erhalten keinen neuen
  Ausfuehrungsmodus.
- `dist/` und `RuheStandSuite.exe` sind nicht Teil dieses Plans.
- Profil- und Tranchenpersistenz werden durch Replay nicht mutiert.

## 15. Umsetzungsslices

### 15.1 Uebersicht

| Slice | Datei | Ziel | Maximal erwartete produktive Dateien |
| --- | --- | --- | ---: |
| 01 | `SLICE_STRESS_REPLAY_01_CONTRACTS.md` | Pfad-, Varianten-, Ergebnis- und Fingerprintvertraege | 2-3 |
| 02 | `SLICE_STRESS_REPLAY_02_PATH_MATERIALIZATION.md` | ausgewählten MC-Run vollstaendig materialisieren | 5-6 |
| 03 | `SLICE_STRESS_REPLAY_03_DETERMINISTIC_RUNNER.md` | Baseline auf fixem Pfad deterministisch reproduzieren | 3-4 |
| 04 | `SLICE_STRESS_REPLAY_04_ASSET_VARIANTS.md` | Gold-/Aktienfonds-Gegenfaktum und Variantenpatches | 3-4 |
| 05 | `SLICE_STRESS_REPLAY_05_COMPARISON_METRICS.md` | 2-4 Varianten, Transaktionsdiagnostik und Delta-Ledger | 5-7 |
| 06 | `SLICE_STRESS_REPLAY_06_PERSISTENCE_EXPORT.md` | lokale Wiederaufnahme sowie JSON-Import/-Export | 4-5 |
| 07 | `SLICE_STRESS_REPLAY_07_UI_WORKFLOW.md` | Log fixieren, Varianten erzeugen und vergleichen | 7-8 |
| 08 | `SLICE_STRESS_REPLAY_08_INTEGRATION_DOCS.md` | End-to-End, Performance, Regressionsnachweis und Doku | 0-2 |

Jeder Slice erhaelt vor Beginn seine eigene MD mit Branch-/Statuscheck,
Diff-Risiko, Akzeptanzkriterien, Tests, Ergebnissen und Reviewstatus.

### 15.2 Slice 01 - Contracts und Determinismusorakel

**Ziel**

Die neue Funktion erhaelt zuerst stabile DOM-freie Vertraege. Kein UI- oder
Runnerverhalten wird in diesem Slice geaendert.

**Scope**

- `StressReplayPathV1`;
- `StressReplayVariantV1`;
- `StressReplayVariantResultV1`;
- `StressReplayComparisonV1`;
- Unit-Contract fuer Marktdaten;
- Source-, Daten-, Engine-, Pfad-, Varianten- und Ergebnisfingerprints;
- genaue Variant-Whitelist und verbotene Felder;
- Fehlercodes und Groessenlimits;
- kanonische Finanzprojektion fuer Baseline-Reconciliation.

**Voraussichtliche produktive Dateien**

- neu: `app/simulator/stress-replay-contract.js`;
- optional neu: `app/simulator/stress-replay-export.js`, sofern der reine
  Schemawrapper bereits sinnvoll isoliert werden kann;
- keine Aenderung am MC-Hot-Path.

**Tests**

- `tests/stress-replay-contract.test.mjs`;
- gueltige Minimal- und Maximalpfade;
- 1-basierte und 0-basierte Indexfelder ohne Vermischung;
- fehlende Jahre, doppelte Jahresindizes und Laengenwidersprueche;
- nicht-finite Werte und falsche Einheiten;
- unbekannte Variantenfelder;
- Baseline mit nicht leerem Patch;
- weniger als zwei oder mehr als vier Varianten;
- stabile Fingerprints bei anderer Erstellungszeit;
- Fingerprintdelta bei einer geaenderten Marktzahl oder einem Life-Event;
- Deep-Freeze und keine Mutation der Eingaben.

**Akzeptanzkriterien**

- Alle vier Kernvertraege sind versioniert und fail-closed validierbar.
- Eine historische Jahresliste ohne effektive Markt- und Life-Daten ist kein
  gueltiger Vollpfad.
- Der Fingerprint schliesst Zeitstempel und reine Anzeigenamen aus, aber alle
  rechenwirksamen Werte ein.
- Es gibt noch keinen bewusst roten Folgeslice-Zustand.

### 15.3 Slice 02 - MC-Quellidentitaet und Pfadmaterialisierung

**Ziel**

Ein ausgewaehlter per-run-seed-MC-Lauf wird als vollstaendiger exogener Pfad
materialisiert, ohne normale MC-Ergebnisse zu veraendern.

**Scope**

- Run-Index und Auswahlmetrik im `ScenarioAnalyzer` bewahren;
- aktuellen `MonteCarloRunRequestV1` an die Szenarioauswahl koppeln;
- serieller Nachlauf genau des ausgewaehlten absoluten Run-Index;
- opt-in Capture-Hook;
- Source-Prefix gegen `ScenarioLogExportV2` reconciliieren;
- Post-Ruin-Shadow-Fortsetzung;
- Tod und Horizont korrekt beenden;
- `legacy-stream` sichtbar blockieren;
- Worker-MC nutzt weiterhin nur den seriellen selektierten Nachlauf fuer
  Capture.

**Voraussichtliche produktive Dateien**

- neu: `app/simulator/stress-replay-path-materializer.js`;
- `app/simulator/monte-carlo-runner.js`;
- `app/simulator/scenario-analyzer.js`;
- `app/simulator/simulator-monte-carlo.js`;
- gegebenenfalls `app/simulator/mc-life-events.js` fuer einen gemeinsam
  testbaren Capture-Helper;
- keine Worker-Contractaenderung, sofern der serielle Nachlauf ausreicht.

**Tests**

- `tests/stress-replay-path-materializer.test.mjs`;
- IID/Regime, Fixed Block und Stationary Bootstrap;
- Startjahrregel und CAPE-Sampling;
- parametrischer Stress mit Noise;
- conditional bootstrap;
- Tail-Risk angewendet und wegen historischer Krise geskippt;
- Single- und Partnerhaushalt;
- Pflege P1/P2, Witwenstatus und Tod;
- Ursprung endet am Horizont;
- Ursprung stirbt vor Horizont;
- Ursprung ruiniert frueh, Pfad laeuft exogen weiter;
- Source-Prefix-Mismatch blockiert;
- direkter und Worker-MC liefern fuer denselben ausgewaehlten Run denselben
  Pfadfingerprint;
- normale MC-Snapshots und Samplingdiagnostik bleiben unveraendert.

**Akzeptanzkriterien**

- Jeder gueltige ausgewaehlte Default-MC-Run besitzt einen eindeutigen
  Pfadfingerprint.
- Ein Quellruin kuerzt den Gegenfaktualpfad nicht ab.
- Capture verbraucht im normalen MC-Pfad keine zusaetzlichen Zufallszahlen.
- Ein nicht reproduzierbarer Quellrun wird nicht gespeichert.

### 15.4 Slice 03 - Deterministischer Single-Path-Runner

**Ziel**

Die eingefrorene Baseline wird ohne Sampling und ohne RNG auf dem Pfad erneut
berechnet.

**Scope**

- neuer DOM-freier Runner;
- Pfadjahr in kanonisches `yearData` rueckprojizieren;
- fixierte Household-Events anwenden;
- vorhandene Jahresengine aufrufen;
- Terminal- und technische Fehler strikt trennen;
- nominale und reale Vermoegensserien;
- `ScenarioLogExportV2` je Replayresultat;
- Baseline-Reconciliation gegen Quelllog;
- Wiederholungsgleichheit und Input-Immutabilitaet.

**Voraussichtliche produktive Dateien**

- neu: `app/simulator/stress-replay-runner.js`;
- `app/simulator/stress-replay-contract.js`;
- gegebenenfalls `app/simulator/mc-log-builder.js` nur fuer eine gemeinsam
  nutzbare additive Projektion;
- keine UI.

**Tests**

- `tests/stress-replay-runner.test.mjs`;
- Baseline-Prefix exakt gegen Quellrun;
- zwei Wiederholungen ergeben denselben Ergebnisfingerprint;
- Ruin-, Tod-, Horizont- und Technical-Error-Faelle;
- Akkumulationsphase und durch Pflege verkuerzter Uebergang;
- P1/P2 und Witwenrente;
- reale Drawdown-Missingness bei ungueltiger Inflation blockiert;
- Pfad, Baseline-Inputs und Tranchelisten bleiben unveraendert;
- keine Abhaengigkeit von `Math.random` oder einem injizierten RNG.

**Akzeptanzkriterien**

- Die Baseline reproduziert den Quellrun in derselben Runtime.
- Der Runner konsumiert ausschliesslich den Pfad und fuehrt keine
  Markt-/Life-Ziehung aus.
- Technische Fehler werden nicht als Ruin gewertet.
- Der Runner ist DOM-frei und ohne Worker nutzbar.

### 15.5 Slice 04 - Gold-/Aktienfonds-Varianten und Patchvertrag

**Ziel**

Gold und Aktienfonds koennen im ausdruecklichen
Gegenfaktual-Startallokationsmodus an- beziehungsweise ausgeschaltet werden.
Weitere erlaubte Strategieparameter werden ueber denselben Whitelistvertrag
angewendet.

**Scope**

- `StressReplayStartAllocationContractV1`;
- `assetAllocation.goldEnabled`;
- `goldTargetPct`;
- `assetAllocation.equityFundEnabled`;
- Reallokationsziel `money_market`;
- synthetische `simreplay:`-Tranchen;
- Transformationsledger;
- Patch aus aktuellen normalisierten Simulatorwerten bilden;
- verbotene UI-Aenderungen erkennen;
- No-op-Erkennung;
- bestehende Simulatorvalidierung nach Patch erneut ausfuehren.

**Voraussichtliche produktive Dateien**

- neu: `app/simulator/stress-replay-variant.js`;
- `app/simulator/stress-replay-contract.js`;
- `app/simulator/stress-replay-runner.js`;
- nur falls zwingend ein kleiner wiederverwendbarer Export aus
  `simulator-portfolio-init.js`; keine Semantikaenderung der normalen
  Initialisierung.

**Tests**

- `tests/stress-replay-variant.test.mjs`;
- Gold an von 0 auf 7,5 Prozent;
- Gold aus bei bestehendem Gold;
- Aktienfonds aus, Geldmarkt-ETF bleibt erhalten;
- beide Risikoanlagen aus;
- Bonds werden nicht als Fonds entfernt;
- Health-Bucket sowie vorbestehende Cash-/Geldmarktpositionen werden nicht
  reduziert; die Gesamtliquiditaet darf durch die ausdrueckliche
  Reallokation steigen;
- Gesamtvermoegen und Transformationsledger reconciliieren centgenau;
- unzureichend reallokierbares Vermoegen blockiert;
- ungueltige Goldquote blockiert statt zu klemmen;
- nur No-op wird nicht gespeichert;
- Detailtranchen und Legacy-Aggregatpfad;
- Eingangsprofile und Originaltranchen bleiben unveraendert.

**Akzeptanzkriterien**

- `Gold ja/nein` und `Aktienfonds ja/nein` sind fachlich eindeutig und
  wertkonservierend umgesetzt.
- Keine Replayaktion schreibt in reale Profile oder `depot_tranchen`.
- Die UI-Semantik `Fonds` kann technisch keinen Geldmarkt-ETF treffen.
- Jahr-0-Steuern werden weder berechnet noch als beruecksichtigt behauptet.

### 15.6 Slice 05 - Multi-Varianten-Vergleich und Wirkungsmetriken

**Ziel**

Baseline und bis zu drei Alternativen werden reihenfolgeunabhaengig
berechnet, fachlich verglichen und mit strukturierten Transaktionsereignissen
versehen.

**Scope**

- Vergleichsorchestrator fuer zwei bis vier Varianten;
- Varianten laufen aus tief geklonten Startzustaenden;
- strukturierte Forced-Sale- und Bond-Refill-Diagnostik;
- Gesamtmetriken;
- Jahresdeltas;
- erste Delta-Marker;
- Single- versus Multi-Faktor-Kennzeichnung;
- Ergebnis- und Vergleichsfingerprint;
- Missingness und Technical-Error-Inventar.

**Voraussichtliche produktive Dateien**

- neu: `app/simulator/stress-replay-comparison.js`;
- `app/simulator/simulator-forced-sale.js`;
- `app/simulator/simulator-bond-refill.js`;
- `app/simulator/simulator-engine-direct.js`;
- `app/simulator/simulator-year-result.js`;
- `app/simulator/stress-replay-runner.js`;
- `app/simulator/stress-replay-contract.js`.

Die Transaktionsdiagnostik bleibt additiv und wird nicht automatisch in den
bestehenden `ScenarioLogExportV2`-Contract aufgenommen. Der Replayprojektor
entscheidet explizit, welche Diagnosefelder exportiert werden.

**Tests**

- `tests/stress-replay-comparison.test.mjs`;
- identische Varianten liefern identische Finanzprojektion;
- Variantenreihenfolge aendert keine Einzelresultate;
- Entfernen einer Variante aendert keine andere;
- Baseline plus drei Alternativen ist gueltig, eine vierte Alternative nicht;
- Forced Sale, Payout-Fallback, Bond-Refill und regulaerer Verkauf werden
  nicht verwechselt;
- Brutto-/Netto-/Steuer-Reconciliation;
- First-Delta-Marker fuer Startallokation, Policy, Notverkauf, Flex und Ruin;
- ein technischer Variantenfehler invalidiert nicht still die Baseline, aber
  blockiert die vergleichende Gesamtaussage;
- Goldfixture mit und ohne tatsaechliches Notverkaufsdelta;
- kein Akzeptanztest verlangt, dass Gold auf jedem Pfad besser abschneidet.

**Akzeptanzkriterien**

- Zwei bis vier Varianten werden auf exakt demselben Pfad berechnet.
- Baseline ist immer vorhanden und eindeutig.
- Notverkaufsanzahl und -volumen besitzen eine maschinenlesbare Definition.
- Mehr-Faktor-Varianten werden nicht als Einzelfaktorwirkung bezeichnet.
- Bestehende FlowDelta-, Backtest- und MC-Metriken veraendern sich ohne
  Replay nicht.

### 15.7 Slice 06 - Persistenz sowie Export/Import

**Ziel**

Ein fixierter Pfad ueberlebt Neuladen und kann als versioniertes JSON
exportiert beziehungsweise importiert werden.

**Scope**

- genau ein aktiver Persistenzeintrag;
- atomarer Write nach vollstaendiger Validierung;
- Wiederaufnahme nach Appstart;
- korrupte Daten fail-closed und explizit loeschbar;
- Varianten-Patches dauerhaft, Logs rekonstruktiv;
- `StressReplayComparisonExportV1`;
- eingebettete `ScenarioLogExportV2`-Variantenlogs;
- Import als exakt ausfuehrbar oder Nur-Lesen;
- Groessenlimit und Datenschutzfelder;
- Ersetzen nur nach Nutzerbestaetigung.

**Voraussichtliche produktive Dateien**

- neu: `app/simulator/stress-replay-persistence.js`;
- neu beziehungsweise erweitert: `app/simulator/stress-replay-export.js`;
- `app/simulator/stress-replay-contract.js`;
- gegebenenfalls `app/shared/persistence-key-policy.js` nur wenn ein
  expliziter Exact-Key statt des vorhandenen `sim.`-Praefixes erforderlich
  wird;
- keine Profilpersistenzdatei.

**Tests**

- `tests/stress-replay-persistence.test.mjs`;
- `tests/stress-replay-export.test.mjs`;
- Browser-/IndexedDB-/Tauri-Facade-Stubs;
- Write-/Read-Roundtrip;
- Neuaufbau der Logs aus Pfad und Variantenpatch;
- korrupte JSON-Daten bleiben isoliert;
- unbekannte Version und Fingerprintmanipulation;
- Daten-/Engine-Mismatch fuehrt zu Nur-Lesen;
- 1-MiB-/2-MiB-Grenzen;
- Backup-Key-Policy;
- keine lokalen Pfade, Secrets oder nicht-finiten Werte;
- `exportedAtUtc` aendert nicht den fachlichen Fingerprint.

**Akzeptanzkriterien**

- Ein aktiver Pfad ist nach Neuladen wieder verfuegbar.
- Replay-Persistenz mutiert keine anderen Schluessel.
- Inkompatible Exporte werden nicht ausgefuehrt.
- `ScenarioLogExportV2` bleibt ein eingebetteter Einzelpfadvertrag und wird
  nicht umdefiniert.

### 15.8 Slice 07 - Vollstaendiger UI-Workflow

**Ziel**

Der Nutzer kann den gesamten Ablauf ohne Entwicklerwerkzeuge bedienen:
Szenario waehlen, fixieren, Parameter aendern, Varianten erzeugen und
Jahreswirkungen vergleichen.

**Scope**

- Fixieren-Button im Szenario-Logbereich;
- Lade-, Erfolgs-, Fehler- und Unsupported-Zustaende;
- Replay-Banner;
- Asset-Override-Bereich;
- Patchvorschau aus normalen Simulatorfeldern;
- verbotene Aenderungen sichtbar machen;
- Baseline plus drei Alternativen;
- KPI-Tabelle, Delta-Timeline, Jahrestabelle;
- Export, Import, Verwerfen und Baseline-Laden;
- Tastaturbedienung, Fokus, `aria-live` und responsive Darstellung;
- Profil-/Tranchenwerte werden nicht automatisch geschrieben.

**Voraussichtliche produktive Dateien**

- neu: `app/simulator/stress-replay-ui.js`;
- neu: `app/simulator/stress-replay-renderer.js`;
- `app/simulator/simulator-results.js`;
- `app/simulator/simulator-main-init.js`;
- `app/simulator/simulator-main.js`;
- `Simulator.html`;
- `simulator.css`;
- optional `app/simulator/monte-carlo-ui.js`, falls Statusintegration dort
  fachlich besser passt.

**Tests**

- bestehende `tests/simulator-monte-carlo-browser.mjs` gezielt erweitern oder
  neues `tests/simulator-stress-replay-browser.mjs`;
- kein Szenario: Button deaktiviert;
- Worst, Worst mit Pflege und Zufallsszenario fixieren;
- Unsupported-Legacy-RNG;
- Baseline erscheint automatisch;
- Gold/Fonds-Override veraendert kein Profil;
- aktuelles Runway-/Dynamic-Flex-Feld erzeugt korrekten Patch;
- verbotene Alters-/Renten-/Bedarfsaenderung blockiert;
- Variantenlimit;
- Entfernen und Neuberechnen;
- Reload mit persistiertem Pfad;
- Export/Import;
- technischer Fehler mit lesbarem Status;
- Tastaturfokus und Live-Region;
- schmaler und regulaerer Viewport ohne abgeschnittene Geldwerte.

**Akzeptanzkriterien**

- Der in Abschnitt 4 beschriebene Ablauf ist end-to-end bedienbar.
- Keine Aktion benoetigt eine manuelle JSON-Bearbeitung.
- Der Nutzer erkennt jederzeit, welcher Pfad und welche Baseline aktiv sind.
- Aktuelle reale Profilwerte werden von Gegenfaktualvarianten klar getrennt.

### 15.9 Slice 08 - Integration, Performance und Dokumentationssync

**Ziel**

Die Funktion wird gegen die gesamte Suite abgesichert und vollstaendig
dokumentiert. Dieser Slice fuehrt keine neue Fachsemantik ein.

**Scope**

- Gesamtregression;
- Baseline- und Workerparitaet;
- FlowDelta- und Snapshotpruefung;
- Performancebenchmark;
- Speichergroessenmessung;
- End-to-End-Fixtures;
- README und Referenzdokumente;
- finale Rueckdokumentation in diesem Arbeitsplan;
- Review und Nutzerabnahme.

**Voraussichtliche produktive Dateien**

- keine oder hoechstens kleine Integrationskorrekturen;
- `README.md`;
- `docs/reference/TECHNICAL.md`;
- `docs/reference/SIMULATOR_MODULES_README.md`;
- `tests/README.md`;
- dieser Plan und Slice-MD;
- gegebenenfalls `package.json`, falls ein separater Browser- oder
  Benchmarkbefehl erforderlich ist.

**Pflichttests**

- `npm test`;
- `npm run test:browser`, sofern dieser Scriptname am Umsetzungsstand gilt;
- fokussierte Replay-Contract-, Materializer-, Runner-, Varianten-,
  Vergleichs-, Persistenz- und Exporttests;
- vorhandene Workerparitaet;
- vorhandene MC-Mess- und Exportvertraege;
- relevante Backtest- und FlowDelta-Tests;
- `npm run build:engine` nur falls wider Erwarten `engine/` oder die
  oeffentliche `EngineAPI` geaendert wurde; eine solche Aenderung ist aktuell
  Nicht-Scope und loest vorher die Stop-Regel aus.

**Performanceziel**

- vier Varianten mit je 60 Pfadjahren;
- DOM-freine Berechnung nach Warm-up;
- p95 unter 50 ms auf der im Slice dokumentierten Referenzumgebung;
- Rendering separat messen;
- falls 50 ms nicht erreichbar sind, bleibt der Runner deterministisch und
  die UI orchestriert asynchron in kleinen Arbeitspaketen; keine fachliche
  Logik wird fuer den Benchmark vereinfacht.

**Akzeptanzkriterien**

- Keine unerwarteten MC-, Backtest-, Snapshot- oder FlowDelta-Abweichungen.
- Alle Deltas sind beabsichtigt, beziffert und im Slice dokumentiert.
- Nutzerworkflow und Modellgrenzen stehen in README und Simulatorreferenz.
- Der aktive Replay-Plan und alle Slices enthalten finalen Reviewstatus.

## 16. Querschnittliche Teststrategie

### 16.1 Testorakel

Die Implementierung benoetigt mindestens folgende versionierte Fixtures:

1. `baseline_horizon_v1`: Quelllauf endet am Horizont.
2. `baseline_death_v1`: alle Personen sterben vor dem Horizont.
3. `baseline_ruin_continuation_v1`: Quellstrategie ruiniert, Alternative
   ueberlebt in den Shadow-Pfad.
4. `care_partner_v1`: P1/P2-Pflege und Hinterbliebenenwechsel.
5. `gold_forced_sale_delta_v1`: dokumentierter Pfad mit erwartetem
   Notverkaufsdelta.
6. `gold_no_benefit_v1`: Gold erzeugt kein positives Delta; die UI darf
   trotzdem keine Fehlerbehauptung aufstellen.
7. `equity_disabled_v1`: Fonds aus, Geldmarkt-ETF und Bonds bleiben erhalten.
8. `technical_error_v1`: technische Jahresverletzung bleibt Missingness und
   wird nicht zu Ruin.

Die Fixtures enthalten ausschliesslich synthetische beziehungsweise bereits
freigegebene Testdaten und keine personenbezogenen Finanzexporte.

### 16.2 Regressionsinvarianten

- Replay-Feature inaktiv: bestehende Ergebnisse unveraendert.
- Pfadmaterialisierung veraendert keinen Zufallsstream des Quellbatches.
- Pfad und Varianten sind immutable.
- Variantenreihenfolge ist ergebnisneutral.
- Baseline ist reproduzierbar.
- Gesamtstartvermoegen bleibt bei Assetvarianten centgleich.
- `minimumFlexAnnual` wird nie still begrenzt.
- UI- und Runnerparameter verwenden dieselben Namen.
- Technical Error, Ruin, Tod und Horizont bleiben getrennt.
- Ein Daten- oder Engine-Mismatch wird sichtbar und fail-closed behandelt.

### 16.3 Abbruch- und Stopbedingungen

Zusätzlich zu `AGENTS.md` wird sofort gestoppt und nachgefragt, wenn:

- ein Slice mehr als zehn produktive Dateien benoetigt;
- Baseline-Replay den Quellrun nicht reproduziert;
- MC-, Backtest-, Snapshot- oder FlowDelta-Ergebnisse unerwartet abweichen;
- ein vollstaendiger Pfad nach Quellruin nicht ohne Aenderung der normalen
  MC-Zufallssemantik materialisierbar ist;
- Gold-/Fonds-Deaktivierung den Startwert nicht centgenau reconciliert;
- die vorhandene Engine keine hinreichend strukturierte
  Notverkaufsdiagnostik ohne Semantikaenderung liefern kann;
- UI und Runner unterschiedliche Variantenpfade oder Einheiten verwenden;
- Persistenztests auf einem vorgesehenen Backend nicht ausfuehrbar sind;
- `minimumFlexAnnual` still geklemmt statt validiert wuerde;
- `engine/` oder die oeffentliche `EngineAPI` geaendert werden muesste;
- ein Contract zwischen Marktpfad, Life-Events und Replayrunner unklar bleibt.

## 17. Offene Produktentscheidungen vor Implementierungsfreigabe

### NE-01 - Bedeutung von Gold/Fonds an/aus

**Vorschlag:** V1 verwendet eine hypothetische Startallokation ohne
Jahr-0-Transaktionsteuer. Deaktivierte Anlageklassen fliessen in den
Geldmarkt. Die UI kennzeichnet dies deutlich.

**Alternative:** realer Verkauf zum Start mit Steuer. Dies wuerde einen
eigenen spaeteren Arbeitsplan erfordern.

**Status:** Nutzerentscheidung ausstehend.

### NE-02 - Variantenanzahl

**Vorschlag:** Baseline plus maximal drei Alternativen, also zwei bis vier
Varianten insgesamt.

**Status:** Nutzerentscheidung ausstehend.

### NE-03 - Persistenzumfang

**Vorschlag:** genau ein aktiver Pfad; ein neuer Pfad ersetzt ihn nur nach
Bestaetigung. Keine Bibliothek mehrerer Pfade in V1.

**Status:** Nutzerentscheidung ausstehend.

### NE-04 - Legacy-RNG

**Vorschlag:** `legacy-stream` in V1 nicht unterstuetzen. Der normale
Defaultmodus `per-run-seed` ist replayfaehig.

**Status:** Nutzerentscheidung ausstehend.

### NE-05 - Mindest-Flex und Flex-Budget als Varianten

**Vorschlag:** zunaechst nur Asset-, Runway-, Rebalancing-, 3-Bucket- und
Dynamic-Flex-Parameter freigeben. Mindest-Flex und Flex-Budget erst nach dem
ersten funktionsfaehigen Replay als additiven Whitelist-Ausbau aufnehmen, weil
sie die Interpretation `gleicher Bedarf versus andere Policy` besonders
sorgfaeltig abgrenzen muessen.

**Status:** Nutzerentscheidung ausstehend.

### NE-06 - Import bei Engine-/Datenmismatch

**Vorschlag:** Nur-Lesen-Anzeige erlauben, exakte Neuberechnung blockieren.

**Status:** Nutzerentscheidung ausstehend.

## 18. Risiken und Gegenmassnahmen

| ID | Risiko | Auswirkung | Gegenmassnahme |
| --- | --- | --- | --- |
| R-01 | Nur Jahresnummern, aber andere Life-/Stressereignisse | falscher gepaarter Vergleich | voller exogener Pfad mit Life- und Overlaydaten |
| R-02 | Quellrun ruiniert vor Horizont | ueberlebende Alternative hat keine Folgejahre | definierter Post-Ruin-Shadow-Pfad |
| R-03 | ausgewaehlter Worst Case ist bei vielen Null-Endwerten beliebig | irrefuehrende Quellbezeichnung | Auswahlmetrik und Tie-Break sichtbar exportieren |
| R-04 | Replay nutzt aktuelle fremde UI-Werte | Baseline driftet | eingefrorener Source-Request plus Whitelist-Patch |
| R-05 | Gold/Fonds aus vernichtet oder verschiebt Vermoegen still | falscher Assetvergleich | expliziter Reallokationsvertrag und Cent-Reconciliation |
| R-06 | Geldmarkt-ETF wird als Fonds entfernt | Liquiditaetsfehler | Kategoriecontract statt Namenssuche |
| R-07 | Notverkauf aus Anzeigetext abgeleitet | falsche Anzahl/Volumen | strukturierte Transaktionsdiagnostik |
| R-08 | Engine-/Datenupdate aendert importiertes Ergebnis | Scheindeterminismus | Fingerprints, Mismatchblock und Nur-Lesen |
| R-09 | Persistenz korrupt oder zu gross | Startfehler/Verlust des Arbeitsstands | ein Slot, Groessenlimit, fail-closed und explizites Verwerfen |
| R-10 | Replay-Hooks veraendern MC-RNG | produktweite Ergebnisdeltas | Capture nur im seriellen selektierten Nachlauf, Paritaetstests |
| R-11 | Mehr-Faktor-Variante wird kausal interpretiert | falsche Entscheidung | sichtbare Patchliste und Mehr-Faktor-Warnung |
| R-12 | Feature verteilt sich ueber zu viele Dateien | unreviewbarer Slice | acht kleine Slices und harte Zehn-Dateien-Stopregel |
| R-13 | 50-ms-Ziel fuehrt zu fachlichen Abkuerzungen | inkorrekte Berechnung | fachliche Paritaet vor Performance; notfalls asynchrone UI-Orchestrierung |
| R-14 | Profilwerte werden beim Gegenfaktum geschrieben | reale Datenkontamination | Replay-only Overrides und Immutabilitaetstests |

## 19. Pre-Mortem

Angenommen, die Funktion liefert drei Monate nach Einfuehrung die Aussage
`7,5 Prozent Gold verhinderten auf diesem Stresspfad drei Notverkaeufe`, die
sich spaeter als falsch herausstellt. Die wahrscheinlichste Ursache waere,
dass nur historische Jahresnummern fixiert wurden, waehrend der Replaylauf
andere Pflege-, Mortalitaets-, Stress- oder Post-Ruin-Ereignisse verwendete.
Die zweitwahrscheinlichste Ursache waere eine unerkannte Startwertverschiebung
beim Abschalten von Gold oder Aktienfonds.

Die primaeren Schutzmechanismen sind deshalb nicht die Vergleichsgrafik,
sondern:

1. vollstaendiger exogener Pfad;
2. Baseline-Reconciliation gegen den Ursprungslauf;
3. expliziter Asset-Transformationsvertrag;
4. unveraenderliche Fingerprints;
5. strukturierte Transaktionsereignisse;
6. fail-closed Verhalten bei jedem Mismatch.

## 20. Definition of Done fuer das Gesamtfeature

Das Feature ist erst abgeschlossen, wenn alle folgenden Punkte erfuellt sind:

- [ ] Planreview abgeschlossen und alle Nutzerentscheidungen dokumentiert.
- [ ] Feature-Branch korrekt angelegt und in allen Slice-MDs dokumentiert.
- [ ] Slice 01 bis Slice 08 implementiert, getestet und extern reviewt.
- [ ] Ein ausgewaehlter per-run-seed-Szenariolog kann fixiert werden.
- [ ] Quellruin erzeugt einen vollstaendigen exogenen Restpfad.
- [ ] Baseline-Replay reproduziert den Ursprungslauf.
- [ ] Gold an/aus ist mit Zielquote und Reallokationsledger nutzbar.
- [ ] Aktienfonds an/aus trifft nur Equity-Tranchen.
- [ ] Zwei bis vier Varianten koennen angelegt und verglichen werden.
- [ ] Forced Sales, Bond-Refill und regulaere Verkaeufe sind getrennt.
- [ ] Delta-Marker sind auf Jahres- und Ursachebene vorhanden.
- [ ] Ein aktiver Pfad ueberlebt einen Neustart.
- [ ] Export/Import ist versioniert, fingerprintgeschuetzt und fail-closed.
- [ ] Inkompatible Daten-/Engineversionen werden nicht exakt replayt.
- [ ] Profile, Tranchen, MC, Backtest, Sweep und Auto-Optimize bleiben ohne
      Replay unveraendert.
- [ ] Vollstaendige Unit-, Contract-, Browser-, Paritaets- und
      Gesamtregressionstests sind gruen.
- [ ] Performance- und Groessenlimits sind gemessen und dokumentiert.
- [ ] README, TECHNICAL, SIMULATOR_MODULES_README und tests/README sind
      synchron.
- [ ] Nutzer hat den End-to-End-Ablauf abgenommen.

## 21. Slice-Status

| Slice | Status | Implementierung | Review | Commit/Push |
| --- | --- | --- | --- | --- |
| 01 Contracts | nicht begonnen | ausstehend | ausstehend | ausstehend |
| 02 Path Materialization | nicht begonnen | ausstehend | ausstehend | ausstehend |
| 03 Deterministic Runner | nicht begonnen | ausstehend | ausstehend | ausstehend |
| 04 Asset Variants | nicht begonnen | ausstehend | ausstehend | ausstehend |
| 05 Comparison Metrics | nicht begonnen | ausstehend | ausstehend | ausstehend |
| 06 Persistence/Export | nicht begonnen | ausstehend | ausstehend | ausstehend |
| 07 UI Workflow | nicht begonnen | ausstehend | ausstehend | ausstehend |
| 08 Integration/Docs | nicht begonnen | ausstehend | ausstehend | ausstehend |

**Reviewstand:** 2026-08-07, `codex/fokussierte-abschlusshaertung`, HEAD `55bdd84`. Adversariale Planprüfung von Gemini (Antigravity) für den Arbeitsplan Entwurf v1.

### 1. Prüfdimensionen

- **Korrektheit vs. Akzeptanzkriterien:** Der Arbeitsplan erfasst das fachliche Ziel des gepaarten Gegenfaktualvergleichs auf hohem Niveau sehr präzise. Allerdings stehen in Abschnitt 17 noch 6 zentrale Produktentscheidungen (`NE-01` bis `NE-06`) offen, ohne deren Bestätigung durch den Nutzer keine Implementierungsfreigabe erteilt werden kann.
- **Vertragstreue:** Der Gegenfaktual-Startallokationsmodus (`counterfactual_start_allocation_without_year_zero_transaction`) schlägt vor, deaktivierte Aktien- oder Goldbestände in den Geldmarkt umzuschichten. Bei Deaktivierung von 100 % Aktien wird somit das gesamte Vermögen in risikolosen Geldmarkt verschoben, welcher p.a. Zinsen ohne Volatilität liefert. Dies stellt kein neutrales Bild dar, sondern verzerrt den Vergleich zu Gunsten des Deaktivierens von Risikoanlagen.
- **Fehlerbehandlung:** Wenn ein Quell-MC-Lauf in Jahr 12 ruiniert (`terminal_ruin`), eine Gegenfaktual-Variante mit Gold aber bis Jahr 30 überlebt, muss die Materialisierung für die Jahre 13..30 einen exogenen Shadow-Pfad fortschreiben. Wenn dieser Nach-Generierungspfad nicht strikt isoliert und deterministisch ge-seeded wird, verbraucht er nachträglich Zufallszahlen und bricht die RNG-Determinismus-Invariante anderer Module.
- **Seiteneffekte & Unreiner Arbeitsbaum:** Abschnitt 3 listet 21 modifizierte/uncommitted Dateien aus Slice 02 der Fokussierten Abschlusshärtung auf. Ein Abzweigen des neuen Branches `codex/stress-pfad-replay` ohne vorheriges Committen oder Stashen dieser Fremdänderungen führt zu einer kontaminierten Implementierungsbaseline.
- **Was könnte brechen?** Slice 07 (UI-Workflow) plant 7–8 produktive Dateien gegen ein Maximum von 10 Dateien. Durch Einbindung in Ergebnisse, Analyzer und Monte-Carlo-Einstiegspunkte droht die 10-Dateien-Grenze im UI-Slice unmittelbar zu brechen.

### 2. Findings

#### G-P-01 (Blocker) – Unreine Baseline & Branch-Konflikt mit uncommitted Slice-02-Dateien
Vor Erstellung des neuen Feature-Branches `codex/stress-pfad-replay` müssen alle im Arbeitsbaum vorhandenen Fremdänderungen aus der Fokussierten Abschlusshärtung (Slice 02) entweder committed, gestasht oder sauber isoliert werden. Ein Abzweigen von `55bdd84` mit unreiner Working-Directory kontaminiert den Replay-Branch.

#### G-P-02 (Blocker) – Offene Nutzerentscheidungen NE-01 bis NE-06
Der Plan enthält in Abschnitt 17 sechs offene Grundsatzentscheidungen (`NE-01` bis `NE-06`), darunter die Wirkweise der Gegenfaktualallokation und der Ausschluss des Legacy-RNGs. Der Plan bleibt bis zur ausdrücklichen Bestätigung dieser Punkte durch den Nutzer im Status `Entwurf` gesperrt.

#### G-P-03 (Blocker) – Verzerrung der Vermögensrendite bei Umschichtung in Geldmarkt
Wird bei `Aktienfonds aus` das gesamte Aktienvermögen in den Geldmarkt reallokiert, erzielt das Portfolio im Replay-Runner jedes Jahr den Geldmarktzins (`cashReturnPct`) ohne Bärenmarkt-Drawdowns. Dies lässt das Deaktivieren von Aktienfonds im Gegenfaktum als risikolose Renditequelle erscheinen. Die Reallokationsregel muss im Contract präzisiert und in der UI als methodische Annahme ausgewiesen werden.

#### G-P-04 (Blocker) – RNG-Entkopplung beim Post-Ruin-Shadow-Pfad
Die Fortsetzung des exogenen Pfades nach einem Quellruin (Abschnitt 9.4) darf keinesfalls Zufallszahlen aus dem Haupt-RNG-Stream verbrauchen, da sonst spätere Iterationen oder parallele Batches ihre Determinismus-Gleichheit verlieren. Der Shadow-Loop muss über ein eigenes, strikt abgeleitetes Sub-Seed versorgt werden.

#### G-P-05 (hoch) – Entnahme- & Transaktionsdiagnostik ohne Engine-Mutation
Abschnitt 11.2 verlangt eine saubere Trennung zwischen Notverkäufen (`liquidity_shortfall_forced_sale`), Floor-Fallbacks und Rebalancing-Verkäufen. Da `engine/` laut Abschnitt 14.4 nicht verändert werden darf, muss der Runner (`stress-replay-runner.js`) diese Klassifikation aus den vorhandenen `balance_trace`- und `details`-Strukturen ableiten. Das Ableitungs-Orakel muss in Slice 03/05 als Contract fixiert werden.

#### G-P-06 (hoch) – Blast-Radius und Dateilimit bei Slice 07 (UI-Workflow)
Slice 07 umfasst bereits 7-8 geplante Dateien. Da die UI-Anbindung von Banner, Overrides, Variantenliste, Vergleichstabelle und Log-Buttons tief in `Simulator.html`, `simulator-results.js` und `simulator-main.js` eingreift, muss Slice 07 vorab strikt abgegrenzt werden, um die 10-Dateien-Stopregel nicht zu reissen.

### 3. Pre-Mortem

**Angenommen, dieses Feature verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?**

Eine Gegenfaktual-Variante ohne Aktienfonds wird vom Nutzer als „überlegene Strategie“ missinterpretiert, weil der in den Geldmarkt umgeschichtete Millionenbetrag stetige Zinsen ohne jeglichen Drawdown erwirtschaftete. Die zweitwahrscheinlichste Ursache ist ein schleichender Mismatch zwischen der materialisierten Household-Event-Sequenz und der Replay-Engine, wodurch Pflegekosten oder Renteneintritte bei Gegenfaktualvarianten in abweichenden Jahren wirksam wurden.

### 4. Review-Ergebnis

- **Status:** **blockiert** (Plan ist im Entwurfsstatus; nicht implementierungsreif)
- **Blocker:** G-P-01, G-P-02, G-P-03, G-P-04
- **Restrisiken:** G-P-05, G-P-06; einzuhalten sind die maximal 10 produktiven Dateien je Slice sowie der strikte Ausschluss von Mutationen der realen Profil- und Tranchenpersistenz.

## 23. Review-Feedback von Claude

Noch nicht durchgefuehrt.

## 24. Review-Antworten von Codex

Noch keine Review-Findings vorhanden.

## 25. Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| - | - | Noch kein Review | ausstehend | ausstehend |
