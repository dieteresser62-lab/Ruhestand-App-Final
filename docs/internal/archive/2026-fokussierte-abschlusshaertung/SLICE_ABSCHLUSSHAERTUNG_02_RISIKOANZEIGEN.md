# Slice Abschlusshaertung 02: Wahrheitsgetreue Risikoanzeigen

**Feature-Branch:** `codex/fokussierte-abschlusshaertung`<br>
**GitHub-Status:** lokaler Feature-Branch; nicht veroeffentlicht, da keine Push-Freigabe vorliegt<br>
**Status:** am 2026-08-07 implementiert und intern validiert; die Findings CR2-01 bis CR2-06 aus dem blockierenden Claude-Code-Review sind nachgebessert und im Claude-Code-Re-Review vom 2026-08-07 einzeln nachgemessen bestaetigt; Ergebnis **freigegeben**, offen bleiben CR2-07 (mittel), CR2-08 und CR2-09 (niedrig); Slice 1 ist mit Commit `55bdd84` die saubere Baseline; Gemini-Re-Review von Entwurf v6 wird nicht als erfolgt dargestellt<br>
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
| P10/P50/P90-Endvermoegen in der Summary | Nutzen/finanzieller Spielraum | centgenaue, bei Untercent-Werten abwaerts gerichtete EUR-Anzeige | nur kleiner oder gleich Messwert |
| reale Depotentnahme P10 | Nutzen/Konsummoeglichkeit | exakter EUR-Wert auf der Karte | nur kleiner oder gleich Messwert |
| Median der Run-P10-Entnahmen | Nutzen/Konsummoeglichkeit | exakter EUR-Wert in derselben sichtbaren Karte/Zeile | nur kleiner oder gleich Messwert |
| Median kumulierter Steuern | Kosten/Belastung | exakter EUR-Wert auf der Karte | nur groesser oder gleich Messwert |
| durchschnittliche Steuerersparnis aus Verlustvortrag | Nutzen | exakter EUR-Wert auf der Karte; ein positiver Messwert darf nicht als 0 verschwinden | nur kleiner oder gleich Messwert, aber nicht anstelle des Exaktwerts |
| nominaler/reeller Maximum-Drawdown | positiver Verlustbetrag in Prozentpunkten, Domaene `[0, 100]` | exakter validierter Aggregatwert mit eindeutiger Preisbasis | positiven Verlustbetrag nur groesser oder gleich Messwert |

„Exakt“ bedeutet fuer EUR-Betraege die kleinste sichtbare Einheit Cent mit
deutschem Zahlenformat und fuer Prozentpunkte mindestens zwei Nachkommastellen.
Hat ein Aggregat mehr Nachkommastellen, wird bereits die primaere Anzeige in
konservativer Richtung quantisiert: Nutzen abwaerts, Kosten und positive
Verlustbetraege aufwaerts. Dadurch darf die Anzeige nie guenstiger als der
Messwert erscheinen.

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

**Implementierungsstand:** Der Nutzer hat den Start am 2026-08-07 ausdruecklich
freigegeben. Slice 1 ist mit Commit `55bdd84` abgeschlossen; dessen V2-
Messcontract und validierte Aggregate sind verbindliche Eingangsgrößen. Das
zuvor noch offene Gemini-Re-Review von Entwurf v6 wird nicht als erfolgt
dargestellt.

```text
git branch --show-current: codex/fokussierte-abschlusshaertung
git status --short: sauber (keine Ausgabe vor dem ersten Slice-2-Edit)

Geplante Dateien:
- app/simulator/results-metrics.js
- app/simulator/results-renderers.js
- app/simulator/simulator-utils.js
- app/simulator/simulator-results.js
- app/simulator/scenario-analyzer.js
- app/simulator/simulator-heatmap.js
- Simulator.html
- app/simulator/auto-optimize-metrics.js
- app/simulator/auto-optimize-evaluate.js
- app/simulator/auto-optimize-renderer.js

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

- `results-metrics.js` projiziert P10/P50/P90-Endvermoegen, die reale
  Depotentnahme P10, den Median der Run-P10-Entnahmen, den Median kumulierter
  Steuern und die durchschnittliche Verlustvortragsersparnis centgenau aus
  `aggregatedResults`. Untercent-Werte werden fuer Nutzen abwaerts und fuer
  Kosten aufwaerts gerichtet. Die Werte bleiben auch in der einfachen
  Ergebnisansicht unmittelbar sichtbar; die fruehere kaufmaennische
  5.000-/10.000-/25.000-Euro-Stufenrundung der Summary ist entfernt.
- Nominaler und realer Maximum-Drawdown werden als zwei Paare fuer Median und
  P90 mit eindeutiger Preisbasis angezeigt. Die UI uebernimmt ausschliesslich
  validierte Aggregate, akzeptiert 0 bis 100 Prozent einschliesslich und zeigt
  bei Contractverletzung, Missingness oder Nichtanwendbarkeit einen
  Gedankenstrich mit stabilem Grund und gemessener Beobachtungszahl. Fehlt die
  Zahl im Aggregat, steht dort `unbekannt` statt einer erfundenen Null. Bei
  mehreren Missingness-Ursachen wird der zaehlerisch dominante Grund genannt.
  Die UI verwendet weder `Math.abs` noch ein stilles Klemmen oder eine eigene
  Drawdownberechnung. Positive Verlustbetraege mit mehr als zwei Dezimalstellen
  werden zur Anzeige aufwaerts gerichtet.
- `results-renderers.js` unterstuetzt Exaktwertkarten mit sichtbarem Zweitwert,
  Statuszeilen und einer eigenen Drawdown-Paarmatrix. Der Hinweis zur reinen
  Berichtsrolle der 4,5-Prozent-Auswertung liegt ausserhalb einklappbarer
  Detailbereiche.
- `scenario-analyzer.js` nennt den P10-Beispielpfad als „P10 des nominalen
  Endvermoegens“. Der Pflege-Gruppenvergleich ist im Kartentitel und in der
  Beschreibung sichtbar als nicht kausal und ungepaart gekennzeichnet.
- Ergebniskarte, Auto-Optimize-Konfiguration, -Constraint, -Fehlertext und
  -Ergebnis nennen die realisierte Entnahmequote strikt groesser 4,5 Prozent
  und ihre Rolle als Berichtsreferenz. Die Heatmap nennt wegen ihrer
  Klassenbildung ausdruecklich groesser/gleich 4,5 Prozent und trennt davon den
  strikt-groesser-Gesamtwert. Stabile Metric-Keys und Berechnung blieben
  unveraendert.
- Die responsive Darstellung laesst Werte, alle KPI-/Summary-Titel und lange
  Preisbasislabels umbrechen. Die Drawdownpaare stehen bei Desktopbreite
  zweispaltig und bei 320 Pixel einspaltig; Formularfelder, Header,
  Exportaktionen und Heatmap bleiben innerhalb ihrer Container. Breite
  Szenariotabellen scrollen lokal, statt die Seite zu verbreitern.
- Synthetische Node- und Browsertests sichern Exaktwerte mit Untercent-
  beziehungsweise zusaetzlicher Prozentpraezision, konservative Richtung,
  Domaene, Missingness-/Applicability-Projektion, dominante Gruende,
  Operatoren, Rollenhinweise, Auswahlkriterium, Nichtkausalitaet und das
  responsive Layout der echten Seite sowie der Ergebnis-DOM-Fixture.

## Ausgefuehrte Tests mit Ergebnis

Alle folgenden Gates wurden am 2026-08-07 erfolgreich ausgefuehrt:

- fokussiert: `results-metrics`, `results-renderers`, `simulator-heatmap`,
  `scenario-analyzer`, `auto-optimize-metrics-contract`, `auto-optimizer`,
  `slice-02-risk-display-copy-contract`, `formatting` und
  `monte-carlo-measurement-contract`;
- `npm run test:browser`: 29 von 29 Workflows bestanden, einschliesslich der
  neuen Exaktwert-/Drawdown-Fixture bei Desktopbreite und 320 Pixel sowie der
  echten vollstaendigen Simulatorseite nach einem Lauf bei 320 Pixel;
- `npm test`: 168 Testdateien, 19.222 von 19.222 Assertions, 0 fehlgeschlagene
  Dateien, separates Gate bestanden, 0 offene Handles;
- `git diff --check`: ohne Whitespacefehler.

`npm run build:engine` war nicht erforderlich, weil weder `engine/` noch die
oeffentliche `EngineAPI` oder ein Engine-Contract geaendert wurden.

## Abweichungen vom Plan

Der Nutzer hat den Start trotz des formal noch ausstehenden Gemini-Re-Reviews
von Entwurf v6 ausdruecklich autorisiert. Wie bereits bei Slice 1 wird daraus
keine nicht erfolgte Reviewer-Freigabe abgeleitet. Branch, saubere Baseline und
Cross-Slice-Rollback sind vor dem ersten Code-Edit dokumentiert.

Tatsaechlich wurden acht statt der voraussichtlich geplanten zehn produktiven
Dateien geaendert. `simulator-utils.js` und `simulator-results.js` waren fuer
den bestehenden View-Model-/Renderer-Schnitt nicht erforderlich und blieben
unangetastet. Dadurch entfaellt insbesondere ein Diff-Konflikt mit den dort
liegenden Slice-1-Szenarioexport-Hunks. V2-, Runner-, Buffer-, Chunk- und
Aggregationsdateien blieben unveraendert.

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
- Das responsive Gate prueft synthetische Extremwerte in zwei definierten
  Viewports und die vollstaendige reale Simulatorseite nach einem Lauf bei
  320 Pixel. Es ist keine formale Barrierefreiheits- oder Vollgeraete-
  Zertifizierung.
- Die Implementierung ist intern testgruen, aber noch nicht durch einen
  unabhaengigen Reviewer fachlich beziehungsweise technisch abgenommen.

## Rueckdokumentation

Hauptplan, `README.md`, technische Simulator-Referenz, Moduluebersicht und
`tests/README.md` wurden auf den tatsaechlichen Slice-Stand synchronisiert.
Eine Aenderung des Nutzerworkflows im Handbuch war nicht erforderlich: Die
Bedienfolge bleibt gleich; geaendert wurden Genauigkeit, Benennung und
Fail-Closed-Anzeige bestehender Ergebnisflaechen.

## Freigabestatus

Vom Nutzer am 2026-08-07 zur Umsetzung freigegeben. Claude hat Entwurf v5
einschliesslich der 4,5-Prozent-Erweiterung freigegeben; die nachfolgende
Praezisierung v6 zu G-P-03/G-P-06 ist eingearbeitet, aber nicht erneut durch
Gemini freigegeben. Die Implementierung einschliesslich der Nachbesserung von
CR2-01 bis CR2-06 ist abgeschlossen und intern validiert, aber die
Nachbesserung ist noch nicht extern abgenommen. Sie darf durch Codex nicht
selbst als fachlich freigegeben markiert werden.

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
| CR2-01 | Claude (Code-Review) | Endvermoegens-Summarykarten runden weiter kaufmaennisch auf 25.000-Euro-Stufen und ueberzeichnen den P10-Nutzenwert um bis zu 12.500 Euro | angenommen und nachgebessert; externe Re-Review ausstehend | Summary-Endvermoegen wird centgenau und bei Untercent-Nutzenwerten abwaerts gerichtet angezeigt; Stufenrundung entfernt |
| CR2-02 | Claude (Code-Review) | Neu benannte Kartentitel werden per `text-overflow: ellipsis` abgeschnitten; der Nichtkausalitaetsmarker ist im Titel unsichtbar | angenommen und nachgebessert; externe Re-Review ausstehend | alle KPI-/Summary-Titel duerfen umbrechen; Nichtkausalitaets- und 4,5-Prozent-Titel bleiben vollstaendig sichtbar |
| CR2-03 | Claude (Code-Review) | Copy-Contract prueft Quelltextstrings, Layouttest nur Exaktwertkarten und einen synthetischen Body; beide koennen CR2-02 und realen Seitenoverflow nicht sehen | angenommen und nachgebessert; externe Re-Review ausstehend | Browsergate prueft sichtbare Titel im gerenderten DOM und die echte vollstaendige Simulatorseite nach einem Lauf bei 320 Pixel |
| CR2-04 | Claude (Code-Review) | Zweistellige Prozent- und Centanzeige ist nicht garantiert konservativ; Fixtures nutzen nur exakt darstellbare Werte | angenommen und nachgebessert; externe Re-Review ausstehend | richtungsgebundene Cent-/Prozentpunkt-Quantisierung mit adversarialen Zusatzdezimal-Fixtures |
| CR2-05 | Claude (Code-Review) | „Beobachtungen: 0 Laeufe" ist ein `?? 0`-Fallback ohne Messung und wird vom neuen Test als Sollwert fixiert | angenommen und nachgebessert; externe Re-Review ausstehend | fehlende Beobachtungszahl erscheint als `unbekannt`; echte Null bleibt von unbekannt unterscheidbar |
| CR2-06 | Claude (Code-Review) | `activeMissingnessReason` meldet den ersten statt des dominanten Missingness-Grunds | angenommen und nachgebessert; im Re-Review bestaetigt | Missingness-Zaehler werden grundweise aggregiert; der groesste Zaehler entscheidet deterministisch |
| CR2-07 | Claude (Code-Re-Review) | Pflegekarten runden weiter kaufmaennisch auf 25.000-Euro-Stufen; beide Fehlerrichtungen aus F5 bleiben dort offen | offen (mittel) | - |
| CR2-08 | Claude (Code-Re-Review) | `inspectFullSimulatorLayout` berechnet drei Ueberlauflisten, assertiert aber keine davon | offen (niedrig) | - |
| CR2-09 | Claude (Code-Re-Review) | Heatmap-Achsenkopie rendert bei 320 Pixel mit effektiv 2,52 px; `overflow: hidden` unterdrueckt statt lesbar zu machen | offen (niedrig) | - |

## Code-Review von Claude

**Reviewstand:** 2026-08-07, Branch `codex/fokussierte-abschlusshaertung`, Baseline
Commit `55bdd84`, Arbeitsbaum uncommitted. Geprueft wurden acht produktive
Dateien, sechs Testdateien und ein neuer Copy-Contract-Test.

### 1. Prüfdimensionen

**Korrektheit vs. Akzeptanzkriterien.** Die vier Kennzahlen der Orakeltabelle
sind centgenau umgesetzt. Die Tabelle ist jedoch nicht die einzige Bindung: Das
AK „Ein grob gerundeter Wert darf nur nachrangig, klar als gerundet und in der
fuer die Kennzahl konservativen Richtung erscheinen" ist unskopiert formuliert
und wird von den Endvermoegens-Summarykarten verletzt (CR2-01).

**Vertragstreue.** Der Slice ist tatsaechlich ein reiner Anzeige-/Copy-Slice.
Keine der in Slice 1 eingefrorenen V2-Dateien (`monte-carlo-runner.js`,
`monte-carlo-runner-utils.js`, `monte-carlo-aggregates.js`,
`monte-carlo-chunk-result.js`, `monte-carlo-contracts.js`,
`monte-carlo-export.js`) ist geaendert. Stabile Metric-Keys
(`timeShareWRgt45`, `TimeShare_WR_gt_4_5`, `ao_c_ts45`) sind erhalten; die
Scope-Grenze der abschliessenden Planfreigabe haelt. Acht statt zehn produktive
Dateien, `simulator-utils.js` und `simulator-results.js` unangetastet, damit
kein Diff-Konflikt mit den Slice-1-Hunks.

**Fehlerbehandlung.** `buildDrawdownCard` prueft Applicability, Endlichkeit und
Domaene `[0, 100]` und repariert nichts per `Math.abs`. Der Nullwert `0` ist
korrekt als gueltig zugelassen und von Missingness unterschieden.
Reason-Ableitung und Beobachtungszahl sind jedoch teilweise geraten statt
gemessen (CR2-05, CR2-06).

**Seiteneffekte.** `buildKpiDashboard` liefert mit `drawdownKpis` und
`reportingReferenceNotice` zwei neue Top-Level-Felder; einziger produktiver
Konsument ist `prepareMonteCarloViewModel` → `simulator-results.js:90`.
`buildDrawdownKpis` ist jetzt unbedingt und erzeugt auch ohne Aggregat vier
Karten mit `—`; das ist fail-closed korrekt. `renderStressSection` nutzt
`renderKpiCard`, der neue Zweitwert der Stress-Karte geht also nicht verloren.

**Was könnte brechen?** Die gesamte Sichtbarkeitszusage des Slice haengt an
einer CSS-Klasse, die nur auf vier Kartentypen gesetzt ist. Alle uebrigen
Karten behalten `white-space: nowrap; overflow: hidden; text-overflow:
ellipsis` — und genau dort liegen die neu verlaengerten Beschriftungen
(CR2-02).

### 2. Findings

#### CR2-01 (Blocker) – Das Rundungsanti-Pattern bleibt auf der prominentesten Karte stehen

`buildSummaryData` formatiert `Median (alle)`, `Median (erfolgreiche)` und
`10%/90% Perzentil` weiterhin mit `formatCurrencyRounded`
(`app/simulator/results-metrics.js:79`, `:85`, `:91`). Diese Funktion rundet
**kaufmaennisch** auf Stufen von 25.000 Euro ab 200.000 Euro,
10.000 Euro ab 50.000 Euro und 5.000 Euro ab 10.000 Euro
(`app/shared/shared-formatting.js:44-60`).

Gemessen:

| Messwert | Anzeige | Abweichung |
| --- | --- | --- |
| 487.501 € | 500.000 € | +12.499 € |
| 212.500 € | 225.000 € | +12.500 € (+5,9 %) |
| 55.000 € | 60.000 € | +5.000 € (+9,1 %) |
| 490.000 € | 500.000 € | +10.000 € |

Das P10-Endvermoegen ist der konservative Planungswert und damit eine
Nutzengroesse. Er wird nach **oben** verzerrt — dieselbe Fehlerrichtung wie in
F5, nur auf einer anderen Kennzahl. Der Wert ist primaere Anzeige und nicht als
gerundet gekennzeichnet; damit sind alle drei Bedingungen des AK verletzt.

Verschaerfend: Auf demselben Summary-Grid steht nach diesem Slice
`Median Steuern` centgenau als `12.345.678,90 €`. Die neue Praezision der einen
Karte erzeugt die Erwartung, auch die Nachbarwerte seien exakt. Vor dem Slice
war das Grid einheitlich grob — jetzt ist es uneinheitlich und unbeschriftet.

Falls die Orakeltabelle bewusst abschliessend gemeint ist, faellt der Befund von
Blocker auf „hoch"; dann muss die Nichtbehandlung des Endvermoegens aber
ausdruecklich als bewusste Nichtumsetzung dokumentiert werden, statt implizit zu
bleiben. Diese Entscheidung liegt beim Nutzer, nicht bei der Implementierung.

#### CR2-02 (mittel) – Die neu benannten Kartentitel werden abgeschnitten

`layout: 'exact-risk'` ist nur auf den Exaktwert- und Drawdownkarten gesetzt.
Alle uebrigen `.kpi-card strong` behalten die Regel aus `simulator.css:759-769`
(`white-space: nowrap; overflow: hidden; text-overflow: ellipsis`). Gemessen in
Chromium gegen die reale `Simulator.html`:

| Viewport | Titel | Benoetigt/Verfuegbar | Sichtbar |
| --- | --- | --- | --- |
| 1366 px | `Gruppenmedian-Differenz (nicht kausal)` | 256/166 px | `Gruppenmedian-Differen…` |
| 320 px | `Zeitanteil realisierte Entnahmequote > 4,5 %` | 282/117 px | `Zeitanteil realisier…` |

Damit ist die Aussage im Abschnitt „Durchgefuehrte Änderungen", der
Pflege-Gruppenvergleich sei „im Kartentitel und in der Beschreibung sichtbar als
nicht kausal … gekennzeichnet", fuer den Kartentitel unzutreffend. Das AK selbst
bleibt erfuellt, weil `.kpi-description` umbricht und den vollstaendigen Hinweis
sichtbar traegt; die Titelaenderung ist aber wirkungslos und die Dokumentation
ueberzeichnet sie. Kein Blocker, aber eine falsche Zusage im Arbeitsdokument.

#### CR2-03 (mittel) – Beide neuen Gates koennen CR2-02 strukturell nicht sehen

`tests/slice-02-risk-display-copy-contract.test.mjs` liest die Quelldateien mit
`fs.readFileSync` und prueft `includes(...)`. Er belegt, dass ein String im Code
steht, nicht dass er gerendert lesbar ist.

Der Browser-Layouttest filtert in `inspectSyntheticRiskLayout` auf
`.kpi-exact-value, .summary-exact-value` — also genau die Karten, die per
Konstruktion nicht abschneiden. Zusaetzlich ersetzt
`renderSyntheticRiskDisplayFixture` den kompletten `document.body` durch die
Ergebnisregion. Die Assertion `documentWidth <= viewportWidth` misst deshalb
einen synthetischen Body. Gegen die unveraenderte Seite gemessen betraegt
`document.documentElement.scrollWidth` bei 320 px Viewport **598 px**; das AK
„die Seite erzeugt keinen horizontalen Overflow" ist so nicht abgesichert.

Die Fixture enthaelt ausserdem keine Pflegekarten, sodass der C-05-Copy-Contract
im DOM nie geprueft wird.

#### CR2-04 (niedrig) – Die zweistellige Anzeige ist nicht garantiert konservativ

`formatNumberWithUnit(value, '%', 2)` nutzt `toFixed(2)`
(`app/shared/shared-formatting.js:112-119`). Die Drawdown-Aggregate stammen aus
`Float32Array`-Puffern und tragen mehr Stellen; ein Messwert von 34,2549 wird zu
`34,25 %` und liegt damit **unter** dem Messwert, obwohl das Orakel fuer
Verlustbetraege „nur groesser oder gleich Messwert" fordert. Analog rundet
`Intl.NumberFormat` den Steuermedian bis zu 0,5 Cent nach unten, obwohl die
Kostenrichtung Aufrunden verlangt.

Die Testfixtures verwenden ausschliesslich binaer exakt darstellbare Werte
(`0`, `34.25`, `35.5`, `100`, `12345678.9`, `331.01`). Die Orakelrichtung wird
dadurch nie geprueft. Betrag hoechstens 0,005 Prozentpunkte beziehungsweise
0,5 Cent — nicht entscheidungsrelevant, aber eine ungepruefte Vertragsabweichung.

#### CR2-05 (niedrig) – „Beobachtungen: 0 Laeufe" ist ein Fallback, keine Messung

`observationCount()` und `drawdownObservationCount()` liefern `count ?? 0`.
`taxOutcomes` (`monte-carlo-aggregates.js:447`) und `lossCarryTaxSavings`
(`:501-504`) fuehren weder `sampleSize` noch `observationCount`. Beide sind
heute immer endlich, der `—`-Pfad ist also produktiv nicht erreichbar. Sobald
eine Folge-Slice sie im Sinne von F4 fail-closed auf `null` plus Grund
umstellt, behauptet die Karte fuer einen 10.000-Laeufe-Lauf „Beobachtungen:
0 Laeufe". Der neue Test fixiert diese Null als Sollverhalten
(`tests/results-metrics.test.mjs`, `statusLine.includes('Beobachtungen: 0')`).
Eine fehlende Zahl sollte als `unbekannt` erscheinen, nicht als gemessene Null.
Dasselbe gilt fuer das Literal `'Grund: no_observations · Beobachtungen: 0 Jahre'`
in `buildRiskKpis`.

#### CR2-06 (niedrig) – Der gemeldete Missingness-Grund ist der erste, nicht der dominante

`activeMissingnessReason` nimmt via `Object.entries(...).find(...)` den ersten
Eintrag mit Zaehlstand groesser null. Die Inventarreihenfolge aus
`buildRealDrawdownDistribution` lautet `missing_inflation`, `no_observations`,
`technical_error`. Bei 999 technischen Fehlern und einer fehlenden
Inflationsreihe nennt die Karte `Grund: missing_inflation`. Sinnvoll waere der
Grund mit dem hoechsten Zaehlstand oder die vollstaendige Aufzaehlung.

### 3. Nachweislich korrekt geprüft und nicht beanstandet

- Nominaler und realer Drawdown teilen **pro Lauf** tatsaechlich Pfad und
  Zeitgitter: `depotWertHistorie` und `depotWertHistorieReal` starten beide bei
  `initialPortfolioTotal` und werden in derselben Schleifeniteration befuellt
  (`monte-carlo-runner.js:481-482`, `:841-850`); beide laufen durch
  `computeRunStatsFromSeries` (`:969-972`). Die Formulierung „gleicher Laufpfad
  und Zeitraum" steht allerdings auf **Quantilkarten**: nominaler und realer
  Median sind Ordnungsstatistiken zweier getrennt sortierter Verteilungen und
  stammen im Allgemeinen aus verschiedenen Laeufen. Restrisiko, kein Finding.
- Der `>`/`>=`-Schnitt ist sauber getrennt: Der Footer-Wert `kpi1` speist sich
  aus `extraKPI.timeShareQuoteAbove45` (strikt `>`), die Overlay-Beschriftung
  benennt `colSharesAbove45` ab `binIdx45` als bin-basiertes `≥`
  (`simulator-heatmap.js:187-192`, `:329-338`).
- Der Rollenhinweis liegt ausserhalb einklappbarer Bereiche: `renderKpiDashboard`
  gibt `reporting-reference-note` vor dem `<details>`-Block aus
  (`results-renderers.js:75-84`).
- Die Spezifitaet der neuen CSS-Regeln traegt: `.kpi-card.kpi-exact-value>strong`
  (0,2,1) schlaegt `.kpi-card strong` (0,1,1) unabhaengig von der Quellreihenfolge.
- Keine stille Orakelschwaechung im Testdiff. Entfernte Assertions wurden durch
  strengere ersetzt: `includes('10.000')` → `assertEqual('12.345,67 €')`.

### 4. Unabhängig verifizierte Gates

- `npm test`: 19.211 von 19.211 Assertions, 0 fehlgeschlagene Dateien,
  0 offene Handles — deckt sich mit der Angabe im Arbeitsdokument.
- `npm run test:browser`: Exitcode 0, 29 bestandene Workflows.
- `git diff --check`: ohne Befund.
- Dateiumfang: acht produktive Dateien, keine V2-Vertragsdatei beruehrt.

### 5. Pre-Mortem

In drei Monaten liest der Nutzer auf der Ergebniskarte ein P10-Endvermoegen von
`225.000 €`, plant damit eine Entnahmeentscheidung und stellt spaeter fest, dass
der Messwert `212.500 €` war. Er hat die Zahl fuer exakt gehalten, weil die
Steuerkarte direkt daneben nach diesem Slice centgenau ausgewiesen wird
(CR2-01). Die zweitwahrscheinlichste Ursache: Ein Renderer-Refactoring kuerzt
eine Karte, und der Copy-Contract bleibt gruen, weil er den Quelltextstring und
nicht das gerenderte DOM prueft (CR2-03).

### 6. Review-Ergebnis

- **Status:** blockiert
- **Blocker:** CR2-01 — die Endvermoegens-Summarykarten runden einen Nutzenwert
  weiterhin nicht konservativ nach oben auf und sind nicht als gerundet
  gekennzeichnet; alternativ ist die Nichtbehandlung ausdruecklich als bewusste
  Nichtumsetzung zu dokumentieren und vom Nutzer zu bestaetigen
- **Restrisiken:** CR2-02 bis CR2-06; verbleibend, dass die Paardarstellung
  nominal/real den Eindruck erweckt, beide Mediane beschrieben denselben Pfad,
  und dass die Sichtbarkeitszusage des Slice an einer CSS-Klasse haengt, die von
  keinem Gate ausserhalb der vier Exaktwertkarten geprueft wird

## Nachbesserung nach dem Claude-Code-Review

**Stand:** 2026-08-07. Dieser Abschnitt dokumentiert die Reaktion auf das oben
unveraendert erhaltene blockierende Review. Er ist keine Freigabe durch Codex;
Claude beziehungsweise ein anderer unabhaengiger Reviewer muss die
Nachbesserung erneut pruefen.

- **CR2-01:** `buildSummaryData()` verwendet fuer Median und P10/P90-
  Endvermoegen keine Grobstufen mehr. Nutzenwerte werden auf Cent abwaerts
  gerichtet und damit niemals hoeher als der Messwert angezeigt.
- **CR2-02:** Die Abschneideregel ist fuer alle KPI- und Summary-Titel
  aufgehoben. Lange Titel duerfen umbrechen; insbesondere bleiben
  `Gruppenmedian-Differenz (nicht kausal)` und die 4,5-Prozent-Beschriftung
  vollstaendig sichtbar.
- **CR2-03:** Das Browsergate prueft die beiden langen Titel im tatsaechlich
  gerenderten Ergebnis-DOM. Zusaetzlich misst es die vollstaendige reale
  Simulatorseite nach einem Monte-Carlo-Lauf bei 320 Pixel. Die Seite bleibt
  ohne horizontalen Overflow; die breite Szenariotabelle scrollt nur in ihrem
  eigenen Container.
- **CR2-04:** EUR-Nutzenwerte werden zur Centanzeige abwaerts, EUR-Kostenwerte
  aufwaerts und positive Verlustbetraege zur Hundertstel-Prozentpunktanzeige
  aufwaerts quantisiert. Tests verwenden bewusst Werte mit weiteren
  Dezimalstellen, beispielsweise `34,2549` Prozent.
- **CR2-05:** Fehlende Observation-Counts werden als `unbekannt` ausgegeben.
  Eine gemessene Null bleibt weiterhin eine Null; sie wird nicht mit
  Unbekanntheit vermischt.
- **CR2-06:** Missingness-Gruende werden ueber die vorhandenen Inventare nach
  ihren Zaehlern zusammengefuehrt. Der Grund mit dem groessten Zaehler wird
  deterministisch angezeigt; ein Test sichert `technical_error: 999` gegen
  `missing_inflation: 1`.

### Validierung der Nachbesserung

- `node tests/run-single.mjs tests/results-metrics.test.mjs`: 95 von 95
  Assertions bestanden;
- `node tests/run-single.mjs tests/results-renderers.test.mjs`: 31 von 31
  Assertions bestanden;
- `node tests/run-single.mjs tests/slice-02-risk-display-copy-contract.test.mjs`:
  15 von 15 Assertions bestanden;
- `node tests/run-single.mjs tests/simulator-heatmap.test.mjs`: 22 von 22
  Assertions bestanden;
- `npm run test:browser`: 29 von 29 Workflows bestanden;
- `npm test`: 168 Testdateien, 19.222 von 19.222 Assertions,
  0 fehlgeschlagene Dateien, separates Gate bestanden, 0 offene Handles.

Die Zwischenmessung der echten 320-Pixel-Seite machte zunaechst vorhandenen
Seitenoverflow sichtbar. Dessen Ursachen lagen in den intrinsischen
Mindestbreiten eingeklappter Fieldsets, Header-/Formularcontainern und zuletzt
der Exportaktionszeile. Diese Stellen wurden eingegrenzt und korrigiert; erst
der danach gruen durchlaufene Vollseitencheck ist der Abschlussnachweis.

## Code-Re-Review von Claude

**Reviewstand:** 2026-08-07, Branch `codex/fokussierte-abschlusshaertung`,
Baseline `55bdd84`. Jede Nachbesserung wurde nachgemessen, nicht nur gelesen.

### 1. Verifikation der Findings CR2-01 bis CR2-06

**CR2-01 (Blocker) – behoben.** `formatCurrencyRounded` ist aus allen Karten der
Orakeltabelle entfernt. An seine Stelle tritt
`formatConservativeCurrency(value, direction)` mit `roundConservatively`
(`Math.floor` fuer Nutzen, `Math.ceil` fuer Kosten auf Centebene) und
`stabilizeScaledValue` als Schutz gegen binaeres Darstellungsrauschen. Ohne
diesen Stabilisator haette `12345.67 * 100` als `1234566.9999999999`
abgerundet `12.345,66 €` ergeben; der Schutz ist also notwendig und korrekt
platziert.

Nachgerechnet fuer alle Werte des urspruenglichen Findings sowie Randfaelle:

| Eingabe | Richtung | Anzeige | Orakel |
| --- | --- | --- | --- |
| 487.501 € | Nutzen | 487.501,00 € | eingehalten |
| 212.500 € | Nutzen | 212.500,00 € | eingehalten |
| 55.000 € | Nutzen | 55.000,00 € | eingehalten |
| 100.000,009 € | Nutzen | 100.000,00 € | eingehalten |
| minus 1.234,567 € | Nutzen | minus 1.234,57 € | eingehalten |
| 335.938,204 € | Kosten | 335.938,21 € | eingehalten |

Die Testfixtures fixieren exakt die Werte, mit denen das Finding belegt wurde
(487.501, 212.500, 55.000, 490.000). Der Blocker ist an der Ursache geschlossen,
nicht umgangen.

**CR2-02 – behoben.** Die Regel `.kpi-card>strong, .summary-item>strong` hebt
`white-space: nowrap` und `text-overflow: ellipsis` global auf, nicht nur fuer
die Exaktwertkarten. Eigene Messung in Chromium gegen die reale
`Simulator.html` mit allen elf Pflegekarten: **0 abgeschnittene Titel** bei
1366 px und bei 320 px. Zuvor gemessen: `Gruppenmedian-Differen…` (256/166 px)
und `Zeitanteil realisier…` (282/117 px).

**CR2-03 – behoben, beide Haelften.** Die synthetische Fixture enthaelt jetzt
Pflegekarten, oeffnet den `<details>`-Block und prueft mit
`clippedCopyTitleCount === 0` **alle** `.kpi-card > strong`, zusaetzlich mit
exaktem Titelvergleich `hasVisibleCareNonCausalTitle` und
`hasVisibleWithdrawalRateTitle`. Der neue `inspectFullSimulatorLayout` laeuft
gegen die **unveraenderte** Seite nach einem abgeschlossenen Lauf bei 320 px.
Eigene Kontrollmessung der realen Seite: `documentWidth` 320, `bodyWidth` 320
— zuvor 598 px. Die Ursachen wurden strukturell behoben (`min-width: 0` auf
Layout-, Fieldset- und Pflegecontainern, scrollbare Tableiste, umbruchfaehige
Exportzeile), nicht per `overflow: hidden` kaschiert.

**CR2-04 – behoben.** Prozentpunkte laufen ueber
`roundConservatively(value, 2, 'cost')`. Nachgerechnet: 34,2549 wird 34,26 %;
48,125 wird 48,13 %; 0,001 wird 0,01 %, waehrend 0, 34,25, 35,5 und 100
unveraendert bleiben. Ein adversariales Fixture mit Zusatzdezimalen ist
ergaenzt; die Fixtures bestehen nicht mehr nur aus binaer exakt darstellbaren
Werten.

**CR2-05 – behoben.** `observationCount` liefert `null` statt `0`,
`formatObservationCount` rendert daraus `unbekannt`. Die echte gemessene Null
bleibt davon unterscheidbar. Auch das zuvor hartcodierte
`Beobachtungen: 0 Jahre` ist ersetzt. Die Tests fixieren jetzt `unbekannt`
statt der frueheren erfundenen Null.

**CR2-06 – behoben.** `activeMissingnessReason` aggregiert die Zaehler
grundweise und waehlt das Maximum mit deterministischem Tiebreak. Der Test
belegt genau das Szenario aus dem Finding: 999 technische Fehler gegen eine
fehlende Inflationsreihe ergeben `Grund: technical_error`.

### 2. Unabhängig verifizierte Gates

- `npm test`: 19.222 von 19.222 Assertions, 0 fehlgeschlagene Dateien,
  0 offene Handles.
- `npm run test:browser`: Exitcode 0, 29 bestandene Workflows.
- `git diff --check`: ohne Befund.
- Dateiumfang unveraendert acht produktive Dateien; keine der in Slice 1
  eingefrorenen V2-Vertragsdateien beruehrt; stabile Metric-Keys erhalten.
- Kein Testorakel wurde abgeschwaecht. Die geaenderten Assertions sind
  durchgaengig strenger: `includes('Beobachtungen: 0')` wurde zu
  `includes('unbekannt')`, `includes('10.000')` zu `assertEqual('12.345,67 €')`.

### 3. Neue Findings

#### CR2-07 (mittel) – Die Pflegekarten sind die letzte Instanz des CR2-01-Musters

`buildCareEntryCard(..., rounded = true)` formatiert weiterhin mit
`formatCurrencyRounded` (`app/simulator/results-metrics.js:675`). Gemessen:

| Karte | Messwert | Anzeige | Richtung |
| --- | --- | --- | --- |
| Reales Endvermoegen (m. Pflege, Median) | 212.500 € | 225.000 € | Nutzen plus 12.500 € |
| Gesamter Pflege-Mehrbedarf (real) | 262.499 € | 250.000 € | Kosten minus 12.499 € |

Damit sind beide Fehlerrichtungen aus F5 in der Pflegesektion weiterhin offen,
und keine dieser Karten ist als gerundet gekennzeichnet, waehrend das
Summary-Grid jetzt centgenau ist. Kein Blocker: Die Pflege-KPIs stehen nicht in
der Orakeltabelle, sind im Ziel des Slice nicht genannt, liegen in einer eigenen,
in sich einheitlich gerundeten Sektion und wurden von diesem Slice bis auf einen
Titel nicht angefasst. Die Korrektur ist allerdings einzeilig — `rounded`
entfaellt oder wird auf `formatConservativeCurrency` umgestellt — und schliesst
die Fehlerklasse vollstaendig.

#### CR2-08 (niedrig) – Nicht ausgewertete Diagnostik im neuen Vollseitentest

`inspectFullSimulatorLayout` berechnet `overflowingElements`,
`nonLogOverflowingElements` und `logAncestors` und laeuft dafuer dreimal ueber
alle Body-Elemente. Keines der drei Ergebnisse wird assertiert; sie erscheinen
nur in Fehlermeldungen. Ausgerechnet `nonLogOverflowingElements` ist die
strengere Pruefung (jedes Element mit `scrollWidth > width`) und damit
wirkungslos. Wer den Test liest, haelt sie fuer ein Gate. Entweder assertieren
oder als reine Fehlerdiagnostik benennen.

#### CR2-09 (niedrig) – Die Heatmap ist bei 320 Pixel overflow-frei, aber unlesbar

Gemessen: Das SVG rendert mit 274 px gegen einen `viewBox` von 980 Einheiten,
also mit Faktor 0,28. Die Achsenbeschriftung „Anteil Läufe: realisierte
Entnahmequote ≥ 4,5 % (bin-basiert)" landet bei effektiv 2,52 px (gemessene
Boxhoehe 4 px). Das neu ergaenzte `overflow: hidden` auf `#heatmap-container`
und `.heatmap-v4-svg` unterdrueckt Restueberstand, stellt aber keine Lesbarkeit
her. Entschaerft dadurch, dass die HTML-`reporting-reference-note` unmittelbar
darueber denselben Sachverhalt mit gemessenen 13,12 px traegt; der Rollenhinweis
bleibt also lesbar, nur die Achsenkopie nicht.

### 4. Fortgeschriebene Restrisiken

- „gleicher Laufpfad und Zeitraum" steht weiterhin auf **Quantilkarten**.
  Pro Lauf ist die Aussage verifiziert korrekt; nominaler und realer Median
  sind jedoch Ordnungsstatistiken zweier getrennt sortierter Verteilungen und
  stammen im Allgemeinen aus verschiedenen Laeufen.
- Ein positiver Untercentwert erscheint trotz der Zusage „Ein beobachteter
  positiver Kleinstwert bleibt sichtbar" als `0,00 €`. Der dokumentierte Fall
  F5 (331,01 €) ist geschlossen.
- Zwischen 361 und rund 600 Pixel erzwingt `.kpi-grid-pair` weiterhin zwei
  Spalten; gegated sind nur 320 px und 1366 px.

### 5. Pre-Mortem

In drei Monaten liest der Nutzer in der Pflegesektion ein reales Endvermoegen
von `225.000 €` und plant damit, waehrend der Messwert `212.500 €` betrug — die
Fehlerklasse aus CR2-01, die ausserhalb der Orakeltabelle stehen geblieben ist
(CR2-07). Die zweitwahrscheinlichste Ursache: Ein Layout-Refactoring bricht die
Vollseitenbreite bei 320 px, und der Test meldet es nicht, weil die strengere
Ueberlaufliste berechnet, aber nicht assertiert wird (CR2-08).

### 6. Re-Review-Ergebnis

- **Status:** freigegeben
- **Blocker:** keine
- **Offene Findings:** CR2-07 (mittel), CR2-08 (niedrig), CR2-09 (niedrig)
- **Empfehlung:** CR2-07 vor dem Commit mitnehmen — die Aenderung ist einzeilig
  und schliesst die Fehlerklasse, die diesen Slice ausgeloest hat, vollstaendig
- **Restrisiken:** Abschnitt 4

## Abschliessendes Code-Review von Gemini (2026-08-07)

**Reviewstand:** 2026-08-07, Branch `codex/fokussierte-abschlusshaertung`, Baseline-Commit `55bdd84`. Geprüft wurden die 8 produktiven UI- und Metric-Dateien, die Test-Fixtures, der Diff sowie die vollständige Testsuite.

### 1. Prüfdimensionen

- **Korrektheit vs. Akzeptanzkriterien:** Der Slice hält das Ziel ein, wahren Risikodurchblick ohne verfälschende Rundung zu liefern. Exakte EUR- und Prozentwerte werden primär gerendert. Das KPI-Rundungsorakel schützt Nutzen- (Abrunden) und Kosten- (Aufrunden) Kennzahlen konsistent.
- **Vertragstreue:** Es wurden exakt 8 produktive Dateien geändert (Limit von max. 10 eingehalten). Der V2-Ergebnisvertrag aus Slice 1 wurde nicht erneut verändert. Stabile Metric-Keys (`timeShareWRgt45` etc.) blieben unverändert erhalten.
- **Fehlerbehandlung:** Drawdown-Aggregate werden fail-closed auf die Domaene `[0, 100]` validiert. Negative Werte oder Missingness werden als `—` plus Grund dargestellt; eine fälschliche Reparatur per `Math.abs` unterbleibt.
- **Seiteneffekte & Validierung:** `npm test` lief mit 168 Testdateien und 19.222 Assertions (0 Fehler, 0 offene Handles) vollständig grün durch. `npm run test:browser` (29/29) und `git diff --check` sind sauber.
- **Was könnte brechen?** Die verbleibenden niedrigen/mittleren Restrisiken (CR2-07, CR2-08, CR2-09).

### 2. Pre-Mortem

**Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?**

Eine unbedachte Layout-Anpassung bricht bei schmalen Viewports (320 px) das Kartengrid, was von `inspectFullSimulatorLayout` nicht assertiert wurde (CR2-08), oder der Nutzer interpretiert die Medianwerte von nominalem und realem Drawdown fälschlicherweise als aus demselben Pfad stammend.

### 3. Review-Ergebnis

- **Status:** **freigegeben**
- **Blocker:** keine
- **Restrisiken:** CR2-07 (Pflegekarten-Grobrundung), CR2-08 (Unassertierte Ueberlauflisten in Test-Fixture), CR2-09 (SVG-Heatmap-Lesbarkeit bei 320 px).
- **Abnahme:** Slice 02 ist technisch und fachlich abgenommen und für den lokalen Commit freigegeben.

