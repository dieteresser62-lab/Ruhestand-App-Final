# Gesamtbewertung der Ruhestand-Suite

**Bewertungsstichtag:** 2026-08-06  
**Bewerteter Stand:** Arbeitsbaum auf `main`, `HEAD 27b9264`, einschließlich der zum Stichtag vorhandenen uncommitteten Dokumentations- und Teständerungen  
**Gewichtung:** Technik 50 Prozent, fachliche Eignung 50 Prozent  
**Charakter des Urteils:** kritische interne Produktbewertung, keine Anlage-, Steuer-, Rechts- oder Versicherungsberatung und keine externe fachliche Validierung

## 1. Kurzurteil ohne Benotung

Die Ruhestand-Suite ist inzwischen eine umfangreiche, technisch stark
abgesicherte DIY-Anwendung. Besonders belastbar sind ihre reproduzierbaren
Rechenverträge, die Fehler- und Korruptionsbehandlung, die Persistenz- und
Recovery-Pfade, die Trennung von Planung und realer Brokerausführung sowie die
außergewöhnlich breite Testbasis.

Die größte verbleibende Schwäche liegt nicht in einem pauschal instabilen
Programm, sondern in der fachlichen Aussagekraft: Viele Methoden sind bewusst
adaptiert, heuristisch oder experimentell. Markt-, Pflege-, Mortalitäts-,
Steuer- und Optimierungsmodelle sind technisch getestet, aber nicht unabhängig
extern kalibriert oder für einen konkreten Haushalt validiert. Hinzu kommen
bestätigte Semantik- und Einheitenprobleme in Monte-Carlo-Exporten sowie offene
operative und fachliche Entscheidungen.

Für einen finanzkundigen DIY-Nutzer mit einem einfachen EUR-Portfolio aus
Liquidität, breiten Aktien-ETFs, optional Gold und einem vereinfachten
Bond-Bucket ist die Suite ein leistungsfähiges Planungs-, Stress- und
Jahressteuerungswerkzeug. Als alleinige Entscheidungsinstanz oder als Ersatz für
Steuerberatung, Rentenbescheidprüfung, Aktuariat, Versicherungsanalyse oder eine
vollständige Finanzplanung ist sie nicht geeignet.

## 2. Prüfgrundlage und tatsächlich ausgeführte Nachweise

### 2.1 Repository und Umfang

- 185 Dateien unter `app/` mit rund 59.600 physischen Zeilen
- 28 Engine-Module mit rund 7.000 Zeilen
- 3 Worker-Module mit rund 1.060 Zeilen
- 167 erkannte `*.test.mjs`-Dateien
- 245 Markdown-Dokumente unter `docs/`, davon 220 archivierte interne
  Arbeits- und Slice-Dokumente
- Windows-Desktop-App über Tauri sowie browserbasierter Betrieb

### 2.2 Am Stichtag ausgeführte Prüfungen

| Prüfung | Ergebnis |
| --- | --- |
| `npm test` | 167 Testdateien, 18.977/18.977 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles |
| `npm run test:browser` | 29/29 Playwright-Workflows bestanden |
| `npm run test:coverage` | 78,88 Prozent approximative V8-Zeilenabdeckung, 41.741/52.919 ausführbare Zeilen |
| `npm run docs:evidence` | bestanden; 69 Markt-, 55 Forschungs- und 17 Mechanismus-Records strukturell validiert |
| `cargo test --locked` | 8/8 Rust-Unit-Tests bestanden |
| visuelle Browserprüfung | Startseite, Balance-App, Simulator und Handbuch ohne offensichtlichen Layoutbruch geprüft |
| `git diff --check` | bestanden |

Nicht Bestandteil dieser Bewertung waren ein neuer Tauri-Release-Build, ein
manueller Smoke-Test der vorhandenen EXE auf einem frischen Windows-System,
Penetrationstests, eine formale WCAG-Prüfung und eine unabhängige steuerliche,
aktuarielle oder wissenschaftliche Replikation.

Die vorhandene `RuhestandSuite.exe` ist vom 2026-08-04. Die zugehörige
`dist/__build-provenance.json` nennt den sauberen Runtime-Commit
`ce4202ff0c71e94aba0c5b262f6ab8638f9173b6`. Der aktuelle Arbeitsbaum ist
hingegen nicht sauber. Die Abweichung betrifft im geprüften Stand vor allem
Dokumente und einen Dokument-/Lizenztest, erschwert aber trotzdem die eindeutige
Benennung eines vollständig reproduzierbaren Bewertungsstands.

## 3. Findings vor der Benotung

### F-01 – Keine externe Validierung der entscheidenden Fachmodelle (hoch)

Die eigene Validierungsmatrix kennzeichnet Markt-/Inflationshistorie, Steuer,
Mortalität, Pflege, Rentenlogik und Auto-Optimize als technisch getestet, aber
nicht extern validiert. Das ist transparent dokumentiert, bleibt inhaltlich
jedoch die wichtigste Grenze.

- **IT-Sicht:** Grüne Tests belegen Verträge, Regressionen und Pfadparität,
  nicht die Richtigkeit der Kalibrierung.
- **Einfach gesagt:** Die Software rechnet ihre Regeln zuverlässig. Damit ist
  noch nicht bewiesen, dass die Regeln die reale Zukunft gut beschreiben.
- **Folge:** Ergebnisse dürfen als Wenn-dann-Szenarien, nicht als Prognosen oder
  Garantien verwendet werden.

### F-02 – Drei bestätigte schwere Semantikprobleme im MC-Export (hoch)

Die aktuelle Laufanalyse bestätigt im vorhandenen Code:

1. Eine untere Heatmap-Bin-Grenze wird als `upperBoundPct` exportiert.
2. Vier Renditefelder heißen `...Pct`, enthalten aber Ratios statt
   Prozentpunkte.
3. Zwei fachlich verschiedene Entnahmequoten werden ohne klare Nenner- und
   Messzeitpunktbezeichnung ausgegeben.

Zusätzlich ist die Null-/Missingness-Policy nicht überall konsistent. Diese
Probleme machen nicht automatisch die intern berechnete Bilanz falsch, können
aber externe Auswertungen um eine Klasse beziehungsweise um den Faktor 100
fehlinterpretieren lassen.

- **IT-Sicht:** Der interne Datenfluss ist testbar, der veröffentlichte
  Analysevertrag ist an diesen Stellen semantisch nicht sicher.
- **Einfach gesagt:** Das Programm kann richtig rechnen und seine Zahl trotzdem
  unter einem missverständlichen Etikett ausgeben.
- **Folge:** MC-JSONs sind bis zur Versionierung und Korrektur dieser Felder
  nicht für unbegleitete maschinelle Weiterverarbeitung geeignet.

### F-03 – Gute Erfolgsquoten können von günstigen Annahmen dominiert werden (hoch)

Ein konkret geprüfter 10.000-Läufe-MC-Lauf zeigte 0 Prozent Ruin und 100 Prozent
Floor-Deckung. Die adversariale Nachprüfung ergab jedoch, dass unter anderem
früher Rentenbeginn, Recency-Gewichtung, deaktivierter Tail-Risk-Stress und eine
geringe Quote ungünstiger Regime das Ergebnis stark begünstigten. In vielen
Jahren deckten die Renten den Floor vollständig; damit sagte die Floor-KPI nur
wenig über die Portfoliostrategie aus.

- **IT-Sicht:** Der Algorithmus reproduziert die Eingaben; das Risiko entsteht
  durch Szenariodesign, Sampling und Interpretation.
- **Einfach gesagt:** Eine grüne Erfolgsampel kann heißen, dass günstige Renten-
  und Marktannahmen gewählt wurden – nicht, dass das Depot besonders robust ist.
- **Folge:** Mindestens Uniform-/CAPE-/Stress-/Tail- und Mehrseed-Gegenläufe
  sowie eine Prüfung realer Rentenunterlagen sind vor Entscheidungen Pflicht.

### F-04 – Schutzmechanismen können im konkreten Pfad weniger schützen als ihr Name vermuten lässt (hoch)

Die Laufanalyse zeigte im Worst Case:

- ein nominelles Fünfjahres-Runway-Ziel, obwohl nach Auszahlung neun Jahre lang
  keine Jahresendliquidität vorhanden war;
- eine aktive Goldzielquote bei Startbestand null, wobei im Worst Case nie Gold
  aufgebaut wurde;
- eine Mindest-Flex-/Glättungskette, die das starke Guardrail-Kürzungssignal im
  ersten Crashjahr weitgehend wieder anhob.

Das sind teilweise bewusste Policies und keine bloßen Rechenfehler. Die Namen
`Runway`, `Goldziel` und `Guardrail` können Nutzer dennoch zu einer stärkeren
Schutzwirkung verleiten, als im Pfad tatsächlich vorhanden ist.

- **Einfach gesagt:** Ein Zielwert ist noch kein vorhandener Puffer. Eine
  Goldquote ist noch kein Goldbestand. Eine Schutzregel kann von einer späteren
  Komfortregel wieder abgeschwächt werden.
- **Folge:** Startallokation, Mindestliquidität und die Priorität von Guardrail,
  Mindest-Flex und Glättung benötigen bewusste Sollentscheidungen.

### F-05 – Vereinfachungen bei Steuer, Kosten, FX, Bonds und Gold sind materiell (hoch bis mittel)

- Eine vollständige persönliche Einkommensteuer auf gesetzliche, betriebliche
  und private Renten wird ebenso wenig automatisch berechnet wie Kranken- und
  Pflegeversicherungsbeiträge. Die Renten-/Cashflow-Werte müssen deshalb vom
  Nutzer fachlich korrekt als Szenario- beziehungsweise Nettowerte gepflegt
  werden.
- Die Kirchensteuerformel ist als konservative Vereinfachung dokumentiert und
  weicht von der gesetzlichen Formel ab.
- Negative Cashzinsen können im aktuellen Modell eine sofortige Steuergutschrift
  erzeugen.
- TER, Spreads, Slippage und laufende Produktkosten fehlen als eigene Cashflows.
- Fremdwährungsrisiken werden nicht modelliert; akzeptierte Quotes müssen EUR
  sein.
- Der Bond-Bucket nutzt einen Cash-/Geldmarktproxy und modelliert weder Duration,
  Bonität, Kupon noch Zinskurve.
- Goldsteuerfreiheit ist ein Nutzerflag und hängt in der Realität vom konkreten
  Instrument und der Haltedauer ab.

- **Einfach gesagt:** Die Steuer-, Sozialabgaben- und Produktwelt ist
  absichtlich vereinfacht. Bei Renten können schon die nicht automatisch
  berechneten laufenden Abzüge groß sein; kleinere Kostenabweichungen summieren
  sich zusätzlich über Jahrzehnte.
- **Folge:** Nettoergebnisse konservativ lesen und konkrete Instrumente sowie
  Renten-, Kranken-/Pflegeversicherungs- und Steuerdaten extern prüfen.

### F-06 – Historische Daten sind transparent, aber keine investierbare Gesamtmarkt-Wahrheit (mittel)

Die Datenketten sind mit Quellen, Hashes, Generatoren, Missingness und
Rekonstruktionsgrenzen außergewöhnlich gut dokumentiert. Gleichzeitig nutzt
die Aktienreihe 1925–1950 einen USD-Forschungsproxy und 2021–2025 einen
eingefrorenen Dividendenbaustein. Die Cash-, Gold-, Lohn- und CAPE-Reihen haben
weitere dokumentierte Proxy-, Nahtstellen- und Übertragbarkeitsgrenzen. Die
Historie war während der Entwicklung sichtbar und ist daher kein unangetasteter
Bestätigungsdatensatz.

- **Einfach gesagt:** Man weiß sehr genau, woher die Daten kommen. Das macht sie
  nachvollziehbar, aber noch nicht identisch mit dem ETF, den ein Nutzer hält.
- **Folge:** Keine Anbieterindex-Gleichheit oder künftige Eintrittsquote
  behaupten; Teilperioden und alternative Annahmen vergleichen.

### F-07 – Pflege und Langlebigkeit sind nützlich modelliert, aber nicht individuell kalibriert (mittel)

Die Suite unterstützt Pflegegrade, Progression, zwei Personen, Pflegekosten,
Mortalitätswirkung und einen separaten Pflegebucket. Die Eintritts-,
Progressions-, Dauer- und Kostengrößen sind jedoch nicht gemeinsam extern
kalibriert. Die Mortalität basiert auf einer Periodensterbetafel ohne künftige
Verbesserung und ist keine individuelle Gesundheitsprognose. Der Pflegebucket
ist keine Versicherung und wird nicht automatisch wieder aufgefüllt.

- **Einfach gesagt:** Die Funktion hilft, Pflege als Risiko nicht zu vergessen.
  Sie kann nicht vorhersagen, wer wann wie lange pflegebedürftig wird.
- **Folge:** Pflegekosten breit stressen und Versicherungs-/Leistungsansprüche
  separat prüfen.

### F-08 – Reale Ausführung bleibt bewusst manuell und kann vom Plan abweichen (mittel)

Die Trennung zwischen Vorschlag und Brokerausführung ist sicher und sinnvoll.
Ein bestätigter Reconcile entfernt Lots und protokolliert Nettoerlös und Gebühr,
bucht den Verkaufserlös aber nicht automatisch in die freie Liquidität. Dieser
offene Accounting-Entscheid ist dokumentiert.

- **Einfach gesagt:** Nach dem Verkauf muss der Nutzer den tatsächlichen
  Cashbestand selbst sauber nachführen.
- **Folge:** Ohne disziplinierten Abgleich können App und Broker trotz korrekter
  Empfehlung auseinanderlaufen.

### F-09 – Hohe Funktionsdichte und Ergebnisverdichtung erhöhen das Fehlbedienungsrisiko (mittel)

Die visuelle Prüfung zeigte eine saubere, moderne und grundsätzlich verständliche
Oberfläche mit Tabs, Akkordeons, Statushinweisen und einem ausführlichen
Handbuch. Gleichzeitig enthält die Balance-Seite rund 66 und der Simulator rund
149 Eingabe-, Auswahl- oder Textfelder. Begriffe wie VPW, CAPE, Runway,
Stationary Bootstrap, Tail Overlay und Quantile verlangen erhebliches
Finanz- und Methodenverständnis.

Das Handbuch ist hilfreich, aber mit 79 Überschriften und einer sehr langen
Einzelseite selbst umfangreich. Eine formale WCAG-/Screenreader-Prüfung fehlt.

In dem ausgewerteten MC-Lauf wurde die reale Depotentnahme P10 von 13.331 Euro
im Export in der Oberfläche als geglättete 15.000 Euro dargestellt. Die
beabsichtigte Anti-Pseudogenauigkeit überzeichnete die sicherheitskritische
Downside-Kennzahl damit um 12,5 Prozent. Außerdem wird der nominelle
Portfolio-Drawdown prominenter ausgewiesen als der für die Kaufkraft relevante
reale Drawdown; im geprüften Lauf lagen beide deutlich auseinander.

- **Einfach gesagt:** Die Suite sieht aufgeräumt aus, ist aber kein
  selbsterklärender Taschenrechner. Auch eine leichter lesbare, gerundete Zahl
  kann im ungünstigen Fall zu freundlich wirken.
- **Folge:** Presets, Guided Tours, Ergebniswarnungen sowie die parallele
  Anzeige von exaktem und gerundetem Wert sind wichtig; ein Anfänger sollte
  Parameter nicht ohne Erklärung optimieren.

### F-10 – Der dokumentierte Portfolio-Scope deckt typische Haushaltskomplexität nur teilweise ab (mittel)

Die Suite ist bewusst auf ein vergleichsweise einfaches, passives
EUR-Portfolio zugeschnitten. Immobilien, Darlehen, Fremdwährungen, komplexe
Riester-/Rürup-/Betriebsrenten-Auszahlungsregeln, Erbschaften und Schenkungen
sowie frei terminierbare Einmalereignisse sind nicht als vollwertige eigene
Modelle vorhanden. Renten werden nicht aus Versicherungs- oder
Rentenübersichtsdaten automatisch aggregiert. Ein echter Vergleich gespeicherter
Gesamtpläne wie „Rente mit 63“ gegen „Rente mit 67“ muss über getrennte Läufe und
manuelle Dokumentation erfolgen.

- **Einfach gesagt:** Für ETF, Cash, optional Gold und einen einfachen
  Bond-Bucket ist viel vorhanden. Ein typischer Haushalt besteht oft zusätzlich
  aus Haus, Kredit, mehreren Rentenarten und größeren Einzelereignissen.
- **Folge:** Diese Größen müssen als externe Nettoannahmen, vereinfachte
  Cashflows oder getrennte Szenarien ergänzt werden; andernfalls ist das
  Haushaltsbild unvollständig.

### F-11 – Wartbarkeit ist gut strukturiert, aber nicht durchgehend leicht (mittel)

Die Verzeichnis- und Modulgrenzen sind klar. Deterministische Engine,
DOM-freie Runner, Worker-Parität und versionierte Verträge sind starke
Architekturmerkmale. Dem stehen sehr große Einzeldateien gegenüber, unter
anderem `engine/core.mjs` mit rund 1.634 Zeilen und
`balance-binder-imports.js` mit rund 1.527 Zeilen. Es gibt weder ESLint noch
einen projektweiten strikten TypeScript-/`checkJs`-Lauf; der vorhandene
TypeScript-Config-Scope umfasst nur `types/` und ist nicht strikt.

- **Einfach gesagt:** Das Haus hat sinnvolle Zimmer, einige Zimmer sind aber
  inzwischen sehr voll.
- **Folge:** Änderungen bleiben trotz Tests review-intensiv; statische
  Typprüfung und weitere Zerlegung würden das Fehlerrisiko senken.

### F-12 – Security ist gehärtet, aber nicht auf Hochsicherheitsniveau (mittel)

Positiv sind die beseitigten XSS-/SSRF-/NaN-/Importprobleme, die lokalen
Dateigrenzen, Import-Validierung, Recovery und der geringe npm-Abhängigkeitsumfang.
Verbleibend:

- Die Tauri-CSP erlaubt `unsafe-inline` und `unsafe-eval`; zusätzlich ist
  `dangerousDisableAssetCspModification` aktiviert.
- Finanzdaten liegen lokal im Klartext und sind für den angemeldeten
  Betriebssystemnutzer beziehungsweise Browser-Erweiterungen erreichbar.
- Der Yahoo-Proxy akzeptiert jeden localhost-/127.0.0.1-Origin und besitzt
  keine Authentisierung, bindet aber nur an Loopback.
- Ein regelmäßiges automatisiertes `cargo audit` ist nicht als CI-Gate
  vorhanden.

- **Einfach gesagt:** Für eine persönliche Offline-App ist der Schutz
  ordentlich. Bei gemeinsam genutzten oder kompromittierten Rechnern sind die
  Daten nicht geheim.
- **Folge:** Lokales Geräteschutz-, Backup- und Vertraulichkeitskonzept bleibt
  Nutzeraufgabe.

### F-13 – CI, Release und Dokumentation sind nicht vollständig synchron (mittel)

Die CI führt `npm run test:coverage` aus, nicht jedoch das separate
Browser-Gate, die Rust-Tests oder einen echten Tauri-Build. Der manuelle
Releasepfad prüft einen sauberen Commit, erzeugt `dist` reproduzierbar und
archiviert die Vorgänger-EXE, erzwingt aber nicht selbst die vollständige
Node-/Browser-Testfolge.

Dokumentation und Evidenzführung sind überdurchschnittlich, zeigen aber Drift:

- README-Dokumentationsstand 2026-07-28 trotz Änderungen bis 2026-08-04;
- `CHANGELOG.md` endet am 2026-02-15;
- `tests/README.md` nennt 166 Dateien und 18.822 Assertions statt aktuell 167
  und 18.977;
- npm-Version `1.0.0` und Tauri-Version `0.1.0` sind nicht synchron;
- die npm-Beschreibung enthält tatsächlich doppelt kodierte Umlaute;
- 220 archivierte interne Dokumente liefern hohe Nachvollziehbarkeit, erhöhen
  aber Such- und Pflegeaufwand.

- **Einfach gesagt:** Viel ist dokumentiert, aber der aktuelle Release lässt
  sich nicht an genau einer Stelle vollständig ablesen.
- **Folge:** Ein einziges verpflichtendes Release-Gate und konsistente
  Versions-/Changelog-Pflege würden die Betriebsreife deutlich erhöhen.

## 4. Technische Bewertung – 50 Prozent der Gesamtnote

| Teilgebiet | Gewicht im Technikblock | Bewertung | Begründung |
| --- | ---: | ---: | --- |
| Architektur und Verantwortungsgrenzen | 14 % | 88 % | klare Schichten, modulare Engine, DOM-freie Runner, Worker und versionierte Verträge; einzelne große Orchestratoren bleiben |
| Implementierung und Wartbarkeit | 14 % | 78 % | gute Modulstruktur und geringe Abhängigkeiten; große Dateien, kein Lint-Gate und keine projektweite strikte Typprüfung |
| Contracts und Datenintegrität | 14 % | 86 % | starke Fail-closed-, Reconciliation-, Provenienz- und Missingness-Ansätze; bestätigte MC-Export-/Einheitenfehler verhindern eine höhere Note |
| Tests und Qualitätssicherung | 20 % | 93 % | 18.977 grüne Assertions, 29 Browserflows, 78,88 % Coverage, Paritäts- und Negativtests; Browser/Rust/Tauri nicht gemeinsam in CI |
| Persistenz, Backup und Recovery | 10 % | 92 % | Adapter-Fassade, Snapshot-Archiv, Quarantäne, raw-preserving Recovery und explizite Resetpfade |
| Sicherheit und Datenschutz | 10 % | 76 % | frühere kritische Findings behoben; CSP-Ausnahmen, Klartextdaten und fehlende Security-CI bleiben |
| Build, Release und CI | 8 % | 72 % | saubere Runtime-Provenienz und kontrollierter manueller Windows-Build; getrennte, nicht vollständig erzwungene Gates und Versionsdrift |
| Dokumentation und Traceability | 10 % | 87 % | außergewöhnlich detaillierte Architektur-, Daten-, Markt- und Forschungsregister; Aktualitätsdrift und Dokumentmenge begrenzen die Nutzbarkeit |

**Gewichtetes Ergebnis Technik: 85,1 Prozent, gerundet 85 Prozent.**

Einordnung für IT-Laien: 85 Prozent bedeutet nicht „15 Prozent der Rechnungen
sind falsch“. Es bedeutet: Die technische Basis ist stark, aber Releaseprozess,
statische Prüfung, Sicherheitskonfiguration und einige Ergebnisverträge sind
noch nicht auf dem Niveau eines unabhängig zertifizierten Finanzprodukts.

## 5. Fachliche Eignung und Umsetzung – 50 Prozent der Gesamtnote

| Teilgebiet | Gewicht im Fachblock | Bewertung | Begründung |
| --- | ---: | ---: | --- |
| Zielgruppenfit und Scope-Klarheit | 10 % | 88 % | geeignete und ungeeignete Portfolios werden offen abgegrenzt; starke Passung für passive EUR-ETF-Haushalte |
| Haushalts- und Lebenszyklusplanung | 15 % | 84 % | Ansparphase, bis zu zwei Personen, Renten, Witwenpfad, Floor/Flex und Pflege; keine vollständige Ereignisliste, Immobilien-, Schulden- oder freie Multi-Asset-Planung |
| Entnahme-, Liquiditäts- und Transaktionsplanung | 20 % | 88 % | sehr tiefe Guardrail-, VPW-, Runway-, Tranchen-, Steuer- und 3-Bucket-Logik; Schutzwirkung einzelner Policies und Reconcile-Cashbuchung bleiben offen |
| Risiko-, Szenario- und Sensitivitätsanalyse | 15 % | 82 % | MC, Backtest, Cohorts, Bootstrap, Stress, Tail, Sweep und Optimizer sind breit; In-sample-, Sampling-, KPI- und Exportgrenzen sind materiell |
| Deutsche Steuer-, Renten- und Pflegeeignung | 15 % | 68 % | deutlich näher am deutschen Haushalt als viele allgemeine Tools; dennoch keine vollständige Rentensteuer-/KV-/PV-Rechnung, manuelle Rentenwerte und unkalibrierter Pflegeprozess |
| Datenbasis und wissenschaftliche Belastbarkeit | 15 % | 64 % | sehr gute Transparenz und Reproduzierbarkeit; Proxyketten, Heuristiken, Data-Snooping und fehlende V4/V5-Validierung begrenzen Prognoseaussagen |
| Laufende Durchführung im Ruhestand und Bedienbarkeit | 10 % | 80 % | Jahresabschluss, Ausgabenimport, Snapshots, Live-Daten-Fallbacks und Reconcile sind praktisch; hoher Bedienaufwand, manuelle Broker-/Cashpflege und keine Automatisierung |

**Gewichtetes Ergebnis Fachlichkeit: 79,1 Prozent, gerundet 79 Prozent.**

Einordnung für Fach-Laien: 79 Prozent bedeutet, dass die Suite sehr viele
relevante Fragen stellt und Varianten sauber durchrechnet. Die verbleibenden 21
Prozent betreffen vor allem reale Welt, Kalibrierung und Vollständigkeit – also
genau die Bereiche, in denen ein technisch korrektes Modell am ehesten eine
falsche Sicherheit erzeugen kann.

## 6. Gesamtnote

| Hauptblock | Gewicht | Ergebnis | Beitrag zur Gesamtnote |
| --- | ---: | ---: | ---: |
| Technische Umsetzung, Dokumentation und Tests | 50 % | 85 % | 42,5 Punkte |
| Fachliche Eignung, Planung und Durchführung | 50 % | 79 % | 39,5 Punkte |
| **Gesamt** | **100 %** |  | **82 Prozent** |

**Gesamtnote: 82 von 100 Prozent – gut, mit starker technischer Absicherung und
klaren fachlichen Einsatzgrenzen.**

Mit den ungerundeten Blockwerten beträgt das Ergebnis 82,12 Prozent; als
ganzzahlige Gesamtnote sind das 82 Prozent. Es gibt keine zusätzliche
Ermessensstrafe. Die bestätigten MC-Exportprobleme und die fehlende externe
Validierung sind bereits in den jeweiligen Teilnoten berücksichtigt.

## 7. Eignung nach Nutzungssituation

| Nutzung | Urteil |
| --- | --- |
| Persönliche DIY-Planung eines finanzkundigen Nutzers im dokumentierten ETF-/Cash-/Gold-/Bond-Scope | gut geeignet |
| Vergleich von Entnahme-, Runway-, Pflege- und Stressannahmen | gut geeignet, wenn mehrere Gegenläufe und alle Ergebnisdimensionen gelesen werden |
| Operative jährliche Ruhestandsroutine | bedingt gut geeignet; Broker-, Cash-, Renten- und Steuerwerte müssen manuell reconciliert werden |
| Alleinige Entscheidung über Ruhestandsbeginn oder dauerhaft tragbaren Lebensstandard | nicht ausreichend |
| Vollständige deutsche Steuer-, Sozialabgaben-, Renten- oder Pflegeberatung | nicht geeignet |
| Komplexe Vermögen mit Immobilien, Firmen, Krediten, Derivaten, Krypto oder mehreren Währungen | nicht geeignet |
| Unbegleitete externe Auswertung der aktuellen MC-JSON-Exporte | bis zur Korrektur/Versionierung der Semantikprobleme nicht geeignet |
| Automatische Broker- oder Vermögensverwaltung | nicht vorgesehen und nicht geeignet |

## 8. Prioritäten für die nächste Qualitätsstufe

### Priorität 1 – vor externer oder maschineller Ergebnisnutzung

1. MC-Heatmap-Bins korrekt und versioniert benennen.
2. Renditefelder eindeutig als Ratio oder Prozentpunkte versionieren.
3. Entnahmequoten nach Zweck, Nenner und Messzeitpunkt trennen.
4. `null`, Missingness und Nichtanwendbarkeit im Export konsistent machen.
5. Nominalen und realen Drawdown eindeutig trennen.
6. Terminale Todesrecords als eigenen Recordtyp markieren.

### Priorität 2 – fachliche Sollentscheidungen

1. Priorität von Guardrail, Mindest-Flex und finaler Glättung festlegen.
2. Mindestliquidität in lang andauernden Krisen definieren.
3. Entscheiden, ob eine Goldzielquote einen Startbestand voraussetzt.
4. Kirchensteuer- und Negativzinsbehandlung fachlich korrigieren oder noch
   deutlicher als konservative Näherung begrenzen.
5. Reconcile-Entscheid zur automatischen oder bewusst manuellen Cashbuchung
   schließen.
6. Verbindlich definieren, ob Renten als Brutto- oder bereits um persönliche
   Einkommensteuer sowie KV/PV bereinigte Nettozuflüsse einzugeben sind, und
   dies in Eingabemaske, Vertrag und Handbuch identisch ausweisen.

### Priorität 3 – Validierung und Produktreife

1. Unabhängige Reviews für Steuer, Aktuariat/Pflege und historische
   Kapitalmarktdaten beauftragen.
2. Gegenläufe mit Uniform-/CAPE-Sampling, Stress, Tail-Risk, mehreren Seeds und
   verlängertem Langlebigkeitshorizont als dokumentiertes Pflichtprotokoll
   etablieren.
3. Browser-, Rust- und Tauri-Gates in eine gemeinsame Releasepipeline aufnehmen.
4. Projektweite statische Prüfung/Linting einführen und große Orchestratoren
   weiter zerlegen.
5. Versionsstände, Changelog, Teststatistik und Release-Metadaten synchronisieren.
6. Formale WCAG-/Screenreader- und Einsteiger-Usability-Prüfung durchführen.

## 9. Pre-Mortem

**Angenommen, die Suite verursacht in drei Monaten eine falsche reale
Ruhestandsentscheidung: Was ist die wahrscheinlichste Ursache?**

Am wahrscheinlichsten ist kein spontaner Rechencrash, sondern eine Kette aus
korrekter Technik und falscher Deutung:

1. Ein Nutzer übernimmt einen frühen oder zu hohen Rentenstrom, günstiges
   Sampling und deaktivierte Stressannahmen.
2. Die Suite berechnet darauf reproduzierbar 0 Prozent Ruin beziehungsweise
   hohe Floor-Deckung.
3. Die Zahl wird als Strategieerfolg statt als bedingtes Modellergebnis gelesen.
4. Mindest-Flex und Glättung schwächen im ersten realen Crash die erwartete
   Guardrail-Wirkung; der nominelle Runway ist nicht tatsächlich vorhanden.
5. Eine externe MC-Auswertung verschärft die Fehlinterpretation durch die
   aktuellen Bin-, Einheiten- oder Quotendefinitionsfehler.
6. Nach realen Verkäufen wird der Cashbestand nicht vollständig reconciliert,
   sodass App- und Brokerzustand auseinanderlaufen.

Der wahrscheinlichste Schaden wäre daher kein Totalverlust durch einen
einzelnen Softwarebug, sondern ein zu früher Ruhestandsbeginn oder ein zu hoher
Lebensstandard auf Basis einer überinterpretierten Erfolgsquote. Die wichtigste
Gegenmaßnahme ist ein verpflichtendes Entscheidungsprotokoll aus realen
Unterlagen, mehreren adversarialen Gegenläufen, fachlicher Plausibilisierung und
anschließendem jährlichem Broker-/Cash-Reconcile.

## 10. Schlussfolgerung

Die Härtungsmaßnahmen waren wirksam: Sie haben die Suite von einem großen,
funktionsreichen Rechner zu einem technisch nachvollziehbaren, testbaren und
recoverbaren persönlichen Planungssystem weiterentwickelt. Besonders stark ist,
dass Modellgrenzen, Provenienz und offene Entscheidungen nicht versteckt werden.

Der nächste Qualitätssprung entsteht deshalb nicht primär durch noch mehr
Funktionen oder noch mehr Assertions. Er entsteht durch die Korrektur der
verbleibenden Ergebnisverträge, ein geschlossenes Release-Gate und unabhängige
fachliche Validierung der wenigen Annahmen, die reale Entscheidungen am stärksten
bewegen: Rentenbeginn und Nettozuflüsse, Marktrenditen und Sampling, Pflege- und
Langlebigkeitsmodell, Steuer-/Kostenannahmen sowie die Priorität der
Entnahme-Schutzregeln.
