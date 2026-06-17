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
* Speichert Eingaben ueber die zentrale Persistenz-Facade; im Browser ist IndexedDB die lokale Source of Truth, Tauri nutzt `ruhestand_suite_data.json` im App-Datenverzeichnis.
* Komplett-Backup und Komplett-Import liegen zentral auf der Startseite unter `Profile > Erweitert`; Jahresabschluss-Snapshots bleiben als fachlicher Sicherungspunkt in einem separaten internen Snapshot-Archiv erhalten.
* Liest Marktdaten und Ausgaben aus CSV-Dateien ein.
* **Jahres-Update mit Online-Datenabruf:** Automatischer Abruf von Inflationsdaten (ECB, World Bank, OECD) und ETF-Kursen (VWCE.DE via Yahoo Finance über lokalen Proxy), automatisches Nachrücken der Marktdaten und ATH-Update. Detailliertes Update-Protokoll zeigt Datenquellen und abgerufene Werte.
* **Auto-CAPE im Jahreswechsel:** US-Shiller-CAPE wird im Jahresupdate automatisch geladen (Fallback: Yale → Mirror → letzter gespeicherter Wert). CAPE-Fehler blockieren den Jahreswechsel nicht.
* **Ausgaben-Check (monatlich):** CSV-Import pro Monat und Profil, Budgetkontrolle je Monat, Detailansicht mit Top-3-Kategorien, Jahreshochrechnung (ab 2 Datenmonaten mit Median), Soll/Ist auf Basis importierter Monate sowie Jahres-Historie per Jahr-Auswahl.
* **Jahresabschluss + Ausgaben-Historie:** Beim Jahresabschluss entsteht zuerst ein Pre-Mutation-Snapshot, danach wechselt der Ausgaben-Check automatisch auf das nächste Jahr; Vorjahre bleiben vollständig einsehbar.
* **Mindest-Flex p.a.:** Optionale, bedingte Untergrenze fuer Flex-Ausgaben in kuerzenden Safety-/Guardrail-Phasen; sie ersetzt nicht den Floor und wird in Diagnose sowie Kopiertext transparent ausgewiesen.
* Nutzt die Engine v31 zur Marktanalyse, Entnahmeplanung und Liquiditätssteuerung.
* **Regime-Smoothing-Diagnose:** Kontinuierliche Drawdown-/CAPE-/Runway-Signale ergaenzen die diskreten Marktregime. Die geglaettete Runway-Zielberechnung bleibt per Default deaktiviert (`CONFIG.REGIME_SMOOTHING.TARGETS_ENABLED=false`), kann aber Diagnosefelder fuer Rohziel, Effektivziel, Severity, Fallback und harte Mindestgrenze ausweisen.
* Jahresübergreifende Verlustverrechnung (Verlusttopf) ist integriert; die finale Steuer stammt aus dem Jahres-Settlement.
* Diagnoseansicht mit Guardrails, Entscheidungsbaum und Key-Performance-Parametern.
* **Depot-Tranchen-Manager:** Detaillierte Tranchen werden automatisch geladen und für steueroptimierte Verkäufe genutzt.
* **Profil-Verwaltung:** Optionales Namensfeld zur Unterscheidung von Snapshots (z. B. "Max" vs. "Partnerin") für effektive Mehr-Personen-Planung.
* **Pflegebucket-Diagnose:** Liest die in der Profilpflege definierte gesperrte Geldmarkt-/Cash-Reserve und zeigt Brutto-Liquidität, Pflege-Zweckbindung, operative Liquidität und inflationsbezogene Zieldeckung. In der Balance-App ist der Bucket aktuell bewusst `diagnostic_only`; es erfolgt keine automatische operative Freigabe.
* Tastenkürzel u. a. für Jahresabschluss (`Alt` + `J`) und Marktdaten nachrücken (`Alt` + `N`).

### Simulator
* Monte-Carlo-Simulationen mit unterschiedlichen Renditequellen (historisch, Regime, Block-Bootstrap, Stationary Bootstrap) inkl. Worker-Parallelisierung. Historische Daten reichen bis 1925 (Schwarze-Schwan-Phase optional per Filter/Recency abgewichtbar); ein optionales Fat-Tail-/Crash-Overlay kann als expliziter Stresstest zugeschaltet werden.
* Monte-Carlo-Runner ist DOM-frei modularisiert; Chunk-Kontext, Startjahr-/CAPE-Sampling, Life-State-Initialisierung, Stress-Metriken, Logzeilen-Builder und Run-Metriken liegen in eigenen Simulator-Modulen.
* **Parameter-Sweep mit Auto-Optimize:** Whitelist-Ansatz, Deep-Clones und Wächterlogik für Zwei-Personen-Setups. Worker-Parallelisierung fuer Sweep und Auto-Optimize, mehrphasige Optimierung mit LHS, Quick-Filter, voller Evaluation, Refinement und Validierung (~8-10x schneller), dynamische Parameter-UI (1-7 Parameter), Preset-Konfigurationen und Champion-Config-Output für die Strategiefindung. Details siehe `docs/reference/AUTO_OPTIMIZE_DETAILS.md`.
* **Dynamic-Flex (VPW) Profile:** Profilsteuerung (`Aus`, `Defensiv`, `Ausgewogen`, `Offensiv`) mit optionalen erweiterten Parametern für `horizonYears`, `survivalQuantile` und `goGoMultiplier`.
* **CAPE-Return-Policy fuer VPW:** Die kontinuierliche CAPE-to-Return-Policy ist als expliziter Config-Modus `cape_continuous` verfuegbar. Default bleibt `legacy_step`, weil lokale Backtest-Vergleiche sichtbare Entnahme-/Endvermoegens-Deltas zeigen und der Default-Wechsel fachlich freigegeben werden muss.
* **Mindest-Flex p.a.:** Wird in Backtest, Monte Carlo, Sweep und Profilverbund bis in die Engine durchgereicht; Scenario-/Backtest-Logs zeigen Status, Blockiergrund und effektive Mindest-Flex-Wirkung.
* **Auto-Optimize Dynamic-Flex-Modus:** `inherit`, `force_on`, `force_off`; Dynamic-Flex-Parameter sind nur bei effektiv aktivem Dynamic-Flex optimierbar, inklusive Safety-Guards gegen zu aggressive Lösungen.
* **Workflow-Transparenz:** Die Hauptabläufe (Balance, Monte-Carlo, Backtest) sind nun als Pseudo-Code dokumentiert: `docs/reference/WORKFLOW_PSEUDOCODE.md`.
* **Log-Transparenz für Entnahmen:** Detaillierte Monte-Carlo-Scenario-Logs und Backtest-Logs zeigen additive Payout-/VPW-Erklärfelder (`EntPlan`, `EntEff`, `VPW€`, `VPWFlex`, `Liq>P`, `Liq<P`, `Port>P`, `PortEnd`) sowie Return-Policy-Diagnosen (`RetPol`, `RetSrc`, `CAPESt`, `ERRaw`, `ERClamp`, `SafeR`, `SafeSrc`), damit hohe Dynamic-Flex-Entnahmen nachvollziehbar bleiben.
* **Tail-Risk-Overlay:** Optionales, standardmäßig deaktiviertes Ereignis-Overlay für seltene Crash-/Inflationsschocks. Historische Krisenjahre erhalten keinen zusätzlichen Return-Schock; Ergebnis-KPIs und Scenario-Log-Exporte weisen aktive, angewandte und übersprungene Tail-Events separat aus.
* Stresstests, Pflegefall-Szenarien und Heatmap-Visualisierung (fokussiert auf Rentenphase). Neue Presets: Great Depression (1929-1933) und Zweiter Weltkrieg (1939-1945).
* Sweep-Schutz für Partner:innen-Renten inklusive Rente-2-Invarianz und Heatmap-Badges.
* Szenario-Log-Analyse mit 30 auswählbaren Szenarien: 15 charakteristische (Perzentile, Pflege-Extremfälle, Risiko-Szenarien) und 15 zufällige Samples für typisches Verhalten.
* Checkboxen für Pflege-Details und detailliertes Log, JSON/CSV-Export für ausgewählte Szenarien.
* **Tranchen-Integration:** Steueroptimierte Verkäufe mit detaillierten Depot-Positionen (Balance/Simulator teilen dieselben Tranchen).
* Notfallverkäufe werden steuerlich per Gesamt-Settlement-Recompute mit den regulären Verkäufen des Jahres konsistent verrechnet.
* **Pflegebucket als gesperrte Geldmarkt-/Cash-Reserve:** Der Simulator gliedert den optionalen Bucket nach dem Profilverbund-Merge aus Geldmarkt-Tranchen, ungetranchtem Geldmarkt und Tagesgeld aus. Die Engine sieht nur die operative Liquidität; der Bucket kann erst bei Pflege-Trigger vor Forced Sales Liquiditätslücken decken.

#### Schrittfolge für den Simulator (Simulator.html)
1. **Profile wählen & Rahmendaten:** Im Tab „Rahmendaten“ die gewünschten Profile aktivieren. Die Vermögenswerte und Renten werden automatisch aggregiert und schreibgeschützt angezeigt.
    *   **Bedarf pflegen:** `Floor-Bedarf p.a.` (Muss-Ausgaben) und `Flex-Bedarf p.a.` (Wunsch-Ausgaben) sind hier editierbar und essenziell für die Strategie.
2. **Details & Personen prüfen:** Kontrollieren Sie die aus den Profilen übernommenen Renten und Startalter in der Sektion "Personen & Rente". Erweiterte Einstellungen (z.B. Gold-Strategie) können ebenfalls angepasst werden.
3. **Monte-Carlo-Simulation:** Im Tab „Monte-Carlo“ Parameter wie Anzahl der Läufe oder Aktienquote justieren (Default ist oft ausreichend) und **Simulation starten** klicken.
4. **Backtesting (Realitätscheck):** Nutzen Sie den Tab „Backtesting“, um Ihre Strategie gegen historische Marktverläufe (z.B. ab 2000) zu validieren.
5. **Ergebnisse interpretieren:** In der Ergebnisübersicht die Kennzahl „Erfolgswahrscheinlichkeit“ heranziehen (Ziel > 95%). Heatmaps zeigen Sensitivitäten, und das Szenario-Log bietet Analysen zu typischen und extremen Verläufen (inkl. Pflegekosten). Für hohe Dynamic-Flex-Entnahmen den detaillierten Logmodus aktivieren und Payout-/VPW-Spalten prüfen.
6. **Optimierung (Sweep):** Im Tab „Sweep“ können Parameter (z.B. Aktienquote) automatisiert variiert werden, um das Optimum zu finden.
7. **Dynamic-Flex verifizieren:** Für neue Entnahmelogik zuerst Backtest prüfen, danach Monte Carlo, dann Sweep/Auto-Optimize mit denselben Dynamic-Flex-Einstellungen. Backtest- und Scenario-Log verwenden im detaillierten Modus dieselben Payout-/VPW- und Return-Policy-Begriffe.
8. **Tail-Risk vergleichen:** Für Stressanalysen zuerst einen Standardlauf ohne Overlay speichern/merken, dann Tail-Risk bewusst aktivieren und Erfolgsquote, P10/P50/P90, Max Drawdown, Real-CaR und Tail-Risk-KPIs vergleichen.

**Häufige Eingabefehler und Korrekturen**
* Negative oder unrealistisch hohe Werte (z. B. `Gesamtvermögen` < 0 oder CAPE > 80) führen zu Warnungen – bitte auf plausible Spannen korrigieren.
* Prozentwerte im Sweep vergessen zu normalisieren: sicherstellen, dass Quoten in Prozent eingegeben werden (z. B. 60 statt 0.6) oder per Tooltip prüfen; der Simulator clamp’t intern, weist aber auf Fehleingaben hin.
* Fehlende Pflichtfelder nach Tab-Wechsel: Wenn das UI Inputs deaktiviert (z. B. Rentenprozente bei CPI-Indexierung), zuerst den Anpassungsmodus zurück auf „fix“ stellen oder den Wert via Reset-Button neu laden und anschließend den gewünschten Modus wählen.
* Konflikte zwischen Partner:inneneingaben (Rente-2-Invarianz): Sweep-Wächter meldet blockierte Felder; Korrektur durch Spiegeln der Einstellungen in beiden Rententabs oder Deaktivierung des Sweep für geschützte Felder.
* Ungültige Tail-Risk-Parameter (z. B. Wahrscheinlichkeit > 5%, Dauer > Horizont oder Schocks außerhalb der erlaubten Grenzen) blockieren die Monte-Carlo-Simulation statt still geklemmt zu werden.
* Browser blockiert CSV/JSON-Export oder Dateiimporte: Pop-up/Download-Berechtigungen prüfen oder alternativen Browser mit File-System-Access-Unterstützung verwenden.

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

#### Pflegebucket

Der Pflegebucket ist eine optionale, zweckgebundene Selbstversicherungsreserve für schwere Pflegefälle. Er wird nicht als normale Liquidität, Runway-Puffer oder frei konsumierbares VPW-Vermögen behandelt.

**Source of Truth:** Die Definition liegt in der Profilpflege (`profile_health_bucket`) und wird von Simulator und Balance-App gelesen. Im Profilverbund gilt das Hauptprofil als maßgebliche Haushaltsdefinition; abweichende sekundäre Profildefinitionen erzeugen Warnungen.

**Simulator-Wirkung:** Beim Start wird der Bucket nach dem Profilverbund-Merge aus cash-nahen Quellen ausgegliedert: zuerst Geldmarkt-Tranchen per FIFO, dann ungetranchter Geldmarkt, danach Tagesgeld. Reicht die verfügbare Geldmarkt-/Cash-Liquidität nicht aus, wird der Bucket gekappt und im Log gewarnt. Der Engine-Air-Gap sorgt dafür, dass VPW, Runway, Ziel-Liquidität und Transaktionen nur mit operativer Liquidität rechnen.

**Freigabe:** Der Bucket wird nur bei definiertem Pflege-Trigger genutzt, standardmäßig ab Pflegegrad 4 im Modus `OR` für Person 1 oder Person 2. Der Standard `care_additional_floor_only` deckt nur pflegebedingte Zusatzlücken; `floor_when_care_active` kann den gesamten Floor-Shortfall bei aktivem Trigger decken.

**Diagnose:** Jahreslogs, Backtests und Monte Carlo zeigen Start, Nutzung, Verzinsung, Restbetrag, Trigger, reale Zieldeckung und inflationsindexierte Ziellücke. Der inflationsangepasste Zielwert ist eine Diagnosegröße; Version 1 füllt den Bucket nicht automatisch wieder auf.

**Steuervereinfachung:** Der Bucket-Verbrauch wird in Version 1 als cash-like Reserve modelliert. Geldmarkt-Tranchen werden beim Carve-Out nachvollziehbar geführt, aber Bucket-Verbrauch erzeugt noch keine eigenen Tax-Aggregate.

### Gemeinsame Engine
* Modulare ES-Module (`engine/`) kapseln Validierung, Marktanalyse, Ausgabenplanung und Transaktionslogik.
* `build-engine.mjs` bündelt die Module per `esbuild` (oder Modul-Fallback) zu `engine.js`, das in beiden Oberflächen als `EngineAPI` geladen wird.
* Konfigurierbare Guardrails, Marktregime-Übersetzungen und Strategien für Liquiditätsziele.
* Kontinuierliche Regime-Signale sind DOM-frei getestet. Grenzwerte um 10%, 20% und 30% Drawdown werden bei aktivierter Zielwert-Glättung monoton interpoliert; harte Mindest-Runway- und Notfallgrenzen bleiben hart.

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
│   ├── analyzers/
│   │   ├── MarketAnalyzer.mjs
│   │   └── regime-signals.mjs
│   ├── planners/
│   │   ├── SpendingPlanner.mjs
│   │   ├── alarm-policy.mjs
│   │   ├── final-rate-policy.mjs
│   │   ├── flex-budget-policy.mjs
│   │   ├── flex-rate-policy.mjs
│   │   ├── spending-diagnosis.mjs
│   │   ├── spending-guardrails.mjs
│   │   ├── spending-policy-pipeline.mjs
│   │   ├── spending-policy-helpers.mjs
│   │   └── wealth-reduction.mjs
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

1.  **Browser:** Ein moderner Browser (Chrome, Edge, Firefox) mit Unterstützung für ES6-Module und die File System Access API (für Dateiimport/-export; Jahresabschluss-Snapshots liegen intern in IndexedDB).
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
* Nutzt kein separates lokales Webserver-Setup; das Frontend wird direkt aus `dist/` in der Tauri-WebView geladen
* Enthaelt einen integrierten Yahoo-Proxy fuer Kurs-Updates (lokaler Port 8787)

**So nutzen Sie die portable EXE:**
1. `RuhestandSuite.exe` aus dem Repository oder Release-Download in einen beliebigen Ordner kopieren.
2. Per Doppelklick starten; die Tauri-App öffnet die Oberfläche direkt aus dem gebündelten `dist/`-Stand.
3. Optionale Live-Datenzugriffe funktionieren, wenn eine Internetverbindung besteht; ETF-Kurse laufen über den integrierten lokalen Proxy, Inflation und CAPE direkt über freigegebene externe Endpunkte. Ohne Internet läuft die App vollständig lokal weiter.
4. Eigene Szenarien werden im Benutzerprofil als Tauri-App-Daten gespeichert. Live-Daten liegen in `ruhestand_suite_data.json`, Jahresabschluss-Snapshots separat in `ruhestand_suite_snapshots.json`; der Wechsel zwischen Browser und EXE laeuft ueber das zentrale Komplettbackup auf der Startseite.

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

> **Hinweis:** Dateiimporte und -exporte benötigen Browser mit passender Datei-/Download-Unterstützung. Jahresabschluss-Snapshots nutzen im Browser das interne IndexedDB-Archiv. In der Browser-Variante benötigt der Yahoo-Proxy Node.js; ohne Node.js läuft die Suite trotzdem, jedoch ohne Online-Kursabruf. Die Tauri-EXE bringt den Proxy selbst mit und benötigt dafür kein separates Node.js.

---

## Entwicklung

* Die Balance- und Simulator-Module nutzen native ES6-Imports. Änderungen an einzelnen Modulen werden nach dem Speichern direkt beim nächsten Reload geladen.
* Engine-Anpassungen erfolgen in den Modulen unter `engine/`. Nach Anpassungen `npm run build:engine` ausführen und die Größe der generierten `engine.js` kontrollieren.
* Der Windows-Release-Build bleibt ein bewusst manueller Schritt über `build-tauri.bat` bzw. `scripts/build-tauri.ps1` nach grüner Suite. Das Skript prüft die Build-Voraussetzungen, erzeugt `dist/` frisch via `npm run sync-dist`, validiert zentrale Assets, führt `npm run tauri:build` aus und kopiert nur eine plausibilisierte EXE als `RuhestandSuite.exe` ins Repo-Root.
* Für schnelle QA bitte `npm test` einmal durchlaufen lassen. Wenn lokal `npm` defekt ist, kann die fachliche Suite direkt mit `node tests/run-tests.mjs` validiert werden; der Tauri-Release-Build selbst benötigt weiterhin ein funktionierendes `npm`.

## Abschluss-Checkliste

* **Dokumentation synchron halten:** Nach Engine-Änderungen oder neuen Simulator-Modulen (z. B. Monte-Carlo-Runner/UI/Analyzer) README, `docs/reference/TECHNICAL.md` und `docs/reference/SIMULATOR_MODULES_README.md` aktualisieren.
* **Snapshot-/Backup-Grenze beachten:** Komplettbackup/Import ist der Wechselpfad zwischen Browser und EXE. Jahresabschluss-Snapshots sind interne Sicherungspunkte; Standard-Restore erhaelt die Snapshot-Historie, prueft die Profilzuordnung und ersetzt keinen Profil-Merge.
* **Konsole sauber halten:** Vor dem Release auskommentierten Code entfernen, damit Nutzer:innen keine unnötigen Meldungen im Browser-Log sehen.
* **Tauri/Web-Worker:** Die Parallelisierung nutzt Web Worker mit Transferables (kein SharedArrayBuffer). Das funktioniert in Tauri als EXE, sofern die Worker-Skripte gebündelt und per `new URL(..., import.meta.url)` erreichbar sind. CSP/Asset-Bundling sollten Worker-Module erlauben.
* **Desktop-Smoke nach EXE-Build:** Nach `build-tauri.bat` kurz Startseite/Profilverwaltung, Balance, Simulator, Tranchenmanager, Handbuch, Worker-Pfade sowie optionale Live-Daten und Offline-Fallbacks prüfen.

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
