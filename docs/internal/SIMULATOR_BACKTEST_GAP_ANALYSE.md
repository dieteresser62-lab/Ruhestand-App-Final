# Simulator / Backtest: GAP-Analyse

**Stand:** 2026-07-18  
**Autor:** Codex (Bestandsaufnahme und Planentwurf, keine Review-Freigabe)  
**Feature-Branch:** `codex/simulator-backtest-gap-plan`  
**GitHub-Status:** nur lokal angelegt; Veroeffentlichung ausstehend und nur nach Nutzerfreigabe  
**Status:** freigegeben durch Gemini und Claude

## Zweck und Abgrenzung

Diese Analyse erfasst den aktuellen historischen Backtest-Pfad des Simulators von den DOM-Eingaben ueber Historienrecords, Portfolioinitialisierung und Jahressimulation bis zu Ergebnisdarstellung, Export, Tests und methodischer Aussagegrenze. Sie ist die fachliche Grundlage fuer den [Simulator-/Backtest-Hardening-Plan](./SIMULATOR_BACKTEST_HARDENING_PLAN.md) und die dort verlinkten 1-basierten Slices.

Die Analyse ist kein formales Code-Review und erteilt keine Freigabe. Codex nimmt keine abschliessende Bewertung der eigenen Planung vor. Gemini und Claude sollen jeden Befund adversarial pruefen, reproduzieren, umpriorisieren, ergaenzen oder verwerfen. Produktivcode wird in dieser Planungsphase nicht geaendert.

## Untersuchter Scope

- Einstieg und Backtest-UI: `Simulator.html`, `simulator.css`
- Backtest-Orchestrierung: `app/simulator/simulator-backtest.js`
- Input- und Portfolio-Pfad: `simulator-portfolio-inputs.js`, `simulator-input-*.js`, `simulator-portfolio-init.js`
- Historienbasis: `app/simulator/simulator-data.js`
- Jahressimulation: `simulator-engine-wrapper.js`, `simulator-engine-direct.js`, `simulator-year-portfolio.js`, `simulator-year-result.js`
- Cross-Runner-Callergrenze fuer gemeinsam genutzte YearData-/Outcome-Vertraege: `monte-carlo-runner.js`, `sweep-runner.js`, relevante Workerparitaet. Keine vollstaendige MC-/Sweep-Funktionsanalyse.
- Ergebnis-, Tabellen- und Exportpfad: `simulator-main-helpers.js`, `simulator-results.js`
- Tests: Backtest-, Headless-, Input-, Logspalten-, UI-Orchestrierungs- und Browser-Smokes
- Referenzen: `README.md`, `docs/reference/DATA_SOURCES.md`, `SIMULATOR_MODULES_README.md`, `TECHNICAL.md`, `WORKFLOW_PSEUDOCODE.md`, `ARCHITEKTUR_UND_FACHKONZEPT.md`
- Methodenrahmen: `FORSCHUNGSABGLEICH_EVIDENZREGISTER.md` und `docs/internal/FORSCHUNGSVALIDIERUNGS_BACKLOG.md`

Nicht untersucht wurden eine vollstaendige Neuvalidierung der Engine-Fachsemantik, eine externe Kapitalmarktstudie, eine Neubeschaffung historischer Daten und eine steuer-/rechtsfachliche Vollstaendigkeitspruefung. Diese Punkte benoetigen eigene Owner und Freigaben.

## Verifizierte Baseline

| Pruefung | Ergebnis am 2026-07-18 |
| --- | --- |
| Aktiver Branch | `codex/simulator-backtest-gap-plan` |
| Arbeitsbaum vor Doku-Erstellung | nur bereits vorhandene unversionierte Playwright-Dateien unter `node_modules/`; nicht angefasst |
| `npm test` | 111 Testdateien, 4.585 Assertions, 0 Fehler, 0 offene Handles |
| `npm run test:browser` | alle konfigurierten Browser-Smokes gruen |
| `npm run test:coverage` | gesamt 72,80 %; `simulator-backtest.js` 53,73 % (245/456 ausfuehrbare Zeilen) |
| Backtest-Testschwerpunkt | Determinismus gegen denselben Lauf, Fensterlaenge, Realentnahme, Dynamic Flex, CAPE, Mindest-Flex und 3-Bucket |
| Nicht direkt abgedeckt | Ruin-Summary, technische Fehler vs. Ruin, Datenluecken, Jahreszuordnung der Reihen, kanonisches Startvermoegen, Pflegebucket-Summary, Export-Rohdatenvertrag, invalides Periodenformat |
| Browser-Gate | startet einen Backtest und prueft Fehlerfreiheit; der Basissmoke reconciliiert Ergebnisinhalt, Export und Fehlerzustaende nicht |
| Review-Nachpruefung | Monte Carlo nutzt im aktiven `annualData`-Pfad fuer 2000 Inflation 1,4 %, Zins 4,25 %, Lohn 2,5 % und Gold -2,7 % aus 2000; der Backtest nutzt fuer Inflation/Zins/Gold 1999, waehrend die Rentenanpassung nachweislich auf 2000 mappt. `computeAdjPctForYear()` liefert bei Startjahr 2000 fuer Index 0 den Lohnwert 2000 (2,5 %), nicht 1950 (12 %). |

Die gruene Suite widerlegt die GAPs nicht. Mehrere Tests sichern die aktuelle Implementierung nur gegen sich selbst oder pruefen das Vorhandensein von Spalten, nicht die korrekte Kalender-, Outcome- oder Exportsemantik.

## Klassifikation und Prioritaet

### Befundklasse

- **D – bestaetigter Defekt/Vertragsbruch:** aktueller Codepfad kann ein falsches, widerspruechliches oder nicht reproduzierbares Ergebnis erzeugen oder ausgeben.
- **A – Architektur-/Test-GAP:** die aktuelle Struktur verhindert belastbare Isolation, Reconciliation oder Regressionserkennung.
- **P – Produkt-/Diagnostik-GAP:** eine fuer historische Pfadanalysen relevante Funktion fehlt; keine Behauptung, dass das bestehende Verhalten dadurch an sich falsch ist.
- **M – methodische Aussagegrenze:** die technische Ausgabe darf ohne externe Daten-/Studiengates nicht als unabhaengige Wirksamkeitsvalidierung verstanden werden.

### Prioritaet

- **P0:** kann einen unvollstaendigen oder technischen Fehler als gueltiges Finanzergebnis ausgeben, Kalender-/Datenbezug materiell verschieben oder die Ergebnisidentitaet verfälschen.
- **P1:** beeintraechtigt Reproduzierbarkeit, Risikodiagnose, Hauptworkflow, Qualitaetssicherung oder belastbare Interpretation.
- **P2:** relevante Wartungs-, Bedien-, Barrierefreiheits- oder Dokumentationsluecke ohne bereits belegte direkte Ergebnisverfaelschung.

## GAP-Matrix

| ID | Klasse | Prio | GAP | Evidenz | Auswirkung | Ziel / Slice |
| --- | --- | --- | --- | --- | --- | --- |
| BT-01 | D | P0 | Backtest und Monte Carlo verwenden widerspruechliche Kalender-/As-of-Zuordnungen; der Backtest mischt selbst mehrere Bezuege. | `simulator-backtest.js:208-235`: Aktienrendite aus Indexlevel `t/t-1`; Gold, Inflation, Zins und CAPE aus `t-1`; Rentenanpassung ueber `computeAdjPctForYear()` aus `t`. Der aktive `annualData`-Aufbau in `simulator-data.js:366-413` ordnet Gold, Inflation, Zins und Lohn dagegen `t` zu. `simulator-portfolio-historical.js:15-43` enthaelt zusaetzlich einen derzeit durch den `annualData.length`-Guard inaktiven Builder mit `t-1`-Makrowerten. Probe 2000: Backtest Gold -0,6 %, Inflation 0,6 %, Zins 2,5 %; Monte Carlo -2,7 %, 1,4 %, 4,25 %. | Backtest und Monte Carlo modellieren denselben historischen Jahrgang unterschiedlich; zwei konkurrierende `annualData`-Builder konservieren zusaetzlich latente Drift. Vergleiche, Risikoprofile und Optimierungsergebnisse koennen systematisch verschoben sein. | Legacy-Zuordnung in Slice 01 einfrieren; feldgenaue canonical Alignment-Tabelle, Builderinventar und einmaliger Datencontract in Slices 03-04. |
| BT-02 | D | P0 | Fehlende Historienjahre werden uebersprungen; ein lueckenhafter Lauf kann scheinbar vollstaendig enden. | `simulator-backtest.js:208-210` schreibt nur in den spaeter ungenutzten Textlog und setzt per `continue` fort. Alter/`yearIndex` und Summary-Nenner folgen dennoch dem angeforderten Kalenderfenster. | Zinseszins und Lebensalter laufen ueber eine nicht simulierte Periode; Zeilenanzahl, Nenner und Ergebnisstatus widersprechen sich. | Vor der Jahresschleife lueckenlose Perioden-/Pflichtfeldpruefung; erste Luecke beendet fail-closed als `incomplete`, niemals `continue` (Slices 03-05). |
| BT-03 | D | P0 | Technische Engine-Fehler werden in Backtest und Monte Carlo als wirtschaftlicher Ruin klassifiziert. | `simulator-engine-direct.js:323-328` liefert bei `fullResult.error` oder fehlendem `ui` `{ isRuin: true, error }`. `simulator-backtest.js:237-275` rendert das als `BANKRUPT`; `monte-carlo-runner.js:509-534` prueft `result.error` nicht und zaehlt den Lauf als Ruin. `sweep-runner.js:271-278` trennt den Fehler bereits. | Rechen-/Contractfehler koennen Backtest-Ergebnisse und Monte-Carlo-Ruinhaeufigkeiten korrumpieren. | Gemeinsamer Adapter-/Caller-Outcome-Vertrag mit Aufruferinventur in Slice 05; Engine-Fachsemantik bleibt Stop-Gate. |
| BT-04 | D | P0 | Bei Ruin bleibt das Summary-Endvermoegen auf dem Zustand vor dem Ruinjahr. | `simulator-backtest.js:237-275` bricht vor `simState = result.newState` ab; `:383` berechnet Endvermoegen aus diesem alten State, waehrend der Ruin-Logeintrag Nullwerte zeigt. | Tabelle und Summary koennen sich widersprechen; ein gescheiterter Pfad kann positives Endvermoegen ausweisen. | Outcome-/Summary-Reconciliation in Slice 05. |
| BT-05 | D | P1 | Summary-Werte stammen nicht durchgaengig aus dem kanonischen Laufresultat. | Startvermoegen wird aus `inputs.startVermoegen` gerendert (`simulator-backtest.js:408`), obwohl `initializePortfolioDetailed()` das tatsaechliche Portfolio aus Detailtranchen bildet (`simulator-portfolio-init.js:174-268`). | Startbestand, simuliertes Portfolio und Summary koennen bereits am Laufbeginn voneinander abweichen. | Kanonisches Result-/Summary-Schema in Slices 05-06. |
| BT-06 | D | P1 | Periodenvalidierung ist unvollstaendig und an Jahreszahlen im Code gebunden. | `parseInt()` ohne Ganzzahl-/NaN-Vertrag; NaN passiert die Vergleiche. `startJahr >= endJahr` verbietet ungeklärt einen Einjahreslauf. Grenzen 1951/2025 stehen in `simulator-backtest.js:97-101`, waehrend `DATASET_META` separat 1925/2025 fuehrt; HTML hat keine `min`/`max`. | Leere oder unklare Laeufe, dreifache Pflege von Jahresgrenzen und unnoetige Releaseaenderungen bei Datenerweiterung. | Periodencontract und dynamische Bounds in Slices 03-04 und 08. |
| BT-07 | M | P0 | Die historische Datenbasis besitzt keinen vollstaendigen, reproduzierbaren Forschungsdatenvertrag. | `DATASET_META` markiert `msci_eur.variantStatus='undocumented'`; `DATA_SOURCES.md` nennt offene Indexvariante, Quellen fuer Vor-1950-Transformation und mehrdeutige Gold-Nullen. Fruehe Goldjahre werden trotzdem mit 0 % gerechnet. | Ergebnisse sind technisch reproduzierbar, aber Datenvariante, Total-Return-Anteil, Lizenz, Transformation und Missingness sind nicht hinreichend belegbar. Starke Wirksamkeitsaussagen sind blockiert. | Maschinenlesbares Manifest mit `unresolved` statt erfundener Herkunft in Slice 03; externe Klaerung in Slice 09. |
| BT-08 | A | P1 | Backtest-Rechnen, DOM, Summary, Tabellenformatierung und Export sind gekoppelt; ein expliziter Immutabilitaetsvertrag fehlt. | `simulator-backtest.js` liest/schreibt DOM und globale Window-Daten. Portfolio-/State-Objekte werden ueber Jahreslaeufe mutiert; eine Runner-Grenze muss verhindern, dass wiederholte Laeufe oder Cohorts dieselben Input-/Trancheobjekte kontaminieren. Ungenutzte Imports/Variablen und ein zweiter Textlogpfad erhoehen die Driftflaeche. | Rechenvertraege sind schwer isolierbar; eine Extraktion kann Objektmutation verschieben und Folgeaufrufe kontaminieren. | DOM-freie Runner-/Adapter-Trennung mit eingefrorenen Inputs, kanonischer Laufkopie und Non-Mutation-Tests in Slice 02. |
| BT-09 | A | P1 | Es gibt weder ein versioniertes Backtest-Resultat noch einen vollstaendigen Request-/Completion-Contract. | `window.globalBacktestData` enthaelt nur `rows`, `startJahr`, Strategie, Goldflag und Mindest-Flex-Profile (`simulator-backtest.js:385-394`). Endjahr, Outcome, Fehler, Schema und die ergebnisrelevante Konstante `BREAK_ON_RUIN` fehlen. | Renderer, Export und Folgeanalysen muessen implizit aus Zeilen und globaler Config raten; identische Resultate sind nicht reproduzierbar zuzuordnen. | Legacy-Schema-v0-Snapshot in Slice 01; `BacktestRequestV1.breakOnRuin` und `BacktestRunResultV1` in Slices 02/05. |
| BT-10 | D/P | P1 | Ergebnisbuendel und Metrikdefinitionen sind zu schmal; mindestens eine sichtbare Zaehldefinition ist falsch beschriftet. | Summary-Code zaehlt Kuerzungen mit `>= 10`, das Label behauptet `> 10 %`. Max Drawdown und `taxSavedByLossCarry` werden in `WORKFLOW_PSEUDOCODE.md` behauptet, aber nicht aggregiert. FQ-03 fordert Shortfalltiefe/-dauer und Liquiditaetsverteilungen. | Ein Jahr mit exakt 10 % wird entgegen dem Label gezaehlt; Endvermoegen kann Konsum- und Liquiditaetsstress verdecken. | Exakt-10-%-Legacyfall in Slice 01; Operator/Label-Entscheid und reconciliierbares Metrikwörterbuch in Slice 06. |
| BT-11 | P | P1 | Die UI berechnet nur ein manuell gewaehltes zusammenhaengendes Fenster, kein Inventar vergleichbarer Rolling Cohorts. | `Simulator.html:918-942` bietet nur Start-/Endjahr; `runBacktest()` erzeugt genau diesen Pfad. Forschungstext spricht von mehreren Startfenstern, technisch entstehen diese nur durch wiederholte manuelle Laeufe. | Sequenzrisiko ueber alle gleich langen historischen Startkohorten wird nicht systematisch sichtbar; manuelle Fensterauswahl erhoeht Selection Bias. | DOM-freier Rolling-Cohort-Diagnosemodus in Slice 06; keine „Erfolgswahrscheinlichkeit“. |
| BT-12 | D | P1 | Backtest-Exporte sind Displayprojektionen und enthalten HTML statt stabiler Rohdaten. | `prepareRowsForExport()`/`convertRowsToCsv()` verwenden dieselben Formatter wie die HTML-Tabelle. Trade-Formatter erzeugen `<span>`; reproduziert in CSV/JSON. JSON exportiert nur `exportedAt`, Detaillevel, Startjahr und formatierte Zeilen (`simulator-backtest.js:472-497`). | Zahlen sind lokalisiert/abgekuerzt, HTML-verunreinigt und je Detailtoggle unvollstaendig; ein Lauf kann nicht verlaesslich nachgerechnet werden. | Getrennter Raw-/Display-Export mit Schema und Manifest in Slice 07. |
| BT-13 | M | P1 | Wiederholte Backtest-/Sweep-/Policyversuche besitzen kein vollstaendiges Trial- und Kontaminationsinventar. | `FORSCHUNGSABGLEICH_EVIDENZREGISTER.md` MAP-12/13 und `FORSCHUNGSVALIDIERUNGS_BACKLOG.md` FV-G05/FV-G06 dokumentieren die Luecke. Der Backtest speichert nur den letzten In-memory-Lauf. | Wiederholtes Betrachten derselben Historie kann als scheinbare Bestaetigung missverstanden werden; es gibt keinen unangetasteten Holdout. | Laufmanifest in Slice 07; separates, opt-in Forschungs-/Holdout-Protokoll und Owner-Gate in Slice 09. |
| BT-14 | A | P1 | Tests sichern wesentliche Outcome-, Daten-, Immutabilitaets- und Exportvertraege nicht. | `simulator-backtest.test.mjs` vergleicht Determinismus mit einem zweiten Lauf derselben Implementierung und prueft keine festen Vermoegenswerte. Es fehlen feste Legacy-Oracles fuer Ruin-State, Pflegebucket, `window.globalBacktestData`, exakte 10-%-Kuerzung, Serienalignment, Datenluecke, Enginefehler in Backtest/MC, Non-Mutation und Raw-Export. Coverage `simulator-backtest.js`: 53,73 %. | Deterministisch falsche Ergebnisse oder Refactor-Drift koennen bei gruener Suite bestehen bleiben. | Zweistufige Characterization (`legacy_observed`) und Zielcontracts (`target_expected`) in Slice 01, danach je Fachslice. |
| BT-15 | A | P1 | Das Browser-Gate startet den Backtest, reconciliiert den Hauptworkflow aber nur oberflaechlich. | `browser-smoke.test.mjs:500-511` klickt und wartet 500 ms, danach nur Konsolenfehlercheck. Kein deterministischer E2E-Nachweis fuer NaN-/ungueltige Jahre, Datenluecke, Ruin vs. `technical_error`, Summary/Raw-Reconciliation, Detailtoggle oder HTML-freien Export. | DOM-Integration, negative Pfade und Export koennen trotz gruener Smokes regressieren. | Gezieltes Browser-E2E-Gate mit Erfolgs- und Negativfixtures in Slice 08. |
| BT-16 | P | P2 | Backtest-Status und Tabelle sind fuer Tastatur-/Screenreader-Nutzung unvollstaendig. | Start-/Endinputs ohne dynamische Grenzen/Hinweis, Fehler nur per `alert`; Catch zeigt zusaetzlich Stacktrace. `simulationSummary`/`simulationLog` ohne Status-/Live-Vertrag; generierte Tabelle ohne Caption und `scope`; nach Lauf kein definierter Fokus. | Fehler und Ergebniswechsel sind schwerer wahrnehmbar; interne Stackdetails koennen Nutzer irritieren oder lokale Pfade zeigen. | Inline-Validierung, Statusregion, Fokus- und Tabellencontract in Slice 08. |
| BT-17 | D | P1 | Aktive Dokumentation beschreibt den Backtest teilweise anders als der Code und ueberzieht die Aussage. | `README.md:86` nennt den Backtest „Realitaetscheck“ zum „Validieren“. `WORKFLOW_PSEUDOCODE.md:102-145` nennt 1950 statt 1951, Marktdaten desselben Jahres, Rendite nach Engine, Ruin bei Vermoegen <= 0, Max Drawdown und Tax-Savings; der aktuelle Code weicht davon ab. | Nutzer und Reviewer koennen eine hoehere Validierungsstufe oder andere Jahresreihenfolge annehmen als implementiert. | Aussagegrenzen sofort im Plan, endgueltiger Doku-Sync in Slices 09-10. |
| BT-18 | M | P1 | Kosten-, Index- und internationale Sensitivitaet fehlen; der Backtest kann diese Modellgrenze nicht quantifizieren. | `ARCHITEKTUR_UND_FACHKONZEPT.md` nennt fehlende Gebuehren/Spreads/Produktkosten; FQ-01 verlangt Datenmanifest, Kostenvertrag und internationale/Teilperiodenvergleiche. | Ein historischer Pfad kann durch Indexvariante und nicht modellierte Kosten materiell verschoben werden. Eine Implementierung wuerde moeglicherweise Engine-Semantik beruehren. | Keine stillschweigende Umsetzung. Externes Owner-/Entscheidungsgate und separates Folgearbeitsdokument in Slice 09. |
| BT-19 | D | P0 | Der Pflegebucket-Summary-Pfad liest nachweislich aus der falschen Objektebene. | `logRows` speichert `{ jahr, row, ... }`; `simulator-backtest.js:397-405` liest jedoch `lastLogRow.health_bucket_*` statt `lastLogRow.row.health_bucket_*`. | Ein aktivierter Pflegebucket erscheint im Summary nie, obwohl die Jahreszeile Werte enthaelt. Das ist ein bestehender sichtbarer Produktdefekt. | Defektes Legacy-Verhalten in Slice 01 einfrieren, kanonische Summary-Reconciliation in Slice 05 korrigieren. |
| BT-20 | D | P0 | Der gemeinsam genutzte Rendite-Normalizer wandelt nicht-finite Jahreswerte fuer Backtest, Monte Carlo und Sweep still in 0 % um. | `simulator-year-portfolio.js:11-16` liefert bei nicht-finiten Aktien-, Gold- oder Cash-/Bondwerten jeweils 0. Damit bleibt ein fehlerhafter `yearData`-Record nach der Runnergrenze wirtschaftlich gueltig. | Daten-/Contractfehler koennen runneruebergreifend als Nullrendite fortgerechnet werden. Eine zentrale Aenderung hat zugleich breite MC-/Sweep-/Worker-Seiteneffekte. | Backtest-Preflight in Slice 03; gemeinsamer YearData-/Fehlervertrag mit Aufruferinventur und Stop-Gate in Slice 05. |

## Befundgruppen und Abhaengigkeiten

### 1. Zuerst zu sichern: Mess- und Ausfuehrungsvertrag

BT-08, BT-09 und BT-14 muessen vor fachlichen Ergebnisverschiebungen adressiert werden. Slice 01 friert dabei ausdruecklich auch BT-04/BT-19 und das heutige `legacy_schema_v0` als defekte Beobachtung ein. Ohne reinen Runner, versioniertes Resultat und getrennte `legacy_observed`-/`target_expected`-Oracles waere spaeter nicht trennbar, ob eine Abweichung beabsichtigt oder unbeabsichtigt ist.

### 2. Danach zu entscheiden: Daten und Zeitachse

BT-01, BT-02, BT-06 und BT-07 sind gemeinsam zu behandeln, aber nicht gleichzusetzen:

- Der technische Record-Contract kann und soll fehlende Felder, As-of-Jahre und Datenqualitaet explizit machen.
- Die exakte wirtschaftliche Konvention fuer realisierte Jahreswerte und zu Jahresbeginn bekannte Policywerte benoetigt einen dokumentierten Entscheid von Nutzer und Reviewern.
- Dataset-/Recordvalidierung findet einmal je Datenrevision und Periodenpreflight einmal je Request/Batch statt, nicht in der heissen Jahres-/Pfadschleife.
- Der aktuelle Rentenanpassungshelper mappt Startjahr 2000 korrekt auf den Serienwert 2000; der Contract braucht trotzdem einen Marker-/Off-by-one-Test.
- Unbekannte Quellen duerfen als `unresolved` manifestiert, aber nicht erfunden oder als wissenschaftlich geklaert markiert werden.

### 3. Ergebniswahrheit vor Funktionsausbau

BT-03 bis BT-05, BT-10, BT-19 und BT-20 sind vor Rolling Cohorts zu beheben. Das schliesst den Monte-Carlo-Caller ein: derselbe Adapter-/YearData-Fehler darf weder im Backtest noch in MC/Sweep als Ruin oder 0-%-Jahr gelten. Ein Batch ueber viele Startjahre darf unvollstaendige oder technische Fehler nicht vervielfachen und als Kohortenergebnis aggregieren.

### 4. Reproduzierbarkeit und UI folgen auf stabile Rohvertraege

BT-12, BT-15 und BT-16 benoetigen das versionierte Resultat. Der Export darf nicht mehr vom sichtbaren Detailtoggle abhaengen. Die UI darf nur aus dem kanonischen Result-/Metrikvertrag rendern.

### 5. Methodische Forschung bleibt ein getrenntes Gate

BT-13 und BT-18 koennen nicht allein durch Produktcode „geschlossen“ werden. Daten-/Methodik-Owner, Holdout-Custodian, Nutzungsrechte, vorab eingefrorene Protokolle und gegebenenfalls externe Fachreviews bleiben erforderlich. Slice 09 soll diese Grenze operationalisieren, nicht eine Wirksamkeitsfreigabe simulieren.

## Rueckdokumentation Slice 03

- **BT-01 teilweise technisch vorbereitet, nicht geschlossen:** `HistoricalYearRecordV1` und `HISTORICAL_ASSIGNMENT_INVENTORY_V1` weisen Legacy-Backtest, aktives Monte-Carlo-`annualData`, alternativen Builder und den noch inaktiven D-01-Vorschlag feldgenau aus. Der V1-Vorschlag nutzt realisierte Werte `t` und CAPE decision-as-of `t-1`, ist aber sichtbar `proposal_pending_d01`; die produktive Zuordnung bleibt unveraendert.
- **BT-02 Preflight vorhanden, produktiver Defekt noch aktiv:** Der neue Provider prueft Lookback und jedes ganzzahlige Anfragejahr vor Single Path oder Cohort-Batch und liefert die erste Luecke strukturiert als `incomplete`. Der Legacy-Runner ist in Slice 03 absichtlich noch nicht angeschlossen und kann deshalb bis zur Integrationsfolge weiterhin `continue` ausfuehren.
- **BT-06 Contract entschieden, UI noch legacy:** Ein vollstaendiger Einjahreslauf ist zulaessig; nicht-finite, nicht-ganzzahlige und rueckwaertige Perioden scheitern strukturiert. Technische Bounds `1929-2025` werden aus Dataset `1925-2025` plus vierjaehrigem Lookback abgeleitet. Sichtbare UI-Hardcodes werden erst in den Integrations-/UI-Slices ersetzt.
- **BT-07 technisch manifestiert, methodisch offen:** Manifest-ID `ruhestandsapp-historical-data-v1`, Revision `2026-07-18.1`, kanonischer SHA-256 `8246422d98657c2a76b750ce9fd1253e01aa7a9a4dfa0f0f01dcb96b5507ef29`. Source, Lizenz und exakte Variante bleiben fuer alle sechs Reihen `unresolved`; die externe Klaerung bleibt Slice 09.
- **BT-20 bewusst unveraendert:** Der V1-Contract lehnt nicht-finite Pflichtfelder ab, ist aber noch nicht im gemeinsamen YearData-Pfad aktiv. `simulator-year-portfolio.js:readYearReturnRates()` und seine MC-/Sweep-/Worker-Auswirkungen bleiben bis D-09/Slice 05 unangetastet.
- **Qualitaet/Performance:** Records und Provider sind immutable. Vollvalidierung ist je Manifestrevision/Content-Hash gecacht; Single-Path- und Cohort-Batch-Preflight erzeugen je genau ein Instrumentationsereignis, waehrend wiederholte Year-/MC-/Sweep-/Cohort-Lookups reine Record-Reads bleiben.

## Zielbild

```text
Backtest-UI
  -> validierter BacktestRequestV1
  -> DOM-freier HistoricalRecordProvider mit Manifest/As-of/Missingness
       -> einmalige Datasetvalidierung + einmaliger Periodenpreflight
  -> DOM-freier BacktestRunner
       -> gemeinsamer SimulateYearOutcome-Adapter (Backtest/MC/Sweep)
       -> simulateOneYear (bestehender Engine-/Simulatorvertrag)
       -> diskriminierter Outcome: completed | ruin | incomplete | technical_error
  -> BacktestRunResultV1
       -> reconciliierbare Metriken
       -> optionaler Rolling-Cohort-Diagnosebatch
       -> versionierter Raw-Export + getrennte Displayprojektion
  -> UI-Renderer / Browser-Gates / Dokumentation
```

## Nicht-Ziele des Hardening-Plans

- keine Aenderung an `engine.js`, `dist/` oder `RuheStandSuite.exe`
- keine automatische Beschaffung oder Erfindung historischer Quellen
- keine neue Steuerrechtsautomatik
- keine Aenderung von Spending-, Transaktions-, 3-Bucket-, Pflege- oder Dynamic-Flex-Semantik ohne separates Stop-/Entscheidungsgate
- keine Behauptung, Rolling Cohorts seien unabhaengige Stichproben oder Erfolgswahrscheinlichkeiten
- kein automatisches persistentes Trial-Tracking ohne explizite Nutzerentscheidung und Datenschutz-/Speichervertrag
- keine Wirksamkeits-, Eignungs- oder Safe-Withdrawal-Freigabe durch Codex

## Review-Auftrag an Gemini und Claude

Die Reviewer sollen insbesondere pruefen:

1. Ist BT-01 wirklich eine inkonsistente Zeitachse oder gibt es einen bisher undokumentierten fachlichen Grund fuer die einzelnen Offsets?
2. Lassen sich Engine-Fehler und wirtschaftlicher Ruin trennen, ohne den oeffentlichen EngineAPI-Vertrag zu veraendern?
3. Ist die vorgeschlagene Runner-Grenze klein genug, um Paritaet sicher nachzuweisen?
4. Welche Golden Cases muessen vor jeder erwarteten Backtest-Ergebnisverschiebung eingefroren werden?
5. Sind Rolling Cohorts fuer den Produktzweck erforderlich, optional oder ein getrenntes Feature?
6. Welche Daten-/Kosten-/Holdout-Arbeiten muessen wegen fehlender Owner oder Nutzungsrechte explizit blockiert bleiben?
7. Welche realistischen Versagensszenarien fehlen in der GAP-Matrix?

## Review-Feedback von Gemini

### 1. Prüfdimensionen & Befunde

1. **Korrektheit (GAPs und Akzeptanzkriterien):**
   - **G-F-01 (Zeitachsen-Diskrepanz):** Die Untersuchung von BT-01 bestätigt einen schweren Modellfehler: Der historische Backtest mischt Daten aus $t$ und $t-1$, während Monte Carlo über `annualData` voll synchronisierte Werte verwendet. Dies beeinträchtigt jegliche Vergleichbarkeit zwischen Backtest und MC. Die Zeitachsensynchronisation ist dringend erforderlich.
   - **G-F-02 (Datenlücken-Skip):** Das stumme Überspringen fehlender Datenjahre in `simulator-backtest.js:210` via `continue` überspringt Jahre stumm, inkrementiert aber den `yearIndex` und das simulierte Alter. Das erzeugt physikalisch falsche Zinseszins-Verläufe über zerrissene Zeitperioden hinweg.
2. **Vertragstreue:**
   - **G-F-03 (Monte-Carlo-Fehlerklassifikation):** Die Engine-Fehlerklassifikation (BT-03) hat eine gravierende Rückwirkung auf Monte Carlo. Da `monte-carlo-runner.js` den Typ `result.error` ignoriert, fließen alle durch `simulator-engine-direct.js:328` abgefangenen Engine-Validierungsfehler stillschweigend als wirtschaftlicher Ruin in die Erfolgsquote ein.
3. **Fehlerbehandlung:**
   - **G-F-05 (Performance der Validierung):** Die in Slice 03 vorgesehene Record-Validierung gefährdet die Performance der Monte-Carlo- und Sweep-Simulationen, wenn sie innerhalb der Simulationsschleife pro Jahr läuft. Sie muss auf die Datenlade-Ebene verlagert werden.
4. **Seiteneffekte:**
   - **G-F-04 (Mutation der Inputs):** Bei der Trennung in einen DOM-freien Runner (Slice 02) besteht das Risiko einer stillschweigenden Parameterkontamination bei wiederholten Aufrufen, falls Eingabeobjekte mutiert werden. Strikte Klonierung ist erforderlich.
5. **Was könnte brechen?**
   - Die Behebung von BT-01 (Zeitachse) wird zu einer deutlichen Verschiebung der historischen Endvermögen und Erfolgsquoten führen. Dies verändert das Verhalten des Auto-Optimizers und der Risikoprofile maßgeblich.

### 2. Pre-Mortem
Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- *Szenario:* Eine unvollständige Bereinigung der Engine-Fehlerrückgaben führt dazu, dass ein schwerwiegender fachlicher Berechnungsfehler (z. B. eine fehlerhafte Steuerberechnung oder ein Division-by-Zero-Fehler bei extremen Entnahmeraten) fälschlicherweise als `incomplete` statt als `technical_error` klassifiziert wird, wodurch fehlerhafte Berechnungen im System unentdeckt bleiben.

### 3. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  - *Drift der Optimierungsergebnisse:* Durch die As-of-Korrektur verändern sich die optimalen Entnahmeparametrisierungen.
- **Pre-Mortem:** (Siehe Szenario oben - Falschklassifikation von Fachfehlern als harmlose Lücken).

## Review-Feedback von Claude

Noch offen. Pflichtstruktur gemaess `SLICE_EXECUTION_RULES.md`: Pruefdimensionen, nummerierte Findings, Pre-Mortem, Ergebnis/Blocker/Restrisiken.

## Review-Antworten von Codex

Die verifizierten Findings wurden wie folgt in die GAP-Matrix aufgenommen:

- BT-01 umfasst jetzt explizit die Backtest-/Monte-Carlo-Diskrepanz und die getrennte Renten-/CAPE-Zeitbasis.
- BT-02 verbietet den Silent Skip und verlangt einen lueckenlosen Preflight vor der Schleife.
- BT-03 umfasst die technische Fehlerkontamination des Monte-Carlo-Nenners; Sweep wird als bereits getrennt behandelnder Vergleichscaller genannt.
- BT-08/BT-09/BT-14 wurden um Immutabilitaet, `legacy_schema_v0`, `breakOnRuin` und konkrete Golden-/Negative-Oracles erweitert.
- BT-10 behandelt `>= 10` versus Label `> 10 %` als Korrektheits- statt reines Komfortproblem.
- BT-19 erfasst den bestaetigten Pflegebucket-Summary-Defekt als eigenen P0.
- BT-20 erfasst die runneruebergreifende nicht-finite-zu-0-%-Normalisierung als eigenen P0.

Claude C-04 wurde differenziert behandelt: Der behauptete Zugriff auf den Lohnwert 1950 ist im aktuellen Code nicht vorhanden. `computeAdjPctForYear()` mappt Startjahr 2000/Index 0 auf den Serienwert 2000. Das As-of-/Off-by-one-Risiko bleibt dennoch als verpflichtender Test in BT-01/Slices 01/03/04.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| G-F-01/G-F-02 | Gemini | Alignment und Silent Skip | freigegeben durch Gemini | BT-01/BT-02, Slices 01/03/04 |
| G-F-03 | Gemini | MC-Fehler als Ruin | freigegeben durch Gemini | BT-03, Slice 05 |
| G-F-04 bis G-F-07 | Gemini | Mutation, Performance, Reconciliation, E2E | freigegeben durch Gemini | BT-08/BT-14/BT-15/BT-20, Slices 02/03/05/07/08 |
| C-01/C-02/C-03/C-05/C-07/C-08/C-09 | Claude | Legacyoracles, Pflegebucket, Request, Metrik, Schema, Returnfallback, Luecken | freigegeben durch Claude | BT-02/BT-09/BT-10/BT-14/BT-19/BT-20 |
| C-04 | Claude | vermuteter 1950-Zugriff | Defekthypothese widerlegt; Test-/Dokuauflage akzeptiert | BT-01, Slices 01/03/04 |
| C-06 | Claude | lineare Slice-Kette | freigegeben durch Claude | Ausfuehrungs-DAG im Plan und Slice-Abhaengigkeiten |
