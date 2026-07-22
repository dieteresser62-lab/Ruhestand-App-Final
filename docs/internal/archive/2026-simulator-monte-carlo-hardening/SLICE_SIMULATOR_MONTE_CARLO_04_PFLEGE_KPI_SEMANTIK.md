# Slice 04: Pflege-KPI-Semantik

**Stand:** 2026-07-22
**Status:** implementiert; Gemini-/Nutzerreview ausstehend
**Feature-Branch:** `codex/simulator-monte-carlo-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend  
**Arbeitsplan:** [SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md](./SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md)  
**Abhaengigkeit:** Slices 01-02 und Entscheidung D-04

## Ziel

Pflegeeintritt, -alter, -dauer, Haushaltskosten und Vergleichsdeltas werden
personenbezogen beziehungsweise haushaltsbezogen eindeutig getrennt.

## Akzeptanzkriterien

- P1- und P2-Eintrittsquoten haben getrennte Zaehler und passende Nenner.
- P1-/P2-Eintrittsalter enthalten keine `0`-Sentinels fuer Nicht-Eintritte.
- Leere bedingte Verteilungen liefern `null`, `sampleSize=0` und einen
  Missingness-Grund; das UI zeigt einen Gedankenstrich statt 0 oder NaN.
- P1-Pflegejahre werden nur P1, P2-Pflegejahre nur P2 zugeordnet.
- Gleichzeitige Pflegekosten werden als tatsaechliche Jahressumme und nicht als
  Maximum zweier Zielwerte erfasst.
- Ein "depotfinanzierter Pflegebetrag" wird nur angezeigt, wenn er direkt aus
  nachvollziehbaren Cashflows herleitbar ist; andernfalls wird das heutige Feld
  entfernt oder ehrlich umbenannt.
- Das Delta "ohne Pflege minus mit Pflege" besitzt die zum Label passende
  Vorzeichenkonvention.
- Monetare Pflege-KPIs im UI sind reale Euro zur Preisbasis des
  Simulationsstarts. Zusaetzliche Nominalwerte tragen im Export ein
  `NominalEur`-Suffix und werden nicht mit Realwerten aggregiert.
- P1-only, P2-only, beide, niemand und gleichzeitige Pflege sind Golden Cases.
- Ein Post-Slice-04-Snapshot und Delta-Ledger dokumentieren die erwarteten
  Semantikdeltas, ohne die Pre-Hardening-Referenz zu ueberschreiben.

## Scope

- Life-Event-/Run-Metriken und Pflegeaggregate,
- Szenarioanalyse fuer fruehe Pflegefaelle,
- Ergebnislabels/Tooltips und V1-Exportfelder,
- direkte/Worker-Paritaet.

## Nicht-Scope

- keine Aenderung der Pflegewahrscheinlichkeiten oder Tabellen,
- keine fachliche Neukalibrierung von Pflegekosten,
- keine Engine-Semantikaenderung.

## Geplante Dateien

- `app/simulator/monte-carlo-runner.js`,
- `app/simulator/mc-run-metrics.js`,
- `app/simulator/monte-carlo-aggregates.js`,
- `app/simulator/scenario-analyzer.js`,
- `app/simulator/results-metrics.js`,
- `app/simulator/monte-carlo-chunk-result.js`,
- Tests/Fixtures.

Produktive Programmdateien: **maximal 6**.

## Diff-Risiko vor Coding

- Branch vor Coding: `codex/simulator-monte-carlo-gap-plan`.
- Status vor Coding: ausschliesslich vorbestehende, unversionierte
  Playwright-Dateien unter `node_modules/`; keine versionierten Aenderungen.
- Geplante produktive Dateien:
  `app/simulator/monte-carlo-runner.js`,
  `app/simulator/mc-run-metrics.js`,
  `app/simulator/monte-carlo-chunk-result.js`,
  `app/simulator/monte-carlo-aggregates.js`,
  `app/simulator/scenario-analyzer.js` und
  `app/simulator/results-metrics.js`.
- Aenderungstiefe: riskant; mehrere bisher vermischte Bedeutungen und der
  zentrale V1-Path-Summary-Vertrag werden gemeinsam korrigiert.
- Gefaehrdete Tests/Snapshots: Chunk-Contract, Monte-Carlo-Runner,
  Pflege-Golden-Cases, Szenarioanalyse, Results-Metrics, Worker-/
  Auto-Optimize-Paritaet und Messvertrag-Snapshots.
- Nicht anfassen: Pflegekalibrierung, Engine, Sampling, Worker-Lifecycle,
  generierte Artefakte und die vorbestehenden Playwright-Dateien.
- Rollback: nur die gelisteten Produktiv- und neuen Test-/Fixture-Dateien auf
  den Slice-03-Commit `5268e6b` zurueckfuehren; bei unerwarteter Engine-,
  Snapshot-, Backtest- oder FlowDelta-Abweichung sofort stoppen.

## Geplante Tests

- fuenf deterministische Pflege-Golden-Cases,
- Verteilungsinvarianten ohne Null-Sentinels,
- Pflegewahrscheinlichkeit 0 und getrennte Tests fuer nullable Ergebnis,
  beobachtete 0 sowie reale/nominale Einheit,
- Kosten- und Delta-Vorzeichentests,
- Szenarioanalyse P1/P2,
- Worker-Paritaet und `npm test`.

## Durchgefuehrte Aenderungen

- `mc-run-metrics.js` fuehrt getrennte P1-/P2-Eintrittszaehler und bedingte
  Listen ohne Null-Sentinels. Ein neuer Jahrestacker summiert den tatsaechlich
  modellierten Pflege-Zusatzbedarf fuer P1, P2 und Haushalt nominal sowie real
  zur Preisbasis des Simulationsstarts.
- `monte-carlo-runner.js` speist den Tracker mit der an die Engine uebergebenen
  P1-plus-P2-Jahressumme. Die bisherige Scheinzurechnung
  `DepotStart - DepotEnd` wurde entfernt; die Engine- und Pflegekalibrierung
  blieben unveraendert.
- Der zentrale Chunk-/Path-Summary-Contract transportiert getrennte
  Personeneintritte und -jahre, reales Endvermoegen, reale Pflege-Mehrbedarfe
  sowie explizit mit `NominalEur` suffigierte Nominalwerte. Missingness und
  Zaehler werden gegen die beobachteten Pfade validiert.
- `monte-carlo-aggregates.js` liefert `extraKPI.pflege.p1`, `.p2`,
  `.household`, `.comparison` und `.unitContract`. Leere bedingte Verteilungen
  sind `null` mit `sampleSize=0` und `no_observations`; beobachtete 0 bleibt 0.
- `results-metrics.js` benennt Geldwerte ehrlich als realen Pflege-Mehrbedarf,
  zeigt fehlende Werte als Gedankenstrich und kennzeichnet den
  Endvermoegensvergleich als ungepaart und nicht-kausal.
- `scenario-analyzer.js` unterscheidet fruehesten P1- und P2-Eintritt und waehlt
  den hoechsten realen Pflege-Mehrbedarf statt einer vermeintlichen
  Depotkostenmetrik.
- `post-slice-04-v1.json` und drei Delta-Ledger-Eintraege dokumentieren
  Personen-, Einheiten-/Bedarfs- und Vorzeichenaenderung getrennt. Die
  Pre-Hardening-Referenz blieb unveraendert.

## Ausgefuehrte Tests

- Fokussierte Suiten: 1254/1254 Assertions gruen. Darin enthalten sind die
  fuenf deterministischen Pflegefaelle P1-only, P2-only, beide ohne
  Ueberlappung, niemand und gleichzeitige Pflege, Chunk-Contract,
  MC-Runner, Ergebnis-Karten, Szenarioanalyse, Worker-/Auto-Optimize-Vertraege,
  Worker-Paritaet und Messvertrag.
- `npm test`: 6371/6372 Assertions gruen. Einzige Abweichung ist der bereits
  vor Slice 04 dokumentierte Architektur-Evidenzfehler mit sechs toten Links
  auf zwei fehlende interne Dokumente. Die uebrigen 121 Testdateien sind gruen;
  es gibt keine neue Snapshot-, Backtest-, Worker- oder FlowDelta-Abweichung.

## Abweichungen vom Plan

- Keine Abweichung bei den sechs geplanten produktiven Programmdateien.
- Durch die getrennten charakteristischen Szenarien fuer fruehesten P1- und
  P2-Eintritt steigt das Szenarioangebot von 30 auf bis zu 31 Eintraege
  (bis zu 16 charakteristische plus 15 zufaellige). README und technische
  Referenzen wurden entsprechend synchronisiert.

## Offene Risiken

- Der ausgegebene Pflegebetrag ist der modellierte zusaetzliche Bedarf, nicht
  zwingend der tatsaechlich bezahlte oder aus dem Depot finanzierte Cashflow.
- Der Vergleich der Endvermoegens-Gruppenmediane ist ungepaart und daher nicht
  kausal; diese Einschraenkung steht im Feldvertrag und im UI.
- Die bestehenden Engine-Regeln dazu, wann ein Pflegebedarf aktiv bleibt,
  wurden gemaess Nicht-Scope nicht geaendert. Der Tracker misst exakt den an die
  Engine uebergebenen Bedarf.
- Der registrierte zusaetzliche Path-Summary-/Missingness-Speicher steigt von
  108 auf 171 Byte pro Run. Slice 10 bleibt das vorgesehene Ressourcengate.

## Rueckdokumentation und Freigabe

Finales Pflegedatenmodell, entfernte/umbenannte Felder, Ressourcenwirkung und
Testergebnisse sind in Hauptplan, GAP-Analyse und Referenzdokumentation
zurueckgetragen. Implementierung abgeschlossen; externe Freigaben ausstehend.

## Review-Feedback von Gemini

### 1. Systematische Prüfdimensionen
* **Korrektheit:** Slice 04 behebt die P0-GAPs MC-03 und MC-04 vollständig.
  - **MC-03 (Pflege-Personentrennung):** P1 und P2 erhalten eigene Zähler und Eintrittsalter-Listen. Eintrittsalter werden NUR bei tatsächlichem Trigger eingetragen. Läufe ohne Pflegefall für P1/P2 enthalten keine künstlichen 0-Sentinels mehr. Nenner ist jeweils die Gesamtzahl der geforderten Runs.
  - **MC-04 (Pflegekosten vs Mehrbedarf & Preisbasis):** Der Pflege-Zusatzbedarf wird explizit kumuliert und in realen Euro zur Simulationsstart-Preisbasis angegeben. Alle nominalen Exportfelder sind mit `NominalEur` gekennzeichnet. Die ungepaarten Vergleiche ("Median ohne Pflege minus Median mit Pflege") sind im UI explizit als nicht-kausale Gruppenvergleiche deklariert.
* **Vertragstreue:** `MonteCarloChunkResultV1` in `monte-carlo-chunk-result.js` und `ScenarioAnalyzer` in `scenario-analyzer.js` wurden um `p1CareEntryAge`, `p2CareEntryAge`, `totalCareAdditionalNeedRealEur` etc. erweitert. Strikte Whitelist-Validierungen sichern den Transfer.
* **Fehlerbehandlung:** 28 dedizierte Golden-Case-Tests in `tests/monte-carlo-care-kpi.test.mjs` und 32 UI-Contract-Tests in `tests/results-metrics.test.mjs` belegen: Ausbleibende Pflegefälle liefern `null` (`sampleSize=0`), was im UI als `-` gerendert wird. Tatsächliche `0` Pflegejahre bei eingetretenem Pflegefall bleiben von `null` unterscheidbar.
* **Seiteneffekte:** Punktgenau **6 produktive Programmdateien** verändert (`mc-run-metrics.js`, `monte-carlo-aggregates.js`, `monte-carlo-chunk-result.js`, `monte-carlo-runner.js`, `results-metrics.js`, `scenario-analyzer.js`). Die Dokumentationsdateien (`README.md`, `TECHNICAL.md`, `SIMULATOR_MODULES_README.md`, Hauptplan, GAP-Analyse, Slice-Dokument) wurden konsistent aktualisiert.
* **Was könnte brechen? / Größtes Restrisiko:**
  1. Bei historischen Profilen oder abweichenden UI-Aufrufern, die bisher `triggeredAge` statt `p1CareEntryAge` / `p2CareEntryAge` erwarteten, muss der befristete Read-Alias in Slice 11/12 sauber entfernt werden.

### 2. Nummerierte Findings
* **Finding G-01-S4 (Saubere Personen-Isolierung P1 vs P2):** P1 und P2 Eintrittsraten, Altersverteilungen und Pflegejahre sind strikt getrennt. P2-only Pflegefälle beeinflussen weder P1-Zähler noch P1-Altersmediane.
* **Finding G-02-S4 (Ehrliche Deklaration von Realwerten & Gruppenvergleichen):** Beträge sind transparent als reale Euro zur Simulationsstart-Basis ausgewiesen. Der ungepaarte Differenzenwert trägt den expliziten Hinweis "nicht gepaarter, nicht-kausaler Vergleich".

### 3. Pre-Mortem (3 Monate in die Zukunft)
Wahrscheinlichste Ursache für Probleme in 3 Monaten wäre ein UI-Komponenten-Refactoring, das übersieht, dass `p1CareEntryAge` bei 0 Pflegefällen `null` ist, und versucht `.toFixed()` darauf aufzurufen. Abgesichert durch die UI-Contract-Tests in `results-metrics.test.mjs`, die gezielt `null` und leere Verteilungen prüfen.

### 4. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  1. Befristete Read-Aliase für Pflegealter müssen in Slice 11/12 wie geplant entfernt werden.
  2. Bekannte fremde Link-Abweichung (`architecture-evidence.test.mjs`) bleibt separiert.

## Review-Feedback von Claude

Ausstehend; Pflichtstruktur gemaess `SLICE_EXECUTION_RULES.md` verwenden.

## Review-Antworten von Codex

Planfindings wurden in Revision 1 eingearbeitet; Details stehen in der
Entscheidungstabelle. Slice 04 wurde umgesetzt und von Gemini freigegeben.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-01-S4 | Gemini | P1 vs P2 Personentrennung | angenommen | In `mc-run-metrics.js`, `monte-carlo-aggregates.js` und UI umgesetzt |
| G-02-S4 | Gemini | Pflege-Mehrbedarf & Realwerte | angenommen | In `monte-carlo-runner.js` und `results-metrics.js` umgesetzt |
| G-06 | Gemini | Leere Pflegeverteilungen | angenommen | null/sampleSize/UI-Gedankenstrich umgesetzt |
| C-10 | Claude | Pflegekosteneinheit fehlt | angenommen | UI real zur Startpreisbasis, Exportfelder explizit umgesetzt |
| C-04 | Claude | Snapshotdrift | angenommen | Post-Slice-Snapshot/Delta-Ledger umgesetzt |
