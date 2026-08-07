# Marktvergleich der Ruhestand-Suite

**Vergleichsstichtag:** 2026-07-15<br>
**Status:** abgeschlossener, eingefrorener Stichtagsbefund<br>
**Hauptdokument:** [`ARCHITEKTUR_UND_FACHKONZEPT.md`](ARCHITEKTUR_UND_FACHKONZEPT.md#marktvergleich)<br>
**Normativer Beleganhang:** [`MARKTVERGLEICH_EVIDENZREGISTER.md`](MARKTVERGLEICH_EVIDENZREGISTER.md)

---

## Worum es in diesem Dokument geht

Dieses Dokument beantwortet **eine** Frage:

> Wie gut lässt sich ein typischer deutscher Ruhestandshaushalt in der
> Ruhestand-Suite und in zehn anderen Planungswerkzeugen abbilden – und wie
> nachvollziehbar sind dabei Annahmen, Rechenwege und Ergebnisse?

Es beantwortet **nicht** die Frage, welches Produkt „das beste" ist. Es gibt
deshalb bewusst keine Sterne, keine Punktzahlen und keine Rangliste. Statt
Wertungen enthält der Vergleich ausschließlich prüfbare Statusangaben mit
Quellenbeleg.

Alle Aussagen sind auf den **15. Juli 2026** eingefroren. Preise, Produktstufen
und Funktionsbefunde können sich seither geändert haben; die Pflegeroutine dafür
steht in [D.17](#d17-evidenzlücken-und-aktualisierungsroutine).

---

## Wie Sie dieses Dokument lesen

| Wenn Sie … | dann lesen Sie … |
| --- | --- |
| nur das Ergebnis wissen wollen | [D.13](#d13-kriterienprofil-k-01-bis-k-18), [D.14](#d14-segmentbefunde-stärken-und-grenzen) und [D.15](#d15-modellierbarkeit-des-referenzhaushalts) |
| wissen wollen, wofür die Suite gedacht ist – und wofür nicht | [D.16](#d16-positionierung-der-ruhestand-suite) |
| prüfen wollen, ob die Methode sauber ist | [D.1](#d1-erkenntnisziel-und-vergleichsgrenze) bis [D.10](#d10-festgelegte-methodenbasis) |
| eine einzelne Aussage bis zur Quelle zurückverfolgen wollen | [Evidenzregister](MARKTVERGLEICH_EVIDENZREGISTER.md) |
| den Vergleich aktualisieren wollen | [D.17](#d17-evidenzlücken-und-aktualisierungsroutine) |

Die Abschnittsnummern D.1 bis D.18 sind unverändert aus dem früheren
Hauptdokument übernommen, damit bestehende Querverweise gültig bleiben.

---

## Kürzel auf einen Blick

Der Vergleich arbeitet mit vier Kürzelfamilien. Wer sie kennt, versteht jede
Tabelle in diesem Dokument.

| Kürzel | Steht für | Beispiel |
| --- | --- | --- |
| **Produkt-IDs** (`RS-01`, `CP-01`, `DE-02`, `AD-01`, `FIRE-01`, `OT-01`) | ein untersuchtes Produkt **in einer bestimmten Preis-/Funktionsstufe** | `CP-02` = Boldin in der Stufe „PlannerPlus" |
| **K-01 bis K-18** | die 18 Prüfkriterien, mit denen jedes Produkt geprüft wurde | `K-02` = Steuerregion und Steuertiefe |
| **RH-01 bis RH-04** | der erfundene Referenzhaushalt und seine drei Varianten | `RH-03` = derselbe Haushalt, aber mit Pflegefall |
| **MKT-…** | ein einzelner Quellenbeleg im [Evidenzregister](MARKTVERGLEICH_EVIDENZREGISTER.md) | `MKT-BD-01` = Beleg Nr. 1 zu Boldin |
| **GAP-MKT-…** | eine belegte Lücke der Ruhestand-Suite selbst | `GAP-MKT-01` = keine vollständige Einkommensteuer |

Wichtig zu den `MKT`-IDs: Belege, deren Nummer auf **`99`** endet, sind
*Suchprotokolle*. Sie halten fest, dass offiziell gesucht und nichts gefunden
wurde. Sie sind **nie** ein Beweis dafür, dass eine Funktion fehlt.

---

## Die fünf Grundregeln des Vergleichs

Diese Regeln gelten für jede einzelne Aussage in diesem Dokument. Sie sind der
Grund, warum viele Formulierungen vorsichtiger klingen, als man es aus
Produkttests kennt.

1. **Verglichen wird immer Produkt *plus* Stufe *plus* Region *plus* Datum.**
   Eine Funktion aus einer teureren oder anderen Stufe zählt nicht.
2. **Jedes Segment wird an seinem eigenen Zweck gemessen.** Ein Rechner, der
   bewusst nur einen Auszahlplan berechnet, ist kein schlechter Vollplaner – er
   ist gar kein Vollplaner.
3. **Schweigen ist kein Befund.** Wenn eine offizielle Quelle nichts zu einem
   Punkt sagt, heißt das „nicht öffentlich dokumentiert", nicht „kann das nicht".
4. **Eigener Code beweist nichts über die Wirkung.** Dass eine Funktion in der
   Ruhestand-Suite implementiert und getestet ist, sagt nichts darüber, ob sie
   zu besseren Ruhestandsentscheidungen führt.
5. **Keine Gesamtnote.** Es werden weder Kriterien gewichtet noch Punkte addiert.

---

## D.1 Erkenntnisziel und Vergleichsgrenze

**In einem Satz:** Der Vergleich misst Modellierbarkeit und Nachvollziehbarkeit,
nicht Produktqualität.

Geprüft wird, wie eine festgelegte Produktstufe den synthetischen deutschen
Referenzhaushalt abbildet und wie transparent, reproduzierbar und praktisch
nutzbar ihre Annahmen, Rechenwege und Ergebnisse sind.

Die Vergleichseinheit ist **Produkt, Stufe, Region/Sprache und
Erhebungsdatum** – nicht „das Produkt" als Ganzes. Daraus folgen drei feste
Grenzen:

- Segmente werden in ihrem eigenen Zweck interpretiert; es gibt weder Scores
  noch eine Rangliste.
- Eine Funktion, die nur in einer anderen Stufe existiert, wird nicht auf die
  untersuchte Stufe übertragen.
- Auch lokaler Suite-Code belegt keine externe Wirksamkeit.

## D.2 Recherchefenster und reproduzierbarer Stichtag

**In einem Satz:** Die Erhebung lief in einem begrenzten Zeitfenster und endete
am 2026-07-15; alles danach ist nicht erfasst.

Für die Erhebung gelten feste Verfahrensregeln:

- Eine Vollerhebung dauert höchstens 14 Tage. Am letzten Tag werden Stufe,
  Verfügbarkeit und Preis noch einmal geprüft, damit der Befund zum Stichtag
  konsistent ist.
- Jeder Beleg führt getrennt sein **Abrufdatum** und – soweit erkennbar – seinen
  **Veröffentlichungs- beziehungsweise Änderungsstand**.
- Dauert eine Erhebung länger, ist sie neu zu prüfen.
- Quellen, die nicht mehr erreichbar sind, werden als *historisch* oder *nicht
  erneut verifiziert* gekennzeichnet – nicht gelöscht.
- Kauf, Registrierung, Anbieteranfrage oder die Verwendung realer Finanzdaten
  hätten eine gesonderte Freigabe gebraucht und sind nicht erfolgt.

## D.3 Produktsegmente

**In einem Satz:** Die elf untersuchten Stufen verteilen sich auf fünf Segmente,
die jeweils an ihrem eigenen Zweck gemessen werden.

| Segment | Zweck | Woran es gemessen wird |
| --- | --- | --- |
| Consumer Planner | Vollplanung für Endkunden | Szenarien und Haushaltsbreite |
| Deutsche Vorsorge-/Entnahmewerkzeuge | fokussierte Einzelfragen | ihr jeweiliger Rechen- oder Informationszweck |
| Beratersoftware | Planung durch Fachberater | Kollaboration und Auditierbarkeit |
| FIRE-Werkzeuge | Entnahmemethodik | transparente Methodendokumentation |
| Offline-/Tabellenlösungen | lokale Modellbreite | zusätzlich Kontrolle und Laufzeitabhängigkeiten |

Für Fragen, die außerhalb des Produktzwecks liegen, gibt es den Status
`nicht anwendbar`. Er schützt schmale Werkzeuge vor unpassenden Erwartungen.
Umgekehrt gilt: **Abdeckung ist nicht Zweckerfüllung.** Ein Produkt, das viele
Kriterien berührt, erfüllt sie deshalb noch nicht gut.

## D.4 Auswahlregeln und Stichprobe

### D.4.1 Auswahlverfahren

**In einem Satz:** Die Stichprobe ist bewusst kontrastreich zusammengestellt und
deshalb ausdrücklich **nicht statistisch repräsentativ**.

Das Verfahren heißt *Maximum-Variation-Sampling*: Ausgewählt wurden Werkzeuge,
die sich in Zielgruppe, Rechtsraum, Rechenansatz und Betriebsmodell möglichst
stark unterscheiden. Daraus folgt eine harte Aussagegrenze – **unzulässig sind**
Aussagen über Marktanteile, Verbreitung oder universelle Exklusivität
(„kein anderes Tool kann das").

Aufgenommen wurde ein Werkzeug nur, wenn es alle vier Bedingungen erfüllte:

1. erreichbar und in einer eindeutig benennbaren Stufe verfügbar,
2. mit Ruhestands-, Vorsorge- oder Entnahmezweck,
3. mit eigenständigem Nutzen innerhalb seines Segments,
4. mit prüfbaren offiziellen Quellen.

Nicht in die Kernstichprobe kamen: reine Portfolioanalyse, doppelte Stufen
desselben Produkts, nicht erreichbare Produkte und Werkzeuge, für die es nur
Sekundärquellen gab. Sie bleiben Kontext.

### D.4.2 Untersuchte Stichprobe

Die Tabelle legt Segment und untersuchte Stufe fest. **Die Aufnahme in die
Tabelle belegt für sich genommen keine einzige Funktion.**

| ID | Segment | Produkt und untersuchte Stufe | Auswahlgrund | Offizieller Einstieg, geprüft am 2026-07-15 |
| --- | --- | --- | --- | --- |
| RS-01 | Referenzprodukt | Ruhestand-Suite, lokale Arbeitskopie | Gegenstand des Vergleichs; deutschsprachiger DIY- und Jahresworkflow | lokale Source of Truth dieses Repositorys |
| CP-01 | Consumer Planner | ProjectionLab Premium | international ausgerichteter DIY-Planer; eine bezahlte Endkundenstufe verhindert den Vergleich einer Vollsuite mit einem absichtlich reduzierten Gratiszugang | [Pricing & Subscriptions](https://projectionlab.com/pricing) |
| CP-02 | Consumer Planner | Boldin PlannerPlus | ruhestandsspezifischer US-Endkundenplaner mit klar benannter bezahlter Stufe | [Boldin Pricing](https://www.boldin.com/retirement/pricing/) |
| DE-01 | Deutsches Werkzeug | BVI Entnahme-Rechner, öffentlicher Webzugang | institutioneller deutscher Basisfall für einen Fonds-Auszahlplan | [BVI-Rechner](https://www.bvi.de/service/rechner/) |
| DE-02 | Deutsches Werkzeug | Finanzfluss Entnahmeplan, öffentlicher Webzugang | verbreiteter deutschsprachiger Endkundenrechner als niedrige Komplexitätsstufe | [Entnahmeplan-Rechner](https://www.finanzfluss.de/rechner/entnahmeplan/) |
| DE-03 | Deutsches Werkzeug | Digitale Rentenübersicht, öffentlicher Portalzweck | Referenz für deutsche Vorsorgeanspruchs-Aggregation; ausdrücklich kein Vollplaner | [Digitale Rentenübersicht](https://www.rentenuebersicht.de/DE/01_startseite/home_node.html) |
| AD-01 | Beratersoftware | MoneyGuide, Produktstufe „MoneyGuide" | zielbasierte Beraterplanung und Berater-Kunden-Workflow als eigener Markt | [MoneyGuide](https://www.moneyguidepro.com/) |
| AD-02 | Beratersoftware | eMoney Pro | cashflow-orientierte Beraterplanung als methodischer Gegenpol zur zielbasierten Plattform | [eMoney Pro](https://emoneyadvisor.com/products/emoney-pro/) |
| FIRE-01 | FIRE-Werkzeug | FI Calc, öffentlicher Webzugang | fokussiertes Entnahmewerkzeug mit öffentlich strukturierter Methodikdokumentation | [FI Calc Guide](https://guide.ficalc.app/) |
| FIRE-02 | FIRE-Werkzeug | FIRECalc 3.0, öffentlicher Webzugang | etablierter historischer Sequenzrechner als zweite FIRE-Methodik | [FIRECalc](https://firecalc.com/) |
| OT-01 | Offline-/Tabellenlösung | Pralana Gold | explizit herunterladbare Excel-Produktstufe und damit eigenständiger Offline-/Tabellenfall | [Pralana](https://pralanaretirementcalculator.com/) |

Die zehn externen Werkzeuge verteilen sich auf zwei Consumer Planner, drei
deutsche Werkzeuge, zwei Beraterprodukte, zwei FIRE-Werkzeuge und eine
Offline-/Tabellenlösung.

### D.4.3 Austausch- und Abbruchregeln

**In einem Satz:** Die Stichprobe darf nur nach festen Regeln verändert werden,
damit sie nicht unbemerkt in eine andere Vergleichsbasis kippt.

- Ersatz nur innerhalb desselben Segments und nur mit dokumentiertem Grund.
- Produktwechsel und Stufenwechsel werden nicht miteinander vermischt.
- Ein geschlossener Zugang erzeugt einen **neutralen** Dokumentationsbefund,
  keinen negativen.
- Mehr als zwei Ersetzungen oder der Wegfall eines ganzen Segments erzwingen
  eine neue Stichprobenentscheidung.

## D.5 Statuslexikon und Evidenzregeln

### D.5.1 Zellstatus

**In einem Satz:** Jede Zelle der Kriterienmatrix trägt genau einen von sechs
Status – und jeder hat eine verbindliche, enge Bedeutung.

| Status | Verbindliche Bedeutung | Kurz gesagt |
| --- | --- | --- |
| **vorhanden** | offizielle Quelle oder Direktbefund bestätigt den gesamten Kriterienkern nativ | vollständig belegt |
| **teilweise** | Kernanteil vorhanden, aber Umfang, Region, Person, Zeit, Export oder Referenzfall ist eingeschränkt; beide Seiten werden benannt | teils belegt, teils begrenzt |
| **nicht öffentlich dokumentiert** | offizieller Suchpfad ohne belastbare Aussage | wir wissen es nicht |
| **nicht vorhanden** | ausdrückliche Negativaussage oder reproduzierter Direktbefund | belegt nicht vorhanden |
| **nicht anwendbar** | außerhalb von Produktzweck oder Zugriffsebene | Frage passt nicht |
| **nicht geprüft** | offen, blockiert oder nur über nicht freigegebenen Zugang prüfbar; Grund ist Pflicht | nicht untersucht |

Zwei Regeln verhindern, dass diese Status zu einer Wertung werden:

- `nicht öffentlich dokumentiert` ist **niemals** ein Abwesenheitsbeleg.
- `nicht vorhanden` wird **nie** aus Schweigen abgeleitet, sondern nur aus einer
  ausdrücklichen Negativaussage oder einem reproduzierten Direktbefund.
- `nicht anwendbar` ist **keine** negative Wertung.

Besteht ein Kriterium aus mehreren Teilfragen, gilt die **konservativste**
verpflichtende Teilfrage: `vorhanden` verlangt vollständige Kernabdeckung;
gemischte Abdeckung ergibt `teilweise`.

Die Evidenzklassen P1 bis P4, S1 und I1 – also die Frage, *wie gut* eine Quelle
ist – sowie ihre Grenzen sind im
[Evidenzregister](MARKTVERGLEICH_EVIDENZREGISTER.md#evidenzklassen-und-pflichtfelder)
definiert. Werbeaussagen bleiben Anbieteraussagen. Widersprüche werden über
Stufe, Datum und Kontext geklärt – oder sie bleiben offen stehen.

## D.6 Einheitlicher Kriterienkatalog

**In einem Satz:** Alle elf Produktstufen wurden mit denselben 18 Kriterien
geprüft.

| ID | Prüffeld | ID | Prüffeld |
| --- | --- | --- | --- |
| K-01 | Fachmodell und Zeitlogik | K-10 | Optimierung und Suchgrenzen |
| K-02 | Steuerregion und -tiefe | K-11 | Datenschutz und Speicherung |
| K-03 | Renten je Person | K-12 | Offline-Fähigkeit und Netzreste |
| K-04 | Pflege, Eintritt und Reserve | K-13 | Export, Backup und Reimport |
| K-05 | Haushalt, Eigentum, Tod | K-14 | Auditierbarkeit und Reproduktion |
| K-06 | Datenbasis, Zeitraum, Quelle | K-15 | UX und Fehlerbehandlung |
| K-07 | Stochastik, Seed, Stress | K-16 | Barrierefreiheit und WCAG-Nachweis |
| K-08 | Formeln, Defaults, Grenzen | K-17 | Stufe, Währung und Preisperiode |
| K-09 | Szenarien und Vergleich | K-18 | Lizenz- und Weitergaberechte |

Drei Anwendungsregeln dazu:

- Schmalere Werkzeuge erhalten bei sachfremden Fragen `nicht anwendbar` – nicht
  automatisch einen negativen Befund.
- Preise bleiben in Originalwährung und -periode; es wird nicht umgerechnet.
- UX (K-15) und Barrierefreiheit (K-16) werden nur dort bewertet, wo die
  Oberfläche zugänglich war. Marketing-Screenshots ersetzen keinen Bedienbefund.

## D.7 Synthetischer Referenzhaushalt

### D.7.1 Zweck und Einheiten

**In einem Satz:** Ein vollständig erfundener Beispielhaushalt prüft, ob sich ein
Sachverhalt **abbilden** lässt – nicht, ob am Ende dieselbe Zahl herauskommt.

Die Eckdaten des Testrahmens:

- **Stichtag und Kaufkraftbasis:** 2027-01-01
- **Horizont:** bis 2066-12-31
- **Vergleichsverbot:** Ohne harmonisierte Daten, Ereignisreihenfolge,
  Inflation, Steuer und Erfolgsdefinition werden **keine Erfolgsquoten**
  verglichen.
- **Rechtlicher Charakter:** Die Steuersätze sind feste Testparameter, keine
  Rechts- oder Steuerberatung.

### D.7.2 Basisfall RH-01

Ein deutscher Paarhaushalt, 40 Jahre verheiratet, mit gemischtem Vermögen und
gestaffeltem Renteneintritt:

| Gruppe | Festgelegter synthetischer Input |
| --- | --- |
| Personen | A: 63, Ruhestand 2027; B: 61, Ruhestand 2029; deutscher Paarhaushalt, 40 Jahre, im Basisfall kein vorgegebener Tod |
| Netto-Cashflows | B: 30.000 EUR Erwerbseinkommen 2027/2028; gesetzliche Rente A 22.800 EUR ab 2029 und B 17.400 EUR ab 2033, je 2 % indexiert; private Rente A 4.800 EUR ab 2032 nominal konstant |
| Bedarf | Floor 42.000 EUR real und Flex 12.000 EUR real, je 2 % Inflation; Gebäudemaßnahme 35.000 EUR real im Jahr 2035 |
| Vermögen | Aktien-ETF 550.000/350.000 EUR Marktwert/Kostenbasis; Anleihen 120.000 EUR; Liquidität 60.000 EUR; Gold 40.000/30.000 EUR; gesperrte Pflegevorsorge 80.000 EUR; nicht entnahmefreigegebene Immobilie 450.000 EUR |
| Rendite/Kosten | nominal Aktien 5,0 %, Anleihen 2,5 %, Liquidität/Pflegevorsorge 1,5 %, Gold 2,0 %; Kosten 0,25 % p.a. auf investiertes Finanzvermögen |
| Steuer/Priorität | 25 % Kapitalertragsteuer, 5,5 % Zuschlag darauf, keine Kirchensteuer, 30 % ETF-Teilfreistellung, 2.000 EUR gemeinsamer Freibetrag; Einkommen deckt Floor und Flex, Portfolio die Lücke, Pflegevorsorge bleibt bis RH-03 gesperrt |

Wenn ein Produkt Brutto- und Nettoflüsse nicht sauber trennen kann oder eine
Assetklasse fehlt, wird das **als Vereinfachung dokumentiert**. Es wird nicht
durch passend erscheinende Ersatzwerte oder eine stille Umschichtung überdeckt.

### D.7.3 Feste Modellierbarkeitsproben

Drei Varianten desselben Haushalts testen jeweils eine typische Härtefrage:

| ID | Änderung gegenüber RH-01 | Prüffrage |
| --- | --- | --- |
| RH-02 Sequenzstress | Aktienrendite 2027: -25 %, 2028: -10 %; Inflation 2027: 6 %, 2028: 4 %; danach Rückkehr zu den Kontrollannahmen | Lassen sich zeitlich bestimmte Markt-/Inflationsschocks und die Entnahmewirkung transparent abbilden? |
| RH-03 Pflege | Person B erhält ab 2044-01-01 Pflegegrad 3; zusätzlicher Bedarf 24.000 EUR real p.a., 2 % indexiert; zweckgebundene Reserve wird zuerst genutzt | Sind Personenbezug, Pflegeereignis, Kostendynamik und Reservefreigabe nativ oder nur als allgemeine Ausgabe modellierbar? |
| RH-04 Hinterbliebene | Person A stirbt am 2048-12-31; eigene Renten A enden; ab 2049 erhält B 55 % der gesetzlichen Rente A; gemeinsamer Floor sinkt um 20 %, Flex um 30 % | Werden Tod, verzögerter Hinterbliebenenzufluss und veränderte Haushaltsausgaben konsistent verarbeitet? |

Je Input und Probe wird einer von vier Befunden notiert:

| Kürzel | Befund | Bedeutung |
| --- | --- | --- |
| **N** | nativ | Das Produkt kann den Sachverhalt direkt und ohne fachliche Umdeutung abbilden. |
| **W** | mit dokumentiertem Workaround | Abbildbar, aber nur über einen Umweg, der offengelegt wird. |
| **G** | nur als grobe Näherung | Abbildbar nur vergröbert; die fachliche Bedeutung geht teilweise verloren. |
| **O** | nicht modellierbar / nicht prüfbar | Nicht abbildbar oder mangels Zugang nicht überprüfbar. |

Ein Workaround darf die fachliche Bedeutung nicht verdecken – ein allgemeines
Ausgabenfeld ist kein Pflegegradmodell. Ergebniszahlen werden nur dann
nebeneinandergestellt, wenn Einheit, Zeitpunkt, Rendite-/Inflationspfad,
Steuerbehandlung, Kosten und Erfolgsdefinition **tatsächlich** harmonisiert
sind.

## D.8 Quellen- und Erhebungsprotokoll

**In einem Satz:** Für jedes Produkt wurde derselbe offizielle Suchpfad in
derselben Reihenfolge abgearbeitet und protokolliert.

Die Reihenfolge des Suchpfads:

1. Produkt-, Stufen- und Preisseite
2. Handbuch und Methodikdokumentation
3. Datenschutz, Export, Offline, Lizenz, Barrierefreiheit
4. die zugängliche Oberfläche selbst
5. **erst danach** Sekundärquellen, und nur für subjektive UX-Fragen

Suchmaschinen-Snippets dienen ausschließlich als Wegweiser, nie als Beleg. Ein
erfolgloser offizieller Suchweg wird als neutraler `99`-Record protokolliert –
damit ist nachvollziehbar, *wo* gesucht wurde.

Jeder Beleg hat die stabile Form `MKT-<PRODUKT>-<NN>` und führt Stufe,
Betreiber, Ziel, Klasse, Veröffentlichungs-/Abrufstand, Region, Kriterium,
Paraphrase, Fundstelle und Grenze. Der vollständige Feldvertrag und alle Records
stehen im
[Evidenzregister](MARKTVERGLEICH_EVIDENZREGISTER.md#evidenzklassen-und-pflichtfelder).
Lange Kopien geschützter Quellentexte sind ausgeschlossen.

## D.9 Auswertung und zulässige Aussagen

**In einem Satz:** Die Ergebnisdarstellung folgt einer festen Reihenfolge, und
Differenzierungsaussagen sind streng begrenzt.

Reihenfolge des Ergebnisblocks:

1. Methoden- und Quellenstand
2. Ergebnisse je Segment
3. Modellierbarkeit RH-01 bis RH-04
4. segmentübergreifende Stärken und Grenzen
5. Positionierung und Nicht-Zielsegmente der Ruhestand-Suite
6. Evidenzlücken und Aktualisierungsbedarf

Für die Formulierung gelten drei Pflichten und eine Obergrenze:

- **Pflicht:** Konkurrenzstärken werden genauso dokumentiert wie eigene Stärken.
- **Obergrenze für Differenzierung:** Eine Aussage darf höchstens lauten, dass
  etwas *in der untersuchten Stichprobe, Produktstufe und öffentlichen
  Dokumentation am Stichtag* nicht gleichartig belegt wurde.
- **Verbot:** `nicht öffentlich dokumentiert` darf nie zu „kein anderes Tool kann
  das" verkürzt werden.
- **Verbot:** Implementierungsdetails der Ruhestand-Suite belegen keine bessere
  Prognosegüte und keine besseren realen Ruhestandsentscheidungen.

## D.10 Festgelegte Methodenbasis

**In einem Satz:** Ab hier ist die Methode eingefroren; D.11 bis D.18 wenden sie
unverändert an.

Die abgeschlossene Methodenbasis umfasst:

- die zehn externen Produkte und ihre jeweils festgelegten Stufen;
- die fünf Segmentgrenzen;
- den Kriterienkatalog K-01 bis K-18 samt Statuslexikon;
- Referenzhaushalt RH-01 und die drei festen Proben RH-02 bis RH-04;
- Recherchefenster, Quellenrecord-Vertrag und den Verzicht auf Gesamtscore und
  Rangliste.

---

## D.11 Erhebungsstand, Zugang, Preis und Lizenz

**In einem Satz:** Alle Preise stammen vom 2026-07-15, aus öffentlichen Seiten –
ohne Konten, Testphasen, Käufe oder Beraterzugänge.

Ausdrücklich **nicht** genutzt wurden: Kontoanlage, Testphasen, Käufe,
Demoanforderungen und nicht öffentliche Beraterzugänge. Preise stehen in
Originalwährung und -periode; Steuern, Wechselkurse und nicht ausgewiesene
Gesamtkosten wurden nicht ergänzt.

| Untersuchte Stufe | Region/Zugang | Preisstand 2026-07-15 | Tragender Record |
| --- | --- | --- | --- |
| Ruhestand-Suite, lokale Arbeitskopie | DE/lokal | kein kommerzieller Tarif untersucht | [MKT-RS-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-01) |
| ProjectionLab Premium | international/Web | 129 USD pro Jahr | [MKT-PL-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-pl-01) |
| Boldin PlannerPlus | USA/Web | 12 USD monatlich, 144 USD jährlich abgerechnet | [MKT-BD-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-bd-01) |
| BVI Entnahme-Rechner | DE/öffentlich | kein gesonderter Tarif dokumentiert | [MKT-BVI-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-bvi-01) |
| Finanzfluss Entnahmeplan | DE/öffentlich | kein gesonderter Tarif dokumentiert | [MKT-FF-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-ff-01) |
| Digitale Rentenübersicht | DE/eID-Portal | freiwillig und kostenfrei | [MKT-DR-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-dr-01) |
| MoneyGuide | USA/Berater | 2.000 USD pro Berater und Jahr | [MKT-MG-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-mg-01) |
| eMoney Pro | USA/Berater | nicht öffentlich dokumentiert | [MKT-EM-99](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-em-99) |
| FI Calc | USA/öffentlich | kostenlos, freiwillige Unterstützung | [MKT-FI-05](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-fi-05) |
| FIRECalc 3.0 | USA/öffentlich | Unterstützerfunktionen; Betrag offen | [MKT-FC-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-fc-01) |
| Pralana Gold 2026 | USA/Excel-Download | 99 USD einmalig für Version 2026 | [MKT-PR-02](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-pr-02) |

**Lizenzstand der Suite:** `LICENSE.md`, npm-Manifest, Root-Lockfile-Eintrag und
Cargo-Manifest nennen seit Slice 5 einheitlich MIT. Die frühere Lücke
GAP-MKT-06 ist damit geschlossen und durch einen automatisierten
Metadaten-Contract abgesichert. Abhängigkeiten behalten ihre eigenen
Lizenzangaben; der Contract prüft ausschließlich die Projektmetadaten.

## D.12 Quellenrecords der Erhebung

**In einem Satz:** Die 69 Einzelbelege stehen vollständig im separaten
Evidenzregister, nicht in diesem Dokument.

Das normative
[Marktvergleich-Evidenzregister](MARKTVERGLEICH_EVIDENZREGISTER.md) führt je
Record Produktstufe, Region, Evidenzklasse, Veröffentlichungs- beziehungsweise
Änderungsstand, Quellenziel, Belegparaphrase und Grenze. Jeder Record besitzt
dort einen stabilen Anker, sodass jede Aussage dieses Dokuments direkt
verlinkbar ist.

Für externe Records gilt einheitlich das Abrufdatum 2026-07-15 in
Europe/Berlin. Records mit der Endung `99` sind neutrale Suchprotokolle und
niemals Abwesenheitsbelege.

## D.13 Kriterienprofil K-01 bis K-18

**In einem Satz:** Die verdichtete Ergebnisübersicht – je Segment eine belegte
Stärke und eine wesentliche Grenze, ohne Rangliste und ohne Gewichtung.

Die
[vollständige Kriterienmatrix](MARKTVERGLEICH_EVIDENZREGISTER.md#kriterienmatrix-k-01-bis-k-18)
steht beim Quellenregister. Sie verwendet ausschließlich das Statuslexikon aus
[D.5](#d51-zellstatus). Zur Erinnerung: `teilweise` ist **kein** Punktabzug, und
`nicht öffentlich dokumentiert` ist **keine** Funktionsverneinung.

| Segment | Belegte Stärke im untersuchten Zweck | Wesentliche Grenze |
| --- | --- | --- |
| Ruhestand-Suite | deutsche Kapitalertragsteuer auf Lot-/Eigentümerebene, Paar-/Pflegepfade, mehrere Simulationsarten, lokale Daten und Diagnose ([MKT-RS-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-01), [MKT-RS-02](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-02), [MKT-RS-03](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-03)) | keine vollständige Einkommensteuer, keine freie Ereignisliste, keine externe Wirksamkeits- oder formale WCAG-Prüfung ([MKT-RS-99](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-99)) |
| Consumer Planner | ProjectionLab und Boldin dokumentieren planzentrierte Varianten, Szenarien und Ergebnisdarstellung ([MKT-PL-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-pl-01), [MKT-PL-03](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-pl-03), [MKT-BD-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-bd-01), [MKT-BD-05](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-bd-05)) | deutsche Steuer-, Pflegegrad- und Hinterbliebenendetails sind nicht vollständig nativ belegt ([MKT-PL-04](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-pl-04), [MKT-BD-02](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-bd-02), [MKT-BD-06](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-bd-06)) |
| Deutsche Werkzeuge | BVI und Finanzfluss fokussieren Kapitalentnahme; die Digitale Rentenübersicht aggregiert autoritative Vorsorgeansprüche ([MKT-BVI-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-bvi-01), [MKT-FF-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-ff-01), [MKT-DR-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-dr-01)) | die schmalen Produktzwecke sind keine Gesamtplanung; fehlende öffentliche Angaben bleiben neutrale Lücken |
| Beratersoftware | MoneyGuide und eMoney stützen kollaborative, breite Beraterplanung ([MKT-MG-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-mg-01), [MKT-EM-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-em-01)) | US-Rechtsraum und nicht freigegebene Beraterzugänge begrenzen die stufenscharfe öffentliche Prüfung ([MKT-EM-99](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-em-99)) |
| FIRE/Offline | FI Calc und FIRECalc dokumentieren historische Entnahmeverfahren; Pralana verbindet lokale Tabellenplanung mit Szenarien und Optimierung ([MKT-FI-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-fi-01), [MKT-FC-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-fc-01), [MKT-PR-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-pr-01), [MKT-PR-04](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-pr-04)) | überwiegend US-Daten/-Steuern, enger Haushaltsumfang oder ohne Kauf ungeprüfte Workbook-UX |

## D.14 Segmentbefunde: Stärken und Grenzen

**In einem Satz:** Jedes Segment ist in seinem eigenen Zweck stark – und diese
Stärken dürfen nicht als Mängel gelesen werden, nur weil sie außerhalb des
Suite-Schwerpunkts liegen.

Wo die anderen Segmente stark sind:

| Segment | Belegte Stärke |
| --- | --- |
| Consumer Planner | Planvarianten und Szenariovergleich |
| Beratersoftware | Kollaboration und Datenaggregation |
| Deutsche Einzelwerkzeuge | fokussierte Entnahme bzw. autoritative Vorsorgeanspruchs-Aggregation |
| FIRE- und Tabellenwerkzeuge | transparente historische Methodik bzw. lokale Modellbreite |

Wo die Ruhestand-Suite bündelt: deutsche Kapitalertragsteuer auf
Lot-/Eigentümerebene, Paar-, Witwen- und Pflegepfade, mehrere Simulationsarten
und ein lokaler Jahresworkflow.

Wo die Ruhestand-Suite an ihre Grenzen stößt: persönliche Einkommensteuer, frei
definierbare Ereignisfolgen, planzentrierter Szenariovergleich, autoritative
Datenaggregation sowie formale UX-/WCAG- und externe Wirksamkeitsnachweise.

Die Belege und stufenscharfen Einschränkungen stehen in
[D.13](#d13-kriterienprofil-k-01-bis-k-18) und im Evidenzregister; die
Positionierungsfolgen in [D.16](#d16-positionierung-der-ruhestand-suite).

## D.15 Modellierbarkeit des Referenzhaushalts

**In einem Satz:** Kein Produkt bildet den deutschen Referenzhaushalt in allen
vier Proben nativ ab.

Bewertungsregel: Der **konservativste wesentliche Input** bestimmt den
Gesamtbefund einer Zeile. `Nativ` verlangt die Probe ohne fachliche Umdeutung –
ein allgemeines Ausgabenfeld ist kein natives Pflegegradmodell. Die Kürzel
N/W/G/O sind in [D.7.3](#d73-feste-modellierbarkeitsproben) erklärt.

| Produktstufe | RH-01 | RH-02 | RH-03 | RH-04 | Entscheidende Grenze |
| --- | --- | --- | --- | --- | --- |
| Ruhestand-Suite | G | G | G | W | freie Ereignis-/Schockfolge und fixer Pflegeeintritt fehlen ([MKT-RS-99](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-99)) |
| ProjectionLab Premium | W | N | W | W | deutsche Steuer- und Pflegefachlichkeit nur angenähert ([MKT-PL-03](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-pl-03), [MKT-PL-04](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-pl-04)) |
| Boldin PlannerPlus | G | G | W | W | US-Steuer-, LTC- und Survivor-Vertrag ([MKT-BD-02](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-bd-02)) |
| BVI Entnahme-Rechner | G | O | O | O | fokussierter Kapitalentnahmezweck ([MKT-BVI-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-bvi-01)) |
| Finanzfluss Entnahmeplan | G | O | O | O | deterministischer Einzelrechner ([MKT-FF-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-ff-01)) |
| Digitale Rentenübersicht | G | O | O | O | Vorsorgeinput statt Gesamtplanung ([MKT-DR-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-dr-01)) |
| MoneyGuide | W | W | W | W | breite US-Beratermodellierung ([MKT-MG-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-mg-01)) |
| eMoney Pro | W | O | O | O | Proben ohne Beraterzugang nicht stufenscharf belegt ([MKT-EM-99](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-em-99)) |
| FI Calc | G | G | W | W | US-Historie, keine Steuer-/Personenlogik ([MKT-FI-05](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-fi-05)) |
| FIRECalc 3.0 | G | G | W | W | keine deutsche Steuer-/Pflege- oder freie Schockfolge ([MKT-FC-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-fc-01)) |
| Pralana Gold 2026 | W | W | W | W | US-Mapping; gekaufte Mappe nicht ausgeführt ([MKT-PR-99](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-pr-99)) |

Zwei Lesehinweise zu dieser Tabelle:

- Der einzige native Befund im gesamten Raster ist ProjectionLabs RH-02
  (Sequenzstress). Das ist **keine** Gesamtwertung dieses Produkts.
- Es werden **keine** Ergebnisbeträge und keine Erfolgsquoten verglichen, weil
  Datenregion, Inflation, Steuern, Reihenfolge, Kosten, Mortalität und
  Erfolgsdefinition nicht harmonisiert sind.

## D.16 Positionierung der Ruhestand-Suite

### D.16.1 Zielgruppe und Nutzenversprechen

**In einem Satz:** Die Suite ist eine lokal betriebene, deutschsprachige
DIY-Umgebung für Menschen, die ihre Annahmen selbst pflegen wollen.

Zielgruppe sind Einzelpersonen und Paarhaushalte, die Annahmen selbst pflegen
und Ergebnisse fachlich hinterfragen. Der Kernnutzen ist die Verbindung aus:

- deutscher kapitalertragsteuerlicher Entnahmelogik auf Lot-/Eigentümerebene;
- Floor-/Flex-, Liquiditäts-, Guardrail- und Jahresabschlussworkflow;
- Paar-, Witwen-, Pflegegrad- und zweckgebundener Pflegevorsorgelogik;
- historischen, stochastischen, Stress-, Sensitivitäts- und Optimierungspfaden;
- lokaler Datenhaltung, Recovery, Export und Diagnose.

> **Abgrenzung:** Das Produkt ist Planungs- und Lernsoftware – keine Anlage-,
> Steuer-, Versicherungs- oder Pflegeberatung. Modellinterne Erfolgsquoten sind
> keine Garantie.

### D.16.2 Begrenzt zulässige Differenzierung

**In einem Satz:** Die einzige zulässige Differenzierungsaussage ist eng an
Stichprobe, Stufe und Stichtag gebunden.

Zulässig ist genau diese Formulierung: *Innerhalb der zehn ausgewählten Stufen
und der öffentlichen Quellen vom 2026-07-15 wurde keine zweite Stufe belegt, die
deutsche Lot-/Kapitalertragsteuer, Pflegegrad mit gesperrter Reserve,
Paar-/Witwenpfad, mehrere Simulationsmethoden, Auto-Optimierung und lokalen
Jahresworkflow kombiniert* ([MKT-RS-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-01),
[MKT-RS-02](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-02)).

Was daraus **nicht** folgt:

- keine universelle Exklusivitätsaussage – geschlossene Stufen bleiben schlicht
  unbekannt;
- keine Aussage über Prognosegüte oder Wirksamkeit;
- kein Alleinstellungsmerkmal „lokal": Pralana ist ebenfalls lokal, und FI Calc
  hält Eingaben gerätelokal.

Andere Produkte sind bei Planvarianten, Kollaboration, Datenaggregation,
Einfachheit oder Methodenführung breiter aufgestellt.

### D.16.3 Wettbewerberstärken, die nicht relativiert werden dürfen

**In einem Satz:** Diese sechs Stärken werden unverkürzt anerkannt.

| Produkt | Anerkannte Stärke |
| --- | --- |
| ProjectionLab, Boldin | planzentrierte Varianten |
| MoneyGuide, eMoney | Berater-Kunden-Kollaboration |
| Digitale Rentenübersicht | autoritative Vorsorgeansprüche |
| BVI, Finanzfluss | fokussierte Einfachheit |
| FI Calc | öffentliche Methodenführung |
| Pralana | breite lokale Tabellenplanung |

[D.13](#d13-kriterienprofil-k-01-bis-k-18) verbindet jeden dieser Befunde mit
seinem Quellenrecord.

### D.16.4 Eigene Grenzen und strategische Lücken

**In einem Satz:** Acht belegte Lücken der Suite – jede mit ihrer Konsequenz für
die zulässige Außendarstellung.

| ID | Lücke | Evidenz | Positionierungsfolge |
| --- | --- | --- | --- |
| GAP-MKT-01 | keine vollständige persönliche Einkommensteuer-/Sozialabgabenrechnung | K-02, [MKT-RS-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-01), [MKT-RS-02](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-02) | Netto-Cashflows und Kapitalertragsteuer klar trennen; keine „vollständige deutsche Steuerplanung" bewerben |
| GAP-MKT-02 | keine frei definierbare, versionierte Ereignis- und Jahrespfadliste für Einmalbeträge, Rendite und Inflation | RH-01/RH-02, [MKT-RS-99](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-99) | feste Referenzschocks nur als Näherung ausweisen; ProjectionLab hat hier einen belegten Vorteil |
| GAP-MKT-03 | fixer Pflegeeintritt/Grad/Person nicht als deterministische Probe konfigurierbar | RH-03, [MKT-RS-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-01), [MKT-RS-99](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-99) | stochastische Pflegeanalyse nicht als exakter Pflegeplan darstellen |
| GAP-MKT-04 | allgemeines Speichern, Kopieren und Side-by-side-Vergleichen vollständiger Pläne fehlt | K-09, [MKT-RS-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-01), [MKT-RS-99](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-99) | Sweep/Backtest nicht mit vollwertigem Szenariomanagement gleichsetzen |
| GAP-MKT-05 | keine formale Usability-, Screenreader- oder WCAG-Prüfung | K-15/K-16, [MKT-RS-99](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-99) | Barrierefreiheit nur auf Ebene einzelner Hilfen beschreiben |
| GAP-MKT-06 | geschlossen am 2026-07-17: Projektlizenz in Lizenztext, npm- und Cargo-Metadaten einheitlich MIT | K-18, [MKT-RS-04](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-04), [MKT-RS-05](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-05) | Regressionstest trennt Root-Projektmetadaten von eigenen Lizenzangaben der Abhängigkeiten |
| GAP-MKT-07 | keine autoritative Rentenanspruchs- oder Kontenaggregation | [MKT-DR-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-dr-01), [MKT-EM-02](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-em-02) | manuelle Eingaben als Nutzerverantwortung kennzeichnen; Import wäre eine separate Produktentscheidung |
| GAP-MKT-08 | keine externe Prognose-, Kalibrierungs- oder Entscheidungsvalidierung | D.1, [MKT-RS-01](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-01), [MKT-RS-02](MARKTVERGLEICH_EVIDENZREGISTER.md#mkt-rs-02) | Implementierung, Tests und Transparenz nicht als Wirksamkeitsbeleg formulieren |

### D.16.5 Nicht-Zielsegmente

**In einem Satz:** Was die Suite bewusst **nicht** sein will.

Nicht-Ziele sind:

- B2B-Berater- und staatliche Aggregationsplattformen,
- internationale Gesamtsteuer- und Estateplanung,
- automatische Kontoaggregation und Depotvollmacht,
- aktuarielle Pflege- oder medizinische Prognose,
- ein detailfreier Ein-Feld-Rechner,
- jede Form von Erfolgsgarantie.

Eine Expansion in eines dieser Felder wäre ein eigener Produktauftrag mit
eigenen Daten-, Sicherheits-, Rechts- und UX-Verträgen.

## D.17 Evidenzlücken und Aktualisierungsroutine

### D.17.1 Offene Evidenzlücken

**In einem Satz:** Was am Stichtag offen blieb – und warum das neutral zu lesen
ist.

| Bereich | Offene Lücke |
| --- | --- |
| Ruhestand-Suite | externe Validierung, formale UX-/WCAG-Prüfung |
| Web- und Beraterprodukte | geschlossene Bedienpfade, Accessibility, Offline-, Export-, Preis-, Lizenz- und Methodendetails |
| FI Calc, FIRECalc | freier Zugang bedeutet nicht Open Source – der Quellcodestatus ist damit nicht belegt |
| Pralana | Workbook wurde nicht gekauft und nicht ausgeführt |

Die stufenscharfen Lücken und ihre Konsequenzen stehen in den `99`-Records und
in der vollständigen Kriterienmatrix. **Schweigen bleibt stets neutral.**

### D.17.2 Pflege des Vergleichs

**In einem Satz:** Der eingefrorene Befund wird nie still überschrieben, sondern
durch datierte Ergänzungen fortgeschrieben.

Grundregel: Der Stichtagsbefund bleibt als historische Version erhalten. Eine
Aktualisierung ergänzt Datum, geänderte Quelle und die Auswirkung auf Matrix
beziehungsweise Positionierung.

**Turnusprüfung:** spätestens 2026-10-15. Zusätzlich vor jeder öffentlichen
Markt- oder Differenzierungsaussage und vor Releases mit Marktbezug.

**Sofortprüfung** wird ausgelöst durch Änderungen an Tarif, Stufe, Dienst,
Lizenz, Offline-Fähigkeit oder durch wesentliche Änderungen der Suite selbst.
Die Prüfreihenfolge ist dabei fest:

1. Identität und Stufe
2. Preis
3. Terms
4. Methode
5. Datenschutz
6. Export
7. Offline
8. Accessibility

Für die Nachbereitung gilt:

- Betroffene Records erhalten Abrufdatum und Änderungsnotiz.
- Verlorene Quellen werden als *historisch* oder *nicht erneut verifiziert*
  markiert – nicht gelöscht und nicht als Funktionsfehlen gewertet.
- Jede Statusänderung braucht einen Beleg.
- Änderungen an Ereignis-, Steuer-, Pflege-, Haushalts- oder Szenariofunktionen
  erzwingen eine neue RH- und Differenzierungsprüfung.

## D.18 Ergebnisstand des Marktvergleichs

**In einem Satz:** Was dieser Vergleich abschließend dokumentiert – und wie weit
seine Aussagen reichen.

Dokumentiert sind:

- Erhebungsstichtag, Produktstufen, Preis-/Lizenzstand und Quellenrecords;
- die im Evidenzregister geführten K-01-bis-K-18-Matrizen, ohne Score und ohne
  Rangliste;
- die Modellierbarkeitskarte RH-01 bis RH-04;
- Konkurrenzstärken, eigene Grenzen, strategische Lücken, Ziel- und
  Nicht-Zielsegmente sowie die Aktualisierungsroutine;
- die Aussagegrenze, dass Differenzierung nur für Stichprobe, Stufe, öffentliche
  Evidenz und Stichtag gilt.

> **Reichweite:** Alle Aussagen bleiben auf den Erhebungsstichtag, die
> untersuchten Stufen und die öffentlich zugängliche Evidenz begrenzt.
> [D.17](#d17-evidenzlücken-und-aktualisierungsroutine) beschreibt die
> erforderliche Aktualisierungsroutine.

---

## Produktquellen im Überblick

*Abruf jeweils 2026-07-15. Die vollständigen stufenscharfen Quellenrecords
einschließlich Evidenzklasse, Fundstelle und Einschränkung stehen im
[Evidenzregister](MARKTVERGLEICH_EVIDENZREGISTER.md); die folgenden Links sind
lediglich die Einstiegspunkte der Stichprobe.*

- [ProjectionLab: Pricing & Subscriptions](https://projectionlab.com/pricing)
- [Boldin: Pricing](https://www.boldin.com/retirement/pricing/)
- [BVI: Rechner](https://www.bvi.de/service/rechner/)
- [Finanzfluss: Entnahmeplan-Rechner](https://www.finanzfluss.de/rechner/entnahmeplan/)
- [Digitale Rentenübersicht](https://www.rentenuebersicht.de/DE/01_startseite/home_node.html)
- [MoneyGuide](https://www.moneyguidepro.com/)
- [eMoney Pro](https://emoneyadvisor.com/products/emoney-pro/)
- [FI Calc Guide](https://guide.ficalc.app/)
- [FIRECalc 3.0](https://firecalc.com/)
- [Pralana Retirement Calculator](https://pralanaretirementcalculator.com/)

---

*Dieses Dokument war bis 2026-08-05 Bereich D des Dokuments
[`ARCHITEKTUR_UND_FACHKONZEPT.md`](ARCHITEKTUR_UND_FACHKONZEPT.md). Bei der
Ausgliederung wurden Struktur, Sprache und Lesbarkeit überarbeitet; die
fachlichen Aussagen, Zahlen, Status und Quellenbezüge blieben unverändert.*
