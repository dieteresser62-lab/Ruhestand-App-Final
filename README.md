# Ruhestand-App-Final

Die Ruhestand-App ist ein vollständig lokal ausführbares Planungstool mit zwei Oberflächen:

* **Balance-App** – steuert den jährlichen Entnahmeprozess, verwaltet Liquidität und erzeugt Diagnoseberichte.
* **Simulator** – führt Monte-Carlo-Simulationen, Parameter-Sweeps und Pflegefall-Szenarien aus.

Beide Anwendungen laufen ohne Build-Tool oder externe Abhängigkeiten direkt im Browser und teilen sich eine modulare Berechnungs-Engine.

---

## Funktionen im Überblick

### Balance-App
* Speichert Eingaben dauerhaft im `localStorage` und erzeugt auf Wunsch Dateisnapshots (File System Access API).
* Importiert/Exportiert Portfolios als JSON und liest Marktdaten aus CSV-Dateien ein.
* Nutzt die Engine v31 zur Marktanalyse, Entnahmeplanung und Liquiditätssteuerung.
* Diagnoseansicht mit Guardrails, Entscheidungsbaum und Key-Performance-Parametern.
* Tastenkürzel u. a. für Jahresabschluss (`Alt` + `J`), Import (`Alt` + `I`), Export (`Alt` + `E`) und Dark-Mode (`Alt` + `D`).
* Debug-Modus (`Ctrl` + `Shift` + `D`) mit erweiterten Logs und Self-Tests.

### Simulator
* Monte-Carlo-Simulationen mit unterschiedlichen Renditequellen (historisch, Regime, Block-Bootstrap).
* Parameter-Sweep mit Whitelist-Ansatz, Deep-Clones und Wächterlogik für Zwei-Personen-Haushalte.
* Stresstests, Pflegefall-Szenarien und Heatmap-Visualisierung inklusive Warnhinweisen.
* Dev-Modus (per Toggle oder `localStorage.setItem('sim.devMode', '1')`) mit Self-Test (`runSweepSelfTest`).

#### Pflegegrad-Modellierung

Die Pflegefall-Logik nutzt jetzt alters- und gradabhängige Eintrittswahrscheinlichkeiten (BARMER Pflegereport 2024, Kap. 2).
Die veröffentlichten Prävalenzen wurden auf Jahreswahrscheinlichkeiten heruntergebrochen (Ø-Pflegedauer ~4 Jahre) und in
5-Jahres-Buckets geglättet. Für jedes ausgeloste Alter wird zunächst die Gesamteintrittswahrscheinlichkeit ermittelt, dann
per Zufall ein Pflegegrad (1–5) gezogen und anschließend der gradeigene Zusatzbedarf bzw. Flex-Verlust angewandt.

Im UI stehen pro Pflegegrad zwei Felder zur Verfügung:

| Pflegegrad | Default-Zusatzbedarf (€ p.a.) | Flex-Level (%) |
|------------|------------------------------|-----------------|
| PG 1       | 12 000                       | 50              |
| PG 2       | 18 000                       | 45              |
| PG 3       | 28 000                       | 40              |
| PG 4       | 36 000                       | 35              |
| PG 5       | 44 000                       | 30              |

Alle Werte lassen sich situationsgerecht anpassen; die Engine übernimmt die grade-spezifischen Zusatzkosten automatisch,
berücksichtigt Ramp-Ups, Max-Floor-Caps sowie Flex-Verluste und protokolliert den aktiven Pflegegrad im Worst-Run-Log.

### Gemeinsame Engine
* Acht Module (`engine/`) kapseln Validierung, Marktanalyse, Ausgabenplanung und Transaktionslogik.
* `build-engine.js` bündelt die Module zu `engine.js`, das in beiden Oberflächen als `EngineAPI` bzw. `Ruhestandsmodell_v30` geladen wird.
* Konfigurierbare Guardrails, Marktregime-Übersetzungen und Strategien für Liquiditätsziele.

---

## Repository-Struktur

```
Ruhestand-App-Final/
├── Balance.html                # Einstiegspunkt Balance-App
├── Simulator.html              # Einstiegspunkt Simulator
├── balance-*.js                # ES6-Module der Balance-App
├── simulator-*.js              # ES6-Module des Simulators
├── engine/                     # Quellmodule der Berechnungsengine
│   ├── config.js
│   ├── core.js
│   ├── errors.js
│   ├── adapter.js
│   ├── analyzers/MarketAnalyzer.js
│   ├── planners/SpendingPlanner.js
│   ├── transactions/TransactionEngine.js
│   └── validators/InputValidator.js
├── engine.js                   # Gebündelte Engine (generiert)
├── build-engine.js             # Node-Skript zum Bundlen der Engine
├── css/
│   └── balance.css             # Styling der Balance-App
├── simulator.css               # Styling der Simulator-Oberfläche
├── TECHNICAL.md                # Technische Details & Architektur
├── BALANCE_MODULES_README.md   # Modulübersicht Balance-App
├── TYPESCRIPT_MIGRATION_KONZEPT.md
├── FEATURE_BRANCH_WORKFLOW.md
└── ...                         # Weitere Hilfsdateien und Tests
```

---

## Nutzung

1. Repository klonen oder herunterladen.
2. `Balance.html` bzw. `Simulator.html` im Browser öffnen.
   * Getestet mit Chromium-basierten Browsern und Firefox.
   * Keine Build-Schritte nötig.
3. Optional: `node build-engine.js` ausführen, wenn Änderungen in `engine/` vorgenommen wurden. Dadurch wird `engine.js` aktualisiert.

> **Hinweis:** Einige Funktionen (Snapshots, Dateiimporte) benötigen Browser mit File-System-Access-Unterstützung.

---

## Entwicklung

* Die Balance- und Simulator-Module nutzen native ES6-Imports. Änderungen an einzelnen Modulen werden nach dem Speichern direkt beim nächsten Reload geladen.
* Engine-Anpassungen erfolgen in den Modulen unter `engine/`. Nach Anpassungen das Build-Skript ausführen und die Größe der generierten `engine.js` kontrollieren.
* Debug-Modi über Tastenkombinationen oder lokale Storage-Flags aktivieren (`balance_debug_mode`, `sim.devMode`).
* Für Tests der Parameter-Sweeps steht im Simulator-Dev-Modus `runSweepSelfTest()` bereit.

---

## Weitere Dokumentation

* **BALANCE_MODULES_README.md** – detaillierte Beschreibung der Balance-Module.
* **TECHNICAL.md** – Architekturübersicht von Engine, Balance- und Simulator-Anwendung.
* **TYPESCRIPT_MIGRATION_KONZEPT.md** – Plan für eine mögliche Migration auf TypeScript.
* **FEATURE_BRANCH_WORKFLOW.md** – empfohlener Git-Workflow für umfangreiche Features.
* **engine/README.md** – Detaildokumentation der Engine-Module und des Build-Prozesses.

---

## Lizenz

Veröffentlicht unter der MIT-Lizenz. Die vollständigen Lizenzbedingungen stehen in `LICENSE.md`.

