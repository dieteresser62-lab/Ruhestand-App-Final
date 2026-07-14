# Slice Tranchenmanagement 02: Kanonischer Datencontract

**Feature-Branch:** `codex/tranchenmanagement-hardening`
**GitHub-Status:** lokal; Veröffentlichung ausstehend
**Status:** geplant – Planreview ausstehend
**Abhängigkeit:** Slice 01 abgeschlossen und freigegeben
**GAPs:** TM-01, TM-02, TM-03, TM-13

## Ziel

Ein gemeinsamer, DOM-freier Tranche-Contract definiert Shape, Wertebereiche, Legacy-Normalisierung, Lot-Identität und disjunkte Assetklassifikation. Die belegte doppelte Engine-Sell-Order wird für ungültige Mischklassifikationen fail-closed verhindert, ohne gültige bestehende Engine-Semantik zu verändern.

## Verbindliche Nutzerentscheidungen und Startcheck

- O-01: Beide Klassifikationsfelder bleiben erhalten; nur die festgelegte Kategorie-/Typ-Matrix ist zulässig.
- O-02: TQF wird manuell bestätigt und gespeichert; fehlende Werte werden nicht still abgeleitet.
- O-08: Genau ein logisches Depot je Profil; FIFO nur je Instrument innerhalb dieses Profils.
- O-10: `detailledTranches` bleibt unverändert der einzige kanonische Feldname.
- Technischer Startcheck: Ablage und Importierbarkeit des gemeinsamen Contracts unter `types/` mit `build-engine.mjs` verifizieren.

## Akzeptanzkriterien

- Der Contract unterscheidet persistierte, abgeleitete und Merge-Provenienzfelder.
- Eine explizite Schema-Version und deterministische Migrationspfade für unterstützte Altstände sind definiert; unbekannte Versionen werden nicht still interpretiert.
- Erlaubte Kategorie-/Typ-Paare sind disjunkt; widersprüchliche Paare liefern strukturierte Feldfehler.
- `shares`, `purchasePrice`, `currentPrice`, `marketValue`, `costBasis` und `tqf` werden auf Endlichkeit und vereinbarte Grenzen geprüft.
- `trancheId` ist nicht leer und innerhalb eines Profilbestands eindeutig.
- Datums-, ISIN- und Symbolnormalisierung ist deterministisch und mutationsfrei.
- Legacy-Felder (`id`, `kind`, fehlende abgeleitete Werte) werden nur nach dokumentierter Regel migriert; unrettbare Daten werden nicht still korrigiert.
- Leere TQF wird nicht über `NaN -> null -> 0` semantisch verändert.
- `detailledTranches` wird weder umbenannt noch durch einen zweiten Alias-Contract ergänzt.
- Die Enginegrenze validiert zusätzlich und enthält jede Lot-ID höchstens einmal in der Sell-Order.
- Validierungsfehler enthalten stabilen Fehlercode, Tranche-/Feldkontext und eine kontrolliert behandelbare Fehlerart; kein stilles Fallback.
- Der synthetische Mismatch-Fall mit 100 EUR Bestand kann keinen Breakdown über 100 EUR erzeugen.
- Für gültige bestehende Golden Cases entstehen keine unerwarteten Ergebnisänderungen.

## Scope

- Reiner Contract und JSDoc-Typen.
- Manager-State und Form-Reader an den Contract anbinden.
- Engine-Sell-Order gegen Mehrfachklassifikation/Duplikate härten.
- Negative, Legacy-, Duplikat- und Mismatch-Tests.

## Nicht-Scope

- Keine Neudefinition von FIFO, TQF, LossCarry, Settlement oder Steuerrecht.
- Keine Persistenz-Recovery; folgt in Slice 03.
- Keine UI-Fehlerdarstellung; folgt in Slice 04.
- Keine Umbenennung von `detailledTranches`.

## Geplante Programmdateien

Maximal zehn inklusive des verpflichtend neu erzeugten Engine-Bundles:

- neu: `types/tranche-contract.js`
- `types/profile-types.js`
- `app/tranches/tranchen-manager-state.js`
- `app/tranches/tranchen-manager-modal.js`
- `engine/transactions/sale-engine.mjs`
- neu: `tests/tranche-contract.test.mjs`
- `tests/tranchen-manager-state.test.mjs`
- `tests/tranchen-manager-modal.test.mjs`
- `tests/transaction-tax.test.mjs`
- `engine.js` (ausschließlich generiert durch `npm run build:engine`, niemals manuell editiert)

Wenn eine elfte Programmdatei nötig wird, greift die Stop-Regel und der Slice wird neu geschnitten.

## Git- und Diff-Risiko vor Coding

```text
git branch --show-current: AUSSTEHEND
git status --short: AUSSTEHEND
```

Geplante Dateien:

- die zehn oben genannten Programmdateien einschließlich des generierten Bundles sowie diese Slice-MD und Hauptplan.

Voraussichtliche Änderungstiefe:

- riskant; öffentliche Daten- und Enginegrenze.

Gefährdete bestehende Tests:

- `transaction-tax`, `depot-tranches`, `core-*`, `simulation`, `portfolio`, Profilverbund- und Simulator-Merge-Tests,
- Engine-Build und Backtest-/Snapshot-Ergebnisse.

Nicht anfassen:

- Settlement-, LossCarry-, VPW- und 3-Bucket-Semantik,
- `engine.js` manuell,
- `dist/`, `RuheStandSuite.exe`, reale Exporte.

Rollback-Strategie:

- nur auf den freigegebenen Slice-01-Commit zurück; keine Einzeldatei-Rücknahme, wenn Contract und Engine gemeinsam geändert wurden.

## Geplante Tests

```powershell
node tests/run-single.mjs tests/tranche-contract.test.mjs
node tests/run-single.mjs tests/tranchen-manager-state.test.mjs
node tests/run-single.mjs tests/tranchen-manager-modal.test.mjs
node tests/run-single.mjs tests/transaction-tax.test.mjs
node tests/run-single.mjs tests/depot-tranches.test.mjs
npm run build:engine
npm test
```

Zusätzlich werden relevante Snapshot-/Backtest-Gates aus `tests/README.md` ausgeführt. Jede unerwartete Abweichung stoppt die Umsetzung.

## Ergebnisse

Noch nicht umgesetzt.

## Durchgeführte Änderungen

Noch nicht umgesetzt.

## Ausgeführte Tests

Noch nicht umgesetzt.

## Abweichungen vom Plan

Keine; Umsetzung ausstehend.

## Offene Risiken

- Legacy-Daten können Kombinationen enthalten, die nach dem neuen Contract ungültig sind.
- Gemeinsamer Import aus `types/` muss mit dem Engine-Bundler kompatibel sein.
- Die Grenze zwischen Validierung und fachlich erlaubter Nullposition muss im Review eindeutig sein.

## Rückdokumentation

- Contract-Matrix, Legacy-Regeln und tatsächliche Programmdateien in Hauptplan und GAP-Analyse zurücktragen.
- Bei öffentlicher Contractänderung `TECHNICAL.md`, Modulreferenzen und `engine/README.md` im Abschluss-Slice aktualisieren.

## Freigabestatus

Nicht freigegeben. Engine- und Contractreview ausstehend.

## Review-Feedback von Gemini

Ausstehend: insbesondere adversariale Mismatch-, Duplikat-, NaN- und Legacy-Fälle sowie Pre-Mortem.

## Review-Feedback von Claude

Ausstehend: insbesondere öffentliche API, Bundlergrenze und Seiteneffekte.

## Review-Antworten von Codex

Ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| - | - | Noch kein Review | offen | - |
