# Slice Tranchenmanagement 06: Balance-, Status- und Steuerparität

**Feature-Branch:** `codex/tranchenmanagement-hardening`
**GitHub-Status:** lokal; Veröffentlichung ausstehend
**Status:** geplant – Planreview ausstehend
**Abhängigkeiten:** Slices 02 und 03 abgeschlossen und freigegeben
**GAPs:** TM-03, TM-06, TM-08, TM-12, TM-17, TM-20

## Ziel

Balance, Profilverbund und Tranchenstatus verwenden denselben kanonischen Bestand und dieselben Einheiten. Leere Overrides, Kirchensteuersatz, Teilfreistellung, Statusanzeigen und Assetklassifikation dürfen zwischen UI, Orchestrierung und Kernlogik nicht auseinanderlaufen.

## Verbindliche Nutzerentscheidungen und Planfestlegung

- O-01: Strikte Kategorie-/Typ-Matrix für Aktien-, Anleihe-, Geldmarkt- und Goldtranchen.
- O-02: TQF ist ein manuell bestätigter Wert; keine stille Ableitung.
- O-08: Ein logisches Depot je Profil; FIFO nur je Instrument innerhalb des Profils.
- Planfestlegung aus Slice 03: Ein leerer Haushalts-Override bleibt explizit leer und besitzt keinen Fallback.

## Akzeptanzkriterien

- Alle betroffenen Leser nutzen die Klassifikation aus Slice 02; Geldmarkt oder Gold können nicht über eine zweite Kategorie zusätzlich als Aktienbestand gezählt werden.
- Ein explizites `[]` im Haushalts-/Profilverbundpfad bleibt leer und fällt nicht auf den aktuellen Profilbestand zurück.
- Die Statusanzeige unterscheidet `nicht geladen`, `leer`, `gültig` und `fehlerhaft`; bei leerem Bestand wird kein aktiver FIFO-Status behauptet.
- Negative Abweichungen und Renditen werden mit korrektem Vorzeichen ohne doppeltes Plus/Minus dargestellt.
- Der in der Balance-UI als `0,08`/`0,09` übergebene Kirchensteuersatz wird genau einmal als Dezimalrate interpretiert; Tests verwenden dieselbe Einheit wie die UI.
- Teilfreistellung wird bei der steuerorientierten Auswahl nicht ignoriert und stimmt mit dem vorhandenen Steuervertrag überein.
- Die Produktionsaggregation im Balance-Reader wird direkt getestet; lokale Testkopien derselben Logik gelten nicht als Nachweis.
- Status-Synchronisation erzeugt keine zusätzliche Geldmarktposition neben einer Detailtranche.
- Bestehende Golden Cases für Cash-first, Bundles, steueroptimierte Auswahl und Transaction Tax bleiben grün.
- Es erfolgt keine unreviewte Änderung der Engine-Semantik. Falls eine Engineänderung nötig wird, greift die Stop-Regel und der Slice wird neu geplant.

## Scope

- Kanonische Klassifikation in Balance-/Statuspfaden.
- Leer-/Fehlerstatus und korrekte Vorzeichen.
- Einheitengleichheit beim Kirchensteuersatz.
- Teilfreistellung in der bestehenden Auswahlberechnung.
- Produktionsnahe Tests der Aggregation und Statussynchronisation.

## Nicht-Scope

- Keine neue Verkaufsstrategie oder Steuerformel.
- Keine Änderung an `minimumFlexAnnual`.
- Keine Simulator-Lotmutation; Slice 07.
- Kein Realbestands-Reconcile; Slice 08.

## Geplante Programmdateien

Maximal neun:

- `app/tranches/depot-tranchen-status.js`
- `app/profile/profilverbund-balance.js`
- `app/balance/balance-reader.js`
- `app/profile/profilverbund-action-attribution.js`
- `tests/depot-tranchen-status.test.mjs` (neu)
- `tests/profilverbund-balance.test.mjs`
- `tests/balance-reader.test.mjs`
- `tests/profile-ui-contract.test.mjs`
- `tests/transaction-tax.test.mjs`

## Git- und Diff-Risiko vor Coding

```text
git branch --show-current: AUSSTEHEND
git status --short: AUSSTEHEND
```

Geplante Dateien:

- die neun oben genannten Programmdateien sowie Slice-/Plan-MD.

Voraussichtliche Änderungstiefe:

- riskant; steuerliche Einheiten, Haushaltsaggregation und Handlungsempfehlungen.

Gefährdete bestehende Tests:

- Profilverbund-Balance und Action Attribution,
- Balance-Reader/-Workflow,
- Transaction-Tax- und Golden-Case-Tests,
- Snapshot-/Backtest- und FlowDelta-Ergebnisse.

Nicht anfassen:

- `engine/` und öffentliche `EngineAPI` ohne Stop und Neuplanung,
- `minimumFlexAnnual`, Rundungs- oder Cash-first-Semantik,
- historische Snapshots und Backtest-Baselines,
- `engine.js`, `dist/`, Release-Artefakte.

Rollback-Strategie:

- auf den letzten freigegebenen Slice-Commit zurück; Einheiten- und Klassifikationsänderungen nicht partiell zurücknehmen.

## Geplante Tests

```powershell
node tests/run-single.mjs tests/depot-tranchen-status.test.mjs
node tests/run-single.mjs tests/profilverbund-balance.test.mjs
node tests/run-single.mjs tests/balance-reader.test.mjs
node tests/run-single.mjs tests/profile-ui-contract.test.mjs
node tests/run-single.mjs tests/transaction-tax.test.mjs
npm test
```

Pflichtfälle: leerer Override, corrupt statt Fallback, Geldmarkt mit überlappender Altklassifikation, Kirchensteuer `0.08`/`0.09`, TQF 0/30 %, negative Statuswerte und direkter Produktionsreader. Unerwartete Snapshot-, Backtest- oder FlowDelta-Abweichungen stoppen den Slice.

## Ergebnisse

Noch nicht umgesetzt.

## Durchgeführte Änderungen

Noch nicht umgesetzt.

## Ausgeführte Tests

Noch nicht umgesetzt.

## Abweichungen vom Plan

Keine; Umsetzung ausstehend.

## Offene Risiken

- Altdaten können widersprüchliche Kategorie-/Typ-Paare enthalten und benötigen die Migrationsentscheidung aus Slice 02.
- Bereits vorhandene Golden Cases können dieselbe falsche Einheit wie die Implementierung verwenden.
- Status- und Aktionspfade könnten unterschiedliche Zeitpunkte desselben Profilzustands lesen.

## Rückdokumentation

- Bestätigte Einheiten, Klassifikations- und Leersemantik in Hauptplan/GAP-Analyse eintragen.
- Betroffene Architektur-, Balance- und Steuerreferenzen in Slice 09 synchronisieren.

## Freigabestatus

Nicht freigegeben. Steuer-, Aggregations- und Regression-Review ausstehend.

## Review-Feedback von Gemini

Ausstehend: adversarial Steuerfälle, Doppelzählung, leere Overrides, Snapshot-/FlowDelta-Risiko und Pre-Mortem.

## Review-Feedback von Claude

Ausstehend: Einheitenfluss, Reader-/Statusvertrag, TQF-Berechnung und Modulgrenzen.

## Review-Antworten von Codex

Ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| - | - | Noch kein Review | offen | - |
