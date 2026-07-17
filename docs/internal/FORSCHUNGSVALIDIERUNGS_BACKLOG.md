# Forschungsvalidierungs-Backlog

**Stand:** 2026-07-17  
**Status:** operationalisiert, vollständig offen  
**Owner des Backlogs:** Nutzer für Priorität und Freigaben; Codex für eine
später ausdrücklich beauftragte Umsetzung; unabhängiger Methodikreview für
V4-/V5-Aussagen  
**Normative Quellen:**
[Architektur und Fachkonzept](../reference/ARCHITEKTUR_UND_FACHKONZEPT.md#e6-forschungs--und-modellrisiken)
und
[Forschungs-Evidenzregister](../reference/FORSCHUNGSABGLEICH_EVIDENZREGISTER.md)

## 1. Zweck und Statusgrenze

Dieser Backlog übersetzt FR-01 bis FR-12 und FQ-01 bis FQ-10 in getrennte,
ausführbare Folgevorhaben. Er ist ein Steuerungsartefakt, kein
Wirksamkeitsnachweis. Alle FR- und FQ-Einträge bleiben offen, bis ein eigenes,
vorab freigegebenes Arbeitsdokument den geforderten Nachweis erbracht, ein
unabhängiger Review ihn bewertet und Nutzer sowie Reviewer die
Rückdokumentation freigegeben haben.

Der Backlog verändert weder den Evidenzstatus eines MAP-Dossiers noch eine
Produkt-, Parameter- oder Empfehlungsaussage. Ein negatives, instabiles oder
nicht replizierbares Ergebnis ist ein gültiges Ergebnisartefakt und darf nicht
durch nachträgliche Auswahl günstiger Seeds, Teilperioden oder Zielgrößen
ersetzt werden.

### 1.1 Zulässige Nachweisstufen

| Stufe | Bedeutung | Zulässige Kurzform |
| --- | --- | --- |
| FV0 | Paket beschrieben, aber noch nicht gestartet | `geplant` |
| FV1 | Frage, Baseline, Eingaben, Auswertung und Abbruchregeln vor Einsicht in Holdouts eingefroren | `Protokoll eingefroren` |
| FV2 | Implementierung und In-sample-/Simulationslauf reproduzierbar; V1–V3 grün | `technisch getestet` oder `im gewählten Szenario beobachtet` |
| FV3 | vorab gesperrter Holdout genau nach Protokoll ausgewertet und Kontamination offengelegt | `im definierten Holdout beobachtet` |
| FV4 | Methoden-, Daten- und Ergebnisartefakte unabhängig vom Implementer geprüft | `methodisch geprüft` |
| FV5 | Ergebnis mit unabhängigem Code oder unabhängiger Datenaufbereitung repliziert | `unabhängig repliziert` |

FV2 oder FV3 allein erlauben keine allgemeine Aussage wie „verbessert
Robustheit“, „senkt Risiko“, „optimiert Entnahmen“, „ist sicher“ oder „ist für
deutsche Haushalte geeignet“. Eine eng auf Population, Datenstand,
Kosten-/Steuervertrag, Horizont, Policy, Holdout und Ergebnisbündel begrenzte
Wirksamkeitsaussage darf frühestens nach FV4 vorgeschlagen werden. Eine
Übertragbarkeitsaussage über den geprüften Datenraum hinaus benötigt FV5 oder
eine ausdrücklich dokumentierte externe Evidenzsynthese.

### 1.2 Rollen- und Freigabevertrag

- Der **Nutzer** benennt vor Start jedes Pakets eine konkrete fachliche
  Owner-Person oder übernimmt diese Rolle ausdrücklich. Ohne benannten Owner
  bleibt das Paket FV0.
- **Codex** darf nach ausdrücklichem Auftrag das Arbeitsdokument und die
  technische Umsetzung erstellen, aber weder Methodik noch eigene Ergebnisse
  selbst freigeben.
- Der **Methodikreview** muss von einer Person oder Instanz erfolgen, die
  nicht die auszuwertende Variante ausgewählt hat. Gemini/Claude können den
  technischen und dokumentarischen Review unterstützen; ein externer
  Fachreview bleibt dort nötig, wo die FR-Matrix ihn nennt.
- Der **Holdout-Custodian** kontrolliert Sperre, Freigabe und
  Kontaminationsprotokoll. Implementer dürfen vor FV1 keine Ergebnisansicht
  des bestätigenden Holdouts erhalten.
- Jede Statusanhebung und jede neue Wirksamkeitsformulierung ist ein eigener
  Freigabepunkt für Nutzer und Reviewer.

## 2. Gemeinsame Eingangsgates

Kein Forschungspaket darf in die bestätigende Auswertung wechseln, bevor alle
für das Paket markierten Gates erfüllt sind.

| Gate | Pflichtartefakt | Mindestinhalt | Abbruchbedingung |
| --- | --- | --- | --- |
| FV-G01 Baseline und Protokoll | versioniertes Studienprotokoll | Frage, Hypothese, unveränderte Baseline, Population, Horizont, Policies, primäre/sekundäre Metriken, Schwellen, Seeds, Auswertung und Abbruchregeln | Ergebnis, Holdout oder bevorzugte Variante wurde vor dem Freeze eingesehen |
| FV-G02 Datenmanifest | maschinenlesbares Manifest plus lesbare Erläuterung | Serien-ID und genaue Variante, Price/Net/Gross TR, Währung, Region, Frequenz, Zeitraum, Quelle/Lizenz, Abruf- und Datenstand, Transformationen, geschätzte Jahre, Revision/Hash und Holdout-Zuordnung | Indexvariante, Nutzungsrecht, Transformation oder geschätzter Abschnitt bleibt unklar |
| FV-G03 Kosten-/Steuervertrag | versionierter Annahmenvertrag | Produktkosten, Transaktionskosten, Spread, FX, Rebalancing, Steuerumfang, Inflation, Währung, konstante oder zeitabhängige Werte und Sensitivitätsband | ein Ergebnis wird mit anderer Kosten-/Steuerbasis verglichen oder Rechtsvollständigkeit nur unterstellt |
| FV-G04 Produktverträge | Nachweis PD-01/PD-02 und Parameterwörterbuch | echte Realwertfortschreibung aus Slice 6; einmalige In-memory-Prozentnormalisierung aus Slice 7; klare Einheiten jeder Eingabe und Metrik | Real/Nominal oder Prozent/Verhältnis ist zwischen UI, Profil, Runner, Worker oder Auswertung uneinheitlich |
| FV-G05 vollständiges Trial-Log | append-only Trial-Register | Hypothese, Kandidatenraum, Trial-ID, Zeit, Code-/Daten-/Protokollhash, Parameter, Seed, Stufe, Ergebnis, Fehler, Abbruch und Nutzerinteraktion; auch verworfene/fehlgeschlagene Trials | ein Versuch, manuelles Nachjustieren oder betrachtetes Ergebnis fehlt; Log kann nachträglich überschrieben werden |
| FV-G06 Holdout-Register | gesperrtes Partitionierungs- und Freigabeprotokoll | Entwicklungsdaten, innerer Validierungssplit, bestätigender Zeit-/Länderholdout, Sperrzeitpunkt, Custodian, einmalige Entsperrung, erlaubte Auswertung und Kontaminationshistorie | Holdout wurde zur Regel-, Parameter-, Metrik- oder Schwellenwahl betrachtet; er wird dann explorativ und ein neuer Holdout ist nötig |
| FV-G07 Ergebnisbündel | reproduzierbares Ergebnisverzeichnis | Floor-Shortfall, Flex-Kürzung, Liquiditätslücke, Stressdauer, Steuer, Pflege, Restvermögen, Unsicherheit/Stabilität sowie negative und instabile Resultate | nur Erfolgsquote, Champion oder Median wird berichtet; Fehler/Abbrüche werden aus dem Nenner entfernt |
| FV-G08 Reproduktion und Review | Befundbericht und Reviewprotokoll | exakter Laufbefehl, Umgebung, Versionen, Hashes, Roh-/Aggregatartefakte, Abweichungsanalyse, Methodenreview und gegebenenfalls unabhängige Replikation | Ergebnis ist aus Artefakten nicht reproduzierbar oder Reviewer hatte an Auswahl und Implementierung maßgeblichen Anteil |

`docs/reference/DATA_SOURCES.md` ist heute eine Laufzeit- und
Provenienzreferenz, aber noch kein FV-G02-Forschungsmanifest: insbesondere ist
die genaue `msci_eur`-Variante offen. Ebenso ist der bestehende Train-/Test-
Seed-Split des Auto-Optimizers kein externer Holdout, weil Datenkorpus und
Generator identisch bleiben. Diese Lücken dürfen nicht durch neue Begriffe
kaschiert werden.

## 3. Scope-Regel für alle Folgepakete

Jedes FQ-Paket ist ein eigenes Arbeitsdokument unter `docs/internal/` und
beginnt auf einem eigenen, im Arbeitsdokument benannten Feature-Branch. Vor
Programmänderungen werden Branch, Status, Baseline, erwartete Dateien und
Diff-Risiko dokumentiert und der Plan reviewt sowie freigegeben.

Ein Umsetzungsslice darf höchstens zehn Programmdateien einschließlich HTML,
JSON-Konfiguration und Tests ändern. Überschreitet die Aufruferinventur diese
Grenze oder berührt sie Engine-Semantik, wird das Paket vor Coding in weitere
1-basierte Slices geteilt oder gestoppt. Die unten genannten Dateien sind eine
Planungsgrenze, keine Änderungsfreigabe. `engine.js`, `dist/` und
`RuheStandSuite.exe` bleiben generierte Nicht-Ziele.

## 4. Priorität 1

### FV-P01 / FQ-01 – Return-, Kosten- und internationale Datenbasis

| Feld | Vertrag |
| --- | --- |
| Frage | Wie ändern exakt definierte Return-Indizes, Kosten und internationale Daten die Entnahmeergebnisse? |
| Reduziert | FR-01, FR-02 und den daten-/kostenseitigen Anteil von FR-03 |
| Fachlicher Owner | vom Nutzer zu benennender Daten- und Kapitalmarktmethodik-Owner; externe Steuer-/Rechtsprüfung für den Steuer-/Rechtsanteil von FR-03 |
| Eingaben | aktueller historischer Datensatz, Primärquellen und Lizenzen, Datenmanifest FV-G02, Kosten-/Steuervertrag FV-G03, PD-01-Nachweis, eingefrorene Baseline, vorab definierte Länder und Teilperioden |
| Nächster ausführbarer Schritt | genaue Variante und Transformation jeder bestehenden Serie inventarisieren; fehlende Felder des Manifests als `unresolved` erfassen; erst danach ein separates Import-/Vergleichsarbeitsdokument erstellen |
| Mindestnachweis | reproduzierbarer Baselinevergleich über vorab definierte Regionen/Teilperioden, mindestens ein Kosten-Sensitivitätsband, identische Haushaltsinputs und Ergebnisbündel FV-G07; geschätzte Jahre separat; negative Resultate enthalten |
| Ergebnisartefakte | Datenmanifest und Hashes, Lizenz-/Nutzungsnotiz, Transformationsprotokoll, Kosten-/Steuervertrag, eingefrorenes Laufprotokoll, Roh-/Aggregatergebnisse, Datenqualitäts- und Methodenreview |
| Abbruchkriterien | genaue Indexvariante oder Nutzungsrecht ungeklärt; Transformation nicht reproduzierbar; Kostenbasis wechselt zwischen Läufen; bestätigender Holdout vorzeitig eingesehen; internationale Serie ist nicht ausreichend vergleichbar; unerwartete Engine-Semantikänderung nötig |
| Aussagegrenze | bis FV4 nur „unter diesen Daten-/Kostenannahmen beobachtet“; kein universeller Safe-Withdrawal- oder Deutschland-Übertragbarkeitsanspruch |

**Erwartete Programmdateien für einen ersten späteren Slice:**
`app/simulator/simulator-data.js`, ein neuer isolierter
Validierungsdaten-Adapter, `app/simulator/simulator-backtest.js` und höchstens
vier gezielte Test-/Manifestdateien. Monte-Carlo-, Worker- oder Engine-Pfade
werden in getrennte Slices verschoben. Bereits die Aufruferinventur kann die
Trennung verschärfen.

### FV-P02 / FQ-02 – Policyvergleich mit Trial-Logging und Holdouts

| Feld | Vertrag |
| --- | --- |
| Frage | Welche Guardrail-, VPW- oder CAPE-Verbesserungen halten auf unangetasteten Daten und Seeds? |
| Reduziert | FR-07, FR-08 sowie den Policyanteil von FR-01 |
| Fachlicher Owner | vom Nutzer zu benennender Validierungs-/Statistik-Owner; separater Holdout-Custodian |
| Eingaben | unveränderte Baselinepolicy, FQ-01-Manifest und Kostenvertrag, vollständiger Kandidatenraum, primäre Metriken, Trial-Log FV-G05, nested Zeit-/Länderholdouts FV-G06 und disjunkte Seeds |
| Nächster ausführbarer Schritt | Trial-Schema und Kontaminationsregeln dokumentieren; historische bereits betrachtete Varianten als explorativ markieren; noch unangetastete Daten vor jeglicher Optimizeränderung sperren |
| Mindestnachweis | alle einschließlich fehlgeschlagener Trials geloggt; Baseline und Kandidaten vor Holdout-Freigabe fixiert; innerer Split für Auswahl und äußerer Holdout nur einmal ausgewertet; Stabilitätsintervalle, Effektgrößen und vollständiges Ergebnisbündel berichtet |
| Ergebnisartefakte | Trial-Register, Kandidatenraum, Holdout-Register, Freigabeprotokoll, Baseline-/Championvergleich, Stabilitätsbericht, Kontaminationslog, Methodenreview und reproduzierbarer Lauf |
| Abbruchkriterien | Trial-Historie unvollständig; Testset wurde wiederholt betrachtet; Daten-/Generatorgleichheit wird als Unabhängigkeit ausgegeben; Baseline oder Metrik nach Entsperrung geändert; Serial-/Worker-Ergebnisse divergieren; Multiple-Testing-Risiko bleibt unbehandelt |
| Aussagegrenze | ein Train-/Test-Seed-Split aus demselben Generator bleibt FV2; belastbarere Policyaussagen benötigen echten gesperrten Zeit-/Länderholdout und FV4 |

**Erwartete Programmdateien für einen ersten späteren Slice:** ein neuer
`auto-optimize-trial-log.js`, `app/simulator/auto-optimize-evaluate.js`,
`app/simulator/auto-optimize-worker.js`, gegebenenfalls `workers/mc-worker.js`
und höchstens vier gezielte Tests. Holdout-Ausführung und UI-Darstellung sind
getrennte Folgeslices. Mehr als zehn Programmdateien oder eine Änderung der
Optimizer-Zielfunktion erzwingen einen neuen Entscheidungs-Slice.

### FV-P03 / FQ-03 – Shortfall-, Kürzungs- und Liquiditätsverteilungen

| Feld | Vertrag |
| --- | --- |
| Frage | Wie oft, tief und lange werden Floor, Flex und Runway verletzt? |
| Reduziert | FR-12 und die Erfolgsbegriffsgrenze aus FR-01 |
| Fachlicher Owner | vom Nutzer zu benennender Ergebnis-/Risikometrik-Owner |
| Eingaben | feste Definition von Floor-, Flex- und Liquiditätslücke; PD-01-Realwertvertrag; identische Jahreslogs, Seeds, Horizonte und Baseline; Ergebnisbündel FV-G07 |
| Nächster ausführbarer Schritt | Metrikwörterbuch mit Einheit, Vorzeichen, Aggregationsregel, Nenner, Perzentilen und Verhältnis zu `isRuin` erstellen; vorhandene Logs auf verlustfreie Ableitbarkeit prüfen |
| Mindestnachweis | deterministische Golden Cases für Höhe, Dauer und kumulierte reale Lücke; vollständige Verteilungen statt nur Mittel/Median; Serial-/Worker-/Chunk-Parität; Reconciliation von Jahreslog zu Aggregat; Fehlerläufe separat sichtbar |
| Ergebnisartefakte | Metrikwörterbuch, Golden-Case-Fixtures, Aggregations- und Paritätsbericht, Rohverteilungen, Visualisierungs-/Exportvertrag und Methodenreview |
| Abbruchkriterien | Jahreslog und Aggregat sind nicht reconciliierbar; Real-/Nominaleinheit unklar; Fehlerläufe verschwinden aus dem Nenner; Workerbuffer müsste ohne separaten Contract geändert werden; Metrik erfordert eine neue Ruin- oder Spending-Semantik |
| Aussagegrenze | neue Kennzahlen beschreiben Modellpfade; sie belegen weder individuelle Zumutbarkeit noch reale Eintrittswahrscheinlichkeit |

**Erwartete Programmdateien für einen ersten späteren Slice:**
`app/simulator/mc-run-metrics.js`,
`app/simulator/monte-carlo-aggregates.js`,
`app/simulator/monte-carlo-runner.js`, gegebenenfalls `workers/mc-worker.js`,
ein Ergebnis-Descriptor und höchstens vier Tests. Export/UI folgen separat,
wenn die Zehn-Dateien-Grenze sonst erreicht wird.

### FV-P04 / FQ-04 – Deutsches Pflegemodell kalibrieren

| Feld | Vertrag |
| --- | --- |
| Frage | Welche deutschen Quellen tragen Pflegeeintritt, Übergang, Dauer, Kosten, Leistungen und Mortalität? |
| Reduziert | FR-10; FR-09 nur für die explizit modellierte Pflegemortalität |
| Fachlicher Owner | vom Nutzer zu benennender Pflege-/Aktuariats-Owner; externer Methodikreview zwingend |
| Eingaben | getrennte amtliche oder belastbare Daten je Parameter, Population und Zeitraum; korrigierter PD-02-Einheitenvertrag; Kosten-/Leistungsdefinitionen; Alters-/Geschlechts-/Versorgungsformbezug; Datenschutz- und Nutzungsprüfung |
| Nächster ausführbarer Schritt | Parameterwörterbuch erstellen und jede heutige Annahme als Quelle, Transformation, Einheit, Population, Stand und Unsicherheit inventarisieren; Bestandsgrößen ausdrücklich von Eintritts-/Übergangsraten trennen |
| Mindestnachweis | reproduzierbare Kalibrierung pro Parameterkette; keine Ableitung individueller Inzidenz aus bloßem Bestand; PD-02-Parität; Zeit-/Regionssensitivität; getrennte Entwicklungs- und Prüfperiode; externe Pflege-/Aktuariatsprüfung |
| Ergebnisartefakte | Quellen- und Parameterregister, Transformationscode/-notiz, Kalibrierungsdiagnostik, Sensitivitäts- und Holdoutbericht, Einheiten-/Worker-Parität, externe Reviewantworten |
| Abbruchkriterien | Bestand wird als Inzidenz interpretiert; Populationen oder Leistungsbegriffe sind inkompatibel; Prozent wird erneut durch 100 geteilt; Datenrecht/Datenschutz ungeklärt; gemeinsame Kalibrierung nicht identifizierbar; Pflege- und allgemeine Mortalität werden doppelt gezählt |
| Aussagegrenze | selbst FV4 erlaubt nur populations- und datenstandsgebundene Szenarioaussagen; keine individuelle Pflegeprognose oder Beratung |

**Erwartete Programmdateien für einen ersten späteren Slice:** zunächst null
Produktdateien und höchstens Datenaufbereitungs-/Verifikationstests. Eine
anschließende Kalibrierung darf pro Slice höchstens
`app/simulator/simulator-input-care.js`,
`app/simulator/simulator-portfolio-care.js`,
`app/simulator/mc-life-events.js`, eine Engine-Helper-Grenze,
`workers/mc-worker.js` und bis zu fünf Tests berühren. Die tatsächliche
Aufruferinventur und jede Engine-Semantikänderung benötigen vorher einen
eigenen Entscheidungs-Slice.

## 5. Nachgelagerte Pakete

### FV-P05 / FQ-05 – Bootstrap-Blocklänge und Filter

- **Priorität / Owner:** 2; vom Nutzer benannter Zeitreihenmethodik-Owner.
- **Reduziert:** FR-04 und den Schwellenstabilitätsanteil von FR-05.
- **Eingaben:** FV-G01 bis FV-G03, unveränderte Jahresdaten, ACF-/Abhängigkeits-
  diagnostik, IID-/Moving-Block-/Stationary-Baselines und vorab definierte
  Blocklängen-/Filterbänder.
- **Nächster Schritt:** Diagnoseprotokoll und zulässiges Sensitivitätsraster
  einfrieren, bevor Ergebnisunterschiede betrachtet werden.
- **Ergebnisartefakte:** Abhängigkeitsdiagnostik, Sensitivitätsband,
  Samplervergleich, Stabilitätsbericht, negative Ergebnisse und
  Methodenreview.
- **Abbruch/Freigabegrenze:** Zu kurze Datenreihe, nachträgliche Blockwahl oder
  fehlende Serial-/Worker-Parität macht den Befund explorativ. Keine Aussage,
  ein Sampler sei „realistischer“, ohne FV4.
- **Planungsgrenze:** eigenes Arbeitsdokument; erster Slice höchstens
  `stationary-bootstrap-sampler.js`, `stationary-bootstrap-contract.js`,
  `mc-year-sampling.js`, ein Runner-/Workerpfad und vier Tests.

### FV-P06 / FQ-06 – Konsistente gemeinsame Tail-Szenarien

- **Priorität / Owner:** 2; Risiko-/Szenariomethodik-Owner plus unabhängiger
  Challenge-Reviewer.
- **Reduziert:** FR-06.
- **Eingaben:** FV-G01 bis FV-G04, explizite gemeinsame Aktien-, Gold-, Zins-,
  Inflations- und gegebenenfalls Pflegeschocks, dokumentierte Basisdaten,
  Skip-/Überlagerungsregeln und unveränderte Baseline.
- **Nächster Schritt:** Ereignistaxonomie und Doppelzählungsmatrix erstellen;
  Eintrittsrate, Schockhöhe und Dauer als Szenarioannahmen statt geschätzte
  Wahrscheinlichkeiten kennzeichnen.
- **Ergebnisartefakte:** Szenariokatalog, Abhängigkeitsmatrix,
  Challenge-Protokoll, Anti-Doppelpessimismus-Golden-Cases,
  Sensitivitätsbericht und Paritätsnachweis.
- **Abbruch/Freigabegrenze:** Nicht identifizierbare gemeinsame Schocks,
  überlagerte historische Krisen oder als Wahrscheinlichkeit missverstandene
  Rate stoppen FV3. „Risiko gesenkt“ bleibt ohne FV4/FV5 gesperrt.
- **Planungsgrenze:** eigenes Arbeitsdokument; Tail-Contract, Overlay,
  Samplinggrenze, Runner/Worker und höchstens fünf Tests pro Slice.

### FV-P07 / FQ-07 – CAPE außerhalb der Entwicklungsdaten

- **Priorität / Owner:** 2; Kapitalmarkt-/Forecast-Methodik-Owner und
  Holdout-Custodian.
- **Reduziert:** FR-07 und den CAPE-Teil von FR-08.
- **Eingaben:** FQ-01-Datenmanifest, FV-G03, vollständiges Trial-Log,
  konstante Return-Baseline, lange vorab definierte Horizonte sowie
  internationale und zeitliche Holdouts.
- **Nächster Schritt:** CAPE-Policy, Horizont, Baseline, Metriken und
  Länder-/Zeitpartitionen vor Datenfreigabe registrieren.
- **Ergebnisartefakte:** Forecast-/Policyprotokoll, Holdout-Register,
  Baselinevergleich, Effekt- und Stabilitätsintervalle, negative
  Länder-/Teilperiodenbefunde und Methodenreview.
- **Abbruch/Freigabegrenze:** jährliche Policy wird gegen unpassenden langen
  Forecast-Horizont bewertet, Holdout beeinflusst Clamp/EMA, oder konstante
  Baseline fehlt. Dann bleibt das Ergebnis FV2.
- **Planungsgrenze:** eigenes Arbeitsdokument; Datenadapter,
  CAPE-Policygrenze, isolierter Evaluator und gezielte Tests in getrennten
  Slices mit höchstens zehn Programmdateien.

### FV-P08 / FQ-08 – Mechanismus-Ablationen

- **Priorität / Owner:** 2; Portfolio-/Kausalvergleichs-Owner.
- **Reduziert:** FR-11 und Mechanismusvermischungen aus FR-01.
- **Eingaben:** gleiche Gesamtallokation, identische Cashflows, Daten, Seeds,
  Kosten, Steuer, Rebalancing und Liquiditätsregeln; einzelne Gold-, Runway-,
  Bond- und Pflegebucket-Schalter; vorab definierte Interaktionen.
- **Nächster Schritt:** Kontrollpolicy und Invariantenmatrix definieren;
  anschließend je Mechanismus eine Einzelfaktor-Ablation, erst danach
  registrierte Interaktionen.
- **Ergebnisartefakte:** Invariantenmatrix, Einzel- und Interaktionsläufe,
  Opportunitätskosten, Transaktions-/Steuerdeltas, Ergebnisbündel und
  Methodenreview.
- **Abbruch/Freigabegrenze:** Anfangsvermögen, Cashflows oder Gesamtallokation
  unterscheiden sich; mehrere Mechanismen ändern sich unregistriert; ein
  Bucket-Verhaltensnutzen wird als Renditewirkung ausgegeben.
- **Planungsgrenze:** eigenes Umbrella-Arbeitsdokument mit getrennten
  1-basierten Slices pro Mechanismus; gemeinsamer Harness und jeder
  Mechanismus-Slice bleiben jeweils unter zehn Programmdateien.

### FV-P09 / FQ-09 – Kohortenmortalität und Joint-Life-Horizont

- **Priorität / Owner:** 2; Aktuariats-/Demografie-Owner, externer
  Methodikreview zwingend.
- **Reduziert:** FR-09.
- **Eingaben:** Perioden- und Kohortentafeln, Verbesserungsannahmen,
  Partnerabhängigkeit, Quantile, Puffer, Datenstände und asymmetrische Kosten
  eines zu kurzen beziehungsweise zu langen Horizonts.
- **Nächster Schritt:** Tabellen-/Szenariomanifest und aktuariellen
  Transformationsvertrag erstellen; Perioden-, Kohorten- und
  Verbesserungsszenarien getrennt halten.
- **Ergebnisartefakte:** Datenmanifest, Szenariomatrix, Horizonverteilungen,
  Quantil-/Partner-Sensitivität, asymmetrische Fehleranalyse und externes
  Review.
- **Abbruch/Freigabegrenze:** Periodentafel wird als Individualprognose
  ausgegeben, Partnerleben als unabhängig unterstellt ohne Sensitivität oder
  Datenstand/Lizenz bleiben unklar.
- **Planungsgrenze:** eigenes Arbeitsdokument; Longevity-Contract,
  Horizonmodule, Runnergrenze und höchstens sechs Tests pro Slice.

### FV-P10 / FQ-10 – Nutzerpräferenzen für Konsum und Nachlass

- **Priorität / Owner:** 3; vom Nutzer benannter Studien-/UX-Research-Owner
  mit Datenschutzverantwortung; unabhängiger Methodenreview.
- **Reduziert:** den Präferenzanteil von FR-12; kann Portfolio- oder
  Pflegewirksamkeit nicht allein schließen.
- **Eingaben:** vorab registriertes Erhebungsdesign, definierte Zielpopulation,
  informierte Einwilligung, Datenschutz-/Löschkonzept, verständliche reale
  Konsum-, Shortfall- und Nachlassszenarien sowie Umgang mit Heterogenität.
- **Nächster Schritt:** extern reviewbares Studienprotokoll erstellen und
  Datenschutz-/Rekrutierungsfreigabe einholen; keine Erhebung in Slice 9.
- **Ergebnisartefakte:** Protokoll, Fragebogen/Interviewleitfaden,
  Stichproben- und Ausschlusslog, anonymisierte Auswertung,
  Unsicherheits-/Heterogenitätsbericht und Replikationsmaterial, soweit
  Einwilligung und Datenschutz es erlauben.
- **Abbruch/Freigabegrenze:** keine valide Einwilligung, unzulässige
  personenbezogene Finanzdaten, suggestive Szenarien, nicht passende
  Zielpopulation oder zu kleine/selektive Stichprobe. Dann keine
  Produktgewichtung ableiten.
- **Planungsgrenze:** zunächst null Produktdateien. Jede spätere UI- oder
  Nutzwertintegration ist ein separates Feature-Arbeitsdokument mit eigenem
  Contract und höchstens zehn Programmdateien je Slice.

## 6. Vollständige FR-/FQ-Zuordnung

| Risiko | Nächster ausführbarer Schritt | Primäres Paket | Externe Abhängigkeit / Reduktionsgrenze |
| --- | --- | --- | --- |
| FR-01 | Baselinekontext und Ergebnisbegriff in FV-G01 festschreiben; dann Daten-/Kostenlauf und Shortfallbündel ausführen | FQ-01, FQ-03 | keine universelle Rate aus Suite-Läufen; Übertragbarkeit benötigt unabhängige Replikation |
| FR-02 | bestehende Serien im FV-G02-Manifest bis auf Transformation und geschätzte Jahre inventarisieren | FQ-01 | Primärdaten, Lizenzen und internationale Vergleichbarkeit |
| FR-03 | FV-G03 erstellen und Sensitivitäten getrennt von Rechtsvollständigkeit ausweisen | FQ-01 | Steuer-/Rechtsanteil nur durch qualifizierte externe Prüfung reduzierbar |
| FR-04 | Abhängigkeitsdiagnostik und Blocklängenraster vorab registrieren | FQ-05 | Zeitreihenmethodikreview; enge Historie begrenzt Power |
| FR-05 | Heuristiklabels beibehalten und Schwellen-/Filterstabilität im Protokoll festlegen | FQ-05 | ein statistisches Regimemodell wäre ein anderes Arbeitsdokument |
| FR-06 | Ereignistaxonomie und Doppelzählungsmatrix challengen | FQ-06 | externe Szenario-/Risikomethodik; keine beobachtete Crashwahrscheinlichkeit ohne Kalibrierung |
| FR-07 | konstante Baseline sowie zeitliche und internationale Holdouts sperren | FQ-02, FQ-07 | neue Länder-/Zeitdaten und unabhängiger Forecast-Review |
| FR-08 | vollständiges Trial-Log und Holdout-Custodian einrichten, historische Sichten als explorativ markieren | FQ-02 | unbekannte frühere manuelle Trials können nicht rückwirkend bestätigt werden |
| FR-09 | Perioden-/Kohorten-/Verbesserungsmanifest und Partnerabhängigkeit definieren | FQ-09 | externe demografische Daten und aktuarieller Review; keine Individualprognose |
| FR-10 | Parameterwörterbuch erstellen und Bestands-, Übergangs-, Kosten- und Mortalitätsketten trennen | FQ-04 | deutsche Pflege-/Leistungsdaten und externer Pflege-/Aktuariatsreview |
| FR-11 | Kontrollpolicy mit gleicher Gesamtallokation und Opportunitätskosten einfrieren | FQ-08 | Verhaltensnutzen benötigt gegebenenfalls separate Nutzerforschung |
| FR-12 | Metrikwörterbuch und vollständige Shortfallverteilungen erstellen; Präferenzstudie separat protokollieren | FQ-03, FQ-10 | tatsächliche Akzeptanz nur durch Nutzerstudie; Datenschutz und Methodikreview |

| Forschungsfrage | Paket | Status | Startvoraussetzung |
| --- | --- | --- | --- |
| FQ-01 | FV-P01 | FV0 / offen | Daten-Owner benannt; Manifestinventur beauftragt |
| FQ-02 | FV-P02 | FV0 / offen | FQ-01-Grundverträge, Trial-Schema und Holdout-Custodian |
| FQ-03 | FV-P03 | FV0 / offen | Metrik-Owner und PD-01-Vertrag bestätigt |
| FQ-04 | FV-P04 | FV0 / offen | Pflege-/Aktuariats-Owner und Quellenzugang |
| FQ-05 | FV-P05 | FV0 / offen | FQ-01-Datenmanifest und Zeitreihenreview |
| FQ-06 | FV-P06 | FV0 / offen | Szenario-Owner und Challenge-Reviewer |
| FQ-07 | FV-P07 | FV0 / offen | FQ-01, FV-G05 und echte Holdouts |
| FQ-08 | FV-P08 | FV0 / offen | Kontrollpolicy und Umbrella-Arbeitsdokument |
| FQ-09 | FV-P09 | FV0 / offen | Datenlizenz und aktuarieller Owner |
| FQ-10 | FV-P10 | FV0 / offen | Studien-, Datenschutz- und Rekrutierungsfreigabe |

Damit besitzt jede FR-/FQ-ID einen nächsten Schritt. Die Zuordnung ist keine
Schließung: Alle zwölf Risiken und alle zehn Fragen bleiben ausdrücklich
offen.

## 7. Paketabschluss und Rückdokumentation

Ein Paket gilt erst als zur Statusentscheidung bereit, wenn:

1. sein Arbeitsdokument, Feature-Branch, Scope und vorab eingefrorenes
   Protokoll freigegeben wurden;
2. alle erforderlichen FV-Gates nachweislich erfüllt sind;
3. sämtliche geplanten, fehlgeschlagenen, abgebrochenen und manuell
   beeinflussten Trials im Register stehen;
4. Rohartefakte, Aggregation, Laufbefehl, Umgebung und Hashes reproduzierbar
   sind;
5. negative, instabile und nicht signifikante Ergebnisse gleichrangig
   berichtet werden;
6. externer beziehungsweise unabhängiger Review und Pre-Mortem vorliegen;
7. Hauptdokument, Forschungsregister und dieser Backlog erst nach
   Nutzer-/Reviewerfreigabe synchronisiert werden.

Scheitert ein Abbruchkriterium, wird das Paket mit Ursache als `abgebrochen`,
`explorativ` oder `nicht identifizierbar` dokumentiert. Es wird nicht still
neu parametrisiert. Ein solcher Ausgang kann das Risiko präzisieren, aber
keine gesperrte Wirksamkeitsaussage freigeben.
