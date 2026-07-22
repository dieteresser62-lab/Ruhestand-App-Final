# Slice 01: Baseline und Messvertrag

**Stand:** 2026-07-19  
**Status:** Revision 1 nach Review; erneute Freigabe ausstehend  
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

- Planungsbranch: `codex/simulator-monte-carlo-gap-plan`; vor Coding erneut mit
  `git branch --show-current` pruefen und Ergebnis hier eintragen.
- Planungsstatus enthaelt fremde Verschiebung des Forschungsbacklogs und
  unversionierte Playwright-Dateien; vor Coding erneut wortgetreu erfassen.
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

Noch keine Implementierung; nur Planung.

## Ausgefuehrte Tests

Planungsbaseline siehe Hauptplan. Slice-spezifische Tests noch nicht erstellt.

## Abweichungen vom Plan

- Keine Abweichung.

## Offene Risiken

- Risiko: Golden Cases koennten eine noch nicht reviewte Fachannahme verfestigen;
  deshalb blockiert jede offene D-Entscheidung den betroffenen Fall.
- Snapshot-Toleranzen koennten echten Nichtdeterminismus maskieren. Diskrete
  Felder bleiben deshalb toleranzlos; Float-Toleranzen werden pro Feld
  dokumentiert und durch direkte Nachrechnung begrenzt.

## Rueckdokumentation und Freigabe

Nach Abschluss werden Entscheidungen, Fixture-IDs und Testergebnisse in den
Hauptplan uebernommen. Implementierung: nicht begonnen. Gemini-, Claude- und
Nutzerfreigabe: ausstehend.

## Review-Feedback von Gemini

Ausstehend; Pflichtstruktur gemaess `SLICE_EXECUTION_RULES.md` verwenden.

## Review-Feedback von Claude

Ausstehend; Pflichtstruktur gemaess `SLICE_EXECUTION_RULES.md` verwenden.

## Review-Antworten von Codex

Planfindings wurden in Revision 1 eingearbeitet; Details stehen in der
Entscheidungstabelle. Slice-spezifische Re-Review ist ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-01 bis G-06 | Gemini | Randfallvertraege fehlen | angenommen | Plan/Slices revidiert; Re-Review offen |
| C-01 | Claude | Worker-/Chunkdeterminismus | angenommen | Snapshotmetadaten und Paritaetsmatrix geplant |
| C-04 | Claude | Snapshot-Update-Policy fehlt | angenommen | unveraenderliche Baseline plus Delta-Ledger geplant |
| C-09 | Claude | Workerconfig fehlt im Snapshot | angenommen | als Pflichtmetadatum ergaenzt |
| U-01 | Nutzer | 1 Mio. Runs ohne Engpass | angenommen | Stresstest und harte Rungrenze ergaenzt |
| U-02 | Nutzer | 100k praktisch ausreichend; kein messbares Delta bis 1 Mio. | angenommen | Standardbenchmark/Konvergenzvergleich ergaenzt |
| U-03 | Nutzer | neuer Default 10.000 Runs | angenommen | Messvertrag/Erwartungswert fuer Slice 10 festgelegt |
