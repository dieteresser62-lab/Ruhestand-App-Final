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
* **Jahres-Update mit Online-Datenabruf:** Automatischer Abruf von Inflationsdaten (ECB, World Bank, OECD) und ETF-Kursen (VWCE.DE via Yahoo Finance/Finnhub), automatisches Nachrücken der Marktdaten und ATH-Update. Detailliertes Update-Protokoll zeigt Datenquellen und abgerufene Werte.
* Nutzt die Engine v31 zur Marktanalyse, Entnahmeplanung und Liquiditätssteuerung.
* Diagnoseansicht mit Guardrails, Entscheidungsbaum und Key-Performance-Parametern.
* **Profil-Verwaltung:** Optionales Namensfeld zur Unterscheidung von Snapshots (z. B. "Dieter" vs. "Partnerin") für effektive Mehr-Personen-Planung.
* Tastenkürzel u. a. für Jahresabschluss (`Alt` + `J`), Import (`Alt` + `I`), Export (`Alt` + `E`) und Marktdaten nachrücken (`Alt` + `N`).

### Simulator
* Monte-Carlo-Simulationen mit unterschiedlichen Renditequellen (historisch, Regime, Block-Bootstrap) inkl. Worker-Parallelisierung.
* **Parameter-Sweep mit Auto-Optimize:** Whitelist-Ansatz, Deep-Clones und Wächterlogik für Zwei-Personen-Haushalte. Worker-Parallelisierung fuer Sweep und Auto-Optimize, 3-stufige Optimierung (~8-10x schneller), dynamische Parameter-UI (1-7 Parameter), Preset-Konfigurationen und Champion-Config-Output für optimale Strategiefindung.
* Stresstests, Pflegefall-Szenarien und Heatmap-Visualisierung (fokussiert auf Rentenphase).
* Sweep-Schutz für Partner:innen-Renten inklusive Rente-2-Invarianz und Heatmap-Badges.
* Szenario-Log-Analyse mit 30 auswählbaren Szenarien: 15 charakteristische (Perzentile, Pflege-Extremfälle, Risiko-Szenarien) und 15 zufällige Samples für typisches Verhalten.
* Checkboxen für Pflege-Details und detailliertes Log, JSON/CSV-Export für ausgewählte Szenarien.

#### Schrittfolge für den Simulator (Simulator.html)
1. **Rahmendaten ausfüllen:** In der Registerkarte „Rahmendaten“ die Kernfelder belegen – u. a. `Gesamtvermögen` (Default: 2 700 000 €), `Depotwert Alt` (1 350 000 €), `Ziel-Liquidität` (200 000 €), `Floor-Bedarf p.a.` (24 000 €) und `Flex-Bedarf p.a.` (28 000 €). Fortgeschrittene Felder wie Gold-Strategie und Runway/Rebalancing bleiben mit sinnvollen Startwerten vorbelegt und können bei Bedarf angepasst werden.
2. **Renten- und Einkommenstränge prüfen:** Unter den Reitern für Rente/Partner (eingebettet in den Rahmendaten) Startalter, Indexierung (fix, Lohn oder CPI), Witwenlogik und sichere Rentenanteile setzen. Standardindexierung ist auf fixe Anpassung ausgelegt; Prozentfelder werden automatisch deaktiviert, wenn eine lohn- oder inflationsgekoppelte Anpassung gewählt wird.
3. **Monte-Carlo-Parameter justieren:** Im Tab „Monte-Carlo“ die Anzahl der Läufe (`Anzahl Simulationen`, Default: 1 000), die historischen Quellen (z. B. Regime- oder Block-Bootstrap) und die Aktienquote konfigurieren. Für erste Analysen genügt der Default-Satz, der auf ein balanciertes Wachstums-/Risikoprofil optimiert ist. Im Advanced-Bereich lassen sich Worker-Anzahl und Job-Timebudget setzen.
4. **Parameter-Sweep (Tab „Sweep“) ausführen:** Typischer Ablauf: einen Parameter (z. B. `Aktienquote`, `Sparrate` oder `Renteneintritt`) freigeben, Sweep-Grenzen und Schrittweite setzen und den Sweep starten. Der Auto-Optimize-Modus wählt sinnvolle Presets, clont die Basiskonfiguration defensiv und schützt Partner:innendaten. Ergebnisse erscheinen als Heatmap; Badge-Markierungen zeigen invarianten Verletzungen (z. B. Rente-2-Schutz) an.
5. **Ergebnisse interpretieren:** In der Ergebnisübersicht die Kennzahl „Erfolgswahrscheinlichkeit“ heranziehen; Zielwert ist üblicherweise **> 95 %** für robuste Pläne. Heatmaps zeigen Sensitivitäten einzelner Parameter, das Szenario-Log bietet typische und Extrem-Verläufe (inkl. Pflegekosten) und lässt sich als JSON/CSV exportieren. Beispielhafte Visualisierung siehe `assets/images/retirement_hero_illustration.png` (als Referenzabbildung einbindbar).

**Häufige Eingabefehler und Korrekturen**
* Negative oder unrealistisch hohe Werte (z. B. `Gesamtvermögen` < 0 oder CAPE > 80) führen zu Warnungen – bitte auf plausible Spannen korrigieren.
* Prozentwerte im Sweep vergessen zu normalisieren: sicherstellen, dass Quoten in Prozent eingegeben werden (z. B. 60 statt 0.6) oder per Tooltip prüfen; der Simulator clamp’t intern, weist aber auf Fehleingaben hin.
* Fehlende Pflichtfelder nach Tab-Wechsel: Wenn das UI Inputs deaktiviert (z. B. Rentenprozente bei CPI-Indexierung), zuerst den Anpassungsmodus zurück auf „fix“ stellen oder den Wert via Reset-Button neu laden und anschließend den gewünschten Modus wählen.
* Konflikte zwischen Partner:inneneingaben (Rente-2-Invarianz): Sweep-Wächter meldet blockierte Felder; Korrektur durch Spiegeln der Einstellungen in beiden Rententabs oder Deaktivierung des Sweep für geschützte Felder.
* Browser blockiert CSV/JSON-Export oder Snapshots: Pop-up/Download-Berechtigungen prüfen oder alternativen Browser mit File-System-Access-Unterstützung verwenden.

#### Ansparphase (Accumulation Phase)

Der Simulator unterstützt nun optional eine Ansparphase vor dem Renteneintritt:
* **Startalter & Dauer:** Flexible Definition des Simulationsbeginns (z. B. ab 40) und der Anspardauer.
* **Sparrate:** Jährliche Sparleistung, die dem Portfolio zugeführt wird (statt Entnahmen).
* **Übergang:** Automatischer Wechsel in die Entnahmephase nach Ablauf der Dauer.
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
* `build-engine.mjs` bündelt die Module per `esbuild` (oder Modul-Fallback) zu `engine.js`, das in beiden Oberflächen als `EngineAPI` geladen wird.
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
└── ...                         # Weitere Hilfsdateien und Tests
```

---

## Nutzung

### Option 1: Standalone-Anwendung (empfohlen)

**RuhestandSuite.exe** – portable Standalone-Desktop-Anwendung basierend auf Tauri:
* Keine Installation, kein Installer und keine Administratorrechte erforderlich
* Direkt ausführbar unter Windows (getestet mit Windows 10/11)
* Beinhaltet beide Apps (Balance & Simulator) in einer nativen Desktop-Umgebung
* Läuft komplett offline; Internetzugriff wird nur für optionale Live-Daten (Inflation/Kurse) benötigt
* Download direkt aus dem Repository-Root (`RuhestandSuite.exe`) oder dem GitHub-Release

**So nutzen Sie die portable EXE:**
1. `RuhestandSuite.exe` aus dem Repository oder Release-Download in einen beliebigen Ordner kopieren.
2. Per Doppelklick starten; der integrierte Webserver und die Oberfläche öffnen sich automatisch.
3. Optionale Live-Datenzugriffe funktionieren, wenn eine Internetverbindung besteht; andernfalls läuft die App vollständig lokal weiter.
4. Eigene Szenarien und Snapshots werden im Benutzerprofil gespeichert; bei Bedarf kann die EXE samt Konfigurationsordner als Backup kopiert werden.

### Option 2: Browser-basierte Nutzung

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
* Für schnelle QA bitte `npm test` einmal durchlaufen lassen.

## Abschluss-Checkliste

* **Dokumentation synchron halten:** Nach Engine-Änderungen oder neuen Simulator-Modulen (z. B. Monte-Carlo-Runner/UI/Analyzer) README, TECHNICAL.md und SIMULATOR_MODULES_README aktualisieren.
* **Konsole sauber halten:** Vor dem Release auskommentierten Code entfernen, damit Nutzer:innen keine unnötigen Meldungen im Browser-Log sehen.
* **Tauri/Web-Worker:** Die Parallelisierung nutzt Web Worker mit Transferables (kein SharedArrayBuffer). Das funktioniert in Tauri als EXE, sofern die Worker-Skripte gebündelt und per `new URL(..., import.meta.url)` erreichbar sind. CSP/Asset-Bundling sollten Worker-Module erlauben.

---

## Weitere Dokumentation

* **BALANCE_MODULES_README.md** – detaillierte Beschreibung der Balance-Module.
* **SIMULATOR_MODULES_README.md** – aktuelle Modulübersicht (Monte-Carlo, Sweep, Backtest, UI-Pfade) inkl. Init-Funktionen und Platzierung neuer Helfer.
* **TECHNICAL.md** – Architekturübersicht von Engine, Balance- und Simulator-Anwendung.
* **engine/README.md** – Detaildokumentation der Engine-Module und des Build-Prozesses.

---

## Lizenz

Veröffentlicht unter der MIT-Lizenz. Die vollständigen Lizenzbedingungen stehen in `LICENSE.md`.

