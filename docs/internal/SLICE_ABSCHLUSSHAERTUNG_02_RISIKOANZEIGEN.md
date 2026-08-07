# Slice Abschlusshaertung 02: Wahrheitsgetreue Risikoanzeigen

**Feature-Branch:** `codex/fokussierte-abschlusshaertung`<br>
**GitHub-Status:** noch nicht angelegt/veroeffentlicht<br>
**Status:** Entwurf v6; Drawdown-Domaene und responsive Layouttests aus Gemini G-P-03/G-P-06 praezisiert; Gemini-Re-Review ausstehend; nicht gestartet<br>
**Hauptplan:** [FOKUSSIERTE_ABSCHLUSSHAERTUNG_PLAN.md](FOKUSSIERTE_ABSCHLUSSHAERTUNG_PLAN.md)

## Ziel

P10-, Drawdown-, Steuer- und Szenariodarstellungen sollen die zugrunde
liegenden Messwerte ohne richtungsfalsche Rundung oder unklare Preisbasis
wiedergeben. Dieser Slice ist ausschliesslich ein Anzeige-/Copy-Slice: Die
Karten lesen die bereits vom Runner validierten `aggregatedResults`; der erst im
Exportpfad erzeugte V2-Envelope ist **nicht** ihre Laufzeitquelle. Der Slice
fuegt keine neue MC-KPI, keinen Buffer und keine Aggregation hinzu.

Zusaetzlich wird die bereits vorhandene 4,5-Prozent-Auswertung fachlich
eindeutig beschriftet. Sie misst die realisierte Entnahmequote und ist eine
Berichtsreferenz, keine Alarm- oder Guardrail-Schwelle. Ihre bestehende
Berechnung wird nicht geaendert.

## Akzeptanzkriterien

- Der exakte Messwert ist bei allen unten festgelegten Kennzahlen die primaere,
  unmittelbar auf der Ergebniskarte sichtbare Anzeige. Ein Tooltip allein
  erfuellt das Kriterium nicht.
- Ein grob gerundeter Wert darf nur nachrangig, klar als gerundet und in der
  fuer die Kennzahl konservativen Richtung erscheinen.
- Nominaler und realer Maximum-Drawdown aus V2 werden getrennt benannt und
  nebeneinander angezeigt; beide verwenden laut V2 denselben Pfad und dieselben
  Zeitgrenzen.
- Beide Maximum-Drawdowns sind **positive Verlustbetraege** in Prozentpunkten
  mit der gueltigen Domaene `[0, 100]`, keine vorzeichenbehafteten Renditen.
  Negative oder groessere Werte verletzen den Aggregatcontract und werden
  fail-closed als `—` plus stabilem Ungueltigkeitsgrund angezeigt; die UI darf
  sie nicht per `Math.abs` scheinbar reparieren.
- Fuer jede Karten-KPI gilt: Nur ein endlicher Wert aus `aggregatedResults`
  wird numerisch formatiert. `null`, `undefined`, nicht endliche Werte oder ein
  Missingness-/Applicability-Grund werden als `—` plus stabilem Grund und
  Beobachtungszahl dargestellt, niemals als 0.
- Der P10-Beispielpfad nennt sein tatsaechliches Auswahlkriterium.
- Pflege-Gruppenvergleiche bleiben sichtbar nicht kausal gekennzeichnet.
- Synthetische Fixtures pruefen die Darstellungsinvarianten; Werte aus dem
  persoenlichen Produktionslauf werden nicht als Fixture uebernommen.
- Copy-Contract-Tests sichern Auswahlkriterium des P10-Beispielpfads sowie den
  Nicht-Kausalitaetshinweis des Pflegevergleichs.
- Ergebniskarte, Auto-Optimize-Auswahl/-Constraint und Auto-Optimize-Ergebnis
  bezeichnen `timeShareQuoteAbove45` als Zeitanteil mit **realisierter**
  Entnahmequote strikt groesser 4,5 Prozent.
- Die Heatmap bezeichnet `colSharesAbove45` wegen ihrer Klassenbildung als
  Anteil mit realisierter Entnahmequote groesser/gleich 4,5 Prozent. Ein Wert
  von exakt 4,5 Prozent liegt im ab 4,5 Prozent beginnenden Bin, aber nicht im
  strikt-`>`-KPI.
- In den normalen sichtbaren Entscheidungsflaechen steht ein Hinweis, dass die
  4,5 Prozent hier nur eine Berichtsreferenz und **keine** fachliche Alarm- oder
  Guardrail-Schwelle sind. Technische Metric-Keys duerfen fuer
  Rueckwaertskompatibilitaet unveraendert bleiben.
- Copy-Contract- und Browsertests sichern Basis, Vergleichsoperator und
  Rollenhinweis in Ergebniskarte, Heatmap, Auto-Optimize-Konfiguration und
  Auto-Optimize-Ergebnis.
- Centgenaue grosse EUR-Werte bleiben bei 320 Pixel schmalem und einem
  regulaeren Desktop-Viewport als vollstaendiger DOM-Text lesbar. Karten duerfen
  umbrechen, aber Text nicht abschneiden oder ueberlagern; die Seite erzeugt
  keinen horizontalen Overflow. Dasselbe gilt fuer die beiden Drawdownwerte und
  ihre Preisbasislabels.

### Verbindliches Rundungsorakel

| Kennzahl | Typ/Risikorichtung | Primaere Anzeige | Erlaubte nachrangige Grobrundung |
| --- | --- | --- | --- |
| reale Depotentnahme P10 | Nutzen/Konsummoeglichkeit | exakter EUR-Wert auf der Karte | nur kleiner oder gleich Messwert |
| Median der Run-P10-Entnahmen | Nutzen/Konsummoeglichkeit | exakter EUR-Wert in derselben sichtbaren Karte/Zeile | nur kleiner oder gleich Messwert |
| Median kumulierter Steuern | Kosten/Belastung | exakter EUR-Wert auf der Karte | nur groesser oder gleich Messwert |
| durchschnittliche Steuerersparnis aus Verlustvortrag | Nutzen | exakter EUR-Wert auf der Karte; ein positiver Messwert darf nicht als 0 verschwinden | nur kleiner oder gleich Messwert, aber nicht anstelle des Exaktwerts |
| nominaler/reeller Maximum-Drawdown | positiver Verlustbetrag in Prozentpunkten, Domaene `[0, 100]` | exakter validierter Aggregatwert mit eindeutiger Preisbasis | positiven Verlustbetrag nur groesser oder gleich Messwert |

„Exakt“ bedeutet fuer EUR-Betraege centgenau mit deutschem Zahlenformat und
fuer Prozentpunkte mindestens zwei Nachkommastellen, sofern der Aggregatwert
diese Genauigkeit liefert.

Beispiel fuer eine optionale Grobanzeige: Der gueltige Drawdown `34,25 %` darf
als `34,3 %` erscheinen, niemals als `34,2 %`. Ein Eingabewert `-34,25 %` ist
kein anders zu rundender Drawdown, sondern eine Contractverletzung und wird
nicht numerisch dargestellt. Der primaere Exaktwert bleibt davon unberuehrt.

## Scope

- MC-Ergebniskarten, Detailtexte und Formatter.
- Anzeige der in Slice 1 bereitgestellten nominalen/reellen Drawdown-KPIs.
- Missingness-/Applicability-Projektion der validierten Aggregate auf Karten.
- Tests der exakten und gerundeten Darstellung.
- Copy-Contracts fuer P10-Pfadauswahl und Pflege-Nichtkausalitaet.
- sichtbare 4,5-Prozent-Copy in Ergebniskarten, Heatmap und Auto-Optimize ohne
  Aenderung der Messlogik oder stabilen Metric-Keys.

## Nicht-Scope

- kein allgemeines Simulator-Redesign;
- kein Wizard, keine neue Navigation und keine formale WCAG-Zertifizierung;
- keine Aenderung der MC-Pfadauswahl oder Quantilmethodik;
- keine Aenderung an MC-Runner, Buffer, Chunk-Result, Aggregation oder
  V2-Projektion;
- keine neue Pflege-Kausalmetrik;
- kein CAPE-Inaktivhinweis; diese optionale UX-Erweiterung ist im Hauptplan
  bewusst als nicht realisiert dokumentiert;
- keine Aenderung der Entnahmepolicies;
- keine Umdeutung der Berichtsreferenz in eine Alarm-/Guardrail-Schwelle und
  keine Aenderung an der bestehenden strikt-`>`-KPI- oder Heatmap-Bin-Zaehlung.

## Voraussichtlich geplante Programmdateien

- `app/simulator/results-metrics.js`
- `app/simulator/results-renderers.js`
- `app/simulator/simulator-utils.js`
- `app/simulator/simulator-results.js`
- `app/simulator/scenario-analyzer.js`
- `app/simulator/simulator-heatmap.js`
- `Simulator.html`
- `app/simulator/auto-optimize-metrics.js`
- `app/simulator/auto-optimize-evaluate.js`
- `app/simulator/auto-optimize-renderer.js`

Die produktive Dateiliste umfasst maximal diese zehn Programmdateien. Eine
Aenderung an den in Slice 1 eingefrorenen V2-Vertragsdateien oder der Bedarf
einer elften produktiven Datei stoppt den Slice vor Coding und erzwingt eine
explizite Planergaenzung.

## Diff-Risiko vor Coding

**Planungsstand:** noch nicht gestartet. Vor Slice-Start Branch und Arbeitsbaum
neu erfassen; Ergebnisse aus Slice 1 muessen bereits freigegeben/committet sein.

```text
git branch --show-current: AUSSTEHEND
git status --short: AUSSTEHEND

Geplante Dateien:
- nach Slice-1-Diff neu bestaetigen

Voraussichtliche Änderungstiefe:
- mittel: sichtbare Risikowerte und Copy-Contracts; keine Aggregation

Gefährdete bestehende Tests:
- formatting
- results metrics/view model
- heatmap contract/copy
- auto-optimize metric, constraint and renderer copy
- scenario analyzer/copy contract
- browser smoke

Nicht anfassen:
- Sampling
- Entnahmepolicies
- Reconcile/Persistenz
- dist/ und Releaseartefakte

Rollback-Strategie:
- Revert des exakten Slice-2-Commits oder dokumentierte Hunk-Ruecknahme;
  `simulator-results.js` darf wegen der Slice-1-Szenarioexport-Hunks nicht
  dateiweise wiederhergestellt werden
- Slice-1-Commit bleibt Sicherheitspunkt
```

## Geplante Tests

- `node tests/run-single.mjs tests/formatting.test.mjs`
- fokussierter Test fuer Ergebniskennzahlen/Formatter mit synthetischen
  Nutzen-, Kosten- und Kleinstwert-Fixtures
- `node tests/run-single.mjs tests/monte-carlo-measurement-contract.test.mjs`
- Copy-Contract-Test fuer P10-Auswahlkriterium und Pflege-Nichtkausalitaet
- 4,5-Prozent-Copy-Contract: Ergebniskarte und Auto-Optimize verwenden
  „realisierte Entnahmequote > 4,5 %“, die Heatmap verwendet
  „realisierte Entnahmequote >= 4,5 % (bin-basiert)“; alle nennen die reine
  Berichtsrolle beziehungsweise verweisen sichtbar darauf
- Grenzfixture mit exakt 4,5 Prozent: im Heatmap-Bin enthalten, im strikt-`>`-
  KPI nicht enthalten; keine UI-Neuberechnung und keine Policy-Aenderung
- Invarianten: primaerer Nutzenwert entspricht dem Messwert und ist nie hoeher;
  primaerer Kostenwert entspricht dem Messwert und ist nie niedriger; positiver
  Kleinstwert bleibt sichtbar
- nominaler/reeller Drawdown verwenden die validierten Aggregatwerte ohne
  Neuberechnung in der UI
- Drawdown-Domaene und Rundung: `0`, `34.25` und `100` sind gueltig;
  `34.25` wird optional zu `34.3`, waehrend `-0.01`, `-34.25`, `100.01` und
  nicht endliche Werte fail-closed als `—` plus Grund erscheinen
- Aggregate mit `null`, fehlendem/nicht endlichem Wert oder Missingness-Grund
  rendern `—` plus Grund/Beobachtungszahl und niemals 0
- Browsertest mit synthetischem `12.345.678,90 €`, beiden Drawdownkarten und
  langen Preisbasislabels bei 320 Pixel sowie regulaerem Desktop-Viewport:
  vollstaendiger Text, erlaubter Umbruch, keine Ueberlappung, kein Abschneiden
  und kein horizontaler Seitenoverflow
- `npm test`
- `npm run test:browser`
- `git diff --check`

## Durchgefuehrte Änderungen

Nicht gestartet.

## Ausgefuehrte Tests mit Ergebnis

Nicht gestartet.

## Abweichungen vom Plan

Keine; Umsetzung noch nicht begonnen.

## Offene Risiken

- Ein nachrangiger gerundeter Wert darf optisch nicht mit dem primaeren
  Exaktwert konkurrieren; im Zweifel entfaellt die Grobrundung vollstaendig.
- Die UI darf realen Drawdown nicht selbst neu berechnen. Weichen nominale und
  reale V2-KPI unerwartet voneinander ab, zeigt sie beide und deren Preisbasis,
  statt eine Differenz zu kaschieren.
- V2-Export und Karten konsumieren denselben fachlichen Aggregatwert ueber
  verschiedene Projektionspfade. Paritaetstests muessen verhindern, dass die
  UI Missingness anders als der Export interpretiert.
- Der stabile technische Name `timeShareWRgt45` bleibt aus
  Kompatibilitaetsgruenden bestehen. Entscheidend ist, dass er auf keiner
  normalen sichtbaren Entscheidungsflaeche als Guardrail-Messung missverstanden
  werden kann.
- Centgenaue Werte koennen Karten hoeher machen. Das ist akzeptiert; verdichtete
  Einzeilenlayouts duerfen den exakten Wert nicht abschneiden. Falls der
  bestehende Kartencontainer selbst bei Umbruch nicht stabil bleibt, greift vor
  einer elften produktiven Datei die Stop-Regel.

## Rueckdokumentation

Nach Abschluss: Hauptplan, Ergebnisregister, Handbuch/Simulator-Dokumentation
und `tests/README.md` aktualisieren.

## Freigabestatus

Nicht implementierungsreif; C-07, C-P-29, G-P-03/G-P-06 und die Cross-Slice-
Rollback-Auflage sind eingearbeitet. Der Slice bleibt durch Slice 1 sowie
Gesamtplan- und Gemini-Re-Review gesperrt.

## Review-Feedback von Gemini

G-P-03 nimmt faelschlich vorzeichenbehaftete Drawdownwerte als regulaere
Eingabedomaene an. Der bestehende Laufpfad liefert mit
`computeRunStatsFromSeries` den Betrag `Math.abs(maxDD) * 100`; der
Aggregatcontract bezeichnet die Einheit als positive Verlustdistanz vom
vorherigen Hoch. Die Blockereinstufung wird deshalb abgelehnt. Entwurf v6 macht
die Domaene `[0, 100]`, die fail-closed Behandlung negativer Werte und die
konservative Rundung des positiven Betrags dennoch explizit.

G-P-06 ist ein sinnvoller nicht blockierender Hinweis. Centgenaue mehrstellige
Werte werden nun in schmalem und regulaerem Viewport auf Umbruch, Lesbarkeit,
Ueberlappung, Abschneiden und horizontalen Seitenoverflow getestet.

**Historienhinweis:** Die nachfolgenden Claude-Freigaben beziehen sich auf den
Stand bis Entwurf v5 und sind keine Freigabe der Gemini-Praezisierungen in v6.

## Review-Feedback von Claude

**Reviewstand:** 2026-08-06, `main`, HEAD `27b9264`. Planreview siehe
`FOKUSSIERTE_ABSCHLUSSHAERTUNG_PLAN.md` (C-P-01 bis C-P-15).

### 1. Prüfdimensionen

**Korrektheit vs. Akzeptanzkriterien.** Das Ziel „ohne optimistische Rundung"
ist nur halb abgedeckt: F5 belegt beide Fehlerrichtungen, der Slice adressiert
nur die Aufrundung von Konsumwerten (C-02).

**Vertragstreue.** Der Slice ist als Anzeigeslice deklariert, verändert aber
über die reale Drawdown-Aggregation den Ergebnisvertrag (C-01). Der Titel
„Risikoanzeigen" verdeckt eine Engine-/Vertragsänderung.

**Fehlerbehandlung.** Für den realen Drawdown ist der Fall „Inflationsreihe
für einen Lauf unvollständig" nicht geregelt. Nach der in Slice 1 gesetzten
`zeroPolicy` müsste das `null` mit Grund ergeben, nicht 0 – sonst entsteht
exakt das Fehlerbild aus F4 in einer neuen KPI.

**Seiteneffekte.** Die Dateiliste nennt Runner, Aggregates und Chunk-Result,
aber nicht `monte-carlo-runner-utils.js` (Buffer-Erzeugung) und nicht
`monte-carlo-contracts.js` (Projektion). Ohne beide ist eine neue
Aggregat-KPI nicht lieferbar.

**Was könnte brechen?** Die UI zeigt künftig zwei Drawdown-Werte, deren
Differenz (im Worst Case 90,34 zu 90,65 Prozent, im P10-Lauf 34,83 zu 52,84
Prozent) stark schwankt. Ohne identische Pfad- und Zeitgrenzen entsteht eine
neue, nicht erklärbare Kennzahl – im Abschnitt „Offene Risiken" richtig
benannt, aber nicht als AK verankert.

### 2. Findings

#### C-01 (Blocker, entspricht C-P-02) – Slice ist kein Anzeigeslice

`safety_real_drawdown_pct` existiert heute nur als Jahresfeld
(`simulator-year-result.js:328`). Als MC-Aggregat erfordert der reale
Drawdown einen eigenen Run-Buffer analog `maxDrawdowns`
(`monte-carlo-runner.js:950`), dessen Registrierung im fail-closed
Chunk-Vertrag (`monte-carlo-chunk-result.js:123`), die Aggregation
(`monte-carlo-aggregates.js:401`), die Projektion
(`monte-carlo-contracts.js:377`) und Worker-Parität. Damit wird der in
Slice 1 versionierte V2-Vertrag hier erneut erweitert.

Empfehlung: KPI-Erweiterung nach Slice 1 verschieben, Slice 2 auf Anzeige,
Benennung und Rundung begrenzen. Andernfalls Slice 1 als `V2-draft` führen.

#### C-02 (hoch, entspricht C-P-11) – Rundungsregel ist unvollständig

F5 zeigt neben der Aufrundung des Konsumwerts (13.331,39 → 15.000) auch die
Abrundung des Steuermedians (335.938,20 → 325.000) und die vollständige
Vernichtung der Verlustvortragsersparnis (331,01 → 0). Kosten- und
Belastungsgrößen werden durch „nicht aufrunden" nicht geschützt. Erforderlich
ist eine Tabelle KPI → konservative Richtung → Genauigkeit, die als Testorakel
dient. „Konservativ" heißt bei Nutzen abrunden, bei Kosten aufrunden.

#### C-03 (hoch, entspricht C-P-12) – Akzeptanztest ist zu schwach und nicht reproduzierbar

„13.331,39 EUR erscheint nicht mehr ausschließlich als 15.000 EUR" wird
bereits durch einen Tooltip erfüllt, obwohl der reale Fehler beim Lesen der
Ergebniskarte entstand. Zusätzlich ist der Wert personenbezogen und als
Fixture nicht verfügbar. Erforderlich: synthetisches Fixture plus
Invariantentest „angezeigter Nutzenwert ist niemals größer als der Messwert,
angezeigter Kostenwert niemals kleiner".

#### C-04 (mittel) – „sichtbar oder im Detail erreichbar" unterläuft das Slice-Ziel

Das AK lässt eine Lösung zu, bei der die Hauptkennzahl gerundet bleibt und der
exakte Wert nur im Detail steht. Genau diese Konstellation hat den
dokumentierten Fehler erzeugt. Empfehlung: Bei Downside-Kennzahlen ist der
exakte Wert die primäre Anzeige; der gerundete Wert entfällt oder tritt
nachrangig und gekennzeichnet daneben.

#### C-05 (mittel) – C2 und R6 sind nur textlich adressiert

„P10-Beispielpfad nennt sein Auswahlkriterium" und „Pflegevergleich bleibt
nicht kausal gekennzeichnet" sind Beschriftungsänderungen ohne Testorakel. Bei
Textänderungen greifen im Projekt Copy-Contract-Tests (vergleiche
`tests/balance-diagnosis-copy-contract.test.mjs`). Für die neuen Texte ist ein
gleichwertiger Contracttest vorzusehen, sonst verschwindet der Hinweis beim
nächsten Renderer-Refactoring unbemerkt.

#### C-06 (niedrig) – CAPE-Inaktivhinweis mit weichem Kriterium

„sofern dies ohne Scope-Erweiterung möglich ist" ist kein prüfbares Kriterium
und macht das AK unentscheidbar. Entweder verbindlich aufnehmen oder in die
NR-Tabelle des Plans verschieben.

### 3. Pre-Mortem

In drei Monaten trifft eine Entnahmeentscheidung erneut auf eine zu
freundliche Zahl – diesmal nicht bei P10, sondern bei einer Kosten- oder
Steuerkennzahl, die weiterhin nach unten gerundet wird (C-02). Alternativ
steht der exakte P10-Wert korrekt im Detail, wird aber wie zuvor nicht gelesen,
weil die Karte weiterhin den gerundeten Wert führt (C-04).

### 4. Review-Ergebnis

- **Status:** blockiert – nicht implementierungsreif
- **Blocker:** C-01 (Vertragsschnitt), C-03 (nicht reproduzierbares Orakel)
- **Restrisiken:** C-02, C-04, C-05, C-06; verbleibend das Risiko, dass der
  neue reale Drawdown eine zweite, plausibel wirkende, aber anders berechnete
  Risikokennzahl neben `safety_real_drawdown_pct` etabliert und beide Werte im
  selben Lauf abweichen

## Re-Review von Claude (zweite Runde)

**Reviewstand:** 2026-08-06. C-01 bis C-06 der ersten Runde sind gelöst. Das
verbindliche Rundungsorakel mit Nutzen-/Kostenrichtung je Kennzahl ist die
präziseste Korrektur der gesamten Runde: Es macht die Anforderung testbar und
schließt beide Fehlerrichtungen aus F5 ein. Der Slice ist jetzt tatsächlich ein
Anzeige-Slice, weil die gesamte Drawdown-Kette in Slice 1 liegt.

### Neues Finding

#### C-07 (niedrig, entspricht C-P-23) – Die Karten lesen Aggregate, nicht die V2-Projektion

`displayMonteCarloResults(aggregatedResults, …)`
(`app/simulator/simulator-monte-carlo.js:576`) übergibt die Aggregate direkt an
die UI; das V2-Dokument entsteht erst im Exportpfad. Die Akzeptanzkriterien
sprechen durchgängig vom „V2-Exaktwert" beziehungsweise „V2-Rohwert".

Festzulegen ist, welche Quelle die Karte tatsächlich liest und wie der
`null`-plus-Grund-Fall aus Slice 1 gerendert wird — als Strich mit Grund, nicht
als 0. Andernfalls entsteht in der UI genau das Fehlerbild aus F4, das Slice 1
im Export gerade beseitigt.

### Review-Ergebnis (zweite Runde)

- **Status:** freigegeben unter Vorbehalt – der Slice selbst enthält keinen
  Blocker; er bleibt jedoch durch die offenen Blocker in Slice 1 gesperrt
- **Blocker:** keine slice-eigenen
- **Restrisiken:** C-07; verbleibend, dass „exakt centgenau" auf der Karte bei
  Millionenbeträgen (Steuermedian, Endvermögen) die Lesbarkeit senkt. Das ist
  bewusst gewählt und für den Einzelnutzer vertretbar, sollte aber nach der
  ersten realen Nutzung überprüft werden.

## Abschliessende Freigabe durch Claude

**Reviewstand:** 2026-08-06. Die Erweiterung auf die 4,5-Prozent-Copy ist
geprüft und freigegeben.

Der Grund für die Ausweitung über die Ergebniskachel hinaus ist belegt: Die
Kennzahl ist eine **Optimierungsnebenbedingung**, nicht nur eine Anzeige.
`timeShareWRgt45` steuert Auswahl und Constraint im Auto-Optimizer
(`auto-optimize-evaluate.js:223, :233, :304`, `auto-optimize-metrics.js:81`,
`auto-optimize-renderer.js:255, :281`) und erscheint als Akzeptanzkriterium in
`Simulator.html:1304`.

Der `>`/`>=`-Punkt ist ebenfalls bestätigt: `colSharesAbove45` summiert in
`simulator-heatmap.js:187-192` ab `binIdx45` **einschließlich** des Intervalls
[4,5; 5,0). Die Kennzahl ist ein größer-gleich-Anteil, die Beschriftung sagt
„größer".

Entscheidend für die Freigabe der Dateiausweitung ist die Scope-Grenze „nur
sichtbare Copy, keine Änderung der Messlogik oder stabilen Metric-Keys".
Dadurch bleiben `auto-optimize-utils.js:62-63` und `auto_optimize.js:222`, die
denselben Key nur lesen und ihn ausschließlich in Fehlermeldungen benennen, zu
Recht außerhalb der Liste. Würde der Metric-Key umbenannt, wären beide Dateien
zwingend betroffen und die Liste erneut unvollständig — diese Grenze ist daher
im Slice einzuhalten.

### Review-Ergebnis (abschliessend)

- **Status:** freigegeben
- **Blocker:** keine
- **Offene Findings:** keine
- **Restrisiken:** Der Slice liegt bei zehn von zehn produktiven Dateien ohne
  Reserve; jede elfte Abhängigkeit muss die Stop-Regel auslösen. Die
  Metric-Key-Stabilität ist die Bedingung, unter der diese Zahl hält.

## Review-Antworten von Codex

Alle sieben slice-eigenen Findings sowie die Gesamtplan-Auflage C-P-29 werden
angenommen.

- C-01: Buffer, Aggregation, Missingness und V2-Projektion des realen Drawdowns
  wurden vollstaendig nach Slice 1 verschoben. Slice 2 ist jetzt ein reiner
  Anzeige-/Copy-Slice und darf die V2-Vertragsdateien nicht aendern.
- C-02: Eine verbindliche KPI-Tabelle definiert Typ, konservative Richtung und
  Anzeigegenauigkeit fuer beide in F5 belegten Fehlerrichtungen.
- C-03: Die persoenlichen Beispielwerte sind kein Testfixture. Synthetische
  Werte pruefen die Nutzen-/Kosteninvarianten reproduzierbar.
- C-04: Der exakte Wert ist auf der Karte primaer sichtbar. Ein Tooltip oder
  ein nur im Detail erreichbarer Wert reicht nicht mehr.
- C-05: Auswahlkriterium des P10-Pfads und Nicht-Kausalitaet des
  Pflegevergleichs erhalten ausdrueckliche Copy-Contract-Tests.
- C-06: Der CAPE-Inaktivhinweis wurde aus Scope und Akzeptanzkriterien entfernt
  und im Hauptplan bewusst als nicht realisierte UX-Erweiterung eingeordnet.
- C-07: Die Laufzeitquelle der Karten ist verbindlich `aggregatedResults`, nicht
  der Export-Envelope. Fehlende, nicht endliche oder nicht anwendbare Werte
  erscheinen als `—` mit stabilem Grund und Beobachtungszahl, niemals als 0.
- C-P-29: Die sichtbare 4,5-Prozent-Auswertung nennt jetzt realisierte
  Entnahmequote, Vergleichsoperator und reine Berichtsrolle. Die Heatmap-
  Klassenaggregation (`>= 4,5 %`) bleibt bewusst von der strikt-`>`-KPI-
  Zaehlung getrennt. Alle normalen sichtbaren Flaechen einschliesslich
  Auto-Optimize liegen mit hoechstens zehn produktiven Dateien in diesem
  Anzeige-Slice; V2 wird nicht erneut erweitert.
- G-P-03: Die Blockereinstufung wird abgelehnt. Drawdowns sind positive
  Verlustbetraege; gueltig ist `[0, 100]`, negative Werte scheitern fail-closed
  und eine optionale Grobanzeige rundet nur den positiven Betrag nach oben.
- G-P-06: Als nicht blockierende Auflage angenommen. Responsive Browsertests
  sichern grosse Exaktwerte und lange Labels gegen Layoutbruch.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| C-01 | Claude | Realer Drawdown ist Vertrags-/Engine-Änderung, nicht Anzeige | angenommen | vollstaendige KPI-Kette in Slice 1; Slice 2 nur Anzeige |
| C-02 | Claude | Rundungsregel schützt Kosten- und Belastungsgrößen nicht | angenommen | verbindliches KPI-Rundungsorakel ergaenzt |
| C-03 | Claude | Akzeptanztest durch Tooltip erfüllbar; Referenzwert personenbezogen | angenommen | synthetische Invariantentests statt Produktionswert |
| C-04 | Claude | „im Detail erreichbar" lässt die fehlerauslösende Darstellung zu | angenommen | Exaktwert primaer auf der Karte |
| C-05 | Claude | Neue Hinweistexte ohne Copy-Contract-Test | angenommen | zwei Copy-Contracts verbindlich |
| C-06 | Claude | CAPE-Inaktivhinweis mit unentscheidbarem Kriterium | angenommen | aus Slice entfernt und als Nicht-Umsetzung dokumentiert |
| C-07 | Claude (Re-Review) | Karten lesen Aggregate statt V2-Projektion; Missingness-Rendering offen | angenommen | Aggregat als Quelle; `—` plus Grund/Count, niemals 0 |
| C-P-29 | Claude (4. Gesamtplan-Runde) | 4,5-Prozent-KPI/Heatmap verschweigen die realisierte Quotenbasis und wirken wie die Strategie-/Guardrail-Schwelle | angenommen | sichtbare Basis-, `>`-/`>=`- und Berichtsrollen-Copy in Ergebnissen, Heatmap und Auto-Optimize |
| G-P-03 | Gemini | negative Drawdownwerte koennten durch mathematisches Aufrunden optimistisch werden | Blockereinstufung abgelehnt; Domaene praezisiert | positive Verlustbetraege `[0, 100]`; negative Werte fail-closed; Betrag konservativ runden |
| G-P-06 | Gemini | centgenaue grosse Werte koennen Kartenlayout brechen | angenommen, nicht blockierend | Browsertests bei 320 Pixel und Desktop-Viewport ohne Clipping/Overflow |
