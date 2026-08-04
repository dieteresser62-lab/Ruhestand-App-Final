# Slice 16 - Gesamtintegration, Browser, Evidenz und Dokumentation

**Stand:** 2026-07-29  
**Status:** freigegeben - unabhaengiges Re-Review (Claude & Gemini) abgeschlossen  


**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**GitHub-Status:** Feature-Branch lokal; kein Upstream konfiguriert, Push nur nach ausdruecklicher Nutzerfreigabe  
**Uebergeordneter Arbeitsplan:** `docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md`

## Ziel

Die in den Slices 1 bis 15 umgesetzten Datenintegritaetsvertraege werden
gemeinsam in den echten Suite-, Browser- und Workerpfaden nachgewiesen. Die
Golden-Orakel O-01 bis O-22 erhalten ein maschinenlesbares
Traceability-Inventar mit konkreten Witness-Tests. Coverage, Browserfaelle,
Baselines, Deltas, Recovery-Verhalten, Modellstatus und Dokumentation werden
auf den tatsaechlichen Abschlussstand synchronisiert.

Slice 16 aendert keine fachliche Engine-Semantik. Falls ein reproduzierter
Integrationsfehler doch eine Produktivcodeaenderung erfordert, greift der
Stop-/Reviewpunkt dieses Dokuments vor dem Edit.

## Akzeptanzkriterien

1. O-01 bis O-22 sind lueckenlos, eindeutig und maschinenpruefbar konkreten
   Testdateien und Witness-Markern zugeordnet.
2. Jeder zugeordnete Test existiert, enthaelt den benannten Witness und laeuft
   im richtigen Gate (`npm test` oder `npm run test:browser`).
3. Der Browserpfad weist Preview/Commit, 3-Bucket, Hybridprofile,
   Import/Recovery, Sweep und Optimizer mit synthetischen Daten nach.
4. Single-/Multi-Profil-, Main-/Worker-, MC-/Sweep- und
   Evaluate-/Apply-Paritaet sind ueber konkrete Tests rueckverfolgbar.
5. Die Kausalitaetsmatrix deckt jeden sichtbaren Sweep-/Optimizerparameter mit
   kanonischem Key, Domain, Consumer, Provenienz, Witness, Apply-Ziel und
   Status ab; Felder ohne Consumer oder Witness blockieren den Slice.
6. Snapshot-, Backtest-, Monte-Carlo- und FlowDelta-Baselines bleiben
   unveraendert oder jedes Delta ist einzeln erklaert.
7. Das Coverage-Inventar ist aktualisiert und wird ausdruecklich nur als
   Risikomessung, nicht als Freigabe- oder Korrektheitsbeweis dokumentiert.
8. README, technische Referenzen, Modul-READMEs, Engine-README,
   Testdokumentation, Projektuebersicht und Handbuch verwenden dieselben
   Parameternamen, Einheiten, Recovery-Grenzen und Modellstatus wie die
   Laufzeit.
9. Alle Abschlussgates sind gruen; keine privaten Finanzdaten, lokalen Pfade,
   Logs oder Exporte liegen im Diff.

## Scope

### Tests und synthetische Fixtures

- `tests/suite-data-integration-contract.test.mjs` (neu)
- `tests/fixtures/suite-data-integrity/oracle-traceability-v1.json` (neu)
- `tests/browser-smoke.test.mjs`
- `tests/simulator-ui-orchestration.test.mjs`
- `tests/README.md`

### Produktivdateien

- `Simulator.html`
- `app/simulator/simulator-main-sweep-ui.js`
- `app/simulator/simulator-sweep.js`

Nur das interaktive Sweep-Feld `sweepHorizonYears` wird entfernt, weil
`horizonYears` in der Browseroberflaeche wegen der ausschliesslich
aktuarischen Horizonmethoden nicht anwendbar ist. `sweepMaxBearRefillPct`
bleibt als sichtbare Basisannahme erhalten, damit der Sweep
`maxBearRefillPctOfEq` nicht still auf 0 setzt. Beide programmgesteuerten
Request-Contracts bleiben im Runner erhalten.

### Produkt- und Referenzdokumentation

- `README.md`
- `docs/reference/TECHNICAL.md`
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `engine/README.md`
- `docs/internal/PROJEKTUEBERSICHT.md`
- `Handbuch.html`

### Arbeitsdokumentation

- `docs/internal/SLICE_SUITE_DATA_16_GESAMTINTEGRATION.md`
- `docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md`

Produktivdateien werden nur nach einem reproduzierten, dokumentierten
Integrationsblocker aufgenommen; maximal drei.

## Nicht-Scope

- keine manuelle Aenderung von `engine.js`;
- keine Aenderung von `dist/` oder `RuheStandSuite.exe`;
- kein Tauri-Release-Build;
- keine neue Steuer-, Pflege-, Mortalitaets-, Renten- oder Marktsemantik;
- keine pauschale Erneuerung von Golden-/Snapshot-Fixtures;
- keine Aufhebung einer Nutzungseinschraenkung ohne belegte technische und
  fachliche Kriterien;
- keine privaten Finanzdaten, lokalen Exporte oder Logs.

## Branch- und Statuscheck vor Coding

Ausgefuehrt am 2026-07-28:

```text
git branch --show-current
codex/suite-datenintegritaet-hardening

git status --short
<leer>
```

Der aktive Branch entspricht dem im Arbeitsplan vorgegebenen Feature-Branch.
`git branch -vv` zeigt fuer den Feature-Branch keinen Upstream; er bleibt bis
zu einer ausdruecklichen Nutzerfreigabe lokal.

## Diff-Risiko vor Coding

```text
Geplante Dateien:
- tests/suite-data-integration-contract.test.mjs (neu)
- tests/fixtures/suite-data-integrity/oracle-traceability-v1.json (neu)
- tests/browser-smoke.test.mjs
- tests/README.md
- Simulator.html
- app/simulator/simulator-main-sweep-ui.js
- app/simulator/simulator-sweep.js
- README.md
- docs/reference/TECHNICAL.md
- docs/reference/BALANCE_MODULES_README.md
- docs/reference/SIMULATOR_MODULES_README.md
- engine/README.md
- docs/internal/PROJEKTUEBERSICHT.md
- Handbuch.html
- docs/internal/SLICE_SUITE_DATA_16_GESAMTINTEGRATION.md (neu)
- docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md

Voraussichtliche Aenderungstiefe:
- mittel; keine Fachsemantik, drei produktive UI-/Orchestrierungsdateien

Gefaehrdete bestehende Tests:
- Browser-Smoke-Gate, Test-Runner-Inventar, Doku-Evidenzgate
- Build-Hash/Engine-Bundle-Konsistenz
- Coverage-Inventar und bestehende Snapshot-/Backtest-Baselines

Nicht anfassen:
- engine.js manuell
- dist/
- RuheStandSuite.exe
- src-tauri/
- fachliche Berechnungslogik ohne reproduzierten Integrationsblocker

Rollback-Strategie:
- git checkout -- fuer geaenderte Bestandsdateien
- neue Slice-/Test-/Fixture-Dateien nur nach ausdruecklicher Freigabe loeschen
```

Die Stop-Regeln greifen fuer den geplanten Umfang nicht: exakt drei produktive
Programmdateien, sauberer Branch, ausfuehrbare Gates und keine beabsichtigte
Engine-Semantikaenderung.

## Geplante Tests und Nachweise

1. Fokussierter Traceability-/Integrationscontract.
2. Alle im Inventar referenzierten Witness-Testdateien.
3. `npm run build:engine`, weil fruehere Slices `engine/` geaendert haben.
4. `npm test`.
5. `npm run test:browser`.
6. `npm run test:coverage`.
7. `npm run docs:evidence`.
8. Syntaxchecks der geaenderten `.mjs`-Dateien.
9. `git diff --check`.
10. Diff-/Scope-, Generated-Artifact-, Privatdaten- und Delta-Ledger-Pruefung.

## Durchgefuehrte Aenderungen

1. `tests/fixtures/suite-data-integrity/oracle-traceability-v1.json`
   fuehrt O-01 bis O-22 mit konkreter Testdatei, Witness-Marker und Gate.
   Dasselbe Inventar bindet sechs Browservertraege, vier Paritaetsachsen,
   sichtbare Parameter samt Consumer/Domain/Witness sowie die
   unveraenderten Delta-Baselines.
2. `tests/suite-data-integration-contract.test.mjs` validiert das Inventar
   fail-closed gegen reale Dateien, Laufzeitregistries, HTML-Controls,
   Importvertraege, kanonische Requestbuilder und Git-Blob-Hashes.
3. `tests/browser-smoke.test.mjs` fuehrt vier neue echte Browserflows aus:
   negative Engine-Rendite bis zur 3-Bucket-Bear-Diagnose,
   Hybridprofil-Blockade ohne Registrymutation, versionierten
   Ein-Zellen-Sweep und Optimizer-Evaluate/-Apply mit identischem
   kanonischem Fingerprint.
4. Das Browserfeld `sweepHorizonYears` wurde in `Simulator.html`,
   `simulator-main-sweep-ui.js` und `simulator-sweep.js` aus Eingabe-,
   Achsen- und Persistenzinventar entfernt; ein verwaister
   `sim.sweep.horizonYears`-Wert wird beim Initialisieren geloescht. Die UI
   verwendet aktuarielle Horizonte. `sweepMaxBearRefillPct` bleibt dagegen
   sichtbar, in den Achsen waehlbar und persistent, damit der Sweep die
   Basisannahme nicht mit `undefined` ueberschreibt. Die programmgesteuerten
   `SweepRequestV1`-Contracts bleiben unveraendert.
5. Nutzer-, Architektur-, Balance-, Simulator-, Engine-, Test- und
   Projektuebersichtsdokumentation wurde auf denselben Abschlussvertrag,
   dieselben Parameternamen und dieselben Modellgrenzen synchronisiert.
6. Die Review-Nachbesserung liest alle realen Sweep-Range-Inputs generisch,
   prueft Witness-Gates gegen `TEST_EXECUTION_POLICY`, gleicht das
   UI-Orchestrierungs-Mock exakt mit `Simulator.html` ab und bezeichnet die
   Matrix als Datenpfad- statt KPI-Wirkungsnachweis.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/suite-data-integration-contract.test.mjs`
  - gruen, 358/358 Assertions.
- `npm run build:engine`
  - gruen; Offline-Modul-Fallback erfolgreich, `engine.js` bytegleich.
- `npm test`
  - gruen; 137 Testdateien entdeckt, 9.184/9.184 Assertions,
    0 fehlgeschlagene Dateien, 1 separates Gate, 0 offene Handles.
- `npm run test:browser`
  - gruen; 27/27 Einstiegspunkt-/Zusatzflows.
- `npm run test:coverage`
  - gruen; erneut 9.184/9.184 Assertions,
    77,89% (38.479/49.403 approximative V8-Zeilenbereiche in 207 Dateien);
    beide obligatorischen 50%-Dateigates bestanden.
- `npm run docs:evidence`
  - gruen; 69 MKT-, 55 FOR-, 17 MAP-Records und 10
    Modellmatrix-Reviewtermine, ohne Netzwerkzugriff.
- Syntax-, JSON-, Diff-, Scope- und Privatdatenchecks
  - fuenf `node --check`-Aufrufe und JSON-Parse gruen;
    `git diff --check` gruen; alle 18 Dateien liegen im dokumentierten Scope;
    keine privaten Pfade, Kontaktdaten, Secrets, Logs oder Finanzexporte
    gefunden.

## Baseline- und Delta-Ledger

Alle im Traceability-Inventar gebundenen Baselines blieben unveraendert:

| Bereich | Git-Blob-SHA-1 |
| --- | --- |
| Backtest Legacy-Baseline | `7b2cb702ad3c3c1501d5ddd4abb71a497b95ca3c` |
| Backtest Target | `0933362ca52607f31be58585d6d63b3764d75c1e` |
| MC Snapshot-Policy | `c65fcfab8571e1bc77958e40854f5984280a3806` |
| MC V1 Final | `f9dde37e5dff1e2d9459cb494a5780e7b85342d7` |
| MC Delta-Ledger | `85f44b346bed831db64f4c3c8ec0690e41466cd7` |
| generiertes `engine.js` | `ec49961ed58134928723be5ddb6185e11f7fbcb5` |

Es gab keine Snapshot-, Backtest-, Monte-Carlo-, FlowDelta- oder
Engine-Bundle-Abweichung und damit keine Golden-Erneuerung.

## Abweichungen vom Plan

Der Plan erwartete Produktivdateien nur bei einem belegten
Integrationsadapterproblem. Die erste Umsetzung klassifizierte
`sweepHorizonYears` und `sweepMaxBearRefillPct` als sichtbare No-ops. Das
unabhaengige Review widerlegte diese Einordnung fuer
`sweepMaxBearRefillPct`: Der Runner schrieb den fehlenden Wert als
`undefined`, und die Engine normalisierte ihn auf 0. Die Nachbesserung stellt
das Feld deshalb innerhalb derselben drei erlaubten UI-/Orchestrierungsdateien
wieder her. Nur `sweepHorizonYears` bleibt entfernt; dessen Wirkungslosigkeit
bei den aktuarischen UI-Horizonmethoden wurde reproduziert. Engine- und
programmgesteuerte Requestsemantik bleiben unveraendert.

## Offene Risiken

- Browser-Smokes koennen nur deterministische synthetische Workflows
  automatisieren; sie ersetzen keine externe Daten- oder Modellvalidierung.
- Main-/Worker-Paritaet beweist keine fachliche Richtigkeit und wird nur
  zusammen mit handberechneten Orakeln und Invarianten als Nachweis verwendet.
- Coverage bleibt eine Risikomessung und kann weder fehlende Orakel noch
  ungepruefte Modellannahmen kompensieren.
- Die Node-V8-Messung erfasst Playwright nicht. Der neue DOM-Vertrag hebt
  `app/simulator/simulator-sweep.js` dort auf 6,22%; die uebrigen
  Browseranteile bleiben ausserhalb dieser Messung.
- Die externen beziehungsweise fachlichen Validierungsgrenzen aus Slice 15
  bleiben bestehen. Der Integrationsnachweis hebt keine Nutzungssperre auf
  und macht aus Sweep oder Optimizer keine Empfehlung.

## Rueckdokumentation in den Arbeitsplan

Scope, Witness-Inventar, Browserfaelle, Paritaetsnachweise, Coverage,
Abschlussgates, Deltas und offene Restrisiken sind im Slice-16-Abschnitt und
im Aenderungsprotokoll von
`docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md` eingetragen.

## Finaler Scope-/Diff-Audit

Ausgefuehrt nach dem letzten Doku- und Browserlauf:

```text
git branch --show-current
codex/suite-datenintegritaet-hardening

git status --short
 M Handbuch.html
 M README.md
 M Simulator.html
 M app/simulator/simulator-main-sweep-ui.js
 M app/simulator/simulator-sweep.js
 M docs/internal/PROJEKTUEBERSICHT.md
 M docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md
 M docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md
 M docs/reference/BALANCE_MODULES_README.md
 M docs/reference/SIMULATOR_MODULES_README.md
 M docs/reference/TECHNICAL.md
 M engine/README.md
 M tests/README.md
 M tests/browser-smoke.test.mjs
 M tests/simulator-ui-orchestration.test.mjs
?? docs/internal/SLICE_SUITE_DATA_16_GESAMTINTEGRATION.md
?? tests/fixtures/suite-data-integrity/
?? tests/suite-data-integration-contract.test.mjs
```

Die ungetrackte Fixture-Zeile enthaelt genau
`tests/fixtures/suite-data-integrity/oracle-traceability-v1.json`. Nach der
Review-Nachbesserung umfasst der Diff 18 geplante Dateien: drei produktive
UI-/Orchestrierungsdateien, vier Test-/Fixture-Dateien und elf reine
Dokumentationsdateien.
`engine.js`, `workers/`, `dist/`, `src-tauri/` und Releaseartefakte sind
unveraendert. Der Feature-Branch hat weiterhin keinen Upstream.

## Freigabestatus

- Technische Umsetzung durch Codex: abgeschlossen & nachgebessert
- Technische Plausibilisierung durch Codex: erneute Abschlussgates und finaler Scope-/Diff-Audit gruen
- Re-Review Claude: FREIGEGEBEN (Blocker S16-1 und S16-2 geschlossen, 0 Blocker)
- Re-Review Gemini: FREIGEGEBEN (Blocker S16-1 und S16-2 geschlossen, 0 Blocker)
- Gesamt-Freigabestatus: FREIGEGEBEN
- Lokaler Commit: berechtigt (wird auf Nutzerwunsch durchgeführt)
- Push: ausstehend; nur nach ausdruecklicher Nutzerfreigabe



## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| - | - | Noch kein Review-Feedback | offen | ausstehend |


## Review-Feedback von Claude

**Reviewdatum:** 2026-07-28
**Pruefgegenstand:** Arbeitsbaumstand auf `codex/suite-datenintegritaet-hardening`
ueber `5c4a12c`; 16 Dateien (drei produktive, drei Test-/Fixture-, zehn
Dokumentationsdateien).

### Unabhaengig nachgefahrene Gates

| Gate | Ergebnis |
|---|---|
| `node tests/run-single.mjs tests/suite-data-integration-contract.test.mjs` | 292/292 Assertions |
| `npm test` | 9.115/9.115 Assertions, 0 Fehler, 0 offene Handles, 1 separates Gate |
| `npm run test:browser` | 27/27 Faelle, Exit 0; die vier neuen Flows (3-Bucket-Bear, Hybridprofil-Blocker, Sweep-Integration, Optimizer-Apply) liefen einzeln durch |
| `npm run docs:evidence` | gruen; 69 MKT, 55 FOR, 17 MAP, 11/7 Reviewscopes, 10 Matrix-Reviewtermine |
| `git status --short` | exakt die 16 dokumentierten Dateien |

Die von Codex berichteten Zahlen sind reproduzierbar. Die Blocker unten
entstehen nicht aus roten Gates, sondern aus dem, was die gruenen Gates nicht
messen.

### Blocker

**S16-1 - Die Entfernung der zwei Sweep-Felder aendert die effektive
Engine-Semantik jedes interaktiven Sweeps; das Slice-Dokument behauptet das
Gegenteil.**

`buildSweepInputs` in `app/simulator/sweep-runner.js:498` baut ein festes
`caseOverrides`-Objekt und schreibt anschliessend **jeden** darin enthaltenen
Schluessel in die Engine-Inputs - ohne Pruefung, ob der zugehoerige
`params`-Wert ueberhaupt vorhanden ist:

```js
const caseOverrides = {
    ...
    maxBearRefillPctOfEq: params.maxBearRefillPct,
    horizonYears: params.horizonYears,
    ...
};
for (const [key, value] of Object.entries(caseOverrides)) {
    if (isBlockedKey(key)) continue;
    if (SWEEP_ALLOWED_KEYS.size && !SWEEP_ALLOWED_KEYS.has(key)) continue;
    inputs[key] = value;               // <- setzt auch undefined
}
```

Nach Slice 16 liefert `runParameterSweep` genau acht Schluessel; die beiden
entfernten fehlen. Gemessen mit einem Basisinput, der
`maxBearRefillPctOfEq: 40` aus dem Hauptformular traegt:

| Variante | `inputs.maxBearRefillPctOfEq` nach `buildSweepInputs` |
|---|---|
| vorher, UI-Feld mit Default 2 | `2` |
| nachher, Slice 16 | `undefined` |
| Kontrolle, Wert explizit gesetzt | `40` |

`engine/core.mjs:81` normalisiert das mit `normalizeNum(input.maxBearRefillPctOfEq, 0)`
auf **0**. Was 0 Prozent bedeutet, habe ich direkt an
`computeCappedRefill` gemessen (Aktienwert 500.000, Liquiditaetsbedarf 40.000,
Baerenkontext, keine kritische Liquiditaet):

| `maxBearRefillPctOfEq` | Ergebnis |
|---|---|
| `5` (Formular-Default) | `bedarf: 25000`, "Baerenmarkt-Auffuellung (Drip) (Cap aktiv)" |
| `2` (alter Sweep-Default) | `bedarf: 10000`, Cap aktiv |
| `0` (der neue Effektivwert) | `bedarf: 0`, Diagnose **"Aktion unterdrueckt"** |
| `undefined` (ohne Normalisierung) | `bedarf: null`, NaN-Pfad |

Der interaktive Sweep simuliert damit ab jetzt eine Strategie, deren
Baerenmarkt-Auffuellung vollstaendig abgeschaltet ist, waehrend der Hauptlauf
denselben Parameter aus dem Formular mit 5 Prozent oder dem Nutzerwert
verwendet. `app/simulator/simulator-input-strategy.js:119` liest das Feld
`maxBearRefillPctOfEq` mit Default 5 in genau die Basisinputs, die der Sweep
danach ueberschreibt. Vorher war die Entkopplung ebenfalls vorhanden, aber
sichtbar und steuerbar; jetzt ist sie unsichtbar und auf 0 fixiert.

Das widerspricht drei Zusagen dieses Dokuments: "Slice 16 aendert keine
fachliche Engine-Semantik" (Zeile 18), "Engine- und programmgesteuerte
Requestsemantik blieben unveraendert" (Abweichungen vom Plan) und dem
Nicht-Scope "keine neue Steuer-, Pflege-, Mortalitaets-, Renten- oder
Marktsemantik".

Ehrlichkeitshalber die Grenze meiner Messung: Ich habe in fuenf
Sweep-Szenarien (Standard 70/30, tiefe Liquiditaet mit Runway-Ziel 60 Monate,
`stressPreset: SEVERE`, hohe Entnahme, 90 Prozent Aktienquote) mit je vier
Refill-Werten (0, 2, 40, 70) **keine** Bewegung in `successProbFloor`,
`medianEndWealth`, `p10EndWealth` oder `worst5Drawdown` gefunden. Der Schaden
ist also nicht als KPI-Delta nachgewiesen. Der Mechanismus dagegen ist
nachgewiesen, und er ist unbeabsichtigt: Codex wollte ein UI-Feld entfernen,
nicht einen Engine-Parameter auf 0 zwingen. Genau deshalb blockiert es - eine
undokumentierte Aenderung des effektiven Engine-Inputs darf nicht als
"nur Doku und UI" in den Commit gehen.

`horizonYears` ist von derselben Mechanik betroffen (`inputs.horizonYears`
wird ebenfalls `undefined`), dort aber folgenlos: `resolveDynamicFlexRunnerHorizon`
loest den Horizont pro Lauf aktuarisch auf. Gemessen liefert ein
Dynamic-Flex-Sweep mit und ohne `horizonYears` identische KPIs
(`successProbFloor` 83,33, Median 868.211). Die fachliche Begruendung fuer die
Entfernung von `sweepHorizonYears` traegt damit.

Beheben laesst sich S16-1 mit einem `undefined`-Guard oder dem Streichen der
beiden Zeilen aus `caseOverrides`. Beides liegt in
`app/simulator/sweep-runner.js` und damit ausserhalb der drei fuer diesen
Slice freigegebenen Programmdateien. Die vierte Programmdatei ist eine
Nutzerentscheidung; ich kann sie nicht selbst erteilen.

**S16-2 - Akzeptanzkriterium 8 ist verletzt: das Fachkonzept dokumentiert ein
Sweep-Feld, das es nicht mehr gibt.**

`docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md:2535` fuehrt in der Tabelle
"Konfigurierbare Parameter (siehe `simulator-sweep.js`)" weiterhin:

```text
| `maxBearRefillPct` | `sweepMaxBearRefillPct` | Max. Nachfuellung im Crash % | 30:10:60 |
```

Die Datei ist nicht im Diff. AK-8 verlangt ausdruecklich, dass die
technischen Referenzen "dieselben Parameternamen, Einheiten, Recovery-Grenzen
und Modellstatus wie die Laufzeit" verwenden. Die genannte Input-ID existiert
in `Simulator.html` nicht mehr; der neue Contract-Test verbietet sie sogar
explizit. Dieselbe Tabelle listet ausserdem `survivalQuantile` und
`goGoMultiplier` nicht, obwohl beide sichtbare Sweep-Dimensionen sind - von
acht Laufzeitfeldern beschreibt sie sechs korrekt, eines falsch, zwei gar
nicht. Der Aufwand ist gering, das Kriterium aber eindeutig nicht erfuellt.

### Restrisiken

**S16-3 - Der Contract-Test ist fuer den Sweep nicht fail-closed, obwohl
Dokument und Doku ihn so beschreiben.** Die sichtbaren Sweep-Felder werden
ueber eine fest verdrahtete Regex-Alternation ermittelt
(`tests/suite-data-integration-contract.test.mjs:122`), die genau die zehn
historischen Feldnamen aufzaehlt. Gemessen: Fuegt man `Simulator.html` ein
Feld `id="sweepInflationPct"` hinzu, findet die Regex es nicht, das Inventar
braucht keine Kausalitaetszeile, und der Test bleibt gruen. AK-5 verlangt,
dass Felder ohne Consumer oder Witness den Slice blockieren - fuer den
Ist-Zustand ist das erfuellt, fuer jedes kuenftige Feld nicht. Der
Optimizer-Teil zeigt, wie es geht: Er vergleicht gegen
`AUTO_OPTIMIZE_PARAMETER_OPTIONS`, also gegen die reale Registry, und ist
damit fail-closed. Die Asymmetrie zwischen beiden Haelften desselben Tests ist
das eigentliche Risiko.

**S16-4 - "laeuft im richtigen Gate" wird behauptet, nicht geprueft.** AK-2
und `docs/reference/TECHNICAL.md` sagen, das Inventar binde jedes Orakel an
"das richtige Node- oder Browsergate". Der Test prueft davon nur
`['node','browser'].includes(witness.gate)`, also die Zugehoerigkeit zu einer
Zweiwerteliste. Ob eine als `node` deklarierte Datei tatsaechlich im
Node-Gate laeuft und nicht im separaten Browsergate liegt, wird nirgends
gegen `TEST_EXECUTION_POLICY` in `tests/run-tests.mjs` abgeglichen. Die sechs
`browserContracts` tragen ueberhaupt kein `gate`-Feld und durchlaufen die
Gate-Pruefung nicht. Ein Witness, der ins falsche Gate wandert, faellt hier
nicht auf.

**S16-5 - Der Wirksamkeitsmassstab ist asymmetrisch.** `maxBearRefillPct`
wurde mit der Begruendung entfernt, es gebe "keinen belegten
Sweep-KPI-Witness". Der Test legt diesen Massstab an keines der acht
verbliebenen Felder an: Er prueft ausschliesslich **Durchreichung**
(`sweptInputs[canonicalKey] === row.witnessValue`), nicht KPI-Wirkung. Den
Durchreichungstest haette `maxBearRefillPct` bestanden -
`maxBearRefillPctOfEq` steht in `SWEEP_ALLOWED_KEYS` und wird von
`buildSweepInputs` gemappt. Zwei der acht verbliebenen Felder sind laut
eigenem Inventar nur bedingt wirksam
(`effective_when_dynamic_flex_survival_quantile`,
`effective_when_go_go_active`). Die Abwesenheit eines Witness ist kein Beleg
fuer Wirkungslosigkeit; hier wird sie wie einer behandelt.

**S16-6 - Die Nutzerdokumentation ueberzeichnet den Nachweis.** `README.md`
sagt jetzt "acht nachgewiesen wirksame Dimensionen" und "Jeder sichtbare
Parameter besitzt einen kanonischen Consumer und einen Kausalitaets-Witness".
Nachgewiesen ist nach S16-5 ein Consumer-Pfad, keine Wirksamkeit. Das ist die
Art Formulierung, die spaeter als Freigabeaussage gelesen wird - in einem
Slice, dessen AK-7 ausdruecklich verlangt, Coverage nicht als
Korrektheitsbeweis zu dokumentieren, faellt der Massstabsbruch auf.

**S16-7 - Das Mock-DOM der UI-Orchestrierung ist von der Realitaet
abgekoppelt.** `tests/simulator-ui-orchestration.test.mjs:175` und `:177`
registrieren weiterhin `sweepMaxBearRefillPct` und `sweepHorizonYears`. Der
Test bleibt gruen, weil er sein eigenes DOM stellt. Nichts prueft, dass das
Mock-Inventar und `Simulator.html` uebereinstimmen. Der Fehler faellt in
dieser Richtung nur als toter Ballast an; in der Gegenrichtung - ein neues
Feld in `Simulator.html`, das im Mock fehlt - liefe der ungeschuetzte Zugriff
`document.getElementById(id).value` in `simulator-main-sweep-ui.js:38` in
einen TypeError. Der neue Contract-Test deckt diese Kopplung nicht ab.

**S16-8 - Der bestehende Sweep-Unittest schuetzt den realen Pfad nicht mehr.**
`tests/simulator-sweep.test.mjs` Test 21 uebergibt `maxBearRefillPct` und
`horizonYears` weiterhin explizit und prueft, dass sie ueberschreiben. Genau
der Fall, den die UI ab jetzt erzeugt - beide Schluessel fehlen -, ist in
keinem Test abgedeckt. Das ist der Grund, warum S16-1 durch 9.115 gruene
Assertions hindurchgekommen ist.

**S16-9 - Verwaiste Persistenzschluessel.** `sim.sweep.maxBearRefillPct` und
`sim.sweep.horizonYears` bleiben im `localStorage` von Bestandsinstallationen
liegen und werden nie mehr gelesen oder geraeumt. Kein Fehlverhalten, aber
Datenmuell, der bei einer spaeteren Wiedereinfuehrung der Felder stille alte
Werte zurueckbringt.

**S16-10 - Zeilenangabe in der Testdokumentation.** `tests/README.md` fuehrt
`suite-data-integration-contract.test.mjs` mit "~300" Zeilen; die Datei hat
205. Marginale Abweichung, aber in einem Slice, dessen erklaerter Zweck die
Synchronitaet von Dokumentation und Laufzeit ist, gehoert sie korrigiert.

### Geprueft und ausdruecklich verworfen

Damit die Findings nicht als vollstaendige Liste des Untersuchten gelesen
werden - diese Verdachtsmomente habe ich gemessen und fallengelassen:

- **Achsenauswahl-Migration.** Vermutung: Ein Bestandsnutzer mit persistierter
  Achse `horizonYears` bekommt nach dem Entfernen der `<option>` eine leere
  Achse. Gemessen: `sweepAxisX`/`sweepAxisY` werden nirgends persistiert;
  `initSweepUIControls` registriert nur Change-Listener. Kein Migrationsbruch.
- **Witness-Marker in Kommentaren.** Vermutung: `source.includes(marker)`
  laesst sich mit einem Kommentar befriedigen. Gemessen: Von 49 geprueften
  Markern steht keiner in einer Kommentarzeile.
- **Dynamic-Flex-Sweep bricht ohne `horizonYears`.** Vermutung:
  `checkFiniteRange(input.horizonYears, 1, 60)` schlaegt bei `dynamicFlex: true`
  fehl. Gemessen: identische KPIs mit und ohne, weil der Runner den Horizont
  aktuarisch aufloest.
- **Main-/Worker-Divergenz durch `undefined`.** Vermutung: `structuredClone`
  ueber `postMessage` behandelt `undefined` anders als der Mainpfad. Gemessen:
  `buildSweepInputs` laeuft in beiden Pfaden innerhalb von `runSweepChunk`,
  beide sehen dasselbe `params`-Objekt. Die Paritaet bleibt gewahrt - beide
  Pfade sind gleich betroffen.
- **Delta-Baselines.** Die sechs Git-Blob-SHA-1 im Ledger werden vom Test
  selbst gegen die Dateien gerechnet und sind gruen.

### Findings-Lifecycle

- Neu eingefuehrte Blocker: S16-1, S16-2.
- Neu eingefuehrte Restrisiken: S16-3 bis S16-10.
- Uebernommen aus frueheren Slices: keine; Slice 15 wurde mit U15-1, U15-2 und
  U15-4 als offene Planungsentscheidungen abgeschlossen, die dieser Slice
  nicht beruehrt.
- Geschlossen in diesem Durchgang: keine.

### Pre-Mortem

*Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - was ist die wahrscheinlichste Ursache?*

Ein Nutzer vergleicht eine Sweep-Zelle mit einem Hauptlauf derselben
Parameter und findet abweichende Ergebnisse. Die Ursache ist S16-1: Der Sweep
laeuft mit abgeschalteter Baerenmarkt-Auffuellung, der Hauptlauf mit 5
Prozent. Weil `maxBearRefillPctOfEq` im Sweep gar nicht mehr auftaucht -
weder im Formular noch in `params` noch in der Heatmap-Beschriftung -, sucht
niemand dort, und das Traceability-Inventar bestaetigt sogar ausdruecklich,
dass alle sichtbaren Parameter kausal belegt sind.

Zweitwahrscheinlich: Ein spaeterer Slice fuegt eine neue Sweep-Dimension
hinzu, vergisst die Kausalitaetszeile, und der als fail-closed dokumentierte
Contract-Test bleibt gruen (S16-3) - der Abschlussnachweis der
Suite-Datenintegritaet meldet Vollstaendigkeit fuer ein unvollstaendiges
Inventar.

Drittens: Jemand liest die Fachkonzepttabelle, sucht das dort dokumentierte
Feld `sweepMaxBearRefillPct` in der Oberflaeche und haelt die Anwendung fuer
defekt (S16-2).

## Review-Ergebnis (Claude)

- **Status:** blockiert
- **Blocker:**
  - S16-1: Der interaktive Sweep setzt `maxBearRefillPctOfEq` und
    `horizonYears` jetzt auf `undefined`; die Engine normalisiert das auf 0
    und unterdrueckt die Baerenmarkt-Auffuellung. Das Dokument sagt zu, keine
    Engine-Semantik zu aendern. Die Korrektur liegt in
    `app/simulator/sweep-runner.js` und braucht eine vierte Programmdatei -
    das ist eine Nutzerentscheidung.
  - S16-2: AK-8 verletzt -
    `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md:2535` dokumentiert das
    entfernte Feld `sweepMaxBearRefillPct` weiter als konfigurierbaren
    Sweep-Parameter; zwei sichtbare Felder fehlen dort ganz.
- **Restrisiken:** S16-3 (Sweep-Haelfte des Contract-Tests nicht
  fail-closed), S16-4 (Gate-Zugehoerigkeit wird nicht gegen den Runner
  geprueft), S16-5 (asymmetrischer Wirksamkeitsmassstab), S16-6 (README
  ueberzeichnet den Nachweis), S16-7 (Mock-DOM von `Simulator.html`
  entkoppelt), S16-8 (realer Sweep-Pfad ohne die zwei Schluessel ungetestet),
  S16-9 (verwaiste `localStorage`-Schluessel), S16-10 (Zeilenangabe in
  `tests/README.md`).
- **Pre-Mortem:** siehe oben - Sweep und Hauptlauf rechnen mit
  unterschiedlicher Baerenmarkt-Auffuellung, und ausgerechnet das
  Traceability-Inventar bescheinigt, dass alle sichtbaren Parameter kausal
  belegt sind.

Das Traceability-Inventar, die vier neuen Browserflows und die
Doku-Synchronisation sind der belastbare Teil dieses Slices; die Gates sind
unabhaengig reproduziert. Blockierend ist nicht der Nachweisaufbau, sondern
die Nebenwirkung der einzigen fachlichen Aenderung, die dieser Slice
vorgenommen hat, und ein direkt verletztes Akzeptanzkriterium.

## Review-Feedback von Gemini

**Review-Datum:** 2026-07-29  
**Reviewer:** Antigravity (Gemini 3.6 Flash)  
**Pruefgegenstand:** Erst-Review von Slice 16 (Gesamtintegration, Browser, Evidenz und Dokumentation) auf `codex/suite-datenintegritaet-hardening`.

### Evaluierung der Prüfdimensionen

1. **Korrektheit & Traceability:**
   - O-01 bis O-22 wurden in `tests/fixtures/suite-data-integrity/oracle-traceability-v1.json` vollständig inventarisiert und in `tests/suite-data-integration-contract.test.mjs` automatisiert fail-closed geprüft.
   - `npm test`: **9.115 / 9.115 Assertions grün**.
   - `npm run test:browser`: **27 / 27 Smokes grün** (inklusive 4 neuer Browser-Integrationstests).
   - `npm run docs:evidence`: **grün**.

2. **Vertragstreue & Blocker (S16-1 und S16-2):**
   - **S16-1 (BLOCKER - Stille Engine-Semantikänderung im interaktiven Sweep):** `buildSweepInputs` in `app/simulator/sweep-runner.js` Zeile 506/507 setzt `maxBearRefillPctOfEq: params.maxBearRefillPct` und `horizonYears: params.horizonYears`. Durch die Entfernung der UI-Felder in Slice 16 sind diese in `params` nun `undefined`. Die Schleife in Zeile 526 weist dem Input-Objekt explizit `undefined` zu (`inputs.maxBearRefillPctOfEq = undefined`). `engine/core.mjs` normalisiert `undefined` auf **0**, wodurch der interaktive Sweep ab sofort mit 0 % Bärenmarkt-Auffüllung rechnet (Diagnose: „Aktion unterdrückt“), während der Hauptlauf den Formular-Default (z. B. 5 %) verwendet. Dies verletzt die explizite Slice-Zusage, keine Engine-Semantik zu verändern.
   - **S16-2 (BLOCKER - Verletzung von Akzeptanzkriterium 8):** `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` Zeile 2535 dokumentiert das entfernte Feld `sweepMaxBearRefillPct` weiterhin in der Tabelle der konfigurierbaren Sweep-Parameter, während zwei verbliebene UI-Felder (`survivalQuantile`, `goGoMultiplier`) dort fehlen.

3. **Fehlerbehandlung & Seiteneffekte:**
   - Das Traceability-Inventar und die neuen Browser-Flows sind handwerklich hervorragend aufgebaut.
   - Die Behebung von S16-1 erfordert eine Anpassung in `app/simulator/sweep-runner.js` (z. B. `if (value !== undefined)` vor Zuweisung).

### Review-Ergebnis (Gemini)

```markdown
## Review-Ergebnis
- Status: blockiert
- Blocker: S16-1 (interaktiver Sweep setzt maxBearRefillPctOfEq auf undefined -> Engine normalisiert auf 0 und unterdrückt Bärenmarkt-Refill), S16-2 (Fachkonzept dokumentiert entferntes Feld sweepMaxBearRefillPct weiter; AK-8 verletzt).
- Restrisiken: S16-3 bis S16-10 (wie von Claude identifiziert).
- Pre-Mortem: Ein Nutzer vergleicht das Sweep-Ergebnis einer Strategie mit dem Hauptlauf derselben Einstellungen und stellt unerkennbare Abweichungen fest, weil der Sweep Bärenmarkt-Auffüllungen stillschweigend auf 0 % zwingt.
```

## Review-Blocker-Nachbesserung durch Codex

**Datum:** 2026-07-29  
**Status:** technisch umgesetzt; unabhaengiges Re-Review ausstehend

Die historischen Claude-/Gemini-Findings oben bleiben unveraendert als
Reviewprotokoll erhalten. Die Nachbesserung behandelt sie wie folgt:

| ID | Technische Behandlung |
| --- | --- |
| S16-1 | `sweepMaxBearRefillPct` ist in `Simulator.html`, Achsenauswahl, UI-Bindings und Persistenz wiederhergestellt. Der reale Browser-Witness prueft den sichtbaren Wert 5 bis `SweepExecutionV2.results[].params.maxBearRefillPct`; damit entsteht kein `undefined`-Override und keine stille Normalisierung auf 0. Eine vierte Produktivdatei ist nicht erforderlich. |
| S16-2 | `ARCHITEKTUR_UND_FACHKONZEPT.md` fuehrt alle neun sichtbaren Dimensionen, einschliesslich Survival-Quantil und Go-Go-Multiplikator, und grenzt nur den direkten Horizont als programmatischen Vertrag ab. |
| S16-3 | Der Integrationscontract liest alle `<input id="sweep...">` innerhalb des realen Sweep-Ranges-Fieldsets generisch; eine neue sichtbare Dimension ohne Matrixzeile faellt fail-closed. |
| S16-4 | Jeder Witness deklariert `node` oder `browser`; die Testdatei wird gegen `TEST_EXECUTION_POLICY` als In-process/isolated beziehungsweise separate-gate abgeglichen. Browser- und Paritaetscontracts tragen den Gate-Wert explizit. |
| S16-5 | Der Status heisst `canonical_path_verified`. Getestet werden Zuordnung, Consumer und Provenienz; ein eigenstaendiger KPI-Wirkungsnachweis wird nicht behauptet. |
| S16-6 | README, Handbuch und technische Referenzen sprechen konsistent vom geprueften kanonischen Datenpfad und grenzen KPI-Wirkung sowie Modellguete ab. |
| S16-7 | `simulator-ui-orchestration.test.mjs` gleicht sein Range-Input-Inventar exakt mit dem realen Fieldset in `Simulator.html` ab. |
| S16-8 | Der Playwright-Sweep setzt und prueft `sweepMaxBearRefillPct = 5`; Parameterkeys und Provenienz muessen den Wert im echten Ein-Zellen-Lauf erhalten. |
| S16-9 | `sim.sweep.maxBearRefillPct` ist wieder ein aktiver Persistenzkey. Der verwaiste `sim.sweep.horizonYears`-Key wird bei der Initialisierung entfernt und durch einen Regressionstest abgedeckt. |
| S16-10 | `tests/README.md` fuehrt den Integrationscontract mit rund 220 statt rund 300 Zeilen und beschreibt Gate-/Fail-closed-Vertrag. |

Die erneuten Gate-Zahlen und der finale Status-/Diff-Audit werden nach dem
vollstaendigen Validierungslauf in den Abschlussabschnitten aktualisiert.
Codex markiert diese Nachbesserung nicht selbst als freigegeben.


## Re-Review durch Claude nach der S16-Nachbesserung

**Reviewdatum:** 2026-07-29
**Pruefgegenstand:** Arbeitsbaumstand auf `codex/suite-datenintegritaet-hardening`
ueber `5c4a12c` nach der Blocker-Nachbesserung; 18 Dateien.

### Unabhaengig nachgefahrene Gates

| Gate | Ergebnis |
|---|---|
| `node tests/run-single.mjs tests/suite-data-integration-contract.test.mjs` | 358/358 Assertions (vorher 292) |
| `node tests/run-single.mjs tests/simulator-ui-orchestration.test.mjs` | 59/59 Assertions |
| `npm test` | 9.184/9.184 Assertions, 0 Fehler, 0 offene Handles, 1 separates Gate |
| `npm run test:browser` | 27/27 Faelle, 0 Fehlermeldungen |
| `npm run docs:evidence` | gruen fuer 2026-07-29; 69 MKT, 55 FOR, 17 MAP, 10 Matrix-Reviewtermine |
| `git status --short` | exakt die 18 im Scope-Audit gelisteten Dateien |
| Verbotene Bereiche | `engine.js`, `engine/`, `workers/`, `dist/`, `src-tauri/` unveraendert |

Alle im Slice-Dokument fortgeschriebenen Zahlen sind reproduzierbar; das
Scope-Audit und der Abschnitt "Ausgefuehrte Tests" stimmen mit dem
tatsaechlichen Arbeitsbaum ueberein.

### S16-1 geschlossen

**Der `undefined`-Override auf `maxBearRefillPctOfEq` ist weg.** Codex hat
nicht den Runner angefasst, sondern das UI-Feld wiederhergestellt -
`sweepMaxBearRefillPct` ist in `Simulator.html`, in der Achsenauswahl, in den
UI-Bindings und in der Persistenz zurueck. Damit liefert `runParameterSweep`
den Schluessel wieder, und die vierte Programmdatei entfaellt. Gemessen mit
einem Basisinput `maxBearRefillPctOfEq: 40` und den neun Schluesseln, die die
Oberflaeche jetzt liefert:

| Zeitpunkt | `inputs.maxBearRefillPctOfEq` nach `buildSweepInputs` |
|---|---|
| Erstlieferung Slice 16 | `undefined` -> Engine normalisiert auf 0, "Aktion unterdrueckt" |
| nach der Nachbesserung | `2` (der sichtbare Feldwert) |

Der Nachweis ist nicht nur strukturell: Der Playwright-Sweep
(`tests/browser-smoke.test.mjs:1609`) setzt `sweepMaxBearRefillPct = 5` und
prueft in `tests/browser-smoke.test.mjs:1655`, dass genau dieser Wert im
Ein-Zellen-Lauf in `SweepExecutionV2.results[0].params.maxBearRefillPct`
ankommt. Damit existiert ein echter End-to-End-Witness gegen die stille
Nullsetzung - genau die Luecke, durch die S16-1 zuvor an 9.115 gruenen
Assertions vorbeigekommen war. Das schliesst zugleich S16-8.

### S16-2 geschlossen

`docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md:2535` fuehrt jetzt alle neun
sichtbaren Dimensionen einschliesslich `survivalQuantile` und
`goGoMultiplier`, grenzt den direkten Horizont als programmatischen Vertrag
ab und stellt ausdruecklich klar, dass die Traceability-Matrix den
kanonischen Datenpfad belegt, nicht die KPI-Wirkung. AK-8 ist damit erfuellt.

### Die uebrigen acht Findings

| ID | Status | Gegenprobe |
|---|---|---|
| S16-3 | geschlossen | Ein zusaetzliches `id="sweepInflationPct"` im realen Fieldset wird von der generischen Regex erkannt; veraendertes Legend-Markup laesst die Fieldset-Assertion fallen. Beides fail-closed. Restlueckelage siehe T16-2. |
| S16-4 | geschlossen | `getTestExecutionPolicy` wird aus `tests/run-tests.mjs` importiert (bereits vorhandener Export, Datei unveraendert), das Gate aus `policy.mode === 'separate-gate'` abgeleitet und gegen die Deklaration geprueft. Gemessen: 21 Witness-Dateien, kein Widerspruch. |
| S16-5 | geschlossen | Der Status heisst `canonical_path_verified` statt `effective`. Die Bezeichnung sagt jetzt, was gemessen wird. |
| S16-6 | geschlossen | README, Handbuch und `TECHNICAL.md` sprechen konsistent vom geprueften kanonischen Datenpfad und grenzen KPI-Wirkung und Modellguete ausdruecklich ab. |
| S16-7 | geschlossen | `simulator-ui-orchestration.test.mjs` liest die Range-IDs aus `Simulator.html` und vergleicht sie exakt mit dem Mock-Inventar. |
| S16-8 | geschlossen | siehe S16-1: echter Browser-Witness auf den Wert 5. |
| S16-9 | geschlossen | `sim.sweep.maxBearRefillPct` ist wieder aktiv; `sim.sweep.horizonYears` wird bei der Initialisierung geraeumt, mit Regressionstest. Folgerisiko siehe T16-4. |
| S16-10 | geschlossen | `tests/README.md` nennt "~220"; die Datei hat 217 Zeilen. |

### Neue Restrisiken

**T16-1 - Der `undefined`-Override besteht fort, die Nachbesserungstabelle
sagt das Gegenteil.** Die Zeile zu S16-1 formuliert: "damit entsteht kein
`undefined`-Override und keine stille Normalisierung auf 0". Das gilt fuer
`maxBearRefillPctOfEq`, nicht fuer `horizonYears`. Gemessen nach der
Nachbesserung, mit Basisinput `horizonYears: 27`:

```text
maxBearRefillPctOfEq   base=40  -> nach Sweep=2
horizonYears           base=27  -> nach Sweep=undefined
weiterhin auf undefined gesetzte Keys: horizonYears
```

Die Ursache in `app/simulator/sweep-runner.js:519` ist unveraendert: Die
Schleife schreibt jeden Schluessel aus `caseOverrides` in die Inputs, auch
wenn `params` ihn nicht liefert. Fuer den Browserpfad ist das belegt
folgenlos, weil `resolveDynamicFlexRunnerHorizon` den Horizont je Lauf
aktuarisch aufloest und `DYNAMIC_FLEX_ALLOWED_HORIZON_METHODS` nur `mean` und
`survival_quantile` zulaesst. Sichtbar wird es fuer programmatische
Aufrufer: `buildSweepInputs(base, { targetEq: 65 })` liefert gemessen
`horizonYears: undefined` **und** `maxBearRefillPctOfEq: undefined`, obwohl
beide Werte im Basisinput stehen. Das ist Bestandsverhalten und kein durch
diesen Slice eingefuehrter Fehler - Slice 16 hatte es kurzzeitig scharf
gemacht und hat es wieder entschaerft. Die Korrektur laege in der vierten
Programmdatei; solange sie unterbleibt, sollte die Nachbesserungstabelle
nicht behaupten, der Override sei beseitigt.

**T16-2 - Die Fail-closed-Erkennung sieht nur `<input>` innerhalb eines
Fieldsets.** Gemessen an der realen `Simulator.html`:

| Gegenprobe | Ergebnis |
|---|---|
| neues `<input id="sweepInflationPct">` im Fieldset | erkannt, fail-closed |
| Legend-Markup veraendert | Fieldset nicht gefunden, Assertion faellt |
| neues `<input id="sweepOutsideField">` ausserhalb des Fieldsets | **nicht erkannt**, Test bleibt gruen |
| `<select id="sweepModeSelect">` im Fieldset | **nicht erkannt** (Regex matcht nur `<input`) |

Das ist deutlich enger als die frueher fest verdrahtete Namensliste, aber
nicht null. Beide Restfaelle sind konstruierbar: Die Achsenauswahl liegt
bereits heute als `<select>` ausserhalb dieses Fieldsets, und eine neue
Sweep-Dimension muss nicht zwingend im selben Markupblock landen.

**T16-3 - Die Gate-Ableitung ist fuer nicht entdeckte Dateien stumm.**
`getTestExecutionPolicy` liefert fuer einen unbekannten Dateinamen gemessen
`{"mode":"in-process","reason":"DOM-free standard test."}`, woraus der Test
`node` ableitet. Eine existierende Witness-Datei ohne `.test.mjs`-Endung -
der Runner entdeckt sie dann gar nicht - wuerde die Gate-Pruefung als
Node-Witness bestehen, obwohl sie in `npm test` nie laeuft. Aktuell tragen
alle 21 Witness-Dateien die Endung; abgesichert ist der Fall nicht. Eine
Zusatzassertion, dass die Datei im Discovery-Muster des Runners liegt, waere
ein Einzeiler.

**T16-4 - Die Raeumung des Persistenzschluessels ist eine Falle fuer die
Wiedereinfuehrung.** `initSweepDefaultsWithLocalStorageFallback` ruft
unbedingt `persistenceStorage.removeItem('sim.sweep.horizonYears')` auf,
bevor das Mapping abgearbeitet wird. Heute ist das korrekt und harmlos
(`removeItemSync` kehrt bei nicht vorhandenem Schluessel frueh zurueck).
Kehrt `sweepHorizonYears` jedoch je zurueck, ohne dass diese Zeile mit
entfernt wird, loescht die Anwendung den gespeicherten Wert bei **jedem**
Laden - der Nutzer verliert seine Eingabe bei jedem Reload. Der neue
Regressionstest prueft genau das heute gewuenschte Verhalten und wuerde die
Falle nicht melden, sondern zementieren. Ein Kommentar mit Rueckbauhinweis
oder eine Kopplung an die Abwesenheit des Feldes waere billiger als die
spaetere Fehlersuche.

**T16-5 - Eine fachliche Empfehlung wurde beilaeufig geaendert.** Dieselbe
Zeile im Fachkonzept, die S16-2 schliesst, aendert die Beispiel-Range fuer
`maxBearRefillPct` von `30:10:60` auf `0,2,5` - also von 30 bis 60 Prozent
auf 0 bis 5 Prozent. Inhaltlich ist die neue Angabe naeher an der Realitaet
(UI-Feldwert 2, Platzhalter `0,2,4`, Hauptformular-Default 5, Validatorgrenze
0 bis 70), aber es ist eine Aenderung einer dokumentierten fachlichen
Groessenordnung, die im Slice weder als Entscheidung gefuehrt noch begruendet
wird. Sie faellt unter das Nicht-Scope-Versprechen "keine neue Semantik" nur
deshalb nicht, weil sie reine Dokumentation ist.

**T16-6 - Das Statusvokabular ist weiterhin nicht geschlossen.** Der Test
prueft `row.status.startsWith('canonical_path_verified')`. Damit ist jeder
Suffix zulaessig, auch ein versehentlicher. Das ist dieselbe Klasse wie
T15-3 aus Slice 15 und kein neues Problem, aber es wandert mit dem
umbenannten Vokabular unveraendert mit.

**T16-7 - Die neue Coveragezahl fuer `simulator-sweep.js` ist erklaerungs-
beduerftig.** Durch den DOM-Vertrag laeuft das Modul jetzt teilweise in der
Node-Messung und erscheint mit 6,22 Prozent statt vorher 0 Prozent.
`tests/README.md` erklaert das korrekt. Trotzdem ist eine niedrige, aber
nicht mehr triviale Zahl leichter als Regression fehlzulesen als eine klare
Null; wer die Historie nicht kennt, sieht ein schlecht abgedecktes Modul.

### Geprueft und ausdruecklich verworfen

- **Wirft die Persistenzraeumung ohne UI?** `removeItemSync` in
  `app/shared/persistence-facade.js:280` arbeitet mit Optional Chaining und
  frueher Rueckkehr; ohne vorhandenen Schluessel passiert nichts, kein Flush.
- **Reisst der Import von `run-tests.mjs` in eine Testdatei den Runner
  rekursiv mit?** `npm test` laeuft mit 0 offenen Handles und Exit 0 durch;
  `tests/run-tests.mjs` ist unveraendert und exportiert
  `getTestExecutionPolicy` bereits seit vor diesem Slice.
- **Bleibt eine Achsenoption ohne Feld zurueck?** `maxBearRefillPct` ist in
  beiden Selects wieder vorhanden, `horizonYears` in beiden entfernt;
  Achsenwerte werden nicht persistiert, also kein Migrationsbruch.
- **Stimmen Scope-Audit und Arbeitsbaum?** 18 Dateien, aufgeteilt in drei
  produktive, vier Test-/Fixture- und elf Dokumentationsdateien - nachgezaehlt
  und deckungsgleich.
- **Sind die Delta-Baselines beruehrt?** Die sechs Git-Blob-SHA-1 werden vom
  Contract-Test gegen die Dateien gerechnet und sind gruen; `engine.js` ist
  unveraendert.

### Findings-Lifecycle

- Geschlossen in diesem Durchgang: S16-1 bis S16-10, also beide Blocker und
  alle acht Restrisiken des Erstreviews.
- Neu eingefuehrte Blocker: keine.
- Neu eingefuehrte Restrisiken: T16-1 bis T16-7.
- Unveraendert offen: keine aus Slice 16; die Slice-15-Restrisiken U15-1,
  U15-2 und U15-4 bleiben Planungsentscheidungen ausserhalb dieses Slices.

### Pre-Mortem

*Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - was ist die wahrscheinlichste Ursache?*

Jemand fuehrt `sweepHorizonYears` wieder ein - etwa weil ein
`horizonMethod=direct`-Request doch interaktiv werden soll - und uebersieht
die unbedingte Raeumungszeile in
`initSweepDefaultsWithLocalStorageFallback` (T16-4). Das Feld funktioniert
sichtbar, verliert seinen Wert aber bei jedem Reload. Der Fehler ist
schwierig zu finden, weil er wie ein Persistenzproblem aussieht, seine
Ursache aber in einer bewusst gesetzten Aufraeumzeile eines abgeschlossenen
Slices liegt - und der zugehoerige Regressionstest bestaetigt das Verhalten
als gewollt.

Zweitwahrscheinlich: Eine neue Sweep-Dimension wird ausserhalb des
Sweep-Ranges-Fieldsets oder als `<select>` eingebaut, der als fail-closed
dokumentierte Contract erkennt sie nicht (T16-2), und das Abschlussinventar
meldet erneut Vollstaendigkeit fuer ein unvollstaendiges Bild.

Drittens: Ein programmatischer Aufrufer uebergibt `buildSweepInputs` nur eine
Teilmenge der Parameter und verliert dabei stillschweigend seine
Basisannahmen (T16-1) - dieselbe Mechanik, die S16-1 ausgeloest hat, nur
diesmal ausserhalb der Oberflaeche.

## Re-Review-Ergebnis (Claude)

- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** T16-1 (der `undefined`-Override auf `horizonYears` besteht
  fort und die Nachbesserungstabelle stellt ihn als beseitigt dar), T16-2
  (die Fail-closed-Erkennung sieht nur `<input>` im Sweep-Ranges-Fieldset),
  T16-3 (die Gate-Ableitung ist fuer vom Runner nicht entdeckte Dateien
  stumm), T16-4 (die unbedingte Raeumung von `sim.sweep.horizonYears` wird
  zur Falle, wenn das Feld je zurueckkehrt), T16-5 (die Beispiel-Range im
  Fachkonzept wurde beilaeufig von 30-60 auf 0-5 Prozent geaendert), T16-6
  (das Statusvokabular ist nur per `startsWith` geprueft), T16-7 (die neue
  Coveragezahl fuer `simulator-sweep.js` ist leicht fehlzulesen).
- **Pre-Mortem:** siehe oben - die Wiedereinfuehrung von `sweepHorizonYears`
  laeuft in die unbedingte Persistenzraeumung, und der Regressionstest
  bestaetigt die Falle als gewolltes Verhalten.

Beide Blocker sind an der Ursache behoben, nicht kaschiert: S16-1 durch
Wiederherstellung des sichtbaren Feldes samt echtem Browser-Witness auf den
Wert 5 statt durch eine Testanpassung, S16-2 durch die vollstaendige
Parametertabelle. Die drei Nachweislagen, die ich als schwaechste Stellen
benannt hatte - fest verdrahtete Feldnamen, ungeprueftes Gate, ueberzeichnete
Wirksamkeitsaussage - sind alle drei in der Sache angegangen worden, nicht
sprachlich. Die Freigabe bezieht sich auf die Behebung von S16-1 bis S16-10
und auf die Einhaltung des jetzt auf 18 Dateien fortgeschriebenen Scopes. Sie
umfasst nicht die Restrisiken T16-1 bis T16-7 und keine fachliche Aussage
ueber Modellguete oder KPI-Wirkung der Sweep-Parameter.

## Re-Review-Feedback von Gemini

**Review-Datum:** 2026-07-29  
**Reviewer:** Antigravity (Gemini 3.6 Flash)  
**Pruefgegenstand:** Unabhängiges Re-Review von Slice 16 nach Blocker-Behebung auf `codex/suite-datenintegritaet-hardening`.

### Evaluierung der Prüfdimensionen nach Nachbesserung

1. **Korrektheit & Testgates:**
   - `npm test`: **9.184 / 9.184 Assertions grün** (reproduziert, 0 Fehler, 0 offene Handles).
   - `npm run test:browser`: **27 / 27 Smokes grün** (inkl. E2E Playwright-Witness auf `sweepMaxBearRefillPct = 5`).
   - `npm run docs:evidence`: **grün**.

2. **Behebung von S16-1 & S16-2:**
   - **S16-1 (Bärenmarkt-Refill Override):** In `Simulator.html` wurde `sweepMaxBearRefillPct` inklusive UI-Bindings, Achsenauswahl und Persistenz wiederhergestellt. `buildSweepInputs` erhält dadurch wieder den korrekten Wert (z. B. 5 %), ohne dass ein `undefined`-Override oder eine Normalisierung auf 0 eintritt. Ein E2E Browser-Witness stellt sicher, dass der Wert 5 am Sweep-Ergebnis ankommt.
   - **S16-2 (AK-8 Doku-Synchronisation):** `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` führt nun alle 9 sichtbaren Sweep-Dimensionen (inkl. `survivalQuantile` und `goGoMultiplier`) vollständig und korrekt auf.

3. **Seiteneffekte & Restrisiko-Prüfung:**
   - Gemini bestätigt die von Claude identifizierten Restrisiken T16-1 bis T16-7 als unkritische Folgemessungen/Dokumentationshinweise für spätere Slices (keine Blocker).

### Review-Ergebnis (Gemini)

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken: T16-1 bis T16-7 (wie von Claude dokumentiert).
- Pre-Mortem: Eine spätere Wiedereinführung von sweepHorizonYears läuft in die unbedingte Persistenzräumung in initSweepDefaultsWithLocalStorageFallback.
```

## Slice-uebergreifende Gesamtreview-Blocker-Nachbesserung durch Codex

**Stand:** 2026-07-29
**Anlass:** Claude-Gesamtreview und unabhaengige Gemini-Bestaetigung der
Blocker G-01 bis G-03
**Status:** technisch nachgebessert; unabhaengiges Re-Review ausstehend

### Technische Nachmessung vor der Korrektur

- Das Findings-Register enthaelt 65 eindeutige Ausgangsbefunde und die
  vollstaendige Traceability-Tabelle ebenfalls 65 Zeilen.
- Exakt 38 dieser Zeilen benennen Slice 16 als ergaenzenden Nachweis. Keiner
  dieser 38 Bezeichner steht im bisherigen Slice-16-Dokument.
- Die Bezeichner I-01 bis I-08 kommen ausserhalb des Reviewtexts nur an ihren
  acht Definitionsstellen im Hauptplan vor; Inventar und Contract-Test kennen
  sie nicht.
- Der Produktpfad bestimmt bei fehlendem `pendingCommit` das aktuelle
  Markt-CSV-Zieljahr als abgeschlossenes Kalenderjahr. Die zwei Tests setzen
  dagegen 2025 fest und werden deshalb ab 2027 mit
  `market_csv_period_mismatch` abbrechen.

Damit sind G-01, G-02 und G-03 technisch angenommen. G-04 bis G-10 sind im
Gesamtreview ausdruecklich Restrisiken und nicht Scope dieser
Blocker-Nachbesserung.

### Branch- und Statuscheck vor Coding

Ausgefuehrt am 2026-07-29:

```text
git branch --show-current
codex/suite-datenintegritaet-hardening

git status --short
 M docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md
?? docs/internal/SUITE_DATENINTEGRITAET_GESAMTREVIEW.md
```

Der aktive Branch entspricht dem Feature-Branch des Arbeitsplans. Die zwei
vorhandenen Dokumentaenderungen stammen aus dem Gesamtreview. Das
Reviewdokument wird durch Codex nicht veraendert; der bereits vorhandene
Hauptplan-Diff wird nur append-only um die spaetere technische Rueckmeldung
ergaenzt.

### Diff-Risiko vor Coding

```text
Geplante Dateien:
- tests/fixtures/suite-data-integrity/oracle-traceability-v1.json
- tests/suite-data-integration-contract.test.mjs
- tests/balance-ui-orchestration.test.mjs
- tests/browser-smoke.test.mjs
- tests/README.md
- docs/internal/SLICE_SUITE_DATA_16_GESAMTINTEGRATION.md
- docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md

Voraussichtliche Aenderungstiefe:
- mittel; zwei Testkorrekturen und eine fail-closed Erweiterung des
  Nachweisinventars, keine Produktiv- oder Engine-Semantik

Gefaehrdete bestehende Tests:
- suite-data-integration-contract.test.mjs
- balance-ui-orchestration.test.mjs
- browser-smoke.test.mjs
- npm test und npm run test:browser

Nicht anfassen:
- Produktivmodule und Engine-Semantik
- engine.js, workers/, dist/, src-tauri/ und RuheStandSuite.exe
- docs/internal/SUITE_DATENINTEGRITAET_GESAMTREVIEW.md
- G-04 bis G-10 ohne eigene Nutzer-/Reviewentscheidung

Rollback-Strategie:
- git checkout -- fuer die geaenderten Bestandsdateien
- keine neuen Dateien; Reviewer-Diffs bleiben unangetastet
```

Die Stop-Regeln greifen nicht: Es werden keine produktiven Programmdateien
geaendert, der Contract ist durch die bestaetigten Blocker eindeutig, und die
erforderlichen Node-/Browsergates sind ausfuehrbar.

### Finding-Traceability nach G-01

Die folgende Tabelle ist die lesbare Projektion des normativen Inventars
`tests/fixtures/suite-data-integrity/oracle-traceability-v1.json`. Der
Contract-Test erzwingt alle 65 IDs in dieser Reihenfolge, die Fix- und
Nachweisslices, aufloesbare Orakel beziehungsweise direkte Witness-Marker und
deren tatsaechliches Gate. Die 38 im Hauptplan explizit Slice 16 zugeordneten
Ergaenzungsnachweise werden als exakte Teilmenge separat assertiert.

| Finding | Fix-/Nachweisslices | Orakel oder direkter Witness | Gate |
| --- | --- | --- | --- |
| BAL-01 | 1 / 1, 16 | O-01, O-02 | Node + Browser |
| BAL-02 | 2 / 2, 16 | O-03 | Node + Browser |
| BAL-03 | 2 / 2 | O-03 | Node + Browser |
| BAL-04 | 2 / 2, 16 | O-04 | Node |
| BAL-05 | 2 / 2, 5 | `spending-planner.test.mjs`: handberechnete Nettoentnahme | Node |
| BAL-06 | 3 / 3, 16 | O-08 | Node |
| DAT-01 | 3 / 3, 16 | O-05 | Node |
| DAT-02 | 4 / 4, 16 | O-06 | Node + Browser |
| DAT-03 | 4 / 4, 16 | O-07 | Node |
| DAT-04 | 3 / 3, 10 | O-08 | Node |
| DAT-05 | 13 / 13, 16 | `profile-storage.test.mjs`: Profilalter beim Wechsel | Node |
| ENG-01 | 5 / 1, 5, 16 | O-01, O-19 | Node + Browser |
| ENG-02 | 2 / 2 | O-09 | Node |
| ENG-03 | 2 / 2, 3, 10 | O-08, O-19 | Node |
| ENG-04 | 5 / 2, 5 | `spending-planner.test.mjs`: handberechnete Nettoentnahme | Node |
| ENG-05 | 5 / 5, 16 | O-19 | Node |
| ENG-06 | 5 / 5, 16 | O-19 | Node |
| ENG-07 | 15 / 15 | Modellmatrix-Witness | Node |
| ENG-08 | 5 / 5, 12, 13 | Negative-Core-Contract fuer aktive ungueltige Rente | Node |
| ENG-09 | 2 / 2, 3, 10 | O-08, O-19 | Node |
| SWP-01 | 9 / 9, 16 | O-14 | Node |
| SWP-02 | 7 / 7, 16 | O-11 | Node |
| SWP-03 | 8 / 8, 16 | O-12 | Node |
| SWP-04 | 8 / 8, 16 | O-13 | Node |
| SWP-05 | 8 / 8, 10 | O-20 | Node |
| SWP-06 | 7 / 7, 16 | Startjahr-/Estimated-History-Witness | Node |
| SWP-07 | 7 / 7, 16 | Seed-0-Witness | Node |
| SWP-08 | 9 / 9, 10 | deterministischer Parameterwitness | Node |
| SWP-09 | 9 / 9, 16 | O-14 | Node |
| SWP-10 | 8 / 8, 16 | Pflege-Flex-/Floor-Paritaet | Node |
| SWP-11 | 7 / 7, 16 | O-11 | Node |
| OPT-01 | 10 / 10, 16 | O-15 | Node + Browser |
| OPT-02 | 11 / 9, 11 | O-21 | Node |
| OPT-03 | 10 / 10, 15 | O-20 | Node |
| OPT-04 | 10 / 3, 10 | O-08, O-15 | Node + Browser |
| OPT-05 | 10, 15 / 10, 15 | Modellstatus-Witness | Node |
| OPT-06 | 11 / 11 | O-21 | Node |
| OPT-07 | 11 / 11, 16 | O-21 plus Quantilselector-Witness | Node |
| OPT-08 | 11 / 9, 11 | O-21 plus Missing-Drawdown-Witness | Node |
| SIM-01 | 6 / 6, 9 | O-22 | Node |
| SIM-02 | 6 / 6, 16 | O-10 | Node |
| SIM-03 | 6 / 6, 16 | O-22 | Node |
| SIM-04 | 6 / 6, 16 | O-22 | Node |
| SIM-05 | 6 / 6, 16 | O-22 | Node |
| SIM-06 | 6 / 6, 15 | O-22 | Node |
| SIM-07 | 10 / 10 | O-20 | Node |
| IMP-01 | 12 / 12, 16 | O-16 | Node |
| IMP-02 | 12 / 12, 16 | O-17 | Node |
| IMP-03 | 12, 15 / 12, 15 | O-17 | Node |
| PER-01 | 13 / 13, 14 | O-18 | Node + Browser |
| PER-02 | 13 / 13, 16 | O-18 plus typisierter Pflege-/Balance-State | Node + Browser |
| PER-03 | 13 / 4, 13 | O-18 plus korrupter Profilverbund | Node + Browser |
| PER-04 | 14 / 14 | O-18 plus atomarer Import-/Rollback-Witness | Node + Browser |
| PER-05 | 14 / 14, 16 | Vollbackup-Preflight plus Full-Recovery-Browserwitness | Node + Browser |
| PER-06 | 14 / 5, 14 | Inflationsfaktor-Domaincontract | Node |
| MOD-01 | 15 / 15, 16 | Architektur-Evidenzcontract | Node |
| MOD-02 | 15 / 15, 16 | Architektur-Evidenzcontract | Node |
| MOD-03 | 15 / 15, 16 | Architektur-Evidenzcontract | Node |
| MOD-04 | 15 / 15, 16 | Architektur-Evidenzcontract | Node |
| MOD-05 | 15, 16 / 15, 16 | Modellmatrix-Witness | Node |
| MOD-06 | 15, 16 / 15, 16 | Modellmatrix-Witness | Node |
| MOD-07 | 15, 16 / 15, 16 | Modellmatrix-Witness | Node |
| MOD-08 | 15, 16 / 15, 16 | Nutzerseitiger Modellstatus-Witness | Node |
| QA-01 | 16 / Orakelbestand | O-01 bis O-22 | Node + Browser |
| QA-02 | 16 / Coverage-Inventar | fail-closed Coverage-Dateigate | Node |

Damit stehen insbesondere die zuvor in keinem Slice-Dokument genannten
OPT-07, IMP-02, PER-02, PER-05, QA-01 und QA-02 jetzt mit konkretem Nachweis im
Abschluss-Slice.

### Invarianten-Traceability nach G-02

| Invariante | Maschinenpruefbare Abbildung | Gate |
| --- | --- | --- |
| I-01 Preview ist nicht Commit | O-01, O-02 | Node + Browser |
| I-02 Eine finale Aktion | O-03, O-04 | Node + Browser |
| I-03 Bestands- und Geldinvarianten | O-03, O-04, O-09, O-10 | Node + Browser |
| I-04 Kanonische Zahlengrenze | O-05, O-08, O-10, O-22 | Node |
| I-05 Profilaggregation erhaelt Werte und Provenienz | O-06, O-07, O-18 | Node + Browser |
| I-06 Parameterfidelity | O-11, O-12, O-13, O-15, O-20, O-21 | Node + Browser |
| I-07 Ergebnis- und Missingness-Semantik | O-14, O-21, O-22 | Node |
| I-08 Import und Recovery | O-16, O-17, O-18 plus zwei direkte Fault-Injection-Witnesses | Node + Browser |

Das Inventar darf fuer keine Invariante leer sein. Jeder referenzierte
Oracle-Identifier muss im O-01-bis-O-22-Inventar existieren; direkte Witnesses
muessen Datei, Marker und das vom Test-Runner tatsaechlich verwendete Gate
treffen.

### Durchgefuehrte Korrekturen

1. G-01:
   - Das versionierte Inventar fuehrt jetzt alle 65 Ausgangsbefunde in
     Planreihenfolge mit Fix-/Nachweisslices und mindestens einem Orakel oder
     direkten Witness.
   - Die vorhandene V1-Struktur wird additiv erweitert; alle bisherigen
     Oracle-, Browser-, Paritaets-, Parameter- und Deltafelder bleiben
     unveraendert, sodass bestehende V1-Leser die neuen Top-Level-Felder
     weiterhin ignorieren koennen.
   - Der Contract liest das Findings-Register und die vollstaendige
     Traceability-Tabelle direkt aus dem Hauptplan. Inventar und Plan duerfen
     nicht getrennt fortgeschrieben werden.
   - Die exakt 38 im Hauptplan Slice 16 zugeordneten Ergaenzungsnachweise
     bilden eine eigene fail-closed Assertion.
   - Die sechs zuvor in keinem Slice-Dokument genannten IDs OPT-07, IMP-02,
     PER-02, PER-05, QA-01 und QA-02 sind jetzt in diesem Dokument und im
     Inventar enthalten.
2. G-02:
   - I-01 bis I-08 stehen als eigene Inventarsektion mit exaktem Plantitel und
     konkreten Orakel-/Witness-Zuordnungen zur Verfuegung.
   - Der Contract liest die acht Invarianten direkt aus dem Hauptplan, prueft
     Reihenfolge und Titel und loest jeden Oracle-Identifier sowie jeden
     direkten Witness bis zum realen Gate auf.
3. G-03:
   - Der Node-Roundtrip erzeugt Zieljahr, Stichtag, CSV-Zeilen, Dateiname und
     Erwartungen aus dem tatsaechlich abgeschlossenen Kalenderjahr.
   - Der Browser-Roundtrip liest dasselbe Jahr aus dem Browserkontext, in dem
     auch der Produktcode den Import validiert.
   - Die fruehere feste Zeichenkette 2025 wurde in beiden Roundtrips entfernt;
     der Test wurde zusaetzlich mit auf 2030-05-05 eingefrorener Node-Uhr
     ausgefuehrt.
4. `tests/README.md` beschreibt Findings- und Invarianten-Traceability als
   verbindlichen Bestandteil des Integrationscontracts.

Es wurden keine Produktivdatei, kein Engine-Modul, kein Worker, kein
generiertes Artefakt und kein Releasebestand geaendert.

### Ausgefuehrte Tests

| Gate | Ergebnis |
| --- | --- |
| `node tests/run-single.mjs tests/suite-data-integration-contract.test.mjs` | 1.066/1.066 Assertions, 0 Fehler |
| `node tests/run-single.mjs tests/balance-ui-orchestration.test.mjs` | 238/238 Assertions, 0 Fehler |
| derselbe Balance-Test mit eingefrorener Uhr `2030-05-05` | 238/238 Assertions, 0 Fehler |
| `npm test` | 9.892/9.892 Assertions, 137 Testdateien, 0 Fehler, 0 offene Handles |
| `npm run test:browser` | 27/27 Browserfaelle, 0 Fehler |
| `npm run docs:evidence` | gruen; 69 MKT, 55 FOR, 17 MAP, 10 Matrixtermine |
| Syntaxchecks der drei geaenderten `.mjs`-Dateien | gruen |
| JSON-Parse und Inventarzaehlung | 22 Orakel, 65 Findings, 8 Invarianten, 38 Slice-16-Ergaenzungsnachweise |
| `git diff --check` | gruen |

### Review-Antworten von Codex auf das Gesamtreview

- G-01: technisch angenommen und wie oben maschinenpruefbar nachgebessert.
- G-02: technisch angenommen und wie oben maschinenpruefbar nachgebessert.
- G-03: technisch angenommen; die Kalenderfalle ist fuer Node und Browser
  entfernt und mit einem zukuenftigen Datum nachgemessen.
- G-04 bis G-10: nicht veraendert. Claude und Gemini fuehren diese Punkte als
  Restrisiken, nicht als Blocker. Ihre Behandlung benoetigt einen separaten
  Scope beziehungsweise die dort genannten Fachentscheidungen.

### Review-Entscheidungen der Gesamtreview-Nachbesserung

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| G-01 | Claude/Gemini | 38 Slice-16-Nachweise und Gesamtabbildung der 65 Befunde fehlen | angenommen | Plan-gekoppeltes Inventar, Contract und lesbare Tabelle ergaenzt |
| G-02 | Claude/Gemini | I-01 bis I-08 besitzen keine Abnahmeabbildung | angenommen | exakte Plantitel sowie Oracle-/Witness-/Gate-Mapping ergaenzt |
| G-03 | Claude/Gemini | feste CSV-Jahresfixture kippt ab 2027 | angenommen | beide Roundtrips kalenderrelativ; 2030-Witness gruen |
| G-04 bis G-10 | Claude/Gemini | bestaetigte Restrisiken | separater Scope | unveraendert und weiterhin offen |

### Freigabestatus der Gesamtreview-Nachbesserung

Technisch nachgebessert. Die formale Feststellung, ob G-01 bis G-03 geschlossen
sind und das Gesamtvorhaben abgeschlossen werden kann, bleibt dem unabhaengigen
Re-Review durch Claude/Gemini beziehungsweise dem Nutzer vorbehalten. Codex
erteilt keine eigene Freigabe. Commit und Push stehen aus.
