# Simulator / Monte Carlo: Hardening-Arbeitsplan

**Stand:** 2026-07-22
**Status:** Alle Slices 01-12 als Release-Commits abgeschlossen und freigegeben
**Autor:** Codex als Implementer und Plan-Autor  
**Feature-Branch:** `codex/simulator-monte-carlo-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend und nur nach Nutzerfreigabe  
**Reviewstand:** Plan und alle Slices 01-12 durch Gemini vollständig freigegeben
**Ausgangsanalyse:** [SIMULATOR_MONTE_CARLO_GAP_ANALYSE.md](./SIMULATOR_MONTE_CARLO_GAP_ANALYSE.md)

## 1. Ziel und Rollenabgrenzung

Dieser Arbeitsplan ueberfuehrt die GAPs MC-01 bis MC-19 in pruefbare,
1-basierte Umsetzungsslices. Ziel ist ein versionierter und erklaerbarer
Monte-Carlo-Vertrag fuer Parameter, Sampling, Endzustaende, KPIs, Workerpfade
und Exporte. Der Plan aendert noch keinen Anwendungscode.

Codex darf den Plan erstellen und spaeter nach Freigabe implementieren, aber
weder Plan noch eigene Implementierung freigeben. Gemini und Claude sollen
Findings adversarial dokumentieren. Erst nach geklaerten Blockern, expliziter
Gemini-Freigabe und Nutzerfreigabe darf Slice 01 beginnen.

## 2. Ausgangslage und Baseline

### 2.1 Git- und Arbeitsbaumstatus bei Planerstellung

- Aktiver Branch: `codex/simulator-monte-carlo-gap-plan`.
- Der Branch wurde fuer dieses Arbeitsdokument lokal angelegt.
- Bereits vor der Planung vorhandene, nicht zu diesem Thema gehoerende
  Aenderungen bleiben unangetastet:
  - geloeschter Pfad `docs/internal/FORSCHUNGSVALIDIERUNGS_BACKLOG.md`,
  - neuer Archivpfad `docs/internal/archive/FORSCHUNGSVALIDIERUNGS_BACKLOG.md`,
  - unversionierte Playwright-Dateien unter `node_modules/`.
- Vor jedem Slice sind Branch und Status erneut zu ermitteln und wortgetreu in
  dessen Diff-Risiko-Block zu uebernehmen.

### 2.2 Testbaseline vom 2026-07-19

- Zehn fokussierte Monte-Carlo-, Worker-, Ergebnis- und UI-Suiten: gruen.
- Browser-Smoke-Test: gruen; er enthaelt derzeit keinen vollstaendigen
  Monte-Carlo-Nutzerlauf.
- Vollstaendiger Coverage-Lauf: `5703/5704`; einzige Abweichung ist ein
  Architektur-Linktest wegen der bereits vorgefundenen Verschiebung des
  Forschungsbacklogs. Vor Coding muss diese Baseline entweder durch den
  Besitzer bereinigt oder als explizit freigegebene Fremdabweichung behandelt
  werden. Neue fachlich rote Tests duerfen nicht daneben bestehen bleiben.
- Aus den erzeugten V8-Daten: 73,85 Prozent Statements (`29132/39446`). Besonders
  gering abgedeckt sind Orchestrierung, Ergebnisrenderer, Szenarioanalyse und
  Worker-Lifecycle.

### 2.3 Nutzerbeleg fuer Grosslast

- Der Nutzer hat am 2026-07-19 einen Lauf mit **1.000.000 Runs** und ansonsten
  normalen Einstellungen ohne wahrgenommenen Engpass abgeschlossen.
- Der Nutzer verwendet praktisch hoechstens **100.000 Runs**, weil zwischen
  100.000 und 1.000.000 Runs keine fuer ihn messbaren KPI-Unterschiede
  festgestellt wurden. Diese Aussage ist ein lokaler Konvergenzbeleg, kein
  allgemeiner statistischer Nachweis fuer alle Szenarien und Seeds.
- Die im Quell-HTML hinterlegten UI-Vorgaben sind derzeit 1.000 Runs, 35 Jahre,
  8 Worker und 500 ms Jobbudget. Der Nutzerbeleg wird daher als
  "1.000.000 Runs bei ansonsten standardnaher Konfiguration" dokumentiert,
  nicht als Behauptung, 1.000.000 sei bereits der HTML-Default.
- Der Nutzer hat anschliessend **10.000 Runs als neuen Produktstandard**
  festgelegt. Der Ist-Wert 1.000 bleibt bis zur freigegebenen Umsetzung in
  Slice 10 bestehen; danach muessen HTML, Eingabevertrag, Persistenzfallback,
  Tests und Dokumentation denselben Default 10.000 verwenden.
- Die in Slice 01 aus `createMonteCarloBuffers()` ausgemessenen Typed Arrays
  beanspruchen **63 Byte pro Run**, also rund 60,1 MiB bei einer Million Runs.
  Der gemessene gesamte Worker-Result-Payload liegt durch JS-Listen, `runMeta`
  und weitere Ergebnisobjekte bei rund **419 Byte pro Run**.
- Der Beleg widerlegt eine harte Grenze unter 100.000 Runs. Die Revision setzt
  100.000 als empfohlenen interaktiven Hoechstwert und 1.000.000 als weiterhin
  zulaessigen, bestaetigungspflichtigen Stresstest. Er ersetzt noch keinen
  reproduzierbaren Benchmark auf schwacher Referenzhardware.

## 3. Verbindliche Zielvertraege

Die Namen sind Arbeitsnamen. Reviewer duerfen Zuschnitt und Versionierung
aendern, muessen aber die Verantwortlichkeiten erhalten.

### 3.1 `MonteCarloParametersV1`

- strikte, gemeinsame Normalisierung fuer UI, direkten Runner, Worker und
  Auto-Optimize,
- endliche Ganzzahlen, erlaubte Enums und sichere Obergrenzen,
- kein stilles Begrenzen fachlicher Werte,
- validierte Abhaengigkeiten zwischen Dauer, Altersbereich, Samplingmethode,
  Blocklaenge, Runzahl und Workerzahl.

### 3.2 `MonteCarloSamplingContractV1`

- eindeutige Praezedenz von CAPE, Filter, Recency, Regime und Tail-Risk,
- dokumentierte Behandlung des gewaehlten Startdatensatzes und des gesamten
  ersten Blocks statt eines isolierten CAPE-Jahres,
- deterministische Seed-Ableitung pro Run unabhaengig von Chunking und
  Workerzahl,
- Diagnostik fuer tatsaechlich gezogene Jahre, Regime und Startquellen.

### 3.3 `MonteCarloChunkResultV1`

- eine kanonische Erzeugungs-, Merge- und Finalisierungslogik,
- ein `MonteCarloPathSummaryV1` in Struct-of-Arrays-Form, dessen Eintraege ueber
  `globalRunIndex = start + localIndex` fest zugeordnet werden,
- pro Run mindestens Outcome-Code, Endwert, Volatilitaet, Drawdown,
  Kuerzungszaehler/-nenner, CaR-Skalar samt Beobachtungszahl und die fuer
  Pflegeaggregate erforderlichen nullable Werte,
- keine Uebertragung vollstaendiger Jahrespfade; der Runner berechnet
  runbezogene Skalare im Worker und uebertraegt nur O(Runs)-Summaries,
- explizite Buffer-, Counter-, Missingness- und Diagnostikfelder,
- Form-/Laengenpruefung beim Merge,
- identischer Vertrag fuer direkten Lauf, Worker und Auto-Optimize,
- Finalisierung in globaler Runreihenfolge. Gleitkommaaggregate werden aus den
  indexierten Per-Run-Werten gebildet, nicht in Worker-Fertigstellungsreihenfolge.

### 3.4 `MonteCarloOutcomeInventoryV1`

Jeder Run endet genau einmal in einem dieser Zustaende:

- `ruin`,
- `all_dead`,
- `horizon_exhausted`,
- `technical_error`.

Die Summe entspricht der angeforderten Runzahl. `technical_error` wird niemals
als fachlicher Erfolg verrechnet. Bestehende Erfolgsanzeigen werden bis zur
Review-Entscheidung als "Floor-Deckung im gewaehlten Horizont" behandelt.

Terminale Prioritaet folgt der Jahreschronologie:

1. Ein technischer Fehler macht den Run nicht fachlich auswertbar.
2. Ein bereits im begonnenen Finanzjahr festgestellter Ruin bleibt `ruin`, auch
   wenn danach fuer dasselbe Jahr ein Todesstatus gemeldet wird.
3. `all_dead` gilt nur, wenn alle Personen vor der naechsten finanziellen
   Jahresverpflichtung verstorben sind und zuvor kein Ruin eingetreten ist.
4. Nur weiterhin lebende, weder ruinierte noch technisch fehlerhafte Runs am
   letzten Planjahr werden `horizon_exhausted`.

Widerspruechliche Terminalflags ausserhalb dieser Chronologie sind ein
Contractfehler und werden `technical_error`, nicht per stiller Prioritaet
repariert.

### 3.5 `MonteCarloRunRequestV1`, `MonteCarloRunResultV1` und
`MonteCarloExportV1`

- Request: normalisierte Eingaben, Seed, Methoden, Szenario- und Datenversion,
- Result: Outcome-Inventar, KPIs, Unsicherheitsangaben, Diagnostik und Warnungen,
- Export: Schema-/App-/Engine-Version, UTC-Zeit, Datenfingerprints,
  reproduzierbarer Request und vollstaendiges Resultat,
- keine personenbezogenen Finanzdaten oder lokale Pfade ausserhalb der bereits
  vom Nutzer eingegebenen Szenariodaten.

### 3.6 `MonteCarloSnapshotPolicyV1`

- Slice 01 erzeugt einen unveraenderlichen `pre-hardening-v1`-Snapshot mit
  fester Workerzahl, fester Chunkstrategie, Seed, Datenversion, Runtimeversion
  und numerischer Toleranz als Metadaten.
- Semantikaendernde Slices 03 bis 07 ueberschreiben diesen Snapshot nie. Jeder
  Slice erzeugt einen eigenen versionierten Post-Slice-Referenzstand und ein
  Delta-Ledger mit erwarteten Formelaenderungen.
- Slice 12 erzeugt erst nach Integration den Kandidaten `monte-carlo-v1-final`.
  Alte und neue Referenzen koexistieren bis zur externen Abschlussfreigabe.
- Unerklaerte Deltas blockieren; erklaerte Deltas werden nicht pauschal als
  Snapshot-Update akzeptiert, sondern gegen Golden Cases nachgerechnet.

### 3.7 Missingness- und Einheitenvertrag

- Nicht beobachtbare Kennzahlen werden intern als nullable Wert plus
  Missingness-Grund gefuehrt, im JSON als `null` exportiert und im UI als
  Gedankenstrich dargestellt. `0` bedeutet immer einen beobachteten Nullwert.
- Bedingte Verteilungen weisen `sampleSize` und ausgeschlossene Runs aus.
- Pflegegeldbetraege werden im UI kanonisch in realen Euro der
  Simulationsstart-Preisbasis gezeigt. Nominale Rohwerte duerfen zusaetzlich
  versioniert exportiert werden, muessen aber im Feldnamen `NominalEur` tragen.

## 4. Vertragsentscheidungen der Revision 1 zur erneuten Review

| ID | Festlegung von Codex nach Review | Betroffene Findings | Status |
|---|---|---|---|
| D-01 | Heutige Erfolgsquote wird "Floor-Deckung im gewaehlten Horizont"; bei fehlerfreiem Batch ist der Nenner `requestedRuns` und der Zaehler `all_dead + horizon_exhausted`. Sobald mindestens ein `technical_error` vorliegt, werden Quote und Intervall fuer den Gesamtbatch fail-closed als `null` unterdrueckt; das Outcome-Inventar bleibt sichtbar. | G-03 | entschieden; in Slice 01 fixiert |
| D-02 | Vier Outcomes und Jahreschronologie/Prioritaet aus Abschnitt 3.4; Ruin eines begonnenen Finanzjahrs geht spaeterem Todesflag vor. | G-03, C-05 | entschieden; in Slice 01 fixiert |
| D-03 | Pro Run: Zaehler = erfolgreich abgeschlossene Dekumulationsjahre mit Kuerzung `>= 10 %`; Nenner = erfolgreich abgeschlossene Dekumulationsjahre mit endlicher Kuerzungsentscheidung. Nenner 0 ergibt `null`, nie 0 oder NaN. | G-02 | in Slice 03 implementiert und freigegeben |
| D-04 | P1/P2 getrennt; leere bedingte Verteilungen sind `null` plus `sampleSize=0`; Pflegebetrag im UI real zur Startpreisbasis, nominal nur explizit benannt im Export. | G-06, C-10 | entschieden; in Slice 01 fixiert |
| D-05 | Fixed-/Stationary-Block starten ihren ersten zusammenhaengenden Block am CAPE-Startrecord. Regime-Markov initialisiert dort sein Startregime; IID darf ab Jahr 2 unabhaengig ziehen. Jede Methode exportiert die tatsaechliche Praezedenz. | G-04 | entschieden; in Slice 01 fixiert |
| D-06 | UI-KPI wird ehrlich in "Reale Depotentnahme P10" umbenannt. Das Bewertungsfenster beginnt mit der ersten geplanten Dekumulationsverpflichtung und endet bei Tod aller Personen oder Horizont; ein Ruinversuch zaehlt als Beginn. Nach Ruin und solange jemand lebt wird mit realer Depotentnahme 0 aufgefuellt. Technische Fehler und Haushalte, die vor jeder Dekumulationsverpflichtung sterben, sind `null` mit Grund. Ueber Runs werden P10/P50 und `sampleSize` ausgewiesen. | G-01, C-05, C-07 | in Slice 07 implementiert und freigegeben |
| D-07 | V1-Felder sind kanonisch. Befristete Read-Aliase tragen Deprecation-Telemetrie und werden spaetestens in Slice 11 entfernt; Slice 12 weist ihre Abwesenheit nach. | Gemini Vertragstreue | entschieden; in Slice 01 fixiert |
| D-08 | Runvertrag: neuer Default 10.000; bis 100.000 ohne Grosslastbestaetigung; ueber 100.000 Warnung mit Run-Jahren/Speicherschaetzung und expliziter Bestaetigung; harte Grenze 1.000.000. Standardbenchmark `100.000 x 35 Jahre`, Stresstest `1.000.000 x 35 Jahre`, jeweils 8 Worker/500 ms. Dauer, Blocklaenge, Worker und Budget erhalten weiterhin daten-/hardwarebasierte Grenzen in Slice 01. Keine stille Klemmung. | Nutzerbeleg U-01/U-02/U-03, MC-14 | entschieden; Messvertrag in Slice 01 fixiert |
| D-09 | Paired Compare bleibt separates Folgefeature nach stabilem V1-Export. | MC-17 | entschieden; in Slice 01 fixiert |
| D-10 | Per-Run-Summaries werden global indexiert; Finalisierung reduziert in Runindex-Reihenfolge. Innerhalb derselben JS-Runtime muessen Worker-/Chunkvarianten auch endliche Float-Per-Run-Werte und daraus abgeleitete Aggregate exakt liefern. Nur Snapshots ueber dokumentiert unterschiedliche Runtimeversionen duerfen feldspezifische, vorab quantifizierte Toleranzen verwenden. | C-01, C-07, C-09 | entschieden; in Slice 01 fixiert |
| D-11 | Snapshotpolicy aus Abschnitt 3.6; Pre-Hardening-Referenz wird niemals ueberschrieben. | C-04 | entschieden; in Slice 01 fixiert |
| D-12 | `WorkerJobRunner` wird erweitert, nicht ersetzt. User-Cancel terminiert aktive Worker, erzeugt keinen Serial-Fallback und baut den Singleton-Pool erst beim naechsten expliziten Start lazy neu auf. Parameterwechsel starten keinen Lauf automatisch; Start/Cancel sind single-flight. | G-05, C-08 | entschieden; in Slice 01 fixiert |

Eine Review darf Alternativen beschliessen. Die Entscheidung muss dann in
dieser Tabelle und in den betroffenen Slices dokumentiert werden; stillschweigende
Semantikaenderungen sind unzulaessig.

## 5. Umsetzungsslices und Abhaengigkeiten

| Slice | Inhalt | GAPs | Abhaengigkeit | Status |
|---|---|---|---|---|
| [01](./SLICE_SIMULATOR_MONTE_CARLO_01_BASELINE_MESSVERTRAG.md) | Baseline, Entscheidungen und Messvertrag | querschnittlich; Golden Cases fuer MC-01 bis MC-19 | Reviewfreigabe des Plans | abgeschlossen und freigegeben |
| [02](./SLICE_SIMULATOR_MONTE_CARLO_02_CHUNK_RESULT_CONTRACT.md) | zentraler Chunk-/Path-Summary-Vertrag | MC-10, MC-19 | 01, D-10, D-11 | abgeschlossen und freigegeben |
| [03](./SLICE_SIMULATOR_MONTE_CARLO_03_RISIKO_KPI_SEMANTIK.md) | Volatilitaet und Kuerzungsanteil | MC-01, MC-02 | 02, D-03 | abgeschlossen und freigegeben |
| [04](./SLICE_SIMULATOR_MONTE_CARLO_04_PFLEGE_KPI_SEMANTIK.md) | Pflegeeintritt, -dauer und -kosten | MC-03, MC-04 | 02, D-04 | abgeschlossen und freigegeben |
| [05](./SLICE_SIMULATOR_MONTE_CARLO_05_OUTCOME_HORIZONT_CONTRACT.md) | terminale Outcomes, Horizont, Alter | MC-05, MC-07 | 02, D-01, D-02 | abgeschlossen und freigegeben |
| [06](./SLICE_SIMULATOR_MONTE_CARLO_06_SAMPLING_PRAEZEDENZ_DIAGNOSTIK.md) | Samplingvertrag und Ziehungsdiagnostik | MC-06 | 02, D-05 | abgeschlossen und freigegeben |
| [07](./SLICE_SIMULATOR_MONTE_CARLO_07_SCHAETZER_UNSICHERHEIT_CAR.md) | Konfidenz und reale Depotentnahme P10 | MC-08, MC-09 | 03, 05, D-06 | abgeschlossen und freigegeben |
| [08](./SLICE_SIMULATOR_MONTE_CARLO_08_RUNRESULT_EXPORT_PROVENIENZ.md) | versionierter Run-/Exportvertrag | MC-11 | 04-07 | abgeschlossen und freigegeben |
| [09](./SLICE_SIMULATOR_MONTE_CARLO_09_WORKER_LIFECYCLE_ISOLATION.md) | Abbruch, Stale Jobs, Cache/Version | MC-12, MC-13 | 02, D-12 | abgeschlossen und freigegeben |
| [10](./SLICE_SIMULATOR_MONTE_CARLO_10_RESOURCE_UI_ACCESSIBILITY.md) | Bounds, Kostenhinweis, UI/A11y | MC-14, Teile MC-15 | 05, 08, 09, D-08 | abgeschlossen und freigegeben |
| [11](./SLICE_SIMULATOR_MONTE_CARLO_11_BROWSER_E2E_REGRESSION.md) | Browser-E2E und Pfadparitaet | MC-15 | 03-10 | abgeschlossen und freigegeben |
| [12](./SLICE_SIMULATOR_MONTE_CARLO_12_INTEGRATION_DOKUMENTATION.md) | Integration, Doku- und Volltestgate | MC-16; Abschluss aller | 01-11 | abgeschlossen und freigegeben |

### Rueckdokumentation Slice 09

- `runMonteCarlo()` verwaltet genau eine aktive Generation mit den Zustaenden
  `running` und `cancelling`; doppelte Starts liefern dasselbe Promise, doppelte
  Cancelaktionen dieselbe Canceloperation. Parameteraenderungen starten keinen
  Lauf.
- User-Cancel markiert die Generation als abgebrochen, weist Queue und aktive
  Jobs kontrolliert ab und terminiert die daran arbeitenden Worker. Er startet
  keinen seriellen Fallback. Gesunde Slots bleiben erhalten; terminierte Slots
  werden erst beim naechsten expliziten Start lazy ersetzt.
- `WorkerJobRunner` bleibt die einzige adaptive Stall-/Timeoutquelle. Ein
  Worker-Stall oder -Fehler beendet zuerst die Generation; der MC-Aufrufer
  entscheidet danach genau einmal ueber seriellen Fallback oder sichtbaren
  Fehler. Spaete Resultate und Progressmeldungen alter Generationen werden
  ignoriert.
- Der Worker-Szenariocache ist auf acht Eintraege begrenzt. `dataVersion`
  benoetigt `annualDataHash` und `regimeHash`; Versionswechsel leeren den Cache,
  und ein Job mit unpassender Version wird fail-closed abgewiesen.
- Neue direkte Lifecycle-Tests decken Cancel vor Start, CPU-blockierte Worker,
  Cancel waehrend Batch, spaete Antworten, Lazy Replacement, Rejection, Stall
  und mehrfaches Dispose ab. Die fokussierten Suiten sowie der komplette
  Browser-Smoke sind gruen. `npm test` liefert 6793/6794 gruene Assertions und
  0 offene Handles; einzig das bereits vor Slice 09 dokumentierte
  Architektur-Linkgate bleibt rot. Aus den trotzdem erzeugten V8-Daten erreicht
  `worker-job-runner.js` 67,74 Prozent approximative Zeilen-Coverage.

### Rueckdokumentation Slice 10

- Implementierungsstatus: abgeschlossen, extern freigegeben und als
  Release-Commit `3431ce9` vorhanden.
- `MonteCarloParametersV1` ist der gemeinsame strikte Eingangsvertrag fuer UI,
  direkten Runner, Worker und Auto-Optimize. Ganze Zahlen, Enums, Booleans,
  Mortalitaetshorizont, Blocklaenge, Seed, Worker und Jobbudget werden ohne
  Teilparsing oder stilles Klemmen validiert.
- Der sichtbare und zentrale Default ist 10.000 Runs. 100.000 Runs bleiben
  bestaetigungsfrei; 100.001 bis 1.000.000 Runs zeigen Run-Jahre und eine auf
  gemessenen 419 Result-Bytes pro Run basierende Speicherklasse und benoetigen
  vor jedem Start eine neue Bestaetigung. Auto-Worker sind auf 32 begrenzt.
- Start, Cancel und `cancelling` bleiben single-flight. Fortschrittsbalken,
  Live-Status, Fehler, Abschlussfokus und Exportstatus besitzen explizite
  Rollen/ARIA-Werte; Parameteraenderungen aktualisieren nur die Schaetzung und
  starten keinen Lauf.
- Die Slice-spezifischen Parameter-, DOM-, Persistenz-, Worker-,
  Auto-Optimize-, Runner-, Paritaets-, Lifecycle-, Export- und Browser-Gates
  sind gruen. Der abschliessende Vollsuitenlauf innerhalb von
  `npm run test:coverage` liefert 6858/6859 gruene Assertions und 0 offene
  Handles; einzig das bereits vor Slice 10 dokumentierte Architektur-Linkgate
  bleibt rot. `npm run test:browser` liefert 14/14 gruene Szenarien.

### Rueckdokumentation Slice 11

- Implementierungsstatus: abgeschlossen, extern freigegeben und als
  Release-Commit `4cd9eeb` vorhanden.
- Das bestehende Chromium-Gate enthaelt jetzt vier isolierte MC-Nutzerflows:
  echten Worker-Erfolg, kontrollierten seriellen Fallback, fail-closed
  Technikfehler sowie Cancel/Restart mit bewusst spaeter Altantwort. Tastatur,
  zentrale ARIA-Zustaende, Fokus, sichtbare Outcome-/KPI-/Unsicherheitslabels
  und der explizite JSON-Download werden beobachtbar geprueft.
- Der Download wird als `MonteCarloExportV1` samt Fingerprint, Worker-/
  Chunkmetadaten und Samplingdiagnostik validiert. Neue V1-Exporte enthalten
  keinen der befristeten KPI-Aliase; das Aliasregister ist leer, der Reader
  telemetriert entfernte Keys nicht mehr, und der Ergebnis-UI-Fallback auf
  `consumptionAtRiskP10Real` ist entfernt.
- Die bestehende DOM-freie Messmatrix belegt weiterhin exakte direkte/
  Workerparitaet fuer 1/2/4 Worker und mehrere Chunklayouts innerhalb derselben
  Runtime. Zusammen mit Lifecycle, MC-Kern, Export und UI sind 1.409/1.409
  fokussierte Assertions gruen.
- `npm run test:browser` liefert 15/15 gruene Flows in 29,2 Sekunden. Der
  Neustartfall erzeugt genau einen lazy Ersatz-Worker und ignoriert genau eine
  spaete Antwort der terminierten Altgeneration.
- `npm test` und der Coverage-Lauf liefern 6.862/6.863 gruene Assertions bei 0
  offenen Handles. Einzige Abweichung bleibt das vorbestehende fremde
  Architektur-Linkgate mit sechs toten Links auf zwei fehlende
  Forschungsdokumente.
- Die approximative Node-Zeilencoverage steigt von 76,05 auf 76,12 Prozent.
  Playwright-Pfade fliessen nicht in diese Zahl ein; deshalb bleiben
  `simulator-monte-carlo.js` bei 3,39 Prozent und `results-renderers.js` bei 0
  Prozent Node-Coverage. Das beschlossene 50-Prozent-Abschlussgate und die
  Integrationsbereinigung interner Pflege-Metadaten-Aliase verbleiben in
  Slice 12.

### Rueckdokumentation Slice 12

- Implementierungsstatus: durch Codex abgeschlossen; externes Abschlussreview
  und Nutzerentscheidung stehen aus. Codex erteilt keine eigene Freigabe und
  erstellt keinen Commit.
- `monte-carlo-v1-final.json` ist als separater, noch nicht extern
  freigegebener Kandidat mit vollstaendiger Snapshot-Lineage vorhanden. Die
  Policy referenziert ihn als `finalCandidate`; `pre-hardening-v1` und alle
  Post-Slice-Snapshots bleiben unveraendert getrennt. Das Delta-Ledger
  dokumentiert den Integrationsschritt.
- Der Messvertrag vergleicht den Kandidaten exakt und inventarisiert die
  produktiven V1-Reader. Er weist nach, dass die befristeten Legacy-KPI-Aliase
  weder im leeren Aliasregister noch in den produktiven Consumern verbleiben.
- Ein neuer DOM-freier Renderer-Vertrag deckt Outcome, KPIs, Wilson-Intervall,
  reale Depotentnahme P10, Pflege, Samplingdiagnostik, Missingness und
  technische Fehler ab. Das obligatorische Coverage-Dateigate erreicht fuer
  `worker-job-runner.js` 67,74 Prozent und fuer `results-renderers.js`
  100,00 Prozent approximative Coverage aus ausfuehrbaren V8-Zeilenbereichen.
- Handbuch, README, Fachkonzept und technische Referenzen verwenden nun
  konsistente Begriffe fuer Floor-Deckung, terminale Outcomes, Sampling,
  Pflege, Unsicherheit, Export und Ressourcengrenzen. Die lokalen Links auf
  archivierte Forschungsdokumente sind korrigiert; das Evidenzgate ist gruen.
- Die finale GAP-Matrix dokumentiert Ergebnis, Nachweis und Restrisiko fuer
  MC-01 bis MC-19. MC-17 bleibt ein separates P2-Feature; MC-18 bleibt das
  ausdruecklich offene externe Forschungs-/Modellvalidierungsgate.
- Abschlussgates: 1.245/1.245 fokussierte Assertions, `npm test` mit
  7.300/7.300 Assertions und 0 offenen Handles, `npm run test:browser` mit
  15/15 Flows sowie `npm run test:coverage` mit 76,46 Prozent
  (32.625/42.668 in 206 Dateien). Keine unerwartete Snapshot-, Backtest- oder
  FlowDelta-Abweichung wurde gemeldet.

Zulaessige Parallelisierung nach Slice 02:

- 03, 04, 05 und 06 duerfen getrennt bearbeitet werden, sofern jeder Slice
  einzeln gruen beendet, reviewt und lokal committet wurde.
- 09 darf parallel zu den fachlichen KPI-Slices bearbeitet werden.
- 07, 08, 10, 11 und 12 folgen den Tabellenabhaengigkeiten.
- Es gibt keinen dauerhaften Red-State zwischen Slices.

## 6. Slice-Grenzen

### 6.1 Produktive Dateien

Jeder Slice bleibt unter der Stop-Grenze von maximal zehn produktiven Programm-
oder Konfigurationsdateien. Dokumentation und Tests werden mitgezaehlt und
dokumentiert, fallen aber nicht unter diese produktive Dateigrenze. Sobald ein
Slice die geplante produktive Dateiliste ueberschreiten wuerde, stoppt Codex vor
dem Edit und legt eine Aufteilung zur Review vor.

### 6.2 Nicht-Scope fuer den gesamten Plan

- keine Aenderung der Engine-Semantik oder der oeffentlichen `EngineAPI`,
- keine manuelle Aenderung von `engine.js`, `dist/` oder `RuheStandSuite.exe`,
- keine empirische Freigabe von Kapitalmarkt-, Pflege- oder Mortalitaetsmodellen,
- keine Policy-Empfehlung fuer reale Haushalte,
- keine tranchenspezifische Monte-Carlo-Ruinanalyse: Tranchen werden bei der
  Szenariokompilation in das Gesamtdepot konsolidiert; dieser Plan prueft den
  danach entstehenden Gesamtdepotpfad,
- kein neues Paired-Compare-Feature,
- keine Behebung fremder Arbeitsbaum-Aenderungen ohne gesonderten Auftrag.

Wenn sich waehrend der Umsetzung zeigt, dass die Engine-Semantik geaendert
werden muss, greift die Stop-Regel. Der Plan ist dann vor Coding zu erweitern
und erneut reviewen zu lassen.

## 7. Uebergreifende Akzeptanzkriterien

Der Themenbereich gilt erst nach Slice 12 als technisch abgeschlossen, wenn:

1. jeder angeforderte Run genau einem terminalen Outcome zugeordnet ist;
2. Volatilitaet, Drawdown, Kuerzungsanteil und Pflege-KPIs per Golden Case
   fachlich nachgerechnet und UI-seitig identisch benannt sind;
3. CAPE-/Filter-/Recency-/Regime-/Tail-Risk-Praezedenz dokumentiert, getestet
   und aus einem Run diagnostizierbar ist;
4. gleiche Request-/Seed-Daten in direktem, Worker- und Auto-Optimize-Pfad bei
   mindestens zwei Workerzahlen und drei Chunkaufteilungen innerhalb derselben
   Runtime einschliesslich endlicher Floatwerte exakt uebereinstimmen;
5. binaere Floor-Deckung ihre Stichprobengroesse und Wilson-Unsicherheit
   ausweist; Quantile zeigen Stichprobengroesse/Missingness ohne ein nicht
   belegtes Konfidenzversprechen;
6. Lauf und Export ueber versionierte, validierte V1-Vertraege reproduzierbar
   beschrieben sind;
7. Abbruch, Worker-Stall, Fehler und veraltete Antworten keine spaeten UI- oder
   Cache-Seiteneffekte erzeugen;
8. ungueltige oder unvertretbar teure Parameter vor Start verstaendlich
   abgewiesen werden, ohne fachliche Werte still zu begrenzen;
9. ein echter Browser-Monte-Carlo-Lauf Erfolgs-, Fehler-, Fallback-, Abbruch-
   und Exportpfad abdeckt;
10. `npm test`, fokussierte MC-Suiten und `npm run test:browser` gruen sind,
    die Gesamtcoverage nicht sinkt und `worker-job-runner.js` sowie
    `results-renderers.js` jeweils mindestens 50 Prozent Statement-Coverage
    erreichen;
11. README, Handbuch, Fachkonzept, technische Referenz und Modulreferenz denselben
    Vertrag beschreiben;
12. Gemini und Nutzer jeden Slice nach dokumentiertem adversarialem Review
    freigegeben haben.

## 8. Test- und Nachweisstrategie

### 8.1 Pro Slice

- zuerst fachliche Golden Cases beziehungsweise Contracttests,
- fokussierter Lauf mit `node tests/run-single.mjs <testdatei>`,
- alle direkt betroffenen bestehenden Suiten,
- direkte/Worker-Paritaet, sobald Result- oder Samplingfelder betroffen sind,
- bei semantischen Slices ein versionierter Post-Slice-Snapshot samt
  Delta-Ledger gemaess `MonteCarloSnapshotPolicyV1`,
- keine erwarteten roten Tests ueber das Ende eines Slice hinaus.

### 8.2 Integrationsgate

- `npm test`,
- `npm run test:browser`,
- `npm run test:coverage` und dokumentierter Vergleich zur Baseline,
- Coverage-Mindestgate von 50 Prozent Statements fuer
  `worker-job-runner.js` und `results-renderers.js`,
- bei unerwarteten Snapshot-/Backtest-/FlowDelta-Abweichungen sofortiger Stop,
- `npm run build:engine` nur wenn eine separat freigegebene Engine-Aenderung
  notwendig wird; diese ist im vorliegenden Plan nicht vorgesehen.

## 9. Daten-, Datenschutz- und Reproduzierbarkeitsgrenzen

- Exporte enthalten nur die fuer Reproduktion erforderlichen Szenariodaten.
- Keine lokalen Pfade, Secrets, Tokens, Logs oder fremde Finanzexporte.
- Hashes/Fingerprints muessen stabil definiert und kollisionsbedingte Risiken
  dokumentiert werden; ein Hash ist kein kryptografischer Herkunftsnachweis.
- Forschungsfragen zu Datenprovenienz, Holdouts und Modellkalibrierung bleiben
  getrennte Freigabegates. Technisches Hardening darf nicht als empirische
  Validierung dargestellt werden.

## 10. Stop-, Rollback-, Commit- und Push-Regeln

- Es gelten `AGENTS.md` und `SLICE_EXECUTION_RULES.md` vollstaendig.
- Vor jedem Slice: Branch, Status, exakte Dateiliste, Aenderungstiefe,
  gefaehrdete Tests, Nicht-anfassen-Liste und konkrete Rollback-Dateien.
- Stop bei mehr als zehn produktiven Dateien, unklarem Contract, erforderlicher
  Engine-Semantikaenderung, nicht ersetzbarer Testbarkeit, unerwarteten
  Snapshots/Backtests/FlowDelta oder UI-/Engine-Parameternamenskonflikt.
- Rollback betrifft ausschliesslich die Dateien des aktiven Slice; keine harten
  Resets oder destruktiven Befehle ohne ausdrueckliche Freigabe.
- Codex erstellt keine Commits. Nach positivem Gemini- und Nutzerreview prueft
  Gemini den Status gegen den Slice-Scope und erstellt den lokalen Commit.
- Push beziehungsweise Remote-Branch nur nach ausdruecklicher Nutzerfreigabe.

## 11. Plan-Pre-Mortem

Angenommen, die Umsetzung verursacht in drei Monaten einen Produktivfehler:
Die wahrscheinlichste Ursache ist eine nur teilweise migrierte Per-Run-
Semantik: Endwert- und Outcome-Summaries sind korrekt indexiert, CaR oder
Pflege-Missingness bleibt aber in einem Consumer stichproben- oder
completion-order-abhaengig. Parallel koennte ein Cancel-/Restart-Pfad den
Singleton-Pool wiederholt terminieren und neu erzeugen. Dagegen stehen der
zentrale Path-Summary-Vertrag, globale Runindexfinalisierung, Consumer-
Inventar, single-flight Worker-Lifecycle, Snapshot-Delta-Ledger und E2E-
Paritaet. Das groesste Restrisiko bleibt eine fachlich plausible, aber
empirisch unzureichend validierte Modellannahme; sie wird durch diesen
technischen Plan nicht geloest.

## 12. Auftrag an Gemini und Claude

Bitte insbesondere pruefen:

- ob die Befunde MC-01 bis MC-19 reproduzierbar und vollstaendig sind,
- ob D-01 bis D-12 fachlich eindeutig entschieden werden koennen,
- ob die V1-Vertraege vorhandene Consumers und Migrationspfade abdecken,
- ob Slice-Grenzen und DAG Seiteneffekte oder einen verdeckten Red-State
  erzeugen,
- ob Stop-Regeln und Akzeptanzkriterien ausreichend hart sind,
- welches realistische Versagensszenario trotz dieses Plans uebrig bleibt.

Das Review muss die Pflichtstruktur aus `SLICE_EXECUTION_RULES.md` enthalten.

## Review-Feedback von Gemini

### 1. Systematische Prüfdimensionen

* **Korrektheit:** Die vorgeschlagene Kürzungsjahre-Definition und die Ausgliederung von `all_dead` korrigieren wesentliche Anzeigefehler. Die Slices decken die identifizierten GAPs strukturell ab. Allerdings fehlen mathematische Spezifikationen für Randfälle.
* **Vertragstreue:** Der Entwurf führt mit `MonteCarloChunkResultV1` und `MonteCarloOutcomeInventoryV1` notwendige Verträge ein. Übergangsphasen (Read-Aliase für Abwärtskompatibilität) müssen zeitlich streng begrenzt und in Phase 11/12 vollständig entfernt werden.
* **Fehlerbehandlung:** Der Worker-Lifecycle (Slice 09) und die Ressourcenparameter (Slice 10) verbessern die Stabilität. Unklar bleibt die konkrete technische Handhabung eines synchron blockierten Workers bei einem Abort.
* **Seiteneffekte:** `auto-optimize-worker.js` und `results-renderers.js` sind stark betroffen. Der Plan isoliert diese Seiteneffekte gut durch den gemeinsamen Chunk-Contract (Slice 02).
* **Was könnte brechen?** Die mathematischen Definitionen von Risikokennzahlen (CaR) bei vorzeitigem Ruin weisen logische Schwachstellen auf.

### 2. Nummerierte Findings

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

### 3. Pre-Mortem (3 Monate in die Zukunft)

Die wahrscheinlichste Fehlerursache im Produktivbetrieb ist ein Speicher- und Performance-Leak im Browser, da bei schnellen Schieberegler-Bewegungen im UI massenhaft Worker abgebrochen (`terminate`) und neu instanziiert werden. Dies führt auf schwächeren Endgeräten zu Browser-Abstürzen, während gleichzeitig die CaR-KPIs für Läufe mit frühem Ruin absurde Werte anzeigen, da die Zeitreihe nach dem Ruin nicht standardisiert aufgefüllt wurde.

### 4. Review-Ergebnis
- **Status:** blockiert
- **Blocker:**
  1. Definition der CaR-Zeitreihe bei vorzeitigem Ruin (Finding G-01).
  2. Festlegung der Zustandspriorisierung bei gleichzeitigem Ruin und Tod (Finding G-03).
  3. Abbrechen blockierter Worker via `terminate()` und dessen Performance-Implikationen (Finding G-05).
- **Restrisiken:**
  1. Statistische Volatilitätsartefakte am Übergang von CAPE-Startjahr zu Block-Sampling (Finding G-04).
  2. UI-Robustheit bei Divisionen durch Null (Finding G-02, G-06).

## Review-Feedback von Claude

**Quelle:** Vom Nutzer am 2026-07-19 als externe Reviewdatei uebergeben und von
Codex in die Pflichtstruktur dieser Datei uebertragen. Der folgende Inhalt ist
eine strukturtreue Verdichtung; die Finding-IDs und Schweregrade bleiben
unveraendert.

### 1. Systematische Pruefdimensionen

- **Korrektheit:** MC-01, MC-10, MC-12/13 und MC-15 wurden im Code bestaetigt.
  Randfaelle und Snapshotfortschreibung waren noch nicht ausreichend bestimmt.
- **Vertragstreue:** Die V1-Vertraege passen grundsaetzlich zur Architektur;
  Pfadgranularitaet, Abwaertskompatibilitaet und Worker-/Chunkdeterminismus
  mussten konkretisiert werden.
- **Fehlerbehandlung:** Ruin, Nullnenner, Worker-Stall, technische Fehler und
  Typed-Array-Grenzen sind relevant. Gemini G-01, G-03 und G-05 waren im
  Erstentwurf formal offen.
- **Seiteneffekte:** Auto-Optimize, Sweep, Worker-Pool, Snapshots und Renderer
  sind als zweite Consumer beziehungsweise Regressionspfade betroffen.
- **Was koennte brechen:** Workeranzahl und adaptive Chunkgrenzen koennten
  Aggregatreihenfolgen veraendern; CaR benoetigt eine explizite
  Per-Run-Datenentscheidung; semantische Slices koennten eine alte Baseline
  unkontrolliert ueberschreiben.

### 2. Nummerierte Findings

- **C-01 (Blocker): Aggregationsdeterminismus bei variabler
  Worker-Konfiguration.** Per-Run-Seeds sind stabil, aber adaptive Chunks und
  Fertigstellungsreihenfolge koennen Gleitkommaaggregation oder Listenordnung
  beeinflussen. Snapshotmetadaten und ein worker-/chunkunabhaengiger
  Mergevertrag fehlen.
- **C-02 (Verbesserung): Tranchen-MC-Interaktion nicht abgegrenzt.** Tranchen
  werden vor MC in der Szenariokompilation konsolidiert; tranchenspezifische
  Ruinanalyse muss explizit Nicht-Scope sein.
- **C-03 (Hinweis): Kein Coverage-Mindestziel.** Fuer die bisher mit 0 Prozent
  erfassten Module `worker-job-runner.js` und `results-renderers.js` soll ein
  Mindestgate gelten.
- **C-04 (Blocker): Zirkulaere Snapshotabhaengigkeit.** Eine
  Pre-Hardening-Baseline wird durch die Semantikaenderungen in 03 bis 05
  absichtlich ungueltig; eine Update-/Koexistenzpolicy fehlte.
- **C-05 (Blocker): Gemini G-01/G-03/G-05 formal ungeloest.** CaR nach Ruin und
  Ruin-/Tod-Prioritaet muessen entschieden werden. G-05 kann nach Nachweis von
  fehlendem `SharedArrayBuffer`, vorhandenem Worker-Replacement und
  UI-Churn-Schutz als Verbesserung behandelt werden.
- **C-06 (kein Handlungsbedarf):** Die Abhaengigkeit Slice 05 zu 07 ist bereits
  korrekt modelliert.
- **C-07 (Blocker): Pfadgranularitaet im Chunkvertrag unklar.** Der Plan muss
  entscheiden, welche Per-Run-Daten der Worker fuer CaR und Unsicherheit
  liefert und wie Speicherdruck vermieden wird.
- **C-08 (Verbesserung): Timeoutkonzepte nicht abgeglichen.** Es muss klar sein,
  ob `WorkerJobRunner` erweitert oder ersetzt wird und wie Stall-Watchdog und
  Workerterminierung zusammenarbeiten.
- **C-09 (Verbesserung): Worker-/Chunkkonfiguration fehlt im Snapshot.** Die
  Golden-Case-Konfiguration muss Snapshotmetadatum sein.
- **C-10 (Verbesserung): Pflegekosteneinheit fehlt.** Nominal- und Realwerte
  muessen ueber D-04 und Feldnamen getrennt werden.

### 3. Pre-Mortem

Wahrscheinlichstes Versagensszenario ist eine nur teilweise geloeste
Pfadgranularitaet: Endwertquantile werden korrekt aus Per-Run-Buffern gebildet,
CaR verbleibt aber versehentlich auf einer Stichprobe und behaelt den Length
Bias. Zweites Szenario ist ein veraltetes `Handbuch.html`, das weiterhin die
alte Erfolgsquotenterminologie verwendet.

### 4. Review-Ergebnis

- **Status:** blockiert.
- **Blocker:** C-01, C-04, C-05, C-07.
- **Verbesserungen vor Implementierung:** C-02, C-08, C-09, C-10.
- **Hinweise:** C-03; C-06 bestaetigt die vorhandene Abhaengigkeit.
- **Restrisiken:** unterschaetzte Quantilunsicherheit bei abhaengigen Pfaden,
  Float-Nichtdeterminismus, Speicherdruck durch Pfaddaten, Auto-Optimize als
  zweiter Consumer und Worker-Churn bei schnellem Neustart.

### Re-Review von Gemini (Revision 1)

#### 1. Bewertung der Überarbeitungen
* **G-01 (CaR / Ruin-Paradoxon):** Mit D-06 vollständig gelöst. Das Auffüllen mit `0` für lebende Jahre nach Ruin verhindert die systematische Überschätzung von Entnahmekapazitäten. Die Umbenennung in "Reale Depotentnahme P10" schafft fachliche Klarheit.
* **G-02 (Division durch 0 bei Kürzungsquote):** Mit D-03 gelöst. Nenner `0` wird explizit als `null` mit Grund gehandhabt.
* **G-03 (Zustandspriorisierung Ruin/Tod):** Mit D-02 gelöst. Jahreschronologische Priorisierung (Ruin im begonnenen Finanzjahr vor späterem Tod) ist eindeutig definiert.
* **G-04 (Block-Sampling / CAPE):** Mit D-05 gelöst. Verankerung des 1. Blocks am CAPE-Startrecord verhindert Autokorrelationsbrüche.
* **G-05 (Worker-Abort):** Mit D-12 gelöst. `worker.terminate()` bei Abort in Kombination mit Single-Flight-Handling minimiert Performance- und Schleifenrisiken.
* **G-06 (Leere Pflegeverteilungen):** Mit D-04 gelöst. Sauberes Nullable-Handling mit `sampleSize=0`.

#### 2. Re-Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  1. Leichter Speicherdruck bei 1 Mio. Runs durch per-Run Skalar-Summaries (mit D-08 und Hardware-Limits abgefangen).
  2. Floating-Point-Abweichungen zwischen unterschiedlichen JS-Runtimes (mit D-10 abgedeckt).
- **Pre-Mortem (3 Monate in die Zukunft):** Wahrscheinlichste Ursache für verbleibende Probleme wäre eine schleichende Regression im UI-Renderer bei der Formatierung von Nullable-Keys aus älteren Profilen. Dies wird durch Slice 10 & 11 (Browser-E2E & A11y) minimiert.

## Review-Antworten von Codex

### Antworten auf Gemini

- **G-01 angenommen:** D-06 standardisiert die reale Depotentnahmeserie bis Tod
  oder Horizont und fuellt lebende Jahre nach Ruin mit 0. Der KPI wird von
  "Consumption" in "Reale Depotentnahme P10" umbenannt. Technische/missing
  Pfade bleiben nullable.
- **G-02 angenommen:** D-03 definiert Zaehler und Nenner. Nenner 0 wird `null`
  mit Grund; beobachtete 0 bleibt ein gueltiger Wert.
- **G-03 angenommen mit Chronologiepraezisierung:** Ruin eines begonnenen
  Finanzjahrs bleibt Ruin; Tod vor der naechsten Finanzpflicht ist `all_dead`.
  Widerspruechliche Adapterflags werden `technical_error`.
- **G-04 angenommen:** Fixed-/Stationary-Block starten ihren ersten
  zusammenhaengenden Block am CAPE-Record; Regimeverfahren erhalten eine
  explizite Initialisierungsregel.
- **G-05 angenommen:** CPU-blockierte Worker werden bei User-Cancel terminiert.
  Kein serieller Fallback, kein `SharedArrayBuffer`, lazy Pool-Replacement und
  single-flight UI verhindern Terminate-/Recreate-Schleifen.
- **G-06 angenommen:** Leere Pflegeverteilungen werden `null` mit
  `sampleSize=0`; UI zeigt einen Gedankenstrich.

### Antworten auf Claude

- **C-01 angenommen:** Neuer GAP MC-19, global indexierte Path-Summaries,
  Finalisierung in Runindex-Reihenfolge und eine Worker-/Chunk-Paritaetsmatrix.
- **C-02 angenommen:** Tranchenspezifische MC-Ruinanalyse ist nun explizit
  Nicht-Scope; MC arbeitet auf dem kompilierten Gesamtdepot.
- **C-03 angenommen:** Slice 12 fordert mindestens 50 Prozent
  Statement-Coverage fuer beide bisher ungetesteten kritischen Module und
  Nichtregression der Gesamtcoverage.
- **C-04 angenommen:** `MonteCarloSnapshotPolicyV1` trennt unveraenderliche
  Pre-Baseline, Post-Slice-Referenzen/Delta-Ledger und finalen V1-Kandidaten.
- **C-05 angenommen:** Die drei Gemini-Punkte sind ueber D-02, D-06 und D-12
  formal konkretisiert; die Herabstufung von G-05 bleibt der Re-Review
  vorbehalten.
- **C-06 bestaetigt:** Keine Planaenderung erforderlich.
- **C-07 angenommen mit Architekturpraezisierung:** Das vorhandene Design
  uebertraegt bereits Per-Run-Endwertbuffer. V1 ergaenzt indexierte Per-Run-
  Skalare fuer CaR/Missingness; volle Jahrespfade sind nicht erforderlich.
  Ein Bootstrap-CI fuer Quantile ist ausdruecklich Nicht-Scope.
- **C-08 angenommen:** `WorkerJobRunner` wird erweitert und bleibt einzige
  Job-Level-Stallquelle; der Pool stellt Termination/Replacement bereit.
- **C-09 angenommen:** Workerzahl, Chunkpolicy, Runtime und Datenversion werden
  Snapshotmetadaten.
- **C-10 angenommen:** Pflegekarten zeigen reale Euro zur Startpreisbasis;
  nominale Exportwerte werden explizit benannt.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-01 | Gemini | Ruin-Paradoxon bei CaR | angenommen | D-06/Slice 07 revidiert; Re-Review freigegeben |
| G-02 | Gemini | Division durch Null bei Kuerzungsquote | angenommen | D-03/Slice 03 revidiert; Re-Review freigegeben |
| G-03 | Gemini | Zustandspriorisierung Ruin/Tod | angenommen | D-02/Slice 05 revidiert; Re-Review freigegeben |
| G-04 | Gemini | Block-Sampling-Spruenge | angenommen | D-05/Slice 06 revidiert; Re-Review freigegeben |
| G-05 | Gemini | CPU-Schleifenblockade bei Abort | angenommen | D-12/Slices 09-11 revidiert; Re-Review freigegeben |
| G-06 | Gemini | Leere Verteilungen bei Pflege-Quote 0 | angenommen | D-04/Slice 04 revidiert; Re-Review freigegeben |
| C-01 | Claude | Worker-/Chunkdeterminismus | angenommen | MC-19, D-10, Slices 01/02/11/12 |
| C-02 | Claude | Tranchen-Scope fehlt | angenommen | Nicht-Scope ergaenzt |
| C-03 | Claude | Coverage-Mindestziel fehlt | angenommen | 50-Prozent-Gate in Slice 12 |
| C-04 | Claude | Snapshotpolicy fehlt | angenommen | SnapshotPolicyV1 und Delta-Ledger |
| C-05 | Claude | Gemini-Blocker offen | angenommen | D-02, D-06, D-12 konkretisiert |
| C-06 | Claude | Abhaengigkeit 05 zu 07 korrekt | bestaetigt | keine Aenderung |
| C-07 | Claude | Pfadgranularitaet unklar | angenommen mit Praezisierung | indexierte Per-Run-Skalare, keine Jahrespfade |
| C-08 | Claude | Timeoutkonzepte unklar | angenommen | JobRunner erweitert; eine Stallquelle |
| C-09 | Claude | Snapshotmetadaten fehlen | angenommen | Worker-/Chunk-/Runtime-Metadaten |
| C-10 | Claude | Pflegekosteneinheit fehlt | angenommen | UI real; Export explizit nominal/real |
| U-01 | Nutzer | 1 Mio. Runs standardnah ohne Engpass ausgefuehrt | angenommen | D-08: 1 Mio. als startbarer Stresstest und harte Rungrenze |
| U-02 | Nutzer | Ab 100k bis 1 Mio. keine messbaren KPI-Unterschiede; praktisch max. 100k | angenommen | 100k empfohlen, Warnung darueber, harte Grenze 1 Mio. |
| U-03 | Nutzer | MC-Standard auf 10.000 Runs setzen | angenommen | D-08/Slice 10; Codeaenderung erst nach Re-Review |

## 13. Freigabestatus

- Planreview Gemini: freigegeben (Re-Review Revision 1 bestanden).
- Planreview Claude: Erstreview blockiert; Revision 1 wartet auf Re-Review.
- Nutzerfreigabe: erteilt am 2026-07-22.
- Status `implementierungsreif`: erteilt (für Gemini-Freigabepfad & Nutzer).
- Implementierungsstand: Slices 01-11 abgeschlossen, extern freigegeben und
  als Release-Commits vorhanden; Slice 12 auf Nutzerauftrag vom 2026-07-22
  durch Codex implementiert und im Abschlussreview.

## 14. Rueckdokumentation Slice 01

- Implementierungsstatus: abgeschlossen und extern freigegeben.
- D-01 bis D-12 sind in `golden-cases-v1.json` als entschiedene Zielvertraege
  fixiert. Golden Cases decken Risiko, Kuerzungsanteil, getrennte P1-/P2-Pflege,
  vier terminale Outcomes und Sampling-Praezedenz ab.
- `pre-hardening-v1.json` ist die unveraenderliche Ist-Referenz mit Seed,
  Datenversion, Runtime, fester 4-Worker-/4-Chunk-Konfiguration und vorab
  festgelegten Runtime-Toleranzen. Die Policy verbietet ihr Ueberschreiben.
- Der neue Contracttest vergleicht direkten Runner und echte Worker-Threads
  sowie 1-/2-/4-Worker-Aufteilungen bei drei Chunklayouts exakt und prueft alle
  endlichen Per-Run-Floats und abgeleiteten Aggregate.
- Reproduzierbare Messprofile, Consumer-Inventar und Delta-Ledger liegen unter
  `tests/fixtures/monte-carlo-measurement/`.
- Lastmessung auf Node v25.2.1, Windows x64, 16 logischen CPUs:
  - Standard `100.000 x 35`, 8 Worker: 27,934 s, Peak-RSS 896,4 MiB;
  - Stress `1.000.000 x 35`, 8 Worker: 233,089 s, Peak-RSS 1,759 GiB;
  - schwache Referenz `100.000 x 35`, 2 Worker: 87,057 s, Peak-RSS 449,4 MiB;
  - Abbruchreaktion in allen drei Profilen unter 13 ms, keine technischen
    Fehler, Typed Arrays 63 Byte/Run, gesamter Payload rund 419 Byte/Run.
- Die drei Konvergenzfaelle zeigen kleine, aber messbare Deltas. Die groesste
  absolute Wahrscheinlichkeitsabweichung betraegt 0,0612 Prozentpunkte; damit
  bleibt der Nutzerbefund lokal plausibel, wird aber nicht verallgemeinert.
- Slice-Test: 785/785 Assertions gruen. Sieben betroffene Bestandssuiten:
  681/681 Assertions gruen. `npm test` erreicht 6488/6489 Assertions und
  reproduziert als einzige Abweichung den bereits dokumentierten fremden
  Architektur-Linkfehler mit sechs toten Links auf zwei fehlende
  Forschungsdokumente; diese Dateien blieben ausserhalb des Slice-Scope
  unangetastet.

## 15. Rueckdokumentation Slice 02

- Implementierungsstatus: abgeschlossen und extern freigegeben.
- `MonteCarloChunkResultV1` registriert Legacy-Buffer, Integercounter,
  Floataggregate, bedingte Listen, Diagnostik und eine global indexierte
  `MonteCarloPathSummaryV1` samt Missingness-Codes.
- `runMonteCarloChunk()` ist der gemeinsame Producer fuer Direktlauf und
  Workerantwort. UI-Orchestrierung, Auto-Optimize und dessen serieller Fallback
  finalisieren ueber denselben DOM-freien Akkumulator; manuelle produktive
  Mergefeldlisten wurden entfernt.
- Floataggregate werden aus per-Run-Beitraegen in globaler Runreihenfolge
  reduziert. Diagnostik, Listen, `runMeta` und Worst-Run-Tie-Breaks sind von
  Completion-Reihenfolge und Chunkgrenzen unabhaengig.
- Der Zusatzvertrag belegt 108 Typed-Array-Byte pro Run und uebertraegt keine
  Jahrespfade. Auto-Optimize verwirft `runMeta`; vollstaendige Chunkobjekte
  werden nach dem Merge nicht festgehalten.
- Der neue Contracttest ist mit 25/25 Assertions gruen. Die auf den zentralen
  Vertrag migrierte Slice-01-Messmatrix bleibt mit 785/785 Assertions fuer
  Direktlauf sowie echte 1-/2-/4-Worker- und drei Chunklayouts exakt gruen.
- Betroffene Bestandssuiten sind gruen: MC-Runner 140/140, Worker-Contract
  34/34, Worker-Paritaet 369/369 und Auto-Optimize 7/7.
- `npm test` erreicht 6516/6517 Assertions. Einzige Abweichung bleibt der
  dokumentierte fremde Architektur-Linkfehler; keine neue Snapshot-,
  Backtest- oder FlowDelta-Abweichung.

## 16. Rueckdokumentation Slice 03

- Implementierungsstatus: abgeschlossen und extern freigegeben.
- `buffers.volatilities` und `pathSummaries.volatilityPct` enthalten jetzt
  `volPct`; `maxDDpct` bleibt ausschliesslich in den Drawdown-Feldern. Die
  Formel ist die Stichproben-Standardabweichung N-1 der jaehrlichen
  Portfolio-Renditen ohne weiteren Annualisierungsfaktor.
- Der kanonische Kuerzungsvertrag speichert pro Run Zaehler, Nenner und
  `cutYearShareRatio`. Ansparjahre sind ausgeschlossen, exakt 10 Prozent ist
  enthalten, und Nenner 0 traegt `NO_OBSERVATIONS`. Das aggregierte
  `cutYearSharePct` weist `p50`, `sampleSize`, `excludedRuns`, Schwelle sowie
  Zaehler-/Nennerbeschreibung aus.
- `kpiKuerzungsjahre` bleibt als explizit deprecated Legacy-Jahreszaehler bis
  maximal Slice 11 erhalten; das UI liest ausschliesslich den neuen Anteil.
- `post-slice-03-v1.json` koexistiert mit der unveraenderten
  `pre-hardening-v1.json`. Zwei Delta-Ledger-Eintraege trennen die erwartete
  Volatilitaets- und Kuerzungssemantikaenderung. Ratio- und Missingness-Buffer
  erhoehen den registrierten Speicherbedarf von 63 auf 68 Byte pro Run.
- Fokussierte Suiten: 1126/1126 Assertions gruen, darunter echter
  Worker-Entrypoint, 1-/2-/4-Worker-Messmatrix, Worker-Paritaet und
  Auto-Optimize.
- `npm test`: 6266/6267 Assertions gruen. Einzige Abweichung bleibt der bereits
  dokumentierte fremde Architektur-Linkfehler mit sechs toten Links; alle
  uebrigen 120 Testdateien sind gruen. Keine neue Snapshot-, Backtest- oder
  FlowDelta-Abweichung.

## 17. Rueckdokumentation Slice 04

- Implementierungsstatus: abgeschlossen und extern freigegeben.
- `extraKPI.pflege.p1` und `.p2` besitzen getrennte Eintrittszaehler und
  Nenner. Eintrittsalter, Pflegejahre und reale Mehrbedarfe sind auf den
  tatsaechlichen Personeneintritt bedingt; Nicht-Eintritte erzeugen keine
  Null-Sentinels. Leere Verteilungen sind `null` mit `sampleSize=0` und
  `no_observations`.
- `extraKPI.pflege.household` aggregiert den modellierten P1-plus-P2-
  Zusatzbedarf real zur Preisbasis des Simulationsstarts. Nominale V1-Path-
  Felder tragen `NominalEur`; die nicht herleitbare Depotkosten-Zurechnung wurde
  entfernt.
- `extraKPI.pflege.comparison.endWealthNoCareMinusCareRealEur` hat das zum
  Namen passende Vorzeichen und ist als ungepaarter, nicht-kausaler
  Gruppenmedianvergleich dokumentiert.
- Szenarioanalyse und UI trennen P1/P2, bewahren beobachtete 0 und zeigen leere
  bedingte Werte als Gedankenstrich. Die Trennung des fruehesten Eintritts
  erweitert das Angebot auf bis zu 31 Szenarien.
- `post-slice-04-v1.json` koexistiert mit den bisherigen Referenzen. Drei
  Delta-Ledger-Eintraege dokumentieren Personen-, Pflegebedarfs-/Einheiten- und
  Vorzeichensemantik. Der zusaetzliche Path-Summary-/Missingness-Speicher steigt
  von 108 auf 171 Byte pro Run.
- Fokussierte Suiten: 1254/1254 Assertions gruen, darunter fuenf
  Pflege-Golden-Cases, Chunk-/Messvertrag, MC-Runner, UI-Metriken,
  Szenarioanalyse, echte Worker-Vertraege und Worker-Paritaet.
- `npm test`: 6371/6372 Assertions gruen. Einzige Abweichung bleibt der bereits
  dokumentierte fremde Architektur-Linkfehler mit sechs toten Links; alle
  uebrigen 121 Testdateien sind gruen. Keine neue Snapshot-, Backtest-, Worker-
  oder FlowDelta-Abweichung.

## 18. Rueckdokumentation Slice 05

- Implementierungsstatus: abgeschlossen und extern freigegeben.
- `MonteCarloOutcomeInventoryV1` zaehlt jeden angeforderten Run genau einmal
  als `ruin`, `all_dead`, `horizon_exhausted` oder `technical_error`. Der
  Chunkvertrag gleicht diese Codes gegen die finanziellen Outcome-Zaehler,
  `failCount` und die technische Missingness ab.
- Die terminale Zustandsmaschine bildet die beschlossene Jahreschronologie ab:
  technischer Fehler invalidiert, Ruin im begonnenen Finanzjahr bleibt vor
  spaeterem Tod Ruin, Tod vor der naechsten Verpflichtung ist `all_dead`, und
  nur lebende Restpfade werden am letzten Planjahr `horizon_exhausted`.
  Widerspruechliche Adapterflags liefern den stabilen Contractfehler
  `MC_TERMINAL_FLAGS_CONFLICT`.
- Die Headline heisst nun „Floor-Deckung im gewaehlten Horizont“. Ihr Zaehler
  ist `all_dead + horizon_exhausted`, ihr Nenner `requestedRuns`. Sobald ein
  technischer Fehler vorliegt, ist die Quote `null`; das Outcome-Inventar
  bleibt in Ergebnisdaten und sichtbarer Fehlerdiagnose erhalten.
- `kpiLebensdauer` und `alterBeiErschoepfung` verwenden `Uint32`. Das
  Erschoepfungsalter besitzt eine separate Missingness statt des 255-Sentinels.
  Horizon plus Startalter wird vor dem Lauf gegen den Zaehlerbereich validiert
  und nie still geklemmt.
- Monte Carlo, der Life-Event-Helfer und Sweep verwenden ausserhalb der
  Mortalitaetstabelle identisch die fail-closed Todeswahrscheinlichkeit 1;
  Alter 110 und Tod im letzten Planjahr sind als Golden Cases belegt.
- `post-slice-05-v1.json` koexistiert mit allen frueheren Referenzen. Zwei
  Delta-Ledger-Eintraege dokumentieren Outcome-/Headline-Semantik und
  Buffer-/Mortalitaetsgrenzen. Der registrierte Bufferbedarf steigt planmaessig
  von 68 auf 75 Byte pro Run.
- Fokussierte Outcome-, Runner-, Chunk-, Results-, Mess-, Care-, Sweep-, echte
  Worker- und Worker-Paritaetssuiten: 1479/1479 Assertions gruen.
- `npm test`: 6494/6495 Assertions gruen. Einzige Abweichung bleibt der bereits
  dokumentierte fremde Architektur-Linkfehler mit sechs toten Links; alle
  uebrigen 122 Testdateien sind gruen. Keine neue Snapshot-, Backtest-, Worker-
  oder FlowDelta-Abweichung.

## 19. Rueckdokumentation Slice 06

- Implementierungsstatus: abgeschlossen und als Nutzer-Release-Commit
  `922bbbe` vorhanden.
- `MonteCarloSamplingContractV1` exportiert die feste Praezedenz
  Estimated-History-Ausschluss, CAPE oder Startjahrgewichtung, Samplingmethode,
  bedingter Stress-Override und Tail-Risk-Overlay. Wirksames CAPE setzt
  FILTER/RECENCY ausser Kraft; ignorierte Optionen und CAPE-Fallbacks bleiben
  explizit sichtbar.
- Der gezogene Startrecord ist nun das erste tatsaechliche Marktjahr. Fixed
  setzt dort einen vollstaendigen sequenziellen Block fort, Stationary zieht
  erst vor dem Folgejahr eine Restart-Entscheidung, Markov initialisiert dort
  sein Regime und IID zieht erst ab Jahr 2 unabhaengig. Der letzte noch
  vollstaendige Fixed-Blockstart ist zulaessig.
- `MonteCarloSamplingDiagnosticsV1` enthaelt Samplingvertrag, Datenfingerprints,
  Run-/Jahreszahlen sowie Startjahr-, historische Jahres-, Quellen-, Regime-,
  Stationary- und Tail-Risk-Zaehler. Chunk- und Workermerge validieren Vertrag
  und Datenversion und summieren unabhaengig von Fertigstellungsreihenfolge.
- `post-slice-06-v1.json` koexistiert mit allen frueheren Referenzen. Zwei
  Delta-Ledger-Eintraege dokumentieren die erwartete Pfadaenderung und die neue
  Diagnostik. Der registrierte Bufferbedarf bleibt bei 75 Byte pro Run.
- Fokussierte Sampling-, Runner-, Chunk-, UI-, Mess-, Worker- und
  Worker-Paritaetssuiten: 1515/1515 Assertions gruen. Drei historische
  Backtestsuiten: 588/588 Assertions gruen.
- `npm test`: 6550/6551 Assertions gruen. Einzige Abweichung bleibt der bereits
  dokumentierte fremde Architektur-Linkfehler mit sechs toten Links; keine
  neue unerwartete Snapshot-, Backtest-, Worker- oder FlowDelta-Abweichung.

## 20. Rueckdokumentation Slice 07

- Implementierungsstatus: abgeschlossen und als Nutzer-Release-Commit
  `5f38952` vorhanden.
- Die Floor-Deckung verwendet bei fehlerfreiem Batch
  `successes = all_dead + horizon_exhausted` und `trials = requestedRuns`.
  Fuer `p = successes / trials`, `z = 1,959963984540054` berechnet das
  Wilson-Intervall
  `(p + z^2/(2n) +/- z*sqrt(p*(1-p)/n + z^2/(4n^2))) / (1 + z^2/n)`.
  Ein technischer Run setzt Punktschaetzer und Intervall fuer den Batch auf
  `null`; unter 1.000 Runs wird sichtbar vor hoher Stichprobenunsicherheit
  gewarnt. Das Intervall beschreibt Simulationsfehler, nicht Modellrisiko.
- `realWithdrawalP10` aggregiert gleichgewichtet genau einen realen
  Depotentnahme-P10-Skalar pro evaluierbarem Run. Das Runfenster reicht von der
  ersten Dekumulationsverpflichtung bis Tod aller Personen oder Horizont. Ein
  unmittelbarer Ruinversuch und spaetere Verpflichtungen bei noch lebendem
  Haushalt werden mit 0 erfasst. Tod vor der ersten Verpflichtung und
  technische Fehler haben getrennte Missingness-Codes.
- Haupt- und Stresspfad transportieren P10, Beobachtungszahl und Missingness in
  global indexierten Typed Arrays. Der Bufferbedarf steigt von 75 auf 93 Byte
  je Run; die volle Jahresreihe und die `runIdx % 100`-Stichprobe entfallen.
  Das Aggregat weist P10, P50, `sampleSize` und Missingness aus, aber bewusst
  kein Quantil-Konfidenzintervall.
- `post-slice-07-v1.json`, Golden Case `GC-CAR-01` und zwei
  Delta-Ledger-Eintraege dokumentieren das beabsichtigte Wilson-/CaR-Delta.
- Fokussierte Statistik-, Outcome-/Horizont-, Chunk-, Results-, Runner-,
  Worker-, Auto-Optimize-, Real-Withdrawal-, Pflege- und Messvertragssuiten:
  1438/1438 Assertions gruen.
- `npm test`: 6630/6631 Assertions gruen. Einzige Abweichung bleibt der bereits
  vor Slice 07 dokumentierte fremde Architektur-Linkfehler mit sechs toten
  Links auf zwei fehlende Forschungsdokumente; alle uebrigen 124 Testdateien
  sind gruen. Keine neue Snapshot-, Backtest-, Worker- oder
  FlowDelta-Abweichung.

## 21. Rueckdokumentation Slice 08

- Implementierungsstatus: abgeschlossen; Gemini-/Nutzerreview des Slice steht
  aus. Codex erteilt keine eigene Freigabe und erstellt keinen Commit.
- `MonteCarloRunRequestV1` serialisiert normalisierte Parameter und Eingaben,
  Seed, Sampling-/Stressmethode, CAPE-/Startjahrkontext, Szenario- und
  Datenfingerprint sowie die angeforderte Worker-/Chunkkonfiguration.
- `MonteCarloRunResultV1` serialisiert Outcome-Inventar, KPIs, explizit real
  beziehungsweise nominal benannte Geldfelder, Stichprobengroessen,
  Missingness, Unsicherheit, Warnungen, technische Fehler und die tatsaechliche
  Sampling-/Ausfuehrungsdiagnostik. Nicht endliche Werte und lokale Pfade
  werden fail-closed abgewiesen beziehungsweise redigiert.
- `MonteCarloExportV1` verbindet Request und Result mit Schema-, App-, Engine-,
  Snapshot- und Konfigurationsprovenienz. Der kanonische SHA-256-Fingerprint
  ist zeitstempelunabhaengig und wird beim Lesen verifiziert. Unbekannte
  Zusatzfelder werden nur nach erfolgreicher V1-Pflichtfeldvalidierung
  akzeptiert und als Forward-Compatibility-Telemetrie inventarisiert.
- Befristete Legacy-Read-Aliase sind deprecated und telemetriert; der V1-Writer
  schreibt sie nicht. Ein deterministischer Replay-Contracttest prueft exakte
  diskrete und aggregierte Paritaet innerhalb derselben JavaScript-Runtime.
- Der vollstaendige JSON-Export wird nach jedem abgeschlossenen MC-Batch
  bereitgestellt, auch bei technischen Pfadfehlern. Der Browser erzeugt Blob
  und Object-URL erst nach explizitem Klick auf den neuen Downloadbutton und
  gibt die URL danach frei. Der bestehende Export einzelner Szenariozeilen
  bleibt getrennt.
- Fokussierte Schema-, Replay-, Datenschutz-, Simulator-, UI-, Chunk-,
  Sampling-, Result-, Worker- und Paritaetssuiten: 852/852 Assertions gruen.
- `npm test`: 6734/6735 Assertions gruen. Einzige Abweichung bleibt der bereits
  vor Slice 08 dokumentierte fremde Architektur-Linkfehler mit sechs toten
  Links auf zwei fehlende Forschungsdokumente; alle uebrigen 125 Testdateien
  sind gruen. Keine neue Snapshot-, Backtest-, Worker- oder
  FlowDelta-Abweichung.
