# Slice 08 - Liquiditaets-Runway und Puffervertrag

**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Branch-Entscheidung:** dauerhafte Nutzerentscheidung vom 2026-07-29 fuer
Slice 02 bis 13; kein neuer Feature-Branch  
**GitHub-Status:** Remote `origin` ist vorhanden; fuer den aktiven Branch ist
kein Upstream konfiguriert  
**Basiscommit:** `c95e202`  
**Status:** Implementierung und Behebung von CR08-1 bis CR08-16 abgeschlossen;
technische Gates und Ergebnisdokumentation ausgefuehrt; erneutes externes
Review ausstehend  
**Freigabe:** ausstehend; Codex nimmt keine Selbstfreigabe vor  
**Uebergeordneter Plan:**
[`BACKTEST_2000_2025_DATENPRUEFUNG.md`](./BACKTEST_2000_2025_DATENPRUEFUNG.md)

## Input aus dem Ergebnisdokument von Slice 07

Das vollstaendige Ergebnisdokument
`SLICE_BACKTEST_DATENPRUEFUNG_07_DEMOGRAFIE_PFLEGE_HINTERBLIEBENE.md`
ist die verbindliche Eingangsgrenze. Slice 07 ist durch Claudes Zweitreview
vom 2026-08-01 technisch freigegeben und als lokaler Commit `c95e202`
vorhanden.

Vor der Runway-Umsetzung muessen die zwei ausdruecklichen Auflagen des
Slice-07-Reviews geschlossen werden:

- **CR07-5:** Der Fallback des Hinterbliebenen-Readers muss mit dem
  dokumentierten Vertrag `percent`/`55` uebereinstimmen und gegen fehlende
  DOM-Felder gepinnt werden.
- **CR07-6:** Die amtlichen Pflege-Bestandsquoten duerfen nicht weiter als
  `validation_only` bezeichnet werden, solange keine fachlich definierte
  Validierungsregel existiert. Ohne neue Kalibrierungsentscheidung werden
  sie ehrlich als Kontextbeleg ohne Runtime-Validierung klassifiziert.

Die offenen Restrisiken CR07-4, CR07-7 bis CR07-15 sowie die uebernommenen
Restrisiken werden nicht still als Slice-08-Scope umgedeutet.

## Preflight vor Coding

**Gemessen am:** 2026-08-01  
**Aktiver Branch:** `codex/suite-datenintegritaet-hardening`  
**HEAD:** `c95e202 feat(simulator): implement slice 07 german demography care survivor contract`  
**Arbeitsbaum:** sauber (`git status --short` ohne Ausgabe)  
**Unerwartete Dateien:** keine  
**Branchstatus:** kein Upstream konfiguriert; die dokumentierte dauerhafte
Nutzerentscheidung erlaubt die lokale Fortsetzung auf diesem Branch

## Ziel und zu schliessende Befunde

**Befunde:** D-01, D-02 und der Runway-Namensanteil aus D-12  
**Vorgates:** CR07-5 und CR07-6  
**Planfindings:** P-02, P-03 und P-05

Liquiditaet deckt genau den eigenstaendig konfigurierten Runway, ohne ein
Rebalancing auf eine feste Aktien-/Liquiditaetsquote zu erzwingen. Runway vor
und nach den Jahrestransaktionen bleibt getrennt sichtbar; Warnungen,
Jahresminimum und Backtest-KPI verwenden den tatsaechlichen
Post-Transaktionsbestand.

P-03 ist durch die Reihenfolge der bereits vorliegenden lokalen Commits
aufgeloest: Slice 02 (`289471b`) und Slice 04 (`a33876c`) liegen vor Slice 08.
Das Abnahmekriterium wird trotzdem verhaltensbasiert und nicht an die unter
der alten Datenreihe auffaelligen Kalenderjahre 2004, 2005 und 2012 gebunden.

## Vorlaeufige Akzeptanzkriterien

1. `liquidityRunwayYears` ist der kanonische, end-to-end identische Name in
   UI, Request, Engine-Eingang und Export; Default ist 5 Jahre.
2. `liquidityRunwayYears` ist weder Alias noch Ableitung von
   `flexBudgetYears`.
3. Ein Jahresendbestand von 0 EUR Liquiditaet ergibt 0 Monate
   Post-Transaktions-Runway und 0 Prozent Post-Transaktions-Deckung.
4. `runway_min_coverage_pct`, Warnungen und Runway-Status verwenden den
   Post-Transaktionswert. Eine zwischenzeitliche 10.000-EUR-Notfuellung darf
   nach anschliessender Auszahlung nicht als Jahresenddeckung erscheinen.
5. Vor- und Post-Transaktions-Runway sind getrennte, eindeutig benannte
   Exportfelder mit dokumentierter Einheit und Jahreskonvention.
6. Ueberschussliquiditaet oberhalb des Runway darf investiert werden; eine
   durch Pufferverbrauch steigende Aktienquote ist zulaessig. Es findet kein
   Kauf oder Verkauf zur Wiederherstellung einer festen Aktienquote statt.
7. Die kuenftige Semantik von `targetEq` ist explizit entschieden und in UI,
   Sweep, Optimizer, Validator und VPW-Verwendung widerspruchsfrei.
8. Die bisherigen Eingaben `runwayTargetMonths` und `runwayMinMonths` sind
   entweder durch einen dokumentierten Migrationsvertrag ersetzt oder klar
   von `liquidityRunwayYears` abgegrenzt; es gibt keine dritte gleichartige
   Nutzereingabe ohne Prioritaetsregel.
9. CR07-5 ist durch einen fehlende-DOM-Felder-Witness geschlossen; Reader,
   Vertrag, Inventar und UI liefern `percent`/`55`.
10. CR07-6 ist entweder durch eine vorab fachlich festgelegte und pruefbare
    Validierungsregel geschlossen oder die Bestandsdaten sind ehrlich als
    reiner Kontextbeleg ohne Validierungsbehauptung klassifiziert.
11. Historische Referenzfaelle besitzen ein isoliertes Slice-07-zu-Slice-08-
    Delta-Ledger. Unerwarteter Outcomewechsel, auffaelliger FlowDelta oder
    unterschiedliche UI-/Engine-Parameternamen stoppen die Umsetzung.
12. `minimumFlexAnnual` wird nicht still begrenzt; Engine-Build, alle
    Pflichtgates und der Browserlauf sind gruen.

## Scope

Der Nutzer hat am 2026-08-01 den folgenden erweiterten Scope ausdruecklich
freigegeben:

- `types/liquidity-runway-contract.js` (neu) und `types/profile-types.js`;
- `Simulator.html` und `Balance.html`;
- `app/simulator/simulator-input-strategy.js`;
- `app/simulator/simulator-input-pension.js`;
- `app/simulator/simulator-engine-input.js`;
- `app/simulator/simulator-profile-inputs.js`;
- `app/simulator/simulator-main-profiles.js`;
- `app/simulator/simulator-engine-direct-utils.js`;
- `app/simulator/simulator-accumulation-year.js`;
- `app/simulator/simulator-year-result.js`;
- `app/simulator/simulator-sweep.js`;
- `app/simulator/simulator-main-sweep-ui.js`;
- `app/simulator/simulator-main-sweep-selftest.js`;
- `app/simulator/simulator-sweep-utils.js`;
- `app/simulator/sweep-runner.js`;
- `app/simulator/auto-optimize-evaluate.js`;
- `app/simulator/auto-optimize-param-meta.js`;
- `app/simulator/auto-optimize-params.js`;
- `app/simulator/auto-optimize-presets.js`;
- `app/simulator/auto-optimize-sampling.js`;
- `app/simulator/simulator-optimizer.js`;
- `app/simulator/simulation-data-inventory.js`;
- `app/simulator/german-demography-care-survivor-contract.js` (generiert);
- `app/simulator/historical-backtest-metrics.js`;
- `app/simulator/simulator-heatmap.js`;
- `app/simulator/simulator-input-validation.js`;
- `app/simulator/simulator-visualization.js`;
- `scripts/build-german-demography-care-survivor-contract.mjs`;
- `app/balance/balance-reader.js`;
- `app/balance/balance-binder-imports.js`;
- `app/profile/profilverbund-balance.js`;
- `app/profile/profilverbund-action-attribution.js`;
- `engine/core.mjs`;
- `engine/validators/InputValidator.mjs`;
- `engine/planners/alarm-policy.mjs`;
- `engine/planners/flex-rate-policy.mjs`;
- `engine/planners/minimum-flex-policy.mjs`;
- `engine/planners/spending-diagnosis.mjs`;
- `engine/planners/spending-guardrails.mjs`;
- `engine/planners/vpw-return-policy.mjs`;
- `engine/transactions/sale-engine.mjs`;
- `engine/transactions/transaction-utils.mjs`;
- `engine/transactions/transaction-action.mjs`;
- `engine/transactions/transaction-surplus.mjs`;
- `engine/transactions/transaction-opportunistic.mjs`;
- fokussierte Contract-, Engine-, Backtest-, Worker- und Browsertests;
- Dokumentations-Sync im Hauptplan und den betroffenen Referenzdokumenten.

Weitere produktive Dateien duerfen nur aufgenommen werden, wenn sie fuer die
bereits freigegebene end-to-end Parametergleichheit zwingend sind; jede solche
Erweiterung wird vor dem Edit in diesem Dokument nachgetragen.

**Scope-Nachtrag:** Die oben ergaenzten Historien-/Darstellungsadapter,
Inputvalidierung, Spending-Policy-Consumer und `sale-engine.mjs` waren fuer die
freigegebene end-to-end Namens-, KPI- und Goldband-Gleichheit erforderlich.
Dieser Nachtrag wurde waehrend des Implementierungslaufs und damit nicht vor
jedem einzelnen Edit protokolliert. Er erweitert den fachlichen Vertrag nicht;
die Abweichung von der vorgesehenen Dokumentationsreihenfolge bleibt fuer das
externe Review sichtbar.

## Nicht im Scope

- keine Mindest-Flex-, Floor-, Steuer-, Gold- oder Pflegekalibrierung;
- keine Aenderung von `flexBudgetYears` oder `minimumFlexAnnual`;
- keine neue feste Aktien-/Liquiditaetsquote;
- keine positionsspezifische Aktienrendite;
- keine Aenderung der in Slice 02 bis 07 gepinnten historischen Datenreihen;
- keine manuelle Aenderung von `engine.js`;
- keine Aenderung von `dist/` oder `RuheStandSuite.exe`.

## Diff-Risiko vor dem ersten Programmdatei-Edit

```text
Geplante Dateien:
- noch nicht freigegeben; die Voruntersuchung beruehrt voraussichtlich mehr
  als zehn produktive Vertragsgrenzen in app/, engine/, Simulator.html und
  types/
- tests fuer Reader-Fallback, Parametervertrag, Transaktionen,
  Post-Transaktions-Runway, Backtest-Delta, Worker und Browser
- docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_08_LIQUIDITAETS_RUNWAY_PUFFERVERTRAG.md
- docs/internal/BACKTEST_2000_2025_DATENPRUEFUNG.md
- betroffene Referenzdokumentation nach finalem Contract

Voraussichtliche Aenderungstiefe:
- riskant

Gefaehrdete bestehende Tests:
- Engine-Core-, Validator-, Liquiditaets-Guardrail- und Transaktionstests
- Simulator-Input-, Profilverbund-, Persistenz- und Optimizervertraege
- Sweep-/Monte-Carlo-/Worker-Paritaet und Messfixtures
- historischer Backtest, KPI-, Export- und Browser-Contracts

Nicht anfassen:
- Mindest-Flex-, Floor-, Steuer-, Gold- und Pflegesemantik
- flexBudgetYears und minimumFlexAnnual
- historische Datenreihen aus Slice 02 bis 07
- engine.js, dist/ und RuheStandSuite.exe

Rollback-Strategie:
- nach Freigabe geaenderte versionierte Dateien gezielt mit
  git checkout -- <datei...> auf Basiscommit c95e202 zuruecksetzen
- neue Slice-Datei nur nach ausdruecklicher Freigabe loeschen
- keine Hard-Resets oder sonstigen destruktiven Git-Kommandos
```

Die Voruntersuchung zeigt, dass ein end-to-end konsistenter Ersatz der zwei
bisherigen Runway-Eingaben zusammen mit den Slice-07-Vorgates mehr als zehn
produktive Programm-/Konfigurationsdateien benoetigt. Der Nutzer hat diese
Ueberschreitung am 2026-08-01 mit „Setze ihn genauso um“ ausdruecklich
freigegeben.

## Offene Entscheidungen und Stopstatus

### S08-STOP-01 - `targetEq`

Der Nutzervertrag verbietet eine feste Zielallokation. `targetEq` steuert
heute jedoch Ueberschuss- und opportunistische Transaktionen, die erwartete
VPW-Realrendite, Validator, Sweep und Optimizer. Ohne Entscheidung wuerde der
Parameter nach Entfernung der Transaktionswirkung still seine Bedeutung
aendern.

**Entschieden:** `targetEq` entfaellt als Nutzer-, Sweep- und
Optimizerparameter sowie aus allen Transaktions-Allokationsentscheidungen.
Die VPW-Gewichtung wird aus der tatsaechlichen Aktien-, Gold- und
Liquiditaetszusammensetzung des jeweils an die Engine gereichten Portfolios
abgeleitet. Ueberschussinvestitionen schuetzen den Runway, bedienen einen
weiterhin separaten Goldvertrag und lassen den verbleibenden Betrag in
Aktien fliessen, ohne eine Aktienquote wiederherzustellen.

### S08-STOP-02 - Runway-Parameterprioritaet

`liquidityRunwayYears` tritt laut Plan neben `runwayTargetMonths` und
`runwayMinMonths`. Ohne Migrations- und Prioritaetsregel entstehen drei
Nutzereingaben fuer dieselbe Groesse.

**Entschieden:** `liquidityRunwayYears` ersetzt die zwei bisherigen
Nutzereingaben kanonisch. Legacy-Daten priorisieren
`runwayTargetMonths`; nur wenn das Ziel fehlt, wird `runwayMinMonths`
verwendet. Die von der alten UI erlaubten ganzzahligen Zielwerte 18 bis 72
Monate und Mindestwerte 12 bis 60 Monate werden sicherheitsorientiert auf das
naechste Sechsmonatsraster aufgerundet und dann durch 12 geteilt. Eine
Migration verkuerzt den bisherigen Puffer damit nie. Ohne Altwert gilt der
neue Default von 5 Jahren. Der Engine-interne harte Mindestwert bleibt
abgeleitete Policy und ist keine dritte Nutzereingabe.

### S08-STOP-03 - Programmdateigrenze

Die Kombination aus CR07-5/CR07-6, kanonischem UI-/Request-/Engine-/Export-
Namen, Migration, Transaktionssemantik und Persistenz ueberschreitet zehn
produktive Dateien. **Entschieden:** Der Nutzer hat den oben einzeln
aufgefuehrten erweiterten Scope freigegeben.

## Baseline vor dem ersten Programmdatei-Edit

Am 2026-08-01 auf Basiscommit `c95e202` ausgefuehrt:

- `tests/simulator-input-readers.test.mjs`: 53/53 Assertions gruen;
- `tests/balance-reader.test.mjs`: 149/149 Assertions gruen;
- `tests/vpw-return-policy.test.mjs`: gruen;
- `tests/liquidity-guardrail.test.mjs`: gruen;
- `tests/simulator-sweep.test.mjs`: gruen;
- `tests/auto-optimize-fidelity.test.mjs`: 192/192 Assertions gruen;
- `tests/profilverbund-balance.test.mjs`: 127/127 Assertions gruen;
- `tests/historical-backtest-metrics.test.mjs`: 298/298 Assertions gruen;
- `tests/simulator-backtest-characterization.test.mjs`: 193/193 Assertions
  gruen;
- `tests/balance-ui-orchestration.test.mjs`: 245/245 Assertions gruen.

Ein zunaechst angesetzter Dateiname
`tests/balance-import-recovery.test.mjs` existiert nicht. Der relevante
Import-/Recovery-Vertrag ist in `tests/balance-ui-orchestration.test.mjs`
registriert und wurde dort erfolgreich ausgefuehrt; dies ist kein roter
Produktzustand.

## Ausgefuehrte Tests und Nachweise

- `tests/liquidity-runway-contract.test.mjs`: 364/364 Assertions
  ausschliesslich
  fuer Namen, Default, Domain 1 bis 10, Schrittweite 0,5, ungueltige Werte,
  Migrationsprioritaet, alle 104 von der alten UI erlaubten Monatswerte und
  abgeleitete harte Mindest-Policy. Transaktionen, VPW, Runway-Phasen, Sweep
  und Optimizer werden in ihren jeweiligen Fachtests geprueft;
- CR07-5-Witness fuer fehlende DOM-Felder in
  `tests/simulator-input-readers.test.mjs`;
- CR07-6-Witness in Dateninventar, Generator und Demografie-Contract;
- fokussierte Engine-, Backtest-, Sweep-, Optimizer-, Worker-, Import- und
  Profilverbundtests innerhalb der Gesamtsuite;
- `npm run build:engine`: erfolgreich; der generierte Fallback-Wrapper blieb
  unveraendert;
- `npm test`: 160/160 Testdateien, 17.650/17.650 Assertions, keine
  fehlgeschlagene Datei und keine offenen Handles.

- `npm run test:browser`: 28/28 Browser-Workflows gruen. Die bestehenden
  Diagnosefixtures behalten ihre urspruenglichen Liquiditaetswerte und
  isolieren den Altvertrag ueber einen Einjahres-Runway. Ein neuer echter
  Browser-Witness fuehrt zwei ansonsten identische Balance-Laeufe mit einem
  beziehungsweise fuenf Jahren aus und misst 50.000 EUR gegen 90.000 EUR
  Bruttoverkauf.
- `npm run test:coverage`: 160/160 Testdateien und 17.650/17.650 Assertions
  gruen, 78,23 Prozent Zeilenabdeckung (39.024/49.886); beide obligatorischen
  Dateigates bestanden.
- `npm run verify:german-demography-data`: erfolgreich; der Mortalitaetshash
  lautet `88c1000eac950016a65e7408127d5c1256683946933b710a0c28f672fde5f232`.
- `npm run docs:evidence`: erfolgreich, rein lokale statische Validierung ohne
  Netzwerkzugriff.
- `git diff --check`: erfolgreich nach dem finalen Dokumentations-Sync.

## Ergebnisse

- `liquidityRunwayYears` ist der einzige aktuelle Runway-Input mit Default 5,
  Domain 1 bis 10 und Schritt 0,5. Legacy-Werte migrieren in der Prioritaet
  kanonisch, Zielmonate, Mindestmonate, Default. Ganzzahlige Altwerte aus den
  damaligen UI-Domains werden vor der Division durch 12 auf das naechste
  Sechsmonatsraster aufgerundet; beispielsweise werden 25 Monate zu 30
  Monaten beziehungsweise 2,5 Jahren. Originalwert, normalisierter Monatswert
  und Rundungsart bleiben in der Aufloesungsdiagnose sichtbar.
- Das exakte Ziel ist effektiver Nettojahresbedarf mal konfigurierte Monate;
  die harte Mindestgrenze ist `min(Zielmonate, 24)` und keine Nutzereingabe.
- `targetEq` ist aus UI, Request, Validator, Sweep, Optimizer und
  Transaktionsallokation entfernt. VPW gewichtet die tatsaechliche Aktien-,
  Gold- und Liquiditaetszusammensetzung.
- `rebalancingBand` ist das einzige aktuelle Goldband. Der Sweep besitzt
  sieben sichtbare Dimensionen, Auto-Optimize sechs; `maxBearRefillPct` ist
  nur im Sweep enthalten.
- Jahresend-Runway und `runway_min_coverage_pct` werden aus der finalen
  operativen Liquiditaet nach Transaktionen und Auszahlung berechnet. Die
  Messphase ist als `post_payout_end_of_year` exportiert; 0 EUR ergeben 0
  Monate und 0 Prozent.
- Bestehende Logfelder behalten ihre bisherige Bedeutung:
  `safety_runway_post_months` beschreibt weiterhin den Safety-Runway und
  `liqEnd` weiterhin den Bestand nach Zins. Die neuen eindeutigen Felder
  `runway_post_payout_end_of_year_months`,
  `liq_post_payout_end_of_year` und
  `liq_post_accumulation_end_of_year` tragen die neue Jahresendsemantik.
- Der Runway-Resolver nutzt leere kanonische Werte nicht als Sperre fuer
  Legacy-Felder. Nichtleere ungueltige Werte, Werte ausserhalb 1 bis 10 sowie
  Nicht-0,5-Schritte scheitern kontrolliert; Recovery-Exporte bleiben mit
  feldgenauer Warnung moeglich. VPW verwendet bei fehlendem Aktiengewicht den
  bisherigen 60-Prozent-Fallback.
- Der undokumentierte Verkaufsfaktor 1,25 ist entfernt. Verkaufsbudgets sind
  jetzt aus dem Nettobedarf und dem maximalen effektiven Steuersatz hergeleitet
  und werden danach kanonisch aufgerundet.
- Die vor Slice 08 bestehende Goldsemantik bleibt erhalten: interner Fallback
  35, aktiver Reader bei fehlendem Wert `NaN`/fail-closed; die explizite
  UI-Vorgabe 25 bleibt eine Eingabe und wird nicht zum Engine-Fallback.
- CR07-5 liefert bei fehlenden DOM-Feldern den Vertrag `percent`/`55`.
  CR07-6 klassifiziert amtliche Pflegepraevalenzen als Kontextbeleg ohne
  behauptete Runtime-Validierung.
- Die Slice-07-Eingangsfixtures bleiben byte-identisch. Die geschuetzten
  SHA-256-Werte sind `cdf879d5...05cf9` (Backtest-Ziel),
  `956a3539...25ba3` (Demografie-Delta) und `1eac45e4...b7fc`
  (Monte-Carlo-Runtime-Messung).
- Die neue Backtest-Messfixture umfasst 11 Faelle, davon 5 Negativfaelle und
  1 Ruinfall, bei maximalem absolutem `portfolio_flow_delta` 0. Das echte
  Slice-07-zu-Slice-08-Ledger misst im aktiven Arm Endvermoegen
  -48.559,87 EUR, Entnahmen +15.000 EUR, Steuer -3.157,35 EUR,
  Mindest-Runway -38,457989 Prozentpunkte und maximalen Drawdown
  +0,298700 Prozentpunkte. Im Referenzarm betragen die Deltas
  -80.782,77 EUR, +42.000 EUR, -2.293,69 EUR, -39,687904 Prozentpunkte und
  +0,426498 Prozentpunkte; Outcome bleibt `completed`, FlowDelta bleibt 0.
  Der davon getrennte CAPE-an/aus-Vergleich innerhalb des aktuellen Laufs
  bleibt als eigenes Orakel erhalten und wird nicht als Slice-Wirkung
  bezeichnet.
- Das Slice-06-zu-Slice-07-Orakel mit allen zehn exakten Kennzahlen und die
  fruehen Lohnfaelle sind wieder live gepinnt. Das Demografie-Gate berechnet
  den aktuellen Lauf stets neu, vergleicht ihn mit der Slice-08-Zielfixture
  und prueft separat die stabilen Slice-07-Demografieinvarianten.
- Die Monte-Carlo-Messfixture inventarisiert alle 98 geaenderten Blattpfade
  mit getrennten CaR-, Auto-Optimize- und Final-Hashes. Runtime-Erkennung,
  Toleranzvergleich und feldgenaue Diffs laufen wieder gegen eine unabhaengig
  geladene Zielfixture. Beide Slice-08-Fixtures bleiben
  `reviewStatus: pending`.

## Freigabestatus

Implementierung, CR08-1-bis-CR08-16-Behebung und interne technische Nachweise
sind abgeschlossen. Erneutes technisches Fremdreview und Freigabe bleiben
ausstehend; Codex erteilt keine Selbstfreigabe und erstellt keinen Commit.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| CR07-5 | Claude-Review Slice 07 Runde 2 | Reader-Fallback widerspricht Vertrag und UI | als Vorgate uebernommen | `percent`/`55` umgesetzt und mit Missing-DOM-Witness gepinnt |
| CR07-6 | Claude-Review Slice 07 Runde 2 | `validation_only` ohne Validierung | als Vorgate uebernommen; ohne neue Kalibrierung Kontextklassifikation vorgesehen | als `context_only` ohne Runtime-Validierungsbehauptung umgesetzt |
| P-03 | Claude-Planreview | Slice 08 hing an alten Markerjahren vor Slice 02 | angenommen | Reihenfolge durch vorhandene Commits geschlossen; AK verhaltensbasiert formuliert |
| S08-STOP-01 | Preflight Slice 08, Nutzer | `targetEq`-Semantik nach Wegfall fester Zielquote offen | Parameter entfernen; VPW aus Istportfolio gewichten | umgesetzt; externe Pruefung ausstehend |
| S08-STOP-02 | Preflight Slice 08, Nutzer | drei konkurrierende Runway-Eingaben ohne Prioritaet | `liquidityRunwayYears` ersetzt beide Legacy-Eingaben mit Ziel-vor-Minimum-Migration | umgesetzt; externe Pruefung ausstehend |
| S08-STOP-03 | Preflight Slice 08, Nutzer | mehr als zehn Programmdateien | einzeln dokumentierten erweiterten Scope freigeben | umgesetzt; Scope-Nachtrag transparent dokumentiert |
| CR08-1 | Claude-Review (Runde 1) | Das Slice-07-Laufzeitmessgate ist abgeschaltet: keine Live-Berechnung, keine Vergleichsassertion, verbleibende Pruefungen lesen die Fixture ueber sich selbst | angenommen | Live-`captureMeasurement()` immer aktiv; aktueller Vollvergleich plus separate Slice-07-Invarianten |
| CR08-2 | Claude-Review (Runde 1) | Cross-Slice-Orakel `Slice06To07MortalityBacktestDeltaV1` und alle exakten Slice-06/07-Goldwerte ersatzlos entfernt, teils durch `Number.isFinite` ersetzt | angenommen | Slice-06-Fixture per Bytehash geschuetzt; zehn exakte Cross-Slice-Kennzahlen und fruehe Lohnorakel wiederhergestellt |
| CR08-3 | Claude-Review (Runde 1) | AK 11 unerfuellt: kein isoliertes Slice-07-zu-Slice-08-Delta-Ledger; dokumentiert ist das slice-interne CAPE-Orakel mit teils entgegengesetztem Vorzeichen | angenommen | echtes Slice-07-zu-Slice-08-Ledger fuer aktiven und Referenzarm mit exakten Deltas hinzugefuegt; CAPE-Orakel getrennt benannt |
| CR08-4 | Claude-Review (Runde 1) | Monte-Carlo-Messvertrag: alle `compareSnapshotNode`-Vergleiche und die Runtime-Erkennung entfernt; Toleranzapparat ist toter Code, Policy wird weiter behauptet | angenommen | Runtime-Erkennung und rekursiver Snapshotvergleich wieder aktiv; 98 konkrete Blattpfade statt nur Zaehlwert gespeichert |
| CR08-5 | Claude-Review (Runde 1) | `resolveLiquidityRunwayYears` prueft Existenz statt Endlichkeit; `undefined` unterdrueckt die Legacy-Migration, `null`/`''` ergeben 0, negative Werte invertieren die harte Untergrenze | angenommen | Leerwerte lassen Legacy-Aufloesung zu; nichtleere ungueltige Werte liefern `NaN`; Domain und Schrittweite validiert; Policy und Import scheitern kontrolliert |
| CR08-6 | Claude-Review (Runde 1) | VPW-Aktiengewicht faellt bei fehlendem `equityWeightPct` auf 0 Prozent statt 60; der Pfad ist durch kein Gate belegt | angenommen | 60-Prozent-Fallback in beiden VPW-Modi wiederhergestellt und samt Gewichtssumme gepinnt |
| CR08-7 | Claude-Review (Runde 1) | AK 3 an der Nullgrenze verletzt: Jahresbedarf 0 ergibt 100 Prozent Deckung und `Infinity` Monate; Ansparphase nutzt fuer dieselbe Bedingung ein anderes Sentinel | angenommen | einheitlicher endlicher Null-Sentinel: 0 Monate; Ziel 0 mit Bestand 0 ergibt 0 Prozent, mit positivem Bestand 100 Prozent |
| CR08-8 | Claude-Review (Runde 1) | `safety_runway_post_months` und `liqEnd` behalten ihren Namen bei geaenderter Bedeutung | angenommen | Altsemantik beider Felder wiederhergestellt; neue eindeutige Post-Payout-/Anspar-Jahresendfelder hinzugefuegt |
| CR08-9 | Claude-Review (Runde 1) | Undokumentierter Faktor 1,25 an drei Stellen des opportunistischen Refills verkauft mehr Aktien als benoetigt, auch in den Notpfaden | angenommen | Faktor entfernt; Bruttobudget exakt aus Nettobedarf und maximalem effektivem Steuersatz hergeleitet und quantisiert |
| CR08-10 | Claude-Review (Runde 1) | `InputValidator`: Bandbereich auf 0 bis 100 geweitet, Fehlertext nennt weiterhin 1 bis 20 Prozent; Aktienquotenpruefung ersatzlos entfallen | angenommen | Goldbandtext auf 0 bis 100 korrigiert; Runway-Schrittvalidierung ergaenzt; entfernte feste Aktienquote wird nicht als Schein-Invariante reaktiviert |
| CR08-11 | Claude-Review (Runde 1) | `DATA_SOURCES.md` fuehrt den ueberholten `careObservationHash`; `docs:evidence` erkennt die Abweichung nicht | angenommen | Hash synchronisiert; Architektur-Evidenz vergleicht Dokument und generierten Vertrag und besitzt einen Negativwitness |
| CR08-12 | Claude-Review (Runde 1) | Ergebnisdokument beschreibt den Umfang von `tests/liquidity-runway-contract.test.mjs` falsch; Domain und alle Ungueltigkeitspfade sind ungetestet | angenommen | Beschreibung korrigiert; Contracttest auf 364 Assertions fuer Domain, Schritt, Leer-/Fehlerwerte, alle alten UI-Monatswerte, Migration und Policy erweitert |
| CR08-13 | Claude-Review (Runde 1) | Goldverhalten geaendert, obwohl Goldkalibrierung ausdruecklich nicht im Scope ist; Bandvorgabe wechselt von 35 beziehungsweise NaN auf 25 | angenommen | bestehende 35-/`NaN`-Fallbacks wiederhergestellt; expliziter UI-Wert 25 bleibt unveraendert Eingabe |
| CR08-14 | Claude-Review (Runde 1) | Zwei Browserfixtures wurden verzehnfacht statt die neue Zwangsverkaufswirkung des Fuenfjahres-Runways zu messen | angenommen | alte Cashwerte wiederhergestellt; neuer echter 1-Jahr-/5-Jahre-Browservergleich misst 50.000/90.000 EUR Verkauf |
| CR08-15 | Claude-Review (Runde 1) | Diagnosetiefe verloren: Zielfixture nur noch als Hash verglichen, `collectDiffs` und `coalesceFinite` sind toter Code, Selbsttesttext beschreibt die Variation falsch | angenommen | feldgenaue Backtest-/MC-Vergleiche reaktiviert, `coalesceFinite` entfernt und Selbsttesttext fuer Goldband plus Runway korrigiert |
| CR08-16 | Claude-Review (Runde 2) | Legacy-Runwaywerte, die nicht auf einem 0,5-Jahres-Schritt liegen, sind nach der Nachbesserung nicht mehr migrierbar; Profil laedt nicht, Import scheitert | angenommen | Alte UI-Domains explizit inventarisiert; alle 104 Werte werden auf das naechste Halbjahr aufgerundet, Profil- und Balance-V1-Pfad mit 25 Monaten gepinnt |
| CR08-17 | Claude-Review (Runde 2) | Der Steuer-Hochrechnungsfaktor ersetzt 1,25 durch rund 1,358; die Kirchensteuerklammer wandelt eine Einheitenverwechslung in ein hundertfaches Budget statt in einen Fehler | offen | ausstehend |
| CR08-18 | Claude-Review (Runde 2) | Der neue einheitliche Null-Sentinel meldet einen unbegrenzten Runway als 0 Monate und wertet Zielbedarf 0 mit Bestand 0 als maximale Runway-Not | offen | ausstehend |
| CR08-19 | Claude-Review (Runde 2) | Die dokumentierte `npm test`-Assertionszahl 17.189 weicht vom gemessenen und im eigenen Coveragepunkt genannten Wert 17.331 ab | gekoppelt korrigiert | Nach CR08-16 auf demselben Stand neu gemessen und einheitlich als 17.650/17.650 dokumentiert |
| CR08-20 | Claude-Review (Runde 2) | Der neue Browser-Witness pinnt nur die Richtung, nicht die dokumentierten 50.000/90.000 EUR; die Debugprojektion im 3-Bucket-Workflow bleibt stehen | offen | ausstehend |
| CR08-21 | Claude-Review (Runde 2) | Die fruehen Lohn-Goldfaelle wurden mit geaenderten Werten neu verankert; diese zusaetzliche Slice-08-Wirkung ist nirgends berichtet | offen | ausstehend |
| CR08-22 | Claude-Review (Runde 3) | Die Aufrundung veraendert 45 von 55 Ziel- und 40 von 49 Mindestwerten um bis zu 5 Monate; die Wirkung dieser Pufferanhebung auf Zwangsverkauf und Steuer ist nicht beziffert | offen | ausstehend |
| CR08-23 | Claude-Review (Runde 3) | Kein Rueckfall auf einen migrierbaren Mindestwert, wenn der Zielwert ausserhalb der alten Domain oder nicht ganzzahlig ist; die `migrationPrecedence` des Vertrags suggeriert das Gegenteil | offen | ausstehend |

## Review-Feedback von Claude

Der folgende Abschnitt bleibt als unveraendertes Protokoll der Reviewrunde 1
erhalten. Die Umsetzungsantworten stehen in der Tabelle oberhalb; eine erneute
externe Bewertung ist noch nicht erfolgt.

**Reviewdatum:** 2026-08-01
**Pruefstand:** Arbeitsbaum auf Basiscommit `c95e202`, 82 geaenderte versionierte
Dateien, 5 neue Dateien, 1.081 hinzugefuegte und 1.287 entfernte Zeilen.
**Rolle:** adversariales Fremdreview; keine Aenderung an Programmdateien.

### Selbstaendig nachgefahrene Gates

| Gate | Ergebnis | Dokumentbehauptung |
|---|---|---|
| `npm test` | 160 Testdateien, 17.146/17.146 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles, 1 separates Gate | bestaetigt |
| `npm run test:browser` | 27/27 Workflows | bestaetigt |
| `npm run test:coverage` | 77,95 Prozent (38.787/49.759), Dateigates bestanden, `types/liquidity-runway-contract.js` 93,55 Prozent (58/62) | bestaetigt |
| `npm run docs:evidence` | erfolgreich, rein lokal | bestaetigt |
| `npm run build:engine` | Fallback-Build, `engine.js` und `dist/` unveraendert | bestaetigt |
| `git diff --check` | sauber | bestaetigt |
| Geschuetzte Fixture-Hashes | `cdf879d5...a05cf9`, `956a3539...9825ba3`, `1eac45e4...69db7fc` byteidentisch | bestaetigt |

Die numerischen Angaben des Ergebnisdokuments sind, soweit sie Gates und
Fixturewerte betreffen, reproduzierbar. Die Beanstandungen betreffen nicht die
Zahlen, sondern das, was diese Zahlen noch absichern.

### Pruefdimension 1: Korrektheit

**CR08-1 (Blocker).** `tests/demography-care-survivor-runtime-measurement.test.mjs`
ist kein Messgate mehr. Drei Aenderungen zusammen heben seine Wirkung auf:

1. `const actualMeasurement = captureMode ? await captureMeasurement() : null;` -
   im Regelbetrieb wird ueberhaupt nichts mehr berechnet.
2. Die Vergleichsassertion
   `assert.deepEqual({ ...actualMeasurement, runtime: ... }, fixture.targetMeasurement)`
   ist geloescht.
3. Die vier verbliebenen Verhaltenspruefungen (`anyCareRunCount > 0`,
   `p1DeathEvents > 0`, `p2DeathEvents > 0`, `widowP1ActiveYears > 0`) lesen
   jetzt `fixture.targetMeasurement.*` statt `actualMeasurement.*`. Sie pruefen
   eine statische JSON-Datei gegen sich selbst und sind damit tautologisch.

Uebrig bleiben ein Byte-Hash der Fixture und Aussagen ueber deren Inhalt.

Gegenprobe D: `INITIAL_ENTRY_GRADES` in `app/simulator/simulator-engine-helpers.js:604`
von `[1, 2]` auf `[1, 2, 3]` geaendert - also das Pflege-Eintrittsmodell der
Laufzeit materiell veraendert. Ergebnis: das Messgate meldet 19/19 gruen, und
die **gesamte Suite bleibt mit 17.146/17.146 Assertions gruen**. Vor Slice 08
haette dieses Gate genau diese Mutationsklasse gefangen; das war die in Runde 2
von Slice 07 nachgewiesene Grundlage der Freigabe von CR07-2. Die Datei wurde
byteidentisch zurueckgesetzt.

Damit ist **CR07-2 wieder offen**. Slice 08 nimmt die Schliessung eines
Slice-07-Blockers zurueck, ohne dies in den Ergebnissen oder in der
Entscheidungstabelle zu erwaehnen.

**CR08-2 (Blocker).** In `tests/simulator-backtest-characterization.test.mjs`
sind entfernt:

- das vollstaendige Orakel `Slice06To07MortalityBacktestDeltaV1` samt seinen
  acht harten Assertionen (`-19225.84`, `3000`, `1124.01`, `-3.740149`,
  `12940.41`, `-24000`, `4458.88`, `-2.543821`) und beiden FlowDelta-Nullproben;
- die Bytehash-Bindung der Slice-06-Fixture `cape-wage-backtest-delta-v3.json`
  (`71bad07c...`) - sie ist jetzt nur noch im Traceability-Ledger und in einer
  archivierten Fixture erwaehnt, aber in keinem Test mehr geprueft;
- saemtliche exakten Goldwerte der Faelle `wage_indexed_pension_jst_1930_1940`
  und `..._1935_1946` sowie des Default-CAPE-Orakels; an ihre Stelle treten
  `assert(Number.isFinite(...))`.

Gegenprobe: eine Suche nach `24483.08`, `2735439.56`, `2670178.4`, `5141746.5`,
`9.287973`, `19225.84` und `12940.41` findet in `tests/` **keinen einzigen
Treffer** mehr. Kein exakter Slice-06- oder Slice-07-Wert ist noch an das
laufende Verhalten gebunden. Die Slice-07-Beweiskette besteht nur noch aus dem
Bytehash einer archivierten JSON-Datei plus der Aussage, dass die aktuellen
Werte Zahlen sind.

Dass die absoluten Werte sich durch Slice 08 aendern mussten, ist unstrittig.
Die regelkonforme Reaktion ist eine Neuverankerung mit den neuen Werten, nicht
der Wechsel auf `Number.isFinite`. Beides - Loeschung und Abschwaechung - fehlt
in Scope, Ergebnissen und Entscheidungstabelle.

**CR08-3 (Blocker).** AK 11 verlangt ein isoliertes
Slice-07-zu-Slice-08-Delta-Ledger. `tests/fixtures/liquidity-runway-slice-08-measurement-v1.json`
ist keines: es enthaelt einen Hash des aktuellen Laufs, vier Zaehlwerte und das
**slice-interne** CAPE-an/aus-Orakel. Die im Ergebnisdokument als
Slice-08-Wirkung praesentierten Zahlen (+56.705,98 EUR, -30.000 EUR,
-4.318,72 EUR, +10,517888 pp, -0,14422 pp) sind die Differenz zwischen dem
aktiven und dem Referenz-CAPE-Arm **innerhalb desselben Laufs**.

Die tatsaechliche Slice-07-zu-Slice-08-Wirkung laesst sich aus der archivierten
Slice-07-Fixture direkt berechnen. Aktiver CAPE-Arm:

| Kennzahl | Slice 07 | Slice 08 | Delta |
|---|---|---|---|
| `summaryEndWealth` | 2.764.111,02 | 2.715.551,15 | **-48.559,87** |
| `totalWithdrawal` | 774.000 | 789.000 | **+15.000** |
| `totalTax` | 96.130,66 | 92.973,31 | **-3.157,35** |
| `minRunwayCoveragePct` | 68,979716 | 30,521727 | **-38,457989** |
| `maxDrawdownPct` | 6,167425 | 6,466125 | **+0,2987** |

Referenzarm: -80.782,77 EUR, +42.000 EUR, -2.293,69 EUR, -39,687904 pp,
+0,426498 pp.

Bei Endvermoegen und Entnahme ist das **Vorzeichen dem dokumentierten
entgegengesetzt**, bei der Mindest-Runway-Deckung ist die Groessenordnung um den
Faktor 3,7 verfehlt und die Richtung gedreht. Das ist exakt die Fehlerklasse
CR07-1 aus Slice 07, diesmal ohne jedes Cross-Slice-Orakel, das sie auffangen
koennte.

Die Deckungsangabe verdient eigene Aufmerksamkeit: die minimale Runway-Deckung
faellt von 69,0 auf 30,5 Prozent. Der Nennerwechsel von 36 auf 60 Zielmonate
erklaert davon nur einen Teil (69,0 mal 36/60 ergaebe 41,4); der Rest stammt aus
der Verlagerung auf den Post-Transaktionswert. Beides ist gewollt, aber die
Groessenordnung ist nirgends beziffert.

### Pruefdimension 2: Vertragstreue

**CR08-4.** `tests/monte-carlo-measurement-contract.test.mjs` verliert alle drei
`compareSnapshotNode`-Aufrufe gegen `postBacktestData06` und die
Runtime-Erkennung `sameRuntime`. An ihre Stelle tritt ein reiner
SHA-256-Vergleich gegen eine selbst aufgenommene Fixture mit
`reviewStatus: pending`. Folgen:

- `compareSnapshotNode` und `resolveTolerance` sind toter Code; der
  Toleranzapparat des Messvertrags ist nicht migriert, sondern verwaist.
- `snapshotPolicy.comparisonRules.sameRuntime` wird weiterhin assertiert,
  obwohl die Regel auf den aktiven Snapshot nicht mehr angewandt wird.
- Der Vergleich ist jetzt bitgenau ohne deklarierte Toleranz. Das ist mein
  Slice-07-Finding CR07-13, hier auf den gesamten Monte-Carlo-Vertrag
  ausgeweitet - und diesmal wurde eine vorhandene Runtime-Abfederung aktiv
  entfernt.

**CR08-5.** `resolveLiquidityRunwayYears` entscheidet mit
`Object.prototype.hasOwnProperty`, nicht mit einer Endlichkeitspruefung.
Gemessenes Verhalten:

| Eingabe | Ergebnis |
|---|---|
| `{ liquidityRunwayYears: undefined, runwayTargetMonths: 36 }` | `NaN`, `source: canonical` - **Legacy-Migration wird uebersprungen** |
| `{ liquidityRunwayYears: null, runwayTargetMonths: 36 }` | `0`, `source: canonical` |
| `{ liquidityRunwayYears: '' }` | `0`, `source: canonical` |
| `{ liquidityRunwayYears: -4 }` | `-4`, `source: canonical` |
| `deriveLiquidityRunwayPolicy(-4)` | `hardMinimumMonths: -48` |

Die erste Zeile trifft S08-STOP-02 im Kern: ein per Spread erzeugtes Objekt mit
gesetztem, aber undefiniertem Kanonschluessel verwirft die Legacy-Werte
stillschweigend. `simulator-profile-inputs.js` schuetzt sich davor mit einer
eigenen Praefilterung - der Vertrag selbst tut es nicht, und genau er ist die
Stelle, die kuenftige Konsumenten benutzen werden. Die negative harte
Untergrenze kehrt zusaetzlich die Bedeutung von `runwayStatus` um: gegen `-48`
ist jeder Runway `warn` statt `bad`. Beide aeusseren Validatoren fangen den Fall
heute ab; der Vertrag haelt seine eigene Zusage nicht.

**CR08-8.** `safety_runway_post_months` behaelt seinen Namen, transportiert aber
nicht mehr `dynamicFlexSafetyRunwayMonate`, sondern den neuen
Post-Auszahlungswert; `liqEnd` wechselt von `liqNachZins` auf `liquiditaet`.
AK 5 ist fuer die drei Phasen formal erfuellt, aber ein bestehender Konsument
liest unter unveraendertem Namen eine andere Groesse.

**CR08-10.** `InputValidator.mjs` weitet `rebalancingBand` von 1 bis 20 auf 0 bis
100, laesst aber den Fehlertext "Rebalancing-Band muss zwischen 1% und 20%
liegen." stehen. Ein abgelehnter Wert erhaelt damit eine nachweislich falsche
Begruendung. Die Aktienquotenpruefung entfaellt ersatzlos - konsequent, aber
ohne Ersatzinvariante fuer die neue Allokationsfreiheit.

### Pruefdimension 3: Fehlerbehandlung

**CR08-6.** `deriveCAPEContinuousReturn` und `deriveCAPELegacyStepReturn` fallen
bei fehlendem `equityWeightPct` von 60 auf **0 Prozent** Aktiengewicht zurueck.
Der Ausfallwert ist damit nicht mehr plausibel, sondern der Extremwert der
Domain: die erwartete Realrendite kollabiert auf die Sicherheitsrendite und die
VPW-Entnahme sinkt entsprechend.

Gegenprobe C: beide Ausfallwerte von `0` auf `60` zurueckgesetzt - `npm test`
und `tests/vpw-return-policy.test.mjs` bleiben vollstaendig gruen (102/102 und
176/176). Der Pfad ist durch kein einziges Gate belegt. Die Datei wurde
byteidentisch zurueckgesetzt.

**CR08-7.** In `simulator-year-result.js` gilt
`runwayCoveragePct = zielLiquiditaet > 0 ? (liquiditaet / zielLiquiditaet) * 100 : 100`.
Bei einem effektiven Nettojahresbedarf von 0 - etwa bei vollstaendiger Deckung
durch Renten - meldet die Kennzahl **100 Prozent Deckung auch bei 0 EUR
Liquiditaet**, und `runwayMonths` wird `Infinity`. AK 3 haelt nur, solange das
Ziel positiv ist. `simulator-accumulation-year.js:188` verwendet fuer dieselbe
Bedingung `Infinity` statt `100`; dieselbe Exportspalte `RunwayCoveragePct`
fuehrt damit zwei verschiedene Sentinel-Werte, und `Infinity` ist in JSON nicht
darstellbar.

### Pruefdimension 4: Seiteneffekte

**CR08-9.** `transaction-opportunistic.mjs` fuehrt an drei Stellen einen
unkommentierten Faktor `1.25` ein:
`Math.min(aktienwert, Math.max(effectiveTotalerBedarf, effectiveLiquiditaetsBedarf) * 1.25)`
sowie zweimal `Math.min(effectiveLiquiditaetsBedarf * 1.25, aktienwert)` in den
Notpfaden `belowAbsoluteFloor` und `isCriticalLiquidity`. Dort wurde zuvor
**exakt der Bedarf** verkauft. Die Engine realisiert damit systematisch bis zu
25 Prozent mehr steuerpflichtige Gewinne als noetig. Es gibt kein
Akzeptanzkriterium, keine Begruendung und keinen gezielten Test; Gegenprobe B
(1,25 auf 1,30) faellt lediglich ueber den Aggregathash auf.

**CR08-13.** "Nicht im Scope" schliesst Goldkalibrierung aus. Tatsaechlich
aendert sich die Goldband-Vorgabe an drei Stellen: `simulator-engine-input.js`
von `?? 35` auf `?? 25`, `simulator-input-strategy.js` von
`readNumber('rebalancingBand', NaN)` auf `readBoundedNumber(..., 25, 0, 100)`,
und `_normalizeEngineInput` normalisiert neu auf 25. Der zweite Punkt ist
verhaltensrelevant: bei aktivem Gold und leerem Feld ergab der alte Pfad `NaN`,
womit saemtliche Gold-Bandvergleiche falsch wurden und Gold-Rebalancing faktisch
ausfiel. Als Fehlerbehebung ist das vertretbar, als stille Aenderung eines
ausdruecklich ausgeschlossenen Bereichs nicht.

**CR08-14.** In `tests/browser-smoke.test.mjs` wird das Tagesgeld zweier
Fixtures verzehnfacht (10.000 auf 100.000, 20.000 auf 200.000), damit der neue
Fuenfjahres-Runway keinen steuerpflichtigen Vollverkauf ausloest. Die Begruendung
ist im Code dokumentiert und die Isolationsabsicht nachvollziehbar. Die
Beobachtung selbst ist aber ein Messergebnis: ein Haushalt, der vorher
unauffaellig war, erzwingt unter dem neuen Default einen Vollverkauf kleiner
Tranchen. Diese Produktwirkung wurde nicht gemessen und nicht dokumentiert,
sondern aus den Fixtures herausgehalten.

### Pruefdimension 5: Was koennte brechen?

**CR08-11.** `docs/reference/DATA_SOURCES.md:394` nennt weiterhin
`careObservationHash cf9a310b...`. Der ausgelieferte Vertrag traegt seit der
CR07-6-Umsetzung `c9b55d32c1d084ba948e2b77bddb7392c918bce14ec11c908ab38afde8c9a48a`.
`npm run docs:evidence` laeuft gruen; das Gate deckt diese Klasse nicht ab. Ein
Leser der Referenzdokumentation vergleicht kuenftig gegen einen ueberholten
Hash.

**CR08-12.** Das Ergebnisdokument schreibt
`tests/liquidity-runway-contract.test.mjs` 23 Assertionen fuer "Namen, Domain,
Migration, harte Mindest-Policy, Transaktionen, VPW, Runway-Phase, Sweep und
Optimizer" zu. Die Datei enthaelt tatsaechlich 23 Assertionen, prueft aber
ausschliesslich Vertragsnamen, Default, Legacy-Migration und die abgeleitete
Mindestpolicy. Transaktionen, VPW, Runway-Phase, Sweep und Optimizer kommen
darin nicht vor. Ungeprueft bleiben ausserdem die deklarierte Domain
(1 bis 10, Schritt 0,5) und saemtliche Ungueltigkeitspfade aus CR08-5.

**CR08-15.** Der Zielfixturevergleich wechselt von `collectDiffs` mit
Abweichungsbericht auf einen einzelnen SHA-256. Bei einem Bruch ist nicht mehr
erkennbar, welcher Fall sich geaendert hat; `collectDiffs` und `coalesceFinite`
(in `vpw-return-policy.mjs`) sind toter Code. Der Hinweistext des
Sweep-Selbsttests spricht von "nur Gold-Band-Variation", waehrend die Faelle
zusaetzlich `liquidityRunwayYears` von 3 auf 7 variieren.

### Geprueft und verworfen

- **Bricht der Fuenfjahres-Default die Legacy-Domain?** Nein: 12 bis 60 und
  18 bis 72 Monate ergeben 1,0 bis 5,0 und 1,5 bis 6,0 Jahre, alle innerhalb
  von 1 bis 10.
- **Verlaesst `targetEq` die Codebasis nur scheinbar?** Nein: `engine/core.mjs`,
  `sweep-runner.js` und `simulator-engine-direct-utils.js` loeschen den
  Schluessel; Reader, Sweep-Schluesselmenge und Importschema weisen ihn
  nachweislich ab. Die Restvorkommen liegen in Testeingaben und sind wirkungslos.
- **Kann ein ungueltiger Runway die Engine erreichen?** Nein: `_normalizeEngineInput`
  laeuft vor `InputValidator`, und `checkFiniteRange(1, 10)` faellt geschlossen.
  Die Luecke aus CR08-5 liegt im Vertrag, nicht im Produktpfad.
- **Ist die Sweep-/Optimizer-Dimensionszahl falsch?** Nein: Sweep exportiert
  sieben Parameterschluessel, Auto-Optimize sechs; `maxBearRefillPct` ist nur im
  Sweep. Der Browsertest belegt beides.
- **Sind die 98 geaenderten Monte-Carlo-Blaetter Slice 07 zuzurechnen?** Nein:
  der Vergleich gegen `post-backtest-data-06-v2` war auf `c95e202` gruen, die
  Blaetter stammen aus Slice 08. Die Benennung `sourceReference: post-backtest-data-06-v2`
  neben `sourceResultDocument: Slice-07-Dokument` bleibt trotzdem irrefuehrend.
- **Faellt das neue Backtestgate ueberhaupt zu?** Ja: Gegenprobe A
  (`hardMinimumCapMonths` 24 auf 25) und Gegenprobe B (`1.25` auf `1.30`) lassen
  es scheitern. Die Blocker betreffen nicht dieses Gate, sondern die entfernten.

### Aufgeraeumter Pruefstand

Alle vier Gegenproben wurden byteidentisch zurueckgesetzt und ueber ein
SHA-256-Manifest belegt (`types/liquidity-runway-contract.js`,
`engine/transactions/transaction-opportunistic.mjs`,
`engine/planners/vpw-return-policy.mjs`, `app/simulator/simulator-year-result.js`,
`app/simulator/simulator-engine-helpers.js`: alle OK). `git status --short`
zeigt ausser diesem Ergebnisdokument keine von mir veraenderte Datei.

## Review-Ergebnis (Claude)

- **Status: blockiert**
- **Blocker:**
  1. **CR08-1** - Das Slice-07-Laufzeitmessgate ist abgeschaltet; die
     verbliebenen Pruefungen sind tautologisch. Gegenprobe D belegt, dass die
     gesamte Suite gruen bleibt, waehrend das Pflege-Eintrittsmodell der Laufzeit
     veraendert ist. CR07-2 ist damit wieder offen.
  2. **CR08-2** - Das Cross-Slice-Orakel `Slice06To07MortalityBacktestDeltaV1`
     und alle exakten Slice-06/07-Goldwerte sind entfernt beziehungsweise durch
     `Number.isFinite` ersetzt; kein exakter Wert der Slices 06 und 07 ist noch
     an das laufende Verhalten gebunden. CR07-1 verliert seine Verankerung.
  3. **CR08-3** - AK 11 ist unerfuellt. Das dokumentierte Slice-Delta ist das
     slice-interne CAPE-Orakel; die tatsaechliche Wirkung betraegt
     -48.559,87 EUR Endvermoegen, +15.000 EUR Entnahme, -3.157,35 EUR Steuer und
     -38,457989 Prozentpunkte minimale Runway-Deckung und hat bei zwei von vier
     Kennzahlen das entgegengesetzte Vorzeichen.
- **Restrisiken:** CR08-4 bis CR08-15; uebernommen aus Slice 07 CR07-4,
  CR07-7 bis CR07-15 sowie CR06-20 und CR06-23.
- **Pre-Mortem:** In drei Monaten faellt im Produktivbetrieb auf, dass die
  Pflege- oder Sterbetafelwirkung nicht mehr der dokumentierten entspricht. Die
  wahrscheinlichste Ursache: Slice 08 hat den einzigen lebenden Waechter ueber
  das Slice-07-Modell in eine Datei-Integritaetspruefung verwandelt, waehrend
  alle Gates gruen blieben. Eine spaetere, voellig harmlose Aenderung an
  `simulator-engine-helpers.js` oder am Pflegepfad verschiebt das Verhalten, die
  Suite bestaetigt 17.146 gruene Assertionen, und die archivierte Fixture -
  byteidentisch, hashgeprueft, unangetastet - beweist weiterhin einen Zustand,
  den die Software nicht mehr hat. Gesucht wird dann in Slice 07, wo nichts
  falsch ist.

## Zweitreview von Claude (Runde 2)

**Reviewdatum:** 2026-08-01
**Pruefstand:** Arbeitsbaum auf Basiscommit `c95e202` nach der
CR08-1-bis-CR08-15-Nachbesserung.
**Rolle:** adversariales Fremdreview; keine Aenderung an Programmdateien.

### Richtigstellung zu Gegenprobe D aus Runde 1

Gegenprobe D (`INITIAL_ENTRY_GRADES` von `[1, 2]` auf `[1, 2, 3]`) war kein
gueltiger Nachweis. `PFLEGE_GRADE_PROBABILITIES` enthaelt nur die Grade 1 und 2;
`probabilities[3]` ist `undefined`, geht mit `|| 0` in die Summe ein und macht
den zusaetzlichen Grad unerreichbar. Die Mutation war wirkungslos, also konnte
kein Gate sie fangen - weder das abgeschaltete noch ein intaktes. Die Aussage
"vor Slice 08 haette dieses Gate diese Mutationsklasse gefangen" ist damit fuer
diese konkrete Probe zurueckzunehmen.

Der Befund CR08-1 selbst bleibt davon unberuehrt: er stand auf der direkten
Codelektuere (keine Live-Berechnung ausserhalb des Capture-Modus, geloeschte
Vergleichsassertion, vier auf die Fixture selbst umgestellte Pruefungen) und
nicht auf der Mutation.

Fuer diese Runde wurde deshalb mit **Gegenprobe E** die in Slice 07 bereits
validierte Mutationsklasse verwendet: `care.progressionModel.probabilitiesByCurrentGrade["1"]`
von 0,15 auf 0,25 im generierten Vertrag. Ergebnis: das Messgate scheitert
(6/7 Assertionen, eine Fehlassertion). Zum Vergleich laeuft die wirkungslose
Mutation aus Gegenprobe D auch nach der Nachbesserung erwartungsgemaess gruen
durch (22/22). Beide Dateien wurden byteidentisch zurueckgesetzt.

### Selbstaendig nachgefahrene Gates

| Gate | Gemessen | Dokumentbehauptung |
|---|---|---|
| `npm test` | 160 Dateien, **17.331/17.331** Assertions, 0 Fehler, 0 offene Handles | Dokument nennt 17.189 - **abweichend** (CR08-19) |
| `npm run test:coverage` | 17.331/17.331, **78,20 Prozent** (38.983/49.848), beide Dateigates | bestaetigt |
| `npm run test:browser` | **28/28**, darunter `Balance five-year runway forced sale` | bestaetigt |
| `npm run verify:german-demography-data` | erfolgreich, Mortalitaetshash `88c1000e...` | bestaetigt |
| `npm run docs:evidence` | erfolgreich | bestaetigt |
| `git diff --check` | sauber | bestaetigt |
| `tests/liquidity-runway-contract.test.mjs` | 47/47 | bestaetigt |
| `types/liquidity-runway-contract.js` Abdeckung | 97,85 Prozent (91/93) | keine Behauptung mehr |

### Lifecycle der Findings aus Runde 1

**CR08-1 - geschlossen.** `const actualMeasurement = await captureMeasurement();`
laeuft wieder unbedingt. Der Vollvergleich existiert erneut, jetzt gegen
`liquidity-runway-slice-08-v1.json`, und zusaetzlich wird ein separater
Live-Vergleich der Slice-07-Demografieinvarianten (`outcomeCounts`,
`lifespanYears`, `care.anyCareRunCount`, `p1EntryRunCount`, `p2EntryRunCount`,
`additionalNeedNominalEur`) gegen die byteidentische Slice-07-Fixture gefuehrt.
Das ist strenger als der Zustand vor Slice 08: es wird nicht nur reproduziert,
sondern belegt, dass Slice 08 die Demografiegroessen nicht verschoben hat.
Gegenprobe E faellt geschlossen zu.

**CR08-2 - geschlossen.** Der Bytehash der Slice-06-Fixture
(`71bad07c...`) ist wieder geprueft, die zehn exakten Cross-Slice-Kennzahlen des
archivierten Slice-06-zu-07-Orakels sind wieder assertiert, das
CAPE-`legacy_step`-Orakel hat wieder exakte Werte (56.705,98 / -30.000 /
-4.318,72 / 10,517888) und traegt jetzt einen Namen, der es als
slice-internen Vergleich ausweist. Die fruehen Lohnfaelle sind wieder exakt
gepinnt (siehe CR08-21).

**CR08-3 - geschlossen.** Das neue Orakel
`Slice07To08LiquidityRunwayBacktestDeltaV1` vergleicht den laufenden Zustand
gegen die byteidentisch gepinnte Slice-07-Fixture und assertiert exakt die
Werte, die ich in Runde 1 selbst berechnet hatte: aktiver Arm -48.559,87 EUR,
+15.000 EUR, -3.157,35 EUR, -38,457989 Prozentpunkte, +0,2987 Prozentpunkte;
Referenzarm -80.782,77 EUR, +42.000 EUR, -2.293,69 EUR, -39,687904 und
+0,426498 Prozentpunkte; FlowDelta 0 auf beiden Armen. Gegenprobe F
(`hardMinimumCapMonths` 24 auf 18) laesst das Gate scheitern.

**CR08-4 - geschlossen.** `sameRuntime` und `compareSnapshotNode` sind wieder
aktiv, jetzt gegen die unabhaengig geladene Slice-08-Zielfixture; die
Blattpfadliste ist mit allen 98 Eintraegen gespeichert statt nur gezaehlt.

**CR08-5 - geschlossen, mit Folgebefund.** `finiteNumber` behandelt
`null`/`undefined`/`''` als abwesend, der Legacy-Pfad greift wieder;
nichtleere ungueltige Werte liefern `NaN` mit `source: 'canonical_invalid'`;
`isValidLiquidityRunwayYears` prueft Bereich und Schrittweite;
`deriveLiquidityRunwayPolicy` wirft statt eine negative Untergrenze zu
liefern. Die Folge fuer Altdaten ist CR08-16.

**CR08-6 - geschlossen.** 60-Prozent-Fallback in beiden VPW-Modi
wiederhergestellt.

**CR08-7 - geschlossen, mit Folgebefund.** Beide Phasen verwenden jetzt
denselben endlichen Sentinel. Zur Wahl des Werts siehe CR08-18.

**CR08-8 - geschlossen.** `safety_runway_post_months` traegt wieder
`dynamicFlexSafetyRunwayMonate`, `liqEnd` wieder `liqNachZins`; die neue
Semantik liegt in `runway_post_payout_end_of_year_months`,
`liq_post_payout_end_of_year` und `liq_post_accumulation_end_of_year`.

**CR08-9 - geschlossen, mit Folgebefund.** Der Faktor 1,25 ist entfernt. Zur
neuen Herleitung siehe CR08-17.

**CR08-10 - geschlossen.** Fehlertext lautet jetzt "Gold-Rebalancing-Band muss
zwischen 0% und 100% liegen."; zusaetzlich prueft der Validator die
0,5-Jahres-Schrittweite.

**CR08-11 - geschlossen.** `DATA_SOURCES.md` traegt
`c9b55d32c1d084ba948e2b77bddb7392c918bce14ec11c908ab38afde8c9a48a`;
`scripts/check-architecture-evidence.mjs` vergleicht Dokument und generierten
Vertrag, und `tests/architecture-evidence.test.mjs` besitzt den zugehoerigen
Negativwitness.

**CR08-12 - geschlossen, mit Einschraenkung.** Die Beschreibung im
Ergebnisdokument ist korrigiert und der Test auf 47 Assertionen erweitert
(Bereich, Schrittweite, `0`, `1.25`, `10.5`, `-4`, `NaN`, `Infinity`,
`RangeError`). Ungetestet bleibt genau der Fall aus CR08-16: ein Legacy-Monatswert,
der nicht auf einem 0,5-Jahres-Schritt landet.

**CR08-13 - geschlossen.** `simulator-engine-input.js` steht wieder auf `?? 35`,
`simulator-input-strategy.js` wieder auf `readNumber('rebalancingBand', NaN)`,
und `_normalizeEngineInput` setzt 35 nur bei `null`/`undefined`. Der
UI-Vorgabewert 25 bleibt Eingabe.

**CR08-14 - geschlossen.** Die Zehnfachung ist zurueckgenommen; das
3-Bucket-Fixture isoliert sich ueber `liquidityRunwayYears: 1`, und der neue
Workflow `Balance five-year runway forced sale` misst die Zwangsverkaufswirkung
tatsaechlich. Zur Assertionstiefe siehe CR08-20.

**CR08-15 - geschlossen.** `coalesceFinite` ist entfernt, `collectDiffs` und
`compareSnapshotNode` haben wieder Aufrufstellen, der Selbsttesttext nennt
Goldband und Runway.

### Neue Befunde

**CR08-16 (Blocker) - Legacy-Runwaywerte werden unbrauchbar.**
`migrateLiquidityRunwayInput` ruft jetzt `deriveLiquidityRunwayPolicy`, und das
wirft fuer jeden Wert, der nicht auf einem 0,5-Jahres-Schritt liegt. Die alte
Oberflaeche liess aber Schrittweite 1 zu: `runwayTargetMonths` 18 bis 72 und
`runwayMinMonths` 12 bis 60, jeweils ganzzahlig. Nur Vielfache von 6 landen auf
dem neuen Raster - also 10 von 55 zulaessigen Zielwerten und 9 von 49
zulaessigen Mindestwerten.

Gemessen:

| Eingabe | `resolveLiquidityRunwayYears` | `migrateLiquidityRunwayInput` | `validateSimulatorInputs` |
|---|---|---|---|
| `{ runwayTargetMonths: 36 }` | 3 Jahre | `{ liquidityRunwayYears: 3 }` | keine Fehler |
| `{ runwayTargetMonths: 30 }` | 2,5 Jahre | `{ liquidityRunwayYears: 2.5 }` | keine Fehler |
| `{ runwayTargetMonths: 25 }` | 2,083333 Jahre | **`RangeError`** | **wirft `SimulatorValidationError`** |
| `{ runwayTargetMonths: 19 }` | 1,583333 Jahre | **`RangeError`** | **wirft `SimulatorValidationError`** |
| `{ runwayMinMonths: 23 }` | 1,916667 Jahre | **`RangeError`** | **wirft `SimulatorValidationError`** |

Wirkung im Produktpfad: ein gespeichertes Simulatorprofil mit
`sim_runwayTargetMonths = 25` laesst sich nicht mehr laden. Ein Balance-Import
mit demselben Wert scheitert in `normalizeBalanceImportDocument` mit
`invalid_input_bounds` und einer Meldung, die den Nutzer auf ein Feld
`liquidityRunwayYears` verweist, das in seiner Datei gar nicht vorkommt. Der
Recovery-Export ueber `preserveInvalidRecoveryState` bleibt moeglich, es gehen
also keine Daten verloren - aber ein Zustand, der auf `c95e202` funktioniert
hat, funktioniert danach nicht mehr.

Das widerspricht S08-STOP-02 ("Legacy-Daten priorisieren
`runwayTargetMonths / 12`") und AK 8 ("durch einen dokumentierten
Migrationsvertrag ersetzt"). `migrationPrecedence` im Vertrag fuehrt die
Legacy-Schluessel weiterhin als unterstuetzten Pfad. Naheliegende Aufloesungen
waeren ein Runden auf den naechsten gueltigen Schritt bei der Migration oder
eine explizit dokumentierte Entscheidung, Altwerte ausserhalb des Rasters
abzulehnen - beides fehlt.

**CR08-17 - Der Ersatz fuer den Faktor 1,25 ist groesser als der Faktor.**
`grossEquityBudgetForNeed = ceil(effectiveTotalerBedarf / (1 - capitalGainsTaxRate))`
mit `capitalGainsTaxRate = min(0,99; 0,25 * (1 + 0,055 + kirchensteuerSatz))`.
Ohne Kirchensteuer ergibt das 0,26375 und damit einen Aufschlag von
**35,8 Prozent** statt der entfernten 25 Prozent; mit 9 Prozent Kirchensteuer
40,1 Prozent. Als Budgetobergrenze ist die Herleitung sachlich richtig - sie
beschreibt den Grenzfall vollstaendig steuerpflichtiger Erloese, und
`calculateSaleAndTax` bestimmt den tatsaechlichen Verkauf weiterhin exakt
innerhalb des Budgets. Die Ergebnisdarstellung "Faktor entfernt" legt aber
nahe, der Ueberschuss sei beseitigt; er ist groesser geworden.

Zwei Nebenpunkte: `Math.min(0,99; ...)` verwandelt eine Einheitenverwechslung
(`kirchensteuerSatz` als 9 statt 0,09) in ein Budget vom Hundertfachen des
Bedarfs statt in einen Fehler - begrenzt nur durch `aktienwert` und
`effectiveSkimCap`. Und die Krisenuntergrenze des ATH-Caps wechselt von
`effectiveLiquiditaetsBedarf * 1,2` auf `grossEquityBudgetForNeed`, das aus dem
**Gesamtbedarf** abgeleitet ist; die Bezugsgroesse hat sich damit still
geaendert.

**CR08-18 - Der einheitliche Null-Sentinel kehrt die Bedeutung um.**
`runwayMonths` ist bei einem Jahresbedarf von 0 jetzt `0`. Fachlich ist ein
Runway ohne Bedarf unbegrenzt, nicht null. Ebenso ergibt Ziel 0 mit Bestand 0
eine Deckung von 0 Prozent, die `runway_stress_years_below_100_pct` als
Notjahr zaehlt. Die von CR08-7 verlangte Einheitlichkeit ist erreicht - die
gewaehlte Zahl beschreibt den Zustand aber als maximale Runway-Not statt als
bedarfsfrei. Ein eigener Zustandswert oder `null` waere aussagekraeftiger.

**CR08-19 - Zahlenangabe im Dokument stimmt nicht.** Der Punkt `npm test` nennt
17.189/17.189 Assertionen. Gemessen wurden 17.331/17.331, und der eigene
Coveragepunkt des Dokuments nennt ebenfalls 17.331. Die Zahl ist offenbar aus
einem Zwischenstand uebernommen.

**CR08-20 - Der neue Browser-Witness pinnt nur die Richtung.** Assertiert werden
`fiveYears.grossSale > oneYear.grossSale` sowie die durchgereichten
Runway-Werte. Die im Dokument als Messung genannten 50.000 gegen 90.000 EUR
sind nirgends festgeschrieben; jede Aenderung, die den Abstand beliebig klein
oder beliebig gross macht, bleibt gruen. Ausserdem steht die in Runde 1
hinzugefuegte Debugprojektion (`resultKeys`, `resultError`) im
3-Bucket-Workflow weiterhin im Test.

**CR08-21 - Zusaetzliche gemessene Slice-08-Wirkung wird nicht berichtet.** Die
fruehen Lohn-Goldfaelle sind wieder exakt gepinnt, aber mit anderen Werten als
in Slice 07:

| Fall | Kennzahl | Slice 07 | Slice 08 |
|---|---|---|---|
| 1930-1940 | Basis-Endvermoegen | 2.735.439,56 | 2.740.858,55 |
| 1930-1940 | Endvermoegensdelta | -65.261,16 | -70.835,77 |
| 1930-1940 | Steuerdelta | 2.408,26 | 879,27 |
| 1935-1946 | Basis-Endvermoegen | 5.141.746,50 | 5.136.609,35 |
| 1935-1946 | Endvermoegensdelta | -48.418,44 | -45.366,25 |
| 1935-1946 | Steuerdelta | 5.003,92 | 3.755,72 |

Die Entnahme- und Reduktionsjahreswerte bleiben identisch. Diese Verschiebungen
sind eine reale, jetzt gepinnte Slice-08-Wirkung auf zwei Goldfaelle; die
Ergebnisse des Dokuments erwaehnen ausschliesslich das CAPE-Orakel und das
Slice-07-zu-08-Ledger.

### Geprueft und verworfen

- **Ist das Slice-07-Invariantengate zirkulaer?** Nein: die Vergleichsseite ist
  die byteidentisch gepinnte Slice-07-Fixture, die Istseite wird live
  berechnet. Gegenprobe E belegt die Wirksamkeit.
- **Kann `deriveLiquidityRunwayPolicy` in der Engine unbehandelt werfen?** Nein:
  `InputValidator` prueft Bereich **und** Schrittweite vor der ersten Nutzung.
  Der Wurf trifft nur den Migrationspfad (CR08-16).
- **Ist die Steuerhochrechnung numerisch falsch?** Nein: 0,25 mal 1,055 ergibt
  0,26375, der Kehrwert von 0,73625 ist 1,358216; die Herleitung ist konsistent.
- **Wurde die Slice-08-MC-Fixture zirkulaer gegen sich selbst geprueft?** Nein:
  sie dient dem Messvertrag als Zielsnapshot und dem Demografiegate als
  Vergleichsseite; die Istseite stammt in beiden Faellen aus dem Lauf.
- **Ist das Goldband erneut verschoben?** Nein: 35 als interner Fallback und
  `NaN` bei aktivem Gold ohne Wert entsprechen dem Zustand vor Slice 08.

### Aufgeraeumter Pruefstand

Gegenproben D, E und F wurden byteidentisch zurueckgesetzt und ueber ein
SHA-256-Manifest belegt (`app/simulator/simulator-engine-helpers.js`,
`app/simulator/german-demography-care-survivor-contract.js`,
`types/liquidity-runway-contract.js`: alle OK). Ausser diesem Ergebnisdokument
ist keine Datei von mir veraendert.

## Review-Ergebnis (Claude, Runde 2)

- **Status: blockiert**
- **Blocker:**
  1. **CR08-16** - Legacy-Runwaywerte ausserhalb des 0,5-Jahres-Rasters sind
     nicht mehr migrierbar. Gemessen: `runwayTargetMonths: 25` laesst das
     Simulatorprofil nicht mehr laden und den Balance-Import scheitern, obwohl
     die Vorversion diesen Wert ueber die eigene Oberflaeche erzeugt hat. Das
     widerspricht S08-STOP-02 und AK 8 und ist durch keinen Test abgedeckt.
- **Geschlossen:** CR08-1 bis CR08-15, jeweils einzeln nachgemessen; CR08-1 und
  CR08-3 zusaetzlich durch die Gegenproben E und F belegt.
- **Restrisiken:** CR08-17 bis CR08-21; uebernommen aus Slice 07 CR07-4,
  CR07-7 bis CR07-15 sowie CR06-20 und CR06-23.
- **Pre-Mortem:** In drei Monaten meldet ein Nutzer, dass sein
  Ruhestandsprofil nach dem Update nicht mehr laedt oder sein exportierter
  Balance-Stand nicht mehr importierbar ist. Ursache: sein Runway-Ziel stand auf
  einem Monatswert, den die alte Oberflaeche erlaubte und das neue
  0,5-Jahres-Raster nicht kennt. Die Fehlermeldung nennt ein Feld, das in seiner
  Datei nicht vorkommt, alle 17.331 Assertionen sind gruen, und der Migrationsvertrag
  fuehrt die Legacy-Schluessel weiterhin als unterstuetzten Pfad - gesucht wird
  deshalb zuerst im Importparser statt in der Schrittvalidierung.

## Nachbesserung CR08-16 durch Codex

**Umgesetzt am:** 2026-08-02  
**Freigabe:** erneutes Fremdreview ausstehend

Der kanonische aktuelle Vertrag bleibt strikt bei 1 bis 10 Jahren in
0,5-Jahres-Schritten. Nur die benannten Legacy-Schluessel erhalten eine
Migration fuer den groesseren alten Werteraum:

- `runwayTargetMonths`: ganzzahlige Altwerte 18 bis 72 Monate;
- `runwayMinMonths`: ganzzahlige Altwerte 12 bis 60 Monate;
- Rundungsregel: auf das naechste Sechsmonatsraster aufrunden, danach durch 12
  teilen; Altwerte werden nie verkuerzt;
- Werte ausserhalb der alten UI-Domains bleiben fail-closed.

Die Aufloesungsdiagnose fuehrt `legacyMonths`, `normalizedMonths` und
`normalization`. Der konkrete Blockerfall 25 Monate ergibt 30 Monate bzw.
2,5 Jahre und ist sowohl im gespeicherten Simulatorprofil als auch im
Balance-V1-Import gepinnt. Der Contracttest prueft exhaustiv alle 55 alten
Zielwerte und alle 49 alten Mindestwerte.

Nachweise auf demselben Arbeitsstand:

- `tests/liquidity-runway-contract.test.mjs`: 364/364 Assertions;
- `tests/simulator-multiprofile-aggregation.test.mjs`: 67/67 Assertions;
- `tests/balance-ui-orchestration.test.mjs`: 256/256 Assertions;
- `tests/simulator-input-readers.test.mjs`: 61/61 Assertions;
- `npm test`: 160 Dateien, 17.650/17.650 Assertions, keine Fehler und keine
  offenen Handles;
- `npm run test:coverage`: 17.650/17.650 Assertions, 78,23 Prozent
  (39.024/49.886), beide Pflichtdatei-Gates bestanden;
- `npm run test:browser`: 28/28;
- `npm run build:engine`: erfolgreich mit unveraendertem Fallback-Wrapper.

CR08-17, CR08-18, CR08-20 und CR08-21 bleiben als Restrisiken der zweiten
Reviewrunde unveraendert offen. Codex nimmt keine Selbstfreigabe vor und
erstellt keinen Commit.

## Drittreview von Claude (Runde 3)

**Reviewdatum:** 2026-08-02
**Pruefstand:** Arbeitsbaum auf Basiscommit `c95e202` nach der
CR08-16-Nachbesserung.
**Rolle:** adversariales Fremdreview; keine Aenderung an Programmdateien.

### Selbstaendig nachgefahrene Gates

| Gate | Gemessen | Dokumentbehauptung |
|---|---|---|
| `npm test` | 160 Dateien, **17.650/17.650** Assertions, 0 Fehler, 0 offene Handles, 1 separates Gate | bestaetigt |
| `npm run test:coverage` | 17.650/17.650, **78,23 Prozent** (39.024/49.886), beide Pflichtdatei-Gates | bestaetigt |
| `npm run test:browser` | **28/28** | bestaetigt |
| `tests/liquidity-runway-contract.test.mjs` | **364/364** | bestaetigt |
| `npm run verify:german-demography-data` | erfolgreich, Mortalitaetshash `88c1000e...` | bestaetigt |
| `npm run docs:evidence` | erfolgreich | bestaetigt |
| `npm run build:engine` | Fallback-Build, `engine.js` und `dist/` unveraendert | bestaetigt |
| `git diff --check` | sauber | bestaetigt |
| `types/liquidity-runway-contract.js` Abdeckung | 98,47 Prozent (129/131) | keine Behauptung |

Die in Runde 2 beanstandete Zahlenabweichung (CR08-19) ist beseitigt: Testlauf
und Coveragelauf nennen jetzt beide 17.650, und beide stimmen mit meiner
Messung ueberein.

### CR08-16 - geschlossen

`normalizeLegacyMonths` verlangt einen ganzzahligen Wert innerhalb der explizit
inventarisierten Altdomain und rundet ihn auf das naechste Sechsmonatsraster
**auf**, bevor durch 12 geteilt wird. Der kanonische Schluessel bleibt strikt.

Eigene erschoepfende Nachrechnung ueber beide Altdomains:

| Altdomain | Werte | ungueltig nach Migration | verkuerzend |
|---|---|---|---|
| `runwayTargetMonths` 18 bis 72 | 55 | 0 | 0 |
| `runwayMinMonths` 12 bis 60 | 49 | 0 | 0 |

Alle 104 Werte ergeben einen gueltigen kanonischen Runway, und in keinem Fall
ist der migrierte Zielwert kleiner als der gespeicherte Altwert. Der konkrete
Blockerfall ist im Produktpfad nachgemessen:

| Pfad | Eingabe | Ergebnis |
|---|---|---|
| `resolveLiquidityRunwayYears` | `{ runwayTargetMonths: 25 }` | 2,5 Jahre, `normalization: ceil_to_next_half_year` |
| `buildSimulatorInputsFromProfileData` | `sim_runwayTargetMonths: '25'` | `liquidityRunwayYears: 2.5` |
| `validateSimulatorInputs` | `{ runwayTargetMonths: 25 }`, `{ runwayTargetMonths: 19 }`, `{ runwayMinMonths: 23 }` | keine Fehler |
| `normalizeBalanceImportDocument` (V1) | `runwayTargetMonths: 25` | `liquidityRunwayYears: 2.5`, im Test gepinnt |
| kanonischer Pfad | `{ liquidityRunwayYears: 3.7 }` | weiterhin abgelehnt |

Der Contracttest iteriert beide Altdomains vollstaendig
(`Array.from({ length: 55 })` und `{ length: 49 }`), und `sim_runwayTargetMonths: '25'`
ist zusaetzlich in `tests/simulator-multiprofile-aggregation.test.mjs` sowie im
Balance-V1-Pfad von `tests/balance-ui-orchestration.test.mjs` verankert.

**Gegenprobe G:** `Math.ceil` in `normalizeLegacyMonths` auf `Math.floor`
geaendert. Der Contracttest scheitert (21 bestanden, 1 Fehlassertion) und
`tests/balance-ui-orchestration.test.mjs` ebenfalls (68 bestanden, 1
Fehlassertion). Die Rundungsrichtung ist damit belastbar gepinnt und nicht nur
dokumentiert.

### Die zuvor geschlossenen Blocker halten weiterhin

**Gegenprobe E2** (`care.progressionModel.probabilitiesByCurrentGrade["1"]`
0,15 auf 0,25): das Demografie-Messgate scheitert (6/7). **Gegenprobe F2**
(`hardMinimumCapMonths` 24 auf 18): das Backtest-Charakterisierungsgate
scheitert (138/139). CR08-1 und CR08-3 bleiben also auch nach dieser Runde
wirksam abgesichert. Alle drei Dateien wurden byteidentisch zurueckgesetzt.

### Restrisiken aus Runde 2 - Status unveraendert

CR08-17 (Steuer-Hochrechnung `capitalGainsTaxRate`, weiterhin zwei
Fundstellen), CR08-18 (`liquiditaet > 0 ? 100 : 0` in beiden Jahresbausteinen),
CR08-20 (`grossSale > witness`-Richtungsassertion und verbliebene
Debugprojektion `resultError`) und CR08-21 (unberichtete Verschiebung der
fruehen Lohn-Goldfaelle) sind unveraendert offen und im Dokument als solche
ausgewiesen. CR08-19 ist gekoppelt korrigiert.

### Neue Befunde

**CR08-22 - Die Pufferanhebung ist in ihrer Wirkung nicht beziffert.**
Aufgerundet werden **45 von 55** Zielwerten und **40 von 49** Mindestwerten, um
bis zu 5 Monate. Relativ ist der groesste Sprung `runwayMinMonths: 13` auf 18
Monate, also plus 38,5 Prozent; beim Ziel ist es 19 auf 24 Monate, plus
26,3 Prozent. Die Richtung ist als sicherheitsorientiert dokumentiert und
belastbar gepinnt. Slice 08 hat aber selbst gemessen, dass ein groesserer
Runway den Zwangsverkauf erhoeht - der Browser-Witness zeigt genau das, und das
Slice-07-zu-08-Ledger weist -38,457989 Prozentpunkte Mindestdeckung aus. Fuer
die migrierten Altnutzer kommt zur Slice-Wirkung also eine zweite, individuell
unterschiedliche Anhebung hinzu, deren Groesse in keinem Ergebnispunkt steht.
Ein Satz mit der Bandbreite "bis zu 5 Monate, maximal plus 38,5 Prozent" wuerde
genuegen.

**CR08-23 - Kein Rueckfall auf den Mindestwert bei ungueltigem Zielwert.**
`resolveLiquidityRunwayYears` kehrt zurueck, sobald `runwayTargetMonths`
gesetzt und groesser als 0 ist - auch wenn die Normalisierung `NaN` liefert.
Gemessen:

| Eingabe | Ergebnis |
|---|---|
| `{ runwayTargetMonths: 17, runwayMinMonths: 24 }` | `NaN`, `legacy_runway_target_months_invalid` - obwohl 24 sauber migrierbar waere |
| `{ runwayTargetMonths: 25.5 }` | `NaN`, `legacy_runway_target_months_invalid` |
| `{ runwayTargetMonths: 73 }` | `NaN` |
| `{ runwayTargetMonths: 0, runwayMinMonths: 23 }` | 2 Jahre ueber den Mindestwert |

Fail-closed ist hier vertretbar, und der alte Engine-Validator haette 17 und 73
ebenfalls abgelehnt; es entsteht also keine Regression gegenueber `c95e202`.
Die `migrationPrecedence` des Vertrags listet aber
`liquidityRunwayYears`, `runwayTargetMonths`, `runwayMinMonths`, `default` als
Kette und suggeriert damit einen Rueckfall, den es nur fuer den Fall
"Zielwert fehlt oder ist 0" gibt. Die Praezedenzliste sollte den Unterschied
zwischen "abwesend" und "vorhanden, aber ungueltig" benennen. Ebenso ist
`legacyMonthDomains.target.step: 1` deklariert, aber nicht ausgewertet - die
Ganzzahligkeitspruefung erfolgt ueber `Number.isInteger`.

### Geprueft und verworfen

- **Kann die Aufrundung die kanonische Domain sprengen?** Nein: 72 Monate
  ergeben 6 Jahre, 60 Monate 5 Jahre; beide liegen innerhalb 1 bis 10.
- **Werden Altwerte als Zeichenkette falsch behandelt?** Nein:
  `finiteNumber('25')` liefert 25, und `Number.isInteger` prueft danach die
  konvertierte Zahl. Der Profilspeicher liefert Zeichenketten und wird korrekt
  migriert.
- **Wird der kanonische Wert mitgerundet?** Nein: die Rundung greift
  ausschliesslich in `normalizeLegacyMonths`; `{ liquidityRunwayYears: 3.7 }`
  wird weiterhin abgelehnt.
- **Ueberleben Legacy-Schluessel die Migration?** Nein:
  `migrateLiquidityRunwayInput` und `_normalizeEngineInput` loeschen beide.
- **Ist ein Gate durch die Aenderung stumpf geworden?** Nein: Gegenproben E2, F2
  und G fallen alle geschlossen zu.

### Aufgeraeumter Pruefstand

Gegenproben E2, F2 und G wurden byteidentisch zurueckgesetzt und ueber ein
SHA-256-Manifest belegt (`types/liquidity-runway-contract.js`,
`app/simulator/german-demography-care-survivor-contract.js`: beide OK).
`engine.js` und `dist/` sind unveraendert. Ausser diesem Ergebnisdokument ist
keine Datei von mir veraendert.

## Review-Ergebnis (Claude, Runde 3)

- **Status: freigegeben**
- **Blocker: keine**
- **Geschlossen:** CR08-16, erschoepfend ueber beide Altdomains nachgerechnet
  und mit Gegenprobe G als wirksam gepinnt nachgewiesen; CR08-19 gekoppelt
  korrigiert. CR08-1 bis CR08-15 bleiben geschlossen und wurden mit den
  Gegenproben E2 und F2 erneut als wirksam bestaetigt.
- **Auflagen vor Slice 09:** CR08-18 (der Null-Sentinel meldet ein bedarfsfreies
  Jahr als maximale Runway-Not und faelscht damit `runway_min_coverage_pct` und
  `runway_stress_years_below_100_pct`) und CR08-20 (der einzige echte
  Zwangsverkauf-Witness pinnt nur die Richtung, nicht die dokumentierte
  Groessenordnung).
- **Restrisiken:** CR08-17, CR08-21, CR08-22, CR08-23; uebernommen aus Slice 07
  CR07-4, CR07-7 bis CR07-15 sowie CR06-20 und CR06-23.
- **Pre-Mortem:** In drei Monaten meldet ein Nutzer, dass sein Ruhestandsplan
  ohne erkennbaren Grund fruehzeitig Aktien verkauft. Ursache: sein
  Runway-Ziel stand auf 19 Monaten, die Migration hat daraus 24 Monate gemacht,
  und zusammen mit dem auf `min(Ziel, 24)` angehobenen harten Mindestwert liegt
  seine Deckung dauerhaft unter dem Ziel. Kein Gate schlaegt an - die
  Aufrundung ist korrekt, gepinnt und dokumentiert -, aber weder das
  Ergebnisdokument noch die Oberflaeche beziffert, dass sich sein
  Puffer um 26 Prozent erhoeht hat. Gesucht wird dann in der
  Transaktionslogik statt in der Migrationsregel.
