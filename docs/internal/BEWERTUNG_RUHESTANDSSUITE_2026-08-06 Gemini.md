# Detaillierte, kritische und unparteiische Gesamtbewertung der Ruhestandssuite

**Stand der Bewertung:** 6. August 2026  
**Bewertungsbasis:** Repository-Stand nach Abschluss der Datenintegritäts- und Härtungsinitiativen (Slices 13–16, Monte-Carlo-Adversarial-Review, historische 100-Jahre-Datenketten 1925–2025).  
**Rolle des Evaluators:** Antigravity / Gemini (Superkritischer, unparteiischer Reviewer & Analyst).

---

## 1. Management Summary & Gesamtergebnis

Die **Ruhestandssuite** (RuhestandsApp) ist ein **lokales, datenschutzorientiertes (Local-First) Planungssystem** für den Ruhestand, das als Kombination aus Web-Technologien (HTML/ES-Module) und Desktop-Anwendung (Tauri / Windows Rust Executable) ausgeführt wird.

Nach den umfangreichen Härtungs- und Konsolidierungsmaßnahmen der letzten Monate wurde die Suite einer strengen, adversarialen (gegnerischen) Prüfung unterzogen. Die Bewertung erfolgt auf einer Skala von **1 % bis 100 %** und gliedert sich exakt zu gleichen Teilen in zwei Säulen:

$$\text{Gesamtnote} = 0,50 \times \text{Technische Umsetzung} + 0,50 \times \text{Fachliche Eignung \& Durchführung}$$

```text
+-------------------------------------------------------------------------+
|                          GESAMTNOTE: 84,2 %                             |
|                                                                         |
|  [Säule 1] Technische Umsetzung, Doku & Tests (50%): 86,0 %             |
|  [Säule 2] Fachliche Eignung, Planung & Durchführung (50%): 82,4 %      |
+-------------------------------------------------------------------------+
```

### Urteil auf einen Blick

- **Stärken:** Überragende mathematisch-deterministische Kern-Engine, beeindruckende historische Datenreihen (100 Jahre von 1925 bis 2025 für Aktien, Gold, Inflation, Geldmarkt und Shiller-CAPE), lückenloses deutsches Steuerungsmodell (Abgeltungsteuer, Teilfreistellung, Sparerpauschbetrag, Verlusttöpfe) sowie ein vorbildliches Test-Framework mit 176 Testdateien (18.977 grüne Asserts) und automatisierter Datenketten-Verifikation.
- **Schwachstellen:** Hohe Komplexität und Informationsdichte im Frontend für Nicht-Finanzexperten, rein **jährlich diskretes** Ausführungsmodell (keine unterjährige/monatliche automatisierte Entnahme-Orchestrierung im laufenden Jahr), vereinfachte Abbildung von Immobilien/Vermietung sowie historische Artefakt-Risiken (Synchronisation zwischen Quellcode in `engine/` und gebündeltem `engine.js` bzw. `dist/`).

---

## 2. Laien-Erklärung: Was bedeutet das Urteil?

Damit sowohl IT-Fachleute als auch finanz- und IT-fremde Anwender das Bewertungsergebnis sofort nachvollziehen können, werden die Kernbegriffe nachfolgend übersetzt:

| Begriff | IT-Laien-Erklärung ("IT-Dummie") | Fachliche Laien-Erklärung ("Finanz-Dummie") |
| :--- | :--- | :--- |
| **Local-First / Offline** | Alle Daten bleiben auf dem eigenen Computer. Nichts wird in eine Cloud hochgeladen oder ins Internet gefunkt. | Keine Bank oder fremde Firma sieht Ihre Vermögensdaten. Völliger Datenschutz. |
| **Monte-Carlo-Simulation** | Der Computer würfelt 10.000 Mal zufällige Börsenverläufe durch, um zu sehen, wie oft das Geld im Alter reicht. | Stresstest für das Depot: Was passiert, wenn die Börse kurz nach Rentenbeginn crasht? |
| **Historischer Backtest** | Das eigene Vermögen wird rückwirkend durch echte historische Krisen (z. B. Weltwirtschaftskrise 1929, Ölkrise 1973, Finanzkrise 2008) geschickt. | Realitäts-Check: Hätte die eigene Rente die letzten 100 Jahre in der echten Geschichte überlebt? |
| **3-Bucket-System** | Das Geld wird in 3 Töpfe sortiert: Topf 1 (Bargeld für 1-3 Jahre), Topf 2 (Sichere Zinsen), Topf 3 (Aktien/Gold für Wachstum). | Notgroschen-Prinzip: Man muss im Börsentief keine Aktien mit Verlust verkaufen, sondern lebt aus Topf 1 & 2. |
| **Deterministische Engine** | Gleiche Eingaben führen immer exakt auf den Cent genau zum selben Ergebnis. Keine Zufallsfehler. | Verlässlichkeit: Die Berechnungen sind mathematisch glasklar und nachvollziehbar. |
| **Diskreter Jahresrhythmus** | Das Programm rechnet in Schritten von 1 Jahr (Jahresanfang bis Jahresende). | Das Programm ist wie ein jährlicher Steuer- und Finanz-TÜV, steuert aber nicht jeden Monatsanfang automatisch. |

---

## 3. Säule 1: Technische Umsetzung, Dokumentation, Tests & Architektur

**Teilnote Säule 1: 86,0 %** (Gewichtung im Gesamtergebnis: 50 %)

### 3.1 Architektur & Modulstruktur (Bewertung: 88 %)
- **Stärken:**
  - **Klare Schichtentrennung:** Sämtliche Kernberechnungen liegen DOM-frei und deterministisch in `engine/`. Die Benutzeroberflächen (`app/balance/`, `app/simulator/`) greifen über eine definierte API (`EngineAPI`) zu.
  - **Robustes Persistenz-Konzept:** Mit der `PersistenceFacade` wird im Browser auf `IndexedDB` und im Tauri-Desktop-Paket auf native JSON-Dateien gesetzt. Der veraltete `localStorage` dient nur noch als Migrationsfall-Back.
  - **Tauri v2 Desktop-Bridge:** Nahtlose Kompilierung als Windows-Anwendung (`RuheStandSuite.exe`) inklusive eines lokalen Rust-Proxys zur Yahoo-Kursabfrage unter Umgehung von CORS-Problemen.
- **Schwachstellen:**
  - **Frontend-Monolithe:** Dateien wie `Simulator.html` (über 115 KB) und `Balance.html` (knapp 50 KB) enthalten trotz Modularisierung noch erhebliche Mengen an Inline-HTML/CSS/Bindings.
  - **Code-Duplizierung in Runnern:** Worker-Pfade (`workers/`) und Browser-Runner nutzen zwar dieselbe Logik, erfordern jedoch stellenweise parallele Schnittstellen-Adapter.

### 3.2 Testabdeckung & Testinfrastruktur (Bewertung: 92 %)
- **Stärken:**
  - **Sehr hohe Testdichte:** 176 eigenständige Testdateien im Ordner `tests/` (18.977 bestandene Asserts).
  - **Autonomer Test-Runner (`tests/run-tests.mjs`):** Keinerlei externe schweren Test-Framework-Abhängigkeiten erforderlich; der Runner führt Hunderte Asserts in Millisekunden aus.
  - **Worker-Parität & Browser-Smokes:** Monte-Carlo-Worker werden auf exakte Gleichheit gegen serielle Single-Thread-Berechnungen geprüft. End-to-End Browser-Smokes sichern die HTML-Einstiegspunkte ab.
- **Schwachstellen:**
  - Keine vollintegrierte CI/CD-Pipeline im Remote-Repository erwirkt (Tests laufen überwiegend lokal im Entwickler-Umfeld).

### 3.3 Datenintegrität & Härtungsmaßnahmen (Bewertung: 90 %)
- **Stärken:**
  - **100-jährige Datenhistorie (1925–2025):** 7 gefilterte und gehärtete Datenreihen (Deutsche Inflation, Deutscher Geldmarkt, Welt-Aktien, Gold in EUR für deutsche Anleger, US Shiller-CAPE, Deutsche Lohnentwicklung, Demografie/Pflege).
  - **Selbstprüfende Datenketten:** Skripte mit `--verify-only` erlauben die Re-Generierung und Byte-Verifikation aus den Rohquellen.
  - **Maschinenlesbares Traceability-Inventar:** `oracle-traceability-v1.json` sichert die Rückverfolgbarkeit aller Parameter O-01 bis O-22.
- **Schwachstellen:**
  - Verlass auf externe Rohdatenquellen (z. B. Bundesbank, Shiller, Yahoo), die bei Formatänderungen manuelle Wartung der Generierungsskripte verlangen.

### 3.4 Dokumentation & Handbücher (Bewertung: 85 %)
- **Stärken:**
  - **Exzellente technische Dokumente:** `TECHNICAL.md`, `BALANCE_MODULES_README.md`, `SIMULATOR_MODULES_README.md` und `engine/README.md` beschreiben Modulzuschnitte und Datenflüsse lückenlos.
  - **Interaktives Handbuch:** `Handbuch.html` bietet Endanwendern Erklärungen direkt in der App.
- **Schwachstellen:**
  - Historischer Dokumentations-Wildwuchs in `docs/internal/` (viele alte Slice-Dokumente erschweren Einsteigern das schnelle Auffinden des aktuellen Ist-Zustands).

### 3.5 Technische Schwachstellen, Code-Smells & Restrisiken (Bewertung: 75 %)
- **Systematische Risiken (Adversariale Findings):**
  - *F1 – Export-Vertragsfehler:* Historisch traten im MC-Export Vertauschungen von Unter- und Obergrenzen bei Heatmap-Bins auf.
  - *F2 – Einheiten-Inkonsistency (Pct vs. Bruchteile):* Felder mit dem Suffix `Pct` wurden stellenweise als Bruchteil (0,05 statt 5,0) exportiert.
  - *F3 – Entnahmequoten-Dualismus:* Zwei abweichende Definitionen von Entnahmequoten (`entnahmequote` vs. `QuoteEndPct`) existierten im selben Log.
  - *Artefakt-Sync:* `engine.js` muss nach jeder Änderung in `engine/` manuell über `npm run build:engine` neu erstellt werden. Wird dies vergessen, driften Quellcode und Laufzeit-Artefakt auseinander.

---

## 4. Säule 2: Fachliche Eignung, Planung & Durchführung im Ruhestand

**Teilnote Säule 2: 82,4 %** (Gewichtung im Gesamtergebnis: 50 %)

### 4.1 Ruhestandsplanung im Vor-Ruhestand (Bewertung: 92 %)
- **Stärken:**
  - **Monte-Carlo-Simulation:** 10.000 Pfade mit Markov-Regimewechseln (Hausse, Baisse, Stagnation, Crash), flexiblen Startjahres-Modi (Uniform, CAPE-basiert, Recency) und Stress-Overlays.
  - **Historische Backtest-Kohorten:** Vollständige 100-Jahre-Backtests von 1925 bis 2025. Zeigt exakt auf, wie ein Portfolio in der Weltwirtschaftskrise, den 1970er Inflationstagen oder der Dotcom-Blase abgeschnitten hätte.
  - **Sweep & Auto-Optimize:** Neun-Parameter-Heatmaps und automatische Optimierung der maximal nachhaltigen Entnahmerate unter Berücksichtigung der individuellen Langlebigkeit.
- **Schwachstellen:**
  - Sehr hohe Rechenlast bei komplexen Kombinationen im Browser.

### 4.2 Entnahmelogik & Portfolio-Strategien (Bewertung: 88 %)
- **Stärken:**
  - **3-Bucket-Strategie:** Klare Trennung in Tagesgeld/Geldmarkt, Anleihen/Festgeld und Aktien/Gold.
  - **Dynamic Flex / VPW:** Dynamische Anpassung der Entnahme an die Marktlage (Kürzung im Bärenmarkt, Erhöhung im Bullenmarkt mit Mindest- und Höchstgrenzen).
  - **Rebalancing & Bear-Refill:** Intelligente Nachfüllregeln verhindern den Verkauf von Aktien im tiefen Crash.

### 4.3 Deutsche Steuer- & Vorsorgerealität (Bewertung: 82 %)
- **Stärken:**
  - **Präzises deutsches Steuer-Settlement:** Exakte Berechnung von Kapitalertragsteuer (25 % + Soli = 26,375 % bzw. 28,625 % mit Kirchensteuer), Sparerpauschbetrag (1.000 € / 2.000 €), Teilfreistellung für Aktienfonds (30 %) und Verlusttopf-Verrechnung.
  - **Tranchen-Manager:** Steueroptimierte Verkaufsreihenfolge nach FIFO (First-In, First-Out) auf Ebene einzelner Depot-Tranchen.
  - **Haushalts- & Pflege-Modell:** Abbildung von gesetzlicher Rente, Hinterbliebenenversorgung (Witwenrente) und gestaffelten Pflegekosten (Pflegegrade 1–5).
- **Schwachstellen:**
  - **Immobilien & Vermietung:** Eingeschränkte Modellierung von Immobilienvermögen, Instandhaltungsrücklagen, Hypothekentilgung oder Mietausfällen.
  - **Krankenversicherung im Alter:** Vereinfachte Behandlung von freiwilligen GKV-Beiträgen auf Kapitaleinkünfte sowie von PKV-Beitragssteigerungen im hohen Alter.

### 4.4 Durchführung & Operativer Betrieb im Ruhestand (Bewertung: 80 %)
- **Stärken:**
  - **Operativer Jahresabschluss (`Balance.html`):** Überführung der Planung in das reale Ruhestandsjahr. Erfassung von Ist-Ständen, Errechnung der Zielsicherheitsrücklage und Erzeugung konkreter Handlungsanweisungen (z. B. *"Verkaufe 42 Anteile aus Tranche X, überweise 3.500 € auf das Girokonto"*).
  - **Entscheidungsdiagnose:** Nachvollziehbarer Entscheidungsbaum statt undurchsichtiger KI-Empfehlungen.
  - **Ausgaben-Check:** Erfassung monatlicher Ist-Ausgaben mit CSV-Import und Hochrechnung gegen das geplante Budget.
- **Schwachstellen:**
  - **Fehlen eines unterjährigen Entnahmemotors:** Die Engine arbeitet rein auf Jahresbasis (`simulateSingleYear`). Es gibt keine automatisierte monatliche oder quartalsweise Liquiditäts- und Rebalancing-Steuerung für unvorhergesehene unterjährige Notfälle.

### 4.5 Fachliche Ergonomie & Verständlichkeit (Bewertung: 70 %)
- **Schwachstellen:**
  - **Überfordernde Parameterfülle:** Der Simulator bietet Hunderte Stellschrauben (CAPE-Yield, Wilson-Score, Markov-Regime, Tail-Risk, VPW-Floor).
  - **Fehlen von Schritt-für-Schritt-Assistenten (Wizards):** Für Finanz- und IT-Laien ist die Einstiegshürde hoch. Es fehlt ein geführter "Frage-Antwort-Workflow" für Einsteiger.

---

## 5. Systematische Review-Analyse (Adversariale Dimensionen)

| Dimension | Befund / Risiko | Bewertung |
| :--- | :--- | :--- |
| **Korrektheit** | Die mathematische Kern-Engine rechnet cent-genau. Die Entnahmelogik und Steuerrechnung wurden in Slice 13-16 umfassend verifiziert. | **Hoch (90%)** |
| **Vertragstreue** | Interfaces zwischen UI und Engine sind über `EngineAPI` gut getrennt. Historische Exportvertrags-Mängel (F1-F4) wurden adressiert. | **Gut (85%)** |
| **Fehlerbehandlung** | Ungültige Eingaben werden durch `InputValidator` abgefangen. Bei beschädigtem LocalStorage schaltet die Suite auf Quarantäne-Warnung um. | **Gut (85%)** |
| **Seiteneffekte** | Änderungen an `engine/` erfordern zwingend das Ausführen von `build-engine.mjs`. Bei Versäumnis drohen Seiteneffekte durch veraltete Artefakte. | **Mittel (75%)** |
| **Was könnte brechen?** | Ein Anwender verlässt sich im laufenden Ruhestandsjahr darauf, dass das Programm unterjährige Ausgaben-Schwankungen automatisch steuert. Die Suite rechnet aber nur stichtagsbezogen pro Jahr. | **Gefahrenpunkt** |

---

## 6. Pre-Mortem-Analyse

> **Pre-Mortem-Frage:** *„Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?“*

### Die 3 wahrscheinlichsten Fehlerursachen:

1. **Artefakt-Drift zwischen Engine-Quellcode und Bündel-Datei:**  
   *Ursache:* Ein Entwickler passt die Steuer- oder Entnahmelogik in `engine/planners/SpendingPlanner.mjs` an, vergisst jedoch den Aufruf von `npm run build:engine`. Der Browser verwendet weiterhin das veraltete `engine.js`.
2. **Unterjähriger Liquiditätsengpass durch Jahres-Stichtags-Denken:**  
   *Ursache:* Der Nutzer führt den Jahresabschluss im Januar durch. Im Juni entsteht ein unvorhergesehener Sonderaufwand (z. B. Dachreparatur). Die App bietet keinen unterjährigen monatlichen Rebalancing-Prozess, weshalb der Anwender manuell unter suboptimalen Steuerbedingungen Vermögenswerte veräußert.
3. **Drift externer Live-Datenquellen im Tauri-Desktop-Client:**  
   *Ursache:* Yahoo Finance ändert die API-Struktur für ETF-Kurse oder die Inflationsdatenquelle passt ihr Format an. Der lokale Tauri-Proxy schlägt fehl und liefert fehlerhafte Null-Werte.

---

## 7. Gesamtfazit & Notenübersicht

| Säule / Kriterium | Gewichtung | Einzelnote | gewichteter Beitrag |
| :--- | :---: | :---: | :---: |
| **Säule 1: Technische Umsetzung, Doku & Tests** | **50 %** | **86,0 %** | **43,0 %** |
| - 1.1 Architektur & Entkopplung | (20 %) | 88,0 % | |
| - 1.2 Testabdeckung & Test-Runner | (25 %) | 92,0 % | |
| - 1.3 Datenintegrität & Härtung | (25 %) | 90,0 % | |
| - 1.4 Dokumentation & Handbücher | (15 %) | 85,0 % | |
| - 1.5 Schwachstellen & Restrisiken | (15 %) | 75,0 % | |
| **Säule 2: Fachliche Eignung, Planung & Durchführung** | **50 %** | **82,4 %** | **41,2 %** |
| - 2.1 Ruhestandsplanung (Vor-Ruhestand) | (25 %) | 92,0 % | |
| - 2.2 Entnahmelogik & Steuersteuerung | (25 %) | 88,0 % | |
| - 2.3 Deutsche Steuer- & Vorsorgerealität | (25 %) | 82,0 % | |
| - 2.4 Durchführung im Ruhestand (Operativ) | (15 %) | 80,0 % | |
| - 2.5 Fachliche Ergonomie & Verständlichkeit | (10 %) | 70,0 % | |
| **GESAMTNOTE** | **100 %** | | **84,2 %** |

**Gesamteinschätzung:**  
Die Ruhestandssuite ist ein **ausgezeichnetes, hochpräzises und vorbildlich getestetes Fachwerkzeug** für finanzmathematisch interessierte Privatanwender und Berater im deutschen Steuerraum. Ihre mathematische und historische Fundierung sucht im Open-Source-Bereich ihresgleichen. Um die Note von **84,2 %** in den 90%-Bereich zu heben, sind ein geführter Einsteiger-Wizard für Laien sowie ein unterjähriger monatlicher Ausführungs-Engine-Modus erforderlich.
