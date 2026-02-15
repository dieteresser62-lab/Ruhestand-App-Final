# Pseudo-Code Workflow Documentation

Dieses Dokument visualisiert die sequentiellen Abläufe der Haupt-Module in einer vereinfachten "Pseudo-Code"-Schreibweise. Es dient dazu, die Orchestrierung und Abhängigkeiten verständlich zu machen.

---

## 1. Balance-App (`balance-main.js`)

Der Update-Zyklus wird bei jeder Eingabe (debounced) oder beim Start ausgelöst.

```text
Funktion update():
  1. Synchronisierung
     - Sync Profile-Daten -> Balance-Inputs (wenn Profilverbund aktiv)

  2. Inputs Lesen (UIReader)
     - Lese alle DOM-Felder (Vermögen, Rente, Bedarf)
     - Lade Profilverbund-Profile (falls vorhanden)

  3. Initiale Validierung
     - Wenn Alter = 0 oder ungültig -> Abbruch

  4. State Laden (StorageManager)
     - Lade `persistentState` aus localStorage (Guardrail-History, Snapshots)

  5. Profilverbund-Simulation (Optional)
     - WENN (Profilverbund aktiv):
         - Über alle Profile iterieren:
             - Einzel-Simulation durchführen
         - Ergebnisse aggregieren (Merge Actions)

  6. Bedarfsanpassung UI
     - Prüfen, ob "Inflationsanpassung" Button nötig ist

  7. ENGINE-Aufruf (Window.EngineAPI)
     - result = EngineAPI.simulateSingleYear(inputs, lastState)
       - Engine führt intern Steuer-Settlement durch:
         - Roh-Aggregate aus Verkäufen summieren
         - Verlustvortrag (lastState.taxState.lossCarry) verrechnen
         - SPB anwenden, finale Steuer berechnen
         - Neuen lossCarry in newState.taxState fortschreiben
     - CATCH Fehler -> Fehler-Display rendern

  8. UI-Rendering (UIRenderer)
     - Render Summary (Vermögen, Reichweite)
     - Render Liquiditäts-Balken
     - Render Handlungsanweisung (Aktien/Gold kaufen/verkaufen)
     - Render Entnahme-Breakdown
     - Render Diagnose-Panel (Entscheidungsbaum, Guardrail-Chips)

  9. Speichern & Cleanup
     - Save State (Inputs + New State)
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

  5. Finales Rendering
     - Berechne Gesamt-Statistiken (Erfolgsquote, Mediane)
     - Aggregiere taxSavedByLossCarry pro Run → KPI "Ø Steuerersparnis Verlusttopf"
     - Zeige Ergebnisse, Charts und Szenario-Logs an
```

---

## 3. Historischer Backtest (`simulator-backtest.js`)

Der Backtest läuft strikt sequentiell über historische Marktdaten (1950 - Heute).

```text
Funktion runHistoricalBacktest():
  1. Validierung
     - Prüfe Start/Endjahr (1950-2024)

  2. Initialisierung State
     - `simState` auf Startwerte setzen (Vermögen, Allokation)
     - Historische Inflations- & Lohndaten laden

  3. Simulations-Schleife (Jahr = Start BIS Ende)
     - Lade Marktdaten für 'Jahr' (Rendite, Zinssatz, Inflation)

     - Berechne Rentenanpassung (dynamisch oder fix)

     - taxStatePrev merken (für möglichen Recompute)

     - ENGINE-Aufruf (simulateOneYear)
         - Berechne Entnahme, Steuern, Transaktionen
         - Engine liefert Settlement inkl. taxRawAggregate
         - Wende Markt-Rendite an
         - Aktualisiere `simState` (neues Vermögen, taxState)
     
     - Notfallverkauf-Prüfung
         - WENN (Liquiditätslücke nach Rendite):
             - Forced Sale durchführen (calculateSaleAndTax)
             - Roh-Aggregate von regulär + Notfallverkauf kombinieren
             - Gesamt-Settlement-Recompute mit taxStatePrev
             - action.steuer und taxState überschreiben

     - Ruin-Check
         - WENN (Vermögen <= 0):
             - Logge "RUIN"
             - Falls `BREAK_ON_RUIN` -> Abbruch

     - Logging
         - Füge Jahresergebnis zur Log-Tabelle hinzu (HTML)
         - Sammle Statistiken (Steuern, Kürzungsjahre, taxSavedByLossCarry)

  4. Abschluss
     - Zeige Zusammenfassung (Endvermögen, Max Drawdown)
     - Render Log-Tabelle
```
