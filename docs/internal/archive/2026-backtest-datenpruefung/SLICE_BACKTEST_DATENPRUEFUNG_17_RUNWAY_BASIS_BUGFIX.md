# Slice 17 - Bugfix der effektiven Runway-Basis

**Datum:** 2026-08-03  
**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Basiscommit:** `54c055fbab5eb9884e1142e0158bbfade95e063e`  
**GitHub-Status:** `origin` ist konfiguriert; der Feature-Branch besitzt keinen
Upstream beziehungsweise lokalen Remote-Tracking-Ref. Kein Push durch Codex;
ein spaeterer Push bleibt eine ausdrueckliche Nutzerentscheidung.  
**Status:** Claude-Runde 2 hat CR17-1 bis CR17-8 geschlossen und den Slice ohne
Blocker unter der Scope-Auflage CR17-9 freigegeben. Der Nutzer hat die
gemeinsame Erweiterung um Aktions-, Bestands- und Steuervertraege am 2026-08-04
ausdruecklich genehmigt; CR17-9 ist damit erfuellt. CR17-10 bis CR17-12 sind
technisch nachgebessert und benoetigen die externe Abschlussbestaetigung.
CR17-13 bleibt als akzeptiertes Restrisiko fuer Slice 17 offen und ist in
Slice 18 uebernommen; Codex erteilt keine eigene Freigabe

## Eingangsgrenze und Fehlerbild

Der Nutzer hat einen lokal exportierten historischen Backtest 2000 bis 2025
mit Source-Commit `54c055f` zur technischen Untersuchung bereitgestellt. Der
Export selbst und seine personenbezogenen Finanzdaten werden nicht in das
Repository uebernommen.

Die Nachrechnung hat zwei getrennte Aussagen ergeben:

1. Verkaufs-, Steuer-, Auszahlungs-, Zins- und Endliquiditaetsfluss sind bis
   auf Gleitkommarauschen geschlossen.
2. Das Liquiditaetsziel und die darauf beruhenden Runway-Werte verwenden bei
   aktivem Dynamic Flex die durch VPW gesetzte Flex-Basis **vor** Guardrails,
   Mindest-Flex, Flex-Budget, finaler Glaettung und Monatsquantisierung. Die
   tatsaechlich freigegebene Auszahlung kann wesentlich niedriger liegen.

Damit erfuellt die Implementierung nicht den bereits dokumentierten Vertrag:

```text
Monatsbedarf = (Netto-Floor + effektiver Flex) / 12
Runway-Monate = freie Liquiditaet / Monatsbedarf
```

`effektiver Flex` ist laut Fachkonzept die Flex-Basis multipliziert mit der
nach allen Spending-Policies wirksamen Flex-Rate. Slice 08 dokumentiert das
Liquiditaetsziel ebenfalls als effektiven Nettojahresbedarf mal konfigurierte
Monate. Slice 17 repariert diesen Vertrag fuer Ziel, Transaktion und operative
Runway-KPIs. Die davon getrennte Dynamic-Flex-Safety behaelt ihren kalibrierten
Rohbedarfsnenner; damit fuehrt der Slice keine neue Safety-Schwelle ein.

## Preflight vor Coding

- `git branch --show-current`:
  `codex/suite-datenintegritaet-hardening`
- `git status --short`:
  ` M RuheStandSuite.exe`
- `HEAD`: `54c055fbab5eb9884e1142e0158bbfade95e063e`
- `main...HEAD`: 0 Commits hinter, 42 Commits vor `main`
- Passung zum Arbeitsplan: Der Nutzer hat am 2026-08-03 ausdruecklich die
  Umsetzung dieses Bug-Slice auf dem aktuellen Branch beauftragt.
- Vorbestehende Aenderung: `RuheStandSuite.exe` gehoert dem Nutzer, liegt
  ausserhalb dieses Slice und wird weder gelesen, gebaut, zurueckgesetzt noch
  fuer einen spaeteren Commit vorgemerkt.

## Ziel

Liquiditaetsziel, Transaktionsentscheidung und kanonische Runway-Diagnosen
verwenden denselben nach allen Spending-Policies und der finalen
Entnahmequantisierung freigegebenen nominalen Netto-Portfoliojahresbedarf.
Eine hohe ungekappte VPW-Flex-Basis darf keinen Puffer fuer Ausgaben erzeugen,
die die Engine im selben Jahr nicht freigibt.

## Akzeptanzkriterien

1. Der kanonische effektive Nettojahresbedarf entspricht der final geplanten
   Portfolioauszahlung aus dem SpendingPlanner: Netto-Floor plus effektivem
   Flex nach Alarm, Guardrails, Mindest-Flex, Flex-Budget, finaler Glaettung
   und Monatsquantisierung.
2. Das Liquiditaetsziel berechnet sich aus diesem Wert und
   `liquidityRunwayYears`. Der bestehende separate Brutto-Notfallpuffer aus
   `minCashBufferMonths` bleibt als Untergrenze erhalten und wird nicht mit
   der Runway-Basis verwechselt.
3. Zielauffuellungen, Zieldeckung, kanonischer Pre-/Post-Transaktions-Runway,
   Runway-Status sowie Post-Payout-Jahresend-Runway verwenden dieselbe final
   geplante Entnahmebasis.
4. Die vor der Spending-Entscheidung benoetigte interne Runway-Schaetzung und
   die Dynamic-Flex-Safety verwenden weiterhin den ungekürzten nominalen
   Nettojahresbedarf. Die Safety-Basis wird explizit diagnostiziert und darf
   nicht als operatives Ziel oder Jahresend-KPI ausgegeben werden.
5. Ein synthetischer Dynamic-Flex-Zeuge mit starkem Final-Guardrail belegt,
   dass das Ziel die final geplante Auszahlung und nicht den rohen VPW-Flex
   multipliziert. Der Zeuge verwendet keine persoenlichen Exportdaten.
6. Ein Transaktionszeuge belegt, dass die harte Runway-Pruefung den effektiven
   Jahresbedarf aus `spending` statt den statischen beziehungsweise rohen
   Flex-Input verwendet. Nur direkte Legacy-Aufrufer ohne jedes Spending-
   Ergebnis behalten einen diagnostizierten Rueckfallpfad; ein vorhandenes,
   aber unvollstaendiges oder widerspruechliches Ergebnis scheitert fail-closed.
7. Die Backtest-Jahreszeile weist Runway-Zieldeckung und Runway-Monate aus
   einer konsistenten Phase aus. `entnahme_plan` bleibt die unabhaengig
   nachrechenbare Euro-Basis.
8. Historischer Backtest, Monte Carlo, Sweep, Auto-Optimize und Worker bleiben
   auf derselben Engine-Semantik. Erwartete Ergebnisdeltas werden gemessen;
   unbeklaerte Abweichungen oder `abs(FlowDelta) >= 1 EUR` stoppen den Slice.
9. `npm run build:engine`, fokussierte Tests, `npm test`, Browsergates,
   Dokumentationsgates und `git diff --check` bestehen.
10. Codex dokumentiert technische Nachweise, erteilt aber keine eigene
    Freigabe und erstellt keinen Commit oder Push.
11. Die Dynamic-Flex-Safety besitzt einen Gegenzeugen, bei dem der operative
    post-policy Runway ueber der Erholungsschwelle, der Rohbedarfs-Runway aber
    unter 24 Monaten liegt; die Safety darf dadurch nicht deeskalieren.
12. Geplante Entnahme- und Aktions-Flows sind strikt: fehlende, nicht endliche,
    negative oder widerspruechliche Werte, malformed Quellen oder Verwendungen,
    Bestandsueberschreitungen, Phantomquellen, doppelte Quellen, falsche
    Steuer-Rohwerte, Cash-Ueberbuchung und nicht reconciliierte Flows scheitern
    kontrolliert statt still normalisiert zu werden. Dieser Vertrag gilt vor
    und nach einer optionalen 3-Bucket-Umschreibung sowie an der direkten
    Simulatorgrenze.
13. Die direkte Simulatorausfuehrung prueft die rohe Jahressteuer exakt gegen
    die zentrale Steuerabrechnung und weist danach einen versionierten
    Ausfuehrungs-Steuervertrag aus. Plan, Quellenreserve, regulaere und
    erzwungene Steuern, Zinssteuer, finale Jahressteuer und Cash-Anpassung
    muessen darin reconciliert sein.

### Herkunft und Aenderungshistorie der Akzeptanzkriterien

Der Slice war bis zur zweiten Claude-Runde uncommitted; deshalb existiert keine
Git-Version des urspruenglichen Wortlauts. Zur Aufloesung von CR17-10 wird die
fachliche Herkunft der Kriterien ab jetzt explizit festgehalten:

| Kriterien | Herkunft | Nachtraegliche Aenderung |
| --- | --- | --- |
| AK1, AK2, AK5, AK7 bis AK10 | urspruenglicher Runway-Bugfixauftrag | keine inhaltliche Erweiterung durch das Review |
| AK3 | urspruenglich gemeinsame effektive Basis auch fuer die Dynamic-Flex-Safety | nach CR17-3 auf operative Ziel-/Runway-Groessen begrenzt; die Safety wurde wegen ihrer bestehenden Kalibrierung herausgenommen |
| AK4 | urspruenglich keine getrennte Gegenanforderung fuer die Safety-Basis | nach CR17-3 inhaltlich auf den Rohbedarfsnenner festgelegt und von operativen KPIs abgegrenzt |
| AK6 | urspruenglicher Transaktionszeuge fuer die effektive Spending-Basis | nach CR17-2 und CR17-6 um absent-only Legacy-Fallback sowie fail-closed bei vorhandenem unvollstaendigem Ergebnis verschaerft |
| AK11 | neu aus Claude-Runde 1, CR17-3 | benannter Safety-Gegenzeuge fuer gekuerzten operativen Runway versus Rohbedarfs-Runway |
| AK12 | neu aus CR17-8 und der nachlaufenden H17-Vertragspruefung | strikter Entnahme-/Aktions-/Bestandsvertrag vor und nach 3-Bucket |
| AK13 | neu aus der nachlaufenden H17-Vertragspruefung | zentrale Jahressteuerabstimmung und versionierter Ausfuehrungs-Steuervertrag |

Die nachtraeglichen Kriterien sind keine rueckdatierte Beschreibung des
urspruenglichen Auftrags. Ihre Aufnahme folgt aus Review-Findings. Die damit
verbundene Erweiterung von fuenf auf zehn Produktivdateien wurde vom Nutzer am
2026-08-04 als gemeinsamer Slice und spaeterer gemeinsamer Commit genehmigt.

## Scope

Produktivcode, final durch die Nutzerentscheidung zu CR17-9 genehmigt:

Urspruenglicher Runway-Scope vor Claude-Runde 1:

- `engine/core.mjs`
- `engine/transactions/transaction-utils.mjs`
- `engine/transactions/transaction-action.mjs`
- `app/simulator/simulator-year-result.js`
- `app/simulator/historical-backtest-export.js`

Reviewbedingt hinzugekommener und am 2026-08-04 nachtraeglich genehmigter
Vertragsscope:

- `engine/transactions/three-bucket-logic.mjs`
- `types/planned-withdrawal-contract.js`
- `types/planned-action-contract.js`
- `app/simulator/simulator-engine-direct.js`
- `app/simulator/simulator-tax-recompute.js`

Tests und erwartete Evidenzanpassungen:

- fokussierte Engine-/VPW-, Transaktions- und Simulator-Regressionstests;
- `tests/core-negative-contracts.test.mjs` fuer fehlende, ungueltige,
  widerspruechliche und nicht reconciliierte Vertragswerte;
- produktionsnahe Bestandszeugen in den direkten TransactionEngine-Tests;
- bestehende versionierte Backtest-Messgrenzen nur als neue Slice-17-Grenze,
  nicht als stilles Ueberschreiben der Slice-14-bis-16-Eingangsartefakte;
- `tests/README.md`, falls ein eigener neuer Testpfad entsteht.

Dokumentation:

- dieses Slice-Dokument;
- `docs/internal/BACKTEST_2000_2025_DATENPRUEFUNG.md`;
- `README.md`;
- `docs/reference/TECHNICAL.md`;
- `docs/reference/SIMULATOR_MODULES_README.md`;
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`.

## Nicht im Scope

- Aenderung von `liquidityRunwayYears`, dessen Default, Domain oder
  Schrittweite;
- Neukalibrierung von VPW, Guardrails, Mindest-Flex oder Flex-Budget;
- Neukalibrierung von Steuerregeln, Steuersaetzen oder 3-Bucket-Policies; die
  vertragserhaltende Grenzvalidierung und zentrale Jahressteuerabrechnung kamen
  reviewbedingt hinzu und wurden erst durch CR17-9 nachtraeglich Bestandteil
  desselben Slice;
- Gold-, Pflege- oder Demografie-Semantik;
- Ansparphasen ohne Spending-Entscheidung;
- Bereinigung des Legacy-Felds `NeedLiq`;
- historische Datenreihen oder persoenliche Exportdaten;
- `engine.js` von Hand, `dist/` oder `RuheStandSuite.exe`;
- Commit, Push oder Merge durch Codex.

## Diff-Risiko vor Coding

```text
Urspruenglich vor Coding geplante Produktivdateien:
- engine/core.mjs
- engine/transactions/transaction-utils.mjs
- engine/transactions/transaction-action.mjs
- app/simulator/simulator-year-result.js
- app/simulator/historical-backtest-export.js

Erst nach Claude-Runde 1 und adversarialer Vertragspruefung hinzugekommen:
- engine/transactions/three-bucket-logic.mjs
- types/planned-withdrawal-contract.js
- types/planned-action-contract.js
- app/simulator/simulator-engine-direct.js
- app/simulator/simulator-tax-recompute.js

Die zweite Gruppe war kein Bestandteil des urspruenglichen Preflight. Der
Nutzer hat ihre ungetrennte Aufnahme am 2026-08-04 mit CR17-9 nachtraeglich
genehmigt.

Weitere geplante Dateien:
- fokussierte Tests und gegebenenfalls neue Slice-17-Fixtures
- tests/README.md nur bei neuem Testpfad
- README.md
- docs/reference/TECHNICAL.md
- docs/reference/SIMULATOR_MODULES_README.md
- docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md
- docs/internal/BACKTEST_2000_2025_DATENPRUEFUNG.md
- docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_17_RUNWAY_BASIS_BUGFIX.md

Voraussichtliche Aenderungstiefe:
- riskant; kleine Zahl produktiver Dateien, aber wertveraendernde Engine-
  Semantik mit Backtest-, Monte-Carlo-, Sweep- und Worker-Folgeeffekten

Gefaehrdete bestehende Tests:
- Dynamic-Flex-/Spending- und Transaktionsgates
- Simulator-Jahresergebnis und Runway-KPI
- historische Charakterisierung und Slice-Attribution
- Monte-Carlo-, Sweep-, Auto-Optimize- und Worker-Paritaet
- Export-Fingerprints und versionierte Messfixtures

Nicht anfassen:
- historische Datenwerte und Builder
- Steuer-, Gold-, Pflege-, Demografie- und 3-Bucket-Policykalibrierung
- Slice-14-bis-16-Eingangsartefakte ohne neue versionierte Grenze
- engine.js manuell, dist/, src-tauri/, RuheStandSuite.exe

Rollback-Strategie:
- git checkout -- engine/core.mjs engine/transactions/transaction-utils.mjs
  engine/transactions/transaction-action.mjs
  engine/transactions/three-bucket-logic.mjs
  app/simulator/simulator-engine-direct.js
  app/simulator/simulator-tax-recompute.js
  app/simulator/simulator-year-result.js
  app/simulator/historical-backtest-export.js README.md
  docs/reference/TECHNICAL.md docs/reference/SIMULATOR_MODULES_README.md
  docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md
  docs/internal/BACKTEST_2000_2025_DATENPRUEFUNG.md
- bestehende geaenderte Testdateien beziehungsweise Fixtures werden nur
  einzeln mit ihrem dokumentierten Pfad zurueckgesetzt
- neue Slice-17-Dateien werden nur nach ausdruecklicher Loeschfreigabe entfernt
```

Die Stop-Regeln griffen im urspruenglichen Preflight mit fuenf Produktivdateien
nicht. Die nachlaufende Vertragspruefung erweiterte den Scope auf exakt zehn
Produktivdateien; diese Erweiterung wurde nicht rueckdatiert, sondern am
2026-08-04 durch die Nutzerentscheidung zu CR17-9 ausdruecklich ratifiziert und
bleibt unter der Stop-Regel, die erst bei mehr als zehn Dateien greift. Rote oder
unerwartete Ergebnisdeltas, nicht ausfuehrbare Pflichtvalidierung,
`FlowDelta`-Auffaelligkeiten oder ein UI-/Engine-Contractbruch bleiben
Stoppsignale waehrend der Umsetzung.

## Geplante Tests

- fokussierte Baseline der betroffenen Engine-, VPW-, Transaktions-,
  Simulator- und Backtest-Tests vor dem ersten Code-Edit;
- synthetischer Post-Policy-Runway-Regressionstest;
- fokussierte Tests aller geaenderten Pfade;
- lokaler Replay des bereitgestellten Exports ohne Aufnahme seiner Daten in
  Repository oder Testfixtures;
- `npm run build:engine`;
- `npm test`;
- `npm run test:browser`;
- `npm run docs:evidence`;
- `git diff --check`.

## Durchgefuehrte Aenderungen

- `engine/core.mjs` trennt den nur fuer den SpendingPlanner benoetigten
  `prePolicyRunwayMonths` vom kanonischen post-policy Runway. Der neue geteilte
  Vertrag reconciliert `details.endgueltigeEntnahme`, Monatswert mal 12 und
  gegebenen Jahresplan centgenau. Fehlende, ungueltige oder widerspruechliche
  Planner-Ausgaben fallen nicht auf `neuerBedarf` zurueck.
- Ziel-Liquiditaet, Zieldeckung, Transaktionsentscheidung und operative
  Pre-/Post-Transaktions-Runways verwenden die final geplante Entnahmebasis.
  Die Dynamic-Flex-Safety bleibt bewusst auf dem Rohbedarf; der neue Zeuge
  verhindert die von Claude beschriebene kuerzungsinduzierte Deeskalation.
- Das Liquiditaetsziel erhaelt den kanonischen Jahresbetrag direkt statt einer
  wirkungslosen erfundenen Floor-/Flex-Zerlegung.
- `transaction-action.mjs` verwendet fuer den harten Runway-Guardrail das
  vorhandene Spending-Ergebnis. Nur direkte Legacy-Aufrufer ohne jedes
  Spending-Ergebnis behalten den markierten konservativen Rueckfall auf
  Netto-Floor plus statischem Input-Flex; `spending: {}` scheitert.
- `transaction-utils.mjs` benennt seinen Bedarf als vom Aufrufer gelieferten
  Jahresbedarf und bezieht den Default des separaten Brutto-Notfallpuffers aus
  `CONFIG`, statt denselben Wert ein zweites Mal als Literal zu pflegen.
- Cash-Flows werden vor jeder Normalisierung validiert. Der Core zieht
  Cash-Quellen einer Surplus-Investition vom Bestand ab, lehnt malformed oder
  nicht endliche Verwendungen ab, reconciliert Cash-Quelle gegen Asset-
  Verwendungen und stoppt Ueberbuchungen statt sie auf null zu klammern.
- `types/planned-action-contract.js` bildet den gemeinsamen strikten Vertrag
  fuer `NONE`- und `TRANSACTION`-Aktionen. Er erlaubt nur kanonische Quellen und
  Verwendungen, prueft Erhaltung, eindeutige Quellen, vorhandene Lots,
  Bestandskapazitaet und die vorzeichenbehaftete Steuerwirkung gegen kanonische
  Lot- beziehungsweise Legacy-Steuermetadaten. Geldmarktwerte duerfen Kontext,
  aber keine erfundene Verkaufsquelle sein.
- Core und direkter Simulator validieren die Transaktionsaktion sowohl vor als
  auch nach einer optionalen 3-Bucket-Umschreibung. Der 3-Bucket-Pfad nullt
  nicht mehr vorhandene Bond-Quellen, stimmt Teilverwendungen ab und verwendet
  dieselben kanonischen Lot-Schluessel.
- `simulator-engine-direct.js` verwendet denselben Entnahmevertrag auch fuer
  injizierbare Monats-only-Engine-Adapter. Ein ungueltiger Shape bleibt im
  stabilen `technical_error`-Outcome und restauriert die Portfolio-Grenze.
- Die direkte Grenze materialisiert injizierte Aktionen getter-sicher, kopiert
  auch eingefrorene Aktionen vor einer Umschreibung und restauriert bei einem
  technischen Fehler Marktwert, IDs, Datum und Profil. Hostile Getter und
  Phantomquellen werden damit kontrolliert abgewiesen.
- `simulator-tax-recompute.js` berechnet die Jahressteuer zentral neu. Der rohe
  Engine-Output muss Jahressteuer, Settlement-Details und Verlustvortrag exakt
  gegen diese Abrechnung ausweisen. Nach Ausfuehrung bindet
  `SimulatorExecutedTaxContractV1` geplante Quellenreserve, regulaere und
  erzwungene Verkaufssteuer, Zinssteuer, finale Jahressteuer und Cash-Anpassung;
  das kompatible Top-Level-Feld `steuer` bleibt die finale Jahresabrechnung.
- `simulator-year-result.js` berechnet den Post-Payout-Jahresend-Runway aus
  `jahresEntnahmePlan` beziehungsweise dem finalen Spending-Ergebnis, nicht
  mehr aus dem rohen `ui.neuerBedarf`; widerspruechliche Darstellungen werden
  nicht nach einer lokalen Vorrangregel aufgeloest.
- Der Exportvertrag ist auf `HistoricalBacktestInputSemanticsV2` angehoben;
  `strategyTargetSource` benennt die post-policy Netto-Floor-/Effektiv-Flex-
  Basis explizit. Der synthetische Export-Fingerprint besitzt eine neue,
  versionierte Slice-17-Grenze.
- Synthetische Ziel-, Guardrail-, Jahresresultat-, Steuer-, Brutto-Puffer- und
  Browserzeugen wurden ergaenzt beziehungsweise auf echte Produktiv-Shapes
  umgestellt. Negativzeugen decken Missingness, `null`, String, NaN, Infinity,
  Konflikt, Cash-Ueberbuchung und nicht reconciliierte Cash-Verwendungen ab.
- Der nach Claude-Runde 2 wiederhergestellte benannte Bear-Cap-Zeuge isoliert
  `isCriticalLiquidityBear`: Exakt 75 Prozent Zieldeckung ergeben das
  quantisierte 10.000-EUR-Standard-Cap, einen Euro darunter greift das
  50.000-EUR-Notfall-Cap. Nullgewinn-Lots halten den Zeugen steuerneutral. Der
  Zeuge deckte zusaetzlich eine irrefuehrende Diagnose auf; der Notfallarm
  benennt nun das tatsaechlich wirksame 10-Prozent-Cap statt der konfigurierten
  2,5-Prozent-Standardgrenze.
- `three-bucket-logic.mjs` wurde ohne Logikaenderung vollstaendig auf die in
  `.gitattributes` vorgeschriebenen LF-Zeilenenden normalisiert.
- `liquidity-runway-basis-slice-17-measurement-v1.json` bindet die neuen
  Backtest-, Monte-Carlo/Sweep- und Demografie/Pflege-Zielhashes. Die alten
  Slice-10-/13-Fixtures bleiben byteidentisch. Zusaetzlich bindet die neue
  Fixture den lebenden `crossSliceOracleProjection` und das vollstaendige
  Slice-09-nach-10-Deltaledger durch exakte SHA-256-Werte; der alte
  Slice-10-Updatepfad ist blockiert. Die Fixture enthaelt keine Daten des
  Nutzerexports.
- README, technische Referenz, Simulator-Modulreferenz, Architektur-/
  Fachkonzept, Testreferenz und Hauptplan dokumentieren die korrigierte
  Rechenphase sowie die getrennte Brutto-Untergrenze.

## Ausgefuehrte Tests

- Vor dem Produktivcode-Edit bestanden die fokussierten Bestandsfaelle:
  VPW/Dynamic Flex 56/56, Regime 75/75, Simulation 32/32,
  Transaction-ATH 10/10, Quantisierung 19/19 und Backtest-
  Charakterisierung 249/249.
- Die neuen Regressionen wurden vor der ersten Korrektur bewusst rot
  nachgewiesen: Ziel 2.150.700 statt 765.000 EUR, unnoetige Runway-Notfuellung
  und fehlender post-policy Jahresend-Runway.
- Claude-Runde 1 wurde danach ebenfalls rot reproduziert: Bestands-Guardrails
  liefen unbemerkt auf `spending: {}`, die Safety sah 60 statt 21,3426 Monate,
  fehlende Planner-Ausgabe fiel auf Rohbedarf zurueck, widerspruechliche
  Jahresentnahmen waehlten unterschiedliche Prioritaeten und Cash-
  Ueberbuchungen wurden verborgen. Die drei Abweichungs-Gates wurden als
  richtungsabhaengig identifiziert.
- Nach der erweiterten Vertragsnachbesserung bestehen fokussiert: VPW/Dynamic
  Flex 73/73, Liquiditaets-Guardrail 26/26, Simulation 75/75,
  Regime/Brutto-Puffer 77/77, Core-Negativvertraege 192/192,
  Core-Steuerintegration 84/84, 3-Bucket-Refill 32/32, Simulator-Steuer 77/77,
  Transaction-ATH 10/10, Transaction-Rebalancing 4/4,
  Transaktionsquantisierung 19/19 und Simulator-Sweep 254/254.
- Die exakten Messgrenzen bestehen: Backtest-Charakterisierung 250/250,
  Monte-Carlo-Messvertrag 783/783, Demografie/Pflege-Messvertrag 28/28 und
  historischer Export 107/107.
- `npm run build:engine`: erfolgreich; mangels lokalem `esbuild` wurde der
  vorgesehene Modul-Wrapper-Fallback ausgefuehrt. `engine.js` blieb inhaltlich
  unveraendert.
- `npm test`: 166 Testdateien, **18.822/18.822** Assertions, 0 Fehler,
  0 fehlgeschlagene Dateien, 1 separates Gate bestanden, 0 offene Handles.
  Der nach Claude-Runde 2 nachbearbeitete Stand wurde vollstaendig ausgefuehrt.
- `npm run test:browser`: **28/28** Browser-Smokes erfolgreich.
- `npm run docs:evidence`: erfolgreich; statische Evidenzpruefung ohne
  Netzwerkzugriff.
- `git diff --check`: erfolgreich.
- Vertraulicher In-Memory-Replay des Nutzerrequests nach der CR17-
  Nachbesserung: zweimal byteidentisches kanonisches Resultat, 26/26 Jahre bis
  2025, Outcome `completed`, kein Ruin, maximaler absoluter `FlowDelta`
  `9,31e-10` EUR. Der Lauf wurde weder als Fixture noch als lokale
  Ergebnisdatei gespeichert.

## Abweichungen vom Plan

- Claude-Runde 1 und die nachlaufende adversariale Vertragspruefung machten
  gemeinsame Entnahme- und Aktionsvertraege, die technische Outcome-Grenze des
  direkten Simulators sowie eine zentrale Steuerabrechnung erforderlich. Der
  produktive Scope umfasst deshalb exakt zehn Dateien und ueberschreitet die
  Stop-Grenze fuer mehr als zehn Produktivdateien nicht. Diese fuenf zusaetzlichen
  Dateien waren nicht Teil des urspruenglichen Plans; der Nutzer genehmigte ihre
  ungetrennte Aufnahme erst nach Claude-Runde 2 ausdruecklich mit CR17-9.
- Die bestehende Browser-Fixierung erwartete im Fuenfjahresarm noch einen
  Bruttoverkauf von 90.000 EUR. Die korrigierte post-policy Basis ergibt
  reproduzierbar 80.000 EUR; der Browserzeuge wurde als erwartetes
  Slice-17-Delta aktualisiert, der Einjahres-Kontrollarm bleibt bei 50.000 EUR.
- Alte Slice-10-/13-Messungen verglichen den aktuellen Runtimepfad mit ihrer
  historisch neutralen Ergebnisgrenze. Sie wurden nicht ueberschrieben.
  Stattdessen bindet eine neue Slice-17-Fixture die erwarteten Deltas und die
  byteidentischen Quellenhashes.
- Der lokale Replay kann wegen des ehrlichen `sourceTreeStatus: dirty` keinen
  zulaessigen Raw-Export-Fingerprint erhalten; der Export-Builder blockiert
  korrekt mit `HISTORICAL_EXPORT_SOURCE_TREE_DIRTY`. Ein Clean-Provenienz-
  Fingerprint ist erst nach externem Review und Commit moeglich.
- Die Korrektur aendert den Pfad bereits ab 2000. Das korrigierte Jahr 2025 ist
  deshalb keine isolierte Multiplikation der alten 78.000-EUR-Entnahme mit
  fuenf Jahren, sondern das Ergebnis aller geaenderten Vorjahrestransaktionen.

## Ergebnisse

- Der synthetische Hauptzeuge trennt 430.124,75 EUR rohen VPW-Bedarf von
  153.000 EUR final geplanter Entnahme. Das Ziel sinkt von der fehlerhaften
  Rohbasis 2.150.700 EUR auf 765.000 EUR; 35.000 EUR echter Ueberschuss werden
  investiert und der Post-Transaktions-Runway betraegt exakt 60 Monate.
- Der direkte Guardrail-Zeuge erkennt 40 Monate effektive Reichweite und
  vermeidet die zuvor aus 132.000 EUR Rohbedarf abgeleitete Notfuellung. Der
  Legacy-Fallback ohne Spending-Daten bleibt reproduzierbar konservativ.
- Der unabhaengige 2000-2025-Integrationszeuge bleibt `completed`, hat weiter
  26 Ergebniszeilen und `FlowDelta = 0`. Gegen die unveraenderte Slice-13-
  Grenze aendern sich erwartungsgemaess Rowhash und Finanzpfad; Endvermoegen
  `+61.216,21` EUR, Entnahmen `-1.562,20` EUR und Steuern `-4.728,92` EUR sind
  in der neuen Fixture attribuiert.
- Im vertraulichen Nutzer-Replay verschiebt sich die fehlerhaft aufgebaute
  Endliquiditaet reproduzierbar und wesentlich zurueck in das Aktienvermoegen.
  Die persoenlichen Ergebniswerte werden nicht in das Repository uebernommen.
  Die starke Pfadwirkung folgt insbesondere daraus, dass die Dynamic-Flex-
  Safety wieder auf ihrer Rohbedarfsbasis entscheidet. Die operative
  Liquiditaet entspricht dem tatsaechlichen Entnahmeplan; der rohe VPW-Bedarf
  bleibt nur fuer Planner und Safety wirksam.

## Offene Risiken

- Die effektive Bedarfsbasis entsteht erst nach dem SpendingPlanner. Die von
  diesem Planner selbst benoetigte Pre-Policy-Runway-Schaetzung und die
  kalibrierte Dynamic-Flex-Safety muessen getrennt bleiben, damit weder ein
  zirkulaerer Policyvertrag noch eine kuerzungsinduzierte Deeskalation entsteht.
- Eine niedrigere Ziel-Liquiditaet aendert fruehere Verkaeufe, Steuern,
  Aktienrenditeexposure und damit den gesamten spaeteren Pfad. Die neue
  versionierte Messgrenze belegt den aktuellen Code, ersetzt aber kein
  externes fachliches Review dieser wirtschaftlichen Folgewirkung.
- Direkte externe TransactionEngine-Aufrufer ohne Spending-Daten erhalten
  weiter bewusst den konservativen Legacy-Fallback. Ein solcher Aufrufer kann
  die korrigierte Core-Orchestrierung daher nicht fuer sich beanspruchen; der
  Diagnosemarker verhindert lediglich einen stillen Zweigwechsel.
- Die rueckwaertskompatiblen Jahresfelder unter dem Praefix `safety_` enthalten
  historisch sowohl operative post-policy Zeitpunkte als auch den separaten
  Dynamic-Flex-Safety-Wert auf Rohbedarfsbasis. Die Referenz dokumentiert diese
  Basis explizit; eine additive Umbenennung waere ein eigener Exportvertrag.
- Die Runway-Zieldeckung vergleicht weiterhin die Liquiditaet nach Auszahlung
  mit einem Ziel aus der Entscheidungsphase vor Auszahlung. Beide Groessen
  haben dieselbe Entnahmebasis, aber bewusst unterschiedliche Zeitphasen.
- Die bestehende Zwei-Monats-Brutto-Untergrenze kann in bedarfsarmen Jahren
  das effektive Runway-Ziel uebersteuern und muss als getrennte Policy
  transparent bleiben.
- Der finale exportfaehige Fingerprint und eine saubere Run-ID koennen erst
  nach Review/Commit auf einem sauberen Quellbaum erzeugt werden.
- Vorbestehendes, ausserhalb des Nutzerfalls liegendes Restrisiko: Im direkten
  3-Bucket-Diagnosefeld `bondSaleAmount` kann ein regulaerer Bad-Year-Bondverkauf
  doppelt erscheinen. Portfolio, Cash, FlowDelta und der geplante Aktionsfluss
  bleiben im reproduzierten Zeugen korrekt; der vorliegende Nutzerfall verwendet
  keinen 3-Bucket-Modus. Die diagnostische Feldsemantik benoetigt einen eigenen
  Bug-Slice statt einer Scope-Erweiterung dieses Fixes.
- Die Steuerpruefung bindet Aktionswerte exakt an die kanonischen gespeicherten
  Anschaffungs-, TQF- und Freibetragsmetadaten. Bereits vor dem Lauf intern
  konsistente, aber fachlich korrumpierte Stammdaten koennen dadurch nicht als
  Aktionsvertragsfehler erkannt werden; ihre Provenienz bleibt ein getrenntes
  Datenintegritaetsrisiko.
- CR17-13 ist fuer Slice 17 nicht geschlossen. Der Nutzer akzeptiert die
  Begrenzung fuer diesen Slice als dokumentiertes Restrisiko:
  `proportional_market_value_v1` entspricht der aktuellen Sale-Engine, die
  Marktwert und Cost Basis innerhalb eines Lots proportional reduziert. Die
  absolute Toleranz `1e-7` gilt fuer interne ungerundete Rohwerte und ist keine
  Zusage an centgerundete Fremdadapter. Nichtproportionale Lotauswahl benoetigt
  vor ihrer Einfuehrung einen neuen Vertragsstand. Slice 18 klaert
  Vertragsversionierung, toleranzstabile Reconciliation, Importprovenienz und
  kuenftig nichtproportionale Lotauswahl; seine Umsetzung ist nicht begonnen
  und erfordert eigenen Preflight, Scope und Slice-MD.

## Rueckdokumentation in den Hauptplan

- D-21 und Slice 17 sind im Hauptplan angelegt.
- Implementierungsstatus, neue Messgrenze, Testgates, lokaler Replay und
  Claudes Runde-2-Entscheidung sowie die Nutzerfreigabe der Scope-Erweiterung
  sind dort rueckdokumentiert. CR17-13 ist dort als offener Slice-18-Auftrag
  vorgemerkt.

## Freigabestatus

- Codex-Selbstpruefung: technische Implementierung und Pflichtgates
  abgeschlossen; keine Freigabe erteilt.
- Review durch Claude: Runde 2 ohne Blocker und unter CR17-9 freigegeben;
  abschliessende externe Commit-Pruefung nach CR17-10 bis CR17-12 ausstehend.
- Nutzerentscheidung zu CR17-9: Scope-Erweiterung am 2026-08-04 ausdruecklich
  als gemeinsamer Slice und spaeterer gemeinsamer Commit genehmigt.
- CR17-13: fuer Slice 17 als offenes Restrisiko akzeptiert und in den noch
  nicht begonnenen Slice 18 uebernommen.
- Commit/Push: nicht durch Codex.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| S17-START-01 | Nutzer | Hohe Endliquiditaet folgt dem rohen VPW-Flex statt der effektiven Auszahlung; Bug im aktuellen Branch korrigieren und als eigener MD-Slice dokumentieren | angenommen | Slice 17 angelegt; technische Umsetzung und Selbstpruefung abgeschlossen |
| S17-IMPL-01 | Codex-Selbstpruefung | Post-policy Bedarf muss nach dem SpendingPlanner kanonisch fuer Ziel, Transaktion und Runway werden | umgesetzt, nicht freigegeben | `engine/core.mjs`, `transaction-action.mjs`, `simulator-year-result.js` und Regressionen angepasst |
| S17-IMPL-02 | Codex-Selbstpruefung | Der Planner benoetigt zur Vermeidung eines Zirkelschlusses weiterhin einen getrennten Pre-Policy-Runway | umgesetzt, nicht freigegeben | interne Variable klar benannt; exportierter Pre-Transaction-Runway verwendet post-policy Bedarf |
| S17-EVIDENZ-01 | Vollsuite | Alte Slice-10-/13-Fixtures weichen erwartungsgemaess ab und duerfen nicht still ueberschrieben werden | neue versionierte Grenze | Slice-17-Messfixture bindet Quellen- und Zielhashes; alte Bytes bleiben geprueft |
| S17-EXPORT-01 | Raw-Export-Gate | Dirty Arbeitsbaum besitzt keine freigabefaehige Run-ID oder Result-Fingerprint | offen bis Review/Commit | lokaler Replay nur diagnostisch; Builder blockiert korrekt fail-closed |
| S17-REVIEW-01 | Rollenvertrag | Codex darf die eigene Implementierung nicht freigeben | extern geprueft, Commit-Pruefung offen | Claude-Runde 2 ohne Blocker; Nutzer hat CR17-9 entschieden; Abschluss nach CR17-10 bis CR17-12 erneut extern, CR17-13 in Slice 18 uebernommen |
| CR17-1 | Claude Runde 1 | Blocker: Die Laufzeitbindung der Slice-10-Backtestmessung ist ersatzlos entfallen; nur noch die Archivdatei wird per SHA-256 geprueft | geschlossen durch Claude Runde 2 | neue exakte Hashes fuer `crossSliceOracleProjection` und volles Deltaledger; Slice-10-Updatepfad blockiert |
| CR17-2 | Claude Runde 1 | Blocker: Die vier Bestands-Guardrailfaelle wurden per `spending: {}` auf den Legacy-Rueckfallzweig umgestellt, den der Produktivpfad nie nimmt | geschlossen durch Claude Runde 2 | Produktiv-Shapes wiederhergestellt und neu hergeleitet; eigener absent-only-Legacy-Zeuge mit Diagnosemarker |
| CR17-3 | Claude Runde 1 | Blocker: Die Dynamic-Flex-Safety entscheidet ihre Krisenschwelle nun auf der gekuerzten Basis; Schwellen sind nicht nachkalibriert und ohne Zeugen | geschlossen durch Claude Runde 2 | Safety auf Rohbedarfsbasis restauriert; Gegenzeuge 60 operative versus 21,3426 Safety-Monate verhindert falsche Deeskalation |
| CR17-4 | Claude Runde 1 | Die Floor-/Flex-Zerlegung in `effectiveBedarf` ist wirkungslos; der einzige Verbraucher summiert beide Felder | geschlossen durch Claude Runde 2 | Zielberechnung akzeptiert den kanonischen Jahresbetrag direkt; keine erfundene Zerlegung |
| CR17-5 | Claude Runde 1 | Drei Gates fordern jetzt eine Abweichung statt einer Gleichheit und werden bei jeder spaeteren Wiederherstellung rot | geschlossen durch Claude Runde 2 | richtungsabhaengige Ungleichheitsgates entfernt; exakte versionierte Sollobjekte und Hashes verwendet |
| CR17-6 | Claude Runde 1 | Der Rueckfall auf `neuerBedarf` in `core.mjs` stellt den Ausgangsfehler still wieder her und ist weder markiert noch getestet | geschlossen durch Claude Runde 2 | gemeinsamer Entnahmevertrag scheitert bei missing/invalid/conflict fail-closed; direkte Legacy-Ausnahme ist markiert |
| CR17-7 | Claude Runde 1 | Engine und Jahresresultat verwenden entgegengesetzte Vorrangreihenfolgen fuer dieselbe kanonische Basis | geschlossen durch Claude Runde 2 | Core, direkter Simulator und Jahresresultat verwenden denselben Reconciliation-Vertrag |
| CR17-8 | Claude Runde 1 | Die neue Nullklammer auf `liqNachTransaktion` verdeckt einen Ueberschussabfluss oberhalb der verfuegbaren Liquiditaet | geschlossen durch Claude Runde 2 | Cash-Abfluss wird subtrahiert; malformed Flows, Nicht-Reconciliation und Ueberbuchung stoppen ohne Clamp |
| H17-1 | nachlaufende adversariale Vertragspruefung | Aktionsquellen konnten wirtschaftlich unvollstaendig, doppelt, bestandswidrig oder ohne echte Quelle erscheinen | technisch bestaetigt in Claude Runde 2; keine Codex-Freigabe | gemeinsamer `PlannedActionContractV1` mit kanonischen Keys, Erhaltung, Inventar- und Phantomquellenpruefung vor und nach 3-Bucket |
| H17-2 | nachlaufende adversariale Vertragspruefung | Deklarierte rohe Verkaufssteuer war nicht lueckenlos an Lots beziehungsweise Legacy-Steuermetadaten gebunden | technisch bestaetigt in Claude Runde 2; keine Codex-Freigabe | vorzeichenbehaftete exakte Steuerbindung je Quelle einschliesslich Tuple-Lot-Schluesseln und abgeleiteten Share/Preis-Lots |
| H17-3 | nachlaufende adversariale Vertragspruefung | Direkte Engine-Adapter konnten rohe Jahressteuer oder Verlustvortrag liefern, die nicht der zentralen Steuerabrechnung entsprechen | technisch bestaetigt in Claude Runde 2; keine Codex-Freigabe | exakter Vergleich von Jahressteuer, Settlement-Details und `taxState` gegen `settleTaxYear` |
| H17-4 | nachlaufende adversariale Vertragspruefung | 3-Bucket-Umschreibungen und eingefrorene beziehungsweise getter-behaftete Aktionen konnten die technische Grenze umgehen oder partiell mutieren | technisch bestaetigt in Claude Runde 2; keine Codex-Freigabe | getter-sichere Materialisierung, Clone vor Mutation, Vor-/Nachvalidierung und vollstaendige Grenzrestauration im `technical_error`-Pfad |
| H17-5 | nachlaufende adversariale Vertragspruefung | Plansteuer und tatsaechliche Jahressteuer waren nach Ausfuehrung in einem einzelnen Feld semantisch vermischt | technisch bestaetigt in Claude Runde 2; keine Codex-Freigabe | `SimulatorExecutedTaxContractV1` reconciliert Plan, Quellenreserve, Verkaufs-/Zinssteuer, Jahresabrechnung und Cash-Anpassung; Kompatibilitaetsfeld explizit als post-execution markiert |
| CR17-9 | Claude Runde 2 | Auflage: Der Slice ist von fuenf auf zehn Produktivdateien und 3.482 eingefuegte Zeilen gewachsen; H17-1 bis H17-5 wurden ohne Nutzerentscheidung ergaenzt und sind vom Runway-Fix nicht mehr trennbar | erfuellt durch Nutzerentscheidung am 2026-08-04 | Vertragsschicht bleibt ausdruecklich im gemeinsamen Slice und spaeteren gemeinsamen Commit |
| CR17-10 | Claude Runde 2 | Die Akzeptanzkriterien wurden nach der Umsetzung umgeschrieben (AK3, AK4, AK6) und um AK11 bis AK13 erweitert, ohne die Aenderung als solche zu kennzeichnen | technisch nachgebessert; externes Abschlussreview offen | Herkunftstabelle trennt urspruengliche Kriterien von reviewbedingten Aenderungen und Erweiterungen |
| CR17-11 | Claude Runde 2 | Der Baer-Krisenzweig `isCriticalLiquidityBear` hat seinen benannten Unit-Zeugen verloren; nur die aggregierte Backtestmessung bemerkt seinen Ausfall | technisch nachgebessert; externes Abschlussreview offen | benanntes Unit-Paar pinnt bei exakt 75 Prozent das 10.000-EUR-Standard-Cap und einen Euro darunter das 50.000-EUR-Notfall-Cap mit steuerneutralen Lots; die Diagnose nennt im Notfallarm nun korrekt 10 Prozent |
| CR17-12 | Claude Runde 2 | `engine/transactions/three-bucket-logic.mjs` traegt im Arbeitsbaum gemischte Zeilenenden gegen die `.gitattributes`-Vorgabe `*.mjs text eol=lf` | technisch nachgebessert; externes Abschlussreview offen | Arbeitskopie auf LF normalisiert; `git ls-files --eol` meldet `i/lf w/lf attr/text eol=lf` |
| CR17-13 | Claude Runde 2 | Die Steuerbindung im Aktionsvertrag schreibt proportionale Gewinnrealisierung mit 1e-7 absoluter Toleranz als harten Vertrag fest | fuer Slice 17 als offenes Restrisiko akzeptiert; in Slice 18 uebernommen | `proportional_market_value_v1` entspricht der aktuellen Sale-Engine; Slice 18 klaert Versionierung, Toleranz, Importprovenienz und kuenftig nichtproportionale Auswahl |
| CR17-14 | Claude Runde 3 | Beim Schliessen des Testbefunds CR17-11 wurde zusaetzlich die Notfall-Cap-Formel in `computeCappedRefill` umgeschrieben; die Aenderung ist wertneutral belegt, aber nicht als Produktivaenderung ausgewiesen | offen | ausstehend |
| CR17-15 | Claude Runde 3 | `safety_runway_pre_months` und `safety_runway_post_months` stehen in derselben Exportzeile mit unterschiedlichen Nennern; gemessen 62,7451 gegen 21,3426 Monate bei nur 35.000 EUR Aktionsvolumen | offen | ausstehend |

## Review-Feedback von Claude (Runde 3)

**Pruefgegenstand:** die Nachbearbeitung nach Runde 2, konkret die neue
Herkunftstabelle der Akzeptanzkriterien, das neue Guardrail-Grenzpaar in
`tests/liquidity-guardrail.test.mjs`, die geaenderte Notfall-Cap-Logik in
`engine/transactions/transaction-utils.mjs`, die Zeilenendennormalisierung von
`engine/transactions/three-bucket-logic.mjs`, die Aufnahme von
`proportional_market_value_v1` in `docs/reference/TECHNICAL.md` und
`docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` sowie der Abschnitt
"Nutzerentscheidung und Nachbearbeitung nach Claude-Runde 2".

**Verifikationsbasis (eigene Messungen):**

- `npm test` im Wegwerf-Klon: 18.822/18.822 Assertions, 0 fehlgeschlagene
  Dateien, 1 separates Gate, 0 offene Handles. Die genannte Zahl ist exakt
  reproduziert.
- `npm run test:browser`: 28/28 Browser-Smokes bestanden.
- `npm run docs:evidence`: 69 MKT-, 55 FOR-, 17 MAP-Records; 11/7 Reviewscopes;
  10 Modellmatrixtermine; ohne Netzwerkzugriff.
- `git diff --check`: ohne Befund; die CRLF-Warnung erscheint bei keiner
  Git-Operation mehr.
- Fokussiert nachgemessen: Liquiditaets-Guardrail 26/26, VPW/Dynamic Flex
  73/73, Backtest-Charakterisierung 250/250.
- Die Zielhashes der Messfixture sind gegenueber Runde 2 unveraendert:
  `targetActualSha256 47b325c5...`, `canonicalRowsHash 49aada46...`,
  `crossSliceOracleProjectionSha256 efff8eb8...`.
- Drei Mutations- beziehungsweise Aequivalenzproben in einem eigenstaendigen
  Klon ausserhalb des Projektverzeichnisses. Der Arbeitsbaum des Projekts wurde
  nicht veraendert.

### Probe 1 -- Faellt der Baer-Krisenzweig jetzt benannt auf? (CR17-11)

Dieselbe Neutralisierung wie in Runde 2, jetzt mit dem gewuenschten Ergebnis:

```text
isCriticalLiquidityBear = false
Runde 2   tests/liquidity-guardrail.test.mjs 16/16 gruen, nur drei
          unbenannte Pfaddiffs der Integrationsmessung
Runde 3   FAIL nach 9 Assertions: "Coverage one euro below 75% must
          activate the quantized 10% emergency cap"
```

Das neue Paar prueft den Grenzwechsel bei exakt 75 Prozent Zieldeckung und bei
einem Euro darunter, pinnt Standard-Cap 10.000 EUR gegen Notfall-Cap
50.000 EUR in Euro, haelt beide Arme ueber gleiche Anschaffungs- und Marktwerte
steuerneutral und prueft zusaetzlich den benannten Diagnoseeintrag.

### Probe 2 -- Ist die umgeschriebene Notfall-Cap-Formel wertneutral? (CR17-14)

Beim Schliessen eines reinen Testbefunds wurde Produktivcode geaendert:

```text
alt  effectiveMaxCap = Math.max(maxCapEuro, aktienwert * 0.10)
neu  effectiveMaxCap = (Math.max(capConfig.pct, 10) / 100) * aktienwert
```

Wegen `maxCapEuro = (capConfig.pct / 100) * aktienwert` ist das algebraisch
dieselbe Groesse. Gemessen wurde es dreifach:

```text
130 Wertepaare aus 13 Prozentsaetzen und 10 Aktienwerten
   inklusive 0, 9,999, 10, 10,0001 Prozent und 1e-6 bis 1e12 EUR
   max |alt - neu| = 0
Randfaelle pct = undefined, NaN, null, -5    identisches Ergebnis
alte Formel wieder eingesetzt, Vollsuite     18.822/18.822 unveraendert
```

Der Eingriff ist damit belegt wertneutral; er korrigiert ausschliesslich den
irrefuehrenden Diagnosetext, der im Notfallarm bisher den konfigurierten statt
den wirksamen Prozentsatz nannte. Der Text hat ausserhalb der Tests keinen
Konsumenten. Was fehlt, ist die Ausweisung: die Entscheidungstabelle nennt nur
die Diagnosekorrektur, "Abweichungen vom Plan" fuehrt die Formelaenderung nicht.

### Probe 3 -- Was zeigt die Exportzeile bei getrennten Nennern? (CR17-15)

Der Zeuge aus Test 18 wurde direkt ueber die EngineAPI gefahren und auf die
Felder der Jahreszeile abgebildet:

```text
roher Jahresbedarf                                  430.124,75 EUR
geplante Jahresentnahme                             153.000,00 EUR
safety_runway_pre_months                                62,7451
safety_runway_after_transaction_before_payout_months     60,0000
safety_runway_post_months                               21,3426
dynamicFlexSafetyRunwayBasis           pre_policy_annual_net_need
Aktionsvolumen                                       35.000 EUR
```

Drei Felder mit demselben Praefix, zwei verschiedene Nenner. Wer das Paar
`pre`/`post` als Vorher-Nachher liest, sieht einen Einbruch um 41 Monate,
ausgeloest angeblich durch eine Ueberschussinvestition von 35.000 EUR. Der
tatsaechliche Nachher-Wert steht unter dem dritten, laengeren Namen. Der
Sachverhalt ist in "Offene Risiken" und in der Referenz korrekt beschrieben;
die Feldnamen laden trotzdem zur falschen Lesart ein.

### Pruefdimensionen (Runde 3)

1. **Korrektheit:** Alle drei technischen Punkte der Runde 2 sind geschlossen
   und einzeln gegengemessen. Die Formelaenderung ist wertneutral belegt.
2. **Vertragstreue:** Die Herkunftstabelle trennt AK1, AK2, AK5 und AK7 bis
   AK10 als urspruenglichen Auftrag von den reviewbedingten Aenderungen an AK3,
   AK4 und AK6 sowie den neuen AK11 bis AK13. `proportional_market_value_v1`
   ist jetzt in Vertrag, technischer Referenz und Fachkonzept benannt, mit der
   ausdruecklichen Aussage, dass eine nichtproportionale Lotauswahl einen neuen
   Vertragsstand und keine aufgeweichte Toleranz verlangt.
3. **Fehlerbehandlung:** Unveraendert gegenueber Runde 2; die Nachbearbeitung
   hat keine neuen Abbruchpfade erzeugt.
4. **Seiteneffekte:** Die Messfixture ist byteseitig unveraendert, der
   Gesamthash des Fallsatzes ebenfalls. Der einzige Produktiveingriff dieser
   Runde ist die belegt wertneutrale Cap-Formel.
5. **Was koennte brechen?** Die Exportnamen aus CR17-15; die in Slice 18
   uebernommene Vertragsversionierung aus CR17-13.

### Findings-Lifecycle (Runde 3)

- CR17-9: erfuellt. Die Scope-Erweiterung ist als Nutzerentscheidung vom
  2026-08-04 in Kopf, Freigabestatus, Entscheidungstabelle und eigenem
  Abschnitt festgehalten. Kein Reviewgegenstand mehr.
- CR17-10: geschlossen. Herkunftstabelle vorhanden; die historischen
  Claude-Abschnitte sind unveraendert geblieben.
- CR17-11: geschlossen und gegengemessen (Probe 1).
- CR17-12: geschlossen. `git ls-files --eol` meldet
  `i/lf w/lf attr/text eol=lf`; die Warnung ist aus allen Git-Operationen
  verschwunden.
- CR17-13: als Restrisiko akzeptiert und in Slice 18 uebernommen; die
  Vertragsbezeichnung ist dokumentiert.
- CR17-1 bis CR17-8: bleiben geschlossen; die Fixturehashes belegen, dass die
  Nachbearbeitung nichts daran verschoben hat.
- Neu eroeffnet: CR17-14, CR17-15.
- Uebernommen und weiterhin offen: CR16-10 bis CR16-12, CR15-15, CR13-10,
  CR13-11, CR13-13, CR14-10 bis CR14-13, CR14-16, die Restrisiken der Slices 6
  bis 12 und die offene Slice-12-Finanzneutralitaet.

## Review-Ergebnis (Claude, Runde 3)

- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - CR17-14: Die Notfall-Cap-Formel wurde beim Schliessen eines Testbefunds
    mitgeaendert. Der Eingriff ist wertneutral belegt, gehoert aber unter
    "Abweichungen vom Plan" ausgewiesen, damit ein spaeterer Leser die
    Produktivaenderung nicht fuer eine reine Testergaenzung haelt.
  - CR17-15: Die drei `safety_runway_*`-Felder der Jahreszeile tragen zwei
    verschiedene Nenner. Der Sachverhalt ist dokumentiert, die Benennung bleibt
    irrefuehrend; ein additiv umbenanntes Feld gehoert in denselben Slice, der
    CR17-13 aufloest.
  - CR17-13: proportionale Gewinnrealisierung als harter Vertrag mit 1e-7
    Toleranz; vom Nutzer fuer Slice 17 akzeptiert und nach Slice 18 uebernommen.
  - Die wirtschaftliche Folgewirkung der niedrigeren Ziel-Liquiditaet ist
    gemessen und attribuiert, aber fachlich nicht extern beurteilt.
  - Die Runway-Zieldeckung vergleicht weiterhin Liquiditaet nach Auszahlung mit
    einem Ziel aus der Entscheidungsphase davor.
  - Der Slice belegt Codekonsistenz gegen den dokumentierten Vertrag; er belegt
    keine fachliche Richtigkeit der Runway-Zielhoehe als solcher.
  - Der exportfaehige Fingerprint und eine saubere Run-ID entstehen erst nach
    dem Commit auf einem sauberen Quellbaum; der Builder blockiert bis dahin
    korrekt fail-closed.
- Pre-Mortem: In drei Monaten wertet jemand die exportierten Jahreszeilen aus,
  in einer Tabelle, einem Bericht oder einem spaeteren Auswertungsmodul. Das
  Feldpaar `safety_runway_pre_months` und `safety_runway_post_months` wird als
  Vorher-Nachher gelesen, weil die Namen genau das nahelegen. In einem Jahr mit
  starker VPW-Kuerzung zeigt die Auswertung dann einen Einbruch von rund 63 auf
  rund 21 Monate und damit einen Liquiditaetszusammenbruch, den es nicht gab;
  der richtige Nachher-Wert steht unter einem dritten, deutlich laengeren Namen,
  den niemand ausgewaehlt hat. Weil die Zahlen aus der geprueften Engine stammen
  und alle Gates gruen sind, wird der Artefaktwert fuer echt gehalten und
  loest eine Gegenmassnahme aus, die der korrigierten Engine genau
  entgegenlaeuft.



## Review-Feedback von Claude (Runde 2)

**Pruefgegenstand:** der unkommittierte Arbeitsstand auf `54c055f` nach der
Nachbesserung, konkret `engine/core.mjs`,
`engine/transactions/transaction-action.mjs`,
`engine/transactions/transaction-utils.mjs`,
`engine/transactions/three-bucket-logic.mjs`, die beiden neuen Vertragsmodule
`types/planned-withdrawal-contract.js` und `types/planned-action-contract.js`,
`app/simulator/simulator-engine-direct.js`,
`app/simulator/simulator-tax-recompute.js`,
`app/simulator/simulator-year-result.js`,
`app/simulator/historical-backtest-export.js`, die neunzehn geaenderten
Testdateien, die neue Messfixture sowie die geaenderten Abschnitte dieses
Dokuments einschliesslich der Akzeptanzkriterien.

**Verifikationsbasis (eigene Messungen):**

- `npm test` im Wegwerf-Klon: 18.812/18.812 Assertions, 0 fehlgeschlagene
  Dateien, 1 separates Gate, 0 offene Handles. Die von Codex genannte Zahl ist
  exakt reproduziert.
- `npm run test:browser`: 28/28 Browser-Smokes bestanden.
- `npm run docs:evidence`: 69 MKT-, 55 FOR-, 17 MAP-Records; 11/7 Reviewscopes;
  10 Modellmatrixtermine; ohne Netzwerkzugriff.
- `git diff --check`: ohne Befund.
- Alle fokussierten Zahlen des Dokuments einzeln nachgemessen und deckungs-
  gleich: VPW 73, Guardrail 16, Simulation 75, Regime 77, Core-Negativvertraege
  192, Core-Steuer 84, 3-Bucket-Refill 32, Simulator-Steuer 77, ATH 10,
  Rebalancing 4, Quantisierung 19, Sweep 254, Charakterisierung 250,
  Monte Carlo 783, Demografie 28, Export 107, 3-Bucket-Final-Action 40.
- Fuenf Mutationsproben in einem eigenstaendigen Klon ausserhalb des
  Projektverzeichnisses. Der Arbeitsbaum des Projekts wurde nicht veraendert.

### Probe 1 -- Ist die Slice-10-Laufzeitbindung wieder wirksam? (CR17-1)

Dieselbe Verfaelschung wie in Runde 1, jetzt mit umgekehrtem Ergebnis:

```text
capeLegacyStepEffect.summaryEndWealthDelta  + 999999
d17Witness                                  ersetzt durch { falsified: true }
Runde 1                                     251/251 gruen
Runde 2                                     FAIL, zwei benannte Pfaddiffs:
                                            preservedCrossSliceRuntimeBinding
                                            .crossSliceOracleProjectionSha256
                                            .slice09To10DeltaLedgerSha256
```

Zusaetzlich wirft `UPDATE_BACKTEST_DATA_10=1` jetzt einen Fehler statt die
Archivdatei zu ueberschreiben; nur die lesende Diagnose bleibt.

### Probe 2 -- Faellt der Rohbedarfs-Rueckfall wirklich fail-closed? (CR17-6)

Der Verschluss ist doppelt gelegt. Wird nur die Pruefung in `core.mjs`
geoeffnet, bleiben die Negativvertraege 192/192 gruen -- weil
`transaction-action.mjs` denselben Vertragsbruch mit demselben Vertragsnamen
faengt. Erst wenn beide Stellen offen sind, faellt der Zeuge:

```text
nur core.mjs geoeffnet                       192/192 gruen
core.mjs und transaction-action.mjs offen    FAIL "missing planned annual
                                             withdrawal must fail instead of
                                             falling back to raw VPW need"
```

Der Zeuge pinnt nicht nur den Fehlertyp, sondern auch
`context.contract === 'planned_annual_withdrawal'` und den
Reconciliation-Status. Das ist die Absicherung, die in Runde 1 gefehlt hat.

### Probe 3 -- Haelt die Safety ihre kalibrierte Basis? (CR17-3)

`safetyRunwayMonths` wurde von `neuerBedarf` auf `plannedAnnualNetNeed`
zurueckgedreht:

```text
FAIL "Dynamic-Flex Safety must retain its calibrated pre-policy need basis
      after the surplus action"
```

Der Befund aus Runde 1 ist damit nicht nur behoben, sondern gegen eine
Rueckkehr gesichert. Der neue Test 19 ist der eigentliche Gegenzeuge: operativer
Runway ueber 27 Monaten, Safety-Reichweite unter 24 Monaten, Stufe bleibt 1,
falscher Erholungsstreak auf 0 zurueckgesetzt, Risikostreak 1. Genau die
Konstellation, die ich im Pre-Mortem der Runde 1 beschrieben habe, ist jetzt
ein benannter Testfall.

### Probe 4 -- Faellt eine Cash-Ueberbuchung statt geklammert zu werden? (CR17-8)

Ebenfalls doppelt gelegt. Wird nur die Nullklammer in Schritt 10 wieder
eingesetzt, bleiben die Negativvertraege gruen, weil `resolvePlannedAction`
bereits `cash_source_overbooked` meldet. Erst mit beiden geoeffneten Grenzen:

```text
FAIL "overbooked cash source must fail instead of being normalized or clamped"
```

### Probe 5 -- Ist der Baer-Krisenzweig noch gedeckt? (CR17-11)

Meine Vermutung, die Umschreibung von Test 2 habe den Notfall-Cap-Arm
ersatzlos verloren, ist nur zur Haelfte richtig und wird entsprechend
eingeschraenkt dokumentiert. `isCriticalLiquidityBear` wurde auf `false`
festgesetzt:

```text
tests/liquidity-guardrail.test.mjs           16/16 gruen
npm test gesamt                              3 fehlgeschlagene Assertions
davon benannt                                keine; alle drei erscheinen als
                                             Pfaddiffs der Slice-17-Backtest-
                                             messung
```

Der Zweig ist also noch gedeckt, aber nur ueber die aggregierte
Integrationsmessung. Der frueher vorhandene zweite Arm des Unit-Tests bei
46.000 EUR, der Standard-Cap gegen Notfall-Cap gestellt hat, existiert nicht
mehr.

### Pruefdimensionen (Runde 2)

1. **Korrektheit:** Die acht Findings der Runde 1 sind nicht nur adressiert,
   sondern jeweils gegen die Wiederkehr gemessen (Proben 1 bis 4). Der
   Reconciliation-Vertrag deckt Missing, Invalid, Conflict, `null`, NaN,
   Infinity und Vorzeichen ab. Nicht geprueft bleibt das Verhalten bei
   Stammdaten, die in sich konsistent, fachlich aber falsch sind -- das
   benennt das Dokument selbst korrekt als getrennte Vertrauensgrenze.
2. **Vertragstreue:** `calculateTargetLiquidityDetails` nimmt jetzt den
   Jahresbetrag direkt und bleibt fuer Objektaufrufer kompatibel; der
   Objektpfad ist in `regime-signals` weiterhin bezeugt. Die drei
   richtungsabhaengigen Gates sind entfernt, was sich exakt in den
   Assertionzahlen niederschlaegt: Charakterisierung 251 auf 250, Monte Carlo
   784 auf 783, Export 108 auf 107. Die verbliebenen Aussagen zu
   `changedProjectionCount` und `unchanged` lesen die byte-gepinnte Archivdatei
   und nicht die Laufzeit; sie koennen eine spaetere Wiederherstellung nicht
   mehr rot faerben.
3. **Fehlerbehandlung:** Der neue Vertrag weist kaputte Aktionsobjekte sauber
   ab statt zu werfen; `null`, `undefined`, Zahl, String und Array liefern
   alle `action_not_plain_object`. Der Preis ist eine deutlich groessere
   Menge harter Abbruchpfade im Produktivcode (CR17-9, CR17-13).
4. **Seiteneffekte:** Der Slice greift jetzt in Transaktionsvertrag,
   3-Bucket-Umschreibung, direkte Simulatorgrenze und Steuerabrechnung ein.
   Das ist erheblich mehr als die Runway-Basis und war so nicht beauftragt
   (CR17-9). `slice13Integration` wird ausserhalb des Diagnosezweigs berechnet
   und nicht mehr verwendet.
5. **Was koennte brechen?** Ein Produktivfall, dessen gespeicherte
   Tranchenstammdaten die proportionale Gewinnannahme des Steuervertrags nicht
   erfuellen (CR17-13); ein spaeterer Eingriff in den Baer-Krisenzweig, der nur
   noch als Hashdiff auffaellt (CR17-11).

### Findings-Lifecycle (Runde 2)

- CR17-1: geschlossen. Laufzeitbindung wiederhergestellt und gegengemessen
  (Probe 1); der schreibende Updatepfad ist blockiert.
- CR17-2: geschlossen. Alle Bestandsfaelle tragen wieder ein reconciliertes
  Produktiv-Shape, `spending: {}` scheitert benannt, der Legacy-Zweig hat einen
  eigenen Zeugen mit Diagnosemarker. Teilrestrisiko in CR17-11 ueberfuehrt.
- CR17-3: geschlossen. Safety auf der kalibrierten Rohbedarfsbasis, gesichert
  durch Probe 3 und den neuen Gegenzeugen Test 19.
- CR17-4: geschlossen. Keine erfundene Zerlegung mehr; Objektpfad bleibt
  bezeugt.
- CR17-5: geschlossen. Alle drei Richtungsbehauptungen entfernt.
- CR17-6: geschlossen. Fail-closed doppelt gelegt, Vertragsname und Status
  gepinnt (Probe 2).
- CR17-7: geschlossen. Ein Resolver in Core, direktem Simulator und
  Jahresresultat.
- CR17-8: geschlossen. Ueberbuchung faellt benannt (Probe 4).
- Neu eroeffnet: CR17-9 bis CR17-13.
- Uebernommen und weiterhin offen: CR16-10 bis CR16-12, CR15-15, CR13-10,
  CR13-11, CR13-13, CR14-10 bis CR14-13, CR14-16 sowie die Restrisiken der
  Slices 6 bis 12 und die offene Slice-12-Finanzneutralitaet.

## Review-Ergebnis (Claude, Runde 2)

- Status: freigegeben unter einer Auflage
- Blocker: keine. CR17-1 bis CR17-8 sind geschlossen und jeweils gegen die
  Wiederkehr gemessen.
- Auflage vor beziehungsweise mit dem Commit:
  - CR17-9: Der Nutzer muss die Scope-Erweiterung ausdruecklich entscheiden.
    Beauftragt war ein Bugfix der Runway-Basis; geliefert wird zusaetzlich eine
    engineweite fail-closed Vertragsschicht aus `PlannedActionContractV1`,
    `SimulatorExecutedTaxContractV1` und der zentralen Steuerrueckrechnung.
    Beides liegt in einer einzigen unkommittierten Aenderung und ist nicht
    getrennt zuruecknehmbar. Entweder wird die Erweiterung ausdruecklich
    mitbeauftragt, oder Runway-Fix und Vertragsschicht werden in zwei Slices
    und zwei Commits getrennt.
- Restrisiken:
  - CR17-10: Die Akzeptanzkriterien wurden nach der Umsetzung geaendert. AK3
    hat die Dynamic-Flex-Safety verloren, AK4 wurde inhaltlich umgedreht, AK6
    verschaerft, AK11 bis AK13 kamen hinzu. Ohne gekennzeichnete Aenderungs-
    historie ist spaeter nicht mehr unterscheidbar, welche Kriterien der
    urspruengliche Auftrag waren und welche aus dem Review entstanden sind.
  - CR17-11: Der Baer-Krisenzweig faellt nur noch als Hashdiff der
    Integrationsmessung auf, nicht mehr als benannter Unit-Zeuge.
  - CR17-12: Gemischte Zeilenenden in einer Produktivdatei; vor dem Commit zu
    bereinigen, damit Arbeitskopie und Blob uebereinstimmen.
  - CR17-13: Der Steuervertrag schreibt proportionale Gewinnrealisierung fest.
    Eine spaetere nicht proportionale Lotauswahl wuerde als Vertragsbruch
    abgewiesen statt als Policyaenderung erkannt.
  - Die wirtschaftliche Folgewirkung der niedrigeren Ziel-Liquiditaet ist
    gemessen und attribuiert, aber fachlich nicht extern beurteilt.
  - Die Runway-Zieldeckung vergleicht weiterhin Liquiditaet nach Auszahlung mit
    einem Ziel aus der Entscheidungsphase davor; die Basis ist jetzt dieselbe,
    die Zeitphase bewusst nicht.
  - Der Slice belegt Codekonsistenz gegen den dokumentierten Vertrag; er belegt
    keine fachliche Richtigkeit der Runway-Zielhoehe als solcher.
- Pre-Mortem: In drei Monaten laedt ein Nutzer ein Profil, dessen gespeicherte
  Tranchenstammdaten nach einem Import oder einer Profilzusammenfuehrung in sich
  konsistent sind, aber die proportionale Gewinnannahme des Aktionsvertrags
  nicht erfuellen. Frueher haette die Engine daraus eine leicht abweichende
  Steuer gerechnet und weitergerechnet; jetzt greift
  `source_tax_inventory_mismatch` mit 1e-7 Toleranz, das Jahr endet im
  `technical_error`, und die Simulation bricht ab. Weil Slice 17 als
  Runway-Bugfix dokumentiert ist, sucht niemand im Aktionsvertrag, und die
  Fehlermeldung nennt Lot und Erwartungswert, aber nicht die Herkunft der
  Stammdaten. Die Vertragsschicht, die den Fix absichern sollte, wird damit
  selbst zur Ausfallursache.

## Nutzerentscheidung und Nachbearbeitung nach Claude-Runde 2

**Datum:** 2026-08-04

- CR17-9 ist erfuellt: Der Nutzer hat die Erweiterung von fuenf auf zehn
  Produktivdateien um `PlannedActionContractV1`,
  `SimulatorExecutedTaxContractV1` und die zentrale Steuerrueckrechnung als
  gemeinsamen Slice und spaeteren gemeinsamen Commit ausdruecklich genehmigt.
- CR17-10 ist technisch nachgezogen: Eine Herkunftstabelle trennt die
  urspruenglichen Akzeptanzkriterien von Aenderungen an AK3, AK4 und AK6 sowie
  den reviewbedingt neuen AK11 bis AK13. Die historische Claude-Dokumentation
  bleibt unveraendert.
- CR17-11 ist technisch nachgezogen: Ein benanntes Unit-Paar prueft den
  `isCriticalLiquidityBear`-Grenzwechsel bei exakt 75 Prozent Zieldeckung und
  einen Euro darunter. Standard- und Notfall-Cap sind einzeln in Euro gepinnt.
- CR17-12 ist technisch nachgezogen: `three-bucket-logic.mjs` wurde rein
  mechanisch auf LF normalisiert; `git ls-files --eol` meldet fuer Index,
  Arbeitskopie und Attribut jeweils LF.
- CR17-13 bleibt offen: Der Nutzer akzeptiert
  `proportional_market_value_v1` fuer Slice 17 als dokumentiertes Restrisiko.
  Slice 18 ist im Hauptplan fuer Vertragsversionierung, toleranzstabile
  Reconciliation, Importprovenienz und eine kuenftige nichtproportionale
  Lotauswahl vorgemerkt; seine Umsetzung hat nicht begonnen.
- Die Pflichtgates wurden auf dem nachbearbeiteten Stand erneut ausgefuehrt:
  18.822/18.822 Assertions, 28/28 Browser-Smokes, Engine-Build,
  Dokumentationsevidenz, EOL- und Diff-Pruefung sind gruen. Codex erteilt keine
  eigene Freigabe und erstellt keinen Commit oder Push.

## Review-Feedback von Claude (Runde 1)

**Pruefgegenstand:** der unkommittierte Arbeitsstand auf `54c055f`, konkret
`engine/core.mjs`, `engine/transactions/transaction-action.mjs`,
`engine/transactions/transaction-utils.mjs`,
`app/simulator/simulator-year-result.js`,
`app/simulator/historical-backtest-export.js`, die zehn geaenderten Testdateien,
`tests/fixtures/liquidity-runway-basis-slice-17-measurement-v1.json` sowie
dieses Dokument. `RuheStandSuite.exe` gehoert dem Nutzer, liegt ausserhalb des
Slice und wurde nicht gelesen.

**Verifikationsbasis (eigene Messungen):**

- `npm test` im Wegwerf-Klon: 18.653/18.653 Assertions, 0 fehlgeschlagene
  Dateien, 1 separates Gate, 0 offene Handles. Die von Codex genannte Zahl ist
  reproduziert.
- `npm run test:browser`: 28/28 Browser-Smokes bestanden.
- `npm run docs:evidence`: 69 MKT-, 55 FOR-, 17 MAP-Records; 11/7 Reviewscopes;
  10 Modellmatrixtermine; ohne Netzwerkzugriff.
- `git diff --check`: ohne Befund.
- Fokussiert im Klon: Charakterisierung 251/251, VPW/Dynamic Flex 65/65,
  Simulation 34/34.
- Sechs Mutationsproben in einem eigenstaendigen Klon ausserhalb des
  Projektverzeichnisses. Der Arbeitsbaum des Projekts wurde nicht veraendert.

### Probe 1 -- Was passiert, wenn der Guardrail ein Spending-Ergebnis sieht?

`getBaseParams()` in `tests/liquidity-guardrail.test.mjs` wurde von
`spending: { monatlicheEntnahme: 2000 }` auf `spending: {}` umgestellt. Damit
laufen alle vier Bestandsfaelle ueber den Legacy-Rueckfall. Setzt man das
Spending-Ergebnis zurueck, also auf den Zustand, den der Produktivpfad immer
liefert, bricht der dritte Fall ab:

```text
Fall 1 Fail-Safe Trigger (Normal Market)      weiterhin gruen
Fall 2 Fail-Safe Trigger (Guardrail)          weiterhin gruen
Fall 3 Puffer-Schutz / Cap                    TypeError: Cannot read properties
                                              of undefined (reading 'liquiditaet')
Gesamt                                        4 Assertions, dann Abbruch
```

Der dritte Fall erzeugt mit Spending-Ergebnis gar keine Transaktion mehr. Das
ist eine echte Verhaltensaenderung des Produktivpfads, die durch den Wechsel
der gemeinsamen Fixture auf den Legacy-Zweig aus der Messung verschwindet. Die
Umstellung ist weder unter "Abweichungen vom Plan" noch unter "Offene Risiken"
ausgewiesen. Siehe CR17-2.

### Probe 2 -- Ist die Floor-/Flex-Zerlegung wirksam?

`effectiveBedarf` wurde auf `{ floor: 0, flex: effectiveAnnualNetNeed }`
gesetzt, die Summe also unveraendert gelassen:

```text
tests/vpw-dynamic-flex.test.mjs                65/65 gruen
tests/simulation.test.mjs                      34/34 gruen
tests/simulator-backtest-characterization      251/251 gruen
```

`calculateTargetLiquidityDetails` summiert beide Felder unmittelbar wieder. Die
Berechnung von `effectiveFloorNeed` ueber `Math.min`/`Math.max` ist damit ohne
Wirkung. Siehe CR17-4.

### Proben 3 und 4 -- Ist die Attributionsevidenz noch gebunden?

Diese Hypothese hat sich nicht bestaetigt und wird ausdruecklich als widerlegt
dokumentiert. Die im Slice-13-Vergleich frueher mitgepruefte `attributionEvidence`
ist zwar nicht mehr Teil eines Laufzeitvergleichs, die neun Dateien sind aber
einzeln byte-gepinnt. Je ein zusaetzliches Byte:

```text
demography-care-survivor-backtest-delta-v1.json  FAIL "Immutable Slice-07 delta
                                                 evidence must remain byte-identical"
liquidity-runway-slice-08-measurement-v1.json    FAIL "Immutable Slice-08 measurement
                                                 must remain byte-identical"
```

### Probe 5 -- Ist die Slice-10-Backtestmessung noch an die Laufzeit gebunden?

Sie ist es nicht. `slice10Measurement` wird weiterhin vollstaendig berechnet,
danach aber mit nichts mehr verglichen; an die Stelle des frueheren
`collectDiffs` gegen die Fixture tritt allein der SHA-256 der Archivdatei. Zwei
gezielte Verfaelschungen im Messobjekt selbst:

```text
capeLegacyStepEffect.summaryEndWealthDelta  + 999999
slice09To10DeltaLedger.d17Witness           ersetzt durch { falsified: true }
Ergebnis                                    251/251 gruen
```

Damit sind die `crossSliceOracleProjection` und das vollstaendige
Slice-09-nach-10-Finanzdeltajournal einschliesslich des D-17-Zeugen ohne
Sollwert. Beide sind nicht aus `actual` ableitbar, weil sie aus getrennten
Vergleichsarmen stammen; der in der neuen Slice-17-Messung gepinnte
`targetActualSha256` deckt sie nicht ab. Die Aussage des Dokuments, die alten
Fixtures wuerden "weiterhin per SHA-256 geprueft", trifft auf die Archivdatei
zu und nicht auf den Code. Fuer die Monte-Carlo- und Demografiepfade gilt der
Befund nicht: dort bindet die neue Fixture die Laufzeithashes vollstaendig
weiter. Siehe CR17-1.

### Probe 6 -- Wie stark wirkt die neue Basis auf die Safety-Bremse?

`_updateVpwSafetyState` entscheidet in `engine/core.mjs` bei
`runwayMonate < minRunwayMonths` auf Krise und laesst erst ab
`runwayMonate >= minRunwayMonths + Headroom` wieder herunterstufen. Das Signal
verwendet seit Slice 17 den gekuerzten Nenner. Wird allein dieses eine Signal
auf den Rohbedarf zurueckgestellt:

```text
targetActualSha256 erwartet cbaa7738...  gemessen b2433a40...
Abbruch nach 208 Assertions, genau eine gemeldete Abweichung
```

Der Fallsatz aendert sich also messbar, das heisst die Basisumstellung der
Bremse ist finanzwirksam und nicht nur diagnostisch. Zwei Folgerungen: Erstens
verbessert eine Kuerzung selbst den Indikator, an dem die Notwendigkeit
weiterer Kuerzungen abgelesen wird -- der Nenner faellt genau dann, wenn der
Planner kuerzt. Zweitens wurden `hardMinimumMonths` und der Headroom gegen den
ungekuerzten Nenner kalibriert; eine Nachkalibrierung schliesst der Slice
ausdruecklich aus. Der Vorgang hat keinen eigenen Zeugen; die einzige
Absicherung ist ein undurchsichtiger Gesamthash. Die Aussage des Dokuments, der
Slice fuehre "keine neue Entnahme- oder Anlagepolicy ein", ist mit dem im selben
Dokument gemessenen Entnahmedelta von -1.562,20 EUR nicht vereinbar. Siehe
CR17-3.

### Pruefdimensionen (Runde 1)

1. **Korrektheit:** Der Kern der Korrektur ist belegt. Der synthetische Zeuge in
   `vpw-dynamic-flex.test.mjs` trennt 430.124,75 EUR Rohbedarf sauber von
   153.000 EUR final geplanter Entnahme und pinnt Ziel, Ueberschuss und
   Post-Transaktions-Runway einzeln. Nicht geprueft sind der Ansparfall ohne
   Spending-Entscheidung und jede Konstellation, in der `endgueltigeEntnahme`
   und `monatlicheEntnahme` beide fehlen.
2. **Vertragstreue:** Der Exportvertrag ist korrekt auf
   `HistoricalBacktestInputSemanticsV2` gehoben und der neue Fingerprint
   gepinnt. Die stillen Semantikaenderungen liegen woanders: die
   Guardrail-Bestandsfaelle wechseln den Zweig (CR17-2) und die Safety-Bremse
   wechselt die Bezugsgroesse (CR17-3).
3. **Fehlerbehandlung:** Alle neuen Pfade sind gegen `NaN` und negative Werte
   abgesichert. Der Rueckfall auf `neuerBedarf` ist jedoch stumm und stellt
   genau den korrigierten Fehler wieder her (CR17-6); die Nullklammer auf
   `liqNachTransaktion` verdeckt einen Abfluss oberhalb der verfuegbaren
   Liquiditaet (CR17-8).
4. **Seiteneffekte:** Der Eingriff wirkt auf Backtest, Monte Carlo, Sweep,
   Auto-Optimize, Demografie und Browserpfad. Alle Deltas sind attribuiert und
   die alten Grenzen sind nicht ueberschrieben -- mit der Ausnahme, dass die
   Slice-10-Backtestgrenze dabei ihre Laufzeitbindung verloren hat (CR17-1).
5. **Was koennte brechen?** Die Rueckkopplung aus CR17-3 im Drawdown; ein
   direkter TransactionEngine-Aufrufer, der unbemerkt auf dem Legacy-Zweig
   landet; eine spaetere Kompensation, die an den drei umgedrehten Gates aus
   CR17-5 scheitert.

### Findings-Lifecycle (Runde 1)

- Neu eroeffnet: CR17-1 bis CR17-8.
- Uebernommen und weiterhin offen: CR16-10 bis CR16-12, CR15-15, CR13-10,
  CR13-11, CR13-13, CR14-10 bis CR14-13, CR14-16 sowie die Restrisiken der
  Slices 6 bis 12.
- Die offene Slice-12-Finanzneutralitaet
  (`not_demonstrated_against_slice_12_commit`) bleibt unveraendert offen.
- S17-EXPORT-01 ist als fail-closed korrekt; der Builder blockiert im dirty
  Baum nachvollziehbar mit `HISTORICAL_EXPORT_SOURCE_TREE_DIRTY`.

## Review-Ergebnis (Claude, Runde 1)

- Status: blockiert
- Blocker:
  - CR17-1: Die Slice-10-Backtestmessung ist nur noch als Archivdatei gepinnt.
    `crossSliceOracleProjection` und das Slice-09-nach-10-Finanzdeltajournal
    bleiben bei freier Verfaelschung gruen (Probe 5). Erforderlich ist entweder
    eine neue versionierte Sollgrenze fuer beide Groessen oder eine
    ausdrueckliche, im Dokument benannte Ruecknahme wie bei CR16-8.
  - CR17-2: Die vier Bestands-Guardrailfaelle duerfen nicht ueber `spending: {}`
    auf den Legacy-Zweig verschoben werden. Der Produktivzweig veraendert in
    Fall 3 das Ergebnis vollstaendig (Probe 1). Erforderlich ist die
    Wiederherstellung der Faelle auf dem Produktivzweig mit neu hergeleiteten
    Sollwerten; der Legacy-Zweig gehoert in einen eigenen Fall.
  - CR17-3: Die Basisumstellung der Dynamic-Flex-Safety ist finanzwirksam
    (Probe 6), ohne Zeugen und ohne Aussage zu den weiterhin gegen den
    Rohbedarf kalibrierten Schwellen. Erforderlich ist ein Zeuge, der das
    Stufenverhalten unter starker Kuerzung festhaelt, sowie eine fachliche
    Feststellung zu `hardMinimumMonths` und Headroom. Die Aussage, der Slice
    fuehre keine neue Entnahmepolicy ein, ist entsprechend zu praezisieren.
- Restrisiken:
  - CR17-4: wirkungslose Floor-/Flex-Zerlegung, die spaeteren Lesern eine
    Bedeutung suggeriert, die der Verbraucher nicht kennt.
  - CR17-5: drei Gates fordern eine Abweichung statt einer Gleichheit.
  - CR17-6: stummer Rueckfall auf den Rohbedarf ohne Marker und ohne Test.
  - CR17-7: entgegengesetzte Vorrangreihenfolgen zwischen `core.mjs` und
    `simulator-year-result.js` fuer dieselbe kanonische Groesse.
  - CR17-8: Nullklammer auf `liqNachTransaktion`.
  - Die Runway-Zieldeckung vergleicht weiterhin die Liquiditaet nach Auszahlung
    mit einem Ziel aus der Entscheidungsphase vor der Auszahlung.
  - Die wirtschaftliche Folgewirkung -- im Nutzerreplay rund 44 Prozent weniger
    Endliquiditaet bei rund 51 Prozent mehr Aktienvermoegen -- ist gemessen,
    aber fachlich nicht extern beurteilt.
  - Der Slice belegt Codekonsistenz gegen den dokumentierten Vertrag; er belegt
    keine fachliche Richtigkeit der Runway-Zielhoehe als solcher.
- Pre-Mortem: In drei Monaten laeuft ein Nutzer in einen laengeren Drawdown. Der
  SpendingPlanner kuerzt, wie vorgesehen, kraeftig. Weil der Runway seit Slice 17
  gegen die gekuerzte Entnahme gerechnet wird, springt die gemeldete Reichweite
  ueber `hardMinimumMonths` plus Headroom, obwohl das Depot faellt: die
  Dynamic-Flex-Safety stuft herunter statt herauf. Im Folgejahr oeffnet der Flex
  wieder, das Liquiditaetsziel steigt mit der hoeheren Planung, und die Engine
  verkauft in den Drawdown hinein. Der Vorgang bleibt unsichtbar, weil kein Gate
  das Stufenverhalten unter Kuerzung festhaelt und alle Ergebnisgrenzen des
  Slice gruen sind; gesucht wird die Ursache in VPW oder den Guardrails, nicht
  im Nenner des Runway-Signals.

## Review-Antworten von Codex (Runde 1)

**Status der Antwort:** Die Findings CR17-1 bis CR17-8 wurden als technische
Nachbesserungsanforderungen angenommen. Die nachstehenden Punkte beschreiben
den aktuellen Implementierungsstand, stellen aber keine Freigabe oder
Schliessung durch Codex dar.

1. **CR17-1 -- Laufzeitbindung:** Die unveraenderte Slice-10-Datei bleibt unter
   SHA-256 `13d6f6cff7aa3e0f6ee109601f8951620c9f908505bd109513f8d8487f491eb5`
   gepinnt. Die neue Slice-17-Grenze bindet zusaetzlich den lebenden
   `crossSliceOracleProjection` unter
   `efff8eb80137348c4566ed870acbfb67a9781f2894cadd82f886ae283c810142`
   und das vollstaendige Slice-09-nach-10-Deltaledger unter
   `30a2c212ae75c72e974132b16f617f7fd6e03c1b1fd040f87918bbb3bba4b621`.
   `UPDATE_BACKTEST_DATA_10=1` wird nun abgewiesen; nur eine lesende
   `PRINT_BACKTEST_DATA_10=1`-Diagnose bleibt moeglich.
2. **CR17-2 -- Produktiv-Guardrails:** Alle Bestandsfaelle besitzen wieder ein
   reconciliertes SpendingPlanner-Shape. Die geaenderten Sollwerte wurden aus
   der finalen Entnahme hergeleitet. Nur ein eigener Test ohne Property
   `spending` nimmt den Legacy-Zweig; `spending: {}` wirft einen benannten
   `planned_annual_withdrawal`-Fehler.
3. **CR17-3 -- Safety-Rueckkopplung:** Die Dynamic-Flex-Safety verwendet erneut
   `cashAfterTransaction / (prePolicyAnnualNetNeed / 12)`. Im Gegenzeugen liegt
   der operative Runway bei 60 Monaten, die Safety-Reichweite bei
   21,342645 Monaten. Die Safety bleibt in Stufe 1, setzt den falschen
   Erholungsstreak zurueck und markiert das Jahr als Risiko. Eine
   Schwellenneukalibrierung ist nicht erforderlich, weil die kalibrierte Basis
   restauriert wurde.
4. **CR17-4 -- wirkungslose Zerlegung:** `calculateTargetLiquidityDetails()`
   akzeptiert im Entnahmepfad direkt den finalen Jahresbetrag. Objektbasierte
   Aufrufer bleiben kompatibel; der Core erfindet keine Floor-/Flex-Komponenten.
5. **CR17-5 -- umgedrehte Gates:** Die drei Richtungsbehauptungen wurden
   entfernt. Backtest, Monte Carlo und Export vergleichen nun exakte
   versionierte Sollobjekte beziehungsweise Fingerprints; eine spaetere echte
   Wiederherstellung kann nicht allein wegen fehlender Abweichung rot werden.
6. **CR17-6/CR17-7 -- ein Vertrag:**
   `types/planned-withdrawal-contract.js` reconciliert Jahresdetail,
   Monatswert mal 12 und gegebenen Jahresplan innerhalb 0,01 EUR. Missing,
   negative, nicht endliche, `null`- und widerspruechliche Werte scheitern an
   Produktgrenzen. Core, direkter Simulator und Jahresresultat verwenden
   denselben Resolver; der direkte Simulator ueberfuehrt einen ungueltigen
   injizierten Shape in `SIM_ENGINE_RESULT_SHAPE_INVALID` und restauriert die
   Portfolio-Grenze.
7. **CR17-8 -- Cash-Vertrag:** Der Core rechnet Zufluss aus
   `verwendungen.liquiditaet` minus Cash-Quellen. Er validiert den rohen
   Verwendungscontainer vor jeder Normalisierung, reconciliert Cash-Quellen
   gegen Asset-Verwendungen und lehnt NaN, Infinity, String, `null`,
   `undefined`, negative Werte und Ueberbuchung als
   `FinancialCalculationError` ab.

Die neuen Negativzeugen wurden jeweils gegen den vorherigen Stand rot
reproduziert. Der vertrauliche 2000-2025-Replay ist nach der Nachbesserung
zweimal deterministisch und bilanziell geschlossen; seine Rohdaten werden
nicht persistiert. Claude beziehungsweise Gemini muessen Findings,
Wirtschaftswirkung und Restrisiken erneut extern bewerten.

## Nachlaufende adversariale Nachbesserung

Nach den acht dokumentierten Claude-Findings wurde die Korrektur nochmals gegen
missbraeuchliche Engine-Adapter, unvollstaendige Aktionsobjekte, falsche
Bestandsbehauptungen und divergierende Steuerphasen geprueft. Diese technische
Pruefung ist keine Freigabe und ersetzt das angeforderte Re-Review durch Claude
oder Gemini nicht.

Die zusaetzlichen Blocker lagen nicht in der Zielhoehe selbst, sondern an ihren
Ausfuehrungsgrenzen: Eine formal ausgeglichene Aktion konnte bislang eine
wirtschaftlich unmoegliche Quelle behaupten; ein Adapter konnte rohe
Steuerdetails liefern, die nicht zur zentralen Jahresabrechnung passten; eine
3-Bucket-Umschreibung konnte nach der ersten Pruefung erneut Inkonsistenz
erzeugen. Ausserdem waren eingefrorene oder getter-behaftete Aktionsobjekte und
die semantische Trennung von Plansteuer und finaler Jahressteuer nicht
lueckenlos abgedeckt.

Die Nachbesserung fuehrt deshalb einen gemeinsamen `PlannedActionContractV1`,
eine Validierung vor und nach jeder 3-Bucket-Umschreibung, die exakte Bindung
roher Steuerdaten an `settleTaxYear` sowie den nachgelagerten
`SimulatorExecutedTaxContractV1` ein. Negative Zeugen decken unter anderem
Phantom- und Doppelquellen, Bestandsueberschreitungen, falsche Lot-Steuern,
source-less Inflows, hostile Getter, eingefrorene Aktionen und manipulierte
Verlustvortraege ab.

Ein abschliessender technischer Gegenzeugenlauf ueber die echte EngineAPI im
3-Bucket-Bad-Year-Pfad blieb bilanziell geschlossen: finale Steuer und
Verlustvortrag entsprachen der zentralen Abrechnung, Cash-Refund,
`plannedActionFlow` und Ausfuehrungs-Steuervertrag reconcilierten und der
`FlowDelta` blieb null. Als getrenntes vorbestehendes Restrisiko wurde dabei
die moegliche Doppelzaehlung im reinen Diagnosefeld `bondSaleAmount`
festgehalten; sie veraendert im Zeugen weder Portfolio noch Cash und wird wegen
des fehlenden 3-Bucket-Bezugs des Nutzerfalls nicht still in diesen Slice
hineingezogen.

Der finale rein lesende Re-Audit fand keine weitere reproduzierbare materielle
Luecke. Er pruefte ausdruecklich die vorzeichenbehaftete Steueroekonomie, die
einheitliche Epsilon-Normalisierung von `1e-7`, kollisionsfreie Tuple-Lot-Keys,
hostile Getter beziehungsweise eingefrorene Aktionen sowie Scope-, Gate- und
Freigabeaussagen dieses Dokuments. Als groesstes verbleibendes Vertragsrisiko
bleibt die notwendige Vertrauensgrenze zu bereits gespeicherten kanonischen
Steuerstammdaten; die finale Freigabe bleibt davon unabhaengig extern.

Dieser technische Re-Audit fand zeitlich **vor** Claude-Runde 2 statt. Seine
Aussage zu Scope-, Gate- und Freigabekonsistenz war auf die technische
Vertragspruefung begrenzt und wurde durch die spaeteren Governance-,
Unit-Zeugen-, EOL- und Contract-Evolution-Findings CR17-9 bis CR17-13
praezisiert. CR17-9 ist inzwischen durch den Nutzer entschieden, CR17-10 bis
CR17-12 sind technisch nachgezogen und CR17-13 bleibt sichtbar in Slice 18
offen.
