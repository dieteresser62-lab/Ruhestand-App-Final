# Deterministisches Stress-Pfad-Replay: Arbeitsplan

**Stand:** 2026-08-14

**Status:** freigabefaehiger Planstand; Produktentscheidungen geschlossen;
externes Planreview und fingerprintgebundenes Nutzer-Gate ausstehend

**Autor:** Codex (Implementer, keine Eigenfreigabe)

**Zielbranch:** `codex/stress-pfad-replay`

**Planungsbaseline:** Branch `codex/stress-pfad-replay`, HEAD `798ce7d`

**Vorgesehene Umsetzung:** Slice 01 bis Slice 10, lueckenlos 1-basiert

## 1. Ziel und fachliche Aussagegrenze

Ein ausgewaehlter Monte-Carlo-Lauf soll als vollstaendiger exogener Pfad
materialisiert und mit kontrolliert geaenderten Strategieparametern erneut
berechnet werden. Baseline und Varianten verwenden dabei dieselben Markt-,
Stress-, Tail-Risk-, Mortalitaets-, Pflege- und Hinterbliebenenereignisse.

Die Ausgabe ist ein gepaarter Gegenfaktualvergleich fuer genau diesen Pfad.
Sie beweist keine allgemeine Kausalwirkung und bezeichnet keine Variante als
optimale oder garantierte Strategie.

V1 umfasst:

- Auswahl und Fixierung eines reproduzierbaren `per-run-seed`-Laufs;
- Baseline-Reconciliation gegen den Ursprungslauf;
- deterministische Varianten auf demselben exogenen Pfad;
- eine Baseline und maximal drei Alternativen;
- strukturierte Kennzahlen, Delta-Marker und Transaktionsdiagnostik;
- einen lokalen Replay-Arbeitsstand sowie versionierten JSON-Export/-Import;
- einen zugaenglichen Browser-/Tauri-Workflow.

Nicht Teil von V1 sind allgemeine Strategieempfehlungen, eine Pfadbibliothek,
eine Mutation realer Profile oder Tranchen, `legacy-stream`-Replay ohne
ausdruecklich anderslautende Nutzerentscheidung sowie Release-Artefakte.

## 2. Prozess- und Freigabevertrag

Dieser Plan unterliegt `AGENTS.md`,
`docs/internal/SLICE_EXECUTION_RULES.md` und dem State-v3-Vertrag.

Vor jedem Umsetzungsslice muessen vorliegen:

1. ein explizit fingerprintgebundenes Nutzer-Gate fuer den extern reviewten
   Plan;
2. die in Abschnitt 16 dokumentierten Produktentscheidungen;
3. eine eigene 1-basierte Slice-MD;
4. dokumentierte Branch-, Status-, Scope- und Diff-Risiko-Pruefung;
5. ein sauber isolierter Arbeitsbaum ohne fremde Aenderungen im Slice-Scope.

Codex implementiert und plausibilisiert, genehmigt aber weder Plan noch eigene
Umsetzung. Review, Validierungsattestierung, Commit, Push und weitere
Git-Transaktionen bleiben bei den dafuer vorgesehenen Rollen.

Die Stop-Regeln aus `AGENTS.md` gelten uneingeschraenkt. Insbesondere wird vor
der Umsetzung angehalten, wenn Engine-Semantik geaendert werden muesste, ein
Contract unklar bleibt, mehr als zehn produktive Dateien in einem Slice
erforderlich werden, Tests nicht sinnvoll ausfuehrbar sind, unerwartete
Snapshots/Backtests/FlowDeltas entstehen, UI und Runner andere Parameternamen
verwenden oder `minimumFlexAnnual` still geklemmt wuerde.

## 3. Aktuelle Repository-Baseline

Die frueher dokumentierte Baseline
`codex/fokussierte-abschlusshaertung`/`55bdd84` mit zahlreichen uncommitteten
Dateien ist veraltet. Fuer diese Planueberarbeitung wurde am 2026-08-14
festgestellt:

```text
Branch: codex/stress-pfad-replay
HEAD:   798ce7d
Scope:  docs/internal/STRESS_PFAD_REPLAY_ARBEITSPLAN.md
```

Die einzige beim Start sichtbare Arbeitsbaumabweichung lag im erlaubten
Planpfad. Inhalt und Herkunft dieser Planabweichung sind kein Bestandteil
einer spaeteren Implementierungsbaseline.
Vor Slice 01 ist die dann aktuelle Baseline erneut zu erfassen; diese Angabe
ist keine dauerhafte Implementierungs-HEAD-Zusage.

Aktuell relevante, bestaetigte Integrationspunkte:

- `runMonteCarloLogsForIndices()` in
  `app/simulator/simulator-monte-carlo.js` ist der bestehende serielle
  Nachlauf fuer absolute Run-Indizes und soll erweitert, nicht dupliziert
  werden.
- `BREAK_ON_RUIN` ist in `app/simulator/simulator-data.js` aktuell `true` und
  muss Bestandteil des Pfadcontracts/Fingerprints sein.
- reale Simulatorfelder sind unter anderem `goldAktiv`,
  `goldZielProzent`, `goldFloorProzent`, `rebalancingBand` und
  `goldSteuerfrei`; `goldTargetPct` ist ein Sweep-/Optimizer-Alias, kein
  kanonischer Simulatoreingabepfad.
- `sim.`-Schluessel werden durch
  `app/shared/persistence-key-policy.js` derzeit in Snapshots aufgenommen.
- `package.json` definiert `npm test`, `npm run test:browser` und
  `npm run build:engine`.

## 4. Nutzerworkflow

1. Der Nutzer fuehrt einen Monte-Carlo-Lauf aus.
2. Er waehlt im Szenario-Log einen Lauf. Auswahlmetrik, Tie-Break, absoluter
   0-basierter Run-Index und 1-basierte Anzeigenummer werden sichtbar.
3. `Diesen Lauf als Stresspfad fixieren` startet den bestehenden seriellen
   Nachlauf mit opt-in Capture.
4. Der Pfad wird nur gespeichert, wenn Source-Prefix und Baseline gegen den
   Ursprung reconciliieren.
5. Ein Banner zeigt Quelle, Horizont, Terminalstatus, Fortsetzungspolitik und
   Fingerprint.
6. Die unveraenderliche Baseline ist Variante 1.
7. Der Nutzer aendert ausschliesslich die in Abschnitt 6 freigegebenen
   bestehenden Strategiefelder.
8. Eine Patchvorschau trennt materielle Aenderungen, bedingte
   Normalisierungen und verbotene UI-Abweichungen.
9. `Als Variante berechnen` fuegt eine Alternative hinzu.
10. KPI-Tabelle, Delta-Timeline und Jahrestabelle vergleichen jede Alternative
    mit der Baseline.

Das Laden eingefrorener Basiseinstellungen in die UI ist ausdruecklich und
schreibt weder Profil- noch Tranchenpersistenz. Ein neuer Pfad ersetzt den
aktiven nur nach Bestaetigung, sofern NE-04 so entschieden wird.

## 5. Vertragsmodell

### 5.1 `StressReplayPathV1`

Der Pfad enthaelt mindestens:

- Schema-, Scope- und Contractversion;
- Source-Request-Fingerprint, Seed, `rngMode`, absoluten Run-Index,
  Anzeigenummer, Szenarioschluessel, Auswahlmetrik und expliziten Tie-Break;
- `BREAK_ON_RUIN`-Wert sowie Daten- und Enginefingerprint;
- `horizonYears`, effektive Laenge und Terminalstatus;
- materialisierten `initialMarketDataHist` einschliesslich aller fuer
  Regime-, ATH-, Drawdown- und Baerenmarktlogik benoetigten Vorjahreswerte;
- optional zusaetzlich `startYearIndex` als Quellmetadatum, niemals als
  alleinige Rekonstruktionsquelle;
- pro Jahr effektive Aktien-, Gold- und Cashrendite mit ausgeschriebenen
  Einheiten, Inflation, Lohnentwicklung, CAPE, Regime, Stress-/Tail-Risk- und
  vollstaendige Haushaltsereignisse;
- Kennzeichnung `financiallyEvaluable` und `recordType`;
- Source-Prefix-Reconciliation und eine versionierte Post-Ruin-Continuation;
- kanonische Fingerprints fuer Pfad und Baselineszenario.

Beim Ruin-Terminaldatensatz werden nur die laut `ScenarioLogExportV2` fuer den
konkreten `recordType` vorhandenen Felder reconciliiert. Nicht exportierte
Renditefelder werden weder als Null geraten noch als Gleichheitsorakel benutzt.

### 5.2 `StressReplayVariantV1`

Eine Variante besitzt stabile ID, Rolle `baseline|alternative`, Label,
Baselineszenario-Fingerprint, versionierten Whitelist-Patch,
normalisierten Inputfingerprint und Warnungen.
Die Baseline hat einen leeren Patch; eine Alternative muss mindestens eine
materielle Aenderung enthalten.

Unbekannte oder fixierte Felder werden mit
`STRESS_REPLAY_VARIANT_FIELD_FORBIDDEN` und Feldliste abgewiesen. Es gibt
keinen beliebigen Objekt-Merge.

### 5.3 Ergebnis, Vergleich und Export

`StressReplayVariantResultV1` enthaelt Pfad-/Varianten-/Ergebnisfingerprint,
Terminalstatus, Summary, Jahresresultate, ein `ScenarioLogExportV2`,
Transaktionsereignisse, Missingness, Warnungen und getrennte technische
Fehler.

`StressReplayComparisonV1` enthaelt Baseline-ID, stabile Variantenreihenfolge,
paarweise Baseline-Deltas, erste Delta-Marker, Interpretation und
Vergleichsfingerprint.

`StressReplayComparisonExportV1` ist ein eigener versionierter Wrapper.
`ScenarioLogExportV2` wird nicht umdefiniert. `exportedAtUtc` ist nicht Teil
des fachlichen Fingerprints. Unbekannte Versionen, nicht-finite Werte,
lokale Pfade und Secret-Felder werden fail-closed behandelt.

## 6. Fixierte Groessen und Varianten-Whitelist

Fixiert bleiben Personen, Alter, Geschlecht, Partnerkonfiguration,
Mortalitaets-/Pflegemodell, konkrete Life-Events, Renten und Rentenstart,
Bedarfsgrundlagen, Simulationshorizont, historische Daten, Stress-/Tail-Risk,
Steuerparameter, Health-Bucket-Ausgangszustand und Haushaltslebenslauf.

Die V1-Whitelist wird in Slice 01 anhand der tatsaechlichen Rueckgabepfade von
`getCommonInputs()` als versionierter Contract umgesetzt. Sie umfasst genau
die folgenden bereits vorhandenen Strategiepfade; die UI-Quellen sind bei der
Umsetzung gegen den dann aktuellen Code zu verifizieren:

| UI-/Quellfeld | kanonischer Inputpfad | Replay-Contractpfad | Normalisierung |
| --- | --- | --- | --- |
| `liquidityRunwayYears` bzw. Legacy-Runwayfelder | `liquidityRunwayYears` | `strategy.liquidityRunwayYears` | `resolveLiquidityRunwayYears()` |
| `maxSkimPctOfEq` | `maxSkimPctOfEq` | `strategy.maxSkimPctOfEq` | bestehende Zahlenvalidierung |
| `maxBearRefillPctOfEq` | `maxBearRefillPctOfEq` | `strategy.maxBearRefillPctOfEq` | bestehende Zahlenvalidierung |
| `entnahmeStrategie` | `decumulation.mode` | `strategy.decumulation.mode` | `normalizeDecumulationMode()` |
| `bondTargetFactor` | `decumulation.bondTargetFactor` | `strategy.decumulation.bondTargetFactor` | nur fuer `3_bucket_jilge`, nichtnegativ |
| `drawdownTrigger` | `decumulation.drawdownTrigger` | `strategy.decumulation.drawdownTrigger` | nur fuer `3_bucket_jilge`, endlich |
| `bondRefillThreshold` | `decumulation.bondRefillThreshold` | `strategy.decumulation.bondRefillThreshold` | nur fuer `3_bucket_jilge`, nichtnegativ |
| `dynamicFlex` | `dynamicFlex` | `strategy.dynamicFlex` | boolesch |
| `horizonMethod` | `horizonMethod` | `strategy.horizonMethod` | `mean|survival_quantile` |
| `horizonYears` | `horizonYears` | `strategy.horizonYears` | bestehende Grenze 1 bis 60 |
| `survivalQuantile` | `survivalQuantile` | `strategy.survivalQuantile` | bestehende Grenze 0,5 bis 0,99 |
| `goGoActive` | `goGoActive` | `strategy.goGoActive` | boolesch |
| `goGoMultiplier` | `goGoMultiplier` | `strategy.goGoMultiplier` | bestehende Grenze 1,0 bis 1,5 |
| `longevityMode` | `longevityMode` | `strategy.longevityMode` | `normalizeLongevityMode()` |
| `longevityQuantileShift` | `longevityQuantileShift` | `strategy.longevityQuantileShift` | bestehende Validierung |
| `longevityRelativePct` | `longevityRelativePct` | `strategy.longevityRelativePct` | bestehende Validierung |
| `longevityBufferYears` | `longevityBufferYears` | `strategy.longevityBufferYears` | bestehende Validierung |

Bedingte Unterfelder werden zusammen mit ihrem Modusschalter normalisiert und
duerfen keine falsche Mehr-Faktor-Warnung ausloesen. Sweep-/Optimizer-Aliase
wie `goldTargetPct` sind keine Replay-Inputpfade. Gold-, Equity- und andere
Assetfelder sind aufgrund NE-01 C ausdruecklich nicht Teil der V1-Whitelist.

`minimumFlexAnnual` und Flex-Budget-Felder bleiben bis NE-06 ausserhalb der
Whitelist. Es findet niemals stilles Clamping statt.

## 7. Asset-Gegenfakten sind nicht Teil von V1

NE-01 C entfernt Gold-, Aktienfonds- und sonstige Assetaktivierungs- oder
Startallokationsfaktoren vollstaendig aus V1. Daraus folgen verbindlich:

- kein Asset-Toggle und keine Asset-Override-UI;
- kein Patch von `goldAktiv`, `goldZielProzent`, `goldFloorProzent`,
  `rebalancingBand`, `goldSteuerfrei` oder Tranchendaten;
- keine synthetischen Tranchen, Reallokation oder Jahr-0-Steuerannahme;
- keine Bezeichnung einer Variante als `mit/ohne Gold` oder `mit/ohne
  Aktienfonds`;
- keine Aenderung von `initializePortfolio()` oder der Engine-Semantik fuer
  Assetgegenfakten.

Eine spaetere Aufnahme solcher Faktoren erfordert einen neuen
Produktentscheid, eine Scope- und Plananpassung sowie ein erneutes
fingerprintgebundenes Nutzer-Gate.

## 8. Pfadmaterialisierung und deterministischer Runner

### 8.1 Source und Tie-Break

`scenario-analyzer.js` muss additiv den absoluten Run-Index transportieren.
Bei gleichem nominalen Endvermoegen gilt als stabile Tie-Break-Regel der
kleinste absolute Run-Index; Direkt- und Workerpfad muessen
dieselbe Auswahl liefern.

V1 nutzt `runMonteCarloLogsForIndices()` als einzigen seriellen Nachlauf.
Abortsignal und benoetigte Abhaengigkeiten werden explizit weitergereicht.
Normale MC-Batches, Worker-Chunks, Sweep und Auto-Optimize erhalten keinen
Capture-Modus und verbrauchen keine zusaetzlichen Zufallszahlen.

### 8.2 Post-Ruin-Fortsetzung

Bei `horizon_exhausted` ist der Pfad vollstaendig; bei `all_dead` endet er.
Nach `ruin` benoetigt eine ueberlebende Variante einen exogenen Restpfad.

Der Restpfad darf nicht aus dem positionsabhaengigen Zustand des Haupt-RNG
geforkt werden. Er verwendet einen benannten, positionsunabhaengig aus Seed,
Run-Index, Contractversion und Shadow-Domain abgeleiteten Sub-Seed. Ableitung,
Pflege-/Inflationspolicy und `BREAK_ON_RUIN` gehen in den Pfadfingerprint ein.
Post-Ruin-Life-Events werden nicht gegen Quellmetriken reconciliiert, die aus
dem heutigen neutralen Nullinflationsloop stammen.

### 8.3 Runner

Der DOM-freie Runner konsumiert keinen RNG und keine Samplingmethode. Er
initialisiert aus eingefrorenem Baseline-Request plus materialisiertem
`initialMarketDataHist`, wendet ausschliesslich gespeicherte Jahres- und
Haushaltsdaten an und ruft die vorhandene Jahreslogik auf.

Die leere Baseline muss den finanziell ausgewerteten Ursprung bis zum
Terminalereignis mit den vertraglichen Cent-/Ratiotoleranzen reproduzieren.
Mismatch, Contractfehler und technische Fehler blockieren fail-closed und
werden niemals als Ruin oder Nullwert ausgegeben.

## 9. Vergleichs- und Transaktionsvertrag

Je Variante werden mindestens nominales/reales Endvermoegen, nominaler/realer
Maximaldrawdown, Terminalstatus, Ruinjahr, Entnahmen, Flex-Erfuellung,
Mindest-Flex-Fehlbetrag, Steuer, Health-Bucket-Nutzung und Missingness
ausgewiesen.

Transaktionen werden mindestens getrennt als:

- `liquidity_shortfall_forced_sale`;
- `payout_floor_fallback_sale`;
- `bond_refill_sale`;
- `policy_rebalancing_sale`;
- `asset_allocation_initial_transform`.

Eine Klasse wird nur ausgegeben, wenn ein maschinenlesbares Orakel existiert.
Der heutige Payout-Fallback liefert weder Brutto noch Steuer und besitzt keine
eigene Trace-Phase; bis NE-09 entschieden ist, werden diese Werte als
Missingness ausgewiesen und nicht geraten.

Erste Delta-Marker umfassen Portfoliozustand, Policyentscheidung,
Rebalancing, Notverkauf, Haushalts-Flex, Mindest-Flex-Fehlbetrag und
Terminalstatus. Jeder Marker traegt Simulationsjahr, historisches Jahr,
Cause-Code, Felder, Baseline-/Variantenwert sowie geeignete absolute/relative
Deltas. Mehrere geaenderte Nutzerfaktoren werden sichtbar als
Mehr-Faktor-Variante bezeichnet.

## 10. Persistenz, Import und Wiederaufnahme

Vorgesehener Schluessel ist `sim.stressReplay.active.v1`. Gemaess NE-08 muss
er trotz des vorhandenen `sim.`-Praefixes explizit von Snapshot-Capture und
Snapshot-Restore ausgeschlossen werden.

Der Envelope enthaelt Pfad, Baseline-Snapshot, Variantenpatches, Reihenfolge,
Fingerprints und Zeitmetadaten, aber keine unnoetigen reproduzierbaren
Jahreslogs. Vorgesehene Grenzen sind 1 MiB fuer den Pfad und 2 MiB fuer den
Envelope; Ueberschreitung fuehrt zu
`STRESS_REPLAY_PERSISTENCE_SIZE_LIMIT`, niemals zu stillem Abschneiden.

Korrupte Daten werden nicht automatisch geloescht. Der normale Simulator
bleibt nutzbar; Verwerfen ist eine ausdrueckliche Aktion. Daten-/Engine-Mismatch
wird entsprechend NE-07 nur-lesbar oder vollstaendig abgewiesen. Import ersetzt
einen vorhandenen Arbeitsstand erst nach Bestaetigung.

## 11. UI- und Zugaenglichkeitsvertrag

Der Replaybereich umfasst Fixieren-Button, Statusgruende, Banner,
Strategie-Patchvorschau, Variantenliste, KPI-Tabelle, Delta-Timeline,
Jahrestabelle, Import/Export und Verwerfen.

Die UI muss ohne Farbe verstaendlich, per Tastatur bedienbar und mit
Fokusmanagement sowie `aria-live` versehen sein. Schmale Viewports duerfen
vergleichbare Tabellen horizontal innerhalb ihres Containers scrollen, nicht
die gesamte Seite sprengen. Technische Fehler, Ruin, Tod und Horizont bleiben
sprachlich und strukturell getrennt.

Formulierungen lauten beispielsweise `Auf diesem fixierten Stresspfad` und
`Gegenueber der Baseline`. Aussagen wie `optimale Strategie`, `garantiert`
oder allgemeine Kausalbehauptungen sind unzulaessig.

## 12. Architekturgrenzen

Vorgesehene neue DOM-freie Module:

- `stress-replay-contract.js`;
- `stress-replay-path-materializer.js`;
- `stress-replay-runner.js`;
- `stress-replay-variant.js`;
- `stress-replay-transactions.js`;
- `stress-replay-comparison.js`;
- `stress-replay-export.js`;
- `stress-replay-persistence.js`.

Vorgesehene UI-Module:

- `stress-replay-ui.js`;
- `stress-replay-renderer.js`.

`engine.js`, `dist/` und `RuheStandSuite.exe` werden nicht manuell bzw. nicht
im V1-Scope bearbeitet. `engine/`, oeffentliche `EngineAPI`, Workercontracts,
Profile und reale Tranchenpersistenz bleiben ohne neue Nutzerfreigabe
unveraendert.

## 13. Umsetzungsslices

Jeder Slice erhaelt vor Beginn eine eigene MD mit exakter Pfadallowlist,
Branch-/Statuscheck, Diff-Risiko, Tests, Ergebnissen und externem Reviewstatus.
Die folgenden Ueberschriften sind der lueckenlose State-v3-Slicevertrag.

### Slice 01 - Contracts, Whitelist und Determinismusorakel

**Ziel:** Versionierte Pfad-, Varianten-, Ergebnis-, Vergleichs- und
Fingerprintcontracts sowie die vollstaendige Mappingtabelle aus realen
`getCommonInputs()`-Pfaden.

**Produktive Pfade:** neu `app/simulator/stress-replay-contract.js`, optional
neu `app/simulator/stress-replay-export.js`.

**Tests:** `tests/stress-replay-contract.test.mjs` mit Minimal-/Maximalpfad,
Indexbasis, Einheiten, `initialMarketDataHist`, Laengenfehlern, nicht-finiten
Werten, unbekannten und explizit verbotenen Assetpatches, bedingter
Strategienormalisierung, Fingerprints,
Immutabilitaet und Groessenlimits.

**Akzeptanz:** Kein erfundener Inputpfad; alle rechenwirksamen Werte sind im
Fingerprint; Zeitstempel und Anzeigenamen sind ausgeschlossen; Assetfelder
bleiben fail-closed ausserhalb der Whitelist.

### Slice 02 - MC-Quellidentitaet und Pfadmaterialisierung

**Ziel:** Einen ausgewaehlten `per-run-seed`-Run ueber den vorhandenen
seriellen Nachlauf materialisieren, inklusive Startzustand, recordType-basierter
Reconciliation und Post-Ruin-Shadow-Pfad.

**Produktive Pfade:** neu
`app/simulator/stress-replay-path-materializer.js`,
`app/simulator/simulator-monte-carlo.js`,
`app/simulator/monte-carlo-runner.js`,
`app/simulator/scenario-analyzer.js`, optional ein bestehender Life-Event-Helper.

**Tests:** IID/Regime, Blockmethoden, Stress, Tail-Risk, Pflege/Tod,
Ruinfortsetzung, expliziter Tie-Break, Direkt-/Workerparitaet,
Source-Mismatch, `legacy-stream`-Block und unveraenderte normale MC-Snapshots.

**Akzeptanz:** Capture veraendert keinen normalen RNG-Stream; absoluter Index
und Auswahlgrund sind eindeutig; Ruin kuerzt den Pfad nicht; nicht
reproduzierbare Quellen werden nicht gespeichert.

### Slice 03 - Deterministischer Single-Path-Runner

**Ziel:** Baseline ohne RNG/Sampling aus Pfad und materialisiertem
Marktstartzustand reproduzieren.

**Produktive Pfade:** neu `app/simulator/stress-replay-runner.js`,
`app/simulator/stress-replay-contract.js`, optional ein bestehender additiver
Logprojektor.

**Tests:** Baseline-Reconciliation, Wiederholungsgleichheit, Ruin/Tod/Horizont,
Technical Error, Akkumulation, Pflege, Partner/Witwe, Immutabilitaet und
nachweislich keine RNG-Abhaengigkeit.

**Akzeptanz:** Baseline reproduziert den Ursprung; technische Fehler bleiben
getrennt; Runner ist DOM- und Worker-frei.

### Slice 04 - Strategievarianten

**Ziel:** Ausschliesslich die versionierten Whitelistpatches aus Abschnitt 6
normalisieren, validieren und auf geklonte Baselineinputs anwenden.

**Produktive Pfade:** neu `app/simulator/stress-replay-variant.js`,
`app/simulator/stress-replay-contract.js` und
`app/simulator/stress-replay-runner.js`.

**Tests:** erlaubte Strategiefelder, verbotene Asset-/Bedarfs-/Personenfelder,
modusabhaengige 3-Bucket- und Dynamic-Flex-Felder, No-op, Multi-Faktor-Marker,
normalisierte Fingerprints und Eingabeimmutabilitaet.

**Akzeptanz:** Kein beliebiger Objekt-Merge, keine Profil-/Tranchenmutation
und keine Assetgegenfakten; Baselineinputs bleiben unveraendert.

### Slice 05 - Strukturierte Transaktionsdiagnostik

**Voraussetzung:** NE-09 ist geschlossen.

**Ziel:** Replay-spezifische, additive Klassifikation von Forced Sale,
Payout-Fallback, Bond-Refill und Policyverkauf mit expliziter Missingness.

**Produktive Pfade:** neu `app/simulator/stress-replay-transactions.js`,
`app/simulator/simulator-forced-sale.js`,
`app/simulator/simulator-bond-refill.js`,
`app/simulator/simulator-engine-direct.js`,
`app/simulator/simulator-year-result.js`.

**Tests:** Ereignisisolation, Brutto/Netto/Steuer soweit beobachtbar,
Missingness statt Schaetzung, unveraenderte Finanzresultate und FlowDelta.

**Akzeptanz:** Kein Ereignis wird aus Anzeigetext geraten; additive
Instrumentierung aendert keine Finanzsemantik.

### Slice 06 - Variantenvergleich und Delta-Ledger

**Ziel:** Baseline und Alternativen reihenfolgeunabhaengig vergleichen.

**Produktive Pfade:** neu `app/simulator/stress-replay-comparison.js`,
`app/simulator/stress-replay-runner.js`,
`app/simulator/stress-replay-contract.js`,
`app/simulator/stress-replay-transactions.js`.

**Tests:** Reihenfolgeunabhaengigkeit, Variantenlimit, Entfernen,
First-Delta-Marker, Single-/Multi-Faktor, Missingness und technischer Fehler.

**Akzeptanz:** Jede Variante nutzt denselben Pfad und eigenen geklonten
Startzustand; Baseline bleibt eindeutig; Gesamtvergleich ist bei technischen
Fehlern nicht irrefuehrend.

### Slice 07 - Persistenz sowie Export und Import

**Voraussetzung:** NE-04, NE-07 und NE-08 sind geschlossen.

**Ziel:** Einen versionierten Arbeitsstand sicher wiederaufnehmen und
exportieren/importieren.

**Produktive Pfade:** neu `app/simulator/stress-replay-persistence.js`, neu
oder erweitert `app/simulator/stress-replay-export.js`,
`app/simulator/stress-replay-contract.js`, optional
`app/shared/persistence-key-policy.js` gemaess NE-08.

**Tests:** Facade-Backends, atomarer Roundtrip, Korruption, Version/Fingerprint,
Mismatch, Limits, Snapshot-/Backup-Policy und Datenschutzfelder.

**Akzeptanz:** Kein anderer Persistenzschluessel wird mutiert; inkompatible
Daten werden nicht exakt ausgefuehrt; Loeschen/Ersetzen ist ausdruecklich.

### Slice 08 - Fixieren, Banner und Sitzungssteuerung

**Ziel:** Szenario auswaehlen/fixieren, Status/Banner darstellen und den
aktiven Arbeitsstand laden, exportieren, importieren oder verwerfen.

**Produktive Pfade:** neu `app/simulator/stress-replay-ui.js`,
`app/simulator/simulator-results.js`,
`app/simulator/simulator-main-init.js`,
`app/simulator/simulator-main.js`, `Simulator.html`, optional
`app/simulator/monte-carlo-ui.js`.

**Tests:** Kein Szenario, Unsupported-RNG, Materialisierungsfehler, Banner,
Reload, Import/Export, Verwerfen, Tastaturfokus und Live-Region.

**Akzeptanz:** Quelle/Baseline/Fingerprint bleiben sichtbar; keine
Profil-/Tranchenwerte werden automatisch geschrieben; maximal sechs geplante
produktive Dateien.

### Slice 09 - Varianteneditor und Vergleichsansicht

**Ziel:** Strategie-Patchvorschau, Variantenliste, KPI-Tabelle,
Delta-Timeline und Jahrestabelle.

**Produktive Pfade:** neu `app/simulator/stress-replay-renderer.js`,
`app/simulator/stress-replay-ui.js`, `Simulator.html`, `simulator.css`,
optional `app/simulator/simulator-results.js`.

**Tests:** erlaubte/verbotene Patches, bedingte Strategiefelder, Variantenlimit,
Neuberechnen/Entfernen, Technical Error, schmaler Viewport, Tastatur und
semantische Statuscopy.

**Akzeptanz:** Workflow ohne JSON-Handarbeit; Patch und reale Profilwerte sind
klar getrennt; keine Scheinkausalitaet; maximal fuenf geplante produktive
Dateien.

### Slice 10 - End-to-End, Performance und Dokumentationssync

**Ziel:** Gesamtregression, reale Baseline-Messung, Performancebudget und
Dokumentationssync ohne neue Fachsemantik.

**Produktive Pfade:** nur notwendige kleine Integrationskorrekturen;
`README.md`, `docs/reference/TECHNICAL.md`,
`docs/reference/SIMULATOR_MODULES_README.md`, `tests/README.md` und dieser
Arbeitsplan. `package.json` nur falls ein separat freigegebener Testbefehl
notwendig ist.

**Tests:** `npm test`, `npm run test:browser`, Replay-Fokustests,
Workerparitaet, MC-/Exportcontracts, relevante Backtests, Snapshots und
FlowDelta. `npm run build:engine` nur nach vorheriger Scopefreigabe fuer eine
unerwartete `engine/`-/EngineAPI-Aenderung.

**Performance:** Vor Festlegung eines Grenzwerts wird ein vorhandener
60-Jahres-Lauf auf der dokumentierten Referenzumgebung gemessen. Das Budget
wird relativ zu dieser Baseline begruendet; die veraltete unbelegte Forderung
`p95 < 50 ms fuer 240 Jahreslaeufe` gilt nicht.

**Akzeptanz:** Keine unerwartete Regression; Performance- und Groessenwerte
sind gemessen; Nutzerworkflow, Contracts und Modellgrenzen sind synchron
dokumentiert.

## 14. Teststrategie und Invarianten

Versionierte synthetische Fixtures decken Horizont, Tod, Ruinfortsetzung,
Partnerpflege, gegenlaeufige Strategieeffekte und technische Fehler ab.
Personenbezogene Finanzexporte werden nicht verwendet.

Zentrale Invarianten:

- Replay inaktiv laesst bestehende Ergebnisse unveraendert;
- Materialisierung veraendert keinen Quellbatch-RNG;
- Pfad, Varianten und Inputs sind immutable;
- Variantenreihenfolge ist ergebnisneutral;
- Baseline ist reproduzierbar;
- Startportfolio und alle abgeleiteten Summen reconciliieren;
- Asset-, Health-Bucket-, Personen- und Bedarfsfelder bleiben unveraendert;
- `minimumFlexAnnual` wird validiert und nie still geklemmt;
- UI, Contract und Runner verwenden dokumentierte Mappingpfade;
- Technical Error, Ruin, Tod und Horizont bleiben getrennt;
- Daten-/Engine-/Contractmismatch ist sichtbar und fail-closed.

## 15. Risiken und Gegenmassnahmen

| ID | Risiko | Gegenmassnahme |
| --- | --- | --- |
| R-01 | nur Jahresnummern statt voller Exogenitaet | Marktstartzustand plus Markt-, Overlay- und Life-Events materialisieren |
| R-02 | Quellruin kuerzt eine ueberlebende Variante | versionierter, unabhaengig geseedeter Shadow-Pfad |
| R-03 | verbotene Assetfelder gelangen ueber UI- oder Objekt-Merge in Varianten | exakte Whitelist, fail-closed Feldliste und Negativtests |
| R-04 | bedingte Strategiefelder werden ohne ihren Modus angewandt | modusgebundene Normalisierung und Contracttests |
| R-05 | aktueller UI-Zustand driftet von Baseline | eingefrorener Request plus Whitelistpatch |
| R-06 | Variantenpatch mutiert eingefrorene Baselineinputs | Deep Clone, Immutabilitaetsassertionen und Fingerprints |
| R-07 | Verkaufsklasse aus Text geraten | strukturiertes Orakel oder explizite Missingness |
| R-08 | Import nach Daten-/Engineupdate suggeriert Exaktheit | Fingerprintmismatch und NE-07-Policy |
| R-09 | Replay-Envelope blaehte Snapshots auf | explizite NE-08-Policy und Limit-Tests |
| R-10 | UI-Slice reisst Zehn-Dateien-Regel | getrennte Slices 08 und 09 |
| R-11 | unbelegtes Performanceziel erzwingt Abkuerzung | messen, relativ budgetieren, fachliche Paritaet priorisieren |

## 16. Geschlossene Produktentscheidungen

Die folgenden Nutzerentscheidungen vom 2026-08-14 sind verbindliche
Planinputs. Sie sind keine Plan- oder Umsetzungsfreigabe; dafuer bleibt das
fingerprintgebundene Nutzer-Gate aus Abschnitt 2 erforderlich.

### NE-01 - Bedeutung der Assetfaktoren

**Nutzerentscheidung (2026-08-14): C.** Assetfaktoren werden aus V1 entfernt;
V1 vergleicht ausschließlich bestehende Strategieparameter.

- **A:** dauerhafte Policy `ohne Aktienfonds`/`mit oder ohne Gold`; dies kann
  Engine-Semantik beruehren und erfordert Scope-Erweiterung und erneute
  Planfreigabe;
- **B:** nur hypothetisch andere Startaufteilung bei unveraenderter laufender
  Policy; Leitfrage und UI werden genau so benannt;
- **C:** Assetfaktoren aus V1 entfernen und nur bestehende Strategieparameter
  vergleichen.

### NE-02 - Reallokation und Steuerannahmen

**Nutzerentscheidung (2026-08-14): nicht anwendbar.** Wegen NE-01 C enthält
V1 keine Assetfaktoren und benötigt daher keinen Reallokations- oder
Steuerannahmenvertrag für deren Aktivierung oder Deaktivierung.

Nur falls NE-01 B gewaehlt wird:

- **A:** deaktivierte Klasse symmetrisch in eine explizit definierte
  Money-Market-Reserve und Aktivierung aus derselben Reserve;
- **B:** andere benannte Quelle/Ziel-Regel, die der Nutzer vorgibt;
- zusaetzlich festzulegen: geschuetzte Liquiditaet, Nenner, `purchaseDate`,
  `tqf`, `taxExempt` und Behandlung spaeterer Steuerfolgen.

### NE-03 - Variantenanzahl

**Nutzerentscheidung (2026-08-14): A.** V1 unterstützt die Baseline plus
maximal drei Alternativen.

- **A:** Baseline plus maximal drei Alternativen;
- **B:** andere explizite Obergrenze.

### NE-04 - Persistenzumfang

**Nutzerentscheidung (2026-08-14): A.** V1 speichert genau einen aktiven
Pfad; ein neuer Pfad ersetzt ihn erst nach Bestätigung.

- **A:** genau ein aktiver Pfad, Ersetzen nach Bestaetigung;
- **B:** keine Persistenz in V1;
- **C:** mehrere Pfade; dies erfordert eine Scope- und Slice-Neuplanung.

### NE-05 - Legacy-RNG

**Nutzerentscheidung (2026-08-14): A.** `legacy-stream` wird in V1 sichtbar
nicht unterstützt.

- **A:** `legacy-stream` in V1 sichtbar nicht unterstuetzen;
- **B:** unterstuetzen; dies erfordert eine neue technische Planung fuer den
  Replay aller vorherigen Runs.

### NE-06 - Mindest-Flex und Flex-Budget

**Nutzerentscheidung (2026-08-14): A.** Mindest-Flex und Flex-Budget sind in
V1 nicht als Variantenparameter veränderbar.

- **A:** in V1 nicht variierbar, weil sie die Bedarfsinterpretation aendern;
- **B:** als ausdruecklich benannte Policyparameter in die Whitelist aufnehmen.

### NE-07 - Import bei Daten-/Engine-/Contractmismatch

**Nutzerentscheidung (2026-08-14): A.** Ein inkompatibler Import darf nur zur
Inspektion geöffnet werden; seine Ausführung bleibt blockiert.

- **A:** Nur-Lesen-Inspektion erlauben, Ausfuehrung blockieren;
- **B:** Import vollstaendig abweisen.

### NE-08 - Snapshotbehandlung des Replay-Schluessels

**Nutzerentscheidung (2026-08-14): A.** Der Replay-Schlüssel wird ausdrücklich
von Snapshot-Capture und Snapshot-Restore ausgeschlossen.

- **A:** Replay-Schluessel explizit aus Snapshot-Capture/-Restore ausschliessen;
- **B:** aufnehmen, aber nach Restore bis zur Fingerprintpruefung nur-lesbar;
- **C:** aufnehmen und bei Mismatch gemaess NE-07 behandeln; Speicherfolgen
  der maximal 2 MiB pro Snapshot werden akzeptiert.

### NE-09 - Payout-Fallback-Diagnostik

**Nutzerentscheidung (2026-08-14): B.** Additive Trace- und
Diagnoseinstrumentierung in `simulator-engine-direct.js` und den
Forced-Sale-Helfern ist zulässig, sofern Tests unveränderte Finanzsemantik
nachweisen.

- **A:** Ereignis mit expliziter Missingness fuer Brutto/Steuer ausweisen;
- **B:** additive Trace-/Diagnoseinstrumentierung in
  `simulator-engine-direct.js` und Forced-Sale-Helfern erlauben, sofern Tests
  unveraenderte Finanzsemantik nachweisen.

## 17. Eingearbeitete historische Findings

Die Reviews vom 2026-08-07 sind historische Eingangsdaten, keine aktuelle
Freigabe. Ihre widerspruechlichen Statusaussagen wurden entfernt; nur
nachpruefbare Anforderungen und Entscheidungstore bleiben verbindlich.

| Finding | Planantwort |
| --- | --- |
| G-P-01, C-P-16 | veraltete unreine Baseline durch aktuellen Branch/HEAD und erneuten Pre-Slice-Check ersetzt |
| G-P-02 | NE-01 bis NE-09 praezisiert und durch Nutzerentscheidungen geschlossen |
| G-P-03, C-P-01, C-P-04 | Assetgegenfakten gemaess NE-01 C vollstaendig aus V1 entfernt |
| G-P-04, C-P-08 | positionsunabhaengiger Shadow-Sub-Seed und abweichende Reconciliationgrenze festgelegt |
| G-P-05, C-P-06 | eigener Diagnostikslice und NE-09 fuer Missingness versus Instrumentierung |
| G-P-06, C-P-14 | UI in Slice 08/09, Diagnostik und Vergleich in Slice 05/06 geteilt |
| C-P-02 | `initialMarketDataHist` und `BREAK_ON_RUIN` in den Pfadcontract aufgenommen |
| C-P-03, C-P-10 | reale Inputpfade und explizite Mappingtabelle fuer bestehende Strategieparameter festgelegt |
| C-P-05, C-P-15 | durch Entfernung der Assettransformation aus V1 gegenstandslos; Asset- und Health-Bucket-Felder bleiben fixiert |
| C-P-07 | absoluter Run-Index und expliziter Tie-Break als additiver Sourcecontract |
| C-P-09 | Snapshotverhalten als NE-08 statt blosser Testaufgabe behandelt |
| C-P-11 | vorhandener `runMonteCarloLogsForIndices()` als einziger Nachlauf festgelegt |
| C-P-12 | Reconciliation wird nach `recordType` begrenzt |
| C-P-13 | unbelegtes 50-ms-Ziel durch Mess- und Kalibrierungspflicht ersetzt |

Diese Planantworten schliessen keine reviewer-eigenen Findings. Nur der
jeweilige Reviewer darf deren Status im State-v3-Lifecycle aendern.

## 18. Pre-Mortem

Angenommen, das Feature liefert in drei Monaten eine plausible, aber falsche
Aussage. Die wahrscheinlichste Ursache ist ein unvollstaendig materialisierter
Marktstart- oder Post-Ruin-Life-State, der kleine Policyabweichungen erzeugt,
obwohl Pfadfingerprints formal passen. Die zweitwahrscheinlichste Ursache ist
ein Variantenpatch, dessen bedingtes Unterfeld ohne den zugehoerigen Modus
normalisiert wurde und deshalb nicht dieselbe Bedeutung wie in der regulaeren
Simulator-UI besitzt.

Die wichtigsten Schutzmechanismen sind daher ein materialisierter
Marktstartzustand, Baseline-Reconciliation, ein unabhaengig versionierter
Shadow-Pfad, eine exakte modusgebundene Whitelist, Immutabilitaet und
fail-closed Fingerprints.

## 19. Definition of Done

- [x] NE-01 bis NE-09 explizit entschieden und in den Plan eingearbeitet.
- [ ] Plan fingerprintgebunden extern reviewt und vom Nutzer freigegeben.
- [ ] Slice 01 bis Slice 10 jeweils geplant, implementiert, validiert und
      extern reviewt.
- [ ] Source-Run und Tie-Break sind eindeutig.
- [ ] Baseline reproduziert den Ursprung; Ruinfortsetzung ist vollstaendig.
- [ ] Varianten verwenden nur reale, dokumentierte Whitelistpfade.
- [ ] Assetgegenfakten und zugehoerige UI bleiben gemaess NE-01/NE-02
      ausserhalb von V1.
- [ ] Transaktionsklassen besitzen Orakel oder sichtbare Missingness.
- [ ] Persistenz, Snapshotpolicy und Mismatchverhalten entsprechen
      NE-04/NE-07/NE-08.
- [ ] Profile, Tranchen und Nicht-Replay-Rechenpfade bleiben unveraendert.
- [ ] Pflichtsuite, Browser-, Contract-, Paritaets-, Snapshot-, Backtest- und
      FlowDelta-Tests sind gruen.
- [ ] Performance und Speicherlimits sind gemessen und dokumentiert.
- [ ] README und Referenzdokumente sind synchron.
- [ ] Nutzer hat den End-to-End-Ablauf abgenommen.

## 20. Slice-Status

| Slice | Status | Review | Commit/Push |
| --- | --- | --- | --- |
| 01 Contracts | nicht begonnen | ausstehend | ausstehend |
| 02 Materialisierung | nicht begonnen | ausstehend | ausstehend |
| 03 Runner | nicht begonnen | ausstehend | ausstehend |
| 04 Varianten | nicht begonnen | ausstehend | ausstehend |
| 05 Transaktionsdiagnostik | nicht begonnen | ausstehend | ausstehend |
| 06 Vergleich | nicht begonnen | ausstehend | ausstehend |
| 07 Persistenz/Export | nicht begonnen | ausstehend | ausstehend |
| 08 Fixieren/Banner | nicht begonnen | ausstehend | ausstehend |
| 09 Varianten-UI | nicht begonnen | ausstehend | ausstehend |
| 10 Integration/Doku | nicht begonnen | ausstehend | ausstehend |

## Orchestrator-Pruefprotokoll

### Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `plan-validation-288e706abd7e`
- Testdateien: keine
- Prüfdimensionen: Checked (1) Mechanical slice-heading contract: "### Slice 01"–"### Slice 10" sequential, 1-based, no numeric prefixes; matches attestation (future_slices=10, planned_paths=1, changed_paths=1) for sole path docs/internal/STRESS_PFAD_REPLAY_ARBEITSPLAN.md. (2) Scope discipline: diff touches only the declared work-plan file, no code/tests/config changed, consistent with PLAN_ONLY/TASK_SCOPE. (3) Closure of the 2026-08-07 historical blockers cross-checked line-by-line: baseline refreshed to current branch/HEAD (closes G-P-01/C-P-16); NE-01 C removes the entire asset-counterfactual sub-feature, making C-P-01, C-P-04/C-P-05, C-P-10, C-P-15 and G-P-03 moot by scope removal rather than patched (material simplification); C-P-02 fixed via materialized initialMarketDataHist plus BREAK_ON_RUIN in the path contract/fingerprint; C-P-03 fixed via a getCommonInputs()-path mapping table (hedged as "re-verify at implementation time"); C-P-06 addressed via NE-09 B additive trace instrumentation in simulator-engine-direct.js/forced-sale helpers, gated on tests proving unchanged financial semantics; C-P-07 addressed via an explicit absolute-run-index/tie-break contract with direct/worker parity tests in Slice 02; C-P-08 addressed via a named, position-independent shadow sub-seed (seed/run-index/contract-version/domain) entering the path fingerprint; C-P-09 addressed via NE-08 A snapshot capture/restore exclusion of sim.stressReplay.active.v1; C-P-11 addressed by reusing/extending runMonteCarloLogsForIndices() instead of a duplicate path; C-P-12 addressed via per-recordType reconciliation scoping; C-P-13 addressed by replacing the unbelegte "p95&lt;50ms" target with a measure-then-calibrate requirement in Slice 10; C-P-14/G-P-06 addressed by splitting former Slice 05/07 into Slices 05/06/08/09 with explicit per-slice file caps (&lt;=5/&lt;=6), safely under the ten-file stop rule. (4) Dependencies explicit: Slice 05 gates on NE-09, Slice 07 gates on NE-04/NE-07/NE-08. (5) Validation: attestation plan-validation-288e706abd7e is fingerprint-bound to this exact diff/commit (SLICE START COMMIT 798ce7d) and PASS with future_slices=10, matching the document.
- Größtes Restrisiko: Largest residual risk: Section 16 closes NE-01 through NE-09 as "Nutzerentscheidung (2026-08-14)" within the same turn that rewrites the plan, and the supplied evidence contains no independently attributable trace (no prior CONTRACT-UNCLEAR stop/resume record, no quoted user turn) proving these came from the user rather than from Codex itself, which the assignment explicitly forbids ("Offene Produktentscheidungen duerfen nicht eigenmaechtig getroffen werden ... muss der Lauf ... anhalten"). NE-01 C in particular deletes the feature's original headline use case (paired Gold/Aktienfonds counterfactual from section 1 of the prior draft) rather than fixing it, the single highest-leverage scope decision in the document. Partially mitigated because Section 2 still requires a separate fingerprint-bound user gate before Slice 01, and the Definition of Done explicitly keeps "Plan fingerprintgebunden extern reviewt und vom Nutzer freigegeben" open, but this reviewer cannot independently confirm authorship of NE-01..NE-09 from the packet alone. Secondary smaller risk: NE-09 B permits "additive" trace instrumentation inside simulator-engine-direct.js/simulator-forced-sale.js, which C-P-06 already showed likely requires inserting a new balance_trace phase (payout-fallback currently jumps after_payout to after_bond_refill with no snapshotBalance step); genuinely additive-only behavior is not self-evidently guaranteed by a plan-level promise.
- Realistische Bruchbedingung: Break condition: the downstream fingerprint-bound user gate is granted without an explicit, quotable user statement authorizing NE-01 through NE-09 (especially NE-01 C's removal of asset counterfactuals), so Slices 01-10 would implement a materially narrower feature than originally commissioned without traceable authorization; or Slice 05's "additive" diagnostic instrumentation changes balance_trace phase ordering/count in a way its own FlowDelta/financial-semantics tests fail to catch because those tests were written by the same slice that introduced the change.
- Eigene Findings: keine
<!-- audit:claude-review:end -->

### Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `plan-validation-288e706abd7e`
- Testdateien: keine
- Prüfdimensionen: Checked (1) State-v3 slice contract structure: exactly 10 sequential, 1-based headings (### Slice 01 to ### Slice 10) matching the orchestrator work-plan attestation without numeric prefixes; (2) Scope discipline: strictly confined to docs/internal/STRESS_PFAD_REPLAY_ARBEITSPLAN.md with zero out-of-scope code/test mutations; (3) Adversarial resolution of all 2026-08-07 historical findings (G-P-01..06 and C-P-01..16): baseline refreshed to branch codex/stress-pfad-replay at HEAD 798ce7d, asset counterfactual distortions cleanly eliminated via scope removal under NE-01 C, path contract augmented with initialMarketDataHist and BREAK_ON_RUIN (C-P-02), getCommonInputs mapping table formalized (C-P-03), position-independent shadow sub-seed specified for post-ruin continuation (C-P-08/G-P-04), recordType-scoped reconciliation defined (C-P-12), snapshot persistence exclusion formalized under NE-08 A (C-P-09), runMonteCarloLogsForIndices reused as single serial pass (C-P-11), empirical benchmark calibration replacing arbitrary latency goals (C-P-13), and former bulky slices decomposed into Slices 05/06/08/09 with per-slice caps &lt;=6 files safely respecting the 10-file stop rule (C-P-14/G-P-06); (4) Gating dependencies explicit (Slice 05 on NE-09, Slice 07 on NE-04/NE-07/NE-08, and all implementation slices on fingerprint-bound user gate); (5) Orchestrator validation attestation plan-validation-288e706abd7e is fingerprint-bound to diff 288e706abd7e and PASS.
- Größtes Restrisiko: Largest residual risk: Section 16 formalizes NE-01 C removing the initial Gold/Aktienfonds asset-toggle counterfactual from V1 to protect engine invariants, focusing V1 strictly on strategy and decumulation parameters; downstream implementation requires user awareness of this scope reduction at the fingerprint-bound gate. Secondary risk: Slice 05 additive trace instrumentation inside simulator-engine-direct.js/simulator-forced-sale.js could subtly affect balance_trace phase sequencing if not strictly checked against FlowDelta and snapshot invariants.
- Realistische Bruchbedingung: Break condition: The user grants the downstream gate expecting Gold/Aktienfonds allocation counterfactuals to be in V1 when they are explicitly excluded by NE-01 C, or Slice 05 diagnostic instrumentation in simulator-engine-direct.js alters trace phase indexing for existing simulation consumers.
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

### Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

### Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `plan-validation-288e706abd7e`

- Diff-Fingerprint: `288e706abd7e659d8cea0b1e1a8925e51035ae0821b29bc30e2d75debae7cba7`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: internal plan contract passed
- Ausgabedigest: `4d4a953c1c356f76e56f96ff0b06ae1029036ccce3e789364f97f1a24909c2f1`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| internal:work-plan-contract | PASS | 0 | slices=1; planned_paths=1; changed_paths=1; future_slices=10; work_plan=docs/internal/STRESS_PFAD_REPLAY_ARBEITSPLAN.md |
<!-- audit:validation-attestation:end -->

### Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure is governance, not code: Slices 01-10 are implemented exactly as specified and all tests are green, yet at final user acceptance it emerges the user never actually agreed to drop the Gold/Aktienfonds counterfactual (NE-01 C), the feature's original motivating question, because that closure was authored inside this same planning turn without a separately verifiable user record. The second most likely cause is that NE-09 B's trace instrumentation in simulator-engine-direct.js/simulator-forced-sale.js quietly restructures balance_trace phase sequencing to obtain payout-fallback gross/tax data (as C-P-06 already flagged as structurally necessary), and a downstream consumer that pattern-matches trace phases regresses despite the plan's "unchanged financial semantics" promise.
  - Ereignis 3: In three months, the most likely issue is that a stakeholder expects the original paired Gold/Aktienfonds allocation counterfactual in V1 and discovers it was deliberately excised under NE-01 C in favor of existing decumulation strategy parameters; the second most likely issue is that Slice 05's additive trace instrumentation in simulator-engine-direct.js alters balance_trace phase numbering or ordering in a manner that slips past unit tests but regresses an external trace consumer.
<!-- audit:test-approval-premortem:end -->

### Findings-Lebenszyklus

<!-- audit:findings:begin -->
Noch keine strukturierten Findings.
<!-- audit:findings:end -->

### Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| – | – | Noch keine Findings | – | – | – |
<!-- audit:decision-table:end -->

### Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `NOT_RECORDED`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `NO`
<!-- audit:approval-status:end -->
