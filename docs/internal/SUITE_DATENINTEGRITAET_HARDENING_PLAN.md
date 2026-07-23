# Suite-Datenintegritaet-Hardening: Arbeitsplan

**Stand:** 2026-07-22  
**Status:** Entwurf - Planreview ausstehend; nicht implementierungsreif  
**Autor:** Codex  
**Vorgesehener Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**GitHub-Status:** Branch noch nicht angelegt und nicht veroeffentlicht; Push nur nach ausdruecklicher Nutzerfreigabe  
**Planungsbranch bei Erstellung:** `codex/fix-backtest-trade-log` (themenfremd und bereits vor Planerstellung dirty)  
**Ausgangspunkt:** technische Read-only-Diagnose der Suite vom 2026-07-22

## Zweck

Dieser Arbeitsplan ueberfuehrt die am 2026-07-22 reproduzierten entscheidungsrelevanten Fehler in kleine, pruefbare und reviewbare Umsetzungsslices. Im Mittelpunkt stehen nicht kosmetische Abweichungen, sondern Fehler, die Vermoegen, Entnahmen, Steuern, Verlustvortraege, Risikokennzahlen, Profilaggregation oder Optimierungsergebnisse so veraendern koennen, dass daraus falsche finanzielle Entscheidungen entstehen.

Der Plan ist noch keine Freigabe zur Implementierung. Vor dem ersten Code-Edit muessen:

1. Gemini den Plan adversarial nach `docs/internal/SLICE_EXECUTION_RULES.md` reviewen;
2. Codex alle Review-Findings beantworten und einarbeiten;
3. offene Fachentscheidungen durch Nutzer beziehungsweise Reviewer entschieden sein;
4. der Status auf `implementierungsreif` gesetzt sein;
5. der vorgesehene Feature-Branch sauber angelegt und aktiv sein;
6. fuer den startenden Slice eine eigene Slice-MD mit Branch-/Statuscheck und Diff-Risiko-Block vorliegen.

Codex ist Autor und spaeter Implementer, erteilt aber keine Eigenfreigabe und erstellt gemaess Projektregeln keine Commits.

## Ausgangslage und Arbeitsbaum-Baseline

Die Diagnose erfolgte im aktuellen Worktree inklusive bereits vorhandener, nicht von dieser Analyse stammender Aenderungen:

```text
Branch: codex/fix-backtest-trade-log

 M app/simulator/historical-backtest-ui.js
 M app/simulator/simulator-main-helpers.js
 M simulator.css
 M tests/simulator-backtest-ui.test.mjs
?? node_modules/.bin/playwright*
?? node_modules/playwright-core/
?? node_modules/playwright/
```

Diese Dateien und Verzeichnisse sind fuer diesen Plan Fremdscope. Sie duerfen in keinen spaeteren Slice-Commit gelangen. Insbesondere Slices mit Backtest-, Simulator-UI- oder Browserbezug duerfen erst beginnen, wenn ein sauberer Feature-Branch hergestellt wurde und keine Ueberlappung mit den bestehenden Aenderungen mehr besteht.

### Testbaseline der Diagnose

| Gate | Ergebnis am 2026-07-22 | Aussagegrenze |
| --- | --- | --- |
| `npm test` | 129 Testdateien, 7.306 Assertions, 0 Fehler, 0 offene Handles | Suite laeuft; fachliche Orakel- und Grenzwertluecken bleiben |
| `npm run test:browser` | alle Einstiegsseiten und Key-Flows gruen | Smoke-/Workflow-Abdeckung, keine vollstaendige Rechenvalidierung |
| `npm run test:coverage` | vorhandene Baseline 76,46 % (32.625/42.668 ausfuehrbare V8-Zeilenbereiche) | Coverage ist Navigationssignal, kein Korrektheitsnachweis |
| `git diff --check` | gruen | keine Whitespace-Fehler im vorhandenen Diff |

Besonders geringe Coverage besteht unter anderem in Auto-Optimize-, Sweep-UI-, Monte-Carlo- und mehreren Simulator-UI-Modulen. Zugleich liegen bestaetigte Fehler auch in hoch abgedeckten Modulen. Ursache sind daher nicht nur ungedeckte Zeilen, sondern fehlende fachliche Orakel, fehlende Wiederholungs-/Metamorphie-Tests und Mocks, die Produktionszustaende erfinden.

## Sofortige Nutzungseinschraenkungen bis zur Behebung

Bis die zugeordneten P0-/P1-Slices implementiert, getestet und freigegeben sind, gilt als Produktsicherheitsannahme:

- keine Balance-Verkaufsorder ungeprueft ausfuehren;
- 3-Bucket in Balance nicht fuer reale Orders verwenden;
- keine entscheidungsrelevante Simulation mit Fractional Lots ausfuehren;
- keine Mischhaushalte aus Profilen mit und ohne Detailtranchen simulieren;
- Sweep und Auto-Optimize nicht zur Auswahl einer realen Strategie verwenden;
- Ergebnisse mit Dynamic Flex, Flex-Budget, Partner, Pflege oder Tail-Risk nicht als validiert behandeln;
- alle Ergebnisse nur als Szenariohinweis und nicht als alleinige Finanz-, Steuer- oder Pflegeentscheidung verwenden.

Eine temporaere technische Sperre dieser Funktionen ist eine offene Produktentscheidung D-01. Dieser Plan nimmt keine unangekuendigte Laufzeitsperre vorweg.

## Ziel

Nach Abschluss aller freigegebenen Slices soll die Suite folgende Eigenschaften besitzen:

1. Vorschauen sind wiederholbar und mutieren keinen fachlichen Jahreszustand.
2. Ein Jahreszustand wird nur durch einen expliziten, periodengebundenen und idempotenten Commit fortgeschrieben.
3. Die gerenderte Aktion, die Steuerabrechnung, der Verlustvortrag, die Bestandsverwendung und der persistierte State beschreiben exakt dieselbe finale Transaktion.
4. Kanonische Zahlen werden niemals erneut als lokalisierte Displaytexte interpretiert.
5. Profilaggregation erhaelt Vermoegen und Provenienz vollstaendig oder blockiert sichtbar; sie laesst keine Werte still weg.
6. `0`, `missing`, `invalid` und negative gueltige Werte bleiben unterscheidbar.
7. Jeder in Sweep oder Optimierung angebotene Parameter wirkt nachweislich auf den ausgefuehrten Lauf oder wird sichtbar als nicht unterstuetzt abgewiesen.
8. Main Thread, Worker, Monte Carlo, Sweep, Backtest und Optimierer nutzen kompatible Parameter-, Sampling-, Haushalts- und Ergebnisvertraege.
9. Korrupte oder inkompatible Imports mutieren keine Live-Daten; Rohdaten und Recovery-Punkt bleiben erhalten.
10. Datenstichtag, Quelle, Qualitaet und Modellgrenze bleiben bis Ergebnis und Export nachvollziehbar.

## Nicht-Ziele

- keine manuelle Aenderung von `engine.js`, `dist/` oder `RuheStandSuite.exe`;
- kein Tauri-Release-Build ohne separaten ausdruecklichen Nutzerauftrag;
- keine Aufnahme realer lokaler Finanzdaten, Backtest-Logs oder Exporte in Tests oder Dokumentation;
- keine vollstaendige wissenschaftliche Validierung von Kapitalmarkt-, Pflege-, Mortalitaets- oder Rentenmodellen;
- keine Steuerberatung und keine stillschweigende Umstellung auf eine neue Steuerrechtsinterpretation;
- kein allgemeines UI-Redesign;
- keine Umbenennung des kanonischen Legacy-Feldes `detailledTranches`;
- kein Refactoring nur aus Stilgruenden, wenn es fuer einen belegten Contract nicht erforderlich ist;
- keine Freigabe frueherer Hardening-Arbeiten allein aufgrund gruener Tests oder archivierter Abschlussvermerke.

## Prioritaeten

| Prioritaet | Bedeutung |
| --- | --- |
| P0 | kann unmittelbar unmoegliche Orders, massive Vermoegensfehler oder zustandsabhaengige Falschempfehlungen erzeugen; zuerst beheben |
| P1 | kann Risiko-, Entnahme-, Steuer- oder Optimierungsergebnisse wesentlich verfaelschen |
| P2 | kann Datenkorruption, irrefuehrende Anzeige oder schwer erkennbare Modellabweichung verursachen |
| Entscheidung | fachlicher beziehungsweise regulatorischer Contract ist nicht eindeutig; keine Umsetzung ohne dokumentierte Entscheidung |

## Findings-Register

### A. Balance und 3-Bucket

| ID | Prioritaet | Bestaetigter Befund | Entscheidungsrisiko | Hauptstellen | Slice |
| --- | --- | --- | --- | --- | ---: |
| BAL-01 | P0 | Initialrender und Eingabeaenderung persistieren `newState`; Vorschauen verbrauchen Flex-Budget, VPW-Streaks und Verlustvortrag | Ergebnis haengt von Anzahl der UI-Aufrufe statt von Finanzdaten ab | `app/balance/balance-main.js`, `balance-update-pipeline.js`, `balance-main-profilverbund.js` | 1 |
| BAL-02 | P0 | 3-Bucket liest `newState.marketData.returns.realEq`, das die Produktionsengine nicht erzeugt; Fallback ist 0 % | jedes Jahr kann als gutes Jahr behandelt werden | `balance-action-postprocessor.js`, `balance-main-profilverbund.js`, `engine/core.mjs` | 2 |
| BAL-03 | P0 | Bond-Refill rechnet gegen den urspruenglichen Lotbestand und kann dieselbe Tranche erneut verkaufen | Verkaufsmenge kann Bestand uebersteigen | `engine/transactions/three-bucket-logic.mjs` | 2 |
| BAL-04 | P0 | 3-Bucket veraendert Quellen nach dem Tax-Settlement, ohne Summen, Steuer und `taxState` neu abzurechnen | sichtbare Order, Steuer und Verlustvortrag widersprechen sich | `engine/core.mjs`, `three-bucket-logic.mjs`, `balance-action-postprocessor.js` | 2 |
| BAL-05 | P1 | Single-Profile-Bondziel verwendet Roh-Floor/Flex statt tatsaechlicher Nettoentnahme nach Renten und Dynamic Flex | trotz Entnahme 0 kann ein grosser Equity-Verkauf entstehen | `balance-action-postprocessor.js` | 2 |
| BAL-06 | P1 | Balance erlaubt 0 Cashpuffer-Monate, der Reader ersetzt 0 durch 2 | bewusste Nutzereingabe wird veraendert | `Balance.html`, `app/balance/balance-reader.js` | 3 |

### B. Kanonische Zahlen, Tranchen und Profile

| ID | Prioritaet | Bestaetigter Befund | Entscheidungsrisiko | Hauptstellen | Slice |
| --- | --- | --- | --- | --- | ---: |
| DAT-01 | P0 | Ein kanonischer Number-Wert mit genau drei Nachkommastellen wird als Tausenderformat interpretiert | Fractional Lot und Marktwert koennen Faktor 1.000 zu gross werden | `simulator-portfolio-format.js`, `simulator-portfolio-init.js` | 3 |
| DAT-02 | P0 | Sobald ein Profil Detailtranchen besitzt, koennen positive Aggregate anderer Profile entfallen | Haushaltsvermoegen und Erfolgsquote werden massiv zu niedrig | `simulator-profile-inputs.js`, `simulator-portfolio-init.js` | 4 |
| DAT-03 | P1 | Goldziel wird nur ueber goldaktive Profile gemittelt und dann auf das Gesamtvermoegen angewandt | profilbezogenes 8.000-EUR-Ziel kann als 80.000 EUR wirken | `simulator-profile-inputs.js`, `balance-main-profilverbund.js` | 4 |
| DAT-04 | P1 | Normale Simulatorstrategie liest Prozentwerte ganzzahlig und ersetzt gueltige 0 per Falsy-Default | 0 % und 2,5 % werden zu Defaults beziehungsweise 2 % | `simulator-input-strategy.js` | 3 |
| DAT-05 | P2/Entscheidung | Profilverbund-Persistenz kann gespeichertes Profilalter mit dem aktiven Haushaltsalter ueberschreiben | spaetere Simulation nutzt falsche Demografie | `profilverbund-balance.js`, `balance-main-profilverbund.js` | 13 |

### C. Engine- und Spending-Invarianten

| ID | Prioritaet | Bestaetigter Befund | Entscheidungsrisiko | Hauptstellen | Slice |
| --- | --- | --- | --- | --- | ---: |
| ENG-01 | P1 | `flexBudgetBalanceYears === 0` wird wie uninitialisiert behandelt und neu gefuellt | Stressbudget wirkt zyklisch unbegrenzt | `engine/planners/flex-budget-policy.mjs` | 5 |
| ENG-02 | P1 | Mehrere Goldtranchen verbrauchen denselben aggregierten Floor-Spielraum je Lot erneut | Goldverkauf kann Floor und Einzelbestand verletzen | `engine/transactions/sale-engine.mjs` | 2 |
| ENG-03 | P1 | Equity-Gesamtbudget 0 wird als unbegrenzt interpretiert | Verkauf trotz fehlendem Equity-Ueberschuss | `sale-engine.mjs`, `transaction-opportunistic.mjs` | 2 |
| ENG-04 | P1 | Vermoegensabhaengiger Fallback zieht Rente nach der Bedarfsverrechnung ein zweites Mal ab | wirtschaftlich identische Nettoentnahmen liefern andere Flexraten | `engine/core.mjs`, `wealth-reduction.mjs` | 5 |
| ENG-05 | P1 | Erster Lauf setzt eine berechenbare Entnahmequote auf 0 | kritischer Alarm kann im ersten Jahr fehlen | `SpendingPlanner.mjs` | 5 |
| ENG-06 | P1 | Monatsquantisierung kann die nicht verhandelbare Floor-Entnahme unterschreiten | Grundbedarf wird unterdeckt | `spending-policy-helpers.mjs`, `engine/config.mjs` | 5 |
| ENG-07 | Entscheidung | Alarmterm `Math.min(10, 10 + 20 * shortfallRatio)` ist fuer jede Unterdeckung konstant 10 | UI suggeriert Schweregrad, der rechnerisch nicht wirkt | `flex-rate-policy.mjs` | 15 |
| ENG-08 | P1 | Aktive Rente mit ungueltigem Wert wird nicht validiert und kann `NaN`/spaeter `null` erzeugen | Bedarf und Handlung werden unbrauchbar, ohne klaren Fehler | `InputValidator.mjs`, `engine/core.mjs` | 5 |
| ENG-09 | P1 | explizites `maxSkimPctOfEq=0` wird per Falsy-Default zu einem positiven Prozentsatz | bewusst deaktivierter opportunistischer Verkauf wird aktiviert | `transaction-opportunistic.mjs`, `transaction-surplus.mjs` | 2 |

### D. Sweep, Monte Carlo und Auto-Optimize

| ID | Prioritaet | Bestaetigter Befund | Entscheidungsrisiko | Hauptstellen | Slice |
| --- | --- | --- | --- | --- | ---: |
| SWP-01 | P1 | Worst-5-%-Drawdown verwendet absteigende Sortierung plus 95-%-Index | schlechter Risikotail wird nahezu spiegelverkehrt ausgewiesen | `simulator-results.js` | 9 |
| SWP-02 | P1 | Sweep-Methode `stationary` faellt in Regime-Markov | ausgewaehltes statistisches Verfahren wird nicht ausgefuehrt | `sweep-runner.js`, `simulator-engine-helpers.js` | 7 |
| SWP-03 | P1 | Partner ist im Sweep fest deaktiviert | P2-Rente, -Langlebigkeit, -Pflege und Witwenpfad fehlen | `sweep-runner.js` | 8 |
| SWP-04 | P1 | Tail-Risk-Overlay wird im Sweep nicht angewandt | vermeintlich gestresste Strategien sind unstressiert | `sweep-runner.js`, `monte-carlo-runner.js` | 8 |
| SWP-05 | P1 | Survival-Quantil ist im Sweep ein No-op | Quantilzellen unterscheiden sich allenfalls durch Zufallsrauschen | `sweep-runner.js` | 8 |
| SWP-06 | P1 | Startjahresmodus/-filter und Ausschluss geschaetzter Historie werden nicht uebernommen | Sweep nutzt andere Datenbasis als konfiguriert | `simulator-sweep.js`, `sweep-runner.js` | 7 |
| SWP-07 | P2 | Seed 0 wird zu 12345 | Reproduzierbarkeit und expliziter Seedvertrag brechen | `simulator-sweep.js` | 7 |
| SWP-08 | Entscheidung | Parameterkombinationen verwenden unterschiedliche Zufallsfolgen ohne Unsicherheitsausweis | Rauschen kann als bester Parameter selektiert werden | `sweep-runner.js` | 9 |
| SWP-09 | P1 | terminaler Ruin wird vor dem Abbruch nicht sicher in die Drawdownserie aufgenommen | Ruin im ersten Jahr kann als 0 % Drawdown erscheinen | `sweep-runner.js` | 9 |
| SWP-10 | P1 | Pflege-Flex wird im Sweep durch `temporaryFlexFactor=1.0` ersetzt | Pflegefall reduziert Flex nicht wie konfiguriert | `sweep-runner.js` | 8 |
| SWP-11 | P1 | Sweep-Worker umgeht Teile der kanonischen MC-Parameter-Normalisierung | ungueltige oder out-of-range Werte koennen plausible Falschergebnisse liefern | `simulator-sweep.js`, `workers/mc-worker.js`, `monte-carlo-parameters.js` | 7 |
| OPT-01 | P1 | Optimierer schreibt `goldAllokationProzent` statt kanonisch `goldZielProzent`, wendet den Gewinner spaeter aber real an | eine nie bewertete Goldquote wird uebernommen | `auto-optimize-evaluate.js`, `auto_optimize.js`, `auto-optimize-param-meta.js` | 10 |
| OPT-02 | P1 | P25 wird aus P10 befuellt | Optimierungsziel entspricht nicht der UI-Auswahl | `auto-optimize-evaluate.js` | 11 |
| OPT-03 | P1/Entscheidung | Kandidatenparameter `horizonYears` wird bei Dynamic Flex durch den aktuarischen Horizont ueberschrieben | UI bezeichnet einen No-op als direkte Vorgabe | `auto-optimize-evaluate.js`, `monte-carlo-runner.js`, `Simulator.html` | 10 |
| OPT-04 | P1 | Gueltige Null-Caps werden im Optimierer durch 25 %/50 % ersetzt | deaktivierte Eingriffe werden als aggressive Strategie bewertet | `auto-optimize-evaluate.js`, `auto_optimize.js` | 10 |
| OPT-05 | Entscheidung | Optimizer erzwingt Regime-Markov und laesst CAPE-Konditionierung aus, unabhaengig von normalen MC-Einstellungen | Champion kann unter einem anderen Modell als vom Nutzer angenommen entstehen | `auto-optimize-evaluate.js`, `auto_optimize.js` | 10, 15 |
| OPT-06 | P1/Entscheidung | Median Withdrawal Rate wird konstant 0 gesetzt; fachlicher Nenner/Aggregationsweg ist nicht spezifiziert | Ziel ist wirkungslos und Kandidaten werden nach Nebenkriterien sortiert | `auto-optimize-evaluate.js`, `auto-optimize-metrics.js` | 11 |
| OPT-07 | P1 | zusaetzliches Quantilfeld wird gelesen, aber vom Metrikselector ignoriert | Nutzerwahl hat keine Wirkung | `auto-optimize-metrics.js`, `Simulator.html` | 11 |
| OPT-08 | P1 | Drawdown-Tiebreaker erwartet einen Shape, den reale Evaluationsergebnisse nicht besitzen | Ranking faellt auf falsche/fehlende Nebenmetrik zurueck | `auto-optimize-utils.js`, `auto-optimize-evaluate.js` | 11 |

### E. Jahresergebnis, Renditen und Ergebnisdarstellung

| ID | Prioritaet | Bestaetigter Befund | Entscheidungsrisiko | Hauptstellen | Slice |
| --- | --- | --- | --- | --- | ---: |
| SIM-01 | P1 | Runway 0 wird `Infinity`, Flexrate 0 wird 1 %, Coverage 0 wird 100 % | Stress-, Flex- und Runway-KPIs sind zu positiv | `simulator-year-result.js` | 6 |
| SIM-02 | P1 | Negative Cashrenditen werden im Ansparpfad und Pflegebucket auf 0 geklemmt | Endvermoegen und Pflegekapital werden ueberschaetzt | `simulator-accumulation-year.js`, `simulator-health-bucket.js`, `simulator-engine-direct-utils.js` | 6 |
| SIM-03 | P2 | Lohnwachstum 0 wird per Falsy-Default zu 2 % | Sparrate steigt trotz 0-%-Annahme | `simulator-accumulation-year.js` | 6 |
| SIM-04 | P2 | Portfoliochart entfernt terminale Nullstaende | sichtbarer Verlauf endet vor dem Ruin | `simulator-portfolio-chart.js` | 6 |
| SIM-05 | P2 | Heatmap erkennt Counts anhand der ersten Spaltensumme faelschlich als Shares | ein Treffer aus 100 kann als 100 % erscheinen | `simulator-heatmap.js` | 6 |
| SIM-06 | P2/Entscheidung | Erfolgreiche Laeufe mit exakt 0 EUR Endvermoegen fehlen im Median | UI-Text und Aggregationskriterium widersprechen sich | `monte-carlo-aggregates.js`, `results-metrics.js` | 6 |
| SIM-07 | P1/Entscheidung | direkter `horizonYears`-Wert ist auch im normalen MC-/Simulatorpfad bei aktivem Dynamic Flex wirkungslos | eine als direkte Vorgabe bezeichnete Eingabe aendert den Lauf nicht | `monte-carlo-runner.js`, `Simulator.html` | 10 |

### F. Import, Persistenz und Recovery

| ID | Prioritaet | Bestaetigter Befund | Entscheidungsrisiko | Hauptstellen | Slice |
| --- | --- | --- | --- | --- | ---: |
| IMP-01 | P1 | String-Boolean `\"false\"` passiert die Importvalidierung und aktiviert Checkboxen | Dynamic Flex/Go-Go koennen ungewollt eingeschaltet werden | `balance-binder-imports.js`, `balance-reader.js` | 12 |
| IMP-02 | P1 | Alte Markt-CSV wird ohne Bezug zum aktuellen Planjahr akzeptiert; Datum/Quelle gehen nach Reload verloren | 16 Jahre alte Daten koennen aktuelles Regime bestimmen | `balance-binder-imports.js`, `balance-reader.js` | 12 |
| IMP-03 | P1/Entscheidung | ATH wird nur aus den gelieferten CSV-Zeilen gebildet, selbst bei vier Jahren Historie | lokales Fensterhoch wird als Allzeithoch verwendet | `balance-binder-imports.js` | 12, 15 |
| PER-01 | P1 | Korrupte Profilregistry wird als leer interpretiert und durch Default ueberschrieben; Current-ID kann Ghost bleiben | Profile und Zuordnungen verschwinden aus der Live-Sicht | `profile-registry.js`, `profile-storage.js` | 13 |
| PER-02 | P1 | Korrupter Pflegebucket wird still als deaktiviert normalisiert | reserviertes Pflegevermoegen wird freigegeben | `profile-state.js`, Balance-/Simulator-Reader | 13 |
| PER-03 | P1 | Korrupter Profil-Balance-State kann als fehlend/Nullwerte in den Haushalt eingehen | Profilvermoegen, Rente und Bedarf fehlen ohne Warnung | `profile-state.js`, `profilverbund-balance.js` | 13 |
| PER-04 | P1 | Profilbundle-Import validiert flach, schreibt vor Abschlusscheck und uebernimmt beliebige Globals | Split-Brain und Teilmutation trotz Fehlermeldung | `profile-bundle-io.js` | 14 |
| PER-05 | P1 | Komplettbackup prueft keine Fachschemas vor Replace-all | formal gueltiges Backup kann Live-Daten korrumpieren | `persistence-backup.js` | 14 |
| PER-06 | P1 | Negativer/Null-kumulierter Inflationsfaktor bleibt im Storagepfad gueltig | Realwerte und Drawdown koennen Vorzeichen wechseln | `balance-storage.js`, `SpendingPlanner.mjs` | 14 |

### G. Fach- und Modellgrenzen, nicht ohne Entscheidung als Bugfix behandeln

| ID | Typ | Offene Grenze | Risiko | Slice |
| --- | --- | --- | --- | ---: |
| MOD-01 | Steuercontract | Kirchensteuer wird mit `0.25 * (1 + Soli + KiSt)` vereinfacht; gesetzliche Abziehbarkeit ist nicht modelliert | Steuerabweichung, insbesondere bei kirchensteuerpflichtigen Nutzern | 15 |
| MOD-02 | Ausgabencontract | positive und negative Kategorien werden vor Betragsbildung saldiert | Erstattungen koennen Bruttoausgaben senken; Nettoverbrauch kann aber beabsichtigt sein | 15 |
| MOD-03 | Reconciliation | real ausgefuehrter Trancheverkauf reduziert Bestand, bucht Erloes aber nicht automatisch auf Cash | korrekt bei sofortigem Verbrauch, falsch bei noch vorhandenem Erloes | 15 |
| MOD-04 | Demografie | mehr als zwei Profile werden finanziell aggregiert, demografisch aber auf zwei Personen reduziert | zusaetzliche Renten/Lebenserwartungen nur angenaehert | 15 |
| MOD-05 | externe Validierung | Pflege-, Mortalitaets- und Rentenannahmen besitzen offene Kalibrierung | technisch korrekte Software ist noch kein wissenschaftlich validiertes Entscheidungsmodell | 15, 16 |
| MOD-06 | Datencontract | Historie 1925-1949 ist geschaetzt; exakte MSCI-EUR-Returnvariante ist nicht abschliessend validiert | Backtest-/MC-Ergebnisse haengen von noch nicht vollstaendig belegter Datenkonstruktion ab | 15, 16 |
| MOD-07 | Modellumfang | TER, Spread, Slippage, Gebuehren, FX und breiteres Asset-/Bonduniversum sind nicht oder nur eingeschraenkt modelliert | langfristiges Nettovermoegen kann zu hoch beziehungsweise Geltungsbereich zu breit verstanden werden | 15, 16 |
| MOD-08 | Validierungsstatus | Sweep, Auto-Optimize und mehrere Strategieheuristiken sind experimentell und nicht extern als Entscheidungsmodell validiert | technisch berechneter Champion kann als fachlich optimal missverstanden werden | 15, 16 |

### H. Qualitaetssicherung

| ID | Prioritaet | Bestaetigter Befund | Entscheidungsrisiko | Hauptstellen | Slice |
| --- | --- | --- | --- | --- | ---: |
| QA-01 | P1 | Tests pruefen haeufig Determinismus oder Main-/Worker-Paritaet statt fachlicher Richtigkeit; ein 3-Bucket-Test mockt ein in Produktion fehlendes Feld | zwei identisch falsche Pfade bleiben gruen | insbesondere Balance-Orchestrierung, Sweep und Optimizer | 16 |
| QA-02 | P1/P2 | kritische Runner-/UI-Module besitzen geringe oder 0-%-Coverage; zugleich fehlen Grenzwertorakel auch in hoch abgedeckten Dateien | wichtige Branches und Falsy-/No-op-Grenzen bleiben unentdeckt | Coverage-Inventar und Tests | 16 |

## Reproduzierte Golden-Orakel

Diese Faelle sind vor beziehungsweise innerhalb ihres Fix-Slice als synthetische Regressionstests zu kodieren. Ein Slice darf den aktuell falschen Output nicht als Golden Master festschreiben.

| Oracle-ID | Input | Verbindliche Erwartung |
| --- | --- | --- |
| O-01 Preview-Idempotenz | identische Balance-Eingaben und gleicher gespeicherter State, Vorschau fuenfmal | identischer Output; fachlicher persistierter State bytegleich; kein Verlustvortrag-/Flex-/VPW-Verbrauch |
| O-02 Expliziter Commit | dieselbe Perioden-ID zweimal committen | genau eine State-Fortschreibung; zweiter Aufruf `already_committed`/No-op |
| O-03 3-Bucket-Baer | −30 % Equity, Trigger −15 %, 300.000-EUR-Equity-Lot, keine Bonds | `isBadYear=true`; kein Equity-Refill; Summe je Lot <= 300.000 EUR; Unterdeckung sichtbar |
| O-04 Finale Steuer | Ausgangsaktion 10.000 EUR, danach Bondquelle 11.519,08 EUR mit 50-%-Gewinnquote und Verlustvortrag 777 EUR | unabhaengige Handrechnung ergibt fuer genau diese Fixture 1.314,14 EUR finale Steuer und Verlustvortrag 0; Steuer, Brutto, Netto, Verwendungen und `newState.taxState` stammen aus derselben finalen Action und reconciliieren auf 0,01 EUR |
| O-05 Fractional Lot | Number `shares=1.234`, Preis 100,50 EUR | 1,234 Anteile und 124,017 EUR Marktwert; keine Faktor-1.000-Transformation |
| O-06 Mischprofile | Profil A 80.000 Detail + 10.000 Cash; Profil B 150.000 Depot + 20.000 Cash + 30.000 Geldmarkt | 290.000 EUR oder sichtbarer fail-closed Status gemaess D-04; niemals 110.000/140.000 EUR ohne Fehler |
| O-07 Profilgold | Profil A 100.000 EUR mit 8 %, Profil B 900.000 EUR ohne Goldstrategie | Haushaltsziel 8.000 EUR; unabhaengig vom aktiven Profil |
| O-08 Nullgrenzen | Caps/Zielquote/Cashmonate 0 und Band 2,5 | Werte bleiben exakt 0 beziehungsweise 2,5 oder werden mit strukturiertem Validierungsfehler abgewiesen |
| O-09 Gold-Floor | mehrere Goldlots, 100.000 EUR gesamt, Floor 80.000 EUR | Gesamtverkauf <= 20.000 EUR und je Lot <= Marktwert |
| O-10 Negativzins | 100.000 EUR Cash/Pflegebucket bei −0,5 % | Zinsdelta −500 EUR, Endwert 99.500 EUR, FlowDelta reconciliert |
| O-11 Sweep-Methodik | kleiner deterministischer Datensatz und fixer Seed, `stationary` vs. `regime_markov` | gezogene Start-/Restart-Indizes stimmen jeweils exakt mit dem kanonischen Referenzsampler; Methode und Indizes im Ergebnisfingerprint, nicht nur „Ergebnis ist anders“ |
| O-12 Sweep-Partner | Partner aus vs. aktiv mit 5.000 EUR Monatsrente und deterministischem Todesjahr | Jahrescashflow enthaelt vor Tod exakt 60.000 EUR P2-Rente und danach den festgelegten Witwenanteil; P2-Life-/Care-State und Outcome stimmen mit MC-Referenzpfad |
| O-13 Sweep-Tail | Tail aus vs. deterministisch injizierter Crashplan | exakte Schockjahre sowie Return-/Inflationsdelta und Applied-/Skipped-Zaehler stimmen mit dem Tail-Contract; Portfoliofolge reconciliert |
| O-14 Drawdown | bekannte Reihe 1...100 sowie Ruin im ersten Jahr | Worst-5-%-Schwelle im schlechten Tail; terminaler Ruin im Drawdown enthalten |
| O-15 Optimizer-Paritaet | Kandidat evaluieren, Champion anwenden, erneut evaluieren | identischer kanonischer Parameterfingerprint und innerhalb Toleranz identische Metriken |
| O-16 Boolean-Import | aktuelles Schema mit `dynamicFlex: \"false\"`; separat explizit versionierter Legacyfall | aktuelles Schema weist den String ohne Mutation ab; nur ein benannter Legacy-Migrator darf ihn deterministisch zu Boolean `false` normalisieren; niemals `true` |
| O-17 Stale CSV | letzter Datenpunkt 2010 bei Planperiode 2025/2026 | blockiert; Stichtag/Quelle/History-Scope sichtbar und persistent |
| O-18 Corrupt Recovery | korrupte Registry, Pflege- oder Backupdaten | keine Live-Mutation; Rohpayload/Recovery-Punkt erhalten; sichtbarer Bereichsfehler |
| O-19 Engine-Grenzen | Flex-State missing/0/recharge; Equity-Cap 0; 24.000 EUR Nettoentnahme auf 100.000 EUR Depot; Floor 25.000 EUR | missing initialisiert auf das konfigurierte Maximum; explizit 0 bleibt im Stress 0 und steigt nur um den konfigurierten Recharge-Schritt; Cap 0 verkauft 0 EUR; Erstjahresquote ist 24 %; Rente wird genau einmal verrechnet; quantisierte Jahresentnahme bleibt mindestens 25.000 EUR |
| O-20 Survival-Horizont | deterministischer Alters-/Mortalitaetsfall fuer Quantil 0,50 und 0,99 sowie direkter Modus 15/55 | erwartete effektive Horizonte stammen exakt aus dem kanonischen Resolver; direkter Modus verwendet 15 beziehungsweise 55, aktuarischer Modus weist das Direktfeld sichtbar als nicht anwendbar aus |
| O-21 Optimizer-Metriken | bekannte Run-Verteilung mit festgelegten Endwerten, Jahresquoten und Drawdowns | P10/P25/P50, Median-WR nach D-14 und Tiebreaker entsprechen der unabhaengigen Handrechnung; Null-Caps bleiben 0 und Missingness wird nicht zu 0 |
| O-22 Ergebnisnullen | Jahreswerte Runway/Flex/Coverage/Lohnwachstum jeweils 0; Chart 100.000 -> 50.000 -> 0; Heatmap-Counts `[1,0]` bei 100 Runs; erfolgreicher Outcome mit 0 EUR | alle beobachteten Nullen bleiben 0; Chart behaelt drei Punkte; Heatmap zeigt 1 %; Outcome wird nach D-19 statt nach Truthiness klassifiziert |

## Verbindliche Zielvertraege und Invarianten

### I-01 Preview ist nicht Commit

- Eine Vorschau darf Inputs lesen und einen hypothetischen `candidateState` liefern, aber keinen fachlichen Jahreszustand speichern.
- Eingabepersistenz und fachliche State-Fortschreibung sind getrennte Operationen.
- `taxState`, Flex-Budget, VPW-/Alarm-Streaks, letzte Entnahme und Glättungswerte werden nur durch einen expliziten Periodencommit ersetzt.
- Der Commit besitzt Perioden-ID sowie Input-/Basis-State-Fingerprint und ist idempotent.
- Ein veralteter Preview-Fingerprint darf nicht committed werden; der Commit muss neu rechnen oder kontrolliert abbrechen.

### I-02 Eine finale Aktion

Die Suite kennt pro fachlichem Lauf genau ein finales Verkaufsledger. Daraus werden in fester Reihenfolge abgeleitet:

1. Verkaufsquellen und Restbestaende;
2. Profilattribution der finalen Verkaufsquellen, falls Profilverbund aktiv ist;
3. Rohgewinne und Teilfreistellung je Steuer-Owner;
4. Steuer, Pauschbetrag und Verlustvortrag je Profil beziehungsweise im Single-Profil-Fall;
5. Aggregation der finalen Haushaltssteuer;
6. Nettoerloes, vorhandene Liquiditaetsquellen und Verwendungen;
7. Diagnose und UI-KPIs;
8. optional zu committender State.

Nach dem Settlement darf kein Postprozessor Quellen oder Mengen mehr veraendern. Muss 3-Bucket die Aktion umschreiben, geschieht dies vor dem finalen Settlement. Jede Abweichung groesser als 0,01 EUR zwischen Ledger, Summen, Steuer und Verwendungen blockiert fail-closed.

### I-03 Bestands- und Geldinvarianten

- `sum(salesByLot) <= lot.marketValue` fuer jede Tranche.
- `sum(salesByAsset) <= sellableAssetValue` fuer jede Assetklasse.
- Ein gemeinsames Budget oder ein Floor-Headroom wird ueber alle Lots genau einmal verbraucht.
- `bruttoVerkaufGesamt === sum(nonLiquidFinalSaleSources.amount)` innerhalb 0,01 EUR; bereits vorhandene Cash-/Liquiditaetsquellen sind kein Verkauf und werden separat reconciliiert.
- `bruttoVerkaufGesamt - steuerFinal === nettoErloesFinal` innerhalb 0,01 EUR.
- Verwendungen koennen den finalen Nettoerloes nicht uebersteigen; Unterdeckung wird ausgewiesen und nicht erfunden.
- FlowDelta muss nach allen regulären, erzwungenen und Bucket-Verkaeufen innerhalb der bestehenden Toleranz reconciliieren.

### I-04 Kanonische Zahlengrenze

- DOM-/Dateitext wird genau einmal an einer benannten Importgrenze geparst.
- Ein bereits kanonischer JavaScript-`number` wird niemals anhand von Punkt-/Kommapositionen neu interpretiert.
- `0`, `null`/`undefined`, leerer String, `NaN`, `Infinity` und negativer gueltiger Wert besitzen getrennte Semantik.
- Prozentwerte behalten erlaubte Dezimalstellen; UI, Profil, Worker und Engine verwenden dieselbe Einheit.
- Defaults greifen nur bei fehlenden Werten, nie aufgrund allgemeiner Falsy-Semantik.

### I-05 Profilaggregation erhaelt Werte und Provenienz

- Die Summe aller ausgewaehlten Profilwerte entspricht dem initialisierten Haushaltsportfolio innerhalb 0,01 EUR.
- Detailwerte ersetzen nur ueberlappende Aggregate desselben Profils und derselben Assetklasse.
- Ein Detailbestand eines Profils darf Werte eines anderen Profils nicht verdraengen.
- Explizites `[]`, fehlendes Feld und korrupter Payload bleiben unterscheidbar.
- Bei nicht aufloesbarer Doppelzaehlung oder unbekannter Steuerbasis wird sichtbar blockiert oder ein ausdruecklich freigegebener, gekennzeichneter Fallback verwendet.
- Der Wechsel des aktiven UI-Profils aendert bei gleicher Verbundauswahl keine Haushaltsempfehlung.

### I-06 Parameterfidelity

Fuer jeden in MC, Sweep oder Auto-Optimize angebotenen Parameter gilt eine maschinenpruefbare Kette:

```text
UI-Wert
  -> kanonisch normalisierter Request
  -> Worker/Main-Thread-Request
  -> tatsaechlich konsumierter Runnerwert
  -> Ergebnis-/Exportprovenienz
  -> bei Apply derselbe kanonische Wert
```

Jeder Parameter benoetigt mindestens einen kontrollierten Kausalitaetstest. Kann keine Wirkung nachgewiesen werden, wird der Parameter entfernt, gesperrt oder sichtbar als reine Anzeige-/Modellannahme gekennzeichnet.

### I-07 Ergebnis- und Missingness-Semantik

- Beobachtete Null bleibt 0.
- Nicht beobachtbar beziehungsweise nicht anwendbar wird `null` plus Grund, nicht 0, 1, 100 oder `Infinity`.
- Terminaler Ruin bleibt in Zeitreihe, Drawdown und Outcome enthalten.
- Label, Einheit, Nenner, Quantilrichtung und Rohquelle jeder entscheidungsrelevanten Metrik sind versioniert.
- Charts duerfen gueltige terminale Werte nicht herausfiltern oder die Zeitachse dadurch komprimieren.

### I-08 Import und Recovery

Jeder ersetzende Import folgt diesem Ablauf:

```text
Datei lesen
  -> Envelope/Version/Allowlist validieren
  -> alle Domainwerte validieren
  -> Cross-Record-Invarianten pruefen
  -> nebenwirkungsfreien Dry-run ausfuehren
  -> Recovery-Snapshot schreiben und zuruecklesen
  -> staged schreiben
  -> Live-State erneut laden und postvalidieren
  -> committen oder vollstaendig kompensierend zurueckrollen
```

Korrupte Rohdaten werden niemals automatisch durch Defaults ueberschrieben. Fehler nennen Bereich und Handlungsoption, ohne sensible Payloads in Logs oder Dokumentation zu kopieren.

## Architektur-Zielbild

### Balance

```text
Persistierte Inputs + Basis-State
        |
        v
schreibfreie Preview auf Kopie
        |
        v
vorlaeufige Engine-Aktion
        |
        v
3-Bucket/Bestandsreservierung
        |
        v
finales Settlement + Reconciliation
        |
        +------> Render/Diagnose (candidateState wird verworfen)
        |
        `------> expliziter Jahrescommit
                   -> Perioden-/Fingerprintcheck
                   -> bestaetigter Snapshot
                   -> genau ein State-Write
                   -> Post-Write-Validierung
```

### Simulator, Sweep und Optimierer

```text
Profilinputs je Profil normalisieren
        -> Asset-/Provenienz-Reconciliation
        -> kanonischer SimulationRequest
        -> gemeinsamer Sampling-/Life-/Care-Contract
        -> gemeinsamer Jahresstep
        -> versioniertes RunResult
             |-> MC-Aggregate
             |-> Sweep-Metriken
             `-> Optimizer-Objective und Apply-Fingerprint
```

Sweep und Optimierer duerfen keine fachlich abgespeckten Kopien des MC-Lebens-, Pflege-, Sampling- oder Horizonpfads besitzen. Spezifische Performance-Runner sind erlaubt, muessen aber denselben versionierten Request und dieselben Invarianten konsumieren.

## Offene und vorgeschlagene Entscheidungen

Die Spalte `Empfehlung` ist ein Planvorschlag, keine Nutzer- oder Reviewfreigabe.

| ID | Entscheidung | Empfehlung | Blockiert |
| --- | --- | --- | --- |
| D-01 | kritische Funktionen bis zum Fix technisch sperren oder nur warnen | Balance-3-Bucket, Sweep und Auto-Optimize bis zur jeweiligen Freigabe deutlich sperren; bestehende Daten weiter lesbar halten | Produkt-/Releaseentscheidung, nicht Planerstellung |
| D-02 | Preview-/Commit-Semantik | Preview immer schreibfrei; nur periodengebundener Jahresabschluss committed fachlichen State; Eingaben separat speicherbar | Slice 1 |
| D-03 | Ownership der 3-Bucket-Finalisierung | 3-Bucket vor genau einem finalen Settlement; kein steuerrelevantes Postprocessing danach | Slice 2 |
| D-04 | positives Aggregat eines Profils ohne Detailtranchen bei Hybridhaushalt | bevorzugt fail-closed, bis ein steuerlich gekennzeichneter Fallbackvertrag beschlossen ist; niemals still weglassen | Slice 4 |
| D-05 | Goldstrategie im Profilverbund | absolute Profilziele `sum(profileGoldBase * profileTargetPct)` summieren; `profileGoldBase` ist dieselbe frei investierbare Basis, die der Engine fuer dieses Profil als Depot inklusive Gold plus operative Liquiditaet uebergeben wird, jedoch ohne zweckgebundenen Pflegebucket; daraus nur adapterseitig eine Haushaltsquote bilden | Slice 4 |
| D-06 | Worst-5-%-Drawdown | P95 eines nichtnegativen Drawdown-Verlustmasses, groesser = schlechter; Terminalruin = 100 % | Slice 9 |
| D-07 | Zufallspfade fuer Parametervergleich | Common Random Numbers je Run-Index ueber Kombinationen; zusaetzlich Stabilitaets-/Unsicherheitsausweis | Slice 9 |
| D-08 | direkter VPW-Horizont bei aktuarischem Dynamic Flex in normalem MC und Optimizer | bei aktuarischer Methode aus UI/Optimierungsraum entfernen; nur im expliziten Modus `direct` wirksam anbieten | Slice 10 |
| D-09 | korrupte Profil-/Pflegedaten | fail-closed, Rohpayload erhalten, Recovery-Export vor bestaetigtem Reset | Slice 13 |
| D-10 | Kirchensteuer | nicht in einem technischen Sammelfix aendern; eigener Steuercontract mit offizieller Referenz und Fachreview | Slice 15 beziehungsweise Folgeplan |
| D-11 | Alarmstaerke bei Runway-Unterdeckung | entweder als bewusste Konstante dokumentieren oder konkrete monotone Funktion fachlich festlegen; tote Formel entfernen | Slice 15/gegebenenfalls Folge-Slice |
| D-12 | Netto- versus Bruttoausgaben | Nettoverbrauch und Bruttoausgaben als getrennte Kennzahlen definieren; keine stille Saldierungsentscheidung | Slice 15 |
| D-13 | manuelles CSV-ATH | ohne nachgewiesene ausreichende Historie nur als `windowHigh`, nicht als ATH; Stichtag und Scope persistent | Slice 12 |
| D-14 | Definition `Median Withdrawal Rate` | vor Umsetzung Nenner, lebende/terminale Jahre und Aggregationsreihenfolge festlegen; empfohlen: pro Run die realisierte Jahresquote aggregieren und danach den Median ueber Run-Kennwerte bilden | Slice 11 |
| D-15 | Reconciliation realer Verkaufserloese | festlegen, wann ein bestaetigter Verkaufserloes als Cash verbleibt und wann er als verbraucht gilt | Slice 15/Folgeplan |
| D-16 | mehr als zwei Personen | Geltungsbereich sichtbar auf zwei demografische Personen begrenzen oder eigenes Mehrpersonenmodell planen | Slice 15/Folgeplan |
| D-17 | Profilalter-Ownership | jedes Profil behaelt sein eigenes Alter; ein Haushaltsalter darf nur als explizit abgeleitete Enginegroesse existieren | Slice 13 |
| D-18 | Optimizer-Sampling/CAPE | kanonische Nutzerannahmen uebernehmen oder feste Optimizerannahmen vor Start und im Ergebnis ausweisen; nie still abweichen | Slice 10 und 15 |
| D-19 | Outcome mit 0 EUR bei erfolgreichem Status | Outcome-Status ist primaer; 0 EUR wird nicht allein wegen des Betrags aus „erfolgreiche Laeufe“ entfernt, muss aber separat als terminale Null ausgewiesen werden | Slice 6 |

## Umsetzungspakete und Reihenfolge

### Paket 1 - P0/P1: unmittelbare Entscheidungsintegritaet

Slices 1 bis 5 schliessen die Pfade, die State ohne Zeitablauf mutieren, unmoegliche Orders erzeugen oder Vermoegen massiv falsch initialisieren. Die verbindliche fachliche Reihenfolge fuer den Transaktionspfad ist `1 + 3 -> 5 -> 2`; Slice 4 kann nach Slice 3 unabhaengig vorbereitet werden. Kein P1-Simulator-/Optimierungsslice darf vor Abschluss der fuer ihn relevanten P0-Abhaengigkeiten freigegeben werden.

### Paket 2 - P1: Simulator, Sweep und Optimierung

Slices 6 bis 11 vereinheitlichen Zahlen-, Ergebnis-, Sampling-, Haushalts- und Optimierungsvertraege. Sweep und Optimierer bleiben bis zur jeweiligen Integrationsfreigabe experimentell beziehungsweise gesperrt.

### Paket 3 - P1/P2: Import, Profile und Recovery

Slices 12 bis 14 verhindern stille Aktivierung, Stale-Daten-Nutzung, Teilimporte und Datenverlust durch korrupte Persistenz.

### Paket 4 - Modellgrenzen und Gesamtintegration

Slices 15 und 16 trennen technische Korrektheit von fachlicher beziehungsweise externer Validierung und fuehren alle Abschlussgates aus.

## Slice-Uebersicht

Die Slice-Dateien werden gemaess `SLICE_EXECUTION_RULES.md` jeweils vor Beginn des konkreten Slice erstellt. Die hier genannten Dateinamen sind verbindliche Vorschlaege, aber noch keine vorhandenen Links.

| Nr. | Vorgesehene Slice-Datei | Titel | Prioritaet | Abhaengigkeit | Programmdateien max. | Status |
| ---: | --- | --- | --- | --- | ---: | --- |
| 1 | `SLICE_SUITE_DATA_01_BALANCE_PREVIEW_COMMIT.md` | Balance Preview-/Commit-Trennung | P0 | D-02 | 5 | geplant |
| 2 | `SLICE_SUITE_DATA_02_THREE_BUCKET_FINAL_ACTION.md` | Transaktionsbudgets, 3-Bucket Final Action und Steuer | P0 | 1, 3, 5, D-03 | 10 | geplant |
| 3 | `SLICE_SUITE_DATA_03_CANONICAL_NUMBERS.md` | Kanonische Zahlen, Fractional Lots und Nullgrenzen | P0 | keine | 6 | geplant |
| 4 | `SLICE_SUITE_DATA_04_PROFILE_ASSET_GOLD.md` | Verlustfreie Profilassets und Goldziele | P0/P1 | 3, D-04, D-05 | 6 | geplant |
| 5 | `SLICE_SUITE_DATA_05_ENGINE_INVARIANTS.md` | Engine-Spending, Floors, Flex und Rente | P1 | 3 | 7 | geplant |
| 6 | `SLICE_SUITE_DATA_06_RESULT_SIGN_SEMANTICS.md` | Nullwerte, negative Renditen und wahrheitsgetreue Darstellung | P1 | 3, 5, D-06, D-19 | 7 | geplant |
| 7 | `SLICE_SUITE_DATA_07_SWEEP_REQUEST_SAMPLING.md` | Kanonischer Sweep-Request und Sampling | P1 | 3, 5 | 6 | geplant |
| 8 | `SLICE_SUITE_DATA_08_SWEEP_HOUSEHOLD_RISK.md` | Partner, Pflege, Langlebigkeit und Tail Risk | P1 | 7 | 7 | geplant |
| 9 | `SLICE_SUITE_DATA_09_SWEEP_METRICS_COMPARABILITY.md` | Drawdown, Outcomes und faire Vergleiche | P1 | 6-8, D-06, D-07 | 9 | geplant |
| 10 | `SLICE_SUITE_DATA_10_AUTO_OPTIMIZE_FIDELITY.md` | Optimizer-Parameter und Apply-Paritaet | P1 | 6-9, D-08 | 8 | geplant |
| 11 | `SLICE_SUITE_DATA_11_AUTO_OPTIMIZE_METRICS.md` | Optimizer-Zielmetriken und Ranking | P1 | 9, 10, D-14 | 6 | geplant |
| 12 | `SLICE_SUITE_DATA_12_BALANCE_IMPORT_PROVENANCE.md` | Typisierte Balance-Importe und Marktprovenienz | P1 | 1, 3, D-13 | 5 | geplant |
| 13 | `SLICE_SUITE_DATA_13_PROFILE_RECOVERY.md` | Sichtbare Profilkorruption und sichere Recovery | P1 | 4, D-09 | 6 | geplant |
| 14 | `SLICE_SUITE_DATA_14_BUNDLE_BACKUP_VALIDATION.md` | Atomare Bundle-/Vollbackup-Wiederherstellung und Statevalidierung | P1 | 12, 13 | 8 | geplant |
| 15 | `SLICE_SUITE_DATA_15_MODEL_DECISIONS.md` | Fachentscheidungen und Modelltransparenz | Entscheidung | 6, 10-12, D-10 bis D-13, D-15, D-16, D-18, D-19 | 4 | geplant |
| 16 | `SLICE_SUITE_DATA_16_INTEGRATION_DOCUMENTATION.md` | Gesamtintegration, Browser, Evidenz und Doku | P1/P2 | 1-15 | 3 | geplant |

### Abhaengigkeitsbild

```text
01 ───────────────────────┐
                          v
03 ──> 05 ───────────────> 02
 |
 ├──> 04
 ├──> 06 ──> 09
 ├──> 07 ──> 08 ──> 09 ──> 10 ──> 11
 `──> 12

04 ──> 13
12 + 13 ──> 14
10 + 11 + 12 + Entscheidungen ──> 15
01-15 ──> 16
```

Innerhalb unabhängiger Aeste ist Parallelisierung nur nach separatem Branch-/Scope-Check erlaubt. Es bleibt genau ein aktiver Codex-Implementierungsslice; parallele Reviewer duerfen read-only analysieren.

## Slice 1 - Balance Preview-/Commit-Trennung

**Findings:** BAL-01  
**Prioritaet:** P0  
**Ziel:** Berechnung, Eingabepersistenz und fachliche Jahresfortschreibung werden explizit getrennt.

### Geplanter Scope

Voraussichtlich betroffene Programmdateien:

- `app/balance/balance-main.js`
- `app/balance/balance-update-pipeline.js`
- `app/balance/balance-main-profilverbund.js`
- gegebenenfalls `app/balance/balance-storage.js`
- gegebenenfalls der bestehende Jahresprozess-Coordinator

Nicht-Scope:

- keine Aenderung der Flex-, VPW- oder Steuerformeln;
- keine 3-Bucket-Korrektur;
- keine Migration historischer States ausser der minimal noetigen Trennung von Basis- und Candidate-State.

### Umsetzungsschritte

1. Alle Aufrufer von `update()` nach Anlass inventarisieren: Initialrender, Eingabe, Profilwechsel, Import-Dry-run, Jahresupdate, Jahresabschluss.
2. Einen expliziten Modusvertrag einfuehren, beispielsweise `preview`, `persist_inputs` und `commit_period`; Boolean-Kombinationen ohne klare Semantik vermeiden.
3. Preview immer auf einer tief genug isolierten Kopie des Basis-State rechnen lassen.
4. Eingaben bei Bedarf separat speichern, ohne `lastState`, Profil-`taxState` oder Haushalts-Guardrail-State zu ersetzen.
5. Periodencommit an den vorhandenen Jahresprozess, Snapshot und Perioden-ID binden.
6. Single- und Multi-Profil denselben State-Lifecycle verwenden lassen.
7. Veraltete Candidate-States per Input-/State-Fingerprint blockieren.

### Akzeptanzkriterien

- O-01 und O-02 sind gruen.
- Initialrender, fuenf identische Eingaben und Profilwechsel veraendern keinen fachlichen State.
- Verlustvortrag 20.000 EUR bleibt nach beliebig vielen Vorschauen 20.000 EUR.
- Ein Flex-Budget von 3 Jahren bleibt nach Vorschauen 3 und wird erst beim Commit fortgeschrieben.
- VPW-Streak, Flex-Glättung und letzte Entnahme bleiben bis Commit unveraendert.
- Nutzereingaben koennen weiterhin reload-fest gespeichert werden, ohne Candidate-State mitzuschreiben.
- Ein Import-Dry-run bleibt vollstaendig mutationsfrei.
- Derselbe Periodencommit kann keinen zweiten State-Uebergang erzeugen.

### Tests und Gates

- neuer Single-/Multi-Profil-Wiederholungscontract;
- `tests/balance-ui-orchestration.test.mjs`;
- `tests/balance-annual-workflow-contract.test.mjs`;
- `tests/balance-annual-period.test.mjs`;
- `tests/balance-storage-contract.test.mjs`;
- `tests/core-tax-settlement.test.mjs` beziehungsweise tatsaechlich vorhandener fokussierter Steuerlauf;
- `npm test`;
- `npm run test:browser`.

### Stop-/Reviewpunkt

Stop, wenn neben dem periodengebundenen Jahresabschluss ein zweiter fachlicher Commitzeitpunkt benoetigt wird oder bestehende Snapshot-/Recovery-Semantik geaendert werden muesste. D-02 muss dann vor Coding erweitert werden.

## Slice 2 - Transaktionsbudgets, 3-Bucket Final Action und Steuer

**Findings:** BAL-02 bis BAL-05 sowie ENG-02, ENG-03 und ENG-09  
**Prioritaet:** P0  
**Ziel:** 3-Bucket erzeugt genau eine bestandsmoegliche, steuerlich finalisierte und in UI/State konsistente Aktion.

### Geplanter Scope

Voraussichtlich betroffene Programmdateien:

- `engine/transactions/three-bucket-logic.mjs`
- `engine/transactions/sale-engine.mjs`
- `engine/transactions/transaction-opportunistic.mjs`
- `engine/transactions/transaction-surplus.mjs`
- `app/balance/balance-action-postprocessor.js`
- `app/balance/balance-main-profilverbund.js`
- `app/balance/balance-update-pipeline.js`
- gegebenenfalls `app/profile/profilverbund-action-attribution.js`
- gegebenenfalls `engine/tax-settlement.mjs`
- gegebenenfalls ein neuer DOM-freier Final-Action-/Reconciliation-Helfer

Nicht-Scope:

- keine neue Assetklasse;
- keine neue Steuerformel;
- kein Simulator-UI-Redesign;
- keine Aenderung der 3-Bucket-Strategie jenseits der belegten Signal-, Bestands-, Bedarfs- und Settlementvertraege.

### Umsetzungsschritte

1. Reale Aktienrendite als expliziten, endlichen Input mit dokumentierter Einheit in den 3-Bucket-Vertrag aufnehmen.
2. Zielbedarf aus der tatsaechlich entschiedenen Portfolioentnahme nach Renten-, Floor- und Flexlogik ableiten.
3. Equity-Gesamtbudget 0 und `maxSkimPctOfEq=0` als harte Nullgrenzen durch alle Transaktionspfade erhalten.
4. Gold-Headroom einmal aggregiert berechnen und ueber alle Goldlots als gemeinsames Restbudget verbrauchen.
5. Vorhandene Action-Verkaeufe lotweise reservieren und Refill ausschliesslich auf Restbestaenden planen.
6. Alle Verkaufsquellen in ein finales, eindeutiges Ledger ueberfuehren; doppelte Eintraege derselben Lot-ID entweder aggregieren oder kontrolliert ablehnen.
7. Im Profilverbund die finalen Verkaufsquellen zuerst attribuieren, danach je Profil mit dessen Verlustvortrag, Pauschbetrag und Steuersatz settlen und erst anschliessend zum Haushaltswert aggregieren.
8. Nettoerloes, Liquiditaetsquellen und Verwendungen getrennt reconciliieren; keine zweite 3-Bucket-Ausfuehrung.
9. UI, Diagnose und Candidate-State nur aus dieser finalen Aktion aufbauen.
10. Kapazitaets-, Provenienz- oder Reconciliationfehler fail-closed ausgeben.

### Akzeptanzkriterien

- O-03, O-04, O-08 und O-09 sind fuer die Transaktionsgrenzen gruen.
- −30 % Rendite bei Trigger −15 % wird als schlechtes Jahr erkannt.
- Der 300.000-EUR-Repro kann insgesamt und je Lot nicht mehr als 300.000 EUR verkaufen.
- Eine bereits mit 80.000 EUR belegte 100.000-EUR-Tranche stellt maximal weitere 20.000 EUR bereit.
- Equity-Budget 0 und `maxSkimPctOfEq=0` erzeugen exakt 0 EUR opportunistischen Equityverkauf.
- Mehrere Goldlots koennen den gemeinsamen Gold-Headroom nicht mehrfach verbrauchen und kein Lot ueber seinen Marktwert verkaufen.
- Deckt Rente Floor und Flex vollstaendig, ist das Entnahmeziel 0 und es entsteht kein Equity-finanzierter Refill.
- `sum(nonLiquidSaleSources)`, `bruttoVerkaufGesamt`, Rohsteuer, finale Steuer, Verlustvortrag, Netto und Verwendungen reconciliieren innerhalb 0,01 EUR; vorhandene Cashquellen werden separat bilanziert.
- O-04 wird gegen die unabhaengige Handrechnung 1.314,14 EUR Steuer und Verlustvortrag 0 validiert, nicht nur gegen interne Summengleichheit.
- Kein post-settlement Modul veraendert eine Verkaufsquelle.
- Der vorhandene Orchestrierungstest verwendet ein echtes Produktionsresultat und kein erfundenes `newState.marketData`-Feld.
- Single- und Multi-Profil liefern fuer einen wirtschaftlich identischen Einprofilhaushalt dieselbe finale Action.

### Tests und Gates

- `tests/3bucket-config.test.mjs`;
- `tests/3bucket-refill.test.mjs`;
- `tests/balance-ui-orchestration.test.mjs`;
- `tests/balance-decumulation.test.mjs`;
- `tests/profilverbund-balance.test.mjs`;
- `tests/transaction-tax.test.mjs`;
- `tests/transaction-gold-liquidity.test.mjs`;
- `tests/transaction-engine-rebal.test.mjs`;
- `tests/transaction-quantization.test.mjs`;
- `tests/simulator-3bucket-ui-e2e.test.mjs` fuer Paritaets-/Nichtregressionsfaelle;
- neuer E2E-Repro mit echter Engine, Steuer und Verlustvortrag;
- `npm run build:engine`, falls `engine/` oder EngineAPI geaendert wird;
- `npm test`;
- `npm run test:browser`.

### Stop-/Reviewpunkt

Stop, wenn die Umsetzung eine oeffentliche EngineAPI-Semantik jenseits des genehmigten Final-Action-Vertrags aendert, mehr als zehn geplante Programmdateien benoetigt oder Backtest/FlowDelta ausserhalb des vorab dokumentierten Transaktions-/3-Bucket-Deltas abweicht. Dann Slice 2 zwingend in `Transaktionsbudgets/Inventar` und `Balance-Integration/Settlement` teilen.

## Slice 3 - Kanonische Zahlen, Fractional Lots und Nullgrenzen

**Findings:** DAT-01, DAT-04, BAL-06 und die cross-layer Null-/Dezimalanteile von ENG-03/ENG-09/OPT-04  
**Prioritaet:** P0  
**Ziel:** Display-Parsing endet an der UI-/Importgrenze; kanonische Numbers und gueltige Grenzwerte bleiben unveraendert.

### Geplanter Scope

Voraussichtlich betroffene Programmdateien:

- `app/simulator/simulator-portfolio-format.js`
- `app/simulator/simulator-portfolio-init.js`
- `app/simulator/simulator-input-strategy.js`
- `app/balance/balance-reader.js`
- gegebenenfalls ein gemeinsamer strikter Zahlenparser
- gegebenenfalls `types/tranche-contract.js`, falls der Number-vs.-String-Contract dort expliziter werden muss

Nicht-Scope:

- keine allgemeine Lokalisierungsbibliothek;
- keine Umbenennung von `detailledTranches`;
- keine Aenderung fachlicher Min-/Max-Grenzen ohne Doku-/HTML-Abgleich.

### Umsetzungsschritte

1. Parserpfade fuer DOM-Strings, CSV-/JSON-Strings und kanonische Numbers trennen.
2. Numbers nur auf Endlichkeit und fachliche Bounds pruefen; keine Separatorheuristik anwenden.
3. Prozentwerte mit der im HTML erlaubten Praezision lesen, nicht pauschal als Integer.
4. Falsy-Defaults durch nullish-/strukturierte Missingnesspruefung ersetzen.
5. UI-, Profil-, Worker- und Engine-Domains tabellarisch abgleichen.
6. Mehrdeutige Legacy-Strings explizit migrieren oder ablehnen; nicht raten.

### Akzeptanzkriterien

- O-05 und O-08 sind gruen.
- `shares=1.234` bleibt Number 1,234; Marktwert und Cost Basis bleiben konsistent.
- Alle Simulationseinstiege initialisieren denselben kanonischen Lotwert.
- `targetEq=0`, `maxSkim=0`, `maxBear=0`, `cashMonths=0` bleiben 0.
- Prozent 2,5 bleibt 2,5, sofern der jeweilige dokumentierte Contract es erlaubt.
- Fehlend, leer, ungueltig, 0 und negativ sind in Tests getrennt.
- Mehrdeutige Strings liefern einen sichtbaren Validierungs-/Migrationsstatus.

### Tests und Gates

- `tests/tranche-contract.test.mjs`;
- `tests/simulator-portfolio-tranches.test.mjs`;
- `tests/portfolio.test.mjs`;
- `tests/balance-reader.test.mjs`;
- bestehende Simulator-Input-Reader-/Orchestrierungstests;
- neuer Fractional-Lot-Durchstichtest ueber Simulation, Backtest, MC, Sweep und Optimizer;
- `npm test`;
- `npm run test:browser`.

### Stop-/Reviewpunkt

Stop, wenn gespeicherte Legacy-Strings nicht eindeutig migrierbar sind oder UI und Engine fuer denselben Parameter verschiedene Bounds/Einheiten verwenden.

## Slice 4 - Verlustfreie Profilassets und Goldziele

**Findings:** DAT-02, DAT-03  
**Prioritaet:** P0/P1  
**Ziel:** Profilaggregation erhaelt jedes Asset genau einmal und berechnet profilbezogene Goldziele auf der richtigen Vermoegensbasis.

### Geplanter Scope

Voraussichtlich betroffene Programmdateien:

- `app/simulator/simulator-profile-inputs.js`
- `app/simulator/simulator-portfolio-init.js`
- `app/balance/balance-main-profilverbund.js`
- `app/balance/balance-reader.js`
- gegebenenfalls `app/profile/profilverbund-balance.js`
- gegebenenfalls `app/profile/profile-asset-values.js` oder `app/balance/balance-main-profile-sync.js`; vor dem Edit ist festzulegen, welche eine zusaetzliche Datei tatsaechlich erforderlich ist

### Umsetzungsschritte

1. Aggregation je Profil und Assetklasse vor Haushaltsmerge normalisieren.
2. `missing`, explizit leer, valide Details und korrupt als getrennte Zustaende transportieren.
3. Vor Simulation eine Vermoegens-/Provenienz-Reconciliation ausfuehren.
4. D-04 implementieren: Hybridprofile blockieren oder nur ueber einen explizit markierten Fallback aufnehmen.
5. Goldziel und Gold-Floor zunaechst je Profil in Euro berechnen und erst danach summieren.
6. Aktives UI-Profil aus der Haushaltsstrategie entfernen; nur ausgewaehlte Profilinputs duerfen wirken.
7. Die D-05-Goldbasis je Profil explizit diagnostizieren und Pflegebucket-/sonstige zweckgebundene Werte ausschliessen.

### Akzeptanzkriterien

- O-06 und O-07 sind gruen.
- Der Reprohaushalt initialisiert 290.000 EUR oder wird gemaess D-04 sichtbar blockiert; niemals still 110.000/140.000 EUR.
- Detailtranchen eines Profils ersetzen keine Aggregate eines anderen Profils.
- Detail-Geldmarkt und Aggregat desselben Profils werden nicht doppelt gezaehlt.
- Korrupte Details fallen nicht still auf moeglicherweise veraltete Aggregate zurueck.
- Goldziel im 100.000/900.000-EUR-Fall betraegt 8.000 EUR.
- Wechsel des aktiven Profils aendert bei gleicher Verbundauswahl weder Goldziel noch Action.

### Tests und Gates

- `tests/simulator-multiprofile-aggregation.test.mjs`;
- `tests/simulator-portfolio-tranches.test.mjs`;
- `tests/profile-asset-values.test.mjs`;
- `tests/profilverbund-profile-gold-overrides.test.mjs`;
- `tests/profilverbund-balance.test.mjs`;
- Matrix: Details+Details, Details+Aggregate, Details+missing, explizit leer, korrupt, Cash und Geldmarkt;
- `npm test`;
- `npm run test:browser`.

### Stop-/Reviewpunkt

D-04 und D-05 muessen vor Coding entschieden sein. Stop, wenn mehr als sechs Programmdateien erforderlich werden, die Asset- und Goldteile nicht innerhalb des Slice getrennt reviewbar bleiben oder ein Fallback eine unbekannte Cost Basis/TQF als scheinbar exakte Steuerbasis verwenden wuerde. Dann Slice in `Profil-Assetaggregation` und `Profil-Goldstrategie` teilen.

## Slice 5 - Engine-Spending, Floors, Flex und Rente

**Findings:** ENG-01, ENG-04 bis ENG-06 und ENG-08; ENG-07 bleibt bis D-11 als Entscheidung separat  
**Prioritaet:** P1  
**Ziel:** Spending-State unterscheidet fehlend von 0, erhaelt harte Floors und verarbeitet Rente genau einmal.

### Geplanter Scope

Voraussichtlich betroffene Programmdateien, maximal sieben:

- `engine/planners/flex-budget-policy.mjs`
- `engine/planners/spending-policy-pipeline.mjs`
- `engine/planners/wealth-reduction.mjs`
- `engine/planners/SpendingPlanner.mjs`
- `engine/planners/spending-policy-helpers.mjs`
- `engine/validators/InputValidator.mjs`
- gegebenenfalls `engine/core.mjs`

### Umsetzungsschritte

1. Initial-/Missing-State von gueltigem erschöpftem State 0 trennen.
2. Flex-Budget nur durch explizite Recharge-Regel auffuellen.
3. Rentenverrechnung auf genau eine Ownership-Stelle reduzieren; wirtschaftlich gleiche Nettoentnahmen muessen gleich bewertet werden.
4. Erstjahresquote aus aktuellem Bedarf und Depot berechnen, sofern alle Werte vorliegen.
5. Floor nach Quantisierung wieder als harte Untergrenze anwenden; Rundung diagnostizieren.
6. aktive Rente strikt validieren; kein erfolgreicher Output mit nichtendlichen Zahlen.

### Akzeptanzkriterien

- O-19 ist gruen.
- Missing Flex-State initialisiert exakt auf das konfigurierte Maximum; explizit 0 bleibt im Stress 0 und steigt in einem inaktiven Regime nur um `recharge / annualCap` bis zum Maximum.
- Der Referenzfall mit 24.000 EUR Nettoentnahme auf 100.000 EUR Depot berechnet im ersten Jahr exakt 24 % Entnahmequote.
- Zwei wirtschaftlich identische Nettoentnahmefaelle mit/ohne Rente liefern dieselbe handberechnete Nettoentnahme und denselben daraus erwarteten Wealth-Factor, nicht nur denselben Implementierungsoutput.
- Eine kritische Erstjahresquote loest anhand derselben Schwellen dieselbe Warnstufe wie dieselbe Folgelaufquote aus.
- Floor 25.000 EUR kann durch Monatsquantisierung nicht auf 24.000 EUR sinken.
- aktive Rente `undefined`, `NaN`, `Infinity` oder negativ erzeugt strukturierten Validierungsfehler.
- `minimumFlexAnnual` wird nicht still geklemmt.

### Tests und Gates

- `tests/spending-planner.test.mjs`;
- `tests/spending-quantization.test.mjs`;
- `tests/core-negative-contracts.test.mjs`;
- `tests/balance-dynamic-flex-gate.test.mjs`;
- mehrjaehrige Flex-Budget-Golden-Sequence;
- Vorher-/Nachher-Backtest- und Snapshot-Delta-Ledger;
- `npm run build:engine`;
- `npm test`.

### Stop-/Reviewpunkt

Sobald eine achte Programmdatei oder eine nicht bereits spezifizierte Engine-Semantikaenderung erforderlich wird, muss der Slice vor Coding neu geschnitten werden. Jede unerwartete Snapshot-, Backtest- oder FlowDelta-Abweichung stoppt.

## Slice 6 - Nullwerte, negative Renditen und wahrheitsgetreue Darstellung

**Findings:** SIM-01 bis SIM-06  
**Prioritaet:** P1  
**Ziel:** Ergebnisdaten behalten Null, Vorzeichen, Terminalzustand, Nenner und Zeitachse ohne Falsy- oder Anzeigeverfaelschung.

### Geplanter Scope

Voraussichtlich betroffene Programmdateien:

- `app/simulator/simulator-year-result.js`
- `app/simulator/simulator-accumulation-year.js`
- `app/simulator/simulator-health-bucket.js`
- `app/simulator/simulator-engine-direct-utils.js`
- `app/simulator/simulator-portfolio-chart.js`
- `app/simulator/simulator-heatmap.js`
- gegebenenfalls `app/simulator/monte-carlo-aggregates.js`

Nicht-Scope:

- keine neue Kapitalmarktverteilung;
- keine Neudefinition von Ruin ausser der expliziten Terminal-/Missingness-Korrektur;
- kein allgemeines Chart-Redesign.

### Umsetzungsschritte

1. Falsy-Defaults in allen entscheidungsrelevanten Jahresfeldern durch nullish-/endliche Pruefung ersetzen.
2. Signed-Flow-Helfer von nichtnegativen Bestandsnormalisierern trennen.
3. Negative Cashrendite im Anspar- und Pflegepfad als echtes Delta buchen und FlowDelta pruefen.
4. Lohnwachstum 0 als gueltig erhalten.
5. Terminale Nullpunkte im Chart und in Drawdown-/Outcome-Reihen behalten.
6. Heatmap-Input explizit als `counts` oder `shares` versionieren; Nenner mitfuehren.
7. Erfolg nicht allein aus `finalWealth > 0` ableiten, sondern aus dem kanonischen Outcome gemaess Entscheidung zu SIM-06.

### Akzeptanzkriterien

- O-10 und O-22 sind gruen.
- Runway 0, Flexrate 0 und Coverage 0 bleiben 0.
- Fehlende Werte werden nicht als positive Idealwerte angezeigt.
- Ein Jahr mit 0 Flex zaehlt als Jahr ohne Flex.
- 100.000 EUR bei −0,5 % ergeben in Ansparpfad und Pflegebucket 99.500 EUR.
- Lohnwachstum 0 veraendert eine 12.000-EUR-Sparrate nicht.
- Verlauf 100.000 -> 50.000 -> 0 zeigt alle drei Punkte auf der originalen Zeitachse.
- Heatmap-Count 1 bei 100 Runs wird 1 %, nicht 100 %.
- Ein erfolgreicher Outcome mit 0 EUR wird gemaess dokumentiertem Outcome-Contract konsistent aggregiert und beschriftet.
- Runway 0, Flexrate 0 und Coverage 0 werden im konkreten Jahresfixture exakt als 0 gespeichert und in nachgelagerten Stress-/Minimum-KPIs beruecksichtigt.

### Tests und Gates

- `tests/results-metrics.test.mjs`;
- `tests/results-renderers.test.mjs`;
- `tests/simulator-heatmap.test.mjs`;
- `tests/health-bucket.test.mjs`;
- `tests/simulator-backtest.test.mjs`;
- `tests/historical-backtest-metrics.test.mjs`;
- handberechnete Null-/Negativ-/Terminal-Fixtures;
- `npm test`;
- `npm run test:browser`;
- `npm run test:coverage` als Risikoinventar.

### Stop-/Reviewpunkt

D-19 muss vor der Outcome-Aenderung entschieden sein. Stop, wenn eine Korrektur weitere historische Outcome-Definitionen oder Pflegebucket-Untergrenzen fachlich neu definiert. Bestehende Backtest-UI-Dateien duerfen erst auf sauberem Feature-Branch beruehrt werden.

## Slice 7 - Kanonischer Sweep-Request und Sampling

**Findings:** SWP-02, SWP-06, SWP-07 und SWP-11  
**Prioritaet:** P1  
**Ziel:** Sweep konsumiert denselben normalisierten Samplingrequest wie Monte Carlo und protokolliert die tatsaechlich ausgefuehrte Methode.

### Geplanter Scope

Voraussichtlich betroffene Programmdateien:

- `app/simulator/simulator-sweep.js`
- `app/simulator/sweep-runner.js`
- `app/simulator/monte-carlo-parameters.js`
- `app/simulator/simulator-engine-helpers.js` oder der aktuelle Sampling-Helfer
- gegebenenfalls `app/simulator/mc-year-sampling.js`
- gegebenenfalls `workers/mc-worker.js`

### Umsetzungsschritte

1. Einen versionierten, DOM-freien SweepRequest aus dem kanonischen MC-Parametervertrag ableiten.
2. UI-, Main-Thread- und Workerpfad denselben Normalizer nutzen lassen.
3. Samplingmethode ueber expliziten Dispatch abbilden; unbekannte Methode ablehnen, nicht in Markov fallen lassen.
4. Stationary-Sampler aus dem bewaehrten MC-Pfad wiederverwenden.
5. Startjahresmodus, Filter, CAPE-/Recency-Option und Estimated-History-Ausschluss vollstaendig transportieren.
6. Seed 0 erhalten; Default nur bei Missingness.
7. Normalisierte Parameter, Contractversion und Samplingdiagnose in Ergebnis/Export aufnehmen.

### Akzeptanzkriterien

- O-11 ist gruen.
- `stationary` und `regime_markov` laufen nachweislich durch verschiedene Sampler.
- Ein Sweep mit genau einer Kombination stimmt bei gleichem Request/Seed mit dem entsprechenden MC-Samplingpfad ueberein.
- Seed 0 ist reproduzierbar und unterscheidet sich von Seed 12345.
- Alle gezogenen Jahre erfuellen Startfilter und `excludeEstimated`.
- ungueltige Dauer, Runzahl, Blocklaenge, Methode oder Seed werden in Main und Worker identisch abgewiesen.
- Ergebnisprovenienz nennt Requested und Applied Samplingmethodik.

### Tests und Gates

- `tests/simulator-sweep.test.mjs`;
- `tests/monte-carlo-parameters.test.mjs`;
- `tests/monte-carlo-startyear.test.mjs`;
- `tests/monte-carlo-sampling.test.mjs`;
- `tests/monte-carlo-sampling-contract.test.mjs`;
- `tests/stationary-bootstrap-contract.test.mjs`;
- `tests/stationary-bootstrap-sampler.test.mjs`;
- Worker-Paritaetstest der vorhandenen Suite;
- `npm test`;
- `npm run test:browser`.

### Stop-/Reviewpunkt

Stop, wenn Sweep und MC nicht ohne Aenderung der bestehenden Samplingpraezedenz denselben Request nutzen koennen oder ein bisher dokumentierter Modus eine andere Einheit/Semantik besitzt.

## Slice 8 - Partner, Pflege, Langlebigkeit und Tail Risk im Sweep

**Findings:** SWP-03 bis SWP-05 und SWP-10  
**Prioritaet:** P1  
**Ziel:** Sweep verwendet denselben Haushalts-, Life-Event-, Pflege-, Horizon- und Tail-Risk-Vertrag wie Monte Carlo.

### Geplanter Scope

Voraussichtlich betroffene Programmdateien:

- `app/simulator/sweep-runner.js`
- `app/simulator/mc-life-events.js`
- `app/simulator/simulator-engine-helpers.js`
- der bestehende Dynamic-Flex-/Longevity-Horizon-Resolver
- `app/simulator/tail-risk-overlay.js`
- gegebenenfalls der bestehende Household-/Pension-Helfer; wird eine weitere Produktdatei noetig, ist vor dem Edit neu gegen die Tabellenobergrenze zu schneiden

Nicht-Scope:

- keine neue Mortalitaets- oder Pflegestatistik;
- keine Aenderung der Tail-Risk-Verteilung;
- keine Performanceoptimierung ohne Paritaetsnachweis.

### Umsetzungsschritte

1. Hart codiertes `p2Alive=false` entfernen und initialen Household-Life-State aus dem kanonischen Request erstellen.
2. P1/P2-Tod, Renten, Witwenleistung und Pflege ueber denselben Helfer wie MC berechnen.
3. Pflege-Floor und temporaeren Flexfaktor gemeinsam in den Jahresstep uebergeben.
4. Survival-Quantil ueber denselben dynamischen Horizon-Resolver anwenden.
5. Tail-Risk-Schedule einmal pro Run deterministisch erstellen und vor dem Jahresstep anwenden.
6. Applied-/Skipped-/Eventdiagnostik in SweepResult uebernehmen.

### Akzeptanzkriterien

- O-12, O-13 und der Sweep-Anteil von O-20 sind gruen.
- Partner aus versus Partner mit 5.000 EUR Monatsrente erzeugt vor dem festgelegten Todesjahr exakt 60.000 EUR zusaetzlichen Jahrescashflow; danach gilt exakt der konfigurierte Witwenanteil.
- P2-Tod und Witwenpfad werden an einem fest vorgegebenen Todesjahr mit erwarteten P1-/P2-States geprueft.
- Pflege-Flex 0,5 reduziert den Flexanteil wie im MC-Referenzpfad.
- Survival-Quantil 0,50 versus 0,99 liefert die aus dem kanonischen Resolver vorab berechneten effektiven Horizonte und daraus erwarteten VPW-Werte.
- sicher injizierter Tail-Schock erscheint in den exakt erwarteten Jahren mit den vorab festgelegten Return-/Inflationsdeltas sowie Applied-/Skipped-Zaehlern.
- Single-Profile ohne Pflege/Tail bleibt zum bisherigen korrekten MC-Pfad paritaetisch.

### Tests und Gates

- `tests/simulator-sweep.test.mjs`;
- `tests/monte-carlo-care-kpi.test.mjs`;
- `tests/care-meta.test.mjs`;
- `tests/longevity-horizon.test.mjs`;
- `tests/longevity-engine-runner.test.mjs`;
- `tests/tail-risk-contract.test.mjs`;
- `tests/tail-risk-overlay.test.mjs`;
- Worker-/Serial-Paritaet;
- `npm test`;
- `npm run test:browser`.

### Stop-/Reviewpunkt

Stop und Slice teilen, falls mehr als sieben Programmdateien erforderlich werden. Die Teilung erfolgt dann in `Household/Life/Care` und `Tail/Horizon`, ohne zwischenzeitlich einen als korrekt dargestellten Teil-Sweep freizugeben.

## Slice 9 - Drawdown, Outcomes und faire Sweep-Vergleiche

**Findings:** SWP-01, SWP-08 und SWP-09  
**Prioritaet:** P1  
**Ziel:** Sweep-Metriken haben richtige Tail-Richtung und Terminalwerte; Parametervergleiche trennen Wirkung von Zufallsrauschen.

### Geplanter Scope

Voraussichtlich betroffene Programmdateien:

- `app/simulator/simulator-results.js`
- `app/simulator/sweep-runner.js`
- `app/simulator/simulator-sweep.js`
- `app/simulator/simulator-heatmap.js`
- `app/simulator/simulator-optimizer.js`
- `app/simulator/simulator-visualization.js`
- `app/simulator/simulator-main-sweep-ui.js`
- gegebenenfalls `app/simulator/results-metrics.js`
- gegebenenfalls ein gemeinsamer Quantil-/Statistikhelfer; nur eine der beiden `gegebenenfalls`-Dateien darf als neunte Programmdatei hinzukommen

### Umsetzungsschritte

1. D-06 als versionierte Drawdowndefinition in Metrikmetadaten festschreiben.
2. Terminalwert vor Outcome-Abbruch in die Vermoegens-/Drawdown-Reihe aufnehmen.
3. Quantilfunktion an handberechneten Verteilungen pruefen; Richtung nicht aus UI-Label ableiten.
4. D-07 umsetzen: gleiche Run-Index-Seeds beziehungsweise gemeinsame vorgezogene Pfade je Kombination.
5. Runzahl, Streuung und bei Rankings mindestens Stabilitaets-/Unsicherheitshinweis ausweisen.
6. Constraints, Heatmap, Pareto und Best-Parameter-Auswahl denselben Metrikshape konsumieren lassen.

### Akzeptanzkriterien

- O-14 ist gruen.
- Reihe 1...100 liefert die schlechte 5-%-Schwelle gemaess D-06, nicht den guten Tail.
- Ruin vom positiven Peak auf 0 ergibt 100 % maximalen Drawdown.
- Zwei wirkungsgleiche Parameterkombinationen mit Common Random Numbers erhalten identische Raw-Pfade und Metriken.
- Unterschiede zwischen Kombinationen sind auf Input-/Parameterwirkung rueckfuehrbar; Seeds/Methodik sind exportiert.
- Ranking zeigt Runzahl und mindestens einen Unsicherheits-/Stabilitaetsindikator oder einen klaren experimentellen Hinweis.

### Tests und Gates

- `tests/simulator-sweep.test.mjs`;
- `tests/results-metrics.test.mjs`;
- `tests/monte-carlo-statistics.test.mjs`;
- handberechnete Drawdown-/Quantilfixtures;
- Same-Path/No-op-Parameter-Metamorphietest;
- `npm test`;
- `npm run test:browser`.

### Stop-/Reviewpunkt

D-06 und D-07 muessen freigegeben sein. Stop, wenn mehr als neun Programmdateien erforderlich werden, ein Metriklabel/Constraint eine andere Quantilrichtung voraussetzt oder Rankings ohne belastbaren Unsicherheitsausweis weiterhin als „beste“ Strategie bezeichnet werden sollen. Bei Dateigrenze wird in `Sweep-Metrikkern` und `Sweep-Consumer/UI` geteilt.

## Slice 10 - Optimizer-Parameter und Apply-Paritaet

**Findings:** OPT-01, OPT-03 bis OPT-05 und SIM-07  
**Prioritaet:** P1  
**Ziel:** Jeder bewertete Kandidat entspricht exakt dem angewendeten Kandidaten; No-op- und Schattenparameter werden entfernt oder sichtbar begrenzt.

### Geplanter Scope

Voraussichtlich betroffene Programmdateien:

- `app/simulator/auto-optimize-evaluate.js`
- `app/simulator/auto_optimize.js`
- `app/simulator/auto-optimize-param-meta.js`
- `app/simulator/auto-optimize-apply.js`
- gegebenenfalls `app/simulator/auto-optimize-params.js`
- gegebenenfalls Optimizer-Worker- oder UI-Modul; nur eine zusaetzliche Produktdatei innerhalb der Tabellenobergrenze
- `app/simulator/monte-carlo-runner.js`
- `Simulator.html`

### Umsetzungsschritte

1. Eine einzige Parameterregistry mit kanonischem Request-Key, Domain, UI-Ziel und Apply-Funktion erstellen.
2. `goldAllokationProzent` aus dem Evaluationspfad entfernen; `goldZielProzent` end-to-end verwenden.
3. Null-Caps per nullish- statt Falsy-Semantik erhalten.
4. D-08 in normalem MC und Optimizer umsetzen: Horizon nur bei passendem Modus anbieten oder aus UI/Optimierungsraum entfernen.
5. Evaluate- und Apply-Parameterfingerprint vor Uebernahme vergleichen.
6. Train-/Bestaetigungsseeds trennen und den kanonischen Seedvertrag an Slice 11 uebergeben.
7. D-18 umsetzen: feste Sampling-/CAPE-Annahmen entweder aus dem kanonischen Nutzerrequest uebernehmen oder vor Start und im Championbericht unuebersehbar als fixierte Optimierungsannahmen ausweisen.

### Akzeptanzkriterien

- O-15 ist fuer Parameter- und Apply-Fingerprint gruen; O-20 deckt Horizon ab.
- Gold 0 % und 25 % erzeugt verschiedene kanonische Requests und in einem geeigneten Szenario verschiedene Ergebnisse.
- angewendeter Champion besitzt exakt den evaluierten Fingerprint.
- Caps 0 bleiben 0.
- jeder angebotene Parameter besitzt einen Request-Perturbationstest und mindestens einen Kausalitaets-Witness.
- No-op-Parameter werden nicht evaluiert oder angewendet.
- Ergebnisbericht nennt Samplingmethode, Seeds, Runzahl, Datenfilter und alle fixierten Modellannahmen.
- Optimizer und normaler MC verwenden nicht still verschiedene Modellannahmen; eine bewusste Abweichung ist versioniert, sichtbar und getestet.

### Tests und Gates

- `tests/auto-optimizer.test.mjs`;
- `tests/auto-optimize-worker-contract.test.mjs`;
- `tests/longevity-optimizer-docs.test.mjs`;
- vorhandene Simulator-UI-Orchestrierungstests;
- Parameter-Kausalitaetsmatrix und Evaluate-vs.-Apply-Roundtrip;
- `npm test`;
- `npm run test:browser`;
- `npm run test:coverage`.

### Stop-/Reviewpunkt

Stop, wenn fuer eine angebotene Dimension kein kausaler Wirkungsnachweis konstruierbar ist, wenn Optimizer und normaler MC unterschiedliche Requests/Runner benoetigen oder mehr als acht Programmdateien erforderlich werden.

## Slice 11 - Optimizer-Zielmetriken und Ranking

**Findings:** OPT-02, OPT-06 bis OPT-08  
**Prioritaet:** P1  
**Ziel:** Jede Zielfunktion und jeder Tiebreaker verwendet die benannte, unabhaengig nachrechenbare Metrik mit expliziter Missingness.

### Geplanter Scope

Voraussichtlich betroffene Programmdateien:

- `app/simulator/auto-optimize-evaluate.js`
- `app/simulator/auto-optimize-metrics.js`
- `app/simulator/auto-optimize-utils.js`
- `app/simulator/auto_optimize.js`
- gegebenenfalls `app/simulator/monte-carlo-aggregates.js`
- gegebenenfalls Optimizer-Renderer oder -Worker; nur eine zusaetzliche Produktdatei innerhalb der Tabellenobergrenze

### Umsetzungsschritte

1. D-14 mit Nenner, eingeschlossenen Jahren und Aggregationsreihenfolge verbindlich dokumentieren.
2. P10, P25 und P50 aus den jeweils richtigen Rohverteilungen ableiten.
3. Median Withdrawal Rate aus den definierten Run-/Jahreswerten berechnen oder das Ziel entfernen.
4. zusaetzliches Quantilfeld tatsaechlich in den Selector aufnehmen oder aus UI/Contract entfernen.
5. Drawdown-Tiebreaker an den versionierten Resultshape aus Slice 9 binden.
6. Missingness, Stichprobengroesse und technische Fehllauefe von einer echten numerischen 0 unterscheiden.
7. Ranking an handberechneten Kandidaten pruefen und auf dem unabhaengigen Bestaetigungsseedset wiederholen.

### Akzeptanzkriterien

- O-21 und der Metrikanteil von O-15 sind gruen.
- bekannte Verteilung liefert exakt die handberechneten P10-/P25-/P50-Werte.
- Median Withdrawal Rate entspricht exakt D-14; zwei Kandidaten mit abweichender Entnahme erhalten den erwarteten Score.
- ein fehlendes Quantil-/Drawdownfeld kann nicht als guenstige 0 in Ranking oder Tiebreaker eingehen.
- realer Evaluate-Shape und Tiebreaker-Shape sind identisch versioniert.
- Ranking der kontrollierten Kandidaten entspricht der unabhaengigen Referenz und bleibt im Bestaetigungsset nachvollziehbar.

### Tests und Gates

- `tests/auto-optimizer.test.mjs`;
- `tests/auto-optimize-worker-contract.test.mjs`;
- `tests/results-metrics.test.mjs`;
- handberechnete P10-/P25-/P50-/Median-WR-Fixture;
- End-to-End-Ranking mit absichtlich vertauschter P10-/P25-Reihenfolge;
- `npm test`;
- `npm run test:browser`;
- `npm run test:coverage`.

### Stop-/Reviewpunkt

D-14 muss entschieden sein. Stop, wenn die erforderlichen Rohwerte im kanonischen MC-Ergebnis fehlen, die Metrik nur durch eine zweite abweichende Aggregation erzeugt werden koennte oder mehr als sechs Programmdateien erforderlich werden.

## Slice 12 - Typisierte Balance-Importe und Marktprovenienz

**Findings:** IMP-01 bis IMP-03  
**Prioritaet:** P1  
**Ziel:** Balance-Importe sind typisiert, periodengebunden und behalten Datenquelle/-stichtag bis nach Reload und Ergebnis.

### Geplanter Scope

Voraussichtlich betroffene Programmdateien:

- `app/balance/balance-binder-imports.js`
- `app/balance/balance-reader.js`
- `app/balance/balance-storage.js`
- `app/balance/balance-annual-marketdata.js`
- gegebenenfalls `app/balance/balance-annual-period.js`

### Umsetzungsschritte

1. Alle importierbaren Felder in einem versionierten Schema mit Typ, Bounds und optionaler Legacy-Migration inventarisieren.
2. Booleanwerte nur als echte Booleans oder ueber eine explizite symmetrische Migration akzeptieren; nie per Truthiness zuweisen.
3. Import-Preview und Engine-Dry-run auf normalisiertem Payload ausfuehren, ohne Persistenz.
4. Manuelle Markt-CSV an eine explizite Zielperiode und erwarteten Stichtag binden.
5. `asOf`, Quelle, Instrument, Importzeit, Periodenabdeckung, Zeilenzahl und High-/ATH-Scope gemeinsam persistieren.
6. D-13 umsetzen: unzureichende Historie nicht als ATH an die Engine reichen.
7. Nach Reload dieselbe Provenienz sichtbar und maschinenlesbar bereitstellen.
8. Erst nach bestaetigtem Recovery-Snapshot schreiben; Fehler stellt Inputs und Storage wieder her.

### Akzeptanzkriterien

- O-16 und O-17 sind gruen.
- `\"false\"`, `\"0\"`, `false`, `true`, fehlend und ungueltig besitzen explizite Tests; kein nichtleerer String aktiviert eine Checkbox.
- Importierte Dynamic-Flex-/Go-Go-Flags bleiben nach Reload semantisch identisch.
- Eine 2010 endende CSV kann keine 2025/2026-Planperiode speisen.
- Eine historische Datei kann nur in einem ausdruecklich bezeichneten historischen Modus verwendet werden.
- Vier Datenzeilen erzeugen kein als echtes ATH bezeichnetes Signal.
- Marktmetadaten bleiben nach Reload und in Diagnose/Export erhalten.
- Ungueltiger Import veraendert weder Live-Daten noch sichtbare Eingaben.

### Tests und Gates

- `tests/balance-reader.test.mjs`;
- `tests/balance-annual-marketdata.test.mjs`;
- `tests/balance-annual-period.test.mjs`;
- `tests/balance-storage-contract.test.mjs`;
- Browser-Import-Reject, Boolean-Roundtrip und Provenienz-nach-Reload;
- aktuelle, historische, stale, lueckenhafte und unzureichende ATH-Dateien als synthetische Fixtures;
- `npm test`;
- `npm run test:browser`.

### Stop-/Reviewpunkt

D-13 muss entschieden sein. Stop, wenn eine verlaessliche ATH-Aussage ohne zusaetzliche Datenquelle nicht moeglich ist; dann darf nur `windowHigh` exponiert werden oder der Lauf muss blockieren.

## Slice 13 - Sichtbare Profilkorruption und sichere Recovery

**Findings:** PER-01 bis PER-03 sowie DAT-05  
**Prioritaet:** P1  
**Ziel:** Profil-, Pflege- und Balancezustand werden bei Korruption nicht ersetzt oder ausgelassen; Raw-Recovery und Profilalter bleiben korrekt.

### Geplanter Scope

Voraussichtlich betroffene Programmdateien:

- `app/profile/profile-registry.js`
- `app/profile/profile-state.js`
- `app/profile/profile-storage.js`
- `app/profile/profilverbund-balance.js`
- gegebenenfalls `app/profile/profile-live-storage.js`
- gegebenenfalls `app/balance/balance-main-profilverbund.js`

### Umsetzungsschritte

1. Loadergebnisse als `valid`, `missing`, `empty`, `corrupt` und `unavailable` modellieren.
2. Parse-/Schemafehler duerfen Rohwerte nicht ueberschreiben und keinen Default automatisch speichern.
3. Current-ID, aktive ID und Registry vor Profilnutzung gemeinsam validieren.
4. Korrupte Pflege-/Balancezustände als profilbezogenen Blocker bis in Balance und Simulator transportieren.
5. Haushaltsaggregation bei einem fehlerhaften ausgewaehlten Profil vollstaendig blockieren; kein Teilhaushalt.
6. Profilalter gemaess D-17 aus dem richtigen per-profile Contract lesen und nicht mit dem aktiven Haushaltsalter ueberschreiben.
7. Recovery-Export vor einem bestaetigten Reset verlangen; `corrupt` und `unavailable` getrennt behandeln.

### Akzeptanzkriterien

- O-18 ist fuer Registry, Pflege und Profil-Balance gruen.
- Korrupte Registry bleibt bytegleich erhalten; kein automatischer Default-Write.
- `currentProfileId` existiert stets in der Registry oder der Lauf befindet sich sichtbar in Recovery.
- ein fehlgeschlagenes `loadProfile()` wird nicht als erfolgreich geladen gemeldet.
- korrupter aktivierter Pflegebucket wird niemals als deaktiviert/frei verfuegbar verwendet.
- ein korruptes ausgewaehltes Profil kann nicht still aus dem Haushalt entfallen.
- gespeichertes Profilalter bleibt bei Profilwechseln unveraendert.

### Tests und Gates

- `tests/profile-state.test.mjs`;
- `tests/profile-storage.test.mjs`;
- `tests/profile-navigation.test.mjs`;
- `tests/profilverbund-balance.test.mjs`;
- `tests/balance-ui-orchestration.test.mjs`;
- Browserfaelle fuer korrupte Registry, Pflege und Profil-Balance;
- `npm test`;
- `npm run test:browser`.

### Stop-/Reviewpunkt

D-09 und D-17 muessen entschieden sein. Stop, wenn Raw-Recovery nicht nachweisbar ist oder ein transienter IO-Fehler denselben Resetpfad wie fachliche Korruption verwenden wuerde.

## Slice 14 - Atomare Bundle-/Vollbackup-Wiederherstellung und Statevalidierung

**Findings:** PER-04 bis PER-06  
**Prioritaet:** P1  
**Ziel:** Profilbundle und Vollbackup werden vor Replace-all fachlich validiert und rollbackgesichert angewandt; der Inflationsfaktor wird an allen Eintrittsgrenzen validiert.

### Geplanter Scope

Voraussichtlich betroffene Programmdateien:

- `app/profile/profile-bundle-io.js`
- `app/shared/persistence-backup.js`
- `app/shared/persistence-key-policy.js`
- `app/shared/persistence-facade.js`
- `app/balance/balance-storage.js`
- `engine/planners/SpendingPlanner.mjs`
- `app/simulator/simulator-engine-helpers.js`
- gegebenenfalls ein gemeinsamer Backup-/Domainvalidator; falls er als achte Datei hinzukommt, darf keine weitere Programmdatei in den Slice aufgenommen werden

### Umsetzungsschritte

1. Bundle- und Backup-Envelope, App-ID, Schema-/Versionsmatrix, `recordCount`, Key-Allowlist und Werttypen validieren.
2. Bundle-Globals import- und exportseitig auf dieselbe Allowlist begrenzen.
3. Bekannte Domainvalidatoren fuer Registry, Profile, Balance, Pflege, Tranchen und Metadaten vor dem ersten Write aufrufen.
4. Cross-Key-Invarianten wie Current-ID-in-Registry pruefen.
5. beliebige Objekte nicht still stringifizieren; nur der kanonische Recordvertrag ist zulaessig.
6. Recovery-Snapshot vor Replace-all schreiben und verifizieren.
7. staged Restore, Post-Load-Validierung und vollstaendigen kompensierenden Rollback implementieren.
8. `cumulativeInflationFactor` in Import, Persistenz, Engine und Simulator endlich und strikt groesser 0 validieren; One-shot-Marker und Runnerfallback duerfen Domainvalidierung nicht umgehen.

### Akzeptanzkriterien

- O-18 ist fuer Bundle, Vollbackup und Inflationsstate gruen.
- falsche App-/Schema-Version, falscher RecordCount, unbekannter Key, ungueltige Registry oder Ghost-Current werden ohne Live-Mutation abgewiesen.
- `{ rs_profiles_v1: \"not-json\", rs_current_profile: \"ghost\" }` kann nicht erfolgreich importiert werden.
- Recovery-Snapshot ist vor dem ersten fachlichen Write lesbar bestaetigt.
- Bundle-Globals sind allowlistbeschraenkt; Current-ID muss in der neuen Registry existieren.
- Fehler in jeder Restorephase stellt alle erlaubten Live-Keys wieder her.
- Inflationsfaktor 0, negativ, `NaN` oder `Infinity` blockiert Laden/Berechnung sichtbar.
- bestehende korrupte Rohdaten werden nicht automatisch durch Defaults ersetzt.

### Tests und Gates

- `tests/persistence.test.mjs`;
- `tests/snapshot-archive.test.mjs`;
- `tests/snapshot-key-policy.test.mjs`;
- `tests/profile-storage.test.mjs`;
- `tests/balance-storage.test.mjs`;
- `tests/balance-storage-contract.test.mjs`;
- `tests/core-negative-contracts.test.mjs`;
- Domainmatrix und Fault-Injection fuer jeden Restore-Schritt;
- Browser-Recoveryfall;
- `npm test`;
- `npm run test:browser`;
- `npm run build:engine`, falls der Enginevalidator geaendert wird.

### Stop-/Reviewpunkt

Stop, wenn ein Backend keinen verifizierbaren Rollbackvertrag ermoeglicht oder mehr als acht Programmdateien erforderlich werden. In diesem Fall darf Replace-all nicht freigegeben werden; Bundle-/Backup-Transaktion und Inflations-Domainvalidierung sind dann in zwei Slices zu teilen.

## Slice 15 - Fachentscheidungen und Modelltransparenz

**Findings:** ENG-07, OPT-05, SIM-06-Entscheidungsanteil, IMP-03-Entscheidungsanteil sowie MOD-01 bis MOD-08  
**Prioritaet:** Entscheidung/P2  
**Ziel:** Technische Fehlerbehebung wird klar von Fach-, Steuer- und Forschungsentscheidungen getrennt; kein Modellrisiko wird durch gruene Tests als validiert dargestellt.

### Geplanter Scope

Primaer Dokumentation und gegebenenfalls kleine Anzeige-/Metadatenanpassungen, maximal vier Programmdateien:

- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/internal/archive/FORSCHUNGSVALIDIERUNGS_BACKLOG.md`
- relevante Referenz-/Nutzerdokumentation
- gegebenenfalls Ergebnis-/Export-Metadaten fuer Modellstatus

### Arbeitspakete

1. D-10 bis D-13 sowie D-15, D-16 und D-18 mit Nutzer und Reviewern entscheiden oder explizit offen lassen.
2. Kirchensteuerformel gegen die offizielle Formel in § 32d EStG als eigenen, versionierten Steuercontract abgrenzen.
3. vereinfachte versus gesetzesnahe Beispielrechnung und betroffene Pfade inventarisieren; keine Formel ohne Fachreview aendern.
4. Alarmstaerke entweder als bewusste Konstante dokumentieren oder eine monotone fachliche Funktion fuer einen separaten Engine-Slice spezifizieren.
5. Ausgaben-Saldierung, Reconciliation von Verkaufserloesen und >2-Personen-Demografie als getrennte Entscheidungen D-12, D-15 und D-16 mit Geltungsbereich erfassen.
6. Datenquellen, Stichtage, Einheiten und Kalibrierungsstatus fuer Markt, Pflege, Mortalitaet, Rente und Steuer in einer Matrix pflegen.
7. Sweep/Auto-Optimize bis zum Abschluss ihrer technischen und externen Validierung als experimentell kennzeichnen.
8. geschaetzte Historien, Returnvarianten, Kosten-/FX-Auslassungen und Asset-Geltungsbereich in Ergebnis- und Forschungsstatus trennen.

### Akzeptanzkriterien

- Jede Modellgrenze besitzt Owner, Quelle, Datenstand, Geltungsbereich, Status und naechsten Reviewtermin.
- Technisch getestet, intern plausibilisiert und extern validiert sind getrennte Statuswerte.
- Ergebnis/Export nennt mindestens Modell-/Datenversion und relevante experimentelle Flags.
- Kirchensteuerabweichung ist sichtbar dokumentiert oder Gegenstand eines separaten freigegebenen Steuerplans.
- Keine Pflege-, Renten- oder Renditeannahme wird ohne Quellen-/Stichtagsnachweis als aktuell bezeichnet.
- Offene Entscheidungen verbleiben explizit offen; Codex trifft sie nicht durch Implementation.

### Nachweise und Gates

- `npm run docs:evidence`;
- Konsistenzcheck gegen `README.md`, `docs/reference/TECHNICAL.md`, Modul-READMEs und `Handbuch.html`;
- offizielle Primaerquellen fuer Steuer-, Pflege- und Rentenwerte;
- keine Vollzitate oder personenbezogenen Daten;
- falls Programmdateien geaendert werden: passende fokussierte Tests plus `npm test` und `npm run test:browser`.

Mindestens zu pruefende amtliche Ausgangsquellen, jeweils mit im Slice dokumentiertem Abruf-/Datenstand:

- § 32d EStG: <https://www.gesetze-im-internet.de/estg/__32d.html>
- BMF/Lohnsteuer-Handbuch § 43a: <https://lsth.bundesfinanzministerium.de/lsth/2026/A-Einkommensteuergesetz/VI-Steuererhebung-36-47/3-Steuerabzug-vom-Kapitalertrag-KapSt-43-45e/Paragraf-43a/inhalt.html>
- BMG-Leistungsuebersicht Pflegeversicherung: <https://www.bundesgesundheitsministerium.de/themen/pflege/online-ratgeber-pflege/leistungen-der-pflegeversicherung/leistungen-im-ueberblick/seite>
- Destatis-Themenbereich Pflege: <https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Gesundheit/Pflege/_inhalt.html>
- Deutsche Rentenversicherung: <https://www.deutsche-rentenversicherung.de/>

### Stop-/Reviewpunkt

Jede Aenderung von Steuerformel, Mortalitaets-, Pflege-, Rendite- oder Kostenmodell erfordert einen eigenen freigegebenen Folgeplan beziehungsweise klar getrennten Slice mit fachlichem Oracle. Dieser Dokumentationsslice darf solche Semantik nicht nebenbei aendern.

## Slice 16 - Gesamtintegration, Browser, Evidenz und Dokumentation

**Findings:** alle technischen Findings sowie QA-01 und QA-02  
**Prioritaet:** P1/P2  
**Ziel:** Alle Einzelvertraege werden in echten Suite-Pfaden, Workerpfaden und Dokumentation gemeinsam nachgewiesen.

### Geplanter Scope

Produktivdateien nur, wenn ein belegter Integrationsadapter fehlt, maximal drei. Hauptscope sind Tests, synthetische Fixtures und Doku:

- `README.md`
- `docs/reference/TECHNICAL.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `engine/README.md`, falls Engine-Contracts geaendert wurden
- `tests/README.md`
- `docs/internal/PROJEKTUEBERSICHT.md`
- `Handbuch.html`, falls Nutzerworkflow oder Warnstatus geaendert wurde

### Umsetzungsschritte

1. Alle Golden-Orakel O-01 bis O-22 in einem Traceability-Inventar auf konkrete Tests abbilden.
2. echte Browserfaelle fuer Preview/Commit, 3-Bucket, Profilhybrid, Import/Recovery, Sweep und Optimizer ausfuehren.
3. Single-/Multi-Profil-, Main-/Worker-, MC-/Single-Sweep- und Evaluate-/Apply-Paritaet nachweisen.
4. jeden sichtbaren Sweep-/Optimizerparameter in einer Kausalitaetsmatrix pruefen.
5. Backtest-, Snapshot-, Monte-Carlo- und FlowDelta-Deltas je vorher freigegebener Semantikaenderung dokumentieren; keine pauschale Golden-Erneuerung.
6. Coverage-Inventar aktualisieren und weiterhin als Risiko-, nicht Freigabemetrik kennzeichnen.
7. Architektur, Modulownership, Workflows, Fehler-/Recovery-Verhalten und Modellgrenzen synchron dokumentieren.
8. Nutzungssperren aus D-01 nur fuer tatsaechlich freigegebene Bereiche aufheben.

### Globale Akzeptanzkriterien

- Jedes P0-/P1-Finding ist durch einen unabhängigen Regressionstest geschlossen oder mit Nutzerentscheidung als bewusstes Restrisiko markiert.
- Kein Test verwendet ein Produktionsfeld, das der reale Producer nicht erzeugt.
- O-01 bis O-22 sind gruen.
- Preview/Commit, Final Action, Assetreconciliation, Parameterfidelity und Recovery-Invarianten laufen auch im Browserpfad.
- jede Worker-/Serial-Differenz ist 0 oder durch einen dokumentierten numerischen Toleranzvertrag erklaert.
- keine unerwartete Snapshot-, Backtest- oder FlowDelta-Abweichung ist offen.
- Doku und Laufzeit verwenden identische Parameternamen, Einheiten und Modellstatus.
- keine privaten Finanzdaten, lokalen Pfade, Logs oder Exporte gelangen in Repositoryartefakte.

### Abschlussgates

```powershell
npm run build:engine
npm test
npm run test:browser
npm run test:coverage
npm run docs:evidence
git diff --check
```

`npm run build:engine` ist verpflichtend, sobald irgendein vorheriger Slice `engine/` oder die oeffentliche `EngineAPI` geaendert hat. `engine.js` ist dann ausschliesslich das durch `build-engine.mjs` erzeugte Artefakt und darf nie manuell korrigiert werden.

Kein Tauri-Release-EXE-Build in diesem Slice ohne separaten ausdruecklichen Nutzerauftrag. Falls Tauri-spezifische Persistenzdateien betroffen sind, sind die passenden Rust-/Adaptertests erforderlich; ein Releasebuild bleibt ein eigenes Gate.

### Stop-/Reviewpunkt

Stop bei jedem unerwarteten Delta, fehlender Testausfuehrbarkeit, Coverage-Inventarluecke, nicht reproduzierbarem Browserfall oder wenn eine Nutzungssperre ohne abgeschlossene technische und fachliche Kriterien aufgehoben werden soll.

## Vollstaendige Traceability

| Finding | Primaerer Slice | Ergaenzender Nachweis |
| --- | ---: | --- |
| BAL-01 | 1 | 16 Browser/Integration |
| BAL-02 | 2 | 16 echter Engine-Browserfall |
| BAL-03 | 2 | Transaktions-/Lotinvarianten desselben Slice |
| BAL-04 | 2 | 16 Tax-/State-End-to-End |
| BAL-05 | 2 | 5 Renten-Nettoinvariante |
| BAL-06 | 3 | 16 Browser-Roundtrip |
| DAT-01 | 3 | 16 alle Simulationseinstiege |
| DAT-02 | 4 | 16 Profilbrowserfall |
| DAT-03 | 4 | 16 Active-Profile-Invariante |
| DAT-04 | 3 | 10 Optimizer-Roundtrip |
| DAT-05 | 13 | 16 Profilwechsel-E2E |
| ENG-01 | 5 | 1 Preview-Lifecycle; 16 Mehrjahreslauf |
| ENG-02 | 2 | Final-Action-Bestand desselben Slice |
| ENG-03 | 2 | 3 Nullgrenze; 10 Optimizer |
| ENG-04 | 5 | 2 Netto-Bondziel |
| ENG-05 | 5 | 16 Erstjahr-E2E |
| ENG-06 | 5 | 16 Balance-/Simulator-Paritaet |
| ENG-07 | 15 | eigener Folge-Slice, falls Funktion geaendert wird |
| ENG-08 | 5 | 12/13 Corrupt-Importpfade |
| ENG-09 | 2 | 3 Nullgrenze; 10 Optimizer |
| SWP-01 | 9 | 16 Browser/Constraint |
| SWP-02 | 7 | 16 MC-/Sweep-Paritaet |
| SWP-03 | 8 | 16 Haushalts-E2E |
| SWP-04 | 8 | 16 Tail-Diagnose/Export |
| SWP-05 | 8 | 10 Optimizer-Kausalitaet |
| SWP-06 | 7 | 16 Datenprovenienz |
| SWP-07 | 7 | 16 Worker-Paritaet |
| SWP-08 | 9 | 10 Optimizer-Bestaetigung |
| SWP-09 | 9 | 16 Ruin-/Drawdown-E2E |
| SWP-10 | 8 | 16 Pflege-E2E |
| SWP-11 | 7 | 16 Worker-/Bounds-Paritaet |
| OPT-01 | 10 | 16 Evaluate-/Apply-E2E |
| OPT-02 | 11 | 9 gemeinsame Metrikdefinition |
| OPT-03 | 10 | 15 Modell-/UI-Grenze |
| OPT-04 | 10 | 3 kanonische Nullgrenze |
| OPT-05 | 10 | 15 dokumentierte Methodenentscheidung |
| OPT-06 | 11 | O-21 und D-14 |
| OPT-07 | 11 | 16 UI-Contract |
| OPT-08 | 11 | 9 versionierter Drawdown-Shape |
| SIM-01 | 6 | 9 Sweep-Metriken |
| SIM-02 | 6 | 16 FlowDelta/Backtest |
| SIM-03 | 6 | 16 Anspar-End-to-End |
| SIM-04 | 6 | 16 Browserchart |
| SIM-05 | 6 | 16 Browserheatmap |
| SIM-06 | 6 | 15 dokumentierte Outcome-Semantik |
| SIM-07 | 10 | O-20 und D-08 |
| IMP-01 | 12 | 16 Import-Roundtrip |
| IMP-02 | 12 | 16 Reload/Diagnose |
| IMP-03 | 12 | 15 D-13/Modellgrenze |
| PER-01 | 13 | 14 Vollbackup-Preflight |
| PER-02 | 13 | 16 Balance-/Simulatorblocker |
| PER-03 | 13 | 4 Haushaltsreconciliation |
| PER-04 | 14 | gemeinsamer Restore-Contract desselben Slice |
| PER-05 | 14 | 16 Browser-Recovery |
| PER-06 | 14 | 5 Engine-Negativcontract |
| MOD-01 | 15 | 16 Doku-/Evidenzgate; gegebenenfalls eigener Steuerplan |
| MOD-02 | 15 | 16 Doku-/Evidenzgate; Fachentscheidung Ausgabensemantik |
| MOD-03 | 15 | 16 Doku-/Evidenzgate; eigener Reconciliation-Contract bei Aenderung |
| MOD-04 | 15 | 16 Doku-/Evidenzgate; Geltungsbereich Demografie |
| MOD-05 | 15 | 16 Doku-/Evidenzgate; Pflege-/Mortalitaets-/Renten-Kalibrierung |
| MOD-06 | 15 | 16 Doku-/Evidenzgate; Marktdaten-/Historienvalidierung |
| MOD-07 | 15 | 16 Doku-/Evidenzgate; Kosten-/FX-/Asset-Geltungsbereich |
| MOD-08 | 15 | 16 experimenteller Status/Validierungsgate |
| QA-01 | 16 | unabhaengige Orakel O-01 bis O-22 |
| QA-02 | 16 | Coverage-/Boundary-Inventar |

## Test- und Nachweisstrategie

### Kein dauerhaft roter Baseline-Slice

Fehlerreproduktion und Fix gehoeren in denselben Slice. Zu Beginn des Slice wird der unabhaengige Regressionstest geschrieben und lokal rot bestaetigt; der Slice endet erst gruen. Ein roter Contract darf nicht committed oder waehrend fachlich unabhaengiger Arbeit stehen gelassen werden. Falls ausnahmsweise ein bewusster Red-State-Slice erforderlich wird, muss er die exakt folgende Gruen-Slice benennen und blockiert alle anderen Slices gemaess `SLICE_EXECUTION_RULES.md`.

### Oracle-Hierarchie

1. einfache handberechnete Referenz fuer Summen, Prozent, Drawdown, Steuerbasis und Bounds;
2. Conservation-/Reconciliation-Invariante;
3. Metamorphietest, beispielsweise Preview-Wiederholung, 0-vs.-missing oder Parameterperturbation;
4. Single-/Multi-, Main-/Worker- oder MC-/Sweep-Paritaet;
5. Browserworkflow;
6. Golden-/Snapshot-Vergleich nur mit dokumentierter Semantik und Delta-Ledger.

Paritaet zwischen zwei Implementierungen beweist nur, dass beide dasselbe tun; sie ersetzt nie die Stufen 1 bis 3.

### Pflicht-Grenzwertmatrix

Fuer jeden geaenderten fachlichen Zahlencontract sind soweit zulaessig zu pruefen:

| Dimension | Pflichtfaelle |
| --- | --- |
| Presence | missing, `null`, leer, gueltig |
| Zahl | 0, kleinster positiver Wert, negativer gueltiger/ungueltiger Wert, Dezimalwert, Maximum |
| Nichtendlich | `NaN`, `Infinity`, `-Infinity` |
| Darstellung | Number, deutscher String, englischer String, mehrdeutiger String |
| Profil | Single, Multi, Detail+Detail, Detail+Aggregat, explizit leer, korrupt |
| Laufpfad | direkt, Worker, Backtest, MC, Sweep, Optimizer soweit relevant |
| Outcome | Erfolg, Ruin, all-dead/Horizont, validation_error, technical_error |

### Parameter-Kausalitaetsmatrix

Fuer jeden sichtbaren Sweep-/Optimizerparameter wird dokumentiert:

| Feld | Inhalt |
| --- | --- |
| UI-ID/Label | tatsaechliches sichtbares Control |
| kanonischer Key | einziger Requestname |
| Einheit/Domain | inklusive 0-/Dezimalvertrag |
| Consumer | konkrete Runnerstelle |
| Provenienz | Feld in Result/Export |
| Witness | kontrollierter Test, in dem der Parameter wirken muss |
| Apply | Zielcontrol beziehungsweise nicht anwendbar |
| Status | wirksam / bewusst fixiert / entfernt / experimentell |

Ein Parameter ohne Consumer oder Witness blockiert die Freigabe.

### Baselines und Delta-Ledger

Vor jedem Slice mit Engine-, Backtest-, MC-, Sweep- oder Outcome-Semantikaenderung werden auf unveraendertem Produktivcode reproduzierbare synthetische Baselines erfasst. Nach dem Fix enthaelt die Slice-MD:

- geaenderte Kennzahlen;
- erwartete Ursache je Delta;
- bewusst unveraenderte Kontrollfaelle;
- Snapshot-/Fixture-Hash vor und nachher;
- FlowDelta und Steuer-/State-Reconciliation;
- Reviewerentscheidung fuer jedes nichttriviale Delta.

Golden-Fixtures duerfen nicht pauschal per Update-Flag erneuert werden, bevor jedes Delta erklaert und freigegeben ist.

### Gates je Risikoklasse

| Aenderung | Mindestgates |
| --- | --- |
| reine DOM-freie UI-Hilfe | fokussierter Test, danach `npm test` |
| Browserworkflow/Renderer | fokussiert, `npm test`, `npm run test:browser` |
| `engine/` oder EngineAPI | fokussiert, `npm run build:engine`, `npm test`, relevante Backtest-/Snapshot-/FlowDelta-Gates |
| Worker/MC/Sweep/Optimizer | fokussiert, `npm test`, direkte/Worker-Paritaet, `npm run test:browser` bei UI-Aenderung |
| Profil/Persistenz/Import | fokussiert, Fault-Injection, `npm test`, `npm run test:browser` |
| Abschluss | alle Befehle aus Slice 16 inklusive Coverage und Evidenzcheck |

## Globale Stop- und Eskalationskriterien

Zusaetzlich zu `AGENTS.md` und `SLICE_EXECUTION_RULES.md` wird sofort gestoppt und Nutzerentscheidung eingeholt, wenn:

- ein Slice mehr als zehn produktive Programm-/Konfigurationsdateien benoetigt;
- der aktive Branch nicht `codex/suite-datenintegritaet-hardening` ist;
- `git status --short` fremde oder unerwartete Aenderungen zeigt, die den Slice beruehren;
- ein Contract aus diesem Plan und eine bestehende Source-of-Truth-Dokumentation widersprechen;
- Engine-Semantik ausserhalb des freigegebenen Slice geaendert werden muesste;
- Snapshot-, Backtest-, Monte-Carlo- oder FlowDelta-Ergebnisse unerwartet abweichen;
- UI, Profil, Worker und Engine verschiedene Parameternamen, Einheiten oder Bounds verwenden;
- `minimumFlexAnnual` irgendwo still begrenzt statt validiert wird;
- ein positiver Profilwert ohne sicheren Vertrag nur durch schaetzende Steuerdaten aufgenommen werden koennte;
- ein Steuer-, Pflege-, Mortalitaets-, Renten- oder Renditemodell ohne eigene Fachentscheidung geaendert werden muesste;
- ein Recovery-Snapshot nicht bestaetigt gelesen oder ein Rollback nicht verifiziert werden kann;
- korrupte Daten nur durch Ueberschreiben des Rohpayloads „repariert“ werden koennten;
- ein sichtbarer Sweep-/Optimizerparameter weiterhin keinen Kausalitaets-Witness besitzt;
- Tests, Browsergate oder notwendiger Build nicht ausfuehrbar sind;
- eine temporaere rote Testsuite laenger als den unmittelbar zugehoerigen Fixschritt bestehen wuerde.

## Slice-MD-Pflichtstruktur

Vor jedem Slice erstellt Codex die vorgesehene Slice-Datei mit mindestens:

1. Feature-Branch und GitHub-Status;
2. Ziel, Finding-IDs und Akzeptanzkriterien;
3. Scope und Nicht-Scope;
4. wortgetreuem Ergebnis von `git branch --show-current` und `git status --short`;
5. Diff-Risiko-Block mit exakter geplanter Dateiliste, Aenderungstiefe, gefaehrdeten Tests, Nicht-anruehren-Liste und konkreter Rollbackstrategie;
6. Baseline-/Delta-Ledger, sofern Rechensemantik betroffen ist;
7. geplanten Tests und fachlichen Orakeln;
8. durchgefuehrten Aenderungen und Tests;
9. Abweichungen, offene Risiken und Rueckdokumentation;
10. Review-Feedback, Codex-Antworten, Entscheidungstabelle und Freigabestatus.
11. vor jedem Commit das wortgetreue `git status --short`, die daraus abgeleitete vollstaendige geaenderte Dateiliste und den expliziten Abgleich jeder Datei gegen den Slice-Scope; jede unerwartete Datei blockiert den Commit.
12. relativer Link aus der zugehoerigen Zeile der Slice-Uebersicht dieses Hauptplans auf die angelegte Slice-MD sowie aktualisierter Slice-Status im Hauptplan.

Die tatsaechliche Programmdateiliste ist vor dem ersten Edit gegen das Tabellenmaximum dieses Plans zu pruefen. Tests und reine Dokumentation zaehlen nicht zur 10-Programmdateien-Stopregel, muessen aber im Scope stehen.

## Branch-, Commit-, Push- und Rollbackprozess

1. Dieser Plan wird auf dem aktuellen dirty Branch nur als Dokument entworfen; daraus beginnt keine Umsetzung.
2. Nach Planreview und Nutzerfreigabe wird ein sauberer Branch `codex/suite-datenintegritaet-hardening` angelegt beziehungsweise aktiviert.
3. Gemini dokumentiert vor dem Plan-Commit `git status --short`, die vollstaendige Dateiliste (`SUITE_DATENINTEGRITAET_HARDENING_PLAN.md` und `docs/internal/README.md`) und deren Scope-Abgleich. Unerwartete Dateien blockieren.
4. Erst nach Status `implementierungsreif` und geloesten Planfindings committed Gemini den finalen Hauptplan samt Indexeintrag lokal auf diesem Feature-Branch.
5. GitHub-Veroeffentlichung dieses Planstands erfolgt bei verfuegbarem Zugriff nur nach ausdruecklicher Nutzerfreigabe; andernfalls wird der Remote-Status als ausstehend beziehungsweise `nur lokal` dokumentiert.
6. Erst nach diesem lokalen Plan-Commit und dokumentiertem Remote-Status darf eine Slice-MD angelegt und der erste Slice begonnen werden.
7. Sobald eine Slice-MD angelegt ist, wird ihre Tabellenzeile im Hauptplan in einen relativen Link umgewandelt und der Status aktualisiert.
8. Vor jedem Slice Branch, Status und Scope erneut pruefen.
9. Codex implementiert und dokumentiert, gibt aber nicht frei und committed nicht.
10. Gemini prueft adversarial und dokumentiert vor jedem Slice-Commit das ausgefuehrte `git status --short`, die vollstaendige geaenderte Dateiliste und den Abgleich jeder Datei gegen den Slice-Scope. Jede unerwartete Datei blockiert.
11. Erst nach positiver Gemini- und Nutzerfreigabe erstellt Gemini genau einen lokalen Commit fuer den Slice.
12. Push erfolgt nie automatisch, sondern nur nach ausdruecklicher Nutzerfreigabe.
13. Vor dem Commit werden nur die exakt dokumentierten Slice-Dateien zurueckgesetzt, falls ein Rollback notwendig und freigegeben ist; keine Sammel-/Hard-Reset-Kommandos.
14. Nach einem freigegebenen Commit erfolgt ein Rollback bevorzugt als nachvollziehbarer Revert nach Nutzerfreigabe. Force-Push und History-Rewrite sind ausgeschlossen.

## Reviewprozess des Hauptplans

1. Gemini prueft Korrektheit, Vertragstreue, Fehlerbehandlung, Seiteneffekte, Dateigrenzen, Abhaengigkeiten und realistische Versagensszenarien.
2. Findings werden nummeriert unter `Review-Feedback von Gemini` eingetragen, inklusive Pre-Mortem und Status.
3. Optional prueft Claude denselben Plan unabhaengig unter eigener ID-Serie.
4. Codex beantwortet jedes Finding in `Review-Antworten von Codex` und aktualisiert Plan/Entscheidungstabelle.
5. Codex setzt den Planstatus nicht eigenmaechtig auf freigegeben.
6. Erst ein geloestes Review, dokumentierte Nutzerentscheidungen und Status `implementierungsreif` erlauben Slice 1 beziehungsweise einen unabhaengig freigegebenen Startslice.

## Plan-Pre-Mortem

Angenommen, dieses Hardening verursacht in drei Monaten erneut eine entscheidungsrelevante Falschaussage: Die wahrscheinlichste Ursache ist, dass zwar der sichtbare Main-Thread-Pfad korrigiert wurde, ein separater Sweep-/Optimizer-/Workerpfad aber weiterhin einen alten Feldnamen, Falsy-Default oder abgespeckten Life-State verwendet. Main-/Worker-Paritaet kann dies sogar ueberdecken, wenn beide denselben falschen Request teilen.

Die Gegenmassnahmen sind deshalb nicht nur mehr Tests, sondern:

- ein einziger versionierter Requestvertrag;
- Parameter-Kausalitaets-Witnesses statt reiner Paritaet;
- Single-Combination-Sweep gegen MC;
- Evaluate-vs.-Apply-Fingerprint;
- Golden-Orakel mit handberechneter Referenz;
- echte Browserpfade im Abschlussgate.

Zweites Restrisiko ist ein unvollstaendiger Preview-/Commit-Schnitt: Eingaben koennten korrekt getrennt sein, waehrend profilbezogene TaxStates oder Guardrailfelder weiterhin bei einem Render gespeichert werden. O-01 muss deshalb den gesamten erlaubten Persistenzraum und nicht nur einen einzelnen Balance-Key vergleichen.

Drittes Restrisiko ist Recovery, das bei transientem IO-Fehler faelschlich Korruption annimmt und Rohdaten ueberschreibt. Deshalb bleiben `corrupt` und `unavailable` getrennt und kein Reset ist ohne bestaetigten Recovery-Export zulaessig.

## Plan-Freigabegates

- [x] Findings aus der technischen Diagnose vollstaendig inventarisiert
- [x] Golden-Orakel und Traceability vorgeschlagen
- [x] Slices 1-basiert und jeweils unter zehn geplanten Programmdateien zugeschnitten
- [x] aktueller dirty/themenfremder Branch dokumentiert
- [ ] Gemini-Planreview eingetragen
- [ ] Claude-Review eingetragen oder bewusst durch Nutzer abbedungen
- [ ] D-01 bis D-19 entschieden beziehungsweise explizit als Folgeauftrag abgegrenzt
- [ ] alle Review-Blocker beantwortet
- [ ] Nutzer hat den korrigierten Plan freigegeben
- [ ] Status auf `implementierungsreif` gesetzt
- [ ] sauberer Feature-Branch angelegt/aktiv und GitHub-Status dokumentiert
- [ ] Gemini hat vor dem Plan-Commit Status, vollstaendige Dateiliste und Scope-Abgleich dokumentiert
- [ ] finaler Hauptplan und `docs/internal/README.md` sind lokal auf dem Feature-Branch committed
- [ ] Remote-Planstand ist nach Nutzerfreigabe veroeffentlicht oder als ausstehend dokumentiert
- [ ] Slice-MD des ersten freigegebenen Slice erstellt
- [ ] erste Slice-MD ist relativ in der Slice-Uebersicht verlinkt und ihr Status im Hauptplan aktualisiert

## Umsetzungsprotokoll

| Datum | Ereignis | Ergebnis |
| --- | --- | --- |
| 2026-07-22 | technische Read-only-Diagnose | mehrere P0-/P1-Datenintegritaetsfehler reproduziert; Tests und Browsergate trotzdem gruen |
| 2026-07-22 | Hauptplan durch Codex entworfen | Planreview ausstehend; keine Codeaenderung; Umsetzungsbranch noch nicht angelegt |

## Review-Feedback von Gemini

Ausstehend. Das Review muss die Pflichtstruktur aus `SLICE_EXECUTION_RULES.md` enthalten:

1. Pruefdimensionen;
2. nummerierte Findings;
3. Pre-Mortem;
4. Review-Ergebnis mit Status, Blockern und Restrisiken.

## Review-Feedback von Claude

Ausstehend beziehungsweise durch Nutzer abzubedingen. Pflichtstruktur analog Gemini.

## Review-Antworten von Codex

Ausstehend. Antworten aendern einen Reviewerstatus nicht eigenmaechtig.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| - | - | noch kein Review | ausstehend | - |
