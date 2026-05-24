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

Der Bucket wird als Haushalts-/Profil-Eigenschaft definiert und von den Anwendungen konsumiert. Die Profilpflege ist die Source of Truth fuer:

- ob ein Pflegebucket existiert,
- wie hoch der Ziel-/Startbetrag ist,
- aus welchem Baustein er gebildet wird,
- ab welchem Pflegegrad er freigegeben wird,
- ob der Zielwert inflationsindexiert ausgewiesen wird.

Der Simulator liest diese Definition fuer Szenarien. Die Balance-App soll dieselbe Definition spaeter fuer operative Jahresplanung und Diagnose nutzen.

Im Jahreslauf wird der Bucket als separater Portfolio-Posten gefuehrt:

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
  healthBucketAssetSource: 'money_market_first_then_cash',
  healthBucketTriggerMinGrade: 4,
  healthBucketTriggerMode: 'OR',
  healthBucketCoverageMode: 'care_additional_floor_only',
  healthBucketReturnMode: 'cash_return',
  healthBucketTargetMode: 'inflation_indexed_diagnostic'
}
```

Das Feature sollte initial deaktiviert sein, damit bestehende Simulationen unveraendert bleiben. Nutzer koennen dann gezielt Szenarien mit 0 EUR, 75.000 EUR, 150.000 EUR oder 250.000 EUR Pflegebucket vergleichen.

## Nicht-Ziele

- Keine Integration als normale Tagesgeld-Liquiditaet.
- Keine automatische Optimierung des Bucket-Betrags in der ersten Version.
- Keine unbewusste Umgehung der Steuerlogik. Fuer Bucket-Verbrauch muss vor der Wirklogik explizit entschieden werden: cash-like Vereinfachung oder Integration in Tax-Aggregate.
- Keine manuelle Bearbeitung generierter Artefakte wie `engine.js`.
- Keine Vermischung mit der 3-Bucket-Anleihenlogik.

## Architekturprinzip

Der Health-Bucket wird in drei Schichten umgesetzt:

1. **Profil-/Haushaltsdefinition:** Die Profilpflege speichert die fachliche Bucket-Definition.
2. **Anwendungs-Consumer:** Simulator und Balance-App lesen dieselbe Definition.
3. **Jahreslauf-State:** Jede Anwendung fuehrt den Bucket im Portfolio getrennt von operativer Liquiditaet.

Fuer die erste technische Umsetzung bleibt die Wirklogik im Simulator isoliert. Die Definition soll aber nicht als reiner Simulator-Parameter entstehen.

Der Health-Bucket wirkt im Simulator moeglichst als Middleware:

1. Profil-/Haushaltsdefinition wird in Simulator-Inputs gemappt.
2. Portfolio-State fuehrt den Bucket getrennt.
3. Engine-Input enthaelt nur operative Liquiditaet.
4. Die Engine berechnet Spending, VPW, Runway und Transaktionen ohne Zugriff auf den Bucket.
5. Nach der normalen Engine-Entscheidung, aber vor Forced Sale und Auszahlung, darf der Bucket bei Pflege-Trigger Liquiditaetsluecken decken.
6. Log, Charts und KPI weisen Bucket-Start, Nutzung und Rest separat aus.

Damit bleibt die Core-Engine weitgehend unveraendert. Der Bucket wirkt durch den "Virtual Air Gap": Die normale Planungslogik sieht ihn nicht als frei verfuegbares Vermoegen.

## Relevante bestehende Module

- Profilpflege / Profil-State
  - `app/profile/` und Profil-State-Serialisierung sind der primaere Ort fuer die dauerhafte Bucket-Definition.
  - Die Bucket-Definition ist Haushalts-/Profilmetadata, keine nur temporaere Simulationsoption.
- Balance-App
  - `app/balance/` soll spaeter dieselbe Definition anzeigen und in Diagnose/Jahresplanung beruecksichtigen.
  - Version 1 der Wirklogik muss Balance noch nicht veraendern, darf die spaetere Integration aber nicht verbauen.
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
  - nur Consumer/Override-Ort, falls der Simulator spaeter Szenarioabweichungen zur Profildefinition anbieten soll.
- `app/simulator/simulator-profile-inputs.js`
  - Mapping von Profil-/Haushaltsdefinition in Simulator-Inputs.
- `app/simulator/simulator-portfolio-init.js`
  - Initialisierung des Startportfolios.
- `app/simulator/simulator-results.js`
  - Jahreslog-Spalten und UI-Auswertung.
- `app/simulator/monte-carlo-aggregates.js`
  - spaetere Aggregatmetriken fuer Bucket-Nutzung.

## Datenmodell

### Profil-/Haushaltsdefinition

Neue persistierte Bucket-Definition im Profil-/Haushaltskontext:

```js
healthBucket: {
  enabled: boolean,
  initialAmount: number,
  assetSource: 'money_market_first_then_cash',
  triggerMinGrade: number,
  triggerMode: 'OR' | 'AND',
  coverageMode: 'care_additional_floor_only' | 'floor_when_care_active',
  returnMode: 'cash_return',
  targetMode: 'nominal_fixed' | 'inflation_indexed_diagnostic'
}
```

Diese Struktur ist die fachliche Source of Truth. UI-Felder in der Profilpflege sollen diese Struktur direkt oder ueber stabile Storage-Keys pflegen.

### Profil-Storage-Key

Die Profilpersistenz filtert profilbezogene `localStorage`-Keys strikt ueber `isProfileScopedKey(...)` und `PROFILE_SCOPED_FIXED_KEYS`. Deshalb muss die Bucket-Definition explizit als profilbezogener Key registriert werden.

Empfehlung:

```js
const PROFILE_HEALTH_BUCKET_KEY = 'profile_health_bucket';
```

Der Wert wird als JSON-String gespeichert:

```js
localStorage.setItem('profile_health_bucket', JSON.stringify({
  enabled: true,
  initialAmount: 150000,
  assetSource: 'money_market_first_then_cash',
  triggerMinGrade: 4,
  triggerMode: 'OR',
  coverageMode: 'care_additional_floor_only',
  returnMode: 'cash_return',
  targetMode: 'inflation_indexed_diagnostic'
}));
```

Dieser Key muss in `PROFILE_SCOPED_FIXED_KEYS` aufgenommen werden. Sonst koennen Profilwechsel, Import/Export oder Live-Snapshot-Operationen die Bucket-Definition still verlieren.

Ein einzelner JSON-Key ist vielen flachen Keys vorzuziehen, weil das Schema spaeter wachsen kann, ohne jedes neue Feld in der Key-Policy nachzuziehen.

### Simulator-Inputs

Simulator-Inputs duerfen flach bleiben, um bestehende Runner und Tests einfach zu halten. Sie werden aus `healthBucket` abgeleitet:

```js
healthBucketEnabled: boolean,
healthBucketInitialAmount: number,
healthBucketAssetSource: 'money_market_first_then_cash',
healthBucketTriggerMinGrade: number,
healthBucketTriggerMode: 'OR' | 'AND',
healthBucketCoverageMode: 'care_additional_floor_only' | 'floor_when_care_active',
healthBucketReturnMode: 'cash_return',
healthBucketTargetMode: 'nominal_fixed' | 'inflation_indexed_diagnostic'
```

Falls der Simulator spaeter eigene Szenario-Overrides bekommt, muss klar getrennt werden:

```js
healthBucketUseProfileDefinition: true,
healthBucketOverride: null | { ... }
```

Version 1 sollte ohne Simulator-Override starten: Profildefinition lesen, anzeigen, rechnen.

### Portfolio-State

Neue Portfolio-Eigenschaft:

```js
healthBucketGeldmarkt: number
```

Optional fuer spaetere Diagnose:

```js
healthBucketMeta: {
  initializedFrom: 'money_market_first_then_cash',
  initialAmount: 150000,
  targetMode: 'inflation_indexed_diagnostic'
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
  bucketAfterInterest: 110500,
  targetNominal: 150000,
  targetInflationAdjusted: 185000,
  realCoveragePct: 59.7,
  targetGap: 74500
}
```

## Initialisierung

Der Carve-Out darf nicht beim Einlesen einzelner Profile passieren. Er muss nach dem Profilverbund-Merge und nach der Initialisierung des aggregierten Haushaltsportfolios erfolgen.

Grund:

- Der Pflegebucket ist eine Haushaltsreserve.
- Einzelprofile koennen fuer sich genommen zu wenig Geldmarkt/Cash haben.
- Nach dem Merge kann der Haushalt insgesamt ausreichend Geldmarkt/Cash besitzen.
- Ein Carve-Out vor dem Merge wuerde den Bucket faelschlich kappen und falsche Warnungen erzeugen.

Korrekte Reihenfolge im Simulator:

1. Einzelprofile lesen.
2. Profilverbund zu Haushaltsinputs mergen.
3. Haushaltsportfolio inklusive Geldmarkt-/Cash-Tranchen initialisieren.
4. Pflegebucket aus dem aggregierten Haushaltsportfolio ausgliedern.
5. Erst danach Engine-Input ohne Bucket bauen.

Bei Simulationsstart nach dem Haushaltsmerge:

1. `healthBucketEnabled` pruefen.
2. `healthBucketInitialAmount` normalisieren.
3. Betrag aus dem Geldmarkt-/Liquiditaetsbereich separieren.
4. `portfolio.healthBucketGeldmarkt` setzen.
5. Operative `portfolio.liquiditaet` um denselben Betrag reduzieren.

### Geldmarkt-Tranchen konsistent ausgliedern

Der Bucket darf nicht nur als numerischer Abzug von `portfolio.liquiditaet` modelliert werden. Die Suite fuehrt Geldmarktpositionen auch als Detailtranchen in `portfolio.depotTranchesGeldmarkt`. Deshalb muss die Initialisierung die zugrundeliegenden Geldmarkt-Tranchen konsistent reduzieren oder ausgliedern.

Empfohlene Quellenreihenfolge:

1. Primaer aus `portfolio.depotTranchesGeldmarkt` ausgliedern.
2. Wenn keine oder zu geringe Geldmarkt-Tranchen vorhanden sind, den verbleibenden Betrag aus aggregiertem `portfolio.geldmarktEtf` bzw. `inputs.geldmarktEtf` ableiten.
3. Danach aus `portfolio.tagesgeld` bzw. operativem Cash decken.
4. Version 1 darf nicht still aus Aktien, Gold oder Bond-Tranchen umschichten.

Die Reduktion der Geldmarkt-Tranchen sollte deterministisch erfolgen. Fuer Version 1 reicht FIFO nach `purchaseDate`, weil Geldmarktpositionen steuerlich und fachlich risikoarm sind und meist keine starke Lot-Auswahl benoetigen. Proportionale Reduktion waere ebenfalls moeglich, erzeugt aber mehr Rundungsarbeit.

Pseudocode:

```js
function carveOutHealthBucketFromMoneyMarketAndCash(portfolio, requestedAmount) {
  let remaining = requestedAmount;
  const carvedTranches = [];

  for (const tranche of portfolio.depotTranchesGeldmarkt) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, tranche.marketValue || 0);
    if (take <= 0) continue;

    const ratio = tranche.marketValue > 0 ? take / tranche.marketValue : 0;
    carvedTranches.push({
      ...tranche,
      marketValue: take,
      costBasis: (tranche.costBasis || 0) * ratio
    });

    tranche.marketValue -= take;
    tranche.costBasis = Math.max(0, (tranche.costBasis || 0) * (1 - ratio));
    remaining -= take;
  }

  const usedFromMoneyMarket = requestedAmount - remaining;
  portfolio.depotTranchesGeldmarkt = portfolio.depotTranchesGeldmarkt
    .filter(t => (t.marketValue || 0) > 0.01);

  const takeFromCash = Math.min(remaining, portfolio.tagesgeld || 0);
  portfolio.tagesgeld = Math.max(0, (portfolio.tagesgeld || 0) - takeFromCash);
  remaining -= takeFromCash;

  const used = requestedAmount - remaining;
  portfolio.healthBucketGeldmarkt = used;
  portfolio.healthBucketTranches = carvedTranches;
  portfolio.healthBucketCashAmount = takeFromCash;
  portfolio.geldmarktEtf = Math.max(0, (portfolio.geldmarktEtf || 0) - usedFromMoneyMarket);
  portfolio.liquiditaet = Math.max(0, (portfolio.liquiditaet || 0) - used);

  return {
    used,
    usedFromMoneyMarket,
    usedFromCash: takeFromCash,
    capped: remaining > 0,
    missing: remaining
  };
}
```

`healthBucketTranches` ist optional, aber empfehlenswert. Damit bleibt nachvollziehbar, aus welchen Geldmarktpositionen die Reserve gebildet wurde. Der Cash-Anteil kann als `healthBucketCashAmount` gefuehrt werden.

Falls Version 1 bewusst nur einen Betrag fuehrt, muss mindestens dokumentiert sein, dass die steuerliche Lot-Historie des Bucket vereinfacht wird.

Wenn Geldmarkt-ETF und Tagesgeld/Cash zusammen nicht ausreichen:

- konservative Variante: Bucket auf den verfuegbaren Betrag kappen und Warnung loggen.
- strengere Variante: Validierungsfehler anzeigen.

Empfehlung fuer Version 1: kappen und sichtbar warnen. Das ist nutzerfreundlicher und verhindert harte Abbrueche bei importierten Profilen.

## Steuerbehandlung des Bucket-Verbrauchs

Wenn der Pflegebucket aus Geldmarkt-ETF-Tranchen gebildet wird, ist eine spaetere Entnahme wirtschaftlich ein Verkauf. Realisierte Gewinne koennen steuerpflichtig sein. Deshalb darf der Bucket-Verbrauch nicht unbewusst als steuerfrei modelliert werden.

Es gibt zwei zulaessige Varianten:

### Variante A: Vereinfachte Netto-/Cash-Behandlung

Der Bucket wird im Simulator als cash-like Reserve betrachtet. Entnahmen aus dem Bucket erzeugen keine zusaetzlichen Steuerereignisse.

Vorteil:

- einfach,
- gut fuer Version 1,
- keine Veraenderung von `tax-settlement.mjs`.

Nachteil:

- Geldmarkt-ETF-Gewinne im Bucket werden steuerlich vereinfacht ignoriert.

Diese Variante ist nur akzeptabel, wenn sie in UI, Log oder Dokumentation als Modellvereinfachung kenntlich gemacht wird.

### Variante B: Steuerlich saubere Bucket-Verkaeufe

Bucket-Entnahmen aus `healthBucketTranches` erzeugen Verkaufs-/Tax-Rohaggregate und laufen in das bestehende Jahressteuer-Settlement ein.

Vorteil:

- fachlich korrekter,
- nutzt die gefuehrte Cost Basis sinnvoll.

Nachteil:

- aufwendiger,
- erfordert Integration in die Jahres-Tax-Aggregation des Simulators.

Empfehlung:

- Version 1 der UI-/Definitionsebene: keine steuerliche Wirkung.
- Version 1 der Simulator-Wirklogik: entweder Variante A explizit dokumentieren oder Variante B direkt sauber implementieren.
- Wenn `healthBucketTranches` mit Cost Basis gefuehrt werden, ist Variante B langfristig vorzuziehen.

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

### P1/P2-Care-Metadaten im Jahreslauf

Der Jahreslauf `simulateOneYear(...)` bekommt heute als direktes Pflegeargument primaer die aggregierte bzw. P1-nahe Pflegeinformation. Fuer einen robusten `OR`-/`AND`-Trigger im Mehrpersonen-Haushalt muessen die individuellen Pflege-Metadaten fuer Person 1 und Person 2 im Jahreslauf verfuegbar sein.

Empfehlung: Die bestehende Signatur von `simulateOneYear(...)` bleibt stabil. Stattdessen wird `householdContext` erweitert:

```js
householdContext.care = {
  p1: careMetaP1,
  p2: careMetaP2
};
```

Wichtig: `normalizeHouseholdContext(...)` muss diesen Block erhalten. Die Funktion normalisiert aktuell nur Lebensstatus und Witwenrentenflags; wenn sie unbekannte Felder verwirft, waeren `care.p1` und `care.p2` im eigentlichen Jahreslauf wieder verloren.

Zielstruktur:

```js
export function normalizeHouseholdContext(context) {
  const defaultContext = {
    p1Alive: true,
    p2Alive: true,
    widowBenefits: {
      p1FromP2: false,
      p2FromP1: false
    },
    care: {
      p1: null,
      p2: null
    }
  };

  if (!context) return defaultContext;

  return {
    p1Alive: context.p1Alive !== false,
    p2Alive: context.p2Alive !== false,
    widowBenefits: {
      p1FromP2: !!context?.widowBenefits?.p1FromP2,
      p2FromP1: !!context?.widowBenefits?.p2FromP1
    },
    care: {
      p1: context?.care?.p1 || context?.careMetaP1 || null,
      p2: context?.care?.p2 || context?.careMetaP2 || null
    }
  };
}
```

Damit kann `simulator-health-bucket.js` den Trigger ohne Rueckgriff auf Logfelder berechnen.

Pseudocode:

```js
function isHealthBucketTriggered({ careP1, careP2, minGrade, mode }) {
  const p1 = careP1?.active && careP1?.grade >= minGrade;
  const p2 = careP2?.active && careP2?.grade >= minGrade;

  if (mode === 'AND') return p1 && p2;
  return p1 || p2;
}
```

Wenn nur aggregierte `pflegeMeta` verfuegbar ist, kann Version 1 mit `pflegeMeta.grade` starten. Sauberer ist jedoch, die vorhandenen P1/P2-Care-Metadaten ueber `householdContext.care` in den Jahreslauf durchzureichen.

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
  trigger: isHealthBucketTriggered({
    careP1: householdCtx.care?.p1 || pflegeMeta,
    careP2: householdCtx.care?.p2 || null,
    minGrade: inputs.healthBucketTriggerMinGrade,
    mode: inputs.healthBucketTriggerMode
  }),
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

## Inflationsindexierter Zielwert

Der tatsaechliche Bucket-Bestand wird nominal als Geldmarkt-ETF-Reserve fortgeschrieben. Zusaetzlich sollte Version 1 einen inflationsindexierten Zielwert als Diagnosegroesse fuehren.

Wichtig: In Version 1 wird der Bucket nicht automatisch nachgefuellt. Der inflationsindexierte Zielwert dient nur zur Transparenz:

- Wie hoch waere die urspruengliche Reserve in heutiger Kaufkraft?
- Wie stark ist der reale Schutz durch Inflation und Nutzung gesunken?
- Welche Luecke bestuende gegenueber dem realen Zielwert?

Empfohlenes Modell:

```js
healthBucketTargetInflationAdjusted =
  healthBucketInitialAmount * cumulativeInflationFactor;

healthBucketRealCoveragePct =
  healthBucketTargetInflationAdjusted > 0
    ? (healthBucketGeldmarkt / healthBucketTargetInflationAdjusted) * 100
    : 100;

healthBucketTargetGap =
  Math.max(0, healthBucketTargetInflationAdjusted - healthBucketGeldmarkt);
```

Der `cumulativeInflationFactor` sollte aus dem bestehenden Jahreszustand genutzt werden, damit die Bucket-Diagnose konsistent mit Floor-, Flex- und Realwert-Logs bleibt.

### Warum keine automatische Nachfuellung in Version 1?

Automatisches Nachfuellen waere eine eigene Entnahme- und Rebalancing-Policy. Es muesste entscheiden, ob und wann Aktien, Gold, Bonds oder operative Liquiditaet zugunsten des Pflegebuckets verkauft werden. Das wuerde das Feature deutlich invasiver machen und koennte in schlechten Marktphasen genau die Notverkaeufe erzeugen, die der Bucket vermeiden soll.

Deshalb fuer Version 1:

- Zielwert inflationsindexiert anzeigen.
- reale Deckungsquote loggen.
- Ziel-Luecke ausweisen.
- kein automatisches Refill.

Eine spaetere Version kann optional eine Refill-Policy einfuehren, z. B. nur in guten Jahren und nur aus Ueberschuss-Liquiditaet.

### Hinweis bei Kaufkraftluecke

Wenn `healthBucketTargetGap > 0`, soll die Balance-App spaeter einen konkreten, aber nicht automatisch handelnden Hinweis anzeigen.

Beispiel:

> Die reale Zieldeckung der Pflegereserve liegt bei 92 %. Zur Wiederherstellung der urspruenglichen Kaufkraft waeren 12.000 EUR zusaetzliche Reserve noetig.

Der Hinweis darf keine automatische Umschichtung ausloesen. Er ist eine Entscheidungsinformation fuer den Nutzer.

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
health_bucket_target_nominal
health_bucket_target_inflation_adjusted
health_bucket_real_coverage_pct
health_bucket_target_gap
portfolio_active_end
```

Definitionen:

- `portfolio_total_end`: Gesamtvermoegen inklusive Pflegebucket.
- `portfolio_active_end`: Vermoegen ohne Pflegebucket.
- `health_bucket_end`: Restreserve nach Nutzung und Verzinsung.
- `health_bucket_target_inflation_adjusted`: urspruenglicher Zielbetrag in aktueller Kaufkraft.
- `health_bucket_real_coverage_pct`: Restbucket relativ zum inflationsangepassten Ziel.

Das macht sichtbar, ob die Simulation aus freiem Vermoegen oder aus zweckgebundener Reserve ueberlebt.

## UI-Integration

Die primaere UI gehoert in die Profilpflege bzw. Haushalts-/Profildefinition, nicht in den Simulator.

Begruendung:

- Der Pflegebucket ist eine dauerhafte Vermoegens-Zweckbindung.
- Er ist nicht nur eine Monte-Carlo-Annahme.
- Balance-App und Simulator sollen dieselbe Definition verwenden.
- Profilverbund braucht eine eindeutige Haushaltsquelle.

### Profilpflege-UI

Empfohlener Block in der Profilpflege:

- Checkbox: `Pflegebucket aktivieren`
- Betrag: `Reserve im Geldmarkt-ETF`
- Quelle: `Geldmarkt-ETF`
- Trigger: `Freigabe ab Pflegegrad`
- Modus: `Person 1 oder Person 2` / `beide`
- Deckung: `nur Pflege-Zusatzkosten` / `gesamten Floor bei Pflege`
- Zielwert: `Inflationsbereinigte Zieldeckung anzeigen`

### Simulator-UI

Der Simulator soll die Profildefinition zunaechst nur anzeigen und verwenden. Optional spaeter:

- Anzeige: `Pflegebucket aus Profil aktiv`
- Anzeige: Betrag, Trigger, Deckungsmodus, Zielmodus
- spaeterer Szenario-Override: `Profilwert verwenden / fuer diese Simulation ueberschreiben`

Ein reiner UI-Block direkt in `Simulator.html` ist nur dann sinnvoll, wenn er explizit als Szenario-Override gekennzeichnet ist.

### Balance-UI

Die Balance-App soll spaeter mindestens anzeigen:

- freie operative Liquiditaet,
- gesperrter Pflegebucket,
- inflationsbereinigte Zieldeckung,
- Luecke zum realen Zielbetrag.

Wichtig: Der Bucket-Abzug darf in Balance nie unsichtbar erfolgen. Wenn Brutto-Liquiditaet durch eine Pflege-Zweckbindung reduziert wird, muss die Vermoegensuebersicht eine explizite Bruecke zeigen:

```txt
Brutto-Liquiditaet:             150.000 EUR
Pflege-Zweckbindung:           -150.000 EUR
Operativ verfuegbare Liquiditaet:     0 EUR
```

Nur so bleibt nachvollziehbar, warum Runway und Ausgaben-Check mit einer niedrigeren operativen Liquiditaet rechnen.

Die operative Freigabe des Buckets in Balance ist eine eigene spaetere Entscheidung und sollte nicht in Version 1 der Simulator-Wirklogik versteckt werden.

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
- `Inflationsbereinigte Zieldeckung`
- `Luecke zum realen Zielbetrag`
- `Bucket ersetzte Notverkaeufe`
- `Pflegebedarf nach Bucket ungedeckt`

## Persistenz und Profilverbund

Der Pflegebucket ist eine Haushaltsreserve, keine personenbezogene Eigenschaft.

Konsequenzen:

- Primaer in der Profilpflege bzw. im Haushaltsprofil speichern.
- Nicht als isolierten `sim_*`-Parameter behandeln.
- Bei Einzelprofil: Definition kommt aus dem aktiven Profil.
- Bei Profilverbund: Hauptprofil liefert die Haushaltsdefinition.
- Warnung, falls sekundaere Profile eine abweichende Bucket-Konfiguration enthalten.
- Simulator und Balance-App lesen dieselbe Definition.

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
avgHealthBucketRealCoveragePct
p05HealthBucketRealCoveragePct
```

Sweep:

- In Version 1 nicht als freier Sweep-Parameter.
- Spaeter feste Vergleichswerte anbieten: 0, 75k, 150k, 250k.

Auto-Optimize:

- Nicht in den initialen Suchraum aufnehmen.
- Der Bucket ist eine Policy-Annahme, kein normaler Optimierungsparameter.

## Validierung und Tests

Gezielte Tests:

1. `profile_health_bucket` ist profilbezogen und wird von `isProfileScopedKey(...)` akzeptiert.
2. Profil-Speichern/-Laden erhaelt die JSON-Bucket-Definition.
3. Profilverbund nutzt die Bucket-Definition des Hauptprofils und warnt bei abweichenden sekundaeren Definitionen.
4. Simulator-Input-Mapping liest die Profildefinition korrekt.
5. Carve-Out passiert erst nach Profilverbund-Merge.
6. Portfolio-Initialisierung separiert Bucket aus Liquiditaet.
7. Portfolio-Initialisierung reduziert `depotTranchesGeldmarkt`, `geldmarktEtf`, optional `tagesgeld` und `liquiditaet` konsistent.
8. Gekappte Initialisierung erzeugt keinen Abbruch und loggt den fehlenden Bucket-Anteil erst nach aggregierter Haushaltspruefung.
9. `normalizeHouseholdContext` erhaelt `care.p1` und `care.p2`.
10. Engine-Input enthaelt den Bucket nicht in `aktuelleLiquiditaet`.
11. PG3 triggert nicht, PG4 triggert.
12. Modus `OR` und `AND` funktionieren mit P1/P2-Care-Metadaten.
13. Bucket reduziert `forcedShortfall` vor Forced Sale.
14. Erschoepfter Bucket leitet Restbedarf an Forced Sale weiter.
15. Steuerbehandlung des Bucket-Verbrauchs ist entweder als Vereinfachung dokumentiert oder in Tax-Aggregate integriert.
16. Verzinsung wird auf Restbucket angewendet.
17. Inflationsindexierter Zielwert nutzt den kumulierten Inflationsfaktor.
18. Reale Deckungsquote und Ziel-Luecke werden korrekt berechnet.
19. Balance-Diagnose zeigt Brutto-Liquiditaet, Pflege-Zweckbindung und operative Liquiditaet getrennt.
20. Jahreslog enthaelt stabile Bucket-Felder.
21. Monte-Carlo-State behaelt Bucket ueber mehrere Jahre.

Pflichtlauf:

```bash
npm test
```

Falls Engine-Contracts oder `engine/` geaendert werden:

```bash
npm run build:engine
```

## Arbeitsstand

Stand: 2026-05-22

Umgesetzt:

- Schritt 1 ist abgeschlossen.
  - `profile_health_bucket` ist als profilbezogener JSON-Key registriert.
  - Profilpflege speichert und laedt die Bucket-Definition.
  - Profilverbund nutzt die Definition des Hauptprofils und warnt bei abweichenden sekundaeren Profilen.
  - Simulator-Input-Mapping transportiert `healthBucket` und flache `healthBucket*` Felder.
  - Keine Wirklogik in Engine, VPW, Runway, Forced Sale oder Jahreslogs durch Schritt 1.
- Schritt 2 ist abgeschlossen.
  - Portfolio-Initialisierung setzt `healthBucketGeldmarkt`, `healthBucketTranches`, `healthBucketCashAmount` und `healthBucketMeta`.
  - Carve-Out erfolgt beim Initialisieren des aggregierten Simulator-Portfolios.
  - Reihenfolge der Quellen: `depotTranchesGeldmarkt` FIFO, danach ungetranchter `geldmarktEtf`, danach `tagesgeld`.
  - Ungueltige oder fehlende `purchaseDate`-Werte fallen fuer FIFO stabil auf `1900-01-01` zurueck.
  - `portfolio.geldmarktEtf`, `portfolio.tagesgeld` und `portfolio.liquiditaet` werden konsistent reduziert.
  - Bei unzureichender Geldmarkt-/Cash-Liquiditaet wird der Bucket auf den verfuegbaren Betrag gekappt und `healthBucketMeta.warnings` dokumentiert den Sachverhalt.
- Schritt 3 ist abgeschlossen.
  - `buildSimulatorEngineInput` nutzt weiterhin nur operative Liquiditaet.
  - Gesperrte Bucket-Tranchen werden nicht als `detailledTranches` an die Engine weitergereicht.
  - Jahreslogs trennen `portfolio_active_end`, `health_bucket_end` und `portfolio_total_end`.
- Schritt 4 ist abgeschlossen.
  - DOM-freies Modul `app/simulator/simulator-health-bucket.js` eingefuehrt.
  - Triggerlogik fuer `OR`/`AND`, Mindestpflegegrad und P1/P2-Care-Metadaten implementiert.
  - Deckungsarten `care_additional_floor_only` und `floor_when_care_active` implementiert.
  - FIFO-Verbrauch aus `healthBucketTranches`, Rohgewinntracking, `rC`-Verzinsung und inflationsindexierte Diagnosen implementiert.
- Schritt 5 ist abgeschlossen.
  - `householdContext.care` wird im Monte-Carlo- und Sweep-Jahreslauf befuellt.
  - `normalizeHouseholdContext` erhaelt `care.p1` und `care.p2`.
  - `simulator-engine-direct.js` nutzt den Bucket vor `applyForcedSaleLiquidityCoverage`.
  - Genutzte Bucket-Betraege erhoehen operative Liquiditaet und reduzieren den Forced-Sale-Shortfall.
  - Restbucket wird in Entnahme- und Ansparjahren mit `rC` verzinst.
  - Jahreslog fuehrt Start, Nutzung, Verzinsung, Ende und Zieldeckungsdiagnose als Datenfelder.
- Schritt 6 ist abgeschlossen.
  - Detaillierte Backtest- und Worst-Run-Logs zeigen Bucket-Start, Nutzung, Zins, Ende, Zielwert, Zieldeckung, Ziel-Luecke, Trigger und Warnung.
  - Startwarnungen aus `healthBucketMeta.warnings` werden als `health_bucket_warning` in Jahreslogs sichtbar.
  - Backtest-Zusammenfassung zeigt bei aktivem Bucket Restbucket, reale Zieldeckung und Ziel-Luecke als KPI-Karten.
- Schritt 7 ist abgeschlossen.
  - Monte-Carlo-Laeufe erfassen pro Run, ob der Bucket aktiv war, genutzt wurde oder erschoepft endete.
  - Aggregiert werden Bucket-Nutzung, Restbucket, reale Zieldeckung, Ziel-Luecke und Bucket-Zinsen.
  - Ergebnis-KPIs zeigen Nutzungsquote, Erschoepfungsquote, Median-/P90-Nutzung, Median-Restbucket, Median-Zieldeckung und Median-Zielluecke.
  - Worker-, Auto-Optimize- und Parity-Merge-Vertraege beruecksichtigen die neuen Bucket-Zaehl- und Listenmetriken.
- Schritt 8 ist abgeschlossen.
  - Balance liest die `healthBucket`-Definition aus der Profilpflege.
  - Balance zeigt bei aktivem Bucket Brutto-Liquiditaet, Pflege-Zweckbindung, operative Liquiditaet, Zieldeckung und Zielluecke.
  - Die Diagnose zeigt Pflegebucket und inflationsbezogene Zieldeckung unter den Schluesselparametern.
  - Der Diagnose-Kopiertext enthaelt die Pflegebucket-Zweckbindung.
  - Keine operative Balance-Freigabe und keine Aenderung der Engine-Entscheidung in Step 8.
- Schritt 9 ist abgeschlossen.
  - V1-Entscheidung: Balance entsperrt den Pflegebucket nicht automatisch.
  - Grund: In Balance gibt es aktuell keinen belastbaren Pflegefall-Ist-Zustand mit Pflegegrad als Triggerquelle.
  - `balance-health-bucket.js` weist die Policy explizit als `diagnostic_only` aus.
  - Diagnose, UI-Hinweis und Copytext zeigen, dass keine automatische Freigabe erfolgt.
  - Tests sichern `releaseAllowed=false` und `releasedAmount=0`.

Wichtige Dateien:

- `app/profile/profile-state.js`
- `app/profile/profile-asset-values.js`
- `app/simulator/simulator-profile-inputs.js`
- `app/simulator/simulator-portfolio-init.js`
- `app/simulator/simulator-portfolio.js`
- `app/simulator/simulator-health-bucket.js`
- `app/simulator/simulator-engine-direct.js`
- `app/simulator/simulator-accumulation-year.js`
- `app/simulator/simulator-year-result.js`
- `app/simulator/simulator-results.js`
- `app/simulator/simulator-main-helpers.js`
- `app/simulator/simulator-backtest.js`
- `app/simulator/mc-run-metrics.js`
- `app/simulator/monte-carlo-aggregates.js`
- `app/simulator/results-metrics.js`
- `app/simulator/simulator-monte-carlo.js`
- `app/simulator/auto-optimize-worker.js`
- `app/simulator/mc-life-events.js`
- `app/simulator/monte-carlo-runner.js`
- `app/simulator/sweep-runner.js`
- `app/balance/balance-health-bucket.js`
- `app/balance/balance-reader.js`
- `app/balance/balance-update-pipeline.js`
- `app/balance/balance-renderer-summary.js`
- `app/balance/balance-diagnosis-keyparams.js`
- `app/balance/balance-binder-diagnosis.js`
- `app/balance/balance-main-profilverbund.js`
- `app/profile/profilverbund-balance.js`
- `app/tranches/tranchen-manager-page.js`
- `depot-tranchen-manager.html`
- `Balance.html`
- `css/balance.css`

Teststand:

- `node tests\run-single.mjs tests\profile-state.test.mjs`
- `node tests\run-single.mjs tests\profile-asset-values.test.mjs`
- `node tests\run-single.mjs tests\profile-storage.test.mjs`
- `node tests\run-single.mjs tests\3bucket-config.test.mjs`
- `node tests\run-single.mjs tests\portfolio.test.mjs`
- `node tests\run-single.mjs tests\simulation.test.mjs`
- `node tests\run-single.mjs tests\health-bucket.test.mjs`
- `node tests\run-single.mjs tests\care-meta.test.mjs`
- `node tests\run-single.mjs tests\simulator-log-columns.test.mjs`
- `node tests\run-single.mjs tests\simulator-monte-carlo.test.mjs`
- `node tests\run-single.mjs tests\simulator-backtest.test.mjs`
- `node tests\run-single.mjs tests\simulator-sweep.test.mjs`
- `node tests\run-single.mjs tests\worker-parity.test.mjs`
- `node tests\run-single.mjs tests\auto-optimize-worker-contract.test.mjs`
- `node tests\run-single.mjs tests\auto-optimizer.test.mjs`
- `node tests\run-single.mjs tests\simulator-multiprofile-aggregation.test.mjs`
- `node tests\run-single.mjs tests\balance-health-bucket.test.mjs`
- `node tests\run-single.mjs tests\balance-decumulation.test.mjs`
- `node tests\run-single.mjs tests\balance-diagnosis-keyparams.test.mjs`
- `node tests\run-single.mjs tests\balance-diagnosis-copy-contract.test.mjs`
- `node tests\run-single.mjs tests\balance-renderer-summary.test.mjs`
- `node tests\run-single.mjs tests\balance-smoke.test.mjs`
- `node tests\run-single.mjs tests\profilverbund-balance.test.mjs`
- `npm test` mit 1748/1748 Assertions gruen

Noch offen:

- Keine offenen Punkte fuer Step 10.

## Umsetzungsschritte

### Schritt 1: Profil-/Haushaltsdefinition und Persistenz

- [x] Datenmodell `healthBucket` fuer Profil-/Haushaltsdefinition festlegen.
- [x] `profile_health_bucket` als JSON-Storage-Key definieren.
- [x] `profile_health_bucket` in `PROFILE_SCOPED_FIXED_KEYS` registrieren.
- [x] Profilpflege-UI fuer die Bucket-Definition ergaenzen.
- [x] Profile-Speichern und -Laden um `healthBucket` erweitern.
- [x] Profilverbund: Hauptprofil als Quelle verwenden, abweichende sekundaere Definitionen warnen.
- [x] Simulator-Input-Mapping aus Profildefinition ergaenzen, ohne Wirklogik.
- [x] Tests fuer Profil-/Input-Vertrag schreiben.

### Schritt 1b: Simulator-Anzeige ohne Wirkung

- [x] Simulator zeigt die gelesene Profildefinition an.
- Dieser Zwischenstep ist durch die spaetere Vollintegration ueberholt: Ausgliederung, Air Gap, Jahreslauf, Logs und MC-Metriken sind inzwischen umgesetzt.
- Die urspruengliche UI-Bewertung ohne Wirkung war ein temporärer Sicherheitsanker.

### Schritt 2: Portfolio-State

- [x] `healthBucketGeldmarkt` in Portfolio-Initialisierung aufnehmen.
- [x] Carve-Out erst nach Profilverbund-Merge und aggregierter Haushaltsportfolio-Initialisierung ausfuehren.
- [x] Initialbetrag primaer aus `depotTranchesGeldmarkt` ausgliedern.
- [x] Restbetrag aus ungetranchtem `geldmarktEtf` und danach aus `tagesgeld`/Cash decken, bevor gewarnt oder gekappt wird.
- [x] `portfolio.geldmarktEtf`, `portfolio.tagesgeld` und `portfolio.liquiditaet` konsistent reduzieren.
- [x] `healthBucketTranches`, `healthBucketCashAmount` und `healthBucketMeta` fuer Nachvollziehbarkeit fuehren.
- [x] Kappung/Warnung bei unzureichender Liquiditaet implementieren.
- [x] Tests fuer Initialisierung schreiben.

### Schritt 3: Air Gap

- [x] Sicherstellen, dass `buildSimulatorEngineInput` nur operative Liquiditaet nutzt.
- [x] Test: Bucket veraendert `aktuelleLiquiditaet` nicht nach oben.
- [x] Jahreslog um `portfolio_active_end` erweitern.

### Schritt 4: Health-Bucket-Modul

- [x] DOM-freies Modul `simulator-health-bucket.js` anlegen.
- [x] Trigger, eligible need, Coverage und Verzinsung implementieren.
- [x] Inflationsindexierten Zielwert, reale Deckungsquote und Ziel-Luecke berechnen.
- [x] Steuerbehandlung fuer Bucket-Verbrauch festlegen und implementieren bzw. explizit als Modellvereinfachung ausweisen.
- [x] Unit-Tests fuer Pflegegrade, Modi und Deckungsarten.
- [x] P1/P2-Care-Metadaten aus `householdContext.care` verwenden.

### Schritt 5: Jahreslauf integrieren

- [x] `householdContext.care` im Monte-Carlo-Jahreslauf mit `careMetaP1` und `careMetaP2` befuellen.
- [x] `householdContext.care` im Sweep-Jahreslauf fuer P1 befuellen.
- [x] `normalizeHouseholdContext` so erweitern, dass `care.p1` und `care.p2` erhalten bleiben.
- [x] Modul in `simulator-engine-direct.js` einhaengen.
- [x] Bucket-Nutzung vor `applyForcedSaleLiquidityCoverage` ausfuehren.
- [x] `liquiditaet` um genutzten Betrag erhoehen.
- [x] `forcedShortfall` entsprechend reduzieren.
- [x] Restbucket im Entnahme- und Ansparjahr mit `rC` verzinsen.
- [x] Integrationstest fuer Pflegebucket-Nutzung im Jahreslauf schreiben.

### Schritt 6: Logging und Anzeige

- [x] `buildSimulatorYearResult` um Bucket-Diagnose erweitern.
- [x] Jahreslog-Spalten in `simulator-results.js` ergaenzen.
- [x] Backtest-Log-Spalten in `simulator-main-helpers.js` ergaenzen.
- [x] `healthBucketMeta.warnings` sichtbar machen, insbesondere automatische Kappung beim Start wegen unzureichender Geldmarkt-/Cash-Liquiditaet.
- [x] KPI fuer inflationsbereinigte Zieldeckung und Ziel-Luecke im Backtest ergaenzen.
- Optional Portfolio-Chart um eigene Bucket-Linie erweitern.

### Schritt 7: Monte Carlo

- [x] Aggregatmetriken aufnehmen.
- [x] Ergebnisdarstellung um Bucket-Nutzung und Erschoepfung erweitern.
- [x] Tests fuer MC-Aggregation, Worker-Merge und Jahreslauf mit Pflegebucket ergaenzen.

### Schritt 8: Balance-App als Consumer

- [x] Balance-App liest dieselbe `healthBucket`-Definition aus dem Profil.
- [x] Anzeige von freier Liquiditaet vs. gesperrtem Pflegebucket.
- [x] Diagnose fuer inflationsbereinigte Zieldeckung.
- [x] Explizite Vermoegensuebersicht: Brutto-Liquiditaet, Pflege-Zweckbindung, operativ verfuegbare Liquiditaet.
- [x] Hinweis bei Kaufkraftluecke ohne automatische Umschichtung.
- [x] Noch keine automatische operative Freigabe, solange die Simulator-Wirklogik nicht validiert ist.

### Schritt 9: Balance-Wirklogik spaeter entscheiden

- [x] Nach Bewertung der Simulator-Ergebnisse entscheiden, ob Balance den Bucket bei realem Pflegefall operativ entsperren darf.
- [x] V1-Entscheidung dokumentieren: keine automatische operative Freigabe in Balance.
- [x] Policy technisch absichern: `releasePolicy: 'diagnostic_only'`, `releaseAllowed: false`, `releasedAmount: 0`.
- [x] UI-/Diagnosehinweis anzeigen, dass Balance den Bucket nur als Zweckbindung fuehrt.
- [x] Eigene Tests fuer Policy, Diagnose und Copytext ergaenzen.

Begruendung:

- Balance kennt derzeit keinen konkreten Pflegegrad-Ist-Zustand.
- Eine automatische Entsperrung allein aus der Existenz des Buckets waere fachlich falsch.
- Nutzer koennen reale Pflegeausgaben weiterhin ueber Bedarfswerte/Jahresplanung abbilden; der Bucket bleibt dabei transparent als Zweckbindung sichtbar.

Offene spaetere Option:

- Wenn die Profilpflege oder Balance spaeter einen expliziten aktuellen Pflegegrad bzw. Pflegefall-Status bekommt, kann eine manuelle oder regelbasierte Entsperrung als eigener Feature-Schritt gebaut werden.

### Schritt 10: Dokumentations-Sync als Abschlussarbeit

Dieser Schritt erfolgt gesammelt am Ende der Feature-Umsetzung. Die Referenzdokumente sollen nicht nach jedem einzelnen Implementierungsschritt angepasst werden, damit Zwischenstaende nicht als fertige Produktfunktion dokumentiert werden.

Aktualisierte Dokumente:

- [x] `README.md`
  - Pflegebucket im Funktionsueberblick ergaenzen.
  - Profilpflege als Source of Truth beschreiben.
  - Simulator-Wirkung kurz erklaeren: gesperrte Geldmarkt-/Cash-Reserve, Air Gap, Nutzung nur bei Pflege-Trigger.
  - Balance-Status klar abgrenzen: liest/zeigt die Definition, bleibt aber `diagnostic_only` ohne automatische operative Freigabe.
- [x] `docs/reference/TECHNICAL.md`
  - Datenfluss Profildefinition -> Simulator-Inputs -> Portfolio-State -> Engine-Air-Gap dokumentieren.
  - Neue Portfolio-Felder dokumentieren: `healthBucketGeldmarkt`, `healthBucketTranches`, `healthBucketCashAmount`, `healthBucketMeta`.
  - Carve-Out-Reihenfolge dokumentieren: Geldmarkt-Tranchen FIFO, ungetranchter Geldmarkt, Tagesgeld.
  - Kappungs- und Warnlogik dokumentieren.
  - Abgrenzung zur Core-Engine festhalten: Engine bekommt nur operative Liquiditaet.
- [x] `docs/reference/SIMULATOR_MODULES_README.md`
  - `simulator-profile-inputs.js` um Health-Bucket-Mapping ergaenzen.
  - `simulator-portfolio-init.js` um Carve-Out und FIFO-Fallback ergaenzen.
  - Spaetere Module/Flows ergaenzen, sobald implementiert: `simulator-health-bucket.js`, Jahreslauf-Integration, Logging, MC-Metriken.
  - Testverweise fuer Profilvertrag, Portfolio-Initialisierung, Jahreslauf und MC-Metriken aufnehmen.
- [x] `docs/reference/BALANCE_MODULES_README.md`
  - Balance als Consumer der Profildefinition beschreiben.
  - Nach Balance-Integration die Anzeige freier Liquiditaet vs. Pflege-Zweckbindung dokumentieren.
  - Klare Grenze dokumentieren, falls Balance die Reserve noch nicht operativ entsperrt.
- [x] `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
  - Fachliche Motivation und Grenzen des Pflegebuckets aufnehmen.
  - Selbstversicherung vs. Versicherung abgrenzen.
  - Inflationsindexierter Zielwert als Diagnose, nicht automatisches Refill, dokumentieren.
  - Steuerliche Behandlung des Bucket-Verbrauchs dokumentieren: cash-like Vereinfachung oder Tax-Aggregate, je nach finaler Implementierung.
  - Kapitel **Fachliche Algorithmen** erweitern:
    - algorithmische Zweckbindung als separaten Haushalts-State beschreiben.
    - Carve-Out-Algorithmus aus Geldmarkt-/Cash-Liquiditaet fachlich einordnen.
    - Air-Gap-Wirkung auf VPW, Runway, Entnahmequote und Forced-Sale-Logik erklaeren.
    - Trigger- und Coverage-Algorithmen fuer Pflegegrad, P1/P2-Modus und Deckungsart dokumentieren.
    - Inflationsindexierten Zielwert als Diagnosealgorithmus mit realer Deckungsquote und Ziel-Luecke aufnehmen.
  - Kapitel **Marktvergleich** erweitern:
    - Pflegebucket gegen klassische Liquiditaetsreserve, Notgroschen, Geldmarkt-ETF-Reserve, Pflegezusatzversicherung und Bucket-/Liability-Matching-Strategien abgrenzen.
    - Vor- und Nachteile gegenueber normal frei verfuegbarer Liquiditaet darstellen.
    - Opportunitaetskosten durch niedrigere VPW-/Entnahmebasis und geringeres Renditepotenzial bewerten.
    - Nutzen in Stressphasen beschreiben: weniger Notverkaeufe, aber keine Garantie gegen extreme Pflege-/Langlebigkeitsrisiken.
  - Kapitel **Forschungsabgleich** erweitern:
    - Bezug zu Liquiditaetsreserven, Mental Accounting, Self-Insurance, Long-Term-Care-Risiken und Sequence-of-Returns-Risk herstellen.
    - Abgrenzen, wo das Modell heuristisch ist und nicht aus einer kalibrierten Versicherungsmathematik stammt.
    - Forschungsnah bewerten, ob ein zweckgebundener Geldmarkt-Bucket bei hohem Vermoegen eher Risikoreduktion oder Over-Insurance darstellt.
    - Grenzen dokumentieren: Pflegekostenunsicherheit, politische Leistungsveraenderungen, Steuervereinfachungen, fehlendes automatisches Refill.
- [x] `docs/reference/PROFILVERBUND_FEATURES.md`
  - Haushaltsdefinition ueber Hauptprofil dokumentieren.
  - Warnung bei abweichenden sekundären Profildefinitionen beschreiben.
  - Reihenfolge klarstellen: Profilverbund-Merge vor Carve-Out.
- [x] `tests/README.md`
  - Neue Testfaelle und betroffene Testdateien aufnehmen.
  - Akzeptanztests fuer Deaktivierung, Carve-Out, Air Gap, Trigger, Warnungen, Logs und MC-Metriken dokumentieren.
- [x] `Handbuch.html`
  - Nutzerorientierte Erklaerung ergaenzen: Was ist der Pflegebucket, wo wird er gepflegt, welche Liquiditaet ist frei verfuegbar?
  - UI-Hinweise fuer Profilpflege, Simulator-Ergebnisse und spaetere Balance-Anzeige aufnehmen.
  - Warnhinweise zu Kappung und inflationsbereinigter Zieldeckung erklaeren.

Qualitaetskriterien fuer den Dokumentations-Sync:

- [x] Dokumentation beschreibt nur implementiertes Verhalten als Ist-Zustand.
- [x] Noch nicht implementierte Teile werden explizit als geplant oder offen markiert.
- [x] Keine widerspruechlichen Aussagen zwischen README, technischen Referenzen, Handbuch und internem Arbeitsdokument.
- Die Begriffe bleiben konsistent:
  - `Pflegebucket`
  - `healthBucket`
  - `healthBucketGeldmarkt`
  - `gesperrte Geldmarkt-/Cash-Reserve`
  - `operative Liquiditaet`
  - `Brutto-Liquiditaet minus Pflege-Zweckbindung`
- [x] Vor Abschluss mindestens `npm test` ausfuehren und den finalen Teststand in der Dokumentation nennen, falls die Dokumente Teststatus auffuehren.

Finaler Step-10-Teststand:

- `npm test` am 2026-05-23: 76 Testdateien, 1748/1748 Assertions gruen.

## Offene Designfragen

- Soll der Startbetrag hart validiert oder auf verfuegbare Liquiditaet gekappt werden?
- Soll der Bucket nur Pflege-Zusatzkosten oder den gesamten Floor bei aktivem Pflegefall decken?
- Soll die Verzinsung exakt `rC` folgen oder eine eigene Geldmarkt-Renditeannahme bekommen?
- Soll der Zielbetrag inflationsindexiert werden? Empfehlung: ja, aber in Version 1 nur als Diagnosegroesse ohne automatisches Refill.
- Soll der Bucket-Verbrauch steuerlich vereinfacht cash-like oder ueber Tax-Aggregate abgerechnet werden? Empfehlung: fuer Wirklogik vor Implementierung entscheiden; langfristig Tax-Aggregate.
- Soll der Bucket in `portfolio_total_end` enthalten sein? Empfehlung: ja, aber zusaetzlich `portfolio_active_end`.
- Sollen P1/P2-Care-Metadaten explizit durch den Jahreslauf gereicht werden, statt aus aggregierten Feldern abgeleitet zu werden? Empfehlung: ja, ueber `householdContext.care` ohne Signaturaenderung von `simulateOneYear`.
- Soll der Bucket eigene `healthBucketTranches` fuehren oder reicht ein Betrag? Empfehlung: eigene Tranches fuehren, mindestens aber `depotTranchesGeldmarkt` beim Ausgliedern konsistent reduzieren.
- Soll der Simulator eigene Overrides anbieten? Empfehlung: erst spaeter, initial Profildefinition verwenden und anzeigen.
- Wann soll die Balance-App den Bucket operativ entsperren duerfen? Empfehlung: erst nach validierter Simulator-Wirklogik entscheiden.

## Akzeptanzkriterien

- Bei deaktiviertem Feature bleiben bestehende Simulationsergebnisse unveraendert.
- Die dauerhafte Bucket-Definition liegt in der Profil-/Haushaltsdefinition, nicht nur im Simulator.
- `profile_health_bucket` ueberlebt Profilwechsel, Import/Export und Profil-Snapshot-Operationen.
- Simulator und Balance-App koennen dieselbe Definition lesen.
- Der Carve-Out erfolgt nach Profilverbund-Merge auf dem aggregierten Haushaltsportfolio.
- Geldmarkt-ETF und Tagesgeld/Cash werden als Bucket-Quelle beruecksichtigt, aber keine Risikoanlagen.
- Bei aktiviertem Feature sinkt die fuer VPW/Runway verfuegbare operative Basis um den Bucket-Betrag.
- Der Bucket wird nur bei Pflege-Trigger genutzt.
- Forced Sales werden erst nach Bucket-Nutzung ausgefuehrt.
- Steuerbehandlung des Bucket-Verbrauchs ist explizit implementiert oder als Vereinfachung dokumentiert.
- Balance zeigt den Bucket-Abzug transparent als Brutto-Liquiditaet minus Pflege-Zweckbindung.
- Die Jahreslogs zeigen Start, Nutzung, Ende, Trigger und Restbedarf transparent.
- Die Jahreslogs zeigen den inflationsangepassten Zielwert, reale Deckungsquote und Ziel-Luecke.
- Version 1 fuellt den Bucket nicht automatisch nach.
- Monte-Carlo-Laeufe koennen Bucket-Nutzung und Erschoepfung aggregieren.
- `npm test` laeuft erfolgreich.
