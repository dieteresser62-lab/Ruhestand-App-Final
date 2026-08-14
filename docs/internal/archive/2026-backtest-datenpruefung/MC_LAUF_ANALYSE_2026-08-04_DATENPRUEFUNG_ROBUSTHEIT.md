# Analyse Monte-Carlo-Lauf 2026-08-04: Datenprüfung und Robustheitsbewertung

**Stand:** 2026-08-04<br>
**Status:** Analyse abgeschlossen; Korrekturen nicht umgesetzt, keine Freigabe erteilt<br>
**Analyseart:** adversariale Daten- und Vertragsprüfung eines produktiven Exportlaufs<br>
**Rolle:** Claude als Reviewer/Analyst; keine Änderung an Anwendungscode
**Codex-Ergänzung:** 2026-08-04; unabhängiger Abgleich von Export, Szenario-Logs
und aktuellem Quellcode; keine Änderung an Anwendungscode

## 1. Auftrag und Prozessgrenze

Geprüft wurden ein vollständiger Monte-Carlo-Exportlauf sowie die beiden
zugehörigen Szenario-Logs (Worst-Case und P10) auf innere Stimmigkeit,
Vertragstreue und fachliche Aussagekraft.

Dieses Dokument implementiert keine Korrektur, erteilt keine Freigabe und
ersetzt keine Anlageberatung. Es bewertet ausschließlich das Simulationsmodell
und dessen Ausgaben.

## 2. Prüfgegenstand

| Artefakt | Datei |
|---|---|
| MC-Export | `monte-carlo-0f6e23ca5051-2026-08-04T16-21-22-564Z.json` |
| Worst-Case-Log | `scenario-log (11).json` (24 Dekumulationsjahre + Terminalrecord) |
| P10-Log | `scenario-log (12).json` (28 Dekumulationsjahre + Terminalrecord) |

**Identifikation des Laufs**

- `runId`: `mcrun_0f6e23ca5051cd4658069379f349869e0c35360faa144264b23d7f35099981cc`
- `engine.apiVersion`: `31.0`, `buildId`: `2025-12-22_16-35`
- Szenario-Fingerprint: `23861b7ecc263b9ad451d3c511462c543d3092b367bafd7798e395cbbd7b901c`
- Parameter: 10.000 Läufe, Horizont 35 Jahre, Seed 12345, `regime_markov`,
  `per-run-seed`, Startjahrmodus `RECENCY` (Half-Life 20 Jahre),
  `excludeEstimatedHistory: true`, Stress `NONE`, Tail-Risk deaktiviert,
  `dynamicFlex: false`, CAPE-Sampling deaktiviert

**Zuordnung der Logs**

Die Zuordnung wurde nicht aus den Dateinamen übernommen, sondern verifiziert:

- `scenario-log (11).json` endet mit 297.763,84 EUR und entspricht damit exakt
  dem Minimum der 10.000er-Endwertverteilung.
- `scenario-log (12).json` endet mit 5.800.718,61 EUR und liegt damit auf dem
  P10 der Verteilung (5.800.080,60 EUR).

## 3. Bestandene Konsistenzprüfungen

| Prüfung | Ergebnis |
|---|---|
| Tranchen zu Depot zu Startvermögen | 2.629.486 minus 217.243 Geldmarkt = 2.412.243 Depot; zuzüglich 217.243 und 140.000 Tagesgeld = 2.769.486 |
| Einstand und Gewinn | Summe `costBasis` = 1.637.991; 2.629.486 / 1.637.991 minus 1 = +60,53 % |
| Zielliquidität | 217.243 Geldmarkt-ETF + 140.000 Tagesgeld = 357.243 = `zielLiquiditaet` |
| Outcome-Inventar | 0 Ruin + 9.654 Tod + 346 Horizont + 0 Technik = 10.000 |
| Pflege-Eintritt Haushalt | 83,52 % gegenüber 1 minus (1 minus 0,5442) mal (1 minus 0,639) = 83,55 %; Unabhängigkeitsannahme konsistent |
| Regime-Summe | 111.414 + 113.814 + 14.449 + 14.375 = 254.052 = `sampledYears` |
| Recency-Gewichtung | Ziehungsverhältnis 2024 zu 1951 = 10,7; größenordnungskonsistent mit Half-Life 20 |
| Bilanzkette `balance_trace` | acht Phasen je Jahr, jede Übergabe rechnerisch geschlossen |
| Verkaufszerlegung | `vkGes` = `vkAkt` + `vkGld` + `vkBnd` in allen Jahren beider Logs |
| Kapitalertragsteuersatz | konstant 28,625 %; Sparerpauschbetrag korrekt zuerst gegen Veräußerungsgewinne, dann gegen Zinsen |
| Goldveräußerung | steuerfrei, konsistent mit `goldSteuerfrei: true` |
| Heatmap-Kennzahlen | `shareYear1In_3_to_3_5`, `shareYear1Above_5_5`, `colSharesAbove45` und `criticalRowIndex` intern korrekt |
| Floor-Deckung | Wilson-Score-Intervall korrekt berechnet |

**Zurückgezogene Verdachtsmomente.** Zwei initiale Befunde haben der
Nachprüfung nicht standgehalten und werden ausdrücklich zurückgezogen:
eine vermutete Inkonsistenz in `vkGes` (die Goldkomponente fehlte lediglich in
der ersten Auswertungsdarstellung) und ein vermuteter Off-by-one in drei
Heatmap-Kennzahlen (der Code ist mit der tatsächlichen Bin-Semantik
konsistent; falsch ist stattdessen deren Benennung im Export, siehe F1).

## 4. Verifizierte Findings

### F1 – Exportvertrag benennt die untere Bin-Schranke als `upperBoundPct` (hoch)

`app/simulator/monte-carlo-runner-utils.js:3` definiert
`MC_HEATMAP_BINS = [0, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 10, Infinity]`.
Die Zuordnung in `app/simulator/monte-carlo-runner.js:830` lautet
`quote >= MC_HEATMAP_BINS[b] && quote < MC_HEATMAP_BINS[b + 1]`. Damit ist
`MC_HEATMAP_BINS[b]` die **untere** Schranke von Bin `b`.

`app/simulator/monte-carlo-contracts.js:499` exportiert genau diesen Wert als
`upperBoundPct`. Bin 1 trägt somit `upperBoundPct: 3`, enthält aber Quoten
aus dem Intervall `[3,0; 3,5)`.

**Fehlerbild:** Jeder externe Konsument des Exports interpretiert sämtliche
Heatmap-Bins um genau eine Position verschoben. Der Fehler ist in der Praxis
aufgetreten: die Erstauswertung dieses Laufs war betroffen.

**Zusatzbefund:** Der Export deklariert zwölf Bin-Einträge
(Index 0 bis 11, letzter `openEnded: true` mit `upperBoundPct: null`), liefert
in `countsByPlanYear` aber nur elf Zählwerte je Planjahr. Eine positionsweise
Paarung von `bins[i]` mit `countsByPlanYear[i]` läuft am Ende ins Leere.

### F2 – Renditefelder tragen Suffix `Pct`, enthalten aber Bruchteile (hoch)

`app/simulator/simulator-year-result.js:306-309`:

```
RealReturnEquityPct: (1 + rA) / (1 + yearData.inflation / 100) - 1,
RealReturnGoldPct:   (1 + rG) / (1 + yearData.inflation / 100) - 1,
NominalReturnEquityPct: rA,
NominalReturnGoldPct:   rG,
```

`rA` und `rG` sind Bruchteile (belegt durch `balance_trace.rA = -0.34763...`
bei gleichzeitig ausgewiesenem `NominalReturnEquityPct = -0.35`). Innerhalb
desselben Datensatzes führt `inflation` Prozent, führen
`flex_haushalt_kuerzung_pct`, `QuoteEndPct` und `RunwayCoveragePct`
Prozentpunkte. Der Exportvertrag legt in `unitContract.percentages` explizit
`percentage-points` fest.

**Fehlerbild:** Faktor 100 bei jeder Weiterverarbeitung der Renditefelder.
Dieselbe Konstruktion existiert in
`app/simulator/simulator-accumulation-year.js:192-193`.

### F3 – Zwei unterschiedliche Entnahmequoten ohne Unterscheidungsmerkmal (hoch)

Im selben Logrecord existieren zwei Größen mit der Bedeutung
„Entnahmequote" und unterschiedlichem Nenner:

- `entnahmequote` (`simulator-year-result.js:310`) als Basis der Heatmap und
  der KPI „Zeitanteil Quote größer 4,5 %"
- `QuoteEndPct` (`simulator-year-result.js:224-226, 296`, gespeist aus
  `spendingResult.details.entnahmequoteDepot`) als Basis der
  Guardrail-Steuerung

Belegte Abweichung im Worst-Case-Lauf:

| Jahr | `entnahmequote` | `QuoteEndPct` |
|---:|---:|---:|
| 1 | 3,66 % | 4,08 % |
| 2 | 5,14 % | 5,75 % |
| 20 | 7,17 % | 7,24 % |
| 21 | 9,35 % | 9,16 % |

**Fehlerbild:** Die berichtete Kennzahl „Zeitanteil Quote größer 4,5 %
= 0,1 %" beruht systematisch auf der niedrigeren der beiden Definitionen,
während das System intern mit der höheren steuert. Die Bezugsbasis ist in
keinem der beiden Fälle im Export dokumentiert.

### F4 – Verletzung der selbst deklarierten `zeroPolicy` (mittel)

Der Export deklariert
`zeroPolicy: "observed-zero-is-zero; unavailable-values-are-null-with-reason"`.

Verletzungen:

- `kpis.depotExhaustionAgeYears.p50 = 0` bei `depotExhaustionRatePct = 0`.
  Es existiert keine Beobachtung; verlangt wäre `null` mit Grund. Die
  Oberfläche zeigt hier korrekt einen Strich, der Export nicht.
- `kpis.stress.cutYears.p50`, `kpis.stress.maximumDrawdownPct.p50/p90`,
  `kpis.stress.recoveryYears.p50` und `kpis.stress.horizonYears` liefern
  jeweils 0 bei `preset: "NONE"`.

Im selben `stress`-Block liefert `realWithdrawalP10RealEur` dagegen korrekt
`null` mit `missingness.not_applicable = 10000`. Die Politik wird also
innerhalb eines einzigen Blocks uneinheitlich angewendet.

**Nebenbefund:** `kpis.realWithdrawalP10RealEur.observationCount` ist ein
leeres Objekt `{}` – vermutlich eine nicht serialisierte Map.

### F5 – Anzeigerundung verschiebt Risiko-Kennzahlen nach oben (mittel)

| Oberfläche | Export | Abweichung |
|---|---:|---:|
| Reale Depotentnahme P10: 15.000 EUR | 13.331,39 EUR | +12,5 % |
| Median der Run-P10: 30.000 EUR | 32.105,61 EUR | −6,6 % |
| Median Steuern: 325.000 EUR | 335.938,20 EUR | −3,3 % |
| Steuerersparnis Verlustvortrag: 0 EUR | 331,01 EUR | Information vernichtet |

**Fehlerbild:** Bei einer Downside-Kennzahl ist die Aufrundung nach oben die
sicherheitskritische Richtung. Die Rundungsstufe ist zudem
größenordnungsabhängig und nicht dokumentiert.

### F6 – Eingabe `capeRatio: 32` ist wirkungslos (mittel)

`normalizedInputs.capeRatio` und `marketCapeRatio` betragen 32. Der in den
Logs tatsächlich verwendete Wert `vpw.capeRatioUsed` beträgt im P10-Lauf
15,85 / 37,27 / 44,20 / 28,29 / 27,28 / 17,33 in den Jahren 1 bis 6, im
Worst-Case-Lauf 25,96 in Jahr 1 – jeweils der CAPE des gezogenen historischen
Jahres.

Bei `capeSamplingRequested: false` und `vpw.status: "disabled"` bleibt die
Eingabe ohne Wirkung auf das Sampling. Das Eingabefeld suggeriert eine
Steuerungswirkung, die nicht existiert.

### F7 bis F10 – Nachrangige Befunde (niedrig)

- **F7 Negativzins erzeugt Steuergutschrift.** P10-Lauf Jahr 4:
  `cash_interest_taxable_signed = -847,90`,
  `cash_interest_tax_delta = -242,71`, `tax_cash_adjustment = +242,71`.
  Negative Zinsen sind steuerlich keine negativen Kapitalerträge mit
  sofortiger Erstattung. Betragsmäßig unerheblich, systematisch falsch.
- **F8 Terminaler Logrecord ohne Werte.** Das jeweils letzte Logjahr
  (Worst-Case Jahr 25, P10 Jahr 29) enthält weder `portfolio_total_end` noch
  Cashflow- oder Steuerwerte, trägt aber weiterhin Pflege-Metadaten
  (`pflege_aktiv: true`, `pflege_grade_label` gesetzt). Auswertungen, die über
  alle Logzeilen iterieren, müssen diesen Record gesondert ausschließen.
- **F9 Toter Parameter.** `partner.sparerPauschbetrag: 1000` bleibt ohne
  Wirkung; `usedSPB` beträgt durchgängig 2.000.
- **F10 Steuersatzungenauigkeit.** Der angesetzte Satz von 28,625 % lässt die
  Minderung der Kapitalertragsteuer-Bemessungsgrundlage bei Kirchensteuer
  unberücksichtigt (korrekt rund 27,99 %). Wirkt konservativ.

## 5. Robustheitsbewertung

Die Kernaussage des Laufs – 0 % Ruin bei 100 % Floor-Deckung – hält einer
adversarialen Prüfung **nicht als Robustheitsnachweis** stand. Sie ist
überwiegend Ergebnis der folgenden Annahmen.

### R1 – Die Floor-Deckung misst die Rentenannahmen, nicht die Strategie

Im Worst-Case-Lauf ist `floor_aus_depot` von Jahr 3 bis Jahr 21 exakt 0. Die
Renten decken den Floor allein; das Depot wird dafür nie herangezogen. Erst
ab Jahr 22, als Pflegekosten den Floor von 38.140 auf 57.943 EUR heben,
entsteht wieder ein Depotbeitrag. Die KPI „Floor-Deckung 100 %, KI 100 bis
100 %" ist damit nahezu tautologisch.

Sensibelster Einzelparameter: Die Partnerin bezieht ab **Alter 60** dauerhaft
1.650 EUR monatlich lohnindexiert (`partner.startAlter: 60`,
`partner.startInJahren: 0`). Eine gesetzliche Altersrente ab 60 existiert im
deutschen Recht nicht. Setzt dieser Strom real erst mit 63 oder 67 ein, fehlt
er genau in der sequenzkritischen Anfangsphase.

### R2 – Das Sampling ist systematisch optimistisch

- Recency-Gewichtung mit Half-Life 20 Jahre zieht das Jahr 2024 rund
  10,7-mal so häufig wie 1951.
- Von 254.052 gezogenen Jahren entfallen nur **11,35 %** auf ungünstige
  Regime (BEAR 5,69 %, STAGFLATION 5,66 %); BULL 43,85 %, SIDEWAYS 44,80 %.
- Tail-Risk deaktiviert, Stress-Preset `NONE`, CAPE-Sampling deaktiviert.

Resultat: Median-Endvermögen 20.818.648 EUR nominal aus 2.769.486 EUR Start
bei 25,4 Jahren mittlerer Laufzeit. Überschlägig – ohne Berücksichtigung
der Entnahmen – entspricht das 8,3 % p. a. nominal; unter Berücksichtigung
der Depotentnahmen liegt die implizite Rendite bei rund 9 bis 10 % p. a. für
ein Portfolio mit etwa 13 % Liquiditätsanteil. Das liegt deutlich oberhalb
jeder plausiblen Langfristerwartung. Die Ruinquote von 0 % folgt primär aus
dieser Annahme, nicht aus der Strategie.

### R3 – Der Liquiditätspuffer versagt genau dann, wenn er gebraucht wird

Im Worst-Case-Lauf fällt die Liquidität ab Jahr 13 auf 0 und bleibt es bis
Jahr 21: `RunwayCoveragePostPayoutEndOfYearPct = 0,00` über neun
aufeinanderfolgende Jahre. `RunwayCoveragePct` beträgt in diesen Jahren
konstant exakt 20,00 %, weil `liq_before_payout` genau der Jahresentnahme
entspricht und `zielLiquiditaet` das Fünffache davon beträgt – das System
verkauft in jedem Jahr genau den Jahresbedarf und zahlt ihn sofort aus.

Der Zielwert `RunwayTargetRawMonths = 60` bleibt dabei unverändert und wird
nie abgesenkt, obwohl er zwölf Jahre lang unerreichbar ist. Ab Jahr 13 wird
somit in jedem Jahr zwangsweise verkauft – exakt der Zustand, den ein
Fünfjahrespuffer verhindern soll.

### R4 – Gold existiert im Worst-Case nicht

`goldAktiv: true` bei `goldZielProzent: 6,89` und Startbestand 0. Im P10-Lauf
wird Gold aufgebaut (Maximum 411.654 EUR, kumulierte Käufe 355.000 EUR). Im
Worst-Case-Lauf bleibt `wertGold` über alle 24 Jahre bei 0. Die
Diversifikation fehlt in genau dem Szenario, für das sie vorgesehen ist.

### R5 – Die Glättung überstimmt die Guardrails im entscheidenden Moment

Worst-Case Jahr 1, Aktienrendite −34,76 %. Aus `entscheidung.details`:

- `minimumFlexEffectiveBefore` = 12.144,29 EUR (Guardrail-Signal)
- `minimumFlexEffectiveAfter` = 30.000 EUR (nach Mindest-Flex-Regel)
- `minimumFlexEffectiveFinal` = 53.400 EUR (nach Glättung)
- `kuerzungProzent` = 11, `endgueltigeEntnahme` = 57.600 EUR

Ausgezahlt wurde damit das 4,4-fache des Guardrail-Signals. Im zweiten
Crash-Jahr (erneut −35 %) folgten 52.800 EUR. Dieses Verhalten erzeugt genau
das Sequence-of-Returns-Risiko, das die Strategie eindämmen soll.

### R6 – Die Pflege-Vergleichskennzahl ist nicht interpretierbar

`endWealthWithCareRealEurP50` = 12.511.179 EUR gegenüber
`endWealthWithoutCareRealEurP50` = 7.944.635 EUR: Läufe **mit** Pflegefall
enden reicher. Ursache ist Immortal-Time-Bias – wer keinen Pflegefall
erleidet, ist überwiegend früh verstorben (1.648 gegenüber 8.352 Läufen).

Der Export deklariert dies korrekt als `unpaired_group_median_difference`.
Die Oberflächenkachel „Gruppenmedian-Differenz −4.575.000 EUR" lädt
dennoch zur kausalen Fehllesung ein. Die Kennzahl trägt keinen
Entscheidungswert.

### R7 – Der Verlustvortrag ist wertlos

Im Worst-Case-Lauf wächst `lossCarryEnd` bis auf 417.502 EUR, während
`taxSavedByLossCarry` in allen 24 Jahren 0 beträgt. Der Vortrag trifft nie
auf realisierte Gewinne. Das MC-Aggregat bestätigt das:
`perRunMeanNominalEur` = 331,01 EUR.

### R8 – Nicht modellierte Risiken

- **Langlebigkeit:** `mortality.cohortProjection: false` und
  `futureMortalityImprovement: false`; Periodentafel 2023/2025. Bei Startalter
  60 und 63 über einen Horizont von 35 Jahren wird das Langlebigkeitsrisiko
  dadurch systematisch unterschätzt.
- **Steuerrecht:** über 35 Jahre konstant angenommen (Abgeltungsteuer 25 %,
  Teilfreistellung 30 %, Sparerpauschbetrag nominal 2.000 EUR). Der nominal
  fixierte Pauschbetrag wirkt konservativ, die übrigen Annahmen nicht.
- **Goldsteuerfreiheit:** `goldSteuerfrei: true` gilt nur für physisches Gold
  beziehungsweise bestimmte ETC-Konstruktionen. Im P10-Lauf wurden auf dieser
  Grundlage 435.000 EUR steuerfrei veräußert.

### Zusammenfassende fachliche Einordnung

Die Strategie ist im geprüften Lauf nicht robust gegen **Vermögensverlust**,
sondern robust gegen **Depoterschöpfung** – erkauft durch aggressive
Ausgabenkürzung. Der Worst-Case führt die reale Depotentnahme von 57.600 EUR
auf 13.331 bis 16.578 EUR zurück (rund minus 71 %), bei Flex-Kürzungen bis
65,9 % und durchgängigem Alarmzustand ab Jahr 2.

Das ist ein valides Ergebnis. Es beantwortet die Frage nach der Belastbarkeit
des Plans jedoch mit der Bedingung, dass der flexible Teil des Lebensstandards
im Krisenfall auf rund ein Drittel reduziert wird.

## 6. Empfohlener Gegenlauf

Zur Absicherung der Kernaussagen sollte ein Vergleichslauf mit folgenden
Änderungen gefahren werden:

1. `startYearMode` von `RECENCY` auf `UNIFORM` (beseitigt die
   Recency-Übergewichtung der Jahre 2010 bis 2025)
2. Rentenbeginn der Partnerin auf Alter 63 beziehungsweise 67
3. Tail-Risk aktiviert

Bleiben die Kernaussagen unter diesen Bedingungen bestehen, ist die
Robustheit belegt. Der vorliegende Lauf belegt sie nicht.

## 7. Review-Ergebnis

- **Status:** blockiert – nicht geeignet als Entscheidungsgrundlage in der
  vorliegenden Form
- **Blocker:** F1 (Bin-Semantik im Exportvertrag falsch benannt), F2
  (Einheitenbruch bei den Renditefeldern), F3 (zwei ununterscheidbare
  Entnahmequoten-Definitionen)
- **Restrisiken:** R1 (Rentenbeginn Alter 60 nicht belastbar), R2
  (Sampling-Optimismus mit nur 11,35 % Krisenregimen), R5 (Glättung
  neutralisiert die Guardrails im ersten Crash-Jahr), F5 (Anzeigerundung
  überzeichnet die Downside-KPI um 12,5 %)
- **Pre-Mortem:** In drei Monaten zieht eine Auswertung dieser Exporte falsche
  Schlüsse, weil ein Konsument die `upperBoundPct`-Bins um eine Position
  verschoben interpretiert oder `RealReturnEquityPct` mit 100 multipliziert.
  Wahrscheinlichste fachliche Fehlerursache: Die Strategie wird auf Basis der
  Kennzahl „0 % Ruin" freigegeben, obwohl diese bei realistischerer
  Regimeverteilung und späterem Rentenbeginn der Partnerin nicht bestehen
  bleibt.

## 8. Geltungsgrenze

Diese Analyse bewertet das Simulationsmodell und dessen Ausgaben. Sie ist
keine Anlageberatung; die Bewertung konkreter Anlageentscheidungen bleibt
einer lizenzierten Beratung vorbehalten.

## 9. Codex-Ergänzung: Abgleich, Korrekturen und zusätzlicher Handlungsbedarf

### 9.1 Gesamtbild des unabhängigen Abgleichs

Die arithmetische Integrität des konkreten Laufs ist höher als die fachliche
Belastbarkeit seiner Überschriften:

- Der MC-Export besteht den eingebauten Schema- und Fingerprint-Prüfer mit
  `verifyFingerprint: true`; es gibt keine unbekannten Felder oder
  Deprecated-Alias-Treffer.
- Die Endvermögensquantile und Drawdownquantile lassen sich aus den jeweils
  10.000 exportierten Einzelwerten exakt reproduzieren.
- Der Worst-Case-Log ist wertgleich mit dem Minimum der Endwertverteilung;
  der P10-Log liegt mit 638,01 EUR Abstand am interpolierten P10 und hat den
  empirischen Rang 10,01 %.
- In beiden Logs schließen Vermögenskomponenten, Auszahlungen, reale
  Entnahmen und `portfolio_flow_delta` bis auf Gleitkommarundung exakt.

Damit liegt keine allgemeine Ergebnis- oder Bilanzkorruption vor. Es bestehen
jedoch mehrere echte Exportvertragsfehler sowie relevante Modell- und
Interpretationsrisiken. Für externe oder automatisierte Auswertungen muss
aktiv geworden werden; für die rein manuelle Interpretation dieses konkreten
Laufs sind die Rohwerte unter Beachtung der nachstehenden Einschränkungen
weiter nutzbar.

### 9.2 Einordnung der Findings F1 bis F10

| Finding | Codex-Abgleich | Handlungsbedarf |
|---|---|---|
| F1 Heatmap-Bins | **Bestätigt.** `MC_HEATMAP_BINS[b]` ist die inklusive Untergrenze, wird aber als `upperBoundPct` exportiert. Außerdem stehen zwölf Grenzwerte elf Zähl-Bins gegenüber. | **Hoch:** Exportvertrag auf explizite `lowerBoundInclusivePct`/`upperBoundExclusivePct`-Intervalle umstellen und Migration/Schema-Version klären. |
| F2 `Pct`-Renditefelder | **Bestätigt.** Die vier Renditefelder enthalten Ratios, während andere `Pct`-Felder Prozentpunkte enthalten. | **Hoch:** entweder Werte mit 100 multiplizieren oder Felder auf `...Ratio` versionieren; nicht still im bestehenden Vertrag ändern. |
| F3 zwei Entnahmequoten | **Im Kern bestätigt, Begründung präzisiert.** `entnahmequote` ist die realisierte Auszahlung dividiert durch das Depot ohne Liquidität/Health-Bucket. `QuoteEndPct` ist die vor der Transaktions- und Auszahlungsphase ermittelte Policy-/Guardrail-Quote auf Basis der vorläufigen Entnahme. Die erste Größe ist nicht systematisch kleiner; im dokumentierten Jahr 21 ist sie sogar größer. | **Hoch:** beide Größen fachlich benennen und Nenner/Messzeitpunkt exportieren. Die 4,5-%-KPI darf nicht ohne Definition mit der Guardrail-Schwelle gleichgesetzt werden. |
| F4 `zeroPolicy` | **Bestätigt und erweitert.** Nicht beobachtete Depoterschöpfungs- und deaktivierte Stresswerte werden teilweise zu 0. Auch `dynamicFlexSafety = 0` wird gezeigt, obwohl `dynamicFlex: false`; dies bedeutet „nicht aktiviert“, nicht „beobachtet sicher“. | **Hoch:** `null` plus Missingness-/Applicability-Grund durchgängig anwenden. Das leere `observationCount: {}` ebenfalls korrigieren. |
| F5 KPI-Rundung | **Bestätigt als Darstellungsrisiko, nicht als Rechenfehler.** Die Stufen sind im Code als „Anti-Pseudo-Accuracy“ dokumentiert. Bei einer Nutzen-/Downside-Kennzahl kann kaufmännisches Aufrunden aber ein zu günstiges Bild erzeugen. | **Mittel:** Rohwert per Tooltip/Detail anzeigen oder Downside-Nutzenwerte konservativ abrunden; Rundungsregel in der UI offenlegen. |
| F6 CAPE 32 | **Bedingt bestätigt.** Bei deaktiviertem CAPE-Sampling und deaktiviertem VPW ist die Zahl für diesen MC-Lauf erwartungsgemäß nicht steuernd. Der Screenshot enthält allerdings eine eigene Checkbox „CAPE-basiertes Sampling verwenden“, die nicht aktiviert war. | **UX, nicht zwingend Engine-Fehler:** im MC-Bereich „CAPE derzeit nicht wirksam“ anzeigen; einen CAPE-Gegenlauf durchführen. |
| F7 Negativzins-Steuer | **Nur teilweise bestätigt.** Im P10-Jahr 4 gab es gleichzeitig 60.000 EUR Verkäufe und 2.862,77 EUR Steuer. Die 242,71 EUR sind daher keine isolierte Auszahlung aus negativem Zins, sondern eine Reduktion der im selben Jahr reservierten Verkaufssteuer. Ob ein negativer Cash-Ertrag steuerlich überhaupt so verrechenbar sein soll, bleibt eine Modell-/Rechtsannahme. | **Niedrig bis mittel:** Steuercontract für Negativzins beziehungsweise Verwahrentgelt explizit festlegen und testen; keine unmittelbare Cash-Erstattung ohne positive Steuerbasis zulassen. |
| F8 Terminalrecord | **Bestätigt als Integrationsrisiko.** Der Record ist als Todesmarker fachlich erwartbar, wird aber nicht durch einen expliziten Zeilentyp von Finanzjahren getrennt. | **Mittel:** `recordType: terminal_death` oder `financiallyEvaluable: false` exportieren und Terminal-Pflegefelder bereinigen. |
| F9 Partner-SPB | **Nicht als toter Parameter bestätigt.** Beim Profilverbund wird `startSPB` über alle Profile summiert; im Lauf sind deshalb 2.000 EUR der kombinierte Betrag. `partner.sparerPauschbetrag: 1000` ist Provenienz des zweiten Profils, auch wenn die Engine anschließend den aggregierten Haushaltswert konsumiert. | **Kein fachlicher Fix aus diesem Befund.** Allenfalls Datenvertrag dokumentieren, damit Provenienzfeld und aggregierter Runtime-Wert nicht als doppelte Freibeträge gelesen werden. |
| F10 Kirchensteuerformel | **Bestätigt.** Der Code verwendet `0,25 * (1 + Soli + Kirchensteuer)` und berücksichtigt die gesetzliche Minderung der Kapitalertragsteuer-Basis bei Kirchensteuer nicht. § 32d Abs. 1 EStG beschreibt stattdessen `(e-4q)/(4+k)`. Die bestehende Näherung ist hier konservativ. | **Mittel:** rechtlich korrekte Formel zentralisieren, Änderung als Engine-Semantikänderung behandeln und Backtests neu vermessen. |

Offizielle Referenzen zu den beiden rechtlichen Punkten:

- [Deutsche Rentenversicherung: mögliche Altersgrenzen und Voraussetzungen](https://www.deutsche-rentenversicherung.de/SharedDocs/FAQ/A-und-B/faq-a-und-b.html?nn=6492b40d-767c-43e7-bfad-3c9bd03146fd)
- [BMF/Lohnsteuer-Handbuch 2026: § 32d EStG](https://lsth.bundesfinanzministerium.de/lsth/2026/A-Einkommensteuergesetz/IV-Tarif-31-34b/Paragraf-32d/inhalt.html)

### 9.3 Präzisierungen zu den Robustheitsbefunden

#### R1: Rentenabhängigkeit bestätigt, Rentenbeginn jedoch nicht aus dem Export widerlegbar

Bestätigt ist, dass die 100-%-Floor-Deckung stark durch die modellierten
Rentenströme getragen wird. Deshalb muss der reale Leistungsbeginn der
Partner-Rente vor einer Entscheidung gegen Bescheid oder Vertrag geprüft
werden.

Nicht haltbar ist dagegen die pauschale Aussage, eine gesetzliche Altersrente
ab 60 existiere nicht. Die Deutsche Rentenversicherung nennt unter bestimmten
Voraussetzungen, insbesondere für schwerbehinderte Menschen und abhängig vom
Geburtsjahr, mögliche vorzeitige Altersgrenzen ab 60. Außerdem identifiziert
der Export den Strom nicht eindeutig als gesetzliche Regelaltersrente; denkbar
sind auch andere Versorgungsarten. Das ist daher ein **zu verifizierender
Nutzereingabevertrag**, kein aus diesen Daten bewiesener App-Fehler.

#### R2: Fehlende Stressabdeckung bestätigt, „systematisch optimistisches Sampling“ noch nicht bewiesen

Bestätigt sind:

- Recency-Startgewichtung mit Half-Life 20,
- kein Stress-Preset,
- kein Tail-Risk-Overlay,
- kein CAPE-bedingtes Sampling trotz eingegebenem CAPE 32,
- Historienuniversum 1951 bis 2025.

Diese Punkte begrenzen die Aussagekraft und verlangen Gegenläufe. Aus der
Regimeverteilung allein folgt aber noch kein Optimismus: `SIDEWAYS` ist kein
einheitlich positives Renditeregime, und nach dem recency-gewichteten ersten
Datensatz folgen Markov-Übergänge. Auch die Rechnung aus medianem Endvermögen
und **mittlerer** Lebensdauer kombiniert zwei verschiedene Statistiken und ist
keine gültige Schätzung der impliziten Portfoliorendite. Die Aussage, 0 % Ruin
folge „primär“ aus 9 bis 10 % Rendite, ist ohne Uniform-/Block-/Stress-Gegenlauf
nicht belegt.

#### R3 und R4: echte Strategie-Schwachstellen, aber nicht automatisch Rechenfehler

Der Worst Case belegt, dass der Fünfjahrespuffer in einer langen schlechten
Sequenz nicht dauerhaft erhalten wird: ab Jahr 11 liegt er unter 24 Monaten,
in den Jahren 13 bis 23 unter einem Monat. Danach verkauft das System jährlich
für den laufenden Bedarf. Das ist eine materielle Schwäche der Strategie,
aber ein Zielpuffer ist keine Garantie, in jeder Marktlage fünf Jahre Cash zu
halten. Aktiv zu entscheiden ist, ob ein härterer Mindestpuffer, geringere
Ausgaben oder eine andere Verkaufslogik gewünscht sind.

Ebenso bleibt Gold im Worst Case bei 0, obwohl ein Zielanteil von 6,89 %
konfiguriert ist. Das folgt daraus, dass die Startallokation tatsächlich kein
Gold enthält und das System im sofortigen Bärenpfad keinen Aufbau erzwingt.
Wenn Gold als Schutz **ab Rentenbeginn** dienen soll, muss der Zielbestand vor
dem Start vorhanden sein oder eine explizite Initialallokation implementiert
werden. Eine bloße Zielquote garantiert diesen Schutz derzeit nicht.

#### R5: Policy-Reihenfolge ist real, aber als Produktentscheidung zu behandeln

Der Code deklariert ausdrücklich die Reihenfolge
`alarm -> guardrails -> minimum_flex -> flex_budget -> final_smoothing`.
Damit dürfen Mindest-Flex und finale Änderungsbegrenzung eine zuvor stärkere
Guardrail-Kürzung wieder anheben. Das Worst-Case-Jahr 1 zeigt die wirtschaftliche
Folge dieser bewussten Reihenfolge.

Zugleich enthält der Log zwei gleichnamige Messungen:

- `entscheidung.details.minimumFlexEffectiveFinal` beschreibt den geplanten,
  nach Policy und Quantisierung wirksamen Haushalts-Flex,
- das oberste `minimumFlexEffectiveFinal` wird nach tatsächlicher Auszahlung
  auf den Mindest-Flex-Zielbetrag begrenzt und ist die kanonische
  Erfüllungsmessung.

Die Differenz ist keine Bilanzabweichung, aber ein weiterer Export-
Semantikfehler. Ob Minimum-Flex und Glättung Guardrails überstimmen sollen,
benötigt einen fachlichen Sollentscheid; eine Änderung würde Engine-Semantik
verändern und darf nicht als bloßer Bugfix erfolgen.

#### R6 bis R8: im Wesentlichen bestätigt, mit zwei Einschränkungen

- Der Pflege-Gruppenvergleich ist ungepaart und nicht kausal. Die negative
  Differenz darf nicht als Vorteil eines Pflegefalls interpretiert werden.
- Der Verlustvortrag ist im Worst Case ungenutzt und im Aggregat mit 331 EUR
  mittlerem Nutzen wirtschaftlich klein. „Wertlos“ ist dennoch zu absolut;
  einzelne Läufe können ihn nutzen.
- Langlebigkeitsrisiko bleibt relevant: Periodentafel ohne künftige
  Mortalitätsverbesserung, `longevityMode: none` und 346 am Horizont noch
  lebende Läufe. Diese 346 gelten nur **bis zum Horizont** als erfolgreich,
  nicht als vollständiger Lebenszeitnachweis.

### 9.4 Zusätzliche, in der Erstanalyse fehlende Punkte

#### C1 – MC-Drawdown ist nominal, der Sicherheits-Drawdown real (hoch)

Die MC-KPI `maximumDrawdownPct` lässt sich aus den nominalen jährlichen
Portfolio-Endwerten reproduzieren. Der P10-Endvermögenslauf hat dort einen
Drawdown von 34,83 %. Im selben Szenario-Log erreicht
`safety_real_drawdown_pct` jedoch 52,84 %, weil diese Größe den
Kaufkraftverlust betrachtet. Im Worst Case betragen die Werte 90,34 % nominal
und 90,65 % real.

Die UI-Beschreibung „größter Verlust von Peak zu Tief im Depot“ nennt diese
Nominalbasis nicht. Für eine Ruhestandsstrategie ist der reale Drawdown
mindestens ebenso entscheidend. **Handlungsbedarf:** Nominal/real im Namen und
Vertrag ausweisen und beide Kennzahlen nebeneinander zeigen.

#### C2 – Ein P10-Endvermögenspfad ist kein P10-Pfad aller Risiken (mittel)

Der ausgewählte P10-Log liegt nur bezüglich des **nominalen Endvermögens** bei
P10. Seine Entnahmekürzungen, Pflegehistorie, reale Drawdowns und Lebensdauer
liegen nicht automatisch ebenfalls am zehnten Perzentil. Beispielsweise hat
dieser Pfad 28 Finanzjahre, 24 Pflegejahre und einen realen Drawdown von
52,84 %. Er ist ein konkreter gemeinsamer Pfad, kein universelles
„konservatives P10-Szenario“.

#### C3 – Terminalvermögen mischt Laufzeiten und ist nominal (mittel)

Die Endvermögensverteilung endet teils beim Tod und teils am 35-Jahres-
Horizont. Sie mischt daher unterschiedlich lange Anspar-/Entnahme- und
Wachstumszeiten. Zusätzlich ist sie nominal und stark rechtsschief: Minimum
297.764 EUR, P90 74,54 Mio. EUR, Maximum 1,252 Mrd. EUR. Diese Werte sind
arithmetisch konsistent, sollten aber nicht allein als Robustheitsmaß dienen.
Reale Konsumkennzahlen, Floor-Shortfall und Laufzeit-/Outcome-Stratifizierung
sind aussagekräftiger.

#### C4 – Reale Depotentnahme: Aggregat und Worst-Case nicht vermischen (mittel)

Die globale KPI `realWithdrawalP10RealEur = 13.331,39 EUR` ist das P10 über
die **runbasierten P10-Entnahmen** aller 10.000 Läufe. Im konkreten
Worst-Case-Log beträgt die kleinste reale Jahresentnahme 13.763,09 EUR und die
letzte 16.577,69 EUR. Die Aussage in Abschnitt 5, der Worst Case führe auf
13.331 EUR zurück, vermischt daher Aggregat und Einzelpfad. Die fachliche
Kernaussage starker Konsumkürzung bleibt bestehen.

#### C5 – Quantilunsicherheit und Seed-Sensitivität (mittel)

Das Wilson-Intervall der Floor-Quote quantifiziert nur Monte-Carlo-
Stichprobenfehler, ausdrücklich nicht Modellrisiko. Für die reale
P10-Entnahme exportiert der Lauf kein Quantil-Konfidenzintervall. Ein einzelner
deterministischer Seed belegt außerdem keine Seed-Stabilität. Vor einer
Entscheidung sollten mehrere Seeds mit identischer Konfiguration verglichen
und P10, realer Drawdown, Kürzungsjahre sowie Horizon-Censoring protokolliert
werden.

### 9.5 Priorisierte Aktivitätsliste

#### Priorität A – vor maschineller oder externer Nutzung des Exports

1. Heatmap-Intervallvertrag korrigieren und versionieren (F1).
2. Renditeeinheiten eindeutig als Ratio oder Prozentpunkte versionieren (F2).
3. Beide Entnahmequoten nach Zweck, Nenner und Messzeitpunkt benennen (F3).
4. Missingness/Applicability konsistent umsetzen, einschließlich deaktiviertem
   Stress und Dynamic-Flex (F4).
5. Nominalen und realen Drawdown eindeutig trennen (C1).
6. Terminalrecords explizit typisieren (F8).

#### Priorität B – fachlicher Sollentscheid vor Engine-Änderungen

1. Soll Minimum-Flex beziehungsweise finale Glättung eine Guardrail-Kürzung
   im ersten Crashjahr überstimmen dürfen?
2. Soll Gold bei aktivierter Zielquote bereits in der Startallokation vorhanden
   sein oder bewusst erst opportunistisch aufgebaut werden?
3. Welche Mindestliquidität soll auch im lang andauernden Krisenpfad erzwungen
   werden, und welche Verkäufe dürfen dafür erfolgen?
4. Soll die Kirchensteuerformel rechtlich exakt statt konservativ vereinfacht
   sein?

#### Priorität C – Gegenläufe und Nutzereingaben

1. Partner-Rentenart, tatsächlichen Zahlbeginn, Indexierung und
   Hinterbliebenenwirkung anhand der Unterlagen verifizieren.
2. Uniform- und CAPE-Sampling als getrennte Sensitivitäten ausführen; nicht
   gleichzeitig ändern, damit die Ursache einer Abweichung erkennbar bleibt.
3. Danach Stress-Preset und Tail-Risk jeweils einzeln und kombiniert testen.
4. Mehrere Seeds sowie einen verlängerten Langlebigkeits-/Horizontlauf
   vergleichen.
5. Steuerfreiheit der konkreten Gold-/ETC-Instrumente verifizieren.

Die Punkte der Priorität A sind konkrete Implementierungsarbeit. Die Punkte
der Priorität B verändern potenziell Engine-Semantik und benötigen deshalb
vor Coding einen dokumentierten Sollentscheid und die nach Projektregeln
vorgeschriebene Slice-/Branch-Vorbereitung.
