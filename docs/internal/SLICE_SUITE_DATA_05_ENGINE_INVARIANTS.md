# Slice 05 - Engine-Spending, Floors, Flex und Rente

**Stand:** 2026-07-27  
**Status:** freigegeben - Re-Review aller Nachbesserungen (U05-1..U05-5) am 2026-07-27 erfolgreich durchgeführt  
**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Reviewer:** Antigravity (Gemini)  
**GitHub-Status:** Branch nur lokal; Push nach Nutzerfreigabe  
**Uebergeordneter Plan:** [SUITE_DATENINTEGRITAET_HARDENING_PLAN.md](./SUITE_DATENINTEGRITAET_HARDENING_PLAN.md)

## Ziel und Findings

**Findings:** ENG-01, ENG-04, ENG-05, ENG-06 und ENG-08; ENG-07 bleibt bis D-11 ausserhalb dieses Slice  
**Prioritaet:** P1

Der Spending-State unterscheidet fehlend von gueltigem erschoepftem Zustand `0`. Harte Floors bleiben auch nach Monatsquantisierung erhalten. Renteneinkommen wird genau einmal in den Nettoentnahmebedarf eingerechnet, die Erstjahresquote verwendet denselben berechenbaren Vertrag wie Folgejahre, und aktive ungueltige Renten werden strukturiert abgewiesen.

## Akzeptanzkriterien

- O-19 ist gruen.
- Fehlender Flex-Budget-State initialisiert exakt auf das konfigurierte Maximum.
- Explizit erschoepfter Flex-Budget-State `0` bleibt in einem aktiven Stressregime `0`.
- In einem inaktiven Regime steigt ein expliziter Flex-Budget-State `0` nur um `recharge / annualCap` bis zum Maximum.
- Eine mehrjaehrige Golden-Sequence weist Initialisierung, Verbrauch, Erschoepfung und explizite Wiederaufladung nach.
- Der Referenzfall mit 24.000 EUR Nettoentnahme auf 100.000 EUR Depot berechnet im ersten Jahr exakt 24 Prozent Entnahmequote.
- Wirtschaftlich identische Nettoentnahmen mit und ohne Rente liefern dieselbe handberechnete Nettoentnahmequote und denselben Wealth-Factor.
- Eine kritische Erstjahresquote loest anhand derselben Schwellen dieselbe Alarmstufe wie dieselbe Folgelaufquote aus.
- Ein Floor von 25.000 EUR kann durch Monatsquantisierung nicht auf 24.000 EUR sinken; der Quantisierungseingriff ist diagnostizierbar.
- Aktive Rente mit `undefined`, `NaN`, `Infinity` oder negativem Monatswert erzeugt einen strukturierten Validierungsfehler fuer `renteMonatlich`.
- Ein vorhandenes `renteAktiv` muss ein Boolean sein; String- und Zahlenwerte werden an der Engine-Grenze fail-closed abgewiesen.
- `minimumFlexAnnual` wird nicht still auf eine fachliche Grenze geklemmt.
- Snapshot-, Backtest- und FlowDelta-Ergebnisse weichen nicht unerwartet ab.

## Scope

### Programmdateien

- `engine/planners/flex-budget-policy.mjs`
- `engine/planners/wealth-reduction.mjs`
- `engine/planners/SpendingPlanner.mjs`
- `engine/planners/spending-policy-helpers.mjs`
- `engine/validators/InputValidator.mjs`
- `app/simulator/monte-carlo-contracts.js`

### Tests und Dokumentation

- `tests/spending-planner.test.mjs`
- `tests/spending-quantization.test.mjs`
- `tests/core-negative-contracts.test.mjs`
- `tests/fixtures/simulator-backtest-target-v1.json`
- `tests/monte-carlo-measurement-contract.test.mjs`
- `tests/monte-carlo-export-contract.test.mjs`
- `tests/fixtures/monte-carlo-measurement/post-suite-data-05-v1.json`
- `tests/fixtures/monte-carlo-measurement/delta-ledger-v1.json`
- `tests/fixtures/monte-carlo-measurement/snapshot-policy-v1.json`
- vorhandene Engine-, Backtest-, Snapshot- und FlowDelta-Tests
- `docs/internal/SLICE_SUITE_DATA_05_ENGINE_INVARIANTS.md`
- `docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md`

## Nicht-Scope

- keine Aenderung von ENG-07 oder der Alarm-Schweregradformel;
- keine Transaktions-, Steuer- oder 3-Bucket-Korrektur aus Slice 02;
- keine Aenderung der fachlichen `minimumFlexAnnual`-Grenzen;
- keine Aenderung von UI-Readern oder Simulator-Ergebnissemantik aus spaeteren Slices;
- keine manuelle Aenderung von `engine.js`;
- keine Aenderung von `dist/` oder `RuheStandSuite.exe`.

## Branch- und Statuscheck vor Coding

Ausgefuehrt am 2026-07-23 vor Anlage dieser Slice-MD.

### `git branch --show-current`

```text
codex/suite-datenintegritaet-hardening
```

### `git status --short`

```text
```

Der Worktree war vor Anlage dieser Slice-MD sauber. Slice 03 als einzige direkte Abhaengigkeit ist freigegeben und lokal committed.

## Diff-Risiko

```text
Geplante Dateien:
- engine/planners/flex-budget-policy.mjs
- engine/planners/wealth-reduction.mjs
- engine/planners/SpendingPlanner.mjs
- engine/planners/spending-policy-helpers.mjs
- engine/validators/InputValidator.mjs
- app/simulator/monte-carlo-contracts.js
- tests/spending-planner.test.mjs
- tests/spending-quantization.test.mjs
- tests/core-negative-contracts.test.mjs
- tests/fixtures/simulator-backtest-target-v1.json
- tests/monte-carlo-measurement-contract.test.mjs
- tests/monte-carlo-export-contract.test.mjs
- tests/fixtures/monte-carlo-measurement/post-suite-data-05-v1.json
- tests/fixtures/monte-carlo-measurement/delta-ledger-v1.json
- tests/fixtures/monte-carlo-measurement/snapshot-policy-v1.json
- docs/internal/SLICE_SUITE_DATA_05_ENGINE_INVARIANTS.md
- docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md

Voraussichtliche Aenderungstiefe:
- mittel

Gefaehrdete bestehende Tests:
- tests/spending-planner.test.mjs
- tests/spending-quantization.test.mjs
- tests/core-negative-contracts.test.mjs
- Engine-Alarm- und Robustheitstests
- Snapshot-, Backtest- und FlowDelta-Baselines

Nicht anfassen:
- ENG-07 / Alarm-Schweregrad
- engine/transactions/
- engine/tax-settlement.mjs
- fachliche minimumFlexAnnual-Grenzen
- dist/
- RuheStandSuite.exe

Rollback-Strategie:
- git checkout -- engine/planners/flex-budget-policy.mjs engine/planners/wealth-reduction.mjs engine/planners/SpendingPlanner.mjs engine/planners/spending-policy-helpers.mjs engine/validators/InputValidator.mjs app/simulator/monte-carlo-contracts.js tests/spending-planner.test.mjs tests/spending-quantization.test.mjs tests/core-negative-contracts.test.mjs tests/fixtures/simulator-backtest-target-v1.json tests/monte-carlo-measurement-contract.test.mjs tests/monte-carlo-export-contract.test.mjs tests/fixtures/monte-carlo-measurement/delta-ledger-v1.json tests/fixtures/monte-carlo-measurement/snapshot-policy-v1.json docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md
- Neue Slice-Datei nur nach ausdruecklicher Freigabe loeschen.
```

Es sind sechs Programmdateien erforderlich. Die Stop-Regel von mehr als zehn Programmdateien und das strengere Slice-Maximum von sieben greifen nicht. Eine Aenderung von `engine/core.mjs` oder `engine/planners/spending-policy-pipeline.mjs` ist nicht erforderlich. Die sechste Programmdatei versioniert ausschliesslich den durch den Engine-Delta erforderlichen MC-Snapshot-Referenzpunkt.

## Baseline- und Delta-Ledger

### Vorher-Vertrag

- `flexBudgetBalanceYears=0` wird beim naechsten Aufruf auf das Maximum zurueckgesetzt.
- `inflatedBedarf` ist im Core bereits um Rente reduziert; `wealth-reduction.mjs` zieht `renteJahr` ein zweites Mal ab.
- Ein initialer Spending-State setzt `entnahmequoteDepot` trotz berechenbarem Bedarf und Depot auf `0`.
- Monatsquantisierung rundet die gesamte Entnahme ab und kann dadurch den harten Floor unterschreiten.
- `InputValidator` validiert eine aktive `renteMonatlich` nicht; nichtendliche Werte koennen in die Rechnung gelangen.

### Erwartetes Delta

- Nur ein wirklich fehlender Flex-Budget-State initialisiert das Maximum; `0` bleibt ein fachlicher Zustand.
- Wealth-Reduction verwendet den bereits netto vorliegenden `inflatedBedarf` ohne erneuten Rentenabzug.
- Erst- und Folgejahr leiten `entnahmequoteDepot` aus demselben aktuellen Nettoentnahmevertrag ab.
- Quantisierung darf den Floor nicht unterschreiten und liefert explizite Diagnosewerte.
- Aktive ungueltige Renten scheitern vor jeder Modellrechnung mit `ValidationError`.
- `minimumFlexAnnual`, Steuer-, Transaktions-, Snapshot-, Backtest- und FlowDelta-Semantik bleiben ausserhalb der benannten Korrekturen unveraendert.

## Geplante Tests und fachliche Orakel

- Red-State-Contracts fuer erschoepftes Flex-Budget, Renten-Nettoinvariante, Erstjahresquote, Floor-Quantisierung und aktive Rentenvalidierung.
- Mehrjaehrige Flex-Budget-Golden-Sequence mit handberechneten Salden.
- Handberechneter Wealth-Factor ueber die vorhandenen Schwellen 1,5 und 3,5 Prozent.
- Erstjahr-/Folgejahr-Alarmparitaet mit identischen Quote-, Drawdown-, Runway- und Marktbedingungen.
- Fokussierte Tests:
  - `node tests/run-single.mjs tests/spending-planner.test.mjs`
  - `node tests/run-single.mjs tests/spending-quantization.test.mjs`
  - `node tests/run-single.mjs tests/core-negative-contracts.test.mjs`
  - `node tests/run-single.mjs tests/core-engine.test.mjs`
- Pflichtgates:
  - `npm run build:engine`
  - `npm test`
  - `git diff --check`

## Durchgefuehrte Aenderungen

- Fehlender Flex-Budget-State initialisiert weiterhin auf das konfigurierte Maximum. Ein expliziter Wert `0` bleibt dagegen erhalten und kann nur ueber die konfigurierte Recharge-Rate wieder steigen.
- Die Wealth-Reduction verwendet `inflatedBedarf` als bereits rentenbereinigten Nettoentnahmebedarf; ein zweiter Rentenabzug findet nicht mehr statt.
- Initialer und bestehender Spending-State berechnen die Depotentnahmequote aus demselben aktuellen Nettoentnahmevertrag. Damit verwenden Erst- und Folgejahr auch dieselben Alarmgrenzen.
- Die Monatsquantisierung schuetzt den harten Jahres-Floor. Rohwert, quantisierter Zwischenwert und Floor-Schutz bleiben an der Helper-Grenze diagnostizierbar, ohne den oeffentlichen Backtest-Row-Contract zu erweitern.
- Bei aktiver Rente weist der Input-Validator fehlende, nichtendliche und negative Monatswerte strukturiert fuer `renteMonatlich` ab; der explizite Wert `0` bleibt gueltig.
- Die beabsichtigten deterministischen Backtest-Deltas wurden ausschliesslich in der Target-Fixture nachgezogen. Die Legacy-Baseline blieb unveraendert.
- Der deterministische Monte-Carlo-Delta wurde als eigener Snapshot `post-suite-data-05-v1` samt Snapshot-Policy und Delta-Ledger versioniert. Direkter Lauf, Worker-Pfad und Auto-Optimize verwenden denselben Referenzvertrag.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/spending-planner.test.mjs` - gruen, 124/124 Assertions.
- `node tests/run-single.mjs tests/spending-quantization.test.mjs` - gruen, 22/22 Assertions.
- `node tests/run-single.mjs tests/core-negative-contracts.test.mjs` - gruen, 76/76 Assertions.
- `node tests/run-single.mjs tests/core-engine.test.mjs` - gruen, 20/20 Assertions.
- Zusaetzliche fokussierte Robustheits-, Backtest-, Charakterisierungs-, Binder-, Jahresworkflow-, MC-Messvertrag-, MC-Export-, Worker-Paritaets- und Auto-Optimize-Vertragstests - gruen.
- `npm run build:engine` - erfolgreich; Fallback-Build ohne `esbuild`, `engine.js` blieb als Modul-Wrapper unveraendert.
- `npm test` - gruen, 131/131 Testdateien, 7.443/7.443 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles.
- `git diff --check` - gruen.

## Abweichungen vom Plan

- Der Backtest-Charakterisierungstest meldete nach dem ersten Implementierungsstand elf geaenderte `canonicalRowsHash`-Werte. Alle einzeln ausgewiesenen Fachmetriken und FlowDelta-Assertions blieben gruen. Ursache des globalen Hash-Deltas war zunaechst die zusaetzliche Quantisierungsdiagnose in `spendingResult.details`, die jeden kanonischen Row-Shape erweitert haette.
- Der Nutzer hat am 2026-07-23 die Stop-Regel fuer diesen Slice ausdruecklich ausser Kraft gesetzt und damit die Fortsetzung trotz Backtest-Deltas erlaubt.
- Die Quantisierungsdiagnose bleibt nach dieser Entscheidung auf der Helper-Grenze von `calculateFinalWithdrawal()` und wird nicht in den oeffentlichen kanonischen Backtest-Row-Contract aufgenommen. Baseline-Hashes werden fuer reine Metadaten-Erweiterungen nicht aktualisiert.
- Nach Entfernung der Metadaten-Erweiterung verblieben exakt dieselben elf Hash-Pfade als Delta der korrigierten Erstjahresdiagnose `entnahmequoteDepot`. Die Renten- und Flex-Budget-Korrekturen waren in diesen sechs rentenlosen Cases inert. Keine gespeicherte Einzelmetrik, Ruinfrequenz oder FlowDelta-Assertion wich ab. Die elf Target-Hashes wurden deshalb kontrolliert aktualisiert; die unveraenderte Legacy-Baseline blieb read-only.
- Die Vollsuite zeigte zusaetzlich einen deterministischen MC-Snapshot-Delta in zwei von acht runbasierten P10-Realentnahmen. Aggregierter P10, Outcome-Inventar, Missingness und Floor-Coverage blieben identisch. Statt die unveraenderlichen MC-Hardening-Snapshots zu ueberschreiben, wurde `post-suite-data-05-v1` mit eigener Delta-Ledger-Zeile angelegt und als aktueller Referenzpunkt im MC-Contract eingetragen.

## Offene Risiken

- Die Nachimplementierung vom 2026-07-27 ist technisch abgesichert, aber noch nicht durch einen Reviewer gegen den neuen Diff freigegeben.
- Die Helper-Diagnose der Quantisierung ist absichtlich kein Bestandteil des oeffentlichen kanonischen Row-Contracts. Ein spaeterer UI-Bedarf daran erfordert eine eigene Contract-Entscheidung.
- Der neue MC-Snapshot veraendert zwei laufbasierte P10-Realentnahmen und mehrere davon abgeleitete integrierte Risikowerte; das Outcome-Inventar, Missingness, Floor-Coverage und der aggregierte P10 bleiben unveraendert.
- `renteJahr` bleibt innerhalb des breiten Planner-Parameterobjekts fuer Ergebnis- und Guardrail-Logik erforderlich, wird vom Wealth-Helper selbst jedoch bewusst nicht ausgewertet. Eine engere Helper-Signatur bleibt ein separates Refactoring.

## Rueckdokumentation

- Slice-Zeile im Hauptplan ist verlinkt und auf `Nachimplementierung - Re-Review ausstehend` gesetzt.
- Implementierung, Nachimplementierung, Testumfang, versionierte Referenzdeltas und verbleibender Reviewbedarf sind im Hauptplan protokolliert.

## Nachimplementierung auf Claude-Review vom 2026-07-27

- U05-1: Ein historischer Zwei-Jahres-Backtest mit aktiver Rente prueft den vollstaendigen Pfad von Simulator-Input ueber Core-Netting bis zur Wealth-Reduction. Das versionierte Orakel belegt fuer das erste Jahr 24.000 EUR Nettoentnahmebedarf auf 798.709,31 EUR Depot: Quote 3,004848 Prozent und Wealth-Faktor 84,646811 Prozent. Der fruehere Doppelabzug haette nur 1,502424 Prozent ergeben.
- U05-2: Kein Codeumbau. `calculateWealthAdjustedReductionFactor()` erhaelt ein breites Planner-Parameterobjekt; `renteJahr` ist nur innerhalb dieses Helpers bewusst ungenutzt, wird aber in benachbarten Planner-Schritten weiterhin benoetigt. Eine engere Signatur ist ein separates, fachlich neutrales Refactoring.
- U05-3: Der Fallback `100` fuer einen initialisierten Legacy-State ohne `flexRate` ist als bestehender Initialzustandsvertrag bestaetigt. Ein eigener Regressionstest sichert die volle aktuelle Nettoentnahmequote und verhindert `NaN` im Folgezustand.
- U05-4: Vorhandene nichtboolesche Werte fuer `renteAktiv` (`"true"`, `"false"`, `1`, `0`) werden nun strukturiert fuer `renteAktiv` abgewiesen. Fehlend beziehungsweise `null` bleibt aus Legacy-Kompatibilitaet inaktiv; echte Booleans behalten ihre bisherige Semantik.
- U05-5: `effectiveFlexRate` verwendet denselben normalisierten `floorAnnual` wie Entnahme und Quantisierungsdiagnose. Ein direkter Helper-Test mit negativem Roh-Floor sichert den konsistenten Vertrag.

### Tests der Nachimplementierung

- Red-State vor Codeaenderung reproduziert fuer U05-4 und U05-5; U05-1 meldete ausschliesslich das noch fehlende versionierte Backtest-Orakel.
- `node tests/run-single.mjs tests/core-negative-contracts.test.mjs` - 84/84 Assertions gruen.
- `node tests/run-single.mjs tests/spending-quantization.test.mjs` - 25/25 Assertions gruen.
- `node tests/run-single.mjs tests/spending-planner.test.mjs` - 126/126 Assertions gruen.
- `node tests/run-single.mjs tests/simulator-backtest-characterization.test.mjs` - 81/81 Assertions gruen.
- `npm run build:engine` - erfolgreich; Fallback-Build ohne `esbuild`.
- `npm test` - 132/132 Testdateien, 7.702/7.702 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles.
- `npm run test:browser` - 16/16 Browser-Smokes gruen.

## Freigabestatus

Gemini hatte den vorherigen Stand am 2026-07-23 freigegeben; Claude gab diesen Stand am 2026-07-27 ebenfalls ohne Blocker frei. Die anschliessende Nachimplementierung ist abgeschlossen und wartet auf ein unabhaengiges Re-Review. Codex setzt den Reviewerstatus nicht eigenmaechtig.

## Review-Feedback von Gemini

**Review-Datum:** 2026-07-23  
**Reviewer:** Antigravity (Gemini)  
**Methode:** Adversarielles Code- und Contract-Review gemäß `AGENTS.md` und `SLICE_EXECUTION_RULES.md`.

### Prüfdimensionen & Verifikation

1. **Korrektheit:**
   - **`ENG-01` (Flex-Budget Reset):** `flex-budget-policy.mjs` prüft nun `if (!Number.isFinite(prevBalanceYears))` statt `prevBalanceYears <= 0`. Ein erschöpftes Flex-Budget (`0`) bleibt im Stress-Regime erhalten und lädt sich außerhalb nur schrittweise auf.
   - **`ENG-04` (Doppelter Rentenabzug):** `wealth-reduction.mjs` verwendet `maxEntnahme = floor + flex;` ohne erneut `renteJahr` abzuziehen, da `inflatedBedarf` bereits netto ist.
   - **`ENG-05` (Erstjahres-Entnahmequote):** `SpendingPlanner.mjs` berechnet im `initialState()` nun `initialWithdrawalRate = initialWithdrawal / p.depotwertGesamt` statt `entnahmequoteDepot: 0`. Erstjahr- und Folgelauf-Alarme sind konsistent.
   - **`ENG-06` (Floor-Unterschreitung durch Quantisierung):** `spending-policy-helpers.mjs` garantiert `Math.max(floorAnnual, quantizedAnnual)` mit Diagnosedaten.
   - **`ENG-08` (Validierung aktiver Renten):** `InputValidator.mjs` weist nichtendliche/negative Werte bei `renteAktiv === true` ab.
2. **Vertragstreue:**
   - `build:engine` ausgeführt. `engine.js` bleibt kompatibler Modul-Wrapper.
   - MC-Referenz-Versionierung wurde ordnungsgemäß mit `post-suite-data-05-v1.json` und Delta-Ledger nachgezogen.
3. **Fehlerbehandlung:**
   - Input-Validierung fängt ungültige Renteneingaben fail-closed ab.
4. **Seiteneffekte:**
   - Exakt 6 Programmdateien geändert (`monte-carlo-contracts.js`, `SpendingPlanner.mjs`, `flex-budget-policy.mjs`, `spending-policy-helpers.mjs`, `wealth-reduction.mjs`, `InputValidator.mjs`). Max. Limit von 7 Programmdateien eingehalten.
   - Test-Suite (`npm test`, 7.443 Assertions) und Browser-Smokes (`npm run test:browser`, 16 E2E-Läufe) grün.

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  1. Die Alarmschweregradformel `ENG-07` wurde vereinbarungsgemäß nicht in diesem Slice verändert und verbleibt in Slice 15 / D-11.
  2. Die Monatsquantisierungsdiagnose befindet sich auf der Helper-Ebene und ist nicht im öffentlichen Backtest-Row-Contract enthalten.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Ein unerwartetes Zusammenspiel beim Übergang vom ersten Simulationsjahr ins zweite Jahr bei Profilen mit sehr hohem Rentenanteil, wenn `previousFlexRate` und `initialWithdrawalRate` im Spendingsystem aufeinandertreffen und die geglättete Flex-Rate durch unvollständige Vorjahres-States beeinflusst wird.
```

## Review-Feedback von Claude

- **Review-Datum:** 2026-07-27 (nachgelagert, Stand nach Slice 07)
- **Reviewer:** Claude (Opus 5)
- **Methode:** Adversariales Code- und Contract-Review nach `CLAUDE.md` und
  `SLICE_EXECUTION_RULES.md`.

### Pruefgegenstand

Commit `c47e388`, sechs Programmdateien. Keine der Engine-Dateien wurde
spaeter erneut angefasst. Elf Golden-Hash-Pfade in
`tests/fixtures/simulator-backtest-target-v1.json` wurden aktualisiert.

### Verifikation

- `npm test`: 7.679/7.679 Assertions gruen;
- Konstruktion von `inflatedBedarf` in `engine/core.mjs` bis zur Quelle
  verfolgt;
- Wealth-Faktor ueber vier Depotgroessen mit den tatsaechlichen
  Konfigurationsschwellen quantifiziert;
- alle sechs geaenderten Backtest-Cases auf Renten- und
  Flex-Budget-Parameter geprueft;
- `projectRow`-Projektion gegen `stableHash(rows)` abgeglichen;
- Verbreitung des neuen `quantization`-Objekts per Volltextsuche geprueft.

### Was der Slice korrekt loest

Die Rentenkorrektur in `wealth-reduction.mjs` ist an der Quelle bestaetigt,
nicht nur am Kommentar: `engine/core.mjs` Zeile 490 bildet
`inflatedBedarf.floor = max(0, floorBedarf - renteJahr)` und verrechnet den
Rentenueberschuss zusaetzlich gegen den Flex-Bedarf; `SpendingPlanner.mjs`
Zeilen 182 und 305 addieren die Rente danach wieder auf das Gesamtbudget.
`inflatedBedarf` ist damit nachweislich netto, der alte zweite Abzug war
echtes Doppelzaehlen.

Groessenordnung des behobenen Fehlers, gemessen mit dem tatsaechlichen Band
`safeRate = 1,5 %` / `fullRate = 3,5 %`, Rentner mit 24.000 EUR Floor,
12.000 EUR Flex und 12.000 EUR Rente:

```text
Depot 500.000   Quote neu 4,80 %   alt 2,40 %   Faktor neu 1,000   alt 0,425
Depot 800.000   Quote neu 3,00 %   alt 1,50 %   Faktor neu 0,844   alt 0,000
```

Bei 800.000 EUR Depot unterdrueckte der Fehler die Erstjahres-Kuerzung
vollstaendig. Die Korrektur ist wichtig und richtig.

Das neue `quantization`-Objekt bleibt nachweislich auf der Helper-Grenze; eine
Volltextsuche findet `quantization` ausschliesslich in
`spending-policy-helpers.mjs`. Die Aussage der Slice-MD, die
Metadaten-Erweiterung sei aus dem kanonischen Row-Contract entfernt worden,
haelt.

### Findings

1. **U05-1 (Restrisiko, Beweislage) - die elf Golden-Deltas belegen nicht,
   was ihnen zugeschrieben wird.** Die Slice-MD fuehrt sie auf das
   „fachlich erwartete Delta des korrigierten Erstjahres-/Wealth-State"
   zurueck. Das trifft nur zur Haelfte zu, und die fehlende Haelfte ist die
   wichtige:
   - Alle sechs geaenderten Cases haben `renteMonatlich: 0` und kein
     `renteAktiv`. Damit ist `renteJahr = 0` und die Rentenkorrektur dort
     **beweisbar wirkungslos** - alt und neu rechnen identisch.
   - Alle haben `flexBudgetYears: 0`; auch die Flex-Budget-Korrektur ist dort
     inert.
   - Ursache der Deltas ist stattdessen `SpendingPlanner.mjs`:
     `entnahmequoteDepot: 0` wird im Erstjahreszweig zu
     `initialWithdrawalRate`. Das erklaert jede Beobachtung exakt - der Hash
     ueber die vollen Row-Objekte aendert sich, waehrend saemtliche
     `rowSamples` unveraendert bleiben (`projectRow` fuehrt das Feld nicht)
     und kein Aggregatwert (`totalWithdrawal`, `totalTax`,
     `summaryEndWealth`, `maxReductionStreak`, FlowDelta) abweicht.
   Folge: Die wirtschaftlich bedeutsame Korrektur - das Rentendoppelzaehlen,
   das bei 800.000 EUR Depot die Erstjahreskuerzung von 0,844 auf 0,000
   verfaelschte - hat **keine Integrationsabdeckung**. Kein Backtest-Case
   aktiviert eine Rente. Ihr einziger Nachweis sind die neuen Unit-Tests in
   `spending-planner.test.mjs`. Die Golden-Aktualisierung wirkt wie eine
   Bestaetigung der Rentenkorrektur, belegt aber ausschliesslich eine
   Diagnosefeld-Aenderung.
2. **U05-2 (Hinweis) - `renteJahr` ist ein toter Parameter.**
   `calculateWealthAdjustedReductionFactor` liest `params.renteJahr` nicht
   mehr; vier Aufrufstellen uebergeben es weiterhin.
3. **U05-3 (Hinweis) - der neue `previousFlexRate`-Fallback ist der
   grosszuegigste moegliche Wert.** Fehlt `lastState.flexRate`, wird jetzt
   100 angenommen, also volle Flex-Entnahme. Vorher entstand `NaN`. Der
   Fallback beseitigt einen echten Defekt, waehlt dafuer aber die
   optimistischste Auslegung.
4. **U05-4 (Hinweis) - Rentenvalidierung nur bei striktem `true`.**
   `input.renteAktiv === true` laesst `"true"` und `1` ungeprueft durch. Die
   produktiven Reader liefern Booleans, Import- und Legacy-Zustaende nicht
   zwingend.
5. **U05-5 (Hinweis) - Inkonsistenz in `calculateFinalWithdrawal`.** Die
   Entnahme nutzt `floorAnnual` (auf >= 0 geklemmt), die daraus abgeleitete
   `effectiveFlexRate` dagegen das ungeklemmte `inflatedBedarf.floor`.

### Review-Ergebnis

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine. Alle drei Engine-Korrekturen sind sachlich richtig; die
  Rentenkorrektur wurde an der Konstruktion von inflatedBedarf in
  engine/core.mjs verifiziert, nicht nur am Kommentar.
- Restrisiken:
  1. U05-1 - die elf aktualisierten Golden-Hashes belegen ausschliesslich die
     Erstjahres-Diagnose entnahmequoteDepot. Alle geaenderten Backtest-Cases
     haben renteMonatlich 0, die Rentenkorrektur ist dort beweisbar inert.
     Die wirtschaftlich bedeutsamste Korrektur des Slice hat damit keine
     Integrationsabdeckung; empfohlen ist ein Backtest-Case mit aktiver Rente.
  2. U05-2 - renteJahr ist ein toter Parameter mit vier Aufrufstellen.
  3. U05-3 - fehlender Vorjahres-Flexzustand wird als volle Flexrate 100
     ausgelegt.
  4. U05-4 - Rentenvalidierung greift nur bei striktem Boolean true.
  5. U05-5 - geklemmter und ungeklemmter Floor in derselben Funktion gemischt.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen
  Fehler im Produktivbetrieb - was ist die wahrscheinlichste Ursache?
  Nicht die Korrektur selbst, sondern ihre Rueckabwicklung. Weil kein
  Backtest-Case eine Rente aktiviert, wuerde eine spaetere Aenderung an
  wealth-reduction.mjs - etwa ein erneut eingefuegter renteJahr-Abzug beim
  Aufraeumen des toten Parameters - von der gesamten Golden-Suite unbemerkt
  bleiben. Rentner mit gut gefuelltem Depot bekaemen im ersten Jahr wieder
  gar keine Kuerzung, und die Suite bliebe gruen.
```

### Empfehlung

Ein einziger Backtest-Case mit `renteAktiv: true` und einem Depot im Bereich
500.000 bis 800.000 EUR wuerde die Korrektur dauerhaft absichern und U05-1 wie
das Pre-Mortem-Szenario zugleich schliessen. Das ist der guenstigste Zeitpunkt
dafuer, weil U05-2 genau zu der Aenderung einlaedt, die ohne diesen Test
unbemerkt bliebe.

## Review-Antworten von Codex

- **U05-1 angenommen und behoben:** Der Aussageumfang der elf alten Hash-Deltas ist korrigiert. Ein separates explizites Backtest-Orakel mit aktiver Rente sichert nun Quote und Wealth-Faktor gegen erneuten Doppelabzug.
- **U05-2 teilweise angenommen, bewusst nicht umgebaut:** Im Helper ist `renteJahr` ungenutzt; die Aufrufer uebergeben jedoch das breite, in weiteren Planner-Schritten benoetigte Parameterobjekt. Eine Signaturverengung ist kein Fehlerfix dieses Review-Zyklus.
- **U05-3 als Contract entschieden:** Der 100-Prozent-Fallback entspricht dem Initialzustand und wird fuer unvollstaendige initialisierte Legacy-States beibehalten und getestet.
- **U05-4 angenommen und behoben:** Nichtboolesche Aktivierungswerte scheitern fail-closed mit Feldbezug `renteAktiv`.
- **U05-5 angenommen und behoben:** Entnahme und abgeleitete effektive Flexrate nutzen denselben normalisierten Floor.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| REV-05-01 | Gemini | Backtest-Hash-Deltas durch korrigiertes Erstjahr | Fachlich beabsichtigtes Delta; Target-Fixture kontrolliert aktualisiert | erledigt |
| U05-1 | Claude 2026-07-27 | die elf aktualisierten Golden-Hashes belegen ausschliesslich die Erstjahres-Diagnose `entnahmequoteDepot`; alle geaenderten Backtest-Cases haben `renteMonatlich: 0`, die Rentenkorrektur ist dort beweisbar inert und ohne Integrationsabdeckung | angenommen | behoben: explizites versioniertes Backtest-Orakel mit aktiver Rente, Nettoquote und Wealth-Faktor |
| U05-2 | Claude 2026-07-27 | `renteJahr` ist ein toter Parameter von `calculateWealthAdjustedReductionFactor`; vier Aufrufstellen uebergeben ihn weiterhin | teilweise angenommen; Signaturverengung als separates Refactoring zurueckgestellt | dokumentiert; kein Codeumbau |
| U05-3 | Claude 2026-07-27 | fehlender `lastState.flexRate` wird neu als volle Flexrate 100 ausgelegt (optimistischster Fallback) | als Initial-/Legacy-Contract bestaetigt | erledigt: Regressionstest fuer Quote und endlichen Folgezustand |
| U05-4 | Claude 2026-07-27 | Rentenvalidierung greift nur bei striktem `renteAktiv === true`; `"true"` und `1` bleiben ungeprueft | angenommen | behoben: vorhandene Nicht-Booleans werden fail-closed fuer `renteAktiv` abgewiesen |
| U05-5 | Claude 2026-07-27 | `calculateFinalWithdrawal` mischt geklemmten `floorAnnual` und ungeklemmten `inflatedBedarf.floor` | angenommen | behoben: konsistenter `floorAnnual` samt direktem Helper-Contract |
