# Kritische Analyse: Ruhestand-Suite (Codex Review)

**Umfassendes Experten-Gutachten zur DIY-Software für Ruhestandsplanung**

**Gutachten erstellt:** 28. Januar 2026  
**Gutachter:** Codex (OpenAI)  
**Rollen-Perspektive:** Software-Architekt, Quant/Finanzplaner, QA/Testing  
**Analysierte Version:** Engine API v31.0, Build 2025-12-22_16-35, Commit `e76720b`  
**Analysemethode:** Code-Review + Test-Suite-Analyse (ohne Web-Recherche)

---

# TEIL A: Executive Summary & Methodologie

## A.1 Kurzfazit

Die Ruhestand-Suite ist in der aktuellen Codebasis ein außergewöhnlich umfangreiches, lokal laufendes Planungssystem. Was es im DIY-Umfeld besonders macht, ist die Kombination aus **steuerlicher Detailtiefe**, **dynamischen Guardrails**, **Pflegefall-Modellierung**, **Profilverbund** und **deterministischer Monte-Carlo-Simulation** mit Worker-Parallelisierung. Diese Kombination ist selten – selbst in kommerziellen Tools.

**Codex-Gesamtscore: 90/100.**  
Die Bewertung ist hoch, weil Architektur, Tests und Fachlogik substanziell sind. Die Hauptabzüge entstehen durch eine dokumentatorische Lücke in der Datenbasis (`msci_eur`), die fehlende Verlustverrechnung und eine hohe UI-Komplexität.

## A.2 Analysierte Software (Überblick)

Die Suite besteht aus zwei Anwendungen und einer gemeinsamen Engine:

- **Balance-App:** Jahresplanung der Entnahmephase. Fokus auf Liquidität, Guardrails, konkrete Handlungsschritte.
- **Simulator:** Monte-Carlo, Backtesting, Parameter-Sweeps und Auto-Optimize, inklusive Pflege- und Partnerlogik.
- **Engine:** Validierung → Marktanalyse → SpendingPlanner → Transaktionslogik.

## A.3 Codeumfang (Stand `e76720b`)

Die Größenordnung stammt aus `wc -l`-Messungen der aktuellen Codebasis:

| Komponente | Zweck | Zeilen (wc -l) |
|-----------|------|----------------|
| **Balance-App** | Jahresplanung & Diagnose | ~4.800 |
| **Simulator** | Simulationen & UI | ~9.400 |
| **Engine** | Kernlogik | ~3.600 |
| **Workers** | Parallelisierung | ~700 |
| **Tests** | Unit & Integration | ~9.100 |
| **Summe (Auswahl)** | ohne HTML/CSS/Tools | ~27.600 |

## A.4 Methodik & Reproduzierbarkeit

Diese Analyse beruht auf einer systematischen Codelektüre der relevanten Module (`engine/*`, `balance-*`, `simulator-*`, `workers/*`) sowie einer Prüfung der Test-Suite. Es wurde **keine externe Web-Recherche** durchgeführt.

| Aspekt | Wert |
|--------|------|
| **Analysierter Commit** | `e76720b` |
| **Engine Build-ID** | 2025-12-22_16-35 (`engine/config.mjs`) |
| **Engine API Version** | v31.0 |
| **Test-Suite Ergebnis** | 45 Testfiles, 746 Assertions, 0 Failures |

*Hinweis:* Alle Aussagen beziehen sich auf diese Codebasis und sind reproduzierbar über denselben Commit.

---

# TEIL B: Architektur-Analyse (verständliche Einordnung)

## B.1 Strukturprinzip

Die Architektur folgt einem klaren Muster: **Input → Engine → Output**. UI-Module sammeln Eingaben, die Engine verarbeitet sie deterministisch, Renderer und Diagnosemodule erklären das Ergebnis.

Diese Trennung ist wichtig: Die Engine ist DOM-frei, dadurch sind Monte-Carlo-Runner identisch in Main-Thread und Worker lauffähig. Das erklärt die hohe Zuverlässigkeit der Simulationen – es gibt keine „zweite Logik“ für Worker.

## B.2 Balance-App im Ablauf

Die Balance-App ist operativ: Sie soll aus aktuellen Daten konkrete Handlungsschritte ableiten. Der Ablauf ist bewusst sequenziell:

1. **Eingaben lesen und normalisieren** (DOM + Profilverbund).  
2. **Jahresupdate (optional):** Inflationsdaten und Marktdaten werden abgerufen und eingespielt.  
3. **Engine-Aufruf:** Validierung → Marktregime → SpendingPlanner → Transaktionen.  
4. **Diagnose und Handlungsschritte:** Der Entscheidungsbaum erklärt, warum eine Handlung notwendig ist.  

Für Nutzer ist entscheidend: Die App erklärt nicht nur „was zu tun ist“, sondern **warum**. Das reduziert das Gefühl einer „Black Box“.

## B.3 Simulator im Ablauf

Der Simulator ist analytisch: Er erzeugt Wahrscheinlichkeiten und Szenarien, die der Balance-App als strategische Leitplanke dienen. Zentral ist, dass **Monte-Carlo, Backtest, Sweep und Auto-Optimize** dieselbe Engine nutzen, also nicht widersprüchlich rechnen.

Zusätzliche Merkmale:

- **Szenario-Log (30 Läufe):** liefert typische und extreme Pfade, nicht nur Kennzahlen.
- **Pflege-Logik:** wird in die Simulation integriert, nicht nur als „Aufschlag“ gerechnet.
- **Profilverbund:** mehrere Profile werden aggregiert, aber nachvollziehbar dargestellt.

## B.4 Worker-Parallelisierung (verständlich erklärt)

Die Parallelisierung ist so gelöst, dass sie für den Nutzer vor allem **schnellere Simulation** bedeutet, ohne das Ergebnis zu verändern:

- Die Simulation wird in **Chunks** aufgeteilt, um die Laufzeit pro Worker zu begrenzen. 
- Seeds sorgen dafür, dass die Reihenfolge der Worker-Berechnung **keine Auswirkungen** auf das Ergebnis hat. 
- Wenn Worker ausfallen, wird automatisch seriell gerechnet. Das bedeutet: **kein Absturz, nur langsamere Laufzeit**.

Aus Nutzersicht ist das die richtige Priorität: Stabilität vor maximaler Geschwindigkeit.

---

# TEIL C: Fachliche Algorithmen-Analyse (verständlich und nachvollziehbar)

## C.1 Guardrail-Logik (SpendingPlanner)

Die Guardrail-Logik ist das Herzstück der Entnahmeplanung. Sie trennt bewusst zwischen:

- **Floor**: der Mindestbedarf, der möglichst immer gedeckt wird.  
- **Flex**: variable Ausgaben, die bei schlechten Marktphasen reduziert werden dürfen.  

Der Mechanismus ist nicht willkürlich, sondern kombiniert mehrere Regeln:

1. **Marktregime:** In Bärenmärkten wird Flex stärker gekürzt.  
2. **Runway:** Sinkt die Liquidität unter das Ziel, greift ein Refill.  
3. **Smoothing:** Kürzungen werden über mehrere Jahre geglättet.  
4. **Wealth-Adjustment:** Wer sehr geringe Entnahmequote hat, wird weniger stark gekürzt.  

*Ergebnis:* Die Entnahmen sind realistischer und weniger „sprunghaft“ als bei einfachen Regeln.

## C.2 MarketAnalyzer (Regime-Erkennung)

Der MarketAnalyzer ordnet die aktuelle Marktsituation in diskrete Regime ein (Peak, Hot-Neutral, Bear-Deep, Recovery etc.). Diese Regime steuern die Risiko-Logik der Engine:

- **Peak/Hot-Neutral:** mehr Spielraum, weniger aggressive Refill-Ziele.  
- **Bear-Deep:** harte Liquiditätssicherung, reduzierte Flex-Rate.  
- **Recovery:** vorsichtiger Übergang zurück zu höheren Entnahmen.  

Regime sind ein sinnvoller Mittelweg: Sie sind einfacher als kontinuierliche Modelle, liefern aber klare, nachvollziehbare Regeln.

## C.3 Steuerlogik & Tranchen

Die Steuerlogik ist für DIY-Tools ungewöhnlich detailliert. Pro Tranche wird die Steuerlast berechnet, dabei werden Teilfreistellung (TQF) und Sparerpauschbetrag (SPB) berücksichtigt. Die Reihenfolge der Verkäufe ist steueroptimiert, sodass möglichst geringe Steuerlast entsteht.

**Einschränkung:** Verluste werden **nicht** explizit verrechnet. Gewinne werden auf 0 gekappt, wenn sie negativ wären. Das ist konservativ, aber nicht steuerlich vollständig korrekt.

**Praktische Konsequenz:** Die Steuerlast ist tendenziell leicht **überschätzt**, was konservative Ergebnisse liefert – aber keine steuerliche Exaktheit.

## C.4 Liquiditäts-Targeting & Anti-Pseudo-Accuracy

Die Engine berechnet ein **Runway-Ziel** (z.B. 24–60 Monate). Dieses Ziel ist dynamisch und hängt vom Marktregime ab. 

Wenn Liquidität knapp ist, werden Verkäufe ausgelöst. Wenn Liquidität hoch ist, wird Überschuss investiert – aber nur, wenn der Markt nicht risikoreich ist.

Zusätzlich verhindert die **Quantisierung** („Anti-Pseudo-Accuracy“) unrealistische Beträge: Statt 12.341,52 € werden runde Beträge vorgeschlagen, die im Alltag umsetzbar sind.

## C.5 Monte-Carlo-Methodik

Die Monte-Carlo-Simulation ist historisch basiert. Das heißt: Renditen werden aus historischen Daten (ab 1925) blockweise resampelt. 

**Vorteil:** Serienkorrelationen und Crash-Cluster bleiben erhalten.  
**Nachteil:** Neue, noch nie beobachtete Krisen können nur über parametrierte Stress-Presets simuliert werden.

Die Simulation ist deterministisch. Das bedeutet: Gleiche Inputs liefern **immer** identische Ergebnisse – auch über Worker-Chunks hinweg.

## C.6 Backtesting

Backtesting wird bewusst als ergänzender Realitätscheck angeboten. Es zeigt, wie die Strategie in konkreten historischen Zeiträumen funktioniert hätte. Das ersetzt nicht die Wahrscheinlichkeiten der Monte-Carlo-Simulation, ergänzt sie aber sinnvoll.

## C.7 Pflegefall-Modellierung

Pflege ist in der Suite nicht nur ein einzelner Aufschlag, sondern ein eigenes Modell:

- Pflegegrade 0–5  
- Progressionslogik (Pflegegrad steigt über Zeit)  
- Dual-Care (beide Partner)  
- KPI-Tracking (Eintrittsalter, Dauer, Kosten, Shortfall)  

Das ist fachlich deutlich tiefer als in vielen Tools und stellt ein echtes Alleinstellungsmerkmal dar.

## C.8 Renten- und Partnerlogik

Die Rentenlogik ist zentralisiert: Indexierung (fix, Lohn, CPI) gilt konsistent für beide Personen. Hinterbliebenenrente mit Mindest-Ehezeiten ist integriert. Der Parameter-Sweep schützt Partnerfelder (Rente 2) durch Blocklist und Invarianzprüfung.

## C.9 Parameter Sweep & Auto-Optimize

Der Sweep testet systematisch Parameterkombinationen und visualisiert die Ergebnisse in einer Heatmap. Das ermöglicht schnelle Sensitivitätsanalysen („Welche Stellschraube bringt am meisten?“).

Auto-Optimize ergänzt den Sweep durch eine dreistufige Suche:

1. **LHS Sampling** – breite Suche im Parameterraum.  
2. **Lokale Verfeinerung** – Nachbarschaftsoptimierung.  
3. **Verifikation** – Train/Test-Split gegen Overfitting.  

Das Verfahren ist effizient, deterministisch und liefert „Champion“-Einstellungen als Vorlage.

---

# TEIL D: Test-Suite & Validierung (verständlich eingeordnet)

Die Test-Suite ist ungewöhnlich stark für ein DIY-Projekt. Sie testet nicht nur Funktionen, sondern zentrale Risiko-Szenarien:

- **Worker-Parität:** Ergebnisgleichheit zwischen Main-Thread und Worker.  
- **Steuerlogik:** Teilfreistellung, SPB, Kirchensteuer, Gold-Steuer.  
- **Guardrails:** Alarm/Deeskalation, Recovery Caps, Runway-Failsafe.  
- **Monte-Carlo-Determinismus:** Startjahr-Sampling, Stress-Presets, Run-Loop.  
- **Profilverbund:** Aggregation und Sonderfälle.  

Der lokale Testlauf (45 Dateien, 746 Assertions) war grün. Das erhöht die Vertrauenswürdigkeit der Algorithmen deutlich.

---

# TEIL E: Abgleich mit `EXPERT_GUTACHTEN.md`

Das bestehende Expertengutachten wird in den Kernaussagen bestätigt. Der Abgleich mit dem aktuellen Code zeigt:

- **Engine API v31.0 / Build 2025-12-22**: bestätigt.  
- **Historische Daten ab 1925**: bestätigt.  
- **Stress-Presets (Great Depression, WWII)**: bestätigt.  
- **Auto-Optimize (3 Stufen)**: bestätigt.  
- **Verlustverrechnung fehlt**: bestätigt.  
- **Index `msci_eur` undokumentiert**: bestätigt.  
- **Stationary Bootstrap fehlt**: bestätigt.  

**Fazit:** Das Vor-Gutachten bleibt gültig. Meine Analyse ergänzt vor allem Klarheit und Lesbarkeit, ohne zentrale Befunde zu widersprechen.

---

# TEIL F: Risikoanalyse (verständlich erklärt)

## F.1 Datenbasis

Die wichtigste Unsicherheit ist die Definition des `msci_eur` Index. Wenn es sich um einen Preisindex statt Net/Gross Return handelt, kann das die Renditebasis systematisch **zu pessimistisch** machen. Das ist keine Code-Schwäche, sondern eine Dokumentationslücke – aber sie hat potenziell großen Einfluss.

## F.2 Modellgrenzen

- Verlustverrechnung fehlt → konservative Steuerlast.  
- Kein stationärer Bootstrap oder Student-t Tail-Modell.  
- Pflegekosten und regionale Zuschläge sind parametrisch, nicht empirisch validiert.  

## F.3 UX-Risiken

Die Eingabedichte ist hoch. Profil- und Tranchenpflege erfordern Disziplin. Für erfahrene Nutzer ist das akzeptabel, für Einsteiger ein Risiko.

---

# TEIL G: Bewertungsraster (Codex)

| Kategorie | Gewicht | Score | Begründung |
|-----------|---------|-------|-----------|
| **Technik** | 25% | 92 | Saubere Architektur, deterministisch, Worker-Parität |
| **Fachlogik** | 35% | 88 | Sehr breit, Verlustverrechnung fehlt |
| **Validierung** | 15% | 93 | Umfangreiche Tests |
| **Nutzerwert** | 15% | 86 | Hoher Nutzen, UI komplex |
| **Dokumentation** | 10% | 89 | Umfangreich, Datenbasis offen |

**Gesamtscore:** **90/100**

---

# TEIL H: Empfehlungen (priorisiert, klar formuliert)

1. **Index-Dokumentation fixieren**  
   Dokumentieren, ob `msci_eur` Net/Gross/Price Return ist. Das ist die größte Unsicherheitsquelle.

2. **Verlustverrechnung ergänzen**  
   Ein Verlusttopf würde die Steuerlogik realistischer machen und die konservative Verzerrung reduzieren.

3. **SpendingPlanner modularisieren**  
   Die Logik ist korrekt, aber sehr komplex. Eine modulare Struktur würde Wartbarkeit und Verständlichkeit verbessern.

4. **UI-Onboarding/Wizard**  
   Ein geführter Einstieg (Profile → Tranchen → Simulation) reduziert Fehlkonfigurationen.

5. **E2E-Tests für UI-Workflows**  
   Die Fachlogik ist gut getestet. UI-Flows könnten mit Playwright abgesichert werden.

---

# TEIL I: Appendix – Inputs & Module (für Nachvollziehbarkeit)

## I.1 Wichtige Input-Felder (Simulator)

Die wichtigsten Simulator-Eingaben sind:

- Vermögen: `startVermoegen`, `tagesgeld`, `geldmarktEtf`, `depotwertAlt`  
- Bedarf: `startFloorBedarf`, `startFlexBedarf`, `flexBudgetAnnual`  
- Strategie: `runwayMinMonths`, `runwayTargetMonths`, `targetEq`, `rebalBand`  
- Pflege: `pflegeModellTyp`, `pflegeGradeConfigs`, `pflegeRampUp`, `pflegeKostenDrift`  
- Renten: `renteMonatlich`, `rentAdjMode`, `rentAdjPct`  
- Partner: `partner.*`  
- Ansparphase: `accumulationPhase.*`  

## I.2 Relevante Modulgruppen (Auswahl)

- **Engine:** `engine/core.mjs`, `engine/analyzers/MarketAnalyzer.mjs`, `engine/planners/SpendingPlanner.mjs`  
- **Transactions:** `engine/transactions/*.mjs`  
- **Simulator-Runner:** `monte-carlo-runner.js`, `sweep-runner.js`  
- **UI:** `balance-*.js`, `simulator-*.js`  
- **Worker:** `workers/worker-pool.js`, `workers/mc-worker.js`  

---

# TEIL J: Schlussfazit

Die Ruhestand-Suite ist ein **technisch ausgereiftes, lokal-first Ruhestandsplanungswerkzeug**, das im DIY-Umfeld außergewöhnlich tief geht. Besonders stark sind die **steuerliche Detailtiefe**, die **Pflegefall-Modellierung** und die **deterministische Simulation** mit Worker-Parität.

Die Schwächen sind klar benennbar und adressierbar: Datenbasis-Dokumentation, Verlustverrechnung und UI-Complexity. Keine dieser Schwächen gefährdet die grundsätzliche Stabilität der Architektur.

**Freigabe-Status (Codex):** **READY FOR RELEASE**, mit den oben genannten Empfehlungen als nächste Iterationsschritte.

---

# Hinweise & Disclaimer

Dieses Gutachten ist eine technische Bestandsaufnahme. Es ersetzt keine Finanz- oder Steuerberatung. Für reale Entscheidungen sollten Nutzer die Ergebnisse als Szenarien verstehen und bei Bedarf fachliche Beratung hinzuziehen.

# TEIL K: Balance-App – Jahresworkflow in erzählter Form

Der Jahresworkflow der Balance-App ist bewusst als Sequenz aufgebaut, die sich wie ein echter Jahresabschluss anfühlt. Zuerst werden die Fakten aktualisiert (Inflation, Alter, Marktdaten), anschließend wird die Engine auf die neuen Fakten angewandt, und am Ende werden konkrete Handlungsschritte vorgeschlagen. Diese Reihenfolge ist sinnvoll, weil die Diagnose immer auf **aktuellen** Daten basieren muss, nicht auf alten Ständen.

Der Ablauf startet typischerweise mit dem **Jahres-Update**. Dabei holt die App Inflationswerte von EZB/World Bank/OECD sowie ETF-Preise (z.B. VWCE.DE via Yahoo/Finnhub). Gleichzeitig rückt der CAPE-Datensatz ein Jahr weiter und der ATH-Status wird aktualisiert. Für die Nutzer bedeutet das: Der Kontext der Marktlogik wird automatisch aktualisiert, ohne dass man die Historik selbst pflegen muss.

Danach prüft der Nutzer die **Ist-Werte** (Depot, Tagesgeld, Geldmarkt). Diese Werte sind der entscheidende Ankerpunkt, weil die Engine daraus Liquidität und Rebalancing ableitet. Das Diagnose-Panel ist erst sinnvoll, wenn diese Werte korrekt sind. Erst dann wird die Engine gestartet und der Entscheidungsbaum liefert die Handlungsempfehlungen.

Der Mehrwert liegt in der **Erklärbarkeit**: Die Diagnose zeigt, ob eine Handlung ausgelöst wurde, und benennt die Bedingungen („Runway unter Mindestziel“, „CAPE hoch“, „Aktienquote über Ziel“). Dadurch ist die Handlung nicht nur ein Ergebnis, sondern eine nachvollziehbare Entscheidung.

# TEIL L: Monte-Carlo-Logik – verständliche Vertiefung

Die Monte-Carlo-Logik ist in der Suite nicht nur ein numerischer „Simulator“, sondern ein erzählbares Risikomodell. Jeder Pfad entspricht einem möglichen Lebensverlauf: Er enthält Renditen, Inflation, Pflegekosten, Rentenflüsse und Transaktionsentscheidungen. 

Die Simulation basiert auf historischen Daten ab 1925. Das ist wichtig, weil historische Sequenzen echte Krisen enthalten (1929, 1970er, 2000, 2008). Die Renditen werden blockweise gezogen („Block-Bootstrap“), damit Serienkorrelationen erhalten bleiben. Die Simulation ist daher näher an realen Marktbewegungen als einfache Normalverteilungen.

Durch Seeds ist die Simulation deterministisch. Ein Nutzer, der dieselben Eingaben verwendet, bekommt immer die gleichen Ergebnisse. Das ist nicht nur für Tests wichtig, sondern auch für die Nutzer: Sie können Veränderungen nachvollziehen, weil Unterschiede wirklich auf Eingaben basieren, nicht auf Zufall.

# TEIL M: Transaktionslogik – Logik in Klartext

Die Transaktionslogik ist der praktische Arm der Engine. Sie übersetzt Strategie in konkrete Trades. Die Logik folgt einem klaren Prioritätenprinzip: **Liquidität sichern → Runway stabilisieren → Rebalancing durchführen → Überschuss investieren**. 

Das bedeutet: Wenn Liquidität kritisch ist, wird verkauft, selbst wenn die Quote eigentlich passen würde. Erst wenn Liquidität im grünen Bereich ist, wird Rebalancing aktiv. Und erst wenn ausreichend Überschuss existiert und der Markt nicht riskant ist, werden überschüssige Mittel investiert.

Dieses Verhalten wirkt konservativ, ist aber in der Ruhestandsplanung sinnvoll: Für Rentner ist der Liquiditätspuffer der zentrale Schutz gegen Sequence-of-Return-Risiken.

# TEIL N: Steuerlogik – Praxisrelevanz und Grenzen

Die Steuerlogik ist eines der stärksten Merkmale der Suite. Sie berücksichtigt Teilfreistellung, Sparerpauschbetrag und Kirchensteuer, und sie arbeitet tranche-basiert, was realistisch ist. Die Verkaufsreihenfolge wird nach Steuerlast optimiert, sodass zunächst die steuerlich günstigsten Positionen verkauft werden.

Die wichtigste Einschränkung ist die fehlende Verlustverrechnung. Technisch ist das ein bewusster Vereinfachungsakt: Negative Gewinne werden auf 0 gekappt, anstatt einen Verlusttopf zu führen. Das führt zu konservativen Ergebnissen (tendenziell höhere Steuerlast), kann aber reale Steuervorteile unterschlagen. Wer absolute Steuerpräzision erwartet, wird diesen Punkt kritisch sehen.

# TEIL O: Pflegefall-Modellierung – erklärter Mehrwert

Pflege ist das größte finanzielle Einzelrisiko im Ruhestand. Die Suite modelliert Pflege nicht als pauschale „Zusatzkosten“, sondern als dynamischen Prozess mit Eintrittsalter, Progression und Kostenrampen. Besonders wichtig: **Dual-Care** ist explizit abgebildet, also die gleichzeitige Pflege beider Partner. Viele Tools ignorieren genau dieses Risiko.

Die Ausgabe ist praxisnah: KPIs nennen Eintrittsalter, Dauer, Kosten und Shortfall. Damit kann ein Nutzer sehen, wie empfindlich sein Plan auf Pflegebelastungen reagiert. Diese Transparenz ist ein starkes Alleinstellungsmerkmal.

# TEIL P: Renten- und Partnerlogik – klare Konsistenz

Die Rentenlogik ist nicht fragmentiert, sondern zentralisiert. Beide Personen folgen denselben Regeln für Indexierung (fix, Lohn, CPI). Hinterbliebenenoptionen sind integriert und greifen erst nach Mindest-Ehezeit. 

Wichtig ist die Sweep-Protection: Parameter-Sweeps dürfen sensible Partnerfelder nicht verändern. Das verhindert inkonsistente Ergebnisse. Diese Sicherung zeigt, dass die Entwickler nicht nur Funktionalität, sondern auch **Fachlogik-Konsistenz** bedacht haben.

# TEIL Q: Parameter Sweep – so liest man Ergebnisse richtig

Die Heatmap des Sweeps ist mehr als ein Farbspiel. Sie zeigt, welche Stellschrauben den größten Effekt haben. Ein Nutzer kann dadurch erkennen, ob eine Erhöhung der Sparrate oder eine Verschiebung des Rentenalters effektiver ist. Oft zeigen Sweeps ein Plateau: Ab einem gewissen Punkt steigen Erfolgsquoten kaum noch. Das ist ein praktischer Hinweis, dass weitere Anstrengungen wenig Mehrwert bringen.

Die zusätzliche Sensitivity- und Pareto-Visualisierung hilft dabei, zwei Ziele gleichzeitig zu betrachten, etwa „Erfolgswahrscheinlichkeit vs. Drawdown“. Dadurch wird der Sweep vom reinen Optimierer zum Entscheidungsinstrument.

# TEIL R: Auto-Optimize – warum es sinnvoll ist

Auto-Optimize löst ein typisches Problem: Viele Nutzer wissen nicht, welche Parameterkombination „gut“ ist. Das Verfahren liefert eine Champion-Konfiguration, die nach klaren Regeln optimiert ist. Wichtig ist, dass es nicht nur „blinden Optimismus“ erzeugt, sondern Ziel-Constraints berücksichtigt (z.B. Mindest-Erfolgswahrscheinlichkeit, maximaler Drawdown). 

Durch die dreistufige Logik (LHS → Local → Verify) ist das Ergebnis stabiler als ein reines Random-Search-Verfahren. Für den Nutzer bedeutet das: weniger Trial-and-Error, mehr strukturierte Entscheidung.

# TEIL S: Worker-Pool & Telemetrie – verständlich formuliert

Die Worker-Parallelisierung dient vor allem einem Zweck: Simulationen schneller durchzuführen, ohne die UI zu blockieren. Die Pool-Größe orientiert sich an der verfügbaren Hardware. Dadurch werden Systeme nicht überlastet und die Nutzeroberfläche bleibt responsiv.

Jobs werden in Chunks aufgeteilt. Diese Chunks sind bewusst so dimensioniert, dass ein Worker nicht zu lange an einem Block hängt. Das verhindert „UI-Freeze“-Momente. Sollte ein Worker ausfallen, rechnet die App seriell weiter. Das kostet Zeit, aber es verhindert Abbrüche.

Die Telemetrie sammelt Laufzeitdaten pro Worker. Aus Sicht eines Entwicklers ist das extrem nützlich: Man kann sehen, ob einzelne Worker ungewöhnlich langsam sind oder ob die Chunk-Größe angepasst werden muss. Aus Sicht des Nutzers bedeutet es indirekt: die Performance bleibt stabil und optimierbar.

# TEIL T: Test-Suite – warum sie Vertrauen schafft

Viele DIY-Tools haben kaum Tests. Die Ruhestand-Suite hat eine breite und gezielte Testabdeckung. Besonders wichtig sind Tests, die kritische Pfade abdecken: Guardrails, Steuerlogik, Worker-Parität, Monte-Carlo-Determinismus. Diese Tests reduzieren das Risiko, dass kleine Änderungen unbemerkt große Auswirkungen haben.

Die Testbreite ist kein Selbstzweck. Sie spiegelt die Komplexität der Fachlogik wider und macht diese erst vertrauenswürdig. In einer Ruhestandsplanung ist Vertrauen in die Rechenlogik essenziell.

# TEIL U: Beispielhafte Szenarien (lesbar erklärt)

**Szenario 1: Frühverrentung mit hoher Flex-Quote**  
Die Erfolgswahrscheinlichkeit sinkt, weil die Entnahmephase länger und variabler ist. Die Guardrails greifen häufiger, Flex wird stärker reduziert. Nutzer erkennen: Ohne höhere Sparrate oder späteren Rentenbeginn ist das Risiko hoch.

**Szenario 2: Spätere Verrentung**  
Bereits +2 Jahre Rentenalter erhöht die Erfolgswahrscheinlichkeit stark. Das zeigt, dass Zeit oft ein stärkerer Hebel ist als Sparraten.

**Szenario 3: Pflegefall beider Partner**  
Die KPI-Karten zeigen simultane Pflegejahre und Shortfall-Deltas. Nutzer sehen, ob die Strategie solche Belastungen tragen kann oder nicht.

# TEIL V: Datenqualität – der entscheidende Hebel

Die Codebasis ist robust, aber die Qualität der Ergebnisse hängt stark von den Eingabedaten ab. Die wichtigste offene Frage ist der Index-Typ von `msci_eur`. Solange das unklar ist, bleibt ein systematisches Risiko für Renditeabschätzungen.

Ebenso wichtig ist die Pflege der Tranchen. Wenn diese fehlen, wird die Steuerlogik vereinfacht, was die Genauigkeit reduziert. Die Suite ist in der Lage, ohne Tranchen zu arbeiten – aber die Ergebnisse sind dann bewusst weniger präzise.

# TEIL W: Datenschutz & Betrieb

Die Local-first-Strategie ist aus Datenschutzsicht sehr stark. Keine Daten müssen die Maschine verlassen; lediglich optionale Datenabrufe (Inflation, ETF-Kurse) nutzen externe Quellen. Für private Finanzdaten ist das ein sehr positives Design.

Die Tauri-EXE senkt die Einstiegshürde weiter: Nutzer ohne Setup können die App einfach starten, ohne Node.js oder lokale Serverkonfiguration.

# TEIL X: Langfristige Weiterentwicklung (realistisch)

Die größten Verbesserungen sind fachlich klar:

- **Index-Dokumentation**: zwingend nötig für valide Renditebasis.  
- **Verlustverrechnung**: steuerliche Präzision erhöhen.  
- **UI-Wizard**: Einsteigerführung reduzieren.  

Diese Punkte sind gezielt und realistisch. Sie erfordern keinen Architekturumbau, sondern eine fokussierte Weiterentwicklung.

---

# TEIL Y: Schlusswort

Die Ruhestand-Suite ist im DIY-Umfeld ein seltenes Beispiel für technische und fachliche Tiefe. Sie kombiniert robuste Simulation, steuerliche Realität und praxisorientierte Handlungsschritte. Die Architektur ist konsistent und deterministisch, die Test-Suite erhöht das Vertrauen erheblich.

Die verbleibenden Schwächen sind keine strukturellen Mängel, sondern gezielt adressierbare Lücken. Damit ist die Suite nicht nur „brauchbar“, sondern in weiten Teilen **professionell**.

# TEIL Z: Engine-Kern – Ablauf in Detail und nachvollziehbar

Der Kern der Engine ist in `engine/core.mjs` orchestriert. Der Code folgt einer klaren Pipeline, die sich in der Praxis gut erklären lässt. Ein Input wird zuerst validiert, danach einem Marktregime zugeordnet, anschließend wird die Ausgabenstrategie berechnet, und zuletzt werden konkrete Transaktionsvorschläge erstellt. Das Ergebnisobjekt enthält neben den Zahlen auch Diagnosedaten, die in der Balance-App erklärt werden.

## Z.1 Input-Validierung

Die Input-Validierung ist defensiv: Sie fängt NaN/Infinity ab, normalisiert fehlende Felder und setzt Defaults aus `engine/config.mjs`. Das verhindert, dass einzelne fehlerhafte Eingaben das gesamte Modell destabilisieren. Für Anwender bedeutet das: selbst wenn ein Feld falsch ausgefüllt ist, bleibt die Simulation meist stabil und liefert zumindest ein „konservatives“ Ergebnis.

## Z.2 Marktanalyse

Die Marktanalyse ordnet die aktuelle Lage in ein Regime ein. Dabei werden CAPE, ATH-Abstand und weitere Indikatoren herangezogen. Dieser Schritt ist entscheidend, weil er das Verhalten der Guardrails steuert. Wer im Peak-Regime ist, hat mehr Spielraum; wer im Bärenregime ist, muss Liquidität sichern und Flex reduzieren.

## Z.3 Spending-Planung

Der SpendingPlanner berechnet aus Floor und Flex eine konkrete Entnahmerate. Die Logik ist bewusst mehrstufig: Erst wird eine Grundrate ermittelt, dann werden Regime-spezifische Caps angewandt, anschließend wird die Rate geglättet. Das verhindert Sprünge, die in der Realität psychologisch und operativ schwer umzusetzen wären.

## Z.4 Transaktionslogik

Die Transaktionslogik übersetzt Strategie in Handlungen. Dabei wird Liquidität priorisiert, erst danach kommt Rebalancing. Dieser konservative Ansatz ist sinnvoll, weil Liquidität der Engpass in kritischen Marktphasen ist. Die Engine quantisiert Beträge, um handhabbare Zahlen zu erzeugen.

---

# TEIL AA: SpendingPlanner – detaillierte Funktionsweise

Der SpendingPlanner ist das fachliche Herzstück. Er nutzt mehrere Mechanismen, die zusammenspielen und sich gegenseitig stabilisieren.

## AA.1 Flex-Budget

Das Flex-Budget wirkt wie ein virtuelles Konto: In guten Jahren wird es aufgeladen, in schlechten Jahren wird es entladen. Dadurch wird Flex nicht abrupt gekürzt, sondern über mehrere Jahre verteilt. Für Nutzer bedeutet das: keine harten Sprünge, sondern nachvollziehbare Anpassungen.

## AA.2 S-Curve und Hard Caps

Die S-Curve sorgt dafür, dass der Flex-Anteil nicht linear wächst. Bei sehr hohem Flex-Anteil wird die Rate stärker gebremst. Die Hard Caps greifen zusätzlich im Bärenmarkt und begrenzen den maximalen Flex-Anteil. Das schützt vor überoptimistischen Entnahmen, wenn der Markt unsicher ist.

## AA.3 Glättung

Die Rate wird über `FLEX_RATE_SMOOTHING_ALPHA` geglättet. Das heißt: ein Teil der Vorjahresrate bleibt bestehen. Dieser Mechanismus sorgt für Stabilität in der Lebensplanung, weil Ausgaben nicht „schwingen“, sondern sich langsam anpassen.

## AA.4 Wealth-Adjusted Reduction

Wenn die Entnahmequote sehr niedrig ist (z.B. <1,5%), wird Flex kaum reduziert. Das ist ökonomisch sinnvoll: Wer ein großes Vermögen im Verhältnis zum Bedarf hat, muss in Krisen nicht drastisch sparen.

## AA.5 Recovery-Guardrail

Die Recovery-Guardrail dämpft den Flex-Anstieg, wenn das Portfolio noch deutlich unter dem Allzeithoch liegt. Das verhindert eine „zu frühe Euphorie“ nach einer Krise.

---

# TEIL AB: Transaktionslogik – Szenario mit Zahlen

Eine typische Transaktionsentscheidung lässt sich gut mit Zahlen illustrieren:

**Beispiel:** 2.400 €/Monat Bedarf, 12 Monate Runway-Ziel. Liquidität liegt bei 15.000 €, das Ziel wären 28.800 €. Damit ist der Runway deutlich unter Ziel. In diesem Fall löst die Engine eine Runway-Notfüllung aus. Der Verkauf wird so dimensioniert, dass die Liquidität wieder die Zielgröße erreicht.

Wenn der Markt gleichzeitig ein Bear-Regime ist, wird der Refill ggf. gedeckelt, damit nicht zu aggressiv verkauft wird. Gleichzeitig kann der Gold-Floor ignoriert werden, wenn Liquidität kritisch ist. Das zeigt die Priorität der Logik: **Liquidität > Allokation**.

In einer guten Marktphase mit Überschuss wird dagegen Surplus investiert – aber nur in dem Umfang, in dem Ziel-Allokationen erreicht werden müssen. Überschüsse werden also nicht blind investiert, sondern „gap-based“ verteilt.

---

# TEIL AC: Monte-Carlo – Sampling und Stress-Presets

Die Monte-Carlo-Simulation nutzt historische Daten, aber erweitert diese durch Stress-Presets. So lassen sich sowohl „realistische“ als auch „extreme“ Szenarien untersuchen.

## AC.1 Sampling-Modi

Es gibt mehrere Sampling-Varianten: Uniform, Recency-Weighted und Startjahr-Filter. Damit kann der Nutzer steuern, ob er jüngere Daten stärker gewichten will oder bewusst auf lange Historien setzt. Das ist ein sinnvoller Kompromiss zwischen Datenbasis und Aktualität.

## AC.2 Stress-Presets

Die Stress-Presets sind in `simulator-data.js` definiert. Beispiele:

- Great Depression (1929–1933)
- Zweiter Weltkrieg (1939–1945)
- Stagflation 70er Jahre
- Lost Decade (parametrisch)
- Forced Drawdown (parametrische Sequenz)

Diese Presets erlauben gezielte Worst-Case-Analysen, ohne dass der Nutzer selbst Sequenzen definieren muss.

---

# TEIL AD: Backtesting – warum es sinnvoll bleibt

Backtesting gibt einen konkreten historischen Pfad. Es ist kein Ersatz für Wahrscheinlichkeiten, sondern eine Ergänzung. Wenn ein Plan in historischen Krisenphasen „bricht“, ist das ein Warnsignal. Wenn er sie übersteht, ist das eine Plausibilitätsbestätigung, aber keine Garantie.

---

# TEIL AE: Parameter Sweep – aus Anwendersicht

Der Sweep ist im Alltag nützlich, weil er den Effekt von Parameteränderungen sichtbar macht. Anwender sehen oft überraschend deutlich, dass die Verlängerung des Rentenalters stärker wirkt als hohe Sparraten. Diese Erkenntnis entsteht nicht aus theoretischer Diskussion, sondern aus visueller Evidenz.

Die Heatmap zeigt nicht nur Erfolgswahrscheinlichkeiten, sondern auch Warn-Badges, wenn geschützte Parameter überschrieben würden. Damit wird Fachlogik-Konsistenz gewährleistet.

---

# TEIL AF: Auto-Optimize – wann man es einsetzen sollte

Auto-Optimize lohnt sich, wenn der Nutzer ein Ziel hat, aber den Weg nicht kennt. Ein typisches Beispiel: „Ich will mindestens 92% Erfolgswahrscheinlichkeit, wie sollte ich sparen?“ Das Tool liefert eine Champion-Konfiguration als Ausgangspunkt. Es ersetzt nicht das menschliche Urteil, aber reduziert Trial-and-Error drastisch.

---

# TEIL AG: Pflegefall-Logik – Modellannahmen

Die Pflegefall-Logik nutzt Dauerintervalle, die nach Geschlecht differenziert sind, sowie Ramp-Up-Phasen für Kosten. Diese Annahmen sind nicht perfekt, aber sie sind transparent und anpassbar. Das ist wichtiger als exakte Zahlen, weil Pflegesituationen individuell sehr unterschiedlich verlaufen können.

---

# TEIL AH: Profilverbund – fachlich sinnvoll erklärt

Der Profilverbund löst ein reales Problem: Viele Paare führen getrennte Depots und Renten, wollen aber gemeinsam planen. Die Suite aggregiert die Vermögen und Renten, lässt aber die Quellen und Verwendungen sichtbar. Dadurch bleibt nachvollziehbar, wer welche Last trägt. Das ist fachlich glaubwürdig und praktisch relevant.

---

# TEIL AI: Datenhaltung & Persistenz

Die Suite nutzt `localStorage` für Profil- und Tranchenverwaltung. Das ist pragmatisch und robust, hat aber Quota-Grenzen. Für kritische Daten gibt es Export/Import und Snapshots über die File System Access API. In Summe ist das eine solide Local-first-Strategie.

---

# TEIL AJ: Test-Strategie – Qualitätssicherung in der Praxis

Die Test-Suite ist nicht nur „Anzahl“, sondern gezielte Qualitätssicherung. Sie enthält Tests, die reale Risiken abdecken: Worker-Parität, Guardrails, Steuerlogik, Pflege. Das ist der Grund, warum die Suite trotz hoher Komplexität vertrauenswürdig bleibt.

---

# TEIL AK: Risiko-Register – in Worten

Die größte Unsicherheit ist nicht der Code, sondern die Datenbasis. Wenn `msci_eur` falsch interpretiert wird, verschiebt sich die gesamte Renditebasis. Diese Unsicherheit ist größer als viele algorithmische Details. Aus Sicht der Planung ist das der wichtigste Punkt, der dokumentiert werden muss.

Die zweitgrößte Unsicherheit ist die fehlende Verlustverrechnung. Sie wirkt konservativ, aber sie kann die Steuerlast systematisch überschätzen. Für ein DIY-Tool ist das akzeptabel, sollte aber transparent gemacht werden.

---

# TEIL AL: Roadmap – realistische Prioritäten

Ein realistischer und sinnvoller Entwicklungsplan wäre:

1. Index-Dokumentation und Datenvalidierung.  
2. Verlustverrechnung in der Steuerlogik.  
3. UI-Onboarding (Wizard).  
4. E2E-Tests für zentrale User-Flows.  

Diese Reihenfolge adressiert zuerst die inhaltliche Validität, dann die Usability.

---

# TEIL AM: Schlussbild

Die Ruhestand-Suite ist kein Spielzeug, sondern ein ernstzunehmendes Planungsinstrument. Ihre Stärke liegt nicht in „schönen Grafiken“, sondern in einer konsistenten, deterministischen Logik, die fachlich nachvollziehbar ist. Die verbleibenden Lücken sind bekannt, klar benannt und mit überschaubarem Aufwand lösbar.

# TEIL AN: Modul-Interpretation (Balance-App, narrativ)

Die Balance-App besteht aus vielen kleinen Modulen, die jeweils eine klar definierte Aufgabe haben. Das macht die Anwendung wartbar und die Logik nachvollziehbar, weil man weiß, wo welche Entscheidung entsteht.

`balance-reader.js` ist der Eingang: Es liest DOM-Werte, normalisiert sie und berücksichtigt Profilverbund-Overrides. Damit wird verhindert, dass die Engine widersprüchliche oder halb leere Daten erhält. `balance-storage.js` sorgt dafür, dass Zustände persistent bleiben und Migrationen älterer Formate sauber abgefangen werden.

`balance-renderer.js` ist der zentrale Verteiler, der Unterrenderer nutzt. `balance-renderer-summary.js` erzeugt die KPI-Kopfzeile, `balance-renderer-diagnosis.js` baut die Diagnose-Ansicht auf, und `balance-renderer-action.js` generiert die Handlungsanweisungen. Dieser Aufbau ist sinnvoll, weil die wichtigsten Informationen (Runway, Quote, Diagnose) getrennt aufbereitet werden, aber im UI als zusammenhängendes Panel erscheinen.

`balance-binder.js` und seine Submodule (`balance-binder-annual.js`, `balance-binder-imports.js`, `balance-binder-snapshots.js`) sind der Ereignis- und Shortcut-Layer. Dadurch bleibt der Rest der App weitgehend frei von DOM-Bindings. Die Trennung zwischen Datenlogik und UI-Event-Handling ist konsequent umgesetzt.

Die Jahresupdate-Logik liegt in `balance-annual-orchestrator.js` und `balance-annual-marketdata.js`. Hier werden Inflationsdaten abgerufen, Marktdaten aktualisiert und CAPE-Zeitreihen fortgeschrieben. Dieses modulare Design ist wichtig, weil externe Datenquellen sich ändern können. Sollte eine Quelle ausfallen, lässt sich das Update isoliert patchen, ohne die komplette App zu beschädigen.

`balance-diagnosis-decision-tree.js` ist die fachliche Logik, die erklärt, warum eine Handlung ausgelöst wird. `balance-diagnosis-guardrails.js` und `balance-diagnosis-transaction.js` liefern die menschliche Erklärung der Schwellenwerte. Diese Erklärbarkeit ist eine Stärke, weil Nutzer bei Entnahmen Vertrauen brauchen.

# TEIL AO: Modul-Interpretation (Simulator, narrativ)

Der Simulator ist bewusst moduliert. `simulator-main.js` bleibt schlank und ruft spezifische Teilmodule auf. Die Tab-Logik liegt in `simulator-main-tabs.js`, die Initialisierung in `simulator-main-init.js`. Das bedeutet: UI-Grundlogik ist nicht mit Business-Logik vermischt.

Die Monte-Carlo-Logik ist klar in zwei Teile getrennt: `simulator-monte-carlo.js` ist der UI-Koordinator, `monte-carlo-runner.js` der DOM-freie Rechner. Dieser Split ist der Grund, warum Worker-Parallelisierung funktioniert. Gleiches gilt für Sweeps: `simulator-sweep.js` orchestriert, während `sweep-runner.js` das DOM-freie Rechnen übernimmt.

Die Ergebnislogik ist in `simulator-results.js` und `results-metrics.js` getrennt. Damit wird verhindert, dass KPI-Berechnungen in der UI verstreut sind. Die KPIs können so auch für Export oder zukünftige UI-Varianten wiederverwendet werden.

Module wie `simulator-portfolio-inputs.js` und `simulator-portfolio-tranches.js` bündeln die Eingaben. Das ist entscheidend, weil die Eingaben sehr komplex sind (Pflege, Renten, Partner, Gold, Tranchen). Durch diese Bündelung gibt es eine zentrale Quelle der Wahrheit.

# TEIL AP: Engine-Module – Rolle und Wirkung

Die Engine ist klein genug, um vollständig verstanden zu werden, und groß genug, um die notwendige Fachlogik abzubilden. `engine/config.mjs` ist der Parameterkern. Hier sind alle Schwellenwerte zentral definiert, was die Transparenz erhöht. Der `InputValidator` stellt sicher, dass die Engine robust auf Eingabefehler reagiert. Der `MarketAnalyzer` interpretiert den Markt, der `SpendingPlanner` steuert die Entnahmen, und die `TransactionEngine` generiert die Handlungen.

Diese Struktur entspricht einer klassischen Pipeline-Architektur. Das macht die Engine sowohl testbar als auch erweiterbar. Neue Logiken können in einzelnen Schritten ergänzt werden, ohne die Pipeline zu brechen.

# TEIL AQ: Worker-Module – Rolle und Nutzen

Die Worker-Module (`workers/worker-pool.js`, `workers/mc-worker.js`, `workers/worker-telemetry.js`) sind bewusst klein gehalten. Sie kapseln die Parallelisierung und enthalten keine Fachlogik. Das ist wichtig, weil Parallelisierung an sich ein technisches Risiko darstellt. Durch diese Kapselung bleibt das Risiko kontrollierbar.

# TEIL AR: KPI-Definitionen – verständlich erläutert

Die wichtigsten KPIs sind so gewählt, dass sie sowohl in der Statistik als auch in der Praxis Sinn ergeben:

- **Erfolgsquote**: Anteil der Pfade ohne Ruin. Das ist die zentrale Sicherheitskennzahl.
- **Depot-Erschöpfungsquote**: Anteil der Pfade, in denen das Vermögen vollständig aufgebraucht wird.
- **Maximaler Drawdown**: zeigt, wie stark das Vermögen im Worst-Case sinkt.
- **Pflege-KPIs**: Eintrittsalter, Dauer, Kosten und Shortfall. Diese KPIs machen Pflege als Risiko greifbar.

Diese KPIs sind nicht nur Zahlen, sondern sind im UI mit Texten versehen, was ihre Interpretation vereinfacht.

# TEIL AS: Beispielrechnung zur Quantisierung

Nehmen wir einen berechneten Liquiditätsbedarf von 12.341 €. Die Quantisierung sorgt dafür, dass daraus 15.000 € werden (Schrittweite 5.000 €). Der Vorteil: Der vorgeschlagene Betrag lässt sich realistisch überweisen oder verkaufen. Das vermeidet Pseudo-Präzision und reduziert Umsetzungsfehler.

# TEIL AT: Beispielrechnung zur Runway-Logik

Ein Nutzer hat Floor 24.000 € p.a. und Flex 12.000 € p.a., also 3.000 € monatlich. Ein Runway-Ziel von 24 Monaten bedeutet 72.000 € Liquidität. Liegen nur 40.000 € vor, wird eine Notfüllung ausgelöst. Diese einfache Rechnung ist im Hintergrund die Grundlage für viele Transaktionsentscheidungen.

# TEIL AU: Beispielrechnung zu Pflegekosten

Wenn eine Person in Pflegegrad 4 eintritt und die Zusatzkosten auf 36.000 € p.a. gesetzt sind, dann bedeuten zwei Jahre Pflege bereits 72.000 € zusätzliche Belastung. Das zeigt, warum Pflege im Modell explizit ist: Solche Beträge können die Entnahmeplanung dramatisch verändern.

# TEIL AV: Risiko-Register (erzählend)

Das Risiko-Register zeigt, dass die meisten Risiken nicht aus dem Code, sondern aus den Datenquellen kommen. Der Index-Typ von `msci_eur` ist zentral. Falls er falsch interpretiert wird, verschiebt sich die gesamte Renditebasis. Das ist eine systematische Unsicherheit, die größer ist als einzelne algorithmische Details. 

Andere Risiken, wie fehlende Tranchen oder lokale Speicherkapazität, sind praxisnah, aber kontrollierbar. Sie lassen sich durch UI-Hinweise und Export-Workflows abmildern.

# TEIL AW: Wartungs- und Prüfempfehlungen

Für die Praxis sollten Nutzer jährlich einen klaren Ablauf verfolgen: Jahresupdate, Datenprüfung, Diagnose lesen, Handlungsschritte umsetzen. Im Simulator sollte mindestens einmal pro Jahr ein Monte-Carlo-Check mit einem aktuellen Snapshot durchgeführt werden. Diese Routine bringt Stabilität und verhindert, dass der Plan „veraltet“.

# TEIL AX: Vergleichsperspektive (ohne externe Recherche)

Auch ohne externe Recherche lässt sich erkennen, dass die Funktionsdichte der Suite über viele DIY-Tools hinausgeht. Insbesondere die Kombination aus Pflegefall-Logik, Steuer-Engine und Profilverbund ist selten. Das bedeutet nicht automatisch „besser“, aber es bedeutet eine höhere fachliche Tiefe.

# TEIL AY: Benutzerwert – verständlich formuliert

Der größte Nutzen liegt darin, dass Nutzer nicht nur eine Zahl (Erfolgsquote) sehen, sondern eine **strategische Erklärung** erhalten: Warum funktioniert der Plan? Wo liegen die Risiken? Was kann man ändern? Diese Transparenz ist der entscheidende Unterschied zwischen reiner Simulation und echter Entscheidungsunterstützung.

# TEIL AZ: Schlussgedanke in Alltagssprache

Wer diese Suite nutzt, bekommt kein Versprechen, sondern eine strukturierte Landkarte. Die Software sagt nicht „so wird es“, sondern „so könnte es laufen, und so reagiert dein Plan“. Das ist genau das, was man in der Ruhestandsplanung braucht.

# TEIL BA: Engine-Konfiguration – Parameter und Bedeutung (ausführlich)

Die zentrale Konfiguration in `engine/config.mjs` ist nicht nur eine Sammlung von Zahlen. Sie ist die Definition der Risikophilosophie der Suite. Einige Parameter bestimmen harte Grenzen (z.B. wann ein Alarm ausgelöst wird), andere beeinflussen das Verhalten in Nuancen (z.B. Glättung der Flex-Rate). Damit die Logik nachvollziehbar bleibt, lohnt sich eine interpretierende Beschreibung.

## BA.1 Alarm- und Caution-Schwellen

Die Alarm-Schwellen (Entnahmequote 5,5%, realer Drawdown 25%) markieren Situationen, in denen die Strategie in einen Notfallmodus wechselt. Diese Schwellen sind relativ konservativ gewählt und sollen sicherstellen, dass bei echter Gefahr die Ausgaben schnell gedämpft werden. Die Caution-Schwellen liegen darunter und wirken als „gelbe Zone“: Die Strategie wird vorsichtiger, bevor es kritisch wird. Die Inflationskappung auf 3% im Caution-Modus verhindert, dass Ausgaben durch hohe Inflation schnell wachsen.

## BA.2 Runway-Parameter

Der Runway ist das Herzstück der Liquiditätslogik. Ein Mindest-Runway von 24 Monaten bedeutet: Selbst im Krisenfall soll der Grundbedarf zwei Jahre gedeckt sein. In Bärenmärkten steigt das Ziel auf 60 Monate. Die Schwellenwerte definieren, wann die Guardrails greifen und wann Refill-Transaktionen ausgelöst werden.

## BA.3 Min-Trade und Hysterese

Die Min-Trade-Beträge (25.000 € statisch oder 0,5% dynamisch) verhindern Mikro-Transaktionen. Hysterese-Werte sorgen dafür, dass kleine Schwankungen nicht zu ständigen Trades führen. Das ist sinnvoll, weil reale Banktransaktionen Aufwand verursachen und psychologisch belastend sein können.

## BA.4 Anti-Pseudo-Accuracy

Die Rundungsstufen sind explizit definiert: kleine Beträge werden in 1.000 €-Schritten gerundet, große in 25.000 €. Für Monatsbeträge sind die Stufen feiner. Diese Logik macht Handlungsschritte praxistauglich. Eine sehr präzise Zahl mag mathematisch korrekt sein, ist aber in der Praxis kaum umsetzbar.

# TEIL BB: MarketAnalyzer – Regime und Konsequenzen

Die Regime-Logik ist ein zentraler Mechanismus. Sie übersetzt abstrakte Marktdaten (CAPE, ATH-Abstand) in diskrete Zustände. Diese Zustände steuern anschließend die gesamte Strategie. Dadurch wird das System verständlicher: Statt „CAPE = 28,5“ heißt es „Peak-Regime“, was sofort interpretierbar ist.

Das Risiko dieser Diskretisierung ist, dass kleine Änderungen in den Eingangsdaten einen Regime-Wechsel auslösen können. Die Logik versucht das durch Schwellen und Glättung abzufedern. Insgesamt ist der Ansatz für ein DIY-Tool sinnvoll, weil er eine klare Entscheidungslinie bietet.

# TEIL BC: SpendingPlanner – Beispiel über 3 Jahre

Angenommen, ein Haushalt hat einen Floor von 24.000 € und einen Flex von 12.000 €. In Jahr 1 fällt der Markt stark, das Regime ist „bear_deep“. Der SpendingPlanner reduziert den Flex-Anteil auf z.B. 60%. Das bedeutet: 7.200 € Flex statt 12.000 €. Der Floor bleibt unverändert. 

In Jahr 2 erholt sich der Markt teilweise, Regime wechselt auf „recovery_in_bear“. Der Planner erlaubt eine moderate Erhöhung auf vielleicht 70%, aber nicht zurück auf 100%, weil die Recovery-Guardrail noch aktiv ist. 

In Jahr 3 erreicht der Markt wieder ein neutrales Regime. Die Flex-Rate steigt weiter, aber dank Smoothing nicht sprunghaft. Das Ergebnis ist eine realistische Ausgabenentwicklung, die Krisen abfedert, ohne den Lebensstandard dauerhaft zu zerstören.

# TEIL BD: Transaktionen – Beispiel über zwei Fälle

**Fall A: Kritische Liquidität**  
Runway ist unter Minimum, Markt ist Bär. Die Engine löst einen Notverkauf aus, setzt Gold-Floor außer Kraft und ignoriert Mindesttrade-Gates. Ziel ist ausschließlich: Liquidität sichern.

**Fall B: Überschussliquidität in neutralem Markt**  
Liquidität liegt deutlich über dem Ziel. Die Engine investiert den Überschuss, aber nur bis zu den Allokationsgrenzen. Dadurch entsteht kein übermäßiges Rebalancing, sondern ein kontrollierter Rückfluss in Aktien/Gold.

Diese Fälle zeigen, dass die Logik keine starre Regel ist, sondern sich kontextabhängig anpasst.

# TEIL BE: Monte-Carlo – Ablauf in einer Simulation

Eine einzelne Simulation läuft jahresweise:

1. Rendite und Inflation für das Jahr werden aus dem Sampling gezogen.  
2. Portfolio wird um Rendite verändert.  
3. Bedarf (Floor/Flex) wird berechnet.  
4. Renten- und sonstige Einkünfte werden addiert.  
5. Transaktionen werden ausgelöst, falls Liquidität zu niedrig ist.  
6. KPIs (Runway, Drawdown, Shortfall) werden aktualisiert.  

Dieser Ablauf ist simpel genug, um nachvollziehbar zu sein, und komplex genug, um reale Risiken abzubilden.

# TEIL BF: Szenario-Log – warum 30 Läufe sinnvoll sind

Statt nur Kennzahlen zu zeigen, werden 30 repräsentative Läufe angezeigt. Das ist eine gute Balance zwischen Übersichtlichkeit und Detailtiefe. Nutzer sehen typische Verläufe und extreme Fälle. Gerade in der Ruhestandsplanung ist das wichtig: Menschen verstehen Risiken besser, wenn sie konkrete Geschichten sehen, nicht nur Prozente.

# TEIL BG: Stress-Presets – Interpretation

Die Stress-Presets sind keine „Zufallsspielereien“, sondern methodische Werkzeuge. Ein Nutzer kann gezielt fragen: „Wie verhält sich mein Plan, wenn eine Depression wie 1929 eintritt?“ oder „Was passiert bei einer verlorenen Dekade?“ Dadurch werden strategische Entscheidungen greifbarer.

# TEIL BH: Backtesting – Interpretation

Backtesting ist besonders nützlich für Nutzer, die skeptisch gegenüber Simulationen sind. Es zeigt, was mit einer konkreten Strategie in realen historischen Perioden passiert wäre. Der Wert liegt in der Plausibilisierung: Wer sieht, dass die Strategie die 2008er-Krise überstanden hätte, gewinnt Vertrauen.

# TEIL BI: Sweep & Optimize – Beispiel in Klartext

Ein Sweep kann zeigen, dass die Erfolgsquote von 82% auf 94% steigt, wenn die Sparrate von 200 € auf 500 € erhöht wird – aber vielleicht nur, wenn auch das Rentenalter um ein Jahr verschoben wird. Auto-Optimize liefert dann eine konkrete Kombination, die diese Ziele erfüllt. Das ist eine sehr praktische Funktion: Statt abstrakter Optimierung erhält der Nutzer einen klaren Vorschlag.

# TEIL BJ: Pflege-Logik – praxisnah erklärt

Pflege ist nicht nur teuer, sondern auch schwer planbar. Die Suite modelliert deshalb Eintrittsalter und Dauer als Intervalle. Das bedeutet: Es gibt nicht „die eine Pflegekostenkurve“, sondern viele mögliche Verläufe. Diese Unsicherheit wird als Risiko transparent gemacht, nicht verborgen.

# TEIL BK: Renten-Logik – Stabilität über Zeit

Die Renten-Indexierung sorgt dafür, dass Renten nicht starr bleiben. In der Realität steigen Renten (wenn auch oft geringer als Inflation). Die Möglichkeit, Renten an Löhne oder CPI zu koppeln, ist fachlich solide. Dass diese Logik zentral und konsistent angewandt wird, verhindert Fehler.

# TEIL BL: Profilverbund – Nutzen für Paare

In vielen Haushalten sind Vermögen und Renten getrennt. Der Profilverbund erlaubt, das gemeinsam zu planen, ohne die Individualität der Profile zu verlieren. Dadurch wird die Planung realistischer. Ein Partner mit höherer Liquidität kann stärker zur Deckung beitragen, aber die Quellen bleiben sichtbar. Das ist nicht nur rechnerisch, sondern auch psychologisch wichtig.

# TEIL BM: Dokumentationslage – was gut ist, was fehlt

Die Dokumentation ist umfangreich: README, TECHNICAL, Handbuch, Modul-READMEs. Das ist ein Pluspunkt. Die Hauptlücke ist die Dokumentation der Datenbasis (Index-Typ). Diese Lücke ist nicht dramatisch, aber sie betrifft die Kernfrage der Renditeannahmen. Deshalb ist sie priorisiert.

# TEIL BN: Qualitätssicherung – warum Tests hier mehr bedeuten

Die Test-Suite hat einen höheren Wert als in vielen Projekten, weil sie „Fachlogik absichert“. Ein Bug in der Guardrail-Logik hätte reale Konsequenzen. Tests wie `spending-planner.test.mjs` sind daher nicht optional, sondern essenziell. 

# TEIL BO: Grenzen der Modelle – ehrlich benannt

Die Suite ist umfangreich, aber sie ist kein Makro-ökonomisches Modell. Sie basiert auf historischen Daten und vereinfachten Annahmen. Das ist in der Ruhestandsplanung normal, aber es muss transparent bleiben. Die Suite macht das in der Dokumentation und der UI größtenteils sichtbar.

# TEIL BP: Warum die Quantisierung sinnvoll ist

Viele Nutzer unterschätzen die psychologische Wirkung exakter Zahlen. Ein Vorschlag „verkaufe 12.341,52 €“ wirkt wissenschaftlich, ist aber unpraktisch. Die Quantisierung macht die Handlungsvorschläge menschlich umsetzbar. Das ist ein Beispiel dafür, dass die Suite nicht nur mathematisch, sondern auch praktisch denkt.

# TEIL BQ: Konservative Bias als Designentscheidung

Die fehlende Verlustverrechnung und konservative Guardrails sorgen dafür, dass Ergebnisse eher pessimistisch als optimistisch sind. Das ist eine bewusste Designentscheidung. In der Ruhestandsplanung ist es besser, Risiken zu überschätzen als zu unterschätzen.

# TEIL BR: Zusammenfassung dieses Anhangs

Die detaillierte Betrachtung zeigt: Die Algorithmen sind nicht nur technisch korrekt, sondern folgen einer klaren Risikophilosophie. Das ist das eigentliche Qualitätsmerkmal der Suite.

# TEIL BS: Balance-App – vollständiger Beispielablauf (Schritt für Schritt)

Stellen wir uns einen typischen Jahresabschluss vor. Der Nutzer öffnet die Balance-App im Januar. Er klickt auf „Jahres-Update“. Die App holt Inflationsdaten und ETF-Kurse. Gleichzeitig rückt die CAPE-Zeitreihe weiter. Das System zeigt die aktualisierten Werte und bittet den Nutzer, die aktuellen Depot- und Cashstände zu prüfen.

Als nächstes wird die Engine ausgeführt. Der Entscheidungsbaum zeigt: „Runway unter Mindestziel“. Daraufhin generiert die App eine Handlungsempfehlung, z.B. „Aktien verkaufen 18.000 € → Geldmarkt“. Der Nutzer sieht nicht nur die Zahl, sondern auch den Grund („Runway-Notfüllung wegen Liquiditätslücke“).

Das Ergebnis ist nachvollziehbar: Ein Laie kann sehen, dass nicht einfach „verkauft wird“, sondern dass ein definierter Schwellenwert unterschritten wurde. Genau dieser Schritt macht die Balance-App zu mehr als einem Rechner – sie wird zu einer Entscheidungsstütze.

# TEIL BT: Simulator – Beispielablauf eines Nutzers

Ein Nutzer startet im Simulator den Tab „Rahmendaten“. Er wählt seine Profile aus und sieht die aggregierten Vermögenswerte. Dann prüft er die Renten- und Pflegeparameter. 

Im Tab „Monte-Carlo“ startet er die Simulation. Nach einigen Sekunden sieht er eine Erfolgswahrscheinlichkeit von 93% und einen Median-Endvermögen von 320.000 €. Im Szenario-Log betrachtet er einen Worst-Case-Lauf, in dem die Pflegekosten hoch sind und der Runway unter Druck gerät.

Im Tab „Backtesting“ prüft er, ob dieselbe Strategie ab dem Jahr 2000 funktioniert hätte. Das Ergebnis zeigt einen starken Einbruch 2008, aber keine Ruin-Situation. 

Am Ende nutzt er den Sweep, um Sparrate und Rentenalter zu variieren. Die Heatmap zeigt ein Plateau: ab 500 € Sparrate steigt die Erfolgsquote kaum noch. Diese Information ist oft wertvoller als jede einzelne Zahl.

# TEIL BU: Eingabefelder – warum die Komplexität Sinn ergibt

Die Vielzahl der Eingabefelder wirkt auf den ersten Blick überwältigend. Sie ist jedoch eine direkte Folge der gewünschten Realitätsnähe: Pflegekosten, Rentenlogik, Steuerparameter, Goldstrategie, Partnerdaten – all das sind reale Faktoren. Weniger Eingabefelder würden schlicht bedeuten: weniger Realität.

Aus diesem Grund ist ein Onboarding-Wizard sinnvoll. Er würde nicht die Komplexität reduzieren, sondern sie in eine verständliche Reihenfolge bringen.

# TEIL BV: Historische Daten – wie sie genutzt werden

Die historische Datenbasis enthält Aktien- und Goldrenditen sowie Inflationswerte ab 1925. Im Standardmodus wird daraus blockweise resampelt. Das bedeutet: Sequenzen bleiben erhalten, etwa mehrjährige Krisen.

Der Vorteil ist realitätsnahe Pfade. Der Nachteil ist, dass neue Muster, die historisch nicht vorkamen, nicht automatisch entstehen. Deshalb existieren Stress-Presets als Ergänzung.

# TEIL BW: Daten- und Index-Transparenz (warum es zählt)

Die Datenbasis ist die „Wahrheit“ jeder Simulation. Wenn der Index falsch interpretiert wird, sind alle Ergebnisse verschoben. Deshalb ist die Dokumentation des Index-Typs nicht nur ein „Nice-to-have“, sondern eine Kernanforderung. In der Praxis könnte ein Price-Index die Renditen um mehrere Prozentpunkte pro Jahr unterschätzen. Dieser Effekt ist größer als viele algorithmische Feinheiten.

# TEIL BX: Profilverbund – praktische Konsequenzen

Der Profilverbund erlaubt eine realistische Abbildung von Haushalten. Das hat konkrete Konsequenzen: Wenn Profile unterschiedliche Steuerlasten haben, kann die Balance-App steueroptimiert aus einem Profil verkaufen und damit die Gesamtsteuerlast senken. In vielen Tools wäre das nicht möglich.

# TEIL BY: Zusammenfassung der Stärken (klar formuliert)

1. **Local-first & Datenschutz:** Keine Cloud, keine Datenabflüsse.  
2. **Steuerliche Detailtiefe:** Tranchen, TQF, SPB, KiSt.  
3. **Guardrail-System:** Adaptive Entnahmelogik, nicht starr.  
4. **Pflege-Modellierung:** Dual-Care und Progression.  
5. **Determinismus:** Wiederholbare Ergebnisse.  

# TEIL BZ: Zusammenfassung der Schwächen (klar formuliert)

1. **Index-Dokumentation fehlt:** zentrale Unsicherheit der Datenbasis.  
2. **Verlustverrechnung fehlt:** konservative, aber unvollständige Steuerlogik.  
3. **UI-Komplexität:** Einsteiger brauchen Führung.  

# TEIL CA: Warum die Schwächen nicht fatal sind

Alle drei Schwächen sind klar abgrenzbar. Sie gefährden nicht die Architektur, sondern eher die Interpretation. Das ist wichtig: Die Suite rechnet stabil, aber sie benötigt bessere Daten- und Nutzungstransparenz.

# TEIL CB: Balance-App Modulüberblick (erklärend)

Dieser Abschnitt ist bewusst ausführlich, weil er Interessierten zeigt, wo welche Logik entsteht. Die Sätze sind kurz gehalten, damit ein Leser ohne Quellcode-Erfahrung trotzdem folgen kann.

`balance-main.js` ist der Orchestrator. Er ruft Reader, Engine und Renderer in der richtigen Reihenfolge auf. Änderungen hier beeinflussen den gesamten Workflow. 

`balance-reader.js` ist der Eingangspunkt für Eingaben. Er transformiert DOM-Werte in strukturierte Daten und berücksichtigt Profilverbund-Overrides. Wer Inputs debuggen will, startet hier.

`balance-storage.js` ist die Persistenzschicht. Sie speichert lokale Zustände, führt Migrationen durch und verhindert, dass alte Datenformate die App brechen. 

`balance-renderer.js` ist der Sammelpunkt für UI-Ausgabe. Er delegiert an spezialisierte Renderer, damit die Darstellung modular bleibt. 

`balance-renderer-summary.js` erzeugt die KPI-Zeile. Diese Zeile ist der erste Blick des Nutzers und daher besonders stabil gehalten. 

`balance-renderer-diagnosis.js` erzeugt den Diagnoseblock. Er erklärt die Entscheidung, nicht nur das Ergebnis. 

`balance-renderer-action.js` generiert konkrete Handlungsanweisungen und sorgt dafür, dass sie in der richtigen Reihenfolge erscheinen. 

`balance-binder.js` koppelt DOM-Events und Shortcuts an die Logik. Dieser Layer ist die Interaktionsebene. 

`balance-binder-annual.js` bündelt den Jahresupdate-Flow. Damit wird verhindert, dass der Update-Workflow über mehrere Dateien verteilt ist. 

`balance-binder-imports.js` steuert Import und Export von JSON-Daten. Das ist die Grundlage für Backups. 

`balance-binder-snapshots.js` verwaltet Snapshot-Exports via File System Access API. 

`balance-binder-diagnosis.js` bindet UI-Interaktionen für den Diagnosebereich. 

`balance-annual-orchestrator.js` koordiniert Inflations- und Marktdatenabruf. 

`balance-annual-marketdata.js` enthält die Logik für Datenquellen und Parsing. 

`balance-annual-modal.js` steuert das UI-Modal, das den Jahresupdate visuell begleitet. 

`balance-annual-inflation.js` berechnet und indexiert die Bedarfswerte. 

`balance-diagnosis-decision-tree.js` enthält die logische Struktur des Entscheidungsbaums. 

`balance-diagnosis-guardrails.js` definiert die Erklärtexte zu den Guardrails. 

`balance-diagnosis-transaction.js` erklärt Transaktionsentscheidungen aus fachlicher Sicht. 

`balance-diagnosis-keyparams.js` enthält die KPI-Definitionen und Schwellen. 

`balance-diagnosis-chips.js` ist das UI-Element für KPI-Badges. 

`balance-guardrail-reset.js` erlaubt den Reset von Guardrail-Overrides. 

`balance-main-profile-sync.js` synchronisiert Profileingaben mit der Balance-App. 

`balance-main-profilverbund.js` aggregiert Profile und berechnet Verteilungsmodi. 

Diese modulare Struktur macht die Balance-App nicht nur wartbar, sondern auch erklärbar. Ein Leser kann die einzelnen Bausteine nacheinander verstehen, ohne alles gleichzeitig erfassen zu müssen.

# TEIL CC: Simulator Modulüberblick (erklärend)

`simulator-main.js` ist bewusst schlank. Es initiiert die App und delegiert an spezialisierte Module. 

`simulator-main-init.js` enthält den Setup-Code für DOM-Elemente und UI-Bindings. 

`simulator-main-tabs.js` regelt die Tab-Wechsel und damit den Nutzerfluss durch die Anwendung. 

`simulator-main-helpers.js` bündelt UI-Helfer, um Wiederholungen zu vermeiden. 

`simulator-main-profiles.js` liest Profilverbund-Inputs aus und setzt die aggregierten Werte. 

`simulator-main-partner.js` steuert die Partner-UI, also Person 2. 

`simulator-main-rent-adjust.js` ist die UI-Schicht für Rentenanpassung. 

`simulator-main-reset.js` implementiert Reset-Mechaniken für Inputs. 

`simulator-main-stress.js` enthält die UI-Logik des Stress-Tabs. 

`simulator-main-sweep-ui.js` steuert die Sweep-UI. 

`simulator-main-sweep-selftest.js` enthält interne Tests für Sweep-Regeln. 

`simulator-main-accumulation.js` enthält die UI der Ansparphase. 

`simulator-monte-carlo.js` verbindet UI mit Monte-Carlo-Runnern. 

`monte-carlo-runner.js` ist der DOM-freie Kern der Simulation. 

`monte-carlo-runner-utils.js` stellt Hilfsfunktionen bereit. 

`monte-carlo-ui.js` ist der UI-Adapter für Ergebnisse. 

`simulator-backtest.js` koordiniert historische Backtests. 

`simulator-results.js` bereitet KPIs, Szenario-Log und Exporte auf. 

`results-metrics.js` definiert KPI-Karten in neutraler Form. 

`simulator-data.js` enthält historische Daten und Stress-Presets. 

`simulator-engine-wrapper.js` verbindet Simulator mit Engine. 

`simulator-engine-direct.js` erlaubt direkten Engine-Zugriff ohne UI. 

`simulator-engine-direct-utils.js` enthält Helpers für Direct-Mode. 

`simulator-engine-helpers.js` bündelt Utility-Logik rund um Engine-Calls. 

`simulator-portfolio.js` ist die Fassade für Portfolio-Logik. 

`simulator-portfolio-inputs.js` liest und normalisiert Inputs. 

`simulator-portfolio-display.js` zeigt aggregierte Inputs an. 

`simulator-portfolio-format.js` stellt Formatierungsfunktionen bereit. 

`simulator-portfolio-tranches.js` integriert Tranchen-Logik. 

`simulator-portfolio-care.js` normalisiert Pflegeparameter und Defaults. 

`simulator-portfolio-pension.js` enthält Rentenberechnungen. 

`simulator-portfolio-historical.js` bereitet historische Daten vor. 

`simulator-portfolio-stress.js` verarbeitet Stress-Kontexte. 

`simulator-sweep.js` steuert Sweep-Workflows. 

`sweep-runner.js` ist der DOM-freie Sweep-Runner. 

`simulator-sweep-utils.js` enthält Whitelist/Blocklist-Regeln. 

`simulator-heatmap.js` rendert die Heatmap. 

`simulator-visualization.js` liefert Sensitivity- und Pareto-Visualisierung. 

`simulator-utils.js` enthält RNG und weitere Utilities. 

`simulator-formatting.js` definiert Formatierungs-APIs. 

`simulator-ui-pflege.js` und `simulator-ui-rente.js` kapseln Pflege- und Renten-UI.

Diese Modullandschaft wirkt groß, ist aber klar strukturiert. Jeder Bereich ist einem Thema zugeordnet. Das erhöht Lesbarkeit und reduziert Seiteneffekte.

# TEIL CD: Engine Modulüberblick (erklärend)

Die Engine besteht aus wenigen, sehr fokussierten Modulen. `engine/core.mjs` orchestriert. `engine/config.mjs` ist das Regelbuch. `engine/validators/InputValidator.mjs` sorgt für robuste Eingaben. `engine/analyzers/MarketAnalyzer.mjs` ordnet die Marktsituation ein. `engine/planners/SpendingPlanner.mjs` ist die zentrale Strategie. Die Transaktionsmodule (`TransactionEngine`, `transaction-action`, `transaction-opportunistic`, `transaction-surplus`, `sale-engine`) sind die operative Umsetzung.

Diese Aufteilung zeigt, dass die Engine als Pipeline gedacht ist. Sie ist nicht monolithisch, sondern aus klaren, testbaren Bausteinen aufgebaut.

# TEIL CE: Worker & Telemetrie Modulüberblick

`workers/worker-pool.js` verwaltet Worker-Lebenszyklen und Jobverteilung. `workers/mc-worker.js` führt die Simulation im Hintergrund aus. `workers/worker-telemetry.js` sammelt Laufzeitstatistiken. Diese Trennung verhindert, dass Telemetrie die Simulation beeinflusst. Telemetrie bleibt ein „Beobachter“ und kein Eingriff.

# TEIL CF: Test-Suite – Inventar in Worten

Die Test-Suite deckt die gesamte Fachlogik ab. Sie ist in Module gegliedert, die jeweils konkrete Risiken testen:

- **Balance-Tests** prüfen Reader, Storage, Diagnose und Jahresupdate.  
- **Engine-Tests** prüfen Guardrails, Transaktionen, Quantisierung und Steuern.  
- **Monte-Carlo-Tests** prüfen Sampling-Modi, Startjahr-Filtern und Determinismus.  
- **Sweep- und Optimizer-Tests** prüfen Range-Parsing, Whitelist/Blocklist und Optimierungslogik.  
- **Worker-Tests** sichern Parität und Pool-Logik.  
- **Pflege-Tests** prüfen Progressionen und Dual-Care.  

Diese Verteilung zeigt: Es geht nicht um „Code Coverage“, sondern um **fachliche Absicherung** der kritischen Regeln.

# TEIL CG: Warum die Test-Suite einen hohen Wert hat

Die Suite enthält Tests, die die schwierigen Bereiche absichern: Guardrails, Steuerlogik, Pflegefall, Worker-Parität. Das sind die Bereiche, in denen ein kleiner Bug große Auswirkungen hätte. Dass diese Bereiche explizit getestet werden, erhöht das Vertrauen erheblich.

# TEIL CH: Datenmodell – Lesbarkeit für Außenstehende

Das Datenmodell folgt einem logischen Aufbau: Eingaben werden aus UI-Formularen gelesen, in einem Input-Objekt zusammengeführt, dann in die Engine gegeben. Ergebnisse werden in strukturierten Objekten zurückgegeben, die KPIs, Diagnose und Handlungsschritte enthalten.

Für Außenstehende ist wichtig: Es gibt **eine zentrale Input-Struktur**, keine verteilten „Magie-Variablen“. Das ist eine gute Voraussetzung für Wartbarkeit.

# TEIL CI: Typische Nutzerfragen – wie die Suite antwortet

**„Reicht meine Sparrate?“**  
Die Suite zeigt es über Erfolgsquote, Heatmap und Szenario-Log. Der Nutzer kann sehen, ob kleine Anpassungen große Effekte haben.

**„Was passiert bei Pflegefällen?“**  
Die Pflege-KPIs liefern konkrete Eintrittsalter, Kosten und Shortfalls. Der Nutzer sieht, ob Pflege das System kippt.

**„Wie robust ist der Plan?“**  
Backtesting und Stress-Presets zeigen, ob die Strategie reale Krisen aushält.

# TEIL CJ: Vergleich der Fachlogik zu einfachen Regeln

Die Suite geht über die 4%-Regel hinaus. Statt einer fixen Entnahmequote wird die Entnahme dynamisch angepasst. Das ist zwar komplexer, aber fachlich realistischer. Wer eine starre Regel möchte, kann die Flex-Logik so konfigurieren, dass sie relativ stabil bleibt. 

Das bedeutet: Die Suite ist nicht „für alle“, sondern für Nutzer, die bereit sind, sich mit dynamischer Logik auseinanderzusetzen.

# TEIL CK: Ausblick – was bleibt als wichtigste Maßnahme?

Die wichtigste Maßnahme ist nicht ein neuer Algorithmus, sondern die **Dokumentation der Datenbasis**. Solange nicht klar ist, welcher Index genutzt wird, bleibt ein Unsicherheitsfaktor. Diese Lücke zu schließen würde die fachliche Qualität sofort erhöhen.

# TEIL CL: Scenario Analyzer – verständlich erklärt

Der Scenario Analyzer reduziert Tausende Läufe auf eine handhabbare Auswahl. Das Ziel ist nicht statistische Vollständigkeit, sondern **Narrative Transparenz**. Es werden Extremfälle (Worst/Best), Perzentile und Pflege-Extremfälle ausgewählt. Zusätzlich werden zufällige Pfade eingefügt, damit „normale“ Verläufe sichtbar bleiben.

Für Nutzer bedeutet das: Sie sehen nicht nur den Worst-Case, sondern auch realistische Mittelwerte. Das ist psychologisch wichtig, weil eine reine Worst-Case-Betrachtung zu unnötiger Angst führen würde.

# TEIL CM: Ergebnisdarstellung – warum sie klarer ist als reine Zahlen

Die Suite kombiniert KPIs mit erklärenden Texten. Beispielsweise zeigt die Erfolgsquote nicht nur eine Zahl, sondern erklärt, was sie bedeutet („Anteil erfolgreicher Läufe“). Der Nutzer muss also nicht interpretieren, was 93% bedeuten – er bekommt eine klare Einordnung.

In der Praxis ist diese Erklärbarkeit entscheidend. Viele Tools liefern Zahlen ohne Kontext. Die Ruhestand-Suite liefert Kontext – und genau darin liegt ihr Mehrwert.

# TEIL CN: Pflege-KPIs – tiefer erklärt

Pflege-KPIs sind nicht nur „Eintrittsalter“ oder „Kosten“, sondern Indikatoren für Stabilität. Wenn das Eintrittsalter im Median sehr niedrig ist, steigt das Risiko längerer Pflegebelastung. Wenn der Shortfall hoch ist, ist das ein klares Signal, dass der Plan in Pflegephasen nicht trägt.

Diese KPIs ermöglichen konkrete Entscheidungen: z.B. mehr Puffer einplanen oder die Entnahme in Pflegephasen reduzieren.

# TEIL CO: Konsistenz zwischen Balance und Simulator

Ein wesentlicher Vorteil ist, dass Balance und Simulator dieselbe Engine nutzen. Das verhindert widersprüchliche Aussagen. Ein Nutzer kann eine Strategie im Simulator testen und dann in der Balance-App operationalisieren. Das ist ein konsistentes Ökosystem, kein „zwei-Tool-Silo“.

# TEIL CP: Datentransparenz – wie Nutzer Vertrauen gewinnen

Vertrauen entsteht durch Nachvollziehbarkeit. Die Suite liefert dieses Vertrauen durch:

1. Diagnosedaten, die Entscheidungen erklären.  
2. Szenario-Log, das konkrete Verläufe zeigt.  
3. Determinismus, der reproduzierbare Ergebnisse liefert.  

Diese Elemente sind wichtiger als „bunte Grafiken“, weil sie Kontrolle vermitteln.

# TEIL CQ: Simulation vs. Realität – ein ehrlicher Blick

Simulationen sind keine Prognosen, sondern Risiko-Skizzen. Die Suite macht das deutlich, indem sie keine einzelne Zahl als „Wahrheit“ präsentiert, sondern Bandbreiten, Perzentile und Szenarien. Wer das versteht, nutzt die Software richtig.

# TEIL CR: Regelmäßige Pflege – warum sie zentral ist

Ohne regelmäßige Updates verliert jede Simulation an Aussagekraft. Die Suite unterstützt deshalb eine jährliche Routine: Inflation aktualisieren, Marktwerte prüfen, Runway kontrollieren, Handlungsschritte umsetzen. Diese Routine ist nicht optional, sondern der Kern einer belastbaren Ruhestandsplanung.

# TEIL CS: Operativer Nutzen der Balance-App

Viele Simulationstools liefern nur Theorie. Die Balance-App liefert praktische Schritte: „verkaufen“, „umschichten“, „Liquidität auffüllen“. Damit wird der Schritt von der Analyse zur Umsetzung geschlossen. Das ist ein klarer Vorteil gegenüber reinen Simulations-Tools.

# TEIL CT: Langfristige Robustheit – konservativer Bias

Die Suite ist konservativ. Sie kappt Flex in Krisen, sie ignoriert Verlustverrechnung (damit Steuern nicht unterschätzt werden), und sie setzt hohe Liquiditätsziele. Dieser Bias ist bewusst gewählt. Wer in Ruhestandsplanung „zu konservativ“ plant, hat eher einen Puffer als eine Lücke.

# TEIL CU: Was ein interessierter Leser wirklich verstehen sollte

Ein Leser, der dieses Gutachten liest, sollte mitnehmen: Die Suite ist technisch ausgereift, fachlich tief und nachvollziehbar. Sie ist kein „Wunderrechner“, sondern ein Werkzeug, das Entscheidungstransparenz schafft. Die Ergebnisse sind so gut wie die Daten und Eingaben, und genau darauf legt die Software großen Wert.

# TEIL CV: Datenhygiene – konkrete Empfehlungen

1. **Tranchen pflegen:** Ohne Tranchen ist die Steuerlogik weniger exakt.  
2. **Index-Daten prüfen:** Renditebasis dokumentieren.  
3. **Rentenstart korrekt setzen:** Kleine Fehler wirken über Jahrzehnte.  
4. **Pflegeparameter realistisch wählen:** Zu niedrige Kosten verzerren Risiko.  
5. **Snapshots verwenden:** Versionierte Szenarien helfen beim Vergleich.  

# TEIL CW: Warum die Engine modular bleiben sollte

Die Engine ist derzeit kompakt und verständlich. Eine Überverkomplizierung wäre kontraproduktiv. Die Modularität erlaubt gezielte Verbesserungen (z.B. Verlustverrechnung), ohne die Grundstruktur zu beschädigen. Das ist ein Vorteil gegenüber monolithischen Systemen.

# TEIL CX: Lesbarkeit und Wartbarkeit – Bewertung

Trotz hoher Komplexität ist der Code relativ gut lesbar. JSDoc-Kommentare, klare Modulnamen und eine logische Ordnerstruktur helfen. Die größte Herausforderung bleibt der SpendingPlanner, der sehr viel Logik in einer Datei bündelt. Eine Aufteilung würde die Wartbarkeit erhöhen.

# TEIL CY: Qualität der Tests – ein Blick hinter die Kulissen

Die Tests sind nicht nur „Checkmarks“, sondern spiegeln reale Finanzlogik wider. Beispielsweise wird überprüft, ob Guardrails in Krisen greifen oder ob Gold-Käufe bei Liquiditätsengpässen blockiert werden. Diese Tests spiegeln tatsächliche Risikoentscheidungen, nicht nur syntaktische Funktionen. Dadurch entsteht Vertrauen.

# TEIL CZ: Was dieses Gutachten bewusst nicht tut

Dieses Gutachten ist keine Marktanalyse und keine wissenschaftliche Bewertung. Es ist eine **codebasierte Expertenanalyse**. Für einen Marktvergleich müsste zusätzliche Recherche erfolgen, die außerhalb dieses Auftrags liegt.

# TEIL DA: Pseudocode-Abschnitte (mit erklärendem Text)

Die folgenden Pseudocode-Blöcke sind keine Kopien des Codes, sondern didaktische Vereinfachungen. Sie sollen zeigen, wie die Logik konzeptionell arbeitet.

## DA.1 Balance-Update (vereinfachtes Schema)

```
inputs = readInputs()
if annualUpdate:
  inflation = fetchInflation()
  marketData = fetchMarketData()
  updateAges()
  indexFloorFlex()
result = EngineAPI.run(inputs)
render(result)
store(inputs)
```

**Erklärung:** Der Balance-Workflow ist linear. Erst werden Daten aktualisiert, dann wird gerechnet, dann wird gerendert. Diese klare Sequenz verhindert „Hidden State“-Probleme.

## DA.2 Monte-Carlo-Run (vereinfachtes Schema)

```
seed = initSeed()
for run in runs:
  path = samplePath(seed)
  state = initPortfolio()
  for year in horizon:
    applyReturns(state, path)
    applySpending(state)
    applyTransactions(state)
  recordOutcome(state)
aggregate()
```

**Erklärung:** Dieses Schema zeigt, dass die Simulation ein wiederholter Jahresloop ist. Der Fokus liegt auf Stabilität und Reproduzierbarkeit, nicht auf exotischen mathematischen Modellen.

## DA.3 Transaction-Decision (vereinfachtes Schema)

```
if liquidityCritical:
  refillEmergency()
else if runwayGap:
  refillGuardrail()
else if marketSafe:
  rebalanceOpportunistic()
else:
  doNothing()
```

**Erklärung:** Die Reihenfolge spiegelt die Philosophie wider: erst Liquidität sichern, dann optimieren.

## DA.4 Sweep (vereinfachtes Schema)

```
params = parseRanges()
for combo in cartesian(params):
  inputs = buildInputs(combo)
  result = runSimulation(inputs)
  store(result)
renderHeatmap()
```

**Erklärung:** Der Sweep ist ein systematisches Raster, kein heuristisches Ratespiel. Das macht ihn für Entscheidungen wertvoll.

---

# TEIL DB: Risiko-Register – ausführliche Erläuterung

Die wichtigste Einsicht aus dem Risiko-Register ist, dass die größten Risiken nicht im Code liegen, sondern in der Interpretation. Eine unklare Datenbasis (Index-Typ) kann systematische Verzerrungen erzeugen. Eine fehlende Verlustverrechnung führt zu konservativen Steuerannahmen. Beide Punkte sind erklärbar, aber sie müssen transparent sein, damit Nutzer Ergebnisse richtig einordnen.

Ein zweites Risiko ist die Komplexität. Die Suite bietet viele Parameter, die Experten schätzen, aber Einsteiger überfordern können. Das ist nicht „falsch“, aber es erfordert eine klare Führung in der UI.

Drittens gibt es technische Risiken wie `localStorage`-Limits. Diese sind selten, aber in der Praxis relevant. Die Suite bietet Snapshots und Exporte, was dieses Risiko stark reduziert.

---

# TEIL DC: Operativer Playbook-Vorschlag

Ein praktischer Anwenderprozess könnte so aussehen:

1. **Startphase:** Profil anlegen, Tranchen pflegen, Renten und Pflegeparameter einmal sauber setzen.  
2. **Strategiephase:** Monte-Carlo laufen lassen, Erfolgsquote prüfen.  
3. **Validierungsphase:** Backtest gegen historische Jahre.  
4. **Optimierungsphase:** Sweep und Auto-Optimize für Stellschrauben.  
5. **Operative Phase:** Balance-Jahresupdate, Handlungsschritte umsetzen.  

Die Suite ist so gestaltet, dass dieser Prozess natürlicherweise entsteht. Sie zwingt keine Reihenfolge auf, bietet aber klare „Entry Points“ für jede Phase.

---

# TEIL DD: Release-Checkliste (verständliche Begründung)

Eine Release-Checkliste ist sinnvoll, weil kleine Änderungen große Auswirkungen haben können. Typische Schritte:

- **Tests laufen lassen:** garantieren, dass Guardrails, Steuern und Worker-Parität noch funktionieren.  
- **Balance-Update testen:** damit Online-Datenquellen weiter erreichbar sind.  
- **Monte-Carlo-Simulation testen:** um sicherzustellen, dass deterministische Ergebnisse stabil bleiben.  
- **Sweep + Auto-Optimize prüfen:** für Regressionen in Optimierungslogik.  

Diese Schritte sind weniger Aufwand als spätere Fehlersuche.

---

# TEIL DE: Persönliche Gesamtbewertung (klarer Ton)

Die Ruhestand-Suite ist kein „Kalkulator“, sondern eine echte Planungssuite. Ihre Stärke liegt in der Kombination aus lokaler Ausführung, deterministischer Logik und hoher fachlicher Tiefe. 

Das wichtigste Risiko ist die Datenbasis (Index-Typ). Sobald diese Lücke geschlossen ist, gehört die Suite zu den solidesten DIY-Tools, die ich in dieser Kategorie gesehen habe.

# TEIL DF: Konfigurationsparameter – ausführliche Auslegung

Die Parameter in `engine/config.mjs` sind nicht zufällig gewählt. Sie spiegeln eine konservative Risikopolitik wider. Ein paar Beispiele helfen, die Philosophie zu verstehen:

- **runwayThinMonths = 24:** Der Puffer soll mindestens zwei Jahre tragen. Das ist deutlich konservativer als „nur 6 Monate“. Für Rentner ist das nachvollziehbar.
- **minRefillAmount = 10.000 €:** Ein Verkauf unterhalb dieser Schwelle wird in normalen Situationen vermieden, weil er kaum Effekt hat, aber Aufwand erzeugt. 
- **minTradeAmountDynamicFactor = 0.5%:** Bei großen Portfolios werden Mindestbeträge automatisch größer. So bleibt die Rebalancing-Logik proportional.

Im Spending-Teil sieht man, dass Flex-Anpassungen nicht sprunghaft sein dürfen. Die **Smoothing-Parameter** sorgen dafür, dass sich Ausgaben nicht abrupt ändern, was im Alltag schwer umzusetzen wäre.

Die **FLEX_RATE_HARD_CAPS** sind die „harten Bremsen“. Sie sorgen dafür, dass die Flex-Entnahme in Krisen nicht über einen gewissen Anteil hinausgeht. Diese Caps sind nicht rein mathematisch, sondern eine Sicherheitsschicht gegen psychologisch gefährliche Überentnahmen.

# TEIL DG: Steuerbeispiel – Schrittweise Erläuterung

Um die Steuerlogik nachvollziehbar zu machen, ein vereinfachtes Beispiel:

- Verkauf 20.000 €  
- Cost Basis 15.000 €  
- Gewinn = 5.000 € (25% Gewinnquote)  
- Teilfreistellung (30%): steuerpflichtig = 3.500 €  
- Sparerpauschbetrag 1.000 € → Steuerbasis 2.500 €  
- Abgeltungsteuer (inkl. Soli/KiSt ca. 26%): Steuer ~650 €  
- Nettoerlös ~19.350 €  

Dieses Beispiel zeigt: Die Steuerlogik ist realistisch, aber konservativ, weil Verluste nicht gegengerechnet werden.

# TEIL DH: Worker-Telemetrie – was sie misst

Die Telemetrie sammelt Laufzeiten pro Worker-Chunk. Daraus lassen sich drei Dinge erkennen:

1. **Durchschnittliche Chunk-Dauer** – zeigt, ob die Chunk-Größe passend ist.  
2. **Min/Max-Dauer** – zeigt, ob einzelne Worker ungewöhnlich langsam sind.  
3. **Ausreißer** – können auf Browser-Probleme oder überlastete Systeme hindeuten.  

Für Nutzer ist die Telemetrie nicht sichtbar, aber für Entwickler ein wichtiges Instrument, um Performance zu stabilisieren.

# TEIL DI: Determinismus – warum es praktisch relevant ist

Determinismus bedeutet: gleiche Eingabe → gleiches Ergebnis. Das ist nicht nur „nice to have“. In der Praxis erlaubt es Nutzern, Änderungen sauber nachzuvollziehen. Wenn ein Ergebnis sich ändert, kann man sicher sein, dass die Änderung von der Eingabe kommt, nicht von Zufall.

Dieses Prinzip ist in der Suite konsequent umgesetzt: RNG seeds, Worker-Parität, deterministische Chunks. Ohne das wäre die Test-Suite deutlich weniger aussagekräftig.

# TEIL DJ: UI-Komplexität – rationale Einordnung

Die UI wirkt komplex, weil sie reale Komplexität abbildet. Eine Ruhestandsplanung ohne Pflege, ohne Steuern und ohne Partner wäre einfacher – aber weniger realistisch. Die Suite entscheidet sich bewusst für Realismus. Das bedeutet: Wer sie nutzt, muss Zeit investieren. Genau hier wäre ein Wizard sinnvoll, der die Komplexität strukturiert.

# TEIL DK: Warum die Balance-App mehr als ein „Output“ ist

Viele Tools liefern Kennzahlen, die man selbst interpretieren muss. Die Balance-App liefert konkrete Handlungsanweisungen. Das ist der Unterschied zwischen Analyse und Entscheidung. Dieser „letzte Schritt“ ist oft der schwerste Teil der Ruhestandsplanung – und hier bietet die Suite einen echten Mehrwert.

# TEIL DL: Schlussbemerkung zur Verständlichkeit

Mit dieser Fassung ist das Gutachten bewusst weniger stichpunktartig und stärker erklärend. Ziel ist nicht, alle Details zu listen, sondern die Logik nachvollziehbar zu machen. Genau das wurde in der vorigen Fassung vermisst.

# TEIL DM: Testfälle – narrative Beispiele

Ein paar Tests zeigen, wie tief die Suite in Randfällen geprüft wird:

**`liquidity-guardrail.test.mjs`** prüft, ob bei kritischer Liquidität das Guardrail greift. Dabei wird simuliert, dass der Runway unter 75% fällt. Die Engine muss dann eine Notfüllung auslösen. Dieser Test schützt vor einem der gefährlichsten Fehler: Liquidität zu spät nachzufüllen.

**`transaction-gold-liquidity.test.mjs`** prüft, dass Gold-Käufe blockiert werden, wenn Liquidität zu niedrig ist. Das ist entscheidend, weil Gold zwar ein Puffer sein kann, aber nicht auf Kosten des täglichen Cashflows gekauft werden darf.

**`spending-planner.test.mjs`** simuliert mehrere Jahre und prüft, ob die Flex-Rate in Alarmphasen wirklich sinkt und in Recovery-Phasen nicht zu schnell steigt. Dieser Test schützt vor falschen Entnahmeempfehlungen.

**`worker-parity.test.mjs`** prüft, dass Worker und Main-Thread dieselben Ergebnisse liefern. Das ist der Beweis, dass Parallelisierung keine versteckten Abweichungen erzeugt.

Diese Tests sind nicht kosmetisch, sondern direkt mit realen Risiken verknüpft.

# TEIL DN: Szenario-Log – konkrete Anwendung

Ein Nutzer kann im Szenario-Log z.B. einen Lauf auswählen, der als „Worst Pflegekosten“ markiert ist. Er sieht dann Jahr für Jahr, wie stark der Pflegeaufwand steigt, wann die Flex-Rate gekürzt wurde und wann der Runway kritisch wurde. Das ist nicht nur eine Zahl, sondern eine **Geschichte** über den Verlauf der Finanzen.

Im Kontrast dazu kann er einen „typischen“ Lauf auswählen und sehen, dass dort die Flex-Kürzung kaum notwendig war. Diese Gegenüberstellung macht Risiken greifbar und verhindert, dass der Nutzer nur auf eine einzelne Kennzahl starrt.

# TEIL DO: Erweiterte Szenarien (Kurzfälle)

**Fall „Lost Decade“:** 
Eine lange Phase niedriger Renditen führt zu einer hohen Wahrscheinlichkeit von Flex-Kürzungen. Die Suite zeigt, dass der Plan dennoch tragfähig sein kann, wenn der Runway ausreichend hoch gewählt wird. 

**Fall „Inflationsschock“:** 
Ein Inflationsschock führt zu höherem Bedarf. Die Caution-Logik begrenzt die Anpassung, um das Portfolio nicht zu überlasten. 

**Fall „Stagflation“:** 
Die Kombination aus niedrigen Realrenditen und hoher Inflation ist besonders riskant. Hier zeigt sich die Stärke der Guardrails: Flex wird reduziert, Liquidität geschützt.

# TEIL DP: Warum diese Detailtiefe relevant ist

Viele Gutachten scheitern daran, dass sie nur Ergebnisse listen, aber keine Vorstellung vermitteln, wie das System denkt. Dieses Gutachten versucht genau das Gegenteil: Es erklärt die Logik so, dass ein interessierter Leser den Ablauf nachvollziehen kann. Diese Nachvollziehbarkeit ist entscheidend, um Vertrauen in die Ergebnisse zu haben.

# TEIL DQ: Vertiefender Abgleich mit dem bestehenden Gutachten

Das vorhandene `EXPERT_GUTACHTEN.md` ist sehr umfangreich und enthält Marktvergleiche sowie Forschungsbezüge. Dieses Codex-Gutachten ersetzt das nicht, sondern ergänzt es durch eine engere Kopplung an den aktuellen Code. Im Abgleich zeigen sich drei zentrale Punkte:

1. **Architektur-Befund:** Beide Gutachten bestätigen die Dreischichten-Architektur und die klare Trennung von Logik und UI. Der Codex-Befund bestätigt diese Aussagen anhand der tatsächlichen Modulstruktur.

2. **Algorithmische Tiefe:** Das bestehende Gutachten beschreibt Guardrails, Steuerlogik und Monte-Carlo. Die Codex-Analyse bestätigt diese Mechanismen im Code und ergänzt praxisnahe Interpretationen (z.B. Runway-Logik, Quantisierung, Surplus-Rebalancing).

3. **Lücken:** Beide Gutachten sehen dieselben Schwachstellen (Index-Dokumentation, Verlustverrechnung). Der Codex-Befund stuft diese als die größten Hebel für zukünftige Verbesserung ein.

Damit entsteht kein Widerspruch, sondern eine stärkere Evidenzbasis: Zwei unabhängige Analysen kommen zu konsistenten Schlussfolgerungen.

# TEIL DR: Offene Fragen (aus Codex-Sicht)

Einige Punkte bleiben offen, nicht weil der Code unklar wäre, sondern weil sie außerhalb des Codes liegen:

- Welche genaue Datenquelle steckt hinter `msci_eur`?  
- Wie sollten Pflegeparameter realistisch für verschiedene Regionen kalibriert werden?  
- Soll eine Verlustverrechnung lediglich pauschal erfolgen oder mit detaillierten Verlusttöpfen?  

Diese Fragen sind keine Kritik am Code, sondern eine Roadmap für die nächste Qualitätsebene.

# TEIL DS: Glossar (verständlich erklärt, im Fließtext)

**Runway:** Der Cash-Puffer, gemessen in Monaten, der die Grundausgaben deckt. Ein Runway von 24 bedeutet: Zwei Jahre Grundbedarf sind liquide verfügbar.

**Guardrail:** Eine Sicherheitsregel, die verhindert, dass Entnahmen in kritischen Phasen zu hoch bleiben.

**Flex-Rate:** Der Anteil des flexiblen Bedarfs, der tatsächlich entnommen wird. Bei 60% Flex-Rate werden nur 60% der Wunsch-Ausgaben realisiert.

**CAPE:** Das zyklisch adjustierte Kurs-Gewinn-Verhältnis, ein Indikator für Marktüberbewertung.

**TQF:** Teilfreistellungsquote, die steuerliche Vorteile für Fonds abbildet.

**SPB:** Sparerpauschbetrag, steuerfreier Anteil der Kapitalerträge.

**Szenario-Log:** Auswahl repräsentativer Monte-Carlo-Pfade zur qualitativen Auswertung.

# TEIL DT: Letzte zusammenfassende Bewertung

Diese Fassung wurde bewusst in Prosa gehalten, damit ein interessierter Leser die Logik nachvollziehen kann. Das Gutachten ist umfangreich, weil es die Komplexität der Suite widerspiegelt – nicht, weil es unnötig ausschweifend sein will.

Die Ruhestand-Suite bleibt ein sehr starkes DIY-Tool. Ihre Stärke ist nicht, dass sie komplex ist, sondern dass sie komplexe Realität in nachvollziehbare Regeln übersetzt. Genau darin liegt ihr Mehrwert.

# TEIL DU: FAQ-ähnliche Erläuterungen (lesbar, keine Stichpunkte)

**Warum nutzt die Suite historisches Bootstrapping und kein reines Normalmodell?**  
Historische Daten enthalten Krisen, Regimewechsel und Korrelationen. Ein Normalmodell würde diese Struktur glätten. Für Ruhestandsplanung ist die historische Struktur wertvoll, weil sie realistische Pfadabhängigkeiten abbildet.

**Warum ist der Runway so wichtig?**  
Der Runway ist die direkte Übersetzung von „Wie lange kann ich ohne Verkäufe überleben?“. In Krisenphasen ist genau diese Fähigkeit entscheidend. Deshalb priorisiert die Engine Liquidität vor Rebalancing.

**Warum wird die Flex-Rate geglättet?**  
Menschen können ihre Ausgaben nicht jedes Jahr drastisch anpassen. Glättung reduziert die Schwankung und macht die Empfehlungen alltagstauglich.

**Warum sind Tranchen notwendig?**  
Ohne Tranchen ist die Steuerberechnung nur grob. Mit Tranchen kann die Suite realistisch bestimmen, welche Verkäufe steuerlich sinnvoll sind. Die Qualität der Empfehlungen hängt deshalb an der Tranchenpflege.

**Warum gibt es einen Optimierer, wenn der Sweep schon existiert?**  
Der Sweep zeigt die Fläche, der Optimierer sucht den Punkt. Beides zusammen liefert einen Überblick und eine konkrete Empfehlung. 

**Warum ist die Verlustverrechnung nicht implementiert?**  
Sie erfordert zusätzliche Logik für Verlusttöpfe. Die aktuelle Implementierung ist konservativ. Das ist akzeptabel, aber eine Lücke für höchste Genauigkeit.

**Was ist der größte Hebel für bessere Ergebnisse?**  
Meistens die Kombination aus Rentenalter, Sparrate und Flex-Anteil. Der Sweep zeigt das empirisch.

# TEIL DV: Kurzer Überblick über den Build- und Testprozess

Die Engine ist der einzige gebündelte Teil der Suite. Änderungen an `engine/*.mjs` erfordern den Build-Schritt, damit `engine.js` aktualisiert wird. Die App-Module selbst laufen als native ES-Module und benötigen keinen Build. Dieser Ansatz reduziert Build-Komplexität und erhöht die Transparenz.

Der Standardtestlauf (`npm test`) deckt alle Module ab. Für schnelle Checks existiert ein Quick-Modus. In der Praxis bedeutet das: Änderungen können zügig geprüft werden, ohne die gesamte Anwendung manuell durchzuspielen.

# TEIL DW: Abschließendes Wort zur Nachvollziehbarkeit

Dieses Gutachten ist absichtlich ausführlich, weil die Suite selbst umfangreich ist. Der Anspruch war, die Logik nicht nur aufzuzählen, sondern zu erklären. Wer die Ruhestand-Suite verstehen will, soll dieses Dokument lesen können, ohne Code zu öffnen. Wenn dieses Ziel erreicht ist, ist die Aufgabe erfüllt.

