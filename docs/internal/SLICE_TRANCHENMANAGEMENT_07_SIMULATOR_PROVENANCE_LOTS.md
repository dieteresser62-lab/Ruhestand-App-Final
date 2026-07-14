# Slice Tranchenmanagement 07: Simulator-Provenienz und Lot-Invarianten

**Feature-Branch:** `codex/tranchenmanagement-hardening`
**GitHub-Status:** lokal; Veröffentlichung ausstehend
**Status:** geplant – Planreview ausstehend
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
git branch --show-current: AUSSTEHEND
git status --short: AUSSTEHEND
```

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

- auf den freigegebenen Slice-06-Commit zurück; Provenienz- und Lotmutationsänderungen gemeinsam zurückrollen.

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

Noch nicht umgesetzt.

## Durchgeführte Änderungen

Noch nicht umgesetzt.

## Ausgeführte Tests

Noch nicht umgesetzt.

## Abweichungen vom Plan

Keine; Umsetzung ausstehend.

## Offene Risiken

- Fehlende historische Stückzahlen erlauben keine verlustfreie Rekonstruktion.
- Deterministische Simulations-IDs dürfen nicht mit realen IDs kollidieren.
- Deduplizierung darf einen legitimen separaten Geldmarktbestand nicht entfernen.

## Rückdokumentation

- Provenienzschlüssel, Deduplizierungs- und Lotmutationsregeln in Hauptplan/GAP-Analyse eintragen.
- Simulator- und Engine-Referenzen in Slice 09 synchronisieren.

## Freigabestatus

Nicht freigegeben. Simulator-, Provenienz- und Paritätsreview ausstehend.

## Review-Feedback von Gemini

Ausstehend: adversarial Profilkollisionen, Doppelzählung, deterministische Wiederholung, FlowDelta und Pre-Mortem.

## Review-Feedback von Claude

Ausstehend: Datenfluss bis Engine-Breakdown, Lotarithmetik, Workerparität und Persistenzgrenzen.

## Review-Antworten von Codex

Ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| - | - | Noch kein Review | offen | - |
