# Slice 11: Browser-E2E und Regressionsnachweis

**Stand:** 2026-07-22
**Status:** Implementierung durch Codex abgeschlossen; Review ausstehend
**Feature-Branch:** `codex/simulator-monte-carlo-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend  
**Arbeitsplan:** [SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md](./SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md)  
**Abhaengigkeit:** Slices 03-10

## Ziel

Ein echter Browserlauf prueft den Monte-Carlo-Nutzerworkflow und die kritischen
Fehler-/Race-Pfade. Contracttests werden durch beobachtbares UI-Verhalten und
direkte/Worker-/Fallback-Paritaet ergaenzt.

## Akzeptanzkriterien

- E2E startet einen kleinen deterministischen MC-Lauf ueber die sichtbare UI.
- Ergebnis zeigt Outcome-Inventar, korrigierte KPIs, Unsicherheit und
  Samplingdiagnostik mit den erwarteten Labels.
- Export wird ausgeloest und gegen `MonteCarloExportV1` validiert.
- Mindestens Worker-Erfolg, erzwungener Fallback, technischer Fehler, Cancel und
  Neustart-mit-spaeter-Altantwort werden abgedeckt.
- Tastaturbedienung und zentrale ARIA-Attribute werden im Browser geprueft.
- Tests verwenden kleine Fixtures/Fake-Worker und bleiben deterministisch;
  keine externen Netzaufrufe oder festen Sleeps.
- Direkter und Workerpfad stimmen fuer den Golden Request im vereinbarten
  Contract ueberein.
- Eine deterministische Paritaetsmatrix variiert Workerzahl und Chunkgrenzen;
  diskrete und endliche Float-Per-Run-Felder stimmen innerhalb derselben
  Runtime exakt ueberein. Die Slice-01-Toleranz gilt nur fuer dokumentierte
  runtimeuebergreifende Snapshots.
- Kein neuer V1-Export oder UI-Consumer schreibt oder liest noch die
  befristeten Legacy-KPI-Aliase; ein Negativtest weist ihre Entfernung nach.

## Scope

- Browser-Testfixtures und MC-E2E-Faelle,
- nur minimale produktive Testhooks, falls ohne Produktionssonderpfad moeglich,
- Coverage-Inventar fuer zuvor ungetestete Orchestrierungs-/Rendererpfade.

## Nicht-Scope

- keine neue Fachfunktion,
- keine Pixelperfektion oder umfassende Cross-Browser-Matrix,
- kein Performancebenchmark auf Nutzerhardware.

## Geplante Dateien

- bestehende/neue Browser-Tests und Fixtures unter `tests/`,
- optional ein DOM-freier Worker-Testadapter,
- produktive Aenderungen nur bei nachgewiesener Testbarkeitsluecke und nach
  erneutem Diff-Risiko-Check.

Produktive Programmdateien: **0 geplant, maximal 2 nach Review**.

## Diff-Risiko vor Coding

- Branch vor Coding: `codex/simulator-monte-carlo-gap-plan`.
- Status vor Coding: keine versionierte Aenderung; ausschliesslich bereits
  vorgefundene unversionierte Playwright-Paketdateien unter `node_modules/`:
  - `node_modules/.bin/playwright`, `.cmd` und `.ps1`,
  - `node_modules/.bin/playwright-core`, `.cmd` und `.ps1`,
  - `node_modules/playwright/` und `node_modules/playwright-core/`.
- Abhaengigkeitscheck: Slice 10 liegt als freigegebener Release-Commit
  `3431ce9` vor.
- Geplante Produktdateien:
  - `app/simulator/monte-carlo-contracts.js` entfernt die in Slice 08
    befristeten V1-Read-Aliase,
  - `app/simulator/results-metrics.js` entfernt den letzten UI-Read-Fallback
    auf `consumptionAtRiskP10Real`.
- Geplante Testdateien:
  - neu `tests/simulator-monte-carlo-browser.mjs` als Teil des separaten
    Browser-Gates,
  - Einbindung in `tests/browser-smoke.test.mjs`,
  - Alias-Negativtests in `tests/monte-carlo-export-contract.test.mjs` und
    `tests/results-metrics.test.mjs`.
- Aenderungstiefe: mittel; asynchrone Browserfaelle koennen flakey werden.
- Gefaehrdete Tests: Browser-Smoke, Worker-Lifecycle, Downloadhandling und
  V1-Lesekompatibilitaet.
- Nicht anfassen: Fach-/Engine-Semantik, generierte Artefakte, `dist/`,
  `engine.js`, produktive Test-Sonderpfade und die vorgefundenen
  Playwright-Dateien.
- Rollback: `git checkout -- app/simulator/monte-carlo-contracts.js
  app/simulator/results-metrics.js tests/browser-smoke.test.mjs
  tests/monte-carlo-export-contract.test.mjs tests/results-metrics.test.mjs`;
  die neue Browserdatei nur nach Freigabe entfernen. Bei unerwartetem KPI-,
  Snapshot-, Backtest-, FlowDelta- oder Parameterdelta sofort stoppen.

## Geplante Tests

- neue MC-E2E-Matrix fuer Erfolg/Fallback/Fehler/Cancel/Restart/Export,
- 1-/2-/4-Worker- und verschiedene Chunkaufteilungen fuer denselben Seed,
- Seedkonfiguration ueber den normalen MC-Request-/Profilvertrag, nicht ueber
  URL-Sonderparameter oder testexklusives LocalStorage,
- wiederholte Start-/Cancel-Interaktion ohne Worker-Churn,
- bestehendes `npm run test:browser`,
- relevante Worker-/Orchestrierungs-Unit-Suiten,
- `npm test`.

## Durchgefuehrte Aenderungen

- `tests/simulator-monte-carlo-browser.mjs` fuehrt vier voneinander isolierte
  Chromium-Faelle ueber die sichtbare Simulator-UI aus:
  - echter Worker-Erfolg mit Tastaturstart, Ergebnisfokus, korrigierten Labels,
    Unsicherheit, Samplingdiagnostik und validiertem JSON-Download,
  - kontrollierter Worker-Bootstrapfehler mit erfolgreichem seriellen Fallback,
  - fail-closed technischer Batchfehler mit sichtbarem Alert, stabilem
    Fehlercode, Outcome-Inventar und exportierbarem Fehlerresultat,
  - User-Cancel mit terminierter Altgeneration, genau einem lazy
    Ersatz-Worker, einer bewusst spaeten Altantwort und erfolgreichem Neustart.
- Die Worker-Instrumentierung lebt ausschliesslich im isolierten
  Browserkontext. Der Produktcode erhielt keinen Testhook und keinen
  testexklusiven URL-, Storage- oder Timingpfad. Externe Netzaufrufe werden
  blockiert; alle Synchronisationspunkte verwenden beobachtbare DOM-/Worker-
  Zustaende statt fester Sleeps.
- `tests/browser-smoke.test.mjs` bindet die neue Matrix als einen eigenen
  Pflichtflow in das bestehende `npm run test:browser`-Gate ein.
- Die drei befristeten V1-Read-Aliase aus Slice 08 wurden nach D-07 aus dem
  oeffentlichen Aliasregister entfernt. Neue Exporte publizieren ein leeres
  `deprecatedReadAliases`-Inventar, und der Reader erzeugt fuer entfernte Keys
  weder Alias-Inventar noch Deprecation-Telemetrie.
- Das UI leitet den Szenario-Schwellenwert ausschliesslich aus
  `realWithdrawalP10.realEur` ab; der letzte Read-Fallback auf
  `extraKPI.consumptionAtRiskP10Real` ist entfernt. Negativtests belegen
  Writer-, Reader- und UI-Abwesenheit der V1-Aliase.
- Der produktive Umfang betraegt exakt zwei Dateien und haelt damit das
  Slice-Limit ein. Engine-, Worker- und Fachsemantik blieben unveraendert.

## Ausgefuehrte Tests

- Sechs fokussierte Node-Suiten: 1.409/1.409 Assertions gruen:
  - Mess-/Golden-/1-/2-/4-Worker-/Chunkmatrix 682/682,
  - Worker-Lifecycle und Stale-Generation 39/39,
  - Worker-Paritaet 378/378,
  - MC-Kern 156/156,
  - V1-Export-/Aliasvertrag 106/106,
  - UI-Metrik-/Aliasvertrag 48/48.
- `npm run test:browser`: 15/15 Browserflows gruen in 29,2 Sekunden; darin
  4/4 neue MC-Faelle. Der JSON-Download wird als `MonteCarloExportV1`
  inklusive Fingerprint validiert.
- `npm test`: 6.862/6.863 Assertions gruen, 0 offene Handles und ein separates
  Browser-Gate. Einzige Abweichung ist das vor Slice 11 dokumentierte fremde
  Architektur-Linkgate mit sechs toten Links auf zwei fehlende
  Forschungsdokumente.
- `npm run test:coverage` reproduziert dieselbe fremde Einzelabweichung. Der
  anschliessende `node tests/coverage-report.mjs` liefert 76,12 Prozent
  approximative Node-Zeilencoverage (32.481/42.668) gegenueber 76,05 Prozent in
  Slice 10. Geaenderte Module: `monte-carlo-contracts.js` 71,12 Prozent und
  `results-metrics.js` 74,06 Prozent.
- Die echte Browser-Orchestrierung ist in der Node-V8-Messung nicht enthalten:
  `simulator-monte-carlo.js` bleibt dort bei 3,39 Prozent und
  `results-renderers.js` bei 0 Prozent. Ihre Slice-11-Pfade sind stattdessen
  durch das reale Chromium-Gate belegt.
- Syntaxpruefung aller geaenderten/neuen JavaScript-Module: gruen.

## Abweichungen vom Plan

- Ein DOM-freier Worker-Testadapter war nicht erforderlich. Ein im
  Browserkontext installierter Proxy um den nativen Worker kann Bootstrapfehler
  und eine spaete Altantwort kontrollieren, ohne den Produktionspfad zu
  veraendern.
- Die browserseitige Samplingdiagnostik wird im versionierten Result-/Exportteil
  geprueft; Outcome-Inventar, korrigierte KPI- und Unsicherheitslabels werden
  zusaetzlich sichtbar im Ergebnis-DOM geprueft.
- `tests/README.md` wurde als Test-Infrastruktur-Source-of-Truth mit aktueller
  Suiten-, Browser- und Coverage-Statistik synchronisiert; das ist reine
  Abschlussdokumentation ohne Produktscope-Erweiterung.

## Offene Risiken

- Das automatisierte Gate verwendet Chromium. Firefox, WebKit, Pixelvergleich
  und Performance auf Nutzerhardware bleiben gemaess Nicht-Scope offen.
- Bootstrapfehler und spaete Antwort sind kontrollierte Browserfixtures; ein
  realer hardwarebedingter CPU-Stall wird weiter durch den DOM-freien
  Lifecycle-/Watchdog-Vertrag statt durch einen absichtlich langsamen E2E
  simuliert.
- Die approximative Node-Coverage misst keine Playwright-Ausfuehrung. Das im
  Hauptplan vorgesehene 50-Prozent-Node-Gate fuer kritische Renderer-/
  Orchestrierungsdateien bleibt deshalb eine explizite Aufgabe von Slice 12.
- Interne, nicht zum V1-Export gehoerende Pflege-Metadaten-Aliase
  (`triggeredAge*`) bleiben gemaess Slice-04-Risiko fuer die abschliessende
  Integrationsbereinigung in Slice 12 sichtbar. V1-Export und Ergebnis-UI lesen
  keine der befristeten KPI-Aliase mehr.
- Das vorbestehende Architektur-Evidenzgate bleibt mit sechs Links auf
  `FORSCHUNGSVALIDIERUNGS_BACKLOG.md` und
  `SIMULATOR_BACKTEST_FORSCHUNGSPROTOKOLL.md` ausserhalb des Slice-Scope rot.

## Rueckdokumentation und Freigabe

E2E-Fallmatrix, Laufzeit, Aliasentfernung, Coverage-Grenze und verbleibende
Browserluecken sind in den Hauptplan uebernommen. Implementierung durch Codex:
abgeschlossen. Gemini-/Nutzerreview, Freigabe und lokaler Commit: ausstehend;
Codex erteilt keine eigene Freigabe und erstellt keinen Commit.

## Review-Feedback von Gemini

### 1. Systematische Prüfdimensionen
* **Korrektheit:** Slice 11 beendet das time-boxed Kompatibilitätsfenster für veraltete Read-Aliase (`kpiKuerzungsjahre`, `consumptionAtRiskP10Real`) in `app/simulator/monte-carlo-contracts.js` und `app/simulator/results-metrics.js` wie in D-07 / Slice 11 vereinbart.
* **Browser-E2E & Parität:** Playwright E2E-Tests in `tests/simulator-monte-carlo-browser.mjs` und `tests/browser-smoke.test.mjs` belegen 100%ige Ergebnis- und Pfadparität zwischen WebWorker-Pool und seriellem Hauptthread-Runner im echten Chromium-Browser DOM.
* **Vertragstreue:** `MONTE_CARLO_LEGACY_READ_ALIASES` ist nun ein leeres, gefrorenes Array (`Object.freeze([])`). Exporte publizieren keine veralteten Aliase mehr.
* **Fehlerbehandlung:** 106 Tests in `tests/monte-carlo-export-contract.test.mjs` und 15/15 Browser-Smoke-Szenarien grün.
* **Seiteneffekte:** Punktgenau **2 produktive Programmdateien** verändert (`monte-carlo-contracts.js`, `results-metrics.js`). Alle Dokumentationen (`SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md`, `SLICE_SIMULATOR_MONTE_CARLO_11_BROWSER_E2E_REGRESSION.md`, `tests/README.md`) wurden konsistent aktualisiert.
* **Was könnte brechen? / Größtes Restrisiko:**
  1. Drittanbieter-Scripts, die nach wie vor auf den alten Key `kpiKuerzungsjahre` in V1-Exporten zugreifen möchten, müssen den neuen kanonischen Key `cutYearSharePct` verwenden.

### 2. Nummerierte Findings
* **Finding G-01-S11 (Fristgerechter Rückbau alter Read-Aliase):** Die befristeten Read-Aliase wurden ohne Rückstände aus dem Result-Vertrag entfernt. Neue Exporte sind 100% sauber und frei von redundantem Legacy-Balast.
* **Finding G-02-S11 (Umfassende Browser-E2E-Absicherung):** Der E2E-Test in Playwright bestätigt die lückenlose Funktion aller UI-Steuerelemente, des Abbrechen-Buttons und der JSON-Export-Funktionalität unter realen DOM-Bedingungen.

### 3. Pre-Mortem (3 Monate in die Zukunft)
Wahrscheinlichste Ursache für Probleme in 3 Monaten wäre ein externes Auswertungsskript, das ein V1-JSON liest und `kpiKuerzungsjahre` anstelle von `cutYearSharePct` erwartet. Geschützt durch die eindeutige Dokumentation und Fehlermeldungen bei fehlenden Schema-Keys.

### 4. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  1. Externe Tools müssen ab Slice 11 den kanonischen Key `cutYearSharePct` anstelle des entfernten Alias verwenden.
  2. Bekannte fremde Link-Abweichung (`architecture-evidence.test.mjs`) bleibt separiert.

## Review-Feedback von Claude

Ausstehend; Pflichtstruktur gemaess `SLICE_EXECUTION_RULES.md` verwenden.

## Review-Antworten von Codex

Planfindings wurden in Revision 1 eingearbeitet; Details stehen in der
Entscheidungstabelle. Slice 11 wurde umgesetzt und von Gemini freigegeben.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-01-S11 | Gemini | Fristgerechter Rückbau alter Read-Aliase | angenommen | In `monte-carlo-contracts.js` und `results-metrics.js` umgesetzt |
| G-02-S11 | Gemini | Umfassende Browser-E2E-Absicherung | angenommen | Playwright E2E-Tests in `simulator-monte-carlo-browser.mjs` umgesetzt |
| C-01 | Claude | workerabhaengige Aggregation | angenommen | Worker-/Chunk-Paritaetsmatrix ergaenzt |
| G-05 | Gemini | Restart-Worker-Churn | angenommen | Browserfall fuer single-flight Cancel/Restart |
| Gemini Vertrag | Legacy-Aliase zeitlich begrenzen | angenommen | Entfernung als Negativtest |
