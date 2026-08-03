# Datenpruefung des historischen Backtests 2000 bis 2025

**Pruefdatum:** 2026-07-29
**Pruefer:** Claude (Primary reviewer & Analyst)
**Status:** Korrekturprogramm in Umsetzung; Slice 01 bis 10 extern technisch
freigegeben und lokal committed; Slice 11 verwendet das vollstaendige
Slice-10-Ergebnisdokument als Eingangsgrenze, CR10-13/14 sind geschlossen und
Claudes Findings CR11-1 bis CR11-22 aus beiden Reviewrunden sind technisch
nachgebessert sowie selbstgeprueft; erneutes externes Re-Review, Freigabe und
Commit stehen aus
**Pruefgegenstand:** Exportdatei
`backtest-2000-2025-89fc3e368d64-2026-07-29T10-00-22.287Z.json`
**Anlass:** Nutzerseitige Verifikation nach Abschluss der Suite-Datenintegritaet-
Haertung (Slices 1 bis 16, Kopfcommit `860ba50`)
**Methode:** adversariales Review nach `CLAUDE.md`; gesucht wurden
Abweichungen zwischen den erfassten Rahmendaten, dem exportierten Request und
dem exportierten Ergebnis sowie Kennzahlen, die etwas anderes messen als ihr
Name behauptet

## Abgrenzung

Dieses Dokument ist keine Slice-Freigabe und stellt keine der sechzehn
Einzelfreigaben in Frage. Gegenstand ist allein die Frage, ob die Zahlen des
vorliegenden Backtestlaufs als Entscheidungsgrundlage taugen.

Das Dokument ist bewusst so aufgebaut, dass Codex und Gemini es erweitern
koennen: jeder Befund traegt eine eigene Kennung, eine Belegzeile und eine
leere Entscheidungsspalte. Bereits vergebene Kennungen duerfen nicht neu
belegt werden; neue Befunde setzen die Nummerierung ab `D-15` fort.

## Identifikation des geprueften Laufs

| Merkmal | Wert |
| --- | --- |
| Fingerprint | `89fc3e368d641ffed70dd7dcb78bc4980d021f053e97ab7ff2cc53f42a1754c7` |
| Request-Id | `btrq_c4f19e9005ed4a86daa55bbf431e8dca0b53514e585d95b45c9ee78a80ac1fa2` |
| Engine | apiVersion 31.0, buildId `2025-12-22_16-35` |
| Dataset | `ruhestandsapp-historical-data-v1`, Revision `2026-07-18.1` |
| Zeitkonvention | `realized_t_decision_t_minus_1_v1` |
| Zeitraum | 2000 bis 2025, 26 Jahre, `dataStatus: complete`, `outcome: completed` |
| Ausfuehrung | `single_path`, `breakOnRuin: true`, kein Ruin |

## Verifikationsbasis

Alle Aussagen beruhen auf eigener Nachrechnung an der Exportdatei und auf
Quelltextlektuere im Arbeitsbaum, nicht auf der Uebernahme fremder Protokolle.

| Nachweis | Ergebnis |
| --- | --- |
| Tranchenarithmetik gegen Rahmendaten | Depot 2.355.770,36 EUR, Geldmarkt 217.165,05 EUR, Summe 2.572.935,41 EUR, Einstand 1.637.990,82 EUR, +57,08 Prozent; deckungsgleich mit der Erfassungsmaske |
| Zerlegung Alt- gegen Neubestand | `depotwertAlt` 1.285.565 und `einstandAlt` 533.546 entsprechen der Summe der vier `aktien_alt`-Tranchen auf den Cent |
| Bilanzkontinuitaet ueber alle Jahresuebergaenge | 26 Uebergaenge geprueft, maximale Abweichung 0,000000 EUR |
| Rentenindexierung | lohnindexiert mit korrektem Versatz von einem Jahr, 26 von 26 Jahren Abweichung 0,00 EUR |
| Anrechnung des Rentenueberschusses | korrekt gegen den Flexbedarf verrechnet (`engine/core.mjs:610`), kumuliert 179.598,62 EUR nominal; 2002 und 2025 auf den Cent nachgerechnet |
| Kennzahlenaggregation gegen Zeilen | Entnahmesumme, Steuersumme, 21 Kuerzungsjahre, laengste Serie 20 Jahre, maximaler Drawdown 55,83 Prozent vollstaendig reproduzierbar |
| Realrechnung | Endvermoegen geteilt durch 1,66081 einschliesslich 2025, Zeilenwerte geteilt durch den Faktor zu Jahresbeginn; beide Konventionen sind in den `descriptors` korrekt deklariert |

## Befundregister

Schweregrade: **S** blockierend fuer die Verwendung der Zahlen,
**M** mittel, **L** leicht.

| Id | Schwere | Kurzfassung | Beleg | Entscheidung |
| --- | --- | --- | --- | --- |
| D-01 | S | Aktienquote 89,9 bis 100 Prozent bei `targetEq` 60 | `engine/transactions/transaction-surplus.mjs:76` | Keine feste Zielquote; Runway-Puffer ist beabsichtigt. Irrefuehrende Zielquoten-Semantik in Slice 8 bereinigen |
| D-02 | S | `runway_min_coverage_pct` misst eine 10.000-EUR-Konstante | `engine/config.mjs:62` | Post-Transaktions-Runway wird kanonisch; Slice 8 |
| D-03 | S | Mindest-Flex wird vor der letzten Kuerzungsstufe geprueft | Zeilen 2004 und 2009 des Exports | Slice 9 technisch umgesetzt: weicher Stabilisator mit finalem Soll/Ist/Fehlbetrag; externes Review ausstehend |
| D-04 | S | Aktienreihe ist ein Kursindex ohne Dividenden | `app/simulator/simulator-data.js:247` | Globale Net-Total-Return-Kette; Slice 2 |
| D-05 | M | CAPE-Spalte um ein Jahr gegen die uebrigen Spalten versetzt | `app/simulator/simulator-data.js:346` | CAPE bleibt `t-1`; Quelldaten und Versatz werden in Slice 6 belegt |
| D-06 | M | Zinsertraege sind vollstaendig steuerfrei | Zeile 2000 des Exports | Heutige Steuerlogik einschliesslich Zinsen; Slice 10 |
| D-07 | M | `tqf` 0,30 pauschal auf allen acht Tranchen | `request.inputs.detailledTranches` | Explizite Anlageklasse und TQF je Tranche; Slice 10 |
| D-08 | M | Drei von vier Altbestandspositionen sind kein Altbestand | `request.inputs.detailledTranches` | Heutiger Steuerzustand je Tranche, keine Namensableitung; Slice 10 |
| D-09 | M | `flex_reduction_max_pct` ueberzeichnet die tatsaechliche Einbusse | Nachrechnung ueber 26 Jahre | Haushaltsbasis in `HistoricalBacktestMetricsV2` durch Slice 9 korrigiert und in `HistoricalBacktestExportV2` mit Basis/Missingness projiziert; Slice 11 technisch umgesetzt, Review ausstehend |
| D-10 | M | Pflegelogik, Sterblichkeit und Sicherheitsstufen feuern nie | alle 26 Zeilen | 26-Jahres-Beispiellauf akzeptiert; Daten-/Markerpruefung in Slice 7 |
| D-11 | M | Widerspruch beim Mindest-Flex zwischen Register und Effektivwert | `app/simulator/simulator-profile-inputs.js:586` | Nutzerentscheidung und Slice 9: additive Profilwerte, fail-closed oberhalb des Haushalts-Flexbedarfs; externes Review ausstehend |
| D-12 | L | Namens- und Redundanzfallen in den Eingaben | `request.inputs` | Replay-Teil widerlegt; Legacy-Aliase, historische Signale, Startbestandteile und Ableitungen in V2 maschinenlesbar getrennt; Slice 11 technisch umgesetzt, Review ausstehend |
| D-13 | L | Quantisierung steckt unsichtbar in den Kennzahlen | `engine/config.mjs:213` | Aktive Jahres-/Monatsstufen, Rundungsphase und Floor-Schutz direkt aus der Engine-Konfiguration in V2 gebunden; Slice 11 technisch umgesetzt, Review ausstehend |
| D-14 | L | Zinsreihe ohne einheitliche Stichtagskonvention | `app/simulator/simulator-data.js:361` | Investierbare Geldmarkt-Jahresrendite; Slice 4 |
| D-15 | S | Aktienrendite 2024 weicht auch vom offiziellen MSCI-Price-Index massiv ab | MSCI-Factsheets und isolierter Replay | Vollstaendige Jahrespruefung und Ersatz; Slice 2 |
| D-16 | M | End-Snapshot mischt kanonische Endwerte mit unveraenderten Startfeldern | `result.portfolioSnapshots.end` | Interne Snapshots aus V2 entfernt; nur reconciliierte aggregierte Grenzen mit `restartable: false`; Slice 11 technisch umgesetzt, Review ausstehend |
| D-17 | M | Mindest-Flex-Jahresbetrag wird in vier aktiven Diagnosezeilen als 0 exportiert | Zeilen 2001, 2005, 2009 und 2010 | Slice-09-Diagnose-/Exportkorrektur technisch umgesetzt und durch eigenen Vierjahreszeugen gepinnt; externes Review ausstehend |
| D-18 | M | Alle Aktienpositionen erhalten dieselbe Proxy-Rendite | `app/simulator/simulator-year-portfolio.js:22` | Als bewusstes globales Proxy-Modell akzeptiert; kein positionsspezifischer Ausbau |
| D-19 | L | Engine-Provenienz identifiziert den Quellstand nicht eindeutig | `engine/config.mjs:11` und `request.engine` | Laufstart bindet sauberen Source-Commit, Engine-/Konfigurations- und Datenrevision fingerprintwirksam; fehlend/dirty blockiert V2; Slice 11 technisch umgesetzt, Review ausstehend |
| D-20 | M | Inflations- und Lohnreihe mischen beziehungsweise verfehlen offizielle Vergleichsreihen | Destatis-/DRV-Abgleich | VPI in Slice 3; Lohnidentitaet bei gleicher Funktionsverwendung in Slice 6 |

## Befunde im Einzelnen

### D-01 (S) Aktienquote 89,9 bis 100 Prozent bei einem Zielwert von 60

Die Aktienquote am Jahresende liegt in allen 26 Jahren zwischen 89,9 und
100,0 Prozent, im Mittel bei 95,4 Prozent. In 2004, 2005 und 2012 betraegt sie
exakt 100 Prozent, weil die Liquiditaet auf null faellt. Ein Verkauf in
Richtung Zielallokation findet in keinem einzigen Jahr statt.

Mechanik: In `engine/transactions/transaction-surplus.mjs` wird der
Liquiditaetsueberschuss zunaechst nur bis zur Oberkante des Rebalancing-Bandes
investiert. Liegt die Aktienposition bereits ueber diesem Band, ist `totalGap`
gleich null, und der Zweig ab Zeile 76 laesst dennoch einen Zukauf zu:

```
const equityOverflowCap = ((input.maxSkimPctOfEq ?? 5) / 100) * currentStockVal;
if (totalGap <= 0) {
    investAmountRaw = Math.min(surplus, equityOverflowCap);
}
```

Die beiden beobachteten Zukaeufe lassen sich damit exakt reproduzieren:

| Jahr | Ueberschuss | Obergrenze | Quantisierung | Exportwert |
| --- | --- | --- | --- | --- |
| 2000 | 191.165,05 EUR | 202.320 EUR | Abrundung auf 10.000er-Schritt | 190.000 EUR |
| 2022 | 33.786,09 EUR | 333.811 EUR | Abrundung auf 5.000er-Schritt | 30.000 EUR |

Folge: Der maximale Drawdown von 55,83 Prozent und die Serie von 21 Jahren mit
Flex-Kuerzung ab 10 Prozent sind kein Ergebnis einer 60/40-Allokation, sondern
das eines nahezu reinen Aktienportfolios. Der Export weist die Aktienquote
nicht als Kennzahl aus; sie muss aus `wertAktien` geteilt durch
`portfolio_total_end` selbst gebildet werden.

Nebenbefunde zur gleichen Stelle:

- `maxSkimPctOfEq` bedeutet dem Namen nach Abschoepfen, wird hier aber als
  Kaufobergrenze verwendet.
- `rebalBand` mit Wert 5 (Aktien) steht neben `rebalancingBand` mit Wert 25
  (Gold). Zwei fast gleichnamige Felder mit Faktor 5 Unterschied.

### D-02 (S) Die minimale Runway-Deckung misst eine Konstante, nicht die Liquiditaet

In 2004 und 2005 fuellt die Aktion `Notfall-Verkauf (Puffer-Auffuellung)` die
Liquiditaet auf exakt 10.000,00 EUR auf. Das ist
`CONFIG.THRESHOLDS.STRATEGY.absoluteMinLiquidity` aus `engine/config.mjs:62`,
unabhaengig von der Ziel-Liquiditaet und unabhaengig von der zulaessigen
Verkaufsobergrenze.

| Jahr | Ziel-Liquiditaet | erlaubter Bear-Refill (5 Prozent des Aktienwerts) | tatsaechlich aufgefuellt | Deckung laut Export |
| --- | --- | --- | --- | --- |
| 2004 | 59.200 EUR | 75.412,67 EUR | 10.000,00 EUR | 16,89 Prozent |
| 2005 | 72.200 EUR | 95.185,20 EUR | 10.000,00 EUR | 13,85 Prozent |

`RunwayCoveragePct` wird nach `engine/core.mjs:898` als
`liqNachTransaktion / zielLiquiditaet` gebildet und misst damit die Konstante.
Der Zaehler von 10.000,00 EUR taucht in keiner exportierten Liquiditaetsgroesse
dieser beiden Zeilen auf: `liqStart` betraegt 5.349,57 beziehungsweise 0,00 EUR,
`liq_before_payout` 26.400 beziehungsweise 31.200 EUR, `liqEnd` in beiden Jahren
0,00 EUR. In allen uebrigen 24 Jahren ist der Zaehler entweder `liqStart` oder
`liq_before_payout`.

Die Kennzahl `runway_min_coverage_pct` mit 13,85 Prozent, also der ausgewiesene
Tiefpunkt des gesamten Laufs, stammt genau aus einem dieser beiden
konstruierten Jahre. Die Wahrheit ist schlechter als die Kennzahl: die
Liquiditaet ist in beiden Jahren nach der Auszahlung vollstaendig aufgebraucht.

Verschaerfend: In beiden Jahren folgte ein Zwangsverkauf
(`forcedShortfall` 16.400 EUR beziehungsweise 21.200 EUR), dennoch bleiben
`Alarm` und `floor_shortfall_occurred` auf false. `Alarm` feuert in 2002, 2003
und 2008, ausgerechnet nicht in den beiden Jahren, in denen der Puffer
tatsaechlich versagt.

### D-03 (S) Der Mindest-Flex wird vor der letzten Kuerzungsstufe geprueft

`minimumFlexEffectiveAfter` ist der Flexbetrag nach der Mindest-Flex-Stufe,
aber vor dem Final-Guardrail. Fuer 2004 betraegt er 36.593 EUR, das sind
61,8 Prozent des Bruttoflexbedarfs und damit mehr als die geforderten
53,7 Prozent. Der Status lautet folgerichtig `not_needed`. Anschliessend kuerzt
die Glaettung auf 26.400 EUR, also 44,6 Prozent, und liegt damit 9,1
Prozentpunkte unter der geforderten Mindestrate. Das Statusfeld wird nicht
erneut ausgewertet und meldet weiterhin `not_needed`.

Ein zweiter Umgehungspfad ist der Flex-Budget-Cap: 2009 und 2010 tragen den
Status `limited_by_flex_budget` und unterschreiten die geforderte Rate
ebenfalls.

Tatsaechliche Unterschreitung nach Anrechnung des Rentenueberschusses, gemessen
gegen den inflationsindexierten Mindest-Flex:

| Jahr | Mindest-Flex indexiert | verfuegbar (Depotflex plus Rentenueberschuss) | Unterdeckung |
| --- | --- | --- | --- |
| 2004 | 31.777 EUR | 30.764 EUR | 1.013 EUR (3,2 Prozent) |
| 2009 | 35.117 EUR | 33.488 EUR | 1.629 EUR (4,6 Prozent) |

In allen uebrigen 24 Jahren haelt die Untergrenze. Die Zusage
Mindest-Flex 30.000 EUR ist damit keine Garantie, und die Diagnosefelder
protokollieren die Verletzung nicht.

### D-04 (S) Die Aktienreihe ist ein Kursindex ohne Dividenden

Die Reihe `msci_eur` laeuft von 823,1 im Jahr 2000 auf 2633,8 im Jahr 2025, das
sind 4,8 Prozent pro Jahr. `app/simulator/simulator-data.js:247` haelt selbst
fest, dass die CAGR der Reihe eher zu einem Price Index passt, und das Manifest
deklariert `variant: { status: 'unresolved', value: null }`.

Die tatsaechlich gehaltenen Positionen sind Welt-Aktien-ETFs, deren
Gesamtrendite Dividenden einschliesst. Ueber 26 Jahre entspricht die
Abweichung grob einem Faktor 1,66.

Der Export meldet dennoch fuer jedes Renditefeld `qualityStatus: "present"` und
fuer jeden Jahresdatensatz `alignmentStatus: "approved_d01"`. Nichts im Export
weist darauf hin, dass die Indexvariante formal ungeklaert ist. Das
Endvermoegen von 4.389.885 EUR ist deshalb kein Nachbau der Vergangenheit,
sondern deren dividendenfreie Untergrenze.

### D-05 (M) Die CAPE-Spalte ist gegen die uebrigen Spalten derselben Zeile versetzt

Der Nachweis kommt ohne externe Quelle aus. `msci_eur[2008]` betraegt 462,6
gegen 842,2 im Vorjahr, also minus 45,1 Prozent; die Zeile traegt damit
eindeutig den Jahresendstand 2008. Im selben Datensatz steht `cape[2008]` bei
24,0 und `cape[2009]` bei 15,2. Ein CAPE von 15 gehoert an den Krisentiefpunkt
zum Jahresende 2008, nicht an das Jahresende 2009, zu dem der Index bereits auf
609,4 und damit um 31,7 Prozent erholt war. `cape[Y]` traegt folglich die
Bewertung per Ende `Y-1`, waehrend `msci_eur[Y]` den Stand per Ende `Y` traegt.

Darauf legt die Zeitkonvention `realized_t_decision_t_minus_1_v1` einen zweiten
Versatz: fuer das Simulationsjahr 2000 wird `cape[1999]` mit 40,6 verwendet,
also eine zwei Jahre alte Bewertung.

Die Wirkung ist in diesem Lauf begrenzt, weil VPW deaktiviert ist
(`vpw.status: "disabled"`, da `dynamicFlex: false`). Regimeerkennung und
`expectedReturnCape` konsumieren den Wert dennoch.

### D-06 (M) Zinsertraege sind vollstaendig steuerfrei

Ueber 26 Jahre fallen 40.274,78 EUR Zinsertrag an. Entscheidender Beleg ist
das Jahr 2000: 4.724,51 EUR Zinsertrag, kein Verkauf, `steuern_gesamt` gleich 0
und `usedSPB` gleich 0. Die Zinsen liegen damit ausserhalb der
Steuerbemessungsgrundlage und verbrauchen auch keinen Sparerpauschbetrag.

Gegenlaeufig: Zins wird nur auf den Bestand nach der Auszahlung berechnet
(`liqBasisForInterest` betraegt 2000 lediglich 111.165,05 EUR gegenueber einem
Jahresanfangsbestand von 361.165,05 EUR). Allein in 2000 kostet das rund
10.600 EUR Zinsertrag. Zwei Fehler in entgegengesetzte Richtungen, die sich
nicht sauber aufheben.

Anmerkung zur historischen Treue: Der Lauf wendet ueber den gesamten Zeitraum
2000 bis 2025 dieselbe Abgeltungsteuersystematik mit Teilfreistellung und einem
konstanten Sparerpauschbetrag von 2.000 EUR an. Abgeltungsteuer gibt es erst ab
2009, Teilfreistellung erst ab 2018, den Pauschbetrag in dieser Hoehe erst ab
2023.

### D-07 (M) Teilfreistellung 0,30 pauschal auf allen acht Tranchen

Alle acht Tranchen tragen `tqf: 0.3`. Die Aktienfonds-Teilfreistellung von
30 Prozent steht keiner der folgenden Positionen zu:

| Position | Art | zutreffende Teilfreistellung |
| --- | --- | --- |
| XTR.II EUR OV.RATE SW. 1C (LU0290358497), zwei Tranchen | Geldmarktfonds | 0 Prozent |
| SAP SE O.N. (DE0007164600) | Einzelaktie | 0 Prozent |

Bei SAP betrifft das 48.322,56 EUR Buchgewinn. Fuer die Geldmarktpositionen ist
die Wirkung im vorliegenden Lauf gering, weil sie der Liquiditaet zugeordnet
sind.

### D-08 (M) Drei von vier Altbestandspositionen sind kein Altbestand

| Position | Kaufdatum | Klassifikation |
| --- | --- | --- |
| SAP SE O.N. | 2000-01-01 | `aktien_alt` (zutreffend) |
| UBS MSCI WLD DLAD | 2017-12-31 | `aktien_alt` (nach 2009 erworben) |
| VANG.FTSE A.-WO.U.ETF DLD | 2018-12-31 | `aktien_alt` (nach 2009 erworben) |
| X(IE)-MSCIACWLDSC 1C | 2017-12-31 | `aktien_alt` (nach 2009 erworben) |

Steuerlich ist die Klassifikation folgenlos, weil der Tranchenpfad ueber
`costBasis` und `tqf` besteuert; ein Verdacht auf unzulaessige Steuerbefreiung
wurde geprueft und verworfen. Die Klassifikation steuert jedoch die
Verkaufsallokation (`engine/transactions/transaction-action.mjs:203`).

Umgekehrt bildet das Modell die tatsaechliche Steuerfreiheit des echten
Altbestands nicht ab. Der Tranchenhinweis "Steuerfrei durch lange Haltedauer"
ist Freitext ohne Wirkung.

### D-09 (M) Die maximale Flex-Kuerzung ueberzeichnet die tatsaechliche Einbusse

Gemeldet wird `flex_reduction_max_pct` mit 56,06 Prozent fuer 2009. Die
tatsaechliche Einbusse der Haushaltskaufkraft, gemessen als Depotflex plus
Rentenueberschuss gegen den unverkuerzt indexierten Flexbedarf, betraegt
52,3 Prozent.

Ursache: Der Rentenueberschuss reduziert nach `engine/core.mjs:617` die
Bezugsbasis, bevor die Kuerzungsquote gebildet wird. Die Differenz betraegt
durchgaengig drei bis vier Prozentpunkte und waechst mit dem Rentenueberschuss.

### D-10 (M) Pflegelogik, Sterblichkeit und Sicherheitsstufen feuern nie

| Eingabe | Wert | Beobachtung ueber 26 Zeilen |
| --- | --- | --- |
| `pflegefallLogikAktivieren` | true, Modell chronisch, `pflegeMaxFloor` 120.000 EUR | `CareP1_Active`, `CareP2_Active`, `pflege_aktiv`, `pflege_kumuliert`, `health_bucket_triggered` durchgaengig 0 beziehungsweise false |
| Altersverlauf | 60 bis 86 und 63 bis 89 | `Person1Alive` und `Person2Alive` durchgaengig 1, Witwenoptionen greifen nie |
| `risikoprofil` | `sicherheits-dynamisch` | `safety_score` und `safety_stage_current` durchgaengig 0, obwohl `safety_real_drawdown_pct` 54,8 Prozent erreicht |

Der Lauf enthaelt damit keinerlei Pflegekosten. Fuer einen deterministischen
Einzelpfad kann das beabsichtigt sein; aus dem Ergebnis geht es nicht hervor.

### D-11 (M) Widerspruch beim Mindest-Flex zwischen Register und Effektivwert

`minimumFlexProfiles` fuehrt Dieter mit 36.000 EUR und Karin mit 30.000 EUR.
Die dokumentierte Verbundregel ist die Summe
(`app/simulator/simulator-profile-inputs.js:586` und `:624`), was 66.000 EUR
ergaebe. Effektiv gerechnet wird mit 30.000 EUR, dem Wert des Quellprofils
`karin`.

Zugleich waere die Summenregel hier fachlich unsinnig, weil 66.000 EUR ueber
dem aggregierten Flexbedarf von 60.000 EUR laegen. Das deutet darauf hin, dass
die beiden Profilwerte nicht dieselbe Bezugsgroesse haben.

**Offene Frage an den Nutzer:** Sind die Werte 36.000 und 30.000 in den
Profilen pro Person oder pro Haushalt gemeint?

### D-12 (L) Namens- und Redundanzfallen in den Eingaben

| Feld | Beobachtung |
| --- | --- |
| `zielLiquiditaet` 361.165 | keine Zielgroesse, sondern Tagesgeld plus Geldmarkt (`app/simulator/simulator-input-strategy.js:51`); die Engine rechnet eigene Ziele, 170.000 EUR in 2000 und 254.600 EUR in 2025 |
| `capeRatio` 32 | im historischen Backtest ohne Wirkung; verwendet wird korrekt der historische Wert `capeRatioUsed` 40,6 |
| `startVermoegen` 2.716.935 und `geldmarktEtf` 217.165 | auf ganze Euro gerundete Duplikate; gerechnet wird mit 2.716.935,41 EUR und 217.165,05 EUR |
| `depotwertNeu` | fehlt vollstaendig in `request.inputs`, waehrend `depotwertAlt` vorhanden ist; die Engine setzt fehlend auf 0 (`engine/core.mjs:57`) |

Zum letzten Punkt: Im vorliegenden Lauf aendert das Fehlen nichts, weil in
beiden Lesarten der Liquiditaetsueberschuss bindend ist. Beide Zukaufsjahre
wurden gegengerechnet. Der Export erfuellt damit jedoch seinen eigenen
Reproduzierbarkeitsanspruch nicht, weil `request.inputs` allein keine
vollstaendige Wiederholung erlaubt.

### D-13 (L) Quantisierung steckt unsichtbar in den Kennzahlen

`CONFIG.ANTI_PSEUDO_ACCURACY` rundet Entnahmen auf runde Monatsbetraege. Alle
26 Jahresentnahmen sind Vielfache von 600 EUR; die glatte Gesamtsumme von
1.263.600,00 EUR ist genau deshalb glatt.

`minimumFlexEffectiveAfter` ist der Wert vor, `flex_erfuellt_nominal` der Wert
nach der Quantisierung. Beispiel 2000: 56.004,90 EUR gegen 55.800 EUR. Die
gemeldete Kuerzung von 7 Prozent besteht damit aus 6,66 Prozent
Modellentscheidung und dem Rest aus Rundung.

### D-14 (L) Zinsreihe ohne einheitliche Stichtagskonvention

`zinssatz_de[2024]` betraegt 3,75 und liegt damit ueber `[2023]` mit 3,5,
obwohl 2024 ein Lockerungsjahr war. `[2022]` mit 1,25 passt weder zum
Jahresdurchschnitt noch zum Jahresende. Zusammen mit `variant: unresolved` im
Manifest spricht das dafuer, dass die Kurzfristzinsreihe keine einheitliche
Konvention verwendet.

Ferner werden die minus 0,5 Prozent der Jahre 2020 und 2021 auf den gesamten
Liquiditaetsbestand einschliesslich Tagesgeld angewandt, was zu minus 845 EUR
und minus 1.138 EUR fuehrt.

**Externe Verifikation ausstehend.** Dieser Befund beruht auf einer
Plausibilitaetseinschaetzung, nicht auf einem Abgleich mit der Primaerquelle.

## Geprueft und verworfen

Diese Verdachtsmomente wurden im Verlauf der Pruefung aufgestellt und durch
Nachrechnung widerlegt. Sie sind hier festgehalten, damit sie nicht erneut
aufgeworfen werden.

| Verdacht | Ergebnis der Pruefung |
| --- | --- |
| Rentenueberschuss ueber dem Floor gehe verloren | widerlegt; er wird auf den Flexbedarf angerechnet (`engine/core.mjs:610` bis `:618`), kumuliert 179.598,62 EUR, in 2002 und 2025 auf den Cent nachgerechnet |
| `aktien_alt` erhalte eine unzulaessige Steuerbefreiung | widerlegt; bei vorhandenen `detailledTranches` greift der Tranchenpfad (`engine/transactions/sale-engine.mjs:230`), Besteuerung ueber `costBasis` und `tqf` |
| Der Zukauf von 190.000 EUR in 2000 beruhe auf einem eingefrorenen `depotwertAlt` | widerlegt; beide Lesarten liefern denselben Betrag, bindend ist der Liquiditaetsueberschuss |
| `kaufAkt` und `netTradeEq` seien 2022 inkonsistent | widerlegt; Fehler in der eigenen Spaltenausgabe, `balance_trace` bestaetigt 30.000 EUR |
| Die Metrikaggregation weiche von den Zeilen ab | widerlegt; Entnahmesumme und Steuersumme stimmen bis auf Gleitkommarauschen |

## Pruefdimensionen nach CLAUDE.md

**Korrektheit.** Die Bilanzmechanik ist fehlerfrei: 26 Jahresuebergaenge ohne
jede Abweichung, alle Kennzahlen aus den Zeilen reproduzierbar. Die Fehler
liegen nicht in der Arithmetik, sondern darin, dass mehrere Kennzahlen etwas
anderes messen als ihr Name behauptet (D-02, D-09) und dass eine Zielvorgabe
faktisch wirkungslos bleibt (D-01).

**Vertragstreue.** Zwei zugesagte Groessen werden nicht eingehalten: die
Zielaktienquote von 60 Prozent (D-01) und die Mindest-Flex-Untergrenze (D-03).
In beiden Faellen meldet der Export keinen Verstoss.

**Fehlerbehandlung.** Der stille Ersatzwert bei fehlendem `depotwertNeu`
(D-12) folgt demselben Muster wie die in Slice 3 dokumentierten Befunde S03-2
und S03-3: eine fehlende Eingabe wird durch 0 ersetzt, ohne dass ein Signal
entsteht. Die Alarmierung feuert nicht in den Jahren mit tatsaechlicher
Liquiditaetserschoepfung (D-02).

**Seiteneffekte.** Die Quantisierung (D-13) wirkt auf jede abgeleitete
Kuerzungskennzahl, ohne an den Kennzahlen selbst dokumentiert zu sein.

**Was koennte brechen.** Die kritischste Konstellation ist die Kombination aus
D-01 und D-04: eine zu hohe Aktienquote und eine zu niedrige Aktienrendite
kompensieren sich in diesem Lauf teilweise. Wird nur einer der beiden Fehler
korrigiert, kippt das Ergebnis.

## Pre-Mortem

Angenommen, diese Zahlen verursachen in drei Monaten eine Fehlentscheidung:
Die wahrscheinlichste Ursache ist, dass jemand die Aussage
"Backtest 2000 bis 2025 ueberstanden, Endvermoegen 4,4 Millionen, kein Ruin"
als Bestaetigung der erfassten Rahmendaten liest. Tatsaechlich hat der Lauf die
schwerste Marktphase der juengeren Geschichte mit 95 Prozent Aktienquote und
ohne Dividenden durchlaufen. Beide Abweichungen zeigen in entgegengesetzte
Richtungen und haben sich zufaellig teilweise ausgeglichen. Faellt die Quote
durch eine spaetere Korrektur auf die vorgesehenen 60 Prozent, ohne dass
gleichzeitig die Dividenden nachgezogen werden, kippt derselbe Pfad ins
Negative. Niemand wird es bemerken, weil die Aktienquote im Export gar nicht
als Kennzahl ausgewiesen wird.

## Review-Ergebnis

- **Status:** blockiert fuer die Verwendung der Zahlen als
  Entscheidungsgrundlage; die Bilanzmechanik selbst ist freigabefaehig
- **Blocker:** D-01, D-02, D-03, D-04
- **Restrisiken:** D-05 bis D-14, insbesondere die doppelte CAPE-Verzoegerung,
  die unversteuerten Zinsertraege, die pauschale Teilfreistellung und der
  ungeklaerte Bezug der Mindest-Flex-Profilwerte
- **Pre-Mortem:** siehe vorstehenden Abschnitt

## Erweiterungsbereich fuer Codex

### Auftrag und Abgrenzung

Codex hat am 2026-07-29 die vorstehenden Claude-Ergebnisse mit einer
unabhaengigen Nachrechnung des Exports, einem exakten Re-Run auf dem aktuellen
Arbeitsbaum (`ca982cf`) und einem Abgleich gegen offizielle Primaerquellen
konsolidiert. Dies ist eine Datenanalyse und keine Code- oder Slice-Freigabe.
Programmdateien wurden dabei nicht veraendert.

Der Re-Run wurde ausschliesslich aus `request.inputs`, dem manifestierten
historischen Provider und den produktiven Runner-Abhaengigkeiten aufgebaut.
Er reproduziert `outcome`, alle 26 `rows`, beide `portfolioSnapshots`,
`historicalYearRecords`, `metrics` und `summary` kanonisch exakt. Auch
Request-Id, Run-Id und SHA-256-Fingerprint wurden unabhaengig nachgerechnet.

Fuenf fokussierte Testdateien bestanden zusammen 702 Assertions:

- `historical-backtest-contract.test.mjs`
- `historical-backtest-runner.test.mjs`
- `historical-backtest-metrics.test.mjs`
- `historical-backtest-export.test.mjs`
- `simulator-backtest.test.mjs`

Diese Tests belegen Struktur, Zeitachse, Aggregation und Reproduzierbarkeit.
Sie pruefen nicht, ob die eingebetteten historischen Zahlen mit einer externen
Kapitalmarkt- oder Statistikquelle uebereinstimmen.

### Punktweiser Abgleich mit D-01 bis D-14

| Claude-Befund | Codex-Abgleich | Konsolidierung |
| --- | --- | --- |
| D-01 | bestaetigt | Die Aktienquote liegt bei 89,9426 bis 100,0000 Prozent, im Mittel bei 95,3991 Prozent. Das Ergebnis ist kein 60/40-Lauf. |
| D-02 | bestaetigt und verschaerft | Die kanonische Metrikaggregation ist rechnerisch korrekt, aber ihr Rohfeld ist semantisch problematisch. 2004, 2005 und 2012 endet die kanonische Liquiditaet bei 0 EUR; das Minimum 13,8504 Prozent stammt dennoch aus der Diagnose vor beziehungsweise innerhalb der Transaktionsfolge. |
| D-03 | bestaetigt | Mindest-Flex ist eine Policy-Stufe vor Flex-Budget und finaler Glaettung, keine garantierte Enduntergrenze. D-17 ergaenzt einen davon unabhaengigen Exportfehler im Jahresbetrag. |
| D-04 | bestaetigt, aber nicht als strikte Untergrenze | Die fehlende Total-Return-Definition ist blockierend. Der Ausdruck "dividendenfreie Untergrenze" ist nur richtungsweisend: wegen Strategiefeedback, Steuern und der fehlerhaften Einzelbeobachtung 2024 ist mathematisch keine strikte Untergrenze bewiesen. Siehe D-15. |
| D-05 | teilweise bestaetigt | Der produktive Contract verwendet CAPE absichtlich als `t-1`-Entscheidungswert. Ob die eingebettete Rohreihe selbst bereits um ein weiteres Jahr vorversetzt ist, bleibt mangels dokumentierter externer Quelle nicht abschliessend bewiesen. Die Ergebniswirkung ist hier begrenzt, weil VPW deaktiviert ist. |
| D-06 | bestaetigt | Die 40.274,78 EUR Cashzinsen gehen nicht in das zentrale Verkaufsteuer-Settlement ein. Der Lauf modelliert ausserdem ueber alle 26 Jahre dieselbe heutige, vereinfachte Steuerlogik. |
| D-07 | bestaetigt und eingegrenzt | Alle acht Request-Tranchen tragen `tqf: 0.3`; fuer SAP und Geldmarkt ist dies keine fachlich belegte Teilfreistellung. SAP wird in diesem Lauf nicht verkauft, die unveraenderten 352 Stueck am Laufende belegen daher keine aktuelle Steuerwirkung dieses Fehlers. |
| D-08 | bestaetigt | `aktien_alt` ist keine automatische Steuerbefreiung. Kaufdatum und Freitextnotiz ersetzen im Modell kein explizites Steuerflag. |
| D-09 | bestaetigt | Als zusaetzliche Gesamtperspektive werden von 1.747.891,14 EUR nominalem Bruttoflex 1.255.359,00 EUR erfuellt, also 71,8213 Prozent. |
| D-10 | bestaetigt | Beide Personen bleiben in allen Zeilen am Leben; Pflege, Witwenlogik und Health Bucket bleiben wirkungslos. Zudem deckt der gewaehlte Zeitraum nur 26 der konfigurierten 30 Horizontjahre ab. |
| D-11 | bestaetigt | Effektiv angewendet werden 30.000 EUR Haushalts-Mindest-Flex, waehrend die Metadaten 36.000 plus 30.000 EUR ausweisen. Die Nutzerintention bleibt zu klaeren. |
| D-12 | teilweise bestaetigt, Replay-Behauptung widerlegt | Rundungen und aehnliche Feldnamen sind reale Lesefallen. Das fehlende `depotwertNeu` verhindert die Reproduktion jedoch nicht: Bei vorhandenen `detailledTranches` sind die acht Tranchen die kanonische Bestandsquelle. Der exakte Re-Run aus dem exportierten Request ist gelungen. |
| D-13 | bestaetigt | Plan- und Effektiventnahmen stimmen je Jahr ueberein, sind aber durch die 600-EUR-Jahresquantisierung gepraegt. Rohwerte vor Quantisierung duerfen nicht mit der finalen Entnahme gleichgesetzt werden. |
| D-14 | plausibel, jetzt extern ergaenzt | Die genaue Zinsvariante und Stichtagsregel bleiben im Manifest `unresolved`. Ohne definierte Reihe kann weder Jahresend- noch Jahresdurchschnittstreue behauptet werden. |

### Korrekturhinweis zu D-12

Die Aussage, `request.inputs` erlaube wegen des fehlenden Felds
`depotwertNeu` keine vollstaendige Wiederholung, wird durch den exakten Replay
widerlegt. `initializePortfolioDetailed()` konsumiert bei vorhandenen
`detailledTranches` die einzelnen Marktwerte und Einstandswerte; die
Legacy-Aggregate `depotwertAlt` und `depotwertNeu` sind fuer diese
Initialisierung nicht die Bestandsquelle.

Der Export bleibt langfristig nur zusammen mit dem passenden Code- und
Datensatzstand reproduzierbar. Dieses davon getrennte Provenienzproblem ist
unter D-19 dokumentiert.

### D-15 (S) Aktienrendite 2024 weicht auch vom offiziellen MSCI-Price-Index massiv ab

Der Export berechnet fuer 2024:

```
2500,0 / 2318,9 - 1 = 7,8097 Prozent
```

Die offiziellen MSCI-Factsheets nennen fuer den MSCI World in EUR:

| Jahr | Export | MSCI World EUR Price | MSCI World EUR Net |
| --- | ---: | ---: | ---: |
| 2023 | 18,26 Prozent | 17,64 Prozent | 19,60 Prozent |
| 2024 | 7,81 Prozent | 24,81 Prozent | 26,60 Prozent |
| 2025 | 5,35 Prozent | 5,35 Prozent | 6,77 Prozent |

Primaerquellen:

- [MSCI World EUR Price Return](https://www.msci.com/documents/10199/255599/msci-world-index-eur-price.pdf)
- [MSCI World EUR Net Return](https://www.msci.com/resources/factsheets/index_fact_sheet/msci-world-index-eur-net.pdf)

Der exakte Treffer des Exportwerts fuer 2025 mit der Price-Reihe ist ein
Indiz, keine formale Provenienz, dass zuletzt die Price-Variante beabsichtigt
war. Selbst unter dieser fuer das Ergebnis konservativeren Variante ist 2024
kein plausibler MSCI-World-EUR-Wert.

Isolierte Sensitivitaet, ausschliesslich der Aktienreturn 2024 wurde ersetzt:

| Variante | Endvermoegen | Aenderung gegen Export |
| --- | ---: | ---: |
| Export 7,81 Prozent | 4.389.885,04 EUR | - |
| MSCI Price 24,81 Prozent | 5.070.023,86 EUR | +680.138,82 EUR |
| MSCI Net 26,60 Prozent | 5.142.355,78 EUR | +752.470,74 EUR |

Die Sensitivitaet ist kein korrigierter Forschungsdatensatz. Sie zeigt nur,
dass eine einzige ungepruefte Beobachtung das Endergebnis um 15 bis 17 Prozent
des ausgewiesenen Endvermoegens verschiebt. Der strukturelle Content-Hash
schuetzt diesen Wert gegen unbemerkte Aenderung, bestaetigt aber nicht seine
externe Richtigkeit.

### D-16 (M) End-Snapshot mischt kanonische Endwerte mit unveraenderten Startfeldern

Das Endvermoegen und die letzte Jahreszeile sind korrekt reconciliert:

```
4.201.150,53 EUR Aktien + 188.734,51 EUR Liquiditaet
= 4.389.885,04 EUR
```

Innerhalb von `portfolioSnapshots.end` stehen daneben jedoch Unterfelder, die
weiterhin den Startzustand zeigen:

| Feld | kanonischer Endwert | konkurrierende Unterfelder |
| --- | ---: | ---: |
| Liquiditaet | 188.734,51 EUR | `tagesgeld + geldmarktEtf` = 361.165,05 EUR |
| SAP-Marktwert | 152.143,06 EUR | `shares * currentPrice` = 352 * 157,28 = 55.362,56 EUR |
| UBS-Marktwert | 1.535.092,96 EUR | `shares * currentPrice` = 558.597,12 EUR |

Die Simulation schreibt `marketValue` mit der Proxy-Rendite fort und reduziert
bei Verkaeufen Marktwert, Cost Basis und Stueckzahl. `currentPrice`,
`tagesgeld`, `geldmarktEtf` und die Geldmarkt-Tranchen werden im normalen
Jahrespfad dagegen nicht als Endkomponenten fortgeschrieben.

Folge: Summary und Metriken sind nicht betroffen, aber der End-Snapshot darf
nicht als physisch reconciliertes Depot oder als Importquelle fuer einen
Folgelauf interpretiert werden.

### D-17 (M) Mindest-Flex-Jahresbetrag wird in vier aktiven Diagnosezeilen als 0 exportiert

In vier Jahren widerspricht `row.minimumFlexAnnual` den uebrigen Feldern
derselben Zeile:

| Jahr | exportierter Jahresbetrag | Status | erforderliche Rate |
| --- | ---: | --- | ---: |
| 2001 | 0 EUR | `limited_by_flex_budget` | 50,00 Prozent |
| 2005 | 0 EUR | `applied` | 53,53 Prozent |
| 2009 | 0 EUR | `limited_by_flex_budget` | 53,58 Prozent |
| 2010 | 0 EUR | `limited_by_flex_budget` | 53,74 Prozent |

Die erforderlichen Raten und `minimumFlexEffectiveBefore/After` belegen, dass
die Policy mit dem inflationsindexierten Mindestbetrag gerechnet hat. Der
Nullwert ist deshalb ein Diagnose-/Exportfehler und kein Beleg dafuer, dass
die Policy in diesen Jahren deaktiviert war. D-03 bleibt als getrennte
fachliche Verletzung der finalen Untergrenze bestehen.

### D-18 (M) Alle Aktienpositionen erhalten dieselbe Proxy-Rendite

`applyAnnualReturnsToPortfolio()` multipliziert jede Nicht-Bond-Tranche mit
demselben `rA`. Damit erhalten SAP, MSCI World, FTSE All-World und der
ACWI-Small-Cap-Fonds in jedem Jahr exakt dieselbe Rendite.

Der Backtest bildet deshalb nicht die historische Entwicklung des erfassten
Depots nach. Er simuliert die heutige Startbewertung und die steuerlichen Lots
unter einer einzigen globalen Aktienproxy-Reihe. Individuelle Titel-, Faktor-,
Regionen-, Fonds- und Tracking-Differenzen fehlen.

Dieser Befund ist von D-04/D-15 zu trennen:

- D-04 betrifft Price versus Total Return.
- D-15 betrifft einen konkret extern widerlegten Jahreswert.
- D-18 betrifft die fehlende positionsspezifische Renditeabbildung.

### D-19 (L) Engine-Provenienz identifiziert den Quellstand nicht eindeutig

`request.engine.buildId` lautet `2025-12-22_16-35`; derselbe String steht als
statische Konstante in `engine/config.mjs`, obwohl der aktuelle Quellstand aus
2026 den Lauf exakt reproduziert. Der Config-Fingerprint erfasst die
Konfiguration, aber keinen Hash aller produktiven Rechenmodule oder einen
Git-Commit.

Der Run-Fingerprint beweist, dass Request und exportiertes Ergebnis
zusammengehoeren. Er beweist nicht, welcher Quelltext dieses Ergebnis erzeugt
hat. Fuer langfristige externe Reproduktion sollte die Engine-Provenienz
mindestens einen Build- oder Source-Commit-Hash enthalten.

### D-20 (M) Inflations- und Lohnreihe mischen beziehungsweise verfehlen offizielle Vergleichsreihen

Der Export verwendet fuer 2024 eine Inflation von 2,5 Prozent. Destatis weist
fuer dasselbe Jahr 2,2 Prozent nationalen Verbraucherpreisindex und
2,5 Prozent harmonisierten Verbraucherpreisindex aus. Der Datensatz ist als
`German CPI inflation proxy` bezeichnet, die Variante bleibt jedoch
`unresolved`.

Quelle:
[Destatis, Verbraucherpreisindex 2024](https://www.destatis.de/DE/Presse/Pressemitteilungen/2025/01/PD25_020_611.html)

Die Reihe `lohn_de` verwendet 2024 3,0 Prozent. Offizielle Vergleiche nennen:

- 5,4 Prozent Nominallohnwachstum:
  [Destatis, Reallohn- und Nominallohnentwicklung](https://www.destatis.de/DE/Themen/Arbeit/Verdienste/Realloehne-Nettoverdienste/Tabellen/reallohnentwicklung-jahre.html)
- 4,57 Prozent gesetzliche Rentenanpassung:
  [Deutsche Rentenversicherung, Rentenanpassung 2024](https://www.deutsche-rentenversicherung.de/DRV/DE/Ueber-uns-und-Presse/Presse/Meldungen/2024/240319-rentenanpassung-2024.html)

Damit ist `lohn_de` weder als amtliche Nominallohnreihe noch als tatsaechliche
Rentenanpassungsreihe identifiziert.

Isolierte Wirkung in diesem Lauf:

- Inflation 2024 von 2,5 auf 2,2 Prozent: nominales Endvermoegen unveraendert,
  reales Endvermoegen +7.758,95 EUR.
- Lohnwert 2024 auf 4,57 beziehungsweise 5,4 Prozent: hoehere ausgewiesene
  Rente 2025, aber wegen des bereits durch Renten gedeckten Floors keine
  Aenderung von Entnahmesumme oder Endvermoegen.

Die geringe Wirkung in diesem konkreten Pfad mindert nicht das
Provenienzproblem fuer andere Startjahre, Rentenhoehen oder Floor-Bedarfe.

### Konsolidiertes Datenurteil von Codex

Die technische Rechen- und Exportkette ist fuer den vorliegenden Request
deterministisch und bis auf Gleitkommarauschen bilanziell geschlossen. Die
von Claude dokumentierten Kernprobleme D-01 bis D-04 werden durch den
Codex-Abgleich im Wesentlichen bestaetigt; D-15 verschaerft insbesondere D-04
um einen konkreten, ergebnisrelevanten Jahresdatenfehler.

Zum Zeitpunkt der Datenpruefung waren vor einer Verwendung als persoenliche
Entscheidungsgrundlage mindestens folgende Sachfragen offen:

1. Zielallokation und Rebalancing-Semantik (D-01).
2. Runway- und Alarm-Semantik (D-02).
3. Verbindlichkeit des Mindest-Flex nach allen Policy-Stufen (D-03, D-17).
4. Identitaet, Variante und konkrete Jahreswerte der Aktienreihe, zuerst 2024
   (D-04, D-15).
5. Bedeutung der profilbezogenen Mindest-Flex-Werte (D-11).
6. Verwendbare Semantik des End-Snapshots (D-16).

Die Entscheidungen zu diesen Punkten sind inzwischen im nachstehenden
Abschnitt dokumentiert. Als fachliches Detail bleibt insbesondere die
Haushalts-/Profilaggregation aus D-11 offen. Quellen-, Lizenz- und
Transformationsnachweise werden durch die geplanten Datenslices geklaert und
duerfen nicht durch Annahmen ersetzt werden.

Der Teilvorwurf aus D-12, das fehlende Legacy-Aggregat `depotwertNeu`
verhindere einen Replay, gehoert dagegen nicht in die verbleibenden
Blocker: Der Detailtranchenpfad wurde exakt reproduziert.

## Fachliche Entscheidungen des Nutzers fuer die Korrektur

Die folgenden Entscheidungen wurden am 2026-07-29 nach der gemeinsamen
Auswertung der Befunde getroffen. Sie sind der fachliche Vertrag fuer die
nachstehenden Korrekturslices. Abweichungen davon benoetigen vor einer
Umsetzung eine erneute Nutzerentscheidung.

| Thema | Festgelegte Semantik |
| --- | --- |
| Aktienrendite | Offene globale Total-Return-Forschungsreihe; 1925-1950 expliziter USD-Waehrungsproxy, ab Returnjahr 1951 deutsche Anlegerwaehrung |
| Aktienpositionen | Alle Aktienpositionen erhalten weiterhin dieselbe globale Aktienrendite; keine positionsspezifischen Einzelreihen |
| Historische Aktienabdeckung | Die Abdeckung 1925-2025 bleibt erhalten, wird aber als segmentierte globale Total-Return-Kette statt durchgehend als MSCI World bezeichnet |
| Liquiditaet | Liquiditaet soll nur die gesondert konfigurierte Runway-Zeitspanne abdecken; eine dadurch steigende Aktienquote ist beabsichtigt |
| Rebalancing | Kein Rebalancing auf eine feste Aktien-/Liquiditaetsquote |
| Runway-Parameter | Eigener Parameter `liquidityRunwayYears`; er ist nicht mit `flexBudgetYears` gleichzusetzen. Initialer Default: 5 Jahre |
| Runway-Ausweis | Runway vor und nach Transaktionen getrennt speichern; fuer Warnungen und Minimum ist der Stand nach allen Jahrestransaktionen massgeblich |
| Floor | Der Floor-Bedarf darf nie unterschritten werden |
| Mindest-Flex | Weicher Stabilisator gegen schnelle Ausschlaege in Richtung Floor; nach laengerem Baerenmarkt beziehungsweise bei erschoepftem Flex-Budget unterschreitbar |
| Mindest-Flex-Unterschreitung | Muss als expliziter Fehlbetrag und Status sichtbar werden; kein stilles Ueberschreiben oder stilles Begrenzen |
| Steuerzeitbezug | Heutige Steuerlogik wird auf historische Marktsequenzen angewendet; historische Steuergesetze werden nicht simuliert |
| Steuerlicher Startzustand | Der simulierte Startbestand repraesentiert den heutigen Zustand. Steuermerkmale werden je Tranche explizit gespeichert und nicht aus Simulationsjahr, Name oder Freitext abgeleitet |
| Steuerumfang erster Schritt | Bestehendes Modell fuer Verkaufsgewinne, Zinsen und Teilfreistellungen korrekt machen |
| Erweiterte Steuerlogik | Vorabpauschale, Ausschuettungen, Sparer-Pauschbetrag und gegebenenfalls Kirchensteuer bilden einen spaeteren eigenen Ausbau, nicht den ersten Korrekturslice |
| Inflation | Deutscher Verbraucherpreisindex (VPI), nicht HICP |
| Renten-/Lohnfortschreibung | Bestehende funktionale Verwendung darf bestehen bleiben; Datenquelle, Jahreszuordnung und Bezeichnung muessen dennoch belegt werden |
| Zeitraum des Referenzlaufs | 2000-2025 ist bewusst ein 26-Jahres-Beispiellauf und kein unvollstaendiger 30-Jahres-Lauf |
| End-Snapshot | Kein direkt wiederverwendbares Startportfolio. Diese Grenze muss im Exportvertrag eindeutig sein |

### Praezisierung der globalen Aktienreihe

Der Nutzer hat am 2026-07-29 den wegen der MSCI-Nutzungsbedingungen
gestoppten Vertrag mit „Stelle sie um“ auf den angebotenen offenen,
neutral benannten Fortsetzungsweg umgestellt. Der kanonische Name ist
`global_equity_research_index`; die Reihe bildet keinen Anbieterindex nach.

Das feste Laenderuniversum umfasst die 16 JST-Laender mit vorhandener
Aktien-Total-Return-Historie:
`AUS, BEL, CHE, DEU, DNK, ESP, FIN, FRA, GBR, ITA, JPN, NLD, NOR, PRT, SWE,
USA`. Die Gewichtung erfolgt ohne Look-ahead anhand des Vorjahresprodukts aus
JST-Bevoelkerung und realem BIP je Einwohner. Fuer 2021 bis 2025 bleiben die
Gewichte auf dem Stand 2020 eingefroren.

| Zeitraum | Zielkonstruktion | Qualitaetsstatus |
| --- | --- | --- |
| 1925-1950 | JST nominaler lokaler Aktien-Total-Return, ueber lokale Waehrung je USD in einen wirtschaftsgewichteten USD-Proxy ueberfuehrt; der deutsche Rekonstruktionsfaktor 1949/1950 geht nicht als globale Rendite ein | `proxy` |
| 1951-2020 | JST nominaler lokaler Aktien-Total-Return, wirtschaftsgewichtet und ueber lokale sowie deutsche USD-Kurse in deutsche Anlegerwaehrung umgerechnet | `backtested` und `derived` |
| 2021-2025 | OECD-Dezember-Kursreturn plus je Land fortgeschriebener JST-Dividendenreturn 2020, ueber EZB-Dezemberkurse in EUR umgerechnet | `estimated` und `derived` |

Die Indexstaende werden aus den Jahresrenditen stetig verkettet:

```text
indexLevel[t] = indexLevel[t - 1] * (1 + annualReturn[t])
```

Absolute Altstaende aus der bisherigen `msci_eur`-Reihe sind dabei nicht
schutzwuerdig. Schutzwuerdig sind Jahresrenditen, Segmentgrenzen,
Waehrungsbehandlung, Qualitaetsstatus und der lueckenlose Transformationspfad.
Ein pauschaler Dividendenaufschlag auf die bestehende Price-Proxyreihe ist
nicht zulaessig.

Primaerquellen fuer den Aufbau:

- [Jordà-Schularick-Taylor Macrohistory Database R6](https://www.macrohistory.net/database/)
- [OECD Share Prices](https://www.oecd.org/en/data/indicators/share-prices.html)
- [EZB EXR-Daten-API](https://data.ecb.europa.eu/help/api/data)

JST steht unter `CC BY-NC-SA 4.0`. Die gefilterten JST-Eingaben und die daraus
abgeleitete Forschungsreihe werden deshalb separat vom MIT-Code unter dieser
Datenlizenz ausgewiesen. MSCI-Werte werden weder kopiert noch abgeleitet.

## Erweiterter Pruefumfang des Datenbestands

Die Korrektur darf nicht auf `msci_eur` begrenzt werden. Jede historische
Reihe benoetigt einen eigenen Identitaets-, Zeit-, Transformations-,
Qualitaets- und Lizenzvertrag.

| Reihe | Kritische Pruefdimensionen | Ziel |
| --- | --- | --- |
| globale Aktienrendite | Return-Variante, Waehrung, Dividenden, Segmentgrenzen, Anbieter-Rueckrechnung, Lizenz | verkettete Net-Total-Return-Reihe mit neutralem Gesamtnamen |
| `inflation_de` | VPI statt HICP, Jahresdurchschnitt statt Stichtag, Gebietsstand, Methodenbrueche, fruehe Schaetzjahre | amtlicher deutscher VPI mit expliziten historischen Segmenten |
| `zinssatz_de` | investierbare Geldmarktrendite statt Leitzins, Jahresrendite statt Jahresend-Stichtag, EUR-/DM-Uebergang | deutsche Cash-/Geldmarkt-Proxykette passend zu Tagesgeld und Geldmarkt-ETF |
| `gold_eur_perf` | Goldpreisquelle, USD-/DM-/EUR-Umrechnung, Marktzugang und Regime, Nullwerte, Jahresstichtag | belegte Goldrendite in deutscher Anlegerwaehrung ohne stilles Zero-Fill |
| `cape` | exakte Reihe, Region, Einheit, Stichtag, `t-1`-Zuordnung, Rueckrechnung | klar bezeichnetes Bewertungs-Signal; keine unbelegte globale Interpretation |
| `lohn_de` | Reihenidentitaet, nominal/real, Jahreszuordnung, Gebietsstand, Abgrenzung zur Rentenanpassung | belegte Reihe bei unveraenderter beschlossener Funktionsverwendung |

Der derzeit gemeinsame Schaetzstatus 1925-1949 wird durch
reihenspezifische Qualitaetssegmente ersetzt. Eine Reihe kann in einem Jahr
`official` sein, waehrend eine andere fuer dasselbe Jahr `proxy`, `estimated`
oder `missing` ist.

### Weitere statische und abgeleitete Daten

Nach den sechs historischen Reihen werden auch folgende Datenklassen
eigenstaendig inventarisiert und gegen ihre beabsichtigte Semantik geprueft:

- Sterbetafeln, Lebenserwartungen und Alters-/Geschlechtszuordnung,
- Pflegewahrscheinlichkeiten, Pflegegrade und Pflegedauern,
- Hinterbliebenen- und Witwenparameter,
- steuerliche Konstanten, Teilfreistellungen und Trancheneigenschaften,
- Renten- und Sozialversicherungsparameter,
- Stressszenarien, Regimegrenzen und abgeleitete Presets,
- Default- und Fallbackwerte bei fehlenden Daten.

Extern beobachtete Werte, Modellannahmen, abgeleitete Werte, Schaetzungen und
reine Stressparameter duerfen im Manifest nicht dieselbe Evidenzklasse tragen.

## Geplantes Korrekturprogramm

### Arbeitsstatus und Branch-Regel

- Status: Die Slices 01 bis 10 liegen auf
  `codex/suite-datenintegritaet-hardening` als lokale Commits vor. Slice 08
  ist durch Claudes Reviewrunde 3 technisch freigegeben und als Commit
  `ad08236` vorhanden. Slice 09 ist nach Claude-Review Runde 2 technisch
  freigegeben und als Commit `2e4867f` vorhanden. Slice 10 ist nach
  Claude-Review Runde 2 freigegeben und als Commit `05ff8c3` vorhanden.
  Slice 11 verwendet das vollstaendige Slice-10-Ergebnisdokument als
  Eingangsgrenze. CR10-13/14 sind durch Ergebnisprosa, eine am Slice-09-Commit
  nachgemessene D-17-Basis und ein vollstaendiges 12/12-Delta-Ledger
  geschlossen. Preflight, fuenf produktive Dateien und Diff-Risiko sind vor
  Coding dokumentiert; die Eingangsbaseline mit 160 Testdateien ist gruen.
- Dokumentierter Ausgangsstand der Nachrechnung: `ca982cf`.
- Nutzerentscheidung vom 2026-07-29: Die Umsetzung bleibt ausdruecklich auf
  dem vorhandenen Branch `codex/suite-datenintegritaet-hardening`; es wird
  kein neuer Branch angelegt.
- **Dauerhafte Branch-Ausnahme fuer dieses Korrekturprogramm:** Diese
  Nutzerentscheidung gilt fuer Slice 02 bis einschliesslich Slice 13 und ist
  bei jedem Folgeslice aus diesem Abschnitt als bereits erteilt zu behandeln.
  Codex und Folgeagenten fragen nicht erneut nach einem eigenen Feature-Branch,
  solange der Nutzer diese Entscheidung nicht ausdruecklich widerruft oder
  einen anderen Branch vorgibt. Der tatsaechlich aktive Branch und
  Arbeitsbaumstatus werden weiterhin vor jedem Slice dokumentiert.
- Fuer jeden Slice wird vor Coding der Branch- und Arbeitsbaumstatus sowie das
  erwartete Diff-Risiko dokumentiert.
- Die nachstehenden Abschnitte sind das Master-Geruest. Vor Beginn eines
  einzelnen Slices wird daraus eine eigene 1-basierte Slice-MD unter
  `docs/internal/` mit konkretem Datei-Scope und Abschlussprotokoll angelegt.
- Die Detailausfuehrung folgt
  `docs/internal/SLICE_EXECUTION_RULES.md`; Slice-Nummern sind 1-basiert.
- Codex kann die Slices implementieren und selbst pruefen, aber nicht selbst
  freigeben. Review und Freigabe erfolgen durch Gemini, Claude oder den Nutzer.

### Uebergreifende Regeln fuer alle Slices

1. Rohdaten werden unveraendert abgelegt oder reproduzierbar referenziert.
2. Transformationen erfolgen durch ein nachvollziehbares Skript und nicht
   durch manuelle Einzelkorrekturen in `simulator-data.js`.
3. Jede Reihe dokumentiert Quelle, Reihenkennung, Einheit, Waehrung,
   Frequenz, Jahreskonvention, Abrufstand, Lizenz und Rohdatenhash.
4. Jeder abgeleitete Wert dokumentiert Formel und Eingangsreihen.
5. `official`, `derived`, `backtested`, `proxy`, `estimated` und `missing`
   werden getrennt ausgewiesen.
6. Fehlende Werte werden nicht still als 0 behandelt.
7. Jeder wertveraendernde Slice erzeugt einen Vorher-/Nachher-Vergleich
   festgelegter Referenzlaeufe.
8. Erwartete Ergebnisaenderungen werden begruendet; unerklaerte Abweichungen,
   auffaelliger `FlowDelta` oder Vertragsabweichungen stoppen den Slice.
9. UI und Engine verwenden identische Parameternamen.
10. `minimumFlexAnnual` wird validiert und niemals still begrenzt.
11. Pro Slice bleiben produktive Programmdateien innerhalb der projektweiten
    Grenze; andernfalls wird vor der Umsetzung neu geschnitten.
12. Generierte Dateien wie `engine.js`, `dist/` und `RuheStandSuite.exe`
    gehoeren nur bei explizitem Build-/Release-Auftrag zum Scope.

## Vorgesehene Korrekturslices

### Slice 1 - Dateninventar, Evidenzklassen und Quell-Gates

**Slice-Dokument:**
[`SLICE_BACKTEST_DATENPRUEFUNG_01_DATENINVENTAR.md`](SLICE_BACKTEST_DATENPRUEFUNG_01_DATENINVENTAR.md)

**Umsetzungsstatus:** technisch abgeschlossen auf
`codex/suite-datenintegritaet-hardening`; Review ausstehend.

**Rueckdokumentation 2026-07-29**

- `SimulationDataInventoryV1` inventarisiert alle sechs historischen Reihen
  mit eigenen 1925-2025-Qualitaetssegmenten und die statischen Klassen
  Demografie, Pflege, Hinterbliebene, Steuern/Tranchen,
  Rente/Sozialversicherung, Stress/Regime und Defaults/Fallbacks.
- `rawDataHash` bleibt bei fehlender externer Rohquelle `unresolved`;
  `embeddedValueHash` belegt davon getrennt nur die technische
  Reproduzierbarkeit des aktuellen In-App-Werts.
- Unaufgeloeste Quelle, externe Reihenkennung, Lizenz oder Abrufstand
  blockieren externe Validierung und Datenersatz, nicht aber den
  reproduzierbaren Ist-Replay.
- Historische Werte, Regimegrenzen und Engine-Semantik wurden nicht
  veraendert. `npm test` bestand mit 138 Dateien und 10.326 von 10.326
  Assertions.
- Offene Quellen-/Lizenz-Gates bleiben fuer die Datenslices 2 bis 7 bestehen.
  Codex hat Slice 01 nicht selbst freigegeben.

**Ziel**

Vollstaendiger maschinen- und menschenlesbarer Vertrag fuer alle historischen
und statischen Daten, bevor Werte ersetzt werden.

**Scope**

- Inventar aller sechs historischen Reihen und aller statischen Datenklassen.
- Reihenspezifische Qualitaetssegmente statt eines pauschalen
  Schaetzsegments.
- Pflichtfelder fuer Quelle, Reihenkennung, Einheit, Waehrung,
  Jahreskonvention, Transformation, Lizenz, Abrufdatum und Hash.
- Gate: `unresolved` darf technisch reproduzierbar bleiben, aber nicht als
  extern validiert gelten.

**Nicht im Scope**

- Austausch historischer Zahlen.
- Änderung der Engine-Semantik.

**Abnahmekriterien**

- Jeder produktiv verwendete Datenwert ist einer Datenreihe und Evidenzklasse
  zugeordnet.
- Unbelegte Quellen oder Lizenzen bleiben explizit `unresolved`.
- Keine erfundene Provenienz.
- Manifest-, Contract- und Dokumentationstests bestehen.

### Slice 2 - Offene globale Aktien-Forschungsreihe

**Slice-Dokument:**
[`SLICE_BACKTEST_DATENPRUEFUNG_02_GLOBALE_AKTIENREIHE.md`](SLICE_BACKTEST_DATENPRUEFUNG_02_GLOBALE_AKTIENREIHE.md)

**Abhaengigkeit:** Slice 1.

**Umsetzungsstatus:** am 2026-07-29 durch Codex technisch umgesetzt und nach
dem Claude-Review gemaess Nutzerentscheidung mit Variante 1 nachgebessert:
USD-Numeraire bis einschliesslich 1950, deutsche Anlegerwaehrung ab
Returnjahr 1951. Der Numerairebruch, der fehlende Nahtreferenzlauf, der
fehlende Health-Fall-Deltabeleg und der selbst ersetzbare
Monte-Carlo-Vergleichsanker sind technisch bearbeitet. `npm test` ist mit
11.375/11.375 Assertions gruen; erneutes externes Review, Freigabe und Commit
stehen aus. Codex erteilt keine eigene Freigabe.

**Ziel**

Ersetzen der ungeklaerten `msci_eur`-Price-Proxyreihe durch die offene,
segmentierte `global_equity_research_index`-Kette 1925-2025.

**Scope**

- Neutraler kanonischer Reihenname und kontrollierte Migration bestehender
  Consumer.
- JST-basierte Total-Return-Segmente 1925-2020.
- Offene OECD-Kurs- und EZB-Waehrungskomponenten 2021-2025 mit explizitem
  JST-2020-Dividendenmodell.
- Dokumentierte USD-Proxy- und deutsche Anlegerwaehrungssegmente.
- Stetige Verkettung ohne kuenstlichen Brueckensprung.
- Weiterhin ein gemeinsamer Jahresreturn fuer alle Aktienpositionen.

**Stop-Gates**

- Die gefilterten Eingaben stimmen nicht mit den dokumentierten
  Originaldatei-Hashes ueberein.
- Ein Land-/Jahreswert fehlt ausserhalb der explizit dokumentierten
  deutschen Wechselkursluecke 1945-1946 oder japanischen
  Aktienreturn-Luecke 1946-1947.
- UI und Engine wuerden unterschiedliche Reihen- oder Parameternamen erhalten.

**Abnahmekriterien**

- Abdeckung 1925-2025 bleibt vorhanden.
- Alle Jahre stimmen innerhalb `1e-12` mit dem Transformationsskript ueberein;
  2024 ist als OECD-Price-plus-Modell-Dividende gekennzeichnet.
- Segmentgrenzen und Waehrungsuebergaenge erzeugen keinen unbelegten Return.
- Rohdaten, Transformationsskript, Manifestrevision und Hash sind vorhanden.
- Vorher-/Nachher-Backtests quantifizieren die Ergebniswirkung.

### Slice 3 - Deutscher Verbraucherpreisindex

**Slice-Dokument:**
[`SLICE_BACKTEST_DATENPRUEFUNG_03_DEUTSCHER_VPI.md`](SLICE_BACKTEST_DATENPRUEFUNG_03_DEUTSCHER_VPI.md)

**Umsetzungsstatus:** am 2026-07-29 auf
`codex/suite-datenintegritaet-hardening` umgesetzt und technisch validiert.
Die gezielten Quellen-, Runtime-, Manifest-, Inventar-, Backtestdelta-,
Monte-Carlo- und Integrationsgates sowie `npm test` mit 12.440/12.440
Assertions sind gruen. S03-STOP-01 wurde durch die vom Nutzer freigegebene
Engine-Untergrenze von `-15` Prozent aufgeloest. Claudes Drittreview hat den
technischen Stand freigegeben; CR03-15 und CR03-16 wurden als
Slice-04-Vorgates umgesetzt. Codex nimmt keine Selbstfreigabe fuer
Folgeslices vor.

**Abhaengigkeit:** Slice 1.

**Ziel**

`inflation_de` wird zu einer eindeutig definierten deutschen
VPI-Jahresdurchschnittsreihe.

**Scope**

- Destatis-VPI statt HICP.
- Explizite Behandlung von Gebietsständen und Methodenbruechen.
- Eigene Qualitaetssegmente fuer nicht amtlich vergleichbare Fruehjahre.
- Reale Ergebniskennzahlen werden mit derselben kanonischen Reihe deflationiert.

**Abnahmekriterien**

- 2024 betraegt gemaess festgelegter VPI-Reihe 2,2 Prozent.
- Kein Jahr mischt VPI und HICP.
- Jahresdurchschnitt und Quellenjahr sind maschinenlesbar dokumentiert.
- Nominale Ergebnisse bleiben bei isolierter Inflationsänderung unveraendert.
- Reale Vorher-/Nachher-Abweichungen sind rechnerisch erklaert.

### Slice 4 - Cash- und Geldmarktrendite

**Slice-Dokument:**
[`SLICE_BACKTEST_DATENPRUEFUNG_04_CASH_GELDMARKTRENDITE.md`](SLICE_BACKTEST_DATENPRUEFUNG_04_CASH_GELDMARKTRENDITE.md)

**Umsetzungsstatus:** am 2026-07-30 nach Claudes blockierendem Review
technisch nachgebessert. Die Korrekturen umfassen ein direktes PDF-
Koordinatenoracle, wahrheitsgemaesse Cash-/Bond-Anwendung, vollstaendige
Methoden- und Quellenqualifikation, die 1948er-Geldvermoegensgrenze,
nachgerechnete Zinsmarker, den EZB-EURSTR-Hinweis sowie getrennte Primaer-,
Derived- und Fixture-Vertraege. Jahreswerte, Engine-Semantik,
Referenz-Outcomes und `FlowDelta` bleiben unveraendert. Die gezielten Gates
und `npm test` mit 147 Testdateien und 14.270/14.270 Assertions sind gruen;
fehlgeschlagene Dateien und offene Handles: jeweils 0. Erneutes externes
Review und Freigabe stehen aus; Codex nimmt keine Selbstfreigabe vor.

**Rueckdokumentation 2026-07-29**

- Die Kette verwendet JST `DEU.stir` 1925-1944, eine explizite
  1944-Carry-forward-Schaetzbruecke 1945-1948 und Bundesbank-
  Frankfurt-Tagesgeld/FIBOR/EONIA/EURSTR 1949-2025.
- Der publizierte Jahresdurchschnitt ist ein einfacher Brutto-
  Jahresertragsproxy, kein erreichbarer Endkundenreturn. Der bestehende
  `cashBondReturn` gilt auch fuer Anleihetranchen, bildet dort aber keine
  Duration, Laufzeitpraemie, Kreditrisiken oder Mark-to-Market-Effekte ab.
  Zusaetzliche Aufzinsung, Produktkosten, Bankmarge und Steuer sind
  ausgeschlossen; Negativzinsen bleiben signiert.
- Die gepinnte Bundesbank-PDF wird im Generator direkt mit Poppler
  `pdftohtml` 25.07.0 gelesen und fuer 77 Jahre exakt gegen den abgeleiteten
  Layout-Extrakt geprueft. Der unabhaengige Rekonstruktionstest liest
  ebenfalls die PDF, aber mit einer getrennten Koordinatenauswahl.
- 1949-1996 ist `proxy`, weil die gemeldeten Saetze nicht amtlich festgesetzt
  oder quotiert waren. Meldergruppenwechsel 1970, Zinstagewechsel 1990,
  FIBOR 1997, EURSTR 2019 und die Quellenkette ueber Fritz Knapp/Bundesbank
  sind dokumentiert.
- Die Runtime wendet die nominale Abschreibung grosser Reichsmark-Bar- und
  Bank-/Sparguthaben von 1948 nicht an. Der 2,13-Prozent-Carry-forward darf
  deshalb nicht als durchgehende reale Geldvermoegenshistorie gelesen
  werden.
- Wertehash
  `cf5471a345234984ac3ff8de57bffdb3128c1046e01ec998198721325ede9b69`,
  Primaerquellenhash
  `ea1608b5dee7e00ae7bf24bb651cb01cd3f0d5423b54cdf21b9f975cced30722`,
  Derived-Artefakthash
  `eae9ce9d4a172ecce6264fde18a618f810b4f11af2adb4bd53d1670fca44a97a`,
  Manifest-/Inventarrevision `2026-07-29.5`, Dataset-Hash
  `6a1ff0c9245d66d5aec69d85e216daf8c0c005804f70868f681452b47353e543`.
- Alle sieben Backtest-Outcome-Klassen bleiben unveraendert;
  `portfolio_flow_delta` bleibt in den Vergleichsfaellen exakt null.
- CR03-15 und CR03-16 sind als getestete Vorgates geschlossen, ohne die
  historische Slice-03-Snapshot-Fixture umzuschreiben.

**Abhaengigkeit:** Slice 1.

**Ziel**

`zinssatz_de` repraesentiert einen dokumentierten deutschen Cash-/Bond-
Bruttoertragsproxy und keinen unklaren Leitzins-Stichtag. Er beansprucht
weder einen erreichbaren Endkundenreturn noch einen historischen Bondindex.

**Scope**

- Definition einer verketteten EUR-/DM-Geldmarktproxyreihe.
- Jahresrendite beziehungsweise nachvollziehbare Zinsakkumulation statt
  ungekennzeichnetem Jahresendwert.
- Trennung von Datenreihe und produktbezogenen Kosten/Abschlaegen.
- Dokumentation, fuer welche Liquiditaetsbestandteile die Reihe gilt.

**Abnahmekriterien**

- Exakte Reihenidentitaet und Zinskonvention sind dokumentiert.
- Negative Geldmarktrenditen bleiben zulaessig.
- Zinsgutschrift und Steuerbasis lassen sich fuer Markerjahre nachrechnen.
- Keine doppelte Anwendung von Rate, Kosten oder Steuer.

### Slice 5 - Goldrendite in deutscher Anlegerwaehrung

**Slice-Dokument:**
[`SLICE_BACKTEST_DATENPRUEFUNG_05_GOLD_DEUTSCHE_ANLEGERWAEHRUNG.md`](SLICE_BACKTEST_DATENPRUEFUNG_05_GOLD_DEUTSCHE_ANLEGERWAEHRUNG.md)

**Umsetzungsstatus:** am 2026-07-30 durch Codex auf Basis des extern
freigegebenen Slice-04-Ergebnisdokuments technisch umgesetzt. Die Auflagen
CR04-10 (portable Poppler-Toolchain) und CR04-13 (Inventarrevision) sind als
getestete Vorgates geschlossen. Review, Freigabe und Commit stehen aus; Codex
nimmt keine Selbstfreigabe vor.

**Abhaengigkeit:** Slice 1.

**Ziel**

`gold_eur_perf` erhaelt eine belegte Preis- und Waehrungskette ohne
stillschweigende Nullrenditen.

**Scope**

- Goldpreisquelle und USD-/DM-/EUR-Umrechnung.
- Kennzeichnung historischer Goldmarkt- und Waehrungsregime.
- Ersatz unbelegter Nullwerte durch Quelle, `missing` oder explizite
  Modellannahme.
- Kein automatisches Zero-Fill bei fehlender Beobachtung.

**Abnahmekriterien**

- Jeder der derzeit 42 ungeklaerten Nullwerte ist aufgeloest oder als
  nicht beobachtbar markiert.
- Waehrungs- und Jahreskonvention sind reproduzierbar.
- Goldfreie Portfolios bleiben durch den Datenersatz ergebnisgleich.
- Goldhaltige Referenzlaeufe besitzen erklaerte Vorher-/Nachher-Deltas.

**Technisches Ergebnis**

- `gold_eur_perf` wird fuer alle 101 Returnjahre 1925-2025 aus dem
  generierten `GoldGermanInvestorChainV1` projiziert. Der Returnhash ist
  `068a15a99c665b48dc14a187b654033d292c9de6ed3cf712f7e789ddcec049aa`.
- Die Kette trennt Jahresend-Policy-/JST-FX-Proxy mit offiziellem RFC-Anker
  1933, explizite Schaetzbruecke 1945-1950,
  Bundesbank-Frankfurt-Fixing und World-Bank-Gold/Bundesbank-USD/EUR. Alle
  zwoelf literal verbleibenden Nullen sind erklaert; es gibt kein
  Fallback-Zero-Segment.
- Manifest und Inventar tragen Revision `2026-08-01.1`, Dataset-Hash
  `e2ee9db77d02cca23ca451e16ed16b565de44411807c550e49f415e7bed45d0a`
  und denselben Goldwertehash.
- Alle sieben goldfreien Referenzfaelle behalten Outcome und Finanzmetriken
  exakt; `portfolio_flow_delta` ist null. Ein echter sechsjaehriger
  goldhaltiger UI-/Provider-/Backtestlauf 2000-2005 friert alle acht
  Finanzmetriken, beide Outcomes, Row-Hashes und FlowDelta vor/nach dem
  Datenersatz ein; unter anderem betraegt das Endvermoegensdelta
  `-55.479,30 EUR`.
- `post-backtest-data-05-v1` liegt als unveraenderlicher, weiterhin
  `pending` markierter Monte-Carlo-Kandidat auf Slice 04 vor.
- `npm test` ist mit 15.055/15.055 Assertions gruen; Quellen-Verify-Gates
  fuer Poppler, Cash-/Geldmarkt- und Goldkette sind ebenfalls gruen.

### Slice 6 - CAPE sowie Lohn-/Rentenfortschreibungsreihe

**Slice-Dokument:**
[`SLICE_BACKTEST_DATENPRUEFUNG_06_CAPE_LOHN_RENTENFORTSCHREIBUNG.md`](SLICE_BACKTEST_DATENPRUEFUNG_06_CAPE_LOHN_RENTENFORTSCHREIBUNG.md)

**Umsetzungsstatus:** am 2026-08-01 durch Codex auf Basis des extern
freigegebenen und als Commit `a7038e5` vorliegenden Slice-05-Ergebnisdokuments
technisch umgesetzt und nach den blockierenden Claude-Reviews zu CR06-1 bis
CR06-19 nachgebessert. Claude hat den technischen Stand in Runde 3
freigegeben; er liegt als lokaler Commit `02f39f9` vor. CR06-21 und CR06-22
wurden als Vorgates an Slice 07 uebergeben.

**Abhaengigkeit:** Slice 1.

**Ziel**

Identitaet und zeitliche Zuordnung von `cape` und `lohn_de` werden belegt,
ohne die vom Nutzer bestaetigte funktionale Rentenfortschreibung zu ersetzen.

**Scope**

- CAPE-Region, Quelle, Einheit und Stichtag.
- CAPE bleibt Entscheidungssignal aus `t-1`.
- Identitaet und Jahreskonvention von `lohn_de`.
- Klare Bezeichnung, falls `lohn_de` nur Proxy und keine tatsaechliche
  Rentenanpassungsreihe ist.

**Abnahmekriterien**

- Kein doppelter CAPE-Jahresversatz.
- Export dokumentiert Beobachtungs- und Entscheidungsjahr.
- `lohn_de` behauptet keine amtliche Reihenidentitaet, die nicht belegt ist.
- Bei deaktivierter VPW-/CAPE-Policy verändert eine isolierte
  CAPE-Datenkorrektur das Ergebnis nicht.

**Technisches Ergebnis**

- CAPE wird aus der gepinnten Shiller-Arbeitsmappe als konventionelles
  US-Price-CAPE erzeugt. Returnjahr `t` verwendet Dezember `t-1` genau einmal;
  der 101-Signal-Hash lautet
  `d1101958fed64dadf8fba76e9e4e92c8d24e86bd3d21accc42cdb60c247a835f`.
- `lohn_de` wird fuer 1925-1946 aus aufeinanderfolgenden JST-R6-`DEU.wage`-
  Staenden und fuer 1947-2025 aus der Destatis-Langreihe der
  Bruttomonatsverdienste ohne Sonderzahlungen erzeugt. Gebiets-, Praezisions-
  und Methodenbrueche sind explizit segmentiert. Der Nahtvertrag markiert
  1925 als Startnormalisierung, 1945 als geschaetzte Kriegs-/Nachkriegsbruecke
  ohne Marktlohnbeobachtung, 1947 als JST-/Destatis-Quellennaht und 1948 als
  Waehrungsreformkontext; der 101-Werte-Hash lautet
  `e10e581f6994e07ed0a943b3716dd8fd5dea7b8b272d47a546466af8701a3057`.
- Manifest und Inventar tragen Revision `2026-08-01.4` und Dataset-Hash
  `c79350c5abf2dee2feeaae65c88ed5e58487f878cb598fdffc132fbf48d01e79`.
- Unabhaengige Volloracles pruefen alle 101 Goldreturns, alle 101 CAPE-Signale,
  alle 22 JST-Lohnveraenderungen und alle 79 amtlichen Lohnjahre. Der
  CAPE-Generator prueft zusaetzlich die Quellheader `Date`, konventionelles
  `CAPE` und die verworfene `TR CAPE`-Spalte. Die Slice-05-Backtest-Zielfixture
  bleibt bytegleich als `post-backtest-data-05-target-v1.json` erhalten.
- Der ausgelieferte Dynamic-Flex-Default `legacy_step` ist fuer 2018-2025 mit
  exakten Vorher-/Nachhermetriken belegt: Endvermoegen
  `2.726.687,53 -> 2.783.336,86 EUR`, Entnahmen
  `801.000 -> 771.000 EUR`, Steuer `95.126,84 -> 95.006,65 EUR` und
  Runway-Deckung `62,235564 -> 72,719865`; Outcome bleibt `completed`,
  `portfolio_flow_delta` bleibt null. Der CAPE-inaktive Fall prueft zusaetzlich
  eine exakte Allowlist aller 35 geaenderten Blattfelder.
- Zwei fruehe lohnindexierte Golden Cases vergleichen die JST-Kette gegen die
  abgeloeste konstante 3-Prozent-Reihe. Fuer 1930-1940 betragen die Deltas
  `-65.261,16 EUR` Endvermoegen, `+51.000 EUR` Entnahmen,
  `+2.408,26 EUR` Steuer und `7 -> 9` Kuerzungsjahre. Fuer 1935-1946 sind es
  `-48.418,44 EUR`, `+28.200 EUR`, `+5.003,92 EUR` und `10 -> 1`;
  Outcome bleibt jeweils `completed`, `portfolio_flow_delta` null.
- Die aktive Backtest-Deltaevidenz ist
  `cape-wage-backtest-delta-v3.json`. Sie dokumentiert, dass V1 beim
  Umbenennen des entfernten `cape_continuous`-Falls irrtuemlich dessen
  `mean`-/20-Jahre-Horizont behielt, V2 auf die ausgelieferten
  `survival_quantile`-/30-Jahre-Defaults korrigierte, aber den fruehen
  Lohnwirkungsscope noch nicht mass. Der Continuous-Fall wurde durch den
  Default-`legacy_step`-Fall ersetzt und ist kein Slice-06-Daten-Delta-Oracle.
- `post-backtest-data-06-v1` bleibt als fehlerhafter, unveraenderlicher
  Vorgaenger erhalten. `post-backtest-data-06-v2` wurde zur Laufzeit
  zeitgestempelt, dokumentiert die fehlenden CAPE-/Lohn-/Gold-Wirkungsfaelle
  explizit und belegt gegen Slice 05 exakt null numerische Monte-Carlo-Deltas.
  Beide Kandidaten bleiben bis zum erneuten externen Review `pending`.
- Das CAPE-Sampling liest nur noch die vom Aufrufer uebergebenen
  Entscheidungssignale; die Kandidatendeltas sind in einer eigenen Fixture
  eingefroren. CAPE 1925-1935 ist `estimated`; der produktive
  Estimated-History-Filter ab 1951 schliesst dieses Segment vollstaendig aus.
- Alle sieben read-only Quellen-/Toolchain-Gates sind gruen. `npm test`
  umfasst nach der Nachbesserung 156 Dateien und 17.022/17.022 Assertions ohne
  fehlgeschlagene Dateien oder offene Handles. Browser-Smoke ist mit 27/27
  Workflows gruen; das Coverage-Gate besteht bei 77,88 Prozent gesamt und
  97,44 Prozent fuer `app/shared/cape-utils.js`. `npm run docs:evidence` und
  `git diff --check` sind sauber.

### Slice 7 - Demografie-, Pflege- und Hinterbliebenendaten

**Slice-Dokument:**
[`SLICE_BACKTEST_DATENPRUEFUNG_07_DEMOGRAFIE_PFLEGE_HINTERBLIEBENE.md`](SLICE_BACKTEST_DATENPRUEFUNG_07_DEMOGRAFIE_PFLEGE_HINTERBLIEBENE.md)

**Umsetzungsstatus:** am 2026-08-01 auf Basis des technisch freigegebenen und
als Commit `02f39f9` vorliegenden Slice-06-Ergebnisdokuments durch Codex
technisch umgesetzt und selbstgeprueft. CR06-21 und CR06-22 sind als
vorgeschaltete Gates geschlossen. Claude hat die nachgebesserten Blocker
CR07-1 bis CR07-3 im Zweitreview technisch freigegeben; Slice 07 liegt als
lokaler Commit `c95e202` vor. CR07-5 und CR07-6 sind ausdrueckliche Auflagen
vor Slice 08; Codex nimmt keine Selbstfreigabe vor.

**Abhaengigkeit:** Slice 1.

**Ziel**

Sterblichkeit, Pflege und Hinterbliebenenannahmen werden gegen aktuelle
amtliche Quellen und die beabsichtigte Simulationssemantik geprüft.

**Scope**

- Sterbetafeljahr, Perioden-/Kohortentafel, Alter und Geschlecht.
- Pflegeinzidenz, Pflegegradverteilung und Pflegedauer.
- Hinterbliebenen- und Witwenparameter.
- Versions- und Gueltigkeitsstand jeder Tabelle.

**Abnahmekriterien**

- Beobachtete Bestandsquoten werden nicht als individuelle
  Uebergangswahrscheinlichkeiten ausgegeben.
- Perioden- und Kohortensterblichkeit werden nicht vermischt.
- Defaults und Modellannahmen sind von amtlichen Beobachtungen getrennt.
- Markerprofile fuer Alter, Geschlecht, Pflege und Hinterbliebene bestehen.

**Technisches Ergebnis**

- Der Destatis-`Statistische Bericht Sterbetafeln 2023/2025` (EVAS 12621),
  Tabellen `12613-b01` und `12613-b02`, sowie die Pflegestatistik 2023 sind
  als Original-XLSX mit Quellen-, Abruf-, Lizenz- und SHA-256-Vertrag gepinnt.
  Der generierte Vertrag `GermanDemographyCareSurvivorContractV1`
  traegt Revision `2026-08-01.1`; sein Rohdatenhash lautet
  `a21bab59269970d29f1e15ad49b64e82a74348692cc38759e4339e1be1205fc3`,
  der Sterbetafelhash
  `88c1000eac950016a65e7408127d5c1256683946933b710a0c28f672fde5f232`.
- Die Runtime-Alter 18 bis 100 stammen fuer Mann und Frau aus der amtlichen
  Periodentafel. Alter 101 bis 110 ist ein explizites Modellende; `divers` ist
  eine offengelegte Modellableitung. Eine Kohortentafel oder kuenftige
  Mortalitaetsverbesserung wird nicht behauptet.
- Pflege-Bestandsquoten und Pflegegradzaehlungen sind nur
  Beobachtungs-/Validierungsdaten. Eintritt, Progression und Dauer bleiben
  getrennte Modellannahmen; die falsche Praevalenz-zu-Inzidenz-Behauptung ist
  entfernt. Der 55-Prozent-Hinterbliebenen-Default bleibt ein vereinfachter
  Cashflow-Vertrag ohne gesetzliche Anspruchsberechnung.
- CR06-21 ist mit einem Lohnmodus-Golden-Case 1944 bis 1950 geschlossen.
  CR06-22 ist durch Modellstatus, Beibehaltungsgrund und
  Nullbruecken-Sensitivitaet fuer den 1945er JST-Wert geschlossen; der
  Lohnwertehash blieb unveraendert.
- Die unveraenderte Slice-06-Deltafixture ist per SHA-256 an die neue
  `demography-care-survivor-backtest-delta-v1.json` gebunden. Der direkte
  Slice-06-zu-Slice-07-Vergleich des aktiven `survival_quantile`-/Dynamic-
  Flex-Falls ergibt Endvermoegen `-19.225,84 EUR`, Entnahmen `+3.000 EUR`,
  Steuer `+1.124,01 EUR` und Runway-Deckung `-3,740149` Prozentpunkte. Der
  CAPE-inaktive Referenzarm ergibt `+12.940,41 EUR`, `-24.000 EUR`,
  `+4.458,88 EUR` und `-2,543821` Prozentpunkte. Outcome bleibt jeweils
  `completed` und `portfolio_flow_delta` null. Der davon getrennte CAPE-an/
  aus-Vergleich innerhalb Slice 07 wird nicht mehr als Sterbetafelwirkung
  ausgegeben. Die neun uebrigen vorhandenen Faelle bleiben unveraendert; der
  elfte Golden Case ist der neue Lohnnahtzeuge.
- `post-backtest-data-07-v1` reproduziert denselben Pflege-/Partner-/
  Hinterbliebenenfall mit festem Seed auf dem Slice-06-Basiscommit und dem
  Slice-07-Arbeitsstand: 2.048 Runs, 40 Jahre und zwei Sweep-Kombinationen.
  P10/P50/P90 der Lebensdauer sinken um 2/1/1 Jahre, das mediane nominale
  MC-Endvermoegen um `105.797,440633 EUR` und die Zahl der Runs mit Pflege um
  52. Im 50-Prozent-Aktien-Sweep sinkt das Median-Endvermoegen ebenfalls um
  `105.797,440633 EUR`; Witwenjahre P1/P2 verschieben sich um -598/+1.933.
  Die `pending`-Fixture bindet 40 numerische Deltas sowie Pfad- und
  Wertehashes, ohne eine fruehere Messfixture zu ueberschreiben.
- `npm test` ist mit 159 Dateien und 17.855/17.855 Assertions gruen. Alle
  sieben Quellen-Verify-Gates, 27/27 Browser-Workflows, Coverage,
  Doku-Evidenz und `git diff --check` bestehen. Die neue unabhaengige
  Quellenrekonstruktion umfasst 696/696 Assertions; das neue Runtime-Messgate
  19/19 Assertions. Coverage liegt bei 78,10 Prozent, beide Pflicht-
  Datei-Gates bestehen.

### Slice 8 - Liquiditaets-Runway und Puffervertrag

**Slice-Dokument:**
[`SLICE_BACKTEST_DATENPRUEFUNG_08_LIQUIDITAETS_RUNWAY_PUFFERVERTRAG.md`](SLICE_BACKTEST_DATENPRUEFUNG_08_LIQUIDITAETS_RUNWAY_PUFFERVERTRAG.md)

**Umsetzungsstatus:** am 2026-08-01 auf Basis des freigegebenen und als Commit
`c95e202` vorliegenden Slice-07-Ergebnisdokuments durch Codex umgesetzt.
Preflight, Diff-Risiko, Scope und Ergebnisse sind im Slice-Dokument
dokumentiert. Der Nutzer hat S08-STOP-01 bis S08-STOP-03 mit „Setze ihn genauso
um“ aufgeloest: `targetEq` entfaellt als Nutzer-, Sweep-, Optimizer- und
Transaktions-Zielquote; VPW verwendet die tatsaechliche
Portfoliozusammensetzung. `liquidityRunwayYears` ersetzt die zwei alten
Nutzereingaben mit Abwaertsmigration. Implementierung und interne technische
Nachweise sind abgeschlossen. Die von Claude in Reviewrunde 1 dokumentierten
CR08-1 bis CR08-15 wurden am 2026-08-01 umgesetzt und im Slice-Dokument
einzeln beantwortet. Der in Claudes Zweitreview verbliebene Blocker CR08-16
wurde am 2026-08-02 durch eine verlustfreie, sicherheitsorientierte
Legacy-Migration geschlossen: alte ganzzahlige Monatswerte werden auf das
naechste Halbjahr aufgerundet. Claude hat Slice 08 in Reviewrunde 3 technisch
freigegeben; der Slice liegt als lokaler Commit `ad08236` vor. CR08-18 und
CR08-20 sind ausdrueckliche Auflagen vor Slice 09.

**Abhaengigkeiten:** Slices 1, 2, 4 und Ergebnisdokument Slice 07.

**Ziel**

Liquiditaet deckt den konfigurierten Runway, ohne eine feste Aktienquote zu
erzwingen.

**Scope**

- Neuer eigenstaendiger Parameter `liquidityRunwayYears`, Default 5.
- Keine semantische Kopplung an `flexBudgetYears`.
- Runway vor und nach allen Jahrestransaktionen.
- Warnungen und Minimum verwenden den Post-Transaktionswert.
- Kein Rebalancing auf eine feste Aktienquote.

**Abnahmekriterien**

- Null Liquiditaet am Jahresende ergibt null Post-Transaktions-Runway.
- D-02 ist verhaltensbasiert fuer finalen Post-Payout-Bestand, eine
  zwischenzeitliche Notfuellung und Null-Liquiditaet reproduzierbar behoben;
  das Kriterium haengt nicht von alten Kalenderjahrmarkern ab.
- Eine steigende Aktienquote durch Pufferverbrauch bleibt zulaessig.
- UI-, Request-, Engine- und Exportname sind identisch.

**Technisches Ergebnis:** Der neue Contract pinnt Default 5, Domain 1 bis 10,
Schritt 0,5, Legacy-Prioritaet und die abgeleitete harte Mindest-Policy. Die
alten UI-Domains 18 bis 72 Zielmonate und 12 bis 60 Mindestmonate bleiben
migrierbar; Nicht-Halbjahreswerte werden ohne Verkuerzung auf das naechste
Sechsmonatsraster aufgerundet. Leere
kanonische Werte sperren die Legacy-Migration nicht; ungueltige Werte und
Nicht-0,5-Schritte scheitern kontrolliert. Das Goldband ist als
`rebalancingBand` vereinheitlicht, ohne die bisherigen 35-/`NaN`-Fallbacks zu
veraendern. Sweep und Auto-Optimize besitzen sieben beziehungsweise sechs
sichtbare Dimensionen. Die Slice-07-Eingangsfixtures bleiben byteidentisch;
das Demografie-Gate berechnet den Runtime-Stand live, das Slice-06-zu-07-Orakel
ist exakt wiederhergestellt und ein isoliertes Slice-07-zu-08-Ledger liegt vor.
Die Monte-Carlo-Messung vergleicht wieder feldgenau und inventarisiert alle 98
geaenderten Blattpfade. Beide Slice-08-Messfixtures stehen mit
`reviewStatus: pending` bereit. Die Gesamtsuite bestand nach der
Blockerbehebung mit 160 Testdateien und 17.650 Assertions; der Engine-Build war
erfolgreich. Browser (28/28), Coverage (78,23 Prozent; 17.650 Assertions),
Demografie-Verifikation und Doku-Evidenz sind ebenfalls gruen. Der
abschliessende Diff-Check wird im Slice-Dokument protokolliert.

### Slice 9 - Floor und weicher Mindest-Flex-Stabilisator

**Slice-Dokument:**
[`SLICE_BACKTEST_DATENPRUEFUNG_09_FLOOR_MINDEST_FLEX_STABILISATOR.md`](SLICE_BACKTEST_DATENPRUEFUNG_09_FLOOR_MINDEST_FLEX_STABILISATOR.md)

**Umsetzungsstatus:** am 2026-08-02 auf Basis des technisch freigegebenen und
als Commit `ad08236` vorliegenden Slice-08-Ergebnisdokuments technisch
umgesetzt. Die drei Blocker CR09-1 bis CR09-3 aus Claude-Review Runde 1 sind
nachgebessert und selbstgeprueft; externes Re-Review und Freigabe stehen aus.
Preflight, fokussierte Baseline, CR08-18/CR08-20 als Vorgates und die
bestehende Policy-/Profilaggregation sind im Slice-Dokument inventarisiert.
Der Nutzer hat S09-STOP-01 am 2026-08-02 zugunsten additiver Profilwerte mit
fail-closed Ablehnung oberhalb des aggregierten Haushalts-Flexbedarfs
entschieden. Der exakte Zehn-Dateien-Scope wurde vor Coding festgeschrieben.
Beim Implementierungsabgleich wurde S09-STOP-02 ausgeloest: Fuer den
vollstaendigen Vertrag ohne stille `minimumFlexAnnual`-Null-Fallbacks muessen
zusaetzlich `engine/core.mjs` und `app/simulator/simulator-input-validation.js`
geaendert werden. Der Nutzer hat die exakte Erweiterung von zehn auf zwoelf
produktive Dateien am 2026-08-02 freigegeben; S09-STOP-02 ist geschlossen.
Die fortgeschriebene Nutzerfreigabe zur Scope-Erweiterung deckt fuer die
Blockernachbesserung zusaetzlich `simulator-results.js`, `sweep-runner.js` und
`sweep-metrics-contract.js`; der produktive Scope umfasst damit fuenfzehn
Dateien.

Die finale Diagnose reconciliert Mindest-Flex nach Budget, Glaettung und
Monatsquantisierung als Soll, Ist, Fehlbetrag und Status. Profilwerte werden
addiert; Einzelprofil und Haushalt scheitern oberhalb ihrer Flexbasis
fail-closed. Rentenueberschuss nach Floor-Deckung wird genau einmal auf das
Haushalts-Soll angerechnet; nur der offene Rest steuert die Depot-Flex-Rate.
`HistoricalBacktestMetricsV2` und der Raw-Export trennen
Haushalts-, Renten- und Depot-Flex. CR08-18 verwendet fuer bedarfsfreie Jahre
nullable Runwaywerte; CR08-20 pinnt im Browser 50.000/90.000 EUR und entfernt
die Debugprojektion.

Nach Claude-Review Runde 1 reconciliert die Mindest-Flex-Diagnose zusaetzlich
gegen die Ist-Auszahlung und markiert Auszahlungsluecken mit
`limited_by_actual_payout`. `SpendingPolicyOrderV1` bindet die komplette
Policy-Reihenfolge durch einen zur Laufzeit geprueften Trace. Die
Runway-Nichtanwendbarkeit bleibt nun auch in Ansparpfad, Sweep-Aggregation,
kanonischem Metrikleser und Texttabellen `null` beziehungsweise leer; ein
anwendbarer Nullwert bleibt 0.

Die nach CR09-1 aktualisierte Backtestfixture bindet die byteidentische Slice-08-Eingangsfixture und
weist fuer alle elf bestehenden positiven Faelle null Endvermoegens-,
Entnahme-, Steuer-, Outcome- und FlowDelta-Deltas aus. Der eigene D-17-Zeuge
deckt 2001, 2005, 2009 und 2010 ab. Die getrennte MC-/Sweep-Fixture bindet ihre
Slice-08-Quelle per SHA-256 und weist drei hashgleiche Aggregatprojektionen
beziehungsweise null Projektdeltas aus. Gesamtsuite nach Blockernachbesserung:
160 Dateien und 17.980/17.980 Assertions; Coverage 78,31 Prozent, Browser 28/28,
Doku-Evidenz und Engine-Build gruen. Codex markiert die Umsetzung nicht selbst
als freigegeben und erstellt vor externem Review keinen Commit.

**Abhaengigkeit:** Slice 8 und dessen vollstaendiges Ergebnisdokument.

**Ziel**

Floor bleibt hart; Mindest-Flex glaettet kurzfristige Ausschlaege, darf aber
nach laengerem Stress beziehungsweise Budgeterschoepfung sichtbar
unterschritten werden.

**Scope**

- Explizite Prioritaetsordnung aller Policy-Stufen.
- Status und Fehlbetrag bei Mindest-Flex-Unterschreitung.
- Flex-Budget finanziert die zeitlich begrenzte Stabilisierung.
- Korrektur des in D-17 dokumentierten Null-Exports.

**Abnahmekriterien**

- Floor-Shortfall ist in finanzierbaren Szenarien immer 0.
- Kurzer Schock wird gemaess Budgetparametern geglaettet.
- Laengerer Baerenmarkt kann Mindest-Flex nachvollziehbar unterschreiten.
- 2001, 2005, 2009 und 2010 exportieren keinen falschen
  `minimumFlexAnnual`-Nullwert.
- `minimumFlexAnnual` wird validiert und nirgends still begrenzt.

### Slice 10 - Heutige Steuerlogik auf heutigem Startbestand

**Slice-Dokument:**
[`SLICE_BACKTEST_DATENPRUEFUNG_10_HEUTIGE_STEUERLOGIK.md`](SLICE_BACKTEST_DATENPRUEFUNG_10_HEUTIGE_STEUERLOGIK.md)

**Umsetzungsstatus:** am 2026-08-02 auf Basis des freigegebenen und als Commit
`2e4867f` vorliegenden Slice-09-Ergebnisdokuments technisch umgesetzt. CR09-4
und CR09-14 wurden als Eingangsgates geschlossen. Nach vier dokumentierten
Stopps hat der Nutzer den Scope von zehn auf exakt fuenfzehn produktive Dateien
erweitert. Das Claude-Review Runde 1 blockierte mit CR10-1 bis CR10-12; alle
zwoelf Punkte sind korrigiert und selbstgetestet. Das Ergebnis stellt 31
Cross-Slice-Orakel wieder her, vergleicht Slice 09 aktiv, beziffert die
Slice-09-zu-10-Steuerdeltas, trennt Persistenzmigration vom strikten
Engine-Vertrag, macht Legacy-Steuermigration sichtbar und verhindert
Flexaggregation ueber gemischte Bezugsbasen. Die Abschlusssuite ist mit
17.930/17.930 Assertions gruen; Coverage liegt bei 78,40 %
(39.539/50.430). Alle 28 Browser-Szenarien sowie Architektur-Evidenz- und
Engine-Build-Gates sind gruen. Claude-Review Runde 2 hat Slice 10 freigegeben;
der lokale Commit ist `05ff8c3`. Die vor Slice 11 auferlegten CR10-13/14 sind
durch Ergebnisprosa und ein vollstaendiges 12/12-Delta-Ledger geschlossen.

**Abhaengigkeiten:** Slices 1, 2 und 4.

**Ziel**

Das bestehende vereinfachte Steuermodell wird fuer Verkaufsgewinne, Zinsen
und Teilfreistellungen fachlich konsistent.

**Scope**

- Explizite Steuermerkmale je Starttranche.
- Keine Ableitung von Altbestand aus Name, Notiz oder simuliertem Kalenderjahr.
- Korrekte Teilfreistellung je Anlageklasse.
- Zinsen gehen in das zentrale Steuer-Settlement ein.
- Heutige Steuerlogik gilt in allen historischen Marktsequenzen.

**Nicht im Scope**

- Historische Steuergesetze.
- Vorabpauschale, vollstaendige Ausschuettungslogik,
  Sparer-Pauschbetrag und Kirchensteuer; diese Punkte bilden einen spaeteren
  Erweiterungsslice.

**Abnahmekriterien**

- Einzelaktien und Geldmarkt erhalten keine unbelegte
  Aktienfonds-Teilfreistellung.
- Steuerstatus des Startbestands ist exportiert und reproduzierbar.
- Zinssteuer ist fuer Markerjahre nachgerechnet.
- Nicht verkaufte Tranchen erzeugen keine fiktive Verkaufsteuer.

### Slice 11 - Exportgrenzen, Horizont und Engine-Provenienz

**Slice-Dokument:**
[`SLICE_BACKTEST_DATENPRUEFUNG_11_EXPORT_PROVENIENZ.md`](SLICE_BACKTEST_DATENPRUEFUNG_11_EXPORT_PROVENIENZ.md)

**Umsetzungsstatus:** am 2026-08-03 auf Basis des freigegebenen und als Commit
`05ff8c3` vorliegenden Slice-10-Ergebnisdokuments nach Claude-Review Runde 3
technisch nachgebessert und selbstgeprueft. CR10-13 ist durch die dokumentierte Richtung und
Groessenordnung der Steuerwirkung geschlossen; CR10-14 durch eine am
Slice-09-Commit nachgemessene D-17-Basis und ein vollstaendiges
12/12-Delta-Ledger. `HistoricalBacktestExportV2` weist 2000-2025 als 26 Jahre,
nicht restartfaehige aggregierte Portfoliogrenzen, Eingabe- und
Quantisierungssemantik sowie saubere Source-/Engine-/Datenprovenienz aus.
Der relative, unterpfadfaehige Laufzeitendpunkt wird vor dem Lauf abgewartet;
Exportzeit und globale Variablen koennen die gebundene Provenienz nicht
ersetzen. Fehlende oder dirty Source-Provenienz und widerspruechliche
Endgrenzen stoppen Raw-JSON mit sichtbarem stabilem Code, waehrend
`HistoricalBacktestCsvV2` mit 34 Spalten unabhaengig bleibt und dieselbe
kanonische Run-ID traegt. `HistoricalBacktestPortfolioBoundariesV2` benennt
aktives Portfolio plus Pflegebucket und markiert den separaten Pflegewert als
bereits in Start-/Endvermoegen enthalten. Ungueltige Live-Rundungskonfiguration
faellt ohne Batchabbruch auf den freigegebenen Default zurueck und meldet den
stabilen Diagnosecode `SPENDING_ROUNDING_CONTRACT_FALLBACK`; falsy `ENABLED`
behaelt die bisherige Abschaltsemantik. D-17 pinnt Windows-bsdtar unabhaengig
vom PATH. `sync-dist` kopiert nur versionierte Dateien, blockiert normale und
ignorierte unversionierte Runtime-Quellen und ist in einem isolierten
Git-Fixture real ausgefuehrt;
sonstige Scratchdateien bleiben ausgeschlossen. JSON-Dateinamen tragen Run-
und Result-Fingerprint, CSV-Dateinamen Run- und Byte-Fingerprint. Der
produktive Scope umfasst exakt zehn Dateien. Standard- und Coverage-Lauf
bestanden mit 18.063/18.063 Assertions; Coverage liegt bei 78,53 Prozent
(39.946/50.864). Browser 28/28, Architektur-Evidenz, Engine-Build und
Syntaxpruefungen sind gruen; `engine.js` blieb byteidentisch. Erneutes externes
Re-Review, Freigabe und Commit stehen aus.

**Abhaengigkeiten:** Slices 1, 8, 9 und 10.

**Ziel**

Der Export beschreibt Ergebnis, Zeitraum und Wiederverwendungsgrenzen ohne
mehrdeutige Felder.

**Scope**

- 2000-2025 wird ausdrücklich als 26-Jahres-Lauf ausgewiesen.
- Der End-Snapshot wird als nicht restartfaehig markiert.
- Kanonische Endwerte werden von nicht fortgeschriebenen Detailfeldern
  getrennt oder letztere entfernt.
- Engine-Provenienz enthaelt Build-/Source-Commit und Datenrevision.

**Abnahmekriterien**

- Keine Behauptung eines 30-Jahres-Ergebnisses.
- Kein Consumer kann den Snapshot versehentlich als kanonischen
  Neustartbestand behandeln.
- Request, Ergebnis, Quellstand und Datenstand sind eindeutig verbunden.
- D-16 und D-19 sind im Exportvertrag adressiert.

### Slice 12 - Stressszenarien, Regime und Fallbackwerte

**Abhaengigkeiten:** Slices 1 bis 6.

**Ziel**

Abgeleitete Regime und Stresspresets werden nach dem Datenersatz neu geprüft;
Fallbacks bleiben sichtbar und fachlich begrenzt.

**Scope**

- BULL/BEAR/SIDEWAYS/STAGFLATION-Grenzen.
- Historische Stressfenster und benannte Presets.
- Default- und Fallbackwerte bei fehlenden Daten.
- Rekalibrierung nur bei explizitem fachlichem Nachweis.

**Abnahmekriterien**

- Regimeklassifikation verwendet die neuen kanonischen Reihen.
- Datenluecken erzeugen keinen stillen Normalzustand oder Nullreturn.
- Stresspresets unterscheiden Beobachtung, Rekonstruktion und synthetischen
  Schock.
- Vorhandene Preset-Namen versprechen keine historische Exaktheit ohne Beleg.

### Slice 13 - Gesamtintegration und neue Referenz-Backtests

**Abhaengigkeiten:** Slices 2 bis 12.

**Ziel**

Alle Daten- und Vertragsänderungen werden gemeinsam validiert und ihre
Ergebniswirkung nachvollziehbar dokumentiert.

**Scope**

- Vollstaendige Testsuite und verpflichtender Engine-Build.
- Referenzlaeufe fuer mehrere Startjahre, nicht nur 2000.
- Isolierte Attribution der Ergebnisaenderung je Datenreihe und
  Korrekturslice.
- Neuer Export fuer den 26-Jahres-Beispiellauf 2000-2025.
- Aktualisierung der betroffenen Referenzdokumentation.

**Abnahmekriterien**

- `npm test` und `npm run build:engine` bestehen.
- `FlowDelta` bleibt innerhalb der definierten Toleranz.
- Jede wesentliche Vorher-/Nachher-Abweichung ist einem Slice zugeordnet.
- Keine offenen UI-/Engine-Parameternamenskonflikte.
- Neuer Export, Manifesthash, Datenrevision und Source-Commit stimmen
  ueberein.
- Abschlussreview durch Gemini, Claude oder Nutzer; keine
  Selbstfreigabe durch Codex.

## Priorisierung und Startreihenfolge

Die technische Reihenfolge ist:

1. Slice 1 als zwingendes Evidenz- und Lizenz-Gate.
2. Slices 2 bis 6 fuer die historischen Reihen.
3. Slice 7 fuer die personenbezogenen Modelltabellen.
4. Slices 8 bis 11 fuer Runway, Mindest-Flex, Steuern und Exportvertrag.
5. Slice 12 nach Abschluss der zugrunde liegenden Datenreihen.
6. Slice 13 als gemeinsame Integration.

Innerhalb der Datenersetzung besitzt Slice 2 wegen des bereits quantifizierten
2024-Aktienfehlers die hoechste Ergebnisprioritaet. Ein Quellen- oder
Lizenzblocker in Slice 2 blockiert nicht die unabhaengige Pruefung der
Inflations-, Geldmarkt-, Gold-, CAPE-, Lohn- und Demografiedaten.

## Erweiterungsbereich fuer Gemini

**Review-Datum:** 2026-07-29  
**Reviewer:** Antigravity (Gemini 3.6 Flash - Superkritischer Reviewer & Analyst)  
**Status:** Bestätigt & konsolidiert (Blocker D-01, D-02, D-03, D-04, D-15 uneingeschränkt bestätigt)

### 1. Selbstkritische Richtigstellung zur Erstbewertung

In der ersten schnellen Systemantwort hatte Gemini lediglich die **interne Bilanzkontinuität und Tranchenarithmetik** (d. h. $2.716.935,41\ \text{€}$ Startvermögen, Rentenverlauf, steuerliche FIFO-Abzüge und mathematische Summenintegrität) bestätigt. 

Diese rein rechnerische Prüfung reichte jedoch **nicht aus**, um die fachliche Aussagekraft des Backtests zu garantieren. Die von Claude und Codex in diesem Dokument aufgedeckten **20 Befunde (D-01 bis D-20)** legen fundamentale semantische und datenseitige Schwachstellen offen, die das Gesamtergebnis verzerren:

### 2. Bewertung der kritischen Blocker durch Gemini

1. **D-01 (S) - Stille Transformation zum ~95% Aktien-Portfolio:**
   - Obwohl `targetEq: 60` im Request vorgegeben ist, kauft `transaction-surplus.mjs` bei Liquiditätsüberschüssen weiter Aktien zu, verkauft Aktien jedoch nie zur Rebalancierung ab.
   - Die reale Aktienquote liegt im Mittel bei **95,4 %** (in 2004, 2005 und 2012 bei 100 %). Der Lauf simuliert somit **kein 60/40-Portfolio**, sondern ein nahezu reines Aktienportfolio mit extrem hohem Drawdown-Risiko.

2. **D-04 & D-15 (S) - Kursindex ohne Dividenden & Datenfehler 2024:**
   - Die historische Reihe `msci_eur` ist ein Kursindex (Price Return, ohne Dividenden). 
   - Für das Jahr 2024 enthält der Datensatz eine Rendite von nur **7,81 %**, obwohl der tatsächliche MSCI World EUR Net Return bei **26,60 %** (und Price Return bei **24,81 %**) lag.
   - Die Korrektur dieses einen Datenfehlers für 2024 erhöht das Endvermögen um über **700.000 €**!
   - **Kompensationseffekt:** D-01 (zu hohe Aktienquote) und D-04/D-15 (fehlende Dividenden & 2024-Untertreibung) wirken in entgegengesetzte Richtungen und haben sich im Ergebnis von 4,39 Mio. € rein zufällig teilweise ausgeglichen.

3. **D-02 (S) - Scheinsicherheit bei der Runway-Deckung:**
   - `runway_min_coverage_pct` weist 13,85 % als Tiefststand aus. Tatsächlich fiel die Liquidität in 2004 und 2005 nach der Entnahme auf **exakt 0,00 €**. Die 13,85 % entstehen nur, weil die Formel die interne Mindest-Puffer-Konstante ($10.000\ \text{€}$) ins Verhältnis zur Ziel-Liquidität setzt.

4. **D-03 (S) - Untergrabung der Mindest-Flex-Garantie:**
   - Die Prüfung von `minimumFlexAnnual` erfolgt vor dem finalen Glättungs-Guardrail. Im Jahr 2004 wird die Entnahme durch die Glättung auf 44,6 % gekürzt – weit unter die geforderten 53,7 % Mindest-Flex. Dennoch meldet die Engine fälschlicherweise den Status `not_needed`.

5. **D-06, D-07, D-11, D-16, D-17 (M) - Steuerliche & diagnostische Fehler:**
   - **D-06:** Zinserträge ($40.274\ \text{€}$) bleiben in der Simulation komplett steuerfrei.
   - **D-07:** Pauschale 30 % Teilfreistellung (TQF) wurde auch auf Geldmarkt (XEON) und Einzelaktien (SAP) angewendet.
   - **D-11:** `minimumFlexProfiles` definiert $36.000\ \text{€}$ (Dieter) und $30.000\ \text{€}$ (Karin). Die Engine wendet starr nur Karins $30.000\ \text{€}$ an.
   - **D-16:** Der End-Snapshot mischt veraltete Einzeltranchen-Preise mit fortgeschriebenen Gesamtwerten und ist nicht als Startzustand wiederverwendbar.
   - **D-17:** In 4 aktiven Jahren wird `minimumFlexAnnual` im Export fälschlicherweise als `0 EUR` ausgegeben.

### 3. Gesamtreview-Ergebnis (Gemini)

```markdown
## Review-Ergebnis (Gemini)
- Status: blockiert für die Verwendung der Zahlen als persönliche Entscheidungsgrundlage
- Blocker: D-01, D-02, D-03, D-04, D-15 (vollständig bestätigt)
- Restrisiken: D-05 bis D-14, D-16 bis D-20
- Fazit: Die rechnerische Bilanzmechanik der Engine ist zwar prinzipiell intakt, aber der konkrete Backtestlauf 2000–2025 beruht auf falschen Eingabe-Semantiken (Aktienquote ~95% statt 60%) und fehlerhaften historischen Marktdaten (fehlende Dividenden, falscher Return 2024). Das Korrekturprogramm (Slices 1 bis 13) ist zwingend erforderlich.
```

## Zweitreview durch Claude nach der Codex-Ueberarbeitung

**Reviewdatum:** 2026-07-29
**Reviewer:** Claude (Primary reviewer & Analyst)
**Pruefgegenstand:** dieses Dokument in der von Codex ueberarbeiteten Fassung
einschliesslich D-15 bis D-20, der Nutzerentscheidungen, des 13-Slice-Programms
und des Gemini-Abschnitts
**Leitfrage des Nutzers:** Kann die Realisierung so gestartet werden?
**Methode:** adversariales Review nach `CLAUDE.md`. Geprueft wurde nicht, ob
das Programm plausibel klingt, sondern ob es an einer konkreten Stelle
undurchfuehrbar oder in sich widerspruechlich ist.

### Abgrenzung der Kennungen

Die Befunde dieses Abschnitts betreffen das Korrekturprogramm, nicht die
Daten. Sie tragen deshalb das Praefix `P` und lassen den `D`-Namensraum
unberuehrt; neue Datenbefunde setzen weiterhin bei `D-21` fort.

### Nachgemessene Angaben von Codex

Alle folgenden Werte wurden unabhaengig an der Exportdatei nachgerechnet und
bestaetigt. Keiner wurde aus dem Dokument uebernommen.

| Angabe | Quelle | Nachmessung |
| --- | --- | --- |
| Aktienquote 89,9426 bis 100,0000 Prozent, Mittel 95,3991 | D-01 | bestaetigt |
| Bruttoflex 1.747.891,14 EUR, erfuellt 1.255.359,00 EUR, 71,8213 Prozent | D-09 | bestaetigt; die Differenz zur Entnahmesumme sind exakt die 8.241 EUR Floor-aus-Depot der Jahre 2000 und 2001 |
| `minimumFlexAnnual` gleich 0 in 2001, 2005, 2009, 2010 | D-17 | bestaetigt, einschliesslich der vier Statuswerte |
| Liquiditaet endet in 2004, 2005 und 2012 bei 0 EUR | D-02 | bestaetigt |
| End-Snapshot mischt fortgeschriebene und unveraenderte Felder | D-16 | bestaetigt: SAP 152.143,06 gegen 55.362,56 EUR, UBS 1.535.092,96 gegen 558.597,12 EUR, Liquiditaet 188.734,51 gegen 361.165,05 EUR |
| 42 ungeklaerte Nullwerte in `gold_eur_perf` | Slice 5 | Ausgangsbefund bestaetigt; technisch durch die segmentierte Quell-/Proxykette ersetzt. Zwoelf erklaerte Nullreturns bleiben, davon sechs explizit geschaetzt |
| Exakter Replay widerlegt den Replay-Teil von D-12 | Korrekturhinweis | akzeptiert, siehe Richtigstellung unten |

Zusaetzliche Beobachtung zu D-16, die den Befund stuetzt: Der End-Snapshot
enthaelt drei Tranchen mit Marktwert 0, davon zwei mit dem Namen
`Simulierter Aktienkauf` und dem Platzhalterpreis `currentPrice: 1`.

Gates am Pruefzeitpunkt: `npm test` 9.892 von 9.892 Assertions, 0 fehlgeschlagene
Dateien, 0 offene Handles; `npm run docs:evidence` bestanden. Das Dokument ist
kein Testfixture und beruehrt die Plan-Kopplung aus Slice 16 nicht.

### Richtigstellungen an eigenen frueheren Aussagen

1. Die Aussage in D-12, `request.inputs` erlaube wegen des fehlenden
   `depotwertNeu` keine vollstaendige Wiederholung, war zu stark. Codex hat den
   Lauf exakt reproduziert. Praezisierung: Der Export ist zusammen mit dem
   passenden Quellstand reproduzierbar, nicht aus `request.inputs` allein. Genau
   diese Bindung ist unter D-19 als fehlend dokumentiert.
2. Der frueher geaeusserte und bereits zurueckgezogene Verdacht, D-01 beruhe auf
   einem eingefrorenen `depotwertAlt`, ist endgueltig geschlossen:
   `app/simulator/simulator-portfolio-tranches.js:340` bis `:359` baut
   `depotwertAlt` und `depotwertNeu` in jedem Jahr aus den aktuellen Tranchen
   neu auf. Der Mechanismus von D-01 ist ausschliesslich `equityOverflowCap`.
3. Dieselbe Funktion setzt jedoch `tqfAlt: 0.30` und `tqfNeu: 0.30` fest
   verdrahtet. Die Korrektur von D-07 muss diese Stelle mit erfassen, nicht nur
   die Tranchen des Requests.

### P-01 (Blocker) Slice 9 enthaelt eine offene fachliche Frage

Das Befundregister vermerkt zu D-11: Die Haushalts- und Profilaggregation
bleibt als Vertragsdetail fuer Slice 9 offen. Scope und Abnahmekriterien von
Slice 9 enthalten dazu nichts; eine Stichwortpruefung auf `Haushalt`,
`Profilaggregation`, `minimumFlexProfiles` und `Aggregation` liefert im
gesamten Slice-9-Text keinen Treffer.

Die Frage ist nicht nachrangig, sondern bestimmt das Verhalten des gesamten
Slices:

| Angenommener Haushalts-Mindest-Flex | Bindungsverhalten im Referenzlauf |
| --- | --- |
| 30.000 EUR, inflationsindexiert | bindet in 2 von 26 Jahren (2004 und 2009) |
| 66.000 EUR als Summe beider Profile | liegt ueber dem aggregierten Flexbedarf von 60.000 EUR und bindet damit ab dem ersten Jahr dauerhaft |

Beide Faelle erfordern eine andere Prioritaetsordnung der Policy-Stufen und
andere Abnahmekriterien. Slice 9 ist bis zur Klaerung nicht implementierbar.

**Aufloesung 2026-08-02:** Der Nutzer hat additive Profilwerte mit
fail-closed Ablehnung oberhalb des aggregierten Haushalts-Flexbedarfs
festgelegt. S09-STOP-01 ist geschlossen; Slice 09 ist technisch umgesetzt und
wartet auf externes Review. Der vorstehende Blocker bleibt als historischer
Planreviewbefund erhalten.

### P-02 (Blocker) Der Verbleib von `targetEq` ist nicht entschieden

Der Nutzer hat festgelegt: kein Rebalancing auf eine feste
Aktien-/Liquiditaetsquote. Slice 8 erwaehnt `targetEq` mit keinem Wort.

`targetEq` verschwindet dadurch nicht, sondern wird teilwirksam:

| Verwendung | Fundstelle | Zustand nach Slice 8 |
| --- | --- | --- |
| Zielallokation im Ueberschuss-Rebalancing | `engine/transactions/transaction-surplus.mjs:55` | soll entfallen |
| Erwartete Realrendite fuer VPW | `engine/planners/vpw-return-policy.mjs:100` und `:153` | bleibt wirksam |
| Opportunistische Transaktionen | `engine/transactions/transaction-opportunistic.mjs:208` und `:307` | ungeklaert |
| Eingabevalidierung 20 bis 90 | `engine/validators/InputValidator.mjs:160` | validiert dann einen teilwirksamen Parameter |
| Sweep-Dimension | `app/simulator/simulator-main-sweep-ui.js:40` | bleibt |
| Auto-Optimizer-Suchdimension | `app/simulator/auto-optimize-params.js` und `auto-optimize-presets.js:37`, `:58`, `:70` mit den Bereichen 40 bis 80, 60 bis 90 und 30 bis 60 | bleibt |

Der Optimizer wuerde `targetEq` weiterhin durchsuchen, waehrend der Parameter
die Allokation nicht mehr steuert, aber die erwartete VPW-Realrendite noch
verschiebt. Das Ergebnis waere kein wirkungsloser, sondern ein
bedeutungsveraenderter Suchparameter. Slice 8 muss den Verbleib von `targetEq`
festlegen, und Slice 12 oder 13 muss pruefen, dass kein Preset eine
Suchdimension ohne Allokationswirkung behaelt.

### P-03 (Blocker) Reihenfolgekonflikt zwischen Slice 2 und Slice 8

Slice 8 deklariert Abhaengigkeiten ausschliesslich auf die Slices 1 und 4. Sein
Abnahmekriterium lautet: D-02 ist fuer die Markerjahre 2004, 2005 und 2012
reproduzierbar behoben.

Diese drei Jahre sind genau die Jahre mit `liqEnd` gleich 0 unter der
bisherigen, als fehlerhaft erkannten Aktienreihe. Der Abschnitt
Priorisierung erklaert Slice 2 gleichzeitig zur hoechsten Ergebnisprioritaet.
Landet Slice 2 zuerst, aendert sich der Vermoegenspfad, und 2004, 2005 und 2012
sind moeglicherweise keine Null-Liquiditaetsjahre mehr. Das Abnahmekriterium
kann dann weder bestehen noch scheitern.

Aufloesung: entweder Slice 8 erhaelt eine Abhaengigkeit auf Slice 2, oder das
Kriterium wird verhaltensbasiert formuliert, etwa: In jedem Jahr mit
Jahresend-Liquiditaet 0 betraegt der Post-Transaktions-Runway 0, unabhaengig
vom Jahr.

### P-04 (mittel) Fuenf Befunde sind Slices zugeordnet, die sie nicht abdecken

Das Befundregister nennt fuer jeden Befund einen Slice. Die Slice-Abschnitte
selbst nennen jedoch nur in drei von dreizehn Faellen eine Befundkennung
(Slice 8 nennt D-02, Slice 9 nennt D-17, Slice 11 nennt D-16 und D-19). Fuer
fuenf Befunde enthaelt der zugeordnete Slice-Text kein passendes Scope- oder
Abnahmeelement:

| Befund | Zugeordnet an | Stichwortpruefung im Slice-Text |
| --- | --- | --- |
| D-09 | Slices 9 und 11 | kein Treffer fuer Kuerzungsquote, Bezugsbasis, `flex_reduction` |
| D-11 | Slice 9 | kein Treffer fuer Haushalt, Profilaggregation |
| D-12 | Slice 11 | kein Treffer fuer `zielLiquiditaet`, `rebalBand`, `rebalancingBand` |
| D-13 | Slice 11 | kein Treffer fuer Quantisierung |
| D-18 | Slice 11 | kein Treffer fuer Proxy-Rendite oder positionsspezifisch |

Die Zuordnung erzeugt damit den Anschein einer Abdeckung, die der Slice-Text
nicht einloest. Das ist dasselbe Muster wie der Befund G-01 des
Slice-uebergreifenden Reviews, fuer den zuvor eine eigene Nachbesserungsrunde
noetig war. Empfehlung: jeder Slice fuehrt eine Zeile
`Schliesst Befunde: D-xx, D-yy` und jedes dort genannte Befundthema erscheint
mindestens einmal in Scope oder Abnahmekriterien.

Hinweis zu D-18: Der Nutzer hat die einheitliche globale Aktienrendite bewusst
akzeptiert. Eine akzeptierte Vereinfachung braucht keinen Umsetzungsslice,
sehr wohl aber eine ausdrueckliche Erklaerung im Exportvertrag, damit ein
spaeterer Leser den Lauf nicht als Nachbau der tatsaechlichen Depotentwicklung
liest.

### P-05 (mittel) `liquidityRunwayYears` tritt neben zwei bestehende Runway-Parameter

Der Request fuehrt bereits `runwayTargetMonths` mit 36 und `runwayMinMonths`
mit 24; die Engine exportiert zusaetzlich `RunwayTargetRawMonths`,
`RunwayTargetSmoothedMonths` und `RunwayTargetHardMinMonths`. Slice 8 fuehrt
`liquidityRunwayYears` mit Default 5 ein und schliesst lediglich eine Kopplung
an `flexBudgetYears` aus. Ob die beiden bestehenden Parameter ersetzt,
abgeleitet oder beibehalten werden, steht nirgends.

Damit reproduziert der Korrekturslice genau das Fehlerbild D-12, das er
mitbeseitigen soll: mehrere aehnlich benannte Parameter fuer dieselbe Groesse.

Zusaetzlich ist die Richtung des Defaults zu klaeren. 5 Jahre entsprechen 60
Monaten und liegen 67 Prozent ueber den vom Nutzer konfigurierten 36 Monaten.
Ein hoeheres Liquiditaetsziel senkt die Aktienquote, waehrend die
Nutzerentscheidung eine steigende Aktienquote ausdruecklich in Kauf nimmt. Ob
5 Jahre Ziel, Obergrenze oder nur Auslieferungsdefault sind, ist offen.

### P-06 (mittel) Slice 12 kehrt die Beweislast bei der Regime-Rekalibrierung um

Slice 12 legt fest: Rekalibrierung nur bei explizitem fachlichem Nachweis.
Slice 2 hebt jedoch jede Jahresrendite der Aktienreihe systematisch um die
Dividendenrendite an. Die Regimegrenzen fuer BULL, BEAR, SIDEWAYS und
STAGFLATION wurden gegen die bisherige Kursreihe kalibriert.

Nach einer systematischen Niveauverschiebung ist das Beibehalten der alten
Grenzen die begruendungspflichtige Entscheidung, nicht deren Anpassung. Die
Wirkung ist nicht theoretisch: `Regime` speist `expectedReturnCape` und den
Glaettungs-Guardrail, also genau den Mechanismus hinter D-03. Empfehlung:
Slice 12 verlangt eine Vorher-Nachher-Verteilung der Regimeklassifikation ueber
den gesamten Datenbereich und begruendet jede beibehaltene Grenze.

### P-07 (mittel) D-15 ist enger formuliert als der Befund reicht

Zwei Praezisierungen, beide nachgemessen:

Erstens ist 2024 keine einzelne fehlerhafte Beobachtung, sondern eine
Platzhalterzeile. `msci_eur` mit 2500 ist einer von nur zwei durch 100
teilbaren Indexstaenden seit 1990. 2024 ist zugleich das einzige Jahr seit
1990, in dem `msci_eur`, `lohn_de` mit 3 und `gold_eur_perf` mit 15
gleichzeitig glatte Zahlen tragen. Der von Codex unabhaengig gefundene
Lohnbefund unter D-20 betrifft dieselbe Zeile.

Zweitens traegt die Schlussfolgerung nicht, der exakte Treffer des
2025-Returns mit der MSCI-Price-Reihe sei ein Indiz fuer eine beabsichtigte
Price-Variante. Auf einer fortlaufenden Niveaureihe gilt:

```text
2633,8 / 2500,0 - 1 = 5,3520 Prozent
```

Der 2025-Stand ist also durch Anwendung eines plausiblen Jahresreturns auf den
Platzhalter entstanden. Wird 2024 auf 24,81 Prozent korrigiert, impliziert der
unveraenderte Stand 2633,8 fuer 2025 einen Return von minus 9,00 Prozent. Der
Platzhalter pflanzt sich damit in den Stand 2025 fort.

Folge fuer Slice 2: Die geplante Neuverkettung aus Jahresrenditen ist der
richtige Weg und wird durch diesen Befund gestuetzt. Die Pruefung darf sich
aber nicht auf 2024 beschraenken; jedes Jahr des Zeitraums 2000 bis 2025 ist
gegen die Segmentquelle abzugleichen.

### P-08 (leicht) Formale Abweichungen im erweiterten Dokument

- 55 Nicht-ASCII-Zeichen in den Abschnitten von Codex und Gemini, waehrend der
  urspruengliche Teil ASCII-rein ist. Das Projekt ist hier uneinheitlich
  (`PROJEKTUEBERSICHT.md` 0 Zeichen, `SLICE_EXECUTION_RULES.md` 73), es liegt
  also kein Regelverstoss vor, wohl aber eine Inkonsistenz innerhalb derselben
  Datei.
- Sechs LaTeX-Ausdruecke der Form `$2.716.935,41\ \text{€}$` im
  Gemini-Abschnitt. Sie rendern in keinem Markdown-Viewer dieses Projekts.
- Vier Zeilen mit Trailing-Whitespace.
- Der Dokumentkopf nennt weiterhin nur Claude als Pruefer und traegt den Status
  `offen (Befunde dokumentiert, keine Umsetzung beauftragt)`, obwohl das
  Dokument inzwischen drei Autoren, zwanzig Befunde, Nutzerentscheidungen und
  ein Dreizehn-Slice-Programm enthaelt. Kopf und Inhalt widersprechen sich.
  Die Aenderung des Kopfes ist eine Nutzerentscheidung und wurde deshalb nicht
  vorgenommen.

### Was gegen eine Blockade spricht

Damit dieses Review nicht als Pauschalablehnung gelesen wird: Die Substanz des
Programms ist tragfaehig. Slice 1 ist ein sauber geschnittenes Evidenz- und
Lizenz-Gate ohne offene Entscheidung, ohne Abhaengigkeit und mit
selbsttragenden Abnahmekriterien. Die uebergreifenden Regeln adressieren die
richtigen Fehlerklassen, insbesondere das Verbot stiller Nullwerte, die
Trennung der Evidenzklassen und das Verbot der Selbstfreigabe durch Codex. Die
Datenslices 2 bis 7 haengen ausschliesslich an Slice 1 und sind untereinander
entkoppelt; ein Lizenzblocker in Slice 2 legt sie nicht still.

Saemtliche Blocker dieses Reviews liegen in den Slices 8 und 9 sowie in der
Reihenfolge. Sie betreffen keinen der Datenslices.

### Pre-Mortem

Angenommen, dieses Programm verursacht in drei Monaten einen Fehler: Die
wahrscheinlichste Ursache ist, dass Slice 2 und Slice 8 in derselben Phase
landen und ihre Wirkungen nicht mehr getrennt werden koennen. Slice 2 hebt das
Renditeniveau, Slice 8 aendert gleichzeitig das Liquiditaetsziel und damit die
Aktienquote. Beide verschieben das Endvermoegen deutlich und in dieselbe
Richtung. Slice 13 verlangt zwar eine isolierte Attribution je Slice, aber
Slice 8 ist ueber die Markerjahre 2004, 2005 und 2012 an den alten
Vermoegenspfad gebunden. Wenn diese Jahre nach Slice 2 nicht mehr auffaellig
sind, wird das Abnahmekriterium als bestanden abgehakt, ohne dass die
Runway-Semantik jemals an einem echten Stressjahr geprueft wurde. Der Fehler
faellt erst auf, wenn ein anderer Startjahrgang wieder in die
Liquiditaetserschoepfung laeuft.

## Review-Ergebnis (Claude, Zweitreview)

- Status: **teilweise freigegeben**. Slice 1 und die Datenslices 2 bis 7
  koennen starten. Die Slices 8 und 9 sind blockiert.
- Blocker: P-01 (offene fachliche Frage zur Haushalts-Mindest-Flex-Aggregation
  in Slice 9), P-02 (Verbleib von `targetEq` nach der Entscheidung gegen eine
  feste Zielquote ungeklaert), P-03 (Reihenfolgekonflikt zwischen der
  Prioritaet von Slice 2 und den Markerjahren von Slice 8)
- Restrisiken: P-04 (fuenf Befunde ohne deckendes Scope- oder
  Abnahmeelement), P-05 (dritter Runway-Parameter neben zwei bestehenden),
  P-06 (umgekehrte Beweislast bei der Regime-Rekalibrierung), P-07 (D-15 ist
  eine Platzhalterzeile, nicht ein Einzelwert), P-08 (formale Abweichungen);
  ferner alle bereits dokumentierten Restrisiken D-05 bis D-14 und D-16 bis
  D-20
- Pre-Mortem: Slice 2 und Slice 8 landen gemeinsam, ihre Wirkungen sind nicht
  mehr trennbar, und die Runway-Semantik wird nie an einem echten Stressjahr
  geprueft, weil die Markerjahre nach der Datenkorrektur unauffaellig geworden
  sind.
