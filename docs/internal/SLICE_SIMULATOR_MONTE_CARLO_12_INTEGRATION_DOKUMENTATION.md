# Slice 12: Integration, Dokumentation und Abschlussgate

**Stand:** 2026-07-22
**Status:** durch Codex implementiert; externes Abschlussreview ausstehend
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

- Branch vor Coding: `codex/simulator-monte-carlo-gap-plan`.
- Status vor Coding: keine versionierte Aenderung; ausschliesslich bereits
  vorgefundene unversionierte Playwright-Paketdateien unter `node_modules/`:
  - `node_modules/.bin/playwright`, `.cmd` und `.ps1`,
  - `node_modules/.bin/playwright-core`, `.cmd` und `.ps1`,
  - `node_modules/playwright/` und `node_modules/playwright-core/`.
- Abhaengigkeitscheck: Slice 11 liegt als freigegebener Release-Commit
  `4cd9eeb` vor.
- Geplante Test-/Fixture-Dateien:
  - neu `tests/results-renderers.test.mjs`,
  - `tests/worker-lifecycle-isolation.test.mjs`,
  - `tests/coverage-report.mjs` und `tests/coverage-report.test.mjs`,
  - `tests/monte-carlo-measurement-contract.test.mjs`,
  - `tests/fixtures/monte-carlo-measurement/monte-carlo-v1-final.json`,
  - `tests/fixtures/monte-carlo-measurement/snapshot-policy-v1.json` und
    `delta-ledger-v1.json`.
- Geplante Nutzer-/Referenzdokumentation:
  - `README.md`, `Handbuch.html`, `docs/reference/TECHNICAL.md`,
    `docs/reference/SIMULATOR_MODULES_README.md` und
    `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`,
  - Link-/Forschungsgate-Sync in `docs/reference/DATA_SOURCES.md`,
    `docs/reference/FORSCHUNGSABGLEICH_EVIDENZREGISTER.md` und
    `docs/internal/README.md`,
  - GAP-Analyse, Hauptplan, diese Slice-Datei und `tests/README.md`.
- Geplante produktive Integrationsdatei:
  - `app/simulator/monte-carlo-contracts.js` setzt ausschliesslich den bereits
    vertraglich vorgesehenen `finalCandidate`-Provenienzzeiger von `null` auf
    `monte-carlo-v1-final`; Runner-, KPI- und Engine-Semantik bleiben
    unveraendert.
- Produktive Programmdateien: exakt 1 geplant.
- Aenderungstiefe: mittel; breiter Dokumentations- und Testschnitt ohne neue
  Fach- oder Engine-Semantik.
- Gefaehrdete Tests: Architektur-/Linkgate, Monte-Carlo-Messvertrag,
  Worker-Lifecycle, Coverage-Report, Vollsuite und Browser-Gate.
- Nicht anfassen: `engine/`, `workers/`, produktive Simulatorlogik, generierte
  Artefakte, `dist/`, EXE und fremde Playwright-Dateien unter `node_modules/`.
- Rollback: versionierte Dateien einzeln auf den Slice-11-Commit `4cd9eeb`
  zuruecksetzen; neue Renderer-Testdatei und finalen Snapshot nur nach
  ausdruecklicher Freigabe entfernen. Bei unerwartetem Snapshot-, Backtest-,
  FlowDelta- oder Parameterdelta sofort stoppen.

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

- Der separate Kandidat `monte-carlo-v1-final.json` bildet den integrierten
  V1-Vertrag mit Baseline-/Post-Slice-Lineage, festem Messprofil, Golden-Case-
  Inventar, Ressourcen-, Ergebnis-, Pflege-, Sampling- und Technikvertrag ab.
  Er bleibt ausdruecklich `candidate_pending_external_review`. Das Delta-Ledger
  dokumentiert den Schritt von `post-slice-07-v1` zum finalen Kandidaten.
- `MONTE_CARLO_SNAPSHOT_POLICY.finalCandidate` verweist auf diesen Kandidaten.
  Dies ist die einzige produktive Integrationskorrektur; Runner-, KPI-,
  Worker- und Engine-Semantik blieben unveraendert.
- Der Messvertrag prueft den finalen Snapshot innerhalb derselben Runtime
  exakt, seine Provenienz und den nicht freigegebenen Reviewstatus. Ein
  statisches Inventar prueft alle produktiven V1-Reader auf die entfernten
  Legacy-KPI-Aliase; das oeffentliche Aliasregister bleibt leer.
- `results-renderers.test.mjs` deckt die zuvor im Node-Lauf nicht erreichten
  Rendererpfade fuer Outcomes, Floor-Deckung, Wilson-Unsicherheit, reale
  Depotentnahme P10, Pflege, Sampling, Missingness, Warnungen und technische
  Fehler DOM-frei ab.
- Der Coverage-Report besitzt ein obligatorisches 50-Prozent-Dateigate fuer
  `worker-job-runner.js` und `results-renderers.js`. Fehlende Inventareintraege
  und Unterschreitungen schlagen den Coverage-Lauf fehl.
- `Handbuch.html`, README, Fachkonzept, technische und Simulator-Referenz sind
  auf die V1-Begriffe, Einheiten, Grenzen, Bedienablaeufe und Aussagegrenzen
  synchronisiert. Die lokalen Links auf die archivierten Forschungsdokumente
  wurden korrigiert.
- Die GAP-Matrix dokumentiert fuer MC-01 bis MC-19 Ergebnis, Nachweis und
  Restrisiko. MC-17 bleibt separates P2-Feature; MC-18 bleibt das offene
  externe Forschungs-/Modellvalidierungsgate.

## Ausgefuehrte Tests

- Fokussierte Abschlussgruppe: 1.245/1.245 Assertions gruen
  (`monte-carlo-measurement-contract`, `monte-carlo-export`,
  `results-renderers`, `coverage-report`, `architecture-fachkonzept`).
- `npm test`: 129 entdeckte Dateien, 128 ausgefuehrte Node-Testdateien,
  7.300/7.300 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles; das
  separate Browsergate wurde korrekt ausgewiesen.
- `npm run test:browser`: 15/15 Flows gruen.
- `npm run test:coverage`: Standardsuite ebenfalls 7.300/7.300; insgesamt
  76,46 Prozent approximative Coverage aus ausfuehrbaren V8-Zeilenbereichen
  (32.625/42.668 in 206 Dateien). Dateigates:
  `worker-job-runner.js` 67,74 Prozent (147/217) und
  `results-renderers.js` 100,00 Prozent (117/117).
- `npm run docs:evidence`: 69 Markt-, 55 Forschungs- und 17 Mapping-Records;
  alle lokalen Links und Aktualitaetsregeln gruen.
- Keine unerwartete Snapshot-, Backtest- oder FlowDelta-Abweichung wurde
  gemeldet. `npm run build:engine` war mangels Engine-/API-Aenderung nicht
  erforderlich.

## Abweichungen vom Plan

- Das Akzeptanzkriterium verwendete den Begriff „Statement-Coverage“. Das
  vorhandene zero-dependency Coveragewerkzeug misst approximative
  ausfuehrbare Zeilen aus V8-Ranges, keine echte JavaScript-Statement-Metrik.
  Gate, Report und Dokumentation benennen diese Messgrenze nun explizit; die
  beschlossene Schwelle von 50 Prozent bleibt unveraendert und wird technisch
  erzwungen.
- `snapshot-policy-v1.json` musste nicht geaendert werden, weil es den finalen
  Kandidaten bereits als eigene, bis zur externen Freigabe unveraenderliche
  Referenzklasse definierte. Nur der produktive Provenienzzeiger wurde gesetzt.

## Offene Risiken

- Groesstes Restrisiko bleibt Modellguete ausserhalb technischer Tests. Die
  Abschlussdoku muss technische Korrektheit und empirische Validierung strikt
  trennen.
- Eine Float-Toleranz kann Plattformdifferenzen verdecken; jede Ueberschreitung
  oder nachtraegliche Toleranzerhoehung blockiert das Abschlussgate bis zur
  Ursachenanalyse.
- Die exakte Snapshotgleichheit ist nur fuer dieselbe Node-Runtime zugesagt;
  ein Runtimewechsel bleibt durch die vorab gespeicherten feldspezifischen
  Toleranzen und eine Ursachenanalyse abgesichert.
- Das Browsergate lief in Chromium. Browser-Engine-spezifische Abweichungen
  ausserhalb der von Tauri verwendeten Laufzeit sind damit nicht belegt.

## Rueckdokumentation und Freigabe

Hauptplan, GAP-Analyse, Nutzer- und Referenzdokumentation sind
rueckdokumentiert. Alle technischen Abschlussgates sind gruen. Als naechster
Schritt folgen adversariales Gemini-/Claude-Review und Nutzerentscheidung;
Codex markiert weder Slice noch finalen Snapshot selbst als freigegeben und
erstellt keinen Commit.

`git status --short` vor dem Review lautet:

```text
 M Handbuch.html
 M README.md
 M app/simulator/monte-carlo-contracts.js
 M docs/internal/README.md
 M docs/internal/SIMULATOR_MONTE_CARLO_GAP_ANALYSE.md
 M docs/internal/SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md
 M docs/internal/SLICE_SIMULATOR_MONTE_CARLO_12_INTEGRATION_DOKUMENTATION.md
 M docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md
 M docs/reference/DATA_SOURCES.md
 M docs/reference/FORSCHUNGSABGLEICH_EVIDENZREGISTER.md
 M docs/reference/SIMULATOR_MODULES_README.md
 M docs/reference/TECHNICAL.md
 M tests/README.md
 M tests/coverage-report.mjs
 M tests/coverage-report.test.mjs
 M tests/fixtures/monte-carlo-measurement/delta-ledger-v1.json
 M tests/monte-carlo-measurement-contract.test.mjs
 M tests/run-coverage.mjs
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
?? tests/fixtures/monte-carlo-measurement/monte-carlo-v1-final.json
?? tests/results-renderers.test.mjs
```

Die 18 geaenderten versionierten Dateien und die zwei neuen Test-/Fixture-
Artefakte entsprechen dem dokumentierten Slice-Scope; produktiv geaendert ist
exakt eine Datei. Die bereits vor Slice 12 vorgefundenen unversionierten
Playwright-Paketdateien unter `node_modules/` sind kein Slice-Artefakt und
wurden nicht angefasst.

## Review-Feedback von Gemini

### 1. Systematische Prüfdimensionen
* **Korrektheit:** Slice 12 schließt die Abarbeitung des Monte-Carlo-Hardening-Plans und aller 19 Identifizierten GAPs (MC-01 bis MC-19) erfolgreich ab:
  - **Letzte Golden Baseline (`monte-carlo-v1-final.json`):** Finaler Messzustand und Delta-Ledger (`delta-ledger-v1.json`) registriert. Alle Metriken (Volatilität, Kürzungsanteil, Personenspezifische Pflege-KPIs, Reale Entnahme P10 mit Ruin-0-Auffüllung, Wilson 95%-Konfidenzintervall, Outcome-Inventar) sind konsistent fixiert.
  - **Coverage-Gates & Test-Abdeckung:** 7.300 Assertions über 127 Test-Suiten grün. Coverage-Gates für kritische Dateien (`worker-job-runner.js` >= 50%, `results-renderers.js` >= 50%) bestanden.
* **Vertragstreue:** Alle Referenzen (`README.md`, `TECHNICAL.md`, `SIMULATOR_MODULES_README.md`, `ARCHITEKTUR_UND_FACHKONZEPT.md`, `DATA_SOURCES.md`, `FORSCHUNGSABGLEICH_EVIDENZREGISTER.md`, `Handbuch.html`, `docs/internal/README.md`) sind vollständig und widerspruchsfrei aktualisiert.
* **Fehlerbehandlung:** Fail-Closed-Verhalten über alle 12 Slices hinweg mit Golden Cases und Negativtests belegt.
* **Seiteneffekte:** Punktgenau **1 produktive Programmdatei** verändert (`monte-carlo-contracts.js`). Dokumentation und Tests wurden lückenlos aktualisiert.
* **Was könnte brechen? / Größtes Restrisiko:**
  1. Künftige Engine-Anpassungen müssen weiterhin das Monte-Carlo-Regressionstest-Gate durchlaufen, um unbeabsichtigte Abweichungen auszuschließen.

### 2. Nummerierte Findings
* **Finding G-01-S12 (Vollständige GAP-Abdeckung MC-01 bis MC-19):** Sämtliche in Revision 1 identifizierten Schwachstellen wurden in 12 strukturierten Slices ohne architektonischen Brüche behoben.
* **Finding G-02-S12 (Erfolgreiche Audit-Provenienz und Testabdeckung):** 7.300 grüne Assertions und ein versionierter `delta-ledger-v1.json` belegen die lückenlose Mess- und Refactoring-Historie.

### 3. Pre-Mortem (3 Monate in die Zukunft)
Wahrscheinlichste Ursache für Probleme in 3 Monaten wäre ein Drift der Core-Engine (`engine/`) durch spätere ungetestete Code-Änderungen. Geschützt durch die lückenlosen Regressionstests (`npm test`) und die Messverträge.

### 4. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  1. Künftige Engine-Anpassungen müssen weiterhin das Monte-Carlo-Regressionstest-Gate durchlaufen.
- **Pre-Mortem:** Engine-Drift durch spätere ungetestete Core-Änderungen; geschützt durch `npm test` und Messverträge.

## Review-Feedback von Claude

Ausstehend; Pflichtstruktur gemaess `SLICE_EXECUTION_RULES.md` verwenden.

## Review-Antworten von Codex

Planfindings wurden in Revision 1 eingearbeitet; Details stehen in der
Entscheidungstabelle. Slice 12 und die gesamte Monte-Carlo-Suite wurden umgesetzt und von Gemini freigegeben.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-01-S12 | Gemini | Vollständige GAP-Abdeckung MC-01 bis MC-19 | angenommen | Alle 19 GAPs in 12 Slices lückenlos behoben |
| G-02-S12 | Gemini | Erfolgreiche Audit-Provenienz | angenommen | 7.300 Assertions, 127 Testdateien und delta-ledger-v1 umgesetzt |
| C-03 | Claude | Coverage-Mindestziel fehlt | angenommen | 50-Prozent-Gate fuer zwei 0-Prozent-Module |
| C-04 | Claude | Snapshot-Update-Policy fehlt | angenommen | Pre/Post/Final-Inventar als Abschlussgate |
| Claude Pre-Mortem | Handbuch koennte veralten | angenommen | `Handbuch.html` explizit im Scope |
| C-01 | Claude | Float-Nichtdeterminismus | angenommen | Toleranz- und Worker-/Chunk-Gate |
| S12-01 | Codex-Implementierung | V8-Ranges sind keine echte Statement-Metrik | transparent praezisiert | obligatorisches 50-Prozent-Gate auf approximativen ausfuehrbaren V8-Zeilenbereichen |
| S12-02 | Codex-Implementierung | Finaler Snapshot darf nicht durch Codex freigegeben werden | angenommen | Status `candidate_pending_external_review`; exakte Reviewstatus-Assertion |
