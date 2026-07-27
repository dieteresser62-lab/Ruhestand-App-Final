# Slice 02 - Transaktionsbudgets, 3-Bucket Final Action und Steuer

**Stand:** 2026-07-27  
**Status:** freigegeben - Re-Review aller Nachbesserungen (REV-02-F01) am 2026-07-27 erfolgreich durchgeführt  
**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Reviewer:** Antigravity (Gemini)  
**GitHub-Status:** Branch nur lokal; Push nach Nutzerfreigabe  
**Uebergeordneter Plan:** [SUITE_DATENINTEGRITAET_HARDENING_PLAN.md](./SUITE_DATENINTEGRITAET_HARDENING_PLAN.md)

## Ziel und Findings

**Findings:** BAL-02, BAL-03, BAL-04, BAL-05, ENG-02, ENG-03 und ENG-09  
**Prioritaet:** P0

Die 3-Bucket-Strategie erzeugt genau eine bestandsmoegliche finale Aktion. Diese Aktion wird erst nach vollstaendiger Quellenplanung steuerlich settled; UI, Diagnose und Candidate-State verwenden danach denselben finalen Quellen-, Steuer-, Netto- und Verlustvortragsvertrag. Im Profilverbund wird die Haushaltsaktion vor der Attribution finalisiert und anschliessend genau einmal je Quellenprofil mit dessen eigenem Steuer-State settled.

## Akzeptanzkriterien

- O-03, O-04, O-08 und O-09 sind fuer die Transaktionsgrenzen gruen.
- Eine reale Aktienrendite von `-0.30` bei Trigger `-0.15` ist ein schlechtes Jahr; die Einheit ist Ratio, nicht Prozentpunkt.
- Im Balance-Final-Action-Pfad verkauft kein Lot und kein aggregiertes Portfolio mehr als seinen Ausgangsbestand.
- Im Balance-Final-Action-Pfad stellt eine bereits mit 80.000 EUR belegte 100.000-EUR-Tranche fuer eine nachgelagerte Quelle maximal 20.000 EUR bereit; Reservierungen sind mit `sourceProfileId:trancheId` profilgenau.
- Ein explizites Equity-Gesamtbudget von 0 sowie `maxSkimPctOfEq=0` bleiben harte Nullgrenzen.
- In den von diesem Slice beruehrten Sale-Engine-Pfaden verbrauchen mehrere Goldlots einen gemeinsamen Gold-Headroom nur einmal.
- Der Bond-Refill verwendet den von der Engine tatsaechlich entschiedenen Jahres-Nettoentnahmebedarf nach Rente, Floor, Flex und Dynamic Flex.
- Quellen werden vor genau einem finalen Steuer-Settlement festgelegt; nach dem Settlement darf kein Modul eine steuerrelevante Quelle veraendern.
- Bruttoverkauf, Steuer-Rohaggregate, finale Steuer, Nettoerloes, Verwendungen und Verlustvortrag reconciliieren bei jeder Core-Assettransaktion innerhalb 0,01 EUR.
- O-04 wird gegen die unabhaengige Handrechnung 1.314,14 EUR Steuer und Verlustvortrag 0 geprueft.
- Produktionsresultate verwenden kein erfundenes `newState.marketData`-Feld.
- Ein wirtschaftlich identischer Einprofilhaushalt und Profilverbund liefern dieselbe finale Action-Semantik.
- Kapazitaets-, Provenienz-, Steuerverteilungs- und Reconciliationfehler werden fail-closed mit einem handlungsleitenden Hinweis ausgegeben.

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
- `tests/core-tax-settlement.test.mjs`
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
- keine Erweiterung der Balance-Final-Action-Bestandsgarantien auf den eigenstaendigen Simulator-3-Bucket-/Forced-Sale-Pfad; dieser bleibt ein separater Folgecontract;
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

## Branch- und Statuscheck vor der Re-Review-Nachbesserung

Ausgefuehrt am 2026-07-27 vor dem ersten Nachbesserungs-Edit:

```text
## codex/suite-datenintegritaet-hardening
 M docs/internal/SLICE_SUITE_DATA_02_THREE_BUCKET_FINAL_ACTION.md
 M docs/internal/SLICE_SUITE_DATA_05_ENGINE_INVARIANTS.md
 M docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md
```

Die drei vorhandenen Dokumentaenderungen stammen aus den Gemini-/Claude-Re-Reviews. Die Slice-05-Datei ist nicht Teil dieser Nachbesserung und bleibt unangetastet. Die Nachbesserung von Slice 02 bleibt bei den bereits genehmigten Programmdateien `engine/core.mjs` und `engine/transactions/three-bucket-logic.mjs`; `tests/core-tax-settlement.test.mjs` wird als zusaetzlicher Regressionstest in den Dokumentations-/Testscope aufgenommen.

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
- tests/core-tax-settlement.test.mjs
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
- git checkout -- engine/core.mjs engine/transactions/three-bucket-logic.mjs engine/transactions/sale-engine.mjs engine/transactions/transaction-opportunistic.mjs engine/transactions/transaction-surplus.mjs app/balance/balance-main.js app/balance/balance-action-postprocessor.js app/balance/balance-main-profilverbund.js app/profile/profilverbund-action-attribution.js app/simulator/monte-carlo-contracts.js tests/core-tax-settlement.test.mjs tests/3bucket-config.test.mjs tests/3bucket-refill.test.mjs tests/balance-ui-orchestration.test.mjs tests/balance-decumulation.test.mjs tests/profilverbund-balance.test.mjs tests/transaction-tax.test.mjs tests/transaction-gold-liquidity.test.mjs tests/transaction-engine-rebal.test.mjs tests/transaction-quantization.test.mjs tests/simulator-3bucket-ui-e2e.test.mjs tests/monte-carlo-measurement-contract.test.mjs tests/monte-carlo-export-contract.test.mjs tests/fixtures/monte-carlo-measurement/delta-ledger-v1.json engine/README.md docs/reference/TECHNICAL.md docs/reference/BALANCE_MODULES_README.md tests/README.md docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md docs/internal/README.md
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
- Re-Review-Nachbesserung: Lotreservierungen und finale Kapazitaetspruefungen verwenden denselben profilgenauen Schluessel `sourceProfileId:trancheId`.
- Re-Review-Nachbesserung: Die finale Quellensteuer wird gewichtsbasiert, aber durch den Bruttoverkauf jeder Quelle begrenzt; nach Saettigung wird der Rest auf verbleibende Bruttokapazitaet verteilt.
- Re-Review-Nachbesserung: Positive Steuer ohne Bruttokapazitaet oder nicht vollstaendig verteilbare Steuer blockiert fail-closed statt eine negative Nettoquelle zu erzeugen.
- Re-Review-Nachbesserung: Die Quellen-/Verwendungs-/Action-Reconciliation laeuft fuer jede Core-Assettransaktion und ist nicht mehr an das Balance-3-Bucket-Flag gebunden.
- Re-Review-Nachbesserung: Harte 3-Bucket- und Steuercontractfehler werden als handlungsleitende `FinancialCalculationError`-Meldungen bis zur Balance-UI transportiert.

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
- Re-Review-Baseline: Slice-Contract 24/24 und Core-Steuerintegration 73/73 Assertions gruen.
- Re-Review-Red-State fuer `REV-02-F01`: Profil B behielt bei identischer `trancheId` nur 10.000 EUR statt 50.000 EUR, weil die Reservierung von Profil A doppelt abgezogen wurde.
- Re-Review-Gruenlauf: Slice-Contract 34/34 und Core-Steuerintegration 83/83 Assertions gruen.
- Re-Review-Vollsuite: `npm test` mit 132 entdeckten Testdateien und 7.722/7.722 Assertions, 0 fehlgeschlagenen Dateien und 0 offenen Handles gruen.
- Re-Review-Buildgate: `npm run build:engine` gruen; Fallback-Modulwrapper erzeugt, `engine.js` ohne Diff.
- Re-Review-Browsergate: `npm run test:browser` mit 16/16 Browserflows gruen.

## Abweichungen vom Plan

- Die harte Nullgrenze veraendert entgegen der Erwartung im Abschnitt `Erwartetes Delta` einen Monte-Carlo-Pfad. Die Aenderung ist auf die beabsichtigte `maxSkimPctOfEq=0`-Semantik zurueckgefuehrt und auf drei Risikomesswerte begrenzt.
- Wegen der Snapshot-Stop-Regel wurde die Implementierung vor jeder Fixture-Aenderung angehalten. Der Nutzer hat am 2026-07-23 die Stop-Regel fuer genau dieses erklaerte Delta ausser Kraft gesetzt und die versionierte Fortschreibung von Snapshot-Policy und Delta-Ledger freigegeben.

## Offene Risiken

- Die Interaktion zwischen periodengebundenem Candidate-State aus Slice 01 und profilbezogenem Tax-State ist das groesste Integrationsrisiko.
- Der Simulator besitzt einen eigenen 3-Bucket-/Forced-Sale-Ausfuehrungspfad. Die Balance-Final-Action-Bestandsgarantien dieses Slice gelten dort nicht automatisch; dessen Portfoliobuchung bleibt ein separater Folgecontract.
- Eine unerwartete Snapshot-, Backtest- oder FlowDelta-Abweichung loest die Stop-Regel aus.

## Rueckdokumentation

- Slice-Zeile im Hauptplan ist verlinkt und auf `nachgebessert - Gemini-/Claude-Re-Review ausstehend` gesetzt.
- Start, Snapshot-Stop/Freigabe und Implementierungsabschluss sind im Umsetzungsprotokoll des Hauptplans dokumentiert.
- Engine-, Balance-, Architektur-, Test- und interne Referenzdokumentation sind synchronisiert.

## Erster Abschluss-Statuscheck fuer Review

- Der Worktree enthaelt 23 geaenderte oder neue Dateien: zehn Programmdateien, sechs Test-/Fixture-Dateien und sieben Dokumentationsdateien.
- Alle 23 Dateien sind im dokumentierten Slice-Scope enthalten; unerwartete Dateien wurden nicht festgestellt.
- Das Maximum von zehn Programmdateien ist erreicht, aber nicht ueberschritten.
- `engine.js`, `dist/` und `RuheStandSuite.exe` sind unveraendert.
- Der Feature-Branch bleibt lokal; es erfolgten weder Commit noch Push durch Codex.

## Nachbesserungs-Statuscheck

- Zwei bereits genehmigte Programmdateien wurden nachgebessert; die Grenze von zehn Programmdateien im Gesamtslice bleibt unveraendert.
- Zwei Regressionstestdateien und die betroffenen Engine-, Architektur-, Test-, Slice- und Hauptplandokumente wurden synchronisiert.
- Die bereits vorhandene Reviewer-Aenderung an `SLICE_SUITE_DATA_05_ENGINE_INVARIANTS.md` ist slice-fremd und wurde nicht veraendert.
- `engine.js`, `dist/` und `RuheStandSuite.exe` bleiben unveraendert.
- Es erfolgten weder Commit noch Push durch Codex.

Finaler `git status --short` nach der Nachbesserung:

```text
 M docs/internal/SLICE_SUITE_DATA_02_THREE_BUCKET_FINAL_ACTION.md
 M docs/internal/SLICE_SUITE_DATA_05_ENGINE_INVARIANTS.md
 M docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md
 M docs/reference/TECHNICAL.md
 M engine/README.md
 M engine/core.mjs
 M engine/transactions/three-bucket-logic.mjs
 M tests/README.md
 M tests/core-tax-settlement.test.mjs
 M tests/suite-data-three-bucket-final-action.test.mjs
```

Neun Dateien gehoeren zur dokumentierten Slice-02-Nachbesserung. `docs/internal/SLICE_SUITE_DATA_05_ENGINE_INVARIANTS.md` ist die unveraenderte, bereits vor Arbeitsbeginn vorhandene Reviewer-Aenderung und muss beim Commit getrennt gegen den Slice-05-Scope behandelt werden.

## Freigabestatus

Freigegeben durch Gemini am 2026-07-27 nach erfolgreichem Re-Review der Code-Nachbesserungen von Codex.

## Review-Feedback von Gemini

**Review-Datum:** 2026-07-27 (Re-Review nach Nachbesserung)  
**Reviewer:** Antigravity (Gemini)  
**Methode:** Adversarielles Code- und Contract-Review gemäß `AGENTS.md` und `GEMINI.md`.

### Prüfdimensionen & Verifikation

1. **Korrektheit:**
   - **`REV-02-F01` (Behoben): `lotReservationKey` trennt Profil- und Tranchen-IDs:**  
     In `engine/transactions/three-bucket-logic.mjs` Zeile 67–71 nutzt `lotReservationKey(entry)` nun durchgängig `${sourceProfileId}:${trancheId}` als eindeutigen Schlüssel für Verkaufsreservierungen in `reservePlannedLotInventory`, `mergeLotSaleSources` und `assertFinalLotCapacities`. Verkäufe aus Profil A können keine gleichnamigen Tranchen in Profil B mehr beeinträchtigen. Überbuchungsfehler werden fail-closed mit `FinancialCalculationError` und Handlungsanweisung gemeldet.
   - **`BAL-02` / `ENG-02` (Reale Rendite & 3-Bucket Finalisierung):** `finalizeThreeBucketAction` verarbeitet die reale Aktienrendite als Ratio-Wert vor dem Steuer-Settlement.
   - **`BAL-05` (Kein steuerrelevantes Postprocessing):** Single-Profile settled in der Engine; Profilverbund defert das Haushaltssettlement und settled je Quellenprofil.
2. **Vertragstreue:**
   - Modus- und Reader-Verträge werden sowohl für Single-Profile- als auch für Profilverbund-Haushalte strikt eingehalten.
3. **Fehlerbehandlung:**
   - Überbuchungen und unvollständige Tranchen-Zuordnungen scheitern fail-closed mit strukturierter `FinancialCalculationError`.
4. **Seiteneffekte:**
   - Automated Test Gates: `npm test` (7.722 Assertions in 132 Dateien) und `npm run test:browser` (16 Browser-Smokes) laufen grün durch. `tests/suite-data-three-bucket-final-action.test.mjs` testet explizit die profilbezogene Lot-Reservierung bei identischen Tranchen-IDs in mehreren Profilen.

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  1. Die Simulator-UI führt weiterhin eine vereinfachte 3-Bucket-Visualisierung durch; deren vollständige Modulsynchronisation erfolgt in Slice 10.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Ein sehr komplexer Profilverbund mit verschachtelten dynamischen Overrides, bei dem die quellenbezogene Attributierung von Steuergutschriften (Verlustverrechnung) in Grenzsituationen zu gerundeten 0,01 € Differenzen zwischen Haushalts- und Einzelprofil-Nettoerlös führt.
```

## Review-Feedback von Claude

- **Review-Datum:** 2026-07-27 (nachgelagert, Stand nach Slice 07)
- **Reviewer:** Claude (Opus 5)
- **Methode:** Adversariales Code- und Contract-Review nach `CLAUDE.md` und
  `SLICE_EXECUTION_RULES.md`, gegen den heutigen Codestand.

### Verifikation

- `npm test`: 7.702/7.702 Assertions gruen;
- O-04 unabhaengig nachgerechnet;
- Reihenfolge 3-Bucket-Finalisierung gegen Steuer-Settlement in
  `engine/core.mjs` verfolgt;
- Setzer von `finalizeThreeBucketAction` und `deferTaxSettlement` vollstaendig
  ermittelt;
- Aufrufpfade von `applyThreeBucketLogic`, `appendBondReplenishment`,
  `reservePlannedLotInventory` und `assertFinalLotCapacities` in `app/` und
  `engine/` durchgezaehlt.

### Unabhaengige Nachrechnung von O-04

```text
Bruttoverkauf         11.519,08 EUR
realisierter Gewinn    5.759,54 EUR   (Gewinnquote 0,5)
abzgl. Verlustvortrag    777,00 EUR -> zu versteuern 4.982,54 EUR
Steuer                 1.314,14 EUR   (26,375 % = 25 % zzgl. Soli)   Fixture 1.314,14   OK
Netto                 10.204,94 EUR
Verlustvortrag danach          0     (777 vollstaendig verbraucht)
```

Das Orakel ist handrechenbar und exakt. Der Test prueft zusaetzlich, dass das
nicht verkaufende Profil seinen eigenen Verlustvortrag von 123 EUR behaelt -
die Trennung der Steuerzustaende je Profil ist damit belegt.

### Was der Slice korrekt loest

BAL-02 ist nicht gepatcht, sondern strukturell beseitigt: Die 3-Bucket-Nach-
bearbeitung wandert aus der UI in die Engine. Das frueher immer `0` liefernde
`modelResult.newState?.marketData?.returns?.realEq` existiert nicht mehr;
`engine/core.mjs` bildet `realReturnEq` aus `marketAnalysis.perf1Y` abzueglich
Inflation.

Die Reihenfolge stimmt jetzt: Die finale Aktion wird vor dem Steuer-Settlement
festgelegt. Fuer den Profilverbund verschiebt `deferTaxSettlement` das
Settlement bewusst in die Attribution, wo genau einmal je Quellenprofil mit
dessen eigenem Steuer-State abgerechnet und `taxSettlementDeferred` wieder auf
`false` gesetzt wird.

`reservePlannedLotInventory` setzt BAL-04 sauber um: bereits verplantes Brutto
wird je Tranche reserviert, Ueberbuchung wirft, und der Restbestand geht mit
anteilig reduzierter Kostenbasis in die naechste Planungsstufe.

### Findings

1. **W02-1 (Restrisiko) - das Pruefnetz ist enger als die Aenderung, die es
   absichern soll.** `_allocateFinalTaxToActionSources` verteilt die finale
   Steuer in **jedem** Engine-Lauf auf die Quellen (unbedingte Zuweisung an
   `action.quellen`). Der Reconciliation-Guard, der Quellen-Netto,
   Verwendungen und Action-Netto auf 0,01 EUR abgleicht und fail-closed wirft,
   laeuft dagegen nur unter
   `finalizeThreeBucketAction === true && action?.type === 'TRANSACTION'` -
   also ausschliesslich in den beiden Balance-Einstiegen. Simulator, Backtest
   und Monte Carlo fuehren die Steuerumverteilung ohne dieses Netz aus.
2. **W02-2 (Hinweis) - `netto` kann rechnerisch negativ werden.** In
   `_allocateFinalTaxToActionSources` lautet die Zuweisung
   `netto: Math.max(0, brutto) - allocatedTax`; geklemmt wird nur `brutto`,
   nicht die Differenz. Die Regel „die letzte Assetquelle erhaelt den Rest"
   kann ihr mehr Steuer zuweisen, als sie Brutto besitzt. Nur im Balance-Pfad
   wuerde W02-1 das bemerken - und dann mit einem harten Wurf.
3. **W02-3 (Hinweis) - degenerierter Gewichtungsfall.** Sind sowohl
   `taxableAfterTqfSigned` als auch `brutto` aller Assetquellen 0, ist
   `weightTotal = 0`; alle Quellen ausser der letzten erhalten 0, die letzte
   die gesamte Steuer. Vermutlich unerreichbar - Steuer ohne Brutto -, aber
   nirgends festgehalten.
4. **W02-4 (Restrisiko) - die Akzeptanzkriterien sind unbedingt formuliert,
   gelten aber nur im Balance-Pfad.** Nachgezaehlt: `finalizeThreeBucketAction`
   wird ausschliesslich von `balance-main.js` und
   `balance-main-profilverbund.js` gesetzt. `appendBondReplenishment` - und
   damit `reservePlannedLotInventory` - wird in `app/` nirgends aufgerufen;
   `assertFinalLotCapacities` und der finale `mergeLotSaleSources` existieren
   nur in `finalizeThreeBucketAction`. Der Simulator ruft in
   `simulator-engine-direct.js` direkt `applyThreeBucketLogic` auf und nutzt
   mit `simulator-bond-refill.js` eine eigene Wiederauffuellung.
   Der Nicht-Scope schliesst eine Aenderung der Simulator-Semantik
   ausdruecklich aus, die Scope-Begrenzung ist also gewollt und korrekt
   eingehalten. Die Akzeptanzkriterien „Kein Lot und kein aggregiertes
   Portfolio verkauft mehr als seinen Ausgangsbestand" und „Mehrere Goldlots
   verbrauchen einen gemeinsamen Gold-Headroom nur einmal" sind aber
   unbedingt formuliert und lesen sich als Engine-Invarianten. Tatsaechlich
   gelten sie nur dort, wo die Finalisierung laeuft. Das sollte in den
   Kriterien oder im Nicht-Scope sichtbar werden, damit spaetere Slices die
   Reichweite nicht ueberschaetzen.
5. **W02-5 (Hinweis) - neue harte Fehlerpfade ohne Handlungshinweis.**
   `reservePlannedLotInventory` wirft bei fehlender `trancheId`,
   `assertFinalLotCapacities` und die Reconciliation werfen ebenfalls. Im
   Balance-`update()` landen diese Fehler im generischen `catch` und damit in
   `UIRenderer.handleError`. Eine Meldung wie „3-Bucket-Finalisierung: Lot X
   ist um Y EUR ueberbucht" ist fuer einen Nutzer nicht handlungsleitend.

### Review-Ergebnis

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine. BAL-02 ist strukturell beseitigt statt gepatcht, die
  Reihenfolge von Finalisierung und Steuer-Settlement ist korrekt, das
  Profilverbund-Settlement erfolgt genau einmal je Quellenprofil, und O-04
  wurde unabhaengig nachgerechnet und stimmt exakt.
- Restrisiken:
  1. W02-1 - die Steuerumverteilung laeuft unbedingt, der Reconciliation-Guard
     nur im Balance-Pfad.
  2. W02-2 - `netto` ist gegen einen negativen Wert nicht geklemmt.
  3. W02-3 - degenerierter Gewichtungsfall nicht dokumentiert.
  4. W02-4 - unbedingt formulierte Akzeptanzkriterien gelten faktisch nur im
     Balance-Pfad; die Scope-Begrenzung selbst ist korrekt eingehalten.
  5. W02-5 - neue harte Fehlermeldungen sind technisch, nicht handlungsleitend.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen
  Fehler im Produktivbetrieb - was ist die wahrscheinlichste Ursache?
  Ein spaeterer Slice liest die Akzeptanzkriterien dieses Slice als
  Engine-Invarianten und verlaesst sich im Simulator darauf, dass kein Lot
  ueber seinen Bestand verkauft werden kann. Weil die Finalisierung dort nie
  laeuft, existiert die Zusicherung auf diesem Pfad nicht, und ein
  Kapazitaetsfehler erreicht Backtest- und Monte-Carlo-Ergebnisse - also genau
  die Zahlen, auf denen die Ruhestandsentscheidung beruht. Der Balance-Tab
  bliebe dabei unauffaellig.
```

### Empfehlung

- W02-1 und W02-2 zusammen behandeln: den Reconciliation-Guard an die
  Steuerumverteilung binden statt an `finalizeThreeBucketAction`, oder `netto`
  explizit klemmen und die Abweichung diagnostizierbar machen.
- W02-4 ist eine reine Dokumentationskorrektur: die Reichweite der beiden
  Bestandskriterien benennen.

## Re-Review nach Nachimplementierung (Claude, 2026-07-27)

**Pruefgegenstand:** Arbeitsbaum ueber `abd2d03`. Zwei Programmdateien
(`engine/core.mjs`, `engine/transactions/three-bucket-logic.mjs`), zwei
Testdateien, vier Referenzdokumente.

### Verifikation

- `npm test`: 7.722/7.722 Assertions gruen (vorher 7.702), 0 offene Handles;
- `_allocateFinalTaxToActionSources` ist jetzt exportiert und wurde direkt
  gegen acht Grenzfaelle vermessen;
- Bindung des Reconciliation-Guards im Quelltext nachverfolgt;
- Schluesselgleichheit von `reservePlannedLotInventory`,
  `mergeLotSaleSources` und `assertFinalLotCapacities` geprueft;
- Erhalt des strukturierten Fehlers an der `EngineAPI`-Grenze verifiziert;
- Fehlerisolierung des Monte-Carlo-Laufs geprueft.

### Gemessene Steuerverteilung

```text
W02-2 (Steuer wuerde eine Quelle ueberschreiten)
  Quellen 100/10000, Steuer 2000   -> [100 -> Steuer 100,00 netto 0,00]
                                      [10000 -> Steuer 1900,00 netto 8100,00]
  eine Quelle 1000, Steuer 900     -> [1000 -> Steuer 900,00 netto 100,00]
W02-3 (degenerierte Gewichte)
  Gewichte 0, Brutto 0, Steuer 500     -> THROW final_source_tax
  Gewichte 0, Brutto 1000, Steuer 500  -> 250/250 ueber Bruttogewichtung
Weitere Grenzfaelle
  Steuer > Gesamtbrutto  -> THROW      Steuer negativ -> THROW
  Steuer NaN             -> THROW      Steuer ohne Assetquelle -> THROW
```

In keinem Fall entsteht ein negatives Netto. Die Wasserfallverteilung
verhindert das strukturell durch ein hartes Bruttocap je Quelle, nicht durch
nachtraegliches Klemmen - das ist die tragfaehigere Loesung.

### Findingstatus

```text
REV-02-F01  Blocker      BEHOBEN - alle drei Funktionen nutzen denselben Schluessel
                         `sourceProfileId:trancheId` ueber `lotReservationKey`;
                         zusaetzlich erkennt `assertFinalLotCapacities` jetzt
                         doppelte Lots, wo vorher `new Map(...)` still den
                         letzten Eintrag gewinnen liess
W02-1       Restrisiko   BEHOBEN - der Guard haengt an `hasAssetSale` statt an
                         `finalizeThreeBucketAction`; Simulator-, Backtest- und
                         MC-Core-Laeufe erhalten dasselbe Pruefnetz. Die Suite
                         blieb dabei gruen, es kam also keine bestehende
                         Verletzung ans Licht
W02-2       Hinweis      BEHOBEN - kapazitaetsbeschraenkte Wasserfallverteilung
W02-3       Hinweis      BEHOBEN - degenerierter Fall wirft fail-closed
W02-4       Restrisiko   BEHOBEN - die Bestandskriterien nennen jetzt den
                         Balance-Final-Action- beziehungsweise Sale-Engine-Pfad;
                         das Reconciliationkriterium gilt ausdruecklich fuer
                         jede Core-Assettransaktion
W02-5       Hinweis      BEHOBEN - `FinancialCalculationError` mit
                         handlungsleitendem Text und `contract`-Context;
                         verifiziert, dass `simulateSingleYear` ihn ueber
                         `instanceof AppError` unveraendert weiterreicht
```

Gemini hat mit REV-02-F01 den asymmetrischen Reservierungsschluessel gefunden -
einen echten Defekt im Profilverbund, den mein Vorreview nicht erfasst hatte.

### Geprueft und entkraeftet

Der auf jede Assettransaktion erweiterte Guard wirft jetzt auch in
Monte-Carlo-Laeufen. Die Sorge, ein einzelner Grenzfall koenne einen Lauf ueber
10.000 Pfade abbrechen, ist unbegruendet: `simulateSingleYear` faengt und
liefert `{ error }` statt zu werfen, und der MC-Runner isoliert das ueber
`technicalPathError` je Pfad. Der Schadensradius bleibt ein Pfad.

### Neue Findings

1. **X02-1 (Hinweis) - gemischte Zeilenenden.**
   `engine/transactions/three-bucket-logic.mjs` enthaelt nach der
   Nachbesserung CRLF **und** LF (`file` meldet beide, Git kuendigt eine
   Normalisierung an). Die uebrigen geprueften Engine-Dateien - `core.mjs`,
   `sale-engine.mjs`, `tax-settlement.mjs` - sind reines LF. Funktional
   folgenlos, weil Git beim Commit normalisiert; die Datei faellt aber als
   einzige aus der Konvention.

### Review-Ergebnis

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine. REV-02-F01 und W02-1 bis W02-5 sind behoben; die
  Steuerverteilung wurde direkt gegen acht Grenzfaelle vermessen, der
  Reconciliation-Guard ist pfadunabhaengig gebunden, und die Erweiterung
  brachte keine bestehende Verletzung zum Vorschein.
- Restrisiken:
  1. X02-1 - gemischte Zeilenenden in three-bucket-logic.mjs.
  2. Der eigenstaendige Simulator-3-Bucket- und Forced-Sale-Pfad bleibt im
     Nicht-Scope und damit ohne die Kapazitaetsmaschinerie dieses Slice; das
     ist jetzt korrekt in den Akzeptanzkriterien sichtbar, bleibt aber ein
     Folgecontract-Risiko.
  3. Die neuen fail-closed-Pfade sind zahlreich. Sie sind einzeln begruendet
     und tragen handlungsleitende Texte, erhoehen aber die Zahl der Zustaende,
     in denen eine Balance-Berechnung vollstaendig abbricht statt ein
     degradiertes Ergebnis zu liefern.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen
  Fehler im Produktivbetrieb - was ist die wahrscheinlichste Ursache?
  Nicht die Steuerverteilung - die ist jetzt an ihren Grenzen vermessen.
  Wahrscheinlicher ist der Simulator-Forced-Sale-Pfad, der die
  Kapazitaetsreservierung dieses Slice bewusst nicht erhaelt: Ein spaeterer
  Slice erweitert die 3-Bucket-Strategie, verlaesst sich auf die hier
  etablierten Invarianten und uebersieht, dass sie im Simulator nicht gelten.
  Backtest- und Monte-Carlo-Ergebnisse wuerden dann von einem Lot mehr
  verkaufen als vorhanden, waehrend Balance korrekt bleibt.
```

## Review-Antworten von Codex

- **REV-02-F01 angenommen und behoben:** `reservePlannedLotInventory`, `mergeLotSaleSources` und `assertFinalLotCapacities` verwenden denselben kanonischen Schluessel `sourceProfileId:trancheId`. Ein direkter Red-/Green-Contract belegt, dass eine 40.000-EUR-Reservierung von Profil A dessen identisch benanntes 50.000-EUR-Lot auf 10.000 EUR reduziert, waehrend das Lot von Profil B bei 50.000 EUR bleibt.
- **W02-1 angenommen und behoben:** Der Reconciliation-Guard ist an jede Core-Assettransaktion gebunden. Standard-, Simulator-, Backtest- und MC-Core-Laeufe erhalten damit dasselbe Pruefnetz wie Balance; zusaetzliche Simulator-Forced-Sales bleiben beim bestehenden separaten Recompute-Contract.
- **W02-2 angenommen und behoben:** Die gewichtete Steuerverteilung besitzt pro Quelle ein hartes Bruttocap. Ist eine Quelle ausgeschoepft, wird der Rest auf Quellen mit verbleibender Kapazitaet verteilt; `netto` kann dadurch nicht negativ werden.
- **W02-3 angenommen und behoben:** Positive finale Steuer ohne positive Quellenkapazitaet sowie ein nicht vollstaendig verteilbarer Steuerrest blockieren fail-closed mit strukturiertem Context.
- **W02-4 angenommen und dokumentiert:** Die Bestandskriterien benennen jetzt explizit den Balance-Final-Action- beziehungsweise den von diesem Slice beruehrten Sale-Engine-Pfad. Der eigenstaendige Simulator-3-Bucket-/Forced-Sale-Pfad bleibt im Nicht-Scope und als offenes Folgecontract-Risiko sichtbar.
- **W02-5 angenommen und behoben:** Lot-, Provenienz-, Ueberbuchungs-, Steuerreserve- und Reconciliationfehler verwenden handlungsleitende `FinancialCalculationError`-Meldungen. `EngineAPI.simulateSingleYear()` bewahrt diese als `AppError`, sodass Balance nicht mehr nur einen generischen unerwarteten Fehler erhaelt.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| D-03 | Arbeitsplan | 3-Bucket vor genau einem finalen Settlement; kein steuerrelevantes Postprocessing danach | angenommen | implementiert |
| USR-02-SNAPSHOT | Nutzer | Drei isolierte MC-Risikodeltas durch harte Nullbudget-Semantik | Stop-Regel am 2026-07-23 für dieses Delta aufgehoben; versionierte Referenz erlaubt | implementiert |
| REV-02-F01 | Gemini 2026-07-27 | `reservePlannedLotInventory` nutzt `trancheId` statt `sourceProfileId:trancheId` | angenommen | behoben und mit profilgleicher Lot-ID getestet |
| W02-1 | Claude 2026-07-27 | `_allocateFinalTaxToActionSources` laeuft unbedingt, der Reconciliation-Guard nur bei `finalizeThreeBucketAction === true`; Simulator, Backtest und Monte Carlo verteilen die Steuer ohne Pruefnetz | angenommen | Guard auf jede Core-Assettransaktion erweitert und im Standardpfad getestet |
| W02-2 | Claude 2026-07-27 | `netto: Math.max(0, brutto) - allocatedTax` klemmt nur `brutto`; die Regel „letzte Quelle erhaelt den Rest" kann einen negativen Nettowert erzeugen | angenommen | kapazitaetsbegrenzte gewichtete Steuerverteilung umgesetzt und getestet |
| W02-3 | Claude 2026-07-27 | degenerierter Gewichtungsfall (`taxableAfterTqfSigned` und `brutto` gesamt 0) weist die volle Steuer der letzten Quelle zu; nicht dokumentiert | angenommen | positive Steuer ohne Bruttokapazitaet blockiert fail-closed |
| W02-4 | Claude 2026-07-27 | Akzeptanzkriterien zu Lot- und Gold-Headroom-Kapazitaet sind unbedingt formuliert, gelten faktisch aber nur im Balance-Pfad; Scope-Begrenzung selbst korrekt eingehalten | angenommen | Reichweite in Akzeptanzkriterien, Nicht-Scope und Referenzdokumentation praezisiert |
| W02-5 | Claude 2026-07-27 | neue harte Fehlerpfade (fehlende `trancheId`, Ueberbuchung, Reconciliation) melden technische Texte ohne Handlungshinweis | angenommen | handlungsleitende `FinancialCalculationError`-Meldungen mit Context umgesetzt |
| X02-1 | Claude Re-Review 2026-07-27 | `engine/transactions/three-bucket-logic.mjs` enthaelt nach der Nachbesserung gemischte Zeilenenden (CRLF und LF); die uebrigen Engine-Dateien sind reines LF | offen - Hinweis | ausstehend |
