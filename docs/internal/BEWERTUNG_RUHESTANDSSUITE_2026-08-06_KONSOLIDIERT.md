# Konsolidierte Gesamtbewertung der Ruhestand-Suite

**Stichtag:** 2026-08-06  
**Bewerteter Stand:** `main`, `HEAD 27b9264`, zuzüglich der am Stichtag
vorhandenen uncommitteten Dokumentations- und Teständerungen  
**Quellen:** die drei Einzelbewertungen von Claude, Codex und Gemini  
**Gewichtung:** Technik 50 Prozent, fachliche Eignung 50 Prozent  
**Charakter:** konsolidierte interne Produktbewertung; keine Anlage-, Steuer-,
Rechts-, Versicherungs- oder Pflegeberatung und keine externe Validierung

## 1. Konsolidiertes Urteil

Die drei Bewertungen beschreiben im Kern dasselbe Produkt: eine für ein
persönliches Einzelprojekt ungewöhnlich tief entwickelte, technisch stark
abgesicherte und transparent dokumentierte Ruhestands-Suite. Der Rechenkern,
die Testdichte, Datenprovenienz, Fehlerbehandlung und die Verbindung aus
Planung, Simulation und jährlicher Durchführung sind die gemeinsamen Stärken.

Die Unterschiede der Einzelnoten entstehen hauptsächlich aus zwei
Bewertungsperspektiven:

1. **Eignung innerhalb des bewusst engen Produktscopes:** Für einen
   finanzkundigen DIY-Nutzer mit einem einfachen EUR-Portfolio ist die Suite
   fachlich stark. Diese Perspektive führt eher in den Bereich 82 bis 84.
2. **Vollständigkeit für einen typischen deutschen Ruhestandshaushalt:** Ohne
   vollständige Rentensteuer-, KV-/PV-, Immobilien-, Ereignis- und
   Szenarioplanung sowie ohne externe Modellvalidierung fällt das Urteil
   merklich niedriger aus. Diese Perspektive führt eher in den Bereich 78.

Die Konsolidierung berücksichtigt beide Perspektiven. Sie übernimmt weder den
optimistischsten noch den strengsten Wert unverändert und bildet auch keinen
blinden Mehrheitsentscheid.

| Hauptblock | Gewicht | Konsolidierte Bewertung | Beitrag |
| --- | ---: | ---: | ---: |
| Technische Umsetzung, Dokumentation und Tests | 50 % | **83,24 %** | 41,62 |
| Fachliche Eignung, Planung und Durchführung | 50 % | **76,6 %** | 38,30 |
| **Gesamt** | **100 %** |  | **79,92 %** |

**Konsolidierte Gesamtnote: 80 von 100 Prozent.**

### Klartext

Die Suite ist ein **gutes und für ihren dokumentierten Kernzweck teilweise sehr
gutes persönliches Fachwerkzeug**. Sie ist aber noch **kein vollständig
validiertes Ruhestandsplanungssystem** und darf nicht allein darüber
entscheiden, wann der Ruhestand beginnt oder welcher Lebensstandard dauerhaft
tragbar ist.

## 2. Wie die drei Bewertungen zusammengeführt wurden

### 2.1 Ausgangsnoten

| Bewertung | Technik | Fachlichkeit | rechnerisches Gesamtergebnis |
| --- | ---: | ---: | ---: |
| Claude | 83,0 % | 71,7 % | 77,35 % |
| Codex | 85,14 % | 79,10 % | 82,12 % |
| Gemini | 86,0 % | 82,4 % | 84,20 % |
| **Arithmetischer Mittelwert** | **84,71 %** | **77,73 %** | **81,22 %** |

Claude stellt sein Ergebnis anhand der zuvor gerundeten Blocknoten als
77,5 beziehungsweise 78 Prozent dar. Mit den im Dokument ausgewiesenen
ungerundeten Teilwerten ergeben sich 77,35 Prozent. Diese kleine Differenz hat
keine materielle Bedeutung.

### 2.2 Warum die Konsensnote nicht einfach 81,22 Prozent beträgt

Die drei Bewertungsraster verwenden unterschiedliche Kategorien und Gewichte.
Außerdem enthält die Gemini-Bewertung mehrere sachliche Überzeichnungen, während
die Claude-Bewertung einzelne technische Details zu streng beziehungsweise
nicht mehr aktuell beschreibt. Deshalb wurden zuerst die Tatsachen am
Repository-Stand vereinheitlicht und danach alle Punkte mit einem gemeinsamen
Raster neu gewichtet.

Für Tatsachen gilt in dieser Konsolidierung:

- aktueller Code und ausgeführte Prüfungen gehen vor Formulierungen in einer
  Bewertung;
- übereinstimmende Meinungen sind kein Beweis, abweichende Meinungen aber ein
  Anlass zur Nachprüfung;
- technische Reproduzierbarkeit wird nicht mit fachlicher Richtigkeit
  gleichgesetzt;
- ein transparent dokumentierter Modellmangel ist weniger gefährlich als ein
  versteckter Mangel, bleibt für die Eignungsnote aber ein Mangel.

## 3. Aufgelöste Widersprüche

| Streitpunkt | Konsolidierter Sachstand | Auswirkung |
| --- | --- | --- |
| Anzahl Tests | **167** `*.test.mjs`, nicht 176; 18.977/18.977 Assertions bestanden | Gemini-Zahl korrigiert; Teststärke bleibt sehr hoch |
| Coverage | aktueller Codex-Lauf: **78,88 %** approximative V8-Zeilenabdeckung; Claudes 78,97 % stammt von einem älteren Stand | kein relevanter Notenunterschied, aber 78,88 % ist der Stichtagswert |
| CI vorhanden? | Ja. GitHub Actions führt `npm run test:coverage` aus. Browser-, Rust- und Tauri-Gates fehlen dort | Geminis Aussage einer fehlenden CI-Pipeline ist zu pauschal; vollständige CI/CD gibt es dennoch nicht |
| MC-Exportfehler | Heatmap-Grenze, Prozent-/Ratio-Einheiten, zwei Entnahmequoten und Zero-/Missingness-Semantik sind im aktuellen Stand nicht vollständig behoben | Gemini bezeichnet sie teils als historisch/adressiert; Claude und Codex haben aktuelle Vorkommen nachgewiesen |
| Deutsches Steuermodell | Kapitalertragsteuer, Teilfreistellung, Pauschbetrag, Verlusttopf und Lots sind tief modelliert. Persönliche Einkommensteuer auf Renten sowie KV-/PV-Beiträge fehlen; Kirchensteuer ist vereinfacht | „lückenlos“ und „exakt“ sind als Gesamturteil unzutreffend |
| Datenschutz | Vermögenszustände werden lokal gehalten. Live-Datenabrufe kommunizieren jedoch nach außen; lokale Finanzdaten liegen im Klartext | „Nichts funkt ins Internet“ und „völliger Datenschutz“ sind zu absolut |
| Typprüfung | Es gibt `config/tsconfig.json`, aber nur für `types/**/*.js`, mit `checkJs: true` und `strict: false`; kein projektweites striktes Gate | Claudes wörtliches „keine tsconfig“ ist ungenau, seine Kernaussage zur fehlenden projektweiten Typprüfung stimmt |
| Repository-Hygiene | EXE und 19 Dateien unter `node_modules/` sind trotz Ignore-Regeln versioniert; zusätzliche Log-/Temporärdateien liegen lokal im Projekt | der Hygieneabzug aus der Claude-Bewertung ist sachlich begründet |
| Deterministische Genauigkeit | Gleiche Eingaben erzeugen reproduzierbare Ergebnisse. Das beweist weder externe Modellrichtigkeit noch korrekte Benennung, Skalierung oder Anzeige jedes Ergebnisses | „cent-genau“ darf nicht als umfassende fachliche Genauigkeitsgarantie gelesen werden |
| Engine-/Dist-Synchronisation | Der Releasepfad besitzt Clean-Tree- und Provenienzprüfungen. Browser-, Rust- und Tauri-Gates sind aber nicht zu einem einzigen erzwungenen Release-Gate verbunden | reales, jedoch teilweise mitigiertes Artefakt- und Release-Risiko |

## 4. Gemeinsame Evidenzbasis

Die belastbarste gemeinsame Evidenz stammt aus den tatsächlich ausgeführten
Prüfungen:

| Prüfung | Ergebnis |
| --- | --- |
| Node-Tests | 167 Testdateien, 18.977/18.977 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles |
| Browserprüfung | 29/29 Playwright-Workflows bestanden |
| Coverage | 41.741/52.919 ausführbare Zeilen, 78,88 % approximative Abdeckung |
| Rust | 8/8 Unit-Tests bestanden |
| Evidenzregister | 69 Markt-, 55 Forschungs- und 17 Mechanismus-Records strukturell validiert |
| Sichtprüfung | Startseite, Balance, Simulator und Handbuch ohne offensichtlichen Layoutbruch |

Nicht nachgewiesen wurden ein neuer Release-Build am Bewertungsstichtag, ein
EXE-Smoke-Test auf einem frischen Windows-System, Penetrationstests, eine
formale WCAG-Prüfung, eine Nutzerstudie und eine unabhängige steuerliche,
aktuarielle oder wissenschaftliche Replikation.

## 5. Konsensfindings vor der Detailbenotung

### K-01 – Technisch getestet ist nicht extern fachlich validiert (hoch)

Alle drei Bewertungen erkennen die außerordentliche Testdichte an. Claude und
Codex gewichten jedoch zu Recht stärker, dass Markt-, Pflege-, Mortalitäts-,
Steuer- und Optimierungsmodelle keine unabhängige V4-/V5-Validierung besitzen.

- **IT-Sicht:** Tests beweisen, dass implementierte Regeln stabil und
  reproduzierbar laufen.
- **Einfach gesagt:** Ein Taschenrechner kann seine Formel perfekt ausrechnen;
  damit ist noch nicht bewiesen, dass die Formel zur eigenen Lebenslage passt.
- **Konsequenz:** Ergebnisse sind Wenn-dann-Szenarien, keine Garantien oder
  empirischen Eintrittswahrscheinlichkeiten.

### K-02 – Aktuelle Ergebnisvertragsfehler blockieren unbegleitete MC-Auswertung (hoch)

Im aktuellen Code bestehen mindestens folgende semantische Risiken:

1. Eine untere Heatmap-Bin-Grenze wird als `upperBoundPct` exportiert.
2. Renditefelder mit `Pct`-Suffix enthalten teilweise Ratios statt
   Prozentpunkte.
3. `QuoteEndPct` und `entnahmequote` besitzen unterschiedliche Nenner und
   Messzeitpunkte, ohne dies im Export ausreichend kenntlich zu machen.
4. Nicht beobachtete beziehungsweise nicht anwendbare Werte können trotz
   deklarierter Null-/Missingness-Policy als nullwertige Beobachtung erscheinen.

Die interne Jahresbilanz ist damit nicht pauschal falsch. Eine externe
Tabellen-, Skript- oder KI-Auswertung kann die Werte aber um eine Klasse oder
den Faktor 100 fehlinterpretieren.

### K-03 – Beruhigende Erfolgsquoten können von Eingaben dominiert werden (hoch)

Der untersuchte 10.000-Läufe-MC-Lauf mit 0 Prozent Ruin und 100 Prozent
Floor-Deckung war stark von Rentenannahmen, Recency-Sampling, deaktiviertem
Tail-Stress und einer geringen Zahl ungünstiger Regime geprägt. In vielen Jahren
deckten Renten den Floor bereits ohne wesentliche Depotwirkung.

- **Einfach gesagt:** Eine grüne Ampel kann mehr über die gewählten Annahmen als
  über die Robustheit der Strategie aussagen.
- **Konsequenz:** Uniform-, CAPE-, Stress-, Tail- und Mehrseed-Gegenläufe sowie
  die Prüfung realer Rentenunterlagen gehören vor eine Entscheidung.

### K-04 – Schutzbegriffe garantieren keine Schutzwirkung (hoch)

Die analysierte Policy-Reihenfolge zeigte, dass Mindest-Flex und finale
Glättung ein Guardrail-Kürzungssignal im ersten Crashjahr stark wieder anheben
können. Ein nominelles Fünfjahres-Runway-Ziel verhinderte im Worst Case neun
Jahre ohne Jahresendliquidität nicht. Eine Goldzielquote erzeugte bei
Startbestand null im Krisenpfad keinen Goldbestand. Zusätzlich ist die
Alarmstärke in `flex-rate-policy.mjs` durch die aktuelle Formel faktisch auf 10
begrenzt.

- **Einfach gesagt:** „Ziel“, „Puffer“ oder „Guardrail“ beschreibt eine Regel,
  nicht zwingend einen tatsächlich vorhandenen Schutz.
- **Konsequenz:** Die Priorität der Policies und echte Mindestbestände benötigen
  einen dokumentierten fachlichen Sollentscheid.

### K-05 – Die deutsche Ruhestandsrealität ist nur teilweise abgedeckt (hoch)

Stark umgesetzt sind Kapitalertragsteuer auf Lot-Ebene, Teilfreistellung,
Pauschbetrag, Verlusttöpfe, Rentenströme, Hinterbliebenenpfad, deutsche Daten,
Pflegegrade und Pflegebucket.

Nicht als vollständige eigene Modelle vorhanden sind insbesondere:

- persönliche Einkommensteuer und Besteuerungsanteile der Renten;
- Kranken- und Pflegeversicherungsbeiträge;
- komplexe gesetzliche, betriebliche, Riester- und Rürup-Auszahlungsregeln;
- Immobilien, Darlehen, Vermietung und Fremdwährungen;
- Erbschaften, Schenkungen und frei terminierbare Einmalausgaben;
- automatische Rentenkontenaggregation und gespeicherter Vergleich kompletter
  Lebenspläne.

Die Werte können teilweise als manuell vorbereitete Netto-Cashflows eingegeben
werden. Das verlagert aber eine zentrale Fehlerquelle auf den Nutzer.

### K-06 – Reale Durchführung ist stark unterstützt, aber nicht geschlossen (hoch bis mittel)

Die Suite bietet einen belastbaren Jahresabschluss, Snapshots, Ausgabenimport,
konkrete Verkaufspläne, steuerorientierte Tranchenwahl und einen bestätigten
Bestandsabgleich. Der Reconcile entfernt verkaufte Lots und dokumentiert Erlös
und Gebühr, bucht den Erlös aber nicht automatisch in die freie Liquidität.

Der Kernprozess arbeitet jährlich. Der monatliche Ausgabencheck ist nützlich,
aber kein unterjähriger Portfolio- und Rebalancingmotor.

- **Einfach gesagt:** Die Suite hilft sehr konkret beim Jahresplan. Zwischen
  den Jahresabschlüssen sowie nach einem echten Verkauf bleibt Handarbeit.

### K-07 – Ergebnisdarstellung kann falsche Sicherheit erzeugen (hoch bis mittel)

Im geprüften MC-Lauf wurde eine reale Depotentnahme P10 von 13.331 Euro in der
Oberfläche als geglättete 15.000 Euro dargestellt, also 12,5 Prozent höher. Der
nominelle Drawdown wird prominenter ausgewiesen als der kaufkraftrelevante reale
Drawdown. Eine Pflege-Gruppenkennzahl kann wegen unterschiedlicher
Überlebensdauern kausal fehlgelesen werden.

Die Oberfläche ist optisch sauber und strukturiert. Gleichzeitig wurden rund
66 Eingabe-/Auswahlfelder in Balance und 149 im Simulator gezählt; das Handbuch
enthält 79 Überschriften. Eine formale Barrierefreiheitsprüfung fehlt.

### K-08 – Datenprovenienz ist hervorragend, Prognoseeignung bleibt begrenzt (mittel)

Originalquellen, Generatoren, Hashes, Verify-only-Läufe, Missingness und
Nahtstellen sind außergewöhnlich gut dokumentiert. Die zentrale Aktienreihe ist
aber kein Anbieterindex, 1925–1950 wird ein USD-Forschungsproxy genutzt und für
2021–2025 ein Dividendenbaustein eingefroren. Weitere Reihen besitzen ebenfalls
dokumentierte Proxy- und Übertragbarkeitsgrenzen.

- **Einfach gesagt:** Die Herkunft der Zahlen ist sehr gut nachvollziehbar.
  Das macht sie noch nicht identisch mit dem eigenen ETF oder der Zukunft.

### K-09 – Wartbarkeit, Security und Releaseprozess bleiben unter dem Niveau des Rechenkerns (mittel)

- mehrere Module überschreiten 1.200 beziehungsweise 1.500 Zeilen;
- kein Lint-/Formatter-Gate und nur eine nicht strikte Typprüfung für `types/`;
- relevante UI-Module besitzen in der Node-Coverage sehr niedrige oder null
  Abdeckung, auch wenn Browserflows Teile davon separat prüfen;
- CSP erlaubt `unsafe-inline` und `unsafe-eval` und deaktiviert eine
  Tauri-CSP-Modifikation;
- lokale Finanzdaten liegen im Klartext;
- Browser-, Rust-, Security- und Tauri-Prüfungen sind kein gemeinsames
  verpflichtendes Release-Gate;
- EXE und Teile von `node_modules/` sind versioniert;
- Changelog, Versionsnummern, Teststatistik und Einstiegstexte zeigen Drift.

## 6. Konsolidierte technische Bewertung – 50 Prozent

| Teilgebiet | Gewicht | Note | Konsolidierte Begründung |
| --- | ---: | ---: | --- |
| Architektur und Verantwortungsgrenzen | 14 % | 88 % | alle drei Bewertungen sehen klare Schichten, deterministische Engine, Worker und versionierte Verträge; große Orchestratoren bleiben |
| Implementierung und Wartbarkeit | 14 % | 74 % | disziplinierter, abhängigkeitsschwacher Code; sehr große Dateien, kein Lint-Gate und keine projektweite strikte Typprüfung |
| Contracts und Datenintegrität | 14 % | 84 % | starke Provenienz-, Fail-closed- und Reconciliation-Ansätze; aktuelle MC-Semantik-/Einheitenprobleme verhindern eine Spitzennote |
| Tests und Qualitätssicherung | 20 % | 90 % | 18.977 Assertions, 29 Browserflows, Rust-, Paritäts-, Negativ- und Datenrekonstruktionstests; UI-Lücken und keine harte Coverage-Schwelle |
| Persistenz, Backup und Recovery | 10 % | 92 % | Snapshot vor Mutation, Quarantäne, idempotente Commits, Recovery und explizite Resetpfade |
| Sicherheit und Datenschutz | 10 % | 74 % | frühere kritische Findings gehärtet; CSP-Ausnahmen, Klartextdaten und fehlendes Security-Gate bleiben |
| Build, Release, CI und Repository-Hygiene | 8 % | 70 % | Clean-Tree-Provenienz ist stark; unvollständige CI, Versionsdrift und versionierte Binär-/Abhängigkeitsartefakte |
| Dokumentation und Traceability | 10 % | 86 % | außergewöhnlich ehrliche und tiefe Register; Aktualitäts-, Umfangs- und Einstiegsproblem |

**Technik: 83,24 Prozent, gerundet 83 Prozent.**

Die Techniknote liegt unter dem bloßen Mittelwert der drei Techniknoten, weil
Security und Repository-/Release-Hygiene im gemeinsamen Raster ausdrücklich
enthalten sind und die fortbestehenden Exportverträge nicht als nur historische
Risiken behandelt werden.

## 7. Konsolidierte fachliche Bewertung – 50 Prozent

| Teilgebiet | Gewicht | Note | Konsolidierte Begründung |
| --- | ---: | ---: | --- |
| Zielgruppenfit und Scope-Klarheit | 10 % | 88 % | starke Passung für finanzkundige Nutzer im passiven EUR-ETF-/Cash-/Gold-/Bond-Scope; Grenzen offen dokumentiert |
| Haushalts- und Lebenszyklusplanung | 15 % | 80 % | zwei Personen, Ansparphase, Renten, Witwenpfad, Floor/Flex und Pflege; Ereignisse, Planvergleich, Immobilien und komplexe Renten fehlen |
| Entnahme-, Liquiditäts- und Transaktionsplanung | 20 % | 85 % | fachlich sehr tiefe Guardrail-, VPW-, Runway-, Tranchen- und 3-Bucket-Logik; Policy-Konflikte und Cash-Reconcile offen |
| Risiko-, Szenario- und Sensitivitätsanalyse | 15 % | 80 % | MC, Backtest, Bootstrap, Stress, Tail, Sweep und Optimizer sind breit; Sampling-, KPI-, In-sample- und Exportgrenzen materiell |
| Deutsche Steuer-, Renten- und Pflegeeignung | 15 % | 64 % | Kapitalertragsteuer und Pflegekonzept tief; Rentensteuer, KV/PV, vollständige Sozial-/Vorsorgelogik und externe Kalibrierung fehlen |
| Datenbasis und wissenschaftliche Belastbarkeit | 15 % | 64 % | herausragende Reproduzierbarkeit; Proxyketten, Data-Snooping und fehlende unabhängige Validierung begrenzen Prognoseaussagen |
| Laufende Durchführung und Bedienbarkeit | 10 % | 76 % | praktischer Jahresprozess und Ausgabencheck; manueller Cash-/Brokerabgleich, kein unterjähriger Motor und hohe Komplexität |

**Fachlichkeit: 76,6 Prozent, gerundet 77 Prozent.**

Diese Note liegt zwischen Claude und Codex und unter Gemini. Sie würdigt die
Tiefe innerhalb des definierten Scopes, bewertet aber die fehlende
Netto-Renten-/KV-/PV-Rechnung und die nicht externe Validierung als wesentliche
Grenzen einer Ruhestandssuite, nicht lediglich als optionale Komfortfunktionen.

## 8. Einsatzurteil

| Nutzungssituation | Konsolidiertes Urteil |
| --- | --- |
| Persönliche DIY-Planung eines finanzkundigen Nutzers im dokumentierten Scope | **gut geeignet** |
| Vergleich von Entnahme-, Pflege-, Runway- und Stressannahmen | **gut geeignet**, wenn adversariale Gegenläufe und alle Ergebnisdimensionen gelesen werden |
| Jährliche operative Ruhestandsroutine | **bedingt gut geeignet**; reale Renten-, Steuer-, Broker- und Cashwerte müssen diszipliniert abgeglichen werden |
| Unbegleitete Nutzung durch Finanz- und IT-Laien | **nur eingeschränkt geeignet** |
| Alleinige Entscheidung über Ruhestandsbeginn oder Lebensstandard | **nicht ausreichend** |
| Vollständige deutsche Steuer-, Sozialabgaben-, Renten- oder Pflegeplanung | **nicht geeignet** |
| Komplexe Haushalte mit Immobilien, Krediten, Firmen, Krypto, Derivaten oder mehreren Währungen | **nicht geeignet** |
| Maschinelle oder externe Nutzung der aktuellen MC-JSON-Exporte | **bis zur Vertragskorrektur nicht geeignet** |
| Automatische Broker- oder Vermögensverwaltung | **nicht vorgesehen und nicht geeignet** |

## 9. Gemeinsame Prioritäten

### Priorität 0 – vor externer oder automatisierter Ergebnisnutzung

1. Heatmap-Bins fachlich korrekt und versioniert benennen.
2. Renditefelder eindeutig als Ratio oder Prozentpunkte versionieren.
3. Entnahmequoten nach Zweck, Nenner und Messzeitpunkt trennen.
4. Null, Missingness und Nichtanwendbarkeit konsistent exportieren.
5. Exakten und gerundeten P10-Wert parallel und konservativ darstellen.
6. Nominalen und realen Drawdown klar nebeneinander ausweisen.

### Priorität 1 – vor einer tragenden persönlichen Ruhestandsentscheidung

1. Brutto-/Netto-Contract für alle Renten einschließlich Einkommensteuer und
   KV/PV eindeutig in Eingabe, Vertrag und Handbuch definieren.
2. Cashbuchung nach bestätigtem Verkauf schließen oder einen unübersehbaren,
   kontrollierten manuellen Schritt erzwingen.
3. Priorität von Alarm, Guardrail, Mindest-Flex und Glättung fachlich festlegen.
4. Tatsächliche Mindestliquidität und Verhalten eines unerreichbaren
   Runway-Ziels definieren.
5. Goldzielquote und erforderliche Startallokation konsistent machen.
6. Alarmstärkeformel korrigieren oder die vermeintliche Abstufung entfernen.
7. Ein dokumentiertes Pflichtset aus Uniform-/CAPE-, Stress-, Tail- und
   Mehrseed-Gegenläufen etablieren.

### Priorität 2 – für die nächste Reifestufe

1. Unabhängige Reviews für Steuer, Kapitalmarktdaten und Pflege/Aktuariat.
2. Freie Einmalereignisse und gespeicherte Gesamtplanvergleiche.
3. Geführter Einsteigermodus und formale WCAG-/Screenreader-Prüfung.
4. Projektweite Typprüfung, Linting und weitere Zerlegung großer Module.
5. Gemeinsames CI-/Release-Gate für Node, Browser, Rust, Security und Tauri.
6. Repository von versionierten Build-/Abhängigkeitsartefakten bereinigen und
   Versions-, Changelog- und Dokumentationsstände synchronisieren.
7. Unterjährigen Ausnahme- und Liquiditätsprozess definieren; ein vollautomatischer
   Monatsmotor ist nur nötig, wenn dies ausdrücklich zum Produktziel wird.

## 10. Konsolidiertes Pre-Mortem

**Angenommen, die Suite führt in drei Monaten zu einer falschen finanziellen
Entscheidung: Was ist die wahrscheinlichste Ursache?**

Am wahrscheinlichsten ist kein spontaner Fehler der deterministischen Engine,
sondern folgende Kette an den Modell- und Bediengrenzen:

1. Ein Rentenstrom wird brutto, netto oder mit falschem Beginn eingegeben; KV/PV
   und persönliche Rentensteuer fehlen oder werden inkonsistent vorab
   herausgerechnet.
2. Günstiges Sampling, deaktivierter Tail-Stress und die Rentenannahme erzeugen
   eine sehr beruhigende Erfolgs- oder Floor-Quote.
3. Der Nutzer liest die Quote als Strategiebeweis statt als bedingtes
   Modellergebnis; gerundete Downside-Anzeigen verstärken den Eindruck.
4. Im ersten echten Crash heben Mindest-Flex und Glättung die erwartete
   Guardrail-Kürzung wieder an; der nominelle Runway ist nicht tatsächlich
   vorhanden.
5. Nach einem realen Verkauf wird die freie Liquidität nicht vollständig
   nachgeführt, sodass App und Brokerzustand auseinanderlaufen.
6. Eine externe Auswertung des MC-Exports verschärft die Fehldeutung durch
   Bin-, Einheiten-, Quotendefinitions- oder Missingness-Probleme.

Der wahrscheinlichste reale Schaden ist daher ein zu früher Ruhestandsbeginn
oder ein zu hoher Lebensstandard auf Basis eines überinterpretierten
Modellergebnisses. Die beste Gegenmaßnahme ist ein verbindliches
Entscheidungsprotokoll aus echten Renten-/Versicherungsunterlagen, mehreren
adversarialen Gegenläufen, exakten Downside-Werten, unabhängiger fachlicher
Plausibilisierung und anschließendem jährlichem Broker-/Cash-Reconcile.

## 11. Schlussfolgerung

Die drei Bewertungen widersprechen sich weniger, als ihre Noten von 78, 82 und
84 vermuten lassen. Sie gewichten im Wesentlichen dieselben Stärken und
Schwächen unterschiedlich. Nach Bereinigung der Tatsachen und Anwendung eines
einheitlichen Rasters ist **80 Prozent** das belastbarste gemeinsame Urteil.

Die Härtungsmaßnahmen haben die technische Verlässlichkeit, Transparenz und
Recovery-Fähigkeit erheblich erhöht. Der nächste Qualitätssprung entsteht nicht
primär durch mehr Funktionen oder mehr Assertions, sondern durch:

1. korrekte und versionierte Ergebnisverträge;
2. eindeutige Netto-/Brutto- und Cash-Übergänge;
3. fachlich festgelegte Prioritäten der Schutzregeln;
4. unabhängige Validierung der entscheidenden Modelle;
5. ein geschlossenes Release-Gate und verständlichere Ergebnisführung.

Bis dahin ist die Suite ein starkes persönliches Analyse- und
Jahressteuerungswerkzeug mit klaren Grenzen – kein autonomer Ruhestandsberater
und keine alleinige Freigabeinstanz für reale Vermögensentscheidungen.
