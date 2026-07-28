# Suite-Datenintegritaet-Hardening: Arbeitsplan

**Stand:** 2026-07-23  
**Status:** Freigegeben (Arbeitsplan) - Planreview durch Gemini am 2026-07-23 erfolgreich abgeschlossen  
**Autor:** Codex  
**Reviewer:** Antigravity (Gemini)  
**Vorgesehener Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**GitHub-Status:** Veröffentlicht auf `main`; Feature-Branch wird von Codex vor Slice 1 angelegt  
**Planungsbranch bei Erstellung:** `codex/fix-backtest-trade-log` (in `main` gemerged)  
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

## Plan-Review und Freigabe durch Gemini

**Review-Datum:** 2026-07-23  
**Reviewer:** Antigravity (Gemini)  
**Methode:** Adversarielles Code- und Plan-Review nach `docs/internal/SLICE_EXECUTION_RULES.md`

### Verifikation der Befunde im Quellcode

Die von Codex im Arbeitsplan dokumentierten Befunde wurden am 2026-07-23 direkt im Quellcode verifiziert. Sie sind **vollinhaltlich bestätigt und reproduzierbar**:

1. **BAL-01 (P0):** `debouncedUpdate()` in `balance-main.js` ruft `simulateSingleYear()` auf und speichert `modelResult.newState` direkt in `localStorage`. Eingabeänderungen mutieren den Zustand vor dem Jahresabschluss.
2. **BAL-02 (P0):** `balance-action-postprocessor.js` liest `modelResult.newState?.marketData?.returns?.realEq`. Die Engine erzeugt auf `newState` kein Objekt `marketData`, sodass der Wert immer zu `0 %` evaluiert.
3. **DAT-01 (P0):** `parseDisplayNumber` in `simulator-portfolio-format.js` entfernt Punkte, wenn `tail.length === 3`. Ein JS-Zahlenstring `"1.234"` wird dadurch zu `1234` (Faktor 1.000 Fehler).
4. **ENG-01 (P1):** `flex-budget-policy.mjs` setzt `prevBalanceYears = maxBalanceYears`, sobald `prevBalanceYears <= 0` erreicht ist. Bei Budgeterschöpfung (0 Jahre) lädt sich das Budget im Folgejahr sofort wieder auf.
5. **SWP-03 (P1):** `sweep-runner.js` kodiert `householdContext` fest auf `p2Alive: false`. Person 2 (Partner) ist im Sweep-Runner vollständig deaktiviert.
6. **OPT-01 (P1):** `auto-optimize-evaluate.js` schreibt `inputs.goldAllokationProzent` statt kanonisch `inputs.goldZielProzent`. Der Candidate-Evaluator simuliert mit 0 % Goldziel, übernimmt aber den Candidate-Wert in die UI.

### Review-Ergebnis

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  1. Slice 2 umfasst 10 Dateien an der Schnittstelle von Engine (transactions) und Balance-UI. Falls bei der Implementierung weitere Hilfsmodule erforderlich werden, muss Slice 2 zwingend nach Stop-Rule aufgeteilt werden.
  2. Vor der Ausführung von Slices mit Fachentscheidungen (z. B. D-01 runtime blocking vs. warning, D-04 Hybridhaushalt) muss die jeweilige Entscheidung mit dem Nutzer/Reviewer abgestimmt sein.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Eine unvollständig reconcilierte Interaktion zwischen der neuen Preview/Commit-Trennung (Slice 1) und dem Transaktions-Settlement im Profilverbund (Slice 2), bei der im Multi-Profil-Haushalt der Vorjahres-TaxState (z. B. Verlustvortrag) beim Jahresabschluss auf dem falschen Profil-Owner angewendet oder doppelt verrechnet wird.
```


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
| D-13 | manuelles CSV-ATH | am 2026-07-28 durch den Nutzer entschieden: gerichtete konservative Fensterhoch-Untergrenze; ohne Vollhistorie weiter nur `windowHigh`; intern nur bei `windowHigh > letzter Kurs` als belegte Abstandsuntergrenze an die Engine, bei Gleichstand ATH-neutral; Policy, Anwendung, Stichtag und Scope persistent | Slice 12 |
| D-14 | Definition `Median Withdrawal Rate` | am 2026-07-27 durch den Nutzer entschieden: Jahreswert ist `jahresEntnahmeEffektiv / depotwertGesamt`; nur erfolgreich berechnete Entnahmephasenjahre mit lebender Haushaltsperson und endlicher Quote, inklusive real berechnetem finalem Ruinjahr, aber ohne Anspar-, Technikfehler-, Todeslog- und synthetische Nach-Ruin-Jahre; pro Run arithmetisches Mittel, danach Median ueber finanziell auswertbare Runs mit Beobachtung; Missingness bleibt getrennt von echter 0 | Slice 11 |
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
| 1 | [SLICE_SUITE_DATA_01_BALANCE_PREVIEW_COMMIT.md](./SLICE_SUITE_DATA_01_BALANCE_PREVIEW_COMMIT.md) | Balance Preview-/Commit-Trennung | P0 | D-02 | 7 | nachgebessert - Claude Re-Review des aktuellen Diffs ausstehend |
| 2 | [SLICE_SUITE_DATA_02_THREE_BUCKET_FINAL_ACTION.md](./SLICE_SUITE_DATA_02_THREE_BUCKET_FINAL_ACTION.md) | Transaktionsbudgets, 3-Bucket Final Action und Steuer | P0 | 1, 3, 5, D-03 | 10 | freigegeben |
| 3 | [SLICE_SUITE_DATA_03_CANONICAL_NUMBERS.md](./SLICE_SUITE_DATA_03_CANONICAL_NUMBERS.md) | Kanonische Zahlen, Fractional Lots und Nullgrenzen | P0 | keine | 7 | freigegeben |
| 4 | [SLICE_SUITE_DATA_04_PROFILE_ASSET_GOLD.md](./SLICE_SUITE_DATA_04_PROFILE_ASSET_GOLD.md) | Verlustfreie Profilassets und Goldziele | P0/P1 | 3, D-04, D-05 | 6 | freigegeben |
| 5 | [SLICE_SUITE_DATA_05_ENGINE_INVARIANTS.md](./SLICE_SUITE_DATA_05_ENGINE_INVARIANTS.md) | Engine-Spending, Floors, Flex und Rente | P1 | 3 | 7 | freigegeben |
| 6 | [SLICE_SUITE_DATA_06_RESULT_SIGN_SEMANTICS.md](./SLICE_SUITE_DATA_06_RESULT_SIGN_SEMANTICS.md) | Nullwerte, negative Renditen und wahrheitsgetreue Darstellung | P1 | 3, 5, D-06, D-19 | 7 | freigegeben |
| 7 | [SLICE_SUITE_DATA_07_SWEEP_REQUEST_SAMPLING.md](./SLICE_SUITE_DATA_07_SWEEP_REQUEST_SAMPLING.md) | Kanonischer Sweep-Request und Sampling | P1 | 3, 5 | 6 | freigegeben |
| 8 | [SLICE_SUITE_DATA_08_SWEEP_HOUSEHOLD_RISK.md](./SLICE_SUITE_DATA_08_SWEEP_HOUSEHOLD_RISK.md) | Partner, Pflege, Langlebigkeit und Tail Risk | P1 | 7 | 7 | freigegeben |
| 9 | [SLICE_SUITE_DATA_09_SWEEP_METRICS_COMPARABILITY.md](./SLICE_SUITE_DATA_09_SWEEP_METRICS_COMPARABILITY.md) | Drawdown, Outcomes und faire Vergleiche | P1 | 6-8, D-06, D-07 | 9 | Blocker nachgebessert - Re-Review ausstehend |
| 10 | [SLICE_SUITE_DATA_10_AUTO_OPTIMIZE_FIDELITY.md](./SLICE_SUITE_DATA_10_AUTO_OPTIMIZE_FIDELITY.md) | Optimizer-Parameter und Apply-Paritaet | P1 | 6-9, D-08 | 8 | technisch umgesetzt - Review ausstehend |
| 11 | [SLICE_SUITE_DATA_11_AUTO_OPTIMIZE_METRICS.md](./SLICE_SUITE_DATA_11_AUTO_OPTIMIZE_METRICS.md) | Optimizer-Zielmetriken und Ranking | P1 | 9, 10, D-14 | 9 | F11-1 technisch nachgebessert - erneutes Re-Review ausstehend |
| 12 | [SLICE_SUITE_DATA_12_BALANCE_IMPORT_PROVENANCE.md](./SLICE_SUITE_DATA_12_BALANCE_IMPORT_PROVENANCE.md) | Typisierte Balance-Importe und Marktprovenienz | P1 | 1, 3, D-13 | 5 | neue Re-Review-Blocker technisch nachgebessert - erneutes Re-Review ausstehend |
| 13 | [SLICE_SUITE_DATA_13_PROFILE_RECOVERY.md](./SLICE_SUITE_DATA_13_PROFILE_RECOVERY.md) | Sichtbare Profilkorruption und sichere Recovery | P1 | 4, D-09, D-17 | 10 | technisch umgesetzt - Review ausstehend |
| 14 | [SLICE_SUITE_DATA_14_BUNDLE_BACKUP_VALIDATION.md](./SLICE_SUITE_DATA_14_BUNDLE_BACKUP_VALIDATION.md) | Atomare Bundle-/Vollbackup-Wiederherstellung und Statevalidierung | P1 | 12, 13 | 9 | U14-1 bis U14-5 nachgebessert - Re-Review ausstehend |
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

### Umsetzungsstand 2026-07-26

- D-04 ist fail-closed umgesetzt: Ein Hybrid aus vorhandener Detailrepraesentation und positivem Depot-/Geldmarkt-Aggregat ohne Detailprovenienz liefert `SIMULATOR_PROFILE_ASSET_PROVENANCE_MISSING` mit profilbezogener Warnung. Aggregate-only Haushalte und separat provenienzfaehiges Tagesgeld bleiben zulaessig.
- D-05 ist ueber absolute Profilziele umgesetzt: `profileGoldBase` umfasst reconciliertes Depot inklusive Gold plus operative Liquiditaet abzueglich des bis zur Liquiditaet gekappten Profil-Pflegebuckets. Ziel und Floor werden je Profil in Euro summiert; die Haushaltsquote ist nur ein Adapterwert.
- O-06 blockiert sichtbar, O-07 liefert 8.000 EUR Ziel und 0,8 Prozent Haushaltsquote. Portfolioinitialisierung und Balance-Profilverbund verwenden denselben absoluten Vertrag; ein Wechsel des aktiven UI-Profils aendert ihn nicht.
- Es wurden exakt sechs Programmdateien geaendert. Engine-Quellen, `engine.js`, `dist/` und Release-Artefakte blieben unangetastet.
- Fokussierte Tests, `npm test` mit 7.516 Assertions und `npm run test:browser` sind gruen. Die vollstaendigen Nachweise und offenen Restrisiken stehen in der Slice-Datei.
- Status: technisch implementiert; unabhaengiges Review durch Gemini/Nutzer, Commit und Push stehen aus.

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

### Rueckdokumentation Slice 09 (2026-07-27)

- Implementiert wurden acht Programmdateien. Der neue DOM-freie
  `sweep-metrics-contract.js` verhindert eine zyklische Importkette und
  haelt den Scope unter dem Maximum von neun.
- `SweepMetricsV3`, `SweepMetricMetadataV2`,
  `SweepDrawdownLossP95V1` und `SweepComparisonDiagnosticsV2`
  versionieren Werte, Definitionen und Vergleichsdiagnostik. D-06 liefert
  fuer 1 bis 100 exakt P95 = 95,05; terminaler Ruin nach positivem Peak
  liefert 100 Prozent Drawdown.
- `SweepCommonRandomNumbersV2` vereinheitlicht Setup- und Run-Seeds je
  Run-Index ueber alle Kombinationen. Ein angeforderter `legacy-stream`
  wird fuer den fairen Vergleich nachvollziehbar auf `per-run-seed`
  aufgeloest; Request, angewandter Modus und Grund bleiben exportiert.
  Die Provenienz garantiert nur gemeinsame Rohpfadpraefixe bis zur
  strategieabhaengigen Terminierung, keine vollstaendige Pfadgleichheit.
- Heatmap, Constraints, Multiobjective-, Pareto- und Parametervergleich
  lehnen Legacy-, unbekannte und nicht endliche Metriken fail-closed ab.
  Runzahl, CRN-Status, Wilson-95-Prozent-Intervall und experimentelle
  Quantilrankings sind sichtbar; objektive „beste/optimale“-Aussagen wurden
  aus diesem Vergleich entfernt.
- Nach C09-1/G09-1 verwenden alle Vermoegens- und Drawdownquantile denselben
  kanonischen Interpolationsvertrag. Terminalruin-Saettigung wird mit Anzahl
  und Anteil diagnostiziert und in Heatmap, Pareto sowie Ranking sichtbar;
  Gleichstaende waehlen keine Kombination nach Array-Reihenfolge.
- C09-2/C09-3 und C09-5 bis C09-9 sind technisch nachgebessert. C09-4 bleibt
  als sichtbare, versionierte Modellgrenze bestehen: Sweep- und
  Monte-Carlo-Drawdown sind nicht direkt vergleichbar; die MC-Semantik
  bleibt Nicht-Scope.
- Validierung: 134 Testdateien mit 7.951/7.951 Assertions, 0 offenen
  Handles, Worker-/Serial-Paritaet gruen, 16/16 Browser-Szenarien und
  `git diff --check` gruen. Keine Golden-/Snapshot-Aenderung und kein
  unerwartetes FlowDelta.
- Unabhaengige Reviews (Claude & Gemini) abgeschlossen; Slice 09 ist freigegeben.


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

### Rueckdokumentation Slice 10 (2026-07-27)

- Exakt acht Programmdateien geaendert. Eine zentrale Registry steuert
  Domain, kanonischen Request-Key, Modusanwendbarkeit, Input-/Form-Reader und
  Apply-Logik; unbekannte, ungueltige und nicht anwendbare Parameter werden
  fail-closed abgewiesen. Registry-Domains und Runway-Cross-Field-Pruefung
  entsprechen den kanonischen Enginegrenzen.
- OPT-01 und OPT-04 sind technisch geschlossen: Gold wird kanonisch als
  `goldZielProzent` bewertet und angewendet, Gold 0/25 erzeugt verschiedene
  Requestfingerprints und ein deterministisches Ergebnisdelta, explizite
  Null-Caps bleiben 0.
- O-15 verbindet Evaluation und Apply ueber versionierte Parameter- und
  Requestfingerprints mit Provenienz-, Modus-, Formular-Preflight- und
  Ruecklesepruefung. O-20 verbietet den direkten Horizon in aktuarischen
  Optimizer-Modi; der normale MC-Runner konsumiert im expliziten Modus
  `direct` die Testwerte 15/55 exakt.
- D-18 ist ueber `AutoOptimizeEvaluationContractV1` und
  `AutoOptimizeSeedContractV1` umgesetzt: Sampling, RNG, Block, CAPE,
  Datenfilter, Runzahl, disjunkte Train-/Bestaetigungsseeds und fixierte
  Modellannahmen sind im Ergebnis und Championbericht sichtbar.
- Alle acht angebotenen Parameter besitzen einen deterministischen
  MC-Kausalitaets-Witness. `maxBearRefillPct` bleibt fuer den expliziten
  Nullwert-/Apply-Vertrag registriert, ist mangels Runner-Wirkungsnachweis
  jedoch aus Parameterpicker und Presets entfernt.
- Validierung: 135 Testdateien mit 8.080/8.080 Assertions, 0 offenen Handles,
  16/16 Browser-Szenarien, alle Coverage-Gates bei 78,25 Prozent
  Gesamtdeckung und `git diff --check` gruen. Keine Engine-, Golden-,
  Snapshot-, `dist`- oder Release-Aenderung.
- Unabhaengige Re-Reviews (Claude & Gemini) abgeschlossen; Slice 10 ist freigegeben.


## Slice 11 - Optimizer-Zielmetriken und Ranking

**Findings:** OPT-02, OPT-06 bis OPT-08  
**Prioritaet:** P1  
**Ziel:** Jede Zielfunktion und jeder Tiebreaker verwendet die benannte, unabhaengig nachrechenbare Metrik mit expliziter Missingness.

### Geplanter Scope

Tatsaechlich betroffene Programmdateien:

- `app/simulator/monte-carlo-runner.js`
- `app/simulator/monte-carlo-chunk-result.js`
- `app/simulator/monte-carlo-aggregates.js`
- `app/simulator/monte-carlo-parameters.js`
- `app/simulator/auto-optimize-evaluate.js`
- `app/simulator/auto-optimize-metrics.js`
- `app/simulator/auto-optimize-utils.js`
- `app/simulator/auto_optimize.js`
- `app/simulator/simulator-engine-direct.js`

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

D-14 muss entschieden sein. Stop, wenn die erforderlichen Rohwerte im
kanonischen MC-Ergebnis fehlen, die Metrik nur durch eine zweite abweichende
Aggregation erzeugt werden koennte oder mehr als neun Programmdateien
erforderlich werden. Die Erweiterung von sechs auf sieben Programmdateien
fuer die nachgemessen veraltete Worker-Payload-Konstante und die weitere
Erweiterung auf neun Programmdateien fuer die Reviewblocker E11-1 bis E11-3
wurden am 2026-07-27 vom Nutzer ausdruecklich freigegeben.

### Umsetzungsstand

- D-14 ist als `MedianWithdrawalRateD14V1` umgesetzt: endliche realisierte
  Entnahmequoten erfolgreicher Entnahmephasenjahre werden je Run
  arithmetisch gemittelt, danach folgt der Median ueber auswertbare Runs.
  Beobachtungszahl, Missingness und echte 0 bleiben getrennt.
- Endvermoegen P10/P25/P50 und der MC-Drawdown P90 stammen aus gepoolten
  kanonischen Run-Rohverteilungen mit linearer Interpolation bei `(n-1)q`.
- `AutoOptimizeMetricResultV1` vereinheitlicht Evaluate, Objective,
  Constraints und Tiebreaker; fehlende Werte werden nicht mehr als
  guenstige 0 behandelt.
- Die Blocker-Nachbesserung erweitert den autorisierten Scope auf exakt neun
  Programmdateien; `auto_optimize.js` schliesst die objectivewirksame
  Missingness-Luecke und `simulator-engine-direct.js` liefert die kanonische
  Quote des real berechneten finalen Ruinjahrs. Nach F11-1 ist deren Zaehler
  exakt die tatsaechlich ausgezahlte `jahresEntnahmeEffektiv`; Restvermoegen
  bleibt reine Floor-Deckungsdiagnostik und ein Ruin vor Auszahlung traegt
  eine beobachtete Nullauszahlung. Technische Pfade werden aus
  Endvermoegens- und Drawdownverteilungen entfernt und als Missingness
  inventarisiert; Safety-Penalty und Tiebreaker verlangen primitive,
  endliche Werte aus `AutoOptimizeMetricResultV1`. Der erwartete
  Bufferanstieg 93 auf 106 Byte pro Run und die Standardmessung mit
  977,62585 gesamten
  Worker-Result-Byte pro Run sind in `post-suite-data-11-v1` und im
  Delta-Ledger dokumentiert; der Ressourcenvertrag verwendet gerundete
  978 Byte.
- `npm test` mit 8.333/8.333 Assertions und 0 offenen Handles,
  16/16 Browser-Smokes, alle Coverage-Gates bei 78,33 Prozent sowie
  `git diff --check` sind gruen. Engine, `engine.js`, `dist/` und
  Release-Artefakte blieben unangetastet.
- Status: Unabhaengige Re-Reviews (Claude & Gemini) abgeschlossen; Slice 11 ist freigegeben.


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
6. D-13 umsetzen: unzureichende Historie nicht als echtes ATH behaupten und
   das `windowHigh` gerichtet als konservative ATH-Untergrenze verwenden:
   positiver Fensterabstand wird angewendet, Gleichstand bleibt ATH-neutral.
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

### Umsetzungsstand

- D-13 ist nach Nutzerentscheidung vom 2026-07-28 als gerichtete konservative
  Fensterhoch-Untergrenze umgesetzt: Ein manueller Vierjahresimport liefert
  ausschliesslich `windowHigh`. Die Engine verwendet Wert und beobachtete
  Jahre nur bei positivem Fensterabstand; bei einem Hoch am letzten Kurs
  bleibt der Eingang ATH-neutral. `verifiedAllTimeHighAvailable: false` und
  `engineReference.applied` halten fehlende Vollhistorie und tatsächliche
  Anwendung separat sichtbar.
- `BALANCE_IMPORT_INPUT_SCHEMA_V2` validiert den vollstaendigen
  Balance-Inputvertrag inklusive echter Booleans, Bounds, Enums,
  verschachtelter Vertraege und kanonischer Tranchen. `balance-state` V1 und
  die expliziten v21.1-/v22.0-Legacy-Envelopes besitzen benannte Migratoren.
- Recovery-Exporte verwenden V2 und bleiben bei erreichbaren
  Domainabweichungen moeglich; `validationWarnings` konserviert Code und
  konkrete Feldmeldung. `targetEq: 0` und `rebalBand: 0` bleiben im
  V2-Roundtrip sowie bei V1-Migration erhalten.
- Manuelle CSVs sind vor jeder Mutation an Modus, Zieljahr, ISO-Stichtag,
  Instrument und Quelle gebunden. Preview, Recovery, Replace,
  Abschluss-Persistenz und Provenienz-Bestaetigung sind transaktional
  verkettet; Fehler schreiben nichts oder rollen vollstaendig zurueck.
- Quelle, Importzeit, Abdeckung, Zeilenzahl und Hoch-Scope bleiben in State,
  Reload-Anzeige, JSON-Export und Diagnose erhalten. Der Browserfall belegt
  zugleich den semantisch stabilen Dynamic-Flex-/Go-Go-Boolean-Roundtrip.
- Exakt fuenf Programmdateien wurden geaendert; Engine, `engine.js`, `dist/`
  und Release-Artefakte blieben unangetastet.
- Fokussierte Vertraege sind mit 581/581 Assertions gruen. `npm test` ist mit
  8.462/8.462 Assertions, 0 fehlgeschlagenen Dateien und 0 offenen Handles
  gruen; `npm run test:browser` ist mit 17/17 Smokes gruen.
- Status: Unabhaengige Re-Reviews (Claude & Gemini) abgeschlossen; Slice 12 ist freigegeben.


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

### Rueckdokumentation Slice 13 (2026-07-28)

- Exakt zehn Programmdateien wurden geaendert. Registry, Pflegebucket und
  profilbezogener Balance-State besitzen typisierte, mutationsfreie
  Loadergebnisse; `corrupt` und `unavailable` bleiben getrennte Pfade.
- Registry-, Current-/Active- und Live-State-Korruption blockiert sichtbar.
  Korrupte Rohdaten werden weder durch Defaults noch durch einen Save-before-
  load ueberschrieben. Historische Registryeintraege ohne redundantes
  `meta.id` bleiben ueber eine mutationsfreie Lesemigration kompatibel.
- Recovery-Reset verlangt den passenden Raw-Export, eine gesonderte
  Bestaetigung und einen erneuten Raw-Vergleich. Ein technisch nicht lesbarer
  Zustand bietet keinen Resetpfad.
- Profilbezogene Live-Writes rollen Teilfehler zurueck; Balance und Simulator
  verwerfen bei einem fehlerhaften ausgewaehlten Profil die gesamte
  Haushaltsaggregation. Das per-profile Alter hat Vorrang vor veraltetem
  Haushaltsalter.
- Fokussierte Profil-, Aggregations-, UI- und Snapshotvertraege sind gruen.
  `npm test` lief mit 8.536/8.536 Assertions und 0 offenen Handles;
  `npm run test:browser` mit 20/20 Smokes. `git diff --check` ist gruen.
- Unabhaengige Re-Reviews (Claude & Gemini) abgeschlossen; Slice 13 ist freigegeben.


## Slice 14 - Atomare Bundle-/Vollbackup-Wiederherstellung und Statevalidierung

**Findings:** PER-04 bis PER-06  
**Prioritaet:** P1  
**Ziel:** Profilbundle und Vollbackup werden vor Replace-all fachlich validiert und rollbackgesichert angewandt; der Inflationsfaktor wird an allen Eintrittsgrenzen validiert.

### Geplanter Scope

Voraussichtlich betroffene Programmdateien:

- `app/profile/profile-bundle-io.js`
- `app/shared/persistence-backup.js`
- `app/shared/snapshot-archive.js`
- `app/shared/persistence-key-policy.js`
- `app/shared/persistence-facade.js`
- `app/balance/balance-storage.js`
- `engine/planners/SpendingPlanner.mjs`
- `app/simulator/simulator-engine-helpers.js`
- gemeinsamer Inflations-Domainvalidator

### Umsetzungsschritte

1. Bundle- und Backup-Envelope, App-ID, Schema-/Versionsmatrix, `recordCount`, Key-Allowlist und Werttypen validieren.
2. Bundle-Globals import- und exportseitig auf dieselbe Allowlist begrenzen.
3. Bekannte Domainvalidatoren fuer Registry, Profile, Balance, Pflege, Tranchen und Metadaten vor dem ersten Write aufrufen.
4. Cross-Key-Invarianten wie Current-ID-in-Registry pruefen.
5. beliebige Objekte nicht still stringifizieren; nur der kanonische Recordvertrag ist zulaessig.
6. Recovery-Snapshot vor Replace-all schreiben und verifizieren.
7. staged Restore, Post-Load-Validierung und vollstaendigen kompensierenden Rollback implementieren.
8. `cumulativeInflationFactor` in Import und Persistenz gegen
   `0 < Faktor <= 20` validieren; Engine und Simulator verwenden fuer den
   laufenden Zustand den Rechenvertrag `endlich und > 0`, damit eine
   fortgeschriebene Simulation nicht an der Speicherplausibilitaet abbricht.
   One-shot-Marker und Runnerfallback duerfen Domainvalidierung nicht umgehen.

### Akzeptanzkriterien

- O-18 ist fuer Bundle, Vollbackup und Inflationsstate gruen.
- falsche App-/Schema-Version, falscher RecordCount, unbekannter Key, ungueltige Registry oder Ghost-Current werden ohne Live-Mutation abgewiesen.
- `{ rs_profiles_v1: \"not-json\", rs_current_profile: \"ghost\" }` kann nicht erfolgreich importiert werden.
- Recovery-Snapshot ist vor dem ersten fachlichen Write lesbar bestaetigt.
- Bundle-Globals sind allowlistbeschraenkt; Current-ID muss in der neuen Registry existieren.
- Fehler in jeder Restorephase stellt alle erlaubten Live-Keys wieder her.
- Persistierter/importierter Inflationsfaktor 0, negativ, groesser 20, `NaN`
  oder `Infinity` blockiert Laden mit erhaltenem Domaenencode sichtbar;
  Runtimefaktoren oberhalb 20 bleiben zulaessig, sofern sie endlich und
  groesser 0 sind.
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

Stop, wenn ein Backend keinen verifizierbaren Rollbackvertrag ermoeglicht.
Das urspruengliche Maximum von acht Programmdateien wurde fuer U14-4 am
2026-07-28 durch ausdrueckliche Nutzerentscheidung einmalig auf neun erweitert;
die genehmigte neunte Datei ist ausschliesslich
`app/shared/snapshot-archive.js`.

### Rueckdokumentation Slice 14 (2026-07-28)

- Profilbundle und Vollbackup besitzen kanonische Envelope-, App-, Schema-,
  Versions-, Recordzahl-, Key- und Stringwertvertraege. Vollbackup-Schema 2
  migriert von der App erzeugte V1-Dateien und weist ausgelassene
  UI-/Layout-Keys aus; historische Profilbundles ohne Envelope werden als
  Quellschema 0 migriert. Registry, Profilmetadaten, Pflegebucket,
  Balance-State, Tranchen, Ausgaben und Current-/Active-Invarianten werden vor
  dem ersten Write geprueft.
- Profilbundle-Writes rollen den vollstaendig erfassten Storagebestand
  bytegleich zurueck. Der Vollbackup-Replace schreibt und bestaetigt zuvor
  einen persistenten Recovery-Snapshot; Cache und Backend werden nach Write-
  oder Post-Load-Fehler ueber getrennte Readbacks kompensierend verifiziert
  wiederhergestellt. Der Recovery-Snapshot ist ueber Balance > Snapshots und
  `rollbackImportReplace` einspielbar. Unverifizierbare Rollbacks bleiben als
  `rollback_failed` sichtbar und nennen Snapshot-ID sowie Bedienweg.
- `cumulativeInflationFactor` ist an Balance-Storage und Balance-JSON-Import
  eine endliche Zahl mit `0 < Faktor <= 20`; der Altfehler `99` wird mit
  unveraendertem Rohbestand und erhaltenem Fehlercode abgewiesen. Engine und
  Simulator validieren den laufenden Faktor dagegen als endlich und
  groesser `0` ohne Obergrenze. Ein 80-Jahres-Witness mit 10 Prozent Inflation
  ueberschreitet `20` ohne Chunk-Abbruch. Missing darf mit `1` initialisieren.
  Vorhandene Inflationsraten muessen echte endliche Zahlen sein; `null`,
  Strings und nicht endliche Werte liefern einen typisierten Fehler.
- Der Schema-1-Vollbackup-Migrator konvertiert Nicht-String-Werte nicht mehr
  still. Eine Backendbestaetigung ohne `adapter.loadAll` ist unzulaessig und
  liefert `persistence_backend_read_unavailable` statt eines Cachefallbacks.
- `SNAPSHOT_KINDS` registriert beide Import-Recovery-Arten zentral; Backup und
  Balance verwenden keine eigenen Recovery-Literale mehr. Der Snapshot-Index
  behaelt `restoreScope`, einschliesslich beider
  `replace-all-rollback`-Felder, auch ueber IndexedDB.
- Exakt neun Programmdateien wurden geaendert. Die waehrend der
  Gesamtvalidierung erkannte Balance-JSON-Importgrenze wurde innerhalb des
  urspruenglichen Limits ergaenzt; die neunte Datei
  `snapshot-archive.js` wurde vom Nutzer ausdruecklich genehmigt.
  `persistence-key-policy.js` blieb unveraendert.
- Fokussierte Restore-, Domain-, Snapshot-, Profil-, Balance-, Engine- und
  Simulatorvertraege sind gruen. `npm test` lief mit 8.730/8.730 Assertions
  und 0 offenen Handles; `npm run test:browser` mit 23/23 Smokes
  einschliesslich IndexedDB-Vollbackup-Recovery. `npm run build:engine` und
  `git diff --check` sind gruen; `engine.js` und weitere generierte
  Artefakte blieben unveraendert.
- Die Blocker S14-1 bis S14-4 und U14-1 sowie die gekoppelten Risiken S14-6
  bis S14-12, S14-14 und U14-2 bis U14-5 sind technisch nachgebessert.
  S14-5, S14-13 und S14-15 bleiben als dokumentierte Restrisiken offen.
- Unabhaengige Re-Reviews (Claude & Gemini) abgeschlossen; Slice 14 ist freigegeben.


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
- [x] sauberer Feature-Branch angelegt/aktiv und GitHub-Status dokumentiert
- [ ] Gemini hat vor dem Plan-Commit Status, vollstaendige Dateiliste und Scope-Abgleich dokumentiert
- [ ] finaler Hauptplan und `docs/internal/README.md` sind lokal auf dem Feature-Branch committed
- [ ] Remote-Planstand ist nach Nutzerfreigabe veroeffentlicht oder als ausstehend dokumentiert
- [x] Slice-MD des ersten freigegebenen Slice erstellt
- [x] erste Slice-MD ist relativ in der Slice-Uebersicht verlinkt und ihr Status im Hauptplan aktualisiert

## Umsetzungsprotokoll

| Datum | Ereignis | Ergebnis |
| --- | --- | --- |
| 2026-07-22 | technische Read-only-Diagnose | mehrere P0-/P1-Datenintegritaetsfehler reproduziert; Tests und Browsergate trotzdem gruen |
| 2026-07-22 | Hauptplan durch Codex entworfen | Planreview ausstehend; keine Codeaenderung; Umsetzungsbranch noch nicht angelegt |
| 2026-07-23 | Slice 1 durch Codex gestartet | lokaler Feature-Branch angelegt; Slice-MD erstellt und verlinkt; Implementierung in Arbeit |
| 2026-07-23 | Slice 1 durch Codex implementiert | Preview/Input/Periodencommit getrennt; 130 Testdateien mit 7.353 Assertions und 16 Browser-Smokes gruen; Multi-Profil-Browsercommit bleibt Review-/Integrationsrisiko |
| 2026-07-23 | Slice 3 durch Codex gestartet | Bounds-Stop-Fall durch Nutzer entschieden; kanonische Numbers bleiben unveraendert, UI folgt vorhandenen Engine-Grenzen |
| 2026-07-23 | Slice 3 durch Codex implementiert | Fractional-Lot- und Nullgrenzencontract ueber Backtest, MC, Sweep und Optimizer nachgewiesen; 131 Testdateien mit 7.399 Assertions und 16 Browser-Smokes gruen; Review ausstehend |
| 2026-07-23 | Slice 5 durch Codex gestartet | direkter Abhaengigkeitsslice 3 ist freigegeben; Branch und Worktree sauber; Scope auf fuenf Engine-Dateien begrenzt |
| 2026-07-23 | Slice 5 durch Codex implementiert | Flex-Nullzustand, Renten-Nettoinvariante, harter Floor, Erstjahresquote und aktive Rentenvalidierung korrigiert; erwartete Backtest- und MC-Deltas kontrolliert versioniert; 131 Testdateien mit 7.443 Assertions gruen; Review ausstehend |
| 2026-07-23 | Slice 2 durch Codex gestartet | direkte Abhaengigkeiten 1, 3 und 5 sowie D-03 freigegeben; Branch und Worktree sauber; initialer Scope auf neun Programmdateien begrenzt |
| 2026-07-23 | Slice 2 Snapshot-Stop und Nutzerentscheidung | drei isolierte MC-Risikodeltas auf die beabsichtigte harte `maxSkimPctOfEq=0`-Semantik zurueckgefuehrt; Nutzer hob die Stop-Regel fuer genau dieses Delta auf; Scope vor dem Edit auf zehn Programmdateien erweitert |
| 2026-07-23 | Slice 2 durch Codex implementiert | 3-Bucket-Final-Action vor Settlement, reservierte Lot-/Gold-/Equity-Budgets und profilgenaues Steuer-Settlement umgesetzt; `post-suite-data-02-v1` versioniert; 132 Testdateien mit 7.484 Assertions und 16 Browser-Smokes gruen; Review ausstehend |
| 2026-07-26 | Slice 6 durch Codex gestartet | direkte Abhaengigkeiten 3 und 5 sowie D-06/D-19 freigegeben; Branch und Worktree sauber; Scope auf sieben Programmdateien begrenzt |
| 2026-07-26 | Slice 6 Backtest-Hash-Stop | drei isolierte `canonicalRowsHash`-Deltas vollstaendig auf die beabsichtigte Erhaltung von `FlexRatePct=0` zurueckgefuehrt; alle separat ausgewiesenen Fachmetriken und FlowDeltas unveraendert; Nutzerfreigabe zur Target-Aktualisierung ausstehend |
| 2026-07-26 | Nutzerfreigabe fuer Slice-6-Backtest-Deltas | Aktualisierung genau der drei fachlich erklaerten Target-Hashes freigegeben; Validierung wird fortgesetzt |
| 2026-07-26 | Slice 6 durch Codex implementiert | Null-/Missingness-Semantik, signierte Cashrenditen, terminale Chartpunkte, versionierter Heatmap-Nenner und statusbasierte erfolgreiche Null-Outcomes umgesetzt; drei freigegebene Backtest-Hashes aktualisiert; 132 Testdateien mit 7.534 Assertions, 16 Browser-Smokes und alle Coverage-Gates gruen; Review ausstehend |
| 2026-07-26 | Slice 7 durch Codex gestartet | direkte Abhaengigkeiten 3 und 5 freigegeben; Branch und Worktree sauber; Scope auf sechs Programmdateien begrenzt |
| 2026-07-26 | Slice 7 durch Codex implementiert | `SweepRequestV1`, gemeinsamer expliziter MC-/Sweep-Samplingdispatch, Filterinvariante und versionierte Samplingprovenienz umgesetzt; 132 Testdateien mit 7.584 Assertions und 16 Browser-Smokes gruen; Review ausstehend |
| 2026-07-26 | Slice 7 durch Claude nachgelagert reviewt | Status blockiert mit drei Blockern: F-1 stiller 10.000-Run-Default in `runSweepChunk` bei fehlendem Request, F-2 regime-blinder Ersatzzug entfernt BEAR vollstaendig aus gefilterten Regime-Laeufen (gemessen `FILTER >= 2010`: 202/3.579 Zuege, `regimeCounts` ohne BEAR), F-3 MC-Verhaltensaenderung im Widerspruch zu Nicht-Scope und `bytegleich`-Delta-Ledger; sieben weitere Restrisiken dokumentiert; Testlage der Slice-MD unabhaengig nachgefahren und bestaetigt; Gesamtfreigabe des Slice steht weiterhin auf `freigegeben`, Ruecknahmeentscheidung liegt beim Nutzer; F-2 enthaelt eine offene Fachentscheidung |
| 2026-07-26 | Slice 7 Nachbesserung durch Codex gestartet | Nutzer meldet den Claude-Blocker als massgeblich; F-1 und technische F-3/F-4-bis-F-9-Punkte nachgebessert und fokussiert gruen; F-2-Fachentscheidung zum leeren Regime-Pool ausstehend |
| 2026-07-26 | F-2 durch Nutzer entschieden und umgesetzt | Fail-Closed fuer Regime-Markov und Regime-IID: jeder ziehbare Regime-Pool wird vor dem ersten Run validiert; leere Pools liefern seriell und im Worker `MC_SAMPLING_REGIME_POOL_EMPTY`; regime-blinder Ersatzzug entfernt; unabhaengiges Re-Review ausstehend |
| 2026-07-26 | Slice 7 Nachbesserung technisch abgeschlossen | F-1 bis F-9 beantwortet beziehungsweise nachgebessert; MC-Messbaseline und Worker-Paritaet ohne Ergebnisdelta gruen; 132 Testdateien mit 7.613 Assertions und 16 Browser-Smokes gruen; regelkonformes unabhaengiges Re-Review ausstehend |
| 2026-07-26 | Slice 7 Re-Review durch Claude | Status freigegeben, keine Blocker. F-1, F-2 und F-3 unabhaengig nachgemessen: fehlender Request wirft `SWEEP_REQUEST_OBJECT_REQUIRED`; `FILTER 2010` wird mit `MC_SAMPLING_REGIME_POOL_EMPTY` abgewiesen, `FILTER 2005` liefert wieder BEAR (209 Zuege) ohne Fallbackzaehler; Scope weiterhin sechs Programmdateien, `npm test` 7.613/7.613 gruen, `git diff --check` gruen. F-10 durch das Re-Review erledigt, F-9 eingegrenzt. Fuenf neue Restrisiken N-1 bis N-5 dokumentiert, davon N-2 (Fail-Closed-Meldung ohne Handlungshinweis ab `startYearFilter >= 2009`) als einziger nutzersichtbarer Punkt |
| 2026-07-26 | Slice 1 Re-Review-Nachbesserung durch Codex | Gemini-Blocker REV-01-F01/F02 und Claude-Blocker S01-1 bis S01-3 behoben; S01-4 bis S01-7 technisch bereinigt, S01-8/S01-9 dokumentiert; 132 Testdateien mit 7.637 Assertions und 16 Browser-Smokes gruen; REV-01-F03/F04 bleiben dokumentierte Architekturrestrisiken; unabhaengiges Re-Review ausstehend |
| 2026-07-26 | Slice 1 zweite Claude-Re-Review-Nachbesserung durch Codex | N01-1 bis N01-6 nachgebessert: asymmetrische Profil-/Haupt-State-Ownership, migrierender StorageManager-Pfad, realer Zwei-Write-Regressionsfall, fail-closed JSON-Vertrag und finaler Periodenstatus-Recheck; 132 Testdateien mit 7.660 Assertions und 16 Browser-Smokes gruen; REV-01-F03/F04 bleiben dokumentierte Architekturrestrisiken; erneutes unabhaengiges Claude-Re-Review ausstehend |
| 2026-07-26 | Slice 1 Claude-Snapshotabgleich und Altlasten-Nachbesserung durch Codex | Claude meldete weiterhin den aelteren Diff `f7e380d`; aktueller Slice-01-Arbeitsbaum enthaelt die zweite Nachbesserung und nach N01-7 zusaetzlich die Migration kontaminierter Profildaten beim Profilwechsel (Git-Bash-Hashes: Balance `03b51a5fa63f4ffc58e8095b89a5e422474e60db`, gesamter Slice-01-Code `bd6c885fbfac7d984f69a19af86a936105212a39`); 132 Testdateien mit 7.669 Assertions und 16 Browser-Smokes gruen; Claude-Re-Review gegen diesen Arbeitsbaum ausstehend |
| 2026-07-27 | Slice 1 zweites Re-Review durch Claude | Status freigegeben, keine Blocker. Gegen Balance-Diff `03b51a5` nachgemessen: Profildaten nehmen `annualPeriodMetadata` nicht mehr auf, die Zwei-Write-Sequenz laesst den Haupt-State korrekt auf `lastCommittedPeriod` stehen, Profilwechsel und Migration verunreinigter Profildaten funktionieren. N01-1 bis N01-7 behoben, N01-3 war ein Fehlbefund meines Pruefaufbaus. Drei neue Restrisiken M01-1 bis M01-3, wichtigster Punkt M01-1: `HOUSEHOLD_OWNED_BALANCE_STATE_KEYS` ist eine Allowlist ohne Vollstaendigkeitssicherung |
| 2026-07-27 | Slice 3 durch Claude nachgelagert reviewt | Status blockiert. Kernfix DAT-01 verifiziert (`parseDisplayNumber(1.234)` bleibt 1.234, `targetEq=0` bleibt 0). Ein Blocker S03-1 bestaetigt REV-03-F01/F02 mit praeziserer Eingrenzung: `goldZielProzent=0` wird zu 7,5 Prozent, `rebalancingBand=0` zu 25 Prozent nur bei aktivem Gold; die uebrigen 25 `parseFloat`/`parseInt`-Stellen von `balance-reader.js` wurden gegengeprueft und sind unkritisch. Sechs Restrisiken S03-2 bis S03-7, darunter zwei DOM-Reader mit gegensaetzlicher Semantik ohne abgesicherte Feldzuordnung und stille Nullen fuer `".5"`, `"1."` und `"50abc"`. Fokussierte Gates nachgefahren und gruen |
| 2026-07-27 | Slice 3 Nachbesserung durch Codex und Claude-Re-Review | Blocker S03-1 behoben: `goldZielProzent=0` und `rebalancingBand=0` bleiben erhalten, ungueltige Werte landen auf den dokumentierten Defaults. S03-2 zusaetzlich behoben - Hidden-Felder werden kanonisch geschrieben; gemessen las der Vorzustand einen Depotwert von 1234 EUR als 1,23 EUR. Status freigegeben; S03-5 war ein Fehlbefund und wurde zurueckgezogen. Drei neue Hinweise T03-1 bis T03-3, darunter ein negatives `rebalancingBand`, das bei inaktivem Gold ungeprueft passiert |
| 2026-07-27 | Slice 5 durch Claude nachgelagert reviewt | Status freigegeben, keine Blocker. Die Rentenkorrektur in `wealth-reduction.mjs` wurde an der Konstruktion von `inflatedBedarf` in `engine/core.mjs` verifiziert; gemessen unterdrueckte der alte Doppelabzug bei 800.000 EUR Depot die Erstjahreskuerzung vollstaendig (Faktor 0,000 statt 0,844). Fuenf Restrisiken U05-1 bis U05-5. Wichtigster Punkt U05-1: die elf aktualisierten Golden-Hashes belegen ausschliesslich die Erstjahres-Diagnose `entnahmequoteDepot` - alle geaenderten Backtest-Cases haben `renteMonatlich: 0`, die Rentenkorrektur ist dort beweisbar inert und damit ohne Integrationsabdeckung |
| 2026-07-27 | Slice 5 Nachimplementierung durch Codex und Claude-Re-Review | Status freigegeben. U05-1 behoben durch ein integriertes Backtest-Orakel mit aktiver Rente; unabhaengig nachgerechnet: Quote 3,004848 Prozent, Wealth-Faktor 84,646811 Prozent, frueherer Doppelabzug exakt die Haelfte. Das Orakel ist nicht tautologisch und enthaelt eine Abgrenzungsassertion gegen einen erneuten Rentenabzug; die Fixture-Aenderung ist rein additiv, kein bestehender Golden-Hash veraendert. U05-4 und U05-5 behoben, U05-2 und U05-3 mit tragfaehiger Begruendung angenommen. Zwei neue Restrisiken V05-1 und V05-2, wichtigster Punkt V05-1: das Rentenszenario ist als einziges ohne `canonicalRowsHash` |
| 2026-07-27 | Slice 2 durch Claude nachgelagert reviewt | Status freigegeben, keine Blocker. BAL-02 ist strukturell beseitigt (3-Bucket-Nachbearbeitung aus der UI in die Engine verlagert, `realReturnEq` aus der Marktanalyse statt aus einem nie existierenden `newState.marketData`); Reihenfolge Finalisierung vor Steuer-Settlement verifiziert; Profilverbund settled ueber `deferTaxSettlement` genau einmal je Quellenprofil; O-04 unabhaengig nachgerechnet (11.519,08 EUR Brutto, 5.759,54 EUR Gewinn, abzgl. 777 EUR Vortrag, 26,375 Prozent ergeben exakt 1.314,14 EUR). Fuenf Restrisiken W02-1 bis W02-5, wichtigste Punkte: die Steuerumverteilung laeuft unbedingt, der Reconciliation-Guard nur im Balance-Pfad (W02-1), und die unbedingt formulierten Kapazitaetskriterien gelten faktisch nur dort, wo die Finalisierung laeuft (W02-4) |
| 2026-07-27 | Slice 2 Nachimplementierung durch Codex und Claude-Re-Review | Status freigegeben. Gemini-Blocker REV-02-F01 (asymmetrischer Reservierungsschluessel im Profilverbund) und W02-1 bis W02-5 behoben. `_allocateFinalTaxToActionSources` direkt gegen acht Grenzfaelle vermessen: kapazitaetsbeschraenkte Wasserfallverteilung erzeugt in keinem Fall ein negatives Netto, degenerierte Gewichte und unverteilbare Steuerreste werfen fail-closed. Der Reconciliation-Guard haengt jetzt an `hasAssetSale` statt am Balance-Flag und deckt damit auch Simulator-, Backtest- und MC-Core-Laeufe ab, ohne dass eine bestehende Verletzung sichtbar wurde. 132 Testdateien mit 7.722 Assertions gruen. Ein neuer Hinweis X02-1: gemischte Zeilenenden in `three-bucket-logic.mjs` |
| 2026-07-27 | Slice 4 durch Claude nachgelagert reviewt | Status freigegeben, keine Blocker. D-04 fail-closed mit benannten Fehlercodes und Profilbezug verifiziert; D-05 im Referenzfall exakt nachgerechnet (100k @ 8 % plus 900k ohne Gold ergeben 8.000,00 EUR absolut und 0,8000 Prozent Haushaltsquote), Pflegebucket-Begrenzung auf die operative Liquiditaet belegt (7.200 EUR). Fuenf Restrisiken Y04-1 bis Y04-5. Wichtigster Punkt Y04-1: Zielbild und Akzeptanzkriterium sagen Unabhaengigkeit vom aktiven Profil zu, gemessen aendern sich beim Profilwechsel jedoch sieben Felder des Haushaltsinputs (`startAlter`, `geschlecht`, `rentAdjMode`, `rentAdjPct`, `transitionAge`, `partner`, `simulationSourceProfileId`) - das Goldziel bleibt stabil, die daraus erzeugte Aktion nicht. Y04-3 haelt fest, dass die offene Fachentscheidung T03-2 hier implizit und gegenlaeufig zu Slice 03 entschieden wurde |
| 2026-07-27 | Slice 6 durch Claude nachgelagert reviewt | Status freigegeben, keine Blocker. Die Falsy-Default-Familie in `simulator-year-result.js` ist korrekt ersetzt; drei der vier Defaults lieferten zuvor den optimistischsten Wert (unendlicher Runway, 100 Prozent Deckung, 1 Prozent Flex statt 0). Heatmap-Randfall nachgemessen: Counts [1, 0] bei 100 Runs ergeben jetzt 1 und 0 Prozent, die alte Heuristik haette den Count 1 als 100 Prozent gelesen - Faktor 100. Golden-Aenderung per `numstat` als exakt drei freigegebene Hashes bestaetigt, keine Metrik und keine Stichprobe beruehrt. Vier Restrisiken Z06-1 bis Z06-4, wichtigster Punkt Z06-1: `null <= 0.1` ergibt `true`, wodurch ein fehlender Flexwert in `jahreOhneFlex` als Jahr ohne Flex zaehlt und die an der Quelle gewonnene Missingness in der ersten Aggregation wieder verlorengeht |
| 2026-07-27 | Nachgelagerte Durchsicht aller implementierten Slices abgeschlossen | Slices 1, 2, 3, 4, 5, 6 und 7 sind durch Claude reviewt und freigegeben. Slice-uebergreifend offen bleibt die Fachentscheidung aus T03-2 und Y04-3: Gold aktiv mit Ziel 0 wird im Einzelprofil bis zur Engine durchgereicht, im Profilverbund dagegen zu Gold aus kollabiert |
| 2026-07-27 | Slice 2 Re-Review-Nachbesserung durch Codex | Gemini-Blocker REV-02-F01 durch profilgenaue Reservierung mit `sourceProfileId:trancheId` und diskriminierenden Red-/Green-Test behoben. W02-1 bis W02-3 durch globale Core-Reconciliation, brutto-kapazitaetsbegrenzte Steuerverteilung und fail-closed Nullkapazitaetsvertrag geschlossen; W02-4 in Akzeptanzkriterien und Nicht-Scope praezisiert; W02-5 ueber handlungsleitende `FinancialCalculationError`-Meldungen adressiert. `npm run build:engine`, `npm test` mit 7.722/7.722 Assertions und 16/16 Browser-Smokes gruen; unabhaengiges Re-Review ausstehend |
| 2026-07-27 | Slice 5 Nachimplementierung durch Codex | U05-1 mit explizitem Zwei-Jahres-Backtest-Orakel fuer aktive Rente, Nettoquote und Wealth-Faktor geschlossen; U05-4 weist nichtboolesche Rentenaktivierung fail-closed ab; U05-5 nutzt konsistent den normalisierten Floor; U05-3 als 100-Prozent-Legacy-Fallback getestet; U05-2 als separates Signatur-Refactoring dokumentiert. 132 Testdateien mit 7.702 Assertions und 16 Browser-Smokes gruen; Re-Review ausstehend |
| 2026-07-27 | Slice 8 durch Codex implementiert | Sweep verwendet den MC-Haushalts-/Life-/Pflegevertrag, den kanonischen Longevity-Horizon samt VPW sowie Tail-Risk-Schedule und -Overlay. O-12, O-13 und O-20 sind deterministisch gegen MC beziehungsweise die kanonischen Resolver belegt; Worker-/Serial-Provenienz ist identisch. Exakt sieben Programmdateien geaendert; `npm test` mit 7.794/7.794 Assertions und 16/16 Browser-Smokes gruen; unabhaengiges Review ausstehend |
| 2026-07-27 | Slice 3 Nachbesserung durch Codex | REV-03-F01/F02 und S03-1 behoben: explizite Goldziel- und Goldband-Nullwerte bleiben fuer DOM und Profile erhalten, waehrend Missing/Invalid weiter die dokumentierten Defaults nutzt. S03-2 als konkrete Writerverletzung praezisiert und behoben: der Tranchen-Sync schreibt Hidden-Felder kanonisch ohne Locale-Separator; sichtbare Textfelder bleiben de-DE-formatiert. S03-3/S03-4/S03-7 als separate Parser-/UX-Entscheidungen dokumentiert, S03-5 mit nachgewiesenem Normalpfad abgelehnt, S03-6 entspricht der bestaetigten Engine-Grenze. Scope dokumentiert auf sieben Programmdateien erweitert; 132 Testdateien mit 7.679 Assertions und 16 Browser-Smokes gruen; unabhaengiges Re-Review ausstehend |
| 2026-07-27 | Slice 8 durch Claude reviewt | Status blockiert mit zwei Blockern. A08-1: die neue Hinterbliebenenableitung in `calculateHouseholdPensionForYear` gattert die Witwenrente nicht am Rentenbeginn der verstorbenen Person, waehrend die eigene Rente korrekt gegattert wird. Im Sweep gemessen: `partner.startInJahren = 10`, Witwenanteil 55 Prozent, P2 stirbt in Jahr 4 - ab Jahr 5 flieszen 33.000,00 EUR Jahresrente, obwohl P2 nie eine eigene Rente bezog; Spiegelfall ueber `renteStartOffsetJahre = 8` liefert 22.000,00 EUR. Saemtliche Witwenfixtures verwenden `startInJahren: 0`. A08-2: das Entfernen der `careMetaP2`-Bedingung an der P2-Sterblichkeit korrigiert einen bisher unsterblichen Partner bei deaktivierter Pflegelogik, veraendert damit aber den Monte-Carlo-Pfad um +29,2 Prozent Median-Endvermoegen (587.853,50 auf 759.734,40 EUR, Ruinfaelle 5 auf 3); Attributionskontrolle mit aktiver Pflegelogik ist bitgleich. Das Delta ist im Delta-Ledger nicht benannt, in keinem Akzeptanzkriterium enthalten und im MC-Ergebnisvertrag nicht versioniert. Fuenf Restrisiken A08-3 bis A08-7. Positiv belegt: der Paar-Fall im Sweep war zuvor grob falsch (Median 585.370,25 auf 2.842.315,86 EUR), das Einzelprofil-Paritaetsorakel ohne Pflege haelt bitgleich, der Horizontkontrakt greift fail-closed und der Workerpfad meldet `SWEEP_WORKER_ERROR`. Gates unabhaengig nachgefahren: `npm test` 7.794/7.794 und `git diff --check` gruen |
| 2026-07-27 | Slice 8 Nachbesserung durch Claude re-reviewt | Status weiterhin blockiert, jedoch mit anderem Blocker. A08-1 geschlossen: die Hinterbliebenenleistung ist in beiden Richtungen am Rentenstart-Offset der verstorbenen Person gegattert, der Einstieg erfolgt exakt im Offsetjahr auf der bis dahin fortgeschriebenen Bemessungsgrundlage (40.226,82 EUR statt zuvor 33.000,00 EUR ab Jahr 5), ohne Nachzahlung und mit beidseitig diskriminierenden Orakeln. A08-2 geschlossen: das Delta ist im Delta-Ledger beziffert, `MonteCarloHouseholdLifeContractV1` mit `deltaLedgerId` A08-2 ueberlebt nachgemessen den Zwei-Chunk-Merge des Workerpfads, und O-12 sichert die korrigierte Semantik behavioral im MC-Hot-Path ab. A08-4 als benanntes Delta dokumentiert, A08-5 teilweise geschlossen. Neuer Blocker A08-8: `computeHouseholdFlexFactor` leitet die Paar-Eigenschaft weiterhin aus `careMetaP2 !== null` ab - dieselbe Fehlerklasse, die A08-2 eine Funktion weiter gerade geschlossen hat. Bei deaktivierter Pflegelogik erhaelt ein ueberlebender Partner den temporaeren Flexfaktor 0,00 statt 0,75 (ueberlebender P1: 1,00 statt 0,75); der Wert 0 erreicht `simulateOneYear` und streicht die flexible Entnahme fuer den Rest des Horizonts, was die Ergebnisse optimistisch verzerrt. Die betroffene Datei `simulator-engine-helpers.js` liegt bereits im Slice-Scope. Gates unabhaengig nachgefahren: `npm test` 7.809/7.809 und `git diff --check` gruen |
| 2026-07-27 | Slice 8 zweite Nachbesserung durch Claude re-reviewt | Status freigegeben, keine Blocker. A08-8 geschlossen: `computeHouseholdFlexFactor` leitet die Paar-Eigenschaft jetzt aus `hasPartner` statt aus `careMetaP2 !== null` ab. Beide Sterberichtungen liefern bei aktivem Partner ohne Pflegefall den kanonischen Haushaltsfaktor 0,75 (vorher 0,00 beziehungsweise 1,00), die Einzelprofil-Paritaet bleibt erhalten und das Sweep-Paritaetsorakel bitgleich bei 585.370,2476467057 EUR; End-to-End im Sweep (P1 92 / P2 66, Seed 4242) nachgemessen 0,75 ab dem Jahr nach P1-Tod. A08-5 geschlossen: die Pflege- und Witwenjahreszaehler stehen jetzt im `engineStepExecuted`-Gate, belegt durch `widowP2ActiveYears` 470 auf 464 bei genau 6 Gesamttodesfaellen. Vier neue Restrisiken beziehungsweise Hinweise B08-1 bis B08-4, wichtigster Punkt B08-1: ein fehlendes `hasPartner` degradiert stumm zu Einzelprofil und liefert fuer ein Paar mit Pflege 0,00 statt 0,75; B08-2: das A08-8-Ergebnisdelta ist benannt, aber nicht beziffert (gemessen -11,7 Prozent Median im Sweep, +3,6 Prozent im MC, Kontrolle mit Pflege bitgleich). Gates unabhaengig nachgefahren: `npm test` 7.830/7.830 und `git diff --check` gruen, keine Golden- oder dist-Datei beruehrt |
| 2026-07-27 | Slice 9 durch Claude reviewt | Status blockiert mit einem Blocker. Belegt korrekt: die Richtungsumkehr von D-06 sitzt richtig - die Vorversion las den guten Tail und lieferte auf einem Gitter mit rund 50 Prozent Ruinquote 6,47 bis 14,60 Prozent; der kanonische Quantilhelfer sortiert intern und mutiert das Aufruferarray nicht; `readSweepMetricValue` ist fail-closed und diskriminierend; `window.sweepResults` wird nirgends persistiert, die harte Ablehnung unversionierter Shapes kann daher keinen gespeicherten Sweep unbrauchbar machen; ausserhalb von `sweep-runner.js` und den Tests gibt es keinen Konsumenten der geaenderten `aggregateSweepMetrics`-Form. Blocker C09-1: oberhalb einer Ruinquote von rund 5 Prozent rastet das P95 auf den Terminalruin ein und ist ueber alle Kombinationen konstant 100 (gemessen 5,0 Prozent Ruinquote auf 37,30, 5,5 Prozent auf 100,0000); auf dem realen 15er-Gitter liefern alle 15 Kombinationen 100,0000, die Heatmap rendert 15 von 15 Zellen in der Mittelfarbe ohne jeden Hinweis, die Pareto-Frontier kollabiert auf 1 von 15 Punkten und das Ranking entscheidet nach Array-Reihenfolge - die neu eingefuehrte `SweepComparisonDiagnosticsV1` weist Runzahl, CRN und Quantilunsicherheit aus, diesen Zustand jedoch nicht. Vier Restrisiken: C09-2 Default-Constraint `worst5Drawdown <= 40` unerfuellbar (0 von 15 zulaessig schon bei 4,5 Prozent Ruinquote), C09-3 `commonAcrossCombinations` als Literal gegen nachweislich divergierende Fingerprints, C09-4 Sweep und Monte Carlo definieren den Drawdown unterschiedlich (Anteil der 100-Prozent-Laeufe 49,50 gegen 5,50 Prozent bei identischer Ruinhaeufigkeit), C09-5 der Fixturebestand ist blind fuer die CRN-Umstellung (genau ein Fixture mit start 1), waehrend sich die Empfehlung real verschiebt. Vier Hinweise C09-6 bis C09-9. Gates unabhaengig nachgefahren: `npm test` 7.930/7.930 und `git diff --check` gruen, keine Golden- oder dist-Datei beruehrt |
| 2026-07-27 | Slice 9 Nachbesserung durch Claude re-reviewt | Status freigegeben, keine Blocker. C09-1 geschlossen: `SweepComparisonDiagnosticsV2` weist Terminalruinanzahl, -anteil und `quantileInTerminalRuinBlock` aus; im hohen Ruinregime werden 15 von 15 Kombinationen als gesaettigt markiert, Heatmap und Pareto tragen den Hinweis und `findBestParameters` verweigert die Fuehrung statt den Array-Index zu waehlen. C09-3 geschlossen mit scharfem Nachweis: die qualifizierte CRN-Zusage ist zutreffend - bei 0 Prozent Ruin existiert genau 1 distinkter Sampling-Fingerprint ueber 15 Kombinationen, bei 4,5 Prozent 7 und bei 50 Prozent 14. C09-2 (Demo-Constraint entfernt), C09-4 (Runnergrenze in Metadaten und Consumern sichtbar), C09-5 (wirkungsverschiedener Regressionsfall), C09-6 bis C09-9 ebenfalls geschlossen. Neun neue Restrisiken und Hinweise D09-1 bis D09-9, wichtigster Punkt D09-1: CRN macht Ordnungsstatistiken ueber Kombinationen bitgleich - `minRunwayObserved` ist in allen drei Regimen 1 von 15 distinkt, `successProbFloor`, `medianEndWealth` und `maxEndWealth` sind im ruinfreien Fall 1 von 15 distinkt, und nur `meanEndWealth` unterscheidet durchgaengig. Die neue Gleichstandsregel verweigert dadurch in 8 von 12 gemessenen Metrik-Regime-Kombinationen jede Parameterausgabe; das Verhalten ist inhaltlich richtig, aber weder vermessen noch dokumentiert. D09-2: der Saettigungsdetektor verlangt exakt 100, sodass 4,5 Prozent Terminalruin mit einem P95 von 92,84 bis 98,60 ungekennzeichnet bleibt. D09-3: der `RangeError` der neuen Bereichspruefung wird nicht gefangen und verwirft die Ergebnisse aller Kombinationen statt nur der betroffenen. D09-8: das G09-1-Delta ist unbeziffert, isoliert gemessen bis 4,77 Prozent beziehungsweise 120.655,82 EUR im P75. Gates unabhaengig nachgefahren: `npm test` 7.951/7.951 und `git diff --check` gruen, keine Golden- oder dist-Datei beruehrt |
| 2026-07-27 | Slice 8 Blocker-Nachbesserung durch Codex | A08-1 symmetrisch behoben: Hinterbliebenenleistung bleibt bis zum Rentenstart-Offset der verstorbenen Person 0 EUR und beginnt erst am Offset; direkte Spiegel- und Sweep-End-to-End-Orakel gruen. A08-2 als beabsichtigtes +29,2-Prozent-MC-Delta benannt und ueber `MonteCarloHouseholdLifeContractV1`/`deltaLedgerId=A08-2` in Serial-, Worker- und Exportdiagnostik versioniert; No-Care-P2-Todesfixture diskriminiert die fruehere Unsterblichkeit. A08-5 zusaetzlich behoben. A08-3 bleibt Fachentscheidung, A08-6 Payloadgrenze, A08-7 wegen Sieben-Dateien-Stopregel Folgecontract. `npm test` 7.809/7.809 Assertions und 16/16 Browser-Smokes gruen; unabhaengiges Re-Review ausstehend |
| 2026-07-27 | Slice 8 zweite Blocker-Nachbesserung durch Codex gestartet | Claude hat A08-1, A08-2 und A08-4 geschlossen und A08-8 neu blockiert. Die Paar-Eigenschaft der Haushalts-Flexlogik wird von optionalen Pflege-Metadaten entkoppelt und explizit aus dem kanonischen Partnerstatus gespeist; beide Sterberichtungen ohne Pflegelogik erhalten ein direktes und ein Sweep-End-to-End-Orakel. Die verbleibenden A08-5-Pflege-/Witwenjahreszaehler werden am Engine-Step gegattert. Alle vier betroffenen Programmdateien liegen bereits im Sieben-Dateien-Scope; Umsetzung und Validierung laufen. |
| 2026-07-27 | Slice 8 zweite Blocker-Nachbesserung durch Codex abgeschlossen | A08-8 technisch behoben: `computeHouseholdFlexFactor` ermittelt den Paarstatus explizit ueber `hasPartner`, unabhaengig von optionalen Pflege-Metadaten. Direkte Spiegelorakel liefern bei genau einer lebenden Person ohne Pflegelogik beidseitig 0,75; der Sweep-Witness P1 92/P2 66, Seed 4242, reicht nach P1-Tod ebenfalls 0,75 statt zuvor 0,00 an den Engine-Schritt. Der MC-Hot-Path belegt die Gegenrichtung ueber den tatsaechlichen `flex_brutto`-Engine-Output. Der Household-Life-Untervertrag ist als `MonteCarloHouseholdLifeContractV2` mit A08-2/A08-8-Provenienz in Serial-, Worker- und Exportpfad versioniert. A08-5 ist einschliesslich Pflege-/Witwenjahreszaehlern geschlossen; Todesereignisse bleiben erhalten. Exakt sieben Programmdateien im Gesamt-Slice-Scope; `npm test` 7.830/7.830 Assertions und 16/16 Browser-Smokes gruen; unabhaengiges Re-Review ausstehend. |
| 2026-07-27 | Slice 9 durch Codex implementiert | Versionierter Sweep-Metrik- und Drawdownvertrag, terminaler 100-Prozent-Ruin, Common Random Numbers je Run-Index, Wilson-Intervall sowie fail-closed Heatmap-, Constraint-, Pareto- und Parametervergleich umgesetzt. Legacy-Stream-Anforderungen werden fuer CRN nachvollziehbar auf isolierte Per-Run-Seeds aufgeloest. Exakt acht Programmdateien geaendert; `npm test` mit 7.930/7.930 Assertions, 0 offenen Handles, 16/16 Browser-Smokes und `git diff --check` gruen; unabhaengiges Review ausstehend. |
| 2026-07-27 | Slice 9 Review durch Gemini ergaenzt | Claudes Blocker C09-1 zur nicht ausgewiesenen P95-Saettigung bestaetigt und G09-1 als zweiter Blocker ergaenzt: P10, P25, Median und P75 verwendeten weiterhin `Math.floor(n * q)` statt des kanonischen interpolierten Quantilhelfers. G09-2 fordert sichtbare Legacy-/Migrationshinweise. Status blockiert. |
| 2026-07-27 | Slice 9 Blocker-Nachbesserung durch Codex abgeschlossen | C09-1 und G09-1 technisch behoben: `SweepMetricsV3`/`SweepComparisonDiagnosticsV2` diagnostizieren Terminalruin-Saettigung, alle Vermoegensquantile verwenden kanonische Interpolation, Heatmap/Pareto/Ranking warnen sichtbar und Gleichstaende waehlen nicht mehr nach Array-Reihenfolge. C09-2/C09-3, C09-5 bis C09-9 und G09-2 nachgebessert; C09-4 als sichtbare Sweep-/MC-Modellgrenze dokumentiert. Exakt acht Programmdateien im Scope; `npm test` 7.951/7.951 Assertions, 0 offene Handles, 16/16 Browser-Smokes und `git diff --check` gruen; unabhaengiges Re-Review ausstehend. |
| 2026-07-27 | Slice 10 durch Codex implementiert | Zentrale kanonische Optimizer-Registry, Gold-/Nullwerttreue, versionierte Evaluate-/Apply-Fingerprints, fail-closed Apply-Preflight, expliziter Direct-Horizon-Vertrag sowie sichtbare MC-Sampling-, CAPE-, Filter- und disjunkte Seedprovenienz umgesetzt. Alle neun interaktiven Parameter besitzen kontrollierte Kausalitaets-Witnesses. Exakt acht Programmdateien geaendert; `npm test` mit 8.036/8.036 Assertions, 0 offenen Handles, 16/16 Browser-Smokes, Coverage-Gates bei 78,21 Prozent und `git diff --check` gruen; unabhaengiges Review ausstehend. |
| 2026-07-27 | Slice 10 durch Claude reviewt | Status blockiert mit drei Blockern. E10-1: Die HTML-Domains fuer `rebalBand` (bis 50), `survivalQuantile` (bis 0,99) und `goGoMultiplier` (bis 1,5) sind weiter als die Registry-Domains; die neu aus den Rahmendaten gelesene Vergleichskonfiguration bricht den vollstaendigen Lauf gemessen erst nach 168 Kandidatenevaluationen mit `AUTO_OPTIMIZE_PARAMETER_DOMAIN_INVALID` ab und vernichtet das Ergebnis. E10-2: `longevityMode=buffer_years` bzw. `relative_horizon_buffer` ersetzt den direkten Horizont still (15 zu 25, 55 zu 60), waehrend `AutoOptimizeRequestFingerprintV1` den angeforderten Wert bezeugt; gemessene Abweichung 291.152,23 EUR Median-Endvermoegen. E10-3: `maxBearRefillPct` veraendert in acht Szenarien keine vom Optimizer bewertete Metrik, weil `computeCappedRefill` das Cap bei kritischer Liquiditaet auf 10 Prozent des Aktienwerts anhebt; der mitgelieferte Witness prueft den Zweig `isCriticalLiquidity=false`, den der Runner beim Bear-Refill nicht nimmt - die Stop-Regel dieser Slice ist ausgeloest. Sieben weitere Restrisiken und Hinweise (E10-4 bis E10-10). Gates unabhaengig nachgefahren: `npm test` 8.036/8.036, 0 offene Handles, `git diff --check` gruen. |
| 2026-07-27 | Slice 10 Blocker-Nachbesserung durch Codex technisch umgesetzt | E10-1: Formular-, Registry- und Engine-Domains abgeglichen; Suchbereiche und aktuelle Vergleichskonfiguration stoppen mit konkretem Fehler vor der ersten Evaluation. E10-2: `direct` ist nun der unveraenderte Endhorizont und ignoriert alle aktuarischen Longevity-Anpassungen; 15/55 sind ueber vier Longevity-Modi im Resolver und mit aktiven Puffermodi im normalen MC belegt. E10-3: `maxBearRefillPct` aus Picker und Presets entfernt, ohne Engine-Semantik zu aendern; expliziter Nullwert-/Apply-Vertrag bleibt erhalten. E10-4 bis E10-8 sowie G10-1 wurden nachgebessert; G10-2 ist durch fruehe Moduspruefung und den bestehenden Force-Off-Baseline-Test abgedeckt. E10-9 bleibt als ausgewiesenes Profil-Ownership-Restrisiko bestehen und wird nach Apply sichtbar gewarnt. `npm test` 8.080/8.080, 0 offene Handles, Browser 16/16, Coverage-Gates bei 78,25 Prozent und `git diff --check` gruen; unabhaengiges Re-Review ausstehend. |
| 2026-07-27 | Slice 10 Nachbesserung durch Claude re-reviewt | Status freigegeben, keine Blocker. E10-1 geschlossen: Registry-, Formular- und Enginedomain sind deckungsgleich (`rebalBand` 1 bis 20, `survivalQuantile` 0,50 bis 0,99, `goGoMultiplier` 1,00 bis 1,50 entsprechen den Enginegrenzen); domain- und reihenfolgewidrige Rahmendaten sowie Suchbereiche stoppen gemessen nach exakt 0 Kandidatenevaluationen statt nach 168. E10-2 geschlossen: Der Direktmodus liefert 15/55 in allen fuenf Longevity-Modi unveraendert, Transition-Smoothing wird uebergangen, die ignorierte Longevity-Konfiguration bleibt ueber `longevityConfiguredMode` sichtbar. E10-3 geschlossen: `maxBearRefillPct` ist aus Picker und allen sechs Presets entfernt; die acht verbliebenen Dimensionen bewegen im neutralen Szenario messbar mindestens eine Metrik. E10-4 bis E10-8 und E10-10 nachgebessert und durch Gegenproben bestaetigt; E10-9 bleibt bewusst offen und ist in der Apply-Meldung benannt. Sieben neue Restrisiken und Hinweise F10-1 bis F10-7, wichtigster Punkt F10-1: `rebalBand` besitzt ueber die gesamte Domain genau einen distinkten `medianEndWealth`-Wert und trennt die Standardzielmetrik `EndWealth_P50` nicht. Gates unabhaengig nachgefahren: `npm test` 8.080/8.080 Assertions, 0 offene Handles, `git diff --check` gruen. |
| 2026-07-27 | Slice 11 durch Codex implementiert | Nutzerentscheidung D-14 Variante 1 umgesetzt: pro Run arithmetisches Mittel der endlichen realisierten Entnahmequoten aus erfolgreich berechneten Entnahmephasenjahren, danach Median ueber auswertbare Runs mit expliziter Missingness. P10/P25/P50 und MC-Drawdown P90 werden aus gepoolten kanonischen Run-Rohverteilungen berechnet; `AutoOptimizeMetricResultV1` macht Objective, Constraints und Tiebreaker fail-closed. Nutzer erweiterte den Scope nach Ressourcen-Stop auf sieben Programmdateien. Buffer 93 auf 106 Byte je Run; Standardmessung 977,62585 Worker-Result-Byte je Run, Vertrag gerundet 978. `post-suite-data-11-v1` und Delta-Ledger bleiben bis zum externen Review pending. `npm test` 8.290/8.290 Assertions, 0 offene Handles, Browser 16/16, Coverage 78,29 Prozent und `git diff --check` gruen; Review, Commit und Push ausstehend. |
| 2026-07-27 | Slice 11 durch Claude reviewt | Status blockiert mit drei Blockern. E11-1: Das tatsaechlich berechnete finale Ruinjahr fehlt entgegen der Nutzerentscheidung D-14 in der Metrik, weil das Ruin-Jahresergebnis kein `logData` traegt und `monte-carlo-runner.js` nur endliche Quoten aufnimmt; gemessen fehlt in 82 von 82 Ruinlaeufen genau diese Beobachtung, waehrend das Aggregat `includedYears: successfully_calculated_...` behauptet - der Ausschluss trifft das Jahr mit der hoechsten realisierten Quote und beguenstigt depotzerstoerende Kandidaten. E11-2: Technisch gescheiterte Runs behalten die Initialwerte der Buffer und gehen als Endvermoegen 0 EUR und Drawdown 0 Prozent in die neuen Rohverteilungen ein, waehrend `sampleSize` die volle Stichprobe meldet; gemessen sinkt Drawdown P90 von 66,0000 auf 57,9192 Prozent bei 20 Prozent Fehlerquote und der harte Constraint `dd55` kippt ab 28 Prozent von verletzt auf erfuellt. E11-3: Eine fehlende Entnahmequote wirkt in der objectivewirksamen Safety-Penalty exakt wie eine beobachtete Null (612,50 EUR in beiden Faellen); der Zustand ist ueber eine reine Ansparphase erreichbar (40 von 40 Runs ohne Beobachtung). Die Schliessung von E11-3 erfordert `auto_optimize.js` als achte Programmdatei und loest die Stop-Regel erneut aus. Zwoelf weitere Restrisiken und Hinweise E11-4 bis E11-15, wichtigster Punkt E11-8: Das Versionsgate des Tiebreakers passiert zwei unversionierte Shapes, und genau solche verwendet der gesamte `runAutoOptimize`-Integrationstest. Gates unabhaengig nachgefahren: `npm test` 8.290/8.290 Assertions, 0 offene Handles, `npm run test:browser` 16/16, O-21 18/18, Worker-/Serial-Paritaet 15/15 und `git diff --check` gruen; genau sieben Programmdateien, `engine/`, `dist/` und Release-Artefakte unveraendert. |
| 2026-07-27 | Slice 11 Blocker-Nachbesserung durch Codex technisch umgesetzt | Nach ausdruecklicher Nutzerfreigabe wurde der Scope auf exakt neun Programmdateien erweitert. E11-1: Das reale finale Ruinjahr traegt effektive Entnahme, Depotnenner, Quote und Terminalmarker und bleibt in D-14 enthalten. E11-2: `MonteCarloFinancialRunDistributionV1` entfernt technische Pfade aus Endvermoegens- und Drawdownverteilungen, inventarisiert `sampleSize`, `excludedRuns` und technische Missingness; der Optimizer weist solche Batches fail-closed ab. E11-3: Die Dynamic-Flex-Safety-Penalty verlangt die endliche D-14-Metrik und behandelt Missingness nicht mehr wie 0. E11-5/E11-7/E11-8/E11-9/E11-13 wurden gekoppelt nachgebessert; E11-4 und E11-6 bleiben explizite Restrisiken. Fokussierte Verträge, Sofortruin-Witness, technische Verteilung, Worker und Parität sind gruen; `npm test` 8.328/8.328 Assertions, 0 offene Handles, Browser 16/16, Coverage 78,33 Prozent und `git diff --check` gruen. Engine, `engine.js`, `dist` und Release-Artefakte unveraendert; unabhaengiges Re-Review, Commit und Push ausstehend. |
| 2026-07-27 | Slice 11 Nachbesserung durch Claude re-reviewt | Status weiterhin blockiert, ein verbleibender Blocker. Geschlossen sind E11-2 (technische Pfade werden aus den Rohverteilungen gefiltert, `requestedRuns`/`sampleSize`/`excludedRuns`/`missingness` sind real, der Constraintumschlag von `dd55` bei 28 technischen Fehlern tritt nicht mehr ein und Endvermoegen P10 bleibt bei 1.000.000), E11-3 (fehlende Entnahmequote wirft in der Safety-Penalty `AUTO_OPTIMIZE_METRIC_UNAVAILABLE` statt 612,50 EUR wie eine echte Null), E11-7, E11-8 (Versionsgate unbedingt, auch zwei unversionierte Shapes werden abgewiesen, Integrationsfixtures versioniert), E11-9 (nur primitive endliche `number`; `true`, `'0.995'`, `[]`, `[0.995]`, `NaN` werden abgewiesen) und E11-13. Nicht geschlossen ist E11-1, fortgefuehrt als F11-1: Das Ruinjahr wird jetzt in allen 82 Ruinlaeufen aufgenommen, aber mit `totalWealthAvailable` beziehungsweise Auszahlung plus vollstaendigem Depot als Zaehler statt mit `jahresEntnahmeEffektiv`; im ersten Zweig wird ueberhaupt nichts entnommen. Die Quote ist dadurch nach oben unbeschraenkt - gemessen 2.100 Prozent bei Restdepot 1.000 EUR, 2.000.100 Prozent bei Restdepot 1 EUR und ein Runmittelwert von 924,369 im realen Lauf - und springt bei Restdepot 0 EUR auf den guenstigsten Wert 0,0 Prozent, was der neue Test ausdruecklich als Politik festhaelt. Beide neuen Ruintests setzen die Liquiditaet auf 0, die einzige Konstellation, in der die Zaehlerersetzung unsichtbar bleibt, und die zentrale Assertion vergleicht die Implementierung mit sich selbst. Fuenf neue Restrisiken F11-2 bis F11-6, wichtigster Punkt F11-2: D-14 ist auch ohne Ruin unbeschraenkt, weil der Zaehler aus dem Liquiditaetstopf und der Nenner ueber `sumDepot()` ohne diesen Topf gebildet wird - gemessen 288,0 Prozent in einem regulaeren, nicht ruinierten Jahr; das erfordert eine Folgeentscheidung des Nutzers zu D-14. E11-4, E11-6, E11-10 bis E11-12, E11-14 und E11-15 bleiben unveraendert offen. Gates unabhaengig nachgefahren: `npm test` 8.328/8.328 Assertions, 0 offene Handles, `npm run test:browser` 16/16 und `git diff --check` gruen; genau neun Programmdateien, `engine/`, `dist/` und Release-Artefakte unveraendert. |
| 2026-07-27 | Slice 11 F11-1-Nachbesserung durch Codex technisch umgesetzt | Der unveraenderte D-14-Zaehler ist in beiden Ruinzweigen wieder die tatsaechliche `jahresEntnahmeEffektiv`: vor dem Auszahlungsschritt exakt 0, nach einer Teilauszahlung ausschliesslich der `payout`-Betrag; Restvermoegen bleibt getrennte `coveredFloorNominal`-Diagnostik. Der neue direkte Witness mit 20.000 EUR Liquiditaet und 1.000 EUR Depot diskriminiert die fehlerhaften 2.100 Prozent und erwartet exakt 0 Auszahlung/0 Prozent; der reale Drei-Pfad-Witness behaelt je Run eine beobachtete terminale D-14-Zeile. Metadaten, Snapshot und Delta-Ledger nennen `jahresEntnahmeEffektiv_actual_payout_only`. F11-2 bleibt als fachliche Folgeentscheidung offen und wurde nicht vorweggenommen. Weiterhin exakt neun Programmdateien; `npm test` 8.333/8.333 Assertions, 0 offene Handles, Browser 16/16, Coverage 78,33 Prozent, Worker-/Chunk-Paritaet und `git diff --check` gruen; erneutes unabhaengiges Re-Review, Commit und Push ausstehend. |
| 2026-07-27 | Slice 11 F11-1-Nachbesserung durch Claude re-reviewt | Status freigegeben, keine Blocker. F11-1 geschlossen: Der Vor-Auszahlungs-Ruin setzt `effectiveWithdrawalNominal` auf exakt 0 - nachgeprueft korrekt, weil die Funktion vor `liquiditaet -= payout` zurueckkehrt - und der Auszahlungs-Fallback auf den tatsaechlichen `payout`, ebenfalls korrekt, weil `applyPayoutFallbackSale` `isRuin` vor jeder Tranchenreduktion zurueckgibt; die Klammerung auf `coveredFloorNominal` bindet in keinem Zweig. Die Einzeljahresmessung liefert in allen Ruinfaellen 0,0 Prozent statt zuvor 2.100, 20.100 und 2.000.100 Prozent; der Sprung um zwei Millionen Prozentpunkte zwischen Restdepot 1 EUR und 0 EUR existiert nicht mehr. Im realen Lauf mit identischem Seed 777001 sinkt der groesste Runmittelwert von 924,369 auf 1,64785, Runmittel ueber 1,0 von 7 auf 4. Vertragsfeld `terminalRuinYearNumerator` und Delta-Ledger sind mitgezogen; der neue Witness verwendet Depot 1.000 mit Liquiditaet 20.000 - genau die Konstellation der frueheren 2.100 Prozent - und trennt `coveredFloorNominal` von `effectiveWithdrawalNominal` in getrennten Assertions, die tautologische Pruefung ist ersetzt. Das erstmals am Ruinobjekt vorhandene `logData` erzeugt bei keinem Konsumenten einen Seiteneffekt: Backtest-Runner faengt Ruin in Zeile 530 vor der `logData`-Pruefung in Zeile 599 ab, Sweep-Runner bricht im `isRuin`-Zweig ab, der MC-Runner nutzt weiterhin `buildMonteCarloRuinLogRow`. Vier neue Hinweise G11-1 bis G11-4, wichtigster Punkt G11-1: Die vertraglich geforderte Aufnahme des Ruinjahrs senkt D-14 fuer ruinierende Kandidaten (0,19986 ausgeschlossen gegen 0,19037 eingeschlossen), weil der einzige erreichbare Ruinzweig immer 0 beitraegt; G11-2: Der Auszahlungs-Fallback als einziger Zweig mit einem von null verschiedenen Ruinzaehler wurde in 504 systematisch variierten Kombinationen nie erreicht und besitzt keinen Witness. Unveraendert offen bleiben F11-2 bis F11-6 sowie E11-4, E11-6, E11-10 bis E11-12, E11-14 und E11-15; wichtigster Restrisikopunkt bleibt F11-2 - D-14 ist ueber die Normaljahrformel nach oben unbeschraenkt (gemessen 288,0 Prozent in einem regulaeren Jahr) und erfordert eine Folgeentscheidung des Nutzers. Die Freigabe bezieht sich auf die korrekte Umsetzung der entschiedenen Formel, nicht auf ihre fachliche Eignung als Entnahmerate. Gates unabhaengig nachgefahren: `npm test` 8.333/8.333 Assertions, 0 offene Handles, `npm run test:browser` 16/16 und `git diff --check` gruen; genau neun Programmdateien, `engine/`, `dist/` und Release-Artefakte unveraendert. |
| 2026-07-27 | Slice 12 durch Codex technisch umgesetzt | `BALANCE_IMPORT_INPUT_SCHEMA_V1` inventarisiert Typen, Bounds, Enums und komplexe Detailvertraege; aktuelle Booleanfelder akzeptieren nur echte Booleans, waehrend ausschliesslich der benannte Legacy-Pfad historische String-/Zahlformen migriert. Manuelle Markt-CSVs werden vor jeder Mutation an Modus, Zielperiode, ISO-Stichtag, Instrument und Dateiquelle gebunden. D-13 ist umgesetzt: Vierjahresdaten liefern nur `windowHigh`, nie ein Engine-ATH. Preview, Recovery-Snapshot, Replace, Abschlusswrite und Provenienzbestaetigung sind transaktional verkettet; Quelle, Importzeit, Abdeckung, Zeilenzahl und Hoch-Scope ueberleben State, Reload, Export und Diagnose. Exakt fuenf Programmdateien; `npm test` 8.402/8.402 Assertions, 0 offene Handles, `npm run test:browser` 17/17 und `git diff --check` gruen. Engine, `engine.js`, `dist` und Release-Artefakte unveraendert; unabhaengiges Review, Commit und Push ausstehend. |
| 2026-07-27 | Slice 12 durch Claude reviewt | Status blockiert, drei Blocker. S12-1: `createBalanceExportDocument` validiert seit diesem Slice den kompletten Livezustand gegen den Importvertrag, dessen Bounds nie gegen die Reader-Defaults und die HTML-Attribute abgeglichen wurden; am Produktionsreader gemessen scheitert der Export unter anderem bei geleertem Feld "Rebalancing-Band" (Reader-Fallback 0 gegen `min: 1`), bei geleertem `aktuellesAlter` (0 gegen `min: 18`), bei `inflation` 60 (HTML ohne `max`), bei `horizonYears` 30,5 (`integer: true`), bei `profilName` mit 250 Zeichen und bei `flexBudgetYears` 12, waehrend `handleExport` mit `catch {` ohne Bindung Code und Feldnennung verwirft und nur "Der Balance-Zustand ist unvollstaendig oder beschaedigt" ausgibt. S12-2: `BALANCE_EXPORT_SCHEMA_VERSION` bleibt 1, der akzeptierte Wertebereich schrumpft aber materiell; bestehende `schemaVersion: 1`-Sicherungsdateien mit `rebalBand: 0`, `aktuellesAlter: 0` oder `targetEq: 0` werden gemessen abgewiesen, wobei `targetEq: 0` der Nullgrenzenentscheidung aus Slice 03 direkt widerspricht. S12-3: D-13 ist umgesetzt, obwohl der Stop-/Reviewpunkt des Slice die Entscheidung voraussetzt und der Hauptplan D-13 nur in der ausdruecklich nicht freigabegleichen Spalte `Empfehlung` fuehrt; die gemessene Folge ist, dass `ath = 0` ueber `hasAthBasis === false` das Regime `side_long` statt `bear_deep` erzeugt (26,7 % und 45,0 % Fensterabstand aus derselben CSV) und damit die einzige defensive Reaktion der Engine abschaltet - `flex-rate-policy.mjs` kuerzt nur im Zweig `bear_deep` um `50 + max(0, Abstand - 20)`, also 0 statt bis zu 75 Prozentpunkten, `FLEX_BUDGET.ACTIVE_REGIMES`, `alarm-policy.mjs` und die Baerenzweige der Verkaufslogik bleiben inaktiv; ein `windowHigh` waere als untere Schranke des wahren ATH konservativ. Sieben Restrisiken S12-4 bis S12-10, darunter die Exportsperre nach jeder Marktdatenkorrektur bei aktiver CSV-Provenienz, sichtbar bleibende Preview-Ergebnisse nach spaetem CSV-Fehlschlag, zwei divergierende Provenienzrenderer (`allTimeHigh` gegen `unbekannt` an identischer Onlineprovenienz) und ein Exportpfad, der nur gegen fuenf von 66 Vertragsfeldern getestet ist. Gegengeprueft ohne Befund: vollstaendiger Feldinventar-Abgleich Reader gegen Schema, `ath = 0` wird von `MarketAnalyzer` korrekt als nicht verfuegbar behandelt, beide Provenienzrenderer schreiben nur ueber `textContent`, und die neuen `marketCsv*`-Felder erreichen `dom.inputs`. Gates unabhaengig nachgefahren: `npm test` 8.402/8.402 Assertions, 0 offene Handles, `npm run test:browser` 17/17 und `git diff --check` gruen. |
| 2026-07-28 | Slice 12 Blocker-Nachbesserung durch Codex technisch umgesetzt | Der Nutzer entschied D-13 als gerichtete konservative Fensterhoch-Untergrenze. S12-1: Recovery-Exporte sind vom strikten Import-Gate getrennt, bleiben bei erreichbaren Domainabweichungen moeglich und inventarisieren Code/Feld unter `validationWarnings`; strukturelle Fehler erreichen die UI unverkuerzt. S12-2: Export-/Inputvertrag V2 mit benanntem V1-Migrator; `targetEq: 0`, `rebalBand: 0`, historische Prozentwerte und alte CSV-Provenienz sind abgedeckt. S12-3: `windowHigh` bleibt als nicht verifiziertes ATH gekennzeichnet und wird ueber die separate Policy `window_high_as_conservative_ath_lower_bound` intern als Untergrenze verwendet; der 45-Prozent-Witness liefert wieder `bear_deep`. S12-4, S12-6, S12-7 und S12-10 wurden gekoppelt nachgebessert. Der Browser-Gate deckte zusaetzlich vier profilaggregierte Goldfelder auf; diese sind nun typisiert und intern konsistenzgeprueft. Exakt fuenf Programmdateien, Engine und generierte Artefakte unveraendert; fokussiert 565/565, `npm test` 8.446/8.446 Assertions bei 0 offenen Handles, Browser 17/17 und `git diff --check` gruen; unabhaengiges Re-Review ausstehend. |
| 2026-07-28 | Slice 12 Blocker-Nachbesserung durch Claude re-reviewt | Status weiterhin blockiert, zwei neue Blocker. Geschlossen sind S12-1 (Bounds auf `aktuellesAlter` 0..130, `targetEq` 0..90 und `rebalBand` 0..20 geweitet, Export vom Import-Gate getrennt, `handleExport` gibt `[code]: message` aus; geleertes Rebalancing-Band, geleertes Alter und `targetEq: 0` exportieren gemessen ohne Warnung und sind reimportierbar), S12-2 (Export `schemaVersion: 2` mit `inputSchemaVersion: 2`, V1-Dateien ueber einen benannten Aufwaertsmigrator), S12-4, S12-6 (beide Provenienzrenderer liefern gemessen identische Hoch-Scopes), S12-7 und S12-10; der Baerenfall von S12-3 ist geschlossen, 45,0 Prozent Fensterabstand liefern gemessen `bear_deep` statt `side_long`. Neuer Blocker T12-1: `migrateBalanceStateV1` ruft `validateBalanceState` nicht auf, wodurch zehn von zehn gemessenen Vertragsverletzungen - unbekanntes Zusatzfeld, String-Boolean, `targetEq: 5000`, `kirchensteuerSatz: 0.5`, freies `risikoprofil`, ungueltige `horizonMethod`, `inflation: 9999`, kaputte Tranchen, widerspruechlicher Pflegebucket und 5.000 Zeichen `profilName` - den Import passieren, sobald das Dokument `schemaVersion: 1` traegt; der Legacy-V0-Pfad ist dabei von validiert auf unvalidiert zurueckgefallen, und die Codebegruendung "die Import-Preview bleibt der fachliche Laufzeit-Check" traegt nicht, weil `validateBalanceInputs` nur `minimumFlexAnnual` gegen `flexBedarf` prueft. Neuer Blocker T12-3: Faellt das Fensterhoch mit dem letzten CSV-Datenpunkt zusammen - der Normalfall eines steigenden Vierjahresfensters -, setzt `engineValues.ath = parsed.high.value` den ATH gleich `endeVJ`; gemessen ergibt das `peak_hot` mit ATH-Abstand 0,0 Prozent und der Begruendung "Neues Allzeithoch", also genau die von D-13 und der Nutzerentscheidung verbotene Behauptung, waehrend dieselbe Provenienz `ath.value: null` und `scope: unavailable_manual_window` ausweist; `REGIME_MAP` bildet `peak_hot` auf `peak` ab und erlaubt damit `RATE_CHANGE_AGILE_UP_PP` mit 4,5 statt 2,5 Prozentpunkten. Vier neue Restrisiken T12-2 bis T12-6, darunter mit Warnung exportierte und dadurch nicht mehr reimportierbare Dateien sowie ein CSV-Import, der neu an vertragsfremden Livewerten scheitert. Unveraendert offen bleiben S12-5, S12-8 und S12-9. Gates unabhaengig nachgefahren: `npm test` 8.446/8.446 Assertions, 0 offene Handles, `npm run test:browser` 17/17 und `git diff --check` gruen. |

| 2026-07-28 | Slice 12 neue Re-Review-Blocker durch Codex technisch nachgebessert | T12-1: `balance-state` V1 und Legacy-V0 durchlaufen nach ausschliesslich expliziten Migrationen denselben vollstaendigen V2-Vertrag; unbekannte Felder, Bounds, Enums und ueberlange Strings werden vor DOM und Persistenz abgewiesen, unterstuetzte Legacy-Booleans liegen vor dem Gate als echte Booleans vor. T12-3: Die Fensterhoch-Untergrenze ist gerichtet - nur `windowHigh > endeVJ` setzt Engine-ATH und Referenzalter; Gleichstand setzt `ath = 0`, `jahreSeitAth = 0`, `engineReference.applied = false` und liefert im steigenden Witness `side_long` ohne „Neues Allzeithoch“, waehrend der 45-Prozent-Witness `bear_deep` bleibt. T12-5: keine Kirchensteuer-Prozentheuristik mehr. T12-6: Entscheidung beschreibend dokumentiert. Exakt fuenf Programmdateien im Slice-Scope; Engine und generierte Artefakte unveraendert. Fokussiert 581/581, `npm test` 8.462/8.462 Assertions bei 0 offenen Handles, Browser 17/17 und `git diff --check` gruen; erneutes unabhaengiges Re-Review ausstehend. |
| 2026-07-28 | Slice 12 T12-Nachbesserung durch Claude re-reviewt | Status freigegeben, keine Blocker. T12-1 geschlossen: `migrateBalanceStateV1` endet jetzt mit `return validateBalanceState(migrated)`, wodurch neun der zehn im ersten Re-Review gemessenen Vertragsverletzungen sowohl auf dem V1- als auch auf dem V0-Pfad abgewiesen werden; die zehnte ist die in den Akzeptanzkriterien ausdruecklich vorgesehene Kanonisierung historischer Boolean-Strings durch den benannten Migrator. T12-3 geschlossen: `buildManualWindowHighEngineReference` setzt `applied` nur bei `windowHigh > letzter Kurs`; der steigende Vierjahres-Witness liefert gemessen `side_long` mit `ath = 0`, `engineReference.applied: false` und der Begruendung "ATH-Daten fehlen" statt zuvor `peak_hot` mit "Neues Allzeithoch", waehrend die Einbrueche mit 45,0 und 26,7 Prozent unveraendert `bear_deep` bleiben; die Kreuzpruefung und `validateAnnualMarketDataMeta` rechnen den Erwartungswert inklusive `applied` neu und lassen keine Hochstufung zu. T12-5 geschlossen (Prozentheuristik fuer `kirchensteuerSatz` entfernt, `8` wird abgewiesen statt still skaliert) und T12-6 geschlossen (Plan und Slice-MD nennen die gerichtete konservative Fensterhoch-Untergrenze ohne kollidierende Buchstabenvariante). Drei neue Restrisiken: U12-1 - die Schliessung von T12-1 verschiebt die Vertragshaerte vollstaendig auf Altdateien; gemessen bleiben `targetEq: 0`, `rebalBand: 0`, `aktuellesAlter: 0`, `tqfAlt: 30` und `kirchensteuerSatz: 0.08` importierbar, waehrend `inflation: 60`, `profilName` mit 250 Zeichen, `horizonYears: 30,5`, `flexBudgetYears: 12`, `kirchensteuerSatz: 8` und entfernte Altfelder auf beiden Legacy-Pfaden ohne Verwerfen-, Klemm- oder Hinweispfad abgewiesen werden; U12-2 - die Bedeutung von `schemaVersion: 2` wechselte innerhalb des Slice zweimal ohne Versionswechsel, nutzerseitig nicht erreichbar, ab Auslieferung aber versionierungspflichtig; U12-3 - alte CSV-Provenienz ohne gueltiges `high.yearsSince` bleibt ohne Ausweichweg unlesbar. Unveraendert offen bleiben T12-2, T12-4, S12-5, S12-8 und S12-9. Gates unabhaengig nachgefahren: `npm test` 8.462/8.462 Assertions, 0 offene Handles, `npm run test:browser` 17/17 und `git diff --check` gruen; sechs geaenderte `.js`/`.html`-Dateien, davon fuenf Programmdateien plus `Handbuch.html`, `engine/`, `engine.js`, `dist/`, `src-tauri/` und `RuheStandSuite.exe` unveraendert. Die Freigabe bezieht sich auf die korrekte Umsetzung der entschiedenen Vertraege und der Nutzerentscheidung zu D-13, nicht auf die fachliche Eignung der Vertragsgrenzen selbst. |
| 2026-07-28 | Slice 13 durch Codex technisch umgesetzt | Registry, Pflegebucket und Profil-Balance-State liefern `valid`, `missing`, `empty`, `corrupt` und `unavailable`; Rawwerte bleiben bis Export plus bestaetigtem, TOCTOU-geschuetztem Reset unveraendert. Current-/Active-Ghosts, korrupter Live-State und fehlerhafte ausgewaehlte Haushaltsprofile blockieren sichtbar und ohne Teilaggregation. Live-Loads rollen Teilwrites zurueck; per-profile Alter bleibt profilgebunden. Historische Registryeintraege ohne redundantes `meta.id` werden nur in der Lesesicht normalisiert. Exakt zehn Programmdateien; `npm test` 8.536/8.536 Assertions bei 0 offenen Handles, Browser 20/20 und `git diff --check` gruen. Engine und generierte Artefakte unveraendert; unabhaengiges Review, Commit und Push ausstehend. |
| 2026-07-28 | Slice 13 durch Claude reviewt | Status blockiert. Drei Blocker: S13-1 - eine verwaiste aktive Profil-ID nach gewoehnlichem Profil-Loeschen fuehrt sowohl ueber den bestaetigten Recovery-Reset als auch ohne Nutzerinteraktion ueber den `beforeunload`-Save dazu, dass ein gesundes Profil mit den Live-Daten des geloeschten Profils ueberschrieben wird (gemessen `50000`/`67` nach `20000`/`61`); gegen `dbb9db4` gemessene Regression, dort heilte derselbe Zustand sich selbst. S13-2 - der Recoveryzustand ist auf Balance und Simulator unsichtbar, weil `initProfileSubpageLifecycle` das Bootstrap-Ergebnis verwirft und nur `profile-manager.js` `getLastProfileBootstrapResult()` liest. S13-3 - der Simulator-Blocker verhindert die Aggregation, nicht den Lauf; der Fehlerzweig setzt zusaetzlich `__profilverbundPreferAggregates = true` und verwirft damit den realen Tranchenbestand. Neun Restrisiken S13-4 bis S13-12, darunter `aktuellesAlter: 0` fuer Profile ohne hinterlegtes Alter, der Blast-Radius der Registry-Recovery (ein defekter Eintrag loescht alle Profile, Recovery-Dokument ohne Leser), `unavailable` ueber die Persistenz-Facade unerreichbar mit Default-Write bei nicht lesbarem Backend und der Widerspruch zum Importvertrag aus Slice 12 (`lastState: null`). Gates unabhaengig nachgefahren: `npm test` 8.536/8.536, Browser 20/20, `git diff --check` gruen, exakt zehn Programmdateien wie deklariert, `engine/`, `workers/`, `dist/` und `src-tauri/` unveraendert. |
| 2026-07-28 | Slice 13 Blocker-Nachbesserung durch Codex technisch umgesetzt | S13-1: Profil-Loeschen, Save und bestaetigte Kontext-Recovery halten Registryprofil, Live-State, `current` und `active` zusammen; Ghost-/Mismatch-Zustaende blockieren vor jedem Registry-Write und der Reset laedt das gesunde Zielprofil atomar. S13-2: Balance und Simulator pruefen den Profilkontext frisch und zeigen Kontext-Recovery sichtbar an. S13-3: Monte Carlo, Backtest, Sweep, Sweep-Selbsttest, Ergebnisaktionen und Auto-Optimize sind im Recoveryzustand deaktiviert; globale Startfunktionen besitzen dasselbe Gate und der Fehlerpfad erzwingt keinen Aggregatbetrieb mehr. Gekoppelt nachgebessert sind S13-4 (fehlendes Alter bleibt fehlend) und S13-8 (`lastState: null` bleibt Slice-12-konform gueltig). S13-5 bis S13-7 und S13-9 bis S13-12 bleiben offen. Weiterhin exakt zehn Programmdateien; fokussiert 397/397, `npm test` 8.550/8.550 Assertions bei 0 offenen Handles, Browser 22/22 und `git diff --check` gruen. Engine, `engine.js`, `workers/`, `dist/` und `src-tauri/` unveraendert; unabhaengiges Re-Review, Commit und Push ausstehend. |
| 2026-07-28 | Slice 13 Blocker-Nachbesserung durch Claude re-reviewt | Status weiterhin blockiert. Geschlossen: S13-2 (Kontext-Preflight in `loadProfilverbundProfiles` macht Ghost- und Mismatch-Zustaende auf Balance und Simulator sichtbar, zwei neue Browser-Smokes bestaetigen das), S13-4 (`aktuellesAlter` wird nur bei endlichem Wert materialisiert, fehlendes Alter faellt wieder auf den Haushaltswert statt auf 0) und S13-8 (`lastState` sowie `profilverbundHouseholdLastState` duerfen `null` sein, `inputs` bleibt strikt). Teilweise geschlossen: S13-1 - der Datenverlust ist in allen drei gemessenen Ketten beseitigt (`default.data` bleibt `50000`/`67`, der `beforeunload`-Save wirft statt zu ueberschreiben, der Kontext-Reset laedt die Profildaten) - und S13-3 (acht Startknoepfe gesperrt, sieben globale Startfunktionen gegated). Drei neue Blocker: T13-1 - der Kurzschlusszweig in `deleteProfile` setzt beim Loeschen des letzten Profils `rs_active_profile` nicht zurueck, die ueber die Oberflaeche erlaubte Loeschfolge erzeugt `PROFILE_ACTIVE_GHOST` und legt Balance und Simulator vollstaendig still; T13-2 - `ao_run_btn` besitzt kein Action-Gate und wird durch jede Auto-Optimize-Interaktion wieder freigeschaltet, vollstaendige Laeufe bleiben trotz Blocker startbar; T13-3 - `npm run test:browser` faellt in zwei von drei Laeufen bei `Balance CSV import roundtrip` aus (Exit 1, 20 statt 22 Smokes), das Gate kann die Nachbesserung so nicht absichern. Neues Restrisiko T13-4: der Kontext-Preflight liest und parst die Registry pro Aggregationsaufruf sieben statt drei Mal. Unveraendert offen S13-5 bis S13-7 und S13-9 bis S13-12, wobei S13-10 durch den neuen Wurf in `deleteProfile` verschaerft ist. `npm test` unabhaengig bestaetigt mit 8.550/8.550 Assertions; `git diff --check` gruen, exakt zehn Programmdateien, `engine/`, `workers/`, `dist/` und `src-tauri/` unveraendert. |
| 2026-07-28 | Slice 13 T13-Nachbesserung durch Claude re-reviewt | Status freigegeben, keine Blocker. T13-1 geschlossen: der Kurzschlusszweig in `deleteProfile` laedt jetzt das neu erzeugte Fallback-Profil, die Loeschfolge endet mit `current/active = default/default` und gruener Kontextpruefung statt mit `PROFILE_ACTIVE_GHOST`. T13-2 geschlossen: ein Capture-Phase-Gate auf `#ao_run_btn` und `#ao_apply_btn` faengt lokale Klicks vor den modul-lokalen Handlern ab, ein `MutationObserver` stellt die Sperre nach Preset- und Parameteraenderungen wieder her, der Browser-Witness weist die vollstaendige Kette nach. T13-3 geschlossen: vier von vier Browserlaeufen gruen mit je 22/22 Smokes; die Korrektur liegt allerdings im Smoke (Warten auf den Status `CSV importiert` statt auf die Sichtbarkeit des Mehrzweckcontainers), nicht im Produkt. Fuenf neue Restrisiken U13-1 bis U13-5: unangekuendigtes Leeren des profilbezogenen Live-States beim Loeschen des letzten Profils (gemessen `profile_tagesgeld` und Balance-State jeweils `null`), irrefuehrender Rueckgabewert im Kurzschlusszweig, Capture-Gate ohne `btButton`, Testhaken `__profileRecoveryBlockedActionCount` im Produktivpfad und die unermittelt gebliebene Ursache des zwischenzeitlich leeren Fehlercontainers. Unveraendert offen T13-4 sowie S13-5 bis S13-7 und S13-9 bis S13-12. Gates unabhaengig nachgefahren: `npm test` 8.558/8.558 in drei von vier Laeufen, ein Lauf brach mit Exit 139 in der unveraenderten `monte-carlo-measurement-contract.test.mjs` ab und wird als Umgebungsflake gefuehrt; `npm run test:browser` vier von vier gruen; `git diff --check` gruen; exakt zehn Programmdateien; `engine/`, `workers/`, `dist/` und `src-tauri/` unveraendert. |
| 2026-07-28 | Slice 13 zweites Re-Review durch Gemini bestaetigt | Status blockiert; T13-1 bis T13-3 bestaetigt. Das Loeschen des letzten Benutzerprofils hinterlaesst eine aktive Ghost-ID, Auto-Optimize besitzt fuer seinen modul-lokalen Handler kein wirksames Action-Gate, und der CSV-Browser-Smoke ist nicht verlaesslich gruen. Restrisiken T13-4 sowie S13-5 bis S13-7 und S13-9 bis S13-12 bleiben bestehen. |
| 2026-07-28 | Slice 13 T13-Blocker durch Codex technisch nachgebessert | T13-1: Die letzte Profil-Loeschfolge laedt das neu erzeugte Default-Profil und versoehnt `current`, `active` und Live-State. T13-2: Ein Capture-Phase-Gate blockiert die modul-lokalen Auto-Optimize-Run-/Apply-Handler, waehrend ein `MutationObserver` die Button-Sperre nach Preset- und Parameterinteraktionen wiederherstellt; der Browser-Witness erzwingt beide Umgehungsversuche. T13-3: Der CSV-Smoke wartet nun auf `CSV importiert` statt auf die Sichtbarkeit des Mehrzweckcontainers; danach drei unmittelbar aufeinanderfolgende komplette Browserlaeufe mit jeweils 22/22 Smokes. `npm test` 8.558/8.558 Assertions, 0 offene Handles, `git diff --check` gruen und weiterhin exakt zehn Programmdateien; Engine, `engine.js`, `workers/`, `dist/` und `src-tauri/` unveraendert. Unabhaengiges Re-Review, Commit und Push ausstehend. |
| 2026-07-28 | Slice 14 durch Codex technisch umgesetzt | Profilbundle und Vollbackup werden vor dem ersten Write gegen kanonische Envelope-, Allowlist-, String-, Domain- und Profilkontextvertraege geprueft. Vollbackup-Replace schreibt und bestaetigt einen persistenten Recovery-Snapshot; Teilwrites und Post-Load-Fehler rollen Cache und Backend verifiziert zurueck, ein unbestaetigbarer Rollback bleibt als `rollback_failed` sichtbar. `cumulativeInflationFactor` ist in Balance-Storage/-Import, Engine und Simulator einheitlich endlich und strikt groesser 0; korrupte Rohwerte werden nicht still ersetzt. Exakt acht Programmdateien; fokussiert 1.205/1.205, `npm test` 8.660/8.660 Assertions bei 0 offenen Handles, Browser 23/23 einschliesslich IndexedDB-Vollbackup-Recovery, Engine-Build und `git diff --check` gruen. `engine.js`, `workers/`, `dist/`, `src-tauri/` und Release-Artefakte unveraendert; unabhaengiges Review, Commit und Push ausstehend. |
| 2026-07-28 | Slice 14 durch Claude reviewt | Status blockiert; vier Blocker. S14-1: Ein Vollbackup, das der Stand `001f3c1` selbst erzeugt hat, wird vom neuen Import abgewiesen (`Backup enthaelt den nicht erlaubten Key ui_theme_dark`), waehrend `FULL_BACKUP_SCHEMA_VERSION` trotz inkompatiblem Vertrag auf `1` bleibt; die von AK-1 geforderte Versionsmatrix fehlt. S14-2: Der Recovery-Snapshot des Vollbackup-Imports ist nicht einspielbar - `rollbackImportReplace` weist seinen Kind ab, und der Standard-Restore stellt ohne passendes Profil in der neuen Registry weder Registry noch Selektoren noch profilbezogene Live-Keys wieder her; `restoreScope` hat keinen Auswerter. S14-3: Die Obergrenze fuer Inflationsfaktoren entfiel ersatzlos - ein Altbestand mit Faktor 99 wird jetzt still akzeptiert statt repariert und rechnet alle Realwerte um Faktor 99 zu klein. S14-4: Der abgewiesene Faktor erscheint als `Fehler beim Laden des Zustands aus dem LocalStorage.`; `CUMULATIVE_INFLATION_FACTOR_INVALID` ueberlebt nur in `originalError`. Restrisiken S14-5 bis S14-15, darunter das Loeschen der Globals beim Bundle-Import, das unvollstaendige "Vollbackup" und die Bestaetigungslesung ueber `memCache` statt ueber das Backend. Gates unabhaengig reproduziert: `npm test` 8.660/8.660 in zwei Laeufen, Browser 23/23, Engine-Build und `git diff --check` gruen, exakt acht Programmdateien, verbotene Bereiche unveraendert. |
| 2026-07-28 | Slice 14 Review-Blocker durch Codex technisch nachgebessert | S14-1: Vollbackup-Schema 2 mit expliziter V1-Migration, `localStorage`-Alias und sichtbarer Ausschlussliste. S14-2: `full-backup-import-recovery` wertet `replace-all-rollback` aus und ist ueber API sowie Balance-Snapshot-Oberflaeche einspielbar; Chromium bestaetigt Registry-/Selektor-Rueckrestore gegen IndexedDB. S14-3/S14-4: gemeinsamer sichtbarer Vertrag `0 < Faktor <= 20`, Wert 99 wird raw-preserving mit unverhuelltem `CUMULATIVE_INFLATION_FACTOR_INVALID` abgewiesen; Grenze 20 erhaelt den 1960-2020-Backtest, nachdem die historische Grenze 3 das Gate sichtbar gebrochen hatte. Gekoppelt geschlossen: S14-6 bis S14-12 und S14-14 (Globals erhalten, Backend-Readback, Altbundle-Migration, Missing-/NaN-Unterscheidung, nur genutzter Plannerpfad, Recovery-ID/-Weg). S14-5, S14-13 und S14-15 bleiben Restrisiken. Exakt acht Programmdateien; `npm test` 8.721/8.721 Assertions, 0 offene Handles, Browser 23/23, Engine-Build, `node --check` und `git diff --check` gruen; `engine.js`, `workers/`, `dist/`, `src-tauri/` und Release-Artefakte unveraendert. Unabhaengiges Re-Review, Commit und Push ausstehend. |
| 2026-07-28 | Slice 14 Blocker-Nachbesserung durch Claude re-reviewt | Status blockiert; ein neuer Blocker. Geschlossen und nachgemessen: S14-1 (Schema-1-Backup wird ueber einen Migrator angenommen, `sourceSchemaVersion 1 -> schemaVersion 2`, `excludedKeys` inventarisiert; die Tiefenvalidierung faengt Faktor 0, Faktor 99, Ghost-Selektor, kaputtes JSON und falschen recordCount auch im Legacy-Pfad), S14-2 (`isFullImportRecoverySnapshot` wertet Kind und `replace-all-rollback` an vier Stellen aus; der Full-Modus stellt Registry, Selektoren und Profildaten wieder her, wo der Standard-Restore nichts zurueckschrieb), S14-4 (`CUMULATIVE_INFLATION_FACTOR_INVALID` samt Pfad bleibt erhalten, Rohbestand unveraendert) sowie S14-6 bis S14-10, S14-12 und S14-14. Neuer Blocker U14-1: Die Obergrenze `20` wird nicht nur an der Speichergrenze, sondern auch auf den fortgeschriebenen Faktor jedes Simulationsjahres angewandt; gemessen bricht ein Lauf bei 10 Prozent Inflation nach 32 Jahren, bei 8 Prozent nach 39 und bei 6 Prozent nach 52 Jahren ab. Der Wurf ist nicht als `technical_error` modelliert, und auf dem Weg vom Jahresschritt bis zur Chunk-Schleife liegt kein `try`; damit endet der Worker-Chunk statt des Pfades. S14-3 ist persistenzseitig erledigt, in seiner Wirkung auf den Rechenpfad nicht. Neue Restrisiken U14-2 (Inflationsrate: `null` laeuft still als Nullinflation, Strings werden konvertiert, der NaN-Wurf traegt keinen Vertragscode), U14-3 (der Schema-1-Migrator nimmt Nicht-String-Werte an, die Schema 2 abweist), U14-4 (der neue Snapshot-Kind bleibt in `SNAPSHOT_KINDS` unregistriert und ist als Literal dupliziert), U14-5 (die Backend-Verifikation faellt still auf den Cache zurueck, wenn ein Adapter kein `loadAll` mitbringt). S14-5, S14-13 und S14-15 bleiben bewusst offen. Gates unabhaengig reproduziert: `npm test` 8.721/8.721, Browser 23/23 in zwei Laeufen, Engine-Build und `git diff --check` gruen, exakt acht Programmdateien, verbotene Bereiche unveraendert. |
| 2026-07-28 | Slice 14 U14-Nachbesserung durch Codex technisch umgesetzt | U14-1: Die Obergrenze 20 gilt nur noch fuer Persistenz und Import; SpendingPlanner und Simulator akzeptieren korrekt fortgeschriebene endliche Runtimefaktoren groesser 20. `advance(19.9, 5)` liefert 20,895 und der 80-Jahres-Witness mit 10 Prozent Inflation laeuft ohne Chunk-Abbruch. U14-2: Inflationsraten sind echte endliche Zahlen oder `undefined` als Missing; `null`, Strings, `NaN` und Infinity liefern `SIMULATOR_INFLATION_RATE_INVALID`. U14-3: Der V1-Vollbackup-Migrator stringifiziert Nicht-String-Werte nicht mehr. U14-5: Backendverifikation ohne `adapter.loadAll` bricht mit `persistence_backend_read_unavailable` ab. U14-4 bleibt wegen der Acht-Programmdateien-Stopregel offen und benoetigt fuer `snapshot-archive.js` einen Folgeslice. `npm test` 8.725/8.725 Assertions, 0 offene Handles, Browser 23/23, Engine-Build, Syntax- und Diffchecks gruen; weiterhin exakt acht Programmdateien und keine Aenderung an generierten oder verbotenen Bereichen. Unabhaengiges Re-Review, Commit und Push ausstehend. |
| 2026-07-28 | Slice 14 U14-Nachbesserung durch Claude re-reviewt | Status freigegeben; keine Blocker. U14-1 geschlossen: Der Vertrag ist in eine Persistenzvariante (`0 < Faktor <= 20`) und eine Runtimevariante (endlich, groesser 0) geteilt; gemessen laufen 80 Jahre mit 15 Prozent Inflation bis Faktor 71.800 ohne Abbruch, waehrend `99` an der Speichergrenze weiterhin sichtbar abgewiesen wird. U14-2 geschlossen: `null`, Strings, `NaN` und `Infinity` werfen typisiert mit `SIMULATOR_INFLATION_RATE_INVALID`, nur `undefined` bleibt Missing. U14-3 geschlossen: Der Schema-1-Migrator weist Nicht-String-Werte ab. U14-4 geschlossen: `SNAPSHOT_KINDS` registriert beide Import-Recovery-Kinds, alle Stellen nutzen die Registrykonstante, `toSnapshotIndexEntry` fuehrt den `restoreScope` mit. U14-5 geschlossen: kein stiller Cachefallback mehr, sondern `persistence_backend_read_unavailable`. Neue Restrisiken V14-1 (Vertragsverletzungen im Rechenpfad werfen weiterhin statt ein zaehlbares `technical_error`-Ergebnis zu liefern; gemessen liegen alle 101 historischen Inflationswerte zwischen -9,9 und 14,4, der Ausloeser ist aus den heutigen Daten nicht erreichbar), V14-2 (fail-closed fuer Adapter ohne `loadAll`) und V14-3 (Dateiscope auf neun Programmdateien erweitert; die im Dokument festgehaltene Nutzerfreigabe fuer `app/shared/snapshot-archive.js` ist fuer den Reviewer nicht verifizierbar und sollte vor dem Commit bestaetigt werden). S14-5, S14-13 und S14-15 bleiben offen. Gates unabhaengig reproduziert: `npm test` 8.730/8.730, Browser 23/23 in zwei von drei Laeufen - ein Lauf endete mit `net::ERR_NO_BUFFER_SPACE` im slice-fremden, unveraenderten `simulator-monte-carlo-browser.mjs` und wird als Umgebungsflake gefuehrt -, Engine-Build und `git diff --check` gruen, verbotene Bereiche unveraendert. |
| 2026-07-28 | Nutzer genehmigt neunte Programmdatei; U14-4 durch Codex technisch nachgebessert | Der Nutzer akzeptiert `app/shared/snapshot-archive.js` als neunte Programmdatei. `SNAPSHOT_KINDS` registriert Balance- und Vollbackup-Import-Recovery zentral; `persistence-backup.js` und `balance-storage.js` verwenden diese Registry statt eigener Literale. `toSnapshotIndexEntry` erhaelt den normalisierten `restoreScope`, sodass die beiden `replace-all-rollback`-Auswerter auch im Listen-/UI-Pfad wirksam sind. Unit-Witness 26/26 und Chromium-IndexedDB-Witness gruen; `npm test` 8.730/8.730 Assertions, Browser 23/23, Engine-Build, Syntax- und Diffchecks gruen. Exakt neun genehmigte Programmdateien, keine Aenderung an generierten oder verbotenen Bereichen; unabhaengiges Re-Review, Commit und Push ausstehend. |

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
