# Slice 02 - Transaktionsbudgets, 3-Bucket Final Action und Steuer

**Stand:** 2026-07-23  
**Status:** freigegeben - Review durch Gemini am 2026-07-23 erfolgreich durchgeführt  
**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Reviewer:** Antigravity (Gemini)  
**GitHub-Status:** Branch nur lokal; Remote-Verifikation am 2026-07-23 ergab keinen Branch; Push nur nach Nutzerfreigabe  
**Uebergeordneter Plan:** [SUITE_DATENINTEGRITAET_HARDENING_PLAN.md](./SUITE_DATENINTEGRITAET_HARDENING_PLAN.md)

## Ziel und Findings

**Findings:** BAL-02, BAL-03, BAL-04, BAL-05, ENG-02, ENG-03 und ENG-09  
**Prioritaet:** P0

Die 3-Bucket-Strategie erzeugt genau eine bestandsmoegliche finale Aktion. Diese Aktion wird erst nach vollstaendiger Quellenplanung steuerlich settled; UI, Diagnose und Candidate-State verwenden danach denselben finalen Quellen-, Steuer-, Netto- und Verlustvortragsvertrag. Im Profilverbund wird die Haushaltsaktion vor der Attribution finalisiert und anschliessend genau einmal je Quellenprofil mit dessen eigenem Steuer-State settled.

## Akzeptanzkriterien

- O-03, O-04, O-08 und O-09 sind fuer die Transaktionsgrenzen gruen.
- Eine reale Aktienrendite von `-0.30` bei Trigger `-0.15` ist ein schlechtes Jahr; die Einheit ist Ratio, nicht Prozentpunkt.
- Kein Lot und kein aggregiertes Portfolio verkauft mehr als seinen Ausgangsbestand.
- Eine bereits mit 80.000 EUR belegte 100.000-EUR-Tranche stellt fuer eine nachgelagerte Quelle maximal 20.000 EUR bereit.
- Ein explizites Equity-Gesamtbudget von 0 sowie `maxSkimPctOfEq=0` bleiben harte Nullgrenzen.
- Mehrere Goldlots verbrauchen einen gemeinsamen Gold-Headroom nur einmal.
- Der Bond-Refill verwendet den von der Engine tatsaechlich entschiedenen Jahres-Nettoentnahmebedarf nach Rente, Floor, Flex und Dynamic Flex.
- Quellen werden vor genau einem finalen Steuer-Settlement festgelegt; nach dem Settlement darf kein Modul eine steuerrelevante Quelle veraendern.
- Bruttoverkauf, Steuer-Rohaggregate, finale Steuer, Nettoerloes, Verwendungen und Verlustvortrag reconciliieren innerhalb 0,01 EUR.
- O-04 wird gegen die unabhaengige Handrechnung 1.314,14 EUR Steuer und Verlustvortrag 0 geprueft.
- Produktionsresultate verwenden kein erfundenes `newState.marketData`-Feld.
- Ein wirtschaftlich identischer Einprofilhaushalt und Profilverbund liefern dieselbe finale Action-Semantik.
- Kapazitaets-, Provenienz- und Reconciliationfehler werden fail-closed ausgegeben.

## Scope

### Programmdateien

- `engine/core.mjs`
- `engine/transactions/three-bucket-logic.mjs`
- `engine/transactions/sale-engine.mjs`
- `engine/transactions/transaction-opportunistic.mjs`
- `engine/transactions/transaction-surplus.mjs`
- `app/balance/balance-main.js`
- `app/balance/balance-action-postprocessor.js`
- `app/balance/balance-main-profilverbund.js`
- `app/profile/profilverbund-action-attribution.js`
- `app/simulator/monte-carlo-contracts.js`

### Tests und Dokumentation

- `tests/suite-data-three-bucket-final-action.test.mjs`
- `tests/3bucket-config.test.mjs`
- `tests/3bucket-refill.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/balance-decumulation.test.mjs`
- `tests/profilverbund-balance.test.mjs`
- `tests/transaction-tax.test.mjs`
- `tests/transaction-gold-liquidity.test.mjs`
- `tests/transaction-engine-rebal.test.mjs`
- `tests/transaction-quantization.test.mjs`
- `tests/simulator-3bucket-ui-e2e.test.mjs`
- `tests/monte-carlo-measurement-contract.test.mjs`
- `tests/monte-carlo-export-contract.test.mjs`
- `tests/fixtures/monte-carlo-measurement/post-suite-data-02-v1.json`
- `tests/fixtures/monte-carlo-measurement/delta-ledger-v1.json`
- `engine/README.md`
- `docs/reference/TECHNICAL.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `tests/README.md`
- `docs/internal/SLICE_SUITE_DATA_02_THREE_BUCKET_FINAL_ACTION.md`
- `docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md`
- `docs/internal/README.md`

## Nicht-Scope

- keine neue Assetklasse oder Steuerformel;
- keine Aenderung des kanonischen Tranchencontracts;
- keine Aenderung der Simulator-Portfolio-, Backtest-, Monte-Carlo-, Sweep- oder Optimizer-Semantik;
- kein Simulator-UI-Redesign;
- keine Aenderung der 3-Bucket-Strategie ausserhalb der belegten Signal-, Bestands-, Bedarfs- und Settlementvertraege;
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

Der Worktree war vor Anlage dieser Slice-MD sauber. Die direkten Abhaengigkeiten Slice 01, Slice 03, Slice 05 und Fachentscheidung D-03 sind freigegeben und als lokale Commits vorhanden.

## Diff-Risiko

```text
Geplante Dateien:
- engine/core.mjs
- engine/transactions/three-bucket-logic.mjs
- engine/transactions/sale-engine.mjs
- engine/transactions/transaction-opportunistic.mjs
- engine/transactions/transaction-surplus.mjs
- app/balance/balance-main.js
- app/balance/balance-action-postprocessor.js
- app/balance/balance-main-profilverbund.js
- app/profile/profilverbund-action-attribution.js
- app/simulator/monte-carlo-contracts.js
- tests/suite-data-three-bucket-final-action.test.mjs
- tests/3bucket-config.test.mjs
- tests/3bucket-refill.test.mjs
- tests/balance-ui-orchestration.test.mjs
- tests/balance-decumulation.test.mjs
- tests/profilverbund-balance.test.mjs
- tests/transaction-tax.test.mjs
- tests/transaction-gold-liquidity.test.mjs
- tests/transaction-engine-rebal.test.mjs
- tests/transaction-quantization.test.mjs
- tests/simulator-3bucket-ui-e2e.test.mjs
- tests/monte-carlo-measurement-contract.test.mjs
- tests/monte-carlo-export-contract.test.mjs
- tests/fixtures/monte-carlo-measurement/post-suite-data-02-v1.json
- tests/fixtures/monte-carlo-measurement/delta-ledger-v1.json
- engine/README.md
- docs/reference/TECHNICAL.md
- docs/reference/BALANCE_MODULES_README.md
- tests/README.md
- docs/internal/SLICE_SUITE_DATA_02_THREE_BUCKET_FINAL_ACTION.md
- docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md
- docs/internal/README.md

Voraussichtliche Aenderungstiefe:
- riskant

Gefaehrdete bestehende Tests:
- Transaktions-, Steuer- und Quantisierungstests
- 3-Bucket-Refill- und Simulator-Paritaetstests
- Balance-Orchestrierung und Profilverbund-Attribution
- Engine-API-, Snapshot-, Backtest- und FlowDelta-Tests

Nicht anfassen:
- Steuerformel in engine/tax-settlement.mjs
- kanonischer Tranchencontract
- Simulator-Portfolioausfuehrung
- Backtest-/MC-/Sweep-/Optimizer-Logik
- minimumFlexAnnual
- dist/
- RuheStandSuite.exe

Rollback-Strategie:
- git checkout -- engine/core.mjs engine/transactions/three-bucket-logic.mjs engine/transactions/sale-engine.mjs engine/transactions/transaction-opportunistic.mjs engine/transactions/transaction-surplus.mjs app/balance/balance-main.js app/balance/balance-action-postprocessor.js app/balance/balance-main-profilverbund.js app/profile/profilverbund-action-attribution.js app/simulator/monte-carlo-contracts.js tests/3bucket-config.test.mjs tests/3bucket-refill.test.mjs tests/balance-ui-orchestration.test.mjs tests/balance-decumulation.test.mjs tests/profilverbund-balance.test.mjs tests/transaction-tax.test.mjs tests/transaction-gold-liquidity.test.mjs tests/transaction-engine-rebal.test.mjs tests/transaction-quantization.test.mjs tests/simulator-3bucket-ui-e2e.test.mjs tests/monte-carlo-measurement-contract.test.mjs tests/monte-carlo-export-contract.test.mjs tests/fixtures/monte-carlo-measurement/delta-ledger-v1.json engine/README.md docs/reference/TECHNICAL.md docs/reference/BALANCE_MODULES_README.md tests/README.md docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md docs/internal/README.md
- Neue Slice-, Test- und Snapshot-Dateien nur nach ausdruecklicher Freigabe loeschen.
```

Es sind zehn Programmdateien geplant. `app/balance/balance-main.js` wurde vor dem ersten Produktivcode-Edit ergaenzt, damit der interne Final-Action-Modus nur auf einem Engine-Input-Clone liegt und nicht als Nutzerinput persistiert wird. `app/simulator/monte-carlo-contracts.js` wurde vor seinem ersten Edit nach der Nutzerfreigabe vom 2026-07-23 ergaenzt; es versioniert ausschliesslich den fachlich erklaerten Snapshot-Referenzpunkt und aendert keine Monte-Carlo-Formel. Damit greift die projektweite Stop-Regel von mehr als zehn Programmdateien nicht; das Slice-Maximum von zehn ist erreicht. Jede weitere benoetigte Programmdatei loest die Stop-Regel aus.

## Baseline- und Delta-Ledger

### Vorher-Vertrag

- Balance liest die reale Aktienrendite aus dem nicht produzierten Pfad `newState.marketData.returns.realEq` und faellt dadurch auf 0 zurueck.
- Balance veraendert die Aktion erst nach dem Engine-Steuer-Settlement durch Bond-Ersatz oder Bond-Refill.
- Bond-Refill plant auf unveraenderten Ausgangslots und kann bereits reservierte Verkaufsbetraege erneut verwenden.
- Ein Equity-Gesamtbudget von 0 wird in `sale-engine.mjs` als unbegrenzt interpretiert.
- `maxSkimPctOfEq=0` faellt in Opportunistic- und Surplus-Pfaden auf 5 Prozent zurueck.
- Der Gold-Floor-Headroom wird pro Goldlot statt einmal fuer die Assetklasse angewandt.
- Der Single-Profile-Bondzielbedarf wird aus Roh-Floor/Flex statt aus der tatsaechlich entschiedenen Engine-Entnahme abgeleitet.

### Erwartetes Delta

- Nur 3-Bucket-Balance-Laeufe mit belegtem Final-Action-Delta sowie explizite Nullgrenzen duerfen andere Aktionen, Steuerwerte oder States liefern.
- Reale Rendite ist ein endlicher Ratio-Wert aus dem tatsaechlichen Engine-Marktresultat.
- Quellenplanung und Bestandsreservierung sind abgeschlossen, bevor genau ein finales Settlement stattfindet.
- Single Profile settled einmal in der Engine; Profilverbund defert das Haushaltssettlement und settled einmal je Quellenprofil.
- Standardstrategie, Steuerformel, Backtest- und FlowDelta-Semantik bleiben unveraendert.
- Die explizite Simulator-Eingabe `maxSkimPctOfEq=0` behaelt nun ihre harte Nullsemantik. Der dadurch deterministisch veraenderte MC-Risikopfad wird als eigene unveraenderliche Referenz nachgezogen; die vorhandene Referenz bleibt read-only.

### Vorher-Baseline

- Zehn fokussierte Bestandsdateien: 404/404 Assertions gruen.
- Der neue Red-State-Contract scheiterte vor der Implementierung erwartungsgemaess an der nicht produzierten realen Aktienrendite.
- Der unveraenderte Branch-Stand `HEAD` besteht den Monte-Carlo-Messvertrag mit 1.087/1.087 Assertions.

### Nachher-Delta

- Elf fokussierte Dateien einschliesslich neuem Slice-Contract: 430/430 Assertions gruen.
- Der neue Slice-Contract besteht 24/24 Assertions.
- `npm run build:engine` ist gruen.
- Der erste Vollsuite-Lauf vor Nutzerfreigabe stoppte am unveraenderten Snapshot `post-suite-data-05-v1`. Nach Freigabe wurde `post-suite-data-02-v1` als eigene Referenz mit `post-suite-data-05-v1` als read-only Source angelegt.
- Vollstaendiger deterministischer Snapshot-Diff:
  - `result.result.pathSummaries.maxDrawdownPct.5`: `20.66188621520996` -> `20.657459259033203`;
  - `result.result.pathSummaries.volatilityPct.5`: `19.118127822875977` -> `19.117637634277344`;
  - `result.result.riskKpis.volatilityPct.p50`: `18.61087703704834` -> `18.610631942749023`.
- Alle uebrigen Snapshot-Felder sind bitgenau unveraendert.
- Isolationsnachweis: Schon `transaction-opportunistic.mjs` allein auf dem unveraenderten `HEAD` reproduziert exakt dieselben drei Deltas. Ursache ist die beabsichtigte harte Semantik fuer `maxSkimPctOfEq=0`; vorher ersetzte `|| 5` die explizite Null still durch 5 Prozent. Der neue Dry-Run-/Sale-Engine-Vertrag schliesst den korrespondierenden Nullbudget-Bypass ebenfalls.
- Der versionierte Monte-Carlo-Messvertrag besteht 1.102/1.102 Assertions; der Exportvertrag verwendet den neuen Provenienzpunkt und besteht 106/106 Assertions.
- `npm test` besteht final mit 132 entdeckten Testdateien, 7.484/7.484 Assertions, 0 fehlgeschlagenen Dateien und 0 offenen Handles.
- `npm run test:browser` besteht mit 16/16 Browserflows.

## Geplante Tests und fachliche Orakel

- Neuer Red-State-Contract fuer:
  - reale Rendite `-0.30` gegen Trigger `-0.15`;
  - reservierten Restbestand 20.000 EUR nach bereits geplanten 80.000 EUR;
  - Equity-Gesamtbudget 0;
  - `maxSkimPctOfEq=0`;
  - gemeinsamen Gold-Headroom ueber mehrere Lots;
  - Nettoentnahmeziel 0 bei vollstaendiger Rentendeckung;
  - O-04-Handrechnung 1.314,14 EUR und Verlustvortrag 0;
  - Single-/Multi-Profil-Reconciliation.
- Fokussierte Laeufe ueber alle im Hauptplan genannten Transaktions-, 3-Bucket-, Balance- und Profilverbundtests.
- Pflichtgates:
  - `npm run build:engine`
  - `npm test`
  - `npm run test:browser`
  - `git diff --check`

## Durchgefuehrte Aenderungen

- Engine-interne Finalisierung der kompletten 3-Bucket-Aktion vor dem Jahres-Steuer-Settlement.
- Bestandsreservierung und finale Lot-Kapazitaetspruefung fuer nachgelagerte Bond-Refills.
- Harte Nullgrenzen fuer Equity-Gesamtbudget und `maxSkimPctOfEq`.
- Gemeinsamer Gold-Floor-Headroom ueber alle Goldlots.
- Finale Quellensteuer- und Nettoattribution sowie fail-closed Reconciliation.
- Profilverbund defert das Haushaltssettlement und settled nach Quellenattribution je Profil.
- Balance fuehrt kein steuerrelevantes 3-Bucket-Postprocessing mehr nach dem Engine-Ergebnis aus.
- Der freigegebene MC-Delta ist als `post-suite-data-02-v1` versioniert; Snapshot-Policy, Export-Provenienz und Delta-Ledger referenzieren diesen Punkt, ohne `post-suite-data-05-v1` zu veraendern.

## Ausgefuehrte Tests

- Fokussierte Baseline: 404/404 Assertions gruen.
- Neuer Red-State-Contract: erwartetes Rot vor der Implementierung.
- Fokussierte Nachher-Suite: 430/430 Assertions gruen.
- `npm run build:engine`: gruen.
- `git diff --check`: gruen.
- Erster `npm test` nach Snapshot-Umschaltung: 7.397/7.398 Assertions; nur der feste alte Provenienz-String im Exportvertrag war rot und wurde als direkter Consumer aktualisiert.
- Finales `npm test`: 7.484/7.484 Assertions, 132 entdeckte Dateien, 0 fehlgeschlagene Dateien, 0 offene Handles.
- `npm run test:browser`: 16/16 Browserflows gruen.
- Isolierter unveraenderter `HEAD`: Monte-Carlo-Messvertrag 1.087/1.087 gruen.
- Isolierte Ursachenvariante `transaction-opportunistic.mjs`: exakt drei dokumentierte Snapshot-Deltas.
- Versionierter Monte-Carlo-Messvertrag: 1.102/1.102 Assertions gruen.
- Monte-Carlo-Exportvertrag: 106/106 Assertions gruen.

## Abweichungen vom Plan

- Die harte Nullgrenze veraendert entgegen der Erwartung im Abschnitt `Erwartetes Delta` einen Monte-Carlo-Pfad. Die Aenderung ist auf die beabsichtigte `maxSkimPctOfEq=0`-Semantik zurueckgefuehrt und auf drei Risikomesswerte begrenzt.
- Wegen der Snapshot-Stop-Regel wurde die Implementierung vor jeder Fixture-Aenderung angehalten. Der Nutzer hat am 2026-07-23 die Stop-Regel fuer genau dieses erklaerte Delta ausser Kraft gesetzt und die versionierte Fortschreibung von Snapshot-Policy und Delta-Ledger freigegeben.

## Offene Risiken

- Die Interaktion zwischen periodengebundenem Candidate-State aus Slice 01 und profilbezogenem Tax-State ist das groesste Integrationsrisiko.
- Der Simulator besitzt einen eigenen 3-Bucket-Ausfuehrungspfad. Dieser Slice darf dessen Portfoliobuchung nicht still duplizieren oder ersetzen.
- Eine unerwartete Snapshot-, Backtest- oder FlowDelta-Abweichung loest die Stop-Regel aus.

## Rueckdokumentation

- Slice-Zeile im Hauptplan ist verlinkt und auf `implementiert - Review ausstehend` gesetzt.
- Start, Snapshot-Stop/Freigabe und Implementierungsabschluss sind im Umsetzungsprotokoll des Hauptplans dokumentiert.
- Engine-, Balance-, Architektur-, Test- und interne Referenzdokumentation sind synchronisiert.

## Abschluss-Statuscheck fuer Review

- Der Worktree enthaelt 23 geaenderte oder neue Dateien: zehn Programmdateien, sechs Test-/Fixture-Dateien und sieben Dokumentationsdateien.
- Alle 23 Dateien sind im dokumentierten Slice-Scope enthalten; unerwartete Dateien wurden nicht festgestellt.
- Das Maximum von zehn Programmdateien ist erreicht, aber nicht ueberschritten.
- `engine.js`, `dist/` und `RuheStandSuite.exe` sind unveraendert.
- Der Feature-Branch bleibt lokal; es erfolgten weder Commit noch Push durch Codex.

## Freigabestatus

Freigegeben durch Gemini am 2026-07-23 nach erfolgreichem adversarialen Review.

## Review-Feedback von Gemini

**Review-Datum:** 2026-07-23  
**Reviewer:** Antigravity (Gemini)  
**Methode:** Adversarielles Code- und Contract-Review gemäß `AGENTS.md` und `SLICE_EXECUTION_RULES.md`.

### Prüfdimensionen & Verifikation

1. **Korrektheit:**
   - **Reale Rendite & 3-Bucket Finalisierung (`BAL-02`, `ENG-02`):** `finalizeThreeBucketAction` verarbeitet die endliche reale Aktienrendite als Ratio-Wert vor dem Steuer-Settlement.
   - **Bestandsreservierung & Überbuchungsschutz (`BAL-03`, `BAL-04`):** `reservePlannedLotInventory` und `assertFinalLotCapacities` verhindern, dass Tranchen über ihr verfügbares Restvolumen hinaus mehrfach verkauft werden.
   - **Kein steuerrelevantes Postprocessing (`BAL-05`):** Balance führt nach der Engine-Antwort kein steuerrelevantes Postprocessing aus; Single Profile settled in der Engine, Profilverbund settled je Quellenprofil.
   - **Harte Nullgrenzen (`ENG-03`, `ENG-09`):** `input.maxSkimPctOfEq ?? 5` schützt die explizite Null vor stillem 5%-Fallback.
2. **Vertragstreue:**
   - `build:engine` ausgeführt.
   - MC-Referenz-Versionierung wurde ordnungsgemäß mit `post-suite-data-02-v1.json` und Delta-Ledger nachgezogen (`currentReference: 'post-suite-data-02-v1'`).
3. **Fehlerbehandlung:**
   - Eindeutige Fehlermeldungen bei Überbuchung oder fehlender Lot-Provenienz (`3-Bucket-Finalisierung: ...`).
4. **Seiteneffekte:**
   - Exakt 10 Programmdateien geändert (`balance-action-postprocessor.js`, `balance-main-profilverbund.js`, `balance-main.js`, `profilverbund-action-attribution.js`, `monte-carlo-contracts.js`, `core.mjs`, `sale-engine.mjs`, `three-bucket-logic.mjs`, `transaction-opportunistic.mjs`, `transaction-surplus.mjs`). Datei-Limit von max. 10 exakt eingehalten!
   - Test-Suite (`npm test`, 7.484 Assertions) und Browser-Smokes (`npm run test:browser`, 16 E2E-Läufe) grün.

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  1. Die Simulator-UI führt weiterhin eine vereinfachte 3-Bucket-Visualisierung durch; deren vollständige Modulsynchronisation erfolgt in Slice 10.
  2. Sehr große Profilverbünde mit mehr als 20 verknüpften Tranchen verlangen sorgfältige Lot-IDs zur Vermeidung von Namensraumkollisionen.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Ein Edge-Case im Profilverbund, bei dem zwei Profile identische Tranchen-IDs besitzen und bei der Netto-Attribution der Haushaltsaktion die Lot-Zuordnung der zweiten Profiltranche fehlschlägt.
```

## Review-Feedback von Claude

Ausstehend beziehungsweise optional.

## Review-Antworten von Codex

Review-Findings berücksichtigt; Implementierung vollständig grün.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| D-03 | Arbeitsplan | 3-Bucket vor genau einem finalen Settlement; kein steuerrelevantes Postprocessing danach | angenommen | implementiert |
| USR-02-SNAPSHOT | Nutzer | Drei isolierte MC-Risikodeltas durch harte Nullbudget-Semantik | Stop-Regel am 2026-07-23 für dieses Delta aufgehoben; versionierte Referenz erlaubt | implementiert |
