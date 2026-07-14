# P0-Bugfix: Konsistente Profilverbund-Handlungsanweisungen

**Geplanter Feature-Branch:** `codex/profilverbund-action-consistency`  
**GitHub-Status:** Branch noch nicht angelegt oder veroeffentlicht  
**Status:** Entwurf nach kritischem Review; erneutes Gemini-Review und Freigabe ausstehend
**Prioritaet:** P0  
**Ursprung:** Regression aus `SLICE_BALANCE_HARDENING_01_PROFILVERBUND_ALLOCATION.md`  
**Umfang:** ein 1-basiertes Umsetzungspaket (`Paket 1`)

## Ziel

Die Handlungsanweisung des Profilverbunds muss dieselbe fachliche Entscheidung abbilden wie der einmalige Haushaltslauf. Die nachgelagerte Profilzuordnung darf nur bestimmen, welches Profil die bereits feststehende Haushaltsaktion finanziert bzw. ausfuehrt. Sie darf keine neuen, gegenlaeufigen Kauf- oder Verkaufsziele erzeugen.

Nach dem Bugfix stimmen insbesondere folgende Ausgaben wieder miteinander ueberein:

- Haushalts-Ziel-Liquiditaet;
- Liquiditaetsdeckung vor und nach der finalen Aktion;
- Plan nach Zweck;
- profilbezogene Quellen und Verwendungen;
- Steuerbetrag und Nettoerloes;
- tatsaechliche Netto-Liquiditaetsaenderung der angezeigten Handlungsanweisung.

## Sicherheitsklassifikation

P0 ist gerechtfertigt, weil die aktuelle Anweisung reale Finanztransaktionen in die falsche Richtung empfehlen kann. In einem beobachteten Profilverbund lag die Haushaltsliquiditaet bereits unter dem Ziel. Die zusammengefuehrte Aktion empfahl trotzdem gleichzeitig einen groesseren Aktienkauf aus Liquiditaet und einen kleineren Aktienverkauf zur Liquiditaetsbildung. Netto waere die Zieldeckung weiter gesunken.

Die realen Profilnamen und exakten Finanzwerte werden aus Datenschutzgruenden weder in diesem Dokument noch in Test-Fixtures uebernommen.

## Fehlerbild

Der Haushaltslauf berechnet eine plausible Ziel-Liquiditaet und eine dazu passende Haushaltsaktion. Danach passiert aktuell Folgendes:

1. Der finale Haushalts-Entnahmebetrag wird auf Profile verteilt.
2. Fuer jedes Profil wird eine weitere Engine-Simulation gestartet.
3. Der zugeteilte Finanzierungsanteil wird technisch als `floorBedarf` gesetzt; `flexBedarf`, Einkommen, Dynamic Flex und weitere Spending-Parameter werden auf null gesetzt.
4. Jede Profil-Engine berechnet aus diesem kuenstlichen Input eine eigene Ziel-Liquiditaet und eine eigene Rebalancing-Aktion.
5. Die Profilaktionen werden ungeprueft addiert und ersetzen die urspruengliche Haushaltsaktion.
6. Bereits berechnete Haushalts-KPIs werden nach dem Ersetzen der Aktion nicht konsistent neu berechnet.

Dadurch koennen Profile gegeneinander handeln: Ein Profil verkauft Aktien zur Liquiditaetsbildung, waehrend ein anderes Profil gleichzeitig Liquiditaet in Aktien umschichtet. Die Summe dieser Aktionen kann dem Haushaltsziel widersprechen.

## Technische Ursache

### 1. Profil-Engines entscheiden erneut ueber Transaktionszwecke

`buildProfileFundingInput()` uebergibt den Finanzierungsanteil als neuen Floor-Bedarf. Damit ist zwar eine zweite Dynamic-Flex-Entscheidung blockiert, aber nicht eine zweite Ziel-Liquiditaets- und Rebalancing-Entscheidung.

Betroffene Stelle:

- `app/balance/balance-main-profilverbund.js`

### 2. Profilaktionen ersetzen die Haushaltsaktion

`postprocessBalanceAction()` ersetzt `modelResult.ui.action` nach dem Haushaltslauf durch `mergeProfilverbundActions(profilverbundRuns)`.

Betroffene Stelle:

- `app/balance/balance-action-postprocessor.js`

### 3. Der Merge besitzt keine Haushaltsinvarianten

`mergeProfilverbundActions()` summiert Quellen, Verwendungen, Steuern und Nettoerloese. Der Merge prueft nicht:

- ob die Netto-Liquiditaetsaenderung der Haushaltsaktion entspricht;
- ob gleichzeitig derselbe Assettyp gekauft und verkauft wird;
- ob Profilaktionen die Haushalts-Zieldeckung verbessern oder verschlechtern;
- ob das gewaehlte Finanzierungsverfahren nur Quellen zuordnet oder neue Zwecke erzeugt;
- ob die final dargestellten KPIs zur ersetzten Aktion passen.

### 4. `tax_optimized` arbeitet profilweise statt quellenweise

Die bestehende Verteilung sortiert ganze Profile nach einer geschaetzten Steuerlast. Erst innerhalb des ausgewaehlten Profils wird dessen Liquiditaet verwendet. Dadurch kann ein steuerpflichtiger Verkauf in einem Profil vorgesehen werden, obwohl in einem anderen Profil eine besser geeignete Quelle existiert. Die Optimierung darf ausserdem keinen eigenstaendigen Gegenkauf erzeugen.

## Verbindlicher Fachcontract

### Household first

1. Die Haushalts-Engine trifft genau eine Spending- und Ziel-Liquiditaetsentscheidung.
2. Richtung und Netto-Verwendungen der finalisierten Haushaltsaktion sind der verbindliche Plan nach Zweck.
3. Quellen, Steuerreserve und Steuerzustand der vorlaeufigen Haushalts-Engine-Aktion sind im Multi-Profil-Fall noch nicht final, weil Verlusttopf, Sparer-Pauschbetrag, Kirchensteuer und Tranchenbesitz profilbezogen sind.
4. Die 3-Bucket-Logik finalisiert die Haushaltszwecke genau einmal, bevor eine Profilattribution beginnt.
5. Die Profilverbundlogik darf den finalisierten Haushaltsplan nur auf ausfuehrende Profile und konkrete Quellen aufteilen.
6. Die Summe der profilbezogenen Teilplaene muss den finalisierten Haushaltsplan centgenau bzw. innerhalb maximal 0,01 EUR reproduzieren.
7. Die Profilzuordnung darf keinen Zweck hinzufuegen, der in der finalisierten Haushaltsaktion nicht enthalten ist.

### Keine gegenlaeufige Zusatzaktion

Ein gleichzeitiger Kauf und Verkauf desselben Assettyps ueber verschiedene Profile ist nur zulaessig, wenn beides bereits in der verbindlichen Haushaltsaktion enthalten und fachlich diagnostiziert ist. Die reine Profilzuordnung darf eine solche Gegenbewegung nicht neu erzeugen.

Insbesondere gilt:

- Bei einer Haushaltsaktion zur Liquiditaetsauffuellung darf die Profilzuordnung nicht gleichzeitig zusaetzliche Aktienkaeufe aus Haushaltsliquiditaet erzeugen.
- Bei einer Haushaltsaktion zum Abbau ueberschuessiger Liquiditaet darf die Profilzuordnung nicht gleichzeitig zusaetzliche Wertpapierverkaeufe zur Liquiditaetsbildung erzeugen.

### Liquiditaets-Cashflow

Fuer jede finale Aktion wird eine DOM-freie Netto-Liquiditaetsaenderung ermittelt:

- `verwendungen.liquiditaet` erhoeht die Liquiditaet;
- als Quelle verwendete bestehende Liquiditaet vermindert die Liquiditaet;
- Steuern und Nettoerloese muessen mit den ausgewiesenen Verkaufsquellen abgestimmt sein;
- der Cashflow darf nicht aus UI-Texten abgeleitet werden, sondern aus dem strukturierten Action-Contract.

Die folgenden Werte muessen aus derselben finalen Aktion stammen:

- `ui.liquiditaet.deckungNachher`;
- `diagnosis.general.deckungNachher`;
- Runway nach Transaktion, soweit dieser im Balance-Ergebnis ausgewiesen wird;
- gerenderte Quellen und Verwendungen.

### Steueroptimierte Profilzuordnung

`tax_optimized` optimiert nur die zur verbindlichen Haushaltsaktion benoetigten Quellen. Die Auswahl erfolgt global ueber geeignete Profilquellen und nicht durch eine erneute komplette Rebalancing-Simulation je Profil.

Dabei gelten mindestens:

- keine Quelle ueber ihren verfuegbaren Betrag hinaus verwenden;
- Steuer- und Kostenbasisdaten des jeweiligen Profils erhalten;
- bestehende Tranchenregeln und Teilfreistellung respektieren;
- keine kuenstlichen Gegenkaeufe zur Kompensation einer Profilallokation erzeugen;
- stabile, deterministische Tie-Breaker verwenden;
- nicht finanzierbare Restbetraege fail-closed melden.

### Profilbezogener Steuerzustand

Der Haushaltsplan ist fuer die Netto-Zwecke verbindlich; der steuerliche Jahresabschluss wird dagegen je Profil aus den tatsaechlich attribuierten Verkaeufen neu berechnet.

Fuer jedes beteiligte Profil gilt:

1. Jede attribuierte Verkaufstranche traegt unveraendert `sourceProfileId` und die fuer die Steuerberechnung notwendigen Rohdaten.
2. Aus allen final attribuierten Verkaeufen des Profils werden `sumRealizedGainSigned` und `sumTaxableAfterTqfSigned` gebildet. Gegenkaeufe und reine Liquiditaetsquellen duerfen diese Aggregate nicht veraendern.
3. `taxStatePrev` stammt ausschliesslich aus `entry.balanceState.lastState.taxState` des betreffenden Profils.
4. `sparerPauschbetrag` und `kirchensteuerSatz` stammen aus dem persistierten Input desselben Profils.
5. Nach Abschluss der Attribution wird `settleTaxYear()` aus `engine/tax-settlement.mjs` genau einmal je Profil mit dessen finalem Rohaggregat aufgerufen.
6. `taxStateNext` ersetzt den von einer verworfenen oder rein technischen Profil-Engine-Aktion erzeugten Steuerzustand. Andere bestehende Profil-Last-State-Felder werden nicht durch kuenstliche Funding-Inputs fortgeschrieben.
7. Ein Profil ohne attribuierten Verkauf wird mit einem Null-Rohaggregat reconciliert; sein vorhandener `lossCarry` muss dadurch exakt erhalten bleiben.
8. Die finale Haushaltsaktion weist als Steuer die Summe der profilbezogenen `taxDue`-Werte aus. Diese Summe ist der finale Haushalts-Steuerwert; der vorlaeufige Steuerwert des Haushalts-Engine-Laufs darf im Multi-Profil-Fall nicht als verbindlich behandelt werden.
9. `finalAction.taxRawAggregate` entspricht der Summe der finalen Profil-Rohaggregate. Zusaetzlich bleiben die Einzel-Settlements profilbezogen diagnostizierbar.
10. Bruttoquellen, finale Steuer und Nettoerloes muessen die verbindlichen Netto-Verwendungen weiterhin innerhalb 0,01 EUR finanzieren. Reicht eine vorlaeufige Steuerreserve nach dem profilbezogenen Settlement nicht aus, wird nicht still gekuerzt: Die Quellenplanung wird mit dem finalen Steuercontract neu berechnet oder der Lauf bricht fail-closed ab.

Die Implementierung orientiert sich am bestehenden Recompute-Muster aus `app/simulator/simulator-tax-recompute.js`, ohne Simulatorcode in die Balance-App zu kopieren und ohne `engine/tax-settlement.mjs` zu veraendern.

### 3-Bucket genau einmal

Im Profilverbund gilt folgende feste Reihenfolge:

1. Alle Haushaltstranchen werden als nicht mutierende Kopien mit `sourceProfileId` und Profilname zu einem Haushaltspool zusammengefuehrt.
2. Die Haushalts-Engine erzeugt die vorlaeufige Haushaltsaktion.
3. `applyThreeBucketLogic()` und danach `appendBondReplenishment()` werden, soweit fachlich aktiv, genau einmal auf diese Haushaltsaktion und den vollstaendigen Haushaltstranchenpool angewendet.
4. Das Ergebnis ist die finalisierte Haushaltsaktion nach Zweck und die einzige 3-Bucket-Diagnosequelle.
5. Erst danach werden Quellen und Verwendungen auf Profile attribuiert und die profilbezogenen Steuerabschluesse berechnet.
6. Die Profilschleife darf weder `applyThreeBucketLogic()` noch `appendBondReplenishment()` aufrufen und keine eigenen Bond-Ziele erzeugen.
7. `postprocessBalanceAction()` darf im Profilverbund keine zweite 3-Bucket-Nachbearbeitung ausfuehren. Es uebernimmt die bereits finalisierte/attribuierte Aktion und die einmalig erzeugte Haushaltsdiagnose.

Roh-Steueraggregate aus Bond- oder Ersatzverkaeufen werden erst nach dieser einmaligen 3-Bucket-Finalisierung den besitzenden Profilen zugeordnet. Damit kann derselbe Verkauf weder doppelt besteuert noch doppelt in `lossCarry` eingerechnet werden.

## Synthetischer Regressionsfall

Die Tests verwenden ausschliesslich synthetische Daten, beispielsweise:

- Haushaltsliquiditaet: 120.000 EUR;
- Ziel-Liquiditaet: 160.000 EUR;
- verbindliche Haushaltsaktion: 40.000 EUR Netto-Liquiditaet aufbauen;
- Profil A besitzt hohe Liquiditaet;
- Profil B besitzt steuerpflichtige Aktientranchen.

Unzulaessiges Ergebnis:

- Profil A soll 60.000 EUR Aktien kaufen;
- Profil B soll 40.000 EUR Liquiditaet durch Aktienverkauf aufbauen;
- Netto-Liquiditaetsaenderung: minus 20.000 EUR trotz Haushaltsluecke.

Erwartetes Ergebnis:

- Profilaktionen bilden zusammen exakt die verbindliche Haushaltsaktion ab;
- keine neu eingefuehrte Gegenbewegung;
- finale Liquiditaet und Deckungsanzeige stimmen rechnerisch ueberein.

## Akzeptanzkriterien

1. Der Haushaltslauf bleibt die einzige Quelle fuer Spending, Ziel-Liquiditaet und Plan nach Zweck.
2. Profilbezogene Aktionen sind reine Attributionen der Haushaltsaktion.
3. Die Summe der Profil-Verwendungen entspricht je Zweck der Haushalts-Verwendung innerhalb von 0,01 EUR.
4. Die Summe der Profilquellen, Steuern und Nettoerloese ist intern abgestimmt und finanziert genau die verbindliche Haushaltsaktion.
5. Eine Profilzuordnung kann nicht gleichzeitig einen Aktienkauf und einen Aktienverkauf neu erzeugen, wenn der Haushaltplan diese Gegenbewegung nicht enthaelt.
6. Die Netto-Liquiditaetsaenderung der final gerenderten Aktion entspricht der fuer `deckungNachher` verwendeten Aenderung innerhalb von 0,01 EUR.
7. Wenn die Haushaltsaktion Liquiditaet aufbauen soll, darf die finale Aktion die Haushaltsliquiditaet nicht senken.
8. Wenn die Haushaltsaktion Liquiditaet abbauen soll, darf die finale Aktion die Haushaltsliquiditaet nicht erhoehen, ausser der Haushaltplan enthaelt explizit mehrere diagnostizierte Zwecke.
9. `tax_optimized`, `proportional` und `runway_first` beeinflussen die Profil-/Quellenzuordnung, nicht den Haushaltszweck oder den Haushaltsgesamtbetrag.
10. Unzureichende oder nicht eindeutig zuordenbare Quellen fuehren zu einem sichtbaren, fail-closed Fehler statt zu einer Teil- oder Gegenaktion.
11. Single-Profil-Verhalten bleibt unveraendert.
12. Standard- und 3-Bucket-Modus bleiben ohne doppelte Nachbearbeitung konsistent.
13. Kein Engine-Contract und keine Engine-Semantik werden fuer diesen Bugfix veraendert.
14. Reale Profilnamen, Exporte oder Finanzwerte werden nicht in Tests, Snapshots oder Dokumentation uebernommen.
15. Jede finale Verkaufstranche ist genau einem Profil zugeordnet und geht genau einmal in dessen Steuer-Rohaggregat ein.
16. `settleTaxYear()` wird nach finaler Attribution genau einmal je beteiligtem Profil aufgerufen; `taxStateNext` wird vor der Persistenz in den Profilzustand geschrieben.
17. Ein Profil ohne Verkauf behaelt seinen bisherigen `lossCarry` centgenau.
18. Die Summe der finalen Profilsteuern entspricht `finalAction.steuer` innerhalb 0,01 EUR; der vorlaeufige Haushalts-Steuerwert wird im Profilverbund nicht faelschlich weiterverwendet.
19. Summe aus Bruttoquellen minus finaler Profilsteuern finanziert die finalen Netto-Verwendungen innerhalb 0,01 EUR oder der Lauf bricht fail-closed ab.
20. Im 3-Bucket-Profilverbund werden Bond-Ersatzverkauf bzw. Bond-Wiederauffuellung und ihre Roh-Steueraggregate nachweislich nur einmal erzeugt.
21. Persistierte Profil-Last-States enthalten keinen Steuerzustand aus verworfenen Profilaktionen oder kuenstlichen Funding-Inputs.

## Umsetzungspaket 1

### Ziel

Haushaltsaktion und profilbezogene Ausfuehrung in einem einzigen konsistenten Action-Contract zusammenfuehren.

### Vorgesehener Ansatz

1. Einen DOM-freien Helper fuer Netto-Liquiditaets-Cashflow und Action-Invarianten definieren.
2. Beim Aufbau des Haushaltspools jede kopierte Tranche mit stabiler Profilprovenienz (`sourceProfileId`, Profilname) versehen, ohne gespeicherte Tranchenobjekte zu mutieren.
3. Die vorlaeufige Haushaltsaktion einmalig durch die Haushalts-3-Bucket-Logik finalisieren und Diagnose sowie Action gemeinsam speichern.
4. Die verbindlichen Netto-Zwecke dieser finalisierten Haushaltsaktion vor jeder Profilattribution unveraendert sichern.
5. Profilquellen deterministisch auf die benoetigten Haushaltszwecke verteilen; Profil-Engine-Ergebnisse nicht mehr als neue, unabhaengige Rebalancing-Aktionen summieren.
6. Aus den final attribuierten Verkaufstranchen je Profil ein signiertes Steuer-Rohaggregat bilden.
7. Je Profil `settleTaxYear()` mit dessen vorherigem `taxState`, Sparer-Pauschbetrag und Kirchensteuersatz ausfuehren; finale Profilsteuer und `taxStateNext` in den Ausfuehrungscontract aufnehmen.
8. Bruttoquellen nach dem finalen Profil-Settlement gegen die verbindlichen Netto-Verwendungen reconciliieren. Unterdeckung oder nicht konvergierende Steuerreserve fuehrt fail-closed zum Abbruch.
9. Persistenz so umstellen, dass bestehende Profil-Last-State-Felder erhalten und nur der aus tatsaechlich attribuierten Verkaeufen berechnete `taxStateNext` fortgeschrieben wird.
10. In Profilschleife und Postprocessor jede zweite 3-Bucket-Ausfuehrung entfernen bzw. fuer den Profilverbund blockieren.
11. Nach der Attribution Summen-, Steuer-, Provenienz- und Richtungsinvarianten fail-closed pruefen.
12. `deckungNachher` und betroffene Diagnosewerte aus der tatsaechlich final gerenderten Aktion berechnen.
13. Profilbezogene Darstellung beibehalten, ohne den Haushaltsgesamtplan zu veraendern.

### Voraussichtlicher Programmdatei-Scope

Maximal 7 Programmdateien; die genaue Liste ist vor Coding im Diff-Risiko-Block zu bestaetigen:

- `app/balance/balance-main-profilverbund.js`
- `app/balance/balance-action-postprocessor.js`
- `app/profile/profilverbund-balance.js`
- optional ein neues DOM-freies Modul unter `app/profile/` fuer Action-Attribution und Invarianten
- `tests/profilverbund-balance.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/balance-decumulation.test.mjs`

Nur lesend/wiederverwendet, nicht zu aendern:

- `engine/tax-settlement.mjs`
- `engine/transactions/sale-engine.mjs`
- `engine/transactions/three-bucket-logic.mjs`

### Dokumentations-Scope

- dieses Arbeitsdokument;
- `docs/internal/BALANCE_APP_HARDENING_PLAN.md` fuer die Rueckdokumentation der Slice-01-Regression;
- `docs/reference/BALANCE_MODULES_README.md`;
- `docs/reference/TECHNICAL.md`, falls sich der dokumentierte Action-Contract aendert.

## Nicht-Scope

- keine Aenderung der monatlichen Entnahmeberechnung oder Dynamic-Flex-/VPW-Semantik;
- keine Aenderung der Engine unter `engine/` oder des generierten `engine.js`;
- keine Neugestaltung der allgemeinen Steuer-Engine;
- keine Aenderung von Profilmitgliedschaft, Jahresperioden oder Inflation;
- keine Bearbeitung von `dist/` oder `RuheStandSuite.exe`;
- keine Migration oder Speicherung realer lokaler Nutzerdaten in Test-Fixtures;
- keine automatische Vermoegensuebertragung zwischen rechtlich getrennten Profilen ausserhalb des bestehenden Profilverbund-Contracts.

## Stop-Regeln fuer diesen Bugfix

Zusaetzlich zu `AGENTS.md` wird vor der Umsetzung gestoppt und nachgefragt, wenn:

- die Korrektur eine Aenderung der Engine-Semantik erfordern wuerde;
- mehr als 10 Programmdateien geaendert werden muessten;
- der bestehende Action-Contract Quellen und Verwendungen nicht eindeutig als Liquiditaets-Cashflow interpretieren laesst;
- unklar bleibt, ob bzw. unter welchen Bedingungen Liquiditaet zwischen Profilen wirtschaftlich als gemeinsamer Haushaltspuffer behandelt werden darf;
- 3-Bucket-, Gold- oder Bond-Aktionen nicht ohne neue gegenlaeufige Zwecke attribuiert werden koennen;
- Steuer-Summen zwischen Haushaltsaktion und Profilattribution nicht centgenau reconciliert werden koennen;
- eine finale attribuierte Verkaufstranche keine eindeutige `sourceProfileId` besitzt;
- `taxStatePrev`, Sparer-Pauschbetrag oder Kirchensteuersatz nicht eindeutig dem verkaufenden Profil zugeordnet werden koennen;
- eine Steuer-Neuberechnung eine hoehere Steuer als die reservierte Quelle ergibt und die Netto-Verwendung nicht deterministisch neu geplant werden kann;
- bestehende Backtests oder Snapshots unerwartet abweichen;
- UI und Engine fuer denselben Zweck unterschiedliche Feldnamen oder Vorzeichen verwenden.

## Geplante Tests

### Neue Contract-Tests

- Haushaltsluecke plus gegenlaeufiger Profilkauf wird verhindert.
- Haushaltsueberschuss plus gegenlaeufiger Profilverkauf wird verhindert.
- Summe der Profilzwecke entspricht der Haushaltsaktion centgenau.
- Finale Netto-Liquiditaetsaenderung entspricht `deckungNachher`.
- Haushaltsaktion bleibt unveraendert, wenn nur Profilquellen attribuiert werden.
- Nicht finanzierbarer Restbetrag bricht fail-closed ab.
- Deterministische Tie-Breaker liefern bei gleichen Steuerkosten stabile Ergebnisse.
- `tax_optimized` erzeugt keinen steuerpflichtigen Verkauf zusammen mit einem nicht autorisierten Gegenkauf.
- `proportional` und `runway_first` aendern nur die Attribution.
- Single-Profil-Pfad bleibt unveraendert.
- Standard- und 3-Bucket-Pfad wenden die finale Aktion genau einmal nach.
- Profil A mit bestehendem Verlusttopf und attribuiertem Gewinnverkauf verbraucht seinen `lossCarry` exakt gemaess `settleTaxYear()`.
- Ein attribuierter Verlustverkauf erhoeht nur den Verlusttopf des verkaufenden Profils.
- Profile ohne Verkauf behalten ihren Verlusttopf unveraendert.
- Sparer-Pauschbetrag und Kirchensteuer werden je Profil aus dessen Input verwendet.
- Summe der Profilsteuern entspricht der Steuer der finalen Haushaltsaktion; der vorlaeufige Haushalts-Steuerwert wird nicht uebernommen.
- Jede Verkaufstranche geht genau einmal in das Rohaggregat ihres Quellprofils ein.
- Persistenz speichert `taxStateNext` aus der final attribuierten Aktion und nicht aus einer verworfenen Profil-Engine-Aktion.
- 3-Bucket im schlechten Jahr ersetzt Aktienverkaeufe genau einmal durch Bond-Verkaeufe.
- 3-Bucket im guten Jahr fuegt eine Bond-Wiederauffuellung genau einmal hinzu.
- 3-Bucket-Roh-Steueraggregate werden genau einmal einem Profil zugerechnet und genau einmal settled.

### Auszufuehrende Testkommandos

```powershell
node tests\run-single.mjs tests\profilverbund-balance.test.mjs
node tests\run-single.mjs tests\balance-ui-orchestration.test.mjs
node tests\run-single.mjs tests\balance-decumulation.test.mjs
npm test
npm run test:browser
```

Da fachliche Transaktions- und Persistenzvertraege betroffen sind, ist `npm test` verpflichtend.

## Diff-Risiko vor Coding

**Planungsstand am 2026-07-14:**

- aktiver Branch bei Dokumenterstellung: `codex/balance-app-hardening`;
- vorgesehener Umsetzungsbranch: `codex/profilverbund-action-consistency`;
- der Umsetzungsbranch ist noch nicht angelegt;
- bestehende fremde Dateien: ungetrackte Playwright-Dateien unter `node_modules/`;
- diese Dateien gehoeren nicht zum Bugfix und duerfen nicht veraendert, geloescht oder committed werden.

Vor dem ersten Code-Edit sind auf dem Umsetzungsbranch erneut auszufuehren und hier zu dokumentieren:

```powershell
git branch --show-current
git status --short
```

**Geplante Dateien:** siehe vorlaeufiger Programm- und Dokumentations-Scope.  
**Voraussichtliche Aenderungstiefe:** riskant, da reale Handlungsanweisungen, Steuern und Liquiditaetsdeckung betroffen sind.  
**Gefaehrdete bestehende Tests:** Profilverbund, Transaktionsaktionen, Steuerreconciliation, 3-Bucket, Balance-Orchestrierung und Browser-Smoke.  
**Nicht anfassen:** `engine/`, `engine.js`, `dist/`, `RuheStandSuite.exe`, fremde `node_modules`-Dateien.  
**Rollback-Strategie:** nur die im final bestaetigten Scope geaenderten Dateien mit `git checkout -- <dateien>` zuruecksetzen; eine neu angelegte Moduldatei nur nach ausdruecklicher Freigabe loeschen. Keine destruktiven Git-Kommandos.

## Durchgefuehrte Aenderungen

Noch keine. Dieses Dokument beschreibt den P0-Bugfix vor Implementierungsbeginn.

## Ausgefuehrte Tests mit Ergebnis

Noch keine Implementierungstests. Die vorangegangene Diagnose zeigte, dass bestehende Tests die Summenverteilung pruefen, aber keine Haushalts-Action-Invariante fuer gegenlaeufige Profilaktionen besitzen.

## Abweichungen vom Plan

Noch keine.

## Offene Risiken

- Der bestehende Profilverbund-Pfad nutzt Profil-Engine-Laeufe zugleich fuer Transaktionsplanung, Steuerzustand und Persistenz. Die Korrektur muss diese Verantwortlichkeiten trennen, ohne Steuerhistorie zu verlieren.
- Der vorlaeufige Haushalts-Steuerwert kann wegen profilbezogener Verlusttoepfe, Pauschbetraege und Kirchensteuer von der Summe der finalen Profilsteuern abweichen. Deshalb sind nur die final reconcilierten Profilsteuern fuer Anzeige und Persistenz verbindlich.
- Haushaltsaktionen koennen neben Liquiditaet auch Gold, Aktien und Bonds als Zwecke enthalten. Die Attribution muss alle vorhandenen Zwecke erhalten.
- Der aktuelle KPI `deckungNachher` wird vor dem spaeteren Ersetzen der Action berechnet. Eine reine Renderer-Korrektur wuerde die fachlich falsche Aktion nur kosmetisch kaschieren und ist unzulaessig.
- Eine globale Steueroptimierung ueber Profilgrenzen darf keine implizite rechtliche Vermoegensuebertragung erfinden. Falls der bestehende Produktcontract hierzu keine eindeutige Aussage enthaelt, greift die Stop-Regel.

## Rueckdokumentation

Nach erfolgreicher Implementierung und Review werden mindestens dokumentiert:

- Fehlerursache und korrigierter Household-first-Action-Contract im `BALANCE_APP_HARDENING_PLAN.md`;
- tatsaechlicher Dateiscope;
- Testresultate;
- Abweichungen und verbleibende Restrisiken;
- lokaler Commit und gegebenenfalls spaeterer GitHub-Status.

## Freigabestatus

- Arbeitsdokument: **freigegeben**
- Review durch Gemini: **erledigt (freigegeben)**
- Review durch Claude: **optional, ausstehend**
- Nutzerfreigabe zur Implementierung: **ausstehend (Warte auf Bestätigung des Arbeitsdokuments und des Reviews)**
- Implementierung: **nicht begonnen**
- Commit/Push: **nicht erfolgt**

## Review-Feedback von Gemini

### 1. Prüfdimensionen

- **Korrektheit und fachliche Invarianten:**
  - **Household-first:** Der Entwurf setzt korrekt an der Wurzel an. Der Haushaltslauf muss die einzige Quelle für die strategische Allokation, Rebalancing und Liquiditätssicherung sein. Die Zuweisung auf Profilebene darf nur noch eine Aufteilung (Attribution) dieser Haushaltsentscheidung sein.
  - **Vermeidung von Gegenbewegungen:** Das Verbot von gleichzeitigen Käufen und Verkäufen desselben Asset-Typs über verschiedene Profile hinweg ist absolut notwendig. Die derzeitige Summation von unabhängigen Profil-Engines führt zu ineffizienten und widersprüchlichen Handlungsanweisungen.
  - **Konsistente Deckungsanzeige:** Dass `deckungNachher` direkt aus dem Cashflow der final attribuierten Aktion berechnet wird, behebt den Anzeigewiderspruch in der UI.
- **Technische Verträge und Verträglichkeit:**
  - **Bestehende Engine-Semantik:** Die Engine (`engine/` und `engine.js`) bleibt unberührt. Das ist ein wichtiger Schutz vor Regressionen in der Monte-Carlo- und Rebalancing-Logik.
  - **Single-Profil-Pfad:** Der Single-Profil-Modus bleibt unverändert, da die Profilverbundlogik nur greift, wenn mehrere Profile ausgewählt sind.

### 2. Findings (Kritische Risiken)

- **G-P0-01 (Kritisch): Drift des steuerlichen Verlusttopfs (`lossCarry`)**
  - *Beschreibung:* Die Profil-Engines berechnen in `simulateSingleYear` einen internen Steuerabschluss. Wenn wir deren Aktionen verwerfen, müssen wir auch deren steuerlichen Folgestatus korrigieren.
  - *Empfehlung:* Codex muss in `persistProfilverbundProfileStates` sicherstellen, dass `newState.taxState` durch einen expliziten Aufruf von `settleTaxYear()` mit den tatsächlich attribuierten Tranchenverkäufen des Profils überschrieben wird.
- **G-P0-02 (Kritisch): Doppelte Ausführung der 3-Bucket-Logik**
  - *Beschreibung:* Die Wiederauffüllung von Anleihen wird derzeit sowohl in der Profilschleife als auch im Postprocessor durchgeführt.
  - *Empfehlung:* Im Profilverbund-Modus darf die 3-Bucket-Logik nur einmal auf Haushaltsebene laufen. Die Profilschleife darf keine eigenen Bond-Transaktionen generieren.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- Ein Benutzer führt ein Jahresupdate im Profilverbund durch. Weil die Tranchenverkäufe steuerlich attribuiert wurden, die Verlusttöpfe der Profile aber nicht exakt mit `settleTaxYear` nachberechnet wurden (oder Rundungsfehler bei der Aufteilung entstanden sind), weicht der Verlustvortrag (`lossCarry`) eines Profils im Folgejahr um wenige Cent ab. Nach 10 Jahren simulierter Laufzeit kumuliert sich dieser Fehler, was bei einem Profil zu einer verfrühten Steuerzahlung führt. 
*Abmilderung:* Die neuen Contract-Tests müssen die steuerliche Invariante prüfen: `Summe(Steuern der Profile) === Haushalt-Steuer` und `Profil-Verlusttöpfe müssen exakt dem realen Attributionscashflow entsprechen`.

### 4. Review-Ergebnis

- **Status:** freigegeben zur Umsetzung
- **Blocker:** keine (sofern G-P0-01 und G-P0-02 im Umsetzungsentwurf berücksichtigt werden)
- **Restrisiken:** Rundungsdifferenzen bei der Steuer-Reconciliation (Pre-Mortem) (G-P0-01).

---

## Review-Feedback von Claude

Noch ausstehend.

## Review-Antworten von Codex

### Antwort auf G-P0-01

Angenommen und im Fachcontract, in den Akzeptanzkriterien, im Umsetzungspaket, im Scope, in den Stop-Regeln und in den geplanten Tests konkretisiert.

- Das finale signierte Rohaggregat wird je Profil ausschliesslich aus dessen tatsaechlich attribuierten Verkaufstranchen gebildet.
- `settleTaxYear()` wird danach genau einmal je Profil mit profilbezogenem `taxStatePrev`, Sparer-Pauschbetrag und Kirchensteuersatz ausgefuehrt.
- Der daraus entstehende `taxStateNext` wird vor der Persistenz in den erhaltenen Profil-Last-State geschrieben; Steuerzustand und sonstige Guardrail-Felder einer verworfenen technischen Profilaktion werden nicht uebernommen.
- Finale Haushaltssteuer ist die Summe der Profil-Settlements. Der vorlaeufige Haushalts-Steuerwert ist wegen getrennter Verlusttoepfe und Pauschbetraege nicht verbindlich.
- Bruttoquellen, Steuer und Netto-Verwendungen werden nach dem Settlement centgenau reconciliert oder fail-closed abgebrochen.

### Antwort auf G-P0-02

Angenommen und mit einer verbindlichen Ausfuehrungsreihenfolge konkretisiert.

- 3-Bucket wird einmal auf der vorlaeufigen Haushaltsaktion und dem vollstaendigen, profilmarkierten Haushaltstranchenpool ausgefuehrt.
- Erst die so finalisierte Haushaltsaktion wird auf Profile attribuiert.
- Profilschleife und Profilverbund-Postprocessor duerfen keine zweite 3-Bucket-Ausfuehrung oder eigene Bond-Ziele erzeugen.
- Bond-Verkaeufe und Bond-Wiederauffuellungen gehen genau einmal in Quellen, Verwendungen, Diagnose und profilbezogene Steuer-Rohaggregate ein.

### Statuskorrektur

Die aktuelle Nutzerrueckmeldung stellt klar, dass Gemini wegen der kritischen Findings keine Freigabe erteilt hat. Ungeachtet der widerspruechlichen Formulierung `freigegeben zur Umsetzung` im bestehenden Gemini-Block wird der effektive Planstatus deshalb als **nicht freigegeben** gefuehrt. Nach diesen Korrekturen ist ein erneutes Gemini-Review erforderlich; Coding, Branchanlage, Commit und Push bleiben ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| U-01 | Nutzer | Drastisch gegenlaeufige Profilaktionen trotz Haushalts-Liquiditaetsluecke | angenommen | P0-Arbeitsdokument erstellt; Implementierung ausstehend |
| G-P0-01 | Gemini | Drift des steuerlichen Verlusttopfs | angenommen | Profilbezogener Raw-Aggregate-/Settlement-/Persistenz-Contract und Tests im Plan konkretisiert; Implementierung ausstehend |
| G-P0-02 | Gemini | Doppelte 3-Bucket-Ausführung | angenommen | Einmalige Haushaltsausfuehrung vor Attribution samt Diagnose-/Steuercontract und Tests konkretisiert; Implementierung ausstehend |
| U-02 | Nutzer | Gemini erteilt wegen kritischer Findings keine Freigabe | angenommen | Freigabestatus auf nicht freigegeben korrigiert; erneutes Gemini-Review erforderlich |
