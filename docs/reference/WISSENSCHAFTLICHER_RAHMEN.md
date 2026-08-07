# Wissenschaftlicher Rahmen der Ruhestand-Suite

<a id="forschungsrahmen"></a>

**Forschungs- und Quellenstand:** 2026-07-15<br>
**Hauptdokument:** [`ARCHITEKTUR_UND_FACHKONZEPT.md`](ARCHITEKTUR_UND_FACHKONZEPT.md#forschungsrahmen)<br>
**Normativer Beleganhang:** [`FORSCHUNGSABGLEICH_EVIDENZREGISTER.md`](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md)<br>
**Offene Nachweise:** [Forschungsvalidierungs-Backlog](../internal/archive/FORSCHUNGSVALIDIERUNGS_BACKLOG.md)

---

## Worum es in diesem Dokument geht

Die Ruhestand-Suite rechnet mit Methoden, die aus der Wissenschaft, aus
amtlichen Statistiken und aus der Praxisliteratur stammen. Dieses Dokument
beantwortet die Frage:

> Welche Quellen stehen hinter den 17 Rechenmechanismen der Suite – und wie weit
> darf man aus diesen Quellen und aus einem grünen Testlauf tatsächlich
> schließen?

Die Antwort ist durchgehend vorsichtig, und zwar aus einem einzigen Grund:

> **Eine Quelle im Korpus beweist nicht, dass die Suite dieselbe Methode
> identisch umsetzt.** Und eine korrekt implementierte, sauber getestete Formel
> beweist nicht, dass sie in der Realität hilft.

Dieses Dokument ist deshalb **keine Wirksamkeitsfreigabe** der Suite. Es ist ein
Vertrag darüber, welche Aussagen erlaubt sind und welche nicht.

---

## Wie Sie dieses Dokument lesen

| Wenn Sie … | dann lesen Sie … |
| --- | --- |
| verstehen wollen, wie belastbar eine einzelne Suite-Funktion ist | die Mechanismustabelle in [E.4](#e4-kompakter-mechanismusabgleich) |
| ein Simulationsergebnis richtig interpretieren wollen | [E.5](#e5-ergebnisinterpretation-jenseits-der-floor-deckungsquote) |
| wissen wollen, welche Fehlinterpretationen drohen | [E.6](#e6-forschungs--und-modellrisiken) |
| wissen wollen, was noch untersucht werden müsste | [E.7](#e7-priorisierte-forschungsfragen) |
| eine Aussage wie „senkt das Risiko" formulieren wollen | zuerst [E.8](#e8-mindeststandard-und-ergebnisstand) |
| die vollständigen Quellendossiers brauchen | das [Forschungs-Evidenzregister](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md) |

Die Abschnittsnummern E.1 bis E.8 sind unverändert aus dem früheren
Hauptdokument übernommen, damit bestehende Querverweise gültig bleiben.

---

## Kürzel auf einen Blick

Der Forschungsrahmen benutzt fünf Kürzelfamilien. Sie beantworten jeweils eine
andere Frage.

| Familie | Beantwortet die Frage | Beispiel |
| --- | --- | --- |
| **MAP-01 bis MAP-17** | Um welchen Suite-Mechanismus geht es? | `MAP-05` = Dynamic Flex / VPW |
| **FOR-…** | Welche konkrete Quelle wird herangezogen? | `FOR-STO-03` = Politis/Romano zum Stationary Bootstrap |
| **Quellenklassen** (W1/W2, I1/I2, P1/WP, B1/C1) | Wie gut ist die Quelle? | `W1` = peer-reviewte Originalarbeit |
| **T1 bis T4** | Was sagt die Quelle über die Suite aus? | `T4` = die Quelle ist ein Gegenbefund |
| **V1 bis V6** | Wie tief ist etwas validiert? | `V3` = Main-Thread und Worker rechnen gleich |
| **FR-…, FQ-…** | Welches Risiko bzw. welche offene Frage? | `FR-06` = Tail-Rate als Crashwahrscheinlichkeit missverstanden |

Zwei weitere Kürzel stammen aus dem Hauptdokument: `MR-…` sind
[Modellrisiken](ARCHITEKTUR_UND_FACHKONZEPT.md#modellrisikoregister), `PD-…` sind
[Produktmängel aus dem Fachabgleich](ARCHITEKTUR_UND_FACHKONZEPT.md#produktmängel-aus-dem-fachabgleich).

### Die Validierungsstufen V1 bis V6 in Kurzform

Diese Stufen sind der Kern jeder Aussage in diesem Dokument. Vollständig
definiert sind sie im
[Hauptdokument](ARCHITEKTUR_UND_FACHKONZEPT.md#validierungsstufen):

| Stufe | Was sie prüft | Kann die Suite das lokal belegen? |
| --- | --- | --- |
| **V1 Contract** | Sind Eingaben, Einheiten und Ergebnis-Shapes konsistent? | ja |
| **V2 Rechenregression** | Bleiben Formeln und bekannte Ergebnisse stabil? | ja |
| **V3 Pfadparität** | Rechnen Main Thread, Worker und Optimizer gleich? | ja |
| **V4 Historische Plausibilität** | Sind Daten und Größenordnungen nachvollziehbar? | je nach Mechanismus offen |
| **V5 Kalibrierung** | Passen die Parameter zu externer Evidenz? | je nach Mechanismus offen |
| **V6 Entscheidungsvalidierung** | Passt das Modell zum konkreten realen Haushalt? | nein, nicht durch Software |

> **Der wichtigste Satz zu diesen Stufen:** Ein grüner Testlauf belegt V1 bis V3.
> Er belegt **nie** V4, V5 oder V6. Und identische Ergebnisse auf Main-Thread und
> Worker können auf allen Pfaden gleich verzerrt sein.

---

## E.1 Erkenntnisziel und Aussagegrenze

**In einem Satz:** Der Rahmen ordnet ein, welche Quellen für 17
Suite-Mechanismen einschlägig sind – und trennt dabei strikt, welche Rolle jede
Quelle spielt.

Getrennt geführt werden:

- der **Methodenursprung** (woher stammt die Idee?),
- der **empirische Befund** (was wurde gemessen?),
- der **Kalibrierungsinput** (welche Zahl kommt woher?),
- der **Gegenbefund** (was spricht dagegen?),
- der **Anwendungskontext** (für welchen Markt, welche Zeit, welchen
  Rechtsraum?).

Die Einordnung gilt für den dokumentierten Code-, Daten- und Quellenstand – nicht
zeitlos für jede Parametrisierung und nicht für jeden Haushalt.

### Vier Dinge, die dieser Rahmen ausdrücklich nicht beweist

| Ein solcher Beleg … | … beweist nicht |
| --- | --- |
| Eine Quelle steht im Korpus | dass die Suite dieselbe Methode identisch umsetzt oder deren Ergebnis reproduziert |
| Eine Formel ist implementiert | dass sie wirkt |
| Ein Test ist grün | dass extern kalibriert wurde |
| Ein historischer oder simulierter Erfolgsanteil liegt vor | dass dieser Anteil in Zukunft eintritt |

Zusätzlich gilt: Zahlen aus anderen Rechts-, Daten- oder Währungsräumen dürfen
nicht ungeprüft auf deutsche Haushalte übertragen werden.

### Wer was besitzt

| Dokument | Normative Ownership |
| --- | --- |
| [Forschungs-Evidenzregister](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md) | 55 FOR-Records, Taxonomie, Versionsstandard, Quellen-Mapping, vollständige MAP-Dossiers |
| **dieses Dokument** | kompakte Einordnung, Ergebnisbündel, FR-01 bis FR-12, FQ-01 bis FQ-10 |
| [Forschungsvalidierungs-Backlog](../internal/archive/FORSCHUNGSVALIDIERUNGS_BACKLOG.md) (intern) | Operationalisierung der offenen FR-/FQ-Nachweise |

Beide Evidenzdokumente müssen bei einer Neubewertung **gemeinsam** gepflegt
werden. Der interne Backlog plant offene Nachweise – er hebt weder deren Status
noch den Evidenzstatus der MAP-Dossiers an.

## E.2 Evidenz-, Übertragbarkeits- und Statusvertrag

**In einem Satz:** Drei getrennte Bewertungsachsen – Herkunft der Quelle,
Übertragbarkeit auf die Suite und Reifegrad der Suite-Umsetzung – dürfen nie
miteinander verwechselt werden.

### Achse 1: Woher stammt die Quelle?

| Code | Quellenart |
| --- | --- |
| W1 / W2 | peer-reviewte Original- bzw. Synthesearbeiten |
| I1 / I2 | amtliche Standards bzw. institutionelle Forschung |
| P1 / WP | Practitioner Research bzw. Working Papers |
| B1 / C1 | Fachbuch- bzw. Community-Kontext |

Ergänzend gibt es eine **Evidenzstufe** A, B oder C: Stufe A darf einen klar
versionierten Methoden-, Theorie- oder Datenanker tragen, Stufe B nur eine
begrenzte Position, Stufe C nur Begriffe oder eine operative Herkunft.

> **Merksatz:** Quellenklasse und Evidenzstufe beschreiben Herkunft und
> Belastbarkeit – **nicht** automatisch die Übertragbarkeit. Keine Stufe allein
> validiert die konkrete Suite-Policy.

### Achse 2: Was sagt die Quelle über die Suite aus?

| Code | Aussage im Mechanismusabgleich |
| --- | --- |
| **T1** | Methodenbaustein und Zielgröße sind direkt prüfbar; verbleibende Implementierungsabweichungen müssen genannt werden. |
| **T2** | Das Konzept ist strukturell relevant, aber Datenraum, Assetset, Horizont, Rechtsraum oder Zielfunktion weichen ab. |
| **T3** | Die Quelle liefert Definition, Basisrate oder Szenariokontext – nicht die Wirkung einer Policy. |
| **T4** | Die Quelle begründet eine Robustheits-, Bias-, Alternativmodell- oder Gegenbefundprüfung. |

### Achse 3: Wie reif ist die Suite-Umsetzung?

| Status | Bedeutung für die konkrete Suite-Ausprägung |
| --- | --- |
| **etabliert** | im Wesentlichen anerkannter Methodenbaustein |
| **adaptiert** | eine für Suite-Ziele veränderte Methode |
| **heuristisch** | transparente, technisch reproduzierbare Regel **ohne** passende externe Kalibrierung |
| **experimentell** | Analyse-, Stress- oder Suchpfad **ohne** belastbare Wahrscheinlichkeits- oder Empfehlungsaussage |

> **Merksatz:** Auch `etabliert` ist keine Produktempfehlung.

## E.3 Korpus und Pflegegrenze

**In einem Satz:** 55 kuratierte Quellenrecords, eingefroren auf den
2026-07-15 – ausdrücklich keine erschöpfende Literaturübersicht.

Das Register führt 55 eindeutige Records in sieben Gruppen:

| Record-Bereich | Themenbereich | Anzahl |
| --- | --- | --- |
| FOR-ENT-01 bis FOR-ENT-10 | Entnahmestrategien | 10 |
| FOR-LCF-01 bis FOR-LCF-08 | Lifecycle Finance | 8 |
| FOR-STO-01 bis FOR-STO-10 | Stochastik | 10 |
| FOR-AST-01 bis FOR-AST-07 | Assetklassen und Allokation | 7 |
| FOR-PFL-01 bis FOR-PFL-03 | Pflege | 3 |
| FOR-VAL-01 bis FOR-VAL-10 | Validierung und Methodenkritik | 10 |
| FOR-DE-01 bis FOR-DE-07 | deutsche Referenzdaten | 7 |

Regeln für den Umgang mit diesem Korpus:

- Publikationsstand, Datenstand und Abrufdatum werden **getrennt** geführt.
- Dynamische oder amtliche Quellen sind nach dem Pflegevertrag neu zu erheben.
- Konkrete Zahlen benötigen **direkt an der Aussage** die Angaben Population,
  Zeitraum, Portfolio, Horizont, Erfolgsdefinition und Modellart.
- Mehrere Fassungen desselben Ergebnisses zählen **nicht** als unabhängige
  Evidenz.
- Marketing-, Blog- und Community-Texte dürfen nur eine Praxisposition oder eine
  operative Herkunft belegen – nie einen empirischen Befund.

### E.3.1 Gemeinsame Aktualisierungsroutine

**In einem Satz:** Eine Quellenänderung ist erst dann erledigt, wenn ihre Folgen
bis in die Aussagen des Dokuments verfolgt wurden – ein ausgetauschter Link
genügt nie.

Die Reihenfolge ist verbindlich:

1. Publikations-, Daten- und Abrufstand des FOR-Records aktualisieren.
2. Quellenrolle, Evidenzstufe und T-Code prüfen.
3. Alle betroffenen MAP-Dossiers und ihre Kurzzeilen auf geänderten Befund,
   Suite-Abweichung und offene Prüfung bewerten.
4. **Erst zuletzt** FR-/FQ-Folgen und Aussagen außerhalb des Forschungsblocks
   anpassen.

Drei Sonderfälle:

- **Quelle vorübergehend nicht erreichbar:** Der letzte datierte Stand bleibt
  sichtbar und wird als *nicht neu erhoben* markiert. Er darf nicht still durch
  eine Sekundärdarstellung ersetzt werden.
- **Neue Quelle widerlegt oder begrenzt eine zentrale Aussage:** Der Gegenbefund
  wird dokumentiert, und die Aussage wird bis zur Neubewertung **enger**
  formuliert.
- **Der Code ändert sich:** Codeänderungen heben **keinen** Evidenzstatus an.
  Dafür braucht es einen neuen Nachweis, der zur beanspruchten Validierungsstufe
  passt.

Die strukturelle Vollständigkeit dieses Vertrags wird durch ein Offline-Gate
abgesichert (Slice 4). Eine Live-HTTP-Prüfung bleibt ein separater, datierter
Erhebungsschritt und ist keine Voraussetzung für normale lokale Tests.

## E.4 Kompakter Mechanismusabgleich

**In einem Satz:** Für alle 17 Mechanismen wird hier sichtbar gehalten, wo die
Suite von ihrer Literaturvorlage abweicht und was lokal überhaupt nachweisbar
ist.

Die vollständigen Dossiers im Register führen je Mechanismus
Implementierungsanker, Forschungsanker mit Rolle und T-Code, Suite-Umsetzung,
Abweichung, Evidenzstatus, lokale Validierung sowie Restrisiko. Die folgenden
drei Abschnitte erklären die Denkfehler, die bei den jeweiligen Mechanismusgruppen
am häufigsten drohen; die Tabelle am Ende fasst alle 17 Zeilen zusammen.

### E.4.1 Entnahme-, Konsum- und Asset-Policies

*Betrifft MAP-01 bis MAP-07.*

**Denkfehler 1: Die Mechanismen als unabhängige Funktionen lesen.**
Sie bauen aufeinander auf, und zwar in zwei Stufen:

| Stufe | Mechanismen | Was sie bestimmen |
| --- | --- | --- |
| Bedarf | Floor und Flex | welcher Bedarf überhaupt finanziert werden soll |
| Bedarfsanpassung | Guardrails, `minimumFlexAnnual`, Dynamic Flex | Höhe oder zeitliche Verteilung dieses Bedarfs |
| Finanzierung | Runway, 3-Bucket-Logik, Gold | woher das Geld kommt und wie das Vermögen strukturiert ist |

Daraus folgt: Eine Verbesserung auf einer Stufe darf nicht zugerechnet werden,
ohne dass die Folge- und Nebenbedingungen der nächsten Stufen unverändert
bleiben.

**Denkfehler 2: Methodenursprung mit konkreter Policy verwechseln.**
Die Literatur trägt jeweils weniger, als der Name suggeriert:

| Literaturvorlage | trägt … | trägt **nicht** … |
| --- | --- | --- |
| Historische Safe-Withdrawal-Arbeiten | die Fragestellung eines real fortgeschriebenen Bedarfs | Suite-Steuern, Renten, Assetklassen, Erfolgsdefinition |
| Guardrail-Arbeiten | das Prinzip regelbasierter Anpassung | die konkrete Kombination aus Drawdown, CAPE, Runway, Inflation und Recovery |
| Annuitätenrechnung | einen VPW-Kern | die zusätzlichen EMA-, Clamp-, Floor-/Flex- und Langlebigkeitsregeln |

Diese Abweichungen sind keine redaktionellen Fußnoten. Sie begrenzen **jede**
Ergebnisübertragung.

**Denkfehler 3: Verhaltensnutzen mit Portfoliowirkung verwechseln.**
Bei Runway, Bonds, Gold und Pflegebucket sind drei Dinge zu unterscheiden:

- **Verhaltensnutzen:** Ein zweckgebundener, mental leichter verständlicher Topf
  kann Nutzerverhalten strukturieren.
- **Operative Liquidität:** Eine andere Verkaufsreihenfolge kann
  Liquiditätsstress zeitlich verschieben.
- **Portfoliowirkung:** Bei identischer Gesamtallokation erhöht ein solcher Topf
  weder Rendite noch Floor-Erfolg; die veränderte Verkaufsreihenfolge kann
  zugleich Kosten, Steuer oder Opportunitätsverlust erzeugen.

Belastbare Aussagen brauchen deshalb Ablationen mit identischem
Anfangsvermögen, identischen Cashflows und einer explizit benannten
Gegenstrategie.

### E.4.2 Stochastik, CAPE und Validierungswerkzeuge

*Betrifft MAP-08 bis MAP-13.*

**Grundsatz: Diese Werkzeuge erzeugen keine zusätzliche historische Wahrheit.**

| Werkzeug | Was es tatsächlich tut |
| --- | --- |
| Bootstrap | ordnet vorhandene Jahresrecords neu |
| Regime-Signale | beschriften oder glätten Policyzustände |
| Tail-Overlay | ergänzt konfigurierte Szenarien |
| CAPE-Policy | verändert erwartete Renditeannahmen |
| Backtest, Sweep, Auto-Optimize | werten diese Modellwelt aus |

Wenn Datenraum, Rekonstruktion oder die gemeinsame Generatorannahme verzerrt
sind, kann jeder nachgelagerte Pfad technisch korrekt und trotzdem fachlich
irreführend sein.

Vier konkrete Grenzen:

- **Parität ist keine Eignung.** Sampler- und Worker-Parität belegen
  Reproduzierbarkeit, nicht statistische Eignung.
- **Jedes Sampling-Verfahren hat einen Preis.** IID-Sampling verwirft zeitliche
  Abhängigkeit; Blockverfahren setzen vertretbare Stationarität und Blockwahl
  voraus. **Kein** Verfahren erfindet einen historisch nicht vorhandenen
  Extremtyp.
- **Regimebegriffe sind Labels, keine Schätzungen.** Sie dürfen nicht den
  Eindruck eines geschätzten Markov- oder Volatilitätsmodells erwecken, wenn sie
  aus festen Schwellen stammen.
- **Tail-Häufigkeit und -Höhe sind Szenarioparameter.** Ohne gemeinsame
  Kalibrierung sind sie keine geschätzten Eintrittswahrscheinlichkeiten.

Zur CAPE-Policy im Besonderen: CAPE-Zusammenhänge liegen typischerweise auf
langen Horizonten und in einem bestimmten Datenraum. Eine jährliche Suite-Policy
mit Glättung, Grenzen und Fallbacks ist deshalb **separat** gegen eine konstante
Baseline zu prüfen.

Zu Backtest und Optimizer: Backtests bleiben auch bei sauberer Chronologie von
Auswahl, Datenrevisionen und Trialhistorie abhängig. Ein Train/Test-Split mit
getrennten Seeds bleibt innerhalb desselben historischen Korpus und desselben
Generators – er ist also kein unabhängiger Markt-Holdout. Und häufige
Nutzerläufe können das angezeigte Testset faktisch wieder in
Entwicklungsdaten verwandeln.

### E.4.3 Langlebigkeit, Rente und Pflege

*Betrifft MAP-14 bis MAP-17.*

Diese Mechanismen verbinden Haushaltsinputs mit **populationsbezogenen** Daten –
und genau darin liegt ihre Grenze.

**Langlebigkeit (MAP-14).** Eine Periodensterbetafel beschreibt nicht automatisch
die künftige Kohorte und schon gar nicht eine konkrete Person. Joint-Life-Logik,
Quantil und Puffer sind Vorsichtsentscheidungen. Zu kurze und zu lange Horizonte
haben **asymmetrische** Folgen: ein zu kurzer Horizont erlaubt heute mehr Konsum,
gefährdet aber die spätere Deckung. Für V6 müssen Alter, Partnerkonstellation,
reale Unterlagen und die gewählten Sicherheitsziele zum Fall passen.

**Rente und Witwenrente (MAP-15).** Renten- und Witwenbeträge sind
Szenario**inputs**. Amtliche Zeitreihen liefern den Populations- und
Rechtskontext, ersetzen aber weder den individuellen Bescheid noch die aktuelle
Prüfung von Beginn, Abschlägen, Besteuerung, Sozialabgaben oder
Hinterbliebenenanspruch. Ergebnisse müssen offenlegen, ob brutto oder netto
gerechnet wurde und wie indexiert wird.

**Pflege (MAP-16, MAP-17).** Bestand, Eintritt, Übergang, Dauer, Versorgungsform,
Kosten, Leistung und Mortalität sind **getrennte** Größen. Eine
Bestandsstatistik darf nicht still als jährliche individuelle Eintrittsrate
verwendet werden. Der Pflegebucket ändert daran nichts – er steuert nur, wann ein
separierter Betrag verfügbar wird. Ohne gemeinsame Kalibrierung und ohne
Opportunitätskostenvergleich ist er eine transparente
Selbstversicherungs-Policy, keine Bedarfs- oder Versicherungsprognose.

### Die 17 Mechanismen im Überblick

| Mechanismus und Status | Quellenbefund und Suite-Abweichung | Lokaler Nachweis und offene Prüfung |
| --- | --- | --- |
| [MAP-01](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-01) real konstanter Floor – **adaptiert** | Bengen ist Methodenursprung, internationale Daten und deutscher VPI sind T2/T4 beziehungsweise T3. Suite-Steuer, Rente, Gold, Liquidität und Erfolgsdefinition weichen ab; es entsteht keine universelle sichere Rate. | V1–V3 prüfen Jahrespfad und Aggregation. V4/V5 offen: Datenprovenienz, internationale Teilperioden, Kosten-/Steuersensitivität und Shortfalltiefe. |
| [MAP-02](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-02) Floor-Flex – **adaptiert** | Flexible Entnahme und Lifecycle-Forschung tragen nur das Strukturprinzip T2. Prioritäten, Flex-Kürzung, Alarmreihenfolge und deutsche Cashflows sind suiteeigene Policies; Literatur-Nutzenwerte werden nicht übertragen. | V1–V3 prüfen Budget und Pfadparität. V4/V5 offen: identische Daten-/Seed-Vergleiche, Konsumkürzungsverteilungen und externe Präferenzgewichte. |
| [MAP-03](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-03) Guardrails/Recovery – **adaptiert, Schwellen heuristisch** | Guyton/Klinger und institutionelle Vergleiche sind T2, aber Suite-Trigger kombinieren Entnahmequote, Inflation, Drawdown, CAPE, Runway und Recovery anders. Namensähnlichkeit ist keine Replikation. | V1–V3 prüfen Reihenfolge und Determinismus. V4/V5 offen: Reproduktionsbenchmark, Schwellenstabilität, Kosten und gehaltene Out-of-sample-Daten. |
| [MAP-04](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-04) `minimumFlexAnnual` – **heuristisch** | Konsum-, Floor-/Upside- und Mental-Accounting-Quellen sind T2/T3; keine Quelle begründet den konkreten Mindestbetrag. Der Wert ist eine Nutzerpräferenz unter Notbremsen, kein Sicherheitsfloor. | V1–V3 prüfen Validierung und Notbremsen. V5/V6 offen: Präferenzstudie, Kürzungsakzeptanz und Haushaltsunterlagen; niemals still begrenzen. |
| [MAP-05](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-05) Dynamic Flex/VPW – **adaptiert** | Annuitätenrechnung, US-RMD und Community-VPW haben verschiedene Rollen T1 bis T3. Suite-CAPE, EMA, Clamps, Floor/Flex und Langlebigkeitshorizont bilden eine eigene Policy; VPW ist nicht pauschal risikosenkend. | V1–V3 prüfen Formel und Runner-Parität. V4/V5 offen: Return-/Horizon-Sensitivität, internationale Holdouts und Konsum-/Nachlass-Trade-offs. |
| [MAP-06](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-06) Runway/3-Bucket – **heuristisch** | Sequenzrisiko und Asset-Allokation sind T2, Bucket-Forschung liefert auch T4-Gegenbefunde. Operative Liquiditätssteuerung und Bond-Verkaufsreihenfolge belegen keinen Rendite- oder Sicherheitsvorteil. | V1–V3 prüfen Refill und Transaktionen. V4/V5 offen: Ablation bei gleicher Gesamtallokation, Kosten, Rebalancing und Liquidität. |
| [MAP-07](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-07) Gold – **heuristisch** | Hedge-, Safe-Haven- und Diversifikationsbefunde sind zeit-, markt- und währungsabhängig T2/T4. Feste Goldquote, Floorquote und Stresspfad sind keine Literaturparameter. | V1–V3 prüfen Bestände und Parität. V4/V5 offen: EUR-Datenprovenienz, Teilperioden, gemeinsame Krisen und Ablation gegen Aktien/Bonds/Cash. |
| [MAP-08](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-08) IID-/Block-/Stationary-Bootstrap – **adaptiert** | Bootstrap-Methoden sind T1/T2; Stationarität, Blocklänge, Randbehandlung und enge Historie bleiben T4. Resampling erzeugt keine neuen historischen Extremtypen. | V1–V3 prüfen Seed und Worker-Parität. V4/V5 offen: Abhängigkeitsdiagnostik, Blocklängen-Sensitivität und breitere Daten. |
| [MAP-09](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-09) Regime-Signale – **heuristisch** | Markov-, ARCH-/GARCH- und stylized-facts-Quellen sind T4-Prüfmaßstab. Suite-Zustände und Severities sind Policylabels, kein statistisch geschätztes Regime- oder Volatilitätsmodell. | V1–V3 prüfen Signalgrenzen. V4/V5 offen: Schwellenstabilität, Persistenz, Fehlklassifikation und Vergleich mit einfacheren Baselines. |
| [MAP-10](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-10) Tail-Overlay – **experimentell** | Heavy-Tail-Befunde und Stress-Governance begründen T2/T4-Szenarien, nicht die konkrete Schockrate, Höhe oder Dauer. Skip-Regeln verhindern nur ausgewählte Doppelüberlagerungen. | V1–V3 prüfen Seed, Ereignisplan und Parität. V4/V5 offen: gemeinsame Asset-/Makroschocks, Kalibrierung, Doppelzählung und Challenge-Protokoll. |
| [MAP-11](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-11) CAPE-Policy – **heuristisch** | Langfristige Bewertungsrelationen sind T2; Out-of-sample-Gegenbefunde und US-Datenraum sind T4. Jährliche EMA-/Clamp-Returnwerte und Fallbacks sind suiteeigene Policies. | V1–V3 prüfen Kontinuität und Fallback. V4/V5 offen: internationale/zeitliche Holdouts, Horizontabgleich und konstante Baseline. |
| [MAP-12](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-12) Backtest – **etabliert als Diagnoseverfahren** | Chronologische Historienprüfung ist anerkannt, aber Data-Snooping, Survivorship, Easy-Data-Bias und Trialauswahl sind T4. Der Lauf bleibt In-sample und keine Zukunftsvalidierung. | V1–V3 prüfen Chronologie und Aggregation. V4 offen: Return-Manifest, Look-ahead-Audit, vollständiges Trial-Inventar und unangetastete Daten. |
| [MAP-13](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-13) Sweep/Auto-Optimize – **experimentell** | Suchverfahren ordnen Kandidaten innerhalb eines Nutzerraums; Mehrfachtests und Backtest-Overfitting sind T4. Getrennte Seeds aus demselben Generator bilden keinen unabhängigen Markt-Holdout. | V1–V3 prüfen Sampling, Constraints und Champion-Shape. V4/V5 offen: Trial-Logging, nested Holdouts, Stabilitätsintervalle und unveränderte Baseline. |
| [MAP-14](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-14) Single-/Joint-Life-Horizont – **adaptiert** | Lebensdauertheorie und Periodensterbetafel sind T2/T3; Kohortenunterschiede sind T4. Quantil, Joint-Konstruktion und Puffer sind keine individuelle Lebensdauerprognose. | V1–V3 prüfen Monotonie und Pfadweitergabe. V4/V5 offen: Kohorten-/Verbesserungsszenarien, Partnerabhängigkeit und asymmetrische Horizonfehler. |
| [MAP-15](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-15) Rente/Witwenanteil – **adaptiert** | Amtliche Populations- und Rentenreihen liefern T3/T4-Kontext, keine Individualleistung. Eingabebetrag, Indexierung und Witwenquote ersetzen weder Bescheid noch Rechts-, Steuer- oder Abgabenprüfung. | V1–V3 prüfen Cashflow und Todespfad. V5/V6 offen: aktuelle Unterlagen, Brutto/Netto-Vertrag und externe Anspruchsprüfung. |
| [MAP-16](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-16) Pflegeprozess – **heuristisch** | Deutsche Bestände und Leistungen sind T3/T4; Bestände sind keine individuellen Eintritts- oder Übergangsraten. Dauer, Progression, Kosten und Mortalität sind nicht gemeinsam extern kalibriert; der PD-02-Einheitenpfad ist korrigiert, aber nicht extern kalibriert. | V1–V3 prüfen Zustände, Einheiten und Aggregation. V4/V5 offen: getrennte Quellenketten, Übergänge, Dauer, Versorgung, Kosten, Leistungen und Tod auf dem korrigierten Einheitenvertrag. |
| [MAP-17](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md#map-17) Pflegebucket – **experimentell** | Mental Accounting, Selbstversicherung und Pflegekontext sind T2 bis T4. Algorithmische Zweckbindung ist weder Versicherung noch vollständiges Liability Matching; Höhe und Trigger sind nicht extern validiert. | V1–V3 prüfen Carve-out, Trigger und KPIs. V4/V5 offen: gleiche Gesamtvermögen, Leistungen, Cash-Opportunitätskosten, Steuer und Alternativregeln. |

### E.4.4 Mechanismen gemeinsam bewerten

**In einem Satz:** Wer mehrere Mechanismen gleichzeitig ändert, kann das
Ergebnisdelta keinem einzelnen davon zuschreiben.

**Regel für Vergleiche.** Ein Mechanismusvergleich muss **vorab** angeben, was
unverändert bleibt und welche Zielgröße entscheiden darf. Werden etwa
CAPE-Policy, Guardrails und Bucket-Regel gleichzeitig geändert, ist das Delta
nicht zurechenbar. Für kausal engere Aussagen ist diese Reihenfolge nötig:

1. Einzelfaktor-Ablationen,
2. anschließend vorab definierte Interaktionen,
3. schließlich ein unveränderter Gesamtvergleich.

Negative oder instabile Ergebnisse gehören zum Nachweis. Sie dürfen nicht durch
nachträgliche Auswahl von Seeds, Startjahren oder Kennzahlen verschwinden.

**Regel für Statuswerte.** Sie dürfen nicht über Mechanismen hinweg zu einem
Gesamtscore addiert werden, denn sie messen Unterschiedliches:

- `adaptiert` kann einen klaren Methodenursprung **mit großer Suite-Abweichung**
  bezeichnen.
- `heuristisch` kann technisch sehr gut getestet, aber extern **unkalibriert**
  sein.

Entscheidend sind stattdessen die konkreten offenen Prüfungen und die Frage,
welche Validierungsstufe eine Aussage beansprucht – V1–V3, V4, V5 oder V6. Bei
jeder Änderung einer Kurzzeile bleibt das vollständige Dossier maßgeblich.

**Regel für Querwirkungen.** Gemeinsam genutzte Größen wirken über
Modulgrenzen hinweg und müssen protokolliert werden:

| Größe | Wirkt auf |
| --- | --- |
| Inflation | Floor, Rente, reale Ergebniswerte, Pflegekosten |
| Langlebigkeit | VPW-Berechnung und Pflegeexposition |
| Liquiditätsregeln | Verkaufszeitpunkt und damit Steuern |

Ein Test eines Einzelmoduls reicht für solche Ketten nicht. Die behauptete
Wirkung muss bis zu **allen** betroffenen Ergebnissen und Runnerpfaden verfolgt
werden, bevor eine Mechanismuszeile oder ein Risikostatus geändert wird.

## E.5 Ergebnisinterpretation jenseits der Floor-Deckungsquote

**In einem Satz:** Die Floor-Deckungsquote allein sagt zu wenig – sieben
Dimensionen müssen gemeinsam gelesen werden.

### Was die Floor-Deckungsquote tatsächlich aussagt

Sie zeigt ausschließlich, bei welchem Anteil der angeforderten Läufe im
gewählten Horizont **kein implementierter Floor-Deckungsbruch** eintrat. Dazu
kommt das terminale Outcome-Inventar, das Ruin, Tod, Horizontende und
technischen Fehler disjunkt trennt; bei technischen Fehlern wird die Quote gar
nicht ausgewiesen.

Zwei Policies sind nur unter identischen Daten, Seeds, Horizonten,
Haushaltsinputs, Kosten- und Steuerannahmen vergleichbar. Und beide Richtungen
können täuschen:

- Eine **höhere Floor-Deckung bei häufigeren Flex-Kürzungen** ist ein Trade-off,
  kein Fortschritt.
- Ein **höheres Endvermögen** kann schlicht daher kommen, dass zu wenig entnommen
  wurde.

### Die sieben Ergebnisdimensionen

| Dimension | Heute zulässige Aussage | Offene Mess- oder Vertragsgrenze |
| --- | --- | --- |
| Floor-Verletzung | `failCount`, `isRuin`, die Floor-Deckungsquote im gewählten Horizont und das disjunkte Outcome-Inventar beschreiben den implementierten Deckungsbruch und den terminalen Laufstatus. | Vollständige Verteilung von Höhe, Dauer und kumulierter realer Lücke fehlt. |
| Konsumkürzung | Anteil abgeschlossener Dekumulationsjahre mit Kürzung `>= 10 %`, maximale Flex-Kürzung, Jahre ohne Flex und die laufbasierte „Reale Depotentnahme P10" zur Preisbasis des Simulationsstarts zeigen modellierte Einschränkungen. | Individuelle Akzeptanz- oder Nutzengewichte, ein Quantil-Konfidenzintervall und eine vollständige reale Haushaltskonsum-Lückenverteilung fehlen. |
| Stressdauer | Stress-Kürzungsjahre und `recoveryYears` gelten für das gewählte Preset. | Keine allgemeine Regime-Verweildauer oder vollständige Erholungsverteilung. |
| Nachlass/Restvermögen | P10/P50/P90 und Median erfolgreicher Läufe beschreiben modelliertes aktives Endvermögen. | Kein Nachlassziel und keine vollständigen externen Assets, Immobilien-, Versicherungs- oder Pflegebucketwerte. |
| Steuerlast | Median kumulierter Modellsteuern und Verlusttopf-Effekt gelten für den implementierten Settlement-Vertrag. | Keine vollständige Einkommensteuer-, Sozialabgaben-, Rechts- oder Kostenlogik. |
| Liquidität | Runway, Mindest-/Zielwerte und Logs zeigen operative Cash-Deckung. | Keine einheitliche Monte-Carlo-Verteilung von Tiefe und Dauer aller Unterschreitungen. |
| Pflegewirkung | Eintritt, Pflegejahre, Kosten, Shortfall- und Bucket-KPIs vergleichen Modellpfade. | Keine extern kalibrierte Wahrscheinlichkeit oder kausale Gegenfaktualität bei gemeinsamem Pfad. |

### Die verbindliche Lesereihenfolge

1. **Contract- und Validierungsfehler ausschließen** – ohne das ist alles Weitere
   wertlos.
2. **Floor-Lücken und Liquidität prüfen.**
3. **Konsumkürzung, Steuer, Pflegewirkung und Restvermögen gemeinsam lesen.**
4. **Erst dann** Policies vergleichen.

Ein Median ohne Tailverteilung genügt nicht. Ein Endvermögen ohne die
konsumierten Leistungen genügt ebenfalls nicht. Reale und nominale Größen sowie
Prozent- und Verhältniswerte müssen dabei vertragstreu getrennt bleiben.

**Stand der Produktmängel:** PD-01 ist durch den kumulierten Simulator-State
behoben, PD-02 durch die einmalige In-memory-Normalisierung an DOM- und
Profilgrenze. Aussagen zur Eignung von Pflegeparametern bleiben dennoch durch
MR-07 und FR-10 begrenzt.

## E.6 Forschungs- und Modellrisiken

**In einem Satz:** Zwölf typische Fehlinterpretationen – und was jeweils passieren
muss, damit sie nicht auftreten.

Die Priorität `hoch` bedeutet konkret: **Ohne zusätzliche V5-Prüfung darf keine
Wirksamkeits- oder Parametereignungsaussage gemacht werden.** Die IDs vertiefen
die Modellrisiken MR-01 bis MR-12 aus dem Hauptdokument und bleiben bis zu einem
dokumentierten Nachweis offen.

| ID | Priorität | Risiko und Fehlinterpretation | Erforderliche Behandlung |
| --- | --- | --- | --- |
| FR-01 | hoch | Verkürzter Safe-Withdrawal-Kontext macht Suite-Erfolg zur universellen Rate. | Horizont, Assetset, Daten, Kosten/Steuer und Erfolgsbegriff immer mitführen. |
| FR-02 | hoch | Enge oder rekonstruierte Historie erscheint marktübergreifend. | Datenprovenienz, geschätzte Jahre, Teilperioden und internationale Daten getrennt prüfen. |
| FR-03 | hoch | Unvollständige Kosten-, Steuer- und Rechtslogik überschätzt Entnahmefähigkeit. | Sensitivitäten und externe Rechtsprüfung; MR-03/MR-05 sichtbar halten. |
| FR-04 | mittel | Samplername wird mit passender Stationarität und Blockwahl verwechselt. | Abhängigkeit, Block-/Filter-Sensitivität und Alternativmodelle vergleichen. |
| FR-05 | mittel | Policyzustände klingen wie geschätzte Marktregime. | Labels als Heuristik führen und Schwellenstabilität vorab testen. |
| FR-06 | hoch | Tail-Eventrate wird zur Crashwahrscheinlichkeit und Schocks werden doppelt gezählt. | Nur Szenarioaussage; gemeinsame Schocks und Doppelzählung challengen. |
| FR-07 | hoch | CAPE-Horizont-, Datenraum- und Forecast-Mismatch wird übersehen. | Internationale/zeitliche Holdouts und konstante Baseline verwenden. |
| FR-08 | hoch | Unbekanntes Trial-Universum macht den Champion scheinbar robust oder optimal. | Alle Trials loggen, locked/nested Holdouts, Stabilitätsintervalle und Baseline. |
| FR-09 | hoch | Perioden-/Kohorten- und Joint-Life-Fehler wirken wie individuelle Prognose. | Verbesserungs-/Kohortenszenarien, Quantilsensitivität und Partnerabhängigkeit. |
| FR-10 | hoch | Unkalibrierte Pflegeübergänge, Kosten und Drift wirken individuell prognostisch. | Quellenketten je Parameter, Kalibrierung und Sensitivität auf dem korrigierten PD-02-Einheitenvertrag. |
| FR-11 | mittel | Bucket- oder Goldwirkung wird mit Allokationseffekt vermischt. | Ablation bei gleicher Allokation, Kosten, Rebalancing und Liquidität. |
| FR-12 | hoch | Erfolgsquote verdeckt Konsumkürzung, Liquiditätsstress oder Nachlasslücke. | Ergebnisbündel aus E.5 nutzen und Shortfalltiefe/-dauer entwickeln. |

## E.7 Priorisierte Forschungsfragen

**In einem Satz:** Zehn offene Fragen, sortiert nach Dringlichkeit – alle stehen
noch am Anfang.

Die Fragen sind im
[Forschungsvalidierungs-Backlog](../internal/archive/FORSCHUNGSVALIDIERUNGS_BACKLOG.md)
in getrennte Folgevorhaben mit Eingangsgates, Owner-Rollen, Mindestnachweisen,
Abbruchkriterien und Ergebnisartefakten zerlegt.

> **Wichtig:** Alle Pakete stehen auf Stufe FV0 und bleiben offen. Dass sie
> geplant sind, ist kein Wirksamkeitsnachweis.

| ID | Priorität | Frage | Mindestnachweis für eine belastbarere Aussage |
| --- | --- | --- | --- |
| FQ-01 | 1 | Wie ändern definierte Return-Indizes, Kosten und internationale Daten die Entnahmeergebnisse? | Datenmanifest, Kostenvertrag und vorab definierte Länder-/Teilperiodenläufe. |
| FQ-02 | 1 | Welche Guardrail-/VPW-/CAPE-Verbesserungen halten auf unangetasteten Daten und Seeds? | Baseline, vollständiges Trial-Log und zeitlich/länderweise Holdouts. |
| FQ-03 | 1 | Wie oft, tief und lange werden Floor, Flex und Runway verletzt? | Verteilungen für Shortfall, Kürzung und Liquiditätslücke. |
| FQ-04 | 1 | Welche deutschen Quellen tragen Pflegeeintritt, Übergang, Dauer, Kosten, Leistungen und Mortalität? | Getrennte Parameterherkunft und Rekalibrierung auf dem korrigierten PD-02-Einheitenvertrag. |
| FQ-05 | 2 | Welche Bootstrap-Blocklänge und Filter passen zu den Jahresdaten? | Abhängigkeitsdiagnostik, Sensitivitätsband und Samplervergleich. |
| FQ-06 | 2 | Wie lässt sich Tail-Stress ohne inkonsistente oder doppelte Schocks formulieren? | Kalibrierte gemeinsame Szenarien, Challenge-Protokoll und Anti-Doppelpessimismus-Test. |
| FQ-07 | 2 | Verbessert die CAPE-Policy Ergebnisse außerhalb der Entwicklungsdaten? | Internationale/zeitliche Out-of-sample-Studie mit konstanter Baseline. |
| FQ-08 | 2 | Welchen eigenständigen Effekt haben Gold-, Runway-, Bond- und Pflegebucket-Regeln? | Ablation mit gleicher Gesamtallokation und Opportunitätskosten. |
| FQ-09 | 2 | Wie sensitiv ist Dynamic Flex auf Kohortenmortalität, Joint-Life und Quantil? | Perioden-/Kohorten-/Verbesserungsszenarien und asymmetrische Horizonfehler. |
| FQ-10 | 3 | Welche Konsum- und Nachlass-Trade-offs akzeptieren die tatsächlichen Nutzer? | Dokumentierte Präferenzen oder Nutzwertgewichte statt Portfolio-KPIs allein. |

## E.8 Mindeststandard und Ergebnisstand

**In einem Satz:** Bevor jemand „verbessert die Robustheit" schreibt, müssen acht
Dinge belegt sein.

### Was vor einer Wirksamkeitsaussage vorliegen muss

Für Formulierungen wie „verbessert Robustheit", „senkt Risiko" oder „optimiert
Entnahmen" ist mindestens erforderlich:

1. eine Baseline,
2. ein Datenmanifest,
3. ein Kosten- und Steuervertrag,
4. das vollständige Trial-Universum,
5. eine Holdout-Regel,
6. die verwendeten Seeds,
7. das Ergebnisbündel aus [E.5](#e5-ergebnisinterpretation-jenseits-der-floor-deckungsquote),
8. die negativen und instabilen Resultate.

Ohne diesen Nachweis sind Formulierungen begrenzt auf: „implementiert",
„technisch getestet", „im gewählten Szenario beobachtet" oder „experimentell".

### Was ausdrücklich nicht behauptet wird

- Frühere konkrete Kitces-/Morningstar-Zahlen zu Einkommensrückgang, sicherer
  Entnahmerate oder Risikoreduktion bleiben **entfernt**, solange kein
  reproduzierbarer Suite-Lauf und kein vollständiger Quellenkontext vorliegt.
- Floor-Flex wird **nicht** mit Guyton-Klinger gleichgesetzt.
- Implementierter Bootstrap, Regime-Signal, CAPE-Policy und Tail-Overlay gelten
  **nicht** allein wegen ihrer Existenz als extern kalibriert.
- Für einen Pflegebucket wird **keine** normativ richtige Vermögenshöhe
  behauptet.

### Ergebnisstand

Dieser Forschungsrahmen enthält eine kompakte Einordnung von MAP-01 bis MAP-17,
die mehrdimensionale Ergebnisinterpretation, FR-01 bis FR-12 und FQ-01 bis
FQ-10. **Alle offenen V4-/V5-Prüfungen bleiben bestehen.**

Weiterführend:

- vollständige Quellen- und Dossierdetails:
  [normatives Forschungs-Evidenzregister](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md);
- Priorität, Startgates und gesperrte Wirksamkeitsaussagen:
  [interner Forschungsvalidierungs-Backlog](../internal/archive/FORSCHUNGSVALIDIERUNGS_BACKLOG.md).

---

## Quellenkorpus im Überblick

Das vollständige wissenschaftliche Korpus steht mit Quellenklasse, Evidenzstufe,
dauerhaftem Link, Aussagebeitrag und Übertragbarkeitsgrenze im
[Forschungs-Evidenzregister](FORSCHUNGSABGLEICH_EVIDENZREGISTER.md). Es umfasst
55 Records aus peer-reviewter Original- und Übersichtsliteratur, amtlichen
beziehungsweise institutionellen Quellen, Practitioner Research, einem Fachbuch,
einem Community-Kontext sowie deutschen Referenzdaten. Das Register ordnet diese
Quellen den 17 Suite-Mechanismen zu und führt die vollständigen MAP-Dossiers.

---

*Dieses Dokument war bis 2026-08-05 Bereich E des Dokuments
[`ARCHITEKTUR_UND_FACHKONZEPT.md`](ARCHITEKTUR_UND_FACHKONZEPT.md). Bei der
Ausgliederung wurden Struktur, Sprache und Lesbarkeit überarbeitet; die
fachlichen Aussagen, Status, Zahlen und Quellenbezüge blieben unverändert.*
