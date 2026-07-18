# Slice Findings 06 – Real-/Nominalvertrag im Simulator

**Stand:** 2026-07-17<br>
**Status:** implementiert – technisches Gate grün; Review und Nutzerfreigabe ausstehend<br>
**Arbeitsplan:**
[`ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md`](ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md)<br>
**Feature-Branch:** `codex/architektur-fachkonzept-korrekturen`<br>
**GitHub-Status:** nur lokal angelegt; Veröffentlichung nicht beauftragt

## Ziel

Slice 6 setzt die freigegebene Route A für PD-01 um. Der Simulator führt den
kumulierten Inflationsfaktor über den vollständigen Simulationspfad genau
einmal je Jahr fort. `jahresentnahme_real` bleibt ein echter, auf das erste
Simulatorjahr bezogener Realwert. Headless-, Backtest-, Monte-Carlo-,
Auto-Optimize- und Workerpfad verwenden denselben State-Vertrag.

## Akzeptanzkriterien

- ein dreijähriger synthetischer Fall mit 10 Prozent Inflation weist für die
  aktuellen Jahre die Faktoren `1`, `1,1` und `1,21` aus;
- die reale Entnahme entspricht in jedem Jahr
  `jahresEntnahmeEffektiv / inflation_factor_cum`;
- der Faktor wird auch in Ansparjahren fortgeführt, obwohl die reale Entnahme
  dort null ist;
- App-State und Engine-`lastState` besitzen keinen widersprüchlichen Faktor;
- Backtest-, MC-, Auto-Optimize- und Workerpfad bleiben deterministisch;
- serielle und gechunkte/Worker-Ausführung sind exakt paritätisch;
- erwartete Realwert-/Spending-Deltas sind von unerwarteten Portfolio-,
  FlowDelta-, Snapshot- oder Worker-Deltas getrennt dokumentiert;
- MR-09 und PD-01 werden erst nach grüner Gesamtsuite geschlossen.

## Scope

### Programm- und Testdateien

- `app/simulator/simulator-engine-helpers.js`
- `app/simulator/simulator-engine-direct.js`
- `app/simulator/simulator-accumulation-year.js`
- `app/simulator/simulator-year-result.js`
- `tests/simulator-real-withdrawal-contract.test.mjs` (neu)
- `tests/simulator-backtest.test.mjs`

Damit umfasst der vorab festgelegte Programmscope sechs Dateien und bleibt
unter der Stop-Schwelle von zehn Programmdateien.

### Dokumentation

- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- bei nachgewiesenem Synchronisationsbedarf
  `docs/reference/TECHNICAL.md` und
  `docs/reference/SIMULATOR_MODULES_README.md`
- diese Slice-Datei und der übergeordnete Korrekturplan

## Nicht-Scope

- Änderungen unter `engine/` oder an der öffentlichen `EngineAPI`;
- manuelle Änderungen an `engine.js`, `dist/` oder `RuheStandSuite.exe`;
- PD-02/Pflegekosten-Einheiten und PD-03/KPI-Label;
- Änderung von Sampling, Seeds, Optimizer-Suchraum oder Zielfunktionen;
- Änderung, Begrenzung oder Umbenennung von `minimumFlexAnnual`;
- Persistenzmigrationen außerhalb des laufzeitinternen Simulator-State;
- Commit, Push oder Veröffentlichung;
- vorbestehende ungetrackte Playwright-Dateien unter `node_modules/`.

## State- und Zeitvertrag vor dem ersten Code-Edit

1. `simState.cumulativeInflationFactor` ist die kanonische, von der
   Simulator-App geführte Größe. Fehlende Legacy-/Startwerte beginnen bei
   `1`.
2. Der Faktor im State zu Beginn eines Modelljahres gehört zu den nominalen
   Größen dieses Modelljahres. Er deflationiert daher die aktuelle Entnahme.
3. Beim Rückgabestate wird der aktuelle Faktor genau einmal mit
   `1 + inflation / 100` multipliziert. Der neue Wert gehört zum Folgejahr.
4. Ansparjahre führen denselben App-State fort. Ihre reale Entnahme bleibt
   null; das erste Entnahmejahr verwendet dadurch dennoch die Kaufkraft des
   ersten Simulatorjahres als Basis.
5. Vor dem Engine-Aufruf wird der App-Faktor in den vorhandenen initialisierten
   Engine-`lastState` gespiegelt. Beim ersten Engine-Jahr nach einer
   Ansparphase werden die vom Engine-Initialzustand erzeugten Realwertfelder
   auf denselben Faktor ausgerichtet; die initiale relative Drawdown-Quote
   bleibt dabei unverändert.
6. Worker erhalten und liefern den App-State ohne Sonderpfad. Eine
   abweichende Serial-/Worker-Weitergabe ist ein Stop-Grund.

Der Vertrag ändert keine Engine-Datei. Die erwartete Spending-Wirkung entsteht
ausschließlich dadurch, dass die Engine ab dem zweiten Entnahmejahr den
bereits vorhandenen Realvermögensvertrag mit dem korrekten Faktor auswertet.

## Branch- und Statusnachweis vor dem ersten Codex-Edit

Ausgeführt am 2026-07-17:

- `git branch --show-current`:
  `codex/architektur-fachkonzept-korrekturen`
- `git rev-parse --short HEAD`: `de8df76`
- sicherer Vorgänger: freigegebener Slice-05-Commit
  `de8df76 docs/test/metadata: Slice 05 (Lizenzmetadaten-Konsolidierung)
  freigegeben`
- getrackte Voränderungen: keine;
- vorbestehend und außerhalb des Auftrags: ungetrackte Playwright-Dateien
  unter `node_modules/`.

## Diff-Risiko vor Coding

**Geplante Dateien:**

- die sechs Programm-/Testdateien aus dem Scope;
- die drei nur bei nachgewiesenem Bedarf genannten Referenzdokumente;
- diese Slice-Datei und der übergeordnete Korrekturplan.

**Voraussichtliche Änderungstiefe:**

- mittel; jahresübergreifender Simulator-State mit beabsichtigten
  Realwert-, Guardrail-, Backtest-, MC- und Optimizer-Deltas.

**Gefährdete bestehende Tests:**

- `simulation.test.mjs` und `simulator-headless.test.mjs`;
- `simulator-backtest.test.mjs`;
- `simulator-monte-carlo.test.mjs`;
- `auto-optimizer.test.mjs` und
  `auto-optimize-worker-contract.test.mjs`;
- `worker-parity.test.mjs`;
- Snapshot-/Backtest- und FlowDelta-Assertions der Gesamtsuite.

**Nicht anfassen:**

- `engine/`, `engine.js`, `dist/`, `RuheStandSuite.exe` und `node_modules/`;
- Care-/PD-02-Module und KPI-/PD-03-Module;
- Seeds, Samplingregeln, Optimizerparameter und `minimumFlexAnnual`.

**Rollback-Strategie:**

- bestehende Scope-Dateien gezielt mit `git checkout -- <datei>` auf den
  Slice-05-Stand zurücksetzen;
- die neue Test- und Slice-Datei nur nach ausdrücklicher Nutzerfreigabe
  entfernen;
- keine destruktiven Git-Kommandos verwenden.

Die Stop-Regel für mehr als zehn Programmdateien greift nicht. Vor jedem
zusätzlichen Programmscope wird erneut gezählt; eine siebte bis zehnte Datei
benötigt Datenflussnachweis, eine elfte Datei stoppt den Slice.

## Vorher-Baseline und zulässige Delta-Klassen

Die Baseline wird vor dem ersten Produktcode-Edit mit unverändertem Stand
`de8df76` und folgenden stabilen Fixtures erhoben:

1. synthetischer Drei-Jahres-Headless-Lauf mit 10 Prozent Inflation;
2. historischer Backtest 2010 bis 2012 mit den bestehenden Testinputs;
3. MC-/Auto-Optimize-Kandidaten `targetEq = 40, 60, 80` mit identischen
   Seeds, Laufzahlen und Horizonten;
4. bestehende Serial-/Chunk-/Worker-Paritätsgates.

### Erwartete Deltas

- `inflation_factor_cum` wechselt nach Jahr 1 von konstant `1` auf das
  mathematische Produkt der Vorjahresinflationen;
- `jahresentnahme_real`, Consumption-at-Risk und reale Stresswerte werden ab
  Jahr 2 deflationiert;
- Realvermögen, Real-Drawdown, Guardrails und darauf aufbauende
  Spending-Entscheidungen dürfen sich ab Jahr 2 ändern;
- dadurch dürfen sich Backtest-, MC- und Auto-Optimize-Ergebnisse sowie ein
  Champion innerhalb identischer Seeds und Eingaben fachlich erklärbar
  verschieben.

### Unerwartete und blockierende Deltas

- ein anderer Faktor als das jahresweise Produkt oder mehrfache Anwendung;
- nicht endliche beziehungsweise nicht positive Faktoren bei gültigen
  historischen/MC-Inflationsdaten;
- unterschiedliche Faktoren oder Ergebnisse zwischen Serial-, Chunk- und
  Workerpfad;
- Änderungen von Seeds, Sampling, nominaler Bedarfsindexierung,
  Steuervertrag, Pflegekostenvertrag oder `minimumFlexAnnual`;
- auffälliger `portfolio_flow_delta`;
- Snapshot-/Backtest-/MC-/Optimizer-Deltas, die nicht aus Realvermögen,
  Real-Drawdown oder daraus folgender Spending-Logik erklärbar sind.

### Erhobene Vorher-Baseline auf `de8df76`

Die Baseline wurde vor dem ersten Produktcode-Edit mit einem read-only per
Standard-Input an Node übergebenen Messlauf erhoben; es entstand keine
temporäre Programmdatei.

| Fixture | Vorher-Ergebnis |
| --- | --- |
| synthetisch, 10 % Inflation, Jahr 1 bis 3 | nominal `12000 / 13200 / 14520`; Faktor fälschlich `1 / 1 / 1`; real fälschlich `12000 / 13200 / 14520`; FlowDelta jeweils `0` |
| MC, 23 Läufe, 18 Jahre, Seed 13579, Block 4 | `failCount=1`; Endvermögen P10 `404337,50723790925`, P50 `974819,9989636401`, P90 `2060644,0548569155`; Depoterschöpfung `4,3478260869565215 %` |
| MC-Realentnahmestichprobe Lauf 0 | `34800, 32400, 32400, 32400, 33600, 33600, 34800, 34800, 34800, 36000, 37200, 39600, 42000, 43200, 44400, 45600` – aktuell nominal statt real |
| Auto-Optimize-Evaluator, `targetEq=40`, 23 Läufe, 18 Jahre, Seeds 13579/13580 | Success `1`; Depletion `0`; TimeShare > 4,5 % `0,4273964442815249`; P10-Endvermögen `545471,0706472702`; Median `1525006,2887333925`; Worst-DD `0,5644325141906739` |
| Auto-Optimize-Evaluator, `targetEq=60` | Success `1`; Depletion `0`; TimeShare `0,4273964442815249`; P10 `545658,1493012821`; Median `1525006,2887333925`; Worst-DD `0,5644325141906739` |
| Auto-Optimize-Evaluator, `targetEq=80` | Success `1`; Depletion `0`; TimeShare `0,4274926686217009`; P10 `546051,5763560759`; Median `1527946,4769541668`; Worst-DD `0,5646708488464356` |

Nach Median-Endvermögen ist `targetEq=80` in dieser begrenzten,
reproduzierbaren Kandidatenstichprobe der Vorher-Champion. Die Messung ist
keine Behauptung über das globale Optimum, sondern das Delta-Gate für exakt
diese drei Kandidaten und Seeds.

Die betroffenen Vorgängergates waren vor dem Edit grün:

- `simulation.test.mjs`: 1/1 instrumentierte Assertions;
- `simulator-backtest.test.mjs`: 39/39 Assertions;
- `simulator-monte-carlo.test.mjs`: 110/110 Assertions;
- `auto-optimize-worker-contract.test.mjs`: 7/7 Assertions;
- `worker-parity.test.mjs`: 354/354 Assertions.

Die Baseline erfüllt damit das U-K06-Vorgate. Zulässig sind nun ausschließlich
die zuvor klassifizierten Realwert-/Spending-Folgedeltas; jede
Serial-/Worker-Abweichung oder ein auffälliger FlowDelta stoppt den Slice.

## Geplante Validierung

- neue fokussierte Contracttests für Drei-Jahres-Faktor, echte Realentnahme,
  Anspar-/Transition-State und einmalige Jahresfortschreibung;
- fokussierter Backtest mit Faktor- und Realwertassertions;
- `node tests/run-single.mjs tests/simulator-real-withdrawal-contract.test.mjs`;
- `node tests/run-single.mjs tests/simulation.test.mjs`;
- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`;
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`;
- reproduzierbare MC-/Auto-Optimize-Kandidatenmessung vor und nach dem Edit;
- `node tests/run-single.mjs tests/auto-optimize-worker-contract.test.mjs`;
- `node tests/run-single.mjs tests/worker-parity.test.mjs` als Pflichtgate;
- `npm test`;
- `git diff --check` sowie abschließender Branch-, Status- und Scope-Check.

Ein Engine-Build ist nicht vorgesehen, weil weder `engine/` noch die
öffentliche `EngineAPI` geändert werden. Wenn das nicht ausreicht, greift vor
der Scope-Erweiterung die Stop-Regel.

## Ergebnisse

### Durchgeführte Änderungen

- `simulator-engine-helpers.js` definiert den kanonischen App-State-Resolver
  mit Legacy-Fallback und die einmalige multiplikative
  Folgejahresfortschreibung. `initMcRunState()` startet ausdrücklich bei
  Faktor `1`.
- `simulator-accumulation-year.js` transportiert und erhöht den Faktor auch in
  Ansparjahren; die Entnahme bleibt dort null, Health-Bucket-Diagnosen sehen
  aber den aktuellen Realwertfaktor.
- `simulator-engine-direct.js` spiegelt den App-Faktor vor jedem regulären
  Engine-Jahr in einen initialisierten `lastState`. Beim ersten Entnahmejahr
  nach einer Ansparphase werden die vom Engine-Initialzustand erzeugten
  Realvermögensfelder auf denselben Faktor skaliert, ohne die relative
  Drawdown-Quote zu verändern.
- `simulator-year-result.js` deflationiert die effektive Auszahlung mit dem
  aktuellen Faktor. Erst der Rückgabestate wird einmal mit der Inflation des
  aktuellen Jahres fortgeschrieben; App-State und Engine-Spiegel erhalten
  denselben Folgejahresfaktor. `lastEntnahmeReal` entspricht der tatsächlich
  ausgezahlten statt nur der geplanten Entnahme.
- `simulator-real-withdrawal-contract.test.mjs` sichert Resolver,
  Deflationsvertrag, Drei-Jahres-Fall, FlowDelta, Anspar-Transition,
  App-/Engine-Spiegel und eine deterministische MC-Log-/Stichprobe.
- `simulator-backtest.test.mjs` prüft den historischen Faktor jahrweise sowie
  `effektive Entnahme / aktueller Faktor`.
- Hauptdokument, Forschungsregister, technische Referenz,
  Simulator-Modulübersicht und Testkatalog dokumentieren den nachgewiesenen
  Ist-Vertrag. MR-09 und PD-01 bleiben als historische IDs erhalten und sind
  als durch Slice 6 behoben gekennzeichnet.

Es wurden keine Engine-Datei, keine öffentliche EngineAPI, kein generiertes
Artefakt, kein Seed, kein Samplingvertrag, keine Zielfunktion, keine
Care-Einheit und kein `minimumFlexAnnual`-Vertrag geändert.

### Nachher-Messung und Delta-Klassifikation

Die Vorher-Messung wurde nach dem Edit mit identischen Inputs, Seeds,
Run-Zahlen, Horizonten und Kandidaten wiederholt.

| Fixture | Vorher | Nachher | Einordnung |
| --- | --- | --- | --- |
| synthetische Faktoren Jahr 1 bis 3 | `1 / 1 / 1` | `1 / 1,1 / 1,21` | erwartete Korrektur |
| synthetische nominale Entnahme | `12000 / 13200 / 14520` | unverändert | nominaler Bedarfsvertrag unverändert |
| synthetische reale Entnahme | `12000 / 13200 / 14520` | `12000 / 12000 / 12000` | erwartete echte Basisjahr-Kaufkraft |
| synthetischer FlowDelta | `0 / 0 / 0` | `0 / 0 / 0` | unverändert, kein Stop-Grund |
| MC `failCount` | `1` | `1` | bitgenau unverändert |
| MC Endvermögen P10/P50/P90 | `404337,50723790925 / 974819,9989636401 / 2060644,0548569155` | identisch | kein unerwartetes Portfoliodelta |
| MC Depoterschöpfung | `4,3478260869565215 %` | identisch | Aggregationsvertrag unverändert |
| MC-Realentnahmestichprobe Lauf 0 ab Jahr 2 | nominale Folge `32400, 32400, 32400, ...` | deflationierte Folge `32860,04056795132; 32631,6192333181; 31077,73260316009; ...` | erwartetes Realwertdelta; vollständige Werte sind durch den reproduzierten Messlauf belegt |
| Auto-Optimize-Evaluator `targetEq=40/60/80` | Baseline aus obiger Tabelle | alle Success-, Depletion-, TimeShare-, P10-, Median- und Worst-DD-Werte bitgenau identisch | keine unerwartete Zielfunktionsverschiebung in der festen Stichprobe |
| Stichproben-Champion nach Median-Endvermögen | `targetEq=80` | `targetEq=80` | unverändert; keine Aussage über globales Optimum |

Die Korrektur verschiebt in dieser statischen Kandidatenstichprobe bewusst nur
die Realentnahmewerte. Portfolio-, Failure-, Depoterschöpfungs- und
Optimizerwerte bleiben gleich, weil das gewählte Fixture keine andere
Spending-Entscheidung aus dem korrigierten Real-Drawdown ableitet. Der Plan
erlaubte fachlich erklärbare Optimizer-Deltas, verlangte sie aber nicht. Es
trat kein unerwartetes Delta auf.

### Ausgeführte Validierung

| Prüfung | Ergebnis |
| --- | --- |
| Vorher-Gates auf `de8df76` | `simulation` 1/1, Backtest 39/39, MC 110/110, Auto-Optimize-Worker 7/7, Worker-Parität 354/354 |
| `simulator-real-withdrawal-contract.test.mjs` | 52/52 Assertions grün |
| `simulation.test.mjs` | 1/1 instrumentierte Assertions grün |
| `simulator-backtest.test.mjs` | 46/46 Assertions grün |
| `simulator-monte-carlo.test.mjs` | 110/110 Assertions grün |
| `auto-optimizer.test.mjs` | 62/62 Assertions grün |
| `auto-optimize-worker-contract.test.mjs` | 7/7 Assertions grün |
| `worker-parity.test.mjs` | Pflichtgate 354/354 Assertions grün; Serial-/Chunk-/Worker-Parität erhalten |
| `simulator-headless.test.mjs` | 26/26 Assertions für 2000 bis 2025 grün |
| `npm run docs:evidence` | bestanden; 69 MKT-, 55 FOR-Records, 17 MAP-Anker und 18 Aktualitätsscopes, kein Netzwerk |
| `npm test` | 110 Testdateien, 4.533/4.533 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles |

`npm run build:engine` wurde vertragsgemäß nicht ausgeführt: `engine/`,
öffentliche EngineAPI und `engine.js` sind unverändert.

## Abweichungen vom Plan

- Der fokussierte Transition-Test zeigte zunächst, dass
  `lastState.lastEntnahmeReal` die Engine-Planentnahme statt der nach
  Simulator-Steuer-/Auszahlungslogik effektiven Entnahme enthielt. Die
  Korrektur erfolgte innerhalb der bereits geplanten Datei
  `simulator-year-result.js`; Scope und Dateizahl änderten sich nicht.
- Die erwartete Möglichkeit großer Optimizer-Deltas trat im festgelegten
  Drei-Kandidaten-Fixture nicht ein. Alle gemessenen Optimizerwerte blieben
  bitgenau stabil; nur die reale MC-Entnahmestichprobe änderte sich. Dies ist
  als Ergebnis und nicht als ausgelassenes Gate dokumentiert.

## Offene Risiken

- Andere Portfolios, Dynamic-Flex-Konfigurationen oder Stresspfade können
  wegen des bereits vorhandenen Real-Drawdown-Vertrags fachlich beabsichtigte
  Spending- und Optimizer-Verschiebungen zeigen; die feste Delta-Stichprobe
  deckt nicht den gesamten Suchraum ab.
- Die App-/Engine-Spiegelung beim ersten Entnahmejahr nach einer Ansparphase
  ist synthetisch getestet, besitzt aber kein separates Browser-UI-Gate. Der
  Slice ändert keine sichtbare UI-Steuerung.
- Der lokale Branch ist nicht veröffentlicht; dies ist ohne Push-Auftrag
  kein Implementierungsblocker.

## Rückdokumentation in den Arbeitsplan

Scope, Delta-Messung, Testzahlen, MR-09-/PD-01-Status und verbleibende Risiken
sind im Korrekturplan zurückgeschrieben.

## Freigabestatus

- Route A / U-K06: vom Nutzer am 2026-07-16 bestätigt
- Delta-Baseline: vor dem ersten Produktcode-Edit auf `de8df76` erhoben und
  nach dem Edit mit identischer Konfiguration wiederholt
- Implementierung durch Codex: abgeschlossen; keine Eigenfreigabe
- Review der Slice-Implementierung: ausstehend
- lokaler Commit: nicht durch Codex; erst nach positivem Review und
  Nutzerfreigabe
- Push: nicht beauftragt

## Review-Feedback von Gemini

### 1. Prüfdimensionen & Befunde

1. **Korrektheit:** Die Berechnung des kumulierten Inflationsfaktors und die Deflationierung der Entnahmen sind mathematisch korrekt umgesetzt. Der Anspar-Transitionspfad (Faktorfortschreibung bei Nullenentnahme) arbeitet fehlerfrei.
2. **Vertragstreue:** Keine Änderungen unter `engine/` vorgenommen. Die Schnittstellen zwischen Simulator-App und Engine spiegeln und skalieren den Faktor sauber zurück, um Engine-Planungsverträge einzuhalten.
3. **Fehlerbehandlung:** Fallbacks auf Faktor `1` bei ungültigen Inputs sind vorhanden. Die CLI- und Testassertions sichern den Realwertvertrag ab.
4. **Seiteneffekte:** In den Standardfixtures blieben die Ergebnisse bitgenau deterministisch, da das Spending-Modell keine anderen nominalen Entlastungen wählte. Die reale Entnahme-Zeitreihe wurde erwartungsgemäß deflationiert.
5. **Was könnte brechen?** Bei hochkomplexen mehrphasigen Szenarien (z. B. mehrfacher Wechsel zwischen Ansparen und Entnehmen) muss sichergestellt sein, dass der Faktor nicht mehrfach angewendet wird. Dies wird durch die einmalige Jahresfortschreibung in `simulator-year-result.js` verhindert.

### 2. Pre-Mortem
Angenommen, diese Implementierung (Slice 6) verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- *Ursache:* Ein komplexes, benutzerdefiniertes Szenario mit mehreren getrennten Entnahme- und Ansparphasen wird simuliert, und beim Wiedereintritt in eine Entnahmephase wird der cumulative factor fälschlicherweise auf den Standard `1` zurückgesetzt (z. B. durch einen unvollständigen UI-State-Reset), was zu einem Sprung in der berechneten realen Kaufkraft führt.

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - *Multi-Phasen-Transitionen:* Komplexere, ungetestete Pfade mit mehrfachem Phasenwechsel können unbemerkte Faktorenrücksetzungen auslösen.
- Pre-Mortem: (Siehe oben – State-Rücksetzungsfehler bei mehrfachen Phasenwechseln).

## Review-Feedback von Claude

Optional und ausstehend.

## Review-Antworten von Codex

Werden nach konkretem Slice-Feedback ergänzt. Codex erteilt keine
Eigenfreigabe.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U-K06 | Nutzer | PD-01 Route | Route A (freigegeben am 2026-07-17) | umgesetzt und durch Gemini freigegeben |
