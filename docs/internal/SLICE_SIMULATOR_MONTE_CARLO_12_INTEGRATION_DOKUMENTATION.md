# Slice 12: Integration, Dokumentation und Abschlussgate

**Stand:** 2026-07-19  
**Status:** Revision 1 nach Review; erneute Freigabe ausstehend  
**Feature-Branch:** `codex/simulator-monte-carlo-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend  
**Arbeitsplan:** [SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md](./SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md)  
**Abhaengigkeit:** Slices 01-11 gruen, reviewt und lokal committet

## Ziel

Alle freigegebenen Slices werden als konsistenter Monte-Carlo-Vertrag
integriert. Nutzer-, Fach- und Technikdokumentation beschreiben dieselben
Begriffe; Volltests, Browsertests und Coverage bilden das Abschlussgate.

## Akzeptanzkriterien

- GAP-Matrix MC-01 bis MC-19 nennt fuer jedes GAP Ergebnis, Nachweis und
  verbleibendes Restrisiko; keine Eigenfreigabe durch Codex.
- README, Fachkonzept, technische Referenz und Simulator-Modulreferenz stimmen
  zu Real-CaR, Outcomes, Sampling, Pflege, Unsicherheit, Export und Grenzen
  ueberein.
- `Handbuch.html` beschreibt dieselben Begriffe, Einheiten und Bedienablaeufe.
- Veraltete Aussagen zu nominaler Real-CaR, technischem Fehler als fachlichem
  Run und Sampling-Wraparound sind korrigiert.
- Alle V1-Vertraege und Kompatibilitaetsregeln sind dokumentiert.
- Der unveraenderliche `pre-hardening-v1`-Snapshot, alle Post-Slice-Deltas und
  der Kandidat `monte-carlo-v1-final` sind vorhanden und eindeutig getrennt.
- Befristete Legacy-KPI-Aliase sind aus produktiven Consumern entfernt; ein
  Inventartest weist ihre Abwesenheit nach.
- `npm test`, `npm run test:browser` und `npm run test:coverage` sind gruen;
  die Gesamtcoverage sinkt nicht und `worker-job-runner.js` sowie
  `results-renderers.js` erreichen jeweils mindestens 50 Prozent
  Statement-Coverage.
- Keine unerwarteten Snapshot-, Backtest- oder FlowDelta-Aenderungen.
- `git status --short` wird vor Review dokumentiert und exakt gegen den
  freigegebenen Slice-Scope abgeglichen.
- Forschungs-/Modellvalidierung bleibt als separates offenes Gate kenntlich.

## Scope

- Integrationskorrekturen innerhalb bereits freigegebener Contracts,
- Doku-Sync und Abschlussmatrix,
- Volltest-, Browser- und Coveragegate.

## Nicht-Scope

- keine neuen Funktionen oder ungeprueften Semantikaenderungen,
- keine empirische Modellfreigabe,
- kein Releasebuild, kein `dist`-/EXE-Sync,
- kein automatischer Commit oder Push durch Codex.

## Geplante Dateien

- `README.md`,
- `docs/reference/TECHNICAL.md`,
- relevante Simulator-Modulreferenz,
- relevantes Fachkonzept unter `docs/`,
- `Handbuch.html`,
- GAP-Analyse, Hauptplan und Slice-Dokumente,
- produktive Dateien nur fuer kleine Integrationskorrekturen innerhalb der
  bereits reviewten Slices; vorab einzeln auflisten.

Produktive Programmdateien: **0 geplant; bei Integrationskorrekturen maximal 5**.

## Diff-Risiko vor Coding

- Branch und vollstaendigen Status unmittelbar vor Integration hier nachtragen.
- Aenderungstiefe: mittel; breiter Dokumentations- und Testschnitt.
- Gefaehrdete Tests: Architektur-Links, Vollsuite, Browser, Coverageinventar,
  Snapshots/Backtests.
- Nicht anfassen: Engine/generierte Artefakte, Forschungsdaten, fremde
  Arbeitsbaum-Aenderungen.
- Rollback: Dokumente und etwaige Integrationsdateien einzeln auf den
  Slice-11-Commit; keine globalen Resets. Bei fachlicher Neuaenderung neuen
  Slice planen statt im Abschlussgate einschleusen.

## Geplante Tests

- alle fokussierten Suiten der Slices 01-11,
- `npm test`,
- `npm run test:browser`,
- `npm run test:coverage`,
- explizites 50-Prozent-Statement-Gate fuer `worker-job-runner.js` und
  `results-renderers.js` sowie Nichtregression der Gesamtcoverage,
- Snapshot-/Delta-Ledger-Inventar und Legacy-Alias-Negativtest,
- Link-/Architekturtests und `git diff --check`,
- `npm run build:engine` nur nach separater Freigabe einer unerwartet noetigen
  Engine-Aenderung; im Plan nicht vorgesehen.

## Durchgefuehrte Aenderungen

Noch keine Implementierung.

## Ausgefuehrte Tests

Noch keine Slice-spezifischen Tests ausgefuehrt.

## Abweichungen vom Plan

- Keine Abweichung.

## Offene Risiken

- Groesstes Restrisiko bleibt Modellguete ausserhalb technischer Tests. Die
  Abschlussdoku muss technische Korrektheit und empirische Validierung strikt
  trennen.
- Eine Float-Toleranz kann Plattformdifferenzen verdecken; jede Ueberschreitung
  oder nachtraegliche Toleranzerhoehung blockiert das Abschlussgate bis zur
  Ursachenanalyse.

## Rueckdokumentation und Freigabe

Hauptplan und GAP-Analyse erhalten finale Status-, Nachweis- und
Restrisikotabellen. Erst danach folgen adversariales Gemini-/Claude-Review und
Nutzerentscheidung. Codex markiert den Themenbereich nicht selbst als
freigegeben.

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
| C-03 | Claude | Coverage-Mindestziel fehlt | angenommen | 50-Prozent-Gate fuer zwei 0-Prozent-Module |
| C-04 | Claude | Snapshot-Update-Policy fehlt | angenommen | Pre/Post/Final-Inventar als Abschlussgate |
| Claude Pre-Mortem | Handbuch koennte veralten | angenommen | `Handbuch.html` explizit im Scope |
| C-01 | Claude | Float-Nichtdeterminismus | angenommen | Toleranz- und Worker-/Chunk-Gate |
