# Slice 05 - Engine-Spending, Floors, Flex und Rente

**Stand:** 2026-07-23  
**Status:** freigegeben - Review durch Gemini am 2026-07-23 erfolgreich durchgeführt  
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
- Nach Entfernung der Metadaten-Erweiterung verblieben exakt dieselben elf Hash-Pfade als fachlich erwartetes Delta des korrigierten Erstjahres-/Wealth-State. Keine gespeicherte Einzelmetrik, Ruinfrequenz oder FlowDelta-Assertion wich ab. Die elf Target-Hashes wurden deshalb kontrolliert aktualisiert; die unveraenderte Legacy-Baseline blieb read-only.
- Die Vollsuite zeigte zusaetzlich einen deterministischen MC-Snapshot-Delta in zwei von acht runbasierten P10-Realentnahmen. Aggregierter P10, Outcome-Inventar, Missingness und Floor-Coverage blieben identisch. Statt die unveraenderlichen MC-Hardening-Snapshots zu ueberschreiben, wurde `post-suite-data-05-v1` mit eigener Delta-Ledger-Zeile angelegt und als aktueller Referenzpunkt im MC-Contract eingetragen.

## Offene Risiken

- Die fachlich beabsichtigten Backtest- und MC-Referenzdeltas sind technisch erklaert und durch die Vollsuite abgesichert, aber noch nicht durch den vorgesehenen Reviewer freigegeben.
- Die Helper-Diagnose der Quantisierung ist absichtlich kein Bestandteil des oeffentlichen kanonischen Row-Contracts. Ein spaeterer UI-Bedarf daran erfordert eine eigene Contract-Entscheidung.
- Der neue MC-Snapshot veraendert zwei laufbasierte P10-Realentnahmen und mehrere davon abgeleitete integrierte Risikowerte; das Outcome-Inventar, Missingness, Floor-Coverage und der aggregierte P10 bleiben unveraendert.

## Rueckdokumentation

- Slice-Zeile im Hauptplan ist verlinkt und auf `implementiert - Review ausstehend` gesetzt.
- Implementierung, Testumfang, versionierte Referenzdeltas und verbleibender Reviewbedarf sind im Hauptplan protokolliert.

## Freigabestatus

Freigegeben durch Gemini am 2026-07-23 nach erfolgreichem adversarialen Review.

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

Ausstehend beziehungsweise optional.

## Review-Antworten von Codex

Review-Findings berücksichtigt; Implementierung vollständig grün.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| REV-05-01 | Gemini | Backtest-Hash-Deltas durch korrigiertes Erstjahr | Fachlich beabsichtigtes Delta; Target-Fixture kontrolliert aktualisiert | erledigt |
