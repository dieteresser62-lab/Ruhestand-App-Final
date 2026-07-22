# Simulator / Monte Carlo: GAP-Analyse

**Stand:** 2026-07-22
**Status:** Plan und Slices 01-03 freigegeben; Slice 04 implementiert, externes Review ausstehend
**Autor:** Codex als Implementer und Plan-Autor  
**Planungsbranch:** `codex/simulator-monte-carlo-gap-plan` (nur lokal; nicht auf GitHub veroeffentlicht)  
**Folgeplan:** [SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md](./SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md)

## 1. Zweck und Rollenabgrenzung

Diese Datei ist eine technische Bestands- und GAP-Analyse. Sie ist keine
Freigabe, kein Wirksamkeitsnachweis und kein Code-Review durch Codex. Gemini und
Claude sollen die Befunde adversarial pruefen, Findings und ein Pre-Mortem
dokumentieren und den Plan erst nach geklaerten Blockern freigeben.

Untersucht wurden:

- Monte-Carlo-UI und Orchestrierung,
- DOM-freier Runner, Jahres-/Life-Event-Logik und Aggregation,
- Sampling, Seeds, Stationary Bootstrap und Tail-Risk,
- Worker-Pool, Chunking und Auto-Optimize als zweiter MC-Consumer,
- Ergebnis-KPIs, Szenarioauswahl und Exporte,
- Persistenz, Validierung, Dokumentation und Testabdeckung.

Nicht untersucht als Wirksamkeitsnachweis wurden die empirische Guete der
Kapitalmarktdaten, die Kalibrierung von Pflege-/Mortalitaetsannahmen oder die
Eignung einer Policy fuer reale Haushalte. Diese Grenzen bleiben im
Forschungsvalidierungs-Backlog beziehungsweise in den FR-/FQ-Dossiers offen.

## 2. Gepruefte Quellen

### 2.1 Produktive Pfade

- `Simulator.html`
- `app/simulator/simulator-monte-carlo.js`
- `app/simulator/monte-carlo-runner.js`
- `app/simulator/monte-carlo-ui.js`
- `app/simulator/monte-carlo-aggregates.js`
- `app/simulator/monte-carlo-runner-utils.js`
- `app/simulator/mc-run-context.js`
- `app/simulator/mc-year-sampling.js`
- `app/simulator/mc-life-events.js`
- `app/simulator/mc-run-metrics.js`
- `app/simulator/mc-log-builder.js`
- `app/simulator/mc-stress-tracker.js`
- `app/simulator/scenario-analyzer.js`
- `app/simulator/results-metrics.js`
- `app/simulator/results-renderers.js`
- `app/simulator/simulator-results.js`
- `app/simulator/worker-job-runner.js`
- `app/simulator/auto-optimize-worker.js`
- `workers/mc-worker.js`
- `workers/worker-pool.js`

### 2.2 Referenzen und fruehere Vorhaben

- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `docs/reference/DATA_SOURCES.md`
- `docs/internal/archive/2026-Refactoring/REFACTORING_MONTE_CARLO_RUNNER.md`
- `docs/internal/archive/2026-simulator-worker-parity/SIMULATOR_WORKER_PARITY_PLAN.md`
- archivierte Plaene zu Stationary Bootstrap, Tail-Risk und Langlebigkeit

Die neue Planung dupliziert diese abgeschlossenen Vorhaben nicht. Sie setzt bei
heute noch sichtbaren Vertrags-, Ergebnis- und Betriebsgrenzen an.

## 3. Baseline am 2026-07-19

### 3.1 Teststatus

| Gate | Ergebnis |
| --- | --- |
| 10 fokussierte MC-/Worker-/UI-Tests | gruen; unter anderem 140 MC-, 369 Worker-Paritaets- und 31 echte Worker-Entrypoint-Assertions |
| `npm run test:browser` | gruen |
| `npm run test:coverage` | 5.703/5.704 Assertions; ein fremder Doku-Linkfehler durch bereits vorgefundene Archivverschiebung |
| separat erzeugter Coverage-Report | 73,85 % beziehungsweise 29.132/39.446 approximierte ausfuehrbare Zeilen |

Der einzige Gesamt-Suite-Fehler betrifft sechs gebrochene Links nach der bereits
vor Analyse vorhandenen Verschiebung von Forschungsdokumenten. Diese
Fremdaenderung wurde nicht korrigiert. Vor Beginn eines Implementierungsslices
muss die Baseline wieder vollstaendig gruen sein oder der Nutzer muss die
fremde Baustelle separat klaeren.

### 3.2 Relevante Coverage-Sicht

| Modul | Coverage |
| --- | ---: |
| `monte-carlo-runner.js` | 77,30 % |
| `mc-run-metrics.js` | 96,92 % |
| `mc-year-sampling.js` | 85,71 % |
| `simulator-monte-carlo.js` | 3,44 % |
| `monte-carlo-ui.js` | 10,79 % |
| `results-metrics.js` | 25,19 % |
| `results-renderers.js` | 0 % |
| `scenario-analyzer.js` | 16,58 % |
| `worker-job-runner.js` | 0 % |
| `worker-pool.js` | 38,46 % |
| `mc-worker.js` | 66,13 % |

Die vorhandene Suite beweist gute deterministische Runner- und Chunk-Paritaet.
Sie beweist nicht den gesamten Nutzerworkflow, Fehler-/Abbruchpfade des
adaptiven Job-Runners oder die semantische Richtigkeit der dargestellten KPIs.

## 4. Prioritaetsmodell

| Prioritaet | Bedeutung |
| --- | --- |
| P0 | Kann finanzielle Ergebnisse oder deren Bedeutung falsch darstellen; vor neuen MC-Features zu behandeln. |
| P1 | Reproduzierbarkeit, Robustheit, Betriebs- oder Testluecke mit realistischem Fehlerszenario. |
| P2 | Weiterentwicklung oder Forschungsgrenze; nach dem Hardening oder in eigenem Arbeitsdokument. |

## 5. Detaillierte GAP-Liste

### MC-01 - Volatilitaets-KPI enthaelt Drawdown statt Volatilitaet (P0)

**Evidenz:** `computeRunStatsFromSeries()` liefert getrennt `volPct` und
`maxDDpct`. `runMonteCarloChunk()` destrukturiert nur `maxDDpct` und schreibt
diesen Wert sowohl in `buffers.volatilities` als auch in
`buffers.maxDrawdowns`. `results-metrics.js` bezeichnet `volatilities.p50`
anschliessend als annualisierte Standardabweichung.

**Auswirkung:** Zwei sichtbar unterschiedliche Risikokarten zeigen dieselbe
Drawdown-Groesse unter verschiedenen Bezeichnungen. Entscheidungen anhand der
Portfoliovolatilitaet koennen dadurch sachlich falsch sein.

**Ziel:** `volatilities` erhaelt `volPct`; `maxDrawdowns` erhaelt `maxDDpct`.
Golden Cases muessen beide Groessen auseinanderhalten.

**Slice:** 03.

**Umsetzungsstand 2026-07-22:** Implementiert. Der Runner schreibt `volPct`
und `maxDDpct` in getrennte V1-Felder. Golden Case, Post-Slice-Snapshot und
direkte/Worker-/Auto-Optimize-Paritaet sind gruen; Slice 03 ist extern freigegeben.

### MC-02 - Jahresanzahl wird als Anteil der Kuerzungsjahre ausgegeben (P0)

**Evidenz:** Der Runner zaehlt Jahre mit `kuerzungProzent >= 10` in
`kpiJahreMitKuerzungDieserLauf`. `recordMonteCarloRunOutcome()` schreibt die
absolute Anzahl in `kpiKuerzungsjahre`. Das Dashboard formatiert deren Median
als Prozent und spricht zugleich von `>10%`.

**Auswirkung:** Ein Lauf mit beispielsweise 12 Kuerzungsjahren kann als 12 %
erscheinen, unabhaengig davon, ob der Lauf 20 oder 60 Jahre dauerte. Zusaetzlich
ist die Schwelleninklusion bei exakt 10 % widerspruechlich.

**Ziel:** Kanonischer Anteil pro Run: erfolgreich abgeschlossene
Dekumulationsjahre mit Kuerzung `>= 10 %` geteilt durch erfolgreich
abgeschlossene Dekumulationsjahre mit endlicher Kuerzungsentscheidung. Nenner
0 wird als `null` samt Missingness-Grund transportiert, niemals als 0 oder NaN.
Exakt 10 Prozent und Ruin vor dem ersten abgeschlossenen Jahr sind Golden Cases.

**Slice:** 03.

**Umsetzungsstand 2026-07-22:** Implementiert. Der kanonische
`cutYearShareRatio` nutzt nur abgeschlossene Dekumulationsjahre, schliesst
exakt 10 Prozent ein und traegt bei Nenner 0 `NO_OBSERVATIONS`; Aggregat und UI
verwenden `cutYearSharePct` mit Stichprobengroesse. Der absolute Legacy-Zaehler
bleibt befristet und explizit deprecated; Slice 03 ist extern freigegeben.

### MC-03 - Pflege-P1-KPIs verwenden teilweise den Haushaltszaehler (P0)

**Evidenz:** `pflegeTriggeredCount` steigt, sobald P1 oder P2 Pflege erlebt.
`monte-carlo-aggregates.js` verwendet diesen Haushaltszaehler fuer
`entryRatePct`. Das UI bezeichnet die Kennzahl als
`Pflegefall-Eintrittsquote P1`. Bei P2-only-Laeufen werden fuer die P1-Listen
zudem Nullwerte eingetragen.

**Auswirkung:** P1-Eintrittsquote, P1-Eintrittsalter und P1-Pflegejahre koennen
durch P2-Ereignisse erhoeht beziehungsweise durch Nullwerte verzerrt werden.

**Ziel:** Getrennte Zaehler und Listen fuer Haushalt, P1 und P2; ein Alter wird
nur bei tatsaechlichem Trigger eingetragen. Nenner und bedingte Population
werden je KPI ausgewiesen. Leere Verteilungen liefern `null`, `sampleSize=0`
und im UI einen Gedankenstrich statt 0 oder NaN.

**Slice:** 04.

**Umsetzungsstand 2026-07-22:** Implementiert. P1 und P2 besitzen getrennte
Eintrittszaehler, bedingte Listen ohne Null-Sentinels sowie nullable P50-Werte
mit Stichprobengroesse und Missingness. Haushaltseintritt bleibt separat; die
externe Freigabe steht aus.

### MC-04 - Pflegekosten- und Delta-Karten ueberzeichnen ihre Semantik (P0)

**Evidenz:** `maxAnnualCareSpendTriggered` speichert das Maximum aus P1- und
P2-Zielbedarf, waehrend das UI von den maximalen Gesamtkosten P1+P2 spricht.
`careDepotCosts` ist lediglich `DepotStart - DepotEnd` und damit nicht kausal
der Pflege zurechenbar. `shortfallDelta_vs_noCare` berechnet
`Median(mit Pflege) - Median(ohne Pflege)`, die UI-Beschreibung behauptet die
umgekehrte Richtung.

**Auswirkung:** Hoehe, Richtung und Zurechenbarkeit sichtbarer Pflege-KPIs
koennen falsch verstanden werden.

**Ziel:** Modellierten Pflege-Zusatzbedarf explizit summieren und als Bedarf,
nicht automatisch als bezahlte Ausgabe, benennen. UI-Betraege werden als reale
Euro zur Simulationsstart-Preisbasis ausgewiesen; nominale Rohwerte tragen im
Export eine explizite Einheit. Nicht-kausale Gruppenvergleiche als solche
markieren. Vorzeichen und Beschreibung muessen reconciliierbar sein.

**Slice:** 04.

**Umsetzungsstand 2026-07-22:** Implementiert. Der Runner misst den tatsaechlich
an die Simulation uebergebenen Zusatzbedarf als Jahressumme P1 plus P2. UI-
Betraege sind real zur Preisbasis des Simulationsstarts; nominale V1-Path-
Felder tragen `NominalEur`. Die falsche Depotkosten-Zurechnung wurde entfernt,
und `ohne Pflege minus mit Pflege` ist als ungepaarter, nicht-kausaler
Gruppenmedianvergleich markiert. Die externe Freigabe steht aus.

### MC-05 - Horizontende ist kein eigener Outcome (P0)

**Evidenz:** Ein Run endet durch Ruin, Tod aller Personen, technischen Fehler
oder Erreichen von `maxDauer`. Nur Ruin und technische Fehler werden explizit
inventarisiert. Ein am Horizont noch lebender Haushalt zaehlt ohne Ruin in die
`Erfolgsquote`.

**Auswirkung:** Ein zu kurzer Horizont kann eine hohe Erfolgsquote erzeugen,
obwohl der Lebenszeitpfad nicht abgeschlossen ist. Die UI zeigt weder die Zahl
zensierter Pfade noch die terminalen Gruende.

**Ziel:** `ruin`, `all_dead`, `horizon_exhausted` und `technical_error` getrennt
inventarisieren. Die Jahreschronologie entscheidet: technischer Fehler
invalidiert, Ruin in einem begonnenen Finanzjahr geht einem spaeteren
Todesstatus desselben Jahres vor, `all_dead` gilt vor der naechsten finanziellen
Verpflichtung ohne vorherigen Ruin und Horizontende nur fuer weiter lebende
Pfade. Die bestehende Quote wird als `Floor-Deckung im gewaehlten Horizont`
bezeichnet; ein Lifetime-Versprechen wird nicht abgeleitet.

**Slice:** 05.

### MC-06 - CAPE-Prioritaet und tatsaechlicher Samplingpfad laufen auseinander (P0)

**Evidenz:** Die UI sagt, CAPE-Sampling habe Vorrang und die Startjahrgewichtung
werde ignoriert. `pickMonteCarloStartYearIndex()` waehlt zwar einen CAPE-nahen
Startindex fuer den Initialzustand. Beim normalen Block- und Regime-Sampling
zieht `sampleNextYearData()` das erste Marktjahr jedoch erneut aus den
separaten FILTER-/RECENCY-/Regime-Samplern. Nur der Stationary-Bootstrap-Pfad
bindet CAPE explizit in seine Blockstarts ein.

**Auswirkung:** Der sichtbare Schalter kann fuer verschiedene Methoden eine
andere oder wesentlich schwaechere Wirkung haben als beschrieben; die
gleichzeitig angeblich ignorierte Gewichtung bleibt im laufenden Sampler aktiv.

**Ziel:** Ein versionierter Samplingvertrag legt fuer jede Methode fest, wie
Jahr 1, Blockneustarts, CAPE, FILTER, RECENCY, Stress und geschaetzte Jahre
zusammenwirken. Fixed- und Stationary-Block beginnen ihren ersten
zusammenhaengenden Block am CAPE-Startrecord, statt Jahr 1 zu isolieren.
Regime-Markov initialisiert dort sein Startregime; IID darf ab Jahr 2
unabhaengig ziehen. Jede Aenderung ist snapshotrelevant und benoetigt
ausdrueckliche Review-Freigabe.

**Slice:** 06.

### MC-07 - Dauer-, Sterbetafel- und Typed-Array-Grenzen sind ungesichert (P0)

**Evidenz:** `mcDauer` wird nur auf `>= 1` validiert. `kpiLebensdauer` und
`alterBeiErschoepfung` sind `Uint8Array`. Die Sterbetafel endet mit sicherem Tod
bei Alter 110; ausserhalb der Tabelle faellt Monte Carlo auf `0.0005` zurueck,
Sweep dagegen auf `1`. Insbesondere eine Ansparphase kann die Mortalitaetspruefung
bis hinter die Tabellengrenze verschieben.

**Auswirkung:** Sehr lange oder inkonsistente Horizonte koennen Zaehler
ueberlaufen, Alter mit dem Sentinel 255 kollidieren lassen und zwischen MC und
Sweep unterschiedliche Mortalitaet erzeugen.

**Ziel:** Kanonische Horizon-/Alter-Validierung gegen Daten- und Buffergrenzen;
kein stiller Fallback ausserhalb der Sterbetafel. Falls laengere Horizonte
zulaessig bleiben, werden Buffer und Sentinel versioniert erweitert.

**Slices:** 05 und 10.

### MC-08 - Keine numerische Unsicherheit der Monte-Carlo-Schaetzer (P1)

**Evidenz:** `mcAnzahl` erlaubt ab einem Lauf. Erfolgs-/Floorquote und
Perzentile werden nur als Punktschaetzer gezeigt. Es gibt weder ein
Konfidenzintervall noch eine sichtbare Warnung bei geringer effektiver Runzahl.

**Auswirkung:** 100 % aus wenigen Runs kann wie eine belastbare Wahrscheinlichkeit
wirken. Modellunsicherheit und reine Monte-Carlo-Stichprobenunsicherheit werden
nicht getrennt.

**Ziel:** Mindestens Wilson-Intervall fuer binaere Floor-Deckung,
`effectiveRuns` und klare Aussagegrenze. Quantil-Stabilitaet wird entweder mit
vorab freigegebenem Verfahren ausgewiesen oder bewusst als offen markiert.

**Slice:** 07.

### MC-09 - Consumption-at-Risk basiert auf einer opaken, laengenverzerrten Stichprobe (P1)

**Evidenz:** Reale Entnahmen werden nur fuer Runs mit `runIdx % 100 === 0`
gesammelt, dort aber fuer jedes Jahr. Das Ergebnis gewichtet dadurch wenige
ausgewaehlte Runs und laengere Lebenspfade staerker. Aggregat und UI zeigen nur
ein P10 ohne Stichprobengroesse oder Definition.

**Auswirkung:** Der Wert kann sich bei gleicher Runzahl durch wenige Pfade stark
verschieben und wird als allgemeiner Worst-Case-Konsum interpretiert.

**Ziel:** Laufbezogener, chunk-mergebarer Vertrag unter dem ehrlichen Namen
`Reale Depotentnahme P10`. Das Bewertungsfenster beginnt mit der ersten
geplanten Dekumulationsverpflichtung einschliesslich eines sofortigen
Ruinversuchs und endet bei Tod oder Horizont; nach Ruin wird es fuer noch
lebende Personen mit realer Depotentnahme 0 aufgefuellt. Technische Fehler und
Tod aller Personen vor jeder Dekumulationsverpflichtung sind nullable mit
Grund. Der Worker uebertraegt nur den
Per-Run-P10 samt Beobachtungszahl, nicht die volle Jahresreihe. Ueber alle
evaluierbaren Runs werden P10/P50 und Stichprobengroesse ausgewiesen.

**Slice:** 07.

### MC-10 - Chunk-Merge-Contract ist in mehreren Consumern dupliziert (P1)

**Evidenz:** `simulator-monte-carlo.js` und `auto-optimize-worker.js` pflegen
Buffer, Totals, Listen, Worst-Runs und technische Inventare mit langen,
manuellen Feldlisten. Neue KPI-Felder muessen in beiden Pfaden synchron
ergaenzt werden.

**Auswirkung:** Ein neues Feld kann im seriellen Pfad korrekt, im UI-Worker
oder Auto-Optimize aber still fehlen. Paritaetstests entdecken nur bereits in
ihre eigene Feldmatrix aufgenommene Keys.

**Ziel:** Ein kanonischer `MonteCarloChunkResultV1`-State mit zentralem
Create-/Merge-/Finalize-Contract und unknown-/missing-field-Negativtests.

**Slice:** 02.

### MC-11 - Kein vollstaendiger reproduzierbarer Laufvertrag oder Raw-Export (P1)

**Evidenz:** Die Ergebnisoberflaeche exportiert nur ausgewaehlte Szenariozeilen
als generisches `scenario-log.json`/`.csv`. Seed, Methode, Samplingparameter,
normalisierte Inputs, Engineversion, Datenhash, terminales Inventar und
Aggregate fehlen als gemeinsames Artefakt. Der Backtest besitzt dagegen einen
versionierten Request-/Result-/Exportvertrag.

**Auswirkung:** Ein sichtbares Ergebnis ist spaeter nicht eindeutig
reproduzierbar oder mit einem zweiten Lauf reconciliierbar.

**Ziel:** `MonteCarloRunRequestV1`, `MonteCarloRunResultV1` und
`MonteCarloExportV1` mit Schema-, Engine-, Daten- und Konfigurationsprovenienz;
Raw-Export strikt getrennt von Displayformatierung.

**Slice:** 08.

### MC-12 - Worker-Fallback besitzt keinen Abbruch- oder Stale-Job-Vertrag (P1)

**Evidenz:** `WorkerJobRunner` plant mehrere Promises, besitzt aber kein
`AbortSignal` und keine Batch-/Generation-ID. Bei Stall oder Job-Rejection
kehrt der Aufrufer zum seriellen Pfad zurueck, ohne alle noch laufenden Jobs
gezielt zu terminieren. Der globale Pool wird fuer spaetere Laeufe wiederverwendet.

**Auswirkung:** Alte Jobs koennen CPU binden, einen neuen Init verzögern oder
bei kuenftigen Aenderungen spaete Ergebnisse in einen falschen Lauf mergen.
Der Nutzer kann einen langen Lauf nicht abbrechen.

**Ziel:** Pro Lauf eindeutige Generation, Abort-/Dispose-Vertrag,
fail-closed Merge nur fuer die aktive Generation und garantierte Terminierung
vor seriellem Fallback.

**Slice:** 09.

### MC-13 - Worker-Cache und Datenversion sind nicht begrenzt oder erzwungen (P1)

**Evidenz:** `mc-worker.js` haelt `scenarioCache` als unbeschraenkte `Map`.
`dataVersion` wird bei `init` gespeichert und zurueckgegeben, aber bei Jobs
nicht gegen einen erwarteten Stand validiert. Ein Cache-Clear geschieht nur
bei `dispose`.

**Auswirkung:** Viele Szenarien koennen Worker-Speicher aufbauen. Ein spaeter
eingefuehrter Datenwechsel haette keinen fail-closed Job-Handshake.

**Ziel:** Begrenzter aktueller Szenariokontext oder dokumentierter LRU,
Version-Mismatch als kontrollierter Fehler und Lifecycle-Tests.

**Slice:** 09.

### MC-14 - Ressourcenparameter haben keine strikten Obergrenzen (P1)

**Evidenz:** Runs, Dauer und klassischer Block erlauben keine Obergrenze.
Workerzahl und Jobbudget werden mit `parseInt` tolerant gelesen und nicht
gedeckelt. Auch Werte mit unerwuenschtem Suffix oder Dezimalteil koennen
teilweise akzeptiert werden.

**Auswirkung:** Unbeabsichtigt sehr grosse Typed Arrays, zu viele Worker,
Browser-Freeze oder still abgeschnittene Eingaben sind moeglich.

**Ziel:** Gemeinsamer strikter Parametervertrag mit sicheren, begruendeten
Grenzen, Kostenschaetzung vor Start und sichtbarer Validierung. Keine stille
Klemmung fachlicher Werte. Der Nutzer verwendet praktisch maximal 100.000 Runs,
weil zwischen 100.000 und 1.000.000 keine messbaren KPI-Unterschiede beobachtet
wurden; zugleich lief 1.000.000 technisch ohne Engpass. Zielvertrag daher:
neuer Default 10.000, Empfehlung bis 100.000, Warnung/Bestaetigung oberhalb
100.000 und harte Grenze 1.000.000. Der lokale Vergleich ist kein allgemeiner
Konvergenznachweis fuer alle Szenarien/Seeds.

**Slice:** 10.

### MC-15 - Kritische UI-/Orchestrierungs- und Abbruchpfade sind kaum getestet (P1)

**Evidenz:** Coverage liegt fuer den UI-Orchestrator bei 3,44 %, fuer
`monte-carlo-ui.js` bei 10,79 %, fuer `worker-job-runner.js` und
`results-renderers.js` bei 0 %. Der Browser-Smoke fuehrt den Backtest aus, aber
keinen Monte-Carlo-Lauf. Der Progressbar aktualisiert nur CSS-Breite und besitzt
keinen vollstaendigen Status-/Abort-Vertrag.

**Auswirkung:** Valider Lauf, technischer Fehler, Worker-Fallback, Abbruch,
erneuter Start, Export und Accessibility koennen im echten Browser brechen,
obwohl Runner-Unit-Tests gruen bleiben.

**Ziel:** Browser-E2E fuer kleinen deterministischen MC-Lauf, Worker-Fallback,
technischen Fehler, Abbruch und Export; `role=progressbar`, `aria-valuenow`,
Live-Status, Fokus und eindeutige Buttonzustaende.

**Slices:** 10 und 11.

### MC-16 - Aktive Dokumentation widerspricht Code und sich selbst (P1)

**Evidenz:** `README.md` bezeichnet Real-CaR noch als faktisch nominal, waehrend
`TECHNICAL.md`, Fachkonzept und Tests den korrigierten kumulierten Realwertvertrag
dokumentieren. Das Fachkonzept beschreibt technische Enginefehler teilweise
noch als fehlgeschlagene finanzielle Laeufe, obwohl der aktuelle MC-Pfad sie
fail-closed als `technical_error` trennt. Historische Sampling-Snippets verwenden
abweichende Methodennamen beziehungsweise Wrap-around-Semantik.

**Auswirkung:** Nutzer und Reviewer koennen alte Mangelbeschreibungen oder
Pseudocode fuer den aktiven Vertrag halten.

**Ziel:** Referenzen, README, Handbuch und Testdoku nach dem finalen Contract
widerspruchsfrei synchronisieren; keine Sollbeschreibung vor Implementierung.

**Slice:** 12.

### MC-17 - Kein gepaarter Ergebnisvergleich im Produkt (P2)

**Evidenz:** `mcCompareMode` vergleicht nur Laufzeiten von serieller und
Worker-Ausfuehrung. README empfiehlt fuer Tail-Risk einen Standardlauf zu
merken und danach manuell zu vergleichen. Ein versionierter Baseline-/Variant-
Diff mit identischen Seeds existiert nicht.

**Auswirkung:** Nutzer koennen bei manuellen Vergleichen versehentlich Inputs,
Seeds oder Datenstand aendern und zufaellige Runvariation als Policyeffekt
interpretieren.

**Ziel:** Zunaechst Run-Export und Provenienz aus Slice 08. Ein interaktiver
paired comparison bleibt ein separates Feature-Arbeitsdokument nach Abschluss
dieses Hardening-Plans.

### MC-18 - Modellkalibrierung und vollstaendige Risikoverteilungen bleiben Forschungsluecken (P2 / extern)

**Evidenz:** Das Fachkonzept und der Forschungsvalidierungs-Backlog fuehren
unter anderem Datenprovenienz, Kosten, Bootstrap-Blockwahl, CAPE-Holdouts,
Tail-Risk-Kalibrierung, Pflege-/Mortalitaetskalibrierung sowie Tiefe und Dauer
von Floor-/Liquiditaetsluecken als offen.

**Auswirkung:** Technisch korrekte und reproduzierbare MC-Ausgaben sind noch
kein Nachweis empirischer Guete oder individueller Eignung.

**Ziel:** Nicht in diesem Hardening-Plan kaschieren. Nach Slice 12 nur durch
separate, vorab reviewte FQ-Arbeitsdokumente mit benannten Fachownern,
Holdouts und Evidenzgates weiterbearbeiten.

### MC-19 - Aggregationsdeterminismus haengt potenziell von Worker- und Chunkgrenzen ab (P1)

**Evidenz:** Per-Run-Seeds werden zwar aus dem globalen Runindex abgeleitet,
`WorkerJobRunner` waehlt Chunkgroessen aber adaptiv und Resultate koennen in
Fertigstellungsreihenfolge eintreffen. Manuelle Append-Listen und
Gleitkommasummen koennen dadurch je nach Workerzahl oder Chunkgrenze eine
andere Reihenfolge erhalten. Die vorhandenen Paritaetstests decken mehrere
Splits ab, definieren aber noch keinen vollstaendigen V1-Determinismusvertrag
oder Snapshot-Metadaten fuer Worker-/Chunkkonfiguration.

**Auswirkung:** Derselbe Seed kann auf 4- und 8-Core-Systemen geringfuegig
abweichende Aggregate, Tie-Breaks oder Snapshot-Diffs liefern. Eine unerklaerte
Abweichung waere von einer beabsichtigten KPI-Semantikaenderung schwer zu
unterscheiden.

**Ziel:** `MonteCarloPathSummaryV1` wird ueber den globalen Runindex in feste
Typed-Array-Slots geschrieben. Finalisierung reduziert Per-Run-Werte in
Runindex-Reihenfolge; nullable Listen werden als Wert-plus-Maske statt in
Completion-Reihenfolge gefuehrt. Innerhalb derselben Runtime sind diskrete und
endliche Floatresultate worker-/chunkunabhaengig exakt. Golden Snapshots
speichern Workerzahl, Chunkpolicy, Runtime und Datenversion; ein
separater Paritaetstest variiert Worker- und Chunkkonfiguration und verlangt
innerhalb derselben Runtime auch fuer endliche Floatwerte exakte Gleichheit.
Nur runtimeuebergreifende Snapshots verwenden vorab festgelegte feldspezifische
Toleranzen.

**Slices:** 01, 02, 11 und 12.

## 6. GAP-zu-Slice-Matrix

| GAP | Prioritaet | Primaerer Slice | Folgegate |
| --- | --- | --- | --- |
| MC-01, MC-02 | P0 | 03 Risiko-KPI-Semantik | 11 Browser-/Regression |
| MC-03, MC-04 | P0 | 04 Pflege-KPI-Semantik | 11 Browser-/Regression |
| MC-05 | P0 | 05 Outcome-/Horizont-Contract | 07, 08, 10 |
| MC-06 | P0 | 06 Sampling-Praezedenz | 08, 11 |
| MC-07 | P0 | 05 und 10 | 11 |
| MC-08, MC-09 | P1 | 07 Schaetzer/Consumption | 08, 11 |
| MC-10 | P1 | 02 Chunk-Result-Contract | alle nachfolgenden Ergebnisfelder |
| MC-11 | P1 | 08 RunResult/Export | 11 |
| MC-12, MC-13 | P1 | 09 Worker-Lifecycle | 10, 11 |
| MC-14 | P1 | 10 Ressourcen/UI | 11 |
| MC-15 | P1 | 10 und 11 | 12 |
| MC-16 | P1 | 12 Integration/Doku | Abschlussreview |
| MC-17 | P2 | separates Folgefeature | Nutzerentscheid |
| MC-18 | P2/extern | Forschungsbacklog | Fachowner/Holdout/Review |
| MC-19 | P1 | 01 und 02 Determinismusvertrag | 11, 12 |

## 7. Bereits vorhandene Staerken, die erhalten bleiben muessen

- Per-Run-Seeding und Full-vs-Split-Paritaet sind breit getestet.
- Stationary Bootstrap, Tail-Risk, Continuous CAPE, Langlebigkeit und
  Pflegekosten-Drift besitzen Runner-/Worker-Paritaetsfaelle.
- Technische Pfadfehler werden aktuell von wirtschaftlichem Ruin getrennt und
  invalidieren die Finanzheadline fail-closed.
- Mindest-Flex wird validiert statt still begrenzt.
- Generierte Artefakte sind nicht Source of Truth.
- Der Browser-Smoke sichert bereits den allgemeinen Simulator-Start und den
  Backtest, jedoch noch nicht den MC-Nutzerworkflow.

Diese Eigenschaften sind Regressionsgates, keine Begruendung, die oben
belegten semantischen Luecken zu tolerieren.

## 8. Entscheidungen der Revision 1 zur erneuten Review

Die frueher offenen Fragen wurden als D-01 bis D-12 im Hardening-Plan
praezisiert. Besonders reviewpflichtig bleiben:

1. terminale Jahreschronologie und `ruin` vor spaeterem Todesflag,
2. nullable Kuerzungsanteile bei Nenner 0,
3. Pflegegeld im UI real zur Simulationsstart-Preisbasis,
4. zusammenhaengender CAPE-Startblock statt isoliertem Jahr 1,
5. `Reale Depotentnahme P10` im festen Dekumulationsfenster mit
   Nullauffuellung nach Ruin,
6. global indexierte Per-Run-Summaries ohne volle Jahrespfaduebertragung,
7. unveraenderliche Pre-Baseline plus Post-Slice-Delta-Ledger,
8. Workerterminierung ohne Serial-Fallback und mit lazy Pool-Replacement.

Konkrete Ressourcenobergrenzen bleiben als D-08 vor Slice 10 zu entscheiden.
Keine dieser Codex-Festlegungen gilt ohne erneutes Gemini-/Claude- und
Nutzerreview als freigegeben.

## 9. Pre-Mortem fuer die Planung

Angenommen, die Umsetzung verursacht in drei Monaten einen Produktfehler: Die
wahrscheinlichste Ursache waere ein unvollstaendig migriertes Per-Run-Feld, das
im seriellen Runner korrekt ist, aber im MC-Worker, Auto-Optimize, Export oder
UI mit altem Nenner, fehlender Missingness-Maske oder completion-order-
abhaengiger Aggregation weiterlebt. Ein zweites realistisches Szenario ist
Worker-Churn durch Cancel/Restart. Deshalb beginnen die Slices mit
unveraenderlicher Baseline und indexiertem Path-Summary-Contract und enden mit
Worker-/Chunk-Paritaet, Browser-Reconciliation und vollstaendigem Doku-Sync.

## 10. Reviewbereiche

### Review-Feedback von Gemini

#### 1. Systematische Prüfdimensionen

* **Korrektheit:** Die Analyse deckt die wichtigsten fachlichen Schwachstellen (MC-01 bis MC-18) sauber ab. Allerdings sind die mathematischen Formeln für Grenzwertberechnungen (z. B. Nenner bei Kürzungsquote, CaR nach Ruin) im Hardening-Plan nicht präzise genug spezifiziert.
* **Vertragstreue:** Der vorgeschlagene Result- und Outcome-Vertrag ist ein richtiger Schritt zur Vereinheitlichung von seriellem Pfad, Worker-Pool und Auto-Optimize. Die Abwärtskompatibilität während der Migration muss streng überwacht werden.
* **Fehlerbehandlung:** Die Identifikation von unbegrenzten Ressourcenparametern (MC-14) und fehlenden Abbruchmöglichkeiten (MC-12) ist korrekt. Technische Fehler (`technical_error`) müssen strikt von fachlichem Misserfolg isoliert bleiben.
* **Seiteneffekte:** Große Änderungen am MC-Worker und am UI-Orchestrator sind nötig. Die Slices minimieren das Risiko durch die Voranstellung von Slice 01 (Baseline/Messvertrag) und Slice 02 (Chunk-Vertrag).
* **Was könnte brechen?** Risikokennzahlen (wie Consumption-at-Risk) verhalten sich bei Pfaden mit frühem Ruin paradox, falls nicht die gesamte Simulationsdauer standardisiert erfasst wird.

#### 2. Nummerierte Findings

* **Finding G-01: Das Ruin-Paradoxon bei der Consumption-at-Risk (CaR) (MC-09 / Slice 07):** Wenn ein Run nach dem Ruin abgebrochen wird und die CaR-Berechnung nur über tatsächlich simulierte Jahre läuft, haben Pfade mit schnellem Ruin bei hohem Konsum ein fälschlicherweise hohes P10 (keine Jahre mit Null-Konsum erfasst). Überlebende Pfade mit kontrollierter Kürzung wirken dadurch riskanter als ruinierte Pfade.
  * *Vorschlag:* Jahre nach dem Ruin bis zum geplanten Horizont (oder Tod) müssen mit Entnahme = 0 (bzw. dem garantierten Minimum/Floor) in die CaR-Zeitreihe eingehen.
* **Finding G-02: Division durch Null bei Kürzungsquote (MC-02 / Slice 03):** Bei einem sofortigen Ruin im ersten Jahr ist die Anzahl der "wirtschaftlich simulierten Entnahmejahre" 0 oder 1. Dies führt zu statistischen Ausreißern oder `NaN`.
  * *Vorschlag:* Mindestdauer für die Nenner-Berechnung festlegen oder Pfade mit Dauer <= 1 Jahr separat im Nenner abfangen.
* **Finding G-03: Zustandspriorisierung bei gleichzeitigem Ruin und Tod (MC-05 / Slice 05):** Stirbt der Haushalt in demselben Jahr, in dem das Depot auf 0 fällt, gibt es einen Konflikt zwischen `ruin` und `all_dead`.
  * *Vorschlag:* `ruin` hat Vorrang vor `all_dead`, da der finanzielle Ruin die Ursache oder das primäre Ereignis des Jahres darstellt.
* **Finding G-04: Block-Sampling-Sprünge bei CAPE-Startjahr (MC-06 / Slice 06):** Der Übergang von einem CAPE-gezogenen Jahr 1 zu einem Block-Sampling ab Jahr 2 bricht die Autokorrelation.
  * *Vorschlag:* Der Plan muss explizit festlegen, ob der Block in Jahr 1 mit dem CAPE-Startjahr beginnt (also Jahr 1-5 zusammenhängen) oder ob Jahr 1 ein isolierter Übergang ist.
* **Finding G-05: CPU-Schleifenblockade bei Worker-Abort (MC-12 / Slice 09):** Da Monte-Carlo-Läufe in engen CPU-Schleifen laufen, reagieren Worker nicht auf `postMessage(abort)`. Ein Abbruch erfordert `worker.terminate()`.
  * *Vorschlag:* Slice 09 muss die Kosten für das Neuerstellen der Worker-Threads bei häufigem Abort explizit berücksichtigen und minimieren (z. B. durch Debouncing von Parameteränderungen im UI).
* **Finding G-06: Leere Verteilungen bei ausbleibenden Pflegefällen (MC-03 / Slice 04):** Bei einer Pflege-Wahrscheinlichkeit von 0 ist das Array der Eintrittsalter leer.
  * *Vorschlag:* Der Aggregator und das UI müssen leere Verteilungen explizit abfangen und im UI als "-" statt `NaN` rendern.

#### 3. Pre-Mortem (3 Monate in die Zukunft)

Die wahrscheinlichste Fehlerursache im Produktivbetrieb ist ein Speicher- und Performance-Leak im Browser, da bei schnellen Schieberegler-Bewegungen im UI massenhaft Worker abgebrochen (`terminate`) und neu instanziiert werden. Dies führt auf schwächeren Endgeräten zu Browser-Abstürzen, während gleichzeitig die CaR-KPIs für Läufe mit frühem Ruin absurde Werte anzeigen, da die Zeitreihe nach dem Ruin nicht standardisiert aufgefüllt wurde.

#### 4. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Ergebnis:** Alle 6 Findings (G-01 bis G-06) wurden durch Codex in Revision 1 über die Vertragsentscheidungen D-02 bis D-06 und D-12 vollständig und fachlich präzise adressiert.

### Review-Feedback von Claude

**Quelle:** Externe Reviewdatei vom 2026-07-19, nach Nutzerhinweis von Codex in
diese Datei uebertragen. Das vollstaendige strukturierte Review steht auch im
Hardening-Plan.

#### 1. Pruefdimensionen

Claude bestaetigt die Codeevidenz der bestehenden GAPs, verlangt aber schaerfere
Vertraege fuer Determinismus, Snapshotfortschreibung, Pfadgranularitaet,
Randfaelle, Einheiten und Worker-Lifecycle. Auto-Optimize, Sweep, Renderer und
Worker-Pool sind als Seiteneffektpfade mitzubehandeln.

#### 2. Nummerierte Findings

- **C-01 (Blocker):** worker-/chunkunabhaengiger Aggregationsdeterminismus fehlt;
  daraus wurde MC-19.
- **C-02 (Verbesserung):** Tranchen-MC-Interaktion muss als konsolidierter
  Gesamtdepotpfad und tranchenspezifische Analyse als Nicht-Scope dokumentiert
  werden.
- **C-03 (Hinweis):** kritische 0-Prozent-Module brauchen ein Coverage-Gate.
- **C-04 (Blocker):** Pre-Hardening-Snapshot und semantische Post-Slice-
  Referenzen brauchen eine Koexistenz-/Updatepolicy.
- **C-05 (Blocker):** Gemini G-01, G-03 und G-05 waren formal ungeloest.
- **C-06 (kein Handlungsbedarf):** Slice-05-zu-07-Abhaengigkeit ist korrekt.
- **C-07 (Blocker):** Per-Run-/Pfadgranularitaet im Chunkresultat war unklar.
- **C-08 (Verbesserung):** Stall-Watchdog und Workerterminierung muessen als
  ein konsistenter Lifecycle beschrieben sein.
- **C-09 (Verbesserung):** Worker-/Chunkkonfiguration fehlt als
  Snapshotmetadatum.
- **C-10 (Verbesserung):** Pflegekosteneinheit nominal/real war unbestimmt.

#### 3. Pre-Mortem

Wahrscheinlichstes Versagen: Endwertsummaries werden korrekt migriert, CaR
bleibt aber versehentlich stichprobenbasiert und laengenverzerrt. Zweites
Versagen: `Handbuch.html` behaelt die alte Erfolgsquotenterminologie.

#### 4. Review-Ergebnis

- **Status:** blockiert.
- **Blocker:** C-01, C-04, C-05, C-07.
- **Verbesserungen:** C-02, C-08, C-09, C-10.
- **Hinweise:** C-03; C-06 ohne Handlungsbedarf.

### Review-Antworten von Codex

Alle Findings wurden angenommen oder mit Codeevidenz praezisiert:

- G-01 bis G-06 sind in D-02 bis D-06/D-12 und den Slices 03 bis 07/09
  konkretisiert.
- C-01 erzeugt MC-19 und den global indexierten Path-Summary-Vertrag.
- C-04 erzeugt `MonteCarloSnapshotPolicyV1`.
- C-07 wird durch O(Runs)-Per-Run-Skalare geloest; vollstaendige Jahrespfade
  und Quantil-Bootstrap-CI bleiben Nicht-Scope.
- C-02/C-03/C-08/C-09/C-10 sind in Nicht-Scope, Coveragegate,
  Worker-Lifecycle, Snapshotmetadaten und Einheitenvertrag eingearbeitet.
- C-06 erforderte keine Aenderung.

Die genaue Antwort je Finding steht im Hardening-Plan. Umsetzung bleibt bis
zur erneuten externen Freigabe gesperrt.

### Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| G-01 bis G-06 | Gemini | Randfall-/Lifecyclevertraege | angenommen | Plan und betroffene Slices revidiert; Re-Review freigegeben |
| C-01 | Claude | Aggregationsdeterminismus | angenommen | MC-19, Slices 01/02/11/12 |
| C-02 | Claude | Tranchen-Scope | angenommen | Nicht-Scope ergaenzt |
| C-03 | Claude | Coverage-Gate | angenommen | Slice 12 verschaerft |
| C-04 | Claude | Snapshotpolicy | angenommen | SnapshotPolicyV1/Delta-Ledger |
| C-05 | Claude | Gemini-Blocker offen | angenommen | D-02/D-06/D-12 konkretisiert |
| C-06 | Claude | Abhaengigkeit korrekt | bestaetigt | keine Aenderung |
| C-07 | Claude | Pfadgranularitaet | angenommen mit Praezisierung | O(Runs)-Per-Run-Summaries |
| C-08 | Claude | Timeoutkonzepte | angenommen | ein JobRunner-Watchdog |
| C-09 | Claude | Snapshotmetadaten | angenommen | Worker/Chunk/Runtime/Datenversion |
| C-10 | Claude | Pflegekosteneinheit | angenommen | UI real, Export explizit |
| U-01 | Nutzer | 1 Mio. Runs standardnah erfolgreich | angenommen | MC-14/D-08; startbarer Stresstest und harte Rungrenze |
| U-02 | Nutzer | 100k praktisch ausreichend; bis 1 Mio. keine messbaren KPI-Deltas | angenommen | Empfehlung 100k, Warnung darueber, harte Grenze 1 Mio. |
| U-03 | Nutzer | neuer MC-Default 10.000 | angenommen | D-08/Slice 10; Umsetzung nach Freigabe |
