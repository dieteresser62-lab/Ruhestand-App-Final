# Technische Dokumentation – Ruhestand-App-Final

Dieses Dokument beschreibt die Architektur und zentrale Datenflüsse der Ruhestand-App. Die Anwendung besteht aus zwei getrennten Oberflächen (Balance & Simulator) und einer gemeinsam genutzten Engine.

---

## Architekturüberblick

### Komponenten

| Komponente | Dateien | Zweck |
|------------|---------|-------|
| Balance-App | `Balance.html`, `balance-*.js`, `css/balance.css` | Jahresabschluss, Liquiditäts- und Entnahmeplanung, Diagnosen |
| Simulator | `Simulator.html`, `simulator-*.js`, `simulator.css` | Monte-Carlo-Simulationen, Parameter-Sweeps, Pflegefall-Szenarien |
| Engine | `engine/` (Module) → `engine.js` | Validierung, Marktanalyse, Spending- und Transaktionslogik |

Alle Skripte sind ES6-Module. Die Engine wird zur Laufzeit als IIFE gebündelt und stellt eine globale `EngineAPI` (Balance) sowie `Ruhestandsmodell_v30` (Simulator-Kompatibilität) bereit.

---

## Engine

Die Engine besteht aus acht Modulen, die von `build-engine.js` zu `engine.js` zusammengeführt werden. Die Reihenfolge entspricht zugleich der internen Verarbeitungskette:

1. **`engine/validators/InputValidator.js`** – prüft sämtliche Eingaben auf Vollständigkeit, Wertebereiche und Konsistenz. Liefert strukturierte Fehlermeldungen.
2. **`engine/analyzers/MarketAnalyzer.js`** – klassifiziert Marktregime, berechnet Drawdowns und leitet Kennzahlen für Guardrails ab.
3. **`engine/planners/SpendingPlanner.js`** – steuert Guardrails, Glättung der Flex-Rate, Alarmstatus und erstellt Diagnoseeinträge.
4. **`engine/transactions/TransactionEngine.js`** – leitet Ziel-Liquidität ab, berücksichtigt Puffer-Schutz und limitiert Verkäufe/Rebalancing.
5. **`engine/core.js`** – orchestriert die oben genannten Module, exponiert `EngineAPI` (Version 31) und erzeugt Diagnose-/UI-Strukturen.
6. **`engine/config.js`** – zentrale Konfiguration (Schwellenwerte, Regime-Mapping, Profile). Generiert zur Build-Zeit eine eindeutige Build-ID.
7. **`engine/errors.js`** – Fehlerklassen (`AppError`, `ValidationError`, `FinancialCalculationError`).
8. **`engine/adapter.js`** – Kompatibilitätsadapter für ältere Simulator-Schnittstellen.

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

* `simulator-main.js` – zentrale Steuerung, Parameter-Sweep-Logik, Dev-Mode-Self-Tests.
* `simulator-engine.js` – Monte-Carlo-Logik (Jahresfortschreibung, Pflegefallkosten, Zufallssampling).
* `simulator-portfolio.js` – Initialisierung, Portfolio-Berechnungen, Stress-Kontexte.
* `simulator-results.js` – Aggregation von Simulationsergebnissen, Kennzahlen und Warnflaggen.
* `simulator-heatmap.js` – SVG-Rendering für Parameter-Sweeps inkl. Warnhinweise bei Verstößen.
* `simulator-utils.js` – Zufallszahlengenerator, Statistikfunktionen, Parser, Formatierung.
* `simulator-data.js` – Historische Daten, Mortalitäts- und Stress-Presets.

### Parameter-Sweep-Schutzmechanismen

* **Whitelist** (`SWEEP_ALLOWED_KEYS`) beschränkt veränderbare Parameter.
* **Blocklist** verhindert Änderungen an sensiblen Feldern (z. B. Rente Person 2).
* **Deep-Clones** (`structuredClone`-Fallback) isolieren jeden Sweep-Case.
* **Rente-2-Wächter** markiert Heatmap-Zellen mit ⚠, wenn die zweite Rente variiert.
* **Self-Test** (`runSweepSelfTest`) prüft Whitelist/Clone-Mechanismen im Dev-Modus.

### Ergebnisdarstellung

* KPIs (P10/P50/P90) und Worst-Run-Logs.
* Heatmap mit optionalen Warn-Badges.
* Pflegefall-Szenarien mit zusätzlichen Kostenverläufen.

### Rentensteuerung & Witwenlogik

* `getCommonInputs()` bündelt sämtliche Rentenfelder inklusive gemeinsamer Indexierung, Hinterbliebenen-Optionen (Modus, Prozentsatz,
  Mindest-Ehejahre) und Partner:innen-spezifischer Parameter. Ältere Felder wie `r2Brutto` werden automatisch migriert, Pflege-
  Konfigurationen parallel gelesen und als strukturierte Inputs zurückgegeben.【F:simulator-portfolio.js†L57-L174】
* `computeRentAdjRate()` und `computePensionNext()` sorgen dafür, dass beide Rentenstränge dieselbe Anpassungslogik (fix, Lohn,
  CPI) nutzen und dass Erstjahre sauber von Folgejahren getrennt bleiben.【F:simulator-portfolio.js†L285-L332】
* Das UI schaltet Prozentfelder je nach Modus frei/aus, blendet Partner-Sektionen dynamisch ein und speichert Präferenzen im
  `localStorage`. Dadurch wird verhindert, dass Sweep-Cases heimlich Person-2-Werte überschreiben.【F:simulator-main.js†L1563-L1614】
* Sweep-Schutz: Whitelist/Blocklist und der Rente-2-Invarianz-Wächter markieren Verstöße direkt in der Heatmap, inklusive Dev-
  Self-Test für reproduzierbare Diagnosen.【F:simulator-main.js†L3-L64】

### Pflege-Pipeline

* Alters- und gradabhängige Eintrittswahrscheinlichkeiten basieren auf dem BARMER-Pflegereport und werden in `simulator.js` gepflegt.
  Die Tabelle liefert grade-spezifische Labels sowie Drift-Annahmen.【F:simulator.js†L433-L470】
* Das UI bietet für jeden Pflegegrad Zusatzkosten-, Flex-Cut- und Mortalitätsfelder, Staffel-Presets (ambulant/stationär), regionalen
  Zuschlag, Info-Badges zum Maximal-Floor sowie Event-Listener, die Änderungen live in Tooltips und Badges spiegeln.【F:simulator-main.js†L89-L1506】
* KPI-Dashboard: Zusätzlich zu klassischen Monte-Carlo-Kennzahlen rendert der Simulator Eintrittsquoten, Eintrittsalter, Pflegejahre
  pro Person sowie Kosten-/Shortfall-Deltas. Sobald Pflege-Worst-Runs vorliegen, lässt sich über einen Toggle zwischen Gesamt-
  und Pflege-Extremlauf wechseln – inklusive separatem Log-Auszug.【F:simulator-results.js†L191-L250】【F:simulator.js†L366-L429】

---

## Build- und Laufzeit-Hinweise

* Engine anpassen → `node build-engine.js` ausführen, anschließend `engine.js` prüfen.
* Debug-Modi aktivieren:
  * Balance: `Ctrl` + `Shift` + `D` oder `localStorage.setItem('balance_debug_mode', 'true')`.
  * Simulator: UI-Toggle oder `localStorage.setItem('sim.devMode', '1')`.
* Snapshot-Funktionen benötigen File-System-Access-API (Chromium).
* Tests/Smoketests: `sim-parity-smoketest.js` enthält ein Skript zum Vergleich von Simulationsergebnissen, `test-dual-care.js` prüft Pflegefall-Logik.

---

## Weiterführende Dokumente

* **BALANCE_MODULES_README.md** – Detailtiefe zur Balance-App.
* **engine/README.md** – Engine-spezifische Informationen inkl. Build-Beschreibung.
* **TYPESCRIPT_MIGRATION_KONZEPT.md** – Migrationsplan zu TypeScript.

