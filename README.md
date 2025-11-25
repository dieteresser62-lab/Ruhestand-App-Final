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
* Sweep-Schutz für Partner:innen-Renten inklusive Rente-2-Invarianz, Heatmap-Badges und Dev-Self-Tests für den Wächter.
* Szenario-Log-Analyse mit 30 auswählbaren Szenarien: 15 charakteristische (Perzentile, Pflege-Extremfälle, Risiko-Szenarien) und 15 zufällige Samples für typisches Verhalten.
* Checkboxen für Pflege-Details und detailliertes Log, JSON/CSV-Export für ausgewählte Szenarien.
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
Zusätzlich gibt es nun Staffel-Presets (ambulant/stationär), einen regionalen Zuschlagsregler, Echtzeit-Badges zum Maximal-
Floor sowie Listener, die alle Pflegefelder synchron halten – inklusive Info-Hinweis und Tooltips im UI.【F:simulator-main.js†L89-L1506】

Das Simulator-Dashboard erweitert die Pflegeanalyse um KPI-Karten pro Person, Eintrittsalter, Pflegedauer, simultane Pflegejahre
und Kosten- sowie Shortfall-Deltas. Die Szenario-Log-Auswahl ermöglicht die Analyse von 30 verschiedenen Simulationsläufen inkl.
Pflege-Details und Export-Funktion.【F:simulator-results.js†L269-L427】【F:simulator-main.js†L1039-L1129】

#### Rentenlogik

Die Simulator-Eingaben bündeln nun beide Rentenstränge: eine gemeinsame Indexierungslogik (fix, Lohn oder CPI), Hinterbliebenen-
optionen mit Mindest-Ehezeiten, Partner-Konfiguration (inkl. Migration älterer Felder) sowie geschützte Einstellungen für Rente 2.
Alle Werte landen gesammelt in `getCommonInputs()`, das Rentenstart, Anpassungsmodus und Witwenlogik normalisiert und persistente
Defaults (z. B. Steuerquoten) berücksichtigt.【F:simulator-portfolio.js†L57-L174】 Die Anpassungsrate wird zentral über `computeRentAdjRate`
berechnet und für beide Personen angewandt, wodurch erste Auszahlungsjahre und spätere Indexierungen konsistent bleiben.【F:simulator-portfolio.js†L285-L332】

Das UI blendet Partner- und Rentenfelder dynamisch ein, deaktiviert Prozentfelder automatisch bei lohn- oder inflationsgekoppelter
Anpassung und merkt sich den Aktivierungsstatus im `localStorage`. Gleichzeitig schützt der Sweep-Wächter alle Person-2-Felder über
Whitelist, Blocklist und Rente-2-Invarianz-Checks, markiert Verstöße in der Heatmap und lässt sich über einen Dev-Self-Test prüfen.【F:simulator-main.js†L3-L64】【F:simulator-main.js†L1563-L1614】

### Gemeinsame Engine
* Acht ES-Module (`engine/`) kapseln Validierung, Marktanalyse, Ausgabenplanung und Transaktionslogik.
* `build-engine.mjs` bündelt die Module per `esbuild` (oder Modul-Fallback) zu `engine.js`, das in beiden Oberflächen als `EngineAPI` bzw. `Ruhestandsmodell_v30` geladen wird.
* Konfigurierbare Guardrails, Marktregime-Übersetzungen und Strategien für Liquiditätsziele.

---

## Repository-Struktur

```
Ruhestand-App-Final/
├── Balance.html                # Einstiegspunkt Balance-App
├── Simulator.html              # Einstiegspunkt Simulator
├── balance-*.js                # ES6-Module der Balance-App
├── simulator-*.js              # ES6-Module des Simulators
├── engine/                     # Quellmodule der Berechnungsengine (ESM)
│   ├── config.mjs
│   ├── core.mjs
│   ├── errors.mjs
│   ├── adapter.mjs
│   ├── analyzers/MarketAnalyzer.mjs
│   ├── planners/SpendingPlanner.mjs
│   ├── transactions/TransactionEngine.mjs
│   └── validators/InputValidator.mjs
├── engine.js                   # Gebündelte Engine (generiert)
├── build-engine.mjs            # Node-Skript zum Bundlen der Engine
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
3. Optional: `npm run build:engine` ausführen, wenn Änderungen in `engine/` vorgenommen wurden. Dadurch wird `engine.js` aktualisiert (esbuild-Bundle oder Modul-Fallback).
4. Für lokale Aufrufe bitte den mitgelieferten Entwicklungsserver nutzen, damit `.mjs`-Module korrekt als JavaScript ausgeliefert werden:
   * Windows: `index_start.bat` starten (ruft intern `python dev_server.py --port 8000 --bind 127.0.0.1 --directory .` auf).
   * Manuell: `python dev_server.py --port 8000 --bind 127.0.0.1 --directory .`
   * Hintergrund: Einige Python-Versionen (z. B. 3.14) geben `engine/index.mjs` sonst mit falschem MIME-Type aus, wodurch die Engine nicht geladen wird.

> **Hinweis:** Einige Funktionen (Snapshots, Dateiimporte) benötigen Browser mit File-System-Access-Unterstützung.

---

## Entwicklung

* Die Balance- und Simulator-Module nutzen native ES6-Imports. Änderungen an einzelnen Modulen werden nach dem Speichern direkt beim nächsten Reload geladen.
* Engine-Anpassungen erfolgen in den Modulen unter `engine/`. Nach Anpassungen `npm run build:engine` ausführen und die Größe der generierten `engine.js` kontrollieren.
* Für schnelle QA bitte den Selftest `node sim-parity-smoketest.js` einmal durchlaufen lassen (entspricht `npm test`).
* Debug-Modi über Tastenkombinationen oder lokale Storage-Flags aktivieren (`balance_debug_mode`, `sim.devMode`).
* Für Tests der Parameter-Sweeps steht im Simulator-Dev-Modus `runSweepSelfTest()` bereit.

## Abschluss-Checkliste

* **Dokumentation synchron halten:** Nach Engine-Änderungen oder neuen Simulator-Modulen (z. B. Monte-Carlo-Runner/UI/Analyzer) README, TECHNICAL.md und SIMULATOR_MODULES_README aktualisieren.
* **Konsole sauber halten:** Vor dem Release auskommentierten Code und obsolet gewordene Debug-Logs entfernen bzw. hinter Dev-Toggles parken, damit Nutzer:innen keine Rauschen im Browser-Log sehen.

---

## Weitere Dokumentation

* **BALANCE_MODULES_README.md** – detaillierte Beschreibung der Balance-Module.
* **SIMULATOR_MODULES_README.md** – aktuelle Modulübersicht (Monte-Carlo, Sweep, Backtest, UI-Pfade) inkl. Init-Funktionen und Platzierung neuer Helfer.
* **TECHNICAL.md** – Architekturübersicht von Engine, Balance- und Simulator-Anwendung.
* **TYPESCRIPT_MIGRATION_KONZEPT.md** – Plan für eine mögliche Migration auf TypeScript.
* **FEATURE_BRANCH_WORKFLOW.md** – empfohlener Git-Workflow für umfangreiche Features.
* **engine/README.md** – Detaildokumentation der Engine-Module und des Build-Prozesses.

---

## Lizenz

Veröffentlicht unter der MIT-Lizenz. Die vollständigen Lizenzbedingungen stehen in `LICENSE.md`.

