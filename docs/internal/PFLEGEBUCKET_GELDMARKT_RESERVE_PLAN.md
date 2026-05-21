# Pflegebucket als gesperrte Geldmarkt-ETF-Reserve

## Ziel

Dieses Dokument beschreibt eine optionale Erweiterung der Ruhestands-Suite: einen zweckgebundenen Pflegebucket, der als Geldmarkt-ETF-Reserve modelliert wird.

Der Bucket ist liquide, aber algorithmisch gesperrt. Er soll nicht als normale Liquiditaet, Runway-Reserve oder frei konsumierbares VPW-Vermoegen zaehlen. Erst bei einem definierten Pflege-Trigger wird er zur Deckung pflegebedingter Liquiditaetsluecken freigegeben.

## Fachliche Einordnung

Der Pflegebucket ist keine Renditeoptimierung und keine Versicherung im rechtlichen Sinn. Er ist eine interne Selbstversicherungsreserve.

Fachlich loest er zwei Probleme:

- Pflegekosten treten oft spaet, sprunghaft und mit kurzer Reaktionszeit auf.
- Die normale Entnahmelogik darf zweckgebundenes Pflegekapital nicht vorab als Flex- oder VPW-Spielraum freigeben.

Bei hohem Gesamtvermoegen ist der Bucket nicht zwingend notwendig, kann aber als Modellhygiene sinnvoll sein. Er verhindert, dass die Simulation einen Teil des risikoarmen Vermoegens als frei verfuegbaren Konsumpuffer behandelt, obwohl er mental und strategisch fuer Pflege reserviert ist.

## Leitentscheidung

Der Bucket wird als separater Portfolio-Posten gefuehrt:

```js
portfolio = {
  liquiditaet: 80000,
  healthBucketGeldmarkt: 150000,
  depotTranchesAktien: [],
  depotTranchesGold: []
};
```

Er wird nicht in `liquiditaet` eingerechnet. Damit bleibt die bestehende Bedeutung von Liquiditaet stabil: operative Entnahme- und Runway-Reserve.

## Default-Empfehlung

```js
{
  healthBucketEnabled: false,
  healthBucketInitialAmount: 150000,
  healthBucketAssetSource: 'geldmarkt_etf',
  healthBucketTriggerMinGrade: 4,
  healthBucketTriggerMode: 'OR',
  healthBucketCoverageMode: 'care_additional_floor_only',
  healthBucketReturnMode: 'cash_return'
}
```

Das Feature sollte initial deaktiviert sein, damit bestehende Simulationen unveraendert bleiben. Nutzer koennen dann gezielt Szenarien mit 0 EUR, 75.000 EUR, 150.000 EUR oder 250.000 EUR Pflegebucket vergleichen.

## Nicht-Ziele

- Keine Integration als normale Tagesgeld-Liquiditaet.
- Keine automatische Optimierung des Bucket-Betrags in der ersten Version.
- Keine Veraenderung der Steuerlogik in `tax-settlement.mjs`.
- Keine manuelle Bearbeitung generierter Artefakte wie `engine.js`.
- Keine Vermischung mit der 3-Bucket-Anleihenlogik.

## Architekturprinzip

Der Health-Bucket soll moeglichst als Simulator-Middleware umgesetzt werden:

1. Portfolio-State fuehrt den Bucket getrennt.
2. Engine-Input enthaelt nur operative Liquiditaet.
3. Die Engine berechnet Spending, VPW, Runway und Transaktionen ohne Zugriff auf den Bucket.
4. Nach der normalen Engine-Entscheidung, aber vor Forced Sale und Auszahlung, darf der Bucket bei Pflege-Trigger Liquiditaetsluecken decken.
5. Log, Charts und KPI weisen Bucket-Start, Nutzung und Rest separat aus.

Damit bleibt die Core-Engine weitgehend unveraendert. Der Bucket wirkt durch den "Virtual Air Gap": Die normale Planungslogik sieht ihn nicht als frei verfuegbares Vermoegen.

## Relevante bestehende Module

- `app/simulator/simulator-engine-direct.js`
  - orchestriert den direkten Jahreslauf gegen `EngineAPI`.
  - bester Einbaupunkt fuer die Bucket-Nutzung vor Forced Sale.
- `app/simulator/simulator-engine-input.js`
  - baut den Engine-Input.
  - muss sicherstellen, dass `healthBucketGeldmarkt` nicht in `aktuelleLiquiditaet` landet.
- `app/simulator/simulator-year-result.js`
  - baut Logdaten und naechsten State.
  - muss Bucket-Felder speichern und ausgeben.
- `app/simulator/simulator-input-care.js`
  - liest bestehende Pflegeparameter.
  - naheliegender Ort fuer Bucket-Inputfelder.
- `app/simulator/simulator-profile-inputs.js`
  - Profil- und Persistenzintegration.
- `app/simulator/simulator-portfolio-init.js`
  - Initialisierung des Startportfolios.
- `app/simulator/simulator-results.js`
  - Jahreslog-Spalten und UI-Auswertung.
- `app/simulator/monte-carlo-aggregates.js`
  - spaetere Aggregatmetriken fuer Bucket-Nutzung.

## Datenmodell

### Inputs

Neue Simulator-Inputs:

```js
healthBucketEnabled: boolean,
healthBucketInitialAmount: number,
healthBucketAssetSource: 'geldmarkt_etf',
healthBucketTriggerMinGrade: number,
healthBucketTriggerMode: 'OR' | 'AND',
healthBucketCoverageMode: 'care_additional_floor_only' | 'floor_when_care_active',
healthBucketReturnMode: 'cash_return'
```

### Portfolio-State

Neue Portfolio-Eigenschaft:

```js
healthBucketGeldmarkt: number
```

Optional fuer spaetere Diagnose:

```js
healthBucketMeta: {
  initializedFrom: 'geldmarkt_etf',
  initialAmount: 150000
}
```

### Jahreslauf-Diagnose

Interne Ergebnisstruktur des Bucket-Moduls:

```js
{
  enabled: true,
  triggered: true,
  reason: 'care_grade_5_or',
  bucketBefore: 150000,
  eligibleNeed: 42000,
  used: 42000,
  uncoveredNeed: 0,
  bucketAfterUse: 108000,
  interest: 2500,
  bucketAfterInterest: 110500
}
```

## Initialisierung

Bei Simulationsstart:

1. `healthBucketEnabled` pruefen.
2. `healthBucketInitialAmount` normalisieren.
3. Betrag aus dem Geldmarkt-/Liquiditaetsbereich separieren.
4. `portfolio.healthBucketGeldmarkt` setzen.
5. Operative `portfolio.liquiditaet` um denselben Betrag reduzieren.

Wenn die verfuegbare Geldmarkt-/Liquiditaet nicht ausreicht:

- konservative Variante: Bucket auf den verfuegbaren Betrag kappen und Warnung loggen.
- strengere Variante: Validierungsfehler anzeigen.

Empfehlung fuer Version 1: kappen und sichtbar warnen. Das ist nutzerfreundlicher und verhindert harte Abbrueche bei importierten Profilen.

## Engine-Air-Gap

In `app/simulator/simulator-engine-input.js` muss gelten:

```js
aktuelleLiquiditaet: portfolio.liquiditaet
```

Nicht:

```js
aktuelleLiquiditaet: portfolio.liquiditaet + portfolio.healthBucketGeldmarkt
```

Dadurch sinkt die VPW-Basis automatisch, weil die Engine `gesamtwert` aus Depotwert und aktueller Liquiditaet bildet. Auch Runway, Ziel-Liquiditaet und Transaktionsentscheidungen bleiben auf operative Liquiditaet bezogen.

## Neues Modul

Vorgeschlagenes Modul:

```txt
app/simulator/simulator-health-bucket.js
```

Exports:

```js
export function normalizeHealthBucketInputs(inputs) {}

export function initializeHealthBucket({ inputs, portfolio }) {}

export function isHealthBucketTriggered({
  pflegeMeta,
  householdContext,
  inputs
}) {}

export function computeHealthBucketEligibleNeed({
  forcedShortfall,
  pflegeMeta,
  careFloorAddition,
  netFloorYear,
  inputs
}) {}

export function applyHealthBucketCoverage({
  portfolio,
  eligibleNeed,
  trigger,
  inputs
}) {}

export function accrueHealthBucketInterest({
  portfolio,
  rC
}) {}
```

Das Modul sollte DOM-frei und testbar bleiben.

## Trigger-Logik

Default:

- Trigger ab Pflegegrad 4.
- Modus `OR`: P1 oder P2 erreicht den Mindestgrad.
- Modus `AND`: beide aktiven Personen erreichen den Mindestgrad.

Die Trigger-Logik darf nicht nur `pflege_aktiv` pruefen. Entscheidend ist der Pflegegrad.

Pseudocode:

```js
function isHealthBucketTriggered({ careP1, careP2, minGrade, mode }) {
  const p1 = careP1?.active && careP1?.grade >= minGrade;
  const p2 = careP2?.active && careP2?.grade >= minGrade;

  if (mode === 'AND') return p1 && p2;
  return p1 || p2;
}
```

Wenn nur aggregierte `pflegeMeta` verfuegbar ist, kann Version 1 mit `pflegeMeta.grade` starten. Sauberer ist jedoch, die vorhandenen P1/P2-Care-Metadaten in den Jahreslauf durchzureichen.

## Deckungslogik

Version 1 sollte den Bucket nur fuer pflegebedingte Zusatzkosten einsetzen.

Empfohlener Default:

```js
healthBucketCoverageMode: 'care_additional_floor_only'
```

Eligible Need:

```js
eligibleNeed = min(
  forcedShortfall,
  careFloorAdditionOrDelta
)
```

Alternative Option:

```js
healthBucketCoverageMode: 'floor_when_care_active'
```

Dann darf der Bucket bei aktivem Trigger den gesamten Floor-Shortfall decken. Diese Option ist weniger strikt, aber praktisch nuetzlich, wenn die Trennung zwischen Basis-Floor und Pflege-Floor im Jahr nicht eindeutig ist.

## Einbaupunkt im Jahreslauf

Der kritische Punkt liegt vor der Forced-Sale-Berechnung in `app/simulator/simulator-engine-direct.js`.

Aktuell wird sinngemaess berechnet:

```js
const totalLiqNeed = jahresEntnahmeTarget + minLiqAfterPayout;
const forcedShortfall = Math.max(0, totalLiqNeed - liquiditaet);
const forcedCoverage = applyForcedSaleLiquidityCoverage(...);
```

Zielstruktur:

```js
const totalLiqNeed = jahresEntnahmeTarget + minLiqAfterPayout;
let forcedShortfall = Math.max(0, totalLiqNeed - liquiditaet);

const healthBucketUse = applyHealthBucketCoverage({
  portfolio,
  eligibleNeed: computeHealthBucketEligibleNeed({
    forcedShortfall,
    pflegeMeta,
    careFloorAddition,
    netFloorYear,
    inputs
  }),
  trigger: isHealthBucketTriggered({ pflegeMeta, householdContext, inputs }),
  inputs
});

liquiditaet += healthBucketUse.used;
forcedShortfall = Math.max(0, forcedShortfall - healthBucketUse.used);

const forcedCoverage = applyForcedSaleLiquidityCoverage(...);
```

Dadurch wird der Pflegebucket vor Aktien-/Gold-/Bond-Notverkaeufen eingesetzt.

## Verzinsung

Der Bucket wird wie Geldmarkt/Cash fortgeschrieben.

Empfehlung:

- Nutzung des Buckets vor Forced Sale.
- Verzinsung auf den Restbetrag am Jahresende.
- Renditequelle: `rC`.

Pseudocode:

```js
const bucketBeforeInterest = portfolio.healthBucketGeldmarkt || 0;
const interest = euros(bucketBeforeInterest * rC);
portfolio.healthBucketGeldmarkt = euros(bucketBeforeInterest + interest);
```

Das ist konservativ und konsistent mit der bestehenden Liquiditaetsverzinsung.

## Logging

Neue Logfelder in `simulator-year-result.js`:

```js
health_bucket_enabled
health_bucket_start
health_bucket_used
health_bucket_end
health_bucket_interest
health_bucket_triggered
health_bucket_reason
health_bucket_eligible_need
health_bucket_uncovered_need
portfolio_active_end
```

Definitionen:

- `portfolio_total_end`: Gesamtvermoegen inklusive Pflegebucket.
- `portfolio_active_end`: Vermoegen ohne Pflegebucket.
- `health_bucket_end`: Restreserve nach Nutzung und Verzinsung.

Das macht sichtbar, ob die Simulation aus freiem Vermoegen oder aus zweckgebundener Reserve ueberlebt.

## UI-Integration

Der UI-Block gehoert in den vorhandenen Pflegebereich in `Simulator.html`, nicht in den allgemeinen Strategieblock.

Controls:

- Checkbox: `Pflegebucket aktivieren`
- Betrag: `Reserve im Geldmarkt-ETF`
- Trigger: `Freigabe ab Pflegegrad`
- Modus: `Person 1 oder Person 2` / `beide`
- Deckung: `nur Pflege-Zusatzkosten` / `gesamten Floor bei Pflege`

Keine neue Hauptseite. Der Bucket ist eine Erweiterung der Pflegefall-Logik.

## Ergebnisdarstellung

Jahreslog:

- kompakte Spalten fuer Start, Nutzung, Ende.
- Detailspalten nur im erweiterten Log.

Charts:

- eigene Linie `Pflegebucket`.
- operative Liquiditaet bleibt getrennt.

KPI:

- `Pflegebucket genutzt`
- `Restreserve`
- `Bucket ersetzte Notverkaeufe`
- `Pflegebedarf nach Bucket ungedeckt`

## Persistenz und Profilverbund

Der Pflegebucket ist eine Haushaltsreserve, keine personenbezogene Eigenschaft.

Konsequenzen:

- Einmal pro Simulation speichern.
- Nicht pro Profil duplizieren.
- Bei Profilverbund muss eindeutig sein, welches Profil die Haushaltsparameter liefert.
- Warnung, falls Profile widerspruechliche Bucket-Konfigurationen enthalten.

## Monte Carlo, Sweep und Auto-Optimize

Monte Carlo:

- Bucket als Teil des Portfolio-State ueber Jahre fortschreiben.
- Nutzung und Erschoepfung aggregieren.

Neue Aggregatmetriken:

```js
healthBucketUsedCount
healthBucketDepletedCount
avgHealthBucketUsed
p95HealthBucketUsed
careShortfallAfterBucketCount
avgHealthBucketEnd
```

Sweep:

- In Version 1 nicht als freier Sweep-Parameter.
- Spaeter feste Vergleichswerte anbieten: 0, 75k, 150k, 250k.

Auto-Optimize:

- Nicht in den initialen Suchraum aufnehmen.
- Der Bucket ist eine Policy-Annahme, kein normaler Optimierungsparameter.

## Validierung und Tests

Gezielte Tests:

1. Input-Reader liest Bucket-Felder korrekt.
2. Portfolio-Initialisierung separiert Bucket aus Liquiditaet.
3. Engine-Input enthaelt den Bucket nicht in `aktuelleLiquiditaet`.
4. PG3 triggert nicht, PG4 triggert.
5. Modus `OR` und `AND` funktionieren.
6. Bucket reduziert `forcedShortfall` vor Forced Sale.
7. Erschoepfter Bucket leitet Restbedarf an Forced Sale weiter.
8. Verzinsung wird auf Restbucket angewendet.
9. Jahreslog enthaelt stabile Bucket-Felder.
10. Monte-Carlo-State behaelt Bucket ueber mehrere Jahre.

Pflichtlauf:

```bash
npm test
```

Falls Engine-Contracts oder `engine/` geaendert werden:

```bash
npm run build:engine
```

## Umsetzungsschritte

### Schritt 1: Input und Persistenz

- UI-Felder in `Simulator.html` ergaenzen.
- Reader in `simulator-input-care.js` oder separatem Input-Modul erweitern.
- Profile-Speichern und -Laden ergaenzen.
- Tests fuer Input-Vertrag schreiben.

### Schritt 2: Portfolio-State

- `healthBucketGeldmarkt` in Portfolio-Initialisierung aufnehmen.
- Initialbetrag aus operativer Liquiditaet separieren.
- Kappung/Warnung bei unzureichender Liquiditaet implementieren.
- Tests fuer Initialisierung schreiben.

### Schritt 3: Air Gap

- Sicherstellen, dass `buildSimulatorEngineInput` nur operative Liquiditaet nutzt.
- Test: Bucket veraendert `aktuelleLiquiditaet` nicht nach oben.
- Jahreslog um `portfolio_active_end` erweitern.

### Schritt 4: Health-Bucket-Modul

- DOM-freies Modul `simulator-health-bucket.js` anlegen.
- Trigger, eligible need, Coverage und Verzinsung implementieren.
- Unit-Tests fuer Pflegegrade, Modi und Deckungsarten.

### Schritt 5: Jahreslauf integrieren

- Modul in `simulator-engine-direct.js` einhaengen.
- Bucket-Nutzung vor `applyForcedSaleLiquidityCoverage` ausfuehren.
- `liquiditaet` um genutzten Betrag erhoehen.
- `forcedShortfall` entsprechend reduzieren.

### Schritt 6: Logging und Anzeige

- `buildSimulatorYearResult` um Bucket-Diagnose erweitern.
- Jahreslog-Spalten in `simulator-results.js` ergaenzen.
- Optional Portfolio-Chart um eigene Bucket-Linie erweitern.

### Schritt 7: Monte Carlo

- Aggregatmetriken aufnehmen.
- Ergebnisdarstellung um Bucket-Nutzung und Erschoepfung erweitern.
- Mehrjahrestest mit Pflegefall und Bucket-Verbrauch ergaenzen.

## Offene Designfragen

- Soll der Startbetrag hart validiert oder auf verfuegbare Liquiditaet gekappt werden?
- Soll der Bucket nur Pflege-Zusatzkosten oder den gesamten Floor bei aktivem Pflegefall decken?
- Soll die Verzinsung exakt `rC` folgen oder eine eigene Geldmarkt-Renditeannahme bekommen?
- Soll der Bucket in `portfolio_total_end` enthalten sein? Empfehlung: ja, aber zusaetzlich `portfolio_active_end`.
- Sollen P1/P2-Care-Metadaten explizit durch den Jahreslauf gereicht werden, statt aus aggregierten Feldern abgeleitet zu werden? Empfehlung: ja.

## Akzeptanzkriterien

- Bei deaktiviertem Feature bleiben bestehende Simulationsergebnisse unveraendert.
- Bei aktiviertem Feature sinkt die fuer VPW/Runway verfuegbare operative Basis um den Bucket-Betrag.
- Der Bucket wird nur bei Pflege-Trigger genutzt.
- Forced Sales werden erst nach Bucket-Nutzung ausgefuehrt.
- Die Jahreslogs zeigen Start, Nutzung, Ende, Trigger und Restbedarf transparent.
- Monte-Carlo-Laeufe koennen Bucket-Nutzung und Erschoepfung aggregieren.
- `npm test` laeuft erfolgreich.

