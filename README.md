# Ruhestand-App-Final

Die Ruhestand-App ist ein lokal betriebenes Planungstool ohne serverseitige
Fachlogik oder automatischen Cloud-Sync. Sie umfasst zwei Oberflächen:

* **Balance-App** – steuert den jährlichen Entnahmeprozess, verwaltet Liquidität und erzeugt Diagnoseberichte.
* **Simulator** – führt Monte-Carlo-Simulationen, Parameter-Sweeps und Pflegefall-Szenarien aus.

Beide Anwendungen teilen sich eine modulare Berechnungs-Engine. Der
Browserbetrieb benötigt keinen Anwendungs-Build, wird wegen ES-Modulen und
Workern aber über den mitgelieferten lokalen HTTP-Start geöffnet. Kernrechnung,
manuelle Dateneingabe und lokale Persistenz funktionieren ohne Internet;
Live-Kurse, Inflations-/CAPE-Abrufe und Google Fonts sind optionale externe
Netzwerkpfade.

---

## Release-Stand

**Aktueller Dokumentationsstand:** 2026-07-15

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
| **[docs/reference/TRANCHEN_MODULES_README.md](docs/reference/TRANCHEN_MODULES_README.md)** | Nutzer/Entwickler | Tranchenvertrag, Persistenz, Quotes, Consumer und Reconcile |
| **[docs/README.md](docs/README.md)** | Autoren/Entwickler | Doku-Struktur und Aufräum-Status |
| **[docs/internal/archive/2026-dynamic-flex/](docs/internal/archive/2026-dynamic-flex/)** | Entwickler (intern) | Archiv der Dynamic-Flex-Implementierungsunterlagen (Plan, Tickets, Rollout, Baseline, CAPE-Contract) |

---

## Funktionen im Überblick

### Balance-App
* Speichert Eingaben ueber die zentrale Persistenz-Facade; im Browser ist IndexedDB die lokale Source of Truth, Tauri nutzt `ruhestand_suite_data.json` im App-Datenverzeichnis. Ein optional verbundenes Browser-Snapshot-Verzeichnis wird in einer eigenen Handle-Datenbank gespeichert; bestehende Handles aus der frueheren `snapshotDB` werden einmalig uebernommen, ohne die Snapshot-Archivmigration zu blockieren.
* Komplett-Backup und Komplett-Import liegen zentral auf der Startseite unter `Profile > Erweitert`; Jahresabschluss-Snapshots bleiben als fachlicher Sicherungspunkt in einem separaten internen Snapshot-Archiv erhalten.
* Liest Marktdaten und Ausgaben aus CSV-Dateien ein.
* **Fail-safe Jahresprozess mit Online-Datenabruf:** Jahres-Update und Jahresabschluss starten denselben periodengebundenen Ablauf. Nach lokaler Vorprüfung und erfolgreichem Flush entsteht zuerst ein verifizierter Recovery-Snapshot; erst danach werden Alter, Inflationsdaten (ECB, World Bank, OECD), ETF-Kurse (VWCE.DE via Yahoo Finance über lokalen Proxy), CAPE, Bedarf und Ausgabenjahr fortgeschrieben. Das neue Alter wird zugleich im aktiven Profil gespeichert, damit der nachfolgende Profil-Sync es nicht zurücksetzt. Der ETF-Wert für `endeVJ` stammt dabei ausschließlich aus dem letzten verfügbaren Handelstag vom 27. bis 31. Dezember der laufenden Abschlussperiode; Kurs, ISO-Stichtag, Ticker, Quelle und Zieljahr werden gemeinsam gespeichert.
* **Auto-CAPE im Jahreswechsel:** US-Shiller-CAPE wird im Jahresprozess automatisch geladen (Fallback: Yale → Mirror → letzter gespeicherter Wert). Ein nicht auflösbarer CAPE-/Datenfehler lässt den Recovery-Snapshot und einen sichtbaren unvollständigen Periodenstatus bestehen, statt den Abschluss als erfolgreich zu markieren.
* **Ausgaben-Check (monatlich):** CSV-Import pro Monat und Profil, Budgetkontrolle je Monat, Detailansicht mit Top-3-Kategorien, Jahreshochrechnung (ab 2 Datenmonaten mit Median), Soll/Ist auf Basis importierter Monate sowie Jahres-Historie per Jahr-Auswahl. Korrupte Ausgabendaten werden nicht als leer interpretiert: Der Bereich bleibt schreibgesperrt und bietet Recovery-Export, bestaetigten Reset oder Abbruch an.
* **Idempotenter Jahresabschluss + Ausgaben-Historie:** Eine stabile Perioden-ID verhindert Doppelklick- und Wiederholungs-Commits. Der Ausgaben-Check muss auf dem abzuschließenden Vorjahr stehen und wechselt nach erfolgreicher Post-Write-Validierung auf das Folgejahr; Vorjahre bleiben vollständig einsehbar.
* **Mindest-Flex p.a.:** Optionale, bedingte Untergrenze fuer Flex-Ausgaben in kuerzenden Safety-/Guardrail-Phasen; sie ersetzt nicht den Floor und wird in Diagnose sowie Kopiertext transparent ausgewiesen.
* Nutzt die Engine v31 zur Marktanalyse, Entnahmeplanung und Liquiditätssteuerung.
* **Regime-Smoothing-Diagnose:** Kontinuierliche Drawdown-/CAPE-/Runway-Signale ergaenzen die diskreten Marktregime. Die geglaettete Runway-Zielberechnung bleibt per Default deaktiviert (`CONFIG.REGIME_SMOOTHING.TARGETS_ENABLED=false`), kann aber Diagnosefelder fuer Rohziel, Effektivziel, Severity, Fallback und harte Mindestgrenze ausweisen.
* Jahresübergreifende Verlustverrechnung (Verlusttopf) ist integriert; die finale Steuer stammt aus dem Jahres-Settlement.
* Diagnoseansicht mit Guardrails, Entscheidungsbaum und Key-Performance-Parametern.
* **Profil-Assets-Manager:** Detaillierte Tranchen werden profilgebunden, schema-validiert und fuer steueroptimierte Verkaeufe genutzt. Empfehlungen bleiben schreibfrei; reale Brokerverkaeufe werden nur ueber Vorschau plus explizit bestaetigten, idempotenten Reconcile fortgeschrieben.
* **Profil-Verwaltung:** Optionales Namensfeld zur Unterscheidung von Snapshots (z. B. "Max" vs. "Partnerin") für effektive Mehr-Personen-Planung.
* **Pflegebucket-Diagnose:** Liest die in der Profilpflege definierte gesperrte Geldmarkt-/Cash-Reserve und zeigt Brutto-Liquidität, Pflege-Zweckbindung, operative Liquidität und inflationsbezogene Zieldeckung. In der Balance-App ist der Bucket aktuell bewusst `diagnostic_only`; es erfolgt keine automatische operative Freigabe.
* Tastenkürzel u. a. für Jahresabschluss (`Alt` + `J`) und Marktdaten nachrücken (`Alt` + `N`).

### Simulator
* Monte-Carlo-Simulationen mit unterschiedlichen Renditequellen (historisch, Regime, Block-Bootstrap, Stationary Bootstrap) inkl. Worker-Parallelisierung. Ein aktiver Worker-Lauf kann ueber **Monte-Carlo-Lauf abbrechen** beendet werden; der Abbruch startet keinen seriellen Ersatzlauf, und ein neuer Pool wird erst beim naechsten ausdruecklichen Start aufgebaut. Historische Daten reichen bis 1925 (Schwarze-Schwan-Phase optional per Filter/Recency abgewichtbar); ein optionales Fat-Tail-/Crash-Overlay kann als expliziter Stresstest zugeschaltet werden.
* **Monte-Carlo-Ressourcenvertrag:** Der Standard sind 10.000 Runs. Bis 100.000 Runs ist keine Grosslastbestaetigung erforderlich; 100.001 bis 1.000.000 Runs zeigen Run-Jahre und eine Speicherklasse und muessen vor jedem Start ausdruecklich bestaetigt werden. Runzahl, Dauer, Blocklaenge, Seed, Samplingmodus, Workerzahl (0=auto, maximal 32) und Jobbudget (50-5.000 ms) werden in UI, direktem Runner, Worker und Auto-Optimize durch denselben strikten Vertrag validiert; Dezimalzahlen, Suffixe und stille Begrenzungen werden abgewiesen. Fortschritt, Abbruch, Fehler und Abschluss besitzen sichtbare sowie assistenztechnisch lesbare Zustaende.
* Monte-Carlo-Runner ist DOM-frei modularisiert; Chunk-Kontext, Startjahr-/CAPE-Sampling, Life-State-Initialisierung, Stress-Metriken, Logzeilen-Builder und Run-Metriken liegen in eigenen Simulator-Modulen.
* **Versionierter Samplingvertrag:** `MonteCarloSamplingContractV1` verankert das gewaehlte Startjahr als erstes tatsaechliches Marktjahr. Fixed- und Stationary-Block starten dort zusammenhaengend, Markov initialisiert dort sein Regime und IID zieht erst ab Jahr 2 unabhaengig. CAPE hat vor Filter/Recency Vorrang; die Oberflaeche weist den Konflikt sichtbar aus. Chunk- und Workerresultate enthalten kompakte, merge-invariante Ziehungsdiagnostik mit Datenfingerprints.
* **Schaetzerunsicherheit und reale Depotentnahme:** Die Floor-Deckungsquote zeigt neben Zaehler und Runzahl ein Wilson-95-Prozent-Intervall sowie bei weniger als 1.000 Runs eine Unsicherheitswarnung. `Reale Depotentnahme P10` ist laufbasiert: Jeder auswertbare Run liefert genau einen P10-Wert; nach Ruin werden weitere Dekumulationsverpflichtungen bis Tod oder Horizont mit 0 Euro aufgefuellt. Technische Fehler und Tod vor der ersten Verpflichtung bleiben als Missingness sichtbar. Quantile zeigen Stichprobengroesse und Missingness, beanspruchen aber kein Konfidenzintervall.
* **Reproduzierbarer Monte-Carlo-Export:** Nach jedem fachlich oder technisch abgeschlossenen Lauf wird der Button `Vollständiges MC-Ergebnis (JSON)` freigeschaltet. `MonteCarloExportV1` enthaelt den normalisierten `MonteCarloRunRequestV1`, das kanonische `MonteCarloRunResultV1`, Seed-, Sampling-, Stress-, Worker-/Chunk-, App-, Engine-, Snapshot- und Datenprovenienz sowie Missingness und Warnungen. Request-/Run-ID und SHA-256-Fingerprints sind vom Exportzeitpunkt unabhaengig. Der Download erfolgt nur auf ausdrueckliche Nutzeraktion; lokale Pfade, Secret-Felder und nicht endliche Zahlen werden fail-closed abgewiesen. Der Export enthaelt die Finanzannahmen des aktuellen Szenarios und sollte vertraulich behandelt werden.
* **V1-Abschlussvertrag:** V1-Writer und -Reader verwenden nur noch die kanonischen KPI-Felder; die befristeten Legacy-Read-Aliase sind entfernt. Die unveraenderliche Referenz `pre-hardening-v1`, die semantischen Post-Slice-Snapshots und der extern noch nicht freigegebene Kandidat `monte-carlo-v1-final` bleiben getrennt. Unerklaerte Deltas blockieren; der Kandidat ist ein technischer Regressionsnachweis, keine empirische Modellfreigabe.
* **Parameter-Sweep mit Auto-Optimize:** Whitelist-Ansatz, Deep-Clones und Wächterlogik für Zwei-Personen-Setups. Worker-Parallelisierung fuer Sweep und Auto-Optimize, mehrphasige Optimierung mit LHS, Quick-Filter, voller Evaluation, Refinement und Validierung (~8-10x schneller), dynamische Parameter-UI (1-7 Parameter), Preset-Konfigurationen und Champion-Config-Output für die Strategiefindung. Details siehe `docs/reference/AUTO_OPTIMIZE_DETAILS.md`.
* **Dynamic-Flex (VPW) Profile:** Profilsteuerung (`Aus`, `Defensiv`, `Ausgewogen`, `Offensiv`) mit optionalen erweiterten Parametern für `horizonYears`, `survivalQuantile` und `goGoMultiplier`.
* **CAPE-Return-Policy fuer VPW:** Die kontinuierliche CAPE-to-Return-Policy ist als expliziter Config-Modus `cape_continuous` verfuegbar. Default bleibt `legacy_step`, weil lokale Backtest-Vergleiche sichtbare Entnahme-/Endvermoegens-Deltas zeigen und der Default-Wechsel fachlich freigegeben werden muss.
* **Mindest-Flex p.a.:** Wird in Backtest, Monte Carlo, Sweep und Profilverbund bis in die Engine durchgereicht; Scenario-/Backtest-Logs zeigen Status, Blockiergrund und effektive Mindest-Flex-Wirkung.
* **Historische Backtest-Zeitachse:** Der Backtest verwendet validierte Jahresrecords mit realisierten Aktien-, Gold-, Cash-/Bond-, Inflations- und Lohnwerten aus dem Simulationsjahr `t`; CAPE bleibt als zu Jahresbeginn bekannter Policywert auf `t-1`. Unvollstaendige Perioden oder Lookback-Fenster werden vor der Rechnung als `incomplete` abgewiesen. Monte Carlo, Sweep und Worker verwenden weiterhin ihre eigenen Recordpfade.
* **Reproduzierbarer Backtest-Export:** Die Backtest-Buttons erzeugen nur auf ausdrueckliche Nutzeraktion ein versioniertes Raw-JSON oder eine technische CSV-Rohdatenansicht. JSON enthaelt Request, Outcome, Daten-/Zeitachsen-/Engineprovenienz, Portfolio-Snapshots, Jahresrecords/-zeilen und Metriken als echte Zahlen. Run-/Request-ID und SHA-256-Fingerprint identifizieren den kanonischen Lauf; der Exportzeitpunkt gehoert nicht zum Result-Fingerprint. Der Export enthaelt die vollstaendigen lokalen Finanzannahmen und sollte entsprechend vertraulich behandelt werden.
* **Backtest-Status und Rolling Cohorts:** Die Zeitraumfelder zeigen manifestabgeleitete Grenzen und feldnahe Fehler. Ein fokussierbarer Live-Status trennt `completed`, `ruin`, `incomplete` und `technical_error`; Nutzertexte nennen einen stabilen Code, Ursache und naechsten Schritt ohne Stacktrace. Optional lassen sich feste, ueberlappende Rolling Cohorts fuer den gewaehlten Zeitraum auswerten. Das Inventar trennt Outcomes und Ausschluesse; historische Einzelpfade und Cohorts bleiben In-sample-Diagnosen, keine unabhaengigen Versuche und keine Erfolgswahrscheinlichkeit.
* **Auto-Optimize Dynamic-Flex-Modus:** `inherit`, `force_on`, `force_off`; Dynamic-Flex-Parameter sind nur bei effektiv aktivem Dynamic-Flex optimierbar, inklusive Safety-Guards gegen zu aggressive Lösungen.
* **Workflow-Transparenz:** Die Hauptabläufe (Balance, Monte-Carlo, Backtest) sind nun als Pseudo-Code dokumentiert: `docs/reference/WORKFLOW_PSEUDOCODE.md`.
* **Log-Transparenz für Entnahmen:** Detaillierte Monte-Carlo-Scenario-Logs und Backtest-Logs zeigen additive Payout-/VPW-Erklärfelder (`EntPlan`, `EntEff`, `VPW€`, `VPWFlex`, `Liq>P`, `Liq<P`, `Port>P`, `PortEnd`) sowie Return-Policy-Diagnosen (`RetPol`, `RetSrc`, `CAPESt`, `ERRaw`, `ERClamp`, `SafeR`, `SafeSrc`), damit hohe Dynamic-Flex-Entnahmen nachvollziehbar bleiben.
* **Tail-Risk-Overlay:** Optionales, standardmäßig deaktiviertes Ereignis-Overlay für seltene Crash-/Inflationsschocks. Historische Krisenjahre erhalten keinen zusätzlichen Return-Schock; Ergebnis-KPIs und Scenario-Log-Exporte weisen aktive, angewandte und übersprungene Tail-Events separat aus.
* **Getrennte Pflege-KPIs:** Monte Carlo weist Eintrittsquote, Eintrittsalter, Pflegejahre und realen Pflege-Mehrbedarf fuer P1 und P2 getrennt aus. Bedingte Kennzahlen ohne Beobachtungen erscheinen als Gedankenstrich; Haushaltswerte summieren den tatsaechlich modellierten P1-/P2-Zusatzbedarf und werden nicht als kausal depotfinanzierte Kosten bezeichnet.
* Stresstests, Pflegefall-Szenarien und Heatmap-Visualisierung (fokussiert auf Rentenphase). Neue Presets: Great Depression (1929-1933) und Zweiter Weltkrieg (1939-1945).
* Sweep-Schutz für Partner:innen-Renten inklusive Rente-2-Invarianz und Heatmap-Badges.
* Szenario-Log-Analyse mit bis zu 31 auswählbaren Szenarien: bis zu 16 charakteristische (Perzentile, getrennte P1-/P2-Pflege-Extremfälle, Risiko-Szenarien) und 15 zufällige Samples für typisches Verhalten.
* Checkboxen für Pflege-Details und detailliertes Log, JSON/CSV-Export für ausgewählte Szenarien.
* **Tranchen-Integration:** Steuerorientierte, modellbasierte Verkäufe mit detaillierten Depot-Positionen. Der Simulator tiefenkopiert profilgebundene Lots, bewahrt `sourceProfileId` und schreibt Simulationsmutationen niemals in den Realbestand zurueck.
* Notfallverkäufe werden steuerlich per Gesamt-Settlement-Recompute mit den regulären Verkäufen des Jahres konsistent verrechnet.
* **Pflegebucket als gesperrte Geldmarkt-/Cash-Reserve:** Der Simulator gliedert den optionalen Bucket nach dem Profilverbund-Merge aus Geldmarkt-Tranchen, ungetranchtem Geldmarkt und Tagesgeld aus. Die Engine sieht nur die operative Liquidität; der Bucket kann erst bei Pflege-Trigger vor Forced Sales Liquiditätslücken decken.

#### Schrittfolge für den Simulator (Simulator.html)
1. **Profile wählen & Rahmendaten:** Im Tab „Rahmendaten“ die gewünschten Profile aktivieren. Die Vermögenswerte und Renten werden automatisch aggregiert und schreibgeschützt angezeigt.
    *   **Bedarf pflegen:** `Floor-Bedarf p.a.` (Muss-Ausgaben) und `Flex-Bedarf p.a.` (Wunsch-Ausgaben) sind hier editierbar und essenziell für die Strategie.
2. **Details & Personen prüfen:** Kontrollieren Sie die aus den Profilen übernommenen Renten und Startalter in der Sektion "Personen & Rente". Erweiterte Einstellungen (z.B. Gold-Strategie) können ebenfalls angepasst werden.
3. **Monte-Carlo-Simulation:** Im Tab „Monte-Carlo“ Parameter wie Anzahl der Läufe oder Aktienquote justieren (Default ist oft ausreichend) und **Simulation starten** klicken. Ein aktiver Workerlauf kann mit **Monte-Carlo-Lauf abbrechen** kontrolliert beendet werden; waehrend des Abbruchs bleibt ein Neustart gesperrt und es gibt keinen seriellen Fallback. Nach Abschluss kann der versionierte Run-/Result-/Provenienzvertrag ueber **Vollständiges MC-Ergebnis (JSON)** lokal gespeichert werden; der bestehende JSON/CSV-Export eines ausgewaehlten Szenario-Logs bleibt davon getrennt.
4. **Historische In-sample-Diagnose:** Nutzen Sie den Tab „Backtesting“, um die Strategie an bereits bekannten historischen Marktverläufen (z.B. ab 2000) zu untersuchen. Das ist weder eine Zukunftsvalidierung noch eine Erfolgswahrscheinlichkeit. Die Oberflaeche zeigt zulaessige Datensatzgrenzen, Outcome, Datenqualitaet und den In-sample-Hinweis. Optional aktivierte Rolling Cohorts verwenden eine feste Horizontlaenge und weisen ungeeignete Fenster getrennt aus. JSON exportiert den vollstaendigen reproduzierbaren Laufvertrag inklusive Cohort-Inventar; CSV ist eine flache technische Jahresansicht mit Punkt als Dezimaltrenner und leeren Feldern fuer fehlende Werte. Der sichtbare Detailmodus aendert diese Raw-Exporte nicht.
5. **Ergebnisse interpretieren:** Die Monte-Carlo-Kennzahl „Floor-Deckung im gewählten Horizont“ ist eine modellinterne Quote, keine Garantie und keine Aussage des historischen Backtests. Das Terminalinventar trennt `ruin`, `all_dead`, den zensierten Zustand `horizon_exhausted` und `technical_error`; bei mindestens einem technischen Fehler werden Quote und Wilson-Intervall fail-closed nicht ausgewiesen. Das Intervall beschreibt nur Monte-Carlo-Stichprobenfehler, nicht Modellrisiko. Immer gemeinsam mit P10/P50/P90, der laufbasierten `Realen Depotentnahme P10`, dem Anteil abgeschlossener Dekumulationsjahre mit mindestens 10 % Kürzung, Portfoliovolatilität, Drawdown, Depoterschöpfung und Pflege-KPIs lesen. Bei der Depotentnahme werden Jahre nach Ruin bis Tod oder Horizont mit 0 Euro aufgefuellt; sie ist kein Mass fuer den gesamten Haushaltskonsum. Ein Gedankenstrich bedeutet bei einer bedingten Kennzahl, dass keine Beobachtung vorlag; er ist keine beobachtete 0. Pflegebetraege sind reale modellierte Mehrbedarfe zur Preisbasis des Simulationsstarts, keine kausal zugeordneten Depot-Cashflows. Der Vergleich „ohne minus mit Pflege“ stellt ungepaarte Gruppenmediane gegenueber und ist nicht kausal. Heatmaps zeigen Sensitivitäten, und das Szenario-Log bietet Analysen zu typischen und extremen Verläufen. Für hohe Dynamic-Flex-Entnahmen den detaillierten Logmodus aktivieren und Payout-/VPW-Spalten prüfen.
6. **Optimierung (Sweep):** Im Tab „Sweep“ können Parameter (z.B. Aktienquote) automatisiert variiert werden, um das Optimum zu finden.
7. **Dynamic-Flex verifizieren:** Für neue Entnahmelogik zuerst Backtest prüfen, danach Monte Carlo, dann Sweep/Auto-Optimize mit denselben Dynamic-Flex-Einstellungen. Backtest- und Scenario-Log verwenden im detaillierten Modus dieselben Payout-/VPW- und Return-Policy-Begriffe.
8. **Tail-Risk vergleichen:** Für Stressanalysen zuerst einen Standardlauf ohne Overlay speichern/merken, dann Tail-Risk bewusst aktivieren und Floor-Deckung im gewählten Horizont, terminale Outcomes, P10/P50/P90, Max Drawdown und Tail-Risk-KPIs vergleichen. Die `Reale Depotentnahme P10 (Stress)` verwendet pro Run genau einen realen P10 im festen Stressfenster und fuellt nach Ruin verbleibende Verpflichtungsjahre bei noch lebendem Haushalt mit 0 Euro auf.

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

Das Simulator-Dashboard trennt die Pflegeanalyse nach P1, P2 und Haushalt. Eintrittsalter und Pflegejahre sind nur auf tatsaechliche
Eintritte bedingt; leere Stichproben bleiben `null`. Geldwerte zeigen reale Pflege-Mehrbedarfe zur Preisbasis des Simulationsstarts,
waehrend nominale Rohwerte im Laufvertrag ein `NominalEur`-Suffix tragen. Simultane Pflege wird als P1-plus-P2-Jahressumme erfasst.
Die Szenario-Log-Auswahl hebt den fruehesten Eintritt fuer beide Personen sowie den hoechsten realen Pflege-Mehrbedarf getrennt hervor.

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
* Kategorie und Typ folgen einer disjunkten Matrix; korrupte oder widerspruechliche Bestände blockieren fail-closed statt auf einen anderen Bestand zurueckzufallen.
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
2.  **Node.js (optional, nur Browservariante):** Für den automatischen Abruf von Online-Kursdaten (ETF-Preise) wird dort ein lokaler Proxy benötigt. Dieser setzt eine installierte [Node.js](https://nodejs.org/)-Laufzeitumgebung voraus. Die Tauri-Variante bringt ihren Loopback-Proxy selbst mit.
    *   *Ohne Node.js im Browserbetrieb:* Die App startet normal, aber der Button "Online-Update" im Tranchen-Manager ist ohne Funktion. Manuelle Kurspflege ist weiterhin möglich.

---


## Nutzung

### Option 1: Standalone-Anwendung

**RuhestandSuite.exe** – portables Windows-Artefakt auf Basis von Tauri:
* Keine Installation, kein Installer und keine Administratorrechte erforderlich
* Dedizierter Buildpfad für Windows über `build-tauri.bat` beziehungsweise `npm run build-tauri-exe`
* Beinhaltet beide Apps (Balance & Simulator) in einer nativen Desktop-Umgebung
* Kernrechnung und lokale Datenhaltung sind offline nutzbar; Live-Kurse, Inflation, CAPE und Webfonts benötigen Netzwerkzugriff
* Nutzt kein separates lokales Webserver-Setup; das Frontend wird direkt aus `dist/` in der Tauri-WebView geladen
* Enthaelt einen integrierten Yahoo-Proxy fuer Kurs-Updates (lokaler Port 8787)

Die Tauri-Konfiguration beschreibt zwar Bundleziele für weitere Plattformen,
im aktuellen Repository ist aber nur der Windows-Releasepfad eigens
orchestriert. Ein vorhandenes lokales EXE-Artefakt ist noch kein Nachweis für
einen grünen Testlauf, einen manuellen Desktop-Smoke oder eine Veröffentlichung.
macOS-/Linux-Desktop-Builds sind hier weder aktuell validiert noch als
ausgeliefert dokumentiert.

**So nutzen Sie die portable EXE:**
1. `RuhestandSuite.exe` aus einem ausdrücklich freigegebenen Build oder Release in einen beliebigen Ordner kopieren.
2. Per Doppelklick starten; die Tauri-App öffnet die Oberfläche direkt aus dem gebündelten `dist/`-Stand.
3. Optionale Live-Datenzugriffe funktionieren bei Internetverbindung; ETF-Kurse laufen über den integrierten lokalen Proxy, Inflation und CAPE direkt über freigegebene externe Endpunkte. Ohne Internet bleiben lokale Planung und manuelle Werte nutzbar. Ein bereits bestätigter Jahresabschluss kann bei einem fehlgeschlagenen periodengebundenen Datenschritt jedoch bewusst in den Recovery-Zustand wechseln, statt mit einem falschen Stichtag fortzufahren.
4. Eigene Szenarien werden im Benutzerprofil als Tauri-App-Daten gespeichert. Live-Daten liegen in `ruhestand_suite_data.json`, Jahresabschluss-Snapshots separat in `ruhestand_suite_snapshots.json`; der Wechsel zwischen Browser und EXE laeuft ueber das zentrale Komplettbackup auf der Startseite.

Bei optionalen Abrufen verlassen nur die jeweiligen Requestparameter den
Rechner: etwa Yahoo-Symbol/Suchbegriff und Zeitfenster oder fest konfigurierte
Reihen und Zieljahre für Inflation/CAPE. Depotmengen, Cost Basis, Bedarfe und
Profilzustände werden über diese Pfade nicht absichtlich übertragen. Übliche
IP-/Transportmetadaten fallen bei externen Providern dennoch an.

### Option 2: Browser-basierte Nutzung

1. Repository klonen oder herunterladen.
2. **Suite starten:** Doppelklick auf `start_suite.cmd` (Windows).
   * Startet automatisch den lokalen Webserver (Port 8000) und den Yahoo-Proxy für Online-Kurse (Port 8787).
   * Öffnet den Browser mit der Startseite.
   * Beim Schließen (Ctrl+C oder Fenster schließen) werden beide Prozesse sauber beendet.
3. `Balance.html` bzw. `Simulator.html` im Browser aufrufen.
   * Das automatisierte Browser-Gate läuft mit Chromium; weitere Browser bleiben Teil der manuellen Kompatibilitätsprüfung.
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
* Der Windows-Release-Build bleibt ein bewusst manueller Schritt über `build-tauri.bat` bzw. `scripts/build-tauri.ps1` nach grüner Suite. Das Skript prüft die Build-Voraussetzungen, erzeugt `dist/` frisch via `npm run sync-dist`, validiert zentrale Assets und führt `npm run tauri:build` aus. Vor dem abschließenden Kopieren einer plausibilisierten neuen `RuhestandSuite.exe` ins Repo-Root wird eine vorhandene Vorgängerversion unter `release-archive/RuhestandSuite_yyyy-MM-dd_HH-mm-ss-fff.exe` archiviert.
* Für schnelle QA bitte `npm test` einmal durchlaufen lassen. Kritische Browserabläufe werden zusätzlich mit `npm run test:browser` geprüft; `npm run test:coverage` aktualisiert die transparente V8-Coverage-Baseline. Wenn lokal `npm` defekt ist, kann die fachliche Suite direkt mit `node tests/run-tests.mjs` validiert werden; der Tauri-Release-Build selbst benötigt weiterhin ein funktionierendes `npm`.

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
* **docs/reference/TRANCHEN_MODULES_README.md** – zentraler Tranchen-Daten-, Persistenz-, Quote- und Reconcile-Vertrag.
* **engine/README.md** – Engine-Module und Build-Prozess.
* **tests/README.md** – Aufbau und Ausführung der Test-Suite.
* **docs/reference/WORKFLOW_PSEUDOCODE.md** – Ablaufdarstellung zentraler Workflows in Pseudocode.

---

## Lizenz

Veröffentlicht unter der MIT-Lizenz. Die vollständigen Lizenzbedingungen stehen in `LICENSE.md`.
Lizenztext, npm-Paketmetadaten und Tauri-/Cargo-Metadaten weisen das Projekt einheitlich als `MIT` aus.
