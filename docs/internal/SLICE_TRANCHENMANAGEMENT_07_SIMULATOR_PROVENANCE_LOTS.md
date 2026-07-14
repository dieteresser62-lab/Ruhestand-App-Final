# Slice Tranchenmanagement 07: Simulator-Provenienz und Lot-Invarianten

**Feature-Branch:** `codex/tranchenmanagement-hardening`
**GitHub-Status:** lokal; Veröffentlichung ausstehend
**Status:** freigegeben
**Abhängigkeiten:** Slices 02 und 06 abgeschlossen und freigegeben
**GAPs:** TM-03, TM-07, TM-08, TM-14, TM-17

## Ziel

Der Simulator übernimmt Tranchen mit erhaltener Profilherkunft und simuliert Käufe und Verkäufe als konsistente In-Memory-Lotbewegungen. Geldmarktwerte werden genau einmal berücksichtigt; Simulationsmutationen gelangen niemals in reale Profilbestände.

## Verbindliche Nutzerentscheidungen und technische Planfestlegungen

- O-01: Strikte Klassifikationsmatrix aus Slice 02/06.
- O-07: `sourceProfileId` beim Merge ergänzen und danach bis zum Ergebnis erhalten.
- O-08: Ein logisches Depot je Profil; FIFO nur je Instrument innerhalb dieses Profils.
- Simulierte Käufe erzeugen ein neues Lot mit deterministischer Simulations-ID und Simulationsdatum statt eines Merges in das erste Bestandslot.
- Teilverkäufe reduzieren Stückzahl und Cost Basis anteilig; fehlt eine für diese Invariante notwendige Stückzahl, greift die Stop-Regel statt einer stillen Annahme.

## Akzeptanzkriterien

- `sourceProfileId` bleibt vom Profileingang über Haushaltsaggregation und Portfolio-Initialisierung bis zum Engine-/Ergebnis-Breakdown erhalten.
- Vor der ersten Simulationsmutation werden alle übernommenen Lots mit `structuredClone` oder nachweislich äquivalent tief kopiert; keine verschachtelte Referenz wird mit Profil-, UI- oder Persistenzzustand geteilt.
- Gleiche `trancheId` in zwei Profilen bleibt über einen zusammengesetzten Schlüssel eindeutig; Suffix- oder Stringparsing ersetzt keine explizite Provenienz.
- Detailtranchen und aggregierter `geldmarktEtf` werden nicht gleichzeitig für denselben Bestand addiert.
- Ein explizit leerer oder korrupter Trancheneingang wird nicht durch stillen Fallback beziehungsweise eine Teilmenge ersetzt.
- Teilverkäufe reduzieren Marktwert, Einstandskosten und – falls vorhanden – Stückzahl proportional und nicht unter null.
- Vollverkäufe entfernen beziehungsweise markieren das Lot nach einem dokumentierten In-Memory-Vertrag; dieselbe Tranche wird nicht mehrfach verkauft.
- Simulierte Käufe erzeugen getrennte Lots mit stabiler deterministischer Simulations-ID, Datum, Profilherkunft und kanonischer Klassifikation.
- Wiederholte Simulation mit identischen Inputs erzeugt identische IDs und Ergebnisse.
- Kein Simulatorpfad schreibt mutierte Lots in `depot_tranchen`, IndexedDB, LocalStorage oder Tauri-Persistenz zurück.
- Referenzisolations-Tests beweisen, dass der originale Profil-/Inputbestand nach Direkt-, Worker- und wiederholten Simulationsläufen strukturell unverändert bleibt.
- Bestehende Verträge für Pflege-/Gesundheitsbucket, Anleihen, Steuern, Multi-Profil-Aggregation und direkte/Worker-Ausführung bleiben grün.
- Öffentliche UI- und Engine-Parameter tragen identische Namen; eine Abweichung stoppt den Slice.

## Scope

- Provenienztransport in Input, Portfolio und direktem Engine-Pfad.
- Geldmarkt-Deduplizierung.
- Konsistente In-Memory-Lotmutation bei simulierten Käufen/Verkäufen.
- Deterministische Simulations-IDs und Regressionstests.

## Nicht-Scope

- Keine Rückschreibung realer Bestände.
- Keine neue Engine-Verkaufsstrategie.
- Keine Persistenzmigration.
- Keine Änderung historischer Snapshot-/Backtest-Erwartungen ohne Stop und Review.

## Geplante Programmdateien

Maximal zehn:

- `app/simulator/simulator-profile-inputs.js`
- `app/simulator/simulator-input-tranches.js`
- `app/simulator/simulator-portfolio-init.js`
- `app/simulator/simulator-engine-direct-utils.js`
- `app/simulator/simulator-portfolio-tranches.js`
- `tests/simulator-input-readers.test.mjs`
- `tests/simulator-multiprofile-aggregation.test.mjs`
- `tests/simulator-portfolio-tranches.test.mjs` (neu)
- `tests/simulation.test.mjs`
- `tests/depot-tranches.test.mjs`

## Git- und Diff-Risiko vor Coding

```text
git branch --show-current: codex/tranchenmanagement-hardening
git status --short:
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
```

Die unversionierten Playwright-Paketdateien lagen vor Slice-Beginn bereits vor,
gehoeren nicht zum Slice-Scope und werden nicht veraendert.

Geplante Dateien:

- die zehn oben genannten Programmdateien sowie Slice-/Plan-MD.

Voraussichtliche Änderungstiefe:

- riskant; Multi-Profil-Provenienz, wiederholte Simulation und Lotbuchhaltung.

Gefährdete bestehende Tests:

- Simulator-Input, Portfolio und Multi-Profil-Aggregation,
- Direkt-/Worker-Parität,
- Depot-Tranchen, Steuern, Snapshots und Backtests,
- FlowDelta und deterministische Seeds.

Nicht anfassen:

- reale Profilpersistenz und Reconcile,
- Engine-Semantik oder `engine/` ohne Stop und Neuplanung,
- Seed-/RNG-Vertrag,
- `engine.js`, `dist/`, Release-Artefakte.

Rollback-Strategie:

- `git checkout -- app/simulator/simulator-profile-inputs.js app/simulator/simulator-input-tranches.js app/simulator/simulator-portfolio-init.js app/simulator/simulator-engine-direct-utils.js app/simulator/simulator-portfolio-tranches.js tests/simulator-input-readers.test.mjs tests/simulator-multiprofile-aggregation.test.mjs tests/simulation.test.mjs tests/depot-tranches.test.mjs docs/internal/SLICE_TRANCHENMANAGEMENT_07_SIMULATOR_PROVENANCE_LOTS.md docs/internal/TRANCHENMANAGEMENT_HARDENING_PLAN.md`
- die neue Datei `tests/simulator-portfolio-tranches.test.mjs` nur nach ausdruecklicher Freigabe loeschen.

## Geplante Tests

```powershell
node tests/run-single.mjs tests/simulator-input-readers.test.mjs
node tests/run-single.mjs tests/simulator-multiprofile-aggregation.test.mjs
node tests/run-single.mjs tests/simulator-portfolio-tranches.test.mjs
node tests/run-single.mjs tests/simulation.test.mjs
node tests/run-single.mjs tests/depot-tranches.test.mjs
npm test
```

Pflichtfälle: identische Lot-ID in Profil A/B, Geldmarkt-Detail plus Aggregat, Teil-/Vollverkauf mit Stückzahl, mehrere simulierte Käufe, Wiederholung mit gleichem Seed/Input, verschachtelte Referenzisolation nach Deep-Copy, persistenter Originalbestand unverändert sowie Direkt-/Worker-Parität. Unerwartete Backtest-, Snapshot- oder FlowDelta-Abweichungen stoppen den Slice.

## Ergebnisse

- Profilherkunft bleibt als explizites `sourceProfileId` vom Haushaltsmerge ueber
  das tief kopierte Portfolio und den direkten Engine-Input bis zum
  Verkaufs-Breakdown erhalten. Profilpraefixierte IDs werden nur exakt aufgeloest;
  die fruehere Suffixsuche ist entfernt.
- Explizite leere Tranchenlisten bleiben leer. Korrupte Overrides oder Storage-
  Payloads brechen mit `SIMULATOR_TRANCHE_INPUT_INVALID` ab und koennen nicht auf
  Aggregatwerte oder eine Teilmenge zurueckfallen.
- Detail-Geldmarkt ist die einzige Quelle, sobald Detailtranchen vorliegen. Der
  ueberlappende `geldmarktEtf`-Aggregatwert wird weder dem Startvermoegen noch der
  Liquiditaet ein zweites Mal zugeschlagen.
- Die Portfolio-Initialisierung zieht vor jeder Mutation eine tiefe Kopiergrenze.
  Verschachtelte Eingabeobjekte bleiben nach Haushaltsmerge, Verkauf und
  wiederholter Initialisierung strukturell unveraendert.
- Teilverkaeufe reduzieren Marktwert, Cost Basis und vorhandene Stueckzahl mit
  demselben Verhaeltnis und nie unter null. Vollverkaeufe markieren das Lot als
  `sold`; verkaufte Lots werden nicht erneut an die Engine uebergeben.
- Simulierte Kaeufe erzeugen getrennte kanonische Lots mit stabiler `simlot:`-ID,
  Simulationsdatum, Profilherkunft und eigener Cost Basis. Legacy-Aggregatlagen
  erhalten vor dem ersten Engine-Aufruf eine stabile `simbase:`-ID, damit der
  anschliessende exakte Verkauf dasselbe In-Memory-Lot trifft.
- Der gesamte Pfad bleibt rein in-memory. Es wurde kein schreibender Persistenz-
  oder Reconcile-Aufruf in den Simulator aufgenommen.

## Durchgeführte Änderungen

- `simulator-profile-inputs.js`: Zustandsbehaftetes Lesen von absent/empty/valid/
  corrupt, kanonische Klassifikation, Deep-Copy-Merge, explizite Provenienz und
  Geldmarkt-Deduplizierung.
- `simulator-input-tranches.js`: Deep-Copy der Profilverbund-Overrides, Erhalt von
  explizitem `[]` und strukturierter Fail-Closed-Fehler bei korrupten Eingaben.
- `simulator-portfolio-init.js`: tiefe Simulationskopie, strikte Kategorie-/Typ-
  Matrix, kein Aggregatfallback bei Detailinput sowie stabile Basis-Lot-IDs.
- `simulator-engine-direct-utils.js` und `simulator-engine-direct.js`: Erhalt von
  `sourceProfileId`, Ausschluss verkaufter Lots, stabile IDs fuer Legacy-
  Simulationslots und deterministisches Simulationsdatum je Jahr.
- `simulator-portfolio-tranches.js`: exakte zusammengesetzte Lotauflösung,
  proportionale Lotarithmetik, Sold-Markierung und getrennte deterministische
  Kauf-Lots.
- Regressionstests wurden in `simulator-input-readers.test.mjs`,
  `simulator-multiprofile-aggregation.test.mjs`, `portfolio.test.mjs` und der neuen
  Datei `simulator-portfolio-tranches.test.mjs` umgesetzt.

## Ausgeführte Tests

```text
node tests/run-single.mjs tests/simulator-input-readers.test.mjs
  48/48 Assertions, 0 Fehler
node tests/run-single.mjs tests/simulator-multiprofile-aggregation.test.mjs
  40/40 Assertions, 0 Fehler
node tests/run-single.mjs tests/simulator-portfolio-tranches.test.mjs
  27/27 Assertions, 0 Fehler
node tests/run-single.mjs tests/simulation.test.mjs
  1/1 Runner-Assertion, 0 Fehler; interne Szenarioassertions gruen
node tests/run-single.mjs tests/depot-tranches.test.mjs
  22/22 Assertions, 0 Fehler
node tests/run-single.mjs tests/portfolio.test.mjs
  63/63 Assertions, 0 Fehler
node tests/run-single.mjs tests/worker-parity.test.mjs
  354/354 Assertions, 0 Fehler
npm test
  106 Testdateien, 4298/4298 Assertions, 0 Fehler, 0 offene Handles
```

Das separate Browser-Gate wurde nicht ausgefuehrt, weil weder HTML/CSS noch ein
Browser-Entrypoint geaendert wurde. Engine-Quellen und die oeffentliche EngineAPI
blieben unveraendert; deshalb war kein `npm run build:engine` erforderlich.

## Abweichungen vom Plan

- Statt der unveraendert gruenen Dateien `tests/simulation.test.mjs` und
  `tests/depot-tranches.test.mjs` wurde `tests/portfolio.test.mjs` an den neuen
  Kauf-Lot-Vertrag angepasst; beide geplanten Gates wurden dennoch ausgefuehrt.
- `app/simulator/simulator-engine-direct.js` wurde aufgenommen, um das reale
  Simulationsjahr vor Kaeufen deterministisch am Portfolio zu setzen. Der
  Programmdiff blieb durch den Testtausch bei genau zehn Dateien.
- Der erste Vollsuite-Lauf zeigte eine Worker-Paritaetsabweichung: Legacy-
  Aggregatlagen erhielten ihre ID nur in der Enginekopie, wodurch der exakte
  In-Memory-Verkauf das Lot nicht fand. Stabile `simbase:`-IDs vor dem Engine-
  Aufruf schlossen die Luecke; fokussierter und abschliessender Vollsuite-Lauf
  waren danach gruen.

## Offene Risiken

- Legacy-Aggregatlagen ohne Stueckzahlen koennen weiterhin nur Wert und Cost Basis
  proportional fuehren; vorhandene, aber ungueltige Stueckzahlen brechen dagegen
  vor der Mutation ab.
- `simlot:` und `simbase:` sind reservierte Simulationspraefixe, aber noch nicht als
  persistierter Namensraum im kanonischen Contract formal reserviert.
- Bei Detailinput gilt der gesamte `geldmarktEtf`-Aggregatwert als ueberlappend.
  Ein fachlich separater, bewusst ungetranchter Geldmarktbestand benoetigt spaeter
  ein eigenes explizites Feld statt erneuter Addition desselben Aggregats.

## Rückdokumentation

- Provenienzschluessel, Deduplizierungs- und Lotmutationsregeln sind in Hauptplan
  und GAP-Analyse eingetragen.
- Simulator- und Engine-Referenzen bleiben fuer den Abschluss-Sync in Slice 09
  vorgemerkt.

## Freigabestatus

Freigegeben (Gemini-Review abgeschlossen, Claude-Review ausstehend).

## Review-Feedback von Gemini

### 1. Prüfdimensionen

* **Korrektheit vs. Akzeptanzkriterien:** Alle Akzeptanzkriterien wurden vollständig und fehlerfrei erfüllt. In-Memory-Verkäufe werden über zusammengesetzte IDs und die exakte `sourceProfileId` eindeutig dem passenden Herkunftsprofil zugeordnet. Die Lot-Arithmetik reduziert Werte proportional, verhindert negative Werte, und neu erzeugte Kauf-Lots werden als getrennte Lots simuliert und erhalten das korrekte Simulationsjahr.
* **Vertragstreue:** Simulator-Initialisierung nutzt den Contract aus `tranche-contract.js` und setzt korrekte Klassifizierungsregeln um.
* **Fehlerbehandlung:** Bei uneindeutigen ID-Matches (z. B. fehlende `sourceProfileId` bei profilübergreifend doppelten Lot-IDs) wirft die Engine kontrolliert `SIMULATION_LOT_PROVENANCE_AMBIGUOUS` (fail-closed), statt falsche Lots zu entwerten.
* **Seiteneffekte:** Die Simulationsläufe arbeiten komplett In-Memory auf tiefen Kopien des Portfolios (strukturierte Kopie) und mutieren weder das persistierte Profil noch die Eingabedaten.
* **Was könnte brechen:** Bei unvollständigen Altdaten-Importen (z. B. Tranchen mit null-Stückzahlen) arbeitet die proportionale Wertminderung weiterhin stabil über Wert und Cost-Basis, bricht aber hart ab, wenn das Lot fehlerhafte Stückzahlen aufweist (fail-closed).

### 2. Findings

* **G7-01 (Additiver Geldmarktüberhang):** Geldmarkt-Aggregatwerte werden bei Detailtranchen als redundant klassifiziert und ignoriert, um Doppelzählungen zu verhindern. Dies setzt jedoch voraus, dass der Anwender nicht beabsichtigt, ungetranchten Geldmarkt zusätzlich zu getranchtem Geldmarkt zu führen.
  * *Entscheidung:* Akzeptiert.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
> Ein Anwender exportiert ein Simulationsportfolio aus einer laufenden Simulation und versucht, dies wieder einzulesen. Da die temporären Präfixe (`simlot:` und `simbase:`) nicht im kanonischen Datencontract persistiert sind, könnte der Import eines solchen In-Memory-Zustands zu Validierungsfehlern im Tranchenmanager führen.

### 4. Review-Ergebnis

* **Status:** freigegeben
* **Blocker:** keine
* **Restrisiken:**
  * Redundanzannahme beim Geldmarktbestand (Aggregatwert wird bei Detailtranchen ignoriert).
  * Fehlende Formalisierung der Präfixe `simlot:` und `simbase:` im kanonischen Persistenzvertrag.

## Review-Feedback von Claude

Ausstehend: Datenfluss bis Engine-Breakdown, Lotarithmetik, Workerparität und Persistenzgrenzen.

## Review-Antworten von Codex

- **G-02 umgesetzt:** Profilverbund-Overrides und Portfolio-Initialisierung ziehen
  eine tiefe Kopiergrenze; verschachtelte Referenzisolations-Tests bleiben nach
  Verkauf und wiederholter Initialisierung gruen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| - | - | Noch kein Review | offen | - |
