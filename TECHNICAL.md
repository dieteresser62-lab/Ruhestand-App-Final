# Technische Dokumentation – Ruhestand-App-Final

Dieses Dokument beschreibt die Architektur und zentrale Datenflüsse der Ruhestand-App. Die Anwendung besteht aus zwei getrennten Oberflächen (Balance & Simulator) und einer gemeinsam genutzten Engine.

---

## Architekturüberblick

### Komponenten

| Komponente | Dateien | Zweck |
|------------|---------|-------|
| Balance-App | `Balance.html`, `balance-*.js`, `css/balance.css` | Jahresabschluss, Liquiditäts- und Entnahmeplanung, Diagnosen |
| Simulator | `Simulator.html`, `simulator-*.js`, `simulator.css` | Monte-Carlo-Simulationen, Parameter-Sweeps, Pflegefall-Szenarien |
| Engine | `engine/` (ESM) → `engine.js` | Validierung, Marktanalyse, Spending- und Transaktionslogik |

Alle Skripte sind ES6-Module. Die Engine wird per `build-engine.mjs` mit esbuild (oder Modul-Fallback) gebündelt und stellt eine globale `EngineAPI` bereit, die von Balance- und Simulator-Oberfläche gemeinsam genutzt wird.

---

## Engine

Die Engine besteht aus sieben ES-Modulen, die von `build-engine.mjs` zu `engine.js` zusammengeführt werden. Die Reihenfolge entspricht zugleich der internen Verarbeitungskette:

1. **`engine/validators/InputValidator.mjs`** – prüft sämtliche Eingaben auf Vollständigkeit, Wertebereiche und Konsistenz. Liefert strukturierte Fehlermeldungen.
2. **`engine/analyzers/MarketAnalyzer.mjs`** – klassifiziert Marktregime, berechnet Drawdowns und leitet Kennzahlen für Guardrails ab.
3. **`engine/planners/SpendingPlanner.mjs`** – steuert Guardrails, Glättung der Flex-Rate, Alarmstatus und erstellt Diagnoseeinträge.
4. **`engine/transactions/TransactionEngine.mjs`** – leitet Ziel-Liquidität ab, berücksichtigt Puffer-Schutz und limitiert Verkäufe/Rebalancing.
5. **`engine/core.mjs`** – orchestriert die oben genannten Module, exponiert `EngineAPI` (Version 31) und erzeugt Diagnose-/UI-Strukturen.
6. **`engine/config.mjs`** – zentrale Konfiguration (Schwellenwerte, Regime-Mapping, Profile). Generiert zur Build-Zeit eine eindeutige Build-ID.
7. **`engine/errors.mjs`** – Fehlerklassen (`AppError`, `ValidationError`, `FinancialCalculationError`).

### Datenfluss innerhalb der Engine

```
Input → InputValidator.validate
      → MarketAnalyzer.analyzeMarket
      → SpendingPlanner.determineSpending
      → TransactionEngine.calculateTargetLiquidity + determineAction
      → Ergebnisobjekt (UI-Daten, Diagnose, neuer State)
```

Die Engine gibt strukturierte Ergebnisse zurück. Fehler werden als `AppError`/`ValidationError` transportiert und von den UIs aufgefangen.

---

## Balance-App

### Modulübersicht

* `balance-config.js` – Konfiguration, Fehlertypen, Debug-Utilities.
* `balance-utils.js` – Formatierungs- und Hilfsfunktionen (Währung, Threshold-Zugriff).
* `balance-storage.js` – Persistenzschicht für `localStorage` und File-System-Snapshots.
* `balance-reader.js` – liest Benutzerinputs aus dem DOM und setzt UI-Side-Effects.
* `balance-renderer.js` – Darstellung der Ergebnisse (Summary, Guardrails, Diagnose, Toasts, Themes).
* `balance-binder.js` – Event-Hub mit Tastenkürzeln, Import/Export, Snapshots, Debug-Modus.
* `balance-main.js` – Orchestrator: initiiert Module, führt `update()` aus und spricht `EngineAPI` an.

### Ablauf einer Aktualisierung

1. `balance-binder.js` reagiert auf Eingaben (Formular, Tastenkürzel, Buttons) und ruft `debouncedUpdate()` auf.
2. `balance-reader.js` sammelt alle Inputs und gibt ein strukturiertes Objekt zurück.
3. `balance-main.js` reicht die Inputs an `EngineAPI.simulateSingleYear()` weiter.
4. Die Engine liefert Ergebnisse/Diagnose/Fehler.
5. `balance-renderer.js` aktualisiert UI-Komponenten und Statusanzeigen.
6. `balance-storage.js` persistiert den Zustand und verwaltet Snapshots.

---

## Simulator

### Wichtige Module

* `simulator-main.js` – zentrale Steuerung, Parameter-Sweep-Logik, Self-Tests.
* `simulator-monte-carlo.js` – UI-Koordinator für Monte-Carlo (liest Inputs, setzt Progress, orchestriert Runner/Analyzer).
* `monte-carlo-runner.js` – DOM-freie Simulation (Jahresschleife, Pflege-KPIs) auf Basis von `simulator-engine.js`. Unterstützt nun auch eine **Ansparphase** mit dynamischem Übergang in die Rentenphase (via `effectiveTransitionYear`).
* `monte-carlo-ui.js` – UI-Fassade für Progressbar/Parameter-Lesen; erlaubt Callbacks ohne DOM-Leaks.
* `scenario-analyzer.js` – wählt während der Simulation 30 Szenarien (Worst, Perzentile, Pflege, Zufall) aus.

* `simulator-engine.js` – Jahr-für-Jahr-Logik (Sampling, Pflegekosten/-sterblichkeit, Run-States).
* `simulator-portfolio.js` – Initialisierung, Portfolio-Berechnungen, Stress-Kontexte.
* `simulator-results.js` – Aggregiert MC-Ausgaben und delegiert an `results-metrics.js` / `results-renderers.js` / `results-formatting.js`.
* `simulator-sweep.js` – Sweep-Logik inkl. Whitelist/Blocklist, Mini-Monte-Carlo und Heatmap-Aufruf.
* `simulator-optimizer.js` – Auto-Optimize-Kernlogik mit 3-stufiger Optimierung (Coarse Grid → Refinement → Final Verification).
* `auto_optimize.js` / `auto_optimize_ui.js` – Auto-Optimize UI-Integration, Preset-Konfigurationen und Champion-Config-Output (1-7 dynamische Parameter).
* `simulator-heatmap.js` – SVG-Rendering für Parameter-Sweeps inkl. Warnhinweise bei Verstößen.
* `simulator-utils.js` – Zufallszahlengenerator, Statistikfunktionen, Parser, Formatierung.
* `simulator-data.js` – Historische Daten, Mortalitäts- und Stress-Presets.

### Parameter-Sweep & Auto-Optimize

#### Schutzmechanismen

* **Whitelist** (`SWEEP_ALLOWED_KEYS`) beschränkt veränderbare Parameter.
* **Blocklist** verhindert Änderungen an sensiblen Feldern (z. B. Rente Person 2).
* **Deep-Clones** (`structuredClone`-Fallback) isolieren jeden Sweep-Case.
* **Rente-2-Wächter** markiert Heatmap-Zellen mit ⚠, wenn die zweite Rente variiert.
* **Self-Test** (`runSweepSelfTest`) prüft Whitelist/Clone-Mechanismen.

#### Auto-Optimize-Funktionen
* **3-stufige Optimierung:** Coarse Grid (grobe Suche) → Refinement (Verfeinerung um Best-Kandidaten) → Final Verification für ~8-10x Geschwindigkeitsgewinn gegenüber exhaustiven Sweeps.
* **Dynamische Parameter-UI:** Unterstützt 1-7 frei konfigurierbare Optimierungsparameter mit individuellen Bereichen.
* **Preset-Konfigurationen:** Vordefinierte Optimierungsszenarien (konservativ, moderat, risikobereit, etc.) für schnellen Einstieg.
* **Champion-Config-Output:** Detaillierte Ausgabe der optimalen Parameterkombination mit allen relevanten Metriken.
* **Constraint-basierte Filterung:** Automatische Verwerfung von Konfigurationen, die definierte Mindestanforderungen nicht erfüllen (z.B. Erfolgsquote, Erschöpfungsrate).

### Ergebnisdarstellung

* KPIs (P10/P50/P90) und Worst-Run-Logs.
* **Heatmap (Renten-Fokus):** Die Heatmap visualisiert die Verteilung der Entnahmeraten. Um bei aktivierter Ansparphase (0% Entnahme) keine leeren Spalten zu zeigen, beginnt die Aufzeichnung der Heatmap erst mit dem ersten Jahr der Rentenphase.
* Pflegefall-Szenarien mit zusätzlichen Kostenverläufen.

### Rentensteuerung & Witwenlogik

* `getCommonInputs()` bündelt sämtliche Rentenfelder inklusive gemeinsamer Indexierung, Hinterbliebenen-Optionen (Modus, Prozentsatz,
  Mindest-Ehejahre) und Partner:innen-spezifischer Parameter. Ältere Felder wie `r2Brutto` werden automatisch migriert, Pflege-
  Konfigurationen parallel gelesen und als strukturierte Inputs zurückgegeben.【F:simulator-portfolio.js†L57-L174】
* `computeRentAdjRate()` und `computePensionNext()` sorgen dafür, dass beide Rentenstränge dieselbe Anpassungslogik (fix, Lohn,
  CPI) nutzen und dass Erstjahre sauber von Folgejahren getrennt bleiben.【F:simulator-portfolio.js†L285-L332】
  - 15 charakteristische Szenarien: Vermögens-Perzentile (Worst, P5-P95, Best), Pflege-Extremfälle (längste Dauer, höchste Kosten, frühester Eintritt), Risiko-Szenarien (längste Lebensdauer, maximale Kürzung)
  - 15 zufällige Szenarien: gleichmäßig über alle Runs verteilt für typisches Verhalten
* Dropdown-Auswahl mit Endvermögen und Pflege-Status pro Szenario
* Checkboxen für Pflege-Details und detailliertes Log, JSON/CSV-Export【F:simulator-results.js†L269-L427】【F:simulator-main.js†L1039-L1129】

---

## Build- und Laufzeit-Hinweise

* Engine anpassen → `node build-engine.js` ausführen, anschließend `engine.js` prüfen.
* Snapshot-Funktionen benötigen File-System-Access-API (Chromium).
* Tests/Smoketests: `sim-parity-smoketest.js` enthält ein Skript zum Vergleich von Simulationsergebnissen, `test-dual-care.js` prüft Pflegefall-Logik.

---

## Weiterführende Dokumente

* **BALANCE_MODULES_README.md** – Detailtiefe zur Balance-App.
* **SIMULATOR_MODULES_README.md** – Detaillierte Modulübersicht des Simulators.
* **engine/README.md** – Engine-spezifische Informationen inkl. Build-Beschreibung.

