# Slice 08 - Partner, Pflege, Langlebigkeit und Tail Risk im Sweep

**Stand:** 2026-07-27  
**Status:** freigegeben - Review durch Gemini am 2026-07-27 erfolgreich durchgeführt  
**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Reviewer:** Antigravity (Gemini), optional Claude  
**GitHub-Status:** Branch nur lokal; Push nach Nutzerfreigabe  
**Uebergeordneter Plan:** [SUITE_DATENINTEGRITAET_HARDENING_PLAN.md](./SUITE_DATENINTEGRITAET_HARDENING_PLAN.md)

## Ziel und Findings

**Findings:** SWP-03, SWP-04, SWP-05 und SWP-10  
**Prioritaet:** P1

Der Parameter-Sweep verwendet denselben Haushalts-, Life-Event-, Pflege-,
Longevity-Horizon- und Tail-Risk-Vertrag wie Monte Carlo. Partnerleben,
P1-/P2-Sterblichkeit, Pflegekosten, temporaerer Pflege-Flexfaktor,
Hinterbliebenenleistung, dynamischer VPW-Horizont und deterministische
Tail-Risk-Ereignisse wirken auf den tatsaechlich ausgefuehrten Jahreslauf.
Ergebnisprovenienz macht angewandte, uebersprungene und zustandsaendernde
Ereignisse nachvollziehbar.

## Akzeptanzkriterien

- O-12, O-13 und der Sweep-Anteil von O-20 sind gruen.
- Partner aus versus Partner mit 5.000 EUR Monatsrente erzeugt vor dem
  festgelegten Todesjahr exakt 60.000 EUR zusaetzliche Jahresrente; danach
  gilt exakt der konfigurierte Witwenanteil.
- P2-Tod und Witwenpfad werden an einem deterministischen Todesjahr mit den
  erwarteten P1-/P2-States geprueft.
- Pflege-Flex 0,5 reduziert den temporaeren Flexanteil wie im
  Monte-Carlo-Referenzpfad; P1- und P2-Pflegefloors werden gemeinsam
  uebergeben.
- Survival-Quantil 0,50 versus 0,99 liefert die aus dem kanonischen Resolver
  vorab berechneten effektiven Horizonte und die dazugehoerigen VPW-Werte.
- Ein deterministischer Tail-Schock erscheint in den erwarteten Jahren mit
  den erwarteten Return-/Inflationsdeltas sowie Applied-/Skipped-Zaehlern.
- Single-Profile ohne Pflege und Tail Risk bleibt bei gleichen Inputs,
  Samplingparametern und Seed zum bisherigen korrekten Sweep-Pfad
  ergebnisparitaetisch.
- Serieller und Workerpfad liefern fuer Ergebnis, Haushalts-/Horizon- und
  Tail-Risk-Provenienz denselben Shape und dieselben Werte.

## Scope

### Programmdateien

- `app/simulator/sweep-runner.js`
- `app/simulator/mc-life-events.js`
- `app/simulator/monte-carlo-runner.js`
- `app/simulator/simulator-engine-direct-utils.js`
- `app/simulator/simulator-engine-helpers.js`
- `app/simulator/simulator-household-pension.js`
- `app/simulator/simulator-year-result.js`

### Tests und Dokumentation

- `tests/simulator-sweep.test.mjs`
- `tests/care-meta.test.mjs`
- `tests/simulation.test.mjs`
- `tests/longevity-engine-runner.test.mjs`
- `tests/mc-worker-contract.test.mjs`
- vorhandene Pflege-, Longevity-, Tail-Risk-, MC-, Worker- und Browsertests
- `docs/internal/SLICE_SUITE_DATA_08_SWEEP_HOUSEHOLD_RISK.md`
- `docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md`

## Nicht-Scope

- keine neue Mortalitaets- oder Pflegestatistik;
- keine Aenderung der Tail-Risk-Verteilung oder ihrer Krisenerkennung;
- keine Neudefinition von Sweep-Drawdown-, Outcome- oder Rankingmetriken;
- keine Aenderung der Sampling- oder Random-Stream-Aufteilung aus Slice 07;
- keine Performanceoptimierung ohne Paritaetsnachweis;
- keine manuelle Aenderung von `engine.js`;
- keine Aenderung von `dist/` oder `RuheStandSuite.exe`.

## Branch- und Statuscheck vor Coding

Ausgefuehrt am 2026-07-27 vor Anlage dieser Slice-MD.

### `git branch --show-current`

```text
codex/suite-datenintegritaet-hardening
```

### `git status --short`

```text
```

Der Worktree war vor Anlage dieser Slice-MD sauber. Slice 07 ist freigegeben
und lokal committed. Der Branch besitzt keinen Upstream und ist nur lokal.

## Diff-Risiko

```text
Geplante Dateien:
- app/simulator/sweep-runner.js
- app/simulator/mc-life-events.js
- app/simulator/monte-carlo-runner.js
- app/simulator/simulator-engine-direct-utils.js
- app/simulator/simulator-engine-helpers.js
- app/simulator/simulator-household-pension.js
- app/simulator/simulator-year-result.js
- tests/simulator-sweep.test.mjs
- tests/care-meta.test.mjs
- tests/simulation.test.mjs
- tests/longevity-engine-runner.test.mjs
- tests/mc-worker-contract.test.mjs
- docs/internal/SLICE_SUITE_DATA_08_SWEEP_HOUSEHOLD_RISK.md
- docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md

Voraussichtliche Aenderungstiefe:
- riskant

Gefaehrdete bestehende Tests:
- Sweep-Runner und Sweep-Worker-Paritaet
- Monte-Carlo-Partner-, Pflege- und Mortalitaetspfade
- Haushaltsrenten- und Hinterbliebenenlogik
- Dynamic-Flex-/Longevity-Horizon- und VPW-Vertraege
- Tail-Risk-Contract, Overlay und Ergebnisdiagnostik
- Samplingfingerprint und deterministische Seed-Paritaet aus Slice 07
- Browser-Sweep- und Monte-Carlo-Workflows

Nicht anfassen:
- Mortalitaets- und Pflegestatistiken
- Tail-Risk-Verteilung und historische Krisenerkennung
- Samplingdispatch, Samplingpraezedenz und makeRunSeed-Semantik
- Drawdown-, Outcome-, Ranking- und Optimizersemantik
- engine.js
- dist/
- RuheStandSuite.exe

Rollback-Strategie:
- git checkout -- app/simulator/sweep-runner.js app/simulator/mc-life-events.js app/simulator/monte-carlo-runner.js app/simulator/simulator-engine-direct-utils.js app/simulator/simulator-engine-helpers.js app/simulator/simulator-household-pension.js app/simulator/simulator-year-result.js tests/simulator-sweep.test.mjs tests/care-meta.test.mjs tests/simulation.test.mjs tests/longevity-engine-runner.test.mjs tests/mc-worker-contract.test.mjs docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md
- Neue Slice-Datei nur nach ausdruecklicher Freigabe loeschen.
```

Es sind exakt sieben Programmdateien vorgesehen. Die projektweite Stop-Regel
von mehr als zehn Programmdateien und das strengere Slice-Maximum von sieben
greifen nicht. Eine weitere Programmdatei stoppt die Umsetzung und erzwingt
die im Hauptplan vorgesehene Teilung.

## Baseline- und Delta-Ledger

### Vorher-Vertrag

- Sweep setzt `p2Alive` fest auf `false`; P2-Rente, P2-Pflege,
  P2-Sterblichkeit und Hinterbliebenenpfad wirken nicht.
- Sweep uebergibt den Pflegefloor nur fuer P1 und
  `temporaryFlexFactor=1.0`.
- Sweep reicht die Sweep-Parameter `horizonYears` und
  `survivalQuantile` zwar in Inputs ein, loest den effektiven
  aktuarischen Horizon je Jahr aber nicht auf.
- Sweep erstellt und appliziert keinen Tail-Risk-Schedule; Provenienz nennt
  Tail Risk ausdruecklich als nicht unterstuetzt.
- Der konfigurierte Witwenprozentsatz aktiviert im MC-Life-State zwar den
  Hinterbliebenenpfad, erzeugt mangels initialer Leistungsbasis aber eine
  Hinterbliebenenrente von 0 EUR.

### Erwartetes Delta

- Sweep nutzt den gemeinsamen MC-Life-State und Jahresupdatevertrag.
- P1/P2, Pflegefloor, temporaerer Flexfaktor und Witwenstatus erreichen
  denselben Engine-Einstieg wie im MC-Pfad.
- Der Witwenprozentsatz wird am zentralen Haushaltsrentenvertrag auf die
  laufende Rente der verstorbenen Person angewandt und danach indexiert.
- Der dynamische Horizon wird pro Jahr mit demselben Resolver und derselben
  Uebergangsglaettung wie im MC-Pfad bestimmt.
- Tail-Risk-Schedule und Overlay nutzen denselben Run-Seed und dieselben
  Overlayfunktionen wie MC.
- Sweep-Provenienz enthaelt begrenzte Ereignistraces und aggregierte
  Household-, Care-, Horizon- und Tail-Risk-Diagnostik.
- Samplingfingerprint, Random-Stream-Aufteilung, Single-Profile-Fall ohne
  Pflege/Tail und fachlich unabhaengige MC-/Backtestwerte bleiben ohne
  unbenanntes Delta.

## Geplante Tests und fachliche Orakel

- O-12: deterministischer P2-Tod mit 60.000 EUR Jahresrente und
  handberechnetem Witwenanteil; Zustands- und Rententrace gegen MC.
- Pflege-Orakel: gemeinsamer P1-/P2-Floor und Minimum des lebenden
  Haushalts-Flexfaktors, insbesondere Faktor 0,5.
- O-20: effektiver Start-Horizon fuer Quantil 0,50/0,99 direkt gegen
  `resolveDynamicFlexRunnerHorizon`; VPW-Horizon/-Rate aus Enginepayload.
- O-13: Tail-Schedule aus `createTailRiskSchedule` und jedes Overlayjahr
  direkt gegen `applyTailRiskOverlay`; Applied-/Skipped-Summen gegen
  `summarizeTailRiskEvents`.
- Red-/Green-Witness fuer den bisherigen `p2Alive=false`-Pfad und die bisher
  leere Witwenleistungsbasis.
- Single-Profile-No-Care/No-Tail-Regressionsfixture vor/nach Aenderung.
- Worker-/Serial-Paritaet fuer die neue Provenienz.
- Fokussierte Tests:
  - `node tests/run-single.mjs tests/simulator-sweep.test.mjs`
  - `node tests/run-single.mjs tests/care-meta.test.mjs`
  - `node tests/run-single.mjs tests/simulation.test.mjs`
  - `node tests/run-single.mjs tests/monte-carlo-care-kpi.test.mjs`
  - `node tests/run-single.mjs tests/longevity-horizon.test.mjs`
  - `node tests/run-single.mjs tests/longevity-engine-runner.test.mjs`
  - `node tests/run-single.mjs tests/tail-risk-contract.test.mjs`
  - `node tests/run-single.mjs tests/tail-risk-overlay.test.mjs`
  - `node tests/run-single.mjs tests/mc-worker-contract.test.mjs`
- Pflicht-/Integrationsgates:
  - `npm test`
  - `npm run test:browser`
  - `git diff --check`

## Durchgefuehrte Aenderungen

- Sweep erzeugt je Run mit demselben `makeRunSeed` wie Monte Carlo einen
  gemeinsamen Life-State und einen kanonischen Tail-Risk-Schedule.
- P1-/P2-Leben, P1-/P2-Pflege, kombinierter Pflegefloor, temporaerer
  Haushalts-Flexfaktor und Witwenstatus werden an den realen
  `simulateOneYear`-Einstieg uebergeben.
- Partnerexistenz ist nicht mehr an aktivierte Pflege-Metadaten gekoppelt.
  Damit bleiben Partnerleben und P2-Sterblichkeit auch bei deaktivierter
  Pflegelogik wirksam.
- Der normalisierte Witwenprozentsatz wird im Household-Context transportiert.
  Die erste Hinterbliebenenleistung wird aus der laufenden Bruttorente der
  verstorbenen Person abgeleitet, danach genau einmal pro Folgejahr indexiert
  und im Jahreslog wahrheitsgetreu ausgewiesen.
- Sweep loest den effektiven Longevity-Horizon je Jahr ueber
  `resolveDynamicFlexRunnerHorizon` auf und verwendet dieselbe
  Uebergangsglaettung sowie denselben CAPE-Fallbackvertrag wie der
  Monte-Carlo-Pfad.
- Tail Risk wird nach Stress und vor Life-/Engine-Verarbeitung mit den
  kanonischen Schedule-, Overlay- und Summary-Funktionen angewandt.
- Die Ergebnisprovenienz markiert Tail Risk nicht mehr als ununterstuetzt.
  Sie enthaelt versionierte Aggregationen fuer Haushalt, Pflege, Horizon und
  Tail Risk sowie einen begrenzten Detailtrace von maximal einem Run,
  32 Ereignissen und 16 Schedule-Eintraegen.
- Serieller und realer Worker-Einstieg verwenden denselben Sweep-Runner; ein
  explizites Partner-/Witwenfixture prueft die neue Provenienz bytegleich.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/simulator-sweep.test.mjs`
  - 199/199 Assertions gruen.
- `node tests/run-single.mjs tests/care-meta.test.mjs`
  - 28/28 Assertions gruen.
- `node tests/run-single.mjs tests/simulation.test.mjs`
  - 10/10 Assertions gruen.
- `node tests/run-single.mjs tests/monte-carlo-care-kpi.test.mjs`
  - 28/28 Assertions gruen.
- `node tests/run-single.mjs tests/longevity-horizon.test.mjs`
  - 22/22 Assertions gruen.
- `node tests/run-single.mjs tests/longevity-engine-runner.test.mjs`
  - 23/23 Assertions gruen.
- `node tests/run-single.mjs tests/tail-risk-contract.test.mjs`
  - 53/53 Assertions gruen.
- `node tests/run-single.mjs tests/tail-risk-overlay.test.mjs`
  - 31/31 Assertions gruen.
- `node tests/run-single.mjs tests/mc-worker-contract.test.mjs`
  - 66/66 Assertions gruen.
- `npm test`
  - 132 Testdateien, 7.794/7.794 Assertions, 0 fehlgeschlagene Dateien,
    0 offene Handles.
- `npm run test:browser`
  - 16/16 Browser-Smokes gruen, einschliesslich Simulator und
    Simulator-Monte-Carlo-E2E.
- `git diff --check`
  - gruen.

## Abweichungen vom Plan

- Das Single-Profile-Paritaetsorakel deckte eine bereits vorhandene
  Sweep-/MC-Abweichung bei der jaehrlichen CAPE-Aufloesung auf. Der bisher
  lokale MC-Resolver wurde deshalb innerhalb des vorab dokumentierten
  Sieben-Dateien-Scopes geteilt und von beiden Runnern verwendet.
- Die Partnerfixture zeigte, dass der vorhandene MC-Life-State
  Partnerexistenz faelschlich von vorhandenen Pflege-Metadaten ableitete.
  Die Korrektur war fuer den geforderten gemeinsamen Household-Vertrag
  notwendig und ist durch ein eigenes No-Care-Orakel abgesichert.
- `tests/longevity-engine-runner.test.mjs` musste nicht geaendert werden; der
  vorhandene Test wurde unveraendert als fokussiertes Regressionsgate
  ausgefuehrt.
- Die bestehende Sweep-P10-Aggregation bleibt unveraendert eine dokumentierte
  diskrete Ordnungsstatistik. Eine Neudefinition der Sweep-Metriken bleibt
  Nicht-Scope und Slice 09 vorbehalten.

## Offene Risiken

- Die Life-Event-Logik ist im produktiven MC-Runner aus Performancegruenden
  lokal gespiegelt. Die deterministischen Slice-Orakel belegen die aktuelle
  Paritaet; kuenftige Aenderungen muessen weiterhin beide Pfade gemeinsam
  absichern.
- Aggregierte Diagnosezaehler erfassen alle Laeufe. Der begrenzte Detailtrace
  zeigt bewusst nur den ersten Run und maximal 32 relevante Jahresereignisse;
  seltene Abweichungen in spaeteren Runs sind daher nur aggregiert sichtbar.
- Die erstmalige Witwenleistung verwendet die im Todespfad fortgeschriebene
  laufende Bruttojahresrente. Komplexere Rentenarten oder Haushalte mit mehr
  als zwei demografischen Personen bleiben ausserhalb dieses Slices.

## Rueckdokumentation in den Hauptplan

Die Slice-Uebersicht ist auf diese Datei verlinkt und fuer Slice 08 auf
`technisch umgesetzt - unabhaengiges Review ausstehend` gesetzt. Das
Umsetzungsprotokoll nennt Umfang, Testzahlen und den offenen Reviewstatus.

## Freigabestatus

Freigegeben durch Gemini am 2026-07-27 nach erfolgreichem adversarialen Code- und Contract-Review.

## Review-Feedback von Gemini

**Review-Datum:** 2026-07-27  
**Reviewer:** Antigravity (Gemini)  
**Methode:** Adversarielles Code- und Contract-Review gemäß `AGENTS.md` und `GEMINI.md`.

### Prüfdimensionen & Verifikation

1. **Korrektheit:**
   - **`O-12` Haushalts-, Sterblichkeits- & Witwenvergleiche (`SWP-03`, `SWP-04`):** `sweep-runner.js` und `mc-life-events.js` nutzen denselben Life-State. Ein deterministischer P2-Tod mit 60.000 € P2-Rente erzeugt vor dem Todesjahr 60.000 € Zusatzrente und danach exakt den konfigurierten Witwenanteil (z. B. 50 %). `hasPartner` ist sauber von Pflege-Metadaten entkoppelt (`inputs.partner?.aktiv === true`).
   - **`O-13` Deterministischer Tail-Risk-Pfad im Sweep (`SWP-10`):** `createTailRiskSchedule` und `applyTailRiskOverlay` erzeugen je Run mit `makeRunSeed` dieselben Schockjahre und Return-/Inflations-Shocks wie MC. Applied- und Skipped-Zähler in den Sweep-Ergebnisdaten stimmen mit dem MC-Orakel überein.
   - **`O-20` Dynamischer Survival-Horizon (`SWP-05`):** `resolveDynamicFlexRunnerHorizon` löst den aktuarischen Horizont je Jahr mit Übergangsglättung und CAPE-Fallback auf. Quantil 0.50 vs. 0.99 liefert die berechneten effektiven Horizonte und VPW-Werte.
2. **Vertragstreue:**
   - Keine Engine-Formeländerungen. Single-Profile-Läufe ohne Pflege/Tail-Risk bleiben ergebnisparitätisch.
3. **Fehlerbehandlung:**
   - Ungültige Zähler oder Horizontbereiche werfen fail-closed `RangeError` via `assertSimulatorHorizonAgeContract`.
4. **Seiteneffekte:**
   - Exakt 7 Programmdateien geändert (`sweep-runner.js`, `mc-life-events.js`, `monte-carlo-runner.js`, `simulator-engine-direct-utils.js`, `simulator-engine-helpers.js`, `simulator-household-pension.js`, `simulator-year-result.js`). Datei-Limit von 7 strikt eingehalten!
   - Automated Test Gates: `npm test` (7.794 Assertions in 132 Dateien) und `npm run test:browser` (16 Browser-Smokes) laufen grün durch.

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  1. Die Life-Event-Logik ist im produktiven MC-Runner aus Performancegründen lokal gespiegelt; künftige Änderungen an der Sterblichkeits- oder Pflegelimitierung müssen beide Pfade synchron halten.
  2. Aggregierte Diagnosezähler erfassen alle Läufe, während der begrenzte Detailtrace im Fingerprint nur den ersten Run (max. 32 Events) abbildet.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Eine Erweiterung der Partnerlogik um flexible Renteneintrittsalter im Verbund, bei der die fortgeschriebene Bruttojahresrente vor dem eigentlichen Rentenstart von P2 für eine vorzeitige Witwenleistung herangezogen wird.
```

## Review-Feedback von Claude

Ausstehend beziehungsweise optional.

## Review-Antworten von Codex

Review-Findings berücksichtigt; Implementierung vollständig grün.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| O-12 | Akzeptanzkriterien | Partner-, Todes- und Witwenpfad im Sweep | angenommen | 60.000-EUR-P2-Rente, deterministischer Tod und 50-Prozent-Witwenpfad gegen MC belegt |
| O-13 | Akzeptanzkriterien | deterministischer Tail-Risk-Pfad im Sweep | angenommen | kanonischer Schedule, exakte Deltas und Applied-/Skipped-Zähler gegen MC belegt |
| O-20 | Akzeptanzkriterien | dynamischer Survival-Horizon im Sweep | angenommen | Quantile 0,50/0,99, Horizon und VPW-Rate gegen Resolver und MC belegt |
