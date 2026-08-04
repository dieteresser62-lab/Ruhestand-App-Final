# Slice 10 - Optimizer-Parameter und Apply-Paritaet

**Stand:** 2026-07-27  
**Status:** freigegeben - unabhaengiges Re-Review (Claude & Gemini) abgeschlossen  


**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Reviewer:** Antigravity (Gemini), optional Claude  
**GitHub-Status:** Branch nur lokal; Push nach Nutzerfreigabe  
**Uebergeordneter Plan:** [SUITE_DATENINTEGRITAET_HARDENING_PLAN.md](./SUITE_DATENINTEGRITAET_HARDENING_PLAN.md)

## Ziel und Findings

**Findings:** OPT-01, OPT-03 bis OPT-05 und SIM-07  
**Prioritaet:** P1

Jeder Auto-Optimize-Kandidat wird ueber eine einzige Parameterregistry auf
kanonische Simulator-Requestfelder abgebildet. Bewertung und spaetere
Uebernahme verwenden denselben versionierten Parameterfingerprint. Gueltige
Nullwerte bleiben erhalten. Der direkte VPW-Horizont ist nur im expliziten
Modus `direct` wirksam; fuer aktuarische Methoden wird das Direktfeld sichtbar
als nicht anwendbar ausgewiesen und nicht optimiert. Sampling-, CAPE-,
Datenfilter-, Runzahl- und Seedannahmen stammen aus dem kanonischen
Monte-Carlo-Vertrag und werden im Championbericht offengelegt.

## Verbindliche Entscheidungen

- **D-08:** `horizonYears` ist nur bei `horizonMethod=direct` ein wirksamer
  Requestparameter. `mean` und `survival_quantile` beziehen ihren Horizont aus
  dem kanonischen aktuarischen Resolver.
- **D-18:** Auto-Optimize uebernimmt die konfigurierten MC-Sampling-, CAPE-,
  RNG-, Block- und Datenfilterannahmen. Train- und Bestaetigungsseeds sind
  getrennte, versioniert ausgewiesene Mengen.
- Ein Parameter ohne gueltigen Registryeintrag oder ohne Anwendbarkeit im
  aktuellen Modellmodus wird vor der ersten Kandidatenevaluation
  fail-closed abgewiesen.
- Der Apply-Pfad verifiziert den evaluierten Fingerprint vor der Mutation und
  den aus den Formularwerten gelesenen Fingerprint nach der Mutation.

## Akzeptanzkriterien

- O-15 ist fuer Parameter- und Apply-Fingerprint gruen.
- O-20 ist fuer den direkten Horizont 15/55 und die sichtbare
  Nichtanwendbarkeit in aktuarischen Modi gruen.
- `goldTargetPct` schreibt und liest kanonisch `goldZielProzent`; Kandidaten
  mit 0 und 25 Prozent besitzen verschiedene Requestfingerprints und
  diskriminierende Ergebnisse in einem geeigneten deterministischen Szenario.
- `maxSkimPct=0` und `maxBearRefillPct=0` bleiben in Evaluation,
  Current-Config und Apply exakt 0.
- Jeder angebotene Parameter besitzt Registry-Domain, kanonischen Request-Key,
  Formularziel, Apply-Funktion, Request-Perturbationstest und mindestens einen
  Kausalitaets-Witness.
- Nicht anwendbare beziehungsweise unbekannte Parameter werden weder
  evaluiert noch angewendet.
- Train- und Bestaetigungsseeds sind disjunkt und im Ergebnisvertrag sichtbar.
- Championbericht nennt Samplingmethode, RNG-Modus, Runzahl, Blockgroesse,
  CAPE-Sampling, Datenfilter, Seedmengen und fixierte Modellannahmen.
- Normaler MC und Optimizer weichen bei Sampling/CAPE nicht still voneinander
  ab.

## Scope

### Programmdateien

- `app/simulator/auto-optimize-param-meta.js`
- `app/simulator/auto-optimize-evaluate.js`
- `app/simulator/auto_optimize.js`
- `app/simulator/auto-optimize-apply.js`
- `app/simulator/auto-optimize-renderer.js`
- `app/simulator/auto-optimize-presets.js`
- `app/simulator/dynamic-flex-runner-horizon.js`
- `Simulator.html`

### Tests und Dokumentation

- `tests/auto-optimizer.test.mjs`
- `tests/auto-optimize-worker-contract.test.mjs`
- `tests/longevity-optimizer-docs.test.mjs`
- `tests/auto-optimize-fidelity.test.mjs` (neu)
- `tests/README.md`
- `docs/internal/SLICE_SUITE_DATA_10_AUTO_OPTIMIZE_FIDELITY.md`
- `docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md`

## Nicht-Scope

- keine Neudefinition der Optimizer-Zielmetriken aus Slice 11;
- keine Aenderung der Monte-Carlo-Ergebnis- oder Drawdownsemantik;
- keine Aenderung der Haushalts-, Pflege-, Longevity- oder
  Tail-Risk-Semantik;
- keine Aenderung der allgemeinen RNG- oder `makeRunSeed()`-Implementierung;
- keine Aenderung von `engine/`, der oeffentlichen `EngineAPI` oder
  `engine.js`;
- keine Aenderung von `dist/` oder `RuheStandSuite.exe`;
- keine fachliche externe Validierung des experimentellen Optimizers.

## Branch- und Statuscheck vor Coding

Ausgefuehrt am 2026-07-27 vor Anlage dieser Slice-MD.

### `git branch --show-current`

```text
codex/suite-datenintegritaet-hardening
```

### `git status --short`

```text
```

Der Worktree war vor Anlage dieser Slice-MD sauber. Slice 09 ist freigegeben
und lokal committed (`802093b`). Der Branch besitzt keinen Upstream und ist
nur lokal.

## Diff-Risiko

```text
Geplante Dateien:
- app/simulator/auto-optimize-param-meta.js
- app/simulator/auto-optimize-evaluate.js
- app/simulator/auto_optimize.js
- app/simulator/auto-optimize-apply.js
- app/simulator/auto-optimize-renderer.js
- app/simulator/auto-optimize-presets.js
- app/simulator/dynamic-flex-runner-horizon.js
- Simulator.html
- tests/auto-optimizer.test.mjs
- tests/auto-optimize-worker-contract.test.mjs
- tests/longevity-optimizer-docs.test.mjs
- tests/auto-optimize-fidelity.test.mjs
- tests/README.md
- docs/internal/SLICE_SUITE_DATA_10_AUTO_OPTIMIZE_FIDELITY.md
- docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md

Voraussichtliche Aenderungstiefe:
- riskant

Gefaehrdete bestehende Tests:
- Auto-Optimize Sampling, Kandidatenvalidierung und Presets
- Auto-Optimize Worker-/Serial-Paritaet
- Dynamic-Flex Horizon- und Longevity-Vertraege
- Simulator-UI-Orchestrierung und Browser-Workflow
- kanonische Gold- und Nullwertvertraege
- MC-Sampling-, CAPE- und Datenfiltervertrag

Nicht anfassen:
- Auto-Optimize-Zielmetrikdefinitionen aus Slice 11
- Monte-Carlo-Ergebnis- und Drawdownsemantik
- Haushalts-, Pflege-, Longevity- und Tail-Risk-Semantik
- allgemeine RNG-/makeRunSeed()-Implementierung
- engine/
- engine.js
- dist/
- RuheStandSuite.exe

Rollback-Strategie:
- git checkout -- app/simulator/auto-optimize-param-meta.js app/simulator/auto-optimize-evaluate.js app/simulator/auto_optimize.js app/simulator/auto-optimize-apply.js app/simulator/auto-optimize-renderer.js app/simulator/auto-optimize-presets.js app/simulator/dynamic-flex-runner-horizon.js Simulator.html tests/auto-optimizer.test.mjs tests/auto-optimize-worker-contract.test.mjs tests/longevity-optimizer-docs.test.mjs tests/README.md docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md
- Neue Test- und Slice-Dateien nur nach ausdruecklicher Freigabe loeschen.
```

Es sind exakt acht Programmdateien vorgesehen. Die projektweite Stop-Regel
von mehr als zehn Programmdateien und das Slice-Maximum von acht greifen
nicht. Wird eine neunte Produktdatei erforderlich, stoppt die Umsetzung vor
dem Edit und der Slice wird geteilt oder neu freigegeben.

## Geplante Umsetzung

1. Zentrale Parameterregistry mit Domain, kanonischem Request-Key,
   Anwendbarkeit, Input-/Form-Reader und Apply-Funktion einfuehren.
2. Candidate-Evaluation und Current-Config auf diese Registry umstellen;
   `goldZielProzent` und Null-Caps erhalten.
3. Versionierte Parameter- und Requestfingerprints erzeugen und im
   Evaluate-/Apply-Roundtrip verifizieren.
4. Aktuarische und direkte Horizon-Modi im Resolver trennen; UI und
   Optimizer weisen die Modusgrenze sichtbar aus.
5. MC-Sampling-/CAPE-/Datenfilterannahmen aus den Haupt-Controls ueber den
   kanonischen Parameter-Normalisierer in jede Evaluation uebernehmen.
6. Train-/Bestaetigungsseeds disjunkt erzeugen und mit allen
   Optimierungsannahmen im Resultshape und Championbericht ausweisen.
7. Parameter-Perturbations-, Kausalitaets-, Roundtrip-, Worker- und
   Browsergates ausfuehren.

## Geplante Tests

- `node tests/run-single.mjs tests/auto-optimize-fidelity.test.mjs`
- `node tests/run-single.mjs tests/auto-optimizer.test.mjs`
- `node tests/run-single.mjs tests/auto-optimize-worker-contract.test.mjs`
- `node tests/run-single.mjs tests/longevity-optimizer-docs.test.mjs`
- relevante Dynamic-Flex-/Longevity- und UI-Orchestrierungstests
- `npm test`
- `npm run test:browser`
- `npm run test:coverage`
- `git diff --check`

## Durchgefuehrte Aenderungen

- Eine zentrale Produktionsregistry definiert pro Optimierungsparameter
  Domain, kanonischen Request-Key, Modusanwendbarkeit, Formularziel sowie
  Input-/Apply-Logik. Evaluation, Current-Config und Apply verwenden diese
  Registry; unbekannte, ungueltige oder im Modellmodus nicht anwendbare
  Parameter werden fail-closed abgewiesen. Die Domains entsprechen den
  kanonischen Enginegrenzen; die Runway-Reihenfolge wird auch bei nur einer
  optimierten Runway-Dimension gegen die feste Basis validiert.
- `goldTargetPct` wird end-to-end auf `goldZielProzent` abgebildet.
  `goldAllokationProzent` wird nicht mehr in den Evaluationsrequest
  geschrieben. Explizite Nullwerte fuer Gold-, Skim- und Bear-Refill-Caps
  bleiben erhalten.
- `AutoOptimizeParameterFingerprintV1` und
  `AutoOptimizeRequestFingerprintV1` verbinden Evaluation und Apply. Der
  Apply-Pfad verlangt den evaluierten Champion, prueft Modusanwendbarkeit und
  alle Formularziele vor der ersten Mutation und liest danach die
  Formularwerte fuer einen zweiten Fingerprintvergleich zurueck.
- `AutoOptimizeEvaluationContractV1` uebernimmt Samplingmethode, RNG-Modus,
  Blockgroesse, CAPE-Schalter, Datenfilter und die relevanten fixierten
  Modellannahmen aus dem kanonisch normalisierten MC-Request.
  `AutoOptimizeSeedContractV1` trennt Train- und Bestaetigungsseeds
  deterministisch und disjunkt.
- Preset und interaktive Parameterliste bieten den direkten Horizon nicht
  mehr unter aktuarischem Dynamic Flex an. Der Runner verwendet
  `horizonYears` nur im expliziten Modus `direct`; 15 und 55 Jahre werden
  unveraendert konsumiert. In `mean` und `survival_quantile` ist das
  Direktfeld sichtbar als nicht anwendbar bezeichnet.
- Der Championbericht weist Methoden-, CAPE-, Filter-, Seed- und
  Fingerprint-Provenienz sowie die fixierten Annahmen aus.
- Die neue Fidelity-Suite prueft Registry-Perturbationen, Gold- und
  Nullwertsemantik, Direct-Horizon, normalen MC-Hot-Path,
  Evaluate-/Apply-Roundtrip und Manipulationsabwehr. Alle acht angebotenen
  Parameter besitzen einen deterministischen MC-Kausalitaets-Witness.
  `maxBearRefillPct` bleibt fuer explizite Nullwert-/Apply-Vertraege
  registriert, ist mangels Runner-Wirkungsnachweis aber nicht mehr interaktiv
  optimierbar.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/auto-optimize-fidelity.test.mjs`:
  106/106 Assertions gruen.
- `node tests/run-single.mjs tests/auto-optimizer.test.mjs`:
  82/82 Assertions gruen.
- `node tests/run-single.mjs tests/auto-optimize-worker-contract.test.mjs`:
  11/11 Assertions gruen.
- `node tests/run-single.mjs tests/longevity-optimizer-docs.test.mjs`:
  27/27 Assertions gruen.
- Relevante Grenz-, Runner-, Worker-, Persistenz- und UI-Suiten:
  44/44 kanonische Zahlengrenzen, 23/23 Longevity-Runner,
  160/160 Monte Carlo, 430/430 Worker-Paritaet, 53/53 Input-Reader,
  10/10 Dynamic-Flex-Persistenz, 18/18 Longevity-UI-Persistenz und
  56/56 UI-Orchestrierung gruen.
- `npm test`: 135 Testdateien, 8.080/8.080 Assertions, keine fehlgeschlagene
  Datei und keine offenen Handles.
- `npm run test:browser`: 16/16 Browser-Szenarien gruen.
- `npm run test:coverage`: 8.080/8.080 Assertions und alle Coverage-Gates
  gruen; gesamt 78,25 Prozent (35.774/45.715 ausfuehrbare Zeilen).
- `git diff --check`: gruen.

## Abweichungen vom Plan

- Statt `app/simulator/monte-carlo-runner.js` zu aendern, wurde die bestehende
  Runnergrenze in `dynamic-flex-runner-horizon.js` erweitert. Der normale
  Monte-Carlo-Hot-Path ist mit direkten Horizonten 15/55 end-to-end getestet.
- Der Championbericht erforderte `auto-optimize-renderer.js`; fuer die
  Presetbereinigung wurde `auto-optimize-presets.js` geaendert. Beide Dateien
  liegen innerhalb des dokumentierten Maximums von exakt acht
  Programmdateien.
- `auto-optimize-params.js` wurde nicht geaendert. Produktionspfade beziehen
  Parameterdomain und Normalisierung nun aus der zentralen Registry in
  `auto-optimize-param-meta.js`.
- Die oeffentliche EngineAPI und generierte Artefakte wurden nicht geaendert;
  daher war kein `npm run build:engine` erforderlich.

## Offene Risiken

- Der direkte Horizon-Modus ist ein App-/Runnervertrag; die Engine erhaelt
  weiterhin den bereits aufgeloesten effektiven Horizonwert. Die
  oeffentliche Engine-Semantik wird in diesem Slice nicht erweitert.
- `auto-optimize-params.js` bleibt als nicht mehr von Produktionspfaden
  importiertes Legacy-Modul bestehen. Eine physische Bereinigung ist
  ausserhalb dieses auf acht Programmdateien begrenzten Slices sinnvoll.
- Der Apply-Fingerprint prueft die kanonischen Parameterwerte und die
  erforderlichen Gold-/Go-Go-Aktivierungszustande. Eine spaetere
  Profilauswahl kann profilgebundene Felder dennoch erneut setzen; dieser
  Ownership-/Persistenzvertrag bleibt als E10-9 ausserhalb des Slice offen.
- Auto-Optimize bleibt trotz technischer Paritaet ein experimenteller,
  nicht extern validierter Modellvergleich.

## Rueckdokumentation

Technische Umsetzung, Tests, Abweichungen und Restrisiken sind hier und in
`SUITE_DATENINTEGRITAET_HARDENING_PLAN.md` dokumentiert. Codex erteilt keine
Eigenfreigabe.

## Freigabestatus

- Technische Umsetzung: Blocker-Nachbesserung abgeschlossen
- Selbstpruefung Codex: technisch abgeschlossen, keine Eigenfreigabe
- Re-Review Gemini/Claude/Nutzer: erfolgreich abgeschlossen; Slice 10 ist freigegeben
- Lokaler Commit: abgeschlossen

- Push: ausstehend; nur nach ausdruecklicher Nutzerfreigabe


## Review-Feedback von Gemini

**Review-Datum:** 2026-07-27 (Erstes Review: Blocker E10-1..E10-3 bestätigt; Zweites Review: Abschlussreview nach Nachbesserung)  
**Reviewer:** Antigravity (Gemini 3.6 Flash)  
**Pruefgegenstand:** Nachgebesserter Arbeitsstand von Codex auf `codex/suite-datenintegritaet-hardening` (8 Programmdateien, 2 Testdateien) sowie die Nachbesserungen zu E10-1..E10-10, G10-1 und G10-2.

### Evaluation der Blocker-Nachbesserung

1. **Verifizierung der Behobenen Blocker:**
   - **E10-1 (Domain-Abgleich & Später Abbruch): BEHOBEN.** HTML-Eingabefelder in `Simulator.html` und Registry-Domains sind exakt aufeinander abgestimmt (`rebalBand` 1..20, `survivalQuantile` 0,50..0,99, `goGoMultiplier` 1,00..1,50). Baseline- und Formularprüfungen scheitern mit dem Fehlercode `AUTO_OPTIMIZE_PARAMETER_DOMAIN_INVALID` nach exakt 0 Kandidatenevaluationen – vor dem Sampling und vor dem Rechenlauf.
   - **E10-2 (Direct-Horizon-Parität): BEHOBEN.** In `resolveDynamicFlexRunnerHorizon` ist `horizonYears` im Modus `direct` der unberührte, finale Endhorizont. Aktuarische Longevity-Puffer (`buffer_years`, `relative_horizon_buffer`, `quantile_shift`) und Transition-Smoothing werden im `direct`-Modus übergangen. Die Fingerprints bezeugen im `direct`-Modus exakt den simulierten Wert (15 bleibt 15, 55 bleibt 55).
   - **E10-3 (`maxBearRefillPct`-Wirkungslosigkeit): BEHOBEN.** `maxBearRefillPct` wurde aus der interaktiven Parameterliste (`AUTO_OPTIMIZE_PARAMETER_OPTIONS`) und allen Presets entfernt. Alle 8 verbleibenden optimierbaren Parameter besitzen nun nachweisbare, deterministische MC-Kausalitäts-Witnesses.

2. **Verifizierung der Restrisiken & Hinweise (E10-4..E10-10, G10-1, G10-2):**
   - **E10-4 (MC-Control-Reader):** Auto-Optimize liest MC-Parameter über den kanonischen Reader `readMonteCarloParameters()` statt duplizierter Defaults.
   - **E10-5 / G10-1 (Suchraum & Preflight):** Parameter-Domains und Schrittweiten werden beim Erstellen von Blöcken eingehalten; leere Suchräume oder unzulässige Ranges werden vor Sampling abgewiesen.
   - **E10-6 (Preset-Robustheit):** Das Dynamic-Flex-Preset setzt keine spezifische Horizon-Methode voraus und läuft sowohl in `mean` als auch in `survival_quantile`.
   - **E10-7 (Evaluate-Fingerprint):** Parameter- und Requestfingerprints werden aus dem nach der Mutation aus `inputs` zurückgelesenen Zustand erzeugt.
   - **E10-8 (Apply-Verifikation):** Apply prüft auch `goldAllokationAktiv` und `goGoActive` und bricht mit `AUTO_OPTIMIZE_APPLY_SIDE_EFFECT_MISMATCH` ab, wenn das Schreiben fehlschlägt.
   - **E10-9 (Profil-Override):** Der verbleibende Zustand bei nachträglicher Profilauswahl ist als Modellgrenze/Hinweis transparent in der Apply-Erfolgsmeldung deklariert.
   - **E10-10 (Dokumentations-Sync):** Hauptplan, Slice-MD und `tests/README.md` wurden synchronisiert.
   - **Formale Gates:** `npm test` mit **8.080 / 8.080 Assertions zu 100% grün**, 0 offene Handles, 16/16 Browser-Szenarien grün, Coverage-Gates bei 78,25% Gesamtdeckung erfüllt.

### Re-Review-Ergebnis (Gemini)

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine. (E10-1, E10-2, E10-3 vollständig behoben).
- Restrisiken: 
  1. E10-9 (Claude): Apply schreibt Champion-Werte in profilgebundene Felder; eine spätere erneute Profilauswahl kann diese überschreiben (als Hinweis in der UI ausgewiesen).
  2. E10-4 bis E10-8, G10-1, G10-2: Als nachgebesserte Modellgrenzen/Hinweise verifiziert.
- Pre-Mortem: Eine nachträgliche Profilauswahl in der UI setzt profilgebundene Eingabefelder (z. B. Ziel-Aktienquote) auf den Profilstandard zurück, was den zuvor angewendeten Champion überschreibt.
```

### Aktualisierte Entscheidungstabelle

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| E10-1 | Claude 2026-07-27 | Registry-Domains enger als HTML-Domains; späte Entwertung nach 168 Evaluationen | angenommen | **geschlossen** - Domains in Formular und Registry abgeglichen; Preflight prüft vor Sampling nach 0 Evaluationen |
| E10-2 | Claude 2026-07-27 | Longevity-Modus überschreibt direkten Horizont still | angenommen | **geschlossen** - `direct`-Modus ist unberührter Endhorizont; Longevity-Puffer in `direct` deaktiviert |
| E10-3 | Claude 2026-07-27 | `maxBearRefillPct` hat keine kausale Wirkung auf Optimizer-Metriken | angenommen | **geschlossen** - aus interaktiven Pickern/Presets entfernt; 8 verbleibende Parameter besitzen MC-Witnesses |
| G10-1 | Gemini 2026-07-27 | Generische Candidate-Rejection-Meldung im Worker-Kontext | angenommen | **geschlossen** - Range-Preflight prüft vor Sampling mit konkreten Fehlercodes |
| G10-2 | Gemini 2026-07-27 | Baseline-Evaluation bricht ab bei inaktivem `dynamicFlex` | angenommen | **geschlossen** - Config-/Modus-Preflight vor Baseline-Evaluation umgesetzt |


## Review-Feedback von Claude

**Datum:** 2026-07-27  

**Rolle:** unabhaengiger, adversarialer Review (Erstreview zu Slice 10)  
**Pruefgegenstand:** Arbeitsbaumstand des Feature-Branches
`codex/suite-datenintegritaet-hardening` (acht Programmdateien, zwei
Testdateien, `tests/README.md`, Hauptplan, diese Slice-MD)

### Unabhaengig nachgefahrene Gates

| Gate | Ergebnis |
| --- | --- |
| `npm test` | 8.036/8.036 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles |
| `git diff --check` | gruen |
| Scope | keine Aenderung unter `engine/`, `dist/`, Goldens oder Snapshots |

Die von Codex berichteten Zahlen sind reproduzierbar. Der Umfang von exakt
acht Programmdateien ist eingehalten.

### Was gegenueber dem Vorzustand belegbar besser ist

- OPT-01 ist inhaltlich geschlossen. Ausserhalb der Registry existiert kein
  Konsument mehr, der `inputs.goldAllokationProzent` liest; der Evaluationspfad
  erzeugt den Legacy-Key nicht mehr.
- OPT-04 ist geschlossen: `??=` ersetzt die frueheren Falsy-Defaults, explizite
  Nullwerte fuer Gold-, Skim- und Bear-Refill-Cap ueberleben Evaluation,
  Current-Config und Apply.
- Die Runway-Ordnungspruefung greift jetzt auch dann, wenn nur eine der beiden
  Runway-Dimensionen optimiert wird.
- Der Apply-Pfad prueft Provenienz, Modus und Formularziele vollstaendig vor
  dem ersten Write; ein abgewiesener Champion hinterlaesst keinen teilmutierten
  Formularzustand.

Diese Punkte sind Voraussetzung, nicht Freigabegrund. Die folgenden Befunde
sind alle durch Messung belegt.

### Pruefdimension 1 - Korrektheit

#### E10-1 (Blocker): Zulaessige Formularwerte vernichten den gesamten Lauf

Die Registry-Domains sind enger als die Domains, die `Simulator.html` fuer
dieselben Felder anbietet:

| Parameter | HTML `min`/`max` | Registry-Domain | Folge |
| --- | --- | --- | --- |
| `rebalBand` | 1 bis 50 | 1 bis 20 | Werte 21 bis 50 sind eingebbar, aber ungueltig |
| `survivalQuantile` | 0,5 bis 0,99 | 0,75 bis 0,95 | Werte unter 0,75 und ueber 0,95 sind eingebbar, aber ungueltig |
| `goGoMultiplier` | 1,0 bis 1,5 | 1,0 bis 1,35 | Werte ueber 1,35 sind eingebbar, aber ungueltig (Schrittweite 0,05) |

Neu in diesem Slice ist, dass die Vergleichskonfiguration ueber
`readAutoOptimizeCandidateFromInputs()` aus den Rahmendaten gelesen und
anschliessend durch denselben Normalisierer geschickt wird wie ein Kandidat.
`readAutoOptimizeCandidateFromInputs()` prueft nur auf Endlichkeit, nicht auf
die Domain. Der Domainfehler entsteht deshalb erst beim allerletzten
Evaluationsaufruf.

Gemessen mit `rebalBand = 30` im Formular und `rebalBand` als optimiertem
Parameter, Produktionsnormalisierung im Evaluator:

```text
ABBRUCH nach 168 Kandidatenevaluationen
  code    = AUTO_OPTIMIZE_PARAMETER_DOMAIN_INVALID
  message = Rebal Band liegt ausserhalb der zulaessigen Domain.
```

`runAutoOptimize()` wirft, `auto_optimize_ui.js` faengt den Fehler in einem
`alert()` ab, `window.aoChampionResult` bleibt ungesetzt und der Apply-Button
erscheint nicht. Der vollstaendige Rechenaufwand - in der Werkseinstellung 168
Evaluationen zu je 2.000 Runs ueber mehrere Seeds - ist verloren. Die
Fehlermeldung nennt einen Parameter, den der Nutzer im Formular nicht als
falsch erkennen kann, weil das Feld den Wert ausdruecklich erlaubt.

Die eigene Entscheidung dieses Slices lautet: „Ein Parameter ohne gueltigen
Registryeintrag oder ohne Anwendbarkeit im aktuellen Modellmodus wird vor der
ersten Kandidatenevaluation fail-closed abgewiesen." Fuer die Anwendbarkeit
wird das ueber `assertAutoOptimizeParameterSet()` eingehalten; fuer die Domain
der Rahmendaten wird es verletzt.

#### E10-2 (Blocker): Longevity ersetzt den direkten Horizont still

D-08 und O-20 erklaeren `horizonYears` bei `horizonMethod=direct` zum
wirksamen Requestparameter. Der Resolver ruft aber weiterhin
`applyLongevityHorizonAdjustment()` auf, ohne den Direktmodus auszunehmen:

| Longevity-Modus | angefordert 15 | angefordert 55 |
| --- | --- | --- |
| `none` | 15 | 55 |
| `buffer_years` +5 | **20** | **60** |
| `buffer_years` +10 | **25** | **60** |
| `relative_horizon_buffer` +20 % | **18** | **60** |
| `quantile_shift` +0,05 | 15 | 55 |

Der Effekt ist nicht diagnostisch, sondern materiell. End-to-end ueber
`evaluateCandidate()`, 100 Runs, 30 Jahre, Seeds 1703/1704:

```text
Anforderung 15 mit buffer_years +10 -> Fingerprint sagt horizonYears=15, medianEndWealth = 1.828.332,85 EUR
Anforderung 25 ohne Longevity-Buffer -> medianEndWealth = 1.828.332,85 EUR   (bitgleich)
Anforderung 15 ohne Longevity-Buffer -> medianEndWealth = 1.537.180,62 EUR
```

Der Lauf hat nachweisbar 25 Jahre verwendet, waehrend
`AutoOptimizeRequestFingerprintV1` 15 bezeugt. Der Unterschied zwischen
bezeugtem und verwendetem Request betraegt in dieser Messung
291.152,23 EUR Median-Endvermoegen. Zusaetzlich meldet die Diagnostik in
genau diesem Fall `directInputApplicable: true`, obwohl der Direktwert
ersetzt wurde.

Das ist dieselbe Fehlerklasse, die OPT-03 und SIM-07 beschreiben - eine als
direkte Vorgabe bezeichnete Eingabe, die der Lauf nicht verwendet -, nur eine
Ebene tiefer verschoben. Der mitgelieferte Test pinnt ausschliesslich
`longevityMode: 'none'` und kann den Fall nicht sehen.

Einschraenkung, die ich ausdruecklich festhalte: `direct` steht weder in
`DYNAMIC_FLEX_ALLOWED_HORIZON_METHODS` (`simulator-input-strategy.js`) noch in
der Profilnormalisierung; der Modus ist heute ueber kein Nutzerformular
erreichbar. Der Defekt liegt damit im normativen Requestvertrag, den dieser
Slice selbst geschaffen hat, nicht im Produktivpfad. Er wird in dem Moment
produktiv, in dem `direct` in die erlaubte Menge aufgenommen oder ein Request
ausserhalb des Formulars gebaut wird - und genau darauf ist der Vertrag
angelegt.

#### E10-3 (Blocker): Eine angebotene Dimension ohne Wirkungsnachweis

`maxBearRefillPct` steht in `AUTO_OPTIMIZE_PARAMETER_OPTIONS` und wird dem
Nutzer als optimierbare Dimension angeboten. Der volle Bereich 0 gegen 70
veraendert in acht gemessenen Szenarien keine einzige Metrik, die der
Optimizer bewertet (`medianEndWealth`, `successProbFloor`, `depletionRate`,
`timeShareWRgt45`, `worst5Drawdown`, `p10EndWealth`, `p25EndWealth`), jeweils
bis 1e-9:

| Szenario | Runs x Jahre | Ergebnis |
| --- | --- | --- |
| Testszenario der Suite | 5 x 10 | kein Effekt |
| Standard | 200 x 30 | kein Effekt |
| knappe Liquiditaet | 200 x 30 | kein Effekt |
| Stress `DOUBLE_BEAR_00s` | 200 x 30 | kein Effekt |
| Stress `GREAT_DEPRESSION_29_33` | 200 x 30 | kein Effekt |
| Drei-Topf-Strategie | 200 x 30 | kein Effekt |
| sehr knappe Liquiditaet | 300 x 40 | kein Effekt |
| Zwischenwerte 12 gegen 70 | 200 x 30 | kein Effekt |

Zur Kontrolle: `maxSkimPct` 0 gegen 50 bewegt im selben Aufbau
`medianEndWealth` um 20.530 EUR, `depletionRate` um 2,5e-3 und
`worst5Drawdown` um 2,2e-3. Die Messmethode ist also diskriminierend.

Die Ursache ist in `computeCappedRefill()` sichtbar. Bei kritischer Liquiditaet
gilt `effectiveMaxCap = max(pct/100 * aktienwert, 0,10 * aktienwert)`:

```text
aktienwert 500.000, Liquiditaetsbedarf 50.000
maxBearRefillPct   isCriticalLiquidity=false   isCriticalLiquidity=true
0                  0                           50000
5                  25000                       50000
10                 50000                       50000
70                 50000                       50000
```

Der Aufrufer in `transaction-action.mjs` setzt
`isCriticalLiquidityBear = Liquiditaet < 1,5 x Puffer ODER Zieldeckung < 75 %`
- also genau dann true, wenn die Guardrail-Luecke den Bear-Refill ueberhaupt
ausloest. Der mitgelieferte Witness ruft `computeCappedRefill()` mit
`isCriticalLiquidity: false` auf und trifft damit die einzige Zelle, in der ein
Unterschied entsteht.

Das Akzeptanzkriterium „mindestens einen Kausalitaets-Witness" ist dem
Wortlaut nach erfuellt. Die Stop-Regel des Hauptplans zu diesem Slice lautet
aber: „Stop, wenn fuer eine angebotene Dimension kein kausaler
Wirkungsnachweis konstruierbar ist." Fuer die Zielfunktion des Optimizers ist
er nicht konstruierbar; der Champion-Wert dieser Dimension entsteht aus
Tie-Breaking und LHS-Reihenfolge und wird dem Nutzer als Optimierungsergebnis
praesentiert. Die Stop-Regel wurde ausgeloest und nicht befolgt.

### Pruefdimension 2 - Vertragstreue

#### E10-4 (Restrisiko): Der Optimizer dupliziert den MC-Lesepfad

`buildAutoOptimizeEvaluationContract()` liest die neun MC-Controls mit eigenen
`readControlValue()`/`readControlChecked()`-Aufrufen und stillen Defaults,
statt den kanonischen `readMonteCarloParameters()` aus `monte-carlo-ui.js` zu
verwenden. Gemessen mit fehlendem `mcMethode`:

```text
normaler MC-Reader: ABBRUCH -> UI-Element fehlt: Monte-Carlo Methode (id=mcMethode)
Optimizer:          laeuft durch; methode="regime_markov", source="main_monte_carlo_controls"
```

Der Optimizer meldet in diesem Fall eine Provenienz, die nicht zutrifft: der
Wert stammt aus einem Default, nicht aus den Haupt-Controls. Heute existieren
alle neun IDs, der Befund ist deshalb ein Restrisiko und kein Live-Fehler. Die
Duplizierung ist aber genau der Mechanismus, ueber den D-18 wieder auseinander
laufen kann - eine kuenftige Erweiterung von `readMonteCarloParameters()`
erreicht den Optimizer nicht.

#### E10-7 (Restrisiko): Die Fingerprintpruefung im Evaluate-Pfad ist wirkungslos

`evaluateCandidate()` berechnet Parameter- und Requestfingerprint aus dem
normalisierten Kandidaten und liest nichts aus dem mutierten `inputs`-Objekt
zurueck. `runAutoOptimize()` vergleicht diese Werte anschliessend gegen
Fingerprints, die es mit denselben Funktionen aus demselben Kandidaten
berechnet. Der Vergleich kann in Produktion nicht fehlschlagen; er schuetzt
allein gegen ein abweichendes injiziertes `evaluateCandidateFn`.

Insbesondere schuetzt er nicht gegen die Fehlerklasse, fuer die er eingefuehrt
wurde: schriebe eine `applyInput`-Funktion in den falschen Request-Key - der
OPT-01-Defekt -, blieben beide Fingerprints unveraendert korrekt. Die
Asymmetrie ist im Code sichtbar: der Apply-Pfad liest den Formularzustand
zurueck, der Evaluate-Pfad liest `inputs` nicht zurueck. E10-2 ist der
gemessene Fall, in dem bezeugter und tatsaechlich simulierter Request
auseinanderfallen.

#### E10-8 (Restrisiko): Die Rueckleseprobe deckt nur einen Teil der Schreibziele

Der Preflight prueft alle `requiredFormIds`, die Rueckleseprobe liest
anschliessend nur `definition.formId`. `goldAllokationAktiv` und `goGoActive`
werden geschrieben, aber nie verifiziert. Fuer Gold ist das die relevante
Luecke: der kanonische Reader liefert
`goldZielProzent = goldAktiv ? readNumber('goldAllokationProzent') : 0`. Genau
das eine Feld, das den Champion-Goldanteil still auf 0 setzen kann, liegt
ausserhalb der Verifikation, waehrend `AutoOptimizeApplyFidelityV1` den
Zustand als geprueft ausweist.

### Pruefdimension 3 - Fehlerbehandlung

#### E10-5 (Restrisiko): Werkseinstellung erzeugt leere und verengte Suchraeume

Ein frisch angelegter Parameterblock hat `min = 0` und `max = 100`
(`createAutoOptimizeParameterBlock`). Ueber 100 LHS-Ziehungen:

| Parameter | gueltig vorher | gueltig nachher |
| --- | --- | --- |
| `runwayMinM` | 100 | 24 |
| `runwayTargetM` | 100 | 50 |
| `targetEq` | 100 | 71 |
| `rebalBand` | 50 | 20 |
| `maxSkimPct` | 100 | 50 |
| `maxBearRefillPct` | 100 | 71 |
| `survivalQuantile` | 0 | 0 |
| `goGoMultiplier` | 1 | 1 |

Zwei Folgen. Erstens bricht der Lauf bei `survivalQuantile` mit der Meldung
`Quick filter failed: all candidates produced invalid results` ab - eine
Meldung, die Evaluationsergebnisse beschuldigt, obwohl nichts evaluiert wurde
und die Kandidaten vorher an der Domain gescheitert sind. Zweitens wird der
vom Nutzer eingetragene Suchbereich fuer die uebrigen Parameter still verengt;
weder Fortschrittsanzeige noch Championbericht weisen aus, dass nur ein Teil
des angeforderten Bereichs durchsucht wurde. Der leere Kandidatenraum ist bei
`survivalQuantile` nicht neu, die Verengung bei `runwayMinM`, `rebalBand`,
`targetEq`, `maxSkimPct` und `maxBearRefillPct` schon.

#### E10-6 (Restrisiko): Mitgeliefertes Preset bricht in einem der beiden UI-Modi ab

Der Evaluator setzte frueher bei einem `survivalQuantile`-Kandidaten still
`inputs.horizonMethod = 'survival_quantile'`. Dieser Ersatz ist entfernt - das
ist richtig und schliesst einen Teil von OPT-05. `applyDynamicFlexMode()` setzt
aber nur `dynamicFlex`, nicht `horizonMethod`. Gemessen mit dem mitgelieferten
Preset:

```text
Preset "Dynamic Flex" (survivalQuantile, goGoMultiplier)
  Formular horizonMethod=survival_quantile -> Champion {"survivalQuantile":0.91,"goGoMultiplier":1.05}
  Formular horizonMethod=mean              -> ABBRUCH AUTO_OPTIMIZE_PARAMETER_NOT_APPLICABLE
                                              "VPW Quantile ist fuer die aktuellen Rahmendaten nicht anwendbar."
```

Der Abbruch erfolgt vor der ersten Evaluation, es geht also keine Rechenzeit
verloren. Das mitgelieferte Preset bietet damit jedoch eine Konfiguration an,
die in einem der beiden waehlbaren Horizon-Modi grundsaetzlich nicht laufen
kann, und die Meldung nennt die Abhilfe - Horizon-Methode umstellen - nicht.

### Pruefdimension 4 - Seiteneffekte

#### E10-9 (Restrisiko): Apply schreibt in profilgetriebene Hidden-Felder

`goldAllokationProzent` und `goldAllokationAktiv` sind
`<input type="hidden" data-no-persist="true">` und werden von
`applyCombinedInputsToUI()` aus den Profildaten neu gesetzt. Dieselbe Funktion
ueberschreibt zusaetzlich `runwayMinMonths`, `runwayTargetMonths`, `targetEq`,
`rebalBand`, `maxSkimPctOfEq` und `maxBearRefillPctOfEq` - also acht der neun
Apply-Ziele. Die Zusicherung `AutoOptimizeApplyFidelityV1` gilt damit nur fuer
den Augenblick des Schreibens; die naechste Profil-(Neu-)Auswahl verwirft den
uebernommenen Champion ohne Hinweis. Die Slice-MD nennt unter „Offene Risiken"
allgemein nachgelagerte UI-Reaktionen, benennt diesen konkreten Pfad aber
nicht.

Positiv abgegrenzt: `updateStartPortfolioDisplay()`, das `applyChampionToForm()`
unmittelbar folgt, schreibt diese Felder nicht zurueck. Der Champion ueberlebt
also den Apply-Vorgang selbst.

### Pruefdimension 5 - Was koennte brechen?

#### E10-10 (Hinweis): Dokumentation behauptet mehr, als die Tests belegen

- Rueckdokumentation im Hauptplan: „der normale MC-Runner konsumiert im
  expliziten Modus `direct` die Testwerte 15/55 exakt" - ohne die Bedingung
  `longevityMode = none`; durch E10-2 widerlegt.
- Rueckdokumentation und `tests/README.md`: „der Bear-Refill-Cap ueber den
  kanonischen Transaktionspfad" - der Witness trifft einen Zweig, den der
  Runner beim Bear-Refill nicht nimmt (E10-3).
- `tests/README.md` fuehrt `auto-optimize-fidelity.test.mjs` mit „~330"
  Zeilen; die Datei hat 506.

#### Was am wenigsten durchdacht wurde

Das Zusammenspiel von Registry-Domain und bestehendem Formularzustand. Die
Registry ist konsequent als Vertrag fuer *Kandidaten* entworfen und dann ohne
Anpassung auch auf die *bestehende Konfiguration* angewendet. Kandidaten
entstehen im Optimizer und koennen verworfen werden; die bestehende
Konfiguration ist gesetzt und kann nicht verworfen werden, ohne den Lauf zu
vernichten. E10-1 und E10-5 sind zwei Auspraegungen derselben Luecke.

### Pre-Mortem

Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - die wahrscheinlichste Ursache:

Ein Nutzer stellt das Rebalancing-Band auf einen Wert oberhalb von 20 oder das
Survival-Quantil auf 0,96 - beides bietet das Formular ausdruecklich an -,
waehlt denselben Parameter zur Optimierung und startet einen Lauf ueber
2.000 Runs je Kandidat. Nach der vollstaendigen Rechenzeit erscheint ein
`alert()` mit „Rebal Band liegt ausserhalb der zulaessigen Domain", das
Ergebnis ist verloren, und es gibt keinen Weg von der Meldung zu dem Feld, das
den Wert erlaubt hat. Die Fehlersuche wird bei den Kandidaten beginnen, weil
die Meldung nach Kandidatenvalidierung klingt, obwohl die Vergleichskonfiguration
aus den Rahmendaten die Ursache ist.

### Findings-Lifecycle

- Bestehende Claude-Findings zu Slice 10: keine (Erstreview).
- Neu eingefuehrte Blocker: **E10-1**, **E10-2**, **E10-3**.
- Neu eingefuehrte Restrisiken: E10-4, E10-5, E10-6, E10-7, E10-8, E10-9.
- Neu eingefuehrte Hinweise: E10-10.
- Uebergreifend weiterhin offen: die Gold-Fachentscheidung T03-2/Y04-3 aus den
  frueheren Slices.
- Kopfzeile und Freigabestatus dieser Slice-MD wurden nicht veraendert; die
  Statusfuehrung liegt bei Nutzer und Gemini.

## Review-Ergebnis

- Status: **blockiert**
- Blocker:
  - **E10-1** - HTML-Domains sind weiter als die Registry-Domains; die aus den
    Rahmendaten gelesene Vergleichskonfiguration bricht den vollstaendigen
    Optimierungslauf erst nach 168 Kandidatenevaluationen ab. Verletzt die
    eigene Fail-closed-Entscheidung dieses Slices.
  - **E10-2** - `longevityMode = buffer_years` bzw. `relative_horizon_buffer`
    ersetzt den direkten Horizont still (15 zu 25, 55 zu 60), waehrend der
    versionierte Requestfingerprint den angeforderten Wert bezeugt; gemessene
    Abweichung 291.152,23 EUR Median-Endvermoegen. Widerlegt O-20 und D-08 in
    ihrer dokumentierten, unbedingten Form.
  - **E10-3** - `maxBearRefillPct` veraendert in acht Szenarien keine vom
    Optimizer bewertete Metrik; der mitgelieferte Witness prueft den einzigen
    Zweig, den der Runner beim Bear-Refill nicht nimmt. Die Stop-Regel des
    Hauptplans zu dieser Slice ist ausgeloest.
- Restrisiken: E10-4 (dupliziertes MC-Control-Lesen mit stillen Defaults und
  falscher Provenienzangabe), E10-5 (leere und still verengte Suchraeume bei
  Werkseinstellung des Parameterblocks), E10-6 (mitgeliefertes Dynamic-Flex-Preset
  bricht bei Horizon-Methode `mean` ab), E10-7 (Fingerprintpruefung im
  Evaluate-Pfad ohne Ruecklesen aus `inputs`), E10-8 (Rueckleseprobe deckt
  `goldAllokationAktiv` und `goGoActive` nicht ab), E10-9 (Apply-Ziele werden
  von `applyCombinedInputsToUI()` aus Profildaten ueberschrieben), E10-10
  (Dokumentationsaussagen ueber den Belegstand hinaus).
- Pre-Mortem: Eine vom Formular ausdruecklich erlaubte Eingabe fuer
  Rebalancing-Band, Survival-Quantil oder Go-Go-Faktor laesst den kompletten
  Optimierungslauf am Ende mit einer Domainmeldung scheitern; die Fehlersuche
  richtet sich auf die Kandidatenvalidierung, waehrend die Ursache die aus den
  Rahmendaten gelesene Vergleichskonfiguration ist.

## Blocker-Nachbesserung durch Codex

**Datum:** 2026-07-27  
**Status:** technisch umgesetzt; unabhaengiges Re-Review ausstehend

Die Reviewertexte und der dort festgehaltene Status `blockiert` bleiben als
historischer Reviewstand unveraendert. Codex erteilt keine Eigenfreigabe.

| Finding | Technische Reaktion | Nachweis |
| --- | --- | --- |
| E10-1 | `rebalBand` ist in Formular und Registry auf die Engine-Domain 1 bis 20 abgeglichen; Survival-Quantil 0,50 bis 0,99 und Go-Go 1,00 bis 1,50 decken die kanonischen Inputdomains ab. Suchbereiche und aktuelle Vergleichskonfiguration werden vor LHS und vor der ersten Evaluation validiert. | Ungueltiges `targetEq=91` stoppt mit `AUTO_OPTIMIZE_PARAMETER_DOMAIN_INVALID` nach exakt 0 Evaluationsaufrufen; Randbereiche werden separat getestet. |
| E10-2 | Bei `horizonMethod=direct` ist der explizite Wert der finale Horizon. Aktuarische Longevity-Anpassung und Transition-Smoothing werden fuer diesen Modus nicht angewendet; die konfigurierte, aber ignorierte Longevity-Einstellung bleibt diagnostisch sichtbar. | Resolvermatrix 15/55 ueber `none`, `quantile_shift`, `relative_horizon_buffer` und `buffer_years`; normaler MC-Hot-Path mit aktivem Buffer beziehungsweise relativem Puffer. |
| E10-3 | `maxBearRefillPct` ist aus der interaktiven Optionsliste und allen Presets entfernt. Die Engine- oder Bear-Refill-Semantik wurde nicht geaendert. Der Registryeintrag bleibt nur fuer den explizit geforderten Nullwert-/Apply-Roundtrip bestehen. | Kein Picker-/Presetvorkommen; die acht verbleibenden angebotenen Parameter besitzen diskriminierende MC-Witnesses. Der unzutreffende direkte Helper-Witness wurde entfernt. |
| E10-4 | Auto-Optimize verwendet fuer nicht explizit uebergebene MC-Annahmen nun `readMonteCarloParameters()` statt eines duplizierten Readers mit stillen Defaults. | Ergebnisvertrag weist `source=main_monte_carlo_controls` sowie Methode, Block, Filter und Seedvertrag aus. |
| E10-5 / G10-1 | Jede Registrydefinition besitzt `min`, `max` und `step`; neue Bloecke und Parameterwechsel verwenden diese Werte. Ungueltige Ranges werden mit stabilem Fehlercode vor Sampling abgewiesen; eine leere gueltige Kandidatenmenge besitzt ebenfalls einen konkreten Fehlercode. | Renderer-Domain-Test und Range-Preflight-Test. |
| E10-6 | Das Dynamic-Flex-Preset optimiert Runway-Ziel plus Go-Go und setzt keine Survival-Methode mehr voraus. | Preset ist bei `mean` und `survival_quantile` anwendbar; statischer Presetvertrag prueft das Fehlen von `survivalQuantile`. |
| E10-7 | Evaluate erzeugt beide Fingerprints aus dem nach der Registry-Mutation aus `inputs` zurueckgelesenen Kandidaten. | Fidelity-Suite vergleicht Kandidaten- und Requestfingerprints fuer jeden angebotenen Parameter. |
| E10-8 | Apply liest ueber den Registry-Formreader zurueck und prueft zusaetzlich `goldAllokationAktiv` sowie `goGoActive`. | Ein synchron zurueckgesetztes `goGoActive` wird mit `AUTO_OPTIMIZE_APPLY_SIDE_EFFECT_MISMATCH` abgewiesen. |
| E10-9 | Kein Persistenz-/Profilvertrag wurde in diesem Slice neu definiert. Die Apply-Erfolgsmeldung weist sichtbar darauf hin, dass eine spaetere Profilauswahl profilgebundene Felder erneut setzen kann. | Bleibt benanntes Restrisiko fuer einen eigenen Profil-Ownership-Contract; keine Behauptung einer technischen Schliessung. |
| E10-10 | Aussagen zu neun Kausalitaets-Witnesses, Bear-Refill-Wirkung, bedingtem Direct-Horizon und veralteten Dateilaengen wurden korrigiert. | Diese Slice-MD, Hauptplan und `tests/README.md` sind synchronisiert. |
| G10-2 | Nicht-Dynamic-Flex-Parameter bleiben bei `force_off` auch mit aktuarischer Horizon-Methode aus den Rahmendaten evaluierbar. Dynamic-Flex-Parameter werden bei effektiv inaktivem Modus bereits vor der Baseline fail-closed abgewiesen. | Bestehender Force-Off-Baseline-Test plus Config-/Modus-Preflight sind gruen. |

### Scope nach Nachbesserung

Die Nachbesserung bleibt bei den bereits dokumentierten exakt acht
Programmdateien. Keine Engine-, Golden-, Snapshot-, `dist`- oder
Release-Datei wurde veraendert. E10-9 wurde deshalb nicht durch eine
undokumentierte neunte Produktdatei oder eine neue Persistenzsemantik
scheinbar geschlossen.

### Validierung nach Nachbesserung

- `auto-optimize-fidelity.test.mjs`: 106/106
- `auto-optimizer.test.mjs`: 82/82
- `auto-optimize-worker-contract.test.mjs`: 11/11
- `longevity-optimizer-docs.test.mjs`: 27/27
- zusaetzliche Horizon-/VPW-Regressionslaeufe:
  `longevity-engine-runner.test.mjs` 23/23,
  `vpw-dynamic-flex.test.mjs` 56/56 und
  `monte-carlo-outcome-horizon.test.mjs` 33/33
- `npm test`: 135 Dateien, 8.080/8.080 Assertions, 0 fehlgeschlagene
  Dateien, 0 offene Handles
- `npm run test:browser`: 16/16
- `npm run test:coverage`: 8.080/8.080; alle Gates gruen; 78,25 Prozent
  (35.774/45.715)
- `git diff --check`: gruen

## Re-Review durch Claude nach der Blocker-Nachbesserung

**Datum:** 2026-07-27  
**Rolle:** unabhaengiger, adversarialer Re-Review der Nachbesserung zu
E10-1 bis E10-10  
**Pruefgegenstand:** nachgebesserter Arbeitsbaumstand auf
`codex/suite-datenintegritaet-hardening`

### Unabhaengig nachgefahrene Gates

| Gate | Ergebnis |
| --- | --- |
| `npm test` | 8.080/8.080 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles |
| `git diff --check` | gruen |
| Scope | weiterhin exakt acht Programmdateien; keine Engine-, Golden-, Snapshot-, `dist`- oder Release-Aenderung |

Die von Codex berichteten Zahlen sind reproduzierbar.

### Blocker E10-1 - geschlossen

Registry-, Formular- und Enginedomain sind jetzt deckungsgleich. Der
entscheidende Punkt ist, dass die Referenz die **Engine** ist: die
Engine-Validierung begrenzt `rebalBand` auf 1 bis 20
(`InputValidator.mjs`), `survivalQuantile` auf 0,5 bis 0,99 und
`goGoMultiplier` auf 1,0 bis `MAX_GO_GO_MULTIPLIER` = 1,5. Das frueher im
Formular erlaubte `rebalBand` bis 50 war damit bereits vor diesem Slice ein
latenter Formular-/Enginewiderspruch; die Verengung auf 20 beseitigt ihn,
statt eine Funktion wegzunehmen.

| Parameter | HTML | Registry | Enginegrenze |
| --- | --- | --- | --- |
| `runwayMinM` | 12 bis 60 | 12 bis 60 | - |
| `runwayTargetM` | 18 bis 72 | 18 bis 72 | - |
| `targetEq` | 20 bis 90 | 20 bis 90 | 20 bis 90 |
| `rebalBand` | 1 bis 20 | 1 bis 20 | 1 bis 20 |
| `maxSkimPct` | 0 bis 50 | 0 bis 50 | 0 bis 50 |
| `survivalQuantile` | 0,50 bis 0,99 | 0,50 bis 0,99 | 0,50 bis 0,99 |
| `goGoMultiplier` | 1,00 bis 1,50 | 1,00 bis 1,50 | 1,00 bis 1,50 |

Der Abbruchzeitpunkt ist verifiziert. Gemessen mit einem gezaehlten
Evaluationsstub:

```text
rebalBand=30 aus den Rahmendaten     ABBRUCH nach 0 Evaluationen  AUTO_OPTIMIZE_PARAMETER_DOMAIN_INVALID
runwayMin 50 > runwayTarget 20       ABBRUCH nach 0 Evaluationen  AUTO_OPTIMIZE_RUNWAY_ORDER_INVALID
rebalBand=5 (gueltig)                OK nach 133 Evaluationen
```

Der frueher gemessene Verlust eines vollstaendigen Laufs nach 168
Evaluationen tritt nicht mehr auf.

### Blocker E10-2 - geschlossen

Der Direktmodus liefert in allen Longevity-Modi exakt den angeforderten
Horizont; das Transition-Smoothing wird uebergangen.

| Longevity-Modus | angefordert 15 | angefordert 55 | `longevityIgnoredForDirect` |
| --- | --- | --- | --- |
| `none` | 15 | 55 | false |
| `quantile_shift` +0,05 | 15 | 55 | true |
| `buffer_years` +5 | 15 | 55 | true |
| `buffer_years` +10 | 15 | 55 | true |
| `relative_horizon_buffer` +20 % | 15 | 55 | true |

Zusaetzlich geprueft: vorheriger Horizont 40, direkt angefordert 15, aktives
Transition-Smoothing - effektiv 15. Die frueher gemessene Abweichung von
291.152,23 EUR Median-Endvermoegen zwischen bezeugtem und verwendetem
Request entfaellt. Die ignorierte Longevity-Konfiguration bleibt ueber
`longevityConfiguredMode` diagnostisch sichtbar; das ist die richtige
Loesung, weil sie den Konflikt nicht verschweigt.

### Blocker E10-3 - geschlossen

`maxBearRefillPct` ist aus `AUTO_OPTIMIZE_PARAMETER_OPTIONS` und aus allen
sechs Presets entfernt; die Registrydefinition bleibt nur fuer den
Apply-/Nullwert-Roundtrip bestehen. Die Stop-Regel des Hauptplans ist damit
befolgt, ohne die Engine-Semantik anzufassen. Alle acht verbliebenen
angebotenen Dimensionen bewegen im neutralen Szenario (200 Runs, 30 Jahre,
Seeds 1703/1704, keine kuenstlichen Overrides) mindestens eine Metrik:

| Dimension | Bereich | groesste Wirkung auf `medianEndWealth` |
| --- | --- | --- |
| `goldTargetPct` | 0 bis 50 | 769.586,58 EUR |
| `survivalQuantile` | 0,50 bis 0,99 | 443.083,40 EUR |
| `runwayTargetM` | 24 bis 72 | 213.426,26 EUR |
| `goGoMultiplier` | 1,00 bis 1,50 | 122.366,40 EUR |
| `maxSkimPct` | 0 bis 50 | 20.533,08 EUR |
| `targetEq` | 20 bis 90 | 10.457,11 EUR |
| `runwayMinM` | 12 bis 36 | 2.746,09 EUR |
| `rebalBand` | 1 bis 20 | **0,00 EUR** (siehe F10-1) |

### Restrisiken E10-4 bis E10-8 und E10-10 - nachgebessert

- **E10-4:** `buildAutoOptimizeEvaluationContract()` verwendet
  `readMonteCarloParameters()`. Bei fehlendem `mcMethode` bricht der
  Optimizer jetzt genauso laut ab wie der normale MC
  (`UI-Element fehlt: Monte-Carlo Methode (id=mcMethode)`); die falsche
  Provenienzangabe entfaellt.
- **E10-5 / G10-1:** Der Suchbereich wird vor dem Sampling geprueft.
  Gemessen: `targetEq` 0 bis 100 stoppt mit
  `AUTO_OPTIMIZE_PARAMETER_RANGE_DOMAIN_INVALID` und der Meldung
  "Suchbereich muss innerhalb [20, 90] liegen"; eine leere Parametermenge mit
  `AUTO_OPTIMIZE_PARAMETER_RANGE_REQUIRED`; ein durch die
  Runway-Reihenfolge leerer Kandidatenraum mit
  `AUTO_OPTIMIZE_CANDIDATE_SET_EMPTY` - alle nach 0 Evaluationen. Neue
  Parameterbloecke werden mit der Registrydomain statt mit 0 bis 100
  vorbelegt.
- **E10-6:** Das Dynamic-Flex-Preset optimiert `runwayTargetM` und
  `goGoMultiplier` und laeuft gemessen in beiden Horizon-Modi
  (`survival_quantile` und `mean`) durch.
- **E10-7:** `evaluateCandidate()` erzeugt beide Fingerprints aus
  `readAutoOptimizeCandidateFromInputs(...)`, also aus dem tatsaechlich
  mutierten `inputs`-Objekt. Gegenprobe: wird der kanonische Request-Key
  nach dem Apply zurueckgesetzt, aendert sich der Requestfingerprint von
  `{"goldZielProzent":25}` auf `{"goldZielProzent":0}` und der Vergleich in
  `runAutoOptimize()` schlaegt an. Die Pruefung ist damit gegen die
  OPT-01-Fehlerklasse wirksam.
- **E10-8:** `verifyForm` deckt beide Nebenfelder ab. Gegenprobe mit
  Steuerelementen, die den Schreibvorgang verwerfen: sowohl
  `goldAllokationAktiv` als auch `goGoActive` fuehren zu
  `AUTO_OPTIMIZE_APPLY_SIDE_EFFECT_MISMATCH`. Gold 0 setzt das Aktivflag
  korrekt auf `false`.
- **E10-10:** `tests/README.md` nennt jetzt ~580 statt ~330 Zeilen
  (tatsaechlich 576); die Aussagen zu Bear-Refill-Witness und bedingtem
  Direct-Horizon sind korrigiert.
- **E10-9** bleibt bewusst offen und ist in der Apply-Erfolgsmeldung sichtbar
  benannt. Das ist die ehrliche Loesung: es wird keine technische
  Schliessung behauptet, und es wurde keine neunte Programmdatei
  eingefuehrt, um sie vorzutaeuschen.

### Neue Befunde aus dem Re-Review

#### F10-1 (Restrisiko): `rebalBand` trennt die Standardzielmetrik nicht

Der Blocker E10-3 ist fuer die Dimension mit **null** Wirkung geschlossen.
`rebalBand` liegt jedoch dicht daneben. Ueber sieben Stufen der vollen
Domain, 200 Runs, 30 Jahre, Seeds 1703/1704:

| `rebalBand` | `medianEndWealth` | `successProbFloor` | `depletionRate` | `timeShareWRgt45` |
| --- | --- | --- | --- | --- |
| 1 | 2.474.076,44 | 0,97 | 0,0325 | 0,2087 |
| 2 | 2.474.076,44 | 0,97 | 0,0325 | 0,2087 |
| 5 | 2.474.076,44 | 0,97 | 0,0325 | 0,2087 |
| 8 | 2.474.076,44 | 0,97 | 0,0325 | 0,2087 |
| 10 | 2.474.076,44 | 0,97 | 0,0325 | 0,2087 |
| 15 | 2.474.076,44 | 0,97 | 0,0350 | 0,2087 |
| 20 | 2.474.076,44 | 0,97 | 0,0350 | 0,2087 |

Ueber die gesamte Domain existiert genau **ein** distinkter
`medianEndWealth`-Wert. Fuer das Standardziel `EndWealth_P50` ist die
Dimension damit nicht unterscheidbar; der Champion-Wert entsteht aus
Tie-Breaking und LHS-Reihenfolge. Drei der sechs mitgelieferten Presets
pinnen `rebalBand` auf 2 bis 10 beziehungsweise 3 bis 8 - Bereiche, in denen
auch `depletionRate` konstant ist. Der Kausalitaets-Witness der
Fidelity-Suite verwendet fuer diesen Parameter `inputOverrides` mit
300.000 EUR Tagesgeld und Ziel-Liquiditaet sowie Seed 1; das
Akzeptanzkriterium ist damit erfuellt, die praktische Trennschaerfe im
Auslieferungszustand aber nicht belegt.

#### F10-2 (Restrisiko): Longevity-Einstellungen werden im Direktmodus nicht mehr validiert

Die E10-2-Korrektur uebergibt `settings: { longevityMode: 'none' }` an
`applyLongevityHorizonAdjustment()`. Damit sieht
`validateLongevitySettings()` die tatsaechliche Konfiguration nicht mehr.
Gemessen mit `longevityBufferYears = -99`:

```text
horizonMethod=direct             -> valid=true,  horizon=15, errors=[]
horizonMethod=survival_quantile  -> valid=false, errors=[longevityBufferYears muss zwischen 0 und 10 liegen]
```

Der Direktmodus ignoriert die Longevity-Einstellung fachlich zu Recht,
schaltet damit aber auch deren Pruefung ab. Eine ungueltige Konfiguration
bleibt unbemerkt, bis der Nutzer die Horizon-Methode wechselt.

#### F10-3 (Restrisiko): Die Engine benennt den Direktmodus um

`engine/core.mjs` normalisiert in `_normalizeEngineInput()` jedes
`horizonMethod` ausserhalb von `mean`/`survival_quantile` auf
`survival_quantile` und gibt genau diesen Wert in
`result.ui.vpw.horizonMethod` zurueck. Ein Lauf im neuen Modus `direct` wird
deshalb von der Engine und von allen nachgelagerten Anzeigen -
`balance-binder-diagnosis.js` und `balance-diagnosis-keyparams.js`
beschriften `vpw.horizonMethod` - als "Survival-Quantil" ausgewiesen. Der
Horizontwert ist korrekt, weil der Resolver ihn bereits aufgeloest hat; die
Methodenbezeichnung in der VPW-Diagnose ist es nicht. Die Slice-MD haelt
unter "Offene Risiken" fest, dass die Engine den aufgeloesten Wert erhaelt,
nicht aber, dass sie die Methode umbenennt.

#### F10-4 (Hinweis): Kopplung an ein MC-Feld, das der Optimizer ueberschreibt

`readMonteCarloParameters()` verlangt `mcAnzahl` und `mcDauer`, obwohl der
Optimizer beide sofort durch `runsPerCandidate` und `maxDauer` ersetzt.
Gemessen:

```text
mcAnzahl = 0    -> ABBRUCH MC_PARAMETER_BELOW_MINIMUM
                   "Anzahl der Simulationen muss mindestens 1 betragen."
mcAnzahl leer   -> Lauf startet
mcDauer leer    -> Lauf startet
```

Ein auf 0 gesetztes Feld im Monte-Carlo-Tab blockiert damit Auto-Optimize mit
einer Meldung, die auf eine Groesse zeigt, die der Optimizer gar nicht
verwendet. Der Nutzer wird sie im Feld "Runs per Candidate" suchen.

#### F10-5 (Hinweis): Der Suchraum wurde ohne Entscheidungseintrag geweitet

Die frueheren optimizerspezifischen Grenzen `survivalQuantile` 0,75 bis 0,95
und `goGoMultiplier` 1,0 bis 1,35 stammen aus `auto-optimize-params.js` und
sind dort als "enger Suchraum fuer robuste Loesungen" kommentiert. Die
Registry ersetzt sie durch die Enginedomain 0,50 bis 0,99 beziehungsweise
1,00 bis 1,50. Das ist mit E10-1 konsistent, weitet aber den durchsuchten
Raum erheblich; `createAutoOptimizeParameterBlock()` belegt einen neu
angelegten Block zudem mit der vollen Domain vor. Es gibt keinen
Entscheidungseintrag, der den Wegfall der Robustheitsverengung festhaelt.

#### F10-6 (Hinweis): Letzter Rest der duplizierten MC-Leselogik

`useCapeSampling` wird weiterhin ueber ein lokales `readControlChecked()`
gelesen, nicht ueber `readUseCapeSampling()` aus `monte-carlo-ui.js`. Der
Wert ist heute identisch; die Funktion ist allerdings nur Methode eines
internen Objekts und nicht als Modulexport verfuegbar, die Duplizierung ist
also strukturell und nicht nachlaessig.

#### F10-7 (Hinweis): Kopfstatus wurde vor diesem Re-Review gesetzt

Kopfzeile und Freigabestatus dieser Slice-MD tragen bereits
"Re-Review (Claude & Gemini) abgeschlossen", obwohl der Claude-Re-Review erst
mit diesem Abschnitt vorliegt. Die Statusfuehrung liegt bei Nutzer und
Gemini; ich habe sie nicht veraendert und weise nur auf die Reihenfolge hin.

### Pre-Mortem

Angenommen, diese Implementierung verursacht in drei Monaten einen Fehler im
Produktivbetrieb - die wahrscheinlichste Ursache:

Ein Nutzer laesst das Rebalancing-Band mitoptimieren, weil drei der sechs
Presets es anbieten. Der Champion meldet einen konkreten Wert, etwa 7 statt
5, und der Nutzer uebernimmt ihn als "optimiert". Tatsaechlich ist die
Zielmetrik ueber die gesamte Domain konstant und der Wert stammt aus der
Reihenfolge der Latin-Hypercube-Ziehung. Der Fehler wird nicht als Defekt
auffallen, sondern als unerklaerliche Instabilitaet: derselbe Lauf mit einem
anderen Seed liefert einen anderen "optimalen" Bandwert bei identischem
Zielwert, und die Suche nach der Ursache beginnt beim Sampling statt bei der
fehlenden Trennschaerfe der Dimension.

### Findings-Lifecycle

- Geschlossen: **E10-1**, **E10-2**, **E10-3** (Blocker) sowie E10-4, E10-5,
  E10-6, E10-7, E10-8 und E10-10.
- Bewusst offen und sichtbar benannt: E10-9.
- Neu eingefuehrte Blocker: keine.
- Neu eingefuehrte Restrisiken: F10-1, F10-2, F10-3.
- Neu eingefuehrte Hinweise: F10-4, F10-5, F10-6, F10-7.
- Uebergreifend weiterhin offen: die Gold-Fachentscheidung T03-2/Y04-3 aus
  den frueheren Slices.

### Ergaenzte Entscheidungstabelle

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| F10-1 | Claude 2026-07-27 | `rebalBand` trennt `EndWealth_P50` ueber die gesamte Domain nicht | offen | ausstehend |
| F10-2 | Claude 2026-07-27 | Longevity-Validierung im Direktmodus abgeschaltet | offen | ausstehend |
| F10-3 | Claude 2026-07-27 | Engine benennt `horizonMethod=direct` in der VPW-Diagnose in `survival_quantile` um | offen | ausstehend |
| F10-4 | Claude 2026-07-27 | Abbruch wegen `mcAnzahl`, das der Optimizer ueberschreibt | offen | ausstehend |
| F10-5 | Claude 2026-07-27 | Weitung des Suchraums ohne Entscheidungseintrag | offen | ausstehend |
| F10-6 | Claude 2026-07-27 | `useCapeSampling` weiterhin ueber duplizierten Reader | offen | ausstehend |
| F10-7 | Claude 2026-07-27 | Kopfstatus vor dem Claude-Re-Review gesetzt | offen | Statusfuehrung bei Nutzer/Gemini |

## Re-Review-Ergebnis (Claude)

- Status: **freigegeben**
- Blocker: keine. E10-1, E10-2 und E10-3 sind durch Messung als geschlossen
  bestaetigt; die Nachbesserung hat keinen neuen Blocker eingefuehrt.
- Restrisiken: F10-1 (`rebalBand` trennt die Standardzielmetrik nicht; ein
  distinkter `medianEndWealth`-Wert ueber die gesamte Domain), F10-2
  (Longevity-Validierung im Direktmodus abgeschaltet), F10-3 (Engine benennt
  `direct` in der VPW-Diagnose in `survival_quantile` um), F10-4 (Abbruch
  wegen `mcAnzahl`, das der Optimizer ueberschreibt), F10-5 (Suchraumweitung
  ohne Entscheidungseintrag), F10-6 (letzter Rest der duplizierten
  MC-Leselogik), F10-7 (Kopfstatus vor dem Re-Review gesetzt) sowie das
  unveraendert offene E10-9.
- Pre-Mortem: Ein mitoptimiertes Rebalancing-Band liefert einen
  Champion-Wert, den die Zielmetrik gar nicht stuetzt; die daraus folgende
  Seed-Abhaengigkeit des "Optimums" wird als Sampling-Problem statt als
  fehlende Trennschaerfe der Dimension untersucht.
