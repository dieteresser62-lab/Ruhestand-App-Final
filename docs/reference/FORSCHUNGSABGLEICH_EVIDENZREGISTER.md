# Forschungsabgleich – Evidenzregister

**Stand:** 2026-07-19<br>
**Quellen- und Erhebungsstand:** 2026-07-15<br>
**Letzte Aktualitätsstichprobe dynamischer/amtlicher Anker:** 2026-07-17, Europe/Berlin<br>
**Status:** normativer Beleganhang zum Architektur- und Fachkonzept<br>
**Hauptdokument:** [Architektur und Fachkonzept](ARCHITEKTUR_UND_FACHKONZEPT.md#forschungsrahmen)

Dieses Register führt das vollständige kuratierte Korpus mit 55 FOR-Records und die ausführlichen Dossiers MAP-01 bis MAP-17. Es ist kein Archiv: Quellenrolle, Übertragbarkeit, Abweichung, Evidenzstatus, lokale Validierungsgrenze und offene V4-/V5-Prüfung sind hier normativ. Das Hauptdokument bleibt für Ergebnisgrenzen, FR-01 bis FR-12 und FQ-01 bis FQ-10 maßgeblich. Der [interne Forschungsvalidierungs-Backlog](../internal/FORSCHUNGSVALIDIERUNGS_BACKLOG.md) definiert deren nächste Nachweise und Freigabegates. Das [Simulator-Backtest-Forschungsprotokoll](../internal/SIMULATOR_BACKTEST_FORSCHUNGSPROTOKOLL.md) inventarisiert fuer MAP-12/13 Daten-, Kosten-, Trial-, Holdout- und Owner-Blockaden; beide Dokumente schließen keine Frage und heben keinen Evidenzstatus an.

Die Aufnahme einer Quelle belegt weder eine identische Suite-Umsetzung noch deren Wirksamkeit. Literaturzahlen sind keine Suite-Ergebnisse; lokale Tests belegen höchstens V1 bis V3 und ersetzen keine externe Kalibrierung oder Wirksamkeitsprüfung.

## Navigation

- [Evidenztaxonomie](#evidenztaxonomie)
- [Zitier- und Aktualitätsstandard](#zitierstandard)
- [Aktualitäts- und Fälligkeitsvertrag](#aktualitaetsvertrag)
- [Kuriertes Quellenkorpus](#quellenkorpus)
- [Mechanismus-Quellen-Matrix](#mapping-grundlage)
- [Status und Ergebnisübersicht](#einordnungsmassstab)
- [MAP-01 bis MAP-07](#entnahme-konsum-assets)
- [MAP-08 bis MAP-13](#stochastik-validierung)
- [MAP-14 bis MAP-17](#langelbigkeit-rente-pflege)

<a id="evidenztaxonomie"></a>

## E.2 Verbindliche Evidenztaxonomie

### E.2.1 Quellenklassen

| Code | Quellenklasse | Zulässige Rolle | Nicht ausreichend als alleiniger Beleg für |
| --- | --- | --- | --- |
| W1 | peer-reviewte Originalarbeit | Theorie-, Methoden- oder empirischer Primäranker | identische Wirkung einer abgewandelten Suite-Policy |
| W2 | peer-reviewte Synthese, Review oder Replikation | Forschungsstand, Widersprüche und Robustheitsbild | konkrete Suite-Kalibrierung ohne passende Daten |
| I1 | amtliche Statistik, Rechts-/Regelquelle oder institutioneller Methodenstandard | deutscher Inputstand, Definition, Governance oder Datenprovenienz | Anlage- oder Entnahmeempfehlung |
| I2 | institutionelle Forschung mit offengelegter Methode | aktueller Szenario- oder Methodenvergleich | universell gültige Rate oder Produkteignung |
| P1 | Practitioner Research mit nachvollziehbarer Methode | praxisnaher Methodenursprung oder Vergleich | peer-reviewte externe Validierung |
| WP | Working Paper oder Preprint | aktueller Gegenentwurf und Forschungsfrage | belastbarer Konsens vor Peer Review |
| B1 | wissenschaftliches Fachbuch | Theorieintegration und Begriffsrahmen | aktuellen empirischen Parameterstand |
| C1 | dokumentierte Community-Methode | operationaler Ursprung, Formel- oder Nutzungskonvention | wissenschaftliche Wirksamkeit oder Kalibrierung |

### E.2.2 Evidenzstufen

Die Quellenklasse beschreibt die Herkunft; die Evidenzstufe beschreibt, wie
stark die Quelle innerhalb dieses Projekts belastet werden darf:

| Stufe | Bedeutung | Verwendung im Dokument |
| --- | --- | --- |
| A | W1/W2 oder I1 mit eindeutiger Methode, Version und dauerhaftem Beleg | darf eine Theorie, Methode, amtliche Definition oder Datenreihe tragen |
| B | I2, P1 oder WP mit transparenter Methode und Grenzen | darf eine begrenzte Forschungs- oder Praxisposition tragen; kein Konsensbeleg |
| C | B1, C1 oder erklärende Sekundärquelle | darf Begriffe, operative Herkunft oder Kontext ergänzen; nie allein eine Wirksamkeitsaussage tragen |

Stufe A bedeutet nicht automatisch hohe Übertragbarkeit. Eine methodisch starke
US-Arbeit kann für deutsches Steuer-, Renten- oder Pflegerecht nur strukturell
relevant sein. Umgekehrt kann eine amtliche deutsche Reihe ein guter
Kalibrierungsinput sein, ohne eine Entnahmepolicy zu validieren.

### E.2.3 Übertragbarkeit und Quellenrolle

Jedes Mechanismusdossier verwendet zusätzlich eine der folgenden
Übertragbarkeitsmarkierungen:

| Code | Übertragbarkeit | Bedeutung |
| --- | --- | --- |
| T1 | direkt prüfbar | gleicher Methodenbaustein und hinreichend vergleichbare Zielgröße; Abweichungen bleiben offenzulegen |
| T2 | strukturell | Konzept ist relevant, aber Datenraum, Rechtsraum, Assetset, Horizont oder Zielfunktion weichen ab |
| T3 | Kontext/Kalibrierung | Quelle liefert Definition, Basisrate oder Szenariokontext, nicht die Policywirkung |
| T4 | Gegenbefund/Prüfpflicht | Quelle macht eine Robustheits-, Bias- oder Alternativerklärungsprüfung erforderlich |

Eine Quelle kann mehrere Rollen besitzen. Die Dossiers E.9 bis E.11 nennen bei
jeder zentralen Aussage mindestens `Quellen-ID + Quellenrolle +
Übertragbarkeit`.

<a id="zitierstandard"></a>

## E.3 Zitier-, Versions- und Aktualitätsstandard

- Peer-reviewte Arbeiten erhalten Autor, Titel, Jahr, Zeitschrift, Band/Seiten
  soweit verfügbar und DOI als dauerhaften Link.
- Working Paper erhalten Autor, Titel, Versionsdatum, Repository und
  dauerhaften Record; sie werden nicht nachträglich als peer-reviewt bezeichnet.
- Amtliche und institutionelle Quellen erhalten Herausgeber, Titel,
  Daten-/Berichtsstand, Tabellen- oder Statistikcode soweit verfügbar und
  Abrufdatum.
- Dynamische Datenquellen führen Beobachtungsstand und Abrufdatum getrennt.
- Eine konkrete Zahl wird direkt an ihrer Textstelle belegt und mit
  Population, Zeitraum, Portfolio, Horizont, Erfolgsdefinition und
  Modellart kontextualisiert; ein bloßer Eintrag im Korpus genügt nicht.
- Mehrere Veröffentlichungen desselben Ergebnisses werden nicht als unabhängige
  Evidenz gezählt. Working Paper und spätere Journalfassung bilden eine
  Quellenfamilie.
- Marketing-, Blog- und Community-Texte dürfen nur für dokumentierte
  Praxispositionen oder operative Herkunft verwendet werden, nicht als
  unabhängiger Qualitätsnachweis.
- Direkte Zitate bleiben kurz; der Regelfall ist eine eigenständige Paraphrase
  mit enger Aussagegrenze.

<a id="aktualitaetsvertrag"></a>

## E.3.1 Aktualitäts- und Fälligkeitsvertrag

Jede FOR-ID muss genau einem Record-Scope der folgenden Tabelle zugeordnet
sein. `Letzte Prüfung` bezeichnet den dokumentierten Quellen-/Versionsabgleich;
`Nächste Prüfung` ist der späteste erneute Prüftag. Ein Datum vor dem aktuellen
Kalendertag in `Europe/Berlin` ist überfällig und blockiert das Offline-Gate.
Der Validator selbst ruft keine DOI-, Verlags-, Community-, Daten- oder
Behörden-URL auf.

Peer-reviewte, abgeschlossene Veröffentlichungen werden jährlich auf
Metadaten-, Versions- oder Retraktionsänderungen geprüft, aber nicht still
gegen neuere Sekundärliteratur ausgetauscht. Dynamische Methoden-, Daten- und
Behördenanker werden halbjährlich geprüft. Bei der Stichprobe vom 2026-07-17
waren IRS Publication 590-B weiterhin als Ausgabe 2025, die Destatis-Tabelle
61111-0002 weiterhin mit Stand 2026-06-12, die BMG-Pflegedaten weiterhin bis
2025 und die laufende Shiller-Datenseite weiterhin unter dem dokumentierten
Provenienzanker verfügbar. Bei diesen geprüften Ankern lag damit kein
geänderter Daten- oder Berichtsstand vor, der einen historischen
Recordaustausch rechtfertigte. Der vollständige Scope-Prüfstand bleibt
2026-07-15; die Stichprobe ersetzt keine vorgezogene Vollprüfung.

| Record-Scope | Reviewklasse | Letzte Prüfung | Nächste Prüfung | Prüfquelle | Ergebnis/Änderungsnotiz |
| --- | --- | --- | --- | --- | --- |
| FOR-ENT | gemischt; dynamische Anker halbjährlich | 2026-07-15 | 2027-01-15 | FOR-ENT-01 bis FOR-ENT-10; dynamisch insbesondere FOR-ENT-09/10 | Stichprobe 2026-07-17: IRS-Ausgabe 2025 bestätigt; statische Veröffentlichungen unverändert geführt |
| FOR-LCF | peer-reviewt/Fachliteratur, jährlich | 2026-07-15 | 2027-07-15 | FOR-LCF-01 bis FOR-LCF-08 | kein geänderter Recordstand festgestellt; historische Versionen bleiben erhalten |
| FOR-STO | gemischt; institutionelle Anker halbjährlich | 2026-07-15 | 2027-01-15 | FOR-STO-01 bis FOR-STO-10; dynamisch insbesondere FOR-STO-09/10 | vollständiger Prüfstand 2026-07-15; Methodenklassiker unverändert geführt |
| FOR-VAL | gemischt; laufende Datenseite halbjährlich | 2026-07-15 | 2027-01-15 | FOR-VAL-01 bis FOR-VAL-10; dynamisch insbesondere FOR-VAL-10 | Stichprobe 2026-07-17: Shiller-Provenienzseite verfügbar; historische Forschungsrecords unverändert |
| FOR-PFL | peer-reviewt, jährlich | 2026-07-15 | 2027-07-15 | FOR-PFL-01 bis FOR-PFL-03 | kein geänderter Recordstand festgestellt |
| FOR-AST | peer-reviewt/Fachbuch, jährlich | 2026-07-15 | 2027-07-15 | FOR-AST-01 bis FOR-AST-07 | kein geänderter Recordstand festgestellt |
| FOR-DE | amtliche Daten-/Berichtsanker, halbjährlich | 2026-07-15 | 2027-01-15 | FOR-DE-01 bis FOR-DE-07; Stichprobe insbesondere FOR-DE-04/07 | Stichprobe 2026-07-17: BMG-Daten bis 2025 und Destatis-Stand 2026-06-12 bestätigt; keine Recordversion ersetzt |

<a id="quellenkorpus"></a>

## E.4 Kuratiertes Quellenkorpus

Das Korpus umfasst 55 eindeutige Records. Es ist eine kuratierte Belegbasis,
keine erschöpfende systematische Literaturübersicht. Die Spalte „Beitrag und
Grenze“ beschreibt die Quellenrolle; das Urteil über die konkrete
Suite-Ausprägung steht in den Dossiers E.9 bis E.11.

### E.4.1 Safe Withdrawal, dynamische Entnahmen, Guardrails, RMD und VPW

| ID | Klasse / Stufe | Quelle | Beitrag und Grenze |
| --- | --- | --- | --- |
| <a id="for-ent-01"></a>FOR-ENT-01 | P1 / B | Bengen (1994), *Determining Withdrawal Rates Using Historical Data*, Journal of Financial Planning 7(4), 171–180, [FPA-Archiv](https://www.financialplanningassociation.org/learning/publications/journal/OCT94-determining-withdrawal-rates-using-historical-data) | Ursprung des historischen, real konstanten Entnahmerahmens; US-Daten, ausgewählte Assets und Worst-History-Logik sind T2/T4, keine zeitlose Universalrate. |
| <a id="for-ent-02"></a>FOR-ENT-02 | P1 / B | Guyton (2004), *Decision Rules and Portfolio Management for Retirees*, Journal of Financial Planning, [FPA-Archiv](https://www.financialplanningassociation.org/article/journal/OCT04-decision-rules-and-portfolio-management-retirees-safe-initial-withdrawal-rate-too-safe) | Praxisursprung regelbasierter Inflations-/Portfolioanpassungen; konkrete Regeln und Datenuniversum müssen von Suite-Regeln getrennt werden. |
| <a id="for-ent-03"></a>FOR-ENT-03 | P1 / B | Guyton und Klinger (2006), *Decision Rules and Maximum Initial Withdrawal Rates*, Journal of Financial Planning, [Original-PDF](https://www.financialplanningassociation.org/sites/default/files/2021-11/2006%20-%20Guyton%20and%20Klinger%20-%20Decision%20Rules%20and%20SWR%20%281%29.PDF) | Monte-Carlo-Prüfung von Prosperity-/Capital-Preservation-Regeln; T2, da Trigger, Portfolio, Kosten, Steuern und Zielgrößen nicht identisch sind. |
| <a id="for-ent-04"></a>FOR-ENT-04 | I2 / B | Blanchett, Kowara und Chen (2012), *Optimal Withdrawal Strategy for Retirement Income Portfolios*, Morningstar Investment Management, [Methodenpapier](https://www.morningstar.com/content/dam/marketing/shared/research/methodology/677951-Optimal_Withdrawal_Strategy_for_Retirement_Income_Portfolios.pdf) | Vergleich variabler Entnahmeregeln mit offengelegter institutioneller Methode; US-Annahmen und Nutzenfunktion begrenzen die Übertragung. |
| <a id="for-ent-05"></a>FOR-ENT-05 | W1 / A | Waring und Siegel (2015), *The Only Spending Rule Article You Will Ever Need*, Financial Analysts Journal 71(1), 91–107, [DOI 10.2469/faj.v71.n1.2](https://doi.org/10.2469/faj.v71.n1.2) | Jährlich neu berechnete virtuelle Annuität als wissenschaftlicher Anker für amortisationsbasierte variable Entnahme; schwankender Konsum und Modellannahmen bleiben zentral. |
| <a id="for-ent-06"></a>FOR-ENT-06 | I2 / B | Morningstar (2025), *The State of Retirement Income: 2025*, Version 2025-12-03, [Bericht](https://www.morningstar.com/content/cs-assets/v3/assets/blt9415ea4cc4157833/bltb73b87c5d0c70ead/The_State_of_Retirement_Income_2025.pdf) | Aktueller institutioneller Vergleich fixer und flexibler Regeln; Zahlen gelten nur für den ausgewiesenen Horizont, Erfolgsbegriff und die Forward-Looking-Annahmen. |
| <a id="for-ent-07"></a>FOR-ENT-07 | W1 / A | Anarkulova, Cederburg, O'Doherty und Sias (2025), *The Safe Withdrawal Rate: Evidence from a Broad Sample of Developed Markets*, Journal of Pension Economics and Finance 24(3), 464–500, [DOI 10.1017/S1474747225000010](https://doi.org/10.1017/S1474747225000010) | Breiter internationaler Gegencheck zu US-zentrierten Entnahmeregeln und Datenbias; Portfolio- und Regeldefinition bleiben für T1/T2 abzugleichen. |
| <a id="for-ent-08"></a>FOR-ENT-08 | W1 / A | Clare, Glover, Seaton, Smith und Thomas (2020), *Measuring Sequence of Returns Risk*, Journal of Retirement 8(1), 65–79, [DOI 10.3905/jor.2020.1.066](https://doi.org/10.3905/jor.2020.1.066) | Explizite Messkonzepte für Sequenzrisiko; T2, weil Suite-KPIs und Entnahmevertrag nicht automatisch den vorgeschlagenen Maßen entsprechen. |
| <a id="for-ent-09"></a>FOR-ENT-09 | I1 / A | U.S. Internal Revenue Service (2025), *Publication 590-B*, Appendix B, Table III, [amtliche RMD-Regel](https://www.irs.gov/publications/p590b), Abruf 2026-07-15 | Institutioneller Ursprung altersabhängiger RMD-Divisoren; US-Steuerregel, keine deutsche Empfehlung und keine VPW-Validierung. |
| <a id="for-ent-10"></a>FOR-ENT-10 | C1 / C | Bogleheads (laufend), *Variable Percentage Withdrawal*, [Methodendokumentation](https://www.bogleheads.org/wiki/Variable_percentage_withdrawal), Abruf 2026-07-15 | Operativer Ursprung des VPW-Tabellen-/Spreadsheet-Ansatzes; Community-Quelle. Wissenschaftliche Anker der Annuitätenrechnung sind separat FOR-ENT-05 und FOR-ENT-09. |

### E.4.2 Floor-and-Upside, Lifecycle Finance, Konsumglättung und Langlebigkeit

| ID | Klasse / Stufe | Quelle | Beitrag und Grenze |
| --- | --- | --- | --- |
| <a id="for-lcf-01"></a>FOR-LCF-01 | W1 / A | Yaari (1965), *Uncertain Lifetime, Life Insurance, and the Theory of the Consumer*, Review of Economic Studies 32(2), 137–150, [DOI 10.2307/2296058](https://doi.org/10.2307/2296058) | Grundmodell zu unsicherer Lebensdauer und Annuitisierung; starke Markt-, Nutzen- und Versicherungsannahmen, daher struktureller T2-Anker. |
| <a id="for-lcf-02"></a>FOR-LCF-02 | W1 / A | Merton (1971), *Optimum Consumption and Portfolio Rules in a Continuous-Time Model*, Journal of Economic Theory 3(4), 373–413, [DOI 10.1016/0022-0531(71)90038-X](https://doi.org/10.1016/0022-0531(71)90038-X) | Theoretischer Ursprung gemeinsamer Konsum-/Portfoliooptimierung; keine direkte Validierung diskreter jährlicher Suite-Regeln. |
| <a id="for-lcf-03"></a>FOR-LCF-03 | W1 / A | Davies (1981), *Uncertain Lifetime, Consumption, and Dissaving in Retirement*, Journal of Political Economy 89(3), [DOI 10.1086/260986](https://doi.org/10.1086/260986) | Empirisch/theoretischer Anker für vorsichtiges Entsparen bei Lebensdauerunsicherheit; Population und Präferenzannahmen sind T2. |
| <a id="for-lcf-04"></a>FOR-LCF-04 | W1 / A | Bodie, Merton und Samuelson (1992), *Labor Supply Flexibility and Portfolio Choice in a Life Cycle Model*, Journal of Economic Dynamics and Control 16(3–4), 427–449, [DOI 10.1016/0165-1889(92)90044-F](https://doi.org/10.1016/0165-1889(92)90044-F) | Zeigt die Verknüpfung von Humankapital-/Arbeitsflexibilität, Konsum und Risikoanlage; nur T2 für bereits verrentete Haushalte. |
| <a id="for-lcf-05"></a>FOR-LCF-05 | W1 / A | Davidoff, Brown und Diamond (2005), *Annuities and Individual Welfare*, American Economic Review 95(5), 1573–1590, [DOI 10.1257/000282805775014281](https://doi.org/10.1257/000282805775014281) | Wohlfahrtsanker für Langlebigkeitsrisikopooling und Grenzen vollständiger Annuitisierung; Suite simuliert keine solche Versicherung. |
| <a id="for-lcf-06"></a>FOR-LCF-06 | W2 / A | Bodie, Detemple und Rindisbacher (2009), *Life-Cycle Finance and the Design of Pension Plans*, Annual Review of Financial Economics 1, 249–286, [DOI 10.1146/annurev.financial.050708.144317](https://doi.org/10.1146/annurev.financial.050708.144317) | Peer-reviewte Synthese zu Konsum, Sparen, Investieren und Versicherung über den Lebenszyklus; Rahmenquelle, kein Policyparameter. |
| <a id="for-lcf-07"></a>FOR-LCF-07 | W1 / A | Sexauer, Peskin und Cassidy (2012), *Making Retirement Income Last a Lifetime*, Financial Analysts Journal 68(1), 74–84, [DOI 10.2469/faj.v68.n1.7](https://doi.org/10.2469/faj.v68.n1.7) | Direkter Referenzpunkt für einen Liability-Matching-/Lifetime-Income-Benchmark und eine getrennte Upside-Komponente; Instrumente und US-Versorgungskontext sind nur T2 übertragbar. |
| <a id="for-lcf-08"></a>FOR-LCF-08 | W1 / A | Blanchett (2023), *Redefining the Optimal Retirement Income Strategy*, Financial Analysts Journal 79(1), 5–16, [DOI 10.1080/0015198X.2022.2129947](https://doi.org/10.1080/0015198X.2022.2129947) | Zerlegt Ausgaben in Bedürfnisse und Wünsche und verbindet sie mit Funded Ratio, dynamischer Entnahme und Nutzenmaß; Modellannahmen und US-Kontext begrenzen die Übertragung auf T2. |

### E.4.3 Bootstrap, Regime, Fat Tails und Stresstests

| ID | Klasse / Stufe | Quelle | Beitrag und Grenze |
| --- | --- | --- | --- |
| <a id="for-sto-01"></a>FOR-STO-01 | W1 / A | Efron (1979), *Bootstrap Methods: Another Look at the Jackknife*, Annals of Statistics 7(1), 1–26, [DOI 10.1214/aos/1176344552](https://doi.org/10.1214/aos/1176344552) | Primäranker des Bootstrap; IID-Grundlage allein rechtfertigt kein Zeitreihen-Sampling. |
| <a id="for-sto-02"></a>FOR-STO-02 | W1 / A | Künsch (1989), *The Jackknife and the Bootstrap for General Stationary Observations*, Annals of Statistics 17(3), 1217–1241, [DOI 10.1214/aos/1176347265](https://doi.org/10.1214/aos/1176347265) | Primäranker blockweisen Resamplings abhängiger stationärer Beobachtungen; Blockwahl und Stationarität bleiben Kalibrierungsfragen. |
| <a id="for-sto-03"></a>FOR-STO-03 | W1 / A | Politis und Romano (1994), *The Stationary Bootstrap*, Journal of the American Statistical Association 89(428), 1303–1313, [DOI 10.1080/01621459.1994.10476870](https://doi.org/10.1080/01621459.1994.10476870) | Direkter Methodenanker für geometrisch verteilte Blocklängen und stationäre Pseudozeitreihen; keine automatische Gütegarantie für die Suite-Daten. |
| <a id="for-sto-04"></a>FOR-STO-04 | W1 / A | Hamilton (1989), *A New Approach to the Economic Analysis of Nonstationary Time Series and the Business Cycle*, Econometrica 57(2), 357–384, [DOI 10.2307/1912559](https://doi.org/10.2307/1912559) | Primäranker diskreter Markov-Regime; Suite-Regime, Übergänge und Zielvariablen müssen eigenständig abgeglichen werden. |
| <a id="for-sto-05"></a>FOR-STO-05 | W1 / A | Mandelbrot (1963), *The Variation of Certain Speculative Prices*, Journal of Business 36(4), 394–419, [DOI 10.1086/294632](https://doi.org/10.1086/294632) | Früher Primärbefund schwerer Renditeschwänze; rechtfertigt keine konkrete Tail-Verteilung oder Overlay-Rate. |
| <a id="for-sto-06"></a>FOR-STO-06 | W1 / A | Engle (1982), *Autoregressive Conditional Heteroscedasticity with Estimates of the Variance of United Kingdom Inflation*, Econometrica 50(4), 987–1007, [DOI 10.2307/1912773](https://doi.org/10.2307/1912773) | Primäranker zeitvariabler bedingter Varianz; Suite implementiert damit nicht automatisch ARCH. |
| <a id="for-sto-07"></a>FOR-STO-07 | W1 / A | Bollerslev (1986), *Generalized Autoregressive Conditional Heteroskedasticity*, Journal of Econometrics 31(3), 307–327, [DOI 10.1016/0304-4076(86)90063-1](https://doi.org/10.1016/0304-4076(86)90063-1) | GARCH-Methodenanker für Volatilitätscluster; dient vor allem als T4-Vergleich zu heuristischen Regime-/Tail-Pfaden. |
| <a id="for-sto-08"></a>FOR-STO-08 | W2 / A | Cont (2001), *Empirical Properties of Asset Returns: Stylized Facts and Statistical Issues*, Quantitative Finance 1(2), 223–236, [DOI 10.1080/713665670](https://doi.org/10.1080/713665670) | Synthese zu schweren Tails, Volatilitätsclustering und weiteren Renditefakten; Prüfungskatalog, keine Suite-Kalibrierung. |
| <a id="for-sto-09"></a>FOR-STO-09 | I1 / A | Basel Committee on Banking Supervision (2018), *Stress Testing Principles*, [BIS-Publikation](https://www.bis.org/bcbs/publ/d450.htm), Abruf 2026-07-15 | Governance-, Dokumentations- und Challenge-Prinzipien für Stresstests; Bankenstandard, nur strukturell auf Haushaltsmodelle übertragbar. |
| <a id="for-sto-10"></a>FOR-STO-10 | I1 / A | Bank of England/PRA (2018, Fassung 2026), *Model Risk Management Principles for Stress Testing*, [Supervisory Statement SS3/18](https://www.bankofengland.co.uk/prudential-regulation/publication/2018/model-risk-management-principles-for-stress-testing-ss), Abruf 2026-07-15 | Unabhängige Validierung, Modellinventar und regelmäßige Challenge als Governance-Anker; keine fachliche Endkundenregel. |

### E.4.4 CAPE, Prognosegrenzen, Backtests, Optimierung und Data Snooping

| ID | Klasse / Stufe | Quelle | Beitrag und Grenze |
| --- | --- | --- | --- |
| <a id="for-val-01"></a>FOR-VAL-01 | W1 / A | Campbell und Shiller (1988), *Stock Prices, Earnings, and Expected Dividends*, Journal of Finance 43(3), 661–676, [DOI 10.1111/j.1540-6261.1988.tb04598.x](https://doi.org/10.1111/j.1540-6261.1988.tb04598.x) | Primäranker geglätteter realer Gewinne und langfristiger Bewertungsrelationen; keine Einjahres- oder exakte Renditeformel. |
| <a id="for-val-02"></a>FOR-VAL-02 | W1 / A | Campbell und Shiller (1998), *Valuation Ratios and the Long-Run Stock Market Outlook*, Journal of Portfolio Management 24(2), 11–26, [DOI 10.3905/jpm.1998.24.2.11](https://doi.org/10.3905/jpm.1998.24.2.11) | Langfristiger Bewertungs-/Renditekontext; T2/T4 für CAPE-Clamps, EMA und jährliche Policyableitungen. |
| <a id="for-val-03"></a>FOR-VAL-03 | W1 / A | Welch und Goyal (2008), *A Comprehensive Look at the Empirical Performance of Equity Premium Prediction*, Review of Financial Studies 21(4), 1455–1508, [DOI 10.1093/rfs/hhm014](https://doi.org/10.1093/rfs/hhm014) | Out-of-sample-Gegenbefund zu vielen Equity-Premium-Prädiktoren; zentrale T4-Prüfpflicht für CAPE-Policies. |
| <a id="for-val-04"></a>FOR-VAL-04 | W1 / A | Lo und MacKinlay (1990), *Data-Snooping Biases in Tests of Financial Asset Pricing Models*, Review of Financial Studies 3(3), 431–467, [DOI 10.1093/rfs/3.3.431](https://doi.org/10.1093/rfs/3.3.431) | Primäranker dafür, dass datenabhängige Testkonstruktion Inferenz verzerrt; relevant für Sweeps und Parameterauswahl. |
| <a id="for-val-05"></a>FOR-VAL-05 | W1 / A | Sullivan, Timmermann und White (1999), *Data-Snooping, Technical Trading Rule Performance, and the Bootstrap*, Journal of Finance 54(5), 1647–1691, [DOI 10.1111/0022-1082.00163](https://doi.org/10.1111/0022-1082.00163) | Vollständiges Kandidatenuniversum und Data-Snooping-Korrektur als T4-Anker; keine direkte Retirement-Policy. |
| <a id="for-val-06"></a>FOR-VAL-06 | W1 / A | White (2000), *A Reality Check for Data Snooping*, Econometrica 68(5), 1097–1126, [DOI 10.1111/1468-0262.00152](https://doi.org/10.1111/1468-0262.00152) | Statistischer Methodenanker für Mehrfachsuche; Prüfmaßstab dafür, welche Trials die Suite offenlegt oder korrigiert. |
| <a id="for-val-07"></a>FOR-VAL-07 | W1 / A | Cawley und Talbot (2010), *On Over-fitting in Model Selection and Subsequent Selection Bias in Performance Evaluation*, Journal of Machine Learning Research 11, 2079–2107, [Volltext](https://www.jmlr.org/papers/v11/cawley10a.html) | Zeigt Selection Bias auch bei Optimierung eines Validierungskriteriums; direkt relevant für Train/Test- und Champion-Auswahl. |
| <a id="for-val-08"></a>FOR-VAL-08 | W1 / A | Bailey, Borwein, López de Prado und Zhu (2016), *The Probability of Backtest Overfitting*, Journal of Computational Finance 20(4), 39–69, [DOI 10.21314/JCF.2016.322](https://doi.org/10.21314/JCF.2016.322) | Quantifiziert Überanpassungsrisiko bei vielen Strategieversuchen; T2, da Suite-Zielfunktionen und Pfadstruktur abweichen. |
| <a id="for-val-09"></a>FOR-VAL-09 | W1 / A | Harvey, Liu und Zhu (2016), *… and the Cross-Section of Expected Returns*, Review of Financial Studies 29(1), 5–68, [DOI 10.1093/rfs/hhv059](https://doi.org/10.1093/rfs/hhv059) | Multiple-Testing- und Signifikanzproblem als breiter Robustheitsanker für Parameter-/Strategievergleiche. |
| <a id="for-val-10"></a>FOR-VAL-10 | I1 / A | Shiller (laufend), *Online Data: U.S. Stock Markets 1871–Present and CAPE Ratio*, [Yale-Datenseite](https://www.econ.yale.edu/~shiller/data.htm), Abruf 2026-07-15 | Provenienzanker einer verbreiteten CAPE-Reihe samt Rekonstruktionshinweisen; US-Reihe und historische Splices sind keine globale Wahrheit. |

### E.4.5 Pflege, Mental Accounting, Cash-, Bond-, Gold- und Bucket-Strategien

| ID | Klasse / Stufe | Quelle | Beitrag und Grenze |
| --- | --- | --- | --- |
| <a id="for-pfl-01"></a>FOR-PFL-01 | W1 / A | Thaler (1985), *Mental Accounting and Consumer Choice*, Marketing Science 4(3), 199–214, [DOI 10.1287/mksc.4.3.199](https://doi.org/10.1287/mksc.4.3.199) | Primäranker mentaler Budgets und Zweckkonten; erklärt mögliche Akzeptanz, validiert aber keinen algorithmischen Air-Gap. |
| <a id="for-pfl-02"></a>FOR-PFL-02 | W1 / A | Brown und Finkelstein (2007), *Why Is the Market for Long-Term Care Insurance So Small?*, Journal of Public Economics 91(10), 1967–1991, [DOI 10.1016/j.jpubeco.2007.02.010](https://doi.org/10.1016/j.jpubeco.2007.02.010) | Primärbefund zu großem unversichertem Pflegerisiko, Loads und begrenzter Deckung; US-Markt ist nur T2 für Deutschland. |
| <a id="for-pfl-03"></a>FOR-PFL-03 | W1 / A | Brown und Finkelstein (2008), *The Interaction of Public and Private Insurance: Medicaid and the Long-Term Care Insurance Market*, American Economic Review 98(3), 1083–1102, [DOI 10.1257/aer.98.3.1083](https://doi.org/10.1257/aer.98.3.1083) | Zeigt die Interaktion öffentlicher und privater Pflegeabsicherung; deutsche Pflegeversicherung benötigt eigenen Rechts-/Leistungsabgleich. |
| <a id="for-ast-01"></a>FOR-AST-01 | W1 / A | Estrada (2019), *The Bucket Approach for Retirement: A Suboptimal Behavioral Trick?*, Journal of Investing 28(5), 54–68, [DOI 10.3905/joi.2019.1.093](https://doi.org/10.3905/joi.2019.1.093) | Direkter Gegenbefund zu pauschalen Bucket-Vorteilen; wichtig für die Trennung von Verhaltensnutzen, Asset-Allokation und Renditewirkung. |
| <a id="for-ast-02"></a>FOR-AST-02 | W1 / A | Baur und Lucey (2010), *Is Gold a Hedge or a Safe Haven?*, Financial Review 45(2), 217–229, [DOI 10.1111/j.1540-6288.2010.00244.x](https://doi.org/10.1111/j.1540-6288.2010.00244.x) | Definiert Hedge/Safe Haven und findet zeit-/marktbedingte Eigenschaften; keine konstante Goldschutzwirkung. |
| <a id="for-ast-03"></a>FOR-AST-03 | W1 / A | Erb und Harvey (2013), *The Golden Dilemma*, Financial Analysts Journal 69(4), 10–42, [DOI 10.2469/faj.v69.n4.1](https://doi.org/10.2469/faj.v69.n4.1) | Kritischer Primäranker zu Gold als Inflationsschutz und zu Bewertung; T4 für feste Goldrendite-/Schutzannahmen. |
| <a id="for-ast-04"></a>FOR-AST-04 | W1 / A | Anarkulova, Cederburg und O'Doherty (2022), *Stocks for the Long Run? Evidence from a Broad Sample of Developed Markets*, Journal of Financial Economics 143(1), 409–433, [DOI 10.1016/j.jfineco.2021.06.040](https://doi.org/10.1016/j.jfineco.2021.06.040) | Breiter Länderdatensatz gegen Survivorship-/Easy-Data-Bias; fordert naive Langfristsicherheitsannahmen heraus. |
| <a id="for-ast-05"></a>FOR-AST-05 | P1 / B | Pfau und Kitces (2014), *Reducing Retirement Risk with a Rising Equity Glide Path*, Journal of Financial Planning 27(1), 38–45, [FPA-Archiv](https://www.financialplanningassociation.org/article/journal/JAN14-reducing-retirement-risk-rising-equity-glide-path) | Praxisstudie zu Sequenzrisiko und Glidepaths; alternative Modell-/Renditeannahmen und Replikationen sind mitzulesen. |
| <a id="for-ast-06"></a>FOR-AST-06 | B1 / C | Campbell und Viceira (2002), *Strategic Asset Allocation: Portfolio Choice for Long-Term Investors*, Oxford University Press, [DOI 10.1093/0198296940.001.0001](https://doi.org/10.1093/0198296940.001.0001) | Fachbuchrahmen zu langfristiger Portfolioentscheidung und Hedging; Theorieintegration, kein aktueller Parameterbeleg. |
| <a id="for-ast-07"></a>FOR-AST-07 | W1 / A | Markowitz (1952), *Portfolio Selection*, Journal of Finance 7(1), 77–91, [DOI 10.1111/j.1540-6261.1952.tb01525.x](https://doi.org/10.1111/j.1540-6261.1952.tb01525.x) | Grundanker der Rendite-/Varianz-Diversifikation; sagt allein nichts über Entnahmereihenfolge, Tail-Schutz oder deutsche Haushaltsziele. |

### E.4.6 Deutsche amtliche Daten zu Sterblichkeit, Rente, Pflege und Preisen

| ID | Klasse / Stufe | Quelle | Beitrag und Grenze |
| --- | --- | --- | --- |
| <a id="for-de-01"></a>FOR-DE-01 | I1 / A | Statistisches Bundesamt, *Sterbetafeln 2022/2024*, [Periodensterbetafeln](https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Bevoelkerung/Sterbefaelle-Lebenserwartung/Publikationen/_publikationen-innen-periodensterbetafel.html), Stand 2025-07-22, Abruf 2026-07-15 | Aktueller amtlicher Periodenanker nach Alter/Geschlecht; Momentaufnahme ohne künftige Mortalitätsverbesserung. |
| <a id="for-de-02"></a>FOR-DE-02 | I1 / A | Statistisches Bundesamt, *Generationensterbetafeln für Deutschland*, [Methoden- und Modellbericht](https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Bevoelkerung/Sterbefaelle-Lebenserwartung/Publikationen/Downloads-Sterbefaelle/kohortensterbetafeln-5126101209004.pdf), Abruf 2026-07-15 | Kohorten-/Periodenunterschied und Modellannahmen als T4-Prüfpflicht für Langlebigkeitshorizonte. |
| <a id="for-de-03"></a>FOR-DE-03 | I1 / A | Statistisches Bundesamt (2024), *Pflegestatistik 2023 – Deutschlandergebnisse*, [Statistischer Bericht](https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Gesundheit/Pflege/Publikationen/Downloads-Pflege/statistischer-bericht-pflege-deutschlandergebnisse-5224001239005.html), Abruf 2026-07-15 | Amtlicher Bestands-/Versorgungsanker; Querschnittsbestand ist keine individuelle Eintritts- oder Übergangswahrscheinlichkeit. |
| <a id="for-de-04"></a>FOR-DE-04 | I1 / A | Bundesministerium für Gesundheit, *Pflegeversicherung – Zahlen und Fakten*, Daten bis 2025, [amtliche Datensammlung](https://www.bundesgesundheitsministerium.de/themen/pflege/pflegeversicherung-zahlen-und-fakten), Abruf 2026-07-15 | Pflegegrade, Leistungsempfänger, Leistungen und Finanzierung; Rechts-/Leistungsstand ist volatil und kein Kostenpfadmodell. |
| <a id="for-de-05"></a>FOR-DE-05 | I1 / A | Deutsche Rentenversicherung Bund (2025), *Rentenversicherung in Zeitreihen 2025*, [Publikation](https://www.deutsche-rentenversicherung.de/SharedDocs/Downloads/DE/Statistiken-und-Berichte/statistikpublikationen/rv_in_zeitreihen.pdf?__blob=publicationFile), Abruf 2026-07-15 | Amtliche Zeitreihen zu Versicherten, Rentenbestand/-zugang und Rentenarten; Populationsdaten ersetzen keine individuelle Rentenauskunft. |
| <a id="for-de-06"></a>FOR-DE-06 | I1 / A | Bundesministerium für Arbeit und Soziales (2025), *Rentenversicherungsbericht 2025*, [Bericht](https://www.bmas.de/SharedDocs/Downloads/DE/Rente/rentenversicherungsbericht-2025.html), Abruf 2026-07-15 | Rechts-/Finanzierungs-/Vorausberechnungskontext der gesetzlichen Rente; politische Projektion ist keine garantierte Individualleistung. |
| <a id="for-de-07"></a>FOR-DE-07 | I1 / A | Statistisches Bundesamt, GENESIS-Online Tabelle 61111-0002, *Verbraucherpreisindex: Deutschland, Monate*, [amtliche Tabelle](https://genesis.destatis.de/datenbank/online/table/61111-0002), Stand 2026-06-12, Abruf 2026-07-15 | Preisniveau-/Inflationsanker mit Basis und Revisionsstand; allgemeiner VPI ist kein individueller Rentner- oder Pflegekostenindex. |

<a id="mapping-grundlage"></a>

## E.5 Mapping-Grundlage des Mechanismusabgleichs

Jeder Mechanismus wird mit den Pflichtfeldern
`Suite-Mechanismus`, `Implementierungsanker`, `Forschungsanker`,
`Quellenrolle`, `Übertragbarkeit`, `Abweichung`, `lokale Validierung`,
`Evidenzstatus`, `Restrisiko` und `offene Prüfung` dokumentiert. Die folgende
Matrix zeigt die Quellen- und Prüfbasis; die abschließende Einordnung steht in
E.9 bis E.11.

| MAP-ID | Suite-Mechanismus | Startquellen | Prüfpflicht |
| --- | --- | --- | --- |
| MAP-01 | real konstanter Floor / historische Erfolgsanteile | FOR-ENT-01, FOR-ENT-07, FOR-DE-07 | Horizont, Assetset, Inflation, Steuer, Erfolgsdefinition und Deutschlandübertragbarkeit |
| MAP-02 | Floor-Flex und flexible Entnahme | FOR-ENT-04 bis FOR-ENT-06, FOR-LCF-01 bis FOR-LCF-08 | ob Floor/Upside, Nutzenfunktion und Kürzungsrisiko nur strukturell oder direkt anschließen |
| MAP-03 | Guardrails und Recovery-Logik | FOR-ENT-02, FOR-ENT-03, FOR-ENT-06 | genaue Trigger-/Anpassungsdifferenz und fehlender Reproduktionsbenchmark |
| MAP-04 | `minimumFlexAnnual` | FOR-LCF-01 bis FOR-LCF-08, FOR-PFL-01 | Nutzerpräferenz versus Sicherheitsfloor; keine Literaturquelle als direkte Regel ausgeben |
| MAP-05 | Dynamic Flex / VPW-Annuitätenformel | FOR-ENT-05, FOR-ENT-09, FOR-ENT-10 | Community-VPW, ARVA und RMD getrennt halten; CAPE-/EMA-/Clamp-Adaption ausweisen |
| MAP-06 | Runway, Liquiditätsziel und 3-Bucket-Logik | FOR-ENT-08, FOR-AST-01, FOR-AST-05 bis FOR-AST-07 | Verhaltenseffekt, Asset-Allokation und tatsächlicher Rendite-/Risikoeffekt trennen |
| MAP-07 | Goldquote und Gold-Stresswirkung | FOR-AST-02, FOR-AST-03, FOR-AST-07 | Zeitraum-, Markt-, Währungs- und Safe-Haven-Abhängigkeit gegen feste Annahmen prüfen |
| MAP-08 | IID-/Block-/Stationary-Bootstrap | FOR-STO-01 bis FOR-STO-03, FOR-AST-04 | Stationarität, Blocklänge, Randbehandlung, Datenbreite und neue Extremwerte |
| MAP-09 | diskrete und geglättete Regime-Signale | FOR-STO-04, FOR-STO-06 bis FOR-STO-08 | ob Suite-Regime geschätzt, heuristisch beschriftet oder kalibriert sind |
| MAP-10 | Tail-Risk-Overlay und Crash-Plan | FOR-STO-05 bis FOR-STO-10 | Schockrate/-höhe/-dauer, Anti-Doppelpessimismus und Szenario- versus Wahrscheinlichkeitsaussage |
| MAP-11 | CAPE-Stufen und kontinuierliche CAPE-Policy | FOR-VAL-01 bis FOR-VAL-03, FOR-VAL-10 | Horizontmismatch, US-Daten, EMA/Clamps, Out-of-sample-Güte und Fallbacks |
| MAP-12 | Backtest | FOR-VAL-04 bis FOR-VAL-09, FOR-AST-04 | Look-ahead, Survivorship/Easy-Data-Bias, Trial-Inventar und echte Out-of-sample-Grenze |
| MAP-13 | Sweep und Auto-Optimize | FOR-VAL-04 bis FOR-VAL-09 | Mehrfachtests, Zielfunktions-Overfit, Train/Test-Nesting und Champion-Stabilität |
| MAP-14 | Single-/Joint-Life-Horizont | FOR-LCF-01, FOR-LCF-03, FOR-LCF-05, FOR-DE-01, FOR-DE-02 | Perioden-/Kohortenproblem, Joint-Life-Konstruktion, Quantil und individuelle Heterogenität |
| MAP-15 | gesetzliche Rente und Witwenanteil | FOR-DE-05, FOR-DE-06 | individuelle Eingabe versus Populationsreihe, Rechtsstand und Hinterbliebenenvertrag |
| MAP-16 | Pflegeeintritt, Progression und Kosten | FOR-PFL-02, FOR-PFL-03, FOR-DE-03, FOR-DE-04 | Bestandsdaten nicht als Übergangsraten lesen; Kosten-, Dauer- und Leistungsquellen getrennt kalibrieren |
| MAP-17 | Pflegebucket / algorithmische Zweckbindung | FOR-PFL-01 bis FOR-PFL-03, FOR-AST-01, FOR-DE-03, FOR-DE-04 | Mental Accounting, Selbstversicherung, öffentliche Leistungen und Opportunitätskosten nicht vermischen |

<a id="einordnungsmassstab"></a>

## E.8 Einordnungsmaßstab und Gesamtergebnis

### E.8.1 Statusbegriffe auf Mechanismusebene

Die Einordnung bezieht sich auf die **konkrete Suite-Ausprägung**, nicht nur
auf den Namen einer Methode:

| Status | Bedeutung in diesem Dokument |
| --- | --- |
| **etabliert** | Der eingesetzte Methodenbaustein und sein Prüfzweck entsprechen im Wesentlichen einer anerkannten Methode. Daten-, Parameter- und Anwendungsgrenzen bleiben trotzdem offen. |
| **adaptiert** | Eine anerkannte Methode ist erkennbar, wurde aber für Suite-Ziele, Daten, Regeln oder Haushaltsverträge verändert. Literaturergebnisse sind nicht direkt übertragbar. |
| **heuristisch** | Die Regel ist fachlich plausibilisiert und technisch reproduzierbar, besitzt aber keinen passenden externen Kalibrierungs- oder Wirkungsnachweis. |
| **experimentell** | Die Funktion ist ein optionaler Analyse-, Stress- oder Suchpfad. Sie erzeugt Szenarien oder Kandidaten, aber keine belastbare Wahrscheinlichkeits- oder Empfehlungsaussage. |

Ein Status „etabliert“ ist keine Produktempfehlung. Umgekehrt bedeutet
„heuristisch“ nicht willkürlich: Quellcode, Parameter und Tests können
transparent sein, obwohl externe Güte oder optimale Parametrisierung fehlen.

### E.8.2 Ergebnisübersicht der 17 Mechanismen

| MAP-ID | Primärstatus der Suite-Ausprägung | Wichtigste Aussagegrenze |
| --- | --- | --- |
| MAP-01 | adaptiert | keine universelle „sichere Rate“ aus Suite-Erfolgsanteilen ableiten |
| MAP-02 | adaptiert | Floor-/Flex-Aufteilung und Kürzungsnutzen sind nicht extern repliziert |
| MAP-03 | adaptiert, Schwellen heuristisch | Suite-Trigger sind nicht Guyton-Klinger-Trigger |
| MAP-04 | heuristisch | Mindest-Flex ist eine Präferenz-/Konsumgrenze, kein Sicherheitsfloor |
| MAP-05 | adaptiert | VPW-Annuitätenkern, Community-VPW, RMD und CAPE-Policy nicht gleichsetzen |
| MAP-06 | heuristisch | Runway und 3-Bucket-Regeln belegen keinen Rendite- oder Sicherheitsvorteil |
| MAP-07 | heuristisch | Goldschutz ist zeit-, markt- und währungsabhängig |
| MAP-08 | adaptiert | Resampling erzeugt keine neuen historischen Extremtypen und braucht Kalibrierung |
| MAP-09 | heuristisch | beschriftete Zustände sind kein statistisch geschätztes Markov-/ARCH-Modell |
| MAP-10 | experimentell | Tail-Overlay ist ein Szenariogenerator, keine Ereigniswahrscheinlichkeit |
| MAP-11 | heuristisch | langfristiger CAPE-Zusammenhang validiert keine jährliche EMA-/Clamp-Policy |
| MAP-12 | etabliert als Diagnoseverfahren | Backtest ist In-sample-Historienprüfung, keine Zukunftsvalidierung |
| MAP-13 | experimentell | Kandidatensuche und Train/Test-Split beseitigen Selection Bias nicht |
| MAP-14 | adaptiert | Periodensterbetafel plus Quantil-/Joint-Konstruktion ist keine Kohortenprognose |
| MAP-15 | adaptiert | eingegebene Rente und Witwenquote ersetzen keine Rechts- oder Anspruchsprüfung |
| MAP-16 | heuristisch | Bestandsstatistiken sind keine individuellen Eintritts-/Übergangsraten |
| MAP-17 | experimentell | Zweckbindung ist keine Versicherung und ihr Nutzen ist nicht extern kalibriert |

### E.8.3 Bedeutung der lokalen Validierung

Die nachfolgenden Dossiers nennen konkrete Module und Tests. Diese Nachweise
belegen je nach Abdeckung V1 bis V3 aus dem Validierungsregister: Eingabe- und
Ergebnisverträge, deterministische Rechenregression und Pfadparität. Sie
belegen **nicht** V5-Kalibrierung oder V6-Entscheidungseignung. Ein getesteter
Sampler kann statistisch unpassend, eine deterministische Guardrail fachlich
schlecht kalibriert und eine paritätische Worker-Ausführung auf allen Pfaden
gleich verzerrt sein.

<a id="entnahme-konsum-assets"></a>

## E.9 Entnahme-, Konsum- und Asset-Policies

<a id="map-01"></a>

### E.9.1 MAP-01 – real konstanter Floor und historische Erfolgsanteile

| Pflichtfeld | Einordnung |
| --- | --- |
| Suite-Mechanismus und Implementierungsanker | Der Nutzer gibt einen jährlichen Floor vor. Simulator und Backtest führen den Bedarf jahresweise fort, verrechnen Rentenzuflüsse und prüfen über `simulator-backtest.js`, `monte-carlo-runner.js` und den Engine-Spendingpfad, ob der Floor aus dem modellierten aktiven Vermögen gedeckt bleibt. |
| Forschungsanker, Rolle und Übertragbarkeit | FOR-ENT-01 ist der historische Methodenursprung (T2/T4), FOR-ENT-07 ein internationaler Daten-/Bias-Gegencheck (T2/T4), FOR-DE-07 ein deutscher Inflationskontext (T3). |
| Suite-Umsetzung | Die Erfolgsquote ist der Anteil der Läufe ohne modellierten Floor-Deckungsbruch beziehungsweise Validierungsfehler bis zum jeweiligen Laufende. Der Pfad enthält suiteeigene Steuern, Rente, Liquidität, Gold und optionale Policies. |
| Abweichung | Es liegt keine Replikation von Bengen oder Anarkulova et al. vor. Assetset, Datenhistorie, Kosten, Steuern, Entnahmezeitpunkt, Laufende und Erfolgsdefinition weichen ab. Der in PD-01 festgehaltene Deflationsfehler ist seit Korrektur-Slice 6 behoben; die reale Entnahme bezieht sich nun auf die Kaufkraft des ersten Simulatorjahres. Das macht die Suite weiterhin nicht zu einer Replikation. |
| Evidenzstatus | **adaptiert**; die Idee einer inflationsbezogenen Mindestentnahme ist etabliert, die Suite-Erfolgsanteile sind jedoch rein modellinterne Wenn-dann-Ergebnisse. |
| Lokale Validierung | `spending-planner.test.mjs`, `simulator-real-withdrawal-contract.test.mjs`, `simulator-backtest.test.mjs`, `simulator-monte-carlo.test.mjs` und `worker-parity.test.mjs` decken Rechen-, Faktor-, Pfad-, Aggregations- und Parallelitätsverträge ab (V1–V3), nicht eine „sichere“ Anfangsrate. |
| Restrisiko und offene Prüfung | Jede Rate muss mindestens mit Horizont, Asset-Allokation, Rebalancing, Inflation, Steuer/Kosten, Datenraum und Erfolgsdefinition angegeben werden. Eine deutsche Out-of-sample-Replikation mit eindeutigem Return-Index und Kostenmodell fehlt. |

**Konsequenz für Safe-Withdrawal-Aussagen:** Das Dokument nennt keine
allgemeingültige sichere Prozentzahl. Ein gleicher Startprozentsatz kann je nach
30-, 40- oder lebensdauerabhängigem Horizont, Portfolio, Renditereihe,
Einkommensvolatilität und Erfolgsbegriff eine andere Aussage besitzen. Auch
eine hohe Suite-Erfolgsquote bedeutet nicht, dass Flex stabil, ein gewünschter
Nachlass erreicht oder reale Kaufkraft ohne Unterbrechung gehalten wurde.

<a id="map-02"></a>

### E.9.2 MAP-02 – Floor-Flex und flexible Entnahme

| Pflichtfeld | Einordnung |
| --- | --- |
| Suite-Mechanismus und Implementierungsanker | `flex-rate-policy.mjs`, `flex-budget-policy.mjs`, `spending-guardrails.mjs` und `core.mjs` trennen priorisierten Floor von kürzbarem Flex und berechnen den Jahresbedarf regelbasiert. |
| Forschungsanker, Rolle und Übertragbarkeit | FOR-ENT-04 bis FOR-ENT-06 vergleichen variable Entnahmen (T2); FOR-LCF-01 bis FOR-LCF-08 liefern Nutzen-, Konsumglättungs-, Floor/Upside- und Langlebigkeitsrahmen (überwiegend T2/T4). |
| Suite-Umsetzung | Flex kann nach Markt-, Budget-, Recovery- und optionalen Dynamic-Flex-Regeln sinken oder sich erholen; der Floor bleibt die priorisierte modellierte Bedarfsgröße. |
| Abweichung | Die Suite optimiert keine explizite Nutzenfunktion, repliziert keinen Liability-Matching- oder Annuitätenbenchmark und garantiert den Floor nicht durch sichere Assets oder Versicherung. „Floor“ bezeichnet Bedarf, nicht einen immunisierten Zahlungsstrom. |
| Evidenzstatus | **adaptiert**; Trennung von Grundbedarf und Wünschen ist strukturell anschlussfähig, konkrete Kürzungs- und Recovery-Regeln sind suiteeigen. |
| Lokale Validierung | `spending-planner.test.mjs`, `spending-quantization.test.mjs`, `simulation.test.mjs` und `worker-parity.test.mjs` prüfen Formeln und Pfadgleichheit (V1–V3). |
| Restrisiko und offene Prüfung | Die binäre Erfolgsquote kann lange oder tiefe Flex-Kürzungen verdecken. Erforderlich sind gemeinsame Auswertungen von Kürzungsjahren, Maximalkürzung, Jahren ohne Flex und Consumption-at-Risk; eine haushaltsspezifische Nutzen- oder Akzeptanzvalidierung fehlt. |

<a id="map-03"></a>

### E.9.3 MAP-03 – Guardrails und Recovery-Logik

| Pflichtfeld | Einordnung |
| --- | --- |
| Suite-Mechanismus und Implementierungsanker | `spending-guardrails.mjs`, `flex-rate-policy.mjs`, `MarketAnalyzer.mjs` und die Balance-Diagnose setzen Entnahmequoten-, Inflations-, Drawdown-, Runway- und Recovery-Regeln in einer festen Reihenfolge um. |
| Forschungsanker, Rolle und Übertragbarkeit | FOR-ENT-02 und FOR-ENT-03 sind Praxisursprünge regelbasierter Guardrails (T2); FOR-ENT-06 liefert einen aktuellen institutionellen Methodenvergleich (T2/T4). |
| Suite-Umsetzung | Recovery-Caps, vorsichtige Inflationsanpassung, vermögensbezogene Reduktionsfaktoren und definierte Reaktivierungspfade verändern die Flex-Rate; Diagnosefelder machen Trigger und Quelle sichtbar. |
| Abweichung | Trigger, Schwellen, Marktregime, Floor/Flex-Vertrag, Steuer- und Liquiditätslogik entsprechen weder den Guyton-Klinger-Regeln noch einem veröffentlichten Morningstar-Verfahren. Ähnliche Begriffe begründen keine methodische Identität. |
| Evidenzstatus | **adaptiert**, mit **heuristisch** kalibrierten Schwellen. |
| Lokale Validierung | `spending-planner.test.mjs`, `balance-diagnosis-guardrails.test.mjs`, `liquidity-guardrail.test.mjs` und `vpw-dynamic-flex.test.mjs` prüfen Trigger, Diagnosen und Recovery-Pfade (V1–V3). |
| Restrisiko und offene Prüfung | Ein fehlender externer Reproduktionsbenchmark lässt offen, ob Schwellen robust sind oder historische Besonderheiten ausnutzen. Guardrail-Varianten müssen gegen unveränderte Baselines über getrennte Daten-/Seed-Sets verglichen werden. |

<a id="map-04"></a>

### E.9.4 MAP-04 – `minimumFlexAnnual`

| Pflichtfeld | Einordnung |
| --- | --- |
| Suite-Mechanismus und Implementierungsanker | `minimum-flex-policy.mjs` hebt eine zuvor gekürzte Flex-Rate bis zu einem vom Nutzer vorgegebenen Jahresbetrag an, sofern Alarm-, Vermögens- und Runway-Notbremsen nicht blockieren. `InputValidator.mjs` sowie UI-Validatoren lehnen Werte über dem Flex-Bedarf ab, statt sie als neuen Bedarf umzudeuten. |
| Forschungsanker, Rolle und Übertragbarkeit | FOR-LCF-01 bis FOR-LCF-08 begründen nur strukturell, dass Konsumpräferenzen, Grundbedarf, Wünsche und Langlebigkeitsrisiko gemeinsam betrachtet werden müssen (T2). FOR-PFL-01 liefert Mental-Accounting-Kontext (T2/T3), keine Mindest-Flex-Formel. |
| Suite-Umsetzung | Der Betrag ist optional und ratenbasiert. Er wirkt nach Guardrails, bleibt auf Flex beschränkt und wird in Notlagen mit explizitem Status und Blockgrund nicht erzwungen. |
| Abweichung | Es gibt keine Literaturquelle, aus der Betrag, Schwelle oder Notbremsen abgeleitet wurden. Mindest-Flex ist weder existenzieller Floor noch wissenschaftlich ermitteltes Konsumminimum. |
| Evidenzstatus | **heuristisch**; transparente Nutzerpräferenz mit Sicherheitsblockaden. |
| Lokale Validierung | `spending-planner.test.mjs`, `core-negative-contracts.test.mjs`, `simulator-input-readers.test.mjs`, `simulator-backtest.test.mjs` und `simulator-sweep.test.mjs` prüfen Validierung, Wirkung und Pfadweitergabe (V1–V3). |
| Restrisiko und offene Prüfung | Höheres Mindest-Flex kann Endvermögen und spätere Floor-Deckung verschlechtern. Sensitivitäten müssen deshalb Konsumgewinn und zusätzliches Shortfall-Risiko gemeinsam ausweisen; eine pauschale Empfehlung ist unzulässig. |

<a id="map-05"></a>

### E.9.5 MAP-05 – Dynamic Flex / VPW-Annuitätenformel

| Pflichtfeld | Einordnung |
| --- | --- |
| Suite-Mechanismus und Implementierungsanker | `core.mjs`, `vpw-return-policy.mjs`, `dynamic-flex-longevity-horizon.js` und `dynamic-flex-runner-horizon.js` berechnen einen horizon- und renditeabhängigen Annuitätenbetrag, begrenzen ihn durch Suite-Sicherheitsstufen und leiten daraus Flex ab. |
| Forschungsanker, Rolle und Übertragbarkeit | FOR-ENT-05 ist ein wissenschaftlicher Annuitäten-/ARVA-Anker (T1/T2), FOR-ENT-09 dokumentiert US-RMD-Divisoren (T2/T3), FOR-ENT-10 den operativen Community-VPW-Ursprung (T2/C). |
| Suite-Umsetzung | Die Suite verwendet eine jährlich neu berechnete Annuitätenformel, einen Single-/Joint-Life-Horizont und wahlweise feste beziehungsweise CAPE-beeinflusste erwartete Realrendite; Floor, Flex, Go-Go-Phase und Sicherheits-Fallbacks bleiben suiteeigene Schichten. |
| Abweichung | Sie implementiert weder die IRS-RMD-Tabelle noch das Bogleheads-Spreadsheet unverändert. CAPE, EMA, Rendite-Clamps, Gold-/Safe-Asset-Beiträge und Recovery-Stufen sind eigene Adaptionen und werden in MAP-11 separat bewertet. |
| Evidenzstatus | **adaptiert**; der Annuitätenkern ist methodisch anschlussfähig, das gesamte Policy-System nicht extern validiert. |
| Lokale Validierung | `vpw-dynamic-flex.test.mjs`, `vpw-return-policy.test.mjs`, `dynamic-flex-horizon.test.mjs`, `longevity-engine-runner.test.mjs` und `worker-parity.test.mjs` prüfen Formel-, Horizon-, Recovery- und Pfadverträge (V1–V3). |
| Restrisiko und offene Prüfung | Eine niedrigere Ruinrate kann durch stärker schwankenden oder sinkenden Konsum erkauft sein. Notwendig ist ein Vergleich gleicher Floor-/Flex-Ziele mit Kürzungstiefe, Kürzungsdauer, Endvermögen und Horizonfehlern statt nur Erfolgsquote. |

<a id="map-06"></a>

### E.9.6 MAP-06 – Runway, Liquiditätsziel und 3-Bucket-Logik

| Pflichtfeld | Einordnung |
| --- | --- |
| Suite-Mechanismus und Implementierungsanker | Markt- und Spendingdiagnose bestimmen Mindest-/Ziel-Runway in Monaten. `three-bucket-logic.mjs`, `simulator-bond-refill.js` und Transaktionslogik können im 3-Bucket-Modus Bonds in schlechten Jahren priorisieren und in guten Jahren auffüllen. |
| Forschungsanker, Rolle und Übertragbarkeit | FOR-ENT-08 liefert Sequenzrisiko-Messkontext (T2), FOR-AST-01 einen direkten Gegenbefund zu pauschalen Bucket-Vorteilen (T4), FOR-AST-05 bis FOR-AST-07 Asset-Allokations- und Diversifikationsrahmen (T2/T4). |
| Suite-Umsetzung | Runway ist eine Policy-Schwelle, kein separates Vermögen. Der Bond-Bucket ist ein vereinfachter Zieltopf mit Cash-Rate-Proxy; Reihenfolge und Refill sind deterministische Regeln. |
| Abweichung | Die Suite repliziert weder Estradas Vergleich noch ein optimales Liability-Matching-Portfolio. Duration, Bonität, Kupons, Zinskurve, Produktkosten und Verhaltensnutzen werden nicht ökonomisch bewertet. |
| Evidenzstatus | **heuristisch**; technisch klar definierte Liquiditäts-/Verkaufsregel ohne nachgewiesenen Rendite- oder Sicherheitsvorteil. |
| Lokale Validierung | `liquidity-guardrail.test.mjs`, `3bucket-refill.test.mjs`, `3bucket-config.test.mjs`, `simulator-3bucket-ui-e2e.test.mjs` und `worker-parity.test.mjs` prüfen Contracts und deterministische Wirkung (V1–V3). |
| Restrisiko und offene Prüfung | Cash-/Bond-Puffer können Sequenzstress mindern, aber Opportunitätskosten und Asset-Allokationseffekt überwiegen. Benötigt wird eine Ablationsstudie mit identischer Gesamtallokation, Kosten und Rebalancingregeln. |

<a id="map-07"></a>

### E.9.7 MAP-07 – Goldquote und Gold-Stresswirkung

| Pflichtfeld | Einordnung |
| --- | --- |
| Suite-Mechanismus und Implementierungsanker | Portfolio-, Transaktions- und VPW-Module führen Gold als optionalen EUR-Baustein mit Ziel-/Floorquote, eigenem historischen Renditefeld und regelbasierten Käufen/Verkäufen. |
| Forschungsanker, Rolle und Übertragbarkeit | FOR-AST-02 untersucht Hedge-/Safe-Haven-Eigenschaften (T2/T4), FOR-AST-03 ist ein Gegenbefund zu pauschalem Inflationsschutz (T4), FOR-AST-07 liefert nur den allgemeinen Diversifikationsrahmen (T2). |
| Suite-Umsetzung | Gold kann in historischen/gesampelten Pfaden diversifizieren und als Verkaufsquelle dienen; Zielquoten und Verkaufsprioritäten sind Nutzereingaben beziehungsweise Suite-Regeln. |
| Abweichung | Es gibt keine konstante Safe-Haven-Wirkung, keine eigene Währungs-/Produktkostenanalyse und keine externe Kalibrierung der Ziel- oder Floorquote. Physisches Gold, ETCs und andere Vehikel werden ökonomisch zu grob zusammengefasst. |
| Evidenzstatus | **heuristisch**; Diversifikationsidee etabliert, konkrete Quote und Schutzregel suite-/nutzerspezifisch. |
| Lokale Validierung | `transaction-gold-liquidity.test.mjs`, `transaction-tax.test.mjs`, `profilverbund-profile-gold-overrides.test.mjs`, `vpw-return-policy.test.mjs` und Portfoliotests prüfen Rechen- und Vertragslogik (V1–V3). |
| Restrisiko und offene Prüfung | Ergebnis hängt von Zeitraum, Markt, EUR-Umrechnung, Rebalancing, Steuerflag und Krisendefinition ab. Robustheit erfordert Teilperioden-, Ex-Gold- und alternative Quotenvergleiche; ein positiver historischer Pfad ist kein genereller Krisenschutzbeleg. |

<a id="stochastik-validierung"></a>

## E.10 Stochastik, Regime, CAPE und Validierungswerkzeuge

<a id="map-08"></a>

### E.10.1 MAP-08 – IID-, Block- und Stationary-Bootstrap

| Pflichtfeld | Einordnung |
| --- | --- |
| Suite-Mechanismus und Implementierungsanker | `monte-carlo-runner.js` sampelt historische Jahresvektoren IID, in festen Blöcken oder über `stationary-bootstrap-sampler.js` mit geometrisch variierenden Blocklängen. Startjahr-, Recency- und CAPE-Filter greifen nach dem dokumentierten Samplingvertrag an zulässigen Starts. |
| Forschungsanker, Rolle und Übertragbarkeit | FOR-STO-01 ist der allgemeine Bootstrap-Ursprung (T2), FOR-STO-02 der Blockbootstrap-Anker für abhängige stationäre Beobachtungen (T1/T2), FOR-STO-03 der direkte Stationary-Bootstrap-Anker (T1/T2), FOR-AST-04 eine Datenbreiten-/Survivorship-Prüfpflicht (T4). |
| Suite-Umsetzung | Vollständige Jahresrecords werden neu angeordnet; der Stationary-Sampler erhält Abhängigkeit innerhalb zufällig langer Blöcke und ist über Seeds und Run-State deterministisch reproduzierbar. |
| Abweichung | Stationarität, optimale Blocklänge, Filterwirkung und Randbehandlung sind nicht aus den Suite-Daten geschätzt. Das Resampling bleibt auf der vorhandenen Jahreshistorie und erzeugt keine neuen Rendite-/Inflationskombinationen außerhalb beobachteter Records. |
| Evidenzstatus | **adaptiert**; der Stationary Bootstrap ist etabliert, Datenaufbereitung, Jahresgranularität und Kalibrierung sind suitespezifisch. |
| Lokale Validierung | `monte-carlo-sampling.test.mjs`, `stationary-bootstrap-sampler.test.mjs`, `stationary-bootstrap-contract.test.mjs`, `monte-carlo-startyear.test.mjs` und `worker-parity.test.mjs` prüfen Determinismus, Verträge und Chunk-Parität (V1–V3). |
| Restrisiko und offene Prüfung | Abhängigkeiten über längere Horizonte, Strukturbrüche und nicht beobachtete Extremkombinationen können fehlen. Blocklängen-, Filter- und Datensensitivität sowie Vergleiche gegen alternative Modelle sind als V5-Arbeit offen. |

<a id="map-09"></a>

### E.10.2 MAP-09 – diskrete und geglättete Regime-Signale

| Pflichtfeld | Einordnung |
| --- | --- |
| Suite-Mechanismus und Implementierungsanker | `MarketAnalyzer.mjs` klassifiziert Marktphasen aus Drawdown-, Jahresend-, CAPE- und weiteren Signalen; `regime-signals.mjs` bildet kontinuierliche Severities. Optional kann daraus ein geglättetes Runway-Ziel entstehen. |
| Forschungsanker, Rolle und Übertragbarkeit | FOR-STO-04 ist der Anker statistisch geschätzter Markov-Regime (T4), FOR-STO-06 und FOR-STO-07 die Anker bedingter Varianzmodelle (T4), FOR-STO-08 der empirische Prüfungskatalog stilisierter Renditefakten (T4). |
| Suite-Umsetzung | Regeln und Schwellen sind deterministisch, diagnosefähig und überwiegend auf aktuelle beziehungsweise vergangene Zustandswerte bezogen. Diskrete Sicherheitsgrenzen bleiben autoritativ; geglättete Zielsteuerung ist opt-in. |
| Abweichung | Es werden keine latenten Zustände, Übergangswahrscheinlichkeiten oder ARCH/GARCH-Parameter geschätzt. Bezeichnungen wie „Regime“ oder „Severity“ sind Policylabels, keine Behauptung eines Hamilton-Modells. |
| Evidenzstatus | **heuristisch**; fachlich motivierte Zustandsklassifikation mit transparenten Regeln. |
| Lokale Validierung | `regime-signals.test.mjs`, `spending-planner.test.mjs`, `liquidity-guardrail.test.mjs` und `worker-parity.test.mjs` prüfen Monotonie, Grenzen, Fallbacks und Pfadgleichheit (V1–V3). |
| Restrisiko und offene Prüfung | Schwellen können falsche Sicherheit, häufige Umschaltungen oder verzögerte Reaktionen erzeugen. Nötig sind Konfusions-/Stabilitätsanalysen gegen vorab definierte Krisenlabels und wirtschaftlich relevante Zielgrößen, ohne nachträgliche Schwellenanpassung. |

<a id="map-10"></a>

### E.10.3 MAP-10 – Tail-Risk-Overlay und Crash-Plan

| Pflichtfeld | Einordnung |
| --- | --- |
| Suite-Mechanismus und Implementierungsanker | `tail-risk-contract.js` und `tail-risk-overlay.js` erzeugen bei aktivierter Option deterministische, seedabhängige Schockereignisse mit konfigurierter Häufigkeit, Höhe, Dauer und Erholung. Eine Skip-Regel verhindert ausgewählte Überlagerungen mit bereits als Krise erkannten historischen Records. |
| Forschungsanker, Rolle und Übertragbarkeit | FOR-STO-05 und FOR-STO-08 belegen schwere Tails/stilisierte Fakten (T2/T4), FOR-STO-06 und FOR-STO-07 liefern alternative Volatilitätsmodelle (T4), FOR-STO-09 und FOR-STO-10 Governance- und Challenge-Prinzipien für Stressmodelle (T2). |
| Suite-Umsetzung | Das Overlay verändert Monte-Carlo-Jahresdaten nach dem historischen Sampling und führt eigene Ereignis-, Aktivjahres- und Erholungs-KPIs. Es ist standardmäßig deaktiviert. |
| Abweichung | Schockrate, -höhe, -dauer, Erholung und Anti-Doppelpessimismus sind nicht gemeinsam statistisch kalibriert. Es handelt sich weder um GARCH/Student-t noch um eine geschätzte Crashwahrscheinlichkeit. |
| Evidenzstatus | **experimentell**; expliziter Szenariogenerator. |
| Lokale Validierung | `tail-risk-contract.test.mjs`, `tail-risk-overlay.test.mjs` und Tail-Risk-Fälle in `worker-parity.test.mjs` prüfen Inputgrenzen, deterministische Planung, Overlay-Wirkung und Aggregationsparität (V1–V3). |
| Restrisiko und offene Prüfung | Gleichzeitige Inflation, Zinsen, Gold, Pflege oder Liquidität können inkonsistent zum Aktiencrash bleiben; die Skip-Regel kann Doppelstress sowohl über- als auch unterkorrigieren. Ergebnisse dürfen nur als „unter diesem Stressplan“ und nie als Eintrittswahrscheinlichkeit bezeichnet werden. |

<a id="map-11"></a>

### E.10.4 MAP-11 – CAPE-Stufen und kontinuierliche CAPE-Policy

| Pflichtfeld | Einordnung |
| --- | --- |
| Suite-Mechanismus und Implementierungsanker | `MarketAnalyzer.mjs` nutzt diskrete CAPE-Kontexte; `vpw-return-policy.mjs` kann erwartete Realrenditen kontinuierlich aus CAPE ableiten, glätten und begrenzen. `cape-utils.js` und der Balance-Jahrespfad verwalten Auswahl, Fallback und Provenienz. |
| Forschungsanker, Rolle und Übertragbarkeit | FOR-VAL-01 und FOR-VAL-02 sind Primäranker langfristiger Bewertungsrelationen (T2), FOR-VAL-03 ein zentraler Out-of-sample-Gegenbefund für Renditeprädiktoren (T4), FOR-VAL-10 der Provenienzanker der verwendeten US-CAPE-Reihe (T3/T4). |
| Suite-Umsetzung | CAPE beeinflusst wahlweise Regime-/VPW-Entscheidungen. Die kontinuierliche Policy ist opt-in; EMA, Renditefunktion, Assetbeiträge und Clamps stabilisieren die jährliche Rechenwirkung und werden diagnostiziert. |
| Abweichung | Langfristige Bewertungsprognosen werden in eine jährliche Policygröße übersetzt. US-Daten, Rekonstruktions-/Splice-Grenzen, Europa-/EUR-Portfolio und Fallbackwerte erzeugen Horizont- und Datenraummismatch; EMA und Clamps sind keine Literaturparameter. |
| Evidenzstatus | **heuristisch**; wissenschaftlich anschlussfähiger Bewertungsindikator, aber nicht extern validierte Suite-Renditepolicy. |
| Lokale Validierung | `vpw-return-policy.test.mjs`, `vpw-dynamic-flex.test.mjs`, `balance-annual-cape.test.mjs` und kontinuierliche CAPE-Fälle in `worker-parity.test.mjs` prüfen Grenzen, Quellenstatus, Fallbacks und Pfadparität (V1–V3). |
| Restrisiko und offene Prüfung | Forecast-Fehler kann systematisch Konsum verschieben; wiederverwendete historische CAPE-/Renditedaten erlauben Data Snooping. Erforderlich sind vorab festgelegte internationale und zeitlich getrennte Out-of-sample-Vergleiche gegen eine einfache konstante Realrenditepolicy. |

<a id="map-12"></a>

### E.10.5 MAP-12 – historischer Backtest

| Pflichtfeld | Einordnung |
| --- | --- |
| Suite-Mechanismus und Implementierungsanker | `simulator-backtest.js` führt die gewählte Policy chronologisch über historische Startjahre und Jahresrecords aus und aggregiert Floor-Erfolg, Vermögen, Drawdown, Runway und weitere Laufgrößen. |
| Forschungsanker, Rolle und Übertragbarkeit | FOR-VAL-04 bis FOR-VAL-06 und FOR-VAL-09 begründen Data-Snooping-/Mehrfachtest-Prüfpflichten (T4), FOR-VAL-07 und FOR-VAL-08 Selection-/Backtest-Overfitting (T4), FOR-AST-04 Survivorship-/Easy-Data-Bias (T4). |
| Suite-Umsetzung | Ein einzelner Pfad verwendet die zeitliche Reihenfolge der Records; mehrere Startfenster zeigen Sequenzunterschiede. Die Berechnung ist ein Diagnose- und Regressionswerkzeug, kein Schätzer einer universellen Zukunftswahrscheinlichkeit. |
| Abweichung | Policy, Parameter, Datenquelle und Auswertungsgrößen wurden unter Kenntnis derselben Historie entwickelt. Eine chronologische Ausführung verhindert nicht den Forscher-Look-ahead bei Regelwahl. Die enge Datenbasis deckt Länderausfälle, Produktkosten und nicht überlebende Märkte nur unvollständig ab. |
| Evidenzstatus | **etabliert als Diagnoseverfahren**; nicht als unabhängige Wirksamkeitsvalidierung. |
| Lokale Validierung | `simulator-backtest.test.mjs`, `simulation.test.mjs` und relevante Engine-Regressionstests prüfen Fenster-, Renten-, Mindest-Flex- und Ergebnisverträge (V1–V3). |
| Operationaler Gate-Status | Slice 09 begrenzt aktuelle Aussagen auf historische In-sample-Diagnose, technisch getestet oder unter den offengelegten Annahmen beobachtet. Die gesamte eingebettete Historie 1925-2025 und daraus gebildete Rolling Cohorts gelten als explorativ/kontaminiert. `HistoricalBacktestExportV1` manifestiert einen explizit exportierten Lauf, ist aber kein vollständiges Trial-Log und kein Holdout-Nachweis. FV-G02, FV-G03, FV-G05, FV-G06 und FV-G08 bleiben blockiert; siehe [Forschungsprotokoll](../internal/SIMULATOR_BACKTEST_FORSCHUNGSPROTOKOLL.md). |
| Restrisiko und offene Prüfung | Wiederholtes Ausprobieren erzeugt ein nicht protokolliertes Trial-Universum. Für stärkere Evidenz wären eingefrorene Regeln, vollständiges Trial-Inventar, unangetastete Holdout-Perioden und breitere Länder-/Indexdaten erforderlich. |

<a id="map-13"></a>

### E.10.6 MAP-13 – Sweep und Auto-Optimize

| Pflichtfeld | Einordnung |
| --- | --- |
| Suite-Mechanismus und Implementierungsanker | `simulator-sweep.js`/`sweep-runner.js` prüfen freigegebene Parameterkombinationen. `auto_optimize.js` und die `auto-optimize-*`-Module nutzen Latin Hypercube Sampling, Quick-Filter, Vollbewertung, lokale Nachbarschaftssuche und separate Seed-Sets für ausgewählte Kandidaten. |
| Forschungsanker, Rolle und Übertragbarkeit | FOR-VAL-04 bis FOR-VAL-06 und FOR-VAL-09 sind Mehrfachtest-/Data-Snooping-Anker (T4); FOR-VAL-07 zeigt Selection Bias trotz Validierungskriterium (T4); FOR-VAL-08 ist ein Backtest-Overfitting-Anker (T2/T4). |
| Suite-Umsetzung | Kandidaten werden innerhalb eines vom Nutzer gewählten Suchraums anhand modellinterner Objectives und Constraints geordnet. Der Champion wird angezeigt und nur auf bewusste Nutzeraktion in Formfelder übernommen. |
| Abweichung | Disjunkte Seeds sind keine unabhängige Markt-/Modell-Stichprobe, weil Train und Test aus derselben Datenbasis und demselben Generator stammen. Top-K-Auswahl, lokale Verfeinerung und wiederholte Läufe vergrößern das effektive Trial-Universum; es gibt keine verschachtelte Validierung oder Multiple-Testing-Korrektur. |
| Evidenzstatus | **experimentell**; Such- und Sensitivitätswerkzeug, keine automatische Empfehlung oder globale Optimierung. |
| Lokale Validierung | `simulator-sweep.test.mjs`, `auto-optimizer.test.mjs`, `auto-optimize-worker-contract.test.mjs`, `simulator-heatmap.test.mjs` und `worker-parity.test.mjs` prüfen Sampling, Constraints, Cache, Champion-Shape und Ausführungsgleichheit (V1–V3). |
| Operationaler Gate-Status | Disjunkte Train-/Test-Seeds desselben Generators bleiben modellinterne Validierung und kein externer Holdout. Frühere betrachtete Kandidaten und manuelle Nachjustierungen sind nicht vollständig rekonstruierbar. Persistentes append-only Trial-Tracking ist nicht autorisiert; ein Validierungs-/Statistik-Owner, Holdout-Custodian und eigener Speicher-/Datenschutzvertrag fehlen. |
| Restrisiko und offene Prüfung | Objective- und Zielfunktions-Overfit, Champion-Instabilität und vom Nutzer wiederholt betrachtete Test-Sets bleiben. Erforderlich sind Trial-Logging, verschachtelte oder zeitlich/länderweise Holdouts, Stabilitätsintervalle und ein unveränderter Baselinevergleich. |

<a id="langelbigkeit-rente-pflege"></a>

## E.11 Langlebigkeit, Rente und Pflege

<a id="map-14"></a>

### E.11.1 MAP-14 – Single-/Joint-Life-Horizont

| Pflichtfeld | Einordnung |
| --- | --- |
| Suite-Mechanismus und Implementierungsanker | `dynamic-flex-longevity-horizon.js`, `dynamic-flex-longevity-contract.js` und `dynamic-flex-runner-horizon.js` leiten aus geschlechts-/altersspezifischen Sterbewahrscheinlichkeiten Mean- oder Quantilhorizonte für eine beziehungsweise zwei Personen ab und ergänzen optionale relative oder feste Puffer. |
| Forschungsanker, Rolle und Übertragbarkeit | FOR-LCF-01, FOR-LCF-03 und FOR-LCF-05 liefern Theorie und empirischen Kontext der unsicheren Lebensdauer beziehungsweise Risikopooling (T2/T4); FOR-DE-01 ist der Periodensterbetafel-Anker (T3); FOR-DE-02 begründet die Kohorten-/Perioden-Prüfpflicht (T4). |
| Suite-Umsetzung | Der Joint-Life-Horizont berücksichtigt die längere relevante Restlebensdauer im Paar. Quantil, Puffer und Joint-to-Single-Übergang sollen vorsichtige VPW-Horizonte erzeugen; die Engine erhält den bereits aufgelösten effektiven Horizont. |
| Abweichung | Periodensterblichkeit wird nicht zu einer Kohortenprognose mit künftiger Mortalitätsverbesserung. Individuelle Gesundheit, Bildung, Einkommen, Selektion und Partnerabhängigkeit fehlen; Puffer sind Nutzer-/Policyparameter und kein amtliches Quantilversprechen. |
| Evidenzstatus | **adaptiert**; etablierte aktuarielle Grundgrößen mit suiteeigener Joint-/Quantil-/Pufferkonstruktion. |
| Lokale Validierung | `dynamic-flex-horizon.test.mjs`, `longevity-horizon.test.mjs`, `longevity-contract.test.mjs`, `longevity-engine-runner.test.mjs`, `longevity-ui-persistence.test.mjs` und `worker-parity.test.mjs` prüfen Monotonie, Verträge und Pfadweitergabe (V1–V3). |
| Restrisiko und offene Prüfung | Ein zu kurzer Horizont erhöht aktuelle Entnahme, ein zu langer senkt Konsum; beide Fehler sind asymmetrisch. Offen sind Kohortentafel-/Verbesserungsszenarien, Abhängigkeit der Partnerleben und Kalibrierung der gewählten Quantile gegen Nutzerziele. |

<a id="map-15"></a>

### E.11.2 MAP-15 – gesetzliche Rente und Witwenanteil

| Pflichtfeld | Einordnung |
| --- | --- |
| Suite-Mechanismus und Implementierungsanker | `simulator-input-pension.js`, `simulator-household-pension.js` und `simulator-portfolio-pension.js` verarbeiten personbezogene Rentenbeträge, Startzeitpunkte, Indexierung und einen konfigurierten Witwenanteil als bedarfsmindernde Jahreszuflüsse. |
| Forschungsanker, Rolle und Übertragbarkeit | FOR-DE-05 liefert amtliche Populations- und Rentenzeitreihen (T3), FOR-DE-06 Rechts-, Finanzierungs- und Vorausberechnungskontext (T3/T4). Beide Quellen ersetzen keine individuelle Renteninformation. |
| Suite-Umsetzung | Beträge und Rechtsannahmen kommen aus Nutzereingaben; Tod, Partnerstatus, Startoffset und konfigurierter Witwenmodus steuern den Jahreszufluss. Nur ein Teilpfad besitzt einen pauschalen Steuerabschlag. |
| Abweichung | Es gibt keine automatische Berechnung von Entgeltpunkten, Abschlägen, Besteuerungsanteil, Kranken-/Pflegeversicherungsbeiträgen, Freibeträgen oder aktueller Hinterbliebenenprüfung. Der Prozentwert ist ein Szenarioparameter, kein Rechtsanspruch. |
| Evidenzstatus | **adaptiert**; amtlich anschlussfähige Cashflow-Kategorie mit stark vereinfachtem Haushalts-/Rechtsvertrag. |
| Lokale Validierung | `simulator-input-readers.test.mjs`, `simulator-headless.test.mjs`, `simulator-monte-carlo.test.mjs`, `simulator-backtest.test.mjs` und `simulation.test.mjs` prüfen Eingabe-, Todes-, Indexierungs- und Jahrespipelineverträge (V1–V3). |
| Restrisiko und offene Prüfung | Rechtsstand und individuelle Bescheide können erheblich abweichen. Jede Entscheidungssimulation muss Beträge aus aktuellen Unterlagen übernehmen, Brutto/Netto kenntlich machen und Hinterbliebenenregeln extern prüfen; Populationsmittel sind kein zulässiger Ersatz. |

<a id="map-16"></a>

### E.11.3 MAP-16 – Pflegeeintritt, Progression und Kosten

| Pflichtfeld | Einordnung |
| --- | --- |
| Suite-Mechanismus und Implementierungsanker | `simulator-data.js` und Pflegehilfen in `simulator-engine-helpers.js` ziehen altersabhängige PG1/PG2-Eintritte, jährliche Progression, akute/chronische Dauer, Kosten-/Flexwirkung und optionale Mortalitätsmultiplikatoren; Paarzustände laufen getrennt. |
| Forschungsanker, Rolle und Übertragbarkeit | FOR-PFL-02 und FOR-PFL-03 zeigen Pflegerisiko und Versicherungsinteraktion im US-Kontext (T2/T4); FOR-DE-03 liefert deutschen Bestands-/Versorgungskontext (T3/T4); FOR-DE-04 amtliche Leistungs-/Pflegegradkontexte (T3/T4). |
| Suite-Umsetzung | Hinterlegte Altersbucket-Werte werden als jährliche Neueintritte verwendet; Progression und gradbezogene Kosten/Flex/Mortalität sind Modell- oder Nutzerparameter. Das Dokument weist die interne Prävalenz-zu-Inzidenz-Umrechnung und die Fünfjahresglättung aus. |
| Abweichung | Querschnittsbestände sind keine individuellen Eintrittsraten. Der im Codekommentar genannte BARMER-Bezug, angenommene vierjährige Pflegedauer, Progressionsraten, Kostenpfade und Mortalitätsfaktoren bilden noch keine reproduzierte externe Kalibrierung. Der in Slice 7 korrigierte PD-02-Einheitenpfad behebt nur die doppelte Prozentskalierung, nicht diese Kalibrierungsgrenze. |
| Evidenzstatus | **heuristisch**; relevantes Risiko, aber nicht ausreichend kalibrierter Übergangs-/Kostenprozess. |
| Lokale Validierung | `care-meta.test.mjs`, `simulator-monte-carlo.test.mjs`, Pflegefälle in `worker-parity.test.mjs` und UI-/Inputtests prüfen Zustands-, Dual-Care-, Kosten- und Aggregationslogik (V1–V3). Sie validieren keine Eintrittsraten. |
| Restrisiko und offene Prüfung | Eintritt, Dauer, Gradfolge, Versorgungstyp, Eigenanteil, Leistungen, regionale Kosten und Mortalität sind miteinander abhängig. Benötigt werden getrennte Quellen und Kalibrierungen für Bestände, Übergänge, Dauer, Kosten, Leistungen und Tod sowie eine Neubewertung auf dem korrigierten PD-02-Einheitenvertrag. |

<a id="map-17"></a>

### E.11.4 MAP-17 – Pflegebucket / algorithmische Zweckbindung

| Pflichtfeld | Einordnung |
| --- | --- |
| Suite-Mechanismus und Implementierungsanker | `simulator-health-bucket.js`, Portfolio-Carve-out und Balance-Diagnose separieren einen cash-nahen Betrag aus dem aktiven Vermögen. Je nach Pflegegrad-/Paartrigger deckt er Pflege-Zusatzfloor oder Floor-Shortfall vor Forced Sales; es gibt kein automatisches Refill. |
| Forschungsanker, Rolle und Übertragbarkeit | FOR-PFL-01 erklärt Mental Accounting (T2/T3); FOR-PFL-02 und FOR-PFL-03 liefern Selbstversicherungs-/Versicherungskontext (T2/T4); FOR-AST-01 ist eine Bucket-Gegenprüfung (T4); FOR-DE-03 und FOR-DE-04 liefern deutschen Pflegekontext (T3/T4). |
| Suite-Umsetzung | Die Zweckbindung schafft einen Engine-Air-Gap: Der Betrag erhöht in normalen Jahren weder Runway noch VPW-Basis und wird erst bei konfiguriertem Trigger nutzbar. KPIs zeigen Nutzung, Erschöpfung, Deckung und Restbetrag. |
| Abweichung | Mental Accounting kann Verhalten erklären, validiert aber weder Höhe noch Trigger. Der Bucket ist kein Versicherungsvertrag, kein vollständiges Liability Matching und berücksichtigt beim Verbrauch noch keine eigenen Steueraggregate; öffentliche Leistungen und Opportunitätskosten werden nicht optimiert. |
| Evidenzstatus | **experimentell**; transparente optionale Selbstversicherungs-Policy. |
| Lokale Validierung | `health-bucket.test.mjs`, `balance-health-bucket.test.mjs`, `simulator-monte-carlo.test.mjs`, `3bucket-config.test.mjs` und Paritätsfälle prüfen Carve-out, Trigger, Deckung, Zins und KPIs (V1–V3). |
| Restrisiko und offene Prüfung | Der reservierte Betrag kann zu klein sein oder normalen Konsum unnötig beschneiden. Ein belastbarer Vergleich benötigt gleiche Gesamtvermögen, explizite öffentliche/private Leistungsannahmen, Cash-Opportunitätskosten, Steuerwirkung und alternative Trigger-/Refill-Regeln. |

---

Zur kompakten Einordnung, zum Ergebnisbündel sowie zu FR- und FQ-Ownership: [Forschungsrahmen im Hauptdokument](ARCHITEKTUR_UND_FACHKONZEPT.md#forschungsrahmen).
