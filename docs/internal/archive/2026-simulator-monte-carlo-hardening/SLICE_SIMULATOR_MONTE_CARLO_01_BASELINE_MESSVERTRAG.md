# Slice 01: Baseline und Messvertrag

**Stand:** 2026-07-22
**Status:** Umsetzung abgeschlossen; Review und Freigabe ausstehend
**Feature-Branch:** `codex/simulator-monte-carlo-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend  
**Arbeitsplan:** [SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md](./SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md)

## Ziel

Vor produktiven Aenderungen werden die heutigen Semantiken und die beschlossenen
Sollvertraege als kleine, nachrechenbare Golden Cases fixiert. Der Slice erzeugt
keinen absichtlich roten Endzustand.

## Akzeptanzkriterien

- D-01 bis D-12 sind entschieden oder als explizite Blocker markiert.
- Je ein Golden Case existiert fuer Volatilitaet/Drawdown, Kuerzungsanteil,
  P1-/P2-Pflege, alle vier terminalen Outcomes und Sampling-Praezedenz.
- Jeder Fall benennt Eingabe, erwartete Zwischenwerte, Einheit, Nenner,
  Rundung und erwartetes UI-Label.
- Direkter Runner und Worker-Contract koennen dieselben Fixtures verwenden.
- Der unveraenderliche `pre-hardening-v1`-Snapshot nutzt feste Workerzahl und
  feste Chunkpolicy; Seed, Datenversion, Runtime, Worker-/Chunkkonfiguration und
  numerische Toleranz sind Metadaten.
- Die Snapshotpolicy unterscheidet unveraenderliche Pre-Hardening-Referenz,
  versionierte Post-Slice-Referenzen und finalen V1-Kandidaten. Kein spaeterer
  Slice darf die Baseline ueberschreiben.
- Ein eigener Determinismustest variiert Workerzahl und Chunkgrenzen; innerhalb
  derselben Runtime bleiben diskrete und endliche Floatwerte exakt. Nur fuer
  Snapshots ueber dokumentiert verschiedene Runtimeversionen werden
  feldspezifische Toleranzen vorab begruendet und nie nach einem Fehlschlag
  erweitert.
- Ein reproduzierbarer Standardbenchmark misst
  `100.000 Runs x 35 Jahre, 8 Worker, 500 ms`; ein separater Stresstest misst
  `1.000.000 Runs x 35 Jahre` mit derselben Worker-/Budgetkonfiguration und
  einer schwaecheren Referenzkonfiguration. Beide protokollieren Laufzeit,
  Peak-Speicher, Abbruchreaktion und Bytes pro Run.
- Fuer mehrere vorab fixierte Seeds/Szenarien wird das KPI-Delta zwischen
  100.000 und 1.000.000 Runs dokumentiert. Der Nutzerbefund "kein messbarer
  Unterschied" wird damit reproduzierbar geprueft, aber nicht ungeprueft auf
  alle Szenarien verallgemeinert.
- Die Volltestbaseline ist gruen oder die fremde Linkabweichung wurde vom
  Nutzer ausdruecklich als bekannte Baseline freigegeben.

## Scope

- Testfixtures und Contracttests fuer die Zieldefinitionen.
- Snapshotmetadaten und Delta-Ledger-Format.
- Entscheidungstabellen in GAP-Analyse, Plan und diesem Slice.
- Consumer-Inventar fuer alle umzubenennenden Ergebnisfelder.

## Nicht-Scope

- keine Aenderung produktiver JS-/HTML-/CSS-Dateien,
- keine neue KPI-Berechnung,
- keine Engine-, Daten- oder Modellkalibrierung.

## Geplante Dateien

- neue `tests/monte-carlo-measurement-contract.test.mjs`,
- neue Fixtures unter `tests/fixtures/monte-carlo-measurement/`,
- neue versionierte Snapshot-/Delta-Fixtures unter demselben Testbereich,
- diese Slice-MD und der uebergeordnete Plan.

Produktive Programmdateien: **0**.

## Diff-Risiko vor Coding

- Branch-Check vor Coding am 2026-07-22:
  `git branch --show-current` ergab
  `codex/simulator-monte-carlo-gap-plan`.
- Git-Status vor Coding am 2026-07-22 (`git status --short`):
  ```text
  ?? node_modules/.bin/playwright
  ?? node_modules/.bin/playwright-core
  ?? node_modules/.bin/playwright-core.cmd
  ?? node_modules/.bin/playwright-core.ps1
  ?? node_modules/.bin/playwright.cmd
  ?? node_modules/.bin/playwright.ps1
  ?? node_modules/playwright-core/
  ?? node_modules/playwright/
  ```
- Die unversionierten Playwright-Dateien sind vorgefundener Fremdbestand und
  bleiben unangetastet. Die fruehere Forschungsbacklog-Verschiebung ist im
  aktuellen Arbeitsbaum nicht mehr offen.
- Aenderungstiefe: klein, aber fachlich grundlegend.
- Gefaehrdete Tests: bestehende MC-Contracttests nur bei Namenskollisionen.
- Nicht anfassen: Anwendungscode, Engine, generierte Artefakte, fremde
  Arbeitsbaum-Aenderungen.
- Rollback: nur neu angelegte Slice-Testdateien nach expliziter Freigabe
  entfernen; bestehende Dateien nicht pauschal zuruecksetzen.

## Geplante Tests

- `node tests/run-single.mjs tests/monte-carlo-measurement-contract.test.mjs`
- relevante bestehende MC-/Worker-Contracttests,
- feste 1-/2-/4-Worker- und mindestens drei Chunkaufteilungen mit identischem
  globalem Runindex-Satz,
- Standardbenchmark fuer 100.000 Runs, Stresstest fuer eine Million Runs und
  kontrollierter KPI-Konvergenzvergleich auf festgelegten Seeds/Szenarien,
- `npm test` als Baseline-Gate.

## Durchgefuehrte Aenderungen

- Branch, Arbeitsbaum und Freigabestatus vor Coding erneut geprueft und dieser
  Diff-Risiko-Block wortgetreu aktualisiert.
- `tests/monte-carlo-measurement-contract.test.mjs` als ausfuehrbaren
  Messvertrag angelegt. Er prueft D-01 bis D-12, die Golden Cases, Snapshot- und
  Delta-Policy, Consumer-Inventar, Ressourcenvertrag, Runner-/Worker-Paritaet,
  Worker-/Chunkdeterminismus sowie gespeicherte Last- und Konvergenzevidenz.
- Unter `tests/fixtures/monte-carlo-measurement/` sieben versionierte Fixtures
  angelegt:
  - `golden-cases-v1.json`,
  - `snapshot-policy-v1.json`,
  - `delta-ledger-v1.json`,
  - `consumer-inventory-v1.json`,
  - `pre-hardening-v1.json`,
  - `benchmark-contract-v1.json`,
  - `benchmark-results-2026-07-22.json`.
- Der `pre-hardening-v1`-Snapshot wurde mit Node v25.2.1, Windows x64, Seed
  20260722, fester Datenversion sowie vier Workern und vier festen Chunks
  erfasst. Er dokumentiert die aktuelle, noch zu haertende Semantik, unter
  anderem identische `volatilities`- und `maxDrawdowns`-Arrays.
- Standard-, Stress- und schwaches Referenzprofil sowie drei vorab festgelegte
  Konvergenzfaelle ausgefuehrt und als reproduzierbare Evidenz gespeichert.
- Hauptplan auf den tatsaechlichen Freigabe-, Umsetzungs- und Messstand
  synchronisiert. Produktive Programmdateien wurden nicht geaendert.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/monte-carlo-measurement-contract.test.mjs`:
  **785/785 Assertions gruen**.
- Betroffene Bestandsvertraege, seriell ausgefuehrt:
  - `simulator-monte-carlo.test.mjs`: 140/140 gruen,
  - `mc-worker-contract.test.mjs`: 31/31 gruen,
  - `worker-parity.test.mjs`: 369/369 gruen,
  - `monte-carlo-sampling.test.mjs`: 6/6 gruen,
  - `monte-carlo-startyear.test.mjs`: 112/112 gruen,
  - `results-metrics.test.mjs`: 16/16 gruen,
  - `auto-optimize-worker-contract.test.mjs`: 7/7 gruen.
- Opt-in-Messlaeufe des neuen Contracttests:
  - Standardprofil: 100.000 Runs, 35 Jahre, 8 Worker, 27,934 s,
    Peak-RSS 896,4 MiB, Abbruchreaktion 4,647 ms, 0 technische Fehler;
  - Stressprofil: 1.000.000 Runs, 35 Jahre, 8 Worker, 233,089 s,
    Peak-RSS 1,759 GiB, Abbruchreaktion 12,053 ms, 0 technische Fehler;
  - schwache Referenz: 100.000 Runs, 35 Jahre, 2 Worker, 87,057 s,
    Peak-RSS 449,4 MiB, Abbruchreaktion 3,117 ms, 0 technische Fehler;
  - Konvergenzfaelle `CONV-BASE-12345`,
    `CONV-HIGH-WITHDRAWAL-24680` und `CONV-CARE-PARTNER-424242` jeweils
    100.000 gegen 1.000.000 Runs: vollstaendig und ohne technische Fehler.
- `npm test`: **6488/6489 Assertions gruen**, eine bekannte fremde Assertion
  rot. `architecture-evidence.test.mjs` meldet sechs tote Links auf
  `FORSCHUNGSVALIDIERUNGS_BACKLOG.md` und
  `SIMULATOR_BACKTEST_FORSCHUNGSPROTOKOLL.md`. Diese bereits im freigegebenen
  Hauptplan dokumentierte Forschungsdokument-Verschiebung liegt ausserhalb des
  Slice-Scope; keine Snapshot-, Backtest- oder FlowDelta-Abweichung trat auf.

## Abweichungen vom Plan

- Die Vorabschaetzung im Hauptplan von 69 Byte fest angelegten Typed Arrays pro
  Run war zu hoch. Die aus `createMonteCarloBuffers()` ausgemessene Belegung
  betraegt 63 Byte/Run; der gesamte Worker-Result-Payload liegt bei rund
  419 Byte/Run. Der Hauptplan wurde korrigiert.
- Der Konvergenzvergleich bestaetigt nicht woertlich "kein messbarer
  Unterschied": Die groesste absolute Wahrscheinlichkeitsabweichung der drei
  lokalen Faelle betraegt 0,0612 Prozentpunkte. Der Befund wird deshalb nur als
  kleine lokale Abweichung dokumentiert, nicht verallgemeinert.
- Das Volltestgate bleibt wegen der bereits bekannten fremden Linkabweichung
  formal rot. Die Slice-eigenen und direkt betroffenen Tests sind vollstaendig
  gruen; die fremden Dokumente wurden nicht veraendert.

## Offene Risiken

- Die Golden Cases bilden den durch Gemini und Nutzer freigegebenen Zielvertrag,
  aber noch nicht die produktive V1-Implementierung; deren Umsetzung erfolgt in
  den Folgeslices und bleibt jeweils reviewpflichtig.
- Der Stresstest erreichte lokal 1,759 GiB Peak-RSS. Die harte Grenze von einer
  Million Runs bleibt deshalb bestaetigungspflichtig und ist kein Versprechen
  fuer schwache Browsergeraete.
- Der Pre-Hardening-Snapshot zeigt erwartungsgemaess aktuelle fachliche Luecken:
  `volatilities` und `maxDrawdowns` sind identisch; `failCount` und
  `depotErschoepfungsQuote` bilden noch nicht den Zielvertrag D-01 ab.
- Gleichheit ueber abweichende JS-Runtimeversionen wurde nicht praktisch
  ausgefuehrt. Nur die vorab deklarierte feldspezifische Toleranzpolicy ist
  fixiert; dieselbe Runtime wird exakt verglichen.
- Node meldet in Workerprozessen die bestehende, nicht fehlschlagende Warnung
  `--localstorage-file was provided without a valid path`.

## Rueckdokumentation und Freigabe

Entscheidungen, Fixture-IDs, Benchmarkwerte, Konvergenzbefunde und Testergebnisse
sind in Abschnitt 14 des Hauptplans zurueckdokumentiert. Implementierung:
abgeschlossen. Planfreigabe durch Gemini und Nutzer: erteilt. Slice-Review und
Slice-Freigabe: ausstehend; Codex erteilt keine eigene Freigabe und erstellt
keinen Commit.

## Ergebnisse

- Alle fachlichen Akzeptanzkriterien des Slice sind als maschinenlesbare
  Fixtures und ausfuehrbare Contracttests umgesetzt.
- Direkter Runner, fester Worker-Snapshot und 1-/2-/4-Worker-Layouts liefern in
  derselben Runtime fuer alle geprueften Per-Run-Werte und Aggregate exakt
  dieselben Ergebnisse.
- Die unveraenderliche Pre-Hardening-Referenz, die Fortschreibungspolitik und
  das leere Delta-Ledger sind getrennt versioniert; spaetere Slices muessen neue
  Referenzen anlegen.
- Die Last- und Konvergenzmessungen sind mit Profil, Runtime, Hardwareklasse,
  Laufzeit, Speicher, Payload, Abbruchreaktion und KPIs reproduzierbar
  festgeschrieben.
- Ergebnisstatus: **bereit fuer adversariales Gemini-/Nutzerreview**, nicht
  selbst freigegeben.

## Review-Feedback von Gemini

### 1. Systematische Prüfdimensionen
* **Korrektheit:** Slice 01 erfüllt alle Vorgaben. Die 785 Contract-Assertions in `tests/monte-carlo-measurement-contract.test.mjs` und die 7 JSON-Fixtures unter `tests/fixtures/monte-carlo-measurement/` sind vollständig ausführbar und reproduzierbar. Der `pre-hardening-v1`-Snapshot sichert den bisherigen Stand exakt ab.
* **Vertragstreue:** Die Verträge D-01 bis D-12 sowie die `MonteCarloSnapshotPolicyV1` wurden präzise umgesetzt. Die Entkopplung von Pre-Hardening-Snapshot und zukünftigen Post-Slice-Referenzen schützt vor ungewollter Überschreibung der Baseline.
* **Fehlerbehandlung:** 0 technische Fehler in allen Opt-in-Messläufen (Standard, Stress, schwache Referenz, 3 Konvergenzfälle). Die Abbruchreaktionszeit (< 13 ms) liegt im grünen Bereich.
* **Seiteneffekte:** **0 produktive Programmdateien** verändert. Es wurden ausschließlich Tests und Fixtures ergänzt sowie Dokumentation synchronisiert.
* **Was könnte brechen? / Größtes Restrisiko:**
  1. Hoher Peak-RSS (1,759 GiB) beim 1 Mio. Stresstest unterstreicht die Wichtigkeit der in D-08 verankerten 100k-Empfehlung und UI-Warnungen für schwächere Endgeräte.
  2. Floating-Point-Differenzen zwischen unterschiedlichen V8-Engine-Versionen bei Snapshot-Vergleichen; durch feldspezifische Float-Toleranzen abgesichert.

### 2. Nummerierte Findings
* **Finding G-01-S1 (Dokumentierte Konvergenzabweichung):** Der empirische Konvergenztest ergab zwischen 100.000 und 1.000.000 Runs eine maximale Abweichung von 0,0612 %-Punkten. Codex hat dies vorbildlich als kleine lokale Abweichung dokumentiert und nicht als strikte Identität behauptet.
* **Finding G-02-S1 (Speicher-Footprint bei Stresstest):** Der Stresstest mit 1 Mio. Runs benötigte 1,759 GiB Peak-RSS. Dies ist technisch zulässig, bestätigt jedoch das Ressourcen-Gate D-08 für Web Worker in Browserumgebungen.

### 3. Pre-Mortem (3 Monate in die Zukunft)
Wahrscheinlichste Ursache für Probleme in 3 Monaten wäre ein V8-Engine-Upgrade in Node/Electron, das minimale Rundungsabweichungen bei Float-Aggregaten verursacht und Snapshot-Tests auslöst. Dies wird durch die in D-10 verankerte Snapshot-Toleranz-Policy verhindert.

### 4. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  1. Hoher Speicherbedarf bei 1 Mio. Runs (1,759 GiB RSS) erfordert Einhalten der Warnschwellen in Folgeslices.
  2. Vorhandene fremde Link-Abweichung (`architecture-evidence.test.mjs`) bleibt separiert.

## Review-Feedback von Claude

Ausstehend; Pflichtstruktur gemaess `SLICE_EXECUTION_RULES.md` verwenden.

## Review-Antworten von Codex

Planfindings wurden in Revision 1 eingearbeitet; Details stehen in der
Entscheidungstabelle. Slice 01 wurde umgesetzt und von Gemini freigegeben.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-01 bis G-06 | Gemini | Randfallvertraege fehlen | angenommen | Plan/Slices revidiert; Re-Review freigegeben |
| G-01-S1 | Gemini | Konvergenzabweichung | angenommen | In Slice-01-Fixtures und Doku erfasst |
| G-02-S1 | Gemini | Stresstest-Speicherbedarf | angenommen | In Slice 10 Ressourcen-Gate verankert |
| C-01 | Claude | Worker-/Chunkdeterminismus | angenommen | Snapshotmetadaten und Paritaetsmatrix umgesetzt |
| C-04 | Claude | Snapshot-Update-Policy fehlt | angenommen | unveraenderliche Baseline plus Delta-Ledger umgesetzt |
| C-09 | Claude | Workerconfig fehlt im Snapshot | angenommen | als Pflichtmetadatum ergaenzt |
| U-01 | Nutzer | 1 Mio. Runs ohne Engpass | angenommen | Stresstest und harte Rungrenze umgesetzt |
| U-02 | Nutzer | 100k praktisch ausreichend; kein messbares Delta bis 1 Mio. | angenommen | Standardbenchmark/Konvergenzvergleich umgesetzt |
| U-03 | Nutzer | neuer Default 10.000 Runs | angenommen | Messvertrag/Erwartungswert fuer Slice 10 festgelegt |
