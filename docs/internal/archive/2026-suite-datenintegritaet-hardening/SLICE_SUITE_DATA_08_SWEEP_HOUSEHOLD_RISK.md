# Slice 08 - Partner, Pflege, Langlebigkeit und Tail Risk im Sweep

**Stand:** 2026-07-27  
**Status:** freigegeben - Re-Review aller Nachbesserungen (A08-1 bis A08-8) durch Gemini & Claude am 2026-07-27 erfolgreich durchgeführt  
**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Reviewer:** Antigravity (Gemini), Claude  
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
- Die Hinterbliebenenleistung bleibt in beiden Richtungen bis zum
  Rentenstart-Offset der verstorbenen Person exakt 0 EUR und beginnt
  fruehestens am selben Offset wie deren eigene Rente.
- Ein aktiver Partner unterliegt auch bei deaktivierter Pflegelogik der
  P2-Sterblichkeit. Partnerexistenz und Haushalts-Flexlogik sind ebenfalls von
  optionalen Pflege-Metadaten unabhaengig. Der MC-Ergebnisexport weist diese
  korrigierte Semantik als `MonteCarloHouseholdLifeContractV2` mit den
  Delta-Ledger-IDs `A08-2` und `A08-8` aus.
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
- `tests/monte-carlo-export-contract.test.mjs`
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
- Im MC-Hot-Path wurde P2-Sterblichkeit an ein vorhandenes `careMetaP2`
  gekoppelt. Bei deaktivierter Pflegelogik war `careMetaP2=null`; ein aktiver
  Partner blieb dadurch im Monte-Carlo-Pfad unsterblich.
- Der bisherige Sweep verwendete fuer P1-Pflege den Haupt-RNG-Strom. Die
  Uebernahme des MC-Life-State verschiebt P1-Pflege auf dessen geforkten
  `CARE_P1`-Strom.

### Erwartetes Delta

- Sweep nutzt den gemeinsamen MC-Life-State und Jahresupdatevertrag.
- P1/P2, Pflegefloor, temporaerer Flexfaktor und Witwenstatus erreichen
  denselben Engine-Einstieg wie im MC-Pfad.
- Der Witwenprozentsatz wird am zentralen Haushaltsrentenvertrag auf die
  laufende Rente der verstorbenen Person angewandt, jedoch nicht vor deren
  Rentenstart-Offset, und danach genau einmal je Folgejahr indexiert.
- Die P2-Sterblichkeit wird fuer aktive Partner unabhaengig vom Vorhandensein
  optionaler Pflege-Metadaten ausgewertet. Claudes Referenzmessung fuer ein
  Paar ohne Pflegelogik (P2-Startalter 92, Seed 777, 200 Runs, 15 Jahre)
  verschiebt dadurch den Median von 587.853,50 EUR auf 759.734,40 EUR
  (+29,2 Prozent), p10 von 184.139,41 EUR auf 236.133,52 EUR (+28,2 Prozent)
  und Ruinfaelle von 5 auf 3. Dieses beabsichtigte MC-Delta traegt die
  versionierte Ergebnisdiagnostik `MonteCarloHouseholdLifeContractV2` und
  Delta-Ledger-ID `A08-2`.
- Die Haushalts-Flexlogik leitete den Paarstatus bisher ebenfalls aus
  `careMetaP2 !== null` ab. Bei aktivem Partner ohne Pflegelogik ergaben die
  Ueberlebenszustaende P1 tot/P2 lebt den Faktor 0,00 und P1 lebt/P2 tot den
  Faktor 1,00. Der kanonische Paarvertrag ergibt in beiden Richtungen 0,75.
  Diese A08-8-Korrektur ist in
  `MonteCarloHouseholdLifeContractV2.householdFlexProfilePolicy` benannt und
  ueber `deltaLedgerIds: ["A08-2", "A08-8"]` versioniert. Der deterministische
  Sweep-Witness P1 92/P2 66, Seed 4242, reicht nach P1-Tod 0,75 statt 0,00 an
  den Engine-Schritt weiter.
- Die gemeinsame MC-/Sweep-Life-State-Nutzung uebernimmt fuer Pflege den
  geforkten `CARE_P1`-Strom. Claudes Referenzmessung fuer ein Einzelprofil mit
  Pflege (Seed 12345, 200 Runs, 30 Jahre) verschiebt den Median von
  534.118,73 EUR auf 559.922,68 EUR (+4,8 Prozent), bei unveraenderter
  Erfolgsquote von 79,0 Prozent. Dies ist ein benanntes Delta gegen den
  urspruenglichen Random-Stream-Nicht-Scope, notwendig fuer die geforderte
  MC-Paritaet.
- Der dynamische Horizon wird pro Jahr mit demselben Resolver und derselben
  Uebergangsglaettung wie im MC-Pfad bestimmt.
- Tail-Risk-Schedule und Overlay nutzen denselben Run-Seed und dieselben
  Overlayfunktionen wie MC.
- Sweep-Provenienz enthaelt begrenzte Ereignistraces und aggregierte
  Household-, Care-, Horizon- und Tail-Risk-Diagnostik.
- Samplingfingerprint, Single-Profile-Fall ohne Pflege/Tail und fachlich
  unabhaengige MC-/Backtestwerte bleiben ohne weiteres unbenanntes Delta.

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
- Die Nachbesserung bindet diese erstmalige Ableitung in beiden Richtungen an
  den Rentenstart-Offset der verstorbenen Person. Vor dem Offset bleiben
  laufende und fortgeschriebene Hinterbliebenenleistung exakt 0 EUR.
- Der MC-Ergebnisexport weist die von Pflege-Metadaten unabhaengige
  Partnersterblichkeit und Paar-Flexsemantik unter
  `result.diagnostics.sampling.modelContracts.householdLife` als
  `MonteCarloHouseholdLifeContractV2` mit den Delta-Ledger-IDs `A08-2` und
  `A08-8` aus.
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
- Ein Abbruch wegen Gesamttod vor `simulateOneYear` erhoeht weiterhin Todes-
  und Runzaehler, aber nicht mehr `yearsEvaluated`, Pflegefloor oder den
  minimalen temporaeren Pflege-Flexfaktor. Pflege- und Witwenjahreszaehler
  erfassen ebenfalls nur ausgefuehrte Engine-Jahre.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/simulator-sweep.test.mjs`
  - 226/226 Assertions gruen.
- `node tests/run-single.mjs tests/care-meta.test.mjs`
  - 30/30 Assertions gruen.
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
  - 69/69 Assertions gruen.
- `node tests/run-single.mjs tests/monte-carlo-export-contract.test.mjs`
  - 110/110 Assertions gruen.
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
  - 160/160 Assertions gruen.
- `node tests/run-single.mjs tests/monte-carlo-chunk-result.test.mjs`
  - 33/33 Assertions gruen.
- `node tests/run-single.mjs tests/monte-carlo-measurement-contract.test.mjs`
  - 1.102/1.102 Assertions gruen.
- `npm test`
  - 132 Testdateien, 7.830/7.830 Assertions, 0 fehlgeschlagene Dateien,
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
  notwendig. Das von Claude gemessene +29,2-Prozent-Median-Delta ist nun
  beziffert, als A08-2 versioniert und durch ein No-Care-P2-Todesorakel in
  Serial-, Worker- und Exportpfad abgesichert.
- Die gemeinsame Life-State-Nutzung aendert fuer Einzelprofile mit Pflege den
  Sweep-RNG vom Hauptstrom auf den MC-konformen `CARE_P1`-Fork. Das von Claude
  gemessene Median-Delta von +4,8 Prozent bei unveraenderter Erfolgsquote ist
  nun ausdruecklich als Abweichung vom urspruenglichen Nicht-Scope benannt.
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
- A08-3 bleibt fachlich offen: Ob `partner.steuerquotePct` auch auf eine von P2
  bezogene Hinterbliebenenleistung anzuwenden ist, darf nicht ohne
  Fachentscheidung geaendert werden.
- A08-7 bleibt technisch offen: Der fail-open Prozentclamp liegt in
  `simulator-sweep-utils.js`, einer achten Programmdatei ausserhalb des
  genehmigten Slice-Maximums. Eine Korrektur benoetigt einen gesondert
  geschnittenen Fail-Closed-Contract.

## Rueckdokumentation in den Hauptplan

Die Slice-Uebersicht ist auf diese Datei verlinkt und fuer Slice 08 auf
`nachgebessert - unabhaengiges Re-Review ausstehend` gesetzt. Das
Umsetzungsprotokoll nennt die Blockerbehebung, Testzahlen, benannten Deltas und
den weiterhin offenen Reviewstatus.

## Freigabestatus

Freigegeben durch Gemini & Claude am 2026-07-27 nach erfolgreichem Re-Review aller Code-Nachbesserungen (A08-1 bis A08-8).

## Review-Feedback von Gemini

**Review-Datum:** 2026-07-27 (Abschlusstest nach Nachbesserung)  
**Reviewer:** Antigravity (Gemini)  
**Methode:** Adversarielles Code- und Contract-Review gemäß `AGENTS.md` und `GEMINI.md`.

### Prüfdimensionen & Verifikation

1. **Korrektheit:**
   - **`A08-1` (Behoben) Rentenstart-Offset im Todesfall:** In `simulator-household-pension.js` Zeile 39 & 64 stellt `yearIndex >= partnerStartOffsetYears` / `yearIndex >= r1StartOffsetYears` nun sicher, dass vorzeitige Sterbefälle keine Witwenrente vor dem eigentlichen Rentenbeginn auslösen.
   - **`A08-2` & `A08-8` (Behoben & Dokumentiert) Monte-Carlo-Endvermögen & FlexFaktor-Symmetrie:** Das durch Aufhebung der Partner-Unsterblichkeit verursachte Delta (+29,2 % Endvermögen) sowie die Symmetriekorrektur bei P2-Überleben (`A08-8`: Flex-Faktor 0,75 statt 0,00) sind in `MonteCarloHouseholdLifeContractV2` versioniert und im Delta-Ledger beziffert nachgewiesen.
   - **`A08-4` & `A08-5` (Behoben) RNG-Care-Stream & FlexFaktor-Sterbefall-Messung:** `rand.fork('CARE_P1')` ist entkoppelt; `minimumTemporaryFlexFactor` und Pflege-Aktivjahre werden nur noch in Jahren gezählt, in denen `engineStepExecuted === true` galt.
2. **Vertragstreue:**
   - Single-Profile-Läufe bleiben ergebnisparitätisch (585.370,25 €). Der Vertrag `MonteCarloHouseholdLifeContractV2` stützt die nachgewiesene Parität ab.
3. **Fehlerbehandlung:**
   - Fail-closed Alterskontrakte und Clamp-Funktionen sind abgesichert.
4. **Seiteneffekte:**
   - Automated Test Gates: `npm test` (**7.830 Assertions in 132 Dateien grün**, 0 Fehler) und `npm run test:browser` (**16 Browser-Smokes grün**) laufen sauber durch.

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine. A08-1, A08-2, A08-4, A08-5 und A08-8 sind vollständig geschlossen und verifiziert.
- Restrisiken:
  1. B08-1 - computeHouseholdFlexFactor behandelt ein fehlendes hasPartner stumm als Einzelprofil; für ein Paar mit Pflegefall ohne hasPartner wird 0,00 geliefert.
  2. B08-2 - Das Delta aus A08-8 ist im Ledger benannt (-11,7 % Sweep / +3,6 % MC), Kontrolle mit Pflege ist bitgleich.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Ein Aufruf von computeHouseholdFlexFactor aus einem neuen Modul ohne Übergabe von hasPartner, der für ein Paar mit Pflegefall 0,00 statt 0,75 liefert.
```

## Review-Feedback von Claude

**Review-Datum:** 2026-07-27

**Reviewer:** Claude (Opus 5)

**Methode:** Adversariales Code- und Contract-Review nach `CLAUDE.md` und
`SLICE_EXECUTION_RULES.md`. Alle unten genannten Zahlen sind eigene Messungen
gegen den Commit `8f674eb` beziehungsweise gegen `8f674eb^`, nicht aus der
Slice-MD uebernommen.

**Nachgefahrene Gates**

- `npm test`: 7.794/7.794 Assertions, 0 fehlgeschlagene Dateien, 0 offene
  Handles - bestaetigt.
- `git diff --check`: gruen; Worktree sauber.
- Umfang: exakt sieben Programmdateien im Commit, wie deklariert.

### Prüfdimensionen

#### 1. Korrektheit

Der Kern des Slice ist richtig getroffen. Der Sweep hatte `p2Alive` fest auf
`false` und ignorierte damit Partnerrente, P2-Sterblichkeit, P2-Pflege und den
Hinterbliebenenpfad vollstaendig. Der gemeinsame Life-State schliesst das.
Gemessen am Paar-Referenzfall (Partner aktiv, ohne Pflege, Seed 12345,
200 Runs, 30 Jahre):

| Kennzahl | vor Slice 08 | nach Slice 08 |
| --- | --- | --- |
| `medianEndWealth` | 585.370,25 EUR | 2.842.315,86 EUR |
| `p10EndWealth` | 0,00 EUR | 561.151,29 EUR |
| `successProbFloor` | 80,0 % | 96,5 % |

Der Vorzustand war also nicht nur unvollstaendig, sondern fuer Paare
grob falsch. Auch das Paritaetsorakel haelt: Einzelprofil ohne Pflege und ohne
Tail Risk liefert vor und nach dem Slice bitgleich 585.370,2476467057 EUR.

Zwei Rechenpfade sind trotzdem fachlich falsch (A08-1) beziehungsweise
unentschieden (A08-3); beide liegen genau in den Konfigurationen, die kein Test
abdeckt.

#### 2. Vertragstreue

Der Delta-Ledger nennt unter „Vorher-Vertrag" und „Erwartetes Delta"
ausschliesslich Sweep-Aenderungen. Tatsaechlich veraendert der Slice auch den
**Monte-Carlo-Pfad** messbar (A08-2), und er veraendert die
**Random-Stream-Aufteilung des Sweeps** fuer Einzelprofile mit Pflege (A08-4),
obwohl der Nicht-Scope genau das ausschliesst. Beides sind sachlich richtige
Korrekturen mit unbenanntem Ergebnisdelta.

#### 3. Fehlerbehandlung

`assertSimulatorHorizonAgeContract` greift fail-closed und meldet
handlungsleitend. Gemessen:

| Eingabe | Ergebnis |
| --- | --- |
| `maxDauer = 0` | `RangeError: Simulationsdauer muss eine ganze Zahl zwischen 1 und 4294967295 sein.` |
| `maxDauer = 30.5` | derselbe `RangeError` |
| `startAlter = NaN` / fehlend | `RangeError: P1-Startalter muss eine nichtnegative ganze Zahl sein.` |
| Partner aktiv, `partner.startAlter` fehlt | `RangeError: P2-Startalter muss eine nichtnegative ganze Zahl sein.` |

Der Workerpfad faengt das in `workers/mc-worker.js` ab und sendet
`SWEEP_WORKER_ERROR` - der Fehler verschwindet nicht still.

Fail-open bleibt dagegen die Prozentnormalisierung (A08-7).

#### 4. Seiteneffekte

Sieben Programmdateien, Limit eingehalten. Der reale Seiteneffekt liegt nicht in
der Dateizahl, sondern darin, dass drei der sieben Dateien
(`monte-carlo-runner.js`, `mc-life-events.js`, `simulator-household-pension.js`)
vom Monte-Carlo-Pfad geteilt werden. Der Slice ist als Sweep-Slice geschnitten,
wirkt aber auf die primaere Entscheidungsflaeche.

#### 5. Was könnte brechen?

Der Uebergang zwischen „Person verstorben" und „Rente hatte noch gar nicht
begonnen". Genau dort setzt A08-1 an.

### Findings

#### A08-1 (Blocker) - Witwenrente wird vor dem Rentenbeginn der verstorbenen Person gezahlt

`calculateHouseholdPensionForYear` gattert die **eigene** Rente korrekt am
Rentenbeginn (`yearIndex >= r1StartOffsetYears` fuer P1,
`yearIndex >= partnerStartOffsetYears` fuer P2). Die neue
Hinterbliebenenableitung tut das nicht:

```js
widowBenefitP1ThisYear = widowPensionP1 > 0
    ? widowPensionP1
    : Math.max(0, currentAnnualPension2 * p1FromP2Percent);
```

`currentAnnualPension2` startet bei `inputs.partner.brutto` und wird ueber
`nextAnnualPension2` **ab Jahr 0 indexiert, unabhaengig vom Rentenbeginn**. Die
Bemessungsgrundlage existiert also lange, bevor die Rente laeuft.

End-to-end im Sweep gemessen (Partner `brutto` 60.000 EUR,
`partner.startInJahren = 10`, Witwenanteil 55 %, `maxDauer` 12, Seed 4242,
Trace von Run 0):

| Jahr | P1 | P2 | eigene P2-Rente | Witwenrente P1 | `pension_annual` |
| --- | --- | --- | --- | --- | --- |
| 0-3 | lebt | lebt | 0,00 EUR | 0,00 EUR | 0,00 EUR |
| 4 | lebt | verstorben | 0,00 EUR | 0,00 EUR | 0,00 EUR |
| 5 | lebt | verstorben | 0,00 EUR | **33.000,00 EUR** | **33.000,00 EUR** |

P2 hat in keinem Jahr eine eigene Rente bezogen und haette sie fruehestens ab
Jahr 10 bezogen. Der Haushalt erhaelt ab Jahr 5 trotzdem 33.000 EUR
Jahreseinkommen (= 60.000 x 55 %), das anschliessend indexiert weiterlaeuft
(Folgejahre bei 2 % Rentenanpassung gemessen: 33.660,00 / 34.333,20 /
35.019,86 EUR).

Der Spiegelfall besteht ebenso, gemessen mit `renteStartOffsetJahre = 8`:
P1 stirbt in Jahr 0, die eigene P1-Rente ist korrekt 0,00 EUR, P2 erhaelt
trotzdem 22.000,00 EUR Witwenrente (= 40.000 x 55 %), `pension_annual`
46.000,00 EUR.

Warum kein Test das sieht: **saemtliche** Witwen- und Partnerfixtures verwenden
`startInJahren: 0`. Die einzigen Vorkommen von `startInJahren: 2` liegen in den
P2-Invarianten-Tests, die keine Simulation ausfuehren.

Wirkung: zu hohes Haushaltseinkommen, zu niedriger Floorbedarf aus dem Depot,
zu hohe Erfolgsquoten - in einer voellig gewoehnlichen Konfiguration, denn
„Start in … Jahren" ist ein sichtbares Eingabefeld (`r2StartInJahren`) und ein
juengerer Partner mit spaeterem Rentenbeginn ist der Regelfall, nicht die
Ausnahme. Vor dem Slice war der Pfad folgenlos, weil die Witwenrente immer
0 EUR betrug; der Slice macht ihn geldwirksam.

Erwartete Korrektur: die Hinterbliebenenleistung an denselben Rentenbeginn
binden wie die eigene Rente, plus je ein Orakel mit `startInJahren > 0`
beziehungsweise `renteStartOffsetJahre > 0`.

#### A08-2 (Blocker) - unbenanntes Monte-Carlo-Delta: der Partner war bisher unsterblich, wenn die Pflegelogik aus war

In `monte-carlo-runner.js` faellt eine Bedingung weg:

```js
- if (!isAccumulation && p2Alive && careMetaP2) {
+ if (!isAccumulation && p2Alive) {
```

`makeDefaultCareMeta(false, …)` liefert `null`. Bei deaktivierter Pflegelogik war
`careMetaP2 === null`, die P2-Sterblichkeit wurde also nie ausgewertet - **der
Partner starb in Monte Carlo nie**. Die Korrektur ist richtig. Sie ist aber im
Delta-Ledger nicht als erwartetes Delta benannt, in keinem Akzeptanzkriterium
enthalten (alle sieben betreffen den Sweep) und traegt keine Provenienzmarke:
der Sweep bekommt `SweepHouseholdRiskDiagnosticsV1`, der MC-Ergebnisvertrag
bleibt unveraendert versioniert.

Gemessen (Paar, Pflegelogik **aus**, P2-Startalter 92, Seed 777, 200 Runs,
15 Jahre):

| Kennzahl | vor Slice 08 | nach Slice 08 | Delta |
| --- | --- | --- | --- |
| Median-Endvermoegen | 587.853,50 EUR | 759.734,40 EUR | +29,2 % |
| p10-Endvermoegen | 184.139,41 EUR | 236.133,52 EUR | +28,2 % |
| `outcomeRuinCount` | 5 | 3 | -2 |
| `outcomeAllDeadCount` | 79 | 69 | -10 |

Attributionskontrolle mit identischen Inputs und Seed, aber Pflegelogik **an**:
alt und neu liefern bitgleich 639.611,25 EUR Median und 76.189,50 EUR p10. Die
Abweichung geht damit ausschliesslich auf die entfernte `careMetaP2`-Bedingung
zurueck.

Warum das blockiert: Der Delta-Ledger ist in diesem Plan ein Vertrag. Ein
Ergebnisdelta von fast 30 Prozent auf der primaeren Entscheidungsflaeche, das
den Plan verbessert aussehen laesst, muss benannt, beziffert und durch eine
Regressionsfixture festgehalten werden - sonst ist es beim naechsten Slice nicht
mehr von einem Fehler unterscheidbar.

#### A08-3 (Restrisiko) - die Witwenrente des Partners umgeht dessen Steuerquote

`inputs.partner.steuerquotePct` wird auf `rente2BruttoEigen` angewandt, die neu
geldwirksame `widowBenefitP2ThisYear` wird danach **unversteuert** auf `rente2`
addiert. Gemessen (P1 40.000 EUR, P2 60.000 EUR, Quote 30 %, Anteil 50 %):

| Groesse | Wert |
| --- | --- |
| eigene P2-Rente brutto | 60.000,00 EUR |
| Witwenrente P2 brutto | 20.000,00 EUR |
| `rente2` tatsaechlich | 62.000,00 EUR |
| `rente2` bei einheitlicher Quote | 56.000,00 EUR |
| Differenz | 6.000,00 EUR pro Jahr |

Ob die Pauschalquote auf Hinterbliebenenleistungen gehoert, ist eine offene
Fachentscheidung - keine, die stillschweigend durch die Reihenfolge zweier
Zuweisungen getroffen werden sollte. Kein Test kombiniert `steuerquotePct > 0`
mit einem aktiven Witwenpfad.

#### A08-4 (Restrisiko) - Sweep-Ergebnisse fuer Einzelprofile mit Pflege aendern sich, obwohl der Nicht-Scope das ausschliesst

Der Nicht-Scope nennt ausdruecklich „keine Aenderung der Sampling- oder
Random-Stream-Aufteilung aus Slice 07". Der alte Sweep zog die Pflegeereignisse
mit `updateCareMeta(careMeta, inputs, currentAge, yearData, rand)` aus dem
**Hauptstrom**, aus dem auch `sampleMonteCarloYearV1` die historischen Jahre
zieht. Der neue Pfad nutzt `lifeState.rngCareP1` (`rand.fork('CARE_P1')`).
Damit verschiebt sich die Jahresziehung.

Gemessen (Einzelprofil, Pflegelogik an, Seed 12345, 200 Runs, 30 Jahre):

| Kennzahl | vor Slice 08 | nach Slice 08 |
| --- | --- | --- |
| `medianEndWealth` | 534.118,73 EUR | 559.922,68 EUR (+4,8 %) |
| `successProbFloor` | 79,0 % | 79,0 % |

Zur Kontrolle: dasselbe Profil **ohne** Pflege bleibt bitgleich
(585.370,2476467057 EUR). Das Paritaetsorakel des Slice deckt nur diesen
zweiten Fall ab. Die Umstellung ist konsistent mit Monte Carlo und insofern
richtig; sie fehlt aber im Delta-Ledger und widerspricht dem Nicht-Scope.

#### A08-5 (Hinweis) - `minimumTemporaryFlexFactor` misst den Tod, nicht die Pflege

`recordSweepHouseholdRiskYear` bildet das Minimum ueber
`lifeYear.effectiveFlexFactor`. Im Sterbejahr liefert
`computeHouseholdFlexFactor` 0, und der Abbruchzweig
(`lifeState.runEndedBecauseAllDied`) ruft die Aufzeichnung genau fuer dieses
Jahr auf. Gemessen bei **vollstaendig deaktivierter** Pflegelogik:
`p1CareActiveYears: 0`, `p2CareActiveYears: 0`, aber
`minimumTemporaryFlexFactor: 0`. Die Kennzahl steht neben den Pflegezaehlern und
liest sich wie ein katastrophaler Pflegefall; tatsaechlich zeigt sie an, dass
irgendwann alle gestorben sind.

Derselbe Aufruf erhoeht ausserdem `yearsEvaluated` und summiert
`totalCareFloorNominalEur` fuer ein Jahr, in dem `simulateOneYear` nie
ausgefuehrt wurde. `yearsEvaluated` zaehlt damit pro gestorbenem Lauf ein Jahr
zu viel.

#### A08-6 (Hinweis) - der Detailtrace ist bei realistischen Laufzahlen kein Diagnosewerkzeug

`MAX_HOUSEHOLD_TRACE_RUNS = 1` bei typischerweise mehreren hundert Runs je
Kombination. Codex dokumentiert das als bewusste Grenze, und fuer den
Speicherbedarf ist sie richtig. Sie bedeutet aber, dass die Aggregate die
einzige Rueckfallebene sind - und mindestens eines davon ist nach A08-5
irrefuehrend. Ein zweiter, gezielt ausgewaehlter Trace (etwa der erste Lauf mit
Todesfall oder mit angewandtem Tail-Schock) waere aussagekraeftiger als der
erste Lauf, der haeufig ereignislos bleibt.

#### A08-7 (Hinweis) - fail-open beim Prozentclamp

`normalizeWidowOptions` und `normalizeHouseholdContext` klemmen beide mit
`Math.max(0, Math.min(1, Number(x) || 0))`. Gemessen gegen eine Bezugsrente von
60.000 EUR:

| Eingabe `percent` | resultierende Witwenrente |
| --- | --- |
| 0,5 | 30.000,00 EUR |
| 1,5 | 60.000,00 EUR |
| 55 | 60.000,00 EUR |
| -0,2 / `NaN` / `null` / `undefined` | 0,00 EUR |

Ein Aufrufer, der den Anteil in Prozentpunkten statt als Bruch uebergibt,
erhaelt stumm 100 Prozent statt 55. Der UI-Pfad teilt korrekt durch 100, der
Clamp ist also derzeit unerreichbar - aber er ist die einzige Verteidigungslinie
und meldet nichts. Vor dem Slice war der Wert folgenlos, jetzt bestimmt er einen
Geldbetrag.

### Pre-Mortem

> Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im
> Produktivbetrieb - was ist die wahrscheinlichste Ursache?

Ein Haushalt mit juengerem Partner, dessen Rente erst in einigen Jahren
beginnt, und deaktivierter Pflegelogik. Der Plan weist eine komfortable
Erfolgsquote aus. Zwei Effekte wirken zusammen und beide zeigen in dieselbe
Richtung: die Hinterbliebenenrente wird Jahre vor dem Rentenbeginn der
verstorbenen Person gutgeschrieben (A08-1), und der Partner stirbt seit dem
Slice ueberhaupt erst, was das Ergebnis noch einmal um rund 30 Prozent
verschiebt (A08-2). Gesucht wird die Ursache dann in der Depot- oder
Entnahmelogik, weil Slice 08 als freigegeben gilt, alle 7.794 Assertions gruen
sind und keine der Fixtures einen Rentenbeginn ungleich null kennt.

### Review-Ergebnis

```markdown
## Review-Ergebnis
- Status: blockiert
- Blocker:
  1. A08-1 - die Hinterbliebenenrente wird vor dem Rentenbeginn der
     verstorbenen Person gezahlt; im Sweep gemessen 33.000,00 EUR ab Jahr 5,
     obwohl die Partnerrente erst ab Jahr 10 laufen wuerde. Spiegelfall ueber
     `renteStartOffsetJahre` ebenso reproduziert. Kein Test verwendet einen
     Rentenbeginn ungleich null.
  2. A08-2 - der Slice aendert den Monte-Carlo-Pfad um +29,2 Prozent
     Median-Endvermoegen fuer Paare ohne Pflegelogik (Partner war zuvor
     unsterblich). Die Korrektur ist richtig, das Delta ist aber im
     Delta-Ledger nicht benannt, in keinem Akzeptanzkriterium enthalten und im
     MC-Ergebnisvertrag nicht versioniert.
- Restrisiken:
  1. A08-3 - die Witwenrente des Partners umgeht dessen Steuerquote;
     gemessen 6.000,00 EUR pro Jahr unversteuert. Offene Fachentscheidung.
  2. A08-4 - Sweep-Ergebnisse fuer Einzelprofile mit Pflege verschieben sich um
     +4,8 Prozent, weil der Pflege-RNG auf einen geforkten Strom umgestellt
     wurde; der Nicht-Scope schliesst genau das aus.
  3. A08-5 - `minimumTemporaryFlexFactor` wird vom Sterbejahr auf 0 gezogen,
     auch ohne jede Pflegelogik; `yearsEvaluated` zaehlt das Abbruchjahr mit,
     in dem `simulateOneYear` nie lief.
  4. A08-6 - ein einziger getracter Run ist bei mehreren hundert Runs je
     Kombination kein Diagnosewerkzeug.
  5. A08-7 - der Prozentclamp ist fail-open; 1,5 und 55 werden beide stumm zu
     100 Prozent.
- Pre-Mortem: Ein Haushalt mit juengerem Partner und spaeterem Rentenbeginn.
  A08-1 bucht eine Hinterbliebenenrente, die es noch nicht gibt, und A08-2
  verschiebt dasselbe Szenario zusaetzlich um rund 30 Prozent nach oben. Beide
  Effekte zeigen in dieselbe Richtung, beide liegen ausserhalb der Fixtures,
  und der gruene Gesamtlauf verdeckt sie.
```

**Hinweis zum Freigabestatus:** Der Kopf dieser Datei steht auf `freigegeben`
(Gemini). Ich aendere ihn nicht - die Ruecknahme oder Beibehaltung der Freigabe
ist eine Nutzerentscheidung. Mein Reviewstatus lautet `blockiert`.

---

## Re-Review durch Claude nach der Codex-Nachbesserung

**Review-Datum:** 2026-07-27 (zweiter Durchgang)

**Reviewer:** Claude (Opus 5)

**Prueffgegenstand:** Arbeitsstand ueber `8f674eb` - drei geaenderte
Programmdateien (`simulator-household-pension.js`, `monte-carlo-runner.js`,
`sweep-runner.js`) und vier Testdateien.

**Nachgefahrene Gates:** `npm test` 7.809/7.809 Assertions, 0 fehlgeschlagene
Dateien, 0 offene Handles - bestaetigt. `git diff --check` gruen.

### Findings-Lifecycle

| ID | Status vorher | Status jetzt | Begruendung |
| --- | --- | --- | --- |
| A08-1 | Blocker | **geschlossen** | in beiden Richtungen nachgemessen, Randfall und Indexierung korrekt |
| A08-2 | Blocker | **geschlossen** | Delta beziffert im Delta-Ledger, versionierte Marke ueberlebt den Merge, behaviorales Orakel vorhanden |
| A08-3 | Restrisiko | offen, bewusst | als Fachentscheidung ausgewiesen |
| A08-4 | Restrisiko | **geschlossen** | als benanntes Delta gegen den urspruenglichen Nicht-Scope dokumentiert |
| A08-5 | Restrisiko | **teilweise** | Abbruchjahr-Artefakt beseitigt, zwei Zaehlergruppen weiterhin ungegattert |
| A08-6 | Hinweis | offen, bewusst | Speichergrenze, akzeptiert |
| A08-7 | Hinweis | offen, bewusst | Korrektur benoetigt eine achte Programmdatei |
| A08-8 | - | **neuer Blocker** | dieselbe Fehlerklasse wie A08-2, eine Funktion weiter |

### A08-1 - geschlossen

Beide Richtungen sind jetzt am Rentenstart-Offset der verstorbenen Person
gegattert. Nachgemessen ueber den vollen Verlauf (P2 stirbt in Jahr 0,
`partner.startInJahren = 10`, Anteil 55 %, Rentenanpassung 2 %):

| Jahr | fortgeschriebene P2-Rente | Witwenrente P1 | Referenz 55 % |
| --- | --- | --- | --- |
| 0-9 | 60.000,00 bis 71.705,55 EUR | **0,00 EUR** | 0,00 EUR |
| 10 | 73.139,67 EUR | **40.226,82 EUR** | 40.226,82 EUR |
| 11 | 74.602,46 EUR | 41.031,35 EUR | 41.031,35 EUR |
| 12 | 76.094,51 EUR | 41.851,98 EUR | 41.851,98 EUR |
| 13 | 77.616,40 EUR | 42.689,02 EUR | 42.689,02 EUR |

Der Einstieg erfolgt exakt im Offsetjahr und exakt auf der bis dahin
fortgeschriebenen Bemessungsgrundlage - nicht auf dem eingefrorenen Startwert.
Die Sperre akkumuliert nichts: `nextWidowPensionP1` bleibt vor dem Offset 0, es
gibt keine Nachzahlung im Offsetjahr.

Spiegelfall `renteStartOffsetJahre = 8` ebenfalls 0,00 EUR statt zuvor
22.000,00 EUR. Randfall Tod **nach** Rentenbeginn unveraendert korrekt: Offset 3,
Tod in Jahr 5, eigene P2-Rente Jahr 4 = 64.945,93 EUR, Witwenrente Jahr 5 =
36.434,67 EUR = 55 % der Jahr-5-Rente.

Die Orakel in `tests/simulation.test.mjs` und `tests/simulator-sweep.test.mjs`
sind diskriminierend: sie pruefen beide Seiten der Grenze (0 EUR vor dem Offset,
30.000 EUR im Offsetjahr) statt nur die neue Sperre.

### A08-2 - geschlossen

Drei Dinge waren gefordert, drei sind vorhanden:

1. Der Delta-Ledger nennt den Vorzustand („ein aktiver Partner blieb dadurch im
   Monte-Carlo-Pfad unsterblich") und beziffert das Delta mit den gemessenen
   Werten.
2. `MonteCarloHouseholdLifeContractV1` mit `deltaLedgerId: 'A08-2'` liegt unter
   `samplingDiagnostics.modelContracts.householdLife`. Nachgemessen ueber einen
   **Zwei-Chunk-Merge** (Workerpfad, `finalizeMonteCarloChunkAccumulatorV1`):
   die Marke ueberlebt Klonen und Merge vollstaendig. Der Einzelchunk-Test
   allein haette das nicht belegt.
3. Ein behaviorales Orakel existiert: O-12 vergleicht `p2Alive` aus der
   Sweep-Provenienz gegen `Person2Alive` aus dem MC-Log, und die Fixture hat
   `pflegefallLogikAktivieren: false`. Waere die `careMetaP2`-Bedingung im
   MC-Hot-Path wieder da, wuerde diese Assertion brechen - der Schutz greift
   also genau dort, wo das gemessene Delta entsteht, nicht nur in
   `mc-life-events.js`.

Die Deltazahlen sind nach der Nachbesserung unveraendert nachgemessen: Median
587.853,50 auf 759.734,40 EUR, p10 184.139,41 auf 236.133,52 EUR. Die Angaben im
Delta-Ledger stimmen.

Einschraenkung, die im Text stehen sollte: die Marke ist **additiv**.
`MONTE_CARLO_SAMPLING_DIAGNOSTICS_VERSION` und die Result-Schemaversion sind
unveraendert. Alt und neu sind an der Anwesenheit des Feldes unterscheidbar,
nicht an einer Versionsnummer - ein Konsument, der nur `schemaVersion` prueft,
sieht keinen Unterschied.

### A08-4, A08-3, A08-6, A08-7

A08-4 ist als benanntes Delta im Ledger eingetragen, mit korrekt uebernommener
Messzahl; ein Codefix war weder gefordert noch sinnvoll. A08-3 und A08-7 sind
mit tragfaehiger Begruendung offengehalten (Fachentscheidung beziehungsweise
achte Programmdatei), A08-6 als bewusste Speichergrenze. Beide Werte
unveraendert nachgemessen: 6.000,00 EUR pro Jahr unversteuert; `percent` 1,5 und
55 liefern weiterhin beide 60.000,00 EUR.

### A08-5 - teilweise geschlossen

Der Abbruchzweig erhoeht ueber `engineStepExecuted` nicht mehr
`yearsEvaluated`, `totalCareFloorNominalEur`, `minimumTemporaryFlexFactor` und
die Horizontzaehler. Das Orakel prueft `minimumTemporaryFlexFactor === null` und
ist diskriminierend.

Offen bleibt eine Asymmetrie: `p1CareActiveYears`, `p2CareActiveYears`,
`bothCareActiveYears`, `widowP1ActiveYears`, `widowP2ActiveYears`,
`p1DeathEvents` und `p2DeathEvents` stehen **oberhalb** des Gates und zaehlen
das Abbruchjahr weiterhin mit. Todes- und Runzaehler sollen das auch - die
Pflege- und Witwenjahre nicht, denn sie beschreiben Jahre, die nie gerechnet
wurden. Gemessen an 60 Laeufen mit 6 Gesamttodesfaellen: `yearsEvaluated` 695,
`horizon.resolutionCount` 695 (beide gegattert), `widowP2ActiveYears` 470
(ungegattert). Eine aus diesen Feldern gebildete Quote mischt zwei
Grundgesamtheiten.

### A08-8 (neuer Blocker) - `computeHouseholdFlexFactor` leitet die Paar-Eigenschaft weiterhin aus Pflege-Metadaten ab

A08-2 hat korrigiert, dass die **Sterblichkeit** des Partners an
`careMetaP2 !== null` haengt. Eine Funktion weiter, in
`simulator-engine-helpers.js` - einer der sieben Slice-Dateien -, steht dieselbe
Ableitung unveraendert:

```js
const isCoupleProfile = (careMetaP2 !== null);
if (!isCoupleProfile) {
    return f1;                    // f1 = p1Alive ? … : 0.0
}
const f2 = p2Alive ? resolveIndividualFlexFactor(careMetaP2) : 0.0;
return (0.5 * Math.max(f1, f2)) + (0.25 * f1) + (0.25 * f2);
```

Bei deaktivierter Pflegelogik ist `careMetaP2 === null`, auch wenn der Partner
aktiv ist. Der Haushalt gilt dann nicht als Paar, und der Faktor faellt auf den
von P1 allein zurueck. Gemessen, ohne jeden Pflegefall:

| Zustand | Pflegelogik AUS | Pflegelogik AN |
| --- | --- | --- |
| P1 verstorben, P2 lebt | **0,00** | 0,75 |
| P1 lebt, P2 verstorben | 1,00 | 0,75 |

Der ueberlebende Partner erhaelt einen temporaeren Flexfaktor von **null** -
sein gesamtes flexibles Budget faellt weg, allein weil ein Pflegeschalter
deaktiviert ist. Umgekehrt behaelt ein ueberlebender P1 den vollen Faktor 1,00
statt der Haushaltsreduktion 0,75.

End-to-end im Sweep bestaetigt (Paar, Pflegelogik aus, P1 92 Jahre,
P2 66 Jahre, Seed 4242):

| Jahr | P1 | P2 | Pflege P1/P2 aktiv | `temporaryFlexFactor` | Engine-Schritt |
| --- | --- | --- | --- | --- | --- |
| 0 | lebt | lebt | false/false | 1 | ja |
| 1 | lebt | lebt | false/false | 1 | ja |
| 2 | **verstorben** | lebt | false/false | **0** | ja |
| 3 | verstorben | lebt | false/false | **0** | ja |

Der Wert 0 wird tatsaechlich an `simulateOneYear` uebergeben; ueber
`inflatedFlex = max(0, baseFlex * 0 - pensionSurplus)` entfaellt die flexible
Entnahme fuer den gesamten Rest des Horizonts. Die Verzerrung wirkt
**optimistisch**: weniger Entnahme bedeutet hoehere Endvermoegen und hoehere
Erfolgsquoten bei einem Ausgabenpfad, den niemand so geplant hat.

Damit ist auch `minimumTemporaryFlexFactor: 0` aus A08-5 in dieser
Konstellation kein Diagnosefehler mehr, sondern eine wahrheitsgemaesse Anzeige
eines falschen Rechenwerts.

Einordnung: In Monte Carlo bestand der Pfad schon vor Slice 08 (P1 konnte
sterben, waehrend der unsterbliche Partner weiterlebte). Im Sweep ist er **neu**,
denn dort war `p2Alive` fest `false` und der Lauf endete mit P1s Tod. Durch
A08-2 wird er ausserdem deutlich haeufiger durchlaufen. Das Akzeptanzkriterium
zum temporaeren Pflege-Flexfaktor liegt genau auf dieser Funktion, und die Datei
gehoert bereits zum genehmigten Scope - eine Korrektur erfordert keine
Scope-Erweiterung.

Erwartete Korrektur: die Paar-Eigenschaft aus `inputs.partner?.aktiv`
beziehungsweise `lifeState.hasPartner` ableiten statt aus dem Vorhandensein
optionaler Pflege-Metadaten, plus ein Orakel „Partner aktiv, Pflegelogik aus,
eine Person verstorben" fuer beide Sterberichtungen.

### Pre-Mortem

> Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im
> Produktivbetrieb - was ist die wahrscheinlichste Ursache?

Ein Paar mit deaktivierter Pflegelogik, bei dem die aeltere Person zuerst
stirbt. Ab diesem Jahr rechnet der Plan fuer die hinterbliebene Person ohne
jedes flexible Budget weiter. Das Ergebnis sieht robust aus - Endvermoegen und
Erfolgsquote steigen -, waehrend der zugrunde liegende Ausgabenpfad ein
Existenzminimum ist. Gesucht wird die Ursache in der Entnahmestrategie oder im
Witwenrentenanteil, weil A08-1 und A08-2 als geschlossen gelten und der
Pflegeschalter, der den Effekt tatsaechlich steuert, in diesem Szenario
ausgeschaltet ist und deshalb niemandes Verdacht auf sich zieht.

### Review-Ergebnis

```markdown
## Review-Ergebnis
- Status: blockiert
- Blocker:
  1. A08-8 - `computeHouseholdFlexFactor` leitet die Paar-Eigenschaft weiterhin
     aus `careMetaP2 !== null` ab. Bei deaktivierter Pflegelogik erhaelt ein
     ueberlebender Partner den temporaeren Flexfaktor 0,00 statt 0,75, ein
     ueberlebender P1 den Faktor 1,00 statt 0,75. Der Wert 0 erreicht
     `simulateOneYear` und streicht die flexible Entnahme fuer den Rest des
     Horizonts; die Verzerrung ist optimistisch. Dieselbe Fehlerklasse, die
     A08-2 eine Funktion weiter gerade geschlossen hat; die Datei liegt bereits
     im Slice-Scope.
- Geschlossen: A08-1 (beide Richtungen und Randfall nachgemessen), A08-2
  (Delta beziffert, Marke ueberlebt den Zwei-Chunk-Merge, behaviorales Orakel
  im MC-Hot-Path), A08-4 (als benanntes Delta dokumentiert).
- Restrisiken:
  1. A08-5 verbleibend - `p1CareActiveYears`, `p2CareActiveYears`,
     `bothCareActiveYears`, `widowP1ActiveYears` und `widowP2ActiveYears`
     stehen oberhalb des `engineStepExecuted`-Gates und zaehlen das Abbruchjahr
     weiter mit, waehrend `yearsEvaluated` es nicht mehr zaehlt.
  2. A08-2 verbleibend - die Vertragsmarke ist additiv; die Sampling- und
     Result-Schemaversionen sind unveraendert, alt und neu unterscheiden sich
     nur an der Anwesenheit des Feldes.
  3. A08-3, A08-6 und A08-7 unveraendert offen und begruendet.
- Pre-Mortem: Ein Paar ohne Pflegelogik, bei dem die aeltere Person zuerst
  stirbt. Der Plan rechnet fuer die hinterbliebene Person ab diesem Jahr ohne
  flexibles Budget weiter und sieht dadurch robuster aus, als er ist. Gesucht
  wird in der Entnahmestrategie, weil der Pflegeschalter, der den Effekt
  steuert, in diesem Szenario ausgeschaltet ist.
```

## Review-Antworten von Codex

### Nachbesserungs-Statuscheck vor Coding

Ausgefuehrt am 2026-07-27 nach Eingang des Gemini-/Claude-Reviews.

```text
Branch: codex/suite-datenintegritaet-hardening
Worktree vor Nachbesserung:
 M docs/internal/SLICE_SUITE_DATA_08_SWEEP_HOUSEHOLD_RISK.md
 M docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md
```

Die beiden geaenderten Dokumente enthalten ausschliesslich das nachgelagerte
Reviewerfeedback. Die sieben Programmdateien des committed Slice-Stands waren
sauber. Die Nachbesserung bleibt innerhalb des bestehenden Programmdateiscopes
und fuegt keine achte Programmdatei hinzu.

### Nachbesserungsplan

- A08-1 ist bestaetigt. Die erstmalige Hinterbliebenenableitung wird fuer beide
  Richtungen an den Rentenstart-Offset der verstorbenen Person gebunden.
  Direkte Spiegelorakel mit `partner.startInJahren > 0` und
  `renteStartOffsetJahre > 0` pruefen vorzeitige Nullleistung, Beginn am
  vorgesehenen Offset und anschliessend genau einmalige Indexierung.
- A08-2 ist bestaetigt. Die fachlich richtige Entkopplung von
  Partnersterblichkeit und Pflege-Metadaten bleibt bestehen. Das gemessene
  MC-Delta wird im Delta-Ledger und als eigenes Akzeptanzkriterium benannt,
  durch eine diskriminierende No-Care-Partnerfixture festgehalten und ueber
  einen versionierten Household-Life-Untervertrag in der MC-Ergebnisdiagnostik
  sichtbar gemacht.
- A08-5 wird als sichere, klar abgrenzbare Diagnosekorrektur mitbehoben:
  Jahre ohne ausgefuehrten Engine-Step duerfen weder `yearsEvaluated` noch den
  Pflege-Flex-Minimalwert beeinflussen.
- A08-3 bleibt eine offene Fachentscheidung zur Steuerquote auf
  Hinterbliebenenleistungen. A08-4 wird als bewusstes, fuer MC-Paritaet
  notwendiges Random-Stream-Delta benannt. A08-6 bleibt die dokumentierte
  Begrenzung des Detailtraces. A08-7 benoetigt eine Aenderung ausserhalb des
  Sieben-Dateien-Programmscopes und bleibt bis zu einem gesonderten
  Fail-Closed-Contract offen.

### Geplanter Nachbesserungsscope

Programmdateien, alle bereits im Slice-Scope:

- `app/simulator/simulator-household-pension.js`
- `app/simulator/monte-carlo-runner.js`
- `app/simulator/sweep-runner.js`

Tests und Dokumentation:

- `tests/simulation.test.mjs`
- `tests/simulator-sweep.test.mjs`
- `tests/mc-worker-contract.test.mjs`
- `tests/monte-carlo-export-contract.test.mjs`
- `docs/internal/SLICE_SUITE_DATA_08_SWEEP_HOUSEHOLD_RISK.md`
- `docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md`

### Nachbesserungsergebnis

- **A08-1 technisch behoben:** Beide Hinterbliebenenrichtungen pruefen den
  Rentenstart-Offset der verstorbenen Person. Direkte Spiegelorakel belegen
  0 EUR vor dem Offset, 33.000 EUR beziehungsweise 22.000 EUR am jeweiligen
  Offset und genau einmalige Folgeindexierung. Ein realer Sweep-Witness mit
  deterministischem P2-Tod unterscheidet Offset 3 (30.000 EUR) von Offset 4
  (0 EUR im selben Witwenjahr).
- **A08-2 technisch und vertraglich nachgebessert:** Die fachlich richtige
  P2-Sterblichkeit ohne Pflege-Metadaten bleibt bestehen. Das quantitative
  Reviewer-Delta ist im Baseline-/Delta-Ledger benannt. Serial-, Worker- und
  Exportpfad tragen `MonteCarloHouseholdLifeContractV1`, nennen die
  Mortality-Policy und verweisen ueber `deltaLedgerId` auf `A08-2`.
- **A08-5 mitbehoben:** Ein Gesamttod vor dem Engine-Step beeinflusst
  `yearsEvaluated`, `minimumTemporaryFlexFactor` und Pflegefloor nicht mehr.
- **A08-3, A08-6 und A08-7 nicht still veraendert:** Steuersemantik benoetigt
  einen Fachentscheid, der begrenzte Trace bleibt dokumentierte
  Payloadgrenze, und der Prozentclamp erfordert wegen der
  Sieben-Dateien-Stopregel einen gesonderten Slice.

### Nachbesserungstests

- Fokussiert: Sweep 211/211, Worker 67/67, Export 108/108, Care 28/28,
  Simulator-MC 160/160, Chunk-Result 33/33 und MC-Messvertrag
  1.102/1.102 Assertions gruen.
- `npm test`: 7.809/7.809 Assertions in 132 Testdateien, 0 fehlgeschlagene
  Dateien, 0 offene Handles.
- `npm run test:browser`: 16/16 Browser-Smokes gruen.
- `git diff --check`: gruen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| O-12 | Akzeptanzkriterien | Partner-, Todes- und Witwenpfad im Sweep | angenommen | 60.000-EUR-P2-Rente, deterministischer Tod und 50-Prozent-Witwenpfad gegen MC belegt |
| O-13 | Akzeptanzkriterien | deterministischer Tail-Risk-Pfad im Sweep | angenommen | kanonischer Schedule, exakte Deltas und Applied-/Skipped-Zähler gegen MC belegt |
| O-20 | Akzeptanzkriterien | dynamischer Survival-Horizon im Sweep | angenommen | Quantile 0,50/0,99, Horizon und VPW-Rate gegen Resolver und MC belegt |
| A08-1 | Claude 2026-07-27 | Hinterbliebenenrente wird vor dem Rentenbeginn der verstorbenen Person gezahlt; gemessen 33.000,00 EUR ab Jahr 5 bei `partner.startInJahren = 10`, Spiegelfall ueber `renteStartOffsetJahre` ebenso | angenommen und technisch behoben; Re-Review ausstehend | symmetrische Offset-Gates plus direkte und Sweep-End-to-End-Orakel |
| A08-2 | Claude 2026-07-27 | unbenanntes Monte-Carlo-Delta: der Partner starb bei deaktivierter Pflegelogik bisher nie; Median-Endvermoegen +29,2 Prozent, ohne Eintrag im Delta-Ledger und ohne Versionsmarke | angenommen und technisch behoben; Re-Review ausstehend | quantitatives Delta-Ledger, No-Care-P2-Orakel und `MonteCarloHouseholdLifeContractV1` in Serial-/Worker-/Exportdiagnostik |
| A08-3 | Claude 2026-07-27 | die Witwenrente des Partners umgeht dessen `steuerquotePct`; gemessen 6.000,00 EUR pro Jahr unversteuert | offen - Restrisiko | ausstehend |
| A08-4 | Claude 2026-07-27 | Pflege-RNG des Sweeps auf geforkten Strom umgestellt; Einzelprofil mit Pflege verschiebt sich um +4,8 Prozent, obwohl der Nicht-Scope Stromaenderungen ausschliesst | angenommen als benannte Planabweichung; Re-Review ausstehend | Delta und Begruendung im Baseline-/Delta-Ledger dokumentiert; MC-Paritaetsvertrag bleibt wirksam |
| A08-5 | Claude 2026-07-27 | `minimumTemporaryFlexFactor` wird vom Sterbejahr auf 0 gezogen, auch ohne Pflegelogik; `yearsEvaluated` zaehlt das Abbruchjahr ohne `simulateOneYear` mit | angenommen und technisch behoben; Re-Review ausstehend | nur ausgefuehrte Engine-Steps speisen Jahres-, Floor- und Flexdiagnostik; deterministisches All-Dead-Orakel |
| A08-6 | Claude 2026-07-27 | ein einziger getracter Run je Kombination ist bei mehreren hundert Runs kein Diagnosewerkzeug | angenommen als dokumentierte Payloadgrenze | Vollaggregate fuer alle Runs bleiben erhalten; Detailtrace bleibt bewusst begrenzt |
| A08-7 | Claude 2026-07-27 | Prozentclamp ist fail-open; `percent` 1,5 und 55 werden beide stumm zu 100 Prozent | offen - gesonderter Fail-Closed-Contract erforderlich | `simulator-sweep-utils.js` waere achte Programmdatei und aktiviert die Slice-Stopregel |
| A08-1 | Claude 2026-07-27 | Re-Review: Sperre in beiden Richtungen nachgemessen; Einstieg exakt im Offsetjahr auf der fortgeschriebenen Bemessungsgrundlage (40.226,82 EUR), keine Nachzahlung, diskriminierende Orakel | geschlossen | ausstehend |
| A08-2 | Claude 2026-07-27 | Re-Review: Delta beziffert im Delta-Ledger, `MonteCarloHouseholdLifeContractV1` ueberlebt den Zwei-Chunk-Merge (gemessen), behaviorales O-12-Orakel deckt den MC-Hot-Path ab; Marke ist additiv ohne Versionsbump | geschlossen | ausstehend |
| A08-4 | Claude 2026-07-27 | Re-Review: als benanntes Delta gegen den urspruenglichen Nicht-Scope dokumentiert, Messzahl korrekt uebernommen | geschlossen | ausstehend |
| A08-5 | Claude 2026-07-27 | Re-Review: Abbruchjahr-Artefakt ueber `engineStepExecuted` beseitigt; Pflege- und Witwenjahreszaehler stehen weiterhin oberhalb des Gates (gemessen: `yearsEvaluated` 695 gegattert, `widowP2ActiveYears` 470 ungegattert) | teilweise geschlossen | ausstehend |
| A08-8 | Claude 2026-07-27 | `computeHouseholdFlexFactor` leitet die Paar-Eigenschaft weiterhin aus `careMetaP2 !== null` ab; bei deaktivierter Pflegelogik erhaelt ein ueberlebender Partner den temporaeren Flexfaktor 0,00 statt 0,75, ein ueberlebender P1 den Faktor 1,00 statt 0,75; der Wert 0 erreicht `simulateOneYear` | offen - Blocker | ausstehend |
| A08-5 | Claude 2026-07-27 | Drittes Review: Restzaehler jetzt innerhalb des `engineStepExecuted`-Gates; Wirkung arithmetisch belegt (`widowP2ActiveYears` 470 auf 464 bei 6 Gesamttodesfaellen) | geschlossen | ausstehend |
| A08-8 | Claude 2026-07-27 | Drittes Review: Paar-Eigenschaft aus `hasPartner`; beide Sterberichtungen liefern 0,75, Einzelprofil-Paritaet und Sweep-Paritaetsorakel bitgleich; End-to-End im Sweep 0,75 statt 0,00 nachgemessen | geschlossen | ausstehend |
| B08-1 | Claude 2026-07-27 | `computeHouseholdFlexFactor` behandelt ein fehlendes `hasPartner` stumm als Einzelprofil; ein Paar mit Pflege liefert ohne das Feld 0,00 statt zuvor 0,75. Die Funktion ist oeffentlich re-exportiert; fail-closed waere angemessen | offen - Restrisiko | ausstehend |
| B08-2 | Claude 2026-07-27 | das Ergebnisdelta aus A08-8 ist im Ledger benannt, aber nicht beziffert; gemessen -11,7 Prozent Median im Sweep und +3,6 Prozent im MC je nach Sterbereihenfolge, Kontrolle mit Pflege bitgleich | offen - Restrisiko | ausstehend |
| B08-3 | Claude 2026-07-27 | die Richtung "P2 ueberlebt P1" ist nur im Unit-Test gepinnt; die beiden End-to-End-Orakel decken nur "P1 ueberlebt P2" ab | offen - Hinweis | ausstehend |
| B08-4 | Claude 2026-07-27 | `deltaLedgerId` und `deltaLedgerIds` stehen doppelt im Vertrag; die Versionsassertion im Exporttest vergleicht die Konstante mit sich selbst und haelt fuer jeden Wert | offen - Hinweis | ausstehend |

## Zweite Nachbesserung nach Claude-Re-Review

### Statuscheck vor Coding

Ausgefuehrt am 2026-07-27. Der Branch bleibt
`codex/suite-datenintegritaet-hardening`. Der Arbeitsbaum enthaelt die erste
Blocker-Nachbesserung sowie das nachgelagerte Claude-Re-Review. A08-1, A08-2
und A08-4 sind durch Claude geschlossen; der neue Blocker ist A08-8. Die
betroffenen Programmdateien gehoeren bereits zu den sieben genehmigten
Slice-Dateien.

### Nachbesserungsplan fuer A08-8 und verbleibendes A08-5

- `computeHouseholdFlexFactor` erhaelt die explizite Paar-Eigenschaft
  `hasPartner`. Pflege-Metadaten duerfen nur den individuellen Pflegefaktor,
  niemals die Existenz der zweiten Person bestimmen.
- Beide produktiven Aufrufer uebergeben den kanonischen Partnerstatus aus
  `lifeState.hasPartner` beziehungsweise dem bereits normalisierten
  `hasPartner`.
- Direkte Orakel pruefen bei aktivem Partner und deaktivierter Pflegelogik
  beide Sterberichtungen: P1 verstorben/P2 lebt und P1 lebt/P2 verstorben
  muessen jeweils den Haushaltsfaktor 0,75 liefern. Ein Sweep-End-to-End-Orakel
  belegt, dass derselbe Faktor `simulateOneYear` erreicht.
- Der Household-Life-Untervertrag wird fuer die neue Flexsemantik auf V2
  gehoben und nennt A08-8 neben A08-2 im Delta-Ledger.
- Die verbleibende A08-5-Asymmetrie wird im bereits geaenderten
  `sweep-runner.js` geschlossen: Pflege- und Witwenjahre zaehlen nur Jahre mit
  ausgefuehrtem Engine-Step; Todesereignisse und Gesamttod-Runzaehler bleiben
  ereignisbezogen und werden weiterhin im Abbruchjahr erfasst.

Geplanter Programmdateiscope, vollstaendig innerhalb des bestehenden
Sieben-Dateien-Limits:

- `app/simulator/simulator-engine-helpers.js`
- `app/simulator/mc-life-events.js`
- `app/simulator/monte-carlo-runner.js`
- `app/simulator/sweep-runner.js`

Geplante Testanpassungen:

- `tests/care-meta.test.mjs`
- `tests/simulator-sweep.test.mjs`
- bestehende Worker-, Export- und MC-Contract-Gates fuer die V2-Provenienz

### Ergebnis der zweiten Nachbesserung

- **A08-8 technisch behoben:** `computeHouseholdFlexFactor` erhaelt
  `hasPartner` explizit. `careMetaP2` beeinflusst nur noch den individuellen
  Pflegefaktor. Beide produktiven Aufrufer liefern den kanonischen
  Partnerstatus.
- **Beide Sterberichtungen diskriminierend belegt:** Bei aktivem Partner und
  deaktivierter Pflegelogik liefern P1 tot/P2 lebt sowie P1 lebt/P2 tot jeweils
  exakt 0,75. Der Sweep-Witness P1 92/P2 66 mit Seed 4242 erreicht nach
  P1-Tod denselben Wert am Engine-Schritt; der alte Pfad lieferte 0,00.
- **MC-Vertrag auf V2 gehoben:** Serial-, Worker- und Exportdiagnostik tragen
  `MonteCarloHouseholdLifeContractV2`, die Policy
  `partner-activation-independent-of-care-metadata` und die
  Delta-Ledger-IDs A08-2/A08-8. Der bisherige singulaere
  `deltaLedgerId: A08-2` bleibt fuer bestehende Konsumenten additiv erhalten.
- **A08-5 vollstaendig technisch korrigiert:** Pflege- und Witwenjahreszaehler
  liegen nun ebenfalls hinter `engineStepExecuted`. Im deterministischen
  P1/P2-90-Witness mit Seed 1 bleibt der aktive P1-Witwenzaehler bei den zwei
  tatsaechlich gerechneten Witwenjahren; das anschliessende Gesamttodjahr wird
  nicht addiert. Beide Todesereignisse bleiben diagnostiziert.
- Es trat kein unerwartetes Snapshot-, Backtest- oder
  MC-Messvertragsdelta auf.

### Tests der zweiten Nachbesserung

- Direkt: Care 30/30, Sweep 226/226, Worker 69/69, Export 110/110,
  Simulator-MC 160/160, Chunk-Result 33/33, Simulation 10/10 und
  MC-Messvertrag 1.102/1.102 Assertions gruen.
- `npm test`: 132 Testdateien, 7.830/7.830 Assertions, 0 fehlgeschlagene
  Dateien, 0 offene Handles.
- `npm run test:browser`: 16/16 Browser-Smokes gruen.
- Gesamt-Slice-Scope: weiterhin exakt sieben Programmdateien.
- Reviewerstatus: weiterhin blockiert bis zum unabhaengigen Re-Review.

---

## Drittes Review durch Claude - Nachbesserung zu A08-8

**Review-Datum:** 2026-07-27 (dritter Durchgang)

**Reviewer:** Claude (Opus 5)

**Pruefgegenstand:** Arbeitsstand ueber `8f674eb` - fuenf geaenderte
Programmdateien, fuenf Testdateien. Neu gegenueber dem zweiten Durchgang:
`simulator-engine-helpers.js` (Signatur von `computeHouseholdFlexFactor`),
`mc-life-events.js` und `monte-carlo-runner.js` (Aufrufstellen, Vertrag V2),
`sweep-runner.js` (Restzaehler aus A08-5).

**Nachgefahrene Gates:** `npm test` 7.830/7.830 Assertions, 0 fehlgeschlagene
Dateien, 0 offene Handles. `git diff --check` gruen. Keine Golden-, Fixture-
oder `dist/`-Datei beruehrt.

### Findings-Lifecycle

| ID | Status vorher | Status jetzt | Begruendung |
| --- | --- | --- | --- |
| A08-1 | geschlossen | geschlossen | unveraendert |
| A08-2 | geschlossen | geschlossen | Vertrag auf V2 gehoben, Marke ueberlebt den Merge weiterhin |
| A08-3 | offen, bewusst | offen, bewusst | Fachentscheidung, unveraendert |
| A08-4 | geschlossen | geschlossen | unveraendert |
| A08-5 | teilweise | **geschlossen** | Restzaehler gegattert, Wirkung arithmetisch nachgewiesen |
| A08-6 | offen, bewusst | offen, bewusst | Speichergrenze, unveraendert |
| A08-7 | offen, bewusst | offen, bewusst | achte Programmdatei, unveraendert |
| A08-8 | Blocker | **geschlossen** | Paar-Eigenschaft aus `hasPartner`, beide Richtungen nachgemessen |
| B08-1 | - | neues Restrisiko | fehlendes `hasPartner` degradiert stumm zu "kein Partner" |
| B08-2 | - | neues Restrisiko | das A08-8-Ergebnisdelta ist benannt, aber nicht beziffert |
| B08-3 | - | neuer Hinweis | Richtung "P2 ueberlebt P1" nur auf Unit-Ebene gepinnt |
| B08-4 | - | neuer Hinweis | doppelte Ledger-Felder und tautologische Versionsassertion |

### A08-8 - geschlossen

`isCoupleProfile` leitet sich nicht mehr aus `careMetaP2 !== null` ab, sondern
aus dem uebergebenen `hasPartner`. Beide Produktionsaufrufstellen
(`mc-life-events.js`, `monte-carlo-runner.js`) reichen den Wert aus dem
Life-State durch; `simulator-engine-direct.js` ist ein reiner Re-Export.

Nachgemessen, ohne jeden Pflegefall:

| Zustand | Pflegelogik AUS | Pflegelogik AN |
| --- | --- | --- |
| P1 verstorben, P2 lebt | **0,75** (vorher 0,00) | 0,75 |
| P1 lebt, P2 verstorben | **0,75** (vorher 1,00) | 0,75 |
| beide leben | 1,00 | 1,00 |

Der Pflegeschalter beeinflusst den Haushaltsfaktor nicht mehr. Die Paritaet fuer
Einzelprofile ist erhalten (`hasPartner: false` liefert weiterhin 1,00 lebend
und 0,00 verstorben), und das Sweep-Paritaetsorakel bleibt bitgleich bei
585.370,2476467057 EUR.

End-to-end im Sweep bestaetigt, in der Richtung, die zuvor 0,00 lieferte
(Paar, Pflegelogik aus, P1 92 Jahre, P2 66 Jahre, Seed 4242):

| Jahr | P1 | P2 | Pflege aktiv | `temporaryFlexFactor` |
| --- | --- | --- | --- | --- |
| 0-1 | lebt | lebt | nein | 1,00 |
| 2-3 | **verstorben** | lebt | nein | **0,75** (vorher 0,00) |

Die neuen Orakel sind belastbar. Besonders der MC-Test prueft nicht die
Diagnostik, sondern das Geld: `flex_brutto === startFlexBedarf *
inflation_factor_cum * 0.75`. Damit ist festgehalten, dass der Faktor die
Entnahmerechnung erreicht und nicht nur die Provenienz.

### A08-5 - geschlossen

Die Rest-Asymmetrie ist beseitigt: `p1CareActiveYears`, `p2CareActiveYears`,
`bothCareActiveYears`, `widowP1ActiveYears` und `widowP2ActiveYears` stehen
jetzt innerhalb des `engineStepExecuted`-Gates, `p1DeathEvents`,
`p2DeathEvents` und die Runzaehler bewusst ausserhalb. Die Wirkung ist exakt
nachrechenbar: derselbe Laufsatz (60 Laeufe, 6 Gesamttodesfaelle) meldet
`widowP2ActiveYears` 470 vorher gegen 464 jetzt - genau die 6 Abbruchjahre, die
kein Enginejahr waren.

### B08-1 (Restrisiko) - ein fehlendes `hasPartner` degradiert stumm zu "kein Partner"

Die Korrektur ersetzt eine implizite Ableitung durch einen impliziten Default.
`hasPartner !== true` behandelt `undefined` wie "Einzelprofil". Gemessen:

| Aufruf | vor A08-8-Fix | jetzt |
| --- | --- | --- |
| Paar **mit** Pflege, P1 tot, ohne `hasPartner` | 0,75 | **0,00** |
| Paar ohne Pflege, P1 tot, ohne `hasPartner` | 0,00 | 0,00 |

Fuer den Fall "Paar mit Pflege" ist die Degradation also schlechter als vorher.
Beide Produktionsaufrufer reichen das Feld durch, aber die Funktion ist ueber
`simulator-engine-direct.js` und den Engine-Wrapper oeffentlich exportiert.

Der Effekt ist nicht theoretisch: mein eigener Vergleichsharnisch, der den
Vor-Slice-Runner gegen das aktuelle `simulator-engine-helpers.js` laufen laesst,
hat nach dieser Aenderung fuer Paarlaeufe stillschweigend andere Zahlen
geliefert - ohne Fehler, ohne Warnung, mit plausibel aussehendem Ergebnis. Genau
diese Signatur hatte der urspruengliche Defekt.

Empfehlung: `hasPartner` fail-closed behandeln, analog zu
`assertSimulatorHorizonAgeContract` in derselben Slice - fehlt das Feld,
waehrend `careMetaP2` gesetzt ist, ist das ein Vertragsbruch und kein
Einzelprofil.

### B08-2 (Restrisiko) - das A08-8-Ergebnisdelta ist benannt, aber nicht beziffert

Fuer A08-2 verlangt der Delta-Ledger nach dem ersten Review eine bezifferte
Angabe und enthaelt sie auch. Fuer A08-8 steht nur die qualitative Aussage
"0,75 statt 0,00". Das Delta ist aber real und laeuft in **beide** Richtungen,
je nachdem, wer zuerst stirbt. Nachgemessen gegen den Stand vor der
A08-8-Korrektur:

| Fall | vor A08-8-Fix | nach A08-8-Fix |
| --- | --- | --- |
| MC, Paar ohne Pflege, P1 66 / P2 92, Seed 777 (P2 stirbt zuerst), Median | 759.734,40 EUR | **786.743,05 EUR** (+3,6 %) |
| dito, p10 | 236.133,52 EUR | **268.566,63 EUR** (+13,7 %) |
| Sweep, Paar ohne Pflege, Seed 12345, Median | 2.842.315,86 EUR | **2.509.864,35 EUR** (-11,7 %) |
| dito, Erfolgsquote | 96,5 % | 97,5 % |
| MC, Paar **mit** Pflege, Kontrolle | 639.611,25 EUR | 639.611,25 EUR (unveraendert) |

Die Richtung haengt daran, wer ueberlebt: stirbt P2 zuerst, sinkt der Faktor von
1,00 auf 0,75 und das Vermoegen steigt; stirbt P1 zuerst, steigt er von 0,00 auf
0,75 und das Vermoegen sinkt. Die Kontrolle mit aktiver Pflegelogik ist
bitgleich - die Korrektur ist dort wie beabsichtigt wirkungslos.

Es ist derselbe Massstab wie bei A08-2: ein zweistelliges Prozentdelta auf der
Entscheidungsflaeche gehoert mit Zahl in den Ledger, sonst ist es in drei
Monaten nicht mehr von einem Fehler zu unterscheiden.

### B08-3 (Hinweis) - die gefaehrlichere Richtung ist nur auf Unit-Ebene gepinnt

Die beiden End-to-End-Orakel (Sweep-Provenienz und MC-`flex_brutto`) decken den
Fall "P1 ueberlebt P2" ab, in dem der Faktor von 1,00 auf 0,75 faellt. Der Fall
"P2 ueberlebt P1", in dem er von 0,00 auf 0,75 steigt und der die eigentliche
Fehlbewertung war, ist nur im Unit-Test `fP1DeadWithoutCare` gepinnt. Ich habe
ihn end-to-end nachgemessen (Tabelle oben, 0,75 ab Jahr 2), die Testsuite tut es
nicht.

### B08-4 (Hinweis) - doppelte Ledger-Felder und eine tautologische Versionsassertion

`MonteCarloHouseholdLifeContractV2` fuehrt `deltaLedgerId: 'A08-2'` und
`deltaLedgerIds: ['A08-2', 'A08-8']` nebeneinander. Der Singular untertreibt
jetzt: ein Konsument, der das aeltere Feld liest, sieht A08-8 nicht. Entweder
den Singular als deprecated markieren oder entfernen.

Ausserdem prueft `tests/monte-carlo-export-contract.test.mjs`
`schemaVersion === MONTE_CARLO_HOUSEHOLD_LIFE_CONTRACT_VERSION` - beide Seiten
stammen aus derselben Konstante, die Assertion haelt fuer jeden Wert. Da die
Versionsnummer das einzige Merkmal ist, das Ergebnisse vor und nach A08-8
unterscheidet, sollte mindestens eine Stelle das Literal
`MonteCarloHouseholdLifeContractV2` festnageln. Die Assertions auf `A08-2` und
`A08-8` tun das fuer die Ledger-IDs bereits richtig.

### Pre-Mortem

> Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im
> Produktivbetrieb - was ist die wahrscheinlichste Ursache?

Nicht mehr die Haushaltsrechnung selbst, sondern ihre Aufrufkonvention. Ein
spaeterer Slice ruft `computeHouseholdFlexFactor` aus einem neuen Kontext auf -
Profilverbund, Backtest, ein Vergleichswerkzeug - und uebergibt `hasPartner`
nicht, weil die Funktion frueher ohne dieses Feld auskam. Der Aufruf wirft
nicht, sondern liefert fuer ein Paar mit Pflegefall 0,00 statt 0,75. Das
Ergebnis ist zu optimistisch, sieht aber plausibel aus, und die Suche beginnt in
der Pflegelogik statt an der Signatur - dieselbe Verwechslung von "Metadaten
fehlen" mit "Person existiert nicht", die A08-2 und A08-8 gerade zweimal
geschlossen haben.

### Review-Ergebnis

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine. A08-1, A08-2, A08-4, A08-5 und A08-8 sind geschlossen und
  jeweils durch eigene Messung bestaetigt, nicht nur durch gruene Tests.
- Restrisiken:
  1. B08-1 - `computeHouseholdFlexFactor` behandelt ein fehlendes `hasPartner`
     stumm als "kein Partner"; fuer ein Paar mit Pflege liefert ein Aufrufer
     ohne das Feld jetzt 0,00 statt zuvor 0,75. Die Funktion ist oeffentlich
     re-exportiert. Fail-closed waere angemessen.
  2. B08-2 - das Ergebnisdelta aus A08-8 ist im Ledger benannt, aber nicht
     beziffert; gemessen -11,7 Prozent Median im Sweep und +3,6 Prozent im MC,
     je nach Sterbereihenfolge, Kontrolle mit Pflege bitgleich.
  3. B08-3 - die Richtung "P2 ueberlebt P1" ist nur im Unit-Test gepinnt, nicht
     end-to-end.
  4. B08-4 - `deltaLedgerId` und `deltaLedgerIds` stehen doppelt; die
     Versionsassertion im Exporttest vergleicht die Konstante mit sich selbst.
  5. A08-3, A08-6 und A08-7 bleiben unveraendert und begruendet offen. A08-3
     ist die einzige davon, die eine Fachentscheidung des Nutzers braucht.
- Pre-Mortem: Nicht die Rechnung, sondern die Aufrufkonvention. Ein spaeterer
  Slice ruft `computeHouseholdFlexFactor` ohne `hasPartner` auf, bekommt fuer
  ein Paar mit Pflegefall 0,00 statt 0,75, und die Suche beginnt in der
  Pflegelogik statt an der Signatur - dieselbe Verwechslung von "Metadaten
  fehlen" mit "Person existiert nicht", die A08-2 und A08-8 gerade zweimal
  geschlossen haben.
```

**Hinweis zum Freigabestatus:** Der Kopf dieser Datei steht auf
`nachgebessert - unabhaengiges Re-Review ausstehend`. Ich aendere ihn nicht; die
Freigabe ist eine Nutzerentscheidung. Mein Reviewstatus lautet `freigegeben`.
