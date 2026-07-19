# Pseudo-Code Workflow Documentation

Dieses Dokument visualisiert die sequentiellen Abläufe der Haupt-Module in einer vereinfachten "Pseudo-Code"-Schreibweise. Es dient dazu, die Orchestrierung und Abhängigkeiten verständlich zu machen.

---

## 1. Balance-App (`balance-main.js`)

Der Update-Zyklus wird bei jeder Eingabe (debounced) oder beim Start ausgelöst.

```text
Funktion update():
  1. Engine- und Profil-Gate
     - Pruefe gebundenen EngineAPI-Vertrag
     - Sync ausgewaehlte Profile -> Haushaltsinputs
     - Lade profilgebundene Tranchen fail-closed

  2. Inputs und State lesen
     - Lese DOM-Felder (Vermoegen, Rente, Bedarf)
     - Lade persistentState ueber PersistenceFacade
     - Validierungsfehler -> Abbruch ohne Write

  3. Genau ein ENGINE-Aufruf
     - Bei Profilverbund: baue nicht mutierenden Haushaltstranchenpool
       mit sourceProfileId
     - result = EngineAPI.simulateSingleYear(inputs, lastState)
       - Engine führt intern Steuer-Settlement durch:
         - Roh-Aggregate aus Verkäufen summieren
         - Verlustvortrag (lastState.taxState.lossCarry) verrechnen
         - SPB anwenden, finale Steuer berechnen
         - Neuen lossCarry in newState.taxState fortschreiben
     - CATCH strukturierter Fehler -> blockierenden Hinweis rendern

  4. Haushaltsaktion finalisieren und attribuieren
     - 3-Bucket/Bond-Logik genau einmal anwenden
     - Quellen, Steuern und Verwendungen auf Profile attribuieren
     - Cent-Reconciliation; Abweichung -> fail-closed

  5. UI-Rendering
     - Render Summary (Vermögen, Reichweite)
     - Render Liquiditäts-Balken
     - Render Handlungsanweisung (Aktien/Gold kaufen/verkaufen)
     - Render Entnahme-Breakdown
     - Render Diagnose-Panel (Entscheidungsbaum, Guardrail-Chips)

  6. Speichern & Cleanup
     - Save Planungsstate ueber PersistenceFacade nur bei success
     - Verkaufsempfehlung niemals in depot_tranchen schreiben
     - Clear Errors
```

---

## 2. Monte-Carlo Simulation (`simulator-monte-carlo.js`)

Dieser Ablauf beschreibt die Orchestrierung inklusive Worker-Parallelisierung.

```text
Funktion runMonteCarlo():
  1. Setup & Inputs
     - Lese Szenario-Parameter (Dauer, Methode, Startjahr-Filter)
     - Lese Portfolio-Inputs (Vermögen, Allokation)
     - Initialisiere `ScenarioAnalyzer` (für Logging)

  2. Initialisierung Worker-Pool
     - Bestimme Worker-Anzahl (Hardware-Concurrency)
     - Sende 'init'-Nachricht an alle Worker (Kompiliertes Szenario, Historische Daten)

  3. Chunking-Loop (Asynchron)
     - Solange (runsCompleted < zielAnzahl):
         - Berechne Zeit-Budget pro Chunk
         - Sende Job-Batch an freien Worker
         - WARTEN auf Ergebnis (Promise.race)
         
         - BEI ERFOLG:
             - Aggregiere Teilergebnisse (Merge Buffers & Heatmap)
             - Sammle "Worst Run in Chunk" (für globales Minimum)
             - Update Progress-Bar
         
         - BEI FEHLER/TIMEOUT:
             - Fallback auf serielle Berechnung (Sicherheit)

  4. Log-Daten Anreicherung (Post-Processing)
     - Identifiziere relevante Runs für das Log (P10, P50, Worst-Case)
     - WENN (Worker genutzt):
         - Re-Run dieser spezifischen Indizes (seriell/schnell), um vollständige Logs zu generieren
           (Worker senden keine Logs, um Performance zu sparen)
     - Ergänze im detaillierten Log die Payout-Zeitpunkte:
         Liquidität vor Auszahlung, Liquidität nach Auszahlung,
         Liquidität nach Zins, Portfolio vor Auszahlung, Portfolio Jahresende

  5. Finales Rendering
     - Berechne Gesamt-Statistiken (Erfolgsquote, Mediane)
     - Aggregiere taxSavedByLossCarry pro Run → KPI "Ø Steuerersparnis Verlusttopf"
     - Zeige Ergebnisse, Charts und Szenario-Logs an
```

---

## 3. Historische In-sample-Diagnose

Der produktive Backtest trennt UI, Datenvertrag, DOM-freien Runner, Metriken,
optionale Rolling Cohorts und Raw-Export. Die eingebettete Historie deckt
1925-2025 ab; wegen des vierjaehrigen Lookbacks leitet der aktive Provider die
technischen Laufgrenzen 1929-2025 ab. Ein Einjahreslauf ist zulaessig. Bereits
gesehene Einzelpfade und ueberlappende Cohorts bleiben In-sample-Diagnosen und
sind weder unabhaengige Versuche noch Erfolgswahrscheinlichkeiten.

```text
Funktion runBacktest() in simulator-backtest.js:
  1. UI und Request vorbereiten
     - Lese normalisierte Simulatorinputs
     - Projiziere Provider-Bounds in Start-/Endjahr
     - Validiere leere, nicht-finite, nicht-ganzzahlige,
       rueckwaertige und ausserhalb liegende Perioden
     - Erfasse breakOnRuin sowie Dataset-, Temporal- und Engineprovenienz

  2. Daten vor der Schleife validieren
     - historical-backtest-contract.preparePeriod(startYear, endYear)
     - Pruefe Lookback und jedes Pflichtjahr lueckenlos
     - Fehlende/ungueltige Daten -> outcome incomplete, null Engineaufrufe
     - Realisierte Aktien-, Gold-, Cash-/Bond-, Inflations- und Lohnwerte
       stammen aus Simulationsjahr t; CAPE ist decision-as-of t-1

  3. DOM-freien Lauf ausfuehren
     - Erzeuge eigene kanonische Kopien von Inputs, Tranchen und Records
     - Initialisiere Portfolio und simState
     - FUER jedes validierte Jahr t:
         - Baue yearData ausschliesslich aus HistoricalYearRecordV1
         - Berechne Rentenanpassung fuer t
         - simulateOneYear(simState, inputs, yearData, yearIndex)
         - success -> uebernehme neuen State und kanonische Rohzeile
         - ruin -> uebernehme terminalen Ruinzustand; Abbruch gemaess breakOnRuin
         - technical_error -> beende fail-closed mit sicherem Fehlercode

  4. Kanonisches Resultat ableiten
     - Erzeuge tief eingefrorenes BacktestRunResultV1
     - Reconciliiere Start-/Endportfolio, requested/completedYears,
       Outcome, Jahreszeilen, Summary und HistoricalBacktestMetricsV1
     - UI, Tabelle und Export teilen dieselbe Result-/Row-Instanz

  5. Optional Rolling Cohorts
     - Baue alle Kandidaten mit fester inklusiver Horizontlaenge
     - prepareBatch() validiert ueberlappende Recordjahre einmal
     - Inventarisiere completed, ruin, incomplete, technical_error,
       cancelled und insufficient_horizon getrennt

  6. Rendering und expliziter Export
     - Rendere fokussierbaren Status, Datenqualitaet, Summary und
       semantische Tabelle ohne zweite wirtschaftliche Berechnung
     - JSON -> HistoricalBacktestExportV1 mit Request/Result/Fingerprints
     - CSV -> feste technische Rohspalten ohne HTML/Lokalisierung
     - Export nur auf Nutzerklick; Realbestand/Persistenz bleiben unveraendert
```

---

## 4. Profil-Assets, Quotes und realer Reconcile

```text
Startseite -> Profil waehlen:
  - aktuelles Profil speichern und PersistenceFacade flushen
  - nur bei Erfolg zum Profil-Assets-Manager navigieren

Manager laden:
  - depot_tranchen mutationsfrei lesen
  - empty -> explizit leer
  - valid -> kanonisch rendern
  - corrupt -> Writes blockieren, Rohtext erhalten, Recovery anbieten
  - unavailable -> Retry, kein Reset

CRUD oder Kursbatch:
  - gesamte Collection validieren
  - Quote nur mit Symbol + positivem Preis + EUR + UTC-Zeit + Quelle
  - Teilerfolge in genau einem Commit, Fehler behalten alten Kurs
  - Facade flushen; bei Fehler bestaetigten Stand wiederherstellen

Reale Brokerausfuehrung:
  - Action mit profileId + trancheId + actionId normalisieren
  - Vorschau gegen unveraenderten Live-Rohpayload erzeugen
  - separate Bestaetigung verlangen
  - Lot + Profilbestand + Audit in einem Flush schreiben
  - identische Wiederholung -> No-op; Konflikt/Profilwechsel -> Abbruch
```
