# P0-Bugfix: Konsistente Profilverbund-Handlungsanweisungen

**Geplanter Feature-Branch:** `codex/profilverbund-action-consistency`  
**GitHub-Status:** Branch noch nicht angelegt oder veroeffentlicht  
**Status:** Entwurf; Review und Freigabe ausstehend  
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

1. Die Haushalts-Engine trifft genau eine Spending-, Ziel-Liquiditaets- und Transaktionsentscheidung.
2. `modelResult.ui.action` des Haushaltslaufs ist der verbindliche Plan nach Zweck.
3. Die Profilverbundlogik darf diesen Plan nur auf ausfuehrende Profile und konkrete Quellen aufteilen.
4. Die Summe der profilbezogenen Teilplaene muss den Haushaltplan centgenau bzw. innerhalb maximal 0,01 EUR reproduzieren.
5. Die Profilzuordnung darf keinen Zweck hinzufuegen, der in der Haushaltsaktion nicht enthalten ist.

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

## Umsetzungspaket 1

### Ziel

Haushaltsaktion und profilbezogene Ausfuehrung in einem einzigen konsistenten Action-Contract zusammenfuehren.

### Vorgesehener Ansatz

1. Einen DOM-freien Helper fuer Netto-Liquiditaets-Cashflow und Action-Invarianten definieren.
2. Die verbindliche Haushaltsaktion vor jeder Profilattribution unveraendert sichern.
3. Profilquellen deterministisch auf die benoetigten Haushaltszwecke verteilen.
4. Profil-Engine-Ergebnisse nicht mehr als neue, unabhaengige Rebalancing-Aktionen in den Haushaltsplan summieren.
5. Nach der Attribution die Summen- und Richtungsinvarianten fail-closed pruefen.
6. `deckungNachher` und betroffene Diagnosewerte aus der tatsaechlich final gerenderten Aktion berechnen.
7. Profilbezogene Darstellung beibehalten, ohne den Haushaltsgesamtplan zu veraendern.

### Voraussichtlicher Programmdatei-Scope

Maximal 7 Programmdateien; die genaue Liste ist vor Coding im Diff-Risiko-Block zu bestaetigen:

- `app/balance/balance-main-profilverbund.js`
- `app/balance/balance-action-postprocessor.js`
- `app/profile/profilverbund-balance.js`
- optional ein neues DOM-freies Modul unter `app/profile/` fuer Action-Attribution und Invarianten
- `tests/profilverbund-balance.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/balance-decumulation.test.mjs`

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

Arbeitsdokument und Freigabe zur Umsetzung erhalten. Die kritischen Findings G-P0-01 (Neuberechnung des Verlustvortrags mittels `settleTaxYear` je Profil auf Basis der attribuierten Verkäufe) und G-P0-02 (Verhinderung der 3-Bucket-Doppelausführung) werden vollständig in den Umsetzungsentwurf integriert. Wir warten auf die Nutzerfreigabe zum Anlegen des Feature-Branches und Starten des Codings.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| U-01 | Nutzer | Drastisch gegenlaeufige Profilaktionen trotz Haushalts-Liquiditaetsluecke | angenommen | P0-Arbeitsdokument erstellt; Implementierung ausstehend |
| G-P0-01 | Gemini | Drift des steuerlichen Verlusttopfs | angenommen | Verlustvortrag wird nach Attribution je Profil neu berechnet |
| G-P0-02 | Gemini | Doppelte 3-Bucket-Ausführung | angenommen | 3-Bucket-Modus läuft im Profilverbund nur einmal auf Haushaltsebene |

