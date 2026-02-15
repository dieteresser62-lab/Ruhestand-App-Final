# Ruhestand-App-Final

Die Ruhestand-App ist ein vollständig lokal ausführbares Planungstool mit zwei Oberflächen:

* **Balance-App** – steuert den jährlichen Entnahmeprozess, verwaltet Liquidität und erzeugt Diagnoseberichte.
* **Simulator** – führt Monte-Carlo-Simulationen, Parameter-Sweeps und Pflegefall-Szenarien aus.

Beide Anwendungen laufen ohne Build-Tool oder externe Abhängigkeiten direkt im Browser und teilen sich eine modulare Berechnungs-Engine.

---

## Release-Stand

**Aktueller Stand:** 2026-02-15  
**Changelog:** siehe [CHANGELOG.md](CHANGELOG.md)

---

## Dokumentation

| Dokument | Zielgruppe | Inhalt |
|----------|------------|--------|
| **[QUICKSTART.md](QUICKSTART.md)** | Einsteiger | Start in 2 Minuten, erste Schritte |
| **[docs/guides/GUIDED_TOURS.md](docs/guides/GUIDED_TOURS.md)** | Alle Nutzer | Schritt-für-Schritt-Anleitungen für typische Aufgaben |
| **[Handbuch.html](Handbuch.html)** | Alle Nutzer | Interaktive Hilfe im Browser |
| **[CHANGELOG.md](CHANGELOG.md)** | Alle Nutzer/Entwickler | Änderungen pro Release |
| **[docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md](docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md)** | Fortgeschrittene | Algorithmen, Fachlogik, Designentscheidungen |
| **[docs/reference/TECHNICAL.md](docs/reference/TECHNICAL.md)** | Entwickler | Architektur, Build, Debugging |
| **[docs/README.md](docs/README.md)** | Autoren/Entwickler | Doku-Struktur und Aufräum-Status |
| **[docs/internal/archive/2026-dynamic-flex/](docs/internal/archive/2026-dynamic-flex/)** | Entwickler (intern) | Archiv der Dynamic-Flex-Implementierungsunterlagen (Plan, Tickets, Rollout, Baseline, CAPE-Contract) |

---

## Funktionen im Überblick

### Balance-App
* Speichert Eingaben dauerhaft im `localStorage` und erzeugt auf Wunsch Dateisnapshots (File System Access API).
* Importiert/Exportiert Portfolios als JSON und liest Marktdaten aus CSV-Dateien ein.
* **Jahres-Update mit Online-Datenabruf:** Automatischer Abruf von Inflationsdaten (ECB, World Bank, OECD) und ETF-Kursen (VWCE.DE via Yahoo Finance über lokalen Proxy), automatisches Nachrücken der Marktdaten und ATH-Update. Detailliertes Update-Protokoll zeigt Datenquellen und abgerufene Werte.
* **Auto-CAPE im Jahreswechsel:** US-Shiller-CAPE wird im Jahresupdate automatisch geladen (Fallback: Yale → Mirror → letzter gespeicherter Wert). CAPE-Fehler blockieren den Jahreswechsel nicht.
* **Ausgaben-Check (monatlich):** CSV-Import pro Monat und Profil, Budgetkontrolle je Monat, Detailansicht mit Top-3-Kategorien, Jahreshochrechnung (ab 2 Datenmonaten mit Median), Soll/Ist auf Basis importierter Monate sowie Jahres-Historie per Jahr-Auswahl.
* **Jahresabschluss + Ausgaben-Historie:** Beim Jahresabschluss wechselt der Ausgaben-Check automatisch auf das nächste Jahr; Vorjahre bleiben vollständig einsehbar.
* Nutzt die Engine v31 zur Marktanalyse, Entnahmeplanung und Liquiditätssteuerung.
* Jahresübergreifende Verlustverrechnung (Verlusttopf) ist integriert; die finale Steuer stammt aus dem Jahres-Settlement.
* Diagnoseansicht mit Guardrails, Entscheidungsbaum und Key-Performance-Parametern.
* **Depot-Tranchen-Manager:** Detaillierte Tranchen werden automatisch geladen und für steueroptimierte Verkäufe genutzt.
* **Profil-Verwaltung:** Optionales Namensfeld zur Unterscheidung von Snapshots (z. B. "Max" vs. "Partnerin") für effektive Mehr-Personen-Planung.
* Tastenkürzel u. a. für Jahresabschluss (`Alt` + `J`), Import (`Alt` + `I`), Export (`Alt` + `E`) und Marktdaten nachrücken (`Alt` + `N`).

### Simulator
* Monte-Carlo-Simulationen mit unterschiedlichen Renditequellen (historisch, Regime, Block-Bootstrap) inkl. Worker-Parallelisierung. Historische Daten reichen bis 1925 (Schwarze-Schwan-Phase optional per Filter/Recency abgewichtbar).
* **Parameter-Sweep mit Auto-Optimize:** Whitelist-Ansatz, Deep-Clones und Wächterlogik für Zwei-Personen-Setups. Worker-Parallelisierung fuer Sweep und Auto-Optimize, 3-stufige Optimierung (~8-10x schneller), dynamische Parameter-UI (1-7 Parameter), Preset-Konfigurationen und Champion-Config-Output für die Strategiefindung. Details siehe `docs/reference/AUTO_OPTIMIZE_DETAILS.md`.
* **Dynamic-Flex (VPW) Profile:** Profilsteuerung (`Aus`, `Defensiv`, `Ausgewogen`, `Offensiv`) mit optionalen erweiterten Parametern für `horizonYears`, `survivalQuantile` und `goGoMultiplier`.
* **Auto-Optimize Dynamic-Flex-Modus:** `inherit`, `force_on`, `force_off`; Dynamic-Flex-Parameter sind nur bei effektiv aktivem Dynamic-Flex optimierbar, inklusive Safety-Guards gegen zu aggressive Lösungen.
* **Workflow-Transparenz:** Die Hauptabläufe (Balance, Monte-Carlo, Backtest) sind nun als Pseudo-Code dokumentiert: `docs/reference/WORKFLOW_PSEUDOCODE.md`.
* Stresstests, Pflegefall-Szenarien und Heatmap-Visualisierung (fokussiert auf Rentenphase). Neue Presets: Great Depression (1929-1933) und Zweiter Weltkrieg (1939-1945).
* Sweep-Schutz für Partner:innen-Renten inklusive Rente-2-Invarianz und Heatmap-Badges.
* Szenario-Log-Analyse mit 30 auswählbaren Szenarien: 15 charakteristische (Perzentile, Pflege-Extremfälle, Risiko-Szenarien) und 15 zufällige Samples für typisches Verhalten.
* Checkboxen für Pflege-Details und detailliertes Log, JSON/CSV-Export für ausgewählte Szenarien.
* **Tranchen-Integration:** Steueroptimierte Verkäufe mit detaillierten Depot-Positionen (Balance/Simulator teilen dieselben Tranchen).
* Notfallverkäufe werden steuerlich per Gesamt-Settlement-Recompute mit den regulären Verkäufen des Jahres konsistent verrechnet.

#### Schrittfolge für den Simulator (Simulator.html)
1. **Profile wählen & Rahmendaten:** Im Tab „Rahmendaten“ die gewünschten Profile aktivieren. Die Vermögenswerte und Renten werden automatisch aggregiert und schreibgeschützt angezeigt.
    *   **Bedarf pflegen:** `Floor-Bedarf p.a.` (Muss-Ausgaben) und `Flex-Bedarf p.a.` (Wunsch-Ausgaben) sind hier editierbar und essenziell für die Strategie.
2. **Details & Personen prüfen:** Kontrollieren Sie die aus den Profilen übernommenen Renten und Startalter in der Sektion "Personen & Rente". Erweiterte Einstellungen (z.B. Gold-Strategie) können ebenfalls angepasst werden.
3. **Monte-Carlo-Simulation:** Im Tab „Monte-Carlo“ Parameter wie Anzahl der Läufe oder Aktienquote justieren (Default ist oft ausreichend) und **Simulation starten** klicken.
4. **Backtesting (Realitätscheck):** Nutzen Sie den Tab „Backtesting“, um Ihre Strategie gegen historische Marktverläufe (z.B. ab 2000) zu validieren.
5. **Ergebnisse interpretieren:** In der Ergebnisübersicht die Kennzahl „Erfolgswahrscheinlichkeit“ heranziehen (Ziel > 95%). Heatmaps zeigen Sensitivitäten, und das Szenario-Log bietet Analysen zu typischen und extremen Verläufen (inkl. Pflegekosten).
6. **Optimierung (Sweep):** Im Tab „Sweep“ können Parameter (z.B. Aktienquote) automatisiert variiert werden, um das Optimum zu finden.
7. **Dynamic-Flex verifizieren:** Für neue Entnahmelogik zuerst Backtest prüfen, danach Monte Carlo, dann Sweep/Auto-Optimize mit denselben Dynamic-Flex-Einstellungen.

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

#### Profilverbund (Multi-Profil)

Die Suite kann mehrere Profile als Profilverbund gleichzeitig auswerten. Es gibt keinen separaten Tab mehr – die Auswahl der Profile steuert Balance und Simulator direkt.

**Profilverwaltung:**
* Profile können unter `index.html` angelegt, umbenannt und zwischen ihnen gewechselt werden
* Jedes Profil speichert eigene Balance- und Simulator-Daten (Vermögen, Ausgaben, Renten, Tranchen)
* Export/Import-Funktion für Backups der gesamten Profil-Registry

**Balance-App (Profilverbund):**
* Profile werden per Checkbox ausgewählt (Standard: alle aktiv).
* Vermögenswerte, Tranchen und feste Einkünfte werden über die gewählten Profile aggregiert.
* Entnahme-Verteilung: Proportional (nach Vermögen), Runway-First oder Steueroptimiert.

**Simulator (Profilverbund):**
* Profile werden im Tab „Rahmendaten“ ausgewählt.
* Startvermögen, Floor/Flex und Renten werden aus den Profilen gefüllt.
* Personenanzahl und Renten ergeben sich automatisch aus der Profilwahl.

**Wichtige Hinweise:**
* Gold-Strategie wird pro Profil gepflegt und in Balance/Simulator übernommen.
* Tranchen werden aus den aktiven Profilen zusammengeführt.
* Detaillierte Designdokumentation siehe `docs/reference/PROFILVERBUND_FEATURES.md`

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
├── app/
│   ├── balance/                # ES6-Module der Balance-App
│   ├── simulator/              # ES6-Module des Simulators
│   ├── profile/                # Profilverwaltung / Profilverbund
│   ├── tranches/               # Tranchen-Status & Aggregation
│   └── shared/                 # gemeinsame Utilities/Formatter
├── engine/                     # Quellmodule der Berechnungsengine (ESM)
│   ├── config.mjs
│   ├── core.mjs
│   ├── errors.mjs
│   ├── index.mjs
│   ├── analyzers/MarketAnalyzer.mjs
│   ├── planners/SpendingPlanner.mjs
│   ├── transactions/
│   │   ├── TransactionEngine.mjs
│   │   ├── transaction-action.mjs
│   │   ├── transaction-opportunistic.mjs
│   │   ├── transaction-surplus.mjs
│   │   ├── sale-engine.mjs
│   │   └── transaction-utils.mjs
│   └── validators/InputValidator.mjs
├── engine.js                   # Gebündelte Engine (generiert)
├── build-engine.mjs            # Node-Skript zum Bundlen der Engine
├── css/
│   └── balance.css             # Styling der Balance-App
├── simulator.css               # Styling der Simulator-Oberfläche
├── docs/reference/TECHNICAL.md                # Technische Details & Architektur
├── docs/reference/BALANCE_MODULES_README.md   # Modulübersicht Balance-App
└── ...                         # Weitere Hilfsdateien und Tests
```

---

## Systemvoraussetzungen

Die Anwendung ist bewusst minimalistisch gehalten, hat aber für den vollen Funktionsumfang folgende Anforderungen:

1.  **Browser:** Ein moderner Browser (Chrome, Edge, Firefox) mit Unterstützung für ES6-Module und die File System Access API (für Snapshots/Speichern).
2.  **Node.js (Optional):** Für den automatischen Abruf von Online-Kursdaten (ETF-Preise) wird ein lokaler Proxy benötigt. Dieser setzt eine installierte [Node.js](https://nodejs.org/)-Laufzeitumgebung voraus.
    *   *Ohne Node.js:* Die App startet normal, aber der Button "Online-Update" im Tranchen-Manager ist ohne Funktion. Manuelle Kurspflege ist weiterhin möglich.

---


## Nutzung

### Option 1: Standalone-Anwendung

**RuhestandSuite.exe** – portable Standalone-Desktop-Anwendung basierend auf Tauri:
* Keine Installation, kein Installer und keine Administratorrechte erforderlich
* Direkt ausführbar unter Windows (getestet mit Windows 10/11)
* Beinhaltet beide Apps (Balance & Simulator) in einer nativen Desktop-Umgebung
* Läuft komplett offline; Internetzugriff wird nur für optionale Live-Daten (Inflation/Kurse) benötigt
* Download direkt aus dem Repository-Root (`RuhestandSuite.exe`) oder dem GitHub-Release
* Enthaelt einen integrierten Yahoo-Proxy fuer Kurs-Updates im Depot-Tranchen-Manager (lokaler Port 8787)

**So nutzen Sie die portable EXE:**
1. `RuhestandSuite.exe` aus dem Repository oder Release-Download in einen beliebigen Ordner kopieren.
2. Per Doppelklick starten; der integrierte Webserver und die Oberfläche öffnen sich automatisch.
3. Optionale Live-Datenzugriffe funktionieren, wenn eine Internetverbindung besteht; andernfalls läuft die App vollständig lokal weiter.
4. Eigene Szenarien und Snapshots werden im Benutzerprofil gespeichert; bei Bedarf kann die EXE samt Konfigurationsordner als Backup kopiert werden.

### Option 2: Browser-basierte Nutzung

1. Repository klonen oder herunterladen.
2. **Suite starten:** Doppelklick auf `start_suite.cmd` (Windows).
   * Startet automatisch den lokalen Webserver (Port 8000) und den Yahoo-Proxy für Online-Kurse (Port 8787).
   * Öffnet den Browser mit der Startseite.
   * Beim Schließen (Ctrl+C oder Fenster schließen) werden beide Prozesse sauber beendet.
3. `Balance.html` bzw. `Simulator.html` im Browser aufrufen.
   * Getestet mit Chromium-basierten Browsern und Firefox.
   * Keine Build-Schritte nötig.
4. Optional: `npm run build:engine` ausführen, wenn Änderungen in `engine/` vorgenommen wurden. Dadurch wird `engine.js` aktualisiert (esbuild-Bundle oder Modul-Fallback).
5. Für CI/Release: `npm run build:engine:strict` nutzen. Der Build schlägt dann ohne `esbuild` bewusst fehl.

**Weitere Skripte:**
* `stop_suite.cmd` – Beendet eventuell noch laufende Server-Prozesse (Webserver und Proxy).
* Manuell ohne Proxy: `python dev_server.py --port 8000` (Online-Kurse dann nicht verfügbar).

> **Hinweis:** Einige Funktionen (Snapshots, Dateiimporte) benötigen Browser mit File-System-Access-Unterstützung. Der Yahoo-Proxy benötigt Node.js; ohne Node.js läuft die Suite trotzdem, jedoch ohne Online-Kursabruf.

---

## Entwicklung

* Die Balance- und Simulator-Module nutzen native ES6-Imports. Änderungen an einzelnen Modulen werden nach dem Speichern direkt beim nächsten Reload geladen.
* Engine-Anpassungen erfolgen in den Modulen unter `engine/`. Nach Anpassungen `npm run build:engine` ausführen und die Größe der generierten `engine.js` kontrollieren.
* Für schnelle QA bitte `npm test` einmal durchlaufen lassen.

## Abschluss-Checkliste

* **Dokumentation synchron halten:** Nach Engine-Änderungen oder neuen Simulator-Modulen (z. B. Monte-Carlo-Runner/UI/Analyzer) README, `docs/reference/TECHNICAL.md` und `docs/reference/SIMULATOR_MODULES_README.md` aktualisieren.
* **Konsole sauber halten:** Vor dem Release auskommentierten Code entfernen, damit Nutzer:innen keine unnötigen Meldungen im Browser-Log sehen.
* **Tauri/Web-Worker:** Die Parallelisierung nutzt Web Worker mit Transferables (kein SharedArrayBuffer). Das funktioniert in Tauri als EXE, sofern die Worker-Skripte gebündelt und per `new URL(..., import.meta.url)` erreichbar sind. CSP/Asset-Bundling sollten Worker-Module erlauben.

---

## Weitere Dokumentation

* **docs/reference/TECHNICAL.md** – kompakte technische Referenz (Module, Datenflüsse, Laufzeitverhalten).
* **docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md** – vertiefte Architektur-, Fach- und Methoden-Dokumentation (inkl. Herleitungen/Abgrenzungen).
* **docs/reference/BALANCE_MODULES_README.md** – Modulübersicht der Balance-App.
* **docs/reference/SIMULATOR_MODULES_README.md** – Modulübersicht des Simulators (MC, Sweep, Backtest, UI-Pfade).
* **engine/README.md** – Engine-Module und Build-Prozess.
* **tests/README.md** – Aufbau und Ausführung der Test-Suite.
* **docs/reference/WORKFLOW_PSEUDOCODE.md** – Ablaufdarstellung zentraler Workflows in Pseudocode.

---

## Lizenz

Veröffentlicht unter der MIT-Lizenz. Die vollständigen Lizenzbedingungen stehen in `LICENSE.md`.
