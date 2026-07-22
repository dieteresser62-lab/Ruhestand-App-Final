# Slice 03: Risiko-KPI-Semantik

**Stand:** 2026-07-22
**Status:** implementiert; Gemini- und Nutzerreview ausstehend
**Feature-Branch:** `codex/simulator-monte-carlo-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend  
**Arbeitsplan:** [SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md](./SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md)  
**Abhaengigkeit:** Slices 01-02 und Entscheidung D-03

## Ziel

Volatilitaet und Kuerzungsanteil werden mathematisch korrekt, einheitlich
benannt und ueber alle Resultpfade transportiert.

## Akzeptanzkriterien

- Das Volatilitaetsfeld enthaelt `volPct`, nicht `maxDDpct`.
- Volatilitaet und maximaler Drawdown werden durch getrennte Golden Cases
  nachgerechnet; Einheiten und Annualisierung sind dokumentiert.
- Kuerzungsanteil speichert einen Anteil mit eindeutigem Nenner und identischer
  `>=`/`>`-Schwelle in Berechnung, Feldname, Tooltip und Export.
- Zaehler sind erfolgreich abgeschlossene Dekumulationsjahre mit Kuerzung
  `>= 10 %`; Nenner sind erfolgreich abgeschlossene Dekumulationsjahre mit
  endlicher Kuerzungsentscheidung. Nenner 0 ergibt nullable Missingness, nie
  0 oder NaN; ein beobachteter Anteil 0 bleibt davon unterscheidbar.
- Sofortiger Ruin, einjaehriger Horizont, keine Kuerzung und ausschliesslich
  starke Kuerzung sind definiert.
- Direkter, Worker- und Auto-Optimize-Pfad liefern dasselbe Ergebnis.
- Ein Post-Slice-03-Snapshot und ein Delta-Ledger dokumentieren getrennt die
  erwartete Volatilitaets- und Kuerzungssemantikaenderung, ohne die
  Pre-Hardening-Referenz zu ueberschreiben.

## Scope

- Risiko- und Kuerzungsberechnung im Runner/Metrikmodul,
- Buffer-/Aggregatfelder im V1-Chunkvertrag,
- Ergebnisaufbereitung und Labels,
- Golden Cases und Pfadparitaet.

## Nicht-Scope

- keine Pflege-KPIs, keine neue Erfolgsquote,
- keine Aenderung der zugrunde liegenden Engine-Entnahmeregel,
- keine empirische Risikomodellfreigabe.

## Geplante Dateien

- `app/simulator/monte-carlo-runner.js`,
- `app/simulator/monte-carlo-runner-utils.js`,
- `app/simulator/monte-carlo-chunk-result.js`,
- `app/simulator/monte-carlo-aggregates.js`,
- `app/simulator/results-metrics.js`,
- Tests/Fixtures.

Produktive Programmdateien: **maximal 5**.

## Diff-Risiko vor Coding

- Branch vor Coding: `codex/simulator-monte-carlo-gap-plan`.
- Status vor Coding: ausschliesslich vorbestehende, unversionierte
  Playwright-Dateien unter `node_modules/`; keine versionierten Aenderungen.
- Geplante produktive Dateien:
  `app/simulator/monte-carlo-runner.js`,
  `app/simulator/monte-carlo-runner-utils.js`,
  `app/simulator/monte-carlo-chunk-result.js`,
  `app/simulator/monte-carlo-aggregates.js` und
  `app/simulator/results-metrics.js`.
- Aenderungstiefe: riskant, weil bestehende Felder ihre bisher falsche Semantik
  verlieren.
- Gefaehrdete Tests/Snapshots: MC-Runner, Results-Metrics, Worker-Paritaet,
  Auto-Optimize, gespeicherte Erwartungswerte.
- Nicht anfassen: Engine-Helferformel, Pflege, Sampling, Worker-Lifecycle.
- Rollback: nur gelistete Produktiv- und neue Test-/Fixture-Dateien auf den
  Slice-02-Commit `a8c1765` zurueckfuehren; bei unerwarteten Snapshot-,
  Backtest- oder FlowDelta-Abweichungen sofort stoppen.

## Geplante Tests

- Golden Cases mit bekannter Renditereihe fuer Volatilitaet und Drawdown,
- Kuerzungsnenner-/Schwellenfaelle,
- UI-/Exportfall fuer `null` versus beobachtete 0,
- direkte/Worker-/Auto-Optimize-Paritaet,
- Results-Label-/Formattertests,
- `npm test`.

## Durchgefuehrte Aenderungen

- `runMonteCarloChunk()` schreibt `volPct` in Volatilitaet und `maxDDpct` nur
  in Drawdown. Die vorhandene Jahresfrequenz wird als Stichproben-
  Standardabweichung mit N-1 ohne zusaetzlichen Annualisierungsfaktor
  dokumentiert.
- `MonteCarloPathSummaryV1` transportiert `cutYearsNumerator`,
  `cutYearsDenominator` und den kanonischen `cutYearShareRatio`. Zaehlbar sind
  nur erfolgreich abgeschlossene Dekumulationsjahre mit endlicher
  Kuerzungsentscheidung; die Schwelle ist inklusiv `>= 10 %`.
- Nenner 0 wird intern als endlicher 0-Platzhalter plus separater
  `MONTE_CARLO_MISSINGNESS_CODE.NO_OBSERVATIONS` gespeichert, im aggregierten
  serialisierbaren Ergebnis als `p50: null`, `sampleSize: 0` und
  `excludedRuns` ausgegeben. Beobachtete 0 bleibt ein endlicher Wert.
- Der alte Buffer und Ergebniskey `kpiKuerzungsjahre` behalten ihre bisherige
  absolute Jahreszaehlung und sind explizit als deprecated Read-Alias mit
  Ersatzfeld `cutYearSharePct` und Entfernungsziel Slice 11 markiert.
- Das Dashboard nutzt nur `cutYearSharePct`, zeigt `>= 10 %`, Nenner und
  Stichprobengroesse und rendert Missingness als Gedankenstrich.
- `post-slice-03-v1.json` fixiert den neuen Referenzstand. Zwei getrennte
  Eintraege im Delta-Ledger beschreiben Volatilitaets- und
  Kuerzungssemantikaenderung; `pre-hardening-v1.json` blieb unveraendert.
- Ratio- und Missingness-Buffer erhoehen den registrierten Speicherbedarf von
  63 auf 68 Byte pro Run. Es werden weiterhin keine Jahrespfade uebertragen.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/monte-carlo-chunk-result.test.mjs`:
  31/31 Assertions gruen.
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`:
  153/153 Assertions gruen.
- `node tests/run-single.mjs tests/results-metrics.test.mjs`:
  23/23 Assertions gruen.
- `node tests/run-single.mjs tests/auto-optimize-worker-contract.test.mjs`:
  10/10 Assertions gruen.
- `node tests/run-single.mjs tests/mc-worker-contract.test.mjs`:
  34/34 Assertions gruen.
- `node tests/run-single.mjs tests/worker-parity.test.mjs`:
  369/369 Assertions gruen.
- `node tests/run-single.mjs tests/monte-carlo-measurement-contract.test.mjs`:
  506/506 Assertions gruen.
- Die sieben fokussierten Suiten umfassen zusammen 1126/1126 gruene
  Assertions.
- `npm test`: 6266/6267 Assertions gruen. Einzige Abweichung ist der bereits
  vor Slice 03 dokumentierte fremde `architecture-evidence`-Fehler mit sechs
  toten Links auf die zwei fehlenden internen Forschungsdokumente. Alle
  uebrigen 120 Testdateien sind gruen; keine neue Snapshot-, Backtest- oder
  FlowDelta-Abweichung.
- `git diff --check`: gruen.
- `npm run build:engine` war nicht erforderlich, weil weder `engine/` noch die
  oeffentliche `EngineAPI` geaendert wurden.

## Abweichungen vom Plan

- `mc-run-metrics.js` und `results-renderers.js` mussten nicht geaendert werden.
  Stattdessen wurden `monte-carlo-runner-utils.js` fuer den kanonischen Buffer
  und `monte-carlo-aggregates.js` fuer den serialisierbaren Prozentvertrag
  angepasst. Die Obergrenze von fuenf produktiven Dateien blieb eingehalten.

## Offene Risiken

- Eine stille Umdeutung alter gespeicherter Resultate ist unzulaessig. D-03 und
  Finding G-02 sind im freigegebenen Hauptplan konkretisiert; Legacy-Felder
  benoetigen daher eine explizite, befristete Migration statt stiller
  Bedeutungsverschiebung.
- Das befristete Legacy-Feld muss gemaess D-07 spaetestens in Slice 11 entfernt
  und sein Fehlen in Slice 12 nachgewiesen werden.
- Der endliche 0-Platzhalter darf nie ohne seinen Missingness-Code als
  beobachteter Nullanteil interpretiert werden. JSON und UI verwenden fuer
  Missingness weiterhin `null` beziehungsweise Gedankenstrich.
- Die bekannte fremde Architektur-Linkabweichung bleibt ausserhalb dieses
  Slice-Scope offen.

## Rueckdokumentation und Freigabe

Formeln, Feldmigration, Snapshot und Testergebnisse sind in Hauptplan,
GAP-Matrix und Simulator-Modulreferenz zurueckgetragen. Implementierung:
abgeschlossen. Freigabe durch Gemini und Nutzer: ausstehend; Codex erteilt
keine Eigenfreigabe und erstellt keinen Commit.

## Review-Feedback von Gemini

### 1. Systematische Prüfdimensionen
* **Korrektheit:** Slice 03 löst die beiden P0-GAPs MC-01 und MC-02 vollständig.
  - **MC-01:** `volatilities[i]` speichert jetzt die tatsächliche annualisierte Stichproben-Standardabweichung `volPct`, während `maxDrawdowns[i]` den `maxDDpct` speichert.
  - **MC-02:** Der Kürzungsjahre-Anteil wird als echtes Verhältnis `cutYearsNumerator / cutYearsDenominator` (in %) für Dekumulationsjahre berechnet. Nenner 0 führt zu `null` + `MONTE_CARLO_MISSINGNESS_CODE.NO_OBSERVATIONS`, womit Divisionen durch Null und `NaN` zuverlässig abgefangen werden.
* **Vertragstreue:** `MonteCarloChunkResultV1` in `monte-carlo-chunk-result.js` wurde um `cutYearShareRatio` und `cutYearShareMissingness` erweitert. Strikte Whitelist-Validierungen stellen sicher, dass Puffer, Path-Summaries und Path-Missingness zueinander konsistent sind. Die Deprecation des alten Feldes `kpiKuerzungsjahre` ist zeitlich befristet dokumentiert.
* **Fehlerbehandlung:** Pfade ohne Dekumulation (z. B. reine Ansparphase vor Ruin) oder Pfade mit Nenner 0 ergeben ein sauberes `null` (im UI als `-` dargestellt) mit explizitem Missingness-Code.
* **Seiteneffekte:** Punktgenau **5 produktive Programmdateien** verändert (`monte-carlo-aggregates.js`, `monte-carlo-chunk-result.js`, `monte-carlo-runner-utils.js`, `monte-carlo-runner.js`, `results-metrics.js`). Die Dokumentations-Dateien (`README.md`, `SIMULATOR_MODULES_README.md`, Hauptplan, GAP-Analyse, Slice-Dokument) wurden konsistent synchronisiert.
* **Was könnte brechen? / Größtes Restrisiko:**
  1. Auf älteren Endgeräten oder in exportierten JSONs muss sichergestellt sein, dass veraltete Read-Aliase (`kpiKuerzungsjahre`) nach der Übergangsphase in Slice 11/12 rückstandslos entfernt werden, ohne dass UI-Komponenten auf den alten Key zugreifen.

### 2. Nummerierte Findings
* **Finding G-01-S3 (Mathematisch korrekte Trennung von Volatilität und Drawdown):** Durch den Fix in `monte-carlo-runner.js` zeigen Volatilitätskarten und MaxDrawdown-Karten im UI nun sachlich unabhängige Risikogrößen.
* **Finding G-02-S3 (Sauberes Nullable-Handling bei Nenner 0):** Nenner 0 bei der Kürzungsquote erzeugt kein `NaN` oder erfundene `0%`, sondern ein Nullable mit `sampleSize=0`, was in `results-metrics.js` als `-` gerendert wird.

### 3. Pre-Mortem (3 Monate in die Zukunft)
Wahrscheinlichste Ursache für Probleme in 3 Monaten wäre der Zugriff eines Drittanbieter-Export-Consumers oder eines alten UI-Widgets auf den deprecated Read-Alias `kpiKuerzungsjahre` nach dessen geplanter Entfernung in Slice 11/12. Dies wird durch die geplanten Entfernungstests in Slice 11/12 abgesichert.

### 4. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  1. Veralteter Read-Alias `kpiKuerzungsjahre` muss in Slice 11/12 vollständig entfernt werden.
  2. Bekannte fremde Link-Abweichung (`architecture-evidence.test.mjs`) bleibt separiert.

## Review-Feedback von Claude

Ausstehend; Pflichtstruktur gemaess `SLICE_EXECUTION_RULES.md` verwenden.

## Review-Antworten von Codex

Planfindings wurden in Revision 1 eingearbeitet; Details stehen in der
Entscheidungstabelle. Slice 03 wurde umgesetzt und von Gemini freigegeben.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-01-S3 | Gemini | Volatilität vs. MaxDrawdown Trennung | angenommen | In `monte-carlo-runner.js` und `results-metrics.js` umgesetzt |
| G-02-S3 | Gemini | Nullnenner bei Kürzungsquote | angenommen | `NO_OBSERVATIONS`, JSON-null, UI-Gedankenstrich und Golden Cases umgesetzt |
| C-04 | Claude | Snapshotdrift | angenommen | `post-slice-03-v1` und zwei getrennte Delta-Ledger-Eintraege umgesetzt |
