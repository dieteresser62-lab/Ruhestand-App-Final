# Slice 09 - Floor und weicher Mindest-Flex-Stabilisator

**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Branch-Entscheidung:** dauerhafte Nutzerentscheidung vom 2026-07-29 fuer
Slice 02 bis 13; kein neuer Feature-Branch  
**GitHub-Status:** Remote `origin` ist vorhanden; fuer den aktiven Branch ist
kein Upstream konfiguriert  
**Basiscommit:** `ad08236`  
**Status:** CR09-1 bis CR09-3 technisch nachgebessert und selbstgeprueft;
externes Re-Review ausstehend  
**Freigabe:** ausstehend; Codex nimmt keine Selbstfreigabe vor  
**Uebergeordneter Plan:**
[`BACKTEST_2000_2025_DATENPRUEFUNG.md`](./BACKTEST_2000_2025_DATENPRUEFUNG.md)

## Input aus dem Ergebnisdokument von Slice 08

Das vollstaendige Ergebnisdokument
`SLICE_BACKTEST_DATENPRUEFUNG_08_LIQUIDITAETS_RUNWAY_PUFFERVERTRAG.md`
ist die verbindliche Eingangsgrenze. Slice 08 ist durch Claudes Reviewrunde 3
technisch freigegeben und als lokaler Commit `ad08236` vorhanden.

Vor der Mindest-Flex-Umsetzung muessen die zwei ausdruecklichen Auflagen des
Slice-08-Reviews geschlossen werden:

- **CR08-18:** Ein bedarfsfreies Jahr darf nicht als maximale Runway-Not
  erscheinen. Post-Jahresend-Runway und -Deckung benoetigen fuer den Zustand
  ohne positiven Nettojahresbedarf einen nicht numerischen
  `not_applicable`-Vertrag; Backtest-Minimum und Stressjahre duerfen diesen
  Zustand nicht als 0 Monate beziehungsweise 0 Prozent werten.
- **CR08-20:** Der echte 1-Jahr-/5-Jahre-Zwangsverkauf-Witness muss die im
  Slice-08-Ergebnis genannten 50.000/90.000 EUR exakt innerhalb einer
  dokumentierten Toleranz pinnen. Die nur fuer die Fehlersuche ergaenzten
  Felder `resultKeys` und `resultError` werden aus der 3-Bucket-Projektion
  entfernt.

Die Slice-08-Ergebnisdeltas bleiben Eingangsorakel und werden nicht als
Slice-09-Wirkung umgedeutet. Insbesondere bleiben das isolierte
`Slice07To08LiquidityRunwayBacktestDeltaV1`, die 98 geaenderten
Monte-Carlo-Blattpfade und die byteidentischen Slice-07-Fixtures getrennt.

CR08-17, CR08-21 bis CR08-23 sowie die aus Slice 07 und Slice 06
uebernommenen Restrisiken bleiben sichtbar, sind aber ohne neue
Vertragsentscheidung kein stiller Slice-09-Scope.

## Preflight vor Coding

**Gemessen am:** 2026-08-02  
**Aktiver Branch:** `codex/suite-datenintegritaet-hardening`  
**HEAD:** `ad08236 feat(simulator): implement slice 08 liquidity runway and buffer contract`  
**Arbeitsbaum:** sauber (`git status --short` ohne Ausgabe)  
**Unerwartete Dateien:** keine  
**Branchstatus:** kein Upstream konfiguriert; die dokumentierte dauerhafte
Nutzerentscheidung erlaubt die lokale Fortsetzung auf diesem Branch

Fokussierte Baseline vor dem ersten Edit:

| Gate | Ergebnis |
|---|---|
| `node tests/run-single.mjs tests/spending-planner.test.mjs` | 135/135 Assertions gruen |
| `node tests/run-single.mjs tests/historical-backtest-runner.test.mjs` | 121/121 Assertions gruen |
| `node tests/run-single.mjs tests/simulator-multiprofile-aggregation.test.mjs` | 67/67 Assertions gruen |
| `node tests/run-single.mjs tests/liquidity-runway-contract.test.mjs` | 364/364 Assertions gruen |

## Ziel und zu schliessende Befunde

**Befunde:** D-03, D-09, D-11 und D-17  
**Vorgates:** CR08-18 und CR08-20  
**Planblocker:** P-01

Der Floor bleibt in finanzierbaren Szenarien hart. Mindest-Flex ist ein
weicher, budgetfinanzierter Stabilisator gegen kurzfristige Ausschlaege und
darf erst nach transparentem Stress- beziehungsweise Budgetvertrag
unterschritten werden. Jede Unterschreitung weist Status, Soll, Ist und
Fehlbetrag aus. Die profilbezogene Eingabe wird vor Coding in eine eindeutige
Haushaltssemantik ueberfuehrt.

## Vorlaeufige Akzeptanzkriterien

1. Floor-Shortfall ist in jedem finanzierbaren Szenario exakt 0 EUR; ein
   nicht finanzierbarer Floor ist ein explizites finanzielles Ruin-Outcome.
2. Die Prioritaet von Alarm, Guardrails, Mindest-Flex, Flex-Budget und finaler
   Glaettung ist als versionierter Vertrag dokumentiert und durch
   diskriminierende Tests gebunden.
3. Ein kurzer Schock stabilisiert den effektiven Flexbetrag gemaess dem
   freigegebenen Mindest-Flex- und Flex-Budgetvertrag.
4. Ein laengerer Stresspfad beziehungsweise ein erschoepftes Flex-Budget darf
   Mindest-Flex unterschreiten, weist dann aber mindestens Status, Sollbetrag,
   Istbetrag und nominalen Fehlbetrag aus.
5. Die Felder `minimumFlexAnnual`, `minimumFlexEffectiveBefore`,
   `minimumFlexEffectiveAfter` und der neue Fehlbetrag beziehen sich auf
   dieselbe Inflations-, Haushalts- und Jahresphase.
6. Die historischen Jahre 2001, 2005, 2009 und 2010 exportieren bei aktivem
   Mindest-Flex keinen falschen `minimumFlexAnnual`-Nullwert.
7. D-09 wird mit expliziter Bezugsbasis fuer Bruttoflex, erfuellten Flex und
   Kuerzungsquote reconciliert; Floor-aus-Depot wird nicht als Flexzahlung
   ausgegeben.
8. Der nach S09-STOP-01 freigegebene Haushaltsvertrag ist in Profilverbund,
   UI-/Requestwert, Engine-Eingang, Jahreszeile und Export identisch.
9. `minimumFlexAnnual` wird an jeder externen Eingangsgrenze validiert und
   nirgends still begrenzt. Ein Wert oberhalb des zugehoerigen Flexbedarfs
   scheitert mit einem feldgenauen Fehler.
10. CR08-18 und CR08-20 sind durch eigene Negativ- beziehungsweise
    Browserwitnesses geschlossen, bevor Mindest-Flex-Ergebnisfixtures neu
    verankert werden.
11. Das isolierte Slice-08-zu-Slice-09-Delta-Ledger erklaert jede erwartete
    Ergebnisverschiebung. Outcomewechsel, auffaelliger `FlowDelta` oder
    unterschiedliche UI-/Engine-Namen stoppen die Umsetzung.
12. `npm test`, Coverage, Browser, Doku-Evidenz und `npm run build:engine`
    sind gruen; `engine.js`, `dist/` und `RuheStandSuite.exe` bleiben
    unveraendert.

## Vertragsinventur vor Coding

### Bestehender Aggregationspfad

- Einzelprofile lesen `minimumFlexAnnual` separat.
- `combineSimulatorProfiles()` summiert die Werte zu
  `combined.minimumFlexAnnual` und bewahrt zusaetzlich
  `minimumFlexProfiles` als Profilaufschluesselung.
- `simulator-main-profiles.js` schreibt den summierten Wert in das sichtbare
  Haushaltsfeld; `getCommonInputs()` reicht Wert und Profilaufschluesselung in
  den Laufrequest weiter.
- Engine- und Simulatorvalidator verlangen bereits
  `0 <= minimumFlexAnnual <= flexBedarf`; ein ungueltiger Wert darf nicht
  still geklemmt werden.

### Bestehende Policy-Reihenfolge

Der aktuelle Pipelinepfad lautet:

1. Guardrails,
2. Mindest-Flex-Anhebung,
3. Flex-Budget-Cap beziehungsweise -Mindestrate,
4. finale Glaettung.

Flex-Budget und finale Glaettung duerfen die vorherige Mindest-Flex-Anhebung
anschliessend wieder reduzieren. Die Diagnostik setzt dann
`limited_by_flex_budget` beziehungsweise
`applied_limited_by_final_smoothing`, exportiert aber noch keinen expliziten
nominalen Fehlbetrag nach der finalen Stufe.

### S09-STOP-01 - Haushalts-Mindest-Flex

Der Referenzfall fuehrt profilbezogen 36.000 EUR und 30.000 EUR, bei einem
aggregierten Flexbedarf von 60.000 EUR. Damit sind die fachlich moeglichen
Regeln nicht aequivalent:

| Variante | Effektiver Haushaltswert im Referenzfall | Folge |
|---|---:|---|
| Summe der Profilwerte | 66.000 EUR | verletzt `minimumFlexAnnual <= flexBedarf`; muss fail-closed blockieren |
| Maximum der Profilwerte | 36.000 EUR | interpretiert Profilwerte als alternative Haushaltsgrenzen |
| Wert des primaeren Simulationsprofils | 36.000 oder 30.000 EUR | Ergebnis haengt bewusst von der Wahl des Primaerprofils ab |
| eigener Haushaltswert | separat festzulegen | Profilwerte bleiben Metadaten und steuern die Engine nicht direkt |

Der Nutzer hat am 2026-08-02 die empfohlene additive Semantik bestaetigt:
Profilwerte werden summiert. Ueberschreitet die Summe den aggregierten
Flexbedarf des Haushalts, scheitert die Profilaggregation fail-closed; es gibt
weder Maximum-/Primaerprofil-Fallback noch stilles Begrenzen. S09-STOP-01 ist
damit geschlossen.

### S09-STOP-02 - Externe Validierungsgrenzen ausserhalb des Zehn-Dateien-Scopes

Der Implementierungsabgleich hat zwei weitere produktive Eingangsgrenzen
identifiziert: `engine/core.mjs` normalisiert nicht-finites
`minimumFlexAnnual` weiterhin still auf `0`; `app/simulator/simulator-input-validation.js`
interpretiert einen nicht-finiten Wert ebenfalls als `0`. Damit ist das
Abnahmekriterium „an jeder externen Eingangsgrenze validieren, nirgends still
begrenzen oder ersetzen“ im festgeschriebenen Zehn-Dateien-Scope nicht
erreichbar.

Die fachlich vollstaendige Korrektur erfordert daher die ausdrueckliche
Erweiterung auf zwoelf produktive Dateien um genau diese beiden Module. Der
Nutzer hat diese Erweiterung am 2026-08-02 freigegeben. S09-STOP-02 ist damit
geschlossen; andere Programmdateien werden durch die Freigabe nicht in den
Scope aufgenommen.

## Festgeschriebener Programmdatei-Scope

Vor dem ersten Programmdatei-Edit war der Scope auf zehn produktive Dateien
begrenzt. Mit der ausdruecklichen Nutzerfreigabe zu S09-STOP-02 umfasst er nun
genau folgende zwoelf produktive Dateien:

- `app/simulator/simulator-profile-inputs.js`;
- `app/simulator/simulator-year-result.js`;
- `app/simulator/simulator-accumulation-year.js`;
- `app/simulator/simulator-main-helpers.js`;
- `app/simulator/historical-backtest-metrics.js`;
- `app/simulator/historical-backtest-export.js`;
- `app/balance/balance-diagnosis-keyparams.js`;
- `engine/planners/SpendingPlanner.mjs`;
- `engine/planners/spending-policy-pipeline.mjs`;
- `engine/planners/minimum-flex-policy.mjs`;
- `engine/core.mjs`;
- `app/simulator/simulator-input-validation.js`;
- fokussierte Profilverbund-, Policy-, Engine-, Backtest-, Worker- und
- neue Slice-09-Messfixtures und isoliertes Delta-Ledger;
- Dokumentations-Sync im Hauptplan und den betroffenen Referenzdokumenten.

Wenn die freigegebene Semantik mehr als zehn produktive Dateien erfordert,
greift die projektweite Stop-Regel erneut und der Slice wird vor Coding
geteilt oder der Nutzer um eine ausdrueckliche Scope-Entscheidung gebeten.

## Nicht im Scope

- keine Aenderung der in Slice 02 bis 07 gepinnten historischen Reihen;
- keine Steuerkorrektur aus Slice 10;
- keine Neudefinition des Runway-Ziels oder der Legacy-Migration aus Slice 08;
- keine Gold-, Pflege-, Mortalitaets-, CAPE- oder Lohnkalibrierung;
- keine stille Begrenzung von `minimumFlexAnnual`;
- keine manuelle Aenderung von `engine.js`;
- keine Aenderung von `dist/` oder `RuheStandSuite.exe`.

## Diff-Risiko vor dem ersten Programmdatei-Edit

```text
Geplante Dateien:
- noch nicht final; vorlaeufige Vertragsgrenzen siehe Scope
- tests fuer Haushaltsaggregation, Policy-Reihenfolge, Flex-Budget,
  finalen Fehlbetrag, D-17-Export, CR08-18 und CR08-20
- docs/internal/SLICE_BACKTEST_DATENPRUEFUNG_09_FLOOR_MINDEST_FLEX_STABILISATOR.md
- docs/internal/BACKTEST_2000_2025_DATENPRUEFUNG.md
- betroffene Referenzdokumentation nach finalem Contract

Voraussichtliche Aenderungstiefe:
- riskant

Gefaehrdete bestehende Tests:
- SpendingPlanner-, Guardrail-, Flex-Budget- und Final-Rate-Vertraege
- Profilverbundaggregation und Simulator-Inputvalidierung
- historische Backtestmetriken, Jahreszeilen und Export
- Monte-Carlo-, Sweep-, Worker- und Auto-Optimize-Paritaet
- Slice-08-Runway- und Delta-Orakel

Nicht anfassen:
- historische Datenreihen aus Slice 02 bis 07
- Steuer-, Gold-, Pflege-, Mortalitaets-, CAPE- und Lohnsemantik
- engine.js, dist/ und RuheStandSuite.exe

Rollback-Strategie:
- nach Freigabe geaenderte versionierte Dateien gezielt mit
  git checkout -- <datei...> auf Basiscommit ad08236 zuruecksetzen
- neue Slice-Datei nur nach ausdruecklicher Freigabe loeschen
- keine Hard-Resets oder sonstigen destruktiven Git-Kommandos
```

## Geplante Tests

- fokussierter Mindest-Flex-/Pipelinevertrag mit kurzer Stabilisierung,
  Budgeterschoepfung, Alarm, finaler Glaettung und nominalem Fehlbetrag;
- Profilverbundwitness fuer den freigegebenen Haushaltsvertrag und fuer
  ungueltige Profilkombinationen;
- D-17-Jahreszeilen 2001, 2005, 2009 und 2010;
- Floor-finanzierbar versus finanzieller Ruin;
- CR08-18 mit positivem Bedarf/0 EUR Liquiditaet und bedarfsfreiem Jahr;
- CR08-20 im echten Balance-Browserpfad mit exakten Verkaufsbetraegen;
- isolierte Slice-08-zu-Slice-09-Backtest- und
  Monte-Carlo-/Sweep-Deltafixtures;
- Worker-/Seriellparitaet fuer Status, Soll, Ist und Fehlbetrag;
- `npm test`, `npm run test:coverage`, `npm run test:browser`,
  `npm run docs:evidence`, `npm run build:engine` und `git diff --check`.

## Durchgefuehrte Aenderungen

- Slice-Dokument auf Basis des vollstaendigen Slice-08-Ergebnisdokuments
  angelegt.
- Branch-, Arbeitsbaum-, Baseline-, Vorgate- und Vertragsstatus dokumentiert.
- S09-STOP-01 durch Nutzerentscheidung geschlossen: additive Profilwerte mit
  fail-closed Ablehnung oberhalb des aggregierten Haushalts-Flexbedarfs.
- Exakten Ausgangsscope von zehn produktiven Dateien und die zugehoerigen
  Vertragsgrenzen vor dem ersten Programmdatei-Edit festgeschrieben.
- Policy, finale Mindest-Flex-Diagnostik, Haushaltsreconciliation, V2-Metriken,
  Raw-Export, CR08-18/CR08-20-Witnesses und getrennte Slice-09-Backtestfixture
  umgesetzt.
- S09-STOP-02 ausgeloest und durch ausdrueckliche Nutzerfreigabe geschlossen;
  der Scope umfasst jetzt genau zwoelf produktive Dateien.
- `minimumFlexAnnual` wird an Engine-, Simulator-, Einzelprofil- und
  Haushaltsgrenze validiert; vorhanden ungueltige Werte werden nicht mehr als
  `0` weitergerechnet.
- `HistoricalBacktestMetricsV2` trennt Haushalts-Soll, Rentenueberschuss,
  Depot-Flex und Haushalts-Ist und aggregiert finale Mindest-Flex-Fehlbetraege.
- Mindest-Flex-Soll und -Ist verwenden dieselbe Haushaltsbasis: Der nach
  Floor-Deckung verbleibende Rentenueberschuss wird genau einmal angerechnet;
  nur der offene Rest steuert die Depot-Flex-Rate und den Vermoegensproxy.
- `minimum-flex-slice-09-measurement-v1.json` bindet die byteidentische
  Slice-08-Backtestfixture und weist fuer alle elf bestehenden positiven Faelle
  exakt null Endvermoegens-, Entnahme-, Steuer-, Outcome- und FlowDelta-Deltas
  aus. Der D-17-Zeuge exportiert 2001/2005/2009/2010 mit aktivem Soll sowie
  finalem Ist und Fehlbetrag.
- `minimum-flex-slice-09-v1.json` bindet die Slice-08-Monte-Carlo-Fixture per
  SHA-256. CAR-, Auto-Optimize- und finale MC-/Sweep-Aggregatprojektion bleiben
  hashgleich; aktive Rowdiagnostik wird getrennt durch Workerparitaet belegt.

## Ausgefuehrte Tests

- Fokussierte Verträge fuer Spending-Policy, Engine-/Simulatorvalidierung,
  Profilverbund, Backtest-Runner/-Metriken/-Export, D-17, Monte Carlo, Sweep und
  Workerparitaet: gruen.
- `npm test`: 160 Dateien, 17.980/17.980 Assertions, 0 fehlgeschlagene Dateien,
  0 offene Handles.
- `npm run test:coverage`: gruen; 78,31 Prozent beziehungsweise
  39.314/50.205 ausfuehrbare Zeilen in 216 Dateien.
- `npm run test:browser`: 28/28 Browser-Smokes gruen; CR08-20 pinnt 50.000 EUR
  im Einjahres- und 90.000 EUR im Fuenfjahrespfad mit 0,01 EUR Toleranz.
- `npm run docs:evidence`: gruen, rein lokale statische Validierung.
- `npm run build:engine`: gruen als Fallback-Modulwrapper; `engine.js` blieb
  unveraendert.
- `git diff --check`: gruen.

## Abweichungen vom Plan

- Der Hauptplan nennt die Profilaggregation nicht im Slice-09-Scope, obwohl
  P-01/D-11 sie als Blocker ausweisen. Das Slice-Dokument nimmt sie deshalb
  ausdruecklich als vorab zu entscheidenden Vertrag auf.
- Die aus Slice 08 uebernommenen CR08-18 und CR08-20 werden als zwingende
  Vorgates behandelt, bevor Slice-09-Fixtures neu verankert werden.
- Der erste Gesamtlauf traf eine veraltete Cross-Path-Assertion, die bei
  Policy-Status `applied` zwingend eine strikt hoehere gleichjaehrige Auszahlung
  verlangte. Der finale Slice-09-Vertrag prueft stattdessen, dass `applied` nach
  Monatsquantisierung als Soll/Ist/Fehlbetrag erfuellt reconciliert. Der
  Nicht-Reduktions- und FlowDelta-Vertrag blieb erhalten.

## Offene Risiken

- Mindest-Flex bleibt bewusst ein weicher Stabilisator. Budget, Notfallregeln,
  Gesamt-Flex und finale Quantisierung koennen das Soll unterschreiten; der
  Vertrag macht dies sichtbar, garantiert aber den Betrag nicht.
- Die 0,01-EUR-Erfuellungstoleranz trennt technisch bedingte Centabweichungen
  von einem berichtspflichtigen Fehlbetrag.
- Die MC-/Sweep-Aggregatfixture misst keine Rowdiagnostik. Dieser Scope ist
  explizit `false`; die aktive Zeilenparitaet liegt im Worker- und
  deterministischen Backtestvertrag.
- Die Restrisiken CR08-17, CR08-21 bis CR08-23 bleiben ausserhalb des
  vorlaeufigen Scopes offen.

## Rueckdokumentation in den Hauptplan

Der Hauptplan verlinkt dieses Slice-Dokument und dokumentiert
Slice-08-Eingangsvertrag, beide Stop-Entscheidungen, technische Umsetzung,
Delta-Ledger, Testergebnisse und ausstehendes externes Review.

## Freigabestatus

Preflight abgeschlossen. S09-STOP-01 und S09-STOP-02 sind durch die
Nutzerentscheidungen vom 2026-08-02 geschlossen. Fuer die drei Reviewblocker
hat der Nutzer die Scope-Erweiterung fortgeschrieben; der produktive Scope
umfasst jetzt fuenfzehn Dateien. Technische Freigabe und lokaler Commit bleiben bis zum Re-Review
ausstehend. Codex erteilt keine Selbstfreigabe.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| U09-1 | Nutzer 2026-08-02 | Slice 09 beginnen und Slice-08-Ergebnisdokument als Eingang verwenden | angenommen | Preflight und Slice-Dokument angelegt |
| CR08-18 | Claude-Review Slice 08 Runde 3 | bedarfsfreies Jahr erscheint als maximale Runway-Not | als Vorgate uebernommen | umgesetzt und getestet; externe Abnahme ausstehend |
| CR08-20 | Claude-Review Slice 08 Runde 3 | Zwangsverkauf-Witness pinnt nur Richtung; Debugprojektion verblieben | als Vorgate uebernommen | 50.000/90.000 EUR exakt gepinnt, Debugfelder entfernt; externe Abnahme ausstehend |
| P-01 / D-11 / S09-STOP-01 | Claude-Planreview, Preflight und Nutzer 2026-08-02 | Haushaltsaggregation fuer profilbezogenen Mindest-Flex war fachlich offen | additive Profilwerte; Summe oberhalb des aggregierten Flexbedarfs scheitert fail-closed | umgesetzt und getestet; externe Abnahme ausstehend |
| S09-STOP-02 | Codex-Implementierungsabgleich und Nutzer 2026-08-02 | `engine/core.mjs` und `simulator-input-validation.js` enthielten stille Null-Fallbacks ausserhalb des urspruenglichen Zehn-Dateien-Scopes | Scope exakt um diese beiden Module auf zwoelf produktive Dateien erweitert | umgesetzt und getestet; externe Abnahme ausstehend |
| CR09-1 | Claude-Review (Runde 1) | Der Mindest-Flex-Fehlbetrag wird gegen die geplante statt gegen die tatsaechlich ausgezahlte Entnahme gemessen; dieselbe Zeile meldet 66,7 Prozent Haushalts-Flex-Kuerzung und Fehlbetrag 0 | technisch behoben; Re-Review ausstehend | Jahreszeile reconciliert gegen die Ist-Auszahlung; 30.000/26.000-EUR-Zeuge pinnt 2.000 EUR Ist, 4.000 EUR Fehlbetrag und `limited_by_actual_payout` |
| CR09-2 | Claude-Review (Runde 1) | AK 2 ist unerfuellt: es existiert kein versionierter Vertrag der Policy-Reihenfolge; die Reihenfolge steht weiterhin nur implizit im Pipelinecode | technisch behoben; Re-Review ausstehend | `SpendingPolicyOrderV1` bindet Alarm, Guardrails, Mindest-Flex, Flex-Budget und finale Glaettung durch Laufzeittrace und Tests fuer aktiven/inaktiven Alarm |
| CR09-3 | Claude-Review (Runde 1) | Vorgate CR08-18 ist nur zur Haelfte geschlossen: der Ansparpfad ist ungepinnt, und `sweep-runner.js` sowie die Ergebnistabelle wandeln den Nichtanwendbarkeitswert weiterhin in 0 | technisch behoben; Re-Review ausstehend | Ansparzeugen, Sweep-Minimum, kanonischer Reader sowie Backtest-/Worst-Run-Darstellung bewahren `null`; anwendbares 0 bleibt 0 |
| CR09-4 | Claude-Review (Runde 1) | AK 1 hat keinen Zeugen; der geplante Test "Floor-finanzierbar versus finanzieller Ruin" fehlt und ist nicht als Abweichung ausgewiesen | offen | ausstehend |
| CR09-5 | Claude-Review (Runde 1) | Die Profilaggregation lehnt zusaetzlich jedes Einzelprofil oberhalb seines eigenen Flexbedarfs ab; das ist strenger als die freigegebene additive Semantik und nirgends dokumentiert | offen | ausstehend |
| CR09-6 | Claude-Review (Runde 1) | `resolvePensionFlexContribution` faellt bei nicht-finiter Rente oder nicht-finitem Bedarf still auf 0 zurueck und entwertet die gesamte Haushaltsreconciliation ohne Marker | offen | ausstehend |
| CR09-7 | Claude-Review (Runde 1) | `readMinimumFlexAnnual` wirft einen nackten `RangeError` aus dem Planner statt eines feldgenauen Validierungsfehlers | offen | ausstehend |
| CR09-8 | Claude-Review (Runde 1) | Boolean, Array, Leerzeichenkette und Hexnotation werden an beiden neuen Eingangsgrenzen weiterhin still zu Zahlen; der `try`/`catch` um `Number()` ist wirkungslos | offen | ausstehend |
| CR09-9 | Claude-Review (Runde 1) | Der neue maschinenlesbare `errorCode` der Profilaggregation wird vom Produktaufrufer nicht gelesen | offen | ausstehend |
| CR09-10 | Claude-Review (Runde 1) | Die drei `flex_reduction_*`-Metriken behalten ihre V1-Kennung bei geaenderter Bezugsbasis; ausser der Schemaversion gibt es keinen Vergleichbarkeitsschutz | offen | ausstehend |
| CR09-11 | Claude-Review (Runde 1) | Der `??`-Rueckfall auf `kuerzungProzent` mischt Haushalts- und Depotbasis in derselben Metrikserie | offen | ausstehend |
| CR09-12 | Claude-Review (Runde 1) | `minimum-flex-policy.mjs` ist mit 90,55 Prozent das am schwaechsten abgedeckte neue Vertragsmodul der letzten vier Slices | offen | ausstehend |
| CR09-13 | Claude-Review (Runde 1) | Die Workerparitaet belegt die Fehlbetragsfelder nur im Wert 0; ein echter Fehlbetrag wird nie ueber die Chunkgrenze verglichen | offen | ausstehend |
| CR09-14 | Claude-Review (Runde 1) | Bei aktivem dynamischem Flex misst der Haushalts-Flexbedarf den statischen Bruttowert; eine Kuerzung des dynamischen Bedarfs erscheint als 0 Prozent | offen | ausstehend |
| CR09-15 | Claude-Review (Runde 1) | Die BANKRUPT-Zeile schreibt weiterhin fest `RunwayCoveragePct: 0` und geht ungefiltert in `runway_min_coverage_pct` ein | offen | ausstehend |
| CR09-16 | Claude-Review (Runde 2) | `minRunwayObserved` traegt im Sweep-Vertrag die Einheit `months`, wird aber aus `RunwayCoveragePct` gespeist und in der Heatmap als Monatswert formatiert | offen | ausstehend |
| CR09-17 | Claude-Review (Runde 2) | Ein `null`-`minRunwayObserved` entfernt die betroffene Sweep-Zelle vollstaendig aus Ziel- und Nebenbedingungen des Auto-Optimize, ohne Marker | offen | ausstehend |
| CR09-18 | Claude-Review (Runde 2) | `SPENDING_POLICY_ORDER_CONTRACT` protokolliert Quellpositionen statt ausgefuehrter Stufen; eine vollstaendig entfernte Guardrail-Stufe loest keine Reihenfolgeverletzung aus, und der Wurfpfad hat keinen Zeugen | offen | ausstehend |
| CR09-19 | Claude-Review (Runde 2) | `minimumFlexEffectiveFinal`, `minimumFlexShortfallAnnual` und `minimumFlexStatus` haben in Engine-keyParams und Simulatorzeile unterschiedliche Definitionen bei gleichem Feldnamen | offen | ausstehend |
| CR09-20 | Claude-Review (Runde 2) | `mc-log-builder.js` schreibt in zwei Terminalzeilen weiterhin fest `RunwayCoveragePct: 0` und ist von der CR09-3-Bereinigung nicht erfasst | offen | ausstehend |

## Blocker-Nachbesserung nach Claude-Review Runde 1

CR09-1 bis CR09-3 wurden ohne Veraenderung des nachstehenden Reviewtexts
technisch nachgebessert:

- Die finale Mindest-Flex-Diagnose verwendet jetzt den tatsaechlich auf
  Haushaltsebene erfuellten Flex nach Auszahlung. Eine zusaetzliche
  Auszahlungsluecke erhaelt den Status `limited_by_actual_payout`.
- `SpendingPolicyOrderV1` ist ein exportierter, unveraenderlicher Vertrag. Die
  Pipeline zeichnet jeden Schritt auf, prueft den Trace zur Laufzeit gegen den
  Vertrag und gibt ihn fuer diskriminierende Modultests zurueck, ohne den
  oeffentlichen Engine-Resultshape zu erweitern.
- Ein nicht anwendbarer Runway bleibt in Ansparjahren, Sweep-Runs,
  Sweep-Aggregation, Contract-Reader und Texttabellen `null` beziehungsweise
  leer. Ein fachlich anwendbarer Messwert 0 bleibt davon unterscheidbar.

Die Slice-09-Backtestfixture wurde nur fuer die dadurch korrigierten
D-17-Diagnosewerte 2001 und 2010 neu verankert. Alle elf bestehenden positiven
Faelle behalten Endvermoegen, Gesamtentnahme, Steuer, Outcome und FlowDelta
unveraendert. Nach der Nachbesserung bestanden `npm test` mit
17.980/17.980 Assertions, Coverage mit 78,31 Prozent (39.314/50.205), Browser
mit 28/28 sowie Doku-Evidenz, Engine-Build und `git diff --check`. Die Freigabe
bleibt bis zum unabhaengigen Re-Review ausstehend.

## Review-Feedback von Claude

**Reviewdatum:** 2026-08-02
**Pruefstand:** unverbuchter Arbeitsbaum auf Basiscommit `ad08236`.
**Rolle:** adversariales Fremdreview; ausser diesem Ergebnisdokument wurde
keine Datei dauerhaft veraendert.

### Selbstaendig nachgefahrene Gates

| Gate | Gemessen | Dokumentbehauptung |
|---|---|---|
| `npm test` | 160 Dateien, **17.957/17.957** Assertions, 0 Fehler, 0 offene Handles, 1 separates Gate | bestaetigt |
| `npm run test:coverage` | **78,29 Prozent** (39.258/50.146) in 216 Dateien, beide Pflichtdatei-Gates | bestaetigt |
| `npm run test:browser` | **28/28** | bestaetigt |
| `npm run docs:evidence` | erfolgreich, rein lokale statische Validierung | bestaetigt |
| `npm run build:engine` | Fallback-Build, `engine.js`, `dist/` und `RuheStandSuite.exe` unveraendert | bestaetigt |
| `git diff --check` | sauber | bestaetigt |

Modulabdeckung der neuen Vertragsdateien: `spending-policy-pipeline.mjs`
98,96 Prozent, `simulator-year-result.js` 98,67 Prozent,
`historical-backtest-metrics.js` 94,76 Prozent,
`simulator-accumulation-year.js` 94,38 Prozent, `engine/core.mjs`
88,17 Prozent, `simulator-profile-inputs.js` 85,49 Prozent,
`simulator-input-validation.js` 78,05 Prozent,
`minimum-flex-policy.mjs` **90,55 Prozent** (249 von 275 Zeilen).

Alle Zahlen des Dokuments stimmen. Die Gates sind nicht der Gegenstand der
Beanstandung; die Beanstandung betrifft, was sie nicht messen.

### Blocker

**CR09-1 - Der Fehlbetrag misst den Plan, nicht die Auszahlung.**
`SpendingPlanner.mjs:107` uebergibt
`Math.max(0, endgueltigeEntnahme - inflatedBedarf.floor)` an
`finalizeMinimumFlexDiagnostics`. `endgueltigeEntnahme` ist die **geplante**
Entnahme. Die tatsaechliche Auszahlung entsteht erst spaeter in
`simulator-engine-direct.js:701` als `Math.min(liquiditaet, jahresEntnahmeTarget)`,
und `applyPayoutFallbackSale` fuellt ausdruecklich nur bis `netFloorYear` auf,
nie bis zum Flexanteil. Ein Liquiditaetsengpass ist laut Kommentar in
`simulator-engine-direct.js:692` ausdruecklich **kein** Ruin, solange das
Gesamtvermoegen den Floor deckt - genau dieser Zustand erzeugt die Luecke.
`simulator-year-result.js:226` uebernimmt `minimumFlexEffectiveFinal`
unveraendert aus `keyParams` und rechnet nichts gegen die realisierte Entnahme
nach.

Gemessener Zeuge ueber `buildSimulatorYearResult` (Floor 24.000, Flexbedarf
6.000, Mindest-Flex 6.000, geplante Entnahme 30.000, verfuegbare Liquiditaet
26.000):

| Feld | Wert |
|---|---:|
| `flex_brutto_haushalt` | 6.000,00 |
| `flex_haushalt_erfuellt` | 2.000,00 |
| `flex_haushalt_kuerzung_pct` | 66,67 |
| `minimumFlexAnnual` | 6.000,00 |
| `minimumFlexEffectiveFinal` | 6.000,00 |
| `minimumFlexShortfallAnnual` | 0,00 |
| `minimumFlexFulfilled` | true |
| `minimumFlexStatus` | applied |

Dieselbe exportierte Zeile behauptet gleichzeitig eine Haushalts-Flex-Kuerzung
von 66,7 Prozent und einen vollstaendig erfuellten Mindest-Flex. Das verletzt
AK 4 (Unterschreitung weist Status, Soll, Ist und Fehlbetrag aus), AK 5
(dieselbe Haushalts- und Jahresphase) und AK 7 (Reconciliation von Bruttoflex
und erfuelltem Flex). Die neuen Metriken `minimum_flex_shortfall_years` und
`minimum_flex_shortfall_total_nominal_eur` untertreiben damit systematisch -
und zwar genau in den Liquiditaetsstressjahren, fuer die dieser Slice gebaut
wurde. Der Status `limited_by_final_quantization` verspricht ausserdem, die
Restursache sei die Monatsquantisierung; hier ist sie die fehlende Liquiditaet.

**CR09-2 - Der versionierte Reihenfolgevertrag existiert nicht.**
AK 2 verlangt, die Prioritaet von Alarm, Guardrails, Mindest-Flex, Flex-Budget
und finaler Glaettung sei "als versionierter Vertrag dokumentiert und durch
diskriminierende Tests gebunden". Eine Suche ueber `engine/`, `app/`, `types/`
und `tests/` nach einer Reihenfolgekonstante, einer Vertragsversion oder einem
exportierten Ordnungsartefakt liefert null Treffer. Die Reihenfolge steht
weiterhin ausschliesslich implizit in der Anweisungsfolge von
`applySpendingPolicyPipeline`. Diskriminierende Tests fuer einzelne
Statusuebergaenge existieren, aber sie binden den Ablauf, nicht einen Vertrag:
eine Umsortierung waere nicht als Vertragsbruch, sondern nur als
Ergebnisabweichung sichtbar. Slice 09 hat die Reihenfolge inhaltlich auch nicht
geaendert - D-03 lautete "Mindest-Flex wird vor der letzten Kuerzungsstufe
geprueft", und das ist weiterhin so; ergaenzt wurde ausschliesslich die
Diagnostik. Der Hauptplan meldet D-03 dennoch als technisch umgesetzt. Der
Abschnitt "Abweichungen vom Plan" nennt diese Luecke nicht.

**CR09-3 - Vorgate CR08-18 ist nur zur Haelfte geschlossen.**
Der Auszahlungspfad in `simulator-year-result.js` ist korrekt auf `null`
umgestellt und dreifach gepinnt. Drei Stellen bleiben offen:

1. **Ansparpfad ungepinnt.** Gegenprobe: In
   `simulator-accumulation-year.js` den Nichtanwendbarkeitswert wieder durch
   `(portfolio.liquiditaet > 0 ? 100 : 0)` ersetzt. `npm test` bleibt bei
   **17.957/17.957** vollstaendig gruen. Der Ansparzweig derselben Korrektur
   hat null Zeugen; er kann jederzeit unbemerkt zurueckfallen.
2. **Sweep.** `app/simulator/sweep-runner.js:865` liest
   `result.logData.RunwayCoveragePct || 0`. Der neue
   Nichtanwendbarkeitswert wird dort wieder zu 0, wandert ueber
   `if (runway < minRunway)` in `minRunway` und damit in die Risikokennzahl
   des Laufs. Zusaetzlich meldet Zeile 883 `minRunway === Infinity ? 0` -
   ein Lauf ganz ohne anwendbaren Runway erscheint als 0 Prozent.
3. **Ergebnistabelle.** `app/simulator/simulator-results.js:413` formatiert
   mit `v || 0` und `invalid: '0%'`. Der Nutzer sieht fuer ein bedarfsfreies
   Jahr weiterhin "0%".

Damit misst dieselbe Groesse jetzt in drei Oberflaechen drei verschiedene
Dinge. Der Slice erklaert CR08-18 als geschlossene Vorgate und verankert auf
dieser Grundlage die neuen Ergebnisfixtures (AK 10).

### Weitere Befunde

**CR09-4 - AK 1 hat keinen Zeugen.** Der Abschnitt "Geplante Tests" nennt
"Floor-finanzierbar versus finanzieller Ruin". Im Testdiff existiert kein
solcher Fall; "Ausgefuehrte Tests" nennt ihn ebenfalls nicht, und "Abweichungen
vom Plan" schweigt dazu. AK 1 ist damit weder umgesetzt noch als offen
ausgewiesen.

**CR09-5 - Die Aggregation ist strenger als die freigegebene Semantik.**
Die Nutzerentscheidung zu S09-STOP-01 lautet: additive Profilwerte, fail-closed
oberhalb des **aggregierten** Flexbedarfs. `simulator-profile-inputs.js:597`
lehnt zusaetzlich jedes Einzelprofil mit
`minimumFlexAnnual > startFlexBedarf + 0.01` ab. Beispiel: Profil A mit
36.000 EUR Mindest-Flex bei 30.000 EUR Flexbedarf und Profil B mit 0 EUR bei
30.000 EUR ergibt eine Summe von 36.000 EUR gegen 60.000 EUR Haushaltsflex -
die freigegebene Regel akzeptiert das, die Implementierung lehnt ab. Die
Zusatzregel mag fachlich sinnvoll sein; sie ist eine eigene Vertragsentscheidung
und gehoert in die Entscheidungstabelle, gerade in einem Slice, dessen Zweck
diese Semantik ist.

**CR09-6 - Stiller Nullrueckfall in der Haushaltsreconciliation.**
`minimum-flex-policy.mjs:29-35` gibt `0` zurueck, sobald `context.renteJahr`,
`input.floorBedarf` oder `input.flexBedarf` nicht finit ist. Damit faellt die
gesamte Renten-Haushalts-Anrechnung auf die reine Depotbasis zurueck -
`minimumFlexDepotAnnual` springt auf den vollen Zielwert, die geforderte
Flexrate steigt, und kein Feld weist den Ausfall aus. Das ist derselbe stille
Ersatzwert, dessen Beseitigung fuer `minimumFlexAnnual` die Scope-Erweiterung
auf zwoelf Dateien gerechtfertigt hat.

**CR09-7 - Nackter `RangeError` statt feldgenauem Fehler.**
`readMinimumFlexAnnual` wirft einen `RangeError` aus der Policy. AK 9 verlangt
einen feldgenauen Fehler. Auf dem validierten Pfad ist der Wurf unerreichbar,
weil `InputValidator.mjs:71` den Wert bereits abweist; genau deshalb ist er
Verteidigungscode. Wenn er dennoch feuert - Workerpfad, direkter Balanceaufruf,
kuenftiger Aufrufer ohne Validierung -, bricht der Lauf mit einem Fehlertyp ab,
den die Fehlerbehandlung der Suite nicht als Validierungsfehler erkennt.

**CR09-8 - Typkoerzierung an den neuen Eingangsgrenzen bleibt still.**
`engine/core.mjs:116` und `simulator-input-validation.js:22` behandeln nur
`null`, `''` und nicht-numerische Zeichenketten. `false` wird zu 0, `true` zu 1,
`[]` zu 0, `[9000]` zu 9.000, `' '` zu 0 und `'0x10'` zu 16 - jeweils ohne
Fehler. Der `try`/`catch` um `Number()` ist wirkungslos: `Number()` wirft nur
fuer `Symbol` und `BigInt`, und fuer beide waere ein Fehler die richtige
Antwort. AK 9 verlangt Validierung "an jeder externen Eingangsgrenze".

**CR09-9 - Der neue Fehlercode ist auf dem Produktpfad tot.**
`combineSimulatorProfiles` liefert `SIMULATOR_PROFILE_MINIMUM_FLEX_INVALID`
beziehungsweise `SIMULATOR_HOUSEHOLD_MINIMUM_FLEX_INVALID`.
`simulator-main-profiles.js:226` destrukturiert nur `{ combined, warnings }`.
Der maschinenlesbare Code existiert ausschliesslich im Test.

**CR09-10 - Metrikkennungen bleiben, Bezugsbasis wechselt.**
`flex_reduction_years_gte_10_pct`, `flex_reduction_max_pct` und
`flex_reduction_longest_streak_gte_10_pct` behalten ihre Kennungen, messen aber
jetzt die Haushaltsbasis statt `entscheidung.kuerzungProzent`. Zusaetzlich
wechselt der Nenner von `completed_years` auf `decumulation_years`. Der einzige
Unterscheidungsmerkmal ist die Schemaversion `HistoricalBacktestMetricsV2`. Ein
Vergleich einer V1- mit einer V2-Auswertung ueber dieselbe Kennung ist damit
still unzulaessig; einen Vergleichbarkeitsschutz gibt es nicht.

**CR09-11 - Gemischte Bezugsbasis in einer Serie.**
`historical-backtest-metrics.js:484` verwendet
`entry?.row?.flex_haushalt_kuerzung_pct ?? entry?.entscheidung?.kuerzungProzent`.
`flex_haushalt_kuerzung_pct` ist `null`, sobald `flex_brutto_haushalt` nicht
positiv ist; dann traegt die Depotbasis zur selben Serie bei. Eine einzige
Serie enthaelt dann zwei unterschiedliche Groessen. Die Gegenprobe, den
Rueckfall vollstaendig durch die Legacybasis zu ersetzen, faellt geschlossen zu
(eine Fehlassertion) - der Basiswechsel ist also gepinnt, die Mischung selbst
ist es nicht.

**CR09-12 - Abdeckung des zentralen Vertragsmoduls.**
`minimum-flex-policy.mjs` erreicht 90,55 Prozent; 26 ausfuehrbare Zeilen des
neuen Vertrags sind unbelegt. Zum Vergleich: die Slice-08-Vertragsdatei
`types/liquidity-runway-contract.js` lag bei 98,47 Prozent.

**CR09-13 - Die Workerparitaet belegt nur den Wert 0.**
`worker-parity.test.mjs` vergleicht `minimumFlexShortfallAnnual` ueber die
Chunkgrenze und verlangt zusaetzlich, dass irgendwo `minimumFlexAnnual > 0`
beobachtet wurde. Es gibt keine Zusicherung, dass jemals ein Fehlbetrag
groesser 0 verglichen wurde. Das wichtigste neue Feld ist ueber die Chunkgrenze
faktisch nur im Nullzustand belegt.

**CR09-14 - Haushaltsbedarf und dynamischer Flexbedarf sind entkoppelt.**
`simulator-year-result.js:156` setzt `grossHouseholdFlex` auf
`fullResult.input.flexBedarf`, waehrend `inflatedFlex` bei aktivem VPW in
`engine/core.mjs:692` durch `rawDynamicFlex` **ersetzt** wird. Uebersteigt der
dynamische Bedarf den statischen, klemmt `fulfilledHouseholdFlex` auf den
statischen Bruttowert und `flex_haushalt_kuerzung_pct` meldet 0 Prozent,
obwohl der geplante Flexbetrag deutlich gekuerzt wurde. Der Deskriptor
`flex_required_total_nominal_eur` heisst "Kumulierter Haushalts-Flexbedarf" und
sagt nicht, dass dynamischer Flex darin nicht vorkommt.

**CR09-15 - Die Ruinzeile behaelt den Nullsentinel.**
`historical-backtest-runner.js:567` schreibt fuer die BANKRUPT-Zeile fest
`RunwayCoveragePct: 0`. Waehrend die neuen Flexmetriken ueber
`decumulationRows` gefiltert werden, laeuft `runwaySeries` weiterhin ueber
`rows` einschliesslich der Ruinzeile. `runway_min_coverage_pct` ist damit fuer
jeden Ruinlauf konstruktionsbedingt 0. Das lag ausserhalb des Wortlauts von
CR08-18, gehoert aber zur selben Sentinelklasse und entwertet den Vergleich von
Ruin- und Nichtruinlaeufen.

### Gegenproben

| Probe | Mutation | Ergebnis |
|---|---|---|
| A | `resolvePensionFlexContribution` liefert konstant 0 | faellt zu: `spending-planner` und Slice-09-Backtestmessung scheitern |
| C | `simulator-year-result.js` zurueck auf `liquiditaet > 0 ? 100 : 0` | faellt zu, aber nur in `simulation.test.mjs`; kein Backtest- oder Metrikgate reagiert |
| D | `simulator-accumulation-year.js` zurueck auf `liquiditaet > 0 ? 100 : 0` | **faellt nicht zu**: 17.957/17.957 gruen |
| E | Kuerzungsserie zurueck auf reine `kuerzungProzent`-Basis | faellt zu: eine Fehlassertion |

### Geprueft und nicht beanstandet

- **Wird der Rentenueberschuss doppelt angerechnet?** Nein. Im statischen Pfad
  reduziert `engine/core.mjs:643` `inflatedBedarf.flex` bereits um den
  Ueberschuss; `pensionFlexContributionAnnual + flex` ergibt wieder den
  Bruttowert. Im VPW-Pfad ist der Ueberschuss ein echter zusaetzlicher
  Zufluss, der nicht entnommen wird. Die Addition ist in beiden Faellen
  korrekt.
- **Bleibt die Vertragsgrenze `minimumFlexAnnual <= flexBedarf` ueber die
  Jahre erhalten?** Ja. `baseMinimumFlexAnnual` und `baseFlex` werden mit
  demselben Inflationsfaktor fortgeschrieben.
- **Bricht ein ungueltiger Profilverbund die Oberflaeche?** Nein.
  `simulator-main-profiles.js:228` blockiert die Simulation und zeigt die
  Warnung; `combined: null` fuehrt nicht in einen Folgefehler.
- **Sind die Slice-06- und Slice-07-Orakel erhalten geblieben?** Ja. Die
  exakten Werte 56.705,98, -30.000, -4.318,72, 10,517888, 21 geaenderte
  Legacy-Step-Jahre und das archivierte Slice-06-zu-07-Ledger stehen
  unveraendert im Test. Die Slice-08-Fixture ist byteweise gebunden
  (`6642194525836a0c...`), und alle elf bestehenden Faelle weisen exakt
  0-Deltas aus.
- **CR08-20:** korrekt geschlossen. Der Browserzeuge pinnt 50.000 EUR und
  90.000 EUR mit 0,01 EUR Toleranz; `resultKeys` und `resultError` sind aus
  der 3-Bucket-Projektion entfernt und suiteweit nur noch als unbeteiligtes
  Feld in `auto-optimize-evaluate.js` vorhanden.
- **AK 6 / D-17:** erfuellt. Der Vierjahreszeuge exportiert 2001 bis 2010 mit
  aktivem Soll; die Fixture haelt 9.117,00 / 9.676,21 / 10.483,72 / 10.515,18
  fest.

### Aufgeraeumter Pruefstand

Die Gegenproben A, C, D und E wurden ueber ein vorab erstelltes
SHA-256-Manifest byteidentisch zurueckgesetzt; alle sechs beruehrten Dateien
melden `OK`. `git status --short` zeigt exakt dieselben 36 Eintraege wie vor
dem Review. `engine.js`, `dist/` und `RuheStandSuite.exe` sind unveraendert.

Anmerkung zum Ablauf: Bei der Ruecksetzung der Gegenprobe A habe ich zunaechst
`git checkout --` benutzt und damit kurzzeitig den unverbuchten Slice-09-Stand
von `minimum-flex-policy.mjs` auf `ad08236` zurueckgesetzt. Der Stand wurde
sofort aus der vorab angelegten Sicherung wiederhergestellt und gegen das
Manifest verifiziert; alle nachfolgenden Messungen liefen auf dem korrekten
Stand.

## Review-Ergebnis (Claude)

- **Status: blockiert**
- **Blocker:**
  - **CR09-1** - der Mindest-Flex-Fehlbetrag misst die geplante statt der
    ausgezahlten Entnahme; derselbe Datensatz meldet 66,7 Prozent
    Haushalts-Flex-Kuerzung und Fehlbetrag 0.
  - **CR09-2** - AK 2 ist unerfuellt; ein versionierter Vertrag der
    Policy-Reihenfolge existiert nicht und die Luecke ist nicht ausgewiesen.
  - **CR09-3** - Vorgate CR08-18 ist nur zur Haelfte geschlossen: der
    Ansparpfad ist ungepinnt, Sweep und Ergebnistabelle wandeln den
    Nichtanwendbarkeitswert weiterhin in 0.
- **Restrisiken:** CR09-4 bis CR09-15; uebernommen aus Slice 08 CR08-17,
  CR08-21 bis CR08-23, aus Slice 07 CR07-4 und CR07-7 bis CR07-15 sowie
  CR06-20 und CR06-23.
- **Pre-Mortem:** In drei Monaten meldet ein Nutzer, der Ruhestandsplan habe
  ihm ueber Jahre einen erfuellten Mindest-Flex bescheinigt, waehrend real
  regelmaessig ein Drittel seines flexiblen Budgets fehlte. Ursache: In den
  liquiditaetsengen Jahren lag die tatsaechliche Auszahlung unter der
  geplanten, der Fehlbetrag wurde aber gegen den Plan gemessen und blieb 0.
  Weil `minimum_flex_shortfall_years` genau daraus aggregiert, weist auch die
  Auswertung null Fehlbetragsjahre aus - und weil der Slice als Loesung fuer
  D-03 und D-17 gilt, sucht niemand in der Fehlbetragsmessung. Auffallen wird
  es erst, wenn jemand `flex_haushalt_kuerzung_pct` und
  `minimum_flex_shortfall_total_nominal_eur` derselben Auswertung
  nebeneinanderlegt.

## Zweitreview von Claude (Runde 2)

**Reviewdatum:** 2026-08-02
**Pruefstand:** unverbuchter Arbeitsbaum auf Basiscommit `ad08236` nach der
Blocker-Nachbesserung.
**Rolle:** adversariales Fremdreview; keine dauerhafte Aenderung an
Programmdateien.

### Selbstaendig nachgefahrene Gates

| Gate | Gemessen | Dokumentbehauptung |
|---|---|---|
| `npm test` | 160 Dateien, **17.980/17.980** Assertions, 0 Fehler, 0 offene Handles, 1 separates Gate | bestaetigt |
| `npm run test:coverage` | **78,31 Prozent** (39.314/50.205) in 216 Dateien, beide Pflichtdatei-Gates | bestaetigt |
| `npm run test:browser` | **28/28** | bestaetigt |
| `npm run docs:evidence` | erfolgreich | bestaetigt |
| `npm run build:engine` | Fallback-Build; `engine.js`, `dist/` und `RuheStandSuite.exe` unveraendert | bestaetigt |
| `git diff --check` | sauber | bestaetigt |

### CR09-1 - geschlossen

`simulator-year-result.js:180-194` reconciliert den Mindest-Flex jetzt gegen die
realisierte Auszahlung: `minimumFlexEffectiveFinal` ist
`min(minimumFlexAnnual, fulfilledHouseholdFlex)`, und `fulfilledHouseholdFlex`
stammt aus `jahresEntnahmeEffektiv`. Eine zusaetzliche Auszahlungsluecke erhaelt
den eigenen Status `limited_by_actual_payout`.

Derselbe Zeuge wie in Runde 1 (Floor 24.000, Flexbedarf 6.000, Mindest-Flex
6.000, geplante Entnahme 30.000, verfuegbare Liquiditaet 26.000):

| Feld | Runde 1 | Runde 2 |
|---|---:|---:|
| `flex_haushalt_erfuellt` | 2.000,00 | 2.000,00 |
| `flex_haushalt_kuerzung_pct` | 66,67 | 66,67 |
| `minimumFlexEffectiveFinal` | 6.000,00 | **2.000,00** |
| `minimumFlexShortfallAnnual` | 0,00 | **4.000,00** |
| `minimumFlexFulfilled` | true | **false** |
| `minimumFlexStatus` | applied | **limited_by_actual_payout** |

Der Widerspruch innerhalb einer Zeile ist damit aufgeloest.
**Gegenprobe I:** `minimumFlexEffectiveFinal` wieder auf den Planwert
`plannedMinimumFlexEffective` gesetzt - eine Fehlassertion. Die Reconciliation
ist gepinnt.

Die Fixture-Neuverankerung ist belegt: Nur die D-17-Jahre 2001
(10.488,00 auf 9.117,00) und 2010 (11.559,53 auf 10.515,18) haben sich
geaendert, beide durch die neue Deckelung auf das Soll. Alle **elf** bestehenden
Faelle behalten Endvermoegen, Gesamtentnahme, Steuer, Outcome und FlowDelta
mit exakt 0-Delta; die Slice-08-Quellfixture ist weiterhin byteidentisch
(`6642194525836a0c...`).

### CR09-2 - geschlossen mit Einschraenkung

`SPENDING_POLICY_ORDER_CONTRACT` ist ein exportierter, `Object.freeze`-ter
Vertrag mit `schemaVersion: 'SpendingPolicyOrderV1'` und der vollstaendigen
Stufenfolge. Der Modultest bindet Version und Reihenfolge, und der Vertrag ist
zur Laufzeit wirksam:

**Gegenprobe F:** Im Vertrag `minimum_flex` und `flex_budget` vertauscht.
`npm test` scheitert breit - **16 Fehlassertionen in 12 Dateien**. Die
Reihenfolgepruefung ist kein toter Code.

AK 2 ist damit erfuellt. Die Einschraenkung steht als CR09-18: Der
protokollierte Trace bildet Quellpositionen ab, nicht ausgefuehrte Stufen.

### CR09-3 - geschlossen

Alle drei in Runde 1 benannten Stellen sind bereinigt:

| Stelle | Zustand |
|---|---|
| `simulator-accumulation-year.js` | `RunwayCoveragePct` und `runwayMonths` bleiben `null` |
| `sweep-runner.js` | `mergeApplicableRunwayMinimum` als exportierte, getestete Funktion; `minRunway` startet auf `null` und bleibt `null` |
| `simulator-results.js` | `aggregateSweepMetrics` filtert nicht-numerische Werte und liefert `null`; Worst-Run-Spalte rendert `invalid: ''` |
| `sweep-metrics-contract.js` | `readSweepMetricValue` gibt `null` zurueck statt `Number(null) = 0` |

**Gegenprobe H:** Ansparjahr wieder auf `(liquiditaet > 0 ? 100 : 0)` -
eine Fehlassertion. Der in Runde 1 vollstaendig ungepinnte Zweig ist jetzt
gebunden. Der fachlich anwendbare Messwert 0 bleibt in allen vier Stellen von
`null` unterscheidbar; die Tests pinnen beide Faelle getrennt.

### Neue Befunde

**CR09-16 - Einheitenwiderspruch in der Sweep-Kennzahl.**
`sweep-metrics-contract.js:91` deklariert `minRunwayObserved` mit
`unit: 'months'` und `source: 'runOutcomes.minRunway'`. Gespeist wird der Wert
in `sweep-runner.js:874` aber aus `result.logData.RunwayCoveragePct`, also einer
**Prozentzahl**. `simulator-heatmap.js:483` formatiert ihn folgerichtig falsch
als `formatMonths(runwayValue, 1)`. Der Widerspruch besteht seit vor Slice 09;
die Nachbesserung hat genau diese Zeile und genau diesen Deskriptor angefasst,
ohne ihn zu korrigieren oder zu vermerken. Zusaetzlich fehlt dem Deskriptor -
anders als bei den Backtestmetriken - jede `missingnessRule`, obwohl der Wert
jetzt `null` sein kann.

**CR09-17 - Ein nicht anwendbarer Runway loescht die Sweep-Zelle aus dem
Auto-Optimize.** `simulator-optimizer.js:46` verlangt in `isValidSweepResult`,
dass **jede** angeforderte Kennzahl ungleich `null` ist. Vor der Nachbesserung
lieferte `minRunwayObserved` immer eine Zahl; jetzt ist `null` moeglich. Eine
Parameterkombination, deren Runway nie anwendbar war - etwa bei durchgaengig
konfigurierter Ziel-Liquiditaet 0 -, faellt damit still aus Zielfunktion
(`simulator-optimizer.js:402`) und Nebenbedingungen heraus. Vorher nahm sie mit
dem Wert 0 teil. Es gibt weder `invalidCombination`-Marker noch Hinweis in der
Oberflaeche; der Nutzer sieht eine Empfehlung, die auf einer stillschweigend
verkleinerten Grundgesamtheit beruht. Ein Zeuge fuer diesen Pfad fehlt.

**CR09-18 - Der Reihenfolgetrace protokolliert Quellpositionen.**
`executedSteps.push('guardrails')` steht in `spending-policy-pipeline.mjs:36`
**vor** `if (!alarmStatus.active)`. Der Schritt wird also auch dann als
ausgefuehrt vermerkt, wenn seine Regel uebersprungen wird; Codex' eigener Test
haelt das ausdruecklich fest. `'alarm'` wiederum hat in dieser Funktion
ueberhaupt keinen Regelkoerper - die Alarmauswertung liegt im `SpendingPlanner`
davor.

**Gegenprobe G:** Die Guardrail-Stufe vollstaendig deaktiviert
(`if (false && !alarmStatus.active)`), der Push belassen. Ergebnis: **null**
Reihenfolgeverletzungen, nur 3 numerische Fehlassertionen. Der Vertrag bindet
also die Anordnung der Quelltextbloecke, nicht die tatsaechlich durchlaufenen
Stufen. Das Slice-Dokument formuliert es staerker ("Die Pipeline zeichnet jeden
Schritt auf, prueft den Trace zur Laufzeit gegen den Vertrag"). Ergaenzend:
`spending-policy-pipeline.mjs` faellt in der Abdeckung von 98,96 auf
94,21 Prozent - der neue Wurfpfad in `assertPolicyOrder` hat keinen Zeugen.

**CR09-19 - Gleicher Feldname, zwei Definitionen.**
`writeMinimumFlexDiagnostics` setzt in `state.keyParams`
`minimumFlexEffectiveFinal = min(householdFlexAnnual, Rente + Depotflex)` -
ungedeckelt und planbasiert. Die Simulatorzeile setzt dasselbe Feld auf
`min(minimumFlexAnnual, fulfilledHouseholdFlex)` - gedeckelt und
auszahlungsbasiert. Dasselbe gilt fuer `minimumFlexShortfallAnnual` und
`minimumFlexStatus`. `balance-diagnosis-keyparams.js` rendert die
Engine-Variante, der Backtestexport die Zeilenvariante. Wer beide Oberflaechen
nebeneinanderlegt, vergleicht zwei verschiedene Groessen unter einem Namen.
Fuer Balance ist die Planbasis vertretbar - dort gibt es keinen
Auszahlungsschritt -, aber der Unterschied gehoert benannt und benannt
unterschieden.

**CR09-20 - Der Nullsentinel in den Monte-Carlo-Terminalzeilen.**
`mc-log-builder.js:90` und `:144` schreiben weiterhin fest
`RunwayCoveragePct: 0`. Diese Zeilen lagen ausserhalb des Wortlauts von CR09-3,
gehoeren aber zur selben Sentinelklasse wie die bereinigte BANKRUPT-Zeile aus
CR09-15.

### Unveraendert offen aus Runde 1

CR09-4 bis CR09-15 sind im Dokument als `offen` gefuehrt und wurden nicht
bearbeitet; das ist konsistent ausgewiesen. Zwei davon haben durch die
Nachbesserung an Gewicht gewonnen:

- **CR09-4** bleibt die groesste Luecke: AK 1 hat weiterhin keinen Zeugen. Die
  einzigen Floor-Shortfall-Assertionen der Suite stehen in
  `historical-backtest-runner.test.mjs:413` und `:445` und pruefen synthetische
  Ruinfixtures, nicht die Aussage "in jedem finanzierbaren Szenario exakt
  0 EUR". Der Abschnitt "Abweichungen vom Plan" nennt die Luecke weiterhin
  nicht.
- **CR09-14** ist jetzt tragend statt nur berichtend: `fulfilledHouseholdFlex`
  speist nach der CR09-1-Korrektur den Fehlbetrag selbst. Bei aktivem
  dynamischem Flex bleibt die Bezugsbasis der statische
  `input.flexBedarf`.
- **CR09-12** unveraendert: `minimum-flex-policy.mjs` steht weiterhin bei
  90,55 Prozent (249/275).

### Geprueft und nicht beanstandet

- **Leckt `policyOrder` in den oeffentlichen Resultshape?** Nein. Das Feld
  existiert ausserhalb von `spending-policy-pipeline.mjs` in keiner
  Programmdatei.
- **Ist der anwendbare Messwert 0 noch von `null` unterscheidbar?** Ja, in
  allen vier bereinigten Stellen; `sweep-metrics.test.mjs` und
  `simulator-log-columns.test.mjs` pinnen beide Faelle einzeln.
- **Wurden Orakel frueherer Slices entwertet?** Nein. Die exakten
  Slice-06-Werte, das archivierte Slice-06-zu-07-Ledger und die
  byteidentische Slice-08-Fixture stehen unveraendert.
- **Wurde die neue Fixture ueber die Blockerkorrektur hinaus verschoben?**
  Nein. Genau zwei D-17-Werte haben sich geaendert; alle elf Bestandsfaelle
  bleiben bei 0-Delta.

### Aufgeraeumter Pruefstand

Die Gegenproben F, G, H und I wurden ueber ein vorab erstelltes
SHA-256-Manifest byteidentisch zurueckgesetzt; alle fuenf beruehrten Dateien
melden `OK`. `engine.js`, `dist/` und `RuheStandSuite.exe` sind unveraendert.
Ausser diesem Ergebnisdokument ist keine Datei von mir veraendert.

## Review-Ergebnis (Claude, Runde 2)

- **Status: freigegeben**
- **Blocker: keine**
- **Geschlossen:** CR09-1 (numerisch nachgemessen, mit Gegenprobe I gepinnt),
  CR09-2 (versionierter Vertrag, mit Gegenprobe F als laufzeitwirksam
  nachgewiesen), CR09-3 (alle vier Stellen bereinigt, mit Gegenprobe H
  gepinnt).
- **Auflagen vor Slice 10:** **CR09-4** (AK 1 hat keinen Zeugen und ist nicht
  als Abweichung ausgewiesen) und **CR09-14** (der Haushalts-Flexbedarf misst
  bei aktivem dynamischem Flex den statischen Bruttowert und speist nach der
  CR09-1-Korrektur den Fehlbetrag selbst).
- **Restrisiken:** CR09-5 bis CR09-13, CR09-15 sowie die neuen CR09-16 bis
  CR09-20; uebernommen aus Slice 08 CR08-17 und CR08-21 bis CR08-23, aus
  Slice 07 CR07-4 und CR07-7 bis CR07-15 sowie CR06-20 und CR06-23.
- **Pre-Mortem:** In drei Monaten meldet ein Nutzer, das Auto-Optimize liefere
  fuer sein Profil keine oder eine offensichtlich falsche Empfehlung. Ursache:
  Er faehrt ohne Liquiditaetspuffer, sein Runway ist damit nie anwendbar,
  `minRunwayObserved` ist `null`, und `isValidSweepResult` wirft jede seiner
  Parameterkombinationen aus Zielfunktion und Nebenbedingungen. Kein Gate
  schlaegt an - der Nullwert ist die fachlich richtige Antwort auf eine nicht
  anwendbare Messung -, aber niemand hat entschieden, was ein Optimierer mit
  einer nicht anwendbaren Kennzahl tun soll. Gesucht wird dann in der
  Sweepmechanik statt in der Nichtanwendbarkeitssemantik, die Slice 09
  eingefuehrt hat.
